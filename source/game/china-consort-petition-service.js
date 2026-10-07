import {followActorRoute} from './actor-navigation.js';
import {PALACE_EDICT} from './china-palace-edict-place.js';
import {consortCharterId} from './consort-petition-ledger.js';
import {createConsortCharterProps} from './china-consort-petition-props.js';

export const CONSORT_PETITION_PLACE=Object.freeze({
 owner:'china-consort-petition',reception:[-18.85,.215,-10.5],receptionPlayer:[-18.85,.215,-9.3],
 emperor:[-15.1,.215,-13.35],herald:[-16.3,.215,-14.3],player:[-15.1,.145,-14.6],
 targetId:'cn-consort-public-audience',receptionTargetId:'cn-residence-living',
});
// The standing approach is a navigation destination, not the actor's body.
// Its stop tolerance must stay tighter than the separate 2.2m live encounter.
export const consortIntentExecutionRadius=(target,kind)=>kind==='residence'?.3:target?.targetKey==='cn-emperor'?.7:.8;
const C=CONSORT_PETITION_PLACE,OWNER=C.owner,E=PALACE_EDICT.points;
const TO_PUBLIC=[[2,1.415,3],[2,1.415,6],[2,.13,11],[-3,.13,11],[-14.4,.115,.4],[-14.4,.115,-10],[-14.4,.145,-14.4],[-16.8,.215,-14.4],C.herald];
const RECEPTION_PATH=[[-18.85,.215,-13.35],C.reception];
const TO_DESK=[C.herald,...TO_PUBLIC.slice(0,-1).reverse(),E.sealStand];
const copy=v=>JSON.parse(JSON.stringify(v)),point=a=>({x:a[0],y:a[1],z:a[2]});
const near=(p,a,r=.12)=>!!p&&Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.35;
const TERMINAL=new Set(['completed','missed','postponed','interrupted']);
const PHASES=new Set(['summoning','audience','commit-audience','to-desk','place-charter','drafting','sealing','pickup-charter','to-meeting','await-handoff','handoff','commit-handoff','reading','commit-reading']);
const REASONS={
 'emperor-unavailable':'原皇帝已不在位或无法接待，旧邀约不能由其他人承接；记录保留。','court-busy':'朝会及朝后事务尚未结束，请稍后再来','court-unfinished':'今日11:30朝会尚未结束，暂不另排召见','outside-hours':'召见安排在朝后至晚间，明日再来',
 'edict-unfinished':'沈序正在办理原宫苑文书，办结后才能接待','herald-returning':'沈序正沿公共通道回传令案，稍后再来','herald-borrowed':'沈序正在接待另一件事务',
 'herald-in-conversation':'沈序正在交谈，请稍候','herald-away':'沈序正在前往后宫公共接待处','come-to-reception':'请到后宫公共接待处，当面向沈序自荐',
 'come-to-emperor':'请到原皇帝身旁当面提出','come-to-audience':'请到后宫公共通廊东口的听候处','emperor-busy':'皇帝手边公务尚未结束，请稍后再候召','player-busy':'请先结束当前活动',
 'left-meeting':'你已离开听候处，本次会面暂停，申请仍然保留','audience-timeout':'此次等候超时，已释放公务安排，可回来重新候召','save-failed':'进度暂未保存，完成动作将保留并重试',
 'adults-required':'参与者均须年满18岁','service-unavailable':'接待暂不可用','awaiting-choice':'皇帝已给出答复，请由你明确接受或婉拒','user-cancelled':'已暂停此次接待，可稍后回来继续',
};

// Clock/court checks are cheap and use the existing services. No timer creates
// approval: only actual arrival plus a completed, uninterrupted encounter does.
export function consortCourtWindow({clock,audience,edict,owner=OWNER}={}){
 if(!clock||!Number.isSafeInteger(clock.day)||!Number.isFinite(clock.hour))return {ok:false,reason:'service-unavailable'};
 const a=audience?.courtStatus?.()||audience?.state?.(),s=a?.schedule;
 if(!s||s.day!==clock.day||s.calledDay!==clock.day||!TERMINAL.has(s.outcome))return {ok:false,reason:'court-unfinished'};
 if(a.phase!=='waiting')return {ok:false,reason:'court-busy'};
 return edict?.heraldAvailability?.(owner)||{ok:false,reason:'service-unavailable'};
}

export function createChinaConsortPetitionService({npcs,lot,palace,audience,edict,doors,planPath,moveActor,poseContext,getPlayer,getClock,getLedger,getEmpressLedger,getBusy=()=>false,getInvitationBusy=getBusy,canSee=()=>true,saved={},saveState=()=>true,notify=()=>{}}){
 let herald=npcs.find(n=>n.station.id==='cn-palace-herald');
 const emperor=npcs.find(n=>n.station.id==='cn-emperor');
 if(!emperor||!palace||!edict||!audience)return null;
 const props=createConsortCharterProps(lot.group),receipts=new Map();
 let flow=null,pendingSubmission=null,document=null,task=null,state={},time=0,loan=false,disposed=false,lastReason=null,dirty=false,retryAt=0,nextInvitationCheck=0;
 const baseLedger=()=>getLedger?.(),empressLedger=()=>getEmpressLedger?.(),isEmpress=()=>flow?.titleKind?flow.titleKind==='empress':!!(empressLedger()&&baseLedger()?.appointment()),ledger=()=>isEmpress()?empressLedger():baseLedger(),petition=()=>ledger()?.petition(),clock=()=>getClock?.(),player=()=>getPlayer?.();
 let heraldIdentity=null;
 const openPetition=()=>[baseLedger()?.petition?.(),empressLedger()?.petition?.()].find(p=>['submitted','awaiting-choice','accepted','charter-held'].includes(p?.stage));
 const pendingWork=()=>!!(loan||flow||pendingSubmission||task||document&&!document.filed||openPetition());
 const binding=()=>edict.heraldBinding?.()||{actorId:'cn-palace-herald',holderRevision:0,available:herald?.alive!==false};
 const currentActor=()=>edict.resolveHeraldActor?edict.resolveHeraldActor():npcs.find(n=>n.station.id==='cn-palace-herald');
 function syncHerald(){
  const b=binding(),candidate=currentActor();
  if(!pendingWork())heraldIdentity=null;
  const p=openPetition();
  if(!heraldIdentity&&p?.submission)heraldIdentity={actorId:p.submission.heraldId,holderRevision:p.submission.heraldRevision??0};
  if(heraldIdentity&&p?.submission&&(p.submission.heraldId!==heraldIdentity.actorId||(p.submission.heraldRevision??0)!==heraldIdentity.holderRevision))return false;
  if(heraldIdentity&&document&&!document.filed&&((document.heraldId||'cn-palace-herald')!==heraldIdentity.actorId||(document.heraldRevision??0)!==heraldIdentity.holderRevision))return false;
  if(heraldIdentity){herald=npcs.find(n=>n.station.id===heraldIdentity.actorId)||null;return !!herald&&herald!==player()&&herald.alive!==false&&candidate===herald&&b.actorId===heraldIdentity.actorId&&b.holderRevision===heraldIdentity.holderRevision&&b.available!==false;}
  herald=candidate;
  return !!herald&&herald!==player()&&herald.station.id!=='player'&&herald.alive!==false&&b.actorId===herald.station.id&&b.available!==false;
 }
 const pinHerald=()=>{if(!syncHerald())return false;const b=binding();heraldIdentity={actorId:b.actorId,holderRevision:b.holderRevision};return true;};
 const heraldName=()=>herald?.station.npcName?.split(' · ')[0]||'传令员';
 const wording=text=>text?.replaceAll('沈序',heraldName());
 const emperorCurrent=()=>emperor.alive!==false&&(!Object.hasOwn(emperor.station,'royalRole')||emperor.station.royalRole==='emperor')&&(!emperor.actorId||emperor.actorId==='cn-emperor');
 const adults=()=>emperorCurrent()&&syncHerald()&&player()?.alive!==false&&player()?.ageYears>=18&&emperor.station.ageYears>=18&&herald.station.ageYears>=18;
 const tell=text=>{const el=herald?.label?.querySelector?.('small');if(el)el.textContent=wording(text);};
 const emit=reason=>{lastReason=reason;return {ok:false,code:reason,message:wording(REASONS[reason]||reason)};};
 const window=()=>syncHerald()?consortCourtWindow({clock:clock(),audience,edict}):{ok:false,reason:'service-unavailable'};
 const paused=()=>state.conversationActorId===herald?.station.id||state.conversationActorId===emperor.station.id||!!getBusy();
 const atReception=()=>loan&&(!task||task.arrived)&&near(herald?.root?.position,C.reception,.25)&&near(player()?.root.position,C.receptionPlayer,1.35)&&canSee(player().root.position,herald.root.position);
 const atMeeting=()=>near(player()?.root.position,C.player,1.15)&&canSee(player().root.position,point(C.player));
 const atEmperor=()=>{const p=player()?.root.position,o=emperor.root.position,y=palace.mountForActor?.(emperor)?.position?.[1]??o.y;return !!p&&Math.hypot(p.x-o.x,p.z-o.z)<=2.2&&Math.abs(p.y-y)<.35&&canSee(p,o);};
 const emperorReady=()=>palace.dutyState(OWNER)?.ready&&near(emperor.root.position,C.emperor,.3);
 const present=()=>loan&&edict.borrowedHerald(OWNER)&&near(herald?.root?.position,C.herald,.25)&&emperorReady()&&atMeeting()&&canSee(player().root.position,emperor.root.position)&&canSee(player().root.position,herald.root.position)&&!paused()&&adults();
 const snapshot=()=>({version:1,heraldIdentity:copy(heraldIdentity),time,nextInvitationCheck,flow:copy(flow),pendingSubmission:copy(pendingSubmission),document:copy(document),task:copy(task),receipts:[...receipts.values()].map(copy),lastReason});
 function save(){try{const result=saveState(snapshot());dirty=result===false||!!result?.then;if(result?.then)Promise.resolve(result).catch(()=>{});}catch{dirty=true;}if(dirty)lastReason='save-failed';return !dirty;}
 function phase(value){flow.phase=value;flow.elapsed=0;task=null;save();}
 function route(path,label){task={path:path.map(a=>a.slice()),index:0,arrived:false,planned:false,stalled:0,retries:0,label:wording(label)};herald.route=[];}
 function borrow(){if(!pinHerald()||!edict.borrowHerald(OWNER))return false;loan=true;return true;}
 function release(){palace.releaseInvitation?.(OWNER);palace.setDutyLine(OWNER,null);palace.releaseDuty(OWNER);if(loan)edict.releaseHerald(OWNER);loan=false;task=null;}
 function cancel(reason){pendingSubmission=null;if(document&&flow&&['drafting','sealing'].includes(flow.phase)){document.workPhase=flow.phase;document.workElapsed=flow.elapsed;}if(document&&!document.filed&&document.holder==='herald'){document.returning=true;document.stowElapsed=0;}flow=null;release();lastReason=reason;save();return emit(reason);}
 function begin(kind){const titleKind=isEmpress()?'empress':'consort';flow={kind,titleKind,phase:kind==='audience'?'summoning':'to-desk',elapsed:0,age:0,day:clock().day,applicationId:petition().id};lastReason=null;}
 function move(dt){
  if(!task||task.arrived)return;const p=task.path[task.index];
  if(near(herald.root.position,p)){herald.route=[];task.planned=false;task.retries=0;if(++task.index===task.path.length)task.arrived=true;return;}
  if(!task.planned){herald.route=planPath(herald.root.position,point(p),.25);task.planned=true;}
  const step=followActorRoute(herald,dt,{doors,moveActor,npcs,playerPosition:player()?.root.position,speedScale:.78});
  task.stalled=herald.walking||step.waiting?0:task.stalled+dt;if(task.stalled>4){task.stalled=0;task.planned=false;task.retries++;}
 }
 function record(kind){
  const p=petition(),applicationId=kind==='submission'?ledger().availability().applicationId:p?.id,id=`${applicationId}:${kind}`,existing=receipts.get(id);if(existing)return existing.receipt;
  const participants=kind==='submission'&&isEmpress()?['player',emperor.station.id]:kind==='submission'||kind==='charter-handoff'?['player',herald.station.id]:['player',emperor.station.id,herald.station.id];
  const r={id:applicationId+':'+kind,kind,applicationId,playerId:'player',emperorId:emperor.station.id,heraldId:herald.station.id,heraldRevision:heraldIdentity?.holderRevision??binding().holderRevision,targetId:kind==='submission'?(isEmpress()?emperor.station.id:C.receptionTargetId):C.targetId,completed:true,participants,at:{day:clock().day,hour:clock().hour},...(kind.startsWith('charter-')?{documentId:document.id}:{})};
  receipts.set(r.id,{receipt:r,positions:{player:player().root.position.toArray(),herald:herald.root.position.toArray(),emperor:emperor.root.position.toArray()},documentId:document?.id||null,sealed:!!document?.sealed});return r;
 }
 function settle(kind){
  const titleKind=isEmpress()?'empress':'consort',p=petition(),r=receipts.get(p.id+':'+kind)?.receipt;if(!r){lastReason='physical-receipt-missing';return false;}const result=kind==='audience'?ledger().reviewAudience(p.id,r):kind==='charter-handoff'?ledger().receiveCharter(p.id,r):ledger().completeInvestiture(p.id,r);
  if(!result.ok){lastReason=result.code;return false;}
  if(kind==='charter-handoff'){document.holder='player';phase('reading');palace.setDutyLine(OWNER,titleKind==='empress'?(p.operation==='release'?'依本人请辞，免去后位，仍保妃位与寝居。':'既经本人愿受，册立为后，原妃位与寝居照旧。'):'既经自愿受册，赐居后宫独立寝房。');}
  else {if(document&&kind==='charter-reading')document.filed=true;flow=null;release();save();notify(titleKind==='empress'?(kind==='audience'?(result.petition.stage==='awaiting-choice'?(p.operation==='release'?'皇帝已裁可请辞。请明确确认辞后，原妃位保留。':'皇帝准予请册。是否愿受后位，由你决定。'):'皇帝未准此次请册，今日结果已记下。'):(p.operation==='release'?'免后文书宣读完毕，后位现已空缺，你仍保原妃位与寝居。':'册后文书宣读完毕，你已受册为后，原寝居与妃位继续保留。')):(kind==='audience'?(result.petition.stage==='awaiting-choice'?'皇帝已准予自荐。是否接受，由你决定。':'皇帝未准本次自荐，今日结果已记下。'):'册书宣读完毕，你已受封为妃，独立寝房现已归你使用。'));}
  return true;
 }
 function publicReady(stage){const p=petition();if(p?.stage!==stage)return emit('wrong-petition-stage');if(!syncHerald())return emit('service-unavailable');if(!adults())return emit('adults-required');if(getBusy())return emit('player-busy');const w=window();if(!w.ok)return emit(w.reason);if(!atMeeting())return emit('come-to-audience');if(!borrow())return emit('herald-away');return {ok:true};}
 function checkInvitation(){
  const now=clock(),seconds=now?.seconds;if(!Number.isFinite(seconds)||seconds<nextInvitationCheck)return;
  nextInvitationCheck=seconds+1;
  const expired=baseLedger()?.expireInvitation?.();if(expired?.changed){palace.releaseInvitation?.(OWNER);notify('皇帝的名位邀请已超过三小时（游戏时间），此次邀约已到期。可在皇帝处查看记录；尚未接受，也未授予名位。');}
  if(flow||pendingSubmission||loan||!adults()||getInvitationBusy()||state.conversationActorId===emperor.station.id||!baseLedger()?.invitationAvailability?.().ok)return;
  const pos=player()?.root.position,other=emperor.root.position;
  // A seated actor's foot support can be raised (the original throne has a
  // footrest). Compare the real standing approach level, still ray-test the
  // actual actor; never regard another storey as the same encounter.
  const floorY=palace.mountForActor?.(emperor)?.position?.[1]??other.y;
  if(!pos||emperor.root.visible===false||Math.hypot(pos.x-other.x,pos.z-other.z)>2.2||Math.abs(pos.y-floorY)>.35||!canSee(pos,other))return;
  const w=window();if(!w.ok)return;
  const opportunity=palace.invitationOpportunity?.();if(!opportunity||!palace.holdInvitation?.(OWNER,opportunity.id,pos))return;
  if(!pinHerald())return;
  const applicationId=baseLedger().invitationAvailability().applicationId,id=applicationId+':invitation';
  const receipt={id,kind:'invitation',applicationId,playerId:'player',emperorId:emperor.station.id,heraldId:herald.station.id,heraldRevision:heraldIdentity?.holderRevision??binding().holderRevision,targetId:emperor.station.id,completed:true,participants:['player',emperor.station.id],at:{day:now.day,hour:now.hour}};
  receipts.set(id,{receipt,positions:{player:pos.toArray(),emperor:other.toArray(),herald:herald.root.position.toArray()},documentId:null,sealed:false});
  const out=baseLedger().considerInvitation(receipt,opportunity.id);
  if(!out.ok){receipts.delete(id);palace.releaseInvitation?.(OWNER);lastReason=out.code;return;}
  if(!out.offered){palace.releaseInvitation?.(OWNER);return;}
  lastReason=null;notify('皇帝愿邀你受妃嫔名位。可在他身旁查看邀请并明确答复；不答复不会授册。');
 }
 const api={
  heraldHandoffBoundary:()=>({ok:!pendingWork(),blockers:pendingWork()?[{kind:'herald-petition-unfinished'}]:[]}),
  currentLedger:ledger,history:()=>ledger()?.history?.()||[],
  owns:n=>loan&&edict.borrowedHerald(OWNER)&&n===herald,
  socialStatus:n=>loan&&n===herald?{busy:!!flow,attention:!flow,job:task?.label||'后宫公共接待 · 自荐与册封问询'}:null,
  interactionTarget(){const courierReady=syncHerald();const p=petition();if(isEmpress()&&(!p||!['submitted','awaiting-choice','accepted','charter-held'].includes(p.stage)))return {heraldId:herald?.station.id||null,holderRevision:heraldIdentity?.holderRevision??binding().holderRevision,id:emperor.station.id,targetKey:emperor.station.id,targetName:'皇帝',name:'皇帝 · 后位事务',position:palace.mountForActor?.(emperor)?.position?.slice()||emperor.root.position.toArray(),radius:2.2};if(p?.source==='emperor-invitation'&&['awaiting-choice','expired'].includes(p.stage))return {heraldId:herald?.station.id||null,holderRevision:heraldIdentity?.holderRevision??binding().holderRevision,id:emperor.station.id,targetKey:emperor.station.id,targetName:'皇帝',name:'皇帝的名位邀请',position:palace.mountForActor?.(emperor)?.position?.slice()||emperor.root.position.toArray(),radius:2.2};const meeting=p&&['submitted','accepted','charter-held'].includes(p.stage);return {id:meeting?C.targetId:C.receptionTargetId,available:courierReady,heraldId:herald?.station.id||null,targetKey:herald?.station.id||C.receptionTargetId,targetName:herald?heraldName()+' · 宫廷接待':'宫廷接待 · 暂无在岗传令员',holderRevision:heraldIdentity?.holderRevision??binding().holderRevision,name:meeting?'后宫公共听候处':'后宫公共接待 · '+heraldName(),position:(meeting?C.player:C.receptionPlayer).slice(),roomId:meeting?'outdoors':'residence-living',radius:1.1};},
  reception(){const w=window();if(!w.ok)return emit(w.reason);if(!syncHerald())return emit('service-unavailable');if(!adults())return emit('adults-required');if(!loan&&!borrow())return emit('herald-away');if(!task&&!near(herald?.root?.position,C.reception,.25)){route([...TO_PUBLIC,...RECEPTION_PATH],'沈序沿公共通道前往后宫接待处');save();}return {ok:true,ready:atReception()};},
  empressAvailability(operation){const a=empressLedger()?.availability(operation)||{ok:false,reasons:['service-unavailable']},w=window(),person=palace.petitionAvailability?.()||{ok:false,reason:'emperor-busy'},reasons=[...a.reasons,...(!w.ok?[w.reason]:[]),...(!person.ok?[person.reason||'emperor-busy']:[])];return {...a,ok:reasons.length===0,reasons,code:reasons[0],message:wording(REASONS[reasons[0]])};},
  requestEmpress(operation){if(disposed||!empressLedger()||!isEmpress())return emit('service-unavailable');if(flow||pendingSubmission)return emit('petition-busy');if(!['appoint','release'].includes(operation))return emit('wrong-petition-stage');if(!syncHerald())return emit('service-unavailable');if(!adults())return emit('adults-required');if(getBusy()||state.conversationActorId===emperor.station.id)return emit('player-busy');if(!atEmperor())return emit('come-to-emperor');const w=window();if(!w.ok)return emit(w.reason);const a=api.empressAvailability(operation);if(!a.ok)return a;if(!palace.holdPetition?.(OWNER,player().root.position))return emit('emperor-busy');if(!pinHerald())return emit('service-unavailable');const r=record('submission'),out=empressLedger().submit(r,operation);if(out.ok){lastReason=null;save();notify(operation==='release'?'皇帝已听见你请辞后位的心意，请到原听候处当面议定。':'皇帝已受理你的请册，请到原听候处当面议定。');}else {receipts.delete(r.id);palace.releaseInvitation?.(OWNER);lastReason=out.code;}return out;},
  requestSubmission(){if(isEmpress())return emit('wrong-petition-stage');if(disposed)return emit('service-unavailable');if(!near(player()?.root.position,C.receptionPlayer,1.35))return emit('come-to-reception');if(getBusy())return emit('player-busy');if(!syncHerald())return emit('service-unavailable');if(!adults())return emit('adults-required');const w=window();if(!w.ok)return emit(w.reason);const available=ledger().availability();if(!available.ok)return available;if(pendingSubmission?.applicationId!==available.applicationId){pendingSubmission={applicationId:available.applicationId,day:clock().day};if(!save())return emit('save-failed');}const approach=api.reception();if(!approach.ok){pendingSubmission=null;save();return approach;}if(atReception())return api.submit();return {ok:true,pending:true,code:'awaiting-herald'};},
  submit(){if(disposed)return emit('service-unavailable');if(getBusy())return emit('player-busy');if(!syncHerald())return emit('service-unavailable');if(!adults())return emit('adults-required');const w=window();if(!w.ok)return emit(w.reason);if(!atReception())return emit('come-to-reception');const available=ledger().availability();if(!available.ok)return available;const r=record('submission'),out=ledger().submit(r);if(out.ok){pendingSubmission=null;lastReason=null;save();notify(wording('沈序已收下自荐，请到公共通廊东口候召。'));}else lastReason=out.code;return out;},
  requestAudience(){if(flow)return emit('petition-busy');const out=publicReady('submitted');if(!out.ok)return out;if(!palace.requestDuty(OWNER,{kind:'edict-review',background:true}))return emit('emperor-busy');begin('audience');route(near(herald.root.position,C.reception,.4)?[...RECEPTION_PATH.slice(0,1),C.herald]:[C.herald],'沈序到公共听候处陪同召见');save();return {ok:true};},
  withdraw(){const p=petition();if(!p)return emit('wrong-petition-stage');const out=ledger().withdraw(p.id);if(out.ok){if(document?.applicationId===p.id)document.withdrawn=true;cancel('user-cancelled');if(document?.withdrawn&&document.holder!=='herald'){document.filed=true;save();}}return out;},
  respond(choice){const p=petition();if(!p)return emit('wrong-petition-stage');if(choice==='accept'&&!emperorCurrent())return emit('emperor-unavailable');if(p.source==='emperor-invitation'&&choice==='accept'&&(getBusy()||!adults()))return emit(!adults()?'adults-required':'player-busy');const out=ledger().respond(p.id,choice);if(out.ok){lastReason=null;palace.releaseInvitation?.(OWNER);if(choice==='decline')release();save();}else lastReason=out.code;return out;},
  requestInvestiture(){if(flow)return emit('petition-busy');const p=petition(),out=publicReady(p?.stage==='charter-held'?'charter-held':'accepted');if(!out.ok)return out;const gate=ledger().acceptanceAvailability();if(!gate.ok)return gate;begin('investiture');if(!document||document.id!==consortCharterId(p.id))document={id:consortCharterId(p.id),applicationId:p.id,...(isEmpress()?{titleKind:'empress',operation:p.operation}:{}),heraldId:heraldIdentity.actorId,heraldRevision:heraldIdentity.holderRevision,holder:p.stage==='charter-held'?'player':'herald',drafted:p.stage==='charter-held',sealed:p.stage==='charter-held',filed:false};if(document.sealed&&document.holder!=='desk'){flow.phase='to-meeting';route([C.herald],'沈序携同号册书回到公共听候处');}else route(near(herald.root.position,E.sealStand,.2)?[E.sealStand]:TO_DESK,'沈序沿原通道回传令案拟册并用印');save();return {ok:true};},
  active:()=>!!flow||!!pendingSubmission,
  cancel:(reason='user-cancelled')=>cancel(reason),
  verifyReceipt(r,context={}){const e=receipts.get(r?.id);return !!e&&JSON.stringify(e.receipt)===JSON.stringify(r)&&r.kind===context.kind&&r.applicationId===context.applicationId&&(!context.documentId||context.documentId===e.documentId&&e.sealed);},
  update(dt,t,playerState={}){
   if(disposed)return;state=playerState;time+=Math.max(0,dt);
   if(dirty){if(time>=retryAt){retryAt=time+1;save();}if(dirty)return;}
   syncHerald();
   checkInvitation();
   // A saved completed action may commit after the people have left. The
   // registry proves that past event; retry never performs it a second time.
   if(flow?.phase?.startsWith('commit-')){const kind=flow.phase==='commit-audience'?'audience':flow.phase==='commit-handoff'?'charter-handoff':'charter-reading';if(!settle(kind)){release();props.update(document,{herald,player:player()},null);return;}if(!flow)return;if(!loan){save();return;}}
   if(!syncHerald()){lastReason='service-unavailable';props.update(document,{herald,player:player()},null);return;}
   if(pendingSubmission&&petition()?.id===pendingSubmission.applicationId){pendingSubmission=null;save();}
   const w=window();if((flow||task||pendingSubmission)&&!loan&&w.ok&&!borrow()){lastReason='service-unavailable';return;}if(pendingSubmission&&(pendingSubmission.day!==clock().day||!w.ok||!adults()||!near(player()?.root.position,C.receptionPlayer,1.35))){cancel(!w.ok?w.reason:'left-meeting');return;}if(loan&&(!w.ok||!borrow())){cancel(w.reason||'herald-away');return;}
   if(loan&&!flow&&!near(player()?.root.position,C.receptionPlayer,9)&&!near(player()?.root.position,C.player,9)){cancel('left-meeting');return;}
   if(flow){
    if(!paused())flow.age+=dt;if(flow.day!==clock().day||flow.age>300){cancel('audience-timeout');return;}
    if(!atMeeting()){cancel('left-meeting');return;}
    if(!adults()){cancel('adults-required');return;}
   }else if(!loan&&!isEmpress()&&near(player()?.root.position,C.receptionPlayer,7)&&w.ok&&adults())api.reception();
   if(!loan){if(document?.returning&&herald?.alive!==false&&near(herald.root.position,E.sealStand,.18)){document.stowElapsed=(document.stowElapsed||0)+dt;if(document.stowElapsed>=1.2){document.holder='desk';document.returning=false;if(document.withdrawn)document.filed=true;save();}}props.update(document,{herald,player:player()},document?.returning?'place-charter':null,document?.stowElapsed||0);return;}
   if(pendingSubmission&&!task)api.reception();
   // Once the petition is received, Shen accompanies the visitor out through
   // the original public door instead of standing in their departure path.
   if(!flow&&petition()?.stage==='submitted'&&near(herald.root.position,C.reception,.3)&&(!task||task.arrived)){route([RECEPTION_PATH[0],C.herald],'沈序先行到公共听候处 · 请随公共通道前来');save();}
   herald.walking=false;if(!paused())move(dt);tell(task?.label||'后宫公共接待 · 自荐与册封问询');
   if(pendingSubmission&&atReception()&&!paused()&&time>=retryAt){retryAt=time+1;const result=api.submit();if(!result.ok&&!['save-failed','consort-busy'].includes(result.code)){pendingSubmission=null;save();}}
   const f=flow;
   if(f&&!paused()){
    if(f.phase==='summoning'&&!palace.dutyState(OWNER))palace.requestDuty(OWNER,{kind:'edict-review',background:true});
    if(f.phase==='summoning'&&task?.arrived&&present()){phase('audience');palace.setDutyLine(OWNER,isEmpress()?(petition().operation==='release'?'请当面陈明辞后心意。免后仍保留原妃位与寝居。':'你已任妃，请当面陈明请册心意。后位仍须由你愿受。'):'请当面陈明自荐心意。名位一事，须由你自愿选择。');}
    else if(f.phase==='audience'&&present()){f.elapsed+=dt;if(f.elapsed>=6){record('audience');phase('commit-audience');if(!dirty)settle('audience');}}
    else if(f.phase==='commit-audience')settle('audience');
    else if(f.phase==='to-desk'&&task?.arrived){if(document.holder==='desk'){phase(document.sealed?'pickup-charter':document.drafted?'sealing':'drafting');if(document.workPhase===flow.phase)flow.elapsed=document.workElapsed||0;delete document.workPhase;delete document.workElapsed;save();}else phase('place-charter');}
    else if(f.phase==='place-charter'&&(f.elapsed+=dt)>=1.2){document.holder='desk';phase(document.sealed?'pickup-charter':document.drafted?'sealing':'drafting');}
    else if(f.phase==='drafting'&&(f.elapsed+=dt)>=5){document.drafted=true;phase('sealing');}
    else if(f.phase==='sealing'&&(f.elapsed+=dt)>=2.2){document.sealed=true;phase('pickup-charter');}
    else if(f.phase==='pickup-charter'&&(f.elapsed+=dt)>=1.2){document.holder='herald';phase('to-meeting');route([...TO_PUBLIC,C.herald],'沈序持已用印的同号册书回听候处');save();}
    else if(f.phase==='to-meeting'){
     if(!palace.dutyState(OWNER))palace.requestDuty(OWNER,{kind:'edict-review',background:true});
     if(task?.arrived&&present())phase(petition().stage==='charter-held'?'reading':'await-handoff');
    }else if(f.phase==='await-handoff'&&present())phase('handoff');
    else if(f.phase==='handoff'&&present()){f.elapsed+=dt;if(f.elapsed>=1.5){document.holder='player';record('charter-handoff');phase('commit-handoff');if(!dirty)settle('charter-handoff');}}
    else if(f.phase==='commit-handoff')settle('charter-handoff');
    else if(f.phase==='reading'&&present()){tell(isEmpress()?(petition().operation==='release'?'沈序宣读：依本人请辞，免去后位，仍保原妃位及寝居。':'沈序宣读：今册立为后，原妃位寝居照旧。'):'沈序宣读册书：今授妃嫔名位，赐居后宫独立寝房。');f.elapsed+=dt;if(f.elapsed>=6){record('charter-reading');phase('commit-reading');if(!dirty)settle('charter-reading');}}
    else if(f.phase==='commit-reading')settle('charter-reading');
   }
   if(loan){if(flow&&['audience','await-handoff','handoff','reading'].includes(flow.phase)&&!herald.walking){const person=player()?.root.position;if(person)herald.root.rotation.y=Math.atan2(person.x-herald.root.position.x,person.z-herald.root.position.z);}const c=poseContext(herald,null),p=flow?.phase;c.handoff=!!document&&!document.filed&&document.holder==='herald'||['handoff','reading'].includes(p);c.heldProp=null;c.receptionWriting=p==='drafting';const action=!paused()&&!herald.walking?(p==='drafting'?'calligraphy':p==='sealing'?'tidy':null):null;if(action){herald.root.rotation.y=Math.atan2(E.seal[0]-herald.root.position.x,E.seal[2]-herald.root.position.z);c.workHeight=(E.seal[1]-herald.root.position.y)/(herald.characterScale||1);c.workDistance=Math.hypot(E.seal[0]-herald.root.position.x,E.seal[2]-herald.root.position.z)/(herald.characterScale||1);}herald.animate(t+herald.phase,herald.walking,action,c);}
   edict.animateBorrowedSeal?.(OWNER,flow?.phase,flow?.elapsed||0);props.update(document,{herald,player:player()},flow?.phase,flow?.elapsed||0);
  },
  playerPose:()=>flow&&['handoff','commit-handoff','reading','commit-reading'].includes(flow.phase)?{handoff:true}:null,
  snapshot,checkpoint:snapshot,
  restore(s){if(s?.version!==1||!Array.isArray(s.receipts)||s.flow&&(!PHASES.has(s.flow.phase)||s.flow.titleKind!==undefined&&!['consort','empress'].includes(s.flow.titleKind)))return false;const restoredIdentity=s.heraldIdentity?copy(s.heraldIdentity):(s.flow||s.task||s.pendingSubmission||s.document&&!s.document.filed?{actorId:'cn-palace-herald',holderRevision:0}:null);if(restoredIdentity&&(!/^cn-[a-z0-9-]+$/.test(restoredIdentity.actorId)||!Number.isSafeInteger(restoredIdentity.holderRevision)||restoredIdentity.holderRevision<0))return false;heraldIdentity=restoredIdentity;if(heraldIdentity)herald=npcs.find(n=>n.station.id===heraldIdentity.actorId)||null;time=Number.isFinite(s.time)?s.time:0;nextInvitationCheck=Number.isFinite(s.nextInvitationCheck)&&s.nextInvitationCheck>=0?s.nextInvitationCheck:0;flow=copy(s.flow||null);if(flow&&!flow.titleKind)flow.titleKind=flow.applicationId?.startsWith('empress-petition:')?'empress':'consort';pendingSubmission=s.pendingSubmission&&Number.isSafeInteger(s.pendingSubmission.day)&&typeof s.pendingSubmission.applicationId==='string'?copy(s.pendingSubmission):null;document=copy(s.document||null);task=copy(s.task||null);if(task){task.planned=false;task.stalled=0;if(herald)herald.route=[];}receipts.clear();for(const e of s.receipts)if(e?.receipt?.id&&e.positions?.player&&e.positions?.herald&&e.positions?.emperor)receipts.set(e.receipt.id,copy(e));lastReason=s.lastReason==='outside-hours'?null:s.lastReason||null;
   const p=petition();if(flow&&(!p||flow.applicationId!==p.id))flow=null;if(['appointed','released'].includes(p?.stage)){flow=null;task=null;pendingSubmission=null;if(document)document.filed=true;release();}else if(p&&['withdrawn','declined','rejected','expired','resigned'].includes(p.stage)){flow=null;task=null;pendingSubmission=null;if(document?.applicationId===p.id&&!document.filed){document.withdrawn=true;if(document.holder==='herald'){document.returning=true;document.stowElapsed=0;}else document.filed=true;}release();}if(flow||task||pendingSubmission){if(window().ok&&borrow()){}else{lastReason=window().reason||'service-unavailable';}}props.update(document,{herald,player:player()},flow?.phase,flow?.elapsed||0);return true;},
  statusCard(){const card=ledger()?.statusCard?.()||{},w=window(),p=petition(),reason=!emperorCurrent()?'emperor-unavailable':lastReason||(!w.ok?w.reason:null);if(isEmpress()&&(!p||!['submitted','awaiting-choice','accepted','charter-held'].includes(p.stage))){const a=api.empressAvailability(card.operation);card.blockers=a.reasons.map(code=>card.blockers?.find(r=>r.code===code)||({code,text:wording(REASONS[code])||'当前条件暂不满足'}));}return {...card,physical:{phase:flow?.phase||(pendingSubmission?'awaiting-herald':null),pendingSubmission:!!pendingSubmission,waitingReason:reason,heraldName:heraldName(),heraldId:herald?.station.id||null,heraldRevision:heraldIdentity?.holderRevision??binding().holderRevision,waitingText:wording(REASONS[reason])||null,hoursLabel:'朝会及公务办结后受理',heraldPresent:!!herald&&atReception(),atTarget:p&&['submitted','accepted','charter-held'].includes(p.stage)?atMeeting():isEmpress()?atEmperor():atReception(),label:wording(pendingSubmission?'沈序正在前来 · 见面后呈交此次自荐':task?.label)||null,target:api.interactionTarget(),documentId:document?.id||null}};},
  state:()=>({...snapshot(),loan,props:props.state()}),
  dispose({suspend=false}={}){if(disposed)return;if(!suspend){flow=null;pendingSubmission=null;save();}release();disposed=true;props.dispose();},
 };
 if(saved?.version===1)api.restore(saved);
 return api;
}
