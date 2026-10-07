import {RELATIONSHIP_INTERACTIONS, relationshipInteraction, relationshipStage, relationshipInteractionOptions, relationshipInteractionEligible, relationshipInteractionOutcome} from './relationship-interactions.js';
import {conversationDisposition, conversationTopicFit} from './npc-life-decisions.js';

export const PLAYER_CONVERSATION_TOPICS = Object.freeze([
  Object.freeze({id: 'work', kind: 'staff-work', label: '谈谈工作', duration: 8}),
  Object.freeze({id: 'art', kind: 'read', label: '聊聊书画', duration: 7}),
  Object.freeze({id: 'rest', kind: 'staff-rest', label: '说说休息', duration: 6}),
]);
export const PLAYER_CONVERSATION_COOLDOWN = 90;
export const PLAYER_CONVERSATION_HISTORY_LIMIT = 128;
const TOPICS = new Map([...PLAYER_CONVERSATION_TOPICS, ...RELATIONSHIP_INTERACTIONS].map(topic => [topic.id, topic]));
const copy = value => JSON.parse(JSON.stringify(value));
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const unit = value => Math.max(0, Math.min(1, value));
const signed = value => Math.max(-1, Math.min(1, value));
const idValid = id => typeof id === 'string' && id.length > 0 && id.length <= 128 && id.trim() === id && id !== 'player';
const states = new Set(['offered', 'accepted', 'declined', 'cancelled', 'completed', 'pending-completion', 'pending-cancellation']);
const completed = event => event.status === 'completed';
const pending = event => event.status.startsWith('pending-');
const live = event => event.status === 'offered' || event.status === 'accepted' || event.status === 'pending-completion';
const eventId = (actorId, attempt) => `player-conversation:${encodeURIComponent(actorId)}:${attempt}`;
const validClock = clock => object(clock) && finite(clock.seconds) && clock.seconds >= 0 && Number.isSafeInteger(clock.day) && clock.day >= 0;
const hash = text => { let h = 2166136261; for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const emptyArchive = () => ({throughSerial: 0, endedAt: 0, endedDay: 0, actors: []});
const empty = () => ({version: 1, nextSerial: 1, archive: emptyArchive(), events: []});

// Read only the small decision projection, never copy or change a controller.
// A missing player/profile supplies the same neutral traits and values.
function profile(source, relation = 0, opinion = 0) {
  const traits = Object.fromEntries(['curiosity', 'quiet', 'sociability'].map(key => [key, finite(source?.traits?.[key]) ? unit(source.traits[key]) : .5]));
  const values = Object.fromEntries([['company', 'sociability'], ['quiet', 'quiet'], ['curiosity', 'curiosity']].map(([key, trait]) =>
    [key, finite(source?.values?.[key]) ? unit(source.values[key]) : traits[trait]]));
  const needs = Object.fromEntries(['social', 'hunger', 'fatigue'].map(key => [key, finite(source?.needs?.[key]) ? unit(source.needs[key]) : .5]));
  return {traits, values, needs,
    relations: {player: signed((finite(source?.relations?.player) ? source.relations.player : 0) + relation)},
    opinions: {player: signed((finite(source?.opinions?.player) ? source.opinions.player : 0) + opinion)},
    experiences: Array.isArray(source?.experiences) ? source.experiences.filter(e => object(e) && typeof e.kind === 'string').map(e => ({kind: e.kind})) : [],
  };
}

const archivedActors = archive => new Map(archive.actors.map(actor => [actor.actorId, {...actor, completedCount: actor.completedCount ?? (actor.lastCompleted ? 1 : 0)}]));
function fold(actors, event) {
  const actor = actors.get(event.actorId) || {actorId: event.actorId, attempts: 0, relation: 0, opinion: 0, lastCompleted: null, completedCount: 0, cooldownUntil: 0};
  actor.attempts = event.attempt;
  actor.cooldownUntil = event.cooldownUntil;
  if (completed(event)) {
    actor.completedCount++;
    actor.relation = signed(actor.relation + event.result.relation);
    actor.opinion = signed(actor.opinion + event.result.opinion);
    actor.lastCompleted = event;
    if (event.result.feeling === 'mismatched') actor.mismatchEventId = event.id;
    if (event.result.action) {
      actor.trust = signed((actor.trust || 0) + event.result.trust);
      actor.playerRelation = signed((actor.playerRelation || 0) + (event.result.inverseRelation ?? event.result.relation));
      actor.playerOpinion = signed((actor.playerOpinion || 0) + (event.result.inverseOpinion ?? event.result.opinion));
      if (event.result.supportStance && event.interactionContext.initiator === 'player') { actor.supportStance = event.result.supportStance; actor.supportEventId = event.id; actor.supportAt = event.endedAt; actor.supportEvidenceId = event.result.supportEvidenceId || null; actor.supportFaultId = event.result.supportFaultId || null; }
      if (event.result.acknowledgedEventId) actor.acknowledgedEventId = event.result.acknowledgedEventId;
      for (const key of ['interestGiven', 'interestReceived', 'boundary']) if (event.result[key] === true) actor[key] = true;
      if (event.result.repairedEventId) { actor.repairedEventId = event.result.repairedEventId; if (actor.mismatchEventId === event.result.repairedEventId) actor.mismatchEventId = null; }
      if (event.result.explicitConsent === true) actor.lastConsentEventId = event.id;
    }
  }
  actors.set(event.actorId, actor);
}

// Only settled events leave the recent journal. The compact per-person base
// keeps sequential clamp semantics, cooldowns and attempts without old receipts.
// This creates a candidate; it never changes the previously committed archive.
function compact(current) {
  const excess = current.events.length - PLAYER_CONVERSATION_HISTORY_LIMIT;
  if (excess <= 0) return current;
  const actors = archivedActors(current.archive);
  let count = 0, last;
  while (count < excess) {
    const event = current.events[count];
    if (live(event) || pending(event)) break;
    fold(actors, event);
    last = event;
    count++;
  }
  return !count ? current : {...current, events: current.events.slice(count), archive: {
    throughSerial: last.serial, endedAt: last.endedAt, endedDay: last.endedDay, actors: [...actors.values()],
  }};
}

function index(current) {
  const events = new Map(), actors = archivedActors(current.archive);
  let active = null, awaitingSave = null;
  for (const event of current.events) {
    events.set(event.id, event);
    fold(actors, event);
    if (live(event)) active = event;
    if (pending(event)) awaitingSave = event;
  }
  return {events, actors, active, awaitingSave};
}

function validateEvent(e, {serial, attempt, lastBoundary = 0, lastDay = 0, cooldown = 0}) {
    const topic = TOPICS.get(e?.topicId);
    if (!object(e) || !idValid(e.actorId) || !topic || !Number.isSafeInteger(e.serial) || e.serial < 1 ||
        !Number.isSafeInteger(e.attempt) || e.attempt < 1 || e.serial !== serial || e.attempt !== attempt ||
        e.id !== eventId(e.actorId, attempt) || !states.has(e.status) || e.kind !== topic.kind || e.duration !== topic.duration ||
        !finite(e.elapsed) || e.elapsed < 0 || e.elapsed > e.duration || !finite(e.startedAt) || e.startedAt < lastBoundary ||
        e.startedAt < cooldown || !Number.isSafeInteger(e.startedDay) || e.startedDay < lastDay ||
        !finite(e.roll) || e.roll < 0 || e.roll >= 1 || !finite(e.chance) || e.chance < 0 || e.chance > 1 ||
        !finite(e.appearanceAffinity) || Math.abs(e.appearanceAffinity) > .04 ||
        !finite(e.cooldownUntil) || e.cooldownUntil < e.startedAt + PLAYER_CONVERSATION_COOLDOWN) throw Error('invalid-saved-event');
    if (relationshipInteraction(e.topicId) && (!object(e.interactionContext) || !relationshipInteractionEligible(e.topicId, e.interactionContext) || e.topicId === 'private-company' && e.interactionContext.explicitConsent !== true && !['offered', 'declined', 'cancelled', 'pending-cancellation'].includes(e.status))) throw Error('invalid-saved-context');
    if ((e.status === 'declined') !== (e.roll >= e.chance)) throw Error('invalid-saved-acceptance');
    if (e.status === 'offered' && (e.topicId !== 'private-company' || e.elapsed !== 0 || e.interactionContext.explicitConsent !== false)) throw Error('invalid-saved-offer');
    if (e.status === 'accepted' || e.status === 'offered') {
      if (e.endedAt !== undefined || e.result !== undefined || e.cooldownUntil !== e.startedAt + PLAYER_CONVERSATION_COOLDOWN) throw Error('invalid-saved-active');
    } else {
      if (!finite(e.endedAt) || e.endedAt < e.startedAt || !Number.isSafeInteger(e.endedDay) || e.endedDay < e.startedDay ||
          e.cooldownUntil !== e.endedAt + PLAYER_CONVERSATION_COOLDOWN) throw Error('invalid-saved-end');
      if (e.status === 'completed' || e.status === 'pending-completion') {
        const result = e.result;
        if (relationshipInteraction(e.topicId)) {
          if (!object(e.interactionContext) || !relationshipInteractionEligible(e.topicId, e.interactionContext) ||
              e.topicId === 'private-company' && e.interactionContext.explicitConsent !== true ||
              e.elapsed !== e.duration || JSON.stringify(result) !== JSON.stringify({actorId: e.actorId, targetId: 'player', ...relationshipInteractionOutcome(e.topicId, e.interactionContext)}) || e.feeling !== result.feeling) throw Error('invalid-saved-result');
        } else {
        const expected = result?.feeling === 'appreciated' ? [.07, .07] : result?.feeling === 'neutral' ? [.012, 0] : result?.feeling === 'mismatched' ? [-.035, -.06] : null;
        if (e.elapsed !== e.duration || !object(result) || !expected || result.actorId !== e.actorId || result.targetId !== 'player' ||
            e.feeling !== result.feeling || result.relation !== expected[0] || result.opinion !== expected[1]) throw Error('invalid-saved-result');
        }
      } else if (e.result !== undefined || e.feeling !== undefined) throw Error('invalid-saved-result');
      if (e.status === 'declined' && (e.elapsed !== 0 || e.endedAt !== e.startedAt || e.endedDay !== e.startedDay)) throw Error('invalid-saved-decline');
      if ((e.status === 'cancelled' || e.status === 'pending-cancellation') && (typeof e.reason !== 'string' || !e.reason || e.reason.length > 128)) throw Error('invalid-saved-cancellation');
    }
}

function restore(saved) {
  if (saved == null) return empty();
  if (!object(saved) || saved.version !== 1 || !Number.isSafeInteger(saved.nextSerial) || saved.nextSerial < 1 ||
      !Array.isArray(saved.events)) throw Error('invalid-saved-state');
  // Existing v1 journals migrate losslessly when they have no archive yet.
  const archive = saved.archive ?? emptyArchive();
  if (!object(archive) || !Number.isSafeInteger(archive.throughSerial) || archive.throughSerial < 0 ||
      !finite(archive.endedAt) || archive.endedAt < 0 || !Number.isSafeInteger(archive.endedDay) || archive.endedDay < 0 ||
      !Array.isArray(archive.actors) || saved.nextSerial !== archive.throughSerial + saved.events.length + 1) throw Error('invalid-saved-archive');
  const attempts = new Map(), cooldowns = new Map();
  let archivedCount = 0, maximumCooldown = 0;
  for (const actor of archive.actors) {
    if (!object(actor) || !idValid(actor.actorId) || attempts.has(actor.actorId) || !Number.isSafeInteger(actor.attempts) || actor.attempts < 1 ||
        !finite(actor.relation) || Math.abs(actor.relation) > 1 || !finite(actor.opinion) || Math.abs(actor.opinion) > 1 ||
        !finite(actor.cooldownUntil) || actor.cooldownUntil < PLAYER_CONVERSATION_COOLDOWN ||
        actor.cooldownUntil > archive.endedAt + PLAYER_CONVERSATION_COOLDOWN) throw Error('invalid-saved-archive');
    if (actor.supportStance !== undefined && (!['support','withhold'].includes(actor.supportStance) || typeof actor.supportEventId !== 'string' || !finite(actor.supportAt))) throw Error('invalid-saved-archive');
    for (const key of ['trust', 'playerRelation', 'playerOpinion']) if (actor[key] !== undefined && (!finite(actor[key]) || Math.abs(actor[key]) > 1)) throw Error('invalid-saved-archive');
    for (const key of ['interestGiven', 'interestReceived', 'boundary']) if (actor[key] !== undefined && typeof actor[key] !== 'boolean') throw Error('invalid-saved-archive');
    for (const key of ['mismatchEventId', 'repairedEventId', 'acknowledgedEventId', 'lastConsentEventId']) if (actor[key] != null && (typeof actor[key] !== 'string' || !actor[key] || actor[key].length > 512)) throw Error('invalid-saved-archive');
    if (actor.completedCount !== undefined && (!Number.isSafeInteger(actor.completedCount) || actor.completedCount < (actor.lastCompleted ? 1 : 0) || actor.completedCount > actor.attempts || !actor.lastCompleted && actor.completedCount !== 0)) throw Error('invalid-saved-archive');
    if (actor.lastCompleted !== null) {
      const e = actor.lastCompleted;
      if (!object(e) || !completed(e) || e.actorId !== actor.actorId || e.serial > archive.throughSerial || e.attempt > actor.attempts ||
          e.cooldownUntil > actor.cooldownUntil || e.endedDay > archive.endedDay) throw Error('invalid-saved-archive');
      validateEvent(e, {serial: e.serial, attempt: e.attempt});
    } else if (actor.relation !== 0 || actor.opinion !== 0) throw Error('invalid-saved-archive');
    archivedCount += actor.attempts;
    maximumCooldown = Math.max(maximumCooldown, actor.cooldownUntil);
    attempts.set(actor.actorId, actor.attempts);
    cooldowns.set(actor.actorId, actor.cooldownUntil);
  }
  if (!Number.isSafeInteger(archivedCount) || archivedCount !== archive.throughSerial ||
      (archivedCount ? maximumCooldown !== archive.endedAt + PLAYER_CONVERSATION_COOLDOWN : archive.endedAt !== 0 || archive.endedDay !== 0)) throw Error('invalid-saved-archive');
  let unsettled = 0, lastBoundary = archive.endedAt, lastDay = archive.endedDay;
  for (let i = 0; i < saved.events.length; i++) {
    const e = saved.events[i], attempt = (attempts.get(e?.actorId) || 0) + 1;
    validateEvent(e, {serial: archive.throughSerial + i + 1, attempt, lastBoundary, lastDay, cooldown: cooldowns.get(e?.actorId) || 0});
    attempts.set(e.actorId, attempt);
    lastBoundary = e.endedAt ?? e.startedAt;
    lastDay = e.endedDay ?? e.startedDay;
    cooldowns.set(e.actorId, e.cooldownUntil);
    if (live(e) || pending(e)) { unsettled++; if (i !== saved.events.length - 1) throw Error('invalid-saved-active'); }
  }
  if (unsettled > 1) throw Error('invalid-saved-active');
  return compact(copy({...saved, archive}));
}

/** The single player invitation writer, separate from NPC controllers.
 * saveState(next, event) must synchronously save the detached ledger as part of
 * the game's atomic snapshot. Throw/false/{ok:false}/Promise leaves it uncommitted.
 * Start must commit before callers animate or occupy anyone. progress and
 * complete receive cumulative ACTUAL nearby conversation seconds, never wall
 * time. Progress is cheap and enters the next ordinary game snapshot.
 * Restored accepted events retain their ID/duration/elapsed; the caller must
 * validate physical presence and duties before resuming, otherwise cancel.
 * A failed completion retains immutable evidence and its once-only result for
 * retryPending (also in snapshot), but exposes no rewards until the save works.
 * relationFor/knownOpinion return ONLY this ledger's committed directed deltas;
 * caller readers add their existing relationship/opinion and clamp as needed.
 */
export function createPlayerConversationLedger({saved, saveState, getClock = () => ({seconds: 0, day: 0}),
  getProfile = () => null, getPlayerProfile = () => null, getAppearanceAffinity = () => 0, getAcceptanceContext = () => 0, getContext = () => ({}), onCompleted=()=>{}, worldSeed = 1} = {}) {
  for (const [key, fn] of Object.entries({getClock, getProfile, getPlayerProfile, getAppearanceAffinity, getAcceptanceContext, getContext})) if (typeof fn !== 'function') throw TypeError(`${key} must be a function`);
  if (saveState !== undefined && typeof saveState !== 'function') throw TypeError('saveState must be a function');
  let current, invalidSaved, loadError = null, saving = false;
  try { current = restore(saved); } catch { current = empty(); loadError = 'invalid-saved-state'; }
  // An ordinary game snapshot must not turn a malformed social save into an
  // empty valid ledger. Retain the unreadable input while writes are locked.
  if (loadError) { try { invalidSaved = copy(saved); } catch { invalidSaved = {version: 0, loadError}; } }
  let view = index(current);
  const adopt = next => { current = next; view = index(current); };
  const snapshot = () => copy(loadError ? invalidSaved : current);
  const failure = (reason, event, extra = {}) => ({ok: false, reason, ...(event ? {event: copy(event)} : {}), ...extra});
  const success = (event, replayed = false) => ({ok: true, replayed, event: event ? copy(event) : null});
  const guard = () => loadError || (saving ? 'ledger-busy' : !saveState ? 'persistence-unavailable' : null);
  function clock() {
    let value;
    try { value = getClock(); } catch { return null; }
    return validClock(value) ? {seconds: value.seconds, day: value.day} : null;
  }
  function replace(event) {
    return {...current, events: current.events.map(previous => previous.id === event.id ? event : previous)};
  }
  function persist(next, event) {
    saving = true;
    try {
      next = compact(next);
      const result = saveState(copy(next), copy(event));
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch(() => {});
        return failure('async-save-unsupported');
      }
      if (result === false || result?.ok === false) return failure('save-failed');
      adopt(next);
      if(event.status==='completed'&&event.topicId==='private-company'){try{onCompleted(copy(event));}catch{}}
      return success(event);
    } catch { return failure('save-failed'); }
    finally { saving = false; }
  }
  function terminal(event, status, extra) {
    const now = clock();
    if (!now) return failure('invalid-clock', event);
    if (now.seconds < event.startedAt || now.day < event.startedDay) return failure('clock-reversed', event);
    const nextEvent = {...event, ...extra, status, endedAt: now.seconds, endedDay: now.day, cooldownUntil: now.seconds + PLAYER_CONVERSATION_COOLDOWN};
    const result = persist(replace(nextEvent), nextEvent);
    if (result.ok) return result;
    const waiting = {...nextEvent, status: status === 'completed' ? 'pending-completion' : 'pending-cancellation'};
    adopt(replace(waiting));
    return failure(result.reason, waiting);
  }
  function retryPending() {
    const error = guard();
    if (error) return failure(error);
    const event = view.awaitingSave;
    if (!event) return success(null, true);
    const next = {...event, status: event.status === 'pending-completion' ? 'completed' : 'cancelled'};
    const result = persist(replace(next), next);
    return result.ok ? result : failure(result.reason, event);
  }
  function progress(id, elapsed) {
    const event = view.events.get(id);
    if (!event) return null;
    if (!loadError && !saving && event.status === 'accepted' && finite(elapsed) && elapsed > event.elapsed) {
      // Updating this isolated evidence is O(1), with no writes or NPC scans.
      event.elapsed = Math.min(event.duration, elapsed);
    }
    return copy(event);
  }
  function contextFor(actorId) {
    const actor = view.actors.get(actorId) || {};
    const external = getContext(actorId) || {};
    const mismatchEventId = actor.mismatchEventId || (actor.lastCompleted?.feeling === 'mismatched' ? actor.lastCompleted.id : null);
    return {...external, completedCount: Math.max(actor.completedCount || 0, external.completedCount || 0),
      relation: signed((actor.relation || 0) + (external.relation || 0)), trust: signed((actor.trust || 0) + (external.trust || 0)),
      lastCompletedId: actor.lastCompleted?.id || external.lastCompletedId || null,
      mismatchEventId: mismatchEventId !== actor.repairedEventId ? mismatchEventId : null,
      faultEventId: external.faultEventId !== actor.repairedEventId ? external.faultEventId || null : null,
      supportStance: actor.supportStance, supportEventId: actor.supportEventId, supportAt: actor.supportAt, supportEvidenceId: actor.supportEvidenceId, supportFaultId: actor.supportFaultId,
      acknowledgedEventId: actor.acknowledgedEventId || null,
      interestGiven: actor.interestGiven === true, interestReceived: actor.interestReceived === true,
      boundary: actor.boundary === true || external.boundary === true};
  }
  function start(actorId, topicId, options = {}) {
    const error = guard();
    if (error) return failure(error);
    if (!idValid(actorId)) return failure('invalid-actor');
    const topic = TOPICS.get(topicId);
    if (!topic) return failure('invalid-topic');
    let interactionContext;
    if (relationshipInteraction(topicId)) {
      try {
        const context = contextFor(actorId);
        interactionContext = Object.fromEntries(['available', 'completedCount', 'relation', 'trust', 'opinion', 'aversion', 'age', 'selfAge', 'lastCompletedId', 'mismatchEventId', 'faultEventId', 'acknowledgedEventId', 'interestGiven', 'interestReceived', 'boundary', 'privatePlaceAvailable', 'socialAt', 'knownEvidenceId', 'knownFaultId', 'knownReputation', 'knownConduct', 'knownEvidence', 'practicalExperience', 'partnerExperience', 'healthConcern', 'supportStance', 'supportEventId'].filter(key => context[key] !== undefined).map(key => [key, context[key]]));
        interactionContext.initiator = options.initiator === 'npc' ? 'npc' : 'player';
        interactionContext.supportRespondent = interactionContext.initiator === 'player';
        interactionContext.explicitConsent = options.explicitConsent === true;
      } catch { return failure('profile-unavailable'); }
      if (!relationshipInteractionEligible(topicId, interactionContext)) return failure('interaction-unavailable');
      if (topic.private && options.explicitConsent !== true && options.offer !== true) return failure('explicit-consent-required');
    }
    if (view.awaitingSave) return failure('pending-save', view.awaitingSave);
    if (view.active) return view.active.actorId === actorId && view.active.topicId === topicId ? success(view.active, true) : failure('conversation-active', view.active);
    const now = clock(), actor = view.actors.get(actorId);
    if (!now) return failure('invalid-clock');
    const latest = current.events.at(-1);
    if (now.seconds < (latest?.endedAt ?? latest?.startedAt ?? current.archive.endedAt) ||
        now.day < (latest?.endedDay ?? latest?.startedDay ?? current.archive.endedDay)) return failure('clock-reversed');
    if (actor && now.seconds < actor.cooldownUntil) return failure('cooldown', null, {cooldownUntil: actor.cooldownUntil, remaining: actor.cooldownUntil - now.seconds});
    if (!Number.isSafeInteger(current.nextSerial + 1)) return failure('event-limit');
    const attempt = (actor?.attempts || 0) + 1, id = eventId(actorId, attempt);
    let person, affinity, acceptanceContext;
    try {
      person = profile(getProfile(actorId), actor?.relation, actor?.opinion);
      const raw = getAppearanceAffinity(actorId);
      const context = getAcceptanceContext(actorId);
      acceptanceContext = finite(context) ? Math.max(-.12, Math.min(.10, context)) : 0;
      affinity = finite(raw) ? Math.max(-.04, Math.min(.04, raw)) : 0;
      if (interactionContext) {
        interactionContext.receptivity = unit(conversationTopicFit(person, topic.fitKind) * .7 + person.values.company * .15 + .075 + person.relations.player * .075);
        const self = profile(getPlayerProfile());
        interactionContext.selfReceptivity = unit(conversationTopicFit(self, topic.fitKind) * .7 + self.values.company * .15 + .075 + (actor?.playerRelation || 0) * .075);
      }

    } catch { return failure('profile-unavailable'); }
    const chance = unit(.20 + person.traits.sociability * .24 + person.needs.social * .18 + conversationTopicFit(person, topic.fitKind || topic.kind) * .30 +
      (person.experiences.some(e => e.kind === topic.kind) ? .08 : 0) + person.relations.player * .12 + person.opinions.player * .10 -
      person.needs.fatigue * .24 - person.needs.hunger * .30 + affinity + acceptanceContext);
    const roll = hash(`player-conversation-v1|${String(worldSeed)}|${id}`) / 4294967296;
    const event = {id, serial: current.nextSerial, attempt, actorId, topicId, kind: topic.kind, status: roll < chance ? (topic.private && options.offer === true && options.explicitConsent !== true ? 'offered' : 'accepted') : 'declined',
      duration: topic.duration, elapsed: 0, startedAt: now.seconds, startedDay: now.day, cooldownUntil: now.seconds + PLAYER_CONVERSATION_COOLDOWN,
      chance, roll, appearanceAffinity: affinity, ...(interactionContext ? {interactionContext} : {})};
    if (event.status === 'declined') Object.assign(event, {endedAt: now.seconds, endedDay: now.day});
    return persist({...current, nextSerial: current.nextSerial + 1, events: [...current.events, event]}, event);
  }
  function complete(id, {elapsed} = {}) {
    const error = guard();
    if (error) return failure(error);
    const event = view.events.get(id);
    if (!event) return failure('unknown-event');
    if (completed(event)) return success(event, true);
    if (event.status === 'pending-completion') return retryPending();
    if (event.status !== 'accepted') return failure('not-accepted', event);
    if (elapsed !== undefined && (!finite(elapsed) || elapsed < 0)) return failure('invalid-elapsed', event);
    if (Math.max(event.elapsed, elapsed ?? 0) < event.duration) return failure('unfinished', event);
    let disposition, completedContext;
    try {
      const actor = view.actors.get(event.actorId);
      if (relationshipInteraction(event.topicId)) {
        const context = {...contextFor(event.actorId), initiator: event.interactionContext.initiator};
        if (event.topicId === 'private-company' && event.interactionContext.explicitConsent !== true || !relationshipInteractionEligible(event.topicId, context)) return cancel(id, 'interaction-no-longer-available');
        completedContext = event.interactionContext;
        if (relationshipInteraction(event.topicId).socialState) completedContext = {...completedContext,...Object.fromEntries(['relation','trust','aversion','boundary','knownReputation','knownConduct','socialAt','knownEvidenceId','knownFaultId'].map(key=>[key,context[key]??null]))};
        disposition = relationshipInteractionOutcome(event.topicId, completedContext);
      } else disposition = conversationDisposition(profile(getProfile(event.actorId), actor.relation, actor.opinion), profile(getPlayerProfile()), event.kind, 'player');
    } catch { return failure('profile-unavailable', event); }
    return terminal(event, 'completed', {...(completedContext ? {interactionContext:completedContext} : {}), elapsed: event.duration, feeling: disposition.feeling, result: {actorId: event.actorId, targetId: 'player', ...disposition}});
  }
  function cancel(id, reason = 'cancelled') {
    const error = guard();
    if (error) return failure(error);
    const event = view.events.get(id);
    if (!event) return failure('unknown-event');
    if (event.status === 'pending-cancellation') return retryPending();
    if (event.status === 'pending-completion') return failure('completion-pending', event);
    if (event.status !== 'accepted' && event.status !== 'offered') return success(event, true);
    if (typeof reason !== 'string' || !reason || reason.length > 128) return failure('invalid-reason', event);
    return terminal(event, 'cancelled', {reason});
  }
  function confirm(id) {
    const error = guard();
    if (error) return failure(error);
    const event = view.events.get(id);
    if (!event) return failure('unknown-event');
    if (event.status === 'accepted' && event.interactionContext?.explicitConsent === true) return success(event, true);
    if (event.status !== 'offered') return failure('not-offered', event);
    try { if (!relationshipInteractionEligible(event.topicId, contextFor(event.actorId))) return cancel(id, 'interaction-no-longer-available'); }
    catch { return failure('profile-unavailable', event); }
    const next = {...event, status: 'accepted', interactionContext: {...event.interactionContext, explicitConsent: true}};
    return persist(replace(next), next);
  }
  const offer = (actorId, topicId, options = {}) => start(actorId, topicId, {...options, offer: true, explicitConsent: false});
  return Object.freeze({loadError, start, offer, confirm, progress, complete, cancel, retryPending, snapshot,
    topics: PLAYER_CONVERSATION_TOPICS,
    topicsFor: (actorId, options = {}) => { try { return [...PLAYER_CONVERSATION_TOPICS, ...relationshipInteractionOptions({...contextFor(actorId), initiator: options.initiator === 'npc' ? 'npc' : 'player'})]; } catch { return [...PLAYER_CONVERSATION_TOPICS]; } },
    repairFor: actorId => view.actors.get(actorId)?.repairedEventId || null,
    supportFor: actorId => { const a=view.actors.get(actorId); return a?.supportEventId ? {trust:a.trust||0,boundary:a.boundary===true,supportStance:a.supportStance,supportEventId:a.supportEventId,supportAt:a.supportAt,supportEvidenceId:a.supportEvidenceId,supportFaultId:a.supportFaultId} : null; },
    relationshipFor: actorId => { try { const context = contextFor(actorId); return {...context, stage: relationshipStage(context), playerRelation: view.actors.get(actorId)?.playerRelation || 0, inverseRelation: view.actors.get(actorId)?.playerRelation || 0, inverseOpinion: view.actors.get(actorId)?.playerOpinion || 0}; } catch { return null; } },
    event: id => copy(view.events.get(id) || null), active: () => copy(view.active), pending: () => copy(view.awaitingSave),
    completedCount: actorId => view.actors.get(actorId)?.completedCount || 0,
    lastCompleted: actorId => copy(view.actors.get(actorId)?.lastCompleted || null),
    relationFor: (actorId, targetId = 'player') => targetId === 'player' ? view.actors.get(actorId)?.relation || 0 : 0,
    knownOpinion: (actorId, targetId = 'player') => targetId === 'player' ? view.actors.get(actorId)?.opinion || 0 : 0,
  });
}
