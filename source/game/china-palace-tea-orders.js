import {PALACE_TEA_ROLE as ROLE} from './china-palace-tea-role.js';

// Dormant contract boundary. Only a controller that observes a real arrived
// guest, explicit request/acceptance, and the original physical objects calls
// this ledger. Existing chat history cannot be migrated into paid requests.
const copy=structuredClone,integer=n=>Number.isSafeInteger(n)&&n>=0;
export const PALACE_TEA_GUESTS=Object.freeze(['cn-consort-yue','cn-consort-heng','cn-consort-ling']);
export const PALACE_TEA_STEPS=Object.freeze(['accepted','prepared','carried','placed','drunk','retrieved','cleared']);
const person=id=>typeof id==='string'&&/^cn-[a-z0-9-]{1,60}$/.test(id);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const palaceTeaRequestId=(guestId,day)=>`cn-palace-tea:${day}:${guestId}`;
function validOrder(o,allowPlayer=false){
 if(!o||!integer(o.day)||!PALACE_TEA_GUESTS.includes(o.guestId)||!(person(o.actorId)||allowPlayer&&o.actorId==='player')||!integer(o.holderRevision)||o.id!==palaceTeaRequestId(o.guestId,o.day)||o.roleId!==ROLE.id||o.slotId!==ROLE.slotId||o.contractVersion!==ROLE.contractVersion||o.amount!==ROLE.amount||o.cupId!==o.id+':cup'||o.trayId!==o.id+':tray'||!PALACE_TEA_STEPS.includes(o.stage)&&o.stage!=='cancelled'||typeof o.visitId!=='string'||!o.visitId||o.visitId.length>160)return false;
 const index=PALACE_TEA_STEPS.indexOf(o.stage);
 if(!Array.isArray(o.steps)||!same(o.steps,PALACE_TEA_STEPS.slice(0,o.stage==='cancelled'?o.steps.length:index+1))||o.steps.length<1||o.steps.length>7||o.stage==='cancelled'&&o.steps.length===7)return false;
 return Object.keys(o).sort().join(',')==='actorId,amount,contractVersion,cupId,day,guestId,holderRevision,id,roleId,slotId,stage,steps,trayId,visitId';
}
export function palaceTeaProof(order){
 if(!validOrder(order,true)||order.stage!=='cleared')return null;
 return {kind:order.actorId==='player'?'player-palace-tea-piecework':'npc-palace-tea-piecework',version:1,actorId:order.actorId,roleId:order.roleId,slotId:order.slotId,holderRevision:order.holderRevision,requestId:order.id,guestId:order.guestId,visitId:order.visitId,day:order.day,cupId:order.cupId,trayId:order.trayId,amount:order.amount,contractVersion:order.contractVersion,steps:copy(order.steps)};
}
export function createPalaceTeaOrders({saved,saveState=()=>false,allowPlayer=false}={}){
 let current={version:1,orders:[]},invalid=null,loadError=null,busy=false;
 if(saved!=null){
  invalid=copy(saved);
  if(saved?.version!==1||!Array.isArray(saved.orders)||Object.keys(saved).sort().join(',')!=='orders,version'||saved.orders.some(o=>!validOrder(o,allowPlayer))||new Set(saved.orders.map(o=>o.id)).size!==saved.orders.length||saved.orders.filter(o=>!['cleared','cancelled'].includes(o.stage)).length>1)loadError='invalid-palace-tea-orders';
  else{current=copy(saved);invalid=null;}
 }
 const snapshot=()=>copy(loadError?invalid:current),active=()=>current.orders.find(o=>!['cleared','cancelled'].includes(o.stage));
 function commit(next){
  if(loadError||busy)return {ok:false,code:loadError||'tea-orders-busy'};
  busy=true;
  try{const result=saveState(copy(next));if(result===false||result?.ok===false||result?.then)return {ok:false,code:'save-failed'};current=next;return {ok:true};}
  catch{return {ok:false,code:'save-failed'};}finally{busy=false;}
 }
 function match(o,input){return !!o&&input?.requestId===o.id&&input.actorId===o.actorId&&input.holderRevision===o.holderRevision&&input.guestId===o.guestId&&input.visitId===o.visitId&&input.cupId===o.cupId&&input.trayId===o.trayId;}
 return {
  snapshot,state:snapshot,get loadError(){return loadError;},
  active:()=>loadError?null:copy(active()||null),lookup:id=>loadError?null:copy(current.orders.find(o=>o.id===id)||null),
  request(input){
   if(loadError||busy)return {ok:false,code:loadError||'tea-orders-busy'};
   if(!input||!PALACE_TEA_GUESTS.includes(input.guestId)||!(person(input.actorId)||allowPlayer&&input.actorId==='player')||!integer(input.day)||!integer(input.holderRevision)||typeof input.visitId!=='string'||!input.visitId||input.visitId.length>160||input.arrived!==true||input.guestAsked!==true||input.hostAccepted!==true)return {ok:false,code:'tea-request-not-accepted'};
   const id=palaceTeaRequestId(input.guestId,input.day);
   // Cancellation consumes this original guest/day request too; neither a
   // revisit nor a replacement worker creates a second employer fee.
   if(current.orders.some(o=>o.id===id))return {ok:false,code:'tea-request-already-used'};
   if(active())return {ok:false,code:'tea-service-occupied'};
   const order={id,guestId:input.guestId,actorId:input.actorId,holderRevision:input.holderRevision,visitId:input.visitId,day:input.day,roleId:ROLE.id,slotId:ROLE.slotId,contractVersion:ROLE.contractVersion,amount:ROLE.amount,cupId:id+':cup',trayId:id+':tray',stage:'accepted',steps:['accepted']};
   const next=copy(current);next.orders.push(order);const result=commit(next);return result.ok?{ok:true,order:copy(order)}:result;
  },
  advance(input){
   if(loadError||busy)return {ok:false,code:loadError||'tea-orders-busy'};
   const order=active();if(!match(order,input)||PALACE_TEA_STEPS[order.steps.length]!==input.stage||input.observed!==true)return {ok:false,code:'tea-original-step-mismatch'};
   // Completion is prepared, then adopted only in the same transaction as
   // personal pay and the controller world snapshot; never save it here.
   const next=copy(current),target=next.orders.find(o=>o.id===order.id);target.stage=input.stage;target.steps.push(input.stage);
   if(input.stage==='cleared')return {ok:false,code:'tea-atomic-completion-required'};
   const result=commit(next);return result.ok?{ok:true,order:copy(target)}:result;
  },
  prepareCompletion(input){
   if(loadError||busy)return {ok:false,code:loadError||'tea-orders-busy'};
   const order=active();if(!match(order,input)||order.stage!=='retrieved'||input.observed!==true)return {ok:false,code:'tea-original-step-mismatch'};
   const before=copy(current),next=copy(current),target=next.orders.find(o=>o.id===order.id);target.stage='cleared';target.steps.push('cleared');let committed=false;
   return {ok:true,snapshot:copy(next),proof:palaceTeaProof(target),commit(saveAtomic){
    if(committed)return {ok:true,replayed:true};if(busy||!same(current,before))return {ok:false,code:'stale-tea-completion'};
    busy=true;try{const result=saveAtomic(copy(next),palaceTeaProof(target));if(result===false||result?.ok===false||result?.then)return {ok:false,code:result?.code||'save-failed'};current=next;committed=true;return {ok:true};}catch{return {ok:false,code:'save-failed'};}finally{busy=false;}
   }};
  },
  cancel(requestId){
   const order=active();if(!order||order.id!==requestId)return {ok:false,code:'tea-request-not-active'};
   const next=copy(current);next.orders.find(o=>o.id===requestId).stage='cancelled';return commit(next);
  }
 };
}
