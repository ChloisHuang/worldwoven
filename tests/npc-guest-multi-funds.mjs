import assert from 'node:assert/strict';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCPieceworkAccount} from '../source/game/npc-piecework-account.js';
import {createNPCGuestAccounts,npcGuestMealPortions,NPC_GUEST_MEAL_PROVIDER as PROVIDER} from '../source/game/npc-guest-accounts.js';
import {ROYAL_KITCHEN_ROLE as ROYAL} from '../source/game/china-royal-kitchen-role.js';
import {PALACE_GUARD_ROLE as GUARD} from '../source/game/formal-careers.js';
import {PALACE_GARDEN_ROLE as GARDEN} from '../source/game/china-palace-garden-role.js';
import {GAME_MINUTES_PER_SECOND as RATE} from '../source/game/simulation-clock.js';
import {fixture} from './china-host-needs.mjs';
const copy=structuredClone,ID='cn-cooking',OTHER='cn-someone-else';
const meal={actorId:ID,orderId:'cn-tavern-order-3',amount:6};
const gardenProof=(day,actorId=ID)=>({kind:'npc-edict-piecework',version:1,actorId,roleId:GARDEN.id,slotId:GARDEN.slotId,holderRevision:day,day,documentId:`cn-edict-east-shore:${day}`,audienceId:`cn-morning-audience:${day}`,amount:8,contractVersion:1,steps:{received:true,filed:true,sweepSeconds:7}});
function earn(economy,role,day,hours=1.5,actorId=ID){
 const coverage=[{actorId,roleId:role.id,slotId:role.slotId,holderRevision:day}];let time=(day*1440+6*60-600)/RATE,end=time+hours*60/RATE;
 economy.observe({seconds:time,dt:.25,coverage});while(time<end){const dt=Math.min(.25,end-time);time+=dt;economy.observe({seconds:time,dt,coverage});}assert(economy.checkpoint({day,hour:18}));
}
function setup(saved,{fund=true}={}){
 let game=copy(saved||{}),f=null,mode=null,writes=0,onSave=null;
 function store(patch){writes++;if(onSave)onSave();if(mode==='throw')throw Error('save failed');if(mode==='false')return false;if(mode==='promise')return Promise.resolve(true);Object.assign(game,copy(patch));if(f)Object.assign(f.game,copy(patch));return true;}
 const royal=createNPCDutyAccount({role:ROYAL,namespace:'chinaRoyalKitchenAccounts',saved:game.chinaRoyalKitchenAccounts,saveState:(s,r,p={})=>store({...p,chinaRoyalKitchenAccounts:s})});
 const guard=createNPCDutyAccount({role:GUARD,namespace:'chinaGuardAccounts',saved:game.chinaGuardAccounts,saveState:(s,r,p={})=>store({...p,chinaGuardAccounts:s})});
 const garden=createNPCPieceworkAccount({role:GARDEN,namespace:'chinaGardenAccounts',saved:game.chinaGardenAccounts,saveState:(s,r,p={})=>store({...p,chinaGardenAccounts:s})});
 if(!saved&&fund){earn(royal,ROYAL,1);earn(guard,GUARD,2);earn(royal,ROYAL,3,1.5,OTHER);}
 const providers=[{id:'china-royal-kitchen-accounts',economy:royal},{id:'china-guard-accounts',economy:guard},{id:'china-garden-accounts',economy:garden}];
 const economy=createNPCGuestAccounts(providers,{saved:game.chinaGuestMealAccounts,saveState:(s,p)=>store({...p,chinaGuestMealAccounts:s})});
 function scene(){
  const guest={station:{id:ID,npcName:'Original person',npcPosition:[24,.215,10]},root:{position:{x:24,y:.215,z:10,set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];},copy(p){Object.assign(this,{x:p.x,y:p.y,z:p.z});}},rotation:{y:0}},route:[],phase:0,alive:true,animate(){}};
  f=fixture(game,{extraActors:[guest],sceneOptions:{guestEconomy:economy,canBorrowGuest:id=>id===ID}});f.hungry(false);f.needs.set(ID,{seekMeal:true,seekToilet:false});return {...f,guest};
 }
 return {royal,guard,garden,economy,providers,scene,get game(){return copy(f?.game||game);},get writes(){return writes;},fail:v=>mode=v,onSave:v=>onSave=v};
}
const state=f=>({royal:f.royal.snapshot(),guard:f.guard.snapshot(),garden:f.garden.snapshot(),journal:f.economy.snapshot(),game:f.game});
const f=setup();assert.deepEqual(f.royal.account(ID),{bank:4,cash:0});assert.deepEqual(f.guard.account(ID),{bank:3,cash:0});assert.deepEqual(f.economy.account(ID),{bank:7,cash:0});assert.equal(f.economy.providerFor(ID),PROVIDER);
const originalOther=f.royal.account(OTHER),before=state(f),candidate=f.economy.prepareMealPayment(meal);assert(candidate.ok);assert.equal(candidate.balanceAfter,1);assert.deepEqual(state(f),before,'preparation is read-only');
for(const mode of ['false','throw','promise']){f.fail(mode);assert.equal(candidate.commit({chinaServiceWorld:{marker:'paid'}}).ok,false);assert.deepEqual(state(f),before,'failed whole save has no world/journal/provider mutation');}
f.fail(null);const writes=f.writes;assert(candidate.commit({chinaServiceWorld:{marker:'paid'}}).ok);assert.equal(f.writes,writes+1);assert.equal(f.royal.account(ID).bank,0);assert.equal(f.guard.account(ID).bank,1);assert.deepEqual(f.royal.account(OTHER),originalOther);assert(candidate.commit().replayed);assert.equal(f.writes,writes+1);
const split=f.economy.snapshot().transfers[0];assert.deepEqual(split.portions.map(p=>[p.providerId,p.amount,p.sourceSplit]),[['china-royal-kitchen-accounts',4,{cash:0,bank:4}],['china-guard-accounts',2,{cash:0,bank:2}]]);
const persisted=f.game;delete persisted.chinaServiceWorld;const g=setup(persisted);assert.equal(g.economy.loadError,null);assert.equal(g.economy.account(ID).bank,1);assert(g.economy.prepareMealPayment(meal).commit().replayed);assert.equal(g.economy.snapshot().transfers.length,1);
earn(g.guard,GUARD,4);const afterWage=g.economy.account(ID).bank;assert(g.economy.prepareMealRefund(meal).commit().ok);assert.equal(g.economy.account(ID).bank,afterWage+6);assert.equal(g.royal.account(ID).bank,4);assert.equal(g.guard.account(ID).bank,6);assert(g.economy.prepareMealRefund(meal).commit().replayed);assert.equal(g.economy.snapshot().transfers.length,2);assert.equal(g.economy.prepareMealPayment(meal).ok,false);
const restored=setup(g.game);assert.equal(restored.economy.loadError,null);assert.equal(restored.economy.account(ID).bank,10);assert.deepEqual(restored.royal.account(OTHER),originalOther);
console.log('PASS real distinct royal 4 + guard 3 funds pay 6 once, one save, failed synchronous save and rejected Promise callback leave memory unchanged, reload and exact refund after later wages; other person unchanged');

for(const mutate of [s=>{delete s.chinaGuestMealAccounts;},s=>{s.chinaGuestMealAccounts.transfers[0].portions.pop();},s=>{s.chinaGuestMealAccounts.transfers[0].portions[0].providerId='forged';},s=>{s.chinaGuestMealAccounts.transfers[0].portions[0].identity.currency='gold';},s=>{s.chinaGuestMealAccounts.transfers[0].actorId=OTHER;},s=>{s.chinaGuestMealAccounts.transfers[0].portions[0].sourceSplit.cash=4;},s=>{s.chinaGuestMealAccounts.transfers.push(copy(s.chinaGuestMealAccounts.transfers[0]));},s=>{s.chinaGuardAccounts.accounts[ID].bank++;}]){
 const bad=copy(persisted);mutate(bad);const rejected=setup(bad);assert(rejected.economy.loadError||!rejected.economy.account(ID));assert.equal(rejected.economy.prepareMealRefund(meal).ok,false);assert.deepEqual(rejected.game,bad);if(rejected.guard.loadError)assert.deepEqual(rejected.guard.snapshot(),bad.chinaGuardAccounts,'ordinary snapshot capture preserves rejected duty evidence');
}
const aliased=createNPCGuestAccounts([{id:'a',economy:f.royal},{id:'b',economy:f.royal}]);assert.equal(aliased.account(ID),null);
const cloned=createNPCDutyAccount({role:ROYAL,namespace:'copiedRoyalAccount',saved:null});const duplicate=createNPCGuestAccounts([{id:'a',economy:f.royal},{id:'b',economy:cloned}]);assert.equal(duplicate.account(ID),null,'same role copied into another namespace rejects even at zero');
const extra=setup(persisted);assert(extra.garden.settle(gardenProof(0)).ok);assert(extra.garden.prepareMealPayment({...meal,amount:1}).commit().ok);assert(setup(extra.game).economy.loadError,'unlisted third-provider order transfer rejects');
console.log('PASS missing/forged/duplicate journal portions, wrong currency/person/split, corrupted strict ledger, aliased/copied provider and unlisted transfer reject');

const stale=setup(),pending=stale.economy.prepareMealPayment(meal);earn(stale.guard,GUARD,4);const newer=state(stale);assert.equal(pending.commit().ok,false);assert.deepEqual(state(stale),newer);
const locked=setup();assert(locked.garden.settle(gardenProof(0)).ok);const all=locked.economy.prepareMealPayment({...meal,amount:12});const old=state(locked);let checks=0;
locked.onSave(()=>{checks++;assert.equal(locked.garden.settle(gardenProof(1)).ok,false);assert.equal(locked.guard.checkpoint({day:9,hour:18}),false);assert.equal(locked.royal.prepareMealPayment({...meal,orderId:'cn-tavern-order-9',amount:1}).ok,false);assert.equal(locked.economy.prepareMealPayment({...meal,orderId:'cn-tavern-order-10'}).ok,false);assert.deepEqual(locked.royal.snapshot(),old.royal);assert.deepEqual(locked.guard.snapshot(),old.guard);assert.deepEqual(locked.garden.snapshot(),old.garden);});
assert(all.commit({chinaServiceWorld:{marker:'all-three'}}).ok);assert.equal(checks,1);locked.onSave(null);assert(locked.garden.settle(gardenProof(1)).ok,'all locks released after success');
const failedLock=setup();assert(failedLock.garden.settle(gardenProof(0)).ok);failedLock.fail('throw');assert.equal(failedLock.economy.prepareMealPayment({...meal,amount:12}).commit().ok,false);failedLock.fail(null);assert(failedLock.garden.settle(gardenProof(1)).ok,'all locks released after throw');
// A zero-portion provider shares the order namespace and must also be guarded.
const third=setup();assert(third.garden.settle(gardenProof(0)).ok);const thirdPending=third.economy.prepareMealPayment(meal);assert(third.garden.prepareMealPayment({...meal,amount:1}).commit().ok);const thirdState=state(third);assert.equal(thirdPending.commit().ok,false);assert.deepEqual(state(third),thirdState);
const thirdReentrant=setup();assert(thirdReentrant.garden.settle(gardenProof(0)).ok);const thirdSafe=thirdReentrant.economy.prepareMealPayment(meal);thirdReentrant.onSave(()=>assert.equal(thirdReentrant.garden.prepareMealPayment({...meal,amount:1}).ok,false));assert(thirdSafe.commit().ok);thirdReentrant.onSave(null);assert.equal(setup(thirdReentrant.game).economy.loadError,null);
const exposed=setup(),exposedCandidate=exposed.economy.prepareMealPayment(meal);exposedCandidate.snapshot.transfers[0].amount=999;assert(exposedCandidate.commit().ok);assert.equal(exposed.economy.snapshot().transfers[0].amount,6);
const forbidden=setup();for(const key of ['chinaGuestMealAccounts','chinaRoyalKitchenAccounts','chinaGuardAccounts','chinaGardenAccounts'])assert.equal(forbidden.economy.prepareMealPayment(meal).commit({[key]:{}}).ok,false);
console.log('PASS stale revision and authority patches rejected; participant locks block reentrant duty/piecework/payment until adoption, release on throw, exposed journal mutation isolated');

assert.deepEqual(npcGuestMealPortions([{cash:1,bank:4},{cash:3,bank:5}],6),[{cash:1,bank:2},{cash:3,bank:0}]);assert.deepEqual(npcGuestMealPortions([{cash:8,bank:2},{cash:3,bank:5}],6),[{cash:6,bank:0},{cash:0,bank:0}]);assert.throws(()=>npcGuestMealPortions([{cash:1,bank:2}],6),/insufficient/);
console.log('PASS mixed cash+bank pure allocation fixture uses all own cash before banks; real guest employer ledgers remain bank-only');

const live=setup(),s=live.scene();assert(s.scene.registerGuestPerson(ID));assert(s.scene.guestMealAvailable(ID));assert(s.scene.requestGuestMeal(ID));assert.equal(s.scene.guestMeal(ID).accountProvider,PROVIDER);
const unpaid=setup(live.game),unpaidScene=unpaid.scene();assert.equal(unpaidScene.scene.guestMeal(ID).accountProvider,PROVIDER);
s.until(()=>s.scene.snapshot().orders.some(o=>o.customerId===ID&&o.payment==='reserved'),'real original host collects aggregate sources');assert.equal(live.economy.account(ID).bank,1);
const liveSaved=live.game,reloaded=setup(liveSaved),r=reloaded.scene();assert.equal(r.scene.guestMeal(ID).orderId,meal.orderId);reloaded.fail('false');assert.equal(r.scene.cancelGuestMeal(ID),false);assert.equal(reloaded.economy.account(ID).bank,1);reloaded.fail(null);r.guest.alive=false;assert(r.scene.cancelGuestMeal(ID));assert.equal(reloaded.economy.account(ID).bank,7);assert.equal(r.scene.cancelGuestMeal(ID),false);
const consume=setup(liveSaved),c=consume.scene();c.until(()=>!c.scene.guestMeal(ID),'same paid plate consumed once');assert.equal(consume.economy.account(ID).bank,1);assert.equal(c.scene.snapshot().mealReceipts.filter(row=>row.actorId===ID).length,1);assert.equal(consume.economy.snapshot().transfers.length,1);
const poor=setup(null,{fund:false});earn(poor.royal,ROYAL,1,.75);earn(poor.guard,GUARD,2,1);earn(poor.royal,ROYAL,3,3,OTHER);const poorScene=poor.scene();assert(poorScene.scene.registerGuestPerson(ID));const noOrder=copy(poorScene.scene.snapshot());assert.equal(poorScene.scene.requestGuestMeal(ID),false);assert.deepEqual(copy(poorScene.scene.snapshot()),noOrder);
console.log('PASS original shared meal queue aggregate availability, unpaid/prepaid reload, death/refund failure/retry, real same dish consumed once, insufficient funds creates no order despite another person’s money');

for(const prepaid of [false,true]){
 const legacy=setup(null,{fund:false});earn(legacy.royal,ROYAL,1,3);const l=legacy.scene();assert(l.scene.registerGuestPerson(ID));assert(l.scene.requestGuestMeal(ID));assert.equal(l.scene.guestMeal(ID).accountProvider,'china-royal-kitchen-accounts');if(prepaid)l.until(()=>l.scene.snapshot().orders.some(o=>o.customerId===ID&&o.payment==='reserved'),'legacy royal reserve');
 earn(legacy.guard,GUARD,2);assert.equal(legacy.economy.providerFor(ID),PROVIDER);const reload=setup(legacy.game),lr=reload.scene();assert.equal(lr.scene.guestMeal(ID).accountProvider,'china-royal-kitchen-accounts');if(!prepaid)lr.until(()=>lr.scene.snapshot().orders.some(o=>o.customerId===ID&&o.payment==='reserved'),'old unpaid lease still charges original source');
 const guardBank=reload.guard.account(ID).bank;assert.equal(reload.royal.account(ID).bank,2);lr.guest.alive=false;assert(lr.scene.cancelGuestMeal(ID));assert.equal(reload.royal.account(ID).bank,8);assert.equal(reload.guard.account(ID).bank,guardBank);assert.equal(reload.economy.snapshot().transfers.length,0);
}
const zero=setup();earn(zero.guard,GUARD,4);assert(zero.economy.prepareMealPayment({...meal,amount:10}).commit().ok);assert.equal(zero.economy.account(ID).bank,0);assert.equal(zero.economy.providerFor(ID),PROVIDER);assert(zero.economy.prepareMealRefund({...meal,amount:10}).commit().ok);
console.log('PASS old unpaid/prepaid royal leases retain original payer after second employment, death and reload; zero-total aggregate payer and exact refund persist');
