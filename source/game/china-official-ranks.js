// Ming-inspired grade names for Worldwoven's fictional court. Offices and
// copper pay are game design, not a reconstruction of historical offices/pay.
// A catalogue grade never grants an appointment, promotion or new authority.
export const CHINA_OFFICIAL_RANK_CONTEXT = '正从品秩启发的架空朝廷；官职、职责与俸额为游戏配置，非同名史职复原';

// Identity order and display order are separate. Never sort the physical court
// roster: its indices also own desks, rooms, costumes and navigation lanes.
const numerals = ['一','二','三','四','五','六','七','八','九'];
export const CHINA_OFFICIAL_GRADES = Object.freeze(numerals.flatMap((label, index) => [
  Object.freeze({gradeId:`cn-grade-${index+1}-regular`,gradeLabel:`正${label}品`,gradeOrder:index*2+1}),
  Object.freeze({gradeId:`cn-grade-${index+1}-junior`,gradeLabel:`从${label}品`,gradeOrder:index*2+2}),
]));
const grades = new Map(CHINA_OFFICIAL_GRADES.map(grade => [grade.gradeId, grade]));
export const getChinaOfficialGrade = gradeId => grades.get(gradeId) || null;

// Immutable V1 salary schedule. Retain this version when future policies are
// added: saved daily contracts must always replay at their original amount.
// Entry 18/22 is unchanged; wider upper increments express court responsibility.
export const CHINA_OFFICIAL_GRADE_PAY_POLICY_ID = 'cn-official-grade-v1';
export const CHINA_OFFICIAL_GRADE_PAY_V1 = Object.freeze({
  'cn-grade-9-junior':18, 'cn-grade-9-regular':22,
  'cn-grade-8-junior':26, 'cn-grade-8-regular':30,
  'cn-grade-7-junior':34, 'cn-grade-7-regular':38,
  'cn-grade-6-junior':42, 'cn-grade-6-regular':48,
  'cn-grade-5-junior':56, 'cn-grade-5-regular':64,
  'cn-grade-4-junior':76, 'cn-grade-4-regular':88,
  'cn-grade-3-junior':104,'cn-grade-3-regular':120,
  'cn-grade-2-junior':144,'cn-grade-2-regular':168,
  'cn-grade-1-junior':200,'cn-grade-1-regular':240,
});

// These three player grades have bounded, witnessed appointment paths.
// The complete pay table does not open higher offices or waive real service.
export const CHINA_RECORDS_CAREER_RANKS = Object.freeze([
  {rankId:'cn-records-junior',title:'礼务录事',gradeId:'cn-grade-9-junior',basePay:18,nextRankId:'cn-records-regular'},
  {rankId:'cn-records-regular',title:'礼务录事',gradeId:'cn-grade-9-regular',basePay:22,nextRankId:'cn-records-personnel'},
  {rankId:'cn-records-personnel',title:'吏务核籍录事',gradeId:'cn-grade-8-junior',basePay:26,nextRankId:null},
].map(rank => Object.freeze({...rank,...getChinaOfficialGrade(rank.gradeId)})));
const recordsRanks = new Map(CHINA_RECORDS_CAREER_RANKS.map(rank => [rank.rankId, rank]));
export const getChinaRecordsCareerRank = rankId => recordsRanks.get(rankId) || null;

// Freeze V1's six appointment grades separately from future live assignments.
export const CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1 = Object.freeze({
  'cn-minister-works':'cn-grade-2-regular',
  'cn-minister-granary':'cn-grade-3-regular',
  'cn-official-rites':'cn-grade-4-regular',
  'cn-official-personnel':'cn-grade-5-regular',
  'cn-official-justice':'cn-grade-2-regular',
  'cn-official-records':'cn-grade-7-regular',
});

// Original pre-policy contracts retain 24 (or their saved explicit actor rate).
// Do not replace this legacy default with a current catalogue wage.
export const CHINA_OFFICIAL_DAILY_WAGE = 24;
export const CHINA_COURT_OFFICIAL_RANKS = Object.freeze([
  {actorId:'cn-minister-works',roleLabel:'工务主官',gradeId:'cn-grade-2-regular',responsibility:'审核本部门实据、监督工务执行并向皇帝复奏',implemented:'原编号清扫令的呈奏、奉准实地核验与复奏',remaining:'完整工程派工、部门预算与下属考核'},
  {actorId:'cn-minister-granary',roleLabel:'仓务总管',gradeId:'cn-grade-3-regular',responsibility:'钱粮审核、仓务核对与部门回报',implemented:'原案核对已付俸据、具名奏报与皇帝收讫；本人朝会归档另行计薪',remaining:'真实仓储收发、存量及其他钱粮审核链'},
  {actorId:'cn-official-rites',roleLabel:'礼仪主管',gradeId:'cn-grade-4-regular',responsibility:'礼制、朝仪与相关任职审核',implemented:'朝会、录事入职与从九升正九的当面审核',remaining:'更高阶实职任命与完整礼制事务'},
  {actorId:'cn-official-personnel',roleLabel:'吏务主管',gradeId:'cn-grade-5-regular',responsibility:'官员考核与值勤名册管理',implemented:'朝会与本人归档；值勤名册目前为日常动作',remaining:'真实考核、人员名册变更与任免工序'},
  {actorId:'cn-official-justice',roleLabel:'刑名主官',gradeId:'cn-grade-2-regular',responsibility:'部门裁决、案件审核与问责',implemented:'朝会与本人归档；真实已报案件的交办、实据复核与具名意见归档',remaining:'完整审理与裁决权限链；现有复核不追加刑罚'},
  {actorId:'cn-official-records',roleLabel:'文书承办官',gradeId:'cn-grade-7-regular',responsibility:'编号来文、拟稿与归档，不授部门裁决权',implemented:'朝会与本人归档；来文和案卷目前为日常动作',remaining:'本人编号来文、拟稿与交接工序；不等同Wen原稿'},
].map(rank => Object.freeze({...rank,...getChinaOfficialGrade(rank.gradeId),
  currentWage:CHINA_OFFICIAL_GRADE_PAY_V1[rank.gradeId],payPolicyId:CHINA_OFFICIAL_GRADE_PAY_POLICY_ID,automaticPromotion:false})));
export const CHINA_COURT_OFFICIAL_DAILY_WAGES = Object.freeze(Object.fromEntries(
  CHINA_COURT_OFFICIAL_RANKS.map(rank => [rank.actorId, rank.currentWage])));
const courtRanks = new Map(CHINA_COURT_OFFICIAL_RANKS.map(rank => [rank.actorId, rank]));
export const getChinaCourtOfficialRank = actorId => courtRanks.get(actorId) || null;
