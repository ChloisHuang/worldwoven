import {isSociallyHeld} from './npc-social-ownership.js';
import {ARCHIVE_BOOKS,ARCHIVE_HOME,archiveContract,archiveProof,validateArchiveContract,archiveSame} from './china-archive-catalogue.js';
const copy=structuredClone,integer=n=>Number.isSafeInteger(n)&&n>=0;
const stages=['approach','check','tidy','replace','return','settle'];
const empty=()=>({version:3,lastIssuedDay:-1,order:null,interruptions:[],recovery:null});
const near=(n,p)=>!!n?.root?.position&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<.04&&Math.abs(n.root.position.y-p[1])<.2;
const keys=(o,k)=>!!o&&archiveSame(Object.keys(o),k);
function validOrder(o){
 if(!keys(o,['contract','index','stage','seconds','completed'])||!validateArchiveContract(o.contract)||!integer(o.index)||o.index>6||!stages.includes(o.stage)||!Number.isFinite(o.seconds)||o.seconds<0||!Array.isArray(o.completed))return false;
 if(!archiveSame(o.completed,ARCHIVE_BOOKS.slice(0,o.index).map(b=>b.id))||(o.index===6)!==['return','settle'].includes(o.stage))return false;
 return o.seconds<=(o.stage==='check'?2:o.stage==='tidy'?1:o.stage==='replace'?.8:0);
}
function normalize(s){
 if(s?.version===2&&keys(s,['version','lastIssuedDay','order']))return {...copy(s),version:3,interruptions:[],recovery:null};
 return copy(s);
}
function valid(s){
 if(!keys(s,['version','lastIssuedDay','order','interruptions','recovery'])||s.version!==3||!Number.isSafeInteger(s.lastIssuedDay)||s.lastIssuedDay< -1||!Array.isArray(s.interruptions))return false;
 if(s.order&&(!validOrder(s.order)||s.order.contract.day!==s.lastIssuedDay))return false;
 if(s.order!==null&&!s.order)return false;
 const seen=new Set();for(const row of s.interruptions){if(!keys(row,['order','reason'])||!validOrder(row.order)||!['actor-dead','actor-missing','assignment-changed'].includes(row.reason)||row.order.contract.day>s.lastIssuedDay||seen.has(row.order.contract.orderId))return false;seen.add(row.order.contract.orderId);}
 if(s.order&&seen.has(s.order.contract.orderId))return false;
 const r=s.recovery;if(r===null)return true;
 if(s.order||!keys(r,['order','fallSeconds','seconds','worker'])||!validOrder(r.order)||r.order.index>=6||!s.interruptions.some(row=>archiveSame(row.order,r.order))||!Number.isFinite(r.fallSeconds)||r.fallSeconds<0||r.fallSeconds>.2||!Number.isFinite(r.seconds)||r.seconds<0||r.seconds>.8)return false;
 return r.worker===null||keys(r.worker,['actorId','holderRevision'])&&/^cn-[a-z0-9-]{1,60}$/.test(r.worker.actorId||'')&&integer(r.worker.holderRevision);
}
// Top-level persisted state is authoritative. World continuity restores bodies
// only; it must not overwrite a newer atomic work/payment transition.
export function createArchiveInspection({resolveAssignment,getDay,getActor,canControl=()=>false,travel,pose,books,economy,saved,saveState=()=>false}={}){
 let state=empty(),loadError=null,disposed=false;
 if(saved!=null){const s=normalize(saved);if(valid(s))state=s;else{state=copy(saved);loadError='invalid-archive-inspection';}}
 const project=()=>{if(!loadError)books?.restore?.(state.order,state.recovery);};
 function write(next){if(!valid(next))return false;try{const r=saveState(copy(next));if(r===false||r?.ok===false||r?.then)return false;state=next;project();return true;}catch{return false;}}
 const advance=(stage,extra={})=>write({...copy(state),order:{...copy(state.order),stage,seconds:0,...extra}});
 const ownedId=()=>loadError?null:state.order?.contract.actorId||state.recovery?.worker?.actorId||null;
 const unavailable=(n,binding)=>{const a=resolveAssignment();return !n?'actor-missing':n.alive===false?'actor-dead':a?.status==='invalid'?null:a?.holderId!==binding.actorId||a?.revision!==binding.holderRevision||a?.actor!==n?'assignment-changed':null;};
 const ready=n=>{const a=resolveAssignment();return n&&n.alive!==false&&a?.status==='npc'&&a.actor===n&&a.holderId===n.station?.id&&a.alive&&a.available&&canControl(n);};
 function interrupt(reason){
  const order=copy(state.order),next={...copy(state),order:null,interruptions:[...state.interruptions,{order,reason}],recovery:books.allReturned()||order.index>=6?null:{order,fallSeconds:0,seconds:0,worker:null}};
  return write(next);
 }
 project();
 return {
  snapshot:()=>copy(state),state:()=>copy(state),get loadError(){return loadError;},ownedActorId:ownedId,
  owns:n=>!!ownedId()&&n?.station?.id===ownedId(),reserves:n=>!!ownedId()&&n?.station?.id===ownedId(),
  handoffBoundary:()=>({ok:!loadError&&!state.order&&!state.recovery?.worker,blockers:loadError?[loadError]:state.order||state.recovery?.worker?['archive-original-work-unfinished']:[]}),
  studyAvailable:()=>!loadError&&!state.order&&!state.recovery,
  canBorrowMeal:()=>false,
  restore(s){const next=normalize(s);if(!valid(next)||loadError)return false;state=next;project();return true;},
  update(dt,t,{conversationActorId=null,performing=null}={}){
   if(disposed||loadError||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.25);
   if(state.recovery){
    const r=state.recovery;
    // A released original falls vertically onto its own supporting table. No
    // dead body is animated, no book is cloned, and no work/wage is credited.
    if(r.fallSeconds<.2){write({...copy(state),recovery:{...copy(r),fallSeconds:Math.min(.2,r.fallSeconds+dt)}});return;}
    if(!r.worker){const a=resolveAssignment();if(a?.holderId==='player'||!ready(a?.actor)||isSociallyHeld(a.holderId,conversationActorId)||performing===a.holderId)return;write({...copy(state),recovery:{...copy(r),worker:{actorId:a.holderId,holderRevision:a.revision}}});return;}
    const n=getActor(r.worker.actorId);if(unavailable(n,r.worker)){write({...copy(state),recovery:books.allReturned()?null:{...copy(r),worker:null}});return;}
    if(!ready(n)||isSociallyHeld(n.station.id,conversationActorId)||performing===n.station.id)return;
    if(r.seconds===.8){if(!near(n,ARCHIVE_HOME)){travel(n,ARCHIVE_HOME,dt);pose(n,t,null);return;}if(books.allReturned())write({...copy(state),recovery:null});return;}
    const b=ARCHIVE_BOOKS[r.order.index];if(!near(n,b.stand)){travel(n,b.stand,dt);pose(n,t,null);return;}
    pose(n,t,{book:b,stage:'recover',seconds:r.seconds});if(!books.contact(n,b.id)||!books.matches(null,r))return;
    const seconds=Math.min(.8,r.seconds+dt);if(!write({...copy(state),recovery:{...copy(r),seconds}}))return;
    return;
   }
   if(!state.order){
    const day=getDay(),a=resolveAssignment();
    if(!integer(day)||day<=state.lastIssuedDay||!ready(a?.actor)||a.holderId==='player'||isSociallyHeld(a.holderId,conversationActorId)||performing===a.holderId||!near(a.actor,ARCHIVE_HOME)||!books?.completeCatalogue?.())return;
    const contract=archiveContract(day,a.holderId,a.revision);if(!validateArchiveContract(contract))return;
    write({...copy(state),lastIssuedDay:day,order:{contract,index:0,stage:'approach',seconds:0,completed:[]}});return;
   }
   const o=state.order,n=getActor(o.contract.actorId),reason=unavailable(n,o.contract);if(reason){interrupt(reason);return;}
   if(!ready(n)||isSociallyHeld(n.station.id,conversationActorId)||performing===n.station.id)return;
   const b=ARCHIVE_BOOKS[o.index];
   if(['return','settle'].includes(o.stage)){
    if(!books.allReturned())return;
    if(!near(n,ARCHIVE_HOME)){if(o.stage==='settle')advance('return');travel(n,ARCHIVE_HOME,dt);pose(n,t,null);return;}
    if(o.stage==='return'){advance('settle');return;}
    const next={...copy(state),order:null};const result=economy.settle(archiveProof(o.contract),{chinaArchiveInspection:next});
    if(result.ok&&(!result.replayed||write(next))){state=next;project();}return;
   }
   if(!books.exists(b.id))return;
   if(o.stage==='approach'){if(!near(n,b.stand)){travel(n,b.stand,dt);pose(n,t,null);return;}if(books.atHome(b.id))advance('check');return;}
   if(!near(n,b.stand)){if(o.stage==='check'&&o.seconds===0)advance('approach');return;}
   pose(n,t,{book:b,stage:o.stage,seconds:o.seconds});if(!books.contact(n,b.id)||!books.matches(o))return;
   const limit=o.stage==='check'?2:o.stage==='tidy'?1:.8,seconds=Math.min(limit,o.seconds+dt);
   if(!write({...copy(state),order:{...copy(o),seconds}}))return;
   if(seconds===limit){if(o.stage==='replace'){if(!books.atHome(b.id))return;const index=o.index+1;advance(index===6?'return':'approach',{index,completed:[...o.completed,b.id]});}else advance(o.stage==='check'?'tidy':'replace');}
  },dispose(){disposed=true;}
 };
}
