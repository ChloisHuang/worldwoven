// A released employee must move as the same actor, keep one controller, and
// return for real handover. Synthetic paths isolate ownership/save boundaries;
// the bounded main observation separately checks the authored France geometry.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,c,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,c);}});
const T=await import('three');
const {createFranceTeaService,FRANCE_TEA:P}=await import('../source/game/france-tea-service.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
function fixture(saved=null,{blocked=false,hired=false}={}){
 const actor=(id,position)=>{const root=new T.Group();root.position.set(...position);return {root,station:{id,npcLabel:id,npcAction:'read'},route:[],locomotion:{walkSpeed:3},animate(t,walking,action){this.action=action;}};};
 const npcs=[actor(P.cook,P.cookAside),actor(P.host,P.hostHome),actor(P.guest,P.guestHome)],player=actor('player',[25,0,25]);
 const seat={id:'tea-seat',kind:'seat',center:P.seatCenter,position:[5.37,.16,12.5],anchor:[6.6,.16,12.21],seatY:.9535,yaw:Math.PI},facilities=createFacilityQueue();let time=0,plans=0;
 const furniture={items:[seat],facilities,canSit:()=>true,standPoint:()=>new T.Vector3(...seat.position),releaseActor:id=>facilities.releaseActor(id)};
 const doors={cameraColliders:[],routeStep(route,p){while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.04)route.shift();return {waypoint:route[0]};}};
 const tea=createFranceTeaService({npcs,lot:{group:new T.Group(),colliders:[],bounds:{minX:-30,maxX:30,minZ:-40,maxZ:40}},furniture,doors,
  planPath:(a,b)=>{plans++;return blocked?[]:[new T.Vector3(b.x,b.y,b.z)];},moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:n=>n.poseContext??={},getPlayer:()=>player,getMounted:()=>null,
  worldSeed:1,saved:saved?{continuity:saved.tea}:{},saveState:()=>true,isServerHired:()=>hired,isCookHired:()=>hired,
  propsFactory:()=>({state:()=>({}),update(){},clear(){},dispose(){}})});
 if(saved){npcs.forEach((n,i)=>{n.root.position.set(...saved.actors[i].position);n.serviceMount=saved.actors[i].mounted?seat:null;});tea.restore(saved.tea);time=saved.time;}
 const tick=(n=1,context={})=>{for(let i=0;i<n;i++){const positions=npcs.map(n=>n.root.position.clone());time+=.1;tea.update(.1,time,context);npcs.slice(0,2).forEach((n,j)=>assert(n.root.position.distanceTo(positions[j])<.45,'one physical movement per staff actor/tick'));}};
 const until=(predicate,label,limit=5000)=>{for(let i=0;i<limit&&!predicate();i++)tick();assert(predicate(),label+' '+JSON.stringify(tea.state()));};
 const checkpoint=()=>({time,tea:tea.snapshot(),actors:npcs.map(n=>({position:n.root.position.toArray(),mounted:!!n.serviceMount}))});
 return {tea,npcs,player,tick,until,checkpoint,plans:()=>plans};
}
for(const role of ['host','cook']){
 const f=fixture(),id=role==='host'?P.host:P.cook,other=role==='host'?P.cook:P.host,duty=role==='host'?'fr-tea-labor-1':'fr-pastry-labor-1',n=f.npcs.find(n=>n.station.id===id),origin=n.root.position.clone();
 assert(f.tea.claimDuty(duty,role));
 f.until(()=>f.tea.state().offDuty[role]?.elapsed>1,'arrived at a valid off-duty activity');
 assert(n.root.position.distanceTo(origin)>1);assert.equal(f.npcs.filter(n=>n.station.id===id).length,1);
 assert.match(f.tea.socialStatus(n).job,/休班/);assert.equal(f.tea.state().life.people[other].choices,0);
 const checkpoint=f.checkpoint(),g=fixture(checkpoint);assert.deepEqual(g.tea.state().offDuty,f.tea.state().offDuty);assert.deepEqual(g.tea.state().life,f.tea.state().life);
 for(let i=0;i<300;i++){f.tick();g.tick();}assert.deepEqual(g.tea.state().life,f.tea.state().life,'reload preserves decision seed and cooldowns');assert.deepEqual(g.tea.state().offDuty,f.tea.state().offDuty,'reload retains elapsed activity');
 f.until(()=>f.tea.state().history.filter(e=>e.event==='staff-rested').length>=3,'several completed activities');
 const activities=f.tea.state().history.filter(e=>e.event==='staff-choice');assert(new Set(activities.map(e=>e.activity)).size>=3,'personality choices are not a fixed standby loop');assert.equal(f.tea.state().life.people[other].choices,0);
 if(role==='host'){
  // The cook must keep the real order workflow while Manon is away.
  f.until(()=>f.tea.dutyStep(duty)?.key==='take-order','real guest order');
  for(const key of ['take-order','report-order']){f.until(()=>f.tea.dutyStep(duty)?.key===key&&!f.tea.dutyStep(duty).waiting,'partner physically available');const spec=f.tea.dutyStep(duty);f.player.root.position.set(...spec.position);assert(f.tea.startDutyStep(duty,key));f.until(()=>f.tea.dutyStep(duty)?.key!==key,'player completes original step');}
  f.player.root.position.set(25,0,25);f.until(()=>f.tea.state().order.stage==='pickup','original cook still prepares real tea');
 }else{assert.equal(f.tea.state().order.stage,'receiving','original host brings real guest order');assert(f.npcs.find(n=>n.station.id===P.host).root.position.distanceTo(new T.Vector3(...P.report))<.4);}
 f.until(()=>f.tea.state().offDuty[role]&&n.root.position.distanceTo(origin)>2,'away before recall');
 f.tea.requestMeeting(true,role);assert.equal(f.tea.state().offDuty[role],null);assert.equal(f.tea.meetingReady(role),false,'recall never teleports');
 f.until(()=>f.tea.meetingReady(role),'physical employer return');assert(n.root.position.distanceTo(origin)<.4);
 const ownership=role==='host'?'staffOwnership':'cookOwnership';assert.equal(f.tea.state()[ownership].controller,'player','meeting does not reclaim work twice');
 assert(f.tea.releaseDuty(duty));f.tea.requestMeeting(false,role);assert.equal(f.tea.state()[ownership].controller,id);f.tick(10);assert.equal(f.tea.state().offDuty[role],null);assert.equal(f.tea.state().life.people[id].current,null);
 console.log('PASS',role,'same identity, varied activities, partner orders, stable reload, physical recall and sole returned controller');
}
{
 const f=fixture(null,{hired:true});f.tick(4);assert.deepEqual(f.tea.state().offDuty,{host:null,cook:null});assert.equal(f.tea.state().duty,null);assert.equal(f.tea.state().staffOwnership.cover,true);assert.equal(f.tea.state().cookOwnership.cover,true);
 const blocked=fixture(null,{blocked:true});blocked.tea.claimDuty('fr-tea-labor-1');blocked.tick();const plans=blocked.plans();blocked.tick(30);assert.equal(blocked.plans(),plans,'unreachable choices wait without per-frame path scans');assert.equal(blocked.tea.state().life.people[P.host].choices,0);assert.equal(blocked.tea.state().offDuty.host,null);
 console.log('PASS hiring alone preserves explicit cover; unreachable activities are not sampled or rescanned every frame');
}

{
 const f=fixture(),host=f.npcs.find(n=>n.station.id===P.host);f.tea.claimDuty('fr-tea-labor-1');
 f.until(()=>f.tea.state().offDuty.host?.choice.id==='read'&&f.tea.state().offDuty.host.elapsed===0,'book choice before physical arrival');
 const before=f.checkpoint();f.tick(20,{conversationActorId:P.host});assert.deepEqual(host.root.position.toArray(),before.actors[1].position);assert.equal(host.action,null,'conversation in transit cannot pretend to read a distant book');assert.equal(f.tea.state().offDuty.host.elapsed,0);
 f.tea.requestMeeting(true);assert.equal(f.tea.state().offDuty.host,null);assert.equal(f.tea.state().life.people[P.host].current,null);
 console.log('PASS conversation pauses travel without premature activity or relief; meeting cancels the commitment');
}
