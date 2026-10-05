// Actual temporary services and shared ledger, without scene/route duplication.
// Reproduces old paid slips and split job/bank saves across reload and day changes.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {createChinaTavernLabor} from '../source/game/china-tavern-labor.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createCopperLedger} from '../source/game/copper-ledger.js';
registerHooks({resolve(id, context, next) {
  return id === 'three' ? {url: new URL('../source/vendor/three/build/three.module.js', import.meta.url).href, shortCircuit: true} : next(id, context);
}});
const {createFranceGardenerLabor} = await import('../source/game/france-gardener-labor.js');
const {FRANCE_GARDENER} = await import('../source/game/france-gardener-place.js');
const copy = value => JSON.parse(JSON.stringify(value));
const contracts = [
  {source: 'cn-tavern-labor', role: 'cn-tavern-helper', amount: 12, factory: createChinaTavernLabor,
    position: [22.35, .215, 11.7], progress: {completedTables: 2}},
  {source: 'fr-garden-labor', role: 'fr-garden-helper', amount: 6, factory: createFranceGardenerLabor,
    position: FRANCE_GARDENER.registration, progress: {completedBeds: 2, cancelled: false}},
];
function fixture(contract, prior) {
  const id = `${contract.source}-23`, store = copy(prior ?? {
    appearance: {nickname: '原昵称', seed: 42}, otherProgress: {untouched: true},
    bank: {version: 1, cash: 37, bank: 0, accountOpened: false, nextTransaction: 1, transactions: []},
    labor: {version: 1, serial: 23, job: {id, receiptId: id, stage: 'ready', ...contract.progress}},
  });
  const flags = {bank: false, labor: false, cleanup: false}, clock = {day: 7}, events = [], notices = [];
  const save = key => next => {
    if (flags[key] || key === 'labor' && flags.cleanup && !next.job) return false;
    store[key] = copy(next);
  };
  const bank = createCurrencyLedger({saved: store.bank, saveState: save('bank'), onTransaction: tx => {
    assert.deepEqual(store.bank.transactions.at(-1), tx, 'money event follows durable save'); events.push(tx);
  }});
  const [x, y, z] = contract.position, player = {walking: false, root: {position: {x, y, z}}};
  const labor = contract.factory({copperLedger: bank, getClock: () => clock, getPlayer: () => player,
    host: {walking: false, root: {position: {x: 24.1, y: .215, z: 11.4}}},
    gardener: {hostReady: () => true, loanState: () => ({owner: null, borrowed: false})},
    saved: store.labor, saveState: save('labor'), notify: text => notices.push(text), document: null});
  return {id, store, flags, clock, events, notices, bank, labor};
}
for (const contract of contracts) {
  await test(`${contract.role}: new settlement deposits original copper and leaves carried money alone`, () => {
    const f = fixture(contract);
    assert.equal(f.labor.state().loadError, null);
    assert.match(f.labor.intent('claim').action, /验收后工资存银行/);
    assert(f.labor.claim());
    assert.equal(f.bank.state().cash, 37); assert.equal(f.bank.state().bank, contract.amount);
    assert.equal(f.bank.state().balances.france.bank, 0, 'temporary French contract is still copper');
    const tx = f.bank.history()[0];
    assert.deepEqual([tx.action, tx.amount, tx.currency, tx.requestId, tx.roleId, tx.day],
      ['wage', contract.amount, 'copper', f.id, contract.role, 7]);
    assert.notEqual(tx.day, 23, 'work serial is never a game date');
    assert.equal(f.events.length, 1); assert.equal(f.labor.claim(), false); assert.equal(f.bank.history().length, 1);
    assert.deepEqual(f.store.appearance, {nickname: '原昵称', seed: 42}); assert.deepEqual(f.store.otherProgress, {untouched: true});
    assert(f.notices.some(text => /钱庄取款后才进入钱包/.test(text)));
  });
  await test(`${contract.role}: legacy paid cash receipt survives migration and repeated cleanup failure`, () => {
    const seed = fixture(contract);
    const legacy = createCopperLedger({saved: seed.store.bank}); assert(legacy.earn(contract.amount, seed.id).ok);
    seed.store.bank = legacy.state(); const original = copy(seed.store.bank);
    const f = fixture(contract, seed.store); f.flags.cleanup = true;
    assert(f.labor.claim()); assert(f.labor.claim());
    assert.equal(f.bank.state().cash, 37 + contract.amount); assert.equal(f.bank.state().bank, 0);
    assert.equal(f.events.length, 0); assert.deepEqual(f.store.bank, original, 'old receipt is neither rewritten nor reclaimed');
    const loaded = fixture(contract, f.store); loaded.clock.day = 12;
    assert(loaded.labor.claim()); assert.equal(loaded.labor.active(), false);
    assert.equal(loaded.bank.history().length, 1); assert.equal(loaded.bank.state().cash, 37 + contract.amount);
    assert.equal(loaded.bank.state().bank, 0); assert.equal(loaded.events.length, 0);
    assert.match(loaded.notices.at(-1), /旧工钱保留/);
  });
  await test(`${contract.role}: failed job/bank writes keep receivable and first settlement day`, () => {
    const f = fixture(contract); f.flags.labor = true;
    assert.equal(f.labor.claim(), false); assert.equal(f.bank.history().length, 0);
    assert.equal(f.labor.state().job.settlementDay, undefined);
    f.flags.labor = false; f.flags.bank = true;
    assert.equal(f.labor.claim(), false); assert.equal(f.labor.state().job.stage, 'ready');
    assert.equal(f.labor.state().job.settlementDay, 7); assert.equal(f.bank.state().cash, 37);
    assert.equal(f.bank.state().bank, 0); assert.equal(f.events.length, 0);
    const loaded = fixture(contract, f.store); loaded.clock.day = 8;
    assert(loaded.labor.claim()); assert.equal(loaded.bank.state().bank, contract.amount);
    assert.equal(loaded.bank.history()[0].day, 7); assert.equal(loaded.events.length, 1);
  });
  await test(`${contract.role}: canonical wage replays after cleanup failure, reload and next day`, () => {
    const f = fixture(contract); f.flags.cleanup = true; assert(f.labor.claim());
    const original = copy(f.bank.history()[0]); assert.equal(f.store.labor.job.stage, 'ready');
    f.clock.day = 9; assert(f.labor.claim()); assert.equal(f.events.length, 1);
    // A durable wage must also recover an older slip lacking its date marker.
    delete f.store.labor.job.settlementDay;
    const loaded = fixture(contract, f.store); loaded.clock.day = 14;
    assert(loaded.labor.claim()); assert.equal(loaded.labor.active(), false);
    assert.deepEqual(loaded.bank.history(), [original]); assert.equal(loaded.events.length, 0);
    assert.equal(loaded.bank.state().cash, 37); assert.equal(loaded.bank.state().bank, contract.amount);
    assert.equal(loaded.bank.earn(contract.amount, f.id).code, 'request-conflict', 'old and new wage paths share the same ID');
  });
}
