// Focused process regression: a real order may not advance through a closed
// route/occupied seat, duplicate a place setting, or leave cups after cancel.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three'),{createFranceTeaService,FRANCE_TEA:P}=await import('../source/game/france-tea-service.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js');
function fixture({player=false,blockedSeat=false,doorWaiting=false,saved={},saveState=()=>{},onMealReceipts=()=>{},onRelationshipEvent=()=>({ok:false}),ledger=null}={}){
 const group=new T.Group(),seat={id:'real-loggia-south',kind:'seat',center:[6.6,.16,12.5],anchor:[6.6,.16,12.21],position:[5.37,.16,12.5],seatY:.9535,yaw:Math.PI};
 const actor=(id,position)=>{const root=new T.Group();root.position.set(...position);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.19,1.12,.43);hands[1].position.set(.19,1.12,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,station:{id,npcLabel:id,npcAction:'read'},characterScale:.96,phase:0,route:[],locomotion:{walkSpeed:2},animate(){}};};
 const npcs=[actor(P.cook,P.cookAside),actor(P.host,P.hostHome),actor(P.guest,P.guestHome)],person=actor('player',player?seat.anchor:[30,0,30]);let mounted=player?seat:null,wait=doorWaiting,clock=0,seatBlocked=blockedSeat;
 const furniture={items:[seat],facilities:createFacilityQueue(),canSit:()=>!seatBlocked,standPoint:()=>seatBlocked?null:new T.Vector3(...seat.position),releaseActor(id){this.facilities.releaseActor(id);}};
 const lot={group,colliders:[],walkableSurfaces:[],bounds:{minX:-35,maxX:35,minZ:-35,maxZ:35}},doors={cameraColliders:[],routeStep(route,p){if(wait)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.05)route.shift();return {waypoint:route[0]};}};
 const service=createFranceTeaService({npcs,lot,furniture,doors,planPath:(a,b)=>[...(b.z < -8.3&&a.x > -5.4?[new T.Vector3(-5.0,b.y,-8.5)]:[]),new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:n=>n.poseContext??={},getPlayer:()=>person,getMounted:()=>mounted,onSeat:item=>{mounted=item;person.root.position.set(...item.anchor);},worldSeed:1,saved,saveState,onMealReceipts,onRelationshipEvent,ledger});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock+=.1;service.update(.1,clock);}};
 const until=(predicate,limit=5000)=>{for(let i=0;i<limit&&!predicate(service.state());i++)tick();assert(predicate(service.state()),'Did not reach expected state: '+JSON.stringify(service.state().order));};
 return {service,npcs,person,seat,tick,until,furniture,setDoor:v=>wait=v,setSeat:v=>seatBlocked=v,leave(){mounted=null;person.root.position.set(15,0,15);service.leaveSeat(seat.id);}};
}
const {createCurrencyLedger}=await import('../source/game/currency-ledger.js');
const {createDailyNeeds,DAILY_NEEDS_HOUR:H}=await import('../source/game/daily-needs.js');
function account(cash=12){let saved,fail=false;const ledger=createCurrencyLedger({saveState:s=>{if(fail)return false;saved=structuredClone(s);return true;}});if(cash){assert(ledger.creditWageToBank({amount:cash,receiptId:'test-france-wage',currency:'france',roleId:'fr-garden-assistant',slotId:'fr-garden-assistant-1',day:0}).ok);assert(ledger.withdraw(cash,'test-france-withdraw','france').ok);}return {ledger,saved:()=>saved,fail:v=>fail=v};}
{
 const a=account(3),f=fixture({ledger:a.ledger});assert.equal(f.service.request('country-soup-bread'),false);assert.equal(f.service.state().intent,false);assert.equal(f.service.state().order,null);assert.equal(f.furniture.facilities.reservation(f.seat.id,'player'),null);assert.equal(a.ledger.reservations().length,0);f.service.dispose();
}
{
 let durable,needsDisk,failNeeds=false;const a=account(),clock={seconds:0};const needs=createDailyNeeds({getClock:()=>clock,saveState:s=>{if(failNeeds)return false;needsDisk=structuredClone(s);return true;}});needs.enter('france');clock.seconds=26*H;needs.update();
 const f=fixture({player:true,ledger:a.ledger,saveState:s=>{durable=structuredClone(s);return true;},onMealReceipts:r=>needs.franceMealReceipts(r,a.ledger.reservations())});
 assert(f.service.request('country-soup-bread'));assert.equal(a.ledger.balances().france.cash,8);assert.equal(a.ledger.balances().france.held,4);assert.equal(f.service.request('country-soup-bread'),false);
 f.until(s=>s.order?.stage==='ready');const order=f.service.state().order;assert.equal(order.supplyReceipt,order.id+'-prepared');assert.equal(f.service.state().props.bowlCount,1);assert.equal(f.service.state().props.cupCount,0);assert.equal(f.service.state().props.spoonCount,1);assert(f.service.state().props.breadVisible);assert.equal(needs.hunger('player'),1);
 assert(f.service.drink());assert.equal(a.ledger.reservations()[0].status,'settled');f.tick(110);assert.equal(f.service.state().mealReceipts.length,0);failNeeds=true;f.until(s=>s.order?.stage==='lowering');const receipt=durable.mealReceipts[0];assert.equal(receipt.source,'france-full-meal');assert.equal(needs.hunger('player'),1);assert.equal(a.ledger.history().filter(t=>t.action==='settle').length,1);f.until(s=>!s.order);assert.equal(durable.paidOrder,null);f.service.dispose();
 failNeeds=false;const g=fixture({player:true,ledger:a.ledger,saved:durable,onMealReceipts:r=>needs.franceMealReceipts(r,a.ledger.reservations())});assert.equal(needs.hunger('player'),0);assert.equal(needsDisk.people.player.receipts['france-full-meal'],receipt.number);assert.equal(needs.franceMealReceipts([receipt],a.ledger.reservations()),false);clock.seconds+=23.9*H;needs.update();assert(needs.hunger('player')<1);clock.seconds+=.2*H;needs.update();assert.equal(needs.hunger('player'),1);g.service.dispose();
 assert.equal(needs.mealReceipts([{...receipt,number:receipt.number+1,orderId:'france-tea-2'}]),false);
}
for(const stage of ['requested','preparing','carrying','ready','drinking']){
 const a=account(),receipts=[],f=fixture({player:true,ledger:a.ledger,onMealReceipts:r=>receipts.push(...r)});assert(f.service.request('country-soup-bread'));f.until(s=>s.order?.stage===(stage==='drinking'?'ready':stage));if(stage==='drinking'){assert(f.service.drink());f.tick(40);}f.leave();f.until(s=>!s.order);assert.equal(a.ledger.balances().france.cash,stage==='drinking'?8:12);assert.equal(a.ledger.balances().france.held,0);assert.equal(receipts.length,0);f.service.dispose();assert.equal(a.ledger.history().filter(t=>t.action==='refund').length,stage==='drinking'?0:1);
}
{
 let durable,fail=false;const a=account(),f=fixture({player:true,ledger:a.ledger,saveState:s=>{if(fail)return false;durable=structuredClone(s);return true;}});f.service.request('country-soup-bread');f.until(s=>s.order?.stage==='ready');a.fail(true);assert.equal(f.service.drink(),false);assert.equal(f.service.state().order.stage,'ready');assert.equal(a.ledger.reservations()[0].status,'reserved');a.fail(false);assert(f.service.drink());fail=true;f.tick(125);assert.equal(f.service.state().order.stage,'drinking');assert.equal(f.service.state().mealReceipts.length,0);fail=false;f.tick();assert.equal(f.service.state().order.stage,'lowering');assert.equal(durable.mealReceipts.length,1);f.service.dispose();
}
{
 let durable;const a=account(),f=fixture({player:true,ledger:a.ledger,saveState:s=>{durable=structuredClone(s);return true;}});f.service.request('country-soup-bread');f.until(s=>s.order?.stage==='carrying');const snap=f.service.snapshot(),id=snap.order.id;f.service.dispose({suspend:true});assert.equal(durable.paidOrder.id,id,'life dispose cannot wipe suspended paid order');assert.equal(a.ledger.reservations()[0].status,'reserved');const g=fixture({player:true,ledger:a.ledger,saved:durable});assert(g.service.restore(snap));assert.equal(g.service.state().order.id,id);assert.equal(g.service.state().order.trayId,id+'-tray');g.until(s=>s.order?.stage==='ready');g.service.cancel();g.until(s=>!s.order);g.service.dispose();assert.equal(a.ledger.balances().france.cash,12);
}
{
 const a=account(),f=fixture({player:true,ledger:a.ledger,doorWaiting:true});f.service.request('country-soup-bread');f.tick(1820);assert.equal(a.ledger.reservations()[0].status,'refunded');assert.equal(a.ledger.balances().france.cash,12);assert.equal(f.service.state().order,null);assert.equal(f.service.claimDuty('fr-tea-labor-1'),true);assert.equal(f.service.request('country-soup-bread'),false);f.service.dispose();
}
{
 const a=account();assert(a.ledger.reserve(4,'france-tea-9-meal','france').ok);const f=fixture({player:true,ledger:a.ledger});assert.equal(a.ledger.reservations()[0].status,'refunded');assert.equal(f.service.state().serial,9);assert(f.service.request('country-soup-bread'));assert.equal(f.service.state().order.id,'france-tea-10');a.fail(true);f.service.cancel();assert.equal(a.ledger.balances().france.held,4);a.fail(false);f.tick(35);assert.equal(a.ledger.balances().france.held,0);assert.equal(a.ledger.balances().france.cash,12);f.service.dispose();
}
{
 let durable;const a=account(),f=fixture({player:true,ledger:a.ledger,saveState:s=>{durable=structuredClone(s);return true;}});f.service.request('country-soup-bread');f.until(s=>s.order?.stage==='ready');const ready=structuredClone(durable);assert(ready.paidOrder);const g=fixture({player:true,ledger:a.ledger,saved:ready});assert.equal(g.service.state().order.id,ready.paidOrder.id);assert.equal(g.service.state().order.stage,'ready');assert.equal(g.service.state().props.bowlCount,1);g.service.dispose();f.service.dispose();
}
console.log('PASS France full meal: actual source, 4 France cash, no reservation on low balance, one settled receipt after complete eating, durable daily-needs replay, 24h relief, cancellation/refund, save retries, restore, timeout and duty exclusion');

{
 const a=account(),events=[];let durable;
 const f=fixture({player:true,ledger:a.ledger,saveState:s=>{durable=structuredClone(s);return true;},onRelationshipEvent:e=>{events.push(e);return {ok:false};}});
 assert(f.service.request('country-soup-bread'));f.until(s=>s.order?.stage==='ready');assert.equal(events.length,0);assert(f.service.drink());f.until(s=>!s.order);
 const pending=durable.relationshipEvents;assert.equal(pending.length,2);assert.deepEqual(pending.find(e=>e.source==='france-tea').participants,[P.host,'player']);assert.deepEqual(pending.find(e=>e.source==='france-kitchen').participants,[P.cook,P.host]);f.service.dispose({suspend:true});
 const replay=[];const g=fixture({player:true,ledger:a.ledger,saved:durable,onRelationshipEvent:e=>{replay.push(e);return {ok:true};}});g.tick(30);assert.deepEqual(replay.map(e=>e.id).sort(),pending.map(e=>e.id).sort());g.service.dispose({suspend:true});
 console.log('PASS France relationship sources survive cleanup and rejected callback: exact host/diner and cook/host handoffs replay once');
}

{
 // Exercise the actual main callback body with a deliberately stale snapshot
 // writer. A nested relationship save must retain the just-committed source.
 const {readFileSync}=await import('node:fs');const {createRelationshipEvents}=await import('../source/game/relationship-events.js');
 const binding=readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8').split('\n').find(line=>line.startsWith('relationshipEvents=createRelationshipEvents('));assert(binding);
 const aggregate={appearance:{seed:1}};let disk,writerCalls=0,callbackCount=0;
 const storage={setItem(_key,value){disk=JSON.parse(value);return true;}};
 const relationship=new Function('createRelationshipEvents','saved','gameStorage','getRawNPCProfile','worldSnapshotWriter',`const socialSupportProfile=()=>null,socialIdentity=()=>null,socialKnownIds=()=>[];let relationshipEvents;${binding};return relationshipEvents;`)(createRelationshipEvents,aggregate,storage,()=>null,()=>{writerCalls++;aggregate.franceTea={serial:0,paidOrder:{id:'stale-order',finished:false},mealClosed:0};});
 const a=account(),f=fixture({player:true,ledger:a.ledger,saveState:s=>{aggregate.franceTea=structuredClone(s);storage.setItem('worlds-days-v1',JSON.stringify(aggregate));return true;},onRelationshipEvent:e=>{const committed=structuredClone(aggregate.franceTea);const result=relationship.record(e);callbackCount++;assert(result.ok);assert.deepEqual(disk.franceTea,committed,'nested relationship save must preserve fresh full source envelope');return result;}});
 assert(f.service.request('country-soup-bread'));f.until(s=>s.order?.stage==='ready');assert(f.service.drink());f.until(s=>!s.order);assert.equal(callbackCount,2);assert.equal(writerCalls,0);assert.equal(disk.franceTea.paidOrder,null);assert(disk.franceTea.mealClosed>0);assert.equal(Object.keys(disk.relationshipEvents.receipts).length,2);f.service.dispose({suspend:true});
 console.log('PASS main source→relationship nested save preserves just-committed France state without stale snapshot-writer reentry');
}

// Reading a local conversation menu must not expire the original paid meal.
{
 const {holdSocialActors,releaseSocialActors}=await import('../source/game/npc-social-ownership.js');
 const a=account(),f=fixture({player:true,ledger:a.ledger});assert(f.service.request('country-soup-bread'));f.until(s=>s.order?.stage==='preparing'&&s.phase>.4);
 const before=f.service.snapshot(),wallet=a.ledger.state();assert(holdSocialActors([P.cook],'france-paid-pause'));f.tick(2410);
 const after=f.service.snapshot();assert.deepEqual(after.order,before.order);assert.equal(after.stageAge,before.stageAge,'local conversation time is not a blocked service route');assert.equal(after.phase,before.phase);assert.deepEqual(a.ledger.state(),wallet,'no timeout refund while paused');
 releaseSocialActors('france-paid-pause');f.until(s=>s.order?.stage==='ready');assert(f.service.drink());f.until(s=>!s.order);assert.equal(f.service.state().mealReceipts.length,1);f.service.dispose();
 console.log('PASS France paid meal survives long local conversation without timing out or refunding, then completes original meal once');
}
