import {createCopperLedger} from './copper-ledger.js';

// Fictional game units only. All balances, holds and receipts share one atomic
// save. Copper keeps its existing denomination; the other labels are provisional.
export const GAME_CURRENCIES = Object.freeze({
  copper: Object.freeze({id: 'copper', region: 'china', label: '中国铜钱', unit: '文', value: 1}),
  japan: Object.freeze({id: 'japan', region: 'japan', label: '日本票券', unit: '券', value: 2}),
  egypt: Object.freeze({id: 'egypt', region: 'egypt', label: '埃及票券', unit: '券', value: 3}),
  france: Object.freeze({id: 'france', region: 'france', label: '法国票券', unit: '券', value: 4}),
});
export const EXCHANGE_RATE_VERSION = 'worldwoven-fixed-v1';
const CURRENCIES = Object.keys(GAME_CURRENCIES);
const ACTIONS = new Set(['open', 'deposit', 'withdraw', 'earn', 'wage', 'reserve', 'settle', 'refund', 'exchange', 'business', 'interest']);
const copy = value => JSON.parse(JSON.stringify(value));
const integer = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => integer(value) && value > 0;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const idValid = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && value.trim() === value;
const currencyValid = value => Object.hasOwn(GAME_CURRENCIES, value);
const terminal = action => action === 'settle' || action === 'refund';
const keyFor = (action, id) => JSON.stringify([terminal(action), id]);
const terminalId = (action, id) => JSON.stringify([action, id]);
const bucket = () => ({cash: 0, bank: 0, accountOpened: false});
const emptyBalances = () => Object.fromEntries(CURRENCIES.map(id => [id, bucket()]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const validBucket = b => object(b) && integer(b.cash) && integer(b.bank) &&
  Number.isSafeInteger(b.cash + b.bank) && typeof b.accountOpened === 'boolean' && (b.accountOpened || b.bank === 0);
const bucketEqual = (a, b) => validBucket(a) && validBucket(b) && a.cash === b.cash && a.bank === b.bank && a.accountOpened === b.accountOpened;
const balancesEqual = (a, b) => object(a) && object(b) && Object.keys(a).length === CURRENCIES.length &&
  CURRENCIES.every(id => bucketEqual(a[id], b[id]));

function makeQuote({from, to, amount, version = EXCHANGE_RATE_VERSION} = {}) {
  if (!currencyValid(from) || !currencyValid(to) || from === to) return {ok: false, code: 'invalid-currency'};
  if (!positive(amount)) return {ok: false, code: 'invalid-amount'};
  if (version !== EXCHANGE_RATE_VERSION) return {ok: false, code: 'rate-mismatch'};
  const numerator = GAME_CURRENCIES[from].value, denominator = GAME_CURRENCIES[to].value;
  const result = BigInt(amount) * BigInt(numerator) / BigInt(denominator);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) return {ok: false, code: 'balance-overflow'};
  if (result === 0n) return {ok: false, code: 'exchange-too-small'};
  return {ok: true, quote: {version, from, to, amount, received: Number(result), numerator, denominator, rounding: 'floor', fee: 0}};
}

function signature(tx) {
  return {action: tx.action, currency: tx.currency, amount: tx.amount,
    ...(tx.action === 'reserve' && tx.funding ? {funding: tx.funding} : {}),
    ...(tx.action === 'wage' ? {roleId: tx.roleId, slotId: tx.slotId, day: tx.day} : {}),
    ...(tx.action === 'business' ? {businessId: tx.businessId, operation: tx.operation} : {}),
    ...(tx.action === 'interest' ? {day: tx.day, principal: tx.principal, ratePercent: tx.ratePercent} : {}),
    ...(tx.action === 'exchange' ? {quote: copy(tx.quote)} : {}),
    ...(terminal(tx.action) ? {reservationId: tx.reservationId} : {})};
}

function validateRequest(tx) {
  if (!object(tx) || !ACTIONS.has(tx.action)) return 'invalid-action';
  if (!currencyValid(tx.currency)) return 'invalid-currency';
  if (terminal(tx.action) ? !idValid(tx.reservationId) || tx.requestId !== terminalId(tx.action, tx.reservationId) : !idValid(tx.requestId)) return 'invalid-request-id';
  if (tx.action === 'open' ? tx.amount !== 0 : !positive(tx.amount)) return 'invalid-amount';
  if (tx.funding !== undefined && (tx.action !== 'reserve' || tx.funding !== 'cash+bank')) return 'invalid-funding';
  if (tx.action === 'wage' && (!idValid(tx.roleId) || !idValid(tx.slotId) || !integer(tx.day))) return 'invalid-wage-receipt';
  if (tx.action === 'interest' && (!integer(tx.day) || !Number.isSafeInteger(tx.day + 1) || !positive(tx.principal) ||
      tx.ratePercent !== 1 || tx.amount !== Number(BigInt(tx.principal) / 100n) ||
      tx.requestId !== `bank-interest:${tx.day}:${tx.currency}`)) return 'invalid-interest-receipt';
  if (tx.action === 'business' && (tx.currency !== 'copper' || tx.businessId !== 'cn-yunlai-tavern' || !['purchase','sale','invest','draw'].includes(tx.operation))) return 'invalid-business-receipt';
  if (tx.action === 'exchange') {
    const q = makeQuote(tx.quote);
    if (!q.ok) return q.code;
    if (tx.currency !== q.quote.from || tx.amount !== q.quote.amount || !same(tx.quote, q.quote)) return 'rate-mismatch';
  }
  return null;
}

// Pure candidate calculation, shared by runtime and restore validation. Holds
// record their original currency; changing the active country has no effect.
function calculate(balances, reservations, tx) {
  const error = validateRequest(tx);
  if (error) return {error};
  const next = copy(balances), b = next[tx.currency], amount = tx.amount;
  let hold = null;
  if (tx.action === 'open') {
    if (b.accountOpened) return {error: 'account-already-open'};
    b.accountOpened = true;
  } else if (tx.action === 'wage' || tx.action === 'interest') {
    if (tx.action === 'interest' && (!b.accountOpened || tx.principal > b.bank)) return {error: 'invalid-interest-principal'};
    b.accountOpened = true;
    b.bank += amount;
  } else if (tx.action === 'business') {
    if (['purchase','invest'].includes(tx.operation)) {
      if (amount > b.bank) return {error: 'insufficient-bank'};
      b.bank -= amount;
    } else { b.accountOpened = true; b.bank += amount; }
  } else if (tx.action === 'earn') b.cash += amount; // Legacy helper compatibility only.
  else if (tx.action === 'deposit' || tx.action === 'withdraw') {
    if (!b.accountOpened) return {error: 'account-not-open'};
    if (tx.action === 'deposit') {
      if (amount > b.cash) return {error: 'insufficient-cash'};
      b.cash -= amount; b.bank += amount;
    } else {
      if (amount > b.bank) return {error: 'insufficient-bank'};
      b.bank -= amount; b.cash += amount;
    }
  } else if (tx.action === 'reserve') {
    const total = tx.funding === 'cash+bank';
    if (amount > b.cash + (total ? b.bank : 0)) return {error: total ? 'insufficient-funds' : 'insufficient-cash'};
    const split = {cash: Math.min(amount, b.cash), bank: Math.max(0, amount - b.cash)};
    b.cash -= split.cash; b.bank -= split.bank;
    hold = {id: tx.requestId, amount, currency: tx.currency, status: 'reserved', ...(total ? {sourceSplit: split} : {})};
  } else if (terminal(tx.action)) {
    const original = reservations.get(tx.reservationId);
    if (!original) return {error: 'reservation-not-found'};
    if (original.status !== 'reserved') return {error: `reservation-${original.status}`};
    if (original.currency !== tx.currency || original.amount !== amount) return {error: 'request-conflict'};
    if (tx.action === 'refund') {
      const split = original.sourceSplit || {cash: amount, bank: 0};
      b.cash += split.cash; b.bank += split.bank;
    }
    hold = {...original, status: tx.action === 'refund' ? 'refunded' : 'settled'};
  } else if (tx.action === 'exchange') {
    if (amount > b.cash) return {error: 'insufficient-cash'};
    b.cash -= amount;
    next[tx.quote.to].cash += tx.quote.received;
  }
  const held = Object.fromEntries(CURRENCIES.map(id => [id, 0]));
  for (const old of reservations.values()) if (old.status === 'reserved' && old.id !== hold?.id) held[old.currency] += old.amount;
  if (hold?.status === 'reserved') held[hold.currency] += hold.amount;
  if (CURRENCIES.some(id => !validBucket(next[id]) || !integer(held[id]) || !Number.isSafeInteger(next[id].cash + next[id].bank + held[id]))) return {error: 'balance-overflow'};
  return {balances: next, hold};
}

function fromLegacy(saved) {
  const ledger = createCopperLedger({saved});
  if (ledger.loadError) throw Error('invalid-saved-state');
  const original = saved == null || object(saved) && Object.keys(saved).length === 0 ? ledger.state() : copy(saved);
  const copper = ledger.state(), balances = emptyBalances();
  balances.copper = {cash: copper.cash, bank: copper.bank, accountOpened: copper.accountOpened};
  const reservations = new Map(ledger.reservations().map(h => [h.id, {...h, currency: 'copper'}]));
  const requests = new Map(ledger.history().map(tx => [keyFor(tx.action, tx.requestId), {...tx, currency: 'copper'}]));
  return {current: {version: 2, legacyCopper: original, balances, nextTransaction: copper.nextTransaction, transactions: []}, reservations, requests};
}

// This checkpoint starts at the first observed simulation day, never day zero
// for an old save. Journal bankDay stamps let restore independently rebuild
// every daily minimum and interest receipt instead of trusting a saved balance.
const bankAmounts = balances => Object.fromEntries(CURRENCIES.map(id => [id, balances[id].bank]));
function initializeInterest(current, day) {
  current.interest = {version: 1, startDay: day, startTransaction: current.nextTransaction,
    day, minimum: bankAmounts(current.balances)};
}
function appendTransaction(candidate, request, bankDay, verify) {
  const {current, reservations, requests} = candidate;
  if (!Number.isSafeInteger(current.nextTransaction + 1)) return {error: 'transaction-limit'};
  const key = keyFor(request.action, request.requestId);
  if (requests.has(key)) return {error: 'request-conflict'};
  const result = calculate(current.balances, reservations, request);
  if (result.error) return result;
  const transaction = {id: `currency-${current.nextTransaction}`, requestId: request.requestId, ...signature(request),
    ...(bankDay === undefined ? {} : {bankDay}), before: copy(current.balances), after: result.balances};
  verify?.(transaction);
  current.balances = result.balances;
  current.nextTransaction++;
  current.transactions.push(transaction);
  if (current.interest) for (const id of CURRENCIES) {
    current.interest.minimum[id] = Math.min(current.interest.minimum[id], result.balances[id].bank);
  }
  if (result.hold) reservations.set(result.hold.id, result.hold);
  requests.set(key, transaction);
  candidate.events?.push(transaction);
  return {transaction};
}
function advanceInterest(candidate, day, verify) {
  const {current} = candidate;
  if (!integer(day)) return {error: 'invalid-clock'};
  if (!current.interest) { initializeInterest(current, day); return {}; }
  if (day < current.interest.day) return {error: 'clock-reversed'};
  while (current.interest.day < day) {
    const endedDay = current.interest.day;
    // No payout is possible while every bank balance is below one whole unit
    // of interest. This also bounds restore of long, empty-account calendars.
    if (CURRENCIES.every(id => current.balances[id].bank < 100)) {
      current.interest.day = day;
      current.interest.minimum = bankAmounts(current.balances);
      break;
    }
    for (const currency of CURRENCIES) {
      const principal = current.interest.minimum[currency], amount = Number(BigInt(principal) / 100n);
      if (!amount) continue;
      const result = appendTransaction(candidate, {action: 'interest', currency, amount, day: endedDay,
        principal, ratePercent: 1, requestId: `bank-interest:${endedDay}:${currency}`}, endedDay + 1, verify);
      if (result.error) return result;
    }
    current.interest.day++;
    // Today's interest becomes principal only for the next complete game day.
    current.interest.minimum = bankAmounts(current.balances);
  }
  return {};
}

function restore(saved) {
  if (!object(saved) || saved.version !== 2) return fromLegacy(saved);
  if (!object(saved.legacyCopper) || !Array.isArray(saved.transactions)) throw Error('invalid-saved-state');
  const restored = fromLegacy(saved.legacyCopper), {current} = restored, interest = saved.interest;
  if (interest !== undefined && (!object(interest) || interest.version !== 1 || !integer(interest.startDay) ||
      !integer(interest.day) || interest.day < interest.startDay || !integer(interest.startTransaction) ||
      interest.startTransaction < current.nextTransaction || interest.startTransaction > saved.nextTransaction ||
      !object(interest.minimum) || Object.keys(interest.minimum).length !== CURRENCIES.length ||
      CURRENCIES.some(id => !integer(interest.minimum[id])))) throw Error('invalid-saved-interest');
  let index = 0;
  const initialize = () => {
    if (interest && !current.interest && current.nextTransaction === interest.startTransaction) initializeInterest(current, interest.startDay);
  };
  const verify = canonical => {
    const tx = saved.transactions[index++];
    if (!object(tx) || tx.id !== canonical.id || tx.requestId !== canonical.requestId || tx.bankDay !== canonical.bankDay ||
        !same(signature(tx), signature(canonical)) || !balancesEqual(tx.before, canonical.before) ||
        !balancesEqual(tx.after, canonical.after)) throw Error('invalid-saved-state');
  };
  while (index < saved.transactions.length) {
    initialize();
    const tx = saved.transactions[index];
    if (!object(tx)) throw Error('invalid-saved-state');
    if (current.interest) {
      if (!integer(tx.bankDay) || tx.bankDay > interest.day || advanceInterest(restored, tx.bankDay, verify).error) throw Error('invalid-saved-interest');
      if (saved.transactions[index] !== tx) continue; // Generated interest consumed the recorded boundary receipts.
    } else if (tx.bankDay !== undefined) throw Error('invalid-saved-interest');
    if (tx.action === 'interest' || appendTransaction(restored, tx, current.interest?.day, verify).error) throw Error('invalid-saved-state');
  }
  initialize();
  if (interest && (!current.interest || advanceInterest(restored, interest.day, verify).error ||
      !same(current.interest, interest))) throw Error('invalid-saved-interest');
  if (index !== saved.transactions.length || saved.nextTransaction !== current.nextTransaction ||
      !balancesEqual(saved.balances, current.balances)) throw Error('invalid-saved-state');
  return restored;
}

/** Single writer, synchronous atomic save; no network or real money involved.
 * Version 1 is validated without editing its saved bucket/journal. Its complete
 * snapshot is retained under legacyCopper on the first successful v2 write.
 * Invalid data is never written over or partially imported: mutations lock and
 * balances report null, rather than presenting a corrupt account as empty.
 *
 * saveState(next) must persist the detached complete snapshot atomically before
 * returning undefined/true. Throw/false/Promise reject the operation. No writer
 * means no mutations. state() keeps the copper facade; balances()/snapshot() are
 * lean read-only views. The save schema has only one source for each balance.
 * Existing services stay in copper. reserve(...,currency) binds a hold forever;
 * refund/settle obtain its currency from that hold, never the active region.
 *
 * subscribeCommitted emits a detached successful transaction only after a new
 * save, never during restore or receipt replay. Listener failure cannot undo or
 * repeat money movement. UI listeners must animate only, never call money APIs.
 */
export function createCurrencyLedger({saved, saveState, onTransaction, getClock} = {}) {
  if (saveState !== undefined && typeof saveState !== 'function') throw TypeError('saveState must be a function');
  if (getClock !== undefined && typeof getClock !== 'function') throw TypeError('getClock must be a function');
  let current, reservations, requests, loadError = null;
  try { ({current, reservations, requests} = restore(saved)); }
  catch { ({current, reservations, requests} = fromLegacy()); loadError = 'invalid-saved-state'; }
  let saving = false;
  const listeners = new Set(typeof onTransaction === 'function' ? [onTransaction] : []);
  const leanBalances = () => {
    if (loadError) return null;
    const result = copy(current.balances);
    for (const b of Object.values(result)) b.held = 0;
    for (const h of reservations.values()) if (h.status === 'reserved') result[h.currency].held += h.amount;
    return result;
  };
  const state = () => loadError ? {version: 2, balances: null, cash: null, bank: null, accountOpened: false, total: null, nextTransaction: null, loadError} :
    ({...copy(current), ...current.balances.copper, total: current.balances.copper.cash + current.balances.copper.bank, loadError});
  const failure = code => ({ok: false, code, state: state()});
  const success = (transaction, replayed) => ({ok: true, replayed, receiptId: transaction.requestId, transaction: copy(transaction), state: state()});

  const candidate = () => ({current: {...current, balances: copy(current.balances), transactions: [...current.transactions],
    ...(current.interest ? {interest: copy(current.interest)} : {})}, reservations: new Map(reservations), requests: new Map(requests), events: []});
  function persist(next, transaction = null) {
    saving = true;
    try {
      // Any newly due interest and this requested wage/transfer share one save.
      // The participant still receives only the requested business transaction.
      const saved = saveState(copy(next.current), transaction && copy(transaction));
      if (saved === false || saved?.ok === false) return failure(saved?.code || 'save-failed');
      if (saved && typeof saved.then === 'function') {
        Promise.resolve(saved).catch(() => {});
        return failure('async-save-unsupported');
      }
      ({current, reservations, requests} = next);
      for (const committed of next.events) for (const listener of listeners) { try { listener(copy(committed)); } catch {} }
      return transaction ? success(transaction, false) : {ok: true, replayed: false, day: current.interest.day, transactions: copy(next.events)};
    } catch { return failure('save-failed'); }
    finally { saving = false; }
  }
  function observeDay(day = getClock?.()?.day) {
    if (loadError) return failure(loadError);
    if (saving) return failure('ledger-busy');
    if (!integer(day)) return failure('invalid-clock');
    // The animation loop observes this on every active frame. Do no copying or
    // storage work until an actual day boundary, including repeated scene entry.
    if (current.interest?.day === day) return {ok: true, replayed: true, day, transactions: []};
    if (!saveState) return failure('persistence-unavailable');
    const next = candidate(), result = advanceInterest(next, day);
    return result.error ? failure(result.error) : persist(next);
  }
  function transact(request) {
    if (loadError) return failure(loadError);
    if (saving) return failure('ledger-busy');
    const error = validateRequest(request);
    if (error) return failure(error);
    const key = keyFor(request.action, request.requestId), replay = requests.get(key);
    if (replay) return same(signature(replay), signature(request)) ? success(replay, true) : failure('request-conflict');
    if (!saveState) return failure('persistence-unavailable');
    const next = candidate();
    if (getClock) {
      const result = advanceInterest(next, getClock()?.day);
      if (result.error) return failure(result.error);
    }
    const result = appendTransaction(next, request, next.current.interest?.day);
    return result.error ? failure(result.error) : persist(next, result.transaction);
  }
  const simple = (action, amount, requestId, currency = 'copper') => transact({action, amount, requestId, currency});
  function finish(action, reservationId) {
    if (loadError) return failure(loadError);
    if (!idValid(reservationId)) return failure('invalid-request-id');
    const hold = reservations.get(reservationId);
    if (!hold) return failure('reservation-not-found');
    return transact({action, amount: hold.amount, currency: hold.currency, requestId: terminalId(action, reservationId), reservationId});
  }
  return Object.freeze({
    loadError, state, observeDay, balances: leanBalances,
    snapshot: () => ({version: 2, balances: leanBalances(), nextTransaction: loadError ? null : current.nextTransaction, loadError}),
    history: () => [...copy(current.legacyCopper.transactions), ...copy(current.transactions)],
    reservations: () => loadError ? [] : copy([...reservations.values()]),
    openAccount: (id, currency) => simple('open', 0, id, currency),
    deposit: (amount, id, currency) => simple('deposit', amount, id, currency),
    withdraw: (amount, id, currency) => simple('withdraw', amount, id, currency),
    earn: (amount, id) => simple('earn', amount, id, 'copper'),
    reserve: (amount, id, currency) => simple('reserve', amount, id, currency),
    // NPC owners can spend their same-currency total without a physical bank
    // trip. Player services keep using reserve(), which remains cash-only.
    reserveFromTotal: (amount, requestId, currency) => transact({action: 'reserve', amount, requestId, currency, funding: 'cash+bank'}),
    settle: id => finish('settle', id), refund: id => finish('refund', id),
    creditWageToBank: ({amount, receiptId, currency = 'copper', roleId, slotId, day} = {}) =>
      transact({action: 'wage', amount, requestId: receiptId, currency, roleId, slotId, day}),
    transferBusiness: ({amount, receiptId, operation, businessId = 'cn-yunlai-tavern'} = {}) =>
      transact({action: 'business', amount, requestId: receiptId, currency: 'copper', businessId, operation}),
    quoteExchange: request => loadError ? {ok: false, code: loadError} : makeQuote(request),
    exchange: ({quote, requestId} = {}) => transact({action: 'exchange', currency: quote?.from, amount: quote?.amount, requestId, quote}),
    subscribeCommitted(listener) {
      if (typeof listener !== 'function') throw TypeError('transaction listener must be a function');
      listeners.add(listener); return () => listeners.delete(listener);
    },
  });
}

// Storage is injected, including the isolated preview store. Update the enclosing
// save only after the complete game snapshot has synchronously reached storage.
export function createGameCurrencyLedger({saved, storage, key = 'worlds-days-v1', onTransaction, getClock, transactionParticipant = () => null}) {
  return createCurrencyLedger({saved: saved.copperLedger, onTransaction, getClock, saveState: (nextLedger, transaction) => {
    const participant = transaction ? transactionParticipant(transaction) : null;
    if (participant?.ok === false) return participant;
    // A property transfer or business-funded wage and its money receipt reach
    // the same game snapshot. Neither participant advances before this write.
    const next = {...saved, ...participant?.patch, copperLedger: nextLedger};
    const result = storage.setItem(key, JSON.stringify(next));
    if (result === false || result && typeof result.then === 'function') return result;
    Object.assign(saved, participant?.patch, {copperLedger: nextLedger});
    participant?.committed?.();
  }});
}
