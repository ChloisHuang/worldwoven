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
 let saved=copy(initial||{chinaServiceWorld:{serial:7,revision:3,till:0,orders:[]},copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}}),seconds=0,property,manager,ledger,links={},rejection=null,writes=0;
 const actors=Object.fromEntries(Object.values(ROLES).map(r=>[r.originalHolderId,{station:{id:r.originalHolderId},bodyRevision:0,root:{position:{x:20,y:.215,z:8},userData:{},rotation:{y:0}},alive:true}]));
 let roles;
 const clock=()=>{const minutes=600+seconds*.7;return {seconds,day:Math.floor(minutes/1440),hour:minutes%1440/60};};
 function save(patch){if(rejection?.(patch))return false;saved=copy({...saved,...patch});writes++;return true;}
 function load(){links={};manager=null;
  ledger=createGameCurrencyLedger({saved,storage:{setItem(_key,json){return save(JSON.parse(json));}},transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
  property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock:clock,getTill:()=>saved.chinaServiceWorld.till,getBusinessAccount:()=>links.business,getStock:()=>links.stock,saveState:s=>save({chinaTavernProperty:s})});
  roles=Object.fromEntries(Object.values(ROLES).map(r=>[r.roleId,createTavernRole({...r,resolveActor:id=>actors[id],saved:saved.roleSources?.[r.roleId],saveState:next=>save({roleSources:{...saved.roleSources,[r.roleId]:next}})})]));
 }
 function start(){manager=createChinaTavernManagement({saved,property,sourceLinks:links,getClock:clock,saveFullWorld:save,getRole:id=>roles[id].resolve(),getActor:id=>actors[id],getScene:()=>({snapshot:()=>copy(saved.chinaServiceWorld)}),getNPCProfile:id=>actors[id]?{actorId:id,bodyId:id,bodyRevision:0,name:id,ageYears:29,alive:true,protected:false,currentRoleId:Object.values(ROLES).find(r=>roles[r.roleId].state().holderId===id)?.roleId||null}:null});return manager;}
 load();return {start,get manager(){return manager;},get property(){return property;},get saved(){return copy(saved);},get writes(){return writes;},get roles(){return roles;},get actors(){return actors;},set seconds(v){seconds=v;},set reject(v){rejection=v;},reload(){load();return start();},
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
 const f=fixture(),m=f.start();assert(m.activate().ok);f.seconds=3;
 f.reject=p=>p.chinaTavernBusiness?.contracts?.length>0;assert(m.update(.1));assert.equal(m.business.snapshot().contracts.length,0);assert.equal(m.snapshot().chinaTavernManagement.contracts.length,0,'rejected activation does not strand an old source timestamp');
 f.reject=null;f.seconds=10;assert(m.update(.1));const contracts=m.business.snapshot().contracts;assert.equal(contracts.length,3);assert(contracts.every(c=>c.activatedSeconds===10));assert.deepEqual(contracts.map(c=>c.salary.baseDailyWage),[24,26,16]);assert.equal(m.business.accounting().earnedWages,0,'mere role activation does not claim work');
 f.seconds=86400;const restored=f.reload();assert.equal(restored.loadError,null);assert(restored.update(.1));assert.equal(restored.business.accounting().earnedWages,0,'cold gap does not pay');assert.deepEqual(restored.business.snapshot().contracts,contracts);
 const corrupt=f.saved;corrupt.chinaTavernManagement.contracts[0].assignment.holderId='cn-tavern-diner-west';const bad=fixture(corrupt);assert(bad.start().loadError);
}
console.log('PASS actual original role source activation and business contract share save; refused activation retries at live time; no fabricated coverage/offline wage');
