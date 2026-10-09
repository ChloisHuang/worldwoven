// Explicit, isolated historical career input for the existing CR04 main case.
// This is a staged qualification prerequisite, not evidence that three chef
// days ran in production main. The caller must still walk, apply, interview,
// take over the original kitchen and make the emperor's new original meal.
// No current-world order, political proof, actor, money or clock is rewritten.
module.exports = async function usurpationMainKitchenHistory({prior, mod, linker, root, assert}) {
  const path = require('node:path');
  const copy = value => JSON.parse(JSON.stringify(value));
  async function load(name) {
    const module = mod(path.join(root, 'game', name));
    if (module.status === 'unlinked') await module.link(linker);
    if (module.status !== 'evaluated') await module.evaluate();
    return module.namespace;
  }
  const {createFormalCareers, TAVERN_CHEF_ROLE: CHEF, ROYAL_KITCHEN_ROLE: ROYAL} = await load('formal-careers.js');
  const {studyLesson} = await load('study-lessons.js');
  const {GAME_MINUTES_PER_SECOND} = await load('simulation-clock.js');

  assert.equal(prior.appearance.seed, 42, 'Keep the original world and interview seed');
  assert(prior.formalCareers == null, 'Never overwrite existing career history or stage this twice');
  const task = prior.palaceUsurpation?.cases?.at(-1);
  assert.equal(task?.id, 'palace-usurpation:0:1', 'Continue the original CR04 case');
  assert.equal(task.stage, 'planning');
  assert.equal(prior.palaceUsurpation.cases.length, 1);
  assert.deepEqual(task.selectedRoutes, ['intrigue', 'guard', 'abdication']);
  assert.equal(task.pledges.find(row => row.actorId === 'cn-consort-yue')?.accepted, false);
  for (const actorId of ['cn-official-rites', 'cn-official-justice']) {
    assert.equal(task.pledges.find(row => row.actorId === actorId)?.accepted, true);
  }
  const royalKitchenBaseline = copy(prior.chinaRoyalKitchen.orders);

  // This clock belongs only to the historical ledger writer. It is never
  // passed into the loaded scene or assigned to prior.simulationClock.
  let historicalSeconds = 0, careerSave = null, bankCalls = 0;
  const clock = () => {
    const minutes = 600 + historicalSeconds * GAME_MINUTES_PER_SECOND;
    return {seconds: historicalSeconds, day: Math.floor(minutes / 1440), hour: minutes % 1440 / 60};
  };
  const atDay = day => {
    const next = day * 1440 / GAME_MINUTES_PER_SECOND; // 10:00 on that day.
    assert(next >= historicalSeconds, 'Historical time is monotonic');
    historicalSeconds = next;
  };
  const sources = [];
  const record = (writer, input, result, explanation) => {
    assert(result?.ok, writer + ': ' + JSON.stringify(result));
    sources.push({staged: true, writer, input: copy(input), result: copy(result), at: clock(), explanation});
    return result;
  };
  const careers = createFormalCareers({
    worldSeed: prior.appearance.seed,
    getClock: clock,
    saveState: state => { careerSave = copy(state); return true; },
    // A zero-value career closure never calls this hook. A future pay-policy
    // change must fail this fixture instead of crediting the real wallet.
    creditWageToBank: () => { bankCalls++; return {ok: false, code: 'staged-history-cannot-credit-money'}; },
  });
  assert.equal(careers.state().loadError, null);

  // Public learning writers preserve the four-gains-per-skill/day limit.
  // 12 cooking lessons = 120 XP -> Lv.3; 7 ritual lessons = 70 XP -> Lv.2.
  for (const day of [0, 1, 2]) {
    atDay(day);
    for (const [lessonId, count] of [['cooking-intro', 4], ['ritual-intro', day === 0 ? 4 : day === 1 ? 3 : 0]]) {
      const lesson = studyLesson('cn-rest', lessonId);
      assert(lesson);
      for (let index = 0; index < count; index++) {
        const input = {source: 'cn-rest', lessonId};
        const started = record('formalCareers.learningTicket', input,
          careers.learningTicket(input.source, input.lessonId), 'Staged historical lesson start; not present-world reading.');
        historicalSeconds += lesson.seconds;
        record('formalCareers.completeLearning', {ticket: started.ticket, seconds: lesson.seconds},
          careers.completeLearning(started.ticket, {seconds: lesson.seconds}), 'Staged observed duration, using the unchanged lesson and XP rules.');
      }
    }
  }
  assert.equal(careers.state().skills.cooking, 3);
  assert.equal(careers.state().skills.ritual, 2);
  assert.equal(careers.royalKitchenQualification().qualifiedDays, 0);

  const ageYears = prior.playerProfile.ageYears;
  record('formalCareers.apply', {roleId: CHEF.id, ageYears}, careers.apply(CHEF.id, {ageYears}),
    'Staged historical chef application only; the live royal-kitchen application is not created.');
  const applicationId = careers.applicationResult(CHEF.id).id;
  record('formalCareers.reviewApplication', {roleId: CHEF.id, ageYears, applicationId},
    careers.reviewApplication(CHEF.id, {ageYears, applicationId}),
    'Public historical interview writer uses seed 42 and its default context; no result or roll is patched.');
  assert(careers.isHired(CHEF.id));

  // The two already-authored current tavern orders retain their NPC cooks.
  // These three distinct receipt inputs are explicitly staged career history;
  // they are not inserted into, or presented as replay of, the live order
  // controller. Keep their numbers distinct from all existing source records.
  const liveTavern = prior.worldContinuity?.regions?.china?.controllers?.chinaTavern?.world || prior.chinaServiceWorld;
  const existingNumbers = new Set([...(prior.chinaServiceWorld?.orders || []), ...(liveTavern?.orders || [])].map(row => row.number));
  const firstHistoricalNumber = Math.max(prior.chinaServiceWorld?.serial || 0, liveTavern?.serial || 0, ...existingNumbers) + 1;
  const stagedReceipts = [];
  for (const [index, day] of [2, 3, 4].entries()) {
    if (day !== 2) atDay(day);
    const workReceiptId = CHEF.workSource + '-' + (index + 1);
    record('formalCareers.beginDuty', {receiptId: workReceiptId, shiftKind: 'continuous'},
      careers.beginDuty({receiptId: workReceiptId, shiftKind: 'continuous'}), 'Staged historical formal chef shift.');
    // Three recorded physical chef stages total 8.5 seconds in the existing
    // tavern workflow. Fifteen historical covered seconds still prorate to
    // zero copper; there is no past cash, bank credit or minimum wage minted.
    historicalSeconds += 15;
    const number = firstHistoricalNumber + index, orderId = 'cn-tavern-order-' + number;
    assert(!existingNumbers.has(number));
    const receipt = {source: 'china-tavern-chef', number, orderId, mealId: orderId + '-dish',
      actorId: 'player', day, workReceiptId, completed: true};
    record('formalCareers.recordTavernChefService', receipt, careers.recordTavernChefService(receipt),
      'Explicit staged completed-chef receipt input accepted only under the matching formal role, day and work receipt. No current dish is relabeled.');
    stagedReceipts.push(copy(receipt));
    record('formalCareers.laborEvent', {event: 'completed', roleId: CHEF.id, receiptId: workReceiptId, coveredSeconds: 15, completedTasks: 1},
      careers.laborEvent('completed', {roleId: CHEF.id, receiptId: workReceiptId, coveredSeconds: 15, completedTasks: 1}), 'Close only this isolated historical shift.');
    record('formalCareers.laborEvent', {event: 'inspected', roleId: CHEF.id, receiptId: workReceiptId},
      careers.laborEvent('inspected', {roleId: CHEF.id, receiptId: workReceiptId}), 'Historical employer inspection uses the public writer.');
    assert.equal(careers.state().lastDuty.wage, 0, 'Staging cannot create historical pay');
    const settled = record('formalCareers.settle', {}, careers.settle(), 'Zero-value closure only; the bank callback must remain unused.');
    assert.equal(settled.wage, 0);
    assert.equal(settled.deposit, null);
  }
  record('formalCareers.resign', {}, careers.resign(), 'Historical chef tenure ends before this existing political case; qualifications remain.');
  assert.equal(bankCalls, 0);
  assert.equal(careers.state().tenure, null);
  assert.equal(careers.state().officialCareer.appointments.length, 0);
  assert.equal(careers.state().officialCareer.service.length, 0);
  assert.equal(careers.state().workExperience.royalKitchen.receipts.length, 0);
  assert.equal(careers.applicationResult(ROYAL.id), null);
  const qualification = careers.royalKitchenQualification();
  assert.equal(qualification.qualifiedDays, 3);
  assert(careers.eligibility(ROYAL.id, {ageYears}).ok);
  assert(historicalSeconds < prior.simulationClock.seconds, 'All staged career work precedes the present checkpoint');

  const save = {...copy(prior), formalCareers: copy(careerSave)};
  assert.deepEqual(save.chinaRoyalKitchen.orders.orders, royalKitchenBaseline.orders, 'Preserve every existing royal meal exactly');
  assert.deepEqual(save.chinaRoyalKitchen.orders.supply, royalKitchenBaseline.supply, 'Preserve the existing royal supply exactly');
  for (const key of Object.keys(prior)) {
    if (key !== 'formalCareers') assert.deepEqual(save[key], prior[key], 'Preserve existing save field ' + key);
  }
  // Reload validation reads the exact candidate at the present world's clock;
  // it may not repair it, advance it, or write to the actual save.
  const minutes = 600 + prior.simulationClock.seconds * GAME_MINUTES_PER_SECOND;
  const restored = createFormalCareers({saved: save.formalCareers, worldSeed: prior.appearance.seed,
    getClock: () => ({seconds: prior.simulationClock.seconds, day: Math.floor(minutes / 1440), hour: minutes % 1440 / 60}),
    saveState: () => { throw Error('Historical candidate should need no reload repair'); },
  });
  assert.equal(restored.state().loadError, null);
  assert(restored.eligibility(ROYAL.id, {ageYears}).ok);

  return {save, sources, qualification, stagedReceipts, royalKitchenBaseline,
    historicalClock: clock(), bankCalls, currentClockUnchanged: copy(prior.simulationClock),
    staging: `Explicit isolated historical career prerequisite, produced through public learning, application, review, formal-duty and chef-service writers. Historical lessons and three chef receipt inputs are staged, not a replay or proof of three natural production-main workdays. Only formalCareers is added. Current world time, seed 42, bodies, money, original tavern dishes, every existing royal order (serial ${royalKitchenBaseline.serial}, remaining supply ${royalKitchenBaseline.supply.remaining}), case 0:1 and all political responses are preserved. Royal application, interview, handover, emperor order, player cooking, six-second fictional story preparation, delivery and at-least-twelve-second original consumption must all occur in the resumed production main.`,
  };
};
