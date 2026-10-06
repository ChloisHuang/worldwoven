// Fictional copper only. The six officials never borrow the player's wallet.
// Completed duty is government-funded; only earned NPC balances can be spent.
import {CHINA_COURT_OFFICIAL_RANKS, CHINA_OFFICIAL_DAILY_WAGE} from './china-official-ranks.js';
export const CHINA_OFFICIAL_IDS = Object.freeze(CHINA_COURT_OFFICIAL_RANKS.map(rank => rank.actorId));
export const CHINA_OFFICIAL_TAVERN_ID = 'cn-yunlai-tavern';
const OFFICIALS = new Set(CHINA_OFFICIAL_IDS);
const ACTIONS = new Set(['duty', 'withdraw', 'meal-payment', 'meal-refund']);
const JOURNAL_LIMIT = 20000;
const copy = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => integer(value) && value > 0;
const identifier = (value, max = 128) => typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value;
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value) ?
  Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const failure = code => ({ok: false, code});
const dayKey = (actorId, day) => JSON.stringify([actorId, day]);
const mealReceipt = (action, orderId) => `official-${action}:${orderId}`;
const balances = state => ({...(state.version === 1 ? {treasury: state.treasury} : {governmentPaid: state.governmentPaid}),
  accounts: copy(state.accounts), destinations: copy(state.destinations)});
const fundingAccount = (actorId, split) => `${actorId}:${split.cash === 0 ? 'bank' : split.bank === 0 ? 'cash' : 'cash+bank'}`;

function source(value) {
  if (value === undefined) return {amount: 0, sourceId: null};
  if (!object(value) || !integer(value.amount) || !(identifier(value.sourceId) || value.amount === 0 && value.sourceId === null)) throw Error('invalid-treasury-source');
  return {amount: value.amount, sourceId: value.sourceId};
}
function legacyFresh(initialTreasury, dailyWage, dailyWages) {
  if (!positive(dailyWage)) throw Error('invalid-wage');
  if (dailyWages !== undefined && (!object(dailyWages) || Object.entries(dailyWages).some(([id, wage]) =>
      !OFFICIALS.has(id) || !positive(wage)))) throw Error('invalid-wages');
  const origin = source(initialTreasury);
  return {version: 1, initialTreasury: origin, dailyWage, ...(dailyWages === undefined ? {} : {dailyWages: copy(dailyWages)}), treasury: origin.amount,
    accounts: Object.fromEntries(CHINA_OFFICIAL_IDS.map(id => [id, {bank: 0, cash: 0}])),
    destinations: {[CHINA_OFFICIAL_TAVERN_ID]: 0}, nextTransaction: 1, transactions: []};
}
function migrate(legacy) {
  const {initialTreasury, treasury, version, ...ledger} = legacy;
  return {...ledger, version: 2, funding: 'government-guaranteed', governmentPaid: 0,
    legacyFunding: {initialTreasury, treasury, transactionCount: ledger.transactions.length}};
}
function fresh(dailyWage, dailyWages) {
  const {initialTreasury, treasury, version, ...ledger} = legacyFresh(undefined, dailyWage, dailyWages);
  return {...ledger, version: 2, funding: 'government-guaranteed', governmentPaid: 0};
}
const wageFor = (state, actorId) => state.dailyWages?.[actorId] ?? state.dailyWage;
function conserved(state) {
  if (!object(state.accounts) || Object.keys(state.accounts).length !== CHINA_OFFICIAL_IDS.length ||
      !object(state.destinations) || Object.keys(state.destinations).length !== 1 || !integer(state.destinations[CHINA_OFFICIAL_TAVERN_ID])) return false;
  let total = BigInt(state.destinations[CHINA_OFFICIAL_TAVERN_ID]);
  for (const id of CHINA_OFFICIAL_IDS) {
    const account = state.accounts[id];
    if (!object(account) || Object.keys(account).length !== 2 || !integer(account.bank) || !integer(account.cash)) return false;
    total += BigInt(account.bank) + BigInt(account.cash);
  }
  if (state.version === 1) return integer(state.treasury) && total + BigInt(state.treasury) === BigInt(state.initialTreasury.amount);
  if (state.version !== 2 || state.funding !== 'government-guaranteed' || !integer(state.governmentPaid)) return false;
  // The old unspent reserve is historical information, never NPC wealth.
  const legacyEarned = state.legacyFunding ? BigInt(state.legacyFunding.initialTreasury.amount) - BigInt(state.legacyFunding.treasury) : 0n;
  return total === legacyEarned + BigInt(state.governmentPaid);
}
function evidenceFor(evidence, actorId, day) {
  if (!object(evidence) || evidence.kind !== 'office-work' || evidence.completed !== true || evidence.actorId !== actorId ||
      evidence.day !== day || evidence.audienceDay !== day || evidence.audienceCompleted !== true ||
      !Number.isFinite(evidence.elapsed) || !Number.isFinite(evidence.duration) || evidence.duration < 8 || evidence.elapsed < evidence.duration) return null;
  return {kind: 'office-work', completed: true, actorId, day, elapsed: evidence.elapsed,
    duration: evidence.duration, audienceDay: day, audienceCompleted: true};
}
function requestFor(action, input, state) {
  if (!object(input) || !OFFICIALS.has(input.actorId)) return failure('invalid-actor');
  const request = {action, actorId: input.actorId, amount: action === 'duty' ? wageFor(state, input.actorId) : input.amount,
    receiptId: action.startsWith('meal-') ? mealReceipt(action, input.orderId) : input.receiptId};
  if (!positive(request.amount)) return failure('invalid-amount');
  if (!identifier(request.receiptId, 256)) return failure('invalid-receipt-id');
  if (action === 'duty') {
    if (!integer(input.day)) return failure('invalid-day');
    const evidence = evidenceFor(input.evidence, input.actorId, input.day);
    if (!evidence) return failure('incomplete-duty');
    request.day = input.day; request.evidence = evidence;
  } else if (action.startsWith('meal-')) {
    if (!identifier(input.orderId)) return failure('invalid-order-id');
    request.orderId = input.orderId;
  }
  return {ok: true, request};
}
function requestOf(transaction) {
  return {action: transaction.action, actorId: transaction.actorId, amount: transaction.amount, receiptId: transaction.receiptId,
    ...(transaction.action === 'duty' ? {day: transaction.day, evidence: transaction.evidence} : {}),
    ...(transaction.action.startsWith('meal-') ? {orderId: transaction.orderId} : {})};
}
function indexes() { return {receipts: new Map(), duties: new Map(), meals: new Map()}; }
function indexTransaction(index, transaction) {
  index.receipts.set(transaction.receiptId, transaction);
  if (transaction.action === 'duty') index.duties.set(dayKey(transaction.actorId, transaction.day), transaction);
  if (transaction.action.startsWith('meal-')) {
    const meal = index.meals.get(transaction.orderId) || {};
    meal[transaction.action === 'meal-payment' ? 'payment' : 'refund'] = transaction;
    index.meals.set(transaction.orderId, meal);
  }
}
function transfer(state, index, request, legacyMeal = false) {
  if (index.receipts.has(request.receiptId)) return failure('request-conflict');
  if (state.transactions.length >= JOURNAL_LIMIT || !Number.isSafeInteger(state.nextTransaction + 1)) return failure('transaction-limit');
  const next = {...state, accounts: copy(state.accounts), destinations: {...state.destinations}, transactions: [...state.transactions]},
    account = next.accounts[request.actorId], amount = request.amount;
  let from, to, sourceSplit;
  if (request.action === 'duty') {
    if (index.duties.has(dayKey(request.actorId, request.day))) return failure('duty-already-paid');
    if (next.version === 1) {
      // Used only to validate the unchanged historical v1 journal on restore.
      if (amount > next.treasury) return failure('insufficient-treasury');
      next.treasury -= amount; from = 'official-treasury';
    } else {
      next.governmentPaid += amount; from = 'government-guaranteed';
    }
    account.bank += amount; to = `${request.actorId}:bank`;
  } else if (request.action === 'withdraw') {
    if (amount > account.bank) return failure('insufficient-bank');
    account.bank -= amount; account.cash += amount;
    from = `${request.actorId}:bank`; to = `${request.actorId}:cash`;
  } else if (request.action === 'meal-payment') {
    if (index.meals.has(request.orderId)) return failure('order-already-paid');
    // Historical receipts without a split retain their original cash-only
    // replay. Every new meal pays from this NPC's cash, then their own bank.
    if (legacyMeal && amount > account.cash) return failure('insufficient-cash');
    if (amount > account.cash + account.bank) return failure('insufficient-funds');
    const split = {cash: Math.min(amount, account.cash), bank: Math.max(0, amount - account.cash)};
    account.cash -= split.cash; account.bank -= split.bank; next.destinations[CHINA_OFFICIAL_TAVERN_ID] += amount;
    if (!legacyMeal) sourceSplit = split;
    from = fundingAccount(request.actorId, split); to = CHINA_OFFICIAL_TAVERN_ID;
  } else if (request.action === 'meal-refund') {
    const meal = index.meals.get(request.orderId);
    if (!meal?.payment) return failure('payment-not-found');
    if (meal.refund) return failure('order-already-refunded');
    if (meal.payment.actorId !== request.actorId || meal.payment.amount !== amount) return failure('request-conflict');
    if (legacyMeal && Object.hasOwn(meal.payment, 'sourceSplit')) return failure('invalid-source-split');
    if (amount > next.destinations[CHINA_OFFICIAL_TAVERN_ID]) return failure('insufficient-tavern-funds');
    const split = meal.payment.sourceSplit || {cash: amount, bank: 0};
    next.destinations[CHINA_OFFICIAL_TAVERN_ID] -= amount; account.cash += split.cash; account.bank += split.bank;
    if (!legacyMeal) sourceSplit = copy(split);
    from = CHINA_OFFICIAL_TAVERN_ID; to = fundingAccount(request.actorId, split);
  } else return failure('invalid-action');
  if (!conserved(next)) return failure('balance-overflow');
  const transaction = {id: `official-${state.nextTransaction}`, ...copy(request), from, to,
    ...(sourceSplit ? {sourceSplit} : {}),
    before: balances(state), after: balances(next)};
  next.transactions.push(transaction); next.nextTransaction++;
  return {ok: true, next, transaction};
}
function replay(current, index, transactions) {
  for (const transaction of transactions) {
    if (!object(transaction) || !ACTIONS.has(transaction.action)) throw Error('invalid-saved-state');
    const normalized = requestFor(transaction.action, transaction, current);
    if (!normalized.ok || !same(normalized.request, requestOf(transaction))) throw Error('invalid-saved-state');
    const result = transfer(current, index, normalized.request, !Object.hasOwn(transaction, 'sourceSplit'));
    if (!result.ok || !same(transaction, result.transaction)) throw Error('invalid-saved-state');
    current = result.next; indexTransaction(index, result.transaction);
  }
  return current;
}
function restore(saved, initialTreasury) {
  if (!object(saved) || ![1, 2].includes(saved.version) || !Array.isArray(saved.transactions) || saved.transactions.length > JOURNAL_LIMIT) throw Error('invalid-saved-state');
  const index = indexes();
  let current, legacyCount = 0;
  if (saved.version === 1 || Object.hasOwn(saved, 'legacyFunding')) {
    const history = saved.version === 1 ? saved : saved.legacyFunding;
    if (!object(history)) throw Error('invalid-saved-state');
    legacyCount = saved.version === 1 ? saved.transactions.length : history.transactionCount;
    if (!integer(legacyCount) || legacyCount > saved.transactions.length) throw Error('invalid-saved-state');
    current = legacyFresh(history.initialTreasury, saved.dailyWage, saved.dailyWages);
    if (initialTreasury !== undefined && !same(current.initialTreasury, source(initialTreasury))) throw Error('invalid-saved-state');
    current = replay(current, index, saved.transactions.slice(0, legacyCount));
    if (saved.version === 1) {
      // Validate the complete old state before removing any live-budget fields.
      if (!conserved(current) || !same(saved, current)) throw Error('invalid-saved-state');
      return {current: migrate(current), index};
    }
    current = migrate(current);
    if (!same(current.legacyFunding, history)) throw Error('invalid-saved-state');
  } else current = fresh(saved.dailyWage, saved.dailyWages);
  current = replay(current, index, saved.transactions.slice(legacyCount));
  if (!conserved(current) || !same(saved, current)) throw Error('invalid-saved-state');
  return {current, index};
}

/** Single writer. saveState(nextEconomy, transaction, worldPatch) must perform
 * one synchronous atomic write of the complete game snapshot. False, a throw,
 * or a Promise rejects a write without changing this ledger's memory.
 *
 * prepareMealPayment/Refund only calculate candidates. Prefer commit(worldPatch)
 * so an order/till change and money transfer share that one write. The detached
 * snapshot/patch and valid()/committed() hooks also support an existing atomic
 * coordinator: it must validate immediately before its synchronous write and
 * call committed() only after success. Never await between those steps.
 *
 * isAppointed must check the actual current fixed NPC roster. getDay supplies
 * the running simulation day; no elapsed wall time or offline accrual is used.
 * An earned certificate may be paid on a later day after a failed write, but
 * future certificates are rejected. This ledger never synthesizes back pay.
 * The caller issues a duty certificate only after a completed audience and
 * actual archival work at that actor's assigned desk.
 *
 * Meals use the NPC's cash + bank total, cash first, in one transaction.
 * New meal receipts record sourceSplit: {cash, bank}; refunds restore that
 * exact split even after later transfers. Version-1 cash-only journal entries
 * without sourceSplit replay unchanged. This ledger has no bank interest.
 * dailyWage and optional per-actor dailyWages are frozen at ledger creation.
 * Restore reads that saved policy, never today's rank catalogue or new caller
 * defaults. Version-1 states are fully replay-validated before v2 migration;
 * their accounts and receipts stay unchanged. The old source and remainder
 * survive only as legacyFunding metadata, not a spendable reserve. New duty
 * records governmentPaid as cumulative earned pay, never a finite treasury.
 * Loading performs no write, payment, interest or historical wage catch-up.
 * Changing a rank label cannot reprice old receipts or synthesize back pay.
 * NPC automatic promotion and in-world salary-policy changes are not wired.
 */
export function createChinaOfficialEconomy({saved, initialTreasury, dailyWage = CHINA_OFFICIAL_DAILY_WAGE, dailyWages, isAppointed = () => false,
  getDay = () => null, saveState} = {}) {
  let current = null, index = indexes(), busy = false, loadError = null;
  if (typeof isAppointed !== 'function' || typeof getDay !== 'function' || saveState !== undefined && typeof saveState !== 'function') throw TypeError('official economy requires synchronous callbacks');
  try {
    if (saved === undefined || saved === null) {
      source(initialTreasury); // Validate a deprecated caller option, never fund accounts from it.
      current = fresh(dailyWage, dailyWages);
    }
    else ({current, index} = restore(saved, initialTreasury));
  } catch { loadError = saved === undefined || saved === null ? 'invalid-config' : 'invalid-saved-state'; }
  function liveCheck(request) {
    try {
      if (isAppointed(request.actorId) !== true) return 'actor-not-appointed';
      if (request.action === 'duty') {
        const currentDay = getDay();
        if (!integer(currentDay) || request.day > currentDay) return 'day-mismatch';
      }
    } catch { return 'duty-context-unavailable'; }
    return null;
  }
  function prepare(action, input) {
    if (loadError) return failure(loadError);
    if (busy) return failure('ledger-busy');
    busy = true;
    try {
      const normalized = requestFor(action, input, current);
      if (!normalized.ok) return normalized;
      const request = normalized.request, previous = index.receipts.get(request.receiptId);
      if (previous && !same(requestOf(previous), request)) return failure('request-conflict');
      if (action === 'meal-payment' && index.meals.get(request.orderId)?.refund) return failure('order-already-refunded');
      const replayed = !!previous;
      if (!replayed) {
        const error = liveCheck(request);
        if (error) return failure(error);
      }
      const base = current, result = replayed ? {ok: true, next: current, transaction: previous} : transfer(current, index, request);
      if (!result.ok) return result;
      const next = result.next, transaction = result.transaction;
      let accepted = false;
      const receipt = wasReplay => ({ok: true, replayed: wasReplay, receiptId: transaction.receiptId,
        amount: transaction.amount, actorId: transaction.actorId, ...(transaction.orderId ? {orderId: transaction.orderId} : {}),
        ...(transaction.sourceSplit ? {sourceSplit: copy(transaction.sourceSplit)} : {}), transaction: copy(transaction)});
      const valid = () => !loadError && !busy && (accepted || current === base);
      function accept() {
        if (accepted) return receipt(true);
        if (busy) return failure('ledger-busy');
        if (current !== base) return failure('stale-candidate');
        if (!replayed) { current = next; indexTransaction(index, transaction); }
        accepted = true;
        return receipt(replayed);
      }
      function commit(worldPatch = {}) {
        if (busy) return failure('ledger-busy');
        if (accepted) return receipt(true);
        if (current !== base) return failure('stale-candidate');
        if (!object(worldPatch)) return failure('invalid-world-patch');
        // The authoritative economy field cannot be replaced by a world patch.
        if (Object.hasOwn(worldPatch, 'chinaOfficialEconomy')) return failure('invalid-world-patch');
        if (replayed && Object.keys(worldPatch).length === 0) return accept();
        if (!saveState) return failure('persistence-unavailable');
        busy = true;
        try {
          if (!replayed) {
            const error = liveCheck(request);
            if (error) return failure(error);
          }
          const saved = saveState(copy(next), copy(transaction), copy(worldPatch));
          if (saved && typeof saved.then === 'function') {
            // Observe rejections without treating an asynchronous save as durable.
            Promise.resolve(saved).catch(() => {});
            return failure('async-save-unsupported');
          }
          if (saved === false || saved?.ok === false) return failure('save-failed');
          if (!replayed) { current = next; indexTransaction(index, transaction); }
          accepted = true;
          return receipt(replayed);
        } catch { return failure('save-failed'); }
        finally { busy = false; }
      }
      return {...receipt(replayed), snapshot: copy(next), candidate: copy(next), patch: {chinaOfficialEconomy: copy(next)},
        valid, committed: accept, commit};
    } finally { busy = false; }
  }
  const account = actorId => current && OFFICIALS.has(actorId) ? copy(current.accounts[actorId]) : null;
  return {loadError, state: () => current ? copy(current) : null, snapshot: () => current ? copy(current) : null,
    account, balance: account, history: () => current ? copy(current.transactions) : [],
    dailyWageFor: actorId => current && OFFICIALS.has(actorId) ? wageFor(current, actorId) : null,
    completeDuty(input) { const payment = prepare('duty', input); return payment.ok ? payment.commit() : payment; },
    withdraw(input) { const payment = prepare('withdraw', input); return payment.ok ? payment.commit() : payment; },
    prepareMealPayment: input => prepare('meal-payment', input),
    prepareMealRefund: input => prepare('meal-refund', input)};
}
