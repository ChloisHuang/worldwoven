import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..'),OUT=path.resolve(process.env.OUT_DIR||ROOT+'/qa/head-profile/before');
registerHooks({resolve(s,c,next){if(s==='three')return{url:pathToFileURL(ROOT+'/source/vendor/three/build/three.module.js').href,shortCircuit:true};return next(s,c);}});
const {init,createCanvas,installDOM}=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),C=await import('../../source/game/characters.js'),{installActorPreview}=await import('../../source/game/complete-adult/selection.js'),{shapePreferenceScore}=await import('../../source/game/character-traits.js');installActorPreview();
const canvas=createCanvas(640,640),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const scene=new T.Scene();scene.background=new T.Color(0xd9ddcf);const hemi=new T.HemisphereLight(0xfff4df,0x718079,1.05),sun=new T.DirectionalLight(0xfff3dc,1.55),fill=new T.DirectionalLight(0xb7c6d5,.22);sun.position.set(-2,3,4);fill.position.set(3,2,-2);scene.add(hemi,sun,fill);
fs.mkdirSync(OUT,{recursive:true});const frames=[],gl=renderer.getContext();
const high={jawWidth:.868,legLength:1.048,eyeSize:1.162,noseSize:.838,noseWidth:.838,socketDepth:1.55};
const base={culture:'france',bodyPreset:'feminine-balanced',wardrobePreset:'court-overgown',hairStyle:'low-bun',skin:0x744d33,hair:0x34271f,clothes:0x767878,accent:0xc6ab67,eyeColor:0x4b3324};
const cases=process.env.CASES?.split(',')||['high','neutral','male'];
function save(actor,camera,name,w=640,h=640){renderer.setSize(w,h,false);actor.root.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);fs.writeFileSync(OUT+'/'+name+'.png',canvas.toBuffer('image/png'));frames.push({name,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});}
const report={scope:'actual createCharacter; representative high-score traits, not recovered user save; fixed palette, light and camera across before/after',cases:{},frames};
for(const name of cases){const opts={...base,...(name==='male'?{bodyPreset:'masculine-lean',wardrobePreset:'court-frock-coat',hairStyle:'side-part'}:{}),shapeTraits:name==='high'?high:{}};const actor=C.createCharacter(opts);scene.add(actor.root);actor.animate(0,false,null);report.cases[name]={options:opts,score:shapePreferenceScore(opts.shapeTraits),model:actor.root.userData.characterModel};
 for(const [view,a] of [['side',-Math.PI/2],['threequarter',-Math.PI/4]]){
  const focus=new T.Vector3(0,1.49*actor.root.scale.y,-.01),c=new T.OrthographicCamera(-.31,.31,.31,-.31,.01,10);c.position.copy(focus).add(new T.Vector3(Math.sin(a)*2,0,Math.cos(a)*2));c.lookAt(focus);save(actor,c,name+'-'+view+'-detail');
  if(name==='high'){const f=new T.Vector3(0,.97,0),g=new T.PerspectiveCamera(50,1280/720,.2,150),distance=2.6,pitch=.08;g.position.copy(f).add(new T.Vector3(Math.sin(a)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(a)*Math.cos(pitch)*distance));g.lookAt(f);save(actor,g,name+'-'+view+'-game',1280,720);}
 }
 actor.root.removeFromParent();actor.dispose();}
assert.equal(C.characterResourceStats().activeReferences,0);report.status='RENDERED_PENDING_VISUAL_REVIEW';report.maxRssMiB=process.resourceUsage().maxRSS/1024;fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out:OUT,frames:frames.length,maxRssMiB:report.maxRssMiB}));renderer.dispose();canvas.dispose();
