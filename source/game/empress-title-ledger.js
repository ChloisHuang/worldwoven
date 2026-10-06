import {consortCharterId,consortPetitionRoll,consortReviewFactors} from './consort-petition-ledger.js';

// The empress is one designation of an existing consort, never a fifth room,
// salary, spouse or new actor. These are game eligibility parameters, not law.
export const EMPRESS_MIN_TENURE_DAYS=3,EMPRESS_MIN_CONVERSATIONS=2;
const OPEN=new Set(['submitted','awaiting-choice','accepted','charter-held']);
const STAGES=new Set([...OPEN,'appointed','released','rejected','declined','withdrawn']);
const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const int=x=>Number.isSafeInteger(x)&&x>=0;
const str=x=>typeof x==='string'&&x.length>0&&x.length<=220;
const time=x=>obj(x)&&int(x.day)&&Number.isFinite(x.hour)&&x.hour>=0&&x.hour<24;
const after=(a,b)=>a.day>b.day||a.day===b.day&&a.hour>=b.hour;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const adult=x=>Number.isFinite(x)&&x>=18;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const round=x=>Math.round(x*1e6)/1e6;
const latestTime=p=>p.endedAt||p.reading?.at||p.handoff?.at||p.choice?.at||p.audience?.at||p.submittedAt;
export const empressPetitionId=(actor,day)=>`empress-petition:${actor}:${day}`;
const TEXT={
 'valid-consort-required':'须先实际受册为妃','empress-vacancy-required':'皇后名位已有归属','empress-required':'当前没有你的皇后名位','tenure-required':'任妃满3个游戏日后可请册','emperor-conversations-required':'须与皇帝完成至少2次交谈','relationship-reservations':'皇帝仍对既有相处有所顾虑','already-petitioned-today':'今日已议过后位，次日可再请','petition-pending':'后位事务正在办理','adults-required':'双方须年满18岁','invalid-empress-state':'后位记录暂不可核验','stale-consort':'原妃位已经变化','stale-empress':'后位归属已变化','invalid-clock':'当前时间暂不可核验','review-not-selected':'皇帝此次未准请册','explicit-choice-required':'请明确接受或婉拒','wrong-petition-stage':'当前事务已经变化','save-failed':'此次进度未保存，请重试','finish-empress-affairs':'先当面辞后并办结文书','service-unavailable':'当面接待暂不可用',
};
export const empressReasonText=code=>TEXT[code]||'当前条件暂不满足';
function validReceipt(r,kind,p){
 const people=kind==='submission'?['player','cn-emperor']:kind==='charter-handoff'?['player','cn-palace-herald']:['player','cn-emperor','cn-palace-herald'];
 return obj(r)&&r.id===`${p.id}:${kind}`&&r.kind===kind&&r.applicationId===p.id&&r.playerId==='player'&&r.emperorId==='cn-emperor'&&r.heraldId==='cn-palace-herald'&&str(r.targetId)&&r.completed===true&&time(r.at)&&Array.isArray(r.participants)&&new Set(r.participants).size===r.participants.length&&people.every(x=>r.participants.includes(x))&&(kind.startsWith('charter-')?r.documentId===consortCharterId(p.id):r.documentId===undefined);
}
function review(context={},eligibility={},roll){
 const factors=consortReviewFactors({player:{...context.player,id:'player',appearanceScore:50},emperor:{...context.emperor,id:'cn-emperor'},skills:{}});
 // No global beauty, complexion or maxed skill score substitutes for consent.
 const selected={personality:factors.personality,relationship:factors.relationship,emperor:factors.emperor,circumstances:factors.circumstances,tenure:round(Math.min(12,eligibility.days||0)*.01),conversations:round(Math.min(6,eligibility.conversations||0)*.02)};
 const chance=round(clamp(.32+Object.values(selected).reduce((a,b)=>a+b,0),.12,.85));
 return {roll,chance,passed:roll<chance,factors:selected,reasons:roll<chance?[]:['review-not-selected']};
}
function validate(s,seed){
 const fail=()=>{throw Error('invalid-empress-state');};
 if(!obj(s)||s.version!==1||s.worldSeed!==(seed>>>0)||!int(s.revision)||!Array.isArray(s.petitions))fail();
 let holder=null,prior=null,open=0;const days=new Set();
 for(const p of s.petitions){
  if(!obj(p)||!time(p.submittedAt)||p.id!==empressPetitionId('player',p.submittedAt.day)||days.has(p.submittedAt.day)||p.playerId!=='player'||p.emperorId!=='cn-emperor'||!['appoint','release'].includes(p.operation)||!str(p.consortAppointmentId)||!STAGES.has(p.stage)||p.roll!==consortPetitionRoll(seed,p.id)||!validReceipt(p.submission,'submission',p)||!same(p.submittedAt,p.submission.at)||!obj(p.ages)||!adult(p.ages.player)||!adult(p.ages.emperor)||!obj(p.eligibility)||!int(p.eligibility.days)||!int(p.eligibility.conversations)||prior&&!after(p.submittedAt,prior))fail();
  if(p.operation==='appoint'?(holder!==null||p.reason!=='consort-petition'||p.empressAppointmentId!==null||p.eligibility.days<EMPRESS_MIN_TENURE_DAYS||p.eligibility.conversations<EMPRESS_MIN_CONVERSATIONS):(holder===null||p.reason!=='voluntary-request'||p.empressAppointmentId!==holder.id))fail();
  days.add(p.submittedAt.day);if(OPEN.has(p.stage))open++;
  let boundary=p.submittedAt;
  for(const [key,kind] of [['audience','audience'],['handoff','charter-handoff'],['reading','charter-reading']]){const r=p[key];if(r!==null){if(!validReceipt(r,kind,p)||!after(r.at,boundary))fail();boundary=r.at;}}
  if(p.audience===null?p.review!==null:!obj(p.review))fail();
  if(p.review){const r=p.review;if(r.roll!==p.roll||typeof r.passed!=='boolean'||!Number.isFinite(r.chance)||!Array.isArray(r.reasons)||r.reasons.some(x=>x!=='review-not-selected'))fail();if(p.operation==='release'){if(!r.passed||r.chance!==1||r.reason!=='voluntary-request'||!same(r.factors,{}))fail();}else {const bounds={personality:[-.05,.05],relationship:[-.18,.18],emperor:[-.06,.06],circumstances:[-.2,0],tenure:[0,.12],conversations:[0,.12]};if(!obj(r.factors)||Object.keys(r.factors).length!==6||Object.entries(bounds).some(([k,[a,b]])=>!Number.isFinite(r.factors[k])||r.factors[k]<a-1e-7||r.factors[k]>b+1e-7)||r.chance!==round(clamp(.32+Object.values(r.factors).reduce((a,b)=>a+b,0),.12,.85))||r.passed!==(r.roll<r.chance))fail();}if(r.passed?r.reasons.length!==0:!same(r.reasons,['review-not-selected']))fail();}
  if(p.choice!==null&&(!p.review?.passed||!['accept','decline'].includes(p.choice.value)||!time(p.choice.at)||!after(p.choice.at,p.audience.at)))fail();
  if(p.handoff!==null&&(p.choice?.value!=='accept'||!after(p.handoff.at,p.choice.at)))fail();if(p.reading!==null&&p.handoff===null)fail();
  if(OPEN.has(p.stage)?p.endedAt!==null:!time(p.endedAt)||!after(p.endedAt,boundary)||p.choice&&!after(p.endedAt,p.choice.at))fail();
  if(p.stage==='submitted'&&(p.audience||p.choice||p.handoff||p.reading)||p.stage==='awaiting-choice'&&(!p.review?.passed||p.choice||p.handoff||p.reading)||p.stage==='accepted'&&(p.choice?.value!=='accept'||p.handoff||p.reading)||p.stage==='charter-held'&&(!p.handoff||p.reading)||p.stage==='rejected'&&(!p.review||p.review.passed||p.choice||p.handoff||p.reading)||p.stage==='declined'&&(p.choice?.value!=='decline'||p.handoff||p.reading)||p.stage==='withdrawn'&&p.reading||['appointed','released'].includes(p.stage)&&!p.reading)fail();
  if(p.stage==='appointed'){if(p.operation!=='appoint')fail();holder={id:`empress-appointment:${p.id}`,actorId:'player',emperorId:'cn-emperor',consortAppointmentId:p.consortAppointmentId,since:copy(p.reading.at),receiptId:p.reading.id};}
  if(p.stage==='released'){if(p.operation!=='release')fail();holder=null;}
  prior=latestTime(p);
 }
 if(open>1||open===1&&!OPEN.has(s.petitions.at(-1).stage)||!same(holder,s.appointment))fail();
 return copy(s);
}
export function createEmpressTitleLedger({saved,worldSeed=1,getClock,getConsort,getPlayer,getEmperor,getContext,getConversationCount,verifyReceipt,saveState}={}){
 let current={version:1,revision:0,worldSeed:worldSeed>>>0,petitions:[],appointment:null},loadError=null,busy=false;
 try{if(saved!=null)current=validate(saved,worldSeed);}catch{loadError='invalid-empress-state';}
 const read=fn=>{try{return fn?.();}catch{return null;}};
 const latest=()=>current.petitions.at(-1)||null;
 const fail=code=>({ok:false,code,reasons:[code],message:empressReasonText(code)});
 const result=(p,extra={})=>({ok:true,code:p.stage,petition:copy(p),...extra});
 const clock=()=>{const t=read(getClock),p=latest();return time(t)&&(!p||after(t,latestTime(p)))?{day:t.day,hour:t.hour}:null;};
 function base(){const c=read(getConsort),p=read(getPlayer),e=read(getEmperor),a=c?.appointment?.();return {a,p,e,valid:c?.titleStatus?.().active&&a?.titleId==='consort'&&a.actorId==='player'&&a.emperorId==='cn-emperor',adults:p?.id==='player'&&e?.id==='cn-emperor'&&adult(p.ageYears)&&adult(e.ageYears)};}
 function eligibility(){const b=base(),at=clock(),n=read(getConversationCount);return {days:b.a&&at?Math.max(0,at.day-b.a.since.day):0,conversations:int(n)?n:0};}
 function gates(operation,p=null){const b=base(),reasons=[];if(loadError)reasons.push(loadError);if(!b.valid)reasons.push('valid-consort-required');if(!b.adults)reasons.push('adults-required');if(p&&b.a?.id!==p.consortAppointmentId)reasons.push('stale-consort');if(operation==='appoint'&&current.appointment)reasons.push('empress-vacancy-required');if(operation==='release'&&(!current.appointment||p&&current.appointment.id!==p.empressAppointmentId))reasons.push('stale-empress');return {b,reasons};}
 function availability(operation=current.appointment?'release':'appoint'){
  const g=gates(operation),at=clock(),p=latest(),e=eligibility(),reasons=[...g.reasons];if(!at)reasons.push('invalid-clock');if(p&&OPEN.has(p.stage))reasons.push('petition-pending');else if(at&&p?.submittedAt.day===at.day)reasons.push('already-petitioned-today');
  if(operation==='appoint'){if(e.days<EMPRESS_MIN_TENURE_DAYS)reasons.push('tenure-required');if(e.conversations<EMPRESS_MIN_CONVERSATIONS)reasons.push('emperor-conversations-required');const emperor=read(getContext)?.emperor;if((emperor?.relations?.player??0)<-.1||(emperor?.opinions?.player??0)<-.1)reasons.push('relationship-reservations');}
  return {ok:reasons.length===0,reasons,eligibility:e,applicationId:at?empressPetitionId('player',at.day):null};
 }
 function persist(next){if(loadError||busy)return fail(loadError||'service-unavailable');try{next=validate({...next,revision:current.revision+1},worldSeed);}catch{return fail('invalid-empress-transition');}busy=true;try{const r=saveState(copy(next));if(r?.then){Promise.resolve(r).catch(()=>{});return fail('save-failed');}if(r===false)return fail('save-failed');current=next;return {ok:true};}catch{return fail('save-failed');}finally{busy=false;}}
 function update(p,appointment=current.appointment){const out=persist({...current,petitions:current.petitions.map(q=>q.id===p.id?p:q),appointment});return out.ok?result(p):out;}
 function guard(id){return loadError?fail(loadError):busy?fail('service-unavailable'):latest()?.id!==id?fail('stale-petition'):null;}
 function check(r,kind,p){const at=clock();return at&&validReceipt(r,kind,p)&&after(at,r.at)&&after(r.at,latestTime(p))&&read(()=>verifyReceipt(copy(r),{kind,applicationId:p.id,documentId:kind.startsWith('charter-')?consortCharterId(p.id):null}))===true;}
 function submit(receipt,operation=current.appointment?'release':'appoint'){
  const prior=latest();if(prior?.submission.id===receipt?.id)return same(prior.submission,receipt)&&prior.operation===operation&&base().adults?result(prior,{replayed:true}):fail('receipt-conflict');
  const a=availability(operation);if(!a.ok)return fail(a.reasons[0]);const b=base(),p={id:a.applicationId,playerId:'player',emperorId:'cn-emperor',operation,reason:operation==='release'?'voluntary-request':'consort-petition',consortAppointmentId:b.a.id,empressAppointmentId:current.appointment?.id||null,stage:'submitted',submittedAt:copy(receipt?.at),endedAt:null,ages:{player:b.p.ageYears,emperor:b.e.ageYears},eligibility:a.eligibility,roll:consortPetitionRoll(worldSeed,a.applicationId),submission:copy(receipt),audience:null,review:null,choice:null,handoff:null,reading:null};
  if(!time(p.submittedAt)||p.submittedAt.day!==clock().day||!check(receipt,'submission',p))return fail('physical-submission-required');const out=persist({...current,petitions:[...current.petitions,p]});return out.ok?result(p):out;
 }
 function reviewAudience(id,r){const bad=guard(id);if(bad)return bad;const p=latest(),g=gates(p.operation,p);if(g.reasons.length)return fail(g.reasons[0]);if(p.audience)return same(p.audience,r)?result(p,{replayed:true}):fail('receipt-conflict');if(p.stage!=='submitted')return fail('wrong-petition-stage');if(!check(r,'audience',p))return fail('physical-audience-required');const decision=p.operation==='release'?{roll:p.roll,chance:1,passed:true,factors:{},reason:'voluntary-request',reasons:[]}:review(read(getContext),eligibility(),p.roll);return update({...p,audience:copy(r),review:decision,stage:decision.passed?'awaiting-choice':'rejected',endedAt:decision.passed?null:copy(r.at)});}
 function acceptanceAvailability(){const p=latest();if(!p||!['awaiting-choice','accepted','charter-held'].includes(p.stage))return {ok:false,reasons:['wrong-petition-stage']};const {reasons}=gates(p.operation,p);return {ok:reasons.length===0,reasons};}
 function respond(id,choice){const bad=guard(id);if(bad)return bad;const p=latest();if(!['accept','decline'].includes(choice))return fail('explicit-choice-required');if(p.choice)return p.choice.value===choice?result(p,{replayed:true}):fail('choice-already-recorded');if(p.stage!=='awaiting-choice')return fail('wrong-petition-stage');if(choice==='accept'){const g=acceptanceAvailability();if(!g.ok)return fail(g.reasons[0]);}const at=clock();if(!at)return fail('invalid-clock');return update({...p,choice:{value:choice,at},stage:choice==='accept'?'accepted':'declined',endedAt:choice==='accept'?null:at});}
 function receiveCharter(id,r){const bad=guard(id);if(bad)return bad;const p=latest(),g=gates(p.operation,p);if(g.reasons.length)return fail(g.reasons[0]);if(p.handoff)return same(p.handoff,r)?result(p,{replayed:true}):fail('receipt-conflict');if(p.stage!=='accepted'||!check(r,'charter-handoff',p))return fail('physical-charter-required');return update({...p,handoff:copy(r),stage:'charter-held'});}
 function completeInvestiture(id,r){const bad=guard(id);if(bad)return bad;const p=latest();if(p.reading)return same(p.reading,r)&&base().adults?result(p,{replayed:true}):fail('receipt-conflict');const g=gates(p.operation,p);if(g.reasons.length)return fail(g.reasons[0]);if(p.stage!=='charter-held'||!check(r,'charter-reading',p))return fail('physical-reading-required');const a=p.operation==='appoint'?{id:`empress-appointment:${p.id}`,actorId:'player',emperorId:'cn-emperor',consortAppointmentId:p.consortAppointmentId,since:copy(r.at),receiptId:r.id}:null;return update({...p,reading:copy(r),stage:p.operation==='appoint'?'appointed':'released',endedAt:copy(r.at)},a);}
 function withdraw(id){const bad=guard(id);if(bad)return bad;const p=latest();if(p.stage==='withdrawn')return result(p,{replayed:true});if(!OPEN.has(p.stage))return fail('wrong-petition-stage');const at=clock();return at?update({...p,stage:'withdrawn',endedAt:at}):fail('invalid-clock');}
 const api={availability,acceptanceAvailability,submit,reviewAudience,respond,receiveCharter,completeInvestiture,withdraw,petition:()=>copy(latest()),history:()=>copy(current.petitions),appointment:()=>copy(current.appointment),state:()=>({...copy(current),loadError}),hasOpen:()=>OPEN.has(latest()?.stage),
  titleStatus(){const b=base(),active=!!current.appointment&&!loadError&&b.valid&&b.adults&&b.a.id===current.appointment.consortAppointmentId;return {active,titleId:active?'empress':null,appointmentId:current.appointment?.id||null,loadError};},
  statusCard(){const p=latest(),operation=p&&OPEN.has(p.stage)?p.operation:current.appointment?'release':'appoint',g=p&&OPEN.has(p.stage)?(p.stage==='submitted'?{reasons:gates(p.operation,p).reasons}:acceptanceAvailability()):availability(operation),b=base();return {titleKind:'empress',titleId:api.titleStatus().active?'empress':b.valid?'consort':null,empressId:current.appointment?.actorId||null,stage:p?.stage||'none',operation,applicationId:p?.id||null,residence:copy(b.a?.residence),eligibility:eligibility(),blockers:g.reasons.map(code=>({code,text:empressReasonText(code)})),result:p?.review?{passed:p.review.passed,reasons:p.review.reasons.map(code=>({code,text:empressReasonText(code)}))}:null,historyCount:current.petitions.length};},
 };
 return api;
}
