// Reproduce lost receipts after failed enable/save, private-money leakage,
// fabricated desk/audience completion, and re-audit after bounded retention.
import assert from 'node:assert/strict';
import {createChinaOfficialEconomy, CHINA_OFFICIAL_IDS} from '../source/game/china-official-economy.js';
import {createChinaGranaryAudit, CHINA_GRANARY_AUDITOR, CHINA_GRANARY_AUDIT_POINT} from '../source/game/china-granary-audit.js';

const copy = value => JSON.parse(JSON.stringify(value));
const [first, second] = CHINA_OFFICIAL_IDS;
const duty = (actorId, day) => ({actorId, day, receiptId: `audit-duty:${actorId}:${day}`, evidence: {
  kind: 'office-work', completed: true, actorId, day, audienceDay: day, audienceCompleted: true, elapsed: 8, duration: 8,
}});
const visit = (changes = {}) => ({actorId: CHINA_GRANARY_AUDITOR, position: [...CHINA_GRANARY_AUDIT_POINT], elapsed: 21, duration: 21, ...changes});
const proof = (changes = {}) => ({reporterId: CHINA_GRANARY_AUDITOR, recipientId: 'cn-emperor', reportSeconds: 6, responseSeconds: 4, ...changes});
const fail = (result, code) => { assert.equal(result.ok, false); if (code) assert.equal(result.code, code); };
const economy = () => createChinaOfficialEconomy({getDay: () => 100, isAppointed: id => CHINA_OFFICIAL_IDS.includes(id), saveState: () => true});
function fixture({grade = true} = {}) {
  const money = economy(); if (grade) assert(money.activateGradePayPolicy().ok);
  let saver = () => true, reader = after => money.dutyAuditSource(after), audit, writes = [];
  audit = createChinaGranaryAudit({readReceipts: after => reader(after), saveState: candidate => { writes.push(candidate); return saver(candidate); }});
  return {money, audit, writes, pay: (id = first, day = 1) => { const result = money.completeDuty(duty(id, day)); assert(result.ok); return result; },
    save: callback => { saver = callback; }, source: callback => { reader = callback; }};
}
function pendingFixture() {
  const f = fixture(); assert(f.audit.activate().ok); f.pay();
  const prepared = f.audit.prepare(); assert(prepared.ok); f.batch = prepared.batch; return f;
}
function resultFixture() {
  const f = pendingFixture(); assert(f.audit.inspected(f.batch.id, visit()).ok); f.ref = f.audit.report(3).auditReport; return f;
}

// The public source excludes balances and spending, and returns detached rows.
{
  const money = economy(); assert(money.completeDuty(duty(first, 0)).ok);
  assert(money.withdraw({actorId: first, amount: 5, receiptId: 'audit-withdraw:0'}).ok);
  const source = money.dutyAuditSource(); assert.equal(source.lastTransaction, 2); assert.equal(source.receipts.length, 1);
  assert.deepEqual(Object.keys(source.receipts[0]).sort(), ['id', 'receiptId', 'actorId', 'day', 'amount', 'evidence'].sort());
  assert(!JSON.stringify(source).includes('accounts')); assert(!JSON.stringify(source).includes('before'));
  source.receipts[0].amount = 999; assert.equal(money.dutyAuditSource().receipts[0].amount, 24);
  assert.deepEqual(money.dutyAuditSource(1), {lastTransaction: 2, receipts: []});
  assert.equal(money.dutyAuditSource(-1), null);
}

// Old transactions are a one-time serial baseline, including non-duty serials.
// New receipts during failed activation survive an ordinary save and cold load.
{
  const money = economy(); assert(money.completeDuty(duty(first, 0)).ok);
  assert(money.withdraw({actorId: first, amount: 4, receiptId: 'old-spending'}).ok);
  let writes = 0;
  const firstAudit = createChinaGranaryAudit({readReceipts: after => money.dutyAuditSource(after), saveState: () => { writes++; return false; }});
  assert.deepEqual(firstAudit.snapshot(), {version: 1, enabled: false, baseline: 2, frontier: 2, sequence: 0, batches: []});
  const beforeReads = copy(firstAudit.snapshot());
  assert.equal(firstAudit.inspection(), null); assert.equal(firstAudit.job(), null); firstAudit.report(0);
  assert.deepEqual(firstAudit.snapshot(), beforeReads); assert.equal(writes, 0, 'reads never save or reserve a batch');
  fail(firstAudit.activate(), 'save-failed'); assert.equal(firstAudit.snapshot().baseline, 2);
  assert(money.completeDuty(duty(first, 1)).ok);
  const ordinarySave = firstAudit.snapshot();
  assert(money.completeDuty(duty(second, 0)).ok, 'late-paid old duty has a new transaction serial');
  let durable;
  const audit = createChinaGranaryAudit({saved: ordinarySave, readReceipts: after => money.dutyAuditSource(after), saveState: value => { durable = value; }});
  assert.equal(audit.loadError, null); assert.equal(audit.snapshot().baseline, 2); assert.equal(durable, undefined);
  assert(audit.activate().ok); const batch = audit.prepare().batch;
  assert.deepEqual(batch.receipts.map(row => [row.id, row.day, row.amount]), [['official-3', 1, 24], ['official-4', 0, 24]]);
  assert(batch.receipts.every(row => !Object.hasOwn(row, 'payContract')), 'original legacy amounts stay legacy, without current repricing');
  assert.equal(batch.fromSerial, 2); assert.equal(batch.throughSerial, 4);
  const monetaryBefore = money.snapshot(); assert(audit.inspected(batch.id, visit()).ok);
  const report = audit.report(7); assert(report.auditReport); assert(!/第8日.*付/.test(report.text), 'report day is never fabricated as payment date');
  assert(audit.acknowledgeReport(report.auditReport, proof()).ok); assert.deepEqual(money.snapshot(), monetaryBefore);
  assert.equal(audit.snapshot().batches[0].received.day, 7);
}

// One distinct physical read, bounded real duration, and original source rows.
{
  const f = pendingFixture(), before = f.audit.snapshot(), writes = f.writes.length;
  const job = f.audit.job(); assert.equal(job.id, f.batch.id); assert.deepEqual(job.point, CHINA_GRANARY_AUDIT_POINT);
  assert.equal(job.minDuration, 15); assert.equal(job.maxDuration, 27);
  job.point[0] = 0; assert.equal(f.audit.job().point[0], 24);
  assert.equal(f.audit.report(2).auditReport, undefined); assert.deepEqual(f.audit.snapshot(), before); assert.equal(f.writes.length, writes);
  for (const invalid of [visit({actorId: first}), visit({position: [0, .215, 0]}), visit({position: [24, 1, 32.5]}),
    visit({position: [24, .215, NaN]}), visit({position: [24, .215, 32.5, 0]}), visit({duration: 8}), visit({duration: 14.999}),
    visit({duration: 27.001}), visit({elapsed: 20.999}), visit({elapsed: Infinity}), visit({duration: '21'})]) {
    fail(f.audit.inspected(f.batch.id, invalid), 'invalid-inspection');
  }
  fail(f.audit.inspected('wrong', visit()), 'invalid-batch'); assert.deepEqual(f.audit.snapshot(), before);
  f.pay(second, 2); const repeated = f.audit.prepare(); assert(repeated.replayed); assert.equal(repeated.batch.receipts.length, 1, 'new arrivals cannot mutate frozen batch');
  assert(f.audit.inspected(f.batch.id, visit()).ok); assert.equal(f.audit.job(), null);
  assert(f.audit.inspected(f.batch.id, visit({elapsed: 22})).replayed, 'cold runtime can finish its already-saved longer elapsed read');
  fail(f.audit.inspected(f.batch.id, visit({duration: 20, elapsed: 22})), 'inspection-conflict');
  const report = f.audit.report(3); assert.equal(report.auditReport.batchId, f.batch.id); assert.match(report.text, /168文/);
  const snapshot = f.audit.snapshot(); snapshot.batches[0].receipts[0].amount = 1;
  assert.equal(f.audit.snapshot().batches[0].receipts[0].amount, 168);
  assert(f.audit.acknowledgeReport(report.auditReport, proof()).ok);
  const next = f.audit.prepare().batch; assert.equal(next.receipts.length, 1); assert.equal(next.receipts[0].actorId, second);
  assert(f.audit.inspected(f.batch.id, visit({elapsed: 23})).replayed, 'received retained batch also tolerates life runtime replay');
}

// Report identity, real six/four seconds, exact-day binding, replay and restore.
{
  const f = resultFixture(), before = f.audit.snapshot(), writes = f.writes.length;
  for (const changed of [proof({reporterId: first}), proof({recipientId: first}), proof({reportSeconds: 5.999}), proof({reportSeconds: 7}),
    proof({responseSeconds: 3.999}), proof({responseSeconds: 5}), proof({reportSeconds: '6'}), undefined]) fail(f.audit.acknowledgeReport(f.ref, changed));
  for (const changed of [{...f.ref, batchId: 'other'}, {...f.ref, reporterId: first}, {...f.ref, day: -1}, {...f.ref, day: 4}, {...f.ref, extra: true}]) fail(f.audit.acknowledgeReport(changed, proof()));
  assert.deepEqual(f.audit.snapshot(), before); assert.equal(f.writes.length, writes);
  f.audit.report(4); fail(f.audit.acknowledgeReport(f.ref, proof()), 'report-not-prepared');
  const currentRef = f.audit.report(4).auditReport; assert(f.audit.acknowledgeReport(currentRef, proof()).ok);
  const successfulWrites = f.writes.length;
  assert.deepEqual(f.audit.acknowledgeReport({...currentRef}, proof()), {ok: true, replayed: true});
  assert.equal(f.writes.length, successfulWrites); fail(f.audit.acknowledgeReport({...currentRef, day: 5}, proof()), 'receipt-conflict');
  const restored = createChinaGranaryAudit({saved: before, readReceipts: after => f.money.dutyAuditSource(after), saveState: () => true});
  fail(restored.acknowledgeReport(f.ref, proof()), 'report-not-prepared'); assert(restored.restoreReport(f.ref));
  assert.deepEqual(restored.snapshot(), before); assert(restored.acknowledgeReport(f.ref, proof()).ok);
  const received = createChinaGranaryAudit({saved: f.audit.snapshot(), readReceipts: after => f.money.dutyAuditSource(after), saveState: () => assert.fail('exact replay cannot write')});
  assert(received.restoreReport(currentRef)); assert(received.acknowledgeReport(currentRef, proof()).replayed);
}

// Persist-before-adopt applies to each stage, including metadata initialization.
// Reentrant observers never see a successful candidate before it is durable.
for (const stage of ['activate', 'prepare', 'inspect', 'acknowledge']) {
  for (const mode of ['false', 'object', 'throw', 'resolved-promise', 'rejected-promise', 'mutation', 'reentry']) {
    const f = stage === 'activate' ? fixture() : stage === 'prepare' ? fixture() : stage === 'inspect' ? pendingFixture() : resultFixture();
    if (stage === 'prepare') { assert(f.audit.activate().ok); f.pay(); }
    const before = f.audit.snapshot(), moneyBefore = f.money.snapshot();
    const action = () => stage === 'activate' ? f.audit.activate() : stage === 'prepare' ? f.audit.prepare() :
      stage === 'inspect' ? f.audit.inspected(f.batch.id, visit()) : f.audit.acknowledgeReport(f.ref, proof());
    f.save(candidate => {
      assert.deepEqual(f.audit.snapshot(), before); assert(Object.isFrozen(candidate)); assert(Object.isFrozen(candidate.batches));
      assert.equal(f.audit.job(), null); assert.equal(f.audit.restoreReport(f.ref), false);
      fail(f.audit.activate(), 'busy'); fail(f.audit.prepare(), 'busy'); fail(f.audit.inspected('x', visit()), 'busy');
      fail(f.audit.report(3), 'busy'); fail(f.audit.acknowledgeReport(f.ref, proof()), 'busy');
      if (mode === 'false' || mode === 'reentry') return false;
      if (mode === 'object') return {ok: false};
      if (mode === 'throw') throw Error('not durable');
      if (mode === 'resolved-promise') return Promise.resolve(true);
      if (mode === 'rejected-promise') return Promise.reject(Error('not durable'));
      candidate.frontier = 999;
    });
    fail(action()); assert.deepEqual(f.audit.snapshot(), before, `${stage}/${mode}`); assert.deepEqual(f.money.snapshot(), moneyBefore);
    f.save(() => true); assert(action().ok, `${stage}/${mode} retry`);
    const writes = f.writes.length; assert(action().replayed); assert.equal(f.writes.length, writes);
  }
}
await Promise.resolve();

// Frozen originals are checked again at physical completion and receipt ack.
for (const stage of ['inspect', 'acknowledge', 'replay']) {
  const f = stage === 'inspect' ? pendingFixture() : resultFixture();
  if (stage === 'replay') assert(f.audit.acknowledgeReport(f.ref, proof()).ok);
  const before = f.audit.snapshot(), writes = f.writes.length;
  for (const mutate of [source => { source.receipts[0].amount++; }, source => { source.receipts = []; },
    source => { source.receipts[0].receiptId = 'changed'; }, source => { source.receipts[0].evidence.elapsed++; },
    source => { source.receipts[0].payContract.gradeId = 'changed-grade'; }]) {
    f.source(after => { const source = f.money.dutyAuditSource(after); mutate(source); return source; });
    fail(stage === 'inspect' ? f.audit.inspected(f.batch.id, visit()) : f.audit.acknowledgeReport(f.ref, proof()));
    assert.deepEqual(f.audit.snapshot(), before); assert.equal(f.writes.length, writes);
  }
  f.source(after => f.money.dutyAuditSource(after));
  assert((stage === 'inspect' ? f.audit.inspected(f.batch.id, visit()) : f.audit.acknowledgeReport(f.ref, proof())).ok);
}

// Validation never silently resets a corrupt saved frontier or accepts a
// malformed receipt as already reviewed. Cold loads perform no write.
{
  const f = resultFixture(); assert(f.audit.acknowledgeReport(f.ref, proof()).ok); const valid = f.audit.snapshot();
  for (const mutate of [s => { s.version = 2; }, s => { s.enabled = false; }, s => { s.baseline = -1; }, s => { s.frontier++; },
    s => { s.sequence++; }, s => { s.batches[0].id = 'wrong'; }, s => { s.batches[0].throughSerial++; },
    s => { s.batches[0].result.duration = 8; }, s => { s.batches[0].received.reportSeconds = 5; }, s => { s.batches[0].received.batchId = 'wrong'; },
    s => { s.batches[0].receipts[0].before = {accounts: {secret: 1}}; }, s => { s.batches[0].receipts[0].amount++; },
    s => { s.batches[0].receipts[0].payContract.gradeId = 'different'; }]) {
    const changed = copy(valid); mutate(changed);
    const restored = createChinaGranaryAudit({saved: changed, readReceipts: after => f.money.dutyAuditSource(after), saveState: () => assert.fail('load cannot write')});
    assert(restored.loadError); assert.deepEqual(restored.snapshot(), changed);
    fail(restored.activate()); fail(restored.prepare()); fail(restored.acknowledgeReport(f.ref, proof()));
  }
  const missing = createChinaGranaryAudit({readReceipts: () => null, saveState: () => true});
  assert.equal(missing.snapshot().baseline, null); fail(missing.activate(), 'baseline-unavailable');
  const later = createChinaGranaryAudit({saved: missing.snapshot(), readReceipts: after => f.money.dutyAuditSource(after), saveState: () => true});
  assert.equal(later.snapshot().baseline, null); fail(later.activate(), 'baseline-unavailable');
}

// Removing an original first/middle row cannot preserve a forged frontier.
{
  const f = fixture(); assert(f.audit.activate().ok);
  for (const id of CHINA_OFFICIAL_IDS) f.pay(id, 1);
  const batch = f.audit.prepare().batch; assert.equal(batch.receipts.length, 6);
  for (const removedIndex of [0, 2]) {
    const changed = f.audit.snapshot(); changed.batches[0].receipts.splice(removedIndex, 1);
    const restored = createChinaGranaryAudit({saved: changed, readReceipts: after => f.money.dutyAuditSource(after), saveState: () => assert.fail('invalid load cannot save')});
    assert.equal(restored.loadError, 'source-mismatch'); assert.deepEqual(restored.snapshot(), changed);
    fail(restored.prepare(), 'source-mismatch'); fail(restored.inspected(batch.id, visit()), 'source-mismatch');
  }
}

// Source validation rejects extra personal fields, bad IDs, invalid officials,
// duplicate or out-of-order rows, and incomplete original duty evidence.
{
  const f = fixture(); assert(f.audit.activate().ok); f.pay(); f.pay(second);
  const before = f.audit.snapshot();
  for (const mutate of [s => { s.receipts[0].before = {accounts: {}}; }, s => { s.receipts[0].actorId = 'player'; },
    s => { s.receipts[0].id = 'official-0'; }, s => { s.receipts[0].evidence.completed = false; },
    s => { s.receipts.reverse(); }, s => { s.receipts[1] = copy(s.receipts[0]); }, s => { s.lastTransaction = 0; },
    s => { s.receipts[0].payContract.accounts = {}; }, s => { s.receipts[0].evidence.wallet = {}; }]) {
    f.source(after => { const source = f.money.dutyAuditSource(after); mutate(source); return source; });
    fail(f.audit.prepare()); assert.deepEqual(f.audit.snapshot(), before);
  }
}

// Empty source reads do not cause background saves; expense serial gaps remain
// safe. Only the last selected duty serial advances a successfully frozen batch.
{
  const f = fixture(); assert(f.audit.activate().ok); const initialWrites = f.writes.length;
  for (let i = 0; i < 10; i++) assert.equal(f.audit.prepare().batch, null);
  assert.equal(f.writes.length, initialWrites);
  for (let day = 1; day <= 2; day++) for (const id of CHINA_OFFICIAL_IDS) f.pay(id, day);
  assert(f.money.withdraw({actorId: first, amount: 2, receiptId: 'after-duties-spend'}).ok);
  const firstBatch = f.audit.prepare().batch; assert.equal(firstBatch.receipts.length, 6); assert.equal(firstBatch.throughSerial, 6);
  assert(f.audit.inspected(firstBatch.id, visit()).ok); assert(f.audit.acknowledgeReport(f.audit.report(3).auditReport, proof()).ok);
  const secondBatch = f.audit.prepare().batch; assert.equal(secondBatch.receipts.length, 6); assert.equal(secondBatch.throughSerial, 12);
  assert(f.audit.inspected(secondBatch.id, visit()).ok); assert(f.audit.acknowledgeReport(f.audit.report(3).auditReport, proof()).ok);
  const writes = f.writes.length; assert.equal(f.audit.prepare().batch, null); assert.equal(f.writes.length, writes); assert.equal(f.audit.snapshot().frontier, 12);
  f.pay(first, 3); const next = f.audit.prepare().batch; assert.equal(next.receipts[0].id, 'official-14'); assert.equal(next.throughSerial, 14);
}

// Keeping just eight completed batches never makes old source receipts new.
{
  const f = fixture(); assert(f.audit.activate().ok); let audit = f.audit;
  for (let day = 1; day <= 10; day++) {
    f.pay(first, day); const batch = audit.prepare().batch;
    assert.equal(batch.id, `cn-granary-audit-${day}`); assert(audit.inspected(batch.id, visit()).ok);
    assert(audit.acknowledgeReport(audit.report(day).auditReport, proof()).ok);
    const saved = audit.snapshot(); assert.equal(saved.batches.length, Math.min(day, 8));
    audit = createChinaGranaryAudit({saved, readReceipts: after => f.money.dutyAuditSource(after), saveState: () => true});
    assert.equal(audit.loadError, null); assert.equal(audit.prepare().batch, null);
  }
  assert.equal(audit.snapshot().batches[0].id, 'cn-granary-audit-3'); assert.equal(audit.snapshot().frontier, 10);
  const moneyBefore = f.money.snapshot(); assert.equal(audit.prepare().batch, null); assert.deepEqual(f.money.snapshot(), moneyBefore);
}
console.log('PASS granary audit: real settled source allowlist, one-time serial cutoff/cold retry, frozen six-row batches, Xu desk 15–27s proof, exact 6/4s audience receipts, atomic failure/reentry, source revalidation, and bounded exact-once history without money effects');
