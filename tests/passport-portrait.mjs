// Targeted regression: an offscreen identity photo must never reparent the
// live rig, dispose its shared resources, or leak temporary renderer state.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const T=await import('three');
const {createCharacter}=await import('../source/game/characters.js');
const {createPassportPortrait}=await import('../source/game/passport-portrait.js');

function rendererFixture(){
  const viewport=new T.Vector4(7,9,301,199),scissor=new T.Vector4(11,13,81,93),clearColor=new T.Color(0x123456);
  let target={name:'game-target'},face=3,mip=2,scissorTest=true,clearAlpha=.4;
  return {
    autoClear:false,autoClearColor:false,autoClearDepth:true,autoClearStencil:false,
    outputColorSpace:T.LinearSRGBColorSpace,toneMapping:T.ACESFilmicToneMapping,toneMappingExposure:1.7,
    shadowMap:{enabled:true,autoUpdate:true,needsUpdate:true},xr:{enabled:true},renders:0,
    getRenderTarget:()=>target,getActiveCubeFace:()=>face,getActiveMipmapLevel:()=>mip,
    getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>scissorTest,
    getClearColor:v=>v.copy(clearColor),getClearAlpha:()=>clearAlpha,
    setRenderTarget(t,f=0,m=0){target=t;face=f;mip=m;},setViewport:v=>viewport.copy(v),setScissor:v=>scissor.copy(v),setScissorTest:v=>{scissorTest=v;},
    setClearColor(c,a){clearColor.set(c);clearAlpha=a;},
    render(scene,camera){this.renders++;this.inspect?.(scene,camera);},
    readRenderTargetPixels(target,x,y,w,h,pixels){pixels.fill(31);pixels[0]=57;pixels[(h-1)*w*4]=193;}
  };
}
function state(renderer){return {
  target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new T.Vector4()).toArray(),
  scissor:renderer.getScissor(new T.Vector4()).toArray(),scissorTest:renderer.getScissorTest(),clear:renderer.getClearColor(new T.Color()).getHex(),alpha:renderer.getClearAlpha(),
  autoClear:renderer.autoClear,autoClearColor:renderer.autoClearColor,autoClearDepth:renderer.autoClearDepth,autoClearStencil:renderer.autoClearStencil,
  output:renderer.outputColorSpace,tone:renderer.toneMapping,exposure:renderer.toneMappingExposure,shadow:{...renderer.shadowMap},xr:renderer.xr.enabled
};}
function documentFixture(){
  const fixture={canvases:0,image:null};
  fixture.createElement=tag=>{
    assert.equal(tag,'canvas');fixture.canvases++;let w,h;
    return {set width(value){w=value;},set height(value){h=value;},getContext(kind){assert.equal(kind,'2d');return {
      createImageData(width,height){assert.equal(width,w);assert.equal(height,h);return {width,height,data:new Uint8ClampedArray(width*height*4)};},
      putImageData(image){fixture.image=image;}
    };},toDataURL(kind){assert.equal(kind,'image/png');return 'data:image/png;base64,cGhvdG8=';}};
  };
  return fixture;
}
const actor=createCharacter({culture:'china',bodyPreset:'feminine-balanced',hairStyle:'shoulder-wave',wardrobePreset:'ruqun-long-skirt'}),parent=new T.Group();
parent.position.set(9,3,-4);parent.rotation.set(0,.7,0);parent.scale.set(1.3,1.1,.9);parent.add(actor.root);
actor.root.position.set(6,2,8);actor.root.rotation.y=1.1;actor.animate(.8,false,'tea');parent.updateMatrixWorld(true);
const originals=[],resources=new Set(),liveSkeletons=new Set();
actor.root.traverse(node=>{
  originals.push({node,parent:node.parent,position:node.position.toArray(),quaternion:node.quaternion.toArray(),scale:node.scale.toArray(),matrix:node.matrix.toArray(),world:node.matrixWorld.toArray()});
  if(node.geometry)resources.add(node.geometry);
  if(node.material)for(const material of Array.isArray(node.material)?node.material:[node.material])resources.add(material);
  if(node.skeleton)liveSkeletons.add(node.skeleton);
});
let liveDisposals=0;for(const resource of resources)resource.addEventListener('dispose',()=>liveDisposals++);
for(const skeleton of liveSkeletons){skeleton.computeBoneTexture();skeleton.boneTexture.addEventListener('dispose',()=>liveDisposals++);}
const renderer=rendererFixture(),doc=documentFixture();let player=actor,clonedTextureDisposals=0,targetDisposals=0,lastTarget;
const portrait=createPassportPortrait({renderer,getPlayer:()=>player,document:doc}),before=state(renderer);
renderer.inspect=(scene,camera)=>{
  assert.equal(renderer.xr.enabled,false);assert.equal(renderer.shadowMap.enabled,false);assert.equal(renderer.toneMapping,T.NoToneMapping);
  const target=renderer.getRenderTarget();assert(target.isWebGLRenderTarget);assert.equal(target.width,288);assert.equal(target.height,384);
  if(target!==lastTarget){lastTarget=target;target.addEventListener('dispose',()=>targetDisposals++);}
  const clone=scene.getObjectByName(actor.root.name);assert(clone);assert.notEqual(clone,actor.root);assert.equal(clone.children.length,actor.root.children.length);
  assert.deepEqual(clone.matrixWorld.toArray(),actor.root.matrixWorld.toArray());assert(camera.isOrthographicCamera);
  const clonedMeshes=[];clone.traverse(node=>{if(node.isSkinnedMesh)clonedMeshes.push(node);});
  assert.equal(clonedMeshes.length,2);assert.equal(clonedMeshes[0].skeleton,clonedMeshes[1].skeleton,'same rig stays shared inside the copied display tree');
  for(const mesh of clonedMeshes){
    const original=actor.root.getObjectByName(mesh.name);assert.equal(mesh.geometry,original.geometry);assert.equal(mesh.material,original.material);assert.notEqual(mesh.skeleton,original.skeleton);
    for(let i=0;i<mesh.skeleton.bones.length;i++){
      const bone=mesh.skeleton.bones[i];assert.notEqual(bone,original.skeleton.bones[i]);assert.equal(bone,clone.getObjectByName(original.skeleton.bones[i].name));
      assert.deepEqual(bone.matrixWorld.toArray(),original.skeleton.bones[i].matrixWorld.toArray());
    }
    for(const index of [0,Math.floor(mesh.geometry.attributes.position.count/2),mesh.geometry.attributes.position.count-1]){
      const copiedPoint=mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld),livePoint=original.getVertexPosition(index,new T.Vector3()).applyMatrix4(original.matrixWorld);
      assert(copiedPoint.distanceTo(livePoint)<1e-8,'deformed vertices retain the actual pose');
    }
  }
  const skeleton=clonedMeshes[0].skeleton;skeleton.computeBoneTexture();skeleton.boneTexture.addEventListener('dispose',()=>clonedTextureDisposals++);
};
assert.match(portrait.capture(),/^data:image\/png;base64,/);assert.deepEqual(state(renderer),before);assert.equal(liveDisposals,0);assert.equal(clonedTextureDisposals,1);
assert.equal(doc.image.data[0],193);assert.equal(doc.image.data[(doc.image.height-1)*doc.image.width*4],57,'WebGL readback is vertically flipped for canvas');
assert.equal(renderer.renders,1);portrait.capture();assert.equal(renderer.renders,1,'opening the unchanged identity reuses the photo');assert.equal(doc.canvases,1);
actor.root.userData.appearance.clothes=0x654321;portrait.capture();assert.equal(renderer.renders,2,'outfit/appearance changes invalidate the photo');
actor.root.userData.characterModel.requested='changed-model';portrait.capture();assert.equal(renderer.renders,3,'model changes invalidate the photo');
const originalInspect=renderer.inspect;renderer.inspect=(...args)=>{originalInspect(...args);throw new Error('context lost during capture');};
actor.root.userData.appearance.hair=0x111111;assert.equal(portrait.capture(),null,'capture failure never invents a replacement face');assert.deepEqual(state(renderer),before);
assert.equal(clonedTextureDisposals,4);assert.equal(liveDisposals,0);
renderer.inspect=originalInspect;assert(portrait.capture(),'failed capture can retry');assert.equal(renderer.renders,5);
for(const row of originals){const node=row.node;assert.equal(node.parent,row.parent);assert.deepEqual(node.position.toArray(),row.position);assert.deepEqual(node.quaternion.toArray(),row.quaternion);assert.deepEqual(node.scale.toArray(),row.scale);assert.deepEqual(node.matrix.toArray(),row.matrix);assert.deepEqual(node.matrixWorld.toArray(),row.world);}
const replacement=createCharacter({culture:'china',bodyPreset:'feminine-balanced',hairStyle:'shoulder-wave',wardrobePreset:'ruqun-long-skirt'});
renderer.inspect=scene=>assert.notEqual(scene.getObjectByName(replacement.root.name),actor.root);
player=replacement;assert(portrait.capture());assert.equal(renderer.renders,6,'a new player root cannot reuse an old player photo');assert.deepEqual(state(renderer),before);
player=null;assert.equal(portrait.capture(),null,'no actor cannot return a stale or invented identity');
portrait.dispose();portrait.dispose();assert.equal(targetDisposals,1);assert.equal(liveDisposals,0);assert.equal(portrait.capture(),null);
assert.equal(createPassportPortrait({renderer,getPlayer:()=>actor,document:{createElement:()=>({getContext:()=>null})}}).capture(),null);
actor.root.removeFromParent();actor.dispose();replacement.dispose();
console.log('PASS passport portrait: actual posed rig, isolated bones, shared materials, lazy appearance cache, vertical PNG readback, failure restoration, owned-resource disposal and no fabricated fallback');

// Borrowed rigid role hats are head-bone children rather than skinned cloth.
// Their top must fit the lazy portrait and lending/returning invalidates it once.
const {attachJinyiCostume}=await import('../source/game/jinyi-costume.js');
for(const bodyPreset of ['feminine-slender','masculine-broad']){
 const dutyActor=createCharacter({culture:'china',bodyPreset,hairStyle:'swept-short',wardrobePreset:'jinyi-training'}),loan=attachJinyiCostume(dutyActor);
 dutyActor.animate(.7,false,'observe',{headLook:{yaw:.4,pitch:.12,weight:1}});dutyActor.root.updateMatrixWorld(true);
 const renderer=rendererFixture(),doc=documentFixture();let highest=-Infinity;
 renderer.inspect=(scene,camera)=>{camera.updateMatrixWorld(true);scene.getObjectByName('Original Ming folded black duty cap')?.traverseVisible(mesh=>{if(!mesh.isMesh)return;const p=new T.Vector3(),position=mesh.geometry.attributes.position;for(let i=0;i<position.count;i++){p.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).project(camera);highest=Math.max(highest,p.y);}});};
 const photo=createPassportPortrait({renderer,getPlayer:()=>dutyActor,document:doc});assert(photo.capture());assert(highest<1,'original folded cap must fit portrait: '+highest);photo.capture();assert.equal(renderer.renders,1);
 loan.dispose();assert(photo.capture());assert.equal(renderer.renders,2,'returning borrowed accessories invalidates photo once');photo.capture();assert.equal(renderer.renders,2);photo.dispose();dutyActor.dispose();
 console.log('PASS borrowed duty hat fits lazy portrait and return invalidates once',bodyPreset);
}
