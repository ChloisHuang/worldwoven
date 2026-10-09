// CR04: one task, several combinable preparations. This adapter owns elapsed
// physical actions and their original-body receipts, never the political roll,
// emperor's life, NPC movement, offices, residences, or the royal meal ledger.
import {usurpationBodyId} from './china-usurpation-context.js';
const PROVIDER = 'china-usurpation-actions';
export const CHINA_USURPATION_ACTION_SECONDS = Object.freeze({
  'political-response': 4, intrigue: 6, guard: 6, abdication: 6,
  acclamation: 6, 'mechanism-resolution': 6, 'investiture-reading': 3,
});
const durations = CHINA_USURPATION_ACTION_SECONDS;
const closed = new Set(['failed', 'invested', 'abandoned']);
const retryable = new Set(['save-failed', 'save-unavailable', 'persistence-unavailable', 'async-save-unsupported']);
const copy = value => structuredClone(value);
const canonical = value => Array.isArray(value) ? (value.every(row => typeof row === 'string') ? [...value].sort() :
  value.every(row => row && typeof row === 'object' && typeof row.actorId === 'string') ? [...value].sort((a, b) => a.actorId.localeCompare(b.actorId)) : value).map(canonical) :
  value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const id = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,255}$/.test(value);
const point = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const near = (a, b, radius = .22) => point(a) && point(b) && Math.abs(a[1] - b[1]) < .3 && Math.hypot(a[0] - b[0], a[2] - b[2]) <= radius;
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const identity = actor => ({actorId: actor?.actorId || actor?.station?.id, bodyId: usurpationBodyId(actor)});
const position = actor => actor?.root?.position?.toArray?.() || actor?.position;
const validTime = value => Number.isSafeInteger(value?.day) && value.day >= 0 && Number.isFinite(value.hour) && value.hour >= 0 && value.hour < 24;
const labels = {'political-response': '当面商议本案', intrigue: '原膳剧情准备', guard: '原卫队实际集结', abdication: '具名官员当面对质',
  acclamation: '在场人物联合拥立', 'mechanism-resolution': '现场办结本案', 'investiture-reading': '宣读同号授位原纸'};

/**
 * Main supplies the existing world and is the only navigation/body owner.
 *
 * getSite(kind,{task,actorId,participantIds}) ->
 *   {id,objectId,position,actorPoints:{actorId:[x,y,z]},name?}.
 * These are original legal public stand points. resolveObject(objectId) must
 * return the original scene object; an arbitrary string is not a physical prop.
 *
 * borrowActors({leaseId,caseId,kind,actors,destinations}) -> true reserves the
 * explicit original bodies after work/court/personal-needs arbitration. Main
 * routes each one legally, without teleporting. groupState(leaseId) returns
 * {held:true,legalRoutes:true,participants:[{actorId,bodyId,arrived:true}]} only
 * while that lease actually owns them. We independently inspect every body,
 * destination, stance, visibility and distance. releaseActors returns those
 * same bodies to their interrupted jobs. Missing hooks fail closed.
 *
 * getMealBinding(task) -> {orderId,objectId,consumerId,consumerBodyId,
 * workerId:'player',workerBodyId,workReceiptId,dutyActive:true,stage}.
 * prepareStoryMeal({caseId,storyActionId,binding}) -> {ok:true} attaches only a
 * fictional story packet to this original order and is idempotent by that ID.
 * getMealConsumption(request) returns those same source identities plus
 * {storyActionId,status:'consumed'} from actual original-meal consumption.
 * It must never make a menu click consume a meal or incapacitate the emperor.
 *
 * getDocumentBinding(task) -> {caseId,documentId,objectId,holderId:'player',
 * holderBodyId,held:true}; getSafeHandoff(task) -> {safe:true,residences:{
 * player:{roomId,bedId},formerEmperor:{roomId,bedId}}}, checked by main against
 * the real settled old work, carried items, meetings and safe body transitions.
 *
 * standing(actor), isAvailable(actor,{leaseId,kind}), and canSee({position,
 * visualAnchor:{actorId},actor?,object?}) use real pose/occlusion APIs. Actor
 * root.visible is deliberately irrelevant (first-person hiding is not death).
 * canGather(actor,{kind}) checks whether a new acclamation witness can legally
 * leave or reserve its original post. It selects only an unsaved witness list;
 * saved acclamation receipts and their final reading retain the same people.
 * Timers never resume cold. Completed proofs persist under their original IDs
 * across save rejection/cancel; cold retries recheck original identities.
 */
export function createChinaUsurpationActions({core, getCore = () => core,
  getTask = () => getCore()?.currentTask?.() || getCore()?.state?.()?.cases?.at(-1) || null,
  getContext = () => null, getClock = () => null, getPlayer = () => null,
  resolveActor = () => null, resolveObject = () => null, getSite = () => null,
  standing = () => false, canSee = () => false, isAvailable = () => false,
  canGather = (person, request) => isAvailable(person, request),
  getBusy = () => false, borrowActors = () => false, groupState = () => null,
  releaseActors = () => {}, getMealBinding = () => null, prepareStoryMeal = () => null,
  getMealConsumption = () => null, getDocumentBinding = () => null, getSafeHandoff = () => null,
  saveState, notify = () => {}, saved, enabled = false} = {}) {
  let activity = null, refs = null, proofs = {}, mealPending = null;
  let disposed = false, mutating = false, loadError = null, lastError = null, candidate = null;
  const enabledNow = () => !disposed && (typeof enabled === 'function' ? enabled() === true : enabled === true);
  const taskNow = () => { const task = getTask(); return task && !closed.has(task.stage) ? task : null; };
  const contextNow = () => getContext() || {};
  const keyFor = (task, kind, actorId = 'player') => `${task.id}|${kind}|${actorId}`;
  const evidenceId = (task, kind, actorId = 'player') => `${task.id}:physical:${kind}:${actorId}`;
  const revisionNow = () => getCore()?.view?.()?.revision ?? getCore()?.state?.()?.revision ?? 0;
  function actor(idValue) { return idValue === 'player' ? getPlayer() : resolveActor(idValue); }
  function live(idValue, bodyId) {
    const body = actor(idValue), who = identity(body);
    return !!body?.root && who.actorId === idValue && id(who.bodyId) && (!bodyId || who.bodyId === bodyId) && body.alive !== false ? body : null;
  }
  function currentIdentity(task) {
    const context = contextNow(), player = live('player', task?.playerBodyId), emperor = task && live(task.emperor?.id, task.emperor?.bodyId);
    return !!task && !!player && !!emperor && context.player?.id === 'player' && context.player.bodyId === task.playerBodyId &&
      context.player.alive === true && context.emperor?.id === task.emperor.id && context.emperor.bodyId === task.emperor.bodyId &&
      context.emperor.alive === true && context.emperor.tenureRevision === task.emperor.revision;
  }
  function normalize(action, actorId) {
    const input = typeof action === 'string' ? {kind: action, actorId} : action || {};
    const kind = input.kind === 'pledge' ? 'political-response' : input.kind === 'prepare' ? input.preparationKind :
      input.kind === 'resolve' ? 'mechanism-resolution' : input.kind === 'investiture' ? 'investiture-reading' : input.kind;
    return Object.hasOwn(durations, kind) ? {kind, actorId: kind === 'political-response' ? input.actorId : 'player',
      caseId: input.caseId, revision: input.revision} : null;
  }
  function accepted(task) {
    return (contextNow().supporters || []).filter(person => person.alive === true && person.eligible === true &&
      (task.pledges || []).some(pledge => pledge.actorId === person.id && pledge.bodyId === person.bodyId && pledge.accepted === true &&
        !pledge.withdrawn && pledge.roleId === person.roleId && pledge.circleId === person.circleId));
  }
  function participants(task, action) {
    const context = contextNow(), agreed = accepted(task);
    if (action.kind === 'political-response') {
      const person = (context.supporters || []).find(p => p.id === action.actorId && p.eligible === true && p.alive === true);
      return person ? ['player', person.id] : null;
    }
    if (action.kind === 'guard') {
      const commander = context.guard?.commanderId, guards = context.guard?.guards || [];
      if (!agreed.some(p => p.id === commander && p.guardCommander) || guards.length !== 2 || new Set(guards.map(p => p.id)).size !== guards.length ||
        !guards.every(guard => agreed.some(p => p.id === guard.id && p.bodyId === guard.bodyId))) return null;
      return [...new Set(['player', commander, ...guards.map(p => p.id)])];
    }
    if (action.kind === 'abdication') {
      const officials = agreed.filter(p => p.official);
      return officials.length >= 3 ? ['player', ...officials.slice(0, 3).map(p => p.id), task.emperor.id] : null;
    }
    if (action.kind === 'acclamation') {
      const gatherable = agreed.filter(person => { const body = live(person.id, person.bodyId); return body && canGather(body, {kind: action.kind}) === true; });
      if (gatherable.length < 3 || new Set(gatherable.map(p => p.circleId)).size < 2) return null;
      const first = gatherable[0], second = gatherable.find(person => person.circleId !== first.circleId),
        third = gatherable.find(person => person !== first && person !== second);
      return ['player', first.id, second.id, third.id];
    }
    if (action.kind === 'mechanism-resolution') return ['player', task.emperor.id];
    if (action.kind === 'investiture-reading') {
      const witnesses = task.preparations?.acclamation?.supporterIds;
      return Array.isArray(witnesses) && witnesses.length >= 3 && witnesses.every(person => agreed.some(p => p.id === person)) ?
        [...new Set(['player', ...witnesses, task.emperor.id])] : null;
    }
    return ['player'];
  }
  function validSite(site, participantIds) {
    return site && id(site.id) && id(site.objectId) && point(site.position) && !!resolveObject(site.objectId) &&
      participantIds.every(person => person === 'player' || point(site.actorPoints?.[person]) && near(site.position, site.actorPoints[person], 2.8));
  }
  function siteCopy(site) { return {id: site.id, objectId: site.objectId, position: [...site.position], actorPoints: copy(site.actorPoints || {}), name: site.name || '宫廷筹谋'}; }
  function sourceMeal(task, value = getMealBinding(task), requireDuty = true) {
    return value && id(value.orderId) && id(value.objectId) && id(value.workReceiptId) && value.consumerId === task.emperor.id &&
      value.consumerBodyId === task.emperor.bodyId && value.workerId === 'player' && value.workerBodyId === task.playerBodyId &&
      (!requireDuty || value.dutyActive === true && !['consumed', 'cancelled'].includes(value.stage)) && !!resolveObject(value.objectId) ? value : null;
  }
  const sameMeal = (a, b) => ['orderId', 'objectId', 'consumerId', 'consumerBodyId', 'workerId', 'workerBodyId', 'workReceiptId'].every(k => a?.[k] === b?.[k]);
  function document(task, site) {
    const row = getDocumentBinding(task);
    return row?.caseId === task.id && id(row.documentId) && row.objectId === row.documentId && row.objectId === site.objectId && row.holderId === 'player' &&
      row.holderBodyId === task.playerBodyId && row.held === true && resolveObject(row.objectId) ? row : null;
  }
  function offered(task, action) {
    if (action.kind === 'investiture-reading') return task.stage === 'ready-for-investiture';
    if (task.stage !== 'planning' && !(['acclamation', 'political-response'].includes(action.kind) && task.stage === 'ready-for-investiture')) return false;
    if (action.kind === 'political-response') return !(task.pledges || []).some(p => p.actorId === action.actorId);
    if (action.kind === 'guard' && !participants(task, action)) return false;
    if (['intrigue', 'guard', 'abdication', 'acclamation'].includes(action.kind)) {
      if (task.preparations?.[action.kind]) return false;
      if (Array.isArray(task.preparations) && task.preparations.some(p => p.kind === action.kind)) return false;
      if (action.kind !== 'acclamation' && !task.selectedRoutes?.includes(action.kind)) return false;
    }
    return true;
  }
  function intent(input, actorId) {
    const action = normalize(input, actorId), task = taskNow();
    if (!enabledNow() || loadError || !action || !currentIdentity(task) || !offered(task, action) ||
      action.caseId !== undefined && action.caseId !== task.id || action.revision !== undefined && action.revision !== revisionNow()) return null;
    const key = keyFor(task, action.kind, action.actorId), stored = proofs[key] || (mealPending?.key === key && !mealPending.bound ? mealPending : null);
    if (Object.values(proofs).some(row => !row.applied && row.caseId === task.id && row.key !== key)) return null;
    if (activity && activity.key !== key || action.kind === 'intrigue' && mealPending?.bound) return null;
    const ids = stored?.participantIds || participants(task, action);
    if (!ids || ids.some(person => !live(person))) return null;
    const site = stored?.site || getSite(action.kind, {task: copy(task), actorId: action.actorId, participantIds: [...ids]});
    if (!validSite(site, ids)) return null;
    if (action.kind === 'intrigue' && sourceMeal(task)?.objectId !== site.objectId) return null;
    if (action.kind === 'investiture-reading' && !document(task, site)) return null;
    const bodyIds = ids.map(person => identity(actor(person)).bodyId);
    return {provider: PROVIDER, id: evidenceId(task, action.kind, action.actorId), kind: action.kind, actorId: action.actorId,
      caseId: task.id, revision: revisionNow(), position: [...site.position], name: site.name || '宫廷筹谋',
      participantIds: [...ids],
      action: `${labels[action.kind]} · ${durations[action.kind]}秒`, executionRadius: .22, interactionRadius: 2.8, priority: 57,
      visualAnchor: action.kind === 'political-response' ? {actorId: action.actorId} : {},
      intentKey: [task.id, task.emperor.revision, revisionNow(), action.kind, action.actorId, site.id, site.objectId, ...bodyIds].join('|')};
  }
  function resolveIntent(selected) {
    const next = intent(selected);
    return next && selected.provider === PROVIDER && selected.id === next.id && selected.intentKey === next.intentKey && equal(selected.position, next.position) ? next : null;
  }
  function snapshot() {
    if (candidate) return copy(candidate);
    if (loadError && saved !== undefined) return copy(saved);
    return {version: 1, proofs: copy(proofs), mealPending: copy(mealPending), activity: activity ? copy(activity) : null};
  }
  function persist() {
    if (typeof saveState !== 'function') { lastError = 'persistence-unavailable'; return false; }
    candidate = freeze(snapshot()); const wasMutating = mutating; mutating = true;
    try { const result = saveState(candidate); if (result?.then) { Promise.resolve(result).catch(() => {}); lastError = 'async-save-unsupported'; return false; }
      if (result === false || result?.ok === false) { lastError = 'save-failed'; return false; } return true;
    } catch { lastError = 'save-failed'; return false; } finally { candidate = null; mutating = wasMutating; }
  }
  function release(reason) {
    const leaseId = activity?.leaseId;
    activity = null; refs = null;
    if (leaseId) releaseActors(leaseId, reason);
  }
  function cancel(reason = 'cancelled') {
    if (mutating || disposed) return false;
    const had = !!activity; release(reason); if (had) persist(); return true;
  }
  function playerReady(site) {
    const player = getPlayer();
    return player?.alive !== false && !player?.walking && standing(player) === true && !getBusy() && near(position(player), site.position) &&
      canSee({position: [...site.position], object: resolveObject(site.objectId)}) === true;
  }
  function start(selected) {
    if (mutating || disposed || activity) return false;
    const next = resolveIntent(selected), task = taskNow();
    if (!next || !task) return false;
    const key = keyFor(task, next.kind, next.actorId), stored = proofs[key] || (mealPending?.key === key && !mealPending.bound ? mealPending : null),
      ids = stored?.participantIds || participants(task, next);
    const site = stored?.site || getSite(next.kind, {task: copy(task), actorId: next.actorId, participantIds: [...ids]});
    if (!validSite(site, ids) || !playerReady(site)) return false;
    const bodies = ids.map(person => live(person));
    if (bodies.some(body => !body || isAvailable(body, {kind: next.kind, leaseId: next.id}) !== true) || new Set(bodies.map(body => identity(body).bodyId)).size !== bodies.length) return false;
    const binding = next.kind === 'intrigue' ? sourceMeal(task) : null;
    if (next.kind === 'intrigue' && (!binding || binding.objectId !== site.objectId)) return false;
    const record = {key, kind: next.kind, actorId: next.actorId, caseId: task.id, emperor: copy(task.emperor),
      playerBodyId: task.playerBodyId, leaseId: next.id, site: siteCopy(site), participantIds: [...ids],
      identities: bodies.map(identity), progress: stored ? durations[next.kind] : 0, waiting: ids.length > 1,
      startedAt: copy(getClock()), retryIn: 0, meal: binding ? copy(binding) : null};
    if (!validTime(record.startedAt)) return false;
    if (stored && !stored.identities.every(row => bodies.some(body => identity(body).actorId === row.actorId && identity(body).bodyId === row.bodyId))) return false;
    if (ids.length > 1 && borrowActors({leaseId: record.leaseId, caseId: task.id, kind: next.kind,
      actors: bodies.filter(body => identity(body).actorId !== 'player'), destinations: copy(site.actorPoints)}) !== true) return false;
    activity = record; refs = {bodies, object: resolveObject(site.objectId)};
    if (!persist()) { release('save-failed'); return false; }
    lastError = null; return true;
  }
  function validBodies(record, task, requireReady = true) {
    if (!currentIdentity(task) || task.id !== record.caseId || !equal(task.emperor, record.emperor) ||
      record.identities.some(row => !live(row.actorId, row.bodyId)) || !resolveObject(record.site.objectId)) return false;
    if (refs && (refs.object !== resolveObject(record.site.objectId) || refs.bodies.some(body => actor(identity(body).actorId) !== body))) return false;
    if (!requireReady) return true;
    if (!playerReady(record.site)) return false;
    return record.identities.every(row => {
      const body = actor(row.actorId), destination = row.actorId === 'player' ? record.site.position : record.site.actorPoints[row.actorId];
      return isAvailable(body, {leaseId: record.leaseId, kind: record.kind}) === true && !body.walking && standing(body) === true && near(position(body), destination, .26) &&
        (row.actorId === 'player' || near(position(getPlayer()), position(body), 2.8) && canSee({actor: body, position: [...position(body)], visualAnchor: {actorId: row.actorId}}) === true);
    });
  }
  function groupReady(record) {
    if (record.participantIds.length === 1) return true;
    const group = groupState(record.leaseId);
    return group?.held === true && group.legalRoutes === true && Array.isArray(group.participants) &&
      record.identities.filter(row => row.actorId !== 'player').every(row => group.participants.some(p => p.actorId === row.actorId && p.bodyId === row.bodyId && p.arrived === true));
  }
  function envelope(record, kind = record.kind, extra = {}) {
    const task = taskNow(), actorId = kind === 'political-response' ? record.actorId : 'player';
    return {id: evidenceId(task, kind, actorId), kind, caseId: record.caseId, playerId: 'player', playerBodyId: record.playerBodyId,
      emperorId: record.emperor.id, emperorBodyId: record.emperor.bodyId, emperorRevision: record.emperor.revision,
      actorId, actorBodyId: identity(actor(actorId)).bodyId, targetId: kind === 'political-response' ? actorId : record.site.id,
      objectId: record.site.objectId, participants: copy(record.identities), completed: true,
      at: {day: getClock().day, hour: getClock().hour}, durationSeconds: durations[record.kind],
      position: [...position(getPlayer())], ...extra};
  }
  function finishedProof(record) {
    const task = taskNow(), extra = {};
    if (record.kind === 'guard') { extra.commanderId = contextNow().guard.commanderId; extra.guardIds = contextNow().guard.guards.map(p => p.id); }
    if (record.kind === 'abdication') extra.officialIds = accepted(task).filter(p => p.official && record.participantIds.includes(p.id)).map(p => p.id);
    if (record.kind === 'acclamation') extra.supporterIds = record.participantIds.filter(person => person !== 'player');
    if (record.kind === 'investiture-reading') {
      const paper = document(task, record.site), safe = getSafeHandoff(task);
      if (!paper || safe?.safe !== true || !safe.residences) return null;
      extra.documentId = paper.documentId;
      extra.safeHandoff = envelope(record, 'safe-handoff', {residences: copy(safe.residences)});
    }
    return envelope(record, record.kind, extra);
  }
  function submit(record) {
    const entry = proofs[record.key], task = taskNow();
    if (!entry || !task || !verifyEvidence(entry.proof, {caseId: task.id, kind: record.kind})) return false;
    const service = getCore(), previousError = lastError; let result; mutating = true;
    try {
      if (record.kind === 'political-response') result = service?.pledge?.(task.id, record.actorId, copy(entry.proof));
      else if (record.kind === 'mechanism-resolution') result = service?.resolve?.(task.id, copy(entry.proof));
      else if (record.kind === 'investiture-reading') result = service?.investiture?.(task.id, copy(entry.proof));
      else result = service?.recordPreparation?.(task.id, record.kind, copy(entry.proof));
    } catch { result = {ok: false, code: 'save-failed'}; } finally { mutating = false; }
    if (result?.ok === true) {
      entry.applied = true; lastError = null;
      if (activity?.key === record.key) release('completed');
      if (mealPending?.key === record.key) mealPending = null;
      persist(); notify({kind: record.kind, result}); return true;
    }
    lastError = result?.code || result?.reasons?.[0] || 'save-failed';
    if (activity?.key === record.key) {
      activity.retryIn = 1;
      if (!retryable.has(lastError)) release(lastError);
    }
    if (mealPending?.key === record.key) mealPending.retryIn = 1;
    if (lastError !== previousError) notify({kind: record.kind, result: result || {ok: false, code: lastError}}); return false;
  }
  function completeStoryPreparation(record) {
    const task = taskNow(), meal = sourceMeal(task);
    if (!sameMeal(record.meal, meal)) return false;
    const storyActionId = `${task.id}:story-package:${meal.orderId}`;
    // Keep the exact completed source even when either host or core save fails.
    mealPending ||= {...copy(record), storyActionId, preparedAt: {day: getClock().day, hour: getClock().hour}, bound: false};
    let result; mutating = true;
    try { result = prepareStoryMeal({caseId: task.id, storyActionId, binding: copy(record.meal)}); }
    catch { result = null; } finally { mutating = false; }
    if (result?.ok !== true) { lastError = 'story-meal-bind-failed'; activity.retryIn = 1; return false; }
    mealPending.bound = true; release('story-meal-prepared'); persist(); return true;
  }
  function consumedSource(record) {
    const value = getMealConsumption({caseId: record.caseId, storyActionId: record.storyActionId,
      orderId: record.meal.orderId, objectId: record.meal.objectId});
    return value?.status === 'consumed' && value.storyActionId === record.storyActionId && sameMeal(value, record.meal) ? value : null;
  }
  function pollMeal() {
    if (!mealPending || mealPending.progress !== durations.intrigue) return;
    const record = mealPending, task = taskNow();
    if (!task || !validBodies(record, task, false)) return;
    const source = consumedSource(record); if (!source) return;
    // The host's marker+six-second source may have committed immediately before
    // our bound=true tail write was rejected. Its actual same-order consumption
    // proves that binding without demanding a now-finished shift or preparing
    // the packet again. A fresh/menu-only action has no completed source here.
    record.bound = true;
    if (!proofs[record.key]) {
      const participants = [...record.identities, {actorId: task.emperor.id, bodyId: task.emperor.bodyId}];
      proofs[record.key] = {...copy(record), proof: freeze(envelope(record, 'intrigue', {participants,
        position: [...record.site.position], storyActionId: record.storyActionId,
        meal: {orderId: source.orderId, objectId: source.objectId, consumerId: source.consumerId,
          consumerBodyId: source.consumerBodyId, status: 'consumed'}})), applied: false};
    }
    submit(record);
  }
  function verifyEvidence(proof, request = {}) {
    if (!enabledNow() || loadError || !proof || proof.caseId !== request.caseId || proof.kind !== request.kind) return false;
    const task = taskNow(); if (!currentIdentity(task) || proof.caseId !== task.id) return false;
    const entry = Object.values(proofs).find(row => equal(row.proof, proof) || proof.kind === 'safe-handoff' && equal(row.proof?.safeHandoff, proof));
    if (!entry || entry.applied || !validBodies(entry, task, false)) return false;
    if (entry.kind === 'intrigue') return entry.bound === true && !!consumedSource(entry) && equal(entry.proof, proof);
    if (activity?.key !== entry.key || !validBodies(entry, task) || !groupReady(entry)) return false;
    if (entry.kind === 'investiture-reading') {
      const paper = document(task, entry.site), safe = getSafeHandoff(task);
      if (!paper || paper.documentId !== entry.proof.documentId || safe?.safe !== true || !equal(safe.residences, entry.proof.safeHandoff?.residences)) return false;
    }
    return true;
  }
  function update(dt) {
    if (mutating || disposed || !enabledNow() || loadError) return;
    const elapsed = Math.max(0, Math.min(.1, Number.isFinite(dt) ? dt : 0));
    // A meal may finish while another preparation is being pursued. Do not let
    // that asynchronous receipt steal the other action's live lease/references.
    if (mealPending && (!activity || activity.key === mealPending.key)) {
      mealPending.retryIn = Math.max(0, (mealPending.retryIn || 0) - elapsed);
      if (mealPending.retryIn <= 1e-8) pollMeal();
    }
    if (!activity) return;
    const record = activity, task = taskNow();
    if (!validBodies(record, task, false) || !playerReady(record.site)) { cancel('body-or-position-changed'); return; }
    if (record.kind === 'intrigue' && !sameMeal(sourceMeal(task), record.meal) ||
      record.kind === 'investiture-reading' && !document(task, record.site)) { cancel('original-object-changed'); return; }
    if (!groupReady(record)) {
      if (record.progress > 0 && !proofs[record.key]) { cancel('gathering-interrupted'); return; }
      const status = record.participantIds.length > 1 ? groupState(record.leaseId) : null;
      if (status?.held === false) { cancel('original-duty-resumed'); return; }
      record.waiting = true; return;
    }
    if (!validBodies(record, task)) { cancel('participants-unavailable'); return; }
    record.waiting = false;
    if (proofs[record.key]) {
      record.retryIn = Math.max(0, record.retryIn - elapsed); if (record.retryIn <= 1e-8) submit(record); return;
    }
    if (mealPending?.key === record.key) {
      record.retryIn = Math.max(0, record.retryIn - elapsed); if (record.retryIn <= 1e-8) completeStoryPreparation(record); return;
    }
    record.progress = Math.min(durations[record.kind], record.progress + elapsed);
    if (record.progress < durations[record.kind] - 1e-8) return;
    record.progress = durations[record.kind];
    if (record.kind === 'intrigue') { completeStoryPreparation(record); return; }
    const proof = finishedProof(record);
    if (!proof) { cancel('safe-handoff-unavailable'); return; }
    proofs[record.key] = {...copy(record), proof: freeze(proof), applied: false};
    submit(record);
  }
  function validRecord(record, hasProof = false) {
    if (!record || !Object.hasOwn(durations, record.kind) || !id(record.caseId) || !id(record.playerBodyId) ||
      !id(record.emperor?.id) || !id(record.emperor.bodyId) || !Number.isSafeInteger(record.emperor.revision) || record.emperor.revision < 0 ||
      !id(record.actorId) || record.key !== `${record.caseId}|${record.kind}|${record.actorId}` || !id(record.leaseId) ||
      !id(record.site?.id) || !id(record.site.objectId) || !point(record.site.position) || !Array.isArray(record.identities) ||
      !Array.isArray(record.participantIds) || record.identities.length !== record.participantIds.length ||
      new Set(record.participantIds).size !== record.participantIds.length || new Set(record.identities.map(p => p.bodyId)).size !== record.identities.length ||
      !record.identities.every(p => id(p.actorId) && id(p.bodyId) && record.participantIds.includes(p.actorId) && (p.actorId === 'player' || point(record.site.actorPoints?.[p.actorId]))) ||
      !record.identities.some(p => p.actorId === 'player' && p.bodyId === record.playerBodyId) ||
      !Number.isFinite(record.progress) || record.progress < 0 || record.progress > durations[record.kind] || !validTime(record.startedAt) ||
      record.kind === 'intrigue' && (!id(record.meal?.orderId) || record.meal.objectId !== record.site.objectId ||
        !id(record.meal.workReceiptId) || record.meal.workerId !== 'player' || record.meal.workerBodyId !== record.playerBodyId ||
        record.meal.consumerId !== record.emperor.id || record.meal.consumerBodyId !== record.emperor.bodyId)) return false;
    if (!hasProof) return true;
    const proof = record.proof;
    return record.progress === durations[record.kind] && typeof record.applied === 'boolean' && proof?.id === `${record.caseId}:physical:${record.kind}:${record.actorId}` &&
      proof.caseId === record.caseId && proof.kind === record.kind && proof.playerId === 'player' && proof.playerBodyId === record.playerBodyId &&
      proof.emperorId === record.emperor.id && proof.emperorBodyId === record.emperor.bodyId && proof.emperorRevision === record.emperor.revision &&
      proof.actorId === record.actorId && proof.actorBodyId === record.identities.find(p => p.actorId === record.actorId)?.bodyId &&
      proof.targetId === (record.kind === 'political-response' ? record.actorId : record.site.id) && proof.objectId === record.site.objectId &&
      proof.completed === true && proof.durationSeconds === durations[record.kind] && validTime(proof.at) &&
      point(proof.position) && near(proof.position, record.site.position) &&
      (record.kind !== 'intrigue' || record.bound === true && record.storyActionId === `${record.caseId}:story-package:${record.meal.orderId}` &&
        proof.storyActionId === record.storyActionId && proof.meal?.status === 'consumed' && proof.meal.orderId === record.meal.orderId &&
        proof.meal.objectId === record.meal.objectId && proof.meal.consumerId === record.emperor.id && proof.meal.consumerBodyId === record.emperor.bodyId) &&
      equal(proof.participants, record.kind === 'intrigue' ? [...record.identities, {actorId: record.emperor.id, bodyId: record.emperor.bodyId}] : record.identities);
  }
  function reconcileProofs() {
    const cases = getCore()?.snapshot?.()?.cases || getCore()?.state?.()?.cases || [];
    for (const record of Object.values(proofs)) {
      const task = cases.find(row => row.id === record.caseId);
      const receipt = record.kind === 'political-response' ? task?.pledges?.find(row => row.actorId === record.actorId)?.receipt :
        record.kind === 'mechanism-resolution' ? task?.resolution?.receipt : record.kind === 'investiture-reading' ? task?.investiture?.receipt : task?.preparations?.[record.kind];
      // The combined core checkpoint is captured before its commit returns.
      // Its durable receipt, rather than an adapter boolean, decides replay.
      record.applied = !!receipt && equal(receipt, record.proof);
    }
    if (mealPending && proofs[mealPending.key]?.applied) mealPending = null;
  }
  function restore(value) {
    if (mutating || disposed || value?.version !== 1 || !value.proofs || Array.isArray(value.proofs) ||
      !Object.entries(value.proofs).every(([key, record]) => key === record.key && validRecord(record, true)) ||
      value.activity !== null && !validRecord(value.activity) ||
      value.mealPending !== null && (!validRecord(value.mealPending) || value.mealPending.kind !== 'intrigue' ||
        value.mealPending.progress !== durations.intrigue || value.mealPending.storyActionId !== `${value.mealPending.caseId}:story-package:${value.mealPending.meal.orderId}` ||
        typeof value.mealPending.bound !== 'boolean')) return false;
    release('restore'); proofs = copy(value.proofs); mealPending = copy(value.mealPending); reconcileProofs();
    // No saved lease, held body or partial timer is authority to move an actor.
    // Pending proofs remain available only through a newly validated start.
    return true;
  }
  if (saved !== undefined && !restore(saved)) loadError = 'invalid-saved-usurpation-actions';
  return {intent, resolveIntent, start, executeIntent: start, update, cancel, stopActivity: cancel,
    active: () => !!activity, isActing: () => !!activity, isWaiting: () => !!activity?.waiting,
    snapshot, restore, verifyEvidence,
    playerAction: () => activity && !activity.waiting ? activity.kind === 'intrigue' ? 'craft' : 'read' : null,
    label: () => activity ? `${labels[activity.kind]} · ${activity.waiting ? '等候原人物到场' : Math.ceil(durations[activity.kind] - activity.progress) + '秒'}` : mealPending ? '剧情包已备 · 等同份原膳由本人实际用完' : null,
    state: () => ({enabled: enabledNow(), active: !!activity, action: activity?.kind || null, caseId: activity?.caseId || taskNow()?.id || null,
      progress: activity ? activity.progress / durations[activity.kind] : 0, elapsed: activity?.progress || 0,
      duration: activity ? durations[activity.kind] : 0, waiting: !!activity?.waiting, pendingMeal: !!mealPending,
      pendingProofs: Object.values(proofs).filter(row => !row.applied).map(row => row.proof.id), loadError, lastError}),
    dispose() { if (mutating || disposed) return; release('dispose'); disposed = true; },
  };
}
