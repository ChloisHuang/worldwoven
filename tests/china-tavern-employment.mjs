// Real failure boundaries: registration must not erase an old wage, and failed
// storage cannot grant/remove a role or admit new work.
import assert from 'node:assert/strict';
import {createChinaTavernEmployment, TAVERN_HELPER_ROLE} from '../source/game/china-tavern-employment.js';
import {createChinaTavernLabor} from '../source/game/china-tavern-labor.js';
import {createCopperLedger} from '../source/game/copper-ledger.js';
const clone = x => JSON.parse(JSON.stringify(x));
function setup(saved = {}) {
  const store = clone(saved), flags = {reject: false, busy: false};
  const player = {walking: false, root: {position: {x: 22.35, y: .215, z: 11.7}, rotation: {y: 0}}};
  const host = {walking: false, root: {position: {x: 24.1, y: .215, z: 11.4}}};
  const ledger = createCopperLedger({saved: store.ledger, saveState: state => { store.ledger = state; }});
  let labor;
  const employment = createChinaTavernEmployment({saved: store.employment, getJob: () => labor?.state().job,
    meetHost: () => labor.meetHost(), saveState: state => { if (flags.reject) return false; store.employment = state; }});
  labor = createChinaTavernLabor({getPlayer: () => player, host, employment, isHostAvailable: () => !flags.busy,
    saved: store.labor, saveState: state => { store.labor = state; }, copperLedger: ledger, document: null});
  const move = p => Object.assign(player.root.position, {x: p[0], y: p[1], z: p[2]});
  const clean = () => { move(labor.view().target.position); assert(labor.startCleaning()); for (let i = 0; i < 51; i++) labor.update(.1); };
  const home = () => move([22.35, .215, 11.7]);
  return {store, flags, player, employment, labor, ledger, clean, home};
}
const a = setup(); assert(!a.employment.isHired()); assert(!a.labor.accept());
assert.equal(a.labor.state().lastError, 'not-employed'); assert.equal(a.ledger.state().cash, 0);
a.flags.busy = true; assert(!a.employment.apply()); a.flags.busy = false;
a.player.root.position.y = 4.015; assert(!a.employment.apply()); a.home();
a.flags.reject = true; assert(!a.employment.apply()); assert(!a.employment.isHired()); a.flags.reject = false;
assert(a.employment.apply()); assert.equal(a.store.employment.roleId, TAVERN_HELPER_ROLE);
assert(!a.employment.apply()); assert.equal(a.store.employment.revision, 1); assert.equal(a.ledger.state().cash, 0);
assert(a.labor.accept()); const working = clone(a.store.labor);
assert(!a.employment.resign()); assert.deepEqual(a.store.labor, working);
a.clean(); a.clean(); a.home(); const ready = clone(a.store.labor);
assert(!a.employment.resign()); assert.deepEqual(a.store.labor, ready); assert.equal(a.ledger.state().cash, 0);
assert(a.labor.claim()); assert.equal(a.ledger.state().cash, 12);
a.flags.reject = true; assert(!a.employment.resign()); assert(a.employment.isHired()); a.flags.reject = false;
assert(a.employment.resign()); assert(!a.labor.accept()); assert(a.employment.apply());
const reloaded = setup(a.store); assert(reloaded.employment.isHired()); assert.equal(reloaded.ledger.state().cash, 12);
assert(!reloaded.labor.claim()); assert(reloaded.labor.accept()); assert(reloaded.labor.cancel()); assert(reloaded.employment.resign());
// Both pre-registration stages remain valid and collectible. No retrospective
// role grant is needed; only the NEXT contract requires an application.
for (const stage of ['working', 'ready']) {
  const legacy = setup({labor: {version: 1, serial: 1, job: {id: 'cn-tavern-labor-1', receiptId: 'cn-tavern-labor-1', stage, completedTables: stage === 'ready' ? 2 : 1}}});
  assert(!legacy.employment.isHired()); assert(!legacy.employment.apply());
  if (stage === 'working') { assert.equal(legacy.labor.state().job.completedTables, 0); legacy.clean(); legacy.clean(); legacy.home(); }
  assert(legacy.labor.claim()); assert.equal(legacy.ledger.state().cash, 12); assert(!legacy.labor.claim());
  assert(!legacy.labor.accept()); assert(legacy.employment.apply()); assert(legacy.labor.accept());
  assert.equal(legacy.labor.state().serial, 2);
}
for (const saveState of [() => { throw Error('quota'); }, () => Promise.reject(Error('unsupported'))]) {
  const rejected = createChinaTavernEmployment({saveState, meetHost: () => true});
  assert(!rejected.apply()); assert(!rejected.isHired()); assert.equal(rejected.state().revision, 0); await Promise.resolve();
}
const corrupt = setup({employment: {version: 1, roleId: 'future-role', revision: 1}});
assert.equal(corrupt.employment.state().loadError, 'invalid-employment-state'); assert(!corrupt.employment.apply()); assert(!corrupt.labor.accept());
console.log('PASS: application/reapplication, host gating, failed saves, working/ready legacy contracts and unchanged wages');
