import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {PLAYER_CONVERSATION_TOPICS} from './player-conversation-ledger.js';
import {conversationTopicLabel} from './npc-social.js';

// A menu chooses a topic. It closes before the real shared-world conversation
// starts; opening or reading it never holds an employee or runs a countdown.
export function createPlayerConversationUI({getSocial,getCountry,onOpen=()=>{},onClose=()=>{},document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const el=doc.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
 const dialog=make('dialog',null,'player-conversation-dialog ww-airy-theme ww-airy-panel'),style=make('style');
 dialog.id='player-conversation-dialog';dialog.setAttribute('aria-label','选择交谈话题');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`.player-conversation-dialog{width:min(380px,calc(100vw - 28px));box-sizing:border-box;border:1px solid #e1eee2;border-radius:8px;background:#f4f8ef;color:#416570;padding:20px;font-family:inherit;box-shadow:0 14px 42px #294a4024}.player-conversation-dialog::backdrop{background:#163e4038;backdrop-filter:blur(2px)}.player-conversation-dialog p{font-size:12px;line-height:1.6}.player-conversation-dialog button{font-family:inherit;min-height:44px;cursor:pointer}.player-conversation-topics{display:grid;gap:8px}.player-conversation-topic{border:0;border-left:2px solid #acd6c8;background:#e2eee76b;padding:10px 12px;text-align:left;color:#466c75}.player-conversation-close{border:0;background:transparent;color:#829996}.player-conversation-dialog h2{font-size:19px}`;
 (doc.head||doc.body).append(style);doc.body.append(dialog);let actorId=null,generation=0;
 function close({keep=false}={}){generation++;actorId=null;if(dialog.open){dialog.close();if(!keep)getSocial()?.end('menu-closed');onClose();}}
 function open(actor){const social=getSocial(),s=social?.begin(actor);if(!s)return false;if(s.stage!=='choosing')return false;
  onOpen();actorId=s.id;const token=++generation,parts=createAiryPanelParts(doc),topics=make('div',null,'player-conversation-topics');
  parts.header.append(make('h2',s.name),make('p','聊一会儿'));parts.body.append(make('p',s.reply));
  const fresh=()=>dialog.open&&generation===token&&getSocial()?.state()?.id===actorId;
  if(social.pending()){const retry=make('button','补记刚才的交谈','player-conversation-topic');retry.onclick=()=>{if(!fresh())return;close({keep:true});social.end();social.retry();};topics.append(retry);}
  else for(const topic of PLAYER_CONVERSATION_TOPICS){const b=make('button',conversationTopicLabel(topic.id,getCountry()),'player-conversation-topic');b.type='button';b.setAttribute('data-conversation-topic',topic.id);b.onclick=()=>{if(!fresh())return;close({keep:true});social.choose(topic.id);};topics.append(b);}
  parts.body.append(topics);const cancel=make('button','改日再聊','player-conversation-close');cancel.type='button';cancel.onclick=()=>close();parts.actions.append(cancel);dialog.replaceChildren(parts.header,parts.body,parts.actions);dialog.showModal();return true;
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 return {open,close,isOpen:()=>!!dialog.open,update(){if(dialog.open&&(getSocial()?.state()?.id!==actorId||getSocial()?.state()?.stage!=='choosing'))close();},dispose(){close();dialog.remove();style.remove();}};
}
