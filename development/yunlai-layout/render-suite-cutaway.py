# Inspection-only cutaway of actual exported production meshes. No geometry is
# repositioned or invented: hide other floors and clip the ceiling for overview.
import bpy,bmesh,sys,math
from mathutils import Vector
root=sys.argv[sys.argv.index('--')+1]
for obj in list(bpy.data.objects):
 if obj.type!='MESH':continue
 bm=bmesh.new();bm.from_mesh(obj.data)
 # Bisect real triangles at the inspection bounds. Deleting whole triangles
 # would wrongly remove halves of large, merged floor meshes.
 for co,no in [((15.8,0,0),(-1,0,0)),((21.18,0,0),(1,0,0)),((0,-8.65,0),(0,1,0)),((0,-21.25,0),(0,-1,0)),((0,0,3.79),(0,0,-1)),((0,0,7.25),(0,0,1))]:
  bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=co,plane_no=no,clear_outer=True,clear_inner=False,dist=.00001)
 bm.to_mesh(obj.data);bm.free()
scene=bpy.context.scene;co=scene.camera;cam=co.data
cv=lambda v:Vector((v[0],-v[2],v[1]))
co.location=cv([18.5,19,15]);co.rotation_euler=(0,0,0);cam.type='ORTHO';cam.ortho_scale=14.8;cam.clip_start=.1
scene.render.resolution_x=800;scene.render.resolution_y=1120;scene.cycles.samples=24;scene.render.filepath=root+'/inn-suite-cutaway.png';bpy.ops.render.render(write_still=True)
