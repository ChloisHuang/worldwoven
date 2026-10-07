// Shared, directional social evidence. Existing conversation ledgers remain the
// sole owner of their rewards; this ledger owns completed real service events.
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(x,a=-1,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=240&&!Object.hasOwn(Object.prototype,x)&&x!=='prototype';
const hash=text=>{let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const empty=()=>({version:1,socialVersion:1,receipts:{},people:{},conduct:{},recent:[]});
const evidenceId=x=>typeof x==='string'&&x.length>0&&x.length<=512;
const blankConduct=()=>({care:0,respect:0,integrity:0,acts:0,last:null,lastFault:null,cooldowns:{}});
const conductView=c=>({care:c?.care||0,respect:c?.respect||0,integrity:c?.integrity||0,score:clamp(((c?.care||0)+(c?.respect||0)+(c?.integrity||0))/3),acts:c?.acts||0,last:copy(c?.last||null),lastFault:copy(c?.lastFault||null)});
// Conduct is an authored appraisal of an actual resolved act. It never uses
// liking, trust, appearances, a payment amount, fame, or an observer count.
function conductCues(event){
 if(event.outcome!=='completed'&&!(event.outcome==='failed'&&event.fault))return null;
 if(event.source==='crime-consequences'&&['theft','property-theft'].includes(event.kind))return {care:0,respect:-.025,integrity:-.12,skill:0,label:'theft'};
 if(event.source==='crime-consequences'&&event.kind==='physical-harm')return {care:-.16,respect:-.08,integrity:0,skill:0,label:'harm'};
 if(event.source==='bath-privacy'&&event.kind==='privacy-intrusion'&&event.fault)return {care:0,respect:-.10,integrity:0,skill:0,label:'privacy-intrusion'};
 if(event.source==='bath-privacy'&&event.kind==='privacy-retreat'&&event.outcome==='completed')return {care:0,respect:.012,integrity:0,skill:0,label:'privacy-respected'};
 if(event.outcome==='failed')return {care:0,respect:0,integrity:-.035,skill:-.015,label:'responsibility-unfulfilled'};
 // Finishing a paid service is modest evidence of following through, not a
 // blanket virtue award. Other completed conversations are morally neutral.
 if(['service','meal','performance'].includes(event.kind))return {care:0,respect:0,integrity:.006,skill:.018,label:'followed-through'};
 return null;
}
const evidenceFor=(event,cues)=>({id:event.id,source:event.source,kind:event.kind,outcome:event.outcome,fault:event.fault,at:event.at,label:cues?.label||'met',...(event.conductEventId?{conductEventId:event.conductEventId}:{})});
function addConduct(conduct,event,cues){
 if(!cues)return;
 const key=event.source+':'+event.kind+':'+(event.outcome==='completed'?'positive':'other'),cooled=event.at<(conduct.cooldowns[key]??-Infinity);
 if(!cooled){for(const key of ['care','respect','integrity'])conduct[key]=clamp((conduct[key]||0)+cues[key]);conduct.cooldowns[key]=event.at+60;}
 conduct.acts++;conduct.last=evidenceFor(event,cues);if(event.fault||cues.care<0||cues.respect<0||cues.integrity<0)conduct.lastFault=copy(conduct.last);
}
function reputationEffect(cues,profile){
 if(!cues)return 0;
 const value=(key,fallback)=>.35+.65*clamp(profile.values?.[key]??fallback??.5,0,1);
 // Keeping one's word and respecting a boundary have different personal
 // salience; a stranger never inherits this observer's appraisal.
 const integrity=cues.integrity>0?.04:cues.integrity;
 return cues.care*value('care',profile.values?.company)+cues.respect*value('respect',profile.traits?.quiet)+integrity*value('reliability',profile.traits?.quiet)+cues.skill*value('curiosity',profile.traits?.curiosity);
}
export function relationshipProfile(id,source={},worldSeed=1){
 const traits={...source?.traits},values={...source?.values};
 for(const key of ['curiosity','quiet','sociability','outdoors','appetite'])if(!Number.isFinite(traits[key]))traits[key]=.25+hash(`life-v1|${worldSeed>>>0}|${id}${key}`)/4294967296*.65;
 for(const [key,trait] of [['company','sociability'],['quiet','quiet'],['curiosity','curiosity'],['reliability','quiet']])if(!Number.isFinite(values[key]))values[key]=traits[trait];
 return {...source,traits,values,needs:{social:.5,hunger:0,fatigue:0,...source?.needs},relations:{...source?.relations},opinions:{...source?.opinions},experiences:source?.experiences||[]};
}
export function relationshipEventEffect(event,observer,prior={}){
 // A decline, withdrawal, insufficient funds or interrupted workflow is not
 // misconduct. Only source-confirmed responsibility can incur distrust.
 if(event.outcome!=='completed'&&!(event.outcome==='failed'&&event.fault===true))return {relation:0,trust:0,aversion:0,feeling:'neutral'};
 if(event.source==='bath-privacy'&&event.kind==='privacy-retreat')return {relation:.003,trust:.008,aversion:0,feeling:'respected'};
 const reliability=clamp(observer.values?.reliability??observer.traits?.quiet??.5,0,1),interest=clamp(event.kind==='performance'?observer.traits?.curiosity:event.kind==='meal'||/meal|tea|kitchen/.test(event.source)?observer.traits?.appetite:observer.values?.company,0,1);
 const priorTrust=clamp(prior.trust),relationship=clamp((observer.relations?.[event.actorId]||0)+(prior.relation||0));
 if(event.outcome==='failed')return {relation:-.015-.02*reliability,trust:-.04-.04*reliability,aversion:.01+.025*reliability,feeling:'disappointed'};
 // Beauty never repairs broken trust. A real successful service may gradually
 // rebuild it; interests and prior experience differentiate the appreciation.
 const relation=(.012+.025*interest+.008*Math.max(0,relationship))*(priorTrust<-.2?.35:1);
 return {relation,trust:.016+.024*reliability,aversion:-.006,feeling:interest>.58?'appreciated':'acknowledged'};
}
export function createRelationshipEvents({saved,worldSeed=1,getProfile=()=>null,getSupportProfile=getProfile,getObserverIds=()=>[],getIdentity=null,saveState=()=>true}={}){
 let state=saved?.version===1&&saved.receipts&&saved.people?copy(saved):empty();
 state.recent??=[];
 state.conduct??={};
 // Old relationship deltas are not moral evidence. Preserve their exact
 // ownership and known identities, then start independent conduct at real
 // new receipts. Loading or replaying an old receipt cannot invent past acts.
 if(state.socialVersion!==1){
  for(const p of Object.values(state.people)){p.known??={};p.reputations??={};for(const [id,r]of Object.entries(p.relations||{}))if(validId(id)&&(r.knownEvents>0||r.last?.id))p.known[id]={firstEventId:r.last?.id||null,lastEventId:r.last?.id||null};}
  state.socialVersion=1;
 }
 const pair=(observer,subject)=>state.people[observer]?.relations?.[subject]||null;
 function record(input,{observationOnly=false,personalOnly=false,suppressOwnConduct=false}={}){
  if(!input||!validId(input.id)||!validId(input.source)||!validId(input.actorId)||(input.kind!==undefined&&!validId(input.kind))||!['completed','failed','refused','cancelled'].includes(input.outcome)||(personalOnly?input.participants!==undefined&&!Array.isArray(input.participants):!Array.isArray(input.participants))||!Number.isFinite(input.at)||input.at<0)return {ok:false,reason:'invalid-event'};
  const participants=[...new Set(input.participants??[input.actorId])].filter(validId).sort();
  if(personalOnly&&(participants.length!==1||participants[0]!==input.actorId))return {ok:false,reason:'personal-event-has-observers'};
  if(!participants.includes(input.actorId)||(!personalOnly&&participants.length<2))return {ok:false,reason:'no-informed-participant'};
  const event={id:input.id,source:input.source,actorId:input.actorId,participants,outcome:input.outcome,kind:input.kind||'service',at:input.at,fault:input.fault===true,...(observationOnly?{observationOnly:true}:{}),...(personalOnly?{personalOnly:true}:{}),...(suppressOwnConduct?{suppressOwnConduct:true,conductEventId:input.conductEventId}:{})};
  const signature=JSON.stringify(event),receipt=state.receipts[event.id];
  if(receipt){const recent=state.recent.find(e=>e.id===event.id);const prior=recent?JSON.stringify(Object.fromEntries([...new Set([...Object.keys(event),'observationOnly','personalOnly','suppressOwnConduct','conductEventId'])].map(k=>[k,recent[k]]))):typeof receipt==='string'?receipt:null;return prior&&prior!==signature?{ok:false,reason:'event-conflict'}:{ok:true,replayed:true};}
  const cues=conductCues(event);
  if((personalOnly||suppressOwnConduct)&&!cues)return {ok:false,reason:'no-completed-conduct'};
  if(suppressOwnConduct){
   const receipt=validId(input.conductEventId)&&state.receipts[input.conductEventId];
   if(!receipt)return {ok:false,reason:'unknown-conduct-evidence'};
   let origin=state.recent.find(e=>e.id===input.conductEventId);
   if(!origin&&typeof receipt==='string'){try{origin=JSON.parse(receipt);}catch{/* Legacy exact receipt remains authoritative. */}}
   // Older compacted receipts intentionally retain only exact IDs. Their
   // trusted business owner supplies the original actor/source metadata;
   // retained event bodies additionally reject conflicting evidence.
   if(origin&&(origin.suppressOwnConduct||['actorId','source','kind','outcome','fault'].some(key=>origin[key]!==event[key])))return {ok:false,reason:'conduct-evidence-conflict'};
  }
  const next=copy(state),results=[];
  if(cues&&!suppressOwnConduct)addConduct(next.conduct[event.actorId]??=blankConduct(),event,cues);
  // A personal event has only its actor, so no imagined witnesses or fame.
  for(const observerId of participants){
   if(observerId===event.actorId)continue;
   const person=next.people[observerId]??={relations:{}};
   person.known??={};person.reputations??={};
   const known=person.known[event.actorId]??={firstEventId:event.id};known.lastEventId=event.id;
   const appraisal=person.reputations[event.actorId]??={score:0,knownEvents:0,conduct:blankConduct(),cooldowns:{}};
   const profile=relationshipProfile(observerId,getProfile(observerId),worldSeed),appraisalKey=event.source+':'+event.kind+':'+(event.outcome==='completed'?'positive':'other');
   const alreadyKnown=!!(event.conductEventId&&appraisal.conductReceipts?.[event.conductEventId]);
   if(cues&&!alreadyKnown&&event.at>=(appraisal.cooldowns[appraisalKey]??-Infinity)){appraisal.score=clamp(appraisal.score+reputationEffect(cues,profile));appraisal.cooldowns[appraisalKey]=event.at+60;}
   if(!alreadyKnown)addConduct(appraisal.conduct,event,cues);
   if(cues&&(event.conductEventId||event.source==='crime-consequences')){appraisal.conductReceipts??={};appraisal.conductReceipts[event.conductEventId||event.id]=true;}
   appraisal.knownEvents++;appraisal.last=evidenceFor(event,cues);
   // Observation-only adapters are for a source that already owns its pair
   // rewards. They cannot apply a second trust/liking award here.
   if(observationOnly)continue;
   const old=person.relations[event.actorId]||{relation:0,trust:0,aversion:0,cooldowns:{},knownEvents:0};
   const relationship={...old,cooldowns:{...old.cooldowns}};
   const effect=relationshipEventEffect(event,profile,old),key=event.source+':'+event.kind+':'+(event.outcome==='completed'?'positive':'other');
   const meaningful=effect.relation!==0||effect.trust!==0||effect.aversion!==0;
   const cooled=meaningful&&event.at<(relationship.cooldowns[key]??-Infinity);
   const applied=cooled?{relation:0,trust:0,aversion:0,feeling:'remembered'}:effect;
   relationship.relation=clamp(relationship.relation+applied.relation);relationship.trust=clamp(relationship.trust+applied.trust);relationship.aversion=clamp(relationship.aversion+applied.aversion,0,1);
   if(meaningful&&!cooled)relationship.cooldowns[key]=event.at+60;
   relationship.knownEvents++;relationship.last={id:event.id,source:event.source,kind:event.kind,outcome:event.outcome,fault:event.fault,feeling:applied.feeling,at:event.at};
   person.relations[event.actorId]=relationship;results.push({observerId,subjectId:event.actorId,...applied});
  }
  // Keep exact IDs forever, not a full duplicate event body per receipt.
  // Recent bodies detect conflicting callers; old IDs still suppress every replay.
  next.receipts[event.id]=true;next.recent.push({...event,results});next.recent=next.recent.slice(-48);
  try{const result=saveState(copy(next));if(result===false||result?.then)return {ok:false,reason:'save-failed'};}catch{return {ok:false,reason:'save-failed'};}
  state=next;return {ok:true,results:copy(results)};
 }
 function projection(id,source={}){
  const p=relationshipProfile(id,source,worldSeed),social=state.people[id]?.relations||{};
  p.trust={...source?.trust};p.aversion={...source?.aversion};
  for(const [target,r] of Object.entries(social)){p.relations[target]=clamp((p.relations[target]||0)+r.relation);p.opinions[target]=clamp((p.opinions[target]||0)+r.trust-r.aversion*.5);p.trust[target]=r.trust;p.aversion[target]=r.aversion;}
  return p;
 }
 function knownReputation(observer,subject){return clamp(state.people[observer]?.reputations?.[subject]?.score||0);}
 function knownConduct(observer,subject){return conductView(state.people[observer]?.reputations?.[subject]?.conduct);}
 function completedMemory(profile,subject){const m=profile?.interactions?.[subject];return m?.completedCount>0&&evidenceId(m.lastCompletedId)?m:null;}
 function identityActive(id){
  if(id==='player'||!validId(id))return false;
  const identity=getIdentity?getIdentity(id):getProfile(id);
  return !!identity&&identity.alive!==false&&identity.retired!==true&&identity.active!==false&&(!identity.actorId||identity.actorId===id);
 }
 // One pair at an existing decision boundary; no world-wide supporter scan.
 function stanceFor(observer,id,profile=getSupportProfile(observer)){
  const memory=completedMemory(profile,id);
  if(observer===id||!memory||!evidenceId(memory.supportEventId)||!['support','withhold'].includes(memory.supportStance))return null;
  const current=pair(observer,id),fault=state.people[observer]?.reputations?.[id]?.conduct?.lastFault;
  const relation=Number.isFinite(profile?.relations?.[id])?profile.relations[id]:current?.relation||0;
  const trust=clamp((profile?.trust?.[id]??current?.trust??0)+(memory.trust||0)),aversion=profile?.aversion?.[id]??current?.aversion??0;
  const unacknowledgedFault=!!fault&&memory.supportEvidenceId!==fault.id&&memory.supportFaultId!==fault.id;
  const subjectIdentity=getIdentity?.(id),subjectActive=subjectIdentity?.alive!==false&&subjectIdentity?.retired!==true&&(!subjectIdentity?.actorId||subjectIdentity.actorId===id);
  const active=memory.supportStance==='support'&&subjectActive&&identityActive(observer)&&relation>=0&&trust>=0&&aversion<.25&&!memory.boundary&&!unacknowledgedFault&&knownReputation(observer,id)>=0;
  return {observerId:observer,stance:memory.supportStance,eventId:memory.supportEventId,active};
 }
 function socialState(id,context={}){
  const knownBy=[],supporters=[],stances=[],profiles=new Map();
  const supplied=Array.isArray(context.observerIds)?context.observerIds:getObserverIds();
  const candidates=[...new Set([...Object.keys(state.people),...(Array.isArray(supplied)?supplied:[]),...(validId(context.observerId)?[context.observerId]:[])])].filter(observer=>validId(observer)&&observer!==id).sort();
  for(const observer of candidates){
   const profile=getSupportProfile(observer),memory=completedMemory(profile,id),person=state.people[observer];profiles.set(observer,profile);
   if(person?.known?.[id]||person?.relations?.[id]?.knownEvents>0||memory)knownBy.push(observer);
   const stance=stanceFor(observer,id,profile);if(stance){stances.push(stance);if(stance.active)supporters.push(observer);}
  }
  // There is deliberately no worldwide reputation average. Factions, if a
  // real caller already has them, may aggregate only the supplied actual
  // observers who belong to that existing faction and possess local evidence.
  const contextObservers=validId(context.observerId)?[context.observerId]:Array.isArray(context.observerIds)?[...new Set(context.observerIds)].filter(validId):[];
  const informed=contextObservers.filter(observer=>observer!==id&&knownBy.includes(observer)&&(!context.factionId||(getIdentity?.(observer)?.factionId||profiles.get(observer)?.factionId)===context.factionId));
  const reputation=informed.length?clamp(informed.reduce((sum,observer)=>sum+knownReputation(observer,id),0)/informed.length):0;
  return {knownBy,supporters,supporterCount:supporters.length,stances,fame:knownBy.length,reputation,reputationObservers:informed,morality:conductView(state.conduct[id]),knownConduct:validId(context.observerId)?knownConduct(context.observerId,id):conductView(null)};
 }
 return {record:input=>record(input),observe:input=>record(input,{observationOnly:true}),recordPersonal:input=>record(input,{personalOnly:true}),observeWitness:input=>record(input,{observationOnly:true,suppressOwnConduct:true}),projection,snapshot:()=>copy(state),relationFor:(observer,subject)=>(pair(observer,subject)?.relation||0),knownOpinion:(observer,subject)=>clamp((pair(observer,subject)?.trust||0)-(pair(observer,subject)?.aversion||0)*.5),knownReputation,knownConduct,stanceFor,conductFor:id=>conductView(state.conduct[id]),pair:(observer,subject)=>copy(pair(observer,subject)),socialState};
}
