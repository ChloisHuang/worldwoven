import {EGYPT_ARTISAN_ROLE} from './egypt-artisan-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createEgyptArtisanEmployment(options){return createJapanServiceEmployment({...options,duty:options.artisan,role:EGYPT_ARTISAN_ROLE,provider:'egypt-artisan-employment',reviewMethod:'recordEgyptArtisanReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'等萨米拉结束原事务再接工案',begin:'已接工案。向阿赫记下原委托，领纸与颜料、描样绘卷，再交本人验收。',finishWork:'请先完成原卷；未完可把原卷送回工案后交回。',end:'原工案已交回，请萨米拉核验本班工时。',meeting:'请在工案旁稍候，萨米拉处理完原事务后回来办理。',actions:{'formal-view':'查看纸莎草工匠岗位','formal-apply':'申请纸莎草工匠','formal-review':'请萨米拉审核职责与工钱','formal-resign':'办理工匠离职',accept:'接班 · 纸莎草工案',resume:'当面接回原班',claim:'核验工时 · 工资入银行','end-shift':'当面交班 · 结算实际工时',cancel:'交回未完原卷 · 中断本班'}}});}
