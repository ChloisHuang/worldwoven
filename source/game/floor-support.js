// Visual foot support uses the same authored surfaces as movement. This query
// samples the footprint, not a distant floor above/below the current actor.
const SUPPORT_CACHES=new WeakMap(),CELL_SIZE=2,EDGE_EPS=1e-6,EMPTY=[];
const EMPTY_CELL={support:EMPTY,visual:EMPTY,offset:EMPTY};
// Authored floors stay fixed after a lot is built. Retain only nearby candidates
// for the many sole probes per actor; all exact height/overlap tests stay below.
// Array replacement/length changes invalidate automatically. Call this after an
// in-place bounds/array-item edit, as navigation also needs invalidation.
export function clearFloorSupportCache(lot){if(lot)SUPPORT_CACHES.delete(lot);}
function supportIndex(lot){
 const walkable=lot?.walkableSurfaces||EMPTY,rugs=lot?.group?.userData?.rugSurfaces||EMPTY,visual=lot?.characterFootSurfaces||EMPTY,offset=lot?.characterFloorSurfaces||EMPTY;
 let index=lot&&SUPPORT_CACHES.get(lot);
 if(index&&index.walkable===walkable&&index.rugs===rugs&&index.visual===visual&&index.offset===offset&&index.walkableCount===walkable.length&&index.rugCount===rugs.length&&index.visualCount===visual.length&&index.offsetCount===offset.length)return index;
 index={walkable,rugs,visual,offset,walkableCount:walkable.length,rugCount:rugs.length,visualCount:visual.length,offsetCount:offset.length,cells:new Map()};
 for(const [surfaces,kind]of[[walkable,'support'],[rugs,'support'],[visual,'visual'],[offset,'offset']])for(const s of surfaces){
  const minX=Math.floor((s.minX-EDGE_EPS)/CELL_SIZE),maxX=Math.floor((s.maxX+EDGE_EPS)/CELL_SIZE),minZ=Math.floor((s.minZ-EDGE_EPS)/CELL_SIZE),maxZ=Math.floor((s.maxZ+EDGE_EPS)/CELL_SIZE);
  for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){
   const key=x+','+z;let cell=index.cells.get(key);if(!cell){cell={support:[],visual:[],offset:[]};index.cells.set(key,cell);}cell[kind].push(s);
  }
 }
 if(lot)SUPPORT_CACHES.set(lot,index);return index;
}
function cellAt(index,x,z){return index.cells.get(Math.floor(x/CELL_SIZE)+','+Math.floor(z/CELL_SIZE))||EMPTY_CELL;}
function floorOffset(surfaces,x,y,z){let offset=0;for(const s of surfaces)if(Math.abs(y-s.baseY)<.25&&x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ)offset=Math.max(offset,s.offset);return offset;}
export function surfaceHeightAt(x,z,s){
 if(x<s.minX-1e-6||x>s.maxX+1e-6||z<s.minZ-1e-6||z>s.maxZ+1e-6)return null;
 if((s.axis==='x'||s.axis==='z')&&Number.isFinite(s.endY)){const n=s.axis==='x'?x:z,lo=s.axis==='x'?s.minX:s.minZ,hi=s.axis==='x'?s.maxX:s.maxZ;return s.y+(s.endY-s.y)*Math.max(0,Math.min(1,(n-lo)/(hi-lo||1)));}
 return s.y;
}
export function characterFloorOffsetAt(lot,x,y,z){
 return floorOffset(cellAt(supportIndex(lot),x,z).offset,x,y,z);
}
export function visualSupportHeight(lot,x,z,currentY=0,multilevel=false){
 const cell=cellAt(supportIndex(lot),x,z);let height=multilevel?null:.015,flatHeight=multilevel?null:.015;
 for(const s of cell.support){const y=surfaceHeightAt(x,z,s);if(y===null||multilevel&&Math.abs(y-currentY)>.48)continue;if(height===null||y>height)height=y;if(!s.axis&&(flatHeight===null||y>flatHeight))flatHeight=y;}
 // A smooth controller ramp may be drawn as shallow individual treads. Foot
 // IK follows their exact top faces, even where a tread is below the ramp.
 let visual=null;for(const s of cell.visual){const y=surfaceHeightAt(x,z,s);if(y===null||Math.abs(y-currentY)>.48)continue;if(visual===null||y>visual)visual=y;}if(visual!==null)height=flatHeight===null?visual:Math.max(visual,flatHeight);
 return height===null?null:height+floorOffset(cell.offset,x,height,z);
}
export function footprintSupportHeight(lot,minX,maxX,minZ,maxZ,currentY=0,multilevel=false){
 const index=supportIndex(lot),cells=[];
 for(let x=Math.floor(minX/CELL_SIZE);x<=Math.floor(maxX/CELL_SIZE);x++)for(let z=Math.floor(minZ/CELL_SIZE);z<=Math.floor(maxZ/CELL_SIZE);z++){const cell=index.cells.get(x+','+z);if(cell)cells.push(cell);}
 const overlaps=s=>Math.max(minX,s.minX)<=Math.min(maxX,s.maxX)&&Math.max(minZ,s.minZ)<=Math.min(maxZ,s.maxZ);
 const nearby=y=>!multilevel||Math.abs(y-currentY)<=.48;
 const visual=[];for(const cell of cells)for(const s of cell.visual)if(overlaps(s)&&nearby(s.y))visual.push(s);
 let height=multilevel?null:.015;
 // Repeated candidates at cell boundaries are harmless maxima. Keeping them
 // avoids allocating/deduplicating a Set for every shoe footprint.
 for(const surfaces of[...cells.map(cell=>cell.support),visual])for(const s of surfaces){
  if(!overlaps(s)||s.axis&&visual.length)continue;
  const x0=Math.max(minX,s.minX),x1=Math.min(maxX,s.maxX),z0=Math.max(minZ,s.minZ),z1=Math.min(maxZ,s.maxZ);
  const y=Math.max(surfaceHeightAt(x0,z0,s),surfaceHeightAt(x1,z1,s));if(!nearby(y))continue;if(height===null||y>height)height=y;
 }
 if(height===null)return null;
 let offset=0;for(const cell of cells)for(const s of cell.offset)if(overlaps(s)&&Math.abs(height-s.baseY)<.25)offset=Math.max(offset,s.offset);
 return height+offset;
}
