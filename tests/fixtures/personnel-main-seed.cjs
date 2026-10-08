// Explicit test setup, not natural multi-day gameplay. Real career and source
// cores create an initial regular appointment with three genuine core-settled
// service days at that rank. No personnel trial or new promotion is pre-signed.
module.exports = async function personnelMainSeed({prior, mod, linker, root, assert}) {
  const path = require('node:path');
  const load = async name => {
    const m = mod(path.join(root, 'game', name));
    if (m.status === 'unlinked') await m.link(linker);
    if (m.status !== 'evaluated') await m.evaluate();
    return m.namespace;
  };
  const core = await load('formal-careers.js'), rolls = await load('career-applications.js');
  const money = await load('currency-ledger.js'), records = await load('china-personnel-records.js');
  const role = 'cn-court-clerk', clock = {day: 1, hour: 8, seconds: 0};
  let seed = 1;
  while (seed < 100000 && !(rolls.careerInterviewRoll(seed, role, 1) < .565 &&
    rolls.careerInterviewRoll(seed, role + ':promotion', 3) < .7 &&
    rolls.careerInterviewRoll(seed, role + ':promotion:personnel', 7) < .3)) seed++;
  assert(seed < 100000); prior.appearance.seed = seed;
  const bank = money.createGameCurrencyLedger({saved: prior, getClock: () => clock, storage: {setItem: () => true}});
  const initial = core.createFormalCareers({getClock: () => clock, saveState: () => true}).state();
  initial.skills.ritual = 2; initial.skills.writing = 3;
  const careers = core.createFormalCareers({saved: initial, worldSeed: seed, enablePersonnelProgression: true,
    getClock: () => clock, saveState: value => {prior.formalCareers = value; return true;},
    creditWageToBank: value => bank.creditWageToBank(value)});
  assert(careers.apply(role, {ageYears: 22}).ok);
  const hiring = careers.applicationResult().id;
  for (const step of ['interview', 'receive-document', 'appointment'])
    assert(careers.reviewApplication(role, {ageYears: 22, applicationId: hiring, step}).ok);
  function service(day) {
    Object.assign(clock, {day, hour: 10}); assert(careers.observeDay().ok); assert(careers.beginDuty().ok);
    clock.hour = 11.5; assert(careers.dutyEvent('court-start').ok); clock.hour = 12;
    assert(careers.dutyEvent('court-completed').ok); assert(careers.dutyEvent('archive-completed').ok);
    assert(careers.settle().ok);
  }
  for (let day = 1; day <= 3; day++) service(day);
  assert(careers.applyPromotion().ok);
  const legacy = careers.promotionSummary().application.id;
  for (const step of [undefined, 'receive-document', 'appointment']) assert(careers.reviewPromotion({applicationId: legacy, step}).ok);
  for (let day = 4; day <= 6; day++) service(day);
  Object.assign(clock, {day: 7, hour: 14}); assert(careers.observeDay().ok);
  const officials = records.CHINA_PERSONNEL_OFFICIALS_V1;
  const source = records.createChinaPersonnelRecords({saveState: () => true,
    resolveActor: id => ({actorId: id, alive: true, position: officials.find(row => row.actorId === id).office})});
  assert(source.witnessCourt({id: 'cn-morning-audience:7', day: 7, actorIds: officials.map(row => row.actorId)}).ok);
  for (const i of [0, 2, 4]) {
    const row = officials[i];
    assert(source.witnessArchive({id: 'cn-official-archive:' + row.actorId + ':7', actorId: row.actorId,
      day: 7, audienceId: 'cn-morning-audience:7', position: [...row.office], elapsed: 8, duration: 8}).ok);
  }
  prior.simulationClock = {version: 1, seconds: (7 * 1440 + 14 * 60 - 600) / .7};
  prior.chinaAudience = {day: 7, calledDay: 7, outcome: 'completed', personnelRecords: source.snapshot()};
  assert.equal(careers.currentRole().rankId, 'cn-records-regular');
  assert.equal(careers.promotionSummary().qualifiedDays, 3);
  assert.equal(careers.promotionSummary().balance, 3);
  assert.equal(prior.chinaPersonnelCareer, undefined);
  return {save: prior, seed, officials, source: source.sourceFor(7), staging:
    'Skills ritual2/writing3; original junior appointment and promotion plus regular-rank days4–6 through real core APIs; day7 14:00 calendar and committed mixed court/archive originals explicitly staged; no personnel trial, route movement, imperial readiness, or new appointment staged.'};
};
