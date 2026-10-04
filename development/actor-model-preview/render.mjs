/** Actual opt-in createCharacter, isolated Three/Mesa. No loader source patch. */
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const OUT=path.resolve(process.env.OUT_DIR||'qa/actor-preview/roles-01');assert(!fs.existsSync(OUT));fs.mkdirSync(OUT,{recursive:true});
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const {init,createCanvas,installDOM,getDisplayInfo}=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),C=await import('../../source/game/characters.js');
await import('../../source/game/complete-adult/register.js');
const {npcRoleAppearance}=await import('../../source/game/appearance.js');
const {courtOfficialAppearance}=await import('../../source/game/china-palace-audience.js');
const {attachCourtOfficialCostume}=await import('../../source/game/china-court-official-costume.js');
const {attachPalaceCostume}=await import('../../source/game/china-palace-costume.js');
const pair=process.env.PREVIEW_PAIR==='1',modelPreview=pair?'complete-adult-pair-v1':'complete-adult-head-v1',canvas=createCanvas(1280,720),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1280,720,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const gl=renderer.getContext(),report={scope:'Actual per-actor opt-in, isolated Three/Mesa only',frames:[],errors:[],renderer:getDisplayInfo()};renderer.debug.onShaderError=(g,p,v,f)=>report.errors.push({program:g.getProgramInfoLog(p),vertex:g.getShaderInfoLog(v),fragment:g.getShaderInfoLog(f)});
const scene=new T.Scene();scene.background=new T.Color(0xd9ddcf);const sun=new T.DirectionalLight(0xfff3dc,1.55),fill=new T.DirectionalLight(0xb7c6d5,.22);sun.position.set(-2,3,4);fill.position.set(3,2,-2);scene.add(new T.HemisphereLight(0xfff4df,0x718079,1.05),sun,fill);
const official=C.createCharacter(pair?{culture:'france',bodyPreset:'masculine-lean',hairStyle:'side-part',wardrobePreset:'court-frock-coat',skin:0xdba789,hair:0x44342f,clothes:0x65847b,eyeColor:0x594b3f,modelPreview}:{...courtOfficialAppearance('china','cn-minister-works',npcRoleAppearance('china','cn-minister-works',41)),culture:'china',scale:.96,modelPreview});
const previewHair=pair?(process.env.PREVIEW_HAIR||'long-layered'):'gathered-updo';
const consort=C.createCharacter(pair?{culture:'france',bodyPreset:'feminine-slender',hairStyle:'chin-bob',wardrobePreset:'court-gown',previewHair,skin:0xdba789,hair:0x44342f,clothes:0x65847b,eyeColor:0x594b3f,modelPreview}:{...npcRoleAppearance('china','cn-consort-yue',41),previewHair,culture:'china',scale:.96,modelPreview});
consort.station={royalRole:'consort',costumeStyle:'flower-comb'};const handles=pair?[]:[attachCourtOfficialCostume(official),attachPalaceCostume(consort)],actors=[official,consort];official.root.position.x=-.32;consort.root.position.x=.32;actors.forEach(a=>scene.add(a.root));
try{
 report.actors=actors.map(a=>({appearance:a.root.userData.appearance,model:a.root.userData.characterModel}));
 const close=new T.OrthographicCamera(-.66,.66,.37125,-.37125,.01,10);close.position.set(0,1.535,2);close.lookAt(0,1.535,0);
 for(const [name,yaw,turn]of [['roles-front',0,0],['roles-threequarter',-.65,0],['roles-head-turn',0,.38]]){
  for(const a of actors){a.animate(0,false,null);a.root.rotation.y=yaw;a.root.userData.head.rotation.y=turn;a.root.updateMatrixWorld(true);a.root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});}
  close.updateMatrixWorld(true);renderer.render(scene,close);gl.finish();assert.equal(gl.getError(),0);fs.writeFileSync(OUT+'/'+name+'.png',canvas.toBuffer('image/png'));report.frames.push({name,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
 }
 for(const a of actors){a.animate(0,false,null);a.root.rotation.y=-.4;}
 const game=new T.PerspectiveCamera(50,1280/720,.2,150),focus=new T.Vector3(0,1.05,0),distance=4.6,pitch=.22;game.position.copy(focus).add(new T.Vector3(0,Math.sin(pitch)*distance,Math.cos(pitch)*distance));game.lookAt(focus);game.updateMatrixWorld(true);scene.updateMatrixWorld(true);renderer.render(scene,game);gl.finish();assert.equal(gl.getError(),0);fs.writeFileSync(OUT+'/roles-game-4.6.png',canvas.toBuffer('image/png'));report.frames.push({name:'roles-game-4.6',distance,fov:50,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
 assert.equal(report.errors.length,0);report.status='RENDERED_PENDING_VISUAL_REVIEW';
}finally{handles.forEach(h=>h.dispose());actors.forEach(a=>{a.root.removeFromParent();a.dispose();});report.remainingReferences=C.characterResourceStats().activeReferences;renderer.dispose();canvas.dispose();fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
