// Shared physiology migration and completed staff supply are durable boundaries.
// Small real controller fixtures catch phantom meal relief, replay, lost outbox
// acknowledgements and unsafe work interruption without building a whole lot.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createJapanStaffLife,JAPAN_STAFF_CREW} from '../source/game/japan-staff-life.js';
import {createJapanServiceOrders} from '../source/game/japan-service-orders.js';
import {createDailyNeeds,DAILY_NEEDS_HOUR as H} from '../source/game/daily-needs.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
function fixture({saved={},needsSaved,actorId='jp-ramen',toilet=null}={}){
 const clock={seconds:0};let allowSource=true,allowNeeds=true,staffSaved,physSaved;
 const actors=new Map(JAPAN_STAFF_CREW.map((id,i)=>[id,{station:{id,npcName:id},home:{toArray:()=>[i,0,0]},root:{position:{x:i,y:0,z:0},userData:{appearance:{}}}}])),tasks=new Map(),facilities=createFacilityQueue(),board=createJapanServiceOrders();
 const needs=createDailyNeeds({saved:needsSaved||{version:1,people:Object.fromEntries(JAPAN_STAFF_CREW.map(id=>[id,{foodAge:id===actorId?12*H:0,toiletAge:0,receipts:{}}]))},getClock:()=>clock,saveState:s=>{if(!allowNeeds)return false;physSaved=structuredClone(s);return true;}});needs.enter('japan',JAPAN_STAFF_CREW);
 const life=createJapanStaffLife({sharedNeeds:needs,getToilet:()=>toilet,actors,board,furniture:{items:[{id:'staff-seat',kind:'seat',center:[-6.8,11.4,-7.45],position:[-6.8,11.4,-8.39]}],facilities,releaseActor:id=>facilities.releaseActor(id)},assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:n=>{n.serviceMount=null;return true;},taskOf:n=>tasks.get(n.station.id),saved:{version:8,nextId:actorId,dueIn:0,...saved},saveState:s=>{if(!allowSource)return false;staffSaved=structuredClone(s);return true;},onMealReceipt:r=>needs.mealReceipts([r])||(needs.snapshot().people[r.actorId]?.receipts['japan-staff-meal']||0)>=r.number});
 const step=(dt=.1)=>{clock.seconds+=dt;needs.update();life.update(dt,{hour:12});};
 function done(id=actorId){const t=tasks.get(id);assert(t,id+' has physical task');if(t.mount)actors.get(id).serviceMount=t.mount;t.arrived=true;t.onArrive?.();const ok=t.onDone?.()!==false;if(ok&&tasks.get(id)===t)tasks.delete(id);return ok;}
 function handoff(){step();assert.equal(life.state().active.phase,'handoff');done(life.state().active.reliefId);done();step();}
 return {life,needs,actors,tasks,step,done,handoff,rejectSource:v=>allowSource=!v,rejectNeeds:v=>allowNeeds=!v,get saved(){return structuredClone(staffSaved);},get physSaved(){return structuredClone(physSaved);},dispose(){life.dispose();board.dispose();facilities.dispose();}};
}
test('all fourteen stable staff migrate legacy hunger into one shared source and pause offscreen',()=>{
 const legacy=Object.fromEntries(JAPAN_STAFF_CREW.map((id,i)=>[id,{needs:{hunger:(i+1)/20}}])),clock={seconds:0},needs=createDailyNeeds({legacyPeople:legacy,getClock:()=>clock});
 for(const id of JAPAN_STAFF_CREW)assert(Math.abs(needs.hunger(id)-legacy[id].needs.hunger)<1e-12);
 needs.enter('japan',JAPAN_STAFF_CREW);clock.seconds=H;needs.update();const saved=needs.snapshot();needs.enter('china',[]);clock.seconds+=24*H;needs.update();for(const id of JAPAN_STAFF_CREW)assert.equal(needs.snapshot().people[id].foodAge,saved.people[id].foodAge);
 const restored=createDailyNeeds({saved:needs.snapshot(),getClock:()=>({seconds:900000})});assert.deepEqual(restored.snapshot(),needs.snapshot());
});
test('all fourteen original staff cook or collect, then eat a uniquely supplied meal; handoff precedes relief',()=>{
 for(const actorId of JAPAN_STAFF_CREW){const f=fixture({actorId});f.tasks.set(actorId,{orderJobId:'held-order'});f.step();assert.equal(f.life.state().active.phase,'draining');assert.equal(f.tasks.get(actorId).orderJobId,'held-order');f.tasks.clear();f.handoff();assert.equal(f.life.state().active.phase,'preparing');assert.equal(f.needs.hunger(actorId),1);f.done();assert.equal(f.life.state().mealReceipts.length,0);assert.equal(f.needs.hunger(actorId),1);f.step();assert(f.tasks.get(actorId).seatedMeal);f.done();assert.equal(f.needs.hunger(actorId),0);assert.equal(f.life.state().mealReceipts.length,1);assert(f.life.state().mealReceipts[0].delivered);assert.equal(f.life.snapshot().decisions.people[actorId].needs.hunger,0);assert.equal(f.life.state().active.phase,'returning');f.dispose();}
});
test('cancelled meal, failed source save and failed physiology save never invent relief; outbox retries same item',()=>{
 const cancelled=fixture();cancelled.handoff();cancelled.done();cancelled.step();cancelled.life.abort(cancelled.actors.get('jp-ramen'));assert.equal(cancelled.needs.hunger('jp-ramen'),1);assert.equal(cancelled.life.state().mealReceipts.length,0);cancelled.dispose();
 const f=fixture();f.handoff();f.done();f.step();f.rejectSource(true);assert.equal(f.done(),false);assert.equal(f.needs.hunger('jp-ramen'),1);assert.equal(f.life.state().mealReceipts.length,0);f.rejectSource(false);f.rejectNeeds(true);assert(f.done());assert.equal(f.needs.hunger('jp-ramen'),1);assert.equal(f.life.state().mealReceipts.length,1);assert.equal(f.life.state().mealReceipts[0].delivered,false);const saved=f.saved,needsSaved=f.needs.snapshot();f.dispose();
 const g=fixture({saved,needsSaved});g.step();assert.equal(g.needs.hunger('jp-ramen'),0);assert.equal(g.life.state().mealReceipts[0].id,saved.mealReceipts[0].id);assert(g.life.state().mealReceipts[0].delivered);const checkpoint=g.needs.snapshot();g.step(2);assert.equal(g.needs.snapshot().people['jp-ramen'].foodAge,checkpoint.people['jp-ramen'].foodAge+2);assert.equal(g.needs.mealReceipts(g.life.state().mealReceipts),false);g.dispose();
});
test('Japanese completed toilet receipts have independent identities and reject the wrong fixture or partial use',()=>{
 const m=createDailyNeeds();m.enter('japan',JAPAN_STAFF_CREW);const base={source:'japan-toilet',id:'japan-toilet-1',number:1,facilityId:'jp-washroom-private-1',actorId:'jp-ramen',completed:true};
 assert.equal(m.toiletReceipt({...base,completed:false}),false);assert.equal(m.toiletReceipt({...base,facilityId:'cn-bath-toilet'}),false);assert(m.toiletReceipt(base));assert.equal(m.toiletReceipt(base),false);assert(m.toiletReceipt({...base,source:'china-toilet',id:'china-toilet-1',facilityId:'cn-bath-toilet'}));
});
test('interrupted toilet break remains unfulfilled, returns under coverage and respects the saved retry delay',()=>{
 let owner=null;const toilet={requestActor:n=>{owner=n;return true;},ownsActor:n=>owner===n,updateActor(){},label:()=>null,cancel:()=>{owner=null;return true;},state:()=>({approach:[20,0,-14.7],lastOutcome:{actorId:'jp-ramen',status:'cancelled'}})};
 const needsSaved={version:1,people:Object.fromEntries(JAPAN_STAFF_CREW.map(id=>[id,{foodAge:0,toiletAge:id==='jp-ramen'?25*H:0,receipts:{}}]))};
 const f=fixture({toilet,needsSaved});f.handoff();assert.equal(f.life.state().active.phase,'toilet');assert.equal(f.tasks.get('jp-ramen').arrivalRadius,.04);f.done();toilet.cancel();f.step();assert.equal(f.life.state().active.phase,'returning');assert(f.life.state().active.interrupted);assert(f.life.state().events.some(e=>e.event==='toilet-interrupted'));assert(f.needs.status('jp-ramen').seekToilet);f.step();f.done();assert.equal(f.life.state().interrupted,1);assert.equal(f.life.state().completed,0);const saved=f.life.snapshot();assert(saved.needRetryAt['jp-ramen']>saved.clock+19);f.step(1);assert.equal(f.life.state().active,null);f.dispose();
 const g=fixture({toilet,needsSaved,saved});g.step(1);assert.equal(g.life.state().active,null,'Reload does not turn the one-second needs poll into immediate repeated handoffs');g.dispose();
});
