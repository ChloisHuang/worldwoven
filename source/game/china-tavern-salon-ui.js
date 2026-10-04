import {SALON_RECEPTION} from './china-tavern-salon.js';
export function createChinaTavernSalonUI({service,getPlayer,onOpen,document:doc=globalThis.document}){
 const el=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const badge=el('button','云来青楼 · 雅集接待','cn-salon-ticket'),dialog=el('dialog',null,'cn-salon-dialog'),fade=el('div','茶香渐起，你们聊起了词章','cn-salon-fade'),style=el('style');
 style.textContent='.cn-salon-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:205px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:11px 14px;border-radius:12px;background:#865467;color:#fff4df;font-size:12px}.cn-salon-dialog{position:fixed;inset:0;margin:auto;width:min(400px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:22px;border:1px solid #c5af82;border-radius:16px;background:#f2ead7;color:#493f32}.cn-salon-dialog::backdrop{background:#30281966}.cn-salon-dialog h2{margin:0 30px 12px 0;font-size:22px}.cn-salon-dialog p{font-size:13px;line-height:1.55}.cn-salon-dialog button{min-height:44px;padding:11px 13px;border-radius:8px;background:#ded2b9;color:#493f32}.cn-salon-dialog button:focus-visible{outline:3px solid #865467;outline-offset:2px}.cn-salon-dialog button:disabled{opacity:.5}.cn-salon-close{position:absolute;right:7px;top:7px;background:transparent!important;font-size:24px}.cn-salon-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px}.cn-salon-primary{background:#865467!important;color:#fff4df!important}.cn-salon-fade{position:fixed;inset:0;z-index:45;background:#30262cf5;color:#f6e8cb;display:grid;place-items:center;text-align:center;padding:30px;font-size:18px;pointer-events:none;animation:cn-salon-dim 2.2s ease-in-out both}.cn-salon-fade[hidden]{display:none}@keyframes cn-salon-dim{0%,100%{opacity:0}25%,75%{opacity:1}}@media(max-height:550px){.cn-salon-ticket{top:160px;font-size:10px;padding:8px 10px}.cn-salon-dialog{padding:16px}}';
 badge.type='button';badge.setAttribute('aria-label','三层青楼雅集接待');dialog.setAttribute('aria-label','温晚的接待案');fade.hidden=true;fade.setAttribute('aria-live','polite');(doc.head||doc.body).append(style);doc.body.append(badge,dialog,fade);
 let signature='',disposed=false;
 const nearFloor=()=>{const p=getPlayer()?.root.position;return p&&p.x>16&&p.x<26&&p.z>8&&p.z<21&&Math.abs(p.y-7.815)<.5;};
 const close=()=>{if(dialog.open)dialog.close();};
 function button(text,fn,primary=false){const b=el('button',text,primary?'cn-salon-primary':'');b.type='button';b.onclick=fn;return b;}
 function refresh(force=false){
  const s=service.view(),o=s.session,key=JSON.stringify([o,s.returning,s.lastReply,s.rooms,s.candidates]);badge.hidden=!nearFloor()&&!o;badge.textContent=o?`云来雅集 · ${s.label}`:'云来青楼 · 雅集接待';fade.hidden=!s.fade;
  if(!dialog.open&&!force)return;if(!force&&signature===key)return;signature=key;dialog.replaceChildren();const x=button('×',close);x.className='cn-salon-close';x.setAttribute('aria-label','收起接待簿');dialog.append(x,el('h2','温晚的接待案'));
  dialog.append(el('p','艺者各有所好，我先为你引见，再由本人答复。今日茶叙暂不收银。'));
  if(o){dialog.append(el('p',s.label));if(o.roomId)dialog.append(el('p',`温晚留房：${s.rooms.find(r=>r.id===o.roomId)?.name} · ${['fade','visiting'].includes(o.stage)?'客人已到':'等客人到房'}`));}
  else if(s.lastReply)dialog.append(el('p',`${s.lastReply.name}：${s.lastReply.reply}${s.lastReply.roomUnavailable?' 温晚：眼下没有空房，稍候再来。':''}`));
  const actions=el('div',null,'cn-salon-actions');
  if(!o){
   if(!service.atReception())dialog.append(el('p','请到三层公共梯厅东侧的接待案前，温晚在那里等候。'));
   if(!s.candidates.length)dialog.append(el('p','今日没有合适的引见，听席仍可坐坐。'));
   for(const c of s.candidates){dialog.append(el('p',`${c.name} · ${c.ageYears}岁 · ${c.preference}`));for(const[label,activity]of[['请引见 · 邀叙诗','poetry'],['请引见 · 邀宴饮','banquet']]){const b=button(label,()=>{if(service.request(c.id,activity))close();else refresh(true);},activity==='poetry');b.disabled=!c.available||!service.atReception();actions.append(b);}}
   if(s.returning)dialog.append(el('p','清弦正在回雅集厅，容她稍歇。'));
  }else{
   if(o.stage==='accepted')actions.append(button('随柳清弦下楼',()=>{if(service.startEscort())close();else refresh(true);},true));
   actions.append(button(['fade','visiting'].includes(o.stage)?'告辞离席':'取消这次引见',()=>{service.cancel();close();}));
  }
  dialog.append(actions,el('p',s.rooms.map(r=>`${r.name}：${r.claim?(r.claim.status==='occupied'?'茶叙中':'已留房'):r.physicallyOccupied?'有人暂歇':'空闲'}`).join('　')));
 }
 function open(){if(disposed||(!nearFloor()&&!service.active()))return false;onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);return true;}
 badge.onclick=open;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {open,close,isOpen:()=>!!dialog.open,openStation:id=>id===SALON_RECEPTION?open():false,update:()=>{if(!disposed)refresh();},dispose(){disposed=true;close();badge.remove();dialog.remove();fade.remove();style.remove();}};
}
