// Personal life chooses at activity boundaries. Jobs keep their authored work;
// callers establish each actor's eligibility before asking for one decision.
const clamp=x=>Math.max(0,Math.min(1,x)),opinion=x=>Math.max(-1,Math.min(1,x));
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0||1;}
const copy=x=>JSON.parse(JSON.stringify(x));
const available=c=>c.available!==false&&c.reachable!==false;
const unique=items=>[...new Map(items.filter(available).map(c=>[c.id,c])).values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
export function createLifeDecisions({worldSeed=1,actorIds,saved={},onChange=()=>{}}){
 let time=Number.isFinite(saved.time)?saved.time:0,lastSave=time;
 const people={};
 for(const id of actorIds){
  const key=`life-v1|${worldSeed>>>0}|${id}`,old=saved.version===1?saved.people?.[id]:null;
  const p=people[id]=old?copy(old):{random:hash(key),choices:0,last:null,current:null,cooldowns:{},needs:{hunger:.10+hash(key+'hunger')/4294967296*.28,fatigue:.12+hash(key+'fatigue')/4294967296*.32,social:.20+hash(key+'social')/4294967296*.45},traits:Object.fromEntries(['curiosity','outdoors','sociability','quiet','appetite'].map(k=>[k,.25+hash(key+k)/4294967296*.65]))};
  p.relations??={};p.opinions??={};p.values??={company:p.traits.sociability,quiet:p.traits.quiet,curiosity:p.traits.curiosity};p.nextDecisionAt??=0;
  // Saved targets are intentions, never live scene objects or occupied seats.
 }
 const snapshot=()=>({version:1,time,people:copy(people)}),save=()=>{lastSave=time;onChange(snapshot());};
 function random(p){let x=p.random>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;p.random=x>>>0||1;return p.random/4294967296;}
 function preference(p,c,base){
  let value=c.base??base;
  for(const [key,k]of Object.entries(c.traits||{}))value+=(p.traits[key]||0)*k;
  for(const [key,k]of Object.entries(c.needs||{}))value+=(p.needs[key]||0)*k;
  return value;
 }
 function weight(p,c,hour){
  let value=preference(p,c,.2);
  if(c.id==='rest')value+=hour>=20||hour<7?1.6:0;
  if(c.id==='meal')value+=(hour>=11&&hour<14||hour>=17&&hour<20)?.8:0;
  if(c.id==='garden'&&(hour>=20||hour<6))value*=.22;
  if(p.last===c.id)value*=.18;
  return Math.max(.005,value);
 }
 function targets(c){
  // Legacy single-person choices migrate without changing their identity.
  return c.targets===undefined?(c.relationship?[{id:c.relationship.target,relationship:c.relationship}]:null):unique(c.targets);
 }
 function actions(p,candidates,hour){
  return unique(candidates).flatMap(c=>{
   if(time<(p.cooldowns[c.id]||0))return [];
   const pool=targets(c);
   if(pool&&!pool.length)return []; // Explicit finite targets, including any authored solo fallback.
   return [{choice:c,weight:weight(p,c,hour),targets:pool?.map(target=>{
    const r=target.relationship;let value=preference(p,target,1);
    if(r)value+=(p.relations[r.target]||0)*(r.weight??.5)+(p.opinions[r.target]||0)*(r.opinionWeight??.5);
    return {choice:target,weight:Math.max(.005,value)};
   })||null}];
  });
 }
 function pick(entries,roll){const total=entries.reduce((sum,c)=>sum+c.weight,0);roll*=total;return entries.find(c=>(roll-=c.weight)<0)||entries.at(-1);}
 // A raw target carries score fields plus choice: {facilityId, route, ...}.
 // Only that execution payload overrides the action; target.id stays targetId.
 function materialize(action,target,current){return {...action,...target?.choice,id:action.id,...(target?{targetId:target.id,relationship:target.relationship||null}:{}),...current};}
 function observe(id,c,{observers=[]}={}){
  const actor=people[id],current=actor?.current,event=c.socialEvent;
  if(!current||current.id!==c.id||current.targetId!==(c.targetId??c.relationship?.target)||!event)return [];
  const changed=[];current.observedBy??=[];
  // Knowledge comes from the completed scene interaction, never all NPCs.
  for(const observer of observers){
   const p=people[observer.id];if(!p||observer.id===id||!['participant','witness','told'].includes(observer.knowledge)||current.observedBy.includes(observer.id))continue;
   const cues=Object.entries(event.values||{}),total=cues.reduce((sum,[,v])=>sum+Math.abs(v),0);
   if(!total)continue;
   const previous=p.opinions[id]||0,alignment=cues.reduce((sum,[key,v])=>sum+(p.values[key]??.5)*v,0)/total;
   const delta=(event.strength??.08)*(alignment+previous*.25+(p.relations[id]||0)*.1);
   p.opinions[id]=opinion(previous+delta);current.observedBy.push(observer.id);changed.push({observerId:observer.id,actorId:id,delta:p.opinions[id]-previous});
  }
  if(changed.length)save();return changed;
 }
 return {
  tick(dt){if(!Number.isFinite(dt)||dt<=0)return;time+=dt;for(const p of Object.values(people)){p.needs.hunger=clamp(p.needs.hunger+dt/850);p.needs.fatigue=clamp(p.needs.fatigue+dt/1100);p.needs.social=clamp(p.needs.social+dt/1000);}if(time-lastSave>=30)save();},
  choose(id,candidates,hour=10){const p=people[id];if(!p)return null;
   const entries=actions(p,candidates,hour);
   if(p.current){
    const entry=entries.find(e=>e.choice.id===p.current.id);
    // Version-one saves did not record a target; only an unambiguous one can resume.
    if(p.current.targetId===undefined&&entry?.targets?.length===1)p.current.targetId=entry.targets[0].choice.id;
    const target=entry?.targets?.find(t=>t.choice.id===p.current.targetId)?.choice;
    if(entry&&(!entry.targets||target))return {...materialize(entry.choice,target,p.current),resumed:true};
    p.current=null; // An unavailable commitment ends; sample the already filtered set once.
   }
   if(time<p.nextDecisionAt)return null;
   if(!entries.length){p.nextDecisionAt=time+6;save();return null;}
   // One actor, then P(action | actor,state), then P(target | action,actor,state).
   // Fixed draw count keeps later decisions independent of the number of targets.
   const entry=pick(entries,random(p)),targetRoll=random(p),target=entry.targets?pick(entry.targets,targetRoll).choice:null;
   const c=materialize(entry.choice,target,{}),range=c.duration||[8,14],duration=range[0]+random(p)*(range[1]-range[0]);
   p.current={id:c.id,...(target?{targetId:target.id}:{}),duration,startedAt:time};p.choices++;save();return {...c,...p.current};
  },
  complete(id,c,{fulfilled=true,observers=[]}={}){const p=people[id];if(!p?.current||p.current.id!==c.id||p.current.targetId!==(c.targetId??c.relationship?.target))return;
   if(fulfilled){observe(id,c,{observers});for(const[k,delta]of Object.entries(c.relief||{}))p.needs[k]=clamp(p.needs[k]+delta);if(c.relationship){const r=c.relationship;p.relations[r.target]=clamp((p.relations[r.target]||0)+(r.gain??.08));}}
   p.last=c.id;p.cooldowns[c.id]=time+(c.cooldown??45);p.current=null;p.nextDecisionAt=time;save();
  },
  observe,
  distribution(id,candidates,hour=10){const p=people[id];if(!p)return [];const entries=actions(p,candidates,hour),total=entries.reduce((sum,e)=>sum+e.weight,0);return entries.map(e=>{const targetTotal=e.targets?.reduce((sum,t)=>sum+t.weight,0);return {id:e.choice.id,probability:e.weight/total,targets:e.targets?.map(t=>({id:t.choice.id,probability:t.weight/targetTotal}))||[]};});},
  state(id){return id?copy(people[id]):snapshot();},snapshot,dispose:save
 };
}
