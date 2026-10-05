import {currentInteractionIntent,nearbyInteraction} from './player-interaction-intents.js';

export function createChinaTavernMealUI({service,getPlayer,getMounted,getReception=()=>null,onIntent,onMountSeat,onStand,onOpen,canChooseSeat=()=>true,canOrder=()=>true,canSee=()=>true,canShow=()=>true,document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const badge=make('button','云来酒楼 · 选座点菜','cn-meal-ticket'),dialog=make('dialog',null,'cn-meal-dialog'),style=make('style');
 style.textContent='.cn-meal-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:205px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:11px 14px;border-radius:12px;background:#5d7568;color:#fff6de;font-size:12px;box-shadow:0 3px 12px #173b3320}.cn-meal-dialog{position:fixed;inset:0;margin:auto;width:min(390px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:22px;border:1px solid #c5af82;border-radius:16px;background:#f2ead7;color:#493f32}.cn-meal-dialog::backdrop{background:#30281966}.cn-meal-dialog h2{margin:0 30px 12px 0;font-size:22px}.cn-meal-dialog p{font-size:13px;line-height:1.55}.cn-meal-dialog button{min-height:44px;padding:11px 13px;border-radius:8px;background:#ded2b9;color:#493f32}.cn-meal-dialog button:focus-visible{outline:3px solid #647e70;outline-offset:2px}.cn-meal-dialog button:disabled{opacity:.5}.cn-meal-close{position:absolute;right:7px;top:7px;background:transparent!important;font-size:24px}.cn-meal-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px}.cn-meal-primary{background:#526f60!important;color:#fff6de!important}.cn-meal-seats{display:grid;grid-template-columns:1fr 1fr;gap:9px}@media(max-height:550px){.cn-meal-ticket{top:160px;font-size:10px;padding:8px 10px}.cn-meal-dialog{padding:16px}}';
 badge.type='button';badge.setAttribute('aria-label','云来酒楼选座与点菜');dialog.setAttribute('aria-label','云来酒楼菜牌');(doc.head||doc.body).append(style);doc.body.append(badge,dialog);
 let signature='',disposed=false,choiceRevision=0,chosenDish=service.menu?.[0]?.id||service.dish.id;
 const nearEntry=()=>[getReception(),...service.seats].some(item=>nearbyInteraction(item,getPlayer()?.root.position,{radius:1.8,clear:canSee}));
 const seatName=s=>s?`${s.center[0]<21?'西窗':'东窗'}桌 · ${s.center[2]<18.1?'里侧':'门侧'}`:'原餐位';
 function invalidateIntent(){choiceRevision++;}
 function close(){if(dialog.open){invalidateIntent();dialog.close();}}
 function button(text,fn,primary=false){const revision=choiceRevision,b=make('button',text,primary?'cn-meal-primary':'');b.type='button';b.onclick=()=>{if(!disposed&&dialog.open&&revision===choiceRevision)fn();};return b;}
 // A choice describes the outcome. The shared controller owns its route and
 // cancellation; this UI never polls a remembered seat or submits on update.
 function intent(seatId,dishId=chosenDish){
  const dish=service.menu?.find(d=>d.id===dishId)||service.dish,seat=service.seats.find(s=>s.id===seatId),mounted=getMounted()?.id===seatId;
  if(disposed||!seat||!getPlayer()||service.view().order||!canOrder()||!mounted&&!canChooseSeat(seat))return null;
  return {id:'cn-meal-'+seat.id,provider:'china-tavern-meal',seatId:seat.id,dishId:dish.id,name:'云来酒楼',action:`在${seatName(seat)}点${dish.name} · ${dish.price||6}文`,position:(mounted?seat.anchor:seat.position).slice(),executionRadius:mounted ? .35 : .016,keepSeat:mounted,intentKey:JSON.stringify([choiceRevision,seat.id,dish.id,mounted])};
 }
 function resolveIntent(selected){return currentInteractionIntent(selected,intent(selected?.seatId,selected?.dishId));}
 function executeIntent(selected){
  const current=resolveIntent(selected);if(!current||!nearbyInteraction(current,getPlayer()?.root.position,{radius:current.executionRadius}))return false;
  invalidateIntent(); // Consume before mount or service effects, including failure.
  const seat=service.seats.find(s=>s.id===current.seatId);
  if(getMounted()?.id!==seat.id)onMountSeat(seat);
  return getMounted()?.id===seat.id&&service.requestMeal(current.dishId);
 }
 function request(selected){if(!resolveIntent(selected)){refresh(true);return;}dialog.close();onIntent(selected);}
 function refresh(force=false){
  const s=service.view(),o=s.order,mounted=getMounted(),seated=service.seats.find(i=>i.id===mounted?.id),available=canOrder(),near=nearEntry();
  badge.hidden=!near||!canShow();badge.textContent=o?`云来酒楼 · ${o.cancelled?'正在收拾餐具':s.label}`:seated?'云来酒楼 · 招呼许安点菜':'云来酒楼 · 选座点菜';
  if(dialog.open&&!near&&!o){close();return;}if(!dialog.open&&!force)return;const key=[o?.id,o?.stage,o?.cancelled,mounted?.id,available,chosenDish,service.walletCash?.(),...service.seats.map(seat=>canChooseSeat(seat))].join('|');if(!force&&key===signature)return;signature=key;invalidateIntent();dialog.replaceChildren();
  const x=button('×',close);x.className='cn-meal-close';x.setAttribute('aria-label','关闭酒楼菜牌');dialog.append(x,make('h2','云来酒楼'),make('p',service.walletCash?.()==null?'钱包记录待核对':`钱包 ${service.walletCash()} 铜文`));
  if(!o){const dishes=make('div',null,'cn-meal-actions');for(const dish of service.menu||[]){const b=button(`${dish.name} · ${dish.price}文`,()=>{chosenDish=dish.id;refresh(true);},chosenDish===dish.id);dishes.append(b);}dialog.append(dishes);}
  if(o){dialog.append(make('p',`${seatName(service.seats.find(i=>i.id===o.seatId))} · ${o.cancelled?'饭已取消，陆青正在收拾餐具':s.label}`));}
  else if(!available)dialog.append(make('p','手上的擦桌短工还未收工，请完成或取消后再点菜。'));
  else if(seated)dialog.append(make('p',`${seatName(seated)}已入座。招呼许安，他会到桌边听你点菜。`));
  else{dialog.append(make('p','选菜和餐位；确认点餐后暂扣餐费。'));const list=make('div',null,'cn-meal-seats');for(const seat of service.seats){const selected=intent(seat.id),b=button(selected?.action||`${seatName(seat)} · 暂时有人`,()=>request(selected));b.disabled=!selected;list.append(b);}dialog.append(list);}
  const actions=make('div',null,'cn-meal-actions');
  if(seated&&!o&&available){const selected=intent(seated.id);actions.append(button(`确认点餐 · ${service.menu?.find(d=>d.id===chosenDish)?.price||6}文`,()=>request(selected),true));}
  if(o?.stage==='ready'&&!o.cancelled)actions.append(button('享用送来的餐点',()=>{if(service.view().order?.id===o.id&&service.eat())close();else refresh(true);},true));
  if(o&&!o.cancelled&&!['clear-table','lifting','return','washing'].includes(o.stage))actions.append(button(o.stage==='ready'?'请收走餐点 · 已送达不退费':'取消点餐 · 送达前退款',()=>{if(service.view().order?.id===o.id)service.cancel();close();}));
  if(seated)actions.append(button('起身',()=>{close();onStand();}));dialog.append(actions,make('p',o?'收起菜牌后仍会继续备餐；起身会取消未吃完的饭。':'送达前取消全额退款；送达后结账。余额不足可到钱庄取款。'));
 }
 function open(){if(disposed||!nearEntry()&&!service.view().order)return;invalidateIntent();onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);}
 badge.onclick=()=>{if(!disposed&&nearEntry()&&canShow())open();};dialog.addEventListener('cancel',e=>{e.preventDefault();close();});refresh();
 return {open,close,intent,resolveIntent,executeIntent,invalidateIntent,isOpen:()=>!!dialog.open,openStation:id=>{if(id!==service.dish.host)return false;open();return true;},update:()=>{if(!disposed)refresh();},dispose(){disposed=true;invalidateIntent();close();badge.remove();dialog.remove();style.remove();}};
}
