import {shapePreferenceScore} from './character-traits.js';
// Fictional performance fees only. The same deterministic quote serves NPCs
// and the player; no skin, culture, gender, species or intimacy inputs exist.
export const SALON_QUOTE_VERSION=1,SALON_MIN_FEE=20,SALON_MAX_FEE=500;
const clamp=(value,low,high)=>Math.max(low,Math.min(high,Number.isFinite(value)?value:low));
export function quoteSalonService({appearanceScore,shapeTraits,shapeVersion=1,artLevel=0,positiveReviews=0,reputation=0,relationship=0,contentWeight=0}={}){
 const score=clamp(Number.isFinite(appearanceScore)?appearanceScore:shapePreferenceScore(shapeTraits,{version:shapeVersion}),0,100);
 const [low,high,start,end]=score<50?[20,60,0,50]:score<80?[80,180,50,80]:[200,500,80,100];
 const social=clamp(reputation,-1,1)*.035+clamp(relationship,-1,1)*-.025+clamp(contentWeight,0,1)*.04;
 const quality=social+.7*(score-start)/(end-start)+.2*clamp(artLevel,0,10)/10+.1*clamp(positiveReviews,0,10)/10;
 return Math.max(low,Math.min(high,Math.round((low+(high-low)*quality)/5)*5));
}
// Published R93 orders predate the shared quote. Never reprice them on load.
export function validSalonFee(fee,version){return Number.isSafeInteger(fee)&&(version===undefined?fee>=5&&fee<=10:version===SALON_QUOTE_VERSION&&fee>=SALON_MIN_FEE&&fee<=SALON_MAX_FEE&&fee%5===0);}
