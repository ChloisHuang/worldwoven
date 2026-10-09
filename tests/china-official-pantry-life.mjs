// Regression boundaries for Xu's pantry work in his existing official life.
// Actual life/decision/restore modules; travel and the kitchen ledger boundary
// are doubles. These checks do not claim production geometry or browser QA.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id, context, next) {
  return id === 'three' ? {url: new URL('../source/vendor/three/build/three.module.js', import.meta.url).href, shortCircuit: true} : next(id, context);
}});
const T = await import('three');
const {createChinaOfficialLife} = await import('../source/game/china-official-life.js');
const {createLifeDecisions} = await import('../source/game/npc-life-decisions.js');
const {createFacilityQueue} = await import('../source/game/npc-facilities.js');
const {CHINA_OFFICIAL_BUREAU: B} = await import('../source/game/china-official-bureau.js');
const ids = ['cn-minister-works', 'cn-minister-granary', 'cn-official-rites', 'cn-official-personnel', 'cn-official-justice', 'cn-official-records'];
const XU = ids[1], shelf = [24.15, 4.015, -4.5], royalStairs = [[17.2,.215,-8.7],[17.2,.215,-10.6],[24.8,4.015,-10.6],[24.8,4.015,-8.7]];
const copy = value => JSON.parse(JSON.stringify(value));
const job = (kind, serial = 1) => ({id: `pantry-${kind}:${serial}`, kind, point: kind === 'count' ? shelf.slice() : B.offices[1].slice(), workTarget: kind === 'count' ? [25.1,5.4,-4.5] : B.workTargets[1].slice(), label: kind, duration: 4});
function fixture({saved = null, tasks = [job('count'), job('approve'), job('archive')], fatigue = .2, duty = null, payroll = null, need = {}} = {}) {
  const actors = ids.map((id, i) => { const root = new T.Group(); root.position.set(...B.offices[i]); return {station: {id}, root, home: root.position.clone(), phase: 0, route: [], alive: true, animate(_t, _walking, action) { this.action = action; }}; });
  const xu = actors[1], decisions = createLifeDecisions({worldSeed: 42, actorIds: ids}).snapshot();
  for (const id of ids) decisions.people[id].needs.fatigue = fatigue;
  let time = saved?.runtime?.time || 0, moving = true, allow = true, status = {seekMeal: false, seekToilet: false, ...need}, reads = [], attempts = [], completed = [], mealLease = null;
  const queue = copy(tasks), paths = [], events = [];
  const kitchen = {pantryTask(id) { reads.push(id); return id === XU ? copy(queue[0] || null) : null; },
    completePantryTask(taskId, evidence) {
      attempts.push({taskId, evidence: copy(evidence)});
      assert.equal(evidence.actorId, XU); assert.equal(taskId, queue[0].id); assert.deepEqual(evidence.position, queue[0].point);
      assert(evidence.elapsed >= 4); assert.equal(evidence.duration, 4);
      if (!allow) return {ok: false}; completed.push(queue.shift()); return {ok: true};
    }};
  const flow = createChinaOfficialLife({officials: actors, npcs: actors, lot: {colliders: [], walkableSurfaces: [.215, 3.915, 4.015].map(y => ({minX: -35, maxX: 35, minZ: -40, maxZ: 40, y})), bounds: {minX: -35, maxX: 35, minZ: -40, maxZ: 40}},
    furniture: {items: [], facilities: createFacilityQueue()}, doors: {}, planPath: (_a, p) => [p], poseContext: () => ({}), safety: () => [],
    getRoyalKitchen: () => kitchen, sharedNeeds: {hunger: () => .2, status: () => status}, worldSeed: 42,
    granaryAudit: payroll ? {job: () => payroll, activate: () => ({ok: false})} : null,
    getTavern: () => ({officialMealAvailable: () => true, officialMeal: () => mealLease, requestOfficialMeal(id) {mealLease = {actorId: id}; return true;}}),
    travel(n, s) { if (!moving) return; paths.push({actorId: n.station.id, path: copy(s.path)}); n.root.position.set(...s.path[s.index]); if (++s.index === s.path.length) s.arrived = true; },
    saved: saved || {decisions, ...(duty ? {duties: {[XU]: duty}} : {})}, saveState: () => true, record: event => events.push(event)});
  const row = () => flow.state().actors.find(a => a.id === XU), stage = () => flow.snapshot().runtime.stages.find(([id]) => id === XU)?.[1];
  const step = (count = 1, playerState = {}) => {for (let i = 0; i < count; i++) {time += .1; flow.tick(.1, {day: 0, hour: 10, ...playerState}); flow.update(xu, .1, time);}};
  const until = (predicate, label, max = 600) => {for (let i = 0; i < max && !predicate(); i++) step(); assert(predicate(), label + ': ' + JSON.stringify(row()));};
  return {flow, actors, xu, queue, paths, reads, attempts, completed, events, row, stage, step, until,
    get moving() {return moving;}, set moving(v) {moving = v;}, set allow(v) {allow = v;}, set need(v) {status = {...status, ...v};}, dispose() {flow.dispose({suspend: true});}};
}

const f = fixture();
assert.equal(f.row().activity, 'pantry-count');
assert.deepEqual(f.stage().path, [...royalStairs, shelf]);
assert(f.reads.every(id => id === XU), 'Only the original Xu can receive pantry tasks');
assert.equal(f.actors.length, 6);
f.step(5); assert(f.row().arrived); assert.equal(f.row().elapsed, 0, 'Arrival contributes no work');
f.step(20, {conversationActorId: XU}); assert.equal(f.row().elapsed, 0, 'A conversation pauses the exact task');
f.xu.alive = false; const deadPosition = f.xu.root.position.toArray(); f.step(20);
assert.equal(f.row().elapsed, 0); assert.deepEqual(f.xu.root.position.toArray(), deadPosition); assert.equal(f.attempts.length, 0);
f.xu.alive = true; f.xu.root.position.x -= 1; f.moving = false; f.step(20);
assert.equal(f.row().elapsed, 0); assert(!f.row().arrived); assert.equal(f.attempts.length, 0, 'Remote time cannot certify stock');
f.moving = true; f.until(() => f.row().arrived, 'The displaced original body returns to the shelf');
f.step(20); const partial = copy(f.flow.snapshot()), elapsed = f.row().elapsed;
assert(elapsed > 1.9 && elapsed < 2.1); assert.equal(f.attempts.length, 0); f.dispose();

const interrupted = fixture({saved: partial});
const beforeCall = interrupted.xu.root.position.toArray(); interrupted.flow.request(interrupted.xu); interrupted.step();
assert(interrupted.flow.ready(interrupted.xu)); assert.equal(interrupted.attempts.length, 0);
assert.deepEqual(interrupted.xu.root.position.toArray(), beforeCall, 'A summons never teleports Xu');
assert.deepEqual(interrupted.flow.courtPlan(interrupted.xu).path, royalStairs.slice().reverse(), 'Court uses the existing royal stairs, not the tavern');
interrupted.dispose();

const resumed = fixture({saved: partial});
assert.equal(resumed.row().elapsed, elapsed); assert.deepEqual(resumed.xu.root.position.toArray(), shelf);
resumed.allow = false; resumed.until(() => resumed.attempts.length === 1, 'Original completion attempted');
assert.equal(resumed.queue.length, 3); resumed.step(20); assert.equal(resumed.completed.length, 0);
assert(resumed.attempts.length <= 3, 'Storage retries are bounded to once per second');
resumed.allow = true; resumed.until(() => resumed.completed.length === 1, 'Rejected completion retries the original task');
assert.equal(resumed.completed[0].kind, 'count');
resumed.until(() => resumed.row().activity === 'pantry-approve', 'Approval is selected after the count');
assert.deepEqual(resumed.stage().path, [...royalStairs.slice().reverse(), B.offices[1]], 'Approval returns to the original office by real stairs');
resumed.until(() => resumed.completed.length === 2, 'Approval completes only after desk work');
resumed.until(() => resumed.completed.length === 3, 'Archive completes only after its own desk work');
assert.deepEqual(resumed.completed.map(t => t.kind), ['count', 'approve', 'archive']);
assert.deepEqual(resumed.attempts.at(-1).evidence.position, B.offices[1]); resumed.dispose();

const stale = fixture({tasks: [job('approve', 1)]}); stale.step(10); assert(stale.row().elapsed > 0);
stale.queue[0] = job('approve', 2); stale.step(); assert.equal(stale.attempts.length, 0); assert.equal(stale.stage().choice.pantryTaskId, 'pantry-approve:2');
assert.equal(stale.row().elapsed, 0, 'A new original order cannot inherit old approval time'); stale.dispose();
const need = fixture(); need.step(2); const atNeed = need.xu.root.position.toArray(); need.need = {seekMeal: true}; need.step();
assert.equal(need.row().activity, 'meal'); assert.equal(need.attempts.length, 0); assert.deepEqual(need.xu.root.position.toArray(), atNeed);
assert.equal(need.queue.length, 3, 'Urgent needs retain all uncompleted pantry work'); need.dispose();
const wages = fixture({duty: {day: 0, stage: 'awaiting-archive'}}); assert.equal(wages.row().activity, 'archive-duty'); wages.dispose();
const audit = fixture({payroll: {id: 'audit:1', label: 'Original payroll audit'}}); assert.equal(audit.row().activity, 'payroll-audit'); audit.dispose();
const tired = fixture({fatigue: .95}); assert(!tired.row().activity?.startsWith('pantry-')); tired.dispose();
console.log('PASS original Xu pantry lifecycle: royal stair routes, genuine shelf/desk time, conversation/death/court/needs priority, exact restore, stale-order rejection and bounded storage retry');
