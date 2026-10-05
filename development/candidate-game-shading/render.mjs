/** Bounded actual-createCharacter comparison: fixed geometry, palette and light. */
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const ROOT=path.resolve(process.env.SOURCE_ROOT||'.'),OUT=path.resolve(process.env.OUT_DIR||'qa/candidate-game-shading/after');
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(ROOT+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
const {init,createCanvas,installDOM}=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');
installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),C=await import(pathToFileURL(ROOT+'/source/game/characters.js'));
await import(pathToFileURL(ROOT+'/source/game/complete-adult/register.js'));
const canvas=createCanvas(640,640),renderer=new T.WebGLRenderer({canvas,antialias:true});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const errors=[];renderer.debug.onShaderError=(gl,p,v,f)=>errors.push({program:gl.getProgramInfoLog(p),vertex:gl.getShaderInfoLog(v),fragment:gl.getShaderInfoLog(f)});
const scene=new T.Scene();scene.background=new T.Color(0xd9ddcf);
const hemi=new T.HemisphereLight(0xfff4df,0x718079,1.05),sun=new T.DirectionalLight(0xfff3dc,1.55),fill=new T.DirectionalLight(0xb7c6d5,.22);
sun.position.set(-2,3,4);fill.position.set(3,2,-2);scene.add(hemi,sun,fill);
const base={culture:'france',bodyPreset:'feminine-balanced',wardrobePreset:'court-overgown',hairStyle:'low-bun',skin:0x744d33,hair:0x34271f,clothes:0x767878,accent:0xc6ab67,eyeColor:0x4b3324,shapeTraits:{}};
const opts={...base,modelPreview:'complete-adult-pair-v1',previewHair:'gathered-updo',previewHairFlow:true};
const hash=array=>createHash('sha256').update(Buffer.from(array.buffer,array.byteOffset,array.byteLength)).digest('hex');
function fingerprint(actor){const rows=[];actor.root.traverse(m=>{if(!m.isSkinnedMesh)return;rows.push({section:m.geometry.userData.section,attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,hash(a.array)])),index:hash(m.geometry.index.array),material:{type:m.material.type,ramp:[...m.material.gradientMap.image.data],program:m.material.customProgramCacheKey()}});});return rows;}
const legacy=C.createCharacter(base),legacyModel=legacy.root.userData.characterModel,legacyFingerprint=fingerprint(legacy);assert.equal(legacyModel.applied,false);legacy.dispose();
const actor=C.createCharacter(opts);assert.equal(actor.root.userData.characterModel.applied,true);actor.animate(0,false,null);scene.add(actor.root);
const report={scope:'Actual opt-in createCharacter, neutral female; geometry fixed to 92770a6; no scene shader or light changes',options:opts,model:actor.root.userData.characterModel,legacyModel,legacyFingerprint,candidateFingerprint:fingerprint(actor),renderer:{outputColorSpace:renderer.outputColorSpace,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,shadowMap:renderer.shadowMap.enabled},lights:[hemi,sun,fill].map(l=>({type:l.type,color:l.color.getHex(),ground:l.groundColor?.getHex(),intensity:l.intensity,position:l.position.toArray()})),frames:[],errors};
fs.mkdirSync(OUT,{recursive:true});
function save(camera,name,w,h){
 renderer.setSize(w,h,false);actor.root.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.getContext().finish();
 assert.equal(renderer.getContext().getError(),0);assert.equal(errors.length,0);
 assert.equal(renderer.info.render.calls,2);assert.equal(renderer.info.render.triangles,34510);
 fs.writeFileSync(OUT+'/'+name+'.png',canvas.toBuffer('image/png'));
 report.frames.push({name,width:w,height:h,position:camera.position.toArray(),projection:camera.projectionMatrix.toArray(),triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});
}
const yaw=-Math.PI/4,focus=new T.Vector3(0,1.565*actor.root.scale.y,-.01),close=new T.OrthographicCamera(-.19,.19,.19,-.19,.01,10);
close.position.copy(focus).add(new T.Vector3(Math.sin(yaw)*2,0,Math.cos(yaw)*2));close.lookAt(focus);save(close,'neutral-threequarter-detail',640,640);
const game=new T.PerspectiveCamera(50,1280/720,.2,150),gameFocus=new T.Vector3(0,.97,0),distance=4.6,pitch=.22;
game.position.copy(gameFocus).add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance));game.lookAt(gameFocus);save(game,'neutral-threequarter-game',1280,720);
actor.root.removeFromParent();actor.dispose();report.remainingReferences=C.characterResourceStats().activeReferences;assert.equal(report.remainingReferences,0);
report.maxRssMiB=process.resourceUsage().maxRSS/1024;report.status='RENDERED_PENDING_VISUAL_REVIEW';
fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out:OUT,frames:report.frames.length,maxRssMiB:report.maxRssMiB,errors}));renderer.dispose();canvas.dispose();
