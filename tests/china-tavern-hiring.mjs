// Dormant journal boundaries, using explicit source-receipt fixtures. This is
// not a scene trial, an NPC skill grant, physical handoff, or payroll test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChinaTavernHiring,hiringApplicationFromSnapshot,TAVERN_HIRING_BUSINESS_ID as BUSINESS,TAVERN_HIRING_ROLES as ROLES,
 TAVERN_TRIAL_TABLE_IDS as TABLES} from '../source/game/china-tavern-hiring.js';
const clone = structuredClone, WEST = 'cn-tavern-diner-west', EAST = 'cn-tavern-diner-east';
const names = {[WEST]:'顾谨',[EAST]:'周棠','cn-tavern-host':'许安','cn-tavern-cook':'沈禾','cn-tavern-assistant':'陆青'};
const equal = (a,b) => { try { assert.deepEqual(a,b); return true; } catch { return false; } };
function fixture(saved=null,shared=null) {
 const source = shared ?? {
  owner:{ownerId:'player',ownership:2,revision:40},
  actors:Object.fromEntries(Object.entries(names).map(([actorId,name])=>[actorId,{actorId,name,bodyId:actorId,
   ageYears:[WEST,EAST].includes(actorId)?29:35,alive:true,willing:true,protected:false,currentRoleId:null,
   willingness:{id:'consent:'+actorId,revision:1}}])),
  slots:Object.fromEntries(Object.values(ROLES).map(r=>[r.roleId,{roleId:r.roleId,slotId:r.slotId,revision:3,holderId:null,tenureHolderId:null}])),
  qualification:new Map(),work:new Map(),payment:new Map(),safe:true,safeRevision:1,
  money:{business:120,player:0,npc:0},xp:{player:0,npc:0},bodyMoves:0,
 };
 const flags = {save:null,read:null}, durable = {hiring:clone(saved),joint:null,writes:0};
 const options = {saved,
  saveState:next=>{ if(flags.save) return flags.save(next); durable.hiring=clone(next); durable.writes++; return true; },
  readOwner:()=>flags.read ? flags.read() : clone(source.owner),
  readCandidate:id=>clone(source.actors[id]??null),readSlot:id=>clone(source.slots[id]??null),
  verifyQualification:(p,a)=>equal(source.qualification.get(p.receiptId),p) && p.actorId===a.actor.actorId && p.roleId===a.roleId,
  verifyTrialReceipt:(kind,p,a)=>equal(source[kind].get(p.id),p) && p.applicationId===a.id && p.bodyId===a.actor.bodyId,
  readSafeHandoff:a=>source.safe ? {id:'handoff:'+a.id,sourceId:'physical-release-fixture',sourceRevision:source.safeRevision,
   businessId:BUSINESS,applicationId:a.id,actorId:a.actor.actorId,bodyId:a.actor.bodyId,slotId:a.slotId,slotRevision:a.slotRevision,
   customerReleaseReceiptId:'customer-release:'+a.id,destinationReleaseReceiptId:'destination-release:'+a.id} : null,
 };
 const hiring=createChinaTavernHiring(options);
 const input = (applicationId,extra={}) => ({applicationId,expectedRevision:hiring.snapshot().revision,by:'player',...extra});
 const submit = (actorId=WEST,roleId=ROLES.assistant.roleId,extra={}) => {
  const n=source.actors[actorId];
  return hiring.submit({actorId,roleId,bodyId:n?.bodyId??actorId,bodyRevision:n?.bodyRevision,
   willingnessRevision:n?.willingness?.revision,expectedRevision:hiring.snapshot().revision,...extra});
 };
 const qualified = (id,kind='existing-qualification') => {
  const a=hiring.application(id),proof={kind,sourceId:'existing-source-fixture',sourceRevision:1,receiptId:'qualification:'+id,
   actorId:a.actor.actorId,bodyId:a.actor.bodyId,roleId:a.roleId};source.qualification.set(proof.receiptId,clone(proof));return proof;
 };
 const work = id => {
  const a=hiring.application(id),proof={id:'work:'+id,sourceId:'completed-cleaning-fixture',sourceRevision:4,
   businessId:BUSINESS,applicationId:id,trialId:a.trial.request.id,actorId:a.actor.actorId,bodyId:a.actor.bodyId,
   steps:TABLES.map((tableId,i)=>({id:'clean:'+id+':'+i,tableId,startedSeconds:100+i*8,completedSeconds:105+i*8}))};
  source.work.set(proof.id,clone(proof));return proof;
 };
 const payment = id => {
  const a=hiring.application(id),proof={...a.trial.request.remuneration,sourceId:'business-payment-fixture',sourceRevision:8,trialId:a.trial.request.id};
  source.payment.set(proof.id,clone(proof));return proof;
 };
 const trial = () => {
  const r=submit();assert(r.ok);const id=r.application.id;
  assert(hiring.requestTrial(input(id)).ok);const p=work(id);assert(hiring.completeTrial(input(id,{proof:p})).ok);return id;
 };
 const approve = (id,proof) => hiring.review(input(id,{decision:'approve',...(proof?{qualification:proof}:{})}));
 return {hiring,source,flags,durable,options,input,submit,qualified,work,payment,trial,approve};
}

// Candidate identity, current willingness and adulthood are source facts. Missing
// facts cannot borrow player skills or silently recruit an unrelated NPC.
for(const mutate of [n=>{n.alive=false;},n=>{n.ageYears=17;},n=>{delete n.ageYears;},n=>{n.willing=false;},
 n=>{delete n.willing;},n=>{n.protected=true;},n=>{delete n.protected;},n=>{n.currentRoleId='cn-clinic-physician';},
 n=>{delete n.currentRoleId;},n=>{delete n.willingness;},n=>{n.name='replacement';}]) {
 const f=fixture();mutate(f.source.actors[WEST]);assert(!f.submit().ok);assert.equal(f.hiring.snapshot().revision,0);assert.equal(f.durable.writes,0);
}
for(const id of ['player','cn-clinic-physician','cn-court-clerk','invented-person']) {
 const f=fixture();assert.equal(f.submit(id).code,'protected-or-unknown-applicant');
}
for(const change of [s=>{s.holderId='cn-tavern-assistant';},s=>{s.tenureHolderId='player';},s=>{delete s.tenureHolderId;},s=>{s.revision=Number.MAX_SAFE_INTEGER;}]) {
 const f=fixture();change(f.source.slots[ROLES.assistant.roleId]);assert(!f.submit().ok);
}
for(const name of ['readOwner','readCandidate','readSlot']) {
 const f=fixture();delete f.options[name];const c=createChinaTavernHiring(f.options);
 assert(!c.submit({actorId:WEST,roleId:ROLES.assistant.roleId,bodyId:WEST,willingnessRevision:1,expectedRevision:0}).ok);
}
for(const reader of [()=>null,()=>Promise.resolve({ownerId:'player',ownership:2}),()=>{throw Error('offline');}]) {
 const f=fixture();f.flags.read=reader;assert(!f.submit().ok);assert.equal(f.durable.writes,0);
}
{
 const f=fixture();f.source.owner.ownerId='cn-tavern-host';assert.equal(f.submit().code,'player-owner-required');
}

// Every ordinary transition has a strict synchronous durable boundary and a
// detached snapshot. False/object/undefined/throw/Promise never advance it.
const badSaves=[()=>false,()=>undefined,()=>({ok:false}),()=>({ok:true}),()=>{throw Error('quota');},
 ()=>Promise.resolve(true),()=>Promise.reject(Error('quota'))];
const stages=[
 f=>()=>f.submit(),
 f=>{const id=f.submit().application.id;return ()=>f.hiring.requestTrial(f.input(id));},
 f=>{const id=f.submit().application.id;f.hiring.requestTrial(f.input(id));const proof=f.work(id);return ()=>f.hiring.completeTrial(f.input(id,{proof}));},
 f=>{const id=f.trial(),proof=f.payment(id);return ()=>f.hiring.recordTrialPayment(f.input(id,{proof}));},
 f=>{const id=f.trial();return ()=>f.approve(id);},
 f=>{const id=f.submit().application.id;return ()=>f.hiring.review(f.input(id,{decision:'reject',reason:'owner-declined'}));},
 f=>{const id=f.submit().application.id;return ()=>f.hiring.cancel(f.input(id,{reason:'owner-cancelled'}));},
];
for(const stage of stages) for(const save of badSaves) {
 const f=fixture(),perform=stage(f),before=f.hiring.snapshot(),stored=clone(f.durable.hiring);
 f.flags.save=save;assert(!perform().ok);assert.deepEqual(f.hiring.snapshot(),before);assert.deepEqual(f.durable.hiring,stored);
 f.flags.save=null;assert(perform().ok);await Promise.resolve();
}
{
 const f=fixture();let nested;
 f.flags.save=next=>{assert.equal(f.hiring.snapshot().revision,0);nested=f.submit(EAST);f.durable.hiring=clone(next);return true;};
 assert(f.submit().ok);assert.equal(nested.code,'hiring-busy');assert.deepEqual(f.hiring.snapshot(),f.durable.hiring);
 const detached=f.hiring.snapshot();detached.events[0].data.actor.name='renamed';assert.equal(f.hiring.application('cn-tavern-application-1').actor.name,'顾谨');
 f.flags.save=null;f.flags.read=()=>{assert.equal(f.submit(EAST).code,'hiring-busy');return f.source.owner;};
 assert(f.submit(EAST).ok);
}

// Request, observed work and paid remuneration are separate durable facts.
// Unpaid real work qualifies; a payment alone never manufactures experience.
{
 const f=fixture(),id=f.submit().application.id;
 assert.equal(f.approve(id).code,'qualification-required');assert(f.hiring.requestTrial(f.input(id)).ok);
 const requested=f.hiring.application(id);assert.equal(requested.trial.request.remuneration.amount,12);
 assert.equal(requested.trial.request.remuneration.funding,'business');
 const rev=f.hiring.snapshot().revision;assert(f.hiring.requestTrial(f.input(id)).replayed);assert.equal(f.hiring.snapshot().revision,rev);
 assert.equal(f.approve(id).code,'trial-incomplete');
 assert(!f.hiring.recordTrialPayment(f.input(id,{proof:f.payment(id)})).ok);
 const work=f.work(id);
 for(const mutate of [p=>{p.steps[1].tableId=p.steps[0].tableId;},p=>{p.steps[1].id=p.steps[0].id;},
  p=>{p.steps[0].completedSeconds=104;},p=>{p.steps[1].startedSeconds=102;},p=>{p.bodyId=EAST;},
  p=>{p.actorId=EAST;},p=>{p.businessId='another-business';},p=>{p.applicationId='other-application';},
  p=>{p.steps=2;},p=>{p.completedTables=2;},p=>{p.trialId='other-trial';}]) {
  const bad=clone(work);mutate(bad);assert(!f.hiring.completeTrial(f.input(id,{proof:bad})).ok);
 }
 f.source.work.delete(work.id);assert(!f.hiring.completeTrial(f.input(id,{proof:work})).ok);
 f.source.work.set(work.id,clone(work));assert(f.hiring.completeTrial(f.input(id,{proof:work})).ok);
 const afterWork=f.hiring.snapshot();assert(f.hiring.completeTrial(f.input(id,{proof:work})).replayed);assert.deepEqual(f.hiring.snapshot(),afterWork);
 assert(f.approve(id).ok);let a=f.hiring.application(id);assert.equal(a.status,'pending-safe-handoff');assert.equal(a.trial.payment,null);
 assert.equal(a.decision.qualification.kind,'trial-work');assert.equal(a.decision.salary.baseDailyWage,16);
 assert.deepEqual(a.decision.salary.excludedTrial,{id:a.trial.request.id,startedSeconds:100,completedSeconds:113});
 assert.equal(a.decision.salary.prorating,'floor(baseDailyWage*min(1,actualCoveredHours/12)+1e-9)');
 assert.equal(a.decision.salary.preparationBonusCondition,'actualCoveredHours>=12-1e-9');
 assert.equal(f.source.slots[a.roleId].holderId,null,'approval never calls role assignment');
 const payment=f.payment(id);
 for(const mutate of [p=>{p.amount=24;},p=>{p.currency='cash';},p=>{p.funding='player';},p=>{p.id+=':again';},p=>{p.bodyId=EAST;}]) {
  const bad=clone(payment);mutate(bad);assert(!f.hiring.recordTrialPayment(f.input(id,{proof:bad})).ok);
 }
 assert(f.hiring.recordTrialPayment(f.input(id,{proof:payment})).ok);const paid=f.hiring.snapshot();
 assert(f.hiring.recordTrialPayment(f.input(id,{proof:payment})).replayed);assert.deepEqual(f.hiring.snapshot(),paid);
 assert.equal(f.approve(id).code,'application-not-open');
 const reload=fixture(paid,f.source);assert.equal(reload.hiring.loadError,null);assert.deepEqual(reload.hiring.snapshot(),paid);
 assert(reload.hiring.completeTrial(reload.input(id,{proof:work})).replayed);assert(reload.hiring.recordTrialPayment(reload.input(id,{proof:payment})).replayed);
 assert.deepEqual(f.source.money,{business:120,player:0,npc:0});assert.deepEqual(f.source.xp,{player:0,npc:0});assert.equal(f.source.bodyMoves,0);
}

// Only authoritative qualification evidence works. The exact original chef can
// present original incumbency; no trial can turn a diner into a qualified chef.
for(const [key,r] of Object.entries(ROLES)) {
 const f=fixture(),id=f.submit(r.originalHolderId,r.roleId).application.id;
 assert.equal(f.approve(id).code,'qualification-required');const proof=f.qualified(id,'existing-incumbency');assert(f.approve(id,proof).ok);
 const contract=f.hiring.application(id).decision.salary;assert.equal(contract.baseDailyWage,r.wage);
 assert.equal(contract.origin,key==='host'?'new-npc-operating-default':'existing-formal-role');assert.equal(contract.preparationBonus,1);
}
{
 const f=fixture(),id=f.submit(WEST,ROLES.chef.roleId).application.id;
 assert.equal(f.hiring.requestTrial(f.input(id)).code,'trial-unavailable');
 assert.equal(f.approve(id,f.qualified(id,'existing-incumbency')).code,'qualification-required');
 const proof=f.qualified(id);f.source.qualification.clear();assert(!f.approve(id,proof).ok);
 f.source.qualification.set(proof.receiptId,clone(proof));assert(f.approve(id,proof).ok,'synthetic source qualification accepted only when independently verified');
}

// Owner transfer stales approval/handoff, ordinary property income does not.
// Identity/consent/slot revisions are current source facts at every grant.
for(const mutate of [f=>{f.source.owner.ownership++;},f=>{f.source.owner.ownerId='cn-tavern-host';},
 f=>{f.source.actors[WEST].bodyId='another-body';},f=>{f.source.actors[WEST].bodyRevision=1;},
 f=>{f.source.actors[WEST].willingness.revision++;},f=>{f.source.actors[WEST].alive=false;},
 f=>{f.source.actors[WEST].willing=false;},f=>{f.source.slots[ROLES.assistant.roleId].revision++;},
 f=>{f.source.slots[ROLES.assistant.roleId].tenureHolderId='player';}]) {
 const f=fixture(),id=f.trial(),before=f.hiring.snapshot();mutate(f);assert(!f.approve(id).ok);assert.deepEqual(f.hiring.snapshot(),before);
}
{
 const f=fixture();f.source.actors[WEST].bodyRevision=7;const id=f.trial();f.source.owner.revision+=100;assert(f.approve(id).ok);
 f.source.actors[WEST].bodyRevision++;assert(!f.hiring.prepareHandoff(f.input(id)).ok);
}
{
 const f=fixture(),first=f.submit().application.id;assert.equal(f.submit().code,'applicant-already-pending');
 const second=f.submit(EAST).application.id;assert(f.approve(first,f.qualified(first)).ok);
 assert.equal(f.approve(second,f.qualified(second)).code,'hiring-reservation-conflict');
 assert(f.hiring.cancel(f.input(first,{reason:'owner-cancelled'})).ok);assert(f.approve(second,f.qualified(second)).ok);
 assert.equal(f.hiring.application(first).status,'cancelled');assert.equal(f.hiring.applications().length,2);
}
{
 const f=fixture(),id=f.submit().application.id;f.source.actors[EAST].bodyId=WEST;assert.equal(f.submit(EAST).code,'applicant-already-pending');
 assert.equal(f.hiring.review(f.input(id,{by:EAST,decision:'reject',reason:'no'})).code,'owner-review-required');
 assert(f.hiring.review(f.input(id,{decision:'reject',reason:'owner-declined'})).ok);assert.equal(f.hiring.application(id).status,'rejected');
 assert.equal(f.hiring.cancel(f.input(id,{reason:'late'})).code,'application-not-open');
 f.source.actors[EAST].bodyId=EAST;assert(f.submit(WEST).ok,'a rejected applicant can make a distinct later application');
}
{
 const f=fixture(),id=f.submit().application.id;f.hiring.requestTrial(f.input(id));const proof=f.work(id);
 f.source.owner.ownership++;assert(f.hiring.cancel(f.input(id,{reason:'old-owner-application'})).ok);
 assert(f.hiring.completeTrial(f.input(id,{proof})).ok,'verified historical work is retained after cancellation');
 assert(f.hiring.recordTrialPayment(f.input(id,{proof:f.payment(id)})).ok,'owed remuneration remains reconcilable');
 assert.equal(f.hiring.application(id).status,'cancelled');assert(!f.approve(id).ok);
}
{
 const f=fixture(),id=f.submit().application.id;f.source.actors[WEST].willing=false;
 assert(f.hiring.cancel(f.input(id,{by:WEST,reason:'applicant-withdrew'})).ok,'withdrawal never requires continued willingness');
}

// Safe handoff candidates cannot reserve/adopt a body early. The extra save()
// boundary requires one joint durable role+journal write before committed().
{
 const f=fixture(),id=f.trial();assert(f.approve(id).ok);f.source.safe=false;
 assert.equal(f.hiring.prepareHandoff(f.input(id)).code,'handoff-unsafe');f.source.safe=true;
 const p=f.hiring.prepareHandoff(f.input(id)),before=f.hiring.snapshot();assert(p.ok);assert(!p.committed());assert(p.valid());
 assert.equal(f.source.slots[ROLES.assistant.roleId].holderId,null);assert.deepEqual(f.hiring.snapshot(),before);
 p.patch.chinaTavernHiring.events.length=0;p.assignment.holderId=EAST;assert(p.lock());assert(!p.committed());
 assert.equal(f.hiring.cancel(f.input(id,{reason:'reentrant'})).code,'hiring-busy');
 let writes=0;
 assert(p.save(bundle=>{
  assert.equal(bundle.assignment.holderId,WEST);assert(bundle.patch.chinaTavernHiring.events.length>0);
  assert.deepEqual(f.hiring.snapshot(),before);assert(!p.committed());assert(!p.release());assert(!p.save(()=>true));
  assert.equal(f.submit(EAST).code,'hiring-busy');f.durable.joint=clone(bundle);writes++;return true;
 }));
 assert.deepEqual(f.hiring.snapshot(),before);assert(!p.release(),'durable candidate cannot be dropped before adoption');assert(p.committed());assert(p.committed());assert(p.release());
 assert.equal(writes,1);assert.deepEqual(f.hiring.snapshot(),f.durable.joint.patch.chinaTavernHiring);
 // Simulate the OTHER role participant adopting only after the same joint save.
 f.source.slots[ROLES.assistant.roleId]={...f.durable.joint.assignment,tenureHolderId:null};f.source.actors[WEST].currentRoleId=ROLES.assistant.roleId;
 assert.equal(f.hiring.application(id).status,'assigned');assert(!f.hiring.prepareHandoff(f.input(id)).ok);assert(!f.submit().ok);
 const reload=fixture(f.hiring.snapshot(),f.source);assert.equal(reload.hiring.loadError,null);assert.equal(reload.hiring.application(id).status,'assigned');
 assert.deepEqual(f.source.money,{business:120,player:0,npc:0});assert.deepEqual(f.source.xp,{player:0,npc:0});assert.equal(f.source.bodyMoves,0);
}
for(const badSave of badSaves) {
 const f=fixture(),id=f.trial();f.approve(id);const before=f.hiring.snapshot(),p=f.hiring.prepareHandoff(f.input(id));
 assert(p.lock());assert(!p.save(badSave));assert(!p.committed());assert.deepEqual(f.hiring.snapshot(),before);assert(p.release());
 const retry=f.hiring.prepareHandoff(f.input(id));assert(retry.lock());assert(retry.save(bundle=>{f.durable.joint=clone(bundle);return true;}));assert(retry.committed());assert(retry.release());await Promise.resolve();
}
for(const mutate of [f=>{f.source.owner.ownership++;},f=>{f.source.actors[WEST].willing=false;},f=>{f.source.actors[WEST].bodyId='changed';},
 f=>{f.source.slots[ROLES.assistant.roleId].holderId=EAST;},f=>{f.source.slots[ROLES.assistant.roleId].revision++;},
 f=>{f.source.safe=false;},f=>{f.source.safeRevision++;},f=>{f.source.work.clear();}]) {
 const f=fixture(),id=f.trial();f.approve(id);const p=f.hiring.prepareHandoff(f.input(id));assert(p.ok);mutate(f);assert(!p.valid());assert(!p.lock());assert(!p.committed());
}
{
 const f=fixture(),id=f.trial();f.approve(id);const p=f.hiring.prepareHandoff(f.input(id));assert(p.lock());f.source.owner.ownership++;
 let writes=0;assert(!p.save(()=>{writes++;return true;}));assert.equal(writes,0);assert(!p.committed());assert(p.release());
}
{
 const f=fixture(),id=f.trial();f.approve(id);const first=f.hiring.prepareHandoff(f.input(id)),second=f.hiring.prepareHandoff(f.input(id));
 assert(first.lock());assert(!second.lock());assert(first.save(()=>true));assert(first.committed());assert(first.release());assert(!second.valid());assert(!second.lock());
}

// Corrupt or source-unverifiable saved histories remain inspectable but cannot
// silently become a fresh journal or mint a replacement body/receipt/contract.
{
 const f=fixture(),id=f.trial();f.approve(id);f.hiring.recordTrialPayment(f.input(id,{proof:f.payment(id)}));const good=f.hiring.snapshot();
 assert.deepEqual(hiringApplicationFromSnapshot(good,id),f.hiring.application(id));assert.equal(hiringApplicationFromSnapshot(undefined,id),null);
 const mutations=[s=>{s.revision++;},s=>{s.extra=true;},s=>{s.events[0].data.actor.name='new-name';},
  s=>{s.events[0].data.actor.actorId='cn-clinic-physician';},s=>{s.events[3].data.salary.baseDailyWage=17;},
  s=>{s.events[3].data.salary.preparationBonusCondition='always';},s=>{s.events[2].data.steps[1].tableId=TABLES[0];},
  s=>{s.events[4].data.amount=24;},s=>{s.events.push({...clone(s.events[4]),sequence:++s.revision});}];
 for(const mutate of mutations) {
  const bad=clone(good);mutate(bad);assert.throws(()=>hiringApplicationFromSnapshot(bad,id));const restored=fixture(bad,f.source);assert(restored.hiring.loadError);assert.deepEqual(restored.hiring.snapshot(),bad);assert(!restored.submit(EAST).ok);
 }
 f.source.work.clear();const unavailable=fixture(good,f.source);assert(unavailable.hiring.loadError);assert.deepEqual(unavailable.hiring.snapshot(),good);
}
{
 const f=fixture(),id=f.submit().application.id,stale=f.input(id);f.hiring.requestTrial(f.input(id));
 assert.equal(f.hiring.review({...stale,decision:'approve'}).code,'stale-hiring-revision');
}
assert(!fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8').includes('china-tavern-hiring'), 'first core remains dormant');
console.log('PASS dormant tavern hiring: owner/identity/source guards, separate real trial work and 12-copper payment evidence, immutable contracts, history/replay, durable joint handoff, zero money/XP/body writes');
