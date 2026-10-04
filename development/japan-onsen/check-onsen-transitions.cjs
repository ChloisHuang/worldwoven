// B03b, one production Japan bath. The real main module, E/touch handlers and
// RAF run at 30 Hz. DOM is simulated; optional frames use production Three/Mesa.
// Neighbor fixtures start already seated, reusing prior shared-pool/contact QA.
// QA_IMAGES_ONLY=1 reuses prior cancellation evidence and skips those loops.
// Run only inside the owner's bounded resource window. No browser/iOS claim.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..'),SOURCE=path.resolve(process.env.SOURCE_ROOT||path.join(ROOT,'source'));
const HOST_ARRAY_TYPES=Object.fromEntries(['ArrayBuffer','SharedArrayBuffer','DataView','Float32Array','Float64Array','Int8Array','Int16Array','Int32Array','Uint8Array','Uint8ClampedArray','Uint16Array','Uint32Array'].map(name=>[name,globalThis[name]]));
const OUT=process.env.OUT_DIR?path.resolve(process.env.OUT_DIR):null;
const REPORT=path.resolve(process.env.REPORT_PATH||path.join(OUT||path.join(ROOT,'qa/onsen-transitions'),'report.json'));
const evidence={status:'RUNNING',scope:'One real main.js Japan enter/soak/exit, E-repeat and entry cancellation, neighboring occupied seats. DOM/RAF fixture; optional production Three/Mesa images, not browser or iOS gameplay.',frameRate:30,frames:[],trace:[],cases:[],sourceHashes:{}};
function replaceOnce(text,from,to){assert(text.includes(from),'Fixture source marker missing: '+from.slice(0,100));return text.replace(from,to);}
const bridge=String.raw`
export function onsenReview(){return {player,npcs,lot,furniture,seated,bathTransition,scene,camera,camTarget,renderer,feetPulse,japanService};}
export function onsenFixture(){
 saved.appearance.player.bodyPreset='masculine-broad';saved.appearance.player.hairStyle='braided-tail';saved.appearance.player.shapeTraits.legLength=1.06;buildPlayer();save();
 const pool=furniture.items.find(i=>i.id==='japan-furniture-bath-1');
 const looks=[0,1].map(i=>({...npcRoleAppearance('japan',i?'jp-onsen':'jp-balcony',saved.appearance.seed,saved.appearance.npcShapeVersion),wardrobePreset:'onsen-swimwear'}));
 japanService.__qaSeedBathNeighbors(pool.id,looks);return pool;
}
export function onsenPlaceDry(position){player.root.position.set(...position);player.root.rotation.y=-Math.PI/2;path=[];targetStation=null;pendingInteraction=null;keys.clear();joy={x:0,y:0};}
export function onsenCamera(angle=-Math.PI/2+.7){yaw=angle;pitch=.22;distance=4.6;updateCamera(1,true);}
`;
function transformModule(file,body){
 if(file.includes('/game/'))evidence.sourceHashes[path.relative(SOURCE,file)]=crypto.createHash('sha256').update(body).digest('hex');
 if(file.endsWith('/game/main.js'))body+=bridge;
 if(file.endsWith('/game/japan-bathhouse-operations.js'))body=replaceOnce(body,'  owns:n=>actors.has(n.station.id),',String.raw`
  // Test-only checkpoint: two stationary bathers retain genuine reservations,
  // actual service mount animation and the production player's safety boxes.
  __qaSeedBathNeighbors(poolId,looks){
   const pool=furniture.items.find(p=>p.id===poolId);
   for(const [i,appearance]of looks.entries()){
    const id='qa-onsen-neighbor-'+i,seat=furniture.resolveBath(pool,id,s=>s.id===pool.seats[i].id);
    if(!seat)throw Error('Fixture neighbor seat unavailable');
    const n=createVisitor({id,number:101+i,name:i?'QA neighbor B':'QA neighbor A',appearance,position:seat.position.slice()});
    actors.set(id,n);furniture.occupyBath(seat,id);n.serviceMount=seat;n.root.position.set(...seat.anchor);n.root.rotation.y=seat.yaw;
    assign(n,seat.position,{duration:3600,action:'bathe',mount:seat,arrived:true,label:'QA occupied neighboring bath seat'});animate(n,time);
   }
  },
  __qaStartBathGuest(poolId){
   const pool=furniture.items.find(p=>p.id===poolId),n=[...guests.values()][0];if(!n)throw Error('Expected an actual generated visitor');
   clear(n);furniture.releaseActor(n.station.id);const seat=furniture.resolveBath(pool,n.station.id);if(!seat)throw Error('Expected empty third bath seat');
   changeWardrobe(n,{...board.getVisit(n.station.id).appearance,wardrobePreset:'onsen-swimwear'});n.root.position.set(...seat.position);n.root.rotation.y=seat.yaw;
   assign(n,seat.position,{duration:3600,action:'bathe',mount:seat,label:'QA actual visitor bath entry'});return n.station.id;
  },
  owns:n=>actors.has(n.station.id),`);
 return body;
}
let harness=fs.readFileSync(path.join(ROOT,'tests/fixtures/hotfix-input-harness.cjs'),'utf8');
harness=replaceOnce(harness,"const root=path.resolve('source')","const root=SOURCE");
harness=replaceOnce(harness,"body:new E('body'),hidden:false","head:new E('head'),body:new E('body'),hidden:false");
harness=replaceOnce(harness,'vm.createContext({console,','vm.createContext({console,...HOST_ARRAY_TYPES,');
harness=replaceOnce(harness,'innerWidth:844,innerHeight:390,devicePixelRatio:2','innerWidth:960,innerHeight:720,devicePixelRatio:1');
harness=replaceOnce(harness,"new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(transformModule(file,fs.readFileSync(file,'utf8')),");
const begin=harness.indexOf('const report=[];for(let round=0;');assert(begin>0);
harness=harness.slice(0,begin)+String.raw`
const T=three.namespace,review=()=>main.namespace.onsenReview(),copy=x=>JSON.parse(JSON.stringify(x));
const key=(code,repeat=false)=>events.keydown({code,repeat,preventDefault(){}});
const keyUp=code=>events.keyup?.({code});
let rendered,renderCanvas,shaderErrors=[],lastPosition=null,frameIndex=0,tag='setup';
function poolState(){return review().furniture.facilities.state().find(p=>p.id===pool.id);}
function row(){const s=state(),r=review(),p=r.player.root.position.toArray();return {frame:frameIndex,time:+(now/1000).toFixed(5),scenario:tag,player:p,camera:s.camera,target:s.cameraTarget,yaw:s.playerYaw,visible:s.playerVisible,transition:copy(s.bathTransition??null),seated:s.seated,seatedSeat:s.seatedSeat,action:s.playerPose?.action,wardrobe:s.playerLook.wardrobePreset,halo:r.player.halo.visible,reservations:copy(poolState().reservations)};}
function next(n=1){for(let i=0;i<n;i++){now+=1000/30;raf();frameIndex++;const r=row();if(lastPosition&&r.transition){const step=Math.hypot(...r.player.map((v,j)=>v-lastPosition[j]));r.playerStep=step;assert(step<.18,'Active transition root must not teleport: '+JSON.stringify(r));}lastPosition=r.player;evidence.trace.push(r);assert(r.player.every(Number.isFinite)&&r.camera.every(Number.isFinite),'Finite world and camera path');assert(r.visible,'Player remains visible from normal TPS camera');assertNeighborSeats();}}
function until(predicate,max=360){for(let i=0;i<max;i++){if(predicate())return i;next();}throw Error('Transition did not finish within '+(max/30)+' seconds: '+JSON.stringify(row()));}
function assertNeighborSeats(){for(const expected of neighborReservations){const actual=poolState().reservations.find(r=>r.actor===expected.actor);assert(actual&&actual.seatId===expected.seatId&&actual.status==='occupied','Player transition must preserve neighboring occupied seat');}assert(poolState().reservations.filter(r=>r.actor==='player').length<=1,'At most one player reservation');}
function hairSignature(){const hash=require('node:crypto').createHash('sha256');review().player.root.traverse(m=>{if(!m.isSkinnedMesh)return;for(const r of m.geometry.userData.sourceRanges||[])if(/^hair-(braid|low-bun|bun-sweep)/.test(r.name)){hash.update(r.name);hash.update(Buffer.from(m.geometry.attributes.position.array.slice(r.start*3,(r.start+r.count)*3).buffer));}});return hash.digest('hex');}
function skinBounds(root){const b=new T.Box3();root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isSkinnedMesh)return;o.computeBoundingBox();b.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));});return b;}
function checkSeatedSeparation(){const a=skinBounds(review().player.root);for(const n of review().npcs.filter(n=>n.station.id.startsWith('qa-onsen-neighbor-'))){const b=skinBounds(n.root);assert(a.max.z<b.min.z||b.max.z<a.min.z,'Settled player does not overlap neighboring actual skinned bather');}}
function normal(stage){assert.equal(state().bathTransition,null,stage+' transition completed');assert.equal(state().seated,null,stage+' no mounted seat');assert.equal(poolState().reservations.filter(r=>r.actor==='player').length,0,stage+' releases only own seat');assert.equal(state().playerLook.wardrobePreset,originalLook.wardrobePreset,stage+' saved outfit restored');assert.equal(hairSignature(),originalHair,stage+' original braid geometry restored');assert.equal(JSON.stringify(JSON.parse(storage['worlds-days-v1']).appearance),savedAppearance,stage+' appearance save unchanged');assert.equal(review().player.halo.visible,true);assert.equal(review().feetPulse,null);assertNeighborSeats();}
function capture(name){if(process.env.QA_CAPTURE_NAMES&&!process.env.QA_CAPTURE_NAMES.split(',').includes(name))return;const r=row();r.name=name;r.pose=copy(state().playerPose);r.poolLabelHidden=ids['furniture-labels'].children.find(e=>e.dataset.furnitureId===pool.id)?.hidden;if(r.transition)assert.equal(r.poolLabelHidden,true,'Pool label hidden while crossing');if(OUT){if(!rendered){renderCanvas=WEBGL.createCanvas(960,720);rendered=new T.WebGLRenderer({canvas:renderCanvas,antialias:true,alpha:false});rendered.setSize(960,720,false);rendered.outputColorSpace=T.SRGBColorSpace;rendered.toneMapping=T.NoToneMapping;Object.assign(rendered.shadowMap,review().renderer.shadowMap);rendered.debug.onShaderError=(gl,p,v,f)=>shaderErrors.push({program:gl.getProgramInfoLog(p),vertex:gl.getShaderInfoLog(v),fragment:gl.getShaderInfoLog(f)});const gl=rendered.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');evidence.renderer={three:T.REVISION,display:WEBGL.getDisplayInfo(),renderer:gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL),version:gl.getParameter(gl.VERSION)};assert(/Mesa|llvmpipe|softpipe/i.test(JSON.stringify(evidence.renderer)));}review().scene.updateMatrixWorld(true);rendered.render(review().scene,review().camera);const gl=rendered.getContext();gl.finish();assert.equal(gl.getError(),0,'Mesa capture');assert.equal(shaderErrors.length,0,'Shader compilation');r.file=path.join(OUT,name+'.png');fs.writeFileSync(r.file,renderCanvas.toBuffer('image/png'));r.drawCalls=rendered.info.render.calls;r.triangles=rendered.info.render.triangles;}evidence.frames.push(r);console.log(JSON.stringify({capture:name,transition:r.transition,player:r.player,camera:r.camera,file:r.file}));}
function clickPool(){const b=ids['furniture-list'].children.find(b=>b.dataset.furnitureId===pool.id);assert(b,'Actual furniture button');b.onclick();}
function enter(){clickPool();until(()=>!!state().bathTransition,90);assert.equal(state().bathTransition.direction,'enter');assert.equal(state().bathTransition.seatId,pool.seats[2].id);}
all.find(e=>e.dataset.region==='japan').onclick();ids.travel.onclick();assert.equal(state().region,'japan','Real main entered Japan');
const pool=main.namespace.onsenFixture();
const neighborReservations=copy(poolState().reservations.filter(r=>r.actor.startsWith('qa-onsen-neighbor-')));assert.equal(neighborReservations.length,2);
const dry=pool.seats[2].position.slice();main.namespace.onsenPlaceDry(dry);main.namespace.onsenCamera();
const originalLook=copy(state().playerLook),originalHair=hairSignature(),savedAppearance=JSON.stringify(JSON.parse(storage['worlds-days-v1']).appearance);
try {
 if(process.env.QA_NPC_ONLY!=='1'){
 tag='enter-soak-exit';next(2);capture('01-before-entry');enter();const entryStart=frameIndex;
 // Held-key repeats are browser-generated input, and must never toggle the action.
 key('KeyE',true);assert.equal(state().bathTransition.direction,'enter');
 for(const [p,name]of [[.53,'02-entry-legs-over-rim'],[.78,'03-entry-over-seat']]){until(()=>!state().bathTransition||state().bathTransition.progress>=p);assert(state().bathTransition,'Entry remains animated until the final frame');capture(name);}
 until(()=>!state().bathTransition);assert.equal(state().seated,pool.id);assert.equal(state().seatedSeat,pool.seats[2].id);assert(frameIndex-entryStart>=45,'Entry visibly animated for at least 1.5 seconds');next(30);checkSeatedSeparation();capture('04-seated');assert.equal(review().player.halo.visible,false);assert.equal(state().playerLook.wardrobePreset,'onsen-swimwear');
 const entryFrames=frameIndex-entryStart-30;ids['touch-action'].onclick();assert.equal(state().bathTransition.direction,'exit');const exitStart=frameIndex;
 key('KeyE',true);assert.equal(state().bathTransition.direction,'exit');key('KeyE');assert.equal(state().bathTransition.direction,'exit','Repeated E cannot reenter midway through exit');
 for(const [p,name]of [[.53,'05-exit-legs-over-rim']]){until(()=>!state().bathTransition||state().bathTransition.progress<=p);assert(state().bathTransition);capture(name);}
 until(()=>!state().bathTransition);assert(frameIndex-exitStart>=45,'Exit visibly animated for at least 1.5 seconds');next(2);normal('Completed exit');capture('06-after-exit');evidence.cases.push({name:'actual main enter, soak, touch exit, E repeats and neighboring occupied seats',entryFrames,exitFrames:frameIndex-exitStart-2,status:'PASS'});
 for(const code of (process.env.QA_NPC_REVIEW==='1'?[]:process.env.QA_IMAGES_ONLY==='1'?['KeyW']:['KeyE','Escape','KeyW'])){tag='cancel-entry-'+code;main.namespace.onsenPlaceDry(dry);main.namespace.onsenCamera();lastPosition=null;next();enter();until(()=>state().bathTransition.progress>=.32);key(code);if(code==='KeyW')next();keyUp(code);assert(state().bathTransition||state().seated===null,'Cancellation remains a safe exit');until(()=>!state().bathTransition,360);normal(code+' cancels entry');next(15);normal(code+' does not remount later');evidence.cases.push({name:code+' cancels active entry and returns safely',status:'PASS'});}
 }
 if(process.env.QA_NPC_REVIEW==='1')evidence.reusedEvidence='qa/onsen-transitions-logic/report.json and qa/onsen-transitions-mesa-final/report.json: passed E/Escape/W cancellation, entry/exit, neighboring reservations, restored appearance and six previous views';
 else if(process.env.QA_IMAGES_ONLY==='1')evidence.reusedEvidence='qa/onsen-transitions-logic/report.json: E/Escape cancellation, repeated E, appearance and reservation restoration';
 tag='npc-enter-cancel';main.namespace.onsenPlaceDry(review().lot.spawn);main.namespace.onsenCamera();lastPosition=null;
 next();const npcId=review().japanService.__qaStartBathGuest(pool.id),npcState=()=>state().japanService.actors.find(n=>n.id===npcId);evidence.npcTrace=[];
 function npcUntil(test,max=360){for(let i=0;i<max;i++){if(test())return;next();evidence.npcTrace.push({frame:frameIndex,...copy(npcState())});}throw Error('NPC transition stalled: '+JSON.stringify(npcState()));}
 npcUntil(()=>!!npcState().bathTransition);assert.equal(npcState().bathTransition.direction,'enter');npcUntil(()=>npcState().bathTransition.progress>=.35);
 const npcCancelFrame=frameIndex;review().japanService.cancelVisit(npcId,'qa-cancel-entry');assert.equal(npcState().bathTransition.direction,'exit');
 npcUntil(()=>!npcState().bathTransition);assert.equal(npcState().mounted,null);assert.equal(state().japanService.visits.find(v=>v.id===npcId).stage,'cancelled');assert(!poolState().reservations.some(r=>r.actor===npcId));next(15);assert.equal(npcState().bathTransition,null,'Single cancellation cannot restart the stale bath task');assertNeighborSeats();
 evidence.cases.push({name:'Actual generated NPC entry reverses on one cancelVisit and clears stale task at bank',npcId,cancelFrames:frameIndex-npcCancelFrame-15,status:'PASS'});
 evidence.maxTransitionPlayerStep=Math.max(0,...evidence.trace.map(r=>r.playerStep||0));evidence.shaderErrors=shaderErrors;evidence.status='PASS';
 ids['return-world'].onclick();assert.equal(state().bathTransition,null);assert.equal(state().characterResources.activeReferences,0,'Real main disposal releases all actors');
} finally {rendered?.dispose();renderCanvas?.dispose();evidence.maxRSSMiB=process.resourceUsage().maxRSS/1024;fs.writeFileSync(REPORT,JSON.stringify(evidence,null,2)+'\n');}
console.log(JSON.stringify({status:evidence.status,cases:evidence.cases,frames:evidence.frames.map(f=>f.file||f.name),maxTransitionPlayerStep:evidence.maxTransitionPlayerStep,maxRSSMiB:evidence.maxRSSMiB,report:REPORT}));
})().catch(e=>{evidence.status='FAIL';evidence.error=e.stack||String(e);fs.writeFileSync(REPORT,JSON.stringify(evidence,null,2)+'\n');console.error(e);process.exitCode=1;});
`;
const script=new vm.Script(harness,{filename:path.join(ROOT,'tests/onsen-transition-fixture.cjs')});
if(process.env.QA_COMPILE_ONLY==='1'){console.log('PASS: onsen transition harness compiles; scene not executed');}
else (async()=>{
 assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner','Obtain the scene resource window before execution');
 fs.mkdirSync(path.dirname(REPORT),{recursive:true});if(OUT)fs.mkdirSync(OUT,{recursive:true});
 let WEBGL=null;if(OUT){WEBGL=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');WEBGL.installDOM({fetch:false});WEBGL.init({api:'gles'});}
 await script.runInNewContext({require,console,process,Buffer,__dirname:path.join(ROOT,'tests'),__filename,SOURCE,OUT,REPORT,evidence,transformModule,WEBGL,HOST_ARRAY_TYPES});
})().catch(e=>{evidence.status='FAIL';evidence.error=e.stack||String(e);console.error(e);process.exitCode=1;});
