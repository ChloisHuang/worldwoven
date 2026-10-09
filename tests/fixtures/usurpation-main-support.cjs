// CR04 retrospective ordinary-social input, deliberately separate from the
// real main political actions. No scene, clock, career, money or office writer.
// API: await appendUsurpationMainSupport({save, load?, actorIds?, historyEnd?})
// load(name) returns the production game module namespace (also supports the
// existing VM harness). Omit it for native imports in the lightweight test.
// Returns {save, report}; does not mutate its input or write any files.
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const copy = value => JSON.parse(JSON.stringify(value));
const equal = (left, right, message) => assert.deepEqual(copy(left), copy(right), message);
const clamp = value => Math.max(-1, Math.min(1, value));
const add = (left = {}, right = {}) => Object.fromEntries([...new Set([...Object.keys(left), ...Object.keys(right)])]
  .map(key => [key, clamp((left[key] || 0) + (right[key] || 0))]));
const START = 11056, END = 12600, SERVICE_SECONDS = 5, SERVICE_COUNT = 10;
const ROUND_SECONDS = 100, ROUND_COUNT = 15, CONVERSATION_LIMIT = 60;
const DEFAULT_ACTORS = ['cn-official-records', 'cn-consort-heng', 'cn-archery', 'cn-range-warden'];
const GUARDS = new Set(['cn-archery', 'cn-range-warden']);
const nativeLoad = name => import(pathToFileURL(path.resolve(__dirname, '../../source/game', name)).href);

module.exports = async function appendUsurpationMainSupport({save, load = nativeLoad,
  actorIds = DEFAULT_ACTORS, historyEnd = END} = {}) {
  assert(save && typeof save === 'object', 'A full original main save is required');
  assert(Array.isArray(actorIds) && actorIds.length > 0 && actorIds.length <= 6 && new Set(actorIds).size === actorIds.length);
  assert(Number.isFinite(historyEnd) && historyEnd >= START && historyEnd <= END, 'Cannot extend the historical window into real main activity');
  const before = copy(save), output = copy(save), seed = before.appearance?.seed;
  assert(Number.isSafeInteger(seed), 'Keep the existing seed');
  assert(Number.isFinite(before.simulationClock?.seconds) && before.simulationClock.seconds >= END);
  const task = before.palaceUsurpation?.cases?.at(-1);
  assert.equal(task?.id, 'palace-usurpation:0:1', 'Use the original case-1 continuation');
  const caseStart = (task.startedAt.day * 1440 + task.startedAt.hour * 60 - 600) / .7;
  const end = Math.min(historyEnd, END, caseStart, before.simulationClock.seconds);
  // The injected main harness caches VM modules while linking shared imports.
  // Await each module so that an in-flight link is never evaluated twice.
  const conversationModule = await load('player-conversation-ledger.js');
  const socialModule = await load('relationship-events.js');
  const lifeModule = await load('npc-life-decisions.js');
  const attentionModule = await load('social-attention.js');
  const familyModule = await load('family-life.js');
  const originalConversations = before.playerConversations, originalSocial = before.relationshipEvents;
  assert(Array.isArray(originalConversations?.events) && originalSocial?.receipts && Array.isArray(originalSocial.recent));
  const marker = 'usurpation-main-support-v1:' + task.id + ':';
  let cursor = Math.max(START, originalConversations.archive?.endedAt || 0,
    ...originalConversations.events.map(event => event.endedAt ?? event.startedAt),
    ...originalSocial.recent.filter(event => event.actorId === 'player' && event.id.startsWith(marker)).map(event => event.at));
  let fixtureTime = cursor, ledger;
  const report = {version: 1, status: 'unchanged', caseId: task.id,
    window: {start: cursor, endExclusive: end, usedThrough: cursor, gameClockSeconds: before.simulationClock.seconds},
    budgets: {rounds: ROUND_COUNT, roundSeconds: ROUND_SECONDS, maxAttemptsPerActor: ROUND_COUNT,
      maxNewConversations: Math.max(0, Math.min(CONVERSATION_LIMIT, conversationModule.PLAYER_CONVERSATION_HISTORY_LIMIT - originalConversations.events.length))},
    actors: [], newEvents: [], profiles: [], preservation: null,
    compaction: {relationshipRecentRemoved: [], conversationCompacted: false},
    staging: 'Retrospective ordinary tea services and public conversations only. Original saved personalities and needs are frozen inputs. Each player action is serial, personal cooldowns apply, and all historical actions end before the original 13:00 main scene. This is not naturally elapsed or physically performed main gameplay.'};
  const family = familyModule.createFamilyLife({saved: before.familyLife, worldSeed: seed});
  assert.equal(family.loadError, null, 'Read original identities without registering or aging anyone');
  const identities = before.familyLife.actors, sceneActors = before.worldContinuity?.regions?.china?.actors || {};
  const sources = [
    ['egyptMeal.life', before.egyptMeal?.life], ['japanPerformance.life', before.japanPerformance?.life],
    ['japanOperations.staffLife.decisions', before.japanOperations?.staffLife?.decisions],
    ['franceGardener.life', before.franceGardener?.life], ['franceTea.life', before.franceTea?.life],
    ['chinaSalon.life', before.chinaSalon?.life], ['chinaServiceWorld.staffLife.brain', before.chinaServiceWorld?.staffLife?.brain],
    ['chinaClinic.physicianLife.brain', before.chinaClinic?.physicianLife?.brain],
    ['chinaAudience.life.decisions', before.chinaAudience?.life?.decisions], ['chinaPalaceLife', before.chinaPalaceLife],
  ];
  function raw(id) {
    for (const [source, value] of sources) {
      const profile = value?.people?.[id] || value?.decisions?.people?.[id];
      if (profile) return {source, profile};
    }
    // This is main's existing relationshipProfile fallback, not a generated
    // replacement staff personality or a new actor/age declaration.
    return {source: 'relationshipProfile(existing seed and original ID)', profile: {}};
  }
  const social = socialModule.createRelationshipEvents({saved: originalSocial, worldSeed: seed,
    getProfile: id => raw(id).profile, getIdentity: id => identities[id] || null, saveState: () => true});
  function profile(id) {
    let value = social.projection(id, raw(id).profile);
    // The existing three read-only main projections. Raw owner traits/needs
    // remain intact; NPC-owned social deltas are added once, not reseeded.
    const publicMemory = before.npcPublicInteractions?.china?.brain?.people?.[id];
    if (publicMemory) value = {...value, relations: add(value.relations, publicMemory.relations),
      opinions: add(value.opinions, publicMemory.opinions),
      interactions: lifeModule.mergeSocialMemories(value.interactions, publicMemory.interactions)};
    for (const source of [before.palaceCompanionship, before.salonCompanionship]) {
      const own = source?.people?.[id];
      if (own) value = {...value, relations: add(value.relations, own.relations), opinions: add(value.opinions, own.opinions),
        trust: add(value.trust, own.trust), interactions: lifeModule.mergeSocialMemories(value.interactions, own.interactions)};
    }
    return value;
  }
  function factors(id) {
    const base = profile(id), repair = ledger?.repairFor(id), known = social.knownConduct(id, 'player');
    const observer = {...base, ageYears: identities[id]?.ageYears,
      relations: {...base.relations, player: clamp((base.relations?.player || 0) + (ledger?.relationFor(id) || 0))},
      opinions: {...base.opinions, player: clamp((base.opinions?.player || 0) + (ledger?.knownOpinion(id) || 0))},
      reputationForTarget: social.knownReputation(id, 'player')};
    return attentionModule.socialAttentionFactors({observer, target: {id: 'player', ageYears: before.playerProfile?.ageYears},
      situation: {unresolvedFault: !!known.lastFault && repair !== known.lastFault.id},
      appearanceAffinity: attentionModule.individualAppearanceAffinity({observerId: id, worldSeed: seed, shapeTraits: before.appearance.player?.shapeTraits})});
  }
  ledger = conversationModule.createPlayerConversationLedger({saved: originalConversations, worldSeed: seed,
    getClock: () => ({seconds: fixtureTime, day: Math.floor((600 + fixtureTime * .7) / 1440)}),
    getProfile: profile, getPlayerProfile: () => profile('player'),
    getAppearanceAffinity: id => factors(id).acceptanceAppearance,
    getAcceptanceContext: id => factors(id).acceptanceContext,
    getContext: id => {
      const person = profile(id), pair = social.pair(id, 'player'), known = social.knownConduct(id, 'player');
      return {available: true, age: identities[id]?.ageYears ?? null, selfAge: before.playerProfile?.ageYears ?? null,
        relation: person.relations?.player || 0, trust: pair?.trust || 0, opinion: person.opinions?.player || 0,
        aversion: pair?.aversion || 0, boundary: (pair?.aversion || 0) > .3 || family.related('player', id),
        knownReputation: social.knownReputation(id, 'player'), knownConduct: known.score,
        knownEvidence: !!known.last?.id, knownEvidenceId: known.last?.id || null,
        knownFaultId: known.lastFault?.id || null, faultEventId: known.lastFault?.id || null, socialAt: fixtureTime};
    }, saveState: () => true});
  assert.equal(ledger.loadError, null, 'Do not replace malformed old social history');
  const jobs = actorIds.map(actorId => {
    const result = {actorId, status: null, reason: null, eventId: null, stance: null, attempts: 0, newEventIds: []};
    report.actors.push(result);
    const identity = identities[actorId], source = raw(actorId), person = profile(actorId), prior = ledger.supportFor(actorId);
    report.profiles.push({actorId, source: source.source, ageYears: identity?.ageYears ?? null,
      traits: copy(person.traits), values: copy(person.values)});
    if (!sceneActors[actorId] || !identity || identity.alive !== true || identity.country !== 'china' ||
        !(Number.isFinite(identity.ageYears) && identity.ageYears >= 18 || GUARDS.has(actorId) && identity.ageYears === null)) {
      Object.assign(result, {status: 'ineligible', reason: 'original-living-identity-required'});
    } else if (prior?.supportEventId) {
      Object.assign(result, {status: prior.supportStance, reason: 'existing-ordinary-response-retained', eventId: prior.supportEventId, stance: prior.supportStance});
    } else if (originalSocial.receipts[marker + actorId + ':service:1']) {
      Object.assign(result, {status: 'already-staged', reason: 'prior-fixture-attempt-retained'});
    } else if (ledger.active() || ledger.pending()) {
      Object.assign(result, {status: 'ineligible', reason: 'old-conversation-unsettled'});
    }
    const priorCooldown = Math.max(0, ...(originalConversations.archive?.actors || []).filter(row => row.actorId === actorId).map(row => row.cooldownUntil),
      ...originalConversations.events.filter(event => event.actorId === actorId).map(event => event.cooldownUntil));
    return {actorId, result, serviceAt: 0, services: 0, topic: 0, attempts: 0, cooldown: priorCooldown};
  });
  const stop = (job, status, reason) => Object.assign(job.result, {status, reason});
  function record(job, event) {report.newEvents.push(event);job.result.newEventIds.push(event.eventId);cursor = event.end;}
  const topics = ['art', 'gratitude', 'rest', 'support-request'];
  const origin = cursor + 1;
  let newConversations = 0;
  // Fixed slots are chosen before any response: fifteen 100-second rounds,
  // at most six 6-second service slots followed by six 10-second talk slots.
  // One player performs every slot serially. A person's next talk starts at
  // least 91 seconds after a nine-second completion; service gaps exceed 60.
  // Unused slots stay empty. Declines never reset the ID or inspect a future
  // roll, and support/withhold ends that person's recipe without reconsidering.
  for (let round = 0; round < ROUND_COUNT; round++) {
    const roundStart = origin + round * ROUND_SECONDS;
    for (let index = 0; index < jobs.length; index++) {
      const job = jobs[index];
      if (job.result.status || round >= SERVICE_COUNT) continue;
      if (newConversations >= report.budgets.maxNewConversations) {
        stop(job, 'budget-exhausted', 'new-conversation-row-limit');continue;
      }
      const start = roundStart + index * (SERVICE_SECONDS + 1), finish = start + SERVICE_SECONDS;
      if (finish >= end) {stop(job, 'window-exhausted', 'service-does-not-fit');continue;}
      assert(start > cursor && start >= job.serviceAt, 'Fixed service slots are serial and cooled');
      const eventId = marker + job.actorId + ':service:' + (round + 1);
      assert(!social.snapshot().receipts[eventId], 'A staged service ID must be new');
      const result = social.record({id: eventId, source: 'china-palace-tea', actorId: 'player', participants: ['player', job.actorId],
        outcome: 'completed', kind: 'service', at: finish});
      assert(result.ok && !result.replayed, 'Public service writer must append its actual receipt');
      record(job, {eventType: 'service', actorId: job.actorId, eventId, start, end: finish, status: 'completed'});
      job.serviceAt = finish + 60;job.services++;
    }
    for (let index = 0; index < jobs.length; index++) {
      const job = jobs[index];
      if (job.result.status) continue;
      if (newConversations >= report.budgets.maxNewConversations) {
        stop(job, 'budget-exhausted', 'new-conversation-row-limit');continue;
      }
      const topicId = topics[job.topic];
      // Start ordinary talks early, but finish the declared ten services before
      // asking for support. This rule is fixed independently of every response.
      if (topicId === 'support-request' && job.services < SERVICE_COUNT) continue;
      const topic = ledger.topicsFor(job.actorId).find(row => row.id === topicId);
      if (!topic) {stop(job, 'ineligible', 'ordinary-topic-unavailable:' + topicId);continue;}
      assert(topic.duration <= 9, 'The declared conversation must fit its fixed ten-second slot');
      const start = roundStart + jobs.length * (SERVICE_SECONDS + 1) + index * 10, finish = start + topic.duration;
      if (finish >= end) {stop(job, 'window-exhausted', 'conversation-does-not-fit');continue;}
      if (start < job.cooldown) continue;
      assert(start > cursor, 'Fixed talk slots are serial');
      fixtureTime = start;
      const started = ledger.start(job.actorId, topicId);assert(started.ok && !started.replayed, JSON.stringify(started));
      job.attempts++;job.result.attempts = job.attempts;newConversations++;
      let event = started.event;
      if (event.status === 'accepted') {
        fixtureTime = finish;
        const completed = ledger.complete(event.id, {elapsed: event.duration});assert(completed.ok, JSON.stringify(completed));event = completed.event;
      }
      assert(['declined', 'completed'].includes(event.status));
      record(job, {eventType: 'conversation', actorId: job.actorId, eventId: event.id, start: event.startedAt,
        end: event.endedAt, topicId, status: event.status, ...(event.result?.supportStance ? {stance: event.result.supportStance} : {})});
      job.result.eventId = event.id;job.cooldown = event.cooldownUntil;
      if (event.status === 'declined') continue;
      if (topicId === 'support-request') {
        assert(['support', 'withhold'].includes(event.result.supportStance));
        Object.assign(job.result, {status: event.result.supportStance, stance: event.result.supportStance, reason: 'original-ordinary-response'});
      } else job.topic++;
    }
  }
  for (const job of jobs) if (!job.result.status) stop(job, 'budget-exhausted', 'fixed-round-limit');
  assert(jobs.every(job => job.result.status), 'Every bounded recipe has an explicit result');
  if (report.newEvents.length) {
    output.relationshipEvents = copy(social.snapshot());output.playerConversations = copy(ledger.snapshot());report.status = 'appended';
  }
  for (let index = 0; index < report.newEvents.length; index++) {
    const row = report.newEvents[index];assert(row.start > (index ? report.newEvents[index - 1].end : report.window.start));assert(row.end >= row.start && row.end < end);
  }
  equal(output.playerConversations.events.slice(0, originalConversations.events.length), originalConversations.events, 'All old conversation rows and IDs stay exact');
  equal(output.playerConversations.archive, originalConversations.archive, 'Do not compact old conversations to fit the fixture');
  for (const [id, receipt] of Object.entries(originalSocial.receipts)) equal(output.relationshipEvents.receipts[id], receipt, 'Old permanent service receipt remains: ' + id);
  const rest = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['relationshipEvents', 'playerConversations'].includes(key)));
  equal(rest(output), rest(before), 'Only the two public social ledgers may change');equal(save, before, 'Input is immutable');
  report.window.usedThrough = cursor;
  report.preservation = {clockUnchanged: true, politicalUnchanged: true, otherFieldsUnchanged: true,
    oldConversationRows: originalConversations.events.length, oldReceiptIds: Object.keys(originalSocial.receipts).length};
  const retained = new Set(output.relationshipEvents.recent.map(row => row.id));
  report.compaction.relationshipRecentRemoved = originalSocial.recent.filter(row => !retained.has(row.id)).map(copy);
  return {save: output, report};
};
