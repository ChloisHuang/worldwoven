/**
 * Lot navigation. Calls without surface options retain the original 2D behavior.
 * Every mode accepts explicit outer-edge bounds. Actor centers stay radius units
 * inside explicit bounds; omitted bounds retain the original center limits.
 * R6 flat lots: {bounds: lot.bounds, multilevel: false} (keeps y unchanged).
 * R6 layered lots: {bounds: lot.bounds, surfaces, legacyGround: false}.
 * multilevel:false explicitly overrides surfaces; legacyGround:true instead
 * enables an implicit ground support in height-aware mode. Never set it on lots
 * where floor holes, underground passages or unsupported voids are meaningful.
 *
 * Multilevel options (the last argument of every public navigation function):
 *   surfaces / walkableSurfaces: [{minX,maxX,minZ,maxZ,y,axis?,endY?}]
 *     A ramp's y is at the minimum axis coordinate; endY is at the maximum.
 *   legacyGround: add an implicit ground plane (default false with surfaces).
 *   groundY: 0, bodyHeight: 1.95, maxStep: .4, floorTolerance: .22,
 *   bounds: BOUNDS, gridStep: .5, radius: .34, pathRadius: .39.
 *   cache: true, cacheVersion: 0. Reuse one options object per static lot to
 *     retain its spatial index, grid nodes, and validated edges. After in-place
 *     geometry edits, increment cacheVersion or call clearNavigationCache(options).
 *     Replacing arrays or changing their lengths automatically invalidates it.
 *     All retained data is weakly keyed by options and releases with the lot.
 * blocked(x,z,colliders,r,options) uses options.y as the feet height.
 * moveWithCollision(pos,dx,dz,colliders,r,options) mutates x/y/z continuously.
 * findPath(start,end,colliders,options) returns {x,y,z} waypoints; end.y selects
 * the destination floor, defaulting to start.y. It never snaps between floors.
 * resolveSurfaceHeight(pos,options) returns a reachable support y or null.
 * canTraverse(start,end,colliders,options) checks the entire supported segment.
 * A surfaces array can also be passed directly as the options argument.
 *
 * 3D collider intervals are [minY,maxY], defaulting to [-1,3.5] for old boxes.
 * The player's feet may touch a collider's top; their head may touch its bottom.
 * Walkable surfaces also act as ceiling planes, so a hole is required above a
 * ramp. Collision boxes for slabs should have maxY equal to their support y.
 */
export const BOUNDS={minX:-14.4,maxX:14.4,minZ:-19.4,maxZ:19.4};
const EPS=1e-5;
const DEFAULT_BODY_HEIGHT=1.95;
const DEFAULT_STEP=.4;
const SEARCH_CACHES=new WeakMap();
export function clearNavigationCache(options) {
  if(options&&(typeof options==='object'||typeof options==='function'))SEARCH_CACHES.delete(options);
}
const EMPTY_SURFACES=Object.freeze([]);
const DIRECTIONS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

function optionsOf(options={}) {
  return Array.isArray(options)?{surfaces:options}:options||{};
}
function surfacesOf(options) { return options.surfaces??options.walkableSurfaces??EMPTY_SURFACES; }
function isMultilevel(options) {
  return !!options&&options.multilevel!==false&&(Array.isArray(options)||options.multilevel===true||
    Array.isArray(options.surfaces)||Array.isArray(options.walkableSurfaces));
}
function inBounds(x,z,b=BOUNDS,inset=0) {
  return Number.isFinite(x)&&Number.isFinite(z)&&x>=b.minX+inset-EPS&&x<=b.maxX-inset+EPS&&
    z>=b.minZ+inset-EPS&&z<=b.maxZ-inset+EPS;
}
function centerInBounds(x,z,r,options) {
  return inBounds(x,z,options.bounds??BOUNDS,options.bounds?r:0);
}
function gridOf(options) {
  const bounds=options.bounds??BOUNDS,step=options.gridStep??.5;
  if(!Number.isFinite(step)||step<=0)throw new RangeError('gridStep must be positive and finite');
  if(![bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ].every(Number.isFinite)||
     bounds.minX>=bounds.maxX||bounds.minZ>=bounds.maxZ)throw new RangeError('Invalid navigation bounds');
  const ox=Math.floor(bounds.minX/step)*step,oz=Math.floor(bounds.minZ/step)*step;
  return {step,ox,oz,nx:Math.ceil((bounds.maxX-ox)/step)+1,nz:Math.ceil((bounds.maxZ-oz)/step)+1};
}
function onSurface(x,z,s) {
  return x>=s.minX-EPS&&x<=s.maxX+EPS&&z>=s.minZ-EPS&&z<=s.maxZ+EPS;
}
function surfaceY(x,z,s) {
  if((s.axis==='x'||s.axis==='z')&&Number.isFinite(s.endY)) {
    const low=s.axis==='x'?s.minX:s.minZ,high=s.axis==='x'?s.maxX:s.maxZ;
    const t=high===low?0:Math.max(0,Math.min(1,((s.axis==='x'?x:z)-low)/(high-low)));
    return s.y+(s.endY-s.y)*t;
  }
  return s.y;
}
function heightsAt(x,z,options) {
  if(!inBounds(x,z,options.bounds??BOUNDS))return [];
  const heights=[];
  for(const s of indexedAt(options._surfaceIndex,x,z)??surfacesOf(options))if(onSurface(x,z,s)) {
    const y=surfaceY(x,z,s);
    if(Number.isFinite(y)&&!heights.some(v=>Math.abs(v-y)<EPS))heights.push(y);
  }
  const implicit=options.legacyGround??!(options.surfaces||options.walkableSurfaces);
  if(implicit&&!heights.some(v=>Math.abs(v-(options.groundY??0))<EPS))heights.push(options.groundY??0);
  return heights.sort((a,b)=>b-a);
}
function horizontalHit(x,z,c,r) {
  return x>c.minX-r+EPS&&x<c.maxX+r-EPS&&z>c.minZ-r+EPS&&z<c.maxZ+r-EPS;
}
// Broad phases are shared by queries, movement, cached grid nodes and edges.
function colliderIndex(colliders,r=0) {
  const buckets=new Map(),size=2;
  for(const c of colliders) {
    const minX=Math.floor((c.minX-r)/size),maxX=Math.floor((c.maxX+r)/size);
    const minZ=Math.floor((c.minZ-r)/size),maxZ=Math.floor((c.maxZ+r)/size);
    for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++) {
      const key=`${x},${z}`;let list=buckets.get(key);
      if(!list){list=[];buckets.set(key,list);}list.push(c);
    }
  }
  return {buckets,size};
}
function indexedAt(index,x,z) {
  return index?(index.buckets.get(`${Math.floor(x/index.size)},${Math.floor(z/index.size)}`)??EMPTY_SURFACES):null;
}
function indexedSegment(index,start,end,fallback) {
  if(!index)return fallback;
  const found=new Set(),size=index.size;
  for(let x=Math.floor(Math.min(start.x,end.x)/size);x<=Math.floor(Math.max(start.x,end.x)/size);x++)
    for(let z=Math.floor(Math.min(start.z,end.z)/size);z<=Math.floor(Math.max(start.z,end.z)/size);z++)
      for(const item of index.buckets.get(`${x},${z}`)??EMPTY_SURFACES)found.add(item);
  return found;
}
function indexedOptions(options,colliders,r) {
  const o={...optionsOf(options)},bounds=o.bounds??BOUNDS,surfaces=surfacesOf(o);
  const radius=Math.max(r,o.pathRadius??.39,o.radius??.34),cacheable=options&&o.cache!==false;
  const signature=JSON.stringify([isMultilevel(o),!!o.bounds,bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ,
    o.gridStep??.5,radius,o.pathRadius??.39,o.radius??.34,o.bodyHeight??DEFAULT_BODY_HEIGHT,
    o.maxStep??DEFAULT_STEP,o.floorTolerance??.22,o.legacyGround,o.groundY??0,o.sampleStep??.12,
    o.endpointTolerance??.06,o.supportTolerance??.06,o.maxSnapDistance??4,o.maxNodes??60000,o.cacheVersion??0]);
  let retained=cacheable?SEARCH_CACHES.get(options):null;
  if(!retained||retained.signature!==signature||retained.colliders!==colliders||retained.surfaces!==surfaces||
     retained.colliderCount!==colliders.length||retained.surfaceCount!==surfaces.length) {
    retained={signature,colliders,surfaces,colliderCount:colliders.length,surfaceCount:surfaces.length,
      radius,version:o.cacheVersion??0,index:colliderIndex(colliders,radius),surfaceIndex:colliderIndex(surfaces),
      nodeCache:new Map(),nodes:new Map(),edges:new Map(),paths:new Map()};
    if(cacheable)SEARCH_CACHES.set(options,retained);
  }
  o._colliderIndex=retained.index;o._surfaceIndex=retained.surfaceIndex;o._cache=retained;
  return o;
}
function bodyBlocked(x,y,z,colliders,r,options,heights) {
  if(!centerInBounds(x,z,r,options))return true;
  const bodyHeight=options.bodyHeight??DEFAULT_BODY_HEIGHT;
  const index=options._colliderIndex;
  const nearby=indexedAt(index,x,z)??colliders;
  for(const c of nearby) {
    if(horizontalHit(x,z,c,r)&&y<(c.maxY??3.5)-EPS&&y+bodyHeight>(c.minY??-1)+EPS)return true;
  }
  // Floors above the player's feet are solid ceilings, including ramp undersides.
  for(const h of heights??heightsAt(x,z,options))if(h>y+EPS&&h<y+bodyHeight-EPS)return true;
  return false;
}
function supportAt(x,z,currentY,colliders,r,options,preferredY) {
  const maxStep=options.maxStep??DEFAULT_STEP;
  const heights=heightsAt(x,z,options);
  let candidates=heights.filter(y=>Math.abs(y-currentY)<=maxStep+EPS&&
    !bodyBlocked(x,y,z,colliders,r,options,heights));
  if(preferredY!==undefined)candidates.sort((a,b)=>Math.abs(a-preferredY)-Math.abs(b-preferredY)||b-a);
  // Without a target, prefer the highest reachable support. This steps onto a
  // ramp instead of following its overlapping ground plane underneath it.
  return candidates.length?candidates[0]:null;
}

export function blocked(x,z,colliders=[],r=.34,options) {
  if(typeof r==='object'){options=r;r=optionsOf(options).radius??.34;}
  const o=optionsOf(options);
  if(!isMultilevel(options)) {
    if(!centerInBounds(x,z,r,o))return true;
    return (indexedAt(o._colliderIndex,x,z)??colliders).some(c=>horizontalHit(x,z,c,r));
  }
  const y=o.y??o.feetY??o.groundY??0;
  const heights=heightsAt(x,z,o);
  if(!heights.some(h=>Math.abs(h-y)<=(o.supportTolerance??.06)))return true;
  return bodyBlocked(x,y,z,colliders,r,o,heights);
}

export function resolveSurfaceHeight(pos,options={},colliders=[]) {
  const o=optionsOf(options);
  if(!isMultilevel(o))return centerInBounds(pos.x,pos.z,o.radius??.34,o)?pos.y??o.groundY??0:null;
  return supportAt(pos.x,pos.z,pos.y??o.groundY??0,colliders.length?colliders:(o.colliders??[]),o.radius??.34,o,o.preferredY);
}

function segmentBodyBlocked(start,end,colliders,r,options) {
  const nearby=indexedSegment(options._colliderIndex,start,end,colliders);
  for(const c of nearby) {
    const maxY=c.maxY??3.5;
    if(maxY<=Math.min(start.y,end.y)+EPS||Math.max(start.y,end.y)+(options.bodyHeight??DEFAULT_BODY_HEIGHT)<=(c.minY??-1)+EPS)continue;
    if(Math.max(start.x,end.x)<=c.minX-r+EPS||Math.min(start.x,end.x)>=c.maxX+r-EPS||
       Math.max(start.z,end.z)<=c.minZ-r+EPS||Math.min(start.z,end.z)>=c.maxZ+r-EPS)continue;
    const box={minX:c.minX-r+EPS,maxX:c.maxX+r-EPS,minZ:c.minZ-r+EPS,maxZ:c.maxZ+r-EPS,
      minY:(c.minY??-1)-(options.bodyHeight??DEFAULT_BODY_HEIGHT)+EPS,maxY:maxY-EPS};
    if(segmentBoxIntersection(start,end,box)!==null)return true;
  }
  return false;
}

function traceSegment(start,end,colliders,r,options,checkEdgeStep=false) {
  const initialY=start.y??options.groundY??0;
  const desiredY=end.y;
  const initialSupport=supportAt(start.x,start.z,initialY,colliders,r,options,initialY);
  if(initialSupport===null||Math.abs(initialSupport-initialY)>(options.maxStep??DEFAULT_STEP)+EPS)return null;
  if(checkEdgeStep&&desiredY!==undefined&&Math.abs(desiredY-initialSupport)>(options.maxStep??DEFAULT_STEP)+EPS)return null;
  const distance=Math.hypot(end.x-start.x,end.z-start.z);
  const steps=Math.max(1,Math.ceil(distance/(options.sampleStep??.12)));
  const times=[];
  for(let i=1;i<=steps;i++)times.push(i/steps);
  // Sample just inside each support boundary as well as at regular intervals.
  // A narrow gap between two slabs must not disappear between grid samples.
  for(const s of indexedSegment(options._surfaceIndex,start,end,surfacesOf(options)))for(const axis of ['x','z']) {
    const delta=end[axis]-start[axis];if(Math.abs(delta)<EPS)continue;
    const other=axis==='x'?'z':'x',cap=axis.toUpperCase(),otherCap=other.toUpperCase();
    for(const limit of [s[`min${cap}`],s[`max${cap}`]]) {
      const t=(limit-start[axis])/delta;if(t<0||t>1)continue;
      const cross=start[other]+(end[other]-start[other])*t;
      if(cross<s[`min${otherCap}`]-EPS||cross>s[`max${otherCap}`]+EPS)continue;
      const margin=Math.min(.01,EPS*4/Math.abs(delta));
      for(const offset of [-margin,0,margin])if(t+offset>0&&t+offset<=1)times.push(t+offset);
    }
  }
  times.sort((a,b)=>a-b);
  let y=initialSupport,previousT=-1,previous={x:start.x,y:initialSupport,z:start.z};
  for(const t of times) {
    if(t-previousT<1e-8)continue;previousT=t;
    const x=start.x+(end.x-start.x)*t,z=start.z+(end.z-start.z)*t;
    const preferred=desiredY===undefined?undefined:initialSupport+(desiredY-initialSupport)*t;
    const nextY=supportAt(x,z,y,colliders,r,options,preferred);
    if(nextY===null)return null;
    const next={x,y:nextY,z};
    if(segmentBodyBlocked(previous,next,colliders,r,options))return null;
    previous=next;y=nextY;
  }
  if(desiredY!==undefined&&Math.abs(y-desiredY)>(options.endpointTolerance??.06))return null;
  return {x:end.x,y,z:end.z};
}

function legacySegmentSafe(start,end,colliders,r,options) {
  if(!centerInBounds(start.x,start.z,r,options)||!centerInBounds(end.x,end.z,r,options))return false;
  for(const c of indexedSegment(options._colliderIndex,start,end,colliders)) {
    if(segmentBoxIntersection({x:start.x,y:0,z:start.z},{x:end.x,y:0,z:end.z},
      {minX:c.minX-r+EPS,maxX:c.maxX+r-EPS,minZ:c.minZ-r+EPS,maxZ:c.maxZ+r-EPS,minY:-1,maxY:1})!==null)return false;
  }
  return true;
}
export function canTraverse(start,end,colliders=[],options={}) {
  const r=optionsOf(options).radius??.34,o=indexedOptions(options,colliders,r);
  return isMultilevel(o)?traceSegment(start,end,colliders,r,o)!==null:legacySegmentSafe(start,end,colliders,r,o);
}

export function moveWithCollision(pos,dx,dz,colliders=[],r=.34,options) {
  if(typeof r==='object'){options=r;r=optionsOf(options).radius??.34;}
  const o=indexedOptions(options,colliders,r);
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12)),sx=dx/steps,sz=dz/steps;
  if(!isMultilevel(options)) {
    for(let i=0;i<steps;i++) {
      if(legacySegmentSafe(pos,{x:pos.x+sx,z:pos.z},colliders,r,o))pos.x+=sx;
      if(legacySegmentSafe(pos,{x:pos.x,z:pos.z+sz},colliders,r,o))pos.z+=sz;
    }
    return pos;
  }
  if(!Number.isFinite(pos.y))pos.y=o.groundY??0;
  for(let i=0;i<steps;i++) {
    const next=traceSegment(pos,{x:pos.x+sx,z:pos.z+sz},colliders,r,o);
    if(next!==null) {pos.x=next.x;pos.z=next.z;pos.y=next.y;continue;}
    // Slide on walls, but never slide over an unsupported floor edge.
    if(Math.abs(sx)>EPS) {
      const side=traceSegment(pos,{x:pos.x+sx,z:pos.z},colliders,r,o);
      if(side!==null){pos.x=side.x;pos.y=side.y;}
    }
    if(Math.abs(sz)>EPS) {
      const side=traceSegment(pos,{x:pos.x,z:pos.z+sz},colliders,r,o);
      if(side!==null){pos.z=side.z;pos.y=side.y;}
    }
  }
  return pos;
}

class MinHeap {
  constructor(){this.items=[];}
  push(item) {
    let i=this.items.length;this.items.push(item);
    while(i>0){const p=(i-1)>>1;if(this.items[p].f<=item.f)break;this.items[i]=this.items[p];i=p;}
    this.items[i]=item;
  }
  pop() {
    const first=this.items[0],last=this.items.pop();
    if(this.items.length){let i=0;while(true){let c=i*2+1;if(c>=this.items.length)break;
      if(c+1<this.items.length&&this.items[c+1].f<this.items[c].f)c++;
      if(this.items[c].f>=last.f)break;this.items[i]=this.items[c];i=c;}
      this.items[i]=last;}
    return first;
  }
  get length(){return this.items.length;}
}

function findMultilevelPath(start,end,colliders,options) {
  const o=options,{step,nx,nz,ox,oz}=gridOf(o),r=o.pathRadius??.39;
  const maxStep=o.maxStep??DEFAULT_STEP,floorTolerance=o.floorTolerance??.22,endpointRadius=Math.min(r,o.radius??.34);
  const {nodeCache,nodes,edges}=o._cache;
  const edgeSafe=(a,b)=>{
    const key=a.key<b.key?`${a.key}>${b.key}`:`${b.key}>${a.key}`;
    if(!edges.has(key))edges.set(key,traceSegment(a,b,colliders,r,o,true)!==null);
    return edges.get(key);
  };
  const cell=p=>({ix:Math.max(0,Math.min(nx-1,Math.round((p.x-ox)/step))),iz:Math.max(0,Math.min(nz-1,Math.round((p.z-oz)/step)))});
  const at=(ix,iz)=>{
    if(ix<0||iz<0||ix>=nx||iz>=nz)return [];
    const k=iz*nx+ix;if(nodeCache.has(k))return nodeCache.get(k);
    const x=ox+ix*step,z=oz+iz*step,heights=heightsAt(x,z,o),result=[];
    for(const y of heights)if(!bodyBlocked(x,y,z,colliders,r,o,heights)) {
      const n={x,y,z,ix,iz,key:`${k}:${Math.round(y*100000)}`};result.push(n);nodes.set(n.key,n);
    }
    nodeCache.set(k,result);return result;
  };
  const near=(p,isStart)=>{
    const c=cell(p),desiredY=p.y??start.y??o.groundY??0,candidates=[];
    const rings=Math.ceil((o.maxSnapDistance??4)/step);
    for(let radius=0;radius<=rings;radius++) {
      for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++) {
        if(radius&&Math.abs(dx)!==radius&&Math.abs(dz)!==radius)continue;
        for(const n of at(c.ix+dx,c.iz+dz)) {
          if(Math.abs(n.y-desiredY)>(isStart?maxStep:floorTolerance)+EPS)continue;
          const d=Math.hypot(n.x-p.x,n.z-p.z);
          if(d>(o.maxSnapDistance??4)+EPS)continue;
          // A valid start must actually reach its seed; no wall/floor teleport.
          if(isStart&&!traceSegment({...p,y:desiredY},n,colliders,endpointRadius,o))continue;
          candidates.push({n,d:d+Math.abs(n.y-desiredY)});
        }
      }
      if(candidates.length){candidates.sort((a,b)=>a.d-b.d);return candidates[0].n;}
    }
    return null;
  };
  const a=near(start,true),b=near(end,false);if(!a||!b)return [];
  const heuristic=n=>Math.hypot(n.x-b.x,n.z-b.z,n.y-b.y);
  const open=new MinHeap(),from=new Map(),scores=new Map([[a.key,0]]),closed=new Set();
  open.push({n:a,g:0,f:heuristic(a)});
  let count=0;
  while(open.length&&count++<(o.maxNodes??60000)) {
    const {n:c,g}=open.pop(),k=c.key;
    if(closed.has(k)||g>(scores.get(k)??Infinity)+EPS)continue;
    if(k===b.key) {
      const result=[];let n=c;
      while(n){result.push({x:n.x,y:n.y,z:n.z});n=from.has(n.key)?nodes.get(from.get(n.key)):null;}
      result.reverse();
      if(Math.hypot(result[0].x-start.x,result[0].z-start.z)<.025&&Math.abs(result[0].y-(start.y??0))<.06)result.shift();
      const final=result[result.length-1]??{x:a.x,y:a.y,z:a.z};
      const desiredY=end.y??start.y??o.groundY??0;
      const exactY=supportAt(end.x,end.z,desiredY,colliders,endpointRadius,o,desiredY);
      if(exactY!==null&&Math.abs(exactY-desiredY)<=floorTolerance&&
        traceSegment(final,{x:end.x,y:exactY,z:end.z},colliders,endpointRadius,o)&&
        (Math.hypot(final.x-end.x,final.z-end.z)>.025||Math.abs(final.y-exactY)>.025))result.push({x:end.x,y:exactY,z:end.z});
      return result;
    }
    closed.add(k);
    for(const [dx,dz] of DIRECTIONS) {
      for(const v of at(c.ix+dx,c.iz+dz)) {
        if(closed.has(v.key)||Math.abs(v.y-c.y)>maxStep+EPS)continue;
        if(dx&&dz) {
          // Both orthogonal corners need a reachable support on this floor.
          const sideSafe=(ix,iz)=>at(ix,iz).some(side=>Math.abs(side.y-c.y)<=maxStep+EPS&&
            Math.abs(side.y-v.y)<=maxStep+EPS&&edgeSafe(c,side)&&edgeSafe(side,v));
          if(!sideSafe(c.ix+dx,c.iz)||!sideSafe(c.ix,c.iz+dz))continue;
        }
        if(!edgeSafe(c,v))continue;
        const next=g+Math.hypot(v.x-c.x,v.z-c.z,v.y-c.y);
        if(next+EPS<(scores.get(v.key)??Infinity)) {
          scores.set(v.key,next);from.set(v.key,k);open.push({n:v,g:next,f:next+heuristic(v)});
        }
      }
    }
  }
  return [];
}

// The 2D branch uses the same dynamic grid and persistent broad phase. It keeps
// the legacy {x,z} waypoint contract and never changes the caller's feet height.
function findLegacyPath(start,end,colliders,options) {
  const {step,nx,nz,ox,oz}=gridOf(options),r=options.pathRadius??.39,endpointRadius=Math.min(r,options.radius??.34);
  const {nodeCache,edges}=options._cache;
  const point=(x,z)=>({x:ox+x*step,z:oz+z*step});
  const cell=p=>({x:Math.max(0,Math.min(nx-1,Math.round((p.x-ox)/step))),z:Math.max(0,Math.min(nz-1,Math.round((p.z-oz)/step)))});
  const key=c=>c.z*nx+c.x;
  const safe=c=>{
    if(c.x<0||c.x>=nx||c.z<0||c.z>=nz)return false;
    const k=key(c);if(!nodeCache.has(k))nodeCache.set(k,!blocked(ox+c.x*step,oz+c.z*step,colliders,r,options));
    return nodeCache.get(k);
  };
  const edgeSafe=(a,b)=>{
    const ak=key(a),bk=key(b),k=ak<bk?`${ak}>${bk}`:`${bk}>${ak}`;
    if(!edges.has(k))edges.set(k,legacySegmentSafe(point(a.x,a.z),point(b.x,b.z),colliders,r,options));
    return edges.get(k);
  };
  const nearest=(p,isStart)=>{
    const c=cell(p),limit=options.maxSnapDistance??4;
    for(let radius=0;radius<=Math.ceil(limit/step);radius++) {
      const choices=[];
      for(let x=-radius;x<=radius;x++)for(let z=-radius;z<=radius;z++) {
        if(radius&&Math.abs(x)!==radius&&Math.abs(z)!==radius)continue;
        const v={x:c.x+x,z:c.z+z},q=point(v.x,v.z),d=Math.hypot(q.x-p.x,q.z-p.z);
        if(d>limit+EPS||!safe(v))continue;
        if(isStart&&!legacySegmentSafe(p,q,colliders,endpointRadius,options))continue;
        choices.push({v,d});
      }
      if(choices.length){choices.sort((a,b)=>a.d-b.d);return choices[0].v;}
    }
    return null;
  };
  const a=nearest(start,true),b=nearest(end,false);if(!a||!b)return [];
  const goal=key(b),open=new MinHeap(),from=new Map(),score=new Map([[key(a),0]]),closed=new Set();
  open.push({c:a,g:0,f:Math.hypot(a.x-b.x,a.z-b.z)});let count=0;
  while(open.length&&count++<(options.maxNodes??60000)) {
    const {c,g}=open.pop(),k=key(c);if(closed.has(k)||g>(score.get(k)??Infinity)+EPS)continue;
    if(k===goal){
      const result=[point(c.x,c.z)];let n=k;
      while(from.has(n)){n=from.get(n);result.push(point(n%nx,Math.floor(n/nx)));}
      result.reverse();
      if(Math.hypot(result[0].x-start.x,result[0].z-start.z)<.025)result.shift();
      const last=result.at(-1)??point(a.x,a.z);
      if(legacySegmentSafe(last,end,colliders,endpointRadius,options)&&Math.hypot(last.x-end.x,last.z-end.z)>.025)result.push({x:end.x,z:end.z});
      return result;
    }
    closed.add(k);
    for(const [dx,dz]of DIRECTIONS) {
      const v={x:c.x+dx,z:c.z+dz},vk=key(v);if(closed.has(vk)||!safe(v))continue;
      if(dx&&dz&&(!safe({x:c.x+dx,z:c.z})||!safe({x:c.x,z:c.z+dz})))continue;
      if(!edgeSafe(c,v))continue;
      const next=g+Math.hypot(dx,dz);
      if(next+EPS<(score.get(vk)??Infinity)){from.set(vk,k);score.set(vk,next);open.push({c:v,g:next,f:next+Math.hypot(v.x-b.x,v.z-b.z)});}
    }
  }
  return [];
}
export function findPath(start,end,colliders=[],options) {
  const o=indexedOptions(options,colliders,optionsOf(options).pathRadius??.39),paths=o._cache.paths;
  const key=JSON.stringify([start.x,start.y??null,start.z,end.x,end.y??null,end.z]);
  if(paths.has(key))return paths.get(key).map(p=>({...p}));
  const result=isMultilevel(o)?findMultilevelPath(start,end,colliders,o):findLegacyPath(start,end,colliders,o);
  // Return independent waypoint objects: controllers consume their path with
  // shift/splice and callers may mutate coordinates without poisoning the cache.
  if(paths.size>=64)paths.delete(paths.keys().next().value);
  paths.set(key,result.map(p=>({...p})));
  return result;
}

/** First segment/3D-box intersection fraction (0..1), or null. Useful for cameras. */
export function segmentBoxIntersection(start,end,box,padding=0) {
  let enter=0,exit=1;
  for(const axis of ['x','y','z']) {
    const upper=axis.toUpperCase();
    const lo=(box[`min${upper}`]??(axis==='y'?-1:-Infinity))-padding;
    const hi=(box[`max${upper}`]??(axis==='y'?3.5:Infinity))+padding;
    const from=start[axis]??0,delta=(end[axis]??0)-from;
    if(Math.abs(delta)<EPS){if(from<lo||from>hi)return null;continue;}
    let a=(lo-from)/delta,b=(hi-from)/delta;if(a>b)[a,b]=[b,a];
    enter=Math.max(enter,a);exit=Math.min(exit,b);if(enter>exit)return null;
  }
  return enter;
}
