/** Same options/scale cannot accidentally turn ordinary NPCs into the player. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const {createCharacter,characterResourceStats}=await import('../source/game/characters.js');
const {installActorPreview}=await import('../source/game/complete-adult/selection.js');
const look={culture:'france',bodyPreset:'feminine-slender',wardrobePreset:'court-gown',hairStyle:'chin-bob',scale:1};
let selection=installActorPreview({femaleHair:'long-layered',hairFlow:true,playerOnly:true});
const player=createCharacter({...look,previewSubject:'player'}),resident=createCharacter(look),visitor=createCharacter({...look,scale:.96}),rebuilt=createCharacter({...look,wardrobePreset:'court-overgown'});
assert(player.root.userData.characterModel.applied);assert.equal(player.root.userData.characterModel.previewHair,'long-layered');for(const actor of[resident,visitor,rebuilt])assert.equal(actor.root.userData.characterModel.applied,false);
// Screenshot regression: randomized balanced/overgown must use the fitted
// shoulders too; the former narrow selector left it on the old shirt sleeves.
const overgown=createCharacter({...look,bodyPreset:'feminine-balanced',wardrobePreset:'court-overgown',hairStyle:'low-bun',previewSubject:'player',shapeTraits:{legLength:1.048,jawWidth:.868,noseSize:.838}});
assert.equal(overgown.root.userData.characterModel.requested,'complete-adult-pair-v1');assert(overgown.root.userData.characterModel.garmentRefinement);assert.equal(overgown.root.userData.characterModel.previewHair,'gathered-updo');
const garmentRanges=[];overgown.root.traverse(m=>{if(m.isSkinnedMesh)garmentRanges.push(...m.geometry.userData.sourceRanges.map(r=>r.name));});assert(garmentRanges.includes('court-puffed-sleeve-1'));assert(!garmentRanges.some(n=>n.startsWith('short-sleeve-')));overgown.dispose();
assert.equal(player.root.userData.appearance.hairStyle,'chin-bob');assert(!Object.hasOwn(player.root.userData.appearance,'previewSubject'));for(const actor of[player,resident,visitor,rebuilt])actor.dispose();selection.dispose();
selection=installActorPreview({femaleHair:'long-layered',hairFlow:true,playerOnly:false});const explicitNPC=createCharacter(look);assert(explicitNPC.root.userData.characterModel.applied);explicitNPC.dispose();selection.dispose();
const normal=createCharacter({...look,previewSubject:'player'});assert.equal(normal.root.userData.characterModel.applied,false);normal.dispose();assert.equal(characterResourceStats().activeReferences,0);
console.log(JSON.stringify({status:'PASS',defaultPreviewPlayerOnly:true,residentVisitorAndRebuildRemainLegacy:true,explicitNPCOptIn:true,normalAfterTeardown:true,scope:'Actual createCharacter only; no world/render'}));
