// Real actor/tool ownership plus saved receipts: guard unpaid/duplicate wages,
// stale interactions and resumed jobs without loading an entire country scene.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import {createGameStorage, PREVIEW_STORAGE_PREFIX} from '../source/game/game-storage.js';
registerHooks({resolve(id, context, next) {
  return id === 'three' ? {url: pathToFileURL(process.cwd() + '/source/vendor/three/build/three.module.js').href, shortCircuit: true} : next(id, context);
}});
const T = await import('three');
const {createFranceGardener} = await import('../source/game/france-gardener.js');
const {createFranceGardenerEmployment, GARDEN_HELPER_ROLE} = await import('../source/game/france-gardener-employment.js');
const {createFranceGardenerLabor} = await import('../source/game/france-gardener-labor.js');
const {createCurrencyLedger} = await import('../source/game/currency-ledger.js');
const {FRANCE_GARDENER: P} = await import('../source/game/france-gardener-place.js');
const {createFormalCareers,GARDEN_ASSISTANT_ROLE:ROLE}=await import('../source/game/formal-careers.js');
const {careerInterviewRoll}=await import('../source/game/career-applications.js');
const copy = value => JSON.parse(JSON.stringify(value));
function fixture(t, saved = {}) {
  const store = copy(saved), group = new T.Group(), flags = {visible: true, mounted: null, blocked: false, rejectEmployment: false, rejectLabor: false, rejectLedger: false, rejectCleanup: false};
  function person(point) {
    const root = new T.Group(), hands = [new T.Object3D(), new T.Object3D()];
    hands[0].position.set(-.16, 1.04, .27); hands[1].position.set(.19, 1.05, .37);
    root.add(...hands); root.userData.hands = hands; root.position.set(...point); group.add(root);
    return {root, route: [], characterScale: 1, walking: false, locomotion: {walkSpeed: 2}, animate() {}};
  }
  const player = person(P.registration), actor = person(P.approach); actor.station = {id: P.id, npcAction: 'garden'};
  const notices = [], requests = []; let clock = 0, labor; const sim=store.clock||{day:7,hour:8,seconds:0};
  const save = (key, rejected) => next => { if (rejected()) return false; store[key] = copy(next); };
  const ledger = createCurrencyLedger({saved: store.ledger, saveState: save('ledger', () => flags.rejectLedger)});
  let seed=1;while(careerInterviewRoll(seed,ROLE.id,sim.day)>=.6)seed++;
  const initial=createFormalCareers({getClock:()=>sim,saveState:()=>{}}).state();delete initial.loadError;delete initial.lastError;initial.skills.gardening=2;
  const careers=createFormalCareers({worldSeed:seed,saved:store.careers||initial,getClock:()=>sim,saveState:save('careers',()=>flags.rejectCareer),creditWageToBank:ledger.creditWageToBank});
  if(!store.careers){assert(careers.apply(ROLE.id,{ageYears:22}).ok);assert(careers.reviewApplication(ROLE.id,{ageYears:22,applicationId:careers.applicationResult(ROLE.id).id}).ok);}
  const gardener = createFranceGardener({npcs: [actor], lot: {group, walkableSurfaces: []},
    doors: {routeStep(route, p) { if (flags.blocked) return {waiting: true}; while (route[0] && p.distanceTo(route[0]) < .035) route.shift(); return {waypoint: route[0]}; }},
    planPath: (_a, b) => [new T.Vector3(b.x, b.y, b.z)],
    moveActor: (n, x, z) => { n.root.position.x += x; n.root.position.z += z; },
    poseContext: n => n.poseContext ??= {}, getPlayer: () => player, getBorrowedPose: () => labor?.toolPose(), worldSeed:1,getClock:()=>sim,saved:store.gardener,saveState:next=>{if(flags.rejectGarden)return false;store.gardener={...store.gardener,...copy(next)};}});
  const employment = createFranceGardenerEmployment({saved: store.employment,
    getJob: () => labor?.state().job, meetHost: () => labor.meetHost(),
    saveState: save('employment', () => flags.rejectEmployment), notify: message => notices.push(message)});
  labor = createFranceGardenerLabor({gardener, employment,careers, getPlayer: () => player, getMounted: () => flags.mounted,
    copperLedger: ledger, getClock:()=>sim, saved: store.labor, saveState: next => {
      if (flags.rejectLabor || flags.rejectCleanup && next.job === null) return false;
      store.labor = copy(next);
    }, canSee: () => flags.visible, onIntent: choice => requests.push(choice), notify: message => notices.push(message), document: null});
  const tick = (count = 1) => { for (let i = 0; i < count; i++) { clock += .1; sim.seconds+=.1;sim.hour+=.1*.7/60;store.clock=copy(sim); labor.update(.1); gardener.update(.1, clock); } };
  const until = predicate => { for (let i = 0; i < 1000 && !predicate(); i++) tick(); assert(predicate(), JSON.stringify({labor: labor.state(), gardener: gardener.state()})); };
  const move = point => { player.root.position.set(...point); player.walking = false; };
  const execute = kind => { const selected = labor.intent(kind); assert(selected, `Expected ${kind} intent`); move(selected.position); assert(labor.executeIntent(selected), `Expected ${kind} execution`); return selected; };
  const visit = kind => { const selected = execute(kind); until(() => !labor.state().waitingForHost); return selected; };
  const act = kind => { const selected = execute(kind); tick(kind === 'water' ? 51 : kind==='prune'?61:15); return selected; };
  const hire = () => { visit('apply'); assert(employment.isHired()); };
  const accept = () => { visit('accept'); assert(labor.active()); };
  const finish = () => { if (!employment.isHired()) hire(); accept(); act('take'); assert(labor.held()); act('water'); act('water'); act('return'); assert.equal(labor.state().job.stage, 'ready'); };
  t.after(() => { labor.dispose(); gardener.dispose(); });
  return {store, flags,sim,careers, group, player, actor, notices, requests, ledger, gardener, labor, employment, tick, until, move, execute, visit, act, hire, accept, finish};
}


await test('original shears and hedge persist across interruptions; actual return reviews once and leaves shift open',t=>{
 const f=fixture(t);f.accept();assert.equal(f.labor.state().job.shiftKind,'continuous');
 f.execute('choose-prune');assert.equal(f.gardener.maintenanceState().lease.kind,'prune');f.act('take');assert(f.labor.held());
 const original=copy(f.gardener.maintenanceState().lease),old=f.labor.intent('prune');
 f.execute('prune');f.tick(20);assert.equal(f.gardener.state().props.clippingsVisible,true);f.player.walking=true;f.tick();f.player.walking=false;assert.equal(f.labor.state().activity,null);assert.equal(f.gardener.maintenanceState().prune.pruned,false);
 const loaded=fixture(t,f.store);assert(loaded.labor.held());assert.deepEqual(loaded.gardener.maintenanceState().lease,original);assert.equal(loaded.gardener.loanState().tool,'shears');
 loaded.flags.rejectGarden=true;loaded.act('prune');assert.equal(loaded.gardener.maintenanceState().prune.pruned,false);loaded.flags.rejectGarden=false;loaded.act('prune');assert(loaded.gardener.maintenanceState().prune.pruned);assert.equal(loaded.careers.state().skillXP.gardening,0);assert.equal(loaded.labor.resolveIntent(old),null);
 loaded.flags.rejectGarden=true;loaded.act('return');assert(loaded.labor.held());loaded.flags.rejectGarden=false;loaded.act('return');assert(!loaded.labor.held());assert.equal(loaded.careers.state().skillXP.gardening,10);assert.equal(loaded.careers.state().lastDuty.customerReviews.length,1);assert.equal(loaded.labor.state().job.completedTasks,1);assert.equal(loaded.labor.state().job.stage,'working');assert.equal(loaded.ledger.state().balances.france.bank,0);
 assert.equal(loaded.labor.intent('choose-prune'),null);assert(loaded.labor.taskChoices().find(q=>q.kind==='choose-prune').detail.includes('今日'));
 loaded.execute('choose-water');loaded.act('take');loaded.act('water');loaded.act('water');loaded.act('return');assert.equal(loaded.careers.state().skillXP.gardening,20);assert.equal(loaded.labor.state().job.completedTasks,2,'water1 after prune1 must not be swallowed by numeric cursor');
 loaded.tick(1500);loaded.visit('end-shift');assert.equal(loaded.labor.state().job.stage,'ready');loaded.visit('claim');assert.equal(loaded.labor.state().job,null);assert(loaded.ledger.state().balances.france.bank>0);assert(loaded.ledger.state().balances.france.bank<8);assert.equal(loaded.ledger.history().filter(r=>r.action==='wage').length,1);
 const paid=fixture(t,loaded.store);assert.equal(paid.labor.intent('accept'),null);assert.equal(paid.labor.claim(),false);assert.equal(paid.careers.state().skillXP.gardening,20);
});
await test('cancel keeps original borrowed shears until physical return and permits NPC to finish same hedge',t=>{
 const f=fixture(t);f.accept();f.execute('choose-prune');f.act('take');const taskId=f.gardener.maintenanceState().lease.taskId;
 assert(f.labor.cancel());assert(f.labor.held());assert.equal(f.labor.intent('prune'),null);
 const reload=fixture(t,f.store);assert(reload.labor.held());assert.equal(reload.gardener.maintenanceState().lease.taskId,taskId);reload.act('return');assert.equal(reload.labor.state().job,null);assert.equal(reload.gardener.maintenanceState().lease,null);assert.equal(reload.gardener.maintenanceState().prune.pruned,false);assert.equal(reload.careers.state().skillXP.gardening,0);assert.equal(reload.ledger.state().balances.france.bank,0);
});

await test('split career/job and return/review writes recover the same shift and receipt without duplicate pay',t=>{
 const f=fixture(t);f.flags.rejectLabor=true;f.visit('accept');assert.equal(f.labor.state().job,null);const receiptId=f.careers.state().lastDuty.workReceiptId;assert.equal(f.careers.state().lastDuty.stage,'working');
 const loaded=fixture(t,f.store);loaded.accept();assert.equal(loaded.labor.state().job.id,receiptId);loaded.execute('choose-prune');loaded.act('take');loaded.act('prune');loaded.flags.rejectCareer=true;loaded.act('return');assert(!loaded.labor.held());assert.equal(loaded.careers.state().skillXP.gardening,0);assert.equal(loaded.gardener.workReceipts(receiptId).length,1);
 const returned=fixture(t,loaded.store);returned.tick(1);assert.equal(returned.careers.state().skillXP.gardening,10);assert.equal(returned.labor.state().job.completedTasks,1);returned.tick(1500);returned.visit('end-shift');returned.flags.rejectCleanup=true;returned.visit('claim');assert.equal(returned.careers.state().lastDuty.stage,'paid');const bank=returned.ledger.state().balances.france.bank;assert(bank>0);assert(returned.labor.state().job);
 const final=fixture(t,returned.store);final.visit('claim');assert.equal(final.labor.state().job,null);assert.equal(final.ledger.state().balances.france.bank,bank);assert.equal(final.careers.state().skillXP.gardening,10);assert.equal(final.ledger.history().filter(row=>row.action==='wage').length,1);
});
await test('an already admitted fixed-pay garden slip finishes through original watering and cannot reopen a second wage',t=>{
 const f=fixture(t);assert(f.careers.beginDuty({receiptId:'fr-garden-labor-9'}).ok);f.store.labor={version:2,serial:9,job:{id:'fr-garden-labor-9',receiptId:'fr-garden-labor-9',formalRoleId:ROLE.id,stage:'working',completedBeds:0,cancelled:false}};
 const old=fixture(t,f.store);assert.equal(old.labor.state().job.shiftKind,undefined);old.act('take');old.act('water');old.act('water');old.act('return');old.visit('claim');assert.equal(old.ledger.state().balances.france.bank,9);assert.equal(old.labor.state().job,null);assert.equal(old.labor.intent('accept'),null);
 const reload=fixture(t,old.store);assert.equal(reload.labor.intent('accept'),null);assert.equal(reload.ledger.state().balances.france.bank,9);
});
await test('a real B-bed watering from an older temporary slip remains the same maintained bed',t=>{
 const f=fixture(t);f.gardener.requestMeeting();f.until(()=>f.gardener.hostReady());assert(f.gardener.reserveTools('temporary-old'));assert(f.gardener.takeCan('temporary-old'));
 assert(f.gardener.markWateredBed('temporary-old',1));assert.equal(f.gardener.maintenanceState().water.wateredMask,2);assert.equal(f.gardener.maintenanceState().water.completedBeds,1);assert(f.gardener.returnCan('temporary-old'));f.gardener.releaseMeeting();f.accept();f.execute('choose-water');f.act('take');assert.deepEqual(f.labor.intent('water').position,P.beds[0].approach);f.act('water');assert.equal(f.gardener.maintenanceState().water.completedBeds,2);
});

await test('an expired shift can still return the original shears and close without trapping the tool or paying',t=>{
 const f=fixture(t);f.accept();f.execute('choose-prune');f.act('take');f.act('prune');f.sim.day++;f.sim.hour=8;f.sim.seconds+=24*60/.7;f.careers.observeDay();assert.equal(f.careers.state().lastDuty.stage,'missed');assert(f.labor.cancel());f.act('return');assert.equal(f.labor.state().job,null);assert.equal(f.gardener.maintenanceState().lease,null);assert.equal(f.careers.state().skillXP.gardening,0);assert.equal(f.ledger.state().balances.france.bank,0);
});
