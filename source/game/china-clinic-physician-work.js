import {CHINA_CLINIC as C} from './china-clinic.js';
import {GAME_HEALTH_CONDITIONS} from './game-health.js';

// These names classify authored game symptoms only. They are not diagnoses,
// medicines or recipes. The original numbered clinic paper remains the object.
export const CLINIC_CARE_PLANS=Object.freeze([
 ...Object.entries(GAME_HEALTH_CONDITIONS).map(([id,condition])=>Object.freeze({id,name:condition.name.replace('（虚构）','')+'照护单',symptom:condition.symptom})),
 Object.freeze({id:'review-record',name:'复核记录照护单',symptom:null}),
]);
export function clinicCarePlan(symptoms){
 const matches=CLINIC_CARE_PLANS.filter(plan=>plan.symptom&&symptoms?.includes(plan.symptom));
 return matches.length===1&&symptoms.length===1?matches[0].id:'review-record';
}
export function validPhysicianOrder(order){
 if(order.physician===undefined)return true;
 return ['player','cn-clinic-physician'].includes(order.physician)&&Array.isArray(order.symptoms)&&order.symptoms.length>0&&order.symptoms.every(s=>typeof s==='string'&&s.length>0&&s.length<240)&&
  typeof order.questioned==='boolean'&&typeof order.careCorrect==='boolean'&&
  (order.carePlanId===null||CLINIC_CARE_PLANS.some(p=>p.id===order.carePlanId))&&
  (order.physician==='player'?/^cn-clinic-physician-labor-[1-9][0-9]*$/.test(order.physicianReceiptId):order.physicianReceiptId===null)&&
  (!order.careCorrect||order.questioned&&order.carePlanId===clinicCarePlan(order.symptoms));
}
export function createClinicPhysicianWork({getOrder,getJob,getPlayer,getMounted,isHired,near,seated,assistant,changeOrder,cancelOrder,notify}){
 let action=null;
 const owns=receipt=>{const o=getOrder(),job=getJob();return !!o&&o.physician==='player'&&o.physicianReceiptId===receipt&&job?.receiptId===receipt&&job.stage==='working'&&isHired();};
 const current=()=>owns(getJob()?.receiptId);
 const active=()=>current()&&!['complete','cancelled'].includes(getOrder().stage);
 function intent(receipt,planId=null){
  const o=getOrder();if(!owns(receipt)||action)return null;
  const kind=o.stage==='consult'?'question':o.stage==='writing'?(planId?'write':'choose'):o.stage==='handoff'?'handoff':null;
  if(!kind||kind==='write'&&!CLINIC_CARE_PLANS.some(p=>p.id===planId))return null;
  return {kind,planId,key:[o.id,o.stage,receipt,planId||'-'].join(':'),orderId:o.id,recipientId:o.recipientId,number:o.number,cardId:o.cardId,
   position:(kind==='handoff'?C.points.doctorHandoff:C.points.doctor).slice(),executionRadius:.3,
   action:kind==='question'?`当面问询第 ${o.number} 号 · ${o.recipientName}`:kind==='choose'?`查看第 ${o.number} 号症状记录 · 选择照护单`:kind==='write'?`写第 ${o.number} 号 · ${CLINIC_CARE_PLANS.find(p=>p.id===planId).name}`:`交第 ${o.number} 号原单给苏禾`};
 }
 function execute(choice,receipt,player){
  const next=intent(receipt,choice?.planId);if(!next||getMounted()||!near(player,next.position,.3)||['key','kind','planId','orderId','recipientId','number','cardId'].some(k=>choice?.[k]!==next[k]))return false;
  if(next.kind==='choose')return false;
  if(next.kind==='handoff'?!near(assistant,C.points.assistantHandoff,.1):!seated()){notify('请等原来客或苏禾到位，再当面办理');return false;}
  if(next.kind==='write'&&choice.planId!==clinicCarePlan(getOrder().symptoms)){
   if(getOrder().lastMismatchPlan!==choice.planId&&!changeOrder(o=>{o.lastMismatchPlan=choice.planId;},'physician-plan-mismatch',{planId:choice.planId}))return false;
   notify('照护单与原症状记录不符，还未发单。请重新核对记录，选择相符照护单');return true;
  }
  action={...next,elapsed:0,duration:next.kind==='write'?3.4:next.kind==='question'?2.2:1.3,origin:player.root.position.toArray()};return true;
 }
 function update(dt,paused=false){
  if(!active()){action=null;return;}
  const o=getOrder();
  if(!action)return;
  if(getMounted()||!near(getPlayer(),action.origin,.035)){action=null;notify('动作已暂停，原编号与问询记录保留');return;}
  if(paused||action.kind==='handoff'&&!near(assistant,C.points.assistantHandoff,.1)||action.kind!=='handoff'&&!seated())return;
  action.elapsed+=Math.min(.1,Math.max(0,dt));if(action.elapsed<action.duration)return;
  const a=action;
  const done=changeOrder(row=>{
   if(a.kind==='question'){row.questioned=true;row.stage='writing';}
   else if(a.kind==='write'){row.carePlanId=a.planId;row.careCorrect=true;row.lastMismatchPlan=null;row.stage='handoff';row.cardHolder='physician-player';row.claims={doctor:'player',assistant:assistant.station.id};}
   else {row.cardHolder='assistant';row.claims={doctor:null,assistant:assistant.station.id};row.stage='stock';}
  },a.kind==='question'?'physician-questioned':a.kind==='write'?'physician-card-written':'card-received',a.kind==='handoff'?{cardId:o.cardId,from:'player',to:assistant.station.id}:{});
  if(done)action=null;
 }
 return {intent,execute,update,current,active,owns,stop:()=>{action=null;},isActing:()=>!!action,
  canEnd:receipt=>!owns(receipt)||['complete','cancelled'].includes(getOrder().stage),
  pose:()=>action?{action:action.kind==='write'?'calligraphy':'wave',station:{position:action.position,playerWorkTarget:action.kind==='write'?C.points.paper:action.kind==='handoff'?C.points.assistantHandoff:C.points.consult}}:getOrder()?.cardHolder==='physician-player'?{action:null,station:null,handoff:true}:null,
  details:()=>getOrder()?.physician==='player'?{orderId:getOrder().id,number:getOrder().number,recipientName:getOrder().recipientName,symptoms:getOrder().questioned?getOrder().symptoms.slice():[],stage:getOrder().stage,mismatch:!!getOrder().lastMismatchPlan,plans:getOrder().stage==='writing'?CLINIC_CARE_PLANS.map(({id,name})=>({id,name})):[]}:null};
}
