import {JAPAN_BATH_BLENDS,JAPAN_DINING_MENU,JAPAN_SERVICE_POINTS as P} from './japan-service-orders.js';

const live=v=>v.customerType==='player'&&!['cancelled','departed'].includes(v.stage);
const array=p=>p?.toArray?p.toArray():p?[p.x,p.y,p.z]:null;
const near=(a,b,r=.35)=>a&&b&&Math.abs(a[1]-b[1])<.4&&Math.hypot(a[0]-b[0],a[2]-b[2])<=r;
const copy=v=>v?JSON.parse(JSON.stringify(v)):null;

export function japanPlayerOrderProgress(snapshot,v) {
 if(!v)return null;
 const claimed=kind=>snapshot.claims.some(j=>j.visitId===v.id&&j.kind===kind),mix=snapshot.items.find(i=>i.id===v.mixtureId),meal=snapshot.items.find(i=>i.id===v.mealId);
 const side=v.side==='men'?'男汤':'女汤';
 const blend=!v.tokenId?['registration','等前台发浴牌']:!mix?(claimed('prepare')?['preparing','正在配制']:['queued','排队配制']):mix.location.type==='worker'?['delivering',`正在送往${side}`]:mix.location.type==='used'?['used','本次草木浴已用毕']:mix.location.id===v.side+'Service'?['delivered',`已到${side}交接木凳`]:['pickup','等待取件'];
 const food=!v.mealRequested?['not-ordered','尚未点餐']:!meal?(claimed('cook')?['cooking','后厨正在制作']:['queued','餐单排队中']):meal.location.type==='worker'?['delivering','服务员正在送餐']:meal.location.type==='used'?['eaten','已用餐完毕']:meal.location.id==='dining'?['delivered','已送到你的餐位']:['pickup','餐点已做好，等待取餐'];
 return {blend:v.orderKind==='dining'?null:{code:blend[0],text:blend[1]},meal:{code:food[0],text:food[1]}};
}

// Player interaction adapter over the same board used by the NPC employees.
// It never creates its own workers, delivery clock, pool locks or meal queue.
// The main scene supplies its actual player/mount getters and renders activity.
export function createJapanPlayerService({board,furniture,copperLedger,getPlayer,getMounted=()=>null,onWardrobeChange=()=>{},notify=()=>{}}) {
 const diningSeats=furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===3.8&&i.center[2]===7.55);
 const counterSeats=furniture.items.filter(i=>i.kind==='seat'&&i.diningKind);
 let activity=null,soak=0,soakSeat=null,deskRequest=false,suspended=false,lastStage=null,lastWardrobe=null;
 let paymentError=null;
 const actor=()=>getPlayer(),position=()=>array(actor()?.root.position);
 const visit=()=>board.state().visits.find(live)||null;
 const wardrobePreset=()=>!suspended&&['washing','waiting-bath','bathing','drying'].includes(visit()?.stage)?'onsen-swimwear':null;
 const syncWardrobe=()=>{const preset=wardrobePreset();if(preset!==lastWardrobe){lastWardrobe=preset;onWardrobeChange(preset);}};
 const result=(ok,message)=>{if(message)notify(message);return {ok,message};};
 function releaseDesk(v){if(v)furniture.facilities.release('japan-service-reception',v.id);}
 function releaseMeal(v){if(v?.orderKind==='dining')furniture.facilities.release(v.restSeatId,v.id);}
 function refundMeal(v){
  const hold=copperLedger?.reservations().find(h=>h.id===v.paymentId);
  if(hold?.status==='settled'||hold?.status==='refunded')return true;
  if(!hold){paymentError='reservation-not-found';return false;}
  const r=copperLedger.refund(v.paymentId);paymentError=r.ok?null:r.code;return r.ok;
 }
 // Only this service's reserved copper is recovered. A bath visit, another
 // country's holds and a meal already paid at the first bite are untouched.
 function recoverDining(){
  paymentError=copperLedger?.loadError||null;
  for(const hold of copperLedger?.reservations()||[])if(hold.id.startsWith('jp-dining-')&&hold.status==='reserved'){
   const r=copperLedger.refund(hold.id);if(!r.ok)paymentError=r.code;
  }
  if(paymentError)return false;
  for(const v of board.state().visits)if(v.orderKind==='dining'){
   if(!refundMeal(v))return false;releaseMeal(v);board.cancel(v.id,'reload-cancelled');board.forgetFinished([v.id]);
  }
  return true;
 }
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
 recoverDining();restorePresence();
 const api={
  actor,wardrobePreset,blends:JAPAN_BATH_BLENDS,menu:JAPAN_DINING_MENU,
  orderDining(dishId) {
   if(suspended||!actor())return result(false,'先回到一楼食堂');
   const existing=visit();if(existing)return result(false,existing.orderKind==='dining'?'已有你的餐单，请先用餐或取消':'你还有一份泡汤服务，请先完成或取消后再单独点餐');
   const dish=JAPAN_DINING_MENU.find(d=>d.id===dishId),mounted=getMounted();
   if(!dish)return result(false,'请选择寿司或拉面');
   if(!Object.values(JAPAN_DINING_MENU).some(d=>near(position(),P[d.counter],1.25))&&!counterSeats.some(s=>near(position(),s.position,.4)||mounted?.id===s.id&&near(position(),s.anchor,.4)))return result(false,'请先到一楼寿司或拉面柜台');
   if(!copperLedger||copperLedger.loadError||paymentError&&!recoverDining())return result(false,'铜钱账目尚未核对，请稍后再试');
   const seats=counterSeats.filter(s=>s.diningKind===dishId),occupied=new Set(furniture.facilities.state().filter(f=>f.reservations.length||f.player).map(f=>f.id));
   const seat=seats.find(s=>s.id===mounted?.id&&!occupied.has(s.id))||seats.find(s=>!occupied.has(s.id));
   if(!seat)return result(false,'吧台餐位暂满，请稍后再来');
   const paymentId=`jp-dining-${board.state().worldSeed}-${copperLedger.state().nextTransaction}`;
   const hold=copperLedger.reserve(dish.price,paymentId);
   if(!hold.ok)return result(false,hold.code==='insufficient-cash'?`随身铜文不足：${dish.name}需 ${dish.price} 铜文。可在中国酒馆向许安接擦桌活，完成后领 12 铜文。`:'本次预留未能保存，请稍后再试');
   const v=board.spawnDining({appearance:actor().root.userData.appearance,dishId,paymentId,position:position(),restPoint:seat.anchor,diningPoint:seat.anchor,servePoint:[seat.center[0],0,seat.center[2]+1.13],mealPoint:[seat.center[0],dishId==='sushi'?1.17:1.09,seat.center[2]-(dishId==='sushi'?.59:.78)],restSeatId:seat.id});
   if(!v){const refund=copperLedger.refund(paymentId);if(!refund.ok)paymentError=refund.code;return result(false,'餐单未能建立，预留正在退回');}
   if(!furniture.facilities.request(seat.id,v.id)){refundMeal(v);board.cancel(v.id,'seat-unavailable');board.forgetFinished([v.id]);return result(false,'餐位已被使用，请重新点餐');}
   board.setPlayerDiningPresent(v.id,mounted?.id===seat.id);
   return result(true,`${dish.name}已交给后厨，预留 ${dish.price} 铜文；请到自己的吧台凳等餐`);
  },
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
   if(v.orderKind==='dining')return {allowed:false,message:'请先用完或取消当前餐单'};
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
   const v=visit(),seat=getMounted();if(v?.stage!=='meal-ready')return result(false,'先等你的餐点实际送达');
   if(seat?.id!==v.restSeatId||!near(position(),v.diningPoint,.8))return result(false,'请回到点餐时的座位');
   if(v.orderKind==='dining'){
    const paid=copperLedger?.settle(v.paymentId);if(!paid?.ok){paymentError=paid?.code||'ledger-unavailable';return result(false,'结算没有保存，请稍后再开始用餐');}paymentError=null;
   }
   if(!board.guestStep(v.id,'begin-eating',{position:position()}))return result(false,'餐碗还没送到');
   return begin('ate',v.diningPoint,6,'chair-sit',v.dishId==='sushi'?'吃送来的寿司':'吃送来的汤面');
  },
  returnToken() {
   const v=visit();if(v?.stage!=='checkout')return result(false,'用完汤面后可以回前台归牌');
   if(!near(position(),P.playerReception))return result(false,'请先回到接待柜台');
   deskRequest=true;desk(v);return result(true,'等前台收回浴牌');
  },
  stopActivity(){interruptActivity();return result(true);},
  cancel(reason='player-cancelled') {
   const v=visit();if(!v)return result(false,'没有待处理的服务订单');
   if(v.orderKind==='dining'&&!refundMeal(v))return result(false,'退款尚未保存，请稍后重试；餐单已保留');
   interruptActivity();releaseDesk(v);releaseMeal(v);board.cancel(v.id,reason);board.forgetFinished([v.id]);deskRequest=false;soak=0;soakSeat=null;
   // An occupied seat belongs to the physical player until a safe actual exit.
   if(!getMounted())furniture.releaseActor?.('player');
   syncWardrobe();
   return result(true,v.orderKind==='dining'?'本餐已取消；未开吃的预留已退回，开吃后的餐费不退':'本次服务已取消，员工任务和未送出的物品已释放');
  },
  suspend() {
   if(visit()?.orderKind==='dining')api.cancel('region-left');
   interruptActivity();const v=visit();if(v){board.checkpoint({[v.id]:getMounted()?.position||position()});releaseDesk(v);board.setPlayerPresent(v.id,false);}
   if(!getMounted())furniture.releaseActor?.('player');deskRequest=false;soak=0;soakSeat=null;suspended=true;syncWardrobe();
  },
  resume(){suspended=false;restorePresence();syncWardrobe();},
  update(dt) {
   if(suspended)return;
   const finished=board.state().visits.find(x=>x.customerType==='player'&&x.stage==='departed');
   if(finished){releaseDesk(finished);releaseMeal(finished);board.forgetFinished([finished.id]);notify(finished.orderKind==='dining'?'这份餐点用完了，欢迎再来':'浴牌已归还，这次泡汤和用餐完成了');}
   let v=visit();const p=position(),mounted=getMounted();if(!v||!p){syncWardrobe();return;}
   dt=Math.max(0,Math.min(.1,dt));
   if((v.stage==='check-in'||v.stage==='arriving'&&deskRequest)&&!near(p,P.playerReception,2)){api.cancel();notify('你离开了前台，未完成的登记已取消');return;}
   if((v.stage==='checkout-ready'||v.stage==='checkout'&&deskRequest)&&!near(p,P.playerReception,2)){releaseDesk(v);board.setPlayerPresent(v.id,false);board.setPlayerPresent(v.id,true);deskRequest=false;return;}
   if(v.mealRequested)board.setPlayerDiningPresent(v.id,mounted?.id===v.restSeatId&&near(p,v.diningPoint,.8));
   if(deskRequest&&['arriving','checkout'].includes(v.stage))desk(v);
   if(!['arriving','check-in','checkout','checkout-ready'].includes(v.stage)){releaseDesk(v);deskRequest=false;}
   if(v.stage==='waiting-bath'&&!mounted?.transitioning&&mounted?.kind==='bath'&&api.bathAccess(mounted).allowed){
    const r=furniture.facilities.reservation?.(v.poolId,'player');
    if(r?.seatId===mounted.id&&r.status==='occupied'&&board.guestStep(v.id,'bath-mounted',{poolId:v.poolId,seatId:mounted.id,position:mounted.position})){soak=0;soakSeat=mounted.id;}
   }
   v=visit();
   if(v.stage==='bathing') {
    if(mounted?.id===v.seatId){soak=Math.min(10,soak+(mounted.transitioning?0:dt));soakSeat=v.seatId;}
    else{board.guestStep(v.id,soak>=10?'bathed':'bath-interrupted',{seatId:soakSeat||v.seatId,position:p});soak=0;soakSeat=null;}
   }
   if(activity) {
    const eating=activity.event==='ate';
    if(activity.visitId!==v.id||!near(p,activity.point,eating?.8:.4)||(eating&&mounted?.id!==v.restSeatId))interruptActivity();
    else{activity.elapsed+=dt;if(activity.elapsed>=activity.duration){board.guestStep(v.id,activity.event,{position:p});activity=null;}}
   }
   v=visit();if(v?.stage!==lastStage){lastStage=v?.stage||null;if(v?.stage==='changing')notify(`已领取第 ${v.number} 号浴牌`);if(v?.stage==='meal-ready')notify('你的餐点已经送到餐位');}
   syncWardrobe();
  },
  state:()=>{const snapshot=board.state(),v=snapshot.visits.find(live)||null;return {visit:v,activity:copy(activity),soakSeconds:soak,soakReady:soak>=10,suspended,progress:japanPlayerOrderProgress(snapshot,v),cash:copperLedger?.state().cash??0,paymentError:paymentError||copperLedger?.loadError||null,payment:v?.paymentId?copperLedger?.reservations().find(h=>h.id===v.paymentId)?.status:null};},
  pose:()=>activity?{action:activity.action,heldProp:['changed','dried'].includes(activity.event)?'cloth':null,seatedMeal:activity.event==='ate',workTarget:activity.event==='washed'?(visit()?.side==='men'?[-10.35,4.6,-3.7]:[4.6,4.6,-4.15]):null}:null,
 };
 return api;
}
