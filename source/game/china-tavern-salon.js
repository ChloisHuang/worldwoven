import {knownAdult} from './player-age.js';
import {SALON_ROOMS,inSalonRoom,createSalonRoomLedger} from './china-tavern-salon-rooms.js';
const clone=x=>JSON.parse(JSON.stringify(x));
export const SALON_RECEPTION='cn-tavern-reception',SALON_PERFORMER='cn-tavern-reciter';
const MEETING=[22.85,7.815,12.65],RECEPTION=[24.15,7.815,12.65];
const labels={invited:'温晚已引见，等柳清弦过来答复',reply:'柳清弦正在当面答复',accepted:'柳清弦愿意叙诗，可以一同下楼',escort:'随柳清弦沿公共楼梯去客房',entering:'等两人进到雅间',fade:'茶香渐起，你们聊起了词章',visiting:'茶叙稍歇，可以告辞'};
export function salonWillingness(actor,activity,relationship=0){
 const p=actor.station.salon||{};
 if(p.willing===false)return {willing:false,reply:'我今日想独自歇一会儿，改日再叙吧。'};
 if(relationship< -2)return {willing:false,reply:'我们还不太投契，今日就先不单独茶叙了。'};
 if(!p.activities?.includes(activity))return {willing:false,reply:'我更喜欢安静叙诗，今日就不赴热闹宴饮了。'};
 return {willing:true,reply:'好呀，正有两句词想与你说。若有空房，我们一起去坐坐。'};
}
export function createChinaTavernSalon({npcs,doors,planPath,moveActor,poseContext,getPlayer,getMounted=()=>null,saved={},saveState=()=>{},notify=()=>{},isActorBusy=()=>false}){
 const receptionist=npcs.find(n=>n.station.id===SALON_RECEPTION),performer=npcs.find(n=>n.station.id===SALON_PERFORMER);if(!receptionist||!performer)return null;
 const travelState=new Map(),history=Array.isArray(saved.history)?saved.history.slice(-35):[],responses={...(saved.responses||{})},relationships={...(saved.relationships||{})},failures=[];
 let time=Number(saved.time)||0,serial=Number(saved.serial)||0,session=null,returning=false,phaseTime=0,disposed=false,conversation=null,lastReply=saved.lastReply||null;
 const ledger=createSalonRoomLedger({occupants:()=>[...npcs.map(n=>({id:n.station.id,position:n.root.position})),...(getPlayer()?[{id:'player',position:getPlayer().root.position}]:[])]});
 const gap=(a,p)=>Math.hypot(a.root.position.x-p[0],a.root.position.z-p[2]),near=(a,p,r=.07)=>!!a&&gap(a,p)<r&&Math.abs(a.root.position.y-p[1])<.3;
 const adult=()=>knownAdult(getPlayer())&&knownAdult(performer)&&knownAdult(receptionist);
 const atReception=()=>near(getPlayer(),RECEPTION,1.25)&&!getMounted();
 const record=(event,data={})=>{history.push({event,id:session?.id||null,actorId:session?.actorId||null,roomId:session?.roomId||null,time:+time.toFixed(2),...data});if(history.length>70)history.shift();};
 const persist=()=>saveState({serial,time,responses:clone(responses),relationships:clone(relationships),lastReply:clone(lastReply),history:clone(history.slice(-35))});
 const resetRoute=a=>{travelState.delete(a);a.route=[];a.walking=false;};
 const enter=stage=>{session.stage=stage;phaseTime=0;resetRoute(performer);if(getPlayer())resetRoute(getPlayer());record(stage);};
 function beginReturn(){returning=true;resetRoute(performer);}
 function release(reason,complete=false){
  if(!session)return false;record(complete?'complete':'cancel',{reason});ledger.release(session.id);session=null;phaseTime=0;if(getPlayer())resetRoute(getPlayer());beginReturn();persist();return true;
 }
 function cancel(reason='你向柳清弦告辞'){if(!release(reason))return false;notify(reason+'，温晚已撤下留房牌');return true;}
 function travel(a,to,dt,{player=false,hold=false}={}){
  a.walking=false;if(near(a,to))return true;if(hold||conversation===a.station?.id)return false;
  const radius=player ? .34 : .25;let s=travelState.get(a),key=to.join(',');
  if(!s||s.key!==key){s={key,route:planPath(a.root.position,{x:to[0],y:to[1],z:to[2]},radius),stalled:0};travelState.set(a,s);}
  const step=doors.routeStep(s.route,a.root.position,.04);if(step.waiting)return false;const p=step.waypoint;
  if(!p){s.stalled+=dt;if(s.stalled>3){failures.push({actor:player?'player':a.station.id,stage:session?.stage||'return',to:to.slice(),position:a.root.position.toArray()});travelState.delete(a);if(failures.length>8)failures.shift();}return false;}
  const dx=p.x-a.root.position.x,dz=p.z-a.root.position.z,d=Math.hypot(dx,dz);
  const others=[...npcs.filter(n=>n!==a),...(getPlayer()&&getPlayer()!==a?[getPlayer()]:[])];
  if(others.some(n=>{const q=n.root.position,x=q.x-a.root.position.x,z=q.z-a.root.position.z;return Math.abs(q.y-a.root.position.y)<.65&&Math.hypot(x,z)<.75&&x*dx+z*dz>.002&&Math.abs(x*dz-z*dx)/Math.max(d,.001)<.52;}))return false;
  if(d>.001){const before=a.root.position.clone(),amount=Math.min(d,dt*a.locomotion.walkSpeed*.76);moveActor(a,dx/d*amount,dz/d*amount,radius);a.root.rotation.y=Math.atan2(dx,dz);a.walking=before.distanceToSquared(a.root.position)>1e-9;}
  s.stalled=a.walking?0:s.stalled+dt;if(s.stalled>1.5){doors.routeBlocked?.(s.route,a.root.position);travelState.delete(a);}return near(a,to);
 }
 function roomForSession(){return SALON_ROOMS.find(r=>r.id===session?.roomId);}
 function escortLeg(){const r=roomForSession();return r?[
  {actor:[19.95,7.815,14.22],player:[21.2,7.815,14.22]},
  {actor:[18.65,4.015,14.25],player:[17.55,4.015,14.25]},
  {actor:r.actor,player:r.player}
 ][session.leg]:null;}
 function request(actorId,activity='poetry'){
  if(disposed||session||returning||!atReception())return false;
  if(actorId!==performer.station.id||!adult()){notify('温晚：今日没有合适的引见，请先到听席坐坐');return false;}
  if(isActorBusy(performer)){notify('温晚：清弦手边尚有事，等她歇场再来吧');return false;}
  const prior=responses[actorId];if(prior&&time-prior.at<20){notify(`${performer.station.npcName}：${prior.reply}`);return false;}
  session={id:'cn-salon-'+(++serial),actorId,activity,stage:'invited',roomId:null,leg:0,fee:0};resetRoute(performer);performer.returning=false;phaseTime=0;record('invited');persist();notify('温晚：我请清弦过来，你在案前稍候');return true;
 }
 function respond(){
  if(!session||!adult()||!atReception()||!near(performer,MEETING))return false;
  const result=salonWillingness(performer,session.activity,relationships[session.actorId]||0);lastReply={actorId:session.actorId,name:performer.station.npcName,...result};responses[session.actorId]={...lastReply,at:time};record('response',{...result,position:performer.root.position.toArray(),player:getPlayer().root.position.toArray()});notify(`${performer.station.npcName}：${result.reply}`);
  if(!result.willing){release('艺者婉拒');return true;}
  const room=SALON_ROOMS.find(r=>ledger.available(r));
  if(!room||!ledger.reserve(room.id,session.id)){lastReply={...lastReply,roomUnavailable:true};record('no-room');release('暂时没有空房');notify('温晚：两间客房此刻都不便待客，稍后有空再安排');return true;}
  session.roomId=room.id;enter('accepted');persist();return true;
 }
 function startEscort(){
  if(!session||session.stage!=='accepted'||!atReception()||!adult()||!near(performer,MEETING))return false;
  const room=roomForSession();if(ledger.claim(room.id)?.owner!==session.id||!salonWillingness(performer,session.activity,relationships[session.actorId]||0).willing){cancel('柳清弦暂且改了主意');return false;}
  session.leg=0;enter('escort');notify(`柳清弦：${room.name}在楼下，随我慢慢走`);return true;
 }
 function entryValid(){const room=roomForSession(),p=getPlayer();return adult()&&room&&ledger.claim(room.id)?.owner===session.id&&inSalonRoom(room,p?.root.position)&&inSalonRoom(room,performer.root.position)&&near(p,room.player,.18)&&near(performer,room.actor,.18);}
 function pose(a,t,action,target){if(target&&!a.walking)a.root.rotation.y=Math.atan2(target[0]-a.root.position.x,target[2]-a.root.position.z);a.animate(t+(a.phase||0),a.walking,a.walking?null:action,poseContext(a,a===receptionist?a.station:null));}
 return {
  receptionist,performer,ledger,request,startEscort,cancel,atReception,
  owns:n=>n===receptionist||n===performer&&(!!session||returning),
  active:()=>!!session,guidesPlayer:()=>session?.stage==='escort',playerAction:()=>['fade','visiting'].includes(session?.stage)?'relax':null,
  socialStatus:n=>n===receptionist?{busy:false,attention:true,job:'在接待案前引见艺者'}:n===performer&&(session||returning)?{busy:true,attention:false,job:session?labels[session.stage]:'回雅集厅歇场'}:null,
  furnitureAccess(item){const room=SALON_ROOMS.find(r=>r.id===item.guestRoomId);if(!room)return true;if(ledger.claim(room.id)||npcs.some(n=>inSalonRoom(room,n.root.position))){notify('这间客房此刻有人茶叙，等客人离开再用吧');return false;}return true;},
  movePlayer(dt){if(session?.stage!=='escort'||!adult())return false;const target=escortLeg()?.player,p=getPlayer();if(!target||!p)return false;travel(p,target,dt,{player:true});return p.walking;},
  update(dt,t,{conversationActorId=null}={}){
   if(disposed)return;time+=dt;conversation=conversationActorId;receptionist.walking=false;pose(receptionist,t,'tea',receptionist.station.workTarget);
   if(session&&!adult())cancel('温晚撤下了这次引见');
   if(session&&['invited','reply','accepted'].includes(session.stage)&&!atReception())cancel('你离开了接待案');
   if(session&&!['invited','reply'].includes(session.stage)&&!salonWillingness(performer,session.activity,relationships[session.actorId]||0).willing)cancel('柳清弦想先回去歇息');
   if(session){
    const o=session;performer.walking=false;
    if(o.stage==='invited'){if(travel(performer,MEETING,dt))enter('reply');}
    else if(o.stage==='reply'){phaseTime+=dt;if(phaseTime>=1.2)respond();}
    else if(o.stage==='escort'){
     const leg=escortLeg(),p=getPlayer(),separation=p.root.position.distanceTo(performer.root.position);travel(performer,leg.actor,dt,{hold:separation>4.2});
     if(near(performer,leg.actor,.13)&&near(p,leg.player,.13)){record('escort-leg',{leg:o.leg,actor:performer.root.position.toArray(),player:p.root.position.toArray()});o.leg++;if(o.leg===3)enter('entering');else{resetRoute(performer);resetRoute(p);}}
    }else if(o.stage==='entering'){
     if(!entryValid())cancel('还没有一起到达雅间');else{const p=getPlayer();p.root.rotation.y=Math.atan2(performer.root.position.x-p.root.position.x,performer.root.position.z-p.root.position.z);ledger.occupy(o.roomId,o.id);record('both-entered',{actor:performer.root.position.toArray(),player:getPlayer().root.position.toArray()});enter('fade');}
    }else if(o.stage==='fade'||o.stage==='visiting'){
     if(!entryValid())cancel('你们结束了这次茶叙');else{phaseTime+=dt;if(o.stage==='fade'&&phaseTime>=2.2){record('tea-and-poetry',{explicit:false});relationships[o.actorId]=Math.min(5,(relationships[o.actorId]||0)+1);enter('visiting');persist();}else if(o.stage==='visiting'&&phaseTime>=6){release('茶叙结束',true);notify('柳清弦：今日谈得愉快，我先回楼上了');}}
    }
    if(session)pose(performer,t,['fade','visiting'].includes(session.stage)?'relax':null,getPlayer().root.position.toArray());
   }else if(returning){if(travel(performer,performer.home.toArray(),dt)){returning=false;performer.breakAt=t+14;resetRoute(performer);record('returned');persist();}pose(performer,t,null);}
   for(const n of [receptionist,performer]){if(n===performer&&!session&&!returning)continue;const e=n.label?.querySelector?.('small');if(e)e.textContent=n===receptionist?'接待 · 引见与安排雅间':session?labels[session.stage]:'艺者 · 返回雅集厅';}
  },
  view(){return {session:session?clone(session):null,label:session?labels[session.stage]:returning?'柳清弦正回雅集厅':null,returning,fade:session?.stage==='fade',lastReply:clone(lastReply),candidates:adult()?[{id:performer.station.id,name:performer.station.npcName,ageYears:performer.station.ageYears??performer.station.age,preference:performer.station.salon.preference,available:!session&&!returning&&!isActorBusy(performer)}]:[],rooms:ledger.state(),fee:0};},
  state(){return {...this.view(),serial,history:clone(history),failures:clone(failures),actor:performer.root.position.toArray(),persistentClaims:false};},
  dispose(){if(disposed)return;if(session)release('离开地区');disposed=true;ledger.clear();travelState.clear();resetRoute(performer);resetRoute(receptionist);session=null;returning=false;persist();}
 };
}
