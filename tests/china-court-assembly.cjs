// State-machine regression for a moving start time / cloned unowned attendees.
// Coordinates are supplied by a unit double; physical routes belong to the
// one bounded scene test, not this logical test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve('source'),context=vm.createContext({console}),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file,context});cache.set(file,m);return m;}
const linker=(s,f)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s));
(async()=>{
 const module=mod(path.join(root,'game/china-palace-audience.js'));await module.link(linker);await module.evaluate();
 const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace;
 function fixture(){
  const actors=[...module.namespace.CHINA_COURT_OFFICIALS,{id:'cn-emperor',npcPosition:[0,1.415,-8]}].map(station=>{const root=new T.Group(),head=new T.Group();root.userData.head=head;root.add(head);root.position.set(...station.npcPosition);return {station,root,home:root.position.clone(),phase:0,route:[],locomotion:{walkSpeed:1.5},animate(){}};});
  let duty=false,requests=0;
  const palace={dutyPlan:()=>({reachable:true,seconds:120}),requestDuty(){duty=true;requests++;},dutyState:()=>duty?{ready:true}:null,setDutyLine(){},releaseDuty(){duty=false;}};
  const service=module.namespace.createChinaPalaceAudience({npcs:actors,palace,lot:{colliders:[],walkableSurfaces:[],bounds:{}},doors:{cameraColliders:[],routeStep:()=>({waiting:true})},planPath:(_,p)=>[p],moveActor(){},poseContext:()=>({})});
  return {actors,service,requests:()=>requests,step(hour,move=true,dt=.1){if(move)for(const n of actors)if(n.route.length)n.root.position.copy(n.route.at(-1));service.update(dt,0,{hour});}};
 }
 const f=fixture();f.step(10);assert.equal(f.service.state().phase,'assembling');assert.equal(f.requests(),1);assert.equal(f.service.state().actors.length,6);
 assert.equal(new Set(f.actors.slice(0,6).map(n=>n.station.id)).size,6);assert(f.actors.slice(2,6).every(n=>n.station.npcPosition[1]>3));
 for(let i=0;i<200&&f.service.state().phase!=='holding';i++)f.step(10.5);
 assert.equal(f.service.state().phase,'holding');assert(f.service.state().actors.every(n=>n.arrived));
 for(let i=0;i<20;i++)f.step(11.49);assert.equal(f.service.state().phase,'holding','being assembled cannot start the ceremony early');
 f.step(11.5);assert.equal(f.service.state().phase,'kneeling');assert.equal(f.service.state().schedule.courtStart,11.5);
 for(let i=0;i<450&&f.service.state().schedule.outcome!=='completed';i++)f.step(11.6);
 assert.equal(f.service.state().schedule.completionId,'cn-morning-audience:0');assert.equal(f.service.state().currentReport.sourceEventId,null,'no fixture order means no invented real receipt');f.service.dispose();
 const blocked=fixture();blocked.step(10,false);blocked.step(11.5,false);assert.equal(blocked.service.state().schedule.outcome,'postponed');assert.equal(blocked.service.state().exception.reason,'assembly-incomplete');assert.equal(blocked.service.state().schedule.courtStart,11.5);assert.equal(blocked.service.state().schedule.completionId,null);blocked.step(11.8,false);assert.equal(blocked.requests(),1,'late arrival does not create another sliding court');blocked.service.dispose();
 console.log('PASS: six stable attendees, one shared summons, early rank hold, fixed-time whole ceremony, source-empty report and explicit late exception');
})().catch(e=>{console.error(e);process.exitCode=1;});
