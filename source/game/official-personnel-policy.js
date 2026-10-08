import {validateChinaPersonnelWorkCase} from './china-personnel-work.js';

export const PERSONNEL_RANK = 'cn-records-personnel';
export const PERSONNEL_FROM_RANK = 'cn-records-regular';
export const PERSONNEL_ROUTE = PERSONNEL_RANK;
export const PERSONNEL_REQUIREMENTS = Object.freeze({serviceDays:3,tenureDays:3,positiveBalance:3,ritual:2,writing:3});
export const PERSONNEL_ACTORS = Object.freeze({recommender:'cn-official-personnel',emperor:'cn-emperor'});
export const PERSONNEL_POINTS = Object.freeze({registration:Object.freeze([20.55,.215,32.25]),archive:Object.freeze([21.50,.215,32.25])});
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const integer = x => Number.isSafeInteger(x) && x >= 0;
const keys = (x,names) => object(x) && Object.keys(x).length === names.length && names.every(k=>Object.hasOwn(x,k));
const identifier = x => typeof x === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,255}$/.test(x);
const point = x => Array.isArray(x) && x.length === 3 && x.every(Number.isFinite);
const near = (a,b,r) => point(a)&&point(b)&&Math.hypot(a[0]-b[0],a[2]-b[2])<=r&&Math.abs(a[1]-b[1])<=.3;
export const personnelSame = (a,b) => JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function canonical(x){return Array.isArray(x)?x.map(canonical):object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;}
export const personnelTime = x => object(x)&&integer(x.day)&&Number.isFinite(x.hour)&&x.hour>=0&&x.hour<24;
export const personnelAfter = (a,b) => a.day>b.day||a.day===b.day&&a.hour>=b.hour;
export const personnelApplicationId = day => `official-promotion:cn-court-clerk:personnel:${day}`;
export function personnelChance(checked){
 const chance=.70+Math.min(.20,Math.max(0,checked.qualifiedDays-3)*.04)+Math.min(.04,Math.max(0,checked.ritual-2+checked.writing-3)*.01)-Math.min(.30,Math.max(0,checked.qualifiedDays-checked.balance)*.05);
 return Math.max(.4,Math.min(.94,Math.round(chance*10000)/10000));
}
export function personnelChecked(summary,skills){return {qualifiedDays:summary.qualifiedDays,tenureDays:summary.tenureDays,balance:summary.balance,ritual:skills.ritual,writing:skills.writing,qualifiedDayIds:[...summary.qualifiedDayIds]};}
function validChecked(x){return keys(x,['qualifiedDays','tenureDays','balance','ritual','writing','qualifiedDayIds'])&&['qualifiedDays','tenureDays','balance','ritual','writing'].every(k=>integer(x[k]))&&x.qualifiedDays>=3&&x.tenureDays>=3&&x.balance>=3&&x.ritual>=2&&x.writing>=3&&x.ritual+x.writing<=100&&Array.isArray(x.qualifiedDayIds)&&x.qualifiedDayIds.length===x.qualifiedDays&&x.qualifiedDayIds.every(integer)&&x.qualifiedDayIds.every((day,i)=>!i||day>x.qualifiedDayIds[i-1]);}
export function personnelContract(tenureId){return {version:2,rankId:PERSONNEL_RANK,gradeId:'cn-grade-8-junior',basePay:26,preparationBonus:2,requiredRosterPolicy:'cn-personnel-roster-v1',officialTenureId:tenureId};}
export const validPersonnelContract = row => row?.officialPayVersion===2&&row.officialRankId===PERSONNEL_RANK&&identifier(row.officialTenureId)&&personnelSame(row.officialPayContract,personnelContract(row.officialTenureId));
export function validPersonnelProof(receipt,step,proof,clock){
 const actorStep=step==='interview'||step==='imperial-review',duration=step==='interview'||step==='imperial-review'?4:step==='appointment'?3:0;
 const names=['applicationId','documentId','actorId','targetId','position','standing','clear','elapsed','duration','day','completedAt'];
 if(actorStep)names.push('recipientPosition','recipientBodyId','recipientAlive');
 const target=step==='interview'?PERSONNEL_ACTORS.recommender:step==='imperial-review'?PERSONNEL_ACTORS.emperor:'cn-court-career-desk';
 if(!keys(proof,names)||proof.applicationId!==receipt.id||proof.documentId!==`appointment:${receipt.id}`||proof.actorId!=='player'||proof.targetId!==target||proof.standing!==true||proof.clear!==true||proof.duration!==duration||!Number.isFinite(proof.elapsed)||proof.elapsed+1e-8<duration||!integer(proof.day)||proof.day<receipt.day||!Number.isFinite(proof.completedAt)||proof.completedAt<0||clock&&(proof.day!==clock.day||proof.completedAt>clock.seconds+1e-7))return false;
 if(step==='imperial-review'&&(!near(proof.position,[-15.1,.145,-14.45],.3)||!near(proof.recipientPosition,[-15.1,.215,-13.35],.3)))return false;
 if(actorStep)return proof.recipientAlive===true&&proof.recipientBodyId===receipt.actors[step==='interview'?'recommenderBodyId':'emperorBodyId']&&near(proof.position,proof.recipientPosition,2);
 return near(proof.position,step==='appointment'?PERSONNEL_POINTS.registration:PERSONNEL_POINTS.archive,.3);
}
export function validPersonnelArchiveProof(proof,row,clock){
 return keys(proof,['actorId','targetId','position','standing','clear','elapsed','duration'])&&proof.actorId==='player'&&proof.targetId==='cn-court-career-desk'&&proof.standing===true&&proof.clear===true&&proof.duration===8&&Number.isFinite(proof.elapsed)&&proof.elapsed+1e-8>=8&&near(proof.position,PERSONNEL_POINTS.archive,.3);
}
export function validPersonnelDeferral(row){
 const d=row.personnelDeferral;
 return d===null||keys(d,['version','caseId','job','reviewerBodyId','requestedAt'])&&d.version===1&&identifier(d.reviewerBodyId)&&d.caseId===d.job?.id&&personnelTime(d.requestedAt)&&d.requestedAt.day===row.day&&validateChinaPersonnelWorkCase(d.job,{mode:'duty',officialTenureId:row.officialTenureId,day:row.day,status:'draft'})&&d.job.compiled!==null;
}
export function personnelDeferralMatches(row,job){
 const d=row.personnelDeferral;
 return !d||(job.status!=='signed'||job.receipt?.signerBodyId===d.reviewerBodyId)&&job.id===d.caseId&&job.revision>=d.job.revision&&personnelSame(job.source,d.job.source)&&personnelSame(job.rows.map(r=>r.visit),d.job.rows.map(r=>r.visit));
}
export function validPersonnelEvidence(row,completed){
 if(row?.officialPayVersion!==2)return row?.personnelWork===undefined&&row?.personnelArchiveProof===undefined&&row?.personnelDeferral===undefined;
 if(!validPersonnelDeferral(row))return false;
 if(!completed)return row.personnelWork===null&&row.personnelArchiveProof===null;
 return validateChinaPersonnelWorkCase(row.personnelWork,{mode:'duty',officialTenureId:row.officialTenureId,day:row.day})&&validPersonnelArchiveProof(row.personnelArchiveProof,row)&&personnelDeferralMatches(row,row.personnelWork);
}
export const personnelEvidenceFields = row => row?.officialPayVersion===2?{personnelWork:structuredClone(row.personnelWork),personnelArchiveProof:structuredClone(row.personnelArchiveProof),personnelDeferral:structuredClone(row.personnelDeferral)}:{};
export function validPersonnelApplication(r,appointment,service){
 if(!keys(r,['routeVersion','id','appointmentId','fromRankId','toRankId','day','hour','status','stage','code','roll','checked','trial','actors','recommendation','received','imperialDecision','declaration','reviewedAt','decidedAt','appointment'])||r.routeVersion!==2||r.id!==personnelApplicationId(r.day)||r.fromRankId!==PERSONNEL_FROM_RANK||r.toRankId!==PERSONNEL_RANK||!personnelTime(r)||!personnelAfter(r,{day:appointment.tenure.sinceDay,hour:appointment.tenure.sinceHour})||!Number.isFinite(r.roll)||r.roll<0||r.roll>=1||!validChecked(r.checked)||!keys(r.actors,['recommenderBodyId','emperorBodyId'])||!identifier(r.actors.recommenderBodyId)||!(r.actors.emperorBodyId===null||identifier(r.actors.emperorBodyId))||!validateChinaPersonnelWorkCase(r.trial,{mode:'trial',officialTenureId:r.appointmentId})||r.trial.day>r.day||r.trial.receipt.signerBodyId!==r.actors.recommenderBodyId)return false;
 const relevant=service.filter(s=>s.appointmentId===r.appointmentId&&s.rankId===PERSONNEL_FROM_RANK&&s.day<=r.day),days=[...new Set(relevant.filter(s=>s.positive&&s.reasonCode==='court-and-archive-completed').map(s=>s.day))].sort((a,b)=>a-b);
 if(!personnelSame(days,r.checked.qualifiedDayIds)||relevant.reduce((n,s)=>n+s.score,0)!==r.checked.balance)return false;
 if(r.recommendation){const evidence=service.filter(s=>s.appointmentId===r.appointmentId&&s.rankId===PERSONNEL_FROM_RANK&&s.day<=r.recommendation.at?.day),qualified=[...new Set(evidence.filter(s=>s.positive&&s.reasonCode==='court-and-archive-completed').map(s=>s.day))].sort((a,b)=>a-b);
  if(!personnelSame(qualified,r.recommendation.checked?.qualifiedDayIds)||evidence.reduce((n,s)=>n+s.score,0)!==r.recommendation.checked?.balance)return false;
 }
 const pending=r.status==='pending',approved=r.status==='approved';
 if(!['pending','approved','rejected','cancelled'].includes(r.status)||pending&&(appointment.endedAt!==null||!['submitted','document-ready','document-held','imperial-approved'].includes(r.stage)||r.code!==r.stage||r.decidedAt!==null)||!pending&&(r.stage!=='decided'||!personnelTime(r.decidedAt)||!personnelAfter(r.decidedAt,r))||approved&&r.code!=='approved'||r.status==='rejected'&&!['promotion-review-rejected','promotion-eligibility-changed'].includes(r.code)||r.status==='cancelled'&&!['withdrawn','appointment-ended','promotion-identity-changed'].includes(r.code))return false;
 if(r.recommendation!==null){const rec=r.recommendation;if(!identifier(r.actors.emperorBodyId)||!keys(rec,['chance','checked','proof','at'])||!validChecked(rec.checked)||rec.chance!==personnelChance(rec.checked)||!validPersonnelProof(r,'interview',rec.proof)||!personnelTime(rec.at)||!personnelAfter(rec.at,r)||rec.proof.day!==rec.at.day||!personnelSame(r.reviewedAt,rec.at)||!keys(r.appointment,['id','text'])||r.appointment.id!==`appointment:${r.id}`||typeof r.appointment.text!=='string'||r.appointment.text.length>300)return false;}
 else if(r.actors.emperorBodyId!==null||r.reviewedAt!==null||r.appointment!==null||r.received!==null||r.imperialDecision!==null||r.declaration!==null||pending&&r.stage!=='submitted'||approved)return false;
 if(r.received!==null){if(!r.recommendation||!keys(r.received,['proof','at'])||!validPersonnelProof(r,'receive-document',r.received.proof)||!personnelTime(r.received.at)||!personnelAfter(r.received.at,r.recommendation.at)||r.received.proof.day!==r.received.at.day)return false;}
 if(r.imperialDecision!==null){const d=r.imperialDecision;if(!r.received||!keys(d,['chance','roll','passed','proof','at'])||d.chance!==r.recommendation.chance||d.roll!==r.roll||d.passed!==(r.roll<d.chance)||!validPersonnelProof(r,'imperial-review',d.proof)||!personnelTime(d.at)||!personnelAfter(d.at,r.received.at)||d.proof.day!==d.at.day||!d.passed&&(r.status!=='rejected'||r.code!=='promotion-review-rejected'||!personnelSame(r.decidedAt,d.at)))return false;}
 if(r.declaration!==null){if(!r.imperialDecision?.passed||!keys(r.declaration,['proof','at'])||!validPersonnelProof(r,'appointment',r.declaration.proof)||!personnelTime(r.declaration.at)||!personnelAfter(r.declaration.at,r.imperialDecision.at)||r.declaration.proof.day!==r.declaration.at.day||!approved||!personnelSame(r.decidedAt,r.declaration.at))return false;}
 if(pending&&(r.stage==='submitted'&&r.recommendation!==null||r.stage==='document-ready'&&(!r.recommendation||r.received!==null)||r.stage==='document-held'&&(!r.received||r.imperialDecision!==null)||r.stage==='imperial-approved'&&!r.imperialDecision?.passed)||approved&&!r.declaration||r.code==='promotion-review-rejected'&&r.imperialDecision?.passed!==false)return false;
 return true;
}
