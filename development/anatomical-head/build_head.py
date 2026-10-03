"""Offline anatomical study from pinned CC0 hm08 DATA (no MakeHuman code).
Run: /usr/bin/blender -b --factory-startup --python development/anatomical-head/build_head.py
Y-up, face +Z, metres. Production character sources are never modified.
"""
import bpy, bmesh, json, pathlib, math, hashlib
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=pathlib.Path(__file__).resolve().parent
UP=ROOT/'assets'/'upstream'
meta=json.loads((UP/'provenance.json').read_text())
data=(UP/'base.obj').read_bytes()
assert hashlib.sha256(data).hexdigest()==meta['files']['base.obj']['sha256']
assert b'explicitly released as CC0' in data[:1000]
verts=[];faces=[];group=None
for line in data.decode().splitlines():
 a=line.split()
 if not a:continue
 if a[0]=='v':verts.append(tuple(map(float,a[1:4])))
 elif a[0]=='g':group=a[1]
 elif a[0]=='f' and group=='body':faces.append([int(x.split('/')[0])-1 for x in a[1:]])
# Keep real surface head/neck only, excluding all helper or joint geometry.
faces=[f for f in faces if all(verts[i][1]>=5.85 for i in f)]
used=sorted({i for f in faces for i in f});ids={j:i for i,j in enumerate(used)}
raw=[verts[i] for i in used];faces=[[ids[i] for i in f] for f in faces]
def clamp(x):return max(0.,min(1.,x))
def smooth(a,b,x):
 t=clamp((x-a)/(b-a));return t*t*(3-2*t)
def gauss(x,c,w):return math.exp(-((x-c)/w)**2)
def profile(keys,x):
 if x<=keys[0][0]:return keys[0][1]
 if x>=keys[-1][0]:return keys[-1][1]
 for j,(a,b) in enumerate(zip(keys,keys[1:])):
  if x<=b[0]:
   p=keys[max(0,j-1)];n=keys[min(len(keys)-1,j+2)]
   t=(x-a[0])/(b[0]-a[0]);d=b[0]-a[0]
   m1=(b[1]-p[1])/(b[0]-p[0]);m2=(n[1]-a[1])/(n[0]-a[0])
   return (2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*d*m1+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*d*m2
YMAP=[(5.85,1.367),(6.08,1.446),(6.22,1.477),(6.4,1.492),(6.60,1.522),(6.90,1.556),(7.28,1.603),(7.6,1.641),(8.4913,1.714)]
def fit(p):
 x,y,z=p
 # Broad authored proportions retain source anatomy and soften the lower jaw.
 xx=x*.119*(1-.035*gauss(y,6.48,.42))
 eye=gauss(abs(x),.308,.24)*gauss(y,7.28,.30)*smooth(.65,1.1,z)
 xx+=math.copysign(1,x)*(.0022+(abs(x)-.308)*.119*.32)*eye
 yy=profile(YMAP,y)+(y-7.284)*.119*.03*eye
 zz=(z-.76)*.109
 # Set the collar end to the existing neck envelope without moving the chin.
 t=1-smooth(5.98,6.25,y)
 xx*=1-.28*t;zz=zz*(1-.25*t)-.014*t
 # Seat only the upper cranium inside the retained procedural hair scalp.
 # Facial plane, ears and jaw remain anatomical. No change to the hair asset.
 fit_t=smooth(1.620,1.659,yy)
 ry=max(.0001,1-((yy-1.600)/.117)**2)**.5
 q=((xx/(.0895*ry))**2+((zz+.017)/(.105*ry))**2)**.5
 if q>1:xx*=1-fit_t+fit_t/q;zz=-.017+(zz+.017)*(1-fit_t+fit_t/q)
 return xx,yy,zz
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('CC0 hm08 cropped anatomical surface');mesh.from_pydata([fit(p) for p in raw],[],faces);mesh.update()
obj=bpy.data.objects.new('Anatomical adult study',mesh);bpy.context.collection.objects.link(obj)
# Smooth region masks are interpolated with the same real facial topology.
for name in ['lip_tint','cavity_tint','lid_tint']:
 mesh.attributes.new(name,'FLOAT','POINT')
for i,(x,y,z) in enumerate(raw):
 lip=gauss(x,0,.265)*smooth(1.39,1.53,z)*smooth(6.44,6.50,y)*(1-smooth(6.70,6.75,y))
 # Oral cavity behind lips: darker only on its actual internal geometry.
 cavity=(1-smooth(1.40,1.52,z))*smooth(.6,1.15,z)*gauss(x,0,.23)*smooth(6.45,6.51,y)*(1-smooth(6.68,6.74,y))
 lid=gauss(abs(x),.305,.17)*gauss(y,7.333,.04)*smooth(1.3,1.38,z)*.30
 mesh.attributes['lip_tint'].data[i].value=lip
 seam=gauss(y,6.605,.024)*(1-smooth(1.548,1.566,z))*gauss(x,0,.29)*smooth(1.20,1.43,z)
 mesh.attributes['cavity_tint'].data[i].value=max(cavity,seam)
 mesh.attributes['lid_tint'].data[i].value=lid
for p in mesh.polygons:p.use_smooth=True
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
sub=obj.modifiers.new('One anatomical Catmull-Clark level','SUBSURF');sub.levels=1;sub.render_levels=1
# Original eye globes fit the real closed eyelid/cavity surface. No helper
# geometry is exported. Iris and pupil are face rings on the same curved globe.
parts=[]
deps=bpy.context.evaluated_depsgraph_get();ev=obj.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles()
part={'name':'head-neck','material':'skin','position':[],'normal':[],'index':[],'lipWeight':[],'cavityWeight':[],'lidWeight':[]}
for v in me.vertices:
 part['position']+=list(v.co);part['normal']+=list(v.normal)
 for a,b in [('lipWeight','lip_tint'),('cavityWeight','cavity_tint'),('lidWeight','lid_tint')]:part[a].append(me.attributes[b].data[v.index].value)
for t in me.loop_triangles:part['index']+=list(t.vertices)
skin_tree=BVHTree.FromPolygons([v.co.copy() for v in me.vertices],[list(t.vertices) for t in me.loop_triangles])
# Short-range occlusion records actual recesses (nostrils, lip opening and lids),
# without changing the production ramp or inventing a brighter skin shade.
part['recessWeight']=[]
for v in me.vertices:
 x,y,z=v.co
 face=smooth(.030,.060,z)*smooth(1.486,1.510,y)*(1-smooth(1.637,1.651,y))*(1-smooth(.070,.085,abs(x)))
 occ=0.0
 if face:
  n=v.normal.normalized();ref=Vector((1,0,0)) if abs(n.x)<.8 else Vector((0,1,0));u=n.cross(ref).normalized();w=n.cross(u).normalized()
  for j in range(12):
   a=j*2.399963;ct=.35+.5*((j+.5)/12);st=math.sqrt(1-ct*ct);direction=n*ct+(u*math.cos(a)+w*math.sin(a))*st
   hit=skin_tree.ray_cast(v.co+n*.00025,direction,.012)[0]
   if hit is not None:occ+=1/12
 part['recessWeight'].append(occ*face)
parts.append(part);ev.to_mesh_clear()
# Dense original procedural eyeballs and brows can be tuned independently of
# the CC0 face, retaining iris/hair color chosen by the production test actor.
for side in [-1,1]:
 cx,cy,cz=side*.30775,7.28415,1.24535
 nu=64;theta=[0,.025,.08,.16,.23,.30,.36,.43,.52,.66,.85,1.05,1.30,1.6,1.95,2.3,2.65,math.pi]
 positions=[]
 for t in theta:
  for k in range(nu):
   a=k/nu*math.tau;positions.append(fit((cx+.164*math.sin(t)*math.cos(a),cy+.164*math.sin(t)*math.sin(a),cz+.164*math.cos(t))))
 for material,condition in [('pupil',lambda t:t<=.16),('iris',lambda t:.16<t<=.43),('sclera',lambda t:t>.43)]:
  ix=[]
  for j in range(len(theta)-1):
   if not condition(theta[j+1]):continue
   for k in range(nu):a=j*nu+k;b=j*nu+(k+1)%nu;c=(j+1)*nu+k;d=(j+1)*nu+(k+1)%nu;ix += [a,c,b,b,c,d]
  em=bpy.data.meshes.new('Eye '+material);em.from_pydata(positions,[],[ix[i:i+3] for i in range(0,len(ix),3)]);em.update()
  bm=bmesh.new();bm.from_mesh(em);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(em);bm.free()
  # Smooth ellipsoid normal, avoiding visible normal seams at iris face rings.
  normals=[]
  for p in positions:normals+=list((Vector(p)-Vector(fit((cx,cy,cz)))).normalized())
  parts.append({'name':'eye-'+str(side)+'-'+material,'material':material,'position':[a for p in positions for a in p],'normal':normals,'index':ix})
 # Original fine tapered eyebrow follows the actual source brow plane.
 cu=bpy.data.curves.new('Original tapered brow','CURVE');cu.dimensions='3D';cu.resolution_u=12;cu.bevel_depth=.00205;cu.bevel_resolution=2
 sp=cu.splines.new('BEZIER');sp.bezier_points.add(4)
 for p,co,r in zip(sp.bezier_points,[(.16,7.380,1.49),(.26,7.405,1.44),(.37,7.408,1.39),(.48,7.380,1.31),(.57,7.330,1.23)],[.40,.95,1,.65,.03]):
  p.co=fit((side*co[0],co[1],co[2]));hit=skin_tree.ray_cast(Vector((p.co.x,p.co.y,.3)),Vector((0,0,-1)),.6)[0]
  if hit is not None:p.co.z=hit.z+.0013
  p.handle_left_type='AUTO';p.handle_right_type='AUTO';p.radius=r
 bo=bpy.data.objects.new('Brow '+str(side),cu);bpy.context.collection.objects.link(bo)
 deps=bpy.context.evaluated_depsgraph_get();ev=bo.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles()
 parts.append({'name':'brow-'+str(side),'material':'brow','position':[a for v in me.vertices for a in v.co],'normal':[a for v in me.vertices for a in v.normal],'index':[a for t in me.loop_triangles for a in t.vertices]});ev.to_mesh_clear()
output={'license':'CC0-1.0 (base mesh); original study fitting/globes/brows','sourceCommit':meta['commit'],'sourceSha256':meta['files']['base.obj']['sha256'],'coordinateSystem':'metres Y up, face +Z','prototypeOnly':True,'unimplemented':['blended neck skinning','production facial traits','all body/hairstyle/pose integration'],'sourceVertices':len(raw),'sourceFaces':len(faces),'subdivision':1,'parts':parts}
(ROOT/'assets'/'adult-head-study.json').write_text(json.dumps(output,separators=(',',':'))+'\n')
print(json.dumps({'vertices':sum(len(p['position'])//3 for p in parts),'triangles':sum(len(p['index'])//3 for p in parts),'path':str(ROOT/'assets'/'adult-head-study.json')}))
