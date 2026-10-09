import {followActorRoute} from './actor-navigation.js';
import {isSociallyHeld} from './npc-social-ownership.js';
import {PALACE_GARDEN_CAREER_ROLE as ROLE,validGardenDutyReceipt,sameGardenDutyReceipt} from './china-palace-garden-career-role.js';
import {PALACE_EDICT} from './china-palace-edict-place.js';
const copy=structuredClone;
// Keep the original bridge post as the single source of the handoff location.
export function palaceGardenDutyPoints(host){const home=host.home.toArray();return {home,registry:[home[0],home[1],home[2]+1.2],rest:[home[0]-1.3,home[1],home[2]]};}
const at=(n,p,r=.25)=>!!n?.root?.position&&Math.abs(n.root.position.y-p[1])<.35&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<=r;
const receiptId=id=>typeof id==='string'&&/^cn-palace-garden-labor-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.split('-').at(-1)));
const fresh=()=>({version:1,status:'inactive',receiptId:null,receipts:[]});
function valid(s){return !!s&&s.version===1&&['inactive','handoff','working','returning'].includes(s.status)&&(s.status==='inactive'?s.receiptId===null:receiptId(s.receiptId))&&Array.isArray(s.receipts)&&s.receipts.every(validGardenDutyReceipt)&&new Set(s.receipts.map(r=>r.id)).size===s.receipts.length&&new Set(s.receipts.map(r=>r.documentId)).size===s.receipts.length;}
// The original edict owns its document, recipient, physical steps and return.
// This adapter owns only the one-seat handoff and reviewed work receipts.
export function createChinaPalaceGardenDuty({edict,slot,getPlayer,getMounted=()=>null,getClock,careers,saved=null,saveState=()=>false,planPath,doors,moveActor,npcs=[],poseContext=()=>({})}={}){
 const host=npcs.find(n=>n.station?.id===ROLE.incumbentId);
 const P=palaceGardenDutyPoints(host);
 let state=fresh(),error=null,meeting=false,owned=false,disposed=false,routeTarget=null;
 if(saved!=null){if(valid(saved))state=copy(saved);else error='invalid-palace-garden-duty';}
 const initialHolder=slot.state().holderId;
 if(!error&&(state.status==='working'&&initialHolder!=='player'||['inactive','handoff'].includes(state.status)&&initialHolder==='player'))error='palace-garden-duty-slot-mismatch';
 function persist(next,assignment=null){
  if(error||!valid(next))return false;
  const save=patch=>{try{const r=saveState(copy(next),patch);return r!==false&&r?.ok!==false&&!r?.then;}catch{return false;}};
  if(assignment){const plan=slot.prepareAssignment(assignment);if(!plan.ok||!plan.lock())return false;
   try{if(!plan.save(({assignment})=>save({chinaGardenSlot:assignment}))||!plan.committed())return false;}finally{plan.release();}
  }else if(!save({}))return false;
  state=next;if(assignment)edict.bindGardenAssignment?.();return true;
 }
 const hostFree=()=>host?.alive!==false&&!!host&&!host.serviceMount&&!isSociallyHeld(ROLE.incumbentId);
 const boundary=()=>edict.gardenPlayerHandoffBoundary?.()?.ok===true;
 const originalBoundary=()=>edict.gardenHandoffBoundary?.()?.ok===true;
 const onSegment=(p,a,b,r=1.05)=>{if(Math.abs(p.y-a[1])>.45&&Math.abs(p.y-b[1])>.45)return false;const dx=b[0]-a[0],dz=b[2]-a[2],d=dx*dx+dz*dz,t=d?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[2])*dz)/d)):0;return Math.hypot(p.x-a[0]-t*dx,p.z-a[2]-t*dz)<=r;};
 const inWorkplace=()=>{const p=getPlayer()?.root?.position;if(!p)return false;if(at(getPlayer(),P.home,1.7))return true;
  // Only the original east-shore route is attended work, never the whole palace.
  if(!edict.gardenPlayerIntent?.()&&!edict.gardenPlayerActing?.()&&!edict.gardenPlayerHeld?.())return false;
  const route=[P.home,[0,.295,-14.3],[10,.145,-14],PALACE_EDICT.points.file,PALACE_EDICT.points.sweep];return route.slice(1).some((b,i)=>onSegment(p,route[i],b));};
 const acting=()=>edict.gardenPlayerActing?.()===true;
 const active=id=>!disposed&&!error&&state.receiptId===id&&state.status==='working'&&slot.state().holderId==='player'&&inWorkplace()&&!getMounted();
 const meetingReady=()=>!error&&hostFree()&&!host.walking&&at(host,state.status==='working'?P.rest:P.home,.25)&&!acting()&&(state.status==='working'||originalBoundary());
 function canClaimDuty(){return !disposed&&!error&&hostFree()&&!getMounted()&&['inactive','handoff','working'].includes(state.status)&&['player',ROLE.incumbentId].includes(slot.state().holderId);}
 function holdDuty(id){if(error||!receiptId(id))return false;if(state.receiptId)return state.receiptId===id;return persist({...state,status:'handoff',receiptId:id});}
 function claimDuty(id){if(!canClaimDuty()||!receiptId(id)||state.receiptId&&state.receiptId!==id)return false;return state.receiptId===id?true:persist({...state,status:'handoff',receiptId:id});}
 function workIntent(id,key=null){
  if(!active(id)||acting())return null;
  const completed=edict.gardenPlayerCompleted?.();
  const w=completed?{key:completed.documentId+':appraise',kind:'appraise',documentId:completed.documentId,position:P.home.slice(),executionRadius:.25,action:'核对原令办结 · Bo 验收'}:edict.gardenPlayerIntent?.()||{key:'await-original:'+id,kind:'await-original',position:P.home.slice(),executionRadius:.17,action:'到原荷桥岗位候令'};
  return w&&(!key||w.key===key)?copy(w):null;
 }
 function executeWork(work,id){
  const expected=workIntent(id,work?.key);if(!expected||!at(getPlayer(),expected.position,expected.executionRadius||.25)||getMounted())return false;
  if(expected.kind==='await-original')return true;
  if(expected.kind!=='appraise')return edict.executeGardenPlayerWork?.(expected)===true;
  const done=edict.gardenPlayerCompleted?.();if(!done||done.documentId!==expected.documentId)return false;
  const proof=done.proof||done;
  const row={source:'china-palace-garden',id:done.documentId+'-'+id,workReceiptId:id,documentId:done.documentId,audienceId:proof.audienceId,day:proof.day,holderRevision:proof.holderRevision,completed:true,accurate:true,proof:copy(proof)};
  if(!validGardenDutyReceipt(row))return false;
  const old=state.receipts.find(r=>r.documentId===row.documentId);
  if(old&&!sameGardenDutyReceipt(old,row))return false;
  // Save the review first. If releasing the original session fails, the same
  // appraisal retries without manufacturing another receipt or salary.
  if(!old&&!persist({...state,receipts:[...state.receipts,row]}))return false;
  return edict.finishGardenPlayerOrder?.(done.documentId)===true;
 }
 function releaseDuty(id,{evaluate=false}={}){
  if(error||state.receiptId&&state.receiptId!==id)return false;
  if(state.status==='inactive')return true;
  if(!boundary())return false;
  edict.stopGardenPlayerWork?.();
  if(state.status!=='returning'&&!persist({...state,status:'returning'}))return false;
  // A live original decree must be physically completed and appraised. Leaving
  // or cancelling a shift cannot erase it or manufacture a successful review.
  if(!boundary())return false;
  return false; // Completion is physical and durable, performed by update.
 }
 function travel(target,dt){
  host.walking=false;if(at(host,target,.06)){host.route=[];routeTarget=null;return true;}
  const key=target.join(',');if(routeTarget!==key||!host.route?.length){host.route=planPath(host.root.position,{x:target[0],y:target[1],z:target[2]},.25)||[];routeTarget=key;}
  followActorRoute(host,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root?.position,speedScale:.76,arrivalTolerance:.04});return at(host,target,.06);
 }
 function update(dt,t=0){
  owned=false;if(disposed||error)return;
  if(!inWorkplace()||getMounted())edict.stopGardenPlayerWork?.();
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
  canEndDuty:id=>state.receiptId===id&&state.status==='working'&&!getMounted()&&!acting()&&boundary(),
  dutyState:()=>({status:state.status==='working'&&!active(state.receiptId)?'paused':state.status,receiptId:state.receiptId,lastError:error}),
  dutyActive:id=>active(id)&&getClock().hour>=6&&getClock().hour<18,inWorkplace,workIntent,workChoices:id=>{const w=workIntent(id);return w?[w]:[];},executeWork,
  workReceipts:id=>copy(state.receipts.filter(r=>r.workReceiptId===id)),held:()=>edict.gardenPlayerHeld?.()===true,isActing:acting,stopWorkAction:()=>edict.stopGardenPlayerWork?.(),playerPose:()=>active(state.receiptId)?edict.gardenPlayerPose?.()||null:null,
  returnPosition:()=>P.home.slice(),workLabel:()=>state.status==='handoff'?'等 Bo 完成原事务 · 安全让位':state.status==='returning'?'Bo 正在回荷桥原岗接班':!active(state.receiptId)?'勤务已暂停 · 请回原岗':edict.gardenPlayerCompleted?.()?'原令已返岗 · 请当面评价':edict.gardenPlayerIntent?.()?.action||'在原荷桥岗位候令',
  handoffPending:()=>['handoff','returning'].includes(state.status),ownsNPC:n=>(n===host||n===ROLE.incumbentId)&&owned,owns:n=>(n===host||n===ROLE.incumbentId)&&owned,update,snapshot:()=>copy(state),state:()=>({...copy(state),lastError:error}),
  restore(s){if(!valid(s)||JSON.stringify(s)!==JSON.stringify(state))return false;edict.stopGardenPlayerWork?.();return true;},dispose(){disposed=true;owned=false;edict.stopGardenPlayerWork?.();}};
 return duty;
}
