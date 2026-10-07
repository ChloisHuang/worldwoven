// Shared, directional social evidence. Existing conversation ledgers remain the
// sole owner of their rewards; this ledger owns completed real service events.
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(x,a=-1,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=240&&!['__proto__','constructor','prototype'].includes(x);
const hash=text=>{let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const empty=()=>({version:1,receipts:{},people:{},recent:[]});
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
 const reliability=clamp(observer.values?.reliability??observer.traits?.quiet??.5,0,1),interest=clamp(event.kind==='performance'?observer.traits?.curiosity:event.kind==='meal'||/meal|tea|kitchen/.test(event.source)?observer.traits?.appetite:observer.values?.company,0,1);
 const priorTrust=clamp(prior.trust),relationship=clamp((observer.relations?.[event.actorId]||0)+(prior.relation||0));
 if(event.outcome==='failed')return {relation:-.015-.02*reliability,trust:-.04-.04*reliability,aversion:.01+.025*reliability,feeling:'disappointed'};
 // Beauty never repairs broken trust. A real successful service may gradually
 // rebuild it; interests and prior experience differentiate the appreciation.
 const relation=(.012+.025*interest+.008*Math.max(0,relationship))*(priorTrust<-.2?.35:1);
 return {relation,trust:.016+.024*reliability,aversion:-.006,feeling:interest>.58?'appreciated':'acknowledged'};
}
export function createRelationshipEvents({saved,worldSeed=1,getProfile=()=>null,saveState=()=>true}={}){
 let state=saved?.version===1&&saved.receipts&&saved.people?copy(saved):empty();
 state.recent??=[];
 const pair=(observer,subject)=>state.people[observer]?.relations?.[subject]||null;
 function record(input){
  if(!input||!validId(input.id)||!validId(input.source)||!validId(input.actorId)||!['completed','failed','refused','cancelled'].includes(input.outcome)||!Array.isArray(input.participants)||!Number.isFinite(input.at)||input.at<0)return {ok:false,reason:'invalid-event'};
  const participants=[...new Set(input.participants)].filter(validId).sort();
  if(!participants.includes(input.actorId)||participants.length<2)return {ok:false,reason:'no-informed-participant'};
  const event={id:input.id,source:input.source,actorId:input.actorId,participants,outcome:input.outcome,kind:input.kind||'service',at:input.at,fault:input.fault===true};
  const signature=JSON.stringify(event),receipt=state.receipts[event.id];
  if(receipt){const recent=state.recent.find(e=>e.id===event.id);const prior=recent?JSON.stringify(Object.fromEntries(Object.keys(event).map(k=>[k,recent[k]]))):typeof receipt==='string'?receipt:null;return prior&&prior!==signature?{ok:false,reason:'event-conflict'}:{ok:true,replayed:true};}
  const next=copy(state),results=[];
  for(const observerId of participants){
   if(observerId===event.actorId)continue;
   const person=next.people[observerId]??={relations:{}},old=person.relations[event.actorId]||{relation:0,trust:0,aversion:0,cooldowns:{},knownEvents:0};
   const relationship={...old,cooldowns:{...old.cooldowns}};
   const profile=relationshipProfile(observerId,getProfile(observerId),worldSeed),effect=relationshipEventEffect(event,profile,old),key=event.source+':'+event.kind+':'+(event.outcome==='completed'?'positive':'other');
   const meaningful=effect.relation!==0||effect.trust!==0||effect.aversion!==0;
   const cooled=meaningful&&event.at<(relationship.cooldowns[key]??-Infinity);
   const applied=cooled?{relation:0,trust:0,aversion:0,feeling:'remembered'}:effect;
   relationship.relation=clamp(relationship.relation+applied.relation);relationship.trust=clamp(relationship.trust+applied.trust);relationship.aversion=clamp(relationship.aversion+applied.aversion,0,1);
   if(meaningful&&!cooled)relationship.cooldowns[key]=event.at+60;
   relationship.knownEvents++;relationship.last={id:event.id,source:event.source,kind:event.kind,outcome:event.outcome,feeling:applied.feeling,at:event.at};
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
 function socialState(id){const knownBy=[],supporters=[];let reputation=0;for(const [observer,p]of Object.entries(state.people)){const r=p.relations?.[id];if(!r)continue;knownBy.push(observer);reputation+=r.trust-r.aversion*.5;if(r.relation>.2&&r.trust>.1)supporters.push(observer);}return {knownBy,supporters,fame:knownBy.length,reputation:knownBy.length?clamp(reputation/knownBy.length):0};}
 return {record,projection,snapshot:()=>copy(state),relationFor:(observer,subject)=>(pair(observer,subject)?.relation||0),knownOpinion:(observer,subject)=>clamp((pair(observer,subject)?.trust||0)-(pair(observer,subject)?.aversion||0)*.5),pair:(observer,subject)=>copy(pair(observer,subject)),socialState};
}
