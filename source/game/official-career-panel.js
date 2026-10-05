import {getChinaRecordsCareerRank,CHINA_OFFICIAL_RANK_CONTEXT,CHINA_COURT_OFFICIAL_RANKS} from './china-official-ranks.js';
const stageText={submitted:'待沈叙当面考核','document-ready':'考核通过 · 待领文','document-held':'文书在手 · 待宣读',approved:'授任已生效','promotion-review-rejected':'当面考核未通过',withdrawn:'已撤回','appointment-ended':'离任终止申请'};
const reasonText={'service-days-required':'需3日合格朝班与归档','tenure-days-required':'本次任职需满3日','service-performance-required':'本任考语净值需达3','promotion-duty-unsettled':'先完成本班并结清工资','promotion-applied-today':'今日已申请 · 次日可再试','ritual-required':'礼仪需2级','writing-required':'文书需2级','promotion-route-complete':'更高实职路线尚未开放'};
export function appendOfficialPromotionPanel({careers,role,panel,metric,make,action,buttonFor}){
 const summary=careers.promotionSummary?.();if(!summary?.rank)return;
 const pending=summary.application?.status==='pending',available=careers.promotionAvailability(),r=summary.application,next=getChinaRecordsCareerRank(summary.rank.nextRankId);
 metric('◇ 官品',summary.rank.gradeLabel,summary.rank.title+' · 明制启发架空岗位');
 metric('▣ 实任资历',`${summary.qualifiedDays} / 3 合格日`,`本次任职 ${summary.tenureDays}日 · 考语净值 ${summary.balance} / 3 · 历任合格 ${summary.lifetimeQualifiedDays}日`);
 metric('↗ 升阶',r?stageText[r.code]||stageText[r.stage]||r.code:next?`${summary.rank.gradeLabel} → ${next.gradeLabel}`:'正九品路线已完成',pending?summary.eligible?'达标仍须当面考核、领文并宣读':summary.reasons.map(c=>reasonText[c]||c).join('；'):next?available.ok?'已获审核资格 · 通过后新班22–24文':available.reasons.map(c=>reasonText[c]||c).join('；'):'更高官职需新的实职与资历路线');
 if(!pending&&available.ok){const b=action(role,'promotion-apply','向沈叙申请升正九品');if(b){b.className='career-current-action ww-airy-action';panel.actions.append(b);}}
 if(pending){const detail=make('details',null,'career-card-details');detail.append(make('summary','升阶条件与申请'));
  detail.append(make('p','本任从九品至少3个不同模拟日朝会与归档合格，实任满3日、考语净值≥3，礼仪/文书各2级。未结班或待薪时先结清。'));
  const cancel=buttonFor('撤回升阶申请',()=>{careers.cancelPromotion(r.id);});cancel.className='career-withdraw';detail.append(cancel);panel.body.append(detail);
 }
}
export function appendOfficialCareerHistory({careers,panel,make}){
 const ledger=careers.state().officialCareer;if(!ledger?.appointments.length)return;
 const details=make('details',null,'career-card-details career-employment-history');details.append(make('summary','官品与实任履历'));
 for(const a of ledger.appointments){const rows=ledger.service.filter(s=>s.appointmentId===a.id),promotions=ledger.applications.filter(r=>r.appointmentId===a.id),promoted=promotions.find(r=>r.status==='approved');
  details.append(make('p',`第${a.tenure.sinceDay+1}日起 · 礼务录事 · ${a.endedAt?`第${a.endedAt.day+1}日离任`:'在任'} · ${promoted?'正九品':'从九品'} · 已记合格 ${rows.filter(r=>r.positive).length}日`));
  for(const r of rows)details.append(make('p',`第${r.day+1}日 · ${getChinaRecordsCareerRank(r.rankId).gradeLabel} · ${r.positive?'朝班与归档合格':'当班未完成'} · 考语 ${r.score>0?'+':''}${r.score} · 核薪${r.wage}文`));
  for(const r of promotions)details.append(make('p',`第${r.day+1}日申请正九品 · ${stageText[r.code]||stageText[r.stage]||r.code}${r.review?` · 沈叙已当面考核${r.review.passed?'通过':'未通过'}`:''}${r.status==='approved'?` · 第${r.decidedAt.day+1}日宣读生效`:''}`));
 }
 details.append(make('p','只累计存档中逐日真实履职回执；旧档只接已有末次证据，不把学习或旧成长值换成任职日。离任履历保留，新任期从初阶重新积累。'));
 details.append(make('p',CHINA_OFFICIAL_RANK_CONTEXT));
 details.append(make('p',CHINA_COURT_OFFICIAL_RANKS.slice().sort((a,b)=>a.gradeOrder-b.gradeOrder).map(r=>`${r.roleLabel} ${r.gradeLabel}`).join(' · ')));
 details.append(make('p','六官现用原统一值勤俸24文；自动升迁与品级差异俸尚未接入。帝位另走继位、投票或夺权规则，当前未开放。'));
 panel.body.append(details);
}
