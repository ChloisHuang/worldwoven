// Dormant owner hiring journal. No scene, career, money, XP or actor writes.
// V1 freezes these NPC operating terms; changing future terms must not rewrite
// an accepted contract. Chef/assistant amounts reuse the published roles;
// host 24 is a NEW NPC operating default, not an old player's salary entitlement.
export const TAVERN_HIRING_BUSINESS_ID = 'cn-yunlai-tavern';
export const TAVERN_HIRING_ROLES = Object.freeze({
 host: Object.freeze({roleId:'cn-tavern-host',slotId:'cn-tavern-host-rotation-1',originalHolderId:'cn-tavern-host',wage:24}),
 chef: Object.freeze({roleId:'cn-tavern-chef',slotId:'cn-tavern-chef-rotation-1',originalHolderId:'cn-tavern-cook',wage:26}),
 assistant: Object.freeze({roleId:'cn-tavern-steward',slotId:'cn-tavern-steward-1',originalHolderId:'cn-tavern-assistant',wage:16}),
});
export const TAVERN_TRIAL_TABLE_IDS = Object.freeze(['cn-tavern-labor-west','cn-tavern-labor-east']);
const PEOPLE = Object.freeze({'cn-tavern-host':'许安','cn-tavern-cook':'沈禾','cn-tavern-assistant':'陆青',
 'cn-tavern-diner-west':'顾谨','cn-tavern-diner-east':'周棠'});
const BUSINESS = TAVERN_HIRING_BUSINESS_ID, copy = structuredClone;
const integer = n => Number.isSafeInteger(n) && n >= 0;
const text = x => typeof x === 'string' && x.length > 0 && x.length <= 160;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const exact = (x, keys) => object(x) && Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x,k));
const same = (a,b) => {
 if(a === b) return true;
 if(!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
 const keys = Object.keys(a); return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b,k) && same(a[k],b[k]));
};
const roleFor = id => Object.values(TAVERN_HIRING_ROLES).find(r => r.roleId === id);
const active = a => ['submitted','pending-safe-handoff'].includes(a.status);
const error = code => { throw Error(code); };
const require = (test,code='invalid-hiring-state') => { if(!test) error(code); };
const empty = () => ({version:1,businessId:BUSINESS,revision:0,events:[]});
const actorValid = a => exact(a,['actorId','name','bodyId','bodyRevision','willingnessId','willingnessRevision']) &&
 Object.hasOwn(PEOPLE,a.actorId) && a.name === PEOPLE[a.actorId] && text(a.bodyId) &&
 (a.bodyRevision === null || integer(a.bodyRevision)) && text(a.willingnessId) && integer(a.willingnessRevision);
const ownerValid = o => exact(o,['ownerId','ownership']) && o.ownerId === 'player' && integer(o.ownership);
const sourceValid = p => text(p.sourceId) && integer(p.sourceRevision);
const bound = (p,a) => p.businessId === BUSINESS && p.applicationId === a.id && p.actorId === a.actor.actorId && p.bodyId === a.actor.bodyId;
function trialRequest(a) {
 const id = a.id + ':trial';
 return {id,tableIds:[...TAVERN_TRIAL_TABLE_IDS],remuneration:{id:id + ':payment',businessId:BUSINESS,
  applicationId:a.id,actorId:a.actor.actorId,bodyId:a.actor.bodyId,currency:'copper',amount:12,funding:'business'}};
}
function workValid(p,a) {
 if(!exact(p,['id','sourceId','sourceRevision','businessId','applicationId','trialId','actorId','bodyId','steps']) ||
  !text(p.id) || !sourceValid(p) || !bound(p,a) || p.trialId !== a.trial.request?.id || !Array.isArray(p.steps) || p.steps.length !== 2) return false;
 return new Set(p.steps.map(s => s?.id)).size === 2 && new Set(p.steps.map(s => s?.tableId)).size === 2 &&
  p.steps.every((s,i) => exact(s,['id','tableId','startedSeconds','completedSeconds']) && text(s.id) &&
   TAVERN_TRIAL_TABLE_IDS.includes(s.tableId) && Number.isFinite(s.startedSeconds) && s.startedSeconds >= 0 &&
   Number.isFinite(s.completedSeconds) && s.completedSeconds - s.startedSeconds >= 5 &&
   (!i || s.startedSeconds >= p.steps[i-1].completedSeconds));
}
function paymentValid(p,a) {
 return exact(p,['id','sourceId','sourceRevision','businessId','applicationId','trialId','actorId','bodyId','currency','amount','funding']) &&
  sourceValid(p) && bound(p,a) && p.trialId === a.trial.request?.id && p.id === a.trial.request.remuneration.id &&
  p.amount === 12 && p.currency === 'copper' && p.funding === 'business';
}
function trialQualification(a) {
 const p = a.trial.work;
 return {kind:'trial-work',sourceId:p.sourceId,sourceRevision:p.sourceRevision,receiptId:p.id,
  actorId:a.actor.actorId,bodyId:a.actor.bodyId,roleId:a.roleId};
}
function qualificationValid(p,a) {
 if(!exact(p,['kind','sourceId','sourceRevision','receiptId','actorId','bodyId','roleId']) || !sourceValid(p) || !text(p.receiptId) ||
  p.actorId !== a.actor.actorId || p.bodyId !== a.actor.bodyId || p.roleId !== a.roleId) return false;
 if(p.kind === 'trial-work') return a.roleId === TAVERN_HIRING_ROLES.assistant.roleId && !!a.trial.work && same(p,trialQualification(a));
 if(p.kind === 'existing-incumbency') return roleFor(a.roleId).originalHolderId === a.actor.actorId;
 return p.kind === 'existing-qualification'; // The source verifier checks the actual role requirements, never invented skills.
}
function salary(a) {
 return {version:1,currency:'copper',baseDailyWage:roleFor(a.roleId).wage,startHour:6,endHour:18,
  prorating:'floor(baseDailyWage*min(1,actualCoveredHours/12)+1e-9)',
  preparationBonus:1,preparationBonusCondition:'actualCoveredHours>=12-1e-9',
  origin:a.roleId === TAVERN_HIRING_ROLES.host.roleId ? 'new-npc-operating-default' : 'existing-formal-role',
  excludedTrial:a.trial.work ? {id:a.trial.request.id,startedSeconds:a.trial.work.steps[0].startedSeconds,
   completedSeconds:a.trial.work.steps[1].completedSeconds} : null};
}
function assignment(a) {
 return {version:1,roleId:a.roleId,slotId:a.slotId,holderId:a.actor.actorId,revision:a.slotRevision+1};
}
function handoffValid(p,a) {
 return exact(p,['id','sourceId','sourceRevision','businessId','applicationId','actorId','bodyId','slotId','slotRevision',
  'customerReleaseReceiptId','destinationReleaseReceiptId']) && text(p.id) && sourceValid(p) && bound(p,a) &&
  p.slotId === a.slotId && p.slotRevision === a.slotRevision && text(p.customerReleaseReceiptId) && text(p.destinationReleaseReceiptId);
}
// Replay is the schema: an impossible transition, changed contract or reused
// work/payment receipt invalidates the journal, including historical entries.
function project(state) {
 require(exact(state,['version','businessId','revision','events']) && state.version === 1 && state.businessId === BUSINESS &&
  integer(state.revision) && Array.isArray(state.events) && state.revision === state.events.length);
 const apps = new Map(), receipts = new Set();
 const unique = id => { require(!receipts.has(id)); receipts.add(id); };
 for(const [i,e] of state.events.entries()) {
  require(exact(e,['sequence','kind','applicationId','data']) && e.sequence === i+1 && text(e.applicationId));
  const d = e.data; let a = apps.get(e.applicationId);
  if(e.kind === 'submitted') {
   require(!a && e.applicationId === `cn-tavern-application-${e.sequence}` &&
    exact(d,['owner','actor','roleId','slotId','slotRevision']) && ownerValid(d.owner) && actorValid(d.actor) &&
    roleFor(d.roleId)?.slotId === d.slotId && integer(d.slotRevision) && integer(d.slotRevision+1));
   require(![...apps.values()].some(p => active(p) && (p.actor.actorId === d.actor.actorId || p.actor.bodyId === d.actor.bodyId)));
   a = {id:e.applicationId,...copy(d),status:'submitted',trial:{request:null,work:null,payment:null},decision:null,handoff:null};
   apps.set(a.id,a); continue;
  }
  require(!!a);
  if(e.kind === 'trial-requested') {
   require(a.status === 'submitted' && a.roleId === TAVERN_HIRING_ROLES.assistant.roleId && !a.trial.request && same(d,trialRequest(a)));
   a.trial.request = copy(d);
  } else if(e.kind === 'trial-completed') {
   require(a.trial.request && !a.trial.work && workValid(d,a));
   unique(d.id); for(const step of d.steps) unique(step.id); a.trial.work = copy(d);
  } else if(e.kind === 'trial-paid') {
   require(a.trial.work && !a.trial.payment && paymentValid(d,a)); unique(d.id); a.trial.payment = copy(d);
  } else if(e.kind === 'approved') {
   require(a.status === 'submitted' && exact(d,['by','qualification','salary']) && d.by === 'player' &&
    qualificationValid(d.qualification,a) && same(d.salary,salary(a)) && (!a.trial.request || a.trial.work));
   require(![...apps.values()].some(p => p.id !== a.id && p.status === 'pending-safe-handoff' &&
    (p.slotId === a.slotId || p.actor.actorId === a.actor.actorId || p.actor.bodyId === a.actor.bodyId)));
   a.decision = copy(d); a.status = 'pending-safe-handoff';
  } else if(e.kind === 'rejected' || e.kind === 'cancelled') {
   require((e.kind === 'rejected' ? a.status === 'submitted' : active(a)) && exact(d,['by','reason']) && text(d.reason) &&
    (d.by === 'player' || e.kind === 'cancelled' && d.by === a.actor.actorId));
   if(e.kind === 'rejected') a.decision = copy(d); a.status = e.kind;
  } else if(e.kind === 'assigned') {
   require(a.status === 'pending-safe-handoff' && exact(d,['proof','assignment']) && handoffValid(d.proof,a) && same(d.assignment,assignment(a)));
   unique(d.proof.id); a.handoff = copy(d); a.status = 'assigned';
  } else error('invalid-hiring-state');
 }
 return apps;
}

/**
 * All fact adapters are synchronous and READ ONLY. Missing/Promise/throwing
 * sources fail closed. Only the two original diners and three original staff
 * are eligible identities; protected officials/clinic workers are not a pool.
 *
 * readOwner() -> {ownerId, ownership}; ownership is the transfer epoch, NOT
 * property.revision (ordinary receipts must not stale an application).
 * readCandidate(actorId) -> {actorId,name,bodyId?,bodyRevision?,ageYears,alive,
 * willing,protected,currentRoleId,willingness:{id,revision}}. All flags must be
 * explicit, currentRoleId must be null, and willingness must be persisted fact.
 * bodyId falls back to actorId; bodyRevision is pinned only when supplied.
 * readSlot(roleId) -> {roleId,slotId,revision,holderId,tenureHolderId}; both
 * holders must be null. An old holder must be safely vacated by its own flow.
 * verifyQualification(proof,application) -> true ONLY for source-proven role
 * requirements or the named original incumbent's actual qualification. No
 * candidate skill ledger is assumed and player career skills are never used.
 * verifyTrialReceipt(kind,proof,application) -> true ONLY for the source's real
 * completed two-table work / separate business-paid 12 receipt. A paid wage is
 * never work evidence. requestTrial does not itself reserve funds/start work.
 * readSafeHandoff(application) -> canonical proof (see handoffValid) ONLY after
 * customer/body control is released, real held actions are drained and the
 * destination is safe. Returning a guessed receipt or boolean is invalid.
 *
 * saveState(detachedSnapshot) must durably save synchronously and return true.
 * prepareHandoff returns a candidate, never calls role.assign(). Coordinator:
 * lock all real source/owner/slot guards; participant.lock(); participant.save
 * (jointSave); participant.committed(); finally participant.release(). jointSave
 * receives {patch:{chinaTavernHiring},assignment}; persist the full game and
 * exact role candidate ATOMICALLY before returning true. Other participants
 * adopt only after that write. No ordinary saveState is used for assignment.
 */
export function createChinaTavernHiring(options={}) {
 const {saved,saveState} = options;
 let current = empty(), apps = new Map(), loadError = null, lastError = null, busy = null, invalidSnapshot = null;
 const read = (name,...args) => {
  require(typeof options[name] === 'function','missing-'+name);
  const result = options[name](...args);
  if(result && typeof result.then === 'function') { Promise.resolve(result).catch(()=>{}); error('async-source-unsupported'); }
  return result;
 };
 const verify = (name,...args) => require(read(name,...args.map(x=>copy(x))) === true,'unverified-'+name);
 function verifyWork(a) { if(a.trial.work) verify('verifyTrialReceipt','work',a.trial.work,a); }
 function verifyEvidence(a) {
  verifyWork(a);
  if(a.trial.payment) verify('verifyTrialReceipt','payment',a.trial.payment,a);
  if(a.decision?.qualification && a.decision.qualification.kind !== 'trial-work') verify('verifyQualification',a.decision.qualification,a);
 }
 try {
  if(saved != null) { invalidSnapshot = copy(saved); current = copy(saved); }
  apps = project(current); for(const a of apps.values()) verifyEvidence(a); invalidSnapshot = null;
 } catch(e) { loadError = e?.message || 'invalid-hiring-state'; }
 const fail = code => { lastError = code; return {ok:false,code}; };
 function run(fn) {
  if(loadError || busy) return fail(loadError || 'hiring-busy');
  busy = true;
  try { const result = fn(); lastError = null; return result; }
  catch(e) { return fail(e?.message || 'hiring-source-failed'); }
  finally { busy = null; }
 }
 function revision(input) { require(input && input.expectedRevision === current.revision,'stale-hiring-revision'); }
 function owner(a=null) {
  const raw = read('readOwner'), o = raw && {ownerId:raw.ownerId,ownership:raw.ownership};
  require(ownerValid(o),'player-owner-required'); if(a) require(same(o,a.owner),'stale-hiring-owner'); return o;
 }
 function candidate(id) {
  require(Object.hasOwn(PEOPLE,id),'protected-or-unknown-applicant');
  const n = read('readCandidate',id);
  require(n && n.actorId === id && n.name === PEOPLE[id] && n.alive === true && Number.isFinite(n.ageYears) && n.ageYears >= 18 &&
   n.willing === true && n.protected === false && n.currentRoleId === null,'applicant-unavailable');
  const a = {actorId:id,name:n.name,bodyId:n.bodyId ?? id,bodyRevision:n.bodyRevision ?? null,
   willingnessId:n.willingness?.id,willingnessRevision:n.willingness?.revision};
  require(actorValid(a),'invalid-applicant-source'); return a;
 }
 function slot(roleId,expectedRevision=null) {
  const r = roleFor(roleId); require(!!r,'unknown-hiring-role');
  const s = read('readSlot',roleId);
  require(s && s.roleId === roleId && s.slotId === r.slotId && integer(s.revision) && integer(s.revision+1) &&
   s.holderId === null && s.tenureHolderId === null,'slot-unavailable');
  if(expectedRevision !== null) require(s.revision === expectedRevision,'stale-hiring-slot'); return s;
 }
 const app = input => { revision(input); const a = apps.get(input.applicationId); require(!!a,'unknown-application'); return a; };
 function live(a) { owner(a); require(same(candidate(a.actor.actorId),a.actor),'stale-hiring-actor'); slot(a.roleId,a.slotRevision); }
 function nextEvent(kind,applicationId,data) {
  require(integer(current.revision+1),'hiring-limit');
  const next = {...current,revision:current.revision+1,events:[...current.events,{sequence:current.revision+1,kind,applicationId,data:copy(data)}]};
  project(next); return next;
 }
 function savedTrue(result) {
  if(result && typeof result.then === 'function') { Promise.resolve(result).catch(()=>{}); error('async-save-unsupported'); }
  require(result === true,'save-failed');
 }
 const adopt = next => { current = next; apps = project(current); };
 function persist(kind,id,data) {
  require(typeof saveState === 'function','missing-saveState'); const next = nextEvent(kind,id,data);
  savedTrue(saveState(copy(next))); adopt(next); return {ok:true,application:copy(apps.get(id))};
 }
 function submit(input) { return run(()=>{
  revision(input); const o = owner(), a = candidate(input.actorId), s = slot(input.roleId);
  require(input.bodyId === a.bodyId && (input.bodyRevision ?? null) === a.bodyRevision && input.willingnessRevision === a.willingnessRevision,'stale-hiring-actor');
  require(![...apps.values()].some(p => active(p) && (p.actor.actorId === a.actorId || p.actor.bodyId === a.bodyId)),'applicant-already-pending');
  return persist('submitted',`cn-tavern-application-${current.revision+1}`,{owner:o,actor:a,roleId:s.roleId,slotId:s.slotId,slotRevision:s.revision});
 }); }
 function requestTrial(input) { return run(()=>{
  const a = app(input); require(input.by === 'player','owner-review-required'); live(a);
  require(a.status === 'submitted' && a.roleId === TAVERN_HIRING_ROLES.assistant.roleId,'trial-unavailable');
  if(a.trial.request) return {ok:true,replayed:true,application:copy(a)};
  return persist('trial-requested',a.id,trialRequest(a));
 }); }
 function recordTrial(input,kind) { return run(()=>{
  const a = app(input), p = input.proof, old = kind === 'work' ? a.trial.work : a.trial.payment;
  require(kind === 'work' ? workValid(p,a) : !!a.trial.work && paymentValid(p,a),'invalid-trial-'+kind);
  verify('verifyTrialReceipt',kind,p,a);
  if(old) { require(same(old,p),'trial-receipt-conflict'); return {ok:true,replayed:true,application:copy(a)}; }
  // Historical completed work/payment remains recordable after cancellation or
  // ownership transfer. It creates no permission to keep working or be hired.
  return persist(kind === 'work' ? 'trial-completed' : 'trial-paid',a.id,p);
 }); }
 function review(input) { return run(()=>{
  const a = app(input); require(input.by === 'player','owner-review-required'); owner(a);
  require(a.status === 'submitted','application-not-open');
  if(input.decision === 'reject') return persist('rejected',a.id,{by:'player',reason:input.reason});
  require(input.decision === 'approve','invalid-hiring-decision'); live(a);
  require(!a.trial.request || !!a.trial.work,'trial-incomplete');
  const p = input.qualification ?? (a.trial.work ? trialQualification(a) : null);
  require(qualificationValid(p,a),'qualification-required');
  if(p.kind === 'trial-work') verifyWork(a); else verify('verifyQualification',p,a);
  require(![...apps.values()].some(other => other.id !== a.id && other.status === 'pending-safe-handoff' &&
   (other.slotId === a.slotId || other.actor.actorId === a.actor.actorId || other.actor.bodyId === a.actor.bodyId)),'hiring-reservation-conflict');
  return persist('approved',a.id,{by:'player',qualification:p,salary:salary(a)});
 }); }
 function cancel(input) { return run(()=>{
  const a = app(input); require(active(a),'application-not-open');
  if(input.by === 'player') owner(); // A new player ownership epoch can close, never adopt, stale applications.
  else { require(input.by === a.actor.actorId,'cancellation-not-authorized');
   const n = read('readCandidate',input.by); require(n?.actorId === input.by && n.alive === true && (n.bodyId ?? n.actorId) === a.actor.bodyId &&
    (n.bodyRevision ?? null) === a.actor.bodyRevision,'stale-hiring-actor'); }
  return persist('cancelled',a.id,{by:input.by,reason:input.reason});
 }); }
 function prepareHandoff(input) { return run(()=>{
  const a = app(input); require(input.by === 'player','owner-review-required');
  require(a.status === 'pending-safe-handoff','handoff-not-pending'); live(a); verifyEvidence(a);
  const proof = copy(read('readSafeHandoff',copy(a))); require(handoffValid(proof,a),'handoff-unsafe');
  const base = current, token = {}, proposed = assignment(a), next = nextEvent('assigned',a.id,{proof,assignment:proposed});
  const bundle = {patch:{chinaTavernHiring:copy(next)},assignment:copy(proposed)};
  let locked = false, durable = false, accepted = false, released = false, inSave = false;
  function valid() {
   if(released || loadError || current !== base || busy && busy !== token) return false;
   const previous = busy; busy = token;
   try { live(a); verifyEvidence(a); return same(read('readSafeHandoff',copy(a)),proof); }
   catch { return false; } finally { busy = previous; }
  }
  return {ok:true,...copy(bundle),valid,
   lock() { if(locked || released || accepted || !valid()) return false; busy = token; locked = true; return true; },
   save(saveAtomic) {
    if(!locked || inSave || durable || accepted || !valid() || typeof saveAtomic !== 'function') return false;
    inSave = true;
    try { savedTrue(saveAtomic(copy(bundle))); durable = true; return true; }
    catch(e) { lastError = e?.message || 'save-failed'; return false; } finally { inSave = false; }
   },
   committed() {
    if(accepted) return true;
    if(!locked || !durable || inSave || current !== base || busy !== token) return false;
    adopt(next); accepted = true; lastError = null; return true;
   },
   release() { if(inSave || durable && !accepted) return false; if(locked && busy === token) busy = null; locked = false; released = true; return true; },
  };
 }); }
 return {submit,requestTrial,completeTrial:input=>recordTrial(input,'work'),recordTrialPayment:input=>recordTrial(input,'payment'),review,cancel,prepareHandoff,
  snapshot:()=>copy(invalidSnapshot ?? current),applications:()=>copy([...apps.values()]),
  application:id=>copy(apps.get(id) ?? null),get loadError(){return loadError;},get lastError(){return lastError;}};
}
