import {JAPAN_KOTATSU_ITEM_IDS,validJapanKotatsuReceipt} from './japan-kotatsu-role.js';
const copy=structuredClone,HOST='jp-tea',STAGES=['collect','smooth','wipe','return'],int=n=>Number.isSafeInteger(n)&&n>=0;
const viewer=id=>{if(id==='player')return true;const m=typeof id==='string'&&/^jp-visitor-(0|[1-9][0-9]*)-([1-9][0-9]*)$/.exec(id);return !!m&&Number(m[1])<=0xffffffff&&Number.isSafeInteger(Number(m[2]));};
const work=id=>typeof id==='string'&&/^jp-kotatsu-labor-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.split('-').at(-1)));
// Four authored tables only. Actual visitor seating creates a reset obligation.
// No timer, application, sale, food or synthetic order creates demand.
export function createJapanKotatsuCare({saved=null,saveState=()=>true}={}){
 let state={version:1,revision:0,nextItem:0,items:JAPAN_KOTATSU_ITEM_IDS.map(id=>({id,cycle:0,stage:'clean',owner:null,workReceiptId:null,steps:[],viewerId:null})),seenVisits:[],receipts:[],duty:null},loadError=null,invalid=null,saving=false;
 function valid(s){
  if(!s||s.version!==1||!int(s.revision)||!int(s.nextItem)||s.nextItem>=4||!Array.isArray(s.items)||s.items.length!==4||!Array.isArray(s.receipts)||!Array.isArray(s.seenVisits)||new Set(s.seenVisits).size!==s.seenVisits.length||s.seenVisits.some(id=>id==='player'||!viewer(id))||s.duty&&(!work(s.duty.receiptId)||!['active','paused'].includes(s.duty.status)))return false;
  if(s.items.filter(x=>x.owner==='player').length>1||s.items.filter(x=>x.owner===HOST).length>1)return false;
  for(const [i,x] of s.items.entries()){
   if(x.id!==JAPAN_KOTATSU_ITEM_IDS[i]||!int(x.cycle)||!['clean','resting',...STAGES].includes(x.stage)||![null,HOST,'player'].includes(x.owner)||!Array.isArray(x.steps)||x.steps.length!==(STAGES.includes(x.stage)?STAGES.indexOf(x.stage):0))return false;
   if(x.cycle===0&&x.viewerId!==null||x.cycle>0&&!viewer(x.viewerId)||x.viewerId&&x.viewerId!=='player'&&!s.seenVisits.includes(x.viewerId))return false;
   if(x.cycle===0&&x.stage!=='clean'||['clean','resting','collect'].includes(x.stage)&&x.owner!==null||x.owner==='player'&&(!s.duty||x.workReceiptId!==s.duty.receiptId)||x.owner!=='player'&&x.workReceiptId!==null)return false;
   if(x.steps.some((v,j)=>v.stage!==STAGES[j]||![HOST,'player'].includes(v.actorId)||(v.actorId==='player'?!work(v.receiptId):v.receiptId!==null)))return false;
  }
  const seen=new Set();for(const r of s.receipts){const x=s.items.find(x=>x.id===r.itemId);const k=r.itemId+':'+r.cycle;if(!validJapanKotatsuReceipt(r)||!x||r.cycle>x.cycle||r.cycle===x.cycle&&x.stage!=='clean'||seen.has(k))return false;seen.add(k);}return true;
 }
 function restore(s,{preserveDuty=false}={}){if(!valid(s))return false;state=copy(s);if(!preserveDuty){if(state.duty)state.duty.status='paused';}loadError=null;return true;}
 if(saved!=null&&!restore(saved)){loadError='invalid-kotatsu-care';invalid=copy(saved);}
 function commit(change){if(loadError||saving)return false;const next=copy(state);try{if(change(next)===false)return false;next.revision++;if(!valid(next))return false;saving=true;const r=saveState(copy(next));if(r===false||r?.ok===false||r?.then)return false;state=next;return true;}catch{return false;}finally{saving=false;}}
 const item=id=>state.items.find(x=>x.id===id),authorized=(actor,id)=>actor===HOST?state.duty?.status!=='active':actor==='player'&&state.duty?.status==='active'&&state.duty.receiptId===id;
 function beginRest(itemId,viewerId){if(viewerId==='player'||!viewer(viewerId)||state.seenVisits.includes(viewerId))return false;return commit(s=>{const x=s.items.find(x=>x.id===itemId);if(!x||x.stage!=='clean'||x.cycle>=Number.MAX_SAFE_INTEGER)return false;x.cycle++;x.stage='resting';x.viewerId=viewerId;s.seenVisits.push(viewerId);});}
 const endRest=(viewerId='player')=>state.items.some(x=>x.stage==='resting'&&x.viewerId===viewerId)&&commit(s=>{s.items.find(x=>x.stage==='resting'&&x.viewerId===viewerId).stage='collect';});
 function advance(id,stage,actor,{receiptId=null,cycle}={}){const x=item(id);if(!x||x.cycle!==cycle||x.stage!==stage||!STAGES.includes(stage)||!authorized(actor,receiptId)||x.owner&&x.owner!==actor||state.items.some(y=>y!==x&&y.owner===actor)||actor==='player'&&x.owner&&x.workReceiptId!==receiptId)return false;
  return commit(s=>{const n=s.items.find(y=>y.id===id);n.steps.push({stage,actorId:actor,receiptId:actor==='player'?receiptId:null});n.stage=STAGES[STAGES.indexOf(stage)+1]||'clean';n.owner=n.stage==='clean'?null:actor;n.workReceiptId=n.owner==='player'?receiptId:null;
   if(n.stage==='clean'){if(actor==='player'&&n.steps.every(t=>t.actorId==='player'&&t.receiptId===receiptId))s.receipts.push({source:'japan-kotatsu',id:`${id}-cycle-${cycle}-${receiptId}`,itemId:id,cycle,workReceiptId:receiptId,completed:true,accurate:true,outcome:'completed'});n.steps=[];}
  });
 }
 function claimDuty(receiptId){if(!work(receiptId)||state.duty&&state.duty.receiptId!==receiptId||state.items.some(x=>x.owner===HOST))return false;return commit(s=>{s.duty={receiptId,status:'active'};});}
 function pauseDuty(receiptId){if(state.duty?.receiptId!==receiptId)return false;return commit(s=>{s.duty.status='paused';});}
 function releaseDuty(receiptId){if(!state.duty)return true;if(state.duty.receiptId!==receiptId)return false;return commit(s=>{for(const x of s.items)if(x.owner==='player'){x.owner=null;x.workReceiptId=null;}s.duty=null;});}
 const skipVisitor=id=>id!=='player'&&viewer(id)&&(state.seenVisits.includes(id)||commit(s=>{s.seenVisits.push(id);}));
 return {beginRest,endRest,skipVisitor,advance,claimDuty,pauseDuty,releaseDuty,restore,state:()=>({...copy(state),loadError}),snapshot:()=>copy(loadError?invalid:state),duty:()=>copy(state.duty),work:()=>copy(state.items.filter(x=>STAGES.includes(x.stage))),receipts:id=>copy(state.receipts.filter(r=>!id||r.workReceiptId===id))};
}
