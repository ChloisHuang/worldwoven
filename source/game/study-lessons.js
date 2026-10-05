import {STUDY_XP,skillXPRequired} from './skill-progress.js';
export const STUDY_SKILL_NAMES = Object.freeze({ritual:'礼仪',writing:'文书',gardening:'园艺',art:'艺术',cooking:'烹饪'});
export const STUDY_DURATION = 8;
const book=(id,skill,title,description,excerpt)=>Object.freeze({id,skill,title,description,excerpt,action:'read',verb:'阅读',seconds:STUDY_DURATION});
const china=Object.freeze([
 book('ritual-intro','ritual','《迎宾与日常礼仪》','从问安、递茶到席间礼节，读一页待客之道。','迎客先问安，再请对方落座。递茶时留意杯口朝向，让客人容易接稳。'),
 book('writing-intro','writing','《书信与文书入门》','认识书信、记事与归档的基本格式。','先写日期与来意，再记人名和待办事项。誊写后逐行核对，把回执与原文放在一起。'),
 book('cooking-intro','cooking','《灶间切配与火候》','读懂切配、灶火与按单出菜。','先核对桌号和菜名，再洗净食材、分开生熟。按份切配，掌握下锅次序与火候。'),
 book('art-intro','art','《水墨与留白初读》','从墨色浓淡与疏密留白，认识画面构成。','落笔前先看虚实。淡墨铺远山，浓墨点近枝，让未落墨的纸面也成为景色。'),
]);
const france=Object.freeze([
 book('fr-ritual-intro','ritual','《沙龙会客礼仪》','学习沙龙中的介绍、交谈与餐桌礼节。','先向主人致意，再介绍彼此。交谈时留出倾听的余地，递杯前确认客人的需要。'),
 book('fr-writing-intro','writing','《法式书信与花园札记》','练习邀请信、清单与花园观察记录。','写明日期、收信人和来意。把观察与安排分开记录，让下一位读者也能顺着线索找到答案。'),
 book('fr-gardening-intro','gardening','《西苑花圃养护手记》','认识西苑花圃的土壤、浇水与养护。','照料花圃先观察土壤和叶片。沿根部缓缓浇水，再收好工具，记下这次照料。'),
 book('fr-art-intro','art','《色彩与光影初读》','观察宫苑的冷暖、明暗与光色。','先眯眼找出大块明暗，再铺主色。把最亮的地方留住，细节最后落笔。'),
]);
const writing=Object.freeze({id:'writing-practice',skill:'writing',title:'楷书与文书誊写',description:'在书案蘸墨落笔，练习端正誊写。',action:'calligraphy',verb:'习字',seconds:STUDY_DURATION});
const painting=Object.freeze({id:'art-practice',skill:'art',title:'宫苑光影写生',description:'在画架前调色落笔，观察宫苑的光与影。',action:'paint',verb:'绘画',seconds:STUDY_DURATION});
const SOURCES=Object.freeze({'cn-rest':china,'cn-calligraphy':Object.freeze([writing]),'france-salon':france,'france-atelier':Object.freeze([painting])});
export const STUDY_SOURCES=Object.freeze(Object.keys(SOURCES));
export const studyCountry=source=>source?.startsWith('cn-')?'china':source?.startsWith('france-')?'france':null;
export const studyOptions=(source,country=null)=>country&&studyCountry(source)!==country?[]:SOURCES[source]||[];
export const studyLesson=(source,id)=>studyOptions(source).find(lesson=>lesson.id===id)||null;
export const defaultStudyLesson=source=>studyOptions(source)[0]||null;
// Accept removed book IDs only as saved history, never as newly chosen lessons.
// Country filtering must not invalidate an existing career or salary save.
export const savedStudyLesson=(source,id)=>studyLesson(source,id)||(['cn-rest','france-salon'].includes(source)?
 (id==='gardening-intro'?france.find(b=>b.skill==='gardening'):china.find(b=>b.id===id)):null);
export function studySkillProgress(state,skill,day){
 const level=state.skills[skill]??0,used=state.daily.day===day?(state.daily[skill]??0):0;
 const capped=['ritual','writing'].includes(skill)?state.skills.ritual+state.skills.writing>=100:level>=100;
 const xp=state.skillXP?.[skill]??0,required=skillXPRequired(level);
 return {level,xp,required,percent:capped?100:100*xp/required,reward:STUDY_XP,remaining:Math.max(0,4-used),capped,canGain:!state.loadError&&!capped&&used<4};
}
export function studyJobLinks(careers,skill,country=null){
 const roles=careers.catalogue().filter(role=>(!country||role.country===country)&&role.skillRequirements[skill]);
 return roles.length?roles.map(role=>`${role.name}：${STUDY_SKILL_NAMES[skill]} Lv.${role.skillRequirements[skill]}`).join('；'):
 skill==='art'?'艺术家职位尚未开放':'当地暂无以此技能为门槛的开放职位';
}
