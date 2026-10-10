export const JAPAN_KOTATSU_REGISTRY=Object.freeze([-4.5,7.6,6.8]);
const REG=JAPAN_KOTATSU_REGISTRY,HOME=[-4.9,7.6,6.5],HOST='jp-tea';
export const JAPAN_KOTATSU_TABLES=Object.freeze([[-7,4],[-.7,4],[-7,-3],[-.7,-3]].map(([x,z],i)=>({id:`jp-kotatsu-${i+1}`,center:[x,7.6,z],work:[x+1.2,7.6,z+1.9],target:[x+.8,8.3,z+.7],seat:{id:`jp-kotatsu-guest-${i+1}`,kind:'kotatsu',poseAction:'kotatsu',position:[x+1.1,7.6,z+(i===0?1.6:1.725)],anchor:[x,7.6,z+(i===0?1.525:1.65)],yaw:Math.PI}})));
const table=id=>JAPAN_KOTATSU_TABLES.find(t=>t.id===id);
const near=(p,q,r=.25)=>!!p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
export function createJapanKotatsuDuty({board,actors,lot,assign,clear,unmount,taskOf,getStaffLife,getPlayer=()=>null,getMounted=()=>null,isDutyRoute=()=>false,getPlayerState=()=>({}),onComplete=()=>{}}){
 const host=actors.get(HOST),ledger=board.kotatsu,objects=[];lot.group.traverse(n=>{if(n.userData.kotatsuCushionId)objects.push({node:n,id:n.userData.kotatsuCushionId,position:n.position.clone(),rotation:n.rotation.clone()});});
 let options={getPlayer,getMounted,isDutyRoute},desired=null,paused=false,meeting=false,step=null,disposed=false,yieldLifeOnce=false;
 const player=()=>options.getPlayer(),mounted=()=>options.getMounted(),hostHeld=()=>ledger.work().find(x=>x.owner===HOST),held=()=>ledger.work().find(x=>x.owner==='player');
 const occupied=id=>{const t=table(id);return !t||[...actors.values()].some(n=>n.serviceMount&&near(n.root.position,t.center,2))||id==='jp-kotatsu-1'&&(getPlayerState().kotatsuUsing||getPlayerState().facilityId==='jp-tea'||getPlayerState().performing==='jp-tea');};
 const busy=()=>!!taskOf(host)&&!taskOf(host).idle,relief=()=>{const a=getStaffLife()?.state().active;return a?.reliefId===HOST&&!a.externalCoverage;};
 const covering=()=>!!desired&&!paused&&ledger.duty()?.status==='active',dutyActive=id=>desired===id&&covering();
 const meetingReady=()=>!!host&&near(host.root.position,HOME,.22)&&!host.serviceMount&&!busy()&&!hostHeld()&&getStaffLife()?.state().active?.id!==HOST&&!relief();
 function recall(){if(!host||busy()||hostHeld()||relief()||!getStaffLife()?.recall(HOST)||!unmount(host))return false;if(!near(host.root.position,HOME,.2)||!taskOf(host)?.kotatsuMeeting){clear(host);assign(host,HOME,{idle:true,kotatsuMeeting:true,label:'回暖桌廊厅当面办理交班',face:REG,onDone:()=>false});}return meetingReady();}
 const label=()=>ledger.work().length?`${ledger.work().length}张原暖桌待复位`:'四张原暖桌齐整 · 等客人离席';
 function workFor(x){const t=table(x.id);return {key:`${x.id}:${x.cycle}:${x.stage}`,itemId:x.id,cycle:x.cycle,kind:x.stage,expectedStage:x.stage,position:t.work.slice(),target:t.target.slice(),duration:x.stage==='smooth'||x.stage==='wipe'?3:1.5,action:`${x.id.split('-').at(-1)}号原暖桌 · ${{collect:'收齐原座垫并检查被缘',smooth:'理平原座垫与被缘',wipe:'擦净原桌面',return:'原位排齐座垫并开放下一客'}[x.stage]}`,executionRadius:.2};}
 const choices=id=>dutyActive(id)&&!step?ledger.work().filter(x=>!occupied(x.id)&&(!x.owner||x.owner==='player')).filter(x=>!held()||x.id===held().id).map(workFor):[];
 const workIntent=(id,key=null)=>{const list=choices(id);return (key?list.find(w=>w.key===key):list[0])||null;};
 const finish=(w,actor,id=null)=>!occupied(w.itemId)&&ledger.advance(w.itemId,w.kind,actor,{receiptId:id,cycle:w.cycle});
 const inWorkplace=()=>{const p=player()?.root.position;return !!p&&(Math.abs(p.y-7.6)<.35&&p.x>-11&&p.x<4&&p.z>-6&&p.z<8||options.isDutyRoute());};
 function executeWork(w,id){const next=workIntent(id,w.key);if(!next||mounted()||!near(player()?.root.position,next.position,.22))return false;step={...next,receiptId:id,elapsed:0};return true;}
 function scheduleNPC(){if(!host||disposed||yieldLifeOnce){yieldLifeOnce=false;return;}if(covering()||(meeting||desired&&!paused)&&!hostHeld()||busy()||relief()||!getStaffLife()?.canWork(HOST))return;const x=hostHeld()||ledger.work().find(x=>!x.owner&&!occupied(x.id));if(!x||occupied(x.id))return;if(!unmount(host))return;const w=workFor(x);clear(host);assign(host,w.position,{kotatsuWork:true,itemId:w.itemId,label:w.action,duration:w.duration,action:'tidy',workTarget:w.target,handoff:!!hostHeld(),ready:()=>!occupied(w.itemId)&&ledger.work().some(x=>x.id===w.itemId&&x.cycle===w.cycle&&x.stage===w.kind),onDone:()=>{if(!finish(w,HOST))return false;onComplete(w.itemId,'kotatsu-'+w.kind);if(!hostHeld())yieldLifeOnce=true;return true;}});}
 function releaseDuty(id){if(desired!==id)return desired===null&&!ledger.duty();if(held()&&!near(player()?.root.position,table(held().id).work,.3))return false;if(!ledger.releaseDuty(id))return false;desired=null;paused=false;step=null;return true;}
 function update(dt){if(disposed)return;if(desired&&!paused&&(!inWorkplace()||mounted())){if(!ledger.duty()||ledger.pauseDuty(desired)){step=null;paused=true;}}
  if(meeting||desired&&!paused&&!covering())recall();if(desired&&!paused&&!covering()&&meetingReady())ledger.claimDuty(desired);
  if(step){const w=step;if(!dutyActive(w.receiptId)||mounted()||!near(player()?.root.position,w.position,.25)||occupied(w.itemId))step=null;else if(!player().walking){player().root.rotation.y=Math.atan2(w.target[0]-player().root.position.x,w.target[2]-player().root.position.z);w.elapsed+=Math.min(.1,Math.max(0,dt));if(w.elapsed>=w.duration&&finish(w,'player',w.receiptId)){onComplete(w.itemId,'kotatsu-'+w.kind);step=null;}}}scheduleNPC();}
 function syncVisual(){const items=ledger.state().items;for(const o of objects){const x=items.find(x=>x.id===o.id),n=o.node;n.position.copy(o.position);n.rotation.copy(o.rotation);if(x&&['collect','smooth'].includes(x.stage)&&!occupied(x.id)){n.position.x+=.045;n.rotation.y+=.055;}}}

 return {occupied,registry:REG.slice(),connect(next){options={...options,...next};return this;},update,syncVisual,meetingReady,workIntent,workChoices:choices,executeWork,
  requestMeeting(v){meeting=!!v;},holdDuty(id){desired=id;paused=true;},claimDuty(id){if(disposed||desired&&desired!==id||!this.canClaimDuty())return false;desired=id;paused=false;return true;},
  canClaimDuty:()=>!!host&&!ledger.state().loadError&&!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),canEndDuty:id=>desired===id&&!step&&!held(),releaseDuty,inWorkplace,dutyActive,
  holdsHost:()=>!!(meeting||desired&&!paused&&!covering()||hostHeld()),isCovering:covering,coversWorker:(id,kind=null)=>id===HOST&&covering()&&(!kind||kind==='local'),blocksWorker:id=>id===HOST&&!!(meeting||desired&&!paused&&!covering()||hostHeld()||taskOf(host)?.kotatsuWork),
  idlePoint:id=>id===HOST&&covering()&&!relief()?HOME.slice():null,idleTask:id=>id===HOST&&covering()&&!relief()?{duration:4,face:[-7,8.3,4],label:covering()?'暖桌照料已交班 · '+label():label()}:null,
  workReceipts:id=>ledger.receipts(id),isActing:()=>!!step,held:()=>!!held(),actor:player,stopWorkAction(){step=null;},returnPosition:()=>held()?table(held().id).work.slice():REG.slice(),workLabel:()=>ledger.state().loadError?'暖桌记录异常 · 请保留原存档':step?.action||(paused?'暖桌班已暂停 · 当面接回':label()),
  playerPose:()=>step||held()?{action:step?'tidy':null,workTarget:step?.target.slice(),station:step?{workTarget:step.target.slice()}:null,handoff:!!held()}:null,
  dutyState:()=>({receiptId:desired,status:paused?'paused':ledger.duty()?.status||(desired?'draining':'inactive'),step:step?structuredClone(step):null,held:held()?.id||null}),snapshot:()=>({version:1,desired,paused}),restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!desired;step=null;return true;},dispose(){disposed=true;step=null;}
 };
}
