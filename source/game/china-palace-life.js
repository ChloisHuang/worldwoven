import {captureWorldRuntime,restoreWorldRuntime} from './world-continuity.js';
import {CHINA_CONSORTS,CONSORT_ROUTES,palaceResidentSave,palaceResident} from './china-palace-residents.js';
import {consortActivities,createPalaceLeisureClaims} from './china-consort-activities.js';
import {createLifeDecisions} from './npc-life-decisions.js';
import {canTraverse} from './navigation.js';
import {followActorRoute,findActorStandPoint} from './actor-navigation.js';
import {attachPalaceCostume,createPalaceMealKit} from './china-palace-costume.js';
import {courtRouteBudget,cachedCourtPlanner} from './china-court-schedule.js';

export const CHINA_PALACE_ROLES=Object.freeze([
 {id:'cn-emperor',npcName:'景珩 · 皇帝',royalRole:'emperor',ageYears:36,privateRoomId:'bedroom',npcPosition:[-21.7,7.815,-4.6]},
 ...CHINA_CONSORTS
]);
const point=a=>({x:a[0],y:a[1],z:a[2]}),near=(p,a,r=.065)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.32;
const HALL=[[-18,.215,-13.35],[-15.1,.215,-13.35]],SHORE=[[-13.7,.145,-14.5],[-13.7,.145,-20.85],[-9.1,.145,-20.85]];
const STAIRS=[[-17.7,7.815,-10.5],[-17.7,7.815,-13.35],[-22,7.815,-13.35],[-22,5.915,-18.65],[-24.5,5.915,-18.65],[-24.5,4.015,-13.35],[-22,4.015,-13.35],[-22,2.115,-18.65],[-24.5,2.115,-18.65],[-24.5,.215,-13.35],...HALL];
const COURT=[[-14.4,.115,-10],[-14.4,.115,.4],[-8,.13,11],[-3,.13,11],[-3,1.415,6],[0,1.415,3],[0,1.415,-4.3]];
const CONSORT_IDLE=[[-23,.215,-12.65],[-20.3,.215,-12.65],[-17.1,.215,-12.65]],CONSORT_MEETING=[[-18.85,.215,-8.9],[-18.85,.215,-10.5]],CONSORT_MEETING_IDS=['palace-consort-reception-0','palace-consort-reception-1'];
const RECEPTION_SEATS=['china-residence-reception-seat--7.2','china-residence-reception-seat--3.7'];
const reverse=a=>a.slice().reverse().map(p=>p.slice());

// The emperor keeps sole duty ownership; each consort leaves her own private
// room through public circulation. Lin keeps his original tea-host job.
export function createChinaPalaceLife({npcs,lot,furniture,doors,planPath,moveActor,poseContext,worldSeed=1,saved={},saveState=()=>{},beginInteraction=()=>null,onInteraction=()=>{},sharedNeeds=null,getKitchen=null}){
 const actors=CHINA_PALACE_ROLES.map(r=>npcs.find(n=>n.station.id===r.id)),host=npcs.find(n=>n.station.id==='cn-tea');
 if(actors.some(n=>!n)||!host)return null;
 const [emperor,...consorts]=actors,owned=new Set(actors),costumes=actors.map(attachPalaceCostume),seat=id=>furniture.items.find(i=>i.id===id);
 const throne=seat('china-furniture-throne'),privateSeat=seat('china-furniture-seat');if(!throne||!privateSeat){for(const c of costumes)c?.dispose();return null;}
 const meals=new Map(actors.map(n=>[n,createPalaceMealKit(n)]));
 const actorIds=[...actors,host].map(n=>n.station.id),claims=createPalaceLeisureClaims();
 const stages=new Map(),history=[],failures=[],brain=createLifeDecisions({worldSeed,actorIds,saved:palaceResidentSave({worldSeed,actorIds,saved:saved.continuity?.decisions||saved}),onChange:saveState,sharedNeeds}),navigation={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4,radius:.25};
 const planDutyPath=cachedCourtPlanner(planPath);
 let time=0,disposed=false,playerState={},hostHeld=null,hostPreviousYaw=0,hostHeldAt=0,duty=null,conversation=null,invitationHold=null;
 const tell=(n,label)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=label;};
 const record=(n,event)=>{history.push({actor:n.station.id,event,time:+time.toFixed(2),position:n.root.position.toArray()});if(history.length>80)history.shift();};
 const stage=(id,label,path,duration=0,options={})=>({id,label,path,duration,...options});
 const ownRest=new Map([[emperor,privateSeat],...consorts.map(n=>[n,seat(n.station.privateBedId)])]);
 const homeExit=n=>n===emperor?STAIRS:[...CONSORT_ROUTES[n.station.id],...HALL];
 const homeReturn=n=>n===emperor?[...reverse(STAIRS),[-18.2,7.815,-5],n.home.toArray()]:[...reverse(HALL),...reverse(CONSORT_ROUTES[n.station.id]),n.home.toArray()];
 const scripts=new Map(),mealSeats=new Map([[emperor,seat('china-palace-dining-seat-19.8')]]),sharedMeals=['china-palace-dining-seat-19.8','china-palace-dining-seat-22.2'].map(seat).filter(Boolean);
 const available=(n,id)=>playerState.facilityId!==id&&claims.available(id,n.station.id)&&(id!=='palace-tea-host'||!interrupted(host)&&playerState.performing!==host.station.id);
 const kitchen=()=>getKitchen?.()||null,mealAvailable=n=>!getKitchen||!!kitchen()?.canRequestMeal(n.station.id);
 const DINING=[[-14.4,.115,.4],[-8,.13,11],[14,.13,11],[14,.13,4],[21,.215,4],[21,.215,1.3]];
 const candidates=n=>n!==emperor?[...consortActivities(n,{stage,homeExit,homeReturn,bed:ownRest.get(n),mealSeats:sharedMeals,host,available:id=>available(n,id),mealAvailable:mealAvailable(n)}),{id:'veranda',label:'去公共廊下透透气',base:.12,traits:{outdoors:.45,sociability:.65},needs:{fatigue:-.25},relief:{fatigue:-.05},duration:[12,23],cooldown:42,steps:[stage('veranda-pause','在公共廊下歇歇 · 看看庭中动静',publicPosition(n)?[CONSORT_IDLE[consorts.indexOf(n)]]:[...CONSORT_ROUTES[n.station.id],CONSORT_IDLE[consorts.indexOf(n)]],0,{chosen:true,look:[-14,.2,-14]})]},conversationChoice(n)]:[
  {id:'read',label:n===emperor?'寝殿晨读 · 翻阅书卷':'在自己的客居静读',base:.25,traits:{curiosity:.9,quiet:.5},needs:{fatigue:-.2},relief:{social:.05,fatigue:-.10},duration:[10,18],cooldown:40,steps:[stage('private-reading','静读书卷',[n.home.toArray()],0,{action:'read',chosen:true})]},
  {id:'rest',label:'回自己的私室休息',base:.08,traits:{quiet:.3},needs:{fatigue:2.8,social:-.15},relief:{fatigue:-.65},duration:[12,22],cooldown:65,available:!!ownRest.get(n)&&playerState.facilityId!==ownRest.get(n).id,steps:[stage('private-rest','在自己的私室休息',[ownRest.get(n).position],0,{mount:ownRest.get(n),chosen:true}),stage('stand-after-rest','起身整理衣袖',[n.home.toArray()])]},
  {id:'garden',facilityId:'palace-emperor-shore',available:available(n,'palace-emperor-shore'),label:'去荷庭看看水色',base:.15,traits:{outdoors:1.2},needs:{fatigue:-.55,social:.2},relief:{fatigue:-.12,social:-.10},duration:[9,17],cooldown:70,steps:[stage('leave-suite','离开私室 · 沿公共通廊',homeExit(n)),stage('garden-view','荷庭驻足 · 看花与水色',SHORE,0,{look:[-5,.3,-18],chosen:true}),stage('return-suite','沿公共通廊回到自己的私室',[...reverse(SHORE),...homeReturn(n)])]},
  {id:'meal',facilityId:mealSeats.get(n)?.id,label:'去御膳餐厅用些点心',base:.02,traits:{appetite:.2},needs:{hunger:3.5},relief:{fatigue:-.05},duration:[12,18],cooldown:100,available:mealAvailable(n)&&!!mealSeats.get(n)&&available(n,mealSeats.get(n).id),steps:[stage('leave-suite','离开私室 · 前往餐厅',homeExit(n)),stage('dining-arrival','沿外庭走到御膳餐厅',[...DINING,mealSeats.get(n)?.position||DINING.at(-1)]),stage('meal','在餐厅坐凳上用点心',[mealSeats.get(n)?.position||DINING.at(-1)],0,{mount:mealSeats.get(n),meal:true,chosen:true}),stage('return-suite','用餐后沿公共通廊回居',[...reverse(DINING),...homeReturn(n)])]},
  {id:'hall',label:'去正殿静坐',base:.12,traits:{curiosity:.5,quiet:.35},needs:{fatigue:-.2},relief:{fatigue:-.20},duration:[9,15],cooldown:90,available:playerState.facilityId!==throne.id,steps:[stage('public-stairs','离开寝殿 · 沿公共梯厅下楼',homeExit(n)),stage('hall-arrival','穿过仪庭 · 上正殿前阶',COURT),stage('hall-rest','在正殿御座稍坐',[throne.position],0,{mount:throne,chosen:true}),stage('return-residence','离殿回居 · 走公共梯厅',[...reverse(COURT),...homeReturn(n)])]}
 ];
 function urgent(n){const p=brain.state(n.station.id);return p.needs.hunger>.82||p.needs.fatigue>.88;}
 function publicPosition(n){return n.root.position.y<.6&&n.root.position.z<-12.25||lot.interiorRooms?.some(r=>r.id==='residence-living'&&n.root.position.x>r.minX&&n.root.position.x<r.maxX&&n.root.position.z>r.minZ&&n.root.position.z<r.maxZ&&Math.abs(n.root.position.y-r.floorY)<.4);}
 function idleEligible(n){const s=stages.get(n);return !!s?.idle&&s.arrived&&!s.mount&&!n.walking&&!interrupted(n)&&playerState.performing!==n.station.id&&!urgent(n)&&brain.canReply(n.station.id);}
 function meetingAvailable(n){return !RECEPTION_SEATS.includes(playerState.facilityId)&&CONSORT_MEETING_IDS.every(id=>available(n,id));}
 function conversationChoice(n){
  const experience=brain.experience(n.station.id),partners=!conversation&&experience&&publicPosition(n)&&!urgent(n)&&meetingAvailable(n)?consorts.filter(other=>other!==n&&idleEligible(other)&&other.root.position.distanceTo(n.root.position)<7.5&&canTraverse(n.root.position,other.root.position,lot.colliders.concat(doors?.planningColliders||[]),navigation)):[];
  return {id:'conversation',label:'邀熟悉的姐妹到前厅聊聊',base:.12,traits:{sociability:1.2},needs:{social:1.8},duration:[9,14],cooldown:90,experienceId:experience?.id,steps:[stage('consort-conversation','到公共前厅叙话',[CONSORT_MEETING[0]],0,{chosen:true})],targets:partners.map(other=>({id:other.station.id,relationship:{target:other.station.id,weight:1.1,opinionWeight:1.1}}))};
 }
 function idle(n,label='手边事情告一段落 · 自己歇一会儿'){
  const duration=12+palaceResident(n.station.id).traits.quiet*12,path=[n.root.position.toArray()];
  brain.defer(n.station.id,duration);scripts.set(n,[stage('consort-free-time',label,path,duration)]);const cycles=stages.get(n)?.cycles||0;stages.set(n,{choice:null,cycles});enter(n,0);stages.get(n).idle=true;
 }
 function invitation(n,choice){
  const other=consorts.find(a=>a.station.id===choice.targetId);if(conversation||!other||!idleEligible(other)||urgent(n)||!meetingAvailable(n))return false;
  const pair=[n,other],paths=pair.map((actor,i)=>[[-18.9,.215,-13.35],[-18.9,.215,-11.5],CONSORT_MEETING[i]]);
  for(const [i,actor]of pair.entries()){let from=actor.root.position;for(const to of paths[i]){if(!near(from,to)&&!planPath(from,point(to),.25)?.length)return false;from=point(to);}}
  const result=brain.invite(n.station.id,choice);if(!result.ok)return false;
  if(result.status==='declined'){idle(n,'对方此刻想独处 · 改日再访');scripts.get(other)[0].label='这会儿想自己歇歇，改日再聊';record(n,'consort-invitation:declined:'+other.station.id);return true;}
  conversation={id:result.id,participants:result.participants,topic:result.experience.kind,responses:result.responses,elapsed:0,age:0,duration:choice.duration,phase:'invited'};
  for(const [i,actor]of pair.entries()){
   if(!claims.reserve(CONSORT_MEETING_IDS[i],actor.station.id,100)){endConversation(false,'前厅有人，改日再访');return true;}
   scripts.set(actor,[stage('consort-conversation','已相约前厅 · 沿公共走廊前往',paths[i],choice.duration,{consortPair:true})]);const cycles=stages.get(actor)?.cycles||0;stages.set(actor,{choice:{id:'conversation',targetId:pair[1-i].station.id,facilityId:CONSORT_MEETING_IDS[i]},cycles});enter(actor,0);
  }
  record(n,'consort-invitation:accepted:'+other.station.id);if(saveState(brain.snapshot())===false)endConversation(false,'稍后再聊');return true;
 }
 function endConversation(fulfilled,label='各自先忙 · 改日再访'){
  const pair=conversation;if(!pair)return;const residents=pair.participants.map(id=>consorts.find(n=>n.station.id===id)).filter(Boolean);
  const result=fulfilled?brain.finishConversation(pair.id,{elapsed:pair.elapsed,arrived:residents.filter(n=>stages.get(n)?.arrived).map(n=>n.station.id)}):null;
  if(!result?.ok)brain.cancelConversation(pair.id);conversation=null;
  for(const n of residents){claims.release(n.station.id);n.route=[];n.walking=false;const feeling=result?.event?.results?.find(r=>r.actorId===n.station.id)?.feeling;if(result?.ok)stages.get(n).cycles++;idle(n,feeling==='appreciated'?'这一席话很投缘 · 下回再叙':feeling==='mismatched'?'彼此各有所好 · 今日先聊到这里':result?.ok?'聊过今日见闻 · 各自继续日常':label);}
  record(residents[0],'consort-conversation:'+(result?.ok?'completed':'cancelled')+':'+pair.id);saveState(brain.snapshot());
 }
 function updateConversation(dt,t){
  const pair=conversation;if(!pair)return;const residents=pair.participants.map(id=>consorts.find(n=>n.station.id===id));
  if(residents.some(n=>!n||urgent(n)||interrupted(n)||playerState.performing===n.station.id||stages.get(n)?.abortRequested)||RECEPTION_SEATS.includes(playerState.facilityId)){endConversation(false);return;}
  pair.age+=dt;if(pair.age>100){endConversation(false,'途中耽搁 · 改日再访');return;}
  const both=residents.every(n=>stages.get(n)?.arrived&&near(n.root.position,CONSORT_MEETING[residents.indexOf(n)],.2));
  if(both){
   const starting=pair.phase!=='talking';if(starting){pair.phase='talking';record(residents[0],'consort-conversation:talking:'+pair.id);}
   if(!Object.hasOwn(pair,'interaction')){const token=beginInteraction(pair.participants.slice());pair.interaction=token?{...token,participants:[...token.participants],duration:0}:null;}
   const spoken=starting?0:Math.min(dt,Math.max(0,pair.duration-pair.elapsed));pair.elapsed+=spoken;
   if(pair.interaction&&spoken>0){pair.interaction.duration+=spoken;onInteraction({...pair.interaction,participants:[...pair.interaction.participants]});}
   for(const [i,n]of residents.entries()){
    const other=residents[1-i];n.root.rotation.y=Math.atan2(other.root.position.x-n.root.position.x,other.root.position.z-n.root.position.z);const response=pair.responses[n.station.id];
    const topic=pair.topic==='read'?'方才读过的书卷':'方才看过的荷塘',label=pair.elapsed<3?(i?'愿闻其详':'聊聊'+topic):pair.elapsed<6?(i?(response==='appreciated'?'我也喜欢这样的闲暇':response==='mismatched'?'我更喜欢别的消遣':'各有趣味，听你说说'):'你平日更喜欢什么？'):(i?'改日有空再叙':'原来你是这样想的');tell(n,label);animate(n,stages.get(n),t);
   }
   if(pair.elapsed>=pair.duration)endConversation(true);
  }
 }
 function choose(n){
  claims.release(n.station.id);
  if(n===emperor&&duty){
   duty.active=true;
   const departure=duty.fromPublic?[]:[stage('duty-public-stairs','应召出居 · 沿公共梯厅下楼',homeExit(n))];
   scripts.set(n,duty.kind==='edict-review'?[...departure,stage('duty-public-review','公共听候处阅批 · 留出院门通行',[HALL.at(-1)],Infinity,{look:[-15.1,.145,-14.45]}),stage('duty-return-home','阅批完毕 · 沿公共梯厅回居',homeReturn(n))]:[...departure,stage('duty-hall-arrival','前往朝议 · 沿正殿前阶入殿',COURT),stage('duty-hall-seat','朝议候奏 · 等候大臣依次进言',[throne.position],Infinity,{mount:throne}),stage('duty-return-home','朝议结束 · 沿公共梯厅回居',[...reverse(COURT),...homeReturn(n)])]);
   stages.set(n,{choice:null,cycles:stages.get(n)?.cycles||0});enter(n,0);return;
  }
  const reachable=steps=>{const end=steps?.find(s=>s.chosen)?.path.at(-1);return !!end&&(near(n.root.position,end,.1)||planPath(n.root.position,point(end),.25).length>0);};
  const options=candidates(n).map(c=>c.targets?{...c,targets:c.targets.map(t=>({...t,available:t.available!==false&&reachable(t.choice?.steps||c.steps)}))}:{...c,available:c.available!==false&&reachable(c.steps)});
  const need=n!==emperor?brain.state(n.station.id).needs:null,priority=need?.fatigue>.88?options.filter(c=>c.id==='rest'&&c.available):null;
  let choice=brain.choose(n.station.id,priority?.length?priority:options,playerState.hour??10);
  if(!choice&&n!==emperor){idle(n,'暂时自己歇歇 · 稍后再作打算');return;}
  if(choice?.id==='conversation'){if(!invitation(n,choice)){brain.complete(n.station.id,choice,{fulfilled:false});idle(n,'对方正在忙 · 改日再访');}return;}
  if(choice&&!claims.reserve(choice.facilityId,n.station.id,n===emperor?360:120)){brain.complete(n.station.id,choice,{fulfilled:false});choice=null;}
  if(choice?.id==='meal'&&getKitchen&&!bindMeal(n,choice)){claims.release(n.station.id);brain.complete(n.station.id,choice,{fulfilled:false});choice=null;}
  const steps=choice?choice.steps.map(s=>({...s,...(n!==emperor&&s.id==='leave-suite'&&publicPosition(n)?{path:[HALL.at(-1)]}:{}),duration:s.chosen?choice.duration:s.duration})): [stage('quiet-pause','在自己的私室稍作停留',[n.home.toArray()],6)];
  scripts.set(n,steps);const previous=stages.get(n);stages.set(n,{choice,cycles:previous?.cycles||0});enter(n,0);
 }
 // The kitchen owns the one finite meal and its durable receipt. Life keeps
 // only its identity and the resident's original, seated eating duration.
 function bindMeal(n,choice){
  const service=kitchen();if(!service||choice.mealCancelled)return false;
  const current=service.mealFor(n.station.id),active=current&&!['consumed','cancelled','canceled'].includes(current.stage)?current:null;
  const order=choice.orderId?service.lookupMeal?.(choice.orderId,n.station.id)||current:active||service.requestMeal({actorId:n.station.id,seatId:choice.facilityId});
  if(!order||choice.orderId&&order.id!==choice.orderId||order.seatId!==choice.facilityId||choice.mealId&&order.mealId!==choice.mealId)return false;
  if(['cancelled','canceled'].includes(order.stage))return false;
  choice.orderId=order.id;choice.mealId=order.mealId;
  if(order.stage==='consumed')choice.mealCompleted=true;
  return true;
 }
 function cancelMeal(n,s,reason){
  const choice=s?.choice;if(choice?.id!=='meal'||choice.mealCompleted)return true;
  choice.mealCancelReason=reason;
  if(!getKitchen){choice.mealCancelled=true;return true;}
  const service=kitchen();if(!service)return false;
  if(choice.mealCancelled)return true;
  const result=service.cancelMeal(n.station.id,reason);if(result===false)return false;
  choice.mealCancelled=true;return true;
 }
 function readyMeal(n,s){
  const choice=s.choice;
  return !!s.mount&&s.mount.id===choice?.facilityId&&near(n.root.position,s.mount.anchor,.2)&&!choice?.mealCancelReason&&!choice?.mealCompleted&&(!getKitchen||!!kitchen()?.mealReady(choice?.orderId,n.station.id));
 }
 const safety=n=>[...(doors?.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(playerState.position?[playerState.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.27,maxX:p.x+.27,minZ:p.z-.27,maxZ:p.z+.27,minY:p.y,maxY:p.y+1.95}:p);
 function releaseHost(){if(!hostHeld)return;host.root.rotation.y=hostPreviousYaw;host.breakAt+=time-hostHeldAt;hostHeld=null;tell(host,host.station.npcLabel);}
 function enter(n,index){const previous=stages.get(n)||{};stages.set(n,{choice:previous.choice,cycles:previous.cycles||0,index,waypoint:0,elapsed:0,arrived:false,planned:false,stalled:0,retries:0,mount:null});n.route=[];record(n,scripts.get(n)[index].id);}
 function unmount(n,s){if(!s.mount)return true;const landing=findActorStandPoint(n,s.mount,({ignoreDynamicBodies})=>furniture.standPoint(navigation,ignoreDynamicBodies?[...(doors?.cameraColliders||[])]:safety(n),s.mount,n.collisionRadius??.25));if(!landing)return false;n.root.position.copy(landing);s.mount=null;furniture.releaseActor(n.station.id);return true;}
 function advance(n,s){if(scripts.get(n)[s.index].meal&&!s.choice?.mealCompleted&&!cancelMeal(n,s,'meal-interrupted'))return false;if(!unmount(n,s))return false;
  // Only Lin participated in this completed exchange. Passing NPCs gain no knowledge.
  if(scripts.get(n)[s.index].pair&&hostHeld===n&&s.elapsed>=scripts.get(n)[s.index].duration){brain.observe(n.station.id,s.choice,{observers:[{id:host.station.id,knowledge:'participant'}]});record(n,'tea-conversation:completed');}
  if(hostHeld===n)releaseHost();if(scripts.get(n)[s.index].chosen)claims.release(n.station.id);if(s.index+1===scripts.get(n).length){if(n===emperor&&duty?.active){record(n,'duty-released:'+duty.owner);duty=null;}if(s.choice){brain.complete(n.station.id,s.choice,{fulfilled:s.choice.fulfilled!==false});s.cycles++;}if(n!==emperor&&!urgent(n))idle(n);else choose(n);}else enter(n,s.index+1);return true;}
 function cancelCommitment(n,s,reason){if(!cancelMeal(n,s,reason)||!unmount(n,s))return false;if(hostHeld===n)releaseHost();claims.release(n.station.id);if(s.choice){s.choice.fulfilled=false;brain.complete(n.station.id,s.choice,{fulfilled:false});}record(n,'leisure-deferred:'+reason);const room=lot.interiorRooms?.find(r=>r.id===n.station.privateRoomId),p=n.root.position,inOwnRoom=room&&p.x>room.minX&&p.x<room.maxX&&p.z>room.minZ&&p.z<room.maxZ&&Math.abs(p.y-(room.floorY??n.home.y))<.4;scripts.set(n,[stage('return-suite','改日再访 · 回自己的私室',inOwnRoom?[n.home.toArray()]:homeReturn(n))]);enter(n,0);return true;}
 function travel(n,s,to,dt){
  if(near(n.root.position,to)){n.route=[];s.planned=false;s.retries=0;return true;}
  if(!s.planned){n.route=planPath(n.root.position,point(to),.25);s.planned=true;}
  const step=followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:playerState.position,speedScale:.78});
  if(n.walking)s.retries=0;s.stalled=n.walking||step.waiting?0:s.stalled+dt;
  if(s.stalled>4){s.stalled=0;s.planned=false;if(++s.retries===3){failures.push({actor:n.station.id,activity:s.choice?.id||null,stage:scripts.get(n)[s.index].id,to:to.slice(),position:n.root.position.toArray()});if(failures.length>8)failures.shift();}}
  // Arrival can happen during this move. Release this completed plan before
  // the caller advances its authored waypoint; otherwise the next leg follows
  // an empty old route until the four-second obstruction retry fires.
  if(near(n.root.position,to)){n.route=[];s.planned=false;s.retries=0;s.stalled=0;return true;}
  return false;
 }
 function interrupted(n){return playerState.conversationActorId===n.station.id;}
 function socialStatus(n){if(!owned.has(n)&&!(hostHeld&&n===host))return null;const busy=n===emperor&&!!duty&&!duty.release||!!conversation?.participants.includes(n.station.id)||!!hostHeld&&(n===host||n===hostHeld)||owned.has(n)&&urgent(n);return {busy,canPause:!busy&&!stages.get(n)?.mount,attention:!busy,job:n===host?'与'+(palaceResident(hostHeld?.station.id)?.shortName||'来客')+'在茶席叙话':scripts.get(n)[stages.get(n).index].label};}
 function petitionAvailability(){
  const info=socialStatus(emperor),s=stages.get(emperor),stop=scripts.get(emperor)?.[s?.index];
  if(disposed||!info||info.busy||interrupted(emperor)||stop?.meal||s?.mount?.kind==='bed')return {ok:false,reason:'emperor-busy'};
  const ready=s.mount?!!invitationOpportunity():info.canPause===true;return {ok:ready,reason:ready?null:'emperor-busy'};
 }
 function invitationOpportunity(){
  const s=stages.get(emperor),stop=scripts.get(emperor)?.[s?.index];
  // Only an arrived leisure pause supplies an opportunity. Quiet seated rest
  // is eligible; eating, lying down, travelling and work are never interrupted.
  // original shared brain remains the sole chooser and owner of that action.
  if(disposed||duty||interrupted(emperor)||urgent(emperor)||!s?.arrived||!stop?.chosen||s.mount?.kind==='bed'||stop.mount&&!s.mount||stop.meal||emperor.walking||emperor.route.length||!s.choice)return null;
  const p=brain.state(emperor.station.id);
  if(!p.current||p.current.id!==s.choice.id||!Number.isFinite(p.current.startedAt))return null;
  return {id:`palace-action:${emperor.station.id}:${p.choices}:${p.current?.startedAt}:${stop.id}`,actorId:emperor.station.id,actionId:s.choice.id};
 }
 function animate(n,s,t){
  const stop=scripts.get(n)[s.index],context=poseContext(n,null);context.handoff=false;context.heldProp=null;context.seatedMeal=false;meals.get(n).show(false);
  if(s.mount){const m=s.mount;context.seatHeight=m.seatY===undefined?undefined:m.seatY-n.root.position.y-context.visualFloorOffset;if(m.kind==='bed'){context.visualFloorOffset=0;context.supportY=m.supportY;context.lieSupport=m.lieSupport;context.lieOffset=m.lieOffset;context.lieSurfaceHeightAt=(x,z)=>furniture.bedSupportAt(m,x,z);}}
  if(stop.pair&&hostHeld===n&&!interrupted(n)&&!interrupted(host)||stop.consortPair&&conversation?.phase==='talking'&&!interrupted(n))context.handoff=true;
  if(stop.meal&&readyMeal(n,s)&&s.mealStarted&&!interrupted(n)){context.seatedMeal=true;if(!getKitchen)meals.get(n).show(true);}
  n.animate(t+n.phase,n.walking,s.mount?(s.mount.kind==='bed'?'lie-rest':'chair-sit'):s.arrived&&!interrupted(n)?stop.action||null:null,context);meals.get(n).sync();
 }
 function restore(snapshot){
  if(snapshot?.version!==1)return false;const state=restoreWorldRuntime(snapshot.runtime,{npcs,furniture});if(!state||!state.scripts||!state.stages)return false;
  time=Math.max(0,state.time||0);duty=state.duty;conversation=state.conversation||null;hostHeld=actors.find(n=>n.station.id===state.hostHeldId)||null;hostPreviousYaw=state.hostPreviousYaw||0;hostHeldAt=state.hostHeldAt||0;history.splice(0,history.length,...(state.history||[]));
  for(const n of actors){const steps=state.scripts[n.station.id],stageState=state.stages[n.station.id];if(!steps?.length||!stageState||!steps[stageState.index]){choose(n);continue;}scripts.set(n,steps);stages.set(n,{...stageState,planned:false,stalled:0});n.route=[];n.serviceMount=null;if(stageState.mount){furniture.facilities.reserve(stageState.mount.poolId||stageState.mount.id,n.station.id,{eligible:id=>id===stageState.mount.id});furniture.facilities.occupy(stageState.mount.poolId||stageState.mount.id,n.station.id);}}
  for(const n of actors)claims.release(n.station.id);for(const lease of state.claims||[])if(actors.some(n=>n.station.id===lease.actor))claims.reserve(lease.id,lease.actor,Math.max(0,lease.remaining));
  if(conversation&&!(brain.conversation(conversation.id)?.status==='accepted'&&conversation.participants.every(id=>stages.get(consorts.find(n=>n.station.id===id))?.choice?.id==='conversation'&&claims.state().some(c=>c.actor===id))))endConversation(false);
  for(const n of consorts){const current=brain.state(n.station.id)?.current;if(current?.conversationId&&!conversation){brain.cancelConversation(current.conversationId);claims.release(n.station.id);idle(n);}}return true;
 }
 if(!restore(saved.continuity)){for(const n of consorts){const current=brain.state(n.station.id)?.current;if(current?.conversationId)brain.cancelConversation(current.conversationId);}for(const n of actors)choose(n);}
 return {
  invitationOpportunity,petitionAvailability,
  holdPetition(owner,position){if(!owner||!position||!petitionAvailability().ok||invitationHold&&invitationHold.owner!==owner)return false;invitationHold={owner,purpose:'petition',position:[position.x,position.y,position.z],until:time+1.8};return true;},
  holdInvitation(owner,opportunityId,position){const opportunity=invitationOpportunity();if(!opportunity||opportunity.id!==opportunityId||!owner||!position)return false;invitationHold={owner,opportunityId,position:[position.x,position.y,position.z],until:time+3};return true;},
  releaseInvitation(owner){if(invitationHold?.owner===owner)invitationHold=null;},
  mountForActor:n=>stages.get(n)?.mount||null,
  owns:n=>owned.has(n)||hostHeld&&n===host,
  socialProfile:id=>brain.state(id),
  socialStatus,
  // Palace life remains the sole movement/pose owner of its actors. A duty
  // drains unfinished leisure without granting its need/relationship relief.
  requestDuty(owner,options={}){
   if(disposed||!owner)return false;
   invitationHold=null;
   // A background public visit yields its existing real route to the morning
   // court; the sole life controller changes duty only at a safe handoff.
   if(duty&&duty.owner!==owner){if(!duty.background||options.background)return false;record(emperor,'duty-preempted:'+duty.owner);duty={owner,kind:options.kind==='edict-review'?'edict-review':'audience',active:false,release:false,yieldSeat:false,background:false};return true;}
   if(!duty){duty={owner,kind:options.kind==='edict-review'?'edict-review':'audience',active:false,release:false,yieldSeat:false,background:!!options.background};const s=stages.get(emperor);cancelMeal(emperor,s,'royal-duty');if(s.choice){s.choice.fulfilled=false;brain.complete(emperor.station.id,s.choice,{fulfilled:false});}record(emperor,'duty-requested:'+owner);}
   return true;
  },
  // Read-only estimate of the exact existing handoff/duty itinerary. This does
  // not move the emperor or borrow the consorts' routes, claims or controller.
  dutyPlan(owner){
   const s=stages.get(emperor),steps=scripts.get(emperor),fail=reason=>({reachable:false,seconds:Infinity,reason,stage:steps[s.index].id});
   if(disposed||duty&&duty.owner!==owner)return fail('duty-owned-by-another-service');
   if(interrupted(emperor))return fail('emperor-in-conversation');
   const landing=s.mount?furniture.standPoint(navigation,safety(emperor),s.mount):emperor.root.position;
   if(!landing)return fail('safe-stand-exit-blocked');
   if(duty?.active&&s.mount===throne&&!duty.release&&!duty.yieldSeat)return {reachable:true,seconds:0,distance:0,path:[],stage:steps[s.index].id};
   const path=[];let knownSegments=0,handoff=near(landing,emperor.home.toArray(),.4)?'home':near(landing,HALL.at(-1),.3)?'public':null;
   if(!duty?.active&&!handoff||duty?.active){
    if(!s.arrived&&emperor.route.length){path.push(...emperor.route.map(p=>[p.x,p.y,p.z]));knownSegments=path.length;}
    for(let i=s.index;i<steps.length;i++){
     if(i===s.index&&s.arrived)continue;
     for(const p of steps[i].path.slice(i===s.index?s.waypoint:0)){
      path.push(p.slice());
      if(!duty?.active&&(near(point(p),emperor.home.toArray(),.4)||near(point(p),HALL.at(-1),.3))){handoff=near(point(p),HALL.at(-1),.3)?'public':'home';break;}
     }
     if(duty?.active&&steps[i].mount===throne||!duty?.active&&handoff)break;
    }
   }
   if(!duty?.active){if(!handoff)return fail('no-reachable-duty-handoff');if(handoff==='home')path.push(...STAIRS);path.push(...COURT,throne.position);}
   const result=courtRouteBudget({position:landing,path,knownSegments,walkSpeed:emperor.locomotion.walkSpeed,planPath:planDutyPath,doorways:lot.doorways,safeExitSeconds:s.mount?2:0,doorSeconds:2});
   return {...result,stage:steps[s.index].id,handoff,path:path.map(p=>p.slice())};
  },
  releaseDuty(owner){if(duty?.owner===owner)duty.release=true;},
  setDutyLine(owner,line){if(duty?.owner===owner)duty.line=line;},
  dutyState(owner){if(!duty||duty.owner!==owner)return null;const s=stages.get(emperor);return {owner,active:duty.active,stage:scripts.get(emperor)[s.index].id,ready:duty.active&&(duty.kind==='edict-review'?scripts.get(emperor)[s.index].id==='duty-public-review'&&s.arrived:s.mount===throne&&!emperor.walking&&near(emperor.root.position,throne.anchor,.2))&&!duty.release&&!duty.yieldSeat,mounted:s.mount?.id||null,releasing:duty.release};},
  playerRequest(id){if(conversation&&RECEPTION_SEATS.includes(id))endConversation(false,'为来客让出会客前厅');for(const n of actors){const s=stages.get(n);if(s.mount?.id===id){if(n===emperor&&duty?.active){duty.yieldSeat=true;}else{if(s.choice)s.choice.fulfilled=false;if(s.choice?.id==='meal'){s.abortRequested='为来客让出餐席';cancelMeal(n,s,'player-seat');}else advance(n,s);}}}},
  update(dt,t,state={}){
   if(disposed)return;playerState=state;time+=dt;brain.tick(dt);
   for(const n of actors){
    n.walking=false;let s=stages.get(n),stop=scripts.get(n)[s.index];tell(n,stop.label);s.greetingActive=false;
    if(getKitchen&&kitchen()&&s.choice?.id==='meal'&&!s.choice.mealCompleted&&!s.choice.mealCancelled){
     const legacyMeal=!s.choice.orderId;
     if(s.choice.mealCancelReason)cancelMeal(n,s,s.choice.mealCancelReason);
     else if(!bindMeal(n,s.choice))s.abortRequested='膳食暂不可用 · 稍后再来';
     else if(legacyMeal&&stop.meal)s.elapsed=0;
    }
    if(claims.tick(n.station.id,dt,interrupted(n)||hostHeld===n&&interrupted(host)))s.abortRequested='等待稍久 · 改日再来';
    if(s.abortRequested&&stop.consortPair){endConversation(false,'途中耽搁 · 改日再访');s=stages.get(n);stop=scripts.get(n)[s.index];}
    if(s.abortRequested&&!(n===emperor&&duty)){if(cancelCommitment(n,s,s.abortRequested)){s=stages.get(n);stop=scripts.get(n)[s.index];}else{animate(n,s,t);continue;}}
    if(n===emperor&&duty){
     if(!duty.active&&!interrupted(n)){
      if(!cancelMeal(n,s,'royal-duty')){animate(n,s,t);continue;}
      if(!unmount(n,s)){animate(n,s,t);continue;}
      if(near(n.root.position,n.home.toArray(),.4)||near(n.root.position,HALL.at(-1),.3)){
       duty.fromPublic=near(n.root.position,HALL.at(-1),.3);
       if(s.choice)brain.complete(n.station.id,s.choice,{fulfilled:false});choose(n);s=stages.get(n);stop=scripts.get(n)[s.index];
      }
     }
     if(duty.active&&stop.id==='duty-public-review'){
      if(duty.release){enter(n,s.index+1);s=stages.get(n);stop=scripts.get(n)[s.index];}
      else if(duty.line)tell(n,duty.line);
     }
     if(duty.active&&stop.id==='duty-hall-seat'){
      const occupied=state.facilityId===throne.id;
      if(duty.release){if(unmount(n,s)){enter(n,s.index+1);s=stages.get(n);stop=scripts.get(n)[s.index];}else{animate(n,s,t);continue;}}
      else if(occupied||duty.yieldSeat){
       if(!unmount(n,s)){animate(n,s,t);continue;}
       duty.seatYieldState??={index:s.index,planned:false,stalled:0,retries:0};
       // Leave the approach clear for the player before awaiting the chair.
       tell(n,'朝议暂候 · 为御座使用者让出通道');
       const clear=travel(n,duty.seatYieldState,[-2.4,1.415,-4.25],dt);
       if(clear&&!occupied){duty.yieldSeat=false;duty.seatYieldState=null;s.arrived=false;s.waypoint=0;s.planned=false;}
       animate(n,s,t);continue;
      }
      if(duty?.line)tell(n,duty.line);
     }
    }
    if(n===emperor&&invitationHold){if(time>=invitationHold.until||(invitationHold.purpose==='petition'?!petitionAvailability().ok:!invitationOpportunity()))invitationHold=null;else{const p=invitationHold.position;if(!s.mount)n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);tell(n,invitationHold.purpose==='petition'?'已听见你的提请。请到原听候处，当面议定。':'愿邀你受妃嫔名位。是否接受，听从你的心意。');animate(n,s,t);continue;}}
    if(interrupted(n)){tell(n,stop.label+' · 停步与你交谈');if(!s.mount&&state.position)n.root.rotation.y=Math.atan2(state.position.x-n.root.position.x,state.position.z-n.root.position.z);animate(n,s,t);continue;}
    if(!s.arrived){if(travel(n,s,stop.path[s.waypoint],dt)){s.waypoint++;if(s.waypoint===stop.path.length){s.arrived=true;record(n,stop.id+':arrived');}}}
    if(s.arrived){
     if(stop.mount&&!s.mount&&!(n===emperor&&duty&&!duty.active)){
      if(state.facilityId!==stop.mount.id&&(stop.mount.kind==='bed'?furniture.canUse(navigation,safety(n),stop.mount):furniture.canSit(navigation,safety(n),stop.mount))){n.root.position.set(...stop.mount.anchor);n.root.rotation.y=stop.mount.yaw;n.walking=false;s.mount=stop.mount;record(n,stop.id+':seated');}
      else{if(n!==emperor&&(s.waited=(s.waited||0)+dt)>12)s.abortRequested='设施有人使用 · 稍后再来';animate(n,s,t);continue;}
     }
     if(stop.look)n.root.rotation.y=Math.atan2(stop.look[0]-n.root.position.x,stop.look[2]-n.root.position.z);
     if(stop.pair){
      const ready=near(host.root.position,host.home.toArray(),.18)&&!host.walking&&!host.route.length;
      if(!hostHeld&&ready&&!interrupted(host)&&state.performing!==host.station.id){hostHeld=n;hostPreviousYaw=host.root.rotation.y;hostHeldAt=time;record(n,'tea-host-present');}
      if(state.performing===host.station.id)releaseHost();
      if(hostHeld!==n||interrupted(host)||state.performing===host.station.id){if(!interrupted(host)&&(s.waited=(s.waited||0)+dt)>20)s.abortRequested='茶主人正忙 · 改日再访';animate(n,s,t);continue;}
      n.root.rotation.y=Math.atan2(host.root.position.x-n.root.position.x,host.root.position.z-n.root.position.z);host.root.rotation.y=Math.atan2(n.root.position.x-host.root.position.x,n.root.position.z-host.root.position.z);tell(n,'与 Lin 聊今日荷色和茶香');tell(host,'接待'+palaceResident(n.station.id).shortName+' · 茶案前叙话');
     }
     if(stop.consortPair){tell(n,'在前厅等已应邀的姐妹');animate(n,s,t);continue;}
     if(stop.meal){
      if(s.choice?.mealCompleted||n===emperor&&duty&&!duty.active){advance(n,s);animate(n,stages.get(n),t);continue;}
      if(!readyMeal(n,s)){tell(n,'在餐席等候御膳送达');animate(n,s,t);continue;}
      if(getKitchen&&!kitchen()?.startMeal(s.choice.orderId,n.station.id)){tell(n,'等御膳安放妥当');animate(n,s,t);continue;}
      s.mealStarted=true;s.elapsed=Math.min(stop.duration,s.elapsed+dt);
      if(s.elapsed>=stop.duration&&(!getKitchen||kitchen()?.completeMeal(s.choice.orderId,n.station.id))){s.choice.mealCompleted=true;record(n,'meal:consumed:'+s.choice.mealId);advance(n,s);}
      animate(n,stages.get(n),t);continue;
     }
     s.elapsed+=dt;if(s.idle){if(s.elapsed>=stop.duration&&brain.decisionDue(n.station.id))choose(n);}else if(s.elapsed>=(n===emperor&&duty&&!duty.active?0:stop.duration))advance(n,s);
    }
    animate(n,stages.get(n),t);
   }
   updateConversation(dt,t);
   if(hostHeld){host.walking=false;const c=poseContext(host,null);c.handoff=!interrupted(host)&&!interrupted(hostHeld);host.animate(t+host.phase,false,null,c);}
  },
  snapshot:()=>({version:1,decisions:brain.snapshot(),runtime:captureWorldRuntime({time,duty,conversation,hostHeldId:hostHeld?.station.id||null,hostPreviousYaw,hostHeldAt,history,scripts:Object.fromEntries([...scripts].map(([n,s])=>[n.station.id,s])),stages:Object.fromEntries([...stages].map(([n,s])=>[n.station.id,s])),claims:claims.state()})}),
  restore,
  state(){return {time,conversation:conversation?JSON.parse(JSON.stringify(conversation)):null,hostHeld:!!hostHeld,hostActorId:hostHeld?.station.id||null,claims:claims.state(),duty:duty?{...duty}:null,decisions:brain.snapshot(),history:history.map(e=>({...e})),failures:failures.map(e=>({...e})),actors:actors.map(n=>{const s=stages.get(n);return {id:n.station.id,role:n.station.royalRole,ageYears:n.station.ageYears,privateRoomId:n.station.privateRoomId,activity:s.choice?.id||null,stage:scripts.get(n)[s.index].id,waypoint:s.waypoint,elapsed:s.elapsed,arrived:s.arrived,mounted:s.mount?.id||null,orderId:s.choice?.orderId||null,mealId:s.choice?.mealId||null,mealCompleted:!!s.choice?.mealCompleted,cycles:s.cycles,position:n.root.position.toArray(),walking:n.walking,idle:!!s.idle,paused:interrupted(n)};})};},
  dispose(){if(disposed)return;disposed=true;releaseHost();claims.dispose();brain.dispose();for(const n of actors){n.route=[];furniture.releaseActor(n.station.id);if(n.poseContext){n.poseContext.handoff=false;n.poseContext.seatHeight=undefined;}}for(const c of costumes)c?.dispose();for(const kit of meals.values())kit.dispose();}
 };
}
