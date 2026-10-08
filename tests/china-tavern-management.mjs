// Cross-source failures: accepted supply must debit the same original business
// once, and original assignments may start pay only at a durable live activation.
import assert from 'node:assert/strict';
import {createChinaTavernManagement} from '../source/game/china-tavern-management.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createTavernRole} from '../source/game/china-tavern-role.js';
import {TAVERN_HIRING_ROLES as ROLES} from '../source/game/china-tavern-hiring.js';
const copy=structuredClone,RICE='yunlai-mushroom-rice';
function fixture(initial){
 let saved=copy(initial||{chinaServiceWorld:{serial:7,revision:3,till:0,orders:[]},copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}}),seconds=0,property,manager,ledger,links={},rejection=null,writes=0,staged=null;
 const actors=Object.fromEntries(Object.values(ROLES).map(r=>[r.originalHolderId,{station:{id:r.originalHolderId},bodyRevision:0,root:{position:{x:20,y:.215,z:8},userData:{},rotation:{y:0}},alive:true}]));
 let roles;
 const clock=()=>{const minutes=600+seconds*.7;return {seconds,day:Math.floor(minutes/1440),hour:minutes%1440/60};};
 function save(patch){if(rejection?.(patch))return false;saved=copy({...saved,...patch});writes++;return true;}
 function load(){links={};manager=null;
  ledger=createGameCurrencyLedger({saved,storage:{setItem(_key,json){return save(JSON.parse(json));}},transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
  property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock:clock,getTill:()=>saved.chinaServiceWorld.till,getBusinessAccount:()=>links.business,getStock:()=>links.stock,saveState:s=>save({chinaTavernProperty:s})});
  roles=Object.fromEntries(Object.values(ROLES).map(r=>[r.roleId,createTavernRole({...r,resolveActor:id=>actors[id],saved:saved.roleSources?.[r.roleId],saveState:next=>save({roleSources:{...saved.roleSources,[r.roleId]:next}})})]));
 }
 function start(){manager=createChinaTavernManagement({saved,property,sourceLinks:links,getClock:clock,saveFullWorld:save,getRole:id=>roles[id].resolve(),getActor:id=>actors[id],getScene:()=>({snapshot:()=>copy(saved.chinaServiceWorld),verifyStockOrderSource:(kind,proof)=>kind==='reserve'&&JSON.stringify(staged?.proof)===JSON.stringify(proof)}),verifySavedStockReceipt:(world,r)=>world.stockReceipts?.some(p=>JSON.stringify(p)===JSON.stringify(r))===true,getNPCProfile:id=>actors[id]?{actorId:id,bodyId:id,bodyRevision:0,name:id,ageYears:29,alive:true,protected:false,currentRoleId:Object.values(ROLES).find(r=>roles[r.roleId].state().holderId===id)?.roleId||null}:null});return manager;}
 load();return {start,get manager(){return manager;},get property(){return property;},get saved(){return copy(saved);},get writes(){return writes;},get roles(){return roles;},get actors(){return actors;},set seconds(v){seconds=v;},set reject(v){rejection=v;},reload(){load();return start();},
  stageReserve(number,dishId=RICE){const next=copy(saved.chinaServiceWorld);next.revision++;next.serial=number;const order={orderId:'cn-tavern-order-'+number,number,dishId,customerId:'cn-tavern-diner-west',customerName:'顾谨'};next.orders.push({id:order.orderId,number,dishId,customerId:order.customerId,customerName:order.customerName,stage:'requested'});staged={next,proof:{id:'cn-tavern-stock-reserve:'+order.orderId,sourceId:'chinaTavernServiceWorld',sourceRevision:next.revision,businessId:'cn-yunlai-tavern',order,unprepared:true}};return copy(staged.proof);},
  reserve(proof){const p=manager.prepareStockTransition('reserve',proof);assert(p.ok,p.code);assert(p.lock());const next=copy(staged.next);next.stockReceipts=[...(next.stockReceipts||[]),p.sourcePatch.receipt];try{const success=p.save(b=>manager.saveStockWorld({...b.patch,chinaServiceWorld:next}));if(success)assert(p.committed());return success;}finally{p.release();}},
  sellBusiness(){assert(property.setPrice(1).ok);assert(property.replyOffer(property.state().market.offers[0].id,true).ok);},
  buyBusiness(){for(let day=0;day<8;day++){assert(property.refreshDay().ok);const s=property.state();if(s.market.willing){assert(property.applyPurchase(s.market.price).ok);assert(property.confirmPurchase().ok);return;}seconds+=1440/.7;}throw Error('seller-unavailable');}};
}
{
 const f=fixture();f.buyBusiness();const m=f.start();assert.equal(m.loadError,null);assert(m.activate().ok);assert.equal(m.stock.summary().cutoff,7);assert.equal(m.stock.summary().purchaseCash,0);assert.equal(m.stock.summary().inventory[RICE].available,0);
 const request={operationId:'owner-request-1',dishId:RICE,quantity:2};const initialBalance=f.property.state().balance;
 f.reject=p=>p.chinaTavernBusiness?.receipts?.some(r=>r.kind==='stock-purchase');const denied=m.purchase(request);assert.equal(denied.ok,false);assert.equal(m.stock.summary().inventory[RICE].available,0);assert.equal(f.property.state().balance,initialBalance);assert.equal(m.business.accounting().procurementCash,0);assert.equal(f.saved.chinaTavernManagement.purchases.length,1,'actual owner confirmation survives rejected joint write');
 f.reject=null;const before=f.writes;assert(m.purchase(request).ok);assert.equal(f.writes,before+1,'one durable stock/property/business write');assert.equal(f.property.state().balance,initialBalance-4);assert.equal(m.stock.summary().inventory[RICE].available,2);assert.equal(m.business.accounting().procurementCash,4);
 const purchased=f.saved;assert(m.purchase(request).replayed);assert.deepEqual(f.saved,purchased);assert.equal(m.purchase({...request,quantity:3}).code,'purchase-operation-conflict');
 const restored=f.reload();assert.equal(restored.loadError,null);assert.equal(restored.stock.summary().inventory[RICE].available,2);assert(restored.purchase(request).replayed);assert.deepEqual(f.saved,purchased);
 const corrupt=copy(purchased);corrupt.chinaTavernManagement.purchases[0].proof.quantity=4;const bad=fixture(corrupt);assert(bad.start().loadError);assert.equal(bad.manager.purchase(request).ok,false);
}
console.log('PASS actual property+business+stock composition, refused joint save, durable owner authorization, exact once retry/reload, corrupted cross-source receipt blocks');
{
 const f=fixture();f.buyBusiness();const m=f.start();assert(m.activate().ok);f.seconds=3;
 f.reject=p=>p.chinaTavernBusiness?.contracts?.length>0;assert(m.update(.1));assert.equal(m.business.snapshot().contracts.length,0);assert.equal(m.snapshot().chinaTavernManagement.contracts.length,0,'rejected activation does not strand an old source timestamp');
 f.reject=null;f.seconds=10;assert(m.update(.1));const contracts=m.business.snapshot().contracts;assert.equal(contracts.length,3);assert(contracts.every(c=>c.activatedSeconds===10));assert.deepEqual(contracts.map(c=>c.salary.baseDailyWage),[24,26,16]);assert.equal(m.business.accounting().earnedWages,0,'mere role activation does not claim work');
 f.seconds=86400;const restored=f.reload();assert.equal(restored.loadError,null);assert(restored.update(.1));assert.equal(restored.business.accounting().earnedWages,0,'cold gap does not pay');assert.deepEqual(restored.business.snapshot().contracts,contracts);
 const corrupt=f.saved;corrupt.chinaTavernManagement.contracts[0].assignment.holderId='cn-tavern-diner-west';const bad=fixture(corrupt);assert(bad.start().loadError);
}
console.log('PASS actual original role source activation and business contract share save; refused activation retries at live time; no fabricated coverage/offline wage');

{
 const f=fixture(),m=f.start(),before=f.saved;assert.equal(m.activate().dormant,true);assert(m.update(.1));assert.deepEqual(f.saved,before);assert.deepEqual(m.stockAdmission(RICE),{enabled:false,ready:true,available:true,canPurchase:false});assert.equal(m.business.snapshot().contracts.length,0);
 f.buyBusiness();assert(m.activate().ok);const cutoff=m.stock.summary().cutoff;assert(f.property.draw(118).ok);f.sellBusiness();assert.equal(m.stockAdmission(RICE).enabled,true);assert.equal(m.stockAdmission(RICE).canPurchase,true);assert.equal(m.stock.summary().cutoff,cutoff);
 const proof=f.stageReserve(8);assert.equal(m.prepareStockTransition('reserve',proof).code,'insufficient-stock');assert(m.supplyForOrder(proof).ok);assert.equal(f.property.state().balance,0);assert.equal(m.stock.summary().inventory[RICE].available,1);assert.equal(m.business.accounting().procurementCash,2);
 const bought=f.saved;assert(m.supplyForOrder(proof).replayed);assert.deepEqual(f.saved,bought,'same named NPC shortage cannot purchase twice');
 f.reject=p=>p.chinaTavernStock?.events?.at(-1)?.kind==='reserve';assert.equal(f.reserve(proof),false);assert.deepEqual(f.saved,bought,'refused scene-stock write keeps both unchanged');f.reject=null;assert(f.reserve(proof));assert.equal(m.stock.summary().inventory[RICE].reserved,1);assert.equal(f.saved.chinaServiceWorld.stockReceipts.length,1);
 const restored=f.reload();assert.equal(restored.loadError,null);assert.equal(restored.stock.summary().cutoff,cutoff);assert.equal(restored.stockAdmission(RICE).canPurchase,false);const next=f.stageReserve(9);assert.equal(restored.supplyForOrder(next).code,'insufficient-business-funds');assert.equal(restored.stock.summary().inventory[RICE].purchased,1);
 assert.equal(restored.saveStockWorld({...restored.snapshot()}),false,'bridge accepts only its exact scene+stock candidate');
}
console.log('PASS default NPC loop dormant until player title; resale preserves cutoff; original named shortage buys one finite portion; scene+stock refusal/retry/cold restore; no money means no new stock');
