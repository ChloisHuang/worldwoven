import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';

const STAGES={none:'尚未自荐',submitted:'待皇帝召见','awaiting-choice':'已获准 · 待你答复',accepted:'已接受 · 待授册','charter-held':'册书在手 · 待宣读',appointed:'册封已生效',rejected:'本次未获准',declined:'你已婉拒',withdrawn:'自荐已撤回',resigned:'已辞去名位',expired:'此次邀约已过期'};
const INVITATION_STAGES={'awaiting-choice':'皇帝相邀 · 待你答复',accepted:'已接受皇帝邀约 · 待授册',declined:'已婉拒皇帝邀约',expired:'皇帝邀约已过期'};
const EMPRESS_STAGES={none:'可当面请册皇后',submitted:'请册已呈 · 待召见','awaiting-choice':'册后获准 · 待你答复',accepted:'已接受册后 · 待授册','charter-held':'册书在手 · 待宣读',appointed:'皇后册封已生效',released:'后位已辞 · 保留妃位',rejected:'本次请册未获准',declined:'你已婉拒册后',withdrawn:'请册已撤回'};
const EMPRESS_RELEASE_STAGES={none:'可当面请辞后位',submitted:'请辞已呈 · 待召见','awaiting-choice':'辞后获准 · 待你答复',accepted:'已确认辞后 · 待授文书','charter-held':'辞后文书在手 · 待宣读',rejected:'本次请辞未获准',declined:'你已取消辞后',withdrawn:'请辞已撤回'};
const PHASES={invitation:'皇帝正在与你说话',summoning:'等候皇帝与沈序到场',audience:'当面召见中','commit-audience':'正在确认召见结果','to-desk':'沈序前往传令案','place-charter':'沈序展开册书',drafting:'沈序正在拟册',sealing:'沈序正在用印','pickup-charter':'沈序收起册书','to-meeting':'沈序持册前来','await-handoff':'等候当面授册',handoff:'正在当面授册','commit-handoff':'正在确认授册',reading:'沈序正在宣读','commit-reading':'正在确认册封'};
const ERRORS={'save-failed':'此次答复未能保存，请重试','invalid-consort-state':'自荐记录暂不可核验','invalid-clock':'当前时间暂不可核验','service-unavailable':'接待暂不可用','finish-current-duty':'先完成原职位班次','settle-current-wages':'先结清原职位待领工资','leave-formal-career':'先办妥原正式职位离任','adults-required':'双方须年满18岁','already-petitioned-today':'今日已自荐，次日可再试','relationship-reservations':'既有相处留下顾虑','different-dispositions':'性情取向尚不契合','emperor-unsettled':'此次召见时皇帝疲惫或饥饿','emperor-cautious':'皇帝性情审慎','personal-preference':'个人偏好未合','review-not-selected':'皇帝未予批准','title-rights-busy':'先结束寝居、用膳或册书中的活动','explicit-resignation-required':'请明确确认辞去妃位','stale-appointment':'名位已变化，请重新查看','finish-empress-affairs':'先当面辞后并办结文书'};
const safeText=(value,fallback='')=>typeof value==='string'&&!/^[a-z][a-z0-9-]*$/.test(value)?value:fallback;
const reasonText=reason=>safeText(reason?.text)||ERRORS[reason?.code||reason]||'当前条件暂不满足';
const targetValid=target=>!!target&&target.available!==false&&typeof target.id==='string'&&Array.isArray(target.position)&&target.position.length===3&&target.position.every(Number.isFinite);
const atTarget=(player,target)=>{const p=player?.root?.position;return targetValid(target)&&!!p&&Math.hypot(p.x-target.position[0],p.z-target.position[2])<=(target.radius||1.1)&&Math.abs(p.y-target.position[1])<.35;};
const read=(fn,fallback=null)=>{try{return typeof fn==='function'?fn()??fallback:fallback;}catch{return fallback;}};
const invitationDeadline=value=>{if(!Number.isFinite(value)||value<0)return '';const minutes=Math.floor(value),day=Math.floor(minutes/1440)+1,hour=String(Math.floor(minutes%1440/60)).padStart(2,'0'),minute=String(minutes%60).padStart(2,'0');return `请在第${day}日 ${hour}:${minute} 前答复，逾期邀约自行结束`;};

// Read-only projection. Physical actions are intents for the host's existing
// navigation/nearby interaction path; this module never submits or appoints.
export function consortPetitionView({card={},target=null,player=null,details={},history=[]}={}){
 const empress=card.titleKind==='empress',releasing=empress&&card.operation==='release',stages=empress?{...EMPRESS_STAGES,...(releasing?EMPRESS_RELEASE_STAGES:{})}:STAGES;
 const stage=Object.hasOwn(stages,card.stage)?card.stage:'none',invitation=!empress&&card.source==='emperor-invitation',physical=card.physical||{},near=physical.atTarget===true||atTarget(player,target),phase=physical.phase;
 const courier=safeText(physical.heraldName,'传令员'),phaseLabel=(PHASES[phase]||'').replaceAll('沈序',courier);
 const blockers=Object.hasOwn(stages,card.stage)?(card.blockers||[]).map(reasonText):['接待状态暂不可核验'],phaseText=releasing?phaseLabel.replaceAll('册书','辞后文书').replaceAll('拟册','拟辞后文书').replaceAll('授册','授文书').replaceAll('册封','辞后'):phaseLabel,waitingText=safeText(physical.waitingText);
 // The empress ledger reports the actual title independently of an open or
 // rejected application. Approval alone never projects a higher title.
 const appointed=empress?['consort','empress'].includes(card.titleId):stage==='appointed'&&card.titleId==='consort',isEmpress=empress&&card.titleId==='empress',seat=details.seat;
 const seatText=empress?(card.empressId==='player'?'后位已由你担任':card.empressId?'后位已有主位':'后位空缺'):Number.isInteger(seat?.occupied)&&Number.isInteger(seat?.capacity)&&seat.occupied>=0&&seat.capacity>0&&seat.occupied<=seat.capacity?`${seat.occupied} / ${seat.capacity} 席已占`:'名额待核对';
 const residenceText=appointed&&card.residence?safeText(details.residenceLabel,'独立寝房已归属'):appointed||stage==='appointed'?'住所资格待核':'受册后取得独立寝房';
 const meal=details.meal||{},stock=Number.isInteger(meal.remaining)&&meal.remaining>=0?`余 ${meal.remaining}${Number.isInteger(meal.capacity)&&meal.capacity>=meal.remaining?` / ${meal.capacity}`:''} 份`:'';
 const mealText=appointed?`${safeText(meal.statusLabel,'库存御膳')}${stock?` · ${stock}`:''}`:'住所与库存御膳 · 受册后可用';
 const actions=[],benefitActions=[],add=(id,label,action,target,disabled=false)=>actions.push({id,label,action,target:targetValid(target)?target:null,disabled});
 const benefits=()=>{if(appointed){add('meal',safeText(meal.label,targetValid(meal.target)?'前往膳点':'御膳暂不可用'),'meal',meal.target,meal.available===false||!targetValid(meal.target));if(card.residence&&targetValid(details.residenceTarget))add('residence','查看住所','residence',details.residenceTarget);}};
 let note=['awaiting-choice','appointed'].includes(stage)?'':[phaseText,waitingText].filter(Boolean).join(' · ');
 if(stage==='awaiting-choice'){
  if(empress)note=releasing?'辞后文书宣读办结后卸去后位，保留原妃位与寝居':'皇帝已准予请册；接受后仍须当面授册、宣读，方取得后位';
  else if(invitation)note=['皇帝愿授予你妃嫔名位，是否接受由你决定',invitationDeadline(card.expiresAt)].filter(Boolean).join('。');
  add('accept',releasing?'确认请辞后位':empress?'接受册后意向':invitation?'接受皇帝邀约':'接受册封意向','accept',null,blockers.length>0);
  add('decline',releasing?'保留后位':invitation?'婉拒邀约':'婉拒','decline',null);
 }else if(phase==='invitation'){
  // The encounter must finish and persist before there is a choice to answer.
 }else if(phase&&stage!=='appointed'){
  add('primary',near?'现场等候':'返回听候处','return',target,near||!targetValid(target));
 }else if(stage==='appointed'&&!empress){
  benefits();if(appointed&&!targetValid(meal.target))note=safeText(meal.reason,'膳点状态待核');
  if(meal.available===false&&safeText(meal.reason))note=safeText(meal.reason);
 }else{
  const [action,label]=stage==='submitted'?['audience','听候召见']:stage==='accepted'?['investiture',releasing?'领取辞后文书':'领取册书']:stage==='charter-held'?['read-charter',releasing?'宣读辞后文书':'宣读册书']:empress?(isEmpress?['empress-release','请辞后位']:['empress-submit','请册皇后']):['submit','呈交自荐'];
  // Reaching the point is not proof the herald is ready. The host still checks
  // the live controller when executing an intent, including manual arrivals.
  const localWait=near&&action==='submit'&&physical.heraldPresent===false;
  add('primary',localWait?'等候'+courier+'接待':label,action,target,blockers.length>0||!targetValid(target)||localWait);
  if(localWait&&!note)note=courier+'尚未到场';
 }
 if(!phase&&['submitted','accepted','charter-held'].includes(stage))add('withdraw',releasing?'撤回请辞':empress?'撤回请册':invitation?'撤回邀约答复':'撤回自荐','withdraw',null);
 if(empress){const start=actions.length;benefits();benefitActions.push(...actions.splice(start));}
 const result=stage==='rejected'?'本次未获准':stage==='declined'?(releasing?'已保留后位':invitation?'已婉拒邀约':'已婉拒'):stage==='expired'?'邀约已过期':stage==='withdrawn'?'已撤回':stage==='resigned'?'已辞去':stage==='released'?'已辞去后位':stage==='appointed'&&appointed?(isEmpress?'后位生效':'名位生效'):invitation&&stage==='accepted'?'已接受邀约':invitation&&stage==='awaiting-choice'?'皇帝相邀':card.result?.passed?'召见获准':null;
 const resultReasons=stage==='rejected'?(card.result?.reasons||[]).map(reasonText):[];
 const rows=history.map(p=>({day:Number.isSafeInteger(p?.submittedAt?.day)?p.submittedAt.day+1:null,label:p?.titleKind==='empress'||['appoint','release'].includes(p?.operation)?`${p.operation==='release'?'辞后':'册后'} · ${(p.operation==='release'&&EMPRESS_RELEASE_STAGES[p.stage])||EMPRESS_STAGES[p.stage]||'记录待核'}`:p?.source==='emperor-invitation'?(INVITATION_STAGES[p.stage]||`皇帝相邀 · ${STAGES[p.stage]||'记录待核'}`):STAGES[p?.stage]||'记录待核',reasons:p?.stage==='rejected'?(p.review?.reasons||[]).map(reasonText):[]})).reverse();
 return {stage,titleKind:empress?'empress':'consort',hasTitle:appointed,source:card.source||null,applicationId:card.applicationId||null,identity:isEmpress?'皇后':appointed?'妃嫔':stage==='appointed'?'册封记录待核':'无宫廷名位',stageLabel:invitation&&INVITATION_STAGES[stage]||safeText(card.stageLabel,stages[stage]),seatText,residenceText,mealText,eligibilityText:empress&&!isEmpress&&(!releasing||!['submitted','awaiting-choice','accepted','charter-held'].includes(stage))?'游戏资格：任妃3日、与皇帝完成2次交谈':'',result,resultReasons,blockers,note,actions,benefitActions,history:rows,historyLabel:empress||invitation||history.some(p=>p?.source==='emperor-invitation'||p?.titleKind==='empress'||p?.operation)?'宫廷往来':'自荐记录',historyCount:Math.max(rows.length,Number.isInteger(card.historyCount)?card.historyCount:0)};
}

export const CONSORT_PETITION_UI_STYLE=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.cn-consort-dialog.ww-airy-panel{box-sizing:border-box;position:fixed;inset:var(--ww-ui-top,12px) var(--ww-ui-right,12px) var(--ww-ui-bottom,12px) var(--ww-ui-left,12px);margin:auto;width:min(650px,var(--ww-ui-width,calc(100vw - 24px)));max-width:none;height:min(274px,var(--ww-ui-height,calc(100dvh - 24px)));max-height:var(--ww-ui-height,calc(100dvh - 24px));padding:14px 20px 12px;border:1px solid #d8dfcd;border-radius:13px 4px;background:linear-gradient(112deg,#fbf8ee,#eff7f0);color:#446b70;font:14px/1.45 Georgia,"Songti SC",serif;box-shadow:0 10px 34px #294e5420}
.cn-consort-dialog::backdrop{background:#25444640;backdrop-filter:blur(3px)}.cn-consort-dialog *{box-sizing:border-box}.cn-consort-dialog button{font-family:inherit;min-height:44px;cursor:pointer}.cn-consort-dialog .cn-consort-close{position:absolute;right:6px;top:5px;width:44px;height:44px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;color:#78958e;font-size:26px}.cn-consort-heading{display:flex;align-items:baseline;flex-wrap:wrap;gap:5px 12px;padding:2px 30px 8px 0;border-bottom:1px solid #cbded2;margin:0 0 10px}.cn-consort-dialog .cn-consort-heading h2{margin:0;font-size:19px;line-height:1.3;font-weight:500}.cn-consort-stage{font-size:12px;color:#799089}.cn-consort-content{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.08fr);gap:18px;align-content:start}.cn-consort-facts{margin:0;min-width:0}.cn-consort-fact{display:grid;grid-template-columns:36px minmax(0,1fr);gap:9px;padding:5px 0}.cn-consort-fact dt{font-size:12px;color:#8b9a8d}.cn-consort-fact dd{margin:0;font-size:13px;line-height:1.5}.cn-consort-state{min-width:0;padding-left:16px;border-left:1px solid #d8e2d2}.cn-consort-result{display:inline-block;padding:2px 7px;background:#dcece47d;border:1px solid #ccdcd1;border-radius:3px;font-size:12px;color:#648275}.cn-consort-dialog p{font-size:12px;line-height:1.6;margin:6px 0;color:#7a9086}.cn-consort-dialog .cn-consort-blockers,.cn-consort-dialog .cn-consort-error{color:#a5735c}.cn-consort-history{margin:6px 0 0;padding:0;border:0;grid-column:1/-1}.cn-consort-history summary{width:fit-content;min-height:44px;padding:10px 0;font-size:12px;color:#82958a;cursor:pointer}.cn-consort-history p{margin:3px 0;font-size:12px}.cn-consort-actions{display:flex;gap:10px;align-items:center;padding-top:8px;border-top:1px solid #d2dfcf;margin-top:8px}.cn-consort-dialog .cn-consort-actions button{flex:1;width:auto;min-width:0;border:0;border-radius:0;background-color:transparent;padding:9px 12px;font-size:14px;letter-spacing:.01em;box-shadow:none}.cn-consort-dialog.ww-airy-theme .cn-consort-actions .ww-airy-action{font-size:14px;background-color:transparent}.cn-consort-dialog .cn-consort-actions .cn-consort-secondary{flex:0 0 108px;color:#7b9189}.cn-consort-dialog button:disabled{cursor:default;opacity:.48}.cn-consort-content [hidden],.cn-consort-dialog [hidden]{display:none!important}
@media(max-height:420px){.cn-consort-dialog.ww-airy-panel{padding:11px 18px 10px}.cn-consort-heading{margin-bottom:7px;padding-bottom:6px}.cn-consort-dialog .cn-consort-heading h2{font-size:18px}.cn-consort-actions{padding-top:6px;margin-top:6px}}
@media(max-width:540px){.cn-consort-dialog.ww-airy-panel{height:min(440px,var(--ww-ui-height,calc(100dvh - 24px)));padding:13px 16px}.cn-consort-content{display:block}.cn-consort-state{padding:8px 0 0;border-left:0;border-top:1px solid #d8e2d2;margin-top:7px}.cn-consort-heading{display:block}.cn-consort-stage{display:block;margin-top:3px}}
.cn-consort-dialog .cn-consort-release button{min-height:44px;margin-right:8px;padding:8px 10px;border:0;border-radius:0;background:transparent;box-shadow:none;color:#7b9189;font-size:12px}.cn-consort-dialog .cn-consort-release button[data-consort-action="confirm-resignation"]{color:#a5735c}
`;

/** onIntent({kind:'consort-petition',action,target}) is navigation only here.
 * The host performs the live physical action at arrival. getDetails supplies
 * real court/room/kitchen projections; absent providers never invent benefits.
 */
export function createChinaConsortPetitionUI({service,titleBridge=null,getLedger=()=>null,getPlayer=()=>null,getDetails=()=>({}),onIntent,onOpen=()=>{},document:doc=globalThis.document}={}){
 if(!doc||!service?.statusCard)throw new TypeError('Consort status UI requires a document and live status service');
 const make=(tag,text,cls)=>{const el=doc.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;};
 const dialog=make('dialog',null,'cn-consort-dialog ww-airy-theme ww-airy-panel'),style=make('style');style.textContent=CONSORT_PETITION_UI_STYLE;
 dialog.setAttribute('aria-label','宫廷往来与名位');(doc.head||doc.body).append(style);doc.body.append(dialog);
 const {header,body,actions}=createAiryPanelParts(doc);header.className+=' cn-consort-heading';body.className+=' cn-consort-content';actions.className+=' cn-consort-actions';
 const title=make('h2'),stageLabel=make('span',null,'cn-consort-stage'),closeButton=make('button','×','cn-consort-close');closeButton.type='button';closeButton.setAttribute('aria-label','关闭名位状态');
 header.append(title,stageLabel);const facts=make('dl',null,'cn-consort-facts'),factNodes={};
 for(const [key,label]of [['seat','名额'],['residence','住所'],['meal','待遇']]){const row=make('div',null,'cn-consort-fact'),value=make('dd');factNodes[key]=value;row.append(make('dt',label),value);facts.append(row);}
 const state=make('section',null,'cn-consort-state'),result=make('span',null,'cn-consort-result'),resultNote=make('p'),eligibility=make('p'),note=make('p'),blockers=make('p',null,'cn-consort-blockers'),error=make('p',null,'cn-consort-error');error.setAttribute('role','status');
 state.append(result,resultNote,eligibility,note,blockers,error);const history=make('details',null,'cn-consort-history'),summary=make('summary'),historyBody=make('div'),benefitsBox=make('section',null,'cn-consort-release'),releaseBox=make('section',null,'cn-consort-release'),releaseNote=make('p'),releaseStart=make('button','辞去妃位'),releaseConfirm=make('button','确认辞去妃位'),releaseCancel=make('button','保留妃位');
 for(const [b,id]of [[releaseStart,'resign-title'],[releaseConfirm,'confirm-resignation'],[releaseCancel,'cancel-resignation']]){b.type='button';b.setAttribute('data-consort-action',id);}releaseBox.append(releaseNote,releaseStart,releaseConfirm,releaseCancel);history.append(summary,historyBody,benefitsBox,releaseBox);body.append(facts,state,history);dialog.append(closeButton,header,body,actions);
 let disposed=false,current=null,signature='',historySignature='',epoch=0,errorText='',sending=false,releaseId=null;
 const buttons=new Map(),buttonContainers=new Map();
 const set=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
 function view(){
  const card=read(()=>service.statusCard(),{}),ledger=read(()=>service.currentLedger?.())??read(getLedger),petition=read(()=>ledger?.petition?.()),title=read(()=>titleBridge?.titleStatus?.()),gate=title?.active?read(()=>titleBridge?.releaseTitleAvailability?.(),{ok:false,reasons:['service-unavailable']}):null;
  const empressLocked=card.titleKind==='empress'&&(card.titleId==='empress'||['submitted','awaiting-choice','accepted','charter-held'].includes(card.stage));
  return {...consortPetitionView({card:{...card,applicationId:card.applicationId??petition?.id??null,source:card.source??petition?.source??null,expiresAt:card.expiresAt??petition?.expiresAt},target:read(()=>service.interactionTarget?.(),card.physical?.target),player:read(getPlayer),details:read(getDetails,{}),history:read(()=>service.history?.())??read(()=>ledger?.history?.(),[])}),release:title?.active&&typeof title.appointmentId==='string'?{id:title.appointmentId,ok:gate?.ok===true&&!empressLocked,reasons:empressLocked?['先当面辞后并办结文书']:(gate?.reasons||[]).map(reasonText),confirm:releaseId===title.appointmentId}:null};
 }
 function close(){epoch++;releaseId=null;if(dialog.open)dialog.close();}
 function showError(out){errorText=safeText(out?.message)||ERRORS[out?.code]||(out?.reasons?.length?out.reasons.map(reasonText).join('；'):'暂不能办理，请稍后重试');}
 function act(id){
  if(disposed||!dialog.open||sending)return;
  const next=view();if(JSON.stringify(next)!==signature){render(next);return;}
  const action=[...current.actions,...current.benefitActions].find(a=>a.id===id);if(!action||action.disabled)return;
  errorText='';sending=true;
  try{
   if(action.action==='accept'||action.action==='decline'){
    const out=service.respond?.(action.action);if(!out?.ok)showError(out);render();
   }else if(action.action==='withdraw'){
    const out=service.withdraw?.();if(!out?.ok)showError(out);render();
   }else if(typeof onIntent==='function'&&action.target){
    close();const out=onIntent({kind:'consort-petition',action:action.action,target:action.target});
    if(out===false||out?.ok===false){showError(out);open();}
   }else{showError({code:'service-unavailable'});render();}
  }catch{showError({code:'service-unavailable'});if(!dialog.open)open();else render();}finally{sending=false;}
 }
 function releaseAction(action){
  if(disposed||!dialog.open||sending)return;
  const next=view();if(JSON.stringify(next)!==signature){render(next);return;}
  if(action==='cancel'){releaseId=null;render();return;}
  if(!next.release?.ok)return;
  if(action==='start'){releaseId=next.release.id;errorText='';render();return;}
  if(!next.release.confirm||next.release.id!==releaseId)return;
  sending=true;try{const out=titleBridge.resignTitle(releaseId,{confirmed:true});if(!out?.ok)showError(out);else{releaseId=null;errorText='';}render();}catch{showError({code:'service-unavailable'});render();}finally{sending=false;}
 }
 function render(next){
  if(disposed||!dialog.open)return;
  next??=view();
  if(current&&current.stage!==next.stage)errorText='';
  const nextSignature=JSON.stringify(next);if(nextSignature===signature&&error.textContent===errorText)return;
  epoch++;signature=nextSignature;current=next;set(title,next.identity);set(stageLabel,next.stageLabel);set(factNodes.seat,next.seatText);set(factNodes.residence,next.residenceText);set(factNodes.meal,next.mealText);
  for(const [node,text]of [[result,next.result||''],[resultNote,next.resultReasons.join('；')],[eligibility,next.eligibilityText],[note,next.note],[blockers,next.blockers.join('；')],[error,errorText]]){set(node,text);node.hidden=!text;}
  history.hidden=next.historyCount===0&&!next.release&&!next.benefitActions.length;set(summary,`${next.historyLabel} · ${next.historyCount}${next.benefitActions.length?' · 寝居与御膳':''}`);
  const nextHistory=JSON.stringify(next.history);if(nextHistory!==historySignature){historySignature=nextHistory;historyBody.replaceChildren(...next.history.map(row=>make('p',`${row.day===null?'':`第${row.day}日 · `}${row.label}${row.reasons.length?` · ${row.reasons.join('；')}`:''}`)));}
  releaseBox.hidden=!next.release;releaseStart.hidden=!!next.release?.confirm;releaseConfirm.hidden=releaseCancel.hidden=!next.release?.confirm;releaseStart.disabled=releaseConfirm.disabled=!next.release?.ok;
  set(releaseNote,next.release?.reasons.length?next.release.reasons.join('；'):next.release?.confirm?'辞去后交还寝房与御膳资格':'');releaseNote.hidden=!releaseNote.textContent;
  for(const [b,action]of [[releaseStart,'start'],[releaseConfirm,'confirm'],[releaseCancel,'cancel']]){const generation=epoch;b.onclick=()=>{if(generation===epoch)releaseAction(action);};}
  const active=new Set([...next.actions,...next.benefitActions].map(a=>a.id));for(const [id,b]of buttons)b.hidden=!active.has(id);
  for(const [list,container]of [[next.actions,actions],[next.benefitActions,benefitsBox]]){
   for(const [index,a]of list.entries()){
    let b=buttons.get(a.id);if(!b){b=make('button');b.type='button';b.setAttribute('data-consort-action',a.id);buttons.set(a.id,b);}
    if(buttonContainers.get(a.id)!==container){container.append(b);buttonContainers.set(a.id,container);}
    const generation=epoch;b.onclick=()=>{if(generation===epoch)act(a.id);};b.hidden=false;b.disabled=a.disabled||(a.action==='withdraw'?typeof service.withdraw!=='function':!['accept','decline'].includes(a.action)&&typeof onIntent!=='function');
    b.className=container===actions&&index===0?'ww-airy-action':'cn-consort-secondary';set(b,a.label);b.setAttribute('aria-label',a.label);
   }
   container.hidden=list.length===0;
  }
 }
 function open(){if(disposed)return false;if(!dialog.open){onOpen();epoch++;signature='';dialog.showModal();}render();return true;}
 closeButton.onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 return {open,close,isOpen:()=>!!dialog.open,update:()=>render(),menuContext:()=>{const v=view();return {stage:v.stage,hasTitle:v.hasTitle,waiting:!!v.note};},dispose(){if(disposed)return;close();disposed=true;dialog.remove();style.remove();}};
}
