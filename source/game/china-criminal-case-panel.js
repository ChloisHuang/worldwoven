import {AIRY_PANEL_STYLE,createAiryPanelParts,preserveAiryPanelView} from './airy-panel.js';
import {getChinaCourtOfficialRank} from './china-official-ranks.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';

const STAGES={intake:'原案登记',scene:'现场核验',witness:'当面询证',review:'周惟正复核',archive:'回原案归档',archived:'已归档'};
const ACTIONS={intake:'前往原案登记',scene:'前往原现场核验',witness:'前往原当事人询证',review:'请周惟正本人复核',archive:'回原案归档'};
const KINDS={theft:'失窃原案',assault:'伤人原案',harm:'伤人原案',fencing:'赃物交易原案',arrest:'拘押原案',custody:'拘押原案',crime:'治安原案'};
const OUTCOMES={'reviewed-referral':'原据相互印证 · 已记录复核意见，不直接定罪','evidence-corroborated':'原据相互印证 · 复核已记录','insufficient-evidence':'证据不足 · 不据此认定有罪','sentence-already-served':'原处罚已执行完毕 · 不重复执行','source-closed':'原事件已结束 · 保留原据'};
const evidenceText=e=>typeof e==='string'?e:typeof e==='number'?String(e):e&&typeof e==='object'?e.text||e.label||e.description||e.kind||'原据详情待核对':'原据详情待核对';

// This is a read-only case projection. Only the host's revalidated physical
// intent can advance the original case; opening the panel cannot arrest or pay.
export function createChinaCriminalCasePanel({getCases=()=>[],getStatus=()=>({ok:true}),getIntent=()=>null,onAction=()=>{},onClose=()=>{},nameOf=()=>null,document:doc=globalThis.document}={}){
 const make=(tag,text,className)=>{const e=doc.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(className)e.className=className;return e;};
 const dialog=make('dialog',null,'cn-criminal-dialog ww-airy-theme ww-airy-panel'),style=make('style');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.cn-criminal-dialog.ww-airy-panel{position:fixed;inset:0;margin:auto;width:min(560px,var(--ww-ui-width,calc(100vw - 24px)));max-height:min(600px,var(--ww-ui-height,calc(100dvh - 24px)));padding:18px;border:1px solid #d4e5dc;border-radius:20px 7px;background:linear-gradient(115deg,#f9f8ee,#eef6ee 72%,#eff2f8);font-family:Georgia,"Songti SC",serif;box-shadow:0 14px 42px #274b6426}.cn-criminal-dialog::backdrop{background:#173b493d;backdrop-filter:blur(3px)}.cn-criminal-dialog *{box-sizing:border-box}.cn-criminal-dialog h2{font-size:21px}.cn-criminal-dialog h3{font-size:16px;margin:0 0 8px}.cn-criminal-dialog p,.cn-criminal-dialog li{font-size:13px;line-height:1.6;overflow-wrap:anywhere}.cn-criminal-dialog p{margin:7px 0}.cn-criminal-dialog ul{padding-left:20px}.cn-criminal-dialog button{min-height:44px;font-family:inherit;cursor:pointer}.cn-criminal-dialog button:disabled{cursor:default}.cn-criminal-close{position:absolute;right:7px;top:7px;width:44px;border:0;background:transparent;color:#537c80;font-size:26px}.cn-criminal-case{padding:12px 0;border-bottom:1px solid #d4e5dc}.cn-criminal-case:first-child{padding-top:0}.cn-criminal-dialog .cn-criminal-case .ww-airy-action{width:100%;font-size:14px;padding:9px 12px}.cn-criminal-note{color:#526e76}.cn-criminal-warning{color:#80554f}.cn-criminal-dialog summary{min-height:44px;padding:10px 0;cursor:pointer;font-size:13px}
`;
 dialog.setAttribute('aria-label','刑名原案 · 周惟正');doc.body.append(dialog);(doc.head||doc.body).append(style);
 let disposed=false,generation=0,signature='',notified=true;
 function notifyClose(){generation++;if(!notified){notified=true;onClose();}}
 function close(){if(dialog.open)dialog.close();notifyClose();}
 function button(label,fn,className=''){const b=make('button',label,className),g=generation;b.type='button';b.onclick=()=>{if(!disposed&&dialog.open&&g===generation&&!b.disabled)fn();};return b;}
 const person=id=>{const name=id&&nameOf(id);return typeof name==='string'&&name!==id?name:id?'原当事人':'未记录';};
 const evidenceLabel=e=>{
  if(!e||typeof e!=='object')return evidenceText(e);
  if(e.text||e.label||e.description)return evidenceText(e);
  const kind={sight:'现场目击记录',victim:'原受害方陈述',confession:'原涉事人供述'}[e.kind]||'原案记录';
  return `${kind} · ${person(e.witnessId)} · ${Array.isArray(e.deliveredTo)&&e.deliveredTo.length?'已递交原报告':'尚未递交报告'}`;
 };
 function refresh(force=false){
  if(disposed||!dialog.open&&!force)return;
  const status=getStatus(),source=getCases(),cases=Array.isArray(source)?source.filter(row=>row&&row.id):[];
  const rows=cases.map(row=>({row,intent:row.stage==='archived'?null:getIntent(row.id)}));
  const next=JSON.stringify([status,rows.map(({row,intent})=>[row,!!intent,intent?.action,intent?.intentKey,person(row.source?.subjectId),person(row.source?.victimId)])]);
  if(!force&&next===signature)return;signature=next;generation++;
  const restore=preserveAiryPanelView(dialog,doc),{header,body,actions}=createAiryPanelParts(doc);
  header.append(make('h2','刑名原案'),make('p',`周惟正 · ${getChinaCourtOfficialRank('cn-official-justice').gradeLabel} · 品级日俸${getChinaCourtOfficialRank('cn-official-justice').currentWage}文`));
  body.append(make('p','协助同一真实案件，按原案登记、现场核验、当面询证、本人复核与归档继续办理；不授新官位，不另发工资。','cn-criminal-note'));
  body.append(make('p','这是原案复核，不是新抓捕或追加处罚；证人陈述须与原据核对，不能仅凭陈述认定有罪。','cn-criminal-note'));
  if(status?.ok===false)body.append(make('p','原案存档暂无法核验，办理已暂停。原记录保持，请勿覆盖存档。','cn-criminal-warning'));
  else if(!rows.length)body.append(make('p','当前没有可核验的真实原案；不生成虚构任务。','cn-criminal-note'));
  for(const {row,intent} of rows){
   const card=make('section',null,'cn-criminal-case');card.setAttribute('data-panel-key',`criminal-case-${row.id}`);
   card.append(make('h3',`第${row.number??row.source?.number??'待核'}号 · ${KINDS[row.kind||row.source?.kind]||'治安原案'} · ${STAGES[row.stage]||'办理进度待核对'}`));
   card.append(make('p',`涉事人：${person(row.source?.subjectId)} · 原受害方：${person(row.source?.victimId)}`));
   const details=make('details');details.setAttribute('data-panel-key',`criminal-evidence-${row.id}`);details.append(make('summary','查看原案证据'));
   const evidence=row.source?.evidence;
   const entries=Array.isArray(evidence)?evidence:evidence?[evidence]:[];
   if(entries.length){const list=make('ul');for(const entry of entries)list.append(make('li',evidenceLabel(entry)));details.append(list);}else details.append(make('p','原据尚不足，须继续核验；无记录不表示有罪。'));
   card.append(details);
   const outcome=typeof row.outcome==='string'?row.outcome:row.outcome?.code;
   card.append(make('p',OUTCOMES[outcome]||'复核结论待核对，不作有罪推定。','cn-criminal-note'));
   if(row.outcome?.recordedStatement)card.append(make('p','原证人暂不可面询，本次仅核对已递交的原陈述；不是新增证言，不能据此补足相互印证。','cn-criminal-warning'));
   if(outcome==='insufficient-evidence')card.append(make('p','退回继续调查；可归档本次不足结论，后续仅有真实新原据时继续同号办理。','cn-criminal-note'));
   if(row.stage==='scene'&&row.sceneLocationKind==='reported-sighting')card.append(make('p','原事件未保存事发位置，本步核对已报告的目击位置，不视作已确认事发现场。','cn-criminal-note'));
   if(row.stale)card.append(make('p','原事件状态已变化；保留同号记录，按最新原据继续核对，不重开抓捕或处罚。','cn-criminal-warning'));
   if(row.stage!=='archived'&&ACTIONS[row.stage]){
    const b=button(intent?.action||ACTIONS[row.stage],()=>{
     // Re-resolve on selection. A dismissed, refreshed or no-longer-available
     // choice must never send an old arrest/review/navigation target.
     const live=getCases()?.find(item=>item.id===row.id);
     if(!live||live.stage!==row.stage){refresh(true);return;}
     const current=getIntent(row.id);if(!current){refresh(true);return;}
     close();onAction(current);
    },'ww-airy-action');
    b.setAttribute('data-panel-key',`criminal-action-${row.id}`);b.disabled=!intent;card.append(b);
    if(!intent)card.append(make('p',row.stage==='review'?'周惟正本人当前无法接待；原案保留，待本人可接待后再复核。':'当前原案接点暂不可办理；原进度保留，稍后继续。','cn-criminal-warning'));
   }
   body.append(card);
  }
  const x=button('×',close,'cn-criminal-close');x.setAttribute('aria-label','关闭刑名原案');actions.append(button('收起 · 保留原案',close));dialog.replaceChildren(x,header,body,actions);restore();
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{if(!dialog.open)notifyClose();});
 return {open(){if(disposed)return false;refresh(true);if(!dialog.open){notified=false;dialog.showModal();}return true;},close,isOpen:()=>!disposed&&!!dialog.open,refresh,dispose(){if(disposed)return;close();disposed=true;dialog.remove();style.remove();}};
}
