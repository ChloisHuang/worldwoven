// Reproduces new-shift UI staying enabled after the 18:00 admission cutoff.
// Exercise only the shared core/bridge gate and its ongoing-work exception;
// seed durable careers directly, without physical labor or bank scenarios.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createFormalCareers, TAVERN_STEWARD_ROLE as TAVERN, GARDEN_ASSISTANT_ROLE as GARDEN} from '../source/game/formal-careers.js';
import {createFormalLaborContract} from '../source/game/formal-labor-contract.js';

const copy = value => JSON.parse(JSON.stringify(value));
const beforeClosing = 17 + 59 / 60, afterClosing = 19 + 46 / 60;
const durable = careers => {
  const {loadError, lastError, ...saved} = careers.state();
  return saved;
};
const empty = durable(createFormalCareers({saveState: () => {}, getClock: () => ({day: 1, hour: 8, seconds: 0})}));

function seed(role, stage = null) {
  const saved = copy(empty);
  saved.skills = {...saved.skills, ...role.skillRequirements};
  saved.tenure = {roleId: role.id, slotId: role.slotId, sinceDay: 1, sinceHour: 8};
  if (stage) saved.lastDuty = {roleId: role.id, slotId: role.slotId, day: 1, stage,
    started: true, reason: null, arrivalHour: beforeClosing, wage: stage === 'paid' ? role.wage : null,
    workReceiptId: `${role.workSource}-1`};
  if (stage === 'paid') {
    saved.lastPaidDay = saved.lastEvaluatedDay = 1;
    saved.performance = saved.promotionProgress = 1;
    saved.lastEvaluation = {id: `career-review:${role.slotId}:1`, evaluatorId: role.supervisorId,
      day: 1, roleId: role.id, slotId: role.slotId, positive: true, score: 1,
      reason: '已验收完整当班职责', reasonCode: 'labor-inspected', wage: role.wage};
  }
  return saved;
}

function fixture(role, {hour = 8, stage = null} = {}) {
  const clock = {day: 1, hour, seconds: 0}, writes = [], notices = [];
  let saved = seed(role, stage), job = null;
  const careers = createFormalCareers({saved, getClock: () => clock,
    saveState: next => { saved = copy(next); writes.push(copy(next)); }});
  assert.equal(careers.state().loadError, null, 'the minimal durable seed must be valid');
  const formal = createFormalLaborContract({careers, role, getJob: () => job,
    getPlayer: () => ({ageYears: 18}), meetHost: () => true, notify: notice => notices.push(notice)});
  return {clock, careers, formal, writes, notices, receiptId: `${role.workSource}-1`,
    saved: () => copy(saved), setJob: next => { job = next; }};
}

for (const role of [TAVERN, GARDEN]) {
  test(`${role.id}: new-shift availability and final admission agree at 17:59, 18:00 and 19:46`, () => {
    for (const hour of [beforeClosing, 18, afterClosing]) {
      const f = fixture(role, {hour}), expected = hour < 18, before = f.saved();
      const available = f.careers.beginDutyAvailability(role.id);
      assert.equal(available.ok, expected);
      assert.deepEqual({roleId: available.roleId, day: available.day, hour: available.hour,
        window: available.window, stage: available.stage},
      {roleId: role.id, day: 1, hour, window: {startHour: 6, endHour: 18}, stage: null});
      assert.equal(f.formal.beginAvailability().ok, expected, 'the new-shift UI uses the same decision');
      assert.deepEqual(f.saved(), before);
      assert.equal(f.writes.length, 0, 'availability must not save');
      const started = f.formal.begin(f.receiptId);
      assert.equal(started.ok, expected, 'final beginDuty admission matches the UI');
      if (expected) {
        assert.equal(started.formalRoleId, role.id);
        assert.equal(f.careers.state().lastDuty.stage, 'working');
        assert.equal(f.careers.state().lastDuty.arrivalHour, beforeClosing);
        assert.equal(f.writes.length, 1);
      } else {
        assert.equal(available.code, 'outside-arrival-window');
        assert.equal(started.code, available.code);
        assert.equal(started.formalRoleId, null);
        assert.deepEqual(f.saved(), before, 'rejected admission cannot create a shift');
        assert.equal(f.writes.length, 0);
      }
    }
  });

  test(`${role.id}: availability preserves saved state, lastError and the observed clock`, () => {
    const f = fixture(role);
    assert.equal(f.careers.beginDuty().code, 'invalid-work-receipt', 'final admission still requires a real work receipt');
    const before = f.careers.state(), saved = f.saved();
    f.clock.hour = afterClosing;
    assert.equal(f.careers.beginDutyAvailability(role.id).code, 'outside-arrival-window');
    assert.equal(f.formal.beginAvailability().ok, false);
    f.clock.day = 2; f.clock.hour = 8;
    assert.equal(f.careers.beginDutyAvailability(role.id).ok, true);
    assert.equal(f.formal.beginAvailability().ok, true);
    assert.deepEqual(f.careers.state(), before, 'reads preserve even the previous action error');
    assert.deepEqual(f.saved(), saved);
    assert.equal(f.writes.length, 0, 'reading tomorrow must not evaluate or save an absent day');
    assert.equal(f.notices.length, 0, 'rendering availability does not announce an error');
    f.clock.day = 1; f.clock.hour = beforeClosing;
    assert.equal(f.careers.beginDuty({receiptId: f.receiptId}).ok, true,
      'a future preview must not advance lastClock or observedDay');
    assert.equal(f.writes.length, 1);
    assert.equal(f.careers.state().performance, 0);
  });

  test(`${role.id}: an admitted receipt recovers, continues and completes at 19:46`, () => {
    const f = fixture(role, {hour: afterClosing, stage: 'working'}), before = f.careers.state();
    const recovery = f.careers.beginDutyAvailability(role.id, {receiptId: f.receiptId});
    assert.equal(recovery.ok, true); assert.equal(recovery.unchanged, true);
    assert.equal(f.careers.beginDutyAvailability(role.id).code, 'duty-active', 'recovery cannot become a new shift');
    assert.equal(f.careers.beginDutyAvailability(role.id, {receiptId: `${role.workSource}-2`}).ok, false);
    assert.equal(f.formal.pendingReceipt(), f.receiptId);
    assert.equal(f.formal.beginAvailability().ok, true, 'a missing work slip can recover its admitted receipt');
    assert.equal(f.formal.begin(f.receiptId).unchanged, true);
    assert.deepEqual(f.careers.state(), before);
    assert.equal(f.writes.length, 0, 'matching-receipt recovery does not start or save another shift');
    const job = {formalRoleId: role.id, receiptId: f.receiptId}; f.setJob(job);
    assert.equal(f.formal.beginAvailability().code, 'duty-active');
    assert.equal(f.careers.canContinueLabor(f.receiptId), true);
    assert.equal(f.formal.canWork(job), true);
    assert.equal(f.formal.complete(job), true, 'ordinary physical completion remains allowed after closing');
    assert.equal(f.careers.state().lastDuty.stage, 'inspection');
    assert.equal(f.careers.canContinueLabor(f.receiptId), true);
    assert.equal(f.careers.laborEvent('inspected', {roleId: role.id, receiptId: f.receiptId}).ok, true,
      'ordinary inspection remains allowed after closing');
    assert.equal(f.careers.state().lastDuty.stage, 'ready');
  });

  test(`${role.id}: paid today stays unavailable and tomorrow opens a new shift`, () => {
    const f = fixture(role, {hour: beforeClosing, stage: 'paid'}), before = f.saved();
    assert.equal(f.careers.beginDutyAvailability(role.id).code, 'already-paid-today');
    assert.equal(f.formal.beginAvailability().code, 'already-paid-today');
    assert.equal(f.careers.beginDuty({receiptId: `${role.workSource}-2`}).code, 'already-paid-today');
    assert.deepEqual(f.saved(), before); assert.equal(f.writes.length, 0);
    f.clock.day = 2; f.clock.hour = 8;
    assert.equal(f.careers.beginDutyAvailability(role.id).ok, true);
    assert.equal(f.formal.beginAvailability().ok, true);
    assert.equal(f.careers.beginDuty({receiptId: `${role.workSource}-2`}).ok, true);
    assert.equal(f.careers.state().lastDuty.day, 2);
    assert.equal(f.careers.state().lastDuty.workReceiptId, `${role.workSource}-2`);
  });

  test(`${role.id}: employment cannot offer another formal role's shift`, () => {
    const f = fixture(role), other = role.id === TAVERN.id ? GARDEN : TAVERN, before = f.careers.state();
    const available = f.careers.beginDutyAvailability(other.id);
    assert.equal(available.ok, false); assert.equal(available.code, 'not-employed');
    assert.equal(available.roleId, other.id);
    assert.deepEqual(f.careers.state(), before); assert.equal(f.writes.length, 0);
  });
}
