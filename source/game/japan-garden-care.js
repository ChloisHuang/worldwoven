import {validJapanGardenReceipt} from './japan-garden-role.js';
const copy=structuredClone,HOST='jp-garden-onsen',ID='jp-garden-pond-1',STAGES=['observe','plants','wipe','verify'];
const integer=n=>Number.isSafeInteger(n)&&n>=0,work=id=>typeof id==='string'&&/^jp-garden-labor-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.split('-').at(-1)));
// A single physical pond, a monotonic day watermark, and one unfinished round.
// The source is the loaded game calendar, never real time or an invented visit.
export function createJapanGardenCare({saved=null,saveState=()=>true}={}){
 let state={version:1,revision:0,lastOpenedDay:null,item:{id:ID,cycle:0,day:null,stage:'clean',owner:null,workReceiptId:null,steps:[]},receipts:[],duty:null},loadError=null,invalid=null,saving=false;
 function valid(s){
  if(!s||s.version!==1||!integer(s.revision)||!(s.lastOpenedDay===null||integer(s.lastOpenedDay))||!Array.isArray(s.receipts)||s.duty&&(!work(s.duty.receiptId)||!['active','paused'].includes(s.duty.status)))return false;
  const x=s.item;if(!x||x.id!==ID||!integer(x.cycle)||!['clean',...STAGES].includes(x.stage)||![null,HOST,'player'].includes(x.owner)||!Array.isArray(x.steps)||x.steps.length!==(STAGES.includes(x.stage)?STAGES.indexOf(x.stage):0))return false;
  if(x.cycle===0?(x.day!==null||s.lastOpenedDay!==null||x.stage!=='clean'):!integer(x.day)||x.day!==s.lastOpenedDay||x.cycle>x.day+1)return false;
  if(['clean','observe'].includes(x.stage)&&x.owner!==null||x.owner==='player'&&(!s.duty||x.workReceiptId!==s.duty.receiptId)||x.owner!=='player'&&x.workReceiptId!==null)return false;
  if(x.steps.some((v,j)=>!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==3||v.stage!==STAGES[j]||![HOST,'player'].includes(v.actorId)||(v.actorId==='player'?!work(v.receiptId):v.receiptId!==null)))return false;
  const cycles=new Set(),days=new Set();for(const r of s.receipts){if(!validJapanGardenReceipt(r)||r.cycle>x.cycle||r.day>x.day||r.cycle===x.cycle&&(x.stage!=='clean'||r.day!==x.day)||cycles.has(r.cycle)||days.has(r.day))return false;cycles.add(r.cycle);days.add(r.day);}return true;
 }
 function restore(s,{preserveDuty=false}={}){if(!valid(s))return false;state=copy(s);if(!preserveDuty&&state.duty)state.duty.status='paused';loadError=null;return true;}
 if(saved!=null&&!restore(saved)){loadError='invalid-garden-care';invalid=copy(saved);}
 function commit(change){if(loadError||saving)return false;const next=copy(state);try{if(change(next)===false)return false;next.revision++;if(!valid(next))return false;saving=true;const r=saveState(copy(next));if(r===false||r?.ok===false||r?.then)return false;state=next;return true;}catch{return false;}finally{saving=false;}}
 function observeDay(day,hour){if(!integer(day)||!Number.isFinite(hour)||hour<6||hour>=18||state.item.stage!=='clean'||state.lastOpenedDay!==null&&day<=state.lastOpenedDay||state.item.cycle===Number.MAX_SAFE_INTEGER)return false;return commit(s=>{s.lastOpenedDay=day;s.item={id:ID,cycle:s.item.cycle+1,day,stage:'observe',owner:null,workReceiptId:null,steps:[]};});}
 function advance(id,stage,actor,{receiptId=null,cycle,day}={}){const x=state.item;
  if(id!==ID||x.cycle!==cycle||x.day!==day||x.stage!==stage||!STAGES.includes(stage)||x.owner&&x.owner!==actor)return false;
  if(actor===HOST){if(state.duty?.status==='active')return false;}else if(actor!=='player'||state.duty?.status!=='active'||state.duty.receiptId!==receiptId||x.owner&&x.workReceiptId!==receiptId)return false;
  return commit(s=>{const n=s.item;n.steps.push({stage,actorId:actor,receiptId:actor==='player'?receiptId:null});n.stage=STAGES[STAGES.indexOf(stage)+1]||'clean';n.owner=n.stage==='clean'?null:actor;n.workReceiptId=n.owner==='player'?receiptId:null;
   if(n.stage==='clean'){if(actor==='player'&&n.steps.every(t=>t.actorId==='player'&&t.receiptId===receiptId))s.receipts.push({source:'japan-garden',id:`${ID}-cycle-${cycle}-${receiptId}`,itemId:ID,cycle,day,workReceiptId:receiptId,completed:true,accurate:true,outcome:'completed'});n.steps=[];}
  });
 }
 function claimDuty(receiptId){if(!work(receiptId)||state.duty&&state.duty.receiptId!==receiptId||state.item.owner===HOST)return false;return commit(s=>{s.duty={receiptId,status:'active'};});}
 function pauseDuty(receiptId){if(state.duty?.receiptId!==receiptId)return false;return commit(s=>{s.duty.status='paused';});}
 function releaseDuty(receiptId){if(!state.duty)return true;if(state.duty.receiptId!==receiptId)return false;return commit(s=>{if(s.item.owner==='player'){s.item.owner=null;s.item.workReceiptId=null;}s.duty=null;});}
 const releaseNPC=()=>state.item.owner!==HOST||commit(s=>{s.item.owner=null;});
 return {observeDay,advance,releaseNPC,claimDuty,pauseDuty,releaseDuty,restore,state:()=>({...copy(state),loadError}),snapshot:()=>copy(loadError?invalid:state),duty:()=>copy(state.duty),work:()=>state.item.stage==='clean'?[]:[copy(state.item)],receipts:id=>copy(state.receipts.filter(r=>!id||r.workReceiptId===id))};
}
