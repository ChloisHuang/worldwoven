// Levels remain durable job qualifications; XP measures progress within a level.
export const STUDY_XP = 10;
export const skillXPRequired = level => 30 + 10 * level;
export function addSkillXP(level, xp, amount) {
 let nextLevel=level,nextXP=xp+amount;
 while(nextLevel<100&&nextXP>=skillXPRequired(nextLevel)){nextXP-=skillXPRequired(nextLevel);nextLevel++;}
 return {level:nextLevel,xp:nextLevel===100?0:nextXP,levelsGained:nextLevel-level};
}

export function skillXPReceipt(result,name){
 if(!result?.ok)return '';
 return result.xpGained?` · ${name} +${result.xpGained} XP · Lv.${result.level}${result.levelsGained?' · 升级！':''}`:
 result.limited==='daily-skill-limit'?` · ${name}今日有效成长次数已用完`:result.limited==='skill-limit'?` · ${name}已到当前技能上限`:'';
}
