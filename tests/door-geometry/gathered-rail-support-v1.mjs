// Additive static-support certificate; no moving-leaf contact waiver.
import * as K from './triangle-kernel-v3.mjs';
const axes='XYZ';
export function evaluateRailSupport({endpoints,jambs,index,eps,isSupportTriangle=()=>true,selectSupportTriangles=null}){
 const selections=new Map();
 const result={status:'FAIL_UNPROVEN_RAIL_SUPPORT',ends:[],method:'Each actual rod endcap vertex strictly contained on all six oriented cardinal rays in one bounded actual jamb triangle set; actual endcap triangles must have no support-boundary contact',topologyLimit:'Inherited cardinal containment oracle; not a topology validation of arbitrary open/nonmanifold triangle soups'};
 for(const end of endpoints){const evidence={side:end.side,center:end.center,capTriangles:end.triangles,vertexCount:end.points.length,accepted:false,attempts:[]};
  for(const jamb of jambs){
   // The box selects a possible support, never establishes that it is solid.
   if(!end.points.every(p=>K.contains(jamb.box,p,-eps)))continue;
   let selected=null,selectionProof=null;if(selectSupportTriangles){if(!selections.has(jamb))selections.set(jamb,selectSupportTriangles(jamb,index.tris));const choice=selections.get(jamb);if(choice){selectionProof=choice.proof;if(!choice.accepted){evidence.attempts.push({support:{colliderIndex:jamb.index,bounds:jamb.box},contained:false,selectionProof,reason:'Actual support boundary certificate missing'});continue;}selected=new Set(choice.rows);}}
   const eligible=s=>(!selected||selected.has(s))&&isSupportTriangle(s,jamb)&&s.t.every(p=>K.contains(jamb.box,p,eps));
   const at=(axis,p)=>index.rays[axis].at(p).map(i=>index.tris[i]).filter(eligible),vertexProofs=[];let contained=true;
   for(const p of end.points){const c=K.cardinalContainment(p,(axis,q)=>at(axis,q).map(s=>s.t),eps);if(!c.inside){contained=false;vertexProofs.push({point:p,inside:false,rays:c.rays});break;}
    const rays=[];for(let axis=0;axis<3;axis++)for(const sign of[-1,1]){const direction=[0,0,0];direction[axis]=sign;let first=null;for(const s of at(axis,p)){const hit=K.rayTriangle(p,direction,s.t,eps*.01);if(hit&&(!first||hit.distance<first.distance))first={distance:hit.distance,sign:hit.sign,edge:hit.edge,staticMesh:s.mesh,staticPath:s.path,staticTriangle:s.triangle,staticInstance:s.instance,staticWorldTriangle:s.t,staticNormal:s.normal,hitPoint:K.add(p,K.mul(direction,hit.distance))};}rays.push({axis:axes[axis],sign,orientedWinding:c.rays.find(r=>r.axis===axis&&r.sign===sign).sum,firstActualHit:first});}
    vertexProofs.push({point:p,inside:true,rays});
   }
   let boundaryContact=null;
   if(contained){const capBounds=K.bounds(end.triangles.flat());const expanded={min:capBounds.min.map(x=>x-eps),max:capBounds.max.map(x=>x+eps)};for(const id of index.surface.query(expanded)){const s=index.tris[id];if(!eligible(s))continue;for(const cap of end.triangles){const contact=K.triangleContact(cap,s.t,eps);if(contact){boundaryContact={staticPath:s.path,staticTriangle:s.triangle,staticWorldTriangle:s.t,capTriangle:cap,event:contact};break;}}if(boundaryContact)break;}}
   const attempt={support:{colliderIndex:jamb.index,colliderSource:jamb.colliderSource??'colliders',solidId:jamb.solidId??null,source:jamb.source??null,bounds:jamb.box},contained,boundaryContact,selectionProof,vertexProofs};evidence.attempts.push(attempt);
   if(contained&&!boundaryContact){evidence.accepted=true;evidence.support=attempt.support;break;}
  }
  if(!evidence.attempts.length)evidence.reason='No eligible actual jamb bounds strictly surround this rod endcap; no AABB-only support acceptance';
  result.ends.push(evidence);
 }
 if(result.ends.length===2&&result.ends.every(e=>e.accepted))result.status='PASS_ACTUAL_ROD_ENDCAP_SUPPORT';
 return result;
}
