/** Male resident faces must expose independent saved traits at gameplay scale. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const {ADULT_FORMS}=await import('../source/game/complete-adult/assets/adult-forms-data.js');
const {sculptCompleteAdultProfile,morphCompleteAdultAsset}=await import('../source/game/complete-adult/shape-traits.js');
const {frontSurface}=await import('../source/game/complete-adult/attachment-fit.js');
const {npcShapeTraits}=await import('../source/game/appearance.js');
const base=sculptCompleteAdultProfile(ADULT_FORMS.male),skin=base.parts.find(p=>p.material==='skin');
const cases=[{eyeSize:.82},{socketDepth:1.65},{noseWidth:.8},{noseSize:1.18}],rows=[];
for(const traits of cases){
 const actual=morphCompleteAdultAsset(base,traits),linear=morphCompleteAdultAsset({...base,form:'linear-range-reference'},traits);let span=0,oldSpan=0;
 for(let j=0;j<base.parts.length;j++){const p=actual.parts[j],b=base.parts[j],old=linear.parts[j];assert.equal(p.index,b.index);assert.equal(p.featureCoord,b.featureCoord);
 for(let i=0;i<p.position.length;i+=3){assert(Number.isFinite(Math.hypot(...p.normal.slice(i,i+3))));for(let k=0;k<3;k++){span=Math.max(span,Math.abs(p.position[i+k]-b.position[i+k]));oldSpan=Math.max(oldSpan,Math.abs(old.position[i+k]-b.position[i+k]));}
 if(b.material==='skin'&&(b.position[i+1]<1.38||b.lipWeight[i/3]>.5))assert.deepEqual(p.position.slice(i,i+3),old.position.slice(i,i+3),'expanded response preserves existing neck and lip geometry');}
 }
 assert(span>oldSpan*1.4,'male control must expose a meaningfully wider geometric response');rows.push({traits,responseMm:span*1000,previousResponseMm:oldSpan*1000});
}
const endpoints=[{eyeSize:.82,noseWidth:1.18,noseSize:1.18,socketDepth:.65},{eyeSize:1.2,noseWidth:.8,noseSize:.8,socketDepth:1.65}];
for(const eyeSize of [.82,1,1.2])for(const socketDepth of [.65,1,1.65])endpoints.push({eyeSize,socketDepth});
for(const traits of endpoints){
 const asset=morphCompleteAdultAsset(base,traits),s=asset.parts.find(p=>p.material==='skin');
 for(const part of asset.parts.filter(p=>p.material==='brow'))for(let i=0;i<part.index.length;i+=3){const vs=Array.from(part.index.slice(i,i+3),j=>Array.from(part.position.slice(j*3,j*3+3)));for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){const p=[0,0,0];for(let j=0;j<3;j++)for(let k=0;k<3;k++)p[k]+=vs[j][k]*weights[j];assert(p[2]-frontSurface(s,p[0],p[1])>-.000001,'expanded eye/socket endpoints retain brow contact');}}
}
const residents=['cn-official-rites','cn-official-records','cn-official-justice'].map(id=>({id,traits:npcShapeTraits('china',id,1,1)}));
for(const resident of residents){const saved=JSON.stringify(resident.traits);morphCompleteAdultAsset(base,resident.traits);assert.equal(JSON.stringify(resident.traits),saved);assert.equal(JSON.stringify(npcShapeTraits('china',resident.id,1,1)),saved);assert.equal(Object.keys(resident.traits).length,6);}
assert.equal(new Set(residents.map(r=>JSON.stringify(r.traits))).size,3);
console.log(JSON.stringify({status:'PASS',scope:'Independent male rendering gains, preserved mouth/neck, endpoint brow contact and stable six-trait resident identity. Visual review is separate.',rows,residents},null,2));
