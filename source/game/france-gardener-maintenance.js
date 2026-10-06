// The authored two beds and one hedge are the entire maintenance inventory.
// A completed task returns on the next simulation day, never on a timer.
const copy=value=>JSON.parse(JSON.stringify(value)),integer=n=>Number.isSafeInteger(n)&&n>=0;
const kinds=['water','prune'],taskId=(kind,number)=>`fr-garden-maintenance-${kind}-${number}`;
const fresh=(kind,number=1)=>({id:taskId(kind,number),number,kind,...(kind==='water'?{completedBeds:0,wateredMask:0}:{pruned:false}),completedDay:null});
const complete=t=>t.kind==='water'?t.completedBeds===2:t.pruned;
function restored(saved,targetIds){
 if(saved==null)return {version:1,water:fresh('water'),prune:fresh('prune'),lease:null,receipts:[]};
 saved=copy(saved);if(saved.water&&saved.water.wateredMask===undefined)saved.water.wateredMask=(1<<saved.water.completedBeds)-1;
 if(saved.version!==1||!Array.isArray(saved.receipts))throw Error('invalid-saved-state');
 for(const kind of kinds){const t=saved[kind];if(!t||t.kind!==kind||!integer(t.number)||t.number<1||t.id!==taskId(kind,t.number)||
  (kind==='water'?(!integer(t.completedBeds)||t.completedBeds>2||!integer(t.wateredMask)||t.wateredMask>3||t.completedBeds!==Number(!!(t.wateredMask&1))+Number(!!(t.wateredMask&2))):typeof t.pruned!=='boolean')||
  (t.completedDay!==null&&!integer(t.completedDay))||complete(t)!==(t.completedDay!==null))throw Error('invalid-saved-state');}
 const l=saved.lease;if(l!=null&&(!l||typeof l.owner!=='string'||!l.owner||!kinds.includes(l.kind)||l.taskId!==saved[l.kind].id||!integer(l.day)||typeof l.borrowed!=='boolean'))throw Error('invalid-saved-state');
 const ids=new Set();
 for(const r of saved.receipts){if(!r||!kinds.includes(r.kind)||!integer(r.number)||r.number<1||r.number>saved[r.kind].number||r.id!==taskId(r.kind,r.number)||
  typeof r.workReceiptId!=='string'||!r.workReceiptId||!integer(r.day)||r.completed!==true||r.returned!==true||
  JSON.stringify(r.targetIds)!==JSON.stringify(targetIds[r.kind])||ids.has(r.id))throw Error('invalid-saved-state');ids.add(r.id);}
 if(l&&ids.has(l.taskId))throw Error('invalid-saved-state');
 return copy({version:1,water:saved.water,prune:saved.prune,lease:l||null,receipts:saved.receipts.slice(-128)});
}

export function createFranceGardenerMaintenance({saved,legacy,getClock=()=>({day:0}),saveState=()=>{},targetIds,canReserve=()=>null}={}){
 let current,loadError=null,saving=false;
 try{current=restored(saved,targetIds);}catch{current=restored(null,targetIds);loadError='invalid-saved-state';}
 const today=()=>{const day=getClock()?.day;return integer(day)?day:0;};
 // Pre-maintenance scene snapshots still know which actions already ended.
 // Carry those completions forward without restarting the observed work.
 if(saved==null&&legacy?.version===1){
  const s=legacy.stage,rested=['idle','rest','garden','meeting'].includes(s)&&legacy.cycles>0;
  if(rested||['returnCan','putCan','takeShears','hedge','prune','returnShears','putShears'].includes(s)){current.water.completedBeds=2;current.water.wateredMask=3;current.water.completedDay=today();}
  else if(['bedB','waterB'].includes(s)){current.water.completedBeds=1;current.water.wateredMask=1;}
  if(rested||['returnShears','putShears'].includes(s)){current.prune.pruned=true;current.prune.completedDay=today();}
 }
 function persist(next){
  if(loadError||saving)return false;saving=true;
  try{const result=saveState(copy(next));if(result===false)return false;if(result&&typeof result.then==='function'){Promise.resolve(result).catch(()=>{});return false;}current=next;return true;}catch{return false;}finally{saving=false;}
 }
 function refresh(){
  if(loadError)return false;const day=today(),due=kinds.filter(kind=>current[kind].completedDay!==null&&current[kind].completedDay<day&&current.lease?.kind!==kind);
  if(!due.length)return true;
  if(due.some(kind=>current[kind].number===Number.MAX_SAFE_INTEGER))return false;
  const next=copy(current);for(const kind of due)next[kind]=fresh(kind,next[kind].number+1);return persist(next);
 }
 const state=()=>({...copy(current),loadError});
 function choices(owner){
  const ready=refresh();return kinds.map(kind=>{const t=current[kind],l=current.lease;
   const reason=loadError?'园圃维护记录暂时无法读取':!ready?'园圃维护记录暂时无法保存':l&&l.owner!==owner?'原工具已留给另一份园艺工作':l&&l.kind!==kind?'先把手上的园艺工具归还':
    complete(t)?'今日这处已经照料过，下一模拟日再做':canReserve(owner)||null;
   return {kind,available:!reason,reason,taskId:t.id,label:kind==='water'?'浇灌原两畦玫瑰':'修整原黄杨篱'};
  });
 }
 function reserve(owner,kind,day=today()){
  if(typeof owner!=='string'||!owner||!kinds.includes(kind)||!integer(day))return false;
  if(current.lease)return !loadError&&current.lease.owner===owner&&current.lease.kind===kind;
  if(day!==today()||!choices(owner).find(t=>t.kind===kind)?.available)return false;
  return persist({...copy(current),lease:{owner,kind,taskId:current[kind].id,day,borrowed:false}});
 }
 function take(owner){const l=current.lease;if(loadError||l?.owner!==owner)return false;if(l.borrowed)return true;return persist({...copy(current),lease:{...l,borrowed:true}});}
 function step(owner){
  const l=current.lease;if(loadError||l?.owner!==owner||!l.borrowed)return false;
  const t=current[l.kind];if(complete(t))return true;const next=copy(current),task=next[l.kind];
  if(l.kind==='water'){task.wateredMask|=task.wateredMask&1?2:1;task.completedBeds++;}else task.pruned=true;
  if(complete(task))task.completedDay=today();return persist(next);
 }
 function put(owner){
  const l=current.lease;if(loadError||l?.owner!==owner||!l.borrowed)return false;
  const next=copy(current),t=next[l.kind];next.lease=null;
  if(complete(t)&&!next.receipts.some(r=>r.id===t.id))next.receipts.push({id:t.id,number:t.number,kind:t.kind,workReceiptId:owner,day:l.day,targetIds:copy(targetIds[l.kind]),completed:true,returned:true});
  next.receipts=next.receipts.slice(-128);
  return persist(next);
 }
 function release(owner){const l=current.lease;if(loadError||l?.owner!==owner||l.borrowed)return false;return persist({...copy(current),lease:null});}
 function mark(kind,index){
  if(!refresh()||current.lease||!kinds.includes(kind))return false;const t=current[kind];
  if(kind==='water'&&(!integer(index)||index>1))return false;
  if(complete(t))return true;
  if(kind==='water'&&(t.wateredMask&(1<<index)))return true;
  const next=copy(current),task=next[kind];if(kind==='water'){task.wateredMask|=1<<index;task.completedBeds++;}else task.pruned=true;
  if(complete(task))task.completedDay=today();return persist(next);
 }
 return {state,snapshot:()=>copy(loadError?saved:current),lease:()=>copy(current.lease),task:kind=>copy(current[kind]),refresh,choices,reserve,take,step,put,release,mark,
  pending:kind=>!loadError&&!complete(current[kind]),receipts:owner=>copy(current.receipts.filter(r=>r.workReceiptId===owner))};
}
