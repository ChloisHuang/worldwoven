import {regionalTellerReport} from './regional-teller-audit-proof.js';
import {tellerAuditReview} from './regional-teller-career-proof.js';

export const tellerCurrencyUnit=currency=>({copper:'铜文',japan:'日本券',france:'法国券',egypt:'埃及券'}[currency]||'');
const transactionName=action=>({open:'开户',deposit:'存入银行',withdraw:'从银行取出',earn:'收入',wage:'工资入银行',reserve:'预留',settle:'实际结清',refund:'退回',exchange:'兑换',business:'经营收支',interest:'利息入银行'}[action]||action);
function appendAuditEvidence(root,order,make){
 const source=order.contract?.source,report=regionalTellerReport(source);
 if(!report){root.append(make('p','原账快照暂不可核验，请保留原单。','career-negative'));return;}
 const journal=[...source.legacyCopper.transactions,...source.transactions],index=order.stage==='check'?order.index:order.stage==='calculate'?order.calculationIndex:null;
 const current=Number.isInteger(index)?report.rows[index]:null;
 const balances=row=>`现金 ${row.cash} · 银行 ${row.bank} · 预留 ${row.held} · 总额 ${row.total}`;
 if(current){const active=make('section',null,'career-application-result');active.setAttribute('data-panel-key','regional-teller-current-row');active.append(make('strong',`${order.stage==='check'?'当前查账':'当前核算'} · ${tellerCurrencyUnit(current.currency)}`),make('p',balances(current)));root.append(active);}
 root.append(make('p',`原流水范围：${journal.length?journal[0].id+' 至 '+journal.at(-1).id:'暂无流水'} · 原记录 ${report.transactionCount} 笔 · 截至序号 ${report.throughTransaction}`,'career-status-note'));
 const full=make('details',null,'career-card-details');full.setAttribute('data-panel-key','regional-teller-frozen-balances');full.append(make('summary','查看签单时四币原余额与冻结款'));
 for(const row of report.rows){full.append(make('strong',tellerCurrencyUnit(row.currency)),make('p',balances(row)),make('p',`${row.accountOpened?'账户已开立':'账户未开立'} · 原冻结单：${row.reservationIds.join('、')||'无'}`,'career-status-note'));}
 root.append(full);
 const history=make('details',null,'career-card-details');history.setAttribute('data-panel-key','regional-teller-frozen-journal');history.append(make('summary',`查看全部原流水（${journal.length}笔）`));
 if(!journal.length)history.append(make('p','原账没有交易流水；四币余额与冻结款仍须逐项核验。'));
 for(const tx of journal){
  const currency=tx.currency||'copper',entry=make('section',null,'career-application-result');
  entry.append(make('strong',`${tx.id} · ${transactionName(tx.action)} · ${tx.amount} ${tellerCurrencyUnit(currency)}`),make('p',`原单号：${tx.requestId}`,'career-status-note'));
  if(tx.action==='exchange')entry.append(make('p',`原兑换：${tx.quote.amount} ${tellerCurrencyUnit(tx.quote.from)} → ${tx.quote.received} ${tellerCurrencyUnit(tx.quote.to)}`));
  if(tx.reservationId)entry.append(make('p',`对应预留单：${tx.reservationId}`));
  const affected=tx.action==='exchange'?[tx.quote.from,tx.quote.to]:[currency];
  for(const id of affected){const before=tx.before[id]||tx.before,after=tx.after[id]||tx.after;entry.append(make('p',`${tellerCurrencyUnit(id)}：现金 ${before.cash} → ${after.cash} · 银行 ${before.bank} → ${after.bank}`));}
  history.append(entry);
 }
 root.append(history);
}
// This panel is a read-only view. Work and handoff remain separate physical
// intents, so opening, refreshing or dismissing it cannot complete an audit.
export function appendRegionalTellerCareerPanel({panel,role,service,make,action,skills={},skillXP={},receipts=[]}){
 const state=service?.state?.()||{},order=state.order,shift=state.shift,unit=tellerCurrencyUnit(role.currency);
 const localReceipts=receipts.filter(row=>row.roleId===role.id),receipt=localReceipts.at(-1),review=state.latestReview||tellerAuditReview(receipt);
 const status=make('div',null,'career-shift-status');
 status.append(make('strong',state.label||(!service?'当前不在任职柜台 · 请返岗查看':!shift?`未接班 · ${state.standInName||role.incumbentName}代管`:order?'四币原账核验中':'已接班 · 等待当日原账')),make('span','长期一席 · 四国共用每日一单'));
 panel.body.append(status);
 const choices=(service?.workChoices?.()||[]).filter(kind=>!['work-view','formal-view','formal-resign'].includes(kind));
 const handoffKinds=new Set(['accept','end-shift']);
 const workKinds=choices.filter(kind=>!handoffKinds.has(kind));
 const pending=make('section',null,'career-table-orders');pending.setAttribute('data-panel-key','regional-teller-pending');pending.append(make('h3','当前待办'));
 const orderId=order?.contract?.orderId||order?.orderId||order?.id;
 if(order){
  const country=order.contract?.country||order.country||role.country,currency=order.contract?.currency||order.currency||role.currency;
  pending.append(make('p',orderId||'原账核验进行中'),make('p',`签单币种：${tellerCurrencyUnit(currency)} · ${country===role.country?'本柜台原合同':'原签单柜台合同'}保留`));
  if(Number.isInteger(order.index)&&Number.isInteger(order.calculationIndex))pending.append(make('p',`查账 ${order.index}/4 · 拨算 ${order.calculationIndex}/4 · ${order.recorded?'落记已完成':'落记待完成'} · 原工具待归还`));
  appendAuditEvidence(pending,order,make);
 }else pending.append(make('p',!service?'请返回任职柜台查看当前原单，再办理实际工作与交班。':shift?'本日同一原账在四国合计只核验一次；已由任一原柜员或玩家完成后，须等下一模拟日。':'录用后须主动请求交班；原柜员结束工作与餐厕后，才交出原工具。'));
 pending.append(make('p','铜文、日本券、法国券、埃及券均须逐项核对余额、冻结款与原流水；零活动币种也要核验。','career-status-note'));
 for(const kind of workKinds){const button=action(role,kind);if(button){button.className=kind==='abandon-original'?'career-withdraw':'career-current-action ww-airy-action';button.setAttribute('data-career-action',kind==='abandon-original'?'cancel-audit':'audit');pending.append(button);if(kind==='abandon-original')pending.append(make('p','取消将保留本日已领单记录，不付薪或经验；同日其他柜台也不能重领。','career-status-note'));}}
 if(Number.isFinite(state.progressTotal)&&state.progressTotal>0){const progress=make('progress');progress.max=state.progressTotal;progress.value=state.progressSeconds||0;progress.setAttribute('aria-label','四币原账实际核验进度');pending.append(progress);}
 panel.body.append(pending);
 const rows=make('dl',null,'career-metrics'),metric=(label,value,detail='')=>{const row=make('div',null,'career-metric'),dd=make('dd');dd.append(make('strong',value));if(detail)dd.append(make('small',detail));row.append(make('dt',label),dd);rows.append(row);};
 metric('原单报酬',`8 ${unit} / 单`,'同一本原账全世界每日一单，按签单柜台冻结币种付薪；候班、查看与未完成不计酬');
 const income=state.income??localReceipts.reduce((sum,row)=>sum+row.amount,0);
 metric('本岗入银行',`${income} ${unit}`,'只记本人完成并实际入账的原单，其他国家不重复领薪');
 metric('工作评价',review?review.reason||'四币原账已完整验收 +1':'暂无完成评价','实际归还原工具且原单入账后绩效 +1，不授官品');
 metric('文书成长',`文书 ${skills.writing??0}级 · ${skillXP.writing??0} XP`,'每张完成原单10点文书经验，与读书共用每日4次成长；重复结款不重复成长');
 panel.body.append(rows);
 if(state.loadError||state.lastError)panel.body.append(make('p',state.loadError?'原账与岗位存档待核对':'保存或交接尚未完成，原单保留，请核对当前待办','career-negative'));
 // Start/end shift never compete with the current original-work action.
 for(const kind of choices.filter(kind=>handoffKinds.has(kind))){const button=action(role,kind);if(button){button.className='career-current-action ww-airy-action';button.setAttribute('data-career-action','handoff');panel.actions.append(button);}}
 const details=make('details',null,'career-card-details');details.setAttribute('data-panel-key','regional-teller-details');details.append(make('summary','岗位与原账合同'),make('p',role.duties));
 if(state.lastEvent)details.append(make('p',state.lastEvent));
 details.append(make('p','只读原金融账目；原开户、存取、兑换继续独立办理。本岗不新增客户、借贷、投资或赠款。'));
 if(!shift&&!order){const resign=action(role,'formal-resign');if(resign)details.append(resign);}
 panel.body.append(details);
}
