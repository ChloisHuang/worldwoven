// Reproduce cross-country full-career copies without a 3D scene or device claim.
// Runtime intents, on-duty polling and the garden badge need only workState.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id, context, next) {
  return id === 'three' ? {url: new URL('../source/vendor/three/build/three.module.js', import.meta.url).href, shortCircuit: true} : next(id, context);
}});
const {createFormalCareers, FORMAL_CAREER_ROLES, GARDEN_ASSISTANT_ROLE: GARDEN} = await import('../source/game/formal-careers.js');
const {createFormalLaborContract} = await import('../source/game/formal-labor-contract.js');
const {createJapanServiceEmployment} = await import('../source/game/japan-service-employment.js');
const {createFranceTeaEmployment} = await import('../source/game/france-tea-employment.js');
const {createFranceGardenerLabor} = await import('../source/game/france-gardener-labor.js');
const {FRANCE_GARDENER: P} = await import('../source/game/france-gardener-place.js');
const {careerInterviewRoll} = await import('../source/game/career-applications.js');
const reports = [];
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.style = {}; this.open = false; this.hidden = false; this.textContent = ''; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  addEventListener() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
  remove() {}
}
const document = () => ({head: new Element('head'), body: new Element('body'), createElement: tag => new Element(tag)});
function setup(role, working) {
  const clock = {day: 1, hour: 8, seconds: 0}; let writes = 0, fullReads = 0, workReads = 0;
  const seed = createFormalCareers({getClock: () => clock, saveState() {}}).state();
  for (const [skill, level] of Object.entries(role.skillRequirements)) seed.skills[skill] = level;
  let worldSeed = 1;
  while (careerInterviewRoll(worldSeed, role.id, clock.day) >= .5) worldSeed++;
  const base = createFormalCareers({saved: seed, worldSeed, getClock: () => clock, saveState() { writes++; }});
  const receiptId = role.workSource + '-1';
  if (working) {
    assert(base.apply(role.id, {ageYears: 22}).ok);
    assert(base.reviewApplication(role.id, {ageYears: 22, applicationId: base.applicationResult(role.id).id}).ok);
    assert(base.beginDuty({receiptId, shiftKind: 'continuous'}).ok);
  }
  const careers = {...base, state() { fullReads++; return base.state(); }, workState() { workReads++; return base.workState(); }};
  const player = {ageYears: 22, walking: false, root: {position: {x: 0, y: 0, z: 0}, rotation: {y: 0}}};
  return {base, careers, clock, receiptId, player, getPlayer: () => player, getClock: () => clock,
    reset() { fullReads = workReads = 0; }, counts: () => ({fullReads, workReads, writes})};
}
function check(f, service, name) {
  const before = f.base.state(), writes = f.counts().writes;
  f.reset();
  for (let i = 0; i < 60; i++) { assert(service.intent()); service.update(0); }
  const {fullReads, workReads} = f.counts();
  reports.push({name, fullReads, workReads, steps: 60});
  assert.deepEqual(f.base.state(), before, name + ': read-only polling cannot change careers');
  assert.equal(f.counts().writes, writes, name + ': read-only polling cannot save');
  assert.deepEqual(service.formal.state(), before, name + ': explicit formal diagnostics remain complete');
}
const roles = FORMAL_CAREER_ROLES.filter(r => ['japan', 'egypt'].includes(r.country) || ['fr-tea-server', 'fr-tea-pastry'].includes(r.id));
for (const role of roles) for (const working of [false, true]) {
  const f = setup(role, working);
  const duty = {registry: [0, 0, 0], holdDuty() {}, held: () => false, requestMeeting() {}, meetingReady: () => true,
    dutyState: () => ({receiptId: working ? f.receiptId : null, status: working ? 'active' : 'inactive'}),
    workIntent: () => null, workLabel: () => 'Waiting', workReceipts: () => [], inWorkplace: () => true,
    dutyActive: () => true, dutyStep: () => null, claimDuty() {}, hasWorkReceiptAfter: () => false};
  const job = working ? {receiptId: f.receiptId, formalRoleId: role.id, day: 1, stage: 'working', shiftKind: 'continuous', coveredSeconds: 0, completedTasks: 0, reviewIds: [], completedThrough: 0} : null;
  const options = {...f, role, saved: {version: 1, serial: working ? 1 : 0, job}};
  const service = role.country === 'france' ? createFranceTeaEmployment({...options, tea: duty}) : createJapanServiceEmployment({...options, duty, provider: role.id, text: {actions: {'formal-view': 'View job'}}});
  check(f, service, role.id + (working ? ':working' : ':idle'));
  // An interruption is immediately seen by the shared duty reader, without a
  // stale projection cache. The persistent full state remains unchanged by reads.
  if (!working) {
    const old = service.intent();
    assert(f.base.apply(role.id, {ageYears: 22}).ok);
    assert.equal(service.resolveIntent(old), null, role.id + ': changed career revision invalidates old intentions');
  }
  if (working) {
    assert(f.base.interruptDuty('cancelled').ok);
    f.reset();
    assert.equal(service.formal.canWork(job), false);
    assert.equal(service.formal.duty(job).stage, 'missed');
    reports.push({name: role.id + ':fresh-interruption', ...f.counts(), steps: 2});
  }
}
for (const continuous of [false, true]) {
  const f = setup(GARDEN, continuous), doc = document();
  Object.assign(f.player.root.position, {x: P.registration[0], y: P.registration[1], z: P.registration[2]});
  const gardener = {loanState: () => ({owner: null, borrowed: false}), hostReady: () => true, requestMeeting: () => true, releaseMeeting() {}};
  if (continuous) Object.assign(gardener, {maintenanceState: () => ({lease: null, loadError: null}), setDutyOwner() {}, workReceipts: () => [], taskChoices: () => []});
  const job = continuous ? {id: f.receiptId, receiptId: f.receiptId, formalRoleId: GARDEN.id, day: 1, stage: 'working', shiftKind: 'continuous', coveredSeconds: 0, completedTasks: 0, completedIds: [], closing: null} : null;
  const service = createFranceGardenerLabor({...f, gardener, copperLedger: {loadError: null}, document: doc,
    employment: {isHired: () => false, state: () => ({revision: 0})}, saveState() { throw Error('read-only check'); },
    saved: continuous ? {version: 3, serial: 1, job} : null});
  check(f, service, continuous ? 'fr-garden:continuous-closed-ui' : 'fr-garden:legacy-closed-ui');
  // The badge and menu availability remain live while the panel is closed.
  const badge = doc.body.children.find(e => e.tag === 'button');
  assert.equal(badge.hidden, false); assert.equal(service.menuContext().available, true);
  f.player.root.position.x = 100; service.update(0);
  assert.equal(badge.hidden, true); assert.equal(service.menuContext().available, false);
  assert.deepEqual(service.state().formalState, f.base.state());
  assert.deepEqual(service.view().formalState, f.base.state());
  if (service.displayState) {
    const view = service.displayState();
    assert.deepEqual(view.formalState, f.base.workState());
    view.formalState.skills.gardening = 999;
    assert.notEqual(f.base.workState().skills.gardening, 999);
  }
}
// Existing state-only clients and explicit injected work readers keep working.
const legacy = {state: () => ({revision: 12, lastDuty: {roleId: GARDEN.id, workReceiptId: 'a', stage: 'working'}})};
const bridge = createFormalLaborContract({careers: legacy, role: GARDEN});
assert.equal(bridge.workState().revision, 12);
const override = createFormalLaborContract({careers: legacy, role: GARDEN, workState: () => ({revision: 13})});
assert.equal(override.workState().revision, 13); assert.equal(override.state().revision, 12);
console.log(JSON.stringify(reports));
assert(reports.every(row => row.fullReads === 0), 'runtime regional work polling must not copy complete career histories');
console.log('PASS regional job intents, active work and closed garden badges use fresh work projections; full diagnostics and state-only adapters remain compatible');
