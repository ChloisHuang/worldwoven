// Fictional copper only. The six officials never borrow the player's wallet.
// Completed duty is government-funded; only earned NPC balances can be spent.
import {CHINA_COURT_OFFICIAL_RANKS, CHINA_OFFICIAL_DAILY_WAGE, CHINA_OFFICIAL_GRADE_PAY_V1,
  CHINA_OFFICIAL_GRADE_PAY_POLICY_ID, CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1} from './china-official-ranks.js';
import {SALON_ARTISTS} from './china-tavern-salon-artists.js';
import {PLAYER_SALON_POLICY,playerSalonEvidence} from './china-salon-player-payments.js';
import {SALON_QUOTE_VERSION, validSalonFee} from './china-salon-pricing.js';
export const CHINA_OFFICIAL_IDS = Object.freeze(CHINA_COURT_OFFICIAL_RANKS.map(rank => rank.actorId));
export const CHINA_OFFICIAL_TAVERN_ID = 'cn-yunlai-tavern';
export const CHINA_OFFICIAL_SALON_MEAL_MINIMUM = 6;
const OFFICIALS = new Set(CHINA_OFFICIAL_IDS);
// These fixed NPC appointments are the V1 contract catalogue. A future policy
// must keep this version's grades/rates available rather than reprice receipts.
const GRADE_PAY_V1 = new Map(Object.entries(CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1).map(([actorId, gradeId]) =>
  [actorId, Object.freeze({version: 1, policyId: CHINA_OFFICIAL_GRADE_PAY_POLICY_ID,
    gradeId, amount: CHINA_OFFICIAL_GRADE_PAY_V1[gradeId]})]));
// Stable personal-source identity, independent of rank labels or wage policy.
// It is provider metadata only and never appoints somebody to an office.
const OFFICIAL_MEAL_SOURCE = 'cn-official-earned-duty';
const ACTIONS = new Set(['duty', 'withdraw', 'meal-payment', 'meal-refund', 'salon-reserve', 'salon-settle', 'salon-refund']);
const SALON_POLICY = Object.freeze({version: 1, performerShareBps: 5000, rounding: 'floor'});
const ARTISTS = new Map(SALON_ARTISTS.map(artist => [artist.id, artist.activity]));
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
  accounts: copy(state.accounts), destinations: copy(state.destinations),
  ...(Object.hasOwn(state, 'salonHolds') ? {salonHolds: copy(state.salonHolds)} : {}),
  ...(Object.hasOwn(state, 'playerSalonPaid') ? {playerSalonPaid:state.playerSalonPaid} : {})});
const fundingAccount = (actorId, split) => `${actorId}:${split.cash === 0 ? 'bank' : split.bank === 0 ? 'cash' : 'cash+bank'}`;
const salonAction = action => action.startsWith('salon-');
const salonId = id => identifier(id) && /^cn-salon-(npc|work)-[1-9][0-9]*$/.test(id) && positive(Number(id.split('-').at(-1)));
const salonEscrow = orderId => `official-salon-escrow:${orderId}`;
const salonTerms = value => ({actorId: value.actorId, amount: value.amount, artistId: value.artistId,
  activity: value.activity, incomePolicy: copy(value.incomePolicy)});

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
const legacyWageFor = (state, actorId) => state.dailyWages?.[actorId] ?? state.dailyWage;
const contractFor = (state, actorId, day) => state.payPolicy && day >= state.payPolicy.effectiveDay ? GRADE_PAY_V1.get(actorId) : null;
const wageFor = (state, actorId, day) => contractFor(state, actorId, day)?.amount ?? legacyWageFor(state, actorId);
function payPolicyFor(value) {
  if (!object(value) || !integer(value.effectiveDay) ||
      !same(value, {version: 1, policyId: CHINA_OFFICIAL_GRADE_PAY_POLICY_ID, effectiveDay: value.effectiveDay})) throw Error('invalid-pay-policy');
  return copy(value);
}
function conserved(state) {
  if (!object(state.accounts) || Object.keys(state.accounts).length !== CHINA_OFFICIAL_IDS.length ||
      !object(state.destinations) || Object.keys(state.destinations).length !== 1 || !integer(state.destinations[CHINA_OFFICIAL_TAVERN_ID])) return false;
  if(Object.hasOwn(state,'playerSalonPaid')&&!integer(state.playerSalonPaid))return false;
  let total = BigInt(state.destinations[CHINA_OFFICIAL_TAVERN_ID])+BigInt(state.playerSalonPaid||0);
  for (const id of CHINA_OFFICIAL_IDS) {
    const account = state.accounts[id];
    if (!object(account) || Object.keys(account).length !== 2 || !integer(account.bank) || !integer(account.cash)) return false;
    total += BigInt(account.bank) + BigInt(account.cash);
  }
  if (Object.hasOwn(state, 'salonHolds')) {
    if (state.version !== 2 || !object(state.salonHolds)) return false;
    for (const [id, hold] of Object.entries(state.salonHolds)) {
      if (!salonId(id) || !object(hold) || hold.id !== id || !positive(hold.amount) ||
          !['reserved', 'settled', 'refunded'].includes(hold.status)) return false;
      if (hold.status === 'reserved') total += BigInt(hold.amount);
    }
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
function salonEvidenceFor(evidence, request) {
  if(request.artistId==='player')return playerSalonEvidence(evidence,request);
  if (!object(evidence) || evidence.kind !== 'salon-service' || evidence.completed !== true ||
      evidence.orderId !== request.orderId || evidence.customerId !== request.actorId ||
      evidence.artistId !== request.artistId || evidence.activity !== request.activity ||
      !Number.isFinite(evidence.elapsed) || !Number.isFinite(evidence.duration) || evidence.duration < 2.2 || evidence.elapsed < evidence.duration) return null;
  return {kind: 'salon-service', completed: true, orderId: request.orderId, customerId: request.actorId,
    artistId: request.artistId, activity: request.activity, elapsed: evidence.elapsed, duration: evidence.duration};
}
function requestFor(action, input, state) {
  if (!object(input) || !OFFICIALS.has(input.actorId)) return failure('invalid-actor');
  const request = {action, actorId: input.actorId, amount: action === 'duty' ? wageFor(state, input.actorId, input.day) : input.amount,
    receiptId: action.startsWith('meal-') || salonAction(action) ? mealReceipt(action, input.orderId) : input.receiptId};
  if (!positive(request.amount)) return failure('invalid-amount');
  if (!identifier(request.receiptId, 256)) return failure('invalid-receipt-id');
  if (action === 'duty') {
    if (!integer(input.day)) return failure('invalid-day');
    const evidence = evidenceFor(input.evidence, input.actorId, input.day);
    if (!evidence) return failure('incomplete-duty');
    request.day = input.day; request.evidence = evidence;
    const contract = contractFor(state, input.actorId, input.day);
    // Callers may omit the contract: the ledger freezes it from the original
    // duty day, never the retry/payment day or a caller-selected grade.
    if (Object.hasOwn(input, 'payContract') && (!contract || !same(input.payContract, contract))) return failure('invalid-pay-contract');
    if (contract) {
      if (Object.hasOwn(input, 'amount') && input.amount !== contract.amount) return failure('invalid-amount');
      request.payContract = copy(contract);
    }
  } else if (action.startsWith('meal-')) {
    if (!identifier(input.orderId)) return failure('invalid-order-id');
    request.orderId = input.orderId;
  } else if (salonAction(action)) {
    if (state.version !== 2) return failure('invalid-action');
    if (!salonId(input.orderId)) return failure('invalid-order-id');
    if (!validSalonFee(input.amount, SALON_QUOTE_VERSION)) return failure('invalid-salon-fee');
    const playerWork=input.artistId==='player';
    if(playerWork?!/^cn-salon-work-/.test(input.orderId)||!['poetry','story','music','chess'].includes(input.activity):!/^cn-salon-npc-/.test(input.orderId)||!ARTISTS.has(input.artistId)||ARTISTS.get(input.artistId)!==input.activity)return failure('invalid-salon-artist');
    const policy=playerWork?PLAYER_SALON_POLICY:SALON_POLICY;
    if (!same(input.incomePolicy, policy)) return failure('invalid-salon-income-policy');
    Object.assign(request, {orderId: input.orderId, artistId: input.artistId, activity: input.activity, incomePolicy: copy(policy)});
    if (action === 'salon-settle') {
      const evidence = salonEvidenceFor(input.evidence, request);
      if (!evidence) return failure('incomplete-salon-service');
      request.evidence = evidence;
    }
  }
  return {ok: true, request};
}
function requestOf(transaction) {
  return {action: transaction.action, actorId: transaction.actorId, amount: transaction.amount, receiptId: transaction.receiptId,
    ...(transaction.action === 'duty' ? {day: transaction.day, evidence: transaction.evidence,
      ...(Object.hasOwn(transaction, 'payContract') ? {payContract: transaction.payContract} : {})} : {}),
    ...(transaction.action.startsWith('meal-') ? {orderId: transaction.orderId} : {}),
    ...(salonAction(transaction.action) ? {orderId: transaction.orderId, artistId: transaction.artistId,
      activity: transaction.activity, incomePolicy: transaction.incomePolicy} : {}),
    ...(transaction.action === 'salon-settle' ? {evidence: transaction.evidence} : {})};
}
function indexes() { return {receipts: new Map(), duties: new Map(), meals: new Map(), ownedActors: new Set()}; }
function indexTransaction(index, transaction) {
  index.receipts.set(transaction.receiptId, transaction);
  if (transaction.action === 'duty') { index.duties.set(dayKey(transaction.actorId, transaction.day), transaction); index.ownedActors.add(transaction.actorId); }
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
  } else if (salonAction(request.action)) {
    const old = state.salonHolds?.[request.orderId];
    next.salonHolds = copy(state.salonHolds || {});
    if (request.action === 'salon-reserve') {
      if (old) return failure(`salon-already-${old.status}`);
      const available = BigInt(account.cash) + BigInt(account.bank);
      if (BigInt(amount) > available) return failure('insufficient-funds');
      if (available - BigInt(amount) < BigInt(CHINA_OFFICIAL_SALON_MEAL_MINIMUM)) return failure('insufficient-meal-reserve');
      sourceSplit = {cash: Math.min(amount, account.cash), bank: Math.max(0, amount - account.cash)};
      account.cash -= sourceSplit.cash; account.bank -= sourceSplit.bank;
      next.salonHolds[request.orderId] = {id: request.orderId, ...salonTerms(request), sourceSplit: copy(sourceSplit), status: 'reserved'};
      from = fundingAccount(request.actorId, sourceSplit); to = salonEscrow(request.orderId);
    } else {
      if (!old) return failure('salon-reserve-not-found');
      if (!same(salonTerms(old), salonTerms(request))) return failure('request-conflict');
      if (old.status !== 'reserved') return failure(`salon-already-${old.status}`);
      sourceSplit = copy(old.sourceSplit); from = salonEscrow(request.orderId);
      if (request.action === 'salon-settle') {
        if(request.artistId==='player'){next.playerSalonPaid=(next.playerSalonPaid||0)+amount;to='player:copper-bank';}
        else{next.destinations[CHINA_OFFICIAL_TAVERN_ID] += amount; to = CHINA_OFFICIAL_TAVERN_ID;}
        next.salonHolds[request.orderId].status = 'settled';
      } else {
        account.cash += sourceSplit.cash; account.bank += sourceSplit.bank; to = fundingAccount(request.actorId, sourceSplit);
        next.salonHolds[request.orderId].status = 'refunded';
      }
    }
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
    // Keep the validated original journal object, including optional legacy
    // fields and key ordering, instead of rewriting historical receipt bytes.
    result.next.transactions[result.next.transactions.length - 1] = copy(transaction);
    current = result.next; indexTransaction(index, current.transactions.at(-1));
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
  if (Object.hasOwn(saved, 'payPolicy')) {
    current.payPolicy = payPolicyFor(saved.payPolicy);
    // The original v1 segment replayed with its finite historical reserve.
    // It cannot be relabelled as a later grade-pay contract after migration.
    if (saved.transactions.slice(0, legacyCount).some(tx => tx.action === 'duty' && tx.day >= current.payPolicy.effectiveDay)) throw Error('invalid-saved-state');
  }
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
 * dailyWage and optional per-actor dailyWages are frozen legacy rates.
 * Restore reads that saved policy, never today's rank catalogue or new caller
 * defaults. Version-1 states are fully replay-validated before v2 migration;
 * their accounts and receipts stay unchanged. The old source and remainder
 * survive only as legacyFunding metadata, not a spendable reserve. New duty
 * records governmentPaid as cumulative earned pay, never a finite treasury.
 * Loading performs no write, payment, interest or historical wage catch-up.
 * Changing a rank label cannot reprice old receipts or synthesize back pay.
 * activateGradePayPolicy explicitly persists the immutable V1 grade schedule
 * metadata in one write, without paying anybody. Fresh ledgers begin on day 0;
 * loaded ledgers switch the day after construction, preserving all in-progress
 * duties on the upgrade day. Failed retries retain this captured cutoff; an
 * optional full-world activationPlan preserves it through ordinary saves and
 * reloads while the monetary policy write is still pending.
 * Each new-policy duty freezes a payContract; historical receipts stay exact.
 * Production requires activation before paying a new certificate, so a failed
 * policy save cannot silently pay new days at the old rate or lose the claim.
 * Automatic NPC promotions and new salary-policy versions are not wired.
 *
 * Official salon preparations use only these earned balances. Reserve
 * retains six copper for a meal and holds the exact cash/bank split outside
 * business revenue. Settle requires the frozen artist/activity/fee/50:50
 * policy and actual completion certificate; refund restores that split only
 * before settlement. The coordinator supplies the scene and artist/business
 * patches in the same full-world write. Player-service work keeps its distinct
 * 100% player-bank policy and completed specialty proof; playerSalonPaid is a
 * cumulative outflow, never spendable business money or a second wage source.
 * salonHolds appears only on the first salon transaction, so old v1/v2
 * journals and their balance snapshots replay byte-for-byte unchanged.
 */
export function createChinaOfficialEconomy({saved, initialTreasury, dailyWage = CHINA_OFFICIAL_DAILY_WAGE, dailyWages, isAppointed = () => false,
  getDay = () => null, saveState, requireGradePayPolicy = false, activationPlan} = {}) {
  let current = null, index = indexes(), busy = false, loadError = null, revision = 0;
  const wasFresh = saved === undefined || saved === null;
  let activationDay = wasFresh ? 0 : null, activationError = null;
  if (typeof isAppointed !== 'function' || typeof getDay !== 'function' || saveState !== undefined && typeof saveState !== 'function') throw TypeError('official economy requires synchronous callbacks');
  try {
    if (saved === undefined || saved === null) {
      source(initialTreasury); // Validate a deprecated caller option, never fund accounts from it.
      current = fresh(dailyWage, dailyWages);
    }
    else ({current, index} = restore(saved, initialTreasury));
  } catch { loadError = saved === undefined || saved === null ? 'invalid-config' : 'invalid-saved-state'; }
  // The full-world owner may persist this intent with an ordinary world save
  // after the first policy write failed. That preserves the cutoff on reload
  // without prematurely adding policy or income to the monetary ledger.
  // A successfully activated saved policy is always authoritative.
  if (current && !current.payPolicy) {
    if (activationPlan !== undefined) {
      try { activationDay = payPolicyFor(activationPlan).effectiveDay; }
      catch { activationError = 'invalid-pay-policy'; }
    } else if (!wasFresh) {
      // Otherwise capture once at construction, never again during a retry.
      try { const day = getDay(); if (integer(day) && integer(day + 1)) activationDay = day + 1; } catch {}
    }
  }
  function activateGradePayPolicy() {
    if (loadError) return failure(loadError);
    if (busy) return failure('ledger-busy');
    if (current.payPolicy) return {ok: true, replayed: true, payPolicy: copy(current.payPolicy)};
    if (activationError) return failure(activationError);
    if (!integer(activationDay)) return failure('day-mismatch');
    // A delayed activation cannot reinterpret a legacy payment already made
    // at or after its captured cutoff. Keep the ledger intact and report it.
    if (current.transactions.some(tx => tx.action === 'duty' && tx.day >= activationDay)) return failure('pay-policy-conflict');
    if (!saveState) return failure('persistence-unavailable');
    const policy = {version: 1, policyId: CHINA_OFFICIAL_GRADE_PAY_POLICY_ID, effectiveDay: activationDay};
    const next = {...current, payPolicy: policy};
    // Even a rejected activation discards detached candidates/guards prepared
    // before the policy attempt. Monetary state itself remains byte-identical.
    revision++; busy = true;
    try {
      const result = saveState(copy(next), null, {});
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch(() => {});
        return failure('async-save-unsupported');
      }
      if (result === false || result?.ok === false) return failure('save-failed');
      current = next;
      return {ok: true, replayed: false, payPolicy: copy(policy)};
    } catch { return failure('save-failed'); }
    finally { busy = false; }
  }
  function liveCheck(request) {
    // A validated original hold still belongs to its fixed NPC account after
    // appointment loss. Availability cannot confiscate refundable escrow.
    if (request.action === 'salon-refund') return null;
    try {
      if (isAppointed(request.actorId) !== true) return 'actor-not-appointed';
      if (request.action === 'duty') {
        const currentDay = getDay();
        if (!integer(currentDay) || request.day > currentDay) return 'day-mismatch';
      }
    } catch { return 'duty-context-unavailable'; }
    return null;
  }
  function prepare(action, input, ownedMeal = false) {
    if (loadError) return failure(loadError);
    if (busy) return failure('ledger-busy');
    if (ownedMeal && (!action.startsWith('meal-') || !index.ownedActors.has(input?.actorId))) return failure('official-income-unavailable');
    busy = true;
    try {
      const normalized = requestFor(action, input, current);
      if (!normalized.ok) return normalized;
      const request = normalized.request, previous = index.receipts.get(request.receiptId);
      if (previous && !same(requestOf(previous), request)) return failure('request-conflict');
      if (action === 'duty' && requireGradePayPolicy && !current.payPolicy && !previous) return failure('pay-policy-pending');
      if (action === 'meal-payment' && index.meals.get(request.orderId)?.refund) return failure('order-already-refunded');
      if (action === 'salon-reserve' && current.salonHolds?.[request.orderId]?.status !== undefined &&
          current.salonHolds[request.orderId].status !== 'reserved') return failure(`salon-already-${current.salonHolds[request.orderId].status}`);
      const replayed = !!previous;
      if (!replayed && !ownedMeal) {
        const error = liveCheck(request);
        if (error) return failure(error);
      }
      const base = current, baseRevision = revision, result = replayed ? {ok: true, next: current, transaction: previous} : transfer(current, index, request);
      if (!result.ok) return result;
      const next = result.next, transaction = result.transaction;
      let accepted = false, locked = false;
      const receipt = wasReplay => ({ok: true, replayed: wasReplay, receiptId: transaction.receiptId,
        amount: transaction.amount, actorId: transaction.actorId, ...(transaction.orderId ? {orderId: transaction.orderId} : {}),
        ...(transaction.sourceSplit ? {sourceSplit: copy(transaction.sourceSplit)} : {}), transaction: copy(transaction)});
      // Unlike the historical meal hook, a salon candidate cannot be handed
      // back to an external full-world coordinator after it was accepted.
      const valid = () => !loadError && !busy && revision === baseRevision && (salonAction(action) ?
        !accepted && current === base && (replayed || !liveCheck(request)) : accepted || current === base);
      function accept() {
        if (accepted) return receipt(true);
        if (busy && !locked) return failure('ledger-busy');
        if (current !== base || revision !== baseRevision) return failure('stale-candidate');
        if (salonAction(action) && !replayed) {
          const error = liveCheck(request);
          if (error) return failure(error);
        }
        if (!replayed) { current = next; indexTransaction(index, transaction); }
        accepted = true;
        return receipt(replayed);
      }
      function commit(worldPatch = {}) {
        if (busy) return failure('ledger-busy');
        if (accepted) return receipt(true);
        if (current !== base || revision !== baseRevision) return failure('stale-candidate');
        if (!object(worldPatch)) return failure('invalid-world-patch');
        // The authoritative economy field cannot be replaced by a world patch.
        if (Object.hasOwn(worldPatch, 'chinaOfficialEconomy')) return failure('invalid-world-patch');
        if (replayed && Object.keys(worldPatch).length === 0) return accept();
        if (!saveState) return failure('persistence-unavailable');
        busy = true;
        try {
          if (!replayed && !ownedMeal) {
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
        valid, committed: ownedMeal ? () => accepted || locked ? accept() : failure('meal-lock-required') : accept, commit,
        ...((ownedMeal||salonAction(action)) ? {balanceAfter: next.accounts[request.actorId].cash + next.accounts[request.actorId].bank,
          transfer: mealTransferView(transaction),
          lock() { if (accepted || !valid()) return false; busy = true; locked = true; return true; },
          release() { if (locked) { locked = false; busy = false; } },
        } : {})};
    } finally { busy = false; }
  }
  const account = actorId => current && OFFICIALS.has(actorId) ? copy(current.accounts[actorId]) : null;
  // Dormant meal-only view. It grants no appointment, salary, withdrawal or
  // salon spending authority. Earned money and original refundable payments
  // remain this person's after appointment loss; business/escrow are excluded.
  function mealTransferView(transaction) {
    return transaction ? {kind: transaction.action, actorId: transaction.actorId,
      orderId: transaction.orderId, amount: transaction.amount,
      sourceSplit: copy(transaction.sourceSplit || {cash: transaction.amount, bank: 0})} : null;
  }
  const mealProvider = {
    get loadError() { return loadError; }, account,
    hasIncome: actorId => !loadError && index.ownedActors.has(actorId),
    mealAccountIdentity: () => ({version: 1, namespace: 'chinaOfficialEconomy', currency: 'copper', roleIds: [OFFICIAL_MEAL_SOURCE]}),
    // This is a read-only enumeration, not another copy of journaled money.
    mealTransferOrderIds: () => !loadError ? [...index.meals.keys()] : [],
    mealTransfer: (orderId, kind) => !loadError ? mealTransferView(index.meals.get(orderId)?.[kind === 'meal-payment' ? 'payment' : kind === 'meal-refund' ? 'refund' : '']) : null,
    snapshot: () => current ? copy(current) : saved == null ? null : copy(saved),
    prepareMealPayment: input => prepare('meal-payment', input, true),
    prepareMealRefund: input => prepare('meal-refund', input, true),
    prepareMealGuard() {
      const base = current, baseRevision = revision; let locked = false;
      const valid = () => !loadError && !busy && current === base && revision === baseRevision;
      return {valid, lock() { if (!valid()) return false; busy = true; locked = true; return true; },
        release() { if (locked) { locked = false; busy = false; } }};
    },
  };
  return {loadError, mealFundsProvider: () => mealProvider, state: () => current ? copy(current) : null, snapshot: () => current ? copy(current) : null,
    account, balance: account, history: () => current ? copy(current.transactions) : [],
    // A narrow public-duty source for the warehouse head's audit. Transaction
    // serials, not duty dates, catch late payment without exposing consumption.
    dutyAuditSource(after = 0) {
      if (!current || !integer(after)) return null;
      return {lastTransaction: current.nextTransaction - 1,
        receipts: current.transactions.slice(after).filter(tx => tx.action === 'duty').map(tx => copy({
          id: tx.id, receiptId: tx.receiptId, actorId: tx.actorId, day: tx.day,
          amount: tx.amount, evidence: tx.evidence, ...(tx.payContract ? {payContract: tx.payContract} : {})}))};
    },
    gradePayPolicy: () => current?.payPolicy ? copy(current.payPolicy) : null,
    activateGradePayPolicy,
    dailyWageFor(actorId, day) {
      if (!current || !OFFICIALS.has(actorId)) return null;
      if (!current.payPolicy) return legacyWageFor(current, actorId);
      try { if (day === undefined) day = getDay(); } catch { return null; }
      return integer(day) ? wageFor(current, actorId, day) : null;
    },
    completeDuty(input) { const payment = prepare('duty', input); return payment.ok ? payment.commit() : payment; },
    withdraw(input) { const payment = prepare('withdraw', input); return payment.ok ? payment.commit() : payment; },
    prepareMealPayment: input => prepare('meal-payment', input),
    prepareMealRefund: input => prepare('meal-refund', input),
    prepareSalonReserve: input => prepare('salon-reserve', input),
    prepareSalonSettle: input => prepare('salon-settle', input),
    prepareSalonRefund: input => prepare('salon-refund', input),
    salonHold: orderId => current?.salonHolds?.[orderId] ? copy(current.salonHolds[orderId]) : null,
    salonHolds: () => current ? copy(Object.values(current.salonHolds || {})) : [],
    nextSalonOrderId() {
      if (!current) return null;
      const serial = Math.max(0, ...Object.keys(current.salonHolds || {}).filter(id=>id.startsWith('cn-salon-npc-')).map(id => Number(id.slice(13)))) + 1;
      return positive(serial) ? `cn-salon-npc-${serial}` : null;
    }};
}
