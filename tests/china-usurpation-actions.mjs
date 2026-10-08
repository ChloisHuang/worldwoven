// CR04 source-bound action regressions. These use the real political ledger
// with explicit physical fixtures, not main navigation or visual play evidence.
// They target replay-after-save-failure, original bodies/props, remote action
// completion, fake gatherings and menu-only meal/incapacitation regressions.
import assert from 'node:assert/strict';
import {createChinaUsurpationActions} from '../source/game/china-usurpation-actions.js';
import {createPalaceUsurpation} from '../source/game/palace-usurpation-ledger.js';
import {palaceUsurpationRoll} from '../source/game/palace-usurpation-policy.js';

const copy = value => structuredClone(value);
const names = ['cn-official-one', 'cn-official-two', 'cn-official-three', 'cn-guard-commander'];
function body(actorId, p = [0, 0, 0]) {
  const vector = {x: p[0], y: p[1], z: p[2], toArray() { return [this.x, this.y, this.z]; }, set(x, y, z) { this.x = x; this.y = y; this.z = z; }};
  return {actorId, bodyId: `${actorId}-original-body`, root: {position: vector, visible: false}, alive: true, walking: false};
}
function fixture({enabled = true, missingGroups = false} = {}) {
  const actors = new Map(['player', 'cn-emperor', ...names, 'cn-guard-one', 'cn-guard-two'].map(id => [id, body(id)]));
  const clock = {day: 7, hour: 14}, flags = {clear: true, available: true, standing: true, busy: false, coreSave: true, runtimeSave: true, storyBind: true, markerCheckpoint: false, held: false, arrived: true};
  const context = {player: {id: 'player', bodyId: actors.get('player').bodyId, alive: true, ageYears: 25},
    emperor: {id: 'cn-emperor', bodyId: actors.get('cn-emperor').bodyId, tenureRevision: 0, alive: true, ageYears: 45},
    supporters: names.map((id, index) => ({id, bodyId: actors.get(id).bodyId, name: id, ageYears: 35, alive: true, eligible: true,
      supportsGeneral: true, roleId: `role-${index}`, circleId: index === 3 ? 'guards' : 'officials', relationship: 1, trust: 1, informedOpinion: 1,
      official: index < 3, guardCommander: index === 3})),
    guard: {commanderId: names[3], guards: ['cn-guard-one', 'cn-guard-two'].map(id => ({id, bodyId: actors.get(id).bodyId}))},
    experience: {intrigue: 6, guard: 6, abdication: 6}, exposure: 0,
    safety: {oldWorkSettled: true, itemsSettled: true, meetingsSettled: true, actorTransitionsSafe: true},
    residences: {player: {roomId: 'new-ruler-room', bedId: 'new-ruler-bed'}, formerEmperor: {roomId: 'former-ruler-room', bedId: 'former-ruler-bed'}}};
  let seed = 0;
  while (!names.every(id => palaceUsurpationRoll(seed, `palace-usurpation:0:1:political-response:${id}`) < .9) ||
    palaceUsurpationRoll(seed, 'palace-usurpation:0:1:resolution') >= .2) seed++;
  const objects = new Map([['public-court-board', {}], ['royal-meal-1-meal', {}], ['usurpation-charter:palace-usurpation:0:1', {}]]);
  const meal = {orderId: 'royal-meal-1', objectId: 'royal-meal-1-meal', consumerId: 'cn-emperor', consumerBodyId: context.emperor.bodyId,
    workerId: 'player', workerBodyId: context.player.bodyId, workReceiptId: 'royal-duty-7', dutyActive: true, stage: 'prepared'};
  let service, core, group = null, consumed = null, coreDurable, runtimeDurable, captured, storyCheckpoint, storyCalls = 0, releases = 0, coreWrites = 0;
  const task = () => core.snapshot().cases.at(-1), originalObjects = new Map(objects);
  const coreOptions = {worldSeed: seed, getClock: () => clock, getContext: () => context,
    verifyEvidence: (...args) => service?.verifyEvidence(...args) === true,
    saveState: value => {coreWrites++; captured = service?.snapshot(); if (!flags.coreSave) return false; coreDurable = copy(value); return true;}};
  core = createPalaceUsurpation(coreOptions); assert(core.begin().ok); assert(core.selectRoute(task().id, ['intrigue', 'guard', 'abdication']).ok);
  function site(kind, {participantIds}) {
    return {id: kind === 'intrigue' ? 'royal-kitchen-original-prep' : 'original-public-court',
      objectId: kind === 'intrigue' ? meal.objectId : kind === 'investiture-reading' ? `usurpation-charter:${task().id}` : 'public-court-board',
      position: [0, 0, 0], actorPoints: Object.fromEntries(participantIds.filter(id => id !== 'player').map((id, index) => [id, [.5 + index * .24, 0, .7]])), name: '原公共点'};
  }
  const options = {enabled, getCore: () => core, getTask: task, getContext: () => context, getClock: () => clock,
    getPlayer: () => actors.get('player'), resolveActor: id => actors.get(id), resolveObject: id => objects.get(id), getSite: site,
    standing: actor => flags.standing && !actor?.walking, canSee: () => flags.clear,
    isAvailable: actor => !!actor && actor.alive !== false && flags.available, getBusy: () => flags.busy,
    borrowActors: request => {if (missingGroups) return false; group = request; flags.held = true; return true;},
    groupState: lease => ({held: flags.held && group?.leaseId === lease, legalRoutes: true,
      participants: (group?.actors || []).map(actor => ({actorId: actor.actorId, bodyId: actor.bodyId, arrived: flags.arrived}))}),
    releaseActors: () => {flags.held = false; group = null; releases++;},
    getMealBinding: () => copy(meal), prepareStoryMeal: request => {
      storyCalls++; if (!flags.storyBind) return {ok: false}; meal.storyActionId = request.storyActionId;
      if (flags.markerCheckpoint) {
        // Real host ordering: the original marker/source save succeeds inside
        // this hook, then the adapter's bound=true tail checkpoint fails.
        storyCheckpoint = service.snapshot(); runtimeDurable = copy(storyCheckpoint); flags.runtimeSave = false;
      }
      return {ok: true};
    },
    getMealConsumption: () => copy(consumed),
    getDocumentBinding: value => ({caseId: value.id, documentId: `usurpation-charter:${value.id}`, objectId: `usurpation-charter:${value.id}`,
      holderId: 'player', holderBodyId: context.player.bodyId, held: true}),
    getSafeHandoff: () => ({safe: Object.values(context.safety).every(Boolean), residences: copy(context.residences)}),
    saveState: value => {if (!flags.runtimeSave) return false; runtimeDurable = copy(value); assert.deepEqual(service?.snapshot() || value, value); return true;}};
  service = createChinaUsurpationActions(options);
  function tick(seconds) { for (let count = 0; count < Math.round(seconds * 10); count++) {clock.hour += .1 / 3600; service.update(.1);} }
  function arrange(selected) {
    const action = selected.kind, frozen = service.snapshot().proofs[`${task().id}|${action}|${selected.actorId}`];
    const ids = frozen?.participantIds || selected.participantIds;
    const location = frozen?.site || site(action, {participantIds: ids});
    actors.get('player').root.position.set(...location.position);
    for (const [id, destination] of Object.entries(location.actorPoints)) actors.get(id).root.position.set(...destination);
    for (const actor of actors.values()) actor.walking = false;
  }
  function start(kind, actorId) {const intent = service.intent(kind, actorId); assert(intent, `${kind}: ${JSON.stringify(service.state())}`); arrange(intent); assert(service.start(intent)); return intent;}
  function askAll() {for (const id of names) {start('political-response', id); tick(4); assert.equal(task().pledges.find(p => p.actorId === id)?.accepted, true);}}
  return {actors, flags, clock, context, objects, originalObjects, meal, task, start, arrange, tick, askAll,
    get service() {return service;}, get core() {return core;}, get storyCalls() {return storyCalls;}, get releases() {return releases;},
    get captured() {return copy(captured);}, get coreWrites() {return coreWrites;}, get runtimeDurable() {return copy(runtimeDurable);}, get storyCheckpoint() {return copy(storyCheckpoint);},
    consume(extra = {}) {consumed = {...copy(meal), status: 'consumed', ...extra};},
    cold(saved = service.snapshot()) {service.dispose(); core = createPalaceUsurpation({...coreOptions, saved: coreDurable}); service = createChinaUsurpationActions({...options, saved});},
    dispose() {service.dispose();},
  };
}

// Default-off and absent legal body-loan hooks cannot fabricate a gathering.
{
  const f = fixture({enabled: false}); assert.equal(f.service.intent('political-response', names[0]), null); f.dispose();
  const missing = fixture({missingGroups: true}), intent = missing.service.intent('political-response', names[0]);
  missing.arrange(intent); assert.equal(missing.service.start(intent), false); assert.equal(missing.task().pledges.length, 0); missing.dispose();
}
// Four seconds with the original person. First-person root visibility does
// not hide a live body; leaving or losing genuine visibility cancels instead.
{
  const f = fixture(); f.start('political-response', names[0]); f.tick(3.9); assert.equal(f.task().pledges.length, 0);
  f.tick(.1); assert.equal(f.task().pledges.length, 1); assert.equal(f.task().pledges[0].receipt.durationSeconds, 4);
  assert.equal(f.service.intent('political-response', names[0]), null);
  f.start('political-response', names[1]); f.tick(2); f.actors.get('player').root.position.x = 4; f.tick(.1);
  assert.equal(f.service.active(), false); assert.equal(f.task().pledges.length, 1);
  f.start('political-response', names[1]); f.tick(2); f.flags.clear = false; f.tick(.1); assert.equal(f.task().pledges.length, 1);
  f.flags.clear = true; f.start('political-response', names[1]); f.tick(4); assert.equal(f.task().pledges.length, 2); f.dispose();
}
// A callback claiming arrival is insufficient. Participants must occupy the
// original points, with original body objects, available and standing.
{
  const f = fixture(); f.start('political-response', names[0]); f.actors.get(names[0]).root.position.z = 9; f.tick(.1);
  assert.equal(f.service.active(), false); assert.equal(f.task().pledges.length, 0);
  f.start('political-response', names[0]); const old = f.actors.get(names[0]); f.actors.set(names[0], body(names[0], old.root.position.toArray())); f.tick(4);
  assert.equal(f.task().pledges.length, 0); assert.equal(f.service.active(), false); f.actors.set(names[0], old);
  f.start('political-response', names[0]); f.flags.arrived = false; f.tick(10); assert.equal(f.service.state().elapsed, 0);
  f.flags.held = false; f.tick(.1); assert.equal(f.service.active(), false); assert.equal(f.task().pledges.length, 0); f.dispose();
}
// Real named commander plus exactly the original guards, independent of the
// aggregate gathering report. No success/roll is supplied by the adapter.
{
  const f = fixture(); f.askAll(); f.start('guard'); f.tick(5.9); assert.equal(f.task().preparations.guard, null);
  f.tick(.1); const receipt = f.task().preparations.guard; assert(receipt); assert.equal(receipt.guardIds.length, 2);
  for (const id of receipt.guardIds) assert(receipt.participants.some(p => p.actorId === id && p.bodyId === f.actors.get(id).bodyId));
  assert.equal(Object.hasOwn(receipt, 'passed'), false); assert.equal(Object.hasOwn(receipt, 'success'), false);
  assert(f.releases >= 5); f.dispose();
}
// Story package preparation is tied to this player's original active shift,
// original emperor and original dish. Only actual consumption completes it.
{
  const f = fixture(); f.start('intrigue'); f.tick(6); assert.equal(f.storyCalls, 1);
  assert.equal(f.task().preparations.intrigue, null); assert.equal(f.service.active(), false); assert(f.service.state().pendingMeal);
  f.tick(3); assert.equal(f.task().preparations.intrigue, null);
  f.consume({orderId: 'another-meal'}); f.tick(.1); assert.equal(f.task().preparations.intrigue, null);
  f.consume(); f.tick(.1); const receipt = f.task().preparations.intrigue; assert(receipt); assert.equal(receipt.meal.orderId, f.meal.orderId);
  assert.equal(receipt.meal.status, 'consumed'); assert(receipt.participants.some(p => p.actorId === 'cn-emperor'));
  assert.equal(f.storyCalls, 1); assert.equal(f.actors.get('cn-emperor').alive, true); f.dispose();
}
// Cancel during preparation, replaced original dish, lost duty and false meal
// provenance all fail before a completed source can be issued.
{
  const f = fixture(); f.start('intrigue'); f.tick(5.9); f.service.cancel(); f.tick(1); assert.equal(f.storyCalls, 0);
  f.start('intrigue'); f.objects.set(f.meal.objectId, {}); f.tick(6); assert.equal(f.storyCalls, 0);
  f.objects.set(f.meal.objectId, f.originalObjects.get(f.meal.objectId)); f.meal.dutyActive = false;
  assert.equal(f.service.intent('intrigue'), null); f.dispose();
}
// A failed story binding may release the player and cold-load without losing
// the completed six seconds or creating another story-source identifier.
{
  const f = fixture(); f.flags.storyBind = false; f.start('intrigue'); f.tick(6);
  const source = f.service.snapshot().mealPending.storyActionId; f.service.cancel(); f.cold();
  f.flags.storyBind = true; f.start('intrigue'); f.tick(.1);
  assert.equal(f.meal.storyActionId, source); assert.equal(f.service.active(), false); assert.equal(f.task().preparations.intrigue, null);
  f.consume(); f.tick(.1); assert.equal(f.task().preparations.intrigue.storyActionId, source); f.dispose();
}
// Rejected persistence keeps the same finished proof in the core's atomic
// capture, across cancellation and cold load, without another timed action.
{
  const f = fixture(); f.start('political-response', names[0]); f.flags.coreSave = false; f.tick(4);
  const pending = f.service.snapshot(), proof = Object.values(pending.proofs)[0].proof;
  assert.equal(f.task().pledges.length, 0); assert.equal(f.captured.proofs[Object.keys(pending.proofs)[0]].proof.id, proof.id);
  assert.equal(f.service.intent('political-response', names[1]), null);
  f.service.cancel(); assert.equal(f.service.state().pendingProofs.length, 1); f.cold(f.service.snapshot());
  assert.equal(f.service.state().loadError, null); assert.equal(f.service.active(), false);
  const original = f.actors.get(names[0]); f.actors.set(names[0], {...original, bodyId: 'replacement-body'});
  const changed = f.service.intent('political-response', names[0]); if (changed) {f.arrange(changed); assert.equal(f.service.start(changed), false);}
  f.actors.set(names[0], original); f.flags.coreSave = true; f.start('political-response', names[0]); f.tick(.1);
  assert.equal(f.task().pledges.length, 1); assert.equal(f.task().pledges[0].receipt.id, proof.id); assert.deepEqual(f.task().pledges[0].receipt.at, proof.at); f.dispose();
}
// Marker/source saved inside the host hook, bound=true tail write rejected,
// then the real meal finishes before cold recovery. The original completed
// source is enough; neither an active shift nor another packet is required.
{
  const f = fixture(); f.flags.markerCheckpoint = true; f.start('intrigue'); f.tick(6);
  const checkpoint = f.storyCheckpoint, source = checkpoint.mealPending;
  assert.equal(source.progress, 6); assert.equal(source.bound, false); assert.equal(f.service.snapshot().mealPending.bound, true);
  assert.equal(f.storyCalls, 1); assert.equal(f.task().preparations.intrigue, null);
  f.meal.dutyActive = false; f.meal.stage = 'consumed'; f.consume({workReceiptId: 'wrong-original-duty'});
  f.flags.runtimeSave = true; f.cold(checkpoint); assert.equal(f.service.state().loadError, null);
  const incomplete = copy(checkpoint); incomplete.mealPending.progress = 5.9; assert.equal(f.service.restore(incomplete), false);
  assert.equal(f.service.intent('intrigue'), null, 'a consumed dish cannot start a fresh active-duty preparation');
  f.tick(.1); assert.equal(f.task().preparations.intrigue, null, 'a different shift cannot confirm the saved source');
  f.consume(); f.tick(.1); assert.equal(f.task().preparations.intrigue.storyActionId, source.storyActionId);
  assert.equal(f.task().preparations.intrigue.meal.orderId, source.meal.orderId); assert.equal(f.storyCalls, 1);
  assert.equal(f.service.active(), false); assert.equal(f.service.state().pendingMeal, false); f.dispose();
}
// Same-task combination, original emperor confrontation, actual acclamation,
// original paper reading and settled housing form the complete handoff.
{
  const f = fixture(); f.askAll(); f.start('guard'); f.tick(6); f.start('abdication'); f.tick(6);
  f.start('intrigue'); f.tick(6); f.consume(); f.tick(.1); f.start('mechanism-resolution'); f.tick(6);
  assert.equal(f.task().stage, 'ready-for-investiture'); assert.equal(f.core.snapshot().office.actorId, 'cn-emperor');
  f.start('acclamation'); f.tick(6); assert(f.task().preparations.acclamation);
  f.start('investiture-reading'); f.tick(2.9); assert.equal(f.core.snapshot().office.actorId, 'cn-emperor'); f.tick(.1);
  assert.equal(f.task().stage, 'invested'); const receipt = f.task().investiture.receipt;
  assert.equal(receipt.documentId, receipt.objectId); assert(receipt.participants.some(p => p.actorId === 'cn-emperor'));
  assert.deepEqual(receipt.safeHandoff.residences, f.context.residences);
  assert.equal(f.core.snapshot().office.actorId, 'player'); assert.equal(f.actors.get('cn-emperor').alive, true); f.dispose();
}
// Unsupported/corrupt saved physical data cannot grant historical receipts.
{
  const f = fixture(); const invalid = f.service.snapshot(); invalid.activity = {kind: 'guard'};
  assert.equal(f.service.restore(invalid), false); assert.equal(f.service.verifyEvidence({completed: true}, {caseId: f.task().id, kind: 'guard'}), false); f.dispose();
}
console.log('china-usurpation-actions: source-bound physical receipts, cancellation, consumption and replay passed');
