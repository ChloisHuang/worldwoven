/** Reproduces nasal controls shortening the nose and overtaking its tip. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';
import path from 'node:path';import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const C=await import('../source/game/characters.js');await import('../source/game/complete-adult/register.js');
const {ADULT_FORMS}=await import('../source/game/complete-adult/assets/adult-forms-data.js');
const {morphCompleteAdultAsset}=await import('../source/game/complete-adult/shape-traits.js');
const look={culture:'france',bodyPreset:'feminine-balanced',hairStyle:'low-bun',wardrobePreset:'court-overgown',modelPreview:'complete-adult-head-v1',previewHair:'gathered-updo'};
const actors=[];
function geometry(traits){const actor=C.createCharacter({...look,shapeTraits:traits});actors.push(actor);assert(actor.root.userData.characterModel.applied);let result;actor.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const range=mesh.geometry.userData.sourceRanges.find(r=>r.name==='continuous-head-anatomical-head-neck');if(range)result={g:mesh.geometry,r:range};});return result;}
function nearest(h,raw){const a=h.g.attributes.featureCoord;let best=Infinity,index;for(let i=h.r.start;i<h.r.start+h.r.count;i++){let d=0;for(let k=0;k<3;k++)d+=(a.array[3*i+k]-raw[k])**2;if(d<best){best=d;index=i;}}return index;}
const neutral=geometry(null),small=geometry({noseSize:.8}),large=geometry({noseSize:1.2}),narrow=geometry({noseWidth:.8}),high=geometry({noseBridgeHeight:1.2}),both=geometry({noseSize:.8,noseBridgeHeight:1.2}),tipLow=geometry({noseTipSize:.8}),tipHigh=geometry({noseTipSize:1.2}),combined=geometry({noseSize:.8,noseWidth:.8,noseBridgeHeight:1.2,noseTipSize:.8});
const points={bridge:[0,7.1046,1.583],tip:[0,6.909,1.6807]};
const z=(h,raw)=>h.g.attributes.position.getZ(nearest(h,raw));
const lostRidge=Math.abs(z(small,points.bridge)-z(neutral,points.bridge));
assert(lostRidge<.0002,'noseSize must not flatten the independent upper ridge');
let upperRidgeVertices=0;
for(let j=0;j<neutral.r.count;j++){const i=neutral.r.start+j;if(neutral.g.attributes.featureCoord.getY(i)<7.12)continue;for(let k=0;k<3;k++)assert.equal(small.g.attributes.position.array[3*(small.r.start+j)+k],neutral.g.attributes.position.array[3*i+k],'small lower nose must preserve every upper-bridge axis');upperRidgeVertices++;}
assert(upperRidgeVertices>0);
assert(z(both,points.bridge)>z(neutral,points.bridge)+.003,'small nose must retain high-bridge projection');
assert(Math.abs((z(both,points.bridge)-z(small,points.bridge))-(z(high,points.bridge)-z(neutral,points.bridge)))<1e-6,'bridge response remains independent of nose size');
const tipSpan=z(tipHigh,points.tip)-z(tipLow,points.tip);assert(tipSpan>.001&&tipSpan<.004,'local tip volume changes without retracting it toward the nasal root');
assert(Math.abs(z(tipHigh,points.bridge)-z(tipLow,points.bridge))<.0001,'tip control must not shift the upper ridge');
const tipIndex=nearest(neutral,points.tip),tipY=neutral.g.attributes.position.getY(tipIndex);
for(const h of [small,large,narrow,tipLow,tipHigh,combined])assert.equal(h.g.attributes.position.getY(nearest(h,points.tip)),tipY,'nasal controls preserve tip height and nose length');
for(const h of [small,large,narrow])assert.equal(z(h,points.tip),z(neutral,points.tip),'wing size and width preserve central tip projection');
assert(Math.abs(z(combined,points.tip)-z(neutral,points.tip))<.0015,'small wing/tip combination must not retract the whole nose');
let wingSpan=0,bulbSpan=0;
for(let j=0;j<neutral.r.count;j++){
 const i=neutral.r.start+j,raw=neutral.g.attributes.featureCoord;
 for(const axis of ['X','Y','Z'])wingSpan=Math.max(wingSpan,Math.abs(large.g.attributes.position['get'+axis](large.r.start+j)-small.g.attributes.position['get'+axis](small.r.start+j)));
 if(raw.getY(i)>6.84&&raw.getY(i)<6.99)bulbSpan=Math.max(bulbSpan,Math.abs(tipHigh.g.attributes.position.getX(tipHigh.r.start+j)-tipLow.g.attributes.position.getX(tipLow.r.start+j)));
 if(Math.abs(raw.getX(i))<.001&&raw.getY(i)>7&&raw.getY(i)<7.2)assert(combined.g.attributes.position.getZ(combined.r.start+j)<z(combined,points.tip),'bony bridge must remain behind the small tip');
 assert.equal(narrow.g.attributes.position.getY(narrow.r.start+j),neutral.g.attributes.position.getY(i),'width changes only cross-span');
 assert.equal(narrow.g.attributes.position.getZ(narrow.r.start+j),neutral.g.attributes.position.getZ(i),'width changes only cross-span');
}
assert(wingSpan>.001&&wingSpan<.006,'wing size remains visibly variable around local attachments');
assert(bulbSpan>.002&&bulbSpan<.008,'tip retains visible bulb width variation');
let anchors=0,lips=0;
const p=neutral.g.attributes.position,fc=neutral.g.attributes.featureCoord,rawSkin=ADULT_FORMS.female.parts.find(p=>p.material==='skin');
for(let j=0;j<neutral.r.count;j++){const i=neutral.r.start+j;const anchored=neutral.g.attributes.sourceY.getX(i)<1.36,lip=rawSkin.lipWeight[j]>.5;if(!anchored&&!lip)continue;for(const h of [tipLow,tipHigh])for(let k=0;k<3;k++)assert.equal(h.g.attributes.position.array[3*(h.r.start+j)+k],p.array[3*i+k],anchored?'collar anchors stay exact':'tip must not pull lips');if(anchored)anchors++;if(lip)lips++;}
assert(anchors>0&&lips>0);assert.equal(morphCompleteAdultAsset(ADULT_FORMS.female,null),ADULT_FORMS.female,'neutral mesh remains exact');
actors.forEach(a=>a.dispose());assert.equal(C.characterResourceStats().activeReferences,0);
console.log(JSON.stringify({status:'PASS',scope:'Actual createCharacter control separation, fixed nasal length/collar/lips, exact neutral; visual review remains separate',smallNoseBridgeRetractionMm:lostRidge*1000,tipProjectionSpanMm:tipSpan*1000,wingSizeSpanMm:wingSpan*1000,tipWidthSpanMm:bulbSpan*1000,anchors,lips,upperRidgeVertices},null,2));
