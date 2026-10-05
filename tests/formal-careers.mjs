// These cases protect durable eligibility, physical-completion boundaries,
// finite vacancies, evaluation dedupe and exactly-once copper across reloads.
import assert from 'node:assert/strict';
import {createFormalCareers, COURT_CLERK_ROLE, FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
const clone = value => JSON.parse(JSON.stringify(value));
const ROLE = COURT_CLERK_ROLE.id;
function setup(saved = {}, options = {}) {
  const store = clone(saved), flags = {reject: false, rejectBank: false, throw: false, async: false};
  const clock = {...{day: 1, hour: 8, seconds: 0}, ...options.clock};
  // The core owns no banking implementation. This durable fixture implements
  // the injected credit contract, including receipt conflicts and replay.
  store.bank ??= {cash: 0, bank: 0, credits: []};
  const bank = {state: () => clone(store.bank), history: () => clone(store.bank.credits)};
  const creditWageToBank = deposit => {
    assert.equal(deposit.currency, 'copper');
    assert.equal(deposit.receiptId, `career:${deposit.slotId}:${deposit.day}`);
    const old = store.bank.credits.find(credit => credit.receiptId === deposit.receiptId);
    if (old) return old.amount === deposit.amount ? {ok: true, replayed: true, receiptId: old.receiptId} : {ok: false, code: 'request-conflict'};
    if (flags.rejectBank) return {ok: false, code: 'save-failed'};
    store.bank = {...store.bank, bank: store.bank.bank + deposit.amount,
      credits: [...store.bank.credits, clone(deposit)]};
    return {ok: true, replayed: false, receiptId: deposit.receiptId};
  };
  const careers = createFormalCareers({saved: store.careers, creditWageToBank, getClock: () => clock,
    ...options, saveState: state => {
      if (flags.throw) throw Error('quota');
      if (flags.async) return Promise.reject(Error('unsupported'));
      if (flags.reject) return false;
      store.careers = state;
    }});
  const study = (source = 'cn-rest', seconds = 8) => {
    const issued = careers.learningTicket(source); assert(issued.ok);
    return careers.completeLearning(issued.ticket, {seconds});
  };
  const qualify = () => { for (const source of ['cn-rest', 'cn-calligraphy']) for (let i = 0; i < 2; i++) assert.equal(study(source).gained, 1); };
  const hire = () => { qualify(); assert(careers.apply(ROLE, {ageYears: 18}).ok); };
  const ready = (hour = 10) => {
    clock.hour = hour; assert(careers.beginDuty().ok);
    clock.hour = 11.5; assert(careers.dutyEvent('court-start').ok);
    clock.hour = 12; assert(careers.dutyEvent('court-completed').ok);
    assert(careers.dutyEvent('archive-completed').ok);
  };
  return {store, flags, clock, bank, careers, study, qualify, hire, ready};
}
const fresh = setup();
assert.equal(fresh.careers.isHired(), false);
assert.deepEqual(fresh.careers.apply(ROLE, {ageYears: 17}).reasons, ['adult-required', 'ritual-required', 'writing-required']);
assert.equal(fresh.careers.apply('unknown', {ageYears: 18}).code, 'unknown-role');
assert.equal(fresh.careers.learningTicket('other').code, 'unknown-learning-source');
assert.equal(fresh.careers.completeLearning({}, {seconds: 99}).code, 'invalid-learning-ticket');
const unfinished = fresh.careers.learningTicket('cn-rest').ticket;
assert.equal(fresh.careers.completeLearning(unfinished, {seconds: 7.99}).code, 'learning-incomplete');
assert.equal(fresh.careers.state().skills.ritual, 0);
const first = fresh.careers.learningTicket('cn-rest').ticket;
assert.equal(fresh.careers.completeLearning(unfinished, {seconds: 8}).code, 'invalid-learning-ticket');
assert.equal(fresh.careers.completeLearning(first, {seconds: 8}).gained, 1);
assert.equal(fresh.careers.completeLearning(first, {seconds: 8}).code, 'learning-replayed');
const firstReload = setup(fresh.store);
assert.equal(firstReload.careers.completeLearning(first, {seconds: 8}).code, 'learning-replayed');
assert.equal(firstReload.careers.completedLowerWork({source: 'other', receiptId: 'cn-tavern-labor-1'}).code, 'unknown-work-source');
for (const receiptId of ['cn-tavern-labor-0', 'cn-tavern-labor-01', 'cn-tavern-labor-9007199254740992', 'made-up']) {
  assert.equal(firstReload.careers.completedLowerWork({source: 'cn-tavern-labor', receiptId}).code, 'invalid-work-receipt');
}
assert.equal(firstReload.careers.completedLowerWork({source: 'cn-tavern-labor', receiptId: 'cn-tavern-labor-2'}).gained, 1);
for (const id of [1, 2]) assert.equal(firstReload.careers.completedLowerWork({source: 'cn-tavern-labor', receiptId: `cn-tavern-labor-${id}`}).code, 'work-replayed');
assert.equal(firstReload.study().gained, 1); assert.equal(firstReload.study().gained, 1);
assert.equal(firstReload.study().limited, 'daily-skill-limit');
assert.equal(firstReload.careers.completedLowerWork({source: 'cn-tavern-labor', receiptId: 'cn-tavern-labor-3'}).limited, 'daily-skill-limit');
const expired = firstReload.careers.learningTicket('cn-calligraphy').ticket;
firstReload.clock.day = 2;
assert.equal(firstReload.careers.completeLearning(expired, {seconds: 8}).code, 'learning-expired');
assert.equal(firstReload.careers.completedLowerWork({source: 'cn-tavern-labor', receiptId: 'cn-tavern-labor-3'}).code, 'work-replayed');
assert.equal(firstReload.study().gained, 1);
assert.equal(firstReload.bank.state().cash, 0, 'learning and lower-work progression never pay wages');
const capSave = clone(firstReload.store); capSave.careers.skills = {...capSave.careers.skills, ritual: 99, writing: 1};
const capped = setup(capSave, {clock: {day: 3}});
assert.equal(capped.study('cn-calligraphy').limited, 'skill-limit');
assert.equal(capped.careers.state().skills.writing, 1);

const eligible = setup(); eligible.qualify(); eligible.flags.reject = true;
assert.equal(eligible.careers.apply(ROLE, {ageYears: 18}).code, 'save-failed'); assert(!eligible.careers.isHired());
eligible.flags.reject = false; assert(eligible.careers.apply(ROLE, {ageYears: 18}).ok);
assert.equal(eligible.careers.state().tenure.sinceHour, 8);
assert.equal(eligible.careers.apply(ROLE, {ageYears: 18}).code, 'already-employed');
assert(setup(eligible.store).careers.isHired());
const occupied = setup({}, {slots: [{...FORMAL_CAREER_SLOTS[0], holderId: 'existing-official'}]});
occupied.qualify(); assert.deepEqual(occupied.careers.apply(ROLE, {ageYears: 18}).reasons, ['no-vacancy']);
assert.equal(occupied.careers.state().tenure, null); assert.equal(FORMAL_CAREER_SLOTS[0].holderId, null);
assert.equal(setup({}, {slots: [{...FORMAL_CAREER_SLOTS[0], roleId: 'unknown'}]}).careers.state().loadError, 'invalid-career-catalogue');
const futureRole = {...COURT_CLERK_ROLE, id: 'fr-court-clerk', slotId: 'fr-court-clerk-1', wage: 24};
const generic = setup({}, {roles: [futureRole], slots: [{id: futureRole.slotId, roleId: futureRole.id, holderId: null}]});
generic.qualify(); assert(generic.careers.apply(futureRole.id, {ageYears: 18}).ok);
assert(generic.careers.isHired(futureRole.id)); assert(!generic.careers.isHired());

const early = setup(); early.hire(); early.clock.hour = 5.99;
assert.equal(early.careers.beginDuty().code, 'invalid-clock', 'backwards clock cannot grant a new day or duty');
early.clock.hour = 8; assert(early.careers.beginDuty().ok);
assert.equal(early.careers.dutyEvent('archive-completed').code, 'invalid-duty-stage');
assert(early.careers.interruptDuty('walking').ok); assert.equal(early.careers.state().performance, 0);
assert(early.careers.beginDuty().ok, 'before-start interruption permits on-time retry');
const arrivedReload = setup(early.store);
assert.equal(arrivedReload.careers.state().lastDuty.stage, 'missed'); assert(arrivedReload.careers.beginDuty().ok);
arrivedReload.clock.hour = 11.5; assert(arrivedReload.careers.dutyEvent('court-start').ok);
const attendingSave = clone(arrivedReload.store);
const attendingReload = setup(attendingSave, {clock: {day: 1, hour: 11.6}});
assert.equal(attendingReload.careers.state().lastDuty.stage, 'missed');
assert.equal(attendingReload.careers.state().performance, -1);
assert.equal(setup(attendingReload.store, {clock: {hour: 11.6}}).careers.state().performance, -1, 'reloading cannot repeat an evaluation');
assert.equal(attendingReload.careers.dutyEvent('court-completed').code, 'invalid-duty-stage');
assert(attendingReload.careers.resign().ok); assert(attendingReload.careers.apply(ROLE, {ageYears: 18}).ok);
assert.equal(attendingReload.careers.beginDuty().code, 'duty-missed');
assert.equal(attendingReload.bank.state().cash, 0);
const blockedRecovery = createFormalCareers({saved: attendingSave.careers, saveState: () => false,
  getClock: () => ({day: 1, hour: 12, seconds: 0})});
assert.equal(blockedRecovery.state().loadError, 'recovery-save-failed'); assert(!blockedRecovery.settle().ok);

const paid = setup(); paid.hire(); paid.ready();
assert.equal(paid.careers.state().lastDuty.wage, 20);
assert.equal(paid.careers.state().lastEvaluation.evaluatorId, 'cn-official-rites');
assert.equal(paid.careers.state().lastEvaluation.positive, true);
assert.equal(paid.careers.state().performance, 1); assert.equal(paid.careers.state().promotionProgress, 1);
assert.equal(paid.careers.dutyEvent('archive-completed').code, 'invalid-duty-stage');
assert(paid.careers.interruptDuty('walking').unchanged); assert.equal(paid.careers.resign().code, 'wage-ready');
paid.flags.rejectBank = true; assert.equal(paid.careers.settle().code, 'save-failed');
assert.equal(paid.bank.state().cash, 0); assert.equal(paid.careers.state().lastDuty.stage, 'ready');
paid.flags.rejectBank = false; paid.flags.reject = true;
const cleanup = paid.careers.settle(); assert(cleanup.ok && cleanup.cleanupPending);
assert.deepEqual(cleanup.deposit, {amount: 20, receiptId: 'career:cn-court-clerk-1:1',
  currency: 'copper', roleId: ROLE, slotId: 'cn-court-clerk-1', day: 1});
assert.equal(paid.bank.state().cash, 0); assert.equal(paid.bank.state().bank, 20); assert.equal(paid.careers.state().lastDuty.stage, 'ready');
const cleanupReload = setup(paid.store, {clock: {day: 2, hour: 9}});
assert.equal(cleanupReload.careers.beginDuty().code, 'wage-ready');
const recoveredPay = cleanupReload.careers.settle(); assert(recoveredPay.ok && recoveredPay.replayed && !recoveredPay.cleanupPending);
assert.equal(cleanupReload.bank.state().cash, 0); assert.equal(cleanupReload.bank.state().bank, 20); assert.equal(cleanupReload.careers.state().performance, 1);
assert.equal(cleanupReload.careers.settle().code, 'work-incomplete');
assert(cleanupReload.careers.resign().ok); assert(cleanupReload.careers.apply(ROLE, {ageYears: 18}).ok);
cleanupReload.ready(11.49); assert.equal(cleanupReload.careers.state().lastDuty.wage, 18);
assert(cleanupReload.careers.settle().ok); assert.equal(cleanupReload.bank.state().cash, 0); assert.equal(cleanupReload.bank.state().bank, 38);
assert(cleanupReload.careers.resign().ok); assert(cleanupReload.careers.apply(ROLE, {ageYears: 18}).ok);
assert.equal(cleanupReload.careers.beginDuty().code, 'already-paid-today');
assert.equal(cleanupReload.bank.history().length, 2);
let cashFallbackCalls = 0;
const unavailableBank = setup({}, {creditWageToBank: null,
  copperLedger: {earn() { cashFallbackCalls++; throw Error('cash fallback forbidden'); }}});
unavailableBank.hire(); unavailableBank.ready();
assert(unavailableBank.careers.isHired(), 'missing bank support must not block study or employment');
assert.equal(unavailableBank.careers.settle().code, 'bank-unavailable');
assert.equal(unavailableBank.careers.state().lastDuty.stage, 'ready');
assert.equal(unavailableBank.bank.state().bank, 0); assert.equal(unavailableBank.bank.state().cash, 0);
assert.equal(cashFallbackCalls, 0, 'formal wages must never fall back to earn/cash');
for (const [creditWageToBank, expected] of [
  [() => { throw Error('bank write failed'); }, 'payment-failed'],
  [() => Promise.reject(Error('unsupported async bank')), 'async-bank-credit-unsupported'],
  [() => ({ok: true, receiptId: 'wrong-receipt'}), 'bank-receipt-mismatch'],
]) {
  const failed = setup({}, {creditWageToBank}); failed.hire(); failed.ready();
  assert.equal(failed.careers.settle().code, expected);
  assert.equal(failed.careers.state().lastDuty.stage, 'ready');
  assert.equal(failed.careers.state().lastPaidDay, null);
  assert.equal(failed.bank.state().cash, 0); await Promise.resolve();
}
for (const corrupt of [
  state => { state.lastDuty.arrivalHour = 12; },
  state => { state.lastDuty.wage = 20; state.lastEvaluation.wage = 20; },
]) {
  const saved = clone(cleanupReload.store); corrupt(saved.careers);
  assert.equal(setup(saved, {clock: {day: 2, hour: 12}}).careers.state().loadError, 'invalid-career-state');
}

const archived = setup(); archived.hire(); assert(archived.careers.beginDuty().ok);
archived.clock.hour = 11.5; assert(archived.careers.dutyEvent('court-start').ok);
assert(archived.careers.dutyEvent('court-completed').ok);
const archiveReload = setup(archived.store, {clock: {hour: 13}});
assert.equal(archiveReload.careers.state().lastDuty.stage, 'archive');
assert(archiveReload.careers.dutyEvent('archive-completed').ok);
const oldArchive = setup(archived.store, {clock: {day: 2, hour: 8}});
assert.equal(oldArchive.careers.dutyEvent('archive-completed').code, 'duty-expired'); assert.equal(oldArchive.bank.state().cash, 0);
const interrupted = setup(); interrupted.hire(); assert(interrupted.careers.beginDuty().ok);
interrupted.clock.hour = 11.5; assert(interrupted.careers.dutyEvent('court-start').ok);
interrupted.flags.reject = true; assert.equal(interrupted.careers.interruptDuty('walking').code, 'save-failed');
assert.equal(interrupted.careers.dutyEvent('court-completed').code, 'interruption-unsaved');
interrupted.flags.reject = false; assert(interrupted.careers.interruptDuty('walking').ok);
assert.equal(interrupted.careers.state().performance, -1); assert(interrupted.careers.interruptDuty('walking').unchanged);
assert.equal(interrupted.careers.state().performance, -1);

// NPC-caused postponement is terminal but excused, before or after court start.
// The same fact survives reload/resignation and cannot become a later absence.
for (const started of [false, true]) {
  const postponed = setup(); postponed.hire(); assert(postponed.careers.beginDuty().ok);
  if (started) { postponed.clock.hour = 11.5; assert(postponed.careers.dutyEvent('court-start').ok); }
  assert(postponed.careers.interruptDuty('court-postponed').ok);
  assert.equal(postponed.careers.state().lastDuty.reason, 'court-postponed');
  assert.equal(postponed.careers.state().performance, 0);
  assert.equal(postponed.careers.state().lastEvaluation, null);
  assert.equal(postponed.careers.state().lastEvaluatedDay, null);
  assert.equal(postponed.careers.beginDuty().code, 'court-postponed');
  assert(postponed.careers.dutyEvent('court-start').excused);
  assert.equal(postponed.careers.settle().code, 'work-incomplete');
  const reload = setup(postponed.store, {clock: {hour: started ? 11.6 : 8}});
  assert.equal(reload.careers.state().performance, 0);
  assert(reload.careers.resign().ok); assert(reload.careers.apply(ROLE, {ageYears: 18}).ok);
  assert.equal(reload.careers.beginDuty().code, 'court-postponed');
  reload.clock.day = 2; reload.clock.hour = 8;
  assert(reload.careers.observeDay().unchanged);
  assert.equal(reload.careers.state().performance, 0);
  assert.equal(reload.bank.state().cash, 0);
  assert(reload.careers.beginDuty().ok, 'an excused day must not block the next shift');
  assert.equal(reload.careers.state().lastEvaluation, null);

  // Starting the next shift before the adapter's explicit observeDay call must
  // also preserve the previous day's exemption before replacing lastDuty.
  const beforeTick = setup(postponed.store, {clock: {hour: started ? 11.6 : 8}});
  beforeTick.clock.day = 2; beforeTick.clock.hour = 8;
  assert(beforeTick.careers.beginDuty().ok);
  assert(beforeTick.careers.observeDay().unchanged);
  assert.equal(beforeTick.careers.state().performance, 0);
  assert.equal(beforeTick.careers.state().lastEvaluatedDay, null);
}
const previousReview = setup(); previousReview.hire(); previousReview.ready(); assert(previousReview.careers.settle().ok);
const earnedReview = clone(previousReview.careers.state().lastEvaluation);
previousReview.clock.day = 2; previousReview.clock.hour = 8; assert(previousReview.careers.beginDuty().ok);
assert(previousReview.careers.interruptDuty('court-postponed').ok);
previousReview.clock.day = 3; assert(previousReview.careers.observeDay().unchanged);
assert.equal(previousReview.careers.state().performance, 1);
assert.deepEqual(previousReview.careers.state().lastEvaluation, earnedReview, 'excusal preserves an earlier real review');
assert.equal(previousReview.careers.state().lastEvaluatedDay, 1);

const absent = setup(); absent.hire(); absent.clock.hour = 11.5;
assert(absent.careers.dutyEvent('court-start').ok); assert.equal(absent.careers.state().performance, -1);
assert.equal(absent.careers.state().lastEvaluation.reasonCode, 'absent');
assert(!absent.careers.dutyEvent('court-start').ok); assert.equal(absent.careers.state().performance, -1);
const late = setup({}, {clock: {hour: 12}}); late.hire();
assert(late.careers.dutyEvent('court-start').exempt); assert.equal(late.careers.state().performance, 0);
late.clock.day = 2; late.clock.hour = 8; assert(late.careers.observeDay().unchanged);
assert.equal(late.careers.state().performance, 0);
late.clock.day = 3; assert(late.careers.observeDay().ok); assert.equal(late.careers.state().performance, -1);
assert(late.careers.observeDay().unchanged); assert.equal(late.careers.state().performance, -1);
const offline = setup(eligible.store, {clock: {day: 10, hour: 8}});
assert(offline.careers.observeDay().unchanged); assert.equal(offline.careers.state().performance, 0, 'offline elapsed days do not generate invented attendance');

for (const mode of ['reject', 'throw', 'async']) {
  const failing = setup(); failing.flags[mode] = true;
  assert(!failing.careers.learningTicket('cn-rest').ok); assert.equal(failing.careers.state().learning['cn-rest'].issued, 0);
  await Promise.resolve();
}
for (const corrupt of [
  state => { state.skills.ritual = -1; }, state => { state.skills.writing = 101; },
  state => { state.tenure.slotId = 'unknown-slot'; }, state => { state.learning['cn-rest'].completed = 99; },
  state => { state.performance = 101; }, state => { state.lastPaidDay = 999; },
]) {
  const saved = clone(eligible.store); corrupt(saved.careers);
  const locked = setup(saved); assert.equal(locked.careers.state().loadError, 'invalid-career-state'); assert(!locked.careers.beginDuty().ok);
}
const detached = eligible.careers.state(); detached.skills.ritual = 99; detached.tenure.roleId = 'changed';
assert.equal(eligible.careers.state().skills.ritual, 2); assert(eligible.careers.isHired());
console.log('PASS: formal career eligibility, finite vacancies, study/work dedupe, attendance/reload, evaluations, daily wage replay and failed saves');
