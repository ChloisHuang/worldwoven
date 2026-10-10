// Player-only physical adapter for the original six public-duty source books.
// The common intent planner owns travel. This controller never moves an NPC,
// appoints/promotes anyone, pays wages, grants XP, or starts work on panel open.
import * as THREE from 'three';
import {COURT_CAREER_PLACE as P} from './china-court-career-place.js';
import {officialTenureId} from './official-career-progress.js';
import {CHINA_PERSONNEL_OFFICIALS_V1 as OFFICIALS} from './china-personnel-records.js';
import {createChinaPersonnelWork, chinaPersonnelWorkRankId, CHINA_PERSONNEL_WORK_DURATIONS as D, CHINA_PERSONNEL_REVIEWER as LU} from './china-personnel-work.js';
import {isChinaPersonnelRank} from './china-official-ranks.js';

const PROVIDER = 'china-personnel-career', ROLE = 'cn-court-clerk';
const TRIAL_RANK = 'cn-records-regular';
const copy = value => structuredClone(value);
const point = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b, reach = .18) => point(a) && point(b) && Math.abs(a[1] - b[1]) < .3 && Math.hypot(a[0] - b[0], a[2] - b[2]) <= reach;
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const actorId = actor => actor?.actorId || actor?.station?.id;
const bodyId = (actor, fallback) => actor?.bodyId || actor?.root?.userData?.bodyId || actorId(actor) || fallback;
// Side points stay clear of the seated original authors and the upper aisle's
// bedroom wall. They face each existing bound book, not the NPC's body centre.
export const CHINA_PERSONNEL_READ_PLACES = freeze(OFFICIALS.map((official, i) => ({
  actorId: official.actorId, position: [official.office[0] - .72, official.office[1], official.office[2]],
  target: [official.office[0] - (i < 2 ? .43 : .4), official.office[1] + 1.02, i < 2 ? 31.30 : 31.24],
})));
const places = new Map(CHINA_PERSONNEL_READ_PLACES.map(place => [place.actorId, place]));
const officials = new Map(OFFICIALS.map(official => [official.actorId, official]));
const reasonText = {
  'save-failed': '名册暂未保存，原核验凭据保留，稍后重试。',
  'async-save-unsupported': '名册暂未保存，原核验凭据保留，稍后重试。',
  'persistence-unavailable': '名册保存暂不可用，请保留当前进度。',
  'source-unavailable': '本日尚无已入册的朝班原件，请稍后查看。',
  'source-mismatch': '原件边界无法核对，本次办理已暂停。',
  'appointment-mismatch': '当前任职已变化，本次办理已暂停，原名册仍保留。',
  'roster-rejected': '陆谦已逐项批回不符记录，请查看批注、修正后重新编册。',
};
const retryCodes = new Set(['save-failed', 'async-save-unsupported', 'persistence-unavailable']);

/**
 * enabled defaults off until the complete appointment route is released.
 * standing(player) must describe the real current posture; getBusy includes
 * open windows and other activities. getLu returns the original live NPC.
 * Meeting callbacks share the existing audience/social leases. bodyId may be
 * supplied by that actor; stable actor ID is the legacy body identity fallback,
 * additionally fenced by the actual runtime object during each interaction.
 *
 * saveState(candidate) synchronously saves the WHOLE detached adapter snapshot.
 * During that callback snapshot() also exposes the same candidate core journal,
 * before the core adopts it, so a parent world capture can mirror it atomically
 * into both top-level and continuity saves. False, throw and Promise fail closed.
 * personnelWorkState() is the committed-only eligibility getter: formal pay or
 * promotion checks must never read the in-flight snapshot() save candidate.
 * update(dt) accepts actual frame elapsed only; capped frames never catch up
 * offline time. Restoring a partial activity resumes from its saved progress.
 */
export function createChinaPersonnelCareer({careers, audience, getPlayer, getClock,
  enabled = false, standing = player => !!player && !player.walking && player.alive !== false,
  getBusy = () => false, canSee = () => true, getLu = () => null, isLuBusy = () => false,
  getMeetingPoint = (_actor, fallback) => fallback, getReadingPoint = id => places.get(id)?.position, requestMeeting = () => false,
  meetingHeld = () => false, releaseMeeting: releaseExternal = () => {},
  resumeApproach = () => {}, onWaiting = () => {}, meetingStatus = () => '原事务尚未结束',
  notify = () => {}, openPersonnel = () => {}, documentObject = null, saved, saveState} = {}) {
  if (saved && typeof saved === 'object' && Object.hasOwn(saved, 'continuity')) {
    const {continuity, ...top} = saved;
    saved = continuity?.version === 1 ? continuity : Object.keys(top).length ? top : continuity === null ? undefined : saved;
  }
  let activity = null, heldLu = null, reviewAnchor = null, watchedLu = null, watchedPlayer = null, retirementRetryIn = 0, retirementCheck = null;
  let disposed = false, saving = false, candidateSnapshot = null, loadError = null, lastError = null;
  const documentHome = documentObject ? {parent: documentObject.parent, position: documentObject.position.clone(), rotation: documentObject.rotation.clone(), scale: documentObject.scale.clone()} : null;
  const compileTarget = documentObject ? documentObject.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .015, 0)).toArray() : [...P.archiveTarget];
  const enabledNow = () => !disposed && (typeof enabled === 'function' ? enabled() === true : enabled === true);
  const sourceFor = (day, serial) => audience?.personnelSource?.(day, serial);
  function appointment() {
    const role = careers?.currentRole?.(), tenure = careers?.workState?.().tenure;
    const mode = role?.rankId === TRIAL_RANK ? 'trial' : isChinaPersonnelRank(role?.rankId) ? 'duty' : null;
    if (!careers?.isHired?.(ROLE) || role?.id !== ROLE || !mode) return null;
    return {actorId: 'player', tenureId: officialTenureId(tenure), rankId: role.rankId, mode};
  }
  function personnelDuty(owner = appointment()) {
    const duty = careers?.workState?.().lastDuty;
    return owner?.mode === 'duty' && duty?.roleId === ROLE && duty.slotId === 'cn-court-clerk-1' &&
      duty.officialPayVersion === 2 && duty.officialRankId === owner.rankId && duty.officialTenureId === owner.tenureId &&
      duty.started === true ? duty : null;
  }
  function eligible(request) {
    if (request.actorId !== 'player' || !(request.mode === 'trial' ? request.rankId === TRIAL_RANK : request.mode === 'duty' && isChinaPersonnelRank(request.rankId))) return false;
    const state = careers?.state?.();
    if (!state || state.loadError) return false;
    const ledger = state.officialCareer, owner = ledger?.appointments.find(row => row.id === request.officialTenureId);
    if (!owner || request.day < owner.tenure.sinceDay || owner.endedAt && request.day > owner.endedAt.day) return false;
    // A tenure persists through promotions. Walk its actual ordered assignment
    // chain, rather than taking the first approved row or requiring today's rank
    // while restoring a signed trial or an ended appointment's original cases.
    let rankId = 'cn-records-junior', rankDay = owner.tenure.sinceDay, historicalRank = false;
    for (const promotion of ledger.applications.filter(row => row.appointmentId === owner.id && row.status === 'approved')) {
      if (promotion.fromRankId !== rankId) return false;
      if (rankId === request.rankId && request.day >= rankDay && request.day <= promotion.decidedAt.day) historicalRank = true;
      rankId = promotion.toRankId; rankDay = promotion.decidedAt.day;
    }
    historicalRank ||= rankId === request.rankId && request.day >= rankDay;
    if (!historicalRank) return false;
    if (request.mode === 'trial') return request.phase === 'restore' || appointment()?.tenureId === request.officialTenureId;
    const matchesDuty = duty => duty?.roleId === ROLE && duty.slotId === 'cn-court-clerk-1' && duty.officialPayVersion === 2 && duty.officialRankId === request.rankId &&
      duty.officialTenureId === request.officialTenureId && duty.day === request.day && duty.started === true;
    if (request.phase === 'restore') {
      if (matchesDuty(state.lastDuty)) return true;
      // Once an old day is settled/ended, its real evaluated personal duty is
      // the historical ownership evidence; the public six-official source is
      // separately validated by the journal and cannot manufacture service.
      return ledger.service.some(row => row.appointmentId === request.officialTenureId && row.rankId === request.rankId && row.day === request.day &&
        row.officialPayVersion === 2 && row.officialRankId === request.rankId && row.officialTenureId === request.officialTenureId &&
        (!row.positive || row.personnelWork?.id === request.caseId));
    }
    const activeOwner = appointment(), duty = personnelDuty(activeOwner);
    return activeOwner?.tenureId === request.officialTenureId && matchesDuty(duty) && duty.stage === 'archive' &&
      (duty.day === getClock()?.day || duty.personnelDeferral?.caseId === request.caseId);
  }
  function liveLu() {
    const actor = getLu();
    if (!actor?.root || actorId(actor) !== LU || actor.alive === false) return null;
    return {actor, actorId: LU, bodyId: bodyId(actor, LU), alive: true, position: actor.root.position.toArray()};
  }
  function snapshot(workCandidate) {
    if (candidateSnapshot && !workCandidate) return copy(candidateSnapshot);
    if (loadError && saved !== undefined && !workCandidate) return copy(saved);
    return {version: 1, work: copy(workCandidate ?? work.snapshot()), activity: activity ? copy(activity) : null};
  }
  const work = createChinaPersonnelWork({sourceFor, readAppointment: appointment, validateEligibility: eligible,
    resolveActor: () => { const row = liveLu(); return row && {actorId: row.actorId, bodyId: row.bodyId, alive: row.alive, position: row.position}; },
    saved: saved?.work,
    saveState(candidate) {
      if (typeof saveState !== 'function') return false;
      saving = true; candidateSnapshot = freeze(snapshot(candidate));
      try {
        const result = saveState(candidateSnapshot);
        if (result?.then) { Promise.resolve(result).catch(() => {}); return false; }
        return result !== false && result?.ok !== false;
      } finally { candidateSnapshot = null; saving = false; }
    },
  });
  loadError = work.loadError;
  function releaseMeeting() { heldLu = null; reviewAnchor = null; releaseExternal(); }
  function persistRuntime() {
    if (typeof saveState !== 'function') return false;
    saving = true; candidateSnapshot = freeze(snapshot());
    try {
      const result = saveState(candidateSnapshot);
      if (result?.then) { Promise.resolve(result).catch(() => {}); return false; }
      return result !== false && result?.ok !== false;
    } catch { return false; }
    finally { candidateSnapshot = null; saving = false; }
  }
  function clearActivity() {
    activity = null; watchedLu = null; watchedPlayer = null; releaseMeeting(); syncDocument();
  }
  function stopActivity() {
    if (saving || disposed) return false;
    const hadActivity = !!activity; clearActivity();
    // A failed immediate cancellation remains idle in memory, so the next
    // normal world checkpoint retains it without resuming a released lease.
    return !hadActivity || persistRuntime();
  }
  function syncDocument() {
    if (!documentObject || !documentHome) return;
    const job = work.current(), held = activity?.kind.startsWith('review') && activity.kind !== 'review-wait';
    const hand = getPlayer()?.root?.userData?.hands?.[1];
    documentObject.userData.personnelCaseId = job?.id || null;
    documentObject.visible = enabledNow() && !!job;
    if (held && hand && documentObject.visible) {
      if (documentObject.parent !== hand) hand.add(documentObject);
      const actor = getPlayer(), body = actor.root.userData.body, authored = actor.getAuthoredHandPose?.(1);
      if (actor.root.userData.tools?.book) actor.root.userData.tools.book.visible = false;
      if (body && authored && actor.fitExternalHandGrip) {
        const anchor = new THREE.Vector3(...authored.position), rotation = new THREE.Quaternion(...authored.quaternion);
        const offset = new THREE.Vector3(0, -.055, .035), paperRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(.2, 0, Math.PI / 2));
        const target = new THREE.Vector3(.075, .0125, .05).applyQuaternion(paperRotation).add(offset).applyQuaternion(rotation).add(anchor);
        actor.fitExternalHandGrip({side: 1, target: target.toArray(), support: false}); actor.root.updateWorldMatrix(true, true);
        const desired = new THREE.Matrix4().compose(anchor, rotation, new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().compose(offset, paperRotation, documentHome.scale));
        desired.premultiply(body.matrixWorld).premultiply(hand.matrixWorld.clone().invert()).decompose(documentObject.position, documentObject.quaternion, documentObject.scale);
      } else { documentObject.position.set(0, -.055, .035); documentObject.rotation.set(.2, 0, Math.PI / 2); }
    } else {
      if (documentHome.parent && documentObject.parent !== documentHome.parent) documentHome.parent.add(documentObject);
      documentObject.position.copy(documentHome.position); documentObject.rotation.copy(documentHome.rotation); documentObject.scale.copy(documentHome.scale);
    }
  }
  function readingPoint(id) {
    const office = officials.get(id)?.office;
    if (!office) return null;
    const result = getReadingPoint(id, [...office]);
    return point(result) && near(result, office, 1.2) ? [...result] : null;
  }
  const current = () => work.current();
  const owned = job => {
    const owner = appointment();
    if (!job || job.mode !== owner?.mode || job.officialTenureId !== owner.tenureId || chinaPersonnelWorkRankId(job) !== owner.rankId) return false;
    const duty = job.mode === 'duty' ? personnelDuty(owner) : null;
    return job.mode === 'trial' || duty?.day === job.day && duty.stage === 'archive' &&
      (duty.day === getClock()?.day || duty.personnelDeferral?.caseId === job.id);
  };
  function shownCase() {
    const rows = work.snapshot()?.cases, all = Array.isArray(rows) ? rows : [], owner = appointment();
    return current() || all.findLast(job => job.mode === owner?.mode && job.officialTenureId === owner.tenureId && chinaPersonnelWorkRankId(job) === owner.rankId) ||
      all.findLast(job => job.officialTenureId === owner?.tenureId) || all.at(-1) || null;
  }
  function availability() {
    if (!enabledNow()) return {ok: false, code: 'disabled'};
    if (loadError) return {ok: false, code: loadError};
    if (!documentObject) return {ok: false, code: 'document-unavailable'};
    const owner = appointment(); if (!owner) return {ok: false, code: 'regular-clerk-required'};
    const jobs = work.snapshot().cases;
    if (current()) return {ok: false, code: owned(current()) ? `${owner.mode}-in-progress` : 'unfinished-case', mode: owner.mode, sourceDay: current().day};
    if (owner.mode === 'trial' && jobs.some(job => job.officialTenureId === owner.tenureId && job.mode === 'trial' && job.status === 'signed')) return {ok: false, code: 'trial-already-signed', mode: owner.mode};
    const duty = personnelDuty(owner), day = owner.mode === 'duty' ? duty?.day : getClock()?.day;
    if (owner.mode === 'duty' && (duty?.stage !== 'archive' || day !== getClock()?.day)) return {ok: false, code: 'personnel-court-required', mode: owner.mode};
    if (!Number.isSafeInteger(day) || !sourceFor(day)?.audience) return {ok: false, code: 'source-unavailable', mode: owner.mode};
    if (jobs.some(job => job.officialTenureId === owner.tenureId && job.day === day)) return {ok: false, code: 'source-already-claimed', mode: owner.mode, sourceDay: day};
    return {ok: true, code: 'available', mode: owner.mode, sourceDay: day};
  }
  function parse(kind) {
    if (['personnel-claim', 'personnel-view', 'personnel-compile', 'personnel-review', 'personnel-cancel'].includes(kind)) return {type: kind.slice(10)};
    const parts = kind?.split(':');
    if (parts?.[0] === 'personnel-read' && parts.length === 2 && places.has(parts[1])) return {type: 'read', actorId: parts[1]};
    if (parts?.[0] === 'personnel-record' && parts.length === 3 && places.has(parts[1]) && ['accepted', 'awaiting'].includes(parts[2])) return {type: 'record', actorId: parts[1], answer: parts[2]};
    return null;
  }
  function bindReviewPoint(lu, selected) {
    reviewAnchor = {actor: lu.actor, bodyId: lu.bodyId, position: [...lu.position], point: [...selected.position], caseId: activity.caseId, revision: activity.revision};
  }
  function reviewPoint(lu) {
    // Keep only the same live reservation stable when other NPCs pass nearby.
    // Cold restoration must obtain a fresh lease before binding any point.
    if (reviewAnchor && heldLu === lu.actor && reviewAnchor.actor === lu.actor && reviewAnchor.bodyId === lu.bodyId &&
        activity?.caseId === reviewAnchor.caseId && current()?.id === reviewAnchor.caseId && current()?.revision === reviewAnchor.revision &&
        ['review-approach', 'review'].includes(activity.kind) && meetingHeld(lu.actor) && equal(reviewAnchor.position, lu.position)) return [...reviewAnchor.point];
    reviewAnchor = null;
    const [x, y, z] = lu.position;
    const fallback = [x + (x > 24.5 ? -.78 : .78), y, z];
    const result = getMeetingPoint(lu.actor, fallback);
    return point(result) && near(result, lu.position, 2) ? [...result] : null;
  }
  function intent(kind = 'personnel-view') {
    if (!enabledNow() || loadError) return null;
    const action = parse(kind); if (!action) return null;
    const job = current(), owner = appointment(), row = job?.rows.find(row => row.actorId === action.actorId);
    if (action.type === 'cancel') return activity ? {id: 'cn-' + kind, provider: PROVIDER, kind, position: getPlayer()?.root.position.toArray() || [...P.registration],
      action: '取消当前吏籍办理', name: current()?.mode === 'duty' ? '吏籍日职' : '吏籍试办', intentKey: activity.caseId + ':' + activity.kind, executionRadius: .18, interactionRadius: 2.8, contextControl: true} : null;
    if (action.type === 'view' && !owner && !work.snapshot()?.cases?.length) return null;
    if (action.type === 'claim' && (!availability().ok || activity)) return null;
    if (!['claim', 'view'].includes(action.type) && (!owned(job) || job.status !== 'draft')) return null;
    if (['compile', 'review'].includes(action.type) && !documentObject) return null;
    if (action.type === 'record' && !row?.visit) return null;
    if (action.type === 'compile' && (job.rows.some(row => !row.visit || !row.archiveStatus) || job.compiled)) return null;
    if (action.type === 'review' && (!job.compiled || job.reviews.some(row => row.revision === job.revision))) return null;
    if (activity && !['view', 'record'].includes(action.type) && kind !== activity.intentKind) return null;
    const lu = action.type === 'review' ? liveLu() : null;
    if (action.type === 'review' && (!lu || personnelDuty()?.personnelDeferral?.reviewerBodyId && personnelDuty().personnelDeferral.reviewerBodyId !== lu.bodyId)) return null;
    const place = places.get(action.actorId), reading = place ? readingPoint(action.actorId) : null, meeting = lu ? reviewPoint(lu) : null;
    if (place && !reading) return null;
    const position = place ? reading : action.type === 'compile' ? P.archive : lu ? meeting || P.registration : P.registration;
    const mode = job?.mode || owner?.mode, title = mode === 'duty' ? '吏籍日职' : '吏籍试办';
    const name = place ? `${officials.get(action.actorId).name} · 原始案簿` : action.type === 'compile' ? '礼务归档案 · 编列吏籍' : lu ? '陆谦 · 当面核阅' : `铨录登记 · ${title}`;
    const labels = {claim: mode === 'duty' ? '领取本人朝次六官核籍日职' : '领取本日六官吏籍试办', view: `查看${title}名册`, read: '翻阅原始案簿 · 3秒',
      record: action.answer === 'accepted' ? '登记：原件已归档' : '登记：尚待原件', compile: '编列六官名册 · 8秒', review: '向陆谦呈册核阅 · 4秒'};
    return {id: 'cn-' + kind, provider: PROVIDER, kind, name, npcName: place ? officials.get(action.actorId).name : lu ? '陆谦' : '吏籍簿',
      position: [...position], action: labels[action.type], intentKey: [owner?.tenureId, owner?.rankId, job?.id, chinaPersonnelWorkRankId(job), job?.revision, row?.visit?.id, job?.day ?? availability().sourceDay ?? getClock()?.day, kind, lu?.bodyId].join('|'),
      executionRadius: .18, interactionRadius: 2.8, priority: 54,
      ...(lu ? {awaitingReception: !meeting, visualAnchor: {actorId: LU}} : {}), ...(place ? {playerWorkTarget: [...place.target]} : {})};
  }
  function resolveIntent(selected) {
    const next = intent(selected?.kind);
    return next && selected?.provider === PROVIDER && selected.id === next.id && selected.intentKey === next.intentKey ? next : null;
  }
  function actorReady(player = getPlayer()) {
    return !!player?.root && player.alive !== false && !player.walking && standing(player) === true && !getBusy();
  }
  const sourceVisible = id => { const p = places.get(id), office = officials.get(id)?.office; return !!p && canSee({position: [p.target[0], office[1], p.target[2]], sourceActorId: id}) === true; };
  const at = selected => near(getPlayer()?.root?.position.toArray(), selected.position) && canSee(selected) === true;
  function makeActivity(selected, type) {
    const job = current(), player = getPlayer(), lu = type.startsWith('review') ? liveLu() : null;
    watchedPlayer = player; watchedLu = lu?.actor || null;
    return {kind: type, intentKind: selected.kind, caseId: job.id, actorId: parse(selected.kind).actorId || (lu ? LU : 'cn-court-career-desk'),
      revision: job.revision, point: [...selected.position], progress: 0, arrivalPending: !!player.walking,
      playerBodyId: bodyId(player, 'player'), luBodyId: lu?.bodyId || null, waitingPoint: player.root.position.toArray(), proof: null, retryIn: 0};
  }
  function deferBusyReview(lu) {
    const job = current(), duty = personnelDuty();
    if (job?.mode !== 'duty' || !job.compiled || activity?.kind !== 'review-wait' ||
        activity.caseId !== job.id || lu?.actor !== watchedLu || lu?.bodyId !== activity.luBodyId) return;
    if (duty?.personnelDeferral?.caseId === job.id) { activity.deferralPending = false; return; }
    // Lack of a stand point/lease alone is not proof that Lu is busy. The core
    // independently checks the same live actor's busy state and personal duty.
    if (meetingAvailable(lu) && isLuBusy(lu.actor) !== true || duty?.day !== getClock()?.day || duty.stage !== 'archive') return;
    activity.deferralPending = true;
    let result;
    saving = true;
    try { result = careers?.deferPersonnelReview?.({caseId: job.id}) || {ok: false, code: 'persistence-unavailable'}; }
    catch { result = {ok: false, code: 'save-failed'}; }
    finally { saving = false; }
    if (result?.then) { Promise.resolve(result).catch(() => {}); result = {ok: false, code: 'async-save-unsupported'}; }
    if (result.ok) { activity.deferralPending = false; lastError = null; }
    else if (lastError !== result.code) {
      lastError = result.code || 'save-failed';
      notify('陆谦仍在处理原事务；本次跨日等候凭据尚未保存，原名册与预约保留，将在等候中重试。');
    }
  }
  function queueReview(selected) {
    const prior = activity?.intentKind === selected.kind ? activity : null;
    releaseMeeting(); activity = prior || makeActivity(selected, 'review-wait'); activity.kind = 'review-wait'; activity.waitingPoint = getPlayer().root.position.toArray(); syncDocument();
    deferBusyReview(liveLu()); if (current()?.mode === 'duty') activity.retryIn = 1;
    onWaiting(); notify(`陆谦：${meetingStatus(watchedLu)}。已预约本次核阅；移动或取消可撤销等候，名册仍保留。`); return true;
  }
  function meetingAvailable(lu) {
    return !!lu && !lu.actor.walking && (!audience?.meetingAvailable || audience.meetingAvailable(lu.actor) === true);
  }
  function prepareIntent(selected) {
    if (saving || disposed) return false;
    const next = resolveIntent(selected); if (!next) return false;
    if (next.kind !== 'personnel-review') return true;
    const lu = liveLu();
    if (!lu || watchedLu && activity?.intentKind === next.kind && watchedLu !== lu.actor) { stopActivity(); return false; }
    if (next.awaitingReception || !meetingAvailable(lu) || !requestMeeting(lu.actor)) return queueReview(next);
    if (!activity || activity.intentKind !== next.kind) activity = makeActivity(next, 'review-approach');
    activity.kind = 'review-approach'; activity.point = [...next.position]; heldLu = lu.actor; watchedLu = lu.actor; bindReviewPoint(lu, next); syncDocument();
    return true;
  }
  function report(result, success) {
    lastError = result?.ok ? null : result?.code || 'save-failed';
    if (!result?.ok) notify(reasonText[lastError] || '本次办理未完成，请核对原件和任职后重试。');
    else if (success) notify(success);
    return result?.ok === true;
  }
  function sourcePanel(id) {
    const job = shownCase(), row = job?.rows.find(row => row.actorId === id);
    if (!row?.visit) return null;
    return {actorId: id, caseId: job.id, day: job.day, throughSerial: job.source.throughSerial, originalRead: true,
      original: copy(job.source.archives.find(row => row.actorId === id) || null),
      choices: ['accepted', 'awaiting'].map(answer => intent(`personnel-record:${id}:${answer}`)).filter(Boolean)};
  }
  function executeIntent(selected) {
    if (saving || disposed) return false;
    const next = resolveIntent(selected); if (!next) return false;
    const action = parse(next.kind);
    if (action.type === 'cancel') return stopActivity();
    if (!at(next) || getBusy()) return false;
    if (action.type === 'view') { openPersonnel({country: 'china', roleId: ROLE, scope: 'role'}); return true; }
    if (action.type === 'claim') {
      if (!actorReady()) return false;
      const available = availability(); if (!available.ok) return false;
      const result = work.claim({day: available.sourceDay, mode: available.mode, officialTenureId: appointment()?.tenureId});
      const ok = report(result, '已领取本日原件边界。请逐案翻阅六位官员案簿，再自行登记原件状态。');
      if (ok) { syncDocument(); openPersonnel({country: 'china', roleId: ROLE, scope: 'role'}); } return ok;
    }
    if (action.type === 'record') {
      if (!actorReady() || activity) return false;
      const ok = report(work.record({caseId: current().id, actorId: action.actorId, archiveStatus: action.answer}), '此项原件状态已记录。');
      if (ok) openPersonnel({actorId: action.actorId, country: 'china', roleId: ROLE, scope: 'role'}); return ok;
    }
    if (action.type === 'read' && current().rows.find(row => row.actorId === action.actorId).visit) {
      if (!actorReady()) return false;
      openPersonnel({actorId: action.actorId, country: 'china', roleId: ROLE, scope: 'role'}); return true;
    }
    if (action.type === 'review') {
      if (!heldLu || !meetingHeld(heldLu)) { if (!prepareIntent(next)) return false; if (activity.kind === 'review-wait') return true; }
      if (!activity || activity.caseId !== current().id) return false;
      activity.kind = 'review'; activity.arrivalPending = !!getPlayer()?.walking; activity.recipientAnchor = liveLu()?.position;
    } else {
      if (activity) return false;
      activity = makeActivity(next, action.type);
    }
    syncDocument(); return true;
  }
  function validActivity() {
    const job = work.snapshot()?.cases?.find(row => row.id === activity?.caseId), player = getPlayer();
    if (!activity || !job || !owned(job) || job.revision !== activity.revision || player !== watchedPlayer ||
        bodyId(player, 'player') !== activity.playerBodyId || player?.alive === false) return false;
    if (activity.kind.startsWith('review')) {
      const lu = liveLu();
      if (!lu || lu.actor !== watchedLu || lu.bodyId !== activity.luBodyId || !job.compiled) return false;
    }
    return job;
  }
  function proofFor(job) {
    const phase = parse(activity.intentKind).type, kind = phase === 'read' ? 'visit' : phase, lu = kind === 'review' ? liveLu() : null;
    return {caseId: job.id, actorId: 'player', targetId: activity.actorId, position: getPlayer().root.position.toArray(),
      standing: true, clear: true, elapsed: D[kind], duration: D[kind],
      ...(kind !== 'visit' ? {revision: job.revision} : {}),
      ...(lu ? {recipientPosition: lu.position, recipientBodyId: lu.bodyId, recipientAlive: true} : {})};
  }
  function finish(job) {
    const kind = activity.kind === 'read' ? 'visit' : activity.kind;
    activity.proof ||= freeze(proofFor(job));
    const input = {caseId: job.id, proof: activity.proof, ...(kind === 'visit' ? {actorId: activity.actorId} : {})};
    const result = work[kind](input);
    if (result.ok || result.code === 'roster-rejected') {
      const id = activity.actorId; clearActivity();
      report(result, kind === 'visit' ? '原始案簿已阅，请自行选择登记状态。' : kind === 'compile' ? '六官名册已编列，请向陆谦当面呈册。' : job.mode === 'duty' ? '陆谦已签收本朝次核籍名册，请回原案完成本人归档。' : '陆谦已签收本任次试办名册，试办完成。');
      openPersonnel({country: 'china', roleId: ROLE, scope: 'role', ...(kind === 'visit' ? {actorId: id} : {})}); return;
    }
    if (retryCodes.has(result.code)) {
      activity.retryIn = 1;
      if (lastError !== result.code) report(result);
    } else { stopActivity(); report(result); }
  }
  function retireFinishedCase(elapsed) {
    const job = current();
    if (!enabledNow() || loadError || !job) return;
    const projection = careers?.workState?.(), day = getClock()?.day;
    const key = [job.id, projection?.revision, day].join('|');
    if (retirementCheck?.key !== key) {
      const state = careers?.state?.(), ledger = state?.officialCareer;
      const owner = ledger?.appointments.find(row => row.id === job.officialTenureId);
      const ended = !state?.loadError && !!owner?.endedAt;
      // A durable, evaluated missed personal shift may retire only its exact
      // old-day draft. A deferred review has no negative service and is never
      // discarded. Reading committed formal state avoids seeing a save candidate.
      const missed = !state?.loadError && !!owner && job.mode === 'duty' && job.day < day && ledger.service.some(row =>
        row.id === `career-review:cn-court-clerk-1:${job.day}` && row.appointmentId === job.officialTenureId &&
        row.day === job.day && row.rankId === chinaPersonnelWorkRankId(job) && row.officialPayVersion === 2 &&
        row.officialRankId === chinaPersonnelWorkRankId(job) && row.officialTenureId === job.officialTenureId &&
        row.positive === false && row.score === -1 && row.wage === 0 && row.personnelWork === null && row.personnelDeferral === null);
      retirementCheck = {key, ended, missed};
    }
    if (!retirementCheck.ended && !retirementCheck.missed) return;
    // Both exits retain every original read, answer and source. Temporary body,
    // rank, window or scene changes alone are never reasons to abandon a case.
    if (activity) clearActivity();
    retirementRetryIn = Math.max(0, retirementRetryIn - elapsed); if (retirementRetryIn > 1e-8) return;
    const result = work.abandon({caseId: job.id});
    if (result.ok) {
      retirementRetryIn = 0; lastError = null; syncDocument();
      if (retirementCheck.missed && !retirementCheck.ended) notify('上一朝次已按未完成入档，旧核籍单已作废留存；可办理下一班原件。');
    } else { retirementRetryIn = 1; if (lastError !== result.code) report(result); }
  }
  function update(dt) {
    if (saving || disposed) return;
    const elapsed = Math.max(0, Math.min(.1, Number.isFinite(dt) ? dt : 0));
    retireFinishedCase(elapsed); syncDocument(); if (!activity) return;
    if (!enabledNow()) { stopActivity(); return; }
    const job = validActivity(); if (!job) { stopActivity(); return; }
    const player = getPlayer();
    if (activity.kind === 'review-wait') {
      if (!actorReady(player) || !near(player.root.position.toArray(), activity.waitingPoint)) { stopActivity(); return; }
      activity.retryIn = Math.max(0, activity.retryIn - elapsed); if (activity.retryIn > 1e-8) return;
      activity.retryIn = 1;
      const next = intent('personnel-review'), lu = liveLu();
      deferBusyReview(lu);
      if (!next || next.awaitingReception || !meetingAvailable(lu)) return;
      if (!requestMeeting(lu.actor)) return;
      heldLu = lu.actor; activity.kind = 'review-approach'; activity.point = [...next.position]; bindReviewPoint(lu, next); syncDocument();
      if (resumeApproach(next) === false) stopActivity(); return;
    }
    if (activity.kind === 'review-approach') {
      if (!meetingHeld(heldLu) || getBusy()) stopActivity();
      return;
    }
    const selected = {position: activity.point, provider: PROVIDER, kind: activity.intentKind};
    if (!at(selected) || getBusy() || activity.kind === 'read' && (!equal(readingPoint(activity.actorId), activity.point) || !sourceVisible(activity.actorId))) { stopActivity(); return; }
    if (activity.arrivalPending && player.walking) return;
    activity.arrivalPending = false;
    if (!actorReady(player)) { stopActivity(); return; }
    if (activity.kind === 'review') {
      const lu = liveLu();
      if (!documentObject || documentObject.parent !== player.root.userData.hands?.[1] || documentObject.userData.personnelCaseId !== job.id || !heldLu || heldLu !== lu?.actor || !meetingHeld(heldLu) || !meetingAvailable(lu) || lu.actor.root.visible === false || !equal(activity.recipientAnchor, lu.position) || !near(player.root.position.toArray(), lu.position, 2) ||
          canSee({position: lu.position, visualAnchor: {actorId: LU}}) !== true || activity.proof && !equal(activity.proof.recipientPosition, lu.position)) { stopActivity(); return; }
    }
    const target = activity.kind === 'read' ? places.get(activity.actorId).target : activity.kind === 'compile' ? compileTarget : liveLu().position;
    player.root.rotation.y = Math.atan2(target[0] - player.root.position.x, target[2] - player.root.position.z);
    if (activity.proof) { activity.retryIn = Math.max(0, activity.retryIn - elapsed); if (activity.retryIn > 1e-8) return; finish(job); return; }
    const duration = D[activity.kind === 'read' ? 'visit' : activity.kind];
    activity.progress = Math.min(duration, activity.progress + elapsed);
    if (activity.progress >= duration - 1e-8) { activity.progress = duration; finish(job); }
  }
  function restore(value) {
    if (saving || disposed || value?.version !== 1 || !equal(value.work, work.snapshot())) return false;
    const record = value.activity;
    if (record !== null && (!record || !['read', 'compile', 'review', 'review-wait', 'review-approach'].includes(record.kind) ||
        !parse(record.intentKind) || !point(record.point) || !point(record.waitingPoint) || !Number.isFinite(record.progress) || record.progress < 0 ||
        !Number.isFinite(record.retryIn) || record.retryIn < 0 || record.retryIn > 1 || typeof record.arrivalPending !== 'boolean' ||
        record.deferralPending !== undefined && typeof record.deferralPending !== 'boolean')) return false;
    clearActivity();
    if (!record || !enabledNow()) return true;
    activity = copy(record); watchedPlayer = getPlayer(); watchedLu = activity.kind.startsWith('review') ? liveLu()?.actor : null;
    const duration = D[activity.kind === 'read' ? 'visit' : activity.kind.startsWith('review') ? 'review' : 'compile'];
    const job = validActivity();
    if (!job && work.snapshot()?.cases?.some(row => row.id === record.caseId)) { clearActivity(); return true; }
    const type = parse(activity.intentKind).type, proof = record.proof;
    const validProof = !proof || record.progress === duration && proof.caseId === job?.id && proof.actorId === 'player' && proof.targetId === record.actorId &&
      proof.standing === true && proof.clear === true && proof.duration === duration && proof.elapsed === duration && near(proof.position, record.point) &&
      (type === 'read' || proof.revision === record.revision) && (type !== 'review' || proof.recipientAlive === true && proof.recipientBodyId === record.luBodyId && near(proof.position, proof.recipientPosition, 2));
    if (!job || activity.progress > duration || !validProof ||
        type === 'read' && (!places.has(activity.actorId) || !near(activity.point, officials.get(activity.actorId).office, 1.2)) ||
        type === 'compile' && !equal(activity.point, P.archive)) { clearActivity(); return false; }
    const completed = type === 'read' ? job.rows.find(row => row.actorId === record.actorId)?.visit : type === 'compile' ? job.compiled?.proof : job.reviews.find(row => row.revision === record.revision)?.proof;
    if (proof && completed) {
      const {id, ...original} = completed;
      if (!equal(original, proof)) { clearActivity(); return false; }
      clearActivity(); return true;
    }
    // Saved review progress can wait for the SAME body to finish its own task;
    // it never restores a private lease over a meal, toilet, bed or court task.
    if (activity.kind.startsWith('review')) {
      activity.kind = 'review-wait'; activity.retryIn = 0; activity.arrivalPending = false; activity.waitingPoint = getPlayer().root.position.toArray();
      const deferred = personnelDuty()?.personnelDeferral;
      if (deferred?.caseId === activity.caseId && deferred.reviewerBodyId === activity.luBodyId) activity.deferralPending = false;
      onWaiting();
    }
    syncDocument(); return true;
  }
  if (saved !== undefined && (saved?.version !== 1 || !saved.work || !restore(saved))) loadError ||= 'invalid-saved-state';
  syncDocument();
  function state() {
    const job = shownCase(), duration = activity ? D[activity.kind === 'read' ? 'visit' : activity.kind.startsWith('review') ? 'review' : 'compile'] : 1;
    const owner = appointment(), duty = personnelDuty(owner);
    return {enabled: enabledNow(), eligible: !!owner, mode: owner?.mode || job?.mode || null, roleId: ROLE, rankId: owner?.rankId || null, sourceDay: job?.day ?? duty?.day ?? null, deferred: !!duty?.personnelDeferral, loadError, lastError, availability: availability(), case: job ? copy(job) : null,
      history: copy(Array.isArray(work.snapshot()?.cases) ? work.snapshot().cases : []), activity: activity?.kind || null, progress: activity ? activity.progress / duration : 0,
      waiting: activity?.kind === 'review-wait' ? {actorId: LU, bodyId: activity.luBodyId, caseId: activity.caseId, deferred: duty?.personnelDeferral?.caseId === activity.caseId, savePending: !!activity.deferralPending} : null,
      place: {registration: [...P.registration], archive: [...P.archive], reads: copy(CHINA_PERSONNEL_READ_PLACES)}};
  }
  const workChoices = () => ['personnel-view', 'personnel-claim', ...OFFICIALS.flatMap(row => [`personnel-read:${row.actorId}`, `personnel-record:${row.actorId}:accepted`, `personnel-record:${row.actorId}:awaiting`]), 'personnel-compile', 'personnel-review', 'personnel-cancel'].filter(kind => intent(kind));
  return {intent, resolveIntent, prepareIntent, executeIntent, update, syncPlayer: syncDocument, stopActivity, cancelApproach: stopActivity,
    isActing: () => !!activity, isWaiting: () => activity?.kind === 'review-wait', personnelWorkState: () => work.snapshot(), sourcePanel, workChoices, intents: () => workChoices().filter(kind => !kind.startsWith('personnel-record:') && kind !== 'personnel-cancel').map(intent), snapshot, restore, state,
    playerAction: () => activity && !activity.arrivalPending && !activity.proof ? ({read: 'read', compile: 'calligraphy', review: 'read'})[activity.kind] || null : null,
    playerStation: () => activity?.kind === 'compile' ? {playerWorkTarget: [...compileTarget]} : activity?.kind === 'read' ? {playerWorkTarget: [...places.get(activity.actorId).target]} : null,
    label: () => activity?.proof ? '原核验凭据待保存 · 稍后重试' : activity?.kind === 'review-wait' ? '已预约陆谦 · 等原事务结束后前往' : activity?.kind === 'review-approach' ? '前往陆谦身旁 · 当面呈册' : activity ? `${{read: '翻阅原始案簿', compile: '编列六官名册', review: '陆谦当面核阅'}[activity.kind]} · ${Math.ceil(D[activity.kind === 'read' ? 'visit' : activity.kind] - activity.progress)}秒` : null,
    dispose({suspend = false} = {}) { if (saving || disposed) return; if (!suspend) stopActivity(); else { releaseMeeting(); const previous = activity; activity = null; syncDocument(); activity = previous; } disposed = true; if (documentObject) documentObject.visible = false; },
  };
}
