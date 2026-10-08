import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts,preserveAiryPanelView} from './airy-panel.js';

const STAGES={locked:'尚未解锁',available:'可开始筹备',planning:'筹备中','ready-for-investiture':'待宣读',failed:'失败冷却',invested:'已登位',abandoned:'已放弃本案'};
const PERSON_STATES={'not-asked':'尚未当面商议',accepted:'已明确同意',declined:'已婉拒本次联合',withdrew:'已退出本次联合'};
const STEP_STATES={pending:'待筹备',ready:'可进行',completed:'已完成'};
const ERRORS={
 'save-failed':'这一步尚未保存，原筹谋与已存准备仍保留，请重试。',
 'persistence-unavailable':'筹谋暂时无法保存，请稍后重试。',
 'async-save-unsupported':'这一步尚未保存，原筹谋与已存准备仍保留，请重试。',
 'stale-action':'筹谋已有变化，请按当前步骤继续。',
 'invalid-usurpation-state':'筹谋记录暂时无法核对，原存档仍保留。',
 'save-unavailable':'筹谋暂时无法保存，请稍后重试。',
 'world-context-unavailable':'当前人物与宫廷情况暂不可核对。',
 'adult-living-player-required':'须以当前成年身份参与筹谋。',
 'emperor-tenure-changed':'在位者已有变化，请重新核对局势。',
 'case-identity-changed':'本案人物身份已有变化，不能沿用原行动。',
 'distinct-bodies-required':'本案人物身份暂不可核对。',
 'already-emperor':'你已在位，无须再开筹谋。',
 'invalid-clock':'游戏时刻暂不可核对，请稍后重试。',
 'support-not-established':'先在日常相处与履职中取得不同圈层的认可。',
 'case-pending':'请继续当前同一筹谋。',
 'case-cooldown':'本案仍在冷却，稍后可重新筹谋。',
 'select-a-route':'先为本案选择筹备方向。',
 'intrigue-preparation-required':'宫廷阴谋的现场准备尚未办妥。',
 'guard-preparation-required':'现任卫队的实际响应尚未备妥。',
 'abdication-preparation-required':'具名官员的联合对质尚未办妥。',
 'mechanism-already-resolved':'本案对峙已经结束，继续办理后续步骤。',
 'cross-circle-acclamation-required':'先取得不同圈层人物的具名拥立。',
 'safe-handoff-required':'先办妥原职、物件与当前事务的安全交接。',
 'commander-response-required':'须由现任卫队负责人明确响应。',
 'real-guards-required':'须由原守卫实际到场。',
 'official-commitments-required':'须由具名官员实际承诺并到场。',
 'named-acclamation-required':'须有已同意人物具名拥立。',
 'physical-evidence-required':'请先在对应现场完成当前动作。',
 'unverified-physical-evidence':'本次现场动作仍待核验，尚未推进筹谋。',
 'unverified-safe-handoff':'当前交接仍待核验，尚未变更帝位。',
 'usurpation-busy':'当前步骤正在办理，请稍候。',
 'explicit-abandonment-required':'请单独确认是否放弃本案。',
 'invalid-route':'请保留至少一个有效筹备方向。',
};
const text=value=>typeof value==='string'?value:'';
const rows=value=>Array.isArray(value)?value:[];
const errorText=value=>{
 const code=typeof value==='string'?value:value?.code||value?.reason;
 return text(value?.message)||ERRORS[code]||(typeof code==='string'&&/[\u3400-\u9fff]/.test(code)?code:'这一步暂未完成，请核对当前筹谋后重试。');
};
const reasonText=value=>ERRORS[value]||(typeof value==='string'&&/[\u3400-\u9fff]/.test(value)?value:'当前条件尚未具备。');
const actionCopy=action=>{
 const copy={};
 for(const key of ['id','kind','caseId','revision','routeId','actorId','preparationKind'])if(Object.hasOwn(action,key))copy[key]=action[key];
 return copy;
};
const actionKey=action=>JSON.stringify(actionCopy(action));
const context=view=>({caseId:view.caseId??null,revision:view.revision,stage:view.stage});
const sameContext=(before,view)=>before.caseId===(view.caseId??null)&&before.revision===view.revision&&before.stage===view.stage;

const STYLE=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.ww-usurpation-dialog.ww-airy-panel{box-sizing:border-box;position:fixed;inset:var(--ww-ui-top,12px) var(--ww-ui-right,12px) var(--ww-ui-bottom,12px) var(--ww-ui-left,12px);margin:auto;width:min(720px,var(--ww-ui-width,calc(100vw - 24px)));max-width:none;height:min(660px,var(--ww-ui-height,calc(100dvh - 24px)));max-height:var(--ww-ui-height,calc(100dvh - 24px));padding:17px 20px 14px;border:1px solid #d8dfcd;border-radius:13px 4px;background:linear-gradient(112deg,#fbf8ee,#eff7f0);color:#446b70;font:14px/1.5 Georgia,"Songti SC",serif;box-shadow:0 10px 34px #294e5420}
.ww-usurpation-dialog::backdrop{background:#25444640;backdrop-filter:blur(3px)}.ww-usurpation-dialog *{box-sizing:border-box}.ww-usurpation-dialog button{min-width:44px;min-height:44px;font:inherit;cursor:pointer}.ww-usurpation-dialog button:disabled{opacity:.5;cursor:default}.ww-usurpation-dialog h3{margin:0 0 6px;font-size:14px;font-weight:500}.ww-usurpation-dialog p{margin:5px 0;font-size:12px;line-height:1.65;overflow-wrap:anywhere}.ww-usurpation-dialog ul,.ww-usurpation-dialog ol{padding-left:19px;margin:6px 0}.ww-usurpation-dialog li{margin:4px 0;font-size:12px;overflow-wrap:anywhere}.ww-usurpation-dialog .ww-usurpation-heading{padding:0 32px 10px 0;border-bottom:1px solid #cfddcf;margin-bottom:12px}.ww-usurpation-dialog .ww-usurpation-heading h2{font-size:21px;font-weight:500}.ww-usurpation-dialog .ww-usurpation-heading p{color:#789087}.ww-usurpation-dialog .ww-usurpation-close{position:absolute;right:7px;top:6px;border:0;background:transparent;padding:0;color:#78958e;font-size:26px;box-shadow:none}.ww-usurpation-dialog .ww-usurpation-body{min-height:0;overflow:auto;display:grid;gap:14px;align-content:start;padding-right:3px}.ww-usurpation-facts{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.ww-usurpation-routes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ww-usurpation-route{min-width:0;padding:10px;border:1px solid #d7e1d3;border-radius:7px;background:#f5f8ef70}.ww-usurpation-route.is-selected{border-color:#96b7a8;background:#eaf3e780}.ww-usurpation-dialog .ww-usurpation-route-state{color:#648575}.ww-usurpation-dialog .ww-usurpation-note{color:#7a8f84}.ww-usurpation-dialog .ww-usurpation-warning,.ww-usurpation-dialog .ww-usurpation-error{color:#9c684f}.ww-usurpation-dialog .ww-usurpation-action{display:block;width:100%;text-align:left;padding:9px 10px;margin-top:5px;border:0;background:#e2eee480;border-radius:4px;box-shadow:none;color:#446b70}.ww-usurpation-dialog .ww-usurpation-secondary{background:transparent;color:#758c80}.ww-usurpation-dialog .ww-usurpation-actions{flex:0 0 auto;display:flex;gap:8px;flex-wrap:wrap;padding-top:9px;border-top:1px solid #cfddcf;margin-top:12px}.ww-usurpation-dialog .ww-usurpation-actions button{width:auto;flex:1;padding:8px 10px;border:0;background:transparent;box-shadow:none}.ww-usurpation-dialog .ww-usurpation-actions .ww-usurpation-abandon{color:#9c684f}.ww-usurpation-dialog summary{min-height:44px;padding:10px 0;font-size:12px;color:#718c7e;cursor:pointer}.ww-usurpation-person{padding:6px 0;border-top:1px solid #dce5d9}.ww-usurpation-confirm{padding:10px;border:1px solid #d8beaa;border-radius:6px;background:#f8f0e4}.ww-usurpation-dialog [hidden]{display:none!important}
@media(max-width:600px){.ww-usurpation-dialog.ww-airy-panel{padding:14px 15px 12px}.ww-usurpation-facts{grid-template-columns:1fr;gap:12px}.ww-usurpation-routes{grid-template-columns:1fr}.ww-usurpation-dialog .ww-usurpation-actions{gap:3px}.ww-usurpation-dialog .ww-usurpation-actions button{font-size:12px}}
@media(max-height:430px){.ww-usurpation-dialog.ww-airy-panel{padding-top:11px;padding-bottom:9px}.ww-usurpation-dialog .ww-usurpation-heading{margin-bottom:8px;padding-bottom:7px}.ww-usurpation-dialog .ww-usurpation-heading h2{font-size:18px}.ww-usurpation-dialog .ww-usurpation-actions{padding-top:5px;margin-top:7px}}
`;

// Read-only presentation of the core's version-1 view. All actions are intents
// for main: physical steps still navigate and recheck at their real target.
// Neither closing this dialog nor changing its selected route writes a ledger.
export function createPalaceUsurpationUI({getView=()=>({}),onAction,onOpen=()=>{},onClose=()=>{},document:doc=globalThis.document}={}){
 if(!doc?.createElement)throw new TypeError('Palace usurpation UI requires a document');
 const make=(tag,value,cls)=>{const node=doc.createElement(tag);if(value!=null)node.textContent=String(value);if(cls)node.className=cls;return node;};
 const dialog=make('dialog',null,'ww-usurpation-dialog ww-airy-theme ww-airy-panel'),style=make('style',STYLE);
 dialog.id='palace-usurpation-dialog';dialog.setAttribute('aria-label','筹谋帝位');
 (doc.head||doc.body).append(style);doc.body.append(dialog);
 let disposed=false,opened=false,acting=false,generation=0,session=0,signature='',feedback='',confirmation=null,priorFocus=null;
 const read=()=>{try{const value=getView();return value&&typeof value==='object'?value:{visible:false,stage:'locked',loadError:'invalid-usurpation-state'};}catch{return {visible:false,stage:'locked',loadError:'invalid-usurpation-state'};}};
 const availableActions=view=>view.visible===false||view.loadError?[]:rows(view.actions).filter(action=>action&&typeof action.id==='string'&&typeof action.kind==='string');
 const enabled=(action,view)=>action.enabled===true&&action.caseId===(view.caseId??null)&&action.revision===view.revision&&Number.isSafeInteger(view.revision)&&!acting&&typeof onAction==='function';

 function close(reason='close'){
  generation++;session++;confirmation=null;
  if(!opened)return false;
  opened=false;if(dialog.open)dialog.close();
  if(priorFocus?.isConnected!==false)priorFocus?.focus?.({preventScroll:true});priorFocus=null;
  onClose(reason);return true;
 }
 function button(label,run,{key='',disabled=false,cls='ww-usurpation-action'}={}){
  const node=make('button',label,cls),mountedGeneration=generation;
  node.type='button';node.disabled=disabled;if(key)node.setAttribute('data-usurpation-action',key);
  node.onclick=()=>{if(!disposed&&opened&&dialog.open&&!node.disabled&&mountedGeneration===generation)run();};
  return node;
 }
 function check(before,action){
  const live=read(),current=availableActions(live).find(item=>item.id===action.id&&actionKey(item)===actionKey(action));
  if(!sameContext(before,live)||!current||!enabled(current,live)){
   feedback=live.loadError?errorText(live.loadError):ERRORS['stale-action'];confirmation=null;refresh(true,live);return null;
  }
  return live;
 }
 function finish(result,before,openSession){
  acting=false;if(disposed||!opened)return;
  const live=read();
  // Late replies may clear the busy state but cannot restore a closed view or
  // put the previous task's error onto a new case or reopened panel.
  if(openSession===session&&sameContext(before,live)&&(result===false||result?.ok===false))feedback=errorText(result);
  else if(openSession===session)feedback='';
  refresh(true,live);
 }
 function perform(before,action,confirmed=false){
  if(acting||!check(before,action))return;
  if(action.kind==='abandon'&&!confirmed){confirmation=actionKey(action);feedback='';refresh(true);return;}
  generation++;acting=true;confirmation=null;feedback='';const openSession=session;
  try{
   const intent=actionCopy(action);if(action.kind==='abandon')intent.confirmed=true;
   const result=onAction(intent);
   if(result&&typeof result.then==='function'){
    refresh(true);Promise.resolve(result).then(value=>finish(value,before,openSession),()=>finish({ok:false},before,openSession));
   }else finish(result,before,openSession);
  }catch{finish({ok:false},before,openSession);}
 }
 function appendAction(root,action,view,{cls,confirmed=false,label}={}){
  const before=context(view),captured={...action};
  const node=button(label||text(action.label)||'前往继续筹谋',()=>perform(before,captured,confirmed),{key:confirmed?'confirm-abandon':action.id,disabled:!enabled(action,view),cls});
  root.append(node);
  if(action.enabled!==true&&text(action.reason))root.append(make('p',reasonText(action.reason),'ww-usurpation-note'));
  return node;
 }
 function requirementList(root,requirements){
  const list=make('ul');
  for(const item of rows(requirements))if(text(item?.label))list.append(make('li',`${item.met===true?'已具备':'待具备'} · ${item.label}`));
  if(list.children.length)root.append(list);
 }
 function refresh(force=false,suppliedView=null){
  if(disposed||!opened)return false;
  const view=suppliedView||read(),visible=view.visible!==false,allActions=availableActions(view),stage=visible&&Object.hasOwn(STAGES,view.stage)?view.stage:'locked';
  const stageLabel=stage==='planning'&&allActions.some(action=>action.kind==='resolve'&&action.enabled===true)?'可对峙':STAGES[stage];
  const key=JSON.stringify([view.revision,view.caseId,stage,visible,view.summary,view.conditions,view.routes,view.people,view.steps,allActions,view.blockers,view.outcome,view.history,view.cooldownLabel,view.loadError,view.lastError,feedback,confirmation,acting]);
  if(!force&&key===signature)return false;
  signature=key;generation++;
  if(confirmation&&!allActions.some(action=>action.kind==='abandon'&&actionKey(action)===confirmation&&action.enabled===true))confirmation=null;
  const restore=preserveAiryPanelView(dialog,doc),{header,body,actions}=createAiryPanelParts(doc);
  header.className+=' ww-usurpation-heading';body.className+=' ww-usurpation-body';actions.className+=' ww-usurpation-actions';
  body.setAttribute('data-panel-key','usurpation-body');dialog.setAttribute('data-usurpation-stage',stage);
  const dismiss=button('×',()=>close(),{key:'close',cls:'ww-usurpation-close'});dismiss.setAttribute('aria-label','收起并保留筹谋');
  header.append(make('h2','筹谋帝位'),make('p',stageLabel));
  if(!visible)body.append(make('p','当前条件尚未解锁筹谋帝位。先在日常相处与履职中取得不同圈层的认可，再来查看。','ww-usurpation-note'));
  else if(text(view.summary))body.append(make('p',view.summary));
  if(visible){
   const facts=make('div',null,'ww-usurpation-facts'),conditions=make('section'),support=make('section');
   conditions.setAttribute('data-panel-key','usurpation-conditions');conditions.append(make('h3','筹谋条件'));requirementList(conditions,view.conditions);
   support.setAttribute('data-panel-key','usurpation-consenters');support.append(make('h3','已同意的关键人物'));
   const consenters=rows(view.people).filter(person=>person?.status==='accepted'&&text(person.name));
   if(consenters.length){const names=make('ul');for(const person of consenters)names.append(make('li',person.name));support.append(names);}
   else support.append(make('p','尚无人物明确同意本案。','ww-usurpation-note'));
   facts.append(conditions,support);body.append(facts);

   if(rows(view.routes).length){
    const section=make('section'),routes=make('div',null,'ww-usurpation-routes');section.setAttribute('data-panel-key','usurpation-routes');section.append(make('h3','同一筹谋 · 可组合准备'),make('p','可以改换或组合筹备方向；已有准备留在本案。职业与名位会影响可做的准备。','ww-usurpation-note'));
    for(const route of rows(view.routes)){
     const card=make('section',null,`ww-usurpation-route${route.selected?' is-selected':''}`);card.setAttribute('data-panel-key',`usurpation-route-${route.id}`);
     card.append(make('h3',text(route.label)||'筹备方向'),make('p',route.prepared?'本案已备妥':route.selected?'正在筹备此方向':'尚未选入本案','ww-usurpation-route-state'));
     if(text(route.description))card.append(make('p',route.description,'ww-usurpation-note'));
     requirementList(card,route.requirements);
     for(const action of allActions.filter(item=>item.kind==='select-route'&&item.routeId===route.id)){const node=appendAction(card,action,view);node.setAttribute('aria-pressed',String(route.selected===true));}
     routes.append(card);
    }
    section.append(routes);body.append(section);
   }
   if(rows(view.steps).length){
    const section=make('section'),list=make('ol');section.setAttribute('data-panel-key','usurpation-steps');section.append(make('h3','本案步骤'));
    for(const step of rows(view.steps)){const row=make('li',`${text(step.label)||'本案步骤'} · ${STEP_STATES[step.status]||'待核对'}`);if(step.status==='ready')row.setAttribute('aria-current','step');list.append(row);}
    section.append(list);body.append(section);
   }
   const people=rows(view.people).filter(person=>text(person?.name));
   if(people.length){
    const details=make('details');details.setAttribute('data-panel-key','usurpation-people');details.append(make('summary','当面商议与本人答复'));
    for(const person of people){
     const row=make('section',null,'ww-usurpation-person');row.setAttribute('data-panel-key',`usurpation-person-${person.id}`);row.append(make('p',`${person.name} · ${PERSON_STATES[person.status]||'答复待核对'}`));
     for(const action of allActions.filter(item=>item.kind==='pledge'&&item.actorId===person.id))appendAction(row,action,view);
     details.append(row);
    }
    details.append(make('p','须实际找到本人商议；对方可拒绝，也可改变答复。','ww-usurpation-note'));body.append(details);
   }
   const next=allActions.filter(action=>!['select-route','pledge','abandon','cancel-current'].includes(action.kind));
   if(next.length){
    const section=make('section');section.setAttribute('data-panel-key','usurpation-next');section.append(make('h3','下一步'),make('p','需要到场的步骤会先前往对应地点；实际剧情选择在现场进行。','ww-usurpation-note'));
    if(next.some(action=>action.kind==='resolve'||action.kind==='prepare'&&action.preparationKind==='intrigue'))section.append(make('p','这是虚构宫廷剧情。阴谋可使旧帝失能，对峙可能失败并进入冷却；筹备完成仍须现场办结与宣读，才会变更帝位。','ww-usurpation-warning'));
    for(const action of next)appendAction(section,action,view);body.append(section);
   }
   if(rows(view.blockers).length){const section=make('section');section.append(make('h3','当前尚缺'));const list=make('ul');for(const blocker of rows(view.blockers))if(text(blocker))list.append(make('li',reasonText(blocker)));section.append(list);body.append(section);}
   if(text(view.cooldownLabel))body.append(make('p',view.cooldownLabel,'ww-usurpation-note'));
   if(text(view.outcome?.summary))body.append(make('p',view.outcome.summary,'ww-usurpation-note'));
   if(rows(view.history).length){
    const history=make('details');history.setAttribute('data-panel-key','usurpation-history');history.append(make('summary','历次筹谋记录'));
    for(const [index,row]of rows(view.history).entries())history.append(make('p',`${index+1}. ${text(row.label)||STAGES[row.stage]||'已存筹谋'}`));body.append(history);
   }
   const abandon=allActions.find(action=>action.kind==='abandon');
   if(abandon&&confirmation===actionKey(abandon)){
    const box=make('section',null,'ww-usurpation-confirm');box.setAttribute('data-panel-key','usurpation-abandon-confirmation');box.append(make('h3','放弃这次筹谋？'),make('p','放弃会结束本案，保留已发生的事实与历史，并进入筹谋冷却。收起面板可以保留本案。'));
    appendAction(box,abandon,view,{confirmed:true,label:'确认放弃本案',cls:'ww-usurpation-action ww-usurpation-abandon'});
    box.append(button('继续保留本案',()=>{confirmation=null;refresh(true);},{key:'keep-case',cls:'ww-usurpation-action ww-usurpation-secondary'}));body.append(box);
   }
   for(const action of allActions.filter(item=>item.kind==='cancel-current'))appendAction(actions,action,view,{label:'停止当前动作 · 保留筹谋',cls:'ww-usurpation-secondary'});
   if(abandon&&!confirmation)appendAction(actions,abandon,view,{label:'放弃这次筹谋',cls:'ww-usurpation-abandon'});
  }
  const warning=view.loadError?errorText(view.loadError):feedback||view.lastError&&errorText(view.lastError);
  if(warning){const error=make('p',warning,'ww-usurpation-error');error.setAttribute('role','alert');error.setAttribute('data-panel-key','usurpation-error');body.append(error);}
  body.append(make('p','收起面板或停止当前动作会保留本案与已存准备。帝位变更以现场剧情及宣读结果为准。','ww-usurpation-note'));
  actions.append(button('先收起',()=>close(),{key:'dismiss',cls:'ww-usurpation-secondary'}));
  dialog.replaceChildren(dismiss,header,body,actions);restore();return true;
 }
 function open(){
  if(disposed)return false;
  if(opened){refresh();return true;}
  priorFocus=doc.activeElement;opened=true;session++;feedback='';confirmation=null;onOpen();
  if(disposed||!opened)return false;
  refresh(true);if(!dialog.open)dialog.showModal();return true;
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('close',()=>{if(!dialog.open&&opened)close();});
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 return {open,close,update:()=>refresh(),isOpen:()=>opened&&!!dialog.open,dispose(){if(disposed)return;disposed=true;close('dispose');dialog.remove();style.remove();}};
}
