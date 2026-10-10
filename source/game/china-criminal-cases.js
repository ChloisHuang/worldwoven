// CR01: evidence-bound assistance for the original Chinese justice official.
// This ledger never issues a sentence, controls an actor, or writes money.
const clone = value => structuredClone(value);
const str = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const stages = ['intake','scene','witness','review','archive'];
const terminal = new Set(['released','repaired','closed']);
const statuses = new Set(['undiscovered','witnessed','reported','pursuit','escort','custody','releasing',...terminal]);
const point = p => p && ['x','y','z'].every(k=>Number.isFinite(p[k]));
const fail = reason => ({ok:false,reason,code:reason,events:[]});
const desk = 'cn-justice-case-desk';
const justice = 'cn-official-justice';
const principalTerm = t => t?.officeId===justice && t.holderId==='player' && str(t.appointmentId) && str(t.holderKey) && str(t.vacancyId);
const equal = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const principalProof = p => principalTerm(p?.officeTerm) && p.actorKey===p.officeTerm.holderKey && Number.isSafeInteger(p.day) && p.day>=0;
const dutyFor = row => { const proof=row.steps[4]?.proof; return principalProof(proof)?{id:`cn-justice-duty:${proof.officeTerm.appointmentId}:${proof.day}`,day:proof.day,appointmentId:proof.officeTerm.appointmentId,officeTerm:clone(proof.officeTerm),caseId:row.id,source:clone(row.source),sourceRevision:row.sourceRevision,steps:clone(row.steps),outcome:clone(row.outcome)}:null; };
const validEvidence = e => str(e?.witnessKey) && ['sight','victim','confession'].includes(e.kind) && point(e.position) && point(e.subjectPosition) && Number.isFinite(e.at) && e.at >= 0 && Array.isArray(e.deliveredTo) && e.deliveredTo.every(str);
function sourceCase(c) {
 if (!str(c?.id) || c.countryId !== 'china' || !str(c.sceneId) || !str(c.subjectKey) || !str(c.subjectId) || !['theft','harm','fencing'].includes(c.kind) || !statuses.has(c.status) || !Array.isArray(c.evidence) || !c.evidence.length || !c.evidence.every(validEvidence) || c.status === 'undiscovered') return null;
 if (!Number.isSafeInteger(c.number) || c.number < 1 || !Number.isSafeInteger(c.reportRevision) || c.reportRevision < 0 || new Set(c.evidence.map(e=>e.witnessKey)).size !== c.evidence.length) return null;
 if (c.kind === 'harm' ? !str(c.victimKey) : !str(c.itemId)) return null;
 // A private engine observation is not a judicially available statement.
 const evidence=c.evidence.filter(e=>e.deliveredTo.length>0).map(e=>({witnessKey:e.witnessKey,witnessId:e.witnessId||null,kind:e.kind,position:clone(e.position),subjectPosition:clone(e.subjectPosition),at:e.at,deliveredTo:[...e.deliveredTo].sort(),incidentNumber:e.incidentNumber??null})).sort((a,b)=>a.witnessKey.localeCompare(b.witnessKey));
 return {id:c.id,number:c.number,kind:c.kind,countryId:c.countryId,sceneId:c.sceneId,incidentPosition:point(c.incidentPosition)?clone(c.incidentPosition):null,subjectKey:c.subjectKey,subjectId:c.subjectId,itemId:c.itemId??null,victimKey:c.victimKey??null,victimId:c.victimId??null,role:c.role??null,theftCaseId:c.theftCaseId??null,counterpartyKey:c.counterpartyKey??null,status:c.status,reportRevision:c.reportRevision,incidentCount:c.incidentCount??1,lastIncidentNumber:c.lastIncidentNumber??c.number,returned:c.returned===true,surrendered:c.surrendered===true,confiscated:c.confiscated===true,lastOutcome:c.lastOutcome??null,evidence};
}
const revision = c => JSON.stringify({...c,status:terminal.has(c.status)?c.status:'open',lastOutcome:terminal.has(c.status)?c.lastOutcome:null,evidence:c.evidence.map(({position,subjectPosition,at,...e})=>e)});
const scenePosition = c => c.incidentPosition || c.evidence.find(e=>e.deliveredTo.length)?.subjectPosition || null;
function targetFor(c,stage) {
 if (stage==='intake'||stage==='review') return justice;
 if (stage==='scene') return `case-scene:${c.id}`;
 if (stage==='witness') return c.evidence.find(e=>e.kind!=='confession')?.witnessKey || c.evidence[0].witnessKey;
 return desk;
}
function validProof(c,stage,p) {
 if (!p || p.actorId!=='player' || !str(p.actorKey) || p.sourceRevision!==revision(c) || !Number.isFinite(p.elapsed) || p.elapsed<2 || p.clear!==true || p.standing!==true || !point(p.position) || !point(p.targetPosition) || Math.hypot(p.position.x-p.targetPosition.x,p.position.y-p.targetPosition.y,p.position.z-p.targetPosition.z)>2) return false;
 if (p.officeTerm!==undefined && (!principalProof(p) || c.subjectId==='player' || c.victimId==='player')) return false;
 if (principalProof(p) && ['intake','review','archive'].includes(stage)) return p.targetId===desk && Math.hypot(p.targetPosition.x-20.53,p.targetPosition.y-3.915,p.targetPosition.z-32.15)<.01 && (stage==='archive'?p.elapsed>=8:p.recipientId==='player'&&p.recipientBodyId===p.actorKey);
 if (stage==='intake'||stage==='review') return p.targetId===justice && p.recipientId===justice && str(p.recipientBodyId);
 if (stage==='witness') {
  const e=c.evidence.find(e=>e.witnessKey===p.witnessKey);
  return !!e && (p.witnessUnavailable===true ? p.targetId===desk && e.deliveredTo.length>0 : p.targetId===e.witnessKey && p.recipientBodyId===e.witnessKey);
 }
 if (p.targetId!==targetFor(c,stage)) return false;
 if (stage==='scene') {const target=scenePosition(c);return !!target && Math.hypot(target.x-p.targetPosition.x,target.y-p.targetPosition.y,target.z-p.targetPosition.z)<.01;}
 return true;
}
function outcome(c,steps) {
 const recorded=steps.find(s=>s.stage==='witness')?.proof.witnessUnavailable===true;
 const independent=c.evidence.filter(e=>e.kind!=='confession' && e.witnessKey!==c.subjectKey && (c.kind!=='fencing'||e.witnessKey!==c.counterpartyKey));
 // A repeated statement is never a second witness, and unavailable testimony
 // cannot manufacture corroboration. Results are referrals, never convictions.
 const corroborated=!recorded && independent.length>=2;
 const code=c.status==='released'&&c.lastOutcome==='sentence-served'?'sentence-already-served':terminal.has(c.status)?'source-closed':corroborated?'reviewed-referral':'insufficient-evidence';
 return {code,disposition:code==='insufficient-evidence'?'return-for-investigation':'archive-review',sourceStatus:c.status,recordedStatement:recorded,corroborated,returned:c.returned,surrendered:c.surrendered,sentenceApplied:false};
}
export function createChinaCriminalCases({saved=null,persist=()=>false,getCrime=()=>null,getAuthority=()=>null}={}) {
 let state={version:1,cases:[],principalDuties:[]},loadError=null,busy=false;
 try {
  if(saved!=null){
   const candidate=clone(saved);
   if(candidate?.version!==1 || !Array.isArray(candidate.cases) || new Set(candidate.cases.map(c=>c?.id)).size!==candidate.cases.length) throw Error();
   for(const row of candidate.cases){
    const source=sourceCase(row.source);
    if(!source || row.id!==source.id || row.sourceRevision!==revision(source) || !Array.isArray(row.steps) || row.steps.length>5 || !Array.isArray(row.history)) throw Error();
    for(const [i,step] of row.steps.entries()) if(step.stage!==stages[i] || !validProof(source,step.stage,step.proof)) throw Error();
    if(row.steps.some(s=>s.proof.actorKey!==row.steps[0].proof.actorKey)) throw Error();
    const intake=row.steps[0]?.proof,review=row.steps[3]?.proof;
    if(review&&!principalProof(review)&&review.recipientBodyId!==intake.recipientBodyId) throw Error();
    if(JSON.stringify(row.outcome)!==JSON.stringify(row.steps.length>=4?outcome(source,row.steps):null)) throw Error();
    if(row.supersededReviews!==undefined&&(!Array.isArray(row.supersededReviews)||row.supersededReviews.some(p=>!validProof(source,'review',p))))throw Error();
    for(const step of row.steps) if(step.proof.officeTerm && !equal(getAuthority(step.proof.officeTerm.appointmentId),step.proof.officeTerm)) throw Error();
    for(const history of row.history) if(!['sentence-already-served','source-closed','reviewed-referral','insufficient-evidence'].includes(history?.code)||typeof history.sourceRevision!=='string'||!history.sourceRevision.length||history.sentenceApplied!==false) throw Error();
   }
   candidate.principalDuties??=[];
   if(!Array.isArray(candidate.principalDuties)||new Set(candidate.principalDuties.map(d=>d.id)).size!==candidate.principalDuties.length)throw Error();
   for(const duty of candidate.principalDuties){const src=sourceCase(duty.source);if(!src||duty.steps?.length!==5||duty.steps.some(step=>step.proof.actorKey!==duty.steps[0].proof.actorKey)||duty.sourceRevision!==revision(src)||!duty.steps.every((step,i)=>step.stage===stages[i]&&validProof(src,step.stage,step.proof))||!equal(duty.steps[3].proof.officeTerm,duty.officeTerm)||!equal(duty,dutyFor({id:duty.caseId,source:src,sourceRevision:duty.sourceRevision,steps:duty.steps,outcome:outcome(src,duty.steps)}))||!equal(getAuthority(duty.appointmentId),duty.officeTerm))throw Error();}
   state=candidate;
  }
 }catch{loadError='invalid-case-review-save';}
 function sources(){
  if(loadError)return [];
  try{const snap=getCrime();if(snap?.version!==1||!Array.isArray(snap.cases))return [];const seen=new Set();return snap.cases.map(sourceCase).filter(c=>{if(!c||!c.reportRevision||!c.evidence.some(e=>e.deliveredTo.length)||seen.has(c.id))return false;seen.add(c.id);return true;});}catch{return [];}
 }
 function describe(c){
  const row=state.cases.find(r=>r.id===c.id),current=row?.sourceRevision===revision(c),steps=current?row.steps:[],term=getAuthority(),stage=term&&steps.length===4&&!equal(steps[3].proof.officeTerm,term)?'review':stages[steps.length]||'archived';
  if(current)c=clone(row.source);
  return {id:c.id,caseId:c.id,number:c.number,kind:c.kind,sourceRevision:revision(c),stage,targetId:targetFor(c,stage),duration:2,scenePosition:clone(scenePosition(c)),sceneLocationKind:c.incidentPosition?'incident':'reported-sighting',source:clone(c),evidence:clone(c.evidence),steps:clone(steps),outcome:current?clone(row?.outcome??null):null,stale:!!row&&!current,history:clone(row?.history||[]),previousOutcome:!current?clone(row?.outcome??null):null};
 }
 function view(id){const c=sources().find(c=>c.id===id);return c?describe(c):null;}
 function act(id,stage,proof){
  if(loadError||busy)return fail(loadError||'case-review-busy');
  let c=sources().find(c=>c.id===id);if(!c)return fail('case-not-available');
  const captured=state.cases.find(r=>r.id===id);if(captured?.sourceRevision===revision(c))c=clone(captured.source);
  if(proof?.officeTerm && !equal(getAuthority(),proof.officeTerm))return fail('justice-appointment-changed');
  if(getAuthority() && !proof?.officeTerm)return fail('principal-proof-required');
  if(!stages.includes(stage)||!validProof(c,stage,proof))return fail('invalid-case-review-proof');
  const current=state.cases.find(r=>r.id===id),same=current?.sourceRevision===revision(c),steps=same?current.steps:[],index=stages.indexOf(stage);
  const takeover=stage==='review'&&steps.length===4&&principalProof(proof)&&!equal(steps[3].proof.officeTerm,proof.officeTerm);
  if(index<steps.length&&!takeover)return JSON.stringify(steps[index].proof)===JSON.stringify(proof)?{ok:true,replayed:true,case:describe(c),events:[]}:fail('case-stage-already-completed');
  if(index!==steps.length&&!takeover)return fail('case-stage-order');
  if(steps.length&&proof.actorKey!==steps[0].proof.actorKey)return fail('case-actor-life-changed');
  if(stage==='review'&&!principalProof(proof)&&proof.recipientBodyId!==steps[0].proof.recipientBodyId)return fail('justice-life-changed');
  const next=clone(state),old=next.cases.find(r=>r.id===id);
  const row=same?old:{id,source:clone(c),sourceRevision:revision(c),steps:[],outcome:null,history:[...(old?.history||[]),...(old?.steps.length===5?[{sourceRevision:old.sourceRevision,code:old.outcome.code,sentenceApplied:false}]:[])]};
  if(!same){if(old)next.cases.splice(next.cases.indexOf(old),1,row);else next.cases.push(row);}
  if(takeover){row.supersededReviews=[...(row.supersededReviews||[]),clone(row.steps.pop().proof)];}
  if(stage==='archive'&&principalProof(proof)&&!equal(row.steps[3]?.proof.officeTerm,proof.officeTerm))return fail('principal-review-required');
  row.steps.push({stage,proof:clone(proof)});if(stage==='review')row.outcome=outcome(c,row.steps);
  if(stage==='archive'&&principalProof(proof)){const duty=dutyFor(row);if(!next.principalDuties.some(d=>d.id===duty.id))next.principalDuties.push(duty);}
  busy=true;
  try {
   const result=persist(clone(next));
   if(result?.then){Promise.resolve(result).catch(()=>{});return fail('save-failed');}
   if(result!==true&&result?.ok!==true)return fail('save-failed');
   state=next;return {ok:true,case:describe(c),events:[{kind:'case-review-stage',caseId:id,stage}]};
  }catch{return fail('save-failed');}finally{busy=false;}
 }
 return {principalDuties:()=>loadError?[]:clone(state.principalDuties),list:()=>sources().map(describe),view,act,snapshot:()=>clone(loadError?saved:state),status:()=>({ok:!loadError,reason:loadError})};
}
