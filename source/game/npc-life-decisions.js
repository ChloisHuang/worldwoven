import {relationshipInteraction,relationshipInteractionOptions,relationshipInteractionEligible,relationshipInteractionOutcome,relationshipRomanticContextAllowed} from './relationship-interactions.js';
// Personal life chooses at activity boundaries. Jobs keep their authored work;
// callers establish each actor's eligibility before asking for one decision.
const clamp=x=>Math.max(0,Math.min(1,x)),opinion=x=>Math.max(-1,Math.min(1,x));
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0||1;}
const copy=x=>JSON.parse(JSON.stringify(x));
// Conversation topics are evidence of completed actions, never invented news.
export const conversationTopicFit=(p,kind)=>kind==='greeting'?p.traits.sociability*.7+p.traits.curiosity*.3:kind==='staff-work'?p.traits.curiosity*.45+p.traits.quiet*.35+p.traits.sociability*.20:kind==='staff-rest'?p.traits.quiet*.70+p.traits.sociability*.30:kind==='read'?p.traits.curiosity*.65+p.traits.quiet*.35:p.traits.outdoors*.8+p.traits.quiet*.2;
const topicFit=conversationTopicFit;
export function conversationDisposition(person,other,kind,targetId){
 const familiarity=person.experiences?.some(e=>e.kind===kind)?.06:0;
 const alignment=1-(Math.abs(person.values.company-other.values.company)+Math.abs(person.values.quiet-other.values.quiet));
 // Enjoying a topic need not mean enjoying this person's preferred company.
 const fit=(topicFit(person,kind)-.5)*.85+alignment*.17-(1-alignment)*(1-topicFit(person,kind))*.36+familiarity+(person.relations[targetId]||0)*.08+(person.opinions[targetId]||0)*.12-(person.needs.fatigue||0)*.10;
 const feeling=fit>.16?'appreciated':fit<-.09?'mismatched':'neutral';
 return {feeling,relation:feeling==='appreciated'?.07:feeling==='mismatched'?-.035:.012,opinion:feeling==='appreciated'?.07:feeling==='mismatched'?-.06:0};
}
const available=c=>c.available!==false&&c.reachable!==false;
const unique=items=>[...new Map(items.filter(available).map(c=>[c.id,c])).values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
// Installed by the single world owner; readers never write legacy relation state.
let worldSocialProjection=(id,p)=>p,worldSocialFactors=()=>({}),worldInteractionContext=()=>null,worldMeetingHooks=null;
export function setLifeSocialProjection(reader,factors,interactionContext,meetingHooks){worldMeetingHooks=meetingHooks||null;worldInteractionContext=typeof interactionContext==='function'?interactionContext:()=>null;worldSocialProjection=typeof reader==='function'?reader:(id,p)=>p;worldSocialFactors=typeof factors==='function'?factors:()=>({});}
export function mergeSocialMemories(a={},b={}){const result={};for(const key of new Set([...Object.keys(a),...Object.keys(b)])){const x=a[key]||{},y=b[key]||{};result[key]={...x,...y,completedCount:(x.completedCount||0)+(y.completedCount||0),trust:opinion((x.trust||0)+(y.trust||0)),interestGiven:x.interestGiven===true||y.interestGiven===true,boundary:x.boundary===true||y.boundary===true};const stance=[x,y].filter(m=>m.supportEventId).sort((a,b)=>(b.supportAt||0)-(a.supportAt||0))[0];if(stance)for(const field of ['supportStance','supportEventId','supportAt','supportEvidenceId','supportFaultId'])result[key][field]=stance[field];}return result;}
export function createLifeDecisions({worldSeed=1,actorIds,saved={},onChange=()=>{},sharedNeeds=null,advanceNeeds=true,socialProjection=worldSocialProjection,socialFactors=worldSocialFactors,interactionContext=worldInteractionContext,meetingHooks=worldMeetingHooks}){
 let time=Number.isFinite(saved.time)?saved.time:0,lastSave=time;
 const people={},conversations=copy(saved.conversations||[]);
 const trimConversations=()=>{while(conversations.length>32){const index=conversations.findIndex(e=>e.status!=='accepted');if(index<0)break;conversations.splice(index,1);}};
 for(const id of actorIds){
  const key=`life-v1|${worldSeed>>>0}|${id}`,old=saved.version===1?saved.people?.[id]:null;
  const p=people[id]=old?copy(old):{random:hash(key),choices:0,last:null,current:null,cooldowns:{},needs:{hunger:.10+hash(key+'hunger')/4294967296*.28,fatigue:.12+hash(key+'fatigue')/4294967296*.32,social:.20+hash(key+'social')/4294967296*.45},traits:Object.fromEntries(['curiosity','outdoors','sociability','quiet','appetite'].map(k=>[k,.25+hash(key+k)/4294967296*.65]))};
  p.interactions??={};p.relations??={};p.opinions??={};p.values??={company:p.traits.sociability,quiet:p.traits.quiet,curiosity:p.traits.curiosity};p.nextDecisionAt??=0;p.experiences??=[];p.replyAfter??=0;
  // Saved targets are intentions, never live scene objects or occupied seats.
 }
 // An enrolled actor's hunger is a projection of the shared physiological
 // source. Legacy relief cannot feed them without a completed supply receipt.
 const sharedHunger=id=>sharedNeeds?.hunger(id),syncHunger=()=>{for(const[id,p]of Object.entries(people)){const h=sharedHunger(id);if(Number.isFinite(h))p.needs.hunger=h;}};
 const snapshot=()=>{syncHunger();return {version:1,time,people:copy(people),conversations:copy(conversations)};},save=()=>{lastSave=time;try{return onChange(snapshot())!==false;}catch{return false;}};
 function transaction(change){const before=copy(people),events=copy(conversations),result=change();trimConversations();if(save())return result;for(const id of Object.keys(people))people[id]=before[id];conversations.splice(0,conversations.length,...events);return {ok:false,reason:'save-failed'};}
 function random(p){let x=p.random>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;p.random=x>>>0||1;return p.random/4294967296;}
 function preference(p,c,base){
  let value=c.base??base;
  for(const [key,k]of Object.entries(c.traits||{}))value+=(p.traits[key]||0)*k;
  for(const [key,k]of Object.entries(c.needs||{}))value+=(p.needs[key]||0)*k;
  return value;
 }
 function weight(p,c,hour){
  let value=preference(p,c,.2);
  if(c.id==='rest')value+=hour>=20||hour<7?1.6:0;
  if(c.id==='meal')value+=(hour>=11&&hour<14||hour>=17&&hour<20)?.8:0;
  if(c.id==='garden'&&(hour>=20||hour<6))value*=.22;
  if(p.last===c.id)value*=.18;
  return Math.max(.005,value);
 }
 function targets(c){
  // Legacy single-person choices migrate without changing their identity.
  return c.targets===undefined?(c.relationship?[{id:c.relationship.target,relationship:c.relationship}]:null):unique(c.targets);
 }
 function actions(id,base,candidates,hour){
  const p=socialProjection(id,base);
  return unique(candidates).flatMap(c=>{
   if(time<(p.cooldowns[c.id]||0))return [];
   const pool=targets(c);
   if(pool&&!pool.length)return []; // Explicit finite targets, including any authored solo fallback.
   return [{choice:c,weight:weight(p,c,hour),targets:pool?.map(target=>{
    const r=target.relationship;let value=preference(p,target,1);
    if(r){value+=(p.relations[r.target]||0)*(r.weight??.5)+(p.opinions[r.target]||0)*(r.opinionWeight??.5);if(c.id==='conversation'){const factors=socialFactors(id,r.target);value+=(factors.acceptanceAppearance||0)+(factors.acceptanceContext||0);}}
    return {choice:target,weight:Math.max(.005,value)};
   })||null}];
  });
 }
 function pick(entries,roll){const total=entries.reduce((sum,c)=>sum+c.weight,0);roll*=total;return entries.find(c=>(roll-=c.weight)<0)||entries.at(-1);}
 // A raw target carries score fields plus choice: {facilityId, route, ...}.
 // Only that execution payload overrides the action; target.id stays targetId.
 function materialize(action,target,current){return {...action,...target?.choice,id:action.id,...(target?{targetId:target.id,relationship:target.relationship||null}:{}),...current};}
 function observe(id,c,{observers=[]}={}){
  const actor=people[id],current=actor?.current,event=c.socialEvent;
  if(!current||current.id!==c.id||current.targetId!==(c.targetId??c.relationship?.target)||!event)return [];
  const changed=[];current.observedBy??=[];
  // Knowledge comes from the completed scene interaction, never all NPCs.
  for(const observer of observers){
   const p=people[observer.id];if(!p||observer.id===id||!['participant','witness','told'].includes(observer.knowledge)||current.observedBy.includes(observer.id))continue;
   const cues=Object.entries(event.values||{}),total=cues.reduce((sum,[,v])=>sum+Math.abs(v),0);
   if(!total)continue;
   const previous=p.opinions[id]||0,alignment=cues.reduce((sum,[key,v])=>sum+(p.values[key]??.5)*v,0)/total;
   const delta=(event.strength??.08)*(alignment+previous*.25+(p.relations[id]||0)*.1);
   p.opinions[id]=opinion(previous+delta);current.observedBy.push(observer.id);changed.push({observerId:observer.id,actorId:id,delta:p.opinions[id]-previous});
  }
  if(changed.length)save();return changed;
 }
 // Per-pair interaction memory has one writer, alongside the original R99
 // result. A context callback contributes actual ages/service evidence/rooms;
 // it cannot manufacture a completed conversation or a willing reply.
 function interactionView(id,target){
  let external=interactionContext(id,target);if(external?.socialByParticipant?.[id])external={...external,...external.socialByParticipant[id]};if(!external)return null;
  const p=people[id],other=people[target];if(!p||!other)return null;
  const memory=socialProjection(id,p).interactions?.[target]||p.interactions[target]||{},reverse=socialProjection(target,other).interactions?.[id]||other.interactions[id]||{},history=conversations.filter(e=>e.status==='completed'&&e.participants.includes(id)&&e.participants.includes(target));
  const mismatch=history.findLast(e=>e.results?.some(r=>r.feeling==='mismatched'));
  return {...external,supportStance:memory.supportStance,supportEventId:memory.supportEventId,completedCount:memory.completedCount??history.length,relation:socialProjection(id,p).relations[target]||0,trust:(memory.trust||0)+(external.trust||0),lastCompletedId:memory.lastCompletedId||history.at(-1)?.id,mismatchEventId:memory.mismatchEventId||mismatch?.id,acknowledgedEventId:memory.acknowledgedEventId,repairedEventId:memory.repairedEventId,interestGiven:memory.interestGiven===true,interestReceived:reverse.interestGiven===true,boundary:memory.boundary===true||reverse.boundary===true||external.boundary===true,privatePlaceAvailable:validPrivateMeeting(external.meeting,id,target)};
 }
 function validPrivateMeeting(m,id,target){return !!m&&typeof m.id==='string'&&m.id.length>0&&m.private===true&&m.available===true&&m.authorized?.includes(id)&&m.authorized.includes(target)&&Array.isArray(m.places)&&m.places.length===2&&m.places.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))&&(m.managed===true?!!m.place&&typeof meetingHooks?.claim==='function'&&typeof meetingHooks?.release==='function'&&typeof meetingHooks?.validate==='function':m.placeIds?.length===2&&m.placeIds.every(x=>typeof x==='string'&&x)&&m.placeIds[0]!==m.placeIds[1]);}
 function meetingFor(id,choice,fallback){const spec=relationshipInteraction(choice.interactionKind);if(!spec?.private)return copy(fallback);const context=interactionView(id,choice.targetId);return context?.privatePlaceAvailable?copy(context.meeting):null;}
 function interactionAllowed(event){
  if(!event.interactionKind)return true;
  const context=interactionView(event.participants[0],event.participants[1]);
  if(!context||!relationshipInteractionEligible(event.interactionKind,context)||relationshipInteraction(event.interactionKind)?.romantic&&!relationshipRomanticContextAllowed(interactionView(event.participants[1],event.participants[0])||{}))return false;
  if(!relationshipInteraction(event.interactionKind)?.private)return true;
  return event.consent?.[event.participants[0]]===true&&event.consent?.[event.participants[1]]===true&&context.meeting.id===event.meeting?.id&&(!event.meeting?.managed||meetingHooks.validate(event.meeting,event.participants)?.ok===true)&&JSON.stringify(context.meeting.places)===JSON.stringify(event.meeting.places);
 }
 function rememberInteraction(event,id,target,result){
  const p=people[id],history=conversations.filter(e=>e!==event&&e.status==='completed'&&e.participants.includes(id)&&e.participants.includes(target));
  const memory=p.interactions[target]??={completedCount:history.length,trust:0};
  memory.completedCount++;memory.lastCompletedId=event.id;memory.trust=opinion((memory.trust||0)+(result.trust||0));
  if(result.feeling==='mismatched')memory.mismatchEventId=event.id;
  if(event.interactionKind==='boundary'&&event.participants[0]===id)memory.boundary=true;
  if(['express-interest','respond-interest'].includes(event.interactionKind)&&event.participants[0]===id)memory.interestGiven=true;
  if(result.supportStance&&event.participants[1]===id){memory.supportStance=result.supportStance;memory.supportEventId=event.id;memory.supportAt=Number.isFinite(result.supportAt)?result.supportAt:time;memory.supportEvidenceId=result.supportEvidenceId||null;memory.supportFaultId=result.supportFaultId||null;}
  if(result.acknowledgedEventId)memory.acknowledgedEventId=result.acknowledgedEventId;if(result.repairedEventId)memory.repairedEventId=result.repairedEventId;
 }
 function endConversation(event,status){
  event.status=status;event.endedAt=time;
  for(const id of event.participants){const p=people[id];if(p.current?.conversationId!==event.id)continue;p.current=null;p.last='conversation';p.cooldowns.conversation=time+90;p.nextDecisionAt=time+12;p.replyAfter=time+24;}
 }
 return {
  interactionView:(id,target)=>{const c=interactionView(id,target);return c?copy(c):null;},
  conversationAllowed:eventId=>{const event=conversations.find(e=>e.id===eventId);return !!event&&event.status==='accepted'&&interactionAllowed(event);},
  meeting:meetingFor,
  reserveMeeting(eventId){const event=conversations.find(e=>e.id===eventId);return !event?.meeting?.managed||meetingHooks?.claim(event.meeting,event.participants)?.ok===true;},
  releaseMeeting(eventId){const event=conversations.find(e=>e.id===eventId);if(event?.meeting?.managed)meetingHooks?.release(event.meeting,event.participants);},
  interactionLabel:eventId=>{const e=conversations.find(e=>e.id===eventId);return relationshipInteraction(e?.interactionKind)?.label||null;},
  decisionDue:id=>!!people[id]&&time>=people[id].nextDecisionAt,
  // Manual recovery interrupts only this intention. The world owner commits
  // the relocation and this change together, or rolls both back synchronously.
  prepareInterruption(id){const p=people[id];if(!p||p.current?.conversationId)return null;
   const before={current:copy(p.current),last:p.last,cooldowns:{...p.cooldowns},nextDecisionAt:p.nextDecisionAt};
   return {apply(){if(p.current){p.last=p.current.id;p.cooldowns[p.current.id]=time+30;}p.current=null;p.nextDecisionAt=time;},rollback(){Object.assign(p,before);}};
  },
  defer(id,seconds=12){const p=people[id];if(p&&!p.current){p.nextDecisionAt=Math.max(p.nextDecisionAt,time+seconds);save();}},
  recordExperience(id,evidence){const p=people[id];if(!p||!evidence?.id||evidence.completed!==true||!['staff-work','staff-rest','greeting'].includes(evidence.kind))return {ok:false,reason:'unfinished'};if(p.experiences.some(e=>e.id===evidence.id))return {ok:true,replayed:true};return transaction(()=>{p.experiences.push({id:evidence.id,kind:evidence.kind,label:evidence.label,completedAt:time});p.experiences=p.experiences.slice(-4);return {ok:true};});},
  experience(id){const p=people[id];return p?.experiences.length?copy(p.experiences.at(-1)):null;},
  fatigued:id=>(people[id]?.needs.fatigue||0)>.88,
  canReply(id){const p=people[id];return !!p&&!p.current&&time>=p.replyAfter;},
  invite(id,choice){
   const p=people[id],other=people[choice.targetId],current=p?.current,eventId=`conversation:${id}:${p?.choices}`;
   const previous=conversations.find(e=>e.id===eventId);if(previous)return copy(previous);
   const experience=p?.experiences.find(e=>e.id===choice.experienceId);
   if(!current||current.id!=='conversation'||current.targetId!==choice.targetId||!experience||!other||other.current||time<other.replyAfter)return {ok:false,reason:'unavailable'};
   return transaction(()=>{
    const ownView=socialProjection(id,p),otherView=socialProjection(choice.targetId,other),social=socialFactors(choice.targetId,id);
    const chance=clamp(.20+otherView.traits.sociability*.24+otherView.needs.social*.18+topicFit(otherView,experience.kind)*.30+(otherView.experiences.some(e=>e.kind===experience.kind)?.08:0)+(otherView.relations[id]||0)*.12+(otherView.opinions[id]||0)*.10-otherView.needs.fatigue*.24-otherView.needs.hunger*.30+(social.acceptanceAppearance||0)+(social.acceptanceContext||0));
    const context=interactionView(id,choice.targetId),kind=current.interactionKind,spec=relationshipInteraction(kind),eligible=!kind||!!context&&relationshipInteractionEligible(kind,context)&&(!spec.romantic||relationshipRomanticContextAllowed(interactionView(choice.targetId,id)||{}));
    const accepted=random(other)<chance&&eligible,event={id:eventId,ok:true,status:accepted?'accepted':'declined',responses:{[id]:conversationDisposition(ownView,otherView,experience.kind,choice.targetId).feeling,[choice.targetId]:conversationDisposition(otherView,ownView,experience.kind,id).feeling},participants:[id,choice.targetId],experience:copy(experience),startedAt:time,duration:current.duration,...(kind?{interactionKind:kind,interactionLabel:spec.label,evidence:{lastCompletedId:context?.lastCompletedId||null,mismatchEventId:context?.mismatchEventId||context?.faultEventId||null},consent:{[id]:true,[choice.targetId]:accepted},consentSource:'per-occasion-invitation-and-reply',...(spec.private?{meeting:copy(context?.meeting||null),fadeToBlack:true}: {})}:{})};
    conversations.push(event);p.current.conversationId=event.id;other.replyAfter=time+24;
    if(accepted)other.current={id:'conversation',targetId:id,conversationId:event.id,duration:current.duration,startedAt:time,invited:true};
    else endConversation(event,'declined');
    return copy(event);
   });
  },
  finishConversation(eventId,{elapsed=0,arrived=[]}={}){
   const event=conversations.find(e=>e.id===eventId);
   if(!event)return {ok:false,reason:'unknown-event'};if(event.status==='completed')return {ok:true,replayed:true,event:copy(event)};
   if(event.status!=='accepted'||!interactionAllowed(event)||elapsed<event.duration||!event.participants.every(id=>arrived.includes(id)&&people[id]?.current?.conversationId===eventId))return {ok:false,reason:'unfinished'};
   return transaction(()=>{
    event.results=event.participants.map((id,i)=>{const target=event.participants[1-i],p=people[id],result=event.interactionKind?relationshipInteractionOutcome(event.interactionKind,{...interactionView(id,target),mismatchEventId:event.evidence?.mismatchEventId||undefined,faultEventId:undefined,initiator:event.participants[0]===id?'player':'npc',supportRespondent:event.participants[1]===id,receptivity:clamp(topicFit(socialProjection(id,p),relationshipInteraction(event.interactionKind).fitKind)*.7+(p.values?.company??.5)*.15+.075+(p.relations[target]||0)*.075),explicitConsent:event.consent?.[id]===true}):conversationDisposition(socialProjection(id,p),socialProjection(target,people[target]),event.experience.kind,target);const relation=p.relations[target]||0,previous=p.opinions[target]||0;p.relations[target]=opinion(relation+result.relation);p.opinions[target]=opinion(previous+result.opinion);p.needs.social=clamp(p.needs.social-.32);rememberInteraction(event,id,target,result);return {...(event.interactionKind?{interactionKind:event.interactionKind,trust:result.trust,forgiven:result.forgiven,acknowledgedEventId:result.acknowledgedEventId,repairedEventId:result.repairedEventId}:{}),actorId:id,targetId:target,feeling:result.feeling,relation:p.relations[target]-relation,opinion:p.opinions[target]-previous};});
    endConversation(event,'completed');return {ok:true,event:copy(event)};
   });
  },
  cancelConversation(eventId){const event=conversations.find(e=>e.id===eventId);if(!event||event.status!=='accepted')return false;endConversation(event,'cancelled');save();return true;},
  conversation:eventId=>copy(conversations.find(e=>e.id===eventId)||null),
  tick(dt){if(!Number.isFinite(dt)||dt<=0)return;time+=dt;if(advanceNeeds)for(const[id,p]of Object.entries(people)){const h=sharedHunger(id);p.needs.hunger=Number.isFinite(h)?h:clamp(p.needs.hunger+dt/850);p.needs.fatigue=clamp(p.needs.fatigue+dt/1100);p.needs.social=clamp(p.needs.social+dt/1000);}if(time-lastSave>=30)save();},
  choose(id,candidates,hour=10){const p=people[id];if(!p)return null;
   const entries=actions(id,p,candidates,hour);
   if(p.current){
    const entry=entries.find(e=>e.choice.id===p.current.id);
    // Version-one saves did not record a target; only an unambiguous one can resume.
    if(p.current.targetId===undefined&&entry?.targets?.length===1)p.current.targetId=entry.targets[0].choice.id;
    const target=entry?.targets?.find(t=>t.choice.id===p.current.targetId)?.choice;
    if(entry&&(!entry.targets||target))return {...materialize(entry.choice,target,p.current),resumed:true};
    p.current=null; // An unavailable commitment ends; sample the already filtered set once.
   }
   if(time<p.nextDecisionAt)return null;
   if(!entries.length){p.nextDecisionAt=time+6;save();return null;}
   // One actor, then P(action | actor,state), then P(target | action,actor,state).
   // Fixed draw count keeps later decisions independent of the number of targets.
   const entry=pick(entries,random(p)),targetRoll=random(p),target=entry.targets?pick(entry.targets,targetRoll).choice:null;
   const c=materialize(entry.choice,target,{}),range=c.duration||[8,14],durationRoll=random(p),context=c.id==='conversation'&&target?interactionView(id,target.id):null,options=context?relationshipInteractionOptions(context):[],bucket=durationRoll*(options.length+1),spec=options[Math.floor(bucket)-1],duration=spec?spec.duration:range[0]+(options.length?bucket:durationRoll)*(range[1]-range[0]);
   if(spec){c.interactionKind=spec.id;c.interactionLabel=spec.label;}
   p.current={id:c.id,...(target?{targetId:target.id}:{}),duration,startedAt:time,...(c.interactionKind?{interactionKind:c.interactionKind,interactionLabel:c.interactionLabel}:{})};p.choices++;save();return {...c,...p.current};
  },
  complete(id,c,{fulfilled=true,observers=[]}={}){const p=people[id];if(!p?.current||p.current.id!==c.id||p.current.targetId!==(c.targetId??c.relationship?.target))return;
   if(fulfilled){if(c.experience&&['read','garden','staff-rest'].includes(c.experience.kind)){const eventId=`experience:${id}:${p.choices}`;if(!p.experiences.some(e=>e.id===eventId)){p.experiences.push({id:eventId,kind:c.experience.kind,label:c.experience.label,completedAt:time});p.experiences=p.experiences.slice(-4);}}observe(id,c,{observers});for(const[k,delta]of Object.entries(c.relief||{}))if(k!=='hunger'||!Number.isFinite(sharedHunger(id)))p.needs[k]=clamp(p.needs[k]+delta);if(c.relationship){const r=c.relationship;p.relations[r.target]=opinion((p.relations[r.target]||0)+(r.gain??.08));}}
   p.last=c.id;p.cooldowns[c.id]=time+(c.cooldown??45);p.current=null;p.nextDecisionAt=time;save();
  },
  observe,
  distribution(id,candidates,hour=10){const p=people[id];if(!p)return [];const entries=actions(id,p,candidates,hour),total=entries.reduce((sum,e)=>sum+e.weight,0);return entries.map(e=>{const targetTotal=e.targets?.reduce((sum,t)=>sum+t.weight,0);return {id:e.choice.id,probability:e.weight/total,targets:e.targets?.map(t=>({id:t.choice.id,probability:t.weight/targetTotal}))||[]};});},
  state(id){if(id){const p=people[id];if(!p)return null;const h=sharedHunger(id);if(Number.isFinite(h))p.needs.hunger=h;const result=copy(p);for(const e of conversations){if(e.status!=='completed'||!e.participants.includes(id))continue;const target=e.participants.find(x=>x!==id);if(p.interactions[target])continue;const m=result.interactions[target]??={completedCount:0,trust:0};m.completedCount++;m.lastCompletedId=e.id;if(e.results?.find(r=>r.actorId===id)?.feeling==='mismatched')m.mismatchEventId=e.id;}return result;}return snapshot();},snapshot,dispose:save
 };
}
