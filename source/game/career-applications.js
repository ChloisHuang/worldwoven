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
export function restoreApplications(value,roleMap,slotMap){
 if(value===undefined)return emptyApplications();
 if(!object(value)||!object(value.byRole)||!(value.lastRoleId===null||roleMap.has(value.lastRoleId))||
  (value.lastRoleId===null)!==(Object.keys(value.byRole).length===0)||value.lastRoleId!==null&&!Object.hasOwn(value.byRole,value.lastRoleId))throw Error('invalid-career-state');
 const reasons=new Set(['adult-required','ritual-required','writing-required','gardening-required','art-required','cooking-required','no-vacancy','already-employed','interview-rejected']);
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
