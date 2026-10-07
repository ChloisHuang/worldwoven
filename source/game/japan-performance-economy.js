import {PERFORMANCE_CAST,PERFORMANCE_ACTIVITIES,PERFORMANCE_DRINKS} from './japan-performance-cast.js';

// Provisional game-design compensation: a completed original act pays its
// named artist the entire fee; a completed drink pays the original receptionist.
// There is no opening allowance, daily mint, shop till, or copper conversion.
export const JAPAN_PERFORMANCE_ACTOR_IDS=Object.freeze(PERFORMANCE_CAST.map(a=>a.id));
const RECEPTION='jp-performance-reception',CURRENCY='japan';
const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
const integer=x=>Number.isSafeInteger(x)&&x>=0,positive=x=>integer(x)&&x>0;
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const actor=id=>JAPAN_PERFORMANCE_ACTOR_IDS.includes(id);
const sourceId=id=>typeof id==='string'&&/^jp-performance--?[0-9]+-[1-9][0-9]*-[1-9][0-9]*$/.test(id);
const orderId=id=>typeof id==='string'&&/^jp-performance-work-[1-9][0-9]*$/.test(id)&&positive(Number(id.slice('jp-performance-work-'.length)));
const empty=()=>({version:1,revision:0,accounts:Object.fromEntries(JAPAN_PERFORMANCE_ACTOR_IDS.map(id=>[id,{cash:0,bank:0}])),holds:[],receipts:[],transfers:[]});
const keys=(value,names)=>object(value)&&Object.keys(value).length===names.length&&names.every(k=>Object.hasOwn(value,k));
function sources(ledger){
 if(!ledger||ledger.loadError||typeof ledger.history!=='function'||typeof ledger.reservations!=='function')throw Error('currency-ledger-unavailable');
 const history=ledger.history(),holds=ledger.reservations();
 return {transactions:new Map(history.map(t=>[t.id,t])),settlements:new Map(history.filter(t=>t.action==='settle').map(t=>[t.reservationId,t])),holds:new Map(holds.map(h=>[h.id,h]))};
}
function incomeFor(event,source){
 if(!object(event)||!sourceId(event.orderId)||!['act-completed','drink-completed'].includes(event.outcome)||event.eventId!==event.orderId+':'+event.outcome||event.currency!==CURRENCY||!positive(event.amount))return null;
 const performer=PERFORMANCE_CAST.find(a=>a.id===event.artistId);
 if(!performer?.activities.includes(event.activity)||!Array.isArray(event.participants)||event.participants.length!==3||new Set(event.participants).size!==3||!['player',event.artistId,RECEPTION].every(id=>event.participants.includes(id)))return null;
 const part=event.outcome==='act-completed'?'act':'drink',reservationId=event.orderId+':'+part;
 const tx=source.settlements.get(reservationId),hold=source.holds.get(reservationId);
 if(!tx||typeof tx.id!=='string'||tx.action!=='settle'||tx.currency!==CURRENCY||tx.requestId!==JSON.stringify(['settle',reservationId])||tx.amount!==event.amount||hold?.status!=='settled'||hold.currency!==CURRENCY||hold.amount!==event.amount)return null;
 const proof={eventId:event.eventId,orderId:event.orderId,outcome:event.outcome,artistId:event.artistId,activity:event.activity,participants:['player',event.artistId,RECEPTION],amount:event.amount,currency:CURRENCY};
 return {kind:'income',receiptId:'japan-performance-income:'+reservationId,reservationId,settlementId:tx.id,actorId:part==='act'?event.artistId:RECEPTION,currency:CURRENCY,amount:event.amount,proof};
}
function orderFor(input){
 const drink=input?.drink??null,role=PERFORMANCE_CAST.find(a=>a.id===input?.roleId);
 const fee=role?.id===RECEPTION&&input.activity==='drink'?PERFORMANCE_DRINKS.find(d=>d.id===drink)?.fee:role?.activities.includes(input?.activity)&&drink===null?PERFORMANCE_ACTIVITIES[input.activity]?.fee:null;
 if(!orderId(input?.id)||input.currency!==undefined&&input.currency!==CURRENCY||!actor(input?.customerId)||!role||input.customerId===input.roleId||!integer(input.day)||!positive(input.amount)||input.amount!==fee)throw Error('invalid-performance-order');
 return {id:input.id,customerId:input.customerId,roleId:input.roleId,activity:input.activity,drink,amount:input.amount,day:input.day,currency:CURRENCY};
}
function wageMatches(tx,hold){
 if(!object(tx)||typeof tx.id!=='string'||!/^currency-[1-9][0-9]*$/.test(tx.id)||tx.action!=='wage'||tx.currency!==CURRENCY||tx.requestId!==hold.id||tx.roleId!==hold.roleId||tx.slotId!==hold.roleId+'-1'||tx.day!==hold.day||tx.amount!==hold.amount)return false;
 const before=tx.before?.japan,after=tx.after?.japan;
 return object(before)&&object(after)&&integer(before.cash)&&integer(before.bank)&&integer(after.bank)&&after.bank===before.bank+hold.amount&&after.cash===before.cash&&after.accountOpened===true;
}
function checked(next){
 const held=next.holds.filter(h=>h.status==='reserved').reduce((n,h)=>n+h.amount,0);
 if(!integer(next.revision)||!integer(held)||Object.values(next.accounts).some(a=>!integer(a.cash)||a.bank!==0)||!integer(held+Object.values(next.accounts).reduce((n,a)=>n+a.cash,0)))throw Error('performance-balance-overflow');
 return next;
}
function appendIncome(current,receipt){
 if(current.receipts.some(r=>r.receiptId===receipt.receiptId))throw Error('duplicate-performance-income');
 const next=copy(current);next.accounts[receipt.actorId].cash+=receipt.amount;next.receipts.push({...copy(receipt),sequence:++next.revision});return checked(next);
}
function appendTransfer(current,input,source){
 const next=copy(current);let record;
 if(input.kind==='reserve'){
  const order=orderFor(input.order);
  if(next.holds.some(h=>h.id===order.id))throw Error('performance-order-conflict');
  if(next.accounts[order.customerId].cash<order.amount)throw Error('insufficient-performance-funds');
  next.accounts[order.customerId].cash-=order.amount;next.holds.push({...order,status:'reserved'});record={kind:'reserve',order};
 }else{
  const hold=next.holds.find(h=>h.id===input.orderId);
  if(!hold)throw Error('performance-order-not-found');
  if(hold.status!=='reserved')throw Error('performance-order-'+hold.status);
  if(input.kind==='refund'){
   next.accounts[hold.customerId].cash+=hold.amount;hold.status='refunded';record={kind:'refund',orderId:hold.id};
  }else if(input.kind==='settle'){
   const payees=input.payees;
   if(!Array.isArray(payees)||payees.length!==1||!keys(payees[0],['actorId','amount'])||![hold.roleId,'player'].includes(payees[0].actorId)||payees[0].actorId===hold.customerId||payees[0].amount!==hold.amount)throw Error('invalid-performance-payee');
   const isPlayer=payees[0].actorId==='player';
   if(isPlayer&&!wageMatches(source.transactions.get(input.settlementId),hold)||!isPlayer&&input.settlementId!==null)throw Error('unverified-performance-wage');
   if(!isPlayer)next.accounts[payees[0].actorId].cash+=hold.amount;
   hold.status='settled';hold.payees=copy(payees);hold.settlementId=input.settlementId;
   record={kind:'settle',orderId:hold.id,payees:copy(payees),settlementId:input.settlementId};
  }else throw Error('invalid-performance-transfer');
 }
 record.sequence=++next.revision;next.transfers.push(record);return {next:checked(next),record};
}
function restore(saved,source){
 if(saved==null)return empty();
 if(!keys(saved,['version','revision','accounts','holds','receipts','transfers'])||saved.version!==1||!integer(saved.revision)||!Array.isArray(saved.receipts)||!Array.isArray(saved.transfers)||saved.revision!==saved.receipts.length+saved.transfers.length)throw Error('invalid-performance-economy');
 let expected=empty();
 const events=[...saved.receipts.map(record=>({income:true,record})),...saved.transfers.map(record=>({income:false,record}))].sort((a,b)=>a.record?.sequence-b.record?.sequence);
 for(const {income,record}of events){
  if(!record||record.sequence!==expected.revision+1)throw Error('invalid-performance-sequence');
  if(income){const verified=incomeFor(record.proof,source);if(!verified||!same(record,{...verified,sequence:record.sequence}))throw Error('unverified-performance-income');expected=appendIncome(expected,verified);}
  else{const result=appendTransfer(expected,record,source);if(!same(record,result.record))throw Error('invalid-performance-transfer');expected=result.next;}
 }
 if(!same(saved,expected))throw Error('invalid-performance-balances');
 return expected;
}

/** The game save is the sole writer. Every candidate locks until its complete
 * world patch is saved and adopted. A failed, thrown, async or missing writer
 * never consumes income or a reserved payment. Player income is only adopted
 * by the existing currency ledger's single atomic transaction participant. */
export function createJapanPerformanceEconomy({saved,copperLedger,getServiceHistory=()=>[],saveState}={}){
 let current=empty(),loadError=null,saving=false;
 try{if(copperLedger?.loadError)throw Error('currency-ledger-unavailable');current=restore(saved,saved?.receipts?.length||saved?.transfers?.some(t=>t.settlementId)?sources(copperLedger):{transactions:new Map(),settlements:new Map(),holds:new Map()});}catch(e){loadError=e.message;}
 const fail=code=>({ok:false,code});
 function candidate(next,record,{replayed=false,playerPayment=false}={}){
  const base=current;let accepted=false,locked=false;
  const valid=()=>!loadError&&!saving&&!accepted&&current===base;
  const result={ok:true,replayed,record:copy(record),patch:{japanPerformanceEconomy:copy(next)},snapshot:copy(next),valid,
   lock(){if(!valid())return false;saving=true;locked=true;return true;},
   release(){if(locked){locked=false;saving=false;}},
   committed(){if(accepted)return true;if(!locked||current!==base||loadError)return false;current=next;accepted=true;return true;},
   commit(extraPatch={}){
    if(accepted)return {ok:true,replayed:true};
    if(playerPayment)return fail('currency-participant-required');
    if(!object(extraPatch)||Object.hasOwn(extraPatch,'japanPerformanceEconomy')||Object.hasOwn(extraPatch,'copperLedger'))return fail('invalid-performance-save-patch');
    if(typeof saveState!=='function')return fail('persistence-unavailable');
    if(!result.lock())return fail('stale-performance-candidate');
    try{
     const written=saveState(copy(next),copy(record),copy(extraPatch));
     if(written?.then){Promise.resolve(written).catch(()=>{});return fail('async-save-unsupported');}
     if(written===false||written?.ok===false)return fail(written?.code||'save-failed');
     if(!result.committed())return fail('performance-adoption-conflict');
     return {ok:true,replayed};
    }catch{return fail('save-failed');}finally{result.release();}
   }
  };return result;
 }
 function ready(){return loadError||copperLedger?.loadError?'performance-ledger-unavailable':saving?'performance-ledger-busy':null;}
 function prepareSyncIncome(history){
  const error=ready();if(error)return fail(error);
  let source,next=current;const added=[];
  try{
   history??=getServiceHistory();if(!Array.isArray(history))return fail('invalid-performance-history');source=sources(copperLedger);
   for(const event of history){
    const receipt=incomeFor(event,source);if(!receipt)continue;
    const old=next.receipts.find(r=>r.receiptId===receipt.receiptId);
    if(old){const {sequence,...prior}=old;if(!same(prior,receipt))return fail('performance-income-conflict');continue;}
    next=appendIncome(next,receipt);added.push(receipt.receiptId);
   }
  }catch(e){return fail(e.message);}
  return candidate(next,{kind:'income-sync',receiptIds:added},{replayed:!added.length});
 }
 function prepareReserve(input){
  const error=ready();if(error)return fail(error);
  try{
   const order=orderFor(input),old=current.holds.find(h=>h.id===order.id);
   if(old){const {status,payees,settlementId,...prior}=old;if(!same(prior,order)||status!=='reserved')return fail('performance-order-conflict');return candidate(current,{kind:'reserve',order},{replayed:true});}
   const result=appendTransfer(current,{kind:'reserve',order});return candidate(result.next,result.record);
  }catch(e){return fail(e.message);}
 }
 function prepareRefund(id){
  const error=ready();if(error)return fail(error);
  try{
   const old=current.holds.find(h=>h.id===id);if(old?.status==='refunded')return candidate(current,{kind:'refund',orderId:id},{replayed:true});
   const result=appendTransfer(current,{kind:'refund',orderId:id});return candidate(result.next,result.record);
  }catch(e){return fail(e.message);}
 }
 function prepareSettle(id,payees,{transaction}={}){
  const error=ready();if(error)return fail(error);
  try{
   const old=current.holds.find(h=>h.id===id);if(!old)return fail('performance-order-not-found');
   if(typeof payees==='string')payees=[{actorId:payees,amount:old.amount}];
   const playerPayment=payees?.some(p=>p.actorId==='player'),settlementId=playerPayment?transaction?.id:null;
   if(playerPayment&&!wageMatches(transaction,old))return fail('unverified-performance-wage');
   if(old.status==='settled'){if(!same(old.payees,payees)||old.settlementId!==settlementId)return fail('performance-order-conflict');return candidate(current,{kind:'settle',orderId:id,payees:copy(payees),settlementId},{replayed:true,playerPayment});}
   const result=appendTransfer(current,{kind:'settle',orderId:id,payees,settlementId},{transactions:new Map(transaction?[[transaction.id,transaction]]:[])});
   return candidate(result.next,result.record,{playerPayment});
  }catch(e){return fail(e.message);}
 }
 return {get loadError(){return loadError;},get revision(){return current.revision;},
  account(id){if(loadError||!actor(id))return null;const held=current.holds.filter(h=>h.customerId===id&&h.status==='reserved').reduce((n,h)=>n+h.amount,0);return {currency:CURRENCY,...copy(current.accounts[id]),held};},
  hold:id=>loadError?null:copy(current.holds.find(h=>h.id===id)||null),reservations:()=>loadError?[]:copy(current.holds),
  snapshot:()=>copy(loadError?saved:current),history:()=>loadError?[]:copy([...current.receipts,...current.transfers].sort((a,b)=>a.sequence-b.sequence)),
  prepareSyncIncome,syncIncome(history){const prepared=prepareSyncIncome(history);if(!prepared.ok)return prepared;return prepared.replayed?{ok:true,replayed:true}:prepared.commit();},
  prepareReserve,prepareRefund,prepareSettle
 };
}
