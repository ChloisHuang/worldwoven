/** Isolated bounded clothing check. HEAD_STUDY points to the complete-head loader. */
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),SOURCE=path.resolve(HERE,'../../source'),OUT=path.resolve(process.env.OUT_DIR||'qa/natural-clothing/first'),HEAD=process.env.HEAD_STUDY;
assert(OUT.startsWith(path.resolve(HERE,'../../qa')+'/')&&!fs.existsSync(OUT));
assert(HEAD&&fs.existsSync(HEAD),'HEAD_STUDY must point to complete-character/load_character.mjs');
registerHooks({
 resolve(s,c,next){if(s==='three')return{url:pathToFileURL(SOURCE+'/vendor/three/build/three.module.js').href,shortCircuit:true};return next(s,c);},
 load(url,c,next){const r=next(url,c);if(!url.endsWith('.js'))return r;let s=String(r.source);
  if(url===pathToFileURL(SOURCE+'/game/approved-surfaces.js').href){s='import {replaceWithCompleteAdult} from '+JSON.stringify(pathToFileURL(HEAD).href)+';\n'+s;s=s.replace('applyNaturalHead(root,{hair:C.hair,hairStyle});','applyNaturalHead(root,{hair:C.hair,hairStyle});replaceWithCompleteAdult(root,C,{surface:false,form:"female"});');}
  if(url===pathToFileURL(SOURCE+'/game/characters.js').href){s='import {applyFemaleSilhouette} from '+JSON.stringify(pathToFileURL(HERE+'/female-silhouette.mjs').href)+';\n'+s;s=s.replace('const source=createApprovedSurfaces(opts);','const source=createApprovedSurfaces(opts);applyFemaleSilhouette(source,opts);');s=s.replace('if(/continuous-head','if(name.startsWith("continuous-head-anatomical")&&y<1.435){const u=clamp((y-1.365)/.070,0,1);return [[2,1-u],[3,u]];}if(/continuous-head');s=s.replace('b.c.push(m.material.color.r,m.material.color.g,m.material.color.b)','b.c.push(g.attributes.color?.getX(i)??m.material.color.r,g.attributes.color?.getY(i)??m.material.color.g,g.attributes.color?.getZ(i)??m.material.color.b)');}
  return {...r,source:s};
 }
});
const {init,createCanvas,installDOM}=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),C=await import('../../source/game/characters.js');
const canvas=createCanvas(640,640),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const scene=new T.Scene();scene.background=new T.Color(0xd9ddcf);const hemi=new T.HemisphereLight(0xfff4df,0x718079,1.05),sun=new T.DirectionalLight(0xfff3dc,1.55),fill=new T.DirectionalLight(0xb7c6d5,.22);sun.position.set(-2,3,4);fill.position.set(3,2,-2);scene.add(hemi,sun,fill);
const actor=C.createCharacter({culture:'france',bodyPreset:'feminine-slender',wardrobePreset:'court-gown',hairStyle:'chin-bob',skin:0xdba789,hair:0x44342f,clothes:0x65847b,eyeColor:0x594b3f});scene.add(actor.root);actor.animate(0,false,null);fs.mkdirSync(OUT,{recursive:true});const frames=[],gl=renderer.getContext();
function save(camera,name,w=640,h=640){renderer.setSize(w,h,false);actor.root.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);fs.writeFileSync(OUT+'/'+name,canvas.toBuffer('image/png'));frames.push({name,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});}
try{
 const portraits=process.env.HAIR_FIT_ONLY==='1';
 for(const [name,a] of (portraits?[['front',0],['threequarter',Math.PI/4],['side',Math.PI/2]]:[['front',0],['threequarter',Math.PI/4],['side',Math.PI/2],['other-side',-Math.PI/2],['back',Math.PI]])){const c=new T.OrthographicCamera(-.30,.30,.30,-.30,.01,10),focus=new T.Vector3(0,1.45*actor.root.scale.y,-.02*actor.root.scale.z);c.position.copy(focus).add(new T.Vector3(Math.sin(a)*2,0,Math.cos(a)*2));c.lookAt(focus);save(c,name+'.png');}
 const game=()=>{const c=new T.PerspectiveCamera(50,1280/720,.2,150),f=new T.Vector3(0,1.05,actor.root.position.z),d=2.6,a=Math.PI/4,p=.22;c.position.copy(f).add(new T.Vector3(Math.sin(a)*Math.cos(p)*d,Math.sin(p)*d,Math.cos(a)*Math.cos(p)*d));c.lookAt(f);return c;};
 if(!portraits){save(game(),'game-idle.png',1280,720);
 actor.root.position.z=.12;actor.animate(.1,true,null,{groundHeightAt:()=>0});save(game(),'game-arm-phase.png',1280,720);}
 for(const m of actor.root.children.flatMap(o=>o.children||[]))if(m.isSkinnedMesh){const p=new T.Vector3();for(let i=0;i<m.geometry.attributes.position.count;i+=37){m.getVertexPosition(i,p);assert(p.toArray().every(Number.isFinite));}}
 const report={status:'RENDERED_PENDING_VISUAL_REVIEW',frames,phase:actor.root.userData.poseQA.gaitPhase,maxRssMiB:process.resourceUsage().maxRSS/1024,scope:portraits?'front, three-quarter and profile hair fit':'idle and one arm phase; not gameplay or all body presets'};fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{actor.root.removeFromParent();actor.dispose();assert.equal(C.characterResourceStats().activeReferences,0);renderer.dispose();canvas.dispose();}
