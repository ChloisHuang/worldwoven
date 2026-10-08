// CR03/CL01 integration regression: a new pay policy must not upgrade old
// pending duties, mint money before a confirmed save, or pay a reload twice.
// Actual life controller: courtCompleted -> the same six bodies at their own
// desks for eight seconds -> real economy.completeDuty. This staged fixture
// doubles travel only; it is not a full court/world/navigation or visual test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createChinaOfficialEconomy, CHINA_OFFICIAL_IDS} from '../source/game/china-official-economy.js';
import {CHINA_OFFICIAL_GRADE_PAY_POLICY_ID, CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1} from '../source/game/china-official-ranks.js';

const copy = value => JSON.parse(JSON.stringify(value));
const amounts = [168, 120, 88, 64, 168, 38];
const policy = effectiveDay => ({version: 1, policyId: CHINA_OFFICIAL_GRADE_PAY_POLICY_ID, effectiveDay});
const receiptId = (id, day) => `cn-official-duty:${id}:${day}`;
const context = vm.createContext({console}), modules = new Map(), source = path.resolve('source');
function module(file) {
  if (!modules.has(file)) modules.set(file, new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), {context, identifier: file}));
  return modules.get(file);
}
const linker = (specifier, from) => module(specifier === 'three' ? path.join(source, 'vendor/three/build/three.module.js') : path.resolve(path.dirname(from.identifier), specifier));
const lifeModule = module(path.join(source, 'game/china-official-life.js'));
await lifeModule.link(linker); await lifeModule.evaluate();
const facilitiesModule = module(path.join(source, 'game/npc-facilities.js'));
await facilitiesModule.link(linker); await facilitiesModule.evaluate();
const threeModule = module(path.join(source, 'vendor/three/build/three.module.js'));
if (threeModule.status === 'unlinked') await threeModule.link(linker);
if (threeModule.status !== 'evaluated') await threeModule.evaluate();
const T = threeModule.namespace;
const B = modules.get(path.join(source, 'game/china-official-bureau.js')).namespace.CHINA_OFFICIAL_BUREAU;

function fixture({saved, day: initialDay = 0, requirePolicy = true, reject: initialReject = false} = {}) {
  let day = initialDay, reject = initialReject, time = 0, life;
  let durableEconomy = copy(saved?.economy ?? null);
  const calls = [], writes = [], archives = new Map();
  const activationPlan = saved?.activationPlan ?? saved?.economy?.payPolicy ?? policy(saved?.economy ? day + 1 : 0);
  const officials = CHINA_OFFICIAL_IDS.map((id, i) => {
    const root = new T.Group(); root.position.set(...B.offices[i]);
    return {station: {id}, root, home: root.position.clone(), phase: 0, route: [], animate() {}};
  });
  const economy = createChinaOfficialEconomy({saved: saved?.economy, requireGradePayPolicy: requirePolicy,
    ...(requirePolicy ? {activationPlan} : {}), getDay: () => day,
    isAppointed: id => CHINA_OFFICIAL_IDS.includes(id),
    saveState(next, transaction, patch) {
      assert.deepEqual(patch, {});
      if (reject) return false;
      durableEconomy = copy(next); writes.push(copy(transaction)); return true;
    }});
  assert.equal(economy.loadError, null);
  // Observe the original public method; neither receipts nor completion
  // evidence is supplied by this test. Only the life controller creates them.
  const observedEconomy = {...economy, completeDuty(input) {
    const actor = officials.find(npc => npc.station.id === input.actorId);
    assert(actor, 'Only one of the original six bodies can earn this payroll');
    const live = life.state().actors.find(npc => npc.id === input.actorId);
    if (live.activity === 'archive-duty' && live.elapsed >= 8) {
      assert.equal(live.duty.day, input.day);
      assert.deepEqual(copy(actor.root.position.toArray()), copy(B.offices[officials.indexOf(actor)]));
      archives.set(input.receiptId, {actor, elapsed: live.elapsed, day: input.day});
    }
    const result = economy.completeDuty(input);
    calls.push({input: copy(input), result: copy(result)}); return result;
  }};
  life = lifeModule.namespace.createChinaOfficialLife({officials, npcs: officials, economy: observedEconomy,
    saved: saved?.life ?? {},
    lot: {colliders: [], walkableSurfaces: [], bounds: {minX: -40, maxX: 40, minZ: -40, maxZ: 40}},
    furniture: {items: [], facilities: facilitiesModule.namespace.createFacilityQueue()}, doors: {},
    planPath: (_, target) => [target], poseContext: () => ({}), safety: () => [], getClock: () => ({day}),
    saveState: () => !reject,
    travel(npc, stage) {npc.root.position.set(...stage.path.at(-1)); stage.arrived = true;}});
  const tick = (count = 1) => {
    for (let i = 0; i < count; i++) {
      time += .25; life.tick(.25, {hour: 10, day});
      for (const npc of officials) life.update(npc, .25, time);
    }
  };
  const until = (condition, label) => {
    for (let i = 0; i < 1200 && !condition(); i++) tick();
    assert(condition(), `${label}: ${JSON.stringify(copy(life.state().actors))}`);
  };
  return {life, economy, officials, calls, writes, archives, tick, until,
    get day() {return day;}, set day(value) {day = value;}, set reject(value) {reject = value;},
    get durableEconomy() {return copy(durableEconomy);},
    checkpoint: () => ({economy: economy.snapshot(), life: copy(life.snapshot()), ...(requirePolicy ? {activationPlan: copy(activationPlan)} : {})}),
    court(completedDay = day) {life.courtCompleted(completedDay); officials.forEach(npc => life.resume(npc));},
    dispose() {life.dispose({suspend: true});}};
}
function assertArchives(f, day) {
  for (const npc of f.officials) {
    const archive = f.archives.get(receiptId(npc.station.id, day));
    assert(archive, `${npc.station.id} must actually finish its own original desk work`);
    assert.equal(archive.actor, npc); assert(archive.elapsed >= 8);
  }
}
function assertPayments(f, day, expectedAmounts, graded) {
  const history = f.economy.history().filter(tx => tx.action === 'duty' && tx.day === day);
  assert.equal(history.length, 6);
  for (const [i, id] of CHINA_OFFICIAL_IDS.entries()) {
    const entries = history.filter(tx => tx.actorId === id); assert.equal(entries.length, 1);
    const tx = entries[0];
    assert.equal(tx.receiptId, receiptId(id, day)); assert.equal(tx.amount, expectedAmounts[i]);
    assert.equal(tx.from, 'government-guaranteed'); assert.equal(tx.to, `${id}:bank`);
    assert.deepEqual(tx.evidence, {kind: 'office-work', completed: true, actorId: id, day,
      elapsed: 8, duration: 8, audienceDay: day, audienceCompleted: true});
    if (graded) assert.deepEqual(tx.payContract, {version: 1, policyId: CHINA_OFFICIAL_GRADE_PAY_POLICY_ID,
      gradeId: CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1[id], amount: expectedAmounts[i]});
    else assert(!Object.hasOwn(tx, 'payContract'), 'Legacy duty retains its original scalar contract');
  }
}
const allStage = (f, stage) => f.life.state().actors.every(npc => npc.duty?.stage === stage);
const oldAmounts = Array(6).fill(24);

// Fresh policy save fails first. Real completed desk work remains pending,
// with no provisional wages available to the six personal accounts.
const fresh = fixture({reject: true});
assert.equal(fresh.economy.activateGradePayPolicy().code, 'save-failed');
assert.equal(fresh.economy.gradePayPolicy(), null); assert.equal(fresh.writes.length, 0);
fresh.court(); fresh.tick(31); // Under eight elapsed seconds, regardless of travel/decision delays.
assert.equal(fresh.calls.length, 0); assert.equal(fresh.economy.state().governmentPaid, 0);
fresh.until(() => allStage(fresh, 'archived'), 'All six fresh duties must finish real archive work');
assertArchives(fresh, 0);
assert(fresh.calls.length >= 6 && fresh.calls.every(call => call.result.code === 'pay-policy-pending'));
assert.equal(fresh.economy.history().length, 0); assert.equal(fresh.durableEconomy, null);
for (const id of CHINA_OFFICIAL_IDS) assert.deepEqual(fresh.economy.account(id), {cash: 0, bank: 0});
const pendingFresh = fresh.checkpoint(); fresh.dispose();

// Ordinary checkpoint retains the original policy intent and pending work.
// Opening much later cannot accrue absent days or silently pay on construction.
const retryFresh = fixture({saved: pendingFresh, day: 50});
assert.deepEqual(retryFresh.economy.snapshot(), pendingFresh.economy);
assert.deepEqual(copy(retryFresh.life.snapshot().duties), pendingFresh.life.duties);
assert.equal(retryFresh.calls.length, 0); assert.equal(retryFresh.writes.length, 0);
assert(retryFresh.economy.activateGradePayPolicy().ok);
assert.deepEqual(retryFresh.economy.gradePayPolicy(), policy(0));
retryFresh.until(() => allStage(retryFresh, 'paid'), 'Original fresh duties must retry once after policy save');
assertPayments(retryFresh, 0, amounts, true);
assert.equal(retryFresh.economy.state().governmentPaid, 646);
assert.equal(retryFresh.writes.filter(Boolean).length, 6);
const freshPaid = retryFresh.checkpoint(); retryFresh.tick(80);
assert.deepEqual(retryFresh.economy.snapshot(), freshPaid.economy);
retryFresh.dispose();
const freshReload = fixture({saved: freshPaid, day: 500});
assert(freshReload.economy.activateGradePayPolicy().replayed); freshReload.tick(80);
assert.deepEqual(freshReload.economy.snapshot(), freshPaid.economy);
assert.equal(freshReload.writes.length, 0); freshReload.dispose();
console.log('PASS six real day-0 archive receipts: rejected policy save mints zero, original intent survives reload, 168/120/88/64/168/38 once only, no offline accrual');

// Produce the historical ledger and awaiting-archive checkpoint through the
// unmodified original controller. No fabricated completed/paid fixture rows.
const legacy = fixture({day: 2, requirePolicy: false});
legacy.court(); legacy.until(() => allStage(legacy, 'paid'), 'Legacy day-2 payroll');
assertArchives(legacy, 2); assertPayments(legacy, 2, oldAmounts, false);
legacy.day = 7; legacy.court();
assert(allStage(legacy, 'awaiting-archive'));
const awaiting = legacy.checkpoint(), oldHistoryBytes = JSON.stringify(awaiting.economy.transactions);
legacy.dispose();
const upgraded = fixture({saved: awaiting, day: 7});
assert.deepEqual(upgraded.economy.snapshot(), awaiting.economy);
assert.deepEqual(copy(upgraded.life.snapshot().duties), awaiting.life.duties);
assert.equal(upgraded.writes.length, 0); assert(upgraded.economy.activateGradePayPolicy().ok);
assert.deepEqual(upgraded.economy.gradePayPolicy(), policy(8));
assert.equal(JSON.stringify(upgraded.economy.history()), oldHistoryBytes);
const beforeRejectedPayroll = upgraded.economy.snapshot(), durableBefore = upgraded.durableEconomy;
upgraded.reject = true;
upgraded.until(() => allStage(upgraded, 'archived'), 'Upgrade-day awaiting work must actually finish');
assertArchives(upgraded, 7);
assert(upgraded.calls.some(call => call.input.day === 7 && call.result.code === 'save-failed'));
assert.deepEqual(upgraded.economy.snapshot(), beforeRejectedPayroll);
assert.deepEqual(upgraded.durableEconomy, durableBefore);

// A new court day moves the prior archived/unpaid work to the original queue.
// Its day-7 contract remains old; day-8 work earns the frozen grade schedule.
upgraded.day = 8; upgraded.court();
const queued = copy(upgraded.life.snapshot().unpaidDuties);
assert.equal(queued.length, 6);
assert(queued.every(duty => duty.day === 7 && duty.stage === 'archived'));
upgraded.until(() => allStage(upgraded, 'archived'), 'All six new-day duties must finish their original desks');
assertArchives(upgraded, 8);
assert.deepEqual(upgraded.economy.snapshot(), beforeRejectedPayroll);
const unpaid = upgraded.checkpoint(); upgraded.dispose();
const restored = fixture({saved: unpaid, day: 90, reject: true});
assert.equal(restored.writes.length, 0); assert.equal(restored.calls.length, 0);
assert.deepEqual(copy(restored.life.snapshot().unpaidDuties), queued);
assert.deepEqual(copy(restored.life.snapshot().duties), unpaid.life.duties);
restored.tick(24); // Failed retries cannot remove old pending work or add any money.
assert.deepEqual(restored.economy.snapshot(), unpaid.economy);
assert.deepEqual(copy(restored.life.snapshot().unpaidDuties), queued);
assert(allStage(restored, 'archived'));
restored.reject = false;
restored.until(() => allStage(restored, 'paid') && restored.life.snapshot().unpaidDuties.length === 0,
  'Old and new archived duties must settle exactly once after persistence recovers');
assertPayments(restored, 2, oldAmounts, false);
assertPayments(restored, 7, oldAmounts, false);
assertPayments(restored, 8, amounts, true);
assert.equal(JSON.stringify(restored.economy.history().slice(0, 6)), oldHistoryBytes);
assert.equal(restored.economy.state().governmentPaid, 934);
assert.equal(restored.writes.filter(Boolean).length, 12);
for (const [i, id] of CHINA_OFFICIAL_IDS.entries()) assert.deepEqual(restored.economy.account(id), {cash: 0, bank: 48 + amounts[i]});
const settled = restored.checkpoint(); restored.tick(80);
assert.deepEqual(restored.economy.snapshot(), settled.economy); restored.dispose();
const finalReload = fixture({saved: settled, day: 999});
assert(finalReload.economy.activateGradePayPolicy().replayed); finalReload.tick(80);
assert.deepEqual(finalReload.economy.snapshot(), settled.economy);
assert.equal(finalReload.writes.length, 0); assert.equal(finalReload.life.snapshot().unpaidDuties.length, 0);
finalReload.dispose();
console.log('PASS all six old awaiting duties archive on their original upgrade day, then old24/new-grade unpaid receipts survive future-day retry and reload, with exact prior history and no duplicate/offline wages');
