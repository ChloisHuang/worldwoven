import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChinaTavernStock,TAVERN_STOCK_BUSINESS_ID as BUSINESS,TAVERN_STOCK_COSTS as COSTS} from '../source/game/china-tavern-stock.js';

// Pure journal tests target replay, source drift and partial-commit defects;
// they do not construct scenes, actors, timers or an alternative money ledger.
const copy=structuredClone,RICE='yunlai-mushroom-rice',NOODLES='yunlai-green-noodles';
const equal=(a,b)=>{try{assert.deepEqual(a,b);return true;}catch{return false;}};
function fixture(saved=null,prior=null,costs=COSTS) {
 const source=prior ?? {owner:{ownerId:'cn-tavern-host',ownership:0},cash:120,budgetRevision:0,serial:2,nonce:0,
  checkpoints:new Map(),live:new Map(),history:new Map(),worldStock:new Map()};
 const durable={stock:copy(saved),cash:source.cash,history:copy(source.history),worldStock:copy(source.worldStock),writes:0};
 const flags={save:null,owner:null,budget:null,history:null};
 const options={saved,costs,
  readOwner:()=>flags.owner ? flags.owner() : copy(source.owner),
  readBusinessBudget:()=>flags.budget ? flags.budget() : {businessId:BUSINESS,...copy(source.owner),sourceId:'property',sourceRevision:source.budgetRevision,balance:source.cash},
  verifyActivationSource:p=>equal(source.checkpoints.get(p.id),p),
  verifyPurchaseSource:p=>equal(source.live.get('purchase:'+p.id),p),
  verifyOrderSource:(kind,p)=>equal(source.live.get(kind+':'+p.id),p),
  verifyHistoricalReceipt:r=>flags.history ? flags.history(r) : equal(source.history.get(r.proof.id),r),
 };
 const stock=createChinaTavernStock(options);
 const input=(proof,extra={})=>({expectedRevision:stock.snapshot().revision,expectedOwner:copy(source.owner),...(proof?{proof}:{}),...extra});
 const activation=()=>{const p={id:'activation:'+source.serial,sourceId:'service-world',sourceRevision:source.nonce++,businessId:BUSINESS,serial:source.serial};source.checkpoints.set(p.id,copy(p));return p;};
 const purchase=(quantity=1,dishId=RICE)=>{
  const p={id:'purchase:'+ ++source.nonce,sourceId:'accepted-supply',sourceRevision:source.nonce,businessId:BUSINESS,
   dishId,quantity,unitCost:costs.unitCosts[dishId],costVersion:costs.version,accepted:true};
  source.live.set('purchase:'+p.id,copy(p));return p;
 };
 const orderProof=(kind,number=3,dishId=RICE,extra={})=>{
  const p={id:kind+':'+number,sourceId:'service-world',sourceRevision:++source.nonce,businessId:BUSINESS,
   order:{orderId:'cn-tavern-order-'+number,number,dishId,customerId:'cn-tavern-diner-west',customerName:'顾谨'},
   ...(kind==='reserve'?{unprepared:true}:kind==='consume'?{preparationId:'physical-prep:'+number,completed:true}:{reason:'customer-cancelled'}),...extra};
  source.live.set(kind+':'+p.id,copy(p));return p;
 };
 function save(bundle) {
  if(flags.save) return flags.save(bundle);
  const d=bundle.sourcePatch.businessDebit,t=bundle.sourcePatch.orderTransition;
  if(d) {
   assert.equal(d.businessId,BUSINESS);assert.deepEqual(d.owner,source.owner);assert.equal(d.currency,'copper');
   assert.equal(d.sourceRevision,source.budgetRevision);assert.equal(d.balanceBefore,source.cash);
   assert.equal(d.balanceAfter,source.cash-bundle.amount);assert(d.balanceAfter>=0);
  }
  if(t) assert.deepEqual(t.before,source.worldStock.get(t.order.orderId) ?? null);
  durable.stock=copy(bundle.patch.chinaTavernStock);durable.cash=d?.balanceAfter ?? source.cash;
  durable.history=copy(source.history);durable.history.set(bundle.sourcePatch.receipt.proof.id,copy(bundle.sourcePatch.receipt));
  durable.worldStock=copy(source.worldStock);if(t)durable.worldStock.set(t.order.orderId,copy(t.after));durable.writes++;
  return true;
 }
 function commit(p) {
  assert(p.ok,p.code);assert(p.lock());const before=stock.snapshot(),cash=source.cash;
  assert(!p.committed());assert(p.save(save));assert.deepEqual(stock.snapshot(),before);assert.equal(source.cash,cash);
  assert(!p.release());assert(p.committed());assert(p.committed());assert(p.release());
  if(source.cash!==durable.cash)source.budgetRevision++;
  source.cash=durable.cash;source.history=copy(durable.history);source.worldStock=copy(durable.worldStock);
  assert.deepEqual(stock.snapshot(),durable.stock);return p;
 }
 const activate=()=>commit(stock.prepareActivation(input(stock.snapshot().activationPlan ?? activation())));
 const buy=(q=1,dish=RICE)=>{const proof=purchase(q,dish);commit(stock.preparePurchase(input(proof)));return proof;};
 const reserve=(n=3,dish=RICE)=>{const proof=orderProof('reserve',n,dish);commit(stock.prepareReserve(input(proof)));return proof;};
 const consume=(n=3,dish=RICE)=>{const proof=orderProof('consume',n,dish);commit(stock.prepareConsume(input(proof)));return proof;};
 const cancel=(n=3,dish=RICE)=>{const proof=orderProof('cancel',n,dish);commit(stock.prepareCancel(input(proof)));return proof;};
 return {stock,source,durable,flags,options,input,activation,purchase,orderProof,save,commit,activate,buy,reserve,consume,cancel};
}

// No initial inventory, periodic refill or debit. The owner is an exact real
// property identity and epoch; ordinary property revision is a separate fence.
for(const ownerId of ['player','cn-tavern-host','cn-tavern-cook','cn-tavern-assistant']) {
 const f=fixture();f.source.owner.ownerId=ownerId;assert.equal(f.stock.summary().inventoryValue,0);
 assert.equal(f.stock.preparePurchase(f.input(f.purchase())).code,'stock-inactive');f.activate();
 assert.equal(f.stock.summary().purchaseCash,0);assert.equal(f.source.cash,120);
 assert.equal(f.stock.prepareReserve(f.input(f.orderProof('reserve'))).code,'insufficient-stock');
 assert.equal(f.stock.snapshot().revision,1);assert.equal(f.durable.writes,1);
}
for(const change of [o=>{o.ownerId='invented-owner';},o=>{delete o.ownership;},o=>{o.ownership=-1;},o=>{o.extra=true;}]) {
 const f=fixture();change(f.source.owner);assert(!f.stock.prepareActivation(f.input(f.activation())).ok);assert.equal(f.stock.snapshot().activationPlan,null);
}
{
 const f=fixture();f.activate();f.source.cash=1;const before=f.stock.snapshot();
 assert.equal(f.stock.preparePurchase(f.input(f.purchase())).code,'insufficient-business-funds');assert.deepEqual(f.stock.snapshot(),before);assert.equal(f.source.cash,1);
 assert.equal(f.stock.prepareReserve(f.input(f.orderProof('reserve'))).code,'insufficient-stock');
}

// The first actual serial checkpoint survives false/throw/Promise writes and
// ordinary snapshot/cold restore. Retry cannot exempt newly admitted orders.
const badSaves=[()=>false,()=>undefined,()=>({ok:true}),()=>({ok:false}),()=>{throw Error('quota');},()=>Promise.resolve(true),()=>Promise.reject(Error('quota'))];
for(const badSave of badSaves) {
 const f=fixture(),proof=f.activation(),p=f.stock.prepareActivation(f.input(proof));
 assert(p.ok);assert.equal(f.stock.snapshot().activationPlan.serial,2);assert(!f.stock.summary().active);
 assert(p.lock());assert(!p.save(badSave));assert(!p.committed());assert(p.release());assert.equal(f.source.cash,120);
 assert.equal(f.stock.snapshot().revision,0);assert.equal(f.durable.stock,null);
 f.source.serial=8;const reload=fixture(f.stock.snapshot(),f.source);
 assert.equal(reload.stock.loadError,null);assert.equal(reload.stock.snapshot().activationPlan.serial,2);
 assert.equal(reload.stock.prepareActivation(reload.input(reload.activation())).code,'activation-plan-conflict');
 reload.commit(reload.stock.prepareActivation(reload.input()));
 assert(reload.stock.prepareReserve(reload.input(reload.orderProof('reserve',2))).legacy);
 assert(reload.stock.prepareConsume(reload.input(reload.orderProof('consume',1))).legacy);
 assert(reload.stock.prepareCancel(reload.input(reload.orderProof('cancel',2))).legacy);
 assert.equal(reload.stock.prepareReserve(reload.input(reload.orderProof('reserve',3))).code,'insufficient-stock');
 assert.equal(reload.stock.prepareConsume(reload.input(reload.orderProof('consume',3))).code,'stock-reservation-required');
 assert.equal(reload.stock.summary().cutoff,2);await Promise.resolve();
}

// FIFO matching portions reserve without consuming, release before prep, and
// never return prepared material. Waste is already included in materialExpense.
{
 const f=fixture();f.activate();const rice=f.buy(2),noodles=f.buy(1,NOODLES);
 assert.equal(f.source.cash,113);assert.equal(f.stock.summary().purchaseCash,7);assert.equal(f.stock.summary().materialExpense,0);
 assert.equal(f.stock.summary().inventoryValue,7);const reserved=f.reserve();
 assert.equal(f.stock.order(reserved.order.orderId).allocation.purchaseId,rice.id);assert.equal(f.stock.order(reserved.order.orderId).allocation.portion,1);
 assert.deepEqual(f.stock.summary().inventory[RICE],{purchased:2,available:1,reserved:1,consumed:0,wasted:0,value:4});
 assert.equal(f.stock.summary().materialExpense,0);f.cancel();
 assert.equal(f.stock.summary().inventory[RICE].available,2);assert.equal(f.stock.summary().inventoryValue,7);
 f.reserve(4);assert.equal(f.stock.order('cn-tavern-order-4').allocation.portion,1);f.consume(4);
 assert.equal(f.stock.summary().materialExpense,2);assert.equal(f.stock.summary().inventoryValue,5);f.cancel(4);
 assert.equal(f.stock.summary().materialExpense,2);assert.equal(f.stock.summary().wasteExpense,2);
 assert.equal(f.stock.summary().inventory[RICE].available,1);assert.equal(f.stock.order('cn-tavern-order-4').status,'wasted');
 f.reserve(5,NOODLES);assert.equal(f.stock.order('cn-tavern-order-5').allocation.purchaseId,noodles.id);f.consume(5,NOODLES);
 assert.equal(f.stock.summary().materialExpense,5);assert.equal(f.stock.summary().inventoryValue,2);assert.equal(f.source.cash,113);
 assert.equal(f.stock.prepareReserve(f.input(f.orderProof('reserve',6,NOODLES))).code,'insufficient-stock');
 const restored=fixture(f.stock.snapshot(),f.source);assert.equal(restored.stock.loadError,null);assert.deepEqual(restored.stock.summary(),f.stock.summary());
}

// Every cash/world transition must survive one strict synchronous joint write.
// A failed purchase or order write changes neither side and can be retried.
const stages=[
 f=>{f.activate();return ['preparePurchase',f.purchase(3)];},
 f=>{f.activate();f.buy();return ['prepareReserve',f.orderProof('reserve')];},
 f=>{f.activate();f.buy();f.reserve();return ['prepareConsume',f.orderProof('consume')];},
 f=>{f.activate();f.buy();f.reserve();return ['prepareCancel',f.orderProof('cancel')];},
 f=>{f.activate();f.buy();f.reserve();f.consume();return ['prepareCancel',f.orderProof('cancel')];},
];
for(const stage of stages) for(const badSave of badSaves) {
 const f=fixture(),[method,proof]=stage(f),before=f.stock.snapshot(),cash=f.source.cash,stored=copy(f.durable),p=f.stock[method](f.input(proof));
 assert(p.ok,p.code);assert(p.lock());assert(!p.save(badSave));assert(!p.committed());assert(p.release());
 assert.deepEqual(f.stock.snapshot(),before);assert.equal(f.source.cash,cash);assert.deepEqual(f.durable,stored);
 f.commit(f.stock[method](f.input(proof)));await Promise.resolve();
}

// Duplicate callbacks and cold reloads do not debit, reserve or consume again.
// An ID changed to target another dish, customer, price or quantity conflicts.
{
 const f=fixture();f.activate();const purchase=f.buy(2),reserve=f.reserve(),consume=f.consume(),cancel=f.cancel(),before=f.stock.snapshot();
 for(const [method,proof] of [['preparePurchase',purchase],['prepareReserve',reserve],['prepareConsume',consume],['prepareCancel',cancel]]) {
  const r=f.stock[method](f.input(proof));assert(r.replayed);assert.equal(r.amount,0);assert.equal(r.sourcePatch,null);assert.equal(r.lock,undefined);
  const reload=fixture(f.stock.snapshot(),f.source);assert(reload.stock[method](reload.input(proof)).replayed);
  const bad=copy(proof);if(bad.order)bad.order.customerName='另一位';else bad.quantity++;
  assert.equal(f.stock[method](f.input(bad)).code,'stock-receipt-conflict');
 }
 assert.deepEqual(f.stock.snapshot(),before);assert.equal(f.source.cash,116);
 const changed=f.orderProof('reserve',3,NOODLES,{id:'different-reserve'});
 assert.equal(f.stock.prepareReserve(f.input(changed)).code,'stock-order-conflict');
 const another=f.orderProof('consume',3,RICE,{id:'another-consume'});
 assert.equal(f.stock.prepareConsume(f.input(another)).code,'stock-receipt-conflict');
}
{
 const f=fixture();f.activate();f.buy(2);f.reserve();const p=f.consume();f.reserve(4);
 assert.equal(f.stock.prepareConsume(f.input(f.orderProof('consume',4,RICE,{preparationId:p.preparationId}))).code,'invalid-stock-state');
 assert.equal(f.stock.order('cn-tavern-order-4').status,'reserved');
}

// Future purchase prices never revalue old lots or historical consumption.
{
 const f=fixture();f.activate();f.buy(2);f.reserve();
 const v2={version:2,unitCosts:{[RICE]:5,[NOODLES]:7}},g=fixture(f.stock.snapshot(),f.source,v2);
 assert.equal(g.stock.loadError,null);g.consume();assert.equal(g.stock.summary().materialExpense,2);g.buy();g.reserve(4);
 assert.equal(g.stock.order('cn-tavern-order-4').allocation.unitCost,2);g.consume(4);g.reserve(5);g.consume(5);
 assert.equal(g.stock.order('cn-tavern-order-5').allocation.unitCost,5);assert.equal(g.stock.order('cn-tavern-order-5').allocation.costVersion,2);
 assert.equal(g.stock.summary().purchaseCash,9);assert.equal(g.stock.summary().materialExpense,9);assert.equal(g.stock.summary().inventoryValue,0);
 assert.equal(g.source.cash,111);assert.equal(fixture(g.stock.snapshot(),g.source).stock.loadError,null);
}

// Exact revision/owner/budget/live-source fences reject stale or competing
// candidates. History stays valid across a real owner transfer.
for(const mutate of [f=>{f.source.owner.ownership++;},f=>{f.source.owner.ownerId='player';},f=>{f.source.cash--;},
 f=>{f.source.budgetRevision++;},f=>{f.source.live.clear();},f=>{f.source.history.clear();}]) {
 const f=fixture();f.activate();const p=f.stock.preparePurchase(f.input(f.purchase()));assert(p.ok);mutate(f);
 assert(!p.valid());assert(!p.lock());assert(!p.committed());
}
{
 const f=fixture();f.activate();f.buy();const proof=f.orderProof('reserve'),p=f.stock.prepareReserve(f.input(proof));assert(p.lock());
 f.source.live.delete('reserve:'+proof.id);let writes=0;assert(!p.save(()=>{writes++;return true;}));assert.equal(writes,0);assert(p.release());
}
{
 const f=fixture();f.activate();const firstProof=f.purchase(),secondProof=f.purchase(),a=f.stock.preparePurchase(f.input(firstProof)),b=f.stock.preparePurchase(f.input(secondProof));
 assert(a.ok&&b.ok);f.commit(a);assert(!b.valid());assert(!b.lock());assert.equal(f.source.cash,118);
 const stale=f.input(f.purchase());f.source.owner={ownerId:'player',ownership:1};
 assert.equal(f.stock.preparePurchase(stale).code,'stale-stock-owner');f.buy();assert.equal(f.source.cash,116);
 assert.equal(fixture(f.stock.snapshot(),f.source).stock.loadError,null);
 const old=f.input(f.orderProof('reserve'));f.buy();assert.equal(f.stock.prepareReserve(old).code,'stale-stock-revision');
}
{
 const f=fixture();f.activate();f.buy();const p1=f.stock.prepareReserve(f.input(f.orderProof('reserve',3))),p2=f.stock.prepareReserve(f.input(f.orderProof('reserve',4)));
 assert(p1.ok&&p2.ok);assert(p1.lock());assert(!p2.lock());assert(p1.release());f.commit(p2);assert(!p1.valid());
 assert.equal(f.stock.summary().inventory[RICE].reserved,1);assert.equal(f.stock.summary().inventory[RICE].available,0);
}

// Synchronous false is mandatory. Missing, throwing and async source adapters
// cannot accidentally approve material or money changes.
for(const name of ['readOwner','readBusinessBudget','verifyPurchaseSource','verifyHistoricalReceipt']) {
 for(const result of [()=>undefined,()=>({ok:true}),()=>false,()=>{throw Error('offline');},()=>Promise.resolve(true),()=>Promise.reject(Error('offline'))]) {
  const f=fixture();f.activate();f.options[name]=result;const before=f.stock.snapshot();assert(!f.stock.preparePurchase(f.input(f.purchase())).ok);
  assert.deepEqual(f.stock.snapshot(),before);assert.equal(f.source.cash,120);await Promise.resolve();
 }
 const f=fixture();f.activate();delete f.options[name];assert(!f.stock.preparePurchase(f.input(f.purchase())).ok);
}
for(const name of ['verifyActivationSource','verifyOrderSource']) {
 const f=fixture();if(name==='verifyOrderSource'){f.activate();f.buy();}
 f.options[name]=()=>Promise.resolve(true);
 assert(!(name==='verifyActivationSource'?f.stock.prepareActivation(f.input(f.activation())):f.stock.prepareReserve(f.input(f.orderProof('reserve')))).ok);
}
{
 const f=fixture();f.activate();const proof=f.purchase(),p=f.stock.preparePurchase(f.input(proof)),before=f.stock.snapshot();assert(p.lock());let nested;
 p.patch.chinaTavernStock.events.length=0;p.sourcePatch.businessDebit.amount=999;p.amount=999;
 assert(p.save(bundle=>{
  assert.equal(bundle.amount,2);assert.equal(bundle.sourcePatch.businessDebit.amount,2);assert(bundle.patch.chinaTavernStock.events.length>0);
  assert(!p.save(()=>true));assert(!p.committed());assert(!p.release());nested=f.stock.preparePurchase(f.input(proof));
  assert.deepEqual(f.stock.snapshot(),before);return f.save(bundle);
 }));assert.equal(nested.code,'stock-busy');assert(p.committed());assert(p.release());assert.equal(f.source.cash,120,'core never adopts another participant');
 f.source.cash=f.durable.cash;f.source.history=copy(f.durable.history);assert.equal(f.source.cash,118);
 const detached=f.stock.snapshot();detached.events[1].proof.quantity=99;assert.equal(f.stock.snapshot().events[1].proof.quantity,1);
}
{
 const f=fixture();f.activate();const proof=f.purchase();f.flags.owner=()=>{assert.equal(f.stock.preparePurchase(f.input(proof)).code,'stock-busy');return f.source.owner;};
 f.commit(f.stock.preparePurchase(f.input(proof)));
}

// Corrupt journals remain inspectable, fail closed and never reset to stock 0.
{
 const f=fixture();f.activate();f.buy(2);f.reserve();f.consume();f.cancel();const good=f.stock.snapshot();
 const mutations=[s=>{s.revision++;},s=>{s.extra=true;},s=>{s.activationPlan.serial++;},s=>{s.events[1].proof.unitCost=1;},
  s=>{s.events[1].proof.quantity=0;},s=>{s.events[1].proof.accepted=false;},s=>{s.events[2].allocation.portion=3;},
  s=>{s.events[2].allocation.purchaseId='missing';},s=>{s.events[2].proof.order.number=2;},s=>{s.events[2].proof.unprepared=false;},
  s=>{s.events[3].proof.completed=false;},s=>{s.events[3].proof.order.dishId=NOODLES;},s=>{s.events[4].owner.ownerId='someone';},
  s=>{s.events.push({...copy(s.events[3]),sequence:++s.revision});},s=>{s.events[1].proof.id=s.events[0].proof.id;}];
 for(const mutate of mutations) {
  const bad=copy(good);mutate(bad);const g=fixture(bad,f.source);assert(g.stock.loadError);assert.deepEqual(g.stock.snapshot(),bad);
  assert.equal(g.stock.summary(),null);assert(!g.stock.preparePurchase(g.input(g.purchase())).ok);assert.equal(g.source.cash,116);
 }
 const lost=copy(f.source);lost.history.clear();const unavailable=fixture(good,lost);assert(unavailable.stock.loadError);assert.deepEqual(unavailable.stock.snapshot(),good);
 const checkpointLost=copy(f.source);checkpointLost.checkpoints.clear();assert(fixture(good,checkpointLost).stock.loadError);
}
for(const mutate of [p=>{p.businessId='other-business';},p=>{p.sourceRevision=-1;},p=>{p.quantity=1.5;},p=>{p.quantity=Number.MAX_SAFE_INTEGER;},
 p=>{p.unitCost=3;},p=>{p.costVersion=2;},p=>{p.accepted=false;},p=>{p.dishId='new-dish';},p=>{p.extra=true;}]) {
 const f=fixture();f.activate();const proof=f.purchase();mutate(proof);assert(!f.stock.preparePurchase(f.input(proof)).ok);assert.equal(f.source.cash,120);
}
assert(!fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8').includes('china-tavern-stock'),'stock core remains dormant');
console.log('PASS dormant tavern stock: frozen activation cutoff, atomic purchase/source candidates, finite matching FIFO portions, reserve/consume/release/waste, immutable costs, replay/source/owner/revision fences, strict saves; no money/world writes');
