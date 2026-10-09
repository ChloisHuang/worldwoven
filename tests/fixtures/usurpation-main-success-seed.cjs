// CR04 independent SUCCESS-PREREQUISITE fixture. This is explicitly synthetic
// historical input, never a continuation or success of the seed-42 refusal case.
// No production scene/navigation is executed. Its declared bodies/points exist
// only long enough for the real four-second political-action writer to run.
// The caller must use a fresh harness save and a separate output directory.
// Never read, replace, or write usurpation-main-checkpoint.json from this helper.
module.exports = async function usurpationMainSuccessSeed({prior, mod, linker, root, assert}) {
  const path = require('node:path');
  const copy = value => JSON.parse(JSON.stringify(value));
  const same = (left, right, message) => assert.deepEqual(copy(left), copy(right), message);
  const before = copy(prior), save = copy(prior);
  async function load(name) {
    const module = mod(path.join(root, 'game', name));
    if (module.status === 'unlinked') await module.link(linker);
    if (module.status !== 'evaluated') await module.evaluate();
    return module.namespace;
  }
  assert(save.appearance && Number.isSafeInteger(save.appearance.seed), 'A fresh initial harness save is required');
  for (const key of ['playerConversations', 'relationshipEvents', 'palaceUsurpation', 'chinaUsurpationActions',
    'chinaPalaceLife', 'chinaAudience', 'familyLife', 'formalCareers', 'simulationClock', 'worldContinuity']) {
    assert.equal(save[key], undefined, 'Success fixture cannot replace existing history: ' + key);
  }
  const conversations = await load('player-conversation-ledger.js');
  const decisions = await load('npc-life-decisions.js');
  const relationships = await load('relationship-events.js');
  const attention = await load('social-attention.js');
  const policy = await load('palace-usurpation-policy.js');
  const {createPalaceUsurpation} = await load('palace-usurpation-ledger.js');
  const {createChinaUsurpationActions} = await load('china-usurpation-actions.js');
  const {readChinaUsurpationContext} = await load('china-usurpation-context.js');
  const {ensurePlayerAge} = await load('player-age.js');
  const {GAME_MINUTES_PER_SECOND} = await load('simulation-clock.js');

  // Authored official ages: china-palace-audience.js. The two original guards
  // have no recorded ages; the context reader must retain its unaged-duty marker.
  const people = [
    {id: 'cn-official-rites', ageYears: 46, circleId: 'court'},
    {id: 'cn-official-justice', ageYears: 51, circleId: 'court'},
    {id: 'cn-official-personnel', ageYears: 42, circleId: 'court'},
    {id: 'cn-archery', ageYears: null, circleId: 'guard'},
    {id: 'cn-range-warden', ageYears: null, circleId: 'guard'},
  ];
  const actorIds = people.map(person => person.id), caseId = 'palace-usurpation:0:1';
  const seedLimit = 1000000;
  const baseReceptivity = profile => decisions.conversationTopicFit(profile, 'staff-work') * .7 + profile.values.company * .15 + .075;
  // Transparent, finite, pure-input selection. No world is built, no history
  // is rerolled, and no accepted flag/receipt is edited while choosing a seed.
  // A low resolution roll permits testing the subsequent *live* resolution;
  // the fixture itself does not prepare routes or invoke resolution.
  let seed = null;
  for (let candidate = 0; candidate < seedLimit; candidate++) {
    if (policy.palaceUsurpationRoll(candidate, caseId + ':resolution') >= .2) continue;
    if (!actorIds.every(id => policy.palaceUsurpationRoll(candidate, caseId + ':political-response:' + id) < .5)) continue;
    if (!actorIds.every(id => baseReceptivity(relationships.relationshipProfile(id, {}, candidate)) >= .55)) continue;
    seed = candidate;
    break;
  }
  assert.notEqual(seed, null, 'Declared finite seed-selection criterion must find a fixture seed');
  save.appearance.seed = seed;
  ensurePlayerAge(save); // Same explicit adult-start migration as production.
  assert(Number.isFinite(save.playerProfile.ageYears) && save.playerProfile.ageYears >= 18);
  const seedSelection = {
    selectedSeed: seed, originalHarnessSeed: before.appearance.seed, examinedThrough: seed, upperBoundExclusive: seedLimit,
    criterion: 'First integer seed starting at zero with all five political-response rolls < 0.5, resolution roll < 0.2, and all five unchanged seeded baseline support receptivities >= 0.55. Pure policy/profile reads only; no scene or historical-action search.',
    resolutionRoll: policy.palaceUsurpationRoll(seed, caseId + ':resolution'),
    actors: actorIds.map(id => ({actorId: id, politicalRoll: policy.palaceUsurpationRoll(seed, caseId + ':political-response:' + id),
      baselineReceptivity: baseReceptivity(relationships.relationshipProfile(id, {}, seed))})),
  };

  // Officials use their actual fresh life-controller profiles. Guards use
  // main's ordinary relationshipProfile fallback; never create a staff owner
  // for them or invent needs/traits/ages. These reads are not persisted owners.
  const officialProfiles = decisions.createLifeDecisions({worldSeed: seed,
    actorIds: people.filter(person => person.circleId === 'court').map(person => person.id), saved: {}}).snapshot().people;
  const raw = id => officialProfiles[id] || {};
  const identities = Object.fromEntries(people.map(person => [person.id, {actorId: person.id, alive: true, country: 'china', ageYears: person.ageYears}]));
  identities.player = {actorId: 'player', alive: true, country: 'china', ageYears: save.playerProfile.ageYears};
  let seconds = 0, ledger;
  const clock = () => {
    const minutes = 600 + seconds * GAME_MINUTES_PER_SECOND;
    return {seconds, day: Math.floor(minutes / 1440), hour: minutes % 1440 / 60};
  };
  const social = relationships.createRelationshipEvents({worldSeed: seed, getProfile: raw,
    getIdentity: id => identities[id] || null, getSupportProfile: id => supportProfile(id), saveState: () => true});
  const profile = id => social.projection(id, raw(id));
  function supportProfile(id) {
    const person = profile(id), last = ledger?.lastCompleted(id), support = ledger?.supportFor(id);
    return !last ? person : {...person,
      relations: {...person.relations, player: (person.relations?.player || 0) + ledger.relationFor(id)},
      interactions: {...person.interactions, player: {...person.interactions?.player, ...support,
        completedCount: ledger.completedCount(id), lastCompletedId: last.id}}};
  }
  const clamp = value => Math.max(-1, Math.min(1, value));
  function factors(id) {
    const person = profile(id);
    return attention.socialAttentionFactors({observer: {...person, ageYears: identities[id]?.ageYears,
      relations: {...person.relations, player: clamp((person.relations?.player || 0) + (ledger?.relationFor(id) || 0))},
      opinions: {...person.opinions, player: clamp((person.opinions?.player || 0) + (ledger?.knownOpinion(id) || 0))},
      reputationForTarget: social.knownReputation(id, 'player')},
    target: {id: 'player', ageYears: save.playerProfile.ageYears},
    appearanceAffinity: attention.individualAppearanceAffinity({observerId: id, worldSeed: seed, shapeTraits: save.appearance.player?.shapeTraits})});
  }
  ledger = conversations.createPlayerConversationLedger({worldSeed: seed, getClock: clock,
    getProfile: profile, getPlayerProfile: () => profile('player'),
    getAppearanceAffinity: id => factors(id).acceptanceAppearance,
    getAcceptanceContext: id => factors(id).acceptanceContext,
    getContext: id => {
      const person = profile(id), pair = social.pair(id, 'player'), known = social.knownConduct(id, 'player');
      return {available: true, age: identities[id].ageYears, selfAge: save.playerProfile.ageYears,
        relation: person.relations?.player || 0, trust: pair?.trust || 0, opinion: person.opinions?.player || 0,
        aversion: pair?.aversion || 0, boundary: false, knownReputation: social.knownReputation(id, 'player'),
        knownConduct: known.score, knownEvidence: !!known.last?.id, knownEvidenceId: known.last?.id || null,
        knownFaultId: known.lastFault?.id || null, socialAt: seconds};
    }, saveState: () => true});
  assert.equal(ledger.loadError, null);
  const history = [], attempts = [], supported = [];
  const maxAttemptsPerTopic = 48, servicesPerActor = 32;
  function historicalTalk(actorId, topicId) {
    for (let attempt = 0; attempt < maxAttemptsPerTopic; attempt++) {
      seconds += 100; // One player; serial acts and the public 90s cooldown.
      const started = ledger.start(actorId, topicId);
      assert(started.ok && !started.replayed, actorId + ' ' + topicId + ': ' + JSON.stringify(started));
      let event = started.event;
      if (event.status === 'accepted') {
        seconds += event.duration;
        const completed = ledger.complete(event.id, {elapsed: event.duration});
        assert(completed.ok, JSON.stringify(completed));
        event = completed.event;
      }
      history.push({writer: 'playerConversations.start/complete', actorId, eventId: event.id, topicId,
        start: event.startedAt, end: event.endedAt, status: event.status,
        ...(event.result?.supportStance ? {stance: event.result.supportStance} : {})});
      if (event.status === 'declined') continue;
      assert.equal(event.status, 'completed');
      return event;
    }
    throw Error('Bounded synthetic conversation recipe exhausted: ' + actorId + ' ' + topicId);
  }
  for (const person of people) {
    for (let index = 0; index < servicesPerActor; index++) {
      seconds += 70;
      const start = seconds, eventId = 'usurpation-success-history:' + person.id + ':service:' + (index + 1);
      seconds += 5;
      const result = social.record({id: eventId, source: 'china-palace-tea', kind: 'service', outcome: 'completed',
        actorId: 'player', participants: ['player', person.id], at: seconds});
      assert(result.ok && !result.replayed, JSON.stringify(result));
      history.push({writer: 'relationshipEvents.record', actorId: person.id, eventId, start, end: seconds, status: 'completed'});
    }
    historicalTalk(person.id, 'art');
    historicalTalk(person.id, 'gratitude');
    historicalTalk(person.id, 'gratitude');
    const response = historicalTalk(person.id, 'support-request');
    attempts.push({actorId: person.id, eventId: response.id, stance: response.result.supportStance});
    assert.equal(response.result.supportStance, 'support', 'Original seeded personality must support through its public outcome');
    assert.equal(social.stanceFor(person.id, 'player', supportProfile(person.id)).active, true);
    supported.push({actorId: person.id, circleId: person.circleId, eventId: response.id});
  }
  const historyEndSeconds = seconds;
  const stagedDay = Math.ceil((600 + seconds * GAME_MINUTES_PER_SECOND) / 1440);
  seconds = (stagedDay * 1440 + 780 - 600) / GAME_MINUTES_PER_SECOND;

  // These are DECLARED FIXTURE bodies, not scene actors or navigation proof.
  // IDs equal production's original IDs so the later main restore can bind
  // the same people. No positions are installed in worldContinuity.
  function body(id, ageYears) {
    const position = {x: 0, y: 0, z: 0, toArray() {return [this.x, this.y, this.z];},
      set(x, y, z) {this.x = x; this.y = y; this.z = z;}};
    return {actorId: id, bodyId: id, alive: true, walking: false, root: {position, userData: {bodyId: id}},
      station: {id, ...(ageYears === null ? {} : {ageYears})}, ...(ageYears === null ? {} : {ageYears})};
  }
  const bodies = new Map([['player', body('player', save.playerProfile.ageYears)], ['cn-emperor', body('cn-emperor', 36)],
    ...people.map(person => [person.id, body(person.id, person.ageYears)])]);
  const fixtureScene = {country: 'china', player: bodies.get('player'), npcs: [...bodies.values()].filter(actor => actor.actorId !== 'player'),
    archery: {guardBinding: () => ({actorId: 'cn-archery', available: true}),
      wardenBinding: () => ({actorId: 'cn-range-warden', available: true})}};
  const contextNow = () => readChinaUsurpationContext({scene: fixtureScene, relationships: social, getProfile: supportProfile});
  const politicalContext = contextNow();
  same(politicalContext.supporters.map(person => person.id), actorIds, 'General support comes from the shared context reader');
  for (const person of politicalContext.supporters.filter(person => person.circleId === 'guard')) {
    assert.equal(person.ageYears, null);
    assert.equal(person.participationSource, 'original-unaged-guard-duty');
  }
  let adapter, coreDurable, actionDurable, lease = null;
  const core = createPalaceUsurpation({worldSeed: seed, getClock: clock, getContext: contextNow,
    verifyEvidence: (proof, request) => adapter?.verifyEvidence(proof, request) === true,
    saveState: value => {coreDurable = copy(value); return true;}});
  assert(core.begin().ok);
  assert.equal(core.currentTask().id, caseId);
  assert(core.selectRoute(caseId, ['guard', 'abdication']).ok);
  const propId = 'usurpation-success-fixture-political-prop';
  const prop = {id: propId, syntheticFixture: true};
  const siteFor = (kind, {actorId, participantIds}) => kind === 'political-response' ? {
    id: 'usurpation-success-fixture-site:' + actorId, objectId: propId, name: 'Declared synthetic political-history point',
    position: [0, 0, 0], actorPoints: Object.fromEntries(participantIds.filter(id => id !== 'player').map(id => [id, [.8, 0, 0]])),
  } : null;
  const isBody = actor => !!actor && bodies.get(actor.actorId) === actor && actor.bodyId === actor.actorId && actor.alive;
  adapter = createChinaUsurpationActions({core, getTask: () => core.currentTask(), getContext: contextNow, getClock: clock,
    getPlayer: () => bodies.get('player'), resolveActor: id => bodies.get(id), resolveObject: id => id === propId ? prop : null,
    getSite: siteFor, standing: actor => isBody(actor) && !actor.walking,
    canSee: request => request.object === prop || isBody(request.actor) &&
      Math.hypot(request.position[0], request.position[2]) <= 2.8,
    isAvailable: actor => isBody(actor), getBusy: () => false,
    borrowActors: request => {
      if (lease || request.kind !== 'political-response' || request.actors.length !== 1 || !request.actors.every(isBody)) return false;
      lease = request; return true;
    },
    groupState: leaseId => ({held: lease?.leaseId === leaseId, legalRoutes: lease?.kind === 'political-response',
      participants: (lease?.actors || []).map(actor => ({actorId: actor.actorId, bodyId: actor.bodyId,
        arrived: JSON.stringify(actor.root.position.toArray()) === JSON.stringify(lease.destinations[actor.actorId])}))}),
    releaseActors: leaseId => {assert.equal(lease?.leaseId, leaseId); lease = null;},
    saveState: value => {actionDurable = copy(value); return true;}, enabled: true});
  const politicalActions = [];
  for (const actorId of actorIds) {
    const intent = adapter.intent('political-response', actorId);
    assert(intent, JSON.stringify(adapter.state()));
    const site = siteFor(intent.kind, intent);
    bodies.get('player').root.position.set(...site.position);
    bodies.get(actorId).root.position.set(...site.actorPoints[actorId]);
    assert(adapter.start(intent), 'Declared fixture action starts: ' + actorId);
    const began = clock();
    for (let tick = 0; tick < 40; tick++) {
      if (tick === 39) assert(!core.currentTask().pledges.some(row => row.actorId === actorId), 'No political receipt before four seconds');
      seconds += .1;
      adapter.update(.1);
    }
    assert.equal(adapter.active(), false, JSON.stringify(adapter.state()));
    const pledge = core.currentTask().pledges.find(row => row.actorId === actorId);
    assert.equal(pledge?.accepted, true, 'Policy decides the selected fixture response');
    assert.equal(pledge.receipt.durationSeconds, 4);
    assert.equal(pledge.bodyId, actorId);
    politicalActions.push({syntheticFixture: true, actorId, bodyId: actorId, startedAt: began, endedAt: clock(),
      receiptId: pledge.receipt.id, site: copy(site), roll: pledge.roll, chance: pledge.chance});
  }
  const task = core.currentTask();
  assert.equal(task.stage, 'planning');
  assert.equal(core.snapshot().cases.length, 1);
  assert.equal(task.pledges.length, people.length);
  assert(Object.values(task.preparations).every(value => value === null));
  assert.equal(task.resolution, null);
  assert.equal(task.investiture, null);
  assert.equal(core.office().actorId, 'cn-emperor');
  assert.equal(core.office().revision, 0);
  assert.equal(adapter.snapshot().activity, null);
  assert.equal(adapter.snapshot().mealPending, null);
  assert(Object.values(adapter.snapshot().proofs).every(row => row.applied && row.kind === 'political-response'));
  same(core.snapshot(), coreDurable, 'Only public core writes form the saved case');
  same(adapter.snapshot(), actionDurable, 'Only public action writes form the saved proofs');
  save.playerConversations = copy(ledger.snapshot());
  save.relationshipEvents = copy(social.snapshot());
  save.palaceUsurpation = copy(coreDurable);
  save.chinaUsurpationActions = {version: 1, actions: copy(actionDurable), storyMeals: {}};
  save.simulationClock = {version: 1, seconds};
  save.worldContinuity = {version: 1, activeRegion: 'china', regions: {}};
  const changedKeys = new Set(['appearance', 'playerProfile', 'playerConversations', 'relationshipEvents',
    'palaceUsurpation', 'chinaUsurpationActions', 'simulationClock', 'worldContinuity']);
  for (const key of Object.keys(before)) if (!changedKeys.has(key)) same(save[key], before[key], 'Preserve unrelated initial value: ' + key);
  same({...save.appearance, seed: before.appearance.seed}, before.appearance, 'Only the declared fixture seed changes in appearance');
  if (before.playerProfile) for (const key of Object.keys(before.playerProfile)) same(save.playerProfile[key], before.playerProfile[key], 'Preserve initial player profile: ' + key);
  same(prior, before, 'Never mutate the caller input');
  return {save, seed, caseId, pledges: copy(task.pledges), supported, attempts, stagedDay, seedSelection,
    history, politicalActions, historyEndSeconds, politicalContext: copy(politicalContext),
    budgets: {servicesPerActor, maxAttemptsPerTopic, completedTopicsPerActor: 4, maxConversationAttempts: people.length * 4 * maxAttemptsPerTopic},
    profiles: people.map(person => ({actorId: person.id, bodyId: person.id, ageYears: person.ageYears,
      source: person.circleId === 'court' ? 'createLifeDecisions fresh official profile' : 'relationshipProfile original unowned-guard fallback',
      traits: copy(profile(person.id).traits), values: copy(profile(person.id).values)})),
    sourceWriterAPIs: ['ensurePlayerAge', 'relationshipEvents.record', 'playerConversations.start', 'playerConversations.complete',
      'palaceUsurpation.begin', 'palaceUsurpation.selectRoute', 'chinaUsurpationActions.start', 'chinaUsurpationActions.update',
      'chinaUsurpationActions.verifyEvidence', 'palaceUsurpation.pledge'],
    staging: 'Independent explicitly synthetic success prerequisite, not natural play and not success of original seed-42 case. The selected deterministic seed and pure selection criterion are recorded. Serial ordinary services and conversations create general support through unchanged public writers and original seeded personalities. Five political responses are synthetic historical fixture actions through the real four-second adapter and core verifier, on declared fixture bodies/points; they are not production-scene geometry, navigation, meetings or visual evidence. Original IDs are retained, both guard ages remain null, and their context uses original-unaged-guard-duty. One planning case selects guard and abdication with five accepted policy decisions; no route preparation, resolution, investiture, office transfer, career, wages, clothes, rank, rooms, actor pose or production-scene state is installed. Fresh China startup must construct actual original bodies, then production main must perform and verify both six-second preparations, subsequent resolution, unique investiture and player imperial duties. Original usurpation-main-checkpoint.json is never read or written.',
  };
};
