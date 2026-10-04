import {JAPAN_SERVICE_POINTS as P,JAPAN_RECEPTION_RADIUS} from './japan-service-orders.js';
import {currentInteractionIntent} from './player-interaction-intents.js';

const LABELS={arriving:'回到前台完成登记','check-in':'前台正在登记浴牌',changing:'去更衣柜整理入浴衣着',washing:'到洗浴位洗净后入汤','waiting-bath':'去汤室木凳接收自己的浴包',bathing:'在浴牌对应的共享池座泡汤',drying:'回更衣柜擦干并收好手巾',resting:'坐到休息廊长椅，点一碗汤面',dining:'在餐位等候','waiting-meal':'后厨与服务员正在准备你的汤面','meal-ready':'汤面已送到，坐好后可以用餐',eating:'慢慢吃完这碗汤面',checkout:'回前台归还浴牌','checkout-ready':'前台正在收回浴牌'};

// A small panel plus ordinary E/touch targets. Navigation, physical mounting
// and all employee work remain owned by the existing scene and order board.
export function createJapanPlayerServiceUI({service,furniture,getPlayer,getMounted,onIntent,onFurniture,onStand,onOpen=()=>{},document:doc=globalThis.document}) {
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const style=make('style');style.textContent='.jp-service-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:205px;z-index:18;max-width:calc(100vw - 212px);padding:11px 14px;min-height:44px;border-radius:12px;background:#315e60;color:#fff8e8;font-size:12px;box-shadow:0 3px 12px #173b3320}.jp-service-dialog{position:fixed;inset:0;margin:auto;width:min(360px,calc(100vw - 30px));max-height:calc(100dvh - 32px);padding:22px;overflow:auto;color:#304e44;background:#f3eedf;border:1px solid #c7c5ab;border-radius:16px}.jp-service-dialog::backdrop{background:#173b3366}.jp-service-dialog h2{font-size:22px;margin:0 34px 13px 0}.jp-service-dialog p{font-size:13px;line-height:1.5;margin:8px 0}.jp-service-dialog button{min-height:44px;padding:11px 13px;border-radius:9px;background:#e4dfcb;color:#304e44}.jp-service-dialog button:focus-visible{outline:3px solid #af7b3f;outline-offset:2px}.jp-service-dialog .jp-service-close{position:absolute;right:8px;top:7px;background:transparent;font-size:23px}.jp-service-choices{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:16px 0}.jp-service-choices [aria-pressed=true]{outline:2px solid #497165;background:#dbe8d9}.jp-service-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}.jp-service-actions .jp-service-primary{flex:1;background:#315e60;color:#fff8e8}.jp-service-dialog button:disabled{opacity:.55}.jp-service-note{font-size:11px!important;color:#657168}@media(max-height:550px){.jp-service-ticket{top:160px;font-size:10px;padding:8px 10px}.jp-service-dialog{padding:17px}.jp-service-dialog h2{font-size:19px}}';
 const badge=make('button','汤馆服务','jp-service-ticket'),dialog=make('dialog',null,'jp-service-dialog');badge.type='button';badge.setAttribute('aria-label','查看汤馆服务与浴牌');dialog.setAttribute('aria-label','汤馆服务');doc.head.append(style);doc.body.append(badge,dialog);
 let selected=service.blends[0].id,selectedDish='ramen',mode='bath',signature='',badgeText='',disposed=false,placed=false,choiceRevision=0;
 const uiWindow=doc.defaultView||globalThis,onResize=()=>{placed=false;};uiWindow.addEventListener?.('resize',onResize);
 function placeBadge(){if(placed)return;const rect=doc.querySelector?.('.location-card')?.getBoundingClientRect();if(rect?.height>0){badge.style.top=Math.ceil(rect.bottom+9)+'px';placed=true;}}
 const distance=a=>{const p=getPlayer()?.root.position;return p&&Math.abs(p.y-a[1])<.65?Math.hypot(p.x-a[0],p.z-a[2]):Infinity;};
 const counterSeats=()=>furniture.items.filter(i=>i.kind==='seat'&&i.diningKind);
 const nearbyDining=()=>service.menu.find(d=>distance(P[d.counter])<1.3)||service.menu.find(d=>counterSeats().some(s=>s.diningKind===d.id&&(distance(s.position)<1.2||getMounted()?.id===s.id)));
 const seats=()=>furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===3.8&&i.center[2]===7.55);
 function next() {
  const s=service.state(),v=s.visit,mounted=getMounted();
  if(s.activity)return {kind:'stop',label:'停止当前动作',position:s.activity.point};
  if(!v&&mode==='dining'){const dish=service.menu.find(d=>d.id===selectedDish),local=nearbyDining();return {kind:'order',label:`确认预留 ${dish.price} 铜文 · ${dish.name}`,position:counterSeats().find(s=>mounted?.id===s.id)?.anchor||counterSeats().find(s=>distance(s.position)<=.4)?.position||(local?P[local.counter]:P[dish.counter])};}
  if(v?.orderKind==='dining'){
   const item=counterSeats().find(s=>s.id===v.restSeatId),dish=service.menu.find(d=>d.id===v.dishId);
   if(!item)return {kind:'panel',label:'餐位暂不可用，请取消餐单',position:P[dish.counter]};
   if(mounted?.id!==item.id)return {kind:'seat',label:'到自己的吧台凳等餐',position:item.position,item};
   return {kind:v.stage==='meal-ready'?'eat':'wait',label:v.stage==='meal-ready'?`开始吃${dish.name}`:'等厨师做好并送来餐点',position:v.diningPoint};
  }
  if(!v||v.stage==='arriving')return {kind:'register',label:'登记并领取浴牌',position:P.playerReception};
  if(v.stage==='check-in'||v.stage==='checkout-ready')return {kind:'wait',label:v.stage==='check-in'?'等前台发牌':'等前台收牌',position:P.playerReception};
  if(v.stage==='changing'||v.stage==='drying')return {kind:'change',label:v.stage==='changing'?'整理入浴衣着':'擦干并收好手巾',position:P[v.side+'Changing']};
  if(v.stage==='washing')return {kind:'wash',label:'洗净后再入汤',position:P[v.side+'Washing']};
  if(v.stage==='waiting-bath') {
   if(!v.blendReceived)return {kind:'collect',label:'接收本人的浴包',position:P[v.side+'Receive']};
   const item=furniture.items.find(i=>i.id===v.poolId);return {kind:'bath',label:'到共享汤池入浴',position:item.position,item};
  }
  if(v.stage==='bathing')return {kind:'stand',label:s.soakReady?'完成泡汤并离池':`泡汤 ${Math.floor(s.soakSeconds)}/10 秒 · 提前离池`,position:mounted?.position||P[v.side+'Receive']};
  if(['resting','dining','waiting-meal','meal-ready','eating'].includes(v.stage)) {
   const item=furniture.items.find(i=>i.id===v.restSeatId)||seats()[0],actual=mounted&&seats().find(i=>i.id===mounted.id);
   if(v.stage==='resting'&&actual)return {kind:'meal',label:'在这里点一碗汤面',position:actual.anchor};
   if(!mounted||mounted.id!==item.id)return {kind:'seat',label:v.stage==='resting'?'去休息廊坐下点餐':'回到自己的餐位',position:item.position,item};
   if(v.stage==='meal-ready')return {kind:'eat',label:'吃送来的汤面',position:v.diningPoint};
   return {kind:'wait',label:'在餐位等自己的汤面',position:v.diningPoint};
  }
  if(v.stage==='checkout')return {kind:'return',label:'归还浴牌',position:P.playerReception};
  return {kind:'panel',label:'查看浴牌',position:P.playerReception};
 }
 function close(){if(dialog.open)dialog.close();}
 // Only ordinary service actions join the scene's one selected intent. Seat
 // and pool transfers retain the existing physical furniture controller.
 function currentIntent() {
  const s=service.state(),v=s.visit,step=next();
  if(disposed||s.suspended||!getPlayer()||!['register','change','wash','collect','return','order','meal','eat'].includes(step.kind))return null;
  const dish=service.menu.find(d=>d.id===selectedDish);
  return {id:'jp-player-service-'+step.kind,provider:'japan-player-service',name:'你的汤馆服务',action:step.label,kind:step.kind,position:step.position.slice(),executionRadius:step.kind==='order'?1.25:['register','return'].includes(step.kind)?JAPAN_RECEPTION_RADIUS:.34,keepSeat:!!getMounted()&&['order','meal','eat'].includes(step.kind),
   intentKey:JSON.stringify([choiceRevision,v?.id,v?.stage,v?.tokenId,v?.side,v?.poolId,v?.restSeatId,v?.blendReceived,v?.paymentId,step.kind,v?.blendId||selected,selectedDish,dish?.price])};
 }
 function resolveIntent(candidate){return currentInteractionIntent(candidate,currentIntent());}
 function executeIntent(candidate) {
  const intent=resolveIntent(candidate);if(!intent||distance(intent.position)>intent.executionRadius)return {ok:false,stale:true};
  choiceRevision++; // Consume this exact click before any service or furniture side effect.
  let reply;
  if(intent.kind==='order'){reply=service.orderDining(selectedDish);if(reply.ok){close();const item=counterSeats().find(s=>s.id===service.state().visit?.restSeatId);if(item&&getMounted()?.id!==item.id)onFurniture(item);return reply;}}
  if(intent.kind==='register')reply=service.register(service.state().visit?.blendId||selected);
  if(intent.kind==='change')reply=service.change();if(intent.kind==='wash')reply=service.wash();if(intent.kind==='collect')reply=service.collectBlend();if(intent.kind==='meal')reply=service.orderMeal();if(intent.kind==='eat')reply=service.eat();if(intent.kind==='return')reply=service.returnToken();
  if(reply?.ok)close();else refresh(true);return reply;
 }
 function act(step,intent=currentIntent()) {
  if(['bath','seat'].includes(step.kind)){close();onFurniture(step.item);return;}
  if(step.kind==='stand'){close();onStand();return;}
  if(step.kind==='stop'){service.stopActivity();close();return;}
  if(!resolveIntent(intent)){refresh(true);return;}
  close();if(onIntent)onIntent(intent);else executeIntent(intent);
 }
 function refresh(force=false) {
  const s=service.state(),v=s.visit,step=next(),mounted=getMounted(),key=[v?.id,v?.stage,v?.blendReceived,s.progress?.blend?.code,s.progress?.meal.code,selected,selectedDish,mode,s.cash,s.payment,s.paymentError,step.kind,step.label,distance(step.position)<=.34,mounted?.id].join('|');
  const standalone=v?.orderKind==='dining',dish=service.menu.find(d=>d.id===(v?.dishId||selectedDish));
  const current=standalone?(s.activity?.label||s.progress.meal.text):s.activity?s.activity.label:v?.stage==='waiting-bath'?s.progress.blend.text:v?.stage==='waiting-meal'?s.progress.meal.text:LABELS[v?.stage]||'汤馆服务';
  const text=v?`${standalone?'餐单':'浴牌'} ${v.number} · ${current}`:'一楼点餐 · 泡汤服务';if(text!==badgeText){badgeText=text;badge.textContent=text;}
  if(!dialog.open&&!force)return;if(!force&&signature===key)return;signature=key;dialog.replaceChildren();
  const x=make('button','×','jp-service-close');x.type='button';x.setAttribute('aria-label','关闭汤馆服务');x.onclick=close;
  dialog.append(x,make('h2',v?`第 ${v.number} 号${standalone?'餐单':'浴牌'}`:mode==='dining'?'一楼寿司与拉面':'登记汤馆服务'));
  const blend=v&&service.blends.find(b=>b.id===v.blendId);
  if(!v){const tabs=make('div',null,'jp-service-choices');for(const [id,label]of [['dining','一楼点餐'],['bath','登记泡汤']]){const b=make('button',label);b.type='button';b.setAttribute('aria-pressed',String(mode===id));b.onclick=()=>{choiceRevision++;mode=id;refresh(true);};tabs.append(b);}dialog.append(tabs);}
  if(standalone||!v&&mode==='dining'){
   dialog.append(make('p',standalone?`${dish.name} · ${v.price} 铜文\n${s.progress.meal.text}`:'在一楼直接点餐，不需要浴牌。厨师会在共用后厨制作，再送到你的吧台餐位。'));
   dialog.append(make('p',`随身余额：${s.cash} 铜文${standalone?` · 本餐${s.payment==='settled'?'已结算':'已预留'} ${v.price} 铜文`:''}`));
   dialog.append(make('p','确认时预留餐费，开始吃时结算。未开吃取消、离馆或重新载入会原额退款；开吃后不退。','jp-service-note'));
   if(!v){const choices=make('div',null,'jp-service-choices');for(const dish of service.menu){const b=make('button',`${dish.name} · ${dish.price} 铜文`);b.type='button';b.setAttribute('aria-pressed',String(selectedDish===dish.id));b.onclick=()=>{choiceRevision++;selectedDish=dish.id;refresh(true);};choices.append(b);}dialog.append(choices);if(s.cash<dish.price)dialog.append(make('p','铜文不足。可在中国酒馆向许安接擦桌活，擦净两桌后回来领 12 铜文。','jp-service-note'));}
   if(s.paymentError)dialog.append(make('p','铜钱账目尚未核对，请稍后重试。'));
  }else dialog.append(make('p',v?`${blend?.name||''} · ${v.side==='men'?'男汤':'女汤'}\n${LABELS[v.stage]||'服务已完成'}`:'在前台领取自己的浴牌，选择一份草木浴包，泡汤后可以点汤面。'));
  if(v?.tokenId)dialog.append(make('p',`浴包：${s.progress.blend.text}`));
  if(v?.mealRequested&&!standalone)dialog.append(make('p',`汤面：${s.progress.meal.text}`));
  if(v?.stage==='waiting-bath'&&s.progress.blend.code!=='delivered')dialog.append(make('p','可以离开交接木凳看看汤馆，浴包送到后再回来领取。','jp-service-note'));
  if(v?.stage==='waiting-meal')dialog.append(make('p','离开座位会暂停上菜，回来坐好后会继续。','jp-service-note'));
  if(!v&&mode==='bath'){const choices=make('div',null,'jp-service-choices');for(const blend of service.blends){const b=make('button',blend.name);b.type='button';b.setAttribute('aria-pressed',String(selected===blend.id));b.onclick=()=>{choiceRevision++;selected=blend.id;refresh(true);};choices.append(b);}dialog.append(choices);}
  if(v?.stage==='bathing')dialog.append(make('p',s.soakReady?'泡汤已完成，可以离池。':'泡满10秒再离池，提前离池会保留本次浴包，稍后可以继续。'));
  const intent=currentIntent(),actions=make('div',null,'jp-service-actions'),button=make('button',step.label,'jp-service-primary');button.type='button';button.disabled=step.kind==='wait'||step.kind==='panel'||step.kind==='order'&&(s.cash<dish.price||!!s.paymentError);button.onclick=()=>act(step,intent);actions.append(button);
  if(mounted&&step.kind!=='stand'){const stand=make('button','起身');stand.type='button';stand.onclick=()=>{close();service.stopActivity();onStand();};actions.append(stand);}
  if(v){const cancel=make('button',standalone?'取消本餐':'取消本次服务');cancel.type='button';cancel.onclick=()=>{choiceRevision++;service.cancel();close();};actions.append(cancel);}
  dialog.append(actions,make('p',standalone||mode==='dining'?'关闭面板会保留本次餐单。':'草木浴包是游戏中的虚构配方。关闭面板会保留订单。','jp-service-note'));
 }
 function open(context){choiceRevision++;if(!service.state().visit){if(context==='bath')mode='bath';else{const local=nearbyDining();if(context==='dining'||local){mode='dining';if(local)selectedDish=local.id;}}}onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);}
 badge.onclick=()=>open();dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {
  open,close,currentIntent,resolveIntent,executeIntent,isOpen:()=>dialog.open,
  openStation(id){if(id==='jp-welcome'){open('bath');return true;}if(!['jp-sushi','jp-ramen'].includes(id))return false;selectedDish=id==='jp-sushi'?'sushi':'ramen';open('dining');return true;},
  buttonLabel:target=>({order:'点餐','dining-panel':'点餐',register:'登记',change:'更衣',wash:'清洗',collect:'领浴包',bath:'入汤',meal:'点餐',eat:'用餐',stop:'停止',stand:'离池',wait:'查看',return:'退牌',panel:'浴牌',seat:'入座'}[target.serviceStep?.kind]||'查看'),
  target() {
   if(disposed||dialog.open)return null;const s=service.state(),step=next(),mounted=getMounted();
   if(!s.visit){const dish=nearbyDining();if(dish)return {id:'jp-dining-'+dish.id,playerService:true,serviceStep:{kind:'dining-panel',position:P[dish.counter]},name:dish.id==='sushi'?'寿司吧台':'拉面吧台',action:'查看菜单并点餐',position:P[dish.counter]};}
   if(s.activity)return {id:'jp-service-activity',playerService:true,serviceStep:step,serviceIntent:currentIntent(),name:'汤馆浴牌',action:'停止当前动作',position:step.position};
   if(mounted&&['meal','eat','stand','wait'].includes(step.kind))return {id:'jp-player-service',playerService:true,serviceStep:step,serviceIntent:currentIntent(),name:'你的汤馆服务',action:step.label,position:step.position};
   if(distance(step.position)<1.25)return {id:'jp-player-service',playerService:true,serviceStep:step,serviceIntent:currentIntent(),name:'你的汤馆服务',action:step.label,position:step.position};
   if(distance(P.playerReception)<1.25)return {id:'jp-player-service-desk',playerService:true,serviceStep:{kind:'panel',position:P.playerReception},name:'接待柜台',action:'查看浴牌服务',position:P.playerReception};
   return null;
  },
  interact(target) {const step=target?.serviceStep||next();if(step.kind==='dining-panel')open('dining');else if(['register','wait','panel','order'].includes(step.kind))open();else act(step,target?.serviceIntent);},
  update(){if(!disposed){placeBadge();refresh();}},
  dispose(){disposed=true;uiWindow.removeEventListener?.('resize',onResize);close();badge.remove();dialog.remove();style.remove();},
 };
}
