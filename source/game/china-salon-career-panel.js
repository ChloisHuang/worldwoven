// Uses the existing handbook's panel and physical intent callbacks.
export function appendSalonCareerPanel({panel,role,service,make,action}){
 const s=service?.state(),status=make('div',null,'career-shift-status');status.append(make('strong',s?.label||'长期诗词台班'),make('span','长期台班 · 按场计酬'));panel.body.append(status);
 panel.body.append(make('p',s?.shift?'你在诗词台班当值。空闲可读书、休息或交班；谢绝邀约不记失职。':'尚未开班，由柳清弦代管。任职持续保留，下一班由你自主开始。'));
 if(s?.order){const o=s.order;panel.body.append(make('p',`${o.customerName} · ${o.request==='river'?'想听远行见闻':'想听归家心绪'} · 双方同意的价目 ${o.fee} 铜文`));if(o.stage==='reciting')panel.body.append(make('p','收起手册继续诵读，实际完成8秒后再回应题意。'));if(o.stage==='discussion')panel.body.append(make('p','来客问：刚才诵读的篇章，主要写远行见闻还是归家心绪？'));}
 const rows=make('dl',null,'career-metrics');
 const metric=(label,value,detail)=>{const row=make('div',null,'career-metric'),dd=make('dd');dd.append(make('strong',value));if(detail)dd.append(make('small',detail));row.append(make('dt',label),dd);rows.append(row);};
 metric('¤ 本场报价',`${s?.quote??6} 铜文`,'基础6文；艺术每5级加1文（最多2文），每3次契合题意的好评加1文（最多2文）。只向有余钱的原来客提供邀约机会。');
 metric('✓ 来客评价',s?.latestReview?`${s.latestReview.customerName} · ${s.latestReview.positive?'好评':s.latestReview.score===0?'一般':'待改进'}`:'暂无已完成客单',s?.latestReview?.reason||'选诗、完整诵读与回应题意均完成才有评价');
 metric('¤ 已入银行',`${s?.income??0} 铜文`,'由原来客钱包实际支付，逐场入账。未完成取消全退，无客单不生薪。');
 metric('◷ 台班范围','诗词一席','其他三位艺者保持原专长；没有占用NPC住房。普通茶叙不包含亲密或妊娠。');panel.body.append(rows);
 if(s?.lastEvent)panel.body.append(make('p',s.lastEvent,'career-status-note'));
 if(s?.loadError||s?.lastError)panel.body.append(make('p',s.loadError?'台班与原客款记录暂无法核对，请保留当前存档。':'上次办理未保存，可在原处重试。','career-negative'));
 for(const kind of service?.workChoices()||[]){if(kind==='work-view')continue;const button=action(role,kind);if(button){button.className='ww-airy-action';panel.actions.append(button);}}
}
