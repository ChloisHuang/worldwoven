import {SALON_RECEPTION} from './china-tavern-salon.js';
export function createChinaTavernSalonUI({service,getPlayer,onOpen,document:doc=globalThis.document}){
 const el=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const badge=el('button','云来青楼 · 雅集接待','cn-salon-ticket'),dialog=el('dialog',null,'cn-salon-dialog'),fade=el('div','茶香渐起，你们聊起了各自的见闻','cn-salon-fade'),style=el('style');
 style.textContent='.cn-salon-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:205px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:11px 14px;border-radius:12px;background:#865467;color:#fff4df;font-size:12px}.cn-salon-dialog{position:fixed;inset:0;margin:auto;width:min(400px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:22px;border:1px solid #c5af82;border-radius:16px;background:#f2ead7;color:#493f32}.cn-salon-dialog::backdrop{background:#30281966}.cn-salon-dialog h2{margin:0 30px 12px 0;font-size:22px}.cn-salon-dialog p{font-size:13px;line-height:1.55}.cn-salon-dialog button{min-height:44px;padding:11px 13px;border-radius:8px;background:#ded2b9;color:#493f32}.cn-salon-dialog button:focus-visible{outline:3px solid #865467;outline-offset:2px}.cn-salon-dialog button:disabled{opacity:.5}.cn-salon-close{position:absolute;right:7px;top:7px;background:transparent!important;font-size:24px}.cn-salon-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px}.cn-salon-primary{background:#865467!important;color:#fff4df!important}.cn-salon-fade{position:fixed;inset:0;z-index:45;background:#30262cf5;color:#f6e8cb;display:grid;place-items:center;text-align:center;padding:30px;font-size:18px;pointer-events:none;animation:cn-salon-dim 2.2s ease-in-out both}.cn-salon-fade[hidden]{display:none}@keyframes cn-salon-dim{0%,100%{opacity:0}25%,75%{opacity:1}}@media(max-height:550px){.cn-salon-ticket{top:160px;font-size:10px;padding:8px 10px}.cn-salon-dialog{padding:16px}}';
 badge.type='button';badge.setAttribute('aria-label','三层青楼雅集接待');dialog.setAttribute('aria-label','温晚的接待案');fade.hidden=true;fade.setAttribute('aria-live','polite');(doc.head||doc.body).append(style);doc.body.append(badge,dialog,fade);
 let signature='',disposed=false;
 const nearFloor=()=>{const p=getPlayer()?.root.position;return p&&p.x>16&&p.x<26&&p.z>8&&p.z<21&&Math.abs(p.y-7.815)<.5;};
 const close=()=>{if(dialog.open)dialog.close();};
 function button(text,fn,primary=false){const b=el('button',text,primary?'cn-salon-primary':'');b.type='button';b.onclick=fn;return b;}
 function refresh(force=false){
  const s=service.view(),o=s.session,key=JSON.stringify([o,s.returning,s.lastReply,s.rooms,s.candidates,s.cash,s.paymentError,service.atReception()]);badge.hidden=!nearFloor()&&!o;badge.textContent=o?`云来雅集 · ${s.label}`:'云来青楼 · 雅集接待';fade.hidden=!s.fade;
  if(!dialog.open&&!force)return;if(!force&&signature===key)return;signature=key;dialog.replaceChildren();const x=button('×',close);x.className='cn-salon-close';x.setAttribute('aria-label','收起接待簿');dialog.append(x,el('h2','温晚的接待案'));
  dialog.append(el('p',`手头铜钱：${s.cash}文`));
  dialog.append(el('p','先引见，由本人答复。愿意且有空房，再确认价目。预留铜钱后才引路；实际到房茶叙完成才结账，此前取消或未能服务全额退款。付费不能替代本人意愿。'));
  if(s.paymentError)dialog.append(el('p','上次铜钱尚未退妥或账目待核对，暂缓新引见。收起后重开接待簿可重试。'));
  if(!o&&s.cash<5)dialog.append(el('p','钱袋不足？一层许安有洒扫短工，两桌擦净后回掌柜处领12文。'));
  if(o){dialog.append(el('p',s.label));if(o.roomId)dialog.append(el('p',`温晚留房：${s.rooms.find(r=>r.id===o.roomId)?.name} · ${['fade','visiting'].includes(o.stage)?'客人已到':'等客人到房'}`));}
  else if(s.lastReply)dialog.append(el('p',`${s.lastReply.name}：${s.lastReply.reply}${s.lastReply.roomUnavailable?' 温晚：眼下没有空房，稍候再来。':''}`));
  const actions=el('div',null,'cn-salon-actions');
  if(!o){
   if(!service.atReception())dialog.append(el('p','请到三层公共梯厅东侧的接待案前，温晚在那里等候。'));
   if(!s.candidates.length)dialog.append(el('p','今日没有合适的引见，听席仍可坐坐。'));
   for(const c of s.candidates){
    const card=el('div');card.append(el('p',`${c.name} · ${c.gender||'成年艺者'} · ${c.ageYears}岁 · ${c.specialty||'诗词'}`),el('p',c.preference));
    const choices=el('div',null,'cn-salon-actions');
    for(const a of c.activities){const b=button(`请引见${c.name} · ${a.name} ${a.fee}文`,()=>{if(service.request(c.id,a.id))close();else refresh(true);},true);b.disabled=!c.available||!service.atReception()||!!s.paymentError;choices.append(b);}
    const banquet=button(`邀${c.name}宴饮 · 8文`,()=>{if(service.request(c.id,'banquet'))close();else refresh(true);});banquet.disabled=!c.available||!service.atReception()||!!s.paymentError;choices.append(banquet);card.append(choices);dialog.append(card);
   }
   if(s.returning)dialog.append(el('p','艺者正在回雅集厅，容对方稍歇。'));
  }else{
   if(o.stage==='accepted'){dialog.append(el('p',`本次${o.fee}文，确认后从钱袋预留；茶叙完成前取消全退。`));const pay=button(`确认预留${o.fee}文 · 随艺者下楼`,()=>{if(service.startEscort())close();else refresh(true);},true);pay.disabled=s.cash<o.fee;actions.append(pay);if(s.cash<o.fee)dialog.append(el('p','手头铜钱不足，请先取消引见，再去一层做工或钱庄取钱。'));}
   if(o.payment==='reserved')dialog.append(el('p',`已预留${o.fee}文；现在取消，全额退回`));
   if(o.payment==='settled')dialog.append(el('p',`茶叙已完成，${o.fee}文已结清；告辞不再退款`));
   actions.append(button(['fade','visiting'].includes(o.stage)?'告辞离席':'取消这次引见',()=>{service.cancel();close();}));
  }
  dialog.append(actions,el('p',s.rooms.map(r=>`${r.name}：${r.claim?(r.claim.status==='occupied'?'茶叙中':'已留房'):r.physicallyOccupied?'有人暂歇':'空闲'}`).join('　')));
 }
 function open(){if(disposed||(!nearFloor()&&!service.active()))return false;if(!service.active())service.recoverPayments();onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);return true;}
 badge.onclick=open;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {open,close,isOpen:()=>!!dialog.open,openStation:id=>id===SALON_RECEPTION?open():false,update:()=>{if(!disposed)refresh();},dispose(){disposed=true;close();badge.remove();dialog.remove();fade.remove();style.remove();}};
}
