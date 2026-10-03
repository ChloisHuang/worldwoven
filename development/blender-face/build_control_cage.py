"""Original editable adult face cage. No image/mesh tracing or imported assets."""
import bpy, bmesh, math, json, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parent
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
MATS={}
for name,color in {'skin':(.68,.48,.36,1),'lip':(.48,.25,.22,1),'mouth':(.15,.07,.065,1),'sclera':(.8,.82,.83,1),'iris':(.10,.075,.055,1),'pupil':(.018,.018,.02,1),'brow':(.06,.043,.034,1)}.items():
 m=bpy.data.materials.new(name);m.diffuse_color=color;MATS[name]=m
verts=[];faces=[];tags=[];creases=set();weld={}
def V(p):
 k=tuple(round(a,7) for a in p)
 if k not in weld:weld[k]=len(verts);verts.append(tuple(p))
 return weld[k]
def F(ids,tag='skin'):
 ids=list(dict.fromkeys(ids))
 if len(ids)>=3:faces.append(ids);tags.append(tag)
def R(name,y,width,z,x=None,yy=None):
 if x is None:x=[width*k for k in [0,.12,.29,.46,.66,.86,1]]
 return name,[V((x[i],yy[i] if yy else y,z[i])) for i in range(7)]
rows=[]
def add(*a,**k):rows.append(R(*a,**k))
add('chin_tip',1.472,.024,[.055,.055,.053,.049,.042,.026,.011])
add('chin_lower',1.482,.034,[.068,.067,.065,.060,.049,.032,.009])
add('chin_body',1.494,.041,[.073,.072,.071,.066,.058,.040,.009])
add('chin_groove',1.504,.052,[.076,.076,.075,.071,.063,.045,.010])
add('lip_lower_border',1.509,.057,[.080,.080,.077,.073,.063,.043,.008],x=[0,.008,.019,.0355,.044,.052,.057],yy=[1.5065,1.507,1.5115,1.517,1.510,1.509,1.509])
add('lip_lower_body',1.514,.061,[.090,.089,.083,.075,.065,.045,.008],x=[0,.008,.019,.0318,.046,.056,.061],yy=[1.5115,1.5125,1.515,1.518,1.515,1.514,1.514])
add('lip_lower_roll',1.517,.064,[.086,.086,.081,.075,.065,.046,.008],x=[0,.008,.019,.0305,.047,.059,.064],yy=[1.5175,1.5175,1.518,1.519,1.5168,1.5165,1.5165])
add('mouth_lower',1.518,.064,[.080,.080,.077,.074,.065,.046,.008],x=[0,.008,.019,.030,.047,.059,.064],yy=[1.5178,1.5175,1.518,1.519,1.518,1.518,1.518])
add('mouth_upper',1.518,.064,[.080,.081,.077,.074,.065,.046,.008],x=[0,.008,.019,.030,.047,.059,.064],yy=[1.519,1.5183,1.5187,1.519,1.518,1.518,1.518])
add('lip_upper_roll',1.520,.066,[.084,.086,.081,.075,.066,.047,.008],x=[0,.008,.019,.0305,.047,.060,.066],yy=[1.5194,1.519,1.519,1.5197,1.522,1.522,1.522])
add('lip_upper_body',1.524,.069,[.085,.090,.082,.075,.067,.048,.009],x=[0,.008,.019,.0318,.047,.062,.069],yy=[1.5225,1.524,1.5225,1.5205,1.524,1.524,1.524])
add('lip_upper_border',1.528,.072,[.081,.085,.079,.074,.068,.050,.009],x=[0,.008,.019,.0355,.048,.064,.072],yy=[1.525,1.528,1.525,1.5225,1.528,1.528,1.528])
add('philtrum',1.537,.077,[.080,.082,.079,.074,.071,.052,.009],x=[0,.005,.019,.032,.049,.068,.077])
add('nose_base',1.544,.080,[.086,.088,.085,.077,.074,.054,.009],x=[0,.0048,.0175,.028,.047,.068,.080],yy=[1.542,1.543,1.544,1.548,1.551,1.551,1.551])
add('nose_underside',1.549,.082,[.097,.096,.091,.077,.074,.055,.009],x=[0,.006,.017,.027,.047,.068,.082],yy=[1.547,1.5475,1.550,1.554,1.556,1.556,1.556])
add('nose_tip',1.555,.084,[.102,.100,.085,.075,.075,.056,.009],x=[0,.007,.018,.030,.048,.069,.084],yy=[1.554,1.554,1.557,1.565,1.571,1.572,1.572])
add('mid_nose',1.578,.085,[.088,.084,.074,.072,.074,.058,.011],x=[0,.006,.019,.032,.048,.070,.085],yy=[1.577,1.577,1.581,1.583,1.583,1.581,1.581])
add('orbital_lower',1.591,.085,[.080,.078,.071,.071,.072,.061,.013],x=[0,.007,.019,.031,.048,.069,.085],yy=[1.591,1.591,1.594,1.587,1.587,1.596,1.594])
add('lower_lid_outer',1.595,.084,[.078,.076,.066,.074,.074,.057,.014],x=[0,.008,.020,.031,.047,.068,.084],yy=[1.595,1.595,1.598,1.5915,1.591,1.603,1.599])
add('lower_lid_margin',1.599,.083,[.077,.075,.066,.071,.071,.056,.015],x=[0,.008,.019,.031,.047,.068,.083],yy=[1.598,1.598,1.601,1.595,1.5945,1.603,1.602])
add('upper_lid_margin',1.603,.083,[.077,.075,.066,.0718,.071,.056,.016],x=[0,.008,.019,.031,.047,.068,.083],yy=[1.603,1.603,1.601,1.6045,1.605,1.603,1.606])
add('upper_lid_outer',1.612,.082,[.078,.077,.072,.075,.075,.059,.017],x=[0,.008,.0195,.031,.047,.070,.082],yy=[1.612,1.612,1.606,1.612,1.613,1.610,1.612])
add('brow_arch',1.621,.081,[.078,.077,.077,.079,.079,.062,.018],x=[0,.008,.019,.032,.048,.069,.081],yy=[1.619,1.619,1.616,1.618,1.617,1.615,1.620])
add('forehead',1.649,.078,[.077,.077,.076,.074,.067,.050,.012])
add('upper_forehead',1.678,.060,[.064,.063,.061,.055,.044,.028,.003])
add('crown',1.706,.025,[.025,.024,.022,.018,.011,.003,-.006])
# Complete the half-skull behind the editable face loops.
def profile(points,t):
 for a,b in zip(points,points[1:]):
  if t<=b[0]:
   u=max(0,min(1,(t-a[0])/(b[0]-a[0])));return a[1]+(b[1]-a[1])*u
 return points[-1][1]
for name,ids in rows:
 p=verts[ids[-1]];y=p[1];width=p[0]
 back_width=max(width,.038 if y<1.515 else width)
 rz=profile([(1.472,.040),(1.504,.058),(1.540,.080),(1.610,.095),(1.650,.088),(1.678,.056),(1.706,.025)],y)
 for a in [math.radians(112),math.radians(148),math.pi]:
  lift=max(0,1.535-y)*.45*((a-math.pi/2)/(math.pi/2))
  ids.append(V((back_width*math.sin(a),y+lift,-.012+rz*math.cos(a))))
name_to_i={name:i for i,(name,_) in enumerate(rows)}
# Actual loop openings, with no skin plate behind eyes or mouth.
for r in range(len(rows)-1):
 name,a=rows[r];_,b=rows[r+1]
 for c in range(9):
  if name_to_i['lip_lower_border']<=r<name_to_i['lip_upper_border'] and c>=3:continue
  if name=='mouth_lower' and c<3:continue
  if name_to_i['lower_lid_outer']<=r<name_to_i['upper_lid_outer'] and 2<=c<5:continue
  quad=[a[c],a[c+1],b[c+1],b[c]]
  if name=='nose_base' and c==1:
   centre=sum((Vector(verts[k]) for k in quad),Vector())/4
   ring=[V(centre+(Vector(verts[k])-centre)*.58) for k in quad]
   for k in range(4):F([quad[k],quad[(k+1)%4],ring[(k+1)%4],ring[k]])
   inner=[V(Vector(verts[k])+Vector((0,.007,-.008))) for k in ring]
   for k in range(4):F([ring[k],ring[(k+1)%4],inner[(k+1)%4],inner[k]],'mouth');creases.add(tuple(sorted((ring[k],ring[(k+1)%4]))))
   F(inner,'mouth');continue
  lip=(name.startswith('lip_') and name!='lip_upper_border') or name=='mouth_upper'
  F(quad,'lip' if lip and c<3 else 'skin')
# The local mouth ring terminates in three cheek patches. The skull has only
# one broad span here, rather than inheriting every lip row around its back.
lower=rows[name_to_i['lip_lower_border']][1];upper=rows[name_to_i['lip_upper_border']][1]
arc=list(dict.fromkeys(rows[r][1][3] for r in range(name_to_i['lip_lower_border'],name_to_i['lip_upper_border']+1)))
a,b=lower[4],upper[4];q=V((.050,1.519,.066))
F([arc[0],a,q,arc[2],arc[1]])
F([arc[2],q,arc[4],arc[3]])
F([arc[4],q,b,arc[6],arc[5]])
F([a,lower[5],upper[5],b,q])
for c in range(5,9):F([lower[c],lower[c+1],upper[c+1],upper[c]])
# Inset mouth surfaces share the opening's real boundary vertices.
lo=rows[name_to_i['mouth_lower']][1];hi=rows[name_to_i['mouth_upper']][1]
for line in [lo,hi]:
 inner=[V(Vector(verts[k])+Vector((0,0,-.008))) for k in line[:4]]
 for c in range(3):F([line[c],line[c+1],inner[c+1],inner[c]],'mouth')
# An editable, closed orbital ring replaces the old three-edge slit. The outer
# boundary is the face cage itself. Three successive rings turn skin around
# the globe, give the free lid edge thickness, and return into the socket.
eye_cx,eye_cy,eye_cz,eye_rx,eye_ry,eye_rz=.0421762,1.6015,.0506114,.025402,.026,.025402
def globe_z(x,y):
 q=((x-eye_cx)/eye_rx)**2+((y-eye_cy)/eye_ry)**2
 return eye_cz+eye_rz*math.sqrt(max(.001,1-q))
ids=lambda n:rows[name_to_i[n]][1]
outer=ids('lower_lid_outer')[2:6]+[ids('lower_lid_margin')[5]]+list(reversed(ids('upper_lid_outer')[2:6]))+[ids('lower_lid_margin')[2]]
samples=[(.07,-1),(.30,-1),(.65,-1),(.95,-1),(1,0),(.95,1),(.65,1),(.30,1),(.07,1),(0,0)]
aperture=[]
for u,side in samples:
 x=.021+u*.045;arc=math.sin(math.pi*u)**.85;y=eye_cy+(u-.5)*.003+( .0051 if side>0 else -.0071 if side<0 else 0)*arc
 aperture.append(Vector((x,y,globe_z(x,y))))
last=outer
for stage in ['fold','edge','return']:
 ring=[]
 for k,((u,side),p) in enumerate(zip(samples,aperture)):
  taper=math.sin(math.pi*u)**.65
  if stage=='fold':
   co=Vector(verts[outer[k]]).lerp(p,.60);co.z=max(co.z,globe_z(co.x,co.y)+.0018*taper)
  elif stage=='edge':co=p+Vector((0,side*.00045*taper,.00165*taper+.0004))
  else:co=p+Vector((0,-side*.00015*taper,-.00035))
  ring.append(V(co))
 for k in range(len(ring)):F([last[k],last[(k+1)%len(ring)],ring[(k+1)%len(ring)],ring[k]])
 last=ring
# A separate posterior cervical loop sits inside the jaw underside. The chin
# stays a chin; its entire outer contour is not squeezed into a neck funnel.
angles=[math.radians(v) for v in [0,10,22,36,52,68,86,112,148,180]]
last=rows[0][1]
ring=[V((.034*math.sin(a),1.477+.022*(1-math.cos(a))*.5,-.018+.031*math.cos(a))) for a in angles]
for c in range(9):F([last[c],ring[c],ring[c+1],last[c+1]])
last=ring
for y,rx,rz,cz in [(1.441,.035,.033,-.014),(1.407,.036,.033,-.006),(1.368,.039,.035,-.006)]:
 ring=[V((rx*math.sin(a),y,cz+rz*math.cos(a))) for a in angles]
 for c in range(9):F([last[c],ring[c],ring[c+1],last[c+1]])
 last=ring
cap=V((0,1.714,-.010));top=rows[-1][1]
for c in range(9):F([top[c],top[c+1],cap])
mesh=bpy.data.meshes.new('Adult facial edge-loop cage');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Original adult control cage',mesh);bpy.context.collection.objects.link(obj)
for name in ['skin','lip','mouth']:mesh.materials.append(MATS[name])
for p,tag in zip(mesh.polygons,tags):p.material_index=['skin','lip','mouth'].index(tag);p.use_smooth=True
crease_coords={tuple(sorted((tuple(round(v,7) for v in verts[a]),tuple(round(v,7) for v in verts[b])))) for a,b in creases}
bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
attr=mesh.attributes.new('crease_edge','FLOAT','EDGE')
for e in mesh.edges:
 if tuple(sorted(tuple(round(v,7) for v in mesh.vertices[i].co) for i in e.vertices)) in crease_coords:attr.data[e.index].value=.40
mirror=obj.modifiers.new('Editable bilateral anatomy','MIRROR');mirror.use_clip=True;mirror.use_mirror_merge=True;mirror.merge_threshold=.00001
sub=obj.modifiers.new('Anatomical surface subdivision','SUBSURF');sub.subdivision_type='CATMULL_CLARK';sub.levels=2;sub.render_levels=2
# The full globe and the rim cage use the same ellipsoid. No independently
# fitted white sheet or iris plane is placed in front of it.
# Closed eye globes with iris/pupil face rings; no floating image discs.
for sign in [-1,1]:
 pv=[];pf=[];pm=[];theta=[0,.045,.115,.22,.32,.42,.48,.65,.85,1.08,1.35,1.7,2.05,2.40,2.75,math.pi]
 nu=40
 for t in theta:
  for i in range(nu):
   a=i/nu*2*math.pi;pv.append((sign*eye_cx+eye_rx*math.sin(t)*math.cos(a),eye_cy+eye_ry*math.sin(t)*math.sin(a),eye_cz+eye_rz*math.cos(t)))
 for j in range(len(theta)-1):
  for i in range(nu):pf.append((j*nu+i,j*nu+(i+1)%nu,(j+1)*nu+(i+1)%nu,(j+1)*nu+i));pm.append(2 if theta[j+1]<=.115 else 1 if theta[j+1]<=.42 else 0)
 em=bpy.data.meshes.new('One continuous eye globe');em.from_pydata(pv,[],pf);em.update();eo=bpy.data.objects.new('Eye '+str(sign),em);bpy.context.collection.objects.link(eo)
 for n in ['sclera','iris','pupil']:em.materials.append(MATS[n])
 for p,mi in zip(em.polygons,pm):p.material_index=mi;p.use_smooth=True
 bm=bmesh.new();bm.from_mesh(em);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(em);bm.free()
 # A small, simple ear cage remains independently editable.
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=(sign*.085,1.578,-.004));ear=bpy.context.object;ear.name='Ear '+str(sign);ear.scale=(.013,.026,.010);ear.rotation_euler[1]=sign*.25;ear.data.materials.append(MATS['skin'])
 for p in ear.data.polygons:p.use_smooth=True
 # Tapered brow volume follows the brow arch, not a flat mask.
 cu=bpy.data.curves.new('Brow curve','CURVE');cu.dimensions='3D';cu.resolution_u=8;cu.bevel_depth=.0023;cu.bevel_resolution=2
 sp=cu.splines.new('BEZIER');sp.bezier_points.add(3)
 for p,co,r in zip(sp.bezier_points,[(.019,1.616,.078),(.032,1.619,.081),(.048,1.618,.081),(.068,1.613,.064)],[.65,1,.85,.08]):p.co=(sign*co[0],co[1],co[2]);p.handle_left_type='AUTO';p.handle_right_type='AUTO';p.radius=r
 bo=bpy.data.objects.new('Brow '+str(sign),cu);bpy.context.collection.objects.link(bo);cu.materials.append(MATS['brow'])
# Keep the real source cage and modifier stack in the research asset.
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets'/'adult-control-cage.blend'))
# Mesh asset export is the render input, not a source backup or a report bundle.
deps=bpy.context.evaluated_depsgraph_get();parts=[]
for o in bpy.context.scene.objects:
 if o.type not in {'MESH','CURVE'}:continue
 ev=o.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles();buckets={}
 for tri in me.loop_triangles:
  mat=me.materials[tri.material_index].name if len(me.materials) else 'skin';b=buckets.setdefault(mat,{'name':o.name,'material':mat,'position':[],'normal':[],'index':[]});lookup=b.setdefault('_lookup',{})
  for vi in tri.vertices:
   if vi not in lookup:
    v=me.vertices[vi];p=o.matrix_world@v.co;n=(o.matrix_world.to_3x3().inverted().transposed()@v.normal).normalized();lookup[vi]=len(b['position'])//3;b['position']+=list(p);b['normal']+=list(n)
   b['index'].append(lookup[vi])
 for b in buckets.values():b.pop('_lookup');parts.append(b)
 ev.to_mesh_clear()
(ROOT/'assets'/'adult-subdivided.json').write_text(json.dumps({'cageVertices':len(mesh.vertices),'cageFaces':len(mesh.polygons),'subdivision':2,'parts':parts},separators=(',',':')))
print(json.dumps({'cage_vertices':len(mesh.vertices),'cage_faces':len(mesh.polygons),'render_triangles':sum(len(p['index'])//3 for p in parts)}))
