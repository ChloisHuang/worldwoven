import {STUDY_XP,skillXPRequired} from './skill-progress.js';
export const STUDY_SKILL_NAMES = Object.freeze({ritual:'礼仪',writing:'文书',gardening:'园艺',art:'艺术',cooking:'烹饪',martial:'武艺',care:'照护'});
export const STUDY_DURATION = 8;
const book=(id,skill,title,description,excerpt)=>Object.freeze({id,skill,title,description,excerpt,action:'read',verb:'阅读',seconds:STUDY_DURATION});
const china=Object.freeze([
 book('ritual-intro','ritual','《迎宾与日常礼仪》','从问安、递茶到席间礼节，读一页待客之道。','迎客先问安，再请对方落座。递茶时留意杯口朝向，让客人容易接稳。'),
 book('writing-intro','writing','《书信与文书入门》','认识书信、记事与归档的基本格式。','先写日期与来意，再记人名和待办事项。誊写后逐行核对，把回执与原文放在一起。'),
 book('cooking-intro','cooking','《灶间切配与火候》','读懂切配、灶火与按单出菜。','先核对桌号和菜名，再洗净食材、分开生熟。按份切配，掌握下锅次序与火候。'),
 book('art-intro','art','《水墨与留白初读》','从墨色浓淡与疏密留白，认识画面构成。','落笔前先看虚实。淡墨铺远山，浓墨点近枝，让未落墨的纸面也成为景色。'),
 book('care-intro','care','《照护问询与编号核对》','学习虚构症状问询、记录来意及同号交接，不含真实诊疗方法。','先请来客说出游戏中的虚构不适，再按来意记录问询卡。核对本人、原单和云纹包的编号；交付后留存原单回执。云纹包是虚构道具，不作真实治疗说明。'),
 book('poetry-intro','art','《诗词诵读与题意》','练习按来意选诗、停连诵读与说明题意。','先问来客想听远行还是归家。按题意选篇，诵读时留出停顿；用诗中的景物解释情绪，听对方回应。'),
]);
const france=Object.freeze([
 book('fr-ritual-intro','ritual','《沙龙会客礼仪》','学习沙龙中的介绍、交谈与餐桌礼节。','先向主人致意，再介绍彼此。交谈时留出倾听的余地，递杯前确认客人的需要。'),
 book('fr-writing-intro','writing','《法式书信与花园札记》','练习邀请信、清单与花园观察记录。','写明日期、收信人和来意。把观察与安排分开记录，让下一位读者也能顺着线索找到答案。'),
 book('fr-gardening-intro','gardening','《西苑花圃养护手记》','认识西苑花圃的土壤、浇水与养护。','照料花圃先观察土壤和叶片。沿根部缓缓浇水，再收好工具，记下这次照料。'),
 book('fr-art-intro','art','《色彩与光影初读》','观察宫苑的冷暖、明暗与光色。','先眯眼找出大块明暗，再铺主色。把最亮的地方留住，细节最后落笔。'),
 book('fr-cooking-intro','cooking','《糕点切配与热茶》','学习分切、茶温与同盘核对，在宫苑糕点房应用。','先核对客人和茶点单，再分切一份蛋糕、备好热茶。检查同盘杯碟与份量，让开案边交给侍茶员。'),
]);
const japan=Object.freeze([
 book('jp-ritual-intro','ritual','《霞汤屋迎客与入汤礼仪》','认识霞汤屋的问安、更衣指引与浴包交接礼节。','先问来客需要，再说明更衣、清洗与入汤的次序。递浴包前核对本人和浴牌；让出门口与行走通道，给来客留好空间。'),
 book('jp-writing-intro','writing','《霞汤屋浴牌与客簿》','练习客簿登记、同号浴牌与归还核对。','在客簿记下来客姓名与浴牌编号，发牌前逐项复核。收回时对照原客簿与同号浴牌，再记归还；认不清的编号先问清，不猜填。'),
 book('jp-cooking-intro','cooking','《寿司与拉面出膳手记》','认识汤屋食堂的原单、切配与同盘出膳。','先认清原客单与餐位，再整理寿司小盘或拉面碗。分开生熟食材，保持案面清洁；出膳前复核菜名与份数，把同单餐点交回原餐位。'),
 book('jp-care-intro','care','《草木浴包照护与核号》','辨认浴牌香型，核对封签与交接记录。','先核对来客姓名、浴牌号与香型，再封签交给配送员。遇到模糊标记，先向来客问清。'),
]);
// Original books for this fictional temple, not historical Egyptian manuals.
const egypt=Object.freeze([
 book('eg-ritual-intro','ritual','《沙河神殿迎客札记》','在这座幻想神殿练习问安、来访指引与观礼分寸。','迎客先问来意，再说明柱廊与书案的位置。观礼时留出通道，进入起居或沐浴处前先征得同意；来客可以选择停留或离开。'),
 book('eg-writing-intro','writing','《纸莎草来访与收存簿》','练习这座神殿的姓名、日期、物件编号与卷册收存记录。','先把姓名、日期和来意分栏记录，再给本次收存的卷册记号。逐行核对原件与抄本，交接时双方确认同一个编号，再把卷册放回标记处。'),
 book('eg-art-intro','art','《柱廊纹样与纸莎草配色》','观察眼形、水纹与纸莎草柱头，练习架空神殿的纹样构图。','先看柱头与水纹的轮廓，画出大小与间隔。用青蓝、赭红与金色区分主纹和边饰，留出纸莎草底色；这些纹样是这座幻想神殿的创作。'),
 book('eg-cooking-intro','cooking','《面包果盘与陶锅餐食手记》','认识神殿餐厅的面包、果盘、陶锅与同单出餐。','先看餐单和餐位，再分好面包、洗净水果，按份备料。处理食物前清洁双手和案面，分开生熟器具；出餐时核对原单，把同一份餐食送回对应餐位。'),
]);
const writing=Object.freeze({id:'writing-practice',skill:'writing',title:'楷书与文书誊写',description:'在书案蘸墨落笔，练习端正誊写。',action:'calligraphy',verb:'习字',seconds:STUDY_DURATION});
const painting=Object.freeze({id:'art-practice',skill:'art',title:'宫苑光影写生',description:'在画架前调色落笔，观察宫苑的光与影。',action:'paint',verb:'绘画',seconds:STUDY_DURATION});
const archery=Object.freeze({id:'archery-practice',skill:'martial',title:'射圃安全习射',description:'等候停射，在金线后接弓、瞄靶、放箭并收弓；由原守卫照看靶道。',action:'archery',verb:'练习',seconds:5.8});
const SOURCES=Object.freeze({'cn-rest':china,'cn-calligraphy':Object.freeze([writing]),'cn-archery':Object.freeze([archery]),'france-salon':france,'france-atelier':Object.freeze([painting]),'jp-library':japan,'egypt-papyrus':egypt});
export const STUDY_SOURCES=Object.freeze(Object.keys(SOURCES));
export const studyCountry=source=>source?.startsWith('cn-')?'china':source?.startsWith('france-')?'france':source?.startsWith('jp-')?'japan':source?.startsWith('egypt-')?'egypt':null;
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
