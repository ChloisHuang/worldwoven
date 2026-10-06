import {CLINIC_CARE_PLANS} from './china-clinic-physician-work.js';
// Patient feedback is evidence from the existing numbered, delivered order.
// Only actionable time owned by this particular worker is measured. The shared
// simulation clock survives reloads; NPC travel and old queue time are excluded.
export const CLINIC_REVIEW_ROLES=Object.freeze({
 physician:{id:'cn-clinic-physician',source:'cn-clinic-physician-labor',limit:90},
 assistant:{id:'cn-pharmacy-apprentice',source:'cn-pharmacy-labor',limit:180},
});
const patients=new Set(['cn-tavern-diner-west','cn-tavern-diner-east']);
const finite=n=>Number.isFinite(n)&&n>=0;
export const clinicReviewRole=id=>Object.values(CLINIC_REVIEW_ROLES).find(role=>role.id===id);
export function clinicTiming(receiptId){return {receiptId,seconds:0,startedAt:null};}
export function validClinicTiming(value){
 return value===undefined||value?.version===1&&['physician','assistant'].every(key=>value[key]===null||
  value[key]&&new RegExp('^'+CLINIC_REVIEW_ROLES[key].source+'-[1-9][0-9]*$').test(value[key].receiptId)&&
  finite(value[key].seconds)&&(value[key].startedAt===null||finite(value[key].startedAt)));
}
export function clinicResponsibleSeconds(timing,now){return timing.seconds+(timing.startedAt===null?0:Math.max(0,now-timing.startedAt));}
export function clinicPatientRating(seconds,role){return seconds===null?3:seconds<=role.limit?5:seconds<=role.limit*2?2:1;}
export function clinicPatientReview(order,kind,receiptId,now){
 const timing=order.serviceTiming?.[kind],role=CLINIC_REVIEW_ROLES[kind];
 const seconds=timing?.receiptId===receiptId?Math.round(clinicResponsibleSeconds(timing,now)*100)/100:null;
 const rating=clinicPatientRating(seconds,role),part=kind==='physician'?'问诊':'取药';
 return {version:1,evaluatorId:order.recipientId,rating,positive:rating>=3,responsibleSeconds:seconds,
  reason:seconds===null?'同号云纹包已收到':
   rating===5?(kind==='physician'?'问询细致，也没久等':'取药很顺利'):`${part}等得${rating===1?'太久':'有些久'}`};
}
export function validClinicPatientReceipt(receipt,role){
 const review=receipt?.review,n=receipt?.number;
 return !!role&&Number.isSafeInteger(n)&&n>0&&new RegExp('^'+role.source+'-[1-9][0-9]*$').test(receipt.receiptId)&&
  receipt.orderId===`cn-clinic-order-${n}`&&receipt.cardId===`cn-clinic-card-${n}`&&receipt.packetId===`cn-clinic-packet-${n}`&&
  patients.has(receipt.recipientId)&&typeof receipt.recipientName==='string'&&receipt.recipientName.length>0&&receipt.recipientName.length<=80&&
  review?.version===1&&review.evaluatorId===receipt.recipientId&&(review.responsibleSeconds===null||finite(review.responsibleSeconds))&&
  review.rating===clinicPatientRating(review.responsibleSeconds,role)&&review.positive===(review.rating>=3)&&
  typeof review.reason==='string'&&review.reason.length>0&&review.reason.length<=240&&
  (role.id!=='cn-clinic-physician'||receipt.careCorrect===true&&receipt.questioned===true&&CLINIC_CARE_PLANS.some(plan=>plan.id===receipt.carePlanId));
}
export function sameClinicPatientReceipt(a,b){return ['receiptId','orderId','number','cardId','packetId','recipientId','recipientName','carePlanId','careCorrect','questioned'].every(key=>a?.[key]===b?.[key])&&
 ['version','evaluatorId','rating','positive','responsibleSeconds','reason'].every(key=>a?.review?.[key]===b?.review?.[key]);}
export const clinicPaySummary=duty=>({clinicPayVersion:1,clinicRatingTotal:(duty.customerReviews||[]).reduce((sum,r)=>sum+r.clinicReceipt.review.rating,0),clinicReviewCount:duty.customerReviews?.length||0});
export function clinicRatedWage(role,hours,{clinicRatingTotal,clinicReviewCount}){
 const span=role.dutyWindow.endHour-role.dutyWindow.startHour,fraction=Math.min(1,hours/span);
 const multiplier=clinicReviewCount?1+(clinicRatingTotal/clinicReviewCount-3)*.1:1;
 return Math.floor((role.wage*fraction+(hours>=span-1e-9?(role.preparationBonus||0):0))*multiplier+1e-9);
}
