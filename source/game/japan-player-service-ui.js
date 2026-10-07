import {JAPAN_SERVICE_CURRENCY,japanServiceMoney} from './japan-service-payment.js';
import {JAPAN_SERVICE_POINTS as P,JAPAN_RECEPTION_RADIUS} from './japan-service-orders.js';
import {currentInteractionIntent} from './player-interaction-intents.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';

const LABELS={arriving:'回到前台完成登记','check-in':'前台正在登记浴牌',changing:'去更衣柜整理入浴衣着',washing:'到洗浴位洗净后入汤','waiting-bath':'去汤室木凳接收自己的浴包',bathing:'在浴牌对应的共享池座泡汤',drying:'回更衣柜擦干并收好手巾',resting:'坐到休息廊长椅，点一碗汤面',dining:'在餐位等候','waiting-meal':'后厨与服务员正在准备你的汤面','meal-ready':'汤面已送到，坐好后可以用餐',eating:'慢慢吃完这碗汤面',checkout:'回前台归还浴牌','checkout-ready':'前台正在收回浴牌'};

// A small panel plus ordinary E/touch targets. Navigation, physical mounting
// and all employee work remain owned by the existing scene and order board.
export function createJapanPlayerServiceUI({service,furniture,getPlayer,getMounted,getServiceAnchor=()=>null,onIntent,onFurniture,onStand,onOpen=()=>{},document:doc=globalThis.document}) {
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const style=make('style');style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.jp-service-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:205px;z-index:18;max-width:calc(100vw - 212px);padding:9px 13px;min-height:44px;border-radius:3px;background:#e8f1e7;color:#416b6d;font-size:12px;box-shadow:0 3px 12px #173b3315}
.jp-service-dialog.ww-airy-panel{width:min(720px,var(--ww-ui-width,calc(100vw - 24px)));max-width:none;height:min(340px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px 20px 12px;border:1px solid #d4e5dc;border-radius:20px 7px 20px 7px;background:linear-gradient(115deg,#f7f9ef,#edf5f1 72%,#eff0fa);color:#355e68;box-shadow:0 14px 42px #274b6426;font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif;line-height:1.4}
.jp-service-dialog::backdrop{background:#173b493d;backdrop-filter:blur(3px)}.jp-service-dialog *{box-sizing:border-box}.jp-service-dialog h2{font-family:inherit;font-weight:600;font-size:21px;line-height:1.3;letter-spacing:.08em;margin:0}.jp-service-dialog h3{font-size:19px;line-height:1.3;margin:0 0 5px;font-weight:500}.jp-service-dialog p{font-size:13px;line-height:1.5;margin:5px 0}.jp-service-dialog button{font-family:inherit;min-height:44px;cursor:pointer;box-shadow:none}.jp-service-dialog button:disabled{opacity:.5;cursor:default}.jp-service-dialog .jp-service-close{position:absolute;right:8px;top:7px;width:44px;padding:0;border:0;border-radius:0;background:transparent;color:#7b999b;font-size:26px}.jp-service-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-right:34px;border-bottom:1px solid #d5e5dc;padding-bottom:9px;margin-bottom:10px}.jp-service-heading>span{font-size:12px;color:#759297;white-space:nowrap}.jp-service-content{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:18px;overflow:hidden}.jp-service-menu,.jp-service-detail{min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain}.jp-service-tabs{display:flex;gap:4px;margin:0 0 6px}.jp-service-tabs button{flex:1;padding:4px;background:transparent;color:#829a9a;border:0;border-bottom:1px solid transparent;border-radius:0;font-size:13px}.jp-service-tabs button[aria-pressed=true]{color:#386b72;border-bottom-color:#8ec5b5;background:#e9f1e680}.jp-service-choices{display:grid;gap:6px}.jp-service-choices button{display:block;width:100%;min-height:54px;padding:10px 12px;text-align:left;border:0;border-left:2px solid transparent;border-radius:3px;background:#ffffff65;color:#61848a;font-size:14px}.jp-service-choices button[aria-pressed=true]{border-left-color:#84bdb0;background:linear-gradient(90deg,#dceee4,#e9f4eb70);color:#305f66}.jp-service-detail{position:relative;padding:10px 15px;background:#fffefa80;border:1px solid #dfebe2;border-radius:10px 3px 13px 3px}.jp-service-detail:before{content:'湯';position:absolute;right:14px;top:6px;font-size:52px;line-height:1;color:#cadcd443;pointer-events:none}.jp-service-detail[data-service-kind=dining]:before{content:'食'}.jp-service-kicker{font-size:11px!important;color:#83a0a0;margin:0 0 4px!important;letter-spacing:.08em}.jp-service-price{display:flex;align-items:baseline;gap:5px;margin:6px 0;color:#5b7b94;font-size:12px}.jp-service-price strong{font-size:29px;line-height:1;font-weight:500}.jp-service-status{color:#557c7a}.jp-service-note{font-size:12px!important;color:#819698}.jp-service-error{color:#aa726b!important}.jp-service-actions{display:flex;gap:8px;align-items:center;padding-top:8px;border-top:1px solid #d5e5dc}.jp-service-actions button{width:auto;min-height:44px;padding:8px 12px;border:0;border-radius:0;background:transparent;color:#7b9194;font-size:13px}.jp-service-dialog.ww-airy-theme .jp-service-primary{flex:1;min-width:0;font-size:14px;letter-spacing:.02em;padding:8px 14px}.jp-service-current{padding:12px 8px}.jp-service-current strong{display:block;font-size:21px;font-weight:500;margin-bottom:6px}.jp-service-current p{font-size:13px}
@media(max-height:500px){.jp-service-dialog.ww-airy-panel{padding:12px 18px 10px}.jp-service-heading{padding-bottom:5px;margin-bottom:7px}.jp-service-dialog h2{font-size:18px}.jp-service-dialog h3{font-size:17px}.jp-service-detail{padding:8px 13px}.jp-service-price{margin:5px 0}.jp-service-price strong{font-size:26px}.jp-service-actions{padding-top:5px}.jp-service-ticket{top:160px;font-size:10px}}
@media(max-width:600px){.jp-service-dialog.ww-airy-panel{height:min(530px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px}.jp-service-heading{display:block}.jp-service-heading>span{display:block;margin-top:3px}.jp-service-content{display:block;overflow:auto}.jp-service-menu,.jp-service-detail{overflow:visible}.jp-service-menu{margin-bottom:12px}.jp-service-choices{grid-template-columns:1fr 1fr}.jp-service-choices button{font-size:13px}.jp-service-current{padding:3px}.jp-service-actions{gap:4px}.jp-service-actions button{padding:7px}}
`;
 const badge=make('button','汤馆服务','jp-service-ticket'),dialog=make('dialog',null,'jp-service-dialog ww-airy-theme ww-airy-panel');badge.type='button';badge.setAttribute('aria-label','查看汤馆服务与浴牌');dialog.setAttribute('aria-label','汤馆服务');doc.head.append(style);doc.body.append(badge,dialog);
 let liveVisit=false,selected=service.blends[0].id,selectedDish='ramen',mode='bath',signature='',badgeText='',disposed=false,placed=false,choiceRevision=0;
 const uiWindow=doc.defaultView||globalThis,onResize=()=>{placed=false;};uiWindow.addEventListener?.('resize',onResize);
 function placeBadge(){if(placed)return;const rect=doc.querySelector?.('.location-card')?.getBoundingClientRect();if(rect?.height>0){badge.style.top=Math.ceil(rect.bottom+9)+'px';placed=true;}}
 const distance=a=>{const p=getPlayer()?.root.position;return p&&Math.abs(p.y-a[1])<.65?Math.hypot(p.x-a[0],p.z-a[2]):Infinity;};
 const counterSeats=()=>furniture.items.filter(i=>i.kind==='seat'&&i.diningKind);
 const nearbyDining=()=>service.menu.find(d=>distance(P[d.counter])<1.3)||service.menu.find(d=>counterSeats().some(s=>s.diningKind===d.id&&(distance(s.position)<1.2||getMounted()?.id===s.id)));
 const seats=()=>furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===3.8&&i.center[2]===7.55);
 function nextStep(s) {
  const v=s.visit,mounted=getMounted();
  if(s.activity)return {kind:'stop',label:'停止当前动作',position:s.activity.point};
  if(!v&&mode==='dining'){const dish=service.menu.find(d=>d.id===selectedDish),local=nearbyDining();return {kind:'order',label:`确认预留 ${dish.price} 券 · ${dish.name}`,position:counterSeats().find(s=>mounted?.id===s.id)?.anchor||counterSeats().find(s=>distance(s.position)<=.4)?.position||(local?P[local.counter]:P[dish.counter])};}
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
 function next(){
  const s=service.state(),step=nextStep(s),v=s.visit;
  // Retain actual furniture/meal identity when the standing point is the
  // avatar's seat anchor. No HUD marker may use that floor point as its object.
  const frontDesk=!v||['arriving','check-in','checkout','checkout-ready'].includes(v.stage);
  const visualAnchor=step.item?{furnitureId:step.item.id}:step.kind==='meal'?{furnitureId:getMounted()?.id||v.restSeatId}:!frontDesk&&['eat','meal','wait'].includes(step.kind)?v.mealPoint?{id:'jp-meal:'+v.id,point:v.mealPoint.slice()}:{furnitureId:v.restSeatId}:frontDesk&&step.kind==='wait'?{actorId:'jp-welcome'}:null;
  return {...step,dishId:v?.dishId||selectedDish,...(visualAnchor?{visualAnchor}:{})};
 }
 // Keep browsing on the meal's actual table/bench or on the issued token.
 // The pre-token registration phase belongs to the existing reception ledger.
 function menuTarget(){
  const s=service.state(),v=s.visit,player=getPlayer();liveVisit=!!v;if(disposed||s.suspended||!v||!player)return null;
  const mounted=getMounted(),meal=v.orderKind==='dining'||['resting','dining','waiting-meal','meal-ready','eating'].includes(v.stage);
  const base={id:'jp-visit-'+v.id,name:'汤馆服务',targetKey:'jp-welcome',targetName:'汤馆服务',action:'查看浴牌或餐单',executionRadius:1.8,interactionRadius:2.8,priority:52,intentKey:JSON.stringify([v.id,v.stage,v.tokenId,v.restSeatId,v.mealId,!!v.mealRequested])};
  const carried=()=>({...base,position:player.root.position.toArray(),executionRadius:.4,interactionRadius:.4,visibilityChecked:true,continuation:true});
  if(meal){
   const item=v.stage==='resting'&&seats().find(i=>i.id===mounted?.id)||furniture.items.find(i=>i.id===v.restSeatId);
   if(item){const point=v.mealPoint;return {...base,targetKey:item.id,intentKey:base.intentKey+':'+item.id,position:(mounted?.id===item.id?item.anchor:item.position).slice(),visualAnchor:point?{id:'jp-meal:'+v.id,point:point.slice()}:{furnitureId:item.id}};}
   return carried(); // Missing/restored dining furniture still permits cancellation.
  }
  const token=v.tokenId&&getServiceAnchor(v.tokenId);
  if(token)return {...base,position:player.root.position.toArray(),executionRadius:.4,interactionRadius:.4,visibilityChecked:true,visualAnchor:token};
  if(!v.tokenId||['arriving','check-in','checkout-ready'].includes(v.stage))return {...base,position:P.playerReception.slice(),visualAnchor:{id:'jp-reception-ledger',point:P.receptionLedger.slice()}};
  // During a missing/restoring object frame retain cancellation access. Never
  // invent a badge or send an active bath visit back to a distant counter.
  return carried();
 }
 function close(){if(dialog.open)dialog.close();}
 // Only ordinary service actions join the scene's one selected intent. Seat
 // and pool transfers retain the existing physical furniture controller.
 function currentIntent() {
  const s=service.state(),v=s.visit,step=next();
  if(disposed||s.suspended||!getPlayer()||!['register','change','wash','collect','return','order','meal','eat'].includes(step.kind))return null;
  const dish=service.menu.find(d=>d.id===selectedDish);
  return {id:'jp-player-service-'+step.kind,provider:'japan-player-service',name:'你的汤馆服务',action:step.label,kind:step.kind,serviceStep:step,visualAnchor:step.visualAnchor,position:step.position.slice(),executionRadius:step.kind==='order'?1.25:['register','return'].includes(step.kind)?JAPAN_RECEPTION_RADIUS:.34,keepSeat:!!getMounted()&&['order','meal','eat'].includes(step.kind),
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
  const s=service.state(),v=s.visit,step=next(),mounted=getMounted(),money=japanServiceMoney(s.currency||v?.currency||JAPAN_SERVICE_CURRENCY),unit=money.displayUnit,key=[v?.id,v?.stage,v?.blendReceived,s.progress?.blend?.code,s.progress?.meal.code,selected,selectedDish,mode,s.currency,v?.price,s.cash,s.payment,s.paymentError,step.kind,step.label,distance(step.position)<=.34,mounted?.id].join('|');
  liveVisit=!!v;
  const standalone=v?.orderKind==='dining',dish=service.menu.find(d=>d.id===(v?.dishId||selectedDish));
  const current=standalone?(s.activity?.label||s.progress.meal.text):s.activity?s.activity.label:v?.stage==='waiting-bath'?s.progress.blend.text:v?.stage==='waiting-meal'?s.progress.meal.text:LABELS[v?.stage]||'汤馆服务';
  const text=v?`${standalone?'餐单':'浴牌'} ${v.number} · ${current}`:'一楼点餐 · 泡汤服务';if(text!==badgeText){badgeText=text;badge.textContent=text;}
  if(!dialog.open&&!force)return;if(!force&&signature===key)return;signature=key;dialog.replaceChildren();
  const x=make('button','×','jp-service-close');x.type='button';x.setAttribute('aria-label','关闭汤馆服务');x.onclick=close;
  const {header,body,actions}=createAiryPanelParts(doc);header.className+=' jp-service-heading';body.className+=' jp-service-content';actions.className+=' jp-service-actions';
  header.append(make('h2',v?`第 ${v.number} 号${standalone?'餐单':'浴牌'}`:'汤馆 · 食与汤'),make('span',`${money.label} · 随身 ${s.cash} ${unit}`));
  const menu=make('section',null,'jp-service-menu'),detail=make('section',null,'jp-service-detail');detail.setAttribute('data-service-kind',standalone||!v&&mode==='dining'?'dining':'bath');
  const blend=service.blends.find(b=>b.id===(v?.blendId||selected));
  if(!v){
   const tabs=make('div',null,'jp-service-tabs');
   for(const [id,label]of [['dining','一楼点餐'],['bath','登记泡汤']]){const b=make('button',label);b.type='button';b.setAttribute('aria-pressed',String(mode===id));b.onclick=()=>{choiceRevision++;mode=id;refresh(true);};tabs.append(b);}menu.append(tabs);
   const choices=make('div',null,'jp-service-choices');
   for(const option of mode==='dining'?service.menu:service.blends){const b=make('button',mode==='dining'?`${option.name} · ${option.price} 券`:option.name);b.type='button';b.setAttribute('aria-pressed',String((mode==='dining'?selectedDish:selected)===option.id));b.onclick=()=>{choiceRevision++;if(mode==='dining')selectedDish=option.id;else selected=option.id;refresh(true);};choices.append(b);}menu.append(choices);
  }else{
   const card=make('div',null,'jp-service-current');card.append(make('p',standalone?'一楼 · 吧台餐位':`${v.side==='men'?'男汤':'女汤'} · 草木浴`,'jp-service-kicker'),make('strong',standalone?dish.name:blend?.name||'草木浴包'),make('p',current,'jp-service-status'));card.setAttribute('role','status');menu.append(card);
  }
  if(standalone||!v&&mode==='dining'){
   const price=standalone?v.price:dish.price,amount=make('div',null,'jp-service-price');amount.append(make('strong',String(price)),make('span',`${unit}${standalone?` · ${s.payment==='settled'?'已结算':'已预留'}`:' · 确认时预留'}`));
   detail.append(make('p','一楼食堂','jp-service-kicker'),make('h3',dish.name),amount);
   if(!v)detail.append(make('p','后厨现做 · 送至吧台餐位','jp-service-status'));
   detail.append(make('p','开吃时结算，开吃后不退。未开吃时取消退回原款；重载不重复扣款。','jp-service-note'));
   if(!v&&s.cash<dish.price){const error=make('p',`余额不足 · 还差 ${dish.price-s.cash} ${unit}，可到本地银行兑换或提款`,'jp-service-error');error.setAttribute('role','status');detail.append(error);}
   if(s.paymentError){const error=make('p','钱款账目待核对，请稍后重试。','jp-service-error');error.setAttribute('role','alert');detail.append(error);}
  }else{
   detail.append(make('p',v?'浴牌进度':'草木浴包','jp-service-kicker'),make('h3',v?LABELS[v.stage]||'服务已完成':blend?.name||'草木浴'));
   if(!v)detail.append(make('p','前台领牌 · 更衣清洗 · 入汤','jp-service-status'),make('p','泡汤与草木浴包不收费，休息廊汤面不另收费。','jp-service-note'));
   if(v?.tokenId)detail.append(make('p',`浴包 · ${s.progress.blend.text}`,'jp-service-status'));
   if(v?.mealRequested)detail.append(make('p',`汤面 · ${s.progress.meal.text}`,'jp-service-status'));
   if(v?.stage==='bathing')detail.append(make('p',s.soakReady?'已泡满 10 秒，可以离池。':`已泡 ${Math.floor(s.soakSeconds)}/10 秒 · 提前离池可稍后继续。`,'jp-service-note'));
   detail.append(make('p','草木浴包为游戏虚构配方。','jp-service-note'));
  }
  if(v?.stage==='waiting-meal')detail.append(make('p','离席暂停上菜，回座后继续。','jp-service-note'));
  const intent=currentIntent(),button=make('button',step.label,'jp-service-primary ww-airy-action');button.type='button';button.disabled=step.kind==='wait'||step.kind==='panel'||step.kind==='order'&&(s.cash<dish.price||!!s.paymentError);button.onclick=()=>act(step,intent);actions.append(button);
  // Ordinary chair exits stay with furniture/movement. Pool completion and
  // non-seat activity exits still use their existing service controls.
  if(mounted&&mounted.kind!=='seat'&&step.kind!=='stand'){const stand=make('button','起身');stand.type='button';stand.onclick=()=>{close();service.stopActivity();onStand();};actions.append(stand);}
  if(v){const cancel=make('button',standalone?'取消本餐':'取消本次服务');cancel.type='button';cancel.onclick=()=>{choiceRevision++;service.cancel();close();};actions.append(cancel);}
  body.append(menu,detail);dialog.append(x,header,body,actions);

 }
 function open(context){choiceRevision++;if(!service.state().visit){if(context==='bath')mode='bath';else{const local=nearbyDining();if(context==='dining'||local){mode='dining';if(local)selectedDish=local.id;}}}onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);}
 badge.onclick=()=>open();dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {
  menuTarget,hasVisit:()=>liveVisit,open,close,currentIntent,resolveIntent,executeIntent,isOpen:()=>dialog.open,
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
