// Explicit historical input for the CR04 main integration, not natural play.
// Only the public ordinary-service and conversation writers produce history.
// No political response, preparation, resolution, office or scene pose is seeded.
module.exports = async function usurpationMainSeed({prior, mod, linker, root, assert}) {
  const path = require('node:path');
  async function load(name) {
    const module = mod(path.join(root, 'game', name));
    if (module.status === 'unlinked') await module.link(linker);
    if (module.status !== 'evaluated') await module.evaluate();
    return module.namespace;
  }
  const conversations = await load('player-conversation-ledger.js');
  const decisions = await load('npc-life-decisions.js');
  const relationships = await load('relationship-events.js');
  const residents = await load('china-palace-residents.js');
  const worldSeed = prior.appearance.seed;
  const candidates = [
    ['cn-consort-yue', 29, 'inner'],
    ['cn-official-rites', 46, 'court'],
    ['cn-official-personnel', 42, 'court'],
    ['cn-official-justice', 51, 'court'],
    ['cn-official-records', 35, 'court'],
    ['cn-minister-works', 47, 'court'],
    ['cn-minister-granary', 39, 'court'],
    ['cn-consort-heng', 34, 'inner'],
    ['cn-consort-ling', 25, 'inner'],
    ['cn-palace-herald', 34, 'inner'],
  ].map(([id, ageYears, circleId]) => ({id, ageYears, circleId}));
  const actorIds = candidates.map(person => person.id);
  const residentSave = residents.palaceResidentSave({worldSeed, actorIds, saved: {}});
  const profiles = decisions.createLifeDecisions({worldSeed, actorIds, saved: residentSave}).snapshot().people;
  let seconds = 0, pendingSupport = null, ledger;
  const supported = [], attempts = [];
  const social = relationships.createRelationshipEvents({worldSeed, getProfile: id => profiles[id], saveState: () => true});
  const profile = id => social.projection(id, profiles[id] || relationships.relationshipProfile(id, {}, worldSeed));
  const day = () => Math.floor((600 + seconds * .7) / 1440);
  ledger = conversations.createPlayerConversationLedger({worldSeed,
    getClock: () => ({seconds, day: day()}), getProfile: profile,
    getPlayerProfile: () => relationships.relationshipProfile('player', {}, worldSeed),
    getContext: id => {
      const person = candidates.find(person => person.id === id), pair = social.pair(id, 'player'), known = social.knownConduct(id, 'player');
      return {age: person.ageYears, selfAge: 24, available: true,
        relation: profile(id).relations?.player || 0, trust: pair?.trust || 0,
        aversion: pair?.aversion || 0, knownReputation: social.knownReputation(id, 'player'),
        knownConduct: known.score, knownEvidence: !!known.last?.id,
        knownEvidenceId: known.last?.id || null, knownFaultId: known.lastFault?.id || null, socialAt: seconds};
    },
    saveState: (_next, event) => {
      // The third willing ordinary response is completed historical evidence
      // awaiting persistence. Main must first see two supporters, then commit
      // this exact result through retryPending before its entry can unlock.
      if (event.status === 'completed' && event.topicId === 'support-request' &&
          event.result.supportStance === 'support' && supported.length === 2) {
        pendingSupport = {actorId: event.actorId, eventId: event.id};
        return false;
      }
      return true;
    },
  });
  function historical(person, topic) {
    for (let attempt = 0; attempt < 48; attempt++) {
      seconds += 100;
      const started = ledger.start(person.id, topic);
      assert(started.ok, person.id + ' ' + topic + ': ' + JSON.stringify(started));
      if (started.event.status === 'declined') continue;
      assert.equal(started.event.status, 'accepted');
      seconds += started.event.duration;
      const completed = ledger.complete(started.event.id, {elapsed: started.event.duration});
      if (pendingSupport?.eventId === started.event.id) {
        assert.equal(completed.reason, 'save-failed');
        assert.equal(ledger.pending().status, 'pending-completion');
        return ledger.pending();
      }
      assert(completed.ok, JSON.stringify(completed));
      return completed.event;
    }
    throw Error('Historical conversation did not become available: ' + person.id + ' ' + topic);
  }
  for (const person of candidates) {
    if (supported.length === 2 && supported.every(row => row.circleId === person.circleId)) continue;
    for (let index = 0; index < 10; index++) {
      seconds += 100;
      assert(social.record({id: 'usurpation-history-service:' + person.id + ':' + index,
        source: 'china-palace-tea', kind: 'service', outcome: 'completed', actorId: 'player',
        participants: ['player', person.id], at: seconds}).ok);
    }
    historical(person, 'art');
    for (let index = 0; index < 8; index++) historical(person, 'gratitude');
    const response = historical(person, 'support-request');
    attempts.push({actorId: person.id, circleId: person.circleId, eventId: response.id, stance: response.result.supportStance});
    if (pendingSupport) {
      pendingSupport.circleId = person.circleId;
      break;
    }
    if (response.result.supportStance === 'support') supported.push({actorId: person.id, circleId: person.circleId, eventId: response.id});
  }
  assert.equal(supported.length, 2, 'Two committed historical general supporters');
  assert(pendingSupport, 'Third willing ordinary response has an actual pending-completion event');
  assert(new Set([...supported, pendingSupport].map(person => person.circleId)).size >= 2);
  assert.equal(ledger.supportFor(pendingSupport.actorId), null, 'Uncommitted response cannot already grant support');
  prior.playerConversations = ledger.snapshot();
  prior.relationshipEvents = social.snapshot();
  const stagedDay = Math.ceil((600 + seconds * .7) / 1440);
  prior.simulationClock = {version: 1, seconds: (stagedDay * 1440 + 780 - 600) / .7};
  prior.worldContinuity = {version: 1, activeRegion: 'china', regions: {}};
  assert.equal(prior.palaceUsurpation, undefined);
  assert.equal(prior.chinaUsurpationActions, undefined);
  return {save: prior, supported, pendingSupport, attempts, stagedDay,
    staging: 'Explicit historical ordinary tea-service and adult conversation events produced through public writers using original seeded personalities. Two ordinary supporters are committed; a third ordinary support completion awaits persistence. Calendar alone starts at 13:00 after those histories, not natural multi-day play. Legacy known-China entry is declared; travel remains enabled. No political response, route, court completion, preparation, appointment, sovereign office, money or actor position is seeded.'};
};
