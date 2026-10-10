import {createChinaCriminalCases} from './china-criminal-cases.js';
export const CHINA_JUSTICE_DESK = Object.freeze([20.53,3.915,32.15]);
const JUSTICE='cn-official-justice', PROVIDER='china-criminal-cases', OWNER='criminal-case-review';
const copy=x=>structuredClone(x), idOf=n=>n?.actorId||n?.station?.id||'player';
const keyOf=n=>`${idOf(n)}@${n?.lifeId??n?.station?.lifeId??'original'}`;
const adjacent=n=>{const p=position(n);return [p[0]+.78,p[1],p[2]];};
const position=n=>n?.root?.position?.toArray();
const near=(a,b,r)=>Array.isArray(a)&&Array.isArray(b)&&Math.abs(a[1]-b[1])<.4&&Math.hypot(a[0]-b[0],a[2]-b[2])<=r;
const asPoint=p=>({x:p[0],y:p[1],z:p[2]});
const asArray=p=>Array.isArray(p)?p:p&&[p.x,p.y,p.z];
const labels={intake:'请周惟正当面交办原案',scene:'核查原案现场线索',witness:'核对具名证言',review:'请周惟正当面审核',archive:'归档原案审核结果'};
// Only completed physical steps are durable. Leaving or closing cancels the
// short unfinished read; the exact case and completed receipts survive travel.
export function createChinaCriminalCaseRuntime({saved,persist,getCrime,getPlayer,getActors,standing,getBusy,playerAvailable=()=>true,
 getAuthority=()=>null,getClock=()=>null,settlePrincipalWages=()=>{},canSee,getMeetingPoint,getScenePoint=p=>p,canMeet,requestMeeting,meetingHeld,releaseMeeting,stopPlayer,approachProgress=()=>0,cancelApproach=()=>{},openPanel,notify=()=>{}}){
 const core=createChinaCriminalCases({saved,persist,getCrime,getAuthority});let activity=null,prepared=null,disposed=false,payRetry=0;
 const authority=()=>getAuthority();
 const principalLabels={...labels,intake:'以刑名主官身份核收原案',review:'亲核原据并签署复核意见',archive:'回刑名原案归档履职 · 8秒'};
 const actor=id=>getActors().find(n=>idOf(n)===id&&n.alive!==false);
 const accessible=n=>n&&n.alive!==false&&n.present!==false&&!n.walking&&n.serviceMount?.kind!=='bed'&&!n.bathTransition;
 const board=()=>({id:'cn-justice-case-desk',provider:PROVIDER,kind:'board',intentKey:'criminal-case-board',name:authority()?'刑名主官 · 你的案卷':'周惟正 · 刑名案卷',action:'查看真实案件与办理进度',position:[...CHINA_JUSTICE_DESK],interactionRadius:1.25,executionRadius:.24,priority:9});
 function target(view){
  if(prepared&&view?.id===prepared.caseId&&view.stage===prepared.stage&&view.sourceRevision===prepared.revision&&prepared.target.actor&&getActors().includes(prepared.target.actor)&&keyOf(prepared.target.actor)===prepared.actorKey&&meetingHeld(prepared.target.actor,OWNER))return prepared.target;
  if(!view||view.stage==='archived')return null;
  const term=authority();
  if(term&&(view.source?.subjectId==='player'||view.source?.victimId==='player'))return null;
  if(term&&['intake','review'].includes(view.stage))return {targetId:'cn-justice-case-desk',position:[...CHINA_JUSTICE_DESK],targetPosition:[...CHINA_JUSTICE_DESK]};
  if(['intake','review'].includes(view.stage)){const n=actor(JUSTICE);if(!accessible(n)||keyOf(n)!==JUSTICE+'@original'||!canMeet(n))return null;const p=getMeetingPoint(n,adjacent(n));return p?{targetId:JUSTICE,position:p,targetPosition:position(n),actor:n}:null;}
  if(view.stage==='scene'){const p=asArray(view.scenePosition||view.source?.incidentPosition||view.source?.evidence?.find(e=>e.deliveredTo?.length)?.subjectPosition);const stand=p&&getScenePoint(p);return stand?{targetId:'case-scene:'+view.id,position:stand,targetPosition:p}:null;}
  if(view.stage==='witness'){
   const evidence=(view.source?.evidence||view.evidence||[]).filter(e=>e.witnessKey!==view.source?.subjectKey&&e.kind!=='confession');
   for(const e of evidence){const n=getActors().find(n=>keyOf(n)===e.witnessKey&&n!==getPlayer()&&n.alive!==false);
    if(accessible(n)&&canMeet(n)){const p=getMeetingPoint(n,adjacent(n));if(p)return {targetId:e.witnessKey,witnessKey:e.witnessKey,position:p,targetPosition:position(n),actor:n};}}
   // A delivered record is a limited paper source, never a substitute live
   // interview or testimony attributed to a replacement body.
   const e=evidence.find(e=>e.deliveredTo?.length)||(view.source?.evidence||[]).find(e=>e.deliveredTo?.length);
   if(e)return {targetId:'cn-justice-case-desk',witnessKey:e.witnessKey,witnessUnavailable:true,position:[...CHINA_JUSTICE_DESK],targetPosition:[...CHINA_JUSTICE_DESK]};
   return null;
  }
  return {targetId:'cn-justice-case-desk',position:[...CHINA_JUSTICE_DESK],targetPosition:[...CHINA_JUSTICE_DESK]};
 }
 function intent(caseId){
  if(disposed)return null;if(!caseId)return board();const view=core.view(caseId),t=target(view);if(!t)return null;
  return {id:`criminal-case:${caseId}:${view.stage}`,provider:PROVIDER,kind:view.stage,caseId,intentKey:JSON.stringify([caseId,view.stage,view.sourceRevision,t.targetId,t.position,authority()]),name:'刑名原案 · '+(view.number||view.source?.number||''),action:t.witnessUnavailable?'核对已送达的原证言（本人暂不可询）':(authority()?principalLabels:labels)[view.stage],position:t.position.slice(),interactionRadius:1.25,executionRadius:.24,priority:10};
 }
 function resolveIntent(old){const next=old?.kind==='board'?board():intent(old?.caseId);return next&&next.intentKey===old?.intentKey?next:null;}
 function cancel(){if(!activity&&!prepared)return false;activity=null;prepared=null;releaseMeeting(OWNER);cancelApproach();return true;}
 function prepareIntent(old){const next=resolveIntent(old);if(!next)return null;if(next.kind==='board')return next;const v=core.view(next.caseId),t=target(v);if(!t)return null;
  if(t.actor){if(!canMeet(t.actor)||!requestMeeting(t.actor,OWNER)){notify('原当事人正在处理原职责，请稍后再来。');return null;}prepared={caseId:v.id,stage:v.stage,revision:v.sourceRevision,target:t,actorKey:keyOf(t.actor),bestRemaining:Infinity,stalled:0};}return next;}
 function executeIntent(old){
  if(disposed)return false;const next=resolveIntent(old),p=getPlayer();if(!next||!standing()||getBusy()||!near(position(p),next.position,.32)||!canSee(next))return false;
  if(next.kind==='board'){cancel();openPanel();return true;}
  const view=core.view(next.caseId),t=target(view);if(!t||!near(position(p),t.targetPosition,2))return false;
  if(t.actor&&!meetingHeld(t.actor,OWNER)&&(!canMeet(t.actor)||!requestMeeting(t.actor,OWNER))){notify('原当事人正在处理原职责，请稍后再来。');return false;}
  stopPlayer();activity={caseId:next.caseId,stage:view.stage,revision:view.sourceRevision,target:t,origin:position(p).slice(),player:p,playerKey:keyOf(p),actorKey:t.actor?keyOf(t.actor):null,officeTerm:copy(authority()),day:getClock()?.day,elapsed:0};notify(`${next.action} · 请停留完成核验`);return true;
 }
 function update(dt){
  if(disposed)return;payRetry-=Number.isFinite(dt)?Math.max(0,dt):0;if(payRetry<=0){payRetry=1;settlePrincipalWages(core.principalDuties());}if(!activity){if(prepared){const n=prepared.target.actor,v=core.view(prepared.caseId);if(!playerAvailable()||!accessible(n)||!canMeet(n)||!getActors().includes(n)||keyOf(n)!==prepared.actorKey||v?.stage!==prepared.stage||v?.sourceRevision!==prepared.revision||!meetingHeld(n,OWNER)){cancel();return;}
   const remaining=approachProgress();if(Number.isFinite(remaining)&&remaining<prepared.bestRemaining-.06){prepared.bestRemaining=remaining;prepared.stalled=0;}else if(Number.isFinite(dt)&&dt>0)prepared.stalled+=Math.min(dt,.1);
   if(prepared.stalled>=8){cancel();notify('接近暂不能继续，已释放原当事人；原案进度保留。');}}
  return;}const a=activity,p=getPlayer(),v=core.view(a.caseId),t=a.target;
  if(!Number.isFinite(dt)||dt<=0)return;
  if(JSON.stringify(authority())!==JSON.stringify(a.officeTerm)||a.officeTerm&&getClock()?.day!==a.day||p!==a.player||keyOf(p)!==a.playerKey||!standing()||getBusy()||!near(position(p),a.origin,.15)||!near(position(p),t.targetPosition,2)||v?.stage!==a.stage||v?.sourceRevision!==a.revision||!canSee({position:t.targetPosition,executionRadius:2})||t.actor&&(!accessible(t.actor)||!canMeet(t.actor)||!getActors().includes(t.actor)||keyOf(t.actor)!==a.actorKey&&a.actorKey!==undefined||!meetingHeld(t.actor,OWNER)||!near(position(t.actor),t.targetPosition,.1))){cancel();notify('核验已中止；已完成的原案步骤保留。');return;}
  if(t.actor)a.actorKey??=keyOf(t.actor);
  const duration=a.officeTerm&&a.stage==='archive'?8:2;
  a.elapsed+=Math.min(dt,.1);if(a.elapsed+1e-9<duration)return;
  const proof={actorId:'player',actorKey:keyOf(p),targetId:t.targetId,elapsed:Math.max(duration,a.elapsed),sourceRevision:a.revision,position:asPoint(position(p)),targetPosition:asPoint(t.targetPosition),clear:true,standing:true,
   ...(a.officeTerm?{officeTerm:copy(a.officeTerm),day:a.day}:{}),...(['intake','review'].includes(a.stage)?{recipientId:a.officeTerm?'player':JUSTICE,recipientBodyId:a.officeTerm?keyOf(p):keyOf(t.actor)}:{}),...(t.witnessKey?{witnessKey:t.witnessKey,...(t.actor?{recipientBodyId:keyOf(t.actor)}:{})}:{}),...(t.witnessUnavailable?{witnessUnavailable:true}:{})};
  const result=core.act(a.caseId,a.stage,proof);cancel();
  if(!result.ok){notify(result.code==='save-failed'?'原案暂未保存；本步未入账，可原地重试。':'原案依据已变化或核验不足，请重新查看案卷。');return;}
  if(a.officeTerm&&a.stage==='archive')settlePrincipalWages(core.principalDuties());
  const next=core.view(a.caseId);notify(next?.stage==='archived'?(a.officeTerm?'刑名原案已由你亲核归档；本日履职俸据已登记，符合条件时按正二品日俸入银行。':'原案审核结果已具名归档；原巡卫处置与钱账保持。'):`本步已入卷。下一步：${labels[next?.stage]||'查看案卷'}。`);
 }
 return {core,intent,resolveIntent,prepareIntent,executeIntent,update,cancel,dispose(){cancel();disposed=true;},isActing:()=>!!activity,
  state:()=>({authority:copy(authority()),principalDuties:core.principalDuties(),cases:core.list(),activity:activity?{caseId:activity.caseId,stage:activity.stage,elapsed:activity.elapsed}:null}),
  choices:()=>disposed?[]:[board(),...core.list().filter(v=>v.stage!=='intake'&&v.stage!=='archived').map(v=>intent(v.id)).filter(Boolean)],snapshot:()=>core.snapshot()};
}
