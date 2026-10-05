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
export function createNpcSocial({actors,player,visible=()=>true,status=()=>({}),beginInteraction=()=>null,onInteraction=()=>{},onMeetingEnded=()=>{}}){
 const attention=new Map();let conversation=null,meeting=null,time=0;
 const present=n=>!!n&&actors().includes(n)&&n.root.visible!==false;
 function canInteract(n,radius=1.8){const p=player()?.root?.position,q=n?.root?.position;return !!(p&&q&&present(n)&&Math.abs(p.y-q.y)<.65&&gap(p,q)<=radius&&visible(n,p));}
 function releaseMeeting(owner,reason='released'){if(!meeting||owner&&meeting.owner!==owner)return false;const held=meeting;meeting=null;if(Number.isFinite(held.actor.breakAt))held.actor.breakAt+=time-held.started;onMeetingEnded({id:held.id,owner:held.owner},reason);return true;}
 function reserveMeeting(n,{owner,duration=75}={}){
  if(typeof owner!=='string'||!owner||!n||!actors().includes(n)||n.walking||n.serviceMount||status(n)?.busy||conversation)return false;
  if(meeting&&meeting.owner!==owner)return false;releaseMeeting(owner);
  meeting={actor:n,id:npcActorId(n),owner,started:time,until:time+Math.max(5,Math.min(90,Number.isFinite(duration)?duration:75))};return true;
 }
 function end(){const released=releaseMeeting();if(!conversation)return released;const {actor,paused,started}=conversation;if(paused&&Number.isFinite(actor.breakAt))actor.breakAt+=time-started;conversation=null;return true;}
 function begin(n){if(!canInteract(n))return null;end();const info=status(n)||{},reply=npcSocialReply(n,info);conversation={actor:n,id:npcActorId(n),reply,paused:!info.busy,started:time,interaction:beginInteraction(['player',npcActorId(n)]),duration:0};let a=attention.get(n);if(!a){a={inside:true,until:0,cooldown:0};attention.set(n,a);}a.until=time+(info.busy?1.15:1.7);a.cooldown=time+9;return {name:name(n),reply,paused:!info.busy};}
 function update(dt){time+=dt;const people=actors(),p=player()?.root?.position;
  // An explicit approach borrows the existing social pause for a bounded time.
  // Summons/new service duties revoke it; reading a menu never creates one.
  if(meeting){const reason=!people.includes(meeting.actor)?'removed':status(meeting.actor)?.busy?'duty':time>=meeting.until?'expired':null;if(reason)releaseMeeting(undefined,reason);}
  // A pause is borrowed from the actor's current routine, not a permanent
  // entitlement. A summons or new service duty can make that routine busy
  // while a nearby player still has yesterday's idle reply open.
  if(conversation&&(!canInteract(conversation.actor,2.4)||conversation.paused&&status(conversation.actor)?.busy))end();
  if(conversation?.interaction){const duration=conversation.paused?conversation.duration+dt:Math.min(1.15,conversation.duration+dt);if(duration>conversation.duration){conversation.duration=duration;onInteraction({...conversation.interaction,duration});}}
  for(const n of attention.keys())if(!people.includes(n))attention.delete(n);
  if(!p)return;for(const n of people){let a=attention.get(n);if(!a){a={inside:false,until:0,cooldown:0};attention.set(n,a);}const q=n.root.position,range=gap(p,q),bearing=angle(Math.atan2(p.x-q.x,p.z-q.z)-n.root.rotation.y),inside=n.root.visible!==false&&range<3.1&&Math.abs(p.y-q.y)<.65;
   // No omniscient look through walls or a backwards neck twist. A passer-by
   // gets one staggered acknowledgement, then the employee returns to work.
   if(inside&&!a.inside&&time>=a.cooldown&&Math.abs(bearing)<1.85&&visible(n,p)){const offset=((n.phase||0)%1)*.3;a.until=time+1.25+offset;a.cooldown=time+8+offset;}
   if(!inside)a.until=Math.min(a.until,time);a.inside=inside&&Math.abs(bearing)<1.85;
  }
 }
 function look(n){const p=player()?.root?.position,a=attention.get(n);if(!p||!a||status(n)?.attention===false)return null;const talking=conversation?.actor===n&&conversation.paused,active=talking||a.until>time;if(!active)return null;const q=n.root.position;if(Math.abs(p.y-q.y)>=.65||gap(p,q)>3.2||!visible(n,p))return null;
  const yaw=angle(Math.atan2(p.x-q.x,p.z-q.z)-n.root.rotation.y);if(Math.abs(yaw)>1.85&&conversation?.actor!==n)return null;const pitch=-Math.atan2((p.y+1.6)-(q.y+(n.getPoseMetrics?.().headHeight||1.6)),Math.max(.6,gap(p,q)));return {yaw:clamp(yaw,-.68,.68),pitch:clamp(pitch,-.16,.16),weight:talking?.85:.72};
 }
 function targets(){if(conversation)return [{social:true,id:conversation.id,actor:conversation.actor,name:name(conversation.actor),action:conversation.reply}];const result=[],p=player()?.root.position;if(!p)return result;for(const n of actors()){const distance=gap(p,n.root.position);if(distance<1.8&&canInteract(n))result.push({social:true,id:npcActorId(n),actor:n,name:name(n),action:'打个招呼 · 聊聊天',distance});}return result.sort((a,b)=>a.distance-b.distance);}
 function target(){return targets()[0]||null;}
 return {snapshot:()=>({version:1,time,conversation:conversation?{...copy({...conversation,actor:undefined}),actorId:npcActorId(conversation.actor)}:null,attention:[...attention].map(([n,a])=>[npcActorId(n),{...a}])}),restore(s){if(s?.version!==1)return false;releaseMeeting();time=Math.max(0,s.time||0);attention.clear();for(const[id,a]of s.attention||[]){const n=actors().find(n=>npcActorId(n)===id);if(n)attention.set(n,{...a});}const n=actors().find(n=>npcActorId(n)===s.conversation?.actorId);conversation=n&&canInteract(n,2.4)?{...copy(s.conversation),actor:n}:null;return true;},update,begin,end,look,target,targets,canInteract,canPause:n=>canInteract(n)&&!status(n)?.busy,reserveMeeting,releaseMeeting,meetingState:()=>meeting?{id:meeting.id,owner:meeting.owner,remaining:Math.max(0,meeting.until-time)}:null,isPaused:n=>conversation?.actor===n&&conversation.paused||meeting?.actor===n,conversationActorId:()=>conversation?.paused?conversation.id:meeting?.id||null,active:()=>!!conversation,state:()=>conversation?{id:conversation.id,name:name(conversation.actor),reply:conversation.reply,paused:conversation.paused}:null,dispose(){end();attention.clear();}};
}
