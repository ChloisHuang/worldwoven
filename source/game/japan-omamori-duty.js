import * as THREE from 'three';
export const JAPAN_OMAMORI_REGISTRY=Object.freeze([3.1,0,30.45]);
const REG=JAPAN_OMAMORI_REGISTRY,HOME=[4.7,0,30.6],HOST='jp-omamori',FRONT=[4.7,0,33.1],WORK=[4.7,0,30.6],TARGET=[4.7,1.12,31.1];
const near=(p,q,r=.25)=>!!p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
export function createJapanOmamoriDuty({board,actors,lot,assign,clear,unmount,taskOf,getStaffLife,getPlayer=()=>null,getMounted=()=>null,isDutyRoute=()=>false,onComplete=()=>{}}){
 const host=actors.get(HOST),ledger=board.omamori,objects=[];lot.group.traverse(n=>{if(n.userData.omamoriItemId)objects.push({node:n,id:n.userData.omamoriItemId,position:n.position.clone(),rotation:n.rotation.clone()});});
 let options={getPlayer,getMounted,isDutyRoute},desired=null,paused=false,meeting=false,step=null,disposed=false;
 const player=()=>options.getPlayer(),mounted=()=>options.getMounted(),hostHeld=()=>ledger.work().find(x=>x.owner===HOST),held=()=>ledger.work().find(x=>x.owner==='player');
 const busy=()=>!!taskOf(host)&&!taskOf(host).idle,relief=()=>{const a=getStaffLife()?.state().active;return a?.reliefId===HOST&&!a.externalCoverage;};
 const covering=()=>!!desired&&!paused&&ledger.duty()?.status==='active',dutyActive=id=>desired===id&&covering();
 const meetingReady=()=>near(host.root.position,HOME,.22)&&!host.serviceMount&&!busy()&&!hostHeld()&&getStaffLife()?.state().active?.id!==HOST&&!relief();
 function recall(){if(busy()||hostHeld()||relief()||!getStaffLife()?.recall(HOST)||!unmount(host))return false;if(!near(host.root.position,HOME,.2)||!taskOf(host)?.omamoriMeeting){clear(host);assign(host,HOME,{idle:true,omamoriMeeting:true,label:'回原御守台当面办理交班',face:REG,onDone:()=>false});}return meetingReady();}
 const label=()=>ledger.work().length?`${ledger.work().length}件原御守待整理`:'原御守陈列齐整 · 现场候班';
 function workFor(x){return {key:`${x.id}:${x.cycle}:${x.stage}`,itemId:x.id,cycle:x.cycle,kind:x.stage,expectedStage:x.stage,position:WORK.slice(),target:TARGET.slice(),duration:x.stage==='cord'||x.stage==='embroidery'?3:1.5,action:`${x.id.split('-').at(-1)}号原御守 · ${{collect:'从原陈列位取下经手布袋',cord:'理顺原绳结并核查系口',embroidery:'抚平原布袋并核查刺绣',return:'挂回同号原钩或放回原托盘'}[x.stage]}`,executionRadius:.2};}
 const choices=id=>dutyActive(id)&&!step?ledger.work().filter(x=>!x.owner||x.owner==='player').filter(x=>!held()||x.id===held().id).map(workFor):[];
 const workIntent=(id,key=null)=>{const list=choices(id);return (key?list.find(w=>w.key===key):list[0])||null;};
 const finish=(w,actor,id=null)=>ledger.advance(w.itemId,w.kind,actor,{receiptId:id,cycle:w.cycle});
 const inWorkplace=()=>{const p=player()?.root.position;return !!p&&(Math.abs(p.y)<.35&&p.x>2.3&&p.x<7.1&&p.z>29.7&&p.z<34||options.isDutyRoute());};
 function executeWork(w,id){const next=workIntent(id,w.key);if(!next||mounted()||!near(player()?.root.position,next.position,.22))return false;step={...next,receiptId:id,elapsed:0};return true;}
 function scheduleNPC(){if(disposed||covering()||(meeting||desired&&!paused)&&!hostHeld()||busy()||host.serviceMount||relief()||!getStaffLife()?.canWork(HOST))return;const x=hostHeld()||ledger.work().find(x=>!x.owner);if(!x)return;const w=workFor(x);clear(host);assign(host,w.position,{omamoriWork:true,itemId:w.itemId,label:w.action,duration:w.duration,action:'tidy',workTarget:w.target,handoff:!!hostHeld(),ready:()=>ledger.work().some(x=>x.id===w.itemId&&x.cycle===w.cycle&&x.stage===w.kind),onDone:()=>{if(!finish(w,HOST))return false;onComplete(w.itemId,'omamori-'+w.kind);return true;}});}
 function releaseDuty(id){if(desired!==id)return desired===null&&!ledger.duty();if(held()&&!near(player()?.root.position,WORK,.3))return false;if(!ledger.releaseDuty(id))return false;desired=null;paused=false;step=null;return true;}
 function update(dt){if(disposed)return;if(desired&&!paused&&(!inWorkplace()||mounted())){if(!ledger.duty()||ledger.pauseDuty(desired)){step=null;paused=true;}}
  if(meeting||desired&&!paused&&!covering())recall();if(desired&&!paused&&!covering()&&meetingReady())ledger.claimDuty(desired);
  if(step){const w=step;if(!dutyActive(w.receiptId)||mounted()||!near(player()?.root.position,w.position,.25))step=null;else if(!player().walking){player().root.rotation.y=Math.atan2(w.target[0]-player().root.position.x,w.target[2]-player().root.position.z);w.elapsed+=Math.min(.1,Math.max(0,dt));if(w.elapsed>=w.duration&&finish(w,'player',w.receiptId)){onComplete(w.itemId,'omamori-'+w.kind);step=null;}}}scheduleNPC();}
 function syncVisual(){const items=ledger.state().items;for(const o of objects){const x=items.find(x=>x.id===o.id),n=o.node,carrier=x.stage==='viewing'?player():x.owner==='player'?player():x.owner===HOST?host:null;n.position.copy(o.position);n.rotation.copy(o.rotation);if(carrier){carrier.root.updateWorldMatrix(true,true);const hands=carrier.root.userData.hands,p=new THREE.Vector3();if(hands?.length>=2)p.copy(hands[0].getWorldPosition(new THREE.Vector3())).add(hands[1].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);else p.copy(carrier.root.position).add(new THREE.Vector3(0,1.1,.3));n.parent.updateWorldMatrix(true,false);n.position.copy(n.parent.worldToLocal(p));n.rotation.set(0,carrier.root.rotation.y,0);}else if(x.stage!=='clean')n.rotation.z+=.15;}}
 const endViewing=()=>!ledger.state().items.some(x=>x.stage==='viewing')||ledger.endViewing();
 return {registry:REG.slice(),connect(next){options={...options,...next};return this;},update,syncVisual,meetingReady,workIntent,workChoices:choices,executeWork,
  beginViewing:()=>!mounted()&&near(player()?.root.position,FRONT,1.1)&&ledger.beginViewing(),endViewing,
  requestMeeting(v){meeting=!!v;},holdDuty(id){desired=id;paused=true;},claimDuty(id){if(disposed||desired&&desired!==id||!this.canClaimDuty())return false;desired=id;paused=false;return true;},
  canClaimDuty:()=>!ledger.state().loadError&&!ledger.state().items.some(x=>x.stage==='viewing')&&!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),canEndDuty:id=>desired===id&&!step&&!held(),releaseDuty,inWorkplace,dutyActive,
  holdsHost:()=>!!(meeting||desired&&!paused&&!covering()||hostHeld()),isCovering:covering,coversWorker:(id,kind=null)=>id===HOST&&covering()&&(!kind||kind==='local'),blocksWorker:id=>id===HOST&&!!(meeting||desired&&!paused&&!covering()||hostHeld()||taskOf(host)?.omamoriWork),
  idlePoint:id=>id===HOST&&covering()&&!relief()?[5.9,0,30.3]:null,idleTask:id=>id===HOST&&!relief()?{duration:4,face:TARGET,label:covering()?'御守照料已交班 · '+label():label()}:null,
  workReceipts:id=>ledger.receipts(id),isActing:()=>!!step,held:()=>!!held(),actor:player,stopWorkAction(){step=null;},returnPosition:()=>WORK.slice(),workLabel:()=>ledger.state().loadError?'御守记录异常 · 请保留原存档':step?.action||(paused?'御守班已暂停 · 当面接回':label()),
  playerPose:()=>step||held()?{action:step?'tidy':null,workTarget:step?.target.slice(),station:step?{workTarget:step.target.slice()}:null,handoff:!!held()}:null,
  dutyState:()=>({receiptId:desired,status:paused?'paused':ledger.duty()?.status||(desired?'draining':'inactive'),step:step?structuredClone(step):null,held:held()?.id||null}),snapshot:()=>({version:1,desired,paused}),restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!desired;step=null;return true;},dispose(){disposed=true;step=null;}
 };
}
