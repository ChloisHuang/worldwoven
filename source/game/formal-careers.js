import {emptyApplications, restoreApplications, careerInterview} from './career-applications.js';
import {STUDY_SOURCES, studyLesson, defaultStudyLesson} from './study-lessons.js';
// Fictional finite vacancies, independent of the six existing world NPCs.
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
  supervisorId:'cn-tavern-host',workSource:'cn-tavern-labor',wage:16,minimumAgeYears:18,
  skillRequirements:Object.freeze({ritual:2}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1});
export const GARDEN_ASSISTANT_ROLE = Object.freeze({id:'fr-garden-assistant',name:'西苑常任园艺助理',
  slotId:'fr-garden-assistant-1',country:'france',currency:'france',employer:'埃米尔',workplace:'西苑工具架登记簿',
  supervisorId:'france-gardener',workSource:'fr-garden-labor',wage:8,minimumAgeYears:18,
  skillRequirements:Object.freeze({gardening:2}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1});
export const FORMAL_CAREER_ROLES = Object.freeze([COURT_CLERK_ROLE,TAVERN_STEWARD_ROLE,GARDEN_ASSISTANT_ROLE]);
export const FORMAL_CAREER_SLOTS = Object.freeze([
  ...FORMAL_CAREER_ROLES.map(role => Object.freeze({id:role.slotId,roleId:role.id,holderId:null})),
]);
const SKILLS = Object.freeze(['ritual', 'writing', 'gardening', 'art']);
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
const empty = () => ({version: 3, revision: 0, skills: {ritual: 0, writing: 0, gardening: 0, art: 0}, tenure: null,
  lastDuty: null, lastPaidDay: null, daily: {day: null, ritual: 0, writing: 0, gardening: 0, art: 0},
  learning: Object.fromEntries(STUDY_SOURCES.map(source => [source, emptyStudy()])),
  lowerWork: {'cn-tavern-labor': 0, 'fr-garden-labor': 0}, performance: 0, promotionProgress: 0,
  lastEvaluatedDay: null, lastEvaluation: null, applications: emptyApplications()});

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
      !(slot.holderId === null || identifier(slot.holderId))) throw Error('invalid-career-catalogue');
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
  const validSlot = (roleId, slotId) => roleMap.has(roleId) && slotMap.get(slotId)?.roleId === roleId && slotMap.get(slotId).holderId === null;
  if (!object(saved) || saved.version !== 3 || !integer(saved.revision) || !object(saved.skills) ||
    Object.keys(saved.skills).length !== SKILLS.length || SKILLS.some(key => !integer(saved.skills[key])) ||
    SKILLS.some(key=>saved.skills[key]>100) || saved.skills.ritual + saved.skills.writing > 100 || !dayOrNull(saved.lastPaidDay) ||
    !object(saved.daily) || !dayOrNull(saved.daily.day) || SKILLS.some(key => !integer(saved.daily[key]) ||
      saved.daily[key] > 4 || saved.daily[key] > saved.skills[key]) ||
    (saved.daily.day === null && SKILLS.some(key => saved.daily[key] !== 0)) ||
    !object(saved.learning) || Object.keys(saved.learning).length !== STUDY_SOURCES.length ||
    !object(saved.lowerWork) || Object.keys(saved.lowerWork).length !== 2 || Object.keys(WORK).some(source=>!integer(saved.lowerWork[source])) ||
    !Number.isInteger(saved.performance) || Math.abs(saved.performance) > 100 ||
    !integer(saved.promotionProgress) || saved.promotionProgress > 100 || !dayOrNull(saved.lastEvaluatedDay)) throw Error('invalid-career-state');
  for (const source of STUDY_SOURCES) {
    const study = saved.learning[source];
    if (!object(study) || Object.keys(study).length !== 4 || !integer(study.issued) || !integer(study.completed) || study.completed > study.issued ||
      !dayOrNull(study.issuedDay) || (study.issued === 0) !== (study.issuedDay === null) ||
      (study.issued === 0 ? study.lessonId !== null : !studyLesson(source,study.lessonId))) throw Error('invalid-career-state');
  }
  if (saved.tenure !== null && (!object(saved.tenure) || !validSlot(saved.tenure.roleId, saved.tenure.slotId) ||
    !integer(saved.tenure.sinceDay) || !Number.isFinite(saved.tenure.sinceHour) ||
    saved.tenure.sinceHour < 0 || saved.tenure.sinceHour >= 24)) throw Error('invalid-career-state');
  const duty = saved.lastDuty;
  if (duty !== null && (!object(duty) || !validSlot(duty.roleId, duty.slotId) || !integer(duty.day) ||
    !STAGES.has(duty.stage) || typeof duty.started !== 'boolean' ||
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
    (['ready', 'paid'].includes(duty.stage) ? duty.wage !== completedWage(roleMap.get(duty.roleId), duty.arrivalHour) : duty.wage !== null) ||
    (duty.stage === 'paid' && saved.lastPaidDay !== duty.day) ||
    (saved.lastPaidDay !== null && (duty.day < saved.lastPaidDay || duty.day === saved.lastPaidDay && duty.stage !== 'paid')))) throw Error('invalid-career-state');
  if (saved.lastPaidDay !== null && duty === null) throw Error('invalid-career-state');
  const review = saved.lastEvaluation;
  if (review === null ? saved.lastEvaluatedDay !== null || saved.performance !== 0 || saved.promotionProgress !== 0 :
    !object(review) || !validSlot(review.roleId, review.slotId) || !integer(review.day) ||
    review.day !== saved.lastEvaluatedDay || review.id !== `career-review:${review.slotId}:${review.day}` ||
    review.evaluatorId !== supervisor(roleMap.get(review.roleId)) || typeof review.positive !== 'boolean' ||
    review.score !== (review.positive ? 1 : -1) || typeof review.reason !== 'string' || review.reason.length > 80 ||
    typeof review.reasonCode !== 'string' || review.reasonCode.length > 80 ||
    (review.positive ? ![roleMap.get(review.roleId).wage,roleMap.get(review.roleId).wage+(roleMap.get(review.roleId).preparationBonus??2)].includes(review.wage) : review.wage !== 0) ||
    !duty || review.day > duty.day || review.day === duty.day && (review.slotId !== duty.slotId ||
      (review.positive ? !['ready', 'paid'].includes(duty.stage) || duty.wage !== review.wage : duty.stage !== 'missed'))) throw Error('invalid-career-state');
  if (duty && ['ready', 'paid'].includes(duty.stage) && (!review || review.day !== duty.day || !review.positive)) throw Error('invalid-career-state');
  return {version: 3, revision: saved.revision, applications: restoreApplications(saved.applications, roleMap, slotMap), skills: {...saved.skills},
    tenure: saved.tenure === null ? null : {roleId: saved.tenure.roleId, slotId: saved.tenure.slotId,
      sinceDay: saved.tenure.sinceDay, sinceHour: saved.tenure.sinceHour},
    lastDuty: duty === null ? null : {roleId: duty.roleId, slotId: duty.slotId, day: duty.day, stage: duty.stage,
      started: duty.started, reason: duty.reason, arrivalHour: duty.arrivalHour, wage: duty.wage,...(roleMap.get(duty.roleId).workSource?{workReceiptId:duty.workReceiptId}: {})},
    lastPaidDay: saved.lastPaidDay, daily: {...saved.daily},
    learning: Object.fromEntries(STUDY_SOURCES.map(source => [source, {...saved.learning[source]}])),
    lowerWork: {...saved.lowerWork}, performance: saved.performance,
    promotionProgress: saved.promotionProgress, lastEvaluatedDay: saved.lastEvaluatedDay,
    lastEvaluation: review === null ? null : {id: review.id, evaluatorId: review.evaluatorId, day: review.day,
      roleId: review.roleId, slotId: review.slotId, positive: review.positive, score: review.score,
      reason: review.reason, reasonCode: review.reasonCode, wage: review.wage}};
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
export function createFormalCareers({saved, saveState, creditWageToBank, getClock, worldSeed=1, getHiringContext=()=>({}),
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
      ...Object.values(current.learning).map(study => study.issuedDay), ...Object.values(current.applications.byRole).map(result=>result.day)].filter(day => day != null);
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
    const score = positive ? 1 : -1, role = roleMap.get(duty.roleId);
    // The conscientious supervisor rewards completing both actual duties and
    // gives a small preparation bonus for arrival at least five minutes early.
    const wage = positive ? completedWage(role, duty.arrivalHour) : 0;
    const reasonText = role.workSource ? positive ? `${role.employer}已验收完整当班职责${wage>role.wage?'；午前开班，勤勉奖励+1':''}` : '当班职责未完成，没有日薪' : positive ? wage > role.wage ? '提前到岗，朝会记录与归档均已完成' : '按时到岗，朝会记录与归档均已完成' :
      ({absent: '未按时到岗，缺席当日朝会', reloaded: '朝会中途离开，出勤记录未完成',
        resigned: '当日职责未完成即离任', 'day-ended': '当日朝会或归档未完成'})[reason] || '出勤中断，当日职责未完成';
    return {...next, performance: Math.max(-100, Math.min(100, next.performance + score)),
      promotionProgress: Math.max(0, Math.min(100, next.promotionProgress + score)), lastEvaluatedDay: duty.day,
      lastDuty: {...duty, wage: positive ? wage : null}, lastEvaluation: {
        id: `career-review:${duty.slotId}:${duty.day}`, evaluatorId: supervisor(role),
        day: duty.day, roleId: duty.roleId, slotId: duty.slotId, positive, score, reason: reasonText, reasonCode: reason, wage}};
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
  if (!loadError && ['arrived', 'attending'].includes(current.lastDuty?.stage)) {
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
    const slot = [...slotMap.values()].find(candidate => candidate.roleId === roleId && candidate.holderId === null);
    if (!slot) reasons.push('no-vacancy');
    return reasons.length ? {ok: false, code: 'ineligible', reasons} : {ok: true, slotId: slot.id};
  }
  function applicationResult(roleId) {
    const id=roleId??lastApplication?.roleId??current.applications.lastRoleId;
    return copy(lastApplication?.roleId===id?lastApplication:current.applications.byRole[id]?{...current.applications.byRole[id],saved:true}:null);
  }
  function applicationAvailability(roleId = COURT_CLERK_ROLE.id, applicant = {}) {
    const check=eligibility(roleId,applicant),clock=readClock(),previous=current.applications.byRole[roleId];
    if(clock&&previous?.day===clock.day)return {ok:false,code:'already-applied-today',reasons:['already-applied-today'],nextDay:clock.day+1};
    return check;
  }
  function apply(roleId = COURT_CLERK_ROLE.id, applicant = {}) {
    const finish = result => {lastApplication = {roleId, ...copy(result),saved:false}; return result;};
    const blocked = allowed(); if (blocked) return finish(blocked);
    const role=roleMap.get(roleId);if(!role)return finish(failure('unknown-role'));
    const clock = now(); if (!clock) return finish(failure('invalid-clock'));
    const previous=current.applications.byRole[roleId];
    if(previous?.day===clock.day){lastApplication={...copy(previous),saved:true};return failure('already-applied-today');}
    const eligible = eligibility(roleId, applicant);
    let interview=null,tenure=null,result;
    if(!eligible.ok)result={ok:false,code:eligible.code,reasons:[...eligible.reasons]};
    else{
      let context;try{context=getHiringContext(role)||{};}catch{return finish(failure('hiring-context-unavailable'));}
      if(role.id===COURT_CLERK_ROLE.id)context={...context,recruiterTraits:{conscientiousness:COURT_SUPERVISOR.conscientiousness,...context.recruiterTraits}};
      interview=careerInterview({role,skills:current.skills,performance:current.performance,context,worldSeed,day:clock.day});
      if(interview.roll<interview.chance){tenure={roleId,slotId:eligible.slotId,sinceDay:clock.day,sinceHour:clock.hour};result={ok:true,tenure:copy(tenure)};}
      else result={ok:false,code:'interview-rejected',reasons:['interview-rejected']};
    }
    const receipt={roleId,ok:result.ok,code:result.ok?'approved':result.code,reasons:result.reasons||[],day:clock.day,hour:clock.hour,
      checked:{ageYears:Number.isFinite(applicant.ageYears)&&applicant.ageYears>=0?applicant.ageYears:null,skills:Object.fromEntries(Object.keys(role.skillRequirements).map(key=>[key,current.skills[key]]))},interview,tenure};
    const saved=persist({...current,...(tenure?{tenure}:{}),applications:{lastRoleId:roleId,byRole:{...current.applications.byRole,[roleId]:receipt}}});
    if(!saved.ok)return finish(saved);
    lastApplication=null;lastError=result.ok?null:result.code;return result;
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
    activeStudies.set(ticket.source,ticket.id);return {ok:true,ticket};
  }
  function cancelLearning(ticket) {
    if (ticket && activeStudies.get(ticket.source) === ticket.id) activeStudies.delete(ticket.source);
  }
  function grantSkill(next, skill, clock) {
    const daily = current.daily.day === clock.day ? {...current.daily} : {day: clock.day, ritual: 0, writing: 0, gardening: 0, art: 0};
    const limited = daily[skill] >= 4 ? 'daily-skill-limit' : (['gardening','art'].includes(skill)?current.skills[skill]>=100:current.skills.ritual + current.skills.writing >= 100) ? 'skill-limit' : null;
    const gained = limited ? 0 : 1;
    const result = persist({...next, daily: {...daily, [skill]: daily[skill] + gained},
      skills: {...current.skills, [skill]: current.skills[skill] + gained}});
    return result.ok ? {ok: true, skill, gained, limited} : result;
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
    return grantSkill({...current, lowerWork: {...current.lowerWork, [source]: serial}}, WORK[source], clock);
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
  function beginDuty({receiptId} = {}) {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
    if (!current.tenure) return failure('not-employed');
    const rollover = observeDay(); if (!rollover.ok) return rollover;
    const clock = now(); if (!clock) return failure('invalid-clock');
    const duty = current.lastDuty, role = roleMap.get(current.tenure.roleId);
    if (role.workSource && !validWorkReceipt(role.workSource,receiptId)) return failure('invalid-work-receipt');
    const availability=beginDutyAvailability(role.id,{receiptId});
    if(!availability.ok)return failure(availability.code,availability.reasons);
    if(availability.unchanged)return {ok:true,unchanged:true};
    const next = duty && duty.day < clock.day && ['arrived', 'attending', 'archive','working'].includes(duty.stage) ? missed(current, 'day-ended') : current;
    return persist({...next, lastDuty: {roleId: current.tenure.roleId, slotId: current.tenure.slotId,
      day: clock.day, stage: role.workSource?'working':'arrived', started:!!role.workSource, reason: null, arrivalHour: clock.hour, wage: null,...(role.workSource?{workReceiptId:receiptId}:{})}});
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
      day, stage: 'missed', started: true, reason: null, arrivalHour: null, wage: null,...(roleMap.get(tenure.roleId).workSource?{workReceiptId:null}:{})};
    const result = persist(missed({...current, lastDuty: incomplete}, 'day-ended'));
    if (result.ok) { observedDay = clock.day; interruptedUnsaved = false; }
    return result;
  }
  // Called only by the actual labor workflow, at durable physical completion
  // and by its real employer encounter. Raw court events cannot finish these.
  function laborEvent(event, {roleId, receiptId} = {}) {
    const blocked=allowed();if(blocked)return blocked;
    const duty=current.lastDuty,role=roleMap.get(roleId);
    if(!role?.workSource||!duty||duty.roleId!==roleId||duty.workReceiptId!==receiptId)return failure('wrong-duty-source');
    if(!now())return failure('invalid-clock');
    if(event==='completed'){
      if(['inspection','ready','paid'].includes(duty.stage))return {ok:true,unchanged:true};
      if(duty.stage!=='working')return failure('invalid-duty-stage');
      if(duty.day!==lastClock.day)return failure('duty-expired');
      return persist({...current,lastDuty:{...duty,stage:'inspection'}});
    }
    if(event==='inspected'){
      if(['ready','paid'].includes(duty.stage))return {ok:true,unchanged:true};
      if(duty.stage!=='inspection')return failure('work-incomplete');
      return persist(evaluate({...current,lastDuty:{...duty,stage:'ready'}},true,'labor-inspected'));
    }
    return failure('unknown-duty-event');
  }
  function settle() {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
    const duty = current.lastDuty;
    if (duty?.stage !== 'ready') return failure('work-incomplete');
    if (!now()) return failure('invalid-clock');
    if (typeof creditWageToBank !== 'function') return failure('bank-unavailable');
    const receiptId = `career:${duty.slotId}:${duty.day}`;
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
    catalogue:()=>[...roleMap.values()].map(role=>({...copy(role),vacancy:[...slotMap.values()].filter(slot=>slot.roleId===role.id&&slot.holderId===null&&slot.id!==current.tenure?.slotId).length})),
    eligibility, applicationAvailability, beginDutyAvailability, applicationResult,
    laborEvent, apply, resign, learningTicket, resumeLearning, cancelLearning, completeLearning, completedLowerWork, beginDuty, dutyEvent, interruptDuty, observeDay, settle});
}
