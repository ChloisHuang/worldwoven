/** Actual createCharacter: pinned light-skin midface comparison and diagnostics. */
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const ROOT=path.resolve(process.env.SOURCE_ROOT||'.'),OUT=path.resolve(process.env.OUT_DIR||'qa/midface-support');
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
// This fixture changes display palette only. No race/score/generation rule.
const base={culture:'france',bodyPreset:'feminine-slender',wardrobePreset:'court-gown',hairStyle:'low-bun',skin:0xe6bfa3,hair:0x34271f,clothes:0x767878,accent:0xc6ab67,eyeColor:0x4b3324,shapeTraits:{}};
const opts={...base,modelPreview:'complete-adult-pair-v1',previewHair:'long-layered',previewHairFlow:true};
const hash=array=>createHash('sha256').update(Buffer.from(array.buffer,array.byteOffset,array.byteLength)).digest('hex');
function fingerprint(actor){const rows=[];actor.root.traverse(m=>{if(!m.isSkinnedMesh)return;rows.push({section:m.geometry.userData.section,attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,hash(a.array)])),index:hash(m.geometry.index.array),material:{type:m.material.type,ramp:[...m.material.gradientMap.image.data],program:m.material.customProgramCacheKey()}});});return rows;}
const ordinary=C.createCharacter(base),ordinaryModel=ordinary.root.userData.characterModel,ordinaryFingerprint=fingerprint(ordinary);assert.equal(ordinaryModel.applied,false);ordinary.dispose();
const bare=C.createCharacter(opts),made=C.createCharacter({...opts,previewMakeup:'natural'});
assert.equal(bare.root.userData.characterModel.applied,true);assert.equal(made.root.userData.characterModel.applied,true);
const bareFingerprint=fingerprint(bare),makeupFingerprint=fingerprint(made);
for(let i=0;i<bareFingerprint.length;i++){
 assert.deepEqual(bareFingerprint[i].attributes,makeupFingerprint[i].attributes);
 assert.equal(bareFingerprint[i].index,makeupFingerprint[i].index);
}
const skins=a=>a.root.getObjectByName('approved-face-skin').material;
const clothes=a=>a.root.getObjectByName('continuous-tailored-cloth').material;
const repeats=C.createCharacter({...opts,previewMakeup:'natural'});
assert.equal(skins(repeats),skins(made));repeats.dispose();
assert.equal(clothes(bare),clothes(made));
if(!process.env.BASELINE_ONLY){assert.notEqual(skins(bare),skins(made));assert.equal(made.root.userData.characterModel.makeup,'natural');}
const report={scope:'Isolated actual-createCharacter render, not a France world screenshot; pinned light skin, long hair, neutral 10 parameters, camera and lights; sculpt changes are confined to female anterior cheek skin',baseCommit:'49c744a00d6dc1a0681a0e1f290d5f4b0dcb154c',options:opts,ordinaryModel,ordinaryFingerprint,bareFingerprint,makeupFingerprint,models:{bare:bare.root.userData.characterModel,makeup:made.root.userData.characterModel},renderer:{outputColorSpace:renderer.outputColorSpace,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,shadowMap:renderer.shadowMap.enabled},lights:[hemi,sun,fill].map(l=>({type:l.type,color:l.color.getHex(),ground:l.groundColor?.getHex(),intensity:l.intensity,position:l.position.toArray()})),frames:[],errors};
fs.mkdirSync(OUT,{recursive:true});
if(process.env.DIAGNOSTIC)for(const actor of[bare,made])actor.root.traverse(mesh=>{
 if(!mesh.isSkinnedMesh)return;
 const kind=mesh.geometry.attributes.featureKind,c=mesh.geometry.attributes.color;
 if(kind&&c)for(let i=0;i<c.count;i++)if(kind.getX(i)>.5&&kind.getX(i)<1.5)c.setXYZ(i,.46,.46,.46);
 if(c)c.needsUpdate=true;
 if(process.env.DIAGNOSTIC==='lambert')mesh.material=new T.MeshLambertMaterial({vertexColors:true,side:mesh.material.side});
});
report.diagnostic=process.env.DIAGNOSTIC||null;
const yaw=-Math.PI/4,focus=new T.Vector3(0,1.565*bare.root.scale.y,-.01),close=new T.OrthographicCamera(-.19,.19,.19,-.19,.01,10);
close.position.copy(focus).add(new T.Vector3(Math.sin(yaw)*2,0,Math.cos(yaw)*2));close.lookAt(focus);
const front=close.clone();front.position.copy(focus).add(new T.Vector3(0,0,2));front.lookAt(focus);
const game=new T.PerspectiveCamera(50,1280/720,.2,150),gameFocus=new T.Vector3(0,.97,0),distance=4.6,pitch=.22;
game.position.copy(gameFocus).add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance));game.lookAt(gameFocus);
function save(actor,camera,name,w,h){
 renderer.setSize(w,h,false);actor.animate(0,false,null);scene.add(actor.root);actor.root.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.getContext().finish();
 assert.equal(renderer.getContext().getError(),0);assert.equal(errors.length,0);assert.equal(renderer.info.render.calls,2);
 fs.writeFileSync(OUT+'/'+name+'.png',canvas.toBuffer('image/png'));
 report.frames.push({name,width:w,height:h,position:camera.position.toArray(),projection:camera.projectionMatrix.toArray(),triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});actor.root.removeFromParent();
}
if(!process.env.BASELINE_ONLY)for(const [name,actor]of[['bare',bare],['natural',made]]){
 if(process.env.ALL_ANGLES){save(actor,front,'light-'+name+'-front-detail',640,640);save(actor,close,'light-'+name+'-threequarter-detail',640,640);}
 else if(process.env.FRONT_ONLY)save(actor,front,'light-'+name+'-front-detail',640,640);
 else{save(actor,close,'light-'+name+'-threequarter-detail',640,640);save(actor,game,'light-'+name+'-threequarter-game',1280,720);}
}
bare.dispose();made.dispose();report.resourceStats=C.characterResourceStats();report.remainingReferences=report.resourceStats.activeReferences;assert.equal(report.remainingReferences,0);
report.maxRssMiB=process.resourceUsage().maxRSS/1024;report.status='RENDERED_PENDING_VISUAL_REVIEW';
fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out:OUT,frames:report.frames,maxRssMiB:report.maxRssMiB,errors}));renderer.dispose();canvas.dispose();
