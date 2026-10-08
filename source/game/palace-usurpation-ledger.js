import {
  PALACE_USURPATION_VERSION, PALACE_USURPATION_DEFAULTS as RULES, PALACE_USURPATION_ROUTES as ROUTES,
  palaceUsurpationObject as object, palaceUsurpationIdentifier as identifier, palaceUsurpationInteger as integer,
  palaceUsurpationTime as time, palaceUsurpationAfter as after, palaceUsurpationMinutes as minutes,
  palaceUsurpationCopy as copy, palaceUsurpationSame as same, palaceUsurpationCaseId as caseId,
  palaceUsurpationRoll as roll, palaceUsurpationContext as contextSnapshot,
  palaceUsurpationSupporters as supporters, palaceUsurpationUnlock as unlock,
  palaceUsurpationPledgeDecision as pledgeDecision, palaceUsurpationActivePledges as activePledges,
  palaceUsurpationResolution as resolution,
} from './palace-usurpation-policy.js';

export {PALACE_USURPATION_DEFAULTS, PALACE_USURPATION_ROUTES, palaceUsurpationCaseId, palaceUsurpationRoll} from './palace-usurpation-policy.js';
const ROUTE_IDS=ROUTES.map(r=>r.id),OPEN=new Set(['planning','ready-for-investiture']);
const PREPARATIONS=[...ROUTE_IDS,'acclamation'];
const fail=code=>{throw new Error(code);};
const need=(condition,code)=>{if(!condition)fail(code);};
const latest=s=>s.cases.at(-1)||null;
const named=(r,id,bodyId)=>r.participants.some(p=>p.actorId===id&&p.bodyId===bodyId);
const person=(c,id)=>id===c.player.id?c.player:id===c.emperor.id?c.emperor:c.supporters.find(p=>p.id===id)||c.guard.guards.find(p=>p.id===id);
const idList=(ids,min=1)=>Array.isArray(ids)&&ids.length>=min&&ids.every(identifier)&&new Set(ids).size===ids.length;
const exactKeys=(value,keys)=>object(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const routes=ids=>ROUTE_IDS.filter(id=>ids.includes(id));
const identity=p=>({actorId:p.id,bodyId:p.bodyId,name:p.name,roleId:p.roleId,circleId:p.circleId});
const empty=seed=>({version:PALACE_USURPATION_VERSION,worldSeed:seed>>>0,revision:0,events:[],cases:[],office:{
  actorId:'cn-emperor',bodyId:null,revision:0,since:null,residence:null,formerEmperors:[],
}});
function validContext(c) {
  return object(c)&&same(c,contextSnapshot(c))&&Array.isArray(c.supporters)&&
    c.supporters.every(p=>object(p)&&identifier(p.id)&&identifier(p.bodyId)&&typeof p.name==='string')&&
    new Set(c.supporters.map(p=>p.id)).size===c.supporters.length&&new Set(c.supporters.map(p=>p.bodyId)).size===c.supporters.length&&
    c.guard.guards.every(p=>identifier(p.id)&&identifier(p.bodyId))&&
    new Set(c.guard.guards.map(p=>p.id)).size===c.guard.guards.length&&new Set(c.guard.guards.map(p=>p.bodyId)).size===c.guard.guards.length;
}
function baseReasons(c,state,task=null) {
  const reasons=[];
  if(!validContext(c))return ['world-context-unavailable'];
  if(c.player.id!=='player'||!identifier(c.player.bodyId)||!(c.player.ageYears>=18)||!c.player.alive)reasons.push('adult-living-player-required');
  if(c.emperor.id!==state.office.actorId||c.emperor.id==='player'||!identifier(c.emperor.bodyId)||!c.emperor.alive||
    c.emperor.tenureRevision!==state.office.revision||state.office.bodyId!==null&&c.emperor.bodyId!==state.office.bodyId)reasons.push('emperor-tenure-changed');
  if(task&&(c.player.bodyId!==task.playerBodyId||c.emperor.id!==task.emperor.id||c.emperor.bodyId!==task.emperor.bodyId||c.emperor.tenureRevision!==task.emperor.revision))reasons.push('case-identity-changed');
  if(c.player.bodyId===c.emperor.bodyId)reasons.push('distinct-bodies-required');
  return reasons;
}
function envelope(receipt,kind,task,context,notBefore,now) {
  if(!object(receipt)||receipt.kind!==kind||!identifier(receipt.id)||receipt.caseId!==task.id||receipt.playerId!==task.playerId||receipt.playerBodyId!==task.playerBodyId||
    receipt.emperorId!==task.emperor.id||receipt.emperorBodyId!==task.emperor.bodyId||receipt.emperorRevision!==task.emperor.revision||
    !identifier(receipt.actorId)||!identifier(receipt.actorBodyId)||!identifier(receipt.targetId)||!identifier(receipt.objectId)||receipt.completed!==true||
    !time(receipt.at)||!after(receipt.at,notBefore)||!after(now,receipt.at)||!Array.isArray(receipt.participants)||receipt.participants.length<1||
    receipt.participants.some(p=>!exactKeys(p,['actorId','bodyId'])||!identifier(p.actorId)||!identifier(p.bodyId))||
    new Set(receipt.participants.map(p=>p.actorId)).size!==receipt.participants.length||new Set(receipt.participants.map(p=>p.bodyId)).size!==receipt.participants.length||
    !named(receipt,task.playerId,task.playerBodyId)||!named(receipt,receipt.actorId,receipt.actorBodyId))return false;
  return receipt.participants.every(p=>person(context,p.actorId)?.bodyId===p.bodyId)&&person(context,receipt.actorId)?.bodyId===receipt.actorBodyId;
}
function normalizeReceipt(raw) {
  const receipt=copy(raw);
  if(Array.isArray(receipt?.participants))receipt.participants.sort((a,b)=>String(a.actorId).localeCompare(String(b.actorId)));
  for(const key of ['guardIds','officialIds','supporterIds'])if(Array.isArray(receipt?.[key]))receipt[key].sort();
  if(receipt?.safeHandoff)receipt.safeHandoff=normalizeReceipt(receipt.safeHandoff);
  return receipt;
}
function acceptedPeople(task,c) {
  return activePledges(task,c).map(p=>({...p,person:supporters(c).find(a=>a.id===p.actorId)}));
}
function acclamationPeople(task,c,ids) {
  const accepted=acceptedPeople(task,c).filter(p=>ids.includes(p.actorId));
  return accepted.length===ids.length&&accepted.length>=RULES.supporters&&new Set(accepted.map(p=>p.circleId)).size>=RULES.circles?accepted:null;
}
function routeRequirements(task,c,route) {
  const pledges=acceptedPeople(task,c),prepared=!!task.preparations[route];
  if(route==='guard')return [
    {id:'commander',label:'现任卫队负责人明确响应',met:pledges.some(p=>p.actorId===c?.guard.commanderId&&p.person.guardCommander)},
    {id:'guards',label:'现有两名守卫实际集结',met:prepared},
  ];
  if(route==='abdication')return [
    {id:'officials',label:'关键官员逐人作出政治承诺',met:pledges.filter(p=>p.person.official).length>=RULES.officials},
    {id:'confrontation',label:'具名官员到场联合对质',met:prepared},
  ];
  return [{id:'meal',label:'原帝已用原膳，独立剧情动作完成',met:prepared}];
}
function preparedStillValid(task,c,route) {
  const receipt=task.preparations[route];if(!receipt)return false;
  if(route==='guard')return receipt.commanderId===c.guard.commanderId&&routeRequirements(task,c,route).every(r=>r.met)&&
    receipt.guardIds.every(id=>c.guard.guards.some(g=>g.id===id&&named(receipt,g.id,g.bodyId)));
  if(route==='abdication')return receipt.officialIds.every(id=>acceptedPeople(task,c).some(p=>p.actorId===id&&p.person.official));
  return c.emperor.alive;
}
function readiness(task,c) {
  const reasons=[];
  if(!validContext(c))return ['world-context-unavailable'];
  if(!task.selectedRoutes.length)reasons.push('select-a-route');
  for(const route of task.selectedRoutes)if(!preparedStillValid(task,c,route))reasons.push(`${route}-preparation-required`);
  const pledges=activePledges(task,c);
  if(pledges.length<RULES.supporters||new Set(pledges.map(p=>p.circleId)).size<RULES.circles)reasons.push('cross-circle-political-response-required');
  if(!['itemsSettled','meetingsSettled','actorTransitionsSafe'].every(k=>c.safety[k]===true))reasons.push('safe-resolution-required');
  return reasons;
}
function collectReceiptIds(state) {
  return new Set(state.events.flatMap(e=>e.receipt?[e.receipt.id,...(e.receipt.safeHandoff?[e.receipt.safeHandoff.id]:[])]:[]));
}
function checkReceipt(r,kind,p,c,event,state) {
  need(envelope(r,kind,p,c,state.events.at(-1)?.at||p.startedAt,event.at),'physical-evidence-required');
  need(!collectReceiptIds(state).has(r.id),'evidence-already-used');
}
function checkPreparation(kind,r,p,c,event,state) {
  checkReceipt(r,kind,p,c,event,state);
  if(kind==='intrigue') {
    const meal=r.meal;
    need(object(meal)&&identifier(meal.orderId)&&identifier(meal.objectId)&&meal.objectId===r.objectId&&meal.consumerId===p.emperor.id&&
      meal.consumerBodyId===p.emperor.bodyId&&meal.status==='consumed'&&identifier(r.storyActionId)&&
      ![r.id,meal.orderId,meal.objectId].includes(r.storyActionId),'consumed-meal-and-story-required');
    need(!state.cases.some(previous=>previous.preparations.intrigue&&
      (previous.preparations.intrigue.storyActionId===r.storyActionId||previous.preparations.intrigue.meal.orderId===meal.orderId||previous.preparations.intrigue.meal.objectId===meal.objectId)),'meal-or-story-already-used');
    need(named(r,p.emperor.id,p.emperor.bodyId),'original-emperor-presence-required');
  } else if(kind==='guard') {
    const commander=acceptedPeople(p,c).find(a=>a.actorId===r.commanderId&&a.person.guardCommander);
    need(r.commanderId===c.guard.commanderId&&commander&&named(r,commander.actorId,commander.bodyId),'commander-response-required');
    need(idList(r.guardIds,RULES.guards)&&r.guardIds.length===RULES.guards&&r.guardIds.every(id=>
      id!==p.playerId&&id!==p.emperor.id&&c.guard.guards.some(g=>g.id===id&&named(r,g.id,g.bodyId))),'real-guards-required');
  } else if(kind==='abdication') {
    need(idList(r.officialIds,RULES.officials)&&r.officialIds.every(id=>acceptedPeople(p,c).some(a=>a.actorId===id&&a.person.official&&named(r,id,a.bodyId))),'official-commitments-required');
    need(named(r,p.emperor.id,p.emperor.bodyId),'original-emperor-presence-required');
  } else {
    need(idList(r.supporterIds,RULES.supporters),'named-acclamation-required');
    const people=acclamationPeople(p,c,r.supporterIds);
    need(people&&people.every(a=>named(r,a.actorId,a.bodyId)),'cross-circle-acclamation-required');
  }
}
function applyEvent(state,event) {
  need(object(event)&&typeof event.type==='string'&&time(event.at)&&validContext(event.context),'invalid-event');
  need(!state.events.length||after(event.at,state.events.at(-1).at),'invalid-clock');
  const next=copy(state),c=event.context,p=latest(next),now=event.at;
  if(event.type==='begin') {
    need(exactKeys(event,['type','at','context','caseId']),'invalid-event');
    const blocked=baseReasons(c,next);need(!blocked.length,blocked[0]);
    need(next.office.actorId!=='player','already-emperor');
    need(!p||!OPEN.has(p.stage),'case-pending');
    need(!p?.cooldownUntil||after(now,p.cooldownUntil),'case-cooldown');
    const support=unlock(c);need(support.ok,'support-not-established');
    const id=caseId(next.cases.length+1,next.office.revision);need(event.caseId===id,'case-id-conflict');
    if(next.office.bodyId===null)next.office.bodyId=c.emperor.bodyId;
    next.cases.push({id,sequence:next.cases.length+1,playerId:c.player.id,playerBodyId:c.player.bodyId,
      emperor:{id:c.emperor.id,bodyId:c.emperor.bodyId,revision:c.emperor.tenureRevision},
      stage:'planning',startedAt:copy(now),endedAt:null,cooldownUntil:null,
      initialSupport:support.supporters.map(identity),experience:copy(c.experience),selectedRoutes:[],pledges:[],
      preparations:{intrigue:null,guard:null,abdication:null,acclamation:null},
      roll:roll(next.worldSeed,`${id}:resolution`),resolution:null,investiture:null,abandonment:null,
    });
  } else {
    need(p&&event.caseId===p.id,'stale-case');
    need(OPEN.has(p.stage),'case-closed');
    const blocked=baseReasons(c,next,p);need(!blocked.length,blocked[0]);
    for(const route of ROUTE_IDS)p.experience[route]=Math.max(p.experience[route],c.experience[route]);
    if(event.type==='select-route') {
      need(exactKeys(event,['type','at','context','caseId','routes'])&&p.stage==='planning','wrong-case-stage');
      need(idList(event.routes,0)&&event.routes.every(r=>ROUTE_IDS.includes(r))&&same(event.routes,routes(event.routes)),'invalid-route');
      p.selectedRoutes=copy(event.routes);
    } else if(event.type==='pledge') {
      need(exactKeys(event,['type','at','context','caseId','actorId','receipt']),'invalid-event');
      const npc=supporters(c).find(a=>a.id===event.actorId);
      need(npc,'eligible-person-required');need(!p.pledges.some(a=>a.actorId===npc.id),'political-decision-recorded');
      checkReceipt(event.receipt,'political-response',p,c,event,state);
      need(event.receipt.actorId===npc.id&&event.receipt.actorBodyId===npc.bodyId&&Number.isFinite(event.receipt.durationSeconds)&&event.receipt.durationSeconds>=RULES.politicalResponseSeconds,'separate-political-response-required');
      p.pledges.push({...identity(npc),receipt:copy(event.receipt),...pledgeDecision(next.worldSeed,p.id,npc),withdrawn:false});
    } else if(event.type==='prepare') {
      need(exactKeys(event,['type','at','context','caseId','kind','receipt'])&&PREPARATIONS.includes(event.kind),'invalid-preparation');
      need(p.stage==='planning'||event.kind==='acclamation'&&p.stage==='ready-for-investiture','wrong-case-stage');
      need(!p.preparations[event.kind],'preparation-recorded');
      checkPreparation(event.kind,event.receipt,p,c,event,state);p.preparations[event.kind]=copy(event.receipt);
    } else if(event.type==='resolve') {
      need(exactKeys(event,['type','at','context','caseId','receipt'])&&p.stage==='planning','wrong-case-stage');
      const reasons=readiness(p,c);need(!reasons.length,reasons[0]);
      checkReceipt(event.receipt,'mechanism-resolution',p,c,event,state);
      need(named(event.receipt,p.emperor.id,p.emperor.bodyId),'original-emperor-presence-required');
      const outcome=resolution(next.worldSeed,p,c);
      p.resolution={...outcome,receipt:copy(event.receipt),routes:copy(p.selectedRoutes),at:copy(event.receipt.at)};
      if(outcome.passed)p.stage='ready-for-investiture';
      else {
        p.stage='failed';p.endedAt=copy(event.receipt.at);p.cooldownUntil={day:event.receipt.at.day+RULES.cooldownDays,hour:event.receipt.at.hour};
        // Failure can lose some allies, never lives, money, property or kinship.
        for(const pledge of p.pledges)if(pledge.accepted&&roll(next.worldSeed,`${p.id}:withdraw:${pledge.actorId}`)<.35)pledge.withdrawn=true;
      }
    } else if(event.type==='investiture') {
      need(exactKeys(event,['type','at','context','caseId','receipt'])&&p.stage==='ready-for-investiture'&&p.resolution?.passed,'wrong-case-stage');
      const acclamation=p.preparations.acclamation;
      need(acclamation&&acclamationPeople(p,c,acclamation.supporterIds),'cross-circle-acclamation-required');
      need(Object.values(c.safety).every(v=>v===true),'safe-handoff-required');
      need(c.residences.player&&c.residences.formerEmperor&&c.residences.player.roomId!==c.residences.formerEmperor.roomId&&c.residences.player.bedId!==c.residences.formerEmperor.bedId,'verified-residences-required');
      const r=event.receipt,h=r?.safeHandoff;
      checkReceipt(r,'investiture-reading',p,c,event,state);
      need(identifier(r.documentId)&&r.objectId===r.documentId,'same-investiture-document-required');
      need(envelope(h,'safe-handoff',p,c,state.events.at(-1)?.at||p.startedAt,r.at)&&h.id!==r.id&&!collectReceiptIds(state).has(h.id)&&same(h.residences,c.residences),'safe-handoff-required');
      need(acclamation.supporterIds.every(id=>{const a=acceptedPeople(p,c).find(a=>a.actorId===id);return a&&named(r,a.actorId,a.bodyId);})&&named(r,p.emperor.id,p.emperor.bodyId),'named-investiture-witnesses-required');
      p.stage='invested';p.endedAt=copy(r.at);p.investiture={receipt:copy(r),at:copy(r.at),officeRevision:next.office.revision+1};
      const former={actorId:p.emperor.id,bodyId:p.emperor.bodyId,revision:p.emperor.revision,endedAt:copy(r.at),alive:true,residence:copy(c.residences.formerEmperor),reason:'peaceful-loss-of-office',caseId:p.id};
      next.office={actorId:p.playerId,bodyId:p.playerBodyId,revision:next.office.revision+1,since:copy(r.at),residence:copy(c.residences.player),formerEmperors:[...next.office.formerEmperors,former]};
    } else if(event.type==='abandon') {
      need(exactKeys(event,['type','at','context','caseId','confirmed'])&&event.confirmed===true,'explicit-abandonment-required');
      need(p.stage==='planning','resolved-case-cannot-be-abandoned');
      p.stage='abandoned';p.endedAt=copy(now);p.cooldownUntil={day:now.day+RULES.cooldownDays,hour:now.hour};p.abandonment={at:copy(now),reason:'player-abandoned'};
    } else fail('unknown-event');
  }
  next.events.push(copy(event));next.revision++;
  return next;
}
function restore(saved,seed) {
  need(exactKeys(saved,['version','worldSeed','revision','events','cases','office'])&&saved.version===PALACE_USURPATION_VERSION&&saved.worldSeed===(seed>>>0)&&integer(saved.revision)&&Array.isArray(saved.events)&&saved.revision===saved.events.length,'invalid-usurpation-state');
  let rebuilt=empty(seed);
  for(const event of saved.events)rebuilt=applyEvent(rebuilt,event);
  need(same(rebuilt,saved),'invalid-usurpation-state');
  return rebuilt;
}

/**
 * The host must feature-gate the task until all real-world adapters are wired.
 * verifyEvidence looks up an actual completed event with every supplied identity,
 * object, time and participant; only synchronous true accepts it. UI flags cannot
 * supply evidence. saveState atomically persists the detached ledger alongside
 * the physical controller. Only synchronous true commits; a Promise/throw/false
 * retains the previous state and the host's same completed checkpoint for retry.
 * This ledger never mutates the host's career, property, paper, kinship or actors.
 */
export function createPalaceUsurpation({saved,worldSeed=0,getClock,getContext,verifyEvidence,saveState}={}) {
  let current=empty(worldSeed),loadError=null,lastError=null,busy=false;
  if(saved!==undefined&&saved!==null)try {current=restore(copy(saved),worldSeed);} catch {loadError='invalid-usurpation-state';}
  const readContext=()=>{try{return contextSnapshot(getContext?.());}catch{return null;}};
  const clock=()=>{try{const at=getClock?.();return time(at)?{day:at.day,hour:at.hour}:null;}catch{return null;}};
  const error=code=>{lastError=code;return {ok:false,code};};
  const result=(p,extra={})=>({ok:true,code:p?.stage||'recorded',caseId:p?.id||null,revision:current.revision,...extra});
  const find=id=>current.cases.find(p=>p.id===id);
  function replay(receipt,previous,task) {
    if(!previous)return null;
    try{return same(normalizeReceipt(receipt),previous)?result(task,{replayed:true}):error('evidence-conflict');}catch{return error('evidence-conflict');}
  }
  function verified(r) {
    if(typeof verifyEvidence!=='function')return false;
    const expected={caseId:r.caseId,kind:r.kind,playerId:r.playerId,playerBodyId:r.playerBodyId,emperorId:r.emperorId,emperorBodyId:r.emperorBodyId,emperorRevision:r.emperorRevision,actorId:r.actorId,actorBodyId:r.actorBodyId,targetId:r.targetId,objectId:r.objectId};
    try {const result=verifyEvidence(copy(r),copy(expected));if(result&&typeof result.then==='function')result.catch?.(()=>{});return result===true;}catch{return false;}
  }
  function mutate(type,payload) {
    if(loadError||busy)return error(loadError||'usurpation-busy');
    busy=true;
    try {
      const at=clock(),context=readContext();need(at,'invalid-clock');need(validContext(context),'world-context-unavailable');
      const event={type,at,context,...copy(payload)};
      if(event.receipt)event.receipt=normalizeReceipt(event.receipt);
      const next=applyEvent(current,event);
      if(event.receipt) {
        need(verified(event.receipt),'unverified-physical-evidence');
        if(event.receipt.safeHandoff)need(verified(event.receipt.safeHandoff),'unverified-safe-handoff');
      }
      need(typeof saveState==='function','save-unavailable');
      let written;try {written=saveState(copy(next));} catch {fail('save-failed');}
      if(written&&typeof written.then==='function')try{written.catch?.(()=>{});}catch{}
      need(written===true,'save-failed');
      current=next;lastError=null;return result(latest(current));
    } catch(e) {return error(e?.message||'usurpation-failed');} finally {busy=false;}
  }
  function availability() {
    const c=readContext(),at=clock(),p=latest(current),reasons=[];
    if(loadError)reasons.push(loadError);
    if(current.office.actorId==='player')reasons.push('already-emperor');
    else reasons.push(...baseReasons(c,current));
    if(!at||current.events.length&&!after(at,current.events.at(-1).at))reasons.push('invalid-clock');
    const support=unlock(c);if(!support.ok)reasons.push('support-not-established');
    if(p&&OPEN.has(p.stage))reasons.push('case-pending');
    if(at&&p?.cooldownUntil&&!after(at,p.cooldownUntil))reasons.push('case-cooldown');
    return {ok:!reasons.length,visible:!loadError&&(!!p||support.ok&&!baseReasons(c,current).length),reasons:[...new Set(reasons)],caseId:!reasons.length?caseId(current.cases.length+1,current.office.revision):p?.id||null,cooldownUntil:p?.cooldownUntil?copy(p.cooldownUntil):null};
  }
  function begin() {
    if(loadError)return error(loadError);
    const p=latest(current);if(p&&OPEN.has(p.stage))return result(p,{replayed:true});
    const available=availability();if(!available.ok)return error(available.reasons[0]);
    return mutate('begin',{caseId:available.caseId});
  }
  function selectRoute(id,routeIds) {
    const p=find(id),ids=typeof routeIds==='string'?[routeIds]:routeIds;
    if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(r=>!ROUTE_IDS.includes(r)))return error('invalid-route');
    const selected=routes(ids);if(p&&same(p.selectedRoutes,selected)&&p.stage==='planning')return result(p,{replayed:true});
    return mutate('select-route',{caseId:id,routes:selected});
  }
  function pledge(id,actorId,evidence) {
    const p=find(id),existing=p?.pledges.find(a=>a.actorId===actorId),replayed=replay(evidence,existing?.receipt,p);if(replayed)return {...replayed,...(replayed.ok?{accepted:existing.accepted}: {})};
    const out=mutate('pledge',{caseId:id,actorId,receipt:evidence});
    return out.ok?{...out,accepted:find(id).pledges.find(a=>a.actorId===actorId).accepted}:out;
  }
  function recordPreparation(id,kind,evidence) {
    if(!PREPARATIONS.includes(kind))return error('invalid-preparation');
    const p=find(id),replayed=replay(evidence,p?.preparations[kind],p);if(replayed)return replayed;
    return mutate('prepare',{caseId:id,kind,receipt:evidence});
  }
  function resolve(id,evidence) {
    const p=find(id),replayed=replay(evidence,p?.resolution?.receipt,p);if(replayed)return {...replayed,...(replayed.ok?{passed:p.resolution.passed}: {})};
    const out=mutate('resolve',{caseId:id,receipt:evidence});return out.ok?{...out,passed:find(id).resolution.passed}:out;
  }
  function investiture(id,evidence) {
    const p=find(id),replayed=replay(evidence,p?.investiture?.receipt,p);if(replayed)return replayed;
    return mutate('investiture',{caseId:id,receipt:evidence});
  }
  function abandon(id,options={}) {
    if(options?.confirmed!==true)return error('explicit-abandonment-required');
    const p=find(id);if(p?.stage==='abandoned')return result(p,{replayed:true});
    return mutate('abandon',{caseId:id,confirmed:true});
  }
  function view() {
    const a=availability(),c=readContext(),p=latest(current),at=clock(),revision=current.revision;
    const stage=p?.stage||(!a.visible?'locked':'available'),visible=a.visible;
    const status={planning:'尚在谋划', 'ready-for-investiture':'各项行动已形成局势，尚待拥立宣读',failed:'这次谋划失败',abandoned:'已放弃这次谋划',invested:'已登位'};
    const cooldown=p?.cooldownUntil&&at&&!after(at,p.cooldownUntil)?`需等到第${p.cooldownUntil.day}日 ${Math.floor(p.cooldownUntil.hour)}:${String(Math.floor(p.cooldownUntil.hour%1*60)).padStart(2,'0')} 才能重新谋划。`:null;
    const out={version:1,revision,visible,caseId:p?.id||null,stage,title:'篡位',summary:p?status[p.stage]:visible?'已有不同圈层的人认可你的做法，可开始一次谋划。':'',
      selectedRoutes:p?copy(p.selectedRoutes):[],conditions:[],routes:[],people:[],steps:[],actions:[],blockers:[],outcome:null,
      office:{actorId:current.office.actorId,revision:current.office.revision},cooldownLabel:cooldown,
      history:current.cases.filter(t=>!OPEN.has(t.stage)).map(t=>({caseId:t.id,stage:t.stage,label:status[t.stage],endedAt:copy(t.endedAt)})),
    };
    if(!visible)return out;
    const blocked=p&&OPEN.has(p.stage)?baseReasons(c,current,p):a.reasons;
    out.blockers=[...blocked];
    out.conditions=[{id:'adult',label:'成年且仍在世',met:c?.player.alive===true&&c.player.ageYears>=18},
      {id:'support',label:'已获得不同现有圈层的真实认可',met:unlock(c).ok},
      {id:'consent',label:'一般认可之后，还要逐人取得政治响应',met:!!p&&activePledges(p,c).length>=RULES.supporters},
    ];
    const action=(kind,label,enabled,extra={})=>out.actions.push({id:[p?.id||'palace-usurpation',kind,extra.routeId||extra.actorId||extra.preparationKind||'task'].join(':'),kind,label,enabled,caseId:p?.id||null,revision,...extra});
    if(!p||!OPEN.has(p.stage)) {
      if(current.office.actorId!=='player')action('begin','开始这次谋划',a.ok,{reason:a.ok?undefined:a.reasons[0]});
      if(p)out.outcome={code:p.stage,summary:p.stage==='failed'?'本案失败，部分盟友可能退出。前任仍在世，财产与亲缘不变。':p.stage==='abandoned'?'本案及既有准备已保留在历史中。':'玩家取得唯一帝位，前任仍在世，财产与亲缘保留。'};
      return out;
    }
    const allowed=!blocked.length,planning=p.stage==='planning';
    out.routes=ROUTES.map(r=>({...r,selected:p.selectedRoutes.includes(r.id),prepared:!!p.preparations[r.id],enabled:allowed&&planning,requirements:routeRequirements(p,c,r.id)}));
    out.people=supporters(c).map(npc=>{const d=p.pledges.find(a=>a.actorId===npc.id);return {id:npc.id,name:npc.name,roleId:npc.roleId,circleId:npc.circleId,status:!d?'not-asked':d.withdrawn?'withdrew':d.accepted?'accepted':'declined',canAsk:allowed&&!d};});
    for(const route of out.routes) {
      action('select-route',`${route.selected?'取消':'选择'}${route.label}`,route.enabled,{routeId:route.id});
      const prerequisites=route.id==='intrigue'||route.requirements.filter(r=>!['guards','confrontation'].includes(r.id)).every(r=>r.met);
      action('prepare',`准备${route.label}`,allowed&&planning&&!route.prepared&&prerequisites,{preparationKind:route.id,routeId:route.id});
    }
    for(const npc of out.people)if(npc.canAsk)action('pledge',`当面询问${npc.name}的政治立场`,true,{actorId:npc.id});
    const accepted=activePledges(p,c),canAcclaim=accepted.length>=RULES.supporters&&new Set(accepted.map(a=>a.circleId)).size>=RULES.circles;
    action('prepare','具名拥立',allowed&&canAcclaim&&!p.preparations.acclamation,{preparationKind:'acclamation'});
    const ready=planning&&readiness(p,c).length===0;
    action('resolve','实行这次谋划',allowed&&ready,{reason:ready?undefined:readiness(p,c)[0]||'mechanism-already-resolved'});
    const acclaim=p.preparations.acclamation&&acclamationPeople(p,c,p.preparations.acclamation.supporterIds);
    const safe=Object.values(c?.safety||{}).length===4&&Object.values(c.safety).every(Boolean);
    action('investiture','当面宣读并登位',allowed&&!planning&&!!acclaim&&safe&&!!c.residences.player&&!!c.residences.formerEmperor,{reason:!acclaim?'cross-circle-acclamation-required':!safe?'safe-handoff-required':undefined});
    if(planning)action('abandon','放弃这次谋划',allowed);
    out.steps=[{id:'pledges',label:'逐人取得政治响应',status:canAcclaim?'completed':'pending'},
      {id:'preparations',label:'完成选择路线的实际准备',status:p.resolution?'completed':ready?'ready':'pending'},
      {id:'acclamation',label:'跨圈层具名拥立',status:p.preparations.acclamation?'completed':canAcclaim?'ready':'pending'},
      {id:'investiture',label:'安全交接后当面宣读',status:p.stage==='invested'?'completed':!planning&&acclaim&&safe?'ready':'pending'}];
    return out;
  }
  // Preserve an unreadable historical value if the host saves another world
  // subsystem. Diagnostics and authority still expose only the fail-closed state.
  const snapshot=()=>copy(loadError?saved:current),state=()=>({...copy(current),loadError,lastError});
  const office=()=>loadError?null:copy(current.office);
  const currentTask=()=>loadError?null:copy(latest(current));
  const authority=()=>loadError?null:{holderId:current.office.actorId,revision:current.office.revision,suspended:latest(current)?.stage==='ready-for-investiture'};
  return {snapshot,state,office,currentTask,authority,view,availability,begin,selectRoute,pledge,recordPreparation,resolve,investiture,abandon};
}
