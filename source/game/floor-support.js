// Visual foot support uses the same authored surfaces as movement. This query
// samples the footprint, not a distant floor above/below the current actor.
export function surfaceHeightAt(x,z,s){
 if(x<s.minX-1e-6||x>s.maxX+1e-6||z<s.minZ-1e-6||z>s.maxZ+1e-6)return null;
 if((s.axis==='x'||s.axis==='z')&&Number.isFinite(s.endY)){const n=s.axis==='x'?x:z,lo=s.axis==='x'?s.minX:s.minZ,hi=s.axis==='x'?s.maxX:s.maxZ;return s.y+(s.endY-s.y)*Math.max(0,Math.min(1,(n-lo)/(hi-lo||1)));}
 return s.y;
}
export function characterFloorOffsetAt(lot,x,y,z){
 let offset=0;for(const s of lot?.characterFloorSurfaces||[])if(Math.abs(y-s.baseY)<.25&&x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ)offset=Math.max(offset,s.offset);return offset;
}
export function visualSupportHeight(lot,x,z,currentY=0,multilevel=false){
 let height=multilevel?null:.015,flatHeight=multilevel?null:.015;
 for(const s of[...(lot?.walkableSurfaces||[]),...(lot?.group?.userData?.rugSurfaces||[])]){const y=surfaceHeightAt(x,z,s);if(y===null||multilevel&&Math.abs(y-currentY)>.48)continue;if(height===null||y>height)height=y;if(!s.axis&&(flatHeight===null||y>flatHeight))flatHeight=y;}
 // A smooth controller ramp may be drawn as shallow individual treads. Foot
 // IK follows their exact top faces, even where a tread is below the ramp.
 let visual=null;for(const s of lot?.characterFootSurfaces||[]){const y=surfaceHeightAt(x,z,s);if(y===null||Math.abs(y-currentY)>.48)continue;if(visual===null||y>visual)visual=y;}if(visual!==null)height=flatHeight===null?visual:Math.max(visual,flatHeight);
 return height===null?null:height+characterFloorOffsetAt(lot,x,height,z);
}
export function footprintSupportHeight(lot,minX,maxX,minZ,maxZ,currentY=0,multilevel=false){
 const overlaps=s=>Math.max(minX,s.minX)<=Math.min(maxX,s.maxX)&&Math.max(minZ,s.minZ)<=Math.min(maxZ,s.maxZ);
 const nearby=y=>!multilevel||Math.abs(y-currentY)<=.48;
 const visual=(lot?.characterFootSurfaces||[]).filter(s=>overlaps(s)&&nearby(s.y));
 let height=multilevel?null:.015;
 for(const s of[...(lot?.walkableSurfaces||[]),...(lot?.group?.userData?.rugSurfaces||[]),...visual]){
  if(!overlaps(s)||s.axis&&visual.length)continue;
  const x0=Math.max(minX,s.minX),x1=Math.min(maxX,s.maxX),z0=Math.max(minZ,s.minZ),z1=Math.min(maxZ,s.maxZ);
  const y=Math.max(surfaceHeightAt(x0,z0,s),surfaceHeightAt(x1,z1,s));if(!nearby(y))continue;if(height===null||y>height)height=y;
 }
 if(height===null)return null;
 let offset=0;for(const s of lot?.characterFloorSurfaces||[])if(overlaps(s)&&Math.abs(height-s.baseY)<.25)offset=Math.max(offset,s.offset);
 return height+offset;
}
