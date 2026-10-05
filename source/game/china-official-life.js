import {captureWorldRuntime,restoreWorldRuntime} from './world-continuity.js';
import {formatCourtEdictText} from './china-court-reports.js';
import {createLifeDecisions} from './npc-life-decisions.js';
import {blocked,canTraverse} from './navigation.js';
import {CHINA_OFFICIAL_BUREAU as B,isChinaOfficialUpperFloor} from './china-official-bureau.js';

const point=a=>({x:a[0],y:a[1],z:a[2]}),near=(p,a,r=.14)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.32;
const TAVERN_UP=[[14,.115,13.8],[16.9,.215,14.1],[17.55,.215,13.8],[17.55,2.115,9.2],[19.95,2.115,9.2],[19.95,4.015,14.1],[17.55,4.015,14.1],[17.55,5.915,9.2],[19.95,5.915,9.2],[19.95,7.815,14.1],[22.5,7.815,14.2]];
const reverse=a=>a.slice().reverse().map(p=>p.slice());
// Real clear east-bank standing places, outside the numbered-edict leaf basket.
export const CHINA_OFFICIAL_GARDEN_PLACES=Object.freeze([[11.7,.145,-14.4],[9.2,.145,-14.4],[10.45,.145,-14.4],[8.5,.115,-13.1],[10,.115,-13.1],[11.7,.115,-13.1]]);

// This controller owns the officials' personal time. Court borrows an
// official after a safe furniture exit; it never adds personal summon delays,
// creates, removes, teleports or animates a second emperor.
export function createChinaOfficialLife({officials,npcs,lot,furniture,doors,planPath,poseContext,travel,safety,reports,economy=null,sharedNeeds=null,getTavern=()=>null,getClock=()=>({day:0}),worldSeed=1,saved={},saveState=()=>{},beginInteraction=()=>null,onInteraction=()=>{},record=()=>{}}){
 if(!furniture)return null;
 const navigation={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4,radius:.25};
 const stages=new Map(),duties=JSON.parse(JSON.stringify(saved.duties||{})),unpaidDuties=JSON.parse(JSON.stringify(saved.unpaidDuties||[])),brain=createLifeDecisions({worldSeed,actorIds:officials.map(n=>n.station.id),sharedNeeds,saved:saved.decisions,onChange:()=>save()}),claims=furniture.facilities;
 let state={},time=0,ready=false,nextPayrollAt=0,conversation=null;
 const seat=id=>furniture.items.find(m=>m.id===id),index=n=>officials.indexOf(n),tell=(n,label)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=formatCourtEdictText(label);};
 const snapshot=()=>({version:1,duties:JSON.parse(JSON.stringify(duties)),unpaidDuties:JSON.parse(JSON.stringify(unpaidDuties)),decisions:brain.snapshot(),positions:Object.fromEntries(officials.map(n=>[n.station.id,n.root.position.toArray()])),runtime:captureWorldRuntime({time,conversation,stages:[...stages].map(([n,s])=>[n.station.id,s])})});
 function save(){if(ready)return saveState(snapshot());}
 const occupied=(id,n)=>state.facilityId===id||claims.state().some(f=>f.id===id&&(f.player||f.reservations.some(r=>r.actor!==n.station.id)));
 const stage=(path,label,options={})=>({path:path.map(a=>a.slice()),label,index:0,arrived:false,planned:false,stalled:0,retries:0,elapsed:0,...options});
 function publicExit(p){
  const bureau=isChinaOfficialUpperFloor(p)||p.y>.25&&p.x>26.1&&p.z>30&&p.z<36.7;
  const route=bureau?B.stairRoute:p.y>.5&&p.x>15&&p.z<23?TAVERN_UP:null;
  if(!route)return [];
  const remaining=reverse(route.filter(a=>a[1]<=p.y+.25));let closest=.65,start=0;
  // A summons may interrupt someone halfway through a landing or stair.
  // Continue toward the public end instead of ordering him back to the room
  // entrance that is now occupied by the people following him.
  for(let i=0;i<remaining.length-1;i++){
   const a=remaining[i],b=remaining[i+1],dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],length=dx*dx+dy*dy+dz*dz;
   const t=length?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy+(p.z-a[2])*dz)/length)):0;
   const distance=Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy,p.z-a[2]-t*dz);
   if(distance<closest&&canTraverse(p,point(b),lot.colliders.concat(doors?.planningColliders||[]),navigation)){closest=distance;start=i+1;}
  }
  return remaining.slice(start);
 }
 function publicRoute(n,target){
  const from=n.root.position,to=target?point(target):null;
  if(to&&isChinaOfficialUpperFloor(to))return isChinaOfficialUpperFloor(from)?[target]:[...publicExit(from),...B.stairRoute,target];
  if(to&&to.y>7&&to.x>15&&to.z<23)return from.y>7&&from.z<23?[target]:[...publicExit(from),...TAVERN_UP,target];
  return [...publicExit(from),...(target?[target]:[])];
 }
 function candidates(n){
  const i=index(n),bed=seat(B.beds[i]),listen=seat('china-tavern-listening-'+(i%2?20.65:17.5)),experience=brain.experience(n.station.id),partners=!conversation&&experience&&[1,2].every(slot=>!occupied('cn-official-garden-place-'+slot,n))?officials.filter(other=>other!==n&&idleEligible(other)&&Math.abs(other.root.position.y-n.root.position.y)<.4&&other.root.position.distanceTo(n.root.position)<6.5&&canTraverse(n.root.position,other.root.position,lot.colliders.concat(doors?.planningColliders||[]),navigation)):[];
  const inspection=i===0?reports?.inspection():null,duty=duties[n.station.id];
  return [
   ...(duty?.stage==='awaiting-archive'&&duty.day===getClock().day?[{id:'archive-duty',label:'回本署核对今日朝班凭记 · 归档后领俸',base:10,point:B.offices[i],workTarget:B.workTargets[i],action:'calligraphy',duration:[8,8],cooldown:0,relief:{},dutyDay:duty.day}]:[]),
   ...(inspection?[{id:'inspect',label:inspection.label,base:8,point:inspection.point,look:inspection.look,action:'read',duration:[5,9],cooldown:15,inspection,relief:{}}]:[]),
   {id:'work',label:n.station.workLabel||(i?'核对来文 · 编排下一次奏事':'整理工务文书 · 核对执行回执'),base:1.2,traits:{quiet:.4},needs:{fatigue:-.6},duration:[15,27],cooldown:22,relief:{social:.02},point:B.offices[i],action:'calligraphy',workTarget:B.workTargets[i]},
   {id:'read',label:'官署静读 · 看一会儿书卷',experience:{kind:'read',label:'方才在官署读过书卷'},base:.18,traits:{curiosity:.7,quiet:.8},needs:{fatigue:.2},duration:[10,18],cooldown:50,relief:{fatigue:-.10},point:B.offices[i],action:'read'},
   {id:'rest',label:'回自己的值宿室歇息',base:.05,traits:{quiet:.25},needs:{fatigue:3.5},duration:[18,32],cooldown:90,relief:{fatigue:-.7},point:bed?.position,mount:bed,facilityId:bed?.id,roomId:B.privateRoomIds?.[i]??(i<2?B.roomIds[i]:null)},
   {id:'meal',label:'去云来酒楼自费吃饭',base:.04,traits:{appetite:.3},needs:{hunger:3.7},duration:[0,0],cooldown:12,relief:{},point:[14,.115,13.8],meal:true,available:!!sharedNeeds?.status(n.station.id)?.seekMeal&&!!getTavern()?.officialMealAvailable(n.station.id)},
   {id:'garden',label:'沿东侧庭院散步赏荷',experience:{kind:'garden',label:'方才在东岸看过荷塘'},base:.13,traits:{outdoors:1.1},needs:{fatigue:-.5,social:.25},duration:[9,18],cooldown:65,relief:{fatigue:-.10,social:-.12},point:CHINA_OFFICIAL_GARDEN_PLACES[i],facilityId:'cn-official-garden-place-'+i,look:[0,.2,-18]},
   {id:'listen',label:'自愿去云来楼听诗乐',base:.09,traits:{curiosity:.65,sociability:.9},needs:{social:1.25,fatigue:-.4},duration:[14,24],cooldown:120,relief:{social:-.5},point:listen?.position,mount:listen,facilityId:listen?.id,upstairs:true},
   {id:'conversation',label:'邀请闲下来的同僚到荷庭聊聊',base:.09,traits:{sociability:1.1},needs:{social:1.8},duration:[9,13],cooldown:90,relief:{},point:CHINA_OFFICIAL_GARDEN_PLACES[1],experienceId:experience?.id,targets:partners.map(other=>({id:other.station.id,relationship:{target:other.station.id,weight:.9,opinionWeight:.9}}))}
  ].map(c=>({...c,available:c.available!==false&&!!c.point&&(!c.facilityId||!occupied(c.facilityId,n))&&(!c.roomId||!occupied(c.roomId,n))}));
 }
 function urgent(n){const need=sharedNeeds?.status(n.station.id);return !!need?.seekMeal||!!need?.seekToilet||brain.fatigued(n.station.id)||duties[n.station.id]?.stage==='awaiting-archive'||index(n)===0&&!!reports?.inspection();}
 function idleEligible(n){const s=stages.get(n);return !!s?.idle&&!s.called&&!s.courtReady&&!s.borrowed&&!s.mount&&state.conversationActorId!==n.station.id&&state.meetingActorId!==n.station.id&&state.performing!==n.station.id&&!urgent(n)&&brain.canReply(n.station.id);}
 function idle(n,label='手边事情告一段落 · 在原处歇一会儿'){
  brain.defer(n.station.id,12);stages.set(n,stage([n.root.position.toArray()],label,{idle:true,arrived:true,duration:12}));n.route=[];
 }
 function invitation(n,choice){
  const other=officials.find(a=>a.station.id===choice.targetId),slots=[1,2],places=slots.map(i=>'cn-official-garden-place-'+i);
  if(!other||!idleEligible(other)||urgent(n)||conversation||places.some(id=>occupied(id,n)))return false;
  // Route validation is bounded to the selected pair, at this opportunity.
  const paths=[n,other].map((actor,i)=>publicRoute(actor,CHINA_OFFICIAL_GARDEN_PLACES[slots[i]]));
  for(const [i,actor]of[n,other].entries()){let from=actor.root.position;for(const to of paths[i]){if(!near(from,to)&&!planPath(from,point(to),.25)?.length)return false;from=point(to);}}
  const result=brain.invite(n.station.id,choice);
  if(!result.ok)return false;
  if(result.status==='declined'){idle(n,'同僚想独处 · 彼此留些余暇');const existing=stages.get(other);if(existing)existing.label='这会儿想独处，改日再聊';record('conversation-declined:'+result.id,other);save();return true;}
  conversation={id:result.id,participants:result.participants,topic:result.experience.kind,responses:result.responses,elapsed:0,age:0,lastAt:time,duration:choice.duration,phase:'invited'};
  for(const [i,actor]of[n,other].entries()){
   if(!claims.reserve(places[i],actor.station.id,{purpose:'conversation'})){endConversation(false,'位置被占，改日再聊');return true;}
   stages.set(actor,stage(paths[i],i?'应邀去荷庭 · 聊聊刚才的见闻':'约好去荷庭 · 聊聊刚才的见闻',{id:'life-conversation',pairId:result.id,choice:{id:'conversation',action:'relax',targetId:result.participants[1-i],duration:choice.duration},duration:choice.duration,facilityId:places[i]}));actor.route=[];
  }
  record('conversation-accepted:'+result.id,n);if(save()===false)endConversation(false,'稍后再聊');return true;
 }
 function endConversation(fulfilled,label='各自先忙，改日再聊'){
  const pair=conversation;if(!pair)return;const actors=pair.participants.map(id=>officials.find(n=>n.station.id===id)).filter(Boolean);
  const result=fulfilled?brain.finishConversation(pair.id,{elapsed:pair.elapsed,arrived:actors.filter(n=>stages.get(n)?.arrived).map(n=>n.station.id)}):null;
  if(!result?.ok)brain.cancelConversation(pair.id);
  conversation=null;
  for(const n of actors){const s=stages.get(n);claims.releaseActor(n.station.id);n.route=[];n.walking=false;
   if(s?.called)stages.set(n,{courtReady:true,label:'应召赴朝 · 已结束闲谈'});
   else{const feeling=result?.event?.results?.find(r=>r.actorId===n.station.id)?.feeling;idle(n,feeling==='appreciated'?'这一席话很投缘，下回再聊':feeling==='mismatched'?'各有所好，今日先聊到这里':result?.ok?'聊过几句，各自继续日常':label);}
  }
  record('conversation-'+(result?.ok?'completed':'cancelled')+':'+pair.id,actors[0]);save();
 }
 function updateConversation(n,s,dt,t){
  const pair=conversation;if(!pair||pair.id!==s.pairId){brain.complete(n.station.id,s.choice,{fulfilled:false});claims.releaseActor(n.station.id);idle(n);return;}
  const actors=pair.participants.map(id=>officials.find(a=>a.station.id===id));
  if(actors.some(a=>!a||stages.get(a)?.called||urgent(a)||state.conversationActorId===a.station.id||state.meetingActorId===a.station.id||state.performing===a.station.id)){endConversation(false);return;}
  const step=Math.max(0,time-pair.lastAt);pair.lastAt=time;pair.age+=step;
  if(pair.age>150){endConversation(false,'路上耽搁了，改日再聊');return;}
  n.walking=false;if(!s.arrived)travel(n,s,dt);
  const both=actors.every(a=>stages.get(a)?.arrived),other=actors.find(a=>a!==n);
  if(both){
   const starting=pair.phase!=='talking',newInteraction=!Object.hasOwn(pair,'interaction');
   if(starting){pair.phase='talking';record('conversation-talking:'+pair.id,n);}
   // One serial stream for this controller, separate from player greetings.
   // The token and cumulative spoken seconds travel with the pair checkpoint.
   // Older in-progress conversations begin at zero; never invent past contact.
   if(newInteraction){const event=beginInteraction(pair.participants.slice());pair.interaction=event?{...event,participants:[...event.participants],duration:0}:null;}
   if(starting||newInteraction)save();
   // The frame that finishes the walk establishes contact, but contributes no
   // walking time. Only subsequent shared talking intervals can add exposure.
   const spoken=starting?0:Math.max(0,Math.min(step,pair.duration-pair.elapsed));pair.elapsed+=spoken;
   if(pair.interaction&&spoken>0){pair.interaction.duration+=spoken;onInteraction({...pair.interaction,participants:[...pair.interaction.participants]});}

   const p=other.root.position;n.root.rotation.y=Math.atan2(p.x-n.root.position.x,p.z-n.root.position.z);
   const opening=pair.topic==='read'?'方才读过书卷，想听听你的喜好':'方才看过荷塘，想听听你的喜好';
   const response=pair.responses?.[n.station.id];
   s.label=pair.elapsed<3?(n===actors[0]?opening:'愿闻其详'):pair.elapsed<6?(n===actors[1]?(response==='appreciated'?'我也喜欢这样的闲暇':response==='mismatched'?'我更喜欢别的消遣':'各有趣味，听你说说'):'你平日更喜欢什么？'):(n===actors[0]?'原来你是这样想的':'改日有空再聊');
   if(pair.elapsed>=pair.duration){endConversation(true);return;}
  }else s.label=s.arrived?'在荷庭等已应邀的同僚':'已相约荷庭 · 正沿公共通道前往';
  tell(n,s.label);animate(n,s,t,both?other:null);
 }
 function release(n,s){if(s?.mount){const landing=furniture.standPoint(navigation,safety(n),s.mount);if(!landing)return false;n.root.position.copy(landing);s.mount=null;}claims.releaseActor(n.station.id);return true;}
 function finish(n,s,fulfilled=true){if(s?.borrowed&&getTavern()?.officialMeal(n.station.id))return false;if(fulfilled&&s?.choice?.id==='archive-duty'){const duty=duties[n.station.id];if(duty?.day===getClock().day&&duty.day===s.choice.dutyDay&&near(n.root.position,B.offices[index(n)],.2)&&s.elapsed>=8){duty.stage='archived';settleDuty(n);}}if(fulfilled&&s?.choice?.inspection)fulfilled=reports.inspected(s.choice.inspection.id,{actorId:n.station.id,position:n.root.position.toArray(),place:s.choice.inspection.place});if(!release(n,s))return false;if(s?.choice)brain.complete(n.station.id,s.choice,{fulfilled});record('life-'+(s?.choice?.id||'pause')+(fulfilled?':completed':':interrupted'),n);stages.delete(n);save();return true;}
 function choose(n){
  if(!brain.decisionDue(n.station.id)){if(!stages.has(n))idle(n);return;}
  const options=candidates(n),priority=options.find(c=>c.id==='archive-duty')||options.find(c=>c.id==='inspect')||(sharedNeeds?.status(n.station.id)?.seekMeal?options.find(c=>c.id==='meal'&&c.available):null),choice=brain.choose(n.station.id,priority?[priority]:options,state.hour??10);
  if(!choice){stages.set(n,stage([n.root.position.toArray()],'在廊下稍候',{duration:6}));return;}
  if(choice.id==='conversation'){if(!invitation(n,choice)){brain.complete(n.station.id,choice,{fulfilled:false});idle(n,'同僚正在忙，稍后再说');}return;}
  if(choice.facilityId&&!claims.reserve(choice.facilityId,n.station.id,{purpose:choice.id})||choice.roomId&&!claims.reserve(choice.roomId,n.station.id,{purpose:'private-rest'})){claims.releaseActor(n.station.id);brain.complete(n.station.id,choice,{fulfilled:false});return;}
  const path=publicRoute(n,choice.point);
  stages.set(n,stage(path,choice.label,{id:'life-'+choice.id,arrived:path.length===1&&near(n.root.position,path[0]),choice,duration:choice.duration,mountTarget:choice.mount,roomId:choice.roomId,waiting:0}));n.route=[];record('life-'+choice.id,n);save();
 }
 function animate(n,s,t,partner=null){
  const c=poseContext(n,s.choice?.workTarget?{workTarget:s.choice.workTarget}:null);c.handoff=false;c.heldProp=null;c.seatedMeal=false;if(partner)c.headLook={yaw:Math.sin(t*.7)*.06,pitch:-.025,weight:.9};
  if(s.mount){const m=s.mount;c.seatHeight=m.seatY===undefined?undefined:m.seatY-n.root.position.y-c.visualFloorOffset;if(m.kind==='bed'){c.visualFloorOffset=0;c.supportY=m.supportY;c.lieSupport=m.lieSupport;c.lieOffset=m.lieOffset;c.lieSurfaceHeightAt=(x,z)=>furniture.bedSupportAt(m,x,z);}}
  const paused=state.conversationActorId===n.station.id;
  n.animate(t+n.phase,n.walking,s.mount?(s.mount.kind==='bed'?'lie-rest':'chair-sit'):s.arrived&&!paused?s.choice?.action||null:null,c);
 }
 for(const n of officials){const p=saved.version===1?saved.positions?.[n.station.id]:null;if(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&!blocked(p[0],p[2],lot.colliders,.25,{...navigation,y:p[1]}))n.root.position.set(...p);}
 function settleDuty(n,duty=duties[n.station.id]){if(duty?.stage!=='archived'||duty.day>getClock().day)return;const result=economy?.completeDuty({actorId:n.station.id,day:duty.day,receiptId:`cn-official-duty:${n.station.id}:${duty.day}`,evidence:{kind:'office-work',completed:true,actorId:n.station.id,day:duty.day,elapsed:8,duration:8,audienceDay:duty.day,audienceCompleted:true}});if(result?.ok)duty.stage='paid';}
 // R96 bank journeys are retired on load, preserving the actor's real position
 // and any already-committed withdrawal. No cash move is replayed by migration.
 function retireBankJourney(n,s){
  const legacy=s.choice?.withdraw||s.bankCounter!==undefined||s.bankDone!==undefined||s.withdrawReceipt||s.choice?.facilityId==='cn-money-house-public-counter';
  if(!legacy)return;
  claims.release?.('cn-money-house-public-counter',n.station.id);
  for(const key of ['bankCounter','bankDone','bankElapsed','withdrawReceipt'])delete s[key];
  if(s.choice){delete s.choice.withdraw;if(s.choice.facilityId==='cn-money-house-public-counter')delete s.choice.facilityId;s.choice.point=[14,.115,13.8];s.choice.label='去云来酒楼自费吃饭';}
  if(!s.borrowed){s.path=publicRoute(n,[14,.115,13.8]);s.index=0;s.arrived=false;s.planned=false;s.stalled=0;s.label='去云来酒楼自费吃饭';n.route=[];}
 }
 function restore(snapshot){const data=restoreWorldRuntime(snapshot?.runtime,{npcs,furniture});if(!data?.stages)return false;time=Math.max(0,data.time||0);if(snapshot.duties){for(const id of Object.keys(duties))delete duties[id];Object.assign(duties,JSON.parse(JSON.stringify(snapshot.duties)));}if(snapshot.unpaidDuties)unpaidDuties.splice(0,unpaidDuties.length,...JSON.parse(JSON.stringify(snapshot.unpaidDuties)));stages.clear();conversation=data.conversation||null;for(const[id,s]of data.stages){const n=officials.find(n=>n.station.id===id);if(!n)continue;if(getTavern()?.officialMeal(n.station.id))s.borrowed=true;retireBankJourney(n,s);if(s.choice?.meal&&!s.borrowed&&s.choice.facilityId?.startsWith('china-palace-dining-')){if(s.mount){s.mountTarget=null;s.evicted=true;}else continue;}stages.set(n,{...s,planned:false,stalled:0});n.route=[];if(!s.borrowed)n.serviceMount=null;for(const id of [s.facilityId,s.choice?.facilityId,s.roomId].filter(Boolean))claims.reserve(id,n.station.id,{purpose:s.choice?.id||'resumed'});if(s.mount)claims.occupy(s.mount.id,n.station.id);}if(conversation){const event=brain.conversation(conversation.id);if(event?.status!=='accepted'||!conversation.participants.every(id=>stages.get(officials.find(n=>n.station.id===id))?.pairId===conversation.id&&claims.reservation(stages.get(officials.find(n=>n.station.id===id)).facilityId,id)))endConversation(false);else conversation.lastAt=time;}for(const n of officials){const current=brain.state(n.station.id)?.current;if(current?.conversationId&&!conversation){brain.cancelConversation(current.conversationId);claims.releaseActor(n.station.id);idle(n);}}return true;}
 ready=true;if(!restore(saved))for(const n of officials)choose(n);
 return {
  courtCompleted(day){for(const n of officials){const previous=duties[n.station.id];if(previous?.day===day)continue;if(previous?.stage==='archived'&&!unpaidDuties.some(d=>d.actorId===n.station.id&&d.day===previous.day))unpaidDuties.push({actorId:n.station.id,...previous});duties[n.station.id]={day,stage:'awaiting-archive'};}save();},
  request(n){const s=stages.get(n);if(s)s.called=true;if(s?.pairId)endConversation(false);},
  cancelCourt(n){const s=stages.get(n);if(s?.courtReady){stages.delete(n);choose(n);}else if(s)s.called=false;},
  courtPlan(n){const s=stages.get(n),landing=s?.mount?furniture.standPoint(navigation,safety(n),s.mount):n.root.position;return {reachable:!!landing,position:landing||n.root.position,path:publicRoute(n,null).filter(Boolean),safeExitSeconds:s?.mount?2:0,doorSeconds:4};},
  ready(n){return stages.get(n)?.courtReady===true;},
  resume(n){if(stages.get(n)?.pairId)endConversation(false);stages.delete(n);n.route=[];choose(n);},
  playerRequest(id){for(const n of officials){const s=stages.get(n);if(s?.choice?.facilityId===id||s?.facilityId===id){s.evicted=true;if(s.pairId)endConversation(false,'让出位置，改日再聊');}}},
  meetingAvailable:n=>{const s=stages.get(n);return !!s&&s.arrived&&!s.pairId&&!s.called&&!s.courtReady&&!s.mount&&!s.borrowed&&!s.choice?.meal&&!s.choice?.inspection&&s.choice?.id!=='archive-duty';},
  label:n=>formatCourtEdictText(stages.get(n)?.label)||'承务官署 · 日常起居',
  tick(dt,playerState){state=playerState;time+=dt;brain.tick(dt);if(time>=nextPayrollAt){nextPayrollAt=time+5;for(const n of officials)settleDuty(n);for(const duty of unpaidDuties){const n=officials.find(n=>n.station.id===duty.actorId);if(n)settleDuty(n,duty);}for(let i=unpaidDuties.length-1;i>=0;i--)if(unpaidDuties[i].stage==='paid')unpaidDuties.splice(i,1);}},
  update(n,dt,t){
   let s=stages.get(n);if(!s){choose(n);s=stages.get(n);if(!s)return;}
   if(s.pairId){updateConversation(n,s,dt,t);return;}
   if(getTavern()?.officialMeal(n.station.id))s.borrowed=true;
   if(s.borrowed){const tavern=getTavern(),lease=tavern?.officialMeal(n.station.id);if(lease){if(s.called&&state.conversationActorId!==n.station.id)tavern.cancelOfficialMeal(n.station.id);if(tavern.officialMeal(n.station.id))return;}if(finish(n,s,!s.called)){if(s.called)stages.set(n,{courtReady:true,label:'已归还酒楼餐位 · 应召赴朝'});else idle(n);}return;}
   n.walking=false;if(s.courtReady)return;
   const paused=state.conversationActorId===n.station.id;tell(n,s.label+(paused?state.meetingActorId===n.station.id?' · 等候当面审核':' · 停步与你交谈':''));
   if(s.evicted&&!paused){if(finish(n,s,false)){if(s.called)stages.set(n,{courtReady:true,label:'让出卧榻后应召赴朝'});else choose(n);}return;}
   // Everyone receives the same advance summons. Only real conversation or a
   // blocked safe furniture exit can delay departure from the current place.
   if(s.called&&!paused){
    if(finish(n,s,false)){stages.set(n,{courtReady:true,label:'接到朝议召集 · 从当前位置赴殿'});n.route=[];}return;
   }
   if(!paused){
    if(s.idle){s.elapsed+=dt;if(urgent(n)||s.elapsed>=s.duration){stages.delete(n);choose(n);}else animate(n,s,t);return;}
    if(!s.arrived)travel(n,s,dt);
    if(s.arrived){
     if(s.choice?.meal){const tavern=getTavern();if(tavern?.requestOfficialMeal(n.station.id)){s.borrowed=true;n.route=[];save();return;}if(finish(n,s,false))choose(n);return;}
     if(s.mountTarget&&!s.mount){const m=s.mountTarget;if(!occupied(m.id,n)&&(m.kind==='bed'?furniture.canUse(navigation,safety(n),m):furniture.canSit(navigation,safety(n),m))){n.root.position.set(...m.anchor);n.root.rotation.y=m.yaw;s.mount=m;claims.occupy(m.id,n.station.id);if(s.roomId)claims.occupy(s.roomId,n.station.id);record('life-'+s.choice.id+':mounted',n);}else{s.waiting+=dt;if(s.waiting>15&&finish(n,s,false))choose(n);animate(n,s,t);return;}}
     const partner=s.choice?.partner,partnerPresent=!partner||Math.abs(partner.root.position.y-n.root.position.y)<.4&&partner.root.position.distanceTo(n.root.position)<2.2;
     const look=partnerPresent&&partner?partner.root.position:s.choice?.look?point(s.choice.look):s.choice?.workTarget?point(s.choice.workTarget):null;if(look&&!s.mount)n.root.rotation.y=Math.atan2(look.x-n.root.position.x,look.z-n.root.position.z);
     s.elapsed+=dt;if(s.elapsed>=s.duration&&!s.called){if(finish(n,s,partnerPresent))idle(n);}
    }
   }
   animate(n,stages.get(n)||s,t);
  },
  restore,mountForActor:n=>stages.get(n)?.mount||null,
  state:()=>({decisions:brain.snapshot(),conversation:conversation?JSON.parse(JSON.stringify(conversation)):null,actors:officials.map(n=>{const s=stages.get(n);return {id:n.station.id,activity:s?.choice?.id||null,stage:s?.courtReady?'court-ready':s?.arrived?'activity':'travel',arrived:s?.arrived||false,elapsed:s?.elapsed||0,mounted:s?.mount?.id||null,borrowed:!!s?.borrowed,duty:duties[n.station.id]||null,roomId:s?.roomId||null,called:!!s?.called,position:n.root.position.toArray()};})}),snapshot,
  dispose({suspend=false}={}){brain.dispose();if(!suspend)save();for(const n of officials){claims.releaseActor(n.station.id);}}
 };
}
