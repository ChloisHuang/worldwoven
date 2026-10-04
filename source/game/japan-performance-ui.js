const RECEPTION_ID='jp-performance-reception';
const RECEPTION_POSITION=[4.3,7.6,-4.6];
const STAGES={invited:'艺者正在考虑邀请',reply:'听取艺者本人的答复',accepted:'艺者已答应，请核对价目',seating:'席位已留好，请及时入座',performing:'表演或清谈进行中',drinking:'茶酒已上席，正在共饮',returning:'本次会面结束，艺者正在回席'};

export function createJapanPerformanceUI({service,getPlayer,onOpen=()=>{},onNavigate,onFurniture,onStand,document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;};
 const style=make('style');
 style.textContent='.jp-performance-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:258px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:10px 13px;border-radius:12px;background:#804c3d;color:#fff4dc;font-size:12px;box-shadow:0 3px 12px #3d241e20}.jp-performance-ticket[hidden]{display:none}.jp-performance-dialog{box-sizing:border-box;position:fixed;inset:0;margin:auto;width:min(410px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;padding:21px;border:1px solid #bda77c;border-radius:16px;background:#f4eedf;color:#483c32}.jp-performance-dialog::backdrop{background:#30261e66}.jp-performance-dialog h2{margin:0 34px 12px 0;font-size:21px}.jp-performance-dialog h3{font-size:15px;margin:0 0 7px}.jp-performance-dialog p{font-size:13px;line-height:1.55;margin:8px 0;white-space:pre-line}.jp-performance-dialog button{min-height:44px;padding:10px 12px;border-radius:8px;background:#e4d8bf;color:#483c32;cursor:pointer}.jp-performance-dialog button:focus-visible{outline:3px solid #986b30;outline-offset:2px}.jp-performance-dialog button:disabled{opacity:.5;cursor:default}.jp-performance-dialog .jp-performance-close{position:absolute;right:7px;top:7px;background:transparent;font-size:24px}.jp-performance-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.jp-performance-primary{background:#804c3d!important;color:#fff4dc!important}.jp-performance-card{padding:14px 0;border-top:1px solid #d6c7ac;margin-top:14px}.jp-performance-drinks{padding:11px 0 13px;border:0;margin:0}.jp-performance-drinks legend{font-size:13px;font-weight:600}.jp-performance-drinks button[aria-pressed=true]{outline:2px solid #804c3d;background:#ecdbbc}.jp-performance-note{font-size:11px!important;color:#71634f}.jp-performance-progress{padding:10px 12px;background:#e8e5d4;border-radius:9px}.jp-performance-error{color:#8c392f!important}@media(max-height:550px){.jp-performance-ticket{top:210px;font-size:10px;padding:8px 10px}.jp-performance-dialog{padding:16px}.jp-performance-dialog h2{font-size:19px}}';
 const badge=make('button','三层戏馆 · 演出与茶叙','jp-performance-ticket'),dialog=make('dialog',null,'jp-performance-dialog');
 badge.type='button';badge.hidden=true;badge.setAttribute('aria-label','查看三层戏馆演出与茶叙');dialog.setAttribute('aria-label','三层戏馆接待簿');
 (doc.head||doc.body).append(style);doc.body.append(badge,dialog);
 let selectedDrink=null,signature='',badgeText='',disposed=false;
 const nearFloor=()=>{const p=getPlayer()?.root?.position;return !!p&&Math.abs(p.y-7.6)<.5&&p.x>=1.8&&p.x<=7.3&&p.z>=-7&&p.z<=8;};
 const close=()=>{if(dialog.open)dialog.close();};
 const button=(text,fn,primary=false)=>{const b=make('button',text,primary?'jp-performance-primary':undefined);b.type='button';b.onclick=fn;return b;};
 const amount=value=>Number.isFinite(Number(value))?Number(value):0;
 function orderDetails(s,o){
  const artist=(s.candidates||[]).find(c=>c.id===o.artistId),activityId=typeof o.activity==='object'?o.activity?.id:o.activity;
  const activity=typeof o.activity==='object'&&o.activity?o.activity:artist?.activities?.find(a=>a.id===activityId);
  const drinkId=typeof o.drink==='object'?o.drink?.id:o.drink;
  const drink=typeof o.drink==='object'&&o.drink?o.drink:(s.drinks||[]).find(d=>d.id===drinkId);
  const drinkFee=drinkId?amount(drink?.fee):0,total=amount(o.fee);
  return {artist,activityName:activity?.name||({dance:'舞台演出',story:'故事演出',tea:'席间清谈'}[activityId])||'演出或清谈',actFee:activity?.fee===undefined?Math.max(0,total-drinkFee):amount(activity.fee),drinkName:drink?.name||(drinkId?'所选茶酒':'不点茶酒'),drinkFee,total,hasDrink:!!drinkId};
 }
 function refresh(force=false){
  const s=service.view(),o=s.order,atReception=service.atReception(),active=service.active(),drinks=(s.drinks||[]).filter(d=>d.id&&d.id!=='none');
  if(selectedDrink!==null&&!drinks.some(d=>d.id===selectedDrink))selectedDrink=null;
  badge.hidden=!nearFloor()&&!active;
  const label=s.label||STAGES[o?.status]||'请查看接待簿',text=o?`三层戏馆 · ${label}`:'三层戏馆 · 演出与茶叙';
  if(text!==badgeText){badgeText=text;badge.textContent=text;}
  if(!dialog.open&&!force)return;
  const key=JSON.stringify([o,s.label,s.lastReply,s.candidates,s.drinks,s.cash,s.paymentError,atReception,selectedDrink]);
  if(!force&&key===signature)return;signature=key;
  const focused=doc.activeElement?.dataset?.jpPerformanceFocus,scrollTop=dialog.scrollTop;
  dialog.replaceChildren();
  const x=button('×',close);x.className='jp-performance-close';x.setAttribute('aria-label','收起接待簿');x.dataset.jpPerformanceFocus='close';
  dialog.append(x,make('h2','三层戏馆接待簿'),make('p',`随身铜钱：${amount(s.cash)}文`),make('p','歌舞伎启发的原创幻想戏馆。成年艺者自愿参与，内容为公开表演与席间清谈。','jp-performance-note'));
  if(s.lastReply){const reply=make('p',`${s.lastReply.name||'艺者'}：${s.lastReply.reply||'正在答复'}${s.lastReply.willing===false?'（未收费）':''}`);reply.setAttribute('role','status');dialog.append(reply);}
  if(s.paymentError){const error=make('p','铜钱账目尚待核对，暂不能预留新费用。可重试退款核对。','jp-performance-error');error.setAttribute('role','alert');dialog.append(error,button('重试核对铜钱',()=>{service.recoverPayments();refresh(true);}));}
  const actions=make('div',null,'jp-performance-actions');
  if(!o){
   if(!atReception){dialog.append(make('p','请到三层东厅的接待案前邀请艺者。'));if(onNavigate)actions.append(button('前往接待案',()=>{close();onNavigate([...RECEPTION_POSITION]);},true));}
   if(atReception){
    const choices=make('fieldset',null,'jp-performance-drinks');choices.append(make('legend','可选茶酒 · 随本次邀请一并询问'));
    const options=make('div',null,'jp-performance-actions');
    for(const drink of [{id:null,name:'不点茶酒',fee:0},...drinks]){
     const b=button(`${drink.name} · ${amount(drink.fee)}文`,()=>{selectedDrink=drink.id;refresh(true);});b.setAttribute('aria-pressed',String(selectedDrink===drink.id));b.dataset.jpPerformanceFocus=`drink-${drink.id||'none'}`;options.append(b);
    }
    choices.append(options);dialog.append(choices);
   }
   if(!(s.candidates||[]).length)dialog.append(make('p','艺者暂在歇场，稍后再来看看。'));
   for(const c of s.candidates||[]){
    const card=make('section',null,'jp-performance-card');card.append(make('h3',`${c.name} · ${c.ageYears}岁`),make('p',`${c.specialty||'原创表演'} · ${c.available?'可询问邀请':'正在歇场或已有安排'}`),make('p',c.preference||'邀请由艺者本人答复。','jp-performance-note'));
    if(atReception){
     const activityChoices=make('div',null,'jp-performance-actions'),drink=drinks.find(d=>d.id===selectedDrink);
     for(const a of c.activities||[]){
      const total=amount(a.fee)+amount(drink?.fee),b=button(`邀请${c.name} · ${a.name} ${total}文`,()=>{service.request(c.id,a.id,selectedDrink);refresh(true);},true);
      b.disabled=!c.available||!(c.ageYears>=18)||!!s.paymentError;b.dataset.jpPerformanceFocus=`invite-${c.id}-${a.id}`;
      b.setAttribute('aria-label',`邀请${c.name}${a.name}，${drink?.name||'不点茶酒'}，合计${total}文`);activityChoices.append(b);
     }
     card.append(activityChoices);
    }
    dialog.append(card);
   }
  }else{
   const d=orderDetails(s,o),progress=make('p',label,'jp-performance-progress');progress.setAttribute('role','status');dialog.append(progress);
   dialog.append(make('p',`${d.artist?.name||s.lastReply?.name||'已邀艺者'} · ${d.activityName}\n演出／清谈 ${d.actFee}文 + ${d.drinkName} ${d.drinkFee}文 = 合计 ${d.total}文`));
   if(o.paid){
    dialog.append(make('p',`已预留 ${d.total}文\n${d.activityName}：${o.actComplete?'已完成，已结算':'尚未完成'}\n${d.hasDrink?`${d.drinkName}：${o.drinkComplete?'已完成，已结算':'尚未完成'}`:'茶酒：未点选'}`));
    const unsettled=(o.actComplete?0:d.actFee)+(d.hasDrink&&!o.drinkComplete?d.drinkFee:0);
    dialog.append(make('p',`已完成的项目分别结算；当前未提供部分 ${unsettled}文，取消时退还。`,'jp-performance-note'));
    if(o.status!=='returning'){
     const seat=service.seat(),go=button('前往预留席位并入座',()=>{const item=service.seat();if(item&&onFurniture){close();onFurniture(item);}else refresh(true);},true);go.disabled=!seat||!onFurniture;actions.append(go);
     dialog.append(make('p','请及时入座。离开本层或逾时未到席会取消，未提供部分原额退回。','jp-performance-note'));
    }
   }else if(o.status==='accepted'){
    dialog.append(make('p','艺者已经答应。确认后才从钱袋预留费用并保留席位。'));
    const pay=button(`确认预留 ${d.total}文`,()=>{service.confirm();refresh(true);},true);pay.disabled=amount(s.cash)<d.total||!!s.paymentError;actions.append(pay);
    if(amount(s.cash)<d.total)dialog.append(make('p','铜钱不足，尚未扣款。可以先取消邀请。','jp-performance-error'));
   }else if(!o.paid)dialog.append(make('p','尚未预留铜钱；请等艺者本人答复。','jp-performance-note'));
   actions.append(button(o.status==='returning'?'结束并离席':'取消本次邀请',()=>{service.cancel();close();if(o.paid&&onStand)onStand();}));
  }
  dialog.append(actions,make('p','拒绝邀请不收费；艺者答应后才可确认预付。演出／清谈与茶酒各自完成后结算，未提供部分退款。','jp-performance-note'),make('p','收起接待簿或按 Esc 只关闭面板，演出与交谈会在场景中继续。','jp-performance-note'));
  if(focused){const target=[...dialog.querySelectorAll('[data-jp-performance-focus]')].find(e=>e.dataset.jpPerformanceFocus===focused);target?.focus({preventScroll:true});}dialog.scrollTop=scrollTop;
 }
 function open(){if(disposed||(!nearFloor()&&!service.active()))return false;if(!service.active())service.recoverPayments();onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);return true;}
 badge.onclick=open;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {open,close,isOpen:()=>!!dialog.open,openStation:id=>id===RECEPTION_ID?open():false,update(){if(!disposed)refresh();},dispose(){disposed=true;close();badge.remove();dialog.remove();style.remove();}};
}
