// Isolated eye-only alternative on the accepted production character.
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {pathToFileURL,fileURLToPath} from 'node:url';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),SOURCE=path.resolve(ROOT,'../../source');
const WHOLE=process.env.WHOLE_FACE==='1';
const OUT=path.resolve(process.env.OUT_DIR||''),VIEWS=(process.env.VIEWS||'front,threequarter,side').split(','),SIZE=640;
assert(OUT.startsWith(ROOT+'/')&&!fs.existsSync(OUT));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const sourceHash=sha(fs.readFileSync(SOURCE+'/game/approved-surfaces.js'));
registerHooks({
 resolve(s,c,next){
  if(s==='three')return{url:pathToFileURL(SOURCE+'/vendor/three/build/three.module.js').href,shortCircuit:true};
  const r=next(s,c);if(['./approved-surfaces.js','./head-shape.js'].includes(s)&&c.parentURL?.includes('eyeVariant=')){const u=new URL(r.url);u.searchParams.set('eyeVariant',new URL(c.parentURL).searchParams.get('eyeVariant'));return{...r,url:u.href};}return r;
 },
 load(url,c,next){const r=next(url,c);if(WHOLE&&url.includes('/characters.js?eyeVariant=prototype'))return {...r,source:String(r.source).replace('SKIN_VALUES=[140,186,229,255]','SKIN_VALUES=[138,138,140,147,158,175,194,212,224,233,240,246,250,253,255,255]').replace('skinMaterial=toon(SKIN_VALUES);','skinMaterial=toon(SKIN_VALUES);skinMaterial.gradientMap.minFilter=skinMaterial.gradientMap.magFilter=THREE.LinearFilter;').replace('b.c.push(m.material.color.r,m.material.color.g,m.material.color.b)','b.c.push(g.attributes.color?.getX(i)??m.material.color.r,g.attributes.color?.getY(i)??m.material.color.g,g.attributes.color?.getZ(i)??m.material.color.b)')};if(WHOLE&&url.includes('/head-shape.js?eyeVariant=prototype'))return {...r,source:String(r.source).replace('[1.515,-.014],[1.545,-.034],[1.580,-.043]','[1.515,-.006],[1.545,-.015],[1.580,-.035]')};if(!url.includes('/approved-surfaces.js?eyeVariant=prototype'))return r;
  let code=String(r.source);
  if(WHOLE){
   code='import {coherentFaceSurface,coherentFaceDepth,faceRings,buildCoherentMouth,shadeFaceSurface} from '+JSON.stringify(pathToFileURL(ROOT+'/face-sculpt.mjs').href)+';\n'+code;
   const hs=code.indexOf('function headSurface('),he=code.indexOf('function neutralFaceD(',hs);code=code.slice(0,hs)+'function headSurface(x,y,masc=false,traits=null){return coherentFaceSurface(x,y,masc,traits); }\n'+code.slice(he);
   const bs=code.indexOf(' const rings=',code.indexOf('function buildHead(')),be=code.indexOf(" loft(h,'continuous-head",bs);code=code.slice(0,bs)+' const rings=faceRings(masc,traits);\n'+code.slice(be);
   code=code.replace("name==='continuous-head-jaw-cheeks-nose'?[64,44]","name==='continuous-head-jaw-cheeks-nose'?[128,80]").replace("{segs:64,steps:44,deform:(p,a)=>{const front=Math.pow(Math.max(0,Math.cos(a)),8);p[2]+=faceD(p[0],p[1],traits)*front;return p;}}","{segs:128,steps:80,deform:(p,a)=>{const front=Math.pow(Math.max(0,Math.cos(a)),3);p[2]+=coherentFaceDepth(p[0],p[1],traits)*front;return p;}}");
   code=code.replace("cx=s*(masc?.040:.038)","cx=s*(masc?.037:.036)").replace("cx+(u*2-1)*(masc?.026:.024)","cx+(u*2-1)*(masc?.024:.023)").replace("(masc?.0042:.0030)*Math.sin","(masc?.0048:.0033)*Math.sin");
   const ms=code.indexOf(' const lipW=masc?'),me=code.indexOf(' buildHair(h,masc',ms);code=code.slice(0,ms)+' buildCoherentMouth(h,{masc,facialSurface,colors:C});shadeFaceSurface(h,C.skin);\n'+code.slice(me);
  }
  const start=code.indexOf('  // Thin almond surfaces'),end=code.indexOf('  const brows=[];',start);assert(start>0&&end>start);
  code=code.slice(0,start)+'  buildConvexEye(h,{side:s,masc,traits,facialSurface,colors:C,coherent:'+WHOLE+'});\n'+code.slice(end);
  code='import {buildConvexEye} from '+JSON.stringify(pathToFileURL(ROOT+'/eye-surface.mjs').href)+';\n'+code;return{...r,source:code};}
});
const runtime=process.env.WORLDWOVEN_WEBGL_RUNTIME||'/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js';
const {init,createCanvas,installDOM,getDisplayInfo}=await import(runtime);installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),canvas=createCanvas(SIZE,SIZE),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setSize(SIZE,SIZE,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const gl=renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');
const report={status:'RUNNING',sourceHash,frames:[],errors:[],preserved:{},renderer:{three:T.REVISION,display:getDisplayInfo(),version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)}};
renderer.debug.onShaderError=(g,p,v,f)=>report.errors.push({program:g.getProgramInfoLog(p),vertex:g.getShaderInfoLog(v),fragment:g.getShaderInfoLog(f)});
const scene=new T.Scene();scene.background=new T.Color(0xd9ddcf);
const hemi=new T.HemisphereLight(0xfff4df,0x718079,1.05),sun=new T.DirectionalLight(0xfff3dc,1.55),fill=new T.DirectionalLight(0xb7c6d5,.22);sun.position.set(-2,3,4);fill.position.set(3,2,-2);scene.add(hemi,sun,fill);
const camera=new T.OrthographicCamera(-.212,.212,.212,-.212,.01,10),gameCamera=new T.PerspectiveCamera(50,1,.2,150),angles={front:0,threequarter:Math.PI/4,side:Math.PI/2};
function preservation(actor){const other=crypto.createHash('sha256'),bones=[];actor.root.traverse(m=>{if(m.isBone)bones.push([m.name,m.position.toArray(),m.quaternion.toArray()]);if(!m.isSkinnedMesh)return;for(const r of m.geometry.userData.sourceRanges||[]){if((WHOLE?/^(continuous-head|neck|ear-|inset-eye|iris-|pupil-|eye-catchlight|eyelid-|soft-brow|nostril-|upper-lip|lower-lip|closed-soft-mouth)/:/^(inset-eye|iris-|pupil-|eye-catchlight|eyelid-)/).test(r.name))continue;other.update(r.name);for(const k of['position','normal','color','skinIndex','skinWeight']){const a=m.geometry.attributes[k],v=a.array.subarray(r.start*a.itemSize,(r.start+r.count)*a.itemSize);other.update(Buffer.from(v.buffer,v.byteOffset,v.byteLength));}}});return{nonEyeGeometry:other.digest('hex'),bones,appearance:actor.root.userData.appearance};}
fs.mkdirSync(OUT,{recursive:true});
try{
 for(const variant of['baseline','prototype']){
  const u=pathToFileURL(SOURCE+'/game/characters.js');u.searchParams.set('eyeVariant',variant);const C=await import(u.href);
  const actor=C.createCharacter({culture:'france',bodyPreset:'masculine-lean',hairStyle:'side-part',skin:0xdba789,hair:0x44342f,clothes:0x65847b,eyeColor:0x594b3f});scene.add(actor.root);actor.animate(0,false,null);actor.root.updateMatrixWorld(true);report.preserved[variant]=preservation(actor);
  const target=new T.Vector3(0,1.612*actor.root.scale.y,-.02*actor.root.scale.z);
  for(const view of VIEWS){const gameplay=view==='game-near'||view==='game-default',active=gameplay?gameCamera:camera,frameTarget=gameplay?new T.Vector3(0,1.45,0):target;if(gameplay){const d=view==='game-near'?2.1:4.6,a=Math.PI/4;active.position.copy(frameTarget).add(new T.Vector3(Math.sin(a)*Math.cos(.22)*d,Math.sin(.22)*d,Math.cos(a)*Math.cos(.22)*d));}else{assert(view in angles);const a=angles[view];active.position.copy(target).add(new T.Vector3(Math.sin(a)*2,0,Math.cos(a)*2));}active.lookAt(frameTarget);active.updateMatrixWorld(true);scene.updateMatrixWorld(true);renderer.render(scene,active);gl.finish();assert.equal(gl.getError(),0);const name=variant+'-'+view+'.png';fs.writeFileSync(OUT+'/'+name,canvas.toBuffer('image/png'));report.frames.push({name,variant,view,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,camera:active.position.toArray(),target:frameTarget.toArray()});}
  actor.root.removeFromParent();actor.dispose();assert.equal(C.characterResourceStats().activeReferences,0);
 }
 assert.deepEqual(report.preserved.baseline,report.preserved.prototype,'Eye-only study changed other geometry, bones or appearance');assert.equal(sourceHash,sha(fs.readFileSync(SOURCE+'/game/approved-surfaces.js')));assert.equal(report.errors.length,0);report.status='RENDERED_PENDING_VISUAL_REVIEW';
}catch(e){report.status='FAIL';report.errors.push(e.stack||String(e));process.exitCode=1;}
finally{fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');renderer.dispose();canvas.dispose();console.log(JSON.stringify({status:report.status,out:OUT,frames:report.frames.length,errors:report.errors}));}
