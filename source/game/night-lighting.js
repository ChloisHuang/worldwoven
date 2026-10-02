import * as THREE from 'three';

// Six persistent, shadowless PointLights. Never add/remove or toggle visibility
// while rendering: Three's NUM_POINT_LIGHTS remains constant across day/night,
// floor transitions, overview, and travel. Authored lamps are data, not GPU lights.
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

export function createNightLighting({scene,hemi,sun}) {
  const pool=Array.from({length:LOCAL_LIGHT_BUDGET},(_,i)=>{
    const l=new THREE.PointLight(0xffc27b,0,8,1.7);l.name='Fixed local-light slot '+i;l.castShadow=false;l.visible=true;l.userData.nightLightSlot=i;scene.add(l);return l;
  });
  let lot=null,region='',night=false,disposed=false,fixtures=[],originals=[],emissions=[],currentFloor=0;
  let lastPosition=new THREE.Vector3(Infinity,Infinity,Infinity),hasPosition=false;
  const slots=Array(LOCAL_LIGHT_BUDGET).fill(null);

  function applyMode() {
    if(!lot)return;
    if(night){hemi.color.set(NIGHT_PALETTE.hemi);hemi.groundColor.set(NIGHT_PALETTE.ground);hemi.intensity=NIGHT_PALETTE.hemiIntensity;sun.color.set(NIGHT_PALETTE.sun);sun.intensity=NIGHT_PALETTE.sunIntensity;}
    else{hemi.color.set(0xfff4d8);hemi.groundColor.set(0x6e8a7b);hemi.intensity=Math.max(.58,lot.group.userData.ambientIntensity??.65);sun.color.set(0xffedcd);sun.intensity=lot.group.userData.sunIntensity??1.6;}
    for(const e of emissions)e.material.emissiveIntensity=night?Math.max(.78,e.original*1.35):e.original*.5;
    for(let i=0;i<pool.length;i++)applySlot(i);
  }
  function applySlot(i) {
    const l=pool[i],f=slots[i];
    if(!f){l.intensity=0;return;}
    l.position.copy(f.position);l.color.copy(f.color);l.distance=f.distance;l.decay=f.decay;
    l.intensity=f.intensity*(night?1:f.dayFactor);
  }
  function detach() {
    for(let i=0;i<pool.length;i++){slots[i]=null;pool[i].intensity=0;}
    // Restore cache-shared material values before the owner disposes the lot.
    for(const e of emissions)e.material.emissiveIntensity=e.original;
    // Put authored point sources back only for a detached, non-rendered lot.
    for(const o of originals){o.light.intensity=o.intensity;o.parent?.add(o.light);}
    lot=null;fixtures=[];originals=[];emissions=[];hasPosition=false;lastPosition.set(Infinity,Infinity,Infinity);
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
    applyMode();return api;
  }
  function update(position,{force=false}={}) {
    if(!lot||!position||![position.x,position.y,position.z].every(Number.isFinite))return;
    if(!force&&hasPosition&&lastPosition.distanceToSquared(position)<.16)return;
    const levels=(lot.levels||[{y:0}]).map(l=>l.y);
    const nearest=levels.reduce((a,b)=>Math.abs(b-position.y)<Math.abs(a-position.y)?b:a,levels[0]??0);
    if(!hasPosition||Math.abs(currentFloor-position.y)>Math.abs(nearest-position.y)+.35)currentFloor=nearest;
    const previous=new Set(slots.filter(Boolean).map(f=>f.id)),candidates=[];
    for(const f of fixtures) {
      if(Math.abs(f.floorY-currentFloor)>.8)continue;
      const d2=(f.position.x-position.x)**2+(f.position.z-position.z)**2;
      const reach=f.distance+4+(previous.has(f.id)?1.5:0);
      if(d2>reach*reach||Math.abs(f.position.y-position.y)>6.5)continue;
      // Retained fixtures get a 24% score advantage. Break exact ties by stable
      // source order, rather than time/randomness. No animated intensity noise.
      const score=(d2+(f.position.y-position.y-1.5)**2*.4+1)*(previous.has(f.id)?.76:1);
      candidates.push({f,score});
    }
    candidates.sort((a,b)=>a.score-b.score||a.f.id-b.f.id);
    const chosen=candidates.slice(0,LOCAL_LIGHT_BUDGET).map(c=>c.f),chosenIDs=new Set(chosen.map(f=>f.id));
    for(let i=0;i<slots.length;i++)if(slots[i]&&!chosenIDs.has(slots[i].id))slots[i]=null;
    for(const f of chosen)if(!slots.includes(f))slots[slots.indexOf(null)]=f;
    for(let i=0;i<pool.length;i++)applySlot(i);
    lastPosition.copy(position);hasPosition=true;
  }
  function setNight(value){night=!!value;applyMode();}
  function getDebug(){return {region,night,budget:LOCAL_LIGHT_BUDGET,fixtureCount:fixtures.length,activeCount:slots.filter(Boolean).length,floorY:currentFloor,slotIDs:slots.map(f=>f?.id??null),fixtures:fixtures.map(f=>({id:f.id,name:f.name,kind:f.kind,position:f.position.toArray(),floorY:f.floorY,intensity:f.intensity,distance:f.distance,dayFactor:f.dayFactor})),lights:pool.map((l,i)=>({slot:i,id:slots[i]?.id??null,position:l.position.toArray(),color:l.color.toArray(),intensity:l.intensity,distance:l.distance,decay:l.decay,castShadow:l.castShadow,visible:l.visible})),global:{hemiIntensity:hemi.intensity,hemiColor:hemi.color.toArray(),groundColor:hemi.groundColor.toArray(),sunIntensity:sun.intensity,sunColor:sun.color.toArray()}};}
  function dispose(){if(disposed)return;detach();for(const l of pool){scene.remove(l);l.dispose?.();}disposed=true;}
  const api={attach,detach,update,setNight,applyMode:setNight,isNight:()=>night,getDebug,dispose};return api;
}
