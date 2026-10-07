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
.player-conversation-topics{display:grid;grid-template-columns:1fr;gap:8px}
.player-conversation-dialog .ww-airy-panel-body{overflow:auto;max-height:52dvh}
.player-conversation-dialog .player-conversation-note{font-size:12px;line-height:1.5;margin:12px 0 0;color:#6b858c}
.player-conversation-dialog .player-conversation-consent{font-size:13px;line-height:1.6;margin:0 0 12px}
.player-conversation-dialog .ww-airy-panel-heading{flex-wrap:wrap;gap:4px 12px}
.player-conversation-dialog.ww-airy-theme .player-conversation-topic{width:100%;min-width:0;font-size:13px;font-weight:500;line-height:1.4;padding:10px 12px;text-align:center}
.player-conversation-close{border:0;border-radius:0;background:transparent;color:#6b858c;font-size:12px}
@media(min-width:600px) and (max-height:500px){
 .player-conversation-dialog{width:min(560px,calc(100vw - 28px));padding:12px 16px}
 .player-conversation-dialog .ww-airy-panel-heading{margin-bottom:6px}
 .player-conversation-dialog .player-conversation-memory{margin-bottom:10px}
 .player-conversation-topics{grid-template-columns:repeat(3,minmax(0,1fr))}
 .player-conversation-dialog.ww-airy-theme .player-conversation-topic{width:100%}
 .player-conversation-dialog .ww-airy-panel-actions{margin-top:6px}
}
`;

 (doc.head||doc.body).append(style);doc.body.append(dialog);let actorId=null,generation=0;
 function close({keep=false}={}){generation++;actorId=null;if(dialog.open){dialog.close();if(!keep)getSocial()?.end('menu-closed');onClose();}}
 const stageLabels={stranger:'初次相识',acquainted:'已经相识',familiar:'渐渐熟悉',trusted:'彼此信任',affection:'互有好感'};
 const baseIds=new Set(PLAYER_CONVERSATION_TOPICS.map(topic=>topic.id));
 const topicLabel=topic=>baseIds.has(topic.id)?conversationTopicLabel(topic.id,getCountry()):topic.label;
 function open(actor,{offeredTopicId=null,initiator='player'}={}){
  const social=getSocial(),current=social?.state();
  const s=offeredTopicId&&current?.offeredTopicId===offeredTopicId?current:social?.begin(actor,{offeredTopicId,initiator});
  if(!s||s.stage!=='choosing')return false;
  onOpen();actorId=s.id;const token=++generation;
  const fresh=()=>dialog.open&&generation===token&&getSocial()?.state()?.id===actorId;
  const offer=offeredTopicId||s.offeredTopicId;
  const sourceFor=topic=>offer?(topic.id===offer?'npc':'player'):initiator;
  const options=()=>typeof social.topics==='function'?social.topics():PLAYER_CONVERSATION_TOPICS;
  function render(consentTopic=null){
   const state=social.state()||s,relationship=social.relationship?.()||{},parts=createAiryPanelParts(doc),topics=make('div',null,'player-conversation-topics');
   parts.header.append(make('h2',s.name),make('p',stageLabels[relationship.stage]||'聊一会儿'));
   // Runtime's reply includes the most recent real shared memory, when present.
   parts.body.append(make('p',state.reply||s.reply,'player-conversation-memory'));
   const addChoice=(topic,label=topicLabel(topic),explicitConsent=false)=>{
    const b=make('button',label,'player-conversation-topic ww-airy-action');b.type='button';b.setAttribute('data-conversation-topic',topic.id);
    if(explicitConsent)b.setAttribute('data-conversation-consent','current-occasion');
    b.onclick=()=>{
     if(!fresh())return;
     social.choose(topic.id,{initiator:sourceFor(topic),...(explicitConsent?{explicitConsent:true}:{})});
     if(!explicitConsent&&topic.private&&social.state()?.stage==='awaiting-consent'){render(topic);dialog.querySelector?.('[data-conversation-consent]')?.focus();return;}
     // Failed/refused requests are reported by the runtime, never retried as consent.
     close({keep:true});
    };topics.append(b);
   };
   if(consentTopic){
    parts.body.append(make('p',`你愿意现在与${s.name}私下亲近吗？这次确认只适用于此刻；你们双方都可以拒绝，也可以随时离开、撤回。`,'player-conversation-consent'));
    addChoice(consentTopic,'我愿意这次亲近',true);
   }else if(social.pending()){
    const retry=make('button','补记刚才的交谈','player-conversation-topic ww-airy-action');retry.type='button';retry.onclick=()=>{if(!fresh())return;close({keep:true});social.end();social.retry();};topics.append(retry);
   }else{
    const available=options()||[],offered=available.find(topic=>topic.id===offer);
    if(offered){parts.body.firstChild?.setAttribute?.('aria-live','polite');addChoice(offered,`回应邀请：${topicLabel(offered)}`);}
    for(const topic of available)if(topic.id!==offer)addChoice(topic);
   }
   parts.body.append(topics);
   if(!consentTopic&&relationship.privatePlaceAvailable===false&&relationship.stage==='affection')parts.body.append(make('p','附近没有双方都能使用的私密空间，暂时不能私下亲近。','player-conversation-note'));
   const cancel=make('button',consentTopic?'这次先不了':offer?'婉拒邀请':'改日再聊','player-conversation-close');cancel.type='button';cancel.onclick=()=>close();parts.actions.append(cancel);
   dialog.replaceChildren(parts.header,parts.body,parts.actions);
  }
  render();dialog.showModal();return true;
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 return {open,openInvitation:(actor,topic)=>open(actor,{offeredTopicId:typeof topic==='string'?topic:topic?.id,initiator:'npc'}),close,isOpen:()=>!!dialog.open,update(){if(dialog.open&&(getSocial()?.state()?.id!==actorId||!['choosing','awaiting-consent'].includes(getSocial()?.state()?.stage)))close();},dispose(){close();dialog.remove();style.remove();}};
}
