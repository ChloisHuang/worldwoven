// Finite opening supplies, not a simulated tax/procurement system. A prepared
// portion belongs to one original numbered order until eaten or written off.
export const ROYAL_DINERS=Object.freeze(['cn-emperor','cn-consort-yue','cn-consort-heng','cn-consort-ling']);
export const ROYAL_MEAL_SEATS=Object.freeze(['china-palace-dining-seat-19.8','china-palace-dining-seat-22.2']);
export const ROYAL_OPENING_SUPPLY=120;
const copy=x=>JSON.parse(JSON.stringify(x)),int=x=>Number.isSafeInteger(x)&&x>=0;
const stages=['ordered','prepared','cooked','carrying','served','eating','consumed','cancelled'];
const active=o=>!['consumed','cancelled'].includes(o.stage);
// Only the appointment ledger can supply this evidence. Job titles and pending
// petitions are deliberately not accepted as dining authority.
export const validRoyalPlayerEligibility=e=>!!e&&e.eligible===true&&e.actorId==='player'&&e.titleId==='consort'&&/^consort-appointment:consort-petition:player:(0|[1-9][0-9]*)$/.test(e.appointmentId||'')&&typeof e.appointmentReceiptId==='string'&&e.appointmentReceiptId.trim().length>0&&e.appointmentReceiptId.length<=200;
export const royalPlayerEligibilityEvidence=e=>validRoyalPlayerEligibility(e)?{eligible:true,actorId:'player',titleId:'consort',appointmentId:e.appointmentId,appointmentReceiptId:e.appointmentReceiptId}:null;
export const sameRoyalPlayerEligibility=(a,b)=>validRoyalPlayerEligibility(a)&&validRoyalPlayerEligibility(b)&&a.appointmentId===b.appointmentId&&a.appointmentReceiptId===b.appointmentReceiptId;
export function validRoyalKitchenState(s){
 if(!s||s.version!==1||!int(s.revision)||!int(s.serial)||s.supply?.id!=='cn-royal-kitchen-opening-v1'||s.supply.quantity!==ROYAL_OPENING_SUPPLY||!int(s.supply.remaining)||!int(s.supply.wasted)||!Array.isArray(s.orders)||s.orders.length>s.serial)return false;
 const ids=new Set(),actors=new Set(),seats=new Set();let used=0,wasted=0;
 for(const o of s.orders){
  if(!int(o.number)||!o.number||o.number>s.serial||o.id!==`cn-royal-meal-${o.number}`||ids.has(o.id)||!(ROYAL_DINERS.includes(o.actorId)||o.actorId==='player'&&validRoyalPlayerEligibility(o.eligibility))||!ROYAL_MEAL_SEATS.includes(o.seatId)||!stages.includes(o.stage)||!int(o.day)||!int(o.workDay)||!['cn-cooking','player'].includes(o.workerId)||o.workReceiptId!==null&&!/^cn-royal-kitchen-labor-[1-9][0-9]*$/.test(o.workReceiptId)||!Number.isFinite(o.eatingSeconds)||o.eatingSeconds<0)return false;
  if(o.actorId==='player'&&o.workerId==='player')return false;
  if(o.workerId==='player'&&!o.workReceiptId||o.workerId==='cn-cooking'&&o.workReceiptId)return false;
  ids.add(o.id);if(active(o)){if(actors.has(o.actorId)||seats.has(o.seatId))return false;actors.add(o.actorId);seats.add(o.seatId);}
  if(o.supplyReceipt!==null){if(o.supplyReceipt!==o.id+'-prepared'||o.mealId!==o.id+'-meal')return false;used++;if(o.stage==='cancelled')wasted++;}
  else if(!['ordered','cancelled'].includes(o.stage)||o.mealId!==null)return false;
  if(o.stage==='consumed'&&(o.eatingSeconds<12||!o.receipt||o.receipt.id!==o.id+'-consumed'||o.receipt.number!==o.number||o.receipt.actorId!==o.actorId||o.receipt.mealId!==o.mealId||o.receipt.orderId!==o.id||o.receipt.supplyReceipt!==o.supplyReceipt||o.receipt.source!=='china-royal-kitchen'||o.receipt.dishId!=='royal-steamed-meal'||o.receipt.completed!==true))return false;
  if(o.stage==='consumed'&&o.actorId==='player'&&(!sameRoyalPlayerEligibility(o.receipt.eligibility,o.eligibility)||o.receipt.eatingSeconds!==o.eatingSeconds))return false;
  if(o.stage!=='consumed'&&o.receipt)return false;
 }
 return s.supply.remaining+used===ROYAL_OPENING_SUPPLY&&s.supply.wasted===wasted;
}
export function createRoyalKitchenOrders({saved=null,getClock=()=>({day:0}),saveState=()=>true,getPlayerMealEligibility=()=>null}={}){
 let state={version:1,revision:0,serial:0,supply:{id:'cn-royal-kitchen-opening-v1',quantity:ROYAL_OPENING_SUPPLY,remaining:ROYAL_OPENING_SUPPLY,wasted:0},orders:[]},loadError=null;
 if(saved!=null){if(validRoyalKitchenState(saved))state=copy(saved);else loadError='invalid-royal-kitchen-state';}
 const snapshot=()=>copy(state),lookup=id=>state.orders.find(o=>o.id===id),forActor=id=>state.orders.find(o=>o.actorId===id&&active(o))||state.orders.filter(o=>o.actorId===id).at(-1)||null;
 function transaction(fn){if(loadError)return false;const next=copy(state),result=fn(next);if(result===false)return false;next.revision++;if(!validRoyalKitchenState(next))return false;try{const ok=saveState(copy(next));if(ok===false||ok?.then)return false;}catch{return false;}state=next;return true;}
 const eligibility=()=>{try{return royalPlayerEligibilityEvidence(getPlayerMealEligibility());}catch{return null;}};
 const eligible=id=>ROYAL_DINERS.includes(id)||id==='player'&&!!eligibility();
 const available=actorId=>!loadError&&eligible(actorId)&&!!(state.orders.find(o=>o.actorId===actorId&&active(o))||state.supply.remaining>state.orders.filter(o=>o.stage==='ordered').length);
 function request({actorId,seatId,name=actorId,workerId='cn-cooking',workReceiptId=null,workDay=getClock().day}){
  if(!eligible(actorId)||actorId==='player'&&workerId==='player')return null;
  const existing=state.orders.find(o=>o.actorId===actorId&&active(o));if(existing)return existing.seatId===seatId?copy(existing):null;
  if(!available(actorId)||!ROYAL_MEAL_SEATS.includes(seatId)||state.orders.some(o=>o.seatId===seatId&&active(o)))return null;
  let id;const ok=transaction(s=>{const number=++s.serial;id='cn-royal-meal-'+number;s.orders.push({id,number,actorId,actorName:name,seatId,day:getClock().day,workDay,workerId,workReceiptId,stage:'ordered',...(actorId==='player'?{eligibility:eligibility()}:{}),mealId:null,supplyReceipt:null,eatingSeconds:0,receipt:null});});return ok?copy(lookup(id)):null;
 }
 function change(id,from,to,extra={}){return transaction(s=>{const o=s.orders.find(o=>o.id===id);if(!o||o.stage!==from||o.actorId==='player'&&!sameRoyalPlayerEligibility(o.eligibility,eligibility()))return false;Object.assign(o,extra,{stage:to});});}
 function prepare(id){return transaction(s=>{const o=s.orders.find(o=>o.id===id);if(o?.stage!=='ordered'||s.supply.remaining<1||o.actorId==='player'&&!sameRoyalPlayerEligibility(o.eligibility,eligibility()))return false;s.supply.remaining--;Object.assign(o,{stage:'prepared',supplyReceipt:id+'-prepared',mealId:id+'-meal'});});}
 function cancel(actorId,reason='活动中断'){
  const row=state.orders.find(o=>o.actorId===actorId&&active(o));if(!row)return true;
  return transaction(s=>{const o=s.orders.find(o=>o.id===row.id);if(o.supplyReceipt)s.supply.wasted++;o.stage='cancelled';o.cancelReason=String(reason).slice(0,100);});
 }
 function consume(id,actorId,elapsed){const row=lookup(id);if(actorId==='player'&&!sameRoyalPlayerEligibility(row?.eligibility,eligibility()))return false;if(row?.stage==='consumed')return row.actorId===actorId;
  if(row?.actorId!==actorId||row.stage!=='eating'||elapsed<12)return false;
  return change(id,'eating','consumed',{eatingSeconds:elapsed,receipt:{source:'china-royal-kitchen',id:id+'-consumed',number:row.number,actorId,orderId:id,mealId:row.mealId,dishId:'royal-steamed-meal',supplyReceipt:row.supplyReceipt,completed:true,...(actorId==='player'?{eligibility:copy(row.eligibility),eatingSeconds:elapsed}:{})}});
 }
 function reassign(receiptId,workerId,nextReceipt=null,workDay=getClock().day){return transaction(s=>{for(const o of s.orders){if(!active(o)||o.workReceiptId!==receiptId)continue;if(o.stage==='carrying')return false;Object.assign(o,{workerId,workReceiptId:nextReceipt,workDay});}});}
 function claim(receiptId,day){return transaction(s=>{if(s.orders.some(o=>o.actorId==='player'&&active(o)))return false;for(const o of s.orders)if(o.stage==='ordered'&&o.workerId==='cn-cooking')Object.assign(o,{workerId:'player',workReceiptId:receiptId,workDay:day});});}
 return {snapshot,claim,loadError:()=>loadError,available,request,prepare,cancel,consume,reassign,change,lookup:id=>{const o=lookup(id);return o?copy(o):null;},forActor:id=>{const o=forActor(id);return o?copy(o):null;},active:()=>state.orders.filter(active).map(copy),receipts:()=>state.orders.filter(o=>o.stage==='consumed').map(o=>copy(o.receipt))};
}
