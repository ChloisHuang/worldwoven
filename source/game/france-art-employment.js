import {FRANCE_ART_ROLE} from './france-art-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createFranceArtEmployment(options){return createJapanServiceEmployment({...options,duty:options.art,role:FRANCE_ART_ROLE,provider:'france-art-employment',reviewMethod:'recordFranceArtReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'等卢西安结束原事务再接画坊',begin:'已接画坊。在职业手册选择题材与光色，领画布与颜料、描稿上色，再携原画归档陈列。',finishWork:'请先完成原画；未完可把原画送回工案后交回。',end:'原画坊已交回，请卢西安核验本班工时。',meeting:'请在工案旁稍候，卢西安处理完原事务后回来办理。',actions:{'formal-view':'查看宫苑原画师岗位','formal-apply':'申请宫苑原画师','formal-review':'请卢西安审核职责与工钱','formal-resign':'办理画师离职',accept:'接班 · 原画展览',resume:'当面接回原班',claim:'核验工时 · 工资入银行','end-shift':'当面交班 · 结算实际工时',cancel:'交回未完原画 · 中断本班'}}});}
