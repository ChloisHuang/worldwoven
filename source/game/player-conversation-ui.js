import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {PLAYER_CONVERSATION_TOPICS} from './player-conversation-ledger.js';
import {conversationTopicLabel} from './npc-social.js';

// A menu chooses a topic. It closes before the real shared-world conversation
// starts. A walking greeting may briefly hold an interruptible routine; menu
// time never counts toward the conversation or its rewards.
export function createPlayerConversationUI({getSocial,getCountry,onOpen=()=>{},onClose=()=>{},document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const el=doc.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
 const dialog=make('dialog',null,'player-conversation-dialog ww-airy-theme ww-airy-panel'),style=make('style');
 dialog.id='player-conversation-dialog';dialog.setAttribute('aria-label','选择交谈话题');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.player-conversation-dialog{width:min(380px,calc(100vw - 28px));box-sizing:border-box;height:fit-content;border:0;border-radius:0;background:#f4f8ef;color:#416570;padding:16px;font-family:inherit;box-shadow:none}
.player-conversation-dialog::backdrop{background:#163e4038;backdrop-filter:blur(2px)}
.player-conversation-dialog .ww-airy-panel-heading{display:flex;align-items:baseline;gap:12px;padding-right:0;margin-bottom:10px}
.player-conversation-dialog .ww-airy-panel-heading h2{font-size:19px;line-height:1.3;margin:0}
.player-conversation-dialog .ww-airy-panel-heading p{margin:0;font-size:11px;white-space:nowrap}
.player-conversation-dialog .player-conversation-memory{font-size:12px;line-height:1.5;margin:0 0 12px}
.player-conversation-dialog button{font-family:inherit;min-height:44px;cursor:pointer}
.player-conversation-topics{display:flex;flex-direction:column;gap:8px}
.player-conversation-dialog.ww-airy-theme .player-conversation-topic{width:100%;min-width:0;font-size:13px;font-weight:500;line-height:1.4;padding:10px 12px;text-align:center}
.player-conversation-close{border:0;border-radius:0;background:transparent;color:#6b858c;font-size:12px}
@media(min-width:600px) and (max-height:500px){
 .player-conversation-dialog{width:min(560px,calc(100vw - 28px));padding:12px 16px}
 .player-conversation-dialog .ww-airy-panel-heading{margin-bottom:6px}
 .player-conversation-dialog .player-conversation-memory{margin-bottom:10px}
 .player-conversation-topics{flex-direction:row}
 .player-conversation-dialog.ww-airy-theme .player-conversation-topic{flex:1 1 0;width:0}
 .player-conversation-dialog .ww-airy-panel-actions{margin-top:6px}
}
`;

 (doc.head||doc.body).append(style);doc.body.append(dialog);let actorId=null,generation=0;
 function close({keep=false}={}){generation++;actorId=null;if(dialog.open){dialog.close();if(!keep)getSocial()?.end('menu-closed');onClose();}}
 function open(actor){const social=getSocial(),s=social?.begin(actor);if(!s)return false;if(s.stage!=='choosing')return false;
  onOpen();actorId=s.id;const token=++generation,parts=createAiryPanelParts(doc),topics=make('div',null,'player-conversation-topics');
  parts.header.append(make('h2',s.name),make('p','聊一会儿'));parts.body.append(make('p',s.reply,'player-conversation-memory'));
  const fresh=()=>dialog.open&&generation===token&&getSocial()?.state()?.id===actorId;
  if(social.pending()){const retry=make('button','补记刚才的交谈','player-conversation-topic ww-airy-action');retry.onclick=()=>{if(!fresh())return;close({keep:true});social.end();social.retry();};topics.append(retry);}
  else for(const topic of PLAYER_CONVERSATION_TOPICS){const b=make('button',conversationTopicLabel(topic.id,getCountry()),'player-conversation-topic ww-airy-action');b.type='button';b.setAttribute('data-conversation-topic',topic.id);b.onclick=()=>{if(!fresh())return;close({keep:true});social.choose(topic.id);};topics.append(b);}
  parts.body.append(topics);const cancel=make('button','改日再聊','player-conversation-close');cancel.type='button';cancel.onclick=()=>close();parts.actions.append(cancel);dialog.replaceChildren(parts.header,parts.body,parts.actions);dialog.showModal();return true;
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 return {open,close,isOpen:()=>!!dialog.open,update(){if(dialog.open&&(getSocial()?.state()?.id!==actorId||getSocial()?.state()?.stage!=='choosing'))close();},dispose(){close();dialog.remove();style.remove();}};
}
