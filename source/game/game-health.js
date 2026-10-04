// Fictional game balance, not a model of real illness or medical treatment.
// No world/UI imports or automatic outbreak. The caller owns saves and supplies
// actual contacts (including wall/room eligibility) and positions for an interval.
// Split tick intervals when movement, contacts, needs or rest change. Seconds are
// simulation time; people without a local contact cannot create remote exposure.
const clamp=(n,fallback=0)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):fallback;
const positive=(n,fallback=0)=>Number.isFinite(n)&&n>=0?n:fallback;
const copy=value=>JSON.parse(JSON.stringify(value));
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0||1;}
function threshold(c){let x=c.random;x^=x<<13;x^=x>>>17;x^=x<<5;c.random=x>>>0||1;return .35-Math.log(1-c.random/4294967296);}

export const GAME_HEALTH_CONDITIONS=Object.freeze({
 'ember-weariness':Object.freeze({name:'余烬倦怠（虚构）',infectious:false,incubation:0,ill:150,recovery:120,immunity:0,symptom:'脚步发沉，想歇一会儿'}),
 mistbell:Object.freeze({name:'雾铃困倦（虚构）',infectious:true,incubation:90,ill:240,recovery:180,immunity:900,symptom:'声音发闷，有些乏力'})
});
const conditions=Object.entries(GAME_HEALTH_CONDITIONS);
const stages=new Set(['well','incubating','ill','recovering']);

// Independent actor/condition streams draw only at initialisation and after a
// complete course, never per frame or per listed target. A saved dose approaches
// a seeded threshold analytically, with rest/exposure clearance between contacts.
export function createGameHealth({worldSeed=1,actorIds=[],saved={}}={}){
 let time=saved.version===1?positive(saved.time):0;
 const people=new Map();
 for(const id of [...new Set(actorIds)].sort()){
  const key=`game-health-v1|${worldSeed>>>0}|${id}`,old=saved.version===1?saved.people?.[id]:null;
  const p={constitution:clamp(old?.constitution,.4+hash(key)/4294967296*.5),supportRemaining:positive(old?.supportRemaining),careReceipts:{},conditions:{}};
  for(const [provider,number]of Object.entries(old?.careReceipts||{}))if(Number.isSafeInteger(number)&&number>0)p.careReceipts={...p.careReceipts,[provider]:number};
  for(const [name,definition]of conditions){
   const previous=old?.conditions?.[name],c={random:hash(key+'|'+name),dose:0,threshold:0,stage:'well',remaining:0,immuneFor:0};
   c.threshold=threshold(c);
   if(previous){
    c.random=Number.isInteger(previous.random)&&previous.random>0?previous.random>>>0||1:c.random;
    c.dose=positive(previous.dose);c.threshold=positive(previous.threshold,c.threshold)||c.threshold;
    c.stage=stages.has(previous.stage)?previous.stage:'well';
    c.remaining=c.stage==='well'?0:positive(previous.remaining,definition[c.stage==='incubating'?'incubation':c.stage==='recovering'?'recovery':'ill']);
    c.immuneFor=definition.immunity&&c.stage==='well'?positive(previous.immuneFor):0;
   }
   p.conditions[name]=c;
  }
  people.set(id,p);
 }
 const snapshot=()=>({version:1,time,people:copy(Object.fromEntries(people))});
 function normaliseActors(actors){
  const supplied=new Map(actors.map(a=>[a.id,a]));
  return new Map([...people].map(([id,p])=>{
   const a=supplied.get(id)||{},fatigue=clamp(a.needs?.fatigue),nutrition=clamp(a.nutrition,1-clamp(a.needs?.hunger)),hygiene=clamp(a.hygiene,1);
   return [id,{...a,fatigue,nutrition,hygiene,exertion:clamp(a.exertion),resting:a.resting===true,
    vulnerability:(1.25-.65*p.constitution)*(1+.8*fatigue+.65*(1-nutrition)+.5*(1-hygiene)),protection:clamp(a.protection)}];
  }));
 }
 function localContacts(contacts,actors){
  const pairs=new Map();
  for(const contact of contacts){
   const ids=[contact.a,contact.b].sort(),[a,b]=ids.map(id=>actors.get(id));
   if(!a||!b||ids[0]===ids[1]||typeof a.sceneId!=='string'||!a.sceneId||a.sceneId!==b.sceneId)continue;
   if(![a.position,b.position].every(p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]))))continue;
   const distance=Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z);
   if(distance>=2)continue;
   const key=JSON.stringify(ids),protection=clamp(contact.protection),previous=pairs.get(key);
   // Duplicate descriptions of one encounter are not extra people/exposure.
   pairs.set(key,{ids,weight:(1-distance/2)*(1-a.protection)*(1-b.protection),protection:Math.max(protection,previous?.protection||0)});
  }
  return [...pairs].sort(([a],[b])=>a.localeCompare(b)).map(([,p])=>p);
 }
 function rates(actors,contacts){
  const exposure=new Map([...people.keys()].map(id=>[id,0]));
  for(const {ids,weight,protection}of contacts)for(let i=0;i<2;i++){
   // Only the invented mistbell's ill stage sheds in this game. Incubation and
   // noninfectious exertion weariness never become a general contagion source.
   if(people.get(ids[1-i]).conditions.mistbell.stage==='ill')exposure.set(ids[i],exposure.get(ids[i])+.018*weight*(1-protection));
  }
  const result=[];
  for(const [id,p]of people){
   const a=actors.get(id),speed=Math.max(.2,.35+.35*a.nutrition+.2*a.hygiene+.75*Number(a.resting)+.65*Number(p.supportRemaining>0)-.25*a.fatigue-.3*a.exertion);
   for(const [name,definition]of conditions){
    const c=p.conditions[name],infectious=definition.infectious;
    result.push({c,definition,speed:c.stage==='incubating'?1:speed,
     rate:(infectious?exposure.get(id):(a.resting?0:Math.max(0,a.exertion-.55)*(.4+a.fatigue)*.012))*a.vulnerability,
     decay:infectious?.002:.006+.02*Number(a.resting)+.003*a.nutrition+.001*a.hygiene});
   }
  }
  return result;
 }
 function timeToOnset({c,rate,decay}){
  if(c.dose>=c.threshold)return 0;
  const limit=rate/decay;
  return limit>c.threshold?-Math.log((limit-c.threshold)/(limit-c.dose))/decay:Infinity;
 }
 function transition(c,d){
  if(c.stage==='well'){c.dose=0;c.stage=d.incubation?'incubating':'ill';c.remaining=d.incubation||d.ill;}
  else if(c.stage==='incubating'){c.stage='ill';c.remaining=d.ill;}
  else if(c.stage==='ill'){c.stage='recovering';c.remaining=d.recovery;}
  else{c.stage='well';c.remaining=0;c.dose=0;c.immuneFor=d.immunity;c.threshold=threshold(c);}
 }
 return {
  tick(dt,{actors=[],contacts=[]}={}){
   if(!Number.isFinite(dt)||dt<0)throw new RangeError('Health tick requires nonnegative simulation seconds');
   if(!dt)return;
   const inputs=normaliseActors(actors),local=localContacts(contacts,inputs);
   let left=dt;
   // Advance to the next real onset/stage/immunity/care event. Recompute source
   // shedding there so one long tick and subdivided ticks tell the same story.
   while(left>0){
    const rows=rates(inputs,local),events=[];
    for(const p of people.values())if(p.supportRemaining>0)events.push({in:p.supportRemaining,finish:()=>{p.supportRemaining=0;}});
    for(const row of rows){
     const {c,definition,speed}=row;
     if(c.stage!=='well')events.push({in:c.remaining/speed,finish:()=>transition(c,definition)});
     else if(c.immuneFor>0)events.push({in:c.immuneFor,finish:()=>{c.immuneFor=0;}});
     else events.push({in:timeToOnset(row),finish:()=>transition(c,definition)});
    }
    const step=Math.min(left,...events.map(e=>e.in));
    for(const {c,rate,decay,speed}of rows){
     if(c.stage!=='well')c.remaining=Math.max(0,c.remaining-step*speed);
     else if(c.immuneFor>0){c.immuneFor=Math.max(0,c.immuneFor-step);c.dose=0;}
     else c.dose=Math.max(0,c.dose*Math.exp(-decay*step)+rate/decay*(-Math.expm1(-decay*step)));
    }
    for(const p of people.values())p.supportRemaining=Math.max(0,p.supportRemaining-step);
    time+=step;left=Math.max(0,left-step);
    for(const event of events)if(event.in<=step)event.finish();
   }
  },
  // One authored exposure that already happened (for example a visitor's
  // journey). The world owns the event identity and must persist its receipt.
  // Constitution changes the accumulated dose, not a per-frame random draw.
  expose(id,{condition='mistbell',dose=0}={}){
   const p=people.get(id),c=p?.conditions[condition],definition=GAME_HEALTH_CONDITIONS[condition];
   if(!c||!definition.infectious||!Number.isFinite(dose)||dose<=0||c.stage!=='well'||c.immuneFor>0)return false;
   c.dose+=Math.min(4,dose)*(1.25-.65*p.constitution);
   if(c.dose>=c.threshold)transition(c,definition);
   return true;
  },
  // World clinic hook: call only after a confirmed physical handoff, using its
  // persisted provider/serial. A receipt cannot be replayed after save/reload.
  // This starts supportive game care; it never instantly cures or changes needs.
  applyCare(id,{providerId,receiptNumber}={}){
   const p=people.get(id);
   if(!p||typeof providerId!=='string'||!providerId||!Number.isSafeInteger(receiptNumber)||receiptNumber<=0)return false;
   if(Object.hasOwn(p.careReceipts,providerId)&&receiptNumber<=p.careReceipts[providerId])return false;
   p.careReceipts={...p.careReceipts,[providerId]:receiptNumber};p.supportRemaining=Math.max(p.supportRemaining,180);return true;
  },
  // Safe presentation/decision hook: hidden thresholds, seeds, incubation and
  // immunity remain in snapshot only. Absence is advice for a future job caller.
  status(id){
   const p=people.get(id);if(!p)return null;
   const visible=conditions.filter(([name])=>['ill','recovering'].includes(p.conditions[name].stage));
   const ill=visible.some(([name])=>p.conditions[name].stage==='ill');
   return {symptoms:visible.map(([name,d])=>p.conditions[name].stage==='ill'?d.symptom:'精神在恢复，还想慢些活动'),
    restRecommended:visible.length>0,absenceRecommended:ill,
    careStatus:p.supportRemaining>0?'support-active':ill?'care-advised':'none'};
  },
  snapshot
 };
}
