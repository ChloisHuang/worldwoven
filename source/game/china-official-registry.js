import {CHINA_COURT_OFFICIAL_RANKS} from './china-official-ranks.js';
import {CHINA_PERSONNEL_OFFICIALS_V1} from './china-personnel-records.js';

// This is a view of existing appointments, not a second vacancy ledger.
// Absence/death cannot invent a lawful successor or an executable head-office job.
export function chinaOfficialRegistry({careers, officials=[],state=careers.workState(),catalogue=careers.catalogue()}={}) {
  const clerk=catalogue.find(role=>role.id==='cn-court-clerk');
  const holder=state.loadError?null:careers.slotHolder('cn-court-clerk');
  const vacancy=!state.loadError&&Number.isSafeInteger(clerk?.vacancy)?clerk.vacancy:null;
  const rows=CHINA_COURT_OFFICIAL_RANKS.map(rank=>{
    const original=CHINA_PERSONNEL_OFFICIALS_V1.find(row=>row.actorId===rank.actorId);
    const live=officials.find(row=>row.actorId===rank.actorId);
    return {...rank,name:live?.name||original.name,
      status:live?.alive===false?'原任已故 · 接任尚未开放':live?.alive===true?'在任 · 无空缺':'现任状态待核 · 不受理接任',
      wage:Number.isSafeInteger(live?.wage)&&live.wage>=0?live.wage:null};
  });
  return {clerk,holder,vacancy,rows,loadError:state.loadError||null};
}

export function appendChinaOfficialRegistry({panel,make,registry}) {
  const section=make('section',null,'career-official-registry');section.setAttribute('data-panel-key','china-official-registry');
  section.append(make('h3','官职实缺与现任名册'));
  section.append(make('p',registry.vacancy===null?'录事编制暂不可核验':registry.holder==='player'?'录事一席由你任职 · 可在本页办理本品升任':`录事可申请空缺 ${registry.vacancy} 席 · 通过当面审核与原件宣读后任职`,'career-status-note'));
  const roster=make('details',null,'career-card-details');roster.setAttribute('data-panel-key','china-official-incumbents');
  const occupied=registry.rows.filter(row=>row.status==='在任 · 无空缺').length;
  roster.append(make('summary',`六个主职 · ${occupied}人在任 · 接任尚未开放`));
  for(const row of registry.rows){
    const item=make('section',null,'career-official-entry');item.setAttribute('data-office-id',row.actorId);
    item.append(make('h3',`${row.roleLabel} · ${row.gradeLabel}`),make('p',`${row.name} · ${row.status}`),
      make('p',`${row.wage===null?'本日新职责俸额待核':`本日新职责日俸 ${row.wage}文`} · 完成原职责后入银行`,'career-status-note'),make('p',row.responsibility));
    roster.append(item);
  }
  roster.append(make('p','主官暂时离案不产生空缺；现有主职尚无玩家接任工序。录事升品仍须本人实任履历、技能、逐次审核与宣读，不取得六官的主职权限。','career-status-note'));
  section.append(roster);panel.body.append(section);
}
