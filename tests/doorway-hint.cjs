// Tiny custom geometry + extracted production controller/DOM input, no authored lots.
// node --experimental-vm-modules tests/doorway-hint.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve('source'),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file});cache.set(file,m);return m;}
const linker=(s,f)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(f.identifier),s.split('?')[0]));
(async()=>{
 const m=mod(root+'/game/automatic-doors.js');await m.link(linker);await m.evaluate();const {createAutomaticDoors}=m.namespace,T=mod(root+'/vendor/three/build/three.module.js').namespace,{moveWithCollision}=mod(root+'/game/navigation.js').namespace;
 const runtime=mod(root+'/game/movement-runtime.js');await runtime.link(linker);await runtime.evaluate();
 const lot={group:new T.Group(),stations:[],colliders:[],bounds:{minX:-15,maxX:20,minZ:-15,maxZ:15},automaticDoorways:[
  {id:'hinge',center:[0,0,0],width:3.8,height:3,axis:'x',style:'french',motion:'hinge',swing:1},
  {id:'curtain',center:[12,0,0],width:3.8,height:3,axis:'x',style:'french',kind:'full-curtain',motion:'gather'}
 ]};
 let doors=createAutomaticDoors(lot);const reset=()=>{doors.dispose();doors=createAutomaticDoors(lot);return doors;};
 const player=new T.Vector3(0,0,-.8),npc=new T.Vector3(0,0,7),actor=p=>({position:p,radius:.34,height:1.95,speed:0}),step=()=>doors.update(1/60,[actor(npc),actor(player)]);
 for(let i=0;i<30;i++)step();assert(doors.isOpeningObstructedBy(player),'player truly blocks opening sweep');assert(!doors.isOpeningObstructedBy(npc),'clear NPC is not implicated');assert(!doors.isOpeningObstructedBy(player.clone()),'identity, not matching distance/coordinates');
 const heldFraction=doors.getState()[0].fraction;for(let i=0;i<20;i++){step();assert(doors.isOpeningObstructedBy(player));assert.equal(doors.getState()[0].fraction,heldFraction,'blocked door safely remains paused');}
 npc.copy(player);step();assert(doors.isOpeningObstructedBy(npc)&&doors.isOpeningObstructedBy(player),'all true blockers recorded, despite NPC-first order');
 player.set(0,0,7);step();assert(!doors.isOpeningObstructedBy(player),'provenance clears as soon as player leaves');assert(doors.isOpeningObstructedBy(npc),'NPC-only obstruction remains distinct');
 npc.set(0,4,-.8);step();assert(!doors.isOpeningObstructedBy(npc),'another floor never inherits blockage');
 for(let i=0;i<35;i++)step();assert.equal(doors.getState()[0].fraction,1,'unobstructed leaf opens');assert(!doors.isOpeningObstructedBy(player),'fully-open door has no opening obstruction');
 player.set(12,0,0);for(let i=0;i<10;i++){step();assert(!doors.isOpeningObstructedBy(player),'curtain does not show rigid-door advice');}
 doors.dispose();assert(!doors.isOpeningObstructedBy(npc),'dispose clears provenance');reset();
 // Actual updatePlayer, moveActor, automatic update, keyboard and touch callbacks.
 const source=fs.readFileSync(root+'/game/main.js','utf8');
 const slice=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i);assert(i>=0&&j>i);return source.slice(i,j);};
 const ids={},events={};class Element{constructor(){this.hidden=true;this.writes=0;this.listeners={};this.style={};this.open=false;}set hidden(v){this.writes=(this.writes||0)+1;this._hidden=v;}get hidden(){return this._hidden;}addEventListener(k,f){this.listeners[k]=f;}setAttribute(){}setPointerCapture(){}getBoundingClientRect(){return{left:0,top:0,width:108,height:108};}}
 const $=id=>ids[id]??=(new Element());
 const subject={root:new T.Group(),locomotion:{walkSpeed:0,hurrySpeed:0},animate(){}};subject.root.position.set(0,0,-.8);
 const context=vm.createContext({console,$,player:subject,lot,automaticDoors:doors,npcs:[],keys:new Set(),joy:{x:0,y:0},mode:'lot',outfitPreview:{state:()=>({open:false})},performing:null,pendingInteraction:null,seated:null,path:[],targetStation:null,arrivalViewUntil:0,yaw:0,walkTime:0,multiLevel:true,roofShown:false,nearest:null,navOptions:{bounds:lot.bounds,multilevel:false},furniture:{items:[]},characterPoseContext:()=>({}),groundHeight:()=>0,cancelAction:()=>true,moveWithCollision,doorCameraVersion:-1,cameraSolids:[],staticCameraSolids:[],paused:false,clock:{getDelta:()=>0},document:{hidden:false,addEventListener:(k,f)=>events[k]=f},addEventListener:(k,f)=>events[k]=f,...runtime.namespace});
 vm.runInContext(slice('function showDoorwayHint(', 'function toast(')+slice('function updateAutomaticDoors(', '\nfunction lotBounds(')+slice('function updatePlayer(', '\nfunction updateNPCs(')+slice("\naddEventListener('keydown'", "\n$('travel').onclick"),context);
 const frame=()=>{vm.runInContext('updateAutomaticDoors(1/60);updatePlayer(1/60,0)',context);};
 const key=code=>events.keydown({code,repeat:false,preventDefault(){}}),release=code=>events.keyup({code});
 const hint=$('doorway-hint');for(let i=0;i<30;i++)frame();assert(doors.isOpeningObstructedBy(subject.root.position));assert(hint.hidden,'blocked but released: no hint');
 key('KeyS');frame();assert(!hint.hidden,'held keyboard shows actual player obstruction');const writes=hint.writes,before=subject.root.position.clone();for(let i=0;i<20;i++)frame();assert.equal(hint.writes,writes,'steady hold never flashes or rewrites visibility');assert(subject.root.position.equals(before),'hint never moves player automatically');release('KeyS');frame();assert(hint.hidden,'keyboard release clears on next frame');
 const joy=$('joystick');joy.listeners.pointerdown({pointerId:0,clientX:54,clientY:55});frame();assert(hint.hidden,'joystick deadzone does not display advice');joy.listeners.pointerup({pointerId:0});joy.listeners.pointerdown({pointerId:1,clientX:54,clientY:80});frame();assert(!hint.hidden,'joystick hold shows hint');joy.listeners.pointerup({pointerId:1});frame();assert(hint.hidden,'joystick release clears');
 joy.listeners.pointerdown({pointerId:2,clientX:54,clientY:80});frame();assert(!hint.hidden);joy.listeners.pointercancel({pointerId:2});frame();assert(hint.hidden,'touch cancellation clears');
 key('KeyS');frame();assert(!hint.hidden);events.blur();assert(hint.hidden,'blur clears immediately even without animation');key('KeyS');frame();assert(!hint.hidden);context.document.hidden=true;events.visibilitychange();assert(hint.hidden,'backgrounding clears immediately');context.document.hidden=false;events.visibilitychange();
 key('KeyS');frame();assert(!hint.hidden);subject.root.position.set(0,0,7);frame();assert(hint.hidden,'leaving obstruction while input held clears');
 // No false blame while an NPC, but not the player, occupies the sweep.
 const resident={root:new T.Group()};resident.root.position.set(0,0,-.8);context.npcs=[resident];frame();assert(hint.hidden,'NPC-only blocker does not display player advice');
 subject.root.position.set(12,0,0);frame();assert(hint.hidden,'curtain never displays advice under held input');
 context.mode='globe';vm.runInContext('showDoorwayHint(true)',context);assert(hint.hidden,'leaving lot hides hint');
 const html=fs.readFileSync(root+'/game/index.html','utf8'),css=fs.readFileSync(root+'/game/game.css','utf8');assert(/id="doorway-hint"[^>]*role="status"[^>]*hidden>退后一步，让门打开/.test(html));assert(css.includes('.doorway-hint{')&&css.includes('safe-area-inset-bottom'));assert(source.includes('function disposeLot(){showDoorwayHint();'));
 doors.dispose();console.log(JSON.stringify({status:'PASS',scope:'Two custom closures, production Three geometry and safety comparison; extracted production controller and real keyboard/touch callbacks in simulated DOM. No authored-lot, browser, or WebGL acceptance.',blockedFraction:heldFraction,checks:['real player sweep obstruction','stable object identity','NPC-only negative','multiple blockers','different floor','curtain negative','fully open','dispose','key hold and release','joystick hold/release/cancel','no repeated visibility writes','no automatic movement','blur/background clear','leave while held','lot exit','safe-area CSS']},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
