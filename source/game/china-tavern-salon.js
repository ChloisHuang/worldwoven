import {isSociallyHeld} from './npc-social-ownership.js';
import {createServiceRelationshipOutbox,serviceRelationshipEvent} from './service-relationship-outbox.js';
import {createChinaReceptionPersonalLife} from './china-reception-personal-life.js';
import {createSalonReceptionProps} from './china-salon-reception-props.js';
import {createReceptionWork,receptionWorkValid,advanceReceptionWork,receptionWorkProof} from './china-salon-reception-work.js';
import {TAVERN_LAYOUT_VERSION as LAYOUT_VERSION} from './china-tavern-layout.js';
import {createSalonNeeds} from './china-salon-needs.js';
import {validSalonIncomePolicy} from './china-salon-economy.js';
import {quoteSalonService,validSalonFee,SALON_QUOTE_VERSION} from './china-salon-pricing.js';
import {followActorRoute} from './actor-navigation.js';
import {createSalonArtistLife} from './china-tavern-salon-life.js';
import {knownAdult} from './player-age.js';
import {SALON_ACTIVITIES} from './china-tavern-salon-artists.js';
import {SALON_ROOMS,inSalonRoom,createSalonRoomLedger} from './china-tavern-salon-rooms.js';
const clone=x=>JSON.parse(JSON.stringify(x));
export const SALON_RECEPTION='cn-tavern-reception',SALON_PERFORMER='cn-tavern-reciter';
const MEETING=[22.85,7.815,7.65],RECEPTION=[24.15,7.815,7.65];
export function salonWillingness(actor,activity,relationship=0){
 const p=actor.station.salon||{};
 if(p.willing===false)return {willing:false,reply:'我今日想独自歇一会儿，改日再叙吧。'};
 if(relationship< -2)return {willing:false,reply:'我们还不太投契，今日就先不单独茶叙了。'};
 if(!p.activities?.includes(activity))return {willing:false,reply:`${p.preference||'我今日更想静谈'}，这次邀约就先谢过了。`};
 return {willing:true,reply:p.yes||'好呀，若有空房，我们一起去坐坐。'};
}
export function createChinaTavernSalon({npcs,doors,planPath,moveActor,poseContext,getPlayer,getMounted=()=>null,copperLedger,economy=null,artistMealFunds=economy,npcPayments=null,sharedNeeds=null,getTavern=()=>null,getToilet=()=>null,worldSeed=1,saved={},saveState=()=>{},notify=()=>{},isActorBusy=()=>false,roomAvailable=()=>true,receptionDuty=null,receptionProps=null,receptionEconomy=null,receptionMealFunds=receptionEconomy,canControlReception=()=>true,onRelationshipEvent=null,getRelationship=()=>0}){
 const receptionist=npcs.find(n=>n.station.id===SALON_RECEPTION),performers=npcs.filter(n=>n.station.salon).slice(0,4);if(!receptionist||!performers.length)return null;
 const receptionObjects=receptionDuty?(receptionProps||createSalonReceptionProps(receptionist.root.parent)):null;
 const relationshipOutbox=createServiceRelationshipOutbox(onRelationshipEvent||undefined);
 let relationshipEvents=clone(saved.relationshipEvents||saved.continuity?.relationshipEvents||[]);
 let committedRelationshipEvents=relationshipEvents;
 const relationshipValue=(actorId,customerId)=>Math.max(-5,Math.min(5,(relationships[customerId==='player'?actorId:customerId+':'+actorId]||0)+(Number(getRelationship(actorId,customerId))||0)*5));
 let performer=performers[0],stories=null,contracts=null,privateCompanionship=null;
 const storyProfile=(id,customerId='player')=>stories?.profile(id,{customerId})||{};
 // Only real paid services and explicit story reviews contribute progress.
 const quote=(actor,customerId='player')=>{const profile=storyProfile(actor.station.id,customerId);return quoteSalonService({appearanceScore:actor.preferenceScore,shapeTraits:actor.root.userData?.appearance?.shapeTraits,...profile,relationship:Math.max(-1,Math.min(1,(relationshipValue(actor.station.id,customerId)+(profile.relationshipDelta||0))/5))});};
 const travelState=new Map(),history=Array.isArray(saved.history)?saved.history.slice(-35):[],responses={...(saved.responses||{})},relationships={...(saved.relationships||{})},failures=[];
 let time=Number(saved.time)||0,serial=Number(saved.serial)||0,session=null,returning=false,recoveringReception=false,phaseTime=0,sessionTime=0,disposed=false,conversation=null,lastReply=saved.lastReply||null,paymentError=null,recoverAt=0,life=null,employment=null,needsLife=null,receptionLife=null,receptionEmployment=null,playerReceptionAction=null;
 const ledger=createSalonRoomLedger({roomAvailable,occupants:()=>[...npcs.map(n=>({id:n.station.id,position:n.root.position})),...(getPlayer()?[{id:'player',position:getPlayer().root.position}]:[])]});
 const gap=(a,p)=>Math.hypot(a.root.position.x-p[0],a.root.position.z-p[2]),near=(a,p,r=.07)=>!!a&&gap(a,p)<r&&Math.abs(a.root.position.y-p[1])<.3;
 const customer=()=>session?.customerId?npcs.find(n=>n.station.id===session.customerId):getPlayer();
 const receptionAssignment=()=>receptionDuty?.resolve?.();
 const receptionPresent=()=>{const a=receptionAssignment(),host=a?.actor,home=receptionist.home?.toArray?.()||receptionist.station.npcPosition;return !!host&&!!home&&a.available===true&&a.alive===true&&!host.serviceMount&&!isActorBusy(host)&&!isSociallyHeld(a.holderId,conversation)&&!(a.holderId==='player'&&getMounted())&&near(host,home,.18);};
 const receptionAvailable=()=>!receptionDuty||!receptionEmployment?.handoffPending?.()&&!receptionLife?.blocks()&&receptionPresent();
 const receptionWorkBoundary=()=>!session&&!returning&&!paymentError&&!employment?.active?.();
 const receptionOwner=()=>!receptionDuty||receptionAssignment()?.available===true&&(!session?.receptionWork||receptionAssignment().holderId===session.receptionWork.actorId);
 const receptionProof=()=>session?.receptionWork?receptionWorkProof(session.receptionWork,session):null;
 const paymentSession=()=>session?.receptionWork?{...session,receptionWork:receptionProof()}:session;
 function freezeReception(){if(!receptionDuty)return true;const work=createReceptionWork(session,receptionAssignment());if(!work)return false;session.receptionWork=work;return true;}

 const eligible=(actor,guest=getPlayer())=>knownAdult(guest)&&knownAdult(actor)&&knownAdult(receptionist),adult=()=>eligible(performer,customer())&&(!session?.customerId||customer()?.alive!==false&&performer.alive!==false&&receptionist.alive!==false);
 const relationshipKey=()=>session?.customerId?session.customerId+':'+session.actorId:session?.actorId;
 const willing=()=>contracts?.canInvite(session.actorId)===false?{willing:false,reply:'我决定暂歇，今日不接委托。'}:salonWillingness(performer,session.activity,relationshipValue(session.actorId,session.customerId||'player')+(storyProfile(session.actorId,session.customerId||'player').relationshipDelta||0));
 const canDiscuss=id=>{const n=performers.find(a=>a.station.id===id),p=getPlayer();return !disposed&&!!n&&eligible(n)&&n.alive!==false&&p.alive!==false&&!n.serviceMount&&!getMounted()&&!session&&!returning&&!isActorBusy(n)&&!needsLife?.owns(n)&&!life?.isBusy(n)&&!employment?.active?.()&&!isSociallyHeld(id)&&near(p,n.root.position.toArray(),2);};
 const atReception=()=>near(getPlayer(),RECEPTION,1.25)&&!getMounted();
 const customerAtReception=()=>session?.customerId?near(customer(),RECEPTION,.3)&&!customer()?.serviceMount:atReception();
 const name=()=>performer.station.npcName;
 const say=text=>{if(!session?.customerId)notify(text);};
 const labels=()=>session?.customerId?{invited:`等${name()}答复来客的单独茶叙邀约`,reply:`${name()}正在当面答复来客`,accepted:'本人已答应 · 待预留原客款',escort:'与原来客沿公共楼梯前往雅间',entering:'等双方进入原预约雅间',fade:'按原预约进行单独茶叙',visiting:'单独茶叙已完成 · 原客款已结清'}:({invited:`温晚已引见，等${name()}过来答复`,reply:`${name()}正在当面答复`,accepted:`${name()}愿意茶叙，请确认价目`,escort:`随${name()}沿公共楼梯去客房`,entering:'等两人进到雅间',fade:'茶香渐起，你们聊起了各自的见闻',visiting:'茶叙已完成，可以告辞'});
 const record=(event,data={})=>{history.push({event,id:session?.id||null,actorId:session?.actorId||null,...(session?.customerId?{customerId:session.customerId}:{}),roomId:session?.roomId||null,time:+time.toFixed(2),...data});if(history.length>70)history.shift();};
 const persist=()=>{try{const pending=relationshipOutbox.merge(relationshipEvents);const result=saveState({relationshipEvents:clone(pending),layoutVersion:LAYOUT_VERSION,serial,time,responses:clone(responses),relationships:clone(relationships),lastReply:clone(lastReply),history:clone(history.slice(-35)),artistNeeds:needsLife?.snapshot()||saved.artistNeeds||{},...(receptionLife?{receptionNeeds:receptionLife.snapshot()}:{}),life:life?.snapshot()||saved.life||{}});if(result===false||result?.ok===false||result?.then)return false;relationshipEvents=pending;committedRelationshipEvents=relationshipEvents;relationshipOutbox.deliver(committedRelationshipEvents);return true;}catch{return false;}};
 const resetRoute=a=>{travelState.delete(a);a.route=[];a.walking=false;};
 const enter=stage=>{session.stage=stage;phaseTime=0;resetRoute(performer);if(customer())resetRoute(customer());record(stage);};
 // Unfinished visits do not survive a scene or browser reload. The durable
 // wallet journal, rather than a transient session, owns their refund identity.
 function recoverPayments(){paymentError=null;if(session?.cancelReason&&!cancel(session.cancelReason))return false;for(const hold of copperLedger?.reservations()||[]){if(hold.id.startsWith('cn-salon-')&&hold.status==='reserved'&&hold.id!==session?.id){const r=copperLedger.refund(hold.id);if(!r.ok)paymentError=r.code;}}for(const hold of npcPayments?.held()||[]){if(hold.id===session?.id)continue;const r=npcPayments.refund({id:hold.id,customerId:hold.actorId,actorId:hold.artistId,activity:hold.activity,fee:hold.amount,incomePolicy:hold.incomePolicy});if(!r.ok)paymentError=r.code;}return !paymentError;}
 if(saved.continuity?.version!==1)recoverPayments();
 function beginReturn(){returning=true;resetRoute(performer);}
 function release(reason,complete=false){
  if(!session)return false;
  session.cancelReason=reason;
  if(session.payment==='reserved'){
   const result=session.customerId?npcPayments.refund(session):copperLedger.refund(session.id);
   if(!result.ok){paymentError=result.code;if(session.customerId){session.cancelReason=reason;return false;}say('铜钱退回尚未记妥，暂缓新引见；再次打开接待簿可重试退款');}
   else{paymentError=null;session.payment='refunded';record('refunded',{amount:session.fee});say(`${session.fee}文已全额退回钱袋`);}
  }
  if(session.payment!=='settled'){relationshipEvents=relationshipOutbox.merge(relationshipEvents,[serviceRelationshipEvent('china-salon',session.id,reason==='艺者婉拒'?'refused':'cancelled',session.actorId,session.customerId||'player',time)]);if(!persist())return false;}
  record(complete?'complete':'cancel',{reason,payment:session.payment});ledger.release(session.id);if(customer())resetRoute(customer());session=null;receptionObjects?.clear();recoveringReception=false;phaseTime=0;beginReturn();persist();return true;
 }
 function cancel(reason='你向艺者告辞'){const npc=!!session?.customerId;if(!release(reason))return false;if(!npc)say(reason+'，温晚已撤下留房牌');return true;}
 function travel(a,to,dt,{player=false,hold=false}={}){
  a.walking=false;if(hold||isSociallyHeld(a.station?.id,conversation))return false;if(near(a,to))return true;
  const radius=player ? .34 : .25;let s=travelState.get(a),key=to.join(',');
  if(!s||s.key!==key){s={key,route:planPath(a.root.position,{x:to[0],y:to[1],z:to[2]},radius),stalled:0};travelState.set(a,s);}
  const step=followActorRoute(a,dt,{route:s.route,doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,radius,speedScale:.76,arrivalTolerance:.04});if(step.waiting){s.stalled=0;return false;}const p=step.waypoint;
  if(!p){s.stalled+=dt;if(s.stalled>3){failures.push({actor:player?'player':a.station.id,stage:session?.stage||'return',to:to.slice(),position:a.root.position.toArray()});travelState.delete(a);if(failures.length>8)failures.shift();}return false;}
  s.stalled=a.walking?0:s.stalled+dt;if(s.stalled>1.5){doors.routeBlocked?.(s.route,a.root.position);travelState.delete(a);}return near(a,to);
 }
 function roomForSession(){return SALON_ROOMS.find(r=>r.id===session?.roomId);}
 function escortLeg(){const r=roomForSession();return r?[
  {actor:[19.95,7.815,9.22],player:[21.2,7.815,9.22]},
  {actor:[18.65,4.015,9.25],player:[17.55,4.015,9.25]},
  {actor:r.actor,player:r.player}
 ][session.leg]:null;}
 function request(actorId,activity,expectedFee=null){
  if(receptionAssignment()?.holderId==='player'||disposed||session||returning||!atReception()||employment?.active?.()||!receptionAvailable())return false;
  const chosen=performers.find(n=>n.station.id===actorId);
  if(!chosen||!eligible(chosen)||employment?.onShift(chosen.station.id)||contracts?.canInvite(chosen.station.id)===false){say('温晚：今日没有合适的引见，请先到听席坐坐');return false;}
  if(!copperLedger||copperLedger.loadError||!recoverPayments()){say('铜钱账目尚未核对，暂缓新的付费引见');return false;}
  if(isSociallyHeld(chosen.station.id)||isActorBusy(chosen)||needsLife?.owns(chosen)||life?.isBusy(chosen)){say(`温晚：${chosen.station.npcName}手边尚有事，等歇场再来吧`);return false;}
  activity??=chosen.station.salon.activities[0];if(!SALON_ACTIVITIES[activity])return false;
  const fee=quote(chosen);if(expectedFee!==null&&expectedFee!==fee){say('价目已变化，请先查看本场报价');return false;}
  const prior=responses[actorId];if(prior&&time-prior.at<20){say(`${chosen.station.npcName}：${prior.reply}`);return false;}
  life?.interrupt(chosen);performer=chosen;session={id:`cn-salon-${copperLedger.state().nextTransaction}-${++serial}`,actorId,activity,serviceContent:storyProfile(actorId).serviceContent||null,stage:'invited',roomId:null,leg:0,fee,quoteVersion:SALON_QUOTE_VERSION,payment:'unpaid',...(economy?{incomePolicy:economy.policy()}: {})};if(!freezeReception()){session=null;return false;}resetRoute(performer);performer.returning=false;phaseTime=0;sessionTime=0;record('invited');if(!persist()&&receptionDuty){session=null;beginReturn();return false;}say(`温晚：我请${name()}过来，你在案前稍候`);return true;
 }
 // One optional NPC customer uses this SAME session, performer and room ledger.
 // Life controllers may only lend a real free adult at the public reception.
 function npcChoices(customerId){
  const n=npcs.find(n=>n.station.id===customerId),need=sharedNeeds?.status(customerId);
  if(!receptionAvailable()||!npcPayments||disposed||session||returning||employment?.active?.()||paymentError||!knownAdult(n)||n.alive===false||n.serviceMount||isActorBusy(n)||need?.seekMeal||need?.seekToilet||!SALON_ROOMS.some(r=>ledger.available(r)))return [];
  return performers.filter(a=>!employment?.onShift(a.station.id)&&contracts?.canInvite(a.station.id)!==false&&!isSociallyHeld(a.station.id)&&eligible(a,n)&&a.alive!==false&&!isActorBusy(a)&&!needsLife.owns(a)&&!life.isBusy(a)&&!(sharedNeeds?.status(a.station.id)?.seekMeal&&((artistMealFunds?.account(a.station.id)?.cash||0)+(artistMealFunds?.account(a.station.id)?.bank||0)>=6))&&!sharedNeeds?.status(a.station.id)?.seekToilet).map(a=>({artistId:a.station.id,activity:a.station.salon.activities[0],fee:quote(a,customerId),revision:serial})).filter(c=>npcPayments.available(customerId,c.fee));
 }
 function npcOfferStatus(customerId,actorId,activity,fee){
  const n=npcs.find(a=>a.station.id===customerId),a=performers.find(a=>a.station.id===actorId),need=sharedNeeds?.status(customerId),artistNeed=sharedNeeds?.status(actorId),funds=artistMealFunds?.account(actorId),revision=serial;
  if(!receptionAvailable()||!npcPayments||disposed||session||returning||employment?.active?.()||paymentError||!a||employment?.onShift(actorId)||contracts?.canInvite(actorId)===false||isSociallyHeld(actorId)||!eligible(a,n)||n.alive===false||a.alive===false||n.serviceMount||isActorBusy(n)||isActorBusy(a)||needsLife.owns(a)||need?.seekMeal||need?.seekToilet||artistNeed?.seekToilet||artistNeed?.seekMeal&&(funds?.cash||0)+(funds?.bank||0)>=6||!SALON_ROOMS.some(r=>ledger.available(r))||quote(a,customerId)!==fee||!a.station.salon.activities.includes(activity)||!npcPayments.available(customerId,fee))return {ok:false,waitable:false,revision,code:'offer-changed'};
  if(!salonWillingness(a,activity,relationshipValue(actorId,customerId)).willing)return {ok:false,waitable:false,revision,code:'artist-declined'};
  return {ok:!life.isBusy(a),waitable:life.isBusy(a),revision,code:life.isBusy(a)?'artist-finishing-practice':'available'};
 }
 function requestNPC(customerId,actorId,activity,expectedFee){
  const n=npcs.find(n=>n.station.id===customerId),choice=npcChoices(customerId).find(c=>c.artistId===actorId&&c.activity===activity&&c.fee===expectedFee);
  if(!choice||!near(n,RECEPTION,.3)||receptionAssignment()?.holderId!=='player'&&atReception()||!recoverPayments())return false;
  const chosen=performers.find(a=>a.station.id===actorId),key=customerId+':'+actorId,prior=responses[key];if(prior&&time-prior.at<20)return false;
  if(!life.interrupt(chosen))return false;
  const nextId=npcPayments.nextId(),nextSerial=Math.max(Number(nextId?.split('-').at(-1)),serial+1);if(!Number.isSafeInteger(nextSerial)||nextSerial<1)return false;const id='cn-salon-npc-'+nextSerial;
  performer=chosen;serial=nextSerial;session={id,customerId,customerName:n.station.npcName,actorId,activity,serviceContent:storyProfile(actorId,customerId).serviceContent||null,stage:'invited',roomId:null,leg:0,fee:choice.fee,quoteVersion:SALON_QUOTE_VERSION,payment:'unpaid',incomePolicy:economy.policy()};
  if(!freezeReception()){session=null;return false;}resetRoute(performer);resetRoute(n);performer.returning=false;phaseTime=0;sessionTime=0;record('npc-invited');if(!persist()&&receptionDuty){session=null;beginReturn();return false;}return true;
 }
 function respond(){
  if(!session||!adult()||!customerAtReception()||!near(performer,MEETING))return false;
  const result=willing();lastReply={actorId:session.actorId,name:name(),...result};responses[relationshipKey()]={...lastReply,at:time};record('response',{...result,position:performer.root.position.toArray(),player:customer().root.position.toArray()});say(`${name()}：${result.reply}`);
  if(!result.willing){release('艺者婉拒');return true;}
  const room=SALON_ROOMS.find(r=>ledger.available(r));
  if(!room||!ledger.reserve(room.id,session.id)){lastReply={...lastReply,roomUnavailable:true};record('no-room');release('暂时没有空房');say('温晚：两间客房此刻都不便待客，稍后有空再安排');return true;}
  session.roomId=room.id;enter('accepted');persist();return true;
 }
 function startEscort(){
  if(!session||session.stage!=='accepted'||!customerAtReception()||!adult()||!near(performer,MEETING)||session.receptionWork?.steps.reserveSeconds!==undefined&&session.receptionWork.steps.reserveSeconds!==2)return false;
  const room=roomForSession();
  if(!roomAvailable(room.id)||ledger.claim(room.id)?.owner!==session.id||!willing().willing){cancel(`${name()}暂且改了主意`);return false;}
  // A third party may enter a reserved room before the two guests depart.
  if(npcs.some(n=>n!==performer&&n!==customer()&&inSalonRoom(room,n.root.position))||!!session?.customerId&&inSalonRoom(room,getPlayer()?.root.position)){cancel('雅间刚有客人到访');return false;}
  const result=session.customerId?npcPayments.reserve(session):copperLedger.reserve(session.fee,session.id);
  if(!result.ok){say(result.code==='insufficient-cash'?`手头不足${session.fee}文，可先到一层向许安接洒扫短工`:'这笔尚未记妥，请稍后再试');return false;}
  session.payment='reserved';record('reserved',{amount:session.fee});session.leg=0;enter('escort');persist();say(`${name()}：${room.name}在楼下，随我慢慢走`);return true;
 }
 function entryValid(){const room=roomForSession(),p=customer();return adult()&&room&&roomAvailable(room.id)&&ledger.claim(room.id)?.owner===session.id&&inSalonRoom(room,p?.root.position)&&inSalonRoom(room,performer.root.position)&&near(p,room.player,.18)&&near(performer,room.actor,.18)&&!(npcs.some(n=>n!==performer&&n!==customer()&&inSalonRoom(room,n.root.position))||!!session?.customerId&&inSalonRoom(room,getPlayer()?.root.position));}
 function receptionStep(dt,t){
  const work=session?.receptionWork;if(!work)return false;
  const assignment=receptionAssignment(),host=assignment?.actor,playerWork=work.actorId==='player';
  if(playerWork&&playerReceptionAction!==session.id+':'+work.phase)return false;
  if(!assignment||assignment.holderId!==work.actorId||assignment.revision!==work.holderRevision||assignment.alive!==true||!host||host.alive===false){cancel('接待任职已变化，本单撤下');return false;}
  const phase=work.phase,sourceValid=phase==='register'?session.stage==='invited'&&customerAtReception():phase==='reserve'?session.stage==='accepted'&&customerAtReception()&&near(performer,MEETING)&&ledger.claim(session.roomId)?.owner===session.id:phase==='close'?session.stage==='fade'&&phaseTime>=2.2&&entryValid():false;
  if(!sourceValid)return false;
  if(!receptionPresent()){
   const home=receptionist.home?.toArray?.()||receptionist.station.npcPosition;
   // A conversation freezes the same physical grip without counting work.
   // An absent/mounted body cannot leave a plaque floating over the counter.
   if(isSociallyHeld(receptionist.station.id,conversation)&&home&&near(receptionist,home,.18)&&!receptionist.serviceMount){receptionObjects?.apply(session,receptionist,t,poseContext(receptionist,receptionist.station));return !!receptionObjects;}
   receptionObjects?.rest?.(session);return false;
  }
  host.root.rotation.y=0;host.walking=false;
  const candidate={...session,receptionWork:{...work,seconds:Math.min(2,work.seconds+(Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0))}};
  const observation=receptionObjects?.apply(candidate,host,t,poseContext(host,host.station||receptionist.station));
  const beforeWork=clone(work),beforeHistory=history.length;
  const finished=advanceReceptionWork(work,session,phase,dt,{present:true,posed:observation?.observed===true&&observation.sessionId===session.id&&observation.cardId===work.cardId&&observation.phase===phase,assignment,sourceValid});
  if(finished){record('reception-'+phase,{receptionistId:work.actorId,cardId:work.cardId,roomId:session.roomId});if(!persist()&&playerWork){Object.assign(work,beforeWork);history.splice(beforeHistory);return false;}playerReceptionAction=null;}
  return !!observation;
 }
 function pose(a,t,action,target){if(target&&!a.walking)a.root.rotation.y=Math.atan2(target[0]-a.root.position.x,target[2]-a.root.position.z);if(a.root.visible!==false){const context=poseContext(a,a===receptionist?a.station:null);if(a===receptionist)context.receptionWriting=false;a.animate(t+(a.phase||0),a.walking,a.walking?null:action,context);}}
 life=createSalonArtistLife({performers,worldSeed,sharedNeeds,tryNeeds:n=>needsLife?.tryStart(n),saved:saved.continuity?.life||saved.life||{},saveState:()=>persist(),travel,pose,planPath,getPlayer,isActorBusy});
 needsLife=createSalonNeeds({artists:performers,sharedNeeds,economy:artistMealFunds,getTavern,getToilet,travel,pose,poseContext,resetRoute,saveState:()=>persist(),saved:saved.continuity?.artistNeeds||saved.artistNeeds||{}});
 if(receptionDuty&&receptionEconomy&&receptionMealFunds&&sharedNeeds)receptionLife=createChinaReceptionPersonalLife({npcs,getHolder:()=>receptionAssignment()?.holderId==='player'?null:receptionAssignment()?.actor,getHome:()=>receptionist.home.toArray(),canStart:n=>receptionWorkBoundary()&&!isActorBusy(n)&&!isSociallyHeld(n.station.id,conversation)&&!n.walking&&!n.route.length,canControl:canControlReception,economy:receptionEconomy,mealFunds:receptionMealFunds,sharedNeeds,getTavern,getToilet,getPlayer,doors,planPath,moveActor,poseContext,saved:saved.continuity?.receptionNeeds||saved.receptionNeeds,saveState:()=>persist()});
 return {
  setReceptionEmployment:value=>{receptionEmployment=value;},
  receptionPlayerIntent(){const w=session?.receptionWork;if(w?.actorId!=='player'||w.phase==='completed')return null;const phase=w.phase,valid=phase==='register'?session.stage==='invited':phase==='reserve'?session.stage==='accepted':session.stage==='fade'&&phaseTime>=2.2;if(!valid)return null;return {key:session.id+':'+phase,sessionId:session.id,phase,position:[24.15,7.815,5.45],executionRadius:.17,action:{register:'核记原来客 · 引见本人所请艺者',reserve:'核价 · 挂同号原留房牌',close:'服务已完成 · 核销同号原客款'}[phase]};},
  executeReceptionPlayerWork(intent){const next=this.receptionPlayerIntent();if(!next||next.key!==intent?.key||!receptionPresent()||getMounted())return false;playerReceptionAction=next.key;return true;},
  stopReceptionPlayerWork(){playerReceptionAction=null;},receptionPlayerActing:()=>!!playerReceptionAction,
  receptionPlayerPose:()=>playerReceptionAction?{action:session?.receptionWork?.phase==='reserve'?'tidy':'calligraphy',receptionWriting:session?.receptionWork?.phase!=='reserve',handoff:true}:null,
  receptionPlayerCompleted(){const proof=receptionProof();return session?.payment==='settled'&&npcPayments?.status(session)?.status==='settled'&&economy?.snapshot().receipts.some(r=>r.sessionId===session.id&&r.customerId===session.customerId&&JSON.stringify(r.receptionWork)===JSON.stringify(proof))&&proof?.actorId==='player'?{sessionId:session.id,customerId:session.customerId,customerName:session.customerName,proof,waitSeconds:Math.max(0,session.completedWaitSeconds??sessionTime)}:null;},
  finishReceptionPlayerOrder(id){return session?.id===id&&session.payment==='settled'&&session.receptionWork?.actorId==='player'?release('接待本人已核对评价并销单',true):false;},
  cancelReceptionPlayerOrder(){return session?.receptionWork?.actorId==='player'?cancel('接待本人撤下未完成原单'):!session;},
  receptionWorkBoundary,receptionAdmissionOpen:receptionAvailable,canBorrowReceptionMeal:id=>receptionLife?.canBorrowMeal(id)===true,receptionPersonalState:()=>receptionLife?.snapshot()||null,
  receptionWorkState:()=>receptionObjects?.state()||null,
  canDiscuss,setStories:value=>{stories=value;},setContracts:value=>{contracts=value;},setPrivateCompanionship:value=>{privateCompanionship=value;},
  chooseStory(id,choiceId,offerId){if(!canDiscuss(id)||performers.find(n=>n.station.id===id)?.station.salon.willing===false)return false;return stories?.choose(id,choiceId,{customerId:'player',offerId})?.ok===true;},
  contractAction(id,action,revision){if(action!=='cancel'&&!canDiscuss(id))return false;const result=action==='request'?contracts?.requestRelease(id,revision):action==='reply'?contracts?.respondRelease(id,revision):action==='confirm'?contracts?.confirmRelease(id,revision):action==='cancel'?contracts?.cancelRelease(id,revision):action==='pause'?contracts?.setIndependentAvailability(id,false,revision):action==='resume'?contracts?.setIndependentAvailability(id,true,revision):null;return result?.ok===true;},
  invitePrivate(id){if(!canDiscuss(id))return false;const result=privateCompanionship?.select('player',id);if(!result?.ok)notify(result?.reason==='night-required'?'私人相伴只在晚间询问。':result?.reason==='relationship-unavailable'?'需先建立双方明确好感，并尊重本人界限。':'需要双方当前合法可用的客房、空闲状态和通路；付费茶叙不提供私人房权。');return result?.ok===true;},
  setPrivateMenuReading(open){const event=privateCompanionship?.status();if(open&&event?.participants.includes('player'))privateCompanionship.pauseForMenu?.(event.id);else privateCompanionship?.releaseMenuPause?.();},
  respondPrivate(eventId,accepted){privateCompanionship?.releaseMenuPause?.(eventId);return privateCompanionship?.respond(eventId,'player',accepted)?.ok===true;},cancelPrivate(eventId){privateCompanionship?.releaseMenuPause?.(eventId);return privateCompanionship?.status()?.id===eventId&&privateCompanionship?.withdraw('player')?.ok===true;},
  receptionist,performers,setEmployment:value=>{employment=value;},workTravel:travel,workPose:pose,resetWorkRoute:resetRoute,workRoomAvailable:roomAvailable,workReachable:(n,p)=>{const route=planPath(n.root.position,{x:p[0],y:p[1],z:p[2]},.25);return near(n,p)||!!route?.length&&Math.hypot(route.at(-1).x-p[0],route.at(-1).z-p[2])<.15&&Math.abs(route.at(-1).y-p[1])<.3;},get performer(){return performer;},ledger,request,startEscort:()=>!session?.customerId&&startEscort(),cancel:(reason)=>!session?.customerId&&cancel(reason),atReception,recoverPayments,
  npcChoices,npcOfferStatus,requestNPC,ownsNPCCustomer:id=>!!session?.customerId&&session.customerId===id,
  cancelNPC:(id,reason='本人另有事务，撤下茶叙')=>session?.customerId===id?cancel(reason):true,
  npcStatus:id=>session?.customerId===id?{stage:session.stage,label:session.payment==='settled'?'单独茶叙已完成 · 本人款已结清':session.payment==='reserved'?'单独茶叙 · 本人款已预留':'请温晚引见 · 尚未收费'}:null,
  admissionBusy:()=>!!session||returning||!receptionAvailable(),
  owns:n=>n===receptionist&&(receptionAssignment()?.holderId!=='player'&&receptionOwner()||receptionLife?.owns(n)||receptionEmployment?.owns?.(n))||performers.includes(n)||!!session?.customerId&&n===customer()||employment?.owns(n),
  isProvidingService:id=>session?.customerId===id||performer?.station.id===id&&!!(session||returning),
  canTalkAtPost:n=>(n===receptionist||performers.includes(n))&&!session&&!returning&&!n.walking&&!n.route?.length&&!n.serviceMount&&!isActorBusy(n),
  canBorrowForSocial(n){return performers.includes(n)&&!(n===performer&&(session||returning))&&!isActorBusy(n)&&!life.isBusy(n)&&!needsLife.owns(n)&&!employment?.owns(n);},
  canBorrowArtist(id){const n=performers.find(a=>a.station.id===id);return !!n&&!(n===performer&&(session||returning))&&!isActorBusy(n)&&!life.isBusy(n)&&(!needsLife.owns(n)||needsLife.mealPending(n));},
  personalNeedStatus:n=>receptionLife?.owns(n)?{busy:true,canPause:false,attention:false,job:receptionLife.label()}:needsLife.owns(n)?{busy:true,canPause:false,attention:false,job:needsLife.label(n)}:null,
  // Fixed-size overlay state: no candidate quotes, room scan or wallet journal.
  prepareCurrencyCommit(tx){if(tx?.action!=='settle'||tx.reservationId!==session?.id||!session?.incomePolicy)return null;if(!economy||!validSalonIncomePolicy(session.incomePolicy)||session.stage!=='fade'||phaseTime<2.2||!entryValid()||!adult())return {ok:false,code:'unverified-salon-service'};if(session.receptionWork&&!receptionProof())return {ok:false,code:'reception-work-incomplete'};const actorId=session.actorId,participant=economy.prepareIncome(tx,{...paymentSession(),completed:true});if(!participant.ok)return participant;if(participant.valid?.()===false)return {ok:false,code:'stale-salon-settlement'};return {...participant,committed(){const result=participant.committed();if(result===false)return false;needsLife.refreshFunds(actorId);return result;}};},
  displayState:()=>({serviceContent:session&&!session.customerId?session.serviceContent:null,privateInvitation:privateCompanionship?.status()||null,active:!!session&&!session.customerId,label:session&&!session.customerId?labels()[session.stage]:null,fade:!session?.customerId&&session?.stage==='fade'}),
  active:()=>!!session&&!session.customerId,guidesPlayer:()=>!!session&&!session.customerId&&(recoveringReception||session.stage==='escort'),playerAction:()=>!session?.customerId&&['fade','visiting'].includes(session?.stage)?'relax':null,
  socialStatus:n=>receptionLife?.owns(n)?{busy:true,canPause:false,attention:false,job:receptionLife.label()}:session?.customerId&&n===customer()?{busy:true,canPause:false,attention:false,job:'自费单独茶叙 · '+(session.payment==='settled'?'已结清':session.payment==='reserved'?'本人款已预留':'等本人答复')} :needsLife.owns(n)?{busy:true,canPause:false,attention:false,job:needsLife.label(n)}:employment?.owns(n)?{busy:true,attention:false,job:employment.label()}:n===receptionist?{busy:!!session?.receptionWork,canPause:true,attention:!session?.receptionWork,job:session?.receptionWork?({register:'核记原客邀约',reserve:'核价登记原留房牌',close:'核销原客完成单',completed:'原接待工单已完成'})[session.receptionWork.phase]:'在接待案前引见艺者'}:performers.includes(n)?{canPause:!(n===performer&&(session||returning))&&!life.isBusy(n),busy:n===performer&&(!!session||returning)||life.isBusy(n),attention:!(n===performer&&(session||returning))&&!life.isBusy(n),job:employment?.onShift(n.station.id)?'本专长台班由你当值 · 本人歇场':n===performer&&(session||returning)?session?labels()[session.stage]:'回雅集厅歇场':life.label(n)||n.station.npcLabel}:null,
  furnitureAccess(item){const room=SALON_ROOMS.find(r=>r.id===item.guestRoomId);if(!room)return true;if(ledger.claim(room.id)||npcs.some(n=>inSalonRoom(room,n.root.position))){say('这间客房此刻有人茶叙，等客人离开再用吧');return false;}return true;},
  movePlayer(dt){if(!session||session.customerId||!recoveringReception&&session.stage!=='escort'||!adult())return false;const target=recoveringReception?RECEPTION:escortLeg()?.player,p=getPlayer();if(!target||!p)return false;travel(p,target,dt,{player:true});return p.walking;},
  update(dt,t,{conversationActorId=null}={}){
   if(disposed)return;if(session?.payment==='settled'){const pending=relationshipOutbox.merge(relationshipEvents,[serviceRelationshipEvent('china-salon',session.id,'completed',session.actorId,session.customerId||'player',time),serviceRelationshipEvent('china-salon-guest',session.id,'completed',session.customerId||'player',session.actorId,time),serviceRelationshipEvent('china-salon-reception',session.id,'completed',session.receptionWork?.actorId||receptionist.station.id,session.customerId||'player',time)]);if(pending.length!==relationshipEvents.length)relationshipEvents=pending;}if(relationshipEvents!==committedRelationshipEvents)persist();relationshipOutbox.deliver(committedRelationshipEvents);time+=dt;if(paymentError&&!session&&time>=recoverAt){recoverAt=time+12;recoverPayments();}conversation=conversationActorId;receptionObjects?.sync(session);
   // Cleanup comes before any motion/pose. The personal owner or original
   // tavern/toilet lease is the sole controller while this person is away.
   if(session&&receptionist.alive===false)cancel('接待本人已无法当值');
   if(session?.receptionWork&&!receptionOwner())cancel('接待任职已变化，本单撤下');
   receptionLife?.update(dt,t);
   if(receptionist.alive!==false&&!receptionLife?.owns(receptionist)&&!getTavern()?.guestMeal?.(receptionist.station.id)&&!getToilet()?.ownsActor?.(receptionist)&&receptionOwner()&&receptionAssignment()?.holderId!=='player'&&!receptionEmployment?.owns?.(receptionist)){
    receptionist.walking=false;const receptionHome=receptionist.home?.toArray?.()||receptionist.station.npcPosition;if(receptionHome)travel(receptionist,receptionHome,dt);if(!receptionStep(dt,t))pose(receptionist,t,'tea',receptionist.station.workTarget);
   }
   if(session?.receptionWork?.actorId==='player')receptionStep(dt,t);
   const sessionPaused=!!session&&[performer,customer(),receptionist].some(n=>n&&isSociallyHeld(n.station?.id,conversation));
   if(session&&!recoveringReception&&!sessionPaused){sessionTime+=dt;if(sessionTime>150&&session?.payment!=='settled')cancel('这次引见等待过久，先撤下安排');}
   if(session&&!adult())cancel('温晚撤下了这次引见');
   if(session&&!recoveringReception&&['invited','reply','accepted'].includes(session.stage)&&!customerAtReception())cancel('你离开了接待案');
   if(session&&!['invited','reply'].includes(session.stage)&&!willing().willing)cancel(`${name()}想先回去歇息`);
   if(session?.cancelReason)cancel(session.cancelReason);
   if(sessionPaused&&session&&['entering','fade','visiting'].includes(session.stage)&&!entryValid())cancel('你们结束了这次茶叙');
   if(session&&!session.cancelReason&&!sessionPaused){
    const o=session;performer.walking=false;if(o.customerId){const guest=customer();guest.walking=false;if(recoveringReception)travel(guest,RECEPTION,dt);else if(o.stage==='escort')travel(guest,escortLeg().player,dt);else if(o.stage==='accepted')startEscort();}
    if(recoveringReception){
     // Layout recovery keeps the same session phase and fee. Both original
     // participants walk from their saved coordinates before resuming it.
     travel(performer,MEETING,dt);if(near(performer,MEETING)&&near(customer(),RECEPTION)){recoveringReception=false;resetRoute(performer);resetRoute(customer());}
    }else if(o.stage==='invited'){if((!o.receptionWork||o.receptionWork.steps.registerSeconds===2)&&travel(performer,MEETING,dt))enter('reply');}
    else if(o.stage==='reply'){phaseTime+=dt;if(phaseTime>=1.2)respond();}
    else if(o.stage==='escort'){
     const leg=escortLeg(),p=customer(),separation=p.root.position.distanceTo(performer.root.position);travel(performer,leg.actor,dt,{hold:separation>4.2});
     if(near(performer,leg.actor,.13)&&near(p,leg.player,.13)){record('escort-leg',{leg:o.leg,actor:performer.root.position.toArray(),player:p.root.position.toArray()});o.leg++;if(o.leg===3)enter('entering');else{resetRoute(performer);resetRoute(p);}}
    }else if(o.stage==='entering'){
     if(!entryValid())cancel('还没有一起到达雅间');else{const p=customer();p.root.rotation.y=Math.atan2(performer.root.position.x-p.root.position.x,performer.root.position.z-p.root.position.z);ledger.occupy(o.roomId,o.id);record('both-entered',{actor:performer.root.position.toArray(),player:customer().root.position.toArray()});enter('fade');}
    }else if(o.stage==='fade'||o.stage==='visiting'){
     if(!entryValid())cancel('你们结束了这次茶叙');else{phaseTime+=dt;if(o.stage==='fade'&&phaseTime>=2.2&&(!o.receptionWork||receptionProof())){
      const result=o.customerId?npcPayments.settle(paymentSession(),{elapsed:phaseTime}):copperLedger.settle(o.id);
      if(!result.ok){if(o.receptionWork?.actorId==='player')paymentError=result.code;else cancel('茶叙账目未能记妥，这次先作罢');}
      else{paymentError=null;o.payment='settled';o.completedWaitSeconds=sessionTime;record('tea-and-poetry',{explicit:false,activity:o.activity,amount:o.fee,serviceContent:o.serviceContent});if(o.serviceContent)say(o.serviceContent);if(!onRelationshipEvent)relationships[relationshipKey()]=Math.min(5,(relationships[relationshipKey()]||0)+1);relationshipEvents=relationshipOutbox.merge(relationshipEvents,[serviceRelationshipEvent('china-salon',o.id,'completed',o.actorId,o.customerId||'player',time),serviceRelationshipEvent('china-salon-guest',o.id,'completed',o.customerId||'player',o.actorId,time),serviceRelationshipEvent('china-salon-reception',o.id,'completed',o.receptionWork?.actorId||receptionist.station.id,o.customerId||'player',time)]);if(o.customerId)needsLife.refreshFunds(o.actorId);enter('visiting');persist();}
     }else if(o.stage==='visiting'&&phaseTime>=6&&o.receptionWork?.actorId!=='player'){const who=name(),npc=!!o.customerId;release('茶叙结束',true);if(!npc)say(`${who}：今日谈得愉快，我先回楼上了`);}}
    }
    if(session)pose(performer,t,['fade','visiting'].includes(session.stage)?'relax':null,customer().root.position.toArray());if(session?.customerId)pose(customer(),t,['fade','visiting'].includes(session.stage)?'relax':null,performer.root.position.toArray());
   }else if(sessionPaused){for(const n of [performer,customer()])if(n)n.walking=false;
   }else if(returning){if(travel(performer,performer.home.toArray(),dt)){returning=false;resetRoute(performer);record('returned');persist();}pose(performer,t,null);}
   needsLife.update(dt,t);
   life.update(dt,t,{excluded:new Set(performers.filter(n=>n===performer&&(session||returning)||needsLife.owns(n)||privateCompanionship?.owns(n))),conversationActorId});
   employment?.update(dt,t);
   for(const n of performers){const e=n.label?.querySelector?.('small');if(e)e.textContent=n===performer&&(session||returning)?session?labels()[session.stage]:'艺者 · 返回雅集厅':needsLife.label(n)||(employment?.onShift(n.station.id)?'本专长台班由你当值 · 本人歇场':life.label(n)||n.station.npcLabel);}

  },
  view(){return {...(receptionDuty?{receptionAvailable:receptionAvailable(),receptionLabel:receptionLife?.label()||(!receptionAvailable()?'接待本人暂未在案，稍后再来':'接待在案')}:{}),session:session&&!session.customerId?clone(session):null,npcSession:session?.customerId?{customerName:session.customerName,artistName:name(),payment:session.payment,stage:session.stage}:null,label:session?session.customerId?'已有客人预约单独茶叙':labels()[session.stage]:returning?`${name()}正回雅集厅`:null,returning,fade:!session?.customerId&&session?.stage==='fade',lastReply:session?.customerId?null:clone(lastReply),candidates:performers.filter(n=>eligible(n)).map(n=>({id:n.station.id,name:n.station.npcName,ageYears:n.ageYears??n.station.ageYears??n.station.age,preference:[n.station.salon.preference,storyProfile(n.station.id).preference].filter(Boolean).join('；'),story:stories?.view(n.station.id)||null,contract:contracts?.view(n.station.id)||null,canDiscuss:canDiscuss(n.station.id),specialty:n.station.salon.specialty,gender:n.station.salon.gender,quoteFee:quote(n),activities:n.station.salon.activities.map(id=>({id,...SALON_ACTIVITIES[id],fee:quote(n)})),available:receptionAvailable()&&!employment?.onShift(n.station.id)&&contracts?.canInvite(n.station.id)!==false&&!isSociallyHeld(n.station.id)&&!session&&!returning&&!isActorBusy(n)&&!needsLife.owns(n)&&!life.isBusy(n),status:contracts?.canInvite(n.station.id)===false?'自主休整，暂不接单':life.label(n)})),privateInvitation:privateCompanionship?.status()||null,privateCandidates:privateCompanionship?.candidates('player')||[],rooms:ledger.state(),cash:(copperLedger?.balances?copperLedger.balances()?.copper.cash:copperLedger?.state().cash)??0,paymentError:paymentError||copperLedger?.loadError||null};},
  snapshot:()=>({version:1,relationshipEvents:clone(relationshipEvents),layoutVersion:LAYOUT_VERSION,recoveringReception,time,serial,session:clone(session),performerId:performer.station.id,returning,phaseTime,sessionTime,lastReply:clone(lastReply),history:clone(history),life:life.snapshot(),artistNeeds:needsLife.snapshot(),...(receptionLife?{receptionNeeds:receptionLife.snapshot()}:{}),artistLife:life.continuity()}),
  restore(s){const a=performers.find(n=>n.station.id===(s?.session?.actorId||s?.performerId));if(s?.version!==1||!a||s.session?.receptionWork&&(!receptionDuty||!receptionWorkValid(s.session.receptionWork,s.session))||s.session?.customerId&&(!npcPayments||!npcPayments.recognizesCustomer(s.session.customerId)||s.session.incomePolicy?.performerShareBps!==5000||!npcs.some(n=>n.station.id===s.session.customerId)||!/^cn-salon-npc-[1-9][0-9]*$/.test(s.session.id))||s.session&&(!validSalonFee(s.session.fee,s.session.quoteVersion)||s.session.incomePolicy&&!validSalonIncomePolicy(s.session.incomePolicy))||s.session&&!['invited','reply','accepted','escort','entering','fade','visiting'].includes(s.session.stage))return false;relationshipEvents=relationshipOutbox.merge(relationshipEvents,s.relationshipEvents||[]);performer=a;time=Math.max(0,s.time||0);serial=Math.max(serial,s.serial||0);session=clone(s.session);returning=!!s.returning;recoveringReception=!!session&&(['invited','reply','accepted'].includes(session.stage))&&(!!s.recoveringReception||s.layoutVersion!==LAYOUT_VERSION&&(!near(performer,MEETING)||!near(customer(),RECEPTION)));phaseTime=Math.max(0,s.phaseTime||0);sessionTime=Math.max(0,s.sessionTime||0);lastReply=clone(s.lastReply);history.splice(0,history.length,...clone(s.history||[]));travelState.clear();if(session||returning)resetRoute(performer);if(session&&customer())resetRoute(customer());life.restore(s.artistLife);needsLife.restore(s.artistNeeds);if(receptionLife&&s.receptionNeeds&&!receptionLife.restore(s.receptionNeeds))return false;if(session?.roomId){if(ledger.claim(session.roomId)?.owner!==session.id&&!ledger.reserve(session.roomId,session.id,[session.customerId||'player',performer.station.id])){const npc=!!session.customerId;session=null;if(npc)recoverPayments();return false;}if(['fade','visiting'].includes(session.stage))ledger.occupy(session.roomId,session.id);}if(session?.payment==='reserved'||session?.customerId&&npcPayments.status(session)){const hold=session.customerId?npcPayments.status(session):copperLedger.reservations().find(h=>h.id===session.id);if(hold?.status==='settled'){session.completedWaitSeconds??=sessionTime;session.payment='settled';session.stage='visiting';phaseTime=0;}else if(hold?.status==='reserved'){session.payment='reserved';if(session.stage==='accepted')session.stage='escort';}else if(hold?.status!=='reserved'){ledger.release(session.id);session=null;returning=true;}}return true;},
  socialProfile:id=>{const base=life.socialProfile(id),delta=(storyProfile(id).relationshipDelta||0)/5;return !base||!delta?base:{...base,relations:{...base.relations,player:Math.max(-1,Math.min(1,(base.relations?.player||0)+delta))}};},
  state(){return {...this.view(),serial,life:life.state(),history:clone(history),failures:clone(failures),actor:performer.root.position.toArray(),persistentClaims:false};},
  dispose({suspend=false}={}){if(disposed)return;if(session&&!suspend)release('离开地区');receptionLife?.dispose({suspend});needsLife.dispose({suspend});life.dispose();receptionObjects?.dispose();disposed=true;ledger.clear();travelState.clear();for(const n of [...performers,receptionist])resetRoute(n);session=null;returning=false;if(!suspend)persist();}
 };
}
