import {JAPAN_BATH_BLENDS,JAPAN_SERVICE_POINTS as P} from './japan-service-orders.js';

const live=v=>v.customerType==='player'&&!['cancelled','departed'].includes(v.stage);
const array=p=>p?.toArray?p.toArray():p?[p.x,p.y,p.z]:null;
const near=(a,b,r=.35)=>a&&b&&Math.abs(a[1]-b[1])<.4&&Math.hypot(a[0]-b[0],a[2]-b[2])<=r;
const copy=v=>v?JSON.parse(JSON.stringify(v)):null;

// Player interaction adapter over the same board used by the NPC employees.
// It never creates its own workers, delivery clock, pool locks or meal queue.
// The main scene supplies its actual player/mount getters and renders activity.
export function createJapanPlayerService({board,furniture,getPlayer,getMounted=()=>null,onWardrobeChange=()=>{},notify=()=>{}}) {
 const diningSeats=furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===3.8&&i.center[2]===7.55);
 let activity=null,soak=0,soakSeat=null,deskRequest=false,suspended=false,lastStage=null,lastWardrobe=null;
 const actor=()=>getPlayer(),position=()=>array(actor()?.root.position);
 const visit=()=>board.state().visits.find(live)||null;
 const wardrobePreset=()=>!suspended&&['washing','waiting-bath','bathing','drying'].includes(visit()?.stage)?'onsen-swimwear':null;
 const syncWardrobe=()=>{const preset=wardrobePreset();if(preset!==lastWardrobe){lastWardrobe=preset;onWardrobeChange(preset);}};
 const result=(ok,message)=>{if(message)notify(message);return {ok,message};};
 function releaseDesk(v){if(v)furniture.facilities.release('japan-service-reception',v.id);}
 function interruptActivity() {
  if(activity?.event==='ate'){const v=visit();if(v?.stage==='eating')board.guestStep(v.id,'eating-interrupted');}
  activity=null;
 }
 function begin(event,point,duration,action,label) {
  if(!near(position(),point))return result(false,'先走到服务位置再开始');
  activity={visitId:visit().id,event,point:point.slice(),duration,elapsed:0,action,label};return result(true);
 }
 function desk(v) {
  if(!near(position(),P.playerReception))return false;
  if(!furniture.facilities.request('japan-service-reception',v.id))return false;
  return board.guestStep(v.id,v.stage==='checkout'?'returned-to-desk':'arrived',{position:position()});
 }
 function restorePresence() {
  const v=visit();if(!v)return;
  // Re-entering a region starts at its real spawn. It cannot resume an old
  // reception claim, eating pose or bath seat that no longer exists there.
  board.setPlayerPresent(v.id,false);board.setPlayerPresent(v.id,true);
 }
 restorePresence();
 const api={
  actor,wardrobePreset,blends:JAPAN_BATH_BLENDS,
  register(blendId) {
   if(suspended||!actor())return result(false,'先回到汤馆');
   const existing=visit();if(existing){deskRequest=true;if(existing.stage==='arriving')desk(existing);return result(true,'已有你的浴牌登记，不会重复开单');}
   if(!near(position(),P.playerReception))return result(false,'请先走到接待柜台');
   if(!JAPAN_BATH_BLENDS.some(b=>b.id===blendId))return result(false,'请选择一种汤馆虚构草木浴包');
   const seat=diningSeats[0],appearance=actor().root.userData.appearance;
   if(!seat)return result(false,'休息廊暂时没有可用餐位');
   const v=board.spawn({customerType:'player',name:'你',appearance,side:appearance.bodyPreset.startsWith('masculine')?'men':'women',blendId,position:position(),restPoint:seat.anchor,diningPoint:seat.anchor,restSeatId:seat.id});
   if(!v)return result(false,'你已有一张未结清的浴牌');
   deskRequest=true;desk(v);return result(true,'前台会登记并把本人的浴牌交给你');
  },
  change() {
   const v=visit();if(!v||!['changing','drying'].includes(v.stage))return result(false,'现在不需要更衣');
   return begin(v.stage==='changing'?'changed':'dried',P[v.side+'Changing'],2.5,'tidy',v.stage==='changing'?'整理入浴衣着':'擦干并收好手巾');
  },
  wash() {
   const v=visit();if(v?.stage!=='washing')return result(false,'先领取浴牌并更衣');
   return begin('washed',P[v.side+'Washing'],3.5,'bath-attendant','洗净后再入汤');
  },
  collectBlend() {
   const v=visit();if(v?.stage!=='waiting-bath')return result(false,'先完成更衣与清洗');
   if(!near(position(),P[v.side+'Receive']))return result(false,'请到本侧汤室的浴包交接木凳');
   if(!board.guestStep(v.id,'collect-blend',{position:position()}))return result(false,'你的浴包还在配制或配送，请稍等');
   return result(true,`第 ${v.number} 号浴包已送达，现在可以选择池中空位`);
  },
  bathAccess(pool) {
   const v=visit();if(!v)return {allowed:true,service:false};
   if((pool.poolId||pool.id)!==v.poolId)return {allowed:false,message:'请到浴牌对应的汤池'};
   if(v.stage==='bathing')return {allowed:true,service:true};
   if(v.stage!=='waiting-bath')return {allowed:false,message:'先按浴牌完成更衣和清洗'};
   if(!v.blendReceived)return {allowed:false,message:'先到汤室木凳接收自己的浴包'};
   return {allowed:true,service:true};
  },
  orderMeal() {
   const v=visit(),seat=getMounted();if(v?.stage!=='resting')return result(false,'泡汤、擦干后可以在休息廊点餐');
   if(!seat||!diningSeats.some(s=>s.id===seat.id)||!near(position(),seat.anchor,.8))return result(false,'先坐到休息廊的木长椅');
   const bound=board.bindPlayerDining(v.id,{restPoint:seat.anchor,diningPoint:seat.anchor,servePoint:[seat.position[0]+.7,seat.position[1],seat.position[2]-.12],mealPoint:[seat.center[0]+.55,seat.seatY+.035,seat.center[2]],restSeatId:seat.id});
   if(!bound||!board.guestStep(v.id,'rested',{position:position()})||!board.guestStep(v.id,'sat-to-eat',{position:position()}))return result(false,'餐位状态已改变，请重新坐好');
   return result(true,'汤面已交给后厨，做好后会送到这个餐位');
  },
  eat() {
   const v=visit(),seat=getMounted();if(v?.stage!=='meal-ready')return result(false,'先等你的汤面实际送达');
   if(seat?.id!==v.restSeatId||!near(position(),v.diningPoint,.8))return result(false,'请回到点餐时的座位');
   if(!board.guestStep(v.id,'begin-eating',{position:position()}))return result(false,'餐碗还没送到');
   return begin('ate',v.diningPoint,6,'chair-sit','吃送来的汤面');
  },
  returnToken() {
   const v=visit();if(v?.stage!=='checkout')return result(false,'用完汤面后可以回前台归牌');
   if(!near(position(),P.playerReception))return result(false,'请先回到接待柜台');
   deskRequest=true;desk(v);return result(true,'等前台收回浴牌');
  },
  stopActivity(){interruptActivity();return result(true);},
  cancel() {
   const v=visit();if(!v)return result(false,'没有待处理的服务订单');
   interruptActivity();releaseDesk(v);board.cancel(v.id,'player-cancelled');board.forgetFinished([v.id]);deskRequest=false;soak=0;soakSeat=null;
   // An occupied seat belongs to the physical player until a safe actual exit.
   if(!getMounted())furniture.releaseActor?.('player');
   syncWardrobe();
   return result(true,'本次服务已取消，员工任务和未送出的物品已释放');
  },
  suspend() {
   interruptActivity();const v=visit();if(v){board.checkpoint({[v.id]:getMounted()?.position||position()});releaseDesk(v);board.setPlayerPresent(v.id,false);}
   if(!getMounted())furniture.releaseActor?.('player');deskRequest=false;soak=0;soakSeat=null;suspended=true;syncWardrobe();
  },
  resume(){suspended=false;restorePresence();syncWardrobe();},
  update(dt) {
   if(suspended)return;
   const finished=board.state().visits.find(x=>x.customerType==='player'&&x.stage==='departed');
   if(finished){releaseDesk(finished);board.forgetFinished([finished.id]);notify('浴牌已归还，这次泡汤和用餐完成了');}
   let v=visit();const p=position(),mounted=getMounted();if(!v||!p){syncWardrobe();return;}
   dt=Math.max(0,Math.min(.1,dt));
   if(v.stage==='check-in'&&!near(p,P.playerReception,2)){api.cancel();notify('你离开了前台，未完成的登记已取消');return;}
   if(v.stage==='checkout-ready'&&!near(p,P.playerReception,2)){releaseDesk(v);board.setPlayerPresent(v.id,false);board.setPlayerPresent(v.id,true);deskRequest=false;return;}
   if(v.mealRequested)board.setPlayerDiningPresent(v.id,mounted?.id===v.restSeatId&&near(p,v.diningPoint,.8));
   if(deskRequest&&['arriving','checkout'].includes(v.stage))desk(v);
   if(!['arriving','check-in','checkout','checkout-ready'].includes(v.stage)){releaseDesk(v);deskRequest=false;}
   if(v.stage==='waiting-bath'&&mounted?.kind==='bath'&&api.bathAccess(mounted).allowed){
    const r=furniture.facilities.reservation?.(v.poolId,'player');
    if(r?.seatId===mounted.id&&r.status==='occupied'&&board.guestStep(v.id,'bath-mounted',{poolId:v.poolId,seatId:mounted.id,position:mounted.position})){soak=0;soakSeat=mounted.id;}
   }
   v=visit();
   if(v.stage==='bathing') {
    if(mounted?.id===v.seatId){soak=Math.min(10,soak+dt);soakSeat=v.seatId;}
    else{board.guestStep(v.id,soak>=10?'bathed':'bath-interrupted',{seatId:soakSeat||v.seatId,position:p});soak=0;soakSeat=null;}
   }
   if(activity) {
    const eating=activity.event==='ate';
    if(activity.visitId!==v.id||!near(p,activity.point,eating?.8:.4)||(eating&&mounted?.id!==v.restSeatId))interruptActivity();
    else{activity.elapsed+=dt;if(activity.elapsed>=activity.duration){board.guestStep(v.id,activity.event,{position:p});activity=null;}}
   }
   v=visit();if(v?.stage!==lastStage){lastStage=v?.stage||null;if(v?.stage==='changing')notify(`已领取第 ${v.number} 号浴牌`);if(v?.stage==='meal-ready')notify('你的汤面已经送到餐位');}
   syncWardrobe();
  },
  state:()=>({visit:copy(visit()),activity:copy(activity),soakSeconds:soak,soakReady:soak>=10,suspended}),
  pose:()=>activity?{action:activity.action,heldProp:['changed','dried'].includes(activity.event)?'cloth':null,seatedMeal:activity.event==='ate',workTarget:activity.event==='washed'?(visit()?.side==='men'?[-10.35,4.6,-3.7]:[4.6,4.6,-4.15]):null}:null,
 };
 return api;
}
