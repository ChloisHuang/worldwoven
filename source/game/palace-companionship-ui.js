import {AIRY_PANEL_STYLE,createAiryPanelParts,preserveAiryPanelView} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
// The panel never grants rank or consent by opening/closing. Its buttons target
// the immutable invitation ID shown, so an old panel cannot answer a new summons.
export function createPalaceCompanionshipUI({getService,getEmperor,getName,onOpen=()=>{},notify=()=>{},document:doc=globalThis.document}){
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;},dialog=el('dialog'),style=el('style');dialog.id='palace-companionship-dialog';dialog.className='ww-airy-theme ww-airy-panel';dialog.setAttribute('aria-label','寝殿邀约');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+'#palace-companionship-dialog{width:min(400px,calc(100vw - 28px));padding:16px;border:0;color:#416570;background:#f4f8ef;font-family:inherit}#palace-companionship-dialog button{min-height:44px;padding:10px;font:inherit}#palace-companionship-dialog .ww-airy-panel-body{max-height:50dvh;overflow:auto;display:grid;gap:8px}';(doc.head||doc.body).append(style);doc.body.append(dialog);let shown=null,shownStage=null;
 const labels={requested:'已提请，等待皇帝本人回应',selected:'已选牌，准备传召',summoned:'正在传达邀约', 'awaiting-response':'等待本人答复',travelling:'双方自愿前往寝殿',together:'相伴片刻'};
 function close(){if(dialog.open)dialog.close();shown=null;}
 function render(){const restoreView=preserveAiryPanelView(dialog,doc);const service=getService(),event=service?.status(),parts=createAiryPanelParts(doc);shown=event?.id||null;shownStage=event?.stage||null;parts.header.append(el('h2','寝殿邀约'));
  const button=(label,action,key)=>{const b=el('button',label);b.className='ww-airy-action';b.setAttribute('data-palace-action',key);b.onclick=()=>{if((getService()?.status()?.id||null)!==shown){close();return;}close();const result=action();if(result?.ok===false)notify(({ 'night-required':'寝殿邀约在晚间19时至次日5时开放。','already-invited-tonight':'今晚已向这位提出过邀约，请尊重这次答复。','relationship-unavailable':'彼此尚未互表好感，先按双方心意慢慢相处。','actor-unavailable':'对方或你正有原来的事务、休息或急需，请稍后再说。'})[result.reason]||'此刻不适合这次邀约，请尊重对方与当晚安排。');};parts.body.append(b);};
  if(event){parts.body.append(el('p',`${getName(event.emperorId)} → ${getName(event.targetId)}：${labels[event.stage]||event.stage}`));
   if(event.participants.includes('player')){
    if(event.stage==='awaiting-response')button('我愿意这次相伴',()=>service.respond(event.id,'player',true),'accept');
    button(event.stage==='awaiting-response'?'这次先不了':'撤回这次邀约',()=>event.stage==='awaiting-response'?service.respond(event.id,'player',false):service.withdraw('player'),'decline');
   }
  }else{const last=service.history().findLast(e=>e.participants.includes('player'));if(last)parts.body.append(el('p',last.stage==='declined'?'上次邀约已婉拒，彼此仍可保留自己的选择。':last.stage==='cancelled'?'上次邀约已取消，没有继续占用寝殿。':'上次自愿相伴已结束，各自恢复原来的安排。'));parts.body.append(el('p','只有双方互有好感、成年且当晚空闲，才可自愿相约。名位与赏赐不代表同意。'));
   const emperor=getEmperor();if(emperor?.actorId==='player')for(const c of service.candidates('player')){const id=typeof c==='string'?c:c.actorId||c.id;button(`翻牌：${getName(id)}`,()=>service.select('player',id),'select:'+id);}
   else if(emperor)button('向皇帝提出今夜相伴的邀约',()=>service.request('player'),'request');
  }
  parts.body.append(el('p','入寝殿后只以淡出表示相伴。双方随时可拒绝或撤回；关闭此页不表示接受。'));const closeButton=el('button','先收起');closeButton.onclick=close;parts.actions.append(closeButton);dialog.replaceChildren(parts.header,parts.body,parts.actions);restoreView();
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {open(){onOpen();render();dialog.showModal();return true;},close,isOpen:()=>!!dialog.open,update(){if(dialog.open&&((getService()?.status()?.id||null)!==shown||(getService()?.status()?.stage||null)!==shownStage))render();},dispose(){close();dialog.remove();style.remove();}};
}
