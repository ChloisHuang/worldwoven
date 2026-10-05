import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';

const STAGES={none:'尚未自荐',submitted:'待皇帝召见','awaiting-choice':'已获准 · 待你答复',accepted:'已接受 · 待授册','charter-held':'册书在手 · 待宣读',appointed:'册封已生效',rejected:'本次未获准',declined:'你已婉拒',withdrawn:'自荐已撤回',resigned:'已辞去名位'};
const PHASES={summoning:'等候皇帝与沈序到场',audience:'当面召见中','commit-audience':'正在确认召见结果','to-desk':'沈序前往传令案','place-charter':'沈序展开册书',drafting:'沈序正在拟册',sealing:'沈序正在用印','pickup-charter':'沈序收起册书','to-meeting':'沈序持册前来','await-handoff':'等候当面授册',handoff:'正在当面授册','commit-handoff':'正在确认授册',reading:'沈序正在宣读','commit-reading':'正在确认册封'};
const ERRORS={'save-failed':'此次答复未能保存，请重试','invalid-consort-state':'自荐记录暂不可核验','invalid-clock':'当前时间暂不可核验','service-unavailable':'接待暂不可用','finish-current-duty':'先完成原职位班次','settle-current-wages':'先结清原职位待领工资','leave-formal-career':'先办妥原正式职位离任','adults-required':'双方须年满18岁','already-petitioned-today':'今日已自荐，次日可再试','relationship-reservations':'既有相处留下顾虑','different-dispositions':'性情取向尚不契合','emperor-unsettled':'此次召见时皇帝疲惫或饥饿','emperor-cautious':'皇帝性情审慎','personal-preference':'个人偏好未合','review-not-selected':'皇帝未予批准'};
const safeText=(value,fallback='')=>typeof value==='string'&&!/^[a-z][a-z0-9-]*$/.test(value)?value:fallback;
const reasonText=reason=>safeText(reason?.text)||ERRORS[reason?.code||reason]||'当前条件暂不满足';
const targetValid=target=>!!target&&typeof target.id==='string'&&Array.isArray(target.position)&&target.position.length===3&&target.position.every(Number.isFinite);
const atTarget=(player,target)=>{const p=player?.root?.position;return targetValid(target)&&!!p&&Math.hypot(p.x-target.position[0],p.z-target.position[2])<=(target.radius||1.1)&&Math.abs(p.y-target.position[1])<.35;};
const read=(fn,fallback=null)=>{try{return typeof fn==='function'?fn()??fallback:fallback;}catch{return fallback;}};

// Read-only projection. Physical actions are intents for the host's existing
// navigation/nearby interaction path; this module never submits or appoints.
export function consortPetitionView({card={},target=null,player=null,details={},history=[]}={}){
 const stage=Object.hasOwn(STAGES,card.stage)?card.stage:'none',physical=card.physical||{},near=atTarget(player,target),phase=physical.phase;
 const blockers=Object.hasOwn(STAGES,card.stage)?(card.blockers||[]).map(reasonText):['接待状态暂不可核验'],phaseText=PHASES[phase]||'',waitingText=safeText(physical.waitingText);
 const appointed=stage==='appointed'&&card.titleId==='consort',seat=details.seat;
 const seatText=Number.isInteger(seat?.occupied)&&Number.isInteger(seat?.capacity)&&seat.occupied>=0&&seat.capacity>0&&seat.occupied<=seat.capacity?`${seat.occupied} / ${seat.capacity} 席已占`:'名额待核对';
 const residenceText=appointed&&card.residence?safeText(details.residenceLabel,'独立寝房已归属'):stage==='appointed'?'住所资格待核':'受册后取得独立寝房';
 const meal=details.meal||{},stock=Number.isInteger(meal.remaining)&&meal.remaining>=0?`余 ${meal.remaining}${Number.isInteger(meal.capacity)&&meal.capacity>=meal.remaining?` / ${meal.capacity}`:''} 份`:'';
 const mealText=appointed?`${safeText(meal.label,'库存御膳')}${stock?` · ${stock}`:''}`:'住所与库存御膳 · 受册后可用';
 const actions=[],add=(id,label,action,target,disabled=false)=>actions.push({id,label,action,target:targetValid(target)?target:null,disabled});
 let note=[phaseText,waitingText].filter(Boolean).join(' · ');
 if(stage==='awaiting-choice'){
  add('accept','接受册封意向','accept',null,blockers.length>0);
  add('decline','婉拒','decline',null);
 }else if(phase&&stage!=='appointed'){
  add('primary',near?'现场等候':'返回听候处','return',target,near||!targetValid(target));
 }else if(stage==='appointed'){
  if(appointed&&card.residence&&targetValid(details.residenceTarget))add('residence','查看住所','residence',details.residenceTarget);
  if(appointed&&targetValid(meal.target))add('meal','前往膳点','meal',meal.target,meal.available===false);
  if(meal.available===false&&safeText(meal.reason))note=safeText(meal.reason);
 }else{
  const [action,label]=stage==='submitted'?['audience',near?'现场候召':'前往听候处']:stage==='accepted'?['investiture',near?'请沈序授册':'前往授册处']:stage==='charter-held'?['read-charter',near?'当面宣读册书':'前往宣读处']:['submit',near?'当面提交自荐':'前往后宫接待处'];
  // Reaching the point is not proof the herald is ready. The host still checks
  // the live controller when executing an intent, including manual arrivals.
  const localWait=near&&action==='submit'&&physical.heraldPresent===false;
  add('primary',localWait?'等候沈序接待':label,action,target,blockers.length>0||!targetValid(target)||localWait);
  if(localWait&&!note)note='沈序尚未到场';
 }
 const result=stage==='rejected'?'本次未获准':stage==='declined'?'已婉拒':stage==='withdrawn'?'已撤回':stage==='resigned'?'已辞去':appointed?'名位生效':card.result?.passed?'召见获准':null;
 const resultReasons=stage==='rejected'?(card.result?.reasons||[]).map(reasonText):[];
 const rows=history.map(p=>({day:Number.isSafeInteger(p?.submittedAt?.day)?p.submittedAt.day+1:null,label:STAGES[p?.stage]||'记录待核',reasons:p?.stage==='rejected'?(p.review?.reasons||[]).map(reasonText):[]})).reverse();
 return {stage,identity:appointed?'妃嫔':stage==='appointed'?'册封记录待核':'无宫廷名位',stageLabel:safeText(card.stageLabel,STAGES[stage]),seatText,residenceText,mealText,result,resultReasons,blockers,note,actions,history:rows,historyCount:Math.max(rows.length,Number.isInteger(card.historyCount)?card.historyCount:0)};
}

export const CONSORT_PETITION_UI_STYLE=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.cn-consort-dialog.ww-airy-panel{box-sizing:border-box;position:fixed;inset:var(--ww-ui-top,12px) var(--ww-ui-right,12px) var(--ww-ui-bottom,12px) var(--ww-ui-left,12px);margin:auto;width:min(650px,var(--ww-ui-width,calc(100vw - 24px)));max-width:none;height:min(314px,var(--ww-ui-height,calc(100dvh - 24px)));max-height:var(--ww-ui-height,calc(100dvh - 24px));padding:14px 20px 12px;border:1px solid #d8dfcd;border-radius:13px 4px;background:linear-gradient(112deg,#fbf8ee,#eff7f0);color:#446b70;font:14px/1.45 Georgia,"Songti SC",serif;box-shadow:0 10px 34px #294e5420}
.cn-consort-dialog::backdrop{background:#25444640;backdrop-filter:blur(3px)}.cn-consort-dialog *{box-sizing:border-box}.cn-consort-dialog button{font-family:inherit;min-height:44px;cursor:pointer}.cn-consort-dialog .cn-consort-close{position:absolute;right:6px;top:5px;width:44px;height:44px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;color:#78958e;font-size:26px}.cn-consort-heading{display:flex;align-items:baseline;flex-wrap:wrap;gap:5px 12px;padding:2px 30px 8px 0;border-bottom:1px solid #cbded2;margin:0 0 10px}.cn-consort-dialog .cn-consort-heading h2{margin:0;font-size:19px;line-height:1.3;font-weight:500}.cn-consort-stage{font-size:12px;color:#799089}.cn-consort-content{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.08fr);gap:18px;align-content:start}.cn-consort-facts{margin:0;min-width:0}.cn-consort-fact{display:grid;grid-template-columns:36px minmax(0,1fr);gap:9px;padding:5px 0}.cn-consort-fact dt{font-size:12px;color:#8b9a8d}.cn-consort-fact dd{margin:0;font-size:13px;line-height:1.5}.cn-consort-state{min-width:0;padding-left:16px;border-left:1px solid #d8e2d2}.cn-consort-result{display:inline-block;padding:2px 7px;background:#dcece47d;border:1px solid #ccdcd1;border-radius:3px;font-size:12px;color:#648275}.cn-consort-dialog p{font-size:12px;line-height:1.6;margin:6px 0;color:#7a9086}.cn-consort-dialog .cn-consort-blockers,.cn-consort-dialog .cn-consort-error{color:#a5735c}.cn-consort-history{margin:6px 0 0;padding:0;border:0;grid-column:1/-1}.cn-consort-history summary{width:fit-content;min-height:44px;padding:10px 0;font-size:12px;color:#82958a;cursor:pointer}.cn-consort-history p{margin:3px 0;font-size:12px}.cn-consort-actions{display:flex;gap:10px;align-items:center;padding-top:8px;border-top:1px solid #d2dfcf;margin-top:8px}.cn-consort-dialog .cn-consort-actions button{flex:1;width:auto;min-width:0;border:0;border-radius:0;background:transparent;padding:9px 12px;font-size:14px;letter-spacing:.01em;box-shadow:none}.cn-consort-dialog.ww-airy-theme .cn-consort-actions .ww-airy-action{font-size:14px;background-color:transparent}.cn-consort-dialog .cn-consort-actions .cn-consort-secondary{flex:0 0 108px;color:#7b9189}.cn-consort-dialog button:disabled{cursor:default;opacity:.48}.cn-consort-content [hidden],.cn-consort-dialog [hidden]{display:none!important}
@media(max-height:420px){.cn-consort-dialog.ww-airy-panel{padding:11px 18px 10px}.cn-consort-heading{margin-bottom:7px;padding-bottom:6px}.cn-consort-dialog .cn-consort-heading h2{font-size:18px}.cn-consort-actions{padding-top:6px;margin-top:6px}}
@media(max-width:540px){.cn-consort-dialog.ww-airy-panel{height:min(440px,var(--ww-ui-height,calc(100dvh - 24px)));padding:13px 16px}.cn-consort-content{display:block}.cn-consort-state{padding:8px 0 0;border-left:0;border-top:1px solid #d8e2d2;margin-top:7px}.cn-consort-heading{display:block}.cn-consort-stage{display:block;margin-top:3px}}
`;

/** onIntent({kind:'consort-petition',action,target}) is navigation only here.
 * The host performs the live physical action at arrival. getDetails supplies
 * real court/room/kitchen projections; absent providers never invent benefits.
 */
export function createChinaConsortPetitionUI({service,getLedger=()=>null,getPlayer=()=>null,getDetails=()=>({}),onIntent,onOpen=()=>{},document:doc=globalThis.document}={}){
 if(!doc||!service?.statusCard)throw new TypeError('Consort status UI requires a document and live status service');
 const make=(tag,text,cls)=>{const el=doc.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;};
 const dialog=make('dialog',null,'cn-consort-dialog ww-airy-theme ww-airy-panel'),style=make('style');style.textContent=CONSORT_PETITION_UI_STYLE;
 dialog.setAttribute('aria-label','宫廷自荐与名位');(doc.head||doc.body).append(style);doc.body.append(dialog);
 const {header,body,actions}=createAiryPanelParts(doc);header.className+=' cn-consort-heading';body.className+=' cn-consort-content';actions.className+=' cn-consort-actions';
 const title=make('h2'),stageLabel=make('span',null,'cn-consort-stage'),closeButton=make('button','×','cn-consort-close');closeButton.type='button';closeButton.setAttribute('aria-label','关闭名位状态');
 header.append(title,stageLabel);const facts=make('dl',null,'cn-consort-facts'),factNodes={};
 for(const [key,label]of [['seat','名额'],['residence','住所'],['meal','待遇']]){const row=make('div',null,'cn-consort-fact'),value=make('dd');factNodes[key]=value;row.append(make('dt',label),value);facts.append(row);}
 const state=make('section',null,'cn-consort-state'),result=make('span',null,'cn-consort-result'),resultNote=make('p'),note=make('p'),blockers=make('p',null,'cn-consort-blockers'),error=make('p',null,'cn-consort-error');error.setAttribute('role','status');
 state.append(result,resultNote,note,blockers,error);const history=make('details',null,'cn-consort-history'),summary=make('summary'),historyBody=make('div');history.append(summary,historyBody);body.append(facts,state,history);dialog.append(closeButton,header,body,actions);
 let disposed=false,current=null,signature='',historySignature='',epoch=0,errorText='',sending=false;
 const buttons=new Map();
 const set=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
 function view(){const card=read(()=>service.statusCard(),{}),ledger=read(getLedger);return consortPetitionView({card,target:read(()=>service.interactionTarget?.(),card.physical?.target),player:read(getPlayer),details:read(getDetails,{}),history:read(()=>ledger?.history?.(),[])});}
 function close(){epoch++;if(dialog.open)dialog.close();}
 function showError(out){errorText=safeText(out?.message)||ERRORS[out?.code]||(out?.reasons?.length?out.reasons.map(reasonText).join('；'):'暂不能办理，请稍后重试');}
 function act(id){
  if(disposed||!dialog.open||sending)return;
  const next=view();if(JSON.stringify(next)!==signature){render(next);return;}
  const action=current.actions.find(a=>a.id===id);if(!action||action.disabled)return;
  errorText='';sending=true;
  try{
   if(action.action==='accept'||action.action==='decline'){
    const out=service.respond?.(action.action);if(!out?.ok)showError(out);render();
   }else if(typeof onIntent==='function'&&action.target){
    close();const out=onIntent({kind:'consort-petition',action:action.action,target:action.target});
    if(out===false||out?.ok===false){showError(out);open();}
   }else{showError({code:'service-unavailable'});render();}
  }catch{showError({code:'service-unavailable'});if(!dialog.open)open();else render();}finally{sending=false;}
 }
 function render(next=view()){
  if(disposed||!dialog.open)return;
  const nextSignature=JSON.stringify(next);if(nextSignature===signature&&error.textContent===errorText)return;
  epoch++;signature=nextSignature;current=next;set(title,next.identity);set(stageLabel,next.stageLabel);set(factNodes.seat,next.seatText);set(factNodes.residence,next.residenceText);set(factNodes.meal,next.mealText);
  for(const [node,text]of [[result,next.result||''],[resultNote,next.resultReasons.join('；')],[note,next.note],[blockers,next.blockers.join('；')],[error,errorText]]){set(node,text);node.hidden=!text;}
  history.hidden=next.historyCount===0;set(summary,`自荐记录 · ${next.historyCount}`);
  const nextHistory=JSON.stringify(next.history);if(nextHistory!==historySignature){historySignature=nextHistory;historyBody.replaceChildren(...next.history.map(row=>make('p',`${row.day===null?'':`第${row.day}日 · `}${row.label}${row.reasons.length?` · ${row.reasons.join('；')}`:''}`)));}
  const active=new Set(next.actions.map(a=>a.id));for(const [id,b]of buttons)b.hidden=!active.has(id);
  for(const [index,a]of next.actions.entries()){
   let b=buttons.get(a.id);if(!b){b=make('button');b.type='button';b.setAttribute('data-consort-action',a.id);buttons.set(a.id,b);actions.append(b);}
   const generation=epoch;b.onclick=()=>{if(generation===epoch)act(a.id);};b.hidden=false;b.disabled=a.disabled||!['accept','decline'].includes(a.action)&&typeof onIntent!=='function';
   b.className=index===0?'ww-airy-action':'cn-consort-secondary';set(b,a.label);b.setAttribute('aria-label',a.label);
  }
  actions.hidden=next.actions.length===0;
 }
 function open(){if(disposed)return false;if(!dialog.open){onOpen();epoch++;signature='';dialog.showModal();}render();return true;}
 closeButton.onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 return {open,close,isOpen:()=>!!dialog.open,update:()=>render(),menuContext:()=>{const v=view();return {stage:v.stage,hasTitle:v.stage==='appointed'&&v.identity==='妃嫔',waiting:!!v.note};},dispose(){if(disposed)return;close();disposed=true;dialog.remove();style.remove();}};
}
