// These tests cover durable social evidence: a repeated menu, failed save or
// restored scene must never manufacture elapsed conversation or repeat rewards.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerConversationLedger, PLAYER_CONVERSATION_TOPICS, PLAYER_CONVERSATION_HISTORY_LIMIT} from '../source/game/player-conversation-ledger.js';
import {conversationDisposition} from '../source/game/npc-life-decisions.js';
import {CHINA_CONSORTS, palaceResidentSave} from '../source/game/china-palace-residents.js';

const copy = value => JSON.parse(JSON.stringify(value));
function person(value = .5) {
  return {traits: {curiosity: value, quiet: value, sociability: value}, values: {company: value, quiet: value, curiosity: value},
    needs: {social: 1, hunger: 0, fatigue: .5}, relations: {}, opinions: {}, experiences: []};
}
function setup(options = {}) {
  const clock = {seconds: 100, day: 1}, profiles = {listener: person(), unrelated: person(.8)};
  let stored, fail = false, writes = 0;
  const settings = {worldSeed: 2, getClock: () => clock, getProfile: id => profiles[id], getPlayerProfile: () => person(),
    saveState: state => { writes++; if (fail) return false; stored = copy(state); }, ...options};
  return {clock, profiles, settings, ledger: createPlayerConversationLedger(settings),
    fail: value => { fail = value; }, stored: () => stored, writes: () => writes};
}
const invite = (ledger, actorId = 'listener', topicId = 'art') => {
  const started = ledger.start(actorId, topicId);
  assert.equal(started.ok, true);
  assert.equal(started.event.status, 'accepted');
  return started.event;
};
function finish(harness, event) {
  harness.clock.seconds += event.duration;
  return harness.ledger.complete(event.id, {elapsed: event.duration});
}

test('one observer produces positive, neutral or negative outcomes from actual preferences; source people stay unchanged', () => {
  const expected = [[1, 'appreciated', .07, .07], [.5, 'neutral', .012, 0], [0, 'mismatched', -.035, -.06]];
  for (const [value, feeling, relation, opinion] of expected) {
    const h = setup(); h.profiles.listener = person(value);
    const before = copy(h.profiles), event = invite(h.ledger);
    assert.equal(h.ledger.knownOpinion('listener'), 0);
    assert.equal(h.ledger.lastCompleted('listener'), null);
    const result = finish(h, event);
    assert.equal(result.ok, true);
    assert.deepEqual(result.event.result, {actorId: 'listener', targetId: 'player', feeling, relation, opinion});
    assert.deepEqual(result.event.result, {actorId: 'listener', targetId: 'player', ...conversationDisposition(h.profiles.listener, person(), 'read', 'player')});
    assert.equal(h.ledger.relationFor('listener'), relation);
    assert.equal(h.ledger.knownOpinion('listener'), opinion);
    assert.equal(h.ledger.relationFor('unrelated'), 0);
    assert.equal(h.ledger.knownOpinion('unrelated'), 0);
    assert.equal(h.ledger.relationFor('listener', 'unrelated'), 0);
    assert.deepEqual(h.profiles, before);
    assert.equal(h.ledger.lastCompleted('listener').id, event.id);
  }
});

test('authored 沈蘅 and 令仪 respond differently to the same player and topic without replacing their personalities', () => {
  const authored = palaceResidentSave({worldSeed: 42, actorIds: CHINA_CONSORTS.map(p => p.id)}).people;
  const before = copy(authored), ids = ['cn-consort-heng', 'cn-consort-ling'];
  const outcomes = {art: ['appreciated', 'neutral'], rest: ['neutral', 'mismatched']};
  for (const [topicId, expected] of Object.entries(outcomes)) {
    const h = setup({worldSeed: 1, getProfile: id => authored[id], getPlayerProfile: () => undefined});
    for (let i = 0; i < ids.length; i++) {
      const event = invite(h.ledger, ids[i], topicId), result = finish(h, event);
      assert.equal(result.event.feeling, expected[i]);
      assert.equal(result.event.result.opinion, expected[i] === 'appreciated' ? .07 : expected[i] === 'mismatched' ? -.06 : 0);
      assert.equal(h.ledger.knownOpinion(ids[i]), result.event.result.opinion);
    }
    assert.equal(h.ledger.knownOpinion('cn-consort-yue'), 0);
  }
  for (const resident of CHINA_CONSORTS) assert.deepEqual(authored[resident.id].traits, resident.traits);
  assert.deepEqual(authored, before);
});

test('duplicate completion and a failed completion retry award once, including pending snapshot reload without actor access', () => {
  const h = setup(); h.profiles.listener = person(1);
  const event = invite(h.ledger), acceptedSave = h.stored();
  h.fail(true); h.clock.seconds += event.duration;
  const failed = h.ledger.complete(event.id, {elapsed: event.duration});
  assert.equal(failed.reason, 'save-failed');
  assert.equal(failed.event.status, 'pending-completion');
  assert.equal(failed.event.elapsed, event.duration);
  assert.equal(h.ledger.relationFor('listener'), 0);
  assert.equal(h.ledger.knownOpinion('listener'), 0);
  assert.deepEqual(h.stored(), acceptedSave);
  assert.equal(h.ledger.cancel(event.id, 'new-duty').reason, 'completion-pending');
  assert.equal(h.ledger.start('unrelated', 'work').reason, 'pending-save');
  const snapshot = h.ledger.snapshot(), result = copy(failed.event.result);
  assert.equal(h.ledger.retryPending().reason, 'save-failed');
  assert.deepEqual(h.ledger.snapshot(), snapshot);
  let saved, calls = 0;
  const restored = createPlayerConversationLedger({saved: snapshot, saveState: next => { calls++; saved = next; },
    getProfile: () => { throw Error('actor has left the scene'); }, getPlayerProfile: () => { throw Error('player has left'); }});
  assert.equal(restored.loadError, null);
  assert.deepEqual(restored.active().result, result);
  assert.equal(restored.retryPending().ok, true);
  assert.equal(restored.active(), null);
  assert.equal(restored.relationFor('listener'), .07);
  assert.equal(restored.knownOpinion('listener'), .07);
  assert.equal(restored.complete(event.id).replayed, true);
  assert.equal(restored.retryPending().replayed, true);
  assert.equal(calls, 1);
  const again = createPlayerConversationLedger({saved, saveState: () => { throw Error('replay must not save'); }});
  assert.equal(again.complete(event.id).replayed, true);
  assert.equal(again.knownOpinion('listener'), .07);
  assert.deepEqual(again.snapshot(), saved);
});

test('elapsed comes only from actual progress; regular snapshots resume the stable event and preserve cooldown across menus and reload', () => {
  const h = setup(), event = invite(h.ledger);
  assert.equal(h.writes(), 1);
  for (let i = 0; i < 20; i++) assert.equal(h.ledger.start('listener', 'art').event.id, event.id);
  assert.equal(h.writes(), 1);
  h.clock.seconds += 300;
  assert.equal(h.ledger.complete(event.id).reason, 'unfinished');
  h.ledger.progress(event.id, 2.5);
  h.ledger.progress(event.id, 1);
  h.ledger.progress(event.id, NaN);
  assert.equal(h.ledger.event(event.id).elapsed, 2.5);
  assert.equal(h.writes(), 1);
  assert.equal(h.stored().events[0].elapsed, 0);
  const resumed = createPlayerConversationLedger({...h.settings, saved: h.ledger.snapshot()});
  assert.equal(resumed.loadError, null);
  assert.equal(resumed.active().id, event.id);
  assert.equal(resumed.active().elapsed, 2.5);
  assert.equal(resumed.active().duration, event.duration);
  assert.equal(resumed.complete(event.id, {elapsed: 6.9}).reason, 'unfinished');
  resumed.progress(event.id, 7);
  assert.equal(resumed.complete(event.id).ok, true);
  const after = createPlayerConversationLedger({...h.settings, saved: resumed.snapshot()});
  assert.equal(after.start('listener', 'work').reason, 'cooldown');
  assert.equal(after.start('listener', 'art').remaining, 90);
  h.clock.seconds += 89.99;
  assert.equal(after.start('listener', 'rest').reason, 'cooldown');
  h.clock.seconds += .01;
  const next = after.start('listener', 'rest');
  assert.equal(next.ok, true);
  assert.notEqual(next.event.id, event.id);
  assert.equal(next.event.attempt, 2);
});

test('decline, early cancellation and a newly assigned duty have no completion rewards and all consume the saved cooldown', () => {
  const decline = setup({worldSeed: 1}); decline.profiles.listener = person(0);
  const declined = decline.ledger.start('listener', 'rest');
  assert.equal(declined.event.status, 'declined');
  assert.equal(decline.ledger.complete(declined.event.id, {elapsed: 100}).reason, 'not-accepted');
  assert.equal(decline.ledger.active(), null);
  const reloaded = createPlayerConversationLedger({...decline.settings, saved: decline.stored()});
  assert.equal(reloaded.start('listener', 'art').reason, 'cooldown');
  assert.equal(reloaded.relationFor('listener'), 0);
  for (const reason of ['new-duty', 'left-scene', 'closed-menu']) {
    const h = setup(), event = invite(h.ledger);
    h.ledger.progress(event.id, 3);
    h.clock.seconds += 3;
    assert.equal(h.ledger.cancel(event.id, reason).ok, true);
    assert.equal(h.ledger.complete(event.id, {elapsed: 100}).reason, 'not-accepted');
    assert.equal(h.ledger.relationFor('listener'), 0);
    assert.equal(h.ledger.knownOpinion('listener'), 0);
    assert.equal(h.ledger.lastCompleted('listener'), null);
    assert.equal(h.ledger.start('listener', 'work').reason, 'cooldown');
    assert.equal(createPlayerConversationLedger({...h.settings, saved: h.stored()}).event(event.id).reason, reason);
  }
});

test('failed invitations do not consume IDs or start a conversation; failed cancellation keeps terminal evidence and cannot later complete', () => {
  const h = setup(), initial = h.ledger.snapshot();
  h.fail(true);
  assert.equal(h.ledger.start('listener', 'art').reason, 'save-failed');
  assert.equal(h.ledger.active(), null);
  assert.deepEqual(h.ledger.snapshot(), initial);
  h.fail(false);
  const event = invite(h.ledger);
  assert.equal(event.attempt, 1);
  h.fail(true);
  h.clock.seconds += 1;
  assert.equal(h.ledger.cancel(event.id, 'new-duty').reason, 'save-failed');
  assert.equal(h.ledger.event(event.id).status, 'pending-cancellation');
  assert.equal(h.ledger.pending().id, event.id);
  assert.equal(h.ledger.active(), null);
  assert.equal(h.ledger.complete(event.id, {elapsed: 8}).reason, 'not-accepted');
  assert.equal(h.ledger.start('listener', 'work').reason, 'pending-save');
  h.fail(false);
  const restored = createPlayerConversationLedger({...h.settings, saved: h.ledger.snapshot()});
  assert.equal(restored.retryPending().ok, true);
  assert.equal(restored.event(event.id).status, 'cancelled');
  assert.equal(restored.pending(), null);
  assert.equal(restored.relationFor('listener'), 0);
  assert.equal(restored.start('listener', 'art').reason, 'cooldown');
});

test('other actors cannot perturb this actor’s random roll or profile; existing directed evidence enters willingness and disposition', () => {
  const alone = setup(), otherFirst = setup();
  const other = otherFirst.ledger.start('unrelated', 'work').event;
  if (other.status === 'accepted') otherFirst.ledger.cancel(other.id);
  const a = invite(alone.ledger), b = invite(otherFirst.ledger);
  assert.equal(a.id, b.id);
  assert.equal(a.roll, b.roll);
  assert.equal(a.chance, b.chance);
  assert.notEqual(a.serial, b.serial);
  assert.deepEqual(finish(alone, a).event.result, finish(otherFirst, b).event.result);
  const base = setup(), loved = setup();
  loved.profiles.listener.relations.player = .8;
  loved.profiles.listener.opinions.player = .7;
  const neutral = invite(base.ledger), warm = invite(loved.ledger);
  assert(Math.abs(warm.chance - neutral.chance - (.8 * .12 + .7 * .10)) < 1e-12);
  assert.equal(finish(loved, warm).event.feeling, 'appreciated');
  assert.equal(loved.ledger.relationFor('listener'), .07);
  assert.equal(loved.profiles.listener.relations.player, .8);
  loved.clock.seconds += 90;
  const second = loved.ledger.start('listener', 'art');
  const expected = warm.chance + .07 * .12 + .07 * .10;
  assert(Math.abs(second.event.chance - expected) < 1e-12);
});

test('appearance is an optional observer-specific willingness nudge, bounded in either direction; missing profiles stay neutral', () => {
  const standard = setup(), positive = setup({getAppearanceAffinity: id => id === 'listener' ? 100 : 0}), negative = setup({getAppearanceAffinity: () => -100});
  const a = invite(standard.ledger), b = invite(positive.ledger), c = invite(negative.ledger);
  assert.equal(b.appearanceAffinity, .04);
  assert.equal(c.appearanceAffinity, -.04);
  assert(Math.abs(b.chance - a.chance - .04) < 1e-12);
  assert(Math.abs(c.chance - a.chance + .04) < 1e-12);
  assert.equal(finish(positive, b).event.result.opinion, 0);
  assert.equal(finish(negative, c).event.result.opinion, 0);
  const missing = setup({getProfile: () => undefined, getPlayerProfile: () => undefined});
  assert.equal(finish(missing, invite(missing.ledger)).event.feeling, 'neutral');
  assert.equal(missing.ledger.knownOpinion('listener'), 0);
  assert.deepEqual(PLAYER_CONVERSATION_TOPICS.map(({id, kind, duration}) => [id, kind, duration]),
    [['work', 'staff-work', 8], ['art', 'read', 7], ['rest', 'staff-rest', 6]]);
});

test('corrupt saves, clock reversal, missing/async saves, invalid inputs and reentrant writes fail closed', async () => {
  const h = setup(), event = invite(h.ledger);
  const saved = h.ledger.snapshot();
  for (const mutate of [s => { s.nextSerial++; }, s => { s.events[0].elapsed = Infinity; }, s => { s.events[0].id = 'forged'; },
    s => { s.events.push(copy(s.events[0])); s.nextSerial++; }, s => { s.events[0].status = 'completed'; }]) {
    const broken = copy(saved); mutate(broken);
    const locked = createPlayerConversationLedger({saved: broken, saveState: () => assert.fail('invalid saves cannot be overwritten')});
    assert.equal(locked.loadError, 'invalid-saved-state');
    assert.equal(locked.start('listener', 'work').reason, 'invalid-saved-state');
    assert.equal(locked.knownOpinion('listener'), 0);
    assert.deepEqual(locked.snapshot(), copy(broken));
  }
  h.clock.seconds--;
  assert.equal(h.ledger.cancel(event.id).reason, 'clock-reversed');
  assert.equal(h.ledger.complete(event.id, {elapsed: Infinity}).reason, 'invalid-elapsed');
  assert.equal(h.ledger.complete('missing').reason, 'unknown-event');
  assert.equal(createPlayerConversationLedger().start('listener', 'art').reason, 'persistence-unavailable');
  const asynchronous = createPlayerConversationLedger({saveState: () => Promise.resolve(true)});
  assert.equal(asynchronous.start('listener', 'art').reason, 'async-save-unsupported');
  assert.equal(asynchronous.active(), null);
  let nested, ledger;
  ledger = createPlayerConversationLedger({saveState: () => { nested = ledger.start('other', 'work'); }});
  assert.equal(ledger.start('listener', 'art').ok, true);
  assert.equal(nested.reason, 'ledger-busy');
  assert.equal(h.ledger.start('player', 'art').reason, 'invalid-actor');
  assert.equal(h.ledger.start('listener', 'unknown').reason, 'invalid-topic');
  const detached = h.ledger.snapshot(); detached.events[0].elapsed = 100;
  assert.equal(h.ledger.event(event.id).elapsed, 0);
});

test('history compacts to 128 while actor totals, IDs, cooldowns and pending evidence survive atomic failure and reload', () => {
  const h = setup(); h.profiles.listener = person(1);
  h.profiles.unrelated = {...person(1), needs: {social: 1, hunger: 0, fatigue: 0}, relations: {player: 1}, opinions: {player: 1}};
  const first = invite(h.ledger);
  finish(h, first);
  const legacy = h.ledger.snapshot(); delete legacy.archive;
  assert.equal(createPlayerConversationLedger({...h.settings, saved: legacy}).knownOpinion('listener'), .07);
  const total = PLAYER_CONVERSATION_HISTORY_LIMIT + 13;
  for (let serial = 2; serial <= total; serial++) {
    h.clock.seconds += 90;
    if (serial === PLAYER_CONVERSATION_HISTORY_LIMIT + 1) {
      const before = h.ledger.snapshot(), persisted = h.stored();
      h.fail(true);
      assert.equal(h.ledger.start('unrelated', 'art').reason, 'save-failed');
      assert.deepEqual(h.ledger.snapshot(), before, 'failed compaction cannot advance the archive or counters');
      assert.deepEqual(h.stored(), persisted);
      h.fail(false);
    }
    const event = invite(h.ledger, 'unrelated');
    assert.equal(event.serial, serial);
    assert.equal(event.attempt, serial - 1);
    finish(h, event);
    assert(h.ledger.snapshot().events.length <= PLAYER_CONVERSATION_HISTORY_LIMIT);
  }
  const saved = h.ledger.snapshot(), archivedActor = saved.archive.actors.find(actor => actor.actorId === 'listener');
  assert.equal(saved.events.length, PLAYER_CONVERSATION_HISTORY_LIMIT);
  assert.equal(saved.archive.throughSerial, total - PLAYER_CONVERSATION_HISTORY_LIMIT);
  assert.equal(saved.nextSerial, total + 1);
  assert.equal(saved.events[0].serial, saved.archive.throughSerial + 1);
  assert.equal(archivedActor.attempts, 1);
  assert.equal(h.ledger.completedCount('listener'), 1);
  assert.equal(h.ledger.completedCount('unrelated'), total - 1);
  const oldArchive = copy(saved); for (const a of oldArchive.archive.actors) delete a.completedCount;
  const conservative = createPlayerConversationLedger({...h.settings, saved: oldArchive});
  assert.equal(conservative.completedCount('listener'), 1);
  assert.equal(conservative.completedCount('unrelated'), 1 + oldArchive.events.filter(e => e.actorId === 'unrelated' && e.status === 'completed').length);
  const badCount = copy(saved); badCount.archive.actors[0].completedCount = 2;
  assert.equal(createPlayerConversationLedger({...h.settings, saved: badCount}).loadError, 'invalid-saved-state');
  assert.equal(archivedActor.relation, .07);
  assert.equal(archivedActor.opinion, .07);
  assert.equal(h.ledger.event(first.id), null);
  assert.equal(h.ledger.lastCompleted('listener').id, first.id);
  const resumed = createPlayerConversationLedger({...h.settings, saved});
  assert.equal(resumed.loadError, null);
  assert.deepEqual(resumed.snapshot(), saved);
  assert.equal(resumed.relationFor('listener'), .07);
  assert.equal(resumed.knownOpinion('listener'), .07);
  assert.equal(resumed.lastCompleted('listener').id, first.id);
  const writes = h.writes();
  assert.equal(resumed.complete(first.id, {elapsed: first.duration}).reason, 'unknown-event');
  assert.equal(resumed.cancel(first.id).reason, 'unknown-event');
  assert.equal(h.writes(), writes);
  assert.deepEqual(resumed.snapshot(), saved, 'late archived callbacks cannot change totals or history');
  assert.equal(resumed.start('unrelated', 'rest').reason, 'cooldown');
  h.clock.seconds += 90;
  const next = invite(resumed, 'unrelated');
  assert.equal(next.serial, total + 1);
  assert.equal(next.attempt, total);
  const accepted = resumed.snapshot();
  h.fail(true); h.clock.seconds += next.duration;
  assert.equal(resumed.complete(next.id, {elapsed: next.duration}).reason, 'save-failed');
  assert.deepEqual(resumed.snapshot().archive, accepted.archive);
  assert.equal(resumed.snapshot().events.length, PLAYER_CONVERSATION_HISTORY_LIMIT);
  assert.equal(resumed.pending().id, next.id);
  const retry = createPlayerConversationLedger({...h.settings, saved: resumed.snapshot()});
  assert.equal(retry.loadError, null);
  h.fail(false);
  assert.equal(retry.retryPending().ok, true);
  assert.equal(retry.complete(next.id).replayed, true);
  assert.deepEqual(retry.snapshot().archive, accepted.archive);
  assert.equal(retry.lastCompleted('unrelated').id, next.id);
  assert.equal(retry.completedCount('unrelated'), total);
  assert.equal(retry.relationFor('listener'), .07);
  const corrupt = copy(saved); corrupt.archive.actors[0].attempts++;
  assert.equal(createPlayerConversationLedger({saved: corrupt}).loadError, 'invalid-saved-state');
});
