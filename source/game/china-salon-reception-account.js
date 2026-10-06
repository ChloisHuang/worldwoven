// Dormant receptionist payroll. Only a newly completed, income-bearing service
// may fund this zero-origin personal account, in the caller's one atomic save.
import {SALON_RECEPTION_ROLE as ROLE} from './china-salon-reception-role.js';
import {validateReceptionProof} from './china-salon-reception-proof.js';
const copy=value=>JSON.parse(JSON.stringify(value));
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const canonical=value=>Array.isArray(value)?value.map(canonical):object(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const fail=code=>({ok:false,code});
const empty=()=>({version:1,revision:0,accounts:{[ROLE.incumbentId]:{cash:0,bank:0}},receipts:[]});
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
function restore(saved,income,property){
 const events=property?.events?.filter(e=>e.kind==='reception-wage')||[];
 const marked=(income?.receipts||[]).filter(r=>r.receptionWork!==undefined);
 if(saved==null){if(events.length||marked.length)throw Error('reception-account-missing');return empty();}
 if(!object(saved)||saved.version!==1||!integer(saved.revision)||!Array.isArray(saved.receipts)||saved.revision!==saved.receipts.length)throw Error('invalid-reception-account');
 if(!Array.isArray(income?.receipts)&&saved.receipts.length)throw Error('reception-income-unavailable');
 if(!Array.isArray(property?.events)&&saved.receipts.length)throw Error('reception-property-unavailable');
 const incomes=new Map((income?.receipts||[]).map(r=>[r.sessionId,r])),expenses=new Map(events.map(e=>[e.id,e]));
 if(marked.length!==saved.receipts.length)throw Error('reception-income-mismatch');
 if(events.length!==saved.receipts.length||expenses.size!==events.length)throw Error('reception-property-mismatch');
 let expected=empty();const seen=new Set();
 for(const record of saved.receipts){
  if(!record||record.sequence!==expected.revision+1||seen.has(record.id))throw Error('invalid-reception-sequence');
  const receipt=receptionWageReceipt(record.proof,incomes.get(record.sessionId)),event=expenses.get(record.id),{sequence,...plain}=record;
  if(!same(plain,receipt)||!event||!same(receptionWageFromEvent(event),receipt))throw Error('reception-receipt-mismatch');
  seen.add(record.id);expected=append(expected,receipt);
 }
 if(!same(saved,expected))throw Error('invalid-reception-balance');
 return expected;
}
export function createChinaSalonReceptionAccount({saved,getSalonIncome=()=>null,getProperty=()=>null}={}){
 let current=empty(),loadError=null;
 try{
  const property=getProperty();if(property?.loadError)throw Error(property.loadError);
  current=restore(saved,journal(getSalonIncome()),journal(property));
 }catch(error){loadError=error.message;}
 const indexed=new Map(current.receipts.map(({sequence,...receipt})=>[receipt.id,receipt]));
 return {
  get loadError(){return loadError;},snapshot:()=>copy(current),
  account:(actorId=ROLE.incumbentId)=>!loadError&&actorId===ROLE.incumbentId?copy(current.accounts[actorId]):null,
  prepareWage({proof,settlementReceipt}={}){
   if(loadError)return fail(loadError);
   let receipt;try{receipt=receptionWageReceipt(proof,settlementReceipt);}catch(error){return fail(error.message);}
   const old=indexed.get(receipt.id),property=getProperty();
   if(old&&!same(old,receipt))return fail('reception-wage-conflict');
   if(!property?.prepareReceptionWage)return fail('reception-property-unavailable');
   const income=journal(getSalonIncome());
   if(!Array.isArray(income?.receipts)||!integer(income.revision))return fail('reception-income-unavailable');
   if(!old&&income?.receipts?.some(r=>r.sessionId===receipt.sessionId))return fail('reception-historical-income');
   const expense=property.prepareReceptionWage({proof,settlementReceipt});if(!expense.ok)return expense;
   if(!!old!==!!expense.replayed)return fail('reception-property-mismatch');
   if(old)return {ok:true,replayed:true,receipt:copy(old),patch:{},valid:()=>!loadError&&expense.valid(),committed:()=>expense.committed()};
   const base=current,incomeRevision=income?.revision??0;let next;
   try{next=append(current,receipt);}catch(error){return fail(error.message);}
   let accepted=false;
   return {ok:true,replayed:false,receipt:copy(receipt),patch:{...expense.patch,chinaSalonReceptionAccount:copy(next)},
    valid:()=>!loadError&&(accepted||current===base&&(journal(getSalonIncome())?.revision??0)===incomeRevision&&expense.valid()),
    committed(){
     if(accepted)return true;
     // The caller may already have adopted its income candidate after storage.
     if(loadError||current!==base||expense.committed()===false)return false;
     current=next;indexed.set(receipt.id,receipt);accepted=true;return true;
    }};
  }
 };
}
