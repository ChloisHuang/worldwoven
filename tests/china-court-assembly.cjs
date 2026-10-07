// State-machine regression for a moving start time / cloned unowned attendees.
// Coordinates are supplied by a unit double; physical routes belong to the
// one bounded scene test, not this logical test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve('source'),context=vm.createContext({console}),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file,context});cache.set(file,m);return m;}
const linker=(s,f)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s));
(async()=>{
 const module=mod(path.join(root,'game/china-palace-audience.js'));await module.link(linker);await module.evaluate();
 const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace;const facilityModule=mod(path.join(root,'game/npc-facilities.js'));await facilityModule.link(linker);await facilityModule.evaluate();
 function fixture({assembled=false,budget=120,saved={},positions=null}={}){
  const actors=[...module.namespace.CHINA_COURT_OFFICIALS,{id:'cn-emperor',npcPosition:[0,1.415,-8]}].map(station=>{const root=new T.Group(),head=new T.Group();root.userData.head=head;root.userData.hands=[new T.Group(),new T.Group()];root.add(head,...root.userData.hands);root.position.set(...station.npcPosition);return {station,root,home:root.position.clone(),phase:0,route:[],locomotion:{walkSpeed:1.5},animate(){}};});
  if(assembled)actors.slice(0,6).forEach((n,i)=>n.root.position.set(...module.namespace.chinaCourtAssemblyRoute(i).hall));
  if(positions)actors.forEach((n,i)=>n.root.position.set(...positions[i]));
  let duty=false,requests=0,service;const checkpoints=[];
  const palace={dutyPlan:()=>({reachable:true,seconds:budget}),requestDuty(){duty=true;requests++;},dutyState:()=>duty?{ready:true}:null,setDutyLine(){},releaseDuty(){duty=false;}};
  service=module.namespace.createChinaPalaceAudience({npcs:actors,palace,saved,lot:{colliders:[],walkableSurfaces:[{minX:-30,maxX:30,minZ:-40,maxZ:40,y:1.415}],bounds:{minX:-30,maxX:30,minZ:-40,maxZ:40}},furniture:assembled?{items:[],facilities:facilityModule.namespace.createFacilityQueue()}:null,doors:{cameraColliders:[],routeStep:()=>({waiting:true})},planPath:(_,p)=>[p],moveActor(){},poseContext:()=>({}),saveState(){if(service)checkpoints.push({...JSON.parse(JSON.stringify(service.snapshot())),actorPositions:actors.map(n=>n.root.position.toArray())});}});
  if(saved.continuity){duty=true;assert(service.restore(saved.continuity));}
  return {actors,service,checkpoints,requests:()=>requests,step(hour,move=true,dt=.1){if(move)for(const n of actors)if(n.route.length)n.root.position.copy(n.route.at(-1));service.update(dt,0,{hour});}};
 }
 const f=fixture();f.step(10);assert.equal(f.service.state().phase,'assembling');assert.equal(f.requests(),1);assert.equal(f.service.state().actors.length,6);
 assert.equal(f.checkpoints.at(-1).runtime.phase,'assembling','called receipt must save its matching runtime phase');
 const summonCheckpoint=f.checkpoints.at(-1);
 assert.equal(new Set(f.actors.slice(0,6).map(n=>n.station.id)).size,6);assert(f.actors.slice(2,6).every(n=>n.station.npcPosition[1]>3));
 for(let i=0;i<200&&f.service.state().phase!=='holding';i++)f.step(10.5);
 assert.equal(f.service.state().phase,'holding');assert(f.service.state().actors.every(n=>n.arrived));
 for(let i=0;i<20;i++)f.step(11.49);assert.equal(f.service.state().phase,'holding','being assembled cannot start the ceremony early');
 f.step(11.5);assert.equal(f.service.state().phase,'kneeling');assert.equal(f.service.state().schedule.courtStart,11.5);
 assert.equal(f.checkpoints.at(-1).runtime.phase,'kneeling','in-session receipt must not persist the previous holding phase');
 const startCheckpoint=f.checkpoints.at(-1);
 // An in-place work conversation does not obstruct/cancel the ongoing court.
 // Both a non-speaking attendee and the emperor freeze the same exact phase.
 for(const held of [f.actors[2],f.actors[6]]){const before=f.service.snapshot();for(let i=0;i<50;i++)f.service.update(.1,0,{hour:11.5,conversationActorId:held.station.id});const after=f.service.snapshot();assert.equal(after.runtime.phase,before.runtime.phase);assert.equal(after.runtime.phaseTime,before.runtime.phaseTime);assert.equal(after.runtime.disruption,before.runtime.disruption);assert.equal(after.schedule.outcome,'in-session');assert.equal(after.schedule.completionId,null);}
 f.step(11.5,false,.1);assert(f.service.state().phaseTime>0,'same ceremony resumes from held phase');
 for(let i=0;i<450&&f.service.state().schedule.outcome!=='completed';i++)f.step(11.6);
 assert.equal(f.service.state().schedule.completionId,'cn-morning-audience:0');assert.equal(f.service.state().currentReport.sourceEventId,null,'no fixture order means no invented real receipt');assert.equal(f.checkpoints.at(-1).runtime.phase,'departing','completion stores the final dismissal tasks');f.service.dispose();
 const blocked=fixture();blocked.step(10,false);blocked.step(11.5,false);assert.equal(blocked.service.state().schedule.outcome,'postponed');assert.equal(blocked.service.state().exception.reason,'assembly-incomplete');assert.equal(blocked.service.state().schedule.courtStart,11.5);assert.equal(blocked.service.state().schedule.completionId,null);blocked.step(11.8,false);assert.equal(blocked.requests(),1,'late arrival does not create another sliding court');blocked.service.dispose();
 const ceremony=fixture({assembled:true,budget:42.5}),positions=ceremony.actors.slice(0,6).map(n=>n.root.position.clone());ceremony.step(11.5-(42.5+20-.2)*.7/60,false);assert.equal(ceremony.service.state().phase,'holding','one real production summons call must hold the assembled fixture on its first frame');assert.equal(ceremony.requests(),1);assert(ceremony.actors.slice(0,6).every((n,i)=>n.root.position.equals(positions[i])),'ordinary life cannot run between restored rank positions and the summon boundary');ceremony.service.dispose();
 for(const [checkpoint,oldPhase,expected]of [[summonCheckpoint,'waiting','assembling'],[startCheckpoint,'holding','kneeling']]){
  const old=JSON.parse(JSON.stringify(checkpoint));old.runtime.phase=oldPhase;
  const restored=fixture({saved:{continuity:old},positions:old.actorPositions});
  assert.equal(restored.service.state().phase,expected,'legacy inconsistent boundary resumes its existing transition');
  assert.deepEqual(JSON.parse(JSON.stringify(restored.actors.map(n=>n.root.position.toArray()))),old.actorPositions,'restoring a phase never teleports actors');
  if(expected==='assembling'){for(let i=0;i<200&&restored.service.state().phase!=='holding';i++)restored.step(11.49);assert.equal(restored.service.state().phase,'holding');restored.step(11.5);assert.equal(restored.service.state().phase,'kneeling');}
  else {restored.step(11.6,false,1.9);assert.equal(restored.service.state().phase,'report','resumed opening does not remain holding forever');}
  assert.equal(restored.service.state().schedule.courtStart,11.5);restored.service.dispose({suspend:true});
 }
 for(const outcome of ['postponed','completed']){
  const old=JSON.parse(JSON.stringify(outcome==='completed'?startCheckpoint:summonCheckpoint));old.schedule={...old.schedule,outcome,lastCompletedDay:outcome==='completed'?0:-1};old.runtime.phase=outcome==='completed'?'rising':'assembling';
  const restored=fixture({saved:{continuity:old},positions:old.actorPositions});
  assert.equal(restored.service.state().phase,'departing','terminal boundary restores dismissal instead of another summons');assert.equal(restored.service.state().schedule.outcome,outcome);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.actors.map(n=>n.root.position.toArray()))),old.actorPositions);
  assert(restored.service.state().actors.every(n=>n.stage!=='to-court'),'no terminal court leaves actors in summon tasks');
  if(outcome==='completed')assert.equal(restored.service.state().schedule.completionId,'cn-morning-audience:0');
  restored.service.dispose({suspend:true});
 }
 console.log('PASS: six stable attendees, shared fixed-time ceremony, source-empty report, late exception, atomic boundary saves and legacy phase recovery without relocation/replayed completion');
})().catch(e=>{console.error(e);process.exitCode=1;});
