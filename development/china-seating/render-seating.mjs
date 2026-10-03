// Production Three/Mesa prototype witness, one selected asset per process.
// This never imports or constructs a complete cultural lot.
import {init,createCanvas,installDOM,getDisplayInfo} from '/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js';
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const SOURCE=path.resolve('source'),OUT=path.resolve(process.env.OUT_DIR||''),CASE=process.env.CASE||'hall';
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner');assert(['hall','reading','throne'].includes(CASE));
assert(OUT.startsWith('/workspace/shared/worldwoven-chairs/qa/')&&!fs.existsSync(OUT),'Use a fresh isolated evidence directory');fs.mkdirSync(OUT,{recursive:true});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),files=['china-royal-seating.js','geometry.js','characters.js','character-shapes.js','character-wardrobe.js','stable-shadows.js'];
const manifest=()=>Object.fromEntries(files.filter(f=>fs.existsSync(SOURCE+'/game/'+f)).map(f=>[f,sha(fs.readFileSync(SOURCE+'/game/'+f))]));
const before=manifest(),report={status:'RUNNING',source:SOURCE,sourceHashes:before,case:CASE,frames:[],errors:[],scope:'Isolated exact production original seating, Three toon materials and (chair only) production seated character. No palace, browser, interaction or route acceptance claim.'};
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(SOURCE+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),S=await import(pathToFileURL(SOURCE+'/game/china-royal-seating.js')),G=await import(pathToFileURL(SOURCE+'/game/geometry.js')),Shadow=await import(pathToFileURL(SOURCE+'/game/stable-shadows.js'));
const canvas=createCanvas(800,800),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setSize(800,800,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const gl=renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');report.renderer={three:T.REVISION,display:getDisplayInfo(),version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)};assert(/Mesa|llvmpipe|softpipe/i.test(JSON.stringify(report.renderer)));
const scene=new T.Scene();scene.background=new T.Color(0xeae4d8);const hemi=new T.HemisphereLight(0xfff4d8,0x8a9992,.95),sun=new T.DirectionalLight(0xffedcd,1.6);scene.add(hemi,sun,sun.target);
report.shadowFilter=Shadow.configureStableShadows(renderer,sun);renderer.debug.onShaderError=(g,p,v,f)=>report.errors.push({program:g.getProgramInfoLog(p),vertex:g.getShaderInfoLog(v),fragment:g.getShaderInfoLog(f)});
const floor=new T.Group(),root=new T.Group();scene.add(floor,root);const throne=CASE==='throne';
G.box(floor,0,throne?.28:-.075,0,14,throne?.16:.15,14,0xd4cbb9);Shadow.applyWorldShadowPolicy(floor);Shadow.setStableShadowBounds(sun,new T.Box3(new T.Vector3(-6,-.2,-6),new T.Vector3(6,4.2,6)));
const object=throne?S.buildChinaDragonThrone(root,{x:0,y:0,z:0}):S.buildChinaRoyalChair(root,{x:0,y:0,z:0,variant:CASE});
const camera=new T.PerspectiveCamera(39,1,.03,80),target=throne?new T.Vector3(0,1.8,0):new T.Vector3(0,.83,0),k=throne?2.02:1;
const views={front:[0,.84,3.18],side:[3.10,.85,.37],rear:[-1.86,1.0,-2.76],threequarter:[1.95,1.17,2.78],cushion:[1.4,2.77,1.98]};
function render(label,view,actor=null){
 const offset=views[view];camera.position.copy(target).add(new T.Vector3(offset[0]*k,offset[1]*k,offset[2]*k));camera.lookAt(target);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
 renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);const pixels=Uint8Array.from(canvas.getImageData().data);renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);assert.equal(sha(pixels),sha(canvas.getImageData().data),'same-pose framebuffer repeat');
 const name=label+'-'+view+'.png';fs.writeFileSync(OUT+'/'+name,canvas.toBuffer('image/png'));
 report.frames.push({file:name,camera:camera.position.toArray(),target:target.toArray(),pixelSHA256:sha(pixels),pose:actor?.getPoseMetrics(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
}
try{
 report.asset=object.userData.royalSeating;for(const view of ['front','threequarter'])render('empty',view);
 if(!throne){
  const C=await import(pathToFileURL(SOURCE+'/game/characters.js'));
  const actor=C.createCharacter({culture:'china',bodyPreset:'masculine-lean',wardrobePreset:'scholar-tunic-trousers'});scene.add(actor.root);Shadow.applyCharacterShadowPolicy(actor.root);
  actor.root.position.set(0,.015,.275);actor.animate(1,false,'chair-sit',{seatHeight:.675-.015});actor.root.updateMatrixWorld(true);
  report.seated={anchor:actor.root.position.toArray(),yaw:0,seatY:.675,seatHeight:.660,scope:'Hall-seat relative transform and exact production chair-sit action, with original .275 front offset'};
  render('seated','threequarter',actor);render('seated','side',actor);
  camera.fov=50;camera.updateProjectionMatrix();target.copy(actor.root.position).add(new T.Vector3(0,Math.min(1.45,actor.getPoseMetrics().headHeight-.12),0));views.game=[Math.sin(.5)*Math.cos(.22)*4.6,Math.sin(.22)*4.6,Math.cos(.5)*Math.cos(.22)*4.6];render('seated','game',actor);actor.root.removeFromParent();actor.dispose();assert.equal(C.characterResourceStats().activeReferences,0);
 }else report.throneInteraction='No existing throne action. Old hall-local seatY 1.49 is preserved; old dais top .36 is 1.13 m below it, beyond the production pose seatHeight cap of 1 m. Do not infer usable seating from this decorative prototype.';
 report.sourceUnchanged=JSON.stringify(before)===JSON.stringify(manifest());assert(report.sourceUnchanged);assert.equal(report.errors.length,0);report.status='RENDERED_PENDING_VISUAL_REVIEW';
}catch(e){report.status='FAIL';report.errors.push(e.stack||String(e));process.exitCode=1;}
finally{fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');renderer.dispose();canvas.dispose();console.log(JSON.stringify({status:report.status,case:CASE,out:OUT,frames:report.frames.length,errors:report.errors}));}
