import {relationshipInteractionEligible,relationshipInteractionOutcome} from './relationship-interactions.js';
import {holdSocialActors,releaseSocialActors,socialHoldOwner} from './npc-social-ownership.js';
import {mergeSocialMemories} from './npc-life-decisions.js';
import {socialAttentionHash} from './social-attention.js';

const copy=value=>value==null?null:JSON.parse(JSON.stringify(value));
const finite=Number.isFinite;
const unit=value=>Math.max(0,Math.min(1,finite(value)?value:0));
const signed=value=>Math.max(-1,Math.min(1,finite(value)?value:0));
const idOf=actor=>typeof actor==='string'?actor:actor?.actorId||actor?.station?.id||actor?.id;
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=128&&id.trim()===id;
const activeStages=new Set(['requested','selected','summoned','awaiting-response','travelling','together']);
const labels={requested:'请求皇帝考虑今夜相伴',selected:'已翻牌，准备传召',summoned:'已传召，等候本人答复','awaiting-response':'等候当次明确答复',travelling:'一同前往获准使用的寝殿',together:'自愿相伴片刻',completed:'这次相伴已结束',declined:'本次邀约已婉拒',cancelled:'本次邀约已取消'};
const add=(a={},b={})=>Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(key=>[key,signed((a[key]||0)+(b[key]||0))]));

// ST02 uses the existing adult private-company gate, directional outcome and
// live social journey. Court rank is neither consent nor a relationship award.
// saveState is synchronous. onComplete is a notification, not another writer.
export function createPalaceCompanionship({
 getRoster=()=>[],getIdentity=()=>null,getContext=()=>({}),getFactors=()=>({}),
 isAvailable=()=>false,getPlace=()=>null,createJourney=()=>null,getClock=()=>({}),
 saved=null,worldSeed=1,saveState=()=>true,onChange=()=>{},onPrivateFade=()=>{},onComplete=()=>{},
 opportunitySeconds=120,dispatchSeconds=3,responseSeconds=2,responseTimeout=60,pairCooldownSeconds=300,
 venuePolicy=null,
}={}){
 const owner={palaceCompanionship:true};
 const prefix=venuePolicy?.prefix||'palace-company',eventLabels={...labels,...venuePolicy?.labels};
 const permitted=(a,b)=>venuePolicy?venuePolicy.allowedPair(a,b)===true:emperorId()===a;
 let data=fresh(),journey=null,refs=new Map(),disposed=false,saveBlocked=false,retryAt=0,loadError=null,restoreSource=null;
 function fresh(){return {version:1,time:0,nextOpportunity:30,random:socialAttentionHash(`${prefix}:${worldSeed}`)||1,nextSerial:1,lastNight:null,active:null,history:[],people:{},cooldowns:{},nightAttempts:{}};}
 const snapshot=()=>copy(loadError?restoreSource:data);
 const roster=()=>[...new Map((getRoster()||[]).filter(a=>validId(idOf(a))).map(a=>[idOf(a),a])).values()];
 function identity(id){
  const raw=getIdentity(id);
  if(!raw||raw.actorId!==id||!validId(id)||raw.country!=='china'||raw.alive===false||!finite(raw.ageYears)||raw.ageYears<18||!(typeof raw.revision==='string'||finite(raw.revision)))return null;
  return {actorId:id,revision:raw.revision,royalRole:raw.royalRole||null,isCurrentEmperor:raw.isCurrentEmperor===true||raw.royalRole==='emperor',ageYears:raw.ageYears,country:raw.country};
 }
 function emperorId(){const ids=roster().map(a=>idOf(a)).filter(id=>identity(id)?.isCurrentEmperor);return ids.length===1?ids[0]:null;}
 function status(){const event=data.active;return event?{...copy(event),label:eventLabels[event.stage]||'',responsePending:event.participants.filter(id=>event.consent[id]!==true)}:null;}
 const safeCall=(fn,...args)=>{try{return fn(...args);}catch{return undefined;}};
 function notify(event=data.active){safeCall(onChange,event?{...copy(event),label:eventLabels[event.stage]||''}:null);}
 function persist(){try{const result=saveState(snapshot());return result!==false&&!result?.then;}catch{return false;}}
 function transaction(change){const before=copy(data);let result;try{result=change();}catch{data=before;return {ok:false,reason:'callback-failed'};}if(persist())return {ok:true,value:result};data=before;return {ok:false,reason:'save-failed'};}
 function random(){data.random=(Math.imul(data.random,1664525)+1013904223)>>>0;return data.random/4294967296;}
 function release(reason){
  if(journey){safeCall(reason==='completed'?journey.finish?.bind(journey):journey.cancel?.bind(journey),reason);journey=null;}
  releaseSocialActors(owner);refs.clear();safeCall(onPrivateFade,false,null);
 }
 function settle(stage,reason){
  const event=data.active;if(!event)return {ok:false,reason:'no-invitation'};
  // Release immediately even if storage is unavailable. Reload also cancels
  // its old intermediate record; a lost write cannot retain bodily control.
  const ended={...copy(event),stage,reason:reason||stage,endedAt:data.time};
  release(reason||stage);data.active=null;data.history.push(ended);data.history=data.history.slice(-32);
  data.cooldowns[event.targetId]=Math.max(data.cooldowns[event.targetId]||0,data.time+pairCooldownSeconds);
  saveBlocked=!persist();if(saveBlocked)retryAt=data.time+5;
  notify(ended);return {ok:!saveBlocked,event:copy(ended),...(saveBlocked?{reason:'save-failed'}:{})};
 }
 function cancel(reason='cancelled'){return settle('cancelled',reason);}
 function available(id,event){
  const actor=roster().find(a=>idOf(a)===id),held=socialHoldOwner(id);
  return !!actor&&(typeof actor==='string'||actor.alive!==false)&&(!held||held===owner)&&isAvailable(id,{held:held===owner,event:event?copy(event):null})===true;
 }
 function relationContext(observer,target){
  const self=identity(observer),other=identity(target);if(!self||!other)return null;
  const context=getContext(observer,target)||{};
  // Identity ages are live authority; a high score or stale callback cannot
  // substitute a missing/adolescent actor's age.
  return {...context,selfAge:self.ageYears,age:other.ageYears};
 }
 function willingContext(observer,target){const context=relationContext(observer,target);return !!context&&relationshipInteractionEligible('private-company',context);}
 function pairGate(emperor,target,event=null,{place=true}={}){
  if(!validId(emperor)||!validId(target)||emperor===target)return {ok:false,reason:'invalid-pair'};
  if(!permitted(emperor,target))return {ok:false,reason:venuePolicy?'venue-pair-required':'current-emperor-required'};
  const left=identity(emperor),right=identity(target);if(!left||!right)return {ok:false,reason:'adult-current-identity-required'};
  const people=roster();
  if(event){
   for(const id of event.participants){const current=identity(id),frozen=event.identities[id];if(!current||JSON.stringify(current)!==JSON.stringify(frozen))return {ok:false,reason:'identity-changed'};
    if(refs.has(id)&&people.find(a=>idOf(a)===id)!==refs.get(id))return {ok:false,reason:'actor-replaced'};
   }
  }
  if(![emperor,target].every(id=>available(id,event)))return {ok:false,reason:'actor-unavailable'};
  if(!willingContext(emperor,target)||!willingContext(target,emperor))return {ok:false,reason:'relationship-unavailable'};
  if(!place)return {ok:true,identities:{[emperor]:left,[target]:right}};
  const resolved=getPlace([emperor,target],event?copy(event):null),p=resolved?.ok===true?resolved.place:null;
  if(!p||p.private!==true||!validId(p.roomId)||typeof p.id!=='string')return {ok:false,reason:resolved?.reason||'emperor-bedroom-unavailable'};
  if(event?.place&&(p.id!==event.place.id||p.roomId!==event.place.roomId||JSON.stringify(p.points)!==JSON.stringify(event.place.points)))return {ok:false,reason:'place-changed'};
  return {ok:true,place:copy(p),identities:{[emperor]:left,[target]:right}};
 }
 function decision(observer,target){
  const context=relationContext(observer,target)||{},factors=getFactors(observer,target)||{};
  const profile=context.selfProfile||context.observerProfile||{},traits=context.traits||profile.traits||{},needs=context.needs||profile.needs||{};
  const probability=Math.max(.05,Math.min(.95,.38+signed(context.relation)*.18+signed(context.opinion)*.08+signed(context.trust)*.12+unit(traits.sociability??.5)*.10+unit(needs.social??.5)*.08-unit(needs.fatigue)*.25-unit(needs.hunger)*.22+Math.max(-.04,Math.min(.04,factors.acceptanceAppearance||0))+Math.max(-.12,Math.min(.10,factors.acceptanceContext||0))));
  const roll=random();return {roll,chance:probability,accepted:roll<probability,receptivity:unit(probability),at:data.time};
 }
 const pairKey=(emperor,target)=>{const ids=venuePolicy?[emperor,target].sort():[emperor,target];return ids.map(encodeURIComponent).join('|');};
 const attemptedTonight=(emperor,target)=>data.nightAttempts[pairKey(emperor,target)]===nightKey();
 function candidates(id=emperorId()){
  if(!venuePolicy&&id!==emperorId())return [];
  return roster().map(actor=>idOf(actor)).filter(target=>target!==id&&identity(target)&&!attemptedTonight(id,target)&&data.time>=(data.cooldowns[target]||0)&&pairGate(id,target,null,{place:false}).ok);
 }
 function freezeActors(event){const people=roster();refs=new Map(event.participants.map(id=>[id,people.find(a=>idOf(a)===id)]));if(venuePolicy&&!holdSocialActors(event.participants.filter(id=>id!=='player'),owner))cancel('actor-held');}
 function makeEvent(emperor,target,stage,source,checked){
  const serial=data.nextSerial++;data.nightAttempts[pairKey(emperor,target)]=nightKey();
  return {id:`${prefix}:${encodeURIComponent(emperor)}:${encodeURIComponent(target)}:${serial}`,serial,emperorId:emperor,targetId:target,participants:[emperor,target],stage,source,...(venuePolicy?{initiatorId:emperor,venue:prefix}:{}),night:nightKey(),identities:checked.identities,place:checked.place,consent:{[emperor]:false,[target]:false},decisions:{},createdAt:data.time,stageAt:data.time,elapsed:0,duration:10};
 }
 function prepare(emperor,target,stage,source){
  if(disposed||loadError)return {ok:false,reason:loadError||'disposed'};
  if(saveBlocked)return {ok:false,reason:'save-failed'};
  if(data.active)return {ok:false,reason:'invitation-active'};
  if(nightKey()===null)return {ok:false,reason:'night-required'};
  if(attemptedTonight(emperor,target))return {ok:false,reason:'already-invited-tonight'};
  if(data.time<(data.cooldowns[target]||0))return {ok:false,reason:'invitation-cooldown'};
  const checked=pairGate(emperor,target);if(!checked.ok)return checked;
  const result=transaction(()=>{
   const event=makeEvent(emperor,target,stage,source,checked);data.active=event;
   if(stage==='selected'&&emperor!=='player'){
    event.decisions[emperor]=decision(emperor,target);event.consent[emperor]=event.decisions[emperor].accepted;
    if(!event.consent[emperor]){event.stage='declined';event.reason=venuePolicy?'initiator-declined':'emperor-declined';event.endedAt=data.time;data.history.push(copy(event));data.history=data.history.slice(-32);data.active=null;data.cooldowns[target]=data.time+pairCooldownSeconds;}
   }
   return copy(event);
  });
  if(!result.ok)return result;
  if(data.active)freezeActors(data.active);notify(result.value);return {ok:true,event:copy(result.value)};
 }
 function select(emperor,target){return prepare(emperor,target,'selected',venuePolicy?'personal-selection':'emperor-selection');}
 function request(requester='player'){
  if(requester!=='player')return {ok:false,reason:'player-request-required'};
  const emperor=emperorId();if(!emperor||emperor===requester)return {ok:false,reason:'non-emperor-request-required'};
  return prepare(emperor,requester,'requested','personal-request');
 }
 function failTransition(result){if(!result.ok&&data.active)cancel(result.reason);return result;}
 function transition(change){const result=transaction(()=>{change(data.active);return copy(data.active);});if(!result.ok)return failTransition(result);notify();return {ok:true,event:status()};}
 function startJourney(){
  const event=data.active;if(!event||!event.participants.every(id=>event.consent[id]===true))return {ok:false,reason:'mutual-consent-required'};
  const checked=pairGate(event.emperorId,event.targetId,event);if(!checked.ok){cancel(checked.reason);return checked;}
  const npcIds=event.participants.filter(id=>id!=='player');
  if(!holdSocialActors(npcIds,owner)){cancel('actor-held');return {ok:false,reason:'actor-held'};}
  // The consent and travelling state must be durable before the adapter may
  // claim furniture or move any actor. A thrown/failed adapter returns leases.
  const result=transition(e=>{e.stage='travelling';e.stageAt=data.time;});if(!result.ok)return result;
  try{journey=createJourney(copy(data.active),copy(data.active.place));}catch{journey=null;}
  if(!journey||typeof journey.update!=='function'||journey.state?.()?.ok===false){cancel('journey-unavailable');return {ok:false,reason:'journey-unavailable'};}
  return {ok:true,event:status()};
 }
 function respond(eventId,actorId,accepted){
  const event=data.active;
  if(!event||event.id!==eventId)return {ok:false,reason:'stale-invitation'};
  if(actorId!=='player'||!event.participants.includes(actorId))return {ok:false,reason:'explicit-player-response-required'};
  if(!['summoned','awaiting-response'].includes(event.stage))return {ok:false,reason:'response-not-due'};
  if(accepted!==true&&accepted!==false)return {ok:false,reason:'explicit-response-required'};
  const checked=pairGate(event.emperorId,event.targetId,event);if(!checked.ok){cancel(checked.reason);return checked;}
  if(!accepted)return settle('declined','player-declined');
  if(event.consent[actorId])return {ok:true,replayed:true,event:status()};
  const result=transition(e=>{e.consent[actorId]=true;e.decisions[actorId]={accepted:true,explicit:true,at:data.time};});if(!result.ok)return result;
  return data.active?.participants.every(id=>data.active.consent[id]===true)?startJourney():result;
 }
 function withdraw(actorId){if(!data.active?.participants.includes(actorId))return {ok:false,reason:'not-participant'};return cancel('withdrawn');}
 function complete(){
  const event=data.active;if(!event||event.stage!=='together'||event.elapsed<10)return {ok:false,reason:'not-complete'};
  const checked=pairGate(event.emperorId,event.targetId,event);if(!checked.ok){cancel(checked.reason);return checked;}
  if(!event.participants.every(id=>event.consent[id]===true)){cancel('withdrawn');return {ok:false,reason:'mutual-consent-required'};}
  const result=transaction(()=>{
   const e=data.active;e.results=[];
   for(const id of e.participants){
    const target=e.participants.find(other=>other!==id),context=relationContext(id,target)||{};
    const outcome=relationshipInteractionOutcome('private-company',{...context,explicitConsent:true,receptivity:e.decisions[id]?.receptivity??.5});
    if(!outcome)throw Error('No consenting result');
    const p=data.people[id]??={relations:{},opinions:{},trust:{},interactions:{}};
    p.relations[target]=signed((p.relations[target]||0)+outcome.relation);p.opinions[target]=signed((p.opinions[target]||0)+outcome.opinion);p.trust[target]=signed((p.trust[target]||0)+outcome.trust);
    const memory=p.interactions[target]??={completedCount:0,trust:0};memory.completedCount++;memory.trust=signed(memory.trust+outcome.trust);memory.lastCompletedId=e.id;memory.lastConsentEventId=e.id;
    e.results.push({actorId:id,targetId:target,...outcome});
   }
   e.stage='completed';e.endedAt=data.time;data.history.push(copy(e));data.history=data.history.slice(-32);data.cooldowns[e.targetId]=data.time+pairCooldownSeconds;data.active=null;return copy(e);
  });
  if(!result.ok){cancel(result.reason);return result;}
  release('completed');notify(result.value);safeCall(onComplete,copy(result.value));return {ok:true,event:copy(result.value)};
 }
 function nightKey(){const clock=getClock()||{},hour=clock.hour??(finite(clock.minute)?clock.minute/60:null);if(!finite(clock.day)||!finite(hour)||!(hour>=19||hour<5))return null;return `${Math.floor(clock.day)-(hour<5?1:0)}`;}
 function opportunity(){
  const result=transaction(()=>{
   data.nextOpportunity=data.time+Math.max(30,opportunitySeconds);
   const night=nightKey();if(night===null||night===data.lastNight)return null;
   const initiators=venuePolicy?roster().map(idOf).filter(id=>id!=='player'&&candidates(id).length).sort():[],emperor=venuePolicy?(initiators.length?initiators[Math.floor(random()*initiators.length)]:null):emperorId();if(!emperor||emperor==='player')return null;
   const pool=candidates(emperor).sort();if(!pool.length)return null;
   data.lastNight=night;
   // One action roll, then one weighted target draw. A large roster creates
   // neither extra invitations nor fallback retries for a refusing person.
   const actionRoll=random(),targetRoll=random();
   const weights=pool.map(id=>{const c=relationContext(emperor,id)||{},f=getFactors(emperor,id)||{};return .2+unit(f.attraction)*.4+unit(c.relation)*.2+unit(c.trust)*.2;});
   const total=weights.reduce((a,b)=>a+b,0);let at=targetRoll*total,index=0;while(index<weights.length-1&&at>=weights[index])at-=weights[index++];
   const target=pool[index],factor=getFactors(emperor,target)||{};if(actionRoll>=.25+unit(factor.attraction)*.3)return null;
   const checked=pairGate(emperor,target);if(!checked.ok)return null;
   const event=makeEvent(emperor,target,'selected','autonomous-night',checked);event.decisions[emperor]=decision(emperor,target);event.consent[emperor]=event.decisions[emperor].accepted;
   if(event.consent[emperor])data.active=event;else{event.stage='declined';event.reason=venuePolicy?'initiator-declined':'emperor-declined';event.endedAt=data.time;data.history.push(copy(event));data.history=data.history.slice(-32);data.cooldowns[target]=data.time+pairCooldownSeconds;}
   return copy(event);
  });
  if(!result.ok){saveBlocked=true;retryAt=data.time+5;return;}
  if(data.active)freezeActors(data.active);if(result.value)notify(result.value);
 }
 function update(dt){
  if(disposed||loadError||!finite(dt)||dt<=0)return;data.time+=dt;
  if(saveBlocked){if(data.time>=retryAt){saveBlocked=!persist();retryAt=data.time+5;}return;}
  const event=data.active;
  if(!event){if(data.time>=data.nextOpportunity)opportunity();return;}
  const checked=pairGate(event.emperorId,event.targetId,event);if(!checked.ok){cancel(checked.reason);return;}
  if(event.stage==='requested'){
   if(data.time-event.stageAt<responseSeconds)return;
   const result=transition(e=>{e.decisions[e.emperorId]=decision(e.emperorId,e.targetId);e.consent[e.emperorId]=e.decisions[e.emperorId].accepted;e.stage='selected';e.stageAt=data.time;});
   if(result.ok&&!data.active.consent[event.emperorId])settle('declined','emperor-declined');return;
  }
  if(event.stage==='selected'){if(data.time-event.stageAt>=dispatchSeconds)transition(e=>{e.stage='summoned';e.stageAt=data.time;});return;}
  if(event.stage==='summoned'){
   if(data.time-event.stageAt<responseSeconds)return;
   const result=transition(e=>{
    for(const id of e.participants){if(id==='player'||e.consent[id]===true)continue;e.decisions[id]=decision(id,e.participants.find(other=>other!==id));e.consent[id]=e.decisions[id].accepted;}
    e.stage='awaiting-response';e.stageAt=data.time;
   });
   if(!result.ok)return;
   if(data.active.participants.some(id=>id!=='player'&&data.active.consent[id]!==true)){settle('declined','recipient-declined');return;}
   if(data.active.participants.every(id=>data.active.consent[id]===true))startJourney();return;
  }
  if(event.stage==='awaiting-response'){if(data.time-event.stageAt>=responseTimeout)cancel('response-expired');return;}
  if(!event.participants.every(id=>event.consent[id]===true)){cancel('withdrawn');return;}
  let progress;try{progress=journey?.update(dt);}catch{progress=null;}
  if(!progress?.ok){cancel(progress?.reason||'journey-lost');return;}
  if(event.stage==='travelling'){
   if(data.time-event.stageAt>90){cancel('route-timeout');return;}
   if(progress.phase==='arrived'){
    const result=transition(e=>{e.stage='together';e.stageAt=data.time;e.elapsed=0;});
    if(result.ok)safeCall(onPrivateFade,true,status());
   }return;
  }
  if(progress.phase!=='arrived'){cancel('left-place');return;}
  event.elapsed=Math.min(10,event.elapsed+dt);
  if(event.elapsed>=10)complete();
 }
 function project(id,base){const own=data.people[id];return !own?base:{...base,relations:add(base?.relations,own.relations),opinions:add(base?.opinions,own.opinions),trust:add(base?.trust,own.trust),interactions:mergeSocialMemories(base?.interactions,own.interactions)};}
 function restore(state){
  release('restore');data=fresh();saveBlocked=false;loadError=null;restoreSource=copy(state);
  if(state==null)return true;
  const valid=state.version===1&&finite(state.time)&&state.time>=0&&finite(state.nextOpportunity)&&Number.isInteger(state.random)&&Number.isSafeInteger(state.nextSerial)&&state.nextSerial>=1&&Array.isArray(state.history)&&state.history.length<=32&&state.people&&typeof state.people==='object'&&state.cooldowns&&typeof state.cooldowns==='object';
  if(!valid){loadError='invalid-saved-state';return false;}
  const events=[...state.history,...(state.active?[state.active]:[])];
  if(events.some(e=>!validId(e.emperorId)||!validId(e.targetId)||e.emperorId===e.targetId||!Number.isSafeInteger(e.serial)||e.serial<1||e.serial>=state.nextSerial||e.id!==`${prefix}:${encodeURIComponent(e.emperorId)}:${encodeURIComponent(e.targetId)}:${e.serial}`||!Array.isArray(e.participants)||e.participants.join('|')!==[e.emperorId,e.targetId].join('|')||!e.identities||!e.consent||!(activeStages.has(e.stage)||['cancelled','declined','completed'].includes(e.stage)))){loadError='invalid-saved-state';return false;}
  for(const [id,p] of Object.entries(state.people)){
   if(!validId(id)||!p||['relations','opinions','trust'].some(key=>!p[key]||Object.entries(p[key]).some(([target,value])=>!validId(target)||!finite(value)||value< -1||value>1))||!p.interactions||Object.entries(p.interactions).some(([target,m])=>!validId(target)||!Number.isSafeInteger(m?.completedCount)||m.completedCount<0||!finite(m.trust)||m.trust< -1||m.trust>1)){loadError='invalid-saved-state';return false;}
  }
  data=copy(state);data.nightAttempts??={};
  // Older snapshots had only the short cooldown. Conservatively retain this
  // night's already-created pairs while accepting the original v1 save.
  if(!state.nightAttempts)for(const event of events)if((event.night??nightKey())!==null)data.nightAttempts[pairKey(event.emperorId,event.targetId)]=event.night??nightKey();
  data.nextOpportunity=Math.max(data.time+5,data.nextOpportunity);data.random=data.random>>>0||1;
  // No implicit consent, occupied bed, route, elapsed time or reward resumes.
  if(data.active){if(!activeStages.has(data.active.stage)){loadError='invalid-saved-state';data=fresh();return false;}settle('cancelled','restore-interrupted');}
  return true;
 }
 function pose(actor){const id=idOf(actor),event=data.active;if(!event||!['travelling','together'].includes(event.stage)||!event.participants.includes(id))return null;const other=roster().find(a=>idOf(a)===event.participants.find(x=>x!==id));return {walking:event.stage==='travelling'&&actor?.walking===true,target:other?.root?.position||null,label:eventLabels[event.stage]};}
 restore(saved);
 return {update,snapshot,restore,status,history:()=>copy(data.history),select,request,respond,cancel,withdraw,candidates,project,pose,
  owns:actor=>!!data.active&&['travelling','together'].includes(data.active.stage)&&data.active.participants.includes(idOf(actor)),
  get loadError(){return loadError;},get saveBlocked(){return saveBlocked;},
  dispose(){if(loadError){release('region-unloaded');disposed=true;return;}if(data.active)cancel('region-unloaded');else{release('region-unloaded');persist();}disposed=true;},
 };
}
