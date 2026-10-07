// The actual currency ledger is the payment authority. These focused journal
// tests protect against invented NPC funds, wrong-currency back-pay, duplicate
// payouts and partial employment/currency saves; they do not claim scene QA.
import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createJapanPerformanceEconomy,JAPAN_PERFORMANCE_ACTOR_IDS} from '../source/game/japan-performance-economy.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const MAI='jp-salon-mai',ICHIRO='jp-salon-ichiro',RECEPTION='jp-performance-reception';
function fixture(input={}){
 const saved=copy(input);let durable=copy(saved),economy,pending=null,failure=null,writes=0;
 const storage={setItem(key,value){if(failure==='all'||failure==='wage'&&JSON.parse(value).copperLedger.transactions.at(-1)?.action==='wage')return false;durable=JSON.parse(value);writes++;return true;}};
 const ledger=createGameCurrencyLedger({saved,storage,transactionParticipant:tx=>pending?economy.prepareSettle(pending,[{actorId:'player',amount:tx.amount}],{transaction:tx}):null});
 economy=createJapanPerformanceEconomy({saved:saved.japanPerformanceEconomy,copperLedger:ledger,getServiceHistory:()=>saved.performanceHistory||[],saveState(next,record,patch){
  if(failure==='all')return false;if(failure==='throw')throw Error('blocked');if(failure==='async')return Promise.resolve(false);
  const merged={...saved,...patch,japanPerformanceEconomy:next};if(storage.setItem('test',JSON.stringify(merged))===false)return false;Object.assign(saved,merged);return true;
 }});
 function fund(){assert(ledger.creditWageToBank({amount:100,receiptId:'test-existing-japan-wage',currency:'japan',roleId:'jp-frontdesk-assistant',slotId:'jp-frontdesk',day:0}).ok);assert(ledger.withdraw(100,'test-withdraw','japan').ok);assert(ledger.earn(20,'test-old-copper').ok);}
 function source({artistId=MAI,activity='dance',part='act',amount=8,currency='japan',outcome='settled'}={}){
  const id=`jp-performance-1-${(saved.performanceHistory?.length||0)+1}-${ledger.state().nextTransaction}`,reservation=id+':'+part;
  assert(ledger.reserve(amount,reservation,currency).ok);if(outcome==='settled')assert(ledger.settle(reservation).ok);if(outcome==='refunded')assert(ledger.refund(reservation).ok);
  const event={eventId:id+':'+part+'-completed',orderId:id,outcome:part+'-completed',artistId,activity,participants:['player',artistId,RECEPTION],amount,currency,time:1};
  (saved.performanceHistory??=[]).push(event);return event;
 }
 const order=(serial,customerId=MAI,roleId=ICHIRO,activity='tea',amount=6,drink=null)=>({id:'jp-performance-work-'+serial,customerId,roleId,activity,drink,amount,day:2});
 const pay=id=>{const hold=economy.hold(id);pending=id;try{return ledger.creditWageToBank({amount:hold.amount,receiptId:id,currency:'japan',roleId:hold.roleId,slotId:hold.roleId+'-1',day:hold.day});}finally{pending=null;}};
 const total=()=>{const b=ledger.balances().japan;return b.cash+b.bank+b.held+JAPAN_PERFORMANCE_ACTOR_IDS.reduce((n,id)=>{const a=economy.account(id);return n+a.cash+a.bank+a.held;},0);};
 return {saved,ledger,economy,fund,source,order,pay,total,get durable(){return copy(durable);},get writes(){return writes;},set failure(value){failure=value;}};
}
{
 const f=fixture();assert.equal(f.economy.loadError,null);for(const id of JAPAN_PERFORMANCE_ACTOR_IDS)assert.deepEqual(f.economy.account(id),{currency:'japan',cash:0,bank:0,held:0});
 assert.equal(f.economy.prepareReserve(f.order(1)).code,'insufficient-performance-funds');assert.equal(f.economy.account('synthetic-visitor'),null);
 f.fund();const initial=f.total();f.source();f.source({artistId:ICHIRO,activity:'story',amount:7});f.source({part:'drink',amount:2});
 assert(f.economy.syncIncome().ok);assert.equal(f.total(),initial);assert.equal(f.economy.account(MAI).cash,8);assert.equal(f.economy.account(ICHIRO).cash,7);assert.equal(f.economy.account(RECEPTION).cash,2);
 const before=f.writes;assert(f.economy.syncIncome().replayed);assert.equal(f.writes,before);assert.equal(f.economy.snapshot().receipts.length,3);
 const loaded=fixture(f.durable);assert.equal(loaded.economy.loadError,null);assert.equal(loaded.total(),initial);assert(loaded.economy.syncIncome().replayed);
 console.log('PASS no opening funds; full real Japan act/drink fees credit only original provider once, with conserved reload');
}
{
 const f=fixture();f.fund();f.source({currency:'copper'});f.source({outcome:'reserved'});f.source({outcome:'refunded'});
 const fabricated={eventId:'jp-performance-1-99-99:act-completed',orderId:'jp-performance-1-99-99',outcome:'act-completed',artistId:MAI,activity:'dance',participants:['player',MAI,RECEPTION],amount:8,currency:'japan'};
 f.saved.performanceHistory.push(fabricated);assert(f.economy.syncIncome().replayed);for(const id of JAPAN_PERFORMANCE_ACTOR_IDS)assert.equal(f.economy.account(id).cash,0);
 const real=f.source();for(const patch of [{artistId:ICHIRO},{amount:9},{currency:'copper'},{participants:['player',MAI]},{outcome:'requested'},{eventId:'other'},{orderId:'jp-performance-work-1'}])assert(f.economy.prepareSyncIncome([{...real,...patch}]).replayed);
 assert(f.economy.syncIncome().ok);assert.equal(f.economy.account(MAI).cash,8);
 console.log('PASS copper, reserved, refunded, fabricated and mismatched source events cannot fund new Japan orders');
}
{
 const f=fixture();f.fund();f.source();assert(f.economy.syncIncome().ok);const initial=f.total(),order=f.order(1);
 assert(f.economy.prepareReserve(order).commit({japanPerformanceEmployment:{active:order.id}}).ok);assert.equal(f.saved.japanPerformanceEmployment.active,order.id);assert.equal(f.economy.account(MAI).cash,2);assert.equal(f.economy.account(MAI).held,6);assert.equal(f.total(),initial);
 assert(f.economy.prepareReserve(order).replayed);for(const patch of [{customerId:'new-guest'},{customerId:ICHIRO},{roleId:MAI},{amount:0},{amount:7},{activity:'dance'},{day:-1},{id:'fake-1'},{id:'jp-performance-work-9007199254740992'},{currency:'copper'}])assert.equal(f.economy.prepareReserve({...order,...patch}).ok,false);
 const loaded=fixture(f.durable);assert.equal(loaded.economy.loadError,null);assert.equal(loaded.economy.account(MAI).held,6);assert(loaded.economy.prepareRefund(order.id).commit({japanPerformanceEmployment:null}).ok);assert.equal(loaded.economy.account(MAI).cash,8);assert.equal(loaded.total(),initial);assert(loaded.economy.prepareRefund(order.id).replayed);assert.equal(loaded.economy.prepareReserve(order).ok,false);
 const order2=loaded.order(2);assert(loaded.economy.prepareReserve(order2).commit().ok);assert.equal(loaded.economy.prepareSettle(order2.id,MAI).ok,false);assert(loaded.economy.prepareSettle(order2.id,ICHIRO).commit().ok);assert.equal(loaded.economy.account(ICHIRO).cash,6);assert.equal(loaded.total(),initial);assert.equal(loaded.economy.prepareRefund(order2.id).ok,false);assert(loaded.economy.prepareSettle(order2.id,ICHIRO).replayed);assert.equal(fixture(loaded.durable).economy.loadError,null);
 console.log('PASS own earned balance reserves/refunds atomically; original NPC provider settles once without creating new money or self-orders');
}
{
 const f=fixture();f.fund();f.source();assert(f.economy.syncIncome().ok);const initial=f.total(),o=f.order(1);assert(f.economy.prepareReserve(o).commit().ok);
 f.failure='wage';const before=copy(f.saved),snapshot=f.economy.snapshot();assert.equal(f.pay(o.id).ok,false);assert.deepEqual(f.saved,before);assert.deepEqual(f.economy.snapshot(),snapshot);assert.equal(f.total(),initial);
 f.failure=null;assert(f.pay(o.id).ok);assert.equal(f.economy.hold(o.id).status,'settled');assert.equal(f.ledger.balances().japan.bank,6);assert.equal(f.total(),initial);assert(f.pay(o.id).replayed);assert.equal(f.total(),initial);
 const loaded=fixture(f.durable);assert.equal(loaded.economy.loadError,null);assert.equal(loaded.total(),initial);assert(loaded.pay(o.id).replayed);
 const tx=f.ledger.history().at(-1);for(const patch of [{currency:'copper'},{amount:7},{requestId:'wrong'},{roleId:MAI},{day:9},{slotId:'wrong'}])assert.equal(f.economy.prepareSettle(o.id,'player',{transaction:{...tx,...patch}}).ok,false);
 assert.equal(f.economy.prepareSettle(o.id,'player',{transaction:tx}).commit().code,'currency-participant-required');assert.equal(f.economy.prepareRefund(o.id).ok,false);
 console.log('PASS NPC-to-player wage is one currency/economy save, bank-only; failed storage, replay and reload cannot mint or double-spend');
}
{
 for(const failure of ['all','throw','async']){
  const f=fixture();f.fund();f.source();f.failure=failure;assert.equal(f.economy.syncIncome().ok,false);assert.equal(f.economy.account(MAI).cash,0);f.failure=null;assert(f.economy.syncIncome().ok);
  const before=f.economy.snapshot();f.failure=failure;assert.equal(f.economy.prepareReserve(f.order(1)).commit().ok,false);assert.deepEqual(f.economy.snapshot(),before);f.failure=null;assert(f.economy.prepareReserve(f.order(1)).commit().ok);
  const held=f.economy.snapshot();f.failure=failure;assert.equal(f.economy.prepareRefund('jp-performance-work-1').commit().ok,false);assert.deepEqual(f.economy.snapshot(),held);f.failure=null;assert(f.economy.prepareRefund('jp-performance-work-1').commit().ok);
 }
 const f=fixture();f.fund();f.source();assert(f.economy.syncIncome().ok);const old=f.economy.prepareReserve(f.order(1)),fresh=f.economy.prepareReserve(f.order(2));assert(fresh.commit().ok);assert.equal(old.commit().code,'stale-performance-candidate');
 const refund=f.economy.prepareRefund('jp-performance-work-2');assert(refund.lock());assert.equal(f.economy.prepareReserve(f.order(3)).code,'performance-ledger-busy');assert(refund.committed());assert(refund.committed());refund.release();assert(f.economy.prepareReserve(f.order(3)).ok);
 const noWriter=createJapanPerformanceEconomy({saved:f.economy.snapshot(),copperLedger:f.ledger});assert.equal(noWriter.prepareReserve(f.order(3)).commit().code,'persistence-unavailable');
 assert.equal(noWriter.prepareReserve(f.order(3)).commit({copperLedger:{}}).code,'invalid-performance-save-patch');
 console.log('PASS failed/throwing/async/missing saves, stale candidates and reentrancy leave durable and in-memory balances unchanged');
}
{
 const f=fixture();f.fund();f.source();assert(f.economy.syncIncome().ok);assert(f.economy.prepareReserve(f.order(1)).commit().ok);assert(f.pay('jp-performance-work-1').ok);
 for(const mutate of [s=>s.accounts[MAI].cash++,s=>s.accounts['extra']={cash:1,bank:0},s=>s.accounts[MAI].bank=1,s=>s.revision++,s=>s.holds[0].amount++,s=>s.holds[0].customerId=RECEPTION,s=>s.receipts[0].amount++,s=>s.receipts[0].settlementId='currency-999',s=>s.receipts[0].proof.currency='copper',s=>s.transfers[0].sequence++,s=>s.transfers.at(-1).settlementId='currency-999',s=>s.unknown=true]){
  const saved=f.durable;mutate(saved.japanPerformanceEconomy);const loaded=fixture(saved);assert(loaded.economy.loadError);assert.equal(loaded.economy.account(MAI),null);assert.equal(loaded.economy.prepareReserve(f.order(2)).ok,false);assert.deepEqual(loaded.economy.snapshot(),saved.japanPerformanceEconomy);
 }
 const missing=copy(f.durable);delete missing.copperLedger;assert(fixture(missing).economy.loadError);
 // A different artist cannot claim an already allocated tea receipt.
 const g=fixture();g.fund();const tea=g.source({activity:'tea',amount:6});assert(g.economy.syncIncome().ok);assert.equal(g.economy.prepareSyncIncome([{...tea,artistId:ICHIRO,participants:['player',ICHIRO,RECEPTION]}]).code,'performance-income-conflict');
 // Service history is bounded elsewhere. The retained, source-verified proof
 // lets a legitimate old earning reload after its UI history is pruned.
 const pruned=copy(f.durable);pruned.performanceHistory=[];assert.equal(fixture(pruned).economy.loadError,null);
 console.log('PASS malformed balances, journal, currency and cross-ledger proofs fail closed without overwriting corrupt data');
}
{
 // One actual original source service, including its physical arrival, player
 // seat, artist runtime and delivered drink. No manually authored income proof.
 const {createJapanPerformanceService}=await import('../source/game/japan-performance-service.js');
 const {PERFORMANCE_CAST,PERFORMANCE_SEATS,PERFORMANCE_POINTS:P}=await import('../source/game/japan-performance-cast.js');
 const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
 class V{constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}copy(p){return this.set(p.x,p.y,p.z);}clone(){return new V(this.x,this.y,this.z);}toArray(){return [this.x,this.y,this.z];}distanceToSquared(p){return (this.x-p.x)**2+(this.y-p.y)**2+(this.z-p.z)**2;}}
 const f=fixture();f.fund();const initial=f.total();
 const make=(position,station)=>({station,ageYears:station.ageYears,root:{position:new V(...position),rotation:{y:0},userData:{}},home:new V(...position),locomotion:{walkSpeed:5},animate(){}});
 const npcs=PERFORMANCE_CAST.map(a=>make(a.position,{id:a.id,npcName:a.name,ageYears:a.ageYears,performance:{...a}})),player=make(P.reception,{id:'player',ageYears:24});let mounted=null,time=0;
 const furniture={items:PERFORMANCE_SEATS,facilities:createFacilityQueue(),canSit:()=>true,standPoint:(navigation,extra,seat)=>new V(...seat.position)};
 const service=createJapanPerformanceService({npcs,furniture,navigation:{legacyGround:false,surfaces:[{minX:-12,maxX:12,minZ:-15,maxZ:9,y:7.6}]},doors:{routeStep(path,p){while(path.length&&p.distanceToSquared(path[0])<.008)path.shift();return {waypoint:path[0]};}},planPath:(a,b)=>[new V(b.x,b.y,b.z)],moveActor:(a,x,z)=>{a.root.position.x+=x;a.root.position.z+=z;},poseContext:()=>({}),getPlayer:()=>player,getMounted:()=>mounted,copperLedger:f.ledger,saveState:s=>{f.saved.originalPerformance=s;}});
 const until=predicate=>{for(let i=0;i<800&&!predicate();i++){time+=.1;service.update(.1,time);}assert(predicate(),JSON.stringify(service.view()));};
 assert(service.request(MAI,'dance','tea'));until(()=>service.view().order?.status==='accepted');assert(service.confirm());assert(f.economy.syncIncome(service.state().history).replayed);
 mounted=PERFORMANCE_SEATS[0];player.root.position.set(...mounted.anchor);until(()=>!service.active());
 assert(f.economy.syncIncome(service.state().history).ok);assert.equal(f.economy.account(MAI).cash,8);assert.equal(f.economy.account(RECEPTION).cash,2);assert.equal(f.total(),initial);assert(f.economy.syncIncome(service.state().history).replayed);
 const loaded=fixture(f.durable);assert.equal(loaded.economy.loadError,null);assert.equal(loaded.total(),initial);service.dispose();furniture.facilities.dispose();
 console.log('PASS actual original dance and delivered tea produce the only source proofs used for conserved earned NPC funds');
}
