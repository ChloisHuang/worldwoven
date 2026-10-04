// This game starts with an adult character. Old saves without an age receive
// that explicit start age once; an existing age (including a minor) is retained.
const own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
export function ensurePlayerAge(saved){
 if(own(saved.playerProfile,'ageYears'))return false;
 const sources=[[saved.playerProfile,'age'],[saved,'playerAgeYears'],[saved,'ageYears'],[saved,'age'],[saved.player,'ageYears'],[saved.player,'age'],[saved.appearance?.player,'ageYears'],[saved.appearance?.player,'age']];
 const found=sources.find(([o,k])=>own(o,k));
 saved.playerProfile={...(saved.playerProfile||{}),ageYears:found?found[0][found[1]]:24,ageOrigin:found?'preserved':'adult-start-v1'};return true;
}
export function knownAdult(person){const source=person?.station||person;const age=own(source,'ageYears')?source.ageYears:source?.age;return typeof age==='number'&&Number.isFinite(age)&&age>=18;}
