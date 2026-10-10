import {CHINA_COURT_OFFICIAL_RANKS} from './china-official-ranks.js';
import {CHINA_PERSONNEL_OFFICIALS_V1} from './china-personnel-records.js';

// This is a view of existing appointments, not a second vacancy ledger.
// Absence/death cannot invent a lawful successor or an executable head-office job.
export function chinaOfficialRegistry({careers, officials=[],state=careers.workState(),catalogue=careers.catalogue()}={}) {
  const clerk=catalogue.find(role=>role.id==='cn-court-clerk');
  const principal=careers.currentOfficialAppointment?.()?.officeId==='cn-official-justice';
  const holder=state.loadError?null:principal?'principal-player':careers.slotHolder('cn-court-clerk');
  const vacancy=!state.loadError&&Number.isSafeInteger(clerk?.vacancy)?clerk.vacancy:null;
  const rows=CHINA_COURT_OFFICIAL_RANKS.map(rank=>{
    const original=CHINA_PERSONNEL_OFFICIALS_V1.find(row=>row.actorId===rank.actorId);
    const live=officials.find(row=>row.actorId===rank.actorId);
    const principal=rank.actorId==='cn-official-justice'&&live?.appointment?.officeId===rank.actorId,open=rank.actorId==='cn-official-justice'&&live?.vacancy?.ok===true;
    return {...rank,name:principal?'你':live?.name||original.name,
      status:principal?'你已实任 · 原刑案亲核归档':open?'真实已故空缺 · 正六实任者可申请':rank.actorId==='cn-official-justice'&&live?.vacancy?.code==='principal-vacancy-consumed'?'前任接续已归档 · 再次补任待开放':live?.alive===false?'原任已故 · 接任尚未开放':live?.alive===true?'在任 · 无空缺':'现任状态待核 · 不受理接任',
      wage:principal?rank.currentWage:Number.isSafeInteger(live?.wage)&&live.wage>=0?live.wage:null};
  });
  return {clerk,holder,vacancy,rows,loadError:state.loadError||null};
}

export function appendChinaOfficialRegistry({panel,make,registry}) {
  const section=make('section',null,'career-official-registry');section.setAttribute('data-panel-key','china-official-registry');
  section.append(make('h3','官职实缺与现任名册'));
  section.append(make('p',registry.vacancy===null?'录事编制暂不可核验':registry.holder==='principal-player'?'原录事履历已保留 · 你现任刑名主官':registry.holder==='player'?'录事一席由你任职 · 可在本页办理本品升任':`录事可申请空缺 ${registry.vacancy} 席 · 通过当面审核与原件宣读后任职`,'career-status-note'));
  const roster=make('details',null,'career-card-details');roster.setAttribute('data-panel-key','china-official-incumbents');
  const occupied=registry.rows.filter(row=>row.status==='在任 · 无空缺').length;
  roster.append(make('summary',`六个主职 · ${occupied}名原任在任 · 刑名主职按真实空缺受理`));
  for(const row of registry.rows){
    const item=make('section',null,'career-official-entry');item.setAttribute('data-office-id',row.actorId);
    item.append(make('h3',`${row.roleLabel} · ${row.gradeLabel}`),make('p',`${row.name} · ${row.status}`),
      make('p',`${row.wage===null?'本日新职责俸额待核':`本日新职责日俸 ${row.wage}文`} · 完成原职责后入银行`,'career-status-note'),make('p',row.responsibility));
    roster.append(item);
  }
  roster.append(make('p','主官暂时离案不产生空缺。刑名主官仅在原任有真实已故记录时受理：正六品实任履历、技能达标，陆谦核荐、皇帝阅批并宣读原件后接任。其余五个主职接任尚未开放。','career-status-note'));
  section.append(roster);panel.body.append(section);
}
