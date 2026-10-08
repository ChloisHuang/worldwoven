// The second promotion's physical adapter. Shared navigation owns the player;
// palace life remains the emperor's sole movement/pose owner. This controller
// never touches the original edict, NPC jobs, money, XP, or rank directly.
import * as THREE from 'three';
import {COURT_CAREER_PLACE as P} from './china-court-career-place.js';
import {PALACE_EDICT} from './china-palace-edict-place.js';

const PROVIDER = 'china-personnel-appointment', ROLE = 'cn-court-clerk', RANK = 'cn-records-personnel';
const LU = 'cn-official-personnel', EMPEROR = 'cn-emperor';
const PUBLIC_EMPEROR = [-15.1, .215, -13.35], PUBLIC_PLAYER = PALACE_EDICT.points.approve;
const PREFIX = 'personnel-promotion-', durations = {review: 4, 'imperial-review': 4, appointment: 3, 'receive-document': 0};
const stages = {submitted: 'review', 'document-ready': 'receive-document', 'document-held': 'imperial-review', 'imperial-approved': 'appointment'};
const copy = value => structuredClone(value), equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const point = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const near = (a, b, radius = .18) => point(a) && point(b) && Math.abs(a[1] - b[1]) < .3 && Math.hypot(a[0] - b[0], a[2] - b[2]) <= radius;
const actorId = actor => actor?.actorId || actor?.station?.id;
const bodyId = (actor, fallback) => actor?.bodyId || actor?.root?.userData?.bodyId || actorId(actor) || fallback;
const frozen = value => { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); } return value; };
const retries = new Set(['save-failed', 'async-save-unsupported', 'persistence-unavailable']);
const messages = {'save-failed': '原完成凭据已保留，登记暂未保存，将稍后重试。', 'async-save-unsupported': '原完成凭据已保留，登记暂未保存，将稍后重试。',
  'promotion-review-rejected': '皇帝：本次任命未获准，结果已入档；本次申请不会重新抽签。',
  'promotion-duty-unsettled': '请先完成本轮朝班、归档和结薪，再继续办理任命。'};

/**
 * Feature-default-off. Only the existing career-appointment-document is given
 * here; the legacy court adapter must yield that paper for this pending route.
 * saveState is a synchronous whole-runtime checkpoint callback. Core promotion
 * mutations are saved by careers itself; a finished proof stays in snapshot()
 * during that save and on failure, allowing a combined world save to reconcile
 * an already-committed core step without replaying a lottery or appointment.
 */
export function createChinaPersonnelAppointment({careers, palace, getPlayer, getClock,
  getLu = () => null, getEmperor = () => null, getBusy = () => false,
  standing = player => !!player && !player.walking && player.alive !== false, canSee = () => true,
  getMeetingPoint = (_actor, fallback) => fallback, requestMeeting = () => false,
  meetingHeld = () => false, releaseMeeting: releaseExternal = () => {},
  resumeApproach = () => {}, onWaiting = () => {}, notify = () => {}, openRegistration = () => {},
  documentObject = null, saved, saveState, enabled = false} = {}) {
  if (saved && typeof saved === 'object' && Object.hasOwn(saved, 'continuity')) {
    const {continuity, ...top} = saved;
    saved = continuity?.version === 1 ? continuity : Object.keys(top).length ? top : continuity === null ? undefined : saved;
  }
  let activity = null, heldLu = null, watchedPlayer = null, watchedRecipient = null;
  let royalOwner = null, disposed = false, mutating = false, loadError = null, lastError = null, candidate = null;
  const home = documentObject ? {parent: documentObject.parent, position: documentObject.position.clone(), rotation: documentObject.rotation.clone(), scale: documentObject.scale.clone()} : null;
  const enabledNow = () => !disposed && (typeof enabled === 'function' ? enabled() === true : enabled === true);
  const summary = () => careers?.promotionSummary?.() || {};
  const application = () => { const row = summary().application; return row?.toRankId === RANK && row.routeVersion === 2 ? row : null; };
  const pending = () => { const row = application(); return row?.status === 'pending' ? row : null; };
  const route = () => summary().routeId === RANK || !!pending();
  const ready = () => enabledNow() && !loadError && route() && summary().eligible === true;
  const documentId = row => row?.appointment?.id || (row ? 'appointment:' + row.id : null);
  const currentPoint = actor => actor?.root?.position.toArray();
  function live(id) {
    const actor = id === LU ? getLu() : getEmperor();
    return actor?.root && actorId(actor) === id && actor.alive !== false ?
      {actor, actorId: id, bodyId: bodyId(actor, id), alive: true, position: currentPoint(actor)} : null;
  }
  function playerReady() {
    const player = getPlayer();
    return !!player?.root && player.root.visible !== false && player.alive !== false && !player.walking && standing(player) === true && !getBusy();
  }
  const at = position => near(currentPoint(getPlayer()), position) && canSee({position}) === true;
  const hand = () => getPlayer()?.root?.userData?.hands?.[1];
  function ownsPaper(row = pending()) {
    return !!row && !!documentObject && documentObject.userData.personnelAppointmentId === row.id &&
      documentObject.userData.applicationId === documentId(row) && documentObject.userData.personnelAppointmentStage === row.stage;
  }
  function heldPaper(row = pending()) { return ownsPaper(row) && !!hand() && documentObject.parent === hand() && documentObject.visible !== false; }
  function syncDocument() {
    if (!documentObject || !home) return;
    const row = pending();
    // In all other routes the old court adapter remains the only paper owner.
    if (!enabledNow() || !row) {
      if (documentObject.userData.personnelAppointmentId) {
        if (home.parent && documentObject.parent !== home.parent) home.parent.add(documentObject);
        documentObject.position.copy(home.position); documentObject.rotation.copy(home.rotation); documentObject.scale.copy(home.scale);
        delete documentObject.userData.personnelAppointmentId; delete documentObject.userData.personnelAppointmentStage;
      }
      return;
    }
    documentObject.userData.personnelAppointmentId = row.id;
    documentObject.userData.applicationId = documentId(row); documentObject.userData.personnelAppointmentStage = row.stage;
    documentObject.visible = true;
    const held = ['document-held', 'imperial-approved'].includes(row.stage);
    if (held && hand()) {
      const player = getPlayer(); if (documentObject.parent !== hand()) hand().add(documentObject);
      if (activity && player.root.userData.tools?.book) player.root.userData.tools.book.visible = false;
      const body = player.root.userData.body, authored = player.getAuthoredHandPose?.(1);
      if (body && authored && player.fitExternalHandGrip) {
        const anchor = new THREE.Vector3(...authored.position), rotation = new THREE.Quaternion(...authored.quaternion);
        const offset = new THREE.Vector3(0, -.055, .035), paperRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(.2, 0, Math.PI / 2));
        const target = new THREE.Vector3(.09, .0125, .06).applyQuaternion(paperRotation).add(offset).applyQuaternion(rotation).add(anchor);
        player.fitExternalHandGrip({side: 1, target: target.toArray(), support: false}); player.root.updateWorldMatrix(true, true);
        const desired = new THREE.Matrix4().compose(anchor, rotation, new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().compose(offset, paperRotation, home.scale));
        desired.premultiply(body.matrixWorld).premultiply(hand().matrixWorld.clone().invert()).decompose(documentObject.position, documentObject.quaternion, documentObject.scale);
      } else { documentObject.position.set(0, -.055, .035); documentObject.rotation.set(.2, 0, Math.PI / 2); }
    } else {
      if (home.parent && documentObject.parent !== home.parent) home.parent.add(documentObject);
      documentObject.position.copy(home.position); documentObject.rotation.copy(home.rotation); documentObject.scale.copy(home.scale);
    }
  }
  function returnPaperHome() {
    if (!documentObject?.userData.personnelAppointmentId || !home) return;
    if (home.parent && documentObject.parent !== home.parent) home.parent.add(documentObject);
    documentObject.position.copy(home.position); documentObject.rotation.copy(home.rotation); documentObject.scale.copy(home.scale);
    delete documentObject.userData.personnelAppointmentId; delete documentObject.userData.personnelAppointmentStage;
  }
  function releaseLu() { if (heldLu) { heldLu = null; releaseExternal(); } }
  function clearRoyalLease() { if (royalOwner) { palace?.setDutyLine?.(royalOwner, null); palace?.releaseDuty?.(royalOwner); royalOwner = null; } }
  function clearActivity() { releaseLu(); clearRoyalLease(); activity = null; watchedPlayer = null; watchedRecipient = null; }
  function snapshot() {
    if (candidate) return copy(candidate);
    if (loadError && saved !== undefined) return copy(saved);
    return {version: 1, applicationId: application()?.id || null, activity: activity ? copy(activity) : null};
  }
  function persistRuntime() {
    if (typeof saveState !== 'function') return false;
    candidate = frozen(snapshot()); mutating = true;
    try { const result = saveState(candidate); if (result?.then) { Promise.resolve(result).catch(() => {}); return false; } return result !== false && result?.ok !== false; }
    catch { return false; } finally { candidate = null; mutating = false; }
  }
  function stopActivity() {
    if (mutating || disposed) return false;
    const had = !!activity; clearActivity(); syncDocument(); return !had || persistRuntime();
  }
  const typeFor = kind => typeof kind === 'string' && kind.startsWith(PREFIX) ? kind.slice(PREFIX.length) : null;
  function reviewPoint(lu) {
    const [x, y, z] = lu.position, fallback = [x + (x > 24.5 ? -.78 : .78), y, z];
    const result = getMeetingPoint(lu.actor, fallback); return point(result) && near(result, lu.position, 2) ? [...result] : null;
  }
  function intent(kind = PREFIX + (stages[pending()?.stage] || 'apply')) {
    if (!enabledNow() || loadError) return null;
    const type = typeFor(kind), row = pending();
    if (!['apply', 'review', 'receive-document', 'imperial-review', 'appointment', 'cancel'].includes(type)) return null;
    if (type === 'cancel') return activity ? {provider: PROVIDER, id: 'cn-' + kind, kind, position: currentPoint(getPlayer()) || [...P.registration],
      name: '吏务核籍任命', action: '取消当前办理，保留申请', contextControl: true, executionRadius: .18, interactionRadius: 2.8,
      intentKey: activity.applicationId + ':' + activity.kind} : null;
    if (!ready() || !documentObject || type === 'apply' && (activity || !careers.promotionAvailability?.().ok) || type !== 'apply' && (!row || stages[row.stage] !== type)) return null;
    if (activity && activity.intentKind !== kind) return null;
    const lu = type === 'review' ? live(LU) : null, emperor = type === 'imperial-review' ? live(EMPEROR) : null;
    if (type === 'review' && !lu || type === 'imperial-review' && !emperor) return null;
    const meeting = lu ? reviewPoint(lu) : null;
    const position = lu ? meeting || P.registration : type === 'receive-document' ? P.archive : type === 'imperial-review' ? PUBLIC_PLAYER : P.registration;
    const action = {apply: '提交从八品吏务核籍录事申请', review: '向陆谦呈履历核荐 · 4秒', 'receive-document': '领取陆谦荐书原件',
      'imperial-review': '持原荐书当面请皇帝阅批 · 4秒', appointment: '宣读原任命文书并登记 · 3秒'}[type];
    return {provider: PROVIDER, id: 'cn-' + kind, kind, position: [...position], name: type === 'imperial-review' ? '宫苑公共听候处 · 呈荐书' : '铨录登记 · 吏务核籍任命',
      npcName: lu ? '陆谦' : emperor ? '皇帝' : '任命文书', action, executionRadius: .18, interactionRadius: 2.8, priority: 56,
      intentKey: [careers.workState?.().revision, row?.id, row?.stage, getClock()?.day, kind, lu?.bodyId, emperor?.bodyId].join('|'),
      ...(lu ? {awaitingReception: !meeting, visualAnchor: {actorId: LU}} : {})};
  }
  function resolveIntent(selected) { const next = intent(selected?.kind); return next && selected?.provider === PROVIDER && selected.id === next.id && selected.intentKey === next.intentKey ? next : null; }
  function makeActivity(selected, kind) {
    const row = pending(), type = typeFor(selected.kind), recipient = type === 'review' ? live(LU) : type === 'imperial-review' ? live(EMPEROR) : null;
    watchedPlayer = getPlayer(); watchedRecipient = recipient?.actor || null;
    return {kind, intentKind: selected.kind, applicationId: row.id, documentId: documentId(row), stage: row.stage, day: getClock().day,
      point: [...selected.position], waitingPoint: currentPoint(getPlayer()), playerBodyId: bodyId(getPlayer(), 'player'), recipientBodyId: recipient?.bodyId || null,
      progress: 0, arrivalPending: !!getPlayer()?.walking, proof: null, retryIn: 0};
  }
  function queueLu(selected) {
    releaseLu(); if (!activity) activity = makeActivity(selected, 'review-wait');
    activity.kind = 'review-wait'; activity.waitingPoint = currentPoint(getPlayer()); if (!activity.proof) activity.progress = 0;
    onWaiting(); return true;
  }
  function prepareIntent(selected) {
    if (mutating || disposed) return false;
    const next = resolveIntent(selected); if (!next) return false;
    if (typeFor(next.kind) !== 'review') return true;
    const lu = live(LU); if (!lu || watchedRecipient && watchedRecipient !== lu.actor) { stopActivity(); return false; }
    if (next.awaitingReception || lu.actor.walking || !requestMeeting(lu.actor)) return queueLu(next);
    if (!activity) activity = makeActivity(next, 'review-approach');
    activity.kind = 'review-approach'; activity.point = [...next.position]; heldLu = lu.actor; return true;
  }
  function report(result, success) {
    const code = result?.code || result?.reasons?.[0] || 'save-failed';
    if (!result?.ok && lastError !== code) notify(messages[code] || '本次任命办理未完成，请核对任职、原件和在场人员后重试。');
    else if (result?.ok && success) notify(success);
    lastError = result?.ok ? null : code; return result?.ok === true;
  }
  function coreStep(input) {
    mutating = true; try { return careers.reviewPromotion(input); } catch { return {ok: false, code: 'save-failed'}; } finally { mutating = false; }
  }
  function executeIntent(selected) {
    if (mutating || disposed) return false;
    const next = resolveIntent(selected); if (!next) return false;
    const type = typeFor(next.kind); if (type === 'cancel') return stopActivity();
    if (!at(next.position) || getBusy()) return false;
    if (type === 'apply') {
      if (!playerReady()) return false;
      mutating = true; let result; try { result = careers.applyPromotion(); } finally { mutating = false; }
      const ok = report(result, '申请已登记。先向陆谦核履历出荐书，再亲持原件到宫苑公共听候处请皇帝阅批。');
      syncDocument(); if (ok) openRegistration({country: 'china', roleId: ROLE, scope: 'role'}); return ok;
    }
    if (['imperial-review', 'appointment'].includes(type) && !heldPaper()) return false;
    if (type === 'receive-document' && (!playerReady() || !ownsPaper() || documentObject.parent !== home.parent)) return false;
    if (type === 'review') {
      if (!heldLu || !meetingHeld(heldLu)) { if (!prepareIntent(next)) return false; if (activity.kind === 'review-wait') return true; }
      activity.kind = 'review'; activity.arrivalPending = !!getPlayer()?.walking; activity.recipientAnchor = live(LU)?.position;
    } else if (!activity) activity = makeActivity(next, type === 'imperial-review' ? 'imperial-wait' : type);
    else return false;
    if (type === 'receive-document') finish();
    if (type === 'imperial-review') requestRoyal();
    return true;
  }
  function validActivity() {
    const row = pending(), player = getPlayer();
    if (!activity || !ready() || !row || row.id !== activity.applicationId || row.stage !== activity.stage || documentId(row) !== activity.documentId ||
      player !== watchedPlayer || bodyId(player, 'player') !== activity.playerBodyId || player?.alive === false || getClock().day !== activity.day) return false;
    const type = typeFor(activity.intentKind), recipient = type === 'review' ? live(LU) : type === 'imperial-review' ? live(EMPEROR) : null;
    return !activity.recipientBodyId || recipient && recipient.actor === watchedRecipient && recipient.bodyId === activity.recipientBodyId;
  }
  function requestRoyal() {
    const owner = PROVIDER + ':' + activity.applicationId;
    if (palace?.requestDuty?.(owner, {kind: 'edict-review', background: true}) !== true) { royalOwner = null; return false; }
    royalOwner = owner; return true;
  }
  function royalReady() {
    const emperor = live(EMPEROR), duty = royalOwner && palace?.dutyState?.(royalOwner);
    return !!emperor && emperor.actor.root.visible !== false && !emperor.actor.walking && duty?.ready === true && duty.stage === 'duty-public-review' && near(emperor.position, PUBLIC_EMPEROR, .25) &&
      near(currentPoint(getPlayer()), emperor.position, 2) && canSee({position: emperor.position, visualAnchor: {actorId: EMPEROR}}) === true;
  }
  function proofFor() {
    const type = typeFor(activity.intentKind), recipient = type === 'review' ? live(LU) : type === 'imperial-review' ? live(EMPEROR) : null;
    return {applicationId: activity.applicationId, documentId: activity.documentId, actorId: 'player',
      targetId: recipient?.actorId || 'cn-court-career-desk', position: currentPoint(getPlayer()),
      standing: true, clear: true, elapsed: durations[type], duration: durations[type], day: getClock().day, completedAt: getClock().seconds,
      ...(recipient ? {recipientPosition: recipient.position, recipientBodyId: recipient.bodyId, recipientAlive: true} : {})};
  }
  function finish() {
    const type = typeFor(activity.intentKind); activity.proof ||= frozen(proofFor());
    const result = coreStep({applicationId: activity.applicationId, step: type === 'review' ? 'interview' : type, proof: activity.proof});
    if (result?.ok || application()?.status !== 'pending') {
      clearActivity(); syncDocument(); report(result, {review: '陆谦已核准履历并出具荐书。请到归档案领取原件。',
        'receive-document': '荐书原件已领取。请亲自到宫苑公共听候处呈请皇帝阅批。',
        'imperial-review': '皇帝已准任，此原件即为任命文书。请持回铨录登记处宣读。',
        appointment: '原任命文书已宣读登记，从八品吏务核籍录事自此受任；新俸例从下一新班生效。'}[type]);
      openRegistration({country: 'china', roleId: ROLE, scope: 'role'}); return;
    }
    const code = result?.code || result?.reasons?.[0];
    if (retries.has(code)) { activity.retryIn = 1; report(result); }
    else { stopActivity(); report(result); }
  }
  function update(dt) {
    if (mutating || disposed) return;
    if (!activity) { syncDocument(); return; }
    if (!validActivity()) { stopActivity(); return; }
    const elapsed = Math.max(0, Math.min(.1, Number.isFinite(dt) ? dt : 0)), type = typeFor(activity.intentKind), player = getPlayer();
    if (activity.kind === 'review-wait') {
      if (!playerReady() || !near(currentPoint(player), activity.waitingPoint)) { stopActivity(); return; }
      activity.retryIn = Math.max(0, activity.retryIn - elapsed); if (activity.retryIn > 1e-8) return; activity.retryIn = 1;
      const next = intent(activity.intentKind), lu = live(LU);
      if (!next || next.awaitingReception || !lu || lu.actor.walking || !requestMeeting(lu.actor)) return;
      heldLu = lu.actor; activity.kind = 'review-approach'; activity.point = [...next.position]; if (resumeApproach(next) === false) stopActivity(); return;
    }
    if (activity.kind === 'review-approach') {
      if (getBusy()) { stopActivity(); return; }
      if (!meetingHeld(heldLu)) queueLu(intent(activity.intentKind)); return;
    }
    if (!at(activity.point) || getBusy()) { stopActivity(); return; }
    if (activity.arrivalPending && player.walking) return; activity.arrivalPending = false;
    if (!playerReady()) { stopActivity(); return; }
    if (['imperial-review', 'appointment'].includes(type) && !heldPaper() || type === 'receive-document' && (!ownsPaper() || documentObject.parent !== home.parent)) { stopActivity(); return; }
    if (type === 'review') {
      if (!ownsPaper() || documentObject.parent !== home.parent) { stopActivity(); return; }
      const lu = live(LU);
      if (!heldLu || !meetingHeld(heldLu) || lu.actor.walking) { queueLu(intent(activity.intentKind)); return; }
      if (lu.actor.root.visible === false || !equal(activity.recipientAnchor, lu.position) || !near(currentPoint(player), lu.position, 2) || canSee({position: lu.position, visualAnchor: {actorId: LU}}) !== true) { stopActivity(); return; }
    }
    if (type === 'imperial-review') {
      // Foreground court/edict preemption clears only our lease, never the case.
      if (royalOwner && !palace?.dutyState?.(royalOwner)) royalOwner = null;
      if (!royalOwner) {
        activity.kind = 'imperial-wait'; if (!activity.proof) activity.progress = 0;
        activity.retryIn = Math.max(0, activity.retryIn - elapsed); if (activity.retryIn > 1e-8) return;
        activity.retryIn = 1; if (!requestRoyal()) return;
      }
      if (!royalReady()) { activity.kind = 'imperial-wait'; if (!activity.proof) activity.progress = 0; return; }
      activity.kind = 'imperial-review';
    }
    const recipient = type === 'review' ? live(LU) : type === 'imperial-review' ? live(EMPEROR) : null;
    if (activity.proof && recipient && !equal(activity.proof.recipientPosition, recipient.position)) { stopActivity(); return; }
    const target = recipient?.position || P.archiveTarget; player.root.rotation.y = Math.atan2(target[0] - player.root.position.x, target[2] - player.root.position.z);
    syncDocument();
    if (activity.proof) { activity.retryIn = Math.max(0, activity.retryIn - elapsed); if (activity.retryIn <= 1e-8) finish(); return; }
    activity.progress = Math.min(durations[type], activity.progress + elapsed);
    if (activity.progress >= durations[type] - 1e-8) { activity.progress = durations[type]; finish(); }
  }
  function restore(value) {
    if (mutating || disposed || value?.version !== 1 || !(value.applicationId === null || typeof value.applicationId === 'string')) return false;
    const record = value.activity;
    if (record !== null && (!record || !['review-wait', 'review-approach', 'review', 'receive-document', 'imperial-wait', 'imperial-review', 'appointment'].includes(record.kind) ||
      !Object.hasOwn(durations, typeFor(record.intentKind)) || !point(record.point) || !point(record.waitingPoint) || !Number.isFinite(record.progress) || record.progress < 0 ||
      record.progress > durations[typeFor(record.intentKind)] || !Number.isFinite(record.retryIn) || record.retryIn < 0 || record.retryIn > 1 || typeof record.arrivalPending !== 'boolean')) return false;
    clearActivity(); if (!record || !enabledNow()) { syncDocument(); return true; }
    // applyPromotion saves the new core candidate while this idle adapter still
    // observes the previous application. An idle/stale runtime cannot override
    // the durable case, and must not disable its newly submitted application.
    if (value.applicationId !== (application()?.id || null) || record.applicationId !== value.applicationId) { syncDocument(); return true; }
    // A combined save can contain the just-finished animation and the new core
    // stage. The durable core wins; do not call the decision a second time.
    const row = application();
    if (row.id === record.applicationId && (row.status !== 'pending' || row.stage !== record.stage)) { syncDocument(); return true; }
    const type = typeFor(record.intentKind), proof = record.proof;
    if (record.day !== getClock().day) { syncDocument(); return true; }
    if (record.documentId !== documentId(row) || type !== stages[row.stage] ||
      type === 'imperial-review' && !equal(record.point, PUBLIC_PLAYER) || type === 'appointment' && !equal(record.point, P.registration) || type === 'receive-document' && !equal(record.point, P.archive)) return false;
    if (proof && (record.progress !== durations[type] || proof.applicationId !== record.applicationId || proof.documentId !== record.documentId || proof.actorId !== 'player' ||
      proof.duration !== durations[type] || proof.elapsed !== durations[type] || proof.day !== record.day || !Number.isFinite(proof.completedAt) || proof.completedAt > getClock().seconds ||
      proof.standing !== true || proof.clear !== true || !near(proof.position, record.point) || record.recipientBodyId && proof.recipientBodyId !== record.recipientBodyId)) return false;
    activity = copy(record); watchedPlayer = getPlayer(); watchedRecipient = type === 'review' ? live(LU)?.actor : type === 'imperial-review' ? live(EMPEROR)?.actor : null;
    if (!validActivity()) { clearActivity(); syncDocument(); return true; }
    if (type === 'review') { activity.kind = 'review-wait'; activity.waitingPoint = currentPoint(getPlayer()); activity.retryIn = 0; onWaiting(); }
    if (type === 'imperial-review') { activity.kind = 'imperial-wait'; activity.retryIn = 0; }
    syncDocument(); return true;
  }
  if (saved !== undefined && !restore(saved)) loadError = 'invalid-saved-state';
  syncDocument();
  return {intent, resolveIntent, prepareIntent, executeIntent, update, syncPlayer: syncDocument, stopActivity, cancelApproach: stopActivity, snapshot, restore,
    isActing: () => !!activity, isWaiting: () => ['review-wait', 'imperial-wait'].includes(activity?.kind),
    playerAction: () => activity && !activity.arrivalPending && !activity.proof && ['review', 'imperial-review', 'appointment'].includes(activity.kind) ? 'read' : null,
    playerStation: () => activity?.kind === 'appointment' ? {playerWorkTarget: [...P.archiveTarget]} : null,
    state: () => ({enabled: enabledNow(), eligible: ready(), loadError, lastError, application: copy(application()), activity: activity?.kind || null,
      progress: activity ? activity.progress / (durations[typeFor(activity.intentKind)] || 1) : 0, waiting: ['review-wait', 'imperial-wait'].includes(activity?.kind),
      royalOwner, place: {registration: [...P.registration], archive: [...P.archive], imperial: [...PUBLIC_PLAYER]}}),
    label: () => !enabledNow() || loadError ? null : activity?.proof ? '原完成凭据待保存 · 稍后重试' : activity?.kind === 'review-wait' ? '已预约陆谦 · 等原事务结束' : activity?.kind === 'review-approach' ? '前往陆谦身旁 · 核履历出荐书' : activity?.kind === 'imperial-wait' ? '持原荐书等候皇帝 · 公共听候处' : activity ? `${{review: '陆谦当面核荐', 'imperial-review': '皇帝当面阅批', appointment: '持原任命文书宣读'}[activity.kind] || '领取原荐书'} · ${Math.ceil(durations[typeFor(activity.intentKind)] - activity.progress)}秒` : pending()?.stage === 'document-held' ? '持陆谦荐书 · 待亲呈皇帝' : pending()?.stage === 'imperial-approved' ? '持原任命文书 · 待宣读登记' : null,
    dispose({suspend = false} = {}) { if (mutating || disposed) return; if (!suspend) stopActivity(); else { releaseLu(); clearRoyalLease(); } returnPaperHome(); disposed = true; },
  };
}
