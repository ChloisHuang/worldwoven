import assert from 'node:assert/strict';
import {createNPCDutyAccount, npcMealSourceSplit} from '../source/game/npc-duty-account.js';
import {ROYAL_KITCHEN_ROLE as role} from '../source/game/china-royal-kitchen-role.js';
import {GAME_MINUTES_PER_SECOND as RATE} from '../source/game/simulation-clock.js';

// Attendance, replay and meal atomicity are shared save/economy boundaries: these
// cases reproduce offline pay, double credits, wrong-person debits and save loss.
const namespace = 'chinaRoyalKitchenAccounts', actorId = role.incumbentId;
const clone = structuredClone;
const coverage = (actor = actorId, revision = 0, definition = role) => [{actorId: actor, roleId: definition.id, slotId: definition.slotId, holderRevision: revision}];
const secondsAt = (day, hour) => (day * 1440 + hour * 60 - 600) / RATE;
function store() {
 let persisted, fail = false, writes = 0;
 return {
  get persisted() { return persisted; }, get writes() { return writes; },
  set fail(value) { fail = value; },
  saveState(snapshot, _record, patch = {}) { writes++; if (fail) return false; persisted = {...clone(patch), [namespace]: clone(snapshot)}; return true; },
 };
}
const create = (options = {}) => createNPCDutyAccount({role, namespace, saveState: () => true, ...options});
function observeRange(account, day, from, to, covered = coverage()) {
 let seconds = secondsAt(day, from), end = secondsAt(day, to);
 account.observe({seconds, dt: .25, coverage: covered});
 while (seconds < end) {
  const dt = Math.min(.25, end - seconds), next = Math.min(end, seconds + dt);
  account.observe({seconds: next, dt, coverage: covered}); seconds = next;
 }
}
const totalHours = account => account.snapshot().rows.reduce((total, row) => total + row.segments.reduce((hours, segment) => hours + segment.endHour - segment.startHour, 0), 0);

const storage = store(), account = create({saveState: storage.saveState});
assert.deepEqual(account.account(actorId), {bank: 0, cash: 0});
assert.equal(account.hasIncome(actorId), false);
assert.equal(account.prepareMealPayment({actorId, orderId: 'cn-tavern-order-1', amount: 6}).code, 'insufficient-npc-funds');
assert.equal(storage.writes, 0);
observeRange(account, 1, 6, 18);
assert.equal(storage.writes, 0, 'frames accumulate in memory; caller checkpoints at low frequency');
assert.equal(totalHours(account), 12);
assert.equal(account.snapshot().rows[0].segments.length, 1);
assert(account.checkpoint({day: 1, hour: 17.999}));
assert.equal(account.account(actorId).bank, 0, 'no early wages');
assert(account.checkpoint({day: 1, hour: 18}));
assert.deepEqual(account.account(actorId), {bank: 32, cash: 0});
assert.equal(account.hasIncome(actorId), true);
assert.equal(account.snapshot().rows.length, 0);
assert.equal(account.snapshot().receipts[0].evidence.segments[0].holderRevision, 0);
const paid = account.snapshot(), paidWrites = storage.writes;
assert(account.checkpoint({day: 1, hour: 18}));
assert(account.checkpoint({day: 9, hour: 18}));
assert.equal(storage.writes, paidWrites);
assert.deepEqual(account.snapshot(), paid, 'closed person/day/role is idempotent');
observeRange(account, 1, 6, 18);
assert.deepEqual(account.snapshot(), paid, 'replaying a settled clock interval cannot pay twice');

const partial = create();
observeRange(partial, 0, 10, 18);
assert(partial.checkpoint({day: 0, hour: 18}));
assert.equal(partial.account(actorId).bank, 21, 'fresh world begins day 0 at 10:00; 8/12 of 32 floors to 21');
assert.equal(partial.snapshot().receipts[0].evidence.segments[0].startHour, 10);

const interruptedStore = store(), interrupted = create({saveState: interruptedStore.saveState});
observeRange(interrupted, 0, 10, 11);
assert(interrupted.checkpoint({day: 0, hour: 11}));
const checkpoint = interrupted.snapshot();
assert.equal(Object.hasOwn(checkpoint, 'anchor'), false);
const restored = create({saved: interruptedStore.persisted[namespace], saveState: interruptedStore.saveState});
assert.equal(restored.loadError, null);
restored.observe({seconds: secondsAt(0, 15), dt: .25, coverage: coverage()});
assert.deepEqual(restored.snapshot(), checkpoint, 'reload does not recreate 11–15 duty');
restored.suspend();
restored.observe({seconds: secondsAt(0, 16), dt: .25, coverage: coverage()});
assert.deepEqual(restored.snapshot(), checkpoint, 'suspend/resume establishes a new anchor');
restored.observe({seconds: secondsAt(0, 17), dt: .25, coverage: coverage()});
assert.deepEqual(restored.snapshot(), checkpoint, 'clock jump is not observed work');
restored.observe({seconds: secondsAt(0, 17) + 1, dt: 1, coverage: coverage()});
assert.deepEqual(restored.snapshot(), checkpoint, 'oversized loaded sample is rejected');
assert(restored.checkpoint({day: 0, hour: 18}));
assert.equal(restored.account(actorId).bank, 2, 'only the actual 10–11 hour is paid');

const changed = create();
let time = secondsAt(1, 6);
const tick = (covered, dt = .25) => { time += dt; changed.observe({seconds: time, dt, coverage: covered}); };
changed.observe({seconds: time, dt: .25, coverage: coverage()});
tick(coverage());
tick([{...coverage()[0], alive: false}]);
tick(coverage());
tick(coverage());
tick(coverage(actorId, 1));
tick(coverage(actorId, 1));
tick([]);
tick(coverage('cn-successor', 2));
tick(coverage('cn-successor', 2));
const changedRows = changed.snapshot().rows;
assert.equal(changedRows.length, 2);
assert.deepEqual(changedRows[0].segments.map(segment => segment.holderRevision), [0, 0, 1]);
assert.equal(changedRows[1].actorId, 'cn-successor');
assert(Math.abs(totalHours(changed) - 4 * .25 * RATE / 60) < 1e-10, 'only matching living actor/role/slot/revision at both ends counts');
assert(changed.checkpoint({day: 1, hour: 18}));
assert.equal(changed.account(actorId).bank, 0, 'short attendance may floor to zero, never a wage advance');
assert.equal(changed.hasIncome(actorId), false);

const ambiguous = create();
const duplicate = [...coverage(), ...coverage('cn-other')];
ambiguous.observe({seconds: 0, dt: .25, coverage: duplicate});
ambiguous.observe({seconds: .25, dt: .25, coverage: duplicate});
assert.equal(ambiguous.snapshot().rows.length, 0, 'two people cannot earn the same occupied slot');
const otherRole = {...role, id: 'cn-other-duty', slotId: 'cn-other-duty-1'};
const sharedPerson = create({roles: [role, otherRole]});
const twoJobs = [...coverage(), ...coverage(actorId, 0, otherRole)];
sharedPerson.observe({seconds: 0, dt: .25, coverage: twoJobs});
sharedPerson.observe({seconds: .25, dt: .25, coverage: twoJobs});
assert.equal(sharedPerson.snapshot().rows.length, 0, 'one physical person cannot simultaneously earn two jobs');

const failureStore = store(), retry = create({saveState: failureStore.saveState});
observeRange(retry, 1, 6, 18);
const beforeFailure = retry.snapshot();
failureStore.fail = true;
assert.equal(retry.checkpoint({day: 1, hour: 18}), false);
assert.equal(retry.lastError, 'save-failed');
assert.deepEqual(retry.snapshot(), beforeFailure);
assert.equal(retry.account(actorId).bank, 0);
failureStore.fail = false;
assert(retry.checkpoint({day: 1, hour: 18}));
assert.equal(retry.account(actorId).bank, 32);
assert(retry.checkpoint({day: 1, hour: 18}));
const reread = create({saved: failureStore.persisted[namespace]});
assert.equal(reread.loadError, null);
assert.equal(reread.account(actorId).bank, 32);
assert(reread.checkpoint({day: 9, hour: 18}));
assert.equal(reread.snapshot().receipts.length, 1);
for (const saveState of [() => { throw Error('unavailable'); }, () => ({ok: false}), () => Promise.resolve(true)]) {
 const rejected = create({saved: beforeFailure, saveState});
 assert.equal(rejected.checkpoint({day: 1, hour: 18}), false);
 assert.deepEqual(rejected.snapshot(), beforeFailure);
}

// Historical evidence and balances must replay exactly, not trust saved totals.
for (const mutate of [
 value => { value.accounts[actorId].bank++; },
 value => { value.accounts[actorId].cash++; },
 value => { value.receipts[0].amount++; },
 value => { value.receipts.push(clone(value.receipts[0])); },
 value => { value.rows.push({...clone(value.receipts[0].evidence), closed: false}); },
 value => { value.receipts[0].evidence.segments[0].holderRevision = -1; },
 value => { value.receipts[0].evidence.segments[0].endHour = 19; },
 value => { value.namespace = 'otherAccounts'; },
]) {
 const bad = clone(paid); mutate(bad);
 const rejected = create({saved: bad});
 assert(rejected.loadError);
 assert.equal(rejected.account(actorId), null);
 assert.equal(rejected.checkpoint({day: 2, hour: 18}), false);
}
const overlapping = clone(beforeFailure);
overlapping.rows.push({...clone(overlapping.rows[0]), actorId: 'cn-successor'});
assert.equal(create({saved: overlapping}).loadError, 'overlapping-npc-coverage');
const overlappingPerson = clone(beforeFailure);
overlappingPerson.rows.push({...clone(overlappingPerson.rows[0]), roleId: otherRole.id, slotId: otherRole.slotId});
assert.equal(create({roles: [role, otherRole], saved: overlappingPerson}).loadError, 'overlapping-npc-coverage');
const overlapSettled = clone(paid);
overlapSettled.rows.push({...clone(overlapSettled.receipts[0].evidence), closed: false, actorId: 'cn-successor'});
assert.equal(create({saved: overlapSettled}).loadError, 'overlapping-npc-coverage');

const meal = {actorId, orderId: 'cn-tavern-order-1', amount: 6};
assert.deepEqual(npcMealSourceSplit({cash: 4, bank: 12}, 6), {cash: 4, bank: 2});
assert.deepEqual(npcMealSourceSplit({cash: 9, bank: 12}, 6), {cash: 6, bank: 0});
assert.throws(() => npcMealSourceSplit({cash: 1, bank: 2}, 6), /insufficient-npc-funds/);
const staged = account.prepareMealPayment(meal);
assert(staged.ok);
assert.equal(staged.balanceAfter, 26);
assert.deepEqual(account.snapshot(), paid, 'preparing payment does not mutate money');
assert.equal(staged.commit({[namespace]: {bad: true}}).code, 'invalid-npc-meal-patch');
storage.fail = true;
assert.equal(staged.commit({chinaTavern: {order: 1}}).code, 'save-failed');
assert.deepEqual(account.snapshot(), paid);
storage.fail = false;
assert(staged.commit({chinaTavern: {order: 1}}).ok);
assert.deepEqual(storage.persisted.chinaTavern, {order: 1});
assert.deepEqual(account.account(actorId), {bank: 26, cash: 0});
assert.deepEqual(storage.persisted[namespace], account.snapshot());
assert.deepEqual(account.snapshot().mealTransfers[0].sourceSplit, {cash: 0, bank: 6});
assert(staged.commit({chinaTavern: {order: 999}}).replayed);
assert.deepEqual(storage.persisted.chinaTavern, {order: 1}, 'same staged commit cannot reapply a different patch');
assert(account.prepareMealPayment(meal).commit({chinaTavern: {order: 1}}).replayed);
assert.equal(account.account(actorId).bank, 26);
assert.equal(account.prepareMealPayment({...meal, actorId: 'cn-successor'}).code, 'npc-meal-conflict');
assert.equal(account.prepareMealRefund({...meal, actorId: 'cn-successor'}).code, 'npc-meal-conflict');
assert.equal(account.prepareMealRefund({...meal, amount: 7}).code, 'npc-meal-conflict');
assert.equal(account.prepareMealRefund({...meal, orderId: 'cn-tavern-order-9'}).code, 'npc-meal-conflict');

const stale = account.prepareMealPayment({...meal, orderId: 'cn-tavern-order-2'});
observeRange(account, 2, 6, 18);
assert.equal(stale.commit({}).code, 'stale-npc-meal', 'pending meal cannot erase newly observed duty');
assert(account.checkpoint({day: 2, hour: 18}));
assert.equal(account.account(actorId).bank, 58);
const refund = account.prepareMealRefund(meal);
storage.fail = true;
assert.equal(refund.commit({chinaTavern: {cancelled: 1}}).code, 'save-failed');
assert.equal(account.account(actorId).bank, 58);
storage.fail = false;
assert(refund.commit({chinaTavern: {cancelled: 1}}).ok);
assert.equal(account.account(actorId).bank, 64, 'refund restores exact source after intervening salary');
assert.deepEqual(account.snapshot().mealTransfers[1].sourceSplit, {cash: 0, bank: 6});
assert(account.prepareMealRefund(meal).commit({chinaTavern: {cancelled: 1}}).replayed);
assert.equal(account.account(actorId).bank, 64);
assert.equal(account.prepareMealPayment(meal).code, 'npc-meal-conflict', 'refunded order cannot later masquerade as paid');
const mealReload = create({saved: account.snapshot()});
assert.equal(mealReload.loadError, null);
assert.deepEqual(mealReload.account(actorId), {bank: 64, cash: 0});
for (const mutate of [
 value => { value.mealTransfers[0].wagesThrough = 0; },
 value => { value.mealTransfers[0].sourceSplit = {cash: 6, bank: 0}; },
 value => { value.mealTransfers[1].actorId = 'cn-successor'; },
 value => { value.mealTransfers.push(clone(value.mealTransfers[1])); },
]) {
 const bad = account.snapshot(); mutate(bad); assert(create({saved: bad}).loadError);
}

// Replacing the job holder never transfers the former employee's private funds.
observeRange(mealReload, 3, 6, 18, coverage('cn-successor', 3));
assert(mealReload.checkpoint({day: 3, hour: 18}));
assert.deepEqual(mealReload.account(actorId), {bank: 64, cash: 0});
assert.deepEqual(mealReload.account('cn-successor'), {bank: 32, cash: 0});
assert.equal(mealReload.hasIncome(actorId), true);
assert.equal(mealReload.hasIncome('cn-successor'), true);
assert.equal(mealReload.account('constructor').bank, 0);
const changedRole = create({roles: [role, otherRole]});
observeRange(changedRole, 1, 6, 12);
changedRole.suspend();
observeRange(changedRole, 1, 12, 18, coverage(actorId, 1, otherRole));
assert(changedRole.checkpoint({day: 1, hour: 18}));
assert.deepEqual(changedRole.account(actorId), {bank: 32, cash: 0}, 'sequential roles credit the same personal account');
assert.equal(changedRole.snapshot().receipts.length, 2);
assert.equal(create({roles: [role, otherRole], saved: changedRole.snapshot()}).loadError, null);
console.log('PASS observed NPC duty: 32/full shift, 21/fresh partial day, zero funds, exact revision segments, absent/dead/replaced coverage, no reload/pause/jump pay, end-of-duty atomic retry/replay, corrupt/overlapping proof rejection, durable personal ownership and cash-first meal/refund atomicity');
