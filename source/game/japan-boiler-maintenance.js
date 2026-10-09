// Nagi's ordinary bathhouse work: each actual bath admission contributes once.
// This ledger owns identity and order only; the duty controller owns route/time.
export const JAPAN_BOILER_STAGES=Object.freeze(['read','adjust','return','verify']);
export const JAPAN_BOILER_POOLS=Object.freeze({men:'japan-furniture-bath-1',women:'japan-furniture-bath-2'});
const HOST='jp-steam',copy=x=>JSON.parse(JSON.stringify(x)),object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const integer=x=>Number.isSafeInteger(x)&&x>0;
const numbered=(value,prefix)=>typeof value==='string'&&new RegExp(`^${prefix}([1-9][0-9]*)$`).test(value)&&integer(Number(value.slice(prefix.length)));
const validWork=id=>numbered(id,'jp-boiler-labor-'),validBatch=id=>numbered(id,'jp-boiler-batch-');
const validVisit=id=>{const m=typeof id==='string'&&/^jp-(?:visitor|player-service)-(0|[1-9][0-9]*)-([1-9][0-9]*)$/.exec(id);return !!m&&Number(m[1])<=0xffffffff&&integer(Number(m[2]));};
const sideOf=pool=>Object.keys(JAPAN_BOILER_POOLS).find(side=>JAPAN_BOILER_POOLS[side]===pool);
const validName=name=>typeof name==='string'&&name.length>0&&name.length<=80;
const key=(visit,pool)=>`${visit}:${pool}`;
const nextStage=stage=>JAPAN_BOILER_STAGES[JAPAN_BOILER_STAGES.indexOf(stage)+1]||'completed';
export const JAPAN_BOILER_RECEIPT_FIELDS=Object.freeze(['source','id','workReceiptId','batchId','poolId','side','visitIds','customerNames','loadCount','completed','accurate','outcome']);
export function validJapanBoilerReceipt(r){
 return object(r)&&Object.keys(r).length===JAPAN_BOILER_RECEIPT_FIELDS.length&&JAPAN_BOILER_RECEIPT_FIELDS.every(field=>Object.hasOwn(r,field))&&r.source==='japan-boiler'&&validBatch(r.batchId)&&validWork(r.workReceiptId)&&r.id===`${r.batchId}-${r.workReceiptId}`&&sideOf(r.poolId)===r.side&&!!r.side&&
  Array.isArray(r.visitIds)&&r.visitIds.length>0&&r.visitIds.every(validVisit)&&new Set(r.visitIds).size===r.visitIds.length&&Array.isArray(r.customerNames)&&r.customerNames.length===r.visitIds.length&&r.customerNames.every(validName)&&r.loadCount===r.visitIds.length&&r.completed===true&&r.accurate===true&&r.outcome==='completed';
}
export const sameJapanBoilerReceipt=(a,b)=>JAPAN_BOILER_RECEIPT_FIELDS.every(field=>JSON.stringify(a?.[field])===JSON.stringify(b?.[field]));
export function createJapanBoilerMaintenance({saved=null,saveState=()=>true}={}){
 let data={version:1,nextBatch:1,seen:[],batches:[],receipts:[],duty:null};
 const batch=id=>data.batches.find(b=>b.id===id);
 const authorized=(actor,evidence)=>actor===HOST?!data.duty||data.duty.status!=='active':actor==='player'&&data.duty?.status==='active'&&validWork(evidence.receiptId)&&data.duty.receiptId===evidence.receiptId;
 const available=b=>b.stage!=='completed'&&(b.frozen||!data.batches.some(other=>other.poolId===b.poolId&&other.frozen&&other.stage!=='completed'));
 const owns=(b,actor,e)=>!b.owner||b.owner===actor&&(actor!== 'player'||b.workReceiptId===e.receiptId);
 function begin(id,stage,actor,evidence={}){
  const b=batch(id);if(!b||b.stage!==stage||!JAPAN_BOILER_STAGES.includes(stage)||!available(b)||!authorized(actor,evidence)||!owns(b,actor,evidence))return false;
  b.frozen=true;b.owner=actor;b.workReceiptId=actor==='player'?evidence.receiptId:null;return true;
 }
 function advance(id,stage,actor,evidence={}){
  const b=batch(id);if(!b||b.stage!==stage||evidence.nextStage!==nextStage(stage)||!JAPAN_BOILER_STAGES.includes(stage)||!available(b)||!authorized(actor,evidence)||!owns(b,actor,evidence))return false;
  // begin() is called at the physical read start; advance also supports atomic callers.
  if(!begin(id,stage,actor,evidence))return false;
  b.steps.push({stage,actorId:actor,receiptId:actor==='player'?evidence.receiptId:null});b.stage=evidence.nextStage;
  if(b.stage==='completed'){
   if(actor==='player'&&b.steps.every(step=>step.actorId==='player'&&step.receiptId===evidence.receiptId))data.receipts.push({source:'japan-boiler',id:`${b.id}-${evidence.receiptId}`,workReceiptId:evidence.receiptId,batchId:b.id,poolId:b.poolId,side:b.side,visitIds:b.visitIds.slice(),customerNames:b.customerNames.slice(),loadCount:b.visitIds.length,completed:true,accurate:true,outcome:'completed'});
   b.owner=null;b.workReceiptId=null;
  }
  return true;
 }
 function observeBath(event){
  if(!object(event)||!validVisit(event.visitId)||!sideOf(event.poolId)||!validName(event.customerName))return false;
  const k=key(event.visitId,event.poolId);if(data.seen.includes(k))return false;
  let b=data.batches.find(x=>x.poolId===event.poolId&&!x.frozen&&x.stage==='read');
  if(!b){if(!integer(data.nextBatch)||data.nextBatch===Number.MAX_SAFE_INTEGER)return false;b={id:`jp-boiler-batch-${data.nextBatch++}`,poolId:event.poolId,side:sideOf(event.poolId),stage:'read',frozen:false,steps:[],visitIds:[],customerNames:[],owner:null,workReceiptId:null};data.batches.push(b);}
  b.visitIds.push(event.visitId);b.customerNames.push(event.customerName);data.seen.push(k);return true;
 }
 const releaseOwners=()=>{for(const b of data.batches)if(b.owner==='player'){b.owner=null;b.workReceiptId=null;}};
 function claimDuty(receiptId){if(!validWork(receiptId)||data.duty&&data.duty.receiptId!==receiptId||data.batches.some(b=>b.owner===HOST))return false;data.duty={receiptId,status:'active'};return true;}
 function pauseDuty(receiptId){if(!data.duty||data.duty.receiptId!==receiptId)return false;releaseOwners();data.duty.status='paused';return true;}
 function releaseDuty(receiptId){if(!data.duty)return true;if(data.duty.receiptId!==receiptId)return false;releaseOwners();data.duty=null;return true;}
 function restore(saved,{preserveDuty=false}={}){
  if(!object(saved)||saved.version!==1||!integer(saved.nextBatch)||!Array.isArray(saved.seen)||!Array.isArray(saved.batches)||!Array.isArray(saved.receipts)||saved.duty!==null&&(!object(saved.duty)||!validWork(saved.duty.receiptId)||!['active','paused'].includes(saved.duty.status)))return false;
  const ids=new Set(),seen=new Set(),pending=new Set(),active=new Set();
  for(const b of saved.batches){
   if(!object(b)||!validBatch(b.id)||ids.has(b.id)||Number(b.id.slice('jp-boiler-batch-'.length))>=saved.nextBatch||!sideOf(b.poolId)||sideOf(b.poolId)!==b.side||![...JAPAN_BOILER_STAGES,'completed'].includes(b.stage)||typeof b.frozen!=='boolean'||!Array.isArray(b.visitIds)||!b.visitIds.length||!Array.isArray(b.customerNames)||b.customerNames.length!==b.visitIds.length||!b.customerNames.every(validName)||!b.visitIds.every(validVisit)||![null,HOST,'player'].includes(b.owner))return false;
   if(!Array.isArray(b.steps)||b.steps.length!==(b.stage==='completed'?4:JAPAN_BOILER_STAGES.indexOf(b.stage))||b.steps.some((step,index)=>!object(step)||step.stage!==JAPAN_BOILER_STAGES[index]||![HOST,'player'].includes(step.actorId)||(step.actorId==='player'?!validWork(step.receiptId):step.receiptId!==null)))return false;
   if(!b.frozen&&(b.stage!=='read'||b.owner!==null)||b.stage==='completed'&&(!b.frozen||b.owner!==null)||b.owner!== 'player'&&b.workReceiptId!==null||b.owner==='player'&&(!b.frozen||saved.duty?.status!=='active'||b.workReceiptId!==saved.duty.receiptId))return false;
   if(b.stage!=='completed'){const bucket=b.frozen?active:pending;if(bucket.has(b.poolId))return false;bucket.add(b.poolId);}
   for(const visit of b.visitIds){const k=key(visit,b.poolId);if(seen.has(k))return false;seen.add(k);}ids.add(b.id);
  }
  if(saved.seen.length!==seen.size||new Set(saved.seen).size!==seen.size||saved.seen.some(k=>!seen.has(k)))return false;
  const receipts=new Set();
  for(const r of saved.receipts){const b=saved.batches.find(b=>b.id===r?.batchId);if(!validJapanBoilerReceipt(r)||receipts.has(r.batchId)||!b||b.stage!=='completed'||r.poolId!==b.poolId||!b.steps.every(step=>step.actorId==='player'&&step.receiptId===r.workReceiptId)||JSON.stringify(r.visitIds)!==JSON.stringify(b.visitIds)||JSON.stringify(r.customerNames)!==JSON.stringify(b.customerNames))return false;receipts.add(r.batchId);}
  for(const b of saved.batches)if(b.stage==='completed'&&b.steps.every(step=>step.actorId==='player'&&step.receiptId===b.steps[0].receiptId)&&!receipts.has(b.id))return false;
  if(saved.duty?.status==='active'&&saved.batches.some(b=>b.owner===HOST))return false;
  // A cold load never grants live player authority or keeps an abandoned tool lock.
  data=copy(saved);if(!preserveDuty){releaseOwners();if(data.duty)data.duty.status='paused';}return true;
 }
 function transact(action,{persist=true}={}){const prior=copy(data);try{if(!action()){data=prior;return false;}if(persist){const result=saveState(copy(data));if(result===false||result&&typeof result.then==='function'){if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});data=prior;return false;}}return true;}catch{data=prior;return false;}}
 function releaseWorker(actorId){if(![HOST,'player'].includes(actorId))return false;for(const b of data.batches)if(b.owner===actorId){b.owner=null;b.workReceiptId=null;}return true;}
 const api={observeBath:(event,options)=>transact(()=>observeBath(event),options),begin:(...args)=>transact(()=>begin(...args)),advance:(...args)=>transact(()=>advance(...args)),claimDuty:id=>transact(()=>claimDuty(id)),pauseDuty:id=>transact(()=>pauseDuty(id)),releaseDuty:id=>transact(()=>releaseDuty(id)),releaseWorker:id=>transact(()=>releaseWorker(id)),duty:()=>copy(data.duty),work:()=>copy(data.batches.filter(available)),receipts:receiptId=>copy(data.receipts.filter(r=>!receiptId||r.workReceiptId===receiptId)),state:()=>copy(data),snapshot:()=>copy(data),restore};
 if(saved)restore(saved);return api;
}
