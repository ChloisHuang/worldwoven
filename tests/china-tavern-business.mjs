// Real regressions: personal or treasury minting, offline attendance, overlapping
// slots, unreserved trial work, lost arrears, split storage, changed salary terms,
// and meal reentry would make the operating route financially inconsistent.
import assert from 'node:assert/strict';
import {createChinaTavernBusiness,tavernSalaryTerms,verifySavedTavernBusinessPayment,TAVERN_OPERATING_MEAL_PROVIDER} from '../source/game/china-tavern-business.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaTavernStock} from '../source/game/china-tavern-stock.js';
import {createNPCGuestAccounts} from '../source/game/npc-guest-accounts.js';
import {TAVERN_HIRING_ROLES as ROLES,TAVERN_TRIAL_TABLE_IDS as TABLES} from '../source/game/china-tavern-hiring.js';
const copy=structuredClone,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),at=(day,hour)=>(day*1440+hour*60-600)/.7;
function fixture(initial){
 let saved=copy(initial||{chinaServiceWorld:{till:0,orders:[]},copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}}),durable=copy(saved),seconds=0,property,business,ledger,fail=null,onSave=null,writes=0;
 const source={contracts:[],requests:[],works:[],cancellations:[],stock:[],coverage:true};let stockSummary={materialExpense:0,inventoryValue:0};
 const getClock=()=>{const minutes=600+seconds*.7;return {seconds,day:Math.floor(minutes/1440),hour:minutes%1440/60};};
 const save=(patch)=>{const fn=onSave;onSave=null;fn?.();if(fail==='throw')throw Error('quota');if(fail==='false')return false;if(fail==='object')return {ok:false};if(fail==='promise')return Promise.resolve(true);if(fail==='reject')return Promise.reject(Error('no'));durable=copy({...saved,...patch});Object.assign(saved,copy(patch));writes++;return true;};
 const checks={verifyContract:c=>source.contracts.some(p=>same(p,c)),verifyCoverage:()=>source.coverage,
  verifyTrialRequest:(r,o)=>source.requests.some(p=>same(p.request,r)&&same(p.owner,o)),verifyTrialWork:p=>source.works.some(w=>same(w,p)),
  verifyTrialCancellation:(p,r)=>source.cancellations.some(c=>same(c,p))&&!source.works.some(w=>w.applicationId===r.applicationId),verifyStockReceipt:r=>source.stock.some(p=>same(p,r))};
 const load=()=>{
  business=null;ledger=createGameCurrencyLedger({saved,storage:{setItem(_key,json){return save(JSON.parse(json));}},transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
  property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock,getTill:()=>saved.chinaServiceWorld.till,getBusinessAccount:()=>business,getStock:()=>({summary:()=>stockSummary}),saveState:(next,patch={})=>save({...patch,chinaTavernProperty:next})});
  business=createChinaTavernBusiness({saved:saved.chinaTavernBusiness,getProperty:()=>property,getClock,...checks,saveState:(next,_receipt,patch={})=>save({...patch,chinaTavernBusiness:next})});
 };
 load();
 const f={source,checks,get business(){return business;},get property(){return property;},get ledger(){return ledger;},get clock(){return getClock();},get saved(){return copy(saved);},get durable(){return copy(durable);},get writes(){return writes;},set seconds(n){seconds=n;},get seconds(){return seconds;},set fail(v){fail=v;},set stockSummary(v){stockSummary=v;},onSave:fn=>onSave=fn,save,reload(){saved=copy(durable);load();},income(n){saved.chinaServiceWorld.till+=n;durable=copy(saved);},
  contract(roleName='assistant',actorId=ROLES[roleName].originalHolderId){const r=ROLES[roleName],c={id:'contract:'+actorId+':'+r.roleId,sourceId:'actual-role-source',sourceRevision:1,kind:actorId===r.originalHolderId?'retained-original-incumbent':'accepted-hiring',actorId,bodyId:actorId,roleId:r.roleId,slotId:r.slotId,holderRevision:1,activatedSeconds:seconds,salary:tavernSalaryTerms(r.roleId),proof:{receiptId:'actual-activation:'+actorId}};source.contracts.push(copy(c));const result=business.acceptContract(c);assert(result.ok,JSON.stringify(result));return c;},
  coverage:c=>({contractId:c.id,actorId:c.actorId,bodyId:c.bodyId,roleId:c.roleId,slotId:c.slotId,holderRevision:c.holderRevision,alive:true,available:true,inWorkArea:true,controller:'tavern-work',activity:'waiting',trial:false}),
  observe(c,end){const coverage=(Array.isArray(c)?c:[c]).map(f.coverage);business.observe({seconds,dt:.25,coverage});while(seconds<end){const next=Math.min(end,seconds+.25),dt=Math.min(.25,next-seconds);seconds=next;business.observe({seconds,dt,coverage});}},
  buy(){for(let d=0;d<8;d++){assert(property.refreshDay().ok);const s=property.state();if(s.market.willing){assert(property.applyPurchase(s.market.price).ok);assert(property.confirmPurchase().ok);return;}seconds+=1440/.7;}throw Error('no seller');},
  application(id='cn-tavern-application-1'){const owner=property.state(),a={id,status:'submitted',roleId:ROLES.assistant.roleId,owner:{ownerId:owner.ownerId,ownership:owner.ownership},actor:{actorId:'cn-tavern-diner-west',bodyId:'cn-tavern-diner-west'},trial:{request:{id:id+':trial',tableIds:[...TABLES],remuneration:{id:id+':trial:payment',amount:12}}}};source.requests.push({owner:copy(a.owner),request:{applicationId:id,trialId:a.trial.request.id,actorId:a.actor.actorId,bodyId:a.actor.bodyId,remunerationId:a.trial.request.remuneration.id,tableIds:[...TABLES]}});return a;},
  work(a){const w={id:a.id+':completed-work',sourceId:'cn-tavern-recruitment',sourceRevision:2,businessId:'cn-yunlai-tavern',applicationId:a.id,trialId:a.trial.request.id,actorId:a.actor.actorId,bodyId:a.actor.bodyId,steps:TABLES.map((tableId,i)=>({id:a.id+':clean:'+tableId,tableId,startedSeconds:seconds+i*5,completedSeconds:seconds+(i+1)*5}))};source.works.push(copy(w));return w;},
  mealPatch(actorId,number=1,amount=6,refund=false){return {chinaServiceWorld:{...saved.chinaServiceWorld,orders:[{id:'cn-tavern-order-'+number,customerId:actorId,price:amount,payment:refund?'refunded':'reserved',collected:!refund,...(refund?{cancelled:true}:{})}]}};},
 };return f;
}
const fail=(r,code)=>{assert.equal(r?.ok,false,JSON.stringify(r));if(code)assert.equal(r.code,code);};
{
 const f=fixture();assert.equal(f.business.loadError,null);assert.equal(f.property.state().balance,120);assert.equal(f.property.npcAccount('cn-tavern-host').total,480);
 f.seconds=at(1,6);const contracts=['host','chef','assistant'].map(r=>f.contract(r));f.observe(contracts,at(1,18));
 assert.deepEqual(f.business.state().rows.map(r=>r.segments.length),[1,1,1],JSON.stringify(f.business.state().rows[0]));assert.equal(f.business.accounting().earnedWages,25+27+17);assert.equal(f.property.state().availableBalance,51);
 assert(f.business.settleDue().ok);assert.equal(f.property.state().balance,51);assert.equal(f.business.account(contracts[0].actorId).bank,25);assert.equal(f.business.account(contracts[1].actorId).bank,27);assert.equal(f.business.account(contracts[2].actorId).bank,17);assert.equal(f.ledger.state().bank,900);assert.equal(f.property.npcAccount('cn-tavern-host').total,480);
 const before=f.business.snapshot(),writes=f.writes;assert(f.business.settleDue().ok);assert.equal(f.writes,writes);f.reload();assert.equal(f.business.loadError,null);assert.equal(f.property.state().loadError,null);assert.deepEqual(f.business.snapshot(),before);assert(f.business.settleDue().ok);
 const altered=f.durable;altered.chinaTavernBusiness.contracts[0].salary.baseDailyWage=100;const broken=fixture(altered);assert(broken.business.loadError);
}
console.log('PASS named host24/chef26/assistant16 + actual full-day1, one zero-origin bank receipt, no personal/player/treasury mint, historical reload and immutable terms');
{
 const f=fixture();f.seconds=at(1,6);const c=f.contract();f.observe(c,at(1,7));assert.equal(f.business.accounting().earnedWages,1);
 assert(f.business.checkpoint().ok);f.reload();f.seconds=at(1,12);const before=f.business.accounting().earnedWages;f.business.observe({seconds:f.seconds,dt:.25,coverage:[f.coverage(c)]});assert.equal(f.business.accounting().earnedWages,before,'cold gap earns nothing');
 f.seconds+=.25;assert.equal(f.business.observe({seconds:f.seconds,dt:.25,coverage:[{...f.coverage(c),controller:'meal'}]}),true);f.seconds+=.25;f.business.observe({seconds:f.seconds,dt:.25,coverage:[f.coverage(c)]});assert.equal(f.business.accounting().earnedWages,before);
 f.seconds+=30;assert.equal(f.business.observe({seconds:f.seconds,dt:30,coverage:[f.coverage(c)]}),false);
 const overlap=f.business.observe({seconds:f.seconds+.25,dt:.25,coverage:[f.coverage(c),f.coverage(c)]});assert.equal(overlap,false);assert.equal(f.business.lastError,'overlapping-tavern-coverage');
 f.seconds=at(1,18);assert(f.business.settleDue().ok);assert.equal(f.business.account(c.actorId).bank,1);
}
console.log('PASS only adjacent <=.25 live samples, cold/large gaps and other controllers excluded, duplicate actor/slot denied');
{
 const f=fixture();f.buy();assert(f.property.draw(115).ok);f.seconds=at(3,6);const c=f.contract('chef');f.observe(c,at(3,18));assert.equal(f.business.accounting().wagesPayable,27);
 fail(f.business.prepareWageSettlement({contractId:c.id,day:3}),'insufficient-business-funds');assert.equal(f.business.account(c.actorId).bank,0);assert.equal(f.property.state().balance,5);assert.equal(f.property.state().availableBalance,0);
 fail(f.property.draw(1),'insufficient-unreserved-business-funds');assert(f.property.setPrice(100).ok);const offer=f.property.state().market.offers[0];fail(f.property.replyOffer(offer.id,true),'business-obligations-unfunded');assert.equal(f.business.accounting().wagesPayable,27);
 assert(f.business.checkpoint().ok);f.reload();assert.equal(f.business.loadError,null);assert.equal(f.business.accounting().wagesPayable,27);f.income(22);assert(f.business.settleDue().ok);assert.equal(f.business.account(c.actorId).bank,27);assert.equal(f.property.state().balance,0);assert.equal(f.business.accounting().wagesPayable,0);
}
console.log('PASS earned debt survives failed payment/reload, protects draw/title, and settles once real business income arrives');
for(const mode of ['false','object','throw','promise','reject']){
 const f=fixture();f.buy();const a=f.application(),before=f.durable,initial=f.property.state().balance;f.fail=mode;const p=f.business.prepareTrialReservation({application:a});assert(p.ok);fail(p.commit());assert.deepEqual(f.durable,before);assert.equal(f.business.accounting().trialReserved,0);f.fail=null;
 const reserved=f.business.prepareTrialReservation({application:a}).commit();assert(reserved.ok);assert.equal(f.business.accounting().trialReserved,12);assert.equal(f.property.state().availableBalance,initial-12);
 assert(f.business.verifyTrialReceipt('reservation',reserved.receipt,a));const work=f.work(a);assert(f.business.recordTrialWork({reservationId:reserved.receipt.id,workProof:work}).ok);
 fail(f.business.prepareTrialRelease({reservationId:reserved.receipt.id,cancellationProof:{id:'cancel'}}),'completed-trial-obligation');
 const pre=f.durable;f.fail=mode;fail(f.business.prepareTrialPayment({reservationId:reserved.receipt.id,workProof:work}).commit());assert.deepEqual(f.durable,pre);assert.equal(f.business.account(a.actor.actorId).bank,0);assert.equal(f.business.accounting().trialEarned,12);f.fail=null;
 let nested;f.onSave(()=>{nested=f.property.draw(1);});const paid=f.business.prepareTrialPayment({reservationId:reserved.receipt.id,workProof:work}).commit();assert(paid.ok);fail(nested,'property-busy');assert.equal(f.business.account(a.actor.actorId).bank,12);assert.equal(f.property.state().balance,initial-12);assert.equal(f.business.accounting().trialReserved,0);assert(f.business.verifyTrialReceipt('payment',paid.receipt.proof.payment,a));assert(!f.business.verifyTrialReceipt('reservation',reserved.receipt,a));
 assert(verifySavedTavernBusinessPayment({saved:f.saved.chinaTavernBusiness,property:f.saved.chinaTavernProperty,proof:paid.receipt.proof.payment,application:a,...f.checks}));
 f.reload();assert.equal(f.business.loadError,null);assert.equal(f.property.state().loadError,null);assert(f.business.prepareTrialPayment({reservationId:reserved.receipt.id,workProof:work}).commit().replayed);assert.equal(f.business.account(a.actor.actorId).bank,12);
}
console.log('PASS reservation precedes work; failed/async saves release locks; completed trial debt survives cancellation, source-bound pay, cold read/reload/replay, reverse owner-draw reentry');
{
 const f=fixture();f.buy();const a=f.application(),p=f.business.prepareTrialReservation({application:a});assert(p.commit().ok);const cancellation={id:'real-cancel',sourceId:'recruitment',sourceRevision:2};f.source.cancellations.push(cancellation);
 assert(f.business.prepareTrialRelease({reservationId:p.receipt.id,cancellationProof:cancellation}).commit().ok);assert.equal(f.business.accounting().trialReserved,0);assert.equal(f.business.account(a.actor.actorId).bank,0);assert.equal(f.property.state().balance,120);f.reload();assert.equal(f.business.loadError,null);
 const next=f.application('cn-tavern-application-2');assert(f.property.draw(109).ok);fail(f.business.prepareTrialReservation({application:next}),'insufficient-unreserved-business-funds');
}
console.log('PASS incomplete canceled trial releases12 without wage or cash transfer; unfunded trial cannot reserve/start');
{
 const f=fixture();f.buy();const a=f.application(),p=f.business.prepareTrialReservation({application:a});assert(p.commit().ok);const work=f.work(a);assert(f.business.prepareTrialPayment({reservationId:p.receipt.id,workProof:work}).commit().ok);
 const bank=f.business.mealFundsProvider(),id=a.actor.actorId,meal={actorId:id,orderId:'cn-tavern-order-1',amount:6};
 const native=bank.prepareMealPayment(meal);assert(native.ok);fail(native.commit({}),'invalid-tavern-meal-world');assert(native.commit(f.mealPatch(id)).ok);assert.equal(bank.account(id).bank,6);
 assert(bank.prepareMealRefund(meal).commit(f.mealPatch(id,1,6,true)).ok);assert.equal(bank.account(id).bank,12);fail(bank.prepareMealPayment(meal),'tavern-meal-conflict');f.reload();assert.equal(f.business.loadError,null);assert.equal(f.business.account(id).bank,12);
 // Actual original cook personal purse + earned operating bank use the existing
 // meal coordinator; neither provider may overwrite the other's save.
 f.seconds=at(3,6);const cook=f.contract('chef');f.observe(cook,at(3,18));assert(f.business.settleDue().ok);
 const guest=createNPCGuestAccounts([{id:'tavern-personal-funds',economy:f.property.mealFundsProvider()},{id:TAVERN_OPERATING_MEAL_PROVIDER,economy:f.business.mealFundsProvider()}],{saveState:(next,patch)=>f.save({...patch,chinaGuestMealAccounts:next})});
 assert.equal(guest.loadError,null);const huge={actorId:cook.actorId,orderId:'cn-tavern-order-2',amount:246};const candidate=guest.prepareMealPayment(huge);assert(candidate.ok);assert(candidate.commit(f.mealPatch(cook.actorId,2,246)).ok);assert.equal(f.property.npcAccount(cook.actorId).total,0);assert.equal(f.business.account(cook.actorId).bank,21);
 f.reload();assert.equal(f.business.loadError,null);assert.equal(f.property.state().loadError,null);
}
console.log('PASS bank-only exact-price native meal/refund and original personal+earned bank aggregate split, no role requirement or balance migration');
{
 const f=fixture();f.buy();const budget=f.property.businessBudget(),proof={id:'real-purchase-1',sourceId:'purchase-approval',sourceRevision:1,businessId:'cn-yunlai-tavern',dishId:'rice',quantity:10,unitCost:2,costVersion:1,accepted:true},receipt={kind:'purchase',owner:{ownerId:budget.ownerId,ownership:budget.ownership},proof,allocation:null};f.source.stock.push(receipt);
 let stockLocked=false,stockDurable=false,adopted=false;const sourcePatch={kind:'purchase',receipt,businessDebit:{id:'tavern-stock-purchase:'+proof.id,businessId:'cn-yunlai-tavern',currency:'copper',amount:20,owner:receipt.owner,sourceId:budget.sourceId,sourceRevision:budget.sourceRevision,balanceBefore:budget.balance,balanceAfter:budget.balance-20},orderTransition:null};
 const stock={ok:true,amount:20,cost:20,patch:{chinaTavernStock:{testReceipt:receipt}},sourcePatch,valid:()=>!stockLocked&&!adopted,lock(){if(!this.valid())return false;stockLocked=true;return true;},save(fn){if(!stockLocked)return false;stockDurable=fn({})===true;return stockDurable;},committed(){if(!stockLocked||!stockDurable)return false;adopted=true;return true;},release(){stockLocked=false;}};
 const candidate=f.business.prepareStockPurchase({stockParticipant:stock});assert(candidate.ok);assert.equal(candidate.committed(),false);f.onSave(()=>assert.equal(f.business.prepareTrialReservation({application:f.application()}).ok,false));assert(candidate.commit().ok);assert(adopted);assert.equal(f.property.state().balance,100);assert.equal(f.property.state().procurementCash,20);assert.equal(f.property.state().operatingProfit,0);f.stockSummary={materialExpense:4,inventoryValue:16};f.income(12);assert.equal(f.property.state().operatingProfit,8);assert.equal(f.property.state().inventoryValue,16);assert.equal(f.property.state().balance,112);f.reload();assert.equal(f.business.loadError,null);assert.equal(f.property.state().loadError,null);
}
console.log('PASS exact stock budget+expense+inventory one save; procurement cash excluded from profit until actual consumed cost; source-bound reload');

// Compose the real stock candidate, real source budget and real business/property
// participants: nested source locks must survive one refused full-world save.
{
 const BUSINESS='cn-yunlai-tavern',RICE='yunlai-mushroom-rice';
 const activation={id:'actual-stock-activation',sourceId:'china-service-world',sourceRevision:0,businessId:BUSINESS,serial:0};
 const purchase={id:'actual-rice-purchase',sourceId:'accepted-supply',sourceRevision:1,businessId:BUSINESS,dishId:RICE,quantity:2,unitCost:2,costVersion:1,accepted:true};
 let root={chinaServiceWorld:{till:0,orders:[]},copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]},stockSource:{activation,accepted:[purchase],receipts:[]}},durable=copy(root),property,business,stock,ledger,refuse=false,writes=0;
 const owner=()=>{const state=property.state();return {ownerId:state.ownerId,ownership:state.ownership};};
 const atomic=(patch,sourceReceipt=null)=>{
  if(refuse)return false;
  const next={...copy(root),...copy(patch)};
  if(sourceReceipt&&!next.stockSource.receipts.some(r=>r.proof.id===sourceReceipt.proof.id))next.stockSource.receipts.push(copy(sourceReceipt));
  durable=copy(next);Object.assign(root,next);writes++;return true;
 };
 const source={
  verifyContract:()=>false,verifyCoverage:()=>false,verifyTrialRequest:()=>false,verifyTrialWork:()=>false,verifyTrialCancellation:()=>false,
  verifyStockReceipt:r=>root.stockSource.receipts.some(old=>same(old,r))||r.kind==='purchase'&&same(r.owner,owner())&&r.allocation===null&&root.stockSource.accepted.some(p=>same(p,r.proof)),
 };
 function load(){
  business=null;stock=null;
  ledger=createGameCurrencyLedger({saved:root,storage:{setItem(_key,json){return atomic(JSON.parse(json));}},transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
  property=createChinaTavernProperty({saved:root.chinaTavernProperty,copperLedger:ledger,getClock:()=>({day:0,hour:10,seconds:0}),getTill:()=>root.chinaServiceWorld.till,getBusinessAccount:()=>business,getStock:()=>stock,saveState:(next,patch={})=>atomic({...patch,chinaTavernProperty:next})});
  stock=createChinaTavernStock({saved:root.chinaTavernStock,readOwner:owner,readBusinessBudget:()=>property.businessBudget(),verifyActivationSource:p=>same(p,root.stockSource.activation),verifyPurchaseSource:p=>root.stockSource.accepted.some(old=>same(old,p)),verifyOrderSource:()=>false,verifyHistoricalReceipt:r=>root.stockSource.receipts.some(old=>same(old,r))});
  business=createChinaTavernBusiness({saved:root.chinaTavernBusiness,getProperty:()=>property,getClock:()=>({day:0,hour:10,seconds:0}),...source,saveState:(next,receipt,patch={})=>atomic({...patch,chinaTavernBusiness:next},receipt?.kind==='stock-purchase'?receipt.proof.sourcePatch.receipt:null)});
 }
 load();assert.equal(stock.loadError,null);assert.equal(business.loadError,null);
 const start=stock.prepareActivation({expectedRevision:stock.snapshot().revision,expectedOwner:owner(),proof:activation});assert(start.ok);assert(start.lock());assert(start.save(bundle=>atomic(bundle.patch,bundle.sourcePatch.receipt)));assert(start.committed());assert(start.release());
 const input=()=>({expectedRevision:stock.snapshot().revision,expectedOwner:owner(),proof:purchase});
 const baseline={root:copy(root),stock:stock.snapshot(),property:property.snapshot(),business:business.snapshot()},beforeWrites=writes;
 const rejected=business.prepareStockPurchase({stockParticipant:stock.preparePurchase(input())});assert(rejected.ok,rejected.code);refuse=true;fail(rejected.commit());assert.equal(writes,beforeWrites);assert.deepEqual(root,baseline.root);assert.deepEqual(stock.snapshot(),baseline.stock);assert.deepEqual(property.snapshot(),baseline.property);assert.deepEqual(business.snapshot(),baseline.business);
 refuse=false;const accepted=business.prepareStockPurchase({stockParticipant:stock.preparePurchase(input())});assert(accepted.ok,accepted.code);const result=accepted.commit();assert(result.ok,JSON.stringify(result));assert.equal(writes,beforeWrites+1,'all three real participants use one full-world write');
 assert.equal(property.state().balance,116);assert.equal(stock.summary().inventory[RICE].available,2);assert.equal(stock.summary().purchaseCash,4);assert.deepEqual(root.chinaTavernStock,stock.snapshot());assert.deepEqual(root.chinaTavernProperty,property.snapshot());assert.deepEqual(root.chinaTavernBusiness,business.snapshot());
 const receipt=copy(result.receipt);root=copy(durable);load();assert.equal(stock.loadError,null);assert.equal(business.loadError,null);assert.equal(property.state().loadError,null);assert.equal(property.state().balance,116);assert.equal(stock.summary().inventory[RICE].available,2);assert.deepEqual(root.stockSource.receipts.find(r=>r.kind==='purchase'),receipt.proof.sourcePatch.receipt);assert.deepEqual(property.snapshot().events.find(e=>e.id===receipt.id).receipt,receipt);assert.deepEqual(business.snapshot().receipts.find(r=>r.id===receipt.id),receipt);
}
console.log('PASS real stock+property+business composition: refused save unchanged, two rice at2 in one root write,116 cash/two portions, cold linked receipt equality');
