// Hiring is one durable decision per role and simulation day. Only observed
// career progress and the host's existing recruiter profile affect the odds.
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const finite=(x,fallback=0)=>Number.isFinite(x)?x:fallback;
const round=x=>Math.round(x*10000)/10000;
export const emptyApplications=()=>({lastRoleId:null,byRole:{}});
export function careerInterviewRoll(worldSeed,roleId,day){
 let h=2166136261;
 for(const c of `career-interview-v1|${worldSeed>>>0}|${roleId}|${day}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
 h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
 return (h>>>0)/4294967296;
}
export function careerInterview({role,skills,performance,context={},worldSeed,day}){
 const traits=context.recruiterTraits||{},care=clamp(finite(traits.conscientiousness,finite(traits.quiet,.5)),0,1);
 const fitKeys=['cn-tavern-steward','cn-tavern-host'].includes(role.id)?['sociability']:role.id==='fr-garden-assistant'?['outdoors']:['quiet','curiosity'];
 const personality=fitKeys.map(key=>context.playerTraits?.[key]).filter(Number.isFinite);
 const fit=personality.length?personality.reduce((sum,n)=>sum+clamp(n,0,1),0)/personality.length:.5;
 const surplus=Object.entries(role.skillRequirements).reduce((sum,[key,minimum])=>sum+Math.max(0,skills[key]-minimum),0);
 const factors={personality:round((fit-.5)*.1),skills:round(Math.min(.24,surplus*.04)),performance:round(clamp(finite(performance)*.015,-.15,.15)),
  relationship:round(clamp(finite(context.relationship),-1,1)*.1),recruiter:round((.5-care)*.1)};
 const chance=round(clamp(.60+Object.values(factors).reduce((sum,n)=>sum+n,0),.2,.95)),roll=careerInterviewRoll(worldSeed,role.id,day);
 return {chance,roll,factors};
}
function restoreLegacyApplications(value,roleMap,slotMap){
 if(value===undefined)return emptyApplications();
 if(!object(value)||!object(value.byRole)||!(value.lastRoleId===null||roleMap.has(value.lastRoleId))||
  (value.lastRoleId===null)!==(Object.keys(value.byRole).length===0)||value.lastRoleId!==null&&!Object.hasOwn(value.byRole,value.lastRoleId))throw Error('invalid-career-state');
 const reasons=new Set(['adult-required','age-range-required','ritual-required','writing-required','gardening-required','art-required','cooking-required','martial-required','care-required','clinic-experience-required','tavern-chef-days-required','no-vacancy','already-employed','interview-rejected']);
 for(const [roleId,r]of Object.entries(value.byRole)){
  const role=roleMap.get(roleId);
  if(!role||!object(r)||r.roleId!==roleId||typeof r.ok!=='boolean'||!Number.isSafeInteger(r.day)||r.day<0||
   !Number.isFinite(r.hour)||r.hour<0||r.hour>=24||!object(r.checked)||
   !(r.checked.ageYears===null||Number.isFinite(r.checked.ageYears)&&r.checked.ageYears>=0)||!object(r.checked.skills)||
   Object.keys(r.checked.skills).length!==Object.keys(role.skillRequirements).length||Object.keys(role.skillRequirements).some(key=>!Number.isSafeInteger(r.checked.skills[key])||r.checked.skills[key]<0||r.checked.skills[key]>100)||
   !Array.isArray(r.reasons)||r.reasons.some(reason=>!reasons.has(reason))||new Set(r.reasons).size!==r.reasons.length||
   !['approved','ineligible','already-employed','interview-rejected'].includes(r.code)||r.ok!==(r.code==='approved')||
   (r.ok?r.reasons.length!==0:r.reasons.length===0))throw Error('invalid-career-state');
  if(r.interview!==null){
   const i=r.interview;
   if(!object(i)||!Number.isFinite(i.chance)||i.chance<.2||i.chance>.95||!Number.isFinite(i.roll)||i.roll<0||i.roll>=1||
    !object(i.factors)||Object.keys(i.factors).length!==5||['skills','performance','relationship','recruiter','personality'].some(key=>!Number.isFinite(i.factors[key])||Math.abs(i.factors[key])>.24)||
    !['approved','interview-rejected'].includes(r.code)||r.ok!==(i.roll<i.chance))throw Error('invalid-career-state');
  }else if(['approved','interview-rejected'].includes(r.code))throw Error('invalid-career-state');
  if(r.ok? !object(r.tenure)||r.tenure.roleId!==roleId||slotMap.get(r.tenure.slotId)?.roleId!==roleId||r.tenure.sinceDay!==r.day||r.tenure.sinceHour!==r.hour:r.tenure!==null)throw Error('invalid-career-state');
 }
 return JSON.parse(JSON.stringify(value));
}

// A submitted application reserves only a stable draw. The recruiter reads
// current skills, performance and relationships when the player meets them.
export const applicationId=(roleId,day)=>`career-application:${roleId}:${day}`;
const validTime=t=>object(t)&&Number.isSafeInteger(t.day)&&t.day>=0&&Number.isFinite(t.hour)&&t.hour>=0&&t.hour<24;
const after=(a,b)=>a.day>b.day||a.day===b.day&&a.hour>=b.hour;
export function restoreApplications(value,roleMap,slotMap){
 if(value===undefined)return emptyApplications();
 if(!object(value)||!object(value.byRole)||!(value.lastRoleId===null||roleMap.has(value.lastRoleId))||
  (value.lastRoleId===null)!==(Object.keys(value.byRole).length===0)||value.lastRoleId!==null&&!Object.hasOwn(value.byRole,value.lastRoleId))throw Error('invalid-career-state');
 const reasons=new Set(['adult-required','age-range-required','ritual-required','writing-required','gardening-required','art-required','cooking-required','martial-required','care-required','clinic-experience-required','tavern-chef-days-required','no-vacancy','already-employed','interview-rejected','withdrawn']);
 for(const[roleId,r]of Object.entries(value.byRole)){
  if(!r?.status){restoreLegacyApplications({lastRoleId:roleId,byRole:{[roleId]:r}},roleMap,slotMap);continue;}
  const role=roleMap.get(roleId),isPending=r.status==='pending',approved=r.status==='approved';
  if(!role||!object(r)||r.id!==applicationId(roleId,r.day)||r.roleId!==roleId||!validTime(r)||
   !['pending','approved','rejected','cancelled'].includes(r.status)||r.ok!==approved||
   !Number.isFinite(r.roll)||r.roll<0||r.roll>=1||!object(r.checked)||
   !(r.checked.ageYears===null||Number.isFinite(r.checked.ageYears)&&r.checked.ageYears>=0)||!object(r.checked.skills)||
   Object.keys(r.checked.skills).length!==Object.keys(role.skillRequirements).length||Object.keys(role.skillRequirements).some(key=>!Number.isSafeInteger(r.checked.skills[key])||r.checked.skills[key]<0||r.checked.skills[key]>100)||
   !Array.isArray(r.reasons)||r.reasons.some(reason=>!reasons.has(reason))||new Set(r.reasons).size!==r.reasons.length||
   (isPending||approved?r.reasons.length!==0:r.reasons.length===0)||
   (isPending?r.decidedAt!==null:!validTime(r.decidedAt)||!after(r.decidedAt,r)))throw Error('invalid-career-state');
  if(isPending){
   if(!['submitted','document-ready','document-held'].includes(r.stage)||r.code!==r.stage||
    (r.stage!=='submitted'&&roleId!=='cn-court-clerk')||r.tenure!==null)throw Error('invalid-career-state');
  }else if(r.stage!=='decided'||(approved?r.code!=='approved':r.status==='cancelled'?r.code!=='withdrawn':!['ineligible','already-employed','interview-rejected'].includes(r.code)))throw Error('invalid-career-state');
  if(r.interview!==null){
   const i=r.interview;
   if(isPending&&r.stage==='submitted'||!object(i)||!Number.isFinite(i.chance)||i.chance<.2||i.chance>.95||i.roll!==r.roll||
    !object(i.factors)||Object.keys(i.factors).length!==5||['skills','performance','relationship','recruiter','personality'].some(key=>!Number.isFinite(i.factors[key])||Math.abs(i.factors[key])>.24)||
    !validTime(r.reviewedAt)||!after(r.reviewedAt,r)||r.decidedAt&&!after(r.decidedAt,r.reviewedAt)||
    (approved||isPending?i.roll>=i.chance:r.code==='interview-rejected'&&i.roll<i.chance))throw Error('invalid-career-state');
  }else if(approved||r.code==='interview-rejected'||isPending&&r.stage!=='submitted'||r.reviewedAt!==null)throw Error('invalid-career-state');
  if(approved? !object(r.tenure)||r.tenure.roleId!==roleId||slotMap.get(r.tenure.slotId)?.roleId!==roleId||r.tenure.sinceDay!==r.decidedAt.day||r.tenure.sinceHour!==r.decidedAt.hour||r.tenure.applicationId!==undefined&&r.tenure.applicationId!==r.id:r.tenure!==null)throw Error('invalid-career-state');
  if(r.appointment!==null){
   if(roleId!=='cn-court-clerk'||!object(r.appointment)||r.appointment.id!==`appointment:${r.id}`||typeof r.appointment.text!=='string'||r.appointment.text.length<1||r.appointment.text.length>300||
    !r.interview||r.interview.roll>=r.interview.chance)throw Error('invalid-career-state');
  }else if(isPending&&r.stage!=='submitted'||approved&&roleId==='cn-court-clerk')throw Error('invalid-career-state');
 }
 if(value.history!==undefined){
  if(!Array.isArray(value.history))throw Error('invalid-career-state');const seen=new Set();
  for(const r of value.history){
   if(!r?.ok||r.code!=='approved')throw Error('invalid-career-state');
   const key=r.id||`${r.roleId}:${r.tenure?.sinceDay}:${r.tenure?.sinceHour}`;if(seen.has(key))throw Error('invalid-career-state');seen.add(key);
   restoreApplications({lastRoleId:r.roleId,byRole:{[r.roleId]:r}},roleMap,slotMap);
  }
 }
 return JSON.parse(JSON.stringify(value));
}
