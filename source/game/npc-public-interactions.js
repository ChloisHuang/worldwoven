import {createLifeDecisions,mergeSocialMemories} from './npc-life-decisions.js';
import {holdSocialActors,releaseSocialActors,isSociallyHeld,isPlayerConversationHeld} from './npc-social-ownership.js';
const copy=x=>x==null?null:JSON.parse(JSON.stringify(x));
const idOf=n=>n.actorId||n.station?.id;
const clamp=x=>Math.max(-1,Math.min(1,x));
const add=(a={},b={})=>Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(k=>[k,clamp((a[k]||0)+(b[k]||0))]));
// One bounded world opportunity. Existing routines retain all non-social work;
// only a consenting pair borrows a short lease from its original owners.
export function createNpcPublicInteractions({getActors,getBaseProfile=()=>null,isAvailable=()=>false,getCountry=()=>null,worldSeed=1,saved=null,saveState=()=>true,resolveMeeting=()=>null,createJourney=()=>null,createGreetingJourney=null,onDecision=()=>{},beginInteraction=()=>null,onInteraction=()=>{},interactionContext=()=>null,socialFactors=()=>({}),visible=()=>true,canAdvance=()=>true,requireInteraction=true,opportunitySeconds=18,maxDistance=12}){
 const owner={publicInteractions:true};let brain=null,known='',active=null,time=0,nextOpportunity=12,random=(worldSeed>>>0)||1,disposed=false,brainTime=0,loaded=saved?.country===getCountry()?copy(saved):null;
 if(loaded){time=loaded.time||0;nextOpportunity=Math.max(time+5,loaded.nextOpportunity||0);random=loaded.random>>>0||random;}
 const roll=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 const actors=()=>[...new Map((getActors?.()||[]).filter(n=>idOf(n)&&n.root?.position).map(n=>[idOf(n),n])).values()].sort((a,b)=>idOf(a).localeCompare(idOf(b)));
 function project(id,base){const own=brain?.state(id);return own&&base?{...base,relations:add(base.relations,own.relations),opinions:add(base.opinions,own.opinions),interactions:mergeSocialMemories(base.interactions,own.interactions)}:base;}
 function scoring(id,p){const base=active?.frozenProfiles?.[id]||getBaseProfile(id)||{};return {...p,...base,traits:{...p.traits,...base.traits},values:{...p.values,...base.values},needs:{...p.needs,...base.needs},relations:add(base.relations,p.relations),opinions:add(base.opinions,p.opinions),interactions:mergeSocialMemories(base.interactions,p.interactions),cooldowns:p.cooldowns,experiences:p.experiences,current:p.current};}
 function snapshot(state=brain?.snapshot()){return {version:1,country:getCountry(),time,nextOpportunity,random,brain:copy(state),active:active?{eventId:active.event.id,participants:[...active.event.participants],stage:active.stage,elapsed:active.elapsed}:null};}
 function persist(state){try{return saveState(snapshot(state))!==false;}catch{return false;}}
 function enroll(){const roster=actors(),key=roster.map(idOf).join('|');if(brain&&known===key)return roster;
  const state=brain?.snapshot()||loaded?.brain||{};known=key;
  brain=createLifeDecisions({worldSeed,advanceNeeds:false,actorIds:[...new Set([...Object.keys(state.people||{}),...roster.map(idOf)])],saved:state,onChange:persist,socialProjection:scoring,socialFactors,interactionContext:(a,b)=>({...interactionContext(a,b),meeting:null,privatePlaceAvailable:false})});
  // Runtime leases/journeys cannot survive reload. Cancel unfinished intentions,
  // preserve event IDs and completed memory so replay cannot award them twice.
  if(loaded){for(const e of brain.snapshot().conversations||[])if(e.status==='accepted')brain.cancelConversation(e.id);for(const n of roster){const p=brain.state(idOf(n));if(p?.current)brain.complete(idOf(n),p.current,{fulfilled:false});}loaded=null;}
  return roster;
 }
 function available(n,{held=false}={}){if(!n||n.alive===false||n.serviceMount||!held&&isSociallyHeld(idOf(n)))return false;const p=getBaseProfile(idOf(n));return !(p?.needs?.hunger>=.85||p?.needs?.fatigue>=.88)&&isAvailable(n)===true;}
 function nearby(a,b){const p=a.root.position,q=b.root.position;return Math.abs(p.y-q.y)<.65&&Math.hypot(p.x-q.x,p.z-q.z)<=maxDistance&&visible(a,q)&&visible(b,p);}
 function cancel(reason='cancelled'){if(!active)return false;const c=active;onDecision({kind:'cancelled',reason,participants:c.event.participants,stage:c.stage});active=null;c.journey?.cancel?.(reason);if(['approaching','greeting'].includes(c.stage))brain.complete(c.event.participants[0],c.choice,{fulfilled:false});else brain.cancelConversation(c.event.id);releaseSocialActors(owner);persist();return true;}
 function face(pair){for(let i=0;i<2;i++){const a=pair[i],b=pair[1-i];a.walking=false;if(a.root.rotation)a.root.rotation.y=Math.atan2(b.root.position.x-a.root.position.x,b.root.position.z-a.root.position.z);}}
 function start(roster){const pool=roster.filter(n=>available(n)&&brain.canReply(idOf(n))&&brain.decisionDue(idOf(n))),neighbours=new Map(pool.map(n=>[n,[]]));
  for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++)if(nearby(pool[i],pool[j])){neighbours.get(pool[i]).push(pool[j]);neighbours.get(pool[j]).push(pool[i]);}
  const connected=pool.filter(n=>neighbours.get(n).length),actor=connected[Math.floor(roll()*connected.length)];if(!actor){onDecision({kind:'waiting',reason:pool.length?'no-nearby-partner':'no-available-actor'});return;}
  // Only actual encounters enter the initiator draw; isolated actors cannot
  // consume every social opportunity. Still one original action roll, then
  // one target draw, never repeated retries or a roll for each possible pair.
  const profile=scoring(idOf(actor),brain.state(idOf(actor)));if(roll()>=Math.min(.75,.18+(profile.traits.sociability||0)*.25+(profile.needs.social||0)*.25)){onDecision({kind:'waiting',reason:'chose-solitude'});return;}
  const candidates=neighbours.get(actor).map(n=>({actor:n}));
  if(!candidates.length){onDecision({kind:'waiting',reason:'no-nearby-partner',actorId:idOf(actor)});return;}
  // Greeting is actual encounter evidence at public, visible, reachable places.
  // Prefer an original completed work/rest memory whenever its owner has one.
  const source=(getBaseProfile(idOf(actor))?.experiences||[]).findLast(e=>e.id&&['staff-work','staff-rest'].includes(e.kind));
  const evidence=source?{...source,completed:true}:{id:`public-greeting:${getCountry()}:${idOf(actor)}:${brain.state(idOf(actor)).choices}`,kind:'greeting',label:'路上相互招呼',completed:true};
  const choice=brain.choose(idOf(actor),[{id:'conversation',experienceId:evidence.id,duration:[7,11],targets:candidates.map(({actor:n})=>({id:idOf(n),relationship:{target:idOf(n)}}))}]);if(!choice)return;
  const target=candidates.find(x=>idOf(x.actor)===choice.targetId);if(!target){brain.complete(idOf(actor),choice,{fulfilled:false});return;}
  target.meeting=resolveMeeting(actor,target.actor,choice);
  if(!target.meeting||target.meeting.private===true||target.meeting.places?.length!==2||!target.meeting.places.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))){onDecision({kind:'waiting',reason:'no-public-meeting',participants:[idOf(actor),idOf(target.actor)]});brain.complete(idOf(actor),choice,{fulfilled:false});return;}
  const pair=[actor,target.actor],participants=pair.map(idOf);
  const distant=Math.hypot(actor.root.position.x-target.actor.root.position.x,actor.root.position.z-target.actor.root.position.z)>3;
  const approach=distant?createGreetingJourney?.(pair,target.meeting):null;
  if(distant&&(!approach||approach.state?.()?.ok===false)){onDecision({kind:'waiting',reason:'greeting-unreachable'});brain.complete(idOf(actor),choice,{fulfilled:false});return;}
  if(!holdSocialActors(participants,owner)){brain.complete(idOf(actor),choice,{fulfilled:false});return;}
  active={event:{id:`greeting:${idOf(actor)}:${brain.state(idOf(actor)).choices}`,participants},pair,choice,evidence,meeting:target.meeting,stage:approach?'approaching':'greeting',elapsed:0,travelTime:0,journey:approach,interaction:null};
  if(!approach)face(pair);if(!persist())cancel('save-failed');
 }
 function update(dt){if(disposed||!Number.isFinite(dt)||dt<=0)return;if(active?.event.participants.some(isPlayerConversationHeld)){const roster=getActors?.()||[];if(!active.pair.every((n,i)=>roster.includes(n)&&n.alive!==false&&idOf(n)===active.event.participants[i])){cancel('actor-unavailable');return;}if(!['approaching','greeting'].includes(active.stage)&&!brain.conversationAllowed(active.event.id)){cancel('conversation-unavailable');return;}active.pair.forEach(n=>{n.walking=false;});return;}time+=dt;brainTime+=dt;const roster=getActors?.()||[];if(!active&&time<nextOpportunity)return;if(brainTime>0){brain.tick(brainTime);brainTime=0;}
  if(active){const c=active;if(!canAdvance()||!c.pair.every((n,i)=>roster.includes(n)&&idOf(n)===c.event.participants[i]&&available(n,{held:true}))||!['approaching','greeting'].includes(c.stage)&&!brain.conversationAllowed(c.event.id)){cancel('owner-unavailable');return;}
   if(c.stage==='approaching'){c.travelTime+=dt;const progress=c.journey.update(dt);c.motion=Object.fromEntries(c.pair.map(n=>[idOf(n),n.walking===true]));if(!progress?.ok||c.travelTime>30){cancel(progress?.reason||'greeting-timeout');return;}if(progress.phase==='arrived'){c.journey.finish?.();c.journey=null;c.stage='greeting';c.elapsed=0;c.travelTime=0;face(c.pair);persist();}return;}
   if(c.stage==='greeting'){face(c.pair);c.elapsed+=dt;if(c.elapsed<1.2)return;if(brain.recordExperience(c.event.participants[0],c.evidence)?.ok!==true){cancel('save-failed');return;}const event=brain.invite(c.event.participants[0],c.choice);onDecision({kind:'invitation',status:event?.status,reason:event?.reason,participants:c.event.participants});if(event?.status!=='accepted'){cancel(event?.reason||'declined');return;}c.event=event;c.stage='travelling';c.elapsed=0;c.journey=createJourney(event,c.pair,c.meeting);if(!c.journey||c.journey.state?.()?.ok===false){cancel('meeting-unavailable');return;}if(!persist())cancel('save-failed');return;}
   if(c.stage==='travelling'){c.travelTime+=dt;const progress=c.journey.update(dt);c.motion=Object.fromEntries(c.pair.map(n=>[idOf(n),n.walking===true]));if(!progress?.ok||c.travelTime>45){cancel(progress?.reason||'travel-timeout');return;}if(progress.phase==='arrived'){c.stage='talking';c.interaction=beginInteraction(c.event.participants,c.event);if(requireInteraction&&!c.interaction){cancel('interaction-unavailable');return;}face(c.pair);if(!persist())cancel('save-failed');}return;}
   const stayed=c.journey.update(dt);if(!stayed?.ok){cancel(stayed?.reason||'meeting-left');return;}face(c.pair);if(!nearby(...c.pair)){cancel('separated');return;}c.elapsed=Math.min(c.event.duration,c.elapsed+dt);
   if(c.elapsed>=c.event.duration){c.frozenProfiles??=Object.fromEntries(c.event.participants.map(id=>[id,copy(getBaseProfile(id)||{})]));if(c.retryAt&&time<c.retryAt)return;const result=brain.finishConversation(c.event.id,{elapsed:c.elapsed,arrived:c.event.participants});if(!result.ok){if(result.reason==='save-failed'){c.retryAt=time+5;return;}cancel(result.reason);return;}c.journey.finish?.();releaseSocialActors(owner);active=null;onDecision({kind:'completed',participants:c.event.participants});persist();if(c.interaction)onInteraction({...c.interaction,duration:c.elapsed,completed:true,eventId:c.event.id,interactionKind:c.event.interactionKind||'conversation'});}return;
  }
  if(time>=nextOpportunity){nextOpportunity=time+Math.max(5,opportunitySeconds);if(canAdvance())start(enroll());persist();}
 }
 function restore(state){cancel('restore');brainTime=0;loaded=state?.version===1&&state.country===getCountry()?copy(state):null;brain=null;known='';time=loaded?.time||0;nextOpportunity=Math.max(time+5,loaded?.nextOpportunity||12);random=loaded?.random>>>0||worldSeed>>>0||1;enroll();return !!loaded||state?.version===1;}
 enroll();
 return {update,snapshot,restore,project,pose(n){if(!active?.pair.includes(n))return null;const other=active.pair.find(a=>a!==n);return {walking:!active.event.participants.some(isPlayerConversationHeld)&&['approaching','travelling'].includes(active.stage)&&active.motion?.[idOf(n)]===true,target:other.root.position};},owns:n=>!!active?.event.participants.includes(typeof n==='string'?n:idOf(n)),status:()=>active?{eventId:active.event.id,participants:[...active.event.participants],stage:active.stage,elapsed:active.elapsed,interactionKind:active.event.interactionKind||'conversation'}:null,cancel,dispose(){cancel('left-region');disposed=true;persist();},state:id=>brain.state(id)};
}
