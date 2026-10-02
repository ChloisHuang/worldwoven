const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const base=path.resolve('source'),root=base;fs.mkdirSync('qa',{recursive:true});
const cache=new Map();function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file});cache.set(file,m);return m;}
function linker(s,f){return mod(s==='three'?path.join(base,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s.split('?')[0]));}
async function load(f){const m=mod(f);if(m.status==='unlinked')await m.link(linker);if(m.status==='linked')await m.evaluate();return m.namespace;}
const sha=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
(async()=>{
 const THREE=await load(base+'/vendor/three/build/three.module.js'),L=await load(root+'/game/night-lighting.js');
 const defs=[['japan','japan-bathhouse','buildJapan'],['china','regions-east','buildChina'],['egypt','egypt-temple','buildEgypt'],['france','regions-west','buildFrance']];
 const scene=new THREE.Scene(),hemi=new THREE.HemisphereLight(0xffffff,0x777777,.8),sun=new THREE.DirectionalLight(0xffffff,1.6);scene.add(hemi,sun);const lighting=L.createNightLighting({scene,hemi,sun}),reports=[];
 const pointCount=()=>{let n=0;scene.traverseVisible(o=>{if(o.isPointLight)n++});return n};
 assert.equal(pointCount(),6);
 for(const[id,file,build]of defs){
  const lot=(await load(root+'/game/'+file+'.js'))[build]();
  const arrays=['colliders','cameraColliders','walkableSurfaces','doorways','stations','bounds','levels'];
  const before=Object.fromEntries(arrays.map(k=>[k,JSON.stringify(lot[k])]));
  scene.add(lot.group);let oldLights=0;lot.group.traverse(o=>{if(o.isPointLight)oldLights++});
  const warm=new Map();lot.group.traverse(o=>{for(const m of(Array.isArray(o.material)?o.material:o.material?[o.material]:[]))if(m.emissive?.r>m.emissive?.g*1.12&&m.emissiveIntensity>0)warm.set(m,m.emissiveIntensity);});
  const versions=new Map([...warm].map(([m])=>[m,m.version]));lighting.attach(lot,id);assert.equal(pointCount(),6,id+' global GPU budget');
  const positions=[new THREE.Vector3(...lot.spawn),...(lot.stations||[]).map(s=>new THREE.Vector3(...s.position)),...(lot.explorationTargets||[]).map(s=>new THREE.Vector3(...s.position))];
  let maxSelected=0,litPositions=0,frames=0;
  for(const p of positions){
   lighting.setNight(true);lighting.update(p,{force:true});const d=lighting.getDebug();assert.equal(pointCount(),6);assert(d.activeCount<=6);maxSelected=Math.max(maxSelected,d.activeCount);litPositions+=d.activeCount>0;frames++;
   const fMap=new Map(d.fixtures.map(f=>[f.id,f]));for(const l of d.lights){assert(l.castShadow===false);assert(l.visible===true);for(const v of [...l.position,...l.color,l.intensity,l.distance,l.decay])assert(Number.isFinite(v));if(l.id!==null)assert(Math.abs(fMap.get(l.id).floorY-d.floorY)<=.8,id+' other floor source culled');}
   const stable=JSON.stringify(d.lights);for(let i=0;i<6;i++){lighting.update(p.clone().add(new THREE.Vector3(i%2?.01:-.01,0,.005)));assert.equal(JSON.stringify(lighting.getDebug().lights),stable,id+' stationary micro-jitter stable');}
   const nightSun=sun.intensity,nightHemi=hemi.intensity;lighting.setNight(false);assert(sun.intensity/nightSun>6,id+' day/night directional contrast');assert(hemi.intensity>=.58&&nightHemi>=.36,'readable base fill');assert(lighting.getDebug().lights.every((l,i)=>l.intensity<=d.lights[i].intensity),'night lamp stronger');assert.equal(pointCount(),6);
  }
  for(const f of lighting.getDebug().fixtures)assert([...f.position,f.floorY,f.intensity,f.distance,f.dayFactor].every(Number.isFinite));
  // Repeated mode changes use the captured baseline instead of compounded gains.
  for(let i=0;i<20;i++){lighting.setNight(true);lighting.setNight(false);}lighting.setNight(true);
  for(const [m,v]of warm){assert.equal(m.emissiveIntensity,Math.max(.78,v*1.35));assert.equal(m.version,versions.get(m),'mode updates do not recompile materials');}
  const report={region:id,authoredPointSources:oldLights,registeredFixtures:lighting.getDebug().fixtureCount,maxSelected,positionsChecked:positions.length,litPositions,frames,unchanged:arrays.map(k=>({field:k,sha256:sha(JSON.stringify(lot[k])??'undefined')}))};
  scene.remove(lot.group);lighting.detach();assert.equal(pointCount(),6);for(const[m,v]of warm)assert.equal(m.emissiveIntensity,v,'restore exact cached emission');
  let restored=0;lot.group.traverse(o=>{if(o.isPointLight)restored++});assert.equal(restored,oldLights);
  // The same instance and cached material can be attached repeatedly without drift.
  lighting.attach(lot,id);lighting.setNight(true);lighting.detach();for(const[m,v]of warm)assert.equal(m.emissiveIntensity,v);
  for(const k of arrays)assert.equal(JSON.stringify(lot[k]),before[k],id+' lighting must not mutate '+k);lot.group.traverse(o=>o.geometry?.dispose());reports.push(report);
 }
 // Synthetic stacked-floor regression: a nearer lamp above must never displace
 // current-floor illumination, and all source intensities remain deterministic.
 const stack={group:new THREE.Group(),levels:[{y:0},{y:3.8}],walkableSurfaces:[{minX:-20,maxX:20,minZ:-20,maxZ:20,y:0},{minX:-20,maxX:20,minZ:-20,maxZ:20,y:3.8}]};
 for(const y of[2.7,6.5])for(let i=0;i<9;i++)L.registerNightFixture(stack.group,i-4,y,1,{floorY:y===2.7?0:3.8});
 lighting.attach(stack,'japan');lighting.setNight(true);for(const y of[0,3.8,0,3.8]){lighting.update(new THREE.Vector3(0,y,0),{force:true});assert.equal(lighting.getDebug().activeCount,6);const ids=new Set(lighting.getDebug().slotIDs);assert.equal(ids.size,6);assert.equal(lighting.getDebug().floorY,y);}
 lighting.dispose();assert.equal(pointCount(),0,'full app dispose removes six owned slots');lighting.dispose();
 const sourceHashes={};for(const f of['night-lighting','regions-east','regions-west','japan-bathhouse','egypt-temple'])sourceHashes[f+'.js']=sha(fs.readFileSync(root+'/game/'+f+'.js','utf8'));
 const result={status:'PASS',scope:'Node real Three.js source geometry and lighting state, no WebGL rendering claim',constantPointLightCount:6,shadowCastingLocalLights:0,passes:['finite','fixed-budget','nearest-floor','hysteresis-no-micro-jitter','day-night-contrast','no-material-recompile','noncompounding-emission','cleanup-restores-cache','navigation-arrays-unchanged','stacked-floor-selection'],regions:reports,sourceHashes};fs.writeFileSync('qa/lighting-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
