// Reproduce the actual money risks: fabricated daily wages, lost/duplicated
// money across order saves, replayed receipts, and corrupted restored balances.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChinaOfficialEconomy, CHINA_OFFICIAL_IDS, CHINA_OFFICIAL_TAVERN_ID} from '../source/game/china-official-economy.js';
import {CHINA_COURT_OFFICIAL_DAILY_WAGES, getChinaRecordsCareerRank} from '../source/game/china-official-ranks.js';
const clone = value => JSON.parse(JSON.stringify(value));
const [actorId, otherId] = CHINA_OFFICIAL_IDS;
const initialTreasury = {amount: 150, sourceId: 'test-one-time-world-budget'};
const code = (result, expected) => { assert.equal(result.ok, false); assert.equal(result.code, expected); };
const duty = (id = actorId, day = 3, changes = {}) => ({actorId: id, day, receiptId: `duty:${id}:${day}`,
  evidence: {kind: 'office-work', completed: true, actorId: id, day, elapsed: 8, duration: 8, audienceDay: day, audienceCompleted: true}, ...changes});
// Independent old-format fixtures ensure migration cannot validate v1 by
// first applying the new unlimited funding rules or rewriting old receipts.
const legacyState = (origin = initialTreasury) => ({version: 1, initialTreasury: clone(origin), dailyWage: 24, treasury: origin.amount,
  accounts: Object.fromEntries(CHINA_OFFICIAL_IDS.map(id => [id, {bank: 0, cash: 0}])),
  destinations: {[CHINA_OFFICIAL_TAVERN_ID]: 0}, nextTransaction: 1, transactions: []});
const appendLegacy = (state, request, from, to, change) => {
  const balances = () => ({treasury: state.treasury, accounts: clone(state.accounts), destinations: clone(state.destinations)});
  const before = balances(); change();
  state.transactions.push({id: `official-${state.nextTransaction}`, ...request, from, to, before, after: balances()});
  state.nextTransaction++;
};
const appendLegacyDuty = (state, id = actorId, day = 3) => appendLegacy(state,
  {action: 'duty', ...duty(id, day), amount: state.dailyWages?.[id] ?? state.dailyWage}, 'official-treasury', `${id}:bank`, () => {
    const amount = state.dailyWages?.[id] ?? state.dailyWage;
    state.treasury -= amount; state.accounts[id].bank += amount;
  });
const conserve = snapshot => {
  const total = BigInt(snapshot.destinations[CHINA_OFFICIAL_TAVERN_ID]) +
    Object.values(snapshot.accounts).reduce((sum, account) => sum + BigInt(account.cash) + BigInt(account.bank), 0n);
  const oldEarned = snapshot.legacyFunding ? snapshot.legacyFunding.initialTreasury.amount - snapshot.legacyFunding.treasury : 0;
  assert.equal(total, BigInt(oldEarned) + BigInt(snapshot.governmentPaid));
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.funding, 'government-guaranteed');
  assert(!Object.hasOwn(snapshot, 'treasury'));
};
let day = 3, writes = 0, durable, failSave = false;
const saveState = (next, transaction, worldPatch) => {
  if (failSave) return false;
  durable = {...durable, ...worldPatch, chinaOfficialEconomy: clone(next)};
  assert.equal(transaction.amount > 0, true);
  conserve(next); writes++;
};
const options = {getDay: () => day, isAppointed: id => CHINA_OFFICIAL_IDS.includes(id), saveState};
let economy = createChinaOfficialEconomy(options);
assert.equal(CHINA_OFFICIAL_IDS.length, 6);
assert.equal(economy.loadError, null);
assert.equal(writes, 0, 'Loading creates no phantom transfer');
assert.deepEqual(Object.keys(economy.state().accounts), CHINA_OFFICIAL_IDS);
for (const id of CHINA_OFFICIAL_IDS) assert.deepEqual(economy.account(id), {bank: 0, cash: 0});
assert.equal(economy.account('player'), null);
code(economy.completeDuty(duty('player')), 'invalid-actor');
code(createChinaOfficialEconomy({...options, isAppointed: () => false}).completeDuty(duty()), 'actor-not-appointed');
code(createChinaOfficialEconomy({initialTreasury, getDay: () => day, saveState}).completeDuty(duty()), 'actor-not-appointed');
code(economy.completeDuty(duty(actorId, day + 1)), 'day-mismatch');
for (const change of [{audienceCompleted: false}, {audienceDay: 2}, {completed: false}, {actorId: otherId}, {day: 4},
  {kind: 'idle'}, {duration: 7}, {duration: 8, elapsed: 7.99}, {elapsed: Infinity}, {duration: NaN}]) {
  code(economy.completeDuty(duty(actorId, 3, {evidence: {...duty().evidence, ...change}})), 'incomplete-duty');
}
assert.equal(writes, 0);
const zero = createChinaOfficialEconomy({...options, saveState: () => true});
assert.equal(zero.state().governmentPaid, 0);
assert(zero.completeDuty(duty()).ok, 'A completed duty needs no fictional finite reserve');

assert(economy.completeDuty(duty()).ok);
assert.deepEqual(economy.account(actorId), {bank: 24, cash: 0});
assert.equal(economy.state().governmentPaid, 24);
assert.equal(economy.history()[0].from, 'government-guaranteed');
assert(economy.completeDuty(duty()).replayed);
code(economy.completeDuty(duty(actorId, 3, {receiptId: 'second-certificate-same-day'})), 'duty-already-paid');
code(economy.completeDuty(duty(otherId, 3, {receiptId: duty().receiptId})), 'request-conflict');
assert.equal(writes, 1);
for (const id of CHINA_OFFICIAL_IDS.slice(1)) assert(economy.completeDuty(duty(id)).ok);
assert.equal(economy.state().governmentPaid, 144);
day = 4;
const tomorrow = createChinaOfficialEconomy({...options, saved: economy.snapshot(), saveState: () => true});
for (const id of CHINA_OFFICIAL_IDS) {
  assert(tomorrow.completeDuty(duty(id, 4)).ok);
  assert(tomorrow.completeDuty(duty(id, 4)).replayed);
  code(tomorrow.completeDuty(duty(id, 4, {receiptId: `duplicate-day-four:${id}`})), 'duty-already-paid');
}
assert.equal(tomorrow.state().governmentPaid, 288);
const paidSnapshot = economy.snapshot();
day = 999;
economy = createChinaOfficialEconomy({...options, saved: durable.chinaOfficialEconomy});
assert.deepEqual(economy.snapshot(), paidSnapshot, 'Reloading far in the future cannot accrue wages');
assert(economy.completeDuty(duty()).replayed, 'Old completed receipts stay idempotent on later days');
assert.equal(writes, 6);

const meal = {actorId, orderId: 'official-lunch-1', amount: 7};
code(economy.prepareMealPayment({...meal, amount: 25}), 'insufficient-funds');
assert.deepEqual(economy.prepareMealPayment(meal).sourceSplit, {cash: 0, bank: 7}, 'Bank copper can buy food without a withdrawal');
code(economy.withdraw({actorId, amount: 25, receiptId: 'too-large'}), 'insufficient-bank');
for (const amount of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '7', null, 1n]) {
  code(economy.withdraw({actorId, amount, receiptId: 'bad'}), 'invalid-amount');
}
assert(economy.withdraw({actorId, amount: 12, receiptId: 'bank-visit-1'}).ok);
assert(economy.withdraw({actorId, amount: 12, receiptId: 'bank-visit-1'}).replayed);
code(economy.withdraw({actorId, amount: 11, receiptId: 'bank-visit-1'}), 'request-conflict');
code(economy.withdraw({actorId: otherId, amount: 12, receiptId: 'bank-visit-1'}), 'request-conflict');
assert.deepEqual(economy.balance(actorId), {bank: 12, cash: 12});

const beforeMeal = economy.snapshot(), beforeStorage = clone(durable), pending = economy.prepareMealPayment(meal);
assert(pending.ok && pending.valid());
assert.deepEqual(economy.snapshot(), beforeMeal, 'Preparing an order cannot move money');
assert.equal(pending.snapshot.destinations[CHINA_OFFICIAL_TAVERN_ID], 7);
pending.snapshot.accounts[actorId].cash = 9999;
pending.candidate.governmentPaid = 9999;
pending.patch.chinaOfficialEconomy.governmentPaid = 9999;
pending.transaction.amount = 9999;
const world = {revision: 1, till: 7, orders: [{id: meal.orderId, paid: true, amount: 7}]};
failSave = true;
code(pending.commit({chinaServiceWorld: world}), 'save-failed');
assert.deepEqual(economy.snapshot(), beforeMeal);
assert.deepEqual(durable, beforeStorage);
assert(pending.valid());
failSave = false;
const paid = pending.commit({chinaServiceWorld: world});
assert(paid.ok && !paid.replayed);
assert.equal(paid.amount, 7);
assert.deepEqual(economy.account(actorId), {bank: 12, cash: 5});
assert.deepEqual(durable.chinaServiceWorld, world);
assert.deepEqual(durable.chinaOfficialEconomy, economy.snapshot());
assert.equal(paid.transaction.from, `${actorId}:cash`);
assert.equal(paid.transaction.to, CHINA_OFFICIAL_TAVERN_ID);
assert.deepEqual(paid.sourceSplit, {cash: 7, bank: 0});
assert.deepEqual(paid.transaction.sourceSplit, paid.sourceSplit);
const afterMealWrites = writes;
assert(pending.commit({chinaServiceWorld: world}).replayed);
assert(economy.prepareMealPayment(meal).commit().replayed);
assert.equal(writes, afterMealWrites);
code(economy.prepareMealPayment({...meal, amount: 8}), 'request-conflict');
code(economy.prepareMealPayment({...meal, actorId: otherId}), 'request-conflict');
code(economy.prepareMealRefund({...meal, orderId: 'unknown'}), 'payment-not-found');
code(economy.prepareMealRefund({...meal, amount: 6}), 'request-conflict');
code(economy.prepareMealRefund({...meal, actorId: otherId}), 'request-conflict');
const refund = economy.prepareMealRefund(meal);
assert(refund.ok);
failSave = true;
const beforeRefund = economy.snapshot();
code(refund.commit({chinaServiceWorld: {...world, revision: 2, till: 0, orders: []}}), 'save-failed');
assert.deepEqual(economy.snapshot(), beforeRefund);
failSave = false;
assert(refund.commit({chinaServiceWorld: {...world, revision: 2, till: 0, orders: []}}).ok);
assert.deepEqual(economy.account(actorId), {bank: 12, cash: 12});
assert.equal(economy.state().destinations[CHINA_OFFICIAL_TAVERN_ID], 0);
assert(economy.prepareMealRefund(meal).commit().replayed);
code(economy.prepareMealPayment(meal), 'order-already-refunded');
conserve(economy.snapshot());

// Any intervening transfer invalidates a previously prepared world candidate.
const left = economy.prepareMealPayment({...meal, orderId: 'lunch-left', amount: 3});
const right = economy.prepareMealPayment({...meal, orderId: 'lunch-right', amount: 3});
code(left.commit({chinaOfficialEconomy: {}}), 'invalid-world-patch');
code(left.commit([]), 'invalid-world-patch');
assert(left.commit({chinaServiceWorld: {revision: 3, till: 3}}).ok);
assert.equal(right.valid(), false);
code(right.commit(), 'stale-candidate');
code(right.committed(), 'stale-candidate');
assert.equal(economy.account(actorId).cash, 9);
assert.equal(durable.chinaServiceWorld.till, 3);

// Alternate existing-world coordinator: store detached candidate first, then
// advance memory. Returned objects never share live account/journal references.
const coordinated = economy.prepareMealPayment({...meal, orderId: 'coordinated', amount: 2});
assert(coordinated.valid());
const stagedStorage = clone(coordinated.snapshot);
assert(coordinated.committed().ok);
assert.deepEqual(economy.snapshot(), stagedStorage);
assert(coordinated.committed().replayed);
const roundtrip = economy.snapshot();
const restored = createChinaOfficialEconomy({...options, saved: roundtrip});
assert.equal(restored.loadError, null);
assert.deepEqual(restored.snapshot(), roundtrip);
assert(restored.prepareMealPayment({...meal, orderId: 'coordinated', amount: 2}).commit().replayed);
assert(restored.prepareMealRefund(meal).commit().replayed);
conserve(restored.snapshot());

// The real meal risks are bank-funded starvation, partial charges on failed
// order saves, and refunds moving money to the wrong pocket after later work.
for (const scenario of [
  {name: 'bank-only', withdrawn: 0, amount: 7, split: {cash: 0, bank: 7}},
  {name: 'mixed', withdrawn: 4, amount: 7, split: {cash: 4, bank: 3}},
  {name: 'cash-only', withdrawn: 12, amount: 7, split: {cash: 7, bank: 0}},
  {name: 'exact-total', withdrawn: 4, amount: 24, split: {cash: 4, bank: 20}},
]) {
  let savedWorld, saveFails = false, count = 0;
  const localOptions = {...options, getDay: () => 4, saveState: (next, transaction, patch) => {
    if (saveFails) return false;
    savedWorld = {...savedWorld, ...patch, chinaOfficialEconomy: clone(next)};
    conserve(next); count++;
  }};
  let ledger = createChinaOfficialEconomy(localOptions);
  assert(ledger.completeDuty(duty()).ok);
  if (scenario.withdrawn) assert(ledger.withdraw({actorId, amount: scenario.withdrawn, receiptId: 'existing-withdrawal'}).ok);
  const request = {actorId, orderId: `combined-${scenario.name}`, amount: scenario.amount};
  const before = ledger.snapshot(), storageBefore = clone(savedWorld), countBefore = count;
  code(ledger.prepareMealPayment({...request, amount: 25}), 'insufficient-funds');
  code(ledger.prepareMealPayment({...request, actorId: otherId}), 'insufficient-funds');
  const payment = ledger.prepareMealPayment(request);
  assert(payment.ok && payment.valid());
  assert.deepEqual(payment.sourceSplit, scenario.split);
  assert.deepEqual(payment.transaction.sourceSplit, scenario.split);
  assert.equal(payment.snapshot.transactions.length, before.transactions.length + 1, 'Both pockets produce one journal receipt');
  assert.equal(payment.snapshot.transactions.at(-1).action, 'meal-payment', 'Payment creates no synthetic withdrawal');
  assert.deepEqual(ledger.snapshot(), before);
  payment.sourceSplit.cash = 999;
  payment.transaction.sourceSplit.bank = 999;
  payment.snapshot.transactions.at(-1).sourceSplit.cash = 999;
  saveFails = true;
  code(payment.commit({chinaServiceWorld: {orderId: request.orderId, till: request.amount}}), 'save-failed');
  assert.deepEqual(ledger.snapshot(), before);
  assert.deepEqual(savedWorld, storageBefore);
  assert.equal(count, countBefore);
  assert(payment.valid());
  saveFails = false;
  const receipt = payment.commit({chinaServiceWorld: {orderId: request.orderId, till: request.amount}});
  assert(receipt.ok && !receipt.replayed);
  assert.deepEqual(receipt.sourceSplit, scenario.split);
  assert.equal(count, countBefore + 1, 'Combined payment and order use one durable write');
  assert.deepEqual(ledger.account(actorId), {cash: scenario.withdrawn - scenario.split.cash,
    bank: 24 - scenario.withdrawn - scenario.split.bank});
  assert.deepEqual(savedWorld.chinaOfficialEconomy, ledger.snapshot());
  assert.equal(savedWorld.chinaServiceWorld.till, request.amount);
  assert(payment.commit().replayed);
  assert.equal(count, countBefore + 1);

  // Reload while paid, then change both balances before reversing the meal.
  const paidState = ledger.snapshot();
  ledger = createChinaOfficialEconomy({...localOptions, saved: paidState});
  assert.equal(ledger.loadError, null);
  assert.deepEqual(ledger.snapshot(), paidState);
  assert(ledger.prepareMealPayment(request).commit().replayed);
  assert.deepEqual(ledger.prepareMealPayment(request).sourceSplit, scenario.split);
  assert(ledger.completeDuty(duty(actorId, 4)).ok);
  assert(ledger.withdraw({actorId, amount: 3, receiptId: 'later-legitimate-withdrawal'}).ok);
  const beforeReverse = ledger.snapshot(), beforeReverseStorage = clone(savedWorld);
  const reverse = ledger.prepareMealRefund(request);
  assert.deepEqual(reverse.sourceSplit, scenario.split);
  saveFails = true;
  code(reverse.commit({chinaServiceWorld: {orderId: request.orderId, till: 0}}), 'save-failed');
  assert.deepEqual(ledger.snapshot(), beforeReverse);
  assert.deepEqual(savedWorld, beforeReverseStorage);
  saveFails = false;
  const refunded = reverse.commit({chinaServiceWorld: {orderId: request.orderId, till: 0}});
  assert(refunded.ok);
  assert.deepEqual(refunded.sourceSplit, scenario.split);
  assert.deepEqual(ledger.account(actorId), {cash: scenario.withdrawn + 3, bank: 48 - scenario.withdrawn - 3},
    'Refund restores the exact original sources, independent of current balances');
  assert.equal(ledger.snapshot().destinations[CHINA_OFFICIAL_TAVERN_ID], 0);
  const refundedState = ledger.snapshot(), refundedCount = count;
  ledger = createChinaOfficialEconomy({...localOptions, saved: refundedState});
  assert.equal(ledger.loadError, null);
  assert.deepEqual(ledger.snapshot(), refundedState);
  assert(ledger.prepareMealRefund(request).commit().replayed);
  assert.deepEqual(ledger.prepareMealRefund(request).sourceSplit, scenario.split);
  assert.equal(count, refundedCount);
  code(ledger.prepareMealPayment(request), 'order-already-refunded');
}

// A stale split must be discarded and recalculated from the current accounts.
const staleLedger = createChinaOfficialEconomy({...options, getDay: () => 3, saveState: () => true});
assert(staleLedger.completeDuty(duty()).ok);
const staleRequest = {actorId, orderId: 'cash-appears-before-commit', amount: 7};
const stalePayment = staleLedger.prepareMealPayment(staleRequest);
assert.deepEqual(stalePayment.sourceSplit, {cash: 0, bank: 7});
assert(staleLedger.withdraw({actorId, amount: 4, receiptId: 'withdraw-before-commit'}).ok);
code(stalePayment.commit(), 'stale-candidate');
code(stalePayment.committed(), 'stale-candidate');
const refreshed = staleLedger.prepareMealPayment(staleRequest).commit();
assert(refreshed.ok);
assert.deepEqual(refreshed.sourceSplit, {cash: 4, bank: 3});
assert.deepEqual(staleLedger.account(actorId), {cash: 0, bank: 17});

// Independently reproduce the R96 cash-only journal format. Old payments,
// refunds and legitimate withdrawals must restore without rewriting history.
const legacy = legacyState();
const legacyTransfer = (...args) => appendLegacy(legacy, ...args);
appendLegacyDuty(legacy);
legacyTransfer({action: 'withdraw', actorId, amount: 12, receiptId: 'old-bank-visit'},
  `${actorId}:bank`, `${actorId}:cash`, () => {legacy.accounts[actorId].bank -= 12; legacy.accounts[actorId].cash += 12;});
for (const [action, orderId, amount] of [['meal-payment', 'legacy-refunded', 7], ['meal-refund', 'legacy-refunded', 7], ['meal-payment', 'legacy-outstanding', 5]]) {
  const paying = action === 'meal-payment';
  legacyTransfer({action, actorId, amount, receiptId: `official-${action}:${orderId}`, orderId},
    paying ? `${actorId}:cash` : CHINA_OFFICIAL_TAVERN_ID, paying ? CHINA_OFFICIAL_TAVERN_ID : `${actorId}:cash`, () => {
      legacy.accounts[actorId].cash += paying ? -amount : amount;
      legacy.destinations[CHINA_OFFICIAL_TAVERN_ID] += paying ? amount : -amount;
    });
}
const legacyJournal = clone(legacy.transactions), originalLegacy = clone(legacy);
const oldLedger = createChinaOfficialEconomy({...options, saved: legacy, saveState: () => true});
assert.equal(oldLedger.loadError, null);
assert.equal(oldLedger.snapshot().version, 2);
assert.deepEqual(oldLedger.snapshot().legacyFunding, {initialTreasury, treasury: originalLegacy.treasury, transactionCount: legacyJournal.length});
assert.deepEqual(oldLedger.snapshot().accounts, originalLegacy.accounts);
assert.deepEqual(oldLedger.snapshot().destinations, originalLegacy.destinations);
assert.deepEqual(oldLedger.history(), legacyJournal);
assert.deepEqual(legacy, originalLegacy);
assert(oldLedger.withdraw({actorId, amount: 12, receiptId: 'old-bank-visit'}).replayed);
assert(oldLedger.prepareMealRefund({actorId, orderId: 'legacy-refunded', amount: 7}).commit().replayed);
const oldRequest = {actorId, orderId: 'legacy-outstanding', amount: 5};
assert(oldLedger.prepareMealPayment(oldRequest).commit().replayed);
assert(oldLedger.withdraw({actorId, amount: 2, receiptId: 'withdraw-after-upgrade'}).ok);
const newRefund = oldLedger.prepareMealRefund(oldRequest).commit();
assert.deepEqual(newRefund.sourceSplit, {cash: 5, bank: 0});
assert.deepEqual(oldLedger.account(actorId), {cash: 14, bank: 10});
const newMixed = oldLedger.prepareMealPayment({actorId, orderId: 'combined-after-upgrade', amount: 17}).commit();
assert.deepEqual(newMixed.sourceSplit, {cash: 14, bank: 3});
assert.deepEqual(oldLedger.history().slice(0, legacyJournal.length), legacyJournal);
const upgraded = oldLedger.snapshot(), reloadedUpgrade = createChinaOfficialEconomy({...options, saved: upgraded});
assert.equal(reloadedUpgrade.loadError, null);
assert.deepEqual(reloadedUpgrade.snapshot(), upgraded);
assert.deepEqual(reloadedUpgrade.history().slice(0, legacyJournal.length), legacyJournal);

// Zero/insufficient v1 reserves migrate without distributing their unspent
// remainder, resetting accounts, or inventing missed offline duties.
for (const amount of [0, 6, 24, 30]) {
  const old = legacyState({amount, sourceId: 'old-bounded-budget'});
  if (amount >= 24) appendLegacyDuty(old);
  const original = clone(old), oldCount = old.transactions.length;
  let currentDay = 5, writeCount = 0, durableState;
  const local = {...options, getDay: () => currentDay, saveState: next => {writeCount++; durableState = clone(next);}};
  let migrated = createChinaOfficialEconomy({...local, saved: old});
  assert.equal(migrated.loadError, null);
  assert.equal(writeCount, 0, 'Migration itself neither writes nor pays');
  assert.deepEqual(migrated.snapshot().accounts, old.accounts);
  assert.deepEqual(migrated.snapshot().destinations, old.destinations);
  assert.deepEqual(migrated.history(), old.transactions);
  assert.equal(migrated.snapshot().legacyFunding.treasury, amount % 24);
  assert.equal(migrated.snapshot().governmentPaid, 0);
  conserve(migrated.snapshot());
  if (oldCount) {
    assert(migrated.completeDuty(duty()).replayed);
    code(migrated.completeDuty(duty(actorId, 3, {receiptId: 'alternate-old-receipt'})), 'duty-already-paid');
    assert.equal(writeCount, 0);
  }
  for (const targetDay of [5, 6]) {
    currentDay = targetDay;
    for (const id of CHINA_OFFICIAL_IDS) {
      const proof = duty(id, targetDay);
      assert(migrated.completeDuty(proof).ok);
      assert(migrated.completeDuty(proof).replayed);
      code(migrated.completeDuty({...proof, receiptId: `alternate:${id}:${targetDay}`}), 'duty-already-paid');
      migrated = createChinaOfficialEconomy({...local, saved: durableState});
      assert(migrated.completeDuty(proof).replayed, 'Refresh/country restore retains the paid simulation-day key');
    }
  }
  assert.equal(writeCount, 12);
  assert.equal(migrated.history().length, oldCount + 12);
  assert.equal(migrated.snapshot().governmentPaid, 288);
  assert.deepEqual(migrated.history().slice(0, oldCount), old.transactions);
  const beforeOffline = migrated.snapshot();
  currentDay = 1000;
  migrated = createChinaOfficialEconomy({...local, saved: beforeOffline});
  assert.deepEqual(migrated.snapshot(), beforeOffline);
  assert.equal(writeCount, 12);
  code(migrated.completeDuty(duty(actorId, 1001)), 'day-mismatch');
  assert(migrated.completeDuty(duty(actorId, 1000)).ok);
  assert.equal(migrated.history().length, oldCount + 13);
  assert(migrated.history().every(tx => tx.day === 3 || tx.day === 5 || tx.day === 6 || tx.day === 1000));
  assert.deepEqual(old, original, 'Migration never edits the supplied v1 save');
  conserve(migrated.snapshot());
}

// Execute only the real main ledger wiring, without constructing a 3D scene.
// Country reconstruction uses this same saved economy; other world ledgers
// must survive the official's atomic wage/meal writes byte-for-byte.
const mainSource = fs.readFileSync(new URL('../source/game/main.js', import.meta.url), 'utf8');
const mainStart = mainSource.indexOf('const officialPayPolicy='), mainEnd = mainSource.indexOf('const chinaSalonEconomy=', mainStart);
assert(mainStart >= 0 && mainEnd > mainStart);
const mountMain = new Function('saved', 'createChinaOfficialEconomy', 'CHINA_OFFICIAL_IDS', 'simulationClock', 'worldSnapshotWriter', 'gameStorage', 'save',
  mainSource.slice(mainStart, mainEnd) + '\nreturn chinaOfficialEconomy;');
const worldState = {chinaOfficialEconomy: legacyState({amount: 0, sourceId: 'world-fiscal-initialization-v1'}),
  copperLedger: {version: 3, cash: 8, bank: 101, interest: {day: 5, minimum: {copper: 91}}},
  chinaServiceWorld: {till: 17}, japanOperations: {till: 9}, formalCareers: {tenure: 'existing-player-role'}};
const untouched = clone(worldState); delete untouched.chinaOfficialEconomy;
let mainWrites = 0, rejectMainWrite = true, mainDurable;
const storage = {setItem: (key, json) => {
  assert.equal(key, 'worlds-days-v1');
  if (rejectMainWrite) return false;
  mainWrites++; mainDurable = JSON.parse(json); return true;
}};
const mount = () => mountMain(worldState, createChinaOfficialEconomy, CHINA_OFFICIAL_IDS, {state: () => ({day: 5})}, null, storage, () => {
  throw Error('An existing old save must not be replaced during mount');
});
let wired = mount();
assert.equal(wired.loadError, null);
assert.equal(mainWrites, 0);
code(wired.completeDuty(duty(actorId, 5)), 'save-failed');
assert.equal(worldState.chinaOfficialEconomy.version, 1, 'Failed migration+pay leaves the durable old save intact');
rejectMainWrite = false;
assert(wired.completeDuty(duty(actorId, 5)).ok);
assert.equal(mainWrites, 1);
assert.equal(mainDurable.chinaOfficialEconomy.version, 2);
const nextWorld = clone(mainDurable); delete nextWorld.chinaOfficialEconomy;
assert.deepEqual(nextWorld, untouched, 'The production save callback preserves all unrelated funds and interest state');
wired = mount();
assert(wired.completeDuty(duty(actorId, 5)).replayed);
assert.equal(mainWrites, 1, 'Reload/country remount does not pay again');
const wiredMeal = {actorId, orderId: 'main-existing-meal', amount: 6};
assert(wired.prepareMealPayment(wiredMeal).commit({chinaServiceWorld: {till: 23}}).ok);
assert.deepEqual(worldState.copperLedger, untouched.copperLedger);
assert.equal(worldState.japanOperations.till, 9);
assert(wired.prepareMealRefund(wiredMeal).commit({chinaServiceWorld: {till: 17}}).ok);
assert.deepEqual(wired.account(actorId), {bank: 24, cash: 0});
assert.deepEqual(worldState.copperLedger, untouched.copperLedger);

// Reject forged funding metadata and legacy-shaped bank-funded transactions.
const splitPaymentIndex = upgraded.transactions.findIndex(transaction => transaction.orderId === 'combined-after-upgrade');
for (const corrupt of [
  saved => { saved.transactions[splitPaymentIndex].sourceSplit = {cash: 13, bank: 4}; },
  saved => { saved.transactions[splitPaymentIndex].sourceSplit.cash = -1; },
  saved => { saved.transactions[splitPaymentIndex].sourceSplit.bank = 0.5; },
  saved => { saved.transactions[splitPaymentIndex].sourceSplit.extra = true; },
  saved => { saved.transactions[splitPaymentIndex].sourceSplit = null; },
  saved => { delete saved.transactions[splitPaymentIndex].sourceSplit; },
  saved => { saved.transactions[0].sourceSplit = {cash: 0, bank: 24}; },
  saved => { saved.transactions.find(transaction => transaction.sourceSplit && transaction.action === 'meal-refund').sourceSplit = {cash: 0, bank: 5}; },
]) {
  const damaged = clone(upgraded); corrupt(damaged);
  assert.equal(createChinaOfficialEconomy({...options, saved: damaged}).loadError, 'invalid-saved-state');
}

// Failed, asynchronous or reentrant saves must leave bank, funding, receipts
// and sequence untouched so the exact same operation can safely retry.
for (const mode of ['throw', 'false', 'result-false', 'promise']) {
  let reject = true, ledger;
  ledger = createChinaOfficialEconomy({...options, getDay: () => 3, saveState: () => {
    assert.deepEqual(ledger.account(actorId), {bank: 0, cash: 0});
    code(ledger.withdraw({actorId, amount: 1, receiptId: 'reentrant'}), 'ledger-busy');
    if (!reject) return true;
    if (mode === 'throw') throw Error('quota');
    if (mode === 'false') return false;
    if (mode === 'result-false') return {ok: false};
    return Promise.reject(Error('offline'));
  }});
  const before = ledger.snapshot();
  code(ledger.completeDuty(duty()), mode === 'promise' ? 'async-save-unsupported' : 'save-failed');
  assert.deepEqual(ledger.snapshot(), before);
  reject = false;
  assert(ledger.completeDuty(duty()).ok);
}
await Promise.resolve();
code(createChinaOfficialEconomy({...options, getDay: () => 3, saveState: undefined}).completeDuty(duty()), 'persistence-unavailable');
let appointments = 0;
const removed = createChinaOfficialEconomy({...options, getDay: () => 3, isAppointed: () => ++appointments === 1});
code(removed.completeDuty(duty()), 'actor-not-appointed');
assert.equal(removed.state().governmentPaid, 0);

// A real completed certificate survives an unavailable save into a later day.
// Loading and advancing the clock alone create no historical duty entries.
let arrearsDay = 3, saveUnavailable = true, arrearsSaved;
const arrearsOptions = {...options, getDay: () => arrearsDay, saveState: next => {
  if (saveUnavailable) return false;
  arrearsSaved = clone(next);
}};
let arrears = createChinaOfficialEconomy(arrearsOptions);
const earnedCertificate = duty(actorId, 3), initialArrears = arrears.snapshot();
code(arrears.completeDuty(earnedCertificate), 'save-failed');
assert.deepEqual(arrears.snapshot(), initialArrears);
arrearsDay = 5;
arrears = createChinaOfficialEconomy({...arrearsOptions, saved: initialArrears});
assert.equal(arrears.history().length, 0);
assert.deepEqual(arrears.account(actorId), {bank: 0, cash: 0});
saveUnavailable = false;
assert(arrears.completeDuty(earnedCertificate).ok, 'A past actual completed duty can retry after storage recovers');
assert.equal(arrears.history().length, 1);
assert.equal(arrears.history()[0].day, 3);
assert.deepEqual(arrears.account(actorId), {bank: 24, cash: 0});
assert(arrears.completeDuty(earnedCertificate).replayed);
assert.equal(arrearsSaved.governmentPaid, 24);
code(arrears.completeDuty(duty(actorId, 6)), 'day-mismatch');
code(createChinaOfficialEconomy({...arrearsOptions, getDay: () => NaN}).completeDuty(earnedCertificate), 'day-mismatch');
const unfundedArrears = createChinaOfficialEconomy({...arrearsOptions, initialTreasury: {amount: 6, sourceId: 'test-insufficient-source'}});
assert(unfundedArrears.completeDuty(earnedCertificate).ok);
const paidArrears = unfundedArrears.snapshot();
arrearsDay = 6;
assert(unfundedArrears.completeDuty(earnedCertificate).replayed);
assert.deepEqual(unfundedArrears.snapshot(), paidArrears, 'Only the existing earned certificate is paid, once');

// Rank labels cannot reprice R96 receipts or mint a second starting treasury.
// A saved policy remains authoritative even if today's caller has new rates.
const worldBudget = {amount: 4320, sourceId: 'world-fiscal-initialization-v1'};
const policyOptions = {...options, initialTreasury: worldBudget, getDay: () => 9, saveState: () => true};
const r96Save = legacyState(worldBudget);
for (const id of CHINA_OFFICIAL_IDS) appendLegacyDuty(r96Save, id);
const r96 = createChinaOfficialEconomy({...policyOptions, saved: r96Save});
for (const id of CHINA_OFFICIAL_IDS) {
  assert.equal(r96.dailyWageFor(id), CHINA_COURT_OFFICIAL_DAILY_WAGES[id]);
  assert.equal(r96.completeDuty(duty(id)).amount, 24);
}
const oldReceipts = r96.snapshot();
assert.equal(oldReceipts.governmentPaid, 0);
assert.deepEqual(oldReceipts.legacyFunding, {initialTreasury: worldBudget, treasury: 4320 - 6 * 24, transactionCount: 6});
assert.deepEqual(oldReceipts.transactions, r96Save.transactions);
assert(!Object.hasOwn(oldReceipts, 'dailyWages'), 'Legacy scalar policy remains in its original format');
const newRates = Object.fromEntries(CHINA_OFFICIAL_IDS.map(id => [id, 99]));
const kept = createChinaOfficialEconomy({...policyOptions, saved: oldReceipts, dailyWage: 99, dailyWages: newRates});
assert.deepEqual(kept.snapshot(), oldReceipts);
assert.equal(kept.completeDuty(duty()).amount, 24);
assert(kept.completeDuty(duty()).replayed);
assert.equal(kept.history().length, 6);
assert.equal(kept.completeDuty(duty(actorId, 4)).amount, 24);
assert.equal(kept.state().governmentPaid, 24);
conserve(kept.snapshot());

// Per-actor amounts are explicit configuration, frozen once for a new ledger.
// Caller mutation and rank-table changes cannot rewrite completed transfers.
const rates = {[actorId]: 31, [otherId]: 19};
const configured = createChinaOfficialEconomy({...policyOptions, dailyWages: rates});
rates[actorId] = 999;
assert.equal(configured.dailyWageFor(actorId), 31);
assert.equal(configured.dailyWageFor(otherId), 19);
assert.equal(configured.dailyWageFor(CHINA_OFFICIAL_IDS[2]), 24);
assert.equal(configured.dailyWageFor('player'), null);
assert.equal(configured.completeDuty(duty(actorId, 3, {amount: 999})).amount, 31);
assert.equal(configured.completeDuty(duty(otherId)).amount, 19);
const configuredSaved = configured.snapshot();
const configuredReload = createChinaOfficialEconomy({...policyOptions, saved: configuredSaved, dailyWages: newRates});
assert.deepEqual(configuredReload.snapshot(), configuredSaved);
assert(configuredReload.completeDuty(duty()).replayed);
assert.equal(configuredReload.completeDuty(duty(actorId, 4)).amount, 31);
conserve(configuredReload.snapshot());
const invalidRateSave = clone(configuredSaved);
invalidRateSave.dailyWages[actorId]++;
assert.equal(createChinaOfficialEconomy({...policyOptions, saved: invalidRateSave}).loadError, 'invalid-saved-state');
for (const dailyWages of [null, [], {[actorId]: 0}, {[actorId]: 1.5}, {player: 18}]) {
  assert.equal(createChinaOfficialEconomy({...policyOptions, dailyWages}).loadError, 'invalid-config');
}
assert.equal(getChinaRecordsCareerRank('cn-records-junior').basePay, 18);
assert.equal(getChinaRecordsCareerRank('cn-records-regular').basePay, 22);

const corruptions = [
  saved => { saved.accounts[actorId].bank++; },
  saved => { saved.destinations[CHINA_OFFICIAL_TAVERN_ID] = 0; },
  saved => { saved.governmentPaid++; },
  saved => { saved.funding = 'limited-treasury'; },
  saved => { saved.nextTransaction++; },
  saved => { saved.transactions.shift(); },
  saved => { saved.transactions.reverse(); },
  saved => { saved.transactions[0].evidence.audienceCompleted = false; },
  saved => { saved.transactions[0].actorId = 'player'; },
  saved => { saved.transactions[0].after.accounts[actorId].bank++; },
  saved => { saved.transactions[0].to = `${otherId}:bank`; },
  saved => { saved.transactions[1].receiptId = saved.transactions[0].receiptId; },
  saved => { saved.transactions[0].extra = 'unvalidated'; },
  saved => { saved.accounts.extra = {bank: 0, cash: 0}; },
];
for (const corrupt of corruptions) {
  const saved = clone(roundtrip); corrupt(saved);
  const original = clone(saved); let overwritten = false;
  const broken = createChinaOfficialEconomy({...options, saved, saveState: () => {overwritten = true;}});
  assert.equal(broken.loadError, 'invalid-saved-state');
  assert.equal(broken.snapshot(), null);
  assert.equal(broken.account(actorId), null);
  code(broken.completeDuty(duty()), 'invalid-saved-state');
  assert.equal(overwritten, false);
  assert.deepEqual(saved, original);
}
const changedSource = createChinaOfficialEconomy({...options, saved: originalLegacy, initialTreasury: {...initialTreasury, amount: 9999}});
assert.equal(changedSource.loadError, 'invalid-saved-state');
for (const [base, corrupt] of [
  [originalLegacy, saved => { saved.accounts[actorId].bank++; }],
  [originalLegacy, saved => { saved.treasury++; }],
  [originalLegacy, saved => { saved.initialTreasury.amount = 0; }],
  [originalLegacy, saved => { saved.transactions[0].evidence.audienceCompleted = false; }],
  [originalLegacy, saved => { saved.transactions[0].from = 'government-guaranteed'; }],
  [originalLegacy, saved => { saved.transactions[0].after.accounts[actorId].bank++; }],
  [originalLegacy, saved => { saved.transactions.reverse(); }],
  [upgraded, saved => { saved.legacyFunding.treasury++; }],
  [upgraded, saved => { saved.legacyFunding.transactionCount--; }],
  [upgraded, saved => { saved.legacyFunding.transactionCount++; }],
  [upgraded, saved => { saved.legacyFunding.initialTreasury.amount++; }],
  [upgraded, saved => { delete saved.legacyFunding; }],
  [upgraded, saved => { saved.legacyFunding.extra = true; }],
  [upgraded, saved => { saved.legacyFunding = null; }],
]) {
  const damaged = clone(base); corrupt(damaged);
  const original = clone(damaged); let writes = 0;
  const broken = createChinaOfficialEconomy({...options, saved: damaged, saveState: () => {writes++;}});
  assert.equal(broken.loadError, 'invalid-saved-state');
  assert.equal(broken.snapshot(), null);
  code(broken.completeDuty(duty()), 'invalid-saved-state');
  assert.equal(writes, 0, 'Corrupt history must not be replaced with a fresh government ledger');
  assert.deepEqual(damaged, original);
}
console.log('PASS official economy: government-backed earned pay, six isolated accounts, cash + bank meals, exact-source refunds, atomic retries, legacy journals and corrupt-save rejection');
