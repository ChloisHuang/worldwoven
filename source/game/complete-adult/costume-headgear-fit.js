/** Private, already-instantiated costume hats fit the actual merged adult hair.
 * Run after the existing neutral group transform. This never changes the shared
 * actor template, hair, identity, skeleton, material, or ownership/disposal path.
 * Consort pins and open flower ornaments are deliberately outside this scope. */
import * as THREE from 'three';
const PIVOT=1.455,CENTER_Z=-.025,TAU=Math.PI*2,SECTORS=48,CLEARANCE=.002;
const CAPS={
 'Original civil official black winged cap':{kind:'official',shell:'court-official-rounded-black-crown'},
 'Original Ming folded black duty cap':{kind:'jinyi',shell:'jinyi-folded-crown'},
 'Original palace emperor court ornaments':{kind:'emperor',shell:'black everyday yishan cap'}
};
const HAIR=/^(hair-|continuous-swept-hair|side-swept-fringe|side-part-hair|combed-|tapered-side-lock|side-flow)/;
function restMatrix(group,mesh){
 const chain=[];let node=mesh;while(node&&node!==group.parent){chain.push(node);node=node.parent;}
 const matrix=new THREE.Matrix4().makeTranslation(0,PIVOT,0);for(const n of chain.reverse()){n.updateMatrix();matrix.multiply(n.matrix);}return matrix;
}
function samples(actor,low,high){
 const points=[],seen=new Set();
 const add=(x,y,z)=>{if(y<low||y>high)return;const key=[x,y,z].map(v=>Math.round(v*1e6)).join('|');if(seen.has(key))return;seen.add(key);const radius=Math.hypot(x,z-CENTER_Z);if(radius>1e-8)points.push({x,y,z,radius,angle:(Math.atan2(x,z-CENTER_Z)+TAU)%TAU});};
 actor.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const g=mesh.geometry,p=g.attributes.position,ix=g.index;
  for(const r of g.userData.sourceRanges??[]){if(!HAIR.test(r.name)&&!r.name.startsWith('continuous-head-anatomical-'))continue;
   for(let i=r.start;i<r.start+r.count;i++)add(p.getX(i),p.getY(i),p.getZ(i));
   // A crest can cross a coarse cap triangle between its vertices. Retain
   // actual indexed surface interiors, not only the furthest vertex in a bin.
   for(let j=r.indexStart;j<r.indexStart+r.indexCount;j+=3){const ids=[ix.getX(j),ix.getX(j+1),ix.getX(j+2)];
    for(const w of [[.5,.5,0],[0,.5,.5],[.5,0,.5],[1/3,1/3,1/3]]){const q=[0,1,2].map(k=>ids.reduce((sum,id,h)=>sum+p.array[id*3+k]*w[h],0));add(...q);}
   }
  }
 });return points;
}
function shellSurface(shell,matrix){
 const p=shell.geometry.attributes.position,ix=shell.geometry.index,triangles=[],v=new THREE.Vector3();let low=Infinity,high=-Infinity;
 const positions=Array.from({length:p.count},(_,i)=>{v.fromBufferAttribute(p,i).applyMatrix4(matrix);low=Math.min(low,v.y);high=Math.max(high,v.y);return v.clone();});
 for(let j=0;j<(ix?.count??p.count);j+=3){const points=[0,1,2].map(k=>positions[ix?ix.getX(j+k):j+k]);triangles.push({points,lo:Math.min(...points.map(v=>v.y)),hi:Math.max(...points.map(v=>v.y))});}
 const ray=new THREE.Ray(),hit=new THREE.Vector3();return{low,high,at(q){ray.origin.set(0,q.y,CENTER_Z);ray.direction.set(q.x/q.radius+1e-9,0,(q.z-CENTER_Z)/q.radius).normalize();let radius=-Infinity;
  for(const t of triangles)if(q.y>=t.lo&&q.y<=t.hi&&ray.intersectTriangle(...t.points,false,hit))radius=Math.max(radius,hit.distanceTo(ray.origin));return radius;
 }};
}
function smoothField(field){for(let pass=0;pass<3;pass++){const old=field.slice();for(let i=0;i<SECTORS;i++)field[i]=Math.max(old[i],(old[(i+SECTORS-1)%SECTORS]+2*old[i]+old[(i+1)%SECTORS])/4);}}
function applyField(parts,field){
 let maximumPush=0;const v=new THREE.Vector3();
 for(const {mesh,matrix,inverse}of parts){const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i).applyMatrix4(matrix);const x=v.x,z=v.z-CENTER_Z,radius=Math.hypot(x,z);if(radius<1e-8)continue;
   const cell=(Math.atan2(x,z)+TAU)%TAU/TAU*SECTORS,j=Math.floor(cell)%SECTORS,t=cell-Math.floor(cell),factor=field[j]*(1-t)+field[(j+1)%SECTORS]*t;
   // Crown vertices expand locally. Distant wing ends receive the same small
   // root allowance rather than stretching the entire wide costume group.
   const push=(factor-1)*Math.min(radius,.125);maximumPush=Math.max(maximumPush,push);v.x+=x/radius*push;v.z+=z/radius*push;v.applyMatrix4(inverse);p.setXYZ(i,v.x,v.y,v.z);
  }
  p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
 }return maximumPush;
}
export function fitCompleteAdultCostumeHeadgear(actor,group){
 const previous=group.userData.completeAdultCostumeHeadgear;if(previous)return previous;
 const model=actor.root.userData.characterModel,spec=CAPS[group.name];
 if(!model?.applied||!model.attachmentFit?.savedHair||!spec)return{applied:false,reason:spec?'no-saved-adult-hair':'open-ornament-or-unrecognized-group'};
 let shell=null;const parts=[];group.traverse(mesh=>{if(!mesh.isMesh)return;if(mesh.name===spec.shell||mesh.userData.originalParts?.includes(spec.shell))shell=mesh;const matrix=restMatrix(group,mesh);parts.push({mesh,matrix,inverse:matrix.clone().invert()});});
 if(!shell)throw new Error('Authored costume cap is missing its crown');
 const matrix=parts.find(p=>p.mesh===shell).matrix,initial=shellSurface(shell,matrix),protectedPoints=samples(actor,initial.low+.0005,initial.high-.0005);
 let maximumPush=0,passes=0,initialPenetration=0,minimumClearance=Infinity;
 for(;passes<6;passes++){
  const surface=shellSurface(shell,matrix),field=Array(SECTORS).fill(1);let worst=0;
  for(const q of protectedPoints){const radius=surface.at(q);if(!Number.isFinite(radius))throw new Error('Costume cap has no crown surface at a protected hair point');
   const deficit=q.radius+CLEARANCE-radius;if(passes===0)initialPenetration=Math.max(initialPenetration,q.radius-radius);if(deficit<=.00002)continue;
   worst=Math.max(worst,deficit);const cell=q.angle/TAU*SECTORS,j=Math.floor(cell)%SECTORS,factor=1+deficit/Math.min(radius,.125);field[j]=Math.max(field[j],factor);field[(j+1)%SECTORS]=Math.max(field[(j+1)%SECTORS],factor);
  }
  if(worst<=.00002)break;smoothField(field);maximumPush+=applyField(parts,field);
 }
 const fitted=shellSurface(shell,matrix);for(const q of protectedPoints)minimumClearance=Math.min(minimumClearance,fitted.at(q)-q.radius);
 const result={applied:true,kind:spec.kind,samples:protectedPoints.length,passes,initialPenetration,minimumClearance,maximumPush,clearance:CLEARANCE};
 group.userData.completeAdultCostumeHeadgear=result;return result;
}
