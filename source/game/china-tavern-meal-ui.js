import {currentInteractionIntent,nearbyInteraction} from './player-interaction-intents.js';

export function createChinaTavernMealUI({service,getPlayer,getMounted,getReception=()=>null,onIntent,onMountSeat,onStand,onOpen,canChooseSeat=()=>true,canOrder=()=>true,canSee=()=>true,canShow=()=>true,document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const badge=make('button','云来酒楼 · 选座点菜','cn-meal-ticket'),dialog=make('dialog',null,'cn-meal-dialog'),style=make('style');
 style.textContent='.cn-meal-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:205px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:11px 14px;border-radius:12px;background:#5d7568;color:#fff6de;font-size:12px;box-shadow:0 3px 12px #173b3320}.cn-meal-dialog{position:fixed;inset:0;margin:auto;width:min(390px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:22px;border:1px solid #c5af82;border-radius:16px;background:#f2ead7;color:#493f32}.cn-meal-dialog::backdrop{background:#30281966}.cn-meal-dialog h2{margin:0 30px 12px 0;font-size:22px}.cn-meal-dialog p{font-size:13px;line-height:1.55}.cn-meal-dialog button{min-height:44px;padding:11px 13px;border-radius:8px;background:#ded2b9;color:#493f32}.cn-meal-dialog button:focus-visible{outline:3px solid #647e70;outline-offset:2px}.cn-meal-dialog button:disabled{opacity:.5}.cn-meal-close{position:absolute;right:7px;top:7px;background:transparent!important;font-size:24px}.cn-meal-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px}.cn-meal-primary{background:#526f60!important;color:#fff6de!important}.cn-meal-seats{display:grid;grid-template-columns:1fr 1fr;gap:9px}@media(max-height:550px){.cn-meal-ticket{top:160px;font-size:10px;padding:8px 10px}.cn-meal-dialog{padding:16px}}';
 badge.type='button';badge.setAttribute('aria-label','云来酒楼选座与点菜');dialog.setAttribute('aria-label','云来酒楼菜牌');(doc.head||doc.body).append(style);doc.body.append(badge,dialog);
 let signature='',disposed=false,choiceRevision=0;
 const nearEntry=()=>[getReception(),...service.seats].some(item=>nearbyInteraction(item,getPlayer()?.root.position,{radius:1.8,clear:canSee}));
 const seatName=s=>s?`${s.center[0]<21?'西窗':'东窗'}桌 · ${s.center[2]<18.1?'里侧':'门侧'}`:'原餐位';
 function invalidateIntent(){choiceRevision++;}
 function close(){if(dialog.open){invalidateIntent();dialog.close();}}
 function button(text,fn,primary=false){const revision=choiceRevision,b=make('button',text,primary?'cn-meal-primary':'');b.type='button';b.onclick=()=>{if(!disposed&&dialog.open&&revision===choiceRevision)fn();};return b;}
 // A choice describes the outcome. The shared controller owns its route and
 // cancellation; this UI never polls a remembered seat or submits on update.
 function intent(seatId){
  const seat=service.seats.find(s=>s.id===seatId),mounted=getMounted()?.id===seatId;
  if(disposed||!seat||!getPlayer()||service.view().order||!canOrder()||!mounted&&!canChooseSeat(seat))return null;
  return {id:'cn-meal-'+seat.id,provider:'china-tavern-meal',seatId:seat.id,name:'云来酒楼',action:`在${seatName(seat)}点菌菇饭`,position:(mounted?seat.anchor:seat.position).slice(),executionRadius:mounted ? .35 : .016,keepSeat:mounted,intentKey:JSON.stringify([choiceRevision,seat.id,mounted])};
 }
 function resolveIntent(selected){return currentInteractionIntent(selected,intent(selected?.seatId));}
 function executeIntent(selected){
  const current=resolveIntent(selected);if(!current||!nearbyInteraction(current,getPlayer()?.root.position,{radius:current.executionRadius}))return false;
  invalidateIntent(); // Consume before mount or service effects, including failure.
  const seat=service.seats.find(s=>s.id===current.seatId);
  if(getMounted()?.id!==seat.id)onMountSeat(seat);
  return getMounted()?.id===seat.id&&service.requestMeal();
 }
 function request(selected){if(!resolveIntent(selected)){refresh(true);return;}dialog.close();onIntent(selected);}
 function refresh(force=false){
  const s=service.view(),o=s.order,mounted=getMounted(),seated=service.seats.find(i=>i.id===mounted?.id),available=canOrder(),near=nearEntry();
  badge.hidden=!near||!canShow();badge.textContent=o?`云来酒楼 · ${o.cancelled?'正在收拾餐具':s.label}`:seated?'云来酒楼 · 招呼掌柜点菜':'云来酒楼 · 选座点菜';
  if(dialog.open&&!near&&!o){close();return;}if(!dialog.open&&!force)return;const key=[o?.id,o?.stage,o?.cancelled,mounted?.id,available,...service.seats.map(seat=>canChooseSeat(seat))].join('|');if(!force&&key===signature)return;signature=key;invalidateIntent();dialog.replaceChildren();
  const x=button('×',close);x.className='cn-meal-close';x.setAttribute('aria-label','关闭酒楼菜牌');dialog.append(x,make('h2','云来酒楼'),make('p','今日一味 · 云来菌菇饭'));
  if(o){dialog.append(make('p',`${seatName(service.seats.find(i=>i.id===o.seatId))} · ${o.cancelled?'饭已取消，陆青正在收拾餐具':s.label}`));}
  else if(!available)dialog.append(make('p','手上的擦桌短工还未收工，请完成或取消后再点菜。'));
  else if(seated)dialog.append(make('p',`${seatName(seated)}已入座。招呼许安，他会到桌边听你点菜。`));
  else{dialog.append(make('p','选一处餐位点菌菇饭，会自动走到餐椅坐好并招呼许安。'));const list=make('div',null,'cn-meal-seats');for(const seat of service.seats){const selected=intent(seat.id),b=button(selected?.action||`${seatName(seat)} · 暂时有人`,()=>request(selected));b.disabled=!selected;list.append(b);}dialog.append(list);}
  const actions=make('div',null,'cn-meal-actions');
  if(seated&&!o&&available){const selected=intent(seated.id);actions.append(button('招呼掌柜 · 点菌菇饭',()=>request(selected),true));}
  if(o?.stage==='ready'&&!o.cancelled)actions.append(button('吃送来的菌菇饭',()=>{if(service.view().order?.id===o.id&&service.eat())close();else refresh(true);},true));
  if(o&&!o.cancelled&&!['clear-table','lifting','return','washing'].includes(o.stage))actions.append(button('取消这份饭',()=>{if(service.view().order?.id===o.id)service.cancel();close();}));
  if(seated)actions.append(button('起身',()=>{close();onStand();}));dialog.append(actions,make('p',o?'收起菜牌后仍会继续备餐；起身会取消未吃完的饭。':'菌菇饭是酒楼的一份游戏餐点。可在桌边等服务助理送来。'));
 }
 function open(){if(disposed||!nearEntry()&&!service.view().order)return;invalidateIntent();onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);}
 badge.onclick=()=>{if(!disposed&&nearEntry()&&canShow())open();};dialog.addEventListener('cancel',e=>{e.preventDefault();close();});refresh();
 return {open,close,intent,resolveIntent,executeIntent,invalidateIntent,isOpen:()=>!!dialog.open,openStation:id=>{if(id!==service.dish.host)return false;open();return true;},update:()=>{if(!disposed)refresh();},dispose(){disposed=true;invalidateIntent();close();badge.remove();dialog.remove();style.remove();}};
}
