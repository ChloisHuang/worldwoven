// Focused causal checks plus an opt-in statistical audit of the real generator.
// Run the large audit with Node's runtime RNG, not a test-only replacement:
// node --random-seed=13013 tests/appearance-score-independence.mjs --samples=5000000
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BODY_PRESETS,createAppearanceState,randomizePlayerAppearance} from '../source/game/appearance.js';
import {SHAPE_RANGES,LEGACY_SHAPE_KEYS,DEFAULT_SHAPE_TRAITS,shapePreferenceScore} from '../source/game/character-traits.js';

const args=Object.fromEntries(process.argv.slice(2).map(arg=>arg.replace(/^--/,'').split('=')));
const samples=Number(args.samples||0),candidateScoreVersion=Number(args['candidate-score-version']||2);
assert(Number.isSafeInteger(samples)&&samples>=0);
assert([1,2].includes(candidateScoreVersion));
const base=createAppearanceState(42),extraKeys=Object.keys(SHAPE_RANGES).filter(key=>!LEGACY_SHAPE_KEYS.includes(key));
const score=(player,version=1)=>shapePreferenceScore({...player.shapeTraits,skin:player.skin,bodyPreset:player.bodyPreset},{version});
const hex=color=>'#'+color.toString(16).padStart(6,'0');
const luminance=color=>.2126*(color>>16)+.7152*((color>>8)&255)+.0722*(color&255);
const drawSequence=(extended,changes={})=>{
 let calls=0;const values=Array.from({length:extended?17:13},(_,i)=>((i*7+3)%19+.5)/19);
 for(const [index,value]of Object.entries(changes))values[index]=value;
 const look=randomizePlayerAppearance(base,()=>{assert(calls<values.length);return values[calls++];},{extended});
 assert.equal(calls,values.length);return look.player;
};
const skins=[...new Set(Array.from({length:256},(_,i)=>drawSequence(true,{11:(i+.5)/256}).skin))].sort((a,b)=>luminance(a)-luminance(b));
assert.equal(skins.length,18,'all existing player colors are audited');
const optimal=Object.fromEntries(Object.entries(SHAPE_RANGES).map(([key,{min,max}])=>[key,['jawWidth','noseSize','noseWidth'].includes(key)?min:max]));
const least=Object.fromEntries(Object.entries(SHAPE_RANGES).map(([key,{min,max}])=>[key,['jawWidth','noseSize','noseWidth'].includes(key)?max:min]));
assert.equal(shapePreferenceScore(optimal),100);assert.equal(shapePreferenceScore(least),0);
let invariantComparisons=0;
for(const traits of [DEFAULT_SHAPE_TRAITS,optimal,least,drawSequence(true).shapeTraits]){
 const expected=shapePreferenceScore(traits);
 for(const version of [1,2])for(const skin of skins)for(const bodyPreset of BODY_PRESETS){
  assert.equal(shapePreferenceScore({...traits,skin,bodyPreset,culture:'any'},{version}),shapePreferenceScore(traits,{version}));invariantComparisons++;
 }
 for(const key of extraKeys)for(const value of [SHAPE_RANGES[key].min,SHAPE_RANGES[key].max]){
  assert.equal(shapePreferenceScore({...traits,[key]:value}),expected,'new geometric controls do not invent scoring preferences');
 }
}
const v2=traits=>shapePreferenceScore(traits,{version:2});
assert.equal(v2({...optimal,noseTipSize:SHAPE_RANGES.noseTipSize.min}),100);
assert.equal(v2({...least,noseTipSize:SHAPE_RANGES.noseTipSize.max}),0);
for(const [key,direction]of [['noseSize',-1],['noseWidth',-1],['noseTipSize',-1],['noseBridgeHeight',1]]){
 const {min,max}=SHAPE_RANGES[key],low=v2({...DEFAULT_SHAPE_TRAITS,[key]:min}),high=v2({...DEFAULT_SHAPE_TRAITS,[key]:max});
 assert((high-low)*direction>0,key+' follows the clarified nose preference');
 assert.equal(v2({...DEFAULT_SHAPE_TRAITS,[key]:min-100}),low);assert.equal(v2({...DEFAULT_SHAPE_TRAITS,[key]:max+100}),high);
}
for(const key of ['chinLength','chinProjection'])for(const value of [SHAPE_RANGES[key].min,SHAPE_RANGES[key].max])assert.equal(v2({...DEFAULT_SHAPE_TRAITS,[key]:value}),v2(DEFAULT_SHAPE_TRAITS));
const oldTraits=Object.fromEntries(LEGACY_SHAPE_KEYS.map(key=>[key,optimal[key]])),oldBytes=JSON.stringify(oldTraits);
assert.equal(shapePreferenceScore(oldTraits),100);assert.equal(v2(oldTraits),88,'cross-version scores are intentionally not identical');
assert.equal(v2(oldTraits),v2({...oldTraits,noseBridgeHeight:1,noseTipSize:1}),'missing controls are neutral, not random');
assert.equal(JSON.stringify(oldTraits),oldBytes,'score calculation never migrates or mutates saved traits');
assert.throws(()=>shapePreferenceScore(oldTraits,{version:3}),RangeError);
for(const extended of [false,true]){
 const unchanged=drawSequence(extended),skinIndex=1+(extended?Object.keys(SHAPE_RANGES).length:LEGACY_SHAPE_KEYS.length);
 for(let i=0;i<skins.length;i++){
  const changed=drawSequence(extended,{[skinIndex]:(i+.5)/skins.length});
  assert.deepEqual({...changed,skin:unchanged.skin},unchanged,'changing only the skin draw cannot change any shape, score or body');
  assert.equal(score(changed),score(unchanged));
 }
 for(let i=0;i<BODY_PRESETS.length;i++){
  const changed=drawSequence(extended,{0:(i+.5)/BODY_PRESETS.length});
  assert.deepEqual({...changed,variant:unchanged.variant,bodyPreset:unchanged.bodyPreset},unchanged,'body draw cannot cause a color/score association');
 }
}

// Exercise the actual production button handler, including its extra outfit
// draw. Rendering is stubbed because no geometry or browser behavior is audited.
const main=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
const scoreCalls=[...main.matchAll(/shapePreferenceScore\(([^)]*)\)/g)];
assert(scoreCalls.length>=3,'player, residents and visitors retain score entry points');
assert(scoreCalls.every(call=>/\{version:(?:saved\.appearance\.(?:player|npc)ScoreVersion|outfitDraft\.playerScoreVersion)\?\?1\}/.test(call[1])),'every player/resident/visitor score entry uses its durable score version with legacy fallback');
for(const [_,call]of scoreCalls){const version=call.startsWith('outfitDraft.player.shapeTraits')?'outfitDraft.playerScoreVersion':call.startsWith('saved.appearance.player.shapeTraits')?'saved.appearance.playerScoreVersion':'saved.appearance.npcScoreVersion';assert(call.includes('{version:'+version+'??1}'),'each consumer selects its own identity score version');}
const readout=main.match(/function refreshAppearanceScore\(\)\{([\s\S]*?)\n\}/)?.[1];assert(readout);
for(const version of [undefined,1,2]){
 const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);};
 new Function('$','outfitRandomScoreVisible','outfitDraft','shapePreferenceScore',readout)(element,true,{playerScoreVersion:version,player:{shapeTraits:oldTraits}},shapePreferenceScore);
 assert.equal(element('appearance-score').textContent,(version===2?88:100)+' / 100','actual readout uses the persisted formula or historical fallback');
}
const handler=main.match(/^function previewRandomCharacter\(\).*$/m)?.[0];assert(handler);
function playerRoller(preview=false){
 return new Function('randomizePlayerAppearance','Math','CHARACTER_PREVIEW_ENABLED','appearance',`
  let outfitDraft=null,outfitShapeDirty=false,outfitShapeLastAt=0,outfitRandomScoreVisible=false;
  const saved={appearance},performance={now:()=>0},outfitPreview={state:()=>({open:true}),select:i=>i};
  const buildPlayer=()=>{},refreshOutfitChoices=()=>{};
  ${handler}
  return ()=>{previewRandomCharacter();if(outfitDraft.playerScoreVersion!==2||Object.keys(outfitDraft.player.shapeTraits).length!==10)throw Error('normal and preview buttons must create versioned ten-trait identity');return outfitDraft.player;};
 `)(randomizePlayerAppearance,Math,preview,base);
}
for(const preview of [false,true])playerRoller(preview)();
const makeRow=()=>({count:0,sum:0,sumSquares:0,high80:0,high90:0,traitSums:Array(LEGACY_SHAPE_KEYS.length).fill(0)});
const add=(row,value,traits)=>{
 row.count++;row.sum+=value;row.sumSquares+=value*value;row.high80+=value>=80;row.high90+=value>=90;
 for(let i=0;i<LEGACY_SHAPE_KEYS.length;i++){const key=LEGACY_SHAPE_KEYS[i],{min,max}=SHAPE_RANGES[key];row.traitSums[i]+=(traits[key]-min)/(max-min);}
};
function describe(row){
 const n=row.count,p=row.high90/n,z=1.96,denom=1+z*z/n,center=(p+z*z/(2*n))/denom,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/denom;
 return {n,meanScore:row.sum/n,high80:row.high80,high80Rate:row.high80/n,high90:row.high90,high90Rate:p,high90Wilson95:[Math.max(0,center-half),Math.min(1,center+half)],meanNormalizedTraits:Object.fromEntries(LEGACY_SHAPE_KEYS.map((key,i)=>[key,row.traitSums[i]/n]))};
}
function audit(label,n,roll,scoreVersion=1){
 const total=makeRow(),bySkin={},byBody={},joint={},byTone={darkestThird:makeRow(),middleThird:makeRow(),lightestThird:makeRow()};
 let lumSum=0,lumSqSum=0,lumScoreSum=0;
 for(let i=0;i<n;i++){
  const player=roll(i),value=score(player,scoreVersion),color=hex(player.skin),body=player.bodyPreset;
  add(total,value,player.shapeTraits);add(bySkin[color]??=makeRow(),value,player.shapeTraits);add(byBody[body]??=makeRow(),value,player.shapeTraits);add(joint[color+'|'+body]??=makeRow(),value,player.shapeTraits);
  const lum=luminance(player.skin),tone=lum<=luminance(skins[5])?'darkestThird':lum<=luminance(skins[11])?'middleThird':'lightestThird';
  add(byTone[tone],value,player.shapeTraits);lumSum+=lum;lumSqSum+=lum*lum;lumScoreSum+=lum*value;
 }
 const describeMap=map=>Object.fromEntries(Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([key,row])=>[key,describe(row)]));
 const result={label,scoreVersion,...describe(total),scoreLuminanceCorrelation:(n*lumScoreSum-lumSum*total.sum)/Math.sqrt((n*lumSqSum-lumSum**2)*(n*total.sumSquares-total.sum**2)),bySkin:describeMap(bySkin),byBody:describeMap(byBody),byTone:describeMap(byTone),skinBodyJoint:describeMap(joint)};
 console.error(JSON.stringify({label,n,meanScore:result.meanScore,high90:result.high90,scoreLuminanceCorrelation:result.scoreLuminanceCorrelation,byTone:result.byTone}));
 return result;
}
const report={status:'PASS',scope:'Actual production random button and appearance generator; CPU logic only, no renderer or real-device claim',runtime:process.version,runtimeFlags:process.execArgv,skinCount:skins.length,invariantComparisons,scoredTraits:{v1:LEGACY_SHAPE_KEYS,v2:[...LEGACY_SHAPE_KEYS,'noseBridgeHeight','noseTipSize']},unscoredExtraTraits:{v1:extraKeys,v2:['chinLength','chinProjection']},drawCounts:{normal:17,preview:17,explicitLegacyAPI:13,outfitAdditional:1},samples:[]};
if(samples){
 report.samples.push(audit('normal-ten-controls-runtime-Math.random',samples,playerRoller(false),candidateScoreVersion));
 report.samples.push(audit('explicit-legacy-six-controls-runtime-Math.random',samples,()=>randomizePlayerAppearance(base,Math.random,{extended:false}).player));
}
console.log(JSON.stringify(report,null,2));
