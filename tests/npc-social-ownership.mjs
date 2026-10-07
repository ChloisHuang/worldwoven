import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const T=await import('three');
const {createJapanBathhouseOperations}=await import('../source/game/japan-bathhouse-operations.js');
const {JAPAN_SERVICE_POINTS:P,JAPAN_SERVICE_WORKERS}=await import('../source/game/japan-service-orders.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const source=fs.readFileSync('source/game/japan-bathhouse.js','utf8'),start=source.indexOf(' const stations=['),end=source.indexOf('\n ];',start);
assert(start>=0&&end>start);
// Read the real authored stations without allocating unrelated scene geometry.
const stations=JSON.parse(JSON.stringify(vm.runInNewContext(source.slice(start,end+4)+';stations')));
const ids=new Set(Object.values(JAPAN_SERVICE_WORKERS).flat());
function fixture(saved={}){
 const group=new T.Group(),facilities=createFacilityQueue(),npcs=[];
 function actor(station){const root=new T.Group();root.position.fromArray(station.npcPosition);root.rotation.y=Math.PI;root.userData.appearance={wardrobePreset:'test'};group.add(root);const n={station,root,home:root.position.clone(),phase:0,route:[],locomotion:{walkSpeed:2},animate(t,walking,action,context){this.pose={walking,action,context};this.root.userData.poseQA={action};}};npcs.push(n);return n;}
 for(const s of stations.filter(s=>ids.has(s.id)))actor(structuredClone(s));
 const items=[...[-7,4].map(x=>({id:'rest-'+x,kind:'seat',center:[x,3.8,7.55],position:[x,3.8,7],anchor:[x,3.8,7]})),{id:'staff-seat',kind:'seat',center:[-6.8,11.4,-7.45],position:[-6.8,11.4,-8.39]},{id:'staff-bed',kind:'bed',center:[-4.3,11.4,-11.5],position:[-4.3,11.4,-9.18]}];
 const furniture={items,facilities,resolveBath:()=>null,releaseActor:id=>facilities.releaseActor(id)};
 const routine=createJapanBathhouseOperations({npcs,lot:{group,colliders:[],walkableSurfaces:[],bounds:{minX:-50,maxX:50,minZ:-50,maxZ:50}},furniture,saved:{staffLife:{version:3,dueIn:90,...saved}},planPath:()=>[],doors:{routeStep:()=>({waiting:true})},moveActor(n,dx,dz){n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:(n,s)=>({target:s?.workTarget}),changeWardrobe(){},createVisitor:v=>actor({id:v.id,npcPosition:v.position,npcName:v.name}),removeVisitor:n=>npcs.splice(npcs.indexOf(n),1)});
 const get=id=>npcs.find(n=>n.station.id===id);let time=0;
 return {routine,get,furniture,frame(dt=.01,state={}){time+=dt;routine.update(dt,time,{position:new T.Vector3(40,0,40),...state});},dispose(){routine.dispose();facilities.dispose();}};
}

const {holdSocialActors,releaseSocialActors,isSociallyHeld,resetSocialHolds,socialHoldOwner}=await import('../source/game/npc-social-ownership.js');
resetSocialHolds();
assert(holdSocialActors(['a','b'],'pair-1'));
assert(isSociallyHeld('a')&&isSociallyHeld('b'));
assert(!holdSocialActors(['b','c'],'pair-2'));
assert(!isSociallyHeld('c'),'conflicting lease is atomic');
assert.equal(socialHoldOwner('b'),'pair-1');
assert(holdSocialActors(['c','d'],'pair-2'));
assert(releaseSocialActors('pair-1'));
assert(!isSociallyHeld('a')&&isSociallyHeld('c'),'release is owner-local');
assert(isSociallyHeld('player-chat','player-chat'),'legacy scalar remains supported');
assert(!holdSocialActors(['player'],'invalid'));
assert(!holdSocialActors([null],'invalid'));
resetSocialHolds();assert(!isSociallyHeld('c'));
const f=fixture();
try{
 f.frame();
 const a=f.get('jp-sushi'),b=f.get('jp-ramen'),other=f.get('jp-onsen');
 assert.equal(f.routine.canBorrowForSocial(a),false,'idle original worker has no departure permission');assert.equal(f.routine.canTalkAtPost(a),true,'idle stationary original post permits a short conversation');
 const tasks=[a.serviceTask,b.serviceTask],elapsed=tasks.map(t=>t.elapsed),otherElapsed=other.serviceTask.elapsed;
 assert(holdSocialActors([a.station.id,b.station.id],'npc-pair'));
 f.frame(.2); // Player is far away, but both participants pause independently.
 for(const [i,n] of [a,b].entries()){
  assert.equal(n.serviceTask,tasks[i]);assert.equal(n.serviceTask.elapsed,elapsed[i]);assert.equal(n.pose.action,null);assert(!n.walking);
  assert(!f.routine.socialStatus(n).busy,'own social hold must not self-cancel raw eligibility');
 }
 assert(other.serviceTask.elapsed>otherElapsed,'unrelated worker continues');
 releaseSocialActors('npc-pair');f.frame(.1);
 assert.equal(a.pose.action,'sushi');assert.equal(b.pose.action,'ramen');
 for(const [i,n] of [a,b].entries()){assert.equal(n.serviceTask,tasks[i]);assert(n.serviceTask.elapsed>elapsed[i]);}
}finally{resetSocialHolds();f.dispose();}
console.log('PASS atomic actor-local social leases, legacy player gate, independent two-NPC pause, unchanged task/timer, unrelated actor progress, exact resume and reset');

{
const {createFranceGardener}=await import('../source/game/france-gardener.js'),{FRANCE_GARDENER:P}=await import('../source/game/france-gardener-place.js');
function fixture({blocked=false,saved={}}={}){
 const root=new T.Group(),group=new T.Group(),hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.16,.74,.21);hands[1].position.set(.16,1.05,.37);root.add(...hands);root.userData.hands=hands;root.position.set(...P.approach);group.add(root);
 const actor={root,station:{id:P.id,npcAction:'garden'},route:[],characterScale:1,locomotion:{walkSpeed:2},animate(){}},other={station:{id:'france-salon'},root:new T.Group()},player={root:new T.Group()};player.root.position.set(30,0,30);other.root.position.set(25,0,25);let waiting=blocked,clock=0,conversationActorId=null;
 const doors={routeStep(route,p){if(waiting)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.035)route.shift();return {waypoint:route[0]};}};
 const service=createFranceGardener({npcs:[actor,other],lot:{group,walkableSurfaces:[]},doors,planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,x,z)=>{n.root.position.x+=x;n.root.position.z+=z;},poseContext:n=>n.poseContext??={},getPlayer:()=>player,worldSeed:1,saved});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock+=.1;service.update(.1,clock,{conversationActorId});}},until=(p,limit=4000)=>{for(let i=0;i<limit&&!p(service.state());i++)tick();assert(p(service.state()),'Expected garden state: '+JSON.stringify(service.state()));};
 return {service,actor,other,group,tick,until,setBlocked:v=>waiting=v,talk:v=>conversationActorId=v?P.id:null};
}
 const f=fixture();f.until(s=>s.cycles===1);f.until(s=>s.choice&&['rest','garden'].includes(s.choice.id));
 const before=f.service.snapshot(),position=f.actor.root.position.toArray();
 assert(holdSocialActors([P.id,'france-atelier'],'gardener-pair'));f.tick(8);
 const after=f.service.snapshot();assert.equal(after.phase,before.phase);assert.equal(after.choiceElapsed,before.choiceElapsed);assert.deepEqual(f.actor.root.position.toArray(),position);assert(!f.service.socialStatus().busy);
 releaseSocialActors('gardener-pair');f.tick();f.service.dispose();
}
{
 const {createChinaTellerService}=await import('../source/game/china-teller-service.js');
 const {createCurrencyLedger}=await import('../source/game/currency-ledger.js');
 const id='cn-money-house-teller',n={station:{id},alive:true,root:{position:{x:-21,y:.215,z:-28.25},rotation:{y:0}},route:[{x:-20,y:.215,z:-28.25}],walking:false};
 let poses=0;const ledger=createCurrencyLedger({saveState:()=>true});
 const service=createChinaTellerService({npcs:[n],lot:{tellerTools:{pose:()=>poses++,contact:()=>true}},resolveAssignment:()=>({holderId:id,revision:0,actor:n,status:'npc',alive:true,available:true}),getDay:()=>0,getLedger:()=>ledger,canControl:()=>true,isCounterOpen:()=>true,isPersonalBusy:()=>false,poseContext:()=>({}),getPlayer:()=>null,economy:{settle:()=>({ok:true})},saveState:()=>true});
 const route=n.route;holdSocialActors([id,'cn-rest'],'teller-pair');service.update(.1,1);
 assert.equal(poses,0,'idle teller body adapter must yield too');assert.equal(n.route,route);assert.equal(n.route.length,1);
 releaseSocialActors('teller-pair');service.update(.1,1.1);assert.equal(poses,1);assert.equal(n.route.length,0);service.dispose();
}
console.log('PASS gardener independent leisure timer and Chinese teller idle-body ownership pause/resume');

{
const {createFranceTeaService,FRANCE_TEA:P}=await import('../source/game/france-tea-service.js');
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

 const f=fixture(null,{hired:true}),host=f.npcs.find(n=>n.station.id===P.host),cook=f.npcs.find(n=>n.station.id===P.cook);
 assert.equal(f.tea.canBorrowForSocial(host),false,'being hired or having no order is not a handoff');assert.equal(f.tea.canBorrowForSocial(cook),false);
 assert.equal(f.tea.canTalkAtPost(host),true);assert.equal(f.tea.canTalkAtPost(cook),true);
 assert(f.tea.claimDuty('fr-tea-labor-1','host'));f.tick();
 assert.equal(f.tea.canBorrowForSocial(host),true,'existing active duty actually releases only its holder');assert.equal(f.tea.canBorrowForSocial(cook),false,'other workplace remains covered by its original worker');
 f.tea.requestMeeting(true,'host');assert.equal(f.tea.canBorrowForSocial(host),false,'handover recall revokes departure immediately');f.tea.dispose();
}
console.log('PASS original duty boundaries: no-order/hired is not release, post talk stays possible, actual single-role cover authorizes departure, recall revokes');

{
 const main=fs.readFileSync('source/game/main.js','utf8'),from=main.indexOf('function npcPublicMode('),to=main.indexOf('function configureNpcPublicInteractions(',from);assert(from>=0&&to>from);
 let open=false,covered=false,resolves=0;const teller={station:{id:'teller'},root:{position:new T.Vector3(0,0,0)}},other={station:{id:'other'},root:{position:new T.Vector3(1.4,0,0)}};
 const absent={state:()=>({holderId:null})};const ctx={Math,npcSocial:{routineAvailable:()=>true,isPaused:()=>false},npcActorIdForSocial:n=>n.station.id,isSociallyHeld:()=>false,chinaMoneyHouse:{owns:n=>n===teller,canBorrowForSocial:()=>covered,canTalkAtPost:()=>!open},chinaSalon:null,chinaClinic:null,chinaRoyalKitchen:null,chinaArchery:null,japanService:null,franceTea:null,egyptMeal:null,chinaTavern:null,teaSlot:absent,archiveSlot:absent,tellerSlot:absent,heraldSlot:absent,scribeSlot:absent,gardenSlot:absent,receptionSlot:absent,socialMeetingPlaces:{resolve(){resolves++;return {ok:true,place:{id:'real-public',points:[[0,0,0],[1,0,0]]}}}}};
 const gate=vm.runInNewContext(main.slice(from,to)+';({npcPublicMode,resolveNpcPublicMeeting,createPostConversationJourney})',ctx);
 assert.equal(gate.npcPublicMode(teller),'post');const meeting=gate.resolveNpcPublicMeeting(teller,other);assert.equal(meeting.post,true);assert.equal(resolves,0,'uncovered counter never asks for a departure route');
 const stay=gate.createPostConversationJourney({},[teller,other],meeting);assert.equal(stay.update().ok,true);open=true;assert.equal(stay.update().ok,false,'new real transaction cancels the at-post conversation');open=false;
 other.root.position.x=4;assert.equal(gate.resolveNpcPublicMeeting(teller,other),null,'distant partner cannot take the uncovered teller off post');
 covered=true;assert.equal(gate.npcPublicMode(teller),'leave');gate.resolveNpcPublicMeeting(teller,other);assert.equal(resolves,1,'departure uses public resolver only after actual owner coverage permits it');
 console.log('PASS actual main branch keeps uncovered teller at post, rejects distant partner, and cancels for new business');
}
