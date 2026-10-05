import {createGameHealth} from './game-health.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const idOf=actor=>actor.actorId||actor.station?.id;
const visitorId=id=>/^jp-visitor-\d+-\d+$/.test(id);
const MAX_VISITORS=8;

// Saved health follows real actor IDs across scene/wardrobe rebuilds. This
// adapter never creates actors, controls a role, changes looks or slows movement.
// Only loaded scenes advance simulation time; hidden/offline time is paused.
export function createGameHealthWorld({worldSeed=1,saved={},visitorFloor=0,clinicFloor=0,retainedVisitorIds=[],saveState=()=>{}}={}){
 let interactionSerial=Number.isSafeInteger(saved.interactionSerial)?saved.interactionSerial:0;
 const pendingInteractions=new Map();
 let sceneId=null,time=Number.isFinite(saved.health?.time)?saved.health.time:0,lastSave=time,playerFatigue=clamp(saved.playerFatigue??.1);
 let arrivals=Math.max(saved.version===1?saved.arrivals||0:0,visitorFloor);
 let deliveredThrough=Math.max(saved.version===1?saved.deliveredThrough||0:0,clinicFloor);
 const journeys=new Map(Object.entries(saved.version===1?saved.journeys||{}:{}));
 const ids=new Set(['player',...Object.keys(saved.health?.people||{})]),activeVisitors=new Set(retainedVisitorIds.filter(visitorId));
 let health=createGameHealth({worldSeed,actorIds:[...ids],saved:saved.health});
 const snapshot=()=>({version:1,playerFatigue,arrivals,deliveredThrough,interactionSerial,journeys:copy(Object.fromEntries(journeys)),health:health.snapshot()});
 const persist=()=>{lastSave=time;saveState(snapshot());};
 function rebuild(){health=createGameHealth({worldSeed,actorIds:[...ids],saved:health.snapshot()});}
 function register(id){if(!id||ids.has(id))return;ids.add(id);rebuild();}
 function prune(){
  const visitors=[...ids].filter(visitorId).sort((a,b)=>(journeys.get(b)?.number||0)-(journeys.get(a)?.number||0));
  const keep=new Set(activeVisitors);for(const id of visitors)if(keep.size<MAX_VISITORS)keep.add(id);let changed=false;
  for(const id of visitors)if(!keep.has(id)){ids.delete(id);journeys.delete(id);changed=true;}
  if(changed)rebuild();
 }
 // Arrivals register identity only. Historical journey/disease data survives,
 // but an offscreen journey is not an interaction with named participants.
 function arrive(visit){
  if(!visitorId(visit?.id)||!Number.isSafeInteger(visit.number)||visit.number<1)return false;
  register(visit.id);activeVisitors.add(visit.id);
  if(!journeys.has(visit.id))journeys.set(visit.id,{number:visit.number,source:null});
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
   // Legacy player receipts and new named NPC receipts both require the actual handoff spot.
   const recipientId=receipt.recipientId||'player',position=receipt.recipientPosition||receipt.playerPosition;
   if(!ids.has(recipientId)||!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))continue;
   deliveredThrough=n;applied=health.applyCare(recipientId,{providerId:'china-clinic',receiptNumber:n})||applied;
  }
  if(applied)persist();return applied;
 }
 prune();
 return {
  enter(id,actors=[]){pendingInteractions.clear();sceneId=id;for(const actor of actors)register(idOf(actor));persist();},
  leave(){pendingInteractions.clear();sceneId=null;persist();},
  beginInteraction(source,participants){
   if(!sceneId||typeof source!=='string'||!source||!Array.isArray(participants)||participants.length!==2||participants.some(id=>!ids.has(id)))return null;
   const number=++interactionSerial,event={source,id:`${source}-${number}`,number,sceneId,participants:[...participants],duration:0};persist();return event;
  },
  interaction(event){
   if(!event||!sceneId||event.sceneId!==sceneId||!Array.isArray(event.participants)||event.participants.some(id=>!ids.has(id)))return false;
   const key=JSON.stringify([event.source,event.id]),previous=pendingInteractions.get(key);
   if(!previous||event.duration>previous.duration)pendingInteractions.set(key,{...event,participants:[...event.participants]});return true;
  },
  arrive,
  depart(id){if(sceneId!=='japan')return;activeVisitors.delete(id);prune();persist();},
  clinicReceipts,
  update(dt,{player,actors=[],playerResting=false,playerExertion=0,lifePeople={},restingIds=[],dailyNeeds=null}={}){
   if(!sceneId||!player||!Number.isFinite(dt)||dt<=0)return;
   const exertion=clamp(playerExertion);
   playerFatigue=clamp(playerFatigue+dt*(playerResting?-.01:exertion>0?exertion/600:-1/300));
   const playerNeeds=dailyNeeds?.read('player'),resting=new Set(restingIds),inputs=[{id:'player',sceneId,exertion,resting:playerResting,needs:{fatigue:playerFatigue,...(playerNeeds?{hunger:playerNeeds.hunger}:{})},dailyNeeds:playerNeeds}];
   for(const actor of actors){
    const id=idOf(actor);if(!ids.has(id))register(id);
    const mount=actor.serviceMount,pose=actor.poseContext,rest=!actor.walking&&(resting.has(id)||!!mount||Number.isFinite(pose?.seatHeight)||!!pose?.lieSupport);
    const shared=dailyNeeds?.read(id);inputs.push({id,sceneId,needs:{...lifePeople[id]?.needs,...(shared?{hunger:shared.hunger}:{})},dailyNeeds:shared,resting:rest,exertion:actor.walking?.65:0});
   }
   // Only explicit interaction callbacks reach health. No actor-pair search,
   // distance test or line-of-sight work belongs in this clock update.
   health.tick(dt,{actors:inputs,interactions:[...pendingInteractions.values()]});pendingInteractions.clear();time+=dt;
   if(time-lastSave>=5)persist();
  },
  text,status:id=>health.status(id),snapshot,flush:persist,
  state:()=>({sceneId,player:health.status('player'),playerText:text('player'),actorCount:ids.size,visitorCount:[...ids].filter(visitorId).length,journeys:copy(Object.fromEntries(journeys))})
 };
}
