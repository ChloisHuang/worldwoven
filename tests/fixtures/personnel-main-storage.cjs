// Deliberate boundaries for production-main storage/pay tests. Payroll branches
// explicitly stage original court/source and roster work through unchanged real
// cores. Only the original main route provides imperial/declaration evidence;
// the new personal eight-second archive and bank payout are never staged.
module.exports = async function stagePersonnelStorage({phase, prior, mod, linker, root, assert}) {
  const path = require('node:path'), clone = value => JSON.parse(JSON.stringify(value));
  const load = async name => {
    const module = mod(path.join(root, 'game', name));
    if (module.status === 'unlinked') await module.link(linker);
    if (module.status !== 'evaluated') await module.evaluate();
    return module.namespace;
  };
  const calendar = (day, hour) => ({version: 1, seconds: (day * 1440 + hour * 60 - 600) / .7});
  if (phase === 'duty-attend') {
    assert.equal(prior.formalCareers.officialCareer.applications.at(-1).status, 'approved');
    assert(prior.simulationClock.seconds <= calendar(8, 10).seconds, 'Next-day fixture must not move time backwards');
    prior.simulationClock = calendar(8, 10);
    return {save: prior, staging: 'Actual appointed checkpoint; only calendar advances to day8 10:00. Main must navigate to the original court and create the new contract itself.'};
  }
  if (['duty-unsigned', 'duty-payout'].includes(phase)) {
    const world = prior.worldContinuity.regions.china, oldDuty = clone(prior.formalCareers.lastDuty);
    const bankBefore = clone(prior.copperLedger), skillsBefore = clone(prior.formalCareers.skills), xpBefore = clone(prior.formalCareers.skillXP);
    assert.equal(oldDuty.day, 8); assert.equal(oldDuty.stage, 'arrived');
    assert.equal(oldDuty.officialPayContract.basePay, 26);
    const core = await load('formal-careers.js'), records = await load('china-personnel-records.js');
    const clock = {day: 8, hour: 14, seconds: calendar(8, 14).seconds};
    const careers = core.createFormalCareers({saved: prior.formalCareers, worldDuty: world.controllers.chinaCareer,
      worldSeed: prior.appearance.seed, enablePersonnelProgression: true, getClock: () => clock,
      saveState: value => {prior.formalCareers = clone(value); return true;}});
    assert.equal(careers.state().loadError, null);
    assert(careers.dutyEvent('court-start').ok); assert(careers.dutyEvent('court-completed').ok);
    assert.equal(careers.state().lastDuty.stage, 'archive');
    assert.deepEqual(careers.state().lastDuty.officialPayContract, oldDuty.officialPayContract);
    const audience = clone(world.controllers.chinaAudience), officials = records.CHINA_PERSONNEL_OFFICIALS_V1;
    const source = records.createChinaPersonnelRecords({saved: audience.personnelRecords, saveState: () => true,
      resolveActor: id => ({actorId: id, alive: true, position: officials.find(row => row.actorId === id).office})});
    assert.equal(source.loadError, null);
    assert(source.witnessCourt({id: 'cn-morning-audience:8', day: 8, actorIds: officials.map(row => row.actorId)}).ok);
    for (const i of [0, 2, 4]) {
      const row = officials[i];
      assert(source.witnessArchive({id: 'cn-official-archive:' + row.actorId + ':8', actorId: row.actorId,
        day: 8, audienceId: 'cn-morning-audience:8', position: [...row.office], elapsed: 8, duration: 8}).ok);
    }
    audience.personnelRecords = source.snapshot();
    audience.schedule = {...audience.schedule, day: 8, calledDay: 8, outcome: 'completed', lastCompletedDay: 8,
      calledAt: null, leadSeconds: null, exception: null, completionId: 'cn-morning-audience:8'};
    // The root audience uses the flat schedule schema; continuity wraps it.
    prior.chinaAudience = {...clone(prior.chinaAudience), ...clone(audience.schedule), personnelRecords: clone(audience.personnelRecords)};
    world.controllers.chinaAudience = audience;
    world.controllers.chinaCareer = {...world.controllers.chinaCareer, duty: careers.workState().lastDuty,
      activity: null, progress: 0, pending: false, waiting: null};
    world.activity = {target: null, pending: null, performing: null, actionTime: 0, studyTicket: null,
      destination: null, seated: null, seatedBerthId: null, bathTransition: null};
    prior.simulationClock = calendar(8, 14);
    const jobs = await load('china-personnel-work.js'), owner = oldDuty.officialTenureId;
    const oldRuntime = clone(world.controllers.chinaPersonnelCareer), history = oldRuntime.work.cases;
    const appointment = prior.formalCareers.officialCareer.applications.findLast(row => row.routeVersion === 2);
    const body = appointment.actors.recommenderBodyId, actor = world.actors['cn-official-personnel'];
    assert.equal(actor.id, 'cn-official-personnel'); assert(body); assert(Array.isArray(actor.position));
    const work = jobs.createChinaPersonnelWork({saved: oldRuntime.work,
      sourceFor: (day, serial) => source.sourceFor(day, serial),
      readAppointment: () => ({actorId: 'player', tenureId: owner, rankId: 'cn-records-personnel'}),
      validateEligibility: request => request.officialTenureId === owner && (request.mode === 'duty' && request.day === 8 ||
        request.phase === 'restore' && history.some(row => row.id === request.caseId && row.mode === 'trial' && row.status === 'signed')),
      resolveActor: id => id === 'cn-official-personnel' ? {actorId: id, bodyId: body, alive: true, position: [...actor.position]} : null,
      saveState: () => true});
    assert.equal(work.loadError, null);
    const wrongDate = work.claim({day: 9, mode: 'duty', officialTenureId: owner});
    assert.equal(wrongDate.ok, false); assert.equal(wrongDate.code, 'source-unavailable');
    assert(work.claim({day: 8, mode: 'duty', officialTenureId: owner}).ok);
    const id = work.current().id, proof = (kind, targetId, position, more = {}) => ({caseId: id, actorId: 'player', targetId,
      position: [...position], standing: true, clear: true, elapsed: {visit: 3, compile: 8, review: 4}[kind],
      duration: {visit: 3, compile: 8, review: 4}[kind], ...(kind === 'visit' ? {} : {revision: work.current().revision}), ...more});
    const incomplete = work.compile({caseId: id, proof: proof('compile', 'cn-court-career-desk', jobs.CHINA_PERSONNEL_COMPILE_POINT)});
    assert.equal(incomplete.ok, false); assert.equal(incomplete.code, 'roster-incomplete');
    assert.deepEqual(prior.copperLedger, bankBefore); assert.equal(prior.formalCareers.lastDuty.wage, null);
    for (const row of officials) {
      assert(work.visit({caseId: id, actorId: row.actorId, proof: proof('visit', row.actorId, row.office)}).ok);
      assert(work.record({caseId: id, actorId: row.actorId, archiveStatus: source.sourceFor(8).archives.some(item => item.actorId === row.actorId) ? 'accepted' : 'awaiting'}).ok);
    }
    assert(work.compile({caseId: id, proof: proof('compile', 'cn-court-career-desk', jobs.CHINA_PERSONNEL_COMPILE_POINT)}).ok);
    const reviewProof = proof('review', 'cn-official-personnel', [actor.position[0] + .6, actor.position[1], actor.position[2]],
      {recipientPosition: [...actor.position], recipientBodyId: body, recipientAlive: true});
    const wrongBody = work.review({caseId: id, proof: {...reviewProof, recipientBodyId: body + '-different'}});
    assert.equal(wrongBody.ok, false); assert.equal(wrongBody.code, 'reviewer-unavailable');
    assert.equal(work.current().status, 'draft'); assert.equal(work.current().receipt, null);
    if (phase === 'duty-payout') assert(work.review({caseId: id, proof: reviewProof}).ok);
    const runtime = {version: 1, work: work.snapshot(), activity: null};
    prior.chinaPersonnelCareer = clone(runtime); world.controllers.chinaPersonnelCareer = runtime;
    assert.deepEqual(prior.copperLedger, bankBefore); assert.deepEqual(prior.formalCareers.skills, skillsBefore); assert.deepEqual(prior.formalCareers.skillXP, xpBefore);
    assert.equal(prior.formalCareers.lastDuty.wage, null); assert.equal(prior.formalCareers.lastDuty.personnelArchiveProof, null);
    return {save: prior, source: source.sourceFor(8), evidence: {incompleteCompile: incomplete.code, wrongDateClaim: wrongDate.code,
      wrongBodyReview: wrongBody.code, noStagedWageOrXP: true, caseId: id, stagedRoster: phase === 'duty-payout' ? 'signed' : 'compiled-unsigned'},
      staging: 'Reuse actual day8 main attendance and frozen26+2 contract. Explicitly stage unchanged court-start/completed boundary, day8 14:00, original six-official court/mixed archive sources, six roster reads/answers and compilation' +
        (phase === 'duty-payout' ? ', plus Lu signature' : ' without Lu signature') +
        ' through real cores with the saved original Lu body/position. Shared full-six physical route evidence is reused; this branch does not replay or claim it. No personal archive proof or wage is staged.'};
  }
  if (!['legacy-ready', 'legacy-pending'].includes(phase)) throw Error('Unknown staging phase: ' + phase);
  const core = await load('formal-careers.js'), money = await load('currency-ledger.js');
  const rolls = await load('career-applications.js'), role = 'cn-court-clerk';
  const clock = {day: 1, hour: 8, seconds: calendar(1, 8).seconds};
  let seed = 1, refuseCleanup = false;
  while (seed < 100000 && !(rolls.careerInterviewRoll(seed, role, 1) < .565 && rolls.careerInterviewRoll(seed, role + ':promotion', 3) < .7)) seed++;
  assert(seed < 100000); prior.appearance.seed = seed;
  const bank = money.createGameCurrencyLedger({saved: prior, getClock: () => clock, storage: {setItem: () => true}});
  const initial = core.createFormalCareers({getClock: () => clock, saveState: () => true}).state();
  initial.skills.ritual = 2; initial.skills.writing = 3;
  const careers = core.createFormalCareers({saved: initial, worldSeed: seed, enablePersonnelProgression: true,
    getClock: () => clock, creditWageToBank: input => bank.creditWageToBank(input),
    saveState: value => {if (refuseCleanup && value.lastDuty?.stage === 'paid') return false; prior.formalCareers = clone(value); return true;}});
  assert(careers.apply(role, {ageYears: 22}).ok);
  for (const step of ['interview', 'receive-document', 'appointment']) assert(careers.reviewApplication(role, {ageYears: 22, applicationId: careers.applicationResult().id, step}).ok);
  const service = (day, hour, pay) => {
    Object.assign(clock, {day, hour, seconds: calendar(day, hour).seconds});
    assert(careers.observeDay().ok); assert(careers.beginDuty().ok);
    Object.assign(clock, {hour: 12, seconds: calendar(day, 12).seconds});
    assert(careers.dutyEvent('court-start').ok); assert(careers.dutyEvent('court-completed').ok); assert(careers.dutyEvent('archive-completed').ok);
    if (pay) assert(careers.settle().ok);
  };
  for (let day = 1; day <= 3; day++) service(day, 10, true);
  assert(careers.applyPromotion().ok);
  for (const step of ['interview', 'receive-document', 'appointment']) assert(careers.reviewPromotion({applicationId: careers.promotionSummary().application.id, step}).ok);
  service(4, 11.49, true); service(5, 11.49, false);
  assert.equal(careers.state().lastDuty.wage, 22);
  if (phase === 'legacy-pending') {
    refuseCleanup = true;
    const paid = careers.settle(); assert(paid.ok && paid.cleanupPending); assert.equal(paid.wage, 22);
    assert.equal(careers.state().lastDuty.stage, 'ready');
  }
  prior.simulationClock = calendar(8, 14);
  return {save: prior, staging: 'Narrow legacy fixture through actual career/bank cores: normal appointment, original regular promotion, day4 paid22 and day5 ready22, arrival11:29.4 yields no preparation bonus. ' +
    (phase === 'legacy-pending' ? 'Day5 bank receipt already committed; formal paid cleanup deliberately refused. ' : 'Day5 wage not yet deposited. ') +
    'Cold production main starts at explicitly staged day8; no personnel promotion/work or natural multi-day coverage claimed.'};
};
