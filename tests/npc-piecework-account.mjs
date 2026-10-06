import assert from 'node:assert/strict';
import {createNPCPieceworkAccount} from '../source/game/npc-piecework-account.js';
import {npcMealSourceSplit} from '../source/game/npc-duty-account.js';
import {createNPCGuestAccounts} from '../source/game/npc-guest-accounts.js';

// Piecework crosses the controller, persisted personal money and tavern reserve
// boundaries. These cases reproduce premature/double pay, save loss, false
// completed legacy work and chronology/source changes during payment replay.
const role = {id: 'cn-palace-garden-piecework', slotId: 'cn-palace-garden-piecework-1', currency: 'copper', amount: 8, contractVersion: 1, employer: '宫苑工务'};
const namespace = 'chinaGardenPieceworkAccounts', actorId = 'cn-garden', clone = structuredClone;
const proof = (day = 0, actor = actorId, holderRevision = 0) => ({kind: 'npc-edict-piecework', version: 1, actorId: actor, roleId: role.id, slotId: role.slotId, holderRevision, documentId: `cn-edict-east-shore:${day}`, audienceId: `cn-morning-audience:${day}`, day, amount: 8, contractVersion: 1, steps: {received: true, filed: true, sweepSeconds: 7}});
const create = (options = {}) => createNPCPieceworkAccount({role, namespace, saveState: () => true, ...options});
function store() {
 let persisted, lastRecord, fail = false, writes = 0;
 return {
  get persisted() { return clone(persisted); }, get record() { return clone(lastRecord); }, get writes() { return writes; },
  set fail(value) { fail = value; },
  saveState(snapshot, record, patch = {}) {
   writes++;
   if (fail) return false;
   persisted = {...clone(patch), [namespace]: clone(snapshot)};
   lastRecord = clone(record); return true;
  },
 };
}
const storage = store(), account = create({saveState: storage.saveState});
const meal = {actorId, orderId: 'cn-tavern-order-1', amount: 6};
assert.deepEqual(account.account(actorId), {bank: 0, cash: 0});
assert.deepEqual(account.account('constructor'), {bank: 0, cash: 0});
assert.equal(account.hasIncome(actorId), false);
assert.equal(account.prepareMealPayment(meal).code, 'insufficient-npc-funds');
assert.equal(storage.writes, 0, 'constructing/checking a purse must never grant starting money');
assert.deepEqual(account.snapshot(), account.state());
const guests = createNPCGuestAccounts([{id: 'garden-piecework', economy: account}]);
assert.equal(guests.account(actorId), null);

for (const mutate of [
 value => { value.kind = 'legacy-edict-completed'; },
 value => { value.version = 0; },
 value => { value.actorId = 'player'; },
 value => { value.roleId = 'cn-other-job'; },
 value => { value.slotId = 'cn-other-slot'; },
 value => { value.holderRevision = -1; },
 value => { value.holderRevision = '0'; },
 value => { value.holderRevision = .5; },
 value => { value.day = -1; },
 value => { value.day = '0'; },
 value => { value.day = Number.MAX_SAFE_INTEGER + 1; },
 value => { value.documentId = 'cn-edict-east-shore:1'; },
 value => { value.documentId = 'cn-edict-east-shore:00'; },
 value => { value.audienceId = 'cn-morning-audience:1'; },
 value => { value.amount = 9; },
 value => { value.amount = '8'; },
 value => { value.contractVersion = 2; },
 value => { value.steps.received = false; },
 value => { value.steps.received = 1; },
 value => { delete value.steps.filed; },
 value => { value.steps.sweepSeconds = 6.999; },
 value => { value.steps.sweepSeconds = Infinity; },
 value => { value.steps.sweepSeconds = '7'; },
 value => { value.steps.sweepSeconds = 7.25; },
 value => { value.steps.legacyCompleted = true; },
 value => { value.completed = true; },
]) {
 const invalid = proof(); mutate(invalid);
 assert.equal(account.settle(invalid).code, 'invalid-npc-piecework-proof');
 assert.equal(account.account(actorId).bank, 0);
}
for (const invalid of [null, [], {completedReceipt: 'cn-morning-audience:0'}, {kind: 'npc-observed-duty', closed: true}, {outcome: 'completed', lastDay: 0}]) assert.equal(account.settle(invalid).code, 'invalid-npc-piecework-proof');
assert.equal(storage.writes, 0, 'legacy completion, timers and malformed proofs have no reward path');

const empty = account.snapshot(), worldPatch = {chinaPalaceEdict: {ledger: {outcome: 'completed', completedReceipt: 'cn-morning-audience:0'}}};
for (const patch of [null, [], {[namespace]: empty}]) assert.equal(account.settle(proof(), patch).code, 'invalid-npc-piecework-patch');
storage.fail = true;
assert.equal(account.settle(proof(), worldPatch).code, 'save-failed');
assert.equal(account.lastError, 'save-failed');
assert.deepEqual(account.snapshot(), empty);
assert.equal(storage.persisted, undefined);
storage.fail = false;
const result = account.settle(proof(), worldPatch);
assert(result.ok && !result.replayed);
assert.equal(account.lastError, null);
assert.deepEqual(account.account(actorId), {bank: 8, cash: 0});
assert.equal(account.hasIncome(actorId), true);
assert.equal(guests.providerFor(actorId), 'garden-piecework');
assert.deepEqual(guests.account(actorId), {bank: 8, cash: 0});
assert.equal(result.receipt.source, 'npc-government-piecework');
assert.equal(result.receipt.employer, '宫苑工务');
assert.equal(result.receipt.currency, 'copper');
assert.deepEqual(storage.record, result.receipt);
assert.deepEqual(storage.persisted.chinaPalaceEdict, worldPatch.chinaPalaceEdict);
assert.deepEqual(storage.persisted[namespace], account.snapshot(), 'completed work and bank credit were sent in the same write');
const paid = account.snapshot(), settledWrites = storage.writes;
assert(account.settle(proof(), {chinaPalaceEdict: {bad: 'replay patch'}}).replayed);
assert.equal(storage.writes, settledWrites, 'identical settlement is a read-only replay');
assert.equal(account.settle(proof(0, 'cn-new-gardener', 1)).code, 'npc-piecework-conflict');
assert.equal(account.settle(proof(0, actorId, 1)).code, 'npc-piecework-conflict');
assert.equal(account.settle({...proof(), steps: {received: true, filed: false, sweepSeconds: 7}}).code, 'invalid-npc-piecework-proof', 'even existing documents require complete replay evidence');
assert.deepEqual(account.snapshot(), paid);
assert.deepEqual(account.account('cn-new-gardener'), {bank: 0, cash: 0});
const reread = create({saved: storage.persisted[namespace]});
assert.equal(reread.loadError, null);
assert.deepEqual(reread.snapshot(), paid);
assert(reread.settle(proof()).replayed);
assert(reread.settle(proof(1, 'cn-new-gardener', 1)).ok);
assert.deepEqual(reread.account(actorId), {bank: 8, cash: 0});
assert.deepEqual(reread.account('cn-new-gardener'), {bank: 8, cash: 0}, 'new work pays its own frozen worker, never transfers the previous owner’s purse');
result.receipt.evidence.actorId = 'cn-changed';
const exposed = account.snapshot(); exposed.accounts[actorId].bank = 999;
assert.deepEqual(account.snapshot(), paid, 'returned receipts/snapshots cannot mutate the ledger');

for (const saveState of [() => false, () => ({ok: false}), () => { throw Error('storage unavailable'); }, () => Promise.resolve(true)]) {
 const rejected = create({saved: paid, saveState});
 assert.equal(rejected.settle(proof(1)).code, 'save-failed');
 assert.deepEqual(rejected.snapshot(), paid);
}
let reentrant, nested;
reentrant = create({saveState: (state, record, patch) => {
 nested = reentrant.settle(proof(1));
 state.accounts[actorId].bank = 900; record.amount = 900; patch.changed = true;
 return true;
}});
assert(reentrant.settle(proof(), {}).ok);
assert.equal(nested.code, 'npc-ledger-busy');
assert.deepEqual(reentrant.account(actorId), {bank: 8, cash: 0}, 'save callback only receives defensive copies');

// Piecework has no cash-grant/withdrawal path. The shared source rule remains
// cash-first; every reachable piecework payment currently uses earned bank pay.
assert.deepEqual(npcMealSourceSplit({cash: 4, bank: 12}, 6), {cash: 4, bank: 2});
assert.deepEqual(npcMealSourceSplit({cash: 8, bank: 12}, 6), {cash: 6, bank: 0});
const staged = guests.prepareMealPayment(meal);
assert(staged.ok);
assert.equal(staged.balanceAfter, 2);
assert.deepEqual(account.snapshot(), paid);
for (const patch of [null, [], {[namespace]: paid}]) assert.equal(staged.commit(patch).code, 'invalid-npc-meal-patch');
storage.fail = true;
assert.equal(staged.commit({chinaServiceWorld: {paid: 1}}).code, 'save-failed');
assert.deepEqual(account.snapshot(), paid);
storage.fail = false;
assert(staged.commit({chinaServiceWorld: {paid: 1}}).ok);
assert.equal(storage.persisted.chinaServiceWorld.paid, 1);
assert.deepEqual(account.account(actorId), {bank: 2, cash: 0});
assert.deepEqual(account.snapshot().mealTransfers[0].sourceSplit, {cash: 0, bank: 6});
assert.equal(account.snapshot().mealTransfers[0].receiptsThrough, 1);
assert(staged.commit({chinaServiceWorld: {paid: 999}}).replayed);
assert.equal(storage.persisted.chinaServiceWorld.paid, 1);
assert(account.prepareMealPayment(meal).commit({}).replayed);
assert.equal(account.prepareMealPayment({...meal, amount: '6'}).code, 'invalid-npc-meal');
assert.equal(account.prepareMealPayment({...meal, actorId: 'cn-new-gardener'}).code, 'npc-meal-conflict');
assert.equal(account.prepareMealRefund({...meal, actorId: 'cn-new-gardener'}).code, 'npc-meal-conflict');
assert.equal(account.prepareMealRefund({...meal, amount: 7}).code, 'npc-meal-conflict');
assert.equal(account.prepareMealRefund({...meal, orderId: 'cn-tavern-order-9'}).code, 'npc-meal-conflict');
const stale = account.prepareMealPayment({...meal, orderId: 'cn-tavern-order-2', amount: 2});
assert(stale.ok);
assert(account.settle(proof(1)).ok);
assert.equal(stale.commit({}).code, 'stale-npc-meal', 'staged meal cannot erase later earned income');
assert.deepEqual(account.account(actorId), {bank: 10, cash: 0});
const refund = guests.prepareMealRefund(meal);
storage.fail = true;
assert.equal(refund.commit({chinaServiceWorld: {refunded: 1}}).code, 'save-failed');
assert.deepEqual(account.account(actorId), {bank: 10, cash: 0});
storage.fail = false;
assert(refund.commit({chinaServiceWorld: {refunded: 1}}).ok);
assert.deepEqual(account.account(actorId), {bank: 16, cash: 0});
assert.deepEqual(account.snapshot().mealTransfers[1].sourceSplit, {cash: 0, bank: 6});
assert.equal(account.snapshot().mealTransfers[1].receiptsThrough, 2);
assert(account.prepareMealRefund(meal).commit({}).replayed);
assert.equal(account.prepareMealPayment(meal).code, 'npc-meal-conflict');
assert.equal(create({saved: account.snapshot()}).loadError, null);
const spendAll = account.prepareMealPayment({...meal, orderId: 'cn-tavern-order-2', amount: 16});
assert(spendAll.ok && spendAll.commit({}).ok);
assert.deepEqual(guests.account(actorId), {bank: 0, cash: 0});
assert.equal(guests.hasIncome(actorId), true, 'spending all earnings never invents a new purse/provider');
assert.equal(create({saved: account.snapshot()}).loadError, null);

for (const mutate of [
 value => { value.version = 0; },
 value => { value.namespace = 'otherAccounts'; },
 value => { value.accounts[actorId].bank++; },
 value => { value.accounts[actorId].cash++; },
 value => { value.accounts['cn-unearned'] = {bank: 8, cash: 0}; },
 value => { value.receipts[0].amount++; },
 value => { value.receipts[0].source = 'legacy-reward'; },
 value => { value.receipts[0].employer = 'someone else'; },
 value => { value.receipts[0].id += ':duplicate'; },
 value => { value.receipts[0].evidence.steps.filed = false; },
 value => { value.receipts[0].evidence.documentId = 'cn-edict-east-shore:99'; },
 value => { value.receipts.push(clone(value.receipts[0])); },
 value => { const duplicate = clone(value.receipts[0]); duplicate.evidence.actorId = 'cn-new-gardener'; duplicate.evidence.holderRevision++; value.receipts.push(duplicate); },
 value => { value.mealTransfers[0].receiptsThrough = 0; },
 value => { value.mealTransfers[0].receiptsThrough = '1'; },
 value => { value.mealTransfers[0].sourceSplit = {cash: 6, bank: 0}; },
 value => { value.mealTransfers[1].actorId = 'cn-new-gardener'; },
 value => { value.mealTransfers[1].receiptsThrough = 3; },
 value => { value.mealTransfers.reverse(); },
 value => { value.mealTransfers.push(clone(value.mealTransfers[1])); },
 value => { value.mealTransfers[0].wagesThrough = 1; },
 value => { value.mealTransfers.push(null); },
 value => { delete value.mealTransfers; },
 value => { value.legacyCompleted = true; },
]) {
 const bad = account.snapshot(); mutate(bad); let writes = 0;
 const rejected = create({saved: bad, saveState: () => { writes++; return true; }});
 assert(rejected.loadError, 'corrupt state must fail closed');
 assert.equal(rejected.account(actorId), null);
 assert.equal(rejected.hasIncome(actorId), false);
 assert.equal(rejected.settle(proof(9)).ok, false);
 assert.equal(rejected.prepareMealPayment(meal).ok, false);
 assert.equal(rejected.prepareMealRefund(meal).ok, false);
 assert.equal(writes, 0);
 assert.deepEqual(rejected.snapshot(), bad, 'do not silently replace rejected history with a clean empty ledger');
}
assert.throws(() => create({namespace: '__proto__'}), /invalid-npc-piecework-config/);
assert.throws(() => create({role: {...role, amount: 0}}), /invalid-npc-piecework-role/);
console.log('PASS NPC piecework: zero initial/daily money, exact completed-work proof, 8 bank copper, document/role uniqueness across owner changes, atomic work/world save and retry, strict replay/restore, rejected-save preservation, guest account continuity, cash-first source rule and exact meal refunds');
