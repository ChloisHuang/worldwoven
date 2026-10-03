// Static-prepared semantic gates. No geometry epsilon or mounting band changes.
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const finiteBox=b=>b&&['minX','maxX','minY','maxY','minZ','maxZ'].every(k=>Number.isFinite(b[k]))&&b.minX<b.maxX&&b.minY<b.maxY&&b.minZ<b.maxZ;
const triangleCount=o=>(o?.geometry?.index?.count??o?.geometry?.attributes?.position?.count??0)/3;
const validRange=(r,o)=>Number.isInteger(r?.firstTriangle)&&r.firstTriangle>=0&&Number.isInteger(r?.triangleCount)&&r.triangleCount>0&&r.firstTriangle+r.triangleCount<=triangleCount(o);
export function actualHingeStrap(d,leaf,eps){
 if(!leaf?.object||!Number.isInteger(leaf.index)||d.motion!=='hinge'||d.style==='shoji')return null;
 const ranges=leaf.object.userData?.hingeStrapRanges;if(!Array.isArray(ranges))return null;
 const matches=ranges.filter(r=>validRange(r,leaf.object)&&leaf.index>=r.firstTriangle&&leaf.index<r.firstTriangle+r.triangleCount);
 if(matches.length!==1)return null;const r=matches[0],gap=d.kind==='door'?(d.bottomClearance??0):0;
 if(!Number.isFinite(gap)||gap<0||gap>.03||r.side!==leaf.side||!finite3(r.center)||!finite3(r.size)||r.size.some((v,i)=>Math.abs(v-[.19,.09,.09][i])>eps))return null;
 const x=leaf.side*(leaf.width/2+.065),ys=[.2,.8].map(f=>gap+(d.height-gap)*f);
 if(Math.abs(r.center[0]-x)>eps||Math.abs(r.center[2])>eps||!ys.some(y=>Math.abs(r.center[1]-y)<=eps))return null;
 if(!leaf.local?.every(p=>finite3(p)&&p.every((v,i)=>Math.abs(v-r.center[i])<=r.size[i]/2+eps)))return null;
 // Validate against the expected generation box as well as recorded metadata,
 // so metadata tolerance cannot expand the exact strap dimensions twice.
 const y=ys.find(y=>Math.abs(r.center[1]-y)<=eps),expected=[x,y,0],size=[.19,.09,.09];
 if(!leaf.local.every(p=>p.every((v,i)=>Math.abs(v-expected[i])<=size[i]/2+eps)))return null;
 return {firstTriangle:r.firstTriangle,triangleCount:r.triangleCount,side:r.side,center:r.center,size:r.size,gap};
}
export function semanticJambCandidates(d,solids,wallPlane,eps,colliders){
 if(!Array.isArray(solids))return [];
 const duplicate=new Set();for(const s of solids){if(typeof s?.id!=='string'||!s.id)continue;if(duplicate.has(s.id))throw Error('Duplicate hinge mounting solid id');duplicate.add(s.id);}
 const normal=d.axis==='x'?'Z':'X',lateral=d.axis==='x'?'X':'Z',nAxis=d.axis==='x'?2:0,lAxis=d.axis==='x'?0:2,lc=d.center[lAxis];
 return solids.flatMap((s,registryIndex)=>{
  if(typeof s?.id!=='string'||!s.id||!finiteBox(s.bounds)||s.axis!==d.axis||!Number.isFinite(s.plane)||Math.abs(s.plane-wallPlane)>.035)return [];
  if(!((s.kind==='structural-wall'&&s.source==='frenchRoomWall')||(s.kind==='door-casing'&&s.source==='joined-doorway-casing')))return [];
  const b=s.bounds,tagged=Array.isArray(colliders)?colliders.map((box,index)=>({box,index})).filter(x=>x.box.hingeMountSolidId===s.id):[];
  if(!tagged.length||tagged.some(x=>!finiteBox(x.box)||['minX','maxX','minY','maxY','minZ','maxZ'].some(k=>Math.abs(x.box[k]-b[k])>eps)))return [];
  if(b.maxY-b.minY<d.height-.25||Math.abs((b['min'+normal]+b['max'+normal])/2-wallPlane)>.035)return [];
  if(Math.min(Math.abs(b['max'+lateral]-(lc-d.width/2)),Math.abs(b['min'+lateral]-(lc+d.width/2)))>.035)return [];
  // Optional fields describe the aperture, never the support's own center.
  if(s.openingWidth!==undefined&&(!Number.isFinite(s.openingWidth)||Math.abs(s.openingWidth-d.width)>eps))return [];
  if(s.center!==undefined&&(!finite3(s.center)||Math.abs(s.center[lAxis]-lc)>.035||Math.abs(s.center[nAxis]-wallPlane)>.035))return [];
  return [{index:tagged[0].index,colliderSource:'cameraColliders',registryIndex,semantic:true,solidId:s.id,kind:s.kind,source:s.source,original:{...tagged[0].box},box:{min:[b.minX,b.minY,b.minZ],max:[b.maxX,b.maxY,b.maxZ]}}];
 });
}
export function actualStaticMountTriangle(staticRow,jamb){
 if(!staticRow?.object||staticRow.instance!=null||!Number.isInteger(staticRow.triangle)||!jamb?.semantic)return false;
 const ranges=staticRow.object.userData?.hingeMountRanges;if(!Array.isArray(ranges))return false;
 const matches=ranges.filter(r=>validRange(r,staticRow.object)&&staticRow.triangle>=r.firstTriangle&&staticRow.triangle<r.firstTriangle+r.triangleCount);
 return matches.length===1&&matches[0].solidId===jamb.solidId;
}
