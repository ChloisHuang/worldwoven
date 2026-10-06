// Shared income/personal-meal state can otherwise restore future-funded meals,
// overwrite later wages, refund a different source, or lose a prepaid plate.
// Exercise the original salary/property and meal coordinators at those boundaries.
import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaSalonEconomy} from '../source/game/china-salon-economy.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createChinaSalonReceptionAccount} from '../source/game/china-salon-reception-account.js';
import {SALON_RECEPTION_ROLE as ROLE} from '../source/game/china-salon-reception-role.js';
import {createNPCGuestAccounts,NPC_GUEST_MEAL_PROVIDER} from '../source/game/npc-guest-accounts.js';
import {createNPCPieceworkAccount} from '../source/game/npc-piecework-account.js';
import {PALACE_GARDEN_ROLE as GARDEN} from '../source/game/china-palace-garden-role.js';
import {fixture as tavernFixture} from './china-host-needs.mjs';
const copy=structuredClone,ID=ROLE.incumbentId,NS='chinaSalonReceptionAccount',PROVIDER='china-salon-reception-account',artist='cn-tavern-reciter';
const proof=(n=1)=>({kind:'salon-reception-work',version:1,sessionId:`cn-salon-1-${n}`,actorId:ID,roleId:ROLE.id,slotId:ROLE.slotId,holderRevision:0,contractVersion:1,amount:8,customerId:'player',artistId:artist,activity:'poetry',fee:20,roomId:'tavern-guest-lan',steps:{registerSeconds:2,reserveSeconds:2,closeSeconds:2},completed:true});
const service=p=>({id:p.sessionId,actorId:p.artistId,customerId:p.customerId,activity:p.activity,fee:p.fee,roomId:p.roomId,incomePolicy:{version:1,performerShareBps:5000,rounding:'floor'},completed:true,receptionWork:p});
const meal=(n=1,amount=6)=>({actorId:ID,orderId:`cn-tavern-order-${n}`,amount});
const gardenProof=(day=0,actorId=ID)=>({kind:'npc-edict-piecework',version:1,actorId,roleId:GARDEN.id,slotId:GARDEN.slotId,holderRevision:0,day,documentId:`cn-edict-east-shore:${day}`,audienceId:`cn-morning-audience:${day}`,amount:8,contractVersion:1,steps:{received:true,filed:true,sweepSeconds:7}});
function setup(input){
 let saved=copy(input||{copperLedger:{version:1,cash:1000,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}}),durable=copy(saved),scene=null;
 let account,economy,property,activeProof,mode=null,onSave=null,writes=0;
 const storage={setItem(_key,text){
  if(onSave)onSave();
  if(mode==='false')return false;if(mode==='object')return {ok:false};if(mode==='throw')throw Error('storage unavailable');
  if(mode==='promise')return Promise.resolve(true);if(mode==='rejected-promise')return Promise.reject(Error('unsupported async save'));
  durable=JSON.parse(text);writes++;return true;
 }};
 function store(patch){
  const result=storage.setItem('worlds-days-v1',JSON.stringify({...saved,...patch}));
  if(result===false||result?.ok===false||result?.then)return result;
  Object.assign(saved,copy(patch));if(scene)Object.assign(scene.game,copy(patch));return true;
 }
 const bank=createGameCurrencyLedger({saved,storage,transactionParticipant:tx=>tx.action==='settle'?economy.prepareIncome(tx,activeProof):property?.prepareCurrencyCommit(tx)});
 economy=createChinaSalonEconomy({saved:saved.chinaSalonEconomy,copperLedger:bank,getReceptionAccount:()=>account});
 property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:bank,getClock:()=>({day:0}),getTill:()=>economy.summary().businessProceeds,getReceptionAccount:()=>account,saveState:next=>store({chinaTavernProperty:next})});
 account=createChinaSalonReceptionAccount({saved:saved[NS],getSalonIncome:()=>economy,getProperty:()=>property,saveState:(next,_record,patch)=>store({...patch,[NS]:next})});
 const garden=createNPCPieceworkAccount({role:GARDEN,namespace:'chinaGardenAccounts',saved:saved.chinaGardenAccounts,saveState:(next,_record,patch)=>store({...patch,chinaGardenAccounts:next})});
 const guests=createNPCGuestAccounts([{id:PROVIDER,economy:account},{id:'china-garden-accounts',economy:garden}],{saved:saved.chinaGuestMealAccounts,saveState:(next,patch)=>store({...patch,chinaGuestMealAccounts:next})});
 return {account,economy,property,bank,garden,guests,
  get saved(){return copy(scene?.game||saved);},get durable(){return copy(durable);},get writes(){return writes;},fail:value=>mode=value,onSave:callback=>onSave=callback,
  earn(n=1){const p=proof(n);assert(bank.reserve(p.fee,p.sessionId).ok);activeProof=service(p);const result=bank.settle(p.sessionId);assert(result.ok,result.code);if(scene)Object.assign(scene.game,copy(saved));return result;},
  prepareWage(n=2){const p=proof(n);return economy.prepareIncome({id:`prepared:${p.sessionId}`,action:'settle',currency:'copper',reservationId:p.sessionId,requestId:JSON.stringify(['settle',p.sessionId]),amount:p.fee},service(p));},
  scene(){
   const guest={station:{id:ID,npcName:'Wenwan',npcPosition:[24,.215,10]},root:{position:{x:24,y:.215,z:10,set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];},copy(p){Object.assign(this,{x:p.x,y:p.y,z:p.z});}},rotation:{y:0}},route:[],phase:0,alive:true,animate(){}};
   // This scene fixture has its own original artist payer; keep that independent
   // from the salary-verification economy above instead of fabricating receipts.
   const world=copy(saved);delete world.chinaSalonEconomy;
   scene=tavernFixture(world,{extraActors:[guest],sceneOptions:{guestEconomy:guests,personalMealEconomy:guests,canBorrowGuest:id=>id===ID}});
   Object.assign(scene.game,{chinaSalonEconomy:economy.snapshot(),[NS]:account.snapshot()});
   scene.hungry(false);scene.needs.set(ID,{seekMeal:true,seekToilet:false});
   return {...scene,guest};
  }
 };
}
const fail=(result,code)=>{assert.equal(result.ok,false);if(code)assert.equal(result.code,code);};
const snapshot=f=>({personal:f.account.snapshot(),property:f.property.snapshot(),salon:f.economy.snapshot(),garden:f.garden.snapshot(),guest:f.guests.snapshot(),durable:f.durable});

const f=setup();assert.deepEqual(f.account.account(),{cash:0,bank:0});assert.equal(f.account.hasIncome(ID),false);assert.equal(f.guests.account(ID),null);
assert.equal(f.account.account('cn-garden'),null);fail(f.account.prepareMealPayment(meal()),'insufficient-npc-funds');assert.equal(f.writes,0);
f.earn();assert(f.account.hasIncome(ID));assert.equal(f.guests.providerFor(ID),PROVIDER);
const company=copy(f.property.snapshot()),candidate=f.account.prepareMealPayment(meal()),before=snapshot(f),count=f.writes;
assert(candidate.ok);assert.equal(candidate.balanceAfter,2);assert.deepEqual(candidate.transfer.sourceSplit,{cash:0,bank:6});assert.deepEqual(snapshot(f),before);
const worldPatch={chinaServiceWorld:{marker:'same prepaid order'},chinaSalonReceptionNeeds:{phase:'meal',actorId:ID,orderId:meal().orderId}};
for(const mode of ['false','object','throw','promise','rejected-promise']){
 f.fail(mode);fail(candidate.commit(worldPatch));assert.deepEqual(snapshot(f),before,'failed save adopts neither personal payment nor world patch');
}
f.fail(null);candidate.snapshot.accounts[ID].bank=999;candidate.patch[NS].accounts[ID].bank=999;candidate.transfer.sourceSplit.bank=999;
assert(candidate.commit(worldPatch).ok);assert.equal(f.writes,count+1);assert.equal(f.account.account().bank,2);assert.deepEqual(f.property.snapshot(),company);assert(f.property.verifyReceptionAccount().ok);
assert.deepEqual(f.durable.chinaServiceWorld,worldPatch.chinaServiceWorld);assert.deepEqual(f.durable.chinaSalonReceptionNeeds,worldPatch.chinaSalonReceptionNeeds);
assert(candidate.commit().replayed);assert.equal(f.writes,count+1);
let loaded=setup(f.durable);assert.equal(loaded.account.loadError,null);assert.equal(loaded.guests.loadError,null);assert(loaded.property.verifyReceptionAccount().ok);assert.equal(loaded.account.account().bank,2);
assert(loaded.account.prepareMealPayment(meal()).commit().replayed);assert.equal(loaded.account.snapshot().mealTransfers.length,1);
loaded.earn(2);assert.equal(loaded.account.account().bank,10);const laterCompany=loaded.property.snapshot();
assert(loaded.account.prepareMealRefund(meal()).commit({chinaSalonReceptionNeeds:{phase:'returning'}}).ok);assert.equal(loaded.account.account().bank,16);
assert.deepEqual(loaded.property.snapshot(),laterCompany);assert(loaded.property.verifyReceptionAccount().ok);
assert.deepEqual(loaded.account.snapshot().receipts.map(row=>row.sequence),[1,3]);assert.deepEqual(loaded.account.snapshot().mealTransfers.map(row=>row.sequence),[2,4]);
assert(loaded.account.prepareMealRefund(meal()).commit().replayed);fail(loaded.account.prepareMealPayment(meal()),'reception-meal-conflict');
for(const input of [{...meal(),actorId:'cn-garden'},{...meal(),amount:5},{...meal(),amount:0},{...meal(),amount:'6'},{...meal(),orderId:'cn-tavern-order-01'}])fail(loaded.account.prepareMealRefund(input));
assert.equal(setup(loaded.durable).account.account().bank,16);
console.log('PASS zero-origin wages fund only personal meals; one whole-world save, failed/async retry, detached candidates, exact bank refund after later wages, unchanged company expense and property verification');

const legacy=setup();legacy.earn();legacy.earn(2);const v1=legacy.durable;v1[NS].version=1;delete v1[NS].mealTransfers;
const migrated=setup(v1);assert.equal(migrated.account.loadError,null);assert.equal(migrated.writes,0);assert.equal(migrated.account.snapshot().version,2);assert.equal(migrated.account.account().bank,16);assert.deepEqual(migrated.account.snapshot().receipts,v1[NS].receipts);assert(migrated.property.verifyReceptionAccount().ok);
assert(migrated.account.prepareMealPayment(meal()).commit().ok);assert.equal(setup(migrated.durable).account.account().bank,10);
const emptyV1={version:1,revision:0,accounts:{[ID]:{cash:0,bank:0}},receipts:[]};assert.deepEqual(setup({[NS]:emptyV1}).account.account(),{cash:0,bank:0});
const chronology=setup();chronology.earn();chronology.earn(2);assert(chronology.account.prepareMealPayment(meal(1,10)).commit().ok);
const future=chronology.durable;future[NS].receipts[1].sequence=3;future[NS].mealTransfers[0].sequence=2;
assert.equal(setup(future).account.loadError,'insufficient-npc-funds','later salary cannot fund an earlier payment despite identical positive final balance');
for(const mutate of [
 s=>{s[NS].accounts[ID].cash++;},s=>{s[NS].accounts[ID].bank++;},s=>{s[NS].revision++;},s=>{s[NS].mealTransfers[0].sourceSplit={cash:6,bank:0};},
 s=>{s[NS].mealTransfers[1].actorId='cn-garden';},s=>{s[NS].mealTransfers[1].amount=5;},s=>{s[NS].mealTransfers[1].kind='gift';},s=>{s[NS].mealTransfers[0].sequence=3;},
 s=>{s[NS].mealTransfers.reverse();},s=>{s[NS].receipts.reverse();},s=>{s[NS].mealTransfers.push(copy(s[NS].mealTransfers[0]));},s=>{s[NS].accounts['cn-garden']={cash:0,bank:0};},
 s=>{s[NS].version=1;},s=>{s[NS].extra='unverified';},s=>{delete s[NS];},s=>{s.chinaTavernProperty.events.pop();}
]){
 const bad=loaded.durable;mutate(bad);const rejected=setup(bad);assert(rejected.account.loadError);assert.equal(rejected.account.account(),null);assert.equal(rejected.account.hasIncome(ID),false);fail(rejected.account.prepareMealPayment(meal(9)));fail(rejected.account.prepareWage({proof:proof(9)}));
 if(bad[NS])assert.deepEqual(rejected.account.snapshot(),bad[NS],'checkpoint preserves rejected evidence');
}
console.log('PASS strict V1 migration and V2 chronological reconstruction reject future-funded meals, source/person/refund tampering, reorder/duplicates, forged balances and missing business counterparts');

{
 const g=setup();g.earn();const pendingMeal=g.account.prepareMealPayment(meal());g.earn(2);const before=snapshot(g);fail(pendingMeal.commit(),'stale-npc-meal');assert.deepEqual(snapshot(g),before);
 const pendingWage=g.prepareWage(3);assert(pendingWage.ok);assert(pendingWage.valid());assert(g.account.prepareMealPayment(meal()).commit().ok);const after=snapshot(g);assert.equal(pendingWage.valid(),false);assert.equal(pendingWage.committed(),false);assert.deepEqual(snapshot(g),after);
 const original=g.economy.snapshot().receipts[0],replay=g.account.prepareWage({proof:proof(),settlementReceipt:original});assert(replay.ok&&replay.replayed);assert(g.account.prepareMealRefund(meal()).commit().ok);assert.equal(replay.valid(),false);assert.equal(replay.committed(),false);
 const paid=g.account.prepareMealPayment(meal(2)),wage=g.prepareWage(3);assert(paid.lock());assert.equal(paid.lock(),false);assert.equal(wage.valid(),false);assert.equal(wage.committed(),false);fail(g.account.prepareMealPayment(meal(3)),'npc-ledger-busy');fail(g.prepareWage(4),'npc-ledger-busy');paid.release();assert(paid.valid());fail(paid.committed(),'stale-npc-meal');
 let checks=0;g.onSave(()=>{checks++;fail(g.account.prepareMealRefund(meal(2)),'npc-ledger-busy');fail(g.prepareWage(3),'npc-ledger-busy');assert.equal(wage.committed(),false);});assert(paid.commit().ok);assert.equal(checks,1);g.onSave(null);g.earn(3);assert.equal(setup(g.durable).account.loadError,null);
 const guard=g.account.prepareMealGuard();assert(guard.valid());assert(guard.lock());fail(g.prepareWage(4),'npc-ledger-busy');guard.release();assert(guard.valid());g.earn(4);assert.equal(guard.valid(),false);
 for(const patch of [null,[],{[NS]:{}}])fail(g.account.prepareMealPayment(meal(5)).commit(patch),'invalid-reception-meal-patch');
}
console.log('PASS meal/wage/replay candidates share stale boundaries; direct saves and aggregate guards block reentrant wages/payments, release correctly, and reject authority-overwriting patches');

{
 const g=setup();g.earn();assert(g.garden.settle(gardenProof()).ok);assert(g.garden.settle(gardenProof(1,'cn-garden')).ok);
 const other=g.garden.account('cn-garden'),property=g.property.snapshot(),pending=g.guests.prepareMealPayment(meal(1,12)),before=snapshot(g);assert(pending.ok);assert.equal(g.guests.providerFor(ID),NPC_GUEST_MEAL_PROVIDER);
 for(const mode of ['false','throw','rejected-promise']){g.fail(mode);fail(pending.commit(worldPatch));assert.deepEqual(snapshot(g),before);}
 g.fail(null);g.onSave(()=>{fail(g.prepareWage(2),'npc-ledger-busy');fail(g.garden.settle(gardenProof(2)),'npc-ledger-busy');});assert(pending.commit(worldPatch).ok);g.onSave(null);
 assert.equal(g.account.account().bank,0);assert.equal(g.garden.account(ID).bank,4);assert.deepEqual(g.garden.account('cn-garden'),other);assert.deepEqual(g.property.snapshot(),property);
 assert.deepEqual(g.guests.snapshot().transfers[0].portions.map(p=>[p.providerId,p.amount,p.sourceSplit]),[[PROVIDER,8,{cash:0,bank:8}],['china-garden-accounts',4,{cash:0,bank:4}]]);
 const r=setup(g.durable);assert.equal(r.guests.loadError,null);r.earn(2);assert(r.guests.prepareMealRefund(meal(1,12)).commit().ok);assert.equal(r.account.account().bank,16);assert.equal(r.garden.account(ID).bank,8);assert.deepEqual(r.garden.account('cn-garden'),other);assert.equal(setup(r.durable).guests.loadError,null);
}
{
 const g=setup();assert(g.garden.settle(gardenProof()).ok);assert(g.garden.settle(gardenProof(1)).ok);
 // Give the receptionist a zero portion in an aggregate payment. Its guard
 // still rejects a reentrant salary or newly introduced duplicate order.
 const alternate=createNPCGuestAccounts([{id:'china-garden-accounts',economy:g.garden},{id:PROVIDER,economy:g.account}],{saveState:()=>{fail(g.prepareWage(),'npc-ledger-busy');fail(g.account.prepareMealPayment(meal()),'npc-ledger-busy');return true;}});
 g.earn();assert(alternate.prepareMealPayment(meal()).commit().ok);assert.equal(g.account.account().bank,8);
}
console.log('PASS split provider one-save adoption, failed saves, zero-portion locking, unchanged other person/business funds and original-source refund after subsequent salary');

// The adapter can verify a saved pending/collected order even before scene QA.
{
 const g=setup();g.earn();const order={id:meal().orderId,customerId:ID,price:6,collected:false},lease={actorId:ID,orderId:order.id,accountProvider:PROVIDER};
 assert(g.guests.validMealLease(lease,order));order.collected=true;assert.equal(g.guests.validMealLease(lease,order),false);
 assert(g.account.prepareMealPayment(meal()).commit({chinaServiceWorld:{order,lease}}).ok);const r=setup(g.durable);assert(r.guests.validMealLease(lease,order));
 assert.equal(r.guests.validMealLease({...lease,actorId:'cn-garden'},order),false);assert.equal(r.guests.validMealLease({...lease,accountProvider:'china-garden-accounts'},order),false);
 assert(r.account.prepareMealRefund(meal()).commit().ok);assert.equal(r.guests.validMealLease(lease,order),false);
}

for(const prepaid of [false,true]){
 const g=setup();g.earn();const s=g.scene();assert(s.scene.registerGuestPerson(ID));assert(s.scene.requestGuestMeal(ID));assert.equal(s.scene.guestMeal(ID).accountProvider,PROVIDER);
 if(prepaid)s.until(()=>s.scene.snapshot().orders.some(o=>o.customerId===ID&&o.payment==='reserved'),'original host collects receptionist-owned earnings');
 const saved=g.saved,orderId=s.scene.guestMeal(ID).orderId,bank=g.account.account().bank;
 const r=setup(saved),rs=r.scene();assert.equal(rs.scene.state().loadError,null);assert.equal(rs.scene.guestMeal(ID).orderId,orderId);assert.equal(r.account.account().bank,bank);
 if(!prepaid)rs.until(()=>rs.scene.snapshot().orders.some(o=>o.customerId===ID&&o.payment==='reserved'),'restored unpaid receptionist order collects once');
 assert.equal(r.account.account().bank,2);r.fail('false');assert.equal(rs.scene.cancelGuestMeal(ID),false);assert.equal(r.account.account().bank,2);
 r.fail(null);rs.guest.alive=false;assert(rs.scene.cancelGuestMeal(ID));assert.equal(r.account.account().bank,8);assert.equal(rs.scene.cancelGuestMeal(ID),false);assert.equal(setup(r.saved).account.loadError,null);
 if(prepaid){const c=setup(saved),cs=c.scene();cs.until(()=>!cs.scene.guestMeal(ID),'same original prepaid plate consumed once');assert.equal(c.account.account().bank,2);assert.equal(cs.scene.snapshot().mealReceipts.filter(row=>row.actorId===ID).length,1);assert.equal(c.account.snapshot().mealTransfers.length,1);}
}
console.log('PASS saved unpaid/prepaid receptionist lease keeps original payer and order; real host collection, failed cancellation retry, death refund and same original dish consumed exactly once');
