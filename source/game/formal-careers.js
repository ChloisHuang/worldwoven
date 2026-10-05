import {GAME_MINUTES_PER_SECOND} from './simulation-clock.js';
import {emptyApplications, restoreApplications, careerInterview, careerInterviewRoll, applicationId, pendingApplication} from './career-applications.js';
import {STUDY_SOURCES, studyLesson, savedStudyLesson, defaultStudyLesson} from './study-lessons.js';
import {STUDY_XP, skillXPRequired, addSkillXP} from './skill-progress.js';
// Finite vacancies and one rotating player seat alongside each real incumbent.
export const COURT_CLERK_ROLE = Object.freeze({
  id: 'cn-court-clerk', name: '礼务录事', rank: 9, slotId: 'cn-court-clerk-1', country: 'china', currency: 'copper', employer: '沈叙', workplace: '承务官署',
  wage: 18, minimumAgeYears: 18,
  skillRequirements: Object.freeze({ritual: 2, writing: 2}),
  dutyWindow: Object.freeze({startHour: 6, endHour: 11.5}),
});
export const COURT_SUPERVISOR = Object.freeze({id: 'cn-official-rites', conscientiousness: .85,
  earlyArrivalMinutes: 5, preparationBonus: 2});
export const TAVERN_STEWARD_ROLE = Object.freeze({id:'cn-tavern-steward',name:'酒楼常任服务助理',
  slotId:'cn-tavern-steward-1',country:'china',currency:'copper',employer:'许安',workplace:'云来酒楼',
  supervisorId:'cn-tavern-host',incumbentId:'cn-tavern-assistant',incumbentName:'陆青',vacancyKind:'exclusive',workSource:'cn-tavern-labor',wage:16,minimumAgeYears:18,
  skillRequirements:Object.freeze({ritual:2}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1});
// Unpublished host prototype is excluded from salaried vacancies: ownership purchase is required.
export const TAVERN_HOST_ROLE = Object.freeze({id:'cn-tavern-host',name:'酒楼掌柜（须购买经营权）',ownershipRequired:true,
  slotId:'cn-tavern-host-rotation-1',country:'china',currency:'copper',employer:'许安',workplace:'云来酒楼 · 掌柜登记案',
  supervisorId:'cn-tavern-host',incumbentId:'cn-tavern-host',incumbentName:'许安',vacancyKind:'rotation',workSource:'cn-tavern-host-labor',wage:24,minimumAgeYears:18,
  skillRequirements:Object.freeze({ritual:3,writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1,
  duties:'持续处理餐饮点单、餐费与住宿收款、招工登记；06:00–18:00当班，提前收工按实际工时计薪'});
export const TAVERN_CHEF_ROLE = Object.freeze({id:'cn-tavern-chef',name:'酒楼厨师',
  slotId:'cn-tavern-chef-rotation-1',country:'china',currency:'copper',employer:'许安',workplace:'云来酒楼 · 招工柜台',
  supervisorId:'cn-tavern-cook',incumbentId:'cn-tavern-cook',incumbentName:'沈禾',vacancyKind:'exclusive',workSource:'cn-tavern-chef-labor',wage:26,minimumAgeYears:18,
  skillRequirements:Object.freeze({cooking:2,ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1,
  duties:'持续按订单备料、烹制、核对并出菜；06:00–18:00当班，提前收工按实际工时计薪'});
export const GARDEN_ASSISTANT_ROLE = Object.freeze({id:'fr-garden-assistant',name:'西苑常任园艺助理',
  slotId:'fr-garden-assistant-1',country:'france',currency:'france',employer:'埃米尔',workplace:'西苑工具架登记簿',
  supervisorId:'france-gardener',workSource:'fr-garden-labor',wage:8,minimumAgeYears:18,
  skillRequirements:Object.freeze({gardening:2}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1});
export const FORMAL_CAREER_ROLES = Object.freeze([COURT_CLERK_ROLE,TAVERN_STEWARD_ROLE,GARDEN_ASSISTANT_ROLE,TAVERN_CHEF_ROLE]);
export const FORMAL_CAREER_SLOTS = Object.freeze([
  ...FORMAL_CAREER_ROLES.map(role => Object.freeze({id:role.slotId,roleId:role.id,holderId:role.incumbentId||null,...(role.vacancyKind==='rotation'?{rotation:true}:role.vacancyKind==='exclusive'?{replacement:true}:{})})),
]);
const SKILLS = Object.freeze(['ritual', 'writing', 'gardening', 'art', 'cooking']);
const emptyStudy = () => ({issued: 0, completed: 0, issuedDay: null, lessonId: null});
const WORK = Object.freeze({'cn-tavern-labor':'ritual','fr-garden-labor':'gardening'});
const STAGES = new Set(['arrived', 'attending', 'archive', 'ready', 'missed', 'paid', 'working', 'inspection']);
const copy = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const dayOrNull = value => value === null || integer(value);
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const own = (value, key) => Object.hasOwn(value, key);
const excused = duty => duty?.stage === 'missed' && duty.reason === 'court-postponed';
const supervisor = role => role.supervisorId || COURT_SUPERVISOR.id;
const completedWage = (role, arrivalHour) => role.workSource ? role.wage + (arrivalHour < role.earlyBeforeHour ? role.preparationBonus : 0) : role.wage + (COURT_SUPERVISOR.conscientiousness >= .8 &&
  arrivalHour <= role.dutyWindow.endHour - COURT_SUPERVISOR.earlyArrivalMinutes / 60 ? COURT_SUPERVISOR.preparationBonus : 0);
const empty = () => ({version: 5, revision: 0, skillXP: Object.fromEntries(SKILLS.map(skill=>[skill,0])), skills: {ritual: 0, writing: 0, gardening: 0, art: 0, cooking: 0}, tenure: null,
  lastDuty: null, lastPaidDay: null, daily: {day: null, ritual: 0, writing: 0, gardening: 0, art: 0, cooking: 0},
  learning: Object.fromEntries(STUDY_SOURCES.map(source => [source, emptyStudy()])),
  lowerWork: {'cn-tavern-labor': 0, 'fr-garden-labor': 0}, performance: 0, promotionProgress: 0,
  lastEvaluatedDay: null, lastEvaluation: null, applications: emptyApplications()});

const tavernRole = role => role?.workSource?.startsWith('cn-tavern-');
const availableSlot = (slot,role) => slot.holderId === null || slot.replacement === true && role.vacancyKind === 'exclusive' && slot.holderId === role.incumbentId || slot.rotation === true && role.vacancyKind === 'rotation' && slot.holderId === role.incumbentId;
const customerPenalty = duty => (duty?.customerReviews||[]).reduce((total,review)=>total-review.score,0);
const coveredHours = duty => (duty.coveredSeconds||0)*GAME_MINUTES_PER_SECOND/60;
const attendanceWage = (role,hours) => Math.floor(role.wage*Math.min(1,hours/(role.dutyWindow.endHour-role.dutyWindow.startHour))+1e-9)+(hours>=role.dutyWindow.endHour-role.dutyWindow.startHour-1e-9?(role.preparationBonus||0):0);
const dutyWage = (role,duty) => duty.shiftKind==='continuous'?Math.max(0,attendanceWage(role,coveredHours(duty))-customerPenalty(duty)):Math.max(1,completedWage(role,duty.arrivalHour)-customerPenalty(duty));
function validShift(duty,role){
 if(duty.shiftKind===undefined)return (!['cn-tavern-host','cn-tavern-chef'].includes(role.id)||duty.stage==='missed')&&!['startedSeconds','coveredSeconds','completedTasks','endedHour','endedSeconds'].some(key=>own(duty,key));
 if(duty.shiftKind!=='continuous'||!tavernRole(role)||!Number.isFinite(duty.startedSeconds)||duty.startedSeconds<0)return false;
 const done=['inspection','ready','paid'].includes(duty.stage),keys=['coveredSeconds','completedTasks','endedHour','endedSeconds'];
 if(!done)return keys.every(key=>duty[key]===null);
 const maxSeconds=(role.dutyWindow.endHour-duty.arrivalHour)*60/GAME_MINUTES_PER_SECOND;
 return Number.isFinite(duty.coveredSeconds)&&duty.coveredSeconds>=0&&duty.coveredSeconds<=maxSeconds+1e-7&&
   integer(duty.completedTasks)&&Number.isFinite(duty.endedHour)&&duty.endedHour>=duty.arrivalHour&&duty.endedHour<24&&
   Number.isFinite(duty.endedSeconds)&&duty.endedSeconds>=duty.startedSeconds&&duty.coveredSeconds<=duty.endedSeconds-duty.startedSeconds+1e-7&&
   duty.coveredSeconds<=(Math.min(role.dutyWindow.endHour,duty.endedHour)-duty.arrivalHour)*60/GAME_MINUTES_PER_SECOND+1e-7;
}
const textField = (value,max=80) => typeof value==='string' && value.length>0 && value.length<=max;
function validCustomerReviewId(review,receiptId){
  const legacy=new RegExp('^'+receiptId+'-order-([1-9][0-9]*)-'+review.reasonCode+'$').exec(review.id);
  if(legacy)return integer(Number(legacy[1]));
  const world=review.reasonCode==='dirty-table'?/^cn-tavern-table-use-([1-9][0-9]*)-(west|east)-(0|[1-9][0-9]*)$/.exec(review.id):
    ['wrong-table','wrong-dish'].includes(review.reasonCode)?new RegExp('^cn-tavern-delivery-([1-9][0-9]*)-'+review.reasonCode+'$').exec(review.id):null;
  return !!world&&integer(Number(world[1]))&&(review.reasonCode!=='dirty-table'||integer(Number(world[3])));
}
function validCustomerReviews(duty,role){
  if(!tavernRole(role))return duty.customerReviews===undefined;
  if(!Array.isArray(duty.customerReviews)||duty.customerReviews.length>64)return false;
  const seen=new Map();
  for(const review of duty.customerReviews){
    if(!object(review)||!textField(review.id,200)||seen.has(review.id)||!identifier(review.customerId)||
      !textField(review.customerName)||!textField(review.tableId,64)||!textField(review.dishId,64)||
      !textField(review.tableName)||!textField(review.dishName)||!textField(review.reason,320))return false;
    const corrected=review.reasonCode==='corrected',original=seen.get(review.correctedReviewId);
    if(corrected ? !original||original.positive||review.id!==original.id+'-corrected'||review.score!==1||review.positive!==true||
      ['customerId','customerName'].some(key=>review[key]!==original[key]) :
      !['wrong-table','wrong-dish','dirty-table'].includes(review.reasonCode)||review.correctedReviewId!==null||review.score!==-2||review.positive!==false||
      !validCustomerReviewId(review,duty.workReceiptId))return false;
    seen.set(review.id,review);
  }
  return true;
}

function validWorkReceipt(source,receiptId){const m=typeof receiptId==='string'&&new RegExp('^'+source+'-([1-9][0-9]*)$').exec(receiptId);return !!m&&integer(Number(m[1]));}

function catalogue(roles, slots) {
  if (!Array.isArray(roles) || !roles.length || !Array.isArray(slots) || !slots.length) throw Error('invalid-career-catalogue');
  const roleMap = new Map(), slotMap = new Map();
  for (const role of roles) {
    if (!object(role) || !identifier(role.id) || roleMap.has(role.id) ||
      !integer(role.wage) || role.wage < 1 || !Number.isSafeInteger(role.wage + 2) || !integer(role.minimumAgeYears) ||
      !object(role.skillRequirements) || !Object.keys(role.skillRequirements).length ||
      Object.entries(role.skillRequirements).some(([key, value]) => !SKILLS.includes(key) || !integer(value) || value > 100) ||
      !object(role.dutyWindow) || !Number.isFinite(role.dutyWindow.startHour) ||
      !Number.isFinite(role.dutyWindow.endHour) || role.dutyWindow.startHour < 0 ||
      role.dutyWindow.endHour > 24 || role.dutyWindow.endHour <= role.dutyWindow.startHour) throw Error('invalid-career-catalogue');
    roleMap.set(role.id, copy(role));
  }
  for (const slot of slots) {
    if (!object(slot) || !identifier(slot.id) || slotMap.has(slot.id) || !roleMap.has(slot.roleId) ||
      !(slot.holderId === null || identifier(slot.holderId)) ||
      (slot.rotation!==undefined && (slot.rotation!==true || slot.holderId!==roleMap.get(slot.roleId).incumbentId || roleMap.get(slot.roleId).vacancyKind!=='rotation'))) throw Error('invalid-career-catalogue');
    slotMap.set(slot.id, copy(slot));
  }
  return {roleMap, slotMap};
}

function restore(saved, roleMap, slotMap) {
  if (saved == null) return empty();
  // Version 1 is the published clerk save. Add only the new practice skill and
  // receipt counter; preserve its tenure, duty, earned salary and study tickets.
  if (object(saved) && saved.version === 1 && object(saved.skills) && Object.keys(saved.skills).length === 2 &&
    object(saved.daily) && object(saved.lowerWork) && Object.keys(saved.lowerWork).length === 1) {
    saved = {...copy(saved), version:2,skills:{...saved.skills,gardening:0},
      daily:{...saved.daily,gardening:0},lowerWork:{...saved.lowerWork,'fr-garden-labor':0}};
  }
  // Published v2 saves retain all earned progress, employment and receipts.
  // Reject malformed old study rows before adding the selected lesson field.
  if (object(saved) && saved.version === 2 && object(saved.skills) && Object.keys(saved.skills).length === 3 &&
    object(saved.daily) && object(saved.learning) && Object.keys(saved.learning).length === 2 &&
    ['cn-rest','cn-calligraphy'].every(source => object(saved.learning[source]) && Object.keys(saved.learning[source]).length === 3)) {
    saved = {...copy(saved), version:3, skills:{...saved.skills,art:0}, daily:{...saved.daily,art:0},
      learning:Object.fromEntries(STUDY_SOURCES.map(source => [source, saved.learning[source] ?
        {...saved.learning[source],lessonId:saved.learning[source].issued?defaultStudyLesson(source).id:null}:emptyStudy()]))};
  }
  // Only the exact published four-skill v3 shape may gain a fresh cooking skill.
  // Existing salary validation below still rejects altered wages and old progress.
  if(object(saved)&&saved.version===3&&object(saved.skills)&&Object.keys(saved.skills).length===4&&
    ['ritual','writing','gardening','art'].every(key=>own(saved.skills,key))&&object(saved.daily)&&
    Object.keys(saved.daily).length===5&&!own(saved.daily,'cooking')&&
    ![saved.tenure,saved.lastDuty,saved.lastEvaluation].some(row=>row&&[TAVERN_HOST_ROLE.id,TAVERN_CHEF_ROLE.id].includes(row.roleId))&&
    !(saved.lastDuty&&['customerReviews','shiftKind','startedSeconds','coveredSeconds','completedTasks','endedHour','endedSeconds'].some(key=>own(saved.lastDuty,key)))&&
    !(saved.lastEvaluation&&['servicePenalty','coverageHours'].some(key=>own(saved.lastEvaluation,key)))&&
    !Object.values(saved.learning||{}).some(row=>row?.lessonId==='cooking-intro')){
    saved={...copy(saved),version:4,skills:{...saved.skills,cooking:0},daily:{...saved.daily,cooking:0},
      lastDuty:saved.lastDuty&&tavernRole(roleMap.get(saved.lastDuty.roleId))?{...saved.lastDuty,customerReviews:[]}:saved.lastDuty};
  }
  const validSlot = (roleId, slotId) => roleMap.has(roleId) && slotMap.get(slotId)?.roleId === roleId && availableSlot(slotMap.get(slotId),roleMap.get(roleId));
  if (!object(saved) || ![4,5].includes(saved.version) || !integer(saved.revision) || !object(saved.skills) ||
    Object.keys(saved.skills).length !== SKILLS.length || SKILLS.some(key => !integer(saved.skills[key])) ||
    SKILLS.some(key=>saved.skills[key]>100) || saved.skills.ritual + saved.skills.writing > 100 || !dayOrNull(saved.lastPaidDay) ||
    !object(saved.daily) || !dayOrNull(saved.daily.day) || SKILLS.some(key => !integer(saved.daily[key]) ||
      saved.daily[key] > 4 || saved.version===4 && saved.daily[key] > saved.skills[key]) ||
    (saved.daily.day === null && SKILLS.some(key => saved.daily[key] !== 0)) ||
    !object(saved.learning) || Object.keys(saved.learning).length !== STUDY_SOURCES.length ||
    !object(saved.lowerWork) || Object.keys(saved.lowerWork).length !== 2 || Object.keys(WORK).some(source=>!integer(saved.lowerWork[source])) ||
    !Number.isInteger(saved.performance) || Math.abs(saved.performance) > 100 ||
    !integer(saved.promotionProgress) || saved.promotionProgress > 100 || !dayOrNull(saved.lastEvaluatedDay)) throw Error('invalid-career-state');
  if(saved.version===5&&(!object(saved.skillXP)||Object.keys(saved.skillXP).length!==SKILLS.length||
    SKILLS.some(key=>!integer(saved.skillXP[key])||saved.skillXP[key]>=skillXPRequired(saved.skills[key])||saved.skills[key]===100&&saved.skillXP[key]!==0)))throw Error('invalid-career-state');
  for (const source of STUDY_SOURCES) {
    const study = saved.learning[source];
    if (!object(study) || Object.keys(study).length !== 4 || !integer(study.issued) || !integer(study.completed) || study.completed > study.issued ||
      !dayOrNull(study.issuedDay) || (study.issued === 0) !== (study.issuedDay === null) ||
      (study.issued === 0 ? study.lessonId !== null : !savedStudyLesson(source,study.lessonId))) throw Error('invalid-career-state');
  }
  if (saved.tenure !== null && (!object(saved.tenure) || !validSlot(saved.tenure.roleId, saved.tenure.slotId) ||
    !integer(saved.tenure.sinceDay) || !Number.isFinite(saved.tenure.sinceHour) ||
    saved.tenure.sinceHour < 0 || saved.tenure.sinceHour >= 24)) throw Error('invalid-career-state');
  const duty = saved.lastDuty;
  if (duty !== null && (!object(duty) || !validSlot(duty.roleId, duty.slotId) || !integer(duty.day) ||
    !STAGES.has(duty.stage) || typeof duty.started !== 'boolean' || !validShift(duty,roleMap.get(duty.roleId)) || !validCustomerReviews(duty,roleMap.get(duty.roleId)) ||
    !(duty.reason === null || typeof duty.reason === 'string' && duty.reason.length <= 80) ||
    !(duty.arrivalHour === null || Number.isFinite(duty.arrivalHour) &&
      duty.arrivalHour >= roleMap.get(duty.roleId).dutyWindow.startHour && duty.arrivalHour < roleMap.get(duty.roleId).dutyWindow.endHour) ||
    (duty.stage !== 'missed' && duty.arrivalHour === null) ||
    (duty.stage === 'arrived' && duty.started) ||
    (roleMap.get(duty.roleId).workSource ? !['working','inspection','ready','paid','missed'].includes(duty.stage) ||
      !(duty.workReceiptId === null && duty.stage === 'missed' || validWorkReceipt(roleMap.get(duty.roleId).workSource,duty.workReceiptId)) :
      ['working','inspection'].includes(duty.stage) || duty.workReceiptId != null) ||
    (['attending', 'archive', 'ready', 'paid', 'working', 'inspection'].includes(duty.stage) && !duty.started) ||
    (['arrived', 'attending', 'archive', 'ready', 'working', 'inspection'].includes(duty.stage) &&
      (!saved.tenure || duty.roleId !== saved.tenure.roleId || duty.slotId !== saved.tenure.slotId || duty.day < saved.tenure.sinceDay)) ||
    (['ready', 'paid'].includes(duty.stage) ? duty.wage !== dutyWage(roleMap.get(duty.roleId), duty) : duty.wage !== null) ||
    (duty.stage === 'paid' && saved.lastPaidDay !== duty.day) ||
    (saved.lastPaidDay !== null && (duty.day < saved.lastPaidDay || duty.day === saved.lastPaidDay && duty.stage !== 'paid')))) throw Error('invalid-career-state');
  if (saved.lastPaidDay !== null && duty === null) throw Error('invalid-career-state');
  const review = saved.lastEvaluation;
  if (review === null ? saved.lastEvaluatedDay !== null ||
      saved.performance !== (duty?.customerReviews||[]).reduce((total,r)=>Math.max(-100,Math.min(100,total+r.score)),0) ||
      saved.promotionProgress !== (duty?.customerReviews||[]).reduce((total,r)=>Math.max(0,Math.min(100,total+Math.min(0,r.score))),0) :
    !object(review) || !validSlot(review.roleId, review.slotId) || !integer(review.day) ||
    review.day !== saved.lastEvaluatedDay || review.id !== `career-review:${review.slotId}:${review.day}` ||
    review.evaluatorId !== supervisor(roleMap.get(review.roleId)) || typeof review.positive !== 'boolean' ||
    review.score !== (review.positive ? review.coverageHours===undefined||review.coverageHours>=12-1e-9?1:0 : -1) || typeof review.reason !== 'string' || review.reason.length > 80 ||
    typeof review.reasonCode !== 'string' || review.reasonCode.length > 80 ||
    (!integer(review.servicePenalty??0)|| (review.servicePenalty??0)>128 || (!tavernRole(roleMap.get(review.roleId))&&(review.servicePenalty??0)!==0)) ||
    (review.coverageHours!==undefined&&(!tavernRole(roleMap.get(review.roleId))||!Number.isFinite(review.coverageHours)||review.coverageHours<0||review.coverageHours>12+1e-9)) ||
    (review.positive ? review.coverageHours!==undefined?review.wage!==Math.max(0,attendanceWage(roleMap.get(review.roleId),review.coverageHours)-(review.servicePenalty??0)) : ![roleMap.get(review.roleId).wage,roleMap.get(review.roleId).wage+(roleMap.get(review.roleId).preparationBonus??2)].map(wage=>Math.max(1,wage-(review.servicePenalty??0))).includes(review.wage) : review.wage !== 0) ||
    !duty || review.day > duty.day || review.day === duty.day && (review.slotId !== duty.slotId ||
      (review.positive ? !['ready', 'paid'].includes(duty.stage) || duty.wage !== review.wage || (duty.shiftKind==='continuous'?review.coverageHours!==coveredHours(duty):review.coverageHours!==undefined) || (review.servicePenalty??0)!==customerPenalty(duty) : duty.stage !== 'missed'))) throw Error('invalid-career-state');
  if (duty && ['ready', 'paid'].includes(duty.stage) && (!review || review.day !== duty.day || !review.positive)) throw Error('invalid-career-state');
  return {version: 5, skillXP: saved.version===5?{...saved.skillXP}:Object.fromEntries(SKILLS.map(skill=>[skill,0])), revision: saved.revision, applications: restoreApplications(saved.applications, roleMap, slotMap), skills: {...saved.skills},
    tenure: saved.tenure === null ? null : {roleId: saved.tenure.roleId, slotId: saved.tenure.slotId,
      sinceDay: saved.tenure.sinceDay, sinceHour: saved.tenure.sinceHour},
    lastDuty: duty === null ? null : {roleId: duty.roleId, slotId: duty.slotId, day: duty.day, stage: duty.stage,
      started: duty.started, reason: duty.reason, arrivalHour: duty.arrivalHour, wage: duty.wage,...(roleMap.get(duty.roleId).workSource?{workReceiptId:duty.workReceiptId}: {}),...(tavernRole(roleMap.get(duty.roleId))?{customerReviews:copy(duty.customerReviews)}:{}),...(duty.shiftKind?{shiftKind:duty.shiftKind,startedSeconds:duty.startedSeconds,coveredSeconds:duty.coveredSeconds,completedTasks:duty.completedTasks,endedHour:duty.endedHour,endedSeconds:duty.endedSeconds}:{})},
    lastPaidDay: saved.lastPaidDay, daily: {...saved.daily},
    learning: Object.fromEntries(STUDY_SOURCES.map(source => [source, {...saved.learning[source]}])),
    lowerWork: {...saved.lowerWork}, performance: saved.performance,
    promotionProgress: saved.promotionProgress, lastEvaluatedDay: saved.lastEvaluatedDay,
    lastEvaluation: review === null ? null : {id: review.id, evaluatorId: review.evaluatorId, day: review.day,
      roleId: review.roleId, slotId: review.slotId, positive: review.positive, score: review.score,
      reason: review.reason, reasonCode: review.reasonCode, wage: review.wage,...(review.servicePenalty?{servicePenalty:review.servicePenalty}:{}),...(review.coverageHours!==undefined?{coverageHours:review.coverageHours}:{})}};
}

/**
 * saveState must atomically persist a detached snapshot before returning;
 * false/throw/Promise rejects. Clock and witnessed events come from the host.
 * Allocate a study ticket at actual study start, then submit observed active
 * seconds. Only the newest ticket per source can complete, on its original day.
 * completedLowerWork is a trusted callback at the labor module's verified ready
 * boundary, before its receipt clears. Acceptance/cancellation must not call it.
 * creditWageToBank({amount,receiptId,currency,roleId,slotId,day}) must atomically
 * credit bank copper with durable receipt dedupe and return synchronously.
 * Missing bank credit support locks settlement only; cash is never a fallback.
 * No passive simulation or wages. Failed paid-state cleanup keeps ready intact.
 */
export function createFormalCareers({saved, worldDuty=null, saveState, creditWageToBank, getClock, worldSeed=1, getHiringContext=()=>({}),
  roles = FORMAL_CAREER_ROLES, slots = FORMAL_CAREER_SLOTS} = {}) {
  if (typeof saveState !== 'function' || typeof getClock !== 'function') {
    throw new TypeError('formal careers require synchronous saveState and getClock');
  }
  let current = empty(), loadError = null, lastError = null, saving = false, paying = false, lastClock = null;
  let observedDay = null, interruptedUnsaved = false, lastApplication = null;
  const activeStudies = new Map();
  let roleMap = new Map(), slotMap = new Map();
  try { ({roleMap, slotMap} = catalogue(roles, slots)); current = restore(saved, roleMap, slotMap); }
  catch (error) { loadError = error.message === 'invalid-career-catalogue' ? error.message : 'invalid-career-state'; }
  try { const clock = getClock(); if (integer(clock?.day)) observedDay = clock.day; } catch { /* checked at mutation */ }
  const state = () => ({...copy(current), loadError, lastError});
  const failure = (code, reasons = [code]) => { lastError = code; return {ok: false, code, reasons: [...reasons]}; };
  function readClock() {
    let clock;
    try { clock = getClock(); } catch { return null; }
    if (!object(clock) || !integer(clock.day) || !Number.isFinite(clock.hour) || clock.hour < 0 || clock.hour >= 24 ||
      !Number.isFinite(clock.seconds) || clock.seconds < 0) return null;
    const days = [current.lastDuty?.day, current.tenure?.sinceDay, current.lastPaidDay, current.daily.day, current.lastEvaluatedDay,
      ...Object.values(current.learning).map(study => study.issuedDay), ...Object.values(current.applications.byRole).flatMap(result=>[result.day,result.reviewedAt?.day,result.decidedAt?.day])].filter(day => day != null);
    if (days.some(day => day > clock.day) || lastClock &&
      (clock.day < lastClock.day || clock.day === lastClock.day && clock.hour < lastClock.hour)) return null;
    return clock;
  }
  function now(){const clock=readClock();if(clock)lastClock={...clock};return clock;}
  function allowed() {
    return loadError || saving || paying ? failure(loadError || 'career-busy') : null;
  }
  function persist(next) {
    if (!Number.isSafeInteger(current.revision + 1)) return failure('revision-limit');
    next = {...next, revision: current.revision + 1}; saving = true;
    try {
      const result = saveState(copy(next));
      if (result === false) return failure('save-failed');
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch(() => {}); return failure('async-save-unsupported');
      }
      current = next; lastError = null; return {ok: true};
    } catch { return failure('save-failed'); }
    finally { saving = false; }
  }
  function evaluate(next, positive, reason) {
    const duty = next.lastDuty;
    if (next.lastEvaluatedDay !== null && next.lastEvaluatedDay >= duty.day) return next;
    const role=roleMap.get(duty.roleId),hours=duty.shiftKind==='continuous'?coveredHours(duty):null,score=positive?(hours===null||hours>=12-1e-9?1:0):-1;
    // The conscientious supervisor rewards completing both actual duties and
    // gives a small preparation bonus for arrival at least five minutes early.
    const servicePenalty=customerPenalty(duty),wage = positive ? dutyWage(role,duty) : 0;
    const reasonText = hours!==null&&positive?`当面交班已验收；实际当班${hours.toFixed(2)}小时，按工时计薪${wage}铜文`:role.workSource ? positive ? `${role.employer}已验收完整当班职责${wage>role.wage?'；午前开班，勤勉奖励+1':''}` : '当班职责未完成，没有日薪' : positive ? wage > role.wage ? '提前到岗，朝会记录与归档均已完成' : '按时到岗，朝会记录与归档均已完成' :
      ({absent: '未按时到岗，缺席当日朝会', reloaded: '朝会中途离开，出勤记录未完成',
        resigned: '当日职责未完成即离任', 'day-ended': '当日朝会或归档未完成'})[reason] || '出勤中断，当日职责未完成';
    return {...next, performance: Math.max(-100, Math.min(100, next.performance + score)),
      promotionProgress: Math.max(0, Math.min(100, next.promotionProgress + score)), lastEvaluatedDay: duty.day,
      lastDuty: {...duty, wage: positive ? wage : null}, lastEvaluation: {
        id: `career-review:${duty.slotId}:${duty.day}`, evaluatorId: supervisor(role),
        day: duty.day, roleId: duty.roleId, slotId: duty.slotId, positive, score, reason: reasonText+(servicePenalty?`；顾客评价扣薪${Math.min(hours===null?completedWage(role,duty.arrivalHour)-1:attendanceWage(role,hours),servicePenalty)}铜文`:''), reasonCode: reason, wage,...(servicePenalty?{servicePenalty}:{}),...(positive&&hours!==null?{coverageHours:hours}:{})}};
  }
  function missed(next, reason) {
    next = {...next, lastDuty: {...next.lastDuty, stage: 'missed', reason, wage: null}};
    // The court's own cancellation is not a player absence. Keep its terminal
    // receipt without manufacturing either a positive or a negative review.
    if (excused(next.lastDuty)) return next;
    return next.lastDuty.started ? evaluate(next, false, reason) : next;
  }
  // Reloads cannot resume a live ceremony. Persist the recovery and evaluation
  // together; if recovery cannot save, all mutations remain locked fail closed.
  const resumableDuty=worldDuty?.version===1&&worldDuty.activity==='court'&&worldDuty.duty&&['roleId','slotId','day'].every(key=>worldDuty.duty[key]===current.lastDuty?.[key])&&worldDuty.duty.day===getClock()?.day;
  if (!loadError && !resumableDuty && ['arrived', 'attending'].includes(current.lastDuty?.stage)) {
    const recovered = missed(current, 'reloaded');
    const result = persist(recovered);
    if (!result.ok) { current = recovered; loadError = 'recovery-save-failed'; }
  }
  // The registry and the final physical application use the same requirements.
  // Reading eligibility never changes the clock, save, vacancy or error state.
  function eligibility(roleId = COURT_CLERK_ROLE.id, {ageYears} = {}) {
    const role = roleMap.get(roleId);
    const blocked = loadError || (!role ? 'unknown-role' : current.tenure ? 'already-employed' : null);
    if (blocked) return {ok: false, code: blocked, reasons: [blocked]};
    const reasons = [];
    if (!Number.isFinite(ageYears) || ageYears < role.minimumAgeYears) reasons.push('adult-required');
    for (const [skill, minimum] of Object.entries(role.skillRequirements)) if (current.skills[skill] < minimum) reasons.push(`${skill}-required`);
    const slot = [...slotMap.values()].find(candidate => candidate.roleId === roleId && availableSlot(candidate,role));
    if (!slot) reasons.push('no-vacancy');
    return reasons.length ? {ok: false, code: 'ineligible', reasons} : {ok: true, slotId: slot.id};
  }
  function applicationResult(roleId) {
    const id=roleId??lastApplication?.roleId??current.applications.lastRoleId;
    return copy(lastApplication?.roleId===id?lastApplication:current.applications.byRole[id]?{...current.applications.byRole[id],saved:true}:null);
  }
  function applicationAvailability(roleId = COURT_CLERK_ROLE.id, applicant = {}) {
    const clock=readClock(),previous=current.applications.byRole[roleId],pending=pendingApplication(current.applications);
    if(pending)return {ok:false,code:'application-pending',reasons:['application-pending'],applicationId:pending.id,roleId:pending.roleId};
    if(clock&&previous?.day===clock.day)return {ok:false,code:'already-applied-today',reasons:['already-applied-today'],nextDay:clock.day+1};
    return eligibility(roleId,applicant);
  }
  const checkedApplicant=(role,applicant)=>({ageYears:Number.isFinite(applicant.ageYears)&&applicant.ageYears>=0?applicant.ageYears:null,
    skills:Object.fromEntries(Object.keys(role.skillRequirements).map(key=>[key,current.skills[key]]))});
  function saveApplication(receipt,extra={}){
    const result=persist({...current,...extra,applications:{lastRoleId:receipt.roleId,byRole:{...current.applications.byRole,[receipt.roleId]:receipt}}});
    if(result.ok)lastApplication=null;return result;
  }
  function apply(roleId = COURT_CLERK_ROLE.id, applicant = {}) {
    const finish = result => {lastApplication = {roleId, ...copy(result),saved:false}; return result;};
    const blocked = allowed(); if (blocked) return finish(blocked);
    const role=roleMap.get(roleId);if(!role)return finish(failure('unknown-role'));
    const clock=now();if(!clock)return finish(failure('invalid-clock'));
    const pending=pendingApplication(current.applications);
    if(pending){lastApplication=null;return failure('application-pending');}
    const previous=current.applications.byRole[roleId];
    if(previous?.day===clock.day){lastApplication={...copy(previous),saved:true};return failure('already-applied-today');}
    const eligible=eligibility(roleId,applicant),receipt={id:applicationId(roleId,clock.day),roleId,status:eligible.ok?'pending':'rejected',
      stage:eligible.ok?'submitted':'decided',ok:false,code:eligible.ok?'submitted':eligible.code,reasons:eligible.reasons||[],
      day:clock.day,hour:clock.hour,roll:careerInterviewRoll(worldSeed,roleId,clock.day),checked:checkedApplicant(role,applicant),
      interview:null,reviewedAt:null,decidedAt:eligible.ok?null:{day:clock.day,hour:clock.hour},appointment:null,tenure:null};
    const saved=saveApplication(receipt);if(!saved.ok)return finish(saved);
    lastError=eligible.ok?null:eligible.code;
    return eligible.ok?{ok:true,code:'submitted',applicationId:receipt.id}:{ok:false,code:receipt.code,reasons:receipt.reasons};
  }
  function reviewApplication(roleId,{ageYears,applicationId:expectedId,step='interview'}={}){
    const blocked=allowed();if(blocked)return blocked;
    const role=roleMap.get(roleId),receipt=current.applications.byRole[roleId];
    if(!role||!receipt||receipt.status!=='pending')return failure('no-pending-application');
    if(expectedId!==receipt.id)return failure('stale-application');
    const clock=now();if(!clock)return failure('invalid-clock');
    const timestamp={day:clock.day,hour:clock.hour};
    if(step==='receive-document'){
      if(receipt.stage!=='document-ready')return failure('wrong-review-step');
      const saved=saveApplication({...receipt,stage:'document-held',code:'document-held'});
      return saved.ok?{ok:true,code:'document-held',applicationId:receipt.id}:saved;
    }
    if(step!=='interview'&&step!=='appointment'||step==='interview'&&receipt.stage!=='submitted'||step==='appointment'&&receipt.stage!=='document-held')return failure('wrong-review-step');
    const eligible=eligibility(roleId,{ageYears});let interview=receipt.interview,reviewedAt=receipt.reviewedAt,appointment=receipt.appointment;
    if(eligible.ok&&step==='interview'){
      let context;try{context=getHiringContext(role)||{};}catch{return failure('hiring-context-unavailable');}
      if(roleId===COURT_CLERK_ROLE.id)context={...context,recruiterTraits:{conscientiousness:COURT_SUPERVISOR.conscientiousness,...context.recruiterTraits}};
      interview={...careerInterview({role,skills:current.skills,performance:current.performance,context,worldSeed,day:receipt.day}),roll:receipt.roll};reviewedAt=timestamp;
    }
    const approved=eligible.ok&&interview.roll<interview.chance;
    if(approved&&roleId===COURT_CLERK_ROLE.id&&step==='interview'){
      appointment={id:`appointment:${receipt.id}`,text:'承务官署任命文书：履历与礼仪文书考核已核验。授九品礼务录事，依班听记朝议，归档当日文书。领文宣读后生效。'};
      const saved=saveApplication({...receipt,stage:'document-ready',code:'document-ready',checked:checkedApplicant(role,{ageYears}),interview,reviewedAt,appointment});
      return saved.ok?{ok:true,code:'document-ready',applicationId:receipt.id}:saved;
    }
    const code=approved?'approved':eligible.ok?'interview-rejected':eligible.code,reasons=approved?[]:eligible.ok?['interview-rejected']:eligible.reasons;
    const tenure=approved?{roleId,slotId:eligible.slotId,sinceDay:clock.day,sinceHour:clock.hour}:null;
    const saved=saveApplication({...receipt,status:approved?'approved':'rejected',stage:'decided',ok:approved,code,reasons,checked:checkedApplicant(role,{ageYears}),interview,reviewedAt,appointment,decidedAt:timestamp,tenure},tenure?{tenure}:{});
    if(!saved.ok)return saved;lastError=approved?null:code;
    return {ok:approved,code,reasons,...(tenure?{tenure:copy(tenure)}:{})};
  }
  function cancelApplication(roleId,expectedId){
    const blocked=allowed();if(blocked)return blocked;
    const receipt=current.applications.byRole[roleId];if(receipt?.status!=='pending')return failure('no-pending-application');
    if(receipt.id!==expectedId)return failure('stale-application');
    const clock=now();if(!clock)return failure('invalid-clock');
    const saved=saveApplication({...receipt,status:'cancelled',stage:'decided',ok:false,code:'withdrawn',reasons:['withdrawn'],decidedAt:{day:clock.day,hour:clock.hour}});
    return saved.ok?{ok:true,code:'withdrawn'}:saved;
  }
  function resign() {
    const blocked = allowed(); if (blocked) return blocked;
    if (!current.tenure) return failure('not-employed');
    if (['ready','inspection'].includes(current.lastDuty?.stage)) return failure('wage-ready');
    const next = ['arrived', 'attending', 'archive', 'working'].includes(current.lastDuty?.stage) ? missed(current, 'resigned') : current;
    return persist({...next, tenure: null});
  }
  function learningTicket(source, lessonId = defaultStudyLesson(source)?.id) {
    const blocked = allowed(); if (blocked) return blocked;
    if (!STUDY_SOURCES.includes(source)) return failure('unknown-learning-source');
    const lesson = studyLesson(source,lessonId); if (!lesson) return failure('unknown-learning-choice');
    const clock = now(); if (!clock) return failure('invalid-clock');
    const issued = current.learning[source].issued + 1;
    if (!Number.isSafeInteger(issued)) return failure('learning-limit');
    const result = persist({...current, learning: {...current.learning, [source]: {...current.learning[source], issued, issuedDay: clock.day, lessonId}}});
    if (!result.ok) return result;
    const ticket = {source, id: `${source}:${issued}:${clock.day}`, lessonId};
    activeStudies.set(source,ticket.id);
    return {ok: true, ticket};
  }
  // Cancellation loses the live witness. Only a matching world checkpoint
  // may resume it; loading the career ledger alone never grants completion.
  // A world checkpoint proves observed active progress, but cannot create a
  // ticket, change its day, or complete one that already has a receipt.
  function resumeLearning(ticket, {seconds} = {}) {
    if (!object(ticket) || !STUDY_SOURCES.includes(ticket.source) || !Number.isFinite(seconds) || seconds < 0) return failure('invalid-learning-ticket');
    const clock=now(), study=current.learning[ticket.source];
    if (!clock || study.issuedDay !== clock.day) return failure('learning-expired');
    if (study.issued===0 || ticket.id!==`${ticket.source}:${study.issued}:${study.issuedDay}` || ticket.lessonId!==study.lessonId) return failure('invalid-learning-ticket');
    if (study.completed>=study.issued) return failure('learning-replayed');
    if (!studyLesson(ticket.source,study.lessonId)) return failure('unknown-learning-choice');
    activeStudies.set(ticket.source,ticket.id);return {ok:true,ticket};
  }
  function cancelLearning(ticket) {
    if (ticket && activeStudies.get(ticket.source) === ticket.id) activeStudies.delete(ticket.source);
  }
  function grantSkill(next, skill, clock, fullWork=false) {
    const daily = current.daily.day === clock.day ? {...current.daily} : {day: clock.day, ritual: 0, writing: 0, gardening: 0, art: 0, cooking: 0};
    const limited = daily[skill] >= 4 ? 'daily-skill-limit' : (['gardening','art','cooking'].includes(skill)?current.skills[skill]>=100:current.skills.ritual + current.skills.writing >= 100) ? 'skill-limit' : null;
    const gained = limited ? 0 : 1;
    // A complete work contract retains its published one-level reward. A short
    // lesson earns 10 XP; it never increments a level directly.
    const xpGained=gained?(fullWork?skillXPRequired(current.skills[skill]):STUDY_XP):0;
    const progress=addSkillXP(current.skills[skill],current.skillXP[skill],xpGained);
    const result = persist({...next, daily: {...daily, [skill]: daily[skill] + gained},
      skillXP:{...current.skillXP,[skill]:progress.xp},skills:{...current.skills,[skill]:progress.level}});
    return result.ok ? {ok:true,skill,gained,xpGained,level:progress.level,xp:progress.xp,required:skillXPRequired(progress.level),levelsGained:progress.levelsGained,limited} : result;
  }
  function completeLearning(ticket, {seconds} = {}) {
    const blocked = allowed(); if (blocked) return blocked;
    if (!object(ticket) || !STUDY_SOURCES.includes(ticket.source)) return failure('invalid-learning-ticket');
    const clock = now(); if (!clock) return failure('invalid-clock');
    const study = current.learning[ticket.source], lesson = studyLesson(ticket.source,study.lessonId);
    if (study.issued === 0 || ticket.id !== `${ticket.source}:${study.issued}:${study.issuedDay}` || ticket.lessonId !== study.lessonId) return failure('invalid-learning-ticket');
    if (study.completed >= study.issued) return failure('learning-replayed');
    if (study.issuedDay !== clock.day) return failure('learning-expired');
    if (activeStudies.get(ticket.source) !== ticket.id) return failure('learning-interrupted');
    if (!lesson) return failure('unknown-learning-choice');
    if (!Number.isFinite(seconds) || seconds < lesson.seconds) return failure('learning-incomplete');
    const result = grantSkill({...current, learning: {...current.learning, [ticket.source]: {...study, completed: study.issued}}}, lesson.skill, clock);
    if (result.ok) activeStudies.delete(ticket.source);
    return result;
  }
  function completedLowerWork({source, receiptId} = {}) {
    const blocked = allowed(); if (blocked) return blocked;
    if (!own(WORK,source)) return failure('unknown-work-source');
    const match = typeof receiptId === 'string' && new RegExp('^'+source+'-([1-9][0-9]*)$').exec(receiptId);
    const serial = match ? Number(match[1]) : NaN;
    if (!integer(serial)) return failure('invalid-work-receipt');
    if (serial <= current.lowerWork[source]) return failure('work-replayed');
    const clock = now(); if (!clock) return failure('invalid-clock');
    return grantSkill({...current, lowerWork: {...current.lowerWork, [source]: serial}}, WORK[source], clock, true);
  }
  // The handbook, world intents and final mutation share one start decision.
  // Reads do not observe a day, save state, advance lastClock or change errors.
  function beginDutyAvailability(roleId=current.tenure?.roleId,{receiptId}={}){
    const clock=readClock(),role=roleMap.get(roleId),duty=current.lastDuty;
    const context={roleId:roleId||null,day:clock?.day??null,hour:clock?.hour??null,
      window:role?copy(role.dutyWindow):null,stage:duty?.roleId===roleId?duty.stage:null};
    const no=code=>({...context,ok:false,code,reasons:[code]});
    if(loadError||saving||paying)return no(loadError||'career-busy');
    if(interruptedUnsaved)return no('interruption-unsaved');
    if(!current.tenure||current.tenure.roleId!==roleId||!role)return no('not-employed');
    if(!clock)return no('invalid-clock');
    if(role.workSource&&receiptId!==undefined&&!validWorkReceipt(role.workSource,receiptId))return no('invalid-work-receipt');
    // Recover an already admitted work slip even after the new-shift window closes.
    if(role.workSource&&duty?.day===clock.day&&duty.workReceiptId===receiptId&&duty.stage==='working')return {...context,ok:true,unchanged:true};
    if(['ready','inspection'].includes(duty?.stage))return no('wage-ready');
    if(current.lastPaidDay===clock.day)return no('already-paid-today');
    if(duty?.day===clock.day&&excused(duty))return no('court-postponed');
    if(duty?.day===clock.day&&(duty.started||duty.stage==='arrived'))return no(duty.stage==='missed'?'duty-missed':'duty-active');
    if(clock.hour<role.dutyWindow.startHour||clock.hour>=role.dutyWindow.endHour)return no('outside-arrival-window');
    return {...context,ok:true};
  }
  function beginDuty({receiptId,shiftKind} = {}) {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
    if (!current.tenure) return failure('not-employed');
    const rollover = observeDay(); if (!rollover.ok) return rollover;
    const clock = now(); if (!clock) return failure('invalid-clock');
    const duty = current.lastDuty, role = roleMap.get(current.tenure.roleId);
    shiftKind??=[TAVERN_HOST_ROLE.id,TAVERN_CHEF_ROLE.id].includes(role.id)?'continuous':undefined;
    if(shiftKind!==undefined&&(shiftKind!=='continuous'||!tavernRole(role)))return failure('invalid-shift-kind');
    if (role.workSource && !validWorkReceipt(role.workSource,receiptId)) return failure('invalid-work-receipt');
    const availability=beginDutyAvailability(role.id,{receiptId});
    if(!availability.ok)return failure(availability.code,availability.reasons);
    if(availability.unchanged)return {ok:true,unchanged:true};
    const next = duty && duty.day < clock.day && ['arrived', 'attending', 'archive','working'].includes(duty.stage) ? missed(current, 'day-ended') : current;
    return persist({...next, lastDuty: {roleId: current.tenure.roleId, slotId: current.tenure.slotId,
      day: clock.day, stage: role.workSource?'working':'arrived', started:!!role.workSource, reason: null, arrivalHour: clock.hour, wage: null,...(role.workSource?{workReceiptId:receiptId}:{}),...(tavernRole(role)?{customerReviews:[]}:{}),...(shiftKind?{shiftKind,startedSeconds:clock.seconds,coveredSeconds:null,completedTasks:null,endedHour:null,endedSeconds:null}:{})}});
  }
  function dutyEvent(event) {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
    if (roleMap.get(current.tenure?.roleId)?.workSource) return failure('wrong-duty-source');
    const transitions = {'court-start': ['arrived', 'attending'], 'court-completed': ['attending', 'archive'], 'archive-completed': ['archive', 'ready']};
    if (!own(transitions, event)) return failure('unknown-duty-event');
    if (!current.tenure) return failure('not-employed');
    const rollover = observeDay(); if (!rollover.ok) return rollover;
    const clock = now(); if (!clock) return failure('invalid-clock');
    const duty = current.lastDuty;
    if (duty?.day === clock.day && excused(duty)) return {ok: true, unchanged: true, excused: true};
    if (event === 'court-start' && (!duty || duty.day !== clock.day || duty.stage === 'missed' && !duty.started)) {
      if (current.tenure.sinceDay === clock.day && current.tenure.sinceHour >= roleMap.get(current.tenure.roleId).dutyWindow.endHour) return {ok: true, unchanged: true, exempt: true};
      if (duty?.stage === 'ready') return failure('wage-ready');
      if (current.lastPaidDay === clock.day || current.lastEvaluatedDay === clock.day) return failure('duty-evaluated');
      const next = duty && duty.day < clock.day && ['arrived', 'attending', 'archive','working'].includes(duty.stage) ? missed(current, 'day-ended') : current;
      return persist(evaluate({...next, lastDuty: {roleId: current.tenure.roleId, slotId: current.tenure.slotId,
        day: clock.day, stage: 'missed', started: true, reason: 'absent', arrivalHour: null, wage: null}}, false, 'absent'));
    }
    if (!duty) return failure('duty-not-started');
    if (duty.day !== clock.day) return failure('duty-expired');
    const [from, stage] = transitions[event];
    if (duty.stage !== from) return failure('invalid-duty-stage');
    let next = {...current, lastDuty: {...duty, stage, started: true}};
    if (stage === 'ready') next = evaluate(next, true, 'court-and-archive-completed');
    return persist(next);
  }
  function interruptDuty(reason = 'interrupted') {
    const blocked = allowed(); if (blocked) return blocked;
    if (typeof reason !== 'string' || !reason.length || reason.length > 80) return failure('invalid-interruption');
    if (!current.lastDuty || ['missed', 'paid', 'ready', 'inspection'].includes(current.lastDuty.stage)) return {ok: true, unchanged: true};
    const result = persist(missed(current, reason));
    interruptedUnsaved = !result.ok;
    return result;
  }
  function observeDay() {
    const blocked = allowed(); if (blocked) return blocked;
    const clock = now(); if (!clock) return failure('invalid-clock');
    if (observedDay === null || observedDay === clock.day) { observedDay = clock.day; return {ok: true, unchanged: true}; }
    const day = observedDay, tenure = current.tenure, duty = current.lastDuty;
    if (!tenure || tenure.sinceDay > day || tenure.sinceDay === day &&
      tenure.sinceHour >= roleMap.get(tenure.roleId).dutyWindow.endHour ||
      current.lastEvaluatedDay !== null && current.lastEvaluatedDay >= day || ['ready','inspection'].includes(duty?.stage) ||
      duty?.day === day && excused(duty)) {
      observedDay = clock.day; return {ok: true, unchanged: true};
    }
    const incomplete = duty?.day === day ? {...duty, started: true} : {roleId: tenure.roleId, slotId: tenure.slotId,
      day, stage: 'missed', started: true, reason: null, arrivalHour: null, wage: null,...(roleMap.get(tenure.roleId).workSource?{workReceiptId:null}:{}),...(tavernRole(roleMap.get(tenure.roleId))?{customerReviews:[]}:{})};
    const result = persist(missed({...current, lastDuty: incomplete}, 'day-ended'));
    if (result.ok) { observedDay = clock.day; interruptedUnsaved = false; }
    return result;
  }
  // Called only by the actual labor workflow, at durable physical completion
  // and by its real employer encounter. Raw court events cannot finish these.
  function laborEvent(event, {roleId, receiptId,coveredSeconds,completedTasks} = {}) {
    const blocked=allowed();if(blocked)return blocked;
    const duty=current.lastDuty,role=roleMap.get(roleId);
    if(!role?.workSource||!duty||duty.roleId!==roleId||duty.workReceiptId!==receiptId)return failure('wrong-duty-source');
    if(!now())return failure('invalid-clock');
    if(event==='completed'){
      if(['inspection','ready','paid'].includes(duty.stage))return {ok:true,unchanged:true};
      if(duty.stage!=='working')return failure('invalid-duty-stage');
      if(duty.day!==lastClock.day)return failure('duty-expired');
      const nextDuty={...duty,stage:'inspection',...(duty.shiftKind==='continuous'?{coveredSeconds,completedTasks,endedHour:lastClock.hour,endedSeconds:lastClock.seconds}:{})};
      if(!validShift(nextDuty,role))return failure('invalid-shift-work');
      return persist({...current,lastDuty:nextDuty});
    }
    if(event==='inspected'){
      if(['ready','paid'].includes(duty.stage))return {ok:true,unchanged:true};
      if(duty.stage!=='inspection')return failure('work-incomplete');
      return persist(evaluate({...current,lastDuty:{...duty,stage:'ready'}},true,'labor-inspected'));
    }
    return failure('unknown-duty-event');
  }
  // Trusted physical order callback. Review and performance commit together;
  // immutable work/order IDs make reload, repeated clicks and correction idempotent.
  function customerReview({roleId,receiptId,reviewId,customerId,customerName,tableId,dishId,tableName=tableId,dishName=dishId,reasonCode,correctedReviewId=null}={}){
    const blocked=allowed();if(blocked)return blocked;
    const duty=current.lastDuty,role=roleMap.get(roleId);
    if(!tavernRole(role)||!duty||duty.roleId!==roleId||duty.workReceiptId!==receiptId)return failure('wrong-duty-source');
    const prior=duty.customerReviews.find(r=>r.id===reviewId);
    if(prior)return ['customerId','customerName','tableId','dishId','tableName','dishName','reasonCode','correctedReviewId'].every(key=>prior[key]===({customerId,customerName,tableId,dishId,tableName,dishName,reasonCode,correctedReviewId})[key])?{ok:true,unchanged:true,review:copy(prior)}:failure('review-conflict');
    const clock=now();if(!clock)return failure('invalid-clock');
    if(duty.stage!=='working'||duty.day!==clock.day)return failure('invalid-duty-stage');
    const positive=reasonCode==='corrected',original=duty.customerReviews.find(r=>r.id===correctedReviewId);
    const review={id:reviewId,customerId,customerName,tableId,dishId,tableName,dishName,reasonCode,correctedReviewId,positive,score:positive?1:-2,
      reason:positive?`已改正${original?.reasonCode==='dirty-table'?'脏桌未清洁':original?.reasonCode==='wrong-table'?'送错桌位':'菜品不符'}：${tableName} · ${dishName}`:reasonCode==='dirty-table'?`脏桌未清洁：${tableName}还留着上一位客人的餐具和污渍`:reasonCode==='wrong-table'?`送错桌位：这份${dishName}应送到${tableName}`:`菜品不符：${tableName}点的是${dishName}`};
    const nextDuty={...duty,customerReviews:[...duty.customerReviews,review]};
    if(!validCustomerReviews(nextDuty,role))return failure('invalid-customer-review');
    const result=persist({...current,lastDuty:nextDuty,performance:Math.max(-100,Math.min(100,current.performance+review.score)),
      promotionProgress:Math.max(0,Math.min(100,current.promotionProgress+Math.min(0,review.score)))});
    return result.ok?{ok:true,review:copy(review),servicePenalty:customerPenalty(nextDuty)}:result;
  }
  function settle() {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
    const duty = current.lastDuty;
    if (duty?.stage !== 'ready') return failure('work-incomplete');
    if (!now()) return failure('invalid-clock');
    const receiptId = `career:${duty.slotId}:${duty.day}`;
    // A very short voluntary handover can earn zero after prorating/penalties.
    // Mark the day once; never mint a minimum coin or call the bank with zero.
    if(duty.wage===0){const result=persist({...current,lastPaidDay:duty.day,lastDuty:{...duty,stage:'paid'}});return result.ok?{ok:true,paid:true,wage:0,receiptId,replayed:false,deposit:null}:result;}
    if (typeof creditWageToBank !== 'function') return failure('bank-unavailable');
    const deposit = {amount: duty.wage, receiptId, currency: roleMap.get(duty.roleId).currency || 'copper',
      roleId: duty.roleId, slotId: duty.slotId, day: duty.day};
    paying = true; let payment;
    try { payment = creditWageToBank({...deposit}); }
    catch { return failure('payment-failed'); }
    finally { paying = false; }
    if (payment && typeof payment.then === 'function') {
      Promise.resolve(payment).catch(() => {}); return failure('async-bank-credit-unsupported');
    }
    if (payment?.ok !== true) return failure(payment?.code || 'payment-failed');
    if (payment.receiptId !== undefined && payment.receiptId !== receiptId) return failure('bank-receipt-mismatch');
    const result = persist({...current, lastPaidDay: duty.day, lastDuty: {...duty, stage: 'paid'}});
    return {ok: true, paid: true, wage: duty.wage, receiptId, replayed: !!payment.replayed, deposit,
      cleanupPending: !result.ok, ...(result.ok ? {} : {code: result.code})};
  }
  return Object.freeze({state, isHired: (roleId = COURT_CLERK_ROLE.id) => !loadError && current.tenure?.roleId === roleId,
    canContinueLabor:receiptId=>{const d=current.lastDuty;let c;try{c=getClock();}catch{return false;}return !loadError&&d?.workReceiptId===receiptId&&(d.stage==='inspection'||d.stage==='working'&&d.day===c?.day);},
    currentRole:()=>copy(roleMap.get(current.tenure?.roleId)||null),
    slotHolder:roleId=>{if(loadError)return null;const slot=[...slotMap.values()].find(s=>s.roleId===roleId);return slot?current.tenure?.slotId===slot.id?'player':slot.holderId:null;},
    catalogue:()=>[...roleMap.values()].map(role=>({...copy(role),vacancy:[...slotMap.values()].filter(slot=>slot.roleId===role.id&&availableSlot(slot,role)&&slot.id!==current.tenure?.slotId).length})),
    eligibility, applicationAvailability, beginDutyAvailability, applicationResult,
    laborEvent, customerReview, apply, reviewApplication, cancelApplication, resign, learningTicket, resumeLearning, cancelLearning, completeLearning, completedLowerWork, beginDuty, dutyEvent, interruptDuty, observeDay, settle});
}
