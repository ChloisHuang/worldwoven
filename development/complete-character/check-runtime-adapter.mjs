/** Narrow integration-contract check, not a morphology or all-world matrix. */
import {registerHooks} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const HERE=path.dirname(fileURLToPath(import.meta.url)),SOURCE=path.resolve(HERE,'../../source');
registerHooks({resolve(s,c,next){if(s==='three')return{url:pathToFileURL(SOURCE+'/vendor/three/build/three.module.js').href,shortCircuit:true};return next(s,c);}});
const T=await import('three'),{createApprovedSurfaces}=await import('../../source/game/approved-surfaces.js');
const A=await import('./runtime-adapter.mjs'),{ADULT_FORMS}=await import('./assets/adult-forms-data.mjs');
const palette={skin:0xdba789,hair:0x44342f,eyeColor:0x594b3f,clothes:0x65847b,accent:0xe7cab0};
const records=[];
for(const [form,bodyPreset,hairStyle,wardrobePreset]of [['male','masculine-lean','side-part','court-frock-coat'],['female','feminine-slender','chin-bob','court-gown']]){
 const opts={...palette,culture:'france',style:'casual',bodyPreset,hairStyle,wardrobePreset,masc:form==='male',shapeTraits:{jawWidth:1,legLength:1,eyeSize:1,noseSize:1,noseWidth:1,socketDepth:1},stableId:'review-'+form};
 const snapshot=structuredClone(opts),root=createApprovedSurfaces(opts),result=A.applyCompleteAdultPreview(root,opts);assert(result.applied);assert.deepEqual(opts,snapshot);
 const expected=JSON.parse(fs.readFileSync(path.join(HERE,form==='male'?'adult-head.json':'adult-head-female.json')));
 for(let i=0;i<expected.parts.length;i++)for(const key of ['position','normal','index'])assert.deepEqual(Array.from(ADULT_FORMS[form].parts[i][key]),Array.from(key==='index'?new Uint16Array(expected.parts[i][key]):new Float32Array(expected.parts[i][key])));
 let triangles=0,anchored=0;const channels=A.createCompleteAdultChannels(),pos=new T.Vector3();
 root.traverse(mesh=>{if(!mesh.isMesh)return;triangles+=mesh.geometry.index.count/3;const g=mesh.geometry,p=g.attributes.position;for(let i=0;i<p.count;i++){pos.fromBufferAttribute(p,i);A.appendCompleteAdultVertex(channels,mesh,i,pos);if(mesh.userData.completeAdultPart==='skin'&&pos.y<1.36){assert.deepEqual(A.completeAdultWeights(mesh,pos.y),[[2,1],[3,0]]);anchored++;}}});
 assert.equal(anchored,46);assert.equal(triangles,form==='male'?33316:29804);assert.equal(channels.featureKind.length*3,channels.featureCoord.length);assert.equal(channels.featureKind.length,channels.anatomicalTone.length);
 const merged=new T.BufferGeometry();A.finishCompleteAdultChannels(merged,channels);assert.equal(merged.attributes.featureCoord.count,channels.featureKind.length);merged.dispose();
 records.push({form,triangles,collarAnchors:anchored});root.traverse(m=>{if(m.isMesh)m.geometry.dispose();});
}
// One representative saved NPC request proves that the six incoming values and
// original geometry survive the explicitly documented non-neutral fallback.
const npc={...palette,culture:'france',style:'casual',masc:true,bodyPreset:'masculine-lean',hairStyle:'side-part',wardrobePreset:'court-frock-coat',id:'unchanged-resident',seed:19,shapeTraits:{jawWidth:.94,legLength:1.02,eyeSize:1.04,noseSize:.97,noseWidth:.91,socketDepth:1.20}};
const original=structuredClone(npc),root=createApprovedSurfaces(npc),head=root.getObjectByName('sculpted-head'),meshes=[...head.children];const result=A.applyCompleteAdultPreview(root,npc);assert.equal(result.applied,false);assert.equal(result.reason,'shape-traits-preserved-by-legacy-fallback');assert.deepEqual(npc,original);assert.deepEqual([...head.children],meshes);root.traverse(m=>{if(m.isMesh)m.geometry.dispose();});
console.log(JSON.stringify({status:'PASS',neutral:records,nonNeutralFallback:'identity, all six values and original meshes unchanged',activation:'none'}));
