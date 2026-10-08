// Targeted persistence/source regression: no late archive changes a frozen
// answer; stale correction callbacks, fabricated physical completion, wrong
// tenure, and failed/reentrant saves must never create Lu's signed receipt.
import assert from 'node:assert/strict';
import {createChinaPersonnelRecords, CHINA_PERSONNEL_OFFICIALS_V1 as OFFICIALS} from '../source/game/china-personnel-records.js';
import {createChinaPersonnelWork, CHINA_PERSONNEL_WORK_DURATIONS, CHINA_PERSONNEL_COMPILE_POINT, CHINA_PERSONNEL_REVIEWER} from '../source/game/china-personnel-work.js';

const copy = value => structuredClone(value);
const DAY = 10, TENURE = 'cn-records-tenure:1', BODY = 'cn-official-personnel-original-body';
const ids = OFFICIALS.map(actor => actor.actorId);
const fail = (result, code) => { assert.equal(result.ok, false); if (code) assert.equal(result.code, code); return result; };
function fixture({archives = [0, 3], day = DAY, mode = 'trial'} = {}) {
  const actors = new Map(OFFICIALS.map(actor => [actor.actorId, {actorId: actor.actorId, alive: true, position: [...actor.office]}]));
  const ledger = createChinaPersonnelRecords({resolveActor: id => actors.get(id), saveState: () => true});
  const court = d => ledger.witnessCourt({id: `cn-morning-audience:${d}`, day: d, actorIds: ids});
  const archive = (index, d = day) => ledger.witnessArchive({id: `cn-official-archive:${ids[index]}:${d}`, actorId: ids[index], day: d,
    audienceId: `cn-morning-audience:${d}`, position: [...OFFICIALS[index].office], elapsed: 8, duration: 8});
  assert(court(day).ok); archives.forEach(index => assert(archive(index).ok));
  let appointment = {actorId: 'player', tenureId: TENURE, rankId: mode === 'trial' ? 'cn-records-regular' : 'cn-records-personnel'};
  let saver = () => true, source = (d, serial) => ledger.sourceFor(d, serial), eligible = request => request.officialTenureId === TENURE;
  let reviewer = {actorId: CHINA_PERSONNEL_REVIEWER, bodyId: BODY, alive: true, position: [19.3, 3.915, 32.15]};
  const writes = [], options = {sourceFor: (d, serial) => source(d, serial), readAppointment: () => appointment,
    validateEligibility: request => eligible(request), resolveActor: () => reviewer,
    saveState: candidate => { writes.push(candidate); return saver(candidate); }};
  const work = createChinaPersonnelWork(options);
  const f = {ledger, actors, work, writes, day, mode, court, archive, options,
    save: value => { saver = value; }, source: value => { source = value; }, eligible: value => { eligible = value; },
    appointment: value => { appointment = value; }, reviewer: value => { reviewer = value; }};
  f.claim = () => work.claim({day, mode, officialTenureId: TENURE});
  f.job = () => work.current() ?? work.snapshot().cases.at(-1);
  f.id = () => f.job().id;
  f.visitProof = (index = 0, changes = {}) => ({caseId: f.id(), actorId: 'player', targetId: ids[index],
    position: [OFFICIALS[index].office[0] + 1, OFFICIALS[index].office[1], OFFICIALS[index].office[2]],
    standing: true, clear: true, elapsed: 3, duration: 3, ...changes});
  f.visit = (index = 0, changes = {}) => work.visit({caseId: f.id(), actorId: ids[index], proof: f.visitProof(index, changes)});
  f.answer = (index, archiveStatus) => work.record({caseId: f.id(), actorId: ids[index], archiveStatus});
  f.fill = ({wrong = false} = {}) => {
    for (let i = 0; i < ids.length; i++) {
      assert(f.visit(i).ok);
      const accepted = f.job().source.archives.some(row => row.actorId === ids[i]);
      assert(f.answer(i, wrong && i === 1 ? 'accepted' : accepted ? 'accepted' : 'awaiting').ok);
    }
  };
  f.compileProof = (changes = {}) => ({caseId: f.id(), actorId: 'player', targetId: 'cn-court-career-desk',
    position: [...CHINA_PERSONNEL_COMPILE_POINT], standing: true, clear: true, elapsed: 8, duration: 8, revision: f.job().revision, ...changes});
  f.compile = changes => work.compile({caseId: f.id(), proof: f.compileProof(changes)});
  f.reviewProof = (changes = {}) => ({caseId: f.id(), actorId: 'player', targetId: CHINA_PERSONNEL_REVIEWER,
    position: [20.3, 3.915, 32.15], standing: true, clear: true, elapsed: 4, duration: 4, revision: f.job().revision,
    recipientPosition: [19.3, 3.915, 32.15], recipientBodyId: BODY, recipientAlive: true, ...changes});
  f.review = changes => work.review({caseId: f.id(), proof: f.reviewProof(changes)});
  return f;
}
function prepared(stage = 'review') {
  const f = fixture();
  if (stage !== 'claim') assert(f.claim().ok);
  if (stage === 'record') assert(f.visit().ok);
  if (['compile', 'review', 'reject'].includes(stage)) f.fill({wrong: stage === 'reject'});
  if (['review', 'reject'].includes(stage)) assert(f.compile().ok);
  return f;
}

assert.deepEqual(CHINA_PERSONNEL_WORK_DURATIONS, {visit: 3, compile: 8, review: 4});

// Real records source freezes six numbered originals, including no-original
// observations. New archives cannot become the correct answer retroactively.
{
  const f = fixture(), moneyFreeBefore = f.ledger.snapshot();
  const claimed = f.claim(); assert(claimed.ok); assert(Object.isFrozen(claimed.case)); assert(Object.isFrozen(claimed.case.source.archives));
  assert.deepEqual(claimed.case.rows.map(row => row.actorId), ids);
  assert.deepEqual(claimed.case.source.audience.actors.map(row => row.gradeId), OFFICIALS.map(row => row.gradeId));
  fail(f.answer(0, 'accepted'), 'original-not-read');
  fail(f.compile(), 'roster-incomplete'); fail(f.review(), 'roster-not-compiled');
  f.fill({wrong: true}); assert(f.compile().ok);
  const rejection = fail(f.review(), 'roster-rejected');
  assert.deepEqual(rejection.rejectedRows, [{actorId: ids[1], code: 'archive-without-original'}]);
  assert.equal(f.work.receiptFor(f.id()), null); assert.equal(f.job().rows[1].archiveStatus, 'accepted');
  const writes = f.writes.length; assert(f.review().replayed); assert.equal(f.writes.length, writes);
  assert(f.archive(1).ok); assert.equal(f.ledger.sourceFor(DAY).archives.length, 3);
  assert.equal(f.job().source.archives.length, 2);
  const priorCompile = f.compileProof(), priorReview = f.reviewProof(), visits = f.job().rows.map(row => row.visit);
  assert(f.answer(1, 'awaiting').ok); assert.equal(f.job().compiled, null);
  assert.deepEqual(f.job().rows.map(row => row.visit), visits);
  assert.equal(f.job().rows[1].corrections, 1);
  fail(f.work.compile({caseId: f.id(), proof: priorCompile}), 'invalid-compile');
  assert(f.compile().ok); fail(f.work.review({caseId: f.id(), proof: priorReview}), 'invalid-review');
  const receipt = f.review().receipt; assert(receipt); assert.equal(f.work.current(), null);
  assert.equal(receipt.sourceDay, DAY); assert.equal(receipt.signerBodyId, BODY); assert.equal(receipt.corrections, 1);
  assert.equal(receipt.rows[1].archiveStatus, 'awaiting'); assert.equal(receipt.rows[1].archiveId, null);
  assert(Object.isFrozen(receipt)); assert(Object.isFrozen(receipt.rows)); assert(Object.isFrozen(receipt.rows[0]));
  assert.equal(new Set(receipt.rows.map(row => row.visitReceiptId)).size, 6);
  assert(!['amount', 'salary', 'xp', 'promotion', 'rankId'].some(key => Object.hasOwn(receipt, key)));
  const signed = f.work.snapshot(), writeCount = f.writes.length;
  assert(f.review().replayed); assert.equal(f.writes.length, writeCount);
  fail(f.answer(0, 'awaiting'), 'case-already-signed'); fail(f.work.abandon({caseId: f.id()}), 'case-already-signed');
  assert(f.claim().replayed); fail(f.work.claim({day: DAY, mode: 'duty', officialTenureId: TENURE}), 'source-already-claimed');
  assert.deepEqual(f.work.snapshot(), signed);
  // Promotion/resignation changes current appointment, not historical ownership.
  f.appointment(null);
  const restored = createChinaPersonnelWork({...f.options, saved: signed});
  assert.equal(restored.loadError, null); assert.deepEqual(restored.receiptFor(receipt.caseId), receipt);
  assert.equal(f.ledger.snapshot().archives.length, moneyFreeBefore.archives.length + 1);
  assert.deepEqual(f.ledger.snapshot().courts, moneyFreeBefore.courts);
}

// As-of provenance also rejects removal before a draft has any answers; the
// historical boundary proves that the original was already present at claim.
{
  const f = prepared('visit'), saved = f.work.snapshot();
  saved.cases[0].source.archives.shift();
  const restored = createChinaPersonnelWork({...f.options, saved});
  assert.equal(restored.loadError, 'source-mismatch');
  assert.equal(restored.current(), null);
  assert(f.archive(1).ok);
  const valid = createChinaPersonnelWork({...f.options, saved: f.work.snapshot()});
  assert.equal(valid.loadError, null);
  assert.equal(valid.current().source.archives.length, 2);
}

// The opposite error identifies the particular original with omitted evidence.
{
  const f = prepared('review'); assert(f.answer(0, 'awaiting').ok); assert(f.compile().ok);
  const result = fail(f.review(), 'roster-rejected');
  assert.deepEqual(result.rejectedRows, [{actorId: ids[0], code: 'original-archive-not-recorded'}]);
  assert.equal(f.job().rows[0].archiveStatus, 'awaiting');
}

// Every physical receipt is player/target/case-bound, standing, clear, at the
// original same-floor point, and continuously complete at the chosen duration.
for (const [stage, code] of [['visit', 'invalid-visit'], ['compile', 'invalid-compile'], ['review', 'invalid-review']]) {
  const f = prepared(stage === 'visit' ? 'visit' : stage);
  const defaultProof = stage === 'visit' ? f.visitProof() : stage === 'compile' ? f.compileProof() : f.reviewProof();
  const action = changes => stage === 'visit' ? f.visit(0, changes) : stage === 'compile' ? f.compile(changes) : f.review(changes);
  const before = f.work.snapshot(), writes = f.writes.length;
  for (const changes of [{caseId: 'other'}, {actorId: ids[0]}, {targetId: 'other'}, {standing: false}, {clear: false},
    {elapsed: defaultProof.duration - .001}, {duration: defaultProof.duration + 1}, {duration: String(defaultProof.duration)},
    {elapsed: Infinity}, {position: [0, 0, 0]}, {position: [defaultProof.position[0], defaultProof.position[1] + .31, defaultProof.position[2]]},
    {position: [NaN, 0, 0]}, {position: [...defaultProof.position, 0]}, {extra: 'private-unrelated-data'}]) fail(action(changes), code);
  if (stage !== 'visit') fail(action({revision: f.job().revision + 1}), code);
  if (stage === 'review') {
    fail(action({recipientAlive: false}), code); fail(action({recipientBodyId: ''}), code);
    fail(action({recipientPosition: [30, 3.915, 32.15]}), code);
    fail(action({recipientBodyId: 'another-body'}), 'reviewer-unavailable');
    f.reviewer({actorId: CHINA_PERSONNEL_REVIEWER, bodyId: BODY, alive: false, position: [19.3, 3.915, 32.15]});
    fail(action({}), 'reviewer-unavailable');
    f.reviewer({actorId: ids[0], bodyId: BODY, alive: true, position: [19.3, 3.915, 32.15]});
    fail(action({}), 'reviewer-unavailable');
    f.reviewer({actorId: CHINA_PERSONNEL_REVIEWER, bodyId: BODY, alive: true, position: [19.4, 3.915, 32.15]});
    fail(action({}), 'reviewer-unavailable');
  }
  assert.deepEqual(f.work.snapshot(), before); assert.equal(f.writes.length, writes);
}

// Six distinct reads cannot be substituted by one actor's completed proof.
{
  const f = prepared('visit'); assert(f.visit().ok); const before = f.work.snapshot();
  fail(f.work.visit({caseId: f.id(), actorId: ids[1], proof: f.visitProof(0)}), 'invalid-visit');
  assert(f.visit().replayed); assert.deepEqual(f.work.snapshot(), before);
  assert(f.visit(0, {elapsed: 4}).replayed); assert.deepEqual(f.work.snapshot(), before);
  const resumed = createChinaPersonnelWork({...f.options, saved: before});
  assert.equal(resumed.loadError, null); assert.equal(resumed.current().rows.filter(row => row.visit).length, 1);
}

// Save-boundary replay accepts the same completed action's later elapsed
// time and nearby still-valid body position without replacing original proof.
for (const stage of ['visit', 'compile', 'review', 'reject']) {
  const f = prepared(stage), action = changes => stage === 'visit' ? f.visit(0, changes) : stage === 'compile' ? f.compile(changes) : f.review(changes);
  const first = action(); if (stage === 'reject') fail(first, 'roster-rejected'); else assert(first.ok);
  const before = f.work.snapshot(), writes = f.writes.length;
  const proof = stage === 'visit' ? f.visitProof() : stage === 'compile' ? f.compileProof() : f.reviewProof();
  const later = {...proof, elapsed: proof.elapsed + .25, position: [proof.position[0] + .05, proof.position[1], proof.position[2]]};
  assert(action(later).replayed); assert.deepEqual(f.work.snapshot(), before); assert.equal(f.writes.length, writes);
  const restored = createChinaPersonnelWork({...f.options, saved: before}); assert.equal(restored.loadError, null);
  const input = {caseId: f.id(), proof: later, ...(stage === 'visit' ? {actorId: ids[0]} : {})};
  const repeat = stage === 'visit' ? restored.visit(input) : stage === 'compile' ? restored.compile(input) : restored.review(input);
  assert(repeat.replayed); assert.deepEqual(restored.snapshot(), before); assert.equal(f.writes.length, writes);
  if (['review', 'reject'].includes(stage)) fail(action({...later, recipientBodyId: 'other-body'}), 'review-conflict');
  fail(action({...later, duration: proof.duration + 1}));
}

// Fail-closed appointment, explicit eligibility, source court, and persisted
// historical ownership cannot be supplied through a caller-selected tenure.
{
  const f = fixture();
  fail(f.work.claim({day: DAY, mode: 'trial', officialTenureId: 'someone-else'}), 'appointment-mismatch');
  fail(f.work.claim({day: DAY, mode: 'duty', officialTenureId: TENURE}), 'appointment-mismatch');
  fail(f.work.claim({day: DAY - 1, mode: 'trial', officialTenureId: TENURE}), 'source-unavailable');
  f.eligible(() => false); fail(f.claim(), 'appointment-mismatch');
  f.eligible(() => ({ok: true, actorId: 'npc', officialTenureId: TENURE, rankId: 'cn-records-regular'})); fail(f.claim(), 'appointment-mismatch');
  f.eligible(() => ({ok: true, actorId: 'player', officialTenureId: TENURE, rankId: 'cn-records-regular'})); assert(f.claim().ok);
  const saved = f.work.snapshot(); f.appointment({actorId: 'player', tenureId: 'new-tenure', rankId: 'cn-records-regular'});
  fail(f.visit(), 'appointment-mismatch'); fail(f.answer(0, 'accepted'), 'appointment-mismatch');
  assert.deepEqual(f.work.snapshot(), saved);
  assert(f.work.abandon({caseId: f.id()}).ok); assert.equal(f.work.current(), null); assert.equal(f.work.receiptFor(f.id()), null);
  assert(f.work.abandon({caseId: f.id()}).replayed);
  f.appointment({actorId: 'player', tenureId: TENURE, rankId: 'cn-records-regular'});
  fail(f.claim(), 'case-abandoned');
  const abandoned = f.work.snapshot();
  assert.equal(createChinaPersonnelWork({...f.options, saved: abandoned}).loadError, null);
  assert.equal(createChinaPersonnelWork({...f.options, saved: abandoned, validateEligibility: () => false}).loadError, 'tenure-ownership-mismatch');
  const defaults = createChinaPersonnelWork({sourceFor: f.ledger.sourceFor, saveState: () => true});
  fail(defaults.claim({day: DAY, mode: 'trial', officialTenureId: TENURE}), 'appointment-mismatch');
  const duty = fixture({mode: 'duty'}); assert(duty.claim().ok); duty.fill(); assert(duty.compile().ok); assert.equal(duty.review().receipt.mode, 'duty');
}

// All durable transitions, including rejected reviews and abandonment, retain
// their previous state until a successful synchronous immutable save.
for (const stage of ['claim', 'visit', 'record', 'compile', 'review', 'reject', 'abandon']) {
  for (const mode of ['false', 'object', 'throw', 'promise', 'rejected-promise', 'mutation', 'reentry']) {
    const f = prepared(stage), before = f.work.snapshot();
    const action = () => stage === 'claim' ? f.claim() : stage === 'visit' ? f.visit() : stage === 'record' ? f.answer(0, 'accepted') :
      stage === 'compile' ? f.compile() : ['review', 'reject'].includes(stage) ? f.review() : f.work.abandon({caseId: f.id()});
    f.save(candidate => {
      assert(Object.isFrozen(candidate)); assert(Object.isFrozen(candidate.cases));
      assert.deepEqual(f.work.snapshot(), before); assert.equal(f.work.current(), null); assert.equal(f.work.receiptFor('anything'), null);
      fail(f.work.claim({day: DAY, mode: 'trial', officialTenureId: TENURE}), 'busy');
      fail(f.work.visit(), 'busy'); fail(f.work.record(), 'busy'); fail(f.work.compile(), 'busy'); fail(f.work.review(), 'busy'); fail(f.work.abandon(), 'busy');
      if (mode === 'false' || mode === 'reentry') return false;
      if (mode === 'object') return {ok: false};
      if (mode === 'throw') throw Error('not committed');
      if (mode === 'promise') return Promise.resolve(true);
      if (mode === 'rejected-promise') return Promise.reject(Error('not committed'));
      candidate.cases.push({id: 'forged'});
    });
    fail(action(), ['promise', 'rejected-promise'].includes(mode) ? 'async-save-unsupported' : 'save-failed');
    assert.deepEqual(f.work.snapshot(), before, `${stage}/${mode}`);
    f.save(() => true); const result = action();
    if (stage === 'reject') fail(result, 'roster-rejected'); else assert(result.ok, `${stage}/${mode}`);
    const successful = f.work.snapshot(), writes = f.writes.length;
    assert(action().replayed, `${stage}/${mode} replay`); assert.equal(f.writes.length, writes); assert.deepEqual(f.work.snapshot(), successful);
    assert.equal(createChinaPersonnelWork({...f.options, saved: successful}).loadError, null, `${stage}/${mode} restore`);
  }
}
await Promise.resolve();

// Frozen source originals are revalidated, but later newly observed originals
// are allowed; neither a source rewrite nor a missing court is guessed away.
for (const stage of ['visit', 'record', 'compile', 'review']) {
  const f = prepared(stage), before = f.work.snapshot();
  const action = () => stage === 'visit' ? f.visit() : stage === 'record' ? f.answer(0, 'accepted') : stage === 'compile' ? f.compile() : f.review();
  for (const mutate of [source => { source.archives = []; }, source => { source.archives[0].elapsed++; },
    source => { source.audience.actors[0].name = 'Someone'; }, source => { source.audience = null; }]) {
    f.source((day, serial) => { const result = copy(f.ledger.sourceFor(day, serial)); mutate(result); return result; });
    fail(action()); assert.deepEqual(f.work.snapshot(), before);
    assert(createChinaPersonnelWork({...f.options, saved: before}).loadError);
  }
  f.source((day, serial) => f.ledger.sourceFor(day, serial)); assert(action().ok);
}

// Strict cold restoration rejects duplicate/misbound cases, unvisited rows,
// forged durations/signatures, unsupported fields and cross-source receipts.
{
  const f = prepared('review'); assert(f.review().ok); const saved = f.work.snapshot();
  const changes = [s => { s.version++; }, s => { s.extra = {}; }, s => { s.currentId = s.cases[0].id; }, s => { s.cases.push(copy(s.cases[0])); },
    s => { s.cases[0].id += ':other'; }, s => { s.cases[0].actorId = ids[0]; }, s => { s.cases[0].officialTenureId = 'other'; },
    s => { s.cases[0].day++; }, s => { s.cases[0].audienceId = 'other'; }, s => { s.cases[0].source.archives[0].day++; }, s => { s.cases[0].source.throughSerial = 0; },
    s => { s.cases[0].source.archives = []; },
    s => { s.cases[0].source.audience.actors.reverse(); }, s => { s.cases[0].source.archives[0].privateBalance = 500; },
    s => { s.cases[0].rows[0].visit = null; }, s => { s.cases[0].rows[0].visit.elapsed = 2; },
    s => { s.cases[0].rows[0].actorId = ids[1]; }, s => { s.cases[0].rows[1].archiveStatus = 'accepted'; },
    s => { s.cases[0].rows[0].corrections++; }, s => { s.cases[0].compiled.proof.duration = 7; },
    s => { s.cases[0].compiled.revision--; }, s => { s.cases[0].reviews[0].compiled.proof.duration = 7; },
    s => { s.cases[0].reviews[0].proof.recipientAlive = false; }, s => { s.cases[0].reviews[0].proof.recipientPosition[1] = 0; },
    s => { s.cases[0].receipt.signerBodyId = 'forged'; }, s => { s.cases[0].receipt.rows[0].archiveId = 'other'; },
    s => { s.cases[0].receipt.rows[0].visitReceiptId = 'other'; }, s => { s.cases[0].receipt.corrections++; },
    s => { s.cases[0].status = 'abandoned'; }, s => { s.cases[0].receipt.amount = 26; }];
  for (const change of changes) {
    const changed = copy(saved); change(changed);
    const restored = createChinaPersonnelWork({...f.options, saved: changed, saveState: () => assert.fail('restore cannot write')});
    assert(restored.loadError); assert.deepEqual(restored.snapshot(), changed); assert.equal(restored.current(), null);
    assert.equal(restored.receiptFor(f.id()), null); fail(restored.claim({day: DAY, mode: 'trial', officialTenureId: TENURE}));
  }
  const snapshot = f.work.snapshot(); snapshot.cases[0].receipt.rows[0].name = 'mutated';
  assert.notEqual(f.work.snapshot().cases[0].receipt.rows[0].name, 'mutated');
}

// No unsafe history pruning: old signed/abandoned source reservations continue
// to prevent duplicate work after enough later cases to exceed typical limits.
{
  const f = fixture(); assert(f.claim().ok); const firstId = f.id(); assert(f.work.abandon({caseId: firstId}).ok);
  for (let day = DAY + 1; day < DAY + 20; day++) {
    assert(f.court(day).ok);
    const result = f.work.claim({day, mode: 'trial', officialTenureId: TENURE}); assert(result.ok);
    assert(f.work.abandon({caseId: result.case.id}).ok);
  }
  assert.equal(f.work.snapshot().cases.length, 20); fail(f.claim(), 'case-abandoned');
  const restored = createChinaPersonnelWork({...f.options, saved: f.work.snapshot()});
  assert.equal(restored.loadError, null); assert.equal(restored.snapshot().cases[0].id, firstId);
}

console.log('china-personnel-work: frozen original roster, six physical reads, correction/review, tenure ownership and durable save boundaries passed');
