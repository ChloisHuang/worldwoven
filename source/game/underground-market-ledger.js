// CR05: finite, original merchant stock. Currency and both sides of each trade
// commit through createGameCurrencyLedger's synchronous transaction participant.
// No clock, replenishment, subsidy, random stock or independent wallet exists.
export const UNDERGROUND_MARKET_SAVE_KEY = 'undergroundMarket';
export const UNDERGROUND_MARKET_MERCHANT_ID = 'cn-tavern-diner-east';
export const UNDERGROUND_MARKET_FENCE_ITEM = 'cn-sealed-patrol-token';
export const UNDERGROUND_MARKET_FENCE_PRICE = 6;
export const UNDERGROUND_MARKET_WORK_WAGE = 2;
export const UNDERGROUND_MARKET_WORK_SECONDS = 8;
export const UNDERGROUND_MARKET_QUOTES = Object.freeze({
  'old-book': Object.freeze({buy: 6, sell: 3}),
  silk: Object.freeze({buy: 4, sell: 2}),
  'old-paper': Object.freeze({buy: 3, sell: 1}),
  'writing-paper': Object.freeze({buy: 3, sell: 1}),
});
const origin = Object.freeze({type: 'merchant-opening-stock', batchId: 'cn-market-opening-v1', ownerId: UNDERGROUND_MARKET_MERCHANT_ID});
export const UNDERGROUND_MARKET_OPENING_STOCK = Object.freeze([
  ['cn-market-old-book-1', 'old-book', '旧书'],
  ['cn-market-silk-1', 'silk', '碎绢'], ['cn-market-silk-2', 'silk', '碎绢'],
  ['cn-market-old-paper-1', 'old-paper', '待整理旧纸'], ['cn-market-old-paper-2', 'old-paper', '待整理旧纸'],
].map(([id, kind, label]) => Object.freeze({id, kind, label, origin})));
const PREFIX = 'cn-market:';
const copy = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => integer(value) && value > 0;
const identityValid = value => typeof value === 'string' && value.length > 0 && value.length <= 192 && value.trim() === value;
const idValid = value => typeof value === 'string' && value.length > 0 && value.length <= 72 && value.trim() === value;
const exactKeys = (value, keys) => object(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const receiptId = (kind, id) => `${PREFIX}${kind}:${id}`;
const relevant = tx => typeof tx?.requestId === 'string' && tx.requestId.startsWith(PREFIX) || typeof tx?.reservationId === 'string' && tx.reservationId.startsWith(PREFIX);
function normalizeQuotes(input = {}) {
  if (!object(input) || Object.keys(input).some(kind => !Object.hasOwn(UNDERGROUND_MARKET_QUOTES, kind))) throw Error('invalid-market-quotes');
  const quotes = {};
  for (const [kind, defaultQuote] of Object.entries(UNDERGROUND_MARKET_QUOTES)) {
    const q = input[kind] ?? defaultQuote;
    if (!exactKeys(q, ['buy', 'sell']) || !positive(q.buy) || !positive(q.sell) || q.buy <= q.sell) throw Error('invalid-market-quotes');
    quotes[kind] = {buy: q.buy, sell: q.sell};
  }
  return quotes;
}
const empty = quotes => ({version: 1, revision: 0, quotes, events: []});
const eventKeys = ['sequence', 'kind', 'requestId', 'itemId', 'amount'];
function monetaryEvent(e) {
  if (e.kind === 'buy-reserve') return {action: 'reserve', requestId: receiptId('buy', e.requestId), amount: e.amount};
  if (e.kind === 'buy-settle' || e.kind === 'buy-refund') {
    const action = e.kind === 'buy-settle' ? 'settle' : 'refund', reservationId = receiptId('buy', e.requestId);
    return {action, requestId: JSON.stringify([action, reservationId]), reservationId, amount: e.amount};
  }
  const kind = e.kind === 'work-complete' ? 'work' : e.kind;
  return ['sell', 'work', 'fence'].includes(kind) ? {action: 'earn', requestId: receiptId(kind, e.requestId), amount: e.amount} : null;
}
function matchesCurrency(tx, expected) {
  return tx?.action === expected.action && tx.requestId === expected.requestId && tx.amount === expected.amount &&
    (tx.currency ?? 'copper') === 'copper' && tx.reservationId === expected.reservationId;
}
// Reconstruct ownership, cash and one-shot work from immutable opening stock.
// Persisting an inventory or a balance cache would create a second truth.
function reconstruct(state) {
  if (!exactKeys(state, ['version', 'revision', 'quotes', 'events']) || state.version !== 1 ||
      !integer(state.revision) || !Array.isArray(state.events) || state.revision !== state.events.length ||
      !same(normalizeQuotes(state.quotes), state.quotes)) throw Error('invalid-market-state');
  const items = new Map(UNDERGROUND_MARKET_OPENING_STOCK.map(item => [item.id, {...copy(item), owner: 'merchant', worked: false}]));
  const requests = new Map(); let cash = 0, active = null, fenced = null;
  for (const [index, e] of state.events.entries()) {
    if (!exactKeys(e, e?.kind === 'fence' ? [...eventKeys, 'sellerKey', 'buyerKey'] : eventKeys) || e.sequence !== index + 1 || !idValid(e.requestId) || !positive(e.amount)) throw Error('invalid-market-event');
    const item = items.get(e.itemId), old = requests.get(e.requestId), q = item && state.quotes[item.kind];
    if (e.kind === 'buy-reserve') {
      if (active || old || !item || item.owner !== 'merchant' || e.amount !== q.buy) throw Error('invalid-market-purchase');
      active = {kind: 'buy', requestId: e.requestId, itemId: e.itemId, amount: e.amount, status: 'reserved'};
      requests.set(e.requestId, {...active});
    } else if (e.kind === 'buy-settle' || e.kind === 'buy-refund') {
      if (!old || old.kind !== 'buy' || old.status !== 'reserved' || active?.requestId !== e.requestId || old.itemId !== e.itemId || old.amount !== e.amount) throw Error('invalid-market-purchase');
      if (e.kind === 'buy-settle') { item.owner = 'player'; cash += e.amount; }
      old.status = e.kind === 'buy-settle' ? 'completed' : 'cancelled'; active = null;
    } else if (e.kind === 'sell') {
      if (active || old || !item || item.owner !== 'player' || e.amount !== q.sell || cash < e.amount) throw Error('invalid-market-sale');
      item.owner = 'merchant'; cash -= e.amount;
      requests.set(e.requestId, {kind: 'sell', requestId: e.requestId, itemId: e.itemId, amount: e.amount, status: 'completed'});
    } else if (e.kind === 'work-start') {
      if (active || old || !item || item.owner !== 'merchant' || item.kind !== 'old-paper' || item.worked || e.amount !== UNDERGROUND_MARKET_WORK_WAGE || cash < e.amount) throw Error('invalid-market-work');
      active = {kind: 'work', requestId: e.requestId, itemId: e.itemId, amount: e.amount, status: 'working'};
      requests.set(e.requestId, {...active});
    } else if (e.kind === 'work-complete' || e.kind === 'work-cancel') {
      if (!old || old.kind !== 'work' || old.status !== 'working' || active?.requestId !== e.requestId || old.itemId !== e.itemId || old.amount !== e.amount) throw Error('invalid-market-work');
      if (e.kind === 'work-complete') {
        if (cash < e.amount || item.worked || item.kind !== 'old-paper') throw Error('invalid-market-work');
        cash -= e.amount; item.worked = true; item.kind = 'writing-paper'; item.label = '书写纸包';
      }
      old.status = e.kind === 'work-complete' ? 'completed' : 'cancelled'; active = null;
    } else if (e.kind === 'fence') {
      if (!identityValid(e.sellerKey) || !identityValid(e.buyerKey) || e.sellerKey === e.buyerKey || active || old || fenced || e.itemId !== UNDERGROUND_MARKET_FENCE_ITEM || e.amount !== UNDERGROUND_MARKET_FENCE_PRICE || cash < e.amount) throw Error('invalid-market-fence');
      cash -= e.amount; fenced = copy(e);
      requests.set(e.requestId, {kind: 'fence', requestId: e.requestId, itemId: e.itemId, amount: e.amount, status: 'completed'});
    } else throw Error('invalid-market-event');
    if (!integer(cash)) throw Error('invalid-market-cash');
  }
  return {items, requests, cash, active, fenced};
}
function verifyCurrency(state, ledger) {
  if (!ledger || ledger.loadError || typeof ledger.history !== 'function') throw Error('market-currency-unavailable');
  const expected = state.events.map(monetaryEvent).filter(Boolean), actual = ledger.history().filter(relevant);
  if (actual.length !== expected.length || expected.some((e, i) => !matchesCurrency(actual[i], e))) throw Error('market-currency-mismatch');
}

/**
 * Required wiring: createGameCurrencyLedger.transactionParticipant must call
 * market.prepareCurrencyCommit(tx). saveState(next) is for work starts/cancels
 * only; it must synchronously persist the whole enclosing game before success.
 *
 * buy/sell/fence({requestId,itemId,proof}) run AFTER physical action completion.
 * verifyAction({kind,requestId,itemId,proof}) must observe that completed action.
 * buy may leave a durable reserved order after a failed settle save: retry the
 * SAME request or cancelBuy(requestId). Neither merchant nor player owns both.
 * beginWork({requestId,itemId}) protects 2 cash; completeWork({requestId,proof})
 * pays after the observed action. No other trade can spend protected wages.
 *
 * prepareFence({requestId,itemId,receiptId,amount,proof}) returns a lock-aware
 * source participant with patch/valid/lock/release/committed. Fence proof must
 * include the seller's actorKey and buyerKey; both life identities are retained
 * on its receipt and must match the original source receipt on restore. It removes the
 * existing original item; this module never creates that item. Its receipt must
 * be checked by verifyFenceReceipt(event) on restore (event includes receiptId).
 * These callbacks are trusted runtime adapters, never serialized save inputs.
 */
export function createUndergroundMarketLedger({saved = null, copperLedger, saveState, quotes, verifyAction = () => false,
  prepareFence, verifyFenceReceipt = () => false} = {}) {
  let current, view, loadError = null, lastError = null, saving = false, pending = null;
  const fenceRecord = e => ({...copy(e), receiptId: receiptId('fence', e.requestId)});
  try {
    const configured = normalizeQuotes(quotes ?? saved?.quotes ?? {});
    current = saved == null ? empty(configured) : copy(saved);
    if (!same(configured, current.quotes)) throw Error('market-quote-mismatch');
    view = reconstruct(current); verifyCurrency(current, copperLedger);
    if (view.fenced && verifyFenceReceipt(fenceRecord(view.fenced)) !== true) throw Error('market-fence-source-mismatch');
  } catch (error) {
    loadError = error.message || 'invalid-market-state'; current = empty(copy(UNDERGROUND_MARKET_QUOTES)); view = reconstruct(current);
  }
  const fail = code => { lastError = code; return {ok: false, code}; };
  const success = (request, replayed = false) => { lastError = null; return {ok: true, replayed, request: copy(request), receiptId: receiptId(request.kind, request.requestId)}; };
  function ready() {
    if (loadError || saving || pending) return fail(loadError || 'market-busy');
    try { verifyCurrency(current, copperLedger); } catch (error) { return fail(error.message); }
    return {ok: true};
  }
  function checkedRequest(kind, input) {
    const status = ready(); if (!status.ok) return status;
    if (!object(input) || !idValid(input.requestId) || !idValid(input.itemId)) return fail('invalid-market-request');
    const old = view.requests.get(input.requestId);
    if (old && (old.kind !== kind || old.itemId !== input.itemId)) return fail('market-request-conflict');
    if (old?.status === 'cancelled') return fail('market-request-cancelled');
    if (old?.status === 'completed') return success(old, true);
    if (view.active && view.active.requestId !== input.requestId) return fail('market-order-active');
    return {ok: true, old};
  }
  function observed(kind, input) {
    saving = true;
    try { return verifyAction({kind, requestId: input.requestId, itemId: input.itemId, proof: input.proof}) === true; } catch { return false; } finally { saving = false; }
  }
  function candidate(kind, input, amount) {
    const next = {...copy(current), revision: current.revision + 1};
    next.events.push({sequence: next.revision, kind, requestId: input.requestId, itemId: input.itemId, amount,
      ...(kind === 'fence' ? {sellerKey: input.proof.actorKey, buyerKey: input.proof.buyerKey} : {})});
    return {next, view: reconstruct(next), event: next.events.at(-1)};
  }
  function persist(change) {
    if (typeof saveState !== 'function') return fail('persistence-unavailable');
    saving = true;
    try {
      const result = saveState(copy(change.next));
      if (result?.then) { Promise.resolve(result).catch(() => {}); return fail('async-save-unsupported'); }
      if (result === false || result?.ok === false) return fail(result?.code || 'save-failed');
      current = change.next; view = change.view; lastError = null; return {ok: true};
    } catch { return fail('save-failed'); } finally { saving = false; }
  }
  function money(change, external = null) {
    const expected = monetaryEvent(change.event);
    pending = {...change, expected, external};
    try {
      const result = expected.action === 'reserve' ? copperLedger.reserve(expected.amount, expected.requestId, 'copper') :
        expected.action === 'settle' ? copperLedger.settle(expected.reservationId) :
          expected.action === 'refund' ? copperLedger.refund(expected.reservationId) : copperLedger.earn(expected.amount, expected.requestId);
      if (!result?.ok) return fail(result?.code || 'currency-unavailable');
      if (current !== change.next) { loadError = 'market-participant-missing'; return fail(loadError); }
      return success(view.requests.get(change.event.requestId));
    } catch { return fail('save-failed'); } finally { pending = null; }
  }
  function buy(input) {
    const check = checkedRequest('buy', input); if (!check.ok || check.replayed) return check;
    if (!check.old) {
      const item = view.items.get(input.itemId);
      if (!item || item.owner !== 'merchant') return fail('market-item-unavailable');
      if (!Number.isSafeInteger(view.cash + current.quotes[item.kind].buy)) return fail('market-cash-overflow');
      if (!observed('buy', input)) return fail('market-action-incomplete');
      const result = money(candidate('buy-reserve', input, current.quotes[item.kind].buy));
      if (!result.ok) return result;
    }
    return money(candidate('buy-settle', input, view.requests.get(input.requestId).amount));
  }
  function sell(input) {
    const check = checkedRequest('sell', input); if (!check.ok || check.replayed) return check;
    const item = view.items.get(input.itemId);
    if (!item || item.owner !== 'player') return fail('market-item-not-owned');
    const amount = current.quotes[item.kind].sell;
    if (view.cash < amount) return fail('insufficient-merchant-cash');
    if (!observed('sell', input)) return fail('market-action-incomplete');
    return money(candidate('sell', input, amount));
  }
  function cancelBuy(requestId) {
    const status = ready(); if (!status.ok) return status;
    const request = view.requests.get(requestId);
    if (!request || request.kind !== 'buy') return fail('market-order-missing');
    if (request.status === 'cancelled') return success(request, true);
    if (request.status !== 'reserved') return fail('market-order-completed');
    return money(candidate('buy-refund', request, request.amount));
  }
  function beginWork(input) {
    const check = checkedRequest('work', input); if (!check.ok || check.replayed) return check;
    if (check.old) return success(check.old, true);
    const item = view.items.get(input.itemId);
    if (!item || item.owner !== 'merchant' || item.kind !== 'old-paper' || item.worked) return fail('market-work-unavailable');
    if (view.cash < UNDERGROUND_MARKET_WORK_WAGE) return fail('insufficient-merchant-cash');
    const result = persist(candidate('work-start', input, UNDERGROUND_MARKET_WORK_WAGE));
    return result.ok ? success(view.requests.get(input.requestId)) : result;
  }
  function finishWork(input, cancel = false) {
    const status = ready(); if (!status.ok) return status;
    if (!object(input) || !idValid(input.requestId)) return fail('invalid-market-request');
    const request = view.requests.get(input.requestId);
    if (!request || request.kind !== 'work') return fail('market-order-missing');
    if (input.itemId !== undefined && input.itemId !== request.itemId) return fail('market-request-conflict');
    if (request.status === (cancel ? 'cancelled' : 'completed')) return success(request, true);
    if (request.status !== 'working') return fail('market-order-completed');
    const action = {...input, itemId: request.itemId};
    if (!cancel && !observed('work', action)) return fail('market-action-incomplete');
    const change = candidate(cancel ? 'work-cancel' : 'work-complete', action, request.amount);
    if (!cancel) return money(change);
    const result = persist(change); return result.ok ? success(view.requests.get(input.requestId)) : result;
  }
  function fence(input) {
    const check = checkedRequest('fence', input); if (!check.ok || check.replayed) return check;
    if (input.itemId !== UNDERGROUND_MARKET_FENCE_ITEM || view.fenced) return fail('market-fence-unavailable');
    if (view.cash < UNDERGROUND_MARKET_FENCE_PRICE) return fail('insufficient-merchant-cash');
    if (!identityValid(input.proof?.actorKey) || !identityValid(input.proof?.buyerKey) || input.proof.actorKey === input.proof.buyerKey) return fail('invalid-market-fence-identity');
    if (!observed('fence', input)) return fail('market-action-incomplete');
    if (typeof prepareFence !== 'function') return fail('market-fence-source-unavailable');
    // Hold the market during source preparation too: a source adapter may call
    // back synchronously, and cannot open a competing order while preparing.
    let external; saving = true;
    try { external = prepareFence({...input, receiptId: receiptId('fence', input.requestId), amount: UNDERGROUND_MARKET_FENCE_PRICE}); }
    catch { return fail('market-fence-source-unavailable'); } finally { saving = false; }
    if (external?.ok === false) return fail(external.code || external.reason || 'market-fence-source-unavailable');
    if (!external || !['valid', 'lock', 'release', 'committed'].every(key => typeof external[key] === 'function') ||
        !object(external.patch) || Object.keys(external.patch).some(key => ['copperLedger', UNDERGROUND_MARKET_SAVE_KEY, '__proto__', 'constructor', 'prototype'].includes(key))) return fail('invalid-market-fence-participant');
    return money(candidate('fence', input, UNDERGROUND_MARKET_FENCE_PRICE), external);
  }
  function prepareCurrencyCommit(tx) {
    if (!relevant(tx)) return null;
    if (loadError || saving) return fail(loadError || 'market-busy');
    const plan = pending, base = current;
    if (!plan || !matchesCurrency(tx, plan.expected)) return fail('market-action-required');
    const external = plan.external; let locked = false, externalLocked = false, accepted = false;
    const stable = () => !loadError && current === base && pending === plan;
    const valid = () => !saving && stable() && (!external || external.valid() === true);
    return {ok: true, patch: {...copy(external?.patch || {}), [UNDERGROUND_MARKET_SAVE_KEY]: copy(plan.next)}, valid,
      lock() {
        if (accepted || locked || !valid()) return false;
        // Lock before invoking third-party callbacks, so reentrant trades cannot
        // change either side between validation and the atomic save.
        saving = true; locked = true;
        if (external) {
          externalLocked = true;
          if (external.lock() !== true || !stable()) return false;
        }
        return true;
      },
      release() { try { if (externalLocked) { externalLocked = false; external.release(); } } finally { if (locked) { locked = false; saving = false; } } },
      committed() {
        if (accepted) return true;
        if (!locked || !stable()) return false;
        if (external && external.committed() === false) return false;
        current = plan.next; view = plan.view; accepted = true; lastError = null; return true;
      },
    };
  }
  function state() {
    if (loadError) return {loadError, lastError, merchantCash: null, availableCash: null, items: [], stock: [], inventory: [], active: null, revision: null};
    const items = [...view.items.values()].map(item => ({...copy(item), holder: item.owner, name: item.label, ...{buyPrice: current.quotes[item.kind].buy, sellPrice: current.quotes[item.kind].sell},
      reserved: view.active?.itemId === item.id}));
    return {version: 1, revision: current.revision, merchantId: UNDERGROUND_MARKET_MERCHANT_ID, merchantCash: view.cash,
      availableCash: view.cash - (view.active?.kind === 'work' ? view.active.amount : 0), items,
      stock: items.filter(item => item.owner === 'merchant'), inventory: items.filter(item => item.owner === 'player'),
      active: copy(view.active), fenced: view.fenced !== null, workWage: UNDERGROUND_MARKET_WORK_WAGE, quotes: copy(current.quotes), loadError, lastError};
  }
  function recover() {
    // Runtime asks on every active frame. Idle recovery must not clone/replay
    // the shared currency journal or perform storage work.
    if (loadError || saving || pending) return fail(loadError || 'market-busy');
    const active = view.active;
    return active?.kind === 'buy' ? buy({requestId: active.requestId, itemId: active.itemId}) : {ok: true, replayed: true};
  }
  function cancelPending() {
    const active = view.active;
    return active?.kind === 'buy' ? cancelBuy(active.requestId) : active?.kind === 'work' ? finishWork({requestId: active.requestId}, true) : ready();
  }
  return Object.freeze({buy, sell, fence, beginWork, recover, cancelPending, completeWork: input => finishWork(input), cancelWork: requestId => finishWork({requestId}, true), cancelBuy,
    prepareCurrencyCommit, state, view: state, snapshot: () => copy(loadError ? saved : current), history: () => loadError ? [] : copy(current.events),
    get loadError() { return loadError; }, get busy() { return saving || pending !== null; }});
}
