// Regression risks: upgrading old duties at a new rate, drifting an activation
// cutoff after a failed save, accepting forged contracts, or overwriting meal
// and salon money with a detached pre-policy candidate.
import assert from 'node:assert/strict';
import {createChinaOfficialEconomy, CHINA_OFFICIAL_IDS, CHINA_OFFICIAL_TAVERN_ID} from '../source/game/china-official-economy.js';
import {CHINA_OFFICIAL_GRADE_PAY_V1, CHINA_OFFICIAL_GRADE_PAY_POLICY_ID, CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1,
  CHINA_COURT_OFFICIAL_RANKS, CHINA_RECORDS_CAREER_RANKS} from '../source/game/china-official-ranks.js';
const copy = value => JSON.parse(JSON.stringify(value));
const [actorId, otherId] = CHINA_OFFICIAL_IDS;
const code = (result, expected) => {assert.equal(result.ok, false); assert.equal(result.code, expected);};
const duty = (id = actorId, day = 0, changes = {}) => ({actorId: id, day, receiptId: `grade-duty:${id}:${day}`,
  evidence: {kind: 'office-work', completed: true, actorId: id, day, audienceDay: day, audienceCompleted: true, duration: 8, elapsed: 8}, ...changes});
const contract = id => ({version: 1, policyId: CHINA_OFFICIAL_GRADE_PAY_POLICY_ID,
  gradeId: CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1[id], amount: CHINA_OFFICIAL_GRADE_PAY_V1[CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1[id]]});
const policy = effectiveDay => ({version: 1, policyId: CHINA_OFFICIAL_GRADE_PAY_POLICY_ID, effectiveDay});
const legacyRate = (state, id) => state.dailyWages?.[id] ?? state.dailyWage;
const beforeAfter = state => ({...(state.version === 1 ? {treasury: state.treasury} : {governmentPaid: state.governmentPaid}),
  accounts: copy(state.accounts), destinations: copy(state.destinations)});
// Independent historical fixtures do not call the new implementation to mint
// their old receipts, including v1 treasury and cash-only meal refunds.
function legacyFixture(version, perActor = false) {
  const state = {version, dailyWage: 24, ...(perActor ? {dailyWages: {[actorId]: 31, [otherId]: 19}} : {}),
    ...(version === 1 ? {initialTreasury: {amount: 1000, sourceId: 'old-world-budget'}, treasury: 1000} :
      {funding: 'government-guaranteed', governmentPaid: 0}),
    accounts: Object.fromEntries(CHINA_OFFICIAL_IDS.map(id => [id, {bank: 0, cash: 0}])),
    destinations: {[CHINA_OFFICIAL_TAVERN_ID]: 0}, nextTransaction: 1, transactions: []};
  function append(request, from, to, transfer) {
    const before = beforeAfter(state); transfer();
    state.transactions.push({id: `official-${state.nextTransaction++}`, ...request, from, to, before, after: beforeAfter(state)});
  }
  for (const id of CHINA_OFFICIAL_IDS) {
    const amount = legacyRate(state, id);
    append({action: 'duty', actorId: id, amount, ...duty(id, 2)}, version === 1 ? 'official-treasury' : 'government-guaranteed', `${id}:bank`, () => {
      if (version === 1) state.treasury -= amount; else state.governmentPaid += amount;
      state.accounts[id].bank += amount;
    });
  }
  append({action: 'withdraw', actorId, amount: 10, receiptId: 'old-withdraw'}, `${actorId}:bank`, `${actorId}:cash`, () => {
    state.accounts[actorId].bank -= 10; state.accounts[actorId].cash += 10;
  });
  append({action: 'meal-payment', actorId, amount: 6, receiptId: 'official-meal-payment:old-lunch', orderId: 'old-lunch'},
    `${actorId}:cash`, CHINA_OFFICIAL_TAVERN_ID, () => {state.accounts[actorId].cash -= 6; state.destinations[CHINA_OFFICIAL_TAVERN_ID] += 6;});
  append({action: 'meal-refund', actorId, amount: 6, receiptId: 'official-meal-refund:old-lunch', orderId: 'old-lunch'},
    CHINA_OFFICIAL_TAVERN_ID, `${actorId}:cash`, () => {state.accounts[actorId].cash += 6; state.destinations[CHINA_OFFICIAL_TAVERN_ID] -= 6;});
  return state;
}
function fixture(saved, startDay = 0, extra = {}) {
  let day = startDay, writes = 0, durable = saved == null ? null : copy(saved), rejected = false;
  const economy = createChinaOfficialEconomy({saved, getDay: () => day, isAppointed: id => CHINA_OFFICIAL_IDS.includes(id),
    saveState(next, transaction, patch) {
      if (rejected) return false;
      assert.deepEqual(patch, {}); durable = copy(next); writes++; return true;
    }, ...extra});
  return {economy, get writes() {return writes;}, get durable() {return copy(durable);},
    set day(value) {day = value;}, set rejected(value) {rejected = value;}};
}
const assertConserved = state => {
  const accounts = Object.values(state.accounts).reduce((sum, account) => sum + BigInt(account.cash) + BigInt(account.bank), 0n);
  const held = Object.values(state.salonHolds || {}).reduce((sum, hold) => sum + (hold.status === 'reserved' ? BigInt(hold.amount) : 0n), 0n);
  const legacy = state.legacyFunding ? BigInt(state.legacyFunding.initialTreasury.amount - state.legacyFunding.treasury) : 0n;
  assert.equal(accounts + held + BigInt(state.destinations[CHINA_OFFICIAL_TAVERN_ID]), legacy + BigInt(state.governmentPaid));
};
assert.equal(Object.keys(CHINA_OFFICIAL_GRADE_PAY_V1).length, 18);
assert(Object.isFrozen(CHINA_OFFICIAL_GRADE_PAY_V1)); assert(Object.isFrozen(CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1));
assert.deepEqual(CHINA_RECORDS_CAREER_RANKS.map(rank => rank.basePay), [18, 22]);
assert.deepEqual(CHINA_COURT_OFFICIAL_RANKS.map(rank => rank.currentWage), [168, 120, 88, 64, 168, 38]);
assert.equal(CHINA_OFFICIAL_GRADE_PAY_V1['cn-grade-9-junior'], 18);
assert.equal(CHINA_OFFICIAL_GRADE_PAY_V1['cn-grade-9-regular'], 22);

// No constructor activation/write/accrual; explicit fresh activation begins at
// day zero even when first playing on a later day. New duties use all six grades.
for (const absent of [undefined, null]) {
  const fresh = fixture(absent, 3), e = fresh.economy, before = e.snapshot();
  assert.equal(fresh.writes, 0); assert.equal(e.gradePayPolicy(), null);
  assert.equal(e.dailyWageFor(actorId), 24); assert.equal(e.dailyWageFor(actorId, 99), 24);
  const enabled = e.activateGradePayPolicy(); assert(enabled.ok && !enabled.replayed);
  assert.equal(fresh.writes, 1); assert.deepEqual(e.gradePayPolicy(), policy(0));
  const stripped = e.snapshot(); delete stripped.payPolicy; assert.deepEqual(stripped, before);
  enabled.payPolicy.effectiveDay = 999; const detached = e.gradePayPolicy(); detached.effectiveDay = 999;
  assert.deepEqual(e.gradePayPolicy(), policy(0)); assert(e.activateGradePayPolicy().replayed); assert.equal(fresh.writes, 1);
  for (const id of CHINA_OFFICIAL_IDS) {
    assert.equal(e.dailyWageFor(id), contract(id).amount);
    const payment = e.completeDuty(duty(id, 0)); assert(payment.ok && !payment.replayed);
    assert.deepEqual(payment.transaction.payContract, contract(id)); assert.equal(payment.amount, contract(id).amount);
    assert(e.completeDuty(duty(id, 0)).replayed);
    code(e.completeDuty(duty(id, 0, {receiptId: `second:${id}`})), 'duty-already-paid');
  }
  assert.equal(e.dailyWageFor('player'), null); assert.equal(e.dailyWageFor(actorId, -1), null);
  assert.equal(e.dailyWageFor(actorId, '0'), null);
  const stable = e.snapshot(), loaded = fixture(stable, 500);
  assert.equal(loaded.writes, 0); assert.deepEqual(loaded.economy.snapshot(), stable);
  assert(loaded.economy.activateGradePayPolicy().replayed); assert.equal(loaded.writes, 0);
  assert.deepEqual(loaded.economy.gradePayPolicy(), policy(0));
  assert.equal(e.state().governmentPaid, 646); assertConserved(e.snapshot());
}

// Old v1/v2 scalar/per-actor money, receipt bytes and source identities are
// untouched. Every upgrade-day certificate stays on its original legacy rate,
// even when archived or retried after the cutoff. No offline back pay appears.
for (const version of [1, 2]) for (const perActor of [false, true]) {
  const old = legacyFixture(version, perActor), originalBytes = JSON.stringify(old), historyBytes = JSON.stringify(old.transactions);
  const f = fixture(old, 7, {dailyWage: 999, dailyWages: {[actorId]: 888}}), e = f.economy;
  assert.equal(e.loadError, null); assert.equal(f.writes, 0); assert.equal(e.gradePayPolicy(), null);
  assert.equal(JSON.stringify(e.history()), historyBytes); assert.equal(JSON.stringify(old), originalBytes);
  assert.deepEqual(e.account(actorId), old.accounts[actorId]);
  const migrated = e.snapshot(), providerIdentity = e.mealFundsProvider().mealAccountIdentity();
  assert(e.activateGradePayPolicy().ok); assert.deepEqual(e.gradePayPolicy(), policy(8)); assert.equal(f.writes, 1);
  const stripped = e.snapshot(); delete stripped.payPolicy; assert.deepEqual(stripped, migrated);
  assert.equal(JSON.stringify(e.history()), historyBytes); assert.equal(JSON.stringify(old), originalBytes);
  assert.deepEqual(e.mealFundsProvider().mealAccountIdentity(), providerIdentity);
  f.day = 90;
  for (const id of CHINA_OFFICIAL_IDS) {
    assert.equal(e.dailyWageFor(id, 7), legacyRate(old, id)); assert.equal(e.dailyWageFor(id, 8), contract(id).amount);
    assert(e.completeDuty(duty(id, 2)).replayed);
    const late = e.completeDuty(duty(id, 7)); assert(late.ok); assert.equal(late.amount, legacyRate(old, id));
    assert(!Object.hasOwn(late.transaction, 'payContract'));
    const latest = e.completeDuty(duty(id, 8)); assert(latest.ok); assert.deepEqual(latest.transaction.payContract, contract(id));
    assert(e.completeDuty(duty(id, 7)).replayed); assert(e.completeDuty(duty(id, 8)).replayed);
  }
  assert.equal(JSON.stringify(e.history().slice(0, old.transactions.length)), historyBytes);
  const stored = e.snapshot(), reloaded = fixture(stored, 999);
  assert.equal(reloaded.economy.loadError, null); assert.equal(reloaded.writes, 0);
  assert.deepEqual(reloaded.economy.snapshot(), stored); assert(reloaded.economy.activateGradePayPolicy().replayed);
  assert.deepEqual(reloaded.economy.gradePayPolicy(), policy(8)); assert.equal(reloaded.writes, 0);
  assertConserved(e.snapshot());
}

// Capture loaded cutoff at construction; a failed first save and later retry
// never move it, including if the first explicit attempt itself is delayed.
for (const mode of ['false', 'object', 'throw', 'promise']) {
  const old = legacyFixture(2); let day = 5, reject = true, writes = 0, e;
  e = createChinaOfficialEconomy({saved: old, getDay: () => day, isAppointed: () => true, requireGradePayPolicy: true,
    saveState(next, transaction, patch) {
      code(e.activateGradePayPolicy(), 'ledger-busy');
      code(e.completeDuty(duty(otherId, 5)), 'ledger-busy');
      assert.equal(e.gradePayPolicy(), null); assert.deepEqual(patch, {}); assert.equal(transaction, null);
      assert.deepEqual(next.payPolicy, policy(6));
      if (!reject) {writes++; return true;}
      if (mode === 'false') return false;
      if (mode === 'object') return {ok: false};
      if (mode === 'throw') throw Error('quota');
      return Promise.reject(Error('offline'));
    }});
  const before = e.snapshot(), candidate = e.prepareMealPayment({actorId, orderId: `stale-${mode}`, amount: 6});
  const owned = e.mealFundsProvider().prepareMealPayment({actorId, orderId: `owned-stale-${mode}`, amount: 6});
  const guard = e.mealFundsProvider().prepareMealGuard();
  assert(candidate.valid() && owned.valid() && guard.valid());
  day = 6;
  code(e.activateGradePayPolicy(), mode === 'promise' ? 'async-save-unsupported' : 'save-failed');
  assert.deepEqual(e.snapshot(), before); assert.equal(writes, 0); assert.equal(e.gradePayPolicy(), null);
  assert(!candidate.valid() && !owned.valid() && !guard.valid());
  code(candidate.commit(), 'stale-candidate'); code(candidate.committed(), 'stale-candidate'); assert.equal(owned.lock(), false);
  code(e.completeDuty(duty(actorId, 5)), 'pay-policy-pending');
  assert(e.completeDuty(duty(actorId, 2)).replayed, 'Pending activation does not invalidate a previously paid certificate');
  reject = false; day = 9;
  assert(e.activateGradePayPolicy().ok); assert.equal(writes, 1); assert.deepEqual(e.gradePayPolicy(), policy(6));
  assert(e.activateGradePayPolicy().replayed); assert.equal(writes, 1);
}
await Promise.resolve();

const pending = fixture(undefined, 0, {requireGradePayPolicy: true}); pending.rejected = true;
code(pending.economy.activateGradePayPolicy(), 'save-failed'); code(pending.economy.completeDuty(duty()), 'pay-policy-pending');
assert.equal(pending.economy.state().governmentPaid, 0); pending.day = 2; pending.rejected = false;
assert(pending.economy.activateGradePayPolicy().ok); assert.equal(pending.economy.completeDuty(duty()).amount, contract(actorId).amount);
assert.deepEqual(pending.economy.gradePayPolicy(), policy(0));
const absentWriter = fixture(undefined, 0, {saveState: undefined}); code(absentWriter.economy.activateGradePayPolicy(), 'persistence-unavailable');
const unavailableDay = fixture(legacyFixture(2), null); code(unavailableDay.economy.activateGradePayPolicy(), 'day-mismatch');
const usedFresh = fixture(); assert(usedFresh.economy.completeDuty(duty()).ok);
const usedBefore = usedFresh.economy.snapshot(); code(usedFresh.economy.activateGradePayPolicy(), 'pay-policy-conflict');
assert.deepEqual(usedFresh.economy.snapshot(), usedBefore);

// A policy-write failure followed by an ordinary whole-world save must not
// move the boundary on reload, even though the ledger remains unactivated.
for (const old of [undefined, legacyFixture(2)]) {
  const intent = policy(old ? 6 : 0), frozenIntent = copy(intent);
  const first = fixture(old, 5, {requireGradePayPolicy: true, activationPlan: intent});
  first.rejected = true;
  const before = first.economy.snapshot(); code(first.economy.activateGradePayPolicy(), 'save-failed');
  assert.deepEqual(first.economy.snapshot(), before);
  const ordinarySave = JSON.parse(JSON.stringify({chinaOfficialEconomy: first.economy.snapshot(),
    chinaOfficialPayActivation: frozenIntent, simulationClock: {day: 9, seconds: 999}}));
  intent.effectiveDay = 1000; // Detached caller data cannot move the captured cutoff.
  first.rejected = false; assert(first.economy.activateGradePayPolicy().ok);
  assert.deepEqual(first.economy.gradePayPolicy(), frozenIntent);
  const reload = fixture(ordinarySave.chinaOfficialEconomy, 9,
    {requireGradePayPolicy: true, activationPlan: ordinarySave.chinaOfficialPayActivation});
  const unpaid = reload.economy.snapshot(); assert.equal(reload.writes, 0);
  assert(reload.economy.activateGradePayPolicy().ok); assert.deepEqual(reload.economy.gradePayPolicy(), frozenIntent);
  const metadataOnly = reload.economy.snapshot(); delete metadataOnly.payPolicy; assert.deepEqual(metadataOnly, unpaid);
  assert.equal(reload.economy.completeDuty(duty(actorId, frozenIntent.effectiveDay)).amount, contract(actorId).amount);
  if (old) assert.equal(reload.economy.completeDuty(duty(otherId, 5)).amount, 24);
}
for (const intent of [null, {}, {...policy(6), version: 2}, {...policy(6), policyId: 'unknown'},
  {...policy(6), effectiveDay: -1}, {...policy(6), extra: true}]) {
  const malformed = fixture(legacyFixture(2), 5, {requireGradePayPolicy: true, activationPlan: intent});
  assert.equal(malformed.economy.loadError, null, 'Bad policy intent cannot confiscate valid historical funds');
  code(malformed.economy.activateGradePayPolicy(), 'invalid-pay-policy'); assert.equal(malformed.writes, 0);
  code(malformed.economy.completeDuty(duty(actorId, 5)), 'pay-policy-pending');
  assert(malformed.economy.prepareMealPayment({actorId, orderId: 'existing-funds', amount: 6}).commit().ok);
}
const authoritative = fixture(pending.economy.snapshot(), 999, {activationPlan: null});
assert.equal(authoritative.economy.loadError, null); assert(authoritative.economy.activateGradePayPolicy().replayed);
assert.deepEqual(authoritative.economy.gradePayPolicy(), policy(0));

// Activated requests derive canonical immutable terms. A caller cannot choose
// another official's grade, change salary, bypass office proof or pay tomorrow.
const strict = fixture(undefined, 0), se = strict.economy; assert(se.activateGradePayPolicy().ok);
for (const changed of [{policyId: 'unknown'}, {version: 2}, {gradeId: contract(otherId).gradeId}, {amount: 999}, {extra: true}]) {
  code(se.completeDuty(duty(actorId, 0, {payContract: {...contract(actorId), ...changed}})), 'invalid-pay-contract');
}
code(se.completeDuty(duty(actorId, 0, {amount: 24})), 'invalid-amount');
code(se.completeDuty(duty(actorId, 0, {payContract: null})), 'invalid-pay-contract');
code(se.completeDuty(duty(actorId, 1)), 'day-mismatch');
for (const changed of [{audienceCompleted: false}, {audienceDay: 1}, {duration: 7}, {elapsed: 7.99}]) {
  code(se.completeDuty(duty(actorId, 0, {evidence: {...duty().evidence, ...changed}})), 'incomplete-duty');
}
assert(se.completeDuty(duty(actorId, 0, {payContract: contract(actorId), amount: contract(actorId).amount})).ok);
const canonicalSaved = se.snapshot();
for (const corrupt of [
  state => {state.payPolicy.version = 2;}, state => {state.payPolicy.policyId = 'other';},
  state => {state.payPolicy.effectiveDay = -1;}, state => {state.payPolicy.effectiveDay = 1;},
  state => {state.payPolicy.extra = true;}, state => {state.payPolicy = null;}, state => {delete state.payPolicy;},
  state => {delete state.transactions[0].payContract;}, state => {state.transactions[0].payContract = null;},
  state => {state.transactions[0].payContract.gradeId = contract(otherId).gradeId;},
  state => {state.transactions[0].payContract.policyId = 'other';}, state => {state.transactions[0].payContract.amount++;},
  state => {state.transactions[0].payContract.extra = true;}, state => {state.transactions[0].amount++;},
]) {
  const damaged = copy(canonicalSaved); corrupt(damaged); const bytes = JSON.stringify(damaged), broken = fixture(damaged, 9);
  assert.equal(broken.economy.loadError, 'invalid-saved-state'); assert.equal(broken.writes, 0);
  assert.equal(broken.economy.snapshot(), null); code(broken.economy.activateGradePayPolicy(), 'invalid-saved-state');
  assert.equal(JSON.stringify(damaged), bytes);
}
// Even the first v1 segment must reject a forged cutoff into old history.
const migratedV1 = fixture(legacyFixture(1), 7); assert(migratedV1.economy.activateGradePayPolicy().ok);
const badCutoff = migratedV1.economy.snapshot(); badCutoff.payPolicy.effectiveDay = 2;
assert.equal(fixture(badCutoff, 7).economy.loadError, 'invalid-saved-state');

// Meal-only locks still exclude policy writes. After activation, meals keep
// cash-first splits and salon cancellation restores its exact original sources.
const spend = fixture(legacyFixture(2), 4), e = spend.economy, provider = e.mealFundsProvider();
const meal = {actorId, orderId: 'locked-upgrade-meal', amount: 12};
const locked = provider.prepareMealPayment(meal); assert.deepEqual(locked.sourceSplit, {cash: 10, bank: 2});
assert(locked.lock()); code(e.activateGradePayPolicy(), 'ledger-busy');
assert(locked.committed().ok); locked.release();
const prePolicy = e.snapshot(); assert(e.activateGradePayPolicy().ok);
assert.deepEqual(e.history(), prePolicy.transactions); assert.deepEqual(e.account(actorId), prePolicy.accounts[actorId]);
assert(e.prepareMealRefund(meal).commit().ok); assert.deepEqual(e.account(actorId), {cash: 10, bank: 14});
spend.day = 5; assert(e.completeDuty(duty(actorId, 5)).ok);
const salon = {actorId, orderId: 'cn-salon-npc-1', amount: 40, artistId: 'cn-tavern-reciter', activity: 'poetry',
  incomePolicy: {version: 1, performerShareBps: 5000, rounding: 'floor'}};
const beforeSalon = e.account(actorId), reserve = e.prepareSalonReserve(salon); assert(reserve.ok);
assert.deepEqual(reserve.sourceSplit, {cash: 10, bank: 30}); assert(reserve.commit().ok);
const held = e.snapshot(), afterReload = fixture(held, 900); assert.deepEqual(afterReload.economy.snapshot(), held);
assert(afterReload.economy.prepareSalonRefund(salon).commit().ok); assert.deepEqual(afterReload.economy.account(actorId), beforeSalon);
assert.equal(afterReload.economy.state().destinations[CHINA_OFFICIAL_TAVERN_ID], 0);
assertConserved(afterReload.economy.snapshot());
console.log('PASS official grade pay: explicit atomic activation, six immutable grade contracts, exact old v1/v2 history and arrears, stable retry cutoff, strict restore, unchanged meal/salon sources');
