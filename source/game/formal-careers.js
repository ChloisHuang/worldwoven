// Fictional finite vacancies, independent of the six existing world NPCs.
export const COURT_CLERK_ROLE = Object.freeze({
  id: 'cn-court-clerk', name: '礼务录事', rank: 9, slotId: 'cn-court-clerk-1',
  wage: 18, minimumAgeYears: 18,
  skillRequirements: Object.freeze({ritual: 2, writing: 2}),
  dutyWindow: Object.freeze({startHour: 6, endHour: 11.5}),
});
export const COURT_SUPERVISOR = Object.freeze({id: 'cn-official-rites', conscientiousness: .85,
  earlyArrivalMinutes: 5, preparationBonus: 2});
export const FORMAL_CAREER_ROLES = Object.freeze([COURT_CLERK_ROLE]);
export const FORMAL_CAREER_SLOTS = Object.freeze([
  Object.freeze({id: 'cn-court-clerk-1', roleId: COURT_CLERK_ROLE.id, holderId: null}),
]);
const STUDIES = Object.freeze({'cn-rest': 'ritual', 'cn-calligraphy': 'writing'});
const SKILLS = Object.freeze(['ritual', 'writing']);
const STAGES = new Set(['arrived', 'attending', 'archive', 'ready', 'missed', 'paid']);
const copy = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const dayOrNull = value => value === null || integer(value);
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const own = (value, key) => Object.hasOwn(value, key);
const excused = duty => duty?.stage === 'missed' && duty.reason === 'court-postponed';
const completedWage = (role, arrivalHour) => role.wage + (COURT_SUPERVISOR.conscientiousness >= .8 &&
  arrivalHour <= role.dutyWindow.endHour - COURT_SUPERVISOR.earlyArrivalMinutes / 60 ? COURT_SUPERVISOR.preparationBonus : 0);
const empty = () => ({version: 1, revision: 0, skills: {ritual: 0, writing: 0}, tenure: null,
  lastDuty: null, lastPaidDay: null, daily: {day: null, ritual: 0, writing: 0},
  learning: {'cn-rest': {issued: 0, completed: 0, issuedDay: null},
    'cn-calligraphy': {issued: 0, completed: 0, issuedDay: null}},
  lowerWork: {'cn-tavern-labor': 0}, performance: 0, promotionProgress: 0,
  lastEvaluatedDay: null, lastEvaluation: null});

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
  const validSlot = (roleId, slotId) => roleMap.has(roleId) && slotMap.get(slotId)?.roleId === roleId && slotMap.get(slotId).holderId === null;
  if (!object(saved) || saved.version !== 1 || !integer(saved.revision) || !object(saved.skills) ||
    Object.keys(saved.skills).length !== SKILLS.length || SKILLS.some(key => !integer(saved.skills[key])) ||
    saved.skills.ritual + saved.skills.writing > 100 || !dayOrNull(saved.lastPaidDay) ||
    !object(saved.daily) || !dayOrNull(saved.daily.day) || SKILLS.some(key => !integer(saved.daily[key]) ||
      saved.daily[key] > 4 || saved.daily[key] > saved.skills[key]) ||
    (saved.daily.day === null && SKILLS.some(key => saved.daily[key] !== 0)) ||
    !object(saved.learning) || Object.keys(saved.learning).length !== Object.keys(STUDIES).length ||
    !object(saved.lowerWork) || Object.keys(saved.lowerWork).length !== 1 || !integer(saved.lowerWork['cn-tavern-labor']) ||
    !Number.isInteger(saved.performance) || Math.abs(saved.performance) > 100 ||
    !integer(saved.promotionProgress) || saved.promotionProgress > 100 || !dayOrNull(saved.lastEvaluatedDay)) throw Error('invalid-career-state');
  for (const source of Object.keys(STUDIES)) {
    const study = saved.learning[source];
    if (!object(study) || Object.keys(study).length !== 3 || !integer(study.issued) || !integer(study.completed) || study.completed > study.issued ||
      !dayOrNull(study.issuedDay) || (study.issued === 0) !== (study.issuedDay === null)) throw Error('invalid-career-state');
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
    (['attending', 'archive', 'ready', 'paid'].includes(duty.stage) && !duty.started) ||
    (['arrived', 'attending', 'archive', 'ready'].includes(duty.stage) &&
      (!saved.tenure || duty.roleId !== saved.tenure.roleId || duty.slotId !== saved.tenure.slotId || duty.day < saved.tenure.sinceDay)) ||
    (['ready', 'paid'].includes(duty.stage) ? duty.wage !== completedWage(roleMap.get(duty.roleId), duty.arrivalHour) : duty.wage !== null) ||
    (duty.stage === 'paid' && saved.lastPaidDay !== duty.day) ||
    (saved.lastPaidDay !== null && (duty.day < saved.lastPaidDay || duty.day === saved.lastPaidDay && duty.stage !== 'paid')))) throw Error('invalid-career-state');
  if (saved.lastPaidDay !== null && duty === null) throw Error('invalid-career-state');
  const review = saved.lastEvaluation;
  if (review === null ? saved.lastEvaluatedDay !== null || saved.performance !== 0 || saved.promotionProgress !== 0 :
    !object(review) || !validSlot(review.roleId, review.slotId) || !integer(review.day) ||
    review.day !== saved.lastEvaluatedDay || review.id !== `career-review:${review.slotId}:${review.day}` ||
    review.evaluatorId !== COURT_SUPERVISOR.id || typeof review.positive !== 'boolean' ||
    review.score !== (review.positive ? 1 : -1) || typeof review.reason !== 'string' || review.reason.length > 80 ||
    typeof review.reasonCode !== 'string' || review.reasonCode.length > 80 ||
    (review.positive ? ![roleMap.get(review.roleId).wage, roleMap.get(review.roleId).wage + 2].includes(review.wage) : review.wage !== 0) ||
    !duty || review.day > duty.day || review.day === duty.day && (review.slotId !== duty.slotId ||
      (review.positive ? !['ready', 'paid'].includes(duty.stage) || duty.wage !== review.wage : duty.stage !== 'missed'))) throw Error('invalid-career-state');
  if (duty && ['ready', 'paid'].includes(duty.stage) && (!review || review.day !== duty.day || !review.positive)) throw Error('invalid-career-state');
  return {version: 1, revision: saved.revision, skills: {ritual: saved.skills.ritual, writing: saved.skills.writing},
    tenure: saved.tenure === null ? null : {roleId: saved.tenure.roleId, slotId: saved.tenure.slotId,
      sinceDay: saved.tenure.sinceDay, sinceHour: saved.tenure.sinceHour},
    lastDuty: duty === null ? null : {roleId: duty.roleId, slotId: duty.slotId, day: duty.day, stage: duty.stage,
      started: duty.started, reason: duty.reason, arrivalHour: duty.arrivalHour, wage: duty.wage},
    lastPaidDay: saved.lastPaidDay, daily: {day: saved.daily.day, ritual: saved.daily.ritual, writing: saved.daily.writing},
    learning: Object.fromEntries(Object.keys(STUDIES).map(source => [source, {...saved.learning[source]}])),
    lowerWork: {'cn-tavern-labor': saved.lowerWork['cn-tavern-labor']}, performance: saved.performance,
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
export function createFormalCareers({saved, saveState, creditWageToBank, getClock,
  roles = FORMAL_CAREER_ROLES, slots = FORMAL_CAREER_SLOTS} = {}) {
  if (typeof saveState !== 'function' || typeof getClock !== 'function') {
    throw new TypeError('formal careers require synchronous saveState and getClock');
  }
  let current = empty(), loadError = null, lastError = null, saving = false, paying = false, lastClock = null;
  let observedDay = null, interruptedUnsaved = false;
  let roleMap = new Map(), slotMap = new Map();
  try { ({roleMap, slotMap} = catalogue(roles, slots)); current = restore(saved, roleMap, slotMap); }
  catch (error) { loadError = error.message === 'invalid-career-catalogue' ? error.message : 'invalid-career-state'; }
  try { const clock = getClock(); if (integer(clock?.day)) observedDay = clock.day; } catch { /* checked at mutation */ }
  const state = () => ({...copy(current), loadError, lastError});
  const failure = (code, reasons = [code]) => { lastError = code; return {ok: false, code, reasons: [...reasons]}; };
  function now() {
    let clock;
    try { clock = getClock(); } catch { return null; }
    if (!object(clock) || !integer(clock.day) || !Number.isFinite(clock.hour) || clock.hour < 0 || clock.hour >= 24 ||
      !Number.isFinite(clock.seconds) || clock.seconds < 0) return null;
    const days = [current.lastDuty?.day, current.tenure?.sinceDay, current.lastPaidDay, current.daily.day, current.lastEvaluatedDay,
      ...Object.values(current.learning).map(study => study.issuedDay)].filter(day => day != null);
    if (days.some(day => day > clock.day) || lastClock &&
      (clock.day < lastClock.day || clock.day === lastClock.day && clock.hour < lastClock.hour)) return null;
    lastClock = {...clock}; return clock;
  }
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
    const reasonText = positive ? wage > role.wage ? '提前到岗，朝会记录与归档均已完成' : '按时到岗，朝会记录与归档均已完成' :
      ({absent: '未按时到岗，缺席当日朝会', reloaded: '朝会中途离开，出勤记录未完成',
        resigned: '当日职责未完成即离任', 'day-ended': '当日朝会或归档未完成'})[reason] || '出勤中断，当日职责未完成';
    return {...next, performance: Math.max(-100, Math.min(100, next.performance + score)),
      promotionProgress: Math.max(0, Math.min(100, next.promotionProgress + score)), lastEvaluatedDay: duty.day,
      lastDuty: {...duty, wage: positive ? wage : null}, lastEvaluation: {
        id: `career-review:${duty.slotId}:${duty.day}`, evaluatorId: COURT_SUPERVISOR.id,
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
  function apply(roleId = COURT_CLERK_ROLE.id, {ageYears} = {}) {
    const blocked = allowed(); if (blocked) return blocked;
    const role = roleMap.get(roleId); if (!role) return failure('unknown-role');
    if (current.tenure) return failure('already-employed');
    const clock = now(); if (!clock) return failure('invalid-clock');
    const reasons = [];
    if (!Number.isFinite(ageYears) || ageYears < role.minimumAgeYears) reasons.push('adult-required');
    for (const [skill, minimum] of Object.entries(role.skillRequirements)) if (current.skills[skill] < minimum) reasons.push(`${skill}-required`);
    const slot = [...slotMap.values()].find(candidate => candidate.roleId === roleId && candidate.holderId === null);
    if (!slot) reasons.push('no-vacancy');
    if (reasons.length) return failure('ineligible', reasons);
    const result = persist({...current, tenure: {roleId, slotId: slot.id, sinceDay: clock.day, sinceHour: clock.hour}});
    return result.ok ? {...result, tenure: copy(current.tenure)} : result;
  }
  function resign() {
    const blocked = allowed(); if (blocked) return blocked;
    if (!current.tenure) return failure('not-employed');
    if (current.lastDuty?.stage === 'ready') return failure('wage-ready');
    const next = ['arrived', 'attending', 'archive'].includes(current.lastDuty?.stage) ? missed(current, 'resigned') : current;
    return persist({...next, tenure: null});
  }
  function learningTicket(source) {
    const blocked = allowed(); if (blocked) return blocked;
    if (!own(STUDIES, source)) return failure('unknown-learning-source');
    const clock = now(); if (!clock) return failure('invalid-clock');
    const issued = current.learning[source].issued + 1;
    if (!Number.isSafeInteger(issued)) return failure('learning-limit');
    const result = persist({...current, learning: {...current.learning, [source]: {...current.learning[source], issued, issuedDay: clock.day}}});
    return result.ok ? {ok: true, ticket: {source, id: `${source}:${issued}:${clock.day}`}} : result;
  }
  function grantSkill(next, skill, clock) {
    const daily = current.daily.day === clock.day ? {...current.daily} : {day: clock.day, ritual: 0, writing: 0};
    const limited = daily[skill] >= 4 ? 'daily-skill-limit' : current.skills.ritual + current.skills.writing >= 100 ? 'skill-limit' : null;
    const gained = limited ? 0 : 1;
    const result = persist({...next, daily: {...daily, [skill]: daily[skill] + gained},
      skills: {...current.skills, [skill]: current.skills[skill] + gained}});
    return result.ok ? {ok: true, skill, gained, limited} : result;
  }
  function completeLearning(ticket, {seconds} = {}) {
    const blocked = allowed(); if (blocked) return blocked;
    if (!object(ticket) || !own(STUDIES, ticket.source)) return failure('invalid-learning-ticket');
    const clock = now(); if (!clock) return failure('invalid-clock');
    const study = current.learning[ticket.source];
    if (study.issued === 0 || ticket.id !== `${ticket.source}:${study.issued}:${study.issuedDay}`) return failure('invalid-learning-ticket');
    if (study.completed >= study.issued) return failure('learning-replayed');
    if (study.issuedDay !== clock.day) return failure('learning-expired');
    if (!Number.isFinite(seconds) || seconds < 8) return failure('learning-incomplete');
    return grantSkill({...current, learning: {...current.learning, [ticket.source]: {...study, completed: study.issued}}}, STUDIES[ticket.source], clock);
  }
  function completedLowerWork({source, receiptId} = {}) {
    const blocked = allowed(); if (blocked) return blocked;
    if (source !== 'cn-tavern-labor') return failure('unknown-work-source');
    const match = typeof receiptId === 'string' && /^cn-tavern-labor-([1-9][0-9]*)$/.exec(receiptId);
    const serial = match ? Number(match[1]) : NaN;
    if (!integer(serial)) return failure('invalid-work-receipt');
    if (serial <= current.lowerWork[source]) return failure('work-replayed');
    const clock = now(); if (!clock) return failure('invalid-clock');
    return grantSkill({...current, lowerWork: {...current.lowerWork, [source]: serial}}, 'ritual', clock);
  }
  function beginDuty() {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
    if (!current.tenure) return failure('not-employed');
    const rollover = observeDay(); if (!rollover.ok) return rollover;
    const clock = now(); if (!clock) return failure('invalid-clock');
    const duty = current.lastDuty;
    if (duty?.stage === 'ready') return failure('wage-ready');
    if (current.lastPaidDay === clock.day) return failure('already-paid-today');
    if (duty?.day === clock.day && excused(duty)) return failure('court-postponed');
    if (duty?.day === clock.day && (duty.started || duty.stage === 'arrived')) return failure(duty.stage === 'missed' ? 'duty-missed' : 'duty-active');
    const role = roleMap.get(current.tenure.roleId);
    if (clock.hour < role.dutyWindow.startHour || clock.hour >= role.dutyWindow.endHour) return failure('outside-arrival-window');
    const next = duty && duty.day < clock.day && ['arrived', 'attending', 'archive'].includes(duty.stage) ? missed(current, 'day-ended') : current;
    return persist({...next, lastDuty: {roleId: current.tenure.roleId, slotId: current.tenure.slotId,
      day: clock.day, stage: 'arrived', started: false, reason: null, arrivalHour: clock.hour, wage: null}});
  }
  function dutyEvent(event) {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
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
      const next = duty && duty.day < clock.day && ['arrived', 'attending', 'archive'].includes(duty.stage) ? missed(current, 'day-ended') : current;
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
    if (!current.lastDuty || ['missed', 'paid', 'ready'].includes(current.lastDuty.stage)) return {ok: true, unchanged: true};
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
      current.lastEvaluatedDay !== null && current.lastEvaluatedDay >= day || duty?.stage === 'ready' ||
      duty?.day === day && excused(duty)) {
      observedDay = clock.day; return {ok: true, unchanged: true};
    }
    const incomplete = duty?.day === day ? {...duty, started: true} : {roleId: tenure.roleId, slotId: tenure.slotId,
      day, stage: 'missed', started: true, reason: null, arrivalHour: null, wage: null};
    const result = persist(missed({...current, lastDuty: incomplete}, 'day-ended'));
    if (result.ok) { observedDay = clock.day; interruptedUnsaved = false; }
    return result;
  }
  function settle() {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
    const duty = current.lastDuty;
    if (duty?.stage !== 'ready') return failure('work-incomplete');
    if (!now()) return failure('invalid-clock');
    if (typeof creditWageToBank !== 'function') return failure('bank-unavailable');
    const receiptId = `career:${duty.slotId}:${duty.day}`;
    const deposit = {amount: duty.wage, receiptId, currency: 'copper',
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
    apply, resign, learningTicket, completeLearning, completedLowerWork, beginDuty, dutyEvent, interruptDuty, observeDay, settle});
}
