/** Three min/max pairs rendered through the actual createCharacter adapter. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const OUT=path.resolve(process.env.OUT_FILE||'qa/shape-visibility/endpoints.png');assert(!fs.existsSync(OUT));fs.mkdirSync(path.dirname(OUT),{recursive:true});
const {init,createCanvas,installDOM}=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),C=await import('../../source/game/characters.js');await import('../../source/game/complete-adult/register.js');
const {SHAPE_RANGES}=await import('../../source/game/character-traits.js');
const width=1600,height=1350,cw=width/2,ch=height/3,canvas=createCanvas(width,height),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(width,height,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.setScissorTest(true);
const scene=new T.Scene();scene.background=new T.Color(0xd9ddcf);const sun=new T.DirectionalLight(0xfff3dc,1.55),fill=new T.DirectionalLight(0xb7c6d5,.22);sun.position.set(-2,3,4);fill.position.set(3,2,-2);scene.add(new T.HemisphereLight(0xfff4df,0x718079,1.05),sun,fill);
const camera=new T.OrthographicCamera(-.30,.30,.16875,-.16875,.01,10);camera.position.set(0,1.582,2);camera.lookAt(0,1.582,0);camera.updateMatrixWorld(true);
const look={culture:'france',bodyPreset:'feminine-balanced',hairStyle:'low-bun',wardrobePreset:'court-overgown',previewHair:'gathered-updo',skin:0xdba789,hair:0x44342f,eyeColor:0x594b3f,modelPreview:'complete-adult-head-v1'};
const keys=(process.env.SHAPE_KEYS||'jawWidth,noseTipSize,noseBridgeHeight').split(','),report={scope:'Isolated actual createCharacter/Mesa. Same camera, lighting, identity and yaw per endpoint pair.',rows:[]};
for(const [row,key]of keys.entries())for(const [col,side]of ['min','max'].entries()){
 const value=SHAPE_RANGES[key][side],a=C.createCharacter({...look,shapeTraits:{[key]:value}});assert(a.root.userData.characterModel.applied);scene.add(a.root);a.animate(0,false,null);a.root.rotation.y=row===0?-.55:-1.25;a.root.updateMatrixWorld(true);a.root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
 renderer.setViewport(col*cw,height-(row+1)*ch,cw,ch);renderer.setScissor(col*cw,height-(row+1)*ch,cw,ch);renderer.render(scene,camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);report.rows.push({key,side,value,yaw:a.root.rotation.y,model:a.root.userData.characterModel.version});a.root.removeFromParent();a.dispose();
}
fs.writeFileSync(OUT,canvas.toBuffer('image/png'));fs.writeFileSync(OUT.replace(/\.png$/,'.json'),JSON.stringify(report,null,2));renderer.dispose();canvas.dispose();console.log(OUT);
