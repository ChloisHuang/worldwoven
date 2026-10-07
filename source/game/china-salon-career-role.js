// Each of the four existing artists owns one bounded specialty seat. The
// published poetry IDs and requirements remain unchanged for R93 saves.
const role=(id,specialty,activity,incumbentId,incumbentName,skills,work)=>Object.freeze({id,name:`云来${specialty}艺者`,specialty,activity,slotId:id+'-1',country:'china',currency:'copper',employer:'温晚',workplace:'云来楼三层 · 温晚接待案',supervisorId:'cn-tavern-reception',incumbentId,incumbentName,vacancyKind:'exclusive',paymentKind:'commission',workSource:'cn-salon-labor',wage:20,minimumAgeYears:18,maximumAgeYears:40,skillRequirements:Object.freeze(skills),dutyWindow:Object.freeze({startHour:6,endHour:22}),duties:`长期${specialty}台班仅一席，18–40岁，男女均可。温晚当面审核；自主开班、接受或谢绝来客，${work}，完成后按场计酬入银行。没有客单不生薪，可自由练习、休息或交班；未开班由${incumbentName}代管。普通${specialty}茶叙不包含亲密服务。`});
export const SALON_POET_ROLE=role('cn-salon-poet','诗词','poetry','cn-tavern-reciter','柳清弦',{art:1,writing:1},'选诗、诵读与回应题意');
export const SALON_STORY_ROLE=role('cn-salon-storyteller','说书','story','cn-tavern-storyteller','沈砚舟',{art:1,writing:2},'选游记、完整讲述与说明故事因果');
export const SALON_MUSIC_ROLE=role('cn-salon-musician','曲词','music','cn-tavern-songwriter','顾流萤',{art:2,ritual:1},'选曲词、按谱逐拍演绎完整四拍');
export const SALON_CHESS_ROLE=role('cn-salon-chess-player','棋理','chess','cn-tavern-chess-poet','陆怀川',{art:1,writing:2},'选棋题、检查气与落子，讲清提子或脱困结果');
export const SALON_ARTIST_ROLES=Object.freeze([SALON_POET_ROLE,SALON_STORY_ROLE,SALON_MUSIC_ROLE,SALON_CHESS_ROLE]);
export const salonCareerRole=id=>SALON_ARTIST_ROLES.find(r=>r.id===id)||null;
