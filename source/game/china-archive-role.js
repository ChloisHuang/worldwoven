import {createTavernRole} from './china-tavern-role.js';
// Game-design rate for six real, identified volumes; no wage for leisure reading.
export const ARCHIVE_ROLE=Object.freeze({id:'cn-archive-inspector',slotId:'cn-archive-inspector-1',name:'雅集楼馆藏巡检',country:'china',currency:'copper',employer:'宫苑藏书房',incumbentId:'cn-rest',incumbentName:'Lan',amount:8,contractVersion:2,wage:8,supervisorId:'cn-rest',workplace:'雅集楼三层 · 原六册藏书案',vacancyKind:'exclusive',paymentKind:'commission',careerKind:'technical-service',workSource:'cn-archive-labor',minimumAgeYears:18,skillRequirements:Object.freeze({writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:22}),duties:'长期一席，满18岁并具备文书1级，当面登记审核，录用与开班分开。逐本领取核检原六册、整理并放回原位，全部归还后回原班位交验；每模拟日仅一份原六册巡检，完成由宫苑藏书房沿原实作规则付8文入银行，未完成与普通阅读不付薪。Lan或当前原任职者安全交班，不复制书册；原免费阅读保留。'});
export function createArchiveSlot({canAssign=()=>false,canRelease=()=>false,...options}={}){
 const slot=createTavernRole({...options,roleId:ARCHIVE_ROLE.id,slotId:ARCHIVE_ROLE.slotId,originalHolderId:ARCHIVE_ROLE.incumbentId,errorName:'archive',canAssign,canRelease});
 return {...slot,assign:slot.assign};
}
