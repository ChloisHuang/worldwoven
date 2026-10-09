import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createUndergroundMarketLedger, UNDERGROUND_MARKET_OPENING_STOCK, UNDERGROUND_MARKET_QUOTES,
  UNDERGROUND_MARKET_FENCE_ITEM} from '../source/game/underground-market-ledger.js';
const copy = structuredClone;
const [book, silk1, silk2, paper1, paper2] = UNDERGROUND_MARKET_OPENING_STOCK.map(i => i.id);
const action = (itemId, requestId) => ({itemId, requestId, proof: {completed: true, actionId: requestId, actorKey: 'player-life-1', buyerKey: 'merchant-life-1'}});
let assertions = 0;
function check(name, test) { test(); assertions++; console.log(`PASS ${name}`); }
function fixture(seed = null, options = {}) {
  let durable = seed == null ? {} : copy(seed), saved = copy(durable), market, bank, writes = 0;
  const flags = {fail: false, failAt: null, mode: 'false', onSave: null, onObserve: null};
  const storage = {setItem(_key, json) {
    writes++;
    flags.onSave?.(JSON.parse(json));
    if (flags.fail || writes === flags.failAt) {
      if (flags.mode === 'throw') throw Error('storage unavailable');
      if (flags.mode === 'async') return Promise.resolve(false);
      return flags.mode === 'object' ? {ok: false, code: 'test-storage-rejected'} : false;
    }
    durable = JSON.parse(json); return true;
  }};
  bank = createGameCurrencyLedger({saved, storage, transactionParticipant: tx => market?.prepareCurrencyCommit(tx)});
  const config = {saved: saved.undergroundMarket, copperLedger: bank,
    saveState(next) {
      const patch = {undergroundMarket: next}, result = storage.setItem('test', JSON.stringify({...saved, ...patch}));
      if (result === false || result?.ok === false || result?.then) return result;
      Object.assign(saved, patch); return true;
    },
    verifyAction(input) { flags.onObserve?.(input); return input.proof?.completed === true && input.proof?.actionId === input.requestId; }, ...options};
  market = createUndergroundMarketLedger(config);
  return {market, bank, flags, options, saved, durable: () => copy(durable), writes: () => writes,
    fund(amount = 100) { assert(bank.earn(amount, 'player-existing-funds').ok); },
    total() { const balance = bank.balances()?.copper; return balance.cash + balance.bank + balance.held + market.state().merchantCash; },
  };
}
check('finite original five-piece merchant stock, zero cash and no speculative work', () => {
  const f = fixture();
  assert.equal(f.market.loadError, null); assert.equal(f.market.state().merchantCash, 0);
  assert.equal(f.market.state().items.length, 5); assert.equal(f.market.state().inventory.length, 0);
  assert.equal(new Set(f.market.state().items.map(i => i.id)).size, 5);
  for (const item of f.market.state().items) {
    assert.equal(item.origin.type, 'merchant-opening-stock');
    assert.equal(item.origin.ownerId, 'cn-tavern-diner-east');
    assert.equal(item.origin.batchId, 'cn-market-opening-v1');
  }
  assert.equal(f.market.beginWork({itemId: paper1, requestId: 'work'}).code, 'insufficient-merchant-cash');
  assert.equal(f.market.fence(action(UNDERGROUND_MARKET_FENCE_ITEM, 'fence')).code, 'insufficient-merchant-cash');
  assert.equal(f.market.buy(action(book, 'buy')).code, 'insufficient-cash');
  assert.equal(f.market.state().active, null); assert.equal(f.market.state().merchantCash, 0);
});
check('observed physical action required; buy/sell conserve both wallets and original ownership', () => {
  const f = fixture(); f.fund(20);
  assert.equal(f.market.buy({itemId: book, requestId: 'missing-action'}).code, 'market-action-incomplete');
  assert(f.market.buy(action(book, 'purchase')).ok);
  assert.equal(f.bank.balances().copper.cash, 14); assert.equal(f.bank.balances().copper.held, 0);
  assert.equal(f.market.state().merchantCash, 6); assert.equal(f.market.state().inventory[0].id, book);
  assert.equal(f.total(), 20); assert.equal(f.market.state().stock.length, 4);
  assert.equal(f.market.buy(action(book, 'another-purchase')).code, 'market-item-unavailable');
  assert.equal(f.market.sell(action(silk1, 'not-owned')).code, 'market-item-not-owned');
  assert.equal(f.market.sell({itemId: book, requestId: 'missing-sale-action'}).code, 'market-action-incomplete');
  assert(f.market.sell(action(book, 'sale')).ok);
  assert.equal(f.bank.balances().copper.cash, 17); assert.equal(f.market.state().merchantCash, 3);
  assert.equal(f.market.state().stock.length, 5); assert.equal(f.total(), 20);
});
check('idempotent requests survive reload; reuse for another kind or item rejected', () => {
  const f = fixture(); f.fund(); assert(f.market.buy(action(book, 'one')).ok);
  const count = f.writes(); assert(f.market.buy({itemId: book, requestId: 'one'}).replayed); assert.equal(f.writes(), count);
  assert.equal(f.market.buy(action(silk1, 'one')).code, 'market-request-conflict');
  assert.equal(f.market.sell(action(book, 'one')).code, 'market-request-conflict');
  const r = fixture(f.durable()); assert.equal(r.market.loadError, null);
  assert(r.market.buy(action(book, 'one')).replayed); assert.equal(r.bank.balances().copper.cash, 94);
  assert(r.market.sell(action(book, 'two')).ok); const rr = fixture(r.durable());
  assert(rr.market.sell(action(book, 'two')).replayed); assert.equal(rr.bank.balances().copper.cash, 97);
  assert.equal(rr.total(), 100);
});
check('all stock exhausts permanently without a clock/refill path', () => {
  const f = fixture(); f.fund(30);
  for (const [index, item] of UNDERGROUND_MARKET_OPENING_STOCK.entries()) assert(f.market.buy(action(item.id, `all-${index}`)).ok);
  assert.equal(f.market.state().stock.length, 0); assert.equal(f.market.state().inventory.length, 5);
  const r = fixture(f.durable()); assert.equal(r.market.state().stock.length, 0); assert.equal(r.total(), 30);
  assert.equal(r.market.buy(action(paper2, 'daily-refill')).code, 'market-item-unavailable');
  assert.equal(r.market.beginWork({itemId: paper2, requestId: 'invented-work'}).code, 'market-work-unavailable');
  assert.equal(r.market.buy(action('invented-item', 'invented')).code, 'market-item-unavailable');
});
check('save failure on reserve changes neither player copper nor merchant inventory', () => {
  for (const mode of ['false', 'throw', 'object', 'async']) {
    const f = fixture(); f.fund(); const before = f.durable(); f.flags.fail = true; f.flags.mode = mode;
    assert(!f.market.buy(action(book, 'failed')).ok);
    assert.equal(f.bank.balances().copper.cash, 100); assert.equal(f.market.state().merchantCash, 0);
    assert.equal(f.market.state().active, null); assert.deepEqual(f.durable(), before);
    f.flags.fail = false; assert(f.market.buy(action(book, 'failed')).ok); assert.equal(f.total(), 100);
  }
});
check('interrupted settle preserves one hold; reload recovery settles without another physical action', () => {
  const f = fixture(); f.fund(); f.flags.failAt = f.writes() + 2;
  assert(!f.market.buy(action(book, 'reserved')).ok);
  assert.equal(f.bank.balances().copper.cash, 94); assert.equal(f.bank.balances().copper.held, 6);
  assert.equal(f.market.state().merchantCash, 0); assert.equal(f.market.state().active.kind, 'buy'); assert.equal(f.total(), 100);
  assert.equal(f.market.beginWork({itemId: paper1, requestId: 'concurrent'}).code, 'market-order-active');
  assert.equal(f.market.buy(action(silk1, 'concurrent')).code, 'market-order-active');
  const r = fixture(f.durable()); assert.equal(r.market.loadError, null); assert(r.market.recover().ok);
  assert.equal(r.bank.balances().copper.held, 0); assert.equal(r.market.state().merchantCash, 6);
  assert.equal(r.market.state().inventory[0].id, book); assert.equal(r.total(), 100);
  assert(r.market.recover().ok); assert(r.market.buy({itemId: book, requestId: 'reserved'}).replayed);
});
check('pending purchase can be refunded once without producing merchant cash or goods', () => {
  const f = fixture(); f.fund(); f.flags.failAt = f.writes() + 2;
  assert(!f.market.buy(action(book, 'cancel-buy')).ok); f.flags.failAt = null;
  assert(f.market.cancelPending().ok); assert.equal(f.bank.balances().copper.cash, 100);
  assert.equal(f.market.state().merchantCash, 0); assert.equal(f.market.state().inventory.length, 0);
  assert(f.market.cancelBuy('cancel-buy').replayed);
  assert.equal(f.market.buy(action(book, 'cancel-buy')).code, 'market-request-cancelled');
  assert.equal(fixture(f.durable()).market.loadError, null);
});
check('work is cash-backed, serialized, once per original paper, and changes that same item', () => {
  const f = fixture(); f.fund(); assert(f.market.buy(action(book, 'fund-work')).ok);
  assert(f.market.beginWork({itemId: paper1, requestId: 'work-one'}).ok);
  assert.equal(f.market.state().availableCash, 4); assert.equal(f.market.state().merchantCash, 6);
  assert(f.market.beginWork({itemId: paper1, requestId: 'work-one'}).replayed);
  assert.equal(f.market.beginWork({itemId: paper2, requestId: 'work-parallel'}).code, 'market-order-active');
  assert.equal(f.market.sell(action(book, 'spend-reserved')).code, 'market-order-active');
  assert.equal(f.market.completeWork({requestId: 'work-one'}).code, 'market-action-incomplete');
  const r = fixture(f.durable()); assert.equal(r.market.loadError, null);
  assert(r.market.completeWork(action(paper1, 'work-one')).ok);
  assert.equal(r.market.state().merchantCash, 4); assert.equal(r.bank.balances().copper.cash, 96); assert.equal(r.total(), 100);
  const paper = r.market.state().items.find(i => i.id === paper1);
  assert.equal(paper.kind, 'writing-paper'); assert.equal(paper.worked, true); assert.equal(paper.owner, 'merchant');
  assert.equal(r.market.beginWork({itemId: paper1, requestId: 'repeat-work'}).code, 'market-work-unavailable');
  assert(r.market.completeWork(action(paper1, 'work-one')).replayed);
  assert(r.market.beginWork({itemId: paper2, requestId: 'work-two'}).ok); assert(r.market.completeWork(action(paper2, 'work-two')).ok);
  assert.equal(r.market.state().merchantCash, 2); assert.equal(r.market.sell(action(book, 'cash-short')).code, 'insufficient-merchant-cash');
  assert(r.market.buy(action(paper1, 'buy-sorted')).ok); assert.equal(r.market.state().inventory.find(i => i.id === paper1).kind, 'writing-paper');
  assert.equal(r.total(), 100); assert.equal(fixture(r.durable()).market.loadError, null);
});
check('work save failure/cancel preserves unworked original and never pays twice', () => {
  const f = fixture(); f.fund(); assert(f.market.buy(action(book, 'fund')).ok);
  f.flags.fail = true; assert(!f.market.beginWork({itemId: paper1, requestId: 'start-fail'}).ok); assert.equal(f.market.state().active, null);
  f.flags.fail = false; assert(f.market.beginWork({itemId: paper1, requestId: 'start-fail'}).ok);
  const before = f.durable(); f.flags.fail = true; assert(!f.market.completeWork(action(paper1, 'start-fail')).ok);
  assert.equal(f.bank.balances().copper.cash, 94); assert.equal(f.market.state().merchantCash, 6); assert.deepEqual(f.durable(), before);
  f.flags.fail = false; assert(f.market.cancelPending().ok); assert.equal(f.market.state().items.find(i => i.id === paper1).worked, false);
  assert(f.market.cancelWork('start-fail').replayed); assert(!f.market.completeWork(action(paper1, 'start-fail')).ok);
  assert(f.market.beginWork({itemId: paper1, requestId: 'restart'}).ok); assert(f.market.completeWork(action(paper1, 'restart')).ok);
  assert.equal(f.total(), 100);
});
check('sale failure cannot transfer original ownership or credit money', () => {
  const f = fixture(); f.fund(); assert(f.market.buy(action(silk1, 'buy')).ok);
  const before = f.durable(); f.flags.fail = true; assert(!f.market.sell(action(silk1, 'sell')).ok);
  assert.equal(f.bank.balances().copper.cash, 96); assert.equal(f.market.state().inventory[0].id, silk1); assert.deepEqual(f.durable(), before);
  f.flags.fail = false; assert(f.market.sell(action(silk1, 'sell')).ok); assert.equal(f.total(), 100);
});
check('reload rejects invented balances, duplicated events, omitted market and mismatched currency receipts', () => {
  const f = fixture(); f.fund(); assert(f.market.buy(action(book, 'buy')).ok); assert(f.market.sell(action(book, 'sell')).ok);
  const edits = [
    s => { s.undergroundMarket.merchantCash = 1000; },
    s => { s.undergroundMarket.events[0].itemId = 'invented-item'; },
    s => { s.undergroundMarket.events[0].amount = 1; },
    s => { s.undergroundMarket.events.push(copy(s.undergroundMarket.events.at(-1))); s.undergroundMarket.revision++; },
    s => { s.undergroundMarket.events.pop(); s.undergroundMarket.revision--; },
    s => { delete s.undergroundMarket; },
    s => { delete s.copperLedger; },
    s => { s.undergroundMarket.events[2].requestId = 'invented-receipt'; },
  ];
  for (const edit of edits) { const save = f.durable(); edit(save); const r = fixture(save); assert(r.market.loadError); assert(!r.market.buy(action(silk2, 'blocked')).ok); }
});
check('quote overrides require positive integer buy strictly above sell and persist across reload', () => {
  for (const quote of [{buy: 3, sell: 3}, {buy: 2, sell: 3}, {buy: 0, sell: 1}, {buy: 3.5, sell: 1}, {buy: 3, sell: 0}]) {
    assert(fixture(null, {quotes: {'old-book': quote}}).market.loadError);
  }
  const f = fixture(null, {quotes: {'old-book': {buy: 9, sell: 4}}}); f.fund(); assert(f.market.buy(action(book, 'custom')).ok);
  assert.equal(f.market.state().merchantCash, 9); assert(f.market.sell(action(book, 'custom-sell')).ok); assert.equal(f.total(), 100);
  assert.equal(fixture(f.durable()).market.state().quotes['old-book'].buy, 9);
  assert.equal(fixture(f.durable(), {quotes: UNDERGROUND_MARKET_QUOTES}).market.loadError, 'market-quote-mismatch');
});
check('raw market currency commands require live market transaction consent', () => {
  const f = fixture(); f.fund();
  for (const id of ['cn-market:sell:fake', 'cn-market:work:fake', 'cn-market:fence:fake']) assert.equal(f.bank.earn(2, id).code, 'market-action-required');
  assert.equal(f.bank.reserve(6, 'cn-market:buy:fake').code, 'market-action-required'); assert.equal(f.total(), 100);
});
check('reentrant observed actions and storage writes cannot start parallel work/trades', () => {
  const f = fixture(); f.fund(); const results = [];
  f.flags.onObserve = () => results.push(f.market.beginWork({itemId: paper1, requestId: 'nested-observation'}));
  f.flags.onSave = () => results.push(f.market.buy(action(silk1, 'nested-storage')));
  assert(f.market.buy(action(book, 'real')).ok);
  assert(results.length >= 3); assert(results.every(r => !r.ok && r.code === 'market-busy'));
  assert.equal(f.market.state().inventory.length, 1); assert.equal(f.total(), 100);
});
check('fencing jointly locks/adopts original source and market; only finite funded purchase once', () => {
  let source = {held: true, receipt: null}, locked = false, releases = 0, failLock = false;
  const options = {
    prepareFence(input) {
      if (!source.held) return {ok: false, code: 'original-item-missing'};
      const base = source, next = {held: false, receipt: {requestId: input.requestId, itemId: input.itemId, sellerKey: input.proof.actorKey, buyerKey: input.proof.buyerKey}};
      return {ok: true, patch: {originalSource: copy(next)}, valid: () => !locked && source === base,
        lock() { locked = true; return !failLock; }, release() { locked = false; releases++; },
        committed() { assert(locked); source = next; return true; }};
    },
    verifyFenceReceipt: e => source.receipt?.requestId === e.requestId && source.receipt.itemId === e.itemId && source.receipt.sellerKey === e.sellerKey && source.receipt.buyerKey === e.buyerKey,
  };
  const f = fixture(null, options); f.fund(); assert(f.market.buy(action(book, 'fund-fence')).ok);
  f.flags.fail = true; assert(!f.market.fence(action(UNDERGROUND_MARKET_FENCE_ITEM, 'fence')).ok);
  assert(source.held); assert(!locked); assert.equal(f.market.state().merchantCash, 6); assert.equal(f.bank.balances().copper.cash, 94);
  f.flags.fail = false; failLock = true; assert(!f.market.fence(action(UNDERGROUND_MARKET_FENCE_ITEM, 'fence')).ok);
  assert(source.held); assert(!locked); failLock = false;
  assert(f.market.fence(action(UNDERGROUND_MARKET_FENCE_ITEM, 'fence')).ok);
  assert(!source.held); assert(!locked); assert.equal(f.market.state().merchantCash, 0); assert.equal(f.bank.balances().copper.cash, 100);
  assert.deepEqual(f.durable().originalSource, source); assert.equal(f.total(), 100); assert.equal(releases, 3);
  assert(f.market.fence(action(UNDERGROUND_MARKET_FENCE_ITEM, 'fence')).replayed);
  assert.equal(f.market.fence(action(UNDERGROUND_MARKET_FENCE_ITEM, 'different')).code, 'market-fence-unavailable');
  const r = fixture(f.durable(), options); assert.equal(r.market.loadError, null); assert(r.market.fence(action(UNDERGROUND_MARKET_FENCE_ITEM, 'fence')).replayed);
  assert.equal(fixture(f.durable()).market.loadError, 'market-fence-source-mismatch');
  const identityAltered = f.durable(); identityAltered.undergroundMarket.events.at(-1).sellerKey = 'different-life'; assert.equal(fixture(identityAltered, options).market.loadError, 'market-fence-source-mismatch');
  const altered = f.durable(); altered.undergroundMarket.events.at(-1).itemId = 'new-patrol-token'; assert(fixture(altered, options).market.loadError);
});
check('fencing cannot smuggle wallet/market patches or use a non-lock-aware participant', () => {
  for (const prepareFence of [() => ({ok: true, patch: {}}), () => ({ok: true, patch: {copperLedger: {}}, valid: () => true, lock: () => true, release() {}, committed() {}})]) {
    const f = fixture(null, {prepareFence}); f.fund(); assert(f.market.buy(action(book, 'fund')).ok);
    assert.equal(f.market.fence(action(UNDERGROUND_MARKET_FENCE_ITEM, 'fence')).code, 'invalid-market-fence-participant'); assert.equal(f.total(), 100);
  }
});
console.log(`PASS underground market: ${assertions} focused economic groups`);
