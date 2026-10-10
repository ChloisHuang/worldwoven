import {validJapanBalconyReceipt} from './japan-balcony-role.js';
const copy=structuredClone,HOST='jp-balcony',ID='jp-balcony-gallery-1',STAGES=['lanterns','walkway','wipe','verify'];
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const work=id=>typeof id==='string'&&/^jp-balcony-labor-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.split('-').at(-1)));
const shape=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
// One authored public gallery. The game calendar opens at most one care round
// per observed day, with no offline backfill. "clean" only means no pending care;
// no care stage closes the walkway or changes the original gallery's availability.
export function createJapanBalconyCare({saved=null,saveState=()=>true}={}){
 let state={version:1,revision:0,lastOpenedDay:null,item:{id:ID,cycle:0,day:null,stage:'clean',owner:null,workReceiptId:null,steps:[]},receipts:[],duty:null},loadError=null,invalid=null,saving=false;
 function valid(s){
  if(!shape(s,['version','revision','lastOpenedDay','item','receipts','duty'])||s.version!==1||!integer(s.revision)||!(s.lastOpenedDay===null||integer(s.lastOpenedDay))||!Array.isArray(s.receipts))return false;
  if(s.duty!==null&&(!shape(s.duty,['receiptId','status'])||!work(s.duty.receiptId)||!['active','paused'].includes(s.duty.status)))return false;
  const x=s.item;
  if(!shape(x,['id','cycle','day','stage','owner','workReceiptId','steps'])||x.id!==ID||!integer(x.cycle)||!['clean',...STAGES].includes(x.stage)||![null,HOST,'player'].includes(x.owner)||!Array.isArray(x.steps)||x.steps.length!==(STAGES.includes(x.stage)?STAGES.indexOf(x.stage):0))return false;
  if(x.cycle===0?(x.day!==null||s.lastOpenedDay!==null||x.stage!=='clean'):!integer(x.day)||x.day!==s.lastOpenedDay||x.cycle-1>x.day)return false;
  if(['clean','lanterns'].includes(x.stage)&&x.owner!==null||x.owner==='player'&&(!s.duty||x.workReceiptId!==s.duty.receiptId)||x.owner!=='player'&&x.workReceiptId!==null)return false;
  if(x.steps.some((v,j)=>!shape(v,['stage','actorId','receiptId'])||v.stage!==STAGES[j]||![HOST,'player'].includes(v.actorId)||(v.actorId==='player'?!work(v.receiptId):v.receiptId!==null)))return false;
  const last=x.steps.at(-1);
  if(x.owner!==null&&(!last||last.actorId!==x.owner||x.owner==='player'&&last.receiptId!==x.workReceiptId))return false;
  let priorCycle=0,priorDay=-1;
  for(const r of s.receipts){
   if(!validJapanBalconyReceipt(r)||r.cycle-1>r.day||r.cycle>x.cycle||r.day>x.day||r.cycle<=priorCycle||r.day<=priorDay||r.cycle===x.cycle&&(x.stage!=='clean'||r.day!==x.day)||r.cycle<x.cycle&&r.day>=x.day)return false;
   priorCycle=r.cycle;priorDay=r.day;
  }
  return true;
 }
 function restore(s,{preserveDuty=false}={}){if(saving||!valid(s))return false;state=copy(s);if(!preserveDuty&&state.duty)state.duty.status='paused';loadError=null;invalid=null;return true;}
 if(saved!=null&&!restore(saved)){loadError='invalid-balcony-care';invalid=copy(saved);}
 function commit(change){
  if(loadError||saving||state.revision===Number.MAX_SAFE_INTEGER)return false;
  const next=copy(state);
  try{if(change(next)===false)return false;next.revision++;if(!valid(next))return false;saving=true;const result=saveState(copy(next));if(result===false||result?.ok===false||result?.then)return false;state=next;return true;}catch{return false;}finally{saving=false;}
 }
 function observeDay(day,hour){
  if(!integer(day)||!Number.isFinite(hour)||hour<6||hour>=18||state.item.stage!=='clean'||state.lastOpenedDay!==null&&day<=state.lastOpenedDay||state.item.cycle===Number.MAX_SAFE_INTEGER)return false;
  return commit(s=>{s.lastOpenedDay=day;s.item={id:ID,cycle:s.item.cycle+1,day,stage:'lanterns',owner:null,workReceiptId:null,steps:[]};});
 }
 function advance(id,stage,actor,{receiptId=null,cycle,day}={}){
  const x=state.item;
  if(id!==ID||x.cycle!==cycle||x.day!==day||x.stage!==stage||!STAGES.includes(stage)||x.owner&&x.owner!==actor)return false;
  if(actor===HOST){if(state.duty?.status==='active')return false;}else if(actor!=='player'||state.duty?.status!=='active'||state.duty.receiptId!==receiptId||x.owner&&x.workReceiptId!==receiptId)return false;
  return commit(s=>{const n=s.item;n.steps.push({stage,actorId:actor,receiptId:actor==='player'?receiptId:null});n.stage=STAGES[STAGES.indexOf(stage)+1]||'clean';n.owner=n.stage==='clean'?null:actor;n.workReceiptId=n.owner==='player'?receiptId:null;
   if(n.stage==='clean'){
    if(actor==='player'&&n.steps.every(t=>t.actorId==='player'&&t.receiptId===receiptId))s.receipts.push({source:'japan-balcony',id:`${ID}-cycle-${cycle}-${receiptId}`,itemId:ID,cycle,day,workReceiptId:receiptId,completed:true,accurate:true,outcome:'completed'});
    n.steps=[];
   }
  });
 }
 function claimDuty(receiptId){if(!work(receiptId)||state.duty&&state.duty.receiptId!==receiptId||state.item.owner===HOST)return false;return commit(s=>{s.duty={receiptId,status:'active'};});}
 function pauseDuty(receiptId){if(state.duty?.receiptId!==receiptId)return false;return commit(s=>{s.duty.status='paused';});}
 function releaseDuty(receiptId){if(loadError||saving)return false;if(!state.duty)return true;if(state.duty.receiptId!==receiptId)return false;return commit(s=>{if(s.item.owner==='player'){s.item.owner=null;s.item.workReceiptId=null;}s.duty=null;});}
 const releaseNPC=()=>!loadError&&!saving&&(state.item.owner!==HOST||commit(s=>{s.item.owner=null;}));
 return {observeDay,advance,releaseNPC,claimDuty,pauseDuty,releaseDuty,restore,state:()=>({...copy(state),loadError}),snapshot:()=>copy(loadError?invalid:state),duty:()=>copy(state.duty),work:()=>loadError||state.item.stage==='clean'?[]:[copy(state.item)],receipts:id=>loadError?[]:copy(state.receipts.filter(r=>!id||r.workReceiptId===id))};
}
