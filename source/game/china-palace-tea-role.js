import {createTavernRole} from './china-tavern-role.js';

// One original, physically completed service. This is not an idle wage or
// payment for the existing free conversations. Needs enroll only after real earnings and a safe return.
export const PALACE_TEA_ROLE=Object.freeze({id:'cn-palace-tea-service',slotId:'cn-palace-tea-service-1',name:'宫苑原单备茶',country:'china',currency:'copper',employer:'宫苑茶务',incumbentId:'cn-tea',incumbentName:'Lin',amount:8,contractVersion:1,wage:8,supervisorId:'cn-tea',workplace:'宫苑茶席 · 原茶案',vacancyKind:'exclusive',paymentKind:'commission',careerKind:'technical-service',workSource:'cn-palace-tea-labor',minimumAgeYears:18,skillRequirements:Object.freeze({ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:22}),duties:'长期一席，满18岁并具备礼仪1级，当面登记审核，录用与开班分开。接原来客自愿提出的茶单，亲自温杯备茶、端原杯托送达、等待饮毕、收回清理并返岗；每份完整原单由宫苑茶务按既有实作规则付8文入银行，空班不计酬，不向来客另收费。Lin或当前原任职者仅在原单与个人餐厕结束后安全交班；原免费聊天保留。'});
export function createPalaceTeaSlot({saved,resolveActor,getPlayer,isActorAlive,canAssign=()=>false,canRelease=()=>false,saveState}={}){
 const slot=createTavernRole({roleId:PALACE_TEA_ROLE.id,slotId:PALACE_TEA_ROLE.slotId,originalHolderId:PALACE_TEA_ROLE.incumbentId,errorName:'palace-tea',saved,resolveActor,getPlayer,isActorAlive,canAssign,canRelease,saveState});
 return {state:slot.state,resolve:slot.resolve,get loadError(){return slot.loadError;},assign:slot.assign};
}
