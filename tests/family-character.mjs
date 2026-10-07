import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../source');
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:pathToFileURL(source+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(specifier,context);}});
const THREE=await import('three');
const {createFamilyCharacter,ageStage,stageLabel,applyAgeStage}=await import('../source/game/family-character.js');
const {createCharacter,characterResourceStats}=await import('../source/game/characters.js');
for(const [age,stage]of [[0,'infant'],[1.99,'infant'],[2,'child'],[11.99,'child'],[12,'adolescent'],[17.99,'adolescent'],[18,'adult'],[59.99,'adult'],[60,'elder']])assert.equal(ageStage(age),stage);
assert.equal(stageLabel(12),'青少年');for(const age of [null,undefined,NaN])assert.equal(ageStage(age),'unknown');
for(const country of['china','japan','egypt','france'])for(const ageYears of[0,2,8,12,17]){
 const a=createFamilyCharacter({ageYears,country,seed:42,bodyPreset:'feminine-curvy',wardrobePreset:'onsen-swimwear'});
 assert(a.root.userData.familyMinor);let skinned=0;a.root.traverse(o=>{if(o.isSkinnedMesh)skinned++;if(o.geometry)for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v));});assert.equal(skinned,0,'No adult body geometry on minors');
 a.root.position.set(2,0,3);a.root.rotation.y=.5;for(let i=0;i<15;i++)a.animate(i/8,true);
 assert.deepEqual(a.root.position.toArray(),[2,0,3]);assert.equal(a.root.rotation.y,.5);assert(a.getPoseMetrics().height>0);
 assert(a.root.getObjectByName(ageYears<2?'closed-swaddle':'loose-tunic'));
 const b=new THREE.Box3().setFromObject(a.root,true);assert(Math.abs(b.min.y)<.003,`${country} age ${ageYears} feet/cradle must stay grounded: ${b.min.y}`);
 a.dispose();a.dispose();assert(a.root.userData.disposed);
}
const baseline=characterResourceStats().activeReferences,a=createCharacter({culture:'china'}),b=createCharacter({culture:'china'});
a.root.position.set(4,0,8);a.root.rotation.y=.4;const originals=[];a.root.traverse(o=>{if(o.isSkinnedMesh)originals.push([o,o.geometry,o.material,Array.from(o.geometry.attributes.color.array)]);});
applyAgeStage(a,68);assert.equal(a.root.userData.ageStage,'elder');assert.deepEqual(a.root.position.toArray(),[4,0,8]);assert.equal(a.root.rotation.y,.4);
assert(originals.some(([mesh,geometry])=>mesh.geometry!==geometry),'Elder hair has private geometry');
for(const [mesh,geometry,material,colors]of originals){assert.deepEqual(Array.from(geometry.attributes.color.array),colors);assert.equal(mesh.material,material);}
const chest=a.root.getObjectByName('chest');a.animate(1,false);const q=chest.quaternion.clone();for(let i=0;i<20;i++)a.animate(1,false);assert(q.angleTo(chest.quaternion)<1e-6,'Age offset cannot accumulate');
a.animate(2,false,'chair-sit');assert(a.getPoseMetrics().grounded);applyAgeStage(a,40);for(const [mesh,geometry]of originals)assert.equal(mesh.geometry,geometry);applyAgeStage(a,70);a.dispose();b.dispose();assert.equal(characterResourceStats().activeReferences,baseline);
console.log('PASS: stage boundaries, all-country minor coverage, grounded geometry, adult identity/shared-resource isolation, posture idempotence and disposal');
if(process.env.FAMILY_RENDER_DIR){
 const webgl=await import(pathToFileURL(process.env.WEBGL_MODULE??'/tmp/worldwoven-st05-render/node_modules/@onirenaud/node-webgl/dist/index.js'));
 webgl.installDOM({fetch:false});webgl.init({api:'gles'});
 const canvas=webgl.createCanvas(1280,800),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(1280,800,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),gpu=gl.getParameter(debug.UNMASKED_RENDERER_WEBGL);assert(/Mesa|llvmpipe|softpipe/i.test(gpu));
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe1e9df);scene.add(new THREE.HemisphereLight(0xfff5de,0x758878,2));const sun=new THREE.DirectionalLight(0xfff0dc,2.2);sun.position.set(-4,8,6);scene.add(sun);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,12),new THREE.MeshStandardMaterial({color:0xb6c5ac}));floor.rotation.x=-Math.PI/2;scene.add(floor);
 const ages=[0,2,8,14,24,68],actors=ages.map((ageYears,i)=>{const actor=createFamilyCharacter({ageYears,country:'china',seed:42,clothes:0x71959e,variant:1});actor.root.position.x=(i-2.5)*.95;actor.root.rotation.y=-.13;scene.add(actor.root);return actor;});
 const camera=new THREE.PerspectiveCamera(50,1280/800,.05,30);camera.position.set(3.8,3.4,7.4);camera.lookAt(0,.7,0);fs.mkdirSync(process.env.FAMILY_RENDER_DIR,{recursive:true});
 for(const [name,time,walking]of [['stages-standing',0,false],['stages-walking',.3,true]]){actors.forEach(a=>a.animate(time,walking));renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);fs.writeFileSync(path.join(process.env.FAMILY_RENDER_DIR,name+'.png'),canvas.toBuffer('image/png'));}
 fs.writeFileSync(path.join(process.env.FAMILY_RENDER_DIR,'report.json'),JSON.stringify({gpu,ages,camera:camera.position.toArray(),scope:'Actual lifecycle model lineup from third-person perspective, not integrated gameplay'},null,2));
 actors.forEach(a=>a.dispose());renderer.dispose();canvas.dispose();console.log('Rendered actual Three lifecycle models:',process.env.FAMILY_RENDER_DIR);
}
