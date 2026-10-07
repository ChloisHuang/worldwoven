import {JAPAN_SERVICE_CURRENCY,japanServiceMoney} from './japan-service-payment.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts,preserveAiryPanelView} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
const RECEPTION_ID='jp-performance-reception';
const STAGES={invited:'艺者正在考虑邀请',reply:'听取艺者本人的答复',accepted:'艺者已答应，请核对价目',seating:'席位已留好，请及时入座',performing:'表演或清谈进行中',drinking:'茶酒已上席，正在共饮',returning:'本次会面结束，艺者正在回席','refund-pending':'未提供部分退款待核对'};

export function createJapanPerformanceUI({service,getPlayer,onOpen=()=>{},onFurniture,onStand,document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;};
 const style=make('style');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.jp-performance-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:258px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:9px 13px;border-radius:3px;background:#f0eaf2;color:#716580;font-size:12px;box-shadow:0 3px 12px #3d241e15}.jp-performance-ticket[hidden]{display:none}
.jp-performance-dialog.ww-airy-panel{width:min(790px,var(--ww-ui-width,calc(100vw - 24px)));max-width:none;height:min(365px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px 20px 12px;border:1px solid #e1e1e6;border-radius:20px 7px 20px 7px;background:linear-gradient(120deg,#f9f8ef,#f2f3f4 70%,#f0eef9);color:#4f647c;box-shadow:0 14px 42px #3b476526;font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif;line-height:1.4}.jp-performance-dialog::backdrop{background:#2737463d;backdrop-filter:blur(3px)}.jp-performance-dialog *{box-sizing:border-box}.jp-performance-dialog h2{margin:0;font-family:inherit;font-size:21px;line-height:1.3;font-weight:600;letter-spacing:.08em}.jp-performance-dialog h3{font-size:17px;line-height:1.3;font-weight:500;margin:0 0 4px}.jp-performance-dialog p{font-size:13px;line-height:1.5;margin:5px 0;white-space:pre-line}.jp-performance-dialog button{min-height:44px;font-family:inherit;cursor:pointer;box-shadow:none}.jp-performance-dialog button:disabled{opacity:.48;cursor:default}.jp-performance-dialog .jp-performance-close{position:absolute;right:8px;top:7px;width:44px;padding:0;border:0;border-radius:0;background:transparent;color:#9b96aa;font-size:26px}.jp-performance-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-right:34px;border-bottom:1px solid #dcdfdf;padding-bottom:8px;margin-bottom:8px}.jp-performance-heading>span{font-size:12px;color:#8d94a4;white-space:nowrap}.jp-performance-content{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:16px;overflow:hidden}.jp-performance-cast,.jp-performance-detail{min-height:0;min-width:0;overflow:auto;overscroll-behavior:contain}.jp-performance-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px}.jp-performance-card{min-width:0;padding:10px;background:#fffefa80;border:1px solid #e4e7e0;border-radius:10px 3px 12px 3px}.jp-performance-card h3 small{font-size:11px;color:#969ca7;margin-left:6px}.jp-performance-card p{font-size:12px;color:#9194a1;margin:2px 0 5px}.jp-performance-card .jp-performance-available{color:#71988c}.jp-performance-activity{display:block;width:100%;min-height:44px;margin-top:4px;padding:6px 8px;text-align:left;font-size:12px;line-height:1.35;border:0;border-left:2px solid transparent;border-radius:0;background:transparent;color:#8b8b9f}.jp-performance-activity span{display:block;font-size:12px;color:#8a94a8}.jp-performance-activity[aria-pressed=true]{border-left-color:#a6b1d6;background:linear-gradient(90deg,#e5e6f4,#eceef64d);color:#5c6689}.jp-performance-detail{padding:0 1px}.jp-performance-drinks{margin:0;padding:0;border:0;min-width:0}.jp-performance-drinks legend{font-size:12px;color:#8f98a6;padding:0 0 5px}.jp-performance-drink-options{display:flex;flex-direction:column;gap:3px}.jp-performance-drink-options button{display:flex;align-items:center;justify-content:space-between;gap:5px;width:100%;min-height:44px;border:0;border-left:2px solid transparent;border-radius:0;padding:5px 10px;background:#ffffff60;color:#859199;font-size:13px}.jp-performance-drink-options button[aria-pressed=true]{border-left-color:#95bdae;background:#e0eee77a;color:#537f78}.jp-performance-total{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:8px;font-size:12px;color:#8894a6}.jp-performance-total strong{font-size:24px;font-weight:500;color:#69799f}.jp-performance-note{font-size:12px!important;color:#9198a2}.jp-performance-reply{padding:5px 8px;border-left:2px solid #c5d4c9;background:#f5f7ee;color:#7f8f94;font-size:12px!important}.jp-performance-actions{display:flex;gap:8px;align-items:center;padding-top:6px;border-top:1px solid #dcdfe1}.jp-performance-actions button{width:auto;padding:8px 12px;border:0;border-radius:0;background:transparent;font-size:13px;color:#8a90a0}.jp-performance-actions .jp-performance-footer-note{margin:0;flex:1;min-width:0;font-size:11px;color:#8795a0;line-height:1.4}.jp-performance-dialog.ww-airy-theme .jp-performance-primary{flex:0 0 230px;min-width:0;font-size:14px;letter-spacing:.02em;padding:8px 14px}.jp-performance-error{color:#ae7772!important}.jp-performance-order{padding:11px 14px;background:#fffefa80;border:1px solid #e0e5e1;border-radius:10px 3px 12px 3px}.jp-performance-kicker{font-size:11px!important;color:#9194a6;letter-spacing:.06em;margin:0 0 5px!important}.jp-performance-progress{color:#678d8a}.jp-performance-bill{margin:0}.jp-performance-bill>div{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #e2e5e4;font-size:12px}.jp-performance-bill dt{color:#85909b}.jp-performance-bill dd{margin:0;white-space:nowrap;color:#637d8f}.jp-performance-refund{color:#73958b!important}.jp-performance-recover{min-height:44px;padding:4px 8px;background:#ece7ef;color:#967586;border:0;border-radius:0;font-size:12px}
@media(max-height:500px){.jp-performance-dialog.ww-airy-panel{padding:12px 18px 10px}.jp-performance-heading{padding-bottom:5px;margin-bottom:7px}.jp-performance-dialog h2{font-size:18px}.jp-performance-card{padding:8px}.jp-performance-card h3{font-size:15px}.jp-performance-content{gap:12px}.jp-performance-total{margin-top:5px}.jp-performance-total strong{font-size:22px}.jp-performance-ticket{top:210px;font-size:10px}}
@media(max-width:600px){.jp-performance-dialog.ww-airy-panel{height:min(610px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px}.jp-performance-content{display:block;overflow:auto}.jp-performance-cast,.jp-performance-detail{overflow:visible}.jp-performance-cast{margin-bottom:12px}.jp-performance-heading{display:block}.jp-performance-heading>span{display:block;margin-top:3px}.jp-performance-drink-options{flex-direction:row}.jp-performance-drink-options button{display:block;padding:7px 4px;text-align:center}.jp-performance-drink-options button span{display:block}.jp-performance-actions{flex-wrap:wrap;gap:3px}.jp-performance-actions .jp-performance-footer-note{flex-basis:100%}.jp-performance-dialog.ww-airy-theme .jp-performance-primary{flex:1}.jp-performance-card{padding:8px}}
`;
 const badge=make('button','三层戏馆 · 演出与茶叙','jp-performance-ticket'),dialog=make('dialog',null,'jp-performance-dialog ww-airy-theme ww-airy-panel');
 badge.type='button';badge.hidden=true;badge.setAttribute('aria-label','查看三层戏馆演出与茶叙');dialog.setAttribute('aria-label','三层戏馆接待簿');
 (doc.head||doc.body).append(style);doc.body.append(dialog);
 let selectedDrink=null,selectedArtist=null,selectedActivity=null,signature='',badgeText='',disposed=false,generation=0;
 const nearFloor=()=>{const p=getPlayer()?.root?.position;return !!p&&Math.abs(p.y-7.6)<.5&&p.x>=1.8&&p.x<=7.3&&p.z>=-7&&p.z<=8;};
 const close=()=>{generation++;if(dialog.open)dialog.close();};
 const button=(text,fn,primary=false)=>{const version=generation,b=make('button',text,primary?'jp-performance-primary ww-airy-action':undefined);b.type='button';b.onclick=()=>{if(!disposed&&dialog.open&&version===generation&&!b.disabled)fn();};return b;};
 const amount=value=>Number.isFinite(Number(value))?Number(value):0;
 function orderDetails(s,o){
  const artist=(s.candidates||[]).find(c=>c.id===o.artistId),activityId=typeof o.activity==='object'?o.activity?.id:o.activity;
  const activity=typeof o.activity==='object'&&o.activity?o.activity:artist?.activities?.find(a=>a.id===activityId);
  const drinkId=typeof o.drink==='object'?o.drink?.id:o.drink;
  const drink=typeof o.drink==='object'&&o.drink?o.drink:(s.drinks||[]).find(d=>d.id===drinkId);
  const drinkFee=drinkId?amount(o.drinkFee??drink?.fee):0,total=amount(o.fee);
  return {artist,activityName:activity?.name||({dance:'舞台演出',story:'故事演出',tea:'席间清谈'}[activityId])||'演出或清谈',actFee:amount(o.actFee??Math.max(0,total-drinkFee)),drinkName:drink?.name||(drinkId?'所选茶酒':'不点茶酒'),drinkFee,total,hasDrink:!!drinkId};
 }
 function refresh(force=false){
  const s=service.view(),o=s.order,money=japanServiceMoney(s.currency||(o?o.currency||'copper':JAPAN_SERVICE_CURRENCY)),unit=money.displayUnit,atReception=service.atReception(),active=service.active(),drinks=(s.drinks||[]).filter(d=>d.id&&d.id!=='none'),candidates=s.candidates||[];
  if(selectedDrink!==null&&!drinks.some(d=>d.id===selectedDrink))selectedDrink=null;
  if(!candidates.some(c=>c.id===selectedArtist)){selectedArtist=(candidates.find(c=>c.available)||candidates[0])?.id||null;selectedActivity=null;}
  const selected=candidates.find(c=>c.id===selectedArtist);
  if(!selected?.activities?.some(a=>a.id===selectedActivity))selectedActivity=selected?.activities?.[0]?.id||null;
  const activity=selected?.activities?.find(a=>a.id===selectedActivity),drink=drinks.find(d=>d.id===selectedDrink),total=amount(activity?.fee)+amount(drink?.fee);
  badge.hidden=!nearFloor()&&!active;
  const label=s.label||STAGES[o?.status]||'请查看接待簿',text=o?`三层戏馆 · ${label}`:'三层戏馆 · 演出与茶叙';
  if(text!==badgeText){badgeText=text;badge.textContent=text;}
  if(!dialog.open&&!force)return;
  const key=JSON.stringify([o&&[o.id,o.artistId,o.activity,o.drink,o.status,o.currency,o.actFee,o.drinkFee,o.fee,o.paid,o.actComplete,o.drinkComplete],s.label,s.lastReply,candidates,s.drinks,s.currency,s.cash,s.paymentError,atReception,selectedDrink,selectedArtist,selectedActivity]);
  if(!force&&key===signature)return;signature=key;generation++;
  const focused=doc.activeElement?.dataset?.jpPerformanceFocus,scrolls=[...dialog.querySelectorAll('.jp-performance-cast,.jp-performance-detail')].map(e=>e.scrollTop);
  const restoreView=preserveAiryPanelView(dialog,doc);dialog.replaceChildren();
  const x=button('×',close);x.className='jp-performance-close';x.setAttribute('aria-label','收起接待簿');x.dataset.jpPerformanceFocus='close';
  const {header,body,actions}=createAiryPanelParts(doc);header.className+=' jp-performance-heading';body.className+=' jp-performance-content';actions.className+=' jp-performance-actions';
  header.append(make('h2','三层戏馆 · 演艺茶席'),make('span',`${money.label} · 随身 ${amount(s.cash)} ${unit}`));
  const cast=make('section',null,'jp-performance-cast'),detail=make('section',null,'jp-performance-detail');
  const note=make('p',o?'收起面板保留安排':'成年艺者自愿参与 · 答应后确认预付','jp-performance-footer-note');actions.append(note);
  if(!o){
   const cards=make('div',null,'jp-performance-cards');
   for(const c of candidates){
    const card=make('section',null,'jp-performance-card'),heading=make('h3',c.name);heading.append(make('small',`${c.ageYears}岁`));
    card.append(heading,make('p',c.available?'可邀请':'歇场 / 已有安排',c.available?'jp-performance-available':undefined));
    for(const a of c.activities||[]){
     const b=button(null,()=>{selectedArtist=c.id;selectedActivity=a.id;refresh(true);});b.className='jp-performance-activity';b.setAttribute('aria-pressed',String(selectedArtist===c.id&&selectedActivity===a.id));b.dataset.jpPerformanceFocus=`activity-${c.id}-${a.id}`;
     b.append(make('span',a.name.replace('成年艺者陪席茶谈','席间清谈')),make('span',`${amount(a.fee)} ${unit}`));b.disabled=!c.available||!(c.ageYears>=18);b.setAttribute('aria-label',`${c.name} · ${a.name} · ${amount(a.fee)} ${unit}`);card.append(b);
    }
    cards.append(card);
   }
   cast.append(cards);
   if(!candidates.length)cast.append(make('p','艺者暂在歇场。','jp-performance-note'));
   if(selected?.preference)cast.append(make('p',`${selected.name} · ${selected.preference}`,'jp-performance-note'));
   const choices=make('fieldset',null,'jp-performance-drinks');choices.append(make('legend','茶酒 · 随邀请询问'));
   const options=make('div',null,'jp-performance-drink-options');
   for(const d of [{id:null,name:'不点茶酒',fee:0},...drinks]){const b=button(null,()=>{selectedDrink=d.id;refresh(true);});b.append(make('span',d.name),make('span',`${amount(d.fee)} ${unit}`));b.setAttribute('aria-pressed',String(selectedDrink===d.id));b.dataset.jpPerformanceFocus=`drink-${d.id||'none'}`;options.append(b);}choices.append(options);detail.append(choices);
   const price=make('div',null,'jp-performance-total');price.append(make('span','本次合计'),make('strong',`${total} ${unit}`));detail.append(price);
   const invite=button(selected?`邀请${selected.name} · ${total}${unit}`:'暂无可邀请的艺者',()=>{service.request(selectedArtist,selectedActivity,selectedDrink);refresh(true);},true);invite.disabled=!atReception||!selected?.available||!(selected?.ageYears>=18)||!activity||!!s.paymentError||amount(s.cash)<total;invite.dataset.jpPerformanceFocus='invite';actions.append(invite);
   if(amount(s.cash)<total)detail.append(make('p',`余额不足 · 还差 ${total-amount(s.cash)} ${unit}，可到本地银行兑换或提款`,'jp-performance-error'));
   if(!atReception)note.textContent='三层东厅接待案前可邀请 · 尚未扣款';
   if(s.lastReply){const reply=make('p',`${s.lastReply.name||'艺者'}：${s.lastReply.reply||'正在答复'}${s.lastReply.willing===false?'（未收费）':''}`,'jp-performance-reply');reply.setAttribute('role','status');cast.append(reply);}
  }else{
   const d=orderDetails(s,o),order=make('div',null,'jp-performance-order'),progress=make('p',label,'jp-performance-progress');progress.setAttribute('role','status');
   order.append(make('p',o.paid?'席位已预留':'邀请答复','jp-performance-kicker'),make('h3',`${d.artist?.name||s.lastReply?.name||'已邀艺者'} · ${d.activityName}`),progress);
   if(s.lastReply?.artistId===o.artistId||s.lastReply&&!s.lastReply.artistId)order.append(make('p',`${s.lastReply.reply||'正在答复'}`,'jp-performance-reply'));
   if(o.status==='seating')order.append(make('p','离层或逾时未入座，取消并退回未提供部分。','jp-performance-note'));
   cast.append(order);
   const bill=make('dl',null,'jp-performance-bill'),line=(label,value)=>{const row=make('div');row.append(make('dt',label),make('dd',value));bill.append(row);};
   line('演出 / 清谈',`${d.actFee} ${unit}${o.paid?o.actComplete?' · 已结算':' · 未完成':''}`);line(d.drinkName,d.hasDrink?`${d.drinkFee} ${unit}${o.paid?o.drinkComplete?' · 已结算':' · 未完成':''}`:`0 ${unit}`);
   detail.append(bill);const price=make('div',null,'jp-performance-total');price.append(make('span',o.paid?'已预留':'确认时预留'),make('strong',`${d.total} ${unit}`));detail.append(price);
   if(o.paid){const unsettled=(o.actComplete?0:d.actFee)+(d.hasDrink&&!o.drinkComplete?d.drinkFee:0);detail.append(make('p',`未提供 ${unsettled} ${unit} · 取消时退还`,'jp-performance-refund'),make('p','演艺与茶酒各自完成后结算。','jp-performance-note'));}
   else detail.append(make('p','拒绝不收费 · 艺者答应后才可预留','jp-performance-note'),make('p','演艺与茶酒各自完成后结算，未提供部分退款。','jp-performance-note'));
   if(o.paid&&o.status==='seating'){
    const activityId=typeof o.activity==='object'?o.activity?.id:o.activity,seat=service.seat(),go=button(activityId==='tea'?'入座茶谈':'入座观演',()=>{const item=service.seat();if(item&&onFurniture){close();onFurniture(item);}else refresh(true);},true);go.disabled=!seat||!onFurniture;actions.append(go);
   }else if(!o.paid&&o.status==='accepted'){
    const pay=button(`确认预留 ${d.total}${unit}`,()=>{if(service.confirm()){close();onFurniture?.(service.seat());}else refresh(true);},true);pay.disabled=amount(s.cash)<d.total||!!s.paymentError;actions.append(pay);
    if(amount(s.cash)<d.total){const error=make('p',`余额不足 · 还差 ${d.total-amount(s.cash)} ${unit}，尚未扣款`,'jp-performance-error');error.setAttribute('role','status');detail.append(error);}
   }else if(!o.paid&&o.status!=='refund-pending'){const wait=button('等待本人答复',()=>{},true);wait.disabled=true;actions.append(wait);}
   actions.append(button(o.status==='returning'?'结束并离席':'取消本次邀请',()=>{service.cancel();close();if(o.paid&&onStand)onStand();}));
  }
  if(s.paymentError){const error=make('p','钱款账目待核对，暂不能预留新费用。','jp-performance-error');error.setAttribute('role','alert');detail.append(error);const retry=button('重试核对钱款',()=>{service.recoverPayments();refresh(true);});retry.className='jp-performance-recover';detail.append(retry);}
  body.append(cast,detail);dialog.append(x,header,body,actions);
  if(focused){const target=[...dialog.querySelectorAll('[data-jp-performance-focus]')].find(e=>e.dataset.jpPerformanceFocus===focused);target?.focus({preventScroll:true});}[cast,detail].forEach((e,i)=>{e.scrollTop=scrolls[i]||0;});restoreView();
 }

 function open(){if(disposed||(!nearFloor()&&!service.active()))return false;if(!service.active())service.recoverPayments();onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);return true;}
 badge.onclick=open;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {open,close,isOpen:()=>!!dialog.open,openStation:id=>id===RECEPTION_ID?open():false,update(){if(!disposed)refresh();},dispose(){disposed=true;close();badge.remove();dialog.remove();style.remove();}};
}
