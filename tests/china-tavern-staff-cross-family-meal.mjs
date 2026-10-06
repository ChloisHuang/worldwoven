// Real property/guard evidence feeds the existing staff scene and original
// order pipeline. The shared fixture uses direct routes/renderer stubs; this
// checks money, saved leases and work gates, not long stair/toilet navigation.
import assert from 'node:assert/strict';
import {fixture as tavernFixture} from './china-host-needs.mjs';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCGuestAccounts,NPC_GUEST_MEAL_PROVIDER as AGGREGATE} from '../source/game/npc-guest-accounts.js';
import {PALACE_GUARD_ROLE as GUARD} from '../source/game/formal-careers.js';
import {GAME_MINUTES_PER_SECOND as RATE} from '../source/game/simulation-clock.js';
import {TAVERN_MEAL as M} from '../source/game/china-tavern-kitchen.js';
const copy=structuredClone,PROVIDER='tavern-personal-funds',NEXT='cn-resident-next';
function earn(account,id=M.cook,day=20){const coverage=[{actorId:id,roleId:GUARD.id,slotId:GUARD.slotId,holderRevision:day}];let time=(day*1440+360-600)/RATE,end=time+90/RATE;account.observe({seconds:time,dt:.25,coverage});while(time<end){const dt=Math.min(.25,end-time);time+=dt;account.observe({seconds:time,dt,coverage});}assert(account.checkpoint({day,hour:18}));}
function financial(input){
 const game=copy(input||{copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}});let property,day=0;
 const store=patch=>{Object.assign(game,copy(patch));return true;},ledger=createGameCurrencyLedger({saved:game,storage:{setItem:()=>true},transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
 property=createChinaTavernProperty({saved:game.chinaTavernProperty,copperLedger:ledger,getClock:()=>({day}),getTill:()=>game.chinaServiceWorld?.till||0,saveState:(next,patch={})=>store({...patch,chinaTavernProperty:next}),worldSeed:1});
 const guard=createNPCDutyAccount({role:GUARD,namespace:'chinaGuardAccounts',saved:game.chinaGuardAccounts,saveState:(next,_receipt,patch={})=>store({...patch,chinaGuardAccounts:next})});
 const aggregate=createNPCGuestAccounts([{id:PROVIDER,economy:property.mealFundsProvider()},{id:'china-guard-accounts',economy:guard}],{saved:game.chinaGuestMealAccounts,saveState:(next,patch)=>store({...patch,chinaGuestMealAccounts:next})});
 return {game,property,guard,aggregate,cookPurse(total){
  for(let tries=0;tries<8;tries++){assert(property.refreshDay().ok);const s=property.state();if(s.market.willing){assert(property.applyPurchase(s.market.price,s.revision).ok);assert(property.confirmPurchase(property.state().revision).ok);break;}day++;}
  assert.equal(property.state().ownerId,'player');day=10;assert(property.refreshDay().ok);assert(property.setPrice(240-total).ok);const s=property.state(),offer=s.market.offers.find(o=>o.buyerId===M.cook&&o.amount===240-total);assert(offer);assert(property.replyOffer(offer.id,true,s.revision).ok);assert.equal(property.npcAccount(M.cook).total,total);
 }};
}
function setup(input,{legacy=false,cookTotal=4,guardIncome=true,id=M.cook,probeMalformed=false}={}){
 const pre=financial(input);if(!input){if(cookTotal!==null)pre.cookPurse(cookTotal);if(guardIncome)earn(pre.guard,id);}
 let resolver=pre.aggregate,fail=false,saves=[],malformedChecks=0;
 const proxy=Object.fromEntries(['account','providerFor','forProvider','prepareMealPayment','prepareMealRefund','validMealLease'].map(method=>[method,(...args)=>resolver[method](...args)]));
 const f=tavernFixture(pre.game,{dynamicRole:true,dynamicKitchen:true,enableKitchenNeeds:true,sceneOptions:{...(!legacy?{personalMealEconomy:proxy,enableStaffPersonalFunds:true}:{}),getClock:()=>({day:10,hour:10})}});
 const store=patch=>{if(fail)return false;Object.assign(f.game,copy(patch));return true;};
 const guard=createNPCDutyAccount({role:GUARD,namespace:'chinaGuardAccounts',saved:f.game.chinaGuardAccounts,saveState:(next,_receipt,patch={})=>store({...patch,chinaGuardAccounts:next})});
 resolver=createNPCGuestAccounts([{id:PROVIDER,economy:f.property.mealFundsProvider()},{id:'china-guard-accounts',economy:guard}],{saved:f.game.chinaGuestMealAccounts,saveState:(next,patch)=>{if(fail)return false;const all={...patch,chinaGuestMealAccounts:next};saves.push(copy(all));return store(all);}});
 if(probeMalformed)proxy.prepareMealPayment=details=>{
  const candidate=resolver.prepareMealPayment(details);if(!candidate.ok)return candidate;
  return {...candidate,commit(patch){
   const snapshot=()=>copy({property:f.property.snapshot(),guard:guard.snapshot(),aggregate:resolver.snapshot(),world:f.scene.snapshot(),game:f.game}),before=snapshot(),bad=copy(patch);
   bad.chinaServiceWorld.orders.find(o=>o.id===details.orderId).price=4;
   assert.equal(candidate.commit(bad).ok,false,'actual proposed order price4 cannot prove aggregate total6');assert.deepEqual(snapshot(),before,'all journals and the live order remain unchanged after malformed scene proposal');
   const result=candidate.commit(patch);assert(result.ok,'same candidate accepts the original full-price scene proposal');malformedChecks++;return result;
  }};
 };
 f.hungry(false);f.needs.set(id,{seekMeal:true,seekToilet:false});f.registered.add(id);
 return {...f,guard,aggregate:resolver,get saves(){return copy(saves);},get malformedChecks(){return malformedChecks;},fail(value){fail=value;f.reject(value);},earn:(actorId=id,day=21)=>earn(guard,actorId,day)};
}
const lease=(f,id)=>copy(id===M.host?f.scene.snapshot().hostDiner:f.scene.snapshot().kitchenDiner);
const order=(f,id)=>copy(f.scene.snapshot().orders.find(o=>o.customerId===id&&o.stage!=='done'));
const cancel=(f,id)=>id===M.host?f.scene.cancelHostMeal():f.scene.cancelKitchenMeal();
const money=f=>({property:f.property.snapshot(),guard:f.guard.snapshot(),aggregate:f.aggregate.snapshot(),world:copy(f.scene.snapshot()),game:copy(f.game)});
const company=f=>{const s=f.property.state();return Object.fromEntries(['ownerId','ownership','invested','paidWages','drawn','balance'].map(k=>[k,s[k]]));};

const f=setup(null,{probeMalformed:true}),ids=f.npcs.map(n=>n.station.id),roles=copy(f.kitchenRoles.state()),hostRole=copy(f.hostRole.state());
assert.equal(f.property.state().ownerId,M.cook);assert.equal(f.hostRole.state().holderId,M.host);assert.equal(f.scene.kitchenRole('chef').holderId,M.cook);assert.deepEqual(f.aggregate.account(M.cook),{cash:4,bank:3});
f.until(()=>f.scene.kitchenBreak()?.phase==='draining','original cook requests break after combined funds qualify');assert(!lease(f,M.cook));assert.equal(f.aggregate.snapshot().transfers.length,0);assert(f.scene.snapshot().orders.some(o=>!['done','dirty','return','wash'].includes(o.stage)),'existing guests keep the original work gate');
f.until(()=>f.scene.kitchenBreak()?.phase==='ordering','original guest work drained before cook ordering');const before=company(f),other=f.property.npcAccount(M.assistant),hostFunds=f.property.npcAccount(M.host);
f.until(()=>!!lease(f,M.cook),'same cook creates prepaid plate');const paid=order(f,M.cook),paidLease=lease(f,M.cook);assert.equal(paid.price,6);assert.equal(paid.payment,'reserved');assert.equal(paidLease.accountProvider,AGGREGATE);assert.equal(paidLease.actorId,M.cook);assert.equal(f.malformedChecks,1);assert.equal(f.saves.length,1);assert(f.saves[0].chinaServiceWorld.orders.some(o=>o.id===paid.id&&o.price===6&&o.payment==='reserved'));assert(f.saves[0].chinaTavernProperty&&f.saves[0].chinaGuardAccounts&&f.saves[0].chinaGuestMealAccounts);
assert.deepEqual(f.aggregate.snapshot().transfers[0].portions.map(p=>[p.providerId,p.amount,p.sourceSplit]),[[PROVIDER,4,{cash:4,bank:0}],['china-guard-accounts',2,{cash:0,bank:2}]]);assert.equal(f.property.npcAccount(M.cook).total,0);assert.equal(f.guard.account(M.cook).bank,1);assert.deepEqual(company(f),before);assert.deepEqual(f.property.npcAccount(M.assistant),other);assert.deepEqual(f.property.npcAccount(M.host),hostFunds);assert.deepEqual(f.npcs.map(n=>n.station.id),ids);assert.deepEqual(f.kitchenRoles.state(),roles);assert.deepEqual(f.hostRole.state(),hostRole);
const paidSave=copy(f.game),reloaded=setup(paidSave),held=money(reloaded);reloaded.fail(true);assert.equal(cancel(reloaded,M.cook),false);assert.deepEqual(money(reloaded),held);reloaded.fail(false);const dead=reloaded.npcs.find(n=>n.station.id===M.cook),position=dead.root.position.toArray();dead.alive=false;assert(cancel(reloaded,M.cook));assert.deepEqual(dead.root.position.toArray(),position);assert.deepEqual(reloaded.aggregate.account(M.cook),{cash:4,bank:3});assert.equal(cancel(reloaded,M.cook),false);assert.equal(setup(reloaded.game).aggregate.loadError,null);
const served=setup(paidSave);served.until(()=>served.scene.snapshot().mealReceipts?.some(r=>r.orderId===paid.id),'original plate physically delivered and consumed once');assert.deepEqual(served.aggregate.account(M.cook),{cash:0,bank:1});assert.equal(served.aggregate.snapshot().transfers.length,1);assert.equal(served.scene.snapshot().mealReceipts.filter(r=>r.orderId===paid.id).length,1);
console.log('PASS lawful cook4+guard3 drains original work, buys original6 plate in one4+2 world save, keeps jobs/bodies/business intact, refunds exactly after failed save/death/reload and consumes once');

{
 const gate=setup();gate.hireChef();gate.tick(80);assert(!lease(gate,M.cook));assert.equal(gate.aggregate.snapshot().transfers.length,0);assert.deepEqual(gate.aggregate.account(M.cook),{cash:4,bank:3});assert.equal(gate.scene.kitchenRole('chef').holderId,'player');
}
console.log('PASS actual malformed scene price4 proposal rejects unchanged, same candidate retries original6 in one save; absent player-owned kitchen post cannot fabricate an unattended self-meal');

for(const id of [M.host,M.assistant]){
 const current=setup(null,{id,cookTotal:null}),initial=current.property.npcAccount(id).total;current.until(()=>!!lease(current,id),'current '+id+' prepaid aggregate meal');assert.equal(lease(current,id).accountProvider,AGGREGATE);assert.equal(current.saves.length,1);assert.equal(current.property.npcAccount(id).total,initial-6);assert.equal(current.guard.account(id).bank,3);assert.deepEqual(current.aggregate.snapshot().transfers[0].portions.map(p=>[p.providerId,p.amount]),[[PROVIDER,6]]);assert(current.scene.prepareLodgingWorld(copy(current.scene.snapshot())).ok,'lodging world validator accepts same active aggregate staff lease');
 const restored=setup(copy(current.game),{id});assert.equal(lease(restored,id).accountProvider,AGGREGATE);assert(cancel(restored,id));assert.equal(restored.property.npcAccount(id).total,initial);assert.equal(restored.guard.account(id).bank,3);
}
console.log('PASS new host/assistant leases carry aggregate pins with cash-first zero guard portions; lodging validation, reload and exact original-source refund remain available');

for(const id of [M.host,M.cook,M.assistant]){
 const old=setup(null,{legacy:true,id,cookTotal:id===M.cook?6:null,guardIncome:false});old.until(()=>!!lease(old,id),'old native '+id+' prepaid meal');const o=order(old,id),oldLease=lease(old,id),nativeAfter=old.property.npcAccount(id).total;assert.equal(oldLease.accountProvider,PROVIDER);assert.equal(o.payment,'reserved');if(id===M.cook)assert.equal(nativeAfter,0);old.earn(id);
 const loaded=setup(copy(old.game),{id}),before=money(loaded);assert.equal(lease(loaded,id).accountProvider,PROVIDER);assert.equal(loaded.aggregate.providerFor(id),AGGREGATE);loaded.fail(true);assert.equal(cancel(loaded,id),false);assert.deepEqual(money(loaded),before);loaded.fail(false);loaded.npcs.find(n=>n.station.id===id).alive=false;assert(cancel(loaded,id));assert.equal(loaded.property.npcAccount(id).total,nativeAfter+6);assert.equal(loaded.guard.account(id).bank,3);assert.equal(loaded.aggregate.snapshot().transfers.length,0);assert.equal(cancel(loaded,id),false);assert.equal(setup(loaded.game,{id}).aggregate.loadError,null);
}
console.log('PASS old host/cook/assistant prepaid native pins survive new income, zero cook purse, failed refund, death and reload without changing original payer');

{
 const old=setup(null,{legacy:true,id:M.host,cookTotal:null,guardIncome:false});old.needs.get(M.host).seekMeal=false;old.until(()=>old.scene.snapshot().visitors.every(v=>v.mode==='idle'),'old guests clear before explicit host replacement');assert(old.hostRole.assign(NEXT).ok);old.needs.get(M.host).seekMeal=true;old.until(()=>!!lease(old,M.host),'displaced original host gets native unpaid request');assert.equal(order(old,M.host).collected,false);assert.equal(lease(old,M.host).accountProvider,PROVIDER);old.earn(M.host);
 const loaded=setup(copy(old.game),{id:M.host});assert.equal(loaded.hostRole.state().holderId,NEXT);assert.equal(lease(loaded,M.host).actorId,M.host);assert.equal(lease(loaded,M.host).accountProvider,PROVIDER);assert.equal(loaded.property.npcAccount(NEXT),null);loaded.until(()=>order(loaded,M.host)?.collected,'same unpaid legacy host order pays original purse');assert.equal(loaded.property.npcAccount(M.host).total,474);assert.equal(loaded.guard.account(M.host).bank,3);assert.equal(loaded.aggregate.snapshot().transfers.length,0);assert(cancel(loaded,M.host));assert.equal(loaded.property.npcAccount(M.host).total,480);assert.equal(loaded.hostRole.state().holderId,NEXT);
}
console.log('PASS real displaced-host unpaid lease stays pinned through new income/reload; original person pays/refunds and replacement never inherits the purse');
