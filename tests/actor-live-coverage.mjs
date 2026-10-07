/** Bounded C01 matrix for real saved hairstyles, headgear and wardrobe seams.
 * These axes used to fall back or silently collapse to a single hairstyle.
 * No world simulation or unrelated career paths are replayed here. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const C=await import('../source/game/characters.js'),A=await import('../source/game/appearance.js');
const {resolvePlayerWardrobe}=await import('../source/game/player-wardrobe.js');
const {createJapanVisitorIdentity}=await import('../source/game/japan-visitors.js');
await import('../source/game/character-live-entry.js');
const selectedHair=process.env.C01_HAIR_FILTER?.split(',');
const hairstyles=A.HAIR_STYLES.filter(h=>!selectedHair||selectedHair.includes(h));assert(hairstyles.length);
const counts={},failures=[],signatures=new Map();let checked=0;
function check(options,label){
 const input=JSON.stringify(options),actor=C.createCharacter(options),model=actor.root.userData.characterModel;
 try{
  assert(model.applied,label+': '+model.reason);assert.equal(model.previewHair,'saved');
  assert.equal(JSON.stringify(options),input,'renderer must not mutate identity');
  assert.equal(actor.root.userData.appearance.hairStyle,options.hairStyle);
  let head=false,hair=0,hat=0;const hash=createHash('sha256');
  actor.root.traverse(m=>{if(!m.isSkinnedMesh)return;const p=m.geometry.attributes.position;assert(p.array.every(Number.isFinite));
   for(const r of m.geometry.userData.sourceRanges){if(r.name==='continuous-head-anatomical-head-neck')head=true;
    if(/hair|fringe|combed|side-flow|side-lock/.test(r.name)&&!/^court-official-facial/.test(r.name)){hair+=r.count;hash.update(Buffer.from(p.array.buffer,p.array.byteOffset+r.start*12,r.count*12));}
    if(/cook-.*cap|artist-beret|garden-straw/.test(r.name))hat+=r.count;
   }
  });
  assert(head&&hair>0,'real head and hairstyle geometry required');
  if(['chef','gardener'].includes(options.style)||options.style==='artist'&&options.culture==='france')assert(hat>0,'authored occupational hat survives');
  actor.animate(0,false,null);actor.root.updateMatrixWorld(true);assert(actor.getPoseMetrics().feet.flat().every(Number.isFinite));
  if(options.style==='casual'&&options.wardrobePreset===A.WARDROBE_PRESETS[options.culture][options.bodyPreset.startsWith('masculine')?'masculine':'feminine'][0]){
   const key=options.culture+'|'+options.bodyPreset;let styles=signatures.get(key);if(!styles)signatures.set(key,styles=new Map());styles.set(options.hairStyle,hash.digest('hex'));
  }
  checked++;counts[options.culture]=(counts[options.culture]??0)+1;
 }catch(error){failures.push({label,error:error.message});}finally{actor.dispose();}
}
for(const culture of ['china','japan','egypt','france']){
 for(const bodyPreset of A.BODY_PRESETS){
  const sex=bodyPreset.startsWith('masculine')?'masculine':'feminine';
  const wardrobes=[...A.WARDROBE_PRESETS[culture][sex],...(A.ROLE_WARDROBE_PRESETS[culture]??[]),'bath-robe',...(culture==='japan'?['onsen-swimwear']:[])];
  for(const hairStyle of hairstyles)for(const wardrobePreset of wardrobes)for(const style of ['casual','chef','artist','gardener']){
   const options={culture,bodyPreset,hairStyle,wardrobePreset,style,skin:0xdfb18d,hair:0x382d27,eyeColor:0x52392b};
   check(options,[culture,bodyPreset,hairStyle,wardrobePreset,style].join('/'));
  }
 }
 console.error('C01 matrix',culture,counts[culture],failures.length);
}
for(const [key,styles]of signatures){assert.equal(styles.size,hairstyles.length,key);assert.equal(new Set(styles.values()).size,hairstyles.length,key+' must render distinct saved hairstyle meshes');}
// Existing dynamic visitor identity and occupational wardrobe resolvers use
// the same final renderer without rewriting the six-trait saved identity.
for(let number=1;number<=8;number++){
 const visit=createJapanVisitorIdentity({id:'japan-visitor-'+number,number},41,1),before=JSON.stringify(visit);
 check({...visit.appearance,culture:'japan'},'dynamic-visitor-'+number);assert.equal(JSON.stringify(visit),before);
}
for(const bodyPreset of A.BODY_PRESETS){
 const state=A.createAppearanceState(41,{extended:false});state.player.bodyPreset=bodyPreset;
 for(const hairStyle of hairstyles){state.player.hairStyle=hairStyle;const before=JSON.stringify(state),reload=JSON.parse(before);
  for(const request of [{region:'china',dutyPreset:'jinyi-training'},{region:'japan',servicePreset:'bath-robe'},{region:'japan',bath:{kind:'bath',bathWardrobePreset:'onsen-swimwear'}},{region:'china',dutyPreset:'jinyi-training',preview:true}]){
   const resolved=resolvePlayerWardrobe({appearance:reload,...request});check({...resolved.look,culture:request.region,previewSubject:'player'},'player-'+resolved.source);
  }
  assert.equal(JSON.stringify(reload),before);assert.equal(JSON.stringify(state),before);
 }
}
assert.equal(C.characterResourceStats().activeReferences,0);assert.equal(failures.length,0,JSON.stringify(failures.slice(0,25),null,2));
console.log(JSON.stringify({status:'PASS',checked,counts,hairstyles,distinctSavedStyles:true,failures,scope:'Real createCharacter merged geometry and finite neutral pose across the selected currently normalized body/hair/wardrobe/style combinations; no browser or art acceptance claim'},null,2));
