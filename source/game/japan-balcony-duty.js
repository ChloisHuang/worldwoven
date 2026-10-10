export const JAPAN_BALCONY_REGISTRY=Object.freeze([-4.6,11.4,9.55]);
const REG=JAPAN_BALCONY_REGISTRY,HOME=[-4.6,11.4,10.25],STANDBY=[-3.8,11.4,10.25],HOST='jp-balcony';
// Original fourth-floor gallery; work never closes it or moves a fixture.
export const JAPAN_BALCONY_WORK=Object.freeze({
 lanterns:{position:[-6.6,11.4,10.2],target:[-11.75,14.12,10.9],targets:[-11.75,-7.5,-3,3,7.5,11.75].map(x=>[x,14.12,10.9]),duration:9,action:'在廊下逐一查看六盏原灯笼与吊杆',pose:'gallery-inspect'},
 walkway:{position:[-2,11.4,10.25],target:[.5,11.43,10.25],duration:3,action:'沿原步道查看入口与栏边净空',pose:'relax'},
 wipe:{position:[-5.706667,11.4,11.08],target:[-5.706667,12.375,11.65],duration:4,action:'擦拭原木栏扶手',pose:'rail-wipe'},
 verify:{position:[-6.5,11.4,10.25],target:[0,12.4,10.25],duration:2,action:'回看原廊并登记本轮巡护',pose:'relax'}
});
const near=(p,q,r=.25)=>!!p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
export function createJapanBalconyDuty({board,actors,lot,assign,clear,unmount,taskOf,getStaffLife,getPlayer=()=>null,getMounted=()=>null,isDutyRoute=()=>false,getClock=()=>null,getPlayerState=()=>({}),getNeeds=()=>null,onComplete=()=>{}}){
 const host=actors.get(HOST),ledger=board.balcony;let options={getPlayer,getMounted,isDutyRoute,getClock},desired=null,paused=false,meeting=false,step=null,disposed=false,yieldLifeOnce=false;
 const player=()=>options.getPlayer(),mounted=()=>options.getMounted(),hostHeld=()=>ledger.work().find(x=>x.owner===HOST),owned=()=>ledger.work().find(x=>x.owner==='player');
 const busy=()=>!!taskOf(host)&&!taskOf(host).idle,relief=()=>{const a=getStaffLife()?.state().active;return a?.reliefId===HOST&&!a.externalCoverage;};
 const covering=()=>!!desired&&!paused&&ledger.duty()?.status==='active',dutyActive=id=>desired===id&&covering();
 const objects=()=>lot.balconyGallery?.id==='jp-balcony-gallery-1'&&lot.balconyGallery.rail?.parent&&lot.balconyGallery.floor?.parent&&lot.balconyGallery.lanterns?.length===6&&lot.balconyGallery.lanterns.every(n=>n.parent);
 const occupied=()=>getPlayerState().facilityId===HOST||getPlayerState().performing===HOST;
 const urgent=()=>{const n=getNeeds(HOST);return !!(n?.seekMeal||n?.seekToilet||n?.seekSleep);};
 const meetingReady=()=>!!host&&near(host.root.position,HOME,.22)&&!host.serviceMount&&!busy()&&!hostHeld()&&getStaffLife()?.state().active?.id!==HOST&&!relief();
 function recall(){if(!host||busy()||hostHeld()||relief()||!getStaffLife()?.recall(HOST)||!unmount(host))return false;if(!near(host.root.position,HOME,.2)||!taskOf(host)?.balconyMeeting){clear(host);assign(host,HOME,{idle:true,balconyMeeting:true,label:'回原灯笼望景廊当面办理交班',face:REG,onDone:()=>false});}return meetingReady();}
 const label=()=>ledger.work().length?`第${ledger.state().item.day+1}日原廊巡护待完成`:ledger.state().lastOpenedDay===options.getClock()?.day?'本日原廊巡护已记录 · 现场候班':'原廊巡护待当日登记 · 06:00–18:00开巡';
 function workFor(x){const w=JAPAN_BALCONY_WORK[x.stage];return {key:`${x.id}:${x.cycle}:${x.day}:${x.stage}`,itemId:x.id,cycle:x.cycle,day:x.day,kind:x.stage,expectedStage:x.stage,position:w.position.slice(),target:w.target.slice(),duration:w.duration,pose:w.pose,action:`原灯笼望景廊 · ${w.action}`,executionRadius:x.stage==='wipe'?.08:.2};}
 const inspectTarget=(w,elapsed)=>JAPAN_BALCONY_WORK[w.kind].targets?.[Math.min(5,Math.floor(elapsed/1.5))]?.slice()||null;
 const choices=id=>objects()&&!occupied()&&dutyActive(id)&&!step?ledger.work().filter(x=>!x.owner||x.owner==='player').map(workFor):[];
 const workIntent=(id,key=null)=>{const list=choices(id);return (key?list.find(w=>w.key===key):list[0])||null;};
 const finish=(w,actor,id=null)=>objects()&&!occupied()&&ledger.advance(w.itemId,w.kind,actor,{receiptId:id,cycle:w.cycle,day:w.day});
 const inWorkplace=()=>{const p=player()?.root.position;return !!p&&(Math.abs(p.y-11.4)<.35&&p.x>-11.3&&p.x<11.3&&p.z>9.3&&p.z<11.35||options.isDutyRoute());};
 function executeWork(w,id){const next=workIntent(id,w.key);if(!next||mounted()||!near(player()?.root.position,next.position,next.executionRadius))return false;player().root.rotation.y=Math.atan2(next.target[0]-player().root.position.x,next.target[2]-player().root.position.z);step={...next,receiptId:id,elapsed:0};return true;}
 function scheduleNPC(){if(!host||disposed||yieldLifeOnce){yieldLifeOnce=false;return;}if(!objects()||occupied()||covering()||(meeting||desired&&!paused)&&!hostHeld()||busy()||relief()||!getStaffLife()?.canWork(HOST)||urgent()&&!hostHeld())return;const x=hostHeld()||ledger.work().find(x=>!x.owner);if(!x||!unmount(host))return;const w=workFor(x);clear(host);assign(host,w.position,{balconyWork:true,itemId:w.itemId,label:w.action,duration:w.duration,action:w.pose,workTarget:w.target,railWipe:w.kind==='wipe'?{target:w.target.slice()}:null,balconyKind:w.kind,inspectionTarget:inspectTarget(w,0),ready:()=>objects()&&!occupied()&&ledger.work().some(x=>x.id===w.itemId&&x.cycle===w.cycle&&x.stage===w.kind),onDone:()=>{if(!finish(w,HOST))return false;onComplete(w.itemId,'balcony-'+w.kind);if(!hostHeld())yieldLifeOnce=true;return true;}});}
 function releaseDuty(id){if(desired!==id)return desired===null&&!ledger.duty();if(!ledger.releaseDuty(id))return false;desired=null;paused=false;step=null;return true;}
 function update(dt){if(disposed)return;const npcTask=host&&taskOf(host);if(npcTask?.balconyWork&&npcTask.balconyKind==='lanterns'){npcTask.inspectionTarget=inspectTarget({kind:'lanterns'},npcTask.elapsed||0);npcTask.workTarget=npcTask.inspectionTarget;}if(urgent()&&(hostHeld()||taskOf(host)?.balconyWork)&&ledger.releaseNPC())clear(host);const clock=options.getClock();if(objects()&&clock)ledger.observeDay(clock.day,clock.hour);
  if(desired&&!paused&&(!inWorkplace()||mounted())){if(!ledger.duty()||ledger.pauseDuty(desired)){step=null;paused=true;}}
  if(meeting||desired&&!paused&&!covering())recall();if(desired&&!paused&&!covering()&&meetingReady())ledger.claimDuty(desired);
  if(step){const w=step;if(!dutyActive(w.receiptId)||mounted()||!near(player()?.root.position,w.position,w.executionRadius+1e-6)||occupied())step=null;else if(!player().walking){const target=inspectTarget(w,w.elapsed);if(target)w.target=target;player().root.rotation.y=Math.atan2(w.target[0]-player().root.position.x,w.target[2]-player().root.position.z);w.elapsed+=Math.min(.1,Math.max(0,dt));if(w.elapsed>=w.duration&&finish(w,'player',w.receiptId)){onComplete(w.itemId,'balcony-'+w.kind);step=null;}}}scheduleNPC();}
 return {registry:REG.slice(),connect(next){options={...options,...next};return this;},update,meetingReady,workIntent,workChoices:choices,executeWork,
  requestMeeting(v){meeting=!!v;},holdDuty(id){desired=id;paused=true;},claimDuty(id){if(disposed||desired&&desired!==id||!this.canClaimDuty())return false;desired=id;paused=false;return true;},
  canClaimDuty:()=>!!host&&!!objects()&&!ledger.state().loadError&&!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),canEndDuty:id=>desired===id&&!step,releaseDuty,inWorkplace,dutyActive,
  holdsHost:()=>!!(meeting||desired&&!paused&&!covering()||hostHeld()),isCovering:covering,coversWorker:(id,kind=null)=>id===HOST&&covering()&&(!kind||kind==='local'),blocksWorker:id=>id===HOST&&!!(meeting||desired&&!paused&&!covering()||hostHeld()||taskOf(host)?.balconyWork),
  idlePoint:id=>id===HOST&&covering()&&!relief()?STANDBY.slice():null,idleTask:id=>id===HOST&&!relief()?{duration:4,action:'read',workTarget:[0,12.4,10.25],face:[0,12.4,10.25],label:(covering()?'原廊巡护已交班 · ':'')+label()}:null,
  workReceipts:id=>ledger.receipts(id),isActing:()=>!!step,held:()=>false,actor:player,stopWorkAction(){step=null;},returnPosition:()=>REG.slice(),workLabel:()=>ledger.state().loadError?'望景廊巡护记录异常 · 请保留原存档':step?.action||(paused?'望景廊班已暂停 · 当面接回':label()),
  playerPose:()=>step?{action:step.pose,workTarget:step.target.slice(),inspectionTarget:step.kind==='lanterns'?step.target.slice():null,railWipe:step.kind==='wipe'?{target:step.target.slice()}:null,station:{workTarget:step.target.slice()}}:null,
  dutyState:()=>({receiptId:desired,status:paused?'paused':ledger.duty()?.status||(desired?'draining':'inactive'),step:step?structuredClone(step):null,owned:owned()?.id||null,held:null}),snapshot:()=>({version:1,desired,paused}),restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!desired;step=null;return true;},dispose(){disposed=true;step=null;}
 };
}
