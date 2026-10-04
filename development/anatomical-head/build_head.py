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
# A compact midface keeps the nose and lips close to the enlarged orbital
# opening; the mandibular underside remains a continuous surface.
YMAP=[(5.85,1.367),(6.08,1.446),(6.22,1.481),(6.4,1.495),(6.60,1.526),(6.90,1.561),(7.28,1.603),(7.6,1.641),(8.4913,1.714)]

# Author the real lower vermilion and its oral return before subdivision.
# These are base.obj vertex indices, mirrored by source coordinates. Raising
# the contact roll over the previous lit horizontal ledge closes the lip line.
# No teeth, painted cover strip or added occluder is used.
LIP_CONTACT=[493,487,481,476,502,503,501]
LIP_SUPPORT=[494,488,482,510]
LIP_RETURN=[523,517,518,519,540,534,535,536]
sculpt={}
for index in LIP_CONTACT:
 x,y,z=verts[index];a=abs(x);contact=1-smooth(.23,.25,a)
 upper_y=profile([(0,6.6081),(.0215,6.6095),(.0466,6.6114),(.0761,6.6127),(.1014,6.6133),(.156,6.6146),(.196,6.6324),(.2243,6.6214),(.2391,6.6143),(.2494,6.6089)],a)
 upper_z=profile([(0,1.553),(.0215,1.5497),(.0466,1.5488),(.0761,1.5452),(.1014,1.5452),(.156,1.5163),(.196,1.4904),(.2243,1.4612),(.2391,1.4354),(.2494,1.4192)],a)
 sculpt[(a,y,z)]=(0,upper_y+.012*contact-y,upper_z+.004*contact-z)
for index in LIP_SUPPORT:
 x,y,z=verts[index];falloff=1-smooth(.18,.255,abs(x))
 sculpt[(abs(x),y,z)]=(0,.011*falloff,.008*falloff)
for index in LIP_RETURN:
 x,y,z=verts[index];falloff=1-smooth(.18,.255,abs(x))
 sculpt[(abs(x),y,z)]=(0,.008*falloff,-.010*falloff)

def sculpt_surface(p):
 x,y,z=p;dx,dy,dz=sculpt.get((abs(x),y,z),(0,0,0))
 return x+dx,y+dy,z+dz
def fit(p):
 x,y,z=p
 # Taper the lower face below a soft malar volume, retaining the source
 # alar/nostril, ear and mandibular topology.
 xx=x*.119*(1-.10*gauss(y,6.48,.43))
 eye=gauss(abs(x),.308,.255)*gauss(y,7.28,.27)*smooth(.65,1.1,z)
 # Most extra width goes toward the temple. Retain the inner canthus and
 # nasal root instead of squeezing the bridge into a thin vertical ridge.
 lateral_scale=.35+.45*smooth(.283,.378,abs(x))
 xx+=math.copysign(1,x)*(.0022+(abs(x)-.308)*.119*lateral_scale)*eye*smooth(0,.145,abs(x))
 yy=profile(YMAP,y)+((y-7.284)*.119*(.18+.32*gauss(y,7.284,.09))+(abs(x)-.308)*.006)*eye
 zz=(z-.76)*.109
 zz+=.0035*gauss(abs(x),.44,.23)*gauss(y,6.96,.29)*smooth(.65,1.05,z)
 zz+=.0015*gauss(abs(x),.39,.21)*gauss(y,6.62,.24)*smooth(.75,1.10,z)
 # Narrow the upper cervical mass behind the jaw, blending into the collar
 # fit below and the ear/mastoid above. Do not scale the chin with the neck.
 neck=smooth(5.95,6.18,y)*(1-smooth(6.23,6.70,y))*(1-smooth(.86,1.25,z))
 xx*=1-.17*neck
 zz-=.0025*neck*smooth(.30,.95,z)
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

def upper_lid_y(x):
 return profile([(.17,7.276),(.21,7.296),(.24,7.313),(.27,7.326),(.31,7.332),(.35,7.331),(.38,7.326),(.41,7.317),(.44,7.290),(.46,7.280)],abs(x))
def lower_lid_y(x):
 return profile([(.17,7.268),(.21,7.254),(.24,7.248),(.27,7.244),(.31,7.240),(.35,7.241),(.38,7.248),(.41,7.260),(.44,7.280),(.46,7.280)],abs(x))
def fit_surface(p):
 x,y,z=sculpt_surface(p);xx,yy,zz=fit((x,y,z))
 # A small physical upper-lid roll and supratarsal recess connect the wider
 # aperture to its brow plane. This deforms skin only, not the eye globe.
 lid_span=gauss(abs(x),.31,.165)*smooth(1.27,1.37,z)
 margin_span=smooth(.165,.245,abs(x))*(1-smooth(.37,.455,abs(x)))
 # Rest the upper lid over the iris. Carry the contact edge and its support
 # together rather than covering the eye with a painted line or a flat cap.
 yy-=.0017*margin_span*gauss(y,7.332,.050)*smooth(1.27,1.37,z)
 yy-=.00025*margin_span*gauss(y,7.238,.033)*smooth(1.27,1.37,z)
 upper=y-upper_lid_y(x);lower=y-lower_lid_y(x)
 # The lid rolls follow their actual almond-shaped contact curves. A flat
 # height mask disappears toward both canthi and leaves an inset white oval.
 zz+=lid_span*(.0033*gauss(upper,.009,.030)-.0008*gauss(upper,.067,.026)
              +.0011*gauss(lower,-.007,.024))
 # Continuous alar support and two philtral columns join the nose to the
 # existing closed vermilion. Preserve the nose width, nostrils and lip seam.
 front=smooth(1.42,1.54,z)
 zz+=.0008*gauss(abs(x),.115,.052)*gauss(y,6.905,.060)*front
 zz+=(.0012*gauss(abs(x),.041,.024)-.00035*gauss(x,0,.025))*gauss(y,6.758,.060)*front
 return xx,yy,zz

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('CC0 hm08 cropped anatomical surface');mesh.from_pydata([fit_surface(p) for p in raw],[],faces);mesh.update()
obj=bpy.data.objects.new('Anatomical adult study',mesh);bpy.context.collection.objects.link(obj)
# The head and neck already share topology and smooth normals. Fair only the
# cervical insertion where the height fit bent the underside into a sharp step;
# retain the front chin/jaw silhouette, ear and collar boundary.
adjacency=[set() for _ in mesh.vertices]
for edge in mesh.edges:
 a,b=edge.vertices;adjacency[a].add(b);adjacency[b].add(a)
neck_weight=[]
for v in mesh.vertices:
 x,y,z=v.co
 neck_weight.append(.55*smooth(1.427,1.455,y)*(1-smooth(1.495,1.535,y))*(1-smooth(.015,.060,z)))
for _ in range(3):
 before=[v.co.copy() for v in mesh.vertices]
 for i,v in enumerate(mesh.vertices):
  if neck_weight[i] and adjacency[i]:
   average=sum((before[j] for j in adjacency[i]),Vector())/len(adjacency[i])
   v.co=before[i].lerp(average,neck_weight[i])
mesh.update()
# Smooth region masks are interpolated with the same real facial topology.
for name in ['lip_tint','cavity_tint','lid_tint']:
 mesh.attributes.new(name,'FLOAT','POINT')
for i,(x,y,z) in enumerate(raw):
 lip=gauss(x,0,.265)*smooth(1.39,1.53,z)*smooth(6.44,6.50,y)*(1-smooth(6.70,6.75,y))
 # Oral cavity behind lips: darker only on its actual internal geometry.
 cavity=(1-smooth(1.40,1.52,z))*smooth(.6,1.15,z)*gauss(x,0,.23)*smooth(6.45,6.51,y)*(1-smooth(6.68,6.74,y))
 lid=gauss(abs(x),.305,.16)*smooth(1.3,1.38,z)*(.48*gauss(y-upper_lid_y(x),.003,.021)+.12*gauss(y-lower_lid_y(x),-.002,.018))
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
eye_trees=[]
for side in [-1,1]:
 cx,cy,cz=side*.30775,7.29415,1.24535
 nu=64;theta=[0,.025,.07,.13,.20,.27,.35,.44,.52,.66,.85,1.05,1.30,1.6,1.95,2.3,2.65,math.pi]
 def globe_point(t,a):
  # A round iris in projection lies on the actual expanded globe surface.
  circular=1.22/math.sqrt((1.54*math.cos(a))**2+(1.46*math.sin(a))**2)
  angle=t*(1+(circular-1)*(1-smooth(.52,1.05,t)))
  return Vector(fit((cx+.164*math.sin(angle)*math.cos(a),cy+.164*math.sin(angle)*math.sin(a),cz+.164*math.cos(angle))))
 positions=[];normals=[];eye_recess=[]
 for t in theta:
  for k in range(nu):
   a=k/nu*math.tau;p=globe_point(t,a);positions.append(p)
   # Differentiate the real fitted globe; radial normals are wrong after an
   # anisotropic orbit fit and made the surface read like a flat inset.
   tt=max(.006,min(math.pi-.006,t));epsilon=.0025
   tangent=globe_point(tt+epsilon,a)-globe_point(tt-epsilon,a)
   across=globe_point(tt,a+epsilon)-globe_point(tt,a-epsilon)
   n=tangent.cross(across).normalized()
   if t<.001:n=Vector((0,0,1))
   elif t>math.pi-.001:n=Vector((0,0,-1))
   normals+=list(n)
   occ=0.0
   if t<.85:
    ref=Vector((1,0,0)) if abs(n.x)<.8 else Vector((0,1,0));u=n.cross(ref).normalized();w=n.cross(u).normalized()
    for j in range(12):
     az=j*2.399963;ct=.35+.5*((j+.5)/12);st=math.sqrt(1-ct*ct)
     direction=n*ct+(u*math.cos(az)+w*math.sin(az))*st
     if skin_tree.ray_cast(p+n*.00015,direction,.010)[0] is not None:occ+=1/12
   # Local upper-hemisphere visibility: the real projecting lid roll shades
   # the globe beneath it, including the iris. This is a geometric cavity
   # bake, not a white/dark patch attached to the camera or a lighting switch.
   upper_occ=0.0
   if t<.85:
    for sx in [-.35,0,.35]:
     for sz in [.20,.45,.70]:
      direction=Vector((sx,1,sz)).normalized()
      if skin_tree.ray_cast(p+n*.00018,direction,.018)[0] is not None:upper_occ+=1/9
   eye_recess.append(1-(1-occ)*(1-.78*upper_occ))
 globe_faces=[]
 for j in range(len(theta)-1):
  for k in range(nu):
   a=j*nu+k;b=j*nu+(k+1)%nu;c=(j+1)*nu+k;d=(j+1)*nu+(k+1)%nu
   globe_faces.extend([(a,c,b),(b,c,d)])
 eye_trees.append(BVHTree.FromPolygons(positions,globe_faces))
 for material,condition in [('pupil',lambda t:t<=.13),('iris',lambda t:.13<t<=.44),('sclera',lambda t:t>.44)]:
  ix=[]
  for j in range(len(theta)-1):
   if not condition(theta[j+1]):continue
   for k in range(nu):a=j*nu+k;b=j*nu+(k+1)%nu;c=(j+1)*nu+k;d=(j+1)*nu+(k+1)%nu;ix += [a,c,b,b,c,d]
  em=bpy.data.meshes.new('Eye '+material);em.from_pydata(positions,[],[ix[i:i+3] for i in range(0,len(ix),3)]);em.update()
  bm=bmesh.new();bm.from_mesh(em);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(em);bm.free()
  # Every material ring shares the same complete-globe differential normal.
  parts.append({'name':'eye-'+str(side)+'-'+material,'material':material,'position':[a for p in positions for a in p],'normal':normals,'index':ix,'recessWeight':eye_recess})
 # Original surface-fitted brow ribbon: fuller inner body, quiet arch, fine
 # tail, shallow cross-section. A round extruded tube read as a heavy sticker.
 brow_y=[(.145,7.390),(.19,7.399),(.28,7.412),(.38,7.419),(.49,7.398),(.568,7.350)]
 brow_z=[(.145,1.49),(.28,1.43),(.38,1.38),(.49,1.30),(.568,1.23)]
 brow_r=[(0,.05),(.09,.82),(.30,1),(.57,.78),(.80,.43),(1,.015)]
 bp=[];bf=[];bn=48;bw=6
 for j in range(bn+1):
  t=j/bn;x=.145+(.568-.145)*t
  center=Vector(fit((side*x,profile(brow_y,x),profile(brow_z,x))))
  half=.0023*profile(brow_r,t)
  for k in range(bw+1):
   a=k/bw*2-1;p=center.copy();p.y+=a*half
   hit=skin_tree.ray_cast(Vector((p.x,p.y,.3)),Vector((0,0,-1)),.6)[0]
   if hit is not None:p.z=hit.z+.00045+.00050*(1-a*a)*profile(brow_r,t)
   bp.append(p)
 for j in range(bn):
  for k in range(bw):
   a=j*(bw+1)+k;bf.append((a,a+1,a+bw+2,a+bw+1))
 bmsh=bpy.data.meshes.new('Surface fitted brow');bmsh.from_pydata(bp,[],bf);bmsh.update()
 bo=bpy.data.objects.new('Brow '+str(side),bmsh);bpy.context.collection.objects.link(bo)
 for poly in bmsh.polygons:poly.use_smooth=True
 deps=bpy.context.evaluated_depsgraph_get();ev=bo.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles()
 parts.append({'name':'brow-'+str(side),'material':'brow','position':[a for v in me.vertices for a in v.co],'normal':[a for v in me.vertices for a in v.normal],'index':[a for t in me.loop_triangles for a in t.vertices]});ev.to_mesh_clear()
# Reciprocal contact occlusion: the eyelid edge receives occlusion from the
# actual globe as well as surrounding skin. This follows geometry, not a drawn
# eyeliner stripe, and does not change the skin ramp or light sources.
head=parts[0]
for i in range(len(head['position'])//3):
 p=Vector(head['position'][i*3:i*3+3]);x,y,z=p
 if not (.010<abs(x)<.080 and 1.582<y<1.626 and z>.030):continue
 n=Vector(head['normal'][i*3:i*3+3]).normalized()
 ref=Vector((1,0,0)) if abs(n.x)<.8 else Vector((0,1,0));u=n.cross(ref).normalized();w=n.cross(u).normalized();occ=0
 for j in range(12):
  a=j*2.399963;ct=.35+.5*((j+.5)/12);st=math.sqrt(1-ct*ct)
  direction=n*ct+(u*math.cos(a)+w*math.sin(a))*st
  if any(tree.ray_cast(p+n*.00025,direction,.006)[0] is not None for tree in eye_trees):occ+=1/12
 old=head['recessWeight'][i];head['recessWeight'][i]=1-(1-old)*(1-occ)
output={'license':'CC0-1.0 (base mesh); original study fitting/globes/brows','sourceCommit':meta['commit'],'sourceSha256':meta['files']['base.obj']['sha256'],'coordinateSystem':'metres Y up, face +Z','prototypeOnly':True,'unimplemented':['blended neck skinning','production facial traits','all body/hairstyle/pose integration'],'sourceVertices':len(raw),'sourceFaces':len(faces),'subdivision':1,'parts':parts}
(ROOT/'assets'/'adult-head-study.json').write_text(json.dumps(output,separators=(',',':'))+'\n')
print(json.dumps({'vertices':sum(len(p['position'])//3 for p in parts),'triangles':sum(len(p['index'])//3 for p in parts),'path':str(ROOT/'assets'/'adult-head-study.json')}))
