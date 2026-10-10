import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {PLAYER_CONVERSATION_TOPICS} from './player-conversation-ledger.js';
import {conversationTopicLabel} from './npc-social.js';

// Presentation only: every choice still comes from social.topics(). Grouping
// never unlocks an action, predicts a reply or grants relationship/consent.
const TOPIC_GROUPS=[
 {id:'everyday',label:'聊聊近况',note:'工作、兴趣与歇息',ids:['work','art','rest']},
 {id:'care',label:'商量与关照',note:'实际经历与眼前的事',ids:['support-request','reconsider-support','trade-advice','health-concern']},
 {id:'connection',label:'彼此的心意',note:'回忆、感谢与表达',ids:['gratitude','shared-memory','confide','express-interest','respond-interest','flirt']},
 {id:'boundaries',label:'把话说清楚',note:'分歧、道歉与界限',ids:['respectful-disagreement','apology','argument','boundary']},
 {id:'company',label:'相约与陪伴',note:'先询问对方的意愿',ids:['public-invitation','quiet-company','private-company']},
];
const TOPIC_NOTES={
 'support-request':'询问立场，不代表对方一定支持',
 'reconsider-support':'重新交流已有的立场',
 'trade-advice':'交流双方已有的实作经历',
 'health-concern':'说说眼下真实的不适',
 'shared-memory':'谈起你们已经发生的相处',
 apology:'回应之前真实发生的事',
 argument:'继续谈之前尚未说清的事',
 boundary:'说明自己希望怎样相处',
 'public-invitation':'相约前往公共会面处',
 'quiet-company':'一起到公共会面处安静相伴',
 'private-company':'双方当次愿意，再前往获准使用的私室',
};

// A menu chooses a topic. It closes before the real shared-world conversation
// starts. A walking greeting may briefly hold an interruptible routine; menu
// time never counts toward the conversation or its rewards.
export function createPlayerConversationUI({getSocial,getCountry,onReset=null,onOpen=()=>{},onClose=()=>{},document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const el=doc.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
 const dialog=make('dialog',null,'player-conversation-dialog ww-airy-theme ww-airy-panel'),style=make('style');
 dialog.id='player-conversation-dialog';dialog.setAttribute('aria-label','选择交谈话题');dialog.setAttribute('aria-labelledby','player-conversation-name');dialog.setAttribute('aria-describedby','player-conversation-reply');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.player-conversation-dialog{width:min(840px,calc(100vw - 28px));max-width:none;box-sizing:border-box;height:fit-content;border:0;border-radius:0;background:#f4f8ef;color:#416570;padding:18px;font-family:inherit;box-shadow:none;max-height:calc(100dvh - 28px)}
.player-conversation-dialog::backdrop{background:#163e4038;backdrop-filter:blur(2px)}
.player-conversation-dialog *{box-sizing:border-box}
.player-conversation-dialog .ww-airy-panel-heading{display:flex;align-items:baseline;flex-wrap:wrap;gap:5px 12px;padding-right:0;margin-bottom:14px}
.player-conversation-dialog .ww-airy-panel-heading h2{font-size:21px;line-height:1.3;margin:0}
.player-conversation-dialog .ww-airy-panel-heading p{margin:0;font-size:12px;line-height:1.5}
.player-conversation-dialog .player-conversation-stage{margin-left:auto;padding:2px 8px;background:#e1ede4;color:#486e73;white-space:nowrap}
.player-conversation-dialog .ww-airy-panel-body{display:grid;grid-template-columns:minmax(180px,.85fr) minmax(0,2fr);gap:20px;overflow:auto;max-height:65dvh;align-items:start}
.player-conversation-context{min-width:0;position:sticky;top:0;padding:12px 14px;border-left:2px solid #91bfb4;background:#eaf1e7}
.player-conversation-dialog .player-conversation-memory{font-size:14px;line-height:1.8;margin:0;overflow-wrap:anywhere}
.player-conversation-dialog .player-conversation-context-label{font-size:11px;line-height:1.4;color:#6b858c;margin:0 0 8px;letter-spacing:.1em}
.player-conversation-dialog button{font-family:inherit;min-height:44px;cursor:pointer;touch-action:manipulation}
.player-conversation-topics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 14px;min-width:0;align-items:start}
.player-conversation-group{min-width:0;display:grid;gap:6px}
.player-conversation-group:only-child{grid-column:1 / -1}
.player-conversation-group-heading{display:flex;align-items:center;gap:7px;margin-bottom:2px}
.player-conversation-group-heading::before{content:'';width:5px;height:5px;flex:0 0 5px;transform:rotate(45deg);background:#8daea0}
.player-conversation-group h3{font-size:13px;line-height:1.4;font-weight:600;margin:0;color:#3c626a}
.player-conversation-dialog .player-conversation-group-note{font-size:11px;line-height:1.4;margin:0 0 3px;color:#6b858c}
.player-conversation-group[data-conversation-group="invitation"],.player-conversation-group[data-conversation-group="consent"],.player-conversation-group[data-conversation-group="pending"]{grid-column:1 / -1}
.player-conversation-group[data-conversation-group="invitation"]{padding:10px;border:1px solid #c0d1b5;background:#f2f3df}
.player-conversation-dialog.ww-airy-theme .player-conversation-topic{display:flex;align-items:center;gap:8px;width:100%;min-width:0;font-size:13px;font-weight:500;line-height:1.5;padding:9px 12px;text-align:left;letter-spacing:0;white-space:normal;overflow-wrap:anywhere}
.player-conversation-topic-copy{display:block;min-width:0;flex:1}
.player-conversation-topic-label{display:block}
.player-conversation-topic-detail{display:block;font-size:11px;line-height:1.5;margin-top:3px;color:#456c72}
.player-conversation-topic-arrow{flex:0 0 8px;font-size:16px;color:#54837f}
.player-conversation-dialog .player-conversation-note{grid-column:1 / -1;font-size:12px;line-height:1.5;margin:0;color:#6b858c}
.player-conversation-dialog .player-conversation-consent{font-size:13px;line-height:1.7;margin:0 0 8px}
.player-conversation-dialog .ww-airy-panel-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:10px;border-top:1px solid #dbe5d6;padding-top:5px}
.player-conversation-dialog .ww-airy-panel-actions .player-conversation-close{width:auto;min-width:104px;border:0;border-radius:0;background:transparent;color:#56777d;font-size:12px;padding:8px 12px}
.player-conversation-dialog .ww-airy-panel-actions .player-conversation-reset{width:auto;min-width:72px;flex:0 0 auto;border:1px solid #a93436;border-radius:0;background:#b73739;color:#fff;font-size:13px;padding:8px 16px}
.player-conversation-dialog .player-conversation-reset:focus-visible{outline:3px solid #84272a;outline-offset:2px}
.player-conversation-dialog .player-conversation-reset:disabled{opacity:.6;cursor:wait}
.player-conversation-dialog .player-conversation-reset-result{color:#9a3437}
@media(min-width:681px){
 .player-conversation-group[data-conversation-group="everyday"]:only-child{grid-template-columns:repeat(3,minmax(0,1fr))}
 .player-conversation-group[data-conversation-group="everyday"]:only-child>.player-conversation-group-heading,.player-conversation-group[data-conversation-group="everyday"]:only-child>.player-conversation-group-note{grid-column:1 / -1}
}
@media(max-width:680px){
 .player-conversation-dialog{width:min(480px,calc(100vw - 24px));padding:14px}
 .player-conversation-dialog .ww-airy-panel-body{grid-template-columns:minmax(0,1fr);gap:14px;max-height:68dvh}
 .player-conversation-context{position:static;padding:10px 12px}
 .player-conversation-topics{grid-template-columns:minmax(0,1fr);gap:14px}
 .player-conversation-dialog .player-conversation-group-note{margin-bottom:1px}
}
@media(min-width:681px) and (max-height:500px){
 .player-conversation-dialog{padding:12px 16px}
 .player-conversation-dialog .ww-airy-panel-heading{margin-bottom:9px}
 .player-conversation-dialog .ww-airy-panel-body{grid-template-columns:minmax(170px,.85fr) minmax(0,2fr);gap:16px;max-height:calc(100dvh - 124px)}
 .player-conversation-context{padding:10px 12px}
 .player-conversation-dialog .player-conversation-memory{font-size:13px;line-height:1.7}
 .player-conversation-topics{gap:12px}
 .player-conversation-dialog .ww-airy-panel-actions{margin-top:6px;padding-top:3px}
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
   const state=social.state()||s,relationship=social.relationship?.()||{},parts=createAiryPanelParts(doc),topics=make('div',null,'player-conversation-topics'),context=make('div',null,'player-conversation-context');
   const name=make('h2',s.name);name.id='player-conversation-name';parts.header.append(name);
   if(actor?.station?.npcLabel)parts.header.append(make('p',actor.station.npcLabel));
   parts.header.append(make('p',stageLabels[relationship.stage]||'聊一会儿','player-conversation-stage'));
   // Runtime's reply includes the most recent real shared memory, when present.
   const reply=make('p',state.reply||s.reply,'player-conversation-memory');reply.id='player-conversation-reply';
   if(offer||consentTopic)reply.setAttribute('aria-live','polite');
   context.append(make('p',`${s.name}的话`,'player-conversation-context-label'),reply);parts.body.append(context,topics);
   function group(id,label,note){
    const section=make('section',null,'player-conversation-group'),heading=make('div',null,'player-conversation-group-heading'),title=make('h3',label);
    title.id=`player-conversation-group-${id}`;section.setAttribute('data-conversation-group',id);section.setAttribute('aria-labelledby',title.id);heading.append(title);section.append(heading);
    if(note)section.append(make('p',note,'player-conversation-group-note'));topics.append(section);return section;
   }
   const addChoice=(target,topic,label=topicLabel(topic),explicitConsent=false)=>{
    const b=make('button',null,'player-conversation-topic ww-airy-action'),copy=make('span',null,'player-conversation-topic-copy'),arrow=make('span','›','player-conversation-topic-arrow');b.type='button';b.setAttribute('data-conversation-topic',topic.id);
    copy.append(make('span',label,'player-conversation-topic-label'));
    if(!explicitConsent&&TOPIC_NOTES[topic.id])copy.append(make('span',TOPIC_NOTES[topic.id],'player-conversation-topic-detail'));
    arrow.setAttribute('aria-hidden','true');b.append(copy,arrow);
    if(explicitConsent)b.setAttribute('data-conversation-consent','current-occasion');
    b.onclick=()=>{
     if(!fresh())return;
     social.choose(topic.id,{initiator:sourceFor(topic),...(explicitConsent?{explicitConsent:true}:{})});
     if(!explicitConsent&&topic.private&&social.state()?.stage==='awaiting-consent'){render(topic);dialog.querySelector?.('[data-conversation-consent]')?.focus();return;}
     // Failed/refused requests are reported by the runtime, never retried as consent.
     close({keep:true});
    };target.append(b);
   };
   if(consentTopic){
    const section=group('consent','这一次，你愿意吗？');
    section.append(make('p',`你愿意现在与${s.name}私下亲近吗？这次确认只适用于此刻；你们双方都可以拒绝，也可以随时离开、撤回。`,'player-conversation-consent'));
    addChoice(section,consentTopic,'我愿意这次亲近',true);
   }else if(social.pending()){
    const section=group('pending','刚才的交谈','这次交谈尚未保存，可在这里补记。');
    const retry=make('button','补记刚才的交谈','player-conversation-topic ww-airy-action');retry.type='button';retry.onclick=()=>{if(!fresh())return;close({keep:true});social.end();social.retry();};section.append(retry);
   }else{
    const available=options()||[],offered=available.find(topic=>topic.id===offer);
    if(offered)addChoice(group('invitation','对方的邀请','可以回应，也可以聊别的话题。'),offered,`回应邀请：${topicLabel(offered)}`);
    const remaining=available.filter(topic=>topic.id!==offer),grouped=new Set();
    for(const definition of TOPIC_GROUPS){
     const matches=remaining.filter(topic=>definition.ids.includes(topic.id));if(!matches.length)continue;
     const section=group(definition.id,definition.label,definition.note);
     for(const topic of matches){grouped.add(topic.id);addChoice(section,topic);}
    }
    // New runtime topics must stay reachable before receiving tailored copy.
    const other=remaining.filter(topic=>!grouped.has(topic.id));
    if(other.length){const section=group('other','还可以聊');for(const topic of other)addChoice(section,topic);}
   }
   if(!consentTopic&&relationship.privatePlaceAvailable===false&&relationship.stage==='affection')topics.append(make('p','附近没有双方都能使用的私密空间，暂时不能私下亲近。','player-conversation-note'));
   const cancel=make('button',consentTopic?'这次先不了':offer?'婉拒邀请':'改日再聊','player-conversation-close');cancel.type='button';cancel.onclick=()=>close();parts.actions.append(cancel);
   if(onReset){const reset=make('button','重置','player-conversation-reset');reset.type='button';reset.setAttribute('data-npc-reset',s.id);reset.setAttribute('aria-label',`重置${s.name}到本国安全位置`);
    reset.onclick=()=>{if(!fresh()||reset.disabled)return;reset.disabled=true;const result=onReset(actor);
     if(result?.ok){close();return;}
     reset.disabled=false;let message=topics.querySelector?.('.player-conversation-reset-result');if(!message){message=make('p',null,'player-conversation-note player-conversation-reset-result');message.setAttribute('role','status');topics.append(message);}message.textContent=result?.message||'现在还不能安全重置，请稍后再试。';
    };parts.actions.append(reset);
   }
   dialog.replaceChildren(parts.header,parts.body,parts.actions);
  }
  render();dialog.showModal();return true;
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 return {open,openInvitation:(actor,topic)=>open(actor,{offeredTopicId:typeof topic==='string'?topic:topic?.id,initiator:'npc'}),close,isOpen:()=>!!dialog.open,update(){if(dialog.open&&(getSocial()?.state()?.id!==actorId||!['choosing','awaiting-consent'].includes(getSocial()?.state()?.stage)))close();},dispose(){close();dialog.remove();style.remove();}};
}
