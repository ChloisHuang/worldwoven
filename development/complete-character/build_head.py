"""Offline named-cage sculpt on pinned CC0 topology; no reference pixels.
/usr/bin/blender -b --factory-startup --python development/complete-character/build_head.py
"""
import bpy,bmesh,json,pathlib,hashlib,math,os
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=pathlib.Path(__file__).resolve().parent
FORM=os.environ.get('CHARACTER_FORM','male')
forms=json.loads((ROOT/'forms.json').read_text());form=forms[FORM]
UP=ROOT.parent/'anatomical-head/assets/upstream'
meta=json.loads((UP/'provenance.json').read_text());data=(UP/'base.obj').read_bytes()
assert hashlib.sha256(data).hexdigest()==meta['files']['base.obj']['sha256']
verts=[];faces=[];group=''
for line in data.decode().splitlines():
 a=line.split()
 if not a:continue
 if a[0]=='v':verts.append(tuple(map(float,a[1:4])))
 elif a[0]=='g':group=a[1]
 elif a[0]=='f' and group=='body':faces.append([int(x.split('/')[0])-1 for x in a[1:]])
faces=[f for f in faces if all(verts[i][1]>=5.85 for i in f)]
used=sorted({i for f in faces for i in f});ids={v:i for i,v in enumerate(used)};raw=[verts[i] for i in used];faces=[[ids[v] for v in f] for f in faces]
def clamp(v):return max(0.,min(1.,v))
def smooth(a,b,v):
 t=clamp((v-a)/(b-a));return t*t*(3-2*t)
def bell(v,c,w):return math.exp(-((v-c)/w)**2)
def profile(keys,v):
 if v<=keys[0][0]:return keys[0][1]
 if v>=keys[-1][0]:return keys[-1][1]
 for j,(a,b) in enumerate(zip(keys,keys[1:])):
  if v<=b[0]:
   p=keys[max(0,j-1)];n=keys[min(len(keys)-1,j+2)];t=(v-a[0])/(b[0]-a[0]);d=b[0]-a[0]
   ma=(b[1]-p[1])/(b[0]-p[0]);mb=(n[1]-a[1])/(n[0]-a[0])
   return (2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*d*ma+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*d*mb
# One editable cage solve. The biharmonic radial basis preserves the actual
# original topology and interpolates authored whole-plane targets exactly.
handles=json.loads((ROOT/'cage.json').read_text())['handles'];src=[];dst=[];names=[]
def frame(p):
 p=np.array(p,dtype=float);pivot=np.array(form['pivot']);scale=np.array(form['scale'])
 # Head compaction fades through the short neck into its fixed garment seam.
 weight=smooth(1.38,1.435,p[1]);return list(p+(p-pivot)*(scale-1)*weight)
handles.append(['orbital_globe_center',[.30775,7.281,1.24535],form['globeCenter']])
handles.extend(form.get('cranialHandles',[]))
for handle in handles:
 name=handle[0];target=form['overrides'].get(name,forms['common'].get(name,handle[2]));handle[2]=form.get('finalOverrides',{}).get(name,frame(target))

for name,a,b in handles:
 for side in ([1,-1] if a[0] else [1]):
  src.append([a[0]*side,a[1],a[2]]);dst.append([b[0]*side,b[1],b[2]]);names.append(name+('-L' if side<0 else '-R' if a[0] else ''))
S=np.array(src);D=np.array(dst);Q=np.column_stack([np.ones(len(S)),S]);R=np.linalg.norm(S[:,None]-S[None,:],axis=2)
A=np.block([[R,Q],[Q.T,np.zeros((4,4))]]);coef=np.linalg.solve(A,np.vstack([D,np.zeros((4,3))]))
def cage(points):
 p=np.array(points);r=np.linalg.norm(p[:,None]-S[None,:],axis=2)
 return r@coef[:len(S)]+np.column_stack([np.ones(len(p)),p])@coef[len(S):]
# Author the frontal outline itself, with endpoint tangents shared with the
# retained skull. There is no post-solve vertical mask suppressing its lower
# volume: the curve's value AND derivative meet the baseline at each end.
center_source=[p for p in raw if abs(p[0])<1e-7 and p[1]>7.35 and p[2]>.65]
center_surface=cage(center_source)
center_profile=sorted([(float(p[1]),float(p[2])) for p in center_surface])
def center_derivative(y):return (profile(center_profile,y+.00001)-profile(center_profile,y-.00001))/.00002
frontal=form['foreheadProfile'];lo,hi=frontal['lowerY'],frontal['upperY']
frontal_curve=[[lo,profile(center_profile,lo),center_derivative(lo)]]+frontal['stations']+[[hi,profile(center_profile,hi),center_derivative(hi)]]
def frontal_value(y):
 for a,b in zip(frontal_curve,frontal_curve[1:]):
  if y<=b[0]:
   width=b[0]-a[0];t=(y-a[0])/width
   return (2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*width*a[2]+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*width*b[2]
 return frontal_curve[-1][1]
def sculpt_forehead(p):
 p=np.array(p,dtype=float).copy();x,y,z=p
 if lo<y<hi:
  lateral=1-smooth(.035,.077,abs(x));anterior=smooth(-.005,.035,z)
  p[2]+=(frontal_value(y)-profile(center_profile,y))*lateral*anterior
 return p
def point(p):return Vector(cage([p])[0])
# Actual lower lip contact loop/inner oral return edits, mirrored by source
# positions. Move real skin to contact; never add a closure plane or mouth decal.
contact=[493,487,481,476,502,503,501];sculpt={}
upper_y=[(0,6.6081),(.0215,6.6095),(.0466,6.6114),(.0761,6.6127),(.1014,6.6133),(.156,6.6146),(.196,6.6324),(.2243,6.6214),(.2391,6.6143),(.2494,6.6089)]
upper_z=[(0,1.553),(.0215,1.5497),(.0466,1.5488),(.0761,1.5452),(.1014,1.5452),(.156,1.5163),(.196,1.4904),(.2243,1.4612),(.2391,1.4354),(.2494,1.4192)]
for i in contact:
 x,y,z=verts[i];u=1-smooth(.23,.25,abs(x));sculpt[(abs(x),y,z)]=(x,profile(upper_y,abs(x))+.010*u,profile(upper_z,abs(x))+.004*u)
sculpted=[]
for x,y,z in raw:
 if (abs(x),y,z) in sculpt:
  _,y,z=sculpt[(abs(x),y,z)]
 sculpted.append((x,y,z))
positions=np.array([sculpt_forehead(p) for p in cage(sculpted)])
# Authored local planes are direct named vertex-loop moves, mirrored by source
# topology. They are not extra meshes or a global displacement function.
loops=json.loads((ROOT/'topology_sculpt.json').read_text())['loops']
lookup={(round(abs(x),5),round(y,5),round(z,5)):[] for x,y,z in raw}
for i,(x,y,z) in enumerate(raw):lookup[(round(abs(x),5),round(y,5),round(z,5))].append(i)
for loop in loops:
 for at,index in enumerate(loop['vertices']):
  x,y,z=verts[index]
  for i in lookup.get((round(abs(x),5),round(y,5),round(z,5)),[]):positions[i]+=np.array(loop['delta'])*np.array(form['scale'])*(loop.get('weights',[1]*len(loop['vertices']))[at])
# Fit the one open cervical boundary to the existing collar. Interior facial
# topology is closed and has no boundary in this source mesh.
from collections import Counter
edges=Counter(tuple(sorted((f[j],f[(j+1)%len(f)]))) for f in faces for j in range(len(f)))
boundary={v for e,n in edges.items() if n==1 for v in e}
for i in boundary:
 x,y,z=raw[i];angle=math.atan2(x,(z-.235)*1.1)
 positions[i]=(form['neckRadii'][0]*math.sin(angle),1.353,-.008+form['neckRadii'][1]*math.cos(angle))

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('hm08 authored adult control topology');mesh.from_pydata(positions,[],faces);mesh.update()
obj=bpy.data.objects.new('Complete adult anatomical surface',mesh);bpy.context.collection.objects.link(obj)
cage_mesh=bpy.data.meshes.new('Named sculpt cage');cage_mesh.from_pydata(dst,[],[]);cage_obj=bpy.data.objects.new('Anatomical cage handles',cage_mesh);bpy.context.collection.objects.link(cage_obj);cage_obj.hide_render=True;cage_obj['names']=json.dumps(names)
for name in ['feature_coord']:mesh.attributes.new(name,'FLOAT_VECTOR','POINT')
for name in ['lip_tint','cavity_tint','lid_tint']:mesh.attributes.new(name,'FLOAT','POINT')
def upper_lid(x):return profile([(.17,7.276),(.21,7.296),(.24,7.313),(.27,7.326),(.31,7.332),(.35,7.331),(.38,7.326),(.41,7.317),(.44,7.290),(.46,7.280)],abs(x))
def lower_lid(x):return profile([(.17,7.268),(.21,7.254),(.24,7.248),(.27,7.244),(.31,7.240),(.35,7.241),(.38,7.248),(.41,7.260),(.44,7.280),(.46,7.280)],abs(x))
for i,(x,y,z) in enumerate(raw):
 mesh.attributes['feature_coord'].data[i].vector=(x,y,z)
 lip=bell(x,0,.265)*smooth(1.39,1.53,z)*smooth(6.44,6.50,y)*(1-smooth(6.70,6.75,y))
 cavity=(1-smooth(1.40,1.52,z))*smooth(.6,1.15,z)*bell(x,0,.23)*smooth(6.45,6.51,y)*(1-smooth(6.68,6.74,y))
 seam=bell(y,6.605,.020)*(1-smooth(1.548,1.566,z))*bell(x,0,.29)*smooth(1.20,1.43,z)
 lid=bell(abs(x),.305,.16)*smooth(1.3,1.38,z)*(.36*bell(y-upper_lid(x),.003,.019)+.04*bell(y-lower_lid(x),-.002,.016))
 mesh.attributes['lip_tint'].data[i].value=lip;mesh.attributes['cavity_tint'].data[i].value=max(cavity,seam);mesh.attributes['lid_tint'].data[i].value=lid
for poly in mesh.polygons:poly.use_smooth=True
bm=bmesh.new();bm.from_mesh(mesh)
# The source concentrates loops in the face/ears. Refine only its sparse
# upper/posterior cranial cage, keeping the anatomical face loops intact.
semantic=bm.verts.layers.float_vector.get('feature_coord')
def cranial_weight(v):
 sx,sy,sz=v[semantic]
 top=smooth(7.43,7.78,sy)
 back=(1-smooth(.18,.62,sz))*smooth(6.38,6.93,sy)
 ear_guard=1-smooth(.63,.76,abs(sx))*(1-smooth(7.35,7.62,sy))
 return max(top,back)*ear_guard
edges=[e for e in bm.edges if all(cranial_weight(v)>.08 for v in e.verts)]
bmesh.ops.subdivide_edges(bm,edges=edges,cuts=1,use_grid_fill=True)
for _ in range(2):
 old_positions={v:v.co.copy() for v in bm.verts}
 for v in bm.verts:
  weight=cranial_weight(v)
  if weight<=0 or not v.link_edges:continue
  neighbors=[edge.other_vert(v) for edge in v.link_edges]
  average=sum((old_positions[n] for n in neighbors),Vector())/len(neighbors)
  v.co=old_positions[v].lerp(average,.40*weight)
bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
# Export the native designed control loops for the light mesh; optional single
# subdivision is a sculpt comparison only. No collapse/decimation is used.
level=int(os.environ.get('SCULPT_LEVEL','0'))
if level:
 sub=obj.modifiers.new('Sculpt cage limit surface','SUBSURF');sub.levels=level
parts=[];deps=bpy.context.evaluated_depsgraph_get();ev=obj.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles()
part={'name':'head-neck','material':'skin','position':[],'normal':[],'index':[],'featureCoord':[],'lipWeight':[],'cavityWeight':[],'lidWeight':[],'recessWeight':[]}
for v in me.vertices:
 part['position']+=list(v.co);part['normal']+=list(v.normal);part['featureCoord']+=list(me.attributes['feature_coord'].data[v.index].vector)
 for key,attr in [('lipWeight','lip_tint'),('cavityWeight','cavity_tint'),('lidWeight','lid_tint')]:part[key].append(me.attributes[attr].data[v.index].value)
for t in me.loop_triangles:part['index']+=list(t.vertices)
tree=BVHTree.FromPolygons([v.co.copy() for v in me.vertices],[list(t.vertices) for t in me.loop_triangles])
for v in me.vertices:
 x,y,z=v.co;occ=0.
 if z>.035 and 1.462<y<1.602:
  n=v.normal.normalized();ref=Vector((1,0,0)) if abs(n.x)<.8 else Vector((0,1,0));u=n.cross(ref).normalized();w=n.cross(u).normalized()
  for j in range(8):
   a=j*2.399963;ct=.4+.45*((j+.5)/8);st=math.sqrt(1-ct*ct);direction=n*ct+(u*math.cos(a)+w*math.sin(a))*st
   if tree.ray_cast(v.co+n*.00025,direction,.009)[0] is not None:occ+=1/8
 part['recessWeight'].append(occ)
parts.append(part);ev.to_mesh_clear()
def export(name,material,vs,fs,features=None,occ=None):
 fs=[f for f in fs if (Vector(vs[f[1]])-Vector(vs[f[0]])).cross(Vector(vs[f[2]])-Vector(vs[f[0]])).length_squared>1e-24]
 em=bpy.data.meshes.new(name);em.from_pydata(vs,[],fs);em.update()
 bm=bmesh.new();bm.from_mesh(em);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(em);bm.free();em.calc_loop_triangles()
 p={'name':name,'material':material,'position':[x for v in em.vertices for x in v.co],'normal':[x for v in em.vertices for x in v.normal],'index':[x for t in em.loop_triangles for x in t.vertices]}
 if features is not None:p['featureCoord']=features
 if occ is not None:p['recessWeight']=occ
 parts.append(p)
# One continuous convex globe per eye. Iris and pupil are ring sections of
# that same globe, with a natural round projected iris and lid-sized aperture.
for side in [-1,1]:
 center=Vector((side*.30775,7.281,1.24535));rad=Vector((.164,.164,.164));nu=48
 theta=[0,.07,.15,.24,.32,.405,.46,.58,.76,1.02,1.30,1.65,2.05,2.50,math.pi]
 points=[];normals=[];fc=[];occ=[]
 for t in theta:
  for k in range(nu):
   a=k/nu*math.tau;sn=math.sin(t);p=point(center+Vector((rad.x*sn*math.cos(a),rad.y*sn*math.sin(a),rad.z*math.cos(t))))
   source_point=np.array(center+Vector((rad.x*sn*math.cos(a),rad.y*sn*math.sin(a),rad.z*math.cos(t))))
   difference=source_point-S;distance=np.maximum(1e-9,np.linalg.norm(difference,axis=1))
   jacobian=(difference/distance[:,None]).T@coef[:len(S)]+coef[len(S)+1:]
   outward=np.linalg.solve(jacobian,np.array([sn*math.cos(a),sn*math.sin(a),math.cos(t)]))
   outward/=np.linalg.norm(outward);normals.append(list(outward))
   points.append(p);fc += [math.sin(t)/math.sin(.405)*math.cos(a),math.sin(t)/math.sin(.405)*math.sin(a),t]
   hit=tree.ray_cast(p+Vector((0,.0003,.0002)),Vector((0,.8,.6)),.013)[0];occ.append(.65 if hit is not None else 0.)
 for material,lo,hi in [('pupil',0,.15),('iris',.15,.405),('sclera',.405,math.pi)]:
  fs=[]
  for j in range(len(theta)-1):
   if not (lo<theta[j+1]<=hi):continue
   for k in range(nu):a=j*nu+k;b=j*nu+(k+1)%nu;c=(j+1)*nu+k;d=(j+1)*nu+(k+1)%nu;fs.extend([(a,c,b),(b,c,d)])
  relevant=sorted({i for f in fs for i in f});remap={v:i for i,v in enumerate(relevant)}
  export('eye-'+str(side)+'-'+material,material,[points[i] for i in relevant],[[remap[i] for i in f] for f in fs],[c for i in relevant for c in fc[i*3:i*3+3]],[occ[i] for i in relevant])
  parts[-1]['normal']=[v for i in relevant for v in normals[i]]
 # Shallow skin-fitted eyebrows, one polygon ribbon with tapered fringe.
 bp=[];bf=[];bc=[];bn=38;bw=4
 for j in range(bn+1):
  t=j/bn;span=form.get('browFinalSpan',[.018,form['browEnd']]);x=span[0]+(span[1]-span[0])*t;y=profile(form.get('browFinalPath',form['browPath']),t);half=form.get('browFinalHalfWidth',form['browHalfWidth'])*profile([(0,.20),(.12,.95),(.32,1),(.67,.73),(1,.015)],t)
  for k in range(bw+1):
   a=k/bw*2-1;p=Vector((side*x,y+a*half,.2) if 'browFinalPath' in form else frame((side*x,y+a*half,.2)));hit=tree.ray_cast(p,Vector((0,0,-1)),.4)[0]
   if hit is not None:p.z=hit.z+.0004+.00018*(1-a*a)
   else:p.z=.06
   bp.append(p);bc += [t,a,0]
 for j in range(bn):
  for k in range(bw):a=j*(bw+1)+k;bf.append([a,a+1,a+bw+2,a+bw+1])
 export('brow-'+str(side),'brow',bp,bf,bc)
# Rounded output coordinates are deterministic, small, and adequate below a
# hundredth of a millimetre. Only the final game-candidate mesh is shipped.
for p in parts:
 for k,v in p.items():
  if isinstance(v,list) and k!='index':p[k]=[round(float(x),7) for x in v]
output={'license':'CC0-1.0 hm08; original cage, eyes and brows','sourceCommit':meta['commit'],'sourceSha256':meta['files']['base.obj']['sha256'],'coordinateSystem':'metres Y up face +Z','method':'named anatomical biharmonic cage plus direct topology contact loops','form':FORM,'prototypeOnly':True,'unimplemented':['facial trait morphs','other body and hairstyle variants'],'parts':parts,'landmarks':{n:list(sculpt_forehead(cage([source])[0])) for n,source,_ in handles},'sourceVertices':len(raw),'sourceFaces':len(faces)}
(ROOT/('adult-head.json' if FORM=='male' else 'adult-head-female.json')).write_text(json.dumps(output,separators=(',',':'))+'\n')
if os.environ.get('SAVE_SCULPT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=os.environ['SAVE_SCULPT_BLEND'])
print(json.dumps({'vertices':sum(len(p['position'])//3 for p in parts),'triangles':sum(len(p['index'])//3 for p in parts),'parts':[(p['name'],len(p['index'])//3) for p in parts],'bounds':[(min(part['position'][k::3]),max(part['position'][k::3])) for k in range(3)]}))
