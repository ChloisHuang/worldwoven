# Actual exported game triangles and vertex colors. Offline diffuse review only;
# the production Three cel shader remains unchanged and is not emulated here.
import bpy, json, sys, math
import numpy as np
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
root=args[0]; names=set(args[1:]); data=json.load(open(root+'/scene.json'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Axis conversion: Three Y-up to Blender Z-up, preserving right handedness.
def cv(v): return (v[0],-v[2],v[1])
for idx,entry in enumerate(data['meshes']):
 a=np.fromfile(root+'/'+entry['file'],dtype=np.float32).reshape((-1,9)); count=len(a)
 p=a[:,:3].copy();p[:,[1,2]]=p[:,[2,1]];p[:,1]*=-1
 n=a[:,3:6].copy();n[:,[1,2]]=n[:,[2,1]];n[:,1]*=-1
 mesh=bpy.data.meshes.new('actual-'+str(idx));mesh.vertices.add(count);mesh.vertices.foreach_set('co',p.ravel());mesh.loops.add(count);mesh.loops.foreach_set('vertex_index',np.arange(count,dtype=np.int32));mesh.polygons.add(count//3);mesh.polygons.foreach_set('loop_start',np.arange(0,count,3,dtype=np.int32));mesh.polygons.foreach_set('loop_total',np.full(count//3,3,dtype=np.int32));mesh.update()
 mesh.polygons.foreach_set('use_smooth',np.ones(count//3,dtype=np.bool_));mesh.normals_split_custom_set(n.tolist())
 colors=np.ones((count,4),dtype=np.float32);colors[:,:3]=a[:,6:9]
 attr=mesh.color_attributes.new(name='ActualColor',type='FLOAT_COLOR',domain='CORNER');attr.data.foreach_set('color',colors.ravel())
 ob=bpy.data.objects.new(entry['name'] or ('actual-'+str(idx)),mesh);bpy.context.collection.objects.link(ob)
 m=entry['material'];mat=bpy.data.materials.new('ActualMaterial-'+str(idx));mat.use_nodes=True;mat.diffuse_color=(*m['color'],m['opacity']);nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links
 out=nodes.new('ShaderNodeOutputMaterial');col=nodes.new('ShaderNodeVertexColor');col.layer_name='ActualColor';bs=nodes.new('ShaderNodeBsdfPrincipled');links.new(col.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=1;bs.inputs['Specular IOR Level'].default_value=0
 # Unshadowed hemisphere contribution approximates production ambient light;
 # actual source vertex colors and source emissive term remain unchanged.
 links.new(col.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=.34
 if m.get('emissiveIntensity',0)>0:
  mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='ADD';mix.inputs[0].default_value=1;links.new(col.outputs['Color'],mix.inputs[1]);mix.inputs[2].default_value=(*(np.array(m['emissive'])*m['emissiveIntensity']),1);links.new(mix.outputs[0],bs.inputs['Emission Color'])
 bs.inputs['Alpha'].default_value=m['opacity'];links.new(bs.outputs[0],out.inputs[0]);mesh.materials.append(mat)
 if idx%25==0: print('Imported',idx,flush=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.cycles.max_bounces=3;scene.cycles.diffuse_bounces=2;scene.cycles.transparent_max_bounces=4
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast' if False else 'None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
world=bpy.data.worlds.new('Daylight representative');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.39,.55,.52,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6;scene.world=world
sun=bpy.data.lights.new('Production-direction sun','SUN');sun.energy=1.25;sun.color=(1,.94,.85);sun.angle=math.radians(12);so=bpy.data.objects.new('Production-direction sun',sun);bpy.context.collection.objects.link(so);so.rotation_euler=Vector(cv([2,-3,-4])).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('Production 50 degree camera');co=bpy.data.objects.new('Review camera',cam);bpy.context.collection.objects.link(co);scene.camera=co;cam.type='PERSP';cam.sensor_fit='VERTICAL';cam.sensor_height=24;cam.lens=cam.sensor_height/(2*math.tan(math.radians(50)/2));cam.clip_end=150
# No scene duplication needed for this bounded character comparison.
for v in data['cameras']:
 if names and v['name'] not in names:continue
 scene.render.resolution_x=1120 if v['aspect']>1 else 900;scene.render.resolution_y=700 if v['aspect']>1 else 900;co.location=cv(v['camera']);co.rotation_euler=(Vector(cv(v['target']))-co.location).to_track_quat('-Z','Y').to_euler();cam.clip_start=v['near'];scene.render.filepath=root+'/'+v['name']+'.png';bpy.ops.render.render(write_still=True);print('SAVED',scene.render.filepath,flush=True)
