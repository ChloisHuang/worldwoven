// Diagnostic A/B: identical V4 geometry, uniform color versus three flow tones.
// Production files are read only. The load hook preserves an optional source
// color attribute in the production vertex-color merger for this experiment.
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {pathToFileURL,fileURLToPath} from 'node:url';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),SOURCE=path.resolve(process.env.WORLDWOVEN_BASELINE_SOURCE||path.join(ROOT,'../../source'));
const OUT=path.resolve(process.env.OUT_DIR||''),SIZE=Number(process.env.IMAGE_SIZE||640),PRESENTATION=process.env.PRESENTATION||'male';
const VIEWS=(process.env.VIEWS||'front,side,rear-threequarter').split(',');
const modules={uniform:ROOT+'/original-head-hair.v4.mjs','flow-tones':ROOT+'/original-head-hair.v5-tone.mjs'};
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner');assert(['male','female'].includes(PRESENTATION));assert([512,640,768].includes(SIZE));
assert(OUT.startsWith(ROOT+'/')&&!fs.existsSync(OUT),'Use fresh isolated output directory');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const inputFiles=['approved-surfaces.js','characters.js','appearance.js','character-traits.js','character-props.js'];
const sourceManifest=()=>Object.fromEntries(inputFiles.map(f=>[f,sha(fs.readFileSync(SOURCE+'/game/'+f))]));
const sourceHashes=sourceManifest(),moduleHashes=Object.fromEntries(Object.entries(modules).map(([k,f])=>[k,sha(fs.readFileSync(f))]));
const report={status:'RUNNING',kind:'IDENTICAL_V4_GEOMETRY_TONE_AB',source:SOURCE,sourceHashes,moduleHashes,frames:[],errors:[],geometryHashes:{},colorHashes:{},scope:'One male short cut; same V4 geometry, production rig and toon lights. Uniform versus three original diffuse tone levels following existing ridge/part fields. Merger adapter preserves optional source colors in memory only. No production mutation, gameplay or art acceptance claim.'};
fs.mkdirSync(OUT,{recursive:true});
registerHooks({
 resolve(s,c,next){return s==='three'?{url:pathToFileURL(SOURCE+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);},
 load(url,context,next){
  const r=next(url,context);if(!url.startsWith(pathToFileURL(SOURCE+'/game/characters.js').href+'?'))return r;
  const mode=new URL(url).searchParams.get('toneMode');assert(mode in modules);
  let code=String(r.source);const create='const source=createApprovedSurfaces(opts);',colors='b.c.push(m.material.color.r,m.material.color.g,m.material.color.b);';
  assert.equal(code.split(create).length,2);assert.equal(code.split(colors).length,2);
  code=`import {applyOriginalHeadHair} from ${JSON.stringify(pathToFileURL(modules[mode]).href)};\n`+code;
  code=code.replace(create,create+`applyOriginalHeadHair(source,{hairStyle:'side-quiff',hair:opts.hair,heightMap:y=>shapeHeight(y,opts.shapeTraits?.legLength??1)});`);
  code=code.replace(colors,`const suppliedColor=g.attributes.color;b.c.push(suppliedColor?suppliedColor.getX(i):m.material.color.r,suppliedColor?suppliedColor.getY(i):m.material.color.g,suppliedColor?suppliedColor.getZ(i):m.material.color.b);`);
  return {...r,source:code};
 }
});
const runtime=process.env.WORLDWOVEN_WEBGL_RUNTIME;assert(runtime,'Set WORLDWOVEN_WEBGL_RUNTIME to the installed @onirenaud/node-webgl dist/index.js');
const {init,createCanvas,installDOM,getDisplayInfo}=await import(pathToFileURL(path.resolve(runtime)).href);
installDOM({fetch:false});init({api:'gles'});const T=await import('three');
const canvas=createCanvas(SIZE,SIZE),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setSize(SIZE,SIZE,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const gl=renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');report.renderer={three:T.REVISION,display:getDisplayInfo(),version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)};assert(/Mesa|llvmpipe|softpipe/i.test(JSON.stringify(report.renderer)));
renderer.debug.onShaderError=(g,p,v,f)=>report.errors.push({program:g.getProgramInfoLog(p),vertex:g.getShaderInfoLog(v),fragment:g.getShaderInfoLog(f)});
const scene=new T.Scene();scene.background=new T.Color(0xd9ddcf);const hemi=new T.HemisphereLight(0xfff4df,0x718079,1.05),sun=new T.DirectionalLight(0xfff3dc,1.55),fill=new T.DirectionalLight(0xb7c6d5,.22);sun.position.set(-2,3,4);fill.position.set(3,2,-2);scene.add(hemi,sun,fill);
const angles={front:0,threequarter:Math.PI/4,side:Math.PI/2,'rear-threequarter':Math.PI*.75},camera=new T.OrthographicCamera(-.212,.212,.212,-.212,.01,10);
function hashGeometry(root,attributes){const h=crypto.createHash('sha256');root.traverse(m=>{if(!m.isSkinnedMesh)return;for(const key of attributes){const a=key==='index'?m.geometry.index:m.geometry.attributes[key];h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}});return h.digest('hex');}
try{
 for(const mode of['uniform','flow-tones']){
  const u=pathToFileURL(SOURCE+'/game/characters.js');u.searchParams.set('toneMode',mode);const C=await import(u.href),male=PRESENTATION==='male';
  const actor=C.createCharacter({culture:null,bodyPreset:male?'masculine-lean':'feminine-balanced',hairStyle:'side-part',skin:0xdba789,hair:0x44342f,clothes:0x65847b,eyeColor:0x594b3f});
  scene.add(actor.root);actor.animate(0,false,null);actor.root.updateMatrixWorld(true);
  report.geometryHashes[mode]=hashGeometry(actor.root,['position','normal','index','skinIndex','skinWeight']);report.colorHashes[mode]=hashGeometry(actor.root,['color']);
  const target=new T.Vector3(0,1.612*actor.root.scale.y,-.02*actor.root.scale.z);
  for(const view of VIEWS){
   assert(view in angles);const a=angles[view];camera.position.copy(target).add(new T.Vector3(Math.sin(a)*2,0,Math.cos(a)*2));camera.lookAt(target);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);
   const pixels=Uint8Array.from(canvas.getImageData().data),file=`${PRESENTATION}-side-quiff-${mode}-${view}.png`;fs.writeFileSync(OUT+'/'+file,canvas.toBuffer('image/png'));
   report.frames.push({file,mode,view,camera:camera.position.toArray(),target:target.toArray(),pixelSHA256:sha(pixels),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
  }
  actor.root.removeFromParent();actor.dispose();assert.equal(C.characterResourceStats().activeReferences,0);
 }
 assert.equal(report.geometryHashes.uniform,report.geometryHashes['flow-tones'],'A/B geometry or rig differs');assert.notEqual(report.colorHashes.uniform,report.colorHashes['flow-tones'],'Tone adapter had no effect');
 report.sourceUnchanged=JSON.stringify(sourceHashes)===JSON.stringify(sourceManifest());assert(report.sourceUnchanged);for(const [mode,f]of Object.entries(modules))assert.equal(moduleHashes[mode],sha(fs.readFileSync(f)));assert.equal(report.errors.length,0);report.status='RENDERED_PENDING_VISUAL_REVIEW';
}catch(e){report.status='FAIL';report.errors.push(e.stack||String(e));process.exitCode=1;}
finally{fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');renderer.dispose();canvas.dispose();console.log(JSON.stringify({status:report.status,out:OUT,frames:report.frames.length,geometryHashes:report.geometryHashes,errors:report.errors}));}
