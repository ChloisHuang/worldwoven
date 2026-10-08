// Source-hook regressions: the original two-report court and each original
// eight-second archive create facts independently of wages. Rejected source
// writes must survive an ordinary world checkpoint and cold retry unchanged.
// These are actual audience/life/economy controllers and real Three roots.
// Hall positions and route-waypoint travel are deliberately staged; this is
// not full-scene, navigation, rendered, or natural multi-day acceptance.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id, context, next) {
  return id === 'three' ? {url: new URL('../source/vendor/three/build/three.module.js', import.meta.url).href, shortCircuit: true} : next(id, context);
}});
const T = await import('three');
const {createChinaPalaceAudience, CHINA_COURT_OFFICIALS, chinaCourtAssemblyRoute} = await import('../source/game/china-palace-audience.js');
const {createChinaOfficialEconomy, CHINA_OFFICIAL_IDS} = await import('../source/game/china-official-economy.js');
const {CHINA_PERSONNEL_OFFICIALS_V1} = await import('../source/game/china-personnel-records.js');
const {CHINA_OFFICIAL_BUREAU: B} = await import('../source/game/china-official-bureau.js');
const {createFacilityQueue} = await import('../source/game/npc-facilities.js');
const copy = value => JSON.parse(JSON.stringify(value));
const empty = () => ({version: 1, courts: [], archives: [], eventIds: [], outbox: []});
const wages = [168, 120, 88, 64, 168, 38];
const lot = {colliders: [], walkableSurfaces: [.13, .215, 1.415, 3.915].map(y => ({minX: -35, maxX: 35, minZ: -40, maxZ: 40, y})), bounds: {minX: -35, maxX: 35, minZ: -40, maxZ: 40}};

// Freeze/check the real six-author catalogue, rather than letting a fixture's
// own invented identity or desk table agree with another invented table.
assert.deepEqual(CHINA_PERSONNEL_OFFICIALS_V1.map(row => row.actorId), CHINA_OFFICIAL_IDS);
for (const [i, row] of CHINA_PERSONNEL_OFFICIALS_V1.entries()) {
  const original = CHINA_COURT_OFFICIALS[i];
  assert.equal(original.id, row.actorId); assert(original.npcName.startsWith(row.name + ' · '));
  assert.equal(original.officialRoleLabel, row.roleLabel);
  assert.equal(original.gradeId, row.gradeId); assert.equal(original.gradeLabel, row.gradeLabel);
  assert.deepEqual(row.office, B.offices[i]);
}

function fixture({saved, day = 3, sourceMode = 'accept', rejectPay = false} = {}) {
  let service, duty = !!saved?.continuity, ready = true, time = saved?.continuity?.runtime?.time || 0;
  let durable = null, stageTravel = false;
  const observations = [], payCalls = [], callbackErrors = [], ids = [...CHINA_OFFICIAL_IDS, 'cn-emperor'];
  const actors = [...CHINA_COURT_OFFICIALS, {id: 'cn-emperor', npcPosition: [0, 1.415, -8]}].map((station, i) => {
    const root = new T.Group(), head = new T.Group();
    root.userData.head = head; root.userData.hands = [new T.Group(), new T.Group()]; root.add(head, ...root.userData.hands);
    root.position.set(...(saved?.positions?.[station.id] || (i < 6 ? chinaCourtAssemblyRoute(i).hall : station.npcPosition)));
    return {station, root, home: new T.Vector3(...station.npcPosition), phase: 0, route: [], locomotion: {walkSpeed: 1.5}, animate() {}};
  });
  const stations = actors.map(actor => actor.station), identity = copy(stations);
  const economy = createChinaOfficialEconomy({saved: saved?.economy, isAppointed: id => CHINA_OFFICIAL_IDS.includes(id),
    getDay: () => day, saveState: () => !rejectPay});
  if (!saved?.economy) {
    const rejected = rejectPay; rejectPay = false;
    assert(economy.activateGradePayPolicy().ok); rejectPay = rejected;
  }
  const observedEconomy = {...economy, completeDuty(input) {
    const row = service.state().life.actors.find(actor => actor.id === input.actorId);
    const source = service.state().personnelRecords;
    const witnessed = [...source.archives, ...source.outbox.filter(entry => entry.kind === 'archive').map(entry => entry.fact)]
      .find(fact => fact.actorId === input.actorId && fact.day === input.day);
    const result = economy.completeDuty(input);
    payCalls.push({input: copy(input), result: copy(result), life: copy(row), witnessed: copy(witnessed || null)});
    return result;
  }};
  const palace = {dutyPlan: () => ({reachable: true, seconds: 42.5}), requestDuty() { duty = true; },
    dutyState: () => duty ? {ready} : null, setDutyLine() {}, releaseDuty() { duty = false; }};
  service = createChinaPalaceAudience({npcs: actors, palace, economy: observedEconomy, getClock: () => ({day}),
    saved: saved ? {...(saved.top || {}), ...(saved.continuity ? {continuity: saved.continuity} : {})} : {}, lot,
    furniture: {items: [], facilities: createFacilityQueue()}, doors: {cameraColliders: [], routeStep: () => ({waiting: true})},
    planPath: (_from, point) => [point], moveActor() {}, poseContext: () => ({}), worldSeed: 42,
    saveState(next) {
      if (!service) return true;
      const projected = copy(service.snapshot()), live = service.state().personnelRecords;
      let candidate = false;
      // Keep assertion failures outside the product's defensive save catch.
      try {
        assert.deepEqual(next.personnelRecords, projected.personnelRecords, 'Top and continuity must serialize the same personnel candidate');
        candidate = next.personnelRecords.courts.length !== live.courts.length || next.personnelRecords.archives.length !== live.archives.length;
        if (candidate) {
          assert(live.outbox.length > 0, 'A live observed fact is queued before its candidate write');
          const before = copy(projected);
          service.update(.25, time, {hour: 11.6, day});
          assert.equal(service.restore(projected), false, 'Candidate persistence blocks runtime restore reentry');
          assert.deepEqual(copy(service.snapshot()), before, 'Candidate persistence blocks audience update reentry');
          observations.push({candidate: copy(next.personnelRecords), live: copy(live), continuity: projected, mode: sourceMode});
        }
      } catch (error) { callbackErrors.push(error); return false; }
      if (candidate) {
        if (sourceMode === 'false') return false;
        if (sourceMode === 'object') return {ok: false};
        if (sourceMode === 'throw') throw Error('quota');
        if (sourceMode === 'promise') return Promise.reject(Error('quota'));
      }
      durable = {top: copy(next), continuity: projected}; return true;
    }});
  if (saved?.continuity) assert(service.restore(saved.continuity));
  const check = () => { if (callbackErrors.length) throw callbackErrors[0]; };
  const stageWaypoints = () => {
    const snapshot = service.snapshot(), tasks = new Map(snapshot.runtime.tasks);
    const life = new Map(snapshot.life.runtime.stages);
    for (const actor of actors.slice(0, 6)) {
      const stage = tasks.get(actor.station.id) || life.get(actor.station.id);
      if (!stage?.arrived && stage?.path?.[stage.index || 0]) actor.root.position.set(...stage.path[stage.index || 0]);
    }
  };
  const step = (count = 1, {hour = 11.6, conversationActorId} = {}) => {
    for (let i = 0; i < count; i++) {
      if (stageTravel) stageWaypoints();
      time += .1; service.update(.1, time, {hour, day, conversationActorId}); check();
    }
  };
  const until = (test, label, max = 800) => {
    for (let i = 0; i < max && !test(); i++) step();
    assert(test(), label + ' ' + JSON.stringify({phase: service.state().phase, reported: service.state().reported, actors: service.state().life.actors}));
  };
  const checkpoint = () => ({...copy(durable || {top: {}, continuity: service.snapshot()}), economy: economy.snapshot(),
    positions: Object.fromEntries(actors.map(actor => [actor.station.id, actor.root.position.toArray()]))});
  return {service, economy, actors, observations, payCalls, step, until, checkpoint,
    get durable() { return copy(durable); }, set sourceMode(value) { sourceMode = value; }, set rejectPay(value) { rejectPay = value; },
    set ready(value) { ready = value; },
    begin() {
      step(1, {hour: 11.2}); assert.equal(service.state().phase, 'holding');
      step(1, {hour: 11.5}); until(() => service.state().phase === 'report', 'Actual morning reaches the first report');
    },
    completeCourt() {
      this.begin(); assert.equal(service.state().speaker, CHINA_OFFICIAL_IDS[0]);
      until(() => service.state().phase === 'report' && service.state().reported === 1, 'Actual second report follows the first imperial response');
      assert.equal(service.state().speaker, CHINA_OFFICIAL_IDS[1]);
      assert.equal(service.state().personnelRecords.courts.length, 0, 'One heard report does not complete the court');
      until(() => service.state().schedule.outcome === 'completed', 'Actual dismissal/rising completes the two-report court');
      assert.equal(service.state().reported, 2);
    },
    returnToDesks() { stageTravel = true; },
    unchangedIdentity() {
      assert.deepEqual(actors.map(actor => actor.station.id), ids);
      assert.deepEqual(actors.map(actor => actor.station), identity);
      actors.forEach((actor, i) => assert.equal(actor.station, stations[i]));
    },
    dispose() { check(); this.unchangedIdentity(); service.dispose({suspend: true}); }
  };
}
const allDuty = (f, stage) => f.service.state().life.actors.every(actor => actor.duty?.stage === stage);
function assertWages(f, day = 3) {
  const paid = f.economy.history().filter(row => row.action === 'duty');
  assert.equal(paid.length, 6);
  for (const [i, id] of CHINA_OFFICIAL_IDS.entries()) {
    const rows = paid.filter(row => row.actorId === id); assert.equal(rows.length, 1);
    assert.equal(rows[0].day, day); assert.equal(rows[0].amount, wages[i]);
    assert.equal(rows[0].receiptId, `cn-official-duty:${id}:${day}`);
    assert.deepEqual(f.economy.account(id), {cash: 0, bank: wages[i]});
  }
}
function assertArchives(f, day = 3) {
  const source = f.service.personnelSource(day);
  assert.equal(source.audience.id, `cn-morning-audience:${day}`);
  assert.equal(source.throughSerial, 7);
  assert.deepEqual(source.audience.actors.map(row => row.actorId), CHINA_OFFICIAL_IDS);
  assert.equal(source.archives.length, 6);
  for (const [i, fact] of source.archives.entries()) {
    assert.equal(fact.id, `cn-official-archive:${CHINA_OFFICIAL_IDS[i]}:${day}`);
    assert.equal(fact.audienceId, source.audience.id); assert.deepEqual(fact.position, B.offices[i]);
    assert(fact.elapsed >= 8); assert.equal(fact.duration, 8);
    const actual = f.payCalls.find(call => call.input.actorId === fact.actorId && call.life.activity === 'archive-duty');
    if (actual) {
      assert(actual.life.elapsed >= 8); assert.deepEqual(actual.witnessed, fact, 'The actual finish observes its source before attempting wages');
    }
  }
}

// A completed original court is one fact, although only two officials speak.
// Real original archive completion remains a fact while the economy refuses pay.
const paidLater = fixture({rejectPay: true}); paidLater.completeCourt();
assert.equal(paidLater.service.state().personnelRecords.courts.length, 1);
assert.equal(paidLater.service.personnelSource(3).archives.length, 0);
const courtBoundary = copy(paidLater.observations.find(row => row.candidate.courts.length === 1).continuity);
assert.equal(courtBoundary.schedule.outcome, 'completed'); assert.equal(courtBoundary.runtime.phase, 'rising');
paidLater.returnToDesks(); paidLater.until(() => allDuty(paidLater, 'archived'), 'Each original body really completes its own eight-second archive');
assertArchives(paidLater); assert.equal(paidLater.economy.history().length, 0);
assert.equal(new Set(paidLater.payCalls.filter(call => call.life.activity === 'archive-duty' && call.witnessed).map(call => call.input.actorId)).size, 6);
assert(paidLater.payCalls.every(call => !call.result.ok));
const beforePay = copy(paidLater.service.state().personnelRecords);
paidLater.rejectPay = false; paidLater.until(() => allDuty(paidLater, 'paid'), 'Original five-second payroll retry settles already archived work');
assertWages(paidLater); assert.deepEqual(paidLater.service.state().personnelRecords, beforePay);
const paidCheckpoint = paidLater.checkpoint(); paidLater.step(60);
assertWages(paidLater); assert.deepEqual(paidLater.service.state().personnelRecords, beforePay);
paidLater.dispose();

// Failed court and archive source writes never gate successful original pay.
// The ordinary save persists all seven queued observations for a cold retry.
for (const mode of ['false', 'object', 'throw', 'promise']) {
  const failed = fixture({sourceMode: mode}); failed.completeCourt();
  assert.equal(failed.service.personnelSource(3).audience, null);
  assert.equal(failed.service.state().personnelRecords.outbox.length, 1);
  failed.returnToDesks(); failed.until(() => allDuty(failed, 'paid'), 'Source storage rejection must not gate any of the six wages');
  assertWages(failed);
  const queued = copy(failed.service.state().personnelRecords);
  assert.equal(queued.courts.length, 0); assert.equal(queued.archives.length, 0); assert.equal(queued.outbox.length, 7);
  assert.equal(queued.outbox[0].kind, 'court');
  assert.deepEqual(queued.outbox.slice(1).map(row => row.fact.actorId).sort(), [...CHINA_OFFICIAL_IDS].sort());
  for (const call of failed.payCalls) assert(call.witnessed, 'Rejected source fact is retained before successful wages');
  const cold = failed.checkpoint();
  assert.deepEqual(cold.top.personnelRecords, queued);
  assert.deepEqual(cold.continuity.personnelRecords, queued, 'Ordinary checkpoint preserves source outbox without claiming it committed');
  assert(failed.observations.length >= 7); failed.dispose();
  // Physical actor restoration is explicitly staged. All bodies have now left
  // the desk and died; retry must preserve the originally observed facts.
  for (const position of Object.values(cold.positions)) position[0] += 4;
  const restored = fixture({saved: cold}); restored.actors.slice(0, 6).forEach(actor => { actor.alive = false; });
  assert.deepEqual(restored.service.state().personnelRecords, queued);
  restored.step();
  assertArchives(restored); assertWages(restored);
  const committed = restored.service.state().personnelRecords;
  assert.deepEqual(committed.courts, [queued.outbox[0].fact]);
  assert.deepEqual(committed.archives, queued.outbox.slice(1).map(row => row.fact));
  assert.deepEqual(committed.eventIds, queued.outbox.map(row => row.fact.id));
  assert.deepEqual(committed.outbox, []); assert.equal(restored.observations.length, 1);
  assert.deepEqual(restored.durable.top.personnelRecords, restored.durable.continuity.personnelRecords);
  restored.step(60); assert.equal(restored.observations.length, 1); assertWages(restored); restored.dispose();
}
await Promise.resolve();

// Incomplete/postponed courts cannot become source history. At the completed
// boundary all six original living bodies must still occupy their hall places.
const partial = fixture(); partial.begin(); partial.step(20);
assert.equal(partial.service.state().schedule.outcome, 'in-session');
assert.deepEqual(partial.service.state().personnelRecords, empty()); partial.dispose();
const postponed = fixture(); postponed.step(1, {hour: 11.2}); postponed.ready = false; postponed.step(1, {hour: 11.5});
assert.equal(postponed.service.state().schedule.outcome, 'postponed');
assert.deepEqual(postponed.service.state().personnelRecords, empty()); postponed.dispose();
for (const unavailable of ['dead', 'away', 'identity']) {
  const f = fixture(); f.begin(); f.until(() => f.service.state().phase === 'rising', 'Original court has not yet completed');
  if (unavailable === 'dead') f.actors[5].alive = false;
  if (unavailable === 'away') f.actors[5].root.position.x += 1;
  if (unavailable === 'identity') f.actors[5].actorId = 'replacement-official';
  f.until(() => f.service.state().schedule.outcome === 'completed', 'Original attendance/pay path is left unchanged');
  assert.deepEqual(f.service.state().personnelRecords, empty(), unavailable + ' body cannot witness the original six-person source'); f.dispose();
}

// When present, continuity's ledger wins over a stale top-level copy in both
// directions, including an intentionally empty source ledger.
const continuityWins = copy(paidCheckpoint); continuityWins.top.personnelRecords = empty();
const loaded = fixture({saved: continuityWins});
assert.deepEqual(loaded.service.state().personnelRecords, paidCheckpoint.continuity.personnelRecords);
assertWages(loaded); loaded.dispose();
const emptyWins = copy(paidCheckpoint); emptyWins.continuity.personnelRecords = empty();
const emptyLoaded = fixture({saved: emptyWins});
assert.deepEqual(emptyLoaded.service.state().personnelRecords, empty()); emptyLoaded.step(60);
assert.deepEqual(emptyLoaded.service.state().personnelRecords, empty()); assertWages(emptyLoaded); emptyLoaded.dispose();

// Real old paid records are deliberately retained while their absent source
// history stays unknown. A legacy completed schedule/rising boundary is also
// repaired without retrospectively witnessing another court or its archives.
const oldPaid = copy(paidCheckpoint); delete oldPaid.top.personnelRecords; delete oldPaid.continuity.personnelRecords;
const oldLoaded = fixture({saved: oldPaid}); oldLoaded.step(60);
assert.deepEqual(oldLoaded.service.state().personnelRecords, empty()); assertWages(oldLoaded); oldLoaded.dispose();
const oldTerminal = copy(courtBoundary); delete oldTerminal.personnelRecords;
const terminal = fixture({saved: {continuity: oldTerminal}});
assert.equal(terminal.service.state().schedule.outcome, 'completed');
assert.equal(terminal.service.state().phase, 'departing');
assert.deepEqual(terminal.service.state().personnelRecords, empty());
terminal.returnToDesks(); terminal.until(() => allDuty(terminal, 'paid'), 'Legacy repaired completion keeps original payroll compatibility');
assertWages(terminal); assert.deepEqual(terminal.service.state().personnelRecords, empty()); terminal.dispose();
console.log('PASS actual two-report morning and all six original eight-second archives; source/pay independence, atomic candidate reentry, failed-write outbox cold retry, unchanged wages/identity, continuity precedence, and no invented old history');
