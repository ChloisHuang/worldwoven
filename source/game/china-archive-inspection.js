import {ARCHIVE_BOOKS,ARCHIVE_HOME,archiveContract,archiveProof,validateArchiveContract,archiveSame} from './china-archive-catalogue.js';
const copy=structuredClone,integer=n=>Number.isSafeInteger(n)&&n>=0;
const stages=['approach','check','tidy','replace','return','settle'];
const empty=()=>({version:2,lastIssuedDay:-1,order:null});
const near=(n,p)=>!!n?.root?.position&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<.15&&Math.abs(n.root.position.y-p[1])<.2;
// This controller is dormant until an owner supplies actual movement, pose and
// original-book adapters. Missing contact is a blocker, never synthetic work.
export function createArchiveInspection({resolveAssignment,getDay,getActor,canControl=()=>false,travel,pose,books,economy,saved,saveState=()=>false}={}){
 let state=empty(),loadError=null,disposed=false;
 function valid(s){
  if(!s||!archiveSame(Object.keys(s),['version','lastIssuedDay','order'])||s.version!==2||!Number.isSafeInteger(s.lastIssuedDay)||s.lastIssuedDay< -1)return false;
  const o=s.order;if(o===null)return true;
  if(!archiveSame(Object.keys(o),['contract','index','stage','seconds','completed'])||!validateArchiveContract(o.contract)||o.contract.day!==s.lastIssuedDay||!integer(o.index)||o.index>6||!stages.includes(o.stage)||!Number.isFinite(o.seconds)||o.seconds<0||!Array.isArray(o.completed))return false;
  if(!archiveSame(o.completed,ARCHIVE_BOOKS.slice(0,o.index).map(b=>b.id)))return false;
  if((o.index===6)!==['return','settle'].includes(o.stage))return false;
  return o.seconds<=(o.stage==='check'?2:o.stage==='tidy'?1:o.stage==='replace'?.8:0);
 }
 if(saved!=null){if(valid(saved))state=copy(saved);else{state=copy(saved);loadError='invalid-archive-inspection';}}
 function write(next){try{const r=saveState(copy(next));if(r===false||r?.ok===false||r?.then)return false;state=next;books?.restore?.(state.order);return true;}catch{return false;}}
 const actor=()=>state.order&&getActor(state.order.contract.actorId);
 const assignmentMatches=n=>{const a=resolveAssignment();return n&&n.alive!==false&&a?.status==='npc'&&a.actor===n&&a.alive&&a.available&&n.station?.id===a.holderId&&a.holderId===state.order.contract.actorId&&a.revision===state.order.contract.holderRevision&&canControl(n);};
 const advance=(stage,extra={})=>write({...copy(state),order:{...copy(state.order),stage,seconds:0,...extra}});
 const restoreBooks=()=>{if(!loadError&&books?.restore)books.restore(state.order);};
 restoreBooks();
 return {
  snapshot:()=>copy(state),state:()=>copy(state),get loadError(){return loadError;},
  owns:n=>!loadError&&!!state.order&&n?.station?.id===state.order.contract.actorId,
  reserves:n=>!loadError&&!!state.order&&n?.station?.id===state.order.contract.actorId,
  handoffBoundary:()=>({ok:!loadError&&!state.order,blockers:loadError?[loadError]:state.order?['archive-original-order-unfinished']:[]}),
  canBorrowMeal:()=>false,
  restore(s){if(!valid(s)||loadError)return false;state=copy(s);restoreBooks();return true;},
  update(dt,t,{conversationActorId=null,performing=null}={}){
   if(disposed||loadError||!Number.isFinite(dt)||dt<=0)return;
   // Frame stalls do not count as observed physical work.
   dt=Math.min(dt,.25);
   if(!state.order){
    const day=getDay(),a=resolveAssignment();
    if(!integer(day)||day<=state.lastIssuedDay||a?.status!=='npc'||!a.alive||!a.available||!a.actor||!canControl(a.actor)||a.actor.alive===false||a.holderId==='player'||a.actor.station?.id!==a.holderId||conversationActorId===a.holderId||performing===a.holderId||!near(a.actor,ARCHIVE_HOME)||!books?.completeCatalogue?.())return;
    const contract=archiveContract(day,a.holderId,a.revision);if(!validateArchiveContract(contract))return;
    write({version:2,lastIssuedDay:day,order:{contract,index:0,stage:'approach',seconds:0,completed:[]}});return;
   }
   const n=actor();if(!assignmentMatches(n)||conversationActorId===n.station.id||performing===n.station.id)return;
   const o=state.order,b=ARCHIVE_BOOKS[o.index];
   if(['return','settle'].includes(o.stage)){
    if(!books.allReturned())return;
    if(!near(n,ARCHIVE_HOME)){if(o.stage==='settle')advance('return');travel(n,ARCHIVE_HOME,dt);pose(n,t,null);return;}
    if(o.stage==='return'){advance('settle');return;}
    const next={...copy(state),order:null};
    const result=economy.settle(archiveProof(o.contract),{chinaArchiveInspection:next});
    if(result.ok&&(!result.replayed||write(next))){state=next;books.restore(null);}return;
   }
   if(!books.exists(b.id))return;
   if(o.stage==='approach'){
    if(!near(n,b.stand)){travel(n,b.stand,dt);pose(n,t,null);return;}
    // Original placement must still match before this order may reserve it.
    if(books.atHome(b.id))advance('check');return;
   }
   if(!near(n,b.stand))return;
   pose(n,t,{book:b,stage:o.stage,seconds:o.seconds});
   // The actual posed hand must reach this exact original volume. The adapter
   // may not replace a missing hand with a root-relative guessed target.
   if(!books.contact(n,b.id))return;
   if(!books.matches(o))return;
   const limit=o.stage==='check'?2:o.stage==='tidy'?1:.8,seconds=Math.min(limit,o.seconds+dt);
   if(!write({...copy(state),order:{...copy(o),seconds}}))return;
   if(seconds===limit){if(o.stage==='replace'){if(!books.atHome(b.id))return;const index=o.index+1;advance(index===6?'return':'approach',{index,completed:[...o.completed,b.id]});}else advance(o.stage==='check'?'tidy':'replace');}
  },
  dispose(){disposed=true;}
 };
}
