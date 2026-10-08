// Cross-source failures: accepted supply must debit the same original business
// once, and original assignments may start pay only at a durable live activation.
import assert from 'node:assert/strict';
import {createChinaTavernManagement} from '../source/game/china-tavern-management.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createTavernRole} from '../source/game/china-tavern-role.js';
import {TAVERN_HIRING_ROLES as ROLES} from '../source/game/china-tavern-hiring.js';
const copy=structuredClone,RICE='yunlai-mushroom-rice';
function fixture(initial,sources={}){
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
 function start(){manager=createChinaTavernManagement({saved,property,sourceLinks:links,getClock:clock,saveFullWorld:save,getRole:id=>roles[id].resolve(),getActor:id=>actors[id],verifyQualification:()=>false,prepareRoleDismissal:roleId=>{const p=roles[roleId].prepareAssignment(null),patch=p.ok?{roleSources:{...saved.roleSources,[roleId]:p.assignment}}:null;return p.ok?{...p,patch,save:fn=>p.save(()=>fn({patch}))}:p;},getScene:()=>({snapshot:()=>copy(saved.chinaServiceWorld),verifyStockOrderSource:(kind,proof)=>kind==='reserve'&&JSON.stringify(staged?.proof)===JSON.stringify(proof)}),verifySavedStockReceipt:(world,r)=>world.stockReceipts?.some(p=>JSON.stringify(p)===JSON.stringify(r))===true,getNPCProfile:id=>actors[id]?{actorId:id,bodyId:id,bodyRevision:0,name:id,ageYears:29,alive:true,protected:false,currentRoleId:Object.values(ROLES).find(r=>roles[r.roleId].state().holderId===id)?.roleId||null}:null,...sources});return manager;}
 load();return {start,get manager(){return manager;},get property(){return property;},get saved(){return copy(saved);},get writes(){return writes;},get roles(){return roles;},get actors(){return actors;},get clock(){return clock();},set seconds(v){seconds=v;},set reject(v){rejection=v;},reload(){load();return start();},
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

{
 const f=fixture();f.buyBusiness();const m=f.start(),role=ROLES.host,id=role.originalHolderId;
 assert.equal(m.readExistingQualification(id,role.roleId),null,'actor identity alone is not an incumbency receipt');
 f.reject=patch=>patch.chinaTavernBusiness?.contracts?.length>0;assert.equal(m.dismiss(role.roleId).ok,false);assert.equal(f.roles[role.roleId].state().holderId,id,'failed source save cannot vacate the original holder');assert.equal(m.readExistingQualification(id,role.roleId),null);
 f.reject=null;assert(m.dismiss(role.roleId).ok,'same-frame owner dismissal first preserves the actual original assignment');assert.equal(f.roles[role.roleId].state().holderId,null);
 const proof=m.readExistingQualification(id,role.roleId);assert.equal(proof.kind,'existing-incumbency');assert.equal(proof.sourceId,'chinaTavernManagement');assert.equal(proof.roleId,role.roleId);assert(m.verifyExistingQualification(proof));assert.equal(m.business.accounting().trialPaid,0);assert.equal(m.business.accounting().earnedWages,0);
 assert.equal(m.readExistingQualification(id,ROLES.chef.roleId),null);assert.equal(m.verifyExistingQualification({...proof,actorId:'cn-tavern-diner-west'}),false);assert.equal(m.verifyExistingQualification({...proof,sourceRevision:proof.sourceRevision+1}),false);
 const restored=f.reload();assert.equal(restored.loadError,null);assert.deepEqual(restored.readExistingQualification(id,role.roleId),proof);assert(restored.verifyExistingQualification(proof,{roleId:role.roleId,actor:{actorId:id,bodyId:id,bodyRevision:0}}));assert.equal(restored.verifyExistingQualification(proof,{roleId:role.roleId,actor:{actorId:id,bodyId:id,bodyRevision:1}}),false);
 f.sellBusiness();assert(restored.verifyExistingQualification(proof),'historical qualification survives ownership transfer');f.actors[id].bodyRevision=1;assert.equal(restored.readExistingQualification(id,role.roleId),null,'live discovery cannot reuse an old body generation');assert(restored.verifyExistingQualification(proof),'historical verification does not need the present body');delete f.actors[id];assert(restored.verifyExistingQualification(proof));
 const removed=f.saved;removed.chinaTavernBusiness.contracts=[];const absent=fixture(removed).start();assert.equal(absent.verifyExistingQualification(proof),false,'an activation row without its independent business contract is insufficient');
 const late=fixture();late.buyBusiness();assert(late.roles[role.roleId].assign(null).ok);const lateManager=late.start();assert(lateManager.update(.1));assert.equal(lateManager.readExistingQualification(id,role.roleId),null,'vacancy cannot retrospectively manufacture original incumbency');
}
console.log('PASS original rehire qualification requires actual durable retained contract; same-frame dismissal saves source first or remains occupied; exact original role/body, independent bank source and historical cold checks');

// Real recruitment/hiring/business/role cores execute this short trial against
// a clear-floor source adapter. It records each table only after the runtime's
// actual movement, facing and five active seconds; it never supplies paid work.
{
 const WEST='cn-tavern-diner-west',same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);let f,m;
 const owner=()=>({ownerId:f.property.state().ownerId,ownership:f.property.state().ownership});
 const profile=id=>{const n=f.actors[id];return n?{actorId:id,name:id===WEST?'顾谨':id,bodyId:id,bodyRevision:n.bodyRevision??0,ageYears:29,alive:n.alive,protected:false,currentRoleId:Object.values(ROLES).find(r=>f.roles[r.roleId].state().holderId===id)?.roleId||null}:null;};
 const candidate=id=>m.recruitment.candidate(id),actor=id=>f.actors[id],position=n=>[n.root.position.x,n.root.position.y,n.root.position.z];
 const leaseValid=(id,c)=>c?.lease?.id===c?.id+':source-customer-release'&&c.lease.actorId===id;
 const scene={snapshot:()=>f.saved.chinaServiceWorld,
  recruitmentActorState:(id,c)=>({bodyId:id,bodyRevision:0,alive:actor(id).alive,inScene:!!actor(id),standing:!actor(id).serviceMount,busy:false,sociallyHeld:false,hasCarriedObjects:false,originalOrderSafe:!f.saved.chinaServiceWorld.orders.some(o=>o.customerId===id&&o.stage!=='done'),customerLeaseValid:leaseValid(id,c)}),
  releaseRecruitmentCustomer:(id,c)=>({id:c.id+':source-customer-release',actorId:id,bodyId:id}),returnRecruitmentCustomer:()=>true,
  resolveRecruitmentMeetingPoint:()=>({id:'existing-public-reception',position:[22.35,.215,6.7]}),
  moveRecruitmentActor(id,target,dt){const n=actor(id),p=n.root.position,[x,y,z]=target.position,dist=Math.hypot(x-p.x,z-p.z),step=Math.min(dist,dt*3);if(dist){p.x+=(x-p.x)*step/dist;p.z+=(z-p.z)*step/dist;}p.y=y;n.walking=dist>step+.001;return !n.walking;},stopRecruitmentMove:id=>{actor(id).walking=false;},
  claimRecruitmentTable:(id,t,c)=>({id:c.id+':source-table:'+t.id,actorId:id,tableId:t.id}),recruitmentTableClaimValid:(id,p,t,c)=>p.id===c.id+':source-table:'+t.id&&p.actorId===id&&p.tableId===t.id,
  releaseRecruitmentTable:()=>true,canRecruitmentWorkTable:(id,t)=>Math.hypot(actor(id).root.position.x-t.position[0],actor(id).root.position.z-t.position[2])<.12,
  faceRecruitmentWork(id,target){const n=actor(id);n.root.rotation.y=Math.atan2(target[0]-n.root.position.x,target[2]-n.root.position.z);},
  prepareRecruitmentTableWork({proof,candidate:c}){const before=f.saved.chinaServiceWorld,n=actor(c.actorId),pending=m.recruitment.snapshot().pending.some(e=>same(e.receipt,proof));let locked=false,durable=false;
   const valid=()=>pending&&proof.activeSeconds===5&&proof.completedSeconds-proof.startedSeconds>=5&&Math.hypot(n.root.position.x-proof.position[0],n.root.position.z-proof.position[2])<.12;
   const next={...before,revision:before.revision+1,recruitmentTableReceipts:[...(before.recruitmentTableReceipts||[]),copy(proof)]};
   return {ok:valid(),patch:{chinaServiceWorld:next},valid,lock(){return locked=valid();},save(fn,r){if(!locked||!valid())return false;return durable=fn({chinaServiceWorld:next,chinaTavernRecruitment:r})===true;},committed:()=>durable,release(){locked=false;}};
  }};
 f=fixture(null,{getScene:()=>scene,getNPCProfile:profile,
  readPlayerState:()=>({actorId:'player',position:[21.2,.215,6.7],inScene:true,standing:true,busy:false,mounted:false}),canSeeOwner:()=>true,
  verifySavedTrialTableWork:(world,p)=>world.recruitmentTableReceipts?.some(v=>same(v,p))===true,
  readSafeHandoff(a){const c=candidate(a.id),r=f.roles[a.roleId].state();return leaseValid(a.actor.actorId,c)&&r.holderId===null?{id:a.id+':actual-handoff',sourceId:'clear-floor-role-source',sourceRevision:r.revision,businessId:'cn-yunlai-tavern',applicationId:a.id,actorId:a.actor.actorId,bodyId:a.actor.bodyId,slotId:a.slotId,slotRevision:a.slotRevision,customerReleaseReceiptId:c.lease.id,destinationReleaseReceiptId:r.slotId+':vacant:'+r.revision}:null;},
  prepareRoleAssignment(a){const p=f.roles[a.roleId].prepareAssignment(a.actor.actorId,{expectedRevision:a.slotRevision});return p.ok?{...p,patch:{roleSources:{...f.saved.roleSources,[a.roleId]:p.assignment}}}:p;},
 });
 f.actors[WEST]={station:{id:WEST},bodyRevision:0,alive:true,walking:false,root:{position:{x:22.35,y:.215,z:6.7},rotation:{y:0}}};f.buyBusiness();m=f.start();assert(m.dismiss(ROLES.assistant.roleId).ok);
 const step=()=>{f.seconds=f.clock.seconds+.1;m.update(.1);},until=(fn,label)=>{for(let i=0;i<5000&&!fn();i++)step();assert(fn(),label+': '+JSON.stringify({runtime:m.recruitment.state(),hiring:m.hiring.applications(),last:m.lastError}));};
 const choice=m.recruitment.additionalChoices(WEST)[0];assert(choice);assert(m.recruitment.acceptChoice(WEST,{...choice,startedAt:f.clock.seconds}));until(()=>candidate(WEST)?.phase==='meeting','applicant reaches original public meeting');const id=candidate(WEST).applicationId;
 f.reject=p=>p.chinaTavernBusiness?.receipts?.some(r=>r.kind==='trial-payment');assert(m.executeIntent(m.recruitment.intent(id,'trial')));until(()=>candidate(id)?.phase==='review','two real five-second steps and return');assert.equal(m.hiring.application(id).trial.work.steps.length,2);assert.equal(m.business.account(WEST).bank,0);assert.equal(m.hiring.application(id).trial.payment,null);
 assert(m.reviewApplication(id,true));until(()=>m.hiring.application(id).status==='assigned','approved candidate reaches actual role assignment');assert.equal(candidate(id).phase,'assigned');assert.equal(m.business.account(WEST).bank,0);
 f.reject=null;step();assert.equal(m.business.account(WEST).bank,12);assert(m.hiring.application(id).trial.payment);assert.equal(m.business.snapshot().receipts.filter(r=>r.kind==='trial-payment').length,1);for(let i=0;i<4;i++)step();assert.equal(m.business.account(WEST).bank,12);assert.equal(m.business.snapshot().receipts.filter(r=>r.kind==='trial-payment').length,1);
}
console.log('PASS actual completed trial rejected payment survives assigned terminal branch; normal management update separately settles exactly12 once, without more work');
