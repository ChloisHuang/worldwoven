// Political standing is separate from formal-careers.tenure. This ledger owns
// only the fourth consort seat and its room/bed claim. Physical work is supplied
// by the palace controller through verified, durable event receipts.
export const CONSORT_SEAT_ID = 'cn-consort-4';
export const CONSORT_CAPACITY = 4;
export const CONSORT_INCUMBENTS = Object.freeze([
  Object.freeze({actorId:'cn-consort-yue',roomId:'guest',bedId:'china-furniture-bed-2'}),
  Object.freeze({actorId:'cn-consort-heng',roomId:'consort-heng',bedId:'china-consort-bed-heng'}),
  Object.freeze({actorId:'cn-consort-ling',roomId:'consort-ling',bedId:'china-consort-bed-ling'}),
]);
const EMPEROR_ID='cn-emperor', HERALD_ID='cn-palace-herald';
const copy=x=>JSON.parse(JSON.stringify(x));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const text=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const time=x=>object(x)&&integer(x.day)&&Number.isFinite(x.hour)&&x.hour>=0&&x.hour<24;
const after=(a,b)=>a.day>b.day||a.day===b.day&&a.hour>=b.hour;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sameReceipt=(a,b)=>object(a)&&object(b)&&['id','kind','applicationId','playerId','emperorId','heraldId','targetId','completed','documentId'].every(k=>a[k]===b[k])&&
  a.at?.day===b.at?.day&&a.at?.hour===b.at?.hour&&Array.isArray(b.participants)&&same([...a.participants].sort(),[...b.participants].sort());
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;
const round=n=>Math.round(n*1000000)/1000000;
const adult=n=>Number.isFinite(n)&&n>=18;
const OPEN=new Set(['submitted','awaiting-choice','accepted','charter-held']);
const TERMINAL=new Set(['rejected','declined','withdrawn','appointed','resigned','expired']);
const STAGES=new Set([...OPEN,...TERMINAL]);
const ACTOR_TRAITS=['curiosity','quiet','sociability','outdoors'];
const AGE_STAGES=['submitted','reviewed','accepted','received','appointed'];
const RECEIPTS={submission:'submission',audience:'audience','charter-handoff':'handoff','charter-reading':'reading'};
const minutes=at=>at.day*1440+at.hour*60;
const invited=p=>p?.source==='emperor-invitation';
export const consortPetitionId=(actorId,day)=>`consort-petition:${actorId}:${day}`;
export const consortCharterId=petitionId=>`consort-charter:${petitionId}`;
export function consortPetitionRoll(worldSeed,id){
  let h=2166136261;
  for(const c of `consort-review-v1|${worldSeed>>>0}|${id}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
  h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
  return (h>>>0)/4294967296;
}

// Read only existing, bounded attributes. Missing player relations and traits
// are neutral; neither this function nor its caller writes a fictional bond.
export function consortReviewFactors({player={},emperor={},skills={}}={}){
  const traits=ACTOR_TRAITS.filter(k=>Number.isFinite(player.traits?.[k])&&Number.isFinite(emperor.traits?.[k]));
  const alignment=traits.length?traits.reduce((n,k)=>n+1-Math.abs(clamp(player.traits[k],0,1)-clamp(emperor.traits[k],0,1)),0)/traits.length:.5;
  const relationship=emperor.relations?.[player.id],opinion=emperor.opinions?.[player.id];
  return {
    ritual:round(clamp(finite(skills.ritual,0),0,6)*.02),
    art:round(clamp(finite(skills.art,0),0,6)*.02),
    personality:round((alignment-.5)*.10),
    appearance:round((clamp(finite(player.appearanceScore,50),0,100)/100-.5)*.08),
    relationship:round(clamp(finite(relationship,0),-1,1)*.14+clamp(finite(opinion,0),-1,1)*.04),
    emperor:round((clamp(finite(emperor.traits?.curiosity,.5),0,1)-.5)*.08+(clamp(finite(emperor.traits?.sociability,.5),0,1)-.5)*.04),
    circumstances:round(-clamp(finite(emperor.needs?.fatigue,0),0,1)*.12-clamp(finite(emperor.needs?.hunger,0),0,1)*.08),
  };
}
function reviewSnapshot(player,emperor,skills,roll){
  const factors=consortReviewFactors({player,emperor,skills}),chance=round(clamp(.45+Object.values(factors).reduce((a,b)=>a+b,0),.12,.92));
  return {roll,chance,passed:roll<chance,factors,relationshipKnown:Number.isFinite(emperor.relations?.[player.id])||Number.isFinite(emperor.opinions?.[player.id]),
    reasons:roll<chance?[]:[...Object.entries(factors).filter(([,n])=>n<-.025).map(([k])=>({relationship:'relationship-reservations',personality:'different-dispositions',circumstances:'emperor-unsettled',emperor:'emperor-cautious',appearance:'personal-preference'}[k]||'review-not-selected')),'review-not-selected']};
}

// The existing career core is only read. No resignation, duty, application,
// wage, performance, clothing or inventory mutation belongs in this module.
export function consortCareerBlockers(career){
  if(!object(career)||!Object.hasOwn(career,'tenure')||!Object.hasOwn(career,'lastDuty')||career.loadError)return ['career-state-unavailable'];
  const reasons=[],stage=career.lastDuty?.stage;
  if(['arrived','attending','archive','working'].includes(stage))reasons.push('finish-current-duty');
  if(['inspection','ready'].includes(stage))reasons.push('settle-current-wages');
  if(career.tenure!==null)reasons.push('leave-formal-career');
  return reasons;
}
function validReceipt(r,kind,p){
  if(!object(r)||r.kind!==kind||!text(r.id)||r.applicationId!==p.id||r.playerId!==p.playerId||r.emperorId!==p.emperorId||r.heraldId!==HERALD_ID||
    r.completed!==true||!text(r.targetId)||!time(r.at)||!Array.isArray(r.participants)||new Set(r.participants).size!==r.participants.length||r.participants.some(id=>!text(id)))return false;
  const required=kind==='invitation'?[p.playerId,p.emperorId]:['submission','charter-handoff'].includes(kind)?[p.playerId,HERALD_ID]:[p.playerId,p.emperorId,HERALD_ID];
  if(!required.every(id=>r.participants.includes(id)))return false;
  return kind.startsWith('charter-')?r.documentId===consortCharterId(p.id):r.documentId===undefined;
}
const receiptTime=p=>p.reading?.at||p.handoff?.at||p.choice?.at||p.audience?.at||p.submission.at;
function validAges(ages){return object(ages)&&adult(ages.player)&&adult(ages.emperor);}
function validResidence(r){return object(r)&&r.slotId===CONSORT_SEAT_ID&&text(r.roomId)&&text(r.bedId)&&
  !CONSORT_INCUMBENTS.some(c=>c.roomId===r.roomId||c.bedId===r.bedId)&&r.roomId!=='bedroom'&&!['china-dragon-bed','china-furniture-bed-0'].includes(r.bedId);}
const residence=v=>({slotId:CONSORT_SEAT_ID,roomId:v.roomId,bedId:v.bedId});
const empty=worldSeed=>({version:1,revision:0,worldSeed:worldSeed>>>0,petitions:[],appointment:null,invitationDecisions:[]});
function validate(value,worldSeed,actorId){
  const fail=()=>{throw Error('invalid-consort-state');};
  if(!object(value)||value.version!==1||!integer(value.revision)||value.worldSeed!==(worldSeed>>>0)||!Array.isArray(value.petitions))fail();
  const days=new Set(),receipts=new Set();let last=null,open=0;
  for(const p of value.petitions){
    if(!object(p)||p.playerId!==actorId||p.emperorId!==EMPEROR_ID||!time(p.submittedAt)||p.id!==consortPetitionId(actorId,p.submittedAt.day)||days.has(p.submittedAt.day)||
      !STAGES.has(p.stage)||p.roll!==consortPetitionRoll(value.worldSeed,p.id)||!validResidence(p.residence)||!validAges(p.ages?.submitted)||
      Object.keys(p.ages).some(k=>!AGE_STAGES.includes(k)||!validAges(p.ages[k]))||!validReceipt(p.submission,invited(p)?'invitation':'submission',p)||!same(p.submission.at,p.submittedAt)||
      last&&!after(p.submittedAt,last))fail();
    if(p.source!==undefined&&!['emperor-invitation','self-petition'].includes(p.source)||invited(p)&&(p.stage==='submitted'||!text(p.opportunityId)||p.expiresAt!==minutes(p.submittedAt)+180||p.audience!==null||!p.review?.passed||!validAges(p.ages.reviewed)))fail();
    days.add(p.submittedAt.day);if(OPEN.has(p.stage))open++;
    let prior=p.submittedAt;
    for(const[kind,key]of Object.entries(RECEIPTS)){
      const r=p[key];if(r===null)continue;if(!validReceipt(r,key==='submission'&&invited(p)?'invitation':kind,p)||!after(r.at,prior)||receipts.has(r.id))fail();
      receipts.add(r.id);prior=r.at;
    }
    if(!invited(p)&&(p.audience===null?(p.review!==null||p.ages.reviewed!==undefined):(!validAges(p.ages.reviewed)||!object(p.review))))fail();
    if(p.review!==null){
      const r=p.review,bounds={ritual:[0,.12],art:[0,.12],personality:[-.05,.05],appearance:[-.04,.04],relationship:[-.18,.18],emperor:[-.06,.06],circumstances:[-.2,0]};
      if(r.roll!==p.roll||typeof r.relationshipKnown!=='boolean'||!object(r.factors)||Object.keys(r.factors).length!==7||
        Object.entries(bounds).some(([k,[a,b]])=>!Number.isFinite(r.factors[k])||r.factors[k]<a-1e-7||r.factors[k]>b+1e-7)||
        r.chance!==round(clamp(.45+Object.values(r.factors).reduce((a,b)=>a+b,0),.12,.92))||r.passed!==(r.roll<r.chance)||
        !Array.isArray(r.reasons)||(r.passed?r.reasons.length!==0:!r.reasons.includes('review-not-selected'))||r.reasons.some(x=>!REVIEW_REASONS.has(x)))fail();
    }
    if(p.choice!==null&&(!object(p.choice)||!['accept','decline'].includes(p.choice.value)||!time(p.choice.at)||!p.review?.passed||!after(p.choice.at,p.audience?.at||p.submittedAt)||invited(p)&&minutes(p.choice.at)>=p.expiresAt&&p.choice.value==='accept'||
      p.choice.value==='accept'&&!validAges(p.ages.accepted)))fail();
    if(p.handoff!==null&&(!p.review?.passed||p.choice?.value!=='accept'||!after(p.handoff.at,p.choice.at)||!validAges(p.ages.received)))fail();
    if(p.reading!==null&&(p.handoff===null||!validAges(p.ages.appointed)))fail();
    if(TERMINAL.has(p.stage)?!time(p.endedAt)||!after(p.endedAt,receiptTime(p)):p.endedAt!==null)fail();
    if(p.stage==='submitted'&&(p.audience!==null||p.choice!==null||p.handoff!==null||p.reading!==null)||
      p.stage==='awaiting-choice'&&(!p.review?.passed||p.choice!==null||p.handoff!==null||p.reading!==null)||
      p.stage==='rejected'&&(!p.review||p.review.passed||p.choice!==null||p.handoff!==null||p.reading!==null)||
      p.stage==='declined'&&(p.choice?.value!=='decline'||p.handoff!==null||p.reading!==null)||
      p.stage==='accepted'&&(p.choice?.value!=='accept'||p.handoff!==null||p.reading!==null)||
      p.stage==='charter-held'&&(p.handoff===null||p.reading!==null)||
      ['appointed','resigned'].includes(p.stage)&&p.reading===null||p.stage==='withdrawn'&&p.reading!==null||p.stage==='expired'&&(!invited(p)||p.choice!==null||p.handoff!==null||p.reading!==null||minutes(p.endedAt)<p.expiresAt))fail();
    if(p.stage==='resigned'){const r=p.resignation;if(!object(r)||r.reason!=='voluntary'||r.appointmentId!==`consort-appointment:${p.id}`||!time(r.at)||!after(r.at,p.reading.at)||!same(r.at,p.endedAt))fail();}
    else if(p.resignation!=null)fail();
    last=p.endedAt||receiptTime(p);
  }
  if(open>1||open===1&&!OPEN.has(value.petitions.at(-1).stage))fail();
  const appointed=value.petitions.filter(p=>p.stage==='appointed'),a=value.appointment;
  if(a===null){if(appointed.length)fail();}
  else {
    const p=appointed[0];
    if(appointed.length!==1||!object(a)||a.id!==`consort-appointment:${p.id}`||a.applicationId!==p.id||a.actorId!==actorId||a.emperorId!==EMPEROR_ID||a.titleId!=='consort'||
      !same(a.residence,p.residence)||!same(a.since,p.reading.at)||a.receiptId!==p.reading.id||value.petitions.at(-1)!==p)fail();
  }
  const decisions=value.invitationDecisions??[];
  if(!Array.isArray(decisions)||decisions.length>8)fail();
  let priorDay=-1;
  for(const d of decisions){if(!object(d)||!integer(d.day)||d.day<=priorDay||d.id!==consortPetitionId(actorId,d.day)||!text(d.opportunityId)||typeof d.offered!=='boolean'||d.roll!==consortPetitionRoll(value.worldSeed,d.id)||!time(d.at)||d.at.day!==d.day||!Number.isFinite(d.chance)||d.chance<.12||d.chance>.92||d.offered!==(d.roll<d.chance)||d.nextDay!==d.day+1||!validReceipt(d.receipt,'invitation',{id:d.id,playerId:actorId,emperorId:EMPEROR_ID})||!same(d.receipt.at,d.at))fail();const p=value.petitions.find(p=>p.id===d.id&&invited(p));if(d.offered?(!p||p.opportunityId!==d.opportunityId||!sameReceipt(p.submission,d.receipt)||p.review.chance!==d.chance):p)fail();priorDay=d.day;}
  return {...copy(value),invitationDecisions:copy(decisions)};
}
const REVIEW_REASONS=new Set(['relationship-reservations','different-dispositions','emperor-unsettled','emperor-cautious','personal-preference','review-not-selected']);

/**
 * saveState must synchronously and atomically persist the whole detached ledger;
 * false, throw or a Promise rejects without changing this instance. Do not write
 * first then return a Promise. The host persists the ledger in the same world
 * save as the physical controller, and projects room/bed ownership from it.
 * verifyReceipt must look up the same actual completed event in that controller;
 * a caller-supplied completed:true, dialogue timer or menu click is insufficient.
 * Every physical provider fails closed if absent. No host/world is auto-created.
 */
export function createConsortPetitionLedger({saved,worldSeed=1,actorId='player',saveState,getClock,getPlayer,getEmperor,getCourt,getVacancy,getCareers,getReviewContext,verifyReceipt}={}){
  if(!text(actorId)||[EMPEROR_ID,HERALD_ID,...CONSORT_INCUMBENTS.map(c=>c.actorId)].includes(actorId)||typeof saveState!=='function'||typeof getClock!=='function')throw new TypeError('consort ledger requires a player identity, synchronous saveState and getClock');
  let current=empty(worldSeed),loadError=null,lastError=null,busy=false;
  try{if(saved!==undefined&&saved!==null)current=validate(saved,worldSeed,actorId);}catch{loadError='invalid-consort-state';}
  const read=fn=>{try{return typeof fn==='function'?fn():null;}catch{return null;}};
  const latest=()=>current.petitions.at(-1)||null;
  const fail=(code,reasons=[code])=>{lastError=code;return {ok:false,code,reasons:[...reasons]};};
  function clock(){const at=read(getClock),p=latest();return time(at)&&(!p||after(at,p.endedAt||receiptTime(p)))?{day:at.day,hour:at.hour}:null;}
  function people(){const player=read(getPlayer),emperor=read(getEmperor);return {player,emperor,ok:player?.id===actorId&&emperor?.id===EMPEROR_ID&&adult(player.ageYears)&&adult(emperor.ageYears)};}
  function courtReasons(){
    const c=read(getCourt);
    if(!object(c)||c.emperorId!==EMPEROR_ID||!(c.empressId===null||text(c.empressId))||!Array.isArray(c.consorts))return ['court-state-unavailable'];
    const holders=c.consorts.map(x=>x?.actorId),rooms=c.consorts.map(x=>x?.roomId),beds=c.consorts.map(x=>x?.bedId);
    if(holders.some(x=>!text(x))||rooms.some(x=>!text(x))||beds.some(x=>!text(x))||new Set(holders).size!==holders.length||new Set(rooms).size!==rooms.length||new Set(beds).size!==beds.length||
      holders.includes(c.emperorId)||c.empressId!==null&&(c.empressId===c.emperorId||!holders.includes(c.empressId))||
      CONSORT_INCUMBENTS.some(i=>!c.consorts.some(h=>same(h.actorId,i.actorId)&&h.roomId===i.roomId&&h.bedId===i.bedId)))return ['court-registry-conflict'];
    if(c.empressId===actorId&&!current.appointment)return ['already-holds-political-title'];
    const others=c.consorts.filter(c=>c.actorId!==actorId);
    if(others.length>=CONSORT_CAPACITY||!current.appointment&&holders.includes(actorId))return ['no-consort-vacancy'];
    if(current.appointment){const own=c.consorts.find(c=>c.actorId===actorId);if(own&&(own.roomId!==current.appointment.residence.roomId||own.bedId!==current.appointment.residence.bedId))return ['court-registry-conflict'];}
    return [];
  }
  function vacancyReasons(expected=null,appointed=false){
    const v=read(getVacancy);
    if(!validResidence(v)||v.roomExists!==true||v.bedExists!==true||v.accessible!==true)return {reasons:['real-residence-required'],vacancy:null};
    if(expected&&!same(residence(v),expected))return {reasons:['residence-changed'],vacancy:null};
    const validOwner=id=>id===null||appointed&&id===actorId;
    if(!validOwner(v.roomOwnerId)||!validOwner(v.bedOwnerId))return {reasons:['residence-occupied'],vacancy:null};
    const c=read(getCourt);
    if(c?.consorts?.some(h=>h.actorId!==actorId&&(h.roomId===v.roomId||h.bedId===v.bedId)))return {reasons:['residence-occupied'],vacancy:null};
    return {reasons:[],vacancy:residence(v)};
  }
  function gates({residence:expected=null,career=false,appointed=false}={}){
    const peopleNow=people(),room=vacancyReasons(expected,appointed),reasons=[];
    if(loadError)reasons.push(loadError);
    if(!peopleNow.ok)reasons.push('adults-required');
    reasons.push(...courtReasons(),...room.reasons);
    if(career)reasons.push(...consortCareerBlockers(read(getCareers)));
    return {ok:reasons.length===0,reasons:[...new Set(reasons)],people:peopleNow,residence:room.vacancy};
  }
  const ageRecord=g=>({player:g.people.player.ageYears,emperor:g.people.emperor.ageYears});
  function availability(){
    const g=gates(),at=clock(),p=latest(),reasons=[...g.reasons];
    if(!at)reasons.push('invalid-clock');
    if(current.appointment)reasons.push('already-appointed');
    else if(p&&OPEN.has(p.stage))reasons.push('petition-pending');
    else if(at&&current.petitions.some(p=>p.submittedAt.day===at.day||p.resignation?.at.day===at.day))reasons.push('already-petitioned-today');
    return {ok:reasons.length===0,reasons,applicationId:at?consortPetitionId(actorId,at.day):null,residence:g.residence};
  }
  function checkReceipt(receipt,kind,p,at){
    if(!validReceipt(receipt,kind,p)||!after(at,receipt.at)||!after(receipt.at,receiptTime(p)))return false;
    try{return typeof verifyReceipt==='function'&&verifyReceipt(copy(receipt),{kind,applicationId:p.id,documentId:kind.startsWith('charter-')?consortCharterId(p.id):null})===true;}catch{return false;}
  }
  function persist(next){
    if(loadError||busy)return fail(loadError||'consort-busy');
    if(!integer(current.revision+1))return fail('revision-limit');
    next={...next,revision:current.revision+1};
    try{next=validate(next,worldSeed,actorId);}catch{return fail('invalid-consort-transition');}
    busy=true;
    try{
      const result=saveState(copy(next));
      if(result&&typeof result.then==='function'){Promise.resolve(result).catch(()=>{});return fail('async-save-unsupported');}
      if(result===false)return fail('save-failed');
      current=next;lastError=null;return {ok:true};
    }catch{return fail('save-failed');}finally{busy=false;}
  }
  const result=p=>({ok:true,code:p.stage,petition:copy(p)});
  function update(p,appointment=current.appointment){const out=persist({...current,petitions:current.petitions.map(old=>old.id===p.id?p:old),appointment});return out.ok?result(p):out;}
  function guard(id){if(loadError||busy)return fail(loadError||'consort-busy');const p=latest();return !p||p.id!==id?fail('stale-petition'):null;}
  function submit(receipt){
    if(loadError||busy)return fail(loadError||'consort-busy');
    const prior=latest();if(prior?.submission.id===receipt?.id)return sameReceipt(prior.submission,receipt)&&people().ok?{...result(prior),replayed:true}:fail('receipt-conflict');
    const a=availability();if(!a.ok)return fail(a.reasons[0],a.reasons);
    const at=clock(),g=gates();if(!time(receipt?.at)||receipt.at.day!==at.day)return fail('physical-submission-required');
    const p={id:a.applicationId,playerId:actorId,emperorId:EMPEROR_ID,stage:'submitted',submittedAt:copy(receipt.at),endedAt:null,
      residence:a.residence,roll:consortPetitionRoll(current.worldSeed,a.applicationId),ages:{submitted:ageRecord(g)},submission:copy(receipt||null),audience:null,review:null,choice:null,handoff:null,reading:null};
    if(!checkReceipt(receipt,'submission',p,at))return fail('physical-submission-required');
    const out=persist({...current,petitions:[...current.petitions,p]});return out.ok?result(p):out;
  }
  function invitationAvailability(){
    const a=availability(),at=clock(),previous=current.invitationDecisions.at(-1),p=latest(),reasons=[...a.reasons];
    if(at&&previous&&at.day<previous.nextDay)reasons.push('invitation-cooldown');
    const refusal=current.petitions.findLast(p=>invited(p)&&['declined','withdrawn'].includes(p.stage));
    if(at&&refusal&&at.day<refusal.endedAt.day+7)reasons.push('invitation-declined-cooldown');
    return {...a,ok:reasons.length===0,reasons};
  }
  function considerInvitation(receipt,opportunityId){
    if(loadError||busy)return fail(loadError||'consort-busy');
    const previous=current.invitationDecisions.find(d=>d.id===receipt?.applicationId);
    if(previous){if(!people().ok)return fail('adults-required');return opportunityId===previous.opportunityId&&sameReceipt(previous.receipt,receipt)?{ok:true,code:previous.offered?'invitation-recorded':'not-invited',replayed:true,offered:previous.offered}:fail('receipt-conflict');}
    const a=invitationAvailability();if(!a.ok)return fail(a.reasons[0],a.reasons);
    const at=clock(),g=gates();if(!text(opportunityId)||receipt?.at?.day!==at.day)return fail('physical-invitation-required');
    const p={id:a.applicationId,source:'emperor-invitation',opportunityId,playerId:actorId,emperorId:EMPEROR_ID,stage:'awaiting-choice',submittedAt:copy(receipt.at),endedAt:null,expiresAt:minutes(receipt.at)+180,
      residence:a.residence,roll:consortPetitionRoll(current.worldSeed,a.applicationId),ages:{submitted:ageRecord(g),reviewed:ageRecord(g)},submission:copy(receipt),audience:null,review:null,choice:null,handoff:null,reading:null};
    if(!checkReceipt(receipt,'invitation',p,at))return fail('physical-invitation-required');
    const context=read(getReviewContext)||{},preference=clamp(finite(context.appearancePreference,0),-1,1);
    // This is an observer-specific, bounded hook. Absent preferences are
    // neutral; the global player shape score never determines an invitation.
    p.review=reviewSnapshot({...g.people.player,...context.player,id:actorId,appearanceScore:50+preference*50},{...g.people.emperor,...context.emperor,id:EMPEROR_ID},{},p.roll);
    const decision={id:p.id,day:at.day,opportunityId,receipt:copy(receipt),at:copy(receipt.at),roll:p.roll,chance:p.review.chance,offered:p.review.passed,nextDay:at.day+1};
    const out=persist({...current,invitationDecisions:[...current.invitationDecisions,decision].slice(-8),petitions:p.review.passed?[...current.petitions,p]:current.petitions});
    return out.ok?{ok:true,code:decision.offered?'invited':'not-invited',offered:decision.offered,...(decision.offered?{petition:copy(p)}:{})}:out;
  }
  function expireInvitation(){
    const p=latest(),at=clock();if(!invited(p)||p.stage!=='awaiting-choice'||!at||minutes(at)<p.expiresAt)return {ok:true,changed:false};
    const out=update({...p,stage:'expired',endedAt:at});return {...out,changed:out.ok};
  }
  function reviewAudience(id,receipt){
    const blocked=guard(id);if(blocked)return blocked;const p=latest(),g=gates({residence:p.residence});if(!g.ok)return fail(g.reasons[0],g.reasons);
    if(p.audience)return sameReceipt(p.audience,receipt)?{...result(p),replayed:true}:fail('receipt-conflict');
    if(p.stage!=='submitted')return fail('wrong-petition-stage');
    const at=clock();if(!at)return fail('invalid-clock');if(!checkReceipt(receipt,'audience',p,at))return fail('physical-audience-required');
    const career=read(getCareers);if(!object(career?.skills)||career.loadError)return fail('career-state-unavailable');
    const context=read(getReviewContext)||{};
    const review=reviewSnapshot({...g.people.player,...context.player,id:actorId},{...g.people.emperor,...context.emperor,id:EMPEROR_ID},career.skills,p.roll);
    return update({...p,review,audience:copy(receipt),ages:{...p.ages,reviewed:ageRecord(g)},stage:review.passed?'awaiting-choice':'rejected',endedAt:review.passed?null:copy(receipt.at)});
  }
  function respond(id,choice){
    const blocked=guard(id);if(blocked)return blocked;const p=latest();if(!['accept','decline'].includes(choice))return fail('explicit-choice-required');
    const g=gates({residence:p.residence,career:choice==='accept'});
    // Declining always remains possible, including when the room/old job changes.
    if(choice==='accept'&&!g.ok)return fail(g.reasons[0],g.reasons);
    if(choice==='accept'&&invited(p)&&p.stage==='awaiting-choice'&&clock()&&minutes(clock())>=p.expiresAt)return fail('invitation-expired');
    if(p.choice)return p.choice.value===choice?{...result(p),replayed:true}:fail('choice-already-recorded');
    if(p.stage!=='awaiting-choice')return fail('wrong-petition-stage');
    const at=clock();if(!at)return fail('invalid-clock');
    return update({...p,choice:{value:choice,at},stage:choice==='accept'?'accepted':'declined',ages:{...p.ages,...(choice==='accept'?{accepted:ageRecord(g)}:{})},endedAt:choice==='accept'?null:at});
  }
  function receiveCharter(id,receipt){
    const blocked=guard(id);if(blocked)return blocked;const p=latest(),g=gates({residence:p.residence,career:true});if(!g.ok)return fail(g.reasons[0],g.reasons);
    if(p.handoff)return sameReceipt(p.handoff,receipt)?{...result(p),replayed:true}:fail('receipt-conflict');
    if(p.stage!=='accepted')return fail('wrong-petition-stage');
    const at=clock();if(!at)return fail('invalid-clock');if(!checkReceipt(receipt,'charter-handoff',p,at))return fail('physical-charter-required');
    return update({...p,handoff:copy(receipt),stage:'charter-held',ages:{...p.ages,received:ageRecord(g)}});
  }
  function completeInvestiture(id,receipt){
    const blocked=guard(id);if(blocked)return blocked;const p=latest(),g=gates({residence:p.residence,career:true,appointed:p.stage==='appointed'});if(!g.ok)return fail(g.reasons[0],g.reasons);
    if(p.reading)return sameReceipt(p.reading,receipt)?{...result(p),replayed:true}:fail('receipt-conflict');
    if(p.stage!=='charter-held')return fail('wrong-petition-stage');
    const at=clock();if(!at)return fail('invalid-clock');if(!checkReceipt(receipt,'charter-reading',p,at))return fail('physical-reading-required');
    const next={...p,reading:copy(receipt),stage:'appointed',endedAt:copy(receipt.at),ages:{...p.ages,appointed:ageRecord(g)}};
    const appointment={id:`consort-appointment:${p.id}`,applicationId:p.id,actorId,emperorId:EMPEROR_ID,titleId:'consort',residence:copy(p.residence),since:copy(receipt.at),receiptId:receipt.id};
    return update(next,appointment);
  }
  function withdraw(id){
    const blocked=guard(id);if(blocked)return blocked;const p=latest();if(p.stage==='withdrawn')return {...result(p),replayed:true};if(!OPEN.has(p.stage))return fail('wrong-petition-stage');
    const at=clock();if(!at)return fail('invalid-clock');return update({...p,stage:'withdrawn',endedAt:at});
  }
  function titleStatus(){
    const a=current.appointment,reasons=[];if(loadError)reasons.push(loadError);if(!a)reasons.push('not-appointed');
    else {if(!people().ok)reasons.push('adults-required');reasons.push(...courtReasons());}
    return {loadError,active:reasons.length===0,titleId:reasons.length===0?'consort':null,appointmentId:a?.id||null,appointmentReceiptId:a?.receiptId||null,residence:a?copy(a.residence):null,reasons};
  }
  function resignTitle(appointmentId,{confirmed=false}={}){
    if(loadError||busy)return fail(loadError||'consort-busy');if(confirmed!==true)return fail('explicit-resignation-required');
    const p=latest(),a=current.appointment;if(!a)return p?.stage==='resigned'&&p.resignation.appointmentId===appointmentId?{...result(p),replayed:true}:fail('not-appointed');
    if(a.id!==appointmentId)return fail('stale-appointment');const at=clock();if(!at)return fail('invalid-clock');
    return update({...p,stage:'resigned',endedAt:at,resignation:{appointmentId:a.id,reason:'voluntary',at}},null);
  }
  function entitlement(){
    if(!current.appointment)return {eligible:false,reasons:[loadError||'not-appointed'],appointment:null};
    const g=gates({residence:current.appointment.residence,appointed:true});
    return {eligible:g.ok,reasons:g.reasons,appointment:g.ok?copy(current.appointment):null};
  }
  function acceptanceAvailability(){
    const p=latest();if(!p||!['awaiting-choice','accepted','charter-held'].includes(p.stage))return {ok:false,reasons:[loadError||'wrong-petition-stage']};
    const g=gates({residence:p.residence,career:true});if(invited(p)&&p.stage==='awaiting-choice'&&clock()&&minutes(clock())>=p.expiresAt)g.reasons.push('invitation-expired');return {ok:g.reasons.length===0,reasons:g.reasons};
  }
  const api={titleStatus,resignTitle,acceptanceAvailability,invitationAvailability,considerInvitation,expireInvitation,appointment:()=>copy(current.appointment),witnessedEmperorAge:()=>current.appointment?latest()?.ages.appointed.emperor:null,state:()=>({...copy(current),loadError,lastError}),availability,submit,reviewAudience,respond,receiveCharter,completeInvestiture,withdraw,
    petition:()=>copy(latest()),history:()=>copy(current.petitions),
    residenceFor:()=>entitlement().appointment?.residence||null,
    royalMealEligibility:()=>{const e=entitlement();return {eligible:e.eligible,reasons:e.reasons,actorId,titleId:e.eligible?'consort':null,appointmentId:e.appointment?.id||null,appointmentReceiptId:e.appointment?.receiptId||null};},
    charterRequest:()=>{const p=latest();return p&&['accepted','charter-held'].includes(p.stage)&&gates({residence:p.residence,career:true}).ok?{applicationId:p.id,documentId:consortCharterId(p.id),playerId:actorId,emperorId:EMPEROR_ID,residence:copy(p.residence)}:null;},
    statusCard:()=>consortPetitionStatusCard(api)};
  return api;
}

const STAGE_LABELS={none:'尚未自荐',submitted:'待皇帝召见', 'awaiting-choice':'已获准 · 待你答复',accepted:'已接受 · 待授册','charter-held':'册书在手 · 待宣读',appointed:'册封已生效',rejected:'本次未获准',declined:'你已婉拒',withdrawn:'自荐已撤回',resigned:'已自愿辞去名位',expired:'邀请已过期'};
export const CONSORT_REASON_TEXT=Object.freeze({
  'adults-required':'双方须年满18岁','real-residence-required':'须先有真实可用的独立寝房','residence-occupied':'寝房或卧榻已有归属','residence-changed':'申请中的寝房发生变化',
  'no-consort-vacancy':'妃嫔席位已满','already-petitioned-today':'今日已自荐，次日可再试','petition-pending':'已有自荐待办','already-appointed':'已有妃嫔名位',
  'finish-current-duty':'先完成原职位班次','settle-current-wages':'先结清原职位待领工资','leave-formal-career':'须由你先办妥原正式职位离任',
  'career-state-unavailable':'原职业账暂不可核验','court-state-unavailable':'宫廷名册暂不可核验','court-registry-conflict':'宫廷名册有归属冲突','already-holds-political-title':'已有其他宫廷名位','explicit-resignation-required':'请明确确认辞去名位','title-rights-busy':'先结束寝居、用膳或册书中的活动',
  'relationship-reservations':'既有相处留下顾虑','different-dispositions':'性情取向尚不契合','emperor-unsettled':'此次召见时皇帝疲惫或饥饿','emperor-cautious':'皇帝性情审慎','personal-preference':'个人偏好未合','review-not-selected':'综合此次召见，皇帝未予批准',
  'invitation-expired':'此次名位邀请已过期','invitation-cooldown':'皇帝今日已作决定','invitation-declined-cooldown':'皇帝尊重你的答复，近期不会再邀',
});
// A compact data contract for the existing B+A card. No new HUD, remote
// appointment action, empress/emperor route or intimacy button is introduced.
export function consortPetitionStatusCard(ledger){
  const p=ledger.petition(),s=ledger.state(),title=ledger.titleStatus(),availability=ledger.availability(),stage=p?.stage||'none';
  const blockers=['awaiting-choice','accepted','charter-held'].includes(stage)?ledger.acceptanceAvailability().reasons:stage==='appointed'?title.reasons:availability.reasons.filter(code=>code!=='petition-pending');
  let primaryAction=null;
  if(!s.loadError){
    if(stage==='awaiting-choice')primaryAction=blockers.includes('adults-required')?{id:'withdraw',label:'撤回自荐',requiresPhysical:false}:{id:'respond',label:'答复册封意向',requiresPhysical:false};
    else if(stage==='charter-held'&&ledger.charterRequest())primaryAction={id:'read-charter',label:'当面宣读册书',requiresPhysical:true};
    else if(stage==='appointed'&&title.active)primaryAction={id:'resign-title',label:'辞去名位',requiresPhysical:false};
    else if(['none','rejected','declined','withdrawn','resigned','expired'].includes(stage)&&availability.ok)primaryAction={id:'visit-petition-desk',label:'到宫廷自荐处',requiresPhysical:true};
  }
  return {identity:title.active?'妃嫔':s.appointment?'册封记录待核':'无宫廷名位',titleId:title.titleId,residence:title.active?title.residence:null,applicationId:p?.id||null,source:p?.source||'self-petition',expiresAt:p?.expiresAt??null,stage,stageLabel:stage==='appointed'&&!title.active?'已有册封记录 · 资格待核':invited(p)&&stage==='awaiting-choice'?'皇帝邀你受册 · 待你答复':STAGE_LABELS[stage],
    primaryAction,result:p?.review?{passed:p.review.passed,reasons:p.review.reasons.map(code=>({code,text:CONSORT_REASON_TEXT[code]||code}))}:null,
    blockers:blockers.map(code=>({code,text:CONSORT_REASON_TEXT[code]||code})),historyCount:s.petitions.length};
}
