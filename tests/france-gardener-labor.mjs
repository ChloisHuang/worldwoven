// Real actor/tool ownership plus saved receipts: guard unpaid/duplicate wages,
// stale interactions and resumed jobs without loading an entire country scene.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import {createGameStorage, PREVIEW_STORAGE_PREFIX} from '../source/game/game-storage.js';
registerHooks({resolve(id, context, next) {
  return id === 'three' ? {url: pathToFileURL(process.cwd() + '/source/vendor/three/build/three.module.js').href, shortCircuit: true} : next(id, context);
}});
const T = await import('three');
const {createFranceGardener} = await import('../source/game/france-gardener.js');
const {createFranceGardenerEmployment, GARDEN_HELPER_ROLE} = await import('../source/game/france-gardener-employment.js');
const {createFranceGardenerLabor} = await import('../source/game/france-gardener-labor.js');
const {createCurrencyLedger} = await import('../source/game/currency-ledger.js');
const {FRANCE_GARDENER: P} = await import('../source/game/france-gardener-place.js');
const copy = value => JSON.parse(JSON.stringify(value));
function fixture(t, saved = {}) {
  const store = copy(saved), group = new T.Group(), flags = {visible: true, mounted: null, blocked: false, rejectEmployment: false, rejectLabor: false, rejectLedger: false, rejectCleanup: false};
  function person(point) {
    const root = new T.Group(), hands = [new T.Object3D(), new T.Object3D()];
    hands[0].position.set(-.16, 1.04, .27); hands[1].position.set(.19, 1.05, .37);
    root.add(...hands); root.userData.hands = hands; root.position.set(...point); group.add(root);
    return {root, route: [], characterScale: 1, walking: false, locomotion: {walkSpeed: 2}, animate() {}};
  }
  const player = person(P.registration), actor = person(P.approach); actor.station = {id: P.id, npcAction: 'garden'};
  const notices = [], requests = []; let clock = 0, labor;
  const save = (key, rejected) => next => { if (rejected()) return false; store[key] = copy(next); };
  const ledger = createCurrencyLedger({saved: store.ledger, saveState: save('ledger', () => flags.rejectLedger)});
  const gardener = createFranceGardener({npcs: [actor], lot: {group, walkableSurfaces: []},
    doors: {routeStep(route, p) { if (flags.blocked) return {waiting: true}; while (route[0] && p.distanceTo(route[0]) < .035) route.shift(); return {waypoint: route[0]}; }},
    planPath: (_a, b) => [new T.Vector3(b.x, b.y, b.z)],
    moveActor: (n, x, z) => { n.root.position.x += x; n.root.position.z += z; },
    poseContext: n => n.poseContext ??= {}, getPlayer: () => player, getBorrowedPose: () => labor?.toolPose(), worldSeed: 1});
  const employment = createFranceGardenerEmployment({saved: store.employment,
    getJob: () => labor?.state().job, meetHost: () => labor.meetHost(),
    saveState: save('employment', () => flags.rejectEmployment), notify: message => notices.push(message)});
  labor = createFranceGardenerLabor({gardener, employment, getPlayer: () => player, getMounted: () => flags.mounted,
    copperLedger: ledger, getClock: () => ({day: 7}), saved: store.labor, saveState: next => {
      if (flags.rejectLabor || flags.rejectCleanup && next.job === null) return false;
      store.labor = copy(next);
    }, canSee: () => flags.visible, onIntent: choice => requests.push(choice), notify: message => notices.push(message), document: null});
  const tick = (count = 1) => { for (let i = 0; i < count; i++) { clock += .1; labor.update(.1); gardener.update(.1, clock); } };
  const until = predicate => { for (let i = 0; i < 1000 && !predicate(); i++) tick(); assert(predicate(), JSON.stringify({labor: labor.state(), gardener: gardener.state()})); };
  const move = point => { player.root.position.set(...point); player.walking = false; };
  const execute = kind => { const selected = labor.intent(kind); assert(selected, `Expected ${kind} intent`); move(selected.position); assert(labor.executeIntent(selected), `Expected ${kind} execution`); return selected; };
  const visit = kind => { const selected = execute(kind); until(() => !labor.state().waitingForHost); return selected; };
  const act = kind => { const selected = execute(kind); tick(kind === 'water' ? 51 : 15); return selected; };
  const hire = () => { visit('apply'); assert(employment.isHired()); };
  const accept = () => { visit('accept'); assert(labor.active()); };
  const finish = () => { if (!employment.isHired()) hire(); accept(); act('take'); assert(labor.held()); act('water'); act('water'); act('return'); assert.equal(labor.state().job.stage, 'ready'); };
  t.after(() => { labor.dispose(); gardener.dispose(); });
  return {store, flags, group, player, actor, notices, requests, ledger, gardener, labor, employment, tick, until, move, execute, visit, act, hire, accept, finish};
}

await test('application has physical eligibility, cancellable meetings and stale-intent protection', t => {
  const f = fixture(t), {labor, employment, flags} = f;
  assert.equal(labor.accept(), false); assert.equal(labor.state().lastError, 'not-employed');
  const first = labor.intent('apply');
  f.move([0, 0, 0]); assert.equal(labor.executeIntent(first), false, 'Manual activation cannot remotely register');
  f.move([first.position[0], 4, first.position[2]]); assert.equal(labor.executeIntent(first), false, 'Different floor');
  f.move(first.position); flags.visible = false; assert.equal(labor.executeIntent(first), false); flags.visible = true;
  flags.mounted = {}; assert.equal(labor.executeIntent(first), false); flags.mounted = null;
  flags.blocked = true; f.execute('apply'); f.tick(20); assert(labor.state().waitingForHost); assert(!employment.isHired());
  f.move([0, 0, 0]); f.tick(); assert(!labor.state().waitingForHost); assert.equal(f.gardener.state().loan.meeting, false);
  flags.blocked = false; f.tick(30); assert(!employment.isHired(), 'Leaving cancels the pending application');
  f.execute('apply'); labor.stopActivity(); f.tick(30); assert(!employment.isHired(), 'Explicit cancellation releases a pending meeting');
  flags.rejectEmployment = true; f.visit('apply'); assert(!employment.isHired()); assert.equal(employment.state().revision, 0);
  flags.rejectEmployment = false; f.hire(); assert.equal(f.store.employment.roleId, GARDEN_HELPER_ROLE);
  assert.equal(labor.resolveIntent(first), null); assert.equal(labor.executeIntent(first), false);
  assert.equal(employment.apply(), false); assert.equal(employment.state().revision, 1); assert.equal(f.ledger.state().cash, 0);
  const loaded = fixture(t, f.store); assert(loaded.employment.isHired()); loaded.visit('resign'); assert(!loaded.employment.isHired());
  assert.equal(loaded.labor.accept(), false); loaded.hire(); assert.equal(loaded.employment.state().revision, 3);
});

await test('watering requires original can, explicit arrival, visibility and five uninterrupted seconds', t => {
  const f = fixture(t); f.hire(); f.accept(); const jobId = f.labor.state().job.id;
  assert.equal(f.gardener.loanState().owner, jobId); assert.equal(f.gardener.reserveTools('other-job'), false);
  assert.equal(f.gardener.takeCan('other-job'), false); assert.equal(f.labor.intent('water'), null);
  f.tick(100); assert.equal(f.labor.state().job.completedBeds, 0); assert.equal(f.ledger.state().cash, 0);
  const take = f.labor.intent('take'); assert.equal(f.labor.executeIntent(take), false, 'Registry is too far from the rack');
  f.act('take'); assert(f.labor.held()); assert.equal(f.gardener.loanState().toolHolder, 'player');
  assert.equal(f.gardener.request(), false); assert.equal(f.gardener.returnCan('other-job'), false);
  assert.equal(f.labor.resolveIntent(take), null); assert.equal(f.gardener.state().tool, null);
  const first = f.labor.intent('water'); f.move(first.position); f.tick(60); assert.equal(f.labor.state().job.completedBeds, 0, 'Arrival alone cannot water');
  f.move([first.position[0], 3, first.position[2]]); assert.equal(f.labor.executeIntent(first), false); f.move(first.position);
  f.flags.visible = false; assert.equal(f.labor.executeIntent(first), false); f.flags.visible = true;
  f.flags.mounted = {}; assert.equal(f.labor.executeIntent(first), false); f.flags.mounted = null;
  f.execute('water'); f.tick(20); assert.equal(f.labor.state().activity, 'water'); assert(f.gardener.state().props.waterVisible);
  f.player.root.position.x += .03; f.tick(); assert.equal(f.labor.state().activity, null); assert.equal(f.labor.state().progress, 0); assert.equal(f.gardener.state().props.waterVisible, false);
  f.tick(70); assert.equal(f.labor.state().job.completedBeds, 0); assert(f.labor.held());
  f.execute('water'); f.labor.update(999); assert(f.labor.state().progress < .1, 'Clock jumps cannot complete a bed');
  f.player.walking = true; f.tick(); assert.equal(f.labor.state().activity, null); f.player.walking = false;
  f.execute('water'); f.tick(15); f.flags.visible = false; f.tick(); assert.equal(f.labor.state().activity, null); f.flags.visible = true;
  f.act('water'); assert.equal(f.labor.state().job.completedBeds, 1); assert.equal(f.labor.resolveIntent(first), null);
  assert.equal(f.labor.executeIntent(f.labor.intent('water')), false, 'Second bed requires a second arrival'); assert.equal(f.ledger.state().cash, 0);
});

await test('unpaid work blocks resignation and pays exactly once per job', t => {
  const f = fixture(t); f.hire(); f.accept(); const working = copy(f.store.labor);
  assert.equal(f.employment.resign(), false); assert.deepEqual(f.store.labor, working);
  f.act('take'); f.act('water'); f.act('water'); assert.equal(f.labor.state().job.stage, 'working');
  assert.equal(f.labor.claim(), false); assert.equal(f.labor.cancel(), false); assert.equal(f.ledger.state().cash, 0);
  f.act('return'); const ready = copy(f.store.labor); assert.equal(ready.job.stage, 'ready');
  assert.equal(f.gardener.loanState().owner, null); assert.equal(f.gardener.loanState().toolHolder, 'rack');
  assert.equal(f.employment.resign(), false); assert.deepEqual(f.store.labor, ready); assert.equal(f.labor.claim(), false, 'Must return to registry');
  const claim = f.visit('claim'); assert.equal(f.ledger.state().bank, 6); assert.equal(f.ledger.history().length, 1);
  assert.equal(f.labor.resolveIntent(claim), null); assert.equal(f.labor.claim(), false); assert.equal(f.ledger.state().bank, 6);
  const firstId = f.ledger.history()[0].requestId;
  f.finish(); f.visit('claim'); assert.equal(f.ledger.state().bank, 12); assert.notEqual(f.ledger.history()[1].requestId, firstId);
  f.flags.rejectEmployment = true; f.visit('resign'); assert(f.employment.isHired());
  f.flags.rejectEmployment = false; f.visit('resign'); assert(!f.employment.isHired()); assert.equal(f.ledger.state().bank, 12);
});

await test('failed writes preserve progress and the can until successful return; unpaid reload remains collectible', t => {
  const f = fixture(t); f.hire(); f.flags.rejectLabor = true; f.visit('accept');
  assert.equal(f.labor.active(), false); assert.equal(f.gardener.loanState().owner, null); f.flags.rejectLabor = false;
  f.accept(); f.act('take'); f.act('water'); f.flags.rejectLabor = true; f.act('water');
  assert.equal(f.labor.state().job.completedBeds, 1); assert.equal(f.ledger.state().cash, 0); f.flags.rejectLabor = false;
  f.act('water'); f.flags.rejectLabor = true; f.act('return');
  assert(f.labor.held()); assert.equal(f.labor.state().job.stage, 'working'); assert.equal(f.gardener.loanState().toolHolder, 'player');
  f.flags.rejectLabor = false; f.act('return'); assert(!f.labor.held()); assert.equal(f.labor.state().job.stage, 'ready');
  f.flags.rejectLedger = true; f.visit('claim'); assert.equal(f.ledger.state().cash, 0); assert.equal(f.labor.state().job.stage, 'ready');
  const loaded = fixture(t, f.store); assert.equal(loaded.labor.state().job.stage, 'ready'); loaded.visit('claim'); assert.equal(loaded.ledger.state().bank, 6);
});

await test('ledger success followed by cleanup failure replays safely after reload', t => {
  const f = fixture(t); f.finish(); f.flags.rejectCleanup = true; f.visit('claim');
  assert.equal(f.ledger.state().bank, 6); assert.equal(f.store.labor.job.stage, 'ready'); assert.equal(f.ledger.history().length, 1);
  const loaded = fixture(t, f.store); loaded.visit('claim'); assert.equal(loaded.ledger.state().bank, 6);
  assert.equal(loaded.ledger.history().length, 1); assert.equal(loaded.labor.active(), false); assert.equal(loaded.labor.claim(), false);
});

await test('incomplete voluntary return keeps completed beds and permits taking the same can again', t => {
  const f = fixture(t); f.hire(); f.accept(); f.act('take'); f.act('water');
  f.act('return'); assert.equal(f.labor.held(), false, 'Returning early must run at rack, not next bed');
  assert.equal(f.labor.state().job.completedBeds, 1); assert.equal(f.labor.state().job.stage, 'working'); assert.equal(f.ledger.state().cash, 0);
  f.act('take'); assert(f.labor.held()); f.act('water'); f.act('return'); f.visit('claim'); assert.equal(f.ledger.state().bank, 6);
});

await test('reload keeps beds and exclusive can ownership; cancellation requires physical return', t => {
  const f = fixture(t); f.hire(); f.accept(); f.act('take'); f.act('water'); const priorId = f.labor.state().job.id;
  const loaded = fixture(t, f.store); assert.equal(loaded.labor.state().job.completedBeds, 1); assert.equal(loaded.labor.held(), false);
  loaded.tick(30); assert.equal(loaded.gardener.state().tool, null, 'Gardener cannot acquire can reserved for restored player work');
  assert.equal(loaded.gardener.loanState().owner, priorId); loaded.act('take'); assert(loaded.labor.held());
  assert(loaded.labor.cancel()); assert(loaded.labor.state().job.cancelled); assert(loaded.labor.held()); assert.equal(loaded.requests.at(-1).kind, 'return');
  assert.equal(loaded.labor.intent('water'), null); loaded.act('return'); assert.equal(loaded.labor.active(), false);
  assert.equal(loaded.gardener.loanState().owner, null); assert.equal(loaded.ledger.state().cash, 0);
  loaded.accept(); assert.notEqual(loaded.labor.state().job.id, priorId); assert(loaded.labor.cancel()); assert.equal(loaded.labor.active(), false);
});

await test('invalid saves lock mutations without creating wages', t => {
  const invalidEmployment = fixture(t, {employment: {version: 1, roleId: 'unknown', revision: 1}});
  assert.equal(invalidEmployment.employment.state().loadError, 'invalid-employment-state');
  assert.equal(invalidEmployment.labor.intent('apply'), null); assert.equal(invalidEmployment.labor.accept(), false);
  const invalidJob = fixture(t, {labor: {version: 1, serial: 1, job: {id: 'fr-garden-labor-1', receiptId: 'other', stage: 'ready', completedBeds: 2, cancelled: false}}});
  assert.equal(invalidJob.labor.state().loadError, 'invalid-saved-state'); assert.equal(invalidJob.labor.claim(), false); assert.equal(invalidJob.labor.accept(), false);
  assert.equal(invalidJob.ledger.state().cash, 0);
});

await test('actual main save callbacks isolate preview and preserve China/appearance on rejected storage', () => {
  const main = fs.readFileSync(new URL('../source/game/main.js', import.meta.url), 'utf8');
  const original = {appearance: {seed: 42, npcShapeVersion: 3},
    chinaEmployment: {version: 1, roleId: 'cn-tavern-helper', revision: 2},
    chinaLabor: {version: 1, serial: 4, job: {id: 'cn-tavern-labor-4', receiptId: 'cn-tavern-labor-4', stage: 'ready', completedTables: 2}},
    copperLedger: createCurrencyLedger().state()};
  const key = 'worlds-days-v1', formal = new Map([[key, JSON.stringify(original)]]), session = new Map();
  const normal = {getItem: k => formal.get(k) ?? null, setItem: (k, value) => formal.set(k, value)};
  const isolated = {getItem: k => session.get(k) ?? null, setItem: (k, value) => session.set(k, value)};
  const storage = createGameStorage({preview: true, normal, session: isolated});
  const saved = JSON.parse(storage.getItem(key)), formalBefore = formal.get(key);
  const extract = (factory, field) => {
    const line = main.split('\n').find(line => line.includes(`${factory}({`));
    assert(line, `Missing main ${factory} wiring`);
    const start = line.indexOf('saveState:') + 'saveState:'.length;
    const tail = `saved.${field}=state;}`, end = line.indexOf(tail, start);
    assert(start >= 'saveState:'.length && end > start, `Missing ${field} save callback`);
    return new Function('saved', 'gameStorage', `return ${line.slice(start, end + tail.length)}`)(saved, storage);
  };
  const registrationSave = extract('createFranceGardenerEmployment', 'franceEmployment');
  const laborSave = extract('createFranceGardenerLabor', 'franceLabor');
  const employment = createFranceGardenerEmployment({meetHost: () => true, saveState: registrationSave});
  assert(employment.apply());
  const job = {version: 1, serial: 1, job: {id: 'fr-garden-labor-1', receiptId: 'fr-garden-labor-1', stage: 'ready', completedBeds: 2, cancelled: false}};
  laborSave(job);
  const durable = session.get(PREVIEW_STORAGE_PREFIX + key), preview = JSON.parse(durable);
  assert.equal(formal.get(key), formalBefore, 'Both French callbacks leave formal storage byte-for-byte unchanged');
  assert.equal(session.size, 1); assert.equal(preview.franceEmployment.roleId, GARDEN_HELPER_ROLE);
  assert.deepEqual(preview.franceLabor, job);
  for (const field of ['appearance', 'chinaEmployment', 'chinaLabor', 'copperLedger']) {
    assert.deepEqual(preview[field], original[field], `${field} is preserved in preview`);
    assert.deepEqual(saved[field], original[field], `${field} is preserved in memory`);
  }
  const memoryBefore = copy(saved);
  isolated.setItem = () => { throw Error('quota'); };
  assert.equal(employment.resign(), false); assert(employment.isHired());
  assert.throws(() => laborSave({...job, job: null}), /quota/);
  assert.deepEqual(saved, memoryBefore, 'Rejected writes do not mutate the live saved object');
  assert.equal(session.get(PREVIEW_STORAGE_PREFIX + key), durable);
  assert.equal(formal.get(key), formalBefore, 'A preview failure never falls back to formal storage');
});
