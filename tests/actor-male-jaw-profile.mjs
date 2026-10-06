/** The male preferred endpoint should not pinch, and the wide end must broaden the chin. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const {ADULT_FORMS}=await import('../source/game/complete-adult/assets/adult-forms-data.js');
const {sculptCompleteAdultProfile,morphCompleteAdultAsset}=await import('../source/game/complete-adult/shape-traits.js');
const {shapePreferenceScore}=await import('../source/game/character-traits.js');
const C=await import('../source/game/characters.js');await import('../source/game/character-live-entry.js');
const points={chin:[.23,6.20,1.40],jawBody:[.4,6.24,1.18],jawAngle:[.58,6.41,.78]};
function nearest(part,point){let best=Infinity,at=0;for(let i=0;i<part.featureCoord.length;i+=3){let d=0;for(let k=0;k<3;k++)d+=(part.featureCoord[i+k]-point[k])**2;if(d<best){best=d;at=i;}}return at;}
const rows=[];
for(const form of ['male','female']){
 const base=sculptCompleteAdultProfile(ADULT_FORMS[form]),skin=base.parts.find(p=>p.material==='skin');
 for(const jawWidth of [.84,1,1.12]){
  const traits={jawWidth},saved=JSON.stringify(traits),score=shapePreferenceScore(traits);
  const actual=morphCompleteAdultAsset(base,traits);
  // Same reviewed anatomy with the former linear jaw branch. No asset copy,
  // alternative geometry, save migration or selection hook is involved.
  const prior=morphCompleteAdultAsset({...base,form:'linear-jaw-reference'},traits);
  const p=actual.parts.find(p=>p.material==='skin'),old=prior.parts.find(p=>p.material==='skin');let lips=0,changed=0;
  for(let j=0;j<actual.parts.length;j++){
   const a=actual.parts[j],b=prior.parts[j];assert.equal(a.index,b.index);assert.equal(a.featureCoord,b.featureCoord);
   if(form==='female'||jawWidth===1||a.material!=='skin'){assert.deepEqual(a.position,b.position,'female, middle and non-skin parts stay exact');assert.deepEqual(a.normal,b.normal);}
  }
  for(let i=0;i<p.position.length;i+=3){const raw=skin.featureCoord.slice(i,i+3),lip=skin.lipWeight[i/3]>.5;
   assert.equal(p.position[i+1],old.position[i+1],'jaw remap changes no height');assert.equal(p.position[i+2],old.position[i+2],'jaw remap changes no projection');
   if(lip||raw[1]>6.94||raw[1]<5.98||raw[2]<.18){assert.equal(p.position[i],old.position[i],'mouth, nose, eyes, upper face and neck stay exact');if(lip)lips++;}
   if(p.position[i]!==old.position[i])changed++;
   assert(Number.isFinite(Math.hypot(...p.normal.slice(i,i+3))));
  }
  for(let i=0;i<p.index.length;i+=3){
   const normals=[old,p].map(part=>{const [a,b,c]=Array.from(p.index.slice(i,i+3),j=>Array.from(part.position.slice(j*3,j*3+3))),u=b.map((x,k)=>x-a[k]),v=c.map((x,k)=>x-a[k]);return[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];});
   const [a,b]=normals;if(Math.hypot(...a)*Math.hypot(...b)>1e-16)assert(a.reduce((n,x,k)=>n+x*b[k],0)>0,'jaw remap cannot overturn the existing face triangles');
  }
  const widths=Object.fromEntries(Object.entries(points).map(([name,point])=>{const at=nearest(p,point);return[name,{before:Math.abs(old.position[at])*2000,after:Math.abs(p.position[at])*2000,middle:Math.abs(skin.position[at])*2000}];}));
  if(form==='male'&&jawWidth===.84)for(const value of Object.values(widths)){assert(value.after>value.before+3,'preferred endpoint opens the actual jaw/chin');assert(Math.abs(value.after-value.middle)<Math.abs(value.before-value.middle)*.35,'preferred endpoint approaches the current middle');}
  if(form==='male'&&jawWidth===1.12){assert(widths.chin.after>widths.chin.before+6,'wide endpoint visibly opens the chin');assert(widths.jawAngle.after>widths.jawAngle.before+10,'wide endpoint opens the mandibular angle');}
  assert.equal(JSON.stringify(traits),saved);assert.equal(shapePreferenceScore(traits),score);
  const look={culture:'china',bodyPreset:form==='male'?'masculine-lean':'feminine-balanced',hairStyle:form==='male'?'side-part':'chin-bob',shapeTraits:traits},actor=C.createCharacter(look),reload=C.createCharacter(JSON.parse(JSON.stringify(look)));
  assert.deepEqual(actor.root.userData.appearance,reload.root.userData.appearance);assert.equal(actor.root.userData.appearance.shapeTraits.jawWidth,jawWidth);actor.dispose();reload.dispose();
  rows.push({form,jawWidth,widthsMm:widths,changedSkinVertices:changed,protectedLipVertices:lips});
 }
}
assert.equal(C.characterResourceStats().activeReferences,0);console.log(JSON.stringify({status:'PASS',scope:'Male-only jaw response, female/mouth/other-feature protection, actual actor identity and genotype reload; visual review is separate',rows},null,2));
