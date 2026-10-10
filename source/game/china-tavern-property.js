// Fictional ownership of one existing business. The service world remains the
// source of gross receipts; this journal owns capital, expenses and transfers.
import {receptionWageReceipt,receptionWageFromEvent,validReceptionWageRecord} from './china-salon-reception-account.js';
import {validTavernOperatingReceipt} from './china-tavern-business.js';
export const TAVERN_BUSINESS_ID = 'cn-yunlai-tavern';
const NPCS = Object.freeze({
  'cn-tavern-host': {name:'许安',funds:600},
  'cn-tavern-cook': {name:'沈禾',funds:240},
  'cn-tavern-assistant': {name:'陆青',funds:260},
});
export const TAVERN_PROPERTY_NPC_IDS=Object.freeze(Object.keys(NPCS));
const personalMealKind=kind=>kind==='npc-meal-payment'||kind==='npc-meal-refund';
const mealOrder=id=>typeof id==='string'&&/^cn-tavern-order-[1-9][0-9]*$/.test(id);
const PERSONAL_MEAL_PROVIDER='tavern-personal-funds';
const mealIdentity=()=>({version:1,namespace:'chinaTavernProperty',currency:'copper',roleIds:['cn-tavern-finite-personal-purse']});
const sameMealIdentity=d=>!!d&&Object.keys(d).length===4&&d.version===1&&d.namespace==='chinaTavernProperty'&&d.currency==='copper'&&Array.isArray(d.roleIds)&&d.roleIds.length===1&&d.roleIds[0]==='cn-tavern-finite-personal-purse';
const mealTransfer=e=>e?{kind:e.kind.slice(4),actorId:e.actorId,orderId:e.orderId,amount:e.amount,sourceSplit:{cash:e.amount,bank:0}}:null;
const OWNER = 'cn-tavern-host', CAPITAL = 120;
const copy = x => JSON.parse(JSON.stringify(x));
const integer = x => Number.isSafeInteger(x) && x >= 0;
const priceValid = x => integer(x) && x > 0 && x <= 1000000;
const person = id => id === 'player' || Object.hasOwn(NPCS,id);
const name = id => id === 'player' ? '你' : NPCS[id]?.name || '未知';
const wages = tx => tx.action === 'wage' && tx.currency === 'copper' && ['cn-tavern-steward','cn-tavern-chef','cn-tavern-host','cn-tavern-helper','cn-salon-reception'].includes(tx.roleId);
const hash = value => [...String(value)].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,17);
const empty = () => ({version:1,revision:0,events:[],market:null});

// Rebuild finite NPC funds and operating debits. Gross income never becomes a
// personal wallet credit, and a sale transfers the remaining business account.
function accounts(state,till) {
  if (!integer(till)) throw Error('invalid-tavern-income');
  const funds=Object.fromEntries(Object.entries(NPCS).map(([id,n])=>[id,n.funds]));
  funds[OWNER]-=CAPITAL;
  let ownerId=OWNER,invested=CAPITAL,paidWages=0,operatingCosts=0,drawn=0,ownership=0;
  const ids=new Set(),meals=new Map();let previousTill=0;
  for(const e of state.events) {
    if(!e || !integer(e.day) || !integer(e.till) || e.till<previousTill || e.till>till || !priceValid(e.amount) || typeof e.id!=='string' || ids.has(e.id)) throw Error('invalid-property-event');
    ids.add(e.id);previousTill=e.till;
    if(e.kind==='transfer') {
      if(e.from!==ownerId || !person(e.to) || e.to===ownerId || (e.from!=='player'&&e.to!=='player')) throw Error('invalid-property-owner');
      if(e.from!=='player')funds[e.from]+=e.amount;
      if(e.to!=='player')funds[e.to]-=e.amount;
      ownerId=e.to;ownership++;
    } else if(personalMealKind(e.kind)) {
      if(!Object.hasOwn(NPCS,e.actorId)||!mealOrder(e.orderId)||e.id!==`yunlai-${e.kind}:${e.actorId}:${e.orderId}`)throw Error('invalid-npc-meal');
      const old=meals.get(e.orderId);
      if(e.kind==='npc-meal-payment'){if(old)throw Error('duplicate-npc-meal');funds[e.actorId]-=e.amount;meals.set(e.orderId,{actorId:e.actorId,amount:e.amount,refunded:false});}
      else{if(!old||old.refunded||old.actorId!==e.actorId||old.amount!==e.amount)throw Error('invalid-npc-meal-refund');funds[e.actorId]+=e.amount;old.refunded=true;}
    } else if(e.kind==='reception-wage') {
      if(!validReceptionWageRecord(receptionWageFromEvent(e))||e.funding!==0||e.funder!==ownerId)throw Error('invalid-reception-expense');
      paidWages+=e.amount;
    } else if(e.kind==='operating-expense') {
      if(!validTavernOperatingReceipt(e.receipt)||e.receipt.amount!==e.amount||e.receipt.id!==e.id||e.funding!==0||e.funder!==ownerId)throw Error('invalid-operating-expense');
      if(e.receipt.kind==='stock-purchase')operatingCosts+=e.amount;else paidWages+=e.amount;
    } else if(e.kind==='wage') {
      if(!integer(e.funding)||e.funding!==Math.max(0,e.amount-(invested+e.till-paidWages-operatingCosts-drawn))||e.funder!==ownerId)throw Error('invalid-property-wage');
      if(e.funding) {if(e.funder==='player')throw Error('invalid-property-funding');funds[e.funder]-=e.funding;invested+=e.funding;}
      paidWages+=e.amount;
    } else if(e.kind==='invest') {if(ownerId!=='player')throw Error('invalid-property-investment');invested+=e.amount;}
    else if(e.kind==='draw') {if(ownerId!=='player')throw Error('invalid-property-draw');drawn+=e.amount;}
    else throw Error('invalid-property-event');
    if(!integer(invested+e.till-paidWages-operatingCosts-drawn)||Object.values(funds).some(n=>!integer(n)))throw Error('invalid-npc-funds');
  }
  const balance=invested+till-paidWages-operatingCosts-drawn;
  if(!integer(balance)||![invested,paidWages,operatingCosts,drawn].every(integer))throw Error('invalid-business-balance');
  return {ownerId,ownerName:name(ownerId),ownership,npcFunds:funds,invested,revenue:till,paidWages,operatingCosts,drawn,balance};
}
function validate(state,till,ledger) {
  if(!state||state.version!==1||!integer(state.revision)||!Array.isArray(state.events))throw Error('invalid-property-state');
  const a=accounts(state,till),m=state.market;
  if(m && (!integer(m.day)||m.ownerId!==a.ownerId||m.ownership!==a.ownership||!integer(m.revision)||
    (m.price!==null&&!priceValid(m.price))||!Array.isArray(m.declined)||m.declined.length>3||new Set(m.declined).size!==m.declined.length||m.declined.some(id=>!Object.hasOwn(NPCS,id))||!Array.isArray(m.offers)||m.offers.length>3))throw Error('invalid-property-market');
  if(m) {
    const seen=new Set();
    for(const o of m.offers) {
      if(!Object.hasOwn(NPCS,o.buyerId)||seen.has(o.buyerId)||!priceValid(o.amount)||!['open','rejected'].includes(o.status)||(o.status==='rejected')!==m.declined.includes(o.buyerId)||o.id!==`yunlai-bid:${m.ownership}:${m.day}:${o.buyerId}`)throw Error('invalid-property-offer');
      seen.add(o.buyerId);
    }
    const app=m.application;
    if(app && (m.ownerId==='player'||!priceValid(app.amount)||!['accepted','rejected'].includes(app.status)||app.id!==`yunlai-application:${m.ownership}:${m.day}`))throw Error('invalid-property-application');
  }
  if(ledger) {
    const receipts=new Map(ledger.history().map(t=>[t.requestId,t]));
    for(const e of state.events) {
      if(personalMealKind(e.kind)||e.kind==='reception-wage'||e.kind==='operating-expense')continue; // Separate NPC journals, never a player bank transaction.
      const tx=receipts.get(e.id),op=e.kind==='transfer'?(e.to==='player'?'purchase':'sale'):e.kind;
      if(!tx||tx.amount!==e.amount||(e.kind==='wage'?!wages(tx):tx.action!=='business'||tx.operation!==op||tx.businessId!==TAVERN_BUSINESS_ID))throw Error('property-receipt-mismatch');
    }
    const own=new Set(state.events.map(e=>e.id));
    if([...receipts.values()].some(tx=>tx.action==='business'&&tx.businessId===TAVERN_BUSINESS_ID&&!own.has(tx.requestId)))throw Error('property-receipt-missing');
  }
  return a;
}

export function createChinaTavernProperty({saved,copperLedger,getClock,getTill=()=>0,getSalonIncome=()=>null,getReceptionAccount=()=>null,getBusinessAccount=()=>null,getStock=()=>null,saveState,worldSeed=1}={}) {
  let current=empty(),loadError=null,lastError=null,pending=null,saving=false,npcProjection=null;
  try {if(saved!=null)current=copy(saved);validate(current,getTill(),copperLedger);if(copperLedger.loadError)throw Error(copperLedger.loadError);}
  catch(error){loadError=error.message;}
  const fail=code=>{lastError=code;return {ok:false,code};};
  const day=()=>{const d=getClock?.()?.day;return integer(d)?d:null;};
  const a=()=>accounts(current,getTill());
  // Construction order may put property before the dormant NPC account. Do
  // not infer an empty counterpart until it exists; verify before mutation.
  function verifyReceptionAccount() {
    if(loadError)return fail(loadError);
    const account=getReceptionAccount(),snapshot=typeof account?.snapshot==='function'?account.snapshot():account;
    const events=current.events.filter(e=>e.kind==='reception-wage');
    if(!events.length&&!snapshot?.receipts?.length)return {ok:true};
    if(account?.loadError)return fail('reception-account-unavailable');
    if(!snapshot||!Array.isArray(snapshot.receipts))return fail('reception-account-unavailable');
    const receipts=new Map(snapshot.receipts.map(({sequence,...receipt})=>[receipt.id,receipt]));
    if(receipts.size!==events.length||snapshot.receipts.length!==events.length||events.some(e=>{
      const receipt=receipts.get(e.id),event=receptionWageFromEvent(e);
      return !receipt||Object.keys(receipt).length!==Object.keys(event).length||Object.keys(event).some(key=>JSON.stringify(event[key])!==JSON.stringify(receipt[key]));
    }))return fail('reception-property-mismatch');
    return {ok:true};
  }
  function verifyBusinessAccount() {
    if(loadError)return fail(loadError);
    const account=getBusinessAccount(),events=current.events.filter(e=>e.kind==='operating-expense');
    if(!account)return events.length?fail('tavern-business-unavailable'):{ok:true};
    if(account.loadError)return fail('tavern-business-unavailable');
    const snapshot=account.snapshot?.();
    if(!snapshot||!Array.isArray(snapshot.receipts))return fail('tavern-business-unavailable');
    const receipts=snapshot.receipts.filter(r=>r.amount>0);
    if(receipts.length!==events.length||events.some(e=>!account.verifyExpenseReceipt?.(e.receipt)))return fail('tavern-business-property-mismatch');
    return {ok:true};
  }
  function protection() {
    const account=getBusinessAccount();
    if(!account)return {sourceRevision:0,protectedFunds:0,trialReserved:0,wagesPayable:0,earnedWages:0,trialEarned:0};
    if(account.loadError)throw Error('tavern-business-unavailable');
    const value=account.accounting?.();
    if(!value||![value.sourceRevision,value.protectedFunds,value.trialReserved,value.wagesPayable,value.earnedWages,value.trialEarned].every(integer)||value.protectedFunds!==value.trialReserved+value.wagesPayable)throw Error('invalid-tavern-obligations');
    return value;
  }
  function businessBudget() {
    try{const owner=a(),p=protection();if(!integer(current.revision+p.sourceRevision))return null;return {businessId:TAVERN_BUSINESS_ID,ownerId:owner.ownerId,ownership:owner.ownership,sourceId:'chinaTavernProperty',sourceRevision:current.revision+p.sourceRevision,balance:Math.max(0,owner.balance-p.protectedFunds)};}catch{return null;}
  }
  function persist(next) {
    if(loadError||saving||pending||getBusinessAccount()?.busy)return fail(loadError||'property-busy');
    const verified=verifyReceptionAccount();if(!verified.ok)return verified;
    const operating=verifyBusinessAccount();if(!operating.ok)return operating;
    saving=true;
    try {validate(next,getTill());const result=saveState(copy(next));if(result===false)return fail('save-failed');if(result?.then){Promise.resolve(result).catch(()=>{});return fail('async-save-unsupported');}current=next;lastError=null;return {ok:true};}
    catch{return fail('save-failed');}finally{saving=false;}
  }
  function marketFor(owner,previous=null) {
    const d=day(),n=hash(`${worldSeed}:${owner.ownerId}:${d}`),player=owner.ownerId==='player';
    const price=player?(previous?.price??null):330+(n%10)*10;
    const offers=player&&price!==null?Object.keys(NPCS).flatMap(id=>{
      const budget=owner.npcFunds[id],ceiling=220+hash(`${worldSeed}:${id}:${d}`)%141,amount=Math.min(price,budget,ceiling);
      if(amount<1)return [];
      return [{id:`yunlai-bid:${owner.ownership}:${d}:${id}`,buyerId:id,amount,status:'open'}];
    }):[];
    return {day:d,ownerId:owner.ownerId,ownership:owner.ownership,revision:0,price,minimum:player?null:Math.ceil(price*(.85+(n%3)*.05)),willing:player?null:n%5!==0,application:null,declined:[],offers};
  }
  function refreshDay() {
    if(loadError)return fail(loadError);const d=day();if(d===null)return fail('invalid-clock');
    if(current.market?.day>d)return fail('clock-reversed');
    if(current.market?.day===d)return {ok:true};
    return persist({...copy(current),revision:current.revision+1,market:marketFor(a(),current.market)});
  }
  function ready(revision) {
    const result=refreshDay();if(!result.ok)return result;
    const operating=verifyBusinessAccount();if(!operating.ok)return operating;
    if(revision!==undefined&&revision!==current.revision)return fail('stale-property-intent');
    if(saving||pending||getBusinessAccount()?.busy)return fail('property-busy');return {ok:true};
  }
  function applyPurchase(amount,revision) {
    const result=ready(revision);if(!result.ok)return result;
    const m=current.market;if(m.ownerId==='player')return fail('already-owner');
    if(m.application)return fail('already-applied-today');
    if(!priceValid(amount)||amount>m.price)return fail('invalid-offer');
    const accepted=m.willing&&amount>=m.minimum;
    const application={id:`yunlai-application:${m.ownership}:${m.day}`,amount,status:accepted?'accepted':'rejected',reason:amount<m.minimum?'price-too-low':m.willing?'seller-consented':'seller-keeps-business'};
    const saved=persist({...copy(current),revision:current.revision+1,market:{...copy(m),application}});
    return saved.ok?{ok:true,application:copy(application)}:saved;
  }
  function money(next,operation,amount,receiptId) {
    pending={next,operation,amount,receiptId};
    try {const result=copperLedger.transferBusiness({operation,amount,receiptId,businessId:TAVERN_BUSINESS_ID});if(!result.ok)return fail(result.code);lastError=null;return result;}
    finally{pending=null;}
  }
  function transfer(to,amount,id) {
    const before=a();if(before.balance<protection().protectedFunds)return fail('business-obligations-unfunded');const event={id,kind:'transfer',from:before.ownerId,to,amount,day:day(),till:getTill()};
    const next={...copy(current),revision:current.revision+1,events:[...current.events,event],market:null};
    next.market=marketFor(accounts(next,getTill()));
    return money(next,to==='player'?'purchase':'sale',amount,id);
  }
  function confirmPurchase(revision) {
    const result=ready(revision);if(!result.ok)return result;
    const app=current.market.application;if(current.market.ownerId==='player'||app?.status!=='accepted')return fail('seller-consent-required');
    return transfer('player',app.amount,app.id);
  }
  function setPrice(price,revision) {
    const result=ready(revision);if(!result.ok)return result;
    if(a().ownerId!=='player')return fail('not-owner');
    if(price!==null&&!priceValid(price))return fail('invalid-price');
    const previous=current.market;
    if(price===previous.price)return fail('unchanged');
    const nextMarket=marketFor(a(),{price});nextMarket.revision=previous.revision+1;nextMarket.declined=previous.declined.slice();
    // Repricing does not reroll today's people or undo a seller rejection.
    nextMarket.offers=nextMarket.offers.map(o=>({...o,status:previous.declined.includes(o.buyerId)?'rejected':'open'}));
    return persist({...copy(current),revision:current.revision+1,market:nextMarket});
  }
  function replyOffer(id,accept,revision) {
    const result=ready(revision);if(!result.ok)return result;
    const owner=a(),offer=current.market.offers.find(o=>o.id===id);
    if(owner.ownerId!=='player')return fail('not-owner');
    if(!offer||offer.status!=='open'||current.market.price===null)return fail('offer-unavailable');
    if(!accept)return persist({...copy(current),revision:current.revision+1,market:{...copy(current.market),declined:[...current.market.declined,offer.buyerId],offers:current.market.offers.map(o=>o.id===id?{...o,status:'rejected'}:o)}});
    if(offer.amount>owner.npcFunds[offer.buyerId])return fail('insufficient-npc-funds');
    return transfer(offer.buyerId,offer.amount,id);
  }
  function capital(kind,amount,revision) {
    const result=ready(revision);if(!result.ok)return result;
    const owner=a();if(owner.ownerId!=='player')return fail('not-owner');if(!priceValid(amount))return fail('invalid-amount');
    if(kind==='draw'&&amount>Math.max(0,owner.balance-protection().protectedFunds))return fail(protection().protectedFunds?'insufficient-unreserved-business-funds':'insufficient-business-funds');
    const id=`yunlai-${kind}:${current.revision}`,event={id,kind,amount,day:day(),till:getTill()};
    return money({...copy(current),revision:current.revision+1,events:[...current.events,event]},kind,amount,id);
  }
  // Called by the shared game ledger before its atomic storage write. A paid
  // wage replay bypasses this hook, so it cannot debit the business twice.
  function prepareCurrencyCommit(tx) {
    if(tx.action!=='business'&&!wages(tx))return null;
    if(loadError||saving||getBusinessAccount()?.busy)return fail(loadError||'property-busy');
    const base=current,baseTill=getTill(),basePending=pending;
    const verified=verifyReceptionAccount();if(!verified.ok)return verified;
    const operating=verifyBusinessAccount();if(!operating.ok)return operating;
    let next;
    if(tx.action==='business') {
      if(!pending||pending.receiptId!==tx.requestId||pending.operation!==tx.operation||pending.amount!==tx.amount)return fail('property-consent-required');
      next=pending.next;
    } else {
      const owner=a(),protectedFunds=protection().protectedFunds;
      if(protectedFunds&&tx.amount>Math.max(0,owner.balance-protectedFunds))return fail('insufficient-unreserved-business-funds');
      const shortfall=Math.max(0,tx.amount-owner.balance);
      if(shortfall&&(owner.ownerId==='player'||owner.npcFunds[owner.ownerId]<shortfall))return fail('insufficient-business-funds');
      next={...copy(current),revision:current.revision+1,events:[...current.events,{id:tx.requestId,kind:'wage',amount:tx.amount,day:tx.day,till:getTill(),funding:shortfall,funder:owner.ownerId}]};
    }
    try{validate(next,getTill());}catch{return fail('invalid-property-state');}
    let accepted=false,locked=false;
    const valid=()=>!loadError&&!saving&&(accepted||current===base&&getTill()===baseTill&&pending===basePending);
    return {ok:true,patch:{chinaTavernProperty:copy(next)},valid,
      lock(){if(accepted||!valid())return false;saving=true;locked=true;return true;},
      release(){if(locked){locked=false;saving=false;}},
      committed(){if(accepted)return true;if(loadError||!locked||current!==base||getTill()!==baseTill||pending!==basePending)return false;current=next;accepted=true;lastError=null;return true;}};
  }
  // Only original, already-funded personal balances. This does not create a
  // bank account, salary, reserve injection or right to spend business capital.
  function npcAccount(actorId){
    if(loadError||!Object.hasOwn(NPCS,actorId))return null;
    if(npcProjection?.source!==current)npcProjection={source:current,funds:a().npcFunds};
    return {total:npcProjection.funds[actorId],currency:'copper'};
  }
  function prepareNpcMeal(input,kind){
    if(loadError||saving||pending||getBusinessAccount()?.busy)return fail(loadError||'property-busy');
    const verified=verifyReceptionAccount();if(!verified.ok)return verified;
    const operating=verifyBusinessAccount();if(!operating.ok)return operating;
    const {actorId,orderId,amount}=input||{};
    if(!Object.hasOwn(NPCS,actorId)||!mealOrder(orderId)||!priceValid(amount)||day()===null)return fail('invalid-npc-meal');
    const base=current,id=`yunlai-${kind}:${actorId}:${orderId}`,existing=current.events.find(e=>e.id===id);
    if(kind==='npc-meal-payment'&&current.events.some(e=>e.kind==='npc-meal-refund'&&e.orderId===orderId))return fail('npc-meal-already-refunded');
    if(existing&&(existing.actorId!==actorId||existing.amount!==amount))return fail('npc-meal-conflict');
    const event={id,kind,actorId,orderId,amount,day:day(),till:getTill()},next=existing?current:{...copy(current),revision:current.revision+1,events:[...current.events,event]};
    let balance;try{balance=validate(next,getTill()).npcFunds[actorId];}catch{return fail(kind==='npc-meal-payment'?'insufficient-or-invalid-npc-funds':'invalid-npc-meal-refund');}
    const validWorld=(worldPatch,total)=>{
      if(!worldPatch||typeof worldPatch!=='object'||Array.isArray(worldPatch)||Object.hasOwn(worldPatch,'chinaTavernProperty'))return false;
      const order=worldPatch.chinaServiceWorld?.orders?.find(o=>o.id===orderId);
      return !!order&&order.customerId===actorId&&order.price===total&&(kind==='npc-meal-payment'?order.payment==='reserved'&&order.collected===true:order.payment==='refunded'&&order.cancelled===true);
    };
    let accepted=false,locked=false,worldValidated=false;
    const valid=()=>!loadError&&!saving&&!pending&&current===base&&(!!existing||event.till===getTill())&&verifyReceptionAccount().ok;
    const candidate={ok:true,replayed:!!existing,receiptId:id,balanceAfter:balance,patch:{chinaTavernProperty:copy(next)},transfer:mealTransfer(existing||event),valid,
      lock(){if(accepted||!worldValidated||!valid())return false;saving=true;locked=true;return true;},
      release(){if(locked){locked=false;saving=false;}},
      validateMealWorld(worldPatch,record){
        worldValidated=false;
        if(!record||record.version!==1||record.kind!==kind.slice(4)||record.actorId!==actorId||record.orderId!==orderId||!priceValid(record.amount)||!Array.isArray(record.portions)||!validWorld(worldPatch,record.amount))return false;
        const parts=record.portions.filter(p=>p.providerId===PERSONAL_MEAL_PROVIDER);
        if(parts.length!==1||record.portions.reduce((sum,p)=>sum+p.amount,0)!==record.amount)return false;
        const part=parts[0];return worldValidated=part.amount===amount&&part.sourceSplit?.cash===amount&&part.sourceSplit?.bank===0&&sameMealIdentity(part.identity);
      },
      committed(){
        if(accepted)return {ok:true,replayed:true,receiptId:id};
        if(loadError||!locked||!worldValidated||pending||current!==base||!existing&&event.till!==getTill())return fail('stale-npc-meal');
        current=next;accepted=true;lastError=null;return {ok:true,replayed:!!existing,receiptId:id};
      },
      commit(worldPatch={}){
        if(accepted)return {ok:true,replayed:true,receiptId:id};
        if(loadError||saving||pending||current!==base)return fail(loadError||'stale-npc-meal');
        // Native single-purse calls still require the entire original price.
        if(!validWorld(worldPatch,amount))return fail('invalid-npc-meal-world');
        worldValidated=true;
        if(!existing&&event.till!==getTill())return fail('stale-npc-meal-income');
        if(!candidate.lock())return fail('stale-npc-meal');
        try{const stored=saveState(copy(next),copy(worldPatch));if(stored?.then){Promise.resolve(stored).catch(()=>{});return fail('save-failed');}if(stored===false||stored?.ok===false)return fail('save-failed');return candidate.committed();}catch{return fail('save-failed');}finally{candidate.release();}
      }};
    return candidate;
  }
  // Dormant meal-only view of the original finite purse. cash is an allocation
  // projection of total, not a new wallet/bank account or an income receipt.
  function mealFundsProvider(){
    const ownsPersonalMealAccount=id=>!loadError&&Object.hasOwn(NPCS,id)&&verifyReceptionAccount().ok;
    return {get loadError(){const verified=verifyReceptionAccount();return loadError||(!verified.ok?verified.code:null);},
      ownsPersonalMealAccount,
      account:id=>ownsPersonalMealAccount(id)?{cash:npcAccount(id).total,bank:0}:null,
      snapshot:()=>copy(current),mealAccountIdentity:mealIdentity,
      mealTransfer:(orderId,kind)=>mealTransfer(current.events.find(e=>e.orderId===orderId&&e.kind==='npc-'+kind)),
      mealTransferOrderIds:()=>current.events.filter(e=>personalMealKind(e.kind)).map(e=>e.orderId),
      prepareMealPayment:input=>prepareNpcMeal(input,'npc-meal-payment'),prepareMealRefund:input=>prepareNpcMeal(input,'npc-meal-refund'),
      prepareMealGuard(){
        const base=current,till=getTill();let locked=false;
        const valid=()=>!loadError&&!saving&&!pending&&current===base&&getTill()===till&&verifyReceptionAccount().ok;
        return {valid,lock(){if(!valid())return false;saving=true;locked=true;return true;},release(){if(locked){locked=false;saving=false;}}};
      }};
  }

  function prepareReceptionWage({proof,settlementReceipt}={}) {
    if(loadError||saving||pending||getBusinessAccount()?.busy)return fail(loadError||'property-busy');
    const verified=verifyReceptionAccount();if(!verified.ok)return verified;
    const operating=verifyBusinessAccount();if(!operating.ok)return operating;
    let receipt;try{receipt=receptionWageReceipt(proof,settlementReceipt);}catch(error){return fail(error.message);}
    const base=current,old=current.events.find(e=>e.id===receipt.id),oldTill=getTill();
    if(old){
      if(JSON.stringify(receptionWageFromEvent(old))!==JSON.stringify(receipt))return fail('reception-wage-conflict');
      let locked=false;const valid=()=>!loadError&&!saving&&!pending&&current===base;
      return {ok:true,replayed:true,patch:{},valid,lock(){if(!valid())return false;saving=true;locked=true;return true;},release(){if(locked){locked=false;saving=false;}},committed:()=>!loadError&&(!saving||locked)&&!pending&&current===base};
    }
    const d=day(),futureTill=oldTill+settlementReceipt.businessProceeds;
    if(d===null||!integer(oldTill)||!integer(futureTill))return fail('invalid-reception-expense');
    let owner;try{owner=a();}catch{return fail('invalid-property-state');}
    if(owner.balance+settlementReceipt.businessProceeds-protection().protectedFunds<receipt.amount)return fail('insufficient-business-funds');
    const event={...copy(receipt),kind:'reception-wage',day:d,till:futureTill,funding:0,funder:owner.ownerId};
    const next={...copy(current),revision:current.revision+1,events:[...current.events,event]};
    try{validate(next,futureTill);}catch{return fail('invalid-reception-expense');}
    let accepted=false,locked=false;const valid=()=>!loadError&&!saving&&!pending&&(accepted||current===base&&getTill()===oldTill);
    return {ok:true,replayed:false,patch:{chinaTavernProperty:copy(next)},valid,
      lock(){if(accepted||!valid())return false;saving=true;locked=true;return true;},
      release(){if(locked){locked=false;saving=false;}},
      committed(){
        if(accepted)return true;
        // Income and expense are already durably stored together. Either
        // synchronous adoption order is safe, without double-counting revenue.
        const till=getTill();if(loadError||!locked||pending||current!==base||till!==oldTill&&till!==futureTill)return false;
        current=next;accepted=true;lastError=null;return true;
      }};
  }
  // New expenses can only originate in the source account's prepared exact
  // receipt. Existing historical records verify against that same source.
  function prepareOperatingGuard({reserve=0,owner=null}={}) {
    if(loadError||saving||pending||getBusinessAccount()?.busy)return fail(loadError||'property-busy');
    const reception=verifyReceptionAccount(),operating=verifyBusinessAccount();if(!reception.ok)return reception;if(!operating.ok)return operating;
    const base=current,till=getTill(),budget=businessBudget();
    if(!budget||!integer(reserve)||reserve>budget.balance)return fail('insufficient-unreserved-business-funds');
    if(owner&&(owner.ownerId!==budget.ownerId||owner.ownership!==budget.ownership))return fail('stale-business-owner');
    let locked=false,durable=false,accepted=false,inSave=false;
    const valid=()=>!loadError&&!saving&&!pending&&current===base&&getTill()===till&&JSON.stringify(businessBudget())===JSON.stringify(budget);
    return {ok:true,patch:{},valid,
      lock(){if(locked||accepted||!valid())return false;saving=true;locked=true;return true;},
      save(fn){if(!locked||durable||inSave||accepted||current!==base||getTill()!==till||typeof fn!=='function')return false;inSave=true;try{const result=fn({patch:{}});if(result?.then){Promise.resolve(result).catch(()=>{});return false;}return durable=result===true;}catch{return false;}finally{inSave=false;}},
      committed(){if(accepted)return true;if(!locked||!durable||inSave||current!==base||getTill()!==till)return false;accepted=true;return true;},
      release(){if(inSave||durable&&!accepted)return false;if(locked){locked=false;saving=false;}return true;}};
  }
  function prepareOperatingExpense({receipt}={}) {
    if(loadError||saving||pending||getBusinessAccount()?.busy)return fail(loadError||'property-busy');
    const reception=verifyReceptionAccount(),operating=verifyBusinessAccount();if(!reception.ok)return reception;if(!operating.ok)return operating;
    const account=getBusinessAccount();
    if(!validTavernOperatingReceipt(receipt)||receipt.amount<1||account?.verifyExpenseCandidate?.(receipt)!==true)return fail('unverified-operating-expense');
    const base=current,till=getTill(),owner=a(),p=protection(),old=current.events.find(e=>e.id===receipt.id);
    if(old&&JSON.stringify(old.receipt)!==JSON.stringify(receipt))return fail('operating-expense-conflict');
    const spendable=receipt.kind==='stock-purchase'?Math.max(0,owner.balance-p.protectedFunds):Math.max(0,owner.balance-p.trialReserved+(receipt.kind==='trial-payment'?receipt.amount:0));
    if(!old&&receipt.amount>spendable)return fail('insufficient-business-funds');
    const event={id:receipt.id,kind:'operating-expense',amount:receipt.amount,day:day(),till,funder:owner.ownerId,funding:0,receipt:copy(receipt)};
    const next=old?current:{...copy(current),revision:current.revision+1,events:[...current.events,event]};
    try{validate(next,till);}catch{return fail('invalid-operating-expense');}
    let locked=false,durable=false,accepted=false,inSave=false;
    const valid=()=>!loadError&&!saving&&!pending&&current===base&&getTill()===till&&protection().sourceRevision===p.sourceRevision&&account.verifyExpenseCandidate(receipt)===true;
    const bundle={patch:old?{}:{chinaTavernProperty:copy(next)}};
    return {ok:true,replayed:!!old,...copy(bundle),valid,
      lock(){if(locked||accepted||!valid())return false;saving=true;locked=true;return true;},
      save(fn){if(!locked||durable||inSave||accepted||current!==base||getTill()!==till||typeof fn!=='function')return false;inSave=true;try{const result=fn(copy(bundle));if(result?.then){Promise.resolve(result).catch(()=>{});return false;}return durable=result===true;}catch{return false;}finally{inSave=false;}},
      committed(){if(accepted)return true;if(!locked||!durable||inSave||current!==base||getTill()!==till)return false;current=next;accepted=true;lastError=null;return true;},
      release(){if(inSave||durable&&!accepted)return false;if(locked){locked=false;saving=false;}return true;}};
  }
  // Live ownership projection for controller reads. Mutation paths still use
  // the full account/source guards; no journal or display data is copied here.
  function ownershipState() {
    try{const {ownerId,ownership}=a();return {ownerId,ownership};}catch{return null;}
  }
  function state() {
    try{const accounts=a(),salon=getSalonIncome(),verified=verifyReceptionAccount(),operating=verifyBusinessAccount(),p=protection(),stock=getStock(),stockState=typeof stock?.summary==='function'?stock.summary():stock?.state?.()?.summary??stock?.summary;const materialConsumedCost=stockState?.materialExpense||0,oldLabor=current.events.filter(e=>e.kind==='wage'||e.kind==='reception-wage').reduce((n,e)=>n+e.amount,0),earnedLabor=oldLabor+p.earnedWages+p.trialEarned;return {...copy(current),...accounts,...(salon?{revenue:accounts.revenue+salon.performerPaid,salonRevenue:salon.grossRevenue,performerPaid:salon.performerPaid}:{}),protectedFunds:p.protectedFunds,trialReserved:p.trialReserved,wagesPayable:p.wagesPayable,availableBalance:Math.max(0,accounts.balance-p.protectedFunds),materialConsumedCost,inventoryValue:stockState?.inventoryValue||0,procurementCash:accounts.operatingCosts,earnedLabor,operatingProfit:accounts.revenue-materialConsumedCost-earnedLabor,npcNames:Object.fromEntries(Object.keys(NPCS).map(id=>[id,name(id)])),bank:copperLedger.balances()?.copper.bank??null,loadError:loadError||(!verified.ok?verified.code:null)||(!operating.ok?operating.code:null),lastError};}
    catch{return {...copy(current),loadError:loadError||'invalid-property-state',lastError};}
  }
  return {get loadError(){return loadError;},snapshot:()=>copy(current),mealFundsProvider,verifyReceptionAccount,verifyBusinessAccount,businessBudget,prepareOperatingGuard,prepareOperatingExpense,prepareReceptionWage,npcAccount,prepareNpcMealPayment:input=>prepareNpcMeal(input,'npc-meal-payment'),prepareNpcMealRefund:input=>prepareNpcMeal(input,'npc-meal-refund'),state,refreshDay,applyPurchase,confirmPurchase,setPrice,replyOffer,invest:(amount,revision)=>capital('invest',amount,revision),draw:(amount,revision)=>capital('draw',amount,revision),prepareCurrencyCommit,ownershipState};
}
