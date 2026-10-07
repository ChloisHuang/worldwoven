import {PALACE_TEA_ROLE} from './china-palace-tea-role.js';
import {chinaPieceworkSkill,chinaPieceworkReview} from './china-piecework-career-proof.js';

// Read-only view. Every work button routes back to the source controller's
// physical intent; showing a progress row cannot complete or settle an order.
export function appendChinaPieceworkCareerPanel({panel,role,service,make,action,skills={},skillXP={},receipts=[]}){
 const state=service?.state?.()||{},order=state.order,tea=role.id===PALACE_TEA_ROLE.id;
 const receipt=receipts.filter(row=>row.roleId===role.id).at(-1),review=state.latestReview||chinaPieceworkReview(receipt);
 const skill=chinaPieceworkSkill(role.id),skillName=tea?'礼仪':'文书';
 const status=make('div',null,'career-shift-status');
 status.append(make('strong',state.label||(!state.shift?`未接班 · ${state.standInName||role.incumbentName}代管`:order?'原单服务进行中':'已接班 · 等待原单')),make('span','长期一席 · 每张完成原单8铜文'));
 panel.body.append(status);
 const rows=make('dl',null,'career-metrics'),metric=(label,value,detail='')=>{const row=make('div',null,'career-metric'),dd=make('dd');dd.append(make('strong',value));if(detail)dd.append(make('small',detail));row.append(make('dt',label),dd);rows.append(row);};
 metric(tea?'原茶客单':'原馆藏巡检',order?order.guestName||order.guestId||order.contract?.orderId||order.orderId||order.id||'原单处理中':'暂无进行中的原单',tea?'原杯、原托盘奉到原客；本人用毕后收洗归还':'六册原藏书逐册查验、整理、放回原位，再回原登记案');
 metric('原单报酬','8 铜文 / 单','原雇主按完整原单支付；候单、闲聊、阅读与未完成均不计酬');
 const income=state.income??receipts.filter(row=>row.roleId===role.id).reduce((sum,row)=>sum+row.amount,0);
 metric('累计入银行',`${income} 铜文`,'只记本人完成并实际入账的原单');
 metric('工作评价',review?review.reason||'原单已完整验收 +1':'暂无完成评价','真实完成并入账后绩效 +1，不授官品');
 metric('原单成长',`${skillName} ${skills[skill]??0}级 · ${skillXP[skill]??0} XP`,'每张完成原单10点经验，与读书共用该技能每日4次成长；重复结款不重复成长');
 panel.body.append(rows);
 if(Number.isFinite(state.progressTotal)&&state.progressTotal>0){const progress=make('progress');progress.max=state.progressTotal;progress.value=state.progressSeconds||0;progress.setAttribute('aria-label','原单实际工作进度');panel.body.append(progress);}
 if(state.loadError||state.lastError)panel.body.append(make('p',state.loadError?'原单与岗位存档待核对':'保存未完成，原单保留，可重试','career-negative'));
 for(const kind of service?.workChoices?.()||[]){if(['work-view','formal-view','formal-resign'].includes(kind))continue;const button=action(role,kind);if(button){button.className='career-current-action ww-airy-action';panel.actions.append(button);}}
 const details=make('details',null,'career-card-details');details.append(make('summary','岗位与原单账目'),make('p',role.duties));
 if(state.lastEvent)details.append(make('p',state.lastEvent));
 details.append(make('p',tea?'原来的免费闲聊仍然保留，不算有偿茶单。':'原来的自由阅读仍然保留，不算有偿馆藏巡检。'));
 if(!state.shift&&!order){const resign=action(role,'formal-resign');if(resign)details.append(resign);}
 panel.body.append(details);
}
