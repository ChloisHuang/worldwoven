// Saved call and single-owner lease regression: no full lot/renderer needed.
// Reproduces refresh replay and mounted-leisure overwrite failure modes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve('source'),context=vm.createContext({console}),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file,context});cache.set(file,m);return m;}
const linker=(s,f)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s.split('?')[0]));
(async()=>{
 const audience=mod(path.join(root,'game/china-palace-audience.js'));await audience.link(linker);await audience.evaluate();
 const {createAudienceSchedule}=audience.namespace,a=createAudienceSchedule();assert(a.due(10));assert(!a.due(10,true));assert(!a.due(22));a.call();assert(!a.due(10));
 const interrupted=createAudienceSchedule(a.snapshot());assert.equal(interrupted.snapshot().outcome,'interrupted');assert(!interrupted.due(10),'refresh at 10:00 must not replay an interrupted call');
 a.finish('completed');const done=createAudienceSchedule(a.snapshot());assert(!done.due(10));assert.equal(done.snapshot().outcome,'completed');done.observe(22);done.observe(10);assert(!done.due(10),'backward clock at refresh is not a new day');done.observe(23.99);done.observe(.01);assert(!done.due(.01));assert(done.due(6));assert.equal(done.snapshot().day,1);assert.equal(done.snapshot().completionId,'cn-morning-audience:0','completion receipt remains stable on the next day');
 const life=mod(path.join(root,'game/china-palace-life.js'));await life.link(linker);await life.evaluate();
 const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace,brain=cache.get(path.join(root,'game/npc-life-decisions.js')).namespace;
 const actors=[...life.namespace.CHINA_PALACE_ROLES,{id:'cn-tea',npcPosition:[3,.8,-28]}].map(station=>{const root=new T.Group(),head=new T.Group();root.add(head);root.userData.head=head;root.position.set(...station.npcPosition);return {station,root,home:root.position.clone(),route:[],phase:0,locomotion:{walkSpeed:1.4},walking:false,animate(){this.animations=(this.animations||0)+1;}};});
 const emperor=actors[0],chair={id:'china-furniture-seat',kind:'seat',position:emperor.home.toArray(),anchor:emperor.home.toArray(),yaw:0,seatY:8.5},throne={id:'china-furniture-throne',kind:'seat',position:[0,1.415,-6],anchor:[0,2.049,-8],yaw:0,seatY:2.69};
 let blockedExit=true,releases=0;const furniture={items:[chair,throne,{id:'china-furniture-bed-2',kind:'bed',position:actors[1].home.toArray(),anchor:actors[1].home.toArray()}],canSit:()=>true,canUse:()=>true,standPoint:()=>blockedExit?null:emperor.home.clone(),releaseActor:()=>releases++};
 const saved=brain.createLifeDecisions({worldSeed:42,actorIds:actors.map(n=>n.station.id)}).snapshot();saved.people['cn-emperor'].current={id:'rest',duration:30,startedAt:0};const fatigue=saved.people['cn-emperor'].needs.fatigue;
 const palace=life.namespace.createChinaPalaceLife({npcs:actors,lot:{colliders:[],walkableSurfaces:[],bounds:{}},furniture,doors:{cameraColliders:[],routeStep:()=>({waiting:true})},planPath:(_,p)=>[p],moveActor(){},poseContext:()=>({visualFloorOffset:0}),worldSeed:42,saved});
 palace.update(.1,.1);assert.equal(palace.state().actors[0].mounted,chair.id);assert(palace.requestDuty('test-court'));assert(!palace.requestDuty('other-owner'));assert.equal(palace.state().decisions.people['cn-emperor'].current,null,'unfulfilled choice is saved even while the stand exit is blocked');
 palace.update(.1,.2);assert.equal(palace.state().actors[0].mounted,chair.id,'blocked stand keeps mount intact');assert.equal(palace.dutyState('test-court').active,false);assert.equal(emperor.animations,2,'one controller animates emperor once per frame');
 blockedExit=false;palace.update(.1,.3);assert.equal(palace.state().actors[0].mounted,null);assert.equal(palace.dutyState('test-court').active,true);assert.equal(palace.dutyState('test-court').stage,'duty-public-stairs');assert(emperor.root.position.distanceTo(emperor.home)<.01,'duty starts at actual safe stand point');
 const decision=palace.state().decisions.people['cn-emperor'];assert.equal(decision.current,null);assert.equal(decision.last,'rest');assert(decision.needs.fatigue>=fatigue,'interrupted rest grants no recovery');assert(decision.cooldowns.rest>=65,'interrupted rest retains cooldown');assert.equal(releases,1);palace.dispose();
 console.log('PASS: saved morning window/refresh/midnight and blocked mounted duty handoff, one owner, unfulfilled needs/cooldown');
})().catch(e=>{console.error(e);process.exitCode=1;});
