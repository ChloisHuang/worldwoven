/** Reproduces isolated-tip projection and bridge height missing root/brow/base. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';
import path from 'node:path';import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const {ADULT_FORMS}=await import('../source/game/complete-adult/assets/adult-forms-data.js');
const {sculptCompleteAdultProfile,morphCompleteAdultAsset}=await import('../source/game/complete-adult/shape-traits.js');
const {frontSurface}=await import('../source/game/complete-adult/attachment-fit.js');
const refs={root:[0,7.2916,1.5075],bridge:[0,7.1046,1.583],tip:[0,6.909,1.6807],columella:[0,6.8268,1.6033],base:[0,6.7502,1.5635],lip:[0,6.6826,1.6019],brow:[.31,7.43,1.43]};
function nearest(part,point){let best=Infinity,at=0;for(let i=0;i<part.featureCoord.length;i+=3){let d=0;for(let k=0;k<3;k++)d+=(part.featureCoord[i+k]-point[k])**2;if(d<best){best=d;at=i;}}return Array.from(part.position.slice(at,at+3));}
function angle(part){const a=nearest(part,refs.columella),b=nearest(part,refs.base),c=nearest(part,refs.lip),u=[a[1]-b[1],a[2]-b[2]],v=[c[1]-b[1],c[2]-b[2]];return Math.acos((u[0]*v[0]+u[1]*v[1])/Math.hypot(...u)/Math.hypot(...v))*180/Math.PI;}
function faceNormal(p,ids){const [a,b,c]=Array.from(ids).map(i=>Array.from(p.slice(3*i,3*i+3))),u=b.map((x,k)=>x-a[k]),v=c.map((x,k)=>x-a[k]);return[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];}
const result=[];
for(const form of ['male','female']){
 const asset=ADULT_FORMS[form],original=asset.parts.map(p=>p.position.slice()),base=sculptCompleteAdultProfile(asset),skin=asset.parts.find(p=>p.material==='skin'),neutral=base.parts.find(p=>p.material==='skin');
 assert.equal(sculptCompleteAdultProfile(asset),base,'one neutral sculpt per immutable form');assert.equal(morphCompleteAdultAsset(base,null),base,'neutral trait selection is exact');
 for(let j=0;j<asset.parts.length;j++){
  const before=asset.parts[j],after=base.parts[j];assert.deepEqual(before.position,original[j],'source assets are not mutated');
  assert.equal(after.index,before.index,'same continuous topology');assert.equal(after.featureCoord,before.featureCoord);assert.equal(after.lipWeight,before.lipWeight);assert.equal(after.cavityWeight,before.cavityWeight);
  if(['sclera','iris','pupil'].includes(before.material))assert.equal(after,before,'eyes stay exact');
  for(let i=0;i<before.position.length;i+=3){assert.equal(after.position[i],before.position[i],'no width change');assert.equal(after.position[i+1],before.position[i+1],'no head/nose height change');}
 }
 let fixed=0,lips=0;
 for(let i=0;i<skin.position.length;i+=3){const raw=skin.featureCoord.slice(i,i+3),protectedRegion=raw[1]<=6.735||raw[1]>=7.61||Math.abs(raw[0])>=.57||raw[2]<=1.20,lip=skin.lipWeight[i/3]>.5;if(protectedRegion||lip){assert.equal(neutral.position[i+2],skin.position[i+2],'mouth, chin, cheek, upper forehead, neck and posterior positions stay exact');fixed++;if(lip)lips++;}}
 const delta=Object.fromEntries(Object.entries(refs).map(([k,p])=>[k,(nearest(neutral,p)[2]-nearest(skin,p)[2])*1000]));
 assert(delta.root>4&&delta.bridge>3&&delta.tip< -2.5&&delta.tip> -3.2&&delta.brow>2,'continuous supported profile replaces isolated bulb');assert(delta.base>0&&delta.columella>0);assert.equal(delta.lip,0);
 if(form==='male')assert(angle(neutral)>angle(skin)+15,'nasal base is visibly less pinched');else assert(angle(neutral)<angle(skin)+15,'female base correction respects the existing open transition');
 for(const part of base.parts.filter(p=>p.material==='brow'))for(let i=0;i<part.position.length;i+=3)assert(part.position[i+2]-frontSurface(neutral,part.position[i],part.position[i+1])>.0003,'neutral brow stays on the sculpted skin');
 const endpoints=[];
 for(const height of [.8,1.2]){
  const morphed=morphCompleteAdultAsset(base,{noseBridgeHeight:height}),p=morphed.parts.find(p=>p.material==='skin');
  for(const part of morphed.parts.filter(p=>p.material==='brow'))for(let i=0;i<part.position.length;i+=3)assert(part.position[i+2]-frontSurface(p,part.position[i],part.position[i+1])>.0003,'high/low bridge cannot swallow the brow');
  const d=Object.fromEntries(Object.entries(refs).map(([k,point])=>[k,(nearest(p,point)[2]-nearest(neutral,point)[2])*1000]));
  for(const k of ['root','bridge','brow','columella','base'])assert((height-1)*d[k]>0,k+' follows the bridge-height control');assert.equal(d.tip,0,'height cannot lengthen the tip');assert.equal(d.lip,0,'height cannot move the lips');
  for(let i=0;i<p.position.length;i+=3){assert.equal(p.position[i],neutral.position[i]);assert.equal(p.position[i+1],neutral.position[i+1]);const length=Math.hypot(...p.normal.slice(i,i+3));assert(Number.isFinite(length)&&Math.abs(length-1)<.002,'finite normalized surface normals');}
  let changedFaces=0;
  for(let i=0;i<skin.index.length;i+=3){const ids=skin.index.slice(i,i+3),a=faceNormal(skin.position,ids),b=faceNormal(p.position,ids),length=Math.hypot(...a)*Math.hypot(...b);if(length<1e-16)continue;assert(a.reduce((s,x,k)=>s+x*b[k],0)>0,'local sculpt cannot overturn a source triangle');changedFaces++;}
  endpoints.push({height,deltaFromNeutralMm:d,checkedFaces:changedFaces});
 }
 // Interpolated brow anatomy must also follow the skin between ribbon
 // vertices when the existing eye-size control reaches either endpoint.
 const browContacts=[];
 for(const traits of [{noseBridgeHeight:.8,eyeSize:1.2},{noseBridgeHeight:1.2,eyeSize:.82}]){
  const morphed=morphCompleteAdultAsset(base,traits),surface=morphed.parts.find(p=>p.material==='skin');let minimum=Infinity;
  for(const part of morphed.parts.filter(p=>p.material==='brow'))for(let i=0;i<part.index.length;i+=3){
   const vs=Array.from(part.index.slice(i,i+3),j=>Array.from(part.position.slice(j*3,j*3+3)));
   for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){
    const p=[0,0,0];for(let j=0;j<3;j++)for(let k=0;k<3;k++)p[k]+=vs[j][k]*weights[j];
    minimum=Math.min(minimum,p[2]-frontSurface(surface,p[0],p[1]));
   }
  }
  assert(minimum>-.000001,'brow triangle interiors must not cross the supported skin at combined eye/bridge endpoints');browContacts.push({traits,minimumClearanceMm:minimum*1000});
 }
 result.push({form,fixedVertices:fixed,protectedLipVertices:lips,neutralDeltaMm:delta,profileAngleDiagnostic:{before:angle(skin),after:angle(neutral)},browContacts,endpoints});
}
console.log(JSON.stringify({status:'PASS',scope:'Local geometry/control regression. Profile angle is an internal three-landmark diagnostic, not a clinical anatomy claim or visual acceptance.',result},null,2));
