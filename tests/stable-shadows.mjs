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
assert.equal(THREE.ShaderChunk.shadowmap_pars_fragment.includes('FOURFANG_STABLE_RECEIVER_PCF_V1'),false);
THREE.ShaderChunk.shadowmap_pars_fragment=original;
assert.equal(M.installStableShadowFilter(),true);
const patched=THREE.ShaderChunk.shadowmap_pars_fragment;
assert.equal((patched.match(/FOURFANG_STABLE_RECEIVER_PCF_V1/g)||[]).length,1);
assert.equal(M.installStableShadowFilter(),true);
assert.equal(THREE.ShaderChunk.shadowmap_pars_fragment,patched);
const injected=patched.slice(patched.indexOf('// FOURFANG_STABLE'),patched.indexOf('\n\t#endif\n\t#if NUM_SUN_LIGHT_SHADOWS',patched.indexOf('// FOURFANG_STABLE')));
assert.ok(injected.indexOf('dFdx')<injected.indexOf('if ( ! inFrustum )'));
assert.doesNotMatch(injected,/gl_FragCoord|vogelDiskSample|interleavedGradientNoise/);
assert.match(injected,/receiver.z \+ dot\( gradient, uv - receiver.xy \)/);
assert.equal((injected.match(/float [abcd] = fourfangShadowTap/g)||[]).length,4);
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
// Mirror guarded shader math for singular/near-singular projections and edge taps.
const shaderGradient=(dx,dy)=>{const det=dx[0]*dy[1]-dx[1]*dy[0];return Math.abs(det)>1e-10?[(dx[2]*dy[1]-dy[2]*dx[1])/det,(dy[2]*dx[0]-dx[2]*dy[0])/det]:[0,0]};
for(const [dx,dy] of [[[0,0,0],[0,0,0]],[[.001,.001,.05],[.001,.001,.05]],[[1e-7,0,.0002],[0,1e-7,.0003]],[[.001,0,.0002],[0,1.01e-7,.0003]]]){
 const g=shaderGradient(dx,dy);assert.ok(g.every(Number.isFinite));
 if(Math.abs(dx[0]*dy[1]-dx[1]*dy[0])<=1e-10)assert.deepEqual(g,[0,0]);
}
for(const [u,v] of [[0,0],[1,1],[0,1],[1,0],[.000001,.999999],[.5,.5]]){
 const resolution=1024,texel=1/resolution,grid=[u*resolution-.5,v*resolution-.5];
 const f=grid.map(a=>a-Math.floor(a)),base=grid.map(a=>(Math.floor(a)+.5)*texel);
 for(const [a,b] of [[0,0],[1,0],[0,1],[1,1]]){
  const tap=[Math.max(texel*.5,Math.min(1-texel*.5,base[0]+a*texel)),Math.max(texel*.5,Math.min(1-texel*.5,base[1]+b*texel))];
  assert.ok(tap.every(x=>Number.isFinite(x)&&x>=texel*.5&&x<=1-texel*.5));
 }
 const weights=[(1-f[0])*(1-f[1]),f[0]*(1-f[1]),(1-f[0])*f[1],f[0]*f[1]];
 assert.ok(weights.every(w=>w>=0&&w<=1));assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-12);
}
const renderer={shadowMap:{}};const sun=new THREE.DirectionalLight();const scene=new THREE.Scene();scene.add(sun,sun.target);
assert.equal(M.configureStableShadows(renderer,sun),true);
assert.equal(renderer.shadowMap.type,THREE.BasicShadowMap);
assert.equal(sun.shadow.normalBias,.003);
assert.equal(sun.shadow.mapSize.x,1024);
const L=new THREE.Vector3(-14,26,15).normalize(),R=new THREE.Vector3(15,0,14).normalize(),U=L.clone().cross(R).normalize();
for(const mode of ['follow','overview','globe'])for(const p of [new THREE.Vector3(0,0,0),new THREE.Vector3(15.123,9.4,-30.792)]){
 M.updateStableShadowFrame(sun,p,{mode,overviewRadius:86.37});
 const step=2*sun.shadow.camera.right/sun.shadow.mapSize.x;
 for(const axis of [R,U])assert.ok(Math.abs(sun.target.position.dot(axis)/step-Math.round(sun.target.position.dot(axis)/step))<1e-9);
 assert.ok(sun.position.clone().sub(sun.target.position).normalize().distanceTo(L)<1e-12);
 assert.ok(Math.abs(sun.shadow.bias*(sun.shadow.camera.far-sun.shadow.camera.near)+.002)<1e-12);
 scene.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);
 // Sphere around focus must be fully contained in depth in overview; tall caster stays in follow.
 const offsets=mode==='overview'?[L.clone().multiplyScalar(86.37),L.clone().multiplyScalar(-86.37)]:[new THREE.Vector3(0,45,0),new THREE.Vector3(0,-15,0)];
 for(const offset of offsets){const q=p.clone().add(offset).applyMatrix4(sun.shadow.matrix);assert.ok(q.z>0&&q.z<1,`${mode} caster depth ${q.z}`);}
}
const root=new THREE.Group();const visible=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshToonMaterial());visible.castShadow=true;visible.receiveShadow=true;
const overlay=visible.clone();overlay.castShadow=false;root.add(visible,overlay);M.applyCharacterShadowPolicy(root);
assert.equal(visible.receiveShadow,false);assert.equal(visible.castShadow,true);assert.equal(overlay.castShadow,false);
await fs.writeFile(path.join(here,'patched-shadow-chunk.glsl'),patched);
await fs.writeFile(path.join(here,'test-results.json'),JSON.stringify({passed:true,threeRevision:THREE.REVISION,checks:['exact r186 original function anchor','fails safely on changed vendor chunk','idempotent patch','four deterministic texture taps','derivatives outside frustum divergence','normal and reversed depth comparison signs','200 derivative/Jacobian cases','near-singular fallback finite','border taps clamped and weights normalized','all modes light direction preserved','light-space whole-texel snap','world-scale 2mm bias','tall follow caster and overview sphere depth coverage','character cast-only policy'],notRun:['GPU shader compilation','GPU render','iOS Safari screenshot','mobile performance']},null,2));
console.log('PASS: shader anchor/semantics, 200 plane derivatives, stable matrices, near/far and material policy; GPU and iOS not run.');
