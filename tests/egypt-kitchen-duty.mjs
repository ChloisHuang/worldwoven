// Exercise the original three actors, finite resident supply and local duty
// boundaries. Routes are lightweight; eating, props, needs and receipts are real.
import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three');
const {createEgyptMealService}=await import('../source/game/egypt-meal-service.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const {createDailyNeeds,DAILY_NEEDS_HOUR:H}=await import('../source/game/daily-needs.js');
const {EGYPT_MEAL:P}=await import('../source/game/egypt-meal-definition.js');
const {validEgyptResidentSupply}=await import('../source/game/egypt-resident-supply.js');
const {validEgyptKitchenReceipt}=await import('../source/game/egypt-kitchen-role.js');
const GUEST='egypt-papyrus',DUTY='eg-kitchen-labor-1',copy=structuredClone;

function fixture({hungry=true,saved={},needsSaved,seconds=0,playerSeated=false}={}){
 const group=new T.Group(),seat={id:'egypt-seat',kind:'seat',center:P.seatCenter.slice(),anchor:[15.25,0,-9.3],position:[13.95,0,-9.3],seatY:.66,yaw:Math.PI/2};
 const actor=(id,p)=>{const root=new T.Group();root.position.set(...p);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.19,1.12,.43);hands[1].position.set(.19,1.12,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,home:new T.Vector3(...p),station:{id,npcPosition:p.slice(),npcLabel:id,npcAction:'read'},characterScale:.96,phase:0,route:[],locomotion:{walkSpeed:2},animate(){}};};
 const cook=actor(P.cook,P.prep),host=actor(P.host,P.hostHome),guest=actor(GUEST,[-7.75,0,-1.7]),npcs=[cook,host,guest],person=actor('player',[30,0,30]);
 let mounted=null,blocked=false,doorWaiting=false,rejectState=()=>false,failNeeds=false,durable,needsDisk,elapsed=0;
 const clock=()=>{const minutes=600+seconds*.7;return {seconds,day:Math.floor(minutes/1440),hour:minutes%1440/60};};
 const needs=createDailyNeeds({saved:needsSaved||{version:2,people:{[GUEST]:{foodAge:(hungry?25:7)*H,foodBalanceOffset:0,toiletAge:0,receipts:{}}}},getClock:clock,saveState:s=>{if(failNeeds)return false;needsDisk=copy(s);return true;}});needs.enter('egypt',npcs.map(n=>n.station.id));
 const furniture={items:[seat],facilities:createFacilityQueue(),canSit:()=>!blocked&&!mounted,standPoint:()=>blocked?null:new T.Vector3(...seat.position),releaseActor(id){this.facilities.releaseActor(id);}};
 function playerSeat(value){furniture.releaseActor('player');mounted=value?seat:null;person.root.position.set(...(value?seat.anchor:[30,0,30]));if(value){assert(furniture.facilities.reserve(seat.id,'player'));assert(furniture.facilities.occupy(seat.id,'player'));}}
 if(playerSeated)playerSeat(true);
 const lot={group,colliders:[],walkableSurfaces:[],bounds:{minX:-35,maxX:35,minZ:-35,maxZ:35}},doors={cameraColliders:[],routeStep(route,p){if(doorWaiting)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.05)route.shift();return {waypoint:route[0]};}};
 const service=createEgyptMealService({npcs,lot,furniture,doors,planPath:(a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:n=>n.poseContext??={},getPlayer:()=>person,getMounted:()=>mounted,getClock:clock,sharedNeeds:needs,worldSeed:1,saved,saveState:s=>{if(rejectState(s))return false;durable=copy(s);return true;},onResidentMealReceipts:(receipts,supply)=>needs.egyptResidentMealReceipts(receipts,supply)});
 const tick=(count=1)=>{for(let i=0;i<count;i++){seconds+=.1;elapsed+=.1;needs.update();service.update(.1,elapsed);}};
 const until=(predicate,label='expected state',limit=5000)=>{for(let i=0;i<limit&&!predicate(service.state());i++)tick();assert(predicate(service.state()),`${label}: ${JSON.stringify({order:service.state().order,duty:service.kitchen.dutyState(),phase:service.state().phase})}`);};
 function checkpoint(){return {saved:service.snapshot(),needsSaved:needs.snapshot(),seconds,actors:npcs.map(n=>({id:n.station.id,position:n.root.position.toArray(),yaw:n.root.rotation.y,mountId:n.serviceMount?.id||null})),player:person.root.position.toArray()};}
 function restoreActors(c,{skipGuestMount=false}={}){for(const a of c.actors){const n=npcs.find(n=>n.station.id===a.id);n.root.position.set(...a.position);n.root.rotation.y=a.yaw;if(a.mountId&&!(skipGuestMount&&a.id===GUEST)&&furniture.facilities.reserve(a.mountId,n.station.id)&&furniture.facilities.occupy(a.mountId,n.station.id))n.serviceMount=seat;}if(!mounted)person.root.position.set(...c.player);assert(service.restore(c.saved));}
 return {service,kitchen:service.kitchen,needs,npcs,cook,host,guest,person,seat,furniture,clock,tick,until,playerSeat,checkpoint,restoreActors,movePlayer:p=>person.root.position.set(...p),advanceHours:hours=>{seconds+=hours*H;needs.update();},reject:fn=>rejectState=fn,rejectNeeds:value=>failNeeds=value,blockSeat:value=>blocked=value,blockDoor:value=>doorWaiting=value,get durable(){return durable;},get needsDisk(){return needsDisk;},dispose:()=>service.dispose({suspend:true})};
}
function claim(f){f.movePlayer(f.kitchen.registry);f.kitchen.requestMeeting(true);f.until(()=>f.kitchen.meetingReady(),'original cook meeting');assert(f.kitchen.claimDuty(DUTY));f.until(()=>f.kitchen.dutyState().status==='active','safe duty takeover');f.kitchen.requestMeeting(false);}
function doStage(f,expected,next){const w=f.kitchen.workIntent(DUTY);assert.equal(w?.stage,expected);assert.equal(f.kitchen.executeWork(w,'eg-kitchen-labor-999'),false);f.movePlayer(w.position);assert(f.kitchen.executeWork(w,DUTY));f.until(s=>s.order?.stage===next,`${expected} completes as ${next}`);return w;}

test('Samira seeks a free seat only when hungry and consumes one original portion after twelve seconds',()=>{
 const f=fixture({hungry:false});f.tick(400);assert.equal(f.service.state().order,null);assert.equal(f.service.state().supply.remaining,24);assert.equal(f.guest.serviceMount,undefined);
 f.advanceHours(18);assert.equal(f.needs.hunger(GUEST),1);f.playerSeat(true);f.tick(400);assert.equal(f.service.state().order,null);assert.equal(f.service.state().supply.remaining,24);
 f.playerSeat(false);f.until(s=>s.order?.stage==='ready','resident meal reaches her table');const o=f.service.state().order;assert.equal(o.customer,GUEST);assert.equal(f.guest.serviceMount.id,f.seat.id);assert.equal(f.service.playerRequest(f.seat.id),false);assert.equal(f.service.state().supply.remaining,23);assert.equal(f.service.state().props.bowlCount,1);assert.equal(f.service.state().supply.consumed.length,0);
 f.until(s=>s.order?.stage==='eating');f.tick(119);assert.equal(f.service.state().supply.consumed.length,0);assert.equal(f.needs.hunger(GUEST),1);f.until(s=>s.order?.finished,'resident really finishes');
 const s=f.service.state();assert.equal(s.supply.prepared.length,1);assert.equal(s.supply.consumed.length,1);assert.equal(s.supply.consumed[0].orderId,o.id);assert.equal(s.supply.consumed[0].eatingSeconds,12);assert.equal(f.needs.hunger(GUEST),0);assert(validEgyptResidentSupply(s.supply));f.dispose();
});

test('safe local takeover drains an NPC-cooked original order before the player owns the workstation',()=>{
 const f=fixture();f.until(s=>s.order?.stage==='heating'&&s.phase>.1);const id=f.service.state().order.id;f.movePlayer(f.kitchen.registry);f.kitchen.requestMeeting(true);assert.equal(f.kitchen.meetingReady(),false);assert(f.kitchen.claimDuty(DUTY));assert.equal(f.kitchen.dutyState().status,'draining');assert.equal(f.kitchen.workIntent(DUTY),null);
 f.until(()=>f.kitchen.dutyState().status==='active','cook finishes original heating and plating');assert.equal(f.service.state().order.id,id);assert.equal(f.service.state().order.workReceiptId,undefined);assert.equal(f.service.state().supply.remaining,23);assert(!['preparing','heating','plating'].includes(f.service.state().order.stage));
 f.kitchen.requestMeeting(false);f.until(s=>s.order?.finished);assert.deepEqual(f.kitchen.workReceipts(DUTY),[],'taking over after preparation cannot claim an NPC meal');f.dispose();
});

test('the four player stages keep one order and only actual consumption produces successful work evidence',()=>{
 const f=fixture();claim(f);f.until(s=>s.order?.stage==='preparing');const id=f.service.state().order.id;assert.equal(f.service.state().supply.remaining,24);
 doStage(f,'preparing','heating');assert.equal(f.service.state().supply.remaining,23);doStage(f,'heating','plating');doStage(f,'plating','dispatch');assert.equal(f.service.state().order.mealId,id+'-dish');doStage(f,'dispatch','collecting');
 assert.equal(f.service.state().order.id,id);assert.deepEqual(f.kitchen.workReceipts(DUTY),[]);f.until(s=>s.order?.stage==='eating');f.tick(119);assert.deepEqual(f.kitchen.workReceipts(DUTY),[]);f.until(s=>s.order?.finished);
 const [r]=f.kitchen.workReceipts(DUTY);assert(validEgyptKitchenReceipt(r));assert.equal(r.completed,true);assert.equal(r.orderId,id);assert.equal(r.itemId,id+'-dish');assert.equal(r.supplyReceipt,id+'-prepared');assert.equal(f.needs.hunger(GUEST),0);assert(f.kitchen.canEndDuty(DUTY));assert.equal(f.service.state().supply.prepared.length,1);f.dispose();
});

test('failed preparation saves cannot debit stock; cancelling a half-made original writes off exactly that portion',()=>{
 const f=fixture();claim(f);f.until(s=>s.order?.stage==='preparing');const id=f.service.state().order.id,w=f.kitchen.workIntent(DUTY);f.movePlayer(w.position);f.reject(s=>s.supply.prepared.length>0);assert(f.kitchen.executeWork(w,DUTY));f.tick(50);
 assert.equal(f.service.state().order.stage,'preparing');assert.equal(f.service.state().supply.remaining,24);assert.deepEqual(f.service.state().supply.prepared,[]);assert.equal(f.durable.supply.remaining,24);
 f.reject(()=>false);f.until(s=>s.order?.stage==='heating');assert.equal(f.service.state().supply.remaining,23);assert(f.kitchen.releaseDuty(DUTY,{evaluate:true}));let s=f.service.state();assert.equal(s.order.cancelled,true);assert.deepEqual(s.supply.wasted,[id]);assert.equal(s.supply.consumed.length,0);assert(validEgyptResidentSupply(s.supply));assert.equal(f.needs.hunger(GUEST),1);
 assert(f.kitchen.releaseDuty(DUTY,{evaluate:true}));assert.deepEqual(f.service.state().supply.wasted,[id]);assert.equal(f.kitchen.workReceipts(DUTY).length,1);assert.equal(f.kitchen.workReceipts(DUTY)[0].outcome,'handoff');f.until(s=>!s.order,'cancelled portion clears');assert.equal(f.service.state().supply.consumed.length,0);assert.equal(f.furniture.facilities.reservation(f.seat.id,GUEST),null);f.dispose();
});

test('leaving the workstation pauses the same duty and NPC completion cannot grant the absent player success',()=>{
 const f=fixture();claim(f);f.until(s=>s.order?.stage==='preparing');doStage(f,'preparing','heating');const id=f.service.state().order.id;f.movePlayer([30,0,30]);f.tick();assert.equal(f.kitchen.dutyState().status,'paused');assert.equal(f.service.state().order.workAbandoned,true);
 f.until(s=>s.order?.finished,'NPC resumes the existing original portion');assert.equal(f.service.state().order.id,id);assert.equal(f.service.state().supply.prepared.length,1);assert.equal(f.needs.hunger(GUEST),0);const rows=f.kitchen.workReceipts(DUTY);assert.equal(rows.length,1);assert.equal(rows[0].outcome,'handoff');assert.equal(rows[0].completed,false);
 f.movePlayer(f.kitchen.registry);f.tick(20);assert.equal(f.kitchen.dutyState().status,'paused','merely returning cannot silently resume');claim(f);assert.equal(f.kitchen.dutyState().receiptId,DUTY);assert.equal(f.kitchen.dutyState().status,'active');assert.equal(f.kitchen.workReceipts(DUTY).filter(r=>r.completed).length,0);f.dispose();
});

test('carried tray and partial resident eating reload with original actor positions and retry failed needs once',()=>{
 const f=fixture();f.until(s=>s.order?.stage==='carrying');f.tick(8);const c=f.checkpoint(),tray=f.service.state().props.trayPosition;f.dispose();
 const g=fixture(c);g.restoreActors(c);assert.equal(g.service.state().order.id,c.saved.order.id);assert.equal(g.service.state().order.mealId,c.saved.order.mealId);assert.deepEqual(g.service.state().props.trayPosition,tray);assert.equal(g.service.state().supply.remaining,23);g.until(s=>s.order?.stage==='eating');g.tick(45);const partial=g.checkpoint();g.dispose();
 const h=fixture(partial);h.restoreActors(partial);assert.equal(h.service.state().phase,partial.saved.phase);assert.equal(h.guest.serviceMount.id,h.seat.id);h.rejectNeeds(true);h.until(s=>s.order?.finished);assert.equal(h.needs.hunger(GUEST),1);const consumed=h.checkpoint();h.dispose();
 const i=fixture(consumed);i.restoreActors(consumed);assert.equal(i.needs.hunger(GUEST),0);assert.equal(i.service.state().supply.prepared.length,1);assert.equal(i.service.state().supply.consumed.length,1);const meal=i.service.state().supply.consumed[0];assert.equal(i.needsDisk.people[GUEST].receipts['egypt-resident-meal'],meal.number);i.advanceHours(2);const hunger=i.needs.hunger(GUEST);i.tick(60);assert(i.needs.hunger(GUEST)>=hunger,'periodic replay cannot repeat relief');i.dispose();
});

test('a restored leaving resident releases the empty seat after reaching the original desk',()=>{
 const f=fixture();f.until(s=>s.order?.stage==='leaving');f.tick();assert.equal(f.guest.serviceMount,null);const c=f.checkpoint();f.dispose();const g=fixture(c);g.restoreActors(c);g.until(s=>!s.order,'resident returns to original desk');assert.equal(g.furniture.facilities.reservation(g.seat.id,GUEST),null);assert.equal(g.service.state().supply.remaining,23);g.dispose();
});

test('failed seat ownership on restore cannot mount or feed a resident in another actor’s occupied place',()=>{
 const f=fixture();f.until(s=>s.order?.stage==='ready');const c=f.checkpoint();f.dispose();const g=fixture({...c,playerSeated:true});g.restoreActors(c,{skipGuestMount:true});g.tick(140);assert.equal(g.service.state().supply.consumed.length,0);assert.equal(g.guest.serviceMount?.id,undefined);assert.equal(g.needs.hunger(GUEST),1);assert.equal(g.furniture.facilities.reservation(g.seat.id,'player').status,'occupied');g.dispose();
});

test('waiting without hungry customers remains an active local shift and can be handed back normally',()=>{
 const f=fixture({hungry:false});claim(f);f.tick(600);assert.equal(f.service.state().order,null);assert.equal(f.kitchen.dutyState().status,'active');assert.equal(f.kitchen.dutyActive(DUTY),true);assert.equal(f.kitchen.workIntent(DUTY),null);assert.equal(f.kitchen.workReceipts(DUTY).length,0);assert.equal(f.service.state().supply.remaining,24);assert.equal(f.kitchen.canEndDuty(DUTY),true);assert(f.kitchen.releaseDuty(DUTY,{evaluate:true}));assert.equal(f.kitchen.dutyState().status,'inactive');f.dispose();
});

test('remaining at the original registration point after takeover does not block the waiter’s order report',()=>{
 const f=fixture();claim(f);assert.deepEqual(f.person.root.position.toArray(),f.kitchen.registry);f.until(s=>s.order?.stage==='preparing','waiter reports the resident order to the present player');assert.equal(f.kitchen.workIntent(DUTY)?.stage,'preparing');assert.equal(f.service.state().supply.remaining,24);f.dispose();
});
