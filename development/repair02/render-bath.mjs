// Exact production scene, actor, day-light field, shadow filter and WebGL renderer.
// Fixed human-eye camera coordinates are shared by before and after runs.
import {init,createCanvas,installDOM,getDisplayInfo} from '/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js';
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const SOURCE=path.resolve(process.env.SOURCE_ROOT||'/workspace/shared/worldwoven-r17-repairs/source');
const OUT=path.resolve(process.env.OUT_DIR||'');
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner');
assert(OUT.startsWith('/workspace/shared/worldwoven-r17-bath-repair/')&&!fs.existsSync(OUT));fs.mkdirSync(OUT,{recursive:true});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const files=['japan-bathhouse.js','furniture-interactions.js','characters.js','approved-surfaces.js','main.js','geometry.js','night-lighting.js','stable-shadows.js'];
const manifest=()=>Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(SOURCE+'/game/'+f))]));
const before=manifest(),report={status:'RUNNING',source:SOURCE,sourceHashes:before,frames:[],errors:[],scope:'Complete exact production Japan lot and bath actor, fixed player-height camera. No browser input/route acceptance claim.'};
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(SOURCE+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),J=await import(pathToFileURL(SOURCE+'/game/japan-bathhouse.js')),
 C=await import(pathToFileURL(SOURCE+'/game/characters.js')),F=await import(pathToFileURL(SOURCE+'/game/furniture-interactions.js')),
 L=await import(pathToFileURL(SOURCE+'/game/night-lighting.js')),S=await import(pathToFileURL(SOURCE+'/game/stable-shadows.js'));
const canvas=createCanvas(1280,960),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setSize(1280,960,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const gl=renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');report.renderer={three:T.REVISION,display:getDisplayInfo(),version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)};assert(/Mesa|llvmpipe|softpipe/i.test(JSON.stringify(report.renderer)));
const scene=new T.Scene();scene.background=new T.Color(0xa7c3bf);scene.fog=new T.Fog(0xa7c3bf,60,240);
const hemi=new T.HemisphereLight(0xfff4d8,0x6e8a7b,.85),sun=new T.DirectionalLight(0xffedcd,1.6);scene.add(hemi,sun,sun.target);report.shadowFilter=S.configureStableShadows(renderer,sun);
renderer.debug.onShaderError=(g,p,v,f)=>report.errors.push({program:g.getProgramInfoLog(p),vertex:g.getShaderInfoLog(v),fragment:g.getShaderInfoLog(f)});
const started=performance.now();console.log('Building exact Japan lot');const lot=J.buildJapan();scene.add(lot.group);report.buildMs=performance.now()-started;
const lighting=L.createNightLighting({scene,hemi,sun});lighting.attach(lot,'japan');lighting.setNight(false);S.applyWorldShadowPolicy(lot.group);S.setStableShadowBounds(sun,new T.Box3().setFromObject(lot.group));
report.lighting=lighting.getDebug();report.shadows=sun.userData.fourfangStableShadows;
const camera=new T.PerspectiveCamera(50,1280/960,.1,240);
const views={men:{camera:[-2.0,5.32,-6.43],target:[-4.55,4.43,-9.3]},women:{camera:[5.0,5.32,-6.8],target:[2.8,4.43,-9.7]},menDetail:{camera:[-2.2,5.14,-8.08],target:[-4.08,4.4,-9.3]}};
function measure(a,d){const b=new T.Box3(),head=new T.Box3(),hip=new T.Box3(),sole=new T.Box3();let under=0,total=0;const p=new T.Vector3();a.root.updateMatrixWorld(true);a.root.traverseVisible(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();for(const r of o.geometry.userData.sourceRanges||[])for(let i=r.start;i<r.start+r.count;i++){o.getVertexPosition(i,p).applyMatrix4(o.matrixWorld);b.expandByPoint(p);if(/continuous-head/.test(r.name))head.expandByPoint(p);if(/footwear-bath/.test(r.name))sole.expandByPoint(p);const sy=o.geometry.attributes.sourceY?.getX(i)??o.geometry.attributes.position.getY(i);if(/body|bodice|skirt|trouser|tunic|kilt|robe/.test(r.name)&&sy>.87&&sy<1.03)hip.expandByPoint(p);if(p.y<d.waterY)under++;total++;}});return {bounds:{min:b.min.toArray(),max:b.max.toArray()},head:{min:head.min.toArray(),max:head.max.toArray()},hip:{min:hip.min.toArray(),max:hip.max.toArray()},soles:{min:sole.min.toArray(),max:sole.max.toArray()},under,total,underFraction:under/total};}
function render(label,view,a,d){const spec=views[view];camera.position.set(...spec.camera);camera.lookAt(new T.Vector3(...spec.target));camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);lighting.update(a?.root.position);renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);const pixels=Uint8Array.from(canvas.getImageData().data);renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);assert.equal(sha(pixels),sha(canvas.getImageData().data),'repeat framebuffer equality');const name=label+'-'+view+'.png';fs.writeFileSync(OUT+'/'+name,canvas.toBuffer('image/png'));report.frames.push({file:name,camera:spec.camera,target:spec.target,frameSHA256:sha(pixels),descriptor:d,actor:a?{appearance:a.root.userData.appearance,pose:a.getPoseMetrics(),skin:measure(a,d)}:null,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});console.log('Saved '+name);}
try{
 const ds=F.REST_BATH_DESCRIPTORS.japan.filter(d=>d.kind==='bath');
 for(const [i,d]of ds.entries()){
  const view=i?'women':'men';render('empty',view,null,d);
  const actor=C.createCharacter({culture:'japan',bodyPreset:i?'feminine-balanced':'masculine-lean',hairStyle:i?'low-bun':'swept-short',wardrobePreset:d.bathWardrobePreset||'bath-robe',clothes:0x647b9a});lot.group.add(actor.root);actor.root.position.set(...d.anchor);actor.root.rotation.y=d.yaw;
  actor.animate(1,false,'bathe',{supportY:d.supportY,bathHipHeight:d.bathHipHeight,bathPose:d.bathPose});S.applyCharacterShadowPolicy(actor.root);render('soaking',view,actor,d);if(!i)render('soaking','menDetail',actor,d);actor.root.removeFromParent();actor.dispose();
 }
 assert.equal(C.characterResourceStats().activeReferences,0);report.sourceUnchanged=JSON.stringify(before)===JSON.stringify(manifest());assert(report.sourceUnchanged);assert.equal(report.errors.length,0);report.status='RENDERED_PENDING_VISUAL_REVIEW';
}catch(e){report.status='FAIL';report.errors.push(e.stack||String(e));process.exitCode=1;}
finally{fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');lighting.dispose();renderer.dispose();canvas.dispose();console.log(JSON.stringify({status:report.status,out:OUT,frames:report.frames.length,errors:report.errors}));}
