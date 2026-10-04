// Personal life chooses at activity boundaries. Jobs can keep their own ordered
// workflow; this small saved model never chooses or changes somebody's job.
const clamp=x=>Math.max(0,Math.min(1,x));
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0||1;}
const copy=x=>JSON.parse(JSON.stringify(x));
export function createLifeDecisions({worldSeed=1,actorIds,saved={},onChange=()=>{}}){
 let time=Number.isFinite(saved.time)?saved.time:0,lastSave=time;
 const people={};
 for(const id of actorIds){
  const key=`life-v1|${worldSeed>>>0}|${id}`,old=saved.version===1?saved.people?.[id]:null;
  people[id]=old?copy(old):{random:hash(key),choices:0,last:null,current:null,cooldowns:{},needs:{hunger:.10+hash(key+'hunger')/4294967296*.28,fatigue:.12+hash(key+'fatigue')/4294967296*.32,social:.20+hash(key+'social')/4294967296*.45},traits:Object.fromEntries(['curiosity','outdoors','sociability','quiet','appetite'].map(k=>[k,.25+hash(key+k)/4294967296*.65]))};
  people[id].relations??={};
  // A saved commitment is retained as an intention; scene objects and occupied
  // seats are re-resolved by the caller instead of restoring stale mount data.
 }
 const snapshot=()=>({version:1,time,people:copy(people)}),save=()=>{lastSave=time;onChange(snapshot());};
 function random(p){let x=p.random>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;p.random=x>>>0||1;return p.random/4294967296;}
 function weight(p,c,hour){
  if(c.available===false||time<(p.cooldowns[c.id]||0))return 0;
  let value=c.base??.2;
  for(const [key,k]of Object.entries(c.traits||{}))value+=(p.traits[key]||0)*k;
  for(const [key,k]of Object.entries(c.needs||{}))value+=(p.needs[key]||0)*k;
  if(c.relationship)value+=(p.relations[c.relationship.target]||0)*(c.relationship.weight??.5);
  if(c.id==='rest')value+=hour>=20||hour<7?1.6:0;
  if(c.id==='meal')value+=(hour>=11&&hour<14||hour>=17&&hour<20)?.8:0;
  if(c.id==='garden'&&(hour>=20||hour<6))value*=.22;
  if(p.last===c.id)value*=.18;
  return Math.max(.005,value);
 }
 return {
  tick(dt){time+=dt;for(const p of Object.values(people)){p.needs.hunger=clamp(p.needs.hunger+dt/850);p.needs.fatigue=clamp(p.needs.fatigue+dt/1100);p.needs.social=clamp(p.needs.social+dt/1000);}if(time-lastSave>=30)save();},
  choose(id,candidates,hour=10){const p=people[id];if(!p)return null;
   if(p.current){const savedChoice=candidates.find(c=>c.id===p.current.id&&c.available!==false);if(savedChoice)return {...savedChoice,...p.current,resumed:true};p.current=null;}
   const scores=candidates.map(c=>weight(p,c,hour)),total=scores.reduce((a,b)=>a+b,0);if(total<=0)return null;
   let roll=random(p)*total,index=scores.findIndex(w=>(roll-=w)<0);if(index<0)index=scores.length-1;
   const c=candidates[index],range=c.duration||[8,14],duration=range[0]+random(p)*(range[1]-range[0]);
   p.current={id:c.id,duration,startedAt:time};p.choices++;save();return {...c,...p.current};
  },
  complete(id,c,{fulfilled=true}={}){const p=people[id];if(!p)return;if(fulfilled)for(const[k,delta]of Object.entries(c.relief||{}))p.needs[k]=clamp(p.needs[k]+delta);if(fulfilled&&c.relationship){const r=c.relationship;p.relations[r.target]=clamp((p.relations[r.target]||0)+(r.gain??.08));}p.last=c.id;p.cooldowns[c.id]=time+(c.cooldown??45);p.current=null;save();},
  state(id){return id?copy(people[id]):snapshot();},snapshot,dispose:save
 };
}
