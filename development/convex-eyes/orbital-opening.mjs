/** Bounded polygon clipping for two anatomical openings in the front skin.
 * Lids fill these openings from the inset globe to their outer skin boundary.
 */
import * as THREE from 'three';
import {eyeLayout,eyeLidBoundary} from './eye-surface.mjs';
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function clip(poly,a,b,inside){
 const out=[];for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],dp=cross(a,b,p),dq=cross(a,b,q),ip=inside?dp>=-1e-12:dp<=1e-12,iq=inside?dq>=-1e-12:dq<=1e-12;
  if(ip)out.push(p);if(ip!==iq){const t=dp/(dp-dq);out.push(p.map((v,k)=>v+(q[k]-v)*t));}
 }return out;
}
function subtract(poly,opening){
 let inner=poly;const outside=[];
 for(let i=0;i<opening.length&&inner.length>=3;i++){
  const a=opening[i],b=opening[(i+1)%opening.length],outer=clip(inner,a,b,false);
  if(outer.length>=3)outside.push(outer);inner=clip(inner,a,b,true);
 }return outside;
}
export function cutOrbitalOpenings(head,{masc,traits}){
 const m=head.getObjectByName('continuous-head-jaw-cheeks-nose'),g=m.geometry,p=g.attributes.position,ix=g.index;
 const openings=[-1,1].map(side=>{
  const layout=eyeLayout({side,masc,traits,coherent:true}),points=[];
  // Clockwise upper/lower outline reversed so each inside half-plane is left.
  for(let i=0;i<=24;i++)points.push(eyeLidBoundary(layout,i/24,true,true));
  for(let i=23;i>=1;i--)points.push(eyeLidBoundary(layout,i/24,false,true));
  points.reverse();return{points,minX:layout.cx-layout.hw,maxX:layout.cx+layout.hw,minY:layout.cy-.015*layout.eye,maxY:layout.cy+.020*layout.eye};
 });
 const positions=[],indices=[],weld=new Map();let cut=0;
 const vertex=v=>{const key=v.map(x=>Math.round(x*1e8)).join(',');let n=weld.get(key);if(n===undefined){n=positions.length/3;weld.set(key,n);positions.push(...v);}return n;};
 for(let i=0;i<ix.count;i+=3){
  const tri=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,ix.getX(i+j)).toArray());let polys=[tri];
  if(tri.every(v=>v[2]>.005))for(const opening of openings){
   if(Math.max(...tri.map(v=>v[0]))<opening.minX||Math.min(...tri.map(v=>v[0]))>opening.maxX||Math.max(...tri.map(v=>v[1]))<opening.minY||Math.min(...tri.map(v=>v[1]))>opening.maxY)continue;
   polys=polys.flatMap(poly=>subtract(poly,opening.points));cut++;
  }
  for(const poly of polys)for(let j=1;j<poly.length-1;j++){
   const a=vertex(poly[0]),b=vertex(poly[j]),c=vertex(poly[j+1]);if(a!==b&&b!==c&&a!==c)indices.push(a,b,c);
  }
 }
 const replacement=new THREE.BufferGeometry();replacement.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));replacement.setIndex(indices);replacement.computeVertexNormals();replacement.userData.orbitalCutTriangles=cut;g.dispose();m.geometry=replacement;
}
