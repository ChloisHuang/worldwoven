import {relationshipInteraction} from './relationship-interactions.js';
import {socialAttentionHash} from './social-attention.js';
// Small, transient social state. Identities and job ownership remain with each
// region's routine; a station coordinate is never an interaction target here.
const copy=x=>x==null?null:JSON.parse(JSON.stringify(x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
export const npcActorId=n=>n.actorId||n.station?.id;
const name=n=>n.station?.npcName||'邻居';
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function npcSocialReply(n,{busy=false,job=n.serviceTask?.label||n.station?.npcLabel||n.station?.action||'整理手边的事情'}={}){
 if(busy)return `你好！这会儿在${job}。等忙完这一步，我们再聊。`;
 if(npcActorId(n)?.startsWith('jp-visitor-'))return `你好，我是${name(n)}。来汤馆走走、歇歇脚，路上遇见你很高兴。`;
 const id=n.station?.id||'',verb=n.station?.npcAction||'';
 if(n.station?.royalRole==='consort'&&n.station.dialogue)return n.station.dialogue;
 if(id==='cn-archery'||id==='cn-range-warden')return '我和同伴轮流巡看宫门、正殿与射圃，回到射圃当面交班。若想习射，从后方入口去金线旁等候就好。';
 if(id==='jp-welcome')return '欢迎来到云隐汤馆！我在这里接待来访的客人，也会带大家找到去温泉的路。';
 if(/onsen/.test(id))return '你好！我会照看池边、补齐手巾。入汤前先洗净身体，池边慢慢走。';
 if(/sushi|cook|knead|bread|bake|ramen/.test(verb))return '你好！我在这里准备吃食。面团、米饭和火候都要慢慢照料，忙完也喜欢在庭园走走。';
 if(/calligraphy|paint|craft|art|flower/.test(verb))return '你好！我正做手边的作品。留一点空白、慢一点动手，就能看清材料自己的样子。';
 if(/garden/.test(verb))return '你好！我在照料这里的花草。路过时看看枝叶和水面，每次都能发现一点变化。';
 if(/tea/.test(verb))return '你好！我在这里照看茶席。茶香和窗外的景色都适合慢慢感受，很高兴和你聊两句。';
 return `你好，我是${name(n)}。平时在${n.station?.name||'这里'}忙碌，闲下来也喜欢看看周围的风景。`;
}
export function createNpcSocial({actors,player,visible=()=>true,status=()=>({}),beginInteraction=()=>null,onInteraction=()=>{},onMeetingEnded=()=>{},ledger=null,getCountry=()=>null,canAdvance=()=>true,onReply=()=>{},onStarted=()=>true,requireInteraction=false,getSocialFactors=null,getRelationshipMemory=()=>null,worldSeed=1,createJourney=null,onPrivateFade=()=>{},canInvite=()=>false,onInvitation=()=>false,isExternallyHeld=()=>false}){
 const attention=new Map();let conversation=null,meeting=null,menuHold=null,time=0,journey=null,nextInvitationAt=60,invitationRandom=socialAttentionHash(`invitation:${worldSeed}:${getCountry()}`)||1;
 // Each observer owns one opportunity clock. Adding candidates cannot create
 // extra action rolls; this player-facing layer has exactly one legal target.
 const freshAttention=n=>({inside:false,until:0,cooldown:0,random:socialAttentionHash(`passing-v1|${worldSeed}|${getCountry()}|${npcActorId(n)}`)||1,nextOpportunity:time,opportunities:0,attraction:0});
 const roll=a=>{a.random=(Math.imul(a.random,1664525)+1013904223)>>>0;return a.random/4294967296;};
 const present=n=>!!n&&actors().includes(n)&&n.root.visible!==false;
 function canInteract(n,radius=1.8){const p=player()?.root?.position,q=n?.root?.position;return !!(p&&q&&present(n)&&Math.abs(p.y-q.y)<.65&&gap(p,q)<=radius&&visible(n,p));}
 function releaseMenu(){if(!menuHold)return false;const held=menuHold;menuHold=null;if(meeting?.actor!==held.actor&&Number.isFinite(held.actor.breakAt))held.actor.breakAt+=time-held.started;return true;}
 function holdMenu(n){if(menuHold?.actor===n)return true;if(!canInteract(n,2.8)||!idle(n)||meeting&&meeting.actor!==n||conversation)return false;releaseMenu();menuHold={actor:n,id:npcActorId(n),started:time};n.walking=false;return true;}
 function menuState(){return menuHold?{id:menuHold.id,actor:menuHold.actor}:null;}
 function releaseMeeting(owner,reason='released'){if(!meeting||owner&&meeting.owner!==owner)return false;const held=meeting;meeting=null;if(Number.isFinite(held.actor.breakAt))held.actor.breakAt+=time-held.started;if(menuHold?.actor===held.actor)menuHold.started=time;onMeetingEnded({id:held.id,owner:held.owner},reason);return true;}
 function reserveMeeting(n,{owner,duration=75}={}){
  if(typeof owner!=='string'||!owner||!n||!actors().includes(n)||!idle(n)||conversation||menuHold&&menuHold.actor!==n)return false;
  if(meeting&&meeting.owner!==owner)return false;if(!meeting&&menuHold?.actor===n){if(Number.isFinite(n.breakAt))n.breakAt+=time-menuHold.started;menuHold.started=time;}releaseMeeting(owner);
  meeting={actor:n,id:npcActorId(n),owner,started:time,until:time+Math.max(5,Math.min(90,Number.isFinite(duration)?duration:75))};n.walking=false;return true;
 }
 function releasePause(c){if(!c?.paused)return;if(Number.isFinite(c.actor.breakAt))c.actor.breakAt+=time-(c.pauseStarted??c.started);c.paused=false;}
 function end(reason='cancelled'){releaseMenu();const released=releaseMeeting();journey?.cancel(reason);journey=null;onPrivateFade(false);if(!conversation)return released;const c=conversation;releasePause(c);conversation=null;if(c.eventId)ledger?.cancel(c.eventId,reason);return true;}
 // Only the routine owner may declare its moving actor safe to interrupt.
 const routineIdle=(n,ownMovement=false)=>{const info=status(n)||{};return !n.serviceMount&&!info.busy&&info.canPause!==false&&(!n.walking||info.canPause===true||ownMovement);};
 const idle=n=>!isExternallyHeld(n)&&routineIdle(n);
 function face(n){const p=player()?.root,q=n.root;if(p&&q){q.rotation.y=Math.atan2(p.position.x-q.position.x,p.position.z-q.position.z);if(p.rotation)p.rotation.y=Math.atan2(q.position.x-p.position.x,q.position.z-p.position.z);}}
 function remembered(n){const id=npcActorId(n),previous=ledger?.lastCompleted(id),service=getRelationshipMemory(id);return [previous?conversationMemoryReply(previous,getCountry()):null,typeof service==='string'?service:null].filter(Boolean).join(' ')||null;}
 function begin(n,{offeredTopicId=null,initiator='player'}={}){if(!canInteract(n,2.4))return null;end();const info=status(n)||{},busy=ledger?!idle(n):!!info.busy,hold=!!ledger&&!busy&&!!n.walking,reply=busy?npcSocialReply(n,{...info,busy:true}):remembered(n)||npcSocialReply(n,info);conversation={actor:n,id:npcActorId(n),reply,offeredTopicId,initiator,paused:!busy,stage:ledger&&!busy?'choosing':'greeting',started:time,pauseStarted:hold?time:null,chooseUntil:null,interaction:ledger&&!busy?null:beginInteraction(['player',npcActorId(n)]),duration:0};if(!busy){n.walking=false;face(n);}let a=attention.get(n);if(!a){a=freshAttention(n);a.inside=true;attention.set(n,a);}a.until=time+(busy?1.15:1.7);a.cooldown=time+9;return state();}
 function startContact(c,token){
  c.interaction=arguments.length>1?token:beginInteraction(['player',c.id]);c.stage='talking';c.duration=0;c.reply=conversationTopicReply(c.topicId,getCountry());face(c.actor);
  if(requireInteraction&&!c.interaction||onStarted()===false){end('start-save-failed');return false;}return true;
 }
 function choose(topicId,options={}){const c=conversation;if(!ledger||!c||!['choosing','awaiting-consent'].includes(c.stage))return {ok:false,reason:'unavailable'};if(!canInteract(c.actor,2.4)||!idle(c.actor)){onReply({...state(),reply:'我得先继续手边的事，待会儿再聊。'});end('unavailable');return {ok:false,reason:'unavailable'};}
  const spec=relationshipInteraction(topicId),confirming=c.stage==='awaiting-consent';
  if(confirming&&(topicId!==c.topicId||options.explicitConsent!==true))return {ok:false,reason:'consent-required'};
  const result=confirming?ledger.confirm(c.eventId):spec?.private?ledger.offer(c.id,topicId,options):ledger.start(c.id,topicId,options);
  if(!result.ok){c.reply=result.reason==='cooldown'?'刚才的话还记得，我们过会儿再聊。':'现在的情境不适合这次相处，我们改日再说。';onReply({...state(),reply:c.reply});end();return result;}
  const e=result.event;if(e.status==='declined'){c.reply='我现在想独处一会儿，改日再聊吧。';onReply({...state(),reply:c.reply});end();return result;}
  const moving=spec?.private||['public-invitation','quiet-company'].includes(topicId),directInteraction=e.status==='accepted'&&!moving?beginInteraction(['player',c.id]):null;
  c.eventId=e.id;c.topicId=e.topicId;c.total=e.duration;c.duration=e.elapsed||0;c.pauseStarted=c.paused?(c.pauseStarted??c.started):time;c.paused=true;c.started=time;c.chooseUntil=null;
  if(e.status==='offered'){c.stage='awaiting-consent';c.chooseUntil=null;c.reply='我此刻愿意。如果你也愿意，我们再一起前往；途中随时可以改变主意。';face(c.actor);onStarted();return {...result,stage:c.stage};}
  if(moving){journey=createJourney?.(e,c.actor)||null;if(!journey||journey.state()?.ok!==true){end('meeting-unavailable');return {ok:false,reason:'meeting-unavailable'};}c.stage='travelling';c.journey=true;c.reply=spec.private?'一起前往双方获准使用的私室；随时可取消。':'一起到约好的公共位置；随时可取消。';if(onStarted()===false){end('start-save-failed');return {ok:false,reason:'save-failed'};}}
  else if(!startContact(c,directInteraction))return {ok:false,reason:'start-save-failed'};
  onReply(state());return result;
 }
 function retry(){const result=ledger?.retryPending();if(result?.ok&&result.event){const n=actors().find(n=>npcActorId(n)===result.event.actorId);onReply({id:result.event.actorId,name:n?name(n):'邻居',reply:result.event.status==='completed'?conversationOutcomeReply(result.event,getCountry()):'刚才的交谈已结束。',stage:result.event.status});}return result;}
 function state(){return conversation?{id:conversation.id,name:name(conversation.actor),reply:conversation.reply,paused:conversation.paused,stage:conversation.stage,eventId:conversation.eventId,topicId:conversation.topicId,duration:conversation.duration,total:conversation.total,initiator:conversation.initiator,offeredTopicId:conversation.offeredTopicId}:null;}
 function update(dt){time+=dt;const people=actors(),p=player()?.root?.position;
  // An explicit approach borrows the existing social pause for a bounded time.
  // Summons/new service duties revoke it. A walking greeting has its own limit.
  if(menuHold&&(!canInteract(menuHold.actor,2.8)||!idle(menuHold.actor)))releaseMenu();
  if(meeting){const reason=!people.includes(meeting.actor)?'removed':!idle(meeting.actor)?'duty':time>=meeting.until?'expired':null;if(reason)releaseMeeting(undefined,reason);}
  // A pause is borrowed from the actor's current routine, not a permanent
  // entitlement. A summons or new service duty can make that routine busy
  // while a nearby player still has yesterday's idle reply open.
  if(conversation){const c=conversation,expired=['choosing','awaiting-consent'].includes(c.stage)&&c.chooseUntil!=null&&time>=c.chooseUntil,unavailable=(!c.journey&&!canInteract(c.actor,2.4))||!present(c.actor)||c.paused&&!idle(c.actor)||ledger&&c.stage==='choosing'&&!idle(c.actor);if(expired||unavailable){onReply({...state(),reply:expired?'我先继续走了，有空再聊。':status(c.actor)?.busy?npcSocialReply(c.actor,{...status(c.actor),busy:true}):'我先继续手边的事，待会儿再聊。'});end(expired?'greeting-expired':'unavailable');}else if(ledger){if(c.stage==='choosing'&&!c.paused&&c.actor.walking){c.paused=true;c.pauseStarted=time;c.chooseUntil=null;c.actor.walking=false;}if(c.paused&&c.stage!=='travelling')face(c.actor);}}
  if(ledger&&['talking','travelling'].includes(conversation?.stage)&&!canAdvance())end('interrupted');
  if(conversation?.journey){const progress=journey?.update(dt);if(!progress?.ok)end(progress?.reason||'meeting-lost');else if(progress.phase==='arrived'&&conversation.stage==='travelling'){const current=conversation;if(startContact(current))current.justArrived=true;}}
  onPrivateFade(conversation?.stage==='talking'&&relationshipInteraction(conversation.topicId)?.private===true);
  if(conversation&&(conversation.interaction||conversation.stage==='talking')){const spoken=conversation.justArrived?0:dt;delete conversation.justArrived;const duration=conversation.paused?Math.min(conversation.total??Infinity,conversation.duration+spoken):Math.min(1.15,conversation.duration+spoken);if(duration>conversation.duration){conversation.duration=duration;if(conversation.interaction)onInteraction({...conversation.interaction,duration});}}
  if(ledger&&conversation?.stage==='talking'){const c=conversation;ledger.progress(c.eventId,Math.min(c.total,c.duration));if(c.duration>=c.total){const result=ledger.complete(c.eventId,{elapsed:c.duration});releasePause(c);journey?.finish();journey=null;onPrivateFade(false);conversation=null;onReply({id:c.id,name:name(c.actor),stage:result.ok?'completed':'pending-completion',reply:result.ok?conversationOutcomeReply(result.event,getCountry()):'这次交谈尚未保存，稍后可补记。'});}}
  if(ledger&&conversation?.stage==='greeting'&&time-conversation.started>=1.15)end();
  if(time>=nextInvitationAt){const random=()=>{invitationRandom=(Math.imul(invitationRandom,1664525)+1013904223)>>>0;return invitationRandom/4294967296;};const actionRoll=random(),targetRoll=random(),topicRoll=random();nextInvitationAt=time+90+random()*30;
   if(actionRoll<.45&&!conversation&&!meeting&&ledger&&canInvite()){
    const pool=people.filter(n=>canInteract(n,2.4)&&idle(n)).sort((a,b)=>npcActorId(a).localeCompare(npcActorId(b)));
    const n=pool[Math.floor(targetRoll*pool.length)];if(n){const topics=ledger.topicsFor?.(npcActorId(n),{initiator:'npc'})||ledger.topics||[];const topic=topics[Math.floor(topicRoll*topics.length)];if(topic)onInvitation(n,topic);}
   }
  }
  for(const n of attention.keys())if(!people.includes(n))attention.delete(n);
  if(!p)return;for(const n of people){let a=attention.get(n);if(!a){a=freshAttention(n);attention.set(n,a);}const q=n.root.position,range=gap(p,q),bearing=angle(Math.atan2(p.x-q.x,p.z-q.z)-n.root.rotation.y),inside=n.root.visible!==false&&range<3.1&&Math.abs(p.y-q.y)<.65;
   // No omniscient look through walls or a backwards neck twist. A passer-by
   // gets one staggered acknowledgement, then the employee returns to work.
   if(getSocialFactors){
    // Only evaluate profiles/visibility at the saved decision opportunity, not
    // every frame. No catch-up burst after a large simulation step.
    if(time>=a.nextOpportunity){const actionRoll=roll(a);a.nextOpportunity=time+8+roll(a)*4;a.opportunities++;
     if(inside&&time>=a.cooldown&&Math.abs(bearing)<1.85&&status(n)?.attention!==false&&visible(n,p)){
      const factors=getSocialFactors(n,status(n)||{})||{};
      if(actionRoll<clamp(factors.attentionChance||0,0,1)){a.attraction=clamp(factors.attraction||0,0,1);a.until=time+1.05+a.attraction*.5;a.cooldown=a.nextOpportunity;}
     }
    }
   }else if(inside&&!a.inside&&time>=a.cooldown&&Math.abs(bearing)<1.85&&visible(n,p)){const offset=((n.phase||0)%1)*.3;a.until=time+1.25+offset;a.cooldown=time+8+offset;}
   if(!inside)a.until=Math.min(a.until,time);a.inside=inside&&Math.abs(bearing)<1.85;
  }
 }
 function look(n){const p=player()?.root?.position,a=attention.get(n);if(!p||!a||isExternallyHeld(n)||status(n)?.attention===false)return null;const talking=conversation?.actor===n&&conversation.paused,active=talking||a.until>time;if(!active)return null;const q=n.root.position;if(Math.abs(p.y-q.y)>=.65||gap(p,q)>3.2||!visible(n,p))return null;
  const yaw=angle(Math.atan2(p.x-q.x,p.z-q.z)-n.root.rotation.y);if(Math.abs(yaw)>1.85&&conversation?.actor!==n)return null;const pitch=-Math.atan2((p.y+1.6)-(q.y+(n.getPoseMetrics?.().headHeight||1.6)),Math.max(.6,gap(p,q)));return {yaw:clamp(yaw,-.68,.68),pitch:clamp(pitch,-.16,.16),weight:talking?.85:.72};
 }
 let nearbyActorIds=new Set();
 function targets(){if(conversation)return [{social:true,id:conversation.id,actor:conversation.actor,name:name(conversation.actor),action:conversation.reply}];const result=[],p=player()?.root.position;if(!p)return result;for(const n of actors()){const distance=gap(p,n.root.position);if(distance<(nearbyActorIds.has(npcActorId(n))?2.2:1.8)&&canInteract(n,2.2))result.push({social:true,id:npcActorId(n),actor:n,name:name(n),action:'打个招呼 · 聊聊天',distance});}nearbyActorIds=new Set(result.map(item=>item.id));return result.sort((a,b)=>a.distance-b.distance);}
 function target(){return targets()[0]||null;}
 return {snapshot:()=>({version:1,time,nextInvitationAt,invitationRandom,conversation:conversation?{...copy({...conversation,actor:undefined}),actorId:npcActorId(conversation.actor)}:null,attention:[...attention].map(([n,a])=>[npcActorId(n),{...a}])}),restore(s){if(s?.version!==1)return false;releaseMenu();releaseMeeting();time=Math.max(0,s.time||0);nextInvitationAt=Math.max(time+10,s.nextInvitationAt||time+60);invitationRandom=s.invitationRandom>>>0||invitationRandom;attention.clear();for(const[id,a]of s.attention||[]){const n=actors().find(n=>npcActorId(n)===id);if(n)attention.set(n,{...freshAttention(n),...a});}const n=actors().find(n=>npcActorId(n)===s.conversation?.actorId),old=s.conversation,event=old?.eventId?ledger?.event(old.eventId):null;conversation=n&&canInteract(n,2.4)&&(!ledger||old?.stage==='talking'&&!old.journey&&!relationshipInteraction(old.topicId)?.private&&old.paused===true&&event?.status==='accepted'&&event.actorId===old.actorId&&old.id===old.actorId&&Math.abs(old.duration-event.elapsed)<1e-6&&event.topicId===old.topicId&&event.duration===old.total&&(!requireInteraction||old.interaction?.participants?.includes('player')&&old.interaction?.participants?.includes(old.actorId))&&idle(n))?{...copy(old),...(event?{duration:event.elapsed,total:event.duration}:{}),actor:n}:null;if(!conversation&&n&&old?.paused&&Number.isFinite(n.breakAt))n.breakAt+=Math.max(0,time-(old.pauseStarted??old.started??time));if(ledger&&!conversation&&['accepted','offered'].includes(event?.status))ledger.cancel(event.id,'restore-unavailable');return true;},reconcile(){const event=ledger?.active();if(['accepted','offered'].includes(event?.status)&&event.id!==conversation?.eventId)ledger.cancel(event.id,'missing-scene');},update,begin,choose,retry,end,look,attentionState:n=>attention.has(n)?{...attention.get(n)}:null,target,targets,canInteract,holdMenu,releaseMenu,menuState,topics:()=>conversation?ledger?.topicsFor?.(conversation.id,{initiator:conversation.initiator})||ledger?.topics||[]:[],relationship:()=>conversation?ledger?.relationshipFor?.(conversation.id):null,routineAvailable:(n,{ownMovement=false,ignoreVisibility=false}={})=>(present(n)||(ignoreVisibility||ownMovement&&n.socialPrivateFade===true)&&actors().includes(n))&&routineIdle(n,ownMovement),canPause:n=>canInteract(n)&&idle(n),reserveMeeting,releaseMeeting,meetingState:()=>meeting?{id:meeting.id,owner:meeting.owner,remaining:Math.max(0,meeting.until-time)}:null,isPaused:n=>menuHold?.actor===n||conversation?.actor===n&&conversation.paused||meeting?.actor===n,conversationActorId:()=>conversation?.paused?conversation.id:menuHold?.id||meeting?.id||null,active:()=>!!conversation,state,pending:()=>!!ledger?.pending(),dispose(){end('left-region');attention.clear();}};
}

const TOPIC_WORDS={china:{work:'手边的差事',art:'庭园与书画',rest:'闲时歇息'},japan:{work:'汤馆日常',art:'庭景与手艺',rest:'茶休片刻'},france:{work:'日常工作',art:'花园与绘画',rest:'闲时歇息'},egypt:{work:'日常工作',art:'庭景与工艺',rest:'阴凉处歇息'}};
export function conversationTopicLabel(topic,country){if(relationshipInteraction(topic))return relationshipInteraction(topic).label;return (TOPIC_WORDS[country]||TOPIC_WORDS.china)[topic]||'近况';}
export function conversationTopicReply(topic,country){if(relationshipInteraction(topic))return `${relationshipInteraction(topic).label}，我会认真听，也保留自己的想法。`;return `说起${conversationTopicLabel(topic,country)}，我也有自己的想法。`;}
export function conversationMemoryReply(event,country){if(relationshipInteraction(event.topicId))return `上次${relationshipInteraction(event.topicId).label}的事，我记得。`;const subject=conversationTopicLabel(event.topicId,country),feeling=event.feeling||event.result?.feeling;return feeling==='appreciated'?`上次聊${subject}很投缘，我还记得你说的话。`:feeling==='mismatched'?`上次聊${subject}，我们的想法不太一样。我想保留自己的看法。`:`上次谈过${subject}，我记得。我的看法倒没怎么变。`;}
export function conversationOutcomeReply(event,country){if(event.result?.supportStance)return event.result.supportStance==='support'?'我愿意支持你目前的做法。但若伤害别人或失信，我也会重新考虑。':'我听完了，但现在还不能承诺支持你的做法。';if(event.topicId==='trade-advice')return '我们把亲手做过的事情仔细聊了一遍，也记住了彼此的经验。';if(event.topicId==='health-concern')return '我听见你说的不适了，先照顾好身体，等状态好些再忙。';if(relationshipInteraction(event.topicId))return event.result?.feeling==='mismatched'?'我们还没有完全想通彼此的看法，今天先到这里。':'这次相处我记下了。之后怎样相处，我们仍可各自决定。';const subject=conversationTopicLabel(event.topicId,country),feeling=event.feeling||event.result?.feeling;return feeling==='appreciated'?`谈起${subject}，我们想得很近。下次还想听你说说。`:feeling==='mismatched'?`说到${subject}，我们不太合拍。今天先聊到这里吧。`:`关于${subject}，我听明白了。不过我的看法没有变。`;}
