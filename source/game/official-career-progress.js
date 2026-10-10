import {PERSONNEL_RANK, PERSONNEL_FROM_RANK, PERSONNEL_REQUIREMENTS, personnelRequirements, isPersonnelRank, validPersonnelApplication, validPersonnelEvidence, validPersonnelContract, personnelEvidenceFields} from './official-personnel-policy.js';
import {getChinaRecordsCareerRank} from './china-official-ranks.js';

// Only witnessed clerk appointments and evaluated duties become service.
// Time away, study XP and the old cross-career growth counter never add days.
export const CLERK_ID='cn-court-clerk';
export const CLERK_ENTRY_RANK='cn-records-junior';
export const CLERK_NEXT_RANK='cn-records-regular';
export const CLERK_PROMOTION_REQUIREMENTS=Object.freeze({serviceDays:3,tenureDays:3,positiveBalance:3,ritual:2,writing:2});
const copy=x=>JSON.parse(JSON.stringify(x));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const time=x=>object(x)&&integer(x.day)&&Number.isFinite(x.hour)&&x.hour>=0&&x.hour<24;
const after=(a,b)=>a.day>b.day||a.day===b.day&&a.hour>=b.hour;
const tenureTime=t=>({day:t.sinceDay,hour:t.sinceHour});
export const officialTenureId=t=>t?.roleId===CLERK_ID?`official-tenure:${t.applicationId||`${t.roleId}:${t.sinceDay}:${t.sinceHour}`}`:null;
export const emptyOfficialCareer=()=>({version:1,appointments:[],service:[],applications:[]});
export const currentOfficialAppointment=(ledger,tenure)=>ledger.appointments.find(a=>a.id===officialTenureId(tenure)&&a.endedAt===null)||null;
export function officialRankId(ledger,tenure){
 const appointment=currentOfficialAppointment(ledger,tenure);if(!appointment)return null;
 let rank=CLERK_ENTRY_RANK;
 for(const application of ledger.applications)if(application.appointmentId===appointment.id&&application.status==='approved'&&application.fromRankId===rank)rank=application.toRankId;
 return rank;
}
export function recordOfficialAppointment(ledger,tenure){
 if(tenure?.roleId!==CLERK_ID||ledger.appointments.some(a=>a.id===officialTenureId(tenure)))return ledger;
 return {...ledger,appointments:[...ledger.appointments,{id:officialTenureId(tenure),tenure:copy(tenure),endedAt:null}]};
}
export function recordOfficialService(ledger,tenure,review,rankId=CLERK_ENTRY_RANK){
 const appointment=currentOfficialAppointment(ledger,tenure);
 if(!appointment||review.roleId!==CLERK_ID||ledger.service.some(r=>r.id===review.id))return ledger;
 return {...ledger,service:[...ledger.service,{id:review.id,appointmentId:appointment.id,day:review.day,rankId,
  positive:review.positive,score:review.score,wage:review.wage,reasonCode:review.reasonCode,...(review.officialPayVersion===2?{officialPayVersion:2,officialRankId:review.officialRankId,officialTenureId:review.officialTenureId,officialPayContract:copy(review.officialPayContract),...personnelEvidenceFields(review)}:{})}]};
}
export function closeOfficialAppointment(ledger,tenure,clock){
 const id=officialTenureId(tenure),at={day:clock.day,hour:clock.hour};
 return {...ledger,appointments:ledger.appointments.map(a=>a.id===id?{...a,endedAt:at}:a),
  applications:ledger.applications.map(a=>a.appointmentId===id&&a.status==='pending'?{...a,status:'cancelled',stage:'decided',code:'appointment-ended',decidedAt:at}:a)};
}
export function officialPromotionSummary(ledger,tenure,clock,skills,lastDuty,{enablePersonnelProgression=false,trial=null}={}){
 const appointment=currentOfficialAppointment(ledger,tenure),rankId=officialRankId(ledger,tenure),rank=getChinaRecordsCareerRank(rankId);
 const higher=enablePersonnelProgression&&isPersonnelRank(rankId)&&!!rank.nextRankId,personnel=enablePersonnelProgression&&rankId===PERSONNEL_FROM_RANK,department=personnel||higher,requirements=department?personnelRequirements(rank.nextRankId):CLERK_PROMOTION_REQUIREMENTS;
 const service=ledger.service.filter(r=>r.appointmentId===appointment?.id&&r.rankId===rankId),qualified=service.filter(r=>r.positive&&r.reasonCode==='court-and-archive-completed'),balance=service.reduce((sum,r)=>sum+r.score,0);
 const rankStart=department?ledger.applications.find(a=>a.appointmentId===appointment?.id&&a.toRankId===rankId&&a.status==='approved')?.decidedAt.day:tenure?.sinceDay;
 const tenureDays=appointment&&clock&&rankStart!==undefined?Math.max(0,clock.day-rankStart+1):0;
 const qualifiedDayIds=[...new Set(qualified.map(row=>row.day))].sort((a,b)=>a-b);
 const applications=ledger.applications.filter(a=>a.appointmentId===appointment?.id),application=applications.at(-1)||null,reasons=[];
 if(!appointment)reasons.push('not-employed');
 else if(rankId!==CLERK_ENTRY_RANK&&!department)reasons.push('promotion-route-complete');
 else{
  if(qualifiedDayIds.length<requirements.serviceDays)reasons.push('service-days-required');
  if(tenureDays<requirements.tenureDays)reasons.push('tenure-days-required');
  if(balance<requirements.positiveBalance)reasons.push('service-performance-required');
  if((skills?.ritual||0)<requirements.ritual)reasons.push('ritual-required');
  if((skills?.writing||0)<requirements.writing)reasons.push('writing-required');
  if(personnel&&!trial)reasons.push('personnel-trial-required');
  if(lastDuty&&['arrived','attending','archive','working','inspection','ready'].includes(lastDuty.stage))reasons.push('promotion-duty-unsettled');
 }
 return {rankId,rank,routeId:department?rank.nextRankId:rankId===CLERK_ENTRY_RANK?CLERK_NEXT_RANK:null,requirements:{...requirements},qualifiedDays:qualifiedDayIds.length,qualifiedDayIds,serviceIds:service.map(r=>r.id),tenureDays,balance,
  lifetimeQualifiedDays:ledger.service.filter(r=>r.positive&&r.reasonCode==='court-and-archive-completed').length,
  application:application?copy(application):null,history:copy(applications),eligible:reasons.length===0,reasons};
}
export function restoreOfficialCareer(value,{tenure,lastDuty,lastEvaluation}={}){
 if(value===undefined){
  let ledger=recordOfficialAppointment(emptyOfficialCareer(),tenure);
  // The latest real old receipt is evidence; old performance is not a counter.
  if(tenure?.roleId===CLERK_ID&&lastDuty?.roleId===CLERK_ID&&lastEvaluation?.roleId===CLERK_ID&&lastEvaluation.day===lastDuty.day&&
   (lastDuty.day>tenure.sinceDay||lastDuty.day===tenure.sinceDay&&(lastDuty.arrivalHour??24)>=tenure.sinceHour))ledger=recordOfficialService(ledger,tenure,lastEvaluation);
  return ledger;
 }
 const fail=()=>{throw Error('invalid-career-state');};
 if(!object(value)||value.version!==1||!['appointments','service','applications'].every(k=>Array.isArray(value[k])))fail();
 const appointments=new Map(),seenService=new Set(),seenApplications=new Set();
 for(const a of value.appointments){
  const t=a?.tenure;
  if(!object(a)||!object(t)||t.roleId!==CLERK_ID||t.slotId!=='cn-court-clerk-1'||!time(tenureTime(t))||a.id!==officialTenureId(t)||appointments.has(a.id)||
    !(a.endedAt===null||time(a.endedAt)&&after(a.endedAt,tenureTime(t))))fail();
  appointments.set(a.id,a);
 }
 const active=[...appointments.values()].filter(a=>a.endedAt===null);
 if(tenure?.roleId===CLERK_ID?(active.length!==1||active[0].id!==officialTenureId(tenure)):active.length!==0)fail();
 for(const r of value.service){
  const a=appointments.get(r?.appointmentId),rank=getChinaRecordsCareerRank(r?.rankId);
  if(!object(r)||!a||!integer(r.day)||r.day<a.tenure.sinceDay||a.endedAt&&r.day>a.endedAt.day||!rank||
   r.id!==`career-review:cn-court-clerk-1:${r.day}`||seenService.has(r.id)||typeof r.positive!=='boolean'||r.score!==(r.positive?1:-1)||
   (r.positive?r.reasonCode!=='court-and-archive-completed'||![rank.basePay,rank.basePay+2].includes(r.wage):r.wage!==0)||
   typeof r.reasonCode!=='string'||r.reasonCode.length>80)fail();
  seenService.add(r.id);
 }
 for(const r of value.applications){
  const a=appointments.get(r?.appointmentId),pending=r?.status==='pending',approved=r?.status==='approved';
  if([2,3].includes(r?.routeVersion)){
   if(!a||seenApplications.has(r.id)||!validPersonnelApplication(r,a,value.service))fail();
   seenApplications.add(r.id);continue;
  }
  if(!object(r)||!a||!time(r)||!after(r,tenureTime(a.tenure))||r.id!==`official-promotion:${CLERK_ID}:${r.day}`||seenApplications.has(r.id)||
   r.fromRankId!==CLERK_ENTRY_RANK||r.toRankId!==CLERK_NEXT_RANK||!['pending','approved','rejected','cancelled'].includes(r.status)||
   !Number.isFinite(r.roll)||r.roll<0||r.roll>=1||!object(r.checked)||!['qualifiedDays','tenureDays','balance'].every(k=>Number.isInteger(r.checked[k]))||
   r.checked.qualifiedDays<3||r.checked.tenureDays<3||r.checked.balance<3||
   (pending?!['submitted','document-ready','document-held'].includes(r.stage)||r.code!==r.stage||r.decidedAt!==null||a.endedAt!==null:r.stage!=='decided'||!time(r.decidedAt)||!after(r.decidedAt,r))||
   (approved?r.code!=='approved':r.status==='rejected'?!['promotion-review-rejected','promotion-eligibility-changed'].includes(r.code):r.status==='cancelled'?!['withdrawn','appointment-ended'].includes(r.code):false))fail();
  if(r.review!==null){if(!object(r.review)||!time(r.reviewedAt)||!after(r.reviewedAt,r)||!Number.isFinite(r.review.chance)||r.review.chance<.4||r.review.chance>.94||
   r.review.roll!==r.roll||r.review.passed!==(r.roll<r.review.chance)||(approved||pending&&!['submitted'].includes(r.stage))&&!r.review.passed||r.code==='promotion-review-rejected'&&r.review.passed)fail();}
  else if(r.reviewedAt!==null||approved||pending&&r.stage!=='submitted'||r.code==='promotion-review-rejected')fail();
  if(r.appointment!==null){if(!object(r.appointment)||r.appointment.id!==`appointment:${r.id}`||typeof r.appointment.text!=='string'||r.appointment.text.length>300||!r.review?.passed)fail();}
  else if(approved||pending&&r.stage!=='submitted')fail();
  if(value.service.filter(s=>s.appointmentId===a.id&&s.rankId===CLERK_ENTRY_RANK&&s.positive&&s.day<=r.day).length<r.checked.qualifiedDays)fail();
  seenApplications.add(r.id);
 }
 for(const a of appointments.values()){
  let rank=CLERK_ENTRY_RANK,lastDecision=tenureTime(a.tenure),lastApplied=null;
  const rows=value.applications.filter(r=>r.appointmentId===a.id);
  if(rows.filter(r=>r.status==='pending').length>1)fail();
  for(const r of rows){
   if(lastApplied&&!after(r,lastApplied)||r.fromRankId!==rank||!after(r,lastDecision))fail();
   if([2,3].includes(r.routeVersion)&&(r.trial.day<lastDecision.day||r.checked.tenureDays!==r.day-lastDecision.day+1||r.recommendation&&r.recommendation.checked.tenureDays!==r.recommendation.at.day-lastDecision.day+1))fail();
   lastApplied=r;
   if(r.status==='approved'){rank=r.toRankId;lastDecision=r.decidedAt;}
  }
 }
 for(const r of value.service){
  if(r.rankId!==CLERK_ENTRY_RANK&&!value.applications.some(a=>a.appointmentId===r.appointmentId&&a.status==='approved'&&a.toRankId===r.rankId&&a.decidedAt.day<=r.day))fail();
  if(isPersonnelRank(r.rankId)&&(!validPersonnelContract(r)||r.officialRankId!==r.rankId||r.officialTenureId!==r.appointmentId||!validPersonnelEvidence(r,r.positive)))fail();
 }
 return copy(value);
}
