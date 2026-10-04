// Fictional copper only. This module never awards cash: the only balance changes
// transfer existing copper between the player's wallet and an opened account.
const VERSION = 1;
const ACTIONS = new Set(['open', 'deposit', 'withdraw']);
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

function applyTransfer(before, action, amount) {
  if (action === 'open') return {...before, accountOpened: true};
  const direction = action === 'deposit' ? -1 : 1;
  return {...before, cash: before.cash + direction * amount, bank: before.bank - direction * amount};
}

// Rebuild a canonical snapshot instead of trusting or retaining caller objects.
// A broken journal is never trimmed: doing so could discard a successful request
// ID and let the same button request transfer money again after a reload.
function restore(saved) {
  if (saved == null || (typeof saved === 'object' && !Array.isArray(saved) && Object.keys(saved).length === 0)) {
    return empty();
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
  let previous;
  for (const [index, tx] of saved.transactions.entries()) {
    if (!tx || typeof tx !== 'object' || tx.id !== `copper-${index + 1}` ||
        !requestIdValid(tx.requestId) || requestIds.has(tx.requestId) ||
        !ACTIONS.has(tx.action) || !balanceValid(tx.before) || !balanceValid(tx.after) ||
        !integer(tx.amount) || (tx.action === 'open' ? tx.amount !== 0 : tx.amount === 0) ||
        (previous && !sameBalances(previous, tx.before))) {
      throw new Error('invalid-saved-state');
    }
    if (tx.action === 'open' ? tx.before.accountOpened : !tx.before.accountOpened) {
      throw new Error('invalid-saved-state');
    }
    const expected = applyTransfer(balances(tx.before), tx.action, tx.amount);
    if (!balanceValid(expected) || !sameBalances(expected, tx.after) ||
        tx.before.cash + tx.before.bank !== tx.after.cash + tx.after.bank) {
      throw new Error('invalid-saved-state');
    }
    requestIds.add(tx.requestId);
    transactions.push({id: tx.id, requestId: tx.requestId, action: tx.action,
      amount: tx.amount, before: balances(tx.before), after: balances(tx.after)});
    previous = tx.after;
  }
  if (previous && !sameBalances(previous, saved)) throw new Error('invalid-saved-state');
  return {version: VERSION, ...balances(saved), nextTransaction: saved.nextTransaction, transactions};
}

/**
 * createCopperLedger({saved, saveState}) is a synchronous, single-writer ledger.
 *
 * saved is a prior state() / saveState snapshot. Missing saves start at zero,
 * with an unopened account; this module has no cash-award or balance-set API.
 * Malformed nonempty saves set loadError and lock mutations without overwriting
 * the supplied data. A valid saved balance can be supplied explicitly in tests.
 *
 * saveState(next) receives a detached complete snapshot and MUST synchronously
 * persist it atomically before returning; undefined/true mean success. Throw or
 * return false to reject. Do not swallow storage errors or mutate an enclosing
 * saved object before its durable write. Async persistence is unsupported.
 * Omitting saveState intentionally creates an in-memory ledger.
 *
 * state() adds a derived total to the persisted schema:
 * {version:1,cash,bank,accountOpened,nextTransaction,transactions:[...]}
 * history() is oldest first. Every returned object is detached from the ledger.
 *
 * openAccount(requestId), deposit(amount, requestId), withdraw(amount, requestId)
 * return {ok:true,replayed,transaction,state} or {ok:false,code,state}.
 * Amounts must be positive safe integer copper. A requestId is a nonempty string
 * (at most 128 characters, no surrounding whitespace), generated once per user
 * intent and reused for retries. Successful IDs remain in the persisted journal:
 * matching replay succeeds without a write; changing action/amount is a conflict.
 * Rejected requests do not reserve IDs. A new open request on an already opened
 * account returns account-already-open without adding a transaction.
 */
export function createCopperLedger({saved, saveState = () => {}} = {}) {
  if (typeof saveState !== 'function') throw new TypeError('saveState must be a function');
  let current;
  let loadError = null;
  try { current = restore(saved); }
  catch { current = empty(); loadError = 'invalid-saved-state'; }
  let saving = false;
  const requests = new Map(current.transactions.map(tx => [tx.requestId, tx]));
  const state = () => ({...copy(current), total: current.cash + current.bank});
  const failure = code => ({ok: false, code, state: state()});

  function transact(action, amount, requestId) {
    if (loadError) return failure(loadError);
    if (saving) return failure('ledger-busy');
    if (!requestIdValid(requestId)) return failure('invalid-request-id');
    const replay = requests.get(requestId);
    if (replay) {
      if (replay.action !== action || replay.amount !== amount) return failure('request-conflict');
      return {ok: true, replayed: true, transaction: copy(replay), state: state()};
    }
    if (action !== 'open' && (!integer(amount) || amount === 0)) return failure('invalid-amount');
    if (action === 'open' && current.accountOpened) return failure('account-already-open');
    if (action !== 'open' && !current.accountOpened) return failure('account-not-open');
    if (action === 'deposit' && amount > current.cash) return failure('insufficient-cash');
    if (action === 'withdraw' && amount > current.bank) return failure('insufficient-bank');
    if (!Number.isSafeInteger(current.nextTransaction + 1)) return failure('transaction-limit');

    const before = balances(current);
    const after = applyTransfer(before, action, amount);
    if (!balanceValid(after) || after.cash + after.bank !== current.cash + current.bank) {
      return failure('balance-overflow');
    }
    const transaction = {id: `copper-${current.nextTransaction}`, requestId, action, amount, before, after};
    const next = {...current, ...after, nextTransaction: current.nextTransaction + 1,
      transactions: [...current.transactions, transaction]};
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
      requests.set(requestId, transaction);
      return {ok: true, replayed: false, transaction: copy(transaction), state: state()};
    } catch {
      return failure('save-failed');
    } finally {
      saving = false;
    }
  }

  return Object.freeze({
    loadError,
    state,
    history: () => copy(current.transactions),
    openAccount: requestId => transact('open', 0, requestId),
    deposit: (amount, requestId) => transact('deposit', amount, requestId),
    withdraw: (amount, requestId) => transact('withdraw', amount, requestId),
  });
}
