import {JAPAN_BEDDING_POINTS as P} from './japan-bedding.js';
// Nao retains the original receiving post and Itsuki's relief duty. No new job
// or per-step payment is created; Yuki's existing linen role owns the washing.
export function createJapanBeddingReceiving({board,actors,assign,clear,taskOf,getStaffLife,onComplete=()=>{}}){
 const id='jp-herb-workshop',host=actors.get(id),ledger=board.bedding;let yieldLifeOnce=false;
 const held=()=>ledger.state().sets.find(s=>s.carryOwner===id);
 function update(){
  if(!host||ledger.state().loadError)return;
  if(yieldLifeOnce){yieldLifeOnce=false;return;}
  let task=taskOf(host);const cargo=held(),occupied=ledger.state().occupied;
  if(cargo?.stage==='delivering'&&occupied&&task?.beddingKind==='install'){clear(host);task=null;}
  if(task&&!task.idle||host.serviceMount||host.bathTransition)return;
  if(!cargo){const life=getStaffLife(),active=life?.state().active;if(life&&!life.canWork(id)||active?.reliefId===id&&!active.externalCoverage)return;}
  const x=ledger.receivingWork()[0];if(!x)return;
  const kind=x.stage==='incoming'?'receive':x.stage==='received'?'store':x.stage==='clean'?'pickup':occupied?'return':'install';
  const position=kind==='receive'?P.receiving:kind==='install'?P.guest:P.restock;
  const target=kind==='receive'?[2.8,1,-34.65]:kind==='install'?[3.25,8,-11.8]:[8.6,12.54,3.42];
  const label={receive:'核对汤屋自有原套寝具并收货',store:'把已收原套寝具送进四层净布草架',pickup:'领取原套干净寝具换回客房',install:'把同一套净寝具铺回原客房',return:'客房正在休息，先将原套净寝具放回架上'}[kind];
  clear(host);assign(host,position,{beddingWork:true,beddingKind:kind,label,duration:kind==='install'?3:2,action:'tidy',handoff:!!cargo,workTarget:target,onArrive:()=>ledger.state().sets.some(s=>s.id===x.id&&s.stage===x.stage&&s.cycle===x.cycle),onDone:()=>{
   if(!ledger.receive(x.id,x.stage,{position:host.root.position.toArray(),expectedCycle:x.cycle,returnToStock:kind==='return'}))return false;if(!held())yieldLifeOnce=true;onComplete(x.id,'bedding-'+kind);return true;
  }});
 }
 return {update,holdsHost:()=>!!(held()||taskOf(host)?.beddingWork),blocksWorker:worker=>worker===id&&!!(held()||taskOf(host)?.beddingWork),idleTask:worker=>worker===id&&getStaffLife()?.state().active?.reliefId!==id?{duration:4,face:[2.8,1,-34.65],label:ledger.state().loadError?'寝具收货记录待恢复':ledger.receivingWork().length?'原套寝具待清点交接':'原套寝具已归库 · 等候下一次换洗'}:null};
}
