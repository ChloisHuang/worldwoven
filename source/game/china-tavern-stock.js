// Dormant raw-portion journal. It never changes money, orders or physical work.
// New V1 costs; the existing dish sale prices remain owned by the kitchen.
export const TAVERN_STOCK_BUSINESS_ID = 'cn-yunlai-tavern';
export const TAVERN_STOCK_COSTS = Object.freeze({version:1,unitCosts:Object.freeze({
 'yunlai-mushroom-rice':2,'yunlai-green-noodles':3,
})});
const BUSINESS = TAVERN_STOCK_BUSINESS_ID, DISHES = Object.keys(TAVERN_STOCK_COSTS.unitCosts);
const OWNERS = ['player','cn-tavern-host','cn-tavern-cook','cn-tavern-assistant'];
const copy = structuredClone;
const integer = n => Number.isSafeInteger(n) && n >= 0;
const positive = n => integer(n) && n > 0;
const text = s => typeof s === 'string' && s.length > 0 && s.length <= 200;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const exact = (x,keys) => object(x) && Object.keys(x).length === keys.length && keys.every(k=>Object.hasOwn(x,k));
const same = (a,b) => {
 if(a === b) return true;
 if(!object(a) || !object(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v,i)=>same(v,b[i]));
 const keys = Object.keys(a); return keys.length === Object.keys(b).length && keys.every(k=>Object.hasOwn(b,k) && same(a[k],b[k]));
};
const require = (ok,code='invalid-stock-state') => { if(!ok) throw Error(code); };
const ownerValid = o => exact(o,['ownerId','ownership']) && OWNERS.includes(o.ownerId) && integer(o.ownership);
const sourceKeys = ['id','sourceId','sourceRevision','businessId'];
const sourceValid = p => text(p.id) && text(p.sourceId) && integer(p.sourceRevision) && p.businessId === BUSINESS;
const activationValid = p => exact(p,[...sourceKeys,'serial']) && sourceValid(p) && integer(p.serial);
const costsValid = p => exact(p,['version','unitCosts']) && positive(p.version) && exact(p.unitCosts,DISHES) &&
 DISHES.every(id=>positive(p.unitCosts[id])) && (p.version !== 1 || same(p,TAVERN_STOCK_COSTS));
const purchaseValid = p => exact(p,[...sourceKeys,'dishId','quantity','unitCost','costVersion','accepted']) && sourceValid(p) &&
 DISHES.includes(p.dishId) && positive(p.quantity) && p.quantity <= 1000000 && positive(p.unitCost) && positive(p.costVersion) &&
 (p.costVersion !== 1 || p.unitCost === TAVERN_STOCK_COSTS.unitCosts[p.dishId]) && integer(p.quantity*p.unitCost) && p.accepted === true;
const orderValid = o => exact(o,['orderId','number','dishId','customerId','customerName']) && positive(o.number) &&
 o.orderId === 'cn-tavern-order-'+o.number && DISHES.includes(o.dishId) && text(o.customerId) && text(o.customerName);
function orderProofValid(kind,p) {
 const extra = kind === 'reserve' ? ['unprepared'] : kind === 'consume' ? ['preparationId','completed'] : ['reason'];
 return exact(p,[...sourceKeys,'order',...extra]) && sourceValid(p) && orderValid(p.order) &&
  (kind === 'reserve' ? p.unprepared === true : kind === 'consume' ? text(p.preparationId) && p.completed === true : text(p.reason));
}
const allocationValid = a => exact(a,['purchaseId','portion','unitCost','costVersion']) && text(a.purchaseId) &&
 positive(a.portion) && positive(a.unitCost) && positive(a.costVersion);
const budgetValid = b => exact(b,['businessId','ownerId','ownership','sourceId','sourceRevision','balance']) &&
 b.businessId === BUSINESS && ownerValid({ownerId:b.ownerId,ownership:b.ownership}) && text(b.sourceId) && integer(b.sourceRevision) && integer(b.balance);
const empty = () => ({version:1,businessId:BUSINESS,revision:0,activationPlan:null,events:[]});
const receiptOf = ({sequence,...receipt}) => copy(receipt);
const allocationOf = (lot,portion) => ({purchaseId:lot.proof.id,portion,unitCost:lot.proof.unitCost,costVersion:lot.proof.costVersion});
function availablePortion(lots,dishId) {
 for(const lot of lots.values()) if(lot.proof.dishId === dishId) {
  for(let portion=1;portion<=lot.proof.quantity;portion++) if(!lot.occupied.has(portion)) return allocationOf(lot,portion);
 }
 return null;
}

// Replay validates allocations, immutable prices, cancellations and every ID.
// Historical source receipts must additionally be verified by the source adapter.
function project(state) {
 require(exact(state,['version','businessId','revision','activationPlan','events']) && state.version === 1 && state.businessId === BUSINESS &&
  integer(state.revision) && Array.isArray(state.events) && state.revision === state.events.length &&
  (state.activationPlan === null || activationValid(state.activationPlan)));
 const lots = new Map(), orders = new Map(), receipts = new Map(), preparationIds = new Set();
 let activation = null, purchaseCash = 0, materialExpense = 0, wasteExpense = 0;
 for(const [i,e] of state.events.entries()) {
  require(exact(e,['sequence','kind','owner','proof','allocation']) && e.sequence === i+1 && ownerValid(e.owner));
  const p = e.proof;
  require(object(p) && text(p.id) && !receipts.has(p.id)); receipts.set(p.id,e);
  if(e.kind === 'activation') {
   require(i === 0 && activationValid(p) && same(p,state.activationPlan) && e.allocation === null); activation = p; continue;
  }
  require(!!activation);
  if(e.kind === 'purchase') {
   require(purchaseValid(p) && e.allocation === null);
   lots.set(p.id,{proof:p,occupied:new Map()}); purchaseCash += p.quantity*p.unitCost;
  } else {
   require(['reserve','consume','cancel'].includes(e.kind) && orderProofValid(e.kind,p) && p.order.number > activation.serial && allocationValid(e.allocation));
   const a = e.allocation, lot = lots.get(a.purchaseId), o = orders.get(p.order.orderId);
   require(lot && lot.proof.dishId === p.order.dishId && a.portion <= lot.proof.quantity && same(a,allocationOf(lot,a.portion)));
   if(e.kind === 'reserve') {
    require(!o && same(a,availablePortion(lots,p.order.dishId)));
    lot.occupied.set(a.portion,p.order.orderId);
    orders.set(p.order.orderId,{order:copy(p.order),allocation:copy(a),status:'reserved',reserve:receiptOf(e),consume:null,cancel:null});
   } else {
    require(o && same(o.order,p.order) && same(o.allocation,a));
    if(e.kind === 'consume') {
     require(o.status === 'reserved' && !preparationIds.has(p.preparationId)); preparationIds.add(p.preparationId);
     o.status = 'consumed'; o.consume = receiptOf(e); materialExpense += a.unitCost;
    } else {
     require(o.status === 'reserved' || o.status === 'consumed');
     if(o.status === 'reserved') { lot.occupied.delete(a.portion); o.status = 'cancelled'; }
     else { wasteExpense += a.unitCost; o.status = 'wasted'; }
     o.cancel = receiptOf(e);
    }
   }
  }
  require([purchaseCash,materialExpense,wasteExpense].every(integer));
 }
 const inventory = Object.fromEntries(DISHES.map(id=>[id,{purchased:0,available:0,reserved:0,consumed:0,wasted:0,value:0}]));
 for(const lot of lots.values()) { const d=inventory[lot.proof.dishId]; d.purchased+=lot.proof.quantity; d.available+=lot.proof.quantity-lot.occupied.size; }
 for(const o of orders.values()) {
  const d=inventory[o.order.dishId];
  if(o.status === 'reserved') d.reserved++;
  if(o.consume) d.consumed++;
  if(o.status === 'wasted') d.wasted++;
 }
 for(const lot of lots.values()) {
  let consumed = 0;
  for(const id of lot.occupied.values()) if(orders.get(id).consume) consumed++;
  inventory[lot.proof.dishId].value += (lot.proof.quantity-consumed)*lot.proof.unitCost;
 }
 require(Object.values(inventory).every(d=>Object.values(d).every(integer)));
 return {activation,lots,orders,receipts,summary:{active:!!activation,cutoff:state.activationPlan?.serial ?? null,
  purchaseCash,materialExpense,wasteExpense,inventoryValue:purchaseCash-materialExpense,inventory}};
}

/**
 * All adapters are synchronous, read-only and strict: only true verifies a fact.
 * readOwner() -> {ownerId,ownership}; input.expectedOwner must match this epoch.
 * readBusinessBudget() -> {businessId,ownerId,ownership,sourceId,sourceRevision,balance}.
 * verifyActivationSource(proof) verifies the ORIGINAL world serial checkpoint;
 * retain that checkpoint after world advancement, including a refused activation.
 * verifyPurchaseSource(proof) verifies an actual accepted purchase candidate,
 * including quantity, frozen price and source revision; it is not an invoice factory.
 * verifyOrderSource(kind,proof) verifies the exact live named order/physical work:
 * reserve before prep; consume ONLY at real prep completion; cancel at real cancellation.
 * verifyHistoricalReceipt(receipt) checks immutable source-side receipts including
 * owner, proof and allocation, even after the live order is removed/changes owners.
 *
 * Every input has expectedRevision, expectedOwner and proof. prepareActivation
 * also accepts no proof when retrying its already pinned plan. The first valid
 * plan is visible in snapshot() BEFORE activation saves; keep it in ordinary saves.
 * It creates no stock or debit and cannot be replaced by a later serial on retry.
 * A malformed/source-unverifiable save is preserved and blocks all operations.
 *
 * Coordinator: lock source, owner and business guards; candidate.lock(); valid();
 * candidate.save(jointSave); committed(); release(). jointSave receives detached
 * {patch:{chinaTavernStock},sourcePatch:{kind,receipt,businessDebit,orderTransition},amount,cost,allocation}.
 * Persist stock plus that exact source receipt and matching money/world change
 * ATOMICALLY before returning true; only then may any participant adopt.
 * amount is the required business debit (purchase only); cost is the frozen raw
 * portion cost (or total purchase cost). No callback here performs an external effect.
 * Legacy/replayed replies have no participant and amount:0/sourcePatch:null.
 * For legacy orders the coordinator keeps its existing fulfillment contract.
 * Failed reservation/prepay must leave all participants unchanged; caller refunds
 * or defers through its real customer funds participant, never this journal.
 *
 * purchaseCash is a cash-flow projection. materialExpense includes prepared waste;
 * wasteExpense is a subset, not another expense. Profit deducts materialExpense
 * only; inventoryValue retains all unconsumed portions, including reservations.
 */
export function createChinaTavernStock(options={}) {
 let current = empty(), projection = project(current), invalidSnapshot = null, loadError = null, lastError = null, busy = null;
 const read = (name,...args) => {
  require(typeof options[name] === 'function','missing-'+name);
  const result=options[name](...args.map(x=>copy(x)));
  if(result && typeof result.then === 'function') { Promise.resolve(result).catch(()=>{}); throw Error('async-source-unsupported'); }
  return result;
 };
 const verify = (name,...args) => require(read(name,...args) === true,'unverified-'+name);
 const verifyHistory = () => {
  if(current.activationPlan) verify('verifyActivationSource',current.activationPlan);
  for(const e of current.events) verify('verifyHistoricalReceipt',receiptOf(e));
 };
 try {
  if(options.saved != null) { invalidSnapshot=copy(options.saved); current=copy(options.saved); }
  projection=project(current); verifyHistory(); invalidSnapshot=null;
 } catch(e) { loadError=e?.message || 'invalid-stock-state'; }
 const fail = code => { lastError=code; return {ok:false,code}; };
 const run = fn => {
  if(loadError || busy) return fail(loadError || 'stock-busy');
  busy=true;
  try { const result=fn(); lastError=null; return result; }
  catch(e) { return fail(e?.message || 'stock-source-failed'); }
  finally { busy=null; }
 };
 const readOwner = () => { const o=read('readOwner'); require(ownerValid(o),'invalid-stock-owner'); return copy(o); };
 function ready(input,active=true) {
  require(input?.expectedRevision === current.revision,'stale-stock-revision');
  const o=readOwner(); require(ownerValid(input.expectedOwner) && same(input.expectedOwner,o),'stale-stock-owner');
  verifyHistory(); if(active) require(projection.activation,'stock-inactive'); return o;
 }
 function nextEvent(kind,owner,proof,allocation=null) {
  require(integer(current.revision+1),'stock-limit');
  const e={sequence:current.revision+1,kind,owner:copy(owner),proof:copy(proof),allocation:copy(allocation)};
  const next={...current,revision:e.sequence,events:[...current.events,e]}; project(next); return next;
 }
 const replay = (e,proof) => {
  require(same(e.proof,proof),'stock-receipt-conflict');
  return {ok:true,replayed:true,amount:0,cost:e.kind === 'purchase' ? e.proof.quantity*e.proof.unitCost : e.allocation?.unitCost || 0,
   allocation:copy(e.allocation),sourcePatch:null};
 };
 function participant(next,owner,live,amount=0,cost=0,budget=null) {
  const base=current, token={}, event=next.events.at(-1), proof=event.proof, before=projection.orders.get(proof.order?.orderId), after=project(next).orders.get(proof.order?.orderId);
  const stockState = o => o ? {status:o.status,allocation:copy(o.allocation)} : null;
  const bundle={patch:{chinaTavernStock:copy(next)},sourcePatch:{kind:event.kind,receipt:receiptOf(event),
   businessDebit:budget ? {id:'tavern-stock-purchase:'+proof.id,businessId:BUSINESS,currency:'copper',amount,owner:copy(owner),
    sourceId:budget.sourceId,sourceRevision:budget.sourceRevision,balanceBefore:budget.balance,balanceAfter:budget.balance-amount} : null,
   orderTransition:proof.order ? {order:copy(proof.order),sourceId:proof.sourceId,sourceRevision:proof.sourceRevision,
    before:stockState(before),after:stockState(after)} : null},amount,cost,allocation:copy(event.allocation)};
  let locked=false,durable=false,accepted=false,released=false,inSave=false,checking=false;
  function valid() {
   if(checking || released || loadError || current !== base || busy && busy !== token) return false;
   const previous=busy; busy=token; checking=true;
   try { require(same(readOwner(),owner),'stale-stock-owner'); verifyHistory(); live(); return !released && current === base; }
   catch(e) { lastError=e?.message || 'stock-source-failed'; return false; }
   finally { busy=previous; checking=false; }
  }
  return {ok:true,...copy(bundle),valid,
   lock() { if(locked || accepted || released || !valid()) return false; busy=token; locked=true; return true; },
   save(saveAtomic) {
    if(!locked || inSave || durable || accepted || !valid() || typeof saveAtomic !== 'function') return false;
    inSave=true;
    try {
     const result=saveAtomic(copy(bundle));
     if(result && typeof result.then === 'function') { Promise.resolve(result).catch(()=>{}); throw Error('async-save-unsupported'); }
     require(result === true,'save-failed'); durable=true; return true;
    } catch(e) { lastError=e?.message || 'save-failed'; return false; }
    finally { inSave=false; }
   },
   committed() {
    if(accepted) return true;
    if(!locked || !durable || inSave || current !== base || busy !== token) return false;
    current=next; projection=project(next); accepted=true; lastError=null; return true;
   },
   release() { if(checking || inSave || durable && !accepted) return false; if(locked && busy === token) busy=null; locked=false; released=true; return true; },
  };
 }
 function prepareActivation(input) { return run(()=>{
  const owner=ready(input,false), proof=copy(input.proof ?? current.activationPlan);
  require(activationValid(proof),'invalid-activation-source');
  if(current.activationPlan) require(same(proof,current.activationPlan),'activation-plan-conflict');
  verify('verifyActivationSource',proof);
  if(projection.activation) return replay(current.events[0],proof);
  // Pin once, even if the subsequent joint write fails. No economic effect.
  if(!current.activationPlan) { current={...current,activationPlan:copy(proof)}; projection=project(current); }
  return participant(nextEvent('activation',owner,proof),owner,()=>verify('verifyActivationSource',proof));
 }); }
 function preparePurchase(input) { return run(()=>{
  const owner=ready(input), proof=copy(input.proof);
  require(purchaseValid(proof),'invalid-purchase-source');
  const old=projection.receipts.get(proof.id);
  if(old) { require(old.kind === 'purchase','stock-receipt-conflict'); return replay(old,proof); }
  const costs=copy(options.costs ?? TAVERN_STOCK_COSTS);
  require(costsValid(costs) && proof.costVersion === costs.version && proof.unitCost === costs.unitCosts[proof.dishId],'stale-stock-price');
  verify('verifyPurchaseSource',proof);
  const budget=copy(read('readBusinessBudget')),amount=proof.quantity*proof.unitCost;
  require(budgetValid(budget) && budget.ownerId === owner.ownerId && budget.ownership === owner.ownership,'invalid-stock-budget');
  require(budget.balance >= amount,'insufficient-business-funds');
  return participant(nextEvent('purchase',owner,proof),owner,()=>{
   verify('verifyPurchaseSource',proof); require(same(read('readBusinessBudget'),budget),'stale-stock-budget');
   require(same(options.costs ?? TAVERN_STOCK_COSTS,costs),'stale-stock-price');
  },amount,amount,budget);
 }); }
 function prepareOrder(kind,input) { return run(()=>{
  const owner=ready(input), proof=copy(input.proof);
  require(orderProofValid(kind,proof),'invalid-order-source');
  if(proof.order.number <= projection.activation.serial) {
   verify('verifyOrderSource',kind,proof); return {ok:true,legacy:true,amount:0,cost:0,allocation:null,sourcePatch:null};
  }
  const o=projection.orders.get(proof.order.orderId), old=projection.receipts.get(proof.id);
  if(old) { require(old.kind === kind,'stock-receipt-conflict'); return replay(old,proof); }
  if(o) {
   require(same(o.order,proof.order),'stock-order-conflict');
   require(!o[kind],'stock-receipt-conflict');
  }
  verify('verifyOrderSource',kind,proof);
  let allocation;
  if(kind === 'reserve') {
   require(!o,'stock-order-conflict'); allocation=availablePortion(projection.lots,proof.order.dishId);
   require(allocation,'insufficient-stock');
  } else {
   require(o,'stock-reservation-required');
   require(kind === 'consume' ? o.status === 'reserved' : ['reserved','consumed'].includes(o.status),'stock-order-closed');
   allocation=o.allocation;
  }
  return participant(nextEvent(kind,owner,proof,allocation),owner,()=>verify('verifyOrderSource',kind,proof),0,allocation.unitCost);
 }); }
 return {prepareActivation,preparePurchase,prepareReserve:input=>prepareOrder('reserve',input),prepareConsume:input=>prepareOrder('consume',input),
  prepareCancel:input=>prepareOrder('cancel',input),snapshot:()=>copy(invalidSnapshot ?? current),
  summary:()=>loadError ? null : copy(projection.summary),order:id=>loadError ? null : copy(projection.orders.get(id) ?? null),
  get loadError(){return loadError;},get lastError(){return lastError;}};
}
