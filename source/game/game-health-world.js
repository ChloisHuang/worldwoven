import {createGameHealth} from './game-health.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const idOf=actor=>actor.actorId||actor.station?.id;
const visitorId=id=>/^jp-visitor-\d+-\d+$/.test(id);
const MAX_VISITORS=8;
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}

// Saved health follows real actor IDs across scene/wardrobe rebuilds. This
// adapter never creates actors, controls a role, changes looks or slows movement.
// Only loaded scenes advance simulation time; hidden/offline time is paused.
export function createGameHealthWorld({worldSeed=1,saved={},visitorFloor=0,clinicFloor=0,saveState=()=>{}}={}){
 let sceneId=null,time=Number.isFinite(saved.health?.time)?saved.health.time:0,lastSave=time,playerFatigue=clamp(saved.playerFatigue??.1);
 let arrivals=Math.max(saved.version===1?saved.arrivals||0:0,visitorFloor);
 let deliveredThrough=Math.max(saved.version===1?saved.deliveredThrough||0:0,clinicFloor);
 const journeys=new Map(Object.entries(saved.version===1?saved.journeys||{}:{}));
 const ids=new Set(['player',...Object.keys(saved.health?.people||{})]),activeVisitors=new Set();
 let health=createGameHealth({worldSeed,actorIds:[...ids],saved:saved.health});
 const snapshot=()=>({version:1,playerFatigue,arrivals,deliveredThrough,journeys:copy(Object.fromEntries(journeys)),health:health.snapshot()});
 const persist=()=>{lastSave=time;saveState(snapshot());};
 function rebuild(){health=createGameHealth({worldSeed,actorIds:[...ids],saved:health.snapshot()});}
 function register(id){if(!id||ids.has(id))return;ids.add(id);rebuild();}
 function prune(){
  const visitors=[...ids].filter(visitorId).sort((a,b)=>(journeys.get(b)?.number||0)-(journeys.get(a)?.number||0));
  const keep=new Set(activeVisitors);for(const id of visitors)if(keep.size<MAX_VISITORS)keep.add(id);let changed=false;
  for(const id of visitors)if(!keep.has(id)){ids.delete(id);journeys.delete(id);changed=true;}
  if(changed)rebuild();
 }
 // A rare journey stops at the invented mistbell shelter. Its one bounded
 // arrival exposure is applied only to that visitor, using their constitution.
 // The visit number watermark prevents repeats even after old visits are pruned.
 function arrive(visit){
  if(!visitorId(visit?.id)||!Number.isSafeInteger(visit.number)||visit.number<1)return false;
  register(visit.id);activeVisitors.add(visit.id);
  if(!journeys.has(visit.id)){
   const fresh=visit.number>arrivals&&visit.stage==='arriving';
   const shelter=fresh&&hash(`mistbell-journey-v1|${worldSeed>>>0}|${visit.id}`)%16===0;
   journeys.set(visit.id,{number:visit.number,source:shelter?'mistbell-shelter':null});
   if(shelter)health.expose(visit.id,{dose:1.6});
  }
  arrivals=Math.max(arrivals,visit.number);prune();persist();return true;
 }
 function text(id){
  const status=health.status(id);if(!status)return '';
  if(status.symptoms.length)return [...new Set(status.symptoms)].join('；')+(status.careStatus==='support-active'?' · 已有照护，安心歇息':'');
  return status.careStatus==='support-active'?'已收到云纹包，坐下歇一会儿':'';
 }
 function clinicReceipts(state){
  let applied=false;
  for(const receipt of state?.history||[]){
   const n=receipt.number;
   if(receipt.event!=='delivered'||!Number.isSafeInteger(n)||n<=deliveredThrough||receipt.orderId!==`cn-clinic-order-${n}`||receipt.cardId!==`cn-clinic-card-${n}`||receipt.packetId!==`cn-clinic-packet-${n}`)continue;
   // Only an actual physical delivered event contains the player's handoff spot.
   if(!Array.isArray(receipt.playerPosition)||receipt.playerPosition.length!==3||!receipt.playerPosition.every(Number.isFinite))continue;
   deliveredThrough=n;applied=health.applyCare('player',{providerId:'china-clinic',receiptNumber:n})||applied;
  }
  if(applied)persist();return applied;
 }
 prune();
 return {
  enter(id,actors=[]){sceneId=id;activeVisitors.clear();for(const actor of actors)register(idOf(actor));persist();},
  leave(){sceneId=null;activeVisitors.clear();persist();},
  arrive,
  depart(id){activeVisitors.delete(id);prune();persist();},
  clinicReceipts,
  update(dt,{player,actors=[],playerResting=false,playerExertion=0,lifePeople={},restingIds=[],visible=()=>false}={}){
   if(!sceneId||!player||!Number.isFinite(dt)||dt<=0)return;
   const exertion=clamp(playerExertion);
   playerFatigue=clamp(playerFatigue+dt*(playerResting?-.01:exertion>0?exertion/600:-1/300));
   const resting=new Set(restingIds),inputs=[{id:'player',sceneId,position:player.root.position,exertion,resting:playerResting,needs:{fatigue:playerFatigue}}];
   for(const actor of actors){
    const id=idOf(actor);if(!ids.has(id))register(id);
    const mount=actor.serviceMount,pose=actor.poseContext,rest=!actor.walking&&(resting.has(id)||!!mount||Number.isFinite(pose?.seatHeight)||!!pose?.lieSupport);
    inputs.push({id,sceneId,position:actor.root.position,needs:lifePeople[id]?.needs,resting:rest,exertion:actor.walking?.65:0});
   }
   const contacts=[];
   for(let i=0;i<inputs.length;i++)for(let j=i+1;j<inputs.length;j++){
    const a=inputs[i],b=inputs[j],p=a.position,q=b.position;
    if(Math.abs(p.y-q.y)<.65&&Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<2&&visible(p,q))contacts.push({a:a.id,b:b.id});
   }
   health.tick(dt,{actors:inputs,contacts});time+=dt;
   if(time-lastSave>=5)persist();
  },
  text,status:id=>health.status(id),snapshot,flush:persist,
  state:()=>({sceneId,player:health.status('player'),playerText:text('player'),actorCount:ids.size,visitorCount:[...ids].filter(visitorId).length,journeys:copy(Object.fromEntries(journeys))})
 };
}
