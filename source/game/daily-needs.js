import {GAME_MINUTES_PER_SECOND} from './simulation-clock.js';

// One physiological clock for enrolled identities. Country controllers still
// own actions and supplies; an intention, animation or scene entry grants nothing.
export const DAILY_NEEDS_HOUR=60/GAME_MINUTES_PER_SECOND;
export const DAILY_NEEDS_ACTORS=Object.freeze(['player','cn-tavern-diner-west','cn-tavern-diner-east']);
const copy=x=>JSON.parse(JSON.stringify(x));
const positive=(x,fallback=0)=>Number.isFinite(x)&&x>=0?x:fallback;
const clamp=x=>Math.max(0,Math.min(1,x));
const mealSource='china-tavern-meal',toiletSource='china-toilet';
export function createDailyNeeds({saved={},getClock=()=>({seconds:0}),saveState=()=>true,legacyPeople={}}={}){
 const people={};let sceneId=null,activeIds=new Set(),lastClock=positive(getClock()?.seconds),lastSample=lastClock;
 for(const id of DAILY_NEEDS_ACTORS){
  const old=saved.version===1?saved.people?.[id]:null,legacy=legacyPeople[id]?.needs?.hunger;
  people[id]={foodAge:positive(old?.foodAge,Number.isFinite(legacy)?clamp(legacy)*12*DAILY_NEEDS_HOUR:(id==='player'?2:7)*DAILY_NEEDS_HOUR),toiletAge:positive(old?.toiletAge),receipts:{}};
  for(const[source,number]of Object.entries(old?.receipts||{}))if([mealSource,toiletSource].includes(source)&&Number.isSafeInteger(number)&&number>0)people[id].receipts[source]=number;
 }
 function sync(){const now=positive(getClock()?.seconds,lastClock),dt=Math.max(0,now-lastClock);lastClock=now;lastSample=now;
  if(!sceneId||!dt)return;for(const id of activeIds){const p=people[id];if(p){p.foodAge+=dt;p.toiletAge+=dt;}}
 }
 const snapshot=()=>{sync();return {version:1,people:copy(people)};};
 function read(id){const p=people[id];if(!p)return null;return {hunger:clamp(p.foodAge/(12*DAILY_NEEDS_HOUR)),toilet:clamp(p.toiletAge/(24*DAILY_NEEDS_HOUR)),foodStrain:clamp((p.foodAge/DAILY_NEEDS_HOUR-24)/24),toiletStrain:clamp((p.toiletAge/DAILY_NEEDS_HOUR-36)/24)};}
 function status(id){const p=people[id],need=read(id);if(!p)return null;
  const food=p.foodAge>=24*DAILY_NEEDS_HOUR?'久未进食':need.hunger>=.85?'很饿了':need.hunger>=.5?'有些饿了':null;
  const toilet=p.toiletAge>=36*DAILY_NEEDS_HOUR?'如厕拖延较久':need.toilet>=1?'该如厕了':null;
  return {food,toilet,seekMeal:!!food,seekToilet:!!toilet,text:[food&&'🍚 '+food,toilet&&'🚻 '+toilet].filter(Boolean).join(' · ')};
 }
 function apply(receipt,kind){
  sync();const p=people[receipt?.actorId],source=kind==='meal'?mealSource:toiletSource,n=receipt?.number;
  if(!p||receipt.source!==source||!Number.isSafeInteger(n)||n<=0||n<=(p.receipts[source]||0)||receipt.completed!==true)return false;
  if(kind==='meal'&&(receipt.orderId!==`cn-tavern-order-${n}`||receipt.id!==receipt.orderId+'-consumed'||receipt.mealId!==receipt.orderId+'-dish'||!['yunlai-mushroom-rice','yunlai-green-noodles'].includes(receipt.dishId)||receipt.paymentReceipt!==receipt.orderId))return false;
  if(kind==='toilet'&&(receipt.id!==`china-toilet-${n}`||receipt.facilityId!=='cn-bath-toilet'))return false;
  const next={version:1,people:copy(people)},row=next.people[receipt.actorId];row[kind==='meal'?'foodAge':'toiletAge']=0;row.receipts[source]=n;
  try{const result=saveState(next);if(result===false||result?.then)return false;}catch{return false;}
  Object.assign(p,row);return true;
 }
 return {
  enter(id,loadedIds=[]){sync();sceneId=id;activeIds=new Set(['player',...loadedIds.filter(id=>people[id])]);lastClock=positive(getClock()?.seconds,lastClock);},
  leave(){sync();sceneId=null;activeIds.clear();},
  update(){if(positive(getClock()?.seconds,lastClock)-lastSample>=1)sync();},
  has:id=>!!people[id],read,hunger:id=>read(id)?.hunger??null,status,
  mealReceipts(receipts=[]){let applied=false;for(const receipt of receipts)applied=apply(receipt,'meal')||applied;return applied;},
  toiletReceipt:receipt=>apply(receipt,'toilet'),
  snapshot,state:()=>({sceneId,player:status('player'),enrolledActors:DAILY_NEEDS_ACTORS.slice(),automaticActors:DAILY_NEEDS_ACTORS.slice(1)})
 };
}
