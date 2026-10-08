import {TAVERN_HIRING_BUSINESS_ID as BUSINESS,TAVERN_HIRING_ROLES as ROLES} from './china-tavern-hiring.js';

// These are the two ORIGINAL labor positions/work targets in china-tavern-labor.
// They are public work sites, never a replacement NPC, private meeting or skill ledger.
export const TAVERN_RECRUITMENT_TABLES = Object.freeze([
 Object.freeze({id:'cn-tavern-labor-west',position:Object.freeze([19.75,.215,13.65]),workTarget:Object.freeze([19.275,1.19,13.65])}),
 Object.freeze({id:'cn-tavern-labor-east',position:Object.freeze([22.25,.215,17.65]),workTarget:Object.freeze([22.725,1.19,17.65])}),
]);
const PEOPLE = {'cn-tavern-diner-west':'顾谨','cn-tavern-diner-east':'周棠'};
const SOURCE = 'cn-tavern-recruitment', SECONDS = 5, copy = structuredClone;
const integer = x => Number.isSafeInteger(x) && x >= 0;
const text = x => typeof x === 'string' && !!x && x.length < 180;
const point = x => Array.isArray(x) && x.length === 3 && x.every(Number.isFinite);
const position = a => a?.root?.position ? [a.root.position.x,a.root.position.y,a.root.position.z] : null;
const near = (a,b,r=.12) => point(a) && point(b) && Math.hypot(a[0]-b[0],a[2]-b[2]) <= r && Math.abs(a[1]-b[1]) <= .12;
const same = (a,b) => {
 if(a === b) return true;
 if(!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
 const keys=Object.keys(a); return keys.length === Object.keys(b).length && keys.every(k=>Object.hasOwn(b,k) && same(a[k],b[k]));
};
const require = (ok,code) => { if(!ok) throw Error(code); };
const freshProgress = () => ({elapsed:0,startedSeconds:null,origin:null});
const terminal = c => ['returned','assigned'].includes(c.phase);
const empty = () => ({version:1,businessId:BUSINESS,serial:0,sourceRevision:0,clockSeconds:0,sources:[],pending:[],candidates:[]});

/**
 * Adapter contract (all synchronous; missing facts fail closed):
 * - getHiring() is lazy, so construct this source BEFORE the hiring journal.
 *   Hiring readCandidate merges willingness(id); hiring verifyTrialReceipt calls
 *   this verifier. Source receipts are immutable and outlive transient control.
 * - readCandidate(id): actual {actorId,name,bodyId,bodyRevision?,ageYears,alive,
 *   protected,currentRoleId}. Only the two original adult diners apply here.
 * - additionalChoices/acceptChoice integrate ONLY with the existing life brain's
 *   getAdditionalChoices/onExternalChoice. acceptChoice needs its actual
 *   startedAt; there is no random roll, forced application or skill/XP grant.
 * - readActor(id) returns the original actor/root. readActorState(id,candidate):
 *   {bodyId,bodyRevision?,alive,inScene,standing,busy,sociallyHeld,
 *    hasCarriedObjects,customerLeaseValid,originalOrderSafe,needsCustomerControl?}.
 *   busy excludes our own walking. All safety booleans except the final optional
 *   need flag must be explicit. Actual feet/scene matter; root.visible does not.
 * - releaseCustomer(id,candidate) -> immutable JSON {id,...}, ONLY after original
 *   dining/lodging/clinic/salon/toilet, held orders and carried props safely drain.
 *   null means wait. customerLeaseValid validates this exact lease/body/owner.
 *   returnCustomer(id,lease,reason) -> true restores original guest control,
 *   without teleport/reset. For needs, reacquisition waits for their real end.
 * - resolveMeetingPoint(id,candidate) -> {id,position:[x,y,z]} in a SAFE PUBLIC
 *   reception bay. Stable while the same lease/body/owner/application is valid.
 * - moveTo(id,point,dt,candidate) is the ONLY locomotion; stopMove(id,candidate)
 *   releases only our route. No actor position, identity or wardrobe writes here.
 * - claimTable(id,table,candidate) -> JSON {id,...}; tableClaimValid(id,claim,
 *   table,candidate), releaseTable(id,claim,candidate). Claims exclude original
 *   customer orders/player cleaning and must be revalidated after every arrival.
 *   canWorkTable(id,table,candidate) checks original order safety and work LOS.
 *   faceWorkTarget(id,workTarget,candidate) applies the existing tidy pose/facing;
 *   this controller verifies the original root yaw and actual standing position.
 * - readPlayerState() -> {actorId:'player',inScene,standing,busy,mounted,position}.
 *   busy excludes this owner's own dialog. canSeeOwner(id,candidate) checks LOS.
 *   onInspect(application,candidate) opens the owner UI; it does not decide.
 * - reserveTrial(application) -> actual immutable business reservation receipt;
 *   payTrial(application,reservation,work) -> actual immutable payment receipt;
 *   verifyMoneyReceipt('reservation'|'payment',receipt,application) === true;
 *   releaseTrialReservation(application,reservation) is ledger-owned, idempotent.
 *   No balances or money operations occur locally. Completed unpaid work remains
 *   qualified, retryable, and excluded from future permanent paid duty time.
 * - saveState(snapshot) durably saves the enclosing game and returns true ONLY
 *   synchronously. Ordinary snapshot includes earned but pending source writes.
 *   commitTableWork(proof,candidate,nextSnapshot) must atomically save the original
 *   scene table-clean result AND nextSnapshot, returning true only after adoption.
 *   verifyTableWork(proof) validates the independently saved original scene result
 *   during cold loading and every hiring qualification check.
 *   getClock().seconds supplies global simulation timestamps; dt alone earns work.
 *   prepareAssigned supplies a participant for joint hiring/role/runtime save.
 */
export function createChinaTavernRecruitment(options={}) {
 let current=empty(),loadError=null,lastError=null,invalidSnapshot=null,locked=null,executing=false,disposed=false;
 const restored=new Set(), arrived=new Set(), suspended=new Set(), bindings=new Map();
 const read=(name,...args)=>{
  require(typeof options[name] === 'function','missing-'+name);
  const result=options[name](...args);
  if(result && typeof result.then === 'function') { Promise.resolve(result).catch(()=>{}); throw Error('async-'+name+'-unsupported'); }
  return result;
 };
 const attempt=(name,...args)=>{try{return read(name,...args);}catch(e){lastError=e.message;return null;}};
 const snapshot=()=>copy(invalidSnapshot ?? current);
 const candidate=id=>current.candidates.find(c=>c.id===id || c.applicationId===id || c.actorId===id && !terminal(c));
 const source=id=>current.sources.find(e=>e.receipt.id===id)?.receipt;
 const app=c=>c.applicationId ? attempt('getHiring')?.application(c.applicationId) : null;
 const input=c=>({applicationId:c.applicationId,expectedRevision:read('getHiring').snapshot().revision,by:'player'});
 function validate(s) {
  require(s?.version===1 && s.businessId===BUSINESS && integer(s.serial) && integer(s.sourceRevision) &&
   Number.isFinite(s.clockSeconds) && s.clockSeconds>=0 && Array.isArray(s.sources) && s.sources.length===s.sourceRevision &&
   Array.isArray(s.pending) && Array.isArray(s.candidates),'invalid-recruitment-state');
  const seen=new Map();
  for(const [i,e] of [...s.sources,...s.pending].entries()) {
   const p=e?.receipt;
   require(e && ['willingness','table-work','trial-work'].includes(e.kind) && e.sequence===i+1 && p?.sourceId===SOURCE &&
    p.sourceRevision===e.sequence && text(p.id) && !seen.has(p.id) && p.businessId===BUSINESS &&
    Object.hasOwn(PEOPLE,p.actorId) && text(p.bodyId),'invalid-recruitment-source');
   if(e.kind==='willingness') require(text(p.recruitmentId) && p.roleId===ROLES.assistant.roleId && integer(p.ownership) &&
    Number.isFinite(p.selectedAt) && p.selectedAt>=0,'invalid-willingness-source');
   else if(e.kind==='table-work') {
    const t=TAVERN_RECRUITMENT_TABLES.find(t=>t.id===p.tableId),w=seen.get(p.willingnessId)?.receipt;
    require(w && w.actorId===p.actorId && w.bodyId===p.bodyId && w.recruitmentId===p.recruitmentId &&
     text(p.applicationId) && p.trialId===p.applicationId+':trial' && t && same(p.position,t.position) &&
     same(p.workTarget,t.workTarget) && text(p.claim?.id) && p.activeSeconds===SECONDS && Number.isFinite(p.startedSeconds) && p.startedSeconds>=0 &&
     Number.isFinite(p.completedSeconds) && p.completedSeconds-p.startedSeconds>=SECONDS-1e-8,'invalid-table-source');
    const prior=[...seen.values()].filter(e=>e.kind==='table-work' && e.receipt.applicationId===p.applicationId);
    require(prior.length<2 && p.tableId===TAVERN_RECRUITMENT_TABLES[prior.length].id &&
     (!prior.length || prior[0].receipt.completedSeconds<=p.startedSeconds),'invalid-table-order');
   } else {
    require(text(p.applicationId) && p.trialId===p.applicationId+':trial' && Array.isArray(p.steps) && p.steps.length===2,'invalid-trial-source');
    for(const [index,step] of p.steps.entries()) {
     const work=seen.get(step.id)?.receipt;
     require(work && work.actorId===p.actorId && work.bodyId===p.bodyId && work.applicationId===p.applicationId &&
      work.tableId===TAVERN_RECRUITMENT_TABLES[index].id && same(step,workStep(work)),'invalid-trial-source');
    }
   }
   seen.set(p.id,e);
  }
  const ids=new Set(),activeActors=new Set();
  for(const c of s.candidates) {
   require(text(c.id) && !ids.has(c.id) && Object.hasOwn(PEOPLE,c.actorId) && text(c.bodyId) &&
    (c.bodyRevision===null || integer(c.bodyRevision)) && c.owner?.ownerId==='player' && integer(c.owner.ownership) &&
    c.roleId===ROLES.assistant.roleId && integer(c.slotRevision) &&
    ['waiting-release','to-meeting','meeting','to-table','cleaning','to-owner','review','paused','returning','returned','assigned'].includes(c.phase) &&
    Array.isArray(c.steps) && c.steps.length<=2 && integer(c.tableIndex) && c.tableIndex===c.steps.length &&
    c.progress && Number.isFinite(c.progress.elapsed) && c.progress.elapsed>=0 && c.progress.elapsed<=SECONDS &&
    (c.progress.origin===null || point(c.progress.origin)) &&
    (c.progress.startedSeconds===null || Number.isFinite(c.progress.startedSeconds) && c.progress.startedSeconds>=0) &&
    (c.progress.elapsed===0 || point(c.progress.origin) && c.progress.startedSeconds!==null) &&
    (c.meeting===null || text(c.meeting.id) && point(c.meeting.position)),'invalid-recruitment-candidate');
   const willing=seen.get(c.willingnessId)?.receipt;
   require(willing && willing.recruitmentId===c.id && willing.actorId===c.actorId && willing.bodyId===c.bodyId &&
    willing.sourceRevision===c.willingnessRevision && willing.ownership===c.owner.ownership,'invalid-candidate-willingness');
   for(const step of c.steps) {const p=seen.get(step.id)?.receipt;require(p && p.actorId===c.actorId && p.bodyId===c.bodyId &&
    p.applicationId===c.applicationId && same(step,workStep(p)),'invalid-candidate-work');}
   if(!terminal(c)) {require(!activeActors.has(c.actorId),'duplicate-recruitment-actor');activeActors.add(c.actorId);}
   ids.add(c.id);
  }
  return s;
 }
 try {
  if(options.saved!=null) {invalidSnapshot=copy(options.saved);current=validate(copy(options.saved));
   for(const event of current.sources)if(event.kind==='table-work')require(read('verifyTableWork',copy(event.receipt))===true,'unverified-scene-table-work');}
  for(const c of current.candidates) restored.add(c.id);
  invalidSnapshot=null;
 } catch(e) {loadError=e.message;current=empty();}
 function save(next) {
  if(locked || disposed || loadError) return false;
  try {validate(next);require(read('saveState',copy(next))===true,'save-failed');current=next;lastError=null;return true;}
  catch(e) {lastError=e.message;return false;}
 }
 function workStep(p) {return p && {id:p.id,tableId:p.tableId,startedSeconds:p.startedSeconds,completedSeconds:p.completedSeconds};}
 function addSource(next,kind,receipt,pending=false) {
  const sequence=next.sourceRevision+next.pending.length+1;
  const event={sequence,kind,receipt:{...copy(receipt),sourceId:SOURCE,sourceRevision:sequence}};
  if(pending) next.pending.push(event); else {next.sources.push(event);next.sourceRevision++;}
  return event.receipt;
 }
 function flushSources() {
  while(current.pending.length) {
  const next=copy(current);
  const event=next.pending.shift();
   next.sources.push(event);next.sourceRevision++;
   const p=event.receipt,c=next.candidates.find(c=>c.applicationId===p.applicationId);
   if(event.kind==='table-work' && c && !c.steps.some(s=>s.id===p.id)) {
    c.steps.push(workStep(p));c.tableIndex=c.steps.length;c.progress=freshProgress();
    if(['cleaning','to-table'].includes(c.phase)) c.phase=c.tableIndex===2?'to-owner':'to-table';
   }
   if(event.kind==='trial-work' && c) c.workProof=copy(p);
   if(event.kind==='table-work') {
    try {
     validate(next);
     require(read('commitTableWork',copy(p),copy(candidate(c.id)),copy(next))===true,'table-work-save-failed');
     current=next;lastError=null;
    } catch(e) {lastError=e.message;return false;}
   } else if(!save(next)) return false;
  }
  return true;
 }
 function eligible(id) {
  const n=attempt('readCandidate',id),o=attempt('readOwner'),s=attempt('readSlot',ROLES.assistant.roleId);
  return Object.hasOwn(PEOPLE,id) && n?.actorId===id && n.name===PEOPLE[id] && n.alive===true && n.ageYears>=18 &&
   n.protected===false && n.currentRoleId===null && o?.ownerId==='player' && integer(o.ownership) &&
   s?.roleId===ROLES.assistant.roleId && s.slotId===ROLES.assistant.slotId && integer(s.revision) &&
   s.holderId===null && s.tenureHolderId===null ? {n,o:{ownerId:o.ownerId,ownership:o.ownership},s} : null;
 }
 function additionalChoices(id) {
  if(disposed || loadError || locked || candidate(id)) return [];
  const e=eligible(id);if(!e) return [];
  return [{id:'tavern-assistant-application',external:true,provider:SOURCE,roleId:ROLES.assistant.roleId,actorId:id,
   bodyId:e.n.bodyId??id,bodyRevision:e.n.bodyRevision??null,ownership:e.o.ownership,slotRevision:e.s.revision,
   base:.24,traits:{curiosity:.12},duration:[0,0],cooldown:300,label:'去云来酒楼应聘服务助理'}];
 }
 function acceptChoice(id,selected) {
  if(executing || disposed || loadError || locked || current.pending.length) return false;
  const choice=additionalChoices(id)[0];
  if(!choice || !Number.isFinite(selected?.startedAt) || selected.startedAt<0 ||
   !['id','external','provider','roleId','actorId','bodyId','bodyRevision','ownership','slotRevision'].every(k=>selected[k]===choice[k])) return false;
  executing=true;
  try {
   const next=copy(current),recruitmentId='cn-tavern-recruitment-'+(++next.serial);
   const w=addSource(next,'willingness',{id:recruitmentId+':willingness',businessId:BUSINESS,recruitmentId,
    actorId:id,bodyId:choice.bodyId,roleId:choice.roleId,ownership:choice.ownership,selectedAt:selected.startedAt});
   next.candidates.push({id:recruitmentId,actorId:id,bodyId:choice.bodyId,bodyRevision:choice.bodyRevision,
    owner:{ownerId:'player',ownership:choice.ownership},roleId:choice.roleId,slotRevision:choice.slotRevision,
    willingnessId:w.id,willingnessRevision:w.sourceRevision,applicationId:null,phase:'waiting-release',resumePhase:null,
    lease:null,meeting:null,reservation:null,tableClaim:null,tableIndex:0,steps:[],progress:freshProgress(),
    workProof:null,payment:null,returnReason:null});
   return save(next);
  } finally {executing=false;}
 }
 function willingness(id) {
  const c=candidate(id),p=c && source(c.willingnessId);
  return c && p && !['returning','returned'].includes(c.phase) ? {willing:true,willingness:{id:p.id,revision:p.sourceRevision}} :
   {willing:false,willingness:null};
 }
 function actorState(c) {return attempt('readActorState',c.actorId,copy(c));}
 function identityValid(c) {
  const n=attempt('readCandidate',c.actorId),o=attempt('readOwner');
  return n?.actorId===c.actorId && n.alive===true && n.currentRoleId===null && n.protected===false && n.ageYears>=18 &&
   (n.bodyId??n.actorId)===c.bodyId && (n.bodyRevision??null)===c.bodyRevision && same(c.owner,o && {ownerId:o.ownerId,ownership:o.ownership});
 }
 function actor(c) {
  const a=attempt('readActor',c.actorId);
  if(!a?.root?.position || !a.root.rotation) return null;
  const bound=bindings.get(c.id);
  if(bound && bound!==a) return null;
  bindings.set(c.id,a);return a;
 }
 function safe(c,s) {
  return s?.alive===true && s.inScene===true && s.bodyId===c.bodyId && (s.bodyRevision??null)===c.bodyRevision &&
   s.standing===true && s.busy===false && s.sociallyHeld===false && s.hasCarriedObjects===false &&
   s.originalOrderSafe===true && s.customerLeaseValid===true && !!actor(c);
 }
 function releaseTable(c) {
  if(c.tableClaim) {attempt('releaseTable',c.actorId,copy(c.tableClaim),copy(c));c.tableClaim=null;}
  arrived.delete(c.id);
 }
 function stop(c) {attempt('stopMove',c.actorId,copy(c));releaseTable(c);}
 function requestReturn(c,reason,paused=false) {
  if(terminal(c)) return false;
  stop(c);c.resumePhase=paused ? (c.steps.length===2?'to-owner':c.reservation?'to-table':c.applicationId?'to-meeting':'waiting-release') : null;
  c.returnReason=reason;c.phase='returning';
  // Stop immediately even if the enclosing save is temporarily unavailable.
  save(copy(current));return true;
 }
 function returnControl(c) {
  c=candidate(c.id) ?? c; // requestReturn may have adopted a detached durable state.
  if(c.lease && attempt('returnCustomer',c.actorId,copy(c.lease),c.returnReason)!==true) return false;
  c.lease=null;c.meeting=null;restored.delete(c.id);
  c.phase=c.resumePhase?'paused':'returned';
  const a=app(c);
  if(!c.resumePhase && a && ['submitted','pending-safe-handoff'].includes(a.status)) {
   const by=attempt('readOwner')?.ownerId==='player'?'player':c.actorId;
   attempt('getHiring')?.cancel({...input(c),by,reason:c.returnReason||'applicant-left'});
  }
  if(!c.resumePhase && c.reservation && !c.workProof && c.steps.length<2) attempt('releaseTrialReservation',a,copy(c.reservation));
  save(copy(current));return true;
 }
 function claimCustomer(c) {
  const receipt=attempt('releaseCustomer',c.actorId,copy(c));
  if(!text(receipt?.id)) return false;
  c.lease=copy(receipt);
  const meeting=attempt('resolveMeetingPoint',c.actorId,copy(c));
  if(!text(meeting?.id) || !point(meeting.position)) {requestReturn(c,'meeting-unavailable',true);return false;}
  c.meeting=copy(meeting);c.phase=c.resumePhase||'to-meeting';c.resumePhase=null;
  // Rebind after a legitimate cold restore/lease reacquisition only.
  bindings.delete(c.id);restored.delete(c.id);arrived.delete(c.id);
  save(copy(current));return true;
 }
 function physicalMeeting(c) {
  const a=actor(c),s=actorState(c),p=attempt('readPlayerState');
  return !!c.meeting && safe(c,s) && !a.walking && near(position(a),c.meeting.position) &&
   p?.actorId==='player' && p.inScene===true && p.standing===true && p.busy===false && p.mounted===false &&
   near(p.position,c.meeting.position,2.4) && attempt('canSeeOwner',c.actorId,copy(c))===true;
 }
 function travel(c,target,dt) {
  const a=actor(c);if(!a) return false;
  attempt('moveTo',c.actorId,copy(target),dt,copy(c));
  return !a.walking && near(position(a),target.position);
 }
 function submit(c) {
  // A cold save can already contain the journal write but not its local link.
  const h=attempt('getHiring');if(!h) return false;
  const old=h.applications().find(a=>a.actor.willingnessId===c.willingnessId);
  const r=old ? {ok:true,application:old} : h.submit({actorId:c.actorId,bodyId:c.bodyId,bodyRevision:c.bodyRevision,
   roleId:c.roleId,willingnessRevision:c.willingnessRevision,expectedRevision:h.snapshot().revision});
  if(!r.ok) {lastError=r.code;return false;}
  c.applicationId=r.application.id;c.phase='meeting';save(copy(current));return true;
 }
 function ensureTrial(c,a) {
  if(!a?.trial.request) return false;
  if(!c.reservation) {
   const receipt=attempt('reserveTrial',copy(a));
   if(!receipt || attempt('verifyMoneyReceipt','reservation',copy(receipt),copy(a))!==true) {lastError='trial-reservation-unavailable';return false;}
   c.reservation=copy(receipt);
  }
  if(attempt('verifyMoneyReceipt','reservation',copy(c.reservation),copy(a))!==true) {lastError='trial-reservation-unverified';return false;}
  c.phase='to-table';c.progress=freshProgress();save(copy(current));return true;
 }
 function makeWork(c) {
  if(c.steps.length!==2 || c.workProof || current.pending.some(e=>e.kind==='trial-work' && e.receipt.applicationId===c.applicationId)) return;
  addSource(current,'trial-work',{id:c.applicationId+':completed-work',businessId:BUSINESS,applicationId:c.applicationId,
   trialId:c.applicationId+':trial',actorId:c.actorId,bodyId:c.bodyId,steps:copy(c.steps)},true);
  flushSources();
 }
 function publishWork(c) {
  makeWork(c);c=candidate(c.id);const a=app(c);
  if(c.workProof && a && !a.trial.work) {
   const result=attempt('getHiring')?.completeTrial({...input(c),proof:copy(c.workProof)});
   if(!result?.ok) lastError=result?.code||'trial-work-journal-unavailable';
  }
 }
 function pay(c) {
  const a=app(c);if(!a?.trial.work) return false;
  if(a.trial.payment) {c.payment=copy(a.trial.payment);return true;}
  const receipt=c.payment || attempt('payTrial',copy(a),copy(c.reservation),copy(c.workProof));
  if(!receipt || attempt('verifyMoneyReceipt','payment',copy(receipt),copy(a))!==true) {lastError='trial-payment-unavailable';return false;}
  c.payment=copy(receipt);save(copy(current));
  const r=attempt('getHiring')?.recordTrialPayment({...input(c),proof:copy(receipt)});
  if(!r?.ok) lastError=r?.code||'trial-payment-journal-unavailable';
  return r?.ok===true;
 }
 function work(c,dt) {
  const table=TAVERN_RECRUITMENT_TABLES[c.tableIndex],a=actor(c);
  if(!table || !a) return;
  if(c.tableClaim && attempt('tableClaimValid',c.actorId,copy(c.tableClaim),copy(table),copy(c))!==true) {
   releaseTable(c);c.phase='to-table';c.progress=freshProgress();
  }
  if(!c.tableClaim) {
   const claim=attempt('claimTable',c.actorId,copy(table),copy(c));
   if(!text(claim?.id)) return;
   c.tableClaim=copy(claim);arrived.delete(c.id);
  }
  if(c.phase==='to-table') {
   if(!travel(c,table,dt)) return;
   // No timer on the arrival tick; recheck claims/body/LOS on the NEXT update.
   c.phase='cleaning';arrived.add(c.id);return;
  }
  const good=safe(c,actorState(c)) && !a.walking && near(position(a),table.position) &&
   attempt('tableClaimValid',c.actorId,copy(c.tableClaim),copy(table),copy(c))===true &&
   attempt('canWorkTable',c.actorId,copy(table),copy(c))===true;
  if(!good) {releaseTable(c);c.phase='to-table';c.progress=freshProgress();return;}
  if(!arrived.has(c.id)) {arrived.add(c.id);return;}
  if(c.progress.origin && !near(position(a),c.progress.origin,.025)) c.progress=freshProgress();
  attempt('faceWorkTarget',c.actorId,copy(table.workTarget),copy(c));
  const yaw=Math.atan2(table.workTarget[0]-a.root.position.x,table.workTarget[2]-a.root.position.z);
  if(Math.abs(Math.atan2(Math.sin(a.root.rotation.y-yaw),Math.cos(a.root.rotation.y-yaw)))>.16) return;
  if(c.progress.startedSeconds===null) {c.progress.startedSeconds=current.clockSeconds-dt;c.progress.origin=position(a);}
  c.progress.elapsed=Math.min(SECONDS,c.progress.elapsed+dt);
  if(c.progress.elapsed<SECONDS-1e-8) return;
  if(current.clockSeconds-c.progress.startedSeconds<SECONDS) return;
  const proof={id:c.applicationId+':clean:'+table.id,businessId:BUSINESS,recruitmentId:c.id,applicationId:c.applicationId,
   trialId:c.applicationId+':trial',actorId:c.actorId,bodyId:c.bodyId,willingnessId:c.willingnessId,
   tableId:table.id,position:copy(table.position),workTarget:copy(table.workTarget),claim:copy(c.tableClaim),activeSeconds:SECONDS,
   startedSeconds:c.progress.startedSeconds,completedSeconds:current.clockSeconds};
  addSource(current,'table-work',proof,true);
  if(flushSources()) {const next=candidate(c.id);releaseTable(next);makeWork(next);}
 }
 function verifyTrialReceipt(kind,proof,application) {
  if(loadError || !proof || proof.actorId!==application?.actor.actorId || proof.bodyId!==application?.actor.bodyId || proof.applicationId!==application.id) return false;
  if(kind==='payment') return attempt('verifyMoneyReceipt','payment',copy(proof),copy(application))===true;
  return kind==='work' && current.sources.some(e=>e.kind==='trial-work' && same(e.receipt,proof)) &&
   proof.steps.every(step=>attempt('verifyTableWork',copy(source(step.id)))===true);
 }
 function update(dt) {
  if(disposed || loadError || locked || executing || !Number.isFinite(dt) || dt<=0 || dt>.25) return false;
  executing=true;
  try {
   const seconds=read('getClock')?.seconds;
   require(Number.isFinite(seconds) && seconds>=current.clockSeconds,'invalid-recruitment-clock');
   current.clockSeconds=seconds;
   flushSources();
   for(const id of current.candidates.map(c=>c.id)) {
    let c=candidate(id);if(!c) continue;
    publishWork(c);c=candidate(id);
    const a=app(c);
    if(a?.status==='assigned') {assigned(c.applicationId);continue;}
    if(terminal(c)) {if(c.workProof && a?.trial.work && !a.trial.payment)pay(c);continue;}
    if(c.phase==='returning') {returnControl(c);continue;}
    if(!identityValid(c) || a && ['rejected','cancelled'].includes(a.status)) {requestReturn(c,'application-ended');returnControl(c);continue;}
    const s=actorState(c);
    if(s?.needsCustomerControl===true) {if(c.phase!=='paused'){requestReturn(c,'needs',true);returnControl(c);}continue;}
    if(s?.inScene!==true || s.alive!==true) {requestReturn(c,'applicant-left');returnControl(c);continue;}
    if(['waiting-release','paused'].includes(c.phase)) {claimCustomer(c);continue;}
    if(s.customerLeaseValid!==true) {requestReturn(c,'lease-paused',true);returnControl(c);continue;}
    if(restored.has(c.id)) {
     restored.delete(c.id);bindings.delete(c.id);arrived.delete(c.id);
     if(c.phase==='cleaning' && !near(position(actor(c)),c.progress.origin,.025)) {c.progress=freshProgress();c.phase='to-table';}
    }
    if(!safe(c,s)) {
     if(!suspended.has(c.id)) {stop(c);suspended.add(c.id);}
     // Social ownership pauses active seconds. Moving away invalidates the
     // partial wipe, but already completed source receipts remain untouched.
     if(c.phase==='cleaning' && c.progress.origin && !near(position(actor(c)),c.progress.origin,.025)) {c.progress=freshProgress();c.phase='to-table';}
     continue;
    }
    suspended.delete(c.id);
    if(current.pending.some(e=>e.receipt.applicationId===c.applicationId)) continue;
    if(c.phase==='to-meeting') {if(travel(c,c.meeting,dt)) {if(c.applicationId)c.phase='meeting';else submit(c);}continue;}
    if(c.phase==='meeting') {if(a?.trial.request) ensureTrial(c,a);continue;}
    if(['to-table','cleaning'].includes(c.phase)) {work(c,dt);continue;}
    if(c.phase==='to-owner') {if(travel(c,c.meeting,dt)) {c.phase='review';save(copy(current));}continue;}
    if(c.phase==='review' && physicalMeeting(c)) pay(c);
   }
   return true;
  } catch(e) {lastError=e.message;return false;} finally {executing=false;}
 }
 function intent(id,kind='inspect') {
  const c=candidate(id),a=c && app(c);
  if(disposed || loadError || !c?.meeting || !a || !['meeting','review'].includes(c.phase) || !identityValid(c)) return null;
  if(!['inspect','trial','approve','reject','pay'].includes(kind) || kind==='trial' && a.trial.request ||
   kind==='approve' && (!a.trial.work || a.status!=='submitted') || kind==='reject' && a.status!=='submitted' ||
   kind==='pay' && (!a.trial.work || a.trial.payment)) return null;
  return {id:SOURCE+':'+a.id+':'+kind,provider:SOURCE,kind,applicationId:a.id,actorId:c.actorId,
   position:copy(c.meeting.position),visualAnchor:{actorId:c.actorId},name:PEOPLE[c.actorId],
   action:{inspect:'当面查看应聘',trial:'请他试做两桌 · 酒楼支付12文',approve:'批准聘用服务助理',reject:'婉拒这次申请',pay:'补付已完成试工的12文'}[kind],
   interactionRadius:2.8,executionRadius:2.4,priority:45,
   intentKey:[a.id,read('getHiring').snapshot().revision,c.phase,c.lease?.id,c.owner.ownership].join(':')};
 }
 function resolveIntent(selected) {
  const next=intent(selected?.applicationId,selected?.kind);
  return next && selected.provider===next.provider && selected.id===next.id && selected.intentKey===next.intentKey ? next : null;
 }
 function executeIntent(selected) {
  if(executing || locked) return false;
  const next=resolveIntent(selected),c=next && candidate(next.applicationId);
  if(!c || !physicalMeeting(c)) return false;
  executing=true;
  try {
   const h=read('getHiring');let r;
   if(next.kind==='inspect') {read('onInspect',copy(app(c)),copy(c));return true;}
   if(next.kind==='pay') return pay(c);
   if(next.kind==='trial') {r=h.requestTrial(input(c));if(r.ok)ensureTrial(c,r.application);}
   else {r=h.review({...input(c),decision:next.kind==='approve'?'approve':'reject',reason:'owner-declined'});if(r.ok && next.kind==='reject')requestReturn(c,'owner-declined');}
   if(!r?.ok) lastError=r?.code||'owner-decision-failed';
   return r?.ok===true;
  } finally {executing=false;}
 }
 function assigned(id) {
  const c=candidate(id),a=c && app(c);
  if(!c || a?.status!=='assigned' || a.actor.actorId!==c.actorId || a.actor.bodyId!==c.bodyId) return false;
  if(c.phase==='assigned') return true; // The permanent role now owns its route.
  stop(c);c.phase='assigned';c.lease=null;c.meeting=null;return true;
 }
 function prepareAssigned(id) {
  const c=candidate(id),a=c && app(c),base=current;
  if(!c || a?.status!=='pending-safe-handoff' || !physicalMeeting(c) || locked) return {ok:false,code:'recruitment-handoff-unsafe'};
  const next=copy(current),row=next.candidates.find(n=>n.id===c.id),token={};
  row.phase='assigned';row.lease=null;row.meeting=null;row.tableClaim=null;
  let accepted=false,released=false;
  const valid=()=>!released && current===base && (!locked || locked===token) && identityValid(c) && physicalMeeting(c) && app(c)?.status==='pending-safe-handoff';
  return {ok:true,patch:{chinaTavernRecruitment:copy(next)},valid,
   lock(){if(locked || !valid())return false;locked=token;return true;},
   committed(){
    if(accepted)return true;
    if(released || locked!==token || current!==base || app(c)?.status!=='assigned')return false;
    stop(c);current=next;accepted=true;return true;
   },
   release(){if(locked===token)locked=null;released=true;return true;}};
 }
 return {additionalChoices,acceptChoice,willingness,verifyTrialReceipt,update,intent,resolveIntent,executeIntent,prepareAssigned,assigned,
  candidate:id=>copy(candidate(id)??null),
  settleEarnedTrial(id){const c=candidate(id);return !!c && !locked && !!c.workProof && pay(c);},
  intents:()=>current.candidates.flatMap(c=>['inspect','trial','approve','reject','pay'].map(k=>intent(c.id,k)).filter(Boolean)),
  owns:id=>{const c=candidate(typeof id==='string'?id:id?.station?.id);return !disposed && !!c?.lease && !['returned','assigned','paused'].includes(c.phase);},
  cancel(id,reason='applicant-cancelled'){const c=candidate(id);return !!c && !locked && requestReturn(c,reason);},
  pose(id){const c=candidate(id),table=c && TAVERN_RECRUITMENT_TABLES[c.tableIndex],a=c && actor(c);
   return c?.phase==='cleaning' && table && a && !a.walking && near(position(a),table.position) && safe(c,actorState(c)) ?
    {action:'tidy',workTarget:copy(table.workTarget)} : null;},
  snapshot,state:()=>({...snapshot(),loadError,lastError}),
  dispose({suspend=false}={}){if(disposed)return;for(const c of current.candidates)if(!terminal(c)){
   if(suspend)stop(c);else {requestReturn(c,'disposed');returnControl(c);}
  }disposed=true;},
  get loadError(){return loadError;},get lastError(){return lastError;}};
}
