// Shared economic state needs durable boundaries: repeated clicks/reloads must
// not transfer twice, and a failed save must not change spendable money. These
// focused checks cover that logic without depending on scenery or UI geometry.
import assert from 'node:assert/strict';
import {createCopperLedger} from '../source/game/copper-ledger.js';

const fixture = (cash = 20, bank = 0, accountOpened = false) => ({
  version: 1, cash, bank, accountOpened, nextTransaction: 1, transactions: [],
});
const clone = value => JSON.parse(JSON.stringify(value));
const expectCode = (result, code) => { assert.equal(result.ok, false); assert.equal(result.code, code); };

for (const saved of [undefined, null, {}]) {
  const ledger = createCopperLedger({saved});
  assert.deepEqual(ledger.state(), {...fixture(0), total: 0});
  assert.equal(ledger.loadError, null);
  expectCode(ledger.deposit(1, 'closed-deposit'), 'account-not-open');
  expectCode(ledger.withdraw(1, 'closed-withdraw'), 'account-not-open');
  assert(ledger.openAccount('new-account').ok);
  assert.equal(ledger.state().total, 0, 'Opening never awards cash or bank credit');
  expectCode(ledger.deposit(1, 'unfunded'), 'insufficient-cash');
  expectCode(ledger.withdraw(1, 'unfunded'), 'insufficient-bank');
}

let persisted;
let writes = 0;
const source = fixture();
const ledger = createCopperLedger({saved: source, saveState: value => { persisted = value; writes++; }});
source.cash = 100;
source.transactions.push({});
assert.equal(ledger.state().cash, 20, 'Restored state has no references to caller data');
assert(ledger.openAccount('open-click').ok);
assert.deepEqual(ledger.history().map(t => t.id), ['copper-1']);
assert(ledger.openAccount('open-click').replayed);
expectCode(ledger.openAccount('second-open'), 'account-already-open');
assert.equal(writes, 1);
const deposited = ledger.deposit(8, 'deposit-click');
assert(deposited.ok);
assert.deepEqual([deposited.state.cash, deposited.state.bank, deposited.state.total], [12, 8, 20]);
assert.deepEqual(deposited.transaction.before, {cash: 20, bank: 0, accountOpened: true});
assert.deepEqual(deposited.transaction.after, {cash: 12, bank: 8, accountOpened: true});
assert.equal(ledger.deposit(8, 'deposit-click').replayed, true);
assert.equal(writes, 2, 'Double clicks do not persist or move money twice');
expectCode(ledger.deposit(7, 'deposit-click'), 'request-conflict');
expectCode(ledger.withdraw(8, 'deposit-click'), 'request-conflict');
expectCode(ledger.deposit(0, 'open-click'), 'request-conflict');
assert(ledger.withdraw(3, 'withdraw-click').ok);
assert.deepEqual([ledger.state().cash, ledger.state().bank, ledger.state().total], [15, 5, 20]);
assert.deepEqual(ledger.history().map(t => t.id), ['copper-1', 'copper-2', 'copper-3']);

const durable = clone(persisted);
const restored = createCopperLedger({saved: durable, saveState: () => { writes++; }});
assert.equal(restored.loadError, null);
assert.deepEqual(restored.state(), ledger.state());
assert(restored.openAccount('open-click').replayed);
assert(restored.deposit(8, 'deposit-click').replayed);
assert(restored.withdraw(3, 'withdraw-click').replayed);
expectCode(restored.withdraw(1, 'deposit-click'), 'request-conflict');
assert.equal(writes, 3, 'Replay after reload uses the persisted journal');
assert(restored.deposit(2, 'new-after-reload').ok);
assert.equal(restored.history().at(-1).id, 'copper-4');

// Every public boundary is detached, including nested history and save callbacks.
persisted.cash = 999;
persisted.transactions[0].after.cash = 999;
deposited.state.cash = 999;
deposited.transaction.after.cash = 999;
const snapshot = ledger.state();
snapshot.transactions[0].requestId = 'changed';
ledger.history()[0].before.cash = 999;
const replaySnapshot = ledger.deposit(8, 'deposit-click');
replaySnapshot.transaction.requestId = 'changed-again';
assert.equal(ledger.state().cash, 15);
assert.equal(ledger.history()[0].before.cash, 20);
assert.equal(ledger.history()[0].requestId, 'open-click');
assert(ledger.deposit(8, 'deposit-click').replayed);

for (const amount of [0, -1, .5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null, undefined, true, {}, 1n]) {
  const before = ledger.state();
  expectCode(ledger.deposit(amount, 'bad-amount'), 'invalid-amount');
  expectCode(ledger.withdraw(amount, 'bad-amount'), 'invalid-amount');
  assert.deepEqual(ledger.state(), before);
}
for (const id of ['', ' ', ' leading', 'trailing ', 'x'.repeat(129), null, undefined, 1, {}, Symbol('request')]) {
  expectCode(ledger.deposit(1, id), 'invalid-request-id');
  expectCode(ledger.openAccount(id), 'invalid-request-id');
}
expectCode(ledger.deposit(16, 'overspend'), 'insufficient-cash');
expectCode(ledger.withdraw(6, 'overspend'), 'insufficient-bank');
assert(ledger.withdraw(5, 'overspend').ok, 'A rejected ID may retry with a valid request');
assert.equal(ledger.state().bank, 0);
assert(ledger.deposit(20, 'all-cash').ok);
assert.equal(ledger.state().cash, 0);
assert.equal(ledger.state().total, 20);

// A sync atomic store decides the commit. Throw/false must leave both journal
// and balances unmodified, keep the request retryable, and consume no tx number.
for (const failByThrow of [true, false]) {
  let fail = true;
  let saved;
  let atomic;
  atomic = createCopperLedger({saved: fixture(), saveState: candidate => {
    assert.equal(atomic.state().accountOpened, false, 'Live state is unchanged during persistence');
    expectCode(atomic.openAccount('reentrant'), 'ledger-busy');
    if (fail) { if (failByThrow) throw new Error('quota'); return false; }
    saved = candidate;
  }});
  const before = atomic.state();
  expectCode(atomic.openAccount('retry'), 'save-failed');
  assert.deepEqual(atomic.state(), before);
  assert.equal(saved, undefined);
  fail = false;
  assert(atomic.openAccount('retry').ok);
  assert.equal(atomic.history()[0].id, 'copper-1');
  assert.equal(saved.accountOpened, true);
}
for (const action of ['deposit', 'withdraw']) {
  const atomic = createCopperLedger({saved: fixture(10, 10, true), saveState: () => { throw new Error('disk full'); }});
  const before = atomic.state();
  expectCode(atomic[action](5, 'failed-transfer'), 'save-failed');
  assert.deepEqual(atomic.state(), before, `${action} has no partial wallet/bank update`);
}
const asyncStore = createCopperLedger({saveState: () => Promise.reject(new Error('offline'))});
expectCode(asyncStore.openAccount('async'), 'async-save-unsupported');
assert.deepEqual(asyncStore.state(), {...fixture(0), total: 0});
await Promise.resolve();

// Maximum safe totals remain exact when moved; oversized values or inconsistent
// restored journals cannot be normalized into spendable money or replay gaps.
const max = createCopperLedger({saved: fixture(Number.MAX_SAFE_INTEGER)});
assert(max.openAccount('max-open').ok);
assert(max.deposit(Number.MAX_SAFE_INTEGER, 'max-deposit').ok);
assert(max.withdraw(Number.MAX_SAFE_INTEGER, 'max-withdraw').ok);
assert.equal(max.state().cash, Number.MAX_SAFE_INTEGER);
assert.equal(max.state().total, Number.MAX_SAFE_INTEGER);
expectCode(max.deposit(Number.MAX_SAFE_INTEGER + 1, 'overflow'), 'invalid-amount');
const corruptions = [
  false, 1, 'saved', [], {cash: 20}, {...fixture(), version: 2},
  fixture(-1), fixture(.5), fixture('20'), fixture(Infinity), fixture(1, 1),
  fixture(Number.MAX_SAFE_INTEGER, 1, true), {...fixture(), accountOpened: 'yes'},
  {...fixture(), nextTransaction: 0}, {...fixture(), nextTransaction: 2},
  {...fixture(), nextTransaction: Number.MAX_SAFE_INTEGER + 1},
  {...fixture(), transactions: {}}, {...fixture(), total: 99},
  {...durable, cash: durable.cash + 1},
];
for (const change of [
  value => { value.transactions[1].requestId = value.transactions[0].requestId; },
  value => { value.transactions[1].id = 'copper-99'; },
  value => { value.transactions[1].amount = 0; },
  value => { value.transactions[1].amount = -8; },
  value => { value.transactions[1].action = 'mint'; },
  value => { value.transactions[1].before.cash++; },
  value => { value.transactions[1].after.cash++; },
  value => { value.transactions[0].before.accountOpened = true; },
  value => { value.transactions[0].amount = 1; },
  value => { value.transactions[2].after.bank = -1; },
  value => { value.transactions.pop(); },
]) {
  const value = clone(durable);
  change(value);
  corruptions.push(value);
}
for (const saved of corruptions) {
  let corruptWrites = 0;
  const corrupt = createCopperLedger({saved, saveState: () => { corruptWrites++; }});
  assert.equal(corrupt.loadError, 'invalid-saved-state');
  assert.deepEqual(corrupt.state(), {...fixture(0), total: 0});
  expectCode(corrupt.openAccount('recover'), 'invalid-saved-state');
  expectCode(corrupt.deposit(1, 'recover'), 'invalid-saved-state');
  assert.equal(corruptWrites, 0, 'Malformed save is preserved for recovery');
}


// Wage receipts must survive reload exactly once. Zero or unfinished work is
// never seeded by the ledger; a caller awards only a positive completed wage.
let economySaved;
let economyWrites = 0;
let economy = createCopperLedger({saveState: next => { economySaved = next; economyWrites++; }});
expectCode(economy.earn(0, 'zero-work'), 'invalid-amount');
assert.equal(economy.state().cash, 0);
assert.equal(economyWrites, 0);
assert(economy.earn(12, 'physical-task-1').ok);
assert.equal(economy.state().accountOpened, false, 'Earning does not require a bank account');
assert(economy.earn(12, 'physical-task-1').replayed);
expectCode(economy.earn(13, 'physical-task-1'), 'request-conflict');
expectCode(economy.reserve(12, 'physical-task-1'), 'request-conflict');
assert.equal(economyWrites, 1);
economy = createCopperLedger({saved: economySaved, saveState: next => { economySaved = next; economyWrites++; }});
assert.equal(economy.loadError, null);
assert(economy.earn(12, 'physical-task-1').replayed);
assert.equal(economy.state().cash, 12);
assert.equal(economyWrites, 1);

// Bank journal migration preserves old IDs and supports holds and wages without
// reformatting the caller's saved data or spending money still held at the bank.
const migration = createCopperLedger({saved: durable});
assert.equal(migration.loadError, null);
assert.deepEqual(migration.reservations(), []);
assert(migration.deposit(8, 'deposit-click').replayed);
assert(migration.earn(12, 'new-wage').ok);
assert(migration.reserve(20, 'new-service').ok);
assert.deepEqual([migration.state().cash, migration.state().bank, migration.state().total], [7, 5, 12]);
expectCode(migration.reserve(8, 'bank-copper-unavailable'), 'insufficient-cash');
assert(migration.refund('new-service').ok);
assert.deepEqual([migration.state().cash, migration.state().bank, migration.state().total], [27, 5, 32]);

// Booking removes cash once, delivery settles it, and a pre-delivery cancel
// refunds once. Old IDs stay consumed after either terminal state or a reload.
expectCode(economy.reserve(13, 'tea-1'), 'insufficient-cash');
assert(economy.reserve(8, 'tea-1').ok);
assert.deepEqual(economy.reservations(), [{id: 'tea-1', amount: 8, status: 'reserved'}]);
assert.equal(economy.state().cash, 4);
assert.equal(economy.state().total, 4, 'Public total keeps its legacy cash + bank definition');
assert(economy.reserve(8, 'tea-1').replayed);
expectCode(economy.reserve(7, 'tea-1'), 'request-conflict');
assert(economy.settle('tea-1').ok);
assert.equal(economy.state().cash, 4, 'Settling never charges the wallet again');
assert(economy.settle('tea-1').replayed);
expectCode(economy.refund('tea-1'), 'reservation-settled');
assert(economy.reserve(8, 'tea-1').replayed);
assert.deepEqual(economy.reservations(), [{id: 'tea-1', amount: 8, status: 'settled'}]);
assert(economy.reserve(4, 'tea-2').ok);
assert.equal(economy.state().cash, 0);
assert(economy.refund('tea-2').ok);
assert(economy.refund('tea-2').replayed);
expectCode(economy.settle('tea-2'), 'reservation-refunded');
assert(economy.reserve(4, 'tea-2').replayed);
assert.equal(economy.state().cash, 4);
expectCode(economy.settle('missing'), 'reservation-not-found');
expectCode(economy.refund('missing'), 'reservation-not-found');
const economyDurable = clone(economySaved);
const finishedReload = createCopperLedger({saved: economyDurable, saveState: () => { throw new Error('must not write replays'); }});
assert.equal(finishedReload.loadError, null);
assert(finishedReload.settle('tea-1').replayed);
assert(finishedReload.refund('tea-2').replayed);
assert(finishedReload.reserve(8, 'tea-1').replayed);
expectCode(finishedReload.reserve(9, 'tea-1'), 'request-conflict');
assert.deepEqual(finishedReload.reservations(), [
  {id: 'tea-1', amount: 8, status: 'settled'}, {id: 'tea-2', amount: 4, status: 'refunded'},
]);
finishedReload.reservations()[0].status = 'reserved';
assert.equal(finishedReload.reservations()[0].status, 'settled');

// Pending holds are reconstructed without a write. The service caller decides
// which interrupted delivery to refund, with no refund twice after recovery.
assert(economy.reserve(3, 'interrupted-tea').ok);
const heldReload = createCopperLedger({saved: economySaved});
assert.equal(heldReload.loadError, null);
assert.equal(heldReload.state().cash, 1);
assert.equal(heldReload.reservations().at(-1).status, 'reserved');
assert(heldReload.refund('interrupted-tea').ok);
assert.equal(heldReload.state().cash, 4);
const recoveryReload = createCopperLedger({saved: heldReload.state()});
assert(recoveryReload.refund('interrupted-tea').replayed);
assert.equal(recoveryReload.state().cash, 4);

// Caller IDs cannot collide with generated terminal IDs, even at the original
// 128-character boundary or with embedded punctuation and control characters.
const namespaced = createCopperLedger({saved: fixture(20)});
const trickyId = 'x"\\\u0000'.repeat(31) + 'tail';
assert.equal(trickyId.length, 128);
assert(namespaced.reserve(1, trickyId).ok);
const internalLookingId = JSON.stringify(['refund', 'plain']);
assert(namespaced.earn(1, internalLookingId).ok);
assert(namespaced.reserve(1, 'plain').ok);
assert(namespaced.refund('plain').ok);
assert(namespaced.settle(trickyId).ok);
const namespaceReload = createCopperLedger({saved: namespaced.state()});
assert.equal(namespaceReload.loadError, null);
assert(namespaceReload.earn(1, internalLookingId).replayed);
assert(namespaceReload.refund('plain').replayed);
assert(namespaceReload.settle(trickyId).replayed);

for (const amount of [0, -1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null, true, 1n]) {
  expectCode(economy.earn(amount, 'invalid-wage'), 'invalid-amount');
  expectCode(economy.reserve(amount, 'invalid-service'), 'invalid-amount');
}
for (const id of ['', ' ', ' leading', 'trailing ', 'x'.repeat(129), null, undefined, 1, {}, Symbol('request')]) {
  expectCode(economy.earn(1, id), 'invalid-request-id');
  expectCode(economy.reserve(1, id), 'invalid-request-id');
  expectCode(economy.settle(id), 'invalid-request-id');
  expectCode(economy.refund(id), 'invalid-request-id');
}

// Any failed commit leaves the wage/hold, journal, and ID fully retryable.
for (const action of ['earn', 'reserve', 'settle', 'refund']) {
  for (const failByThrow of [true, false]) {
    let fail = false;
    let stableSaved;
    let atomic;
    let during;
    let holdsDuring;
    atomic = createCopperLedger({saved: fixture(), saveState: candidate => {
      assert.deepEqual(atomic.state(), during, `${action} keeps live balances unchanged during persistence`);
      assert.deepEqual(atomic.reservations(), holdsDuring, `${action} keeps holds unchanged during persistence`);
      expectCode(atomic.earn(1, 'reentrant-wage'), 'ledger-busy');
      expectCode(atomic.refund('service'), 'ledger-busy');
      if (fail) { if (failByThrow) throw new Error('quota'); return false; }
      stableSaved = candidate;
    }});
    const invoke = () => action === 'earn' || action === 'reserve' ? atomic[action](5, 'service') : atomic[action]('service');
    if (action === 'settle' || action === 'refund') {
      during = atomic.state();
      holdsDuring = atomic.reservations();
      assert(atomic.reserve(5, 'service').ok);
    }
    during = atomic.state();
    holdsDuring = atomic.reservations();
    const priorSaved = clone(stableSaved ?? fixture());
    fail = true;
    expectCode(invoke(), 'save-failed');
    assert.deepEqual(atomic.state(), during);
    assert.deepEqual(atomic.reservations(), holdsDuring);
    assert.deepEqual(stableSaved ?? fixture(), priorSaved);
    fail = false;
    assert(invoke().ok);
    assert.equal(atomic.history().at(-1).id, `copper-${during.nextTransaction}`);
    assert(invoke().replayed);
    assert.equal(createCopperLedger({saved: stableSaved}).loadError, null);
  }
}

const heldMax = createCopperLedger({saved: fixture(Number.MAX_SAFE_INTEGER)});
expectCode(heldMax.earn(1, 'overflow-wage'), 'balance-overflow');
assert(heldMax.reserve(2, 'max-hold').ok);
expectCode(heldMax.earn(1, 'overflow-wage'), 'balance-overflow');
assert(heldMax.refund('max-hold').ok, 'All reserved cash remains safely refundable');
assert.equal(heldMax.state().cash, Number.MAX_SAFE_INTEGER);
assert(heldMax.reserve(2, 'max-spend').ok);
assert(heldMax.settle('max-spend').ok);
assert(heldMax.earn(2, 'overflow-wage').ok, 'A rejected wage receipt remains retryable once total permits it');
assert.equal(createCopperLedger({saved: heldMax.state()}).loadError, null);

// Tampering must lock both the bank and new economy methods. No reconstruction
// may turn an impossible terminal event or altered wage into spendable copper.
const economyCorruptions = [];
for (const change of [
  value => { value.transactions[0].amount = 13; },
  value => { value.transactions[0].amount = 0; },
  value => { value.transactions[1].after.cash++; },
  value => { value.transactions[2].reservationId = 'missing'; },
  value => { value.transactions[2].amount++; },
  value => { value.transactions[2].requestId = 'not-internal'; },
  value => { value.transactions[2].action = 'refund'; },
  value => { value.transactions[4].reservationId = 'tea-1'; value.transactions[4].requestId = JSON.stringify(['refund', 'tea-1']); },
  value => { value.transactions[3].requestId = 'tea-1'; },
]) {
  const value = clone(economyDurable);
  change(value);
  economyCorruptions.push(value);
}
for (const saved of economyCorruptions) {
  let corruptWrites = 0;
  const corrupt = createCopperLedger({saved, saveState: () => { corruptWrites++; }});
  assert.equal(corrupt.loadError, 'invalid-saved-state');
  for (const action of ['earn', 'reserve']) expectCode(corrupt[action](1, 'recover'), 'invalid-saved-state');
  for (const action of ['settle', 'refund']) expectCode(corrupt[action]('recover'), 'invalid-saved-state');
  assert.deepEqual(corrupt.reservations(), []);
  assert.equal(corruptWrites, 0);
}

console.log('PASS: zero-funded defaults, v1 bank migration, completed wage receipts, service reservation lifecycle, atomic persistence, safe balances, strict restore and durable replay');
