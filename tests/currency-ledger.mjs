// Target the risks introduced by the shared ledger migration: surviving IDs and
// holds, atomic wages/FX, durable replay, failed saves, and presentation isolation.
import assert from 'node:assert/strict';
import {createCopperLedger} from '../source/game/copper-ledger.js';
import {createGameStorage, PREVIEW_STORAGE_PREFIX} from '../source/game/game-storage.js';
import {createCurrencyLedger, createGameCurrencyLedger, EXCHANGE_RATE_VERSION} from '../source/game/currency-ledger.js';
const clone = value => JSON.parse(JSON.stringify(value));
const code = (result, expected) => {assert.equal(result.ok, false); assert.equal(result.code, expected);};
const fixture = (cash = 20, bank = 0, accountOpened = false) => ({version: 1, cash, bank, accountOpened, nextTransaction: 1, transactions: []});
const wage = (changes = {}) => ({amount: 20, receiptId: 'career:clerk:4', currency: 'copper', roleId: 'court-clerk', slotId: 'clerk', day: 4, ...changes});
let legacy;
const v1 = createCopperLedger({saved: fixture(40), saveState: next => {legacy = next;}});
assert(v1.openAccount('old-open').ok);
assert(v1.deposit(10, 'old-deposit').ok);
assert(v1.earn(12, 'old-wage').ok);
assert(v1.reserve(7, 'old-pending-meal').ok);
assert(v1.reserve(3, 'old-finished-meal').ok);
assert(v1.settle('old-finished-meal').ok);
const unchangedLegacy = clone(legacy);
let writes = 0, durable;
const events = [];
let ledger = createCurrencyLedger({saved: legacy, saveState: next => {durable = next; writes++;}, onTransaction: tx => events.push(tx)});
assert.equal(writes, 0, 'Loading a valid v1 save does not mutate storage');
assert.deepEqual(ledger.state().legacyCopper, unchangedLegacy, 'The exact copper snapshot/journal is preserved');
assert.deepEqual([ledger.state().cash, ledger.state().bank, ledger.balances().copper.held], [32, 10, 7]);
assert(ledger.earn(12, 'old-wage').replayed);
assert(ledger.settle('old-finished-meal').replayed);
code(ledger.earn(13, 'old-wage'), 'request-conflict');
code(ledger.creditWageToBank(wage({receiptId: 'old-wage', amount: 12})), 'request-conflict');
assert.equal(events.length, 0, 'Old receipts never produce an animation event');
assert.equal(writes, 0);
const paid = ledger.creditWageToBank(wage());
assert(paid.ok && !paid.replayed);
assert.equal(paid.receiptId, wage().receiptId);
assert.deepEqual([ledger.state().cash, ledger.state().bank], [32, 30]);
assert.deepEqual(durable.legacyCopper, unchangedLegacy);
assert.deepEqual(legacy, unchangedLegacy);
assert(ledger.creditWageToBank(wage()).replayed);
for (const changed of [{amount: 19}, {currency: 'japan'}, {day: 5}, {slotId: 'other'}, {roleId: 'other'}]) code(ledger.creditWageToBank(wage(changed)), 'request-conflict');
assert.equal(writes, 1);
assert.equal(events.length, 1);
assert.equal(events[0].action, 'wage');
assert.deepEqual(events[0].before.copper, {cash: 32, bank: 10, accountOpened: true});
assert.deepEqual(events[0].after.copper, {cash: 32, bank: 30, accountOpened: true});
ledger = createCurrencyLedger({saved: durable, saveState: next => {durable = next; writes++;}, onTransaction: tx => events.push(tx)});
assert.equal(ledger.loadError, null);
assert(ledger.creditWageToBank(wage()).replayed);
assert(ledger.earn(12, 'old-wage').replayed);
assert.equal(events.length, 1);
assert(ledger.refund('old-pending-meal').ok);
assert(ledger.refund('old-pending-meal').replayed);
assert.equal(ledger.state().cash, 39);
assert.equal(ledger.reservations().find(h => h.id === 'old-pending-meal').currency, 'copper');
code(ledger.refund('old-finished-meal'), 'reservation-settled');

// A new payroll account and the full wage reach storage together; failure never
// opens an account or changes cash, holds, receipt maps or nextTransaction.
for (const failure of ['throw', 'false', 'promise']) {
  let reject = true;
  let atomic;
  atomic = createCurrencyLedger({saveState: () => {
    assert.equal(atomic.balances().copper.accountOpened, false);
    assert.equal(atomic.balances().copper.bank, 0);
    code(atomic.creditWageToBank(wage()), 'ledger-busy');
    if (reject && failure === 'throw') throw Error('quota');
    if (reject && failure === 'false') return false;
    if (reject) return Promise.reject(Error('offline'));
  }});
  const before = atomic.state();
  code(atomic.creditWageToBank(wage()), failure === 'promise' ? 'async-save-unsupported' : 'save-failed');
  assert.deepEqual(atomic.state(), before);
  reject = false;
  assert(atomic.creditWageToBank(wage()).ok);
  assert.deepEqual(atomic.balances().copper, {cash: 0, bank: 20, accountOpened: true, held: 0});
}
await Promise.resolve();
code(createCurrencyLedger().creditWageToBank(wage()), 'persistence-unavailable');
for (const amount of [-1, 0, .2, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '20', null, undefined, 1n]) {
  code(ledger.creditWageToBank(wage({receiptId: 'bad', amount})), 'invalid-amount');
}
const full = createCurrencyLedger({saved: fixture(Number.MAX_SAFE_INTEGER), saveState: () => {throw Error('must not save');}});
code(full.creditWageToBank(wage({amount: 1})), 'balance-overflow');
const heldMax = createCopperLedger({saved: fixture(Number.MAX_SAFE_INTEGER)});
assert(heldMax.reserve(10, 'max-hold').ok);
const heldFull = createCurrencyLedger({saved: heldMax.state(), saveState: () => {}});
code(heldFull.creditWageToBank(wage({amount: 1})), 'balance-overflow');
assert(heldFull.refund('max-hold').ok);
assert.equal(heldFull.state().cash, Number.MAX_SAFE_INTEGER);

// Fixed rational rates use integer floor arithmetic, charge only wallet funds,
// and atomically change both currencies. Retrying uses the original rate quote.
let fxSaved, fxWrites = 0, failFX = false;
const fxEvents = [];
let fx = createCurrencyLedger({saved: fixture(100, 30, true), saveState: next => {
  if (failFX) throw Error('full');
  fxSaved = next; fxWrites++;
}, onTransaction: tx => fxEvents.push(tx)});
const q = fx.quoteExchange({from: 'copper', to: 'japan', amount: 9});
assert(q.ok);
assert.deepEqual(q.quote, {version: EXCHANGE_RATE_VERSION, from: 'copper', to: 'japan', amount: 9, received: 4, numerator: 1, denominator: 2, rounding: 'floor', fee: 0});
const beforeFX = fx.state();
failFX = true;
code(fx.exchange({quote: q.quote, requestId: 'fx-1'}), 'save-failed');
assert.deepEqual(fx.state(), beforeFX);
assert.equal(fxEvents.length, 0);
failFX = false;
code(fx.exchange({quote: {...q.quote, version: 'unseen-rate'}, requestId: 'fx-1'}), 'rate-mismatch');
code(fx.exchange({quote: {...q.quote, received: 5}, requestId: 'fx-1'}), 'rate-mismatch');
assert.equal(fxWrites, 0);
assert(fx.exchange({quote: q.quote, requestId: 'fx-1'}).ok);
assert.deepEqual([fx.balances().copper.cash, fx.balances().japan.cash, fx.balances().copper.bank], [91, 4, 30]);
assert(fx.exchange({quote: q.quote, requestId: 'fx-1'}).replayed);
assert.equal(fxWrites, 1);
assert.equal(fxEvents.length, 1);
const lockedQuote = clone(q.quote);
q.quote.received = 999;
assert.deepEqual(fx.history().at(-1).quote, lockedQuote, 'Caller cannot alter the stored exchange quote');
fx = createCurrencyLedger({saved: fxSaved, saveState: next => {fxSaved = next; fxWrites++;}, onTransaction: tx => fxEvents.push(tx)});
assert.equal(fx.loadError, null);
assert(fx.exchange({quote: lockedQuote, requestId: 'fx-1'}).replayed);
assert.equal(fxEvents.length, 1);
const back = fx.quoteExchange({from: 'japan', to: 'copper', amount: 4});
assert(fx.exchange({quote: back.quote, requestId: 'fx-back'}).ok);
assert.equal(fx.balances().copper.cash, 99, 'Round trips cannot generate money');
code(fx.quoteExchange({from: 'copper', to: 'france', amount: 1}), 'exchange-too-small');
code(fx.quoteExchange({from: 'france', to: 'copper', amount: Number.MAX_SAFE_INTEGER}), 'balance-overflow');
code(fx.exchange({quote: fx.quoteExchange({from: 'copper', to: 'japan', amount: 101}).quote, requestId: 'bank-is-not-cash'}), 'insufficient-cash');
assert(fx.creditWageToBank(wage({amount: 8, currency: 'japan', receiptId: 'jp-job'})).ok);
assert.equal(fx.balances().japan.cash, 0);
assert(fx.withdraw(8, 'jp-withdraw', 'japan').ok);
assert(fx.reserve(5, 'jp-meal', 'japan').ok);
assert(fx.reserve(3, 'copper-meal').ok);
assert(fx.refund('jp-meal').ok);
assert.deepEqual([fx.balances().japan.cash, fx.balances().copper.cash, fx.balances().copper.held], [8, 96, 3]);
assert(fx.refund('copper-meal').ok);
assert(fx.settle('old-finished-meal').ok === false);

// Presentation callbacks receive copies and cannot mutate/reenter the ledger.
let animationLedger, delivered;
animationLedger = createCurrencyLedger({saveState: () => {}, onTransaction: tx => {
  delivered = clone(tx);
  tx.after.copper.bank = 999;
  code(animationLedger.withdraw(20, 'animation-steal'), 'ledger-busy');
  throw Error('animation unavailable');
}});
assert(animationLedger.creditWageToBank(wage()).ok);
assert.equal(animationLedger.state().bank, 20);
assert(animationLedger.creditWageToBank(wage()).replayed);
assert.equal(animationLedger.state().cash, 0);
assert.equal(delivered.after.copper.bank, 20);

// Invalid legacy/v2 storage is locked and left intact, never silently replaced.
for (const corrupt of [{...fixture(), cash: -1}, {...fxSaved, balances: {...fxSaved.balances, copper: {...fxSaved.balances.copper, cash: 1}}},
  {...fxSaved, transactions: fxSaved.transactions.slice(1)}]) {
  let written = false;
  const original = clone(corrupt), broken = createCurrencyLedger({saved: corrupt, saveState: () => {written = true;}});
  assert.equal(broken.loadError, 'invalid-saved-state');
  assert.equal(broken.balances(), null);
  assert.equal(broken.state().cash, null);
  code(broken.creditWageToBank(wage()), 'invalid-saved-state');
  assert.equal(written, false);
  assert.deepEqual(corrupt, original);
}

// The game integration accepts the selected store; an appearance preview must
// write only that injected store and retain unrelated game progress.
const game = {visited: ['china'], stamps: {china: 2}, copperLedger: clone(unchangedLegacy)};
const originalGame = JSON.stringify(game), production = new Map([['worlds-days-v1', originalGame]]), preview = new Map();
const storage = createGameStorage({preview: true, normal: {getItem: key => production.get(key), setItem: () => {throw Error('preview cannot write production');}},
  session: {getItem: key => preview.get(key) ?? null, setItem: (key, value) => {preview.set(key, value);}}});
assert.equal(storage.getItem('worlds-days-v1'), originalGame);
const injected = createGameCurrencyLedger({saved: game, storage});
assert(injected.creditWageToBank(wage()).ok);
assert.equal(production.get('worlds-days-v1'), originalGame);
assert.deepEqual(JSON.parse(preview.get(PREVIEW_STORAGE_PREFIX + 'worlds-days-v1')).stamps, {china: 2});
assert.equal(game.copperLedger.balances.copper.bank, 30);
for (const failure of ['throw', 'false', 'promise']) {
  const game = {copperLedger: clone(unchangedLegacy)}, before = clone(game);
  const denied = createGameCurrencyLedger({saved: game, storage: {setItem() {
    if (failure === 'throw') throw Error('quota');
    return failure === 'false' ? false : Promise.reject(Error('offline'));
  }}});
  assert.equal(denied.creditWageToBank(wage()).ok, false);
  assert.deepEqual(game, before);
}
await Promise.resolve();
console.log('PASS currency ledger: legacy migration, bank wages, atomic FX, stable holds, storage and presentation isolation');
