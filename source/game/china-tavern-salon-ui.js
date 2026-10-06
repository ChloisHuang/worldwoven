import {SALON_MIN_FEE} from './china-salon-pricing.js';
import {SALON_RECEPTION} from './china-tavern-salon.js';
import {SALON_ACTIVITIES} from './china-tavern-salon-artists.js';
import {TAVERN_HALL_DZ} from './china-tavern-layout.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
export function createChinaTavernSalonUI({service,getPlayer,onOpen=()=>{},document:doc=globalThis.document}){
 const el=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!==null&&text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const badge=el('button','云来青楼 · 雅集接待','cn-salon-ticket'),dialog=el('dialog',null,'cn-salon-dialog ww-airy-theme ww-airy-panel'),fade=el('div','茶香渐起，你们聊起了各自的见闻','cn-salon-fade'),style=el('style');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.cn-salon-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:205px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:9px 13px;border-radius:3px;background:#f0eaf2;color:#716580;font-size:12px;box-shadow:0 3px 12px #3d241e15}.cn-salon-dialog.ww-airy-panel{width:min(790px,var(--ww-ui-width,calc(100vw - 24px)));max-width:none;height:min(370px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px 20px 12px;border:1px solid #e1e1e6;border-radius:20px 7px 20px 7px;background:linear-gradient(120deg,#faf8ef,#f3f4f2 70%,#f2eef9);color:#4f647c;box-shadow:0 14px 42px #3b476526;font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif;line-height:1.4}.cn-salon-dialog::backdrop{background:#2737463d;backdrop-filter:blur(3px)}.cn-salon-dialog *{box-sizing:border-box}.cn-salon-dialog h2{margin:0;font-family:inherit;font-size:21px;line-height:1.3;font-weight:600;letter-spacing:.08em}.cn-salon-dialog h3{font-size:18px;line-height:1.3;font-weight:500;margin:0 0 5px}.cn-salon-dialog p{font-size:13px;line-height:1.5;margin:5px 0}.cn-salon-dialog button{min-height:44px;font-family:inherit;cursor:pointer;box-shadow:none}.cn-salon-dialog button:disabled{opacity:.48;cursor:default}.cn-salon-dialog .cn-salon-close{position:absolute;right:8px;top:7px;width:44px;padding:0;border:0;border-radius:0;background:transparent;color:#8a919f;font-size:26px}.cn-salon-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-right:34px;padding-bottom:9px;margin-bottom:10px;border-bottom:1px solid #dce3e1}.cn-salon-heading>span{font-size:12px;color:#809098;white-space:nowrap}.cn-salon-content{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;overflow:hidden}.cn-salon-cast,.cn-salon-detail{min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain}.cn-salon-cards{display:grid;grid-template-columns:1fr 1fr;gap:7px}.cn-salon-card{width:100%;min-height:76px;padding:9px 10px;text-align:left;border:0;border-left:2px solid transparent;border-radius:3px;background:#ffffff80;color:#6b7e90}.cn-salon-card[aria-pressed=true]{border-left-color:#a2b3d1;background:linear-gradient(90deg,#e2e9f0,#edf2f780);color:#45647b}.cn-salon-card strong{font-size:16px;font-weight:500}.cn-salon-card small{font-size:11px;margin-left:7px;color:#85939f}.cn-salon-card span{display:block;margin-top:4px;font-size:11px;color:#809591}.cn-salon-detail{padding:9px 14px;border:1px solid #e2e6e6;border-radius:10px 3px 13px 3px;background:#fffefa80}.cn-salon-kicker{font-size:11px!important;color:#8c98a5;letter-spacing:.06em;margin:0 0 4px!important}.cn-salon-activities{display:flex;gap:5px;margin:7px 0}.cn-salon-activities button{flex:1;padding:5px 7px;text-align:left;border:0;border-left:2px solid transparent;border-radius:3px;background:#f0f2f3;color:#738295;font-size:12px}.cn-salon-activities button[aria-pressed=true]{border-left-color:#a2b3d1;background:#e3eaf2;color:#45647b}.cn-salon-activities button span{display:block;font-size:11px;margin-top:2px}.cn-salon-activities button span:first-child{font-size:12px;margin-top:0}.cn-salon-price{display:flex;align-items:baseline;gap:6px;margin:8px 0;color:#657e9c;font-size:12px}.cn-salon-price strong{font-size:28px;line-height:1;font-weight:500}.cn-salon-note{font-size:12px!important;color:#829298}.cn-salon-status{color:#66867d}.cn-salon-reply{padding:7px 10px;border-left:2px solid #b8c9d2;color:#60788c;background:#ffffff60}.cn-salon-error{color:#aa726b!important}.cn-salon-rooms{display:flex;gap:9px;margin-top:8px;font-size:11px;color:#819198}.cn-salon-current{padding:9px 8px}.cn-salon-actions{display:flex;align-items:center;gap:10px;padding-top:8px;border-top:1px solid #dce3e1}.cn-salon-actions button{width:auto;padding:8px 10px;border:0;border-radius:0;background:transparent;color:#7d899c;font-size:12px}.cn-salon-dialog.ww-airy-theme .cn-salon-primary{flex:1;min-width:0;font-size:14px;letter-spacing:.02em;padding:8px 14px}.cn-salon-footer-note{max-width:220px;font-size:11px!important;color:#879898;margin:0!important}.cn-salon-dialog .cn-salon-recover{padding:3px 0;background:transparent;color:#967586;border:0;border-radius:0;font-size:12px}.cn-salon-fade{position:fixed;inset:0;z-index:45;background:#30262cf5;color:#f6e8cb;display:grid;place-items:center;text-align:center;padding:30px;font-size:18px;pointer-events:none;animation:cn-salon-dim 2.2s ease-in-out both}.cn-salon-fade[hidden]{display:none}@keyframes cn-salon-dim{0%,100%{opacity:0}25%,75%{opacity:1}}
@media(max-height:500px){.cn-salon-dialog.ww-airy-panel{padding:12px 18px 10px}.cn-salon-heading{height:30px;flex:0 0 30px;padding-bottom:5px;margin-bottom:7px}.cn-salon-dialog h2{font-size:18px}.cn-salon-dialog h3{font-size:17px}.cn-salon-content{gap:12px}.cn-salon-card{padding:8px;min-height:70px}.cn-salon-detail{padding:8px 12px}.cn-salon-price{margin:5px 0}.cn-salon-price strong{font-size:25px}.cn-salon-actions{padding-top:5px}.cn-salon-ticket{top:160px;font-size:10px}}
@media(max-width:600px){.cn-salon-dialog.ww-airy-panel{height:min(620px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px}.cn-salon-heading{display:block;height:auto;flex-basis:auto}.cn-salon-heading>span{display:block;margin-top:3px}.cn-salon-content{display:block;overflow:auto}.cn-salon-cast,.cn-salon-detail{overflow:visible}.cn-salon-cast{margin-bottom:12px}.cn-salon-actions{flex-wrap:wrap;gap:4px}.cn-salon-footer-note{max-width:none;flex-basis:100%}}
`;
 badge.type='button';badge.setAttribute('aria-label','三层青楼雅集接待');dialog.setAttribute('aria-label','温晚的接待案');fade.hidden=true;fade.setAttribute('aria-live','polite');(doc.head||doc.body).append(style);doc.body.append(badge,dialog,fade);
 let signature='',disposed=false,generation=0,selectedArtist=null,selectedActivity=null,panel=null;
 const nearFloor=()=>{const p=getPlayer()?.root.position;return p&&p.x>16&&p.x<26&&p.z>8+TAVERN_HALL_DZ&&p.z<21&&Math.abs(p.y-7.815)<.5;};
 const close=()=>{generation++;if(dialog.open)dialog.close();};
 const text=(node,value)=>{value=String(value??'');if(node.textContent!==value)node.textContent=value;};
 const optional=(node,value)=>{text(node,value);node.hidden=!value;};
 const pressed=(node,value)=>{const next=String(value);if(node.getAttribute('aria-pressed')!==next)node.setAttribute('aria-pressed',next);};
 function button(label,fn,primary=false){const revision=generation,b=el('button',label,primary?'cn-salon-primary ww-airy-action':'');b.type='button';b.onclick=()=>{if(!disposed&&dialog.open&&revision===generation&&!b.disabled&&dialog.contains(b))fn();};return b;}
 // Keep the actual scrollers and keyed controls mounted. Assigning scrollTop or
 // replacing their children on a timer interrupts touch momentum on phones.
 function syncList(container,cache,items,create,update){
  let changed=false;const ids=new Set(items.map(item=>item.id));
  for(const [id,row]of cache)if(!ids.has(id)){row.node.remove();cache.delete(id);changed=true;}
  items.forEach((item,i)=>{let row=cache.get(item.id);if(!row){row=create(item);cache.set(item.id,row);}update(row,item);if(container.children[i]!==row.node){container.insertBefore(row.node,container.children[i]||null);changed=true;}});
  return changed;
 }
 function makePanel(){
  const x=button('×',close);x.className='cn-salon-close';x.setAttribute('aria-label','收起接待簿');x.setAttribute('data-cn-salon-focus','close');
  const {header,body,actions}=createAiryPanelParts(doc);header.className+=' cn-salon-heading';body.className+=' cn-salon-content';actions.className+=' cn-salon-actions';
  const cash=el('span'),cast=el('section',null,'cn-salon-cast'),detail=el('section',null,'cn-salon-detail'),note=el('p',null,'cn-salon-footer-note');
  header.append(el('h2','云来雅集 · 温晚接待'),cash);body.append(cast,detail);actions.append(note);dialog.replaceChildren(x,header,body,actions);
  return {body,cast,detail,actions,cash,note,mode:null,actionKey:null,actionButtons:[]};
 }
 function buildContents(mode){
  const p=panel;p.mode=mode;p.cast.replaceChildren();p.detail.replaceChildren();p.artists=new Map();p.activities=new Map();p.rooms=new Map();
  p.cards=el('div',null,'cn-salon-cards');p.empty=el('p','今日暂无合适引见，可在听席坐坐。','cn-salon-note');p.adults=el('p','引见仅面向已确认年满18岁的参与者。','cn-salon-note');
  p.current=el('div',null,'cn-salon-current');p.currentKicker=el('p',null,'cn-salon-kicker');p.currentTitle=el('h3');p.progress=el('p',null,'cn-salon-status');p.progress.setAttribute('role','status');p.sessionReply=el('p',null,'cn-salon-reply');p.roomNote=el('p',null,'cn-salon-note');p.current.append(p.currentKicker,p.currentTitle,p.progress,p.sessionReply,p.roomNote);
  p.reply=el('p',null,'cn-salon-reply');p.reply.setAttribute('role','status');p.returning=el('p',null,'cn-salon-note');p.roomList=el('div',null,'cn-salon-rooms');
  p.cast.append(mode==='pick'?p.cards:p.current);if(mode==='pick')p.cast.append(p.empty,p.adults,p.reply,p.returning);p.cast.append(p.roomList);
  p.kicker=el('p',null,'cn-salon-kicker');p.title=el('h3');p.choices=el('div',null,'cn-salon-activities');p.preference=el('p',null,'cn-salon-note');p.balance=el('p',null,'cn-salon-error');
  const amount=el('div',null,'cn-salon-price');p.fee=el('strong');p.payment=el('span');amount.append(p.fee,p.payment);p.terms=el('p',null,'cn-salon-note');p.consent=el('p',null,'cn-salon-note');p.error=el('p',null,'cn-salon-error');p.error.setAttribute('role','alert');
  p.retry=button('重试核对铜钱',()=>{service.recoverPayments();refresh(true);});p.retry.className='cn-salon-recover';p.retry.setAttribute('data-cn-salon-focus','recover');
  p.detail.append(p.kicker,p.title);if(mode==='pick')p.detail.append(p.choices,p.preference);p.detail.append(p.balance,amount,p.terms,p.consent,p.error,p.retry);
 }
 function refreshOverlay(s){
  badge.hidden=!nearFloor()&&!s.active;text(badge,s.active?`云来雅集 · ${s.label}`:'云来青楼 · 雅集接待');fade.hidden=!s.fade;
 }
 function refresh(force=false){
  if(disposed)return;
  if(!dialog.open&&!force){
   // The scene overlay remains live during an actual visit, without asking
   // for the closed catalogue, room occupancy or full transaction journal.
   if(service.displayState)refreshOverlay(service.displayState());
   else {const s=service.view();refreshOverlay({active:!!s.session,label:s.label,fade:s.fade});}
   return;
  }
  const s=service.view(),o=s.session,candidates=s.candidates||[],atReception=service.atReception();
  if(!candidates.some(c=>c.id===selectedArtist)){selectedArtist=(candidates.find(c=>c.available)||candidates[0])?.id||null;selectedActivity=null;}
  const selected=candidates.find(c=>c.id===selectedArtist),activities=selected?[...selected.activities,...(selected.activities.some(a=>a.id==='banquet')?[]:[{id:'banquet',...SALON_ACTIVITIES.banquet,fee:selected.quoteFee??selected.activities[0]?.fee??SALON_MIN_FEE}])]:[];
  if(!activities.some(a=>a.id===selectedActivity))selectedActivity=activities[0]?.id||null;
  const activity=activities.find(a=>a.id===selectedActivity),artist=o?candidates.find(c=>c.id===o.actorId):selected,fee=o?.fee??activity?.fee??0;
  // Observe displayed/decision fields, never route progress or background clocks.
  const key=JSON.stringify([o&&[o.id,o.actorId,o.activity,o.fee,o.stage,o.payment,o.roomId],s.label,s.returning,s.lastReply&&[s.lastReply.actorId,s.lastReply.name,s.lastReply.reply,s.lastReply.roomUnavailable,s.lastReply.willing],(s.rooms||[]).map(r=>[r.id,r.name,r.claim?.status,!!r.physicallyOccupied]),candidates.map(c=>[c.id,c.name,c.ageYears,c.gender,c.specialty,c.preference,c.available,c.status,c.activities.map(a=>[a.id,a.name,a.fee])]),s.cash,s.paymentError,atReception,selectedArtist,selectedActivity]);
  refreshOverlay({active:!!o,label:s.label,fade:s.fade});
  if(!force&&signature===key)return;signature=key;
  if(!panel)panel=makePanel();const p=panel,focused=doc.activeElement?.getAttribute?.('data-cn-salon-focus');
  const scrolls=[dialog,p.body,p.cast,p.detail].map(node=>[node,node.scrollTop,node.scrollLeft]);let structural=false;
  const mode=o?'session':'pick';if(p.mode!==mode){buildContents(mode);structural=true;}
  text(p.cash,`18+ · 随身 ${s.cash} 铜文`);text(p.note,o?'收起保留安排':'引见免费 · 付费不替代本人意愿');
  if(!o){
   structural=syncList(p.cards,p.artists,candidates,c=>{const node=button(null,()=>{selectedArtist=c.id;selectedActivity=null;refresh(true);});node.className='cn-salon-card';node.setAttribute('data-cn-salon-focus','artist-'+c.id);const name=el('strong'),age=el('small'),status=el('span');node.append(name,age,status);return {node,name,age,status};},(row,c)=>{pressed(row.node,c.id===selectedArtist);row.node.setAttribute('aria-label',`${c.name} · ${c.ageYears}岁 · ${c.specialty||'诗词'} · ${c.available?'可引见':c.status||'歇场中'}`);text(row.name,c.name);text(row.age,`${c.gender||'成年艺者'} · ${c.ageYears}岁`);text(row.status,`${c.specialty||'诗词'} · ${c.available?'可引见':c.status||'歇场中'}`);row.node.disabled=!(c.ageYears>=18);})||structural;
   p.empty.hidden=p.adults.hidden=!!candidates.length;text(p.kicker,'当前选择');text(p.title,selected?.name||'暂无可引见的艺者');
   structural=syncList(p.choices,p.activities,activities,a=>{const node=button(null,()=>{selectedActivity=a.id;refresh(true);});node.setAttribute('data-cn-salon-focus','activity-'+a.id);const name=el('span'),price=el('span');node.append(name,price);return {node,name,price};},(row,a)=>{text(row.name,a.name);text(row.price,`${a.fee} 铜文`);pressed(row.node,selectedActivity===a.id);})||structural;
   optional(p.preference,selected?.preference);optional(p.reply,s.lastReply?`${s.lastReply.name}：${s.lastReply.reply}${s.lastReply.roomUnavailable?' 温晚：眼下没有空房。':''}${s.lastReply.willing===false?'（未收费）':''}`:'');optional(p.returning,s.returning?s.label||'艺者正回雅集厅，稍后可再引见。':'');
   if(!atReception)text(p.note,'请到三层公共梯厅东侧接待案前');else if(selected&&!selected.available)text(p.note,selected.status||'艺者正在歇场或已有安排');
  }else{
   text(p.currentKicker,o.payment==='unpaid'?'引见与答复':'本次安排');text(p.currentTitle,`${artist?.name||s.lastReply?.name||'艺者'} · ${SALON_ACTIVITIES[o.activity]?.name||'茶叙'}`);text(p.progress,s.label);
   optional(p.sessionReply,s.lastReply?.actorId===o.actorId?s.lastReply.reply:'');optional(p.roomNote,o.roomId?`${s.rooms.find(r=>r.id===o.roomId)?.name||'雅间'} · ${['fade','visiting'].includes(o.stage)?'已到房':'已留房，等客人到房'}`:'');text(p.kicker,'本次价目');text(p.title,SALON_ACTIVITIES[o.activity]?.name||'茶叙');
  }
  optional(p.balance,o?.stage==='accepted'&&s.cash<fee?`余额不足 · 还差 ${fee-s.cash} 文，尚未扣款`:'');text(p.fee,fee);text(p.payment,`铜文 · ${o?.payment==='settled'?'已结清':o?.payment==='reserved'?'已预留':'答应后确认预留'}`);text(p.terms,o?.payment==='settled'?'茶叙已完成，告辞不退款。':'到房茶叙完成才结账，此前取消全退。');optional(p.consent,o?'付费不替代本人意愿。':'');
  structural=syncList(p.roomList,p.rooms,s.rooms||[],()=>({node:el('span')}),(row,r)=>text(row.node,`${r.name} · ${r.claim?(r.claim.status==='occupied'?'茶叙中':'已留房'):r.physicallyOccupied?'有人暂歇':'空闲'}`))||structural;
  optional(p.error,s.paymentError?'铜钱退款或账目待核对，暂缓新引见。':'');p.retry.hidden=!s.paymentError;
  // A changed action gets a new control; detached/stale controls cannot submit.
  const actionKey=JSON.stringify(o?[o.id,o.stage,o.payment,fee]:[selectedArtist,selectedActivity,fee]);
  if(p.actionKey!==actionKey){
   p.actionButtons.forEach(node=>node.remove());p.actionButtons=[];p.actionKey=actionKey;
   const action=(label,fn,primary=false,key='primary')=>{const node=button(label,fn,primary);node.setAttribute('data-cn-salon-focus',key);p.actions.append(node);p.actionButtons.push(node);return node;};
   if(!o){const id=selectedArtist,activityId=selectedActivity;p.primary=action('',()=>{const now=service.view(),candidate=now.candidates?.find(c=>c.id===id),currentActivity=candidate?.activities.find(a=>a.id===activityId)||(activityId==='banquet'?{...SALON_ACTIVITIES.banquet,fee:candidate?.quoteFee??candidate?.activities[0]?.fee??SALON_MIN_FEE}:null);if(now.session||!service.atReception()||!candidate?.available||!(candidate.ageYears>=18)||now.paymentError||currentActivity?.fee!==fee){refresh(true);return;}if(service.request(id,activityId,fee))close();else refresh(true);},true,'invite');}
   else{const sameSession=()=>{const current=service.view().session;return current?.id===o.id&&current.stage===o.stage&&current.payment===o.payment&&current.fee===o.fee;};
    if(o.stage==='accepted')p.primary=action(`确认预留 ${fee}文 · 随艺者下楼`,()=>{if(sameSession()&&service.startEscort())close();else refresh(true);},true);
    else if(o.stage==='visiting')p.primary=action('告辞离席',()=>{if(sameSession()&&service.cancel())close();else refresh(true);},true);
    else if(['escort','entering'].includes(o.stage))p.primary=action(o.stage==='escort'?'收起 · 随艺者下楼':'收起 · 等候入房',close,true);
    else p.primary=action(o.stage==='fade'?'茶叙进行中':'等待本人答复',()=>{},true);
    if(o.stage!=='visiting')action(o.payment==='reserved'?'取消并全额退款':'取消这次引见',()=>{if(sameSession()&&service.cancel())close();else refresh(true);},false,'cancel');
   }structural=true;
  }
  if(!o){text(p.primary,selected?`请引见${selected.name}`:'暂无可引见的艺者');p.primary.disabled=!atReception||!selected?.available||!(selected?.ageYears>=18)||!activity||!!s.paymentError;}
  else p.primary.disabled=o.stage==='accepted'?s.cash<fee||!!s.paymentError||!atReception:!['visiting','escort','entering'].includes(o.stage);
  // Only a genuine structure change needs restoration. Routine status/price/
  // availability updates leave focused cards and active scroll gestures alone.
  if(structural){if(focused&&!dialog.contains(doc.activeElement)){const controls=Array.from(dialog.querySelectorAll('[data-cn-salon-focus]')),target=controls.find(node=>node.getAttribute('data-cn-salon-focus')===focused)||controls.find(node=>node.getAttribute('data-cn-salon-focus')==='artist-'+selectedArtist)||controls.find(node=>node.getAttribute('data-cn-salon-focus')==='close');target?.focus({preventScroll:true});}for(const [node,top,left]of scrolls){if(node.scrollTop!==top)node.scrollTop=top;if(node.scrollLeft!==left)node.scrollLeft=left;}}
 }
 function open(){if(disposed||(!nearFloor()&&!service.active()))return false;if(dialog.open){refresh();return true;}if(!service.active())service.recoverPayments();onOpen();panel=null;signature='';refresh(true);dialog.showModal();return true;}
 badge.onclick=open;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {open,close,isOpen:()=>!!dialog.open,openStation:id=>id===SALON_RECEPTION?open():false,update:()=>{if(!disposed)refresh();},dispose(){disposed=true;close();badge.remove();dialog.remove();fade.remove();style.remove();}};
}
