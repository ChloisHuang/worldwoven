import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts,preserveAiryPanelView} from './airy-panel.js';
import {TAVERN_DISHES} from './china-tavern-kitchen.js';
import {TAVERN_STOCK_COSTS} from './china-tavern-stock.js';

const roleNames={'cn-tavern-host':'柜台接待','cn-tavern-chef':'厨师','cn-tavern-steward':'服务助理'};
const people={'cn-tavern-host':'许安','cn-tavern-cook':'沈禾','cn-tavern-assistant':'陆青','cn-tavern-diner-west':'顾谨','cn-tavern-diner-east':'周棠',player:'你'};
const phases={'waiting-release':'等原事务办完','to-meeting':'正在前来面谈',meeting:'等你当面答复','to-table':'前往试工餐桌',cleaning:'正在擦桌试工','to-owner':'试工已完成，回来复谈',review:'等你当面复谈',paused:'先处理用餐或如厕',returning:'正在交还原来安排',returned:'已结束申请',assigned:'已正式到岗'};
const errors={
 'save-failed':'保存未完成，请重试；款项与安排以账簿为准。','table-work-save-failed':'擦桌记录尚未保存，请稍候重试。',
 'insufficient-business-funds':'可用经营款不足，可到产权账注入周转金。','insufficient-business-budget':'可用经营款不足，已预留的工资与试工款不能动用。',
 'insufficient-unreserved-business-funds':'可用经营款不足，已预留的工资与试工款不能动用。','stale-stock-budget':'经营余额已变化，请按当前账目重新选择。',
 'player-owner-required':'产权已变化，只有当前业主能办理。','stale-owner':'产权已变化，请重新打开账簿。','stale-action':'安排已变化，请按当前记录重新操作。',
 'handoff-pending':'手头工作尚未交清，岗位保持原安排，请稍后再办理。','handoff-unsafe':'原事务或岗位尚未交清，请等本人完成交接。',
 'dismissal-unsafe':'手头工作尚未交清，岗位保持原安排，请稍后再办理。','recruitment-handoff-unsafe':'请等应聘者回到面谈处，并当面完成交接。',
 'player-tenure-owned':'你已正式任职这个岗位，请先按任职流程离任。','player-role-protected':'你已正式任职这个岗位，请先按任职流程离任。',
 'trial-incomplete':'两张餐桌尚未全部擦完，完成后才能批准聘用。','qualification-required':'尚无合格记录，请先安排实际试工。',
 'application-not-open':'这份申请已有答复。','slot-occupied':'岗位已有人员，请先安全交接腾空。','hiring-reservation-conflict':'这个岗位已有待交接人选。',
 'management-busy':'账簿正在办理另一笔，请稍后重试。','tavern-business-busy':'账簿正在办理另一笔，请稍后重试。',
 'purchase-operation-conflict':'这笔采购记录已变化，请刷新后重新选择。','stale-stock-price':'食材记录已变化，请重新选择。',
};
const blockerNames={'held-item':'手中餐具尚未归还','physical-action':'正在完成备餐或送餐','cleaning':'正在清扫','player-action':'正在办理岗位工作','customer-order':'原客单尚未结束','original-order':'原客单尚未结束','meal':'正在用餐','toilet':'正在如厕','social':'正在交谈','player-tenure':'岗位由你正式独任'};
const money=n=>Number.isFinite(n)?`${n} 文`:'待核对';
const owned=s=>s?.owner?.ownerId==='player'&&s?.property?.ownerId==='player';
const sameOwner=(a,b)=>a?.owner?.ownerId===b?.owner?.ownerId&&a?.owner?.ownership===b?.owner?.ownership;
const sameIntent=(a,b)=>!!a&&!!b&&a.id===b.id&&a.provider===b.provider&&a.intentKey===b.intentKey&&a.kind===b.kind;

// The view is read-only. Every money/role action goes back through the manager,
// while onIntent may move the player to a real applicant before opening again.
export function createChinaTavernManagementUI({management,onIntent,onOpen=()=>{},isNearby=()=>true,notify=()=>{},document:doc=globalThis.document}) {
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!=null)e.textContent=String(text);if(cls)e.className=cls;return e;};
 const dialog=make('dialog',null,'cn-management-dialog ww-airy-theme ww-airy-panel'),style=make('style');
 dialog.setAttribute('aria-label','云来酒楼经营账');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.cn-management-dialog.ww-airy-panel{position:fixed;inset:var(--ww-ui-top,12px) var(--ww-ui-right,12px) var(--ww-ui-bottom,12px) var(--ww-ui-left,12px);margin:auto;width:min(780px,var(--ww-ui-width,calc(100vw - 24px)));height:min(490px,var(--ww-ui-height,calc(100dvh - 24px)));max-width:none;padding:18px 20px 12px;border:1px solid #d4e5dc;border-radius:20px 7px 20px 7px;background:linear-gradient(115deg,#f9f8ee,#eef6ee 72%,#eff2f8);color:#355e68;box-shadow:0 14px 42px #274b6426;font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif;line-height:1.4}
.cn-management-dialog::backdrop{background:#173b493d;backdrop-filter:blur(3px)}.cn-management-dialog *{box-sizing:border-box}.cn-management-dialog h2{font-family:inherit;font-size:21px;font-weight:600;letter-spacing:.08em;line-height:1.3}.cn-management-dialog h3{font-size:16px;font-weight:500;margin:0 0 6px}.cn-management-dialog p{font-size:12px;line-height:1.55;margin:5px 0}.cn-management-dialog button{min-height:44px;font-family:inherit;cursor:pointer;box-shadow:none}.cn-management-dialog button:disabled{opacity:.45;cursor:default}.cn-management-dialog .cn-management-close{position:absolute;right:8px;top:7px;width:44px;height:44px;border:0;background:transparent;color:#7b999b;font-size:26px}.cn-management-heading{display:flex;justify-content:space-between;align-items:center;gap:14px;padding-right:34px;margin-bottom:4px}.cn-management-balance{text-align:right;white-space:nowrap;font-size:11px;color:#789197}.cn-management-balance strong{display:block;font-size:22px;font-weight:500;color:#4e758e;font-variant-numeric:tabular-nums}.cn-management-tabs{display:flex;gap:4px;flex:0 0 auto;margin-bottom:10px;border-bottom:1px solid #d5e5dc}.cn-management-tabs button{flex:1;border:0;border-bottom:2px solid transparent;background:transparent;color:#789195;font-size:13px}.cn-management-tabs button[aria-pressed=true]{border-bottom-color:#89bbaa;background:#e6f1e980;color:#386b72}.cn-management-body{overflow:auto;min-width:0;padding:2px 2px 8px}.cn-management-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 18px;margin:2px 0 12px}.cn-management-metrics div{min-width:0}.cn-management-metrics dt{font-size:11px;color:#789195}.cn-management-metrics dd{margin:3px 0 0;font-size:23px;color:#4e758e;font-variant-numeric:tabular-nums}.cn-management-note{color:#789195}.cn-management-error{color:#a26b64!important}.cn-management-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cn-management-card{min-width:0;padding:12px 14px;background:#fffefa80;border:1px solid #dfebe2;border-radius:10px 3px 13px 3px}.cn-management-card+.cn-management-card{margin-top:10px}.cn-management-grid>.cn-management-card{margin:0}.cn-management-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.cn-management-controls{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}.cn-management-controls button{flex:1 1 auto;min-width:0;border:0;border-radius:0;padding:8px 10px;background:#e3eee7;color:#547b7b;font-size:12px}.cn-management-dialog .cn-management-controls .ww-airy-action{font-size:12px;letter-spacing:0;padding:8px 10px}.cn-management-person{font-size:14px;color:#4e758e}.cn-management-status{min-height:18px;margin:0!important;font-size:11px!important}.cn-management-actions{display:flex;gap:12px;align-items:center;padding-top:8px;border-top:1px solid #d5e5dc}.cn-management-actions p{flex:1}.cn-management-dialog .cn-management-actions button{width:auto;flex:0 0 auto;border:0;background:transparent;color:#6f898c;padding:7px 10px;font-size:12px}.cn-management-section-title{margin-top:16px!important}.cn-management-wage{white-space:nowrap;font-size:12px;color:#789195}
@media(max-width:560px){.cn-management-dialog.ww-airy-panel{padding:14px;height:min(620px,var(--ww-ui-height,calc(100dvh - 24px)))}.cn-management-heading{gap:6px}.cn-management-dialog h2{font-size:18px}.cn-management-balance strong{font-size:18px}.cn-management-grid{grid-template-columns:1fr}.cn-management-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cn-management-metrics dd{font-size:20px}.cn-management-row{gap:6px}.cn-management-actions{gap:5px}}
@media(max-height:500px){.cn-management-dialog.ww-airy-panel{padding:10px 18px 9px}.cn-management-dialog h2{font-size:18px}.cn-management-heading{margin-bottom:0}.cn-management-tabs{margin-bottom:5px}.cn-management-card{padding:8px 12px}.cn-management-metrics{gap:6px 14px}.cn-management-metrics dd{font-size:19px}.cn-management-actions{margin-top:4px;padding-top:4px}}
`;
 (doc.head||doc.body).append(style);doc.body.append(dialog);
 let generation=0,signature='',tab='account',selectedApplication=null,feedback='',feedbackError=false,disposed=false,acting=false,ownerContext='';
 const pendingPurchases=new Map();
 const read=()=>management.view();
 function hide(){generation++;if(dialog.open)dialog.close();}
 function button(label,run,disabled=false,cls='') {
  const e=make('button',label,cls),g=generation;e.type='button';e.disabled=disabled;
  e.onclick=()=>{if(!disposed&&!acting&&dialog.open&&g===generation&&!e.disabled)run();};return e;
 }
 function report(result,success,fallback) {
  const ok=result===true||result?.ok===true;feedbackError=!ok;
  const s=read(),code=result?.code||s.recruitment?.lastError||s.lastError;
  const blockers=(result?.blockers||[]).map(b=>blockerNames[typeof b==='string'?b:b.kind]).filter(Boolean);
  feedback=ok?success:(errors[code]||fallback||'账簿暂时无法核对，请稍后重试。');
  if(!ok&&blockers.length)feedback+=' '+[...new Set(blockers)].join('；')+'。';
  update(true);if(ok)notify(feedback);return ok;
 }
 function perform(view,run,success,fallback) {
  // Consuming the control first also covers a synchronous save callback that
  // reenters the same DOM button before its old node has been detached.
  generation++;acting=true;
  try {
   const live=read();
   if(!owned(live)||!sameOwner(view,live))return report({ok:false,code:'stale-owner'},success);
   if(live.loadError)return report({ok:false},success,'经营记录暂时无法核对，请保留存档。');
   if(!isNearby())return report({ok:false},success,'请回到酒楼账簿或应聘者身边办理。');
   return report(run(live),success,fallback);
  } catch {return report({ok:false},success,'这次操作未完成，请核对账簿后重试。');}
  finally {acting=false;}
 }
 function metric(list,label,value){const row=make('div');row.append(make('dt',label),make('dd',money(value)));list.append(row);}
 function account(body,s) {
  const p=s.property,b=s.business,metrics=make('dl',null,'cn-management-metrics');
  const trialUnpaid=Number.isFinite(b.trialEarned)&&Number.isFinite(b.trialPaid)?Math.max(0,b.trialEarned-b.trialPaid):null;
  metric(metrics,'可用经营款',p.availableBalance);metric(metrics,'工资待付 · 已保留',b.wagesPayable);metric(metrics,'试工预留',b.trialReserved);
  metric(metrics,'已挣未付',trialUnpaid===null?null:b.wagesPayable+trialUnpaid);metric(metrics,'库存食材成本',s.stock.inventoryValue);metric(metrics,'营业盈亏',p.operatingProfit);
  body.append(metrics,make('p',`营业实收 ${money(p.revenue)} · 已耗食材 ${money(p.materialConsumedCost)} · 已挣工钱 ${money(p.earnedLabor)}`),
   make('p',`已付伙计工资 ${money(b.paidWages)} · 已付试工 ${money(b.trialPaid)} · 采购支出 ${money(b.procurementCash)}`),
   make('p','盈亏按实收扣已耗食材与已挣工钱；库存采购只在耗用时计入成本。','cn-management-note'),
   make('p','可用经营款已扣工资与试工预留。注资、提款请到产权账办理。','cn-management-note'));
  if(trialUnpaid>0)body.append(make('p',`已完成试工尚待支付 ${money(trialUnpaid)}，应聘记录保留。`,'cn-management-error'));
 }
 function supplies(body,s) {
  const grid=make('div',null,'cn-management-grid');
  for(const dish of TAVERN_DISHES){
   const stock=s.stock.inventory?.[dish.id],unitCost=TAVERN_STOCK_COSTS.unitCosts[dish.id],card=make('section',null,'cn-management-card');
   card.append(make('h3',dish.name),make('p',`售价 ${dish.price} 文 · 每份食材 ${unitCost} 文`),make('p',`可用 ${stock?.available??'待核对'} 份 · 已留客单 ${stock?.reserved??'待核对'} 份`),make('p',`库存成本 ${money(stock?.value)} · 已耗 ${stock?.consumed??'待核对'} 份`,'cn-management-note'));
   const controls=make('div',null,'cn-management-controls');
   for(const quantity of [1,5]){
    const requestKey=`${s.owner.ownership}:${dish.id}:${quantity}`,request=pendingPurchases.get(requestKey)||{dishId:dish.id,quantity,operationId:`${s.purchaseOperationPrefix}:${dish.id}:${quantity}`};
    const buy=button(`补 ${quantity} 份 · ${unitCost*quantity} 文`,()=>perform(s,()=>{pendingPurchases.set(requestKey,request);const result=management.purchase(request);if(result?.ok===true)pendingPurchases.delete(requestKey);return result;},`${dish.name}已补入 ${quantity} 份。`),!owned(s)||!s.purchaseOperationPrefix||!Number.isFinite(s.property.availableBalance)||s.property.availableBalance<unitCost*quantity,'ww-airy-action');
    buy.setAttribute('aria-label',`${dish.name}补${quantity}份，${unitCost*quantity}文`);controls.append(buy);
   }
   card.append(controls);grid.append(card);
  }
  body.append(grid,make('p',`可用经营款 ${money(s.property.availableBalance)} · 采购由酒楼经营款支付。`,'cn-management-note'),make('p','先留足工资与试工款；食材不足时，新客单等待补货。','cn-management-note'));
 }
 function frozenIntent(s,intent,kind) {
  return perform(s,()=>{
   const current=management.intents().find(i=>sameIntent(i,intent));
   if(!current)return {ok:false,code:'stale-action'};
   return kind==='approve'||kind==='reject'?management.reviewApplication(intent.applicationId,kind==='approve'):management.executeIntent(intent);
  },{trial:'已安排两桌试工，完成后回来面谈。',pay:'已完成试工的12文已记入本人账。',approve:'已批准，待本人和原岗位安全交接后到岗。',reject:'已婉拒这次申请，等本人办完原事务后离开。'}[kind],
  '请与应聘者当面交谈；人在忙碌、坐下或视线受阻时，安排暂不生效。');
 }
 function approach(s,intent) {
  perform(s,()=>{
   if(!management.intents().some(i=>sameIntent(i,intent)))return {ok:false,code:'stale-action'};
   if(typeof onIntent!=='function')return false;
   const result=onIntent(intent);if(result===true||result?.ok===true)hide();return result;
  },'前往面谈处，到了再当面查看申请。','暂时无法前往，请走到应聘者身边再交谈。');
 }
 function staff(body,s) {
  for(const role of s.roles){
   const card=make('section',null,'cn-management-card'),row=make('div',null,'cn-management-row'),protectedRole=role.holderId==='player'||role.tenureHolderId==='player';
   const title=make('div');title.append(make('h3',roleNames[role.roleId]||'酒楼岗位'),make('p',protectedRole?'你正式任职 · 岗位独任':role.holderId?people[role.holderId]||'现任伙计':'空缺','cn-management-person'));
   row.append(title,make('span',`${role.wage} 文 / 全日`,'cn-management-wage'));card.append(row);
   if(role.holderId&&!protectedRole){const controls=make('div',null,'cn-management-controls');controls.append(button('办理离岗 · 腾出岗位',()=>perform(s,live=>{
    const next=live.roles.find(r=>r.roleId===role.roleId);
    if(!next||next.revision!==role.revision||next.holderId!==role.holderId)return {ok:false,code:'stale-action'};
    if(next.tenureHolderId==='player'||next.holderId==='player')return {ok:false,code:'player-tenure-owned'};
    return management.dismiss(role.roleId);
   },'已办妥离岗，岗位空出；本人仍在原世界生活。'),!owned(s)));card.append(controls);}
   if(!role.holderId)card.append(make('p',role.roleId==='cn-tavern-steward'?'有意愿且符合条件的来客可前来应聘。':'等待合格人选；空缺期间该岗位业务暂停。','cn-management-note'));
   body.append(card);
  }
  body.append(make('p','按06:00–18:00实际在岗时数折算；完整覆盖12小时另加1文，试工时间不计入。柜台接待24文为本次经营日薪。','cn-management-note'),make('h3','应聘与试工','cn-management-section-title'));
  const applications=[...s.applications].sort((a,b)=>Number(b.id===selectedApplication)-Number(a.id===selectedApplication)),intents=management.intents();
  if(!applications.length)body.append(make('p','暂无应聘。服务助理空缺时，有意愿的来客会先办完手头事务，再来面谈。','cn-management-note'));
  for(const application of applications){
   const c=s.recruitment.candidates?.find(c=>c.applicationId===application.id),card=make('section',null,'cn-management-card');card.setAttribute('data-panel-key',application.id);
   const status=application.status==='pending-safe-handoff'?'已批准 · 等安全交接':application.status==='assigned'?'已正式到岗':application.status==='rejected'?'已婉拒':application.status==='cancelled'?'申请已结束':phases[c?.phase]||'等候面谈';
   card.append(make('h3',`${application.actor.name} · ${roleNames[application.roleId]||'应聘'}`),make('p',status));
   const steps=application.trial?.work?.steps?.length??c?.steps?.length??0;
   if(application.trial?.request)card.append(make('p',`擦桌试工 ${steps}/2 桌 · 每桌实际擦拭5秒 · 酒楼支付12文`));
   else card.append(make('p','先实际擦拭两张餐桌，每桌5秒；酒楼支付12文试工报酬。','cn-management-note'));
   if(application.trial?.work)card.append(make('p',application.trial.payment?'试工合格 · 12文已支付':'试工合格 · 12文尚待支付',application.trial.payment?'cn-management-note':'cn-management-error'));
   if(application.status==='pending-safe-handoff')card.append(make('p','批准后仍须当面交接；原客单、餐具和岗位工作安全交清才会到岗。','cn-management-note'));
   const controls=make('div',null,'cn-management-controls'),ownApplication=owned(s)&&application.owner?.ownership===s.owner.ownership;
   for(const kind of ['inspect','trial','approve','pay','reject']){
    const intent=intents.find(i=>i.applicationId===application.id&&i.kind===kind);if(!intent)continue;
    const label={inspect:'前往当面交谈',trial:'请试做两桌 · 12文',approve:'批准 · 等交接',pay:'补付试工 · 12文',reject:'婉拒申请'}[kind];
    if(kind==='inspect'&&typeof onIntent!=='function')continue;
    const control=button(label,()=>kind==='inspect'?approach(s,structuredClone(intent)):frozenIntent(s,structuredClone(intent),kind),!ownApplication||kind==='trial'&&(!Number.isFinite(s.property.availableBalance)||s.property.availableBalance<12),kind==='approve'?'ww-airy-action':'');controls.append(control);
   }
   card.append(controls);body.append(card);
  }
 }
 function update(force=false) {
  if(disposed||!dialog.open&&!force)return;
  const s=read(),context=`${s.owner?.ownerId}:${s.owner?.ownership}`;
  if(ownerContext&&context!==ownerContext){feedback='产权已变化，请按当前业主记录办理。';feedbackError=true;selectedApplication=null;pendingPurchases.clear();}
  ownerContext=context;
  // Do not redraw every earned fraction of a second; only displayed accounting,
  // application phases and usable intents invalidate the panel and its controls.
  const key=JSON.stringify([context,s.loadError,tab,selectedApplication,feedback,feedbackError,s.purchaseOperationPrefix,s.property.balance,s.property.bank,s.property.availableBalance,s.property.revenue,s.property.earnedLabor,s.property.operatingProfit,s.property.materialConsumedCost,
   s.business.wagesPayable,s.business.trialReserved,s.business.trialEarned,s.business.trialPaid,s.business.paidWages,s.business.procurementCash,s.stock,s.roles,s.applications,s.recruitment.candidates?.map(c=>[c.applicationId,c.phase,c.steps?.length]),management.intents()]);
  if(!force&&key===signature)return;signature=key;generation++;
  const restoreView=preserveAiryPanelView(dialog,doc);dialog.replaceChildren();
  const x=button('×',hide,false,'cn-management-close');x.setAttribute('aria-label','收起经营账');
  const {header,body,actions}=createAiryPanelParts(doc);header.className+=' cn-management-heading';body.className+=' cn-management-body';actions.className+=' cn-management-actions';
  const title=make('div');title.append(make('h2','云来酒楼 · 经营'),make('p',`业主 ${s.property.ownerName||people[s.owner?.ownerId]||'待核对'} · 你的银行 ${money(s.property.bank)}`));
  const balance=make('div','经营余额','cn-management-balance');balance.append(make('strong',money(s.property.balance)));header.append(title,balance);
  const tabs=make('nav',null,'cn-management-tabs');tabs.setAttribute('aria-label','经营账栏目');
  for(const [id,label]of [['account','收支'],['stock','食材'],['staff','伙计与应聘']]){const b=button(label,()=>{tab=id;feedback='';feedbackError=false;update(true);});b.setAttribute('aria-pressed',String(tab===id));tabs.append(b);}
  const status=make('p',feedback||'收起账簿后，原有工作与申请继续保留。','cn-management-status'+(feedbackError?' cn-management-error':''));status.setAttribute('role','status');status.setAttribute('aria-live','polite');actions.append(status,button('收起',hide));
  dialog.append(x,header,tabs,body,actions);
  if(s.loadError)body.append(make('h3','经营账待核对'),make('p','经营记录暂时无法核对，请保留存档。','cn-management-error'));
  else if(!owned(s))body.append(make('h3','当前业主方可经营'),make('p','产权已不在你名下，经营安排未作更改。','cn-management-note'));
  else if(tab==='account')account(body,s);else if(tab==='stock')supplies(body,s);else staff(body,s);
  restoreView();
 }
 function show(context={}) {
  if(disposed||!isNearby())return false;
  selectedApplication=typeof context==='string'?context:context?.applicationId||context?.id||null;tab=selectedApplication?'staff':'account';feedback='';feedbackError=false;ownerContext='';onOpen();if(!dialog.open)dialog.showModal();update(true);return true;
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();hide();});
 return {show,hide,open:show,close:hide,update,refresh:update,isOpen:()=>!!dialog.open,dispose(){disposed=true;hide();dialog.remove();style.remove();}};
}
