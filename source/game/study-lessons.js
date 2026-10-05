// Actual reading and workshop stations only. Skill levels retain the published
// one completed lesson = one point model used by job eligibility.
export const STUDY_SKILL_NAMES = Object.freeze({ritual:'礼仪',writing:'文书',gardening:'园艺',art:'艺术',cooking:'烹饪'});
export const STUDY_DURATION = 8;
const books = [
  {id:'ritual-intro',skill:'ritual',title:'《迎宾与日常礼仪》',description:'练习称谓、迎送和席间礼节。',excerpt:'迎客先问安，再请对方落座。听清来意后回应，递物时让对方容易接稳。'},
  {id:'writing-intro',skill:'writing',title:'《书信与文书入门》',description:'认识书信、记录与归档的基本格式。',excerpt:'先写日期与来意，再记人名和待办事项。誊写后逐行核对，把回执与原文放在一起。'},
  {id:'gardening-intro',skill:'gardening',title:'《花圃养护手记》',description:'学习观察土壤、浇水与花圃养护。',excerpt:'照料花圃先观察土壤和叶片。沿根部缓缓浇水，再收好工具，记下这次照料。'},
  {id:'cooking-intro',skill:'cooking',title:'《灶间切配与火候》',description:'认识净菜切配、灶火控制与按单核对菜品。',excerpt:'先核对桌号和菜名，再洗净食材、分开生熟。按份切配，掌握下锅次序与火候；出菜前再次核对点菜单。'},
  {id:'art-intro',skill:'art',title:'《色彩与光影初读》',description:'认识冷暖色、明暗与画面的留白。',excerpt:'先眯眼找出大块明暗，再铺主色。把最亮的地方留住，细节最后落笔。'},
].map(book=>Object.freeze({...book,action:'read',verb:'阅读',seconds:STUDY_DURATION}));
const writing=Object.freeze({id:'writing-practice',skill:'writing',title:'楷书与文书誊写',description:'在眼前的书案蘸墨落笔，练习端正誊写。',action:'calligraphy',verb:'习字',seconds:STUDY_DURATION});
const painting=Object.freeze({id:'art-practice',skill:'art',title:'宫苑光影写生',description:'在画架前调色落笔，观察宫苑的光与影。',action:'paint',verb:'绘画',seconds:STUDY_DURATION});
const SOURCES=Object.freeze({'cn-rest':Object.freeze(books),'cn-calligraphy':Object.freeze([writing]),'france-salon':Object.freeze(books),'france-atelier':Object.freeze([painting])});
export const STUDY_SOURCES=Object.freeze(Object.keys(SOURCES));
export const studyOptions=source=>SOURCES[source]||[];
export const studyLesson=(source,id)=>studyOptions(source).find(lesson=>lesson.id===id)||null;
export const defaultStudyLesson=source=>studyOptions(source)[0]||null;
export function studySkillProgress(state,skill,day){
 const level=state.skills[skill]??0,used=state.daily.day===day?(state.daily[skill]??0):0;
 const capped=['ritual','writing'].includes(skill)?state.skills.ritual+state.skills.writing>=100:level>=100;
 return {level,remaining:Math.max(0,4-used),capped,canGain:!state.loadError&&!capped&&used<4};
}
export function studyJobLinks(careers,skill){
 const roles=careers.catalogue().filter(role=>role.skillRequirements[skill]);
 return roles.length?roles.map(role=>`${role.name}：${STUDY_SKILL_NAMES[skill]} Lv.${role.skillRequirements[skill]}`).join('；'):'当前没有以艺术为门槛的开放职位；艺术家职位尚未开放';
}
