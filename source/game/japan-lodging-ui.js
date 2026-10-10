import {AIRY_PANEL_STYLE,createAiryPanelParts,preserveAiryPanelView} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {japanStayTime} from './japan-lodging.js';
const ERRORS={'insufficient-cash':'随身日本券不足，请先到本地银行兑换或取款。','host-unavailable':'原接待正在办理浴牌、交班或休息，请稍后在柜台办理。','room-unavailable':'客房尚有人使用、预约或寝具仍在洗换，请等原被面换好。','counter-required':'请回到一层接待柜台前办理入住。','exit-blocked':'床边出口暂被挡住，请等能安全起身后退房。','stale-choice':'住宿状态已更新，请再确认。','save-failed':'记录没有保存。若房费已预留，可按原号继续登记或全额退款。'};
export function createJapanLodgingUI({service,onOpen=()=>{},onRoom=()=>{},onCounter=()=>{},document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 const dialog=make('dialog',null,'jp-stay-dialog ww-airy-theme ww-airy-panel'),style=make('style');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`.jp-stay-dialog.ww-airy-panel{width:min(540px,var(--ww-ui-width,calc(100vw - 24px)));max-height:var(--ww-ui-height,calc(100dvh - 24px));padding:20px;border:1px solid #d9caa9;border-radius:14px 4px;background:#f7f5e9;color:#405b62;font:14px/1.6 Georgia,"Songti SC",serif}.jp-stay-dialog::backdrop{background:#25444640}.jp-stay-dialog h2{font-size:21px;font-weight:500;margin:0 36px 6px 0}.jp-stay-dialog p{margin:7px 0}.jp-stay-dialog button{min-height:44px;font:inherit;cursor:pointer}.jp-stay-close{position:absolute;right:7px;top:5px;width:44px;border:0;background:transparent;color:#607a75;font-size:25px!important}.jp-stay-dialog footer{display:flex;gap:8px;flex-wrap:wrap}.jp-stay-dialog footer button{width:auto;flex:1;min-width:145px}.jp-stay-dialog button:disabled{opacity:.5;cursor:default}.jp-stay-note{font-size:12px;color:#6a8077}`;
 dialog.setAttribute('aria-label','汤馆客房 · 住宿登记');(doc.head||doc.body).append(style);doc.body.append(dialog);
 let disposed=false,generation=0,signature='';
 const key=v=>JSON.stringify(v);
 function close(){generation++;if(dialog.open)dialog.close();}
 function button(text,run,id,disabled=false){const b=make('button',text),token=generation;b.type='button';b.disabled=disabled;b.setAttribute('data-panel-key',id);b.onclick=()=>{if(disposed||!dialog.open||b.disabled||token!==generation)return;if(key(service.view())!==signature){render();return;}run();render();};return b;}
 function render(){if(disposed||!dialog.open)return;const v=service.view(),next=key(v);if(next===signature)return;signature=next;generation++;const restore=preserveAiryPanelView(dialog,doc);dialog.replaceChildren();const {header,body,actions}=createAiryPanelParts(doc),b=v.booking;
  const x=button('×',close,'close');x.className='jp-stay-close';x.setAttribute('aria-label','关闭住宿登记');header.append(make('h2','汤馆 · 三层唯一客房'),make('p','12日本券 / 连续24游戏小时'));
  body.append(make('p','从随身日本券付款。登记完成时开始计时；入住前取消全额退回，入住后提前退房不退费。','jp-stay-note'),make('p',`随身日本券：${v.cash??'暂不可核对'} 券`));
  if(v.loadError)body.append(make('p','原住宿或付款记录暂不可核对，已保留原档，不再扣款。'));
  else{
   if(v.lastError)body.append(make('p',ERRORS[v.lastError]||'本次办理未完成，原记录已保留，请稍后重试。'));
   if(b?.stage==='active'){
    body.append(make('p',`${b.id.replace('jp-room-stay-','')}号客房登记 · 已付12日本券`),make('p',`${japanStayTime(b.checkedInAt)}入住 → ${japanStayTime(b.endsAt)}退房`),make('p','由一层公共楼梯前往三层，穿过暖桌大厅，客房在后侧屏风内。'));
    actions.append(button('前往自己的客房',()=>{close();onRoom();},'room'),button('现在退房 · 房费不退',()=>service.checkout(v.revision),'checkout'));
   }else{
    body.append(make('p',b?'房费已按同号预留，入住还未生效。继续登记不会再扣一次。':v.roomReady?'原客房与被面已就绪。':'原客房尚在使用或被面洗换中，暂不接新的住宿。'));
    body.append(make('p',v.host?`${v.host.name}在原柜台，可当面登记。`:'原接待先办理浴牌与交班，请稍后再来。','jp-stay-note'));
    if(v.atCounter)actions.append(button(b?'继续同号入住登记':'确认支付12日本券并入住',()=>service.checkIn(v.revision),'check-in',!v.host||!v.roomReady||!b&&v.cash<12));
    else actions.append(button('回一层原接待柜台',()=>{close();onCounter();},'counter'));
    if(b)actions.append(button('取消入住 · 全退12日本券',()=>service.cancel(v.revision),'cancel'));
   }
   body.append(make('p','只有这一间客房收住宿费；其他公共休息座位保持原用途。用过的原被面沿原洗护与换回流程处理，不补造新寝具。','jp-stay-note'));
  }
  dialog.append(x,header,body,actions);restore();
 }
 function open(){if(disposed)return false;if(!dialog.open){onOpen();signature='';dialog.showModal();}render();return true;}
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});return {open,close,update:render,isOpen:()=>!!dialog.open,dispose(){if(disposed)return;close();disposed=true;dialog.remove();style.remove();}};
}
