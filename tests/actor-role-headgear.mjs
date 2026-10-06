/** Regression for crown clipping/floating hats after selecting a saved cut.
 * Generated geometry is tested across every body/culture/cut/work-hat route.
 * This is a template/contact contract; it does not claim accepted visual art. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),{createApprovedSurfaces}=await import('../source/game/approved-surfaces.js');
const {BODY_PRESETS,HAIR_STYLES,WARDROBE_PRESETS}=await import('../source/game/appearance.js');
const {ADULT_FORMS}=await import('../source/game/complete-adult/assets/adult-forms-data.js');
const {sculptCompleteAdultProfile,morphCompleteAdultAsset}=await import('../source/game/complete-adult/shape-traits.js');
const {attachCompleteHead}=await import('../source/game/complete-adult/attach-head.js');
const {createHeadAttachmentFit}=await import('../source/game/complete-adult/attachment-fit.js');
const {planSavedHairstyle,applySavedHairstyle}=await import(process.env.SAVED_HAIR_MODULE?pathToFileURL(path.resolve(process.env.SAVED_HAIR_MODULE)).href:'../source/game/complete-adult/saved-hairstyle-fit.js');
const {fitCompleteAdultRoleHeadgear,ROLE_HEADGEAR}=await import('../source/game/complete-adult/role-headgear-fit.js');
function protectedSamples(head,seat){
 const bins=new Map();
 for(const mesh of head.children){if(!['skin','hair','long-hair'].includes(mesh.userData.completeAdultPart))continue;const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y<seat+.0005)continue;
   const radius=Math.hypot(x,z+.025),angle=(Math.atan2(x,z+.025)+Math.PI*2)%(Math.PI*2),key=Math.floor(angle/(Math.PI*2)*48)+'|'+Math.floor((y-seat)/.004),before=bins.get(key);
   if(!before||radius>before.radius)bins.set(key,{x,y,z,radius});
  }
 }return [...bins.values()];
}
function crownClearance(head,shell,seat){
 const p=shell.geometry.attributes.position,ix=shell.geometry.index,triangles=[];
 for(let j=0;j<ix.count;j+=3){const points=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,ix.getX(j+k)));triangles.push({points,lo:Math.min(...points.map(v=>v.y)),hi:Math.max(...points.map(v=>v.y))});}
 const ray=new T.Ray(),hit=new T.Vector3();let minimum=Infinity,count=0;
 for(const q of protectedSamples(head,seat)){
  const radius=Math.hypot(q.x,q.z+.025);ray.origin.set(0,q.y,-.025);ray.direction.set(q.x/radius+1e-8,0,(q.z+.025)/radius).normalize();let outside=-Infinity;
  for(const t of triangles){if(q.y<t.lo||q.y>t.hi)continue;if(ray.intersectTriangle(...t.points,false,hit))outside=Math.max(outside,hit.distanceTo(ray.origin));}
  assert(Number.isFinite(outside),JSON.stringify({message:'hat must enclose crown above its opening',name:shell.name,seat,point:q,lowest:p.getY(0)}));minimum=Math.min(minimum,outside-radius);count++;
 }return{minimum,count};
}
let cases=0,noHat=0,samples=0,minClearance=Infinity;const forms=new Set(),cuts=new Set(),cultures=new Set();
for(const culture of ['japan','china','egypt','france'])for(const bodyPreset of BODY_PRESETS)for(const hairStyle of HAIR_STYLES)for(const style of ['chef','artist','gardener']){
 const masc=bodyPreset.startsWith('masculine'),form=masc?'male':'female',options={culture,masc,bodyPreset,hairStyle,style,wardrobePreset:WARDROBE_PRESETS[culture][masc?'masculine':'feminine'][0],skin:0xc99b77,hair:0x44342f,clothes:0x65847b,accent:0xcdb887,eyeColor:0x594b3f};
 const identity=JSON.stringify(options),root=createApprovedSurfaces(options),head=root.getObjectByName('sculpted-head'),asset=morphCompleteAdultAsset(sculptCompleteAdultProfile(ADULT_FORMS[form]),options.shapeTraits),fit=createHeadAttachmentFit(head,asset,ADULT_FORMS[form]);
 const hair=planSavedHairstyle(root,options,fit,asset);assert(hair.supported,JSON.stringify({...options,reason:hair.reason}));
 attachCompleteHead(root,{skin:options.skin,hair:options.hair,iris:options.eyeColor,pupil:0x25252a,brow:options.hair},asset,{surface:true});applySavedHairstyle(hair);
 const original=new Map();root.traverse(m=>{if(m.isMesh)original.set(m,{p:m.geometry.attributes.position.array.slice(),color:m.material.color.getHex(),indices:m.geometry.index.array.length});});
 const result=fitCompleteAdultRoleHeadgear(head,options,fit);assert.equal(JSON.stringify(options),identity);
 root.traverse(m=>{if(!m.isMesh)return;const old=original.get(m);assert(old);assert.equal(m.material.color.getHex(),old.color,'role/identity colors stay exact');if(!ROLE_HEADGEAR.test(m.name))assert.deepEqual(m.geometry.attributes.position.array,old.p,'only authored hats may change');else assert(m.geometry.attributes.position.array.every(Number.isFinite));});
 if(style==='artist'&&culture!=='france'){assert.equal(result.applied,false);assert.equal(result.reason,'no-authored-headgear');noHat++;}
 else{
  assert(result.applied);assert(result.seatY<result.hairTop-.015,'opening seats around the crown');assert(result.topY>result.hairTop+.010);assert(result.topY<1.85,'hat remains inside authored navigation clearance');
  const name={chef:'cook-soft-cap',artist:'artist-beret',gardener:'garden-straw-crown'}[style],shell=head.getObjectByName(name),contact=crownClearance(head,shell,result.seatY);
  assert(contact.minimum>-.00025,JSON.stringify({culture,bodyPreset,hairStyle,style,...contact}));minClearance=Math.min(minClearance,contact.minimum);samples+=contact.count;
  assert.equal(shell.geometry.index.count,original.get(shell).indices+72,'closed top preserves source shell and adds one small cap');
  assert.equal(fitCompleteAdultRoleHeadgear(head,options,fit),result,'template fit is idempotent');assert.deepEqual(JSON.parse(JSON.stringify(result)),result,'fit metadata contains no geometry objects');
  if(style==='gardener'){const brim=head.getObjectByName('garden-straw-brim').geometry.boundingBox,crown=shell.geometry.boundingBox;assert(brim.max.x-brim.min.x>(crown.max.x-crown.min.x)*1.18,'straw brim remains wider than crown');}
 }
 cases++;forms.add(bodyPreset);cuts.add(hairStyle);cultures.add(culture);root.traverse(m=>{if(m.isMesh)m.geometry.dispose();});
}
console.log(JSON.stringify({status:'PASS',cases,noHat,bodyPresets:[...forms],hairStyles:[...cuts],cultures:[...cultures],crownSamples:samples,minClearance,scope:'Real complete-head and saved-hair geometry; all authored work hats, absent non-French berets, unchanged identity/body/hair/colors, closed hat tops and idempotence. Offline art review is separate.'},null,2));
