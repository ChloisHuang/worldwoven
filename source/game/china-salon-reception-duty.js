import {followActorRoute} from './actor-navigation.js';
import {isSociallyHeld} from './npc-social-ownership.js';
import {SALON_RECEPTION_ROLE as ROLE} from './china-salon-reception-role.js';
import {validChinaSalonReceptionReceipt,sameChinaSalonReceptionReceipt} from './china-salon-reception-career-role.js';
const copy=structuredClone;
export const CHINA_SALON_RECEPTION_POINTS=Object.freeze({registry:[24.15,7.815,7.65],home:[24.15,7.815,5.45],rest:[25.5,7.815,5.45]});
const P=CHINA_SALON_RECEPTION_POINTS;
const at=(n,p,r=.25)=>!!n?.root?.position&&Math.abs(n.root.position.y-p[1])<.35&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<=r;
const receiptId=id=>typeof id==='string'&&/^cn-salon-reception-labor-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.split('-').at(-1)));
const fresh=()=>({version:1,status:'inactive',receiptId:null,receipts:[]});
function valid(s){return !!s&&s.version===1&&['inactive','handoff','working','returning'].includes(s.status)&&(s.status==='inactive'?s.receiptId===null:receiptId(s.receiptId))&&Array.isArray(s.receipts)&&s.receipts.every(validChinaSalonReceptionReceipt)&&new Set(s.receipts.map(r=>r.id)).size===s.receipts.length&&new Set(s.receipts.map(r=>r.sessionId)).size===s.receipts.length;}
// The original salon owns all customers, room locks, payments and desk work.
// This adapter owns only the physical one-seat handoff and reviewed work log.
export function createChinaSalonReceptionDuty({salon,slot,getPlayer,getMounted=()=>null,getClock,careers,saved=null,saveState=()=>false,planPath,doors,moveActor,npcs=[],poseContext=()=>({})}={}){
 const host=npcs.find(n=>n.station?.id===ROLE.incumbentId)||salon.receptionist;
 let state=fresh(),error=null,meeting=false,owned=false,disposed=false,routeTarget=null;
 if(saved!=null){if(valid(saved))state=copy(saved);else error='invalid-salon-reception-duty';}
 const initialHolder=slot.state().holderId;
 if(!error&&(state.status==='working'&&initialHolder!=='player'||['inactive','handoff'].includes(state.status)&&initialHolder==='player'))error='salon-reception-duty-slot-mismatch';
 function persist(next,assignment=null){
  if(error||!valid(next))return false;
  const save=patch=>{try{const r=saveState(copy(next),patch);return r!==false&&r?.ok!==false&&!r?.then;}catch{return false;}};
  if(assignment){const plan=slot.prepareAssignment(assignment);if(!plan.ok||!plan.lock())return false;
   try{if(!plan.save(({assignment})=>save({chinaSalonReceptionSlot:assignment}))||!plan.committed())return false;}finally{plan.release();}
  }else if(!save({}))return false;
  state=next;return true;
 }
 const hostFree=()=>host?.alive!==false&&!!host&&!host.serviceMount&&!isSociallyHeld(ROLE.incumbentId)&&!salon.receptionPersonalState?.()?.task;
 const boundary=()=>salon.receptionWorkBoundary?.()===true;
 const inWorkplace=()=>{const p=getPlayer()?.root?.position;return !!p&&Math.abs(p.y-P.home[1])<.35&&p.x>=22&&p.x<=27&&p.z>=4.5&&p.z<=8.4;};
 const acting=()=>salon.receptionPlayerActing?.()===true;
 const active=id=>!disposed&&!error&&state.receiptId===id&&state.status==='working'&&slot.state().holderId==='player'&&inWorkplace()&&!getMounted();
 const meetingReady=()=>!error&&hostFree()&&!host.walking&&at(host,state.status==='working'?P.rest:P.home,.25)&&!acting()&&(state.status==='working'||boundary());
 function canClaimDuty(){return !disposed&&!error&&hostFree()&&!getMounted()&&['inactive','handoff','working'].includes(state.status)&&['player',ROLE.incumbentId].includes(slot.state().holderId);}
 function holdDuty(id){if(error||!receiptId(id))return false;if(state.receiptId)return state.receiptId===id;return persist({...state,status:'handoff',receiptId:id});}
 function claimDuty(id){if(!canClaimDuty()||!receiptId(id)||state.receiptId&&state.receiptId!==id)return false;return state.receiptId===id?true:persist({...state,status:'handoff',receiptId:id});}
 function workIntent(id,key=null){
  if(!active(id)||acting())return null;
  const completed=salon.receptionPlayerCompleted?.();
  const w=completed?{key:completed.sessionId+':appraise',kind:'appraise',sessionId:completed.sessionId,position:P.home.slice(),executionRadius:.25,action:`核对 ${completed.customerName} 的原单评价`}:salon.receptionPlayerIntent?.();
  return w&&(!key||w.key===key)?copy(w):null;
 }
 function executeWork(work,id){
  const expected=workIntent(id,work?.key);if(!expected||!at(getPlayer(),expected.position,expected.executionRadius||.25)||getMounted())return false;
  if(expected.kind!=='appraise')return salon.executeReceptionPlayerWork?.(expected)===true;
  const done=salon.receptionPlayerCompleted?.();if(!done||done.sessionId!==expected.sessionId)return false;
  const row={source:'china-salon-reception',id:done.sessionId+'-'+id,workReceiptId:id,sessionId:done.sessionId,customerId:done.customerId,customerName:done.customerName,completed:true,accurate:true,timely:done.waitSeconds<=60,waitSeconds:done.waitSeconds,proof:copy(done.proof)};
  if(!validChinaSalonReceptionReceipt(row))return false;
  const old=state.receipts.find(r=>r.sessionId===row.sessionId);
  if(old&&!sameChinaSalonReceptionReceipt(old,{...row,waitSeconds:old.waitSeconds,timely:old.timely}))return false;
  // Save the review first. If releasing the original session fails, the same
  // appraisal retries without manufacturing another receipt or salary.
  if(!old&&!persist({...state,receipts:[...state.receipts,row]}))return false;
  return salon.finishReceptionPlayerOrder?.(done.sessionId)===true;
 }
 function releaseDuty(id,{evaluate=false}={}){
  if(error||state.receiptId&&state.receiptId!==id)return false;
  if(state.status==='inactive')return true;
  salon.stopReceptionPlayerWork?.();
  if(state.status!=='returning'&&!persist({...state,status:'returning'}))return false;
  if(!boundary()){
   // Cancel/refund in the original controller. A settled but unreviewed order
   // earns no fabricated review; its real service payment remains untouched.
   if(!salon.cancelReceptionPlayerOrder?.())return false;
   if(!boundary())return false;
  }
  return false; // Completion is physical and durable, performed by update.
 }
 function travel(target,dt){
  host.walking=false;if(at(host,target,.06)){host.route=[];routeTarget=null;return true;}
  const key=target.join(',');if(routeTarget!==key||!host.route?.length){host.route=planPath(host.root.position,{x:target[0],y:target[1],z:target[2]},.25)||[];routeTarget=key;}
  followActorRoute(host,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root?.position,speedScale:.76,arrivalTolerance:.04});return at(host,target,.06);
 }
 function update(dt,t=0){
  owned=false;if(disposed||error)return;
  if(!inWorkplace()||getMounted())salon.stopReceptionPlayerWork?.();
  if(!hostFree())return;
  let target=null;
  if(state.status==='handoff'&&boundary())target=P.rest;
  else if(state.status==='working')target=P.rest;
  else if(state.status==='returning'&&boundary())target=P.home;
  else if(meeting&&state.status==='inactive'&&boundary())target=P.home;
  if(!target)return;
  owned=true;const arrived=travel(target,Math.max(0,Math.min(.1,dt)));
  if(arrived){host.root.rotation.y=Math.atan2(P.registry[0]-host.root.position.x,P.registry[2]-host.root.position.z);
   if(state.status==='handoff'&&inWorkplace()&&!getMounted())persist({...state,status:'working'},'player');
   else if(state.status==='returning')persist({...state,status:'inactive',receiptId:null},ROLE.incumbentId);
  }
  const c=poseContext(host,null);c.heldProp=null;c.handoff=false;c.archery=null;
  host.animate?.(t+(host.phase||0),!!host.walking,null,c);
 }
 const duty={registry:P.registry.slice(),meetingReady,requestMeeting:v=>{meeting=!!v;},canClaimDuty,holdDuty,claimDuty,releaseDuty,
  canEndDuty:id=>active(id)&&!acting()&&boundary(),
  dutyState:()=>({status:state.status==='working'&&!active(state.receiptId)?'paused':state.status,receiptId:state.receiptId,lastError:error}),
  dutyActive:active,inWorkplace,workIntent,workChoices:id=>{const w=workIntent(id);return w?[w]:[];},executeWork,
  workReceipts:id=>copy(state.receipts.filter(r=>r.workReceiptId===id)),held:()=>false,isActing:acting,stopWorkAction:()=>salon.stopReceptionPlayerWork?.(),playerPose:()=>active(state.receiptId)?salon.receptionPlayerPose?.()||null:null,
  returnPosition:()=>P.home.slice(),workLabel:()=>state.status==='handoff'?'等原客办完 · 温晚离案交班':state.status==='returning'?'温晚正在回原案接班':!active(state.receiptId)?'接待已暂停 · 请回原案接班':salon.receptionPlayerCompleted?.()?'服务已结清 · 请核对原客评价':salon.receptionPlayerIntent?.()?.action||'在原接待案候客',
  handoffPending:()=>['handoff','returning'].includes(state.status),ownsNPC:n=>(n===host||n===ROLE.incumbentId)&&owned,owns:n=>(n===host||n===ROLE.incumbentId)&&owned,update,snapshot:()=>copy(state),state:()=>({...copy(state),lastError:error}),
  restore(s){if(!valid(s)||JSON.stringify(s)!==JSON.stringify(state))return false;salon.stopReceptionPlayerWork?.();return true;},dispose(){disposed=true;owned=false;salon.stopReceptionPlayerWork?.();}};
 return duty;
}
