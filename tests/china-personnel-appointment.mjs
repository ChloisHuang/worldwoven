// Focused appointment regressions: real Three roots, formal career/records/work
// cores and palace duty arbitration. The qualified service days, signed trial,
// player arrival and emperor's ready endpoint are explicitly staged fixtures.
// This does NOT claim full-main navigation, natural multi-day play or visuals.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id, context, next) {
  return id === 'three' ? {url: new URL('../source/vendor/three/build/three.module.js', import.meta.url).href, shortCircuit: true} : next(id, context);
}});
const T = await import('three');
const {createChinaCourtCareer} = await import('../source/game/china-court-career.js');
const {createChinaPersonnelAppointment} = await import('../source/game/china-personnel-appointment.js');
const {createFormalCareers, COURT_CLERK_ROLE} = await import('../source/game/formal-careers.js');
const {createChinaPalaceLife, CHINA_PALACE_ROLES} = await import('../source/game/china-palace-life.js');
const {createChinaPersonnelRecords, CHINA_PERSONNEL_OFFICIALS_V1: OFFICIALS} = await import('../source/game/china-personnel-records.js');
const {createChinaPersonnelWork, validateChinaPersonnelWorkCase} = await import('../source/game/china-personnel-work.js');
const {personnelSame} = await import('../source/game/official-personnel-policy.js');
const {palaceResidentSave} = await import('../source/game/china-palace-residents.js');
const {careerInterviewRoll} = await import('../source/game/career-applications.js');
const {officialTenureId} = await import('../source/game/official-career-progress.js');
const {approvePending} = await import('./fixtures/career-application.mjs');
const copy = value => structuredClone(value), ROLE = COURT_CLERK_ROLE.id, LU = 'cn-official-personnel', EMPEROR = 'cn-emperor';
const P = 'personnel-promotion-', PUBLIC_PLAYER = [-15.1, .145, -14.45], PUBLIC_EMPEROR = [-15.1, .215, -13.35];
function actor(id, position) {
  const root = new T.Group(); root.position.set(...position);
  root.userData.hands = [new T.Group(), new T.Group()]; root.add(...root.userData.hands);
  return {actorId: id, bodyId: id + '-original-body', station: {id, npcName: id}, root, home: root.position.clone(),
    alive: true, walking: false, route: [], phase: 0, breakAt: 10, locomotion: {walkSpeed: 1.4}, animate() {}};
}
// The actual palace implementation arbitrates background/foreground duty.
// Only its physical arrival checkpoint is staged, avoiding a fake ready=true
// oracle and avoiding expensive palace construction or a second emperor.
function palaceFixture(emperor) {
  const npcs = CHINA_PALACE_ROLES.map(row => row.id === EMPEROR ? emperor : actor(row.id, row.npcPosition));
  npcs.push(actor('cn-tea', [2.9, .815, -29.68]));
  const items = [{id: 'china-furniture-throne', position: [0, 1.415, -4.3]}, {id: 'china-furniture-seat', position: [-21.7, 7.815, -4.6]}]
    .map(row => ({...row, anchor: [...row.position], kind: 'seat', yaw: 0}));
  const seed = palaceResidentSave({worldSeed: 42, actorIds: npcs.map(row => row.station.id)});
  for (const row of Object.values(seed.people)) row.current = {id: 'read', duration: 10000, startedAt: 0};
  const palace = createChinaPalaceLife({npcs, lot: {colliders: [], bounds: {}, interiorRooms: []},
    furniture: {items, facilities: {reserve: () => true, occupy: () => true}, releaseActor() {}, canUse: () => true, canSit: () => true,
      standPoint: (_a, _b, seat) => new T.Vector3(...seat.position)}, doors: {}, planPath: (_from, to) => [to], moveActor() {}, poseContext: () => ({}), saved: seed});
  assert(palace);
  function ready() {
    const saved = palace.snapshot(), runtime = saved.runtime; assert(runtime.duty);
    runtime.duty = {...runtime.duty, active: true, release: false, yieldSeat: false, fromPublic: true};
    runtime.scripts[EMPEROR] = [{id: 'duty-public-review', label: 'staged real public endpoint', path: [PUBLIC_EMPEROR], duration: {$worldRef: 'infinity'}},
      {id: 'duty-return-home', label: 'return', path: [emperor.home.toArray()], duration: 0}];
    runtime.stages[EMPEROR] = {index: 0, waypoint: 0, arrived: true, elapsed: 0, cycles: 0, choice: null, mount: null};
    emperor.root.position.set(...PUBLIC_EMPEROR); emperor.walking = false;
    assert(palace.restore(saved)); assert(palace.dutyState(runtime.duty.owner).ready);
  }
  function clearDuty() { const saved = palace.snapshot(); saved.runtime.duty = null; assert(palace.restore(saved)); }
  return {palace, npcs, ready, clearDuty};
}
function fixture({enabled = true, reject = false} = {}) {
  let seed = 1;
  for (; seed < 100000; seed++) {
    const old = careerInterviewRoll(seed, ROLE, 1) < .565 && careerInterviewRoll(seed, ROLE + ':promotion', 3) < .7;
    const royal = careerInterviewRoll(seed, ROLE + ':promotion:personnel', 7);
    if (old && (reject ? royal > .95 : royal < .3)) break;
  }
  assert(seed < 100000);
  const clock = {day: 1, hour: 8, seconds: 100}, flags = {save: true, busy: false, standing: true, clear: true, meeting: true, held: false};
  let lu = actor(LU, [21.7, .215, 32.25]), emperor = actor(EMPEROR, [-21.7, 7.815, -4.6]), player = actor('player', [20.55, .215, 32.25]); player.ageYears = 22;
  const originalLu = lu, originalEmperor = emperor, originalPlayer = player, realPalace = palaceFixture(emperor), bank = [], writes = [], runtimeWrites = [], notices = [], travels = [];
  const hooks = {resume: null, waiting: null};
  let legacyHeldCareer;
  let careers, service, signedTrial = null, durableCareer, durableRuntime, lastCapture = null, reenter = false, attempts = 0;
  const careerOptions = {worldSeed: seed, enablePersonnelProgression: true, getClock: () => clock,
    resolvePromotionActor: id => {const who = id === LU ? lu : id === EMPEROR ? emperor : null; return who && {actorId: id, bodyId: who.bodyId, alive: who.alive, position: who.root.position.toArray()};},
    readPersonnelWork: ({mode, officialTenureId: tenure}) => mode === 'trial' && signedTrial?.officialTenureId === tenure ? copy(signedTrial) : null,
    creditWageToBank: value => {bank.push(copy(value)); return {ok: true};},
    saveState: value => {
      attempts++; writes.push(copy(value)); lastCapture = service ? service.snapshot() : null;
      if (reenter && service) {const before = service.snapshot(); service.update(100); assert.deepEqual(service.snapshot(), before); assert.equal(service.restore(before), false);}
      if (flags.save === 'throw') throw Error('fixture failed save'); if (flags.save === 'promise') return Promise.resolve(true); if (!flags.save) return false;
      durableCareer = copy(value); return true;
    },
  };
  careers = createFormalCareers(careerOptions); const skilled = careers.state(); skilled.skills.ritual = 2; skilled.skills.writing = 3;
  careers = createFormalCareers({...careerOptions, saved: skilled}); assert(careers.apply(ROLE, {ageYears: 22}).ok); approvePending(careers);
  function court(day) {
    Object.assign(clock, {day, hour: 10}); careers.observeDay(); assert(careers.beginDuty().ok); clock.hour = 11.5;
    assert(careers.dutyEvent('court-start').ok); clock.hour = 12;
    assert(careers.dutyEvent('court-completed').ok); assert(careers.dutyEvent('archive-completed').ok); assert(careers.settle().ok);
  }
  for (let day = 1; day <= 3; day++) court(day);
  assert(careers.applyPromotion().ok); const old = careers.promotionSummary().application.id;
  assert(careers.reviewPromotion({applicationId: old}).ok);
  assert(careers.reviewPromotion({applicationId: old, step: 'receive-document'}).ok); legacyHeldCareer = copy(careers.state());
  assert(careers.reviewPromotion({applicationId: old, step: 'appointment'}).ok);
  for (let day = 4; day <= 6; day++) court(day);
  const tenure = officialTenureId(careers.workState().tenure), source = createChinaPersonnelRecords({saveState: () => true,
    resolveActor: id => ({actorId: id, alive: true, position: OFFICIALS.find(row => row.actorId === id).office})});
  assert(source.witnessCourt({id: 'cn-morning-audience:6', day: 6, actorIds: OFFICIALS.map(row => row.actorId)}).ok);
  const work = createChinaPersonnelWork({sourceFor: (day, serial) => source.sourceFor(day, serial),
    readAppointment: () => ({actorId: 'player', tenureId: tenure, rankId: 'cn-records-regular'}), validateEligibility: () => true,
    resolveActor: () => ({actorId: LU, bodyId: lu.bodyId, alive: true, position: lu.root.position.toArray()}), saveState: () => true});
  const claimed = work.claim({day: 6, mode: 'trial', officialTenureId: tenure}); assert(claimed.ok); const id = claimed.case.id;
  const proof = (targetId, position, duration, rest = {}) => ({caseId: id, actorId: 'player', targetId, position, standing: true, clear: true, elapsed: duration, duration, ...rest});
  for (const row of OFFICIALS) {
    assert(work.visit({caseId: id, actorId: row.actorId, proof: proof(row.actorId, row.office, 3)}).ok);
    assert(work.record({caseId: id, actorId: row.actorId, archiveStatus: 'awaiting'}).ok);
  }
  assert(work.compile({caseId: id, proof: proof('cn-court-career-desk', [21.5, .215, 32.25], 8, {revision: 6})}).ok);
  assert(work.review({caseId: id, proof: proof(LU, [22.48, .215, 32.25], 4, {revision: 6, recipientPosition: lu.root.position.toArray(), recipientBodyId: lu.bodyId, recipientAlive: true})}).ok);
  signedTrial = work.snapshot().cases.at(-1); Object.assign(clock, {day: 7, hour: 14}); careers.observeDay();
  assert(careers.promotionAvailability().ok, JSON.stringify(careers.promotionSummary()));
  const home = new T.Group(), paper = new T.Group(); home.add(paper); paper.position.set(21.44, 1.235, 31.55);
  const options = {careers, palace: realPalace.palace, getPlayer: () => player, getClock: () => clock, enabled,
    getLu: () => lu, getEmperor: () => emperor, getBusy: () => flags.busy, standing: () => flags.standing, canSee: () => flags.clear,
    getMeetingPoint: (_actor, fallback) => fallback, requestMeeting: () => {if (!flags.meeting) return false; flags.held = true; return true;},
    meetingHeld: who => flags.held && who === lu, releaseMeeting: () => {flags.held = false;},
    resumeApproach: selected => {travels.push(copy(selected)); return hooks.resume?.(selected) ?? true;}, onWaiting: () => hooks.waiting?.(), notify: text => notices.push(text), documentObject: paper,
    saveState: value => {runtimeWrites.push(copy(value)); if (!flags.save) return false; durableRuntime = copy(value); return true;},
  };
  function load(saved) {if (service) service.dispose({suspend: true}); service = createChinaPersonnelAppointment({...options, ...(saved === undefined ? {} : {saved})}); return service;}
  load();
  const f = {clock, flags, careers, bank, hooks, legacyHeldCareer, careerOptions, trialCase: copy(signedTrial), trialWork: work.snapshot(), trialRecords: source.snapshot(), writes, runtimeWrites, notices, travels, paper, home, realPalace, originalLu, originalEmperor, originalPlayer,
    get service() {return service;}, get player() {return player;}, get lu() {return lu;}, get emperor() {return emperor;}, get attempts() {return attempts;},
    get lastCapture() {return copy(lastCapture);}, get durableCareer() {return copy(durableCareer);}, get durableRuntime() {return copy(durableRuntime);},
    replaceLu: who => {lu = who;}, replaceEmperor: who => {emperor = who;}, replacePlayer: who => {player = who;}, load, reenter: value => {reenter = value;},
    dispose() {service.dispose(); realPalace.palace.dispose();},
  };
  f.tick = (seconds, dt = .1) => {for (let n = 0; n < Math.round(seconds / dt); n++) {clock.seconds += dt; service.update(dt);}};
  f.execute = type => {const selected = service.intent(P + type); assert(selected, type + ': ' + JSON.stringify(service.state())); player.root.position.set(...selected.position); player.walking = false;
    assert(service.executeIntent(selected), type); return selected;};
  f.apply = () => f.execute('apply');
  f.recommend = () => {f.apply(); f.execute('review'); f.tick(4); assert.equal(careers.promotionSummary().application.stage, 'document-ready');};
  f.receive = () => {f.recommend(); f.execute('receive-document'); assert.equal(careers.promotionSummary().application.stage, 'document-held');};
  f.royal = () => {f.receive(); f.execute('imperial-review'); realPalace.ready(); f.tick(4);};
  return f;
}

// Disabled by default and old-route paper remain untouched.
{
  const f = fixture({enabled: false}); const before = f.careers.state();
  assert.equal(f.service.intent(), null); assert.equal(f.paper.parent, f.home); f.service.update(10000); assert.deepEqual(f.careers.state(), before); f.dispose();
}
// Same physical paper and application: deterministic Lu review, original
// emperor public review, declaration, and no salary before the next new duty.
{
  const f = fixture(), bank = copy(f.bank), start = f.careers.state(); f.apply();
  const application = f.careers.promotionSummary().application;
  assert(f.service.restore(f.lastCapture), 'new application accepts the idle pre-adoption runtime from its atomic save');
  const selected = f.service.intent(P + 'review');
  assert.equal(f.service.executeIntent(selected), false, 'Lu cannot be reviewed from the registration desk');
  f.execute('review'); f.tick(3.9); assert.equal(f.careers.promotionSummary().application.stage, 'submitted'); f.tick(.1);
  assert.equal(f.careers.promotionSummary().application.imperialDecision, null, 'Lu does not consume an interview lottery');
  assert(f.careers.promotionSummary().application.recommendation);
  f.execute('receive-document'); assert.equal(f.paper.parent, f.player.root.userData.hands[1]);
  assert.equal(f.paper.userData.personnelAppointmentId, application.id);
  f.execute('imperial-review'); f.tick(9); assert.equal(f.service.state().progress, 0, 'requesting a duty is not imperial arrival');
  f.realPalace.ready(); f.emperor.root.position.set(-21.7, 7.815, -4.6); f.tick(5); assert.equal(f.service.state().progress, 0, 'a stale ready flag cannot authorize private-room review');
  f.emperor.root.position.set(...PUBLIC_EMPEROR); f.emperor.root.visible = false; f.tick(4); assert.equal(f.service.state().progress, 0);
  f.emperor.root.visible = true; f.tick(3.9); assert.equal(f.careers.promotionSummary().application.stage, 'document-held'); f.tick(.1);
  assert.equal(f.careers.promotionSummary().application.stage, 'imperial-approved'); assert.equal(f.careers.currentRole().rankId, 'cn-records-regular');
  assert.equal(f.paper.parent, f.player.root.userData.hands[1]); assert.equal(f.paper.userData.personnelAppointmentId, application.id);
  f.execute('appointment'); f.tick(2.9); assert.equal(f.careers.currentRole().rankId, 'cn-records-regular'); f.tick(.1);
  assert.equal(f.careers.currentRole().rankId, 'cn-records-personnel'); assert.equal(f.paper.parent, f.home); assert.deepEqual(f.bank, bank);
  assert.deepEqual(f.careers.state().skills, start.skills); assert.equal(f.careers.promotionSummary().application.id, application.id);
  const final = f.careers.state(); f.tick(20); assert.deepEqual(f.careers.state(), final); f.dispose();
}
// Foreground original edict and court preempt this background request without
// stealing their duty, withdrawing the case, or keeping partial elapsed time.
{
  const f = fixture(); f.receive(); f.execute('imperial-review'); f.realPalace.ready(); f.tick(2);
  const id = f.careers.promotionSummary().application.id; assert(f.realPalace.palace.requestDuty('china-palace-edict', {kind: 'edict-review'}));
  f.tick(3); assert.equal(f.service.state().progress, 0); assert.equal(f.service.state().royalOwner, null);
  assert.equal(f.realPalace.palace.dutyState('china-palace-edict').owner, 'china-palace-edict');
  assert.equal(f.careers.promotionSummary().application.id, id); assert.equal(f.careers.promotionSummary().application.status, 'pending');
  assert.equal(f.service.stopActivity(), true); assert(f.realPalace.palace.dutyState('china-palace-edict'), 'cancellation does not release the original edict'); f.dispose();
}
// Finished physical proofs survive each save failure, retry only once per
// loaded second, fence reentry, and cold-reconcile an already-committed step.
for (const type of ['review', 'receive-document', 'imperial-review', 'appointment']) {
  const f = fixture();
  if (type === 'review') f.apply(); else if (type === 'receive-document') f.recommend(); else if (type === 'imperial-review') f.receive(); else f.royal();
  f.flags.save = false; f.reenter(true); const before = f.careers.state(); f.execute(type); if (type === 'imperial-review') f.realPalace.ready();
  if (type !== 'receive-document') f.tick(type === 'appointment' ? 3 : 4);
  const checkpoint = f.service.snapshot(), attempts = f.attempts; assert(checkpoint.activity.proof); assert.deepEqual({...f.careers.state(), lastError: before.lastError}, before);
  f.tick(.9); assert.equal(f.attempts, attempts); f.tick(.1); assert.equal(f.attempts, attempts + 1); assert.deepEqual(f.service.snapshot().activity.proof, checkpoint.activity.proof);
  f.flags.save = true; f.tick(1); assert.equal(f.service.isActing(), false);
  const capture = f.lastCapture, after = f.careers.state(); assert(capture.activity.proof); assert(f.service.restore(capture)); assert.equal(f.service.isActing(), false);
  assert.deepEqual(f.careers.state(), after); assert.equal(f.service.state().loadError, null); f.dispose();
}
// Reload from an unfinished saved proof reacquires public duty instead of
// restoring an exclusive lease. It cannot add offline time or reroll.
{
  const f = fixture(); f.receive(); f.execute('imperial-review'); f.realPalace.ready(); f.flags.save = false; f.tick(4);
  const checkpoint = f.service.snapshot(), roll = f.careers.promotionSummary().application.roll; f.flags.save = true;
  f.load(checkpoint); f.realPalace.clearDuty(); assert.equal(f.service.isWaiting(), true); f.tick(.1); f.realPalace.ready(); f.tick(1);
  assert.equal(f.careers.promotionSummary().application.stage, 'imperial-approved'); assert.equal(f.careers.promotionSummary().application.roll, roll); f.dispose();
}
// Large/offline time deltas do not create completed physical review time.
{
  const f = fixture(); f.receive(); f.execute('imperial-review'); f.realPalace.ready();
  f.clock.seconds += 10000; f.service.update(10000); assert.equal(f.service.state().progress, .025);
  f.service.update(Number.NaN); assert.equal(f.service.state().progress, .025);
  f.service.stopActivity(); assert.equal(f.careers.promotionSummary().application.stage, 'document-held'); f.dispose();
}
// Rejection is the stored same-case lottery. Repeated interaction and reload
// cannot change the result or emit an appointment.
{
  const f = fixture({reject: true}); f.royal(); const before = f.careers.state(), row = f.careers.promotionSummary().application;
  assert.equal(row.status, 'rejected'); assert.equal(f.service.intent(P + 'imperial-review'), null); assert.equal(f.service.intent(P + 'appointment'), null);
  f.load(f.service.snapshot()); f.tick(20); assert.deepEqual(f.careers.state(), before); assert.equal(f.careers.currentRole().rankId, 'cn-records-regular'); f.dispose();
}
// Real interruptions and runtime-object/body fences, including replacement
// actors that deliberately retain the same public ID and body ID.
for (const change of ['move', 'standing', 'busy', 'occlusion', 'paper', 'emperor-body', 'emperor-object', 'player-object', 'day']) {
  const f = fixture(); f.receive(); f.execute('imperial-review'); f.realPalace.ready(); f.tick(2);
  const before = f.careers.promotionSummary().application;
  if (change === 'move') f.player.root.position.x += 1;
  if (change === 'standing') f.flags.standing = false;
  if (change === 'busy') f.flags.busy = true;
  if (change === 'occlusion') f.flags.clear = false;
  if (change === 'paper') f.home.add(f.paper);
  if (change === 'emperor-body') f.emperor.bodyId = 'other-body';
  if (change === 'emperor-object') f.replaceEmperor({...f.emperor});
  if (change === 'player-object') f.replacePlayer({...f.player});
  if (change === 'day') f.clock.day++;
  f.tick(5); assert.equal(f.service.isActing(), false, change); assert.deepEqual(f.careers.promotionSummary().application, before, change); f.dispose();
}
// Culling does not erase remote access or queued original Lu; private work
// never completes in a queue and Lu identity changes cancel only the activity.
{
  const f = fixture(); f.apply(); f.lu.root.visible = false; const intent = f.service.intent(P + 'review'); assert(intent);
  f.flags.meeting = false; assert(f.service.prepareIntent(intent)); assert(f.service.isWaiting()); f.tick(8); assert.equal(f.service.state().progress, 0);
  f.lu.root.visible = true; f.flags.meeting = true; f.tick(1); assert(f.travels.length); f.player.root.position.set(...f.travels.at(-1).position);
  assert(f.service.executeIntent(f.service.intent(P + 'review'))); f.tick(2); f.replaceLu({...f.lu}); f.tick(.1);
  assert.equal(f.service.isActing(), false); assert.equal(f.careers.promotionSummary().application.stage, 'submitted'); f.dispose();
}
console.log('PASS personnel appointment: same-paper Lu→original emperor→registration, actual 4/4/3 loaded seconds, real palace priority leases, fixed rejection, save failure retries/reentry, cold reconciliation and actor/body fences; staged endpoints only');

// Execute the actual production glue with tiny dependencies, not a duplicate
// implementation. These source slices do not boot the main renderer/world.
const {readFileSync} = await import('node:fs'), {default: vm} = await import('node:vm');
const main = readFileSync(new URL('../source/game/main.js', import.meta.url), 'utf8');
function section(from, until) {const a = main.indexOf(from), b = main.indexOf(until, a + from.length); assert(a >= 0 && b > a, from); return main.slice(a, b);}
const glue = [section('function currentControl(', 'let continuityReady='),
  section('function resolvePlayerIntent(', 'function goToStation('),
  section('function cancelAction(', 'function furnitureSafetyBoxes('), section('function dispatchPlayerArrival(', '// Candidate discovery')].join('\n');
const keydown = section("\naddEventListener('keydown'", "addEventListener('keyup'");
function mainFixture(f) {
  const counts = {royalStop: 0, otherStop: 0, oldCourtStop: 0, socialEnd: 0, resolve: 0, prepare: 0, execute: 0};
  const globals = Object.fromEntries([...glue.matchAll(/\b([A-Za-z_$][\w$]*)\?\./g)].map(match => [match[1], null]));
  const elements = new Map(), dom = id => {if (!elements.has(id)) elements.set(id, {style: {}, textContent: ''}); return elements.get(id);};
  const royal = {...f.service, resolveIntent: value => {counts.resolve++; return f.service.resolveIntent(value);},
    prepareIntent: value => {counts.prepare++; return f.service.prepareIntent(value);},
    executeIntent: value => {counts.execute++; return f.service.executeIntent(value);},
    stopActivity: () => {counts.royalStop++; return f.service.stopActivity();}};
  Object.assign(globals, {THREE: T, player: f.player, paused: false, mode: 'lot', roofShown: false, interactionMenuOpen: () => false,
    path: [], targetStation: null, pendingInteraction: null, performing: null, arrivalViewUntil: 0, seated: null, bathTransition: null, pendingStand: null,
    keys: new Set(), joy: {x: 0, y: 0}, joyPointer: null, joyLastPoint: null, joyActionAnchor: null, studyTicket: null, actionTime: 0,
    chinaPersonnelAppointment: royal, chinaPersonnelCareer: {stopActivity: () => {counts.otherStop++; return true;}, isActing: () => false},
    chinaCareer: {stopActivity: () => {counts.oldCourtStop++;}, isActing: () => false},
    npcSocial: {end: () => {counts.socialEnd++; f.flags.held = false;}, active: () => false},
    activeDailyToilet: () => null, studyMenu: {close() {}}, formalCareers: {...f.careers, cancelLearning() {}},
    standFromSeat: () => true, furniture: {releaseActor() {}}, setActionProgress() {}, $: dom, toast() {},
    nearbyInteraction: (selected, position, {radius = 2.8, clear = () => true} = {}) => clear(selected) &&
      Math.abs(position.y - selected.position[1]) < .3 && Math.hypot(position.x - selected.position[0], position.z - selected.position[2]) <= radius,
    nearbyInteractionClear: () => true, planPath: (_from, to) => [to], refreshNearbyChoices() {}, nearest: null,
    contextMenu: {project() {}, activate: () => globals.executeNearbyAction(globals.currentControl())},
    addEventListener: (_event, callback) => {globals.keydown = callback;},
  });
  vm.createContext(globals); vm.runInContext(glue + '\n' + keydown, globals);
  f.hooks.waiting = () => {globals.path = []; globals.targetStation = null; globals.pendingInteraction = null;};
  f.hooks.resume = selected => globals.requestStationIntent(selected, {resumePersonnel: true});
  return {globals, counts, royal};
}

// Provider resolution, immediate apply execution, deferred Lu resumption and
// arrival execute all use actual main functions. Resuming one's own appointment
// keeps its Lu lease while still stopping unrelated work.
{
  const f = fixture(), {globals: g, counts} = mainFixture(f);
  assert(g.requestStationIntent(f.service.intent(P + 'apply'))); assert.equal(f.careers.promotionSummary().application.stage, 'submitted');
  assert(counts.resolve > 0 && counts.prepare > 0 && counts.execute > 0);
  f.flags.meeting = false; assert(g.requestStationIntent(f.service.intent(P + 'review'))); assert(f.service.isWaiting());
  const stop = counts.royalStop, other = counts.otherStop, old = counts.oldCourtStop, end = counts.socialEnd;
  f.flags.meeting = true; f.tick(1);
  assert.equal(counts.royalStop, stop, 'own appointment survives resume'); assert.equal(counts.socialEnd, end, 'own shared social lease survives resume');
  assert(counts.otherStop > other && counts.oldCourtStop > old, 'other personnel work and ordinary work are stopped');
  assert.equal(f.flags.held, true); assert.equal(f.service.state().activity, 'review-approach'); assert.equal(g.pendingInteraction.provider, 'china-personnel-appointment');
  const selected = g.pendingInteraction, before = counts.execute; f.player.root.position.set(...selected.position); g.startInteraction(selected);
  assert.equal(counts.execute, before + 1); assert.equal(f.service.state().activity, 'review'); assert.equal(g.pendingInteraction, null);
  f.tick(4); assert.equal(f.careers.promotionSummary().application.stage, 'document-ready');
  const stale = {...selected, intentKey: 'obsolete'}; assert.equal(g.resolvePlayerIntent(stale), null); const calls = counts.execute; g.startInteraction(stale); assert.equal(counts.execute, calls);
  f.dispose();
}

// Main's normal E handler, context work-stop, explicit panel cancel and general
// cancellation clear an in-flight royal route even when its immediate runtime
// cancellation save fails. The application itself is not withdrawn.
for (const save of [true, false]) for (const method of ['keyboard', 'context', 'panel', 'escape']) {
  const f = fixture(); f.receive(); f.execute('imperial-review');
  const {globals: g} = mainFixture(f), row = copy(f.careers.promotionSummary().application), selected = f.service.intent(P + 'imperial-review');
  g.path = [new T.Vector3(...PUBLIC_PLAYER)]; g.targetStation = selected; g.pendingInteraction = selected; f.flags.save = save;
  assert.equal(g.currentControl().intentKey, 'work');
  if (method === 'keyboard') {let prevented = false; g.keydown({code: 'KeyE', repeat: false, preventDefault() {prevented = true;}}); assert(prevented);}
  if (method === 'context') assert.equal(g.executeNearbyAction(g.currentControl()), save);
  if (method === 'panel') assert.equal(g.requestStationIntent(f.service.intent(P + 'cancel')), save);
  if (method === 'escape') g.keydown({code: 'Escape', repeat: false, preventDefault() {}});
  assert.equal(f.service.isActing(), false, method); assert.equal(f.service.state().royalOwner, null, method);
  assert.equal(g.path.length, 0, method); assert.equal(g.targetStation, null, method); assert.equal(g.pendingInteraction, null, method);
  assert.deepEqual(f.careers.promotionSummary().application, row, method); f.dispose();
}

// Unreachable and stale main arrival callbacks cannot keep/reacquire the
// original Lu lease or finish a review remotely after cancellation.
{
  const f = fixture(); f.apply(); const {globals: g} = mainFixture(f); g.planPath = () => [];
  assert.equal(g.requestStationIntent(f.service.intent(P + 'review')), false); assert.equal(f.flags.held, false); assert.equal(f.service.isActing(), false);
  g.planPath = (_from, to) => [to]; assert(g.requestStationIntent(f.service.intent(P + 'review'))); const queued = g.pendingInteraction;
  assert(f.flags.held); g.startInteraction({...queued, intentKey: 'old-callback'}); assert.equal(f.flags.held, false); assert.equal(f.service.isActing(), false);
  assert.equal(g.pendingInteraction, null); assert.equal(g.path.length, 0); assert.equal(f.careers.promotionSummary().application.stage, 'submitted'); f.dispose();
}

// The actual old court adapter yields the same original paper throughout the
// new route, while legacy first-promotion paper ownership stays unchanged.
function oldCourt(f, careers = f.careers) {
  return createChinaCourtCareer({careers, audience: {state: () => ({phase: 'waiting', schedule: {day: f.clock.day, outcome: 'completed'}})},
    getPlayer: () => f.player, getClock: () => f.clock, documentObject: f.paper});
}
{
  const f = fixture(), old = oldCourt(f); f.apply(); old.update(0); assert.equal(f.paper.parent, f.home);
  f.execute('review'); f.tick(4); old.update(0); assert.equal(f.paper.parent, f.home);
  f.execute('receive-document'); const paperId = f.paper.userData.applicationId;
  for (let index = 0; index < 3; index++) {old.update(.1); f.service.syncPlayer(); assert.equal(f.paper.parent, f.player.root.userData.hands[1]); assert.equal(f.paper.userData.applicationId, paperId);}
  assert.equal(old.intent('promotion-review'), null); assert.equal(old.intent('promotion-appointment'), null);
  f.execute('imperial-review'); f.realPalace.ready(); f.tick(4); old.update(.1); assert.equal(f.paper.parent, f.player.root.userData.hands[1]);
  f.execute('appointment'); f.tick(3); old.update(.1); assert.equal(f.paper.parent, f.home); assert.equal(f.careers.currentRole().rankId, 'cn-records-personnel');
  old.dispose(); f.dispose();
}
{
  const f = fixture(), legacy = createFormalCareers({...f.careerOptions, saved: f.legacyHeldCareer}), old = oldCourt(f, legacy);
  assert.equal(legacy.state().loadError, null); old.update(0); const id = legacy.promotionSummary().application.appointment.id;
  assert.equal(f.paper.parent, f.player.root.userData.hands[1]); assert.equal(f.paper.userData.applicationId, id);
  f.service.syncPlayer(); assert.equal(f.paper.parent, f.player.root.userData.hands[1], 'inactive new adapter cannot take legacy paper');
  assert(old.intent('promotion-appointment')); old.dispose(); f.dispose();
}
console.log('PASS extracted actual main royal dispatch/resume/provider/E/context/panel cancellation and original/legacy paper ownership; no renderer/world boot');

// A pending royal application never takes the next ordinary court shift's
// approach back. Both explicit cancellation and direct attend selection retain
// the original case/draw while the actual court adapter owns the new duty.
for (const explicitCancel of [false, true]) {
  const f = fixture(); f.receive(); f.execute('imperial-review'); const row = copy(f.careers.promotionSummary().application);
  const old = oldCourt(f), {globals: g} = mainFixture(f); g.chinaCareer = old;
  if (explicitCancel) assert(g.requestStationIntent(f.service.intent(P + 'cancel')));
  Object.assign(f.clock, {day: 8, hour: 10}); f.careers.observeDay();
  const attend = old.intent('attend'); assert(attend); assert(g.requestStationIntent(attend));
  assert.equal(f.service.isActing(), false); assert.equal(g.pendingInteraction.provider, 'china-court-career'); assert.equal(g.pendingInteraction.kind, 'attend');
  const path = g.path; f.tick(5); assert.equal(g.path, path); assert.equal(g.pendingInteraction.kind, 'attend');
  f.player.root.position.set(...attend.position); g.startInteraction(attend); assert.equal(old.isActing(), true); assert.equal(f.careers.workState().lastDuty.stage, 'arrived');
  f.tick(3); assert.equal(g.pendingInteraction, null); assert.equal(f.service.isActing(), false); assert.equal(old.isActing(), true);
  assert.deepEqual(f.careers.promotionSummary().application, row); old.dispose({suspend: true}); f.dispose();
}
console.log('PASS cancelled royal wait never steals actual next-day court attendance or changes the pending case/draw');

// Execute the exact continuity approach fence after controller restoration.
// Waiting controllers must reacquire leases; stale completed callbacks have no
// pending intent; valid non-waiting reads may still use their saved destination.
const restoreApproach = section(' const personnelApproach=activity.pending?.provider', '\n if(activity.bathTransition)');
for (const provider of ['china-personnel-appointment', 'china-personnel-career']) for (const mode of ['waiting', 'stale', 'reading']) {
  const original = {provider, id: 'saved-personnel-approach'}, destination = [22.48, .215, 32.25]; let planned = 0;
  const context = {activity: {pending: original, target: original, destination}, player: {root: {position: new T.Vector3()}},
    path: [new T.Vector3(1, 0, 1)], targetStation: original, pendingInteraction: mode === 'stale' ? null : original, seated: null,
    chinaPersonnelAppointment: {isWaiting: () => mode === 'waiting'}, chinaPersonnelCareer: {isWaiting: () => mode === 'waiting'},
    planPath: (_from, to) => {planned++; return [new T.Vector3(to.x, to.y, to.z)];}};
  vm.runInNewContext(restoreApproach, context);
  assert.equal(planned, mode === 'reading' ? 1 : 0, provider + ':' + mode);
  if (mode === 'reading') {assert.equal(context.pendingInteraction, original); assert.deepEqual(context.path[0].toArray(), destination);}
  else {assert.equal(context.path.length, 0); assert.equal(context.pendingInteraction, null); assert.equal(context.targetStation, null);}
}
console.log('PASS actual main continuity fence for both personnel providers: wait/stale routes cleared, valid read approach restored');

// Actual main's source reader works cold/outside China, validates continuity
// headers before trusting them, and never exposes an uncommitted candidate as
// promotion eligibility ahead of the committed journal getter.
{
  const f = fixture(), job = f.trialCase, query = {mode: 'trial', officialTenureId: job.officialTenureId, day: job.day};
  const saved = {chinaPersonnelCareer: {work: f.trialWork}, chinaAudience: {personnelRecords: f.trialRecords}};
  const context = {saved, personnelRuntimeBridge: null, personnelSavedSourceRef: null, personnelSavedSourceReader: null,
    createChinaPersonnelRecords, validateChinaPersonnelWorkCase, personnelSame, structuredClone};
  vm.createContext(context); vm.runInContext(section('function readPersonnelCase(', 'function personnelPromotionActor('), context);
  assert.deepEqual(context.readPersonnelCase(query), job, 'cold/non-China reads the full saved original case');
  saved.worldContinuity = {version: 1, regions: {china: {version: 1, region: 'china', controllers: {chinaPersonnelCareer: {work: {cases: []}}}}}};
  assert.equal(context.readPersonnelCase(query), null, 'valid continuity empty state wins over stale top data');
  saved.worldContinuity.version = 2; assert.deepEqual(context.readPersonnelCase(query), job, 'unknown root version cannot override top');
  saved.worldContinuity.version = 1; saved.worldContinuity.regions.china.version = 2; assert.deepEqual(context.readPersonnelCase(query), job);
  saved.worldContinuity.regions.china.version = 1; saved.worldContinuity.regions.china.region = 'japan'; assert.deepEqual(context.readPersonnelCase(query), job);
  const original = createChinaPersonnelRecords({saved: f.trialRecords}); let committed = {cases: []}, candidatesRead = 0;
  context.personnelRuntimeBridge = {work: () => ({personnelWorkState: () => copy(committed), snapshot: () => {candidatesRead++; return {work: f.trialWork};}}),
    source: (day, serial) => original.sourceFor(day, serial)};
  assert.equal(context.readPersonnelCase(query), null); assert.equal(candidatesRead, 0, 'uncommitted snapshot cannot stand in for committed getter');
  committed = f.trialWork; assert.deepEqual(context.readPersonnelCase(query), job);
  context.personnelRuntimeBridge.source = (day, serial) => Object.fromEntries(Object.entries(original.sourceFor(day, serial)).reverse());
  assert.deepEqual(context.readPersonnelCase(query), job, 'canonical source comparison is independent of key insertion order');
  context.personnelRuntimeBridge.source = () => null; assert.equal(context.readPersonnelCase(query), null); f.dispose();
}
console.log('PASS actual main personnel reader: cold/non-China saved originals, versioned continuity, committed getter fencing and canonical source matching');

// The real direct-nearby shortcut can be selected during a moving frame. Keep
// that exact logical personnel intent for the next idle arrival rather than
// consuming a failed stand-still check. Normal routed arrival already resets
// player.walking at the start of updatePlayer and waits until !moving.
for (const type of ['apply', 'receive-document']) {
  const f = fixture(); if (type === 'receive-document') f.recommend();
  const {globals: g, counts} = mainFixture(f), selected = f.service.intent(P + type); f.player.root.position.set(...selected.position); f.player.walking = true;
  const before = counts.execute; assert(g.requestStationIntent(selected)); assert.equal(counts.execute, before);
  const parked = g.pendingInteraction; assert.equal(parked.id, selected.id); assert.equal(parked.intentKey, selected.intentKey); assert.equal(g.targetStation, parked); assert.equal(g.path.length, 0);
  f.player.walking = false; g.dispatchPlayerArrival(); assert.equal(counts.execute, before + 1); assert.equal(g.pendingInteraction, null);
  assert.equal(f.careers.promotionSummary().application.stage, type === 'apply' ? 'submitted' : 'document-held'); f.dispose();
}
{
  const f = fixture(), {globals: g} = mainFixture(f), selected = {id: 'cn-personnel-claim', provider: 'china-personnel-career', kind: 'personnel-claim', intentKey: 'original-trial', position: f.player.root.position.toArray(), executionRadius: .18};
  let executed = 0; g.chinaPersonnelCareer = {resolveIntent: value => value.id === selected.id ? selected : null, prepareIntent: () => true, isWaiting: () => false, stopActivity: () => true, executeIntent: value => {assert.equal(value, selected); executed++;}};
  f.player.walking = true; assert(g.requestStationIntent(selected)); assert.equal(executed, 0); assert.equal(g.pendingInteraction, selected);
  f.player.walking = false; g.dispatchPlayerArrival(); assert.equal(executed, 1); assert.equal(g.pendingInteraction, null); f.dispose();
}
{
  const f = fixture(), old = oldCourt(f), {globals: g} = mainFixture(f); let executed = 0;
  g.chinaCareer = {...old, executeIntent: selected => {executed++; return old.executeIntent(selected);}};
  const selected = old.intent('view'); f.player.root.position.set(...selected.position); f.player.walking = true;
  assert(g.requestStationIntent(selected)); assert.equal(executed, 1, 'non-personnel nearby behavior remains unchanged'); assert.equal(g.pendingInteraction, null); old.dispose(); f.dispose();
}
console.log('PASS actual main direct moving-frame personnel intent defers once to idle dispatch; old court view unaffected');
