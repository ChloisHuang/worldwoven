/** Isolated Three + Mesa study; production or explicit local face-ramp variant. */
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),SOURCE=path.resolve(ROOT,'../../source'),OUT=path.resolve(process.env.OUT_DIR||'');
assert(OUT.startsWith(path.resolve(ROOT,'../../qa')+'/')&&!fs.existsSync(OUT));
const DETAIL=process.env.PAIR_DETAIL==='1';
const RUNTIME=process.env.USE_RUNTIME_ADAPTER==='1';
const PAIR=process.env.PAIR_PREVIEW==='1';
const BEFORE=process.env.PRODUCTION_BEFORE==='1';
const CLAY=process.env.CLAY_STUDY==='1',REFLECT=!BEFORE&&process.env.EYE_REFLECTANCE!=='0',NARROW=!BEFORE&&process.env.FACE_RAMP!=='production',SURFACE=!BEFORE&&process.env.FACE_SURFACE!=='0',SIZE=DETAIL?1920:PAIR?1280:640,HEIGHT=DETAIL?1080:PAIR?720:640,VIEWS=['front','threequarter','side'];
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),before=hash(fs.readFileSync(SOURCE+'/game/approved-surfaces.js'));
registerHooks({resolve(s,c,next){if(s==='three')return{url:pathToFileURL(SOURCE+'/vendor/three/build/three.module.js').href,shortCircuit:true};return next(s,c);},load(url,c,next){const r=next(url,c);if(url.endsWith('/game/approved-surfaces.js')&&process.env.PRODUCTION_BEFORE!=='1'&&!RUNTIME){let code='import {replaceWithCompleteAdult} from '+JSON.stringify(pathToFileURL(ROOT+'/load_character.mjs').href)+';\n'+String(r.source);const marker='applyNaturalHead(root,{hair:C.hair,hairStyle});';assert(code.includes(marker));code=code.replace(marker,marker+'replaceWithCompleteAdult(root,C,{clay:'+CLAY+',surface:'+SURFACE+',form:masc?"male":"female"});');return{...r,source:code};}if(url.endsWith('/game/characters.js')){let code=(BEFORE?'':'import {applyNaturalClothing} from '+JSON.stringify(pathToFileURL(ROOT+'/natural-clothing.mjs').href)+';\nimport {applyFemaleSilhouette} from '+JSON.stringify(pathToFileURL(ROOT+'/female-silhouette.mjs').href)+';\n')+String(r.source).replace('function weights(name,x,y,s){','function weights(name,x,y,s){').replace('if(/continuous-head', 'if(name.startsWith("continuous-head-anatomical")&&y<1.435){const u=clamp((y-1.365)/.070,0,1);return [[2,1-u],[3,u]];}if(/continuous-head').replace('b.c.push(m.material.color.r,m.material.color.g,m.material.color.b)','b.c.push(g.attributes.color?.getX(i)??m.material.color.r,g.attributes.color?.getY(i)??m.material.color.g,g.attributes.color?.getZ(i)??m.material.color.b)');if(!BEFORE){
  if(RUNTIME){code='import {applyCompleteAdultPreview,completeAdultWeights,createCompleteAdultChannels,appendCompleteAdultVertex,finishCompleteAdultChannels,prepareCompleteAdultSkinMaterial} from '+JSON.stringify(pathToFileURL(ROOT+'/runtime-adapter.mjs').href)+';\n'+code;code=code.replace('const source=createApprovedSurfaces(opts);','const source=createApprovedSurfaces(opts);applyCompleteAdultPreview(source,opts);').replace('const w=weights(m.name,p.x,sourceY,s);','const w=completeAdultWeights(m,sourceY)??weights(m.name,p.x,sourceY,s);');}
  else code=code.replace('const source=createApprovedSurfaces(opts);','const source=createApprovedSurfaces(opts);applyNaturalClothing(source,opts);applyFemaleSilhouette(source,opts);'+(CLAY?'for(const m of [...source.getObjectByName("sculpted-head").children])if(m.isMesh&&/hair|fringe|combed|side-lock|side-flow/.test(m.name)){m.removeFromParent();m.geometry.dispose();}':''));
 }if(CLAY)code=code.replace('skinMaterial=toon(SKIN_VALUES)','skinMaterial=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide})');
 if(RUNTIME){
  code=code.replace('skinMaterial=toon(SKIN_VALUES);','skinMaterial=toon(SKIN_VALUES);prepareCompleteAdultSkinMaterial(skinMaterial);')
   .replaceAll('sy:[],ranges:[]','sy:[],extra:createCompleteAdultChannels(),ranges:[]')
   .replace('const sourceY=g.attributes.sourceY?.getX(i)??p.y;','appendCompleteAdultVertex(b.extra,m,i,p);const sourceY=g.attributes.sourceY?.getX(i)??p.y;')
   .replace('g.setIndex(b.i);g.computeBoundingBox();','finishCompleteAdultChannels(g,b.extra);g.setIndex(b.i);g.computeBoundingBox();');
 }else if(!CLAY&&(REFLECT||NARROW||SURFACE)){
  code='import {applySurfaceFinish} from '+JSON.stringify(pathToFileURL(ROOT+'/../anatomical-head/surface_finish.mjs').href)+';\nimport {applyAnatomicalFinish} from '+JSON.stringify(pathToFileURL(ROOT+'/face_finish.mjs').href)+';\n'+code;
  code=code.replace('skinMaterial=toon(SKIN_VALUES);','skinMaterial=toon(SKIN_VALUES);applyAnatomicalFinish(skinMaterial,{narrow:'+NARROW+',reflect:'+REFLECT+'});'+(SURFACE?'applySurfaceFinish(skinMaterial);':'' ))
   .replaceAll('sy:[],ranges:[]','sy:[],eye:[],sheen:[],tone:[],fc:[],fk:[],ranges:[]')
   .replace('const sourceY=g.attributes.sourceY?.getX(i)??p.y;','b.fc.push(g.attributes.featureCoord?.getX(i)??0,g.attributes.featureCoord?.getY(i)??0,g.attributes.featureCoord?.getZ(i)??0);b.fk.push(g.attributes.featureKind?.getX(i)??0);b.eye.push(/^(inset-eye|iris-|pupil-)/.test(m.name)?1:0);b.sheen.push(0);const tone=Math.max(0,Math.min(1,(p.y-1.395)/.050));b.tone.push(m.name.startsWith("hair-")?-1:m.name.startsWith("continuous-head-anatomical")?tone*tone*(3-2*tone):0);const sourceY=g.attributes.sourceY?.getX(i)??p.y;')
   .replace('g.setIndex(b.i);g.computeBoundingBox();',"g.setAttribute('featureCoord',new THREE.Float32BufferAttribute(b.fc,3));g.setAttribute('featureKind',new THREE.Float32BufferAttribute(b.fk,1));g.setAttribute('eyeReflectance',new THREE.Float32BufferAttribute(b.eye,1));g.setAttribute('featureSheen',new THREE.Float32BufferAttribute(b.sheen,1));g.setAttribute('anatomicalTone',new THREE.Float32BufferAttribute(b.tone,1));g.setIndex(b.i);g.computeBoundingBox();");
 }
 return{...r,source:code};}return r;}});
const {init,createCanvas,installDOM,getDisplayInfo}=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),C=await import(pathToFileURL(SOURCE+'/game/characters.js').href),canvas=createCanvas(SIZE,HEIGHT),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(SIZE,HEIGHT,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const gl=renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');const report={status:'RUNNING',prototypeOnly:true,runtimeAdapter:RUNTIME,clay:CLAY,originalSurfaceFinish:!CLAY&&SURFACE,faceRamp:!CLAY&&NARROW?'production-four-soft-boundaries':'production',eyeReflectance:!CLAY&&REFLECT,sourceHash:before,frames:[],errors:[],renderer:{three:T.REVISION,display:getDisplayInfo(),version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)}};
renderer.debug.onShaderError=(g,p,v,f)=>report.errors.push({program:g.getProgramInfoLog(p),vertex:g.getShaderInfoLog(v),fragment:g.getShaderInfoLog(f)});
const scene=new T.Scene();scene.background=new T.Color(0xd9ddcf);const hemi=new T.HemisphereLight(0xfff4df,0x718079,CLAY?.28:1.05),sun=new T.DirectionalLight(0xfff3dc,CLAY?1.6:1.55),fill=new T.DirectionalLight(0xb7c6d5,CLAY?.07:.22);sun.position.set(-2,3,4);fill.position.set(3,2,-2);scene.add(hemi,sun,fill);
const camera=new T.OrthographicCamera(DETAIL?-.60:PAIR?-.70:-.30,DETAIL?.60:PAIR?.70:.30,DETAIL?.3375:PAIR?.39375:.30,DETAIL?-.3375:PAIR?-.39375:-.30,.01,10),angles={front:0,threequarter:Math.PI/4,side:Math.PI/2};fs.mkdirSync(OUT,{recursive:true});let actor,companion;
try{actor=C.createCharacter({culture:'france',bodyPreset:!PAIR&&process.env.CHARACTER_FORM==='female'?'feminine-slender':'masculine-lean',hairStyle:!PAIR&&process.env.CHARACTER_FORM==='female'?'chin-bob':'side-part',skin:0xdba789,hair:0x44342f,clothes:0x65847b,eyeColor:0x594b3f});scene.add(actor.root);actor.animate(0,false,null);
 if(PAIR){actor.root.position.x=-.35;companion=C.createCharacter({culture:'france',bodyPreset:'feminine-slender',hairStyle:'chin-bob',skin:0xdba789,hair:0x44342f,clothes:0x65847b,eyeColor:0x594b3f});companion.root.position.x=.35;scene.add(companion.root);companion.animate(0,false,null);report.pair={left:'male',right:'female',sameScene:true,sameCamera:true,rootScales:[actor.root.scale.toArray(),companion.root.scale.toArray()],actors:[actor,companion].map(a=>{let triangles=0;a.root.traverse(m=>{if(m.isSkinnedMesh)triangles+=m.geometry.index.count/3;});return{appearance:a.root.userData.appearance,triangles,rootPosition:a.root.position.toArray(),height:a.root.userData.poseQA.height};})};}

 if(!BEFORE){
  let collarVertices=0,collarMaxHeadWeight=0,neckBlendVertices=0;
  actor.root.traverse(m=>{if(!m.isSkinnedMesh)return;const g=m.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
   const range=g.userData.sourceRanges?.find(r=>r.name==='continuous-head-anatomical-head-neck');if(!range)return;
   for(let i=range.start;i<range.start+range.count;i++){let headWeight=0;for(let k=0;k<4;k++)if(si.array[i*4+k]===3)headWeight+=sw.array[i*4+k];if(p.getY(i)<1.36){collarVertices++;collarMaxHeadWeight=Math.max(collarMaxHeadWeight,headWeight);}if(headWeight>0&&headWeight<1)neckBlendVertices++;}
  });report.neckBlend={collarVertices,collarMaxHeadWeight,neckBlendVertices};assert(collarVertices>0&&collarMaxHeadWeight===0&&neckBlendVertices>0);
 }
 if(process.env.HEAD_TURN==='1'){actor.root.userData.head.rotation.y=.38;report.headYaw=.38;}
 actor.root.updateMatrixWorld(true);const target=new T.Vector3(0,DETAIL?1.545:PAIR?1.49:1.505*actor.root.scale.y,-.02*actor.root.scale.z);
 for(const view of VIEWS){const a=angles[view];if(PAIR){actor.root.rotation.y=-a;companion.root.rotation.y=-a;}camera.position.copy(target).add(new T.Vector3(PAIR?0:Math.sin(a)*2,0,PAIR?2:Math.cos(a)*2));camera.lookAt(target);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);const name=(CLAY?'clay':'cel')+'-'+view+'.png';fs.writeFileSync(OUT+'/'+name,canvas.toBuffer('image/png'));report.frames.push({name,view,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});}
 // A native-pixel crop of the production default follow-camera projection.
 // The study has no playable scene: this verifies expected face readability,
 // not gameplay or the unfinished neck rig. No enlarged portrait is substituted.
 if(!CLAY&&!PAIR){
  const gameCamera=new T.PerspectiveCamera(50,1280/720,.2,150),focus=new T.Vector3(0,1.45,0),yaw=Math.PI/4,pitch=.22,distance=4.6;
  gameCamera.position.copy(focus).add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance));
  gameCamera.lookAt(focus);gameCamera.setViewOffset(1280,720,480,180,320,320);gameCamera.updateMatrixWorld(true);
  renderer.setSize(320,320,false);renderer.render(scene,gameCamera);gl.finish();assert.equal(gl.getError(),0);
  const name='cel-game-distance-crop.png';fs.writeFileSync(OUT+'/'+name,canvas.toBuffer('image/png'));
  report.frames.push({name,view:'game-threequarter',fullViewport:[1280,720],nativeCrop:[480,180,320,320],fov:50,distance,pitch,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});
 }
 
  for(const distance of [4.6,2.6]){
   if(PAIR){actor.root.rotation.y=-Math.PI/4;companion.root.rotation.y=-Math.PI/4;scene.updateMatrixWorld(true);}
   const full=new T.PerspectiveCamera(50,1280/720,.2,150);const focus=new T.Vector3(0,1.05,0),yaw=PAIR?0:Math.PI/4,pitch=.22;
   full.position.copy(focus).add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance));full.lookAt(focus);full.updateMatrixWorld(true);
   renderer.setSize(1280,720,false);renderer.render(scene,full);gl.finish();assert.equal(gl.getError(),0);
   const name='cel-clothed-game-'+distance.toFixed(1)+'.png';fs.writeFileSync(OUT+'/'+name,canvas.toBuffer('image/png'));report.frames.push({name,view:'complete-game',distance,fov:50,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});
  }

 assert.equal(before,hash(fs.readFileSync(SOURCE+'/game/approved-surfaces.js')));assert.equal(report.errors.length,0);report.status='RENDERED_PENDING_VISUAL_REVIEW';
}catch(e){report.status='FAIL';report.errors.push(e.stack);process.exitCode=1;}
finally{if(actor){actor.root.removeFromParent();actor.dispose();}if(companion){companion.root.removeFromParent();companion.dispose();}report.remainingReferences=C.characterResourceStats().activeReferences;fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');renderer.dispose();canvas.dispose();console.log(JSON.stringify(report));}
