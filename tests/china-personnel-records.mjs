// CR03 personnel originals: regress failed-save loss, false historical import,
// wrong-body/desk completion, private-payroll leakage and day-retention loss.
// These are ledger fixtures, not a natural audience, route or visual test.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createChinaPersonnelRecords, CHINA_PERSONNEL_OFFICIALS_V1 as PEOPLE} from '../source/game/china-personnel-records.js';
import {createChinaOfficialEconomy} from '../source/game/china-official-economy.js';

const copy = value => JSON.parse(JSON.stringify(value));
const ids = PEOPLE.map(row => row.actorId), first = ids[0], second = ids[1];
const empty = (day, throughSerial = 0) => ({day, throughSerial, audience: null, archives: []});
const court = (day = 0, changes = {}) => ({id: `cn-morning-audience:${day}`, day, actorIds: [...ids], ...changes});
const archive = (actorId = first, day = 0, changes = {}) => ({id: `cn-official-archive:${actorId}:${day}`, actorId, day,
  audienceId: `cn-morning-audience:${day}`, position: [...PEOPLE.find(row => row.actorId === actorId).office], elapsed: 8, duration: 8, ...changes});
const fail = (result, code) => { assert.equal(result.ok, false); if (code) assert.equal(result.code, code); };
function fixture(saved) {
  const actors = new Map(PEOPLE.map(row => [row.actorId, {actorId: row.actorId, alive: true, position: [...row.office]}]));
  let saver = () => true, resolver = id => actors.get(id), durable;
  const writes = [];
  const ledger = createChinaPersonnelRecords({saved, resolveActor: id => resolver(id), saveState(candidate) {
    writes.push(candidate); const result = saver(candidate);
    if (result !== false && result?.ok !== false && !result?.then) durable = copy(candidate);
    return result;
  }});
  return {ledger, actors, writes, save: callback => { saver = callback; }, resolve: callback => { resolver = callback; }, get durable() { return copy(durable); }};
}

// Freeze names/ranks from the real six-person table without a runtime cycle.
// Loading modules for metadata only does not construct or simulate the world.
registerHooks({resolve(id, context, next) { return id === 'three' ?
  {url: new URL('../source/vendor/three/build/three.module.js', import.meta.url).href, shortCircuit: true} : next(id, context); }});
const {CHINA_COURT_OFFICIALS} = await import('../source/game/china-palace-audience.js');
const {CHINA_OFFICIAL_BUREAU} = await import('../source/game/china-official-bureau.js');
assert.equal(PEOPLE.length, 6); assert(Object.isFrozen(PEOPLE));
for (const [i, row] of PEOPLE.entries()) {
  const original = CHINA_COURT_OFFICIALS[i];
  assert.equal(row.actorId, original.id); assert.equal(row.gradeId, original.gradeId);
  assert.equal(row.gradeLabel, original.gradeLabel); assert.equal(row.roleLabel, original.officialRoleLabel);
  assert.equal(original.npcName, `${row.name} · ${row.roleLabel}（${row.gradeLabel}）`);
  assert.deepEqual(row.office, CHINA_OFFICIAL_BUREAU.offices[i]);
  assert(Object.isFrozen(row)); assert(Object.isFrozen(row.office));
}

// No initialization/read writes and no inferred old attendance or absence.
{
  const f = fixture();
  assert.equal(f.ledger.loadError, null);
  assert.deepEqual(f.ledger.snapshot(), {version: 1, courts: [], archives: [], eventIds: [], outbox: []});
  assert.deepEqual(f.ledger.sourceFor(0), empty(0)); assert.deepEqual(f.ledger.sourceFor(800), empty(800));
  for (const day of [-1, .5, NaN, Infinity, '0', undefined]) assert.equal(f.ledger.sourceFor(day), null);
  assert(f.ledger.retry().replayed); assert.equal(f.writes.length, 0);
  fail(f.ledger.witnessArchive(archive()), 'audience-unavailable'); assert.equal(f.writes.length, 0);
  assert.deepEqual(f.ledger.snapshot(), {version: 1, courts: [], archives: [], eventIds: [], outbox: []});
  const noResolver = createChinaPersonnelRecords({saveState: () => assert.fail('no real actor')});
  fail(noResolver.witnessCourt(court()), 'actor-unavailable');
}

// Six actual living identities, exact deterministic event IDs, no loose input.
{
  const f = fixture();
  for (const bad of [undefined, null, {}, court(-1), court(.5), court(NaN), court(Infinity), court('0'),
    court(0, {id: 'cn-morning-audience:00'}), court(0, {actorIds: ids.slice(1)}),
    court(0, {actorIds: [first, ...ids.slice(0, 5)]}), court(0, {actorIds: [...ids.slice(0, 5), 'player']}),
    court(0, {completed: true}), court(0, {wages: 100})]) fail(f.ledger.witnessCourt(bad), 'invalid-court');
  f.actors.get(first).alive = false; fail(f.ledger.witnessCourt(court()), 'actor-unavailable');
  f.actors.get(first).alive = true; f.resolve(id => ({...f.actors.get(id), actorId: 'other-body'}));
  fail(f.ledger.witnessCourt(court()), 'actor-unavailable');
  f.resolve(() => { throw Error('actor missing'); }); fail(f.ledger.witnessCourt(court()), 'actor-unavailable');
  assert.equal(f.writes.length, 0); assert.deepEqual(f.ledger.sourceFor(0), empty(0));
  f.resolve(id => f.actors.get(id)); assert(f.ledger.witnessCourt(court(0, {actorIds: [...ids].reverse()})).ok);
  const source = f.ledger.sourceFor(0);
  assert.deepEqual(source.audience.actors.map(row => row.actorId), ids);
  assert.deepEqual(Object.keys(source.audience).sort(), ['id', 'day', 'actors'].sort());
  assert.deepEqual(Object.keys(source.audience.actors[0]).sort(), ['actorId', 'name', 'roleLabel', 'gradeId', 'gradeLabel'].sort());
  assert(!/currentWage|amount|accounts|transactions|performance|absence/.test(JSON.stringify(source)));
  assert(Object.isFrozen(source)); assert(Object.isFrozen(source.audience.actors[0]));
  assert.throws(() => { source.audience.actors[0].name = 'different'; }, TypeError);
  const snapshot = f.ledger.snapshot(); snapshot.courts[0].actors[0].name = 'different';
  assert.equal(f.ledger.sourceFor(0).audience.actors[0].name, PEOPLE[0].name);
  const count = f.writes.length; f.actors.get(first).alive = false;
  assert(f.ledger.witnessCourt(court()).replayed, 'an original committed fact survives later actor death');
  assert.equal(f.writes.length, count);
}

// Archive proof uses the real matching body's own desk, same completed court,
// and original eight-second certificate. It is independent of salary success.
{
  const f = fixture(); assert(f.ledger.witnessCourt(court()).ok);
  const badProofs = [undefined, null, {}, archive(first, -1), archive(first, .5), archive(first, 0, {id: 'other'}),
    archive(first, 0, {audienceId: 'cn-morning-audience:1'}), archive(first, 0, {actorId: second}),
    archive(first, 0, {position: PEOPLE[1].office}), archive(first, 0, {position: [18, 1, 32.5]}),
    archive(first, 0, {position: [18, .215, NaN]}), archive(first, 0, {position: [18, .215, 32.5, 0]}),
    archive(first, 0, {position: {x: 18, y: .215, z: 32.5}}), archive(first, 0, {duration: 7.999}),
    archive(first, 0, {duration: 9}), archive(first, 0, {duration: '8'}), archive(first, 0, {elapsed: 7.999}),
    archive(first, 0, {elapsed: Infinity}), archive(first, 0, {elapsed: NaN}), archive(first, 0, {elapsed: '8'}),
    archive(first, 0, {paid: true}), archive(first, 0, {balance: 500})];
  for (const proof of badProofs) fail(f.ledger.witnessArchive(proof), 'invalid-archive');
  fail(f.ledger.witnessArchive(archive(first, 1)), 'audience-unavailable');
  f.actors.get(first).alive = false; fail(f.ledger.witnessArchive(archive()), 'actor-unavailable');
  f.actors.get(first).alive = true; f.actors.get(first).position = [...PEOPLE[1].office];
  fail(f.ledger.witnessArchive(archive()), 'actor-unavailable');
  f.actors.get(first).position = [...PEOPLE[0].office];
  const writes = f.writes.length; assert.equal(writes, 1); assert.deepEqual(f.ledger.sourceFor(0).archives, []);
  const proof = archive(first, 0, {elapsed: 8.25}); assert(f.ledger.witnessArchive(proof).ok);
  const original = f.ledger.sourceFor(0); assert.deepEqual(original.archives, [proof]);
  assert(Object.isFrozen(original.archives[0].position));
  f.actors.get(first).position = [0, 0, 0]; f.actors.get(first).alive = false;
  assert(f.ledger.witnessArchive(proof).replayed);
  fail(f.ledger.witnessArchive({...proof, elapsed: 8.5}), 'archive-conflict');
  fail(f.ledger.witnessArchive({...proof, position: [18.01, .215, 32.5]}), 'archive-conflict');
  assert.equal(f.writes.length, writes + 1); assert.deepEqual(f.ledger.sourceFor(0), original);
  assert(f.ledger.witnessArchive(archive(second)).ok); assert.equal(original.archives.length, 1, 'an earlier returned view never grows');
}

// Persist before committing. Every rejected callback retains original facts;
// an ordinary snapshot/cold load and later retry cannot skip their source day.
for (const mode of ['false', 'object', 'throw', 'resolved-promise', 'rejected-promise', 'mutation']) {
  const f = fixture();
  f.save(candidate => {
    assert(Object.isFrozen(candidate)); assert(Object.isFrozen(candidate.courts[0].actors));
    assert.deepEqual(f.ledger.sourceFor(0), empty(0));
    assert.equal(f.ledger.snapshot().outbox.length, 1);
    assert.equal(candidate.outbox.length, 0); assert.equal(candidate.courts.length, 1);
    fail(f.ledger.retry(), 'busy');
    if (mode === 'false') return false;
    if (mode === 'object') return {ok: false};
    if (mode === 'throw') throw Error('disk rejected');
    if (mode === 'resolved-promise') return Promise.resolve(true);
    if (mode === 'rejected-promise') return Promise.reject(Error('disk rejected'));
    candidate.courts[0].actors[0].name = 'mutated';
  });
  const result = f.ledger.witnessCourt(court()); fail(result, mode.endsWith('promise') ? 'async-save-unsupported' : 'save-failed');
  assert.equal(result.pending, true); assert.deepEqual(f.ledger.sourceFor(0), empty(0));
  const ordinaryWorldSave = f.ledger.snapshot(); assert.equal(ordinaryWorldSave.outbox[0].fact.day, 0);
  const restored = fixture(ordinaryWorldSave); assert.equal(restored.ledger.loadError, null);
  assert.equal(restored.writes.length, 0); assert.deepEqual(restored.ledger.sourceFor(0), empty(0));
  restored.actors.get(first).alive = false; restored.resolve(() => null);
  assert(restored.ledger.retry().ok, `${mode} reload preserves actual old observation without querying current bodies`);
  assert.equal(restored.ledger.sourceFor(0).audience.actors.length, 6);
  assert.deepEqual(restored.ledger.sourceFor(0).archives, [], 'a court alone cannot invent archives');
  assert.deepEqual(restored.ledger.snapshot(), restored.durable);
  assert.equal(restored.ledger.snapshot().outbox.length, 0);
  assert(restored.ledger.retry().replayed); assert.equal(restored.writes.length, 1);
}
await Promise.resolve();

// Pending original court and archive coexist; later courts cannot overwrite
// either. Every archive remains factually complete even if no wages were paid.
{
  const f = fixture(); f.save(() => false);
  fail(f.ledger.witnessCourt(court()), 'save-failed');
  const proof = archive(first, 0, {elapsed: 8.375}); fail(f.ledger.witnessArchive(proof), 'save-failed');
  fail(f.ledger.witnessCourt(court(1)), 'save-failed');
  fail(f.ledger.witnessArchive(archive(second, 1)), 'save-failed');
  const snapshot = f.ledger.snapshot(); assert.equal(snapshot.outbox.length, 4);
  assert.deepEqual(snapshot.outbox.map(row => row.fact.id), [court().id, proof.id, court(1).id, archive(second, 1).id]);
  fail(f.ledger.witnessArchive({...proof, elapsed: 8.5}), 'archive-conflict');
  assert.deepEqual(f.ledger.snapshot(), snapshot); assert.deepEqual(f.ledger.sourceFor(0), empty(0));
  const restored = fixture(snapshot); restored.resolve(() => null);
  assert(restored.ledger.retry().ok); assert.deepEqual(restored.ledger.sourceFor(0).archives, [proof]);
  assert.deepEqual(restored.ledger.sourceFor(1).archives, [archive(second, 1)]);
  const source = restored.ledger.sourceFor(0), money = createChinaOfficialEconomy({getDay: () => 4, isAppointed: () => true, saveState: () => false});
  const beforeMoney = money.snapshot();
  fail(money.completeDuty({actorId: first, day: 0, receiptId: `cn-official-duty:${first}:0`, evidence: {
    kind: 'office-work', completed: true, actorId: first, day: 0, audienceDay: 0, audienceCompleted: true, elapsed: 8, duration: 8,
  }}));
  assert.deepEqual(money.snapshot(), beforeMoney); assert.deepEqual(restored.ledger.sourceFor(0), source);
  const paidLater = createChinaOfficialEconomy({saved: money.snapshot(), getDay: () => 5, isAppointed: () => true, saveState: () => true});
  assert(paidLater.completeDuty({actorId: first, day: 0, receiptId: `cn-official-duty:${first}:0`, evidence: {
    kind: 'office-work', completed: true, actorId: first, day: 0, audienceDay: 0, audienceCompleted: true, elapsed: 8, duration: 8,
  }}).ok);
  assert.deepEqual(restored.ledger.sourceFor(0), source, 'late payroll does not create, consume or rename a public source fact');
}

// Save callback reentry observes a second real event. Both failure and success
// retain it, without exposing it as committed or replacing the first candidate.
for (const accepted of [false, true]) {
  const f = fixture();
  f.save(candidate => {
    assert.equal(candidate.courts.length, 1); assert.equal(candidate.archives.length, 0);
    fail(f.ledger.witnessCourt(court()), 'busy');
    const observed = f.ledger.witnessArchive(archive()); fail(observed, 'busy'); assert(observed.pending);
    assert.equal(f.ledger.snapshot().outbox.length, 2);
    assert.deepEqual(f.ledger.sourceFor(0), empty(0));
    return accepted;
  });
  const result = f.ledger.witnessCourt(court()); assert.equal(result.ok, accepted);
  assert.equal(f.ledger.snapshot().outbox.length, accepted ? 1 : 2);
  assert.equal(f.ledger.sourceFor(0).audience !== null, accepted); assert.deepEqual(f.ledger.sourceFor(0).archives, []);
  const restored = fixture(f.ledger.snapshot()); restored.resolve(() => null);
  assert(restored.ledger.retry().ok); assert.equal(restored.ledger.sourceFor(0).archives.length, 1);
  assert.equal(restored.ledger.snapshot().courts.length, 1); assert.equal(restored.ledger.snapshot().archives.length, 1);
}

// An explicit persistence callback is needed; ordinary checkpointing can still
// preserve pending originals for a later fully wired controller.
{
  const f = fixture(), ledger = createChinaPersonnelRecords({resolveActor: id => f.actors.get(id)});
  fail(ledger.witnessCourt(court()), 'persistence-unavailable');
  assert.equal(ledger.snapshot().outbox.length, 1); assert.deepEqual(ledger.sourceFor(0), empty(0));
  const restored = fixture(ledger.snapshot()); assert(restored.ledger.retry().ok);
  assert.equal(restored.ledger.sourceFor(0).audience.actors.length, 6);
}

// Corrupt saves lock source reads and mutation, preserve evidence for diagnosis,
// and never silently accept cross-day, duplicated, unknown or money-bearing rows.
{
  const f = fixture(); assert(f.ledger.witnessCourt(court()).ok); assert(f.ledger.witnessArchive(archive()).ok);
  f.save(() => false); fail(f.ledger.witnessCourt(court(1)));
  fail(f.ledger.witnessArchive(archive(second, 1)));
  const valid = f.ledger.snapshot();
  const mutations = [s => { s.version = 2; }, s => { s.money = {}; }, s => { s.courts[0].id = 'other'; },
    s => { s.courts[0].actors[0].name = 'other'; }, s => { s.courts[0].actors[0].gradeId = 'cn-grade-1-regular'; },
    s => { s.courts[0].actors[0].cash = 8; }, s => { s.courts[0].actors.reverse(); }, s => { s.courts[0].actors.pop(); },
    s => { s.courts.push(copy(s.courts[0])); }, s => { s.courts = []; }, s => { s.archives[0].audienceId = court(1).id; },
    s => { s.archives[0].day = 1; }, s => { s.archives[0].elapsed = 7; }, s => { s.archives[0].duration = 9; },
    s => { s.archives[0].position = [0, 0, 0]; }, s => { s.archives[0].balance = 100; },
    s => { s.archives.push(copy(s.archives[0])); }, s => { s.eventIds.pop(); },
    s => { s.eventIds.push(s.outbox[0].fact.id); }, s => { s.eventIds[1] = s.eventIds[0]; },
    s => { s.eventIds[0] = 'unknown'; }, s => { s.eventIds.reverse(); }, s => { s.outbox[0].kind = 'salary'; },
    s => { s.outbox.reverse(); }, s => { s.outbox.push(copy(s.outbox[0])); },
    s => { s.outbox[0].fact.actors[0].actorId = 'player'; }, s => { s.outbox[1].fact.elapsed = 0; },
    s => { s.outbox[1].fact.audienceId = court(7).id; }, s => { s.outbox[0].attempts = 1; }];
  for (const mutate of mutations) {
    const changed = copy(valid); mutate(changed);
    const restored = fixture(changed); assert.equal(restored.ledger.loadError, 'invalid-saved-state');
    assert.deepEqual(restored.ledger.snapshot(), changed); assert.equal(restored.ledger.sourceFor(0), null);
    fail(restored.ledger.retry(), 'invalid-saved-state'); fail(restored.ledger.witnessCourt(court(2)), 'invalid-saved-state');
    fail(restored.ledger.witnessArchive(archive()), 'invalid-saved-state'); assert.equal(restored.writes.length, 0);
  }
  for (const bad of [null, {}, {version: 1}, {version: 1, courts: [], archives: []}]) assert.equal(fixture(bad).ledger.loadError, 'invalid-saved-state');
  const restored = fixture(valid); assert.equal(restored.ledger.loadError, null); assert(restored.ledger.retry().ok);
}

// Global committed serials reproduce an exact claim-time source. Later real
// archives are allowed, but a saved claim cannot omit an original archive and
// disguise that row as still awaiting at its unchanged source boundary.
{
  const f = fixture(); assert(f.ledger.witnessCourt(court()).ok);
  assert(f.ledger.witnessArchive(archive()).ok);
  const claimed = f.ledger.sourceFor(0); assert.equal(claimed.throughSerial, 2);
  assert.deepEqual(f.ledger.snapshot().eventIds, [court().id, archive().id]);
  assert.deepEqual(f.ledger.sourceFor(0, 0), empty(0));
  assert.equal(f.ledger.sourceFor(0, 1).audience.actors.length, 6);
  assert.deepEqual(f.ledger.sourceFor(0, 1).archives, []);
  assert.deepEqual(f.ledger.sourceFor(0, 2), claimed);
  f.save(() => false); fail(f.ledger.witnessArchive(archive(second)), 'save-failed');
  fail(f.ledger.witnessCourt(court(1)), 'save-failed');
  assert.equal(f.ledger.snapshot().outbox.length, 2);
  assert.deepEqual(f.ledger.sourceFor(0), claimed, 'pending observations cannot advance a committed boundary');
  assert.equal(f.ledger.sourceFor(0, 3), null);
  const restored = fixture(f.ledger.snapshot()); assert(restored.ledger.retry().ok);
  assert.deepEqual(restored.ledger.snapshot().eventIds, [court().id, archive().id, archive(second).id, court(1).id]);
  assert.equal(restored.ledger.sourceFor(0).throughSerial, 4);
  assert.equal(restored.ledger.sourceFor(0).archives.length, 2);
  assert.deepEqual(restored.ledger.sourceFor(0, claimed.throughSerial), claimed);
  assert.deepEqual(restored.ledger.sourceFor(1, 3), empty(1, 3));
  assert.equal(restored.ledger.sourceFor(1, 4).audience.day, 1);
  const omitted = copy(claimed); omitted.archives = [];
  assert.notDeepEqual(omitted, restored.ledger.sourceFor(0, omitted.throughSerial), 'exact as-of comparison exposes omitted originals');
  const inserted = copy(restored.ledger.sourceFor(0, 1)); inserted.archives = [archive()];
  assert.notDeepEqual(inserted, restored.ledger.sourceFor(0, inserted.throughSerial), 'later archives cannot be imported into an earlier claim');
  for (const serial of [-1, .5, NaN, Infinity, '2', 5]) assert.equal(restored.ledger.sourceFor(0, serial), null);
  const snapshot = restored.ledger.snapshot(); snapshot.eventIds.reverse();
  assert.deepEqual(restored.ledger.sourceFor(0, 2), claimed, 'snapshot mutation cannot rewrite the serial journal');
  const reread = fixture(restored.durable); assert.deepEqual(reread.ledger.sourceFor(0, 2), claimed);
}

// No arbitrary eight/thirty-two-day eviction. Late archive arrivals are ordered
// by the stable six-person roster, while earlier views remain frozen originals.
{
  const f = fixture();
  for (let day = 0; day < 40; day++) assert(f.ledger.witnessCourt(court(day)).ok);
  const before = f.ledger.sourceFor(0); assert(before.audience); assert.equal(before.archives.length, 0);
  for (const id of [...ids].reverse()) assert(f.ledger.witnessArchive(archive(id)).ok);
  assert.equal(f.ledger.snapshot().courts.length, 40); assert.deepEqual(f.ledger.sourceFor(0).archives.map(row => row.actorId), ids);
  assert.equal(before.archives.length, 0); assert.equal(f.ledger.sourceFor(39).audience.day, 39);
  const restored = fixture(f.ledger.snapshot()); assert.equal(restored.ledger.loadError, null);
  assert.deepEqual(restored.ledger.sourceFor(0), f.ledger.sourceFor(0));
}
console.log('PASS personnel originals: six frozen identities, actual-body/desk/eight-second proof, strict replay, durable failed-save outbox, reentry, late payroll independence, exact as-of source boundaries, restore validation and no silent retention loss');
