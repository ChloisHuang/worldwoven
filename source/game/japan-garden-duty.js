export const JAPAN_GARDEN_REGISTRY=Object.freeze([-17.1,0,-4.7]);
const REG=JAPAN_GARDEN_REGISTRY,HOME=[-18.4,0,-6],STANDBY=[-17.1,0,-6],HOST='jp-garden-onsen';
// All steps stand on the existing east shore; no path crosses pond water or stone.
export const JAPAN_GARDEN_WORK=Object.freeze({
 observe:{position:[-18.9,0,-6],target:[-23.5,.1,-6.8],duration:3,action:'岸上逐一观察原锦鲤',pose:'relax'},
 plants:{position:[-18.9,0,-1],target:[-24.1,.1,-.9],duration:3,action:'辨看原水草与水面',pose:'relax'},
 wipe:{position:[-18.9,0,-3.8],target:[-19.45,.36,-3.8],duration:4,action:'擦拭原东侧石池沿',pose:'garden'},
 verify:{position:[-18.9,0,-4.9],target:[-23.3,.1,-3.8],duration:2,action:'回看原池并完成本轮复核',pose:'relax'}
});
const near=(p,q,r=.25)=>!!p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
export function createJapanGardenDuty({board,actors,lot,assign,clear,unmount,taskOf,getStaffLife,getPlayer=()=>null,getMounted=()=>null,isDutyRoute=()=>false,getClock=()=>null,getPlayerState=()=>({}),getNeeds=()=>null,onComplete=()=>{}}){
 const host=actors.get(HOST),ledger=board.garden;let options={getPlayer,getMounted,isDutyRoute,getClock},desired=null,paused=false,meeting=false,step=null,disposed=false,yieldLifeOnce=false;
 const player=()=>options.getPlayer(),mounted=()=>options.getMounted(),hostHeld=()=>ledger.work().find(x=>x.owner===HOST),owned=()=>ledger.work().find(x=>x.owner==='player');
 const busy=()=>!!taskOf(host)&&!taskOf(host).idle,relief=()=>{const a=getStaffLife()?.state().active;return a?.reliefId===HOST&&!a.externalCoverage;};
 const covering=()=>!!desired&&!paused&&ledger.duty()?.status==='active',dutyActive=id=>desired===id&&covering();
 const objects=()=>lot.gardenPond?.id==='jp-garden-pond-1'&&lot.gardenPond.edge?.parent&&lot.gardenPond.fishCount===9&&lot.gardenPond.plantCount===3;
 const occupied=()=>getPlayerState().gardenUsing||getPlayerState().facilityId===HOST||getPlayerState().performing===HOST;
 const urgent=()=>{const n=getNeeds(HOST);return !!(n?.seekMeal||n?.seekToilet||n?.seekSleep);};
 const meetingReady=()=>!!host&&near(host.root.position,HOME,.22)&&!host.serviceMount&&!busy()&&!hostHeld()&&getStaffLife()?.state().active?.id!==HOST&&!relief();
 function recall(){if(!host||busy()||hostHeld()||relief()||!getStaffLife()?.recall(HOST)||!unmount(host))return false;if(!near(host.root.position,HOME,.2)||!taskOf(host)?.gardenMeeting){clear(host);assign(host,HOME,{idle:true,gardenMeeting:true,label:'回原锦鲤映池当面办理交班',face:REG,onDone:()=>false});}return meetingReady();}
 const label=()=>ledger.work().length?`第${ledger.state().item.day+1}日原池巡护待完成`:'本日原池巡护已完成 · 现场候班';
 function workFor(x){const w=JAPAN_GARDEN_WORK[x.stage];return {key:`${x.id}:${x.cycle}:${x.day}:${x.stage}`,itemId:x.id,cycle:x.cycle,day:x.day,kind:x.stage,expectedStage:x.stage,position:w.position.slice(),target:w.target.slice(),duration:w.duration,pose:w.pose,action:`原锦鲤映池 · ${w.action}`,executionRadius:.2};}
 const choices=id=>objects()&&!occupied()&&dutyActive(id)&&!step?ledger.work().filter(x=>!x.owner||x.owner==='player').map(workFor):[];
 const workIntent=(id,key=null)=>{const list=choices(id);return (key?list.find(w=>w.key===key):list[0])||null;};
 const finish=(w,actor,id=null)=>objects()&&!occupied()&&ledger.advance(w.itemId,w.kind,actor,{receiptId:id,cycle:w.cycle,day:w.day});
 const inWorkplace=()=>{const p=player()?.root.position;return !!p&&(Math.abs(p.y)<.35&&p.x>-19.3&&p.x<-16.3&&p.z>-8.3&&p.z<.5||options.isDutyRoute());};
 function executeWork(w,id){const next=workIntent(id,w.key);if(!next||mounted()||!near(player()?.root.position,next.position,.22))return false;step={...next,receiptId:id,elapsed:0};return true;}
 function scheduleNPC(){if(!host||disposed||yieldLifeOnce){yieldLifeOnce=false;return;}if(!objects()||occupied()||covering()||(meeting||desired&&!paused)&&!hostHeld()||busy()||relief()||!getStaffLife()?.canWork(HOST)||urgent()&&!hostHeld())return;const x=hostHeld()||ledger.work().find(x=>!x.owner);if(!x||!unmount(host))return;const w=workFor(x);clear(host);assign(host,w.position,{gardenWork:true,itemId:w.itemId,label:w.action,duration:w.duration,action:w.pose,workTarget:w.target,handoff:!!hostHeld(),ready:()=>objects()&&!occupied()&&ledger.work().some(x=>x.id===w.itemId&&x.cycle===w.cycle&&x.stage===w.kind),onDone:()=>{if(!finish(w,HOST))return false;onComplete(w.itemId,'garden-'+w.kind);if(!hostHeld())yieldLifeOnce=true;return true;}});}
 function releaseDuty(id){if(desired!==id)return desired===null&&!ledger.duty();if(!ledger.releaseDuty(id))return false;desired=null;paused=false;step=null;return true;}
 function update(dt){if(disposed)return;if(urgent()&&(hostHeld()||taskOf(host)?.gardenWork)&&ledger.releaseNPC())clear(host);const clock=options.getClock();if(objects()&&clock)ledger.observeDay(clock.day,clock.hour);
  if(desired&&!paused&&(!inWorkplace()||mounted())){if(!ledger.duty()||ledger.pauseDuty(desired)){step=null;paused=true;}}
  if(meeting||desired&&!paused&&!covering())recall();if(desired&&!paused&&!covering()&&meetingReady())ledger.claimDuty(desired);
  if(step){const w=step;if(!dutyActive(w.receiptId)||mounted()||!near(player()?.root.position,w.position,.25)||occupied())step=null;else if(!player().walking){player().root.rotation.y=Math.atan2(w.target[0]-player().root.position.x,w.target[2]-player().root.position.z);w.elapsed+=Math.min(.1,Math.max(0,dt));if(w.elapsed>=w.duration&&finish(w,'player',w.receiptId)){onComplete(w.itemId,'garden-'+w.kind);step=null;}}}scheduleNPC();}
 return {registry:REG.slice(),connect(next){options={...options,...next};return this;},update,meetingReady,workIntent,workChoices:choices,executeWork,
  requestMeeting(v){meeting=!!v;},holdDuty(id){desired=id;paused=true;},claimDuty(id){if(disposed||desired&&desired!==id||!this.canClaimDuty())return false;desired=id;paused=false;return true;},
  canClaimDuty:()=>!!host&&!!objects()&&!ledger.state().loadError&&!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),canEndDuty:id=>desired===id&&!step,releaseDuty,inWorkplace,dutyActive,
  holdsHost:()=>!!(meeting||desired&&!paused&&!covering()||hostHeld()),isCovering:covering,coversWorker:(id,kind=null)=>id===HOST&&covering()&&(!kind||kind==='local'),blocksWorker:id=>id===HOST&&!!(meeting||desired&&!paused&&!covering()||hostHeld()||taskOf(host)?.gardenWork),
  idlePoint:id=>id===HOST&&covering()&&!relief()?STANDBY.slice():null,idleTask:id=>id===HOST&&!relief()?{duration:4,face:[-23.3,.4,-3.8],label:(covering()?'原池巡护已交班 · ':'')+label()}:null,
  workReceipts:id=>ledger.receipts(id),isActing:()=>!!step,held:()=>false,actor:player,stopWorkAction(){step=null;},returnPosition:()=>REG.slice(),workLabel:()=>ledger.state().loadError?'庭园巡护记录异常 · 请保留原存档':step?.action||(paused?'庭园班已暂停 · 当面接回':label()),
  playerPose:()=>step?{action:step.pose,workTarget:step.target.slice(),station:{workTarget:step.target.slice()}}:null,
  dutyState:()=>({receiptId:desired,status:paused?'paused':ledger.duty()?.status||(desired?'draining':'inactive'),step:step?structuredClone(step):null,owned:owned()?.id||null,held:null}),snapshot:()=>({version:1,desired,paused}),restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!desired;step=null;return true;},dispose(){disposed=true;step=null;}
 };
}
