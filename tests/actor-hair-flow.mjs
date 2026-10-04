/** Shader-channel/caching regression only: no reshaping or neutral rerender. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),C=await import('../source/game/characters.js');await import('../source/game/complete-adult/register.js');
const body=a=>{const meshes=[];a.root.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});return meshes;};
const fixtures=[{bodyPreset:'masculine-lean',culture:'france',wardrobePreset:'court-frock-coat',hairStyle:'low-bun',previewHair:'side-part',modelPreview:'complete-adult-pair-v1'}, {bodyPreset:'feminine-slender',culture:'france',wardrobePreset:'court-gown',hairStyle:'braided-tail',previewHair:'long-layered',modelPreview:'complete-adult-pair-v1'}, {bodyPreset:'feminine-balanced',culture:'china',wardrobePreset:'palace-consort-ruqun',hairStyle:'shoulder-wave',previewHair:'gathered-updo',modelPreview:'complete-adult-head-v1'}];
const result=[];
for(const options of fixtures){
 const off=C.createCharacter({...options,hair:0x362c2a,previewHairFlow:false}),on=C.createCharacter({...options,hair:0x362c2a,previewHairFlow:true}),light=C.createCharacter({...options,hair:0xb89965,previewHairFlow:true}),offAgain=C.createCharacter({...options,hair:0x362c2a,previewHairFlow:false}),legacy=C.createCharacter({...options,modelPreview:null});
 assert(on.root.userData.characterModel.applied);assert(on.root.userData.characterModel.hairFlow);assert.equal(on.root.userData.appearance.hairStyle,options.hairStyle);assert(!Object.hasOwn(on.root.userData.appearance,'previewHair'));assert(!Object.hasOwn(on.root.userData.appearance,'previewHairFlow'));
 const a=body(off),b=body(on),c=body(light),d=body(offAgain);assert.equal(a.length,2);assert.equal(b.length,2);let hairVertices=0;
 for(let bucket=0;bucket<2;bucket++){
  assert.notEqual(a[bucket].geometry,b[bucket].geometry);assert.notEqual(a[bucket].material,b[bucket].material);assert.equal(d[bucket].geometry,a[bucket].geometry);assert.equal(d[bucket].material,a[bucket].material);assert.notEqual(body(legacy)[bucket].material,b[bucket].material);
  for(const key of['position','normal','skinIndex','skinWeight']){assert.deepEqual(a[bucket].geometry.attributes[key].array,b[bucket].geometry.attributes[key].array);assert.deepEqual(b[bucket].geometry.attributes[key].array,c[bucket].geometry.attributes[key].array);}
  const ranges=b[bucket].geometry.userData.sourceRanges.filter(r=>/^hair-(layered|female)/.test(r.name)),g=b[bucket].geometry,baseDark=new T.Color(0x362c2a),baseLight=new T.Color(0xb89965);
  for(const range of ranges)for(let i=range.start;i<range.start+range.count;i++){
   assert.equal(g.attributes.featureKind.getX(i),6);assert.equal(a[bucket].geometry.attributes.featureKind.getX(i),0);
   for(const axis of['X','Y','Z'])assert(g.attributes.featureCoord['get'+axis](i)>=0&&g.attributes.featureCoord['get'+axis](i)<=1);
   for(const [axis,ch]of[['X','r'],['Y','g'],['Z','b']])assert(Math.abs(g.attributes.color['get'+axis](i)/baseDark[ch]-c[bucket].geometry.attributes.color['get'+axis](i)/baseLight[ch])<2e-6,'selected hair RGB keeps the same baked shade relationship');
   hairVertices++;
  }
 }
 assert(hairVertices>1000);result.push({hair:options.previewHair,hairVertices,geometryUnchanged:true,colorRatiosPreserved:true,separateFlowCaches:true});for(const actor of[off,on,light,offAgain,legacy])actor.dispose();
}
assert.equal(C.characterResourceStats().activeReferences,0);console.log(JSON.stringify({status:'PASS',result,scope:'Actual createCharacter channels, colors and cache/material isolation; not GL or art approval'},null,2));
