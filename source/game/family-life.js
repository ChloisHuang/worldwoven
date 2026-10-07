// ST08: simulation-time family records. No wall-clock aging, inferred adult ages,
// implicit consent, paid-service conception, or inherited employment/title.
export const FAMILY_YEAR_DAYS=365;
export const FAMILY_GESTATION_DAYS=280;
export const FAMILY_CONCEPTION_CHANCE=.15;
const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.length>0&&x.length<=240;
const id=x=>text(x)&&!['__proto__','prototype','constructor'].includes(x);
const day=x=>Number.isFinite(x)&&x>=0&&x<=Number.MAX_SAFE_INTEGER-FAMILY_GESTATION_DAYS;
const age=x=>Number.isFinite(x)&&x>=0&&x<10000;
const roles=new Set(['gestational','contributing','none']);
const sources=new Set(['palace','salon','public-private']);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function familyConceptionRoll(seed,eventId){
 let h=(2166136261^(seed>>>0))>>>0;
 for(const c of String(eventId)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
 h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;
 return (h>>>0)/4294967296;
}
const ageAt=(a,t)=>a.ageYears===null?null:a.ageYears+Math.floor(Math.max(0,Math.min(a.diedDay??t,t)-a.ageAnchorDay)/FAMILY_YEAR_DAYS);
export const familyAgeStage=a=>!age(a)?'unknown':a<18?'child':a<60?'adult':'elder';
const childId=eventId=>`family-child:${eventId}`;
const pregnancyId=eventId=>`pregnancy:${eventId}`;
const validIdentity=a=>obj(a)&&id(a.actorId??a.id)&&text(a.name)&&text(a.country)&&typeof a.alive==='boolean'&&(a.ageYears==null||age(a.ageYears))&&(a.reproductiveRole===undefined||roles.has(a.reproductiveRole))&&(a.royalParentAtBirth===undefined||typeof a.royalParentAtBirth==='boolean')&&(a.royalSpouseOf===undefined||a.royalSpouseOf===null||id(a.royalSpouseOf));
function validate(s,seed){
 const fail=()=>{throw Error('invalid-family-state');};
 if(!obj(s)||s.version!==1||s.worldSeed!==(seed>>>0)||!Number.isSafeInteger(s.revision)||s.revision<0||!day(s.nowDay)||!obj(s.actors)||!Array.isArray(s.events)||!Array.isArray(s.pregnancies)||!Array.isArray(s.plans))fail();
 for(const [key,a] of Object.entries(s.actors)){
  if(!id(key)||!obj(a)||a.actorId!==key||!text(a.name)||!text(a.country)||!(a.ageYears===null||age(a.ageYears))||!day(a.ageAnchorDay)||a.ageAnchorDay>s.nowDay||typeof a.alive!=='boolean'||!(a.diedDay===null||day(a.diedDay)&&a.diedDay>=a.ageAnchorDay&&a.diedDay<=s.nowDay)||a.alive&&a.diedDay!==null||!a.alive&&a.diedDay===null||!roles.has(a.reproductiveRole)||typeof a.contraception!=='boolean'||!Number.isSafeInteger(a.planningRevision)||a.planningRevision<0||!(a.lastCareDay===null||day(a.lastCareDay)&&a.lastCareDay<=s.nowDay)||!(a.lastCaregiverId===null||own(s.actors,a.lastCaregiverId))||typeof a.royalParentAtBirth!=='boolean'||!(a.royalSpouseOf===null||id(a.royalSpouseOf))||!(a.childGender===null||['female','male'].includes(a.childGender))||!Array.isArray(a.parentIds)||a.parentIds.length!==0&&a.parentIds.length!==2||new Set(a.parentIds).size!==a.parentIds.length||a.parentIds.some(p=>p===key||!own(s.actors,p))||!(a.birthDay===null||day(a.birthDay)&&a.birthDay<=s.nowDay)||!(a.birthCountry===null||text(a.birthCountry))||!(a.caregiverId===null||a.parentIds.includes(a.caregiverId)||a.caregiverId===a.guardianId)||!(a.guardianId===null||a.guardianId!==key&&own(s.actors,a.guardianId))||!Array.isArray(a.royalParentIdsAtBirth)||a.royalParentIdsAtBirth.some(p=>!a.parentIds.includes(p)))fail();
  if(a.parentIds.length&&(a.birthDay===null||a.birthCountry===null||a.childGender===null||a.ageYears!==0||a.ageAnchorDay!==a.birthDay)||!a.parentIds.length&&(a.birthDay!==null||a.birthCountry!==null||a.childGender!==null||a.guardianId!==null||a.caregiverId!==null||a.royalParentIdsAtBirth.length))fail();
 }
 const planIds=new Set();
 for(const p of s.plans){if(!obj(p)||!id(p.id)||planIds.has(p.id)||!day(p.day)||p.day>s.nowDay||!(p.startedSeconds===null||day(p.startedSeconds))||!Array.isArray(p.participants)||p.participants.length!==2||p.participants[0]===p.participants[1]||!obj(p.consent)||!obj(p.planningRevisions)||p.participants.some(k=>!own(s.actors,k)||p.consent[k]!==true||!Number.isSafeInteger(p.planningRevisions[k])||p.planningRevisions[k]<0||p.planningRevisions[k]>s.actors[k].planningRevision))fail();planIds.add(p.id);}
 const seen=new Set();
 for(const e of s.events){
  if(!validEventShape(e.receipt)||e.id!==e.receipt.id||seen.has(e.id)||e.receipt.day>s.nowDay||e.roll!==familyConceptionRoll(seed,e.id)||!['contraception','no-mutual-plan','ineligible-roles','already-pregnant','no-conception','conceived'].includes(e.outcome))fail();
  seen.add(e.id);
  if(e.receipt.participants.some(p=>!own(s.actors,p.actorId)||e.receipt.day<s.actors[p.actorId].ageAnchorDay||ageAt(s.actors[p.actorId],e.receipt.day)!==p.ageYears||s.actors[p.actorId].diedDay!==null&&s.actors[p.actorId].diedDay<e.receipt.day))fail();
  if(e.planId!==null&&!planIds.has(e.planId)||e.outcome==='conceived'&&e.planId===null)fail();
  if(e.planId!==null){const p=s.plans.find(p=>p.id===e.planId);if(e.receipt.day<p.day||p.participants.some(k=>!e.receipt.participants.some(a=>a.actorId===k))||p.startedSeconds!==null&&(!day(e.receipt.completedSeconds)||e.receipt.completedSeconds<p.startedSeconds))fail();}
  if(e.outcome==='conceived'&&e.roll>=FAMILY_CONCEPTION_CHANCE||e.outcome==='no-conception'&&e.roll<FAMILY_CONCEPTION_CHANCE)fail();
 }
 const pregnancies=new Set(),open=new Set();
 for(const p of s.pregnancies){
  const e=s.events.find(e=>e.id===p.eventId),mother=s.actors[p.gestationalId],father=s.actors[p.contributingId];
  if(!obj(p)||p.id!==pregnancyId(p.eventId)||pregnancies.has(p.id)||!e||e.outcome!=='conceived'||!mother||!father||p.gestationalId===p.contributingId||p.conceivedDay!==e.receipt.day||p.dueDay!==p.conceivedDay+FAMILY_GESTATION_DAYS||!['pregnant','born','interrupted'].includes(p.status))fail();
  pregnancies.add(p.id);
  const m=e.receipt.participants.find(a=>a.actorId===p.gestationalId),f=e.receipt.participants.find(a=>a.actorId===p.contributingId);
  if(!m||!f||m.reproductiveRole!=='gestational'||m.ageYears>45||f.reproductiveRole!=='contributing')fail();
  if(p.status==='pregnant') {if(p.childId!==null||p.endedDay!==null||!mother.alive||p.dueDay<=s.nowDay||open.has(p.gestationalId))fail();open.add(p.gestationalId);}
  else if(p.status==='born') {const c=s.actors[p.childId];if(p.childId!==childId(p.eventId)||!c||p.endedDay!==p.dueDay||c.birthDay!==p.dueDay||c.childGender!==(familyConceptionRoll(seed,`${p.eventId}:child-gender`)<.5?'female':'male')||!same(c.parentIds,[p.gestationalId,p.contributingId]))fail();}
  else if(p.childId!==null||!day(p.endedDay)||p.endedDay<p.conceivedDay||p.endedDay>s.nowDay||p.endedDay!==mother.diedDay||p.endedDay>p.dueDay||mother.alive)fail();
 }
 if(s.events.some(e=>e.outcome==='conceived'&&!pregnancies.has(pregnancyId(e.id)))||Object.values(s.actors).some(a=>a.parentIds.length&&!s.pregnancies.some(p=>p.childId===a.actorId)))fail();
 return copy(s);
}
function validEventShape(e){
 return obj(e)&&id(e.id)&&e.id.length<=200&&sources.has(e.source)&&e.stage==='completed'&&e.completed===true&&e.paid===false&&(e.completedSeconds===undefined||day(e.completedSeconds))&&day(e.day)&&Array.isArray(e.participants)&&e.participants.length===2&&e.participants[0].actorId!==e.participants[1].actorId&&e.participants.every(p=>obj(p)&&id(p.actorId)&&text(p.name)&&text(p.country)&&age(p.ageYears)&&p.ageYears>=18&&p.alive===true&&p.consent===true&&roles.has(p.reproductiveRole));
}
/** saveState is synchronous and transactional; returning false or throwing leaves
 * memory unchanged. verifyCompletion authenticates a real runtime completion. */
export function createFamilyLife({saved,worldSeed=1,nowDay=0,saveState,verifyCompletion}={}){
 let state={version:1,revision:0,worldSeed:worldSeed>>>0,nowDay:day(nowDay)?nowDay:0,actors:{},events:[],pregnancies:[],plans:[]},loadError=null,busy=false;
 try{if(saved!=null)state=validate(saved,worldSeed);}catch{loadError='invalid-family-state';}
 const fail=code=>({ok:false,code});
 function transaction(fn){
  if(loadError)return fail(loadError);if(busy)return fail('family-busy');
  const next=copy(state);busy=true;
  try{const result=fn(next);if(!result.ok||result.replayed)return result;
   if(same(next,state))return {...copy(result),replayed:true};
   next.revision++;validate(next,worldSeed);
   if(saveState){const saved=saveState(copy(next));if(saved===false||saved&&typeof saved.then==='function')return fail('save-failed');}
   state=next;return copy(result);
  }catch(e){return fail(e.message==='invalid-family-state'?'invalid-family-state':'save-failed');}finally{busy=false;}
 }
 function relatedIn(s,left,right){if(left===right)return true;const ancestry=id=>{const seen=new Set(),stack=[id];while(stack.length){const k=stack.pop();if(seen.has(k))continue;seen.add(k);const a=s.actors[k];if(a){stack.push(...a.parentIds);if(a.guardianId)stack.push(a.guardianId);}}return seen;};const a=ancestry(left),b=ancestry(right);return [...a].some(k=>b.has(k));}
 const actor=(s,k)=>id(k)&&own(s.actors,k)?s.actors[k]:null;
 function refreshCaregivers(s){for(const c of Object.values(s.actors))if(c.parentIds.length)c.caregiverId=c.parentIds.find(k=>s.actors[k]?.alive)??(s.actors[c.guardianId]?.alive?c.guardianId:null);}
 function settle(s){
  for(const p of s.pregnancies){if(p.status!=='pregnant')continue;const mother=s.actors[p.gestationalId];
   if(!mother.alive&&mother.diedDay<=p.dueDay){p.status='interrupted';p.endedDay=mother.diedDay;p.childId=null;continue;}
   if(s.nowDay<p.dueDay)continue;
   const parents=[p.gestationalId,p.contributingId],cid=childId(p.eventId);
   if(own(s.actors,cid))throw Error('invalid-family-state');
   s.actors[cid]={actorId:cid,name:`${mother.name}的孩子·${Object.values(s.actors).filter(a=>a.parentIds.length).length+1}`,childGender:familyConceptionRoll(worldSeed,`${p.eventId}:child-gender`)<.5?'female':'male',country:mother.country,ageYears:0,ageAnchorDay:p.dueDay,alive:true,diedDay:null,reproductiveRole:'none',contraception:true,planningRevision:0,lastCareDay:null,lastCaregiverId:null,royalParentAtBirth:false,royalSpouseOf:null,parentIds:parents,birthDay:p.dueDay,birthCountry:mother.country,caregiverId:null,guardianId:null,royalParentIdsAtBirth:parents.filter(k=>s.actors[k].royalParentAtBirth&&parents.some(other=>other!==k&&s.actors[other].royalSpouseOf===k))};
   p.status='born';p.endedDay=p.dueDay;p.childId=cid;
  }for(const child of Object.values(s.actors))if(child.parentIds.length&&child.alive&&ageAt(child,s.nowDay)>=18&&child.planningRevision===0){child.reproductiveRole=child.childGender==='female'?'gestational':'contributing';child.contraception=true;child.planningRevision=1;}refreshCaregivers(s);
 }
 function register(identity,atDay=state.nowDay){
  if(loadError)return fail(loadError);if(!validIdentity(identity))return fail('invalid-identity');
  const known=actor(state,identity.actorId??identity.id);
  // Runtime may check explicit death each frame; unchanged registrations stay O(1).
  if(!busy&&atDay===state.nowDay&&known&&known.name===identity.name&&known.country===identity.country&&(!known.alive||identity.alive)&&(!known.alive||known.ageYears!==null||identity.ageYears==null)&&(identity.royalParentAtBirth===undefined||known.royalParentAtBirth===identity.royalParentAtBirth)&&(identity.royalSpouseOf===undefined||known.royalSpouseOf===identity.royalSpouseOf))return {ok:true,code:'registered',actorId:known.actorId,replayed:true};
  return transaction(s=>{
  if(!day(atDay)||atDay<s.nowDay)return fail('invalid-clock');
  s.nowDay=atDay;const key=identity.actorId??identity.id,old=actor(s,key);
  if(old){old.name=identity.name;old.country=identity.country;if(old.alive&&old.ageYears===null&&age(identity.ageYears)){old.ageYears=identity.ageYears;old.ageAnchorDay=atDay;}
   // A stale scene registration cannot resurrect a recorded death or reset age.
   if(old.alive&&!identity.alive){old.alive=false;old.diedDay=atDay;}
   if(identity.royalParentAtBirth!==undefined)old.royalParentAtBirth=identity.royalParentAtBirth;if(identity.royalSpouseOf!==undefined)old.royalSpouseOf=identity.royalSpouseOf;
  }else s.actors[key]={actorId:key,name:identity.name,childGender:null,country:identity.country,ageYears:identity.ageYears??null,ageAnchorDay:atDay,alive:identity.alive,diedDay:identity.alive?null:atDay,reproductiveRole:identity.reproductiveRole??'none',contraception:true,planningRevision:0,lastCareDay:null,lastCaregiverId:null,royalParentAtBirth:identity.royalParentAtBirth??false,royalSpouseOf:identity.royalSpouseOf??null,parentIds:[],birthDay:null,birthCountry:null,caregiverId:null,guardianId:null,royalParentIdsAtBirth:[]};
  settle(s);return {ok:true,code:'registered',actorId:key};
 });}
 function observeDeaths(ids,atDay=state.nowDay){return transaction(s=>{if(!Array.isArray(ids)||ids.some(k=>!actor(s,k))||!day(atDay)||atDay<s.nowDay)return fail('invalid-death-observation');const dead=ids.filter(k=>s.actors[k].alive);if(!dead.length)return {ok:true,replayed:true};s.nowDay=atDay;for(const k of dead){s.actors[k].alive=false;s.actors[k].diedDay=atDay;}settle(s);return {ok:true,code:'deaths-observed'};});}
 function advance(atDay){return transaction(s=>{if(!day(atDay)||atDay<s.nowDay)return fail('invalid-clock');if(atDay===s.nowDay)return {ok:true,code:'unchanged',replayed:true};s.nowDay=atDay;settle(s);return {ok:true,code:'advanced',nowDay:atDay};});}
 function setFamilyPlanning(key,settings){return transaction(s=>{
  const a=actor(s,key);if(!a||!a.alive||ageAt(a,s.nowDay)===null||ageAt(a,s.nowDay)<18)return fail('living-adult-required');
  if(!obj(settings)||Object.keys(settings).length===0||Object.keys(settings).some(k=>!['contraception','reproductiveRole'].includes(k))||settings.contraception!==undefined&&typeof settings.contraception!=='boolean'||settings.reproductiveRole!==undefined&&!roles.has(settings.reproductiveRole))return fail('invalid-family-planning');
  if((settings.contraception===undefined||settings.contraception===a.contraception)&&(settings.reproductiveRole===undefined||settings.reproductiveRole===a.reproductiveRole))return {ok:true,code:'unchanged',replayed:true};
  a.planningRevision++;
  if(settings.contraception!==undefined)a.contraception=settings.contraception;
  if(settings.reproductiveRole!==undefined)a.reproductiveRole=settings.reproductiveRole;
  return {ok:true,code:'family-planning-updated',actorId:key};
 });}
 function writePlan(s,plan,agree=false){
  if(!obj(plan)||!id(plan.id)||!Array.isArray(plan.participants)||plan.participants.length!==2||plan.participants[0]===plan.participants[1]||!obj(plan.consent)||plan.participants.some(k=>!id(k)||plan.consent[k]!==true)||plan.startedSeconds!==undefined&&!day(plan.startedSeconds))return fail('mutual-plan-required');
  const prior=s.plans.find(p=>p.id===plan.id);if(prior)return same(prior.participants,plan.participants)&&same(prior.consent,plan.consent)&&prior.startedSeconds===(plan.startedSeconds??null)?{ok:true,code:'family-planned',replayed:true,plan:prior}:fail('plan-identity-conflict');
  if(relatedIn(s,...plan.participants))return fail('family-relationship-excluded');
  const people=plan.participants.map(k=>actor(s,k));if(people.some(a=>!a||!a.alive||ageAt(a,s.nowDay)===null||ageAt(a,s.nowDay)<18||!agree&&a.contraception)||!people.some(a=>a.reproductiveRole==='gestational'&&ageAt(a,s.nowDay)<=45)||!people.some(a=>a.reproductiveRole==='contributing'))return fail('eligible-unprotected-adults-required');
  if(agree)for(const a of people)if(a.contraception){a.contraception=false;a.planningRevision++;}
  const record={id:plan.id,participants:copy(plan.participants),consent:copy(plan.consent),day:s.nowDay,startedSeconds:plan.startedSeconds??null,planningRevisions:Object.fromEntries(people.map(a=>[a.actorId,a.planningRevision]))};s.plans.push(record);return {ok:true,code:'family-planned',plan:record};
 }
 const planFamily=plan=>transaction(s=>writePlan(s,plan));
 const agreeFamilyPlan=plan=>transaction(s=>writePlan(s,plan,true));
 function appointGuardian(child,guardian,consent){return transaction(s=>{
  const c=actor(s,child),a=actor(s,guardian);
  if(consent?.consent!==true)return fail('guardian-consent-required');
  if(!c||!c.alive||!c.parentIds.length||ageAt(c,s.nowDay)>=18||c.parentIds.some(k=>s.actors[k].alive)||!a||!a.alive||ageAt(a,s.nowDay)===null||ageAt(a,s.nowDay)<18||child===guardian)return fail('orphan-and-living-adult-required');
  c.guardianId=guardian;refreshCaregivers(s);return {ok:true,code:'guardian-appointed',childId:child,guardianId:guardian};
 });}
 function care(child,caregiver,atDay=state.nowDay){return transaction(s=>{
  if(!day(atDay)||atDay<s.nowDay)return fail('invalid-clock');const c=actor(s,child),a=actor(s,caregiver);
  if(!c||!c.alive||!a||!a.alive||!(c.parentIds.includes(caregiver)||c.guardianId===caregiver)||ageAt(a,atDay)===null||ageAt(a,atDay)<18||ageAt(c,atDay)>=18)return fail('living-parent-and-child-required');
  s.nowDay=atDay;settle(s);c.lastCareDay=atDay;c.lastCaregiverId=caregiver;return {ok:true,code:'child-cared-for',childId:child,caregiverId:caregiver};
 });}
 function recordCompleted(event){return transaction(s=>{
  if(!validEventShape(event))return fail('completed-consensual-adult-event-required');
  const existing=s.events.find(e=>e.id===event.id);if(existing)return same(existing.receipt,event)?{ok:true,code:existing.outcome,replayed:true,event:existing}:fail('event-identity-conflict');
  if(event.day>s.nowDay)return fail('future-completion');
  let verified=false;try{verified=verifyCompletion?.(copy(event))===true;}catch{}if(!verified)return fail('unverified-completion');
  if(relatedIn(s,...event.participants.map(p=>p.actorId)))return fail('family-relationship-excluded');
  const people=event.participants.map(p=>actor(s,p.actorId));
  if(people.some((a,i)=>!a||!a.alive||a.name!==event.participants[i].name||a.country!==event.participants[i].country||ageAt(a,event.day)!==event.participants[i].ageYears||a.reproductiveRole!==event.participants[i].reproductiveRole))return fail('identity-mismatch');
  const mother=people.find(a=>a.reproductiveRole==='gestational'&&ageAt(a,event.day)<=45),father=people.find(a=>a.reproductiveRole==='contributing');
  const plan=[...s.plans].reverse().find(p=>p.day<=event.day&&p.participants.every(k=>people.some(a=>a.actorId===k&&a.planningRevision===p.planningRevisions[k]))&&(p.startedSeconds===null||day(event.completedSeconds)&&event.completedSeconds>=p.startedSeconds));
  const roll=familyConceptionRoll(worldSeed,event.id);
  const outcome=people.some(a=>a.contraception)?'contraception':!mother||!father?'ineligible-roles':!plan?'no-mutual-plan':s.pregnancies.some(p=>p.gestationalId===mother.actorId&&p.status==='pregnant')?'already-pregnant':roll<FAMILY_CONCEPTION_CHANCE?'conceived':'no-conception';
  const recorded={id:event.id,receipt:copy(event),planId:plan?.id??null,roll,outcome};s.events.push(recorded);
  if(outcome==='conceived')s.pregnancies.push({id:pregnancyId(event.id),eventId:event.id,gestationalId:mother.actorId,contributingId:father.actorId,conceivedDay:event.day,dueDay:event.day+FAMILY_GESTATION_DAYS,status:'pregnant',endedDay:null,childId:null});
  settle(s);return {ok:true,code:outcome,event:recorded};
 });}
 function view(key){if(loadError)return null;const a=actor(state,key);if(!a)return null;const years=ageAt(a,state.nowDay);return {...copy(a),ageYears:years,ageStage:familyAgeStage(years),pregnancy:copy(state.pregnancies.find(p=>p.gestationalId===key&&p.status==='pregnant')??null),childIds:Object.values(state.actors).filter(c=>c.parentIds.includes(key)).map(c=>c.actorId)};}
 const children=country=>loadError?[]:Object.values(state.actors).filter(a=>a.parentIds.length&&(!country||a.country===country)).map(a=>view(a.actorId));
 const lineage=key=>{const a=view(key);return a?{actorId:key,parentIds:a.parentIds,childIds:a.childIds,royalParentIdsAtBirth:a.royalParentIdsAtBirth,birthCountry:a.birthCountry,caregiverId:a.caregiverId,guardianId:a.guardianId}:null;};
 return {related:(a,b)=>relatedIn(state,a,b),register,advance,observeDeaths,planFamily,agreeFamilyPlan,appointGuardian,care,recordCompleted,setFamilyPlanning,view,children,lineage,snapshot:()=>copy(loadError?saved:state),get loadError(){return loadError;}};
}
export const createFamilyLifeLedger=createFamilyLife;
