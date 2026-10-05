import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';

const CLEANUP=new Set(['lowering','clearing','lifting','returning','washing','recalling','leaving']);
const owned=order=>!!order&&(!order.customer||order.customer==='player');
const settled=order=>order?.payment==='settled';
const available=(view,dish)=>!!dish&&view.canOrder!==false&&!view.order&&!view.intent&&(dish.price===0||Number.isFinite(view.cash)&&view.cash>=dish.price);

// The original tea seat and staff own every physical step. This is only a
// menu: closing it preserves the order, and drawing it never starts work.
export function createFranceMealUI({service,onOpen=()=>{},onStand=()=>{},onCancelWalk=()=>{},document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
 const dialog=make('dialog',null,'fr-meal-dialog ww-airy-theme ww-airy-panel'),style=make('style');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.fr-meal-dialog.ww-airy-panel{width:min(700px,var(--ww-ui-width,calc(100vw - 24px)));max-width:none;height:min(324px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px 20px 12px;border:1px solid #d4e5dc;border-radius:20px 7px 20px 7px;background:linear-gradient(115deg,#f9f8ee,#eef6ee 72%,#eff2f8);color:#355e68;box-shadow:0 14px 42px #274b6426;font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif;line-height:1.4}
.fr-meal-dialog::backdrop{background:#173b493d;backdrop-filter:blur(3px)}.fr-meal-dialog *{box-sizing:border-box}.fr-meal-dialog h2{margin:0;font-family:inherit;font-size:21px;line-height:1.3;font-weight:600;letter-spacing:.08em}.fr-meal-dialog h3{margin:0 0 5px;font-size:19px;line-height:1.3;font-weight:500}.fr-meal-dialog p{margin:5px 0;font-size:13px;line-height:1.5}.fr-meal-dialog button{min-height:44px;font-family:inherit;cursor:pointer;box-shadow:none}.fr-meal-dialog button:disabled{opacity:.5;cursor:default}.fr-meal-dialog .fr-meal-close{position:absolute;right:8px;top:7px;width:44px;padding:0;border:0;border-radius:0;background:transparent;color:#7b999b;font-size:26px}.fr-meal-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-right:34px;padding-bottom:9px;margin-bottom:10px;border-bottom:1px solid #d5e5dc}.fr-meal-heading>span{font-size:12px;color:#759297;white-space:nowrap}.fr-meal-content{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.12fr);gap:18px;overflow:hidden}.fr-meal-menu,.fr-meal-detail{min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain}.fr-meal-choices{display:grid;gap:7px}.fr-meal-choices button{width:100%;min-height:62px;padding:9px 12px;text-align:left;border:0;border-left:2px solid transparent;border-radius:3px;background:#ffffff70;color:#61848a;font-size:14px}.fr-meal-choices button[aria-pressed=true]{border-left-color:#84bdb0;background:linear-gradient(90deg,#dceee4,#e9f4eb70);color:#305f66}.fr-meal-choices button span{display:block}.fr-meal-choices button span+span{margin-top:3px;font-size:12px;color:#789393}.fr-meal-detail{padding:10px 15px;border:1px solid #dfebe2;border-radius:10px 3px 13px 3px;background:#fffefa80}.fr-meal-kicker{font-size:11px!important;color:#83a0a0;letter-spacing:.08em;margin:0 0 5px!important}.fr-meal-price{display:flex;align-items:baseline;gap:6px;margin:8px 0;color:#5b7b94;font-size:12px}.fr-meal-price strong{font-size:29px;line-height:1;font-weight:500}.fr-meal-status{color:#557c7a}.fr-meal-note{font-size:12px!important;color:#819698}.fr-meal-error{color:#aa726b!important}.fr-meal-current{padding:10px 8px}.fr-meal-actions{display:flex;align-items:center;gap:8px;padding-top:8px;border-top:1px solid #d5e5dc}.fr-meal-actions button{width:auto;padding:8px 10px;border:0;border-radius:0;background:transparent;color:#7b9194;font-size:12px}.fr-meal-dialog.ww-airy-theme .fr-meal-primary{flex:1;min-width:0;padding:8px 14px;font-size:14px;letter-spacing:.02em}
@media(max-height:500px){.fr-meal-dialog.ww-airy-panel{padding:12px 18px 10px}.fr-meal-heading{padding-bottom:5px;margin-bottom:7px}.fr-meal-dialog h2{font-size:18px}.fr-meal-dialog h3{font-size:17px}.fr-meal-detail{padding:8px 13px}.fr-meal-price{margin:6px 0}.fr-meal-price strong{font-size:26px}.fr-meal-actions{padding-top:5px}}
@media(max-width:600px){.fr-meal-dialog.ww-airy-panel{height:min(460px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px}.fr-meal-heading{display:block}.fr-meal-heading>span{display:block;margin-top:3px}.fr-meal-content{display:block;overflow:auto}.fr-meal-menu,.fr-meal-detail{overflow:visible}.fr-meal-menu{margin-bottom:12px}.fr-meal-choices{grid-template-columns:1fr 1fr}.fr-meal-choices button{padding:8px;font-size:13px}.fr-meal-current{padding:3px}.fr-meal-actions{gap:4px;flex-wrap:wrap}.fr-meal-actions button{padding:7px}.fr-meal-dialog.ww-airy-theme .fr-meal-primary{flex-basis:100%}}
`;
 dialog.setAttribute('aria-label','宫苑茶廊食单');(doc.head||doc.body).append(style);doc.body.append(dialog);
 let selected='tea-cake',signature='',revision=0,disposed=false,menuState={order:false,seated:false,intent:false};
 function context(view){menuState={order:owned(view.order),seated:!!view.seated,intent:!!view.intent};return view;}
 function key(view){const o=view.order;return JSON.stringify([selected,o?.id,o?.customer,o?.dishId,o?.price,o?.stage,!!o?.cancelled,!!o?.finished,o?.payment,!!view.intent,!!view.seated,view.label,view.cash,view.canOrder,view.blockedReason,view.menu]);}
 function close(){revision++;if(dialog.open)dialog.close();}
 function button(text,fn,primary=false,focusId){
  const generation=revision,b=make('button',text,primary?'fr-meal-primary ww-airy-action':'');b.type='button';if(focusId)b.setAttribute('data-fr-meal-focus',focusId);
  b.onclick=()=>{
   if(disposed||!dialog.open||generation!==revision||b.disabled)return;
   if(fn===close){close();return;}
   const fresh=context(service.view());
   // A retained pointer/key event must never operate on a newer order, stage,
   // seat or wallet balance, even when no frame has refreshed the menu yet.
   if(key(fresh)!==signature){refresh(fresh);return;}fn(fresh);
  };return b;
 }
 function refresh(view=context(service.view())){
  if(disposed)return;context(view);if(!dialog.open)return;
  const menu=Array.isArray(view.menu)?view.menu:[];
  if(!menu.some(d=>d.id===selected))selected=menu[0]?.id||'tea-cake';
  const next=key(view);if(next===signature)return;
  const focused=doc.activeElement?.getAttribute?.('data-fr-meal-focus'),scroll=new Map(Array.from(dialog.querySelectorAll?.('[data-fr-meal-scroll]')||[]).map(e=>[e.getAttribute('data-fr-meal-scroll'),e.scrollTop]));
  signature=next;revision++;dialog.replaceChildren();
  const o=view.order,own=owned(o),dish=menu.find(d=>d.id===(o?(o.dishId||'tea-cake'):selected))||menu[0],price=own&&Number.isFinite(o.price)?o.price:dish?.price??0,paid=price>0;
  const x=button('×',close,false,'close');x.className='fr-meal-close';x.setAttribute('aria-label','关闭食单');
  const {header,body,actions}=createAiryPanelParts(doc);header.className+=' fr-meal-heading';body.className+=' fr-meal-content';body.setAttribute('data-fr-meal-scroll','body');actions.className+=' fr-meal-actions';
  header.append(make('h2','宫苑茶廊 · 食单'),make('span',Number.isFinite(view.cash)?`随身 ${view.cash} 法国券`:'随身法国券待核对'));
  const choices=make('section',null,'fr-meal-menu'),detail=make('section',null,'fr-meal-detail');choices.setAttribute('data-fr-meal-scroll','menu');detail.setAttribute('data-fr-meal-scroll','detail');
  if(!o&&!view.intent){
   choices.append(make('p','玛农的茶桌','fr-meal-kicker'));const items=make('div',null,'fr-meal-choices');
   for(const option of menu){const b=button(null,()=>{selected=option.id;refresh();},false,'dish-'+option.id);b.setAttribute('aria-pressed',String(selected===option.id));b.append(make('span',option.name),make('span',option.price?`${option.price} 法国券 · 正餐`:'免费 · 茶点'));items.append(b);}choices.append(items);
  }else{
   const current=make('div',null,'fr-meal-current');current.setAttribute('role','status');current.append(make('p',o&&!own?'茶席使用中':view.intent?'玛农的茶桌':'这次的餐点','fr-meal-kicker'),make('h3',dish?.name||'宫苑茶廊'),make('p',view.label||(view.intent?'正前往茶位':o?.cancelled?'玛农正在收拾餐具':'等候玛农送来餐点'),'fr-meal-status'));choices.append(current);
  }
  detail.append(make('p',view.seated?'已在茶桌入座':'宫苑 · 茶廊','fr-meal-kicker'),make('h3',dish?.name||'食单'));
  if(!o||own){
   const amount=make('div',null,'fr-meal-price'),payment=o?.payment==='refunded'?'已退回':settled(o)?'已结账':o?.payment==='reserved'?'已预留':o?'待核对':'确认时预留';amount.append(make('strong',paid?String(price):'免费'),make('span',paid?`法国券 · ${payment}`:'茶与小蛋糕'));detail.append(amount);
   if(dish?.detail)detail.append(make('p',dish.detail,'fr-meal-status'));
   if(paid)detail.append(make('p',o?.payment==='refunded'?'餐费已退回':settled(o)?'已开始用餐，提前收餐不退费':'开吃前取消全额退回；开吃后不退费','fr-meal-note'));
  }else detail.append(make('p',view.blockedReason||'等这一席收拾好后再点餐','fr-meal-note'));
  if(!o&&!view.intent){
   const reason=view.canOrder===false?(view.blockedReason||'暂时不能点餐'):paid&&!Number.isFinite(view.cash)?'法国券余额待核对':paid&&view.cash<price?`余额不足 · 还差 ${price-view.cash} 法国券`:null;
   if(reason){const error=make('p',reason,'fr-meal-error');error.setAttribute('role','status');detail.append(error);}
   const confirm=button(paid?`确认点餐 · ${price} 券`:'请玛农准备下午茶',fresh=>{
    const choice=fresh.menu?.find(d=>d.id===selected);if(!available(fresh,choice)){refresh(fresh);return;}
    // Furniture refuses an approach while a service menu is open.
    close();if(!service.request(choice.id)){context(service.view());open();}else context(service.view());
   },true,'confirm');confirm.disabled=!available(view,dish);actions.append(confirm);
  }else if(own&&!o.cancelled&&!o.finished&&o.stage==='ready'){
   const eat=button(paid?'享用正餐':'举杯品茶',fresh=>{if(owned(fresh.order)&&fresh.order.id===o.id&&fresh.order.stage==='ready'&&!fresh.order.cancelled&&!fresh.order.finished&&fresh.seated&&service.drink())close();else refresh();},true,'eat');eat.disabled=!view.seated;actions.append(eat);
  }else actions.append(button(o?.stage==='drinking'&&!o.cancelled?'收起 · 继续享用':o?.cancelled||o?.finished?'收起':'收起 · 等候',close,true,'close-primary'));
  if(view.intent&&!o)actions.append(button('取消前往茶位',fresh=>{if(fresh.intent&&!fresh.order){service.cancel();onCancelWalk();const after=context(service.view());if(!after.intent)close();else refresh(after);}},false,'cancel'));
  if(own&&!o.cancelled&&!o.finished&&!CLEANUP.has(o.stage))actions.append(button(paid?(settled(o)?'提前收餐 · 不退费':'取消点餐 · 退款'):'取消下午茶',fresh=>{if(owned(fresh.order)&&fresh.order.id===o.id&&!fresh.order.cancelled&&!fresh.order.finished&&!CLEANUP.has(fresh.order.stage)&&service.cancel())close();else refresh();},false,'cancel'));
  if(view.seated)actions.append(button('起身',fresh=>{if(fresh.seated){close();onStand();}},false,'stand'));
  body.append(choices,detail);dialog.append(x,header,body,actions);
  for(const e of Array.from(dialog.querySelectorAll?.('[data-fr-meal-scroll]')||[]))e.scrollTop=scroll.get(e.getAttribute('data-fr-meal-scroll'))||0;
  if(focused)Array.from(dialog.querySelectorAll?.('[data-fr-meal-focus]')||[]).find(e=>e.getAttribute('data-fr-meal-focus')===focused&&!e.disabled)?.focus({preventScroll:true});
 }
 function open(){if(disposed)return false;if(dialog.open){refresh();return true;}onOpen();signature='';dialog.showModal();refresh();return true;}
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});context(service.view());
 return {open,close,isOpen:()=>!!dialog.open,update:()=>{if(!disposed)refresh();},menuContext:()=>menuState,dispose(){if(disposed)return;close();disposed=true;dialog.remove();style.remove();}};
}
