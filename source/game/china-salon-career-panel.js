import {SALON_MIN_FEE} from './china-salon-pricing.js';
import {salonBeatLabel} from './china-salon-career-services.js';
// Compact live work card within the existing handbook and physical intents.
export function appendSalonCareerPanel({panel,role,service,make,action}){
 const s=service?.state(),o=s?.order,review=s?.latestReview,piece=s?.piece;
 const standIn=role.incumbentName||'原艺者',status=make('div',null,'career-shift-status');status.append(make('strong',!s?.shift?'未开班 · '+standIn+'代管':!o?'自由候客':({approaching:'来客赴约中',offered:'等待你的答复',escort:'前往雅间',choose:'请选择内容',reciting:'诵读中',narrating:'故事讲述中',discussion:role.activity==='story'?'请说明人物行动缘由':'请回应题意',rhythm:'请选择下一拍',beat:'正在演绎本拍',chess:'检查棋子气与落子',ready:'本场完成 · 待结款'})[o.stage]),make('span',role.specialty+'长期台班 · 按场计酬'));panel.body.append(status);
 const rows=make('dl',null,'career-metrics');
 const metric=(label,value)=>{const row=make('div',null,'career-metric'),dd=make('dd');dd.append(make('strong',value));row.append(make('dt',label),dd);rows.append(row);};
 metric('来客',o?.customerName||'暂无邀约');metric('来意',s?.requestName||'—');
 metric('本场报价',`${o?.fee??s?.quote??SALON_MIN_FEE} 铜文`);metric('累计入账',`${s?.income??0} 铜文`);
 metric('最近评价',review?`${review.customerName} · ${review.positive?'好评':review.score===0?'一般':'待改进'}`:'暂无');panel.body.append(rows);
 if(piece){panel.body.append(make('p',piece.name),make('p',piece.text));}
 if(s?.progressTotal){const progress=make('progress');progress.max=s.progressTotal;progress.value=s.progressSeconds;progress.setAttribute('aria-label','实际'+(o.stage==='beat'?'本拍演绎':o.stage==='narrating'?'故事讲述':'诵读')+'进度');progress.style.width='100%';panel.body.append(progress,make('p',`${s.progressSeconds.toFixed(1)} / ${s.progressTotal} 秒`,'career-status-note'));}
 if(piece?.pattern)panel.body.append(make('p','曲谱：'+piece.pattern.map(salonBeatLabel).join(' · ')),make('p','已完成：'+(o.beats?.map(salonBeatLabel).join(' · ')||'尚未开始')));
 if(piece?.board){const board=o.move?.board||piece.board,grid=make('div',null,'salon-career-board');grid.setAttribute('aria-label','三行三列围棋小题，黑先，空点可落子');grid.style.display='grid';grid.style.gridTemplateColumns='repeat(3, 48px)';grid.style.gap='3px';for(const value of board){const cell=make('span',value==='B'?'●':value==='W'?'○':'＋');cell.style.textAlign='center';cell.style.fontSize='24px';cell.style.background='#e8d9b9';grid.append(cell);}panel.body.append(grid,make('p','黑● 白○；空点＋。落子按钮按棋盘方位标注。'));if(o.move)panel.body.append(make('p',`实际结果：提白子${o.move.captured}颗；中央黑子${o.move.liberties}口气。`));}
 if(o?.stage==='discussion')panel.body.append(make('p',role.activity==='story'?piece.question:'刚才这篇，主要写的是什么？'));
 if(s?.loadError||s?.lastError)panel.body.append(make('p',s.loadError?'账目待核对':'保存未完成 · 可重试','career-negative'));
 const choices=(service?.workChoices()||[]).filter(k=>!['work-view','formal-resign','decline'].includes(k)&&(k!=='end-shift'||!o));
 for(const kind of choices){const button=action(role,kind);if(button){button.className='career-current-action ww-airy-action';panel.actions.append(button);}}
 if(o&&o.stage!=='ready'){const decline=action(role,'decline',o.stage==='offered'?'婉拒邀约':'取消本场 · 退还客款');if(decline)panel.actions.append(decline);}
 const details=make('details',null,'career-card-details');details.append(make('summary','台班与账目'));
 if(review)details.append(make('p',review.reason));
 details.append(make('p',s?.shift?'本席由你当值 · 可自由交班':`本席由你任职 · ${standIn}代管`));
 if(!o)details.append(make('p','无客不计酬'));
 for(const kind of s?.shift?o&&o.stage!=='ready'?['end-shift']:[]:['formal-resign']){const button=action(role,kind);if(button)details.append(button);}
 panel.body.append(details);
}
