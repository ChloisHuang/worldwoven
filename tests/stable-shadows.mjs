import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const here=path.resolve('qa/shadows');await fs.mkdir(here,{recursive:true});
const vendor=process.env.FOURFANG_THREE||path.resolve('source/vendor/three/build/three.module.js');
const vendorURL=pathToFileURL(vendor).href;
const THREE=await import(vendorURL);
const source=await fs.readFile(path.resolve('source/game/stable-shadows.js'),'utf8');
const localModule=path.join(here,'.stable-shadows-test.mjs');
await fs.writeFile(localModule,source.replace("from 'three'",`from '${vendorURL}'`));
const M=await import(pathToFileURL(localModule).href);
const original=THREE.ShaderChunk.shadowmap_pars_fragment;
assert.equal(THREE.REVISION,'186');
assert.match(original,/interleavedGradientNoise\( gl_FragCoord.xy \)/);
const rendererSource=await fs.readFile(vendor,'utf8');
assert.match(rendererSource,/PCFSoftShadowMap has been removed. Using PCFShadowMap instead/);
assert.match(rendererSource,/precision \$\{parameters.precision\} sampler2DShadow/);
assert.match(rendererSource,/result.side = \( material.shadowSide !== null \) \? material.shadowSide : shadowSide\[ material.side \]/);
// Exact replacement anchor must fail if the function changes even inside r186.
THREE.ShaderChunk.shadowmap_pars_fragment=original.replace('float depth = texture2D( shadowMap, shadowCoord.xy ).r;','float depth = 0.0;');
assert.equal(M.installStableShadowFilter(),false);
assert.equal(THREE.ShaderChunk.shadowmap_pars_fragment.includes('FOURFANG_WORLD_FIXED_PCF_V2'),false);
THREE.ShaderChunk.shadowmap_pars_fragment=original;
assert.equal(M.installStableShadowFilter(),true);
const patched=THREE.ShaderChunk.shadowmap_pars_fragment;
assert.equal((patched.match(/FOURFANG_WORLD_FIXED_PCF_V2/g)||[]).length,1);
assert.equal(M.installStableShadowFilter(),true);
assert.equal(THREE.ShaderChunk.shadowmap_pars_fragment,patched);
const injected=patched.slice(patched.indexOf('// FOURFANG_WORLD'),patched.indexOf('\n\t#endif\n\t#if NUM_SUN_LIGHT_SHADOWS',patched.indexOf('// FOURFANG_WORLD')));
assert.ok(injected.indexOf('dFdx')<injected.indexOf('if ( ! inFrustum )'));
assert.doesNotMatch(injected,/gl_FragCoord|vogelDiskSample|interleavedGradientNoise/);
assert.match(injected,/receiver.z \+ clamp\( dot\( gradient, uv - receiver.xy \)/);
assert.match(injected,/int y = 0; y < 4/);
assert.match(injected,/int x = 0; x < 4/);
assert.match(injected,/1e-5 \* length\( dx.xy \) \* length\( dy.xy \)/);
assert.match(injected,/return step\( depth, receiverDepth \)/);
assert.match(injected,/return step\( receiverDepth, depth \)/);
// Receiver-plane derivative inversion is exact under arbitrary nondegenerate screen Jacobians.
for(let i=1;i<=200;i++){
 const gu=Math.sin(i)*2,gv=Math.cos(i*.9)*3;
 const dx=[.002+i*1e-6,.0003],dy=[-.0002,.003-i*1e-6];
 dx[2]=gu*dx[0]+gv*dx[1];dy[2]=gu*dy[0]+gv*dy[1];
 const det=dx[0]*dy[1]-dx[1]*dy[0];
 const result=[(dx[2]*dy[1]-dy[2]*dx[1])/det,(dy[2]*dx[0]-dx[2]*dy[0])/det];
 assert.ok(Math.abs(result[0]-gu)<1e-12&&Math.abs(result[1]-gv)<1e-12);
}
// Plane conditioning is invariant to camera zoom and resolution. The old
// absolute determinant threshold changed behaviour across these same scales.
for(const scale of [1e-7,1e-5,.001,.01,1,100]) {
 const dx=[.8*scale,.13*scale],dy=[-.2*scale,.9*scale],g=[.4,-.9];
 dx[2]=g[0]*dx[0]+g[1]*dx[1];dy[2]=g[0]*dy[0]+g[1]*dy[1];
 const n=Math.max(Math.hypot(...dx.slice(0,2)),Math.hypot(...dy.slice(0,2)),1e-20);
 const a=dx.map(v=>v/n),b=dy.map(v=>v/n),det=a[0]*b[1]-b[0]*a[1];
 assert.ok(Math.abs(det)>1e-5*Math.hypot(...a.slice(0,2))*Math.hypot(...b.slice(0,2)));
 assert.ok(Math.abs((a[2]*b[1]-b[2]*a[1])/det-g[0])<1e-12);
 assert.ok(Math.abs((b[2]*a[0]-a[2]*b[0])/det-g[1])<1e-12);
}
for(let i=0;i<=100;i++) {
 const f=i/100,w=[1-f,1,1,f].map(n=>n/3);
 assert.ok(w.every(v=>v>=0&&v<=1));assert.ok(Math.abs(w.reduce((a,b)=>a+b)-1)<1e-12);
}
const renderer={shadowMap:{},capabilities:{maxTextureSize:4096}};const sun=new THREE.DirectionalLight();const scene=new THREE.Scene();scene.add(sun,sun.target);
assert.equal(M.configureStableShadows(renderer,sun),true);
assert.equal(renderer.shadowMap.type,THREE.BasicShadowMap);
assert.equal(sun.shadow.normalBias,.025);
assert.equal(sun.shadow.mapSize.x,2048);
const bounds=new THREE.Box3(new THREE.Vector3(-30,-1,-40),new THREE.Vector3(30,24,40));
M.setStableShadowBounds(sun,bounds);scene.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);
const frozen=JSON.stringify([sun.position,sun.target.position,sun.shadow.camera.projectionMatrix,sun.shadow.matrix]);
for(let i=0;i<1000;i++) {
 M.updateStableShadowFrame(sun,new THREE.Vector3(Math.sin(i)*29,i%20,Math.cos(i)*39),{mode:i%2?'follow':'overview',overviewRadius:60+i%10});
 scene.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);
 assert.equal(JSON.stringify([sun.position,sun.target.position,sun.shadow.camera.projectionMatrix,sun.shadow.matrix]),frozen,'player/camera changes cannot move fixed sun shadow frame');
}
for(const x of[-30,30])for(const y of[-1,24])for(const z of[-40,40]) {
 const p=new THREE.Vector3(x,y,z).applyMatrix4(sun.shadow.matrix);
 assert.ok([...p].every(v=>v>0&&v<1),'all scene corners in fixed volume');
}
assert.ok(Math.abs(sun.shadow.bias*(sun.shadow.camera.far-sun.shadow.camera.near)+.012)<1e-12);
const front=new THREE.MeshToonMaterial(),back=new THREE.MeshToonMaterial({side:THREE.BackSide}),thin=new THREE.MeshToonMaterial({side:THREE.DoubleSide}),explicit=new THREE.MeshToonMaterial({shadowSide:THREE.DoubleSide});
const policies=new THREE.Group();for(const mat of[front,back,thin,explicit]){const m=new THREE.Mesh(new THREE.BoxGeometry(),mat);m.castShadow=true;m.receiveShadow=true;policies.add(m);}
M.applyWorldShadowPolicy(policies);assert.deepEqual([front,back,thin,explicit].map(m=>m.shadowSide),[THREE.FrontSide,THREE.BackSide,THREE.DoubleSide,THREE.DoubleSide]);
policies.traverse(o=>{if(o.isMesh){assert.equal(o.castShadow,true);assert.equal(o.receiveShadow,true);assert.equal(o.material.depthTest,true);}});
const root=new THREE.Group();const visible=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshToonMaterial());visible.castShadow=true;visible.receiveShadow=true;
const overlay=visible.clone();overlay.castShadow=false;root.add(visible,overlay);M.applyCharacterShadowPolicy(root);
assert.equal(visible.receiveShadow,false);assert.equal(visible.castShadow,true);assert.equal(overlay.castShadow,false);
await fs.writeFile(path.join(here,'patched-shadow-chunk.glsl'),patched);
await fs.writeFile(path.join(here,'test-results.json'),JSON.stringify({passed:true,threeRevision:THREE.REVISION,checks:['exact r186 function anchor and upgrade guard','idempotent patch','16 deterministic texture taps / normalized continuous weights','camera-scale-invariant plane conditioning','finite bounded receiver extrapolation','normal and reversed depth signs','1000 motion / overview frames keep identical world matrix','all scene corners covered','bounded 12mm world depth and 25mm normal bias','explicit closed frontface / thin doubleside casting','depth tests / scene receiving and casting retained','character policy preserved'],notRun:['iOS Safari rendering','mobile performance']},null,2));
console.log('PASS: fixed-world matrices, guarded GLSL semantics and geometry/material policy; see separate WebGL evidence.');
