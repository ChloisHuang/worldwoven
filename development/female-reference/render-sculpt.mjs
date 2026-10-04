/** Uniform-grey anatomical diagnostic, no pigment, hair, brow ribbons or toon. */
import {registerHooks} from 'node:module';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),OUT=path.resolve(process.env.OUT_DIR||'qa/female-reference/reconstructed-clay');
registerHooks({resolve(s,c,next){if(s==='three')return{url:pathToFileURL(ROOT+'/source/vendor/three/build/three.module.js').href,shortCircuit:true};return next(s,c);}});
const {init,createCanvas,installDOM}=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),{ADULT_FORMS}=await import('../../source/game/complete-adult/assets/adult-forms-data.js');
const canvas=createCanvas(768,768),r=new T.WebGLRenderer({canvas,antialias:true});r.setSize(768,768,false);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.NoToneMapping;
const scene=new T.Scene();scene.background=new T.Color(0x45484c);scene.add(new T.HemisphereLight(0xffffff,0xaeb2b8,.75));const sun=new T.DirectionalLight(0xffffff,1.3),fill=new T.DirectionalLight(0xffffff,.45);sun.position.set(-3,3,4);fill.position.set(3,1,2);scene.add(sun,fill);
const material=new T.MeshStandardMaterial({color:0xa8a8a8,roughness:1,metalness:0});
for(const p of ADULT_FORMS.female.parts){if(p.material==='brow')continue;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.position,3));g.setAttribute('normal',new T.Float32BufferAttribute(p.normal,3));g.setIndex(new T.BufferAttribute(p.index,1));scene.add(new T.Mesh(g,material));}
fs.mkdirSync(OUT,{recursive:true});const focus=new T.Vector3(0,1.55,-.012);
for(const[view,a]of[['front',0],['side',-Math.PI/2],['threequarter',-Math.PI/4]]){const c=new T.OrthographicCamera(-.18,.18,.18,-.18,.01,10);c.position.copy(focus).add(new T.Vector3(Math.sin(a)*2,0,Math.cos(a)*2));c.lookAt(focus);r.render(scene,c);r.getContext().finish();fs.writeFileSync(OUT+'/'+view+'.png',canvas.toBuffer('image/png'));}
console.log(JSON.stringify({out:OUT,assetHash:ADULT_FORMS.female.reviewedAssetSha256,diagnostic:'uniform grey, same skin and globe geometry, no pigment/hair/brow meshes; smooth diffuse soft fill'}));r.dispose();canvas.dispose();
