import {SALON_ARTISTS,SALON_ACTIVITIES} from './china-tavern-salon-artists.js';
import {CHINA_COURT_OFFICIAL_RANKS} from './china-official-ranks.js';
import {receptionProofMatchesSession} from './china-salon-reception-proof.js';
import {TAVERN_BUSINESS_ID} from './china-tavern-property.js';

// Provisional game-design split, not a service price or a free daily allowance.
// Each new service freezes its own rate; old unmarked services are not back-paid.
export const SALON_PERFORMER_SHARE_BPS=5000;
export const SALON_ARTIST_IDS=Object.freeze(SALON_ARTISTS.map(a=>a.id));
const copy=x=>JSON.parse(JSON.stringify(x)),integer=x=>Number.isSafeInteger(x)&&x>=0;
const sessionId=id=>typeof id==='string'&&/^cn-salon-[1-9][0-9]*-[1-9][0-9]*$/.test(id);
export const validSalonIncomePolicy=p=>!!p&&p.version===1&&Number.isInteger(p.performerShareBps)&&p.performerShareBps>=0&&p.performerShareBps<=10000&&p.rounding==='floor';
const share=(fee,bps)=>Number(BigInt(fee)*BigInt(bps)/10000n);
const empty=()=>({version:2,revision:0,grossRevenue:0,performerPaid:0,businessProceeds:0,accounts:Object.fromEntries(SALON_ARTIST_IDS.map(id=>[id,{cash:0,bank:0}])),receipts:[],mealTransfers:[]});
const validSource=(tx,id,amount)=>tx?.action==='settle'&&tx.currency==='copper'&&tx.reservationId===id&&tx.requestId===JSON.stringify(['settle',id])&&tx.amount===amount;
function receiptFor(tx,proof){
 if(!proof||!sessionId(proof.id)||!SALON_ARTIST_IDS.includes(proof.actorId)||!SALON_ACTIVITIES[proof.activity]||!SALON_ARTISTS.find(a=>a.id===proof.actorId)?.activity||SALON_ARTISTS.find(a=>a.id===proof.actorId).activity!==proof.activity||proof.completed!==true||!integer(proof.fee)||proof.fee<1||!validSalonIncomePolicy(proof.incomePolicy)||!validSource(tx,proof.id,proof.fee)||typeof tx.id!=='string')return null;
 if(proof.receptionWork&&!receptionProofMatchesSession(proof.receptionWork,proof))return null;
 const reception=proof.receptionWork?{receptionWork:copy(proof.receptionWork)}:{};
 const paid=share(proof.fee,proof.incomePolicy.performerShareBps);
 return {...reception,id:'salon-income:'+proof.id,sessionId:proof.id,settlementId:tx.id,actorId:proof.actorId,activity:proof.activity,businessId:TAVERN_BUSINESS_ID,currency:'copper',gross:proof.fee,incomePolicy:copy(proof.incomePolicy),businessCredit:proof.fee,businessDebit:paid,performerPaid:paid,businessProceeds:proof.fee-paid};
}
// A second, explicitly typed source: an existing official's own reserved pay.
// Never turn an NPC service into a fabricated player-wallet settlement.
function officialReceiptFor(tx,proof){
 if(!proof||!/^cn-salon-npc-[1-9][0-9]*$/.test(proof.id||'')||proof.completed!==true||!SALON_ARTIST_IDS.includes(proof.actorId)||SALON_ARTISTS.find(a=>a.id===proof.actorId)?.activity!==proof.activity||!integer(proof.fee)||proof.fee<1||!validSalonIncomePolicy(proof.incomePolicy)||proof.incomePolicy.performerShareBps!==5000)return null;
 const e=tx?.evidence;
 if(!CHINA_COURT_OFFICIAL_RANKS.some(r=>r.actorId===proof.customerId)||tx?.receiptId!=='official-salon-settle:'+proof.id||tx?.action!=='salon-settle'||tx.orderId!==proof.id||tx.amount!==proof.fee||tx.artistId!==proof.actorId||tx.activity!==proof.activity||tx.actorId!==proof.customerId||JSON.stringify(tx.incomePolicy)!==JSON.stringify(proof.incomePolicy)||typeof tx.id!=='string'||e?.kind!=='salon-service'||e.completed!==true||e.orderId!==proof.id||e.customerId!==proof.customerId||e.artistId!==proof.actorId||e.activity!==proof.activity||!Number.isFinite(e.elapsed)||!Number.isFinite(e.duration)||e.duration<2.2||e.elapsed<e.duration)return null;
 if(proof.receptionWork&&!receptionProofMatchesSession(proof.receptionWork,proof))return null;
 const reception=proof.receptionWork?{receptionWork:copy(proof.receptionWork)}:{};
 const paid=share(proof.fee,proof.incomePolicy.performerShareBps);
 return {...reception,id:'salon-income:'+proof.id,sessionId:proof.id,settlementId:tx.id,sourceProvider:'china-official-economy',customerId:proof.customerId,actorId:proof.actorId,activity:proof.activity,businessId:TAVERN_BUSINESS_ID,currency:'copper',gross:proof.fee,incomePolicy:copy(proof.incomePolicy),businessCredit:proof.fee,businessDebit:paid,performerPaid:paid,businessProceeds:proof.fee-paid};
}
function append(current,r){
 const next=copy(current);next.revision++;next.grossRevenue+=r.gross;next.performerPaid+=r.performerPaid;next.businessProceeds+=r.businessProceeds;next.accounts[r.actorId].bank+=r.performerPaid;next.receipts.push({...r,sequence:next.revision});
 if(![next.revision,next.grossRevenue,next.performerPaid,next.businessProceeds,...Object.values(next.accounts).flatMap(a=>[a.cash,a.bank])].every(integer))throw Error('salon-income-overflow');
 return next;
}
function mealChange(current,input,kind){
 if(!SALON_ARTIST_IDS.includes(input?.actorId)||!/^cn-tavern-order-[1-9][0-9]*$/.test(input?.orderId||'')||!integer(input.amount)||input.amount<1)throw Error('invalid-artist-meal');
 const payment=current.mealTransfers.find(r=>r.orderId===input.orderId&&r.kind==='meal-payment'),refund=current.mealTransfers.find(r=>r.orderId===input.orderId&&r.kind==='meal-refund');
 if(kind==='meal-payment'&&payment||kind==='meal-refund'&&(!payment||refund||payment.actorId!==input.actorId||payment.amount!==input.amount))throw Error('artist-meal-conflict');
 const next=copy(current),account=next.accounts[input.actorId];let split;
 if(kind==='meal-payment'){if(account.cash+account.bank<input.amount)throw Error('insufficient-artist-funds');split={cash:Math.min(account.cash,input.amount),bank:Math.max(0,input.amount-account.cash)};account.cash-=split.cash;account.bank-=split.bank;}
 else{split={...payment.sourceSplit};account.cash+=split.cash;account.bank+=split.bank;}
 const record={kind,receiptId:'artist-'+kind+':'+input.orderId,sequence:++next.revision,actorId:input.actorId,orderId:input.orderId,amount:input.amount,sourceSplit:split};next.mealTransfers.push(record);
 if(!integer(account.cash)||!integer(account.bank)||!integer(account.cash+account.bank))throw Error('artist-balance-overflow');
 return {next,record};
}
function restore(saved,history,officialHistory=[]){
 if(saved==null)return empty();
 if(![1,2].includes(saved.version)||!Array.isArray(saved.receipts)||!integer(saved.revision))throw Error('invalid-salon-economy');
 const income=saved.receipts.map((r,i)=>saved.version===1?{...r,sequence:i+1}:r),meals=saved.version===1?[]:saved.mealTransfers;
 if(!Array.isArray(meals)||saved.revision!==income.length+meals.length)throw Error('invalid-salon-sequence');
 const officialTransactions=new Map(officialHistory.map(t=>[t.id,t])),transactions=new Map(history.map(t=>[t.id,t])),seen=new Set(),events=[...income.map(r=>({type:'income',r})),...meals.map(r=>({type:'meal',r}))].sort((a,b)=>a.r.sequence-b.r.sequence);let expected=empty();
 for(const {type,r}of events){
  if(!r||r.sequence!==expected.revision+1)throw Error('invalid-salon-sequence');
  if(type==='income'){
   if(seen.has(r.sessionId))throw Error('duplicate-salon-income');
   const official=r.sourceProvider==='china-official-economy',tx=(official?officialTransactions:transactions).get(r.settlementId),verified=(official?officialReceiptFor:receiptFor)(tx,{id:r.sessionId,actorId:r.actorId,customerId:r.customerId,activity:r.activity,fee:r.gross,incomePolicy:r.incomePolicy,completed:true,...(r.receptionWork?{roomId:r.receptionWork.roomId,receptionWork:r.receptionWork}:{})});
   if(!verified||Object.keys(r).length!==Object.keys(verified).length+1||Object.keys(verified).some(k=>JSON.stringify(r[k])!==JSON.stringify(verified[k])))throw Error('unverified-salon-income');
   seen.add(r.sessionId);expected=append(expected,verified);
  }else{if(!['meal-payment','meal-refund'].includes(r.kind))throw Error('invalid-artist-meal');const result=mealChange(expected,r,r.kind);if(JSON.stringify(result.record)!==JSON.stringify(r))throw Error('invalid-artist-meal-proof');expected=result.next;}
 }
 for(const key of['revision','grossRevenue','performerPaid','businessProceeds'])if(saved[key]!==expected[key])throw Error('invalid-salon-balance');
 if(!saved.accounts||Object.keys(saved.accounts).length!==SALON_ARTIST_IDS.length||SALON_ARTIST_IDS.some(id=>!saved.accounts[id]||Object.keys(saved.accounts[id]).length!==2||['cash','bank'].some(k=>saved.accounts[id][k]!==expected.accounts[id][k])))throw Error('invalid-artist-balance');
 return expected;
}
export function createChinaSalonEconomy({saved,copperLedger,officialEconomy=null,performerShareBps=SALON_PERFORMER_SHARE_BPS,saveState=null,getReceptionAccount=()=>null}={}){
 const policy={version:1,performerShareBps,rounding:'floor'};
 if(!validSalonIncomePolicy(policy))throw Error('invalid-salon-income-policy');
 let current=empty(),loadError=null;
 // Full journal verification occurs once at restore, never in the NPC update.
 try{if(copperLedger?.loadError)throw Error('currency-ledger-unavailable');if(saved?.receipts?.some(r=>r.sourceProvider==='china-official-economy')&&officialEconomy?.loadError)throw Error('official-ledger-unavailable');current=restore(saved,saved?.receipts?.length?copperLedger?.history?.()||[]:[],saved?.receipts?.some(r=>r.sourceProvider==='china-official-economy')?officialEconomy?.history?.()||[]:[]);}catch(e){loadError=e.message;}
 const indexed=new Map(current.receipts.map(r=>{const {sequence,...receipt}=r;return [r.sessionId,receipt];})),earnedActors=new Set(current.receipts.filter(r=>r.performerPaid>0).map(r=>r.actorId));let saving=false;
 // Optional dormant receptionist participant: the original payer save owns all
 // four legs (payer, artist, business expense and receptionist private income).
 function prepareReception(receipt){
  if(!receipt.receptionWork)return {ok:true,patch:{},valid:()=>true,lock:()=>true,release(){},committed:()=>true};
  const account=getReceptionAccount();
  if(!account||account.loadError)return {ok:false,code:account?.loadError||'reception-account-unavailable'};
  return account.prepareWage({proof:receipt.receptionWork,settlementReceipt:receipt});
 }
 // The payer owns the single save; keep artist, receptionist and the exact
 // business expense locked until all in-memory counterparts have adopted it.
 function incomeCandidate(receipt,next,base,reception){
  let accepted=false,locked=false;
  const valid=()=>!loadError&&!saving&&(accepted||current===base&&reception.valid());
  return {ok:true,patch:{chinaSalonEconomy:copy(next),...reception.patch},valid,
   lock(){
    if(accepted||!valid())return false;saving=true;
    try{if(!reception.lock?.()){reception.release?.();saving=false;return false;}locked=true;return true;}
    catch{reception.release?.();saving=false;return false;}
   },
   release(){if(locked){reception.release();locked=false;saving=false;}},
   committed(){if(accepted)return true;if(loadError||!locked||current!==base)return false;if(reception.committed()===false)return false;current=next;indexed.set(receipt.sessionId,receipt);if(receipt.performerPaid>0)earnedActors.add(receipt.actorId);accepted=true;return true;}
  };
 }
 function incomeReplay(){
  let accepted=false,locked=false;const base=current,valid=()=>!loadError&&!saving&&(accepted||current===base);
  return {ok:true,replayed:true,patch:{},valid,lock(){if(accepted||!valid())return false;saving=true;locked=true;return true;},release(){if(locked){locked=false;saving=false;}},committed(){if(accepted)return true;if(loadError||saving&&!locked||current!==base)return false;accepted=true;return true;}};
 }
 function prepareMeal(input,kind){
  if(loadError||saving)return {ok:false,code:loadError||'artist-ledger-busy'};
  if(kind==='meal-payment'&&current.mealTransfers.some(r=>r.kind==='meal-refund'&&r.orderId===input?.orderId))return {ok:false,code:'artist-meal-conflict'};
  const base=current,old=current.mealTransfers.find(r=>r.kind===kind&&r.orderId===input?.orderId);let result;
  if(old){if(old.actorId!==input?.actorId||old.amount!==input?.amount)return {ok:false,code:'artist-meal-conflict'};result={next:current,record:old};}
  else try{result=mealChange(current,input,kind);}catch(e){return {ok:false,code:e.message};}
  let accepted=false,locked=false;const valid=()=>!loadError&&!saving&&!accepted&&current===base;
  return {ok:true,replayed:!!old,snapshot:copy(result.next),patch:{chinaSalonEconomy:copy(result.next)},transfer:copy(result.record),balanceAfter:result.next.accounts[input.actorId].cash+result.next.accounts[input.actorId].bank,valid,
   lock(){if(!valid())return false;saving=true;locked=true;return true;},release(){if(locked){locked=false;saving=false;}},
   committed(){if(accepted)return {ok:true,replayed:true};if(!locked||current!==base)return {ok:false,code:'stale-artist-meal'};current=result.next;accepted=true;return {ok:true,replayed:!!old};},
   commit(patch={}){
   if(accepted)return {ok:true,replayed:true};if(current!==base||saving)return {ok:false,code:'stale-artist-meal'};
   if(!saveState||!patch||typeof patch!=='object'||Array.isArray(patch)||Object.hasOwn(patch,'chinaSalonEconomy'))return {ok:false,code:'invalid-artist-meal-save'};
   saving=true;try{const stored=saveState(copy(result.next),copy(result.record),copy(patch));if(stored?.then){Promise.resolve(stored).catch(()=>{});return {ok:false,code:'async-save-unsupported'};}if(stored===false||stored?.ok===false)return {ok:false,code:'save-failed'};current=result.next;accepted=true;return {ok:true,replayed:!!old};}catch{return {ok:false,code:'save-failed'};}finally{saving=false;}
  }};
 }
 const mealProvider={
  get loadError(){return loadError;},
  account:id=>!loadError&&SALON_ARTIST_IDS.includes(id)?copy(current.accounts[id]):null,
  hasIncome:id=>!loadError&&earnedActors.has(id),
  mealAccountIdentity:()=>({version:1,namespace:'chinaSalonEconomy',currency:'copper',roleIds:['cn-salon-performer-earned-share']}),
  mealTransfer:(orderId,kind)=>!loadError?copy(current.mealTransfers.find(r=>r.orderId===orderId&&r.kind===kind)||null):null,
  snapshot:()=>copy(loadError?saved??null:current),
  prepareMealPayment:input=>prepareMeal(input,'meal-payment'),prepareMealRefund:input=>prepareMeal(input,'meal-refund'),
  prepareMealGuard(){const base=current;let locked=false;const valid=()=>!loadError&&!saving&&current===base;return {valid,lock(){if(!valid())return false;saving=true;locked=true;return true;},release(){if(locked){locked=false;saving=false;}}};},
 };
 return {
  mealFundsProvider:()=>mealProvider,
  prepareMealPayment:input=>prepareMeal(input,'meal-payment'),prepareMealRefund:input=>prepareMeal(input,'meal-refund'),
  get revision(){return current.revision;},get loadError(){return loadError;},policy:()=>copy(policy),
  account:id=>!loadError&&SALON_ARTIST_IDS.includes(id)?{...current.accounts[id]}:null,
  summary:()=>({grossRevenue:current.grossRevenue,performerPaid:current.performerPaid,businessProceeds:loadError?null:current.businessProceeds,loadError}),
  snapshot:()=>copy(current),
  // The live salon supplies completion proof only inside the real settle call.
  // The wallet, business credit/debit and artist credit share ONE game save.
  prepareOfficialIncome(tx,proof){
   if(loadError||saving||!officialEconomy||officialEconomy.loadError)return {ok:false,code:loadError||'official-ledger-unavailable'};
   const receipt=officialReceiptFor(tx,proof),source=officialEconomy.prepareSalonSettle?.(tx);if(!receipt||!source?.ok||JSON.stringify(source.transaction)!==JSON.stringify(tx))return {ok:false,code:'unverified-official-salon-service'};
   const old=indexed.get(receipt.sessionId);if(old)return JSON.stringify(old)===JSON.stringify(receipt)?incomeReplay():{ok:false,code:'salon-income-conflict'};
   const base=current;let next;try{next=append(current,receipt);}catch{return {ok:false,code:'salon-income-overflow'};}
   const reception=prepareReception(receipt);if(!reception.ok)return reception;
   return incomeCandidate(receipt,next,base,reception);
  },
  prepareIncome(tx,proof){
   if(loadError||saving)return {ok:false,code:loadError||'artist-ledger-busy'};
   const receipt=receiptFor(tx,proof);if(!receipt)return {ok:false,code:'unverified-salon-service'};
   const old=indexed.get(receipt.sessionId);if(old)return JSON.stringify(old)===JSON.stringify(receipt)?incomeReplay():{ok:false,code:'salon-income-conflict'};
   const base=current;let next;try{next=append(current,receipt);}catch{return {ok:false,code:'salon-income-overflow'};}
   const reception=prepareReception(receipt);if(!reception.ok)return reception;
   return incomeCandidate(receipt,next,base,reception);
  }
 };
}
