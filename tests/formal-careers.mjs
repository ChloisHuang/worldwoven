// These cases protect durable eligibility, physical-completion boundaries,
// finite vacancies, evaluation dedupe and exactly-once copper across reloads.
import assert from 'node:assert/strict';
import {createFormalCareers, COURT_CLERK_ROLE, FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {createCopperLedger} from '../source/game/copper-ledger.js';
const clone = value => JSON.parse(JSON.stringify(value));
const ROLE = COURT_CLERK_ROLE.id;
function setup(saved = {}, options = {}) {
  const store = clone(saved), flags = {reject: false, rejectLedger: false, throw: false, async: false};
  const clock = {...{day: 1, hour: 8, seconds: 0}, ...options.clock};
  const ledger = createCopperLedger({saved: store.ledger, saveState: state => {
    if (flags.rejectLedger) return false; store.ledger = state;
  }});
  const careers = createFormalCareers({saved: store.careers, copperLedger: ledger, getClock: () => clock,
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
  return {store, flags, clock, ledger, careers, study, qualify, hire, ready};
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
assert.equal(firstReload.ledger.state().cash, 0, 'learning and lower-work progression never pay wages');
const capSave = clone(firstReload.store); capSave.careers.skills = {ritual: 99, writing: 1};
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
assert.equal(attendingReload.ledger.state().cash, 0);
const blockedRecovery = createFormalCareers({saved: attendingSave.careers, saveState: () => false,
  copperLedger: attendingReload.ledger, getClock: () => ({day: 1, hour: 12, seconds: 0})});
assert.equal(blockedRecovery.state().loadError, 'recovery-save-failed'); assert(!blockedRecovery.settle().ok);

const paid = setup(); paid.hire(); paid.ready();
assert.equal(paid.careers.state().lastDuty.wage, 20);
assert.equal(paid.careers.state().lastEvaluation.evaluatorId, 'cn-official-rites');
assert.equal(paid.careers.state().lastEvaluation.positive, true);
assert.equal(paid.careers.state().performance, 1); assert.equal(paid.careers.state().promotionProgress, 1);
assert.equal(paid.careers.dutyEvent('archive-completed').code, 'invalid-duty-stage');
assert(paid.careers.interruptDuty('walking').unchanged); assert.equal(paid.careers.resign().code, 'wage-ready');
paid.flags.rejectLedger = true; assert.equal(paid.careers.settle().code, 'save-failed');
assert.equal(paid.ledger.state().cash, 0); assert.equal(paid.careers.state().lastDuty.stage, 'ready');
paid.flags.rejectLedger = false; paid.flags.reject = true;
const cleanup = paid.careers.settle(); assert(cleanup.ok && cleanup.cleanupPending);
assert.equal(paid.ledger.state().cash, 20); assert.equal(paid.careers.state().lastDuty.stage, 'ready');
const cleanupReload = setup(paid.store, {clock: {day: 2, hour: 9}});
assert.equal(cleanupReload.careers.beginDuty().code, 'wage-ready');
const recoveredPay = cleanupReload.careers.settle(); assert(recoveredPay.ok && recoveredPay.replayed && !recoveredPay.cleanupPending);
assert.equal(cleanupReload.ledger.state().cash, 20); assert.equal(cleanupReload.careers.state().performance, 1);
assert.equal(cleanupReload.careers.settle().code, 'work-incomplete');
assert(cleanupReload.careers.resign().ok); assert(cleanupReload.careers.apply(ROLE, {ageYears: 18}).ok);
cleanupReload.ready(11.49); assert.equal(cleanupReload.careers.state().lastDuty.wage, 18);
assert(cleanupReload.careers.settle().ok); assert.equal(cleanupReload.ledger.state().cash, 38);
assert(cleanupReload.careers.resign().ok); assert(cleanupReload.careers.apply(ROLE, {ageYears: 18}).ok);
assert.equal(cleanupReload.careers.beginDuty().code, 'already-paid-today');
assert.equal(cleanupReload.ledger.history().filter(tx => tx.action === 'earn').length, 2);
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
assert.equal(oldArchive.careers.dutyEvent('archive-completed').code, 'duty-expired'); assert.equal(oldArchive.ledger.state().cash, 0);
const interrupted = setup(); interrupted.hire(); assert(interrupted.careers.beginDuty().ok);
interrupted.clock.hour = 11.5; assert(interrupted.careers.dutyEvent('court-start').ok);
interrupted.flags.reject = true; assert.equal(interrupted.careers.interruptDuty('walking').code, 'save-failed');
assert.equal(interrupted.careers.dutyEvent('court-completed').code, 'interruption-unsaved');
interrupted.flags.reject = false; assert(interrupted.careers.interruptDuty('walking').ok);
assert.equal(interrupted.careers.state().performance, -1); assert(interrupted.careers.interruptDuty('walking').unchanged);
assert.equal(interrupted.careers.state().performance, -1);

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
