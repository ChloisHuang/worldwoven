import {EGYPT_TABLE_SERVICE_ROLE} from './egypt-table-service-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
// The original dining duty supplies physical work; the shared ledger owns
// applications, on-site time wages, atomic review/XP and retryable settlement.
export function createEgyptTableServiceEmployment(options){return createJapanServiceEmployment({...options,duty:options.tableService,role:EGYPT_TABLE_SERVICE_ROLE,provider:'egypt-table-service-employment',reviewMethod:'recordEgyptTableServiceReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先结清自己的访客餐，再接餐桌服务班次',begin:'达娜：替萨米拉记原单、报给赫特，取同号餐盘送给本人；等她用毕，收回同盘并亲手洗净。完整原单收洗才记评价与礼仪经验；现场候单持续计工时，另行交班',finishWork:'请先完成原餐送达与收洗，再当面交班；也可中断交回达娜',end:'达娜已接回原餐桌服务职责；请当面验收并领取本班埃及券',meeting:'请在餐桌服务登记处稍候，达娜会先把手中原盘安置好再回来当面办理',
 actions:{'formal-view':'查看餐桌服务与收洗岗位','formal-apply':'自荐 · 提交餐桌服务申请','formal-review':'请达娜审核 · 核对服务职责与工钱','formal-resign':'办理餐桌服务离职',accept:'接班 · 开始今日送餐与收洗',resume:'当面接回服务 · 继续原班',claim:'达娜验收 · 埃及券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 将未完原单交回达娜'}
 }});}
