import {INN_COUNTER,innTimeLabel} from './china-tavern-lodging.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
export function createChinaTavernLodgingUI({service,getPlayer,onIntent,onRoom,onOpen=()=>{},canShow=()=>true,document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const dialog=make('dialog',null,'cn-inn-dialog ww-airy-theme ww-airy-panel'),badge=make('button','云来客栈 · 客房登记','cn-inn-ticket'),style=make('style');
 // Later panels reinsert the shared button width/font rules. Keep this footer
 // scoped so its secondary action cannot claim 100% and crush the primary.
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.cn-inn-dialog.ww-airy-panel{position:fixed;inset:0;margin:auto;width:min(680px,var(--ww-ui-width,calc(100vw - 24px)));height:min(330px,var(--ww-ui-height,calc(100dvh - 24px)));padding:18px 20px 12px;border:1px solid #d4e5dc;border-radius:20px 7px 20px 7px;background:linear-gradient(115deg,#f9f8ee,#eef6ee 72%,#eff2f8);color:#355e68;font-family:Georgia,"Songti SC",serif;box-shadow:0 14px 42px #274b6426}.cn-inn-dialog::backdrop{background:#173b493d;backdrop-filter:blur(3px)}.cn-inn-dialog *{box-sizing:border-box}.cn-inn-dialog h2{font-size:21px;letter-spacing:.08em}.cn-inn-dialog h3{font-size:20px;font-weight:500;margin:0 0 8px}.cn-inn-dialog p{font-size:12px;line-height:1.5;margin:5px 0}.cn-inn-dialog button{min-height:44px;font-family:inherit;cursor:pointer;box-shadow:none}.cn-inn-dialog button:disabled{opacity:.45;cursor:default}.cn-inn-close{position:absolute;right:8px;top:7px;width:44px;border:0;background:transparent;color:#7b999b;font-size:26px}.cn-inn-content{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:18px;min-width:0;min-height:0}.cn-inn-content>section{min-width:0}.cn-inn-rooms{display:grid;align-content:start;gap:8px}.cn-inn-rooms button{padding:10px 14px;text-align:left;border:0;border-left:2px solid transparent;border-radius:3px;background:#ffffff70;color:#61848a;font-size:14px}.cn-inn-rooms button[aria-pressed=true]{border-left-color:#84bdb0;background:#dceee4;color:#305f66}.cn-inn-rooms span{display:block;font-size:11px;margin-top:3px}.cn-inn-detail{padding:10px 14px;border:1px solid #dfebe2;border-radius:10px 3px 13px 3px;background:#fffefa80}.cn-inn-price{font-size:29px;color:#5b7b94}.cn-inn-note{color:#819698}.cn-inn-error{color:#a36962}.cn-inn-actions{display:flex;align-items:center;gap:8px;border-top:1px solid #d5e5dc;padding-top:7px}.cn-inn-dialog .cn-inn-actions>button{width:auto;min-width:44px;flex:0 0 auto;white-space:nowrap}.cn-inn-actions button{border:0;border-radius:0;padding:8px 10px;background:transparent;color:#6f898c;font-size:12px}.cn-inn-dialog .cn-inn-actions>.ww-airy-action{flex:1 1 0;min-width:0;font-size:14px;padding:8px 14px}.cn-inn-ticket{position:fixed;left:max(18px,env(safe-area-inset-left));top:256px;z-index:18;min-height:44px;padding:9px 13px;border-radius:3px;background:#eaf0f6;color:#567183;font-size:12px;box-shadow:0 3px 12px #173b3315}
@media(max-height:500px){.cn-inn-dialog.ww-airy-panel{padding:12px 18px 10px}.cn-inn-dialog h2{font-size:18px}.cn-inn-dialog h3{font-size:17px}.cn-inn-detail{padding:8px 13px}.cn-inn-ticket{top:208px;font-size:10px}.cn-inn-rooms{gap:6px}.cn-inn-rooms button{padding:7px 12px}}
@media(max-width:520px){.cn-inn-dialog.ww-airy-panel{height:min(480px,var(--ww-ui-height,calc(100dvh - 24px)))}.cn-inn-content{display:block}.cn-inn-rooms{grid-template-columns:1fr 1fr;margin-bottom:10px}.cn-inn-actions{flex-wrap:wrap}.cn-inn-dialog .cn-inn-actions>.ww-airy-action{flex-basis:100%}}
`;
 dialog.setAttribute('aria-label','云来客栈入住与退房');badge.type='button';doc.body.append(dialog,badge);(doc.head||doc.body).append(style);
 let menuState={bookingId:null,inRoom:false},generation=0,selection=null,signature='',disposed=false,error='';
 const errors={'insufficient-cash':'随身铜文不足，可先到钱庄取款','save-failed':'这笔尚未保存，请重试；钱和房间均按原记录保留','stale-choice':'房间状态已变化，请重新选择','room-unavailable':'这间房刚有安排，请另选空房','counter-required':'请到一层许安的柜台前登记','host-post-unavailable':'掌柜岗位由你独任，许安目前不代办入住','exit-blocked':'床边出口有人，请稍等再退房'};
 const close=()=>{generation++;if(dialog.open)dialog.close();};
 function button(text,fn,primary=false){const g=generation,b=make('button',text,primary?'ww-airy-action':'');b.type='button';b.onclick=()=>{if(!disposed&&dialog.open&&g===generation&&!b.disabled)fn();};return b;}
 function result(r){error=r.ok?'':errors[r.code]||'记录暂时无法核对，请稍后重试';refresh(true);}
 function intent(){return disposed?null:{id:'cn-tavern-lodging',provider:'china-tavern-lodging',kind:'view',name:'云来二层客栈',npcName:'许安',action:'查看客房 · 入住与退房',position:INN_COUNTER.slice(),executionRadius:.9,interactionRadius:2.5,priority:44,intentKey:'yunlai-inn-counter'};}
 const resolveIntent=old=>old?.provider==='china-tavern-lodging'&&old.id===intent()?.id&&old.intentKey===intent()?.intentKey?intent():null;
 function open(){if(disposed||!service.atCounter()&&!service.view().booking)return false;onOpen();error='';refresh(true);if(!dialog.open)dialog.showModal();refresh(true);return true;}
 function refresh(force=false){
  const s=service.view(),b=s.booking,p=getPlayer()?.root.position,near=p&&Math.abs(p.y-.215)<.4&&Math.hypot(p.x-INN_COUNTER[0],p.z-INN_COUNTER[2])<2.3,inRoom=p&&b&&Math.abs(p.y-4.015)<.45&&p.x>16&&p.x<26&&p.z>15.2&&p.z<21;
  menuState={bookingId:b?.id||null,roomId:b?.roomId||null,stage:b?.stage||null,inRoom:!!inRoom};
  badge.hidden=!canShow()||!near&&!inRoom;badge.textContent=b?`云来客栈 · ${s.rooms.find(r=>r.id===b.roomId)?.name}住宿`:'云来客栈 · 客房登记';
  if(!dialog.open&&!force)return;const key=JSON.stringify([s,b,selection,error]);if(!force&&key===signature)return;signature=key;generation++;dialog.replaceChildren();
  if(!s.rooms.some(r=>r.id===selection&&r.available))selection=s.rooms.find(r=>r.available)?.id||s.rooms[0]?.id;
  const room=s.rooms.find(r=>r.id===(b?.roomId||selection)),x=button('×',close);x.className='cn-inn-close';x.setAttribute('aria-label','收起并保留住宿');
  const {header,body,actions}=createAiryPanelParts(doc);body.className+=' cn-inn-content';actions.className+=' cn-inn-actions';header.append(make('h2','云来客栈 · 宿簿'),make('p',`许安掌柜 · 随身 ${s.cash??'待核对'} 铜文`));
  const rooms=make('section',null,'cn-inn-rooms'),detail=make('section',null,'cn-inn-detail');
  for(const r of s.rooms){const status=r.guestId==='player'?'为你留房':r.guestId?'已有住客':r.dirty?'待打扫':r.available?'干净空房':'茶叙使用中',row=button(r.name,()=>{selection=r.id;error='';refresh(true);});row.append(make('span',`${r.price}文 · ${status}`));row.disabled=!!b||!r.available;row.setAttribute('aria-pressed',String(r.id===room?.id));rooms.append(row);}
  detail.append(make('h3',room?.name||'暂无空房'));const amount=make('div',null,'cn-inn-price');amount.append(make('strong',String(room?.price??12)),make('span',' 铜文 / 一日'));detail.append(amount);
  if(b?.stage==='active')detail.append(make('p',`已入住 · ${innTimeLabel(b.endsAt)}退房`));
  else if(b)detail.append(make('p','房费已预留 · 在案前等许安登记'));
  else detail.append(make('p','入住起24游戏小时 · 仅游玩时推进'),make('p','入住前取消全退；登记入住后，提前退房不退费。','cn-inn-note'));
  if(b)detail.append(make('p',b.stage==='active'?'房费已结清 · 提前退房不退费':'入住前取消全退；入住后提前退房不退费','cn-inn-note'));
  const warning=error||(!s.hostAvailable&&!b?'掌柜岗位目前由你独任，许安不代办入住':!b&&s.cash<room?.price?'随身铜文不足，可先到钱庄取款':!b&&!s.atCounter?'请到一层柜台前确认入住':'');if(warning)detail.append(make('p',warning,'cn-inn-error'));
  if(!b){const confirm=button(`确认留房 · ${room?.price??12}文`,()=>result(service.confirm(room.id,s.revision)),true);confirm.disabled=!room?.available||!s.atCounter||!s.hostAvailable||s.cash==null||s.cash<room.price||!!s.loadError;actions.append(confirm,button('暂不入住',close));}
  else if(b.stage==='waiting')actions.append(button('收起 · 等待登记',close,true),button('取消留房 · 全额退回',()=>result(service.cancel(s.revision))));
  else actions.append(button('前往自己的客房',()=>{close();onRoom(b.roomId);},true),button('退房 · 不退费',()=>result(service.checkout(s.revision))));
  body.append(rooms,detail);dialog.append(x,header,body,actions);
 }
 badge.onclick=()=>{if(badge.hidden)return;if(service.atCounter()||service.view().booking)open();else onIntent(intent());};dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {menuContext:()=>disposed?null:menuState,intent,resolveIntent,executeIntent:old=>!!resolveIntent(old)&&service.atCounter()&&open(),open,close,isOpen:()=>!!dialog.open,update:refresh,dispose(){disposed=true;close();dialog.remove();badge.remove();style.remove();}};
}
