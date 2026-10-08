// Reversible fictional palace politics. Ordinary approval of someone's work
// never counts as consent to a change of ruler. All numbers below are game
// defaults; none of them are claims about historical institutions.
export const PALACE_USURPATION_VERSION = 1;
export const PALACE_USURPATION_DEFAULTS = Object.freeze({
  supporters: 3, circles: 2, politicalResponseSeconds: 4,
  officials: 3, guards: 2, cooldownDays: 3, minimumChance: .2, maximumChance: .9,
});
export const PALACE_USURPATION_ROUTES = Object.freeze([
  Object.freeze({id:'intrigue',label:'宫廷阴谋',description:'借实际宫廷事件使原帝暂时失能。'}),
  Object.freeze({id:'guard',label:'卫队响应',description:'争取现任负责人，取得现有卫队的实际响应。'}),
  Object.freeze({id:'abdication',label:'联合逼退',description:'由具名官员联合施压，让原帝失去统治权。'}),
]);
export const palaceUsurpationObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export const palaceUsurpationIdentifier = x => typeof x === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,255}$/.test(x);
export const palaceUsurpationInteger = x => Number.isSafeInteger(x) && x >= 0;
export const palaceUsurpationTime = x => palaceUsurpationObject(x) && palaceUsurpationInteger(x.day) && Number.isFinite(x.hour) && x.hour >= 0 && x.hour < 24;
export const palaceUsurpationAfter = (a,b) => palaceUsurpationTime(a) && palaceUsurpationTime(b) && (a.day > b.day || a.day === b.day && a.hour >= b.hour);
export const palaceUsurpationMinutes = x => x.day * 1440 + x.hour * 60;
export const palaceUsurpationCopy = x => JSON.parse(JSON.stringify(x));
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const number = (x,fallback=0) => Number.isFinite(x)?x:fallback;
const round = n => Math.round(n * 1e6) / 1e6;
const canonical = x => Array.isArray(x)?x.map(canonical):palaceUsurpationObject(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export const palaceUsurpationSame = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export const palaceUsurpationCaseId = (sequence,emperorRevision) => `palace-usurpation:${emperorRevision}:${sequence}`;
export function palaceUsurpationRoll(seed,key) {
  let hash=2166136261;
  for (const char of `palace-usurpation-v1|${seed>>>0}|${key}`) { hash ^= char.charCodeAt(0); hash=Math.imul(hash,16777619); }
  hash ^= hash>>>16; hash=Math.imul(hash,0x7feb352d); hash ^= hash>>>15;
  hash=Math.imul(hash,0x846ca68b); hash ^= hash>>>16;
  return (hash>>>0) / 4294967296;
}

// The host supplies existing, observable world facts. Snapshot only the fields
// this module uses; do not store or change relationships, careers or property.
export function palaceUsurpationContext(raw) {
  if (!palaceUsurpationObject(raw)) return null;
  const person = p => ({id:p?.id??null,bodyId:p?.bodyId??null,ageYears:Number.isFinite(p?.ageYears)?p.ageYears:null,alive:p?.alive===true});
  const residence = r => r && palaceUsurpationIdentifier(r.roomId) && palaceUsurpationIdentifier(r.bedId)?{roomId:r.roomId,bedId:r.bedId}:null;
  return {
    player:person(raw.player),
    emperor:{...person(raw.emperor),tenureRevision:palaceUsurpationInteger(raw.emperor?.tenureRevision)?raw.emperor.tenureRevision:null},
    supporters:Array.isArray(raw.supporters)?raw.supporters.map(p=>({
      ...person(p), name:typeof p.name==='string'?p.name.slice(0,100):p.id,
      eligible:p.eligible===true,supportsGeneral:p.supportsGeneral===true,
      roleId:p.roleId??null,circleId:p.circleId??null,
      relationship:clamp(number(p.relationship),-1,1),trust:clamp(number(p.trust),-1,1),
      informedOpinion:clamp(number(p.informedOpinion),-1,1),
      official:p.official===true,guardCommander:p.guardCommander===true,
    })):[],
    guard:{commanderId:raw.guard?.commanderId??null,guards:Array.isArray(raw.guard?.guards)?raw.guard.guards.map(p=>({id:p.id??null,bodyId:p.bodyId??null})):[]},
    experience:Object.fromEntries(PALACE_USURPATION_ROUTES.map(r=>[r.id,clamp(number(raw.experience?.[r.id]),0,6)])),
    exposure:clamp(number(raw.exposure),0,1),
    safety:Object.fromEntries(['oldWorkSettled','itemsSettled','meetingsSettled','actorTransitionsSafe'].map(k=>[k,raw.safety?.[k]===true])),
    residences:{player:residence(raw.residences?.player),formerEmperor:residence(raw.residences?.formerEmperor)},
  };
}
export function palaceUsurpationSupporters(context) {
  const seen=new Set(),bodies=new Set();
  return (context?.supporters||[]).filter(p=>{
    if (!palaceUsurpationIdentifier(p.id) || !palaceUsurpationIdentifier(p.bodyId) || p.id==='player' || p.id===context.emperor?.id ||
      seen.has(p.id) || bodies.has(p.bodyId) || p.bodyId===context.player?.bodyId || p.bodyId===context.emperor?.bodyId ||
      !p.alive || !(p.ageYears>=18) || !p.eligible || !palaceUsurpationIdentifier(p.roleId) || !palaceUsurpationIdentifier(p.circleId)) return false;
    seen.add(p.id);bodies.add(p.bodyId);return true;
  });
}
export function palaceUsurpationUnlock(context) {
  const supporters=palaceUsurpationSupporters(context).filter(p=>p.supportsGeneral),circles=new Set(supporters.map(p=>p.circleId));
  return {ok:supporters.length>=PALACE_USURPATION_DEFAULTS.supporters&&circles.size>=PALACE_USURPATION_DEFAULTS.circles,supporters,circles:[...circles].sort()};
}
export function palaceUsurpationPledgeDecision(seed,caseId,person) {
  const factors={generalSupport:person.supportsGeneral?.15:0,relationship:round(person.relationship*.2),trust:round(person.trust*.2),informedOpinion:round(person.informedOpinion*.1)};
  const chance=round(clamp(.35+Object.values(factors).reduce((sum,n)=>sum+n,0),.2,.9)),roll=palaceUsurpationRoll(seed,`${caseId}:political-response:${person.id}`);
  return {roll,chance,accepted:roll<chance,factors};
}
export function palaceUsurpationActivePledges(task,context) {
  const people=palaceUsurpationSupporters(context);
  return (task?.pledges||[]).filter(p=>p.accepted&&!p.withdrawn&&people.some(a=>a.id===p.actorId&&a.bodyId===p.bodyId&&a.roleId===p.roleId&&a.circleId===p.circleId));
}
export function palaceUsurpationResolution(seed,task,context) {
  const pledges=palaceUsurpationActivePledges(task,context),people=palaceUsurpationSupporters(context).filter(p=>pledges.some(a=>a.actorId===p.id));
  const mean=key=>people.length?people.reduce((sum,p)=>sum+p[key],0)/people.length:0;
  const factors={
    namedSupport:round(Math.min(pledges.length,6)*.045),
    circles:round(Math.min(new Set(pledges.map(p=>p.circleId)).size,3)*.04),
    relationships:round(mean('relationship')*.08+mean('trust')*.08+mean('informedOpinion')*.04),
    experience:round(task.selectedRoutes.reduce((sum,r)=>sum+Math.max(context.experience[r],task.experience?.[r]||0),0)/task.selectedRoutes.length*.025),
    preparation:round(task.selectedRoutes.length*.035),exposure:round(-context.exposure*.25),
  };
  const chance=round(clamp(.25+Object.values(factors).reduce((sum,n)=>sum+n,0),.2,.9)),roll=palaceUsurpationRoll(seed,`${task.id}:resolution`);
  return {roll,chance,passed:roll<chance,factors};
}
