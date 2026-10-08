import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts,preserveAiryPanelView} from './airy-panel.js';

const STYLE=new URL('./travel-journey.css',import.meta.url).href;
const COUNTRIES={china:'中国',japan:'日本',egypt:'埃及',france:'法国'};
const STEPS=[['planned','出示护照'],['departure-cleared','准备登机'],['flying','飞行途中'],['entry-pending','入境验照'],['entry-cleared','进入当地']];
const ACTIONS={planned:'departure','departure-cleared':'board',flying:'land','entry-pending':'entry','entry-cleared':'arrive'};
const ERRORS={
 'save-failed':'这一步尚未保存，旅程停留在原处。请重试。',
 'persistence-unavailable':'旅程暂时无法保存，请稍后重试。',
 'async-save-unsupported':'这一步尚未保存，旅程停留在原处。请重试。',
 'journey-busy':'正在办理这一步，请稍候。',
 'journey-conflict':'已有一段未结束的旅程，请先继续当前行程。',
 'invalid-clock':'游戏时刻暂时无法核对，请稍后重试。',
 'invalid-travel-journey':'旅行记录暂时无法核对，请保留存档，稍后再试。',
 'stale-action':'行程已有变化，请按当前步骤继续。',
 'journey-closed':'这段旅程已结束，请查看当前行程。',
 'invalid-stage':'行程已有变化，请按当前步骤继续。',
};
const country=id=>COUNTRIES[id]||'未登记';
const journeyNumber=(view,journey)=>{
 const index=(view.journeys||[]).findIndex(row=>row.id===journey.id);
 const serial=/^travel-journey-([1-9]\d*)$/.exec(journey.id)?.[1];
 return serial||String(index>=0?index+1:'待核对');
};
const errorLabel=value=>{
 const code=typeof value==='string'?value:value?.code;
 if(ERRORS[code])return ERRORS[code];
 // Only readable service feedback may appear verbatim. Unknown internal codes
 // and exception text do not become product copy or HTML.
 if(typeof code==='string'&&/[\u3400-\u9fff]/.test(code))return code;
 return '这一步暂未完成，请核对当前行程后重试。';
};
const stampDate=stamp=>{
 if(!Number.isSafeInteger(stamp?.day)||stamp.day<0||!Number.isFinite(stamp.hour)||stamp.hour<0||stamp.hour>=24)return '';
 const minute=Math.floor(stamp.hour*60);
 return ` · 第${stamp.day+1}日 ${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
};

// The host owns destination choice, ledger writes, the globe flight and arrival.
// Opening, rendering, progress updates and dismissing this view never advance it.
export function createTravelJourneyUI({getView=()=>({}),onAction,onCancel,onPassport,onOpen=()=>{},onClose=()=>{},document:doc=globalThis.document}={}){
 const make=(tag,text,cls)=>{const element=doc.createElement(tag);if(text!=null)element.textContent=String(text);if(cls)element.className=cls;return element;};
 const dialog=make('dialog',null,'ww-travel-dialog ww-airy-theme ww-airy-panel');
 dialog.setAttribute('aria-label','四方旅行 · 当前行程');
 const sharedStyle=make('style'),style=make('link');sharedStyle.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE;
 style.rel='stylesheet';style.href=STYLE;(doc.head||doc.body).append(sharedStyle,style);doc.body.append(dialog);
 let disposed=false,opened=false,acting=false,generation=0,session=0,signature='',feedback='',priorFocus=null;
 let flightId=null,flightProgress=0,progressElement=null,progressLabel=null;
 const read=()=>{try{return getView()||{};}catch{return {loadError:'invalid-travel-journey'};}};
 const snapshot=view=>({id:view.active?.id,stage:view.active?.stage,from:view.active?.from,to:view.active?.to,revision:view.revision});
 const matches=(before,view)=>before.id===view.active?.id&&before.stage===view.active?.stage&&before.from===view.active?.from&&before.to===view.active?.to&&before.revision===view.revision;

 function close(reason='close'){
  generation++;session++;
  if(!opened)return false;
  opened=false;progressElement=null;progressLabel=null;
  if(dialog.open)dialog.close();
  if(priorFocus?.isConnected!==false)priorFocus?.focus?.({preventScroll:true});priorFocus=null;
  onClose(reason);return true;
 }
 function button(label,run,{primary=false,disabled=false,key=''}={}){
  const element=make('button',label,primary?'ww-airy-action':'ww-travel-secondary'),epoch=generation;
  element.type='button';element.disabled=disabled;
  if(key)element.setAttribute('data-travel-action',key);
  element.onclick=()=>{if(!disposed&&opened&&dialog.open&&!element.disabled&&epoch===generation)run();};
  return element;
 }
 function finish(result,before,openSession){
  acting=false;
  // A completion from a dismissed or replaced panel must not reopen it or
  // overwrite feedback on a newer visit. The host retains its own write result.
  if(disposed||!opened)return;
  if(openSession!==session){refresh(true);return;}
  const live=read(),changed=!matches(before,live);
  feedback=result===true||result?.ok===true||result==null&&changed?'':errorLabel(result?.code||live.lastError);
  refresh(true);
 }
 function perform(before,kind){
  if(acting)return;
  const live=read();
  if(live.loadError||!matches(before,live)){
   feedback=live.loadError?errorLabel(live.loadError):ERRORS['stale-action'];refresh(true);return;
  }
  const callback=kind==='cancel'?onCancel:onAction;
  if(typeof callback!=='function')return;
  // Invalidate the old control before calling external code, including a
  // synchronous save that reenters its onclick. Failed saves get a fresh retry.
  generation++;acting=true;feedback='';const openSession=session;
  try{
   const result=kind==='cancel'?callback(before.id):callback(kind,before.id);
   if(result&&typeof result.then==='function'){
    refresh(true);
    Promise.resolve(result).then(value=>finish(value,before,openSession),()=>finish({ok:false},before,openSession));
   }else finish(result,before,openSession);
  }catch{finish({ok:false},before,openSession);}
 }
 function writeProgress(){
  if(!progressElement)return;
  const percentage=Math.round(flightProgress*100);progressElement.value=percentage;
  progressElement.setAttribute('aria-valuetext',`飞行展示 ${percentage}%`);
  progressLabel.textContent=percentage>=100?'已抵近目的地 · 准备入境':`飞行途中 · ${percentage}%`;
 }
 function setFlightProgress(value,journeyId){
  if(disposed||!Number.isFinite(value))return false;
  const journey=read().active;
  if(journey?.stage!=='flying'||journeyId!=null&&journeyId!==journey.id)return false;
  flightId=journey.id;flightProgress=Math.max(0,Math.min(1,value));writeProgress();return true;
 }
 function route(body,view,journey){
  const list=make('dl',null,'ww-travel-route');list.setAttribute('data-panel-key','travel-route');
  for(const [label,value]of [['出发国',country(journey.from)],['目的地',country(journey.to)],['旅程编号',journeyNumber(view,journey)]]){
   const row=make('div');row.append(make('dt',label),make('dd',value));list.append(row);
  }
  body.append(list);
 }
 function confirmations(body,view,journey){
  const marks=(view.stamps||[]).filter(stamp=>stamp.journeyId===journey.id),exit=marks.find(stamp=>stamp.kind==='exit'),entry=marks.find(stamp=>stamp.kind==='entry');
  const group=make('div',null,'ww-travel-stamps');group.setAttribute('data-panel-key','travel-stamps');
  if(exit)group.append(make('p',`${country(exit.regionId)}出境章已盖${stampDate(exit)}`,'ww-travel-stamp'));
  else if(journey.from==null&&journey.stage!=='planned')group.append(make('p','启程已登记 · 出发国未登记，未盖出境章','ww-travel-note'));
  if(entry)group.append(make('p',`${country(entry.regionId)}入境章已盖${stampDate(entry)}`,'ww-travel-stamp'));
  if(group.children.length)body.append(group);
 }
 function refresh(force=false){
  if(disposed||!opened)return;
  const view=read(),journey=view.active,key=JSON.stringify([view.revision,journey,view.currentRegion,view.stamps,view.loadError,view.lastError,feedback,acting]);
  if(!force&&key===signature)return;
  signature=key;generation++;
  const restore=preserveAiryPanelView(dialog,doc),flying=journey?.stage==='flying';
  if(journey?.id!==flightId){flightId=journey?.id||null;flightProgress=0;}
  progressElement=null;progressLabel=null;
  dialog.className=`ww-travel-dialog ww-airy-theme ww-airy-panel${flying?' is-flying':''}`;
  dialog.setAttribute('data-travel-stage',journey?.stage||'idle');dialog.replaceChildren();
  const {header,body,actions}=createAiryPanelParts(doc);header.className+=' ww-travel-heading';body.className+=' ww-travel-body';actions.className+=' ww-travel-actions';
  body.setAttribute('data-panel-key','travel-body');
  const dismiss=button('×',()=>close(),{key:'close'});dismiss.className='ww-travel-close';dismiss.setAttribute('aria-label',journey?'收起并保留旅程':'收起旅行面板');
  header.append(make('h2',flying?`飞往${country(journey.to)}`:'四方旅行'));
  header.append(make('p',flying?`出发国 ${country(journey.from)} → 目的地 ${country(journey.to)} · 旅程编号 ${journeyNumber(view,journey)}`:'出示护照，带着旅途印记出发'));
  if(journey){
   const index=STEPS.findIndex(([stage])=>stage===journey.stage),step=STEPS[index];
   if(!flying){
    route(body,view,journey);
    const steps=make('ol',null,'ww-travel-steps');steps.setAttribute('aria-label','旅行步骤');
    STEPS.forEach(([stage,label],i)=>{const item=make('li',label,i<index?'is-complete':i===index?'is-current':'');if(stage===journey.stage)item.setAttribute('aria-current','step');steps.append(item);});body.append(steps);
    const status=make('section',null,'ww-travel-status');status.setAttribute('data-panel-key','travel-status');
    status.append(make('h3',step?.[1]||'行程待核对'));
    const explanation={planned:journey.from==null?'出发国尚未登记。出示护照后登记启程，不补盖出境章。':`出示旅行护照，确认从${country(journey.from)}出境。`,'departure-cleared':`启程已确认，可以登机前往${country(journey.to)}。`,'entry-pending':`已抵达${country(journey.to)}，请在入境处出示护照。`,'entry-cleared':`入境手续已完成，可以进入${country(journey.to)}继续生活。`}[journey.stage];
    if(explanation)status.append(make('p',explanation));body.append(status);confirmations(body,view,journey);
    body.append(make('p',journey.stage==='planned'?'本段旅行免费 · 飞行可跳过 · 启程前可取消':'本段旅行免费 · 收起后保留当前步骤，下次继续','ww-travel-note'));
   }else{
    progressLabel=make('p','','ww-travel-flight-label');progressLabel.setAttribute('aria-live','off');
    progressElement=make('progress');progressElement.max=100;progressElement.setAttribute('aria-label','飞行展示进度');
    body.append(progressLabel,progressElement,make('p','飞行可跳过 · 收起即暂停，下次继续','ww-travel-note'));writeProgress();
   }
   const before=snapshot(view),kind=ACTIONS[journey.stage],label={planned:journey.from==null?'出示护照 · 确认启程':'出示护照 · 办理出境','departure-cleared':'登机出发',flying:'跳过飞行 · 准备入境','entry-pending':'出示护照 · 办理入境','entry-cleared':'进入当地'}[journey.stage];
   if(kind)actions.append(button(acting?'正在办理…':label,()=>perform(before,kind),{primary:true,disabled:acting||!!view.loadError||typeof onAction!=='function',key:kind}));
   if(journey.stage==='planned')actions.append(button('取消本次行程',()=>perform(before,'cancel'),{disabled:acting||!!view.loadError||typeof onCancel!=='function',key:'cancel'}));
  }else{
   body.append(make('p','先在地球仪选择目的地，再开始下一段旅程。','ww-travel-empty'),make('p',`当前所在国家：${country(view.currentRegion)}`,'ww-travel-note'));
  }
  if(typeof onPassport==='function')actions.append(button('查看护照',()=>{close('passport');if(!disposed)onPassport();},{disabled:acting,key:'passport'}));
  const warning=view.loadError?errorLabel(view.loadError):feedback||view.lastError&&errorLabel(view.lastError);
  if(warning){const error=make('p',warning,'ww-travel-error');error.setAttribute('role','alert');error.setAttribute('data-panel-key','travel-error');body.append(error);}
  dialog.append(dismiss,header,body,actions);restore();
 }
 function open(){
  if(disposed)return false;
  if(opened){refresh();return true;}
  priorFocus=doc.activeElement;opened=true;session++;feedback='';onOpen();
  if(disposed||!opened)return false;
  refresh(true);if(!dialog.open)dialog.showModal();
  return true;
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('close',()=>{if(!dialog.open&&opened)close();});
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 return {open,close,update:()=>refresh(),isOpen:()=>opened&&!!dialog.open,setFlightProgress,
  dispose(){if(disposed)return;disposed=true;close('dispose');dialog.remove();style.remove();sharedStyle.remove();}};
}
