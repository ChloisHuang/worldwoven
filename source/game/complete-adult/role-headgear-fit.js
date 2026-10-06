/** Fit the three authored work hats to the completed adult head and the actual
 * selected hairstyle. This runs once per cached template, after hair is fitted.
 * Only hat vertices move: head, hair, body, identity and garment colors do not.
 * Y-up, face +Z, metres. The low openings sit on the crown instead of floating
 * above it; crown rows enclose the real hair surface, including a swept crest. */
import * as THREE from 'three';
export const ROLE_HEADGEAR=/^(cook-soft-cap|cook-cap-band|artist-beret|garden-straw-brim|garden-straw-crown)$/;
const SEGMENTS=24,TAU=Math.PI*2,CLEARANCE=.002;
const HATS={chef:{shell:'cook-soft-cap',depth:.048,headroom:.019},artist:{shell:'artist-beret',depth:.038,headroom:.014},gardener:{shell:'garden-straw-crown',depth:.035,headroom:.032}};
const isCrown=m=>m.isMesh&&(m.userData.completeAdultPart==='skin'||['hair','long-hair'].includes(m.userData.completeAdultPart)||/^(continuous-head-anatomical|hair-|continuous-swept-hair|side-swept-fringe|side-part-hair|combed-|tapered-side-lock|side-flow)/.test(m.name));
function rowData(mesh,fit){
 const p=mesh.geometry.attributes.position,rows=[];
 if(p.count%(SEGMENTS+1))throw new Error('Unrecognized role-headgear topology: '+mesh.name);
 for(let start=0;start<p.count;start+=SEGMENTS+1){
  const points=Array.from({length:SEGMENTS+1},(_,j)=>[p.getX(start+j)*fit.scale[0]+fit.offset[0],p.getY(start+j)*fit.scale[1]+fit.offset[1],p.getZ(start+j)*fit.scale[2]+fit.offset[2]]);
  const center=[0,1,2].map(k=>points.slice(0,SEGMENTS).reduce((s,q)=>s+q[k],0)/SEGMENTS);
  rows.push({center,radii:points.slice(0,SEGMENTS).map(q=>Math.hypot(q[0]-center[0],q[2]-center[2]))});
 }return rows;
}
function crownTriangles(meshes,low){
 const triangles=[];
 for(const mesh of meshes){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;
  for(let j=0;j<(ix?.count??p.count);j+=3){
   const a=[0,1,2].map(k=>{const i=ix?ix.getX(j+k):j+k;return[p.getX(i),p.getY(i),p.getZ(i)];});
   const minY=Math.min(...a.map(q=>q[1])),maxY=Math.max(...a.map(q=>q[1]));
   if(maxY>=low)triangles.push({a,minY,maxY});
  }
 }return triangles;
}
/** Exact triangle/plane sections, sampled along the existing hat's 24 rays.
 * The source meshes may contain overlapping locks; take the outside union.
 * No scene raycasting, animation work, or per-actor background process. */
function sectionRadii(triangles,y,cx,cz){
 const segments=[];
 for(const t of triangles){if(y<t.minY||y>t.maxY)continue;const points=[];
  for(let j=0;j<3;j++){const a=t.a[j],b=t.a[(j+1)%3];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y)){const f=(y-a[1])/(b[1]-a[1]);points.push([a[0]+f*(b[0]-a[0])-cx,a[2]+f*(b[2]-a[2])-cz]);}}
  if(points.length===2)segments.push(points);
 }
 const result=Array(SEGMENTS).fill(0);
 for(let j=0;j<SEGMENTS;j++){const a=j/SEGMENTS*TAU,dx=Math.sin(a),dz=Math.cos(a);
  for(const [p,q]of segments){const vx=q[0]-p[0],vz=q[1]-p[1],den=dx*vz-dz*vx;if(Math.abs(den)<1e-12)continue;
   const distance=(p[0]*vz-p[1]*vx)/den,u=(p[0]*dz-p[1]*dx)/den;
   if(distance>0&&u>=-1e-8&&u<=1+1e-8)result[j]=Math.max(result[j],distance);
  }
 }
 // A polygon chord is inside its endpoint radii. Compensate for that chord,
 // then round small lock recesses outward without pushing any hair inward.
 for(let j=0;j<SEGMENTS;j++)if(result[j])result[j]=result[j]/Math.cos(Math.PI/SEGMENTS)+CLEARANCE;
 // Include the section endpoints between angular samples as well. Otherwise a
 // narrow swept lock could pass through a 24-sided crown between two rays.
 const step=TAU/SEGMENTS;
 for(const segment of segments)for(const p of segment){
  const angle=(Math.atan2(p[0],p[1])+TAU)%TAU,j=Math.floor(angle/step)%SEGMENTS,k=(j+1)%SEGMENTS,t=angle-j*step;
  const need=Math.hypot(...p)+CLEARANCE,a=result[j],b=result[k];
  if(!a||!b){result[j]=Math.max(a,need/Math.cos(step));result[k]=Math.max(b,need/Math.cos(step));continue;}
  const at=Math.sin(step)/(Math.sin(step-t)/a+Math.sin(t)/b),ratio=Math.max(1,need/at);result[j]*=ratio;result[k]*=ratio;
 }
 for(let pass=0;pass<2;pass++){const before=result.slice();for(let j=0;j<SEGMENTS;j++)result[j]=Math.max(before[j],(before[(j+SEGMENTS-1)%SEGMENTS]+2*before[j]+before[(j+1)%SEGMENTS])/4);}
 return result;
}
function writeHat(mesh,rows,closeTop){
 const old=mesh.geometry,index=Array.from(old.index.array),positions=[];
 for(const row of rows)for(let j=0;j<=SEGMENTS;j++){const a=j/SEGMENTS*TAU,r=row.radii[j%SEGMENTS];positions.push(row.center[0]+Math.sin(a)*r,row.center[1],row.center[2]+Math.cos(a)*r);}
 if(closeTop){const tip=positions.length/3,row=rows.at(-1),last=(rows.length-1)*(SEGMENTS+1);positions.push(...row.center);for(let j=0;j<SEGMENTS;j++)index.push(last+j,last+j+1,tip);}
 old.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));old.setIndex(index);old.deleteAttribute('normal');old.computeVertexNormals();
 // Preserve smooth wrapped normals, including the duplicate first/last seam.
 const n=old.attributes.normal,v=new THREE.Vector3();for(let row=0;row<rows.length;row++){const a=row*(SEGMENTS+1),b=a+SEGMENTS;v.fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
 if(old.attributes.sourceY)old.setAttribute('sourceY',new THREE.Float32BufferAttribute(Array.from({length:positions.length/3},(_,i)=>positions[i*3+1]),1));
 old.computeBoundingBox();old.computeBoundingSphere();mesh.userData.completeAdultRoleHeadgear=true;
}
export function fitCompleteAdultRoleHeadgear(head,options,attachmentFit){
 if(head.userData.completeAdultRoleHeadgear)return head.userData.completeAdultRoleHeadgear;
 const hats=head.children.filter(m=>m.isMesh&&ROLE_HEADGEAR.test(m.name)),spec=HATS[options.style];
 // Non-French artist clothing deliberately has no beret. Never invent a new
 // culture accessory just because another culture has one with the same role.
 if(!hats.length)return{applied:false,reason:'no-authored-headgear',style:options.style??'casual',meshes:[]};
 const shell=hats.find(m=>m.name===spec?.shell),skin=head.children.find(m=>m.userData.completeAdultPart==='skin');
 if(!shell||!skin)throw new Error('Complete adult head and authored work hat required');
 const crown=head.children.filter(isCrown),p=skin.geometry.attributes.position;let skullTop=-Infinity;
 for(let i=0;i<p.count;i++)skullTop=Math.max(skullTop,p.getY(i));
 const low=skullTop-.065,box=new THREE.Box3(),v=new THREE.Vector3();
 for(let i=0;i<p.count;i++)if(p.getY(i)>=low)box.expandByPoint(v.fromBufferAttribute(p,i));
 const center=box.getCenter(new THREE.Vector3()),seatY=skullTop-spec.depth;
 let hairTop=skullTop;for(const mesh of crown){mesh.geometry.computeBoundingBox();hairTop=Math.max(hairTop,mesh.geometry.boundingBox.max.y);}
 const authored=new Map(hats.map(m=>[m,rowData(m,attachmentFit)])),base=authored.get(shell)[0],last=authored.get(shell).at(-1);
 const topY=Math.max(seatY+last.center[1]-base.center[1],hairTop+spec.headroom),vertical=(topY-seatY)/(last.center[1]-base.center[1]);
 const lowest=Math.min(...[...authored.values()].map(rows=>rows[0].center[1])),triangles=crownTriangles(crown,seatY+(lowest-base.center[1])*vertical-.001);
 const opening=sectionRadii(triangles,seatY,center.x,center.z);
 if(opening.some(r=>!r))throw new Error('Work hat opening has no continuous scalp support');
 let enclosedRows=0;
 for(const [mesh,sourceRows]of authored){
  const rows=sourceRows.map(row=>{
   const cx=center.x+row.center[0]-base.center[0],cz=center.z+row.center[2]-base.center[2],y=seatY+(row.center[1]-base.center[1])*vertical,required=sectionRadii(triangles,y,cx,cz);
   if(required.some(r=>r>0))enclosedRows++;
   return{center:[cx,y,cz],radii:row.radii.map((r,j)=>Math.max(opening[j]*r/base.radii[j],required[j]))};
  });
  // Round local row shoulders outward, never through the protected crown.
  for(let pass=0;pass<2;pass++){const radii=rows.map(r=>r.radii.slice());for(let i=1;i<rows.length-1;i++)for(let j=0;j<SEGMENTS;j++)rows[i].radii[j]=Math.max(radii[i][j],(radii[i-1][j]+2*radii[i][j]+radii[i+1][j])/4);}
  writeHat(mesh,rows,mesh===shell);
 }
 const result={applied:true,style:options.style,meshes:hats.map(m=>m.name),seatY,skullTop,hairTop,topY,clearance:CLEARANCE,enclosedRows};
 head.userData.completeAdultRoleHeadgear=result;attachmentFit.roleHeadgear=result;return result;
}
