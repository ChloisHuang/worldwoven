import {EGYPT_ARCHIVE_ROLE} from './egypt-archive-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createEgyptArchiveEmployment(options){return createJapanServiceEmployment({...options,duty:options.archive,role:EGYPT_ARCHIVE_ROLE,provider:'egypt-archive-employment',reviewMethod:'recordEgyptArchiveReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'等阿赫完成原卷验收与手中事务再接班',begin:'已接原卷登记席。核记已验收原卷的编号，持同卷移至案右同号格收存。',finishWork:'请先收存原卷；未完可送回接待案后交回。',end:'登记席已交回，请阿赫核验本班工时。',meeting:'请在接待案前等候，阿赫完成原事务后回来办理。',actions:{'formal-view':'查看原卷登记岗位','formal-apply':'申请接待卷轴登记员','formal-review':'请阿赫审核职责与工钱','formal-resign':'办理登记员离职',accept:'接班 · 已验原卷登记',resume:'当面接回登记班',claim:'核验工时 · 工资入银行','end-shift':'当面交班 · 结算实际工时',cancel:'归还未存原卷 · 中断本班'}}});}
