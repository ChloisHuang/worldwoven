// Regression boundaries: a payroll archive must not stand in for Xu's audit;
// arrival, talk and absent bodies must not count as reading/hearing; rejected
// full-world writes must retain the exact batch and its old-history cutoff.
// These are actual economy/life/audience modules with real Three actor roots.
// Desk travel and the hall starting positions are deliberately staged. This is
// not full-scene geometry, route, visual, or browser acceptance.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id, context, next) {
  return id === 'three' ? {url: new URL('../source/vendor/three/build/three.module.js', import.meta.url).href, shortCircuit: true} : next(id, context);
}});
const T = await import('three');
const {createChinaOfficialEconomy, CHINA_OFFICIAL_IDS} = await import('../source/game/china-official-economy.js');
const {createChinaGranaryAudit} = await import('../source/game/china-granary-audit.js');
const {createChinaOfficialLife} = await import('../source/game/china-official-life.js');
const {createChinaPalaceAudience, CHINA_COURT_OFFICIALS, chinaCourtAssemblyRoute} = await import('../source/game/china-palace-audience.js');
const {CHINA_OFFICIAL_BUREAU: B} = await import('../source/game/china-official-bureau.js');
const {createFacilityQueue} = await import('../source/game/npc-facilities.js');
const copy = value => JSON.parse(JSON.stringify(value));
const XU = 'cn-minister-granary', GU = 'cn-minister-works', EMPEROR = 'cn-emperor';
const batch = state => state.batches.at(-1);
const lot = {colliders: [], walkableSurfaces: [.215, 1.415, 3.915].map(y => ({minX: -35, maxX: 35, minZ: -40, maxZ: 40, y})), bounds: {minX: -35, maxX: 35, minZ: -40, maxZ: 40}};
function actorsAt(where, includeEmperor = false) {
  return [...CHINA_COURT_OFFICIALS, ...(includeEmperor ? [{id: EMPEROR, npcPosition: [0, 1.415, -8]}] : [])].map((station, i) => {
    const root = new T.Group(), head = new T.Group();
    root.userData.head = head; root.userData.hands = [new T.Group(), new T.Group()]; root.add(head, ...root.userData.hands);
    root.position.set(...(i < 6 ? where(i) : station.npcPosition));
    return {station, root, home: new T.Vector3(...station.npcPosition), phase: 0, route: [], locomotion: {walkSpeed: 1.5}, animate(_t, _walking, action) { this.lastAction = action; }};
  });
}
function economyFixture(day = 3) {
  const economy = createChinaOfficialEconomy({isAppointed: id => CHINA_OFFICIAL_IDS.includes(id), getDay: () => day, saveState: () => true});
  assert(economy.activateGradePayPolicy().ok);
  return {economy, pay(actorId, earnedDay) {
    const result = economy.completeDuty({actorId, day: earnedDay, receiptId: `flow-duty:${actorId}:${earnedDay}`,
      evidence: {kind: 'office-work', completed: true, actorId, day: earnedDay, audienceDay: earnedDay, audienceCompleted: true, duration: 8, elapsed: 8}});
    assert(result.ok, JSON.stringify(result)); return result.transaction;
  }};
}
function auditFixture(economy, saved) {
  let mode = 'accept', writes = 0, durable = saved ? copy(saved) : null;
  const audit = createChinaGranaryAudit({readReceipts: after => economy.dutyAuditSource(after), saved,
    saveState(next) { writes++; if (mode === 'false') return false; durable = copy(next); return true; }});
  return {audit, get writes() { return writes; }, get durable() { return copy(durable); }, set mode(v) { mode = v; }};
}
function lifeFixture({economy, audit, saved = {}, day = 1}) {
  const officials = actorsAt(i => B.offices[i]), xu = officials[1], identity = officials.map(n => n.station);
  const furniture = {items: [], facilities: createFacilityQueue()};
  let t = saved.runtime?.time || 0;
  const life = createChinaOfficialLife({officials, npcs: officials, lot, furniture, doors: {}, planPath: (_a, p) => [p],
    poseContext: () => ({}), safety: () => [], economy, granaryAudit: audit, worldSeed: 42, saved, getClock: () => ({day}),
    // Only travel is a double. Choice, 8-second archival work, 15–27-second
    // reading, interruption, persistence and completion use source modules.
    travel(n, s) { n.root.position.set(...s.path.at(-1)); s.arrived = true; }, saveState: () => true});
  const row = () => life.state().actors.find(n => n.id === XU);
  const stage = () => life.snapshot().runtime.stages.find(([id]) => id === XU)?.[1];
  const step = (count = 1, extra = {}) => { for (let i = 0; i < count; i++) { t += .1; life.tick(.1, {hour: 10, day, ...extra}); for (const n of officials) life.update(n, .1, t); } };
  const until = (test, label, max = 650) => { for (let i = 0; i < max && !test(); i++) step(); assert(test(), label + ' ' + JSON.stringify(row())); };
  return {life, officials, xu, row, stage, step, until, unchangedIdentity() { assert.deepEqual(officials.map(n => n.station), identity); }, dispose() { life.dispose({suspend: true}); }};
}

// The baseline is a real settled receipt; later completeDuty calls create the
// real source rows. Xu's own ordinary archive settles independently of audit.
const payroll = economyFixture(), old = payroll.pay(GU, 0), firstAudit = auditFixture(payroll.economy);
assert.equal(firstAudit.audit.snapshot().baseline, Number(old.id.slice(9)));
const newRows = [payroll.pay(GU, 1), payroll.pay('cn-official-justice', 1)];
const initialLife = lifeFixture({economy: payroll.economy, audit: firstAudit.audit,
  saved: {duties: {[XU]: {day: 1, stage: 'awaiting-archive'}}}});
assert.equal(initialLife.row().activity, 'archive-duty');
assert.equal(initialLife.stage().duration, 8);
initialLife.step();
assert(firstAudit.audit.snapshot().enabled, 'The actual life payroll tick activates the audit');
assert.deepEqual(batch(firstAudit.audit.snapshot()).receipts.map(row => row.id), newRows.map(row => row.id));
initialLife.until(() => initialLife.row().duty?.stage === 'paid', 'Actual eight-second archive settles Xu\'s own duty', 100);
assert.equal(batch(firstAudit.audit.snapshot()).result, null, 'Own payroll archival is not a completed audit');
assert.equal(payroll.economy.snapshot().transactions.filter(tx => tx.action === 'duty' && tx.actorId === XU && tx.day === 1).length, 1);
// Put Xu away from his desk while he is in ordinary post-work idle, so the
// later normal audit choice must actually reach the staged desk destination.
initialLife.xu.root.position.x += 1.2;
initialLife.until(() => initialLife.row().activity === 'payroll-audit', 'The ordinary life choice selects the pending payroll audit', 200);
assert.equal(initialLife.stage().choice.action, 'read');
assert.deepEqual(initialLife.stage().choice.point, B.offices[1]);
assert(initialLife.stage().duration >= 15 && initialLife.stage().duration <= 27);
assert.equal(initialLife.row().elapsed, 0);
initialLife.step();
assert(initialLife.row().arrived); assert.equal(initialLife.row().elapsed, 0, 'The arrival frame contributes no reading');
assert.equal(initialLife.xu.lastAction, 'read');
const moneyBeforeAudit = copy(payroll.economy.snapshot()), frozenRows = copy(batch(firstAudit.audit.snapshot()).receipts);
initialLife.step(40, {conversationActorId: XU});
assert.equal(initialLife.row().elapsed, 0, 'Player conversation contributes no audit time');
initialLife.xu.root.position.x += 1; initialLife.step(40);
assert.equal(initialLife.row().elapsed, 0, 'Time away from the actual desk contributes no reading');
initialLife.xu.root.position.set(...B.offices[1]); initialLife.xu.alive = false; initialLife.step(40);
assert.equal(initialLife.row().elapsed, 0, 'A dead original official cannot finish the audit');
initialLife.xu.alive = true; initialLife.step(30);
const partialLife = copy(initialLife.life.snapshot()), partialAudit = copy(firstAudit.audit.snapshot()), elapsed = initialLife.row().elapsed;
assert(elapsed > 2.9 && elapsed < 3.1); assert.equal(batch(partialAudit).result, null);
initialLife.unchangedIdentity(); initialLife.dispose();

const cancelledAudit = auditFixture(payroll.economy, partialAudit), cancelled = lifeFixture({economy: payroll.economy, audit: cancelledAudit.audit, saved: partialLife});
assert.equal(cancelled.row().elapsed, elapsed);
cancelled.life.request(cancelled.xu); cancelled.step();
assert(cancelled.life.ready(cancelled.xu));
assert.equal(batch(cancelledAudit.audit.snapshot()).result, null, 'Court cancellation cannot certify a partial audit');
assert.deepEqual(batch(cancelledAudit.audit.snapshot()).receipts, frozenRows); cancelled.dispose();

const resumedAudit = auditFixture(payroll.economy, partialAudit), resumed = lifeFixture({economy: payroll.economy, audit: resumedAudit.audit, saved: partialLife});
assert.equal(resumed.row().elapsed, elapsed, 'Cold life restore retains exactly the real reading seconds');
assert.equal(resumed.stage().duration, partialLife.runtime.stages.find(([id]) => id === XU)[1].duration);
resumedAudit.mode = 'false';
resumed.until(() => resumed.row().elapsed >= resumed.stage().duration, 'Actual remaining reading reaches the original duration');
assert.equal(batch(resumedAudit.audit.snapshot()).result, null, 'Rejected audit completion retains the same uncompleted batch');
assert.deepEqual(batch(resumedAudit.audit.snapshot()).receipts, frozenRows);
resumed.step(25); assert.equal(batch(resumedAudit.audit.snapshot()).result, null);
resumedAudit.mode = 'accept'; resumed.until(() => !!batch(resumedAudit.audit.snapshot()).result, 'Same complete audit retries after storage recovers', 30);
const inspectedAudit = copy(resumedAudit.audit.snapshot()), inspected = batch(inspectedAudit);
assert.equal(inspected.result.actorId, XU); assert.deepEqual(inspected.result.position, B.offices[1]);
assert(inspected.result.elapsed >= inspected.result.duration); assert(inspected.result.duration >= 15 && inspected.result.duration <= 27);
assert.deepEqual(inspected.receipts, frozenRows, 'Later-paid Xu receipt does not mutate an already frozen batch');
assert.deepEqual(payroll.economy.snapshot(), moneyBeforeAudit, 'Reading/retries/restores cannot change money or wage receipts');
resumed.unchangedIdentity(); resumed.dispose();

function audienceFixture({economy = payroll.economy, granaryAudit = inspectedAudit, continuity = null, day = 2, mode = 'accept'} = {}) {
  let service, duty = !!continuity, ready = true, time = continuity?.runtime?.time || 0, attempts = 0, accepted = 0, activationAttempts = 0, durable = null;
  const actors = actorsAt(i => chinaCourtAssemblyRoute(i).hall, true), identities = actors.map(n => n.station);
  const reportedBatchId = continuity?.runtime?.currentReport?.auditReport?.batchId || granaryAudit?.batches.find(row => row.result && !row.received)?.id || null;
  const palace = {dutyPlan: () => ({reachable: true, seconds: 42.5}), requestDuty() { duty = true; }, dutyState: () => duty ? {ready} : null, setDutyLine() {}, releaseDuty() { duty = false; }};
  service = createChinaPalaceAudience({npcs: actors, palace, economy, getClock: () => ({day}),
    saved: {...(granaryAudit ? {granaryAudit} : {}), ...(continuity ? {continuity} : {})}, lot,
    furniture: {items: [], facilities: createFacilityQueue()}, doors: {cameraColliders: [], routeStep: () => ({waiting: true})},
    planPath: (_a, p) => [p], moveActor() {}, poseContext: () => ({}),
    saveState(next) {
      if (!service) return true;
      const projected = copy(service.snapshot()), live = service.state().granaryAudit;
      assert.deepEqual(projected.granaryAudit, copy(next.granaryAudit), 'Full-world top and continuity see the same audit candidate');
      if (next.granaryAudit.enabled && !live.enabled) {
        activationAttempts++;
        if (mode === 'activation-false') return false;
      }
      if (batch(next.granaryAudit)?.received && !batch(live)?.received) {
        attempts++; assert.equal(batch(live).received, undefined, 'The live batch is not consumed before durable storage');
        const before = copy(projected); service.update(.25, time, {hour: 11.6, day});
        assert.deepEqual(copy(service.snapshot()), before, 'Saving an audit candidate cannot reenter the audience');
        if (mode === 'false') return false;
        if (mode === 'object') return {ok: false};
        if (mode === 'throw') throw Error('quota');
        if (mode === 'promise') return Promise.reject(Error('quota'));
        accepted++;
      }
      durable = {top: copy(next), continuity: projected}; return true;
    }});
  if (continuity) assert(service.restore(continuity));
  const step = (count = 1, {hour = 11.6, conversationActorId} = {}) => { for (let i = 0; i < count; i++) { time += .1; service.update(.1, time, {hour, day, conversationActorId}); } };
  const until = (test, label, max = 400) => { for (let i = 0; i < max && !test(); i++) step(); assert(test(), label + ' ' + JSON.stringify({phase: service.state().phase, reported: service.state().reported, phaseTime: service.state().phaseTime})); };
  return {service, actors, step, until, get attempts() { return attempts; }, get accepted() { return accepted; }, get activationAttempts() { return activationAttempts; }, get durable() { return copy(durable); },
    getBatch: () => reportedBatchId ? service.state().granaryAudit.batches.find(row => row.id === reportedBatchId) : batch(service.state().granaryAudit), set ready(value) { ready = value; },
    beginXu() {
      step(1, {hour: 11.2}); assert.equal(service.state().phase, 'holding'); step(1, {hour: 11.5});
      until(() => service.state().phase === 'report', 'Original court kneel/report entry');
      assert.equal(service.state().speaker, GU); assert.equal(service.state().reported, 0); assert.equal(attempts, 0);
      until(() => service.state().phase === 'report' && service.state().reported === 1, 'Xu takes the actual second report after Gu and imperial response');
      assert.equal(service.state().speaker, XU); assert(service.state().currentReport.auditReport);
    },
    dispose() { assert.deepEqual(actors.map(n => n.station), identities); service.dispose({suspend: true}); }};
}
function reachReceipt(f) {
  f.beginXu(); const id = f.getBatch().id;
  f.step(59); assert.equal(f.service.state().phase, 'report'); assert.equal(f.getBatch().received, undefined);
  const reportElapsed = f.service.state().phaseTime;
  f.step(50, {conversationActorId: XU}); assert.equal(f.service.state().phaseTime, reportElapsed);
  f.ready = false; f.step(5); assert.equal(f.service.state().phaseTime, reportElapsed); f.ready = true;
  f.actors[1].alive = false; f.step(5); assert.equal(f.service.state().phaseTime, reportElapsed); f.actors[1].alive = true;
  f.actors[1].root.position.x += 1; f.step(5); assert.equal(f.service.state().phaseTime, reportElapsed); f.actors[1].root.position.x -= 1;
  f.until(() => f.service.state().phase === 'response', 'Xu actually completes six valid reporting seconds');
  assert.equal(f.service.state().currentReport.resultDelivery.reportSeconds, 6);
  f.step(39); assert.equal(f.service.state().phase, 'response'); assert.equal(f.attempts, 0);
  const responseElapsed = f.service.state().phaseTime;
  f.step(50, {conversationActorId: EMPEROR}); assert.equal(f.service.state().phaseTime, responseElapsed);
  f.ready = false; f.step(5); assert.equal(f.service.state().phaseTime, responseElapsed); f.ready = true;
  f.until(() => f.attempts > 0, 'Acknowledgement waits for four actual imperial response seconds');
  assert.equal(f.getBatch().id, id);
}
for (const mode of ['false', 'object', 'throw', 'promise']) {
  const f = audienceFixture({mode}); reachReceipt(f);
  assert.deepEqual(f.service.state().granaryAudit, inspectedAudit, 'Rejected receipt leaves the core batch byte-identical');
  assert.equal(f.service.state().phase, 'response'); assert.equal(f.accepted, 0);
  const pending = copy(f.service.snapshot());
  assert.deepEqual(pending.granaryAudit, inspectedAudit); assert.equal(pending.runtime.currentReport.resultDelivery.reportSeconds, 6); assert(pending.runtime.phaseTime >= 4);
  if (f.durable) assert.deepEqual(f.durable.top.granaryAudit, f.durable.continuity.granaryAudit);
  f.dispose();
  const recovered = audienceFixture({continuity: pending});
  assert.equal(recovered.getBatch().received, undefined);
  recovered.until(() => recovered.accepted === 1, 'Cold restored exact batch receives one successful acknowledgement');
  const received = copy(recovered.getBatch()), durable = recovered.durable;
  assert.equal(received.received.reporterId, XU); assert.equal(received.received.recipientId, EMPEROR);
  assert.equal(received.received.reportSeconds, 6); assert.equal(received.received.responseSeconds, 4); assert.equal(received.received.day, 2);
  assert.deepEqual(durable.top.granaryAudit, durable.continuity.granaryAudit);
  assert.equal(durable.continuity.runtime.phase, 'response', 'Durable receipt is saved before advancing the ceremony');
  recovered.dispose();
  const replay = audienceFixture({continuity: durable.continuity}); replay.step(2);
  assert.equal(replay.attempts, 0); assert.equal(replay.accepted, 0); assert.deepEqual(replay.getBatch(), received);
  replay.dispose();
}
await Promise.resolve();

// Partially heard report/response clocks survive cold loads without either
// consuming the audit early or replaying its already-heard segment.
const partialReport = audienceFixture(); partialReport.beginXu(); partialReport.step(20);
const reportCheckpoint = copy(partialReport.service.snapshot()), reportAt = partialReport.service.state().phaseTime; partialReport.dispose();
const resumeReport = audienceFixture({continuity: reportCheckpoint});
assert.equal(resumeReport.service.state().phaseTime, reportAt); assert.equal(resumeReport.getBatch().received, undefined);
resumeReport.until(() => resumeReport.service.state().phase === 'response', 'Partial Xu report finishes the remaining valid seconds'); resumeReport.step(20);
const replyCheckpoint = copy(resumeReport.service.snapshot()), replyAt = resumeReport.service.state().phaseTime; resumeReport.dispose();
const resumeReply = audienceFixture({continuity: replyCheckpoint});
assert.equal(resumeReply.service.state().phaseTime, replyAt); assert.equal(resumeReply.getBatch().received, undefined);
resumeReply.until(() => resumeReply.accepted === 1, 'Partial imperial response finishes before receipt'); resumeReply.dispose();

const interrupted = audienceFixture(); interrupted.beginXu(); interrupted.step(5); interrupted.ready = false; interrupted.step(35);
assert.equal(interrupted.service.state().schedule.outcome, 'postponed'); assert.equal(interrupted.getBatch().received, undefined);
const unreceived = copy(interrupted.service.state().granaryAudit); interrupted.dispose();
const tomorrow = audienceFixture({granaryAudit: unreceived, day: 3}); reachReceipt(tomorrow);
assert.equal(tomorrow.accepted, 1); assert.equal(tomorrow.getBatch().received.day, 3); tomorrow.dispose();
assert.deepEqual(payroll.economy.snapshot(), moneyBeforeAudit, 'Audience, failed writes, retries and cold replay never change any money or payroll source');

// Upgrade activation can fail before new pay arrives. An ordinary full-world
// snapshot must persist the original disabled plan and override a stale top
// level copy at cold construction, rather than silently skip the new wages.
const upgradePayroll = economyFixture(), historical = upgradePayroll.pay(GU, 0);
const upgrade = audienceFixture({economy: upgradePayroll.economy, granaryAudit: null, day: 1, mode: 'activation-false'});
upgrade.step(1, {hour: 10}); assert.equal(upgrade.activationAttempts, 1);
const baseline = Number(historical.id.slice(9));
assert.equal(upgrade.service.state().granaryAudit.enabled, false); assert.equal(upgrade.service.state().granaryAudit.baseline, baseline);
const paidDuringFailure = upgradePayroll.pay('cn-official-records', 1), upgradeMoney = copy(upgradePayroll.economy.snapshot());
const ordinarySave = copy(upgrade.service.snapshot());
assert.equal(ordinarySave.granaryAudit.baseline, baseline); assert.equal(ordinarySave.granaryAudit.enabled, false); upgrade.dispose();
const staleTop = {...copy(ordinarySave.granaryAudit), baseline: Number(paidDuringFailure.id.slice(9)), frontier: Number(paidDuringFailure.id.slice(9))};
const coldUpgrade = audienceFixture({economy: upgradePayroll.economy, granaryAudit: staleTop, continuity: ordinarySave, day: 1});
assert.equal(coldUpgrade.service.state().granaryAudit.baseline, baseline, 'Continuity carries the authoritative pending initial baseline');
coldUpgrade.step(1, {hour: 10});
assert(coldUpgrade.service.state().granaryAudit.enabled);
assert.deepEqual(coldUpgrade.getBatch().receipts.map(row => row.id), [paidDuringFailure.id]);
assert.equal(coldUpgrade.getBatch().fromSerial, baseline);
assert.deepEqual(coldUpgrade.durable.top.granaryAudit, coldUpgrade.durable.continuity.granaryAudit);
assert.deepEqual(upgradePayroll.economy.snapshot(), upgradeMoney); coldUpgrade.dispose();
console.log('PASS actual paid-source → separate Xu 15–27s desk audit → real second Xu6s/emperor4s receipt; paused/cancelled/partial cold work, atomic failure/reentry/replay, unchanged money and identities, pending upgrade baseline continuity');
