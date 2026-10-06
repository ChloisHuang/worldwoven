import {tavernSeatSide} from './china-tavern-layout.js';
import {currentInteractionIntent,nearbyInteraction} from './player-interaction-intents.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';

export function createChinaTavernMealUI({service,getPlayer,getMounted,getReception=()=>null,onIntent,onMountSeat,onStand,onOpen,canChooseSeat=()=>true,canOrder=()=>true,canSee=()=>true,canShow=()=>true,document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const badge=make('button','云来酒楼 · 选座点菜','cn-meal-ticket'),dialog=make('dialog',null,'cn-meal-dialog ww-airy-theme ww-airy-panel'),style=make('style');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.cn-meal-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:205px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:9px 13px;border-radius:3px;background:#e8f1e7;color:#416b6d;font-size:12px;box-shadow:0 3px 12px #173b3315}
.cn-meal-dialog.ww-airy-panel{width:min(760px,var(--ww-ui-width,calc(100vw - 24px)));max-width:none;height:min(350px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px 20px 12px;border:1px solid #d4e5dc;border-radius:20px 7px 20px 7px;background:linear-gradient(115deg,#f9f8ee,#eef6ee 72%,#eff2f8);color:#355e68;box-shadow:0 14px 42px #274b6426;font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif;line-height:1.4}.cn-meal-dialog::backdrop{background:#173b493d;backdrop-filter:blur(3px)}.cn-meal-dialog *{box-sizing:border-box}.cn-meal-dialog h2{margin:0;font-family:inherit;font-size:21px;line-height:1.3;font-weight:600;letter-spacing:.08em}.cn-meal-dialog h3{margin:0 0 5px;font-size:18px;line-height:1.3;font-weight:500}.cn-meal-dialog p{font-size:13px;line-height:1.5;margin:5px 0}.cn-meal-dialog button{min-height:44px;font-family:inherit;cursor:pointer;box-shadow:none}.cn-meal-dialog button:disabled{opacity:.5;cursor:default}.cn-meal-dialog .cn-meal-close{position:absolute;right:8px;top:7px;width:44px;padding:0;border:0;border-radius:0;background:transparent;color:#7b999b;font-size:26px}.cn-meal-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-right:34px;padding-bottom:9px;margin-bottom:10px;border-bottom:1px solid #d5e5dc}.cn-meal-heading>span{font-size:12px;color:#759297;white-space:nowrap}.cn-meal-content{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:18px;overflow:hidden}.cn-meal-menu,.cn-meal-detail{min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain}.cn-meal-dishes,.cn-meal-seats{display:grid;grid-template-columns:1fr 1fr;gap:6px}.cn-meal-menu button{width:100%;padding:7px 10px;text-align:left;border:0;border-left:2px solid transparent;border-radius:3px;background:#ffffff70;color:#61848a;font-size:13px}.cn-meal-menu button[aria-pressed=true]{border-left-color:#84bdb0;background:linear-gradient(90deg,#dceee4,#e9f4eb70);color:#305f66}.cn-meal-dishes button span{display:block;font-size:11px;color:#789393}.cn-meal-dishes button span:first-child{font-size:13px;color:inherit}.cn-meal-kicker{font-size:11px!important;color:#83a0a0;letter-spacing:.08em;margin:0 0 5px!important}.cn-meal-seat-label{margin-top:9px!important}.cn-meal-detail{position:relative;padding:10px 15px;border:1px solid #dfebe2;border-radius:10px 3px 13px 3px;background:#fffefa80}.cn-meal-price{display:flex;align-items:baseline;gap:6px;margin:8px 0;color:#5b7b94;font-size:12px}.cn-meal-price strong{font-size:29px;line-height:1;font-weight:500}.cn-meal-status{color:#557c7a}.cn-meal-note{font-size:12px!important;color:#819698}.cn-meal-error{color:#aa726b!important}.cn-meal-current{padding:10px 8px}.cn-meal-actions{display:flex;align-items:center;gap:8px;padding-top:8px;border-top:1px solid #d5e5dc}.cn-meal-actions button{width:auto;padding:8px 10px;border:0;border-radius:0;background:transparent;color:#7b9194;font-size:12px}.cn-meal-dialog.ww-airy-theme .cn-meal-primary{flex:1;min-width:0;padding:8px 14px;font-size:14px;letter-spacing:.02em}
@media(max-height:500px){.cn-meal-dialog.ww-airy-panel{padding:12px 18px 10px}.cn-meal-heading{height:30px;flex:0 0 30px;padding-bottom:5px;margin-bottom:7px}.cn-meal-dialog h2{font-size:18px}.cn-meal-dialog h3{font-size:17px}.cn-meal-detail{padding:8px 13px}.cn-meal-price{margin:6px 0}.cn-meal-price strong{font-size:26px}.cn-meal-actions{padding-top:5px}.cn-meal-ticket{top:160px;font-size:10px}}
@media(max-width:600px){.cn-meal-dialog.ww-airy-panel{height:min(560px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px}.cn-meal-heading{display:block;height:auto;flex-basis:auto}.cn-meal-heading>span{display:block;margin-top:3px}.cn-meal-content{display:block;overflow:auto}.cn-meal-menu,.cn-meal-detail{overflow:visible}.cn-meal-menu{margin-bottom:12px}.cn-meal-actions{flex-wrap:wrap;gap:4px}.cn-meal-dialog.ww-airy-theme .cn-meal-primary{flex-basis:100%}}
`;
 badge.type='button';badge.setAttribute('aria-label','云来酒楼选座与点菜');dialog.setAttribute('aria-label','云来酒楼菜牌');(doc.head||doc.body).append(style);doc.body.append(badge,dialog);
 let menuState={order:false,seated:null},signature='',disposed=false,choiceRevision=0,chosenSeat=null,chosenDish=service.menu?.[0]?.id||service.dish.id;
 const nearEntry=()=>[getReception(),...service.seats].some(item=>nearbyInteraction(item,getPlayer()?.root.position,{radius:1.8,clear:canSee}));
 const seatName=s=>s?`${s.center[0]<21?'西窗':'东窗'}桌 · ${tavernSeatSide(s)<0?'里侧':'门侧'}`:'原餐位';
 function invalidateIntent(){choiceRevision++;}
 function close(){if(dialog.open){invalidateIntent();dialog.close();}}
 function button(text,fn,primary=false){const revision=choiceRevision,b=make('button',text,primary?'cn-meal-primary ww-airy-action':'');b.type='button';b.onclick=()=>{if(!disposed&&dialog.open&&revision===choiceRevision&&!b.disabled)fn();};return b;}
 // A choice describes the outcome. The shared controller owns its route and
 // cancellation; this UI never polls a remembered seat or submits on update.
 function intent(seatId,dishId=chosenDish){
  const order=service.view().order,resume=!!order?.layoutAwaitingSeat&&!order.cancelled&&order.seatId===seatId;
  const dish=service.menu?.find(d=>d.id===dishId)||service.dish,seat=service.seats.find(s=>s.id===seatId),mounted=getMounted()?.id===seatId;
  if(disposed||!seat||!getPlayer()||order&&!resume||!resume&&!canOrder()||!mounted&&!canChooseSeat(seat))return null;
  return {id:'cn-meal-'+seat.id,provider:'china-tavern-meal',seatId:seat.id,dishId:dish.id,name:'云来酒楼',action:resume?'回到原餐位 · 继续本次餐单':`在${seatName(seat)}点${dish.name} · ${dish.price||6}文`,position:(mounted?seat.anchor:seat.position).slice(),executionRadius:mounted ? .35 : .016,keepSeat:mounted,resume,intentKey:JSON.stringify([choiceRevision,seat.id,dish.id,mounted,resume?order.id:null])};
 }
 function resolveIntent(selected){return currentInteractionIntent(selected,intent(selected?.seatId,selected?.dishId));}
 function executeIntent(selected){
  const current=resolveIntent(selected);if(!current||!nearbyInteraction(current,getPlayer()?.root.position,{radius:current.executionRadius}))return false;
  invalidateIntent(); // Consume before mount or service effects, including failure.
  const seat=service.seats.find(s=>s.id===current.seatId);
  if(getMounted()?.id!==seat.id)onMountSeat(seat);
  return getMounted()?.id===seat.id&&(current.resume||service.requestMeal(current.dishId));
 }
 function request(selected){if(!resolveIntent(selected)){refresh(true);return;}dialog.close();onIntent(selected);}
 function refresh(force=false){
  const s=service.view(),o=s.order,mounted=getMounted(),seated=service.seats.find(i=>i.id===mounted?.id),available=canOrder(),near=nearEntry(),cash=service.walletCash?.();
  menuState={order:!!o,seated};
  if(seated)chosenSeat=seated.id;else if(!service.seats.some(seat=>seat.id===chosenSeat))chosenSeat=service.seats.find(seat=>canChooseSeat(seat))?.id||service.seats[0]?.id;
  badge.hidden=!near||!canShow();badge.textContent=o?`云来酒楼 · ${o.cancelled?'正在收拾餐具':s.label}`:seated?'云来酒楼 · 招呼许安点菜':'云来酒楼 · 选座点菜';
  if(dialog.open&&!near&&!o){close();return;}if(!dialog.open&&!force)return;
  const key=[o?.id,o?.stage,o?.cancelled,mounted?.id,available,chosenDish,chosenSeat,cash,...service.seats.map(seat=>canChooseSeat(seat))].join('|');if(!force&&key===signature)return;signature=key;invalidateIntent();
  const focused=doc.activeElement?.getAttribute?.('data-cn-meal-focus');dialog.replaceChildren();
  const x=button('×',close);x.className='cn-meal-close';x.setAttribute('aria-label','关闭酒楼菜牌');
  const {header,body,actions}=createAiryPanelParts(doc);header.className+=' cn-meal-heading';body.className+=' cn-meal-content';actions.className+=' cn-meal-actions';
  header.append(make('h2','云来酒楼 · 食单'),make('span',cash==null?'钱包记录待核对':`随身 ${cash} 铜文`));
  const menu=make('section',null,'cn-meal-menu'),detail=make('section',null,'cn-meal-detail');
  const order=o?(service.staffScene?.playerOrder?.()||service.state?.().order||o):null,dish=(service.menu||[]).find(d=>d.id===(order?.dishId||chosenDish))||service.dish,price=order?.price??dish.price??6,seat=service.seats.find(i=>i.id===(o?.seatId||chosenSeat));
  if(!o){
   menu.append(make('p','菜品','cn-meal-kicker'));const dishes=make('div',null,'cn-meal-dishes');
   for(const d of service.menu||[service.dish]){const b=button(null,()=>{chosenDish=d.id;refresh(true);});b.append(make('span',d.name),make('span',`${d.price} 铜文`));b.setAttribute('aria-pressed',String(chosenDish===d.id));b.setAttribute('data-cn-meal-focus','dish-'+d.id);dishes.append(b);}menu.append(dishes);
   menu.append(make('p',seated?'当前餐位':'餐位','cn-meal-kicker cn-meal-seat-label'));const seats=make('div',null,'cn-meal-seats');
   for(const item of seated?[seated]:service.seats){const free=item.id===seated?.id||canChooseSeat(item),b=button(`${seatName(item)}${free?'':' · 有人'}`,()=>{chosenSeat=item.id;refresh(true);});b.setAttribute('aria-pressed',String(chosenSeat===item.id));b.setAttribute('data-cn-meal-focus','seat-'+item.id);b.disabled=!free;seats.append(b);}menu.append(seats);
  }else{const card=make('div',null,'cn-meal-current');card.append(make('p',seatName(seat),'cn-meal-kicker'),make('h3',order.dishName||dish.name),make('p',o.cancelled?'饭已取消，陆青正在收拾餐具':s.label,'cn-meal-status'));card.setAttribute('role','status');menu.append(card);}
  const payment=order?.payment,settled=payment==='settled'||!payment&&['ready','eating','finish-bite','dirty','return','wash'].includes(o?.stage);
  detail.append(make('p',o?'本次餐单':'当前选择','cn-meal-kicker'),make('h3',o?seatName(seat):dish.name));
  const amount=make('div',null,'cn-meal-price');amount.append(make('strong',String(price)),make('span',`铜文 · ${o?payment==='refunded'?'已退回':settled?'已结账':payment==='unpaid'?'待核对':'已预留':'确认时预留'}`));detail.append(amount);
  if(!o)detail.append(make('p',`${seatName(seat)}${seated?' · 已入座':''}`,'cn-meal-status'));
  detail.append(make('p',payment==='refunded'?'餐费已退回，餐具仍会继续收拾。':settled?'餐点已送达，收餐或起身不退费。':'送达前取消全额退款，送达时结账。','cn-meal-note'));
  if(o)detail.append(make('p',o.layoutAwaitingSeat?'餐单和已付款项已保留，请到原餐位落座后继续。':'收起保留餐单；起身取消未吃完的饭。','cn-meal-note'));
  else if(!available)detail.append(make('p','手上的岗位或短工还未收工，请先完成或取消。','cn-meal-error'));
  else if(cash!=null&&cash<price)detail.append(make('p',`余额不足 · 还差 ${price-cash} 铜文，可到钱庄取款。`,'cn-meal-error'));
  if(!o){const selected=intent(chosenSeat),confirm=button(`确认点餐 · ${price}文`,()=>request(selected),true);confirm.disabled=!selected||cash!=null&&cash<price;confirm.setAttribute('data-cn-meal-focus','confirm');actions.append(confirm);}
  else if(o.layoutAwaitingSeat&&!o.cancelled){const resume=intent(o.seatId),b=button('回到原餐位 · 继续餐单',()=>request(resume),true);b.disabled=!resume;actions.append(b);}
  else if(o.stage==='ready'&&!o.cancelled)actions.append(button('享用送来的餐点',()=>{if(service.view().order?.id===o.id&&service.eat())close();else refresh(true);},true));
  else actions.append(button(o.cancelled?'收起 · 等候收餐':o.stage==='eating'?'收起 · 继续用餐':'收起 · 继续等候',close,true));
  if(o&&!o.cancelled&&!['clear-table','lifting','return','washing','wash','dirty','finish-bite'].includes(o.stage))actions.append(button(settled?'请收走餐点 · 不退费':'取消点餐 · 送达前退款',()=>{if(service.view().order?.id===o.id&&service.cancel())close();else refresh(true);}));
  if(seated)actions.append(button('起身',()=>{close();onStand();}));body.append(menu,detail);dialog.append(x,header,body,actions);
  if(focused)Array.from(dialog.querySelectorAll?.('[data-cn-meal-focus]')||[]).find(e=>e.getAttribute('data-cn-meal-focus')===focused)?.focus({preventScroll:true});
 }
 function open(){if(disposed||!nearEntry()&&!service.view().order)return;invalidateIntent();onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);}
 badge.onclick=()=>{if(!disposed&&nearEntry()&&canShow())open();};dialog.addEventListener('cancel',e=>{e.preventDefault();close();});refresh();
 return {menuContext:()=>menuState,open,close,intent,resolveIntent,executeIntent,invalidateIntent,isOpen:()=>!!dialog.open,openStation:id=>{if(id!==service.dish.host)return false;open();return true;},update:()=>{if(!disposed)refresh();},dispose(){disposed=true;invalidateIntent();close();badge.remove();dialog.remove();style.remove();}};
}
