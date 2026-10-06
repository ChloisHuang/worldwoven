import {SALON_ARTISTS,SALON_ACTIVITIES} from './china-tavern-salon-artists.js';
import {TAVERN_BUSINESS_ID} from './china-tavern-property.js';

// Provisional game-design split, not a service price or a free daily allowance.
// Each new service freezes its own rate; old unmarked services are not back-paid.
export const SALON_PERFORMER_SHARE_BPS=5000;
export const SALON_ARTIST_IDS=Object.freeze(SALON_ARTISTS.map(a=>a.id));
const copy=x=>JSON.parse(JSON.stringify(x)),integer=x=>Number.isSafeInteger(x)&&x>=0;
const sessionId=id=>typeof id==='string'&&/^cn-salon-[1-9][0-9]*-[1-9][0-9]*$/.test(id);
export const validSalonIncomePolicy=p=>!!p&&p.version===1&&Number.isInteger(p.performerShareBps)&&p.performerShareBps>=0&&p.performerShareBps<=10000&&p.rounding==='floor';
const share=(fee,bps)=>Number(BigInt(fee)*BigInt(bps)/10000n);
const empty=()=>({version:1,revision:0,grossRevenue:0,performerPaid:0,businessProceeds:0,accounts:Object.fromEntries(SALON_ARTIST_IDS.map(id=>[id,{cash:0,bank:0}])),receipts:[]});
const validSource=(tx,id,amount)=>tx?.action==='settle'&&tx.currency==='copper'&&tx.reservationId===id&&tx.requestId===JSON.stringify(['settle',id])&&tx.amount===amount;
function receiptFor(tx,proof){
 if(!proof||!sessionId(proof.id)||!SALON_ARTIST_IDS.includes(proof.actorId)||!SALON_ACTIVITIES[proof.activity]||!SALON_ARTISTS.find(a=>a.id===proof.actorId)?.activity||SALON_ARTISTS.find(a=>a.id===proof.actorId).activity!==proof.activity||proof.completed!==true||!integer(proof.fee)||proof.fee<1||!validSalonIncomePolicy(proof.incomePolicy)||!validSource(tx,proof.id,proof.fee)||typeof tx.id!=='string')return null;
 const paid=share(proof.fee,proof.incomePolicy.performerShareBps);
 return {id:'salon-income:'+proof.id,sessionId:proof.id,settlementId:tx.id,actorId:proof.actorId,activity:proof.activity,businessId:TAVERN_BUSINESS_ID,currency:'copper',gross:proof.fee,incomePolicy:copy(proof.incomePolicy),businessCredit:proof.fee,businessDebit:paid,performerPaid:paid,businessProceeds:proof.fee-paid};
}
function append(current,r){
 const next=copy(current);next.revision++;next.grossRevenue+=r.gross;next.performerPaid+=r.performerPaid;next.businessProceeds+=r.businessProceeds;next.accounts[r.actorId].bank+=r.performerPaid;next.receipts.push(r);
 if(![next.revision,next.grossRevenue,next.performerPaid,next.businessProceeds,...Object.values(next.accounts).flatMap(a=>[a.cash,a.bank])].every(integer))throw Error('salon-income-overflow');
 return next;
}
function restore(saved,history){
 if(saved==null)return empty();
 if(saved.version!==1||!Array.isArray(saved.receipts)||!integer(saved.revision)||saved.revision!==saved.receipts.length)throw Error('invalid-salon-economy');
 const transactions=new Map(history.map(t=>[t.id,t])),seen=new Set();let expected=empty();
 for(const r of saved.receipts){
  if(!r||seen.has(r.sessionId))throw Error('duplicate-salon-income');
  const tx=transactions.get(r.settlementId),verified=receiptFor(tx,{id:r.sessionId,actorId:r.actorId,activity:r.activity,fee:r.gross,incomePolicy:r.incomePolicy,completed:true});
  if(!verified||Object.keys(r).length!==Object.keys(verified).length||Object.keys(verified).some(k=>JSON.stringify(r[k])!==JSON.stringify(verified[k])))throw Error('unverified-salon-income');
  seen.add(r.sessionId);expected=append(expected,verified);
 }
 for(const key of['version','revision','grossRevenue','performerPaid','businessProceeds'])if(saved[key]!==expected[key])throw Error('invalid-salon-balance');
 if(!saved.accounts||Object.keys(saved.accounts).length!==SALON_ARTIST_IDS.length||SALON_ARTIST_IDS.some(id=>!saved.accounts[id]||Object.keys(saved.accounts[id]).length!==2||['cash','bank'].some(k=>saved.accounts[id][k]!==expected.accounts[id][k])))throw Error('invalid-artist-balance');
 return expected;
}
export function createChinaSalonEconomy({saved,copperLedger,performerShareBps=SALON_PERFORMER_SHARE_BPS}={}){
 const policy={version:1,performerShareBps,rounding:'floor'};
 if(!validSalonIncomePolicy(policy))throw Error('invalid-salon-income-policy');
 let current=empty(),loadError=null;
 // Full journal verification occurs once at restore, never in the NPC update.
 try{if(copperLedger?.loadError)throw Error('currency-ledger-unavailable');current=restore(saved,saved?.receipts?.length?copperLedger?.history?.()||[]:[]);}catch(e){loadError=e.message;}
 const indexed=new Map(current.receipts.map(r=>[r.sessionId,r]));
 return {
  get loadError(){return loadError;},policy:()=>copy(policy),
  account:id=>!loadError&&SALON_ARTIST_IDS.includes(id)?{...current.accounts[id]}:null,
  summary:()=>({grossRevenue:current.grossRevenue,performerPaid:current.performerPaid,businessProceeds:loadError?null:current.businessProceeds,loadError}),
  snapshot:()=>copy(current),
  // The live salon supplies completion proof only inside the real settle call.
  // The wallet, business credit/debit and artist credit share ONE game save.
  prepareIncome(tx,proof){
   if(loadError)return {ok:false,code:loadError};
   const receipt=receiptFor(tx,proof);if(!receipt)return {ok:false,code:'unverified-salon-service'};
   const old=indexed.get(receipt.sessionId);if(old)return JSON.stringify(old)===JSON.stringify(receipt)?{ok:true,replayed:true,patch:{},committed(){}}:{ok:false,code:'salon-income-conflict'};
   let next;try{next=append(current,receipt);}catch{return {ok:false,code:'salon-income-overflow'};}
   return {ok:true,patch:{chinaSalonEconomy:copy(next)},committed(){current=next;indexed.set(receipt.sessionId,receipt);}};
  }
 };
}
