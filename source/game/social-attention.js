import {SHAPE_RANGES} from './character-traits.js';
// Read-only ST01 evaluation. A look is never consent or a relationship reward.
const clamp=(n,a=-1,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const unit=n=>clamp(n,0,1);
export function socialAttentionHash(text){let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
export function socialAttentionFactors({observer={},target={},appearanceAffinity=0,situation={}}={}){
 const id=target.id||'player',traits=observer.traits||{},needs=observer.needs||{};
 const relation=clamp(observer.relations?.[id]),opinion=clamp(observer.opinions?.[id]);
 const trust=clamp(observer.trust?.[id]??observer.trustForTarget??0),aversion=unit(observer.aversion?.[id]??observer.aversionForTarget??0);
 // Reputation is what THIS observer knows, never a global omniscient score.
 const reputation=clamp(observer.knownReputation?.[id]??observer.reputationForTarget??0);
 const distrust=trust<-.2||relation<-.3||opinion<-.3||aversion>.3||situation.boundary===true||situation.unresolvedFault===true;
 const adults=Number.isFinite(observer.ageYears)&&observer.ageYears>=18&&Number.isFinite(target.ageYears)&&target.ageYears>=18;
 const appearance=adults&&!distrust?clamp(appearanceAffinity):0;
 const sociability=unit(traits.sociability??.5),quiet=unit(traits.quiet??.5);
 const fatigue=unit(needs.fatigue),hunger=unit(needs.hunger);
 const available=!situation.busy&&!situation.urgent&&!situation.private&&!situation.boundary;
 const attentionChance=available?unit(.35+sociability*.25+relation*.12+opinion*.10+reputation*.08+appearance*.08-quiet*.10-fatigue*.15-hunger*.12-aversion*.2):0;
 const attraction=adults&&available&&!distrust?unit(.3+appearance*.30+relation*.15+opinion*.12+reputation*.08+sociability*.05-fatigue*.15-hunger*.12):0;
 return {attentionChance,attraction,adults,distrust,appearanceAffinity:appearance,acceptanceAppearance:appearance*.04,
  acceptanceContext:clamp(reputation*.04+trust*.06-aversion*.08,-.12,distrust?0:.10)};
}

// Stable individual ideals use all ten geometric controls. No skin, culture,
// gender, universal beauty score or random reroll of the target is involved.
export function individualAppearanceAffinity({observerId,worldSeed=1,shapeTraits}={}){
 if(typeof observerId!=='string'||!observerId||!shapeTraits)return 0;
 let sum=0,weights=0;
 for(const [key,{min,max}] of Object.entries(SHAPE_RANGES)){
  if(!Number.isFinite(shapeTraits[key]))return 0;
  const ideal=socialAttentionHash(`taste-v1|${worldSeed}|${observerId}|${key}|ideal`)/4294967296;
  const weight=.5+socialAttentionHash(`taste-v1|${worldSeed}|${observerId}|${key}|weight`)/4294967296;
  const value=unit((shapeTraits[key]-min)/(max-min));
  sum+=(1-2*Math.abs(value-ideal))*weight;weights+=weight;
 }
 return clamp(sum/weights);
}
