// This game starts with an adult character. Old saves without an age receive
// that explicit start age once; an existing age (including a minor) is retained.
const own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
export function ensurePlayerAge(saved){
 if(own(saved.playerProfile,'ageYears'))return false;
 const sources=[[saved.playerProfile,'age'],[saved,'playerAgeYears'],[saved,'ageYears'],[saved,'age'],[saved.player,'ageYears'],[saved.player,'age'],[saved.appearance?.player,'ageYears'],[saved.appearance?.player,'age']];
 const found=sources.find(([o,k])=>own(o,k));
 saved.playerProfile={...(saved.playerProfile||{}),ageYears:found?found[0][found[1]]:24,ageOrigin:found?'preserved':'adult-start-v1'};return true;
}
// A stale role descriptor cannot override an explicit younger runtime age.
export function knownAdult(person){if(person?.isChild===true||person?.station?.isChild===true)return false;const ages=[person,person?.station].filter(Boolean).flatMap(source=>own(source,'ageYears')?[source.ageYears]:own(source,'age')?[source.age]:[]);return ages.length>0&&ages.every(age=>typeof age==='number'&&Number.isFinite(age)&&age>=18);}
