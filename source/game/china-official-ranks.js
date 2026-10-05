// Ming-inspired rank names, with fictional posts and copper pay chosen for
// Worldwoven. These assignments are not a reconstruction of historical offices
// or historical salaries. Rank never grants an appointment by itself.
export const CHINA_OFFICIAL_RANK_CONTEXT = '明制品秩启发的架空官署；岗位泛称与俸额为游戏配置，非同名史职复原';

// Smaller gradeOrder sorts first in a handbook. Do not use it to reorder the
// audience roster: that order also owns desks, rooms, costumes and route lanes.
export const CHINA_OFFICIAL_GRADES = Object.freeze([
  {gradeId: 'cn-grade-6-junior', gradeLabel: '从六品', gradeOrder: 12},
  {gradeId: 'cn-grade-7-regular', gradeLabel: '正七品', gradeOrder: 13},
  {gradeId: 'cn-grade-7-junior', gradeLabel: '从七品', gradeOrder: 14},
  {gradeId: 'cn-grade-8-regular', gradeLabel: '正八品', gradeOrder: 15},
  {gradeId: 'cn-grade-8-junior', gradeLabel: '从八品', gradeOrder: 16},
  {gradeId: 'cn-grade-9-regular', gradeLabel: '正九品', gradeOrder: 17},
  {gradeId: 'cn-grade-9-junior', gradeLabel: '从九品', gradeOrder: 18},
].map(Object.freeze));
const grades = new Map(CHINA_OFFICIAL_GRADES.map(grade => [grade.gradeId, grade]));
export const getChinaOfficialGrade = gradeId => grades.get(gradeId) || null;

// Only these two player clerk grades are implemented. The career controller
// owns service, review and appointment requirements; this catalogue is data.
export const CHINA_RECORDS_CAREER_RANKS = Object.freeze([
  {rankId: 'cn-records-junior', title: '礼务录事', gradeId: 'cn-grade-9-junior', basePay: 18, nextRankId: 'cn-records-regular'},
  {rankId: 'cn-records-regular', title: '礼务录事', gradeId: 'cn-grade-9-regular', basePay: 22, nextRankId: null},
].map(rank => Object.freeze({...rank, ...getChinaOfficialGrade(rank.gradeId)})));
const recordsRanks = new Map(CHINA_RECORDS_CAREER_RANKS.map(rank => [rank.rankId, rank]));
export const getChinaRecordsCareerRank = rankId => recordsRanks.get(rankId) || null;

// R96's six incumbent accounts retain the configured 24 copper per completed
// day. Their labels do not reprice wages or generate promotion/back pay.
export const CHINA_OFFICIAL_DAILY_WAGE = 24;
export const CHINA_COURT_OFFICIAL_RANKS = Object.freeze([
  {actorId: 'cn-minister-works', roleLabel: '工部官', gradeId: 'cn-grade-7-regular'},
  {actorId: 'cn-minister-granary', roleLabel: '仓务官', gradeId: 'cn-grade-7-junior'},
  {actorId: 'cn-official-rites', roleLabel: '礼仪官', gradeId: 'cn-grade-8-regular'},
  {actorId: 'cn-official-personnel', roleLabel: '吏务官', gradeId: 'cn-grade-8-junior'},
  {actorId: 'cn-official-justice', roleLabel: '刑名官', gradeId: 'cn-grade-6-junior'},
  {actorId: 'cn-official-records', roleLabel: '文书官', gradeId: 'cn-grade-9-regular'},
].map(rank => Object.freeze({...rank, ...getChinaOfficialGrade(rank.gradeId),
  currentWage: CHINA_OFFICIAL_DAILY_WAGE, payPolicyId: 'cn-official-r96-v1', automaticPromotion: false})));
export const CHINA_COURT_OFFICIAL_DAILY_WAGES = Object.freeze(Object.fromEntries(
  CHINA_COURT_OFFICIAL_RANKS.map(rank => [rank.actorId, rank.currentWage])));
const courtRanks = new Map(CHINA_COURT_OFFICIAL_RANKS.map(rank => [rank.actorId, rank]));
export const getChinaCourtOfficialRank = actorId => courtRanks.get(actorId) || null;
