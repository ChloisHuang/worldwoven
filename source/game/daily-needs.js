import {sameRoyalPlayerEligibility,validRoyalKitchenState} from './china-royal-kitchen-orders.js';
import {EGYPT_MEAL,validEgyptMealReceipt} from './egypt-meal-definition.js';
import {validEgyptResidentSupply,validEgyptResidentMealReceipt,sameEgyptResidentMealReceipt} from './egypt-resident-supply.js';
import {CHINA_OFFICIAL_IDS} from './china-official-economy.js';
import {GAME_MINUTES_PER_SECOND} from './simulation-clock.js';
import {JAPAN_STAFF_CREW} from './japan-service-orders.js';
import {CHINA_CONSORTS} from './china-palace-residents.js';

// One physiological clock for enrolled identities. Country controllers still
// own actions and supplies; an intention, animation or scene entry grants nothing.
export const DAILY_NEEDS_HOUR=60/GAME_MINUTES_PER_SECOND;
const FOOD_DAY=24*DAILY_NEEDS_HOUR;
// The original royal adults and Samira join the verified food loop only.
// Officials now share the existing public-toilet controller and actual receipts.
const royalActors=new Set(['cn-emperor',...CHINA_CONSORTS.map(p=>p.id)]);
const mealOnlyActors=new Set([...royalActors,'egypt-papyrus']);
export const DAILY_NEEDS_ACTORS=Object.freeze(['player','cn-tavern-diner-west','cn-tavern-diner-east',...CHINA_OFFICIAL_IDS,...JAPAN_STAFF_CREW,...royalActors,'egypt-papyrus']);
const copy=x=>JSON.parse(JSON.stringify(x));
const positive=(x,fallback=0)=>Number.isFinite(x)&&x>=0?x:fallback;
const clamp=x=>Math.max(0,Math.min(1,x));
const mealSource='china-tavern-meal';
const mealSources=new Set([mealSource,'japan-player-meal','france-tea-food','france-full-meal','egypt-visitor-meal','egypt-resident-meal','japan-staff-meal','china-royal-kitchen']);
const toiletFacilities={'china-public-toilet':'cn-tavern-public-toilet','china-toilet':'cn-bath-toilet','japan-toilet':'jp-washroom-private-1','france-toilet':'fr-royal-bath-toilet','egypt-toilet':'eg-private-bath-toilet'};
function validMeal(receipt,getRoyalMealEligibility,verifiedRoyalConsumption=false,verifiedEgyptResidentConsumption=false){
 const r=receipt,n=r.number;
 if(r.actorId==='egypt-papyrus'&&r.source!=='egypt-resident-meal')return false;
 if(r.source==='egypt-resident-meal')return verifiedEgyptResidentConsumption&&validEgyptResidentMealReceipt(r);
 if(r.source==='egypt-visitor-meal')return r.paid===true&&validEgyptMealReceipt(r);
 if(r.source===mealSource)return r.orderId===`cn-tavern-order-${n}`&&r.id===r.orderId+'-consumed'&&r.mealId===r.orderId+'-dish'&&['yunlai-mushroom-rice','yunlai-green-noodles'].includes(r.dishId)&&r.paymentReceipt===r.orderId;
 if(r.source==='japan-staff-meal')return JAPAN_STAFF_CREW.includes(r.actorId)&&r.orderId===`jp-staff-meal-${n}`&&r.id===r.orderId+'-consumed'&&r.mealId===r.orderId+':bowl'&&r.dishId==='staff-ramen'&&r.supplyReceipt===r.orderId+':prepared';
 if(r.source==='china-royal-kitchen'){
  const eligibility=r.actorId==='player'&&!verifiedRoyalConsumption?getRoyalMealEligibility():null;
  return (royalActors.has(r.actorId)||r.actorId==='player'&&(verifiedRoyalConsumption||sameRoyalPlayerEligibility(r.eligibility,eligibility))&&Number.isFinite(r.eatingSeconds)&&r.eatingSeconds>=12)&&r.orderId===`cn-royal-meal-${n}`&&r.id===r.orderId+'-consumed'&&r.mealId===r.orderId+'-meal'&&r.dishId==='royal-steamed-meal'&&r.supplyReceipt===r.orderId+'-prepared';
 }
 if(r.actorId!=='player')return false;
 if(r.source==='france-full-meal')return r.orderId===`france-tea-${n}`&&r.id===r.orderId+'-consumed'&&r.mealId===r.orderId+'-tray'&&r.dishId==='country-soup-bread'&&r.supplyReceipt===r.orderId+'-prepared'&&r.paymentReceipt===r.orderId+'-meal'&&r.paid===true;
 if(r.source==='japan-player-meal'){
  const match=/^jp-player-(dining|service)-(\d+)-(\d+)$/.exec(r.orderId||'');
  return !!match&&Number(match[3])===n&&r.id===r.orderId+'-consumed'&&r.mealId===r.orderId+':meal'&&['ramen','sushi'].includes(r.dishId)&&(match[1]==='dining'?r.supplyKind==='paid-dining'&&r.paid===true&&new RegExp(`^jp-dining-${match[2]}-\\d+$`).test(r.paymentReceipt):r.supplyKind==='bath-meal'&&r.paymentReceipt===r.orderId+':token');
 }
 return r.source==='france-tea-food'&&r.orderId===`france-tea-${n}`&&r.id===r.orderId+'-consumed'&&r.mealId===r.orderId+'-tray'&&r.dishId==='tea-cake'&&r.supplyReceipt===r.orderId;
}
export function createDailyNeeds({saved={},getClock=()=>({seconds:0}),saveState=()=>true,legacyPeople={},getRoyalMealEligibility=()=>null}={}){
 const people={};let sceneId=null,activeIds=new Set(),lastClock=positive(getClock()?.seconds),lastSample=lastClock;
 for(const id of DAILY_NEEDS_ACTORS){
  const old=[1,2].includes(saved.version)?saved.people?.[id]:null,legacy=legacyPeople[id]?.needs?.hunger;
  // v1 used a twelve-hour hunger scale. Keep its recorded age and receipts;
  // a one-time balance offset preserves hunger/strain until real food relieves it.
  const foodAge=positive(old?.foodAge,Number.isFinite(legacy)?clamp(legacy)*12*DAILY_NEEDS_HOUR:(id==='player'?2:7)*DAILY_NEEDS_HOUR);
  const foodBalanceOffset=old?saved.version===1?foodAge:positive(old.foodBalanceOffset):Number.isFinite(legacy)?foodAge:0;
  people[id]={foodAge,foodBalanceOffset,toiletAge:positive(old?.toiletAge),receipts:{}};
  for(const[source,number]of Object.entries(old?.receipts||{}))if((mealSources.has(source)||toiletFacilities[source])&&Number.isSafeInteger(number)&&number>0)people[id].receipts[source]=number;
 }
 function sync(){const now=positive(getClock()?.seconds,lastClock),dt=Math.max(0,now-lastClock);lastClock=now;lastSample=now;
  if(!sceneId||!dt)return;for(const id of activeIds){const p=people[id];if(p){p.foodAge+=dt;if(!mealOnlyActors.has(id))p.toiletAge+=dt;}}
 }
 const snapshot=()=>{sync();return {version:2,people:copy(people)};};
 const foodBalanceAge=p=>p.foodAge+p.foodBalanceOffset;
 function read(id){const p=people[id];if(!p)return null;return {hunger:clamp(foodBalanceAge(p)/FOOD_DAY),toilet:mealOnlyActors.has(id)?0:clamp(p.toiletAge/(24*DAILY_NEEDS_HOUR)),foodStrain:clamp((foodBalanceAge(p)-2*FOOD_DAY)/(2*FOOD_DAY)),toiletStrain:mealOnlyActors.has(id)?0:clamp((p.toiletAge/DAILY_NEEDS_HOUR-36)/24)};}
 function status(id){const p=people[id],need=read(id);if(!p)return null;
  const food=foodBalanceAge(p)>=2*FOOD_DAY?'久未进食':need.hunger>=1?'很饿了':need.hunger>=.75?'有些饿了':null;
  const toilet=!mealOnlyActors.has(id)&&p.toiletAge>=36*DAILY_NEEDS_HOUR?'如厕拖延较久':need.toilet>=1?'该如厕了':null;
  return {food,toilet,seekMeal:need.hunger>=1,seekToilet:!!toilet,text:[food&&'🍚 '+food,toilet&&'🚻 '+toilet].filter(Boolean).join(' · ')};
 }
 function apply(receipt,kind,verifiedRoyalConsumption=false,verifiedEgyptResidentConsumption=false){
  sync();const p=people[receipt?.actorId],source=receipt?.source,n=receipt?.number;
  if(!p||receipt.source!==source||kind==='meal'&&!mealSources.has(source)||!Number.isSafeInteger(n)||n<=0||n<=(p.receipts[source]||0)||receipt.completed!==true)return false;
  if(kind==='meal'){try{if(!validMeal(receipt,getRoyalMealEligibility,verifiedRoyalConsumption,verifiedEgyptResidentConsumption))return false;}catch{return false;}}
  if(kind==='toilet'&&(!toiletFacilities[source]||receipt.id!==`${source}-${n}`||receipt.facilityId!==toiletFacilities[source]))return false;
  const next={version:2,people:copy(people)},row=next.people[receipt.actorId];
  if(kind==='toilet')row.toiletAge=0;
  else if(source==='france-tea-food'){
   const relief=3*DAILY_NEEDS_HOUR;
   row.foodBalanceOffset=Math.max(0,row.foodBalanceOffset-Math.max(0,relief-row.foodAge));row.foodAge=Math.max(0,row.foodAge-relief);
  }else {row.foodAge=0;row.foodBalanceOffset=0;}
  row.receipts[source]=n;
  try{const result=saveState(next);if(result===false||result?.then)return false;}catch{return false;}
  Object.assign(p,row);return true;
 }
 return {
  enter(id,loadedIds=[]){sync();sceneId=id;activeIds=new Set(['player',...loadedIds.filter(id=>people[id])]);lastClock=positive(getClock()?.seconds,lastClock);},
  leave(){sync();sceneId=null;activeIds.clear();},
  update(){if(positive(getClock()?.seconds,lastClock)-lastSample>=1)sync();},
  has:id=>!!people[id],read,hunger:id=>read(id)?.hunger??null,status,
  mealReceipts(receipts=[]){let applied=false;for(const receipt of receipts)applied=apply(receipt,'meal')||applied;return applied;},
  // A durable consumed source order is an event that already happened. A
  // later resignation cannot revoke it when a failed needs write is retried.
  // This path cannot authorize new food: it requires the complete original
  // inventory graph and the exact same consumed order, dish and charter proof.
  royalMealReceipts(receipts=[],kitchenState=null){
   try{if(!validRoyalKitchenState(kitchenState))return false;}catch{return false;}
   const consumed=new Map(kitchenState.orders.filter(o=>o.stage==='consumed').map(o=>[o.id,o.receipt]));let applied=false;
   const fields=['source','id','number','actorId','orderId','mealId','dishId','supplyReceipt','completed','eatingSeconds'];
   for(const receipt of receipts){const original=consumed.get(receipt?.orderId);
    if(!original||!fields.every(key=>receipt[key]===original[key])||receipt.actorId==='player'&&!sameRoyalPlayerEligibility(receipt.eligibility,original.eligibility))continue;
    applied=apply(receipt,'meal',true)||applied;
   }
   return applied;
  },
  // Only an exact consumed receipt in the conserved opening reserve can feed
  // Samira. The durable source event can retry a failed needs write on reload.
  egyptResidentMealReceipts(receipts=[],supply=null){
   try{if(!validEgyptResidentSupply(supply)||!Array.isArray(receipts))return false;}catch{return false;}
   const consumed=new Map(supply.consumed.map(r=>[r.orderId,r]));let applied=false;
   for(const receipt of receipts){
    if(!sameEgyptResidentMealReceipt(receipt,consumed.get(receipt?.orderId)))continue;
    applied=apply(receipt,'meal',false,true)||applied;
   }
   return applied;
  },
  franceMealReceipts(receipts=[],reservations=[]){let applied=false;for(const receipt of receipts)applied=apply({...receipt,...(receipt.source==='france-full-meal'?{paid:reservations.some(h=>h.id===receipt.paymentReceipt&&h.status==='settled'&&h.currency==='france'&&h.amount===4)}:{})},'meal')||applied;return applied;},
  japanMealReceipts(receipts=[],reservations=[]){let applied=false;for(const receipt of receipts)applied=apply({...receipt,paid:receipt.supplyKind==='paid-dining'&&reservations.some(h=>h.id===receipt.paymentReceipt&&h.status==='settled')},'meal')||applied;return applied;},
  egyptMealReceipts(receipts=[],reservations=[]){let applied=false;for(const r of receipts)applied=apply({...r,paid:reservations.some(h=>h.id===r.paymentReceipt&&h.status==='settled'&&h.currency===EGYPT_MEAL.currency&&h.amount===EGYPT_MEAL.price)},'meal')||applied;return applied;},
  toiletReceipt:receipt=>apply(receipt,'toilet'),
  snapshot,state:()=>({sceneId,player:status('player'),enrolledActors:DAILY_NEEDS_ACTORS.slice(),automaticActors:DAILY_NEEDS_ACTORS.slice(1)})
 };
}
