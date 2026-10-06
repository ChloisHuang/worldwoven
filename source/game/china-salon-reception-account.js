// Receptionist payroll and personal meals. Only a newly completed, income-bearing
// service funds this zero-origin account, in the caller's one atomic save.
import {SALON_RECEPTION_ROLE as ROLE} from './china-salon-reception-role.js';
import {validateReceptionProof} from './china-salon-reception-proof.js';
const copy=value=>JSON.parse(JSON.stringify(value));
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const canonical=value=>Array.isArray(value)?value.map(canonical):object(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const fail=code=>({ok:false,code});
const namespace='chinaSalonReceptionAccount';
const empty=()=>({version:2,revision:0,accounts:{[ROLE.incumbentId]:{cash:0,bank:0}},receipts:[],mealTransfers:[]});
const validMeal=input=>object(input)&&input.actorId===ROLE.incumbentId&&typeof input.orderId==='string'&&/^cn-tavern-order-[1-9][0-9]*$/.test(input.orderId)&&integer(input.amount)&&input.amount>0;
const journal=value=>typeof value?.snapshot==='function'?value.snapshot():value;

// This shared canonical record also binds the business debit to its exact
// service, contract and worker. A changed holder revision cannot mint a new ID.
export function receptionWageReceipt(proof,settlementReceipt){
 const p=validateReceptionProof(proof),r=settlementReceipt,paid=Math.floor(p.fee/2),npc=p.sessionId.startsWith('cn-salon-npc-');
 if(!object(r)||r.id!==`salon-income:${p.sessionId}`||r.sessionId!==p.sessionId||typeof r.settlementId!=='string'||!r.settlementId||r.actorId!==p.artistId||r.activity!==p.activity||r.businessId!==ROLE.employer||r.currency!==ROLE.currency||r.gross!==p.fee||!same(r.incomePolicy,{version:1,performerShareBps:5000,rounding:'floor'})||r.businessCredit!==p.fee||r.businessDebit!==paid||r.performerPaid!==paid||r.businessProceeds!==p.fee-paid||!same(r.receptionWork,p)||
  (npc?r.sourceProvider!=='china-official-economy'||r.customerId!==p.customerId:r.sourceProvider!==undefined||r.customerId!==undefined&&r.customerId!=='player'))throw Error('unverified-reception-income');
 return {id:`salon-reception-wage:${ROLE.id}:${p.sessionId}`,sessionId:p.sessionId,actorId:p.actorId,roleId:p.roleId,slotId:p.slotId,holderRevision:p.holderRevision,contractVersion:p.contractVersion,businessId:ROLE.employer,currency:ROLE.currency,amount:ROLE.amount,incomeReceiptId:r.id,settlementId:r.settlementId,proof:p};
}
export function receptionWageFromEvent(event){
 const {kind,day,till,funder,funding,...record}=event||{};
 return record;
}
export function validReceptionWageRecord(record){
 try{
  const p=validateReceptionProof(record?.proof),paid=Math.floor(p.fee/2),npc=p.sessionId.startsWith('cn-salon-npc-');
  const expected=receptionWageReceipt(p,{id:`salon-income:${p.sessionId}`,sessionId:p.sessionId,settlementId:record.settlementId,actorId:p.artistId,activity:p.activity,businessId:ROLE.employer,currency:ROLE.currency,gross:p.fee,incomePolicy:{version:1,performerShareBps:5000,rounding:'floor'},businessCredit:p.fee,businessDebit:paid,performerPaid:paid,businessProceeds:p.fee-paid,receptionWork:p,...(npc?{sourceProvider:'china-official-economy',customerId:p.customerId}:{})});
  return same(record,expected);
 }catch{return false;}
}
function append(current,receipt){
 const next=copy(current);next.revision++;next.accounts[receipt.actorId].bank+=receipt.amount;next.receipts.push({...copy(receipt),sequence:next.revision});
 if(!integer(next.revision)||!integer(next.accounts[receipt.actorId].bank))throw Error('reception-balance-overflow');
 return next;
}
function mealChange(current,input,kind){
 if(!validMeal(input))throw Error('invalid-reception-meal');
 const paid=current.mealTransfers.find(row=>row.orderId===input.orderId&&row.kind==='meal-payment');
 const refunded=current.mealTransfers.find(row=>row.orderId===input.orderId&&row.kind==='meal-refund');
 if(kind==='meal-payment'&&paid||kind==='meal-refund'&&(!paid||refunded||paid.actorId!==input.actorId||paid.amount!==input.amount))throw Error('reception-meal-conflict');
 const next=copy(current),account=next.accounts[input.actorId];
 if(kind==='meal-payment'&&account.cash+account.bank<input.amount)throw Error('insufficient-npc-funds');
 const sourceSplit=kind==='meal-payment'?{cash:Math.min(account.cash,input.amount),bank:Math.max(0,input.amount-account.cash)}:copy(paid.sourceSplit),sign=kind==='meal-payment'?-1:1;
 account.cash+=sign*sourceSplit.cash;account.bank+=sign*sourceSplit.bank;
 const record={kind,id:`${namespace}:${kind}:${input.orderId}`,sequence:++next.revision,actorId:input.actorId,orderId:input.orderId,amount:input.amount,sourceSplit};
 if(!integer(next.revision)||!integer(account.cash)||!integer(account.bank)||!integer(account.cash+account.bank))throw Error('reception-balance-overflow');
 next.mealTransfers.push(record);return {next,record};
}
function restore(saved,income,property){
 const events=property?.events?.filter(e=>e.kind==='reception-wage')||[];
 const marked=(income?.receipts||[]).filter(r=>r.receptionWork!==undefined);
 if(saved==null){if(events.length||marked.length)throw Error('reception-account-missing');return empty();}
 if(!object(saved)||![1,2].includes(saved.version)||!integer(saved.revision)||!Array.isArray(saved.receipts))throw Error('invalid-reception-account');
 // V1 had salary-only revisions. Retain all verified evidence and zero-origin
 // balances; migration introduces no income, meals, property changes or writes.
 const candidate=saved.version===1?{...saved,version:2,mealTransfers:[]}:saved;
 if(saved.version===1&&Object.hasOwn(saved,'mealTransfers')||!Array.isArray(candidate.mealTransfers)||candidate.revision!==candidate.receipts.length+candidate.mealTransfers.length)throw Error('invalid-reception-sequence');
 if(!Array.isArray(income?.receipts)&&saved.receipts.length)throw Error('reception-income-unavailable');
 if(!Array.isArray(property?.events)&&saved.receipts.length)throw Error('reception-property-unavailable');
 const incomes=new Map((income?.receipts||[]).map(r=>[r.sessionId,r])),expenses=new Map(events.map(e=>[e.id,e]));
 if(marked.length!==saved.receipts.length)throw Error('reception-income-mismatch');
 if(events.length!==saved.receipts.length||expenses.size!==events.length)throw Error('reception-property-mismatch');
 let expected=empty();const seen=new Set();
 const transactions=[...candidate.receipts.map(record=>({kind:'wage',record})),...candidate.mealTransfers.map(record=>({kind:'meal',record}))].sort((a,b)=>a.record?.sequence-b.record?.sequence);
 for(const {kind,record}of transactions){
  if(!record||record.sequence!==expected.revision+1||seen.has(record.id))throw Error('invalid-reception-sequence');
  seen.add(record.id);
  if(kind==='wage'){
   const receipt=receptionWageReceipt(record.proof,incomes.get(record.sessionId)),event=expenses.get(record.id),{sequence,...plain}=record;
   if(!same(plain,receipt)||!event||!same(receptionWageFromEvent(event),receipt))throw Error('reception-receipt-mismatch');
   expected=append(expected,receipt);
  }else{
   if(!['meal-payment','meal-refund'].includes(record.kind))throw Error('invalid-reception-meal');
   // Reconstruct at the original transaction, before any later salary. A
   // solvent final balance cannot validate an earlier unfunded meal.
   const result=mealChange(expected,record,record.kind);
   if(!same(record,result.record))throw Error('invalid-reception-meal-proof');
   expected=result.next;
  }
 }
 if(!same(candidate,expected))throw Error('invalid-reception-balance');
 return expected;
}
export function createChinaSalonReceptionAccount({saved,getSalonIncome=()=>null,getProperty=()=>null,saveState=()=>false}={}){
 let current=empty(),loadError=null,lastError=null,invalidSnapshot=null,busy=false;
 try{
  if(saved!=null)invalidSnapshot=copy(saved);
  const property=getProperty();if(property?.loadError)throw Error(property.loadError);
  current=restore(saved,journal(getSalonIncome()),journal(property));invalidSnapshot=null;
 }catch(error){loadError=error.message;}
 const indexed=new Map(current.receipts.map(({sequence,...receipt})=>[receipt.id,receipt]));
 const failure=code=>{lastError=code;return fail(code);};
 const snapshot=()=>copy(loadError&&invalidSnapshot!==null?invalidSnapshot:current);
 function prepareMeal(input,kind){
  if(loadError||busy)return failure(loadError||'npc-ledger-busy');
  if(!validMeal(input))return failure('invalid-reception-meal');
  if(kind==='meal-payment'&&current.mealTransfers.some(row=>row.orderId===input.orderId&&row.kind==='meal-refund'))return failure('reception-meal-conflict');
  const old=current.mealTransfers.find(row=>row.orderId===input.orderId&&row.kind===kind);
  if(old&&(old.actorId!==input.actorId||old.amount!==input.amount))return failure('reception-meal-conflict');
  const base=current;let result;
  try{result=old?{next:copy(current),record:copy(old)}:mealChange(current,input,kind);}catch(error){return failure(error.message);}
  const {next,record}=result;let accepted=false,locked=false;
  const valid=()=>!loadError&&!accepted&&!busy&&current===base;
  function adopt(){current=next;accepted=true;lastError=null;return {ok:true,replayed:!!old};}
  return {ok:true,replayed:!!old,snapshot:copy(next),patch:{[namespace]:copy(next)},transfer:copy(record),balanceAfter:next.accounts[input.actorId].cash+next.accounts[input.actorId].bank,
   valid,lock(){if(!valid())return false;busy=true;locked=true;return true;},
   release(){if(locked){locked=false;busy=false;}},
   committed(){
    if(accepted)return {ok:true,replayed:true};
    if(loadError||!locked||current!==base)return failure('stale-npc-meal');
    return adopt();
   },
   commit(patch={}){
    if(accepted)return {ok:true,replayed:true};
    if(!valid())return failure('stale-npc-meal');
    if(!object(patch)||Object.hasOwn(patch,namespace)||typeof saveState!=='function')return failure('invalid-reception-meal-patch');
    busy=true;
    try{
     const stored=saveState(copy(next),copy(record),copy(patch));
     if(stored?.then){Promise.resolve(stored).catch(()=>{});return failure('async-save-unsupported');}
     if(stored===false||stored?.ok===false)return failure('save-failed');
     return adopt();
    }catch{return failure('save-failed');}finally{busy=false;}
   }
  };
 }
 return {
  get loadError(){return loadError;},get lastError(){return lastError;},snapshot,state:snapshot,
  account:(actorId=ROLE.incumbentId)=>!loadError&&actorId===ROLE.incumbentId?copy(current.accounts[actorId]):null,
  hasIncome:actorId=>!loadError&&actorId===ROLE.incumbentId&&current.receipts.some(receipt=>receipt.actorId===actorId&&receipt.amount>0),
  mealAccountIdentity:()=>({version:1,namespace,currency:ROLE.currency,roleIds:[ROLE.id]}),
  mealTransfer:(orderId,kind)=>loadError?null:copy(current.mealTransfers.find(row=>row.orderId===orderId&&row.kind===kind)||null),
  prepareMealPayment:input=>prepareMeal(input,'meal-payment'),prepareMealRefund:input=>prepareMeal(input,'meal-refund'),
  prepareMealGuard(){
   const base=current;let locked=false;
   const valid=()=>!loadError&&!busy&&current===base;
   return {valid,lock(){if(!valid())return false;busy=true;locked=true;return true;},release(){if(locked){locked=false;busy=false;}}};
  },
  prepareWage({proof,settlementReceipt}={}){
   if(loadError||busy)return failure(loadError||'npc-ledger-busy');
   let receipt;try{receipt=receptionWageReceipt(proof,settlementReceipt);}catch(error){return failure(error.message);}
   const old=indexed.get(receipt.id),property=getProperty();
   if(old&&!same(old,receipt))return failure('reception-wage-conflict');
   if(!property?.prepareReceptionWage)return failure('reception-property-unavailable');
   const income=journal(getSalonIncome());
   if(!Array.isArray(income?.receipts)||!integer(income.revision))return failure('reception-income-unavailable');
   if(!old&&income?.receipts?.some(r=>r.sessionId===receipt.sessionId))return failure('reception-historical-income');
   const expense=property.prepareReceptionWage({proof,settlementReceipt});if(!expense.ok)return expense;
   if(!!old!==!!expense.replayed)return failure('reception-property-mismatch');
   const base=current,incomeRevision=income.revision;let accepted=false,locked=false;
   function lock(){
    if(loadError||busy||accepted||current!==base||!expense.valid()||!old&&(journal(getSalonIncome())?.revision??0)!==incomeRevision)return false;
    busy=true;
    try{if(!expense.lock?.()){expense.release?.();busy=false;return false;}locked=true;return true;}
    catch{expense.release?.();busy=false;return false;}
   }
   function release(){if(locked){expense.release();locked=false;busy=false;}}
   if(old)return {ok:true,replayed:true,receipt:copy(old),patch:{},lock,release,valid:()=>!loadError&&!busy&&(accepted||current===base&&expense.valid()),committed(){
    if(accepted)return true;
    if(loadError||busy&&!locked||current!==base||expense.committed()===false)return false;
    accepted=true;return true;
   }};
   let next;try{next=append(current,receipt);}catch(error){return failure(error.message);}
   return {ok:true,replayed:false,receipt:copy(receipt),patch:{...expense.patch,[namespace]:copy(next)},lock,release,
    valid:()=>!loadError&&!busy&&(accepted||current===base&&(journal(getSalonIncome())?.revision??0)===incomeRevision&&expense.valid()),
    committed(){
     if(accepted)return true;
     // Salary and meal candidates share a revision boundary. A stale salary
     // cannot restore money already spent or mutate its business counterpart.
     // The caller may already have adopted its income candidate after storage.
     if(loadError||!locked||current!==base||expense.committed()===false)return false;
     current=next;indexed.set(receipt.id,receipt);accepted=true;lastError=null;return true;
    }};
  }
 };
}
