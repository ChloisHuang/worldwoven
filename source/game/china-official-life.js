import {bedAvailable,reserveNpcBed,occupyNpcBed} from './npc-bed-occupancy.js';
import {TAVERN_LAYOUT_VERSION as LAYOUT_VERSION} from './china-tavern-layout.js';
import {CHINA_PUBLIC_TOILET as PUBLIC_TOILET} from './china-public-toilet.js';
import {findActorStandPoint} from './actor-navigation.js';
import {captureWorldRuntime,restoreWorldRuntime} from './world-continuity.js';
import {formatCourtEdictText} from './china-court-reports.js';
import {createLifeDecisions} from './npc-life-decisions.js';
import {blocked,canTraverse} from './navigation.js';
import {CHINA_OFFICIAL_BUREAU as B,isChinaOfficialUpperFloor} from './china-official-bureau.js';
import {CHINA_OFFICIAL_SALON_MEAL_MINIMUM} from './china-official-economy.js';
import {SALON_ARTISTS,SALON_ACTIVITIES} from './china-tavern-salon-artists.js';

const point=a=>({x:a[0],y:a[1],z:a[2]}),near=(p,a,r=.14)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.32;
const TAVERN_UP=[[14,.115,8.8],[16.9,.215,9.1],[17.55,.215,8.8],[17.55,2.115,4.2],[19.95,2.115,4.2],[19.95,4.015,9.1],[17.55,4.015,9.1],[17.55,5.915,4.2],[19.95,5.915,4.2],[19.95,7.815,9.1],[22.5,7.815,9.2]];
const SALON_RECEPTION_POINT=Object.freeze([24.15,7.815,7.65]);
const reverse=a=>a.slice().reverse().map(p=>p.slice());
// Real clear east-bank standing places, outside the numbered-edict leaf basket.
export const CHINA_OFFICIAL_GARDEN_PLACES=Object.freeze([[11.7,.145,-14.4],[9.2,.145,-14.4],[10.45,.145,-14.4],[8.5,.115,-13.1],[10,.115,-13.1],[11.7,.115,-13.1]]);

// This controller owns the officials' personal time. Court borrows an
// official after a safe furniture exit; it never adds personal summon delays,
// creates, removes, teleports or animates a second emperor.
export function createChinaOfficialLife({officials,npcs,lot,furniture,doors,planPath,poseContext,travel,safety,reports,economy=null,sharedNeeds=null,getTavern=()=>null,getToilet=()=>null,getSalon=()=>null,getClock=()=>({day:0}),worldSeed=1,saved={},saveState=()=>{},beginInteraction=()=>null,onInteraction=()=>{},record=()=>{}}){
 if(!furniture)return null;
 const navigation={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4,radius:.25};
 const stages=new Map(),duties=JSON.parse(JSON.stringify(saved.duties||{})),unpaidDuties=JSON.parse(JSON.stringify(saved.unpaidDuties||[])),brain=createLifeDecisions({worldSeed,actorIds:officials.map(n=>n.station.id),sharedNeeds,saved:saved.decisions,onChange:()=>save()}),claims=furniture.facilities;
 let state={},time=0,ready=false,nextPayrollAt=0,conversation=null;
 const seat=id=>furniture.items.find(m=>m.id===id),index=n=>officials.indexOf(n),tell=(n,label)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=formatCourtEdictText(label);};
 const snapshot=()=>({version:1,layoutVersion:LAYOUT_VERSION,duties:JSON.parse(JSON.stringify(duties)),unpaidDuties:JSON.parse(JSON.stringify(unpaidDuties)),decisions:brain.snapshot(),positions:Object.fromEntries(officials.map(n=>[n.station.id,n.root.position.toArray()])),runtime:captureWorldRuntime({time,conversation,stages:[...stages].map(([n,s])=>[n.station.id,s])})});
 function save(){if(ready)return saveState(snapshot());}
 const occupied=(id,n)=>seat(id)?.kind==='bed'?!bedAvailable(furniture,seat(id),n.station.id,state.facilityId):state.facilityId===id||claims.state().some(f=>f.id===id&&(f.player||f.reservations.some(r=>r.actor!==n.station.id)));
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
  if(to&&to.y>3.5&&to.y<4.5&&to.x>15&&to.z<23)return from.y>3.5&&from.y<4.5&&from.x>15&&from.z<23?[target]:[...publicExit(from),...TAVERN_UP.slice(0,7),target];
  if(to&&to.y>7&&to.x>15&&to.z<23)return from.y>7&&from.z<23?[target]:[...publicExit(from),...TAVERN_UP,target];
  return [...publicExit(from),...(target?[target]:[])];
 }
 // Paid leisure is sampled only by the existing life decision boundary.
 // Quotes come from the real salon; pending wages and held money are absent
 // from the official's settled account. Never manufacture a withdrawal.
 function salonInterruption(n,s=stages.get(n)){
  if(s?.called||s?.courtReady)return 'court-summons';
  if(state.meetingActorId===n.station.id)return 'official-meeting';
  if(s?.pairId||state.conversationActorId===n.station.id||state.performing===n.station.id)return 'conversation';
  if(urgent(n))return 'personal-need-or-duty';
  return null;
 }
 function salonChoices(n){
  if(salonInterruption(n))return [];
  const salon=getSalon(),account=economy?.account?.(n.station.id);
  if(!salon?.npcChoices||!account||![account.cash,account.bank].every(v=>Number.isSafeInteger(v)&&v>=0))return [];
  const funds=account.cash+account.bank;
  return (salon.npcChoices(n.station.id)||[]).filter(q=>Number.isSafeInteger(q.fee)&&q.fee>0&&funds>=q.fee+CHINA_OFFICIAL_SALON_MEAL_MINIMUM&&SALON_ARTISTS.some(a=>a.id===q.artistId&&a.activity===q.activity));
 }
 function candidates(n){
  const i=index(n),bed=seat(B.beds[i]),listen=seat('china-tavern-listening-'+(i%2?20.65:17.5)),experience=brain.experience(n.station.id),partners=!conversation&&experience&&[1,2].every(slot=>!occupied('cn-official-garden-place-'+slot,n))?officials.filter(other=>other!==n&&idleEligible(other)&&Math.abs(other.root.position.y-n.root.position.y)<.4&&other.root.position.distanceTo(n.root.position)<6.5&&canTraverse(n.root.position,other.root.position,lot.colliders.concat(doors?.planningColliders||[]),navigation)):[];
  const inspection=i===0?reports?.inspection():null,duty=duties[n.station.id],salonTargets=salonChoices(n).map(q=>({id:q.artistId+':'+q.activity,choice:{salon:{artistId:q.artistId,activity:q.activity,fee:q.fee},label:'自费'+SALON_ACTIVITIES[q.activity].name+' · '+q.fee+'铜文'}}));
  return [
   ...(duty?.stage==='awaiting-archive'&&duty.day===getClock().day?[{id:'archive-duty',label:'回本署核对今日朝班凭记 · 归档后领俸',base:10,point:B.offices[i],workTarget:B.workTargets[i],action:'calligraphy',duration:[8,8],cooldown:0,relief:{},dutyDay:duty.day}]:[]),
   ...(inspection?[{id:'inspect',label:inspection.label,base:8,point:inspection.point,look:inspection.look,action:'read',duration:[5,9],cooldown:15,inspection,relief:{}}]:[]),
   {id:'work',label:n.station.workLabel||(i?'核对来文 · 编排下一次奏事':'整理工务文书 · 核对执行回执'),base:1.2,traits:{quiet:.4},needs:{fatigue:-.6},duration:[15,27],cooldown:22,relief:{social:.02},point:B.offices[i],action:'calligraphy',workTarget:B.workTargets[i]},
   {id:'read',label:'官署静读 · 看一会儿书卷',experience:{kind:'read',label:'方才在官署读过书卷'},base:.18,traits:{curiosity:.7,quiet:.8},needs:{fatigue:.2},duration:[10,18],cooldown:50,relief:{fatigue:-.10},point:B.offices[i],action:'read'},
   {id:'rest',label:'回自己的值宿室歇息',base:.05,traits:{quiet:.25},needs:{fatigue:3.5},duration:[18,32],cooldown:90,relief:{fatigue:-.7},point:bed?.position,mount:bed,facilityId:bed?.id,roomId:B.privateRoomIds?.[i]??(i<2?B.roomIds[i]:null)},
   {id:'toilet',label:'沿公共楼梯去云来楼净室',base:1,duration:[0,0],cooldown:12,relief:{},point:PUBLIC_TOILET.approach,toilet:true,available:!!sharedNeeds?.status(n.station.id)?.seekToilet&&!!getToilet()?.publicAvailable?.()},
   {id:'meal',label:'去云来酒楼自费吃饭',base:.04,traits:{appetite:.3},needs:{hunger:3.7},duration:[0,0],cooldown:12,relief:{},point:[14,.115,8.8],meal:true,available:!!sharedNeeds?.status(n.station.id)?.seekMeal&&!!getTavern()?.officialMealAvailable(n.station.id)},
   {id:'garden',label:'沿东侧庭院散步赏荷',experience:{kind:'garden',label:'方才在东岸看过荷塘'},base:.13,traits:{outdoors:1.1},needs:{fatigue:-.5,social:.25},duration:[9,18],cooldown:65,relief:{fatigue:-.10,social:-.12},point:CHINA_OFFICIAL_GARDEN_PLACES[i],facilityId:'cn-official-garden-place-'+i,look:[0,.2,-18]},
   {id:'listen',label:'自愿去云来楼免费听席 · 听诗乐',base:.09,traits:{curiosity:.65,sociability:.9},needs:{social:1.25,fatigue:-.4},duration:[14,24],cooldown:120,relief:{social:-.5},point:listen?.position,mount:listen,facilityId:listen?.id,upstairs:true},
   ...(salonTargets.length?[{id:'paid-salon',label:'自费去云来楼单独茶叙',base:.06,traits:{curiosity:.6,sociability:.55,quiet:.45},needs:{social:.65,fatigue:-.6},duration:[0,0],cooldown:120,relief:{},point:SALON_RECEPTION_POINT,targets:salonTargets}]:[]),
   {id:'conversation',label:'邀请闲下来的同僚到荷庭聊聊',base:.09,traits:{sociability:1.1},needs:{social:1.8},duration:[9,13],cooldown:90,relief:{},point:CHINA_OFFICIAL_GARDEN_PLACES[1],experienceId:experience?.id,targets:partners.map(other=>({id:other.station.id,relationship:{target:other.station.id,weight:.9,opinionWeight:.9}}))}
  ].map(c=>({...c,available:c.available!==false&&!!c.point&&(!c.facilityId||!occupied(c.facilityId,n))&&(!c.roomId||!occupied(c.roomId,n))}));
 }
 function urgent(n){const need=sharedNeeds?.status(n.station.id);return !!need?.seekMeal||!!need?.seekToilet||brain.fatigued(n.station.id)||duties[n.station.id]?.stage==='awaiting-archive'||index(n)===0&&!!reports?.inspection();}
 function idleEligible(n){const s=stages.get(n);return !!s?.idle&&!s.called&&!s.courtReady&&!s.borrowed&&!s.borrowedSalon&&!s.mount&&state.conversationActorId!==n.station.id&&state.meetingActorId!==n.station.id&&state.performing!==n.station.id&&!urgent(n)&&brain.canReply(n.station.id);}
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
 function release(n,s){if(s?.mount){const landing=findActorStandPoint(n,s.mount,({ignoreDynamicBodies})=>furniture.standPoint(navigation,ignoreDynamicBodies?[...(doors?.cameraColliders||[])]:safety(n),s.mount,n.collisionRadius??.25));if(!landing)return false;n.root.position.copy(landing);s.mount=null;}claims.releaseActor(n.station.id);return true;}
 function finish(n,s,fulfilled=true){if(getSalon()?.ownsNPCCustomer?.(n.station.id))return false;if(s?.choice?.toilet&&getToilet()?.ownsActor(n))return false;if(s?.borrowed&&getTavern()?.officialMeal(n.station.id))return false;if(fulfilled&&s?.choice?.id==='archive-duty'){const duty=duties[n.station.id];if(duty?.day===getClock().day&&duty.day===s.choice.dutyDay&&near(n.root.position,B.offices[index(n)],.2)&&s.elapsed>=8){duty.stage='archived';settleDuty(n);}}if(fulfilled&&s?.choice?.inspection)fulfilled=reports.inspected(s.choice.inspection.id,{actorId:n.station.id,position:n.root.position.toArray(),place:s.choice.inspection.place});if(!release(n,s))return false;if(s?.choice)brain.complete(n.station.id,s.choice,{fulfilled});record('life-'+(s?.choice?.id||'pause')+(fulfilled?':completed':':interrupted'),n);stages.delete(n);save();return true;}
 function choose(n){
  if(getSalon()?.ownsNPCCustomer?.(n.station.id)){stages.set(n,stage([],getSalon().npcStatus?.(n.station.id)?.label||'单独茶叙进行中',{borrowedSalon:true,arrived:true}));return;}
  if(!brain.decisionDue(n.station.id)){if(!stages.has(n))idle(n);return;}
  const options=candidates(n),priority=options.find(c=>c.id==='archive-duty')||options.find(c=>c.id==='inspect')||options.find(c=>c.id==='toilet'&&c.available)||(sharedNeeds?.status(n.station.id)?.seekMeal?options.find(c=>c.id==='meal'&&c.available):null),choice=brain.choose(n.station.id,priority?[priority]:options,state.hour??10);
  if(!choice){stages.set(n,stage([n.root.position.toArray()],'在廊下稍候',{duration:6}));return;}
  if(choice.toilet&&!getToilet()?.requestPublicActor(n)){brain.complete(n.station.id,choice,{fulfilled:false});idle(n,'公共净室暂忙 · 稍后再去');save();return;}
  if(choice.id==='conversation'){if(!invitation(n,choice)){brain.complete(n.station.id,choice,{fulfilled:false});idle(n,'同僚正在忙，稍后再说');}return;}
  const bed=choice.mount?.kind==='bed',mount=bed?reserveNpcBed(furniture,choice.mount,n.station.id):choice.mount;
  if(bed&&!mount||!bed&&choice.facilityId&&!claims.reserve(choice.facilityId,n.station.id,{purpose:choice.id})||choice.roomId&&!claims.reserve(choice.roomId,n.station.id,{purpose:'private-rest'})){claims.releaseActor(n.station.id);brain.complete(n.station.id,choice,{fulfilled:false});return;}
  const path=publicRoute(n,choice.point);
  stages.set(n,stage(path,choice.label,{id:'life-'+choice.id,arrived:path.length===1&&near(n.root.position,path[0]),choice,duration:choice.duration,mountTarget:mount,roomId:choice.roomId,waiting:0}));n.route=[];record('life-'+choice.id,n);save();
 }
 function animate(n,s,t,partner=null){
  const toiletPose=getToilet()?.actorPose(n);if(toiletPose){n.animate(t+n.phase,false,toiletPose.action,{...poseContext(n),...toiletPose.context});return;}
  const c=poseContext(n,s.choice?.workTarget?{workTarget:s.choice.workTarget}:null);c.handoff=false;c.heldProp=null;c.seatedMeal=false;if(partner)c.headLook={yaw:Math.sin(t*.7)*.06,pitch:-.025,weight:.9};
  if(s.mount){const m=s.mount;c.seatHeight=m.seatY===undefined?undefined:m.seatY-n.root.position.y-c.visualFloorOffset;if(m.kind==='bed'){c.visualFloorOffset=0;c.supportY=m.supportY;c.lieSupport=m.lieSupport;c.lieOffset=m.lieOffset;c.liePillowZ=m.liePillowZ;c.lieSurfaceHeightAt=(x,z)=>furniture.bedSupportAt(m,x,z);}}
  const paused=state.conversationActorId===n.station.id;
  n.animate(t+n.phase,n.walking,s.mount?(s.mount.kind==='bed'?'lie-rest':'chair-sit'):s.arrived&&!paused?s.choice?.action||null:null,c);
 }
 for(const n of officials){const p=saved.version===1&&!getSalon()?.ownsNPCCustomer?.(n.station.id)?saved.positions?.[n.station.id]:null;if(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&!blocked(p[0],p[2],lot.colliders,.25,{...navigation,y:p[1]}))n.root.position.set(...p);}
 function settleDuty(n,duty=duties[n.station.id]){if(duty?.stage!=='archived'||duty.day>getClock().day)return;const result=economy?.completeDuty({actorId:n.station.id,day:duty.day,receiptId:`cn-official-duty:${n.station.id}:${duty.day}`,evidence:{kind:'office-work',completed:true,actorId:n.station.id,day:duty.day,elapsed:8,duration:8,audienceDay:duty.day,audienceCompleted:true}});if(result?.ok)duty.stage='paid';}
 // R96 bank journeys are retired on load, preserving the actor's real position
 // and any already-committed withdrawal. No cash move is replayed by migration.
 function retireBankJourney(n,s){
  const legacy=s.choice?.withdraw||s.bankCounter!==undefined||s.bankDone!==undefined||s.withdrawReceipt||s.choice?.facilityId==='cn-money-house-public-counter';
  if(!legacy)return;
  claims.release?.('cn-money-house-public-counter',n.station.id);
  for(const key of ['bankCounter','bankDone','bankElapsed','withdrawReceipt'])delete s[key];
  if(s.choice){delete s.choice.withdraw;if(s.choice.facilityId==='cn-money-house-public-counter')delete s.choice.facilityId;s.choice.point=[14,.115,8.8];s.choice.label='去云来酒楼自费吃饭';}
  if(!s.borrowed){s.path=publicRoute(n,[14,.115,8.8]);s.index=0;s.arrived=false;s.planned=false;s.stalled=0;s.label='去云来酒楼自费吃饭';n.route=[];}
 }
 function migrateTavernRoute(n,s,snapshot){
  if(snapshot.layoutVersion===LAYOUT_VERSION||s.idle||s.courtReady)return;
  const moved=p=>Array.isArray(p)?TAVERN_UP.find(q=>Math.abs(q[0]-p[0])<1e-6&&Math.abs(q[1]-p[1])<1e-6&&Math.abs(q[2]+5-p[2])<1e-6)||
   (Math.abs(p[0]-PUBLIC_TOILET.approach[0])<1e-6&&Math.abs(p[1]-PUBLIC_TOILET.approach[1])<1e-6&&Math.abs(p[2]-PUBLIC_TOILET.approach[2]-5)<1e-6?PUBLIC_TOILET.approach:null):null;
  const last=s.path?.at(-1),destination=moved(last);
  if(Array.isArray(s.path))s.path=s.path.map(p=>moved(p)?.slice()||p);
  if(s.choice&&moved(s.choice.point))s.choice.point=moved(s.choice.point).slice();
  // Reset only an arrival invalidated by the moved public destination. The
  // actor, activity clock, furniture mount and paid meal lease remain intact.
  if(destination&&s.arrived&&!s.mount&&!s.borrowed&&!s.borrowedSalon&&!near(n.root.position,destination)){
   s.arrived=false;s.index=Math.max(0,s.path.length-1);
  }
 }
 function restore(snapshot){const data=restoreWorldRuntime(snapshot?.runtime,{npcs,furniture});if(!data?.stages)return false;time=Math.max(0,data.time||0);if(snapshot.duties){for(const id of Object.keys(duties))delete duties[id];Object.assign(duties,JSON.parse(JSON.stringify(snapshot.duties)));}if(snapshot.unpaidDuties)unpaidDuties.splice(0,unpaidDuties.length,...JSON.parse(JSON.stringify(snapshot.unpaidDuties)));stages.clear();conversation=data.conversation||null;for(const[id,s]of data.stages){const n=officials.find(n=>n.station.id===id);if(!n)continue;if(getTavern()?.officialMeal(n.station.id))s.borrowed=true;if(getSalon()?.ownsNPCCustomer?.(n.station.id)){s.borrowedSalon=true;s.mount=null;s.mountTarget=null;}retireBankJourney(n,s);migrateTavernRoute(n,s,snapshot);if(s.choice?.meal&&!s.borrowed&&s.choice.facilityId?.startsWith('china-palace-dining-')){if(s.mount){s.mountTarget=null;s.evicted=true;}else continue;}const bed=s.mount?.kind==='bed'?s.mount:s.mountTarget?.kind==='bed'?s.mountTarget:null;
   if(bed){const roomReady=!s.roomId||!!claims.reserve(s.roomId,n.station.id,{purpose:'private-rest'}),resolved=roomReady?reserveNpcBed(furniture,bed,n.station.id):null;s.mountTarget=resolved||bed;if(s.mount){s.mount=resolved&&occupyNpcBed(furniture,resolved,n.station.id)?resolved:null;if(s.mount){n.root.position.set(...s.mount.anchor);n.root.rotation.y=s.mount.yaw;}else{s.arrived=false;s.waiting=0;}}}
   stages.set(n,{...s,planned:false,stalled:0});n.route=[];if(!s.borrowed&&!s.borrowedSalon)n.serviceMount=null;for(const id of [s.facilityId,s.choice?.facilityId,s.roomId].filter(id=>id&&id!==bed?.id))claims.reserve(id,n.station.id,{purpose:s.choice?.id||'resumed'});if(s.mount&&s.mount.kind!=='bed')claims.occupy(s.mount.id,n.station.id);}if(conversation){const event=brain.conversation(conversation.id);if(event?.status!=='accepted'||!conversation.participants.every(id=>stages.get(officials.find(n=>n.station.id===id))?.pairId===conversation.id&&claims.reservation(stages.get(officials.find(n=>n.station.id===id)).facilityId,id)))endConversation(false);else conversation.lastAt=time;}for(const n of officials){const current=brain.state(n.station.id)?.current;if(current?.conversationId&&!conversation){brain.cancelConversation(current.conversationId);claims.releaseActor(n.station.id);idle(n);}}return true;}
 ready=true;if(!restore(saved))for(const n of officials)choose(n);
 return {
  courtCompleted(day){for(const n of officials){const previous=duties[n.station.id];if(previous?.day===day)continue;if(previous?.stage==='archived'&&!unpaidDuties.some(d=>d.actorId===n.station.id&&d.day===previous.day))unpaidDuties.push({actorId:n.station.id,...previous});duties[n.station.id]={day,stage:'awaiting-archive'};}save();},
  request(n){const s=stages.get(n);if(s)s.called=true;if(s?.pairId)endConversation(false);},
  cancelCourt(n){const s=stages.get(n);if(s?.courtReady){stages.delete(n);choose(n);}else if(s)s.called=false;},
  courtPlan(n){const s=stages.get(n),toiletPose=getToilet()?.actorPose(n),p=PUBLIC_TOILET.approach,landing=toiletPose?(!blocked(p[0],p[2],lot.colliders.concat(safety(n)),n.collisionRadius??.25,{...navigation,y:p[1]})?point(p):null):s?.mount?furniture.standPoint(navigation,safety(n),s.mount):n.root.position;return {reachable:!!landing,position:landing||n.root.position,path:publicRoute(n,null).filter(Boolean),safeExitSeconds:s?.mount||toiletPose?2:0,doorSeconds:4};},
  ready(n){return stages.get(n)?.courtReady===true&&!getSalon()?.ownsNPCCustomer?.(n.station.id);},
  resume(n){const s=stages.get(n),salon=getSalon();if(s?.borrowedSalon||salon?.ownsNPCCustomer?.(n.station.id)){if(s)s.salonInterrupted=true;if(salon?.ownsNPCCustomer?.(n.station.id)&&(salon.cancelNPC?.(n.station.id,'resume-official-life')!==true||salon.ownsNPCCustomer(n.station.id)))return false;if(s&&!finish(n,s,false))return false;}if(stages.get(n)?.pairId)endConversation(false);stages.delete(n);n.route=[];choose(n);},
  playerRequest(id){if(seat(id)?.kind==='bed')return;for(const n of officials){const s=stages.get(n);if(s?.choice?.facilityId===id||s?.facilityId===id){s.evicted=true;if(s.pairId)endConversation(false,'让出位置，改日再聊');}}},
  meetingAvailable:n=>{const s=stages.get(n);return !!s&&!getSalon()?.ownsNPCCustomer?.(n.station.id)&&!s.pairId&&!s.called&&!s.courtReady&&!s.mount&&!s.borrowed&&!s.borrowedSalon&&!s.choice?.meal&&!s.choice?.toilet&&!s.choice?.inspection&&s.choice?.id!=='archive-duty';},
  label:n=>formatCourtEdictText(stages.get(n)?.label)||'承务官署 · 日常起居',
  tick(dt,playerState){state=playerState;time+=dt;brain.tick(dt);if(time>=nextPayrollAt){nextPayrollAt=time+5;for(const n of officials)settleDuty(n);for(const duty of unpaidDuties){const n=officials.find(n=>n.station.id===duty.actorId);if(n)settleDuty(n,duty);}for(let i=unpaidDuties.length-1;i>=0;i--)if(unpaidDuties[i].stage==='paid')unpaidDuties.splice(i,1);}},
  update(n,dt,t){
   let s=stages.get(n);if(!s){choose(n);s=stages.get(n);if(!s)return;}
   const salon=getSalon();
   if(s.borrowedSalon||salon?.ownsNPCCustomer?.(n.station.id)){
    s.borrowedSalon=true;
    const status=salon?.npcStatus?.(n.station.id),reason=salonInterruption(n,s);
    if(status?.label){s.label=status.label;tell(n,s.label);}
    if(status?.stage==='visiting')s.salonCompleted=true;
    if(reason){s.salonInterrupted=true;if(salon?.ownsNPCCustomer?.(n.station.id)&&salon.cancelNPC?.(n.station.id,reason)!==true)return;}
    // The salon alone moves and animates its customer, including while a
    // rejected money write blocks cancellation. Court must keep waiting.
    if(salon?.ownsNPCCustomer?.(n.station.id))return;
    if(finish(n,s,!!s.salonCompleted&&!s.salonInterrupted)){
     if(s.called){stages.set(n,{courtReady:true,label:'已离开茶叙 · 从当前位置应召赴朝'});n.route=[];}
     else if(urgent(n))choose(n);else idle(n,'茶叙已告一段落 · 继续日常');
    }
    return;
   }
   if(s.choice?.salon&&(salonInterruption(n,s)||!salon)){
    if(finish(n,s,false)){
     if(s.called){stages.set(n,{courtReady:true,label:'暂缓自费茶叙 · 从当前位置应召赴朝'});n.route=[];}
     else if(urgent(n))choose(n);else idle(n);
    }
    return;
   }
   if(s.pairId){updateConversation(n,s,dt,t);return;}
   if(s.choice?.toilet){
    const toilet=getToilet();
    if(toilet?.ownsActor(n)){
     if(s.called)toilet.cancel('court-summons',n.station.id);
     if(toilet.ownsActor(n))toilet.updateActor(n,dt,{travel:(_point,step)=>travel(n,s,step)});
     if(toilet.ownsActor(n)){s.label=toilet.label(n.station.id)||s.choice.label;tell(n,s.label);animate(n,s,t);return;}
    }
    // The facility alone emits relief. A stale or interrupted life intention
    // merely ends; it cannot recreate a reservation, timer or receipt on load.
    if(finish(n,s,!s.called&&sharedNeeds?.status(n.station.id)?.seekToilet===false)){if(s.called)stages.set(n,{courtReady:true,label:'已离开净室 · 应召赴朝'});else idle(n);}
    return;
   }
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
    if(s.idle){s.elapsed+=dt;if(urgent(n)?brain.decisionDue(n.station.id):s.elapsed>=s.duration){stages.delete(n);choose(n);}else animate(n,s,t);return;}
    if(!s.arrived)travel(n,s,dt);
    if(s.arrived){
     if(s.choice?.salon){
      const q=s.choice.salon,quoted=salonChoices(n).some(a=>a.artistId===q.artistId&&a.activity===q.activity&&a.fee===q.fee);
      if(near(n.root.position,SALON_RECEPTION_POINT)&&quoted&&salon?.requestNPC?.(n.station.id,q.artistId,q.activity,q.fee)){
       s.borrowedSalon=true;n.route=[];record('life-paid-salon:borrowed',n);save();return;
      }
      if(finish(n,s,false))idle(n,'这次茶叙暂未成行 · 继续日常');return;
     }
     if(s.choice?.meal){const tavern=getTavern();if(tavern?.requestOfficialMeal(n.station.id)){s.borrowed=true;n.route=[];save();return;}if(finish(n,s,false))choose(n);return;}
     if(s.mountTarget&&!s.mount){const m=s.mountTarget.kind==='bed'?reserveNpcBed(furniture,s.mountTarget,n.station.id):s.mountTarget;if(m&&(!s.roomId||!!claims.reserve(s.roomId,n.station.id,{purpose:'private-rest'}))&&!occupied(m.id,n)&&(m.kind==='bed'?furniture.canUse(navigation,safety(n),m)&&occupyNpcBed(furniture,m,n.station.id):furniture.canSit(navigation,safety(n),m)&&claims.occupy(m.id,n.station.id))){n.root.position.set(...m.anchor);n.root.rotation.y=m.yaw;s.mount=m;if(s.roomId)claims.occupy(s.roomId,n.station.id);record('life-'+s.choice.id+':mounted',n);}else{s.waiting+=dt;if(s.waiting>15&&finish(n,s,false))choose(n);animate(n,s,t);return;}}
     const partner=s.choice?.partner,partnerPresent=!partner||Math.abs(partner.root.position.y-n.root.position.y)<.4&&partner.root.position.distanceTo(n.root.position)<2.2;
     const look=partnerPresent&&partner?partner.root.position:s.choice?.look?point(s.choice.look):s.choice?.workTarget?point(s.choice.workTarget):null;if(look&&!s.mount)n.root.rotation.y=Math.atan2(look.x-n.root.position.x,look.z-n.root.position.z);
     s.elapsed+=dt;if(s.elapsed>=s.duration&&!s.called){if(finish(n,s,partnerPresent))idle(n);}
    }
   }
   animate(n,stages.get(n)||s,t);
  },
  restore,mountForActor:n=>stages.get(n)?.mount||null,
  socialProfile:id=>brain.state(id),
  socialBusy:id=>{const n=officials.find(n=>n.station.id===id),s=stages.get(n);return !!getSalon()?.ownsNPCCustomer?.(id)||!!conversation?.participants.includes(id)||!!s&&(s.called||s.courtReady||s.borrowed||s.borrowedSalon||!!s.choice?.meal||!!s.choice?.toilet||!!s.choice?.inspection||s.choice?.id==='archive-duty')||!!n&&(!!sharedNeeds?.status(id)?.seekMeal||!!sharedNeeds?.status(id)?.seekToilet||duties[id]?.stage==='awaiting-archive'||index(n)===0&&!!reports?.inspection());},
  socialCanPause:n=>!getSalon()?.ownsNPCCustomer?.(n.station.id)&&!!stages.get(n)&&!stages.get(n).mount&&!stages.get(n).borrowedSalon&&!stages.get(n).choice?.toilet,
  state:()=>({decisions:brain.snapshot(),conversation:conversation?JSON.parse(JSON.stringify(conversation)):null,actors:officials.map(n=>{const s=stages.get(n);return {id:n.station.id,activity:s?.choice?.id||null,stage:s?.courtReady?'court-ready':s?.arrived?'activity':'travel',arrived:s?.arrived||false,elapsed:s?.elapsed||0,mounted:s?.mount?.id||null,borrowed:!!s?.borrowed,borrowedSalon:!!s?.borrowedSalon,duty:duties[n.station.id]||null,roomId:s?.roomId||null,called:!!s?.called,position:n.root.position.toArray()};})}),snapshot,
  dispose({suspend=false}={}){brain.dispose();if(!suspend)save();for(const n of officials){claims.releaseActor(n.station.id);}}
 };
}
