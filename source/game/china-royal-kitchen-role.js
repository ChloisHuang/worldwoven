// A technical kitchen appointment, never an official court rank.
export const ROYAL_KITCHEN_ROLE=Object.freeze({
 id:'cn-royal-kitchen-cook',name:'御膳厨役',slotId:'cn-royal-kitchen-cook-1',country:'china',currency:'copper',
 employer:'Jia',workplace:'御膳备餐间 · 厨役登记',supervisorId:'cn-cooking',incumbentId:'cn-cooking',incumbentName:'Jia',
 vacancyKind:'exclusive',careerKind:'technical',workSource:'cn-royal-kitchen-labor',wage:32,minimumAgeYears:18,
 skillRequirements:Object.freeze({cooking:3,ritual:2}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'须在三个不同模拟日以正式酒楼厨师身份完成原客单的备料、烹制与出菜，再由Jia当面审核。御膳厨役不授官品。06:00–18:00主动开班，核对宫中原单、备餐并送达原来客；持续在岗，交班按实际工时计日薪32铜文，原单完成只记烹饪与服务评价，不另付计件薪。正餐供皇家本人，工作不授用膳资格；开局库存120份，用完不会每日补充。',
});
export const ROYAL_KITCHEN_CHEF_DAYS=3;
export const ROYAL_KITCHEN_CUSTOMERS=Object.freeze({'cn-emperor':'景珩','cn-consort-yue':'月容','cn-consort-heng':'沈蘅','cn-consort-ling':'令仪'});
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const receiptNumber=(source,id)=>{const match=typeof id==='string'&&new RegExp('^'+source+'-([1-9][0-9]*)$').exec(id);return !!match&&integer(Number(match[1]));};
export function validTavernChefServiceReceipt(row){return !!row&&row.source==='china-tavern-chef'&&row.actorId==='player'&&
 integer(row.number)&&row.number>0&&row.orderId===`cn-tavern-order-${row.number}`&&row.mealId===row.orderId+'-dish'&&
 integer(row.day)&&receiptNumber('cn-tavern-chef-labor',row.workReceiptId)&&row.completed===true;}
export function validRoyalKitchenServiceReceipt(row){return !!row&&row.source==='china-royal-kitchen'&&Object.hasOwn(ROYAL_KITCHEN_CUSTOMERS,row.actorId)&&
 integer(row.number)&&row.number>0&&row.orderId===`cn-royal-meal-${row.number}`&&row.mealId===row.orderId+'-meal'&&
 integer(row.day)&&receiptNumber(ROYAL_KITCHEN_ROLE.workSource,row.workReceiptId)&&row.completed===true;}
export const sameKitchenReceipt=(a,b)=>['source','actorId','number','orderId','mealId','day','workReceiptId','completed'].every(key=>a?.[key]===b?.[key]);
