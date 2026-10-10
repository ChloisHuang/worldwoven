import {validFranceBedchamberReceipt} from './france-bedchamber-role.js';
const copy=structuredClone,HOST='france-bedroom',BED='france-furniture-bed-0',ITEM='france-bed-linen';
export const FRANCE_BEDCHAMBER_STAGES=Object.freeze(['inspect','smooth','pillowWest','pillowEast','fold','verify']);
const stages=FRANCE_BEDCHAMBER_STAGES,integer=n=>Number.isSafeInteger(n)&&n>=0;
const work=id=>typeof id==='string'&&/^fr-bedchamber-labor-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.split('-').at(-1)));
const use=id=>typeof id==='string'&&/^france-bed-use-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.split('-').at(-1)));
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
// These identities name the existing installed cover/pillows. They are not
// clean stock, sales or consumable supplies. Only observed mounted rest and
// actual departure create care. No timer/day/offline refresh creates work.
export function createFranceBedchamberCare({saved=null,saveState=()=>true}={}){
 let state={version:1,revision:0,useSerial:0,users:{},item:{id:ITEM,bedId:BED,cycle:0,useId:null,stage:'clean',owner:null,workReceiptId:null,steps:[]},receipts:[],duty:null},loadError=null,invalid=null,saving=false;
 function valid(s){
  if(!object(s)||s.version!==1||!integer(s.revision)||!integer(s.useSerial)||!object(s.users)||!Array.isArray(s.receipts))return false;
  const users=Object.entries(s.users);if(users.length>2||users.some(([id,u])=>!id||!object(u)||!use(u.id)||Number(u.id.split('-').at(-1))>s.useSerial||!Number.isFinite(u.elapsed)||u.elapsed<0||u.elapsed>10||typeof u.used!=='boolean'||u.used!==(u.elapsed===10))||new Set(users.map(([,u])=>u.id)).size!==users.length)return false;
  if(s.duty!==null&&(!object(s.duty)||!work(s.duty.receiptId)||!['active','paused'].includes(s.duty.status)))return false;
  const x=s.item;if(!object(x)||x.id!==ITEM||x.bedId!==BED||!integer(x.cycle)||x.cycle>s.useSerial||!['clean',...stages].includes(x.stage)||![null,HOST,'player'].includes(x.owner)||!Array.isArray(x.steps)||x.steps.length!==(stages.includes(x.stage)?stages.indexOf(x.stage):0))return false;
  if(x.cycle===0?x.useId!==null||x.stage!=='clean':!use(x.useId)||Number(x.useId.split('-').at(-1))>s.useSerial)return false;
  if(['clean','inspect'].includes(x.stage)&&x.owner!==null||x.owner==='player'&&(!s.duty||x.workReceiptId!==s.duty.receiptId)||x.owner!=='player'&&x.workReceiptId!==null)return false;
  if(x.steps.some((v,i)=>!object(v)||v.stage!==stages[i]||![HOST,'player'].includes(v.actorId)||(v.actorId==='player'?!work(v.receiptId):v.receiptId!==null)))return false;
  const last=x.steps.at(-1);if(x.owner!==null&&(!last||last.actorId!==x.owner||x.owner==='player'&&last.receiptId!==x.workReceiptId))return false;
  const departedUses=new Set();let previous=0;for(const r of s.receipts){if(!validFranceBedchamberReceipt(r)||departedUses.has(r.useId)||r.cycle<=previous||r.cycle>x.cycle||Number(r.useId.split('-').at(-1))>s.useSerial||r.cycle===x.cycle&&(x.stage!=='clean'||r.useId!==x.useId)||r.cycle<x.cycle&&r.useId===x.useId)return false;previous=r.cycle;departedUses.add(r.useId);}
  // One actual departure cannot justify two care cycles across shifts. An
  // occupied use cannot already be a departed source. Two berths can leave
  // in either order, so identity uniqueness, not numeric sorting, is required.
  if(x.useId)departedUses.add(x.useId);if(users.some(([,u])=>departedUses.has(u.id)))return false;
  return true;
 }
 function restore(s,{preserveDuty=false}={}){if(saving||!valid(s))return false;state=copy(s);if(!preserveDuty&&state.duty)state.duty.status='paused';invalid=null;loadError=null;return true;}
 if(saved!=null&&!restore(saved)){invalid=copy(saved);loadError='invalid-bedchamber-care';}
 function commit(change){if(loadError||saving||state.revision===Number.MAX_SAFE_INTEGER)return false;try{const next=copy(state);if(change(next)===false)return false;next.revision++;if(!valid(next))return false;saving=true;const result=saveState(copy(next));if(result===false||result?.ok===false||result?.then)return false;state=next;return true;}catch{return false;}finally{saving=false;}}
 function observeUsers(ids,dt=0){
  if(loadError||saving||!Array.isArray(ids)||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id))return false;
  // A rejected leave is retained and retried. No receipt is emitted until the
  // true new use/cycle and the complete physical work are durably saved.
  for(const id of Object.keys(state.users))if(!ids.includes(id)){const u=state.users[id];if(!commit(s=>{delete s.users[id];if(u.used){if(s.item.cycle===Number.MAX_SAFE_INTEGER)return false;s.item={id:ITEM,bedId:BED,cycle:s.item.cycle+1,useId:u.id,stage:'inspect',owner:null,workReceiptId:null,steps:[]};}}))return false;}
  for(const id of ids)if(!state.users[id]){if(state.useSerial===Number.MAX_SAFE_INTEGER||!commit(s=>{s.users[id]={id:`france-bed-use-${++s.useSerial}`,elapsed:0,used:false};}))return false;}
  for(const id of ids){const u=state.users[id];if(u.used)continue;const elapsed=Math.min(10,u.elapsed+Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0)));if(elapsed>=10){if(!commit(s=>{s.users[id].elapsed=10;s.users[id].used=true;}))return false;}else u.elapsed=elapsed;}
  return true;
 }
 function advance(stage,actor,{receiptId=null,cycle,useId}={}){
  const x=state.item;if(Object.keys(state.users).length||x.stage!==stage||x.cycle!==cycle||x.useId!==useId||!stages.includes(stage)||x.owner&&x.owner!==actor)return false;
  if(actor===HOST){if(state.duty?.status==='active')return false;}else if(actor!=='player'||state.duty?.status!=='active'||state.duty.receiptId!==receiptId||x.owner&&x.workReceiptId!==receiptId)return false;
  return commit(s=>{const n=s.item;n.steps.push({stage,actorId:actor,receiptId:actor==='player'?receiptId:null});n.stage=stages[stages.indexOf(stage)+1]||'clean';n.owner=n.stage==='clean'?null:actor;n.workReceiptId=n.owner==='player'?receiptId:null;if(n.stage==='clean'){if(actor==='player'&&n.steps.every(t=>t.actorId==='player'&&t.receiptId===receiptId))s.receipts.push({source:'france-bedchamber',id:`${ITEM}-cycle-${cycle}-${receiptId}`,itemId:ITEM,bedId:BED,cycle,useId,workReceiptId:receiptId,completed:true,accurate:true,outcome:'completed'});n.steps=[];}});
 }
 function claimDuty(receiptId){if(!work(receiptId)||state.duty&&state.duty.receiptId!==receiptId||state.item.owner===HOST)return false;return commit(s=>{s.duty={receiptId,status:'active'};});}
 function holdDuty(receiptId){if(!work(receiptId)||state.duty&&state.duty.receiptId!==receiptId)return false;return commit(s=>{s.duty={receiptId,status:'paused'};});}
 function pauseDuty(receiptId){if(state.duty?.receiptId!==receiptId)return false;return commit(s=>{s.duty.status='paused';});}
 function releaseDuty(receiptId){if(loadError||saving)return false;if(!state.duty)return true;if(state.duty.receiptId!==receiptId)return false;return commit(s=>{if(s.item.owner==='player'){s.item.owner=null;s.item.workReceiptId=null;}s.duty=null;});}
 const releaseNPC=()=>!loadError&&!saving&&(state.item.owner!==HOST||commit(s=>{s.item.owner=null;}));
 return {observeUsers,advance,claimDuty,holdDuty,pauseDuty,releaseDuty,releaseNPC,restore,state:()=>({...copy(state),loadError}),snapshot:()=>copy(loadError?invalid:state),work:()=>loadError||state.item.stage==='clean'?null:copy(state.item),receipts:id=>loadError?[]:copy(state.receipts.filter(r=>!id||r.workReceiptId===id)),duty:()=>copy(state.duty)};
}
