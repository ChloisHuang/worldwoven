import {isSociallyHeld} from './npc-social-ownership.js';
import {TELLER_HOME,TELLER_STANDS,TELLER_CURRENCIES,freezeTellerSource,verifyTellerSource,tellerContract,tellerAuditProof,validateTellerContract,tellerSame} from './china-teller-audit-proof.js';
const copy=structuredClone,integer=n=>Number.isSafeInteger(n)&&n>=0;
const empty=()=>({version:2,lastIssuedDay:-1,order:null,interruptions:[]});
const near=(n,p)=>!!n?.root?.position&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<.04&&Math.abs(n.root.position.y-p[1])<.2;
const keys=(v,names)=>!!v&&typeof v==='object'&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
function validOrder(o){
 if(!keys(o,['contract','index','stage','seconds','checked','calculationIndex','calculated','calculation','recorded'])||!validateTellerContract(o.contract)||!integer(o.index)||o.index>4||!['check','calculate','record','return','settle'].includes(o.stage)||!Number.isFinite(o.seconds)||o.seconds<0||o.seconds>(['return','settle'].includes(o.stage)?0:2))return false;
 const report=verifyTellerSource(o.contract.source);
 if(!integer(o.calculationIndex)||o.calculationIndex>4||!tellerSame(o.calculated,report.rows.slice(0,o.calculationIndex))||o.stage==='check'&&o.calculationIndex!==0||o.stage==='calculate'&&o.calculationIndex>=4||['record','return','settle'].includes(o.stage)&&o.calculationIndex!==4)return false;
 if(!tellerSame(o.checked,report.rows.slice(0,o.index))||(o.stage==='check')!==(o.index<4))return false;
 if(!tellerSame(o.calculation,['record','return','settle'].includes(o.stage)?report:null))return false;
 return o.recorded===['return','settle'].includes(o.stage);
}
function valid(s){
 if(!keys(s,['version','lastIssuedDay','order','interruptions'])||s.version!==2||!Number.isSafeInteger(s.lastIssuedDay)||s.lastIssuedDay< -1||!Array.isArray(s.interruptions))return false;
 if(s.order!==null&&(!validOrder(s.order)||s.order.contract.day!==s.lastIssuedDay))return false;
 const seen=new Set();for(const row of s.interruptions){if(!keys(row,['order','reason'])||!validOrder(row.order)||!['actor-dead','actor-missing','assignment-changed'].includes(row.reason)||row.order.contract.day>s.lastIssuedDay||seen.has(row.order.contract.orderId))return false;seen.add(row.order.contract.orderId);}
 return !s.order||!seen.has(s.order.contract.orderId);
}
export const validTellerInspectionState=valid;
// Duty logic has no daily-needs registration. The Chinese scene adapter
// provides real movement, contact and exclusive body ownership.
// Only this top-level state is authoritative; there is no continuity restore API.
export function createTellerInspection({resolveAssignment,getDay,getGlobalAuditDay=()=>-1,getActor,getLedger,canControl=()=>false,isCounterOpen=()=>true,travel,pose,contact=()=>false,economy,saved,saveState=()=>false}={}){
 let state=empty(),loadError=null,disposed=false,cachedReport=null,cachedOrderId=null;
 const reportOf=c=>{if(cachedOrderId!==c.orderId){cachedReport=verifyTellerSource(c.source);cachedOrderId=c.orderId;}return cachedReport;};
 if(saved!=null){if(valid(saved))state=copy(saved);else{state=copy(saved);loadError='invalid-teller-inspection';}}
 function write(next){if(!valid(next))return false;try{const r=saveState(copy(next));if(r?.then)Promise.resolve(r).catch(()=>{});if(r===false||r?.ok===false||r?.then)return false;state=next;return true;}catch{return false;}}
 const ownedId=()=>loadError?null:state.order?.contract.actorId||null;
 const ready=n=>{const a=resolveAssignment();return !!n&&n.alive!==false&&a?.status==='npc'&&a.actor===n&&a.holderId===n.station?.id&&a.alive&&a.available&&canControl(n);};
 const blocked=(n,context)=>isCounterOpen()||isSociallyHeld(n.station.id,context.conversationActorId)||context.performing===n.station.id;
 const liveLedger=()=>{try{const ledger=getLedger();return ledger&&ledger.loadError===null&&typeof ledger.state==='function'?ledger:null;}catch{return null;}};
 return {
  snapshot:()=>copy(state),state:()=>copy(state),get loadError(){return loadError;},ownedActorId:ownedId,
  owns:n=>!!ownedId()&&n?.station?.id===ownedId(),reserves:n=>!!ownedId()&&n?.station?.id===ownedId(),
  handoffBoundary:()=>({ok:!loadError&&!state.order,blockers:loadError?[loadError]:state.order?['teller-original-work-unfinished']:[]}),
  // The daily audit reads its frozen source, not a pending cash transaction.
  // Its same holder can pause to serve a customer without handing off, settling,
  // reissuing or replacing that source. isCounterOpen freezes all audit progress.
  canServeCounter:n=>{const a=resolveAssignment(),o=state.order;return !disposed&&!loadError&&ready(n)&&!!liveLedger()&&(!o||o.contract.actorId===n.station.id&&o.contract.holderRevision===a.revision);},
  canBorrowMeal:()=>false,
  update(dt,t,context={}){
   if(disposed||loadError||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.25);
   if(!state.order){
    const day=getDay(),a=resolveAssignment();
    if(!integer(day)||day<=Math.max(state.lastIssuedDay,getGlobalAuditDay())||!ready(a?.actor)||a.holderId==='player'||blocked(a.actor,context)||!near(a.actor,TELLER_HOME))return;
    const ledger=liveLedger();if(!ledger)return;
    const source=freezeTellerSource(ledger);if(!source)return;
    const contract=tellerContract(day,a.holderId,a.revision,source);if(!validateTellerContract(contract))return;
    write({...copy(state),lastIssuedDay:day,order:{contract,index:0,stage:'check',seconds:0,checked:[],calculationIndex:0,calculated:[],calculation:null,recorded:false}});return;
   }
   const o=state.order,n=getActor(o.contract.actorId),a=resolveAssignment();
   const reason=!n?'actor-missing':n.alive===false?'actor-dead':a?.status==='invalid'?null:a?.holderId!==o.contract.actorId||a?.revision!==o.contract.holderRevision||a?.actor!==n?'assignment-changed':null;
   if(reason){write({...copy(state),order:null,interruptions:[...state.interruptions,{order:copy(o),reason}]});return;}
   if(!ready(n)||blocked(n,context)||!liveLedger())return;
   if(['return','settle'].includes(o.stage)){
    if(!near(n,TELLER_HOME)){if(o.stage==='settle'&&!write({...copy(state),order:{...copy(o),stage:'return'}}))return;travel(n,TELLER_HOME,dt);pose(n,t,null);return;}
    if(o.stage==='return'){write({...copy(state),order:{...copy(o),stage:'settle'}});return;}
    const next={...copy(state),order:null},result=economy.settle(tellerAuditProof(o.contract),{chinaTellerInspection:next});
    if(result.ok&&(!result.replayed||write(next)))state=next;return;
   }
   const target=o.stage==='calculate'?'abacus':'ledger',stand=TELLER_STANDS[target];
   if(!near(n,stand)){travel(n,stand,dt);pose(n,t,null);return;}
   const reportForPose=reportOf(o.contract),rowIndex=o.stage==='check'?o.index:o.stage==='calculate'?o.calculationIndex:Math.min(3,Math.floor(o.seconds*2));
   const work={target,stage:o.stage,currency:TELLER_CURRENCIES[rowIndex],row:copy(reportForPose.rows[rowIndex]),seconds:o.seconds};
   pose(n,t,work);
   if(!contact(n,target,work))return;
   // In-frame progress is checkpointable, but not a new storage write per frame.
   // Arrival/blocked time never accrues; a failed transition retains the same job.
   const seconds=Math.min(2,o.seconds+dt);
   if(seconds===2){const finalWork={...work,seconds:2};pose(n,t,finalWork);if(!contact(n,target,finalWork))return;}
   o.seconds=seconds;if(o.seconds<2)return;
   const next=copy(state),job=next.order,report=reportOf(job.contract);if(!report)return;
   if(job.stage==='check'){job.checked.push(copy(report.rows[job.index++]));if(job.index===4)job.stage='calculate';}
   else if(job.stage==='calculate'){job.calculated.push(copy(report.rows[job.calculationIndex++]));if(job.calculationIndex===4){job.calculation=report;job.stage='record';}}
   else{job.recorded=true;job.stage='return';}
   job.seconds=0;write(next);
  },dispose(){disposed=true;}
 };
}
