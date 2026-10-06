"""One whole-midface XYZ displacement sculpt, imported into Blender unchanged.

blender -b --factory-startup --python development/midface-whole-xyz/sculpt.py
The input is the byte-verified runtime mesh saved on origin/dev-midface-support.
The biharmonic energy regularizes displacement, not the final facial curvature.
Anatomical section controls supply the volume; actual feature rims are hard pins.
"""
import argparse, base64, hashlib, json, pathlib, subprocess, sys
import bpy, bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from scipy.sparse import coo_matrix, diags
from scipy.sparse.csgraph import dijkstra, connected_components
from scipy.sparse.linalg import spsolve

ROOT=pathlib.Path(__file__).resolve().parents[2]
ASSET='source/game/complete-adult/assets/adult-forms-data.js'
BASE='2d5503d7d416b51e171c7be9ea410ff35bd02542'
EXPECTED='f2d413fd7123049331dfd1814f47af5ed642ec5d10975513ccdd0829050de35a'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-revision',default=BASE)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
code=subprocess.check_output(['git','show',args.base_revision+':'+ASSET],cwd=ROOT).decode()
assert hashlib.sha256(code.encode()).hexdigest()==EXPECTED,'Input must be the reviewed e35 runtime mesh'
start=code.index('const packed=')+13;stop=code.index(';\nfunction decode',start)
packed=json.loads(code[start:stop]);part=packed['female']['parts'][0]
def decode(key):
    value=part[key]
    return np.frombuffer(base64.b64decode(value['data']),dtype='<u2' if value['type']=='u16' else '<f4').copy()
p=decode('position').reshape(-1,3);before=p.copy();raw=decode('featureCoord').reshape(-1,3)
n=decode('normal').reshape(-1,3);tri=decode('index').reshape(-1,3)
N=len(p);ax,sy,sz=np.abs(raw[:,0]),raw[:,1],raw[:,2]

# No remeshing, subdivision, decimation, topology generation or index reordering.
mesh=bpy.data.meshes.new('Pinned runtime female skin e35');mesh.from_pydata(p.tolist(),[],tri.tolist());mesh.update()
obj=bpy.data.objects.new('Whole midface XYZ working surface',mesh);bpy.context.collection.objects.link(obj)
bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table();bm.edges.ensure_lookup_table()
tree=BVHTree.FromBMesh(bm)
# Frontmost skin is selected by actual surface visibility. Inner nasal, eye and
# oral returns cannot enter the exterior graph even if feature coordinates match.
visible=np.zeros(N,dtype=bool)
for i,v in enumerate(bm.verts):
    if not (6.60<sy[i]<7.58 and sz[i]>.48):continue
    hit=tree.ray_cast(Vector((p[i,0],p[i,1],.35)),Vector((0,0,-1)),.7)[0]
    visible[i]=hit is not None and abs(hit.z-p[i,2])<.00003

lower=np.interp(ax,[.14,.17,.21,.24,.27,.31,.35,.38,.41,.44,.47],[7.28,7.268,7.254,7.248,7.244,7.240,7.241,7.248,7.260,7.280,7.29])
lids=(ax>.14)&(ax<.47)&(sy>lower-.012)
# Protect the nasal skeleton/cartilage and true alar edge. The adjacent sidewall
# above the alar root and the entire paranasal skin are deliberately released.
nose=((ax<.10)&(sy>7.04))|((ax<.172)&(sy>6.79)&(sy<=7.04))|((ax<.13)&(sy>6.72)&(sy<=6.79))
lips=(decode('lipWeight')>.01)|((ax<.30)&(sy<6.79))
chin=sy<6.68
skull=(sy>7.45)|(sz<.56)
ear=(ax>.71)&(sz<.89)
collar=p[:,1]<1.36
protected=lids|nose|lips|chin|skull|ear|collar
allowed=visible&~protected
# The domain grows across the connected exterior from anatomical cheek seeds.
# It is not the product of a rectangular XY mask and a fitted depth patch.
row=[];col=[];length=[]
for e in bm.edges:
    i,j=[v.index for v in e.verts]
    if allowed[i] and allowed[j]:
        d=float((e.verts[0].co-e.verts[1].co).length)*1000
        row.extend([i,j]);col.extend([j,i]);length.extend([d,d])
graph=coo_matrix((length,(row,col)),shape=(N,N)).tocsr()
seeds=[]
for side in [-1,1]:
    for target in [[.025,1.539,.067],[.044,1.543,.060],[.057,1.541,.048]]:
        target=np.array(target);target[0]*=side
        ids=np.flatnonzero(allowed&(np.sign(p[:,0])==side))
        seeds.append(int(ids[np.argmin(np.linalg.norm(p[ids]-target,axis=1))]))
distance=dijkstra(graph,directed=False,indices=seeds,min_only=True)
domain=allowed&(distance<43)
# All exterior points within the geodesic domain may move. Hard anatomical
# pins and the untouched sheet outside the domain already impose zero boundary
# displacement. Locking additional graph rings here would truncate the lower
# return by 10–20 mm in the sparse cheek topology.
free=domain.copy()

# Transverse anatomical stations, metres in the existing world-space head.
# Each tuple is [absolute X, displacement outward X/up Y, absolute depth in mm].
# This describes one wide convex cheek pad with continuous nasal/infraorbital
# support and a rolling outer and lower return, not isolated apple-cheek balls.
sections=[
 ('infraorbital',1.551,[(.019,.1,.5,65.5),(.029,.3,.8,65.5),(.039,.6,1.0,65.3),(.048,.6,.8,62.5),(.057,.3,.4,52.8)]),
 ('malar_crown',1.543,[(.016,.1,.4,69.8),(.025,.4,1.0,70.5),(.035,.8,1.5,71.0),(.045,1.2,1.6,69.0),(.055,1.0,1.2,60.0),(.064,.5,.5,39.0)]),
 ('maxillary_plane',1.533,[(.020,.2,.5,69.3),(.029,.6,1.2,69.8),(.040,1.1,1.5,68.2),(.050,1.3,1.2,61.2),(.060,1.0,.8,46.5),(.067,.4,.3,22.0)]),
 ('alar_root_return',1.522,[(.021,.1,.1,69.0),(.031,.3,.5,68.4),(.041,.6,.7,65.0),(.051,.7,.7,56.0),(.060,.5,.5,38.0)]),
 ('lower_cheek_return',1.511,[(.033,.1,.1,65.4),(.043,.2,.2,60.7),(.053,.2,.2,44.0),(.060,.1,.1,23.0)]),
 ('lateral_roll',1.554,[(.062,.2,.3,38.5),(.068,.1,.1,22.0)]),
]
# Last column is absolute front depth in millimetres. Sample each authored
# transverse curve at the actual selected point instead of copying the nearest
# station's height and creating a sawtooth in a nonuniform mesh.
from scipy.interpolate import PchipInterpolator
curves={label:PchipInterpolator(np.array(stations)[:,0],np.array(stations)[:,3],extrapolate=True) for label,y,stations in sections}
controls={};control_names={};station_rows=[]
# Controls attach to actual existing points. The small search patch averages
# adjacent targets when two stations hit the same point; no vertex is duplicated.
for label,y,stations in sections:
    for x,dx,dy,dz in stations:
        for side in [-1,1]:
            ids=np.flatnonzero(free&(np.sign(p[:,0])==side))
            xy=p[ids,:2]-[x*side,y]
            best=int(ids[np.argmin(np.sum(xy*xy,axis=1))])
            error=float(np.linalg.norm(p[best,:2]-[x*side,y]))
            if error>.0065:continue
            dz=float(curves[label](abs(p[best,0])))-float(p[best,2])*1000
            controls.setdefault(best,[]).append([dx*side,dy,dz]);control_names.setdefault(best,[]).append(label)
            station_rows.append({'name':label,'vertex':best,'targetMm':[dx*side,dy,dz],'nearestXyErrorMm':error*1000})
# The outer roll is near vertical: projected X/Y has no well-conditioned depth
# interpolation there. Prescribe its return along existing side-surface depth
# instead, with one continuous arc through the upper/lower section stations.
for i in np.flatnonzero(free & (np.abs(p[:,0])>.060) & (p[:,2]<.040)):
    y=float(p[i,1]);z=float(p[i,2]);side=np.sign(p[i,0])
    vertical=float(PchipInterpolator([1.497,1.511,1.533,1.543,1.555,1.576],[0,.25,1,1,.55,0],extrapolate=False)(np.clip(y,1.497,1.576)))
    roll=float(PchipInterpolator([-.005,.010,.022,.040],[0,.3,1.7,4.5],extrapolate=False)(np.clip(z,-.005,.040)))
    controls[i]=[[.25*side*vertical,.2*vertical,roll*vertical]]
    control_names[i]=['side_surface_return']
assert len(controls)>35,len(controls)

# Cotangent biharmonic displacement on the complete original mesh. Holding all
# points outside the domain removes boundary flux ambiguity; only d, never p,
# is faired. Positional station pins prevent smoothing away the authored volume.
coords=before.astype(float)*1000
a,b,c=[coords[tri[:,k]] for k in range(3)];area=np.linalg.norm(np.cross(b-a,c-a),axis=1)/2
rows=[];cols=[];values=[];mass=np.zeros(N)
for k in range(3):
    i,j,h=tri[:,k],tri[:,(k+1)%3],tri[:,(k+2)%3]
    u,v=coords[j]-coords[i],coords[h]-coords[i]
    cot=np.sum(u*v,axis=1)/np.maximum(2*area,1e-12)
    for r,c_,sign in [(j,j,1),(h,h,1),(j,h,-1),(h,j,-1)]:
        rows.extend(r);cols.extend(c_);values.extend(sign*cot/2)
    np.add.at(mass,i,area/3)
L=coo_matrix((values,(rows,cols)),shape=(N,N)).tocsr()
energy=L.T@diags(1/np.maximum(mass,1e-5))@L
station_ids=np.array(sorted(controls));unknown=np.flatnonzero(free&~np.isin(np.arange(N),station_ids))
displacement=np.zeros((N,3))
for i in station_ids:displacement[i]=np.mean(controls[i],axis=0)
displacement[unknown]=spsolve(energy[unknown][:,unknown],-energy[unknown][:,station_ids]@displacement[station_ids])
p=before.copy()
p[free]=(before[free].astype(float)+displacement[free]/1000).astype('<f4')
assert np.array_equal(p[~free],before[~free])
assert np.max(np.linalg.norm(p-before,axis=1))<.013

# Inspect/export the same Blender mesh. There is no geometry modifier or bpy
# exporter that could silently retessellate/reindex it.
for i,v in enumerate(mesh.vertices):v.co=p[i]
mesh.update()
def area_normals(points):
    cross=np.cross(points[tri[:,1]].astype(float)-points[tri[:,0]],points[tri[:,2]].astype(float)-points[tri[:,0]])
    out=np.zeros((N,3))
    for k in range(3):np.add.at(out,tri[:,k],cross)
    return out/np.maximum(np.linalg.norm(out,axis=1)[:,None],1e-15)
old,new=area_normals(before),area_normals(p)
axis=np.cross(old,new);cosine=np.clip(np.sum(old*new,axis=1),-1,1)
changed=np.linalg.norm(old-new,axis=1)>1e-10
normals=n.astype(float)
normals+=np.cross(axis,normals)+np.cross(axis,np.cross(axis,normals))/np.maximum(1+cosine[:,None],1e-10)
normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-15)
n[changed]=normals[changed]
# Only stale cavity samples on moved outward cheek skin are removed. True
# nasal, eyelid and lip shading remains, and the runtime palette is untouched.
recess=decode('recessWeight');clear=(displacement[:,2]>.25)&(recess>0)&free
recess[clear]=0
for key,value in [('position',p),('normal',n),('recessWeight',recess)]:
    part[key]['data']=base64.b64encode(value.astype('<f4').tobytes()).decode()
packed['female']['reviewedAssetSha256']=hashlib.sha256(json.dumps(packed['female']['parts'],separators=(',',':')).encode()).hexdigest()

old_cross=np.cross(before[tri[:,1]].astype(float)-before[tri[:,0]],before[tri[:,2]].astype(float)-before[tri[:,0]])
new_cross=np.cross(p[tri[:,1]].astype(float)-p[tri[:,0]],p[tri[:,2]].astype(float)-p[tri[:,0]])
flips=np.sum(old_cross*new_cross,axis=1)<=0
assert not flips.any(),'Surface folded relative to base'
assert p[~free].tobytes()==before[~free].tobytes(),'Hard-held positions changed'
(ROOT/ASSET).write_text(code[:start]+json.dumps(packed,separators=(',',':'))+code[stop:])
# Closed local swept volume includes lateral displacement, instead of equating
# projection height with an anatomical volume assertion.
volume=lambda v:float(np.einsum('ij,ij->i',v[tri[:,0]],np.cross(v[tri[:,1]],v[tri[:,2]])).sum()/6)
report={'baseRevision':args.base_revision,'inputSha256':EXPECTED,'inputRuntimeCommit':'e35b09ebcd4f4220fcc14cb3c02c8caee6952e1c','vertices':N,'triangles':len(tri),'exteriorVertices':int(visible.sum()),'connectedDomainVertices':int(domain.sum()),'freeVertices':int(free.sum()),'movedVertices':int(np.any(p!=before,axis=1).sum()),'xyzRangeMm':[[float(v.min()),float(v.max())] for v in ((p-before)*1000).T],'stationCount':len(controls),'stations':[{'vertex':int(i),'names':control_names[i],'displacementMm':np.mean(controls[i],axis=0).tolist()} for i in station_ids],'protectedVertexIds':np.flatnonzero(protected).tolist(),'domainVertexIds':np.flatnonzero(domain).tolist(),'changedNormals':int(changed.sum()),'clearedStaleRecess':int(clear.sum()),'flippedTriangles':int(flips.sum()),'addedVolumeCm3':(volume(p.astype(float))-volume(before.astype(float)))*1e6,'topologyUnchanged':True,'materialsUnchanged':True}
out=ROOT/'qa/midface-whole-xyz';out.mkdir(parents=True,exist_ok=True)
(out/'sculpt-report.json').write_text(json.dumps(report,indent=2)+'\n')
np.savez(out/'geometry.npz',before=before,after=p,raw=raw,index=tri,displacement=displacement,domain=domain,free=free)
# Reviewable native working file stays ignored QA, not a second source backup.
bpy.ops.wm.save_as_mainfile(filepath=str(out/'whole-midface-review.blend'))
print(json.dumps({k:v for k,v in report.items() if not k.endswith('Ids') and k!='stations'},indent=2))
bm.free()
