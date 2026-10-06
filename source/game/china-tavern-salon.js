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
export function createChinaTavernSalon({npcs,doors,planPath,moveActor,poseContext,getPlayer,getMounted=()=>null,copperLedger,economy=null,npcPayments=null,sharedNeeds=null,getTavern=()=>null,getToilet=()=>null,worldSeed=1,saved={},saveState=()=>{},notify=()=>{},isActorBusy=()=>false,roomAvailable=()=>true}){
 const receptionist=npcs.find(n=>n.station.id===SALON_RECEPTION),performers=npcs.filter(n=>n.station.salon).slice(0,4);if(!receptionist||!performers.length)return null;
 let performer=performers[0];
 // NPC skill/review ledgers are not implemented; do not invent those bonuses.
 const quote=actor=>quoteSalonService({appearanceScore:actor.preferenceScore,shapeTraits:actor.root.userData?.appearance?.shapeTraits});
 const travelState=new Map(),history=Array.isArray(saved.history)?saved.history.slice(-35):[],responses={...(saved.responses||{})},relationships={...(saved.relationships||{})},failures=[];
 let time=Number(saved.time)||0,serial=Number(saved.serial)||0,session=null,returning=false,recoveringReception=false,phaseTime=0,sessionTime=0,disposed=false,conversation=null,lastReply=saved.lastReply||null,paymentError=null,life=null,employment=null,needsLife=null;
 const ledger=createSalonRoomLedger({roomAvailable,occupants:()=>[...npcs.map(n=>({id:n.station.id,position:n.root.position})),...(getPlayer()?[{id:'player',position:getPlayer().root.position}]:[])]});
 const gap=(a,p)=>Math.hypot(a.root.position.x-p[0],a.root.position.z-p[2]),near=(a,p,r=.07)=>!!a&&gap(a,p)<r&&Math.abs(a.root.position.y-p[1])<.3;
 const customer=()=>session?.customerId?npcs.find(n=>n.station.id===session.customerId):getPlayer();
 const eligible=(actor,guest=getPlayer())=>knownAdult(guest)&&knownAdult(actor)&&knownAdult(receptionist),adult=()=>eligible(performer,customer())&&(!session?.customerId||customer()?.alive!==false&&performer.alive!==false&&receptionist.alive!==false);
 const relationshipKey=()=>session?.customerId?session.customerId+':'+session.actorId:session?.actorId;
 const willing=()=>salonWillingness(performer,session.activity,relationships[relationshipKey()]||0);
 const atReception=()=>near(getPlayer(),RECEPTION,1.25)&&!getMounted();
 const customerAtReception=()=>session?.customerId?near(customer(),RECEPTION,.3)&&!customer()?.serviceMount:atReception();
 const name=()=>performer.station.npcName;
 const say=text=>{if(!session?.customerId)notify(text);};
 const labels=()=>({invited:`温晚已引见，等${name()}过来答复`,reply:`${name()}正在当面答复`,accepted:`${name()}愿意茶叙，请确认价目`,escort:`随${name()}沿公共楼梯去客房`,entering:'等两人进到雅间',fade:'茶香渐起，你们聊起了各自的见闻',visiting:'茶叙已完成，可以告辞'});
 const record=(event,data={})=>{history.push({event,id:session?.id||null,actorId:session?.actorId||null,roomId:session?.roomId||null,time:+time.toFixed(2),...data});if(history.length>70)history.shift();};
 const persist=()=>{try{return saveState({layoutVersion:LAYOUT_VERSION,serial,time,responses:clone(responses),relationships:clone(relationships),lastReply:clone(lastReply),history:clone(history.slice(-35)),artistNeeds:needsLife?.snapshot()||saved.artistNeeds||{},life:life?.snapshot()||saved.life||{}})!==false;}catch{return false;}};
 const resetRoute=a=>{travelState.delete(a);a.route=[];a.walking=false;};
 const enter=stage=>{session.stage=stage;phaseTime=0;resetRoute(performer);if(customer())resetRoute(customer());record(stage);};
 // Unfinished visits do not survive a scene or browser reload. The durable
 // wallet journal, rather than a transient session, owns their refund identity.
 function recoverPayments(){paymentError=null;for(const hold of copperLedger?.reservations()||[]){if(hold.id.startsWith('cn-salon-')&&hold.status==='reserved'&&hold.id!==session?.id){const r=copperLedger.refund(hold.id);if(!r.ok)paymentError=r.code;}}for(const hold of npcPayments?.held()||[]){if(hold.id===session?.id)continue;const r=npcPayments.refund({id:hold.id,customerId:hold.actorId,actorId:hold.artistId,activity:hold.activity,fee:hold.amount,incomePolicy:hold.incomePolicy});if(!r.ok)paymentError=r.code;}return !paymentError;}
 if(saved.continuity?.version!==1)recoverPayments();
 function beginReturn(){returning=true;resetRoute(performer);}
 function release(reason,complete=false){
  if(!session)return false;
  if(session.payment==='reserved'){
   const result=session.customerId?npcPayments.refund(session):copperLedger.refund(session.id);
   if(!result.ok){paymentError=result.code;if(session.customerId){session.cancelReason=reason;return false;}say('铜钱退回尚未记妥，暂缓新引见；再次打开接待簿可重试退款');}
   else{paymentError=null;session.payment='refunded';record('refunded',{amount:session.fee});say(`${session.fee}文已全额退回钱袋`);}
  }
  record(complete?'complete':'cancel',{reason,payment:session.payment});ledger.release(session.id);if(customer())resetRoute(customer());session=null;recoveringReception=false;phaseTime=0;beginReturn();persist();return true;
 }
 function cancel(reason='你向艺者告辞'){const npc=!!session?.customerId;if(!release(reason))return false;if(!npc)say(reason+'，温晚已撤下留房牌');return true;}
 function travel(a,to,dt,{player=false,hold=false}={}){
  a.walking=false;if(near(a,to))return true;if(hold||conversation===a.station?.id)return false;
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
  if(disposed||session||returning||!atReception()||employment?.onShift())return false;
  const chosen=performers.find(n=>n.station.id===actorId);
  if(!chosen||!eligible(chosen)){say('温晚：今日没有合适的引见，请先到听席坐坐');return false;}
  if(!copperLedger||copperLedger.loadError||!recoverPayments()){say('铜钱账目尚未核对，暂缓新的付费引见');return false;}
  if(isActorBusy(chosen)||needsLife?.owns(chosen)||life?.isBusy(chosen)){say(`温晚：${chosen.station.npcName}手边尚有事，等歇场再来吧`);return false;}
  activity??=chosen.station.salon.activities[0];if(!SALON_ACTIVITIES[activity])return false;
  const fee=quote(chosen);if(expectedFee!==null&&expectedFee!==fee){say('价目已变化，请先查看本场报价');return false;}
  const prior=responses[actorId];if(prior&&time-prior.at<20){say(`${chosen.station.npcName}：${prior.reply}`);return false;}
  life?.interrupt(chosen);performer=chosen;session={id:`cn-salon-${copperLedger.state().nextTransaction}-${++serial}`,actorId,activity,stage:'invited',roomId:null,leg:0,fee,quoteVersion:SALON_QUOTE_VERSION,payment:'unpaid',...(economy?{incomePolicy:economy.policy()}: {})};resetRoute(performer);performer.returning=false;phaseTime=0;sessionTime=0;record('invited');persist();say(`温晚：我请${name()}过来，你在案前稍候`);return true;
 }
 // One optional NPC customer uses this SAME session, performer and room ledger.
 // Life controllers may only lend a real free adult at the public reception.
 function npcChoices(customerId){
  const n=npcs.find(n=>n.station.id===customerId),need=sharedNeeds?.status(customerId);
  if(!npcPayments||disposed||session||returning||employment?.onShift()||paymentError||!knownAdult(n)||n.alive===false||n.serviceMount||isActorBusy(n)||need?.seekMeal||need?.seekToilet||!SALON_ROOMS.some(r=>ledger.available(r)))return [];
  return performers.filter(a=>eligible(a,n)&&a.alive!==false&&!isActorBusy(a)&&!needsLife.owns(a)&&!life.isBusy(a)&&!(sharedNeeds?.status(a.station.id)?.seekMeal&&((economy?.account(a.station.id)?.cash||0)+(economy?.account(a.station.id)?.bank||0)>=6))&&!sharedNeeds?.status(a.station.id)?.seekToilet).map(a=>({artistId:a.station.id,activity:a.station.salon.activities[0],fee:quote(a)})).filter(c=>npcPayments.available(customerId,c.fee));
 }
 function requestNPC(customerId,actorId,activity,expectedFee){
  const n=npcs.find(n=>n.station.id===customerId),choice=npcChoices(customerId).find(c=>c.artistId===actorId&&c.activity===activity&&c.fee===expectedFee);
  if(!choice||!near(n,RECEPTION,.3)||atReception()||!recoverPayments())return false;
  const chosen=performers.find(a=>a.station.id===actorId),key=customerId+':'+actorId,prior=responses[key];if(prior&&time-prior.at<20)return false;
  if(!life.interrupt(chosen))return false;
  const id=npcPayments.nextId();if(!id)return false;
  performer=chosen;serial++;session={id,customerId,customerName:n.station.npcName,actorId,activity,stage:'invited',roomId:null,leg:0,fee:choice.fee,quoteVersion:SALON_QUOTE_VERSION,payment:'unpaid',incomePolicy:economy.policy()};
  resetRoute(performer);resetRoute(n);performer.returning=false;phaseTime=0;sessionTime=0;record('npc-invited');persist();return true;
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
  if(!session||session.stage!=='accepted'||!customerAtReception()||!adult()||!near(performer,MEETING))return false;
  const room=roomForSession();
  if(!roomAvailable(room.id)||ledger.claim(room.id)?.owner!==session.id||!willing().willing){cancel(`${name()}暂且改了主意`);return false;}
  // A third party may enter a reserved room before the two guests depart.
  if(npcs.some(n=>n!==performer&&n!==customer()&&inSalonRoom(room,n.root.position))||!!session?.customerId&&inSalonRoom(room,getPlayer()?.root.position)){cancel('雅间刚有客人到访');return false;}
  const result=session.customerId?npcPayments.reserve(session):copperLedger.reserve(session.fee,session.id);
  if(!result.ok){say(result.code==='insufficient-cash'?`手头不足${session.fee}文，可先到一层向许安接洒扫短工`:'这笔尚未记妥，请稍后再试');return false;}
  session.payment='reserved';record('reserved',{amount:session.fee});session.leg=0;enter('escort');persist();say(`${name()}：${room.name}在楼下，随我慢慢走`);return true;
 }
 function entryValid(){const room=roomForSession(),p=customer();return adult()&&room&&roomAvailable(room.id)&&ledger.claim(room.id)?.owner===session.id&&inSalonRoom(room,p?.root.position)&&inSalonRoom(room,performer.root.position)&&near(p,room.player,.18)&&near(performer,room.actor,.18)&&!(npcs.some(n=>n!==performer&&n!==customer()&&inSalonRoom(room,n.root.position))||!!session?.customerId&&inSalonRoom(room,getPlayer()?.root.position));}
 function pose(a,t,action,target){if(target&&!a.walking)a.root.rotation.y=Math.atan2(target[0]-a.root.position.x,target[2]-a.root.position.z);if(a.root.visible!==false)a.animate(t+(a.phase||0),a.walking,a.walking?null:action,poseContext(a,a===receptionist?a.station:null));}
 life=createSalonArtistLife({performers,worldSeed,sharedNeeds,tryNeeds:n=>needsLife?.tryStart(n),saved:saved.continuity?.life||saved.life||{},saveState:()=>persist(),travel,pose,planPath,getPlayer,isActorBusy});
 needsLife=createSalonNeeds({artists:performers,sharedNeeds,economy,getTavern,getToilet,travel,pose,poseContext,resetRoute,saveState:()=>persist(),saved:saved.continuity?.artistNeeds||saved.artistNeeds||{}});
 return {
  receptionist,performers,setEmployment:value=>{employment=value;},workTravel:travel,workPose:pose,resetWorkRoute:resetRoute,workRoomAvailable:roomAvailable,workReachable:(n,p)=>{const route=planPath(n.root.position,{x:p[0],y:p[1],z:p[2]},.25);return near(n,p)||!!route?.length&&Math.hypot(route.at(-1).x-p[0],route.at(-1).z-p[2])<.15&&Math.abs(route.at(-1).y-p[1])<.3;},get performer(){return performer;},ledger,request,startEscort:()=>!session?.customerId&&startEscort(),cancel:(reason)=>!session?.customerId&&cancel(reason),atReception,recoverPayments,
  npcChoices,requestNPC,ownsNPCCustomer:id=>!!session?.customerId&&session.customerId===id,
  cancelNPC:(id,reason='本人另有事务，撤下茶叙')=>session?.customerId===id?cancel(reason):true,
  npcStatus:id=>session?.customerId===id?{stage:session.stage,label:session.payment==='settled'?'单独茶叙已完成 · 本人款已结清':session.payment==='reserved'?'单独茶叙 · 本人款已预留':'请温晚引见 · 尚未收费'}:null,
  admissionBusy:()=>!!session||returning,
  owns:n=>n===receptionist||performers.includes(n)||!!session?.customerId&&n===customer()||employment?.owns(n),
  isProvidingService:id=>session?.customerId===id||performer?.station.id===id&&!!(session||returning),
  canBorrowArtist(id){const n=performers.find(a=>a.station.id===id);return !!n&&!(n===performer&&(session||returning))&&!isActorBusy(n)&&!life.isBusy(n)&&(!needsLife.owns(n)||needsLife.mealPending(n));},
  personalNeedStatus:n=>needsLife.owns(n)?{busy:true,canPause:false,attention:false,job:needsLife.label(n)}:null,
  // Fixed-size overlay state: no candidate quotes, room scan or wallet journal.
  prepareCurrencyCommit(tx){if(tx?.action!=='settle'||tx.reservationId!==session?.id||!session?.incomePolicy)return null;if(!economy||!validSalonIncomePolicy(session.incomePolicy)||session.stage!=='fade'||phaseTime<2.2||!entryValid()||!adult())return {ok:false,code:'unverified-salon-service'};const actorId=session.actorId,participant=economy.prepareIncome(tx,{...session,completed:true});if(!participant.ok)return participant;return {...participant,committed(){participant.committed();needsLife.refreshFunds(actorId);}};},
  displayState:()=>({active:!!session&&!session.customerId,label:session&&!session.customerId?labels()[session.stage]:null,fade:!session?.customerId&&session?.stage==='fade'}),
  active:()=>!!session&&!session.customerId,guidesPlayer:()=>!!session&&!session.customerId&&(recoveringReception||session.stage==='escort'),playerAction:()=>!session?.customerId&&['fade','visiting'].includes(session?.stage)?'relax':null,
  socialStatus:n=>session?.customerId&&n===customer()?{busy:true,canPause:false,attention:false,job:'自费单独茶叙 · '+(session.payment==='settled'?'已结清':session.payment==='reserved'?'本人款已预留':'等本人答复')} :needsLife.owns(n)?{busy:true,canPause:false,attention:false,job:needsLife.label(n)}:employment?.owns(n)?{busy:true,attention:false,job:employment.label()}:n===receptionist?{busy:false,attention:true,job:'在接待案前引见艺者'}:performers.includes(n)?{canPause:!(n===performer&&(session||returning))&&!life.isBusy(n),busy:n===performer&&(!!session||returning)||life.isBusy(n),attention:!(n===performer&&(session||returning))&&!life.isBusy(n),job:n.station.id===SALON_PERFORMER&&employment?.onShift()?'诗词台班由你当值 · 柳清弦歇场':n===performer&&(session||returning)?session?labels()[session.stage]:'回雅集厅歇场':life.label(n)||n.station.npcLabel}:null,
  furnitureAccess(item){const room=SALON_ROOMS.find(r=>r.id===item.guestRoomId);if(!room)return true;if(ledger.claim(room.id)||npcs.some(n=>inSalonRoom(room,n.root.position))){say('这间客房此刻有人茶叙，等客人离开再用吧');return false;}return true;},
  movePlayer(dt){if(!session||session.customerId||!recoveringReception&&session.stage!=='escort'||!adult())return false;const target=recoveringReception?RECEPTION:escortLeg()?.player,p=getPlayer();if(!target||!p)return false;travel(p,target,dt,{player:true});return p.walking;},
  update(dt,t,{conversationActorId=null}={}){
   if(disposed)return;time+=dt;conversation=conversationActorId;receptionist.walking=false;
   const receptionHome=receptionist.home?.toArray?.()||receptionist.station.npcPosition;if(receptionHome)travel(receptionist,receptionHome,dt);pose(receptionist,t,'tea',receptionist.station.workTarget);
   if(session&&!recoveringReception){sessionTime+=dt;if(sessionTime>150)cancel('这次引见等待过久，先撤下安排');}
   if(session&&!adult())cancel('温晚撤下了这次引见');
   if(session&&!recoveringReception&&['invited','reply','accepted'].includes(session.stage)&&!customerAtReception())cancel('你离开了接待案');
   if(session&&!['invited','reply'].includes(session.stage)&&!willing().willing)cancel(`${name()}想先回去歇息`);
   if(session?.cancelReason)cancel(session.cancelReason);
   if(session&&!session.cancelReason){
    const o=session;performer.walking=false;if(o.customerId){const guest=customer();guest.walking=false;if(recoveringReception)travel(guest,RECEPTION,dt);else if(o.stage==='escort')travel(guest,escortLeg().player,dt);else if(o.stage==='accepted')startEscort();}
    if(recoveringReception){
     // Layout recovery keeps the same session phase and fee. Both original
     // participants walk from their saved coordinates before resuming it.
     travel(performer,MEETING,dt);if(near(performer,MEETING)&&near(customer(),RECEPTION)){recoveringReception=false;resetRoute(performer);resetRoute(customer());}
    }else if(o.stage==='invited'){if(travel(performer,MEETING,dt))enter('reply');}
    else if(o.stage==='reply'){phaseTime+=dt;if(phaseTime>=1.2)respond();}
    else if(o.stage==='escort'){
     const leg=escortLeg(),p=customer(),separation=p.root.position.distanceTo(performer.root.position);travel(performer,leg.actor,dt,{hold:separation>4.2});
     if(near(performer,leg.actor,.13)&&near(p,leg.player,.13)){record('escort-leg',{leg:o.leg,actor:performer.root.position.toArray(),player:p.root.position.toArray()});o.leg++;if(o.leg===3)enter('entering');else{resetRoute(performer);resetRoute(p);}}
    }else if(o.stage==='entering'){
     if(!entryValid())cancel('还没有一起到达雅间');else{const p=customer();p.root.rotation.y=Math.atan2(performer.root.position.x-p.root.position.x,performer.root.position.z-p.root.position.z);ledger.occupy(o.roomId,o.id);record('both-entered',{actor:performer.root.position.toArray(),player:customer().root.position.toArray()});enter('fade');}
    }else if(o.stage==='fade'||o.stage==='visiting'){
     if(!entryValid())cancel('你们结束了这次茶叙');else{phaseTime+=dt;if(o.stage==='fade'&&phaseTime>=2.2){
      const result=o.customerId?npcPayments.settle(o,{elapsed:phaseTime}):copperLedger.settle(o.id);
      if(!result.ok)cancel('茶叙账目未能记妥，这次先作罢');
      else{o.payment='settled';record('tea-and-poetry',{explicit:false,activity:o.activity,amount:o.fee});relationships[relationshipKey()]=Math.min(5,(relationships[relationshipKey()]||0)+1);if(o.customerId)needsLife.refreshFunds(o.actorId);enter('visiting');persist();}
     }else if(o.stage==='visiting'&&phaseTime>=6){const who=name(),npc=!!o.customerId;release('茶叙结束',true);if(!npc)say(`${who}：今日谈得愉快，我先回楼上了`);}}
    }
    if(session)pose(performer,t,['fade','visiting'].includes(session.stage)?'relax':null,customer().root.position.toArray());if(session?.customerId)pose(customer(),t,['fade','visiting'].includes(session.stage)?'relax':null,performer.root.position.toArray());
   }else if(returning){if(travel(performer,performer.home.toArray(),dt)){returning=false;resetRoute(performer);record('returned');persist();}pose(performer,t,null);}
   needsLife.update(dt,t);
   life.update(dt,t,{excluded:new Set(performers.filter(n=>n===performer&&(session||returning)||needsLife.owns(n))),conversationActorId});
   employment?.update(dt,t);
   for(const n of performers){const e=n.label?.querySelector?.('small');if(e)e.textContent=n===performer&&(session||returning)?session?labels()[session.stage]:'艺者 · 返回雅集厅':needsLife.label(n)||(n.station.id===SALON_PERFORMER&&employment?.onShift()?'诗词台班由你当值 · 柳清弦歇场':life.label(n)||n.station.npcLabel);}

  },
  view(){return {session:session&&!session.customerId?clone(session):null,npcSession:session?.customerId?{customerName:session.customerName,artistName:name(),payment:session.payment,stage:session.stage}:null,label:session?session.customerId?'已有客人预约单独茶叙':labels()[session.stage]:returning?`${name()}正回雅集厅`:null,returning,fade:!session?.customerId&&session?.stage==='fade',lastReply:session?.customerId?null:clone(lastReply),candidates:performers.filter(n=>eligible(n)).map(n=>({id:n.station.id,name:n.station.npcName,ageYears:n.ageYears??n.station.ageYears??n.station.age,preference:n.station.salon.preference,specialty:n.station.salon.specialty,gender:n.station.salon.gender,quoteFee:quote(n),activities:n.station.salon.activities.map(id=>({id,...SALON_ACTIVITIES[id],fee:quote(n)})),available:!employment?.onShift()&&!session&&!returning&&!isActorBusy(n)&&!needsLife.owns(n)&&!life.isBusy(n),status:life.label(n)})),rooms:ledger.state(),cash:(copperLedger?.balances?copperLedger.balances()?.copper.cash:copperLedger?.state().cash)??0,paymentError:paymentError||copperLedger?.loadError||null};},
  snapshot:()=>({version:1,layoutVersion:LAYOUT_VERSION,recoveringReception,time,serial,session:clone(session),performerId:performer.station.id,returning,phaseTime,sessionTime,lastReply:clone(lastReply),history:clone(history),life:life.snapshot(),artistNeeds:needsLife.snapshot(),artistLife:life.continuity()}),
  restore(s){const a=performers.find(n=>n.station.id===(s?.session?.actorId||s?.performerId));if(s?.version!==1||!a||s.session?.customerId&&(!npcPayments||!npcPayments.recognizesCustomer(s.session.customerId)||s.session.incomePolicy?.performerShareBps!==5000||!npcs.some(n=>n.station.id===s.session.customerId)||!/^cn-salon-npc-[1-9][0-9]*$/.test(s.session.id))||s.session&&(!validSalonFee(s.session.fee,s.session.quoteVersion)||s.session.incomePolicy&&!validSalonIncomePolicy(s.session.incomePolicy))||s.session&&!['invited','reply','accepted','escort','entering','fade','visiting'].includes(s.session.stage))return false;performer=a;time=Math.max(0,s.time||0);serial=Math.max(serial,s.serial||0);session=clone(s.session);returning=!!s.returning;recoveringReception=!!session&&(['invited','reply','accepted'].includes(session.stage))&&(!!s.recoveringReception||s.layoutVersion!==LAYOUT_VERSION&&(!near(performer,MEETING)||!near(customer(),RECEPTION)));phaseTime=Math.max(0,s.phaseTime||0);sessionTime=Math.max(0,s.sessionTime||0);lastReply=clone(s.lastReply);history.splice(0,history.length,...clone(s.history||[]));travelState.clear();if(session||returning)resetRoute(performer);if(session&&customer())resetRoute(customer());life.restore(s.artistLife);needsLife.restore(s.artistNeeds);if(session?.roomId){if(ledger.claim(session.roomId)?.owner!==session.id&&!ledger.reserve(session.roomId,session.id,[session.customerId||'player',performer.station.id])){session=null;return false;}if(['fade','visiting'].includes(session.stage))ledger.occupy(session.roomId,session.id);}if(session?.payment==='reserved'||session?.customerId&&npcPayments.status(session)){const hold=session.customerId?npcPayments.status(session):copperLedger.reservations().find(h=>h.id===session.id);if(hold?.status==='settled'){session.payment='settled';session.stage='visiting';phaseTime=0;}else if(hold?.status==='reserved'){session.payment='reserved';if(session.stage==='accepted')session.stage='escort';}else if(hold?.status!=='reserved'){ledger.release(session.id);session=null;returning=true;}}return true;},
  socialProfile:id=>life.socialProfile(id),
  state(){return {...this.view(),serial,life:life.state(),history:clone(history),failures:clone(failures),actor:performer.root.position.toArray(),persistentClaims:false};},
  dispose({suspend=false}={}){if(disposed)return;if(session&&!suspend)release('离开地区');needsLife.dispose({suspend});life.dispose();disposed=true;ledger.clear();travelState.clear();for(const n of [...performers,receptionist])resetRoute(n);session=null;returning=false;if(!suspend)persist();}
 };
}
