export function createChinaTavernMealUI({service,getPlayer,getMounted,onFurniture,onStand,onOpen,canChooseSeat=()=>true,document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const badge=make('button','云来酒楼 · 选座点菜','cn-meal-ticket'),dialog=make('dialog',null,'cn-meal-dialog'),style=make('style');
 style.textContent='.cn-meal-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:205px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:11px 14px;border-radius:12px;background:#5d7568;color:#fff6de;font-size:12px;box-shadow:0 3px 12px #173b3320}.cn-meal-dialog{position:fixed;inset:0;margin:auto;width:min(390px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:22px;border:1px solid #c5af82;border-radius:16px;background:#f2ead7;color:#493f32}.cn-meal-dialog::backdrop{background:#30281966}.cn-meal-dialog h2{margin:0 30px 12px 0;font-size:22px}.cn-meal-dialog p{font-size:13px;line-height:1.55}.cn-meal-dialog button{min-height:44px;padding:11px 13px;border-radius:8px;background:#ded2b9;color:#493f32}.cn-meal-dialog button:focus-visible{outline:3px solid #647e70;outline-offset:2px}.cn-meal-dialog button:disabled{opacity:.5}.cn-meal-close{position:absolute;right:7px;top:7px;background:transparent!important;font-size:24px}.cn-meal-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px}.cn-meal-primary{background:#526f60!important;color:#fff6de!important}.cn-meal-seats{display:grid;grid-template-columns:1fr 1fr;gap:9px}@media(max-height:550px){.cn-meal-ticket{top:160px;font-size:10px;padding:8px 10px}.cn-meal-dialog{padding:16px}}';
 badge.type='button';badge.setAttribute('aria-label','云来酒楼选座与点菜');dialog.setAttribute('aria-label','云来酒楼菜牌');(doc.head||doc.body).append(style);doc.body.append(badge,dialog);
 let signature='',disposed=false;const nearHouse=()=>{const p=getPlayer()?.root.position;return p&&p.x>15.4&&p.x<26.5&&p.z>7.5&&p.z<21.5&&Math.abs(p.y-.215)<.6;};
 const seatName=s=>`${s.center[0]<21?'西窗':'东窗'}桌 · ${s.center[2]<18.1?'里侧':'门侧'}`;
 function close(){if(dialog.open)dialog.close();}
 function button(text,fn,primary=false){const b=make('button',text,primary?'cn-meal-primary':'');b.type='button';b.onclick=fn;return b;}
 function refresh(force=false){
  const s=service.view(),o=s.order,mounted=getMounted(),seated=service.seats.find(i=>i.id===mounted?.id),key=[o?.id,o?.stage,o?.cancelled,mounted?.id].join('|');
  badge.hidden=!nearHouse()&&!o;badge.textContent=o?`云来酒楼 · ${o.cancelled?'正在收拾餐具':s.label}`:seated?'云来酒楼 · 招呼掌柜点菜':'云来酒楼 · 选座点菜';
  if(dialog.open&&!nearHouse()&&!o){close();return;}if(!dialog.open&&!force)return;if(!force&&key===signature)return;signature=key;dialog.replaceChildren();
  const x=button('×',close);x.className='cn-meal-close';x.setAttribute('aria-label','关闭酒楼菜牌');dialog.append(x,make('h2','云来酒楼'),make('p','今日一味 · 云来菌菇饭'));
  if(o){dialog.append(make('p',`${seatName(service.seats.find(i=>i.id===o.seatId))} · ${o.cancelled?'饭已取消，许安正在收拾餐具':s.label}`));}
  else if(seated)dialog.append(make('p',`${seatName(seated)}已入座。招呼许安，他会到桌边听你点菜。`));
  else{dialog.append(make('p','先选一把餐椅，坐好后再点菜。'));const list=make('div',null,'cn-meal-seats');for(const seat of service.seats){const free=canChooseSeat(seat),b=button(seatName(seat)+(free?'':' · 暂时有人'),()=>{close();onFurniture(seat);});b.disabled=!free;list.append(b);}dialog.append(list);}
  const actions=make('div',null,'cn-meal-actions');
  if(seated&&!o)actions.append(button('招呼掌柜 · 点菌菇饭',()=>{if(service.requestMeal())close();else refresh(true);},true));
  if(o?.stage==='ready'&&!o.cancelled)actions.append(button('吃送来的菌菇饭',()=>{if(service.eat())close();else refresh(true);},true));
  if(o&&!o.cancelled&&!['clear-table','lifting','return','washing'].includes(o.stage))actions.append(button('取消这份饭',()=>{service.cancel();close();}));
  if(seated)actions.append(button('起身',()=>{close();onStand();}));dialog.append(actions,make('p',o?'收起菜牌后仍会继续备餐；起身会取消未吃完的饭。':'菌菇饭是酒楼的一份游戏餐点。可在桌边等掌柜送来。'));
 }
 function open(){if(disposed||!nearHouse())return;onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);}
 badge.onclick=open;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {open,close,isOpen:()=>!!dialog.open,openStation:id=>{if(id!==service.dish.host)return false;open();return true;},update:()=>{if(!disposed)refresh();},dispose(){disposed=true;close();badge.remove();dialog.remove();style.remove();}};
}
