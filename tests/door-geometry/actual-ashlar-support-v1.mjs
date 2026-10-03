// Existing ashlar triangles only; no generated replacement boundary or EPS increase.
import * as K from './triangle-kernel-v3.mjs';
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const finiteBox=b=>b&&finite3(b.min)&&finite3(b.max)&&b.min.every((v,i)=>v<b.max[i]);
const equalBox=(a,b,e)=>finiteBox(a)&&finiteBox(b)&&a.min.every((v,i)=>Math.abs(v-b.min[i])<=e&&Math.abs(a.max[i]-b.max[i])<=e);
const colliderBox=c=>({min:[c?.minX,c?.minY,c?.minZ],max:[c?.maxX,c?.maxY,c?.maxZ]});
const triCount=o=>(o?.geometry?.index?.count??o?.geometry?.attributes?.position?.count??0)/3;
function validRange(r,o){return typeof r?.primitiveId==='string'&&Number.isInteger(r.firstTriangle)&&r.firstTriangle>=0&&r.triangleCount===44&&r.firstTriangle+44<=triCount(o);}
export function selectActualAshlarSupport({jamb,rows,registry,cameraColliders,openingId,eps}){
 const fail=reason=>({accepted:false,rows:[],proof:{method:'Source-locked actual 44-triangle ashlar ownership',reason}}),id=jamb.original?.qaAshlarSupportId;
 if(typeof id!=='string'||!Array.isArray(registry))return fail('Missing actual primitive identity');
 const matches=registry.filter(r=>r.id===id);if(matches.length!==1)return fail('Missing/duplicate registry primitive');const solid=matches[0];
 if(solid.openingId!==openingId||solid.triangleCount!==44||!equalBox(solid.bounds,jamb.box,eps)||!equalBox(solid.actualBounds,solid.bounds,eps))return fail('Primitive aperture or exact full bounds mismatch');
 if(!Array.isArray(solid.triangles)||solid.triangles.length!==44||solid.triangles.some(t=>t.length!==3||t.some(p=>!finite3(p))))return fail('Incomplete original generated geometry');
 const cameras=(cameraColliders??[]).filter(c=>c.qaAshlarSupportId===id);if(cameras.length!==1||!equalBox(colliderBox(cameras[0]),solid.bounds,eps))return fail('Missing/mismatched same-id actual finite camera collider');
 const selected=[],owners=new Set();
 for(const row of rows){if(row.instance!=null||!Number.isInteger(row.triangle))continue;const ranges=row.object?.userData?.qaAshlarRanges;if(!Array.isArray(ranges))continue;
  const hits=ranges.filter(r=>Number.isInteger(r.firstTriangle)&&Number.isInteger(r.triangleCount)&&row.triangle>=r.firstTriangle&&row.triangle<r.firstTriangle+r.triangleCount);
  if(!hits.some(r=>r.primitiveId===id))continue;if(hits.length!==1||!validRange(hits[0],row.object))return fail('Ambiguous/malformed actual range ownership');
  const r=hits[0],i=row.triangle-r.firstTriangle,expected=solid.triangles[i];if(!row.t?.every((p,k)=>finite3(p)&&p.every((v,a)=>Math.abs(v-expected[k][a])<=eps))||!row.t.every(p=>K.contains(solid.bounds,p,eps)))return fail('Rendered triangle differs from source-generated primitive');
  owners.add(row.object);selected.push({row,localTriangle:i});
 }
 if(owners.size!==1||selected.length!==44||new Set(selected.map(s=>s.localTriangle)).size!==44)return fail('Missing or duplicated actual primitive triangles; need all 44 from one owning mesh');
 selected.sort((a,b)=>a.localTriangle-b.localTriangle);const actualBounds=K.bounds(selected.flatMap(s=>s.row.t));if(!equalBox(actualBounds,solid.actualBounds,eps))return fail('Actual full primitive extents changed');
 return {accepted:true,rows:selected.map(s=>s.row),proof:{method:'44 existing source-owned ashlar triangles; exact reviewed generation tuple, unchanged complete batched range, matching finite body/camera bounds',primitiveId:id,openingId,selectedTriangles:44,bounds:solid.bounds,actualBounds,source:solid.source,worldTriangles:selected.map(({row,localTriangle})=>({localTriangle,staticMesh:row.mesh,staticPath:row.path,staticTriangle:row.triangle,t:row.t,normal:row.normal}))}};
}
