import {ROYAL_MEAL_SEATS} from './china-royal-kitchen-orders.js';
import {currentInteractionIntent,nearbyInteraction} from './player-interaction-intents.js';

const open=o=>o&&!['consumed','cancelled'].includes(o.stage);
const LABELS={ordered:'Jia正在按原单备料',prepared:'原份食材已备好',cooked:'原膳蒸好，等候取餐',carrying:'Jia正在送来同一份御膳',served:'御膳已送到原席',eating:'正在用膳',consumed:'这一份御膳已用完',cancelled:'本单已取消'};
const name=s=>s?.id===ROYAL_MEAL_SEATS[0]?'西侧原餐席':'东侧原餐席';

// This facade owns no pantry, NPC, meal, currency or route. A menu selection
// enters the shared intent/mount flow; only the kitchen commits the real order.
export function createChinaRoyalPlayerMeal({kitchen,furniture,getPlayer,getMounted=()=>null,onMountSeat=()=>false,canChooseSeat=()=>false,canSee=()=>true,notify=()=>{}}){
 const provider='china-royal-player-meal',seats=ROYAL_MEAL_SEATS.map(id=>furniture?.items.find(s=>s.id===id)).filter(Boolean);
 let disposed=false,lastError=null;
 const order=()=>kitchen.mealFor('player'),activeOrder=()=>{const o=order();return open(o)?o:null;};
 const seated=()=>seats.find(s=>s.id===getMounted()?.id)||null;
 const seatFree=s=>!!s&&(seated()?.id===s.id||canChooseSeat(s))&&kitchen.playerMealAvailability(s.id).ok;
 const currentPosition=()=>{const p=getPlayer()?.root.position;return p?[p.x,p.y,p.z]:null;};
 function availability(seatId=null){
  const v=kitchen.playerMealAvailability(seatId);if(!v.ok)return v;
  if(seats.length!==ROYAL_MEAL_SEATS.length)return {ok:false,code:'missing-original-seat',reason:'原御膳餐席暂不可用'};
  const candidates=seatId?seats.filter(s=>s.id===seatId):seats;
  if(!candidates.some(seatFree))return {ok:false,code:'seat-busy',reason:'原御膳餐席有人或通路受阻，请稍候'};
  return v;
 }
 function intent(kind=null,seatId=null){
  if(disposed)return null;const o=activeOrder(),s=seats.find(s=>s.id===(seatId||o?.seatId||seated()?.id))||seats.find(seatFree);
  kind||=o?.stage==='served'?'eat':o?'view':'request';
  if(!s)return null;
  if(kind==='request'&&(o||!availability(s.id).ok))return null;
  if(kind==='eat'&&(!o||o.stage!=='served'||seated()?.id!==o.seatId||!availability(o.seatId).ok))return null;
  if(['cancel','view'].includes(kind)&&!o)return null;
  if(!['request','eat','cancel','view'].includes(kind))return null;
  const mounted=seated()?.id===s.id,position=kind==='cancel'||kind==='view'?currentPosition():mounted?s.anchor:s.position;
  if(!position)return null;
  const eligibility=kitchen.playerMealAvailability(s.id).eligibility;
  return {id:'cn-royal-player-meal-'+kind,provider,kind,seatId:s.id,name:'御膳餐厅',targetKey:'cn-royal-player-meal',targetName:'御膳餐厅',
   action:kind==='request'?`在${name(s)}请一份御膳`:kind==='eat'?'享用送来的御膳':kind==='cancel'?'取消这份御膳':LABELS[o.stage],
   position:position.slice(),executionRadius:kind==='request'&&!mounted? .016 : .35,interactionRadius:2.1,keepSeat:mounted,priority:48,
   intentKey:[kind,o?.id||'-',o?.stage||'-',s.id,mounted,eligibility?.appointmentId||'-'].join('|')};
 }
 const resolveIntent=old=>currentInteractionIntent(old,intent(old?.kind,old?.seatId));
 function executeIntent(old){
  const next=resolveIntent(old);if(!next||!nearbyInteraction(next,getPlayer()?.root.position,{radius:next.executionRadius,clear:canSee}))return false;
  lastError=null;
  if(next.kind==='request'){
   const s=seats.find(s=>s.id===next.seatId);if(!availability(s.id).ok)return false;
   if(seated()?.id!==s.id)onMountSeat(s);
   if(seated()?.id!==s.id)return false;
   if(!kitchen.requestMeal({actorId:'player',seatId:s.id})){lastError='餐单未能保存，请原处重试';notify(lastError);return false;}
   return true;
  }
  const o=activeOrder();if(!o)return false;
  if(next.kind==='eat')return kitchen.startMeal(o.id,'player');
  if(next.kind==='cancel')return cancel();
  notify(LABELS[o.stage]);return true;
 }
 function cancel(reason='本人取消御膳'){
  const ok=kitchen.cancelMeal('player',reason),error=ok?null:'餐单未能保存，请稍后重试';if(error&&error!==lastError)notify(error);lastError=error;return ok;
 }
 function update(){
  if(disposed)return;const o=activeOrder();if(!o)return;
  if(!kitchen.playerMealAvailability(o.seatId).ok||seated()?.id!==o.seatId){cancel('离开原餐席或御膳资格改变');return;}
  if(o.stage==='eating'&&kitchen.mealProgress(o.id)>=12){if(kitchen.completeMeal(o.id,'player'))lastError=null;else lastError='用膳回执待保存';}
 }
 function view(){
  const o=activeOrder(),mounted=seated(),a=availability(o?.seatId||null),supply=kitchen.supplyState();
  return {order:o,label:o?(!a.ok?a.reason:LABELS[o.stage]):a.ok?'请一份御膳，送到原餐席':a.reason,eligible:a.ok,reason:a.reason||null,error:lastError,seated:mounted?.id||null,
   supply:{remaining:supply.remaining,wasted:supply.wasted},progress:o?.stage==='eating'?Math.min(1,kitchen.mealProgress(o.id)/12):0,
   seats:seats.map(s=>({id:s.id,name:name(s),available:seatFree(s),mounted:mounted?.id===s.id}))};
 }
 // Data for the existing compact B+A menu. No permanent ticket or extra HUD.
 function menuDefinition(){
  const v=view(),o=v.order;
  return {id:provider,title:'御膳餐厅',subtitle:'清蒸时蔬饭 · 一份正餐',status:v.error||v.label,
   detail:o?`第${o.number}号 · ${name(seats.find(s=>s.id===o.seatId))}`:`原储备余 ${v.supply.remaining} 份`,
   note:o?'起身取消未吃完的原膳':'完成册封宣读的成年人可请膳',
   items:o?[]:v.seats.map(s=>({...s,intent:intent('request',s.id),disabled:!s.available})),
   primary:o?.stage==='served'?intent('eat'):null,secondary:o?intent('cancel'):null,progress:v.progress};
 }
 return {seats,availability,intent,resolveIntent,executeIntent,view,menuDefinition,update,cancel,
  active:()=>!!activeOrder(),leaveSeat:id=>activeOrder()?.seatId===id?cancel('本人起身，注销未用完的御膳'):true,
  playerPose:()=>activeOrder()?.stage==='eating'&&seated()?.id===activeOrder().seatId?{action:'eat',heldProp:null}:null,
  statusLabel:id=>activeOrder()?.seatId===id?LABELS[activeOrder().stage]:null,
  snapshot:()=>({version:1,orderId:activeOrder()?.id||null}),
  restore(s){if(s?.version!==1||s.orderId!==(activeOrder()?.id||null))return false;if(activeOrder()&&!kitchen.playerMealAvailability(activeOrder().seatId).ok)return cancel('恢复时御膳资格不可用');return true;},
  state:()=>({...view(),receipt:kitchen.mealReceipts().filter(r=>r.actorId==='player').at(-1)||null}),
  dispose({suspend=false}={}){if(disposed)return;if(!suspend&&!cancel('离开御膳服务'))return false;disposed=true;return true;}};
}
