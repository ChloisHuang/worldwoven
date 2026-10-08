// Targeted physical/persistence regressions for trial and personnel daily work.
// Uses real Three roots, the real formal-career/records/work cores, staged
// already-qualified formal appointment and legal endpoint placement. It does
// not claim full-main routing, naturally elapsed days, or rendered acceptance.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id, context, next) {
  return id === 'three' ? {url: new URL('../source/vendor/three/build/three.module.js', import.meta.url).href, shortCircuit: true} : next(id, context);
}});
const T = await import('three');
const {createChinaPersonnelCareer, CHINA_PERSONNEL_READ_PLACES} = await import('../source/game/china-personnel-career.js');
const {createChinaPersonnelRecords, CHINA_PERSONNEL_OFFICIALS_V1: OFFICIALS} = await import('../source/game/china-personnel-records.js');
const {createFormalCareers, COURT_CLERK_ROLE} = await import('../source/game/formal-careers.js');
const {createChinaCourtCareer} = await import('../source/game/china-court-career.js');
const {careerInterviewRoll} = await import('../source/game/career-applications.js');
const {approvePending} = await import('./fixtures/career-application.mjs');
const copy = value => structuredClone(value), ROLE = COURT_CLERK_ROLE.id, LU = 'cn-official-personnel';
let goodSeed;
for (let seed = 1; seed < 10000; seed++) if (careerInterviewRoll(seed, ROLE, 1) < .565 && careerInterviewRoll(seed, ROLE + ':promotion', 3) < .7 && careerInterviewRoll(seed, ROLE + ':promotion:personnel', 7) < .3) { goodSeed = seed; break; }
assert(goodSeed);
function fixture({enabled = true, qualified = true, initialSource = true, personnel = false} = {}) {
  const clock = {day: 1, hour: 8, seconds: 0}, bank = [], flags = {busy: false, standing: true, visible: true, meeting: true, held: false, save: true, careerSave: true, bank: true, blockedRead: false, reception: true, socialHeld: false};
  let savedCareer, service, durable, lastCandidate, storedSource, lu = null, careerWrites = 0;
  const readPersonnelWork = ({mode, officialTenureId, day, caseId, allowPending = false}) => service?.personnelWorkState()?.cases?.findLast(job =>
    job.mode === mode && job.officialTenureId === officialTenureId && (day === undefined || job.day === day) &&
    (caseId === undefined || job.id === caseId) && (job.status === 'signed' || allowPending && job.status === 'draft')) || null;
  const resolvePromotionActor = id => id === LU && lu ? {actorId: id, bodyId: lu.bodyId, alive: lu.alive,
    position: lu.root.position.toArray(), busy: !flags.meeting || lu.walking || flags.socialHeld} : id === 'cn-emperor' ?
    {actorId: id, bodyId: 'cn-emperor-original-body', alive: true, position: [-15.1, .215, -13.35]} : null;
  const careerOptions = {worldSeed: goodSeed, enablePersonnelProgression: personnel, readPersonnelWork, resolvePromotionActor, getClock: () => clock,
    saveState: state => {
      careerWrites++; flags.captureCareerSave?.(copy(state));
      if (flags.careerSave === 'throw') throw Error('simulated-career-save-failure');
      if (flags.careerSave === 'promise') return Promise.resolve(true);
      if (flags.careerSave === false) return false;
      savedCareer = copy(state); return true;
    }, creditWageToBank: payment => {if (!flags.bank) return {ok: false}; bank.push(copy(payment)); return {ok: true};}};
  let careers = createFormalCareers(careerOptions);
  const skilled = careers.state(); skilled.skills.ritual = 2; skilled.skills.writing = personnel ? 3 : 2;
  careers = createFormalCareers({...careerOptions, saved: skilled});
  assert(careers.apply(ROLE, {ageYears: 22}).ok); approvePending(careers);
  if (qualified) {
    for (let day = 1; day <= 3; day++) {
      Object.assign(clock, {day, hour: 10}); careers.observeDay(); assert(careers.beginDuty().ok);
      clock.hour = 11.5; assert(careers.dutyEvent('court-start').ok); clock.hour = 12;
      assert(careers.dutyEvent('court-completed').ok); assert(careers.dutyEvent('archive-completed').ok); assert(careers.settle().ok);
    }
    assert(careers.applyPromotion().ok); const id = careers.promotionSummary().application.id;
    assert(careers.reviewPromotion({applicationId: id}).ok);
    assert(careers.reviewPromotion({applicationId: id, step: 'receive-document'}).ok);
    assert(careers.reviewPromotion({applicationId: id, step: 'appointment'}).ok);
  }
  Object.assign(clock, {day: 4, hour: personnel ? 10 : 14}); careers.observeDay();
  const authors = OFFICIALS.map(row => {const root = new T.Group(); root.position.set(...row.office); return {root, actorId: row.actorId, bodyId: row.actorId + '-original-body', station: {id: row.actorId, npcName: row.name}, alive: true, walking: false};});
  lu = authors.find(actor => actor.actorId === LU);
  const ledger = createChinaPersonnelRecords({resolveActor: id => {const actor = authors.find(row => row.actorId === id); return actor && {actorId: id, alive: actor.alive, position: actor.root.position.toArray()};}, saveState: state => { storedSource = copy(state); return true; }});
  function court(day = clock.day) { return ledger.witnessCourt({id: `cn-morning-audience:${day}`, day, actorIds: OFFICIALS.map(row => row.actorId)}); }
  function archive(i, day = clock.day) { const actor = authors[i]; return ledger.witnessArchive({id: `cn-official-archive:${actor.actorId}:${day}`, actorId: actor.actorId, day, audienceId: `cn-morning-audience:${day}`, position: [...OFFICIALS[i].office], elapsed: 8, duration: 8}); }
  if (initialSource) { assert(court().ok); assert(archive(0).ok); assert(archive(3).ok); }
  const player = {root: new T.Group(), bodyId: 'player-original-body', actorId: 'player', ageYears: 22, alive: true, walking: false};
  player.root.userData.hands = [new T.Group(), new T.Group()]; player.root.add(...player.root.userData.hands);
  const home = new T.Group(), paper = new T.Group(); home.add(paper); paper.position.set(21.03, 1.235, 31.47);
  const writes = [], panels = [], notices = [], travels = [], saveChecks = [];
  let reserveCalls = 0, releaseCalls = 0, reenter = false;
  const options = {careers, audience: {personnelSource: (day, serial) => ledger.sourceFor(day, serial), meetingAvailable: () => flags.meeting},
    enabled, getPlayer: () => player, getClock: () => clock, standing: () => flags.standing,
    getBusy: () => flags.busy, canSee: () => flags.visible, getLu: () => lu, isLuBusy: () => flags.socialHeld, documentObject: paper,
    getReadingPoint: id => flags.blockedRead ? null : CHINA_PERSONNEL_READ_PLACES.find(row => row.actorId === id).position,
    getMeetingPoint: (_actor, fallback) => flags.reception ? fallback : null,
    requestMeeting: () => { reserveCalls++; if (!flags.meeting || flags.socialHeld) return false; flags.held = true; return true; },
    meetingHeld: actor => flags.held && actor === lu,
    releaseMeeting: () => { releaseCalls++; flags.held = false; },
    resumeApproach: next => { travels.push(next); return true; }, onWaiting: () => {},
    notify: text => notices.push(text), openPersonnel: context => panels.push(context),
    saveState: candidate => {
      lastCandidate = copy(candidate); writes.push(copy(candidate));
      if (service) {
        saveChecks.push(equalSnapshot(candidate, service.snapshot()));
        const candidateJob = candidate.work.cases.at(-1);
        if (candidateJob && candidateJob.status !== 'abandoned') {
          const committed = service.personnelWorkState().cases.find(row => row.id === candidateJob.id) || null;
          saveChecks.push(equalSnapshot(committed, readPersonnelWork({mode: candidateJob.mode, officialTenureId: candidateJob.officialTenureId, day: candidateJob.day, allowPending: true})));
          if (candidateJob.mode === 'duty' && candidateJob.status === 'signed' && committed?.status === 'draft') saveChecks.push(careers.archiveAvailability().ok === false);
        }
        if (reenter) { const before = service.snapshot(); service.update(100); saveChecks.push(equalSnapshot(before, service.snapshot())); saveChecks.push(service.restore(before) === false); }
      }
      if (flags.save === 'throw') throw Error('simulated-save-failure');
      if (flags.save === 'promise') return Promise.resolve(true);
      if (flags.save === false) return false;
      durable = copy(candidate); return true;
    },
  };
  function equalSnapshot(a, b) {return JSON.stringify(a) === JSON.stringify(b);}
  function load(saved) { if (service) service.dispose({suspend: true}); service = createChinaPersonnelCareer({...options, ...(saved === undefined ? {} : {saved})}); return service; }
  load();
  const f = {clock, bank, flags, authors, ledger, paper, home, player, writes, panels, notices, travels, options, court, archive, readPersonnelWork, resolvePromotionActor,
    get careers() {return careers;}, get careerWrites() {return careerWrites;},
    reloadCareers(saved = savedCareer) {careers = createFormalCareers({...careerOptions, saved}); options.careers = careers; return careers;},
    get service() {return service;}, get durable() {return copy(durable);}, get lastCandidate() {return copy(lastCandidate);}, get source() {return copy(storedSource);}, get saveChecks() {return [...saveChecks];},
    get reserveCalls() {return reserveCalls;}, get releaseCalls() {return releaseCalls;}, get lu() {return lu;}, replaceLu(next) {lu = next;}, reenter(value = true) {reenter = value;}, load,
    savedCareer: () => copy(savedCareer),
  };
  f.tick = (seconds, dt = .1) => {for (let i = 0; i < Math.round(seconds / dt); i++) service.update(dt);};
  f.at = selected => {assert(selected); player.root.position.set(...selected.position); player.walking = false;};
  f.execute = kind => {const selected = service.intent(kind); assert(selected, kind); f.at(selected); assert(service.executeIntent(selected), kind); return selected;};
  f.claim = () => f.execute('personnel-claim');
  f.read = i => {f.execute('personnel-read:' + OFFICIALS[i].actorId); f.tick(3); assert(service.state().case.rows[i].visit);};
  f.answer = (i, value) => f.execute(`personnel-record:${OFFICIALS[i].actorId}:${value}`);
  f.fill = (wrong = false) => {for (let i = 0; i < 6; i++) {f.read(i); f.answer(i, i === 0 || i === 3 || wrong && i === 1 ? 'accepted' : 'awaiting');}};
  f.compile = () => {f.execute('personnel-compile'); f.tick(8); assert(service.state().case.compiled);};
  f.review = () => {const selected = service.intent('personnel-review'); assert(selected); assert(service.prepareIntent(selected)); assert(!service.isWaiting()); f.at(service.intent('personnel-review')); assert(service.executeIntent(service.intent('personnel-review'))); f.tick(4);};
  // Promotion itself is deliberately staged through the real formal core;
  // this fixture targets the daily adapter, not the separate royal controller.
  f.promotePersonnel = () => {
    assert(personnel); let trial;
    for (let day = 4; day <= 7; day++) {
      Object.assign(clock, {day, hour: 10}); assert(careers.observeDay().ok); assert(careers.beginDuty().ok);
      clock.hour = 11.5; assert(careers.dutyEvent('court-start').ok); clock.hour = 12;
      assert(careers.dutyEvent('court-completed').ok); assert(careers.dutyEvent('archive-completed').ok); assert(careers.settle().ok);
      if (day === 4) {f.claim(); f.fill(); f.compile(); f.review(); trial = copy(service.state().case);}
    }
    Object.assign(clock, {day: 7, hour: 14}); assert(careers.observeDay().ok);
    assert(careers.applyPromotion().ok, JSON.stringify(careers.promotionSummary()));
    const id = careers.promotionSummary().application.id;
    for (const step of ['interview', 'receive-document', 'imperial-review', 'appointment']) {
      const actorStep = ['interview', 'imperial-review'].includes(step), recipient = resolvePromotionActor(step === 'interview' ? LU : 'cn-emperor');
      const duration = actorStep ? 4 : step === 'appointment' ? 3 : 0;
      clock.seconds += duration;
      const proof = {applicationId: id, documentId: `appointment:${id}`, actorId: 'player',
        targetId: actorStep ? recipient.actorId : 'cn-court-career-desk',
        position: step === 'imperial-review' ? [-15.1, .145, -14.45] : actorStep ? [recipient.position[0] + .78, recipient.position[1], recipient.position[2]] : step === 'appointment' ? [20.55, .215, 32.25] : [21.5, .215, 32.25],
        standing: true, clear: true, elapsed: duration, duration, day: clock.day, completedAt: clock.seconds,
        ...(actorStep ? {recipientPosition: recipient.position, recipientBodyId: recipient.bodyId, recipientAlive: true} : {})};
      const result = careers.reviewPromotion({applicationId: id, step, proof}); assert(result.ok, step + ': ' + JSON.stringify(result));
    }
    assert.equal(careers.currentRole().rankId, 'cn-records-personnel'); return trial;
  };
  f.beginPersonnelDay = (day = clock.day + 1, {finishCourt = true} = {}) => {
    Object.assign(clock, {day, hour: 10}); assert(careers.observeDay().ok); assert(careers.beginDuty().ok);
    if (!finishCourt) return;
    clock.hour = 11.5; assert(careers.dutyEvent('court-start').ok); clock.hour = 12;
    assert(careers.dutyEvent('court-completed').ok); assert(court().ok); assert(archive(0).ok); assert(archive(3).ok);
  };
  return f;
}

// Feature gating and opening a panel can never appoint/claim/answer implicitly.
{
  const f = fixture({enabled: false}); assert.equal(f.service.intent('personnel-view'), null); assert.equal(f.paper.visible, false); assert.equal(f.writes.length, 0);
  const junior = fixture({qualified: false}); assert.equal(junior.service.state().eligible, false); assert.equal(junior.service.intent('personnel-claim'), null);
  assert.equal(junior.service.intent('personnel-view'), null); assert.equal(junior.service.state().case, null); assert.equal(junior.writes.length, 0);
  const missing = fixture({initialSource: false}); assert.equal(missing.service.intent('personnel-claim'), null); assert.equal(missing.service.state().availability.code, 'source-unavailable');
}

// Main's continuity wrapper chooses its actual checkpoint without resetting
// malformed persisted top state or importing an older journal during restore.
{
  const f = fixture(); f.load({continuity: null}); assert.equal(f.service.state().loadError, null); f.claim();
  const claimed = f.service.snapshot(); f.load({...claimed, activity: null, continuity: claimed}); assert.equal(f.service.state().loadError, null);
  assert.equal(f.service.state().case.id, claimed.work.currentId); assert.equal(f.service.restore({version: 1, work: {version: 1, currentId: null, cases: []}, activity: null}), false);
  const malformed = {version: 17, work: null, continuity: null}; f.load(malformed); assert.equal(f.service.state().loadError, 'invalid-saved-state');
  assert.deepEqual(f.service.snapshot(), {version: 17, work: null}); assert.equal(f.service.intent('personnel-claim'), null);
}

// All six original anchors, explicit answers, frozen absent-original boundary,
// correction revision, compilation, original-body review, exactly one trial.
{
  const f = fixture(), formalBefore = f.careers.state(), moneyBefore = copy(f.bank), identities = f.authors.map(actor => actor.root);
  f.execute('personnel-view'); assert.equal(f.writes.length, 0); f.claim();
  assert.equal(f.paper.parent, f.home); assert.equal(f.paper.visible, true);
  for (let i = 0; i < 6; i++) {
    const kind = 'personnel-read:' + OFFICIALS[i].actorId, selected = f.service.intent(kind);
    assert(selected); assert.notDeepEqual(selected.position, OFFICIALS[i].office); assert.equal(selected.position[1], OFFICIALS[i].office[1]);
    assert.equal(f.service.sourcePanel(OFFICIALS[i].actorId), null);
    assert.equal(f.service.intent(`personnel-record:${OFFICIALS[i].actorId}:accepted`), null);
    f.player.root.position.set(...OFFICIALS[i].office); assert.equal(f.service.executeIntent(selected), false, 'NPC centre is not the legal sidepoint');
    f.at(selected); assert(f.service.executeIntent(selected)); f.tick(2.9); assert.equal(f.service.state().case.rows[i].visit, null);
    f.tick(.1); assert(f.service.state().case.rows[i].visit); assert.equal(f.service.state().case.rows[i].archiveStatus, null);
    assert.equal(f.service.sourcePanel(OFFICIALS[i].actorId).choices.length, 2);
    f.answer(i, i === 0 || i === 1 || i === 3 ? 'accepted' : 'awaiting');
  }
  const boundary = f.service.state().case.source.throughSerial;
  assert(f.archive(1).ok); assert.equal(f.service.state().case.source.throughSerial, boundary); assert.equal(f.service.sourcePanel(OFFICIALS[1].actorId).original, null);
  f.compile(); f.review(); assert.equal(f.service.state().case.status, 'draft');
  assert.deepEqual(f.service.state().case.reviews.at(-1).rejectedRows, [{actorId: OFFICIALS[1].actorId, code: 'archive-without-original'}]);
  assert.equal(f.service.intent('personnel-review'), null, 'Same rejected revision does not create busywork');
  const stale = f.service.intent(`personnel-record:${OFFICIALS[1].actorId}:accepted`);
  f.answer(1, 'awaiting'); assert.equal(f.service.resolveIntent(stale), null); assert.equal(f.service.state().case.compiled, null);
  f.compile(); const selected = f.service.intent('personnel-review'); assert(f.service.prepareIntent(selected));
  assert.equal(f.paper.parent, f.player.root.userData.hands[1]); f.at(selected); assert(f.service.executeIntent(selected));
  f.tick(3.9); assert.equal(f.service.state().case.receipt, null); f.tick(.1);
  const signed = f.service.state().case; assert.equal(signed.status, 'signed'); assert.equal(signed.receipt.signerBodyId, f.lu.bodyId);
  assert.equal(signed.receipt.rows.length, 6); assert.equal(f.paper.parent, f.home); assert.equal(f.paper.visible, false); assert.equal(f.flags.held, false);
  assert.deepEqual(f.careers.state(), formalBefore); assert.deepEqual(f.bank, moneyBefore); assert.deepEqual(f.authors.map(actor => actor.root), identities);
  assert.equal(f.service.intent('personnel-claim'), null); f.clock.day++; assert(f.court().ok); assert.equal(f.service.intent('personnel-claim'), null);
  const writes = f.writes.length; f.load(f.durable); assert.equal(f.service.state().loadError, null); assert.equal(f.service.isActing(), false);
  assert.deepEqual(f.service.state().case.receipt, signed.receipt); assert.equal(f.writes.length, writes); assert(f.saveChecks.every(Boolean));
}

// Real stationary elapsed only: frame cap, moving/hidden/blocked/busy posture,
// changed body, changed appointment, missing legal source stand point.
for (const failure of ['walking', 'invisible', 'blocked', 'busy', 'seated', 'offsite', 'dead', 'replaced']) {
  const f = fixture(); f.claim(); f.execute('personnel-read:' + OFFICIALS[0].actorId); f.tick(1);
  if (failure === 'walking') f.player.walking = true;
  if (failure === 'invisible') f.player.root.visible = false;
  if (failure === 'blocked') f.flags.visible = false;
  if (failure === 'busy') f.flags.busy = true;
  if (failure === 'seated') f.flags.standing = false;
  if (failure === 'offsite') f.player.root.position.x += 1;
  if (failure === 'dead') f.player.alive = false;
  if (failure === 'replaced') f.player.bodyId = 'different-player-body';
  f.tick(3); assert.equal(f.service.state().case.rows[0].visit, null, failure); assert.equal(f.service.isActing(), false, failure);
}
{
  const f = fixture(); f.claim(); f.flags.blockedRead = true; assert.equal(f.service.intent('personnel-read:' + OFFICIALS[0].actorId), null);
  f.flags.blockedRead = false; f.execute('personnel-read:' + OFFICIALS[0].actorId); f.service.update(9999); assert.equal(f.service.snapshot().activity.progress, .1);
  f.tick(1.2); const before = f.service.snapshot(); f.clock.seconds += 100000; f.load(before); assert.equal(f.service.state().loadError, null);
  assert.equal(f.service.snapshot().activity.progress, before.activity.progress); f.tick(1.6); assert.equal(f.service.state().case.rows[0].visit, null); f.tick(.1); assert(f.service.state().case.rows[0].visit);
  f.execute('personnel-read:' + OFFICIALS[1].actorId); f.tick(.5); assert(f.careers.resign().ok); f.tick(3); assert.equal(f.service.isActing(), false); assert.equal(f.service.state().case.rows[1].visit, null);
}

// Failed physical completion retains ONE frozen proof, retries only once per
// elapsed second, survives cold save, and mirrors candidate journal atomically.
for (const failure of [false, 'throw', 'promise']) {
  const f = fixture(); f.claim(); f.reenter(); f.flags.save = failure;
  f.execute('personnel-read:' + OFFICIALS[0].actorId); f.tick(3);
  assert.equal(f.service.state().case.rows[0].visit, null); const pending = f.service.snapshot(), writes = f.writes.length;
  assert.equal(pending.activity.proof.elapsed, 3); f.tick(.9); assert.equal(f.writes.length, writes);
  f.load(pending); assert.equal(f.service.state().loadError, null); assert.deepEqual(f.service.snapshot().activity.proof, pending.activity.proof);
  f.flags.save = true; f.tick(1); assert(f.service.state().case.rows[0].visit);
  const {id, ...proof} = f.service.state().case.rows[0].visit; assert.deepEqual(proof, pending.activity.proof);
  const coreBefore = copy(f.service.snapshot().work), successfulWrites = f.writes.length;
  f.load(f.durable); assert.equal(f.service.isActing(), false); assert.deepEqual(f.service.snapshot().work, coreBefore); assert.equal(f.writes.length, successfulWrites);
  assert(f.saveChecks.every(Boolean));
}

// The same completed-proof save fence also applies to compilation and Lu's
// signature, including a cold reload after a rejected physical save.
for (const phase of ['compile', 'review']) {
  const f = fixture(); f.claim(); f.fill();
  if (phase === 'review') f.compile();
  const selected = f.service.intent('personnel-' + phase);
  if (phase === 'review') assert(f.service.prepareIntent(selected));
  f.at(selected); f.flags.save = false; assert(f.service.executeIntent(selected)); f.tick(phase === 'compile' ? 8 : 4);
  const pending = f.service.snapshot(); assert(pending.activity.proof); assert.equal(phase === 'compile' ? f.service.state().case.compiled : f.service.state().case.receipt, null);
  f.load(pending); f.flags.save = true;
  if (phase === 'review') {f.tick(.1); const resumed = f.service.intent('personnel-review'); f.at(resumed); assert(f.service.executeIntent(resumed));}
  f.tick(1); const job = f.service.state().case, completed = phase === 'compile' ? job.compiled.proof : job.reviews.at(-1).proof;
  const {id, ...proof} = completed; assert.deepEqual(proof, pending.activity.proof);
}
{
  const f = fixture(); f.claim(); f.execute('personnel-read:' + OFFICIALS[0].actorId); f.tick(.7);
  const oldActivity = f.service.snapshot(); assert(f.careers.resign().ok); f.load(oldActivity);
  assert.equal(f.service.state().loadError, null); assert.equal(f.service.isActing(), false); assert.equal(f.service.state().case.status, 'draft');
  assert.equal(f.service.state().case.rows[0].visit, null);
}

// Existing actor leases remain theirs while waiting. Explicit cancel/movement
// releases only this booking; partial same-body review can reload and resume.
{
  const f = fixture(); f.claim(); f.fill(); f.compile(); f.flags.meeting = false;
  f.lu.root.visible = false; const selected = f.service.intent('personnel-review'); assert(f.service.prepareIntent(selected)); assert(f.service.isWaiting());
  const calls = f.reserveCalls; f.tick(3); assert.equal(f.reserveCalls, calls); assert.equal(f.flags.held, false); assert.equal(f.travels.length, 0);
  const caseBefore = copy(f.service.snapshot().work); const cancel = f.service.intent('personnel-cancel'); assert(cancel); assert(f.service.executeIntent(cancel));
  assert.equal(f.service.isWaiting(), false); assert.deepEqual(f.service.snapshot().work, caseBefore); assert.equal(f.paper.parent, f.home);
  assert(f.service.prepareIntent(f.service.intent('personnel-review'))); f.player.root.position.x += 1; f.tick(.1); assert.equal(f.service.isWaiting(), false);
  assert(f.service.prepareIntent(f.service.intent('personnel-review'))); f.lu.root.visible = true; f.flags.meeting = true; f.tick(.1); assert.equal(f.travels.length, 1); assert.equal(f.flags.held, true);
  f.at(f.service.intent('personnel-review')); assert(f.service.executeIntent(f.service.intent('personnel-review'))); f.tick(1.5);
  const partial = f.service.snapshot(); f.flags.meeting = false; f.load(partial); assert(f.service.isWaiting()); assert(Math.abs(f.service.snapshot().activity.progress - 1.5) < 1e-8);
  f.tick(2); assert(Math.abs(f.service.snapshot().activity.progress - 1.5) < 1e-8); f.flags.meeting = true; f.tick(1); f.at(f.service.intent('personnel-review')); assert(f.service.executeIntent(f.service.intent('personnel-review')));
  f.tick(2.4); assert.equal(f.service.state().case.receipt, null); f.tick(.1); assert(f.service.state().case.receipt);
}
for (const failure of ['replacement', 'moving', 'dead', 'invisible', 'lost-lease', 'offsite', 'window']) {
  const f = fixture(); f.claim(); f.fill(); f.compile(); const selected = f.service.intent('personnel-review'); assert(f.service.prepareIntent(selected)); f.at(selected); assert(f.service.executeIntent(selected)); f.tick(1);
  if (failure === 'replacement') {const root = new T.Group(); root.position.copy(f.lu.root.position); f.replaceLu({...f.lu, root});}
  if (failure === 'moving') f.lu.walking = true;
  if (failure === 'dead') f.lu.alive = false;
  if (failure === 'invisible') f.lu.root.visible = false;
  if (failure === 'lost-lease') f.flags.held = false;
  if (failure === 'offsite') f.lu.root.position.x += 3;
  if (failure === 'window') f.flags.busy = true;
  f.tick(4); assert.equal(f.service.state().case.receipt, null, failure); assert.equal(f.service.isActing(), false, failure);
  assert.equal(f.paper.parent, f.home); assert.equal(f.flags.held, false);
}
{
  const f = fixture(); f.claim(); f.execute('personnel-read:' + OFFICIALS[0].actorId); f.tick(1);
  f.flags.save = false; assert.equal(f.service.stopActivity(), false); assert.equal(f.service.isActing(), false); assert.equal(f.service.snapshot().activity, null); assert(f.service.state().case);
  f.service.dispose(); assert.equal(f.paper.parent, f.home); assert.equal(f.paper.visible, false);
}
// The next rank uses the SAME real clerk appointment and personal court day.
// Public officials' source records, opening a panel and walking cannot claim a
// private duty. Signing a roster alone cannot pay or grant XP before own archive.
{
  const f = fixture({personnel: true}), originalTenure = copy(f.careers.workState().tenure), trial = f.promotePersonnel();
  assert.deepEqual(f.careers.workState().tenure, originalTenure); assert.equal(f.service.state().mode, 'duty');
  f.load(f.service.snapshot()); assert.equal(f.service.state().loadError, null); assert.deepEqual(f.service.state().history[0], trial);
  assert.equal(f.service.intent('personnel-claim'), null, 'Paid regular duty cannot turn into a new rank shift');
  f.beginPersonnelDay(8, {finishCourt: false}); assert.equal(f.service.intent('personnel-claim'), null);
  assert(f.court().ok); assert(f.archive(0).ok); assert(f.archive(3).ok);
  assert.equal(f.service.intent('personnel-claim'), null, 'Global public court evidence does not prove personal attendance');
  f.clock.hour = 11.5; assert(f.careers.dutyEvent('court-start').ok); assert.equal(f.service.intent('personnel-claim'), null);
  f.clock.hour = 12; assert(f.careers.dutyEvent('court-completed').ok);
  const before = f.careers.state(), bankBefore = copy(f.bank), writes = f.writes.length;
  f.execute('personnel-view'); assert.equal(f.writes.length, writes); assert.equal(f.service.state().history.length, 1);
  assert.equal(f.service.state().availability.sourceDay, 8); f.claim(); assert.equal(f.service.state().case.mode, 'duty');
  assert.equal(f.careers.archiveAvailability().ok, false); f.fill(); f.compile(); assert.equal(f.careers.archiveAvailability().ok, false);
  f.flags.save = false; f.review(); assert.equal(f.service.state().case.status, 'draft');
  assert(f.service.snapshot().activity.proof); assert.equal(f.careers.archiveAvailability().ok, false);
  f.flags.save = true; f.tick(1); const signed = f.service.state().case;
  assert.equal(signed.day, 8); assert.equal(signed.receipt.mode, 'duty'); assert(f.careers.archiveAvailability().ok);
  assert.deepEqual(f.careers.state(), before); assert.deepEqual(f.bank, bankBefore); assert(f.saveChecks.every(Boolean));
  assert.equal(f.service.intent('personnel-claim'), null); assert.deepEqual(f.service.state().history[0], trial);
  const archiveOptions = () => ({careers: f.careers, audience: {state: () => ({phase: 'idle'})}, getPlayer: () => f.player, getClock: () => f.clock});
  let ownArchive = createChinaCourtCareer(archiveOptions()), acceptedRuntime = null;
  f.flags.captureCareerSave = state => {
    if (f.flags.careerSave === true && state.lastDuty?.stage === 'ready') acceptedRuntime = copy(ownArchive.snapshot());
  };
  const selected = ownArchive.intent('archive'); assert(selected); f.at(selected); assert(ownArchive.executeIntent(selected));
  for (let i = 0; i < 79; i++) ownArchive.update(.1);
  assert.equal(f.careers.workState().lastDuty.stage, 'archive'); assert.deepEqual(f.bank, bankBefore);
  f.flags.careerSave = false; ownArchive.update(.1);
  assert.equal(f.careers.workState().lastDuty.stage, 'archive'); assert(Math.abs(ownArchive.snapshot().progress - 8) < 1e-8); assert(ownArchive.isActing());
  const unfinishedArchive = ownArchive.snapshot(), attempts = f.careerWrites;
  f.clock.seconds = unfinishedArchive.nextArchiveAttemptAt - .1; ownArchive.update(.1); assert.equal(f.careerWrites, attempts);
  ownArchive.dispose({suspend: true}); ownArchive = createChinaCourtCareer(archiveOptions()); assert(ownArchive.restore(unfinishedArchive));
  assert.equal(ownArchive.snapshot().progress, unfinishedArchive.progress, 'Cold failed-save recovery keeps completed 8 seconds');
  f.flags.careerSave = true; f.flags.bank = false; f.clock.seconds = unfinishedArchive.nextArchiveAttemptAt; ownArchive.update(.1);
  assert.equal(f.careers.workState().lastDuty.stage, 'ready'); assert.deepEqual(f.bank, bankBefore); assert.equal(acceptedRuntime.activity, 'archive'); assert(Math.abs(acceptedRuntime.progress - 8) < 1e-8);
  assert.equal(f.careers.state().lastDuty.personnelWork.id, signed.id); ownArchive.dispose({suspend: true});
  const rosterRuntime = f.service.snapshot(); f.reloadCareers(); assert.equal(f.careers.state().loadError, null); f.load(rosterRuntime);
  ownArchive = createChinaCourtCareer(archiveOptions()); assert(ownArchive.restore(acceptedRuntime));
  assert.equal(ownArchive.isActing(), false, 'An accepted root completion clears its captured finishing animation');
  f.flags.bank = true; ownArchive.update(.1); assert.equal(f.careers.workState().lastDuty.stage, 'paid'); assert.equal(f.bank.at(-1).amount, 28);
  const paidCount = f.bank.length; assert(ownArchive.restore(acceptedRuntime)); ownArchive.update(.1); assert.equal(f.bank.length, paidCount);
  assert.equal(ownArchive.isActing(), false); ownArchive.dispose(); f.flags.captureCareerSave = null;
  // The old trial and signed day restore after later genuine daily work replaces
  // lastDuty, with ownership rooted in the official personal service ledger.
  f.beginPersonnelDay(9); f.claim(); const after = f.service.snapshot();
  f.reloadCareers(); assert.equal(f.careers.state().loadError, null); f.load(after); assert.equal(f.service.state().loadError, null);
  assert.deepEqual(f.service.state().history[0], trial); assert.deepEqual(f.service.state().history[1], signed);
}

// A compiled personal duty queued because the original Lu is busy freezes one
// source-day contract. Cancel/reload/rollover never switches to the new day or
// releases the formal old-day obligation; the actual review still takes 4 sec.
{
  const f = fixture({personnel: true}); f.promotePersonnel(); f.beginPersonnelDay(); f.claim(); f.fill(); f.compile();
  const original = copy(f.service.state().case), bank = copy(f.bank);
  f.flags.meeting = false; const selected = f.service.intent('personnel-review'); assert(f.service.prepareIntent(selected));
  const marker = copy(f.careers.workState().lastDuty.personnelDeferral); assert.equal(marker.caseId, original.id); assert.deepEqual(marker.job, original);
  assert(f.service.state().waiting.deferred); f.execute('personnel-cancel');
  assert.equal(f.service.isWaiting(), false); assert.deepEqual(f.service.state().case, original); assert.deepEqual(f.careers.workState().lastDuty.personnelDeferral, marker);
  assert(f.service.prepareIntent(f.service.intent('personnel-review'))); const sameIntent = f.service.intent('personnel-review');
  Object.assign(f.clock, {day: 9, hour: 10}); assert(f.careers.observeDay().ok);
  assert.equal(f.careers.beginDutyAvailability(ROLE).code, 'personnel-review-pending'); assert.equal(f.careers.workState().lastDuty.day, 8);
  assert.deepEqual(f.service.resolveIntent(sameIntent), sameIntent); assert.equal(f.service.intent('personnel-claim'), null);
  assert(f.court().ok); assert(f.archive(1).ok); assert.deepEqual(f.service.state().case.source, original.source);
  const runtime = f.service.snapshot(); f.reloadCareers(); assert.equal(f.careers.state().loadError, null); f.load(runtime);
  assert.equal(f.service.state().loadError, null); assert(f.service.isWaiting()); assert.deepEqual(f.service.state().case, original);
  f.flags.meeting = true; f.tick(.1); assert.equal(f.travels.at(-1).intentKey, sameIntent.intentKey);
  f.at(f.service.intent('personnel-review')); assert(f.service.executeIntent(f.service.intent('personnel-review')));
  f.tick(3.9); assert.equal(f.service.state().case.receipt, null); f.tick(.1);
  const signed = f.service.state().case; assert.equal(signed.receipt.sourceDay, 8); assert.deepEqual(signed.source, original.source);
  assert(f.careers.archiveAvailability().ok); assert.deepEqual(f.bank, bank);
  const archive = createChinaCourtCareer({careers: f.careers, audience: {state: () => ({phase: 'idle'})}, getPlayer: () => f.player, getClock: () => f.clock});
  const action = archive.intent('archive'); assert(action, 'The original own archive remains reachable across the deferred day'); f.at(action); assert(archive.executeIntent(action));
  for (let i = 0; i < 80; i++) archive.update(.1);
  assert.equal(f.careers.workState().lastDuty.stage, 'paid'); assert.equal(f.careers.workState().lastDuty.day, 8); assert.equal(f.bank.at(-1).day, 8);
  assert.equal(f.bank.length, bank.length + 1); archive.dispose();
  assert.equal(f.service.intent('personnel-claim'), null, 'Public new day alone does not create a personal shift');
}

// Failed formal deferral persistence keeps the exact live queue and draft. It
// retries at most once/elapsed second, never claims a marker before acceptance,
// and cannot be obtained from a missing stand point with an actually idle Lu.
for (const failure of [false, 'throw', 'promise']) {
  const f = fixture({personnel: true}); f.promotePersonnel(); f.beginPersonnelDay(); f.claim(); f.fill(); f.compile();
  const original = copy(f.service.state().case); f.flags.meeting = false; f.flags.careerSave = failure;
  assert(f.service.prepareIntent(f.service.intent('personnel-review'))); assert(f.service.isWaiting());
  assert.equal(f.careers.workState().lastDuty.personnelDeferral, null); assert(f.service.state().waiting.savePending);
  const writes = f.careerWrites; f.tick(.9); assert.equal(f.careerWrites, writes); f.tick(.1); assert.equal(f.careerWrites, writes + 1);
  assert.deepEqual(f.service.state().case, original); assert(f.notices.some(text => text.includes('跨日等候凭据尚未保存')));
  const pending = f.service.snapshot(); f.load(pending); assert.equal(f.service.state().loadError, null); assert(f.service.isWaiting());
  f.flags.careerSave = true; f.tick(.1); assert.equal(f.careers.workState().lastDuty.personnelDeferral.caseId, original.id);
  assert.equal(f.service.state().waiting.savePending, false); assert.deepEqual(f.service.state().case, original);
}
{
  const f = fixture({personnel: true}); f.promotePersonnel(); f.beginPersonnelDay(); f.claim(); f.fill(); f.compile();
  f.flags.reception = false; assert(f.service.prepareIntent(f.service.intent('personnel-review'))); f.tick(2);
  assert(f.service.isWaiting()); assert.equal(f.careers.workState().lastDuty.personnelDeferral, null);
  f.execute('personnel-cancel'); f.flags.reception = true; f.flags.socialHeld = true;
  assert(f.service.prepareIntent(f.service.intent('personnel-review'))); const marker = copy(f.careers.workState().lastDuty.personnelDeferral);
  f.execute('personnel-cancel'); f.lu.bodyId = 'replacement-lu-body';
  assert.equal(f.service.intent('personnel-review'), null); assert.deepEqual(f.careers.workState().lastDuty.personnelDeferral, marker);
}

// A persisted explicit resignation also ends its reservation. The original rows
// remain in history, failed closing saves retry, and temporary disappearance or
// a disabled scene never silently abandons an unfinished case.
{
  const f = fixture({personnel: true}); f.promotePersonnel(); f.beginPersonnelDay(); f.claim(); f.read(0);
  const original = copy(f.service.state().case); f.lu.alive = false; f.tick(.1); assert.equal(f.service.state().case.status, 'draft'); f.lu.alive = true;
  assert(f.careers.resign().ok); f.flags.save = false; f.tick(.1); assert.equal(f.service.state().case.status, 'draft');
  const attempts = f.writes.length; f.tick(.9); assert.equal(f.writes.length, attempts);
  f.flags.save = true; f.tick(.1); assert.equal(f.service.state().case.status, 'abandoned');
  assert.deepEqual(f.service.state().case.rows, original.rows); assert.deepEqual(f.service.state().case.source, original.source);
  const runtime = f.service.snapshot(); f.reloadCareers(); assert.equal(f.careers.state().loadError, null); f.load(runtime);
  assert.equal(f.service.state().loadError, null); assert.equal(f.service.personnelWorkState().currentId, null); assert.equal(f.service.state().history.length, 2);
}
// A core-persisted missed prior day releases only that exact stale draft. A
// rejected/candidate formal save is not terminal evidence; a rejected journal
// close cannot clear it or let the next source be claimed prematurely.
{
  const f = fixture({personnel: true}); f.promotePersonnel(); f.beginPersonnelDay(); f.claim(); f.read(0);
  const old = copy(f.service.state().case); Object.assign(f.clock, {day: 9, hour: 10});
  const duringSave = [];
  f.flags.captureCareerSave = state => {
    if (state.lastDuty?.day === 8 && state.lastDuty.stage === 'missed') {
      f.tick(.1); duringSave.push(f.service.state().case.status);
    }
  };
  f.flags.careerSave = false; assert.equal(f.careers.observeDay().ok, false); f.tick(.1);
  assert.equal(f.service.state().case.status, 'draft'); assert.equal(f.careers.workState().lastDuty.stage, 'archive');
  f.flags.careerSave = true; assert(f.careers.observeDay().ok); assert.deepEqual(duringSave, ['draft', 'draft']); f.flags.captureCareerSave = null;
  f.flags.save = false; f.tick(.1); assert.equal(f.service.state().case.status, 'draft');
  // A later real shift can exist, but its new source stays unavailable until
  // the separate old-case closure itself has successfully saved.
  f.beginPersonnelDay(9); const careerBefore = f.careers.state(), bankBefore = copy(f.bank);
  assert.equal(f.service.intent('personnel-claim'), null); const pending = f.service.snapshot();
  f.reloadCareers(); f.load(pending); assert.equal(f.service.state().loadError, null); f.tick(.1);
  assert.equal(f.service.state().case.id, old.id); assert.equal(f.service.state().case.status, 'draft'); assert.equal(f.service.intent('personnel-claim'), null);
  const attempts = f.writes.length; f.tick(.9); assert.equal(f.writes.length, attempts);
  f.flags.save = true; f.tick(.1); assert.equal(f.service.state().case.status, 'abandoned');
  assert.deepEqual(f.service.state().case.rows, old.rows); assert.deepEqual(f.service.state().case.source, old.source);
  assert.deepEqual(f.careers.state(), careerBefore); assert.deepEqual(f.bank, bankBefore);
  f.claim(); assert.equal(f.service.state().case.day, 9); assert.notEqual(f.service.state().case.id, old.id);
  const actual = copy(f.service.state().case); f.tick(2); assert.deepEqual(f.service.state().case, actual);
  assert.equal(f.service.state().history.filter(row => row.id === old.id).length, 1); assert(f.saveChecks.every(Boolean));
}
console.log('PASS personnel daily adapter: personal-court gating, committed eligibility getter, original own 8s archive, old-rank history, exact deferred source day, save retry/cancel/reload, and resignation closure');

console.log('PASS stage-two personnel physical adapter: six original reads, manual answers, frozen correction, 8s compilation, actual-body 4s review, bounded persistence replay, same-tenure limit, cancellable shared meeting, reload progress and unchanged formal career/money/XP');

// Actual main's E/touch and panel-cancel dispatchers must stop the route as well
// as the adapter. Otherwise arrival can reacquire Lu and restart a cancelled
// review. This is a narrow source-function test, not a full main scene.
const {readFileSync}=await import('node:fs'),{default:vm}=await import('node:vm');
const mainSource=readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
const executeSource=mainSource.slice(mainSource.indexOf('function executeNearbyAction('),mainSource.indexOf('function startInteraction('));
const requestSource=mainSource.slice(mainSource.indexOf('function requestStationIntent('),mainSource.indexOf('function goToStation('));
for(const accepted of [true,false]){
 let stopped=0,held=true;const pending={provider:'china-personnel-career',kind:'personnel-review'};
 const shared={player:{},chinaPersonnelAppointment:null,interactionMenuOpen:()=>false,path:[{x:1,y:0,z:1}],targetStation:pending,pendingInteraction:pending,chinaPersonnelCareer:{isActing:()=>true,stopActivity:()=>{stopped++;held=false;return accepted;},executeIntent:()=>{stopped++;held=false;return accepted;}}};
 const physical={...shared,seated:null,roofShown:false,selected:{contextControl:true,intentKey:'work'},currentControl:()=>({intentKey:'work'}),activeDailyToilet:()=>null,chinaLabor:null};
 assert.equal(vm.runInNewContext(executeSource+';executeNearbyAction(selected)',physical),accepted);assert.equal(stopped,1);assert.equal(held,false);assert.equal(physical.path.length,0);assert.equal(physical.targetStation,null);assert.equal(physical.pendingInteraction,null);
 stopped=0;held=true;const direct={...shared,path:[{x:1,y:0,z:1}],selected:{provider:'china-personnel-career',kind:'personnel-cancel'},resolvePlayerIntent:value=>value};
 assert.equal(vm.runInNewContext(requestSource+';requestStationIntent(selected)',direct),accepted);assert.equal(stopped,1);assert.equal(held,false);assert.equal(direct.path.length,0);assert.equal(direct.targetStation,null);assert.equal(direct.pendingInteraction,null);
}
console.log('PASS actual main work-stop/panel-cancel clears personnel approach even when immediate cancellation save fails');
