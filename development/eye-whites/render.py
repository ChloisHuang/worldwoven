# Actual source mesh CPU review. Approximate the source cel/hemisphere response;
# this is not a Three/WebGL capture, room-shadow test, or phone acceptance.
import bpy,json,sys,math
import numpy as np
from mathutils import Vector
root=sys.argv[sys.argv.index('--')+1];wanted=set(sys.argv[sys.argv.index('--')+2:]);data=json.load(open(root+'/scene.json'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def cv(v):return (v[0],-v[2],v[1])
def linear(hex):
 c=[((hex>>s)&255)/255 for s in (16,8,0)]
 return [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]
objects=[];materials=[]
for i,entry in enumerate(data['meshes']):
 a=np.fromfile(root+'/'+entry['file'],np.float32).reshape((-1,11));count=len(a);p=a[:,:3].copy();p[:,0]-=(entry['actor']-1.5)*.34;p[:,[1,2]]=p[:,[2,1]];p[:,1]*=-1;n=a[:,3:6].copy();n[:,[1,2]]=n[:,[2,1]];n[:,1]*=-1
 mesh=bpy.data.meshes.new('actual-'+str(i));mesh.vertices.add(count);mesh.vertices.foreach_set('co',p.ravel());mesh.loops.add(count);mesh.loops.foreach_set('vertex_index',np.arange(count,dtype=np.int32));mesh.polygons.add(count//3);mesh.polygons.foreach_set('loop_start',np.arange(0,count,3,dtype=np.int32));mesh.polygons.foreach_set('loop_total',np.full(count//3,3,dtype=np.int32));mesh.update();mesh.polygons.foreach_set('use_smooth',np.ones(count//3,dtype=np.bool_));mesh.normals_split_custom_set(n.tolist())
 def attr(name,values):
  cols=np.ones((count,4),np.float32);cols[:,:3]=values;dest=mesh.color_attributes.new(name=name,type='FLOAT_COLOR',domain='CORNER');dest.data.foreach_set('color',cols.ravel())
 attr('Albedo',a[:,6:9]);attr('Anatomy',np.repeat(a[:,9:10],3,axis=1));attr('Skin',np.repeat(a[:,10:11],3,axis=1))
 ob=bpy.data.objects.new(entry['name'],mesh);bpy.context.collection.objects.link(ob);ob.location.x=(entry['actor']-1.5)*.34;objects.append(ob)
 mat=bpy.data.materials.new('Offline source cel '+str(i));mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links
 def linkval(v,socket):
  if hasattr(v,'node'):links.new(v,socket)
  else:socket.default_value=v
 def mathnode(op,x,y=0):
  n=nodes.new('ShaderNodeMath');n.operation=op;linkval(x,n.inputs[0]);linkval(y,n.inputs[1]);return n.outputs[0]
 def color(name):n=nodes.new('ShaderNodeVertexColor');n.layer_name=name;return n.outputs['Color']
 def vm(op,x,y):
  n=nodes.new('ShaderNodeVectorMath');n.operation=op;linkval(x,n.inputs[0]);linkval(y,n.inputs[1]);return n.outputs['Value'] if op=='DOT_PRODUCT' else n.outputs['Vector']
 def mix(x,y,t):
  n=nodes.new('ShaderNodeMixRGB');n.blend_type='MIX';linkval(t,n.inputs[0]);linkval(x,n.inputs[1]);linkval(y,n.inputs[2]);return n.outputs[0]
 def scale(x,t):
  n=nodes.new('ShaderNodeVectorMath');n.operation='SCALE';linkval(x,n.inputs[0]);linkval(t,n.inputs[3]);return n.outputs[0]
 def smooth(x,lo,hi):
  t=mathnode('MINIMUM',1,mathnode('MAXIMUM',0,mathnode('DIVIDE',mathnode('SUBTRACT',x,lo),hi-lo)));return mathnode('MULTIPLY',mathnode('MULTIPLY',t,t),mathnode('SUBTRACT',3,mathnode('MULTIPLY',2,t)))
 def ramp(x,kind):
  if kind=='face':v=.12;steps=[(0,.1,.20),(.38,.13,.30),(.72,.16,.38)]
  elif kind=='hair':v=140/255;steps=[(-.5,.07,46/255),(0,.07,43/255),(.5,.07,26/255)]
  else:v=(140 if kind=='skin' else 90)/255;steps=[(-.5,.0001,(46 if kind=='skin' else 60)/255),(0,.0001,(43 if kind=='skin' else 63)/255),(.5,.0001,(26 if kind=='skin' else 42)/255)]
  for center,width,gain in steps:v=mathnode('ADD',v,mathnode('MULTIPLY',gain,smooth(x,center-width,center+width)))
  return v
 normal=nodes.new('ShaderNodeNewGeometry').outputs['Normal'];dn=vm('DOT_PRODUCT',normal,tuple(Vector(cv([-14,26,15])).normalized()))
 an=color('Anatomy');sk=color('Skin')
 cel=mix(ramp(dn,'cloth'),ramp(dn,'skin'),sk);feature=mix(ramp(dn,'face'),ramp(dn,'hair'),mathnode('LESS_THAN',an,0));cel=mix(cel,feature,mathnode('ABSOLUTE',an))
 sky=nodes.new('ShaderNodeRGB');ground=nodes.new('ShaderNodeRGB');sun=nodes.new('ShaderNodeRGB');lamp=nodes.new('ShaderNodeRGB');materials.append((sky,ground,sun,lamp))
 hemisphere=mix(ground.outputs[0],sky.outputs[0],mathnode('ADD',.5,mathnode('MULTIPLY',.5,vm('DOT_PRODUCT',normal,(0,0,1)))))
 light=vm('ADD',hemisphere,vm('MULTIPLY',cel,sun.outputs[0]));ld=vm('DOT_PRODUCT',normal,tuple(Vector(cv([-.6,.25,1])).normalized()));local=vm('MULTIPLY',ramp(ld,'face'),lamp.outputs[0]);light=vm('ADD',light,local)
 lit=scale(vm('MULTIPLY',color('Albedo'),light),1/math.pi);emit=nodes.new('ShaderNodeEmission');links.new(lit,emit.inputs['Color']);emit.inputs['Strength'].default_value=1;out=nodes.new('ShaderNodeOutputMaterial');links.new(emit.outputs[0],out.inputs[0]);mesh.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8;scene.cycles.use_denoising=False;scene.cycles.max_bounces=1;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
world=bpy.data.worlds.new('Offline neutral backdrop');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.23,.28,.27,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=1;scene.world=world
camera=bpy.data.cameras.new('Game FOV 50');co=bpy.data.objects.new('Camera',camera);bpy.context.collection.objects.link(co);scene.camera=co;camera.sensor_fit='VERTICAL';camera.sensor_height=24;camera.lens=24/(2*math.tan(math.radians(50)/2));camera.clip_start=.01
for lighting in ['day','warm-room']:
 for sky,ground,sun,lamp in materials:
  for node,hex,gain in [(sky,0xfff4d8,.65),(ground,0x6e8a7b,.65),(sun,0xffedcd,1.6 if lighting=='day' else .28),(lamp,0xffc27b,0 if lighting=='day' else 1.3)]:node.outputs[0].default_value=(*[v*gain for v in linear(hex)],1)
 for view,yaw in [('front',0),('threequarter',-.65),('game',-.35)]:
  name=lighting+'-'+view
  if wanted and name not in wanted:continue
  for ob in objects:ob.rotation_euler.z=yaw
  if view=='game':target=Vector(cv([0,1.05,0]));d=4.6;pos=target+Vector(cv([0,math.sin(.22)*d,math.cos(.22)*d]));scene.render.resolution_x=1280;scene.render.resolution_y=720;camera.type='PERSP'
  else:target=Vector(cv([0,1.60,0]));pos=target+Vector(cv([0,0,2]));scene.render.resolution_x=1440;scene.render.resolution_y=540;camera.type='ORTHO';camera.ortho_scale=1.38
  co.location=pos;co.rotation_euler=(target-pos).to_track_quat('-Z','Y').to_euler();scene.render.filepath=root+'/'+name+'.png';bpy.ops.render.render(write_still=True);print('SAVED',scene.render.filepath,flush=True)
