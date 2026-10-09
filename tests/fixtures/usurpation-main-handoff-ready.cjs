// Declared independent reception prerequisite for the already-resolved CR04
// success case. This changes an unloaded save only. It does not finish a patrol,
// advance time, award work/pay, move a running actor, or create political proof.
module.exports = function usurpationMainHandoffReady({prior, assert}) {
  const copy = value => JSON.parse(JSON.stringify(value));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const before = copy(prior), save = copy(prior);
  const caseId = 'palace-usurpation:0:1';
  const ids = ['cn-archery', 'cn-range-warden'];
  // Exact original actors observed ready in production main at this commit.
  // Only their safe positions are reusable; none of that older save's clock,
  // history, actors, political state, or patrol visits are copied into this one.
  const source = {
    commit: 'a47082f77260a89ccd07c48f135f1caeaa1da682',
    path: 'tests/fixtures/usurpation-main-success-checkpoint.json',
    controllerPath: 'save.worldContinuity.regions.china.controllers.chinaArchery',
    phase: 'handover',
    guards: [
      {id: ids[0], position: [-17.59645913821219, 0.13, 18.475520275660656], floor: 'court',
        yaw: -1.1994281624063385, patrol: {routeId: 'east', stage: 'ready', index: 0, time: 0, paused: false, yielding: false}},
      {id: ids[1], position: [-17.65, 0.13, 19.8], floor: 'court',
        yaw: -1.9949907346986628, patrol: {routeId: 'west', stage: 'ready', index: 0, time: 0, paused: false, yielding: false}},
    ],
  };
  const handoff = [[-17.65, 0.13, 18.45], [-17.65, 0.13, 19.8]];
  const atHandoff = (actor, index) => Array.isArray(actor.position) && actor.position.length === 3 &&
    actor.position.every(Number.isFinite) && actor.floor === 'court' &&
    Math.hypot(actor.position[0] - handoff[index][0], actor.position[2] - handoff[index][2]) < 0.065 &&
    Math.abs(actor.position[1] - handoff[index][1]) < 0.4;

  assert.equal(prior.appearance?.seed, 571, 'Only the independent seed-571 success input is eligible');
  assert.equal(prior.palaceUsurpation?.cases?.length, 1, 'Keep the single original case');
  const task = prior.palaceUsurpation.cases[0];
  assert.equal(task.id, caseId);
  assert.equal(task.stage, 'ready-for-investiture');
  assert.equal(task.investiture, null, 'Never stage an already-invested case');
  assert.equal(task.abandonment, null);
  assert.deepEqual(task.emperor, {id: 'cn-emperor', bodyId: 'cn-emperor', revision: 0});
  assert.equal(prior.palaceUsurpation.office.actorId, 'cn-emperor');
  assert.equal(prior.palaceUsurpation.office.revision, 0);
  assert.deepEqual(task.selectedRoutes, ['guard', 'abdication']);
  assert.equal(task.resolution?.passed, true);
  assert.equal(task.resolution.roll, task.roll, 'Keep the existing deterministic result');
  assert.equal(task.roll, 0.16744348360225558);
  for (const [kind, receipt] of Object.entries({...task.preparations, 'mechanism-resolution': task.resolution.receipt})) {
    if (kind === 'intrigue') { assert.equal(receipt, null); continue; }
    assert(receipt?.completed && receipt.caseId === caseId && receipt.kind === kind, 'Require original completed ' + kind);
    assert.equal(receipt.id, `${caseId}:physical:${kind}:player`);
    assert.equal(receipt.objectId, 'usurpation-notebook:' + caseId);
    assert.equal(receipt.durationSeconds, 6);
  }

  const china = save.worldContinuity?.regions?.china;
  assert(china && china.region === 'china');
  const routine = china.controllers?.chinaArchery;
  assert.equal(routine?.version, 1);
  assert.equal(routine.guardHolderId, ids[0]);
  assert.equal(routine.wardenHolderId, ids[1]);
  assert.equal(routine.guardHolderRevision, 0);
  assert.equal(routine.wardenHolderRevision, 0);
  assert(ids.includes(routine.activeId));
  assert.deepEqual(routine.retiredIds, []);
  assert(['relief', 'handover'].includes(routine.phase), 'Reject any held-bow or unfinished archery phase');
  assert.equal(routine.guardWork, null, 'Do not interrupt or manufacture player guard work');
  for (const key of ['flying', 'request', 'deferredPractice', 'playerShot', 'complete']) assert.equal(routine[key], false, 'Unsafe archery state: ' + key);
  assert(Array.isArray(routine.impacts) && routine.impacts.every(arrow => arrow.visible === false), 'Reject target arrows');
  assert(!routine.heldBow && !routine.playerLesson && !routine.playerDuty, 'Reject explicit active bow or player work');
  assert.equal(routine.patrol?.length, 2);
  assert.deepEqual(routine.patrol.map(([id]) => id).sort(), [...ids].sort(), 'Require exactly the two original guard patrols');
  for (const [index, slot] of [save.chinaGuardSlot, save.chinaRangeWardenSlot].entries()) {
    assert.equal(slot?.holderId, ids[index]);
    assert.equal(slot.revision, 0);
    assert.equal(slot.loadError, null);
  }
  const employment = china.controllers.chinaGuardEmployment;
  assert.equal(employment?.receiptId, null, 'Reject player guard labor receipt');
  assert.equal(employment.observation, null, 'Reject partial player guard observation');
  assert.equal(employment.autoPatrol, false);
  for (const [label, adapter] of [['save', save.chinaUsurpationActions], ['continuity', china.controllers.chinaUsurpationActions]]) {
    assert.equal(adapter?.actions?.activity, null, label + ': reject any pending physical proof');
    assert.equal(adapter.actions.mealPending, null, label + ': reject pending story proof');
    for (const proof of Object.values(adapter.actions.proofs || {})) {
      assert.equal(proof.caseId, caseId);
      assert(proof.applied === true && proof.proof?.completed === true && proof.waiting === false,
        label + ': reject incomplete or unapplied physical proof');
      assert.notEqual(proof.kind, 'investiture-reading', 'Never preinstall investiture');
    }
  }

  const original = {phase: routine.phase, phaseTime: routine.phaseTime, guards: []};
  const changes = [];
  function set(object, field, value, path) {
    if (same(object[field], value)) return;
    changes.push({path: path + '.' + field, before: copy(object[field]), after: copy(value)});
    object[field] = copy(value);
  }
  const runtimePath = 'worldContinuity.regions.china.controllers.chinaArchery';
  set(routine, 'phase', 'relief', runtimePath);
  set(routine, 'phaseTime', 0, runtimePath);
  for (const [index, id] of ids.entries()) {
    const actor = china.actors[id], patrolIndex = routine.patrol.findIndex(row => row[0] === id);
    const patrol = routine.patrol[patrolIndex][1];
    assert.equal(actor?.id, id);
    assert.equal(actor.region, 'china');
    assert.equal(actor.mountId, null);
    assert.equal(actor.transition, null, 'Do not interrupt an original actor transition');
    assert.notEqual(actor.alive, false);
    assert.equal(patrol.routeId, index ? 'west' : 'east');
    assert(Array.isArray(patrol.visited));
    assert(atHandoff(source.guards[index], index), 'Pinned source position must satisfy original handoff boundary');
    original.guards.push({id, position: copy(actor.position), floor: actor.floor, yaw: actor.yaw, patrol: copy(patrol)});
    if (!atHandoff(actor, index)) {
      set(actor, 'position', source.guards[index].position, 'worldContinuity.regions.china.actors.' + id);
      set(actor, 'floor', source.guards[index].floor, 'worldContinuity.regions.china.actors.' + id);
    }
    for (const [field, value] of Object.entries({stage: 'ready', index: 0, time: 0, paused: false, yielding: false})) {
      set(patrol, field, value, `${runtimePath}.patrol.${patrolIndex}.1`);
    }
    assert(atHandoff(actor, index));
  }

  // Reversing the complete change log must recover every original field,
  // including unknown future fields. No top-level save field is replaced.
  const restored = copy(save);
  for (const change of changes) {
    const segments = change.path.split('.'), field = segments.pop();
    const object = segments.reduce((value, key) => value[key], restored);
    object[field] = copy(change.before);
  }
  assert.deepEqual(restored, before, 'Every changed field must be declared');
  assert.deepEqual(prior, before, 'Never mutate the source input');
  for (const key of Object.keys(before)) {
    if (key !== 'worldContinuity') assert.deepEqual(save[key], before[key], 'Preserve original top-level save field ' + key);
  }
  assert.deepEqual(save.palaceUsurpation, before.palaceUsurpation);
  assert.deepEqual(save.chinaUsurpationActions, before.chinaUsurpationActions);
  assert.deepEqual(save.palaceUsurpation.cases[0].resolution, task.resolution);
  assert.equal(save.palaceUsurpation.cases[0].stage, 'ready-for-investiture');
  assert.equal(save.palaceUsurpation.cases[0].investiture, null);

  return {
    save, source, original, changes,
    caseId, seed: save.appearance.seed, resolution: copy(task.resolution),
    preservation: {inputUnchanged: true, allOtherFieldsUnchanged: true, clockUnchanged: true,
      politicsAndOriginalPaperUnchanged: true, patrolVisitsAndHistoryUnchanged: true, noWorkOrPayCreated: true},
    staging: 'Explicit independent safe-handoff and reception prerequisite for the existing seed-571 CR04 case, applied only to an unloaded input save. The two original guard IDs use their original handoff area and idle relief/ready runtime. Only the declared changed fields are staged. Current patrol visits, rounds, handoffs, shots, history, actor ages, needs, skills, assets, money, accounts, clock, political records, completed receipts, deterministic resolution and original paper IDs remain unchanged. An unfinished patrol is not counted as completed and no wage/work receipt is added. This is not evidence of full natural nighttime evolution. Production main must still gather the original witnesses, perform the real three-second investiture reading, verify cold-load persistence under rejected writes, and exercise imperial duties.',
  };
};
