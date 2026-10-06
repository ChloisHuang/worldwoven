import assert from 'node:assert/strict';
import {fixture} from './china-host-needs.mjs';
import {PALACE_GUARD_ROLE as ROLE} from '../source/game/formal-careers.js';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCGuestAccounts} from '../source/game/npc-guest-accounts.js';
const ID='cn-archery',copy=structuredClone;
function make(saved){
 let f,fail=false,stored=saved?.chinaGuardAccounts;
 const guard=createNPCDutyAccount({role:ROLE,namespace:'chinaGuardAccounts',saved:stored,saveState:(s,_tx,patch)=>{if(fail)return false;stored=copy(s);if(f)Object.assign(f.game,copy(patch),{chinaGuardAccounts:stored});return true;}});
 if(!saved){const coverage=[{roleId:ROLE.id,slotId:ROLE.slotId,actorId:ID,holderRevision:0}];for(let i=0;i<=2600;i++)guard.observe({seconds:i*.1,dt:.1,coverage});assert(guard.checkpoint({day:0,hour:18}));assert.equal(guard.account(ID).bank,6);}
 const royal={hasIncome:()=>false},economy=createNPCGuestAccounts([{id:'china-royal-kitchen-accounts',economy:royal},{id:'china-guard-accounts',economy:guard}]);
 const guest={station:{id:ID,npcName:'沈砚',npcPosition:[24,.215,10]},root:{position:{x:24,y:.215,z:10,set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];},copy(p){Object.assign(this,{x:p.x,y:p.y,z:p.z});}},rotation:{y:0}},route:[],phase:0,alive:true,animate(){}};
 f=fixture(saved,{extraActors:[guest],sceneOptions:{guestEconomy:economy,canBorrowGuest:id=>id===ID}});f.game.chinaGuardAccounts=copy(stored);f.hungry(false);f.needs.set(ID,{seekMeal:true,seekToilet:false});
 return {...f,guard,economy,guest,fail:v=>fail=v};
}
const paid=f=>{assert(f.scene.registerGuestPerson(ID));assert(f.scene.requestGuestMeal(ID));assert.equal(f.scene.guestMeal(ID).accountProvider,'china-guard-accounts');f.until(()=>f.scene.snapshot().orders.some(o=>o.customerId===ID&&o.payment==='reserved'),'real original host takes six earned copper');return f.scene.guestMeal(ID).orderId;};
{
 const f=make(),order=paid(f);assert.deepEqual(f.guard.account(ID),{cash:0,bank:0});assert.equal(f.economy.providerFor(ID),'china-guard-accounts','zero remaining money preserves payer identity');const before=copy(f.game),g=make(before);assert.equal(g.scene.guestMeal(ID).orderId,order);g.until(()=>!g.scene.guestMeal(ID),'same kitchen dish actually consumed');assert.equal(g.needs.get(ID).seekMeal,false);assert.equal(g.guard.snapshot().mealTransfers.length,1);assert.deepEqual(g.guard.account(ID),{cash:0,bank:0});assert.equal(g.scene.snapshot().mealReceipts.filter(r=>r.actorId===ID).length,1);g.needs.get(ID).seekMeal=true;assert.equal(g.scene.requestGuestMeal(ID),false,'no new order at zero after the meal');
 console.log('PASS earned six, original same paid dish, zero-bank reload/consumption, no second free meal');
}
{
 const f=make(),order=paid(f);f.fail(true);assert.equal(f.scene.cancelGuestMeal(ID),false);assert.equal(f.scene.guestMeal(ID).orderId,order);assert.equal(f.guard.account(ID).bank,0);f.fail(false);f.guest.alive=false;assert(f.scene.cancelGuestMeal(ID));assert.equal(f.guard.account(ID).bank,6);assert.equal(f.scene.cancelGuestMeal(ID),false);assert.equal(f.needs.get(ID).seekMeal,true);const g=make(copy(f.game));assert.equal(g.guard.account(ID).bank,6);assert.equal(g.guard.snapshot().mealTransfers.filter(r=>r.kind==='meal-refund').length,1);
 const ambiguous=createNPCGuestAccounts([{id:'a',economy:g.guard},{id:'b',economy:g.guard}]);assert.equal(ambiguous.providerFor(ID),null);assert.equal(ambiguous.prepareMealPayment({actorId:ID,orderId:'cn-tavern-order-99',amount:6}).ok,false);
 console.log('PASS death/cancel refunds original six once, failed save/reload and ambiguous account rejection');
}
{
 const {ROYAL_KITCHEN_ROLE}=await import('../source/game/china-royal-kitchen-role.js');let active,stored;
 const options=saved=>({role:ROYAL_KITCHEN_ROLE,namespace:'chinaRoyalKitchenAccounts',saved,saveState:(s,_tx,patch)=>{stored=copy(s);if(active)Object.assign(active.game,copy(patch),{chinaRoyalKitchenAccounts:stored});return true;}});
 let royal=createNPCDutyAccount(options());const coverage=[{roleId:ROYAL_KITCHEN_ROLE.id,slotId:ROYAL_KITCHEN_ROLE.slotId,actorId:'cn-cooking',holderRevision:0}];for(let i=0;i<=2600;i++)royal.observe({seconds:i*.1,dt:.1,coverage});assert(royal.checkpoint({day:0,hour:18}));const earned=royal.account('cn-cooking').bank;
 const person=()=>({station:{id:'cn-cooking',npcName:'Jia',npcPosition:[24,.215,10]},root:{position:{x:24,y:.215,z:10,set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];},copy(p){Object.assign(this,{x:p.x,y:p.y,z:p.z});}},rotation:{y:0}},route:[],phase:0,alive:true,animate(){}});
 active=fixture(null,{extraActors:[person()],sceneOptions:{guestEconomy:royal,canBorrowGuest:id=>id==='cn-cooking'}});active.hungry(false);active.needs.set('cn-cooking',{seekMeal:true});assert(active.scene.registerGuestPerson('cn-cooking'));assert(active.scene.requestGuestMeal('cn-cooking'));active.until(()=>royal.account('cn-cooking').bank===earned-6,'old R143 royal adapter pays');const old=copy(active.game);assert.equal(old.chinaServiceWorld.guestDiner.accountProvider,'china-royal-kitchen-accounts');
 active=null;royal=createNPCDutyAccount(options(old.chinaRoyalKitchenAccounts));const guard=make().guard,router=createNPCGuestAccounts([{id:'china-royal-kitchen-accounts',economy:royal},{id:'china-guard-accounts',economy:guard}]);active=fixture(old,{extraActors:[person()],sceneOptions:{guestEconomy:router,canBorrowGuest:id=>id==='cn-cooking'}});active.hungry(false);active.needs.set('cn-cooking',{seekMeal:true});assert(active.scene.cancelGuestMeal('cn-cooking'));assert.equal(royal.account('cn-cooking').bank,earned);assert.equal(guard.account(ID).bank,6);assert.equal(router.providerFor('cn-clinic-physician'),null);assert.equal(router.providerFor('cn-tavern-host'),null);
 console.log('PASS old R143 royal lease reload refunds original royal account; guard/clinic/host accounts stay separate');
}
