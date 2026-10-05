import {SALON_MIN_FEE} from './china-salon-pricing.js';
// Compact live work card within the existing handbook and physical intents.
export function appendSalonCareerPanel({panel,role,service,make,action}){
 const s=service?.state(),o=s?.order,review=s?.latestReview;
 const status=make('div',null,'career-shift-status');status.append(make('strong',!s?.shift?'未开班 · 柳清弦代管':!o?'自由候客':({approaching:'来客赴约中',offered:'等待你的答复',escort:'前往雅间',choose:'请选择篇章',reciting:'诵读中',discussion:'请回应题意',ready:'本场完成 · 待结款'})[o.stage]),make('span','长期台班 · 按场计酬'));panel.body.append(status);
 const rows=make('dl',null,'career-metrics');
 const metric=(label,value)=>{const row=make('div',null,'career-metric'),dd=make('dd');dd.append(make('strong',value));row.append(make('dt',label),dd);rows.append(row);};
 metric('来客',o?.customerName||'暂无邀约');metric('题意',o?o.request==='river'?'远行见闻':'归家心绪':'—');
 metric('本场报价',`${o?.fee??s?.quote??SALON_MIN_FEE} 铜文`);metric('累计入账',`${s?.income??0} 铜文`);
 metric('最近评价',review?`${review.customerName} · ${review.positive?'好评':review.score===0?'一般':'待改进'}`:'暂无');panel.body.append(rows);
 if(o?.stage==='reciting'){const progress=make('progress');progress.max=8;progress.value=s.progressSeconds;progress.setAttribute('aria-label','实际诵读进度');progress.style.width='100%';panel.body.append(progress,make('p',`${Math.floor(s.progressSeconds)} / 8 秒`,'career-status-note'));}
 if(o?.stage==='discussion')panel.body.append(make('p','“刚才这篇，主要写的是什么？”'));
 if(s?.loadError||s?.lastError)panel.body.append(make('p',s.loadError?'账目待核对':'保存未完成 · 可重试','career-negative'));
 const choices=(service?.workChoices()||[]).filter(k=>!['work-view','formal-resign','decline'].includes(k)&&(k!=='end-shift'||!o));
 for(const kind of choices){const button=action(role,kind);if(button){button.className='career-current-action ww-airy-action';panel.actions.append(button);}}
 if(o&&o.stage!=='ready'){const decline=action(role,'decline',o.stage==='offered'?'婉拒邀约':'取消本场 · 退还客款');if(decline)panel.actions.append(decline);}
 const details=make('details',null,'career-card-details');details.append(make('summary','台班与账目'));
 if(review)details.append(make('p',review.reason));
 details.append(make('p',s?.shift?'本席由你当值 · 可自由交班':'本席由你任职 · 柳清弦代管'));
 if(!o)details.append(make('p','无客不计酬'));
 for(const kind of s?.shift?o&&o.stage!=='ready'?['end-shift']:[]:['formal-resign']){const button=action(role,kind);if(button)details.append(button);}
 panel.body.append(details);
}
