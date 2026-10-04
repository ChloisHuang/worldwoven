// One actual-main France chain. Simulated DOM; optional Mesa renders the same
// scene/camera. No createCharacter replacement, actor placement or world matrix.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){
 if(!harness.includes(before)||harness.indexOf(before)!==harness.lastIndexOf(before))throw Error('Fixture seam changed: '+before);
 harness=harness.replace(before,after);
}
replaceOnce("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
replaceOnce('addEventListener:(k,f)=>events[k]=f','addEventListener:(k,f)=>{const prior=events[k];events[k]=prior?(...args)=>{prior(...args);f(...args);}:f}');
const globals='Float32Array,Float64Array,Uint8Array,Uint8ClampedArray,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,DataView,atob,btoa,TextEncoder,TextDecoder,URL,URLSearchParams,';
replaceOnce('vm.createContext({console,','vm.createContext({'+globals+'console,');
const additions=`
export function actorPreviewReview(){return {saved,outfitDraft,player,lot,scene,camera,sun,lighting,furniture,npcs,keys};}
export function actorPreviewStep(dt){elapsed+=dt;flushShapePreview();updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);lotAnimationTime+=dt;lot.update?.(dt,lotAnimationTime);furniture?.update(dt);updateCamera(dt);}
export function actorPreviewView(a){yaw=a;pitch=.22;distance=4.6;updateCamera(1,true);}
export {configureStableShadows};
`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(additions)+":''),");
// Evaluate the explicit development installer in exactly the module cache that
// will load main. Imported registry/character modules therefore retain identity.
const install=String.raw`
const selection=mod(path.resolve('development/actor-model-preview/selection.mjs'));
await selection.link(linker);await selection.evaluate();
const previewInstallation=selection.namespace.installActorPreview({femaleHair:'long-layered',hairFlow:true});
const appearance=mod(path.join(root,'game/appearance.js'));
if(appearance.status==='unlinked')await appearance.link(linker);
if(appearance.status==='linked')await appearance.evaluate();
const fixtureAppearance=appearance.namespace.createAppearanceState(41);
Object.assign(fixtureAppearance.player,{bodyPreset:'feminine-slender',variant:2,hairStyle:'chin-bob',wardrobeIndex:0,gaitPreset:1,skin:0xdba789,hair:0x44342f,eyeColor:0x594b3f});
assert(appearance.namespace.validAppearanceState(fixtureAppearance),'genuine supported saved identity');
storage['worlds-days-v1']=JSON.stringify({visited:[],stamps:{},outfit:0,appearance:fixtureAppearance,playerProfile:{ageYears:28}});
`;
replaceOnce("const main=mod(path.join(root,'game/main.js'));",install+"const main=mod(path.join(root,'game/main.js'));");
replaceOnce("'legacy save migrated before gameplay'","'valid saved appearance loaded before gameplay'");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
if(begin<0||end<begin)throw Error('Fixture scenario boundary changed');
const body=String.raw`
const out=path.resolve(process.env.OUT_DIR||'qa/actor-preview/main-playable');
assert(!fs.existsSync(out),'Use a fresh OUT_DIR to preserve existing evidence');fs.mkdirSync(out,{recursive:true});
const report={status:'RUNNING',scope:'One France actual-main walk/chair/stand/head-look chain, real character/geometry/controllers and simulated DOM; optional Mesa uses that same main scene and camera. No browser or phone claim.',checks:[],frames:[],errors:[],route:{samples:[],steps:0}};
const write=()=>fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2)+'\n');
const record=(label,evidence)=>{report.checks.push({label,...(evidence?{evidence}: {})});write();console.log(label);};
const review=()=>main.namespace.actorPreviewReview(),serial=x=>JSON.stringify(x),T=three.namespace;
const key=code=>events.keydown({code,repeat:false,preventDefault(){}}),release=code=>events.keyup({code});
let actual=null,canvas=null;
try{
 all.find(e=>e.dataset.region==='france').onclick();ids.travel.onclick();tick(2);
 assert.equal(state().region,'france');assert.equal(state().playerLook.hairStyle,'chin-bob');
 assert(state().playerModel.applied,'development selection reaches actual buildPlayer');
 assert.equal(state().playerModel.previewHair,'long-layered');assert(state().playerModel.garmentRefinement);
 const original=serial(review().saved.appearance),npcLooks=serial(state().npcLooks),originalLook=serial(state().playerLook);
 const identity=look=>Object.fromEntries(Object.entries(look).filter(([key])=>key!=='shapeTraits'));
 const originalIdentity=serial(identity(review().saved.appearance.player));
 const assertNoPreviewSave=()=>assert(!/modelPreview|previewHair|previewHairFlow|headLook/.test(storage['worlds-days-v1']),'development choices never enter the save');
 assertNoPreviewSave();record('Supported saved chin-bob identity displays the runtime long-haired gown',{model:state().playerModel,appearance:state().playerLook});
 const ranges=mod(path.join(root,'game/character-traits.js')).namespace.SHAPE_RANGES;
 const sliders=()=>all.filter(e=>e.dataset.shapeTrait),slider=key=>sliders().find(e=>e.dataset.shapeTrait===key);
 const headPositions=()=>{
  let result=null;review().player.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;
   const range=mesh.geometry.userData.sourceRanges.find(r=>r.name==='continuous-head-anatomical-head-neck');
   if(range)result=Array.from(mesh.geometry.attributes.position.array.slice(range.start*3,(range.start+range.count)*3));
  });assert(result&&result.length>100,'candidate anatomical head geometry exists');return result;
 };
 const delta=(a,b)=>{assert.equal(a.length,b.length);let maximum=0;for(let i=0;i<a.length;i++)maximum=Math.max(maximum,Math.abs(a[i]-b[i]));return maximum;};
 ids['appearance-button'].onclick();assert(state().wardrobePreview.open);assert.equal(sliders().length,10);
 for(const [name,range]of Object.entries(ranges)){
  const input=slider(name);assert(input&&input.type==='range',name+' is a real range control');
  assert.equal(Number(input.min),range.min);assert.equal(Number(input.max),range.max);assert(input.getAttribute('aria-label'));
  input.value=String(review().outfitDraft.player.shapeTraits[name]);input.oninput();input.onchange();
 }
 const baseline=headPositions(),edit=slider('chinLength');edit.value=String(ranges.chinLength.max);edit.oninput();edit.onchange();tick(1);
 assert.equal(state().playerLook.shapeTraits.chinLength,ranges.chinLength.max);assert(state().playerModel.applied);
 const changed=headPositions(),firstDelta=delta(baseline,changed);assert(firstDelta>.0005,'new chin trait changes actual merged head vertices');
 assert.equal(serial(review().saved.appearance),original,'draft edit leaves saved appearance unchanged');
 ids['outfit-cancel'].onclick();tick(1);
 assert.equal(serial(review().saved.appearance),original);assert.equal(serial(state().playerLook),originalLook);assert(delta(baseline,headPositions())<1e-7);
 record('All ten sliders execute their real handlers; chin-length geometry changes and cancel restores the exact identity',{controls:sliders().map(x=>x.dataset.shapeTrait),chinLengthMaximum:ranges.chinLength.max,maxVertexDelta:firstDelta});
 ids['appearance-button'].onclick();edit.value=String(ranges.chinLength.max);edit.oninput();
 ids['outfit-confirm'].onclick();tick(1);
 assert.equal(review().saved.appearance.player.shapeTraits.chinLength,ranges.chinLength.max);
 assert.equal(serial(identity(review().saved.appearance.player)),originalIdentity);
 assert.equal(serial(JSON.parse(storage['worlds-days-v1']).appearance),serial(review().saved.appearance));
 assert.equal(state().playerLook.hairStyle,'chin-bob');assert.equal(state().playerModel.previewHair,'long-layered');
 assert.equal(serial(state().npcLooks),npcLooks);assertNoPreviewSave();
 record('Confirm saves only the intended shape edit and preserves genuine hair, other identity and all resident appearances');
 const advance=(count=1)=>{for(let i=0;i<count;i++){now+=50;main.namespace.actorPreviewStep(.05);}};
 const walkStart=review().player.root.position.clone();key('KeyW');advance(12);release('KeyW');advance(1);
 const walkDistance=review().player.root.position.distanceTo(walkStart);assert(walkDistance>.1,'actual main keyboard movement advances player');
 record('Keyboard walking advances the actual player',{from:walkStart.toArray(),to:review().player.root.position.toArray(),distance:walkDistance});
 const chair=review().furniture.items.find(item=>item.id==='france-furniture-seat');assert(chair,'existing France armchair');
 const chairButton=ids['furniture-list'].children.find(button=>button.dataset.furnitureId===chair.id);assert(chairButton);
 chairButton.onclick();assert.equal(state().pendingInteraction,chair.id);assert(state().pathLength>0,'real approach route is planned');
 let closestApproach=Infinity,maximumWalkingStep=0;
 while(state().seated!==chair.id&&report.route.steps<1800){
  const before=review().player.root.position.clone();advance();const after=review().player.root.position;
  if(state().seated!==chair.id){maximumWalkingStep=Math.max(maximumWalkingStep,before.distanceTo(after));assert(before.distanceTo(after)<.3,'route remains continuous before the normal seat transfer');}
  closestApproach=Math.min(closestApproach,Math.hypot(after.x-chair.position[0],after.z-chair.position[2]));
  if(report.route.steps%25===0)report.route.samples.push(after.toArray());report.route.steps++;
  if(!state().seated&&!state().pendingInteraction&&!state().pathLength)throw Error('Chair approach ended without seating: '+serial(state().player));
 }
 assert.equal(state().seated,chair.id,'existing approach reaches and mounts chair');advance(8);
 assert.equal(state().playerPose.action,'chair-sit');assert.equal(state().mountedKind,'seat');
 assert(review().player.root.position.distanceTo(new T.Vector3(...chair.anchor))<1e-6);
 report.route.chair={id:chair.id,position:chair.position,anchor:chair.anchor};report.route.maximumWalkingStep=maximumWalkingStep;report.route.closestPreMountApproach=closestApproach;
 record('Main route walks from spawn to the existing chair and mounts through shared furniture handlers',{steps:report.route.steps,pose:state().playerPose});
 if(process.env.ACTOR_PREVIEW_MESA==='1'){
  const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');
  W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(960,640);
  actual=new T.WebGLRenderer({canvas,antialias:true,alpha:false});actual.setSize(960,640,false);actual.outputColorSpace=T.SRGBColorSpace;actual.toneMapping=T.NoToneMapping;
  main.namespace.configureStableShadows(actual,review().sun);review().camera.aspect=960/640;review().camera.updateProjectionMatrix();
  actual.debug.onShaderError=(g,p,v,f)=>report.errors.push({program:g.getProgramInfoLog(p),vertex:g.getShaderInfoLog(v),fragment:g.getShaderInfoLog(f)});
  report.display=W.getDisplayInfo();
 }
 const capture=name=>{
  if(!actual)return;main.namespace.actorPreviewView(chair.yaw+.50);const r=review();r.scene.updateMatrixWorld(true);r.lighting.update(r.player.root.position);
  r.player.root.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.skeleton.update();});actual.render(r.scene,r.camera);actual.getContext().finish();
  assert.equal(actual.getContext().getError(),0);assert.equal(report.errors.length,0);assert(r.player.root.visible,'actual camera retains player visibility');
  fs.writeFileSync(path.join(out,name+'.png'),canvas.toBuffer('image/png'));
  report.frames.push({name,player:r.player.root.position.toArray(),camera:r.camera.position.toArray(),cameraTarget:state().cameraTarget,fov:r.camera.fov,pose:state().playerPose,model:state().playerModel,drawCalls:actual.info.render.calls,triangles:actual.info.render.triangles});write();
 };
 capture('01-main-chair-seated');
 key('KeyE');release('KeyE');advance(2);assert.equal(state().seated,null);assert.equal(state().mountedKind,null);assert.notEqual(state().playerPose.action,'chair-sit');
 const standPosition=review().player.root.position.clone();record('E stands through the shared safe-exit handler',{position:standPosition.toArray(),pose:state().playerPose});
 const headBefore=review().player.root.userData.head.quaternion.clone();
 selection.namespace.setCharacterPreviewHeadLook({yaw:.38,pitch:.04,weight:1});advance(25);
 assert(state().playerPose.headLook.weight>.99);assert(Math.abs(state().playerPose.headLook.yaw-.38)<.012);
 assert(headBefore.angleTo(review().player.root.userData.head.quaternion)>.15,'actual head joint follows the main pose context');
 assert(review().player.root.position.distanceTo(standPosition)<1e-7,'head attention does not move the player');
 capture('02-main-standing-head-turn');
 record('Development head-look enters actual main pose context and turns the existing head joint',{headLook:state().playerPose.headLook});
 selection.namespace.setCharacterPreviewHeadLook(null);advance(25);assert(state().playerPose.headLook.weight<.01,'head attention releases smoothly');
 assertNoPreviewSave();assert.equal(serial(identity(review().saved.appearance.player)),originalIdentity);assert.equal(serial(state().npcLooks),npcLooks);
 ids['return-world'].onclick();assert.equal(state().mode,'globe');assert.equal(state().characterResources.activeReferences,0);
 record('Leaving releases every actor and no runtime preview choice enters durable appearance');
 report.status='PASS';report.visualReview=actual?'PENDING':'NOT_RENDERED';report.maxRSSMiB=process.resourceUsage().maxRSS/1024;write();
 console.log(JSON.stringify({status:report.status,out,checks:report.checks.length,frames:report.frames.map(f=>f.name),maxRSSMiB:report.maxRSSMiB,visualReview:report.visualReview}));
}catch(error){report.status='FAIL';report.failure=error.stack||String(error);write();throw error;}
finally{actual?.dispose();canvas?.dispose();previewInstallation.dispose();if(state().mode==='lot')ids['return-world'].onclick();}
`;
harness=harness.slice(0,begin)+body+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:path.join(__dirname,'actor-preview-main-inherited.cjs'),importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({
 Float32Array,Float64Array,Uint8Array,Uint8ClampedArray,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,DataView,atob,btoa,TextEncoder,TextDecoder,URL,URLSearchParams,
 require,console,process,Buffer,__dirname,__filename
});
