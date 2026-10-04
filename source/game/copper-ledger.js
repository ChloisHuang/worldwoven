// Fictional copper only. Wages require a caller-owned receipt for physically
// completed labor; service holds spend existing wallet copper atomically.
const VERSION = 1;
const ACTIONS = new Set(['open', 'deposit', 'withdraw', 'earn', 'reserve', 'settle', 'refund']);
const copy = value => JSON.parse(JSON.stringify(value));
const integer = value => Number.isSafeInteger(value) && value >= 0;
const requestIdValid = value => typeof value === 'string' && value.length > 0 &&
  value.length <= 128 && value.trim() === value;
const balanceValid = value => value && typeof value === 'object' &&
  integer(value.cash) && integer(value.bank) &&
  Number.isSafeInteger(value.cash + value.bank) &&
  typeof value.accountOpened === 'boolean' && (value.accountOpened || value.bank === 0);
const balances = value => ({cash: value.cash, bank: value.bank, accountOpened: value.accountOpened});
const sameBalances = (a, b) => a.cash === b.cash && a.bank === b.bank && a.accountOpened === b.accountOpened;
const empty = () => ({version: VERSION, cash: 0, bank: 0, accountOpened: false, nextTransaction: 1, transactions: []});
const terminal = action => action === 'settle' || action === 'refund';
const terminalId = (action, reservationId) => JSON.stringify([action, reservationId]);
// External IDs may contain any characters allowed by the original v1 contract.
// A separate namespace prevents them from colliding with generated hold IDs.
const requestKey = (action, requestId) => JSON.stringify([terminal(action), requestId]);
const amountValid = (action, amount) => integer(amount) &&
  (action === 'open' ? amount === 0 : amount > 0);

function applyTransaction(before, action, amount) {
  if (action === 'open') return {...before, accountOpened: true};
  if (action === 'earn' || action === 'refund') return {...before, cash: before.cash + amount};
  if (action === 'reserve') return {...before, cash: before.cash - amount};
  if (action === 'settle') return {...before};
  const direction = action === 'deposit' ? -1 : 1;
  return {...before, cash: before.cash + direction * amount, bank: before.bank - direction * amount};
}

function reservationAfter(reservations, action, amount, requestId, reservationId) {
  if (action === 'reserve') return {id: requestId, amount, status: 'reserved'};
  if (terminal(action)) return {...reservations.get(reservationId), status: action === 'settle' ? 'settled' : 'refunded'};
  return null;
}

// Rebuild a canonical snapshot instead of trusting or retaining caller objects.
// A broken journal is never trimmed: doing so could discard a successful request
// ID and let the same button request move money again after a reload. Reservations
// are derived from the journal, so there is no second persisted source of truth.
function restore(saved) {
  if (saved == null || (typeof saved === 'object' && !Array.isArray(saved) && Object.keys(saved).length === 0)) {
    return {current: empty(), reservations: new Map(), held: 0};
  }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved) ||
      saved.version !== VERSION || !balanceValid(saved) ||
      !Number.isSafeInteger(saved.nextTransaction) || saved.nextTransaction < 1 ||
      !Array.isArray(saved.transactions) || saved.nextTransaction !== saved.transactions.length + 1 ||
      ('total' in saved && saved.total !== saved.cash + saved.bank)) {
    throw new Error('invalid-saved-state');
  }
  const requestIds = new Set();
  const transactions = [];
  const reservations = new Map();
  let held = 0;
  let previous;
  for (const [index, tx] of saved.transactions.entries()) {
    if (!tx || typeof tx !== 'object' || tx.id !== `copper-${index + 1}` ||
        !ACTIONS.has(tx.action) || !balanceValid(tx.before) || !balanceValid(tx.after) ||
        !amountValid(tx.action, tx.amount) ||
        (terminal(tx.action) ? !requestIdValid(tx.reservationId) ||
          tx.requestId !== terminalId(tx.action, tx.reservationId) : !requestIdValid(tx.requestId)) ||
        requestIds.has(requestKey(tx.action, tx.requestId)) ||
        (previous && !sameBalances(previous, tx.before))) {
      throw new Error('invalid-saved-state');
    }
    if ((tx.action === 'open' && tx.before.accountOpened) ||
        ((tx.action === 'deposit' || tx.action === 'withdraw') && !tx.before.accountOpened)) {
      throw new Error('invalid-saved-state');
    }
    if (terminal(tx.action)) {
      const reservation = reservations.get(tx.reservationId);
      if (!reservation || reservation.status !== 'reserved' || reservation.amount !== tx.amount) {
        throw new Error('invalid-saved-state');
      }
    }
    const expected = applyTransaction(balances(tx.before), tx.action, tx.amount);
    held += tx.action === 'reserve' ? tx.amount : terminal(tx.action) ? -tx.amount : 0;
    if (!balanceValid(expected) || !sameBalances(expected, tx.after) || !integer(held) ||
        !Number.isSafeInteger(expected.cash + expected.bank + held)) {
      throw new Error('invalid-saved-state');
    }
    const reservation = reservationAfter(reservations, tx.action, tx.amount, tx.requestId, tx.reservationId);
    if (reservation) reservations.set(reservation.id, reservation);
    requestIds.add(requestKey(tx.action, tx.requestId));
    transactions.push({id: tx.id, requestId: tx.requestId, action: tx.action,
      amount: tx.amount, before: balances(tx.before), after: balances(tx.after),
      ...(terminal(tx.action) ? {reservationId: tx.reservationId} : {})});
    previous = tx.after;
  }
  if (previous && !sameBalances(previous, saved)) throw new Error('invalid-saved-state');
  return {current: {version: VERSION, ...balances(saved), nextTransaction: saved.nextTransaction, transactions},
    reservations, held};
}

/**
 * createCopperLedger({saved, saveState}) is a synchronous, single-writer ledger.
 * Missing saves start at zero with an unopened account. Existing version-1 bank
 * journals remain valid. Malformed saves set loadError and lock all mutations.
 *
 * saveState(next) receives a detached complete snapshot and MUST synchronously
 * persist it atomically before returning; undefined/true mean success. Throw or
 * return false to reject. Do not swallow storage errors or mutate an enclosing
 * saved object before its durable write. Async persistence is unsupported.
 * Omitting saveState intentionally creates an in-memory ledger.
 *
 * state() adds total = cash + bank to the persisted version-1 schema. Reserved
 * service copper is already removed from cash. history() is oldest first;
 * reservations() lists every {id, amount, status}, including finalized holds.
 * Every returned object is detached. Callers recover abandoned reserved holds
 * with refund(id); loading alone never changes money or performs a write.
 *
 * openAccount(id), deposit(amount,id), withdraw(amount,id), earn(amount,id),
 * reserve(amount,id), settle(id), refund(id) return
 * {ok:true,replayed,transaction,state} or {ok:false,code,state}.
 * Copper amounts are positive safe integers. The caller must verify completed
 * labor before earn; zero-income work does not create a wage transaction.
 * External IDs are nonempty strings of at most 128 characters with no surrounding
 * whitespace, generated once per intent and reused on retries. Successful IDs
 * stay in the journal forever. Matching replay succeeds without writing; changed
 * action/amount conflicts. A rejected request does not consume its ID.
 *
 * reserve debits cash; settle finalizes its hold without changing cash; refund
 * restores only a reserved hold. Hold IDs can never be reused. Settle/refund use
 * deterministic internal IDs in a separate namespace from external requests.
 * Bank actions require an opened account; wages and services do not.
 */
export function createCopperLedger({saved, saveState = () => {}} = {}) {
  if (typeof saveState !== 'function') throw new TypeError('saveState must be a function');
  let current;
  let reservations;
  let held;
  let loadError = null;
  try { ({current, reservations, held} = restore(saved)); }
  catch { current = empty(); reservations = new Map(); held = 0; loadError = 'invalid-saved-state'; }
  let saving = false;
  const requests = new Map(current.transactions.map(tx => [requestKey(tx.action, tx.requestId), tx]));
  const state = () => ({...copy(current), total: current.cash + current.bank});
  const failure = code => ({ok: false, code, state: state()});

  function transact(action, amount, requestId, reservationId) {
    if (loadError) return failure(loadError);
    if (saving) return failure('ledger-busy');
    if (!terminal(action) && !requestIdValid(requestId)) return failure('invalid-request-id');
    const key = requestKey(action, requestId);
    const replay = requests.get(key);
    if (replay) {
      if (replay.action !== action || replay.amount !== amount) return failure('request-conflict');
      return {ok: true, replayed: true, transaction: copy(replay), state: state()};
    }
    if (!amountValid(action, amount)) return failure('invalid-amount');
    if (action === 'open' && current.accountOpened) return failure('account-already-open');
    if ((action === 'deposit' || action === 'withdraw') && !current.accountOpened) return failure('account-not-open');
    if ((action === 'deposit' || action === 'reserve') && amount > current.cash) return failure('insufficient-cash');
    if (action === 'withdraw' && amount > current.bank) return failure('insufficient-bank');
    if (terminal(action)) {
      const reservation = reservations.get(reservationId);
      if (!reservation) return failure('reservation-not-found');
      if (reservation.status !== 'reserved') return failure(`reservation-${reservation.status}`);
    }
    if (!Number.isSafeInteger(current.nextTransaction + 1)) return failure('transaction-limit');

    const before = balances(current);
    const after = applyTransaction(before, action, amount);
    const nextHeld = held + (action === 'reserve' ? amount : terminal(action) ? -amount : 0);
    // Include refundable holds in the safe-integer limit: a wage cannot make a
    // later refund overflow, even though public total remains cash + bank.
    if (!balanceValid(after) || !integer(nextHeld) || !Number.isSafeInteger(after.cash + after.bank + nextHeld)) {
      return failure('balance-overflow');
    }
    const transaction = {id: `copper-${current.nextTransaction}`, requestId, action, amount, before, after,
      ...(terminal(action) ? {reservationId} : {})};
    const next = {...current, ...after, nextTransaction: current.nextTransaction + 1,
      transactions: [...current.transactions, transaction]};
    const reservation = reservationAfter(reservations, action, amount, requestId, reservationId);
    saving = true;
    try {
      const result = saveState(copy(next));
      if (result === false) return failure('save-failed');
      if (result && typeof result.then === 'function') {
        // The contract is synchronous; consume a rejected Promise to avoid an
        // unhandled rejection, and never announce an unconfirmed write as saved.
        Promise.resolve(result).catch(() => {});
        return failure('async-save-unsupported');
      }
      current = next;
      held = nextHeld;
      if (reservation) reservations.set(reservation.id, reservation);
      requests.set(key, transaction);
      return {ok: true, replayed: false, transaction: copy(transaction), state: state()};
    } catch {
      return failure('save-failed');
    } finally {
      saving = false;
    }
  }

  function finishReservation(action, reservationId) {
    if (loadError) return failure(loadError);
    if (saving) return failure('ledger-busy');
    if (!requestIdValid(reservationId)) return failure('invalid-request-id');
    const reservation = reservations.get(reservationId);
    if (!reservation) return failure('reservation-not-found');
    return transact(action, reservation.amount, terminalId(action, reservationId), reservationId);
  }

  return Object.freeze({
    loadError,
    state,
    history: () => copy(current.transactions),
    reservations: () => copy([...reservations.values()]),
    openAccount: requestId => transact('open', 0, requestId),
    deposit: (amount, requestId) => transact('deposit', amount, requestId),
    withdraw: (amount, requestId) => transact('withdraw', amount, requestId),
    earn: (amount, receiptId) => transact('earn', amount, receiptId),
    reserve: (amount, reservationId) => transact('reserve', amount, reservationId),
    settle: reservationId => finishReservation('settle', reservationId),
    refund: reservationId => finishReservation('refund', reservationId),
  });
}
