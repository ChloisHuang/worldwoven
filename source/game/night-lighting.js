import * as THREE from 'three';

// The former six player-following GPU lights are replaced by a fixed field.
// Every authored fixture contributes at its real world position; at most six
// sources contribute to a field cell, with zero extra GPU PointLights.
export const LOCAL_LIGHT_BUDGET = 6;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;
export const NIGHT_PALETTE = Object.freeze({sky:0x253d58,skyEgypt:0x283b56,hemi:0xa6bfdc,ground:0x526880,sun:0xa8c2ef,hemiIntensity:.38,sunIntensity:.18});

/** Place a zero-geometry fixture marker before static packing. Coordinates are
 * local to parent; markers survive the existing packers unchanged. */
export function registerNightFixture(parent,x,y,z,options={}) {
  const marker=new THREE.Object3D();
  marker.name='Night fixture · '+(options.kind||'lantern');
  marker.position.set(x,y,z);
  marker.userData.nightFixture={color:0xffc27b,intensity:17,distance:8,decay:1.7,dayFactor:.12,kind:'lantern',...options};
  parent.add(marker);return marker;
}

function supportFloor(lot,p) {
  let best=-Infinity;
  for(const s of lot.walkableSurfaces||[]) {
    if(p.x<s.minX-.5||p.x>s.maxX+.5||p.z<s.minZ-.5||p.z>s.maxZ+.5)continue;
    let y=s.y;
    if(s.axis){const t=clamp(((s.axis==='x'?p.x:p.z)-(s.axis==='x'?s.minX:s.minZ))/((s.axis==='x'?s.maxX:s.maxZ)-(s.axis==='x'?s.minX:s.minZ)),0,1);y=s.y+(s.endY-s.y)*t;}
    if(y<p.y-.5&&y>best)best=y;
  }
  const levels=(lot.levels||[{y:0}]).map(l=>l.y).filter(Number.isFinite);
  if(best===-Infinity)best=levels.reduce((a,b)=>Math.abs(b-(p.y-2.6))<Math.abs(a-(p.y-2.6))?b:a,levels[0]??0);
  // Balcony/window fixtures can lie just outside a walkable slab. Prefer the
  // nearest storey below the fixture instead of assigning a high lantern to
  // the distant terrain underneath the complete building.
  const nearbyLevels=levels.filter(y=>p.y-y>.5&&p.y-y<=3.65);
  if(nearbyLevels.length)best=Math.max(...nearbyLevels);
  // Rug/platform offsets are not separate storeys; levels supply stable bands.
  return levels.reduce((a,b)=>Math.abs(b-best)<Math.abs(a-best)?b:a,levels[0]??0);
}

// Static lamp irradiance is baked once per region. It uses every authored
// source, at most six contributors per cell, fixed world/floor occlusion, and
// a bounded half-float volume. It is sampled with the original Toon ramp and the field
// dominant fixture direction; moving a camera never moves or switches a lamp.
export const NIGHT_FIELD_POLICY=Object.freeze({maxVoxels:200000,horizontalStep:1,verticalStep:.6,radianceLimit:32,maxSourcesPerCell:6});
function makeFieldOcclusion(lot) {
 const cell=4,buckets=new Map();
 const boxes=(lot.cameraColliders||[]).filter(b=>[b.minX,b.maxX,b.minZ,b.maxZ].every(Number.isFinite)).map((b,index)=>({...b,minY:Number.isFinite(b.minY)?b.minY:0,maxY:Number.isFinite(b.maxY)?b.maxY:3.5,fieldOcclusionIndex:index}));
 for(const b of boxes)for(let z=Math.floor(b.minZ/cell);z<=Math.floor(b.maxZ/cell);z++)for(let x=Math.floor(b.minX/cell);x<=Math.floor(b.maxX/cell);x++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(b);}
 // Reuse visit stamps across synchronous rays; the private collider copies and
 // exact slab math are unchanged. Avoid per-ray Sets and per-box axis arrays.
 const visited=new Uint32Array(boxes.length);let stamp=0;
 return (p,f)=>{
  const dx=f.position.x-p.x,dy=f.position.y-p.y,dz=f.position.z-p.z,length=Math.hypot(dx,dy,dz);
  if(length<.5)return false;
  const first=.12/length,last=1-.3/length;
  stamp=(stamp+1)>>>0;if(stamp===0){visited.fill(0);stamp=1;}
  for(let z=Math.floor(Math.min(p.z,f.position.z)/cell);z<=Math.floor(Math.max(p.z,f.position.z)/cell);z++)for(let x=Math.floor(Math.min(p.x,f.position.x)/cell);x<=Math.floor(Math.max(p.x,f.position.x)/cell);x++)for(const box of buckets.get(x+','+z)||[]){
   const index=box.fieldOcclusionIndex;if(visited[index]===stamp)continue;visited[index]=stamp;
   // Compact collision proxies around translucent lanterns/posts must not
   // enclose their own emitter. Never exempt a room wall or storey slab.
   if(box.maxX-box.minX<=1.6&&box.maxZ-box.minZ<=1.6&&f.position.x>=box.minX&&f.position.x<=box.maxX&&f.position.z>=box.minZ&&f.position.z<=box.maxZ&&f.position.y>=box.minY&&f.position.y<=box.maxY)continue;
   let lo=first,hi=last;
   for(let axis=0;axis<3;axis++){
    const origin=axis===0?p.x:axis===1?p.y:p.z,delta=axis===0?dx:axis===1?dy:dz,min=axis===0?box.minX:axis===1?box.minY:box.minZ,max=axis===0?box.maxX:axis===1?box.maxY:box.maxZ;
    if(Math.abs(delta)<1e-9){if(origin<min||origin>max){hi=-1;break;}}
    else{let a=(min-origin)/delta,b=(max-origin)/delta;if(a>b){const swap=a;a=b;b=swap;}lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)break;}
   }
   if(lo<=hi)return true;
  }
  return false;
 };
}
function buildFixtureField(lot,fixtures) {
 const started=performance.now(),bounds=new THREE.Box3().setFromObject(lot.group);
 for(const f of fixtures)bounds.expandByPoint(f.position);
 if(bounds.isEmpty())bounds.set(new THREE.Vector3(-1,0,-1),new THREE.Vector3(1,3,1));
 bounds.min.y=Math.min(bounds.min.y,...(lot.levels||[{y:0}]).map(l=>l.y));bounds.expandByScalar(1);
 const min=bounds.min.clone(),size=bounds.getSize(new THREE.Vector3()),policy=NIGHT_FIELD_POLICY;
 let stepScale=1,nx,ny,nz;
 do{nx=Math.max(2,Math.ceil(size.x/(policy.horizontalStep*stepScale))+1);ny=Math.max(2,Math.ceil(size.y/(policy.verticalStep*stepScale))+1);nz=Math.max(2,Math.ceil(size.z/(policy.horizontalStep*stepScale))+1);if(nx*ny*nz<=policy.maxVoxels)break;stepScale*=1.1;}while(true);
 const count=nx*ny*nz,day=new Uint16Array(count*4),night=new Uint16Array(count*4),direction=new Uint16Array(count*4),sourceCells=fixtures.map(()=>0),occluded=makeFieldOcclusion(lot);
 const levels=(lot.levels||[{y:0}]).map(l=>l.y).filter(Number.isFinite).sort((a,b)=>a-b);
 const p=new THREE.Vector3();let maxEnergy=0,occludedContributions=0;
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++) {
  p.set(min.x+size.x*x/(nx-1),min.y+size.y*y/(ny-1),min.z+size.z*z/(nz-1));
  let floor=levels[0]??0;
  if(lot.lightingZones){const zone=lot.lightingZones.find(z=>p.x>=z.minX&&p.x<=z.maxX&&p.z>=z.minZ&&p.z<=z.maxZ&&p.y>=z.minY&&p.y<z.maxY);floor=zone?.floorY??.115;}
  else for(const level of levels)if(level<=p.y)floor=level;
  const nearby=[];
  for(const f of fixtures) {
   if(Math.abs(f.floorY-floor)>.8)continue;
   const d=p.distanceTo(f.position);if(d>=f.distance)continue;
   const cutoff=Math.max(0,1-(d/f.distance)**4)**2,energy=f.intensity*cutoff/Math.max(d**f.decay,.01);
   nearby.push({f,energy});
  }
  nearby.sort((a,b)=>b.energy-a.energy||a.f.id-b.f.id);
  let nr=0,ng=0,nb=0,dr=0,dg=0,db=0,vx=0,vy=0,vz=0,used=0;
  for(const {f,energy}of nearby){
   if(occluded(p,f)){occludedContributions++;continue;}
   nr+=f.color.r*energy;ng+=f.color.g*energy;nb+=f.color.b*energy;
   dr+=f.color.r*energy*f.dayFactor;dg+=f.color.g*energy*f.dayFactor;db+=f.color.b*energy*f.dayFactor;
   const weight=energy/Math.max(p.distanceTo(f.position),.01);vx+=(f.position.x-p.x)*weight;vy+=(f.position.y-p.y)*weight;vz+=(f.position.z-p.z)*weight;sourceCells[f.id]++;
   if(++used===policy.maxSourcesPerCell)break;
  }
  const offset=(x+nx*(y+ny*z))*4,vl=Math.hypot(vx,vy,vz)||1;
  for(const [axis,value]of[vx/vl,vy/vl,vz/vl].entries())direction[offset+axis]=THREE.DataUtils.toHalfFloat(value);direction[offset+3]=THREE.DataUtils.toHalfFloat(1);maxEnergy=Math.max(maxEnergy,nr,ng,nb);
  for(const [data,values]of[[night,[nr,ng,nb]],[day,[dr,dg,db]]]){for(let c=0;c<3;c++)data[offset+c]=THREE.DataUtils.toHalfFloat(Math.min(policy.radianceLimit,values[c]));data[offset+3]=THREE.DataUtils.toHalfFloat(1);}
 }
 const texture=data=>{const t=new THREE.Data3DTexture(data,nx,ny,nz);t.format=THREE.RGBAFormat;t.type=THREE.HalfFloatType;t.minFilter=t.magFilter=THREE.LinearFilter;t.unpackAlignment=1;t.generateMipmaps=false;t.colorSpace=THREE.NoColorSpace;t.wrapS=t.wrapT=t.wrapR=THREE.ClampToEdgeWrapping;t.needsUpdate=true;return t;};
 const textures=[texture(day),texture(night),texture(direction)];
 return {textures,min,size,dimensions:[nx,ny,nz],bytes:count*24,sourceCells,maxEnergy,fixtureCount:fixtures.length,buildMs:performance.now()-started,occludedContributions,stepMetres:[size.x/(nx-1),size.y/(ny-1),size.z/(nz-1)]};
}
const FIELD_VERTEX=`
 vec4 fourfangFieldPosition = vec4( transformed, 1.0 );
 #ifdef USE_BATCHING
  fourfangFieldPosition = batchingMatrix * fourfangFieldPosition;
 #endif
 #ifdef USE_INSTANCING
  fourfangFieldPosition = instanceMatrix * fourfangFieldPosition;
 #endif
 vFourfangFieldWorld = ( modelMatrix * fourfangFieldPosition ).xyz;
`;
const FIELD_FRAGMENT=`
 if ( fourfangFieldEnabled > 0.5 ) {
  vec3 fieldWorldNormal = inverseTransformDirection( geometryNormal, viewMatrix );
  vec3 fieldUV = ( vFourfangFieldWorld + fieldWorldNormal * 0.12 - fourfangFieldMin ) / fourfangFieldSize;
  fieldUV = fieldUV * fourfangFieldUVScale + fourfangFieldUVBias;
  vec3 fieldColor = texture( fourfangFieldTexture, fieldUV ).rgb;
  vec3 fieldDirection = texture( fourfangFieldDirection, fieldUV ).rgb;
  float fieldLength = length( fieldDirection );
  if ( fieldLength > 0.02 ) {
   IncidentLight fieldLight;
   fieldLight.color = fieldColor;
   fieldLight.direction = normalize( mat3( viewMatrix ) * fieldDirection );
   fieldLight.visible = true;
   RE_Direct( fieldLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  }
 }
`;

export function createNightLighting({scene,hemi,sun}) {
  let lot=null,region='',night=false,disposed=false,fixtures=[],originals=[],emissions=[],field=null;
  const bindings=new Map(),fieldUniforms={fourfangFieldEnabled:{value:0},fourfangFieldTexture:{value:null},fourfangFieldDirection:{value:null},fourfangFieldUVScale:{value:new THREE.Vector3()},fourfangFieldUVBias:{value:new THREE.Vector3()},fourfangFieldMin:{value:new THREE.Vector3()},fourfangFieldSize:{value:new THREE.Vector3(1,1,1)}};

  function bindMaterials() {
    scene.traverse(o=>{for(const material of(Array.isArray(o.material)?o.material:o.material?[o.material]:[])) {
      if(!material.isMeshToonMaterial||bindings.has(material))continue;
      const compile=material.onBeforeCompile,key=material.customProgramCacheKey;
      const release=()=>{material.onBeforeCompile=compile;material.customProgramCacheKey=key;material.removeEventListener('dispose',release);bindings.delete(material);};material.addEventListener('dispose',release);
      bindings.set(material,{compile,key,release});
      material.onBeforeCompile=function(shader,renderer){
        compile.call(this,shader,renderer);
        if(!shader.vertexShader.includes('#include <worldpos_vertex>')||!shader.fragmentShader.includes('#include <lights_fragment_end>'))throw Error('Unsupported Toon shader for fixed fixture field');
        Object.assign(shader.uniforms,fieldUniforms);
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFourfangFieldWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n'+FIELD_VERTEX);
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
          varying vec3 vFourfangFieldWorld;
          uniform float fourfangFieldEnabled;
          uniform sampler3D fourfangFieldTexture, fourfangFieldDirection;
          uniform vec3 fourfangFieldMin, fourfangFieldSize, fourfangFieldUVScale, fourfangFieldUVBias;
        `).replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n'+FIELD_FRAGMENT);
      };
      material.customProgramCacheKey=function(){return key.call(this)+'|fourfang-world-field-v1';};
      material.needsUpdate=true;
    }});
  }
  function applyMode() {
    if(!lot)return;
    if(field)fieldUniforms.fourfangFieldTexture.value=field.textures[night?1:0];
    if(night){hemi.color.set(NIGHT_PALETTE.hemi);hemi.groundColor.set(NIGHT_PALETTE.ground);hemi.intensity=NIGHT_PALETTE.hemiIntensity;sun.color.set(NIGHT_PALETTE.sun);sun.intensity=NIGHT_PALETTE.sunIntensity;}
    else{hemi.color.set(0xfff4d8);hemi.groundColor.set(0x6e8a7b);hemi.intensity=Math.max(.58,lot.group.userData.ambientIntensity??.65);sun.color.set(0xffedcd);sun.intensity=lot.group.userData.sunIntensity??1.6;}
    for(const e of emissions)e.material.emissiveIntensity=night?Math.max(.78,e.original*1.35):e.original*.5;
  }
  function detach() {
    fieldUniforms.fourfangFieldEnabled.value=0;
    for(const [material,binding]of bindings){material.onBeforeCompile=binding.compile;material.customProgramCacheKey=binding.key;material.removeEventListener('dispose',binding.release);material.needsUpdate=true;}bindings.clear();
    for(const texture of field?.textures||[])texture.dispose();field=null;fieldUniforms.fourfangFieldTexture.value=null;fieldUniforms.fourfangFieldDirection.value=null;
    // Restore cache-shared material values before the owner disposes the lot.
    for(const e of emissions)e.material.emissiveIntensity=e.original;
    // Put authored point sources back only for a detached, non-rendered lot.
    for(const o of originals){o.light.intensity=o.intensity;o.parent?.add(o.light);}
    lot=null;fixtures=[];originals=[];emissions=[];
  }
  function attach(nextLot,nextRegion) {
    if(disposed)throw Error('Night lighting is disposed');
    detach();lot=nextLot;region=nextRegion;lot.group.updateMatrixWorld(true);
    const sources=[],seenMaterials=new Set();
    lot.group.traverse(o=>{
      if(o.isPointLight)sources.push(o);
      if(o.userData.nightFixture)sources.push(o);
      for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])) {
        // Only warm fixtures/flames/signs, never water, foliage, or character skin.
        if(!seenMaterials.has(m)&&m.emissive&&m.emissive.r>m.emissive.g*1.12&&m.emissiveIntensity>0){seenMaterials.add(m);emissions.push({material:m,original:m.emissiveIntensity});}
      }
    });
    for(const o of sources) {
      const opts=o.userData.nightFixture||{},p=o.getWorldPosition(new THREE.Vector3());
      if(![p.x,p.y,p.z].every(Number.isFinite))continue;
      const isLight=o.isPointLight,color=isLight?o.color.clone():new THREE.Color(opts.color);
      const f={id:fixtures.length,name:o.name||'Authored room lamp',position:p,color,
        floorY:finite(opts.floorY,supportFloor(lot,p)),
        intensity:clamp(finite(opts.intensity,isLight?Math.max(region==='japan'?16:12,o.intensity):17)*.72,1,20),
        distance:clamp(finite(opts.distance,isLight?o.distance:8),3,13),
        decay:clamp(finite(opts.decay,isLight?o.decay:1.7),1.4,2),
        dayFactor:clamp(finite(opts.dayFactor,isLight?.62:.12),0,1),kind:opts.kind||'interior'};
      fixtures.push(f);
      if(isLight){originals.push({light:o,parent:o.parent,intensity:o.intensity});o.removeFromParent();}
    }
    field=buildFixtureField(lot,fixtures);
    fieldUniforms.fourfangFieldTexture.value=field.textures[night?1:0];fieldUniforms.fourfangFieldDirection.value=field.textures[2];
    fieldUniforms.fourfangFieldUVScale.value.set(...field.dimensions.map(n=>(n-1)/n));fieldUniforms.fourfangFieldUVBias.value.set(...field.dimensions.map(n=>.5/n));
    fieldUniforms.fourfangFieldMin.value.copy(field.min);fieldUniforms.fourfangFieldSize.value.copy(field.size);fieldUniforms.fourfangFieldEnabled.value=1;
    bindMaterials();applyMode();return api;
  }
  // Discover newly created actor/outfit materials, independent of observer
  // position. The baked textures and their world transform never change here.
  function update() {if(lot)bindMaterials();}
  function setNight(value){night=!!value;applyMode();}
  function getDebug(){return {region,night,budget:LOCAL_LIGHT_BUDGET,fixtureCount:fixtures.length,activeCount:field?.sourceCells.filter(n=>n>0).length||0,gpuPointLights:0,anchored:true,selectionMode:'world-fixed-field',field:field?{dimensions:field.dimensions,bytes:field.bytes,fixtureCount:field.fixtureCount,maxSourcesPerCell:LOCAL_LIGHT_BUDGET,bindings:bindings.size,buildMs:field.buildMs,occludedContributions:field.occludedContributions,stepMetres:field.stepMetres,sourceCells:field.sourceCells,volumeSamplesPerFragment:2,rampSamplesPerFragment:1,activeGPUPointLights:0}:null,fixtures:fixtures.map(f=>({id:f.id,name:f.name,kind:f.kind,position:f.position.toArray(),floorY:f.floorY,intensity:f.intensity,distance:f.distance,dayFactor:f.dayFactor})),global:{hemiIntensity:hemi.intensity,hemiColor:hemi.color.toArray(),groundColor:hemi.groundColor.toArray(),sunIntensity:sun.intensity,sunColor:sun.color.toArray()}};}
  function dispose(){if(disposed)return;detach();disposed=true;}
  const api={inspectField:()=>field,attach,detach,update,setNight,applyMode:setNight,isNight:()=>night,getDebug,dispose};return api;
}
