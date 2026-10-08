// Actual original service queue, Three bodies, stock/property/business journals
// and management bridge. Fixture floor/doors isolate transactions and physical
// prep; this does not replace production-main or rendered acceptance evidence.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../source/vendor/three/build/three.module.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
import {beginActorNavigationStep} from '../source/game/actor-navigation.js';
import {createChinaTavernManagement} from '../source/game/china-tavern-management.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createTavernRole} from '../source/game/china-tavern-role.js';
import {TAVERN_HIRING_ROLES as ROLES} from '../source/game/china-tavern-hiring.js';
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const {createTavernServiceScene,verifySavedTavernStockReceipt,verifyTavernStockOrderSource,verifySavedRecruitmentTableWork}=await import('../source/game/china-tavern-service-scene.js');
const copy=structuredClone,RICE='yunlai-mushroom-rice',NOODLES='yunlai-green-noodles',WEST='cn-tavern-diner-west';
function actor(id,name,p){const root=new THREE.Group();root.position.fromArray(p);root.userData.bodyId=id;
 const hands=[new THREE.Object3D(),new THREE.Object3D()];hands[0].position.set(-.18,1.2,.3);hands[1].position.set(.18,1.2,.3);root.add(...hands);root.userData.hands=hands;
 return {station:{id,npcName:name,npcPosition:p.slice()},root,route:[],phase:0,walking:false,alive:true,locomotion:{walkSpeed:3},animate(){}};}
function fixture(initial=null,sceneOptions={}){
 let game=copy(initial?.game||{copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}}),seconds=initial?.seconds??0,manager=null,property=null,scene=null,mounted=null,reject=null,cleaningTable=null;
 const links={},getClock=()=>{const minutes=600+seconds*.7;return {seconds,day:Math.floor(minutes/1440),hour:minutes%1440/60};};
 const save=patch=>{if(reject?.(patch))return false;Object.assign(game,copy(manager?.snapshot()||{}),copy(patch));return true;};
 const npcs=[actor('cn-tavern-host','许安',[24.1,.215,6.4]),actor('cn-tavern-cook','沈禾',[23.3,.215,4.36]),actor('cn-tavern-assistant','陆青',[22,.215,9.1]),actor(WEST,'顾谨',[20,.215,22.4]),actor('cn-tavern-diner-east','周棠',[22,.215,22.4])];
 if(initial?.positions)for(const n of npcs)n.root.position.fromArray(initial.positions[n.station.id]);
 const player=actor('player','你',[14,.215,20]),byId=id=>npcs.find(n=>n.station.id===id),group=new THREE.Group();group.add(...npcs.map(n=>n.root),player.root);
 const ledger=createGameCurrencyLedger({saved:game,storage:{setItem(_key,json){return save(JSON.parse(json));}},transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
 property=createChinaTavernProperty({saved:game.chinaTavernProperty,copperLedger:ledger,getClock,getTill:()=>scene?.snapshot().till??game.chinaServiceWorld?.till??0,
  getBusinessAccount:()=>links.business,getStock:()=>links.stock,saveState:next=>save({chinaTavernProperty:next})});
 const roles=Object.fromEntries(Object.values(ROLES).map(r=>[r.roleId,createTavernRole({...r,saved:game.roles?.[r.roleId],resolveActor:byId,saveState:next=>save({roles:{...game.roles,[r.roleId]:next}})})]));
 const items=[{key:18.1,x:19,z:13.65},{key:23.9,x:23,z:17.65}].flatMap(t=>[-1,1].map(side=>({id:`china-tavern-dining-${t.key}-${side}`,kind:'chair',
  position:[t.x,.215,t.z+side*1.55],anchor:[t.x,.215,t.z+side*1.045],center:[t.x,.215,t.z+side*1.045],seatY:.9,yaw:side===1?Math.PI:0})));
 const facilities=createFacilityQueue(),furniture={items,facilities,releaseActor:id=>facilities.releaseActor(id),standPoint:(_nav,_extra,seat)=>new THREE.Vector3(...seat.position)};
 const doors={cameraColliders:[],routeStep(route,p,tolerance){while(route[0]&&Math.hypot(p.x-route[0].x,p.z-route[0].z)<=tolerance)route.shift();return {waypoint:route[0],waiting:false,phase:'walking'};}};
 const needs=new Map(npcs.map(n=>[n.station.id,{seekMeal:false,seekToilet:false}]));
 const chargePlayer=(action,o)=>{const hold=ledger.reservations().find(h=>h.id===o.id);if(action==='status')return {ok:true,status:hold?.status||'unpaid'};
  if(action==='reserve')return ledger.reserve(o.price,o.id,'copper');if(action==='settle')return ledger.settle(o.id);return !hold||hold.status==='refunded'?{ok:true}:ledger.refund(o.id);};
 scene=createTavernServiceScene({...sceneOptions,npcs,lot:{group,bounds:{minX:10,maxX:30,minZ:0,maxZ:25},colliders:[],cameraColliders:[]},furniture,doors,
  planPath:(_from,to)=>[{...to}],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;return {bodyBlocked:false};},
  poseContext:()=>({}),getPlayer:()=>player,getMounted:()=>mounted,getClock,worldSeed:1,
  sharedNeeds:{status:id=>needs.get(id),has:()=>true,hunger:()=>0,register:()=>true},
  getHostRole:()=>roles[ROLES.host.roleId].resolve(),getKitchenRole:r=>roles[ROLES[r].roleId].resolve(),getManagement:()=>manager,getRecruitment:()=>manager?.recruitment,
  getPlayerCleaningTable:()=>cleaningTable,chargePlayer,saveState:next=>save({chinaServiceWorld:next})});
 if(game.chinaServiceWorld)assert(scene.restoreWorld(game.chinaServiceWorld));else {assert(scene.initializeWorld());const baseline=scene.snapshot();
  for(const v of baseline.visitors){v.copper=v.id===WEST?6:8;baseline.orders.find(o=>o.customerId===v.id).customerCopper=v.copper;}
  assert(scene.restoreWorld(baseline));}
 manager=createChinaTavernManagement({saved:game,property,sourceLinks:links,getClock,saveFullWorld:save,getRole:id=>roles[id]?.resolve(),getActor:byId,getScene:()=>scene,
  verifySavedStockReceipt:verifySavedTavernStockReceipt,verifySavedTrialTableWork:verifySavedRecruitmentTableWork,
  getNPCProfile:id=>{const n=byId(id);return n?{actorId:id,name:n.station.npcName,bodyId:id,bodyRevision:null,ageYears:29,alive:n.alive,protected:false,
   currentRoleId:Object.values(ROLES).find(r=>roles[r.roleId].state().holderId===id)?.roleId||null}:null;}});
 const tick=(count=1)=>{for(let i=0;i<count;i++){seconds+=.1;beginActorNavigationStep(.1);scene.update(.1,seconds);manager.update(.1);}};
 const until=(fn,label)=>{for(let i=0;i<6000&&!fn();i++)tick();assert(fn(),label+': '+JSON.stringify({orders:scene.snapshot().orders,stock:manager.stock.summary(),stockError:scene.state().stockError,error:manager.loadError,last:manager.lastError}));};
 const buy=()=>{for(let i=0;i<8;i++){assert(property.refreshDay().ok);const s=property.state();if(s.market.willing){assert(property.applyPurchase(s.market.price).ok);assert(property.confirmPurchase().ok);assert(manager.activate().ok);return;}seconds+=1440/.7;}assert.fail('fixture owner purchase available');};
 const seat=items.find(i=>i.id==='china-tavern-dining-18.1-1');
 const mount=()=>{mounted=seat;player.root.position.fromArray(seat.anchor);return seat;};
 const request=()=>{assert(scene.requestPlayerMeal(mount(),RICE));return scene.playerOrder().id;};
 const snapshot=()=>({game:{...copy(game),...manager.snapshot(),chinaServiceWorld:scene.snapshot()},seconds,
  positions:Object.fromEntries(npcs.map(n=>[n.station.id,n.root.position.toArray()]))});
 return {scene,manager,property,ledger,npcs,byId,player,roles,needs,tick,until,buy,mount,request,snapshot,getClock,
  unmount(){mounted=null;player.root.position.set(14,.215,20);},reject:fn=>{reject=fn;},cleaning:id=>{cleaningTable=id;},
  setHour(hour){const c=getClock();seconds=((c.day*1440+hour*60)-600)/.7;},get game(){return copy(game);}};
}

// Dormant default NPC service retains its original contract. Activation takes
// the actual serial once, never retroactively consumes old accepted dishes.
const dormant=fixture();dormant.tick(3);assert.equal(dormant.manager.stock.summary().active,false);assert.equal(dormant.manager.business.snapshot().contracts.length,0);
const f=fixture();f.buy();assert.equal(f.manager.stock.summary().cutoff,2);
const before=f.ledger.balances().copper.cash;assert(!f.scene.requestPlayerMeal(f.mount(),RICE));assert.equal(f.ledger.balances().copper.cash,before);
assert.equal(f.scene.snapshot().serial,2);f.unmount();
assert(f.manager.purchase({operationId:'scene-rice-purchase',dishId:RICE,quantity:2}).ok);
assert(f.manager.purchase({operationId:'scene-noodle-purchase',dishId:NOODLES,quantity:1}).ok);
assert.equal(f.manager.stock.summary().purchaseCash,7);f.until(()=>f.scene.snapshot().orders.every(o=>o.stage==='done'),'original two meals fully complete');
assert.equal(f.manager.stock.summary().materialExpense,0);assert.equal(f.scene.snapshot().stockReceipts,undefined);assert.equal(f.scene.snapshot().till,14);

// One original player order reserves one purchased portion BEFORE wallet debit.
// A failed physical prep save leaves both scene and stock unconsumed.
const id=f.request();assert.equal(f.manager.stock.order(id).status,'reserved');assert.equal(f.manager.stock.summary().inventory[RICE].available,1);
assert.equal(f.ledger.reservations().find(r=>r.id===id).amount,6);
f.reject(p=>p.chinaTavernStock?.events.at(-1)?.kind==='consume');
f.until(()=>f.scene.continuitySnapshot().phases.some(([key,time])=>key===id&&time>=3.2),'original NPC completes actual preparation timer');
assert.equal(f.manager.stock.order(id).status,'reserved');assert.equal(f.scene.snapshot().orders.find(o=>o.id===id).stage,'paid');
assert.equal(f.scene.snapshot().stockPreparations,undefined);f.reject(null);f.tick();
assert.equal(f.manager.stock.order(id).status,'consumed');assert.equal(f.manager.stock.summary().materialExpense,2);
const work=f.scene.snapshot().stockPreparations[0],receipt=f.scene.snapshot().stockReceipts.find(r=>r.kind==='consume');
assert.equal(work.actorId,'cn-tavern-cook');assert(work.activeSeconds>=3.2);assert.equal(work.orderId,id);
assert(verifySavedTavernStockReceipt(f.scene.snapshot(),receipt));assert(verifyTavernStockOrderSource(f.scene.snapshot(),'consume',receipt.proof));

// Cancellation of prepared food refunds original unserved prepayment and records
// waste as a subset of consumed cost; it never returns a cooked raw portion.
assert(f.scene.cancelPlayerMeal());assert.equal(f.manager.stock.order(id).status,'wasted');
assert.equal(f.manager.stock.summary().materialExpense,2);assert.equal(f.manager.stock.summary().wasteExpense,2);
assert.equal(f.manager.stock.summary().inventory[RICE].available,1);assert.equal(f.ledger.reservations().find(r=>r.id===id).status,'refunded');
f.unmount();const saved=f.snapshot(),g=fixture(saved);assert.equal(g.manager.loadError,null);assert.equal(g.manager.stock.order(id).status,'wasted');
assert.equal(g.scene.snapshot().stockReceipts.filter(r=>r.proof.order.orderId===id).length,3);

// If the old wallet has already refunded but the joint cancellation save is
// refused, the original chef must not continue preparing that customer order.
const cancelled=g.request();g.reject(p=>p.chinaTavernStock?.events.at(-1)?.kind==='cancel');
assert(!g.scene.cancelPlayerMeal());assert.equal(g.ledger.reservations().find(r=>r.id===cancelled).status,'refunded');
g.tick(70);assert.equal(g.manager.stock.order(cancelled).status,'reserved');assert(!g.scene.snapshot().stockPreparations.some(p=>p.orderId===cancelled));
g.reject(null);g.tick();assert.equal(g.manager.stock.order(cancelled).status,'cancelled');assert.equal(g.manager.stock.summary().inventory[RICE].available,1);
g.unmount();const restored=fixture(g.snapshot());assert.equal(restored.manager.loadError,null);assert.equal(restored.manager.stock.summary().materialExpense,2);
const forged=g.snapshot();forged.game.chinaServiceWorld.stockPreparations[0].activeSeconds=0;
assert.throws(()=>fixture(forged),'forged original preparation cannot cold-load');

// Actual same-slot actor coverage and handoff gates. No natural full-day claim:
// life rest and departure yield no evidence. Business alone clips the time
// window, retaining the last real crossing frame at both 06:00 and 18:00.
const h=fixture();h.buy();h.tick();const contracts=h.manager.business.snapshot().contracts;
assert.equal(contracts.length,3);const chefContract=contracts.find(c=>c.roleId===ROLES.chef.roleId);
h.until(()=>!!h.scene.readTavernCoverage(chefContract),'actual original chef work coverage');
assert.equal(h.scene.readTavernCoverage({...chefContract,bodyId:'another-body'}),null);
assert.equal(h.scene.readTavernCoverage({...chefContract,holderRevision:999}),null);
h.setHour(22);h.tick();const nightWages=h.manager.business.accounting().earnedWages;h.tick(30);assert.equal(h.manager.business.accounting().earnedWages,nightWages,'real night activity cannot create daytime salary');
h.setHour(10);h.tick();h.byId('cn-tavern-cook').serviceMount={id:'fixture-rest-seat'};assert.equal(h.scene.kitchenHandoff('chef').ok,false);assert.equal(h.scene.readTavernCoverage(chefContract),null);h.byId('cn-tavern-cook').serviceMount=null;
h.byId('cn-tavern-host').walking=true;assert.equal(h.scene.hostHandoff().ok,false);h.byId('cn-tavern-host').walking=false;
h.cleaning('cn-tavern-labor-west');assert(h.scene.recruitmentTableHeld('west'));h.cleaning(null);

// Explicit personal-account source fixture: a hired original guest has only
// the new earned business-bank provider. Cold scene typing must accept that
// authenticated provider without inventing an old original-staff purse.
const bankSave=g.snapshot(),world=bankSave.game.chinaServiceWorld,number=++world.serial;
world.kitchenPeople=[...new Set([...(world.kitchenPeople||[]),WEST])];
const ownOrder={...copy(dormant.scene.snapshot().orders.find(o=>o.customerId===WEST)),id:'cn-tavern-order-'+number,number,guestIndex:-2,
 stage:'paid',mealId:null,holder:null,collected:true,cancelled:false,payment:'reserved',reviews:[]};
world.orders.push(ownOrder);world.kitchenBreak={actorId:WEST,role:'assistant',phase:'meal',waypoint:0,meal:true};
world.kitchenDiner={actorId:WEST,orderId:ownOrder.id,mode:'dining',kind:'tavern-kitchen',accountProvider:'tavern-operating-bank'};
let verified=0;const bankSource={validMealLease:(lease,order)=>{verified++;return lease.accountProvider==='tavern-operating-bank'&&lease.actorId===WEST&&order.id===ownOrder.id&&order.payment==='reserved';}};
const ownMeal=fixture(bankSave,{enableStaffPersonalFunds:true,personalMealEconomy:bankSource});
assert(verified>0);assert.equal(ownMeal.scene.snapshot().kitchenDiner.accountProvider,'tavern-operating-bank');
const untyped=copy(bankSave);untyped.game.chinaServiceWorld.kitchenDiner.accountProvider='untyped-bank';
assert.throws(()=>fixture(untyped,{enableStaffPersonalFunds:true,personalMealEconomy:bankSource}));

// Original leave-seat callback after REAL meal consumption may still cancel the
// remaining plate cleanup. It must not reclassify eaten food as material waste.
// Refuse that world write once, cold-load, then retry the same order/receipt.
{
 const meal=fixture();meal.buy();assert(meal.manager.purchase({operationId:'completed-meal-stock',dishId:RICE,quantity:1}).ok);
 meal.until(()=>meal.scene.snapshot().orders.every(o=>o.stage==='done'),'completion fixture old dishes drained');
 const orderId=meal.request();meal.until(()=>meal.scene.playerOrder()?.stage==='ready','real paid dish delivered');
 assert(meal.scene.eatPlayerMeal());meal.until(()=>meal.scene.playerOrder()?.consumed===true,'original5.5-second meal really consumed');
 const source=copy(meal.scene.snapshot().mealReceipts.find(r=>r.orderId===orderId)),stock=copy(meal.manager.stock.snapshot());
 assert(source?.completed);assert.equal(source.actorId,'player');assert.equal(meal.manager.stock.order(orderId).status,'consumed');
 meal.reject(p=>p.chinaServiceWorld?.orders.some(o=>o.id===orderId&&o.cancelled));
 assert.equal(meal.scene.cancelPlayerMeal(),false,'original leave-seat cleanup write refused');
 assert.equal(meal.scene.playerOrder().cancelled,false);assert.deepEqual(meal.manager.stock.snapshot(),stock);
 const resumed=fixture(meal.snapshot());assert.equal(resumed.manager.loadError,null);
 assert(resumed.scene.cancelPlayerMeal());resumed.unmount();
 assert.equal(resumed.manager.stock.order(orderId).status,'consumed','fully eaten food stays consumed after leave-seat retry');
 assert.equal(resumed.manager.stock.summary().wasteExpense,0);assert.equal(resumed.manager.stock.summary().materialExpense,2);
 assert.deepEqual(resumed.manager.stock.snapshot(),stock,'cleanup classification adds no second stock transaction');
 assert.equal(resumed.ledger.reservations().find(r=>r.id===orderId).status,'settled','already supplied food remains paid');
 resumed.until(()=>resumed.scene.snapshot().orders.find(o=>o.id===orderId)?.stage==='done','unchanged real assistant plate return/wash completes');
 assert.equal(resumed.scene.snapshot().orders.find(o=>o.id===orderId).consumed,true);
 assert.equal(fixture(resumed.snapshot()).manager.loadError,null,'completed cleanup and stock history agree after cold load');

 // The last completed receipt belongs to the former order. It cannot exempt a
 // later, only partly eaten dish from the existing waste/no-refund rule.
 assert(resumed.manager.purchase({operationId:'partial-meal-stock',dishId:RICE,quantity:1}).ok);
 const partialId=resumed.request();resumed.until(()=>resumed.scene.playerOrder()?.stage==='ready','second real dish delivered');
 assert(resumed.scene.eatPlayerMeal());resumed.tick(20);
 assert(!resumed.scene.playerOrder().consumed);assert(!resumed.scene.snapshot().mealReceipts.some(r=>r.orderId===partialId));
 assert(resumed.scene.cancelPlayerMeal());resumed.unmount();
 assert.equal(resumed.manager.stock.order(partialId).status,'wasted');assert.equal(resumed.manager.stock.summary().wasteExpense,2);
 assert.equal(resumed.manager.stock.summary().materialExpense,4);assert.equal(resumed.ledger.reservations().find(r=>r.id===partialId).status,'settled');
 assert.equal(fixture(resumed.snapshot()).manager.loadError,null);
}
console.log('china tavern stock scene: original stock/prepay/prep/cancel sources, cold verification and actual coverage guards passed (not full-main proof)');
