import {followActorRoute} from './actor-navigation.js';
import {isSociallyHeld} from './npc-social-ownership.js';
import {createFranceBedchamberCare} from './france-bedchamber-care.js';
const HOST='france-bedroom',BED='france-furniture-bed-0',copy=structuredClone;
export const FRANCE_BEDCHAMBER_POINTS=Object.freeze({registry:[4.35,0,-.55],home:[4.35,0,.65],rest:[4.25,0,-2.65]});
export const FRANCE_BEDCHAMBER_WORK=Object.freeze({
 inspect:{position:[5.15,0,-1.65],target:[7.55,1.25,-2.65],duration:2,pose:'relax',action:'查看原床罩、绣边与两只枕具'},
 smooth:{position:[5.45,.23,-1.7],target:[6.06,1.25,-1.7],duration:4,pose:'linen-care',action:'沿床边抚平原翡翠绣边床罩'},
 pillowWest:{position:[5.45,.23,-3.82],target:[6.34,1.26,-3.82],duration:3,pose:'linen-care',action:'扶正原西侧软枕'},
 pillowEast:{position:[9.63,.23,-3.82],target:[8.73,1.26,-3.82],duration:3,pose:'linen-care',action:'扶正原东侧软枕'},
 fold:{position:[5.05,.23,1.08],target:[5.05,1.4495,1.70],duration:4,pose:'linen-care',action:'重新叠齐妆台上三块原织物'},
 verify:{position:[5.15,0,-1.65],target:[7.55,1.25,-2.65],duration:2,pose:'relax',action:'回床边复核原床品，记下本轮整理'}
});
const P=FRANCE_BEDCHAMBER_POINTS,W=FRANCE_BEDCHAMBER_WORK;
const near=(n,p,r=.2)=>!!n&&Math.abs(n.root.position.y-p[1])<.36&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<=r;
export function createFranceBedchamberService({npcs,lot,doors,planPath,moveActor,poseContext=()=>({}),getPlayer,getMounted=()=>null,getBedUsers=()=>[],bedReserved=()=>false,getClock=()=>({}),canBorrow=()=>true,getNeeds=()=>null,saved=null,saveState=()=>true}){
 const actor=npcs.find(n=>n.station.id===HOST);if(!actor)return null;
 const care=createFranceBedchamberCare({saved,saveState});let desired=care.duty()?.receiptId||null,paused=!!desired,meeting=false,step=null,npcStep=null,borrowing=false,disposed=false,routeKey=null;
 const objects=()=>{const o=lot.franceBedchamber;return o?.bedId===BED&&o.cover?.parent&&o.embroidery?.length===6&&o.embroidery.every(n=>n.parent)&&o.pillows?.length===2&&o.pillows.every(n=>n.parent)&&o.folded?.length===3&&o.folded.every(n=>n.parent);};
 const users=()=>getBedUsers().filter(u=>typeof u==='string'),occupied=()=>users().length>0||bedReserved();
 const available=()=>actor.alive!==false&&!actor.serviceMount&&!isSociallyHeld(HOST)&&canBorrow();
 const urgent=()=>{const n=getNeeds(HOST);return !!(n?.seekMeal||n?.seekToilet||n?.seekSleep);};
 const active=id=>desired===id&&!paused&&care.duty()?.receiptId===id&&care.duty().status==='active';
 const local=()=>{const p=getPlayer()?.root.position;return !!p&&Math.abs(p.y)<.36&&p.x>3.45&&p.x<10.65&&p.z>-6.1&&p.z<1.5;};
 const face=(n,p)=>{n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);};
 function travel(target,dt){actor.walking=false;if(near(actor,target,.055)){actor.route=[];routeKey=null;return true;}const key=target.join(',');if(routeKey!==key||!actor.route.length){actor.route=planPath(actor.root.position,{x:target[0],y:target[1],z:target[2]},.25)||[];routeKey=key;}followActorRoute(actor,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.85,arrivalTolerance:.035});return near(actor,target,.055);}
 const workFor=x=>{const w=W[x.stage];return {...copy(w),stage:x.stage,itemId:x.id,bedId:BED,cycle:x.cycle,useId:x.useId,key:`${x.id}:${x.cycle}:${x.useId}:${x.stage}`,executionRadius:w.pose==='linen-care'?.065:.2,visualAnchor:{id:x.id+'-'+x.stage,point:w.target.slice()}};};
 function workIntent(id,key=null){const x=care.work();if(!objects()||occupied()||!active(id)||step||!x||x.owner&&x.owner!=='player')return null;const w=workFor(x);return !key||key===w.key?w:null;}
 const meetingReady=()=>available()&&near(actor,P.home,.22)&&!npcStep&&care.work()?.owner!==HOST;
 const pose=w=>({action:w.pose,workTarget:w.target.slice(),station:{workTarget:w.target.slice()},linenCare:w.pose==='linen-care'?{target:w.target.slice(),axis:w.stage==='fold'?'x':'z'}:null});
 const finish=(w,id)=>objects()&&!occupied()&&care.advance(w.stage,id,{receiptId:id==='player'?desired:null,cycle:w.cycle,useId:w.useId});
 function update(dt,t=0){if(disposed||care.state().loadError)return;dt=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));borrowing=false;care.observeUsers(users(),dt);
  if(desired&&!paused&&(!local()||getMounted())){if(!care.duty()||care.pauseDuty(desired)){paused=true;step=null;}}
  const x=care.work();if(step&&(!active(step.receiptId)||!x||workFor(x).key!==step.key||occupied()||getMounted()||!near(getPlayer(),step.position,step.executionRadius+1e-6)||getPlayer().walking))step=null;
  if(step){face(getPlayer(),step.target);step.elapsed+=dt;if(step.elapsed>=step.duration&&finish(step,'player'))step=null;}
  if(!available()){npcStep=null;return;}
  // Genuine outside care/need ownership wins. Interrupted original work stays
  // on the same bed, with provenance retained and no assumed completion.
  if(urgent()&&!meeting){npcStep=null;care.releaseNPC();actor.route=[];routeKey=null;return;}
  const wantMeeting=meeting||desired&&!paused&&!active(desired);
  if(wantMeeting){npcStep=null;if(care.work()?.owner===HOST&&!care.releaseNPC())return;borrowing=true;const arrived=travel(P.home,dt);if(arrived){face(actor,P.registry);if(desired&&!paused&&!active(desired)&&local()&&!getMounted())care.claimDuty(desired);}actor.animate?.(t+(actor.phase||0),!!actor.walking,null,{...poseContext(actor,null),linenCare:null});return;}
  const pending=care.work();
  if(!active(desired)&&!paused&&pending&&pending.owner!=='player'&&!occupied()&&objects()){
   borrowing=true;const w=workFor(pending);if(travel(w.position,dt)){face(actor,w.target);if(npcStep?.key!==w.key)npcStep={...w,elapsed:0};npcStep.elapsed+=dt;if(npcStep.elapsed>=w.duration&&finish(w,HOST))npcStep=null;}else npcStep=null;
   const c={...poseContext(actor,{workTarget:w.target}),linenCare:w.pose==='linen-care'?{target:w.target.slice(),axis:w.stage==='fold'?'x':'z'}:null};actor.animate?.(t+(actor.phase||0),!!actor.walking,actor.walking?null:w.pose,c);
  }else{npcStep=null;borrowing=true;travel(P.home,dt);actor.animate?.(t+(actor.phase||0),!!actor.walking,actor.walking?null:active(desired)?'read':null,{...poseContext(actor,null),linenCare:null});}
  const label=actor.label?.querySelector?.('small');if(label)label.textContent=active(desired)?'寝务已交班 · 朱丽叶原室歇脚':occupied()?'床位有人使用 · 等离床再整理':pending?`原床第${pending.cycle}轮 · ${W[pending.stage].action}`:'原床品整齐 · 等真实使用后整理';
 }
 const duty={registry:P.registry.slice(),meetingReady,inWorkplace:local,dutyActive:active,canClaimDuty:()=>!care.state().loadError&&!!objects()&&available()&&!getMounted(),
  holdDuty(id){if(desired&&desired!==id)return false;if(!care.holdDuty(id))return false;desired=id;paused=true;return true;},
  claimDuty(id){if(desired&&desired!==id||!this.canClaimDuty())return false;desired=id;paused=false;return true;},
  releaseDuty(id){if(desired&&desired!==id||!care.releaseDuty(id))return false;desired=null;paused=false;step=null;return true;},
  canEndDuty:id=>desired===id&&!step,requestMeeting:v=>{meeting=!!v;},workReceipts:id=>care.receipts(id),workIntent,workChoices:id=>{const w=workIntent(id);return w?[w]:[];},
  executeWork(w,id){const next=workIntent(id,w.key);if(!next||getMounted()||!near(getPlayer(),next.position,next.executionRadius))return false;step={...next,receiptId:id,elapsed:0};face(getPlayer(),next.target);return true;},
  isActing:()=>!!step,held:()=>false,stopWorkAction(){step=null;},returnPosition:()=>P.registry.slice(),
  workLabel:()=>care.state().loadError?'寝务记录异常 · 保留原档，停止整理':step?.action||(paused?'寝务已暂停 · 请当面接回':occupied()?'皇家床有人使用 · 离床后再整理':care.work()?W[care.work().stage].action:'床品已整齐 · 真实休息离床后才需整理，可交班'),
  playerPose:()=>step?pose(step):null,dutyState:()=>({receiptId:desired,status:paused?'paused':active(desired)?'active':desired?'draining':'inactive',step:step?copy(step):null})};
 return {duty,care,update,owns:n=>n===actor&&borrowing,socialStatus:n=>n===actor&&borrowing?{busy:!!npcStep||meeting,canPause:!npcStep&&!meeting,attention:!npcStep&&!meeting,job:duty.workLabel()}:null,canTalkAtPost:n=>n===actor&&borrowing&&!npcStep&&!meeting&&!actor.walking,canBorrowForSocial:n=>n===actor&&borrowing&&!npcStep&&!meeting,
  state:()=>({...care.state(),duty:duty.dutyState(),npcStep:npcStep?copy(npcStep):null}),snapshot:()=>care.snapshot(),restore(s){const current=care.snapshot();if(s?.revision!==current.revision||!care.restore(s))return false;desired=care.duty()?.receiptId||null;paused=!!desired;step=null;npcStep=null;return true;},dispose(){disposed=true;step=null;npcStep=null;}};
}
