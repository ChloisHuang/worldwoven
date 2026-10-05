"""Fair the final cheek sheet, not an offset multiplied by a regional mask.

Uses a screened thin-plate solve in the intrinsic surface metric over exterior
triangles. The field includes nasal transition skin; nasal lobule/dorsum,
actual eyelid contact, mouth and external boundary remain fixed. Its screen
retains the broad malar support from 1230c7d without retaining local ridges.
"""
import argparse, base64, json, pathlib, subprocess, hashlib
import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import spsolve

ROOT=pathlib.Path(__file__).resolve().parents[2]
ASSET='source/game/complete-adult/assets/adult-forms-data.js'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-revision',default='c354b91b6221f53337e744db34316240d79373b1')
parser.add_argument('--support-revision',default='aa3a2ede9c3ba827ba1a54015e6bff2f145fe412')
args=parser.parse_args()

def source(ref):
    code=subprocess.check_output(['git','show',ref+':'+ASSET],cwd=ROOT).decode()
    start=code.index('const packed=')+13;stop=code.index(';\nfunction decode',start)
    return code,start,stop,json.loads(code[start:stop])

def decode(part,key):
    value=part[key]
    return np.frombuffer(base64.b64decode(value['data']),dtype='<u2' if value['type']=='u16' else '<f4').copy()

code,start,stop,packed=source(args.base_revision)
part=packed['female']['parts'][0]
target=source(args.support_revision)[3]['female']['parts'][0]
p=decode(part,'position').reshape(-1,3);before=p.copy();raw=decode(part,'featureCoord').reshape(-1,3)
goal=decode(target,'position').reshape(-1,3)
n=decode(part,'normal').reshape(-1,3);tri=decode(part,'index').reshape(-1,3)
ax,sy,sz=np.abs(raw[:,0]),raw[:,1],raw[:,2]

# A generous surrounding exterior sheet supplies fixed value/tangent support.
candidate=np.flatnonzero((ax>.085)&(ax<.77)&(sy>6.57)&(sy<7.38)&(sz>1.52-.85*ax)&(n[:,2]>.2))
a,b,c=[p[tri[:,k]].astype(float) for k in range(3)];v0,v1=b-a,c-a
denom=v0[:,0]*v1[:,1]-v0[:,1]*v1[:,0];valid=np.abs(denom)>1e-12
visible=[]
for i in candidate:
    q=p[i]-a
    u=np.divide(q[:,0]*v1[:,1]-q[:,1]*v1[:,0],denom,out=np.zeros(len(tri)),where=valid)
    v=np.divide(v0[:,0]*q[:,1]-v0[:,1]*q[:,0],denom,out=np.zeros(len(tri)),where=valid)
    hit=valid&(u>=-1e-5)&(v>=-1e-5)&(u+v<=1.00001)
    front=np.max((a[:,2]+u*v0[:,2]+v*v1[:,2])[hit],initial=-1)
    if p[i,2]>=front-2e-5:visible.append(i)
visible=np.array(visible)
lookup=np.full(len(p),-1);lookup[visible]=np.arange(len(visible))
faces=tri[np.all(lookup[tri]>=0,axis=1)];local=lookup[faces]
coords=p[visible].astype(float)*1000
edge_a=coords[local[:,1]]-coords[local[:,0]];edge_b=coords[local[:,2]]-coords[local[:,0]]
area=np.linalg.norm(np.cross(edge_a,edge_b),axis=1)/2
keep=area>1e-5;local,area=local[keep],area[keep]
rows=[];cols=[];values=[];mass=np.zeros(len(visible))
for k in range(3):
    i,j,h=local[:,k],local[:,(k+1)%3],local[:,(k+2)%3]
    u,v=coords[j]-coords[i],coords[h]-coords[i]
    cot=np.sum(u*v,axis=1)/(2*area)
    for row,col,sign in [(j,j,1),(h,h,1),(j,h,-1),(h,j,-1)]:
        rows.extend(row);cols.extend(col);values.extend(sign*cot/2)
    np.add.at(mass,i,area/3)
lap=coo_matrix((values,(rows,cols)),shape=(len(visible),len(visible))).tocsr()
mass=np.maximum(mass,1e-5)
# Physical ten-millimetre screening length, not a vertex-count smoothing pass.
screen=1/(10.0**4)
# Open-sheet boundary rows do not measure curvature: their cotangent
# Laplacian includes a boundary flux even on a perfect plane. Omit those rows
# and keep the broad surrounding vertices fixed as the value/tangent collar.
from collections import Counter
edges=Counter(tuple(sorted((int(f[k]),int(f[(k+1)%3])))) for f in local for k in range(3))
boundary={v for edge,count in edges.items() if count==1 for v in edge}
curvature_weight=1/mass
curvature_weight[list(boundary)]=0
energy=lap.T@diags(curvature_weight)@lap+diags(mass*screen)

free_mask=(ax>.151)&(ax<.705)&(sy>6.765)&(sy<7.224)&(sz>1.07)
# The actual nasal convex cartilage and bony ridge are held. Its adjacent
# lateral skin is free to join the cheek instead of becoming a rigid wall.
nasal=(ax<.151)|((sy<7.07)&(sz>1.485)&(ax<.185))
mouth=(decode(part,'lipWeight')>.01)|((ax<.31)&(sy<6.77))
lower_lid=7.241+.040*((ax-.31)/.145)**2+.006*((ax-.31)/.145)
rim=(ax>.16)&(ax<.47)&(sy>lower_lid-.019)
free_mask &= ~(nasal|mouth|rim)
free=np.flatnonzero(free_mask[visible]);held=np.flatnonzero(~free_mask[visible])
depth=p[visible,2].astype(float)*1000;target_depth=goal[visible,2].astype(float)*1000
rhs=mass*screen*target_depth
depth[free]=spsolve(energy[free][:,free],rhs[free]-energy[free][:,held]@depth[held])
p[visible[free],2]=depth[free]/1000

def area_normals(points):
    points=points.astype(float)
    cross=np.cross(points[tri[:,1]]-points[tri[:,0]],points[tri[:,2]]-points[tri[:,0]])
    output=np.zeros_like(points)
    for k in range(3):np.add.at(output,tri[:,k],cross)
    return output/np.maximum(np.linalg.norm(output,axis=1)[:,None],1e-15)

old,new=area_normals(before),area_normals(p)
axis=np.cross(old,new);cosine=np.clip(np.sum(old*new,axis=1),-1,1)
changed=np.linalg.norm(old-new,axis=1)>1e-10
normals=n.astype(float)
normals+=np.cross(axis,normals)+np.cross(axis,np.cross(axis,normals))/np.maximum(1+cosine[:,None],1e-10)
normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-15)
n[changed]=normals[changed]
recess=decode(part,'recessWeight');delta=p[:,2]-before[:,2]
clear=(abs(delta)>.0001)&(recess>0);recess[clear]=0
for key,value in [('position',p),('normal',n),('recessWeight',recess)]:
    part[key]['data']=base64.b64encode(value.astype('<f4').tobytes()).decode()
packed['female']['reviewedAssetSha256']=hashlib.sha256(json.dumps(packed['female']['parts'],separators=(',',':')).encode()).hexdigest()
assert np.array_equal(p[:,:2],before[:,:2])
assert np.isfinite(p).all() and np.max(abs(delta))<.011
(ROOT/ASSET).write_text(code[:start]+json.dumps(packed,separators=(',',':'))+code[stop:])
report={'base':args.base_revision,'screenTarget':args.support_revision,'exteriorSheetVertices':len(visible),'freeVertices':len(free),'movedVertices':int(np.count_nonzero(delta)),'depthRangeMm':[float(np.min(delta)*1000),float(np.max(delta)*1000)],'changedNormals':int(np.count_nonzero(changed)),'clearedStaleRecess':int(np.count_nonzero(clear)),'nasalDorsumLobuleRimAndLipsFixed':True,'topologyUnchanged':True}
(ROOT/'qa/midface-support/curvature-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
