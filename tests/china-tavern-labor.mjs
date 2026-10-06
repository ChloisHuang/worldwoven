// Regression boundaries for actual paid work: remote timers, interrupted poses,
// rejected saves and replay/reload must never create unearned or duplicate wages.
import assert from 'node:assert/strict';
import {createChinaTavernLabor} from '../source/game/china-tavern-labor.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
const clone = x => JSON.parse(JSON.stringify(x));
function setup(saved = {}) {
  const store = clone(saved), player = {walking: false, root: {position: {x: 22.35, y: .215, z: 6.7}, rotation: {y: 0}}};
  const host = {walking: false, root: {position: {x: 24.1, y: .215, z: 6.4}}, station: {npcPosition: [24.1, .215, 6.4]}};
  const flags = {busy: false, mounted: null, rejectLabor: false, rejectLedger: false, cleanup: false};
  const ledger = createCurrencyLedger({saved: store.ledger, saveState: next => { if (flags.rejectLedger) return false; store.ledger = next; }});
  const labor = createChinaTavernLabor({getPlayer: () => player, getMounted: () => flags.mounted, host, employment: {isHired: () => true, state: () => ({revision: 1})},
    isHostAvailable: () => !flags.busy, copperLedger: ledger, getClock: () => ({day: 7}), saved: store.labor, document: null,
    saveState: next => { if (flags.rejectLabor || flags.cleanup && next.job === null) return false; store.labor = next; }});
  const move = point => { Object.assign(player.root.position, {x: point[0], y: point[1], z: point[2]}); player.walking = false; };
  const tick = (n = 51) => { for (let i = 0; i < n; i++) labor.update(.1); };
  const clean = () => { move(labor.view().target.position); assert(labor.startCleaning()); tick(); };
  const finish = () => { assert(labor.accept()); clean(); clean(); assert.equal(labor.state().job.stage, 'ready'); };
  const home = () => move([22.35, .215, 6.7]);
  return {store, player, host, flags, ledger, labor, move, tick, clean, finish, home};
}

// Staff, floor, mounting, location and explicit work actions all matter.
const a = setup();
assert.equal(a.ledger.state().cash, 0);
a.flags.busy = true; assert.equal(a.labor.accept(), false); a.flags.busy = false;
a.host.root.position.x = 23; assert.equal(a.labor.accept(), false); a.host.root.position.x = 24.1;
a.move([22.35, 4.015, 6.7]); assert.equal(a.labor.accept(), false); a.home();
a.flags.mounted = {id: 'seat'}; assert.equal(a.labor.accept(), false); a.flags.mounted = null;
assert(a.labor.accept()); assert.equal(a.labor.claim(), false);
a.tick(200); assert.equal(a.labor.state().job.completedTables, 0, 'A distant elapsed timer cannot complete work');
assert.equal(a.labor.startCleaning(), false);
a.move(a.labor.view().target.position); a.tick(200); assert.equal(a.labor.state().job.completedTables, 0, 'Arrival requires explicit cleaning');
a.flags.mounted = {id: 'seat'}; assert.equal(a.labor.startCleaning(), false); a.flags.mounted = null;
const point = a.labor.view().target.position; a.move([point[0], 4.015, point[2]]); assert.equal(a.labor.startCleaning(), false); a.move(point);
assert(a.labor.startCleaning()); assert.equal(a.labor.playerAction(), 'tidy'); assert.deepEqual(a.labor.playerStation().playerWorkTarget, [18.825, 1.19, 16.2]);
a.tick(20); a.player.root.position.x += .03; a.labor.update(.1);
assert.equal(a.labor.state().cleaning, false); assert.equal(a.labor.state().progress, 0); assert.equal(a.labor.playerAction(), null);
a.tick(100); assert.equal(a.labor.state().job.completedTables, 0);
a.move(point); assert(a.labor.startCleaning()); a.labor.update(999); assert(a.labor.state().progress < .1, 'A background clock jump supplies no free completion');
a.player.walking = true; a.labor.update(.1); a.player.walking = false;
a.clean(); assert.equal(a.labor.state().job.completedTables, 1); assert.equal(a.labor.startCleaning(), false, 'Second table requires walking to it');
a.clean(); assert.equal(a.ledger.state().cash, 0, 'Completed labor is a receipt, not yet paid');
assert.equal(a.labor.claim(), false, 'Must return to the actual host'); a.home();
a.flags.busy = true; assert.equal(a.labor.claim(), false); a.flags.busy = false;
a.host.walking = true; assert.equal(a.labor.claim(), false); a.host.walking = false;
assert(a.labor.claim()); assert.equal(a.ledger.state().bank, 12); assert.equal(a.labor.claim(), false); assert.equal(a.ledger.state().bank, 12);
const firstId = a.ledger.history()[0].requestId;
a.finish(); a.home(); assert(a.labor.claim()); assert.equal(a.ledger.state().bank, 24); assert.notEqual(a.ledger.history()[1].requestId, firstId);

// Failed writes neither complete a table nor pay; retry remains possible.
const b = setup(); b.flags.rejectLabor = true; assert.equal(b.labor.accept(), false); assert.equal(b.labor.active(), false); b.flags.rejectLabor = false;
assert(b.labor.accept()); b.clean(); b.flags.rejectLabor = true; b.clean();
assert.equal(b.labor.state().job.stage, 'working'); assert.equal(b.labor.state().job.completedTables, 1); assert.equal(b.ledger.state().cash, 0);
b.home(); assert.equal(b.labor.claim(), false); b.flags.rejectLabor = false; b.clean(); b.home();
b.flags.rejectLedger = true; assert.equal(b.labor.claim(), false); assert.equal(b.ledger.state().cash, 0); assert.equal(b.labor.state().job.stage, 'ready'); b.flags.rejectLedger = false;
const unpaid = setup(b.store); assert.equal(unpaid.labor.state().job.stage, 'ready'); assert(unpaid.labor.claim()); assert.equal(unpaid.ledger.state().bank, 12);

// Ledger write succeeds but cleanup fails: a restored receipt is a safe replay.
const c = setup(); c.finish(); c.home(); c.flags.cleanup = true; assert(c.labor.claim());
assert.equal(c.ledger.state().bank, 12); assert.equal(c.store.labor.job.stage, 'ready');
const replay = setup(c.store); assert(replay.labor.claim()); assert.equal(replay.ledger.state().bank, 12); assert.equal(replay.ledger.history().length, 1); assert.equal(replay.labor.active(), false);

// Completed tables survive reload without pay; cancel preserves serial uniqueness.
const d = setup(); assert(d.labor.accept()); d.clean(); const id = d.labor.state().job.id;
const reset = setup(d.store); assert.equal(reset.labor.state().job.completedTables, 1); assert.equal(reset.labor.claim(), false); assert.equal(reset.ledger.state().cash, 0);
assert(reset.labor.cancel()); assert(reset.labor.accept()); assert.notEqual(reset.labor.state().job.id, id); assert.equal(reset.ledger.state().cash, 0);
reset.clean(); reset.clean(); assert.equal(reset.labor.cancel(), false, 'Completed unpaid work cannot accidentally discard the wage');
const detached = reset.labor.state(); detached.job.stage = 'working'; assert.equal(reset.labor.state().job.stage, 'ready');
const corrupt = setup({labor: {version: 1, serial: 1, job: {id: 'cn-tavern-labor-1', receiptId: 'other', stage: 'ready', completedTables: 2}}});
assert.equal(corrupt.labor.state().loadError, 'invalid-saved-state'); assert.equal(corrupt.labor.claim(), false); assert.equal(corrupt.labor.accept(), false);

// A new job never reuses an earlier serial even when other ledger activity has
// advanced independently; all save rejection forms keep acceptance uncommitted.
const advanced = setup(); assert(advanced.ledger.openAccount('open-before-labor').ok);
assert(advanced.labor.accept()); assert.equal(advanced.labor.state().serial, 2);
for (const saveState of [() => { throw Error('quota'); }, () => Promise.reject(Error('async'))]) {
  const f = setup();
  const rejected = createChinaTavernLabor({getPlayer: () => f.player, host: f.host, employment: {isHired: () => true, state: () => ({revision: 1})}, copperLedger: f.ledger, saveState, document: null});
  assert.equal(rejected.accept(), false); assert.equal(rejected.active(), false); assert.equal(rejected.state().serial, 0); assert.equal(f.ledger.state().cash, 0);
  await Promise.resolve();
}

console.log('PASS: actual tavern labor, physical/table/host gates, durable completion, atomic failures, cancellation and wage replay after reload');

// A matching physical checkpoint resumes only this table and this receipt.
const partial=setup();assert(partial.labor.accept());partial.move(partial.labor.state().target.position);assert(partial.labor.startCleaning());partial.tick(20);const checkpoint=partial.labor.snapshot(),continued=setup(partial.store);continued.move([checkpoint.origin.x,checkpoint.origin.y,checkpoint.origin.z]);assert(continued.labor.restore(checkpoint));assert(continued.labor.state().cleaning);continued.tick(31);assert.equal(continued.labor.state().job.completedTables,1);assert.equal(continued.ledger.state().bank,0);assert.equal(continued.labor.restore(checkpoint),false);

const moved=setup();assert(moved.labor.accept());moved.move(moved.labor.view().target.position);assert(moved.labor.startCleaning());moved.tick(20);const old=moved.labor.snapshot();old.origin.z+=1.9;const reapproach=setup(moved.store);reapproach.move([old.origin.x,old.origin.y,old.origin.z]);assert(reapproach.labor.restore(old));assert(!reapproach.labor.isCleaning(),'legacy table timer cannot finish at the old physical point');reapproach.tick(100);assert.equal(reapproach.labor.state().job.completedTables,0);console.log('PASS moved table requires a new physical approach without losing completed tables');
