// ST05: scene-free evidence and consequences. All positions are observed inputs;
// reports remember a place, never grant remote knowledge of a suspect. The world
// owns routes/job leases, renders orders() only after a committed mutation, and
// restores its prior job owner when an order disappears. No money/life writes.
const copy = value => structuredClone(value);
const text = value => typeof value === 'string' && value.length > 0;
const point = value => {
 const p = Array.isArray(value) ? {x:value[0],y:value[1],z:value[2]} : value;
 return p && ['x','y','z'].every(k=>Number.isFinite(p[k])) ? {x:p.x,y:p.y,z:p.z} : null;
};
const distance = (a,b) => a && b ? Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z) : Infinity;
const keyOf = actor => actor?.key || actor?.id;
const terminal = new Set(['released','repaired','closed']);
const phases = new Set(['undiscovered','witnessed','reported','pursuit','escort','custody','releasing',...terminal]);
const fail = reason => ({ok:false,reason,code:reason,events:[]});
const read = input => typeof input === 'function' ? input() : input;
const receiptId = value => text(value)&&value.length<=128&&value.trim()===value;
const propertyCrime = c => c.kind==='theft'||c.kind==='fencing';

export function createCrimeConsequences({saved=null,persist=()=>false,actors=()=>[],guards=()=>[],items=[],jail=()=>null,
 hasLineOfSight=()=>false,custodySeconds=45,witnessRadius=7,hearingRadius=12,sightRadius=13,
 arrestRadius=1.5,interactionRadius=1.8,harmRadius=1.3,searchSeconds=18,cellRadius=.5,guardCellRadius=.6,releaseRadius=.5,getClock=null}={}) {
 const positive = (n,fallback) => Number.isFinite(n)&&n>0?n:fallback;
 custodySeconds=positive(custodySeconds,45); searchSeconds=positive(searchSeconds,18);
 const definitions = new Map((read(items)||[]).filter(item=>text(item?.id)&&text(item.ownerId)&&text(item.countryId)&&point(item.position)).map(item=>[item.id,{...item,sceneId:item.sceneId||item.countryId,position:point(item.position)}]));
 let state={version:1,time:0,nextCase:1,items:Object.fromEntries([...definitions].map(([id,d])=>[id,{id,ownerId:d.ownerId,holderKey:null,caseId:null,transfers:0}])),cases:[],effects:[],activeCaseId:null};
 let loadError=null,busy=false;
 const validEvidence = e => text(e?.witnessKey)&&['sight','victim','confession'].includes(e.kind)&&point(e.position)&&point(e.subjectPosition)&&Number.isFinite(e.at)&&e.at>=0&&Array.isArray(e.deliveredTo)&&e.deliveredTo.every(text);
 try {
  if(saved!=null){
   const old=copy(saved);
   if(old?.version!==1||!Number.isFinite(old.time)||old.time<0||!Number.isSafeInteger(old.nextCase)||old.nextCase<1||!old.items||typeof old.items!=='object'||Array.isArray(old.items)||!Array.isArray(old.cases)||!Array.isArray(old.effects)||new Set(old.cases.map(c=>c.id)).size!==old.cases.length)throw Error('invalid-crime-save');
   for(const c of old.cases)if(!text(c.id)||!Number.isSafeInteger(c.number)||c.number<1||c.number>=old.nextCase||!text(c.subjectKey)||!text(c.subjectId)||!['theft','harm','fencing'].includes(c.kind)||!text(c.countryId)||!text(c.sceneId)||!phases.has(c.status)||!point(c.lastKnown)||c.incidentPosition!==undefined&&!point(c.incidentPosition)||!Number.isFinite(c.searchRemaining)||c.searchRemaining<0||!Number.isFinite(c.custodyRemaining)||c.custodyRemaining<0||!Array.isArray(c.evidence)||!c.evidence.every(validEvidence)||!Number.isSafeInteger(c.reportRevision)||!Number.isSafeInteger(c.investigatedRevision)||c.reportRevision<0||c.investigatedRevision<0||propertyCrime(c)&&!definitions.has(c.itemId)||c.kind==='harm'&&!text(c.victimKey))throw Error('invalid-crime-save');
   for(const [id,d] of definitions){const item=old.items[id];if(!item){if(old.cases.some(c=>c.itemId===id))throw Error('invalid-crime-save');old.items[id]=copy(state.items[id]);continue;}if(item.id!==id||item.ownerId!==d.ownerId||item.holderKey!==null&&!text(item.holderKey)||item.caseId!==null&&!old.cases.some(c=>c.id===item.caseId&&c.itemId===id)||!Number.isSafeInteger(item.transfers)||item.transfers<0)throw Error('invalid-crime-save');}
   for(const item of Object.values(old.items))if(item.fence!==undefined){
    const f=item.fence,theft=old.cases.find(c=>c.id===f?.theftCaseId),seller=old.cases.find(c=>c.id===f?.sellerCaseId),buyer=old.cases.find(c=>c.id===f?.buyerCaseId);
    if(!definitions.has(item.id)||!receiptId(f?.requestId)||f.itemId!==item.id||!text(f.sellerKey)||!text(f.buyerKey)||f.sellerKey===f.buyerKey||item.transfers<2||theft?.kind!=='theft'||theft.itemId!==item.id||theft.subjectKey!==f.sellerKey)throw Error('invalid-crime-save');
    for(const [c,role,subjectKey] of [[seller,'seller',f.sellerKey],[buyer,'buyer',f.buyerKey]])if(c?.kind!=='fencing'||c.role!==role||c.subjectKey!==subjectKey||c.itemId!==item.id||c.theftCaseId!==theft.id||c.requestId!==f.requestId||c.countryId!==theft.countryId||c.sceneId!==theft.sceneId||c.counterpartyKey!==(role==='seller'?f.buyerKey:f.sellerKey)||c.evidence.some(e=>e.kind==='confession'?e.witnessKey!==subjectKey:e.kind!=='sight'||e.witnessKey===f.sellerKey||e.witnessKey===f.buyerKey))throw Error('invalid-crime-save');
   }
   const fenceIds=Object.values(old.items).filter(i=>i.fence).map(i=>i.fence.requestId);if(new Set(fenceIds).size!==fenceIds.length)throw Error('invalid-crime-save');
   for(const c of old.cases)if(c.kind==='fencing'&&![old.items[c.itemId]?.fence?.sellerCaseId,old.items[c.itemId]?.fence?.buyerCaseId].includes(c.id))throw Error('invalid-crime-save');
   for(const c of old.cases){
    if(c.guardReports!==undefined&&(!c.guardReports||typeof c.guardReports!=='object'||Array.isArray(c.guardReports)||Object.values(c.guardReports).some(r=>!point(r?.position)||!Number.isSafeInteger(r.revision)||r.revision<0||!Number.isFinite(r.at))))throw Error('invalid-crime-save');
    if(c.investigatedBy!==undefined&&(!c.investigatedBy||typeof c.investigatedBy!=='object'||Array.isArray(c.investigatedBy)||Object.values(c.investigatedBy).some(n=>!Number.isSafeInteger(n)||n<0)))throw Error('invalid-crime-save');
    if(c.incidentCount!==undefined&&(!Number.isSafeInteger(c.incidentCount)||c.incidentCount<1||!Number.isFinite(c.lastIncidentAt)||c.lastIncidentAt<0||!Number.isSafeInteger(c.lastIncidentNumber)||c.lastIncidentNumber<1||c.lastIncidentNumber>=old.nextCase))throw Error('invalid-crime-save');
   }
   if(old.activeCaseId!==null&&!old.cases.some(c=>c.id===old.activeCaseId&&['pursuit','escort','custody','releasing'].includes(c.status)))throw Error('invalid-crime-save');
   if(old.cases.filter(c=>['pursuit','escort','custody','releasing'].includes(c.status)).length>(old.activeCaseId?1:0))throw Error('invalid-crime-save');
   for(const e of old.effects)if(!text(e.id)||e.kind!=='harm'||!text(e.actorKey)||!text(e.victimKey)||!text(e.actorId)||!text(e.victimId)||!Number.isFinite(e.at)||!Number.isSafeInteger(e.receiptNumber)||e.receiptNumber<1||!old.cases.some(c=>c.id===e.caseId&&c.subjectKey===e.actorKey&&c.victimKey===e.victimKey))throw Error('invalid-crime-save');
   if(new Set(old.effects.map(e=>e.id)).size!==old.effects.length)throw Error('invalid-crime-save');
   for(const c of old.cases){c.guardReports??={};c.investigatedBy??={};for(const e of c.evidence)for(const key of e.deliveredTo)if(!c.guardReports[key])c.guardReports[key]={position:point(e.subjectPosition),revision:c.reportRevision,at:e.at};}
   state=old;
  }
 }catch{loadError='invalid-crime-save';}
 // Idle simulation time is transient. A real mutation captures it in the
 // same save; loading never derives elapsed time from a wall clock.
 let simulationTime=state.time;
 const snapshot=()=>copy(loadError?saved:state);
 function world(override={}){
  const normalize=a=>a&&text(keyOf(a))&&text(a.countryId)&&point(a.position)?{...a,key:keyOf(a),id:a.id||keyOf(a),sceneId:a.sceneId||a.countryId,position:point(a.position)}:null;
  const people=new Map((read(override.actors??actors)||[]).map(normalize).filter(Boolean).map(a=>[a.key,a]));
  const officers=(read(override.guards??guards)||[]).map(normalize).filter(Boolean).sort((a,b)=>a.key.localeCompare(b.key));
  for(const g of officers)if(!people.has(g.key))people.set(g.key,g);
  return {people,officers,jail:read(override.jail??jail)};
 }
 const present=a=>!!a&&a.alive!==false&&a.present!==false&&a.awake!==false;
 const sameScene=(a,b)=>present(a)&&present(b)&&a.countryId===b.countryId&&a.sceneId===b.sceneId;
 function sees(a,b,radius=witnessRadius){
  if(!sameScene(a,b)||distance(a.position,b.position)>radius)return false;
  try{return hasLineOfSight(a,b)===true;}catch{return false;}
 }
 const officerAvailable=g=>present(g)&&g.countryId==='china'&&g.available!==false&&g.routeFailed!==true;
 const active=s=>s.cases.find(c=>c.id===s.activeCaseId)||null;
 const openFor=(s,key)=>s.cases.filter(c=>c.subjectKey===key&&!terminal.has(c.status));
 const sentence=c=>Math.max(Math.min(15,custodySeconds),custodySeconds*(c.returned?.55:1)*(c.surrendered?.7:1));
 function commit(change){
  if(loadError||busy)return fail(loadError||'crime-busy');
  const next=copy(state),events=[];next.time=simulationTime;let result;
  try{result=change(next,events);}catch{return fail('invalid-crime-input');}
  if(result?.ok===false)return result;
  if(JSON.stringify({...next,time:state.time})===JSON.stringify(state))return {ok:true,events,...result};
  // Retain all open cases and unacknowledged effects. Closed provenance is
  // bounded; the monotonic receipt sequence never resets when history is trimmed.
  const pinned=new Set(Object.values(next.items).flatMap(i=>i.fence?[i.fence.theftCaseId,i.fence.sellerCaseId,i.fence.buyerCaseId]:[]));
  const removable=next.cases.filter(c=>terminal.has(c.status)&&!pinned.has(c.id)&&!next.effects.some(e=>e.caseId===c.id));
  while(removable.length>64){const remove=removable.shift();next.cases=next.cases.filter(c=>c.id!==remove.id);for(const item of Object.values(next.items))if(item.caseId===remove.id)item.caseId=null;}
  busy=true;
  try{
   const savedResult=persist(copy(next),copy(events));
   if(savedResult?.then){Promise.resolve(savedResult).catch(()=>{});return fail('save-failed');}
   if(savedResult!==true&&savedResult?.ok!==true)return fail('save-failed');
   state=next;return {ok:true,events,...result};
  }catch{return fail('save-failed');}finally{busy=false;}
 }
 function witness(c,a,subject,kind='sight',at=state.time){
  let e=c.evidence.find(e=>e.witnessKey===a.key);
  if(!e){e={witnessKey:a.key,witnessId:a.id,kind,position:point(a.position),subjectPosition:point(subject.position),at,deliveredTo:[]};c.evidence.push(e);}
  else if(distance(e.subjectPosition,subject.position)>.3){e.subjectPosition=point(subject.position);e.position=point(a.position);e.at=at;e.deliveredTo=[];}
  if(kind==='victim'||kind==='confession')e.kind=kind;
  if(c.status==='undiscovered')c.status='witnessed';
  return e;
 }
 function makeCase(next,subject,kind,fields,w,events){
  const number=next.nextCase++,clock=typeof getClock==='function'?getClock():next.time,at=Number.isFinite(clock)&&clock>=0?clock:next.time,c={id:`crime:${subject.countryId}:${number}`,number,kind,subjectKey:subject.key,subjectId:subject.id,countryId:subject.countryId,sceneId:subject.sceneId,status:'undiscovered',at,startedAt:next.time,lastKnown:point(subject.position),incidentPosition:point(subject.position),evidence:[],reportRevision:0,investigatedRevision:0,guardReports:{},investigatedBy:{},guardKey:null,searchRemaining:searchSeconds,custodyRemaining:0,returned:false,surrendered:false,...fields};
  for(const observer of [...w.people.values()].sort((a,b)=>a.key.localeCompare(b.key)))if(observer.key!==subject.key&&sees(observer,subject))witness(c,observer,subject,'sight',next.time);
  next.cases.push(c);events.push({kind:'offense',caseId:c.id,subjectKey:subject.key,witnessKeys:c.evidence.map(e=>e.witnessKey)});return c;
 }
 function deliver(c,witnessKey,w,next,events){
  const e=c.evidence.find(e=>e.witnessKey===witnessKey),observer=w.people.get(witnessKey);
  if(!e||!present(observer)||observer.canCall===false)return false;
  let delivered=false;
  for(const g of w.officers)if(officerAvailable(g)&&sameScene(observer,g)&&distance(observer.position,g.position)<=hearingRadius&&!e.deliveredTo.includes(g.key)){
   // A direct guard witness needs no shouted relay. A normal call conveys the
   // stored sighting only; its target is not read from the global actor list.
   e.deliveredTo.push(g.key);c.reportRevision++;c.guardReports[g.key]={position:point(e.subjectPosition),revision:c.reportRevision,at:e.at};
   if(!c.guardKey||c.guardKey===g.key)c.lastKnown=point(e.subjectPosition);delivered=true;
   if(['undiscovered','witnessed'].includes(c.status))c.status='reported';
   events.push({kind:'report',caseId:c.id,witnessKey,guardKey:g.key,position:point(e.subjectPosition)});
  }
  return delivered;
 }
 function abandon(next,c,reason,events){
  events.push({kind:'enforcement-ended',caseId:c.id,guardKey:c.guardKey,subjectKey:c.subjectKey,reason});
  if(c.guardKey)c.investigatedBy[c.guardKey]=c.guardReports[c.guardKey]?.revision||c.reportRevision;
  c.guardKey=null;next.activeCaseId=null;c.investigatedRevision=c.reportRevision;
  c.status=c.reportRevision?'reported':c.evidence.length?'witnessed':'undiscovered';c.searchRemaining=searchSeconds;delete c.escortStage;c.lastOutcome=reason;
 }
 function close(next,c,status,reason,events){
  events.push({kind:status,caseId:c.id,guardKey:c.guardKey,subjectKey:c.subjectKey,reason});c.status=status;c.guardKey=null;c.lastOutcome=reason;
  if(next.activeCaseId===c.id)next.activeCaseId=null;
 }
 function usableJail(w,c){const j=w.jail;return j&&j.countryId===c.countryId&&(j.sceneId||j.countryId)===c.sceneId&&point(j.entry)&&point(j.cell)&&point(j.release)&&(!j.guardEntry||point(j.guardEntry))&&(!j.guardCell||point(j.guardCell))?j:null;}
 function update(dt,override={}){
  if(!Number.isFinite(dt)||dt<0)return fail('invalid-time');
  if(override.activeSimulation===false||dt===0)return {ok:true,events:[]};
  if(loadError||busy)return fail(loadError||'crime-busy');
  const w=world(override);simulationTime+=dt;
  return commit((next,events)=>{
   for(const c of next.cases){
    if(terminal.has(c.status))continue;
    const subject=w.people.get(c.subjectKey);
    const replaced=!subject&&[...w.people.values()].some(a=>a.id===c.subjectId&&a.key!==c.subjectKey);
    if(subject?.alive===false||replaced){close(next,c,'closed',replaced?'subject-life-replaced':'subject-life-ended',events);continue;}
    // Only an existing witness can identify a later sighting. Somebody who did
    // not see the act cannot discover a crime from a hidden case record.
    if(present(subject))for(const e of c.evidence){const a=w.people.get(e.witnessKey);if(a&&sees(a,subject))witness(c,a,subject,e.kind,next.time);}
    if(!['custody','releasing'].includes(c.status))for(const e of c.evidence)deliver(c,e.witnessKey,w,next,events);
   }
   let c=active(next);
   if(c){
    const subject=w.people.get(c.subjectKey),g=w.officers.find(g=>g.key===c.guardKey),j=usableJail(w,c);
    if(['pursuit','escort'].includes(c.status)){
     if(!officerAvailable(g)){abandon(next,c,'guard-unavailable',events);return {};}
     if(!present(subject)){return {};}
     if(c.status==='pursuit'){
      if(sees(g,subject,sightRadius)){c.lastKnown=point(subject.position);c.searchRemaining=searchSeconds;if(subject.available!==false&&distance(g.position,subject.position)<=arrestRadius){
       if(!j){abandon(next,c,'jail-unavailable',events);return {};}
       c.status='escort';c.escortStage='entry';events.push({kind:'arrest',caseId:c.id,guardKey:g.key,subjectKey:c.subjectKey});
      }}else{c.searchRemaining=Math.max(0,c.searchRemaining-dt);if(c.searchRemaining===0){abandon(next,c,'search-ended',events);return {};}}
     }else{
      if(!sameScene(g,subject)||!j){abandon(next,c,'escort-unavailable',events);return {};}
      // Both people walk the same authored route. Starting custody is allowed
      // only after physical entry and arrival at the underground cell.
      const entering=c.escortStage==='entry',target=point(entering?j.entry:j.cell),guardTarget=point(entering?j.guardEntry||j.entry:j.guardCell||j.cell);
      if(distance(subject.position,target)<=(entering?interactionRadius:cellRadius)&&distance(g.position,guardTarget)<=(entering?interactionRadius:guardCellRadius)){
       if(c.escortStage==='entry'){c.escortStage='cell';events.push({kind:'cell-route',caseId:c.id});}
       else{
        c.status='custody';c.custodyRemaining=sentence(c);const releasedGuard=c.guardKey;c.guardKey=null;
        if(propertyCrime(c)){const item=next.items[c.itemId];if(item?.holderKey===c.subjectKey){item.holderKey=null;item.transfers++;c.confiscated=true;}}
        events.push({kind:'custody',caseId:c.id,guardKey:releasedGuard,subjectKey:c.subjectKey,remaining:c.custodyRemaining});
       }
      }
     }
    }else if(c.status==='custody'){
     // Missing scene, paused tab, offline wall time and absent lifetimes serve
     // no sentence. Runtime must pass simulation dt and hold the cell lease.
     if(j&&present(subject)&&subject.countryId===c.countryId&&subject.sceneId===c.sceneId&&distance(subject.position,point(j.cell))<=cellRadius){
      c.custodyRemaining=Math.max(0,c.custodyRemaining-dt);
      if(c.custodyRemaining===0){c.status='releasing';events.push({kind:'release-started',caseId:c.id,subjectKey:c.subjectKey});}
     }
    }else if(c.status==='releasing'&&j&&present(subject)&&subject.countryId===c.countryId&&subject.sceneId===c.sceneId&&distance(subject.position,point(j.release))<=releaseRadius)close(next,c,'released','sentence-served',events);
   }
   if(!active(next)){
    for(const candidate of next.cases){
     if(terminal.has(candidate.status)||candidate.countryId!=='china'||!candidate.evidence.length)continue;
     const subject=w.people.get(candidate.subjectKey);
     const eligible=w.officers.filter(g=>officerAvailable(g)&&g.sceneId===candidate.sceneId&&g.key!==candidate.subjectKey&&candidate.guardReports[g.key]);
     const chosen=eligible.find(g=>candidate.guardReports[g.key].revision>(candidate.investigatedBy[g.key]||0)||sees(g,subject,sightRadius));
     if(!chosen)continue;
     candidate.status='pursuit';candidate.guardKey=chosen.key;candidate.searchRemaining=searchSeconds;next.activeCaseId=candidate.id;
     candidate.lastKnown=point(sees(chosen,subject,sightRadius)?subject.position:candidate.guardReports[chosen.key].position);
     events.push({kind:'pursuit',caseId:candidate.id,guardKey:chosen.key,subjectKey:candidate.subjectKey});break;
    }
   }
   return {};
  });
 }
 function take(actorKey,itemId,override={}){
  const w=world(override),actor=w.people.get(actorKey),definition=definitions.get(itemId);
  if(!present(actor)||actor.available===false)return fail('actor-unavailable');
  if(!definition||!sees(actor,definition,interactionRadius))return fail('item-out-of-reach');
  if(actor.id===definition.ownerId||actor.key===definition.ownerId)return fail('already-owner');
  return commit((next,events)=>{
   const item=next.items[itemId];if(item.holderKey!==null)return fail('item-unavailable');
   if(openFor(next,actorKey).some(c=>['escort','custody','releasing'].includes(c.status)))return fail('actor-detained');
   if(item.caseId&&next.cases.some(c=>c.id===item.caseId&&!terminal.has(c.status)))return fail('item-case-open');
   const c=makeCase(next,actor,'theft',{itemId},w,events);item.holderKey=actor.key;item.caseId=c.id;item.transfers++;
   return {caseId:c.id};
  });
 }
 // A fencing sale participates in the caller's single durable currency save.
 // Preparing and locking never persist or reveal the candidate in live state.
 function fenceEligibility(actorKey,buyerKey,itemId,requestId,w,current=state){
  if(loadError)return fail(loadError);
  if(!receiptId(requestId))return fail('invalid-fence-request');
  const seller=w.people.get(actorKey),buyer=w.people.get(buyerKey),item=current.items[itemId];
  if(!present(seller)||seller.available===false||seller.busy===true||seller.adult===false)return fail('actor-unavailable');
  if(!present(buyer)||buyer.available===false||buyer.busy===true||buyer.adult===false)return fail('buyer-unavailable');
  if(seller.key===buyer.key||seller.id===buyer.id||!sees(seller,buyer,interactionRadius)||!sees(buyer,seller,interactionRadius))return fail('buyer-out-of-reach');
  if([seller,buyer].some(a=>a.detained===true||openFor(current,a.key).some(c=>['escort','custody','releasing'].includes(c.status))))return fail('actor-detained');
  if(!definitions.has(itemId)||!item||item.holderKey!==actorKey)return fail('not-item-holder');
  if(item.fence)return fail('item-already-fenced');
  if(Object.values(current.items).some(i=>i.fence?.requestId===requestId))return fail('fence-request-used');
  const theft=current.cases.find(c=>c.id===item.caseId&&c.kind==='theft'&&c.itemId===itemId&&c.subjectKey===actorKey);
  if(!theft||terminal.has(theft.status)||seller.countryId!==theft.countryId||seller.sceneId!==theft.sceneId)return fail('invalid-item-provenance');
  return {ok:true};
 }
 function fenceObservation(w,actorKey,buyerKey){
  const seller=w.people.get(actorKey),buyer=w.people.get(buyerKey);
  const observers=new Map([...w.people].filter(([k,a])=>k!==actorKey&&k!==buyerKey&&sees(a,seller)&&sees(a,buyer)));
  const signature=JSON.stringify([seller?.position,buyer?.position,[...observers.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(a=>[a.key,a.id,a.position])]);
  return {observers,signature};
 }
 function prepareFence(actorKey,buyerKey,itemId,requestId,override={}){
  if(loadError||busy)return fail(loadError||'crime-busy');
  const w=world(override),eligible=fenceEligibility(actorKey,buyerKey,itemId,requestId,w);if(!eligible.ok)return eligible;
  const base=state,next=copy(state),events=[],seller=w.people.get(actorKey),buyer=w.people.get(buyerKey),item=next.items[itemId];next.time=simulationTime;
  // Both participants and the object handoff must actually be visible. A
  // merchant and seller are never each other's independent fencing witnesses.
  const {observers,signature}=fenceObservation(w,actorKey,buyerKey);
  const observedWorld={...w,people:observers},fields={itemId,theftCaseId:item.caseId,requestId};
  const sale=makeCase(next,seller,'fencing',{...fields,role:'seller',counterpartyKey:buyerKey},observedWorld,events);
  const purchase=makeCase(next,buyer,'fencing',{...fields,role:'buyer',counterpartyKey:actorKey},observedWorld,events);
  item.holderKey=buyerKey;item.transfers++;item.fence={requestId,itemId,sellerKey:actorKey,buyerKey,theftCaseId:item.caseId,sellerCaseId:sale.id,buyerCaseId:purchase.id};
  events.push({kind:'property-fenced',caseId:sale.id,buyerCaseId:purchase.id,itemId,actorKey,buyerKey,requestId});
  let locked=false,accepted=false;
  const valid=()=>{if(loadError||busy&&!locked)return false;if(accepted)return true;const live=world(override);return state===base&&fenceEligibility(actorKey,buyerKey,itemId,requestId,live,base).ok&&fenceObservation(live,actorKey,buyerKey).signature===signature;};
  return {ok:true,engine:copy(next),events:copy(events),receipt:copy(item.fence),valid,
   lock(){if(locked||accepted||!valid())return false;busy=true;locked=true;return true;},
   committed(){if(accepted)return true;if(!locked||!busy||state!==base||loadError)return false;state=next;accepted=true;return true;},
   release(){if(locked){locked=false;busy=false;}}
  };
 }
 function verifyFenceReceipt(input){
  if(loadError||!input||!definitions.has(input.itemId))return false;
  const f=state.items[input.itemId]?.fence;
  return !!f&&f.requestId===input.requestId&&(!(input.sellerKey??input.actorKey)||f.sellerKey===(input.sellerKey??input.actorKey))&&(!input.buyerKey||f.buyerKey===input.buyerKey);
 }
 function harmEligibility(actorKey,victimKey,w,current=state,time=simulationTime){
  if(loadError||busy)return fail(loadError||'crime-busy');
  const actor=w.people.get(actorKey),victim=w.people.get(victimKey);
  if(!present(actor)||actor.available===false)return fail('actor-unavailable');
  if(actorKey===victimKey||!present(victim)||victim.adult===false||actor.adult===false||!sees(actor,victim,harmRadius))return fail('victim-out-of-reach');
  if(openFor(current,actorKey).some(c=>['escort','custody','releasing'].includes(c.status)))return fail('actor-detained');
  const previous=current.cases.findLast(c=>c.kind==='harm'&&c.subjectKey===actorKey&&c.victimKey===victimKey);
  if(previous&&time-(previous.lastIncidentAt??previous.startedAt??previous.at)<60)return fail('harm-cooldown');
  return {ok:true};
 }
 function canHarm(actorKey,victimKey,override={}){return harmEligibility(actorKey,victimKey,world(override));}
 function harm(actorKey,victimKey,override={}){
  const w=world(override),actor=w.people.get(actorKey),victim=w.people.get(victimKey),eligible=harmEligibility(actorKey,victimKey,w);
  if(!eligible.ok)return eligible;
  return commit((next,events)=>{
   const eligible=harmEligibility(actorKey,victimKey,w,next,next.time);if(!eligible.ok)return eligible;
   const previous=next.cases.findLast(c=>c.kind==='harm'&&c.subjectKey===actorKey&&c.victimKey===victimKey);
   const continuing=previous&&!terminal.has(previous.status),c=continuing?previous:makeCase(next,actor,'harm',{victimKey,victimId:victim.id},w,events);
   const incidentNumber=continuing?next.nextCase++:c.number,clock=typeof getClock==='function'?getClock():next.time,at=Number.isFinite(clock)&&clock>=0?clock:next.time;
   c.incidentCount=continuing?(c.incidentCount||1)+1:1;c.lastIncidentAt=next.time;c.lastIncidentNumber=incidentNumber;c.lastHarmAt=at;c.incidentPosition=point(actor.position);
   // Repeated physical incidents retain one case/consequence but get fresh,
   // monotonic receipts. Only people seeing THIS incident receive its effect.
   const witnesses=[...w.people.values()].filter(a=>a.key!==actorKey&&(a.key===victimKey||sees(a,actor))).sort((a,b)=>a.key.localeCompare(b.key));
   for(const observer of witnesses){const e=witness(c,observer,actor,observer.key===victimKey?'victim':'sight',next.time);e.position=point(observer.position);e.subjectPosition=point(actor.position);e.at=next.time;e.incidentNumber=incidentNumber;e.deliveredTo=[];}
   const effect={id:`crime:${c.countryId}:${incidentNumber}:harm`,kind:'harm',caseId:c.id,source:`crime-consequences:${c.countryId}`,receiptNumber:incidentNumber,actorKey,victimKey,actorId:actor.id,victimId:victim.id,at,witnessKeys:witnesses.map(a=>a.key),witnessIds:witnesses.map(a=>a.id)};
   if(continuing)events.push({kind:'offense',caseId:c.id,subjectKey:actorKey,incidentNumber,witnessKeys:effect.witnessKeys});
   next.effects.push(effect);events.push({kind:'effect-pending',effectId:effect.id,caseId:c.id});return {caseId:c.id,effect:copy(effect)};
  });
 }
 function returnItem(actorKey,itemId,override={}){
  const w=world(override),actor=w.people.get(actorKey),definition=definitions.get(itemId);
  if(!present(actor)||!definition||!sees(actor,definition,interactionRadius))return fail('item-out-of-reach');
  return commit((next,events)=>{
   const item=next.items[itemId];if(item.holderKey!==actorKey)return fail('not-item-holder');
   const c=next.cases.find(c=>c.id===item.caseId);item.holderKey=null;item.transfers++;
   if(c){c.returned=true;if(c.subjectKey===actorKey&&!c.evidence.length)close(next,c,'repaired','property-returned-unseen',events);}
   for(const related of next.cases.filter(c=>c.kind==='fencing'&&c.itemId===itemId&&c.subjectKey===actorKey&&!terminal.has(c.status))){related.returned=true;if(!related.evidence.length)close(next,related,'repaired','property-returned-unseen',events);}
   events.push({kind:'property-returned',caseId:c?.id,itemId,actorKey});return {caseId:c?.id};
  });
 }
 function report(witnessKey,caseId,override={}){
  const w=world(override);
  return commit((next,events)=>{
   const c=next.cases.find(c=>c.id===caseId);
   if(!c||terminal.has(c.status)||!c.evidence.some(e=>e.witnessKey===witnessKey))return fail('not-witness');
   return deliver(c,witnessKey,w,next,events)?{caseId}:fail('no-guard-in-hearing');
  });
 }
 function surrender(actorKey,override={}){
  const w=world(override),actor=w.people.get(actorKey);
  const officer=w.officers.find(g=>g.key!==actorKey&&officerAvailable(g)&&sees(g,actor,interactionRadius));
  if(!officer)return fail('no-guard-in-reach');
  return commit((next,events)=>{
   const cases=openFor(next,actorKey).filter(c=>!['custody','releasing'].includes(c.status));if(!cases.length)return fail('no-open-case');
   for(const c of cases){c.surrendered=true;const e=witness(c,actor,actor,'confession',next.time);e.deliveredTo=[...new Set([...e.deliveredTo,officer.key])];c.reportRevision++;c.guardReports[officer.key]={position:point(actor.position),revision:c.reportRevision,at:next.time};if(!c.guardKey||c.guardKey===officer.key)c.lastKnown=point(actor.position);if(['undiscovered','witnessed'].includes(c.status))c.status='reported';}
   events.push({kind:'surrender',subjectKey:actorKey,guardKey:officer.key});return {caseId:cases[0].id};
  });
 }
 function orders(override={}){
  if(loadError)return null;
  const c=active(state);if(!c)return null;
  const w=world(override),subject=w.people.get(c.subjectKey),g=w.officers.find(g=>g.key===c.guardKey),j=usableJail(w,c);
  if(!present(subject))return null;
  const order={caseId:c.id,status:c.status,subjectKey:c.subjectKey,guardKey:c.guardKey,subjectTarget:null,guardTarget:null,holdSubject:false,remaining:c.custodyRemaining};
  if(c.status==='pursuit'){if(!officerAvailable(g))return null;order.guardTarget=point(c.lastKnown);}
  else if(c.status==='escort'){if(!officerAvailable(g)||!j||!sameScene(g,subject))return null;order.subjectTarget=point(c.escortStage==='entry'?j.entry:j.cell);order.guardTarget=point(c.escortStage==='entry'?j.guardEntry||j.entry:j.guardCell||j.cell);order.holdSubject=true;}
  else {if(!j||subject.countryId!==c.countryId||subject.sceneId!==c.sceneId)return null;order.guardKey=null;order.subjectTarget=point(c.status==='releasing'?j.release:j.cell);order.holdSubject=true;}
  return order;
 }
 function status(actorKey){
  if(loadError)return {ok:false,reason:loadError};
  const cases=state.cases.filter(c=>c.subjectKey===actorKey),current=cases.find(c=>c.id===state.activeCaseId)||cases.findLast(c=>!terminal.has(c.status))||cases.at(-1);
  return {ok:true,actorKey,status:current?.status||'clear',caseId:current?.id||null,kind:current?.kind||null,guardKey:current?.guardKey||null,remaining:current?.custodyRemaining||0,returned:current?.returned||false,surrendered:current?.surrendered||false,detained:!!current&&['escort','custody','releasing'].includes(current.status),openCases:cases.filter(c=>!terminal.has(c.status)).length,heldItems:Object.values(state.items).filter(i=>i.holderKey===actorKey).map(i=>i.id),witnessedCases:state.cases.filter(c=>!terminal.has(c.status)&&c.evidence.some(e=>e.witnessKey===actorKey)).map(c=>c.id)};
 }
 function actions(actorKey,override={}){
  if(loadError)return [];
  const w=world(override),actor=w.people.get(actorKey);if(!present(actor))return [];
  const result=[];
  for(const [id,d] of definitions)if(sees(actor,d,interactionRadius)){
   const item=state.items[id];if(item.holderKey===actorKey)result.push({kind:'return',itemId:id});
   else if(item.holderKey===null&&actor.available!==false&&!status(actorKey).detained&&(!item.caseId||state.cases.some(c=>c.id===item.caseId&&terminal.has(c.status))))result.push({kind:'take',itemId:id});
  }
  if(openFor(state,actorKey).length&&w.officers.some(g=>officerAvailable(g)&&sees(g,actor,interactionRadius)))result.push({kind:'surrender'});
  for(const c of state.cases)if(!terminal.has(c.status)&&c.evidence.some(e=>e.witnessKey===actorKey)&&w.officers.some(g=>officerAvailable(g)&&sameScene(actor,g)&&distance(actor.position,g.position)<=hearingRadius))result.push({kind:'report',caseId:c.id});
  return result;
 }
 return {take,returnItem,prepareFence,verifyFenceReceipt,harm,canHarm,offend(input,override={}){return input?.kind==='harm'?harm(input.actorKey||input.actor,input.victimKey||input.victim,override):fail('unknown-offense');},report,surrender,update,tick:update,orders,status,actions,snapshot,
  pendingEffects:()=>loadError?[]:copy(state.effects),
  ackEffect(id){return commit(next=>{const index=next.effects.findIndex(e=>e.id===id);if(index<0)return {replayed:true};next.effects.splice(index,1);return {effectId:id};});},
  cancelEnforcement(reason='route-failed'){return commit((next,events)=>{const c=active(next);if(!c)return {replayed:true};if(c.status==='custody')return fail('custody-must-be-served');if(c.status==='releasing')close(next,c,'released',reason,events);else abandon(next,c,reason,events);return {caseId:c.id};});}
 };
}
