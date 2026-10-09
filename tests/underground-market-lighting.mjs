// Localized ambient attenuation must not dim the surface or other regions.
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),{createNightLighting,registerNightFixture}=await import('../source/game/night-lighting.js');
const scene=new T.Scene(),hemi=new T.HemisphereLight(),sun=new T.DirectionalLight(),group=new T.Group(),m=new T.MeshToonMaterial(),box=new T.Mesh(new T.BoxGeometry(12,8,12),m);group.add(box);scene.add(group,hemi,sun);
registerNightFixture(group,0,-2,0,{intensity:10,distance:4,floorY:-4});
const zone={minX:-4,maxX:4,minZ:-4,maxZ:4,minY:-4.3,maxY:-1,floorY:-4},lot={group,lightingZones:[zone],levels:[{y:-4},{y:0}],cameraColliders:[]},lighting=createNightLighting({scene,hemi,sun});
lighting.attach(lot,'china');const baseline=lighting.inspectField().textures.slice(0,2).map(t=>t.image.data.slice());lighting.detach();zone.baseLightScale=.18;lighting.attach(lot,'china');const field=lighting.inspectField();let dim=0,untouched=0;
for(let z=0;z<field.dimensions[2];z++)for(let y=0;y<field.dimensions[1];y++)for(let x=0;x<field.dimensions[0];x++){
 const p=field.min.clone().add(new T.Vector3(x/(field.dimensions[0]-1)*field.size.x,y/(field.dimensions[1]-1)*field.size.y,z/(field.dimensions[2]-1)*field.size.z)),i=(x+field.dimensions[0]*(y+field.dimensions[1]*z))*4,inside=p.x>=zone.minX&&p.x<=zone.maxX&&p.z>=zone.minZ&&p.z<=zone.maxZ&&p.y>=zone.minY&&p.y<zone.maxY;
 for(let mode=0;mode<2;mode++){const a=field.textures[mode].image.data;for(let c=0;c<3;c++)assert.equal(a[i+c],baseline[mode][i+c],'fixture RGB unchanged by base attenuation');assert.equal(a[i+3],T.DataUtils.toHalfFloat(inside?.18:1));}
 inside?dim++:untouched++;
}
assert(dim>0&&untouched>0);assert.equal(lighting.getDebug().gpuPointLights,0);const bytes=field.bytes;lighting.setNight(true);lighting.setNight(false);assert.equal(field.bytes,bytes);assert(hemi.intensity>=.58,'surface global light unchanged');
const shader={vertexShader:T.ShaderLib.toon.vertexShader,fragmentShader:T.ShaderLib.toon.fragmentShader,uniforms:{}};m.onBeforeCompile(shader,{});assert(shader.fragmentShader.includes('reflectedLight.indirectDiffuse *= baseScale;'));assert(shader.fragmentShader.indexOf('reflectedLight.directDiffuse *= baseScale;')<shader.fragmentShader.indexOf('fieldLight.color = fieldColor;'),'base dimming happens before local warm fixture');assert.deepEqual(shader.uniforms.fourfangBaseMin.value.toArray(),[-4,-4.3,-4]);assert.deepEqual(shader.uniforms.fourfangBaseMax.value.toArray(),[4,-1,4]);
assert(shader.fragmentShader.includes('vFourfangFieldWorld - fourfangBaseMin'),'boundary uses fragment position, not normal-offset sampled UV');
const mask=p=>Math.max(0,Math.min(1,Math.min(...p.map((v,i)=>Math.min(v-[-4,-4.3,-4][i],[4,-1,4][i]-v)))/.25));
for(const p of [[-4.01,-2,0],[4.01,-2,0],[0,-4.31,0],[0,-.99,0],[0,-2,-4.01],[0,-2,4.01],[0,.115,0]])assert.equal(mask(p),0,'outside fragment unchanged even if filtered alpha is dark');assert.equal(mask([0,-2,0]),1);assert(mask([-3.9,-2,0])>0&&mask([-3.9,-2,0])<1);
lighting.detach();lighting.dispose();
const G=await import('../source/game/geometry.js'),{buildChinaBlackMarket}=await import('../source/game/china-black-market.js');const ctx={group:new T.Group(),roofGroup:new T.Group(),colliders:[],cameraColliders:[],walkableSurfaces:[],interiorRooms:[],levels:[],lightingZones:[],explorationTargets:[],facilities:[]};buildChinaBlackMarket(G,ctx);const bz=ctx.lightingZones[0],bb=bz.baseLightBounds;
const realMask=p=>Math.max(0,Math.min(1,Math.min(p[0]-bb.minX,bb.maxX-p[0],p[1]-bb.minY,bb.maxY-p[1],p[2]-bb.minZ,bb.maxZ-p[2])/.25));
for(const p of [[-7.8,-2,29.409],[-3.408,-2,33.2],[-7.8,-2,36.991],[-7.8,-1.1,33.2],[-7.8,-4.1,33.2]])assert.equal(realMask(p),1,'authored wall/ceiling/floor interior fully attenuated');
for(const p of [[-14,-2,36.15],[-7.8,.115,33.2],[-12.46,-2,36.15]])assert.equal(realMask(p),0,'public landing/surface excluded');
let lamps=0;ctx.group.traverse(o=>{if(o.userData.nightFixture){lamps++;assert(o.userData.nightFixture.distance<=4.5);}});assert.equal(lamps,3);assert.equal(bz.baseLightScale,.18);
console.log(JSON.stringify({status:'PASS',dimmedCells:dim,unchangedCells:untouched,passes:['outside-alpha-one','fixture-rgb-identical','day-night','no-extra-lights-or-textures','shader-order','global-hemi-unchanged','inward-only-boundary','actual-market-wall-envelope','three-original-lamps','cleanup']}));
