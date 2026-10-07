import {PERFORMANCE_ACTIVITIES,PERFORMANCE_DRINKS} from './japan-performance-cast.js';
import {japanPerformanceSkill} from './japan-performance-role.js';

// Physical action dispatch stays in the employment controller. This panel is
// read-only and never synthesizes an invitation, payment, or completed service.
export function appendJapanPerformanceCareerPanel({panel,role,service,make,action,skills={},skillXP={}}){
 const s=service?.state?.(),o=s?.order,review=s?.latestReview,standIn=role.incumbentName;
 const labels={offered:'等待你的答复',approaching:'原来客赴约中',accepted:'已接受 · 前往服务位置',seating:'请到原席位就位',escort:'前往原茶席',choose:'原来客已入座 · 前往工作点开始',prepare:'原吧台备饮中',preparing:'备饮中',prepared:'原饮品已备好',carrying:'送饮中',serving:'当面奉饮',drinking:'原来客饮用中',performing:'现场演艺中',ready:'服务完成 · 待原单入账',completed:'本场已完成'};
 const status=make('div',null,'career-shift-status');
 status.append(make('strong',!s?.shift?'未开班 · '+standIn+'代管':s?.label||(o?labels[o.stage]||'服务进行中':'自由候客 · 无客不计酬')),make('span','长期一席 · 按真实完成客单计酬'));panel.body.append(status);
 const rows=make('dl',null,'career-metrics'),metric=(label,value,detail='')=>{const row=make('div',null,'career-metric'),dd=make('dd');dd.append(make('strong',value));if(detail)dd.append(make('small',detail));row.append(make('dt',label),dd);rows.append(row);};
 const activity=PERFORMANCE_ACTIVITIES[o?.activity]?.name||PERFORMANCE_DRINKS.find(d=>d.id===o?.drink)?.name||'等待原来客自愿邀约';
 const prices=role.activities.flatMap(id=>id==='drink'?PERFORMANCE_DRINKS.map(d=>`${d.name}${d.fee}券`):[`${PERFORMANCE_ACTIVITIES[id].name}${PERFORMANCE_ACTIVITIES[id].fee}券`]).join(' · ');
 metric('原来客',o?.customerName||'暂无邀约',activity);
 metric('本场客款',o?`${o.fee??o.amount??s?.quote??role.wage} 日本券`:'未产生',prices);
 metric('累计入银行',`${s?.income??0} 日本券`,'完成后由原来客已有资金支付；空班与未完成不计酬');
 metric('最近服务',review?`${review.customerName} · ${review.reason||'原服务已完成'}`:'暂无完成记录');
 const skill=japanPerformanceSkill(o?.activity||role.activity),name={ritual:'礼仪',art:'艺术',writing:'文书'}[skill];
 metric('服务成长',`${name} ${skills[skill]??0}级 · ${skillXP[skill]??0} XP`,'真实原单完成并入账后10点经验，与读书共用每日4次成长；重复结款不重复成长');
 panel.body.append(rows);
 if(s?.progressTotal){const progress=make('progress');progress.max=s.progressTotal;progress.value=s.progressSeconds||0;progress.setAttribute('aria-label','实际演艺或饮品服务进度');panel.body.append(progress,make('p',`${(s.progressSeconds||0).toFixed(1)} / ${s.progressTotal} 秒`,'career-status-note'));}
 if(s?.loadError||s?.lastError)panel.body.append(make('p',s.loadError?'原客款与岗位存档待核对':'保存未完成 · 原单保留，可重试','career-negative'));
 const choices=service?.workChoices?.()||[];
 for(const kind of choices.filter(kind=>!['work-view','formal-view','formal-resign'].includes(kind))){const button=action(role,kind);if(button){button.className='career-current-action ww-airy-action';panel.actions.append(button);}}
 const details=make('details',null,'career-card-details');details.append(make('summary','台班与原单账目'),make('p',role.duties));
 if(s?.lastEvent)details.append(make('p',s.lastEvent));
 if(!s?.shift&&!o){const resign=action(role,'formal-resign');if(resign)details.append(resign);}
 panel.body.append(details);
}
