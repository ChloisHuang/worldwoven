// Isolated exact R16 character + opt-in original head/hair, production Three/Mesa.
// The load hook adds the prototype before production merge/skinning in memory.
// It never edits baseline files, builds a lot, opens localhost, or publishes.
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {pathToFileURL,fileURLToPath} from 'node:url';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const runtime=process.env.WORLDWOVEN_WEBGL_RUNTIME;
assert(runtime,'Set WORLDWOVEN_WEBGL_RUNTIME to the installed node-webgl dist/index.js');
const {init,createCanvas,installDOM,getDisplayInfo}=await import(pathToFileURL(path.resolve(runtime)).href);
const SOURCE=path.resolve(ROOT,'../../source');
const OUT=path.resolve(process.env.OUT_DIR||'');
const PRESENTATION=process.env.PRESENTATION||'male';
const STYLES=['natural-side-sweep'];
const VIEWS=(process.env.VIEWS||'front,threequarter,side,rear-threequarter').split(',');
const BALD=process.env.BALD==='1';
const SIZE=Number(process.env.IMAGE_SIZE||640);
const allowed=['natural-side-sweep'];
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner');
assert(['male','female'].includes(PRESENTATION));assert(STYLES.length<=2&&STYLES.every(x=>allowed.includes(x)));
assert([512,640,768].includes(SIZE));assert(OUT.startsWith(ROOT+'/')&&!fs.existsSync(OUT),'Use a fresh isolated output directory');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const files=['approved-surfaces.js','characters.js','appearance.js','character-traits.js','character-props.js'];
const manifest=()=>Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(SOURCE+'/game/'+f))]));
const before=manifest(),prototypeSHA=sha(fs.readFileSync(ROOT+'/natural-head.mjs'));
const report={status:'RUNNING',source:SOURCE,sourceHashes:before,prototypeSHA,presentation:PRESENTATION,styles:STYLES,bald:BALD,frames:[],errors:[],preserved:{},scope:'Exact R16.7 character body, skinning, neutral pose and two production toon materials. Prototype applied before merge via in-memory load hook. Controlled head views and production camera-distance views without a lot. Not browser/iOS or integrated gameplay acceptance.'};
fs.mkdirSync(OUT,{recursive:true});
registerHooks({
 resolve(s,c,next){return s==='three'?{url:pathToFileURL(SOURCE+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);},
 load(url,context,next){
  const r=next(url,context);if(!url.startsWith(pathToFileURL(SOURCE+'/game/characters.js').href+'?'))return r;
  const u=new URL(url),style=u.searchParams.get('studyStyle'),variant=u.searchParams.get('studyVariant');
  assert(allowed.includes(style));assert(['baseline','prototype'].includes(variant));
  let code=String(r.source),needle='const source=createApprovedSurfaces(opts);';
  assert.equal(code.split(needle).length,2,'Production merge entry changed');
  let after='';
  if(variant==='prototype'){
    code=`import {applyNaturalHead} from ${JSON.stringify(pathToFileURL(ROOT+'/natural-head.mjs').href)};\n`+code;
    after=`applyNaturalHead(source,{hair:opts.hair,bald:${BALD},heightMap:y=>shapeHeight(y,opts.shapeTraits?.legLength??1)});`;
  }else if(BALD){
    after=`{const h=source.getObjectByName('sculpted-head');for(const m of [...h.children])if(m.isMesh&&/hair|fringe|combed|side-lock|side-flow/.test(m.name)){m.removeFromParent();m.geometry.dispose();}}`;
  }
  code=code.replace(needle,needle+after);return {...r,source:code};
 }
});
installDOM({fetch:false});init({api:'gles'});
const T=await import('three');
const canvas=createCanvas(SIZE,SIZE),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setSize(SIZE,SIZE,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const gl=renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');
report.renderer={three:T.REVISION,display:getDisplayInfo(),version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)};
assert(/Mesa|llvmpipe|softpipe/i.test(JSON.stringify(report.renderer)));
renderer.debug.onShaderError=(g,p,v,f)=>report.errors.push({program:g.getProgramInfoLog(p),vertex:g.getShaderInfoLog(v),fragment:g.getShaderInfoLog(f)});
const scene=new T.Scene();scene.background=new T.Color(0xd9ddcf);
const hemi=new T.HemisphereLight(0xfff4df,0x718079,1.05),sun=new T.DirectionalLight(0xfff3dc,1.55),fill=new T.DirectionalLight(0xb7c6d5,.22);
sun.position.set(-2,3,4);fill.position.set(3,2,-2);scene.add(hemi,sun,fill);
const angles={front:0,threequarter:Math.PI/4,side:Math.PI/2,'left-side':-Math.PI/2,'rear-threequarter':Math.PI*.75};
const camera=new T.OrthographicCamera(-.212,.212,.212,-.212,.01,10),gameCamera=new T.PerspectiveCamera(50,1,.2,150);
const baselineStyles={'natural-side-sweep':'side-part'};
function preservation(actor){
 const body=crypto.createHash('sha256');
 const headNames=/continuous-head|^ear-|inset-eye|iris-|pupil-|eye-catchlight|eyelid-|soft-brow|nostril-|lip|mouth|hair|fringe|combed|side-lock|side-flow/;
 actor.root.traverse(m=>{if(!m.isSkinnedMesh)return;for(const r of m.geometry.userData.sourceRanges||[]){
  if(headNames.test(r.name))continue;body.update(r.name);
  for(const k of['position','normal','color','skinIndex','skinWeight']){const a=m.geometry.attributes[k],v=a.array.subarray(r.start*a.itemSize,(r.start+r.count)*a.itemSize);body.update(Buffer.from(v.buffer,v.byteOffset,v.byteLength));}
 }});
 return {bodyAndNeck:body.digest('hex'),appearance:actor.root.userData.appearance,bones:actor.root.userData.head.parent.children.filter(x=>x.isBone).map(x=>[x.name,x.position.toArray()])};
}
try{
 for(const style of STYLES)for(const variant of(process.env.VARIANTS||'baseline,prototype').split(',')){
  const u=pathToFileURL(SOURCE+'/game/characters.js');u.searchParams.set('studyStyle',style);u.searchParams.set('studyVariant',variant);
  const C=await import(u.href),masc=PRESENTATION==='male';
  const actor=C.createCharacter({culture:null,bodyPreset:masc?'masculine-lean':'feminine-balanced',hairStyle:baselineStyles[style],skin:0xdba789,hair:0x44342f,clothes:0x65847b,eyeColor:0x594b3f});
  scene.add(actor.root);actor.animate(0,false,null);actor.root.updateMatrixWorld(true);
  report.preserved[variant]=preservation(actor);
  const target=new T.Vector3(0,1.612*actor.root.scale.y,-.02*actor.root.scale.z);
  for(const view of VIEWS){
   const gameplay=view==='game-near'||view==='game-default';
   assert(gameplay||view in angles);const activeCamera=gameplay?gameCamera:camera,frameTarget=gameplay?new T.Vector3(0,1.45,0):target;
   if(gameplay){const d=view==='game-near'?2.1:4.6,a=Math.PI/4;activeCamera.position.copy(frameTarget).add(new T.Vector3(Math.sin(a)*Math.cos(.22)*d,Math.sin(.22)*d,Math.cos(a)*Math.cos(.22)*d));}
   else{const a=angles[view];activeCamera.position.copy(frameTarget).add(new T.Vector3(Math.sin(a)*2,0,Math.cos(a)*2));}
   activeCamera.lookAt(frameTarget);activeCamera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
   renderer.render(scene,activeCamera);gl.finish();assert.equal(gl.getError(),0);
   const bytes=Uint8Array.from(canvas.getImageData().data),name=`${PRESENTATION}-${style}-${variant}-${view}${BALD?'-bald':''}.png`;
   fs.writeFileSync(OUT+'/'+name,canvas.toBuffer('image/png'));
   report.frames.push({file:name,style,variant,view,camera:activeCamera.position.toArray(),target:frameTarget.toArray(),fov:gameplay?50:null,pixelSHA256:sha(bytes),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pose:actor.getPoseMetrics()});
  }
  actor.root.removeFromParent();actor.dispose();assert.equal(C.characterResourceStats().activeReferences,0);
 }
 if(report.preserved.baseline&&report.preserved.prototype)assert.deepEqual(report.preserved.baseline,report.preserved.prototype,'Body/neck geometry, rig or appearance identity changed');
 report.sourceUnchanged=JSON.stringify(before)===JSON.stringify(manifest());assert(report.sourceUnchanged);
 assert.equal(sha(fs.readFileSync(ROOT+'/natural-head.mjs')),prototypeSHA);assert.equal(report.errors.length,0);
 report.status='RENDERED_PENDING_VISUAL_REVIEW';
}catch(e){report.status='FAIL';report.errors.push(e.stack||String(e));process.exitCode=1;}
finally{fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');renderer.dispose();canvas.dispose();console.log(JSON.stringify({status:report.status,out:OUT,frames:report.frames.length,errors:report.errors}));}
