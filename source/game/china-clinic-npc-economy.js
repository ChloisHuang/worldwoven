import {PHARMACY_ASSISTANT_ROLE,CLINIC_PHYSICIAN_ROLE} from './formal-careers.js';
import {CLINIC_CARE_PLANS} from './china-clinic-physician-work.js';
import {clinicReviewRole,clinicPatientRating,clinicRatedWage} from './china-clinic-reviews.js';

// Accounting seam only: the clinic must supply observed, closed duty evidence.
// No main registration, clock accrual, free starting funds or remote withdrawal.
const roles=new Map([PHARMACY_ASSISTANT_ROLE,CLINIC_PHYSICIAN_ROLE].map(r=>[r.id,r]));
const copy=structuredClone,integer=n=>Number.isSafeInteger(n)&&n>=0;
const person=id=>typeof id==='string'&&/^cn-[a-z0-9-]{1,60}$/.test(id);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const empty=()=>({version:1,accounts:{},receipts:[]});
export function clinicNPCWageReceipt(proof){
 const role=roles.get(proof?.roleId);
 if(!role||proof.kind!=='clinic-npc-duty'||proof.closed!==true||!person(proof.actorId)||proof.slotId!==role.slotId||!integer(proof.day)||!Array.isArray(proof.segments)||!proof.segments.length||!Array.isArray(proof.reviews))throw Error('invalid-clinic-duty');
 let hours=0,end=role.dutyWindow.startHour;
 const segments=proof.segments.map(s=>{
  if(!integer(s.holderRevision)||!Number.isFinite(s.startHour)||!Number.isFinite(s.endHour)||s.startHour<end||s.endHour<=s.startHour||s.endHour>role.dutyWindow.endHour)throw Error('invalid-clinic-coverage');
  hours+=s.endHour-s.startHour;end=s.endHour;return {startHour:s.startHour,endHour:s.endHour,holderRevision:s.holderRevision};
 });
 const seen=new Set(),reviewRole=clinicReviewRole(role.id);
 const reviews=proof.reviews.map(r=>{
  if(!Number.isSafeInteger(r.number)||r.number<=0||r.orderId!==`cn-clinic-order-${r.number}`||r.cardId!==`cn-clinic-card-${r.number}`||r.packetId!==`cn-clinic-packet-${r.number}`||r.actorId!==proof.actorId||!['cn-tavern-diner-west','cn-tavern-diner-east','player'].includes(r.patientId)||r.completed!==true||!integer(r.holderRevision)||!segments.some(s=>s.holderRevision===r.holderRevision)||!(r.responsibleSeconds===null||Number.isFinite(r.responsibleSeconds)&&r.responsibleSeconds>=0)||r.rating!==clinicPatientRating(r.responsibleSeconds,reviewRole)||seen.has(r.orderId))throw Error('invalid-clinic-patient-proof');
  if(role.id===CLINIC_PHYSICIAN_ROLE.id&&(r.questioned!==true||r.careCorrect!==true||!CLINIC_CARE_PLANS.some(p=>p.id===r.carePlanId)))throw Error('invalid-clinic-patient-proof');
  seen.add(r.orderId);return {...(role.id===CLINIC_PHYSICIAN_ROLE.id?{questioned:true,careCorrect:true,carePlanId:r.carePlanId}:{}),orderId:r.orderId,number:r.number,cardId:r.cardId,packetId:r.packetId,actorId:r.actorId,patientId:r.patientId,completed:true,holderRevision:r.holderRevision,responsibleSeconds:r.responsibleSeconds,rating:r.rating};
 });
 const evidence={kind:proof.kind,closed:true,actorId:proof.actorId,roleId:role.id,slotId:role.slotId,day:proof.day,segments,reviews};
 const amount=clinicRatedWage(role,hours,{clinicRatingTotal:reviews.reduce((v,r)=>v+r.rating,0),clinicReviewCount:reviews.length});
 if(!integer(amount))throw Error('invalid-clinic-wage');
 return {id:`clinic-government-wage:${role.slotId}:${proof.actorId}:${proof.day}`,source:'government-clinic-payroll',currency:'copper',amount,evidence};
}
function append(state,receipt){
 const p=receipt.evidence;
 for(const old of state.receipts){const q=old.evidence;
  if(q.roleId===p.roleId&&p.reviews.some(a=>q.reviews.some(b=>a.orderId===b.orderId)))throw Error('duplicate-clinic-patient-proof');
  if(q.day!==p.day)continue;
  // One physical person cannot cover both jobs simultaneously; neither can two
  // people be credited for the same occupied slot. Handover keeps both people.
  if(q.actorId===p.actorId||q.slotId===p.slotId)for(const a of p.segments)for(const b of q.segments)if(a.startHour<b.endHour&&b.startHour<a.endHour)throw Error('overlapping-clinic-coverage');
 }
 const next=copy(state),account=next.accounts[p.actorId]??={bank:0,cash:0};account.bank+=receipt.amount;
 if(!integer(account.bank))throw Error('clinic-balance-overflow');next.receipts.push(copy(receipt));return next;
}
export function createClinicNPCEconomy({saved,saveState=()=>false}={}){
 let current=empty(),loadError=null,busy=false;
 try{if(saved!==undefined&&saved!==null){if(saved.version!==1||!Array.isArray(saved.receipts))throw Error('invalid-clinic-economy');const seen=new Set();for(const row of saved.receipts){const verified=clinicNPCWageReceipt(row.evidence);if(!same(row,verified)||seen.has(row.id))throw Error('invalid-clinic-receipt');seen.add(row.id);current=append(current,verified);}if(!same(saved,current))throw Error('invalid-clinic-balance');}}catch(e){loadError=e.message;current=empty();}
 const issued=new Map(current.receipts.map(r=>[r.id,r]));
 return {hasReceipt:id=>issued.has(id),get loadError(){return loadError;},snapshot:()=>copy(current),account:id=>loadError?null:copy(current.accounts[id]||{bank:0,cash:0}),
  settle(proof){
   if(loadError||busy)return {ok:false,code:loadError||'clinic-ledger-busy'};
   let receipt,next;try{receipt=clinicNPCWageReceipt(proof);const old=issued.get(receipt.id);if(old)return same(old,receipt)?{ok:true,replayed:true,receipt:copy(old)}:{ok:false,code:'clinic-wage-conflict'};next=append(current,receipt);}catch(e){return {ok:false,code:e.message};}
   busy=true;try{const result=saveState(copy(next));if(result===false||result?.ok===false||result?.then)return {ok:false,code:'save-failed'};current=next;issued.set(receipt.id,receipt);return {ok:true,receipt:copy(receipt)};}catch{return {ok:false,code:'save-failed'};}finally{busy=false;}
  }
 };
}
