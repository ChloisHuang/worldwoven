// Dependency-free double-precision geometry predicates for QA, not production.
export const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.sqrt(dot(a,a));
export const bounds=t=>({min:t[0].map((_,i)=>Math.min(...t.map(p=>p[i]))),max:t[0].map((_,i)=>Math.max(...t.map(p=>p[i])))});
export const overlap=(a,b,e=0)=>a.min.every((v,i)=>v<=b.max[i]+e&&a.max[i]>=b.min[i]-e);
export const contains=(b,p,e=0)=>p.every((v,i)=>v>=b.min[i]-e&&v<=b.max[i]+e);
const unique=(points,e)=>points.filter((p,i)=>!points.slice(0,i).some(q=>len(sub(p,q))<=e));
function slice(t,dist,e){const out=[];for(let i=0;i<3;i++){const j=(i+1)%3;if(Math.abs(dist[i])<=e)out.push(t[i]);if(dist[i]*dist[j]< -e*e)out.push(add(t[i],mul(sub(t[j],t[i]),dist[i]/(dist[i]-dist[j]))));}return unique(out,e);}
function clip2(poly,a,b,orientation,e){const out=[],side=p=>orientation*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]));for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dp=side(p),dq=side(q);if(dp>=-e)out.push(p);if((dp>=-e)!==(dq>=-e)){const t=dp/(dp-dq);out.push(p.map((x,k)=>x+(q[k]-x)*t));}}return out;}
export function triangleContact(a,b,e=1e-6){
 if(!overlap(bounds(a),bounds(b),e))return null;
 let na=cross(sub(a[1],a[0]),sub(a[2],a[0])),nb=cross(sub(b[1],b[0]),sub(b[2],b[0]));const la=len(na),lb=len(nb);if(la<e*e||lb<e*e)return null;na=mul(na,1/la);nb=mul(nb,1/lb);
 const da=a.map(p=>dot(nb,sub(p,b[0]))),db=b.map(p=>dot(na,sub(p,a[0]))),separated=d=>Math.min(...d)>e||Math.max(...d)<-e;if(separated(da)||separated(db))return null;
 const line=cross(na,nb),ll=len(line);
 if(ll<1e-7){if(Math.max(...db.map(Math.abs))>e)return null;const drop=na.map(Math.abs).indexOf(Math.max(...na.map(Math.abs))),axes=[0,1,2].filter(x=>x!==drop),to2=p=>[p[axes[0]],p[axes[1]],...p],bb=b.map(to2);let poly=a.map(to2);const orientation=Math.sign((bb[1][0]-bb[0][0])*(bb[2][1]-bb[0][1])-(bb[1][1]-bb[0][1])*(bb[2][0]-bb[0][0]))||1;for(let i=0;i<3&&poly.length;i++)poly=clip2(poly,bb[i],bb[(i+1)%3],orientation,e);if(!poly.length)return null;const pts=unique(poly.map(p=>p.slice(2)),e);return {type:'coplanar-contact',points:pts,normal:na};}
 const axis=mul(line,1/ll),sa=slice(a,da,e),sb=slice(b,db,e);if(!sa.length||!sb.length)return null;const pa=sa.map(p=>dot(p,axis)),pb=sb.map(p=>dot(p,axis)),lo=Math.max(Math.min(...pa),Math.min(...pb)),hi=Math.min(Math.max(...pa),Math.max(...pb));if(lo>hi+e)return null;const anchor=sa[0],at=t=>add(anchor,mul(axis,t-dot(anchor,axis))),straddles=d=>Math.min(...d)<-e&&Math.max(...d)>e;
 return {type:hi-lo>e&&straddles(da)&&straddles(db)?'surface-crossing':'touch',points:[at(lo),at(hi)],normal:nb};
}
export function rayTriangle(origin,direction,t,e=1e-7){const e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),p=cross(direction,e2),det=dot(e1,p);if(Math.abs(det)<e)return null;const inv=1/det,s=sub(origin,t[0]),u=dot(s,p)*inv;if(u<-e||u>1+e)return null;const q=cross(s,e1),v=dot(direction,q)*inv;if(v<-e||u+v>1+e)return null;const distance=dot(e2,q)*inv;if(distance<=e)return null;return {distance,sign:Math.sign(dot(cross(e1,e2),direction)),edge:Math.min(u,v,1-u-v)<e};}
export function windingOnRay(p,axis,sign,triangles,e=1e-6){const dir=[0,0,0];dir[axis]=sign;const hits=[];for(const t of triangles){const h=rayTriangle(p,dir,t,e*.01);if(h)hits.push(h);}hits.sort((a,b)=>a.distance-b.distance);let sum=0,edge=false;for(let i=0;i<hits.length;){let j=i+1,positive=hits[i].sign>0,negative=hits[i].sign<0;edge ||=hits[i].edge;while(j<hits.length&&Math.abs(hits[j].distance-hits[i].distance)<e){positive ||=hits[j].sign>0;negative ||=hits[j].sign<0;edge ||=hits[j].edge;j++;}sum+=(positive?1:0)-(negative?1:0);i=j;}return {sum,edge,hits:hits.length};}
// Require oriented crossings on all SIX rays. One open wall/roof is not a solid.
// Overlapping consistently oriented closed primitives add instead of XOR-cancel.
export function cardinalContainment(p,getTriangles,e=1e-6){const rays=[];for(let axis=0;axis<3;axis++)for(const sign of[-1,1])rays.push({axis,sign,...windingOnRay(p,axis,sign,getTriangles(axis,p),e)});const sums=rays.map(r=>r.sum),inside=sums.every(x=>x>0)||sums.every(x=>x<0);return {inside,rays};}
export function sweptPrism(a,b){const faces=[a,[b[0],b[2],b[1]]];for(let i=0;i<3;i++){const j=(i+1)%3;faces.push([a[i],b[i],b[j]],[a[i],b[j],a[j]]);}return faces;}
export class SpatialIndex{
 constructor(cell=.5,axes=[0,1,2]){this.cell=cell;this.axes=axes;this.map=new Map();}
 cells(box,fn){const a=this.axes,walk=(n,key)=>{if(n===a.length){fn(key.join(','));return;}const k=a[n];for(let i=Math.floor(box.min[k]/this.cell);i<=Math.floor(box.max[k]/this.cell);i++)walk(n+1,[...key,i]);};walk(0,[]);}
 add(id,box,clip){const b=clip?{min:box.min.map((v,i)=>Math.max(v,clip.min[i])),max:box.max.map((v,i)=>Math.min(v,clip.max[i]))}:box;if(this.axes.some(i=>b.min[i]>b.max[i]))return;this.cells(b,k=>{if(!this.map.has(k))this.map.set(k,[]);this.map.get(k).push(id);});}
 query(box){const out=new Set();this.cells(box,k=>{for(const i of this.map.get(k)||[])out.add(i);});return [...out];}
 at(p){return this.map.get(this.axes.map(i=>Math.floor(p[i]/this.cell)).join(','))||[];}
}
function pointTriangleDistance(p,t){const a=t[0],b=t[1],c=t[2],ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return len(ap);const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return len(bp);const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return len(sub(p,add(a,mul(ab,d1/(d1-d3)))));const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return len(cp);const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return len(sub(p,add(a,mul(ac,d2/(d2-d6)))));const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0)return len(sub(p,add(b,mul(sub(c,b),(d4-d3)/((d4-d3)+(d5-d6))))));const den=1/(va+vb+vc);return len(sub(p,add(a,add(mul(ab,vb*den),mul(ac,vc*den)))));}
function segmentDistance(p1,q1,p2,q2){const u=sub(q1,p1),v=sub(q2,p2),w=sub(p1,p2),a=dot(u,u),b=dot(u,v),c=dot(v,v),d=dot(u,w),e=dot(v,w),D=a*c-b*b;let sN,sD=D,tN,tD=D;if(a<1e-20&&c<1e-20)return len(w);if(a<1e-20){sN=0;sD=1;tN=e;tD=c;}else if(c<1e-20){tN=0;tD=1;sN=-d;sD=a;}else{if(D<1e-20){sN=0;sD=1;tN=e;tD=c;}else{sN=b*e-c*d;tN=a*e-b*d;if(sN<0){sN=0;tN=e;tD=c;}else if(sN>sD){sN=sD;tN=e+b;tD=c;}}}if(tN<0){tN=0;if(-d<0)sN=0;else if(-d>a)sN=sD;else{sN=-d;sD=a;}}else if(tN>tD){tN=tD;if(-d+b<0)sN=0;else if(-d+b>a)sN=sD;else{sN=-d+b;sD=a;}}const sc=Math.abs(sN)<1e-20?0:sN/sD,tc=Math.abs(tN)<1e-20?0:tN/tD;return len(sub(add(w,mul(u,sc)),mul(v,tc)));}
export function triangleDistance(a,b){if(triangleContact(a,b,1e-10))return 0;let d=Math.min(...a.map(p=>pointTriangleDistance(p,b)),...b.map(p=>pointTriangleDistance(p,a)));for(let i=0;i<3;i++)for(let j=0;j<3;j++)d=Math.min(d,segmentDistance(a[i],a[(i+1)%3],b[j],b[(j+1)%3]));return d;}
// Supporting triangles of the convex hull of <=6 points. Coplanar supporting
// triples overlap deliberately; ray intersections deduplicate equal distances.
// The hull conservatively contains every barycentric point of an affine-moving
// triangle. For pure translation it is the exact swept triangular prism.
export function convexHullFaces(points,e=1e-8){const ps=points.filter((p,i)=>!points.slice(0,i).some(q=>len(sub(p,q))<e)),out=[];for(let a=0;a<ps.length;a++)for(let b=a+1;b<ps.length;b++)for(let c=b+1;c<ps.length;c++){let tri=[ps[a],ps[b],ps[c]],n=cross(sub(tri[1],tri[0]),sub(tri[2],tri[0])),nn=len(n);if(nn<e)continue;n=mul(n,1/nn);const ds=ps.map(p=>dot(n,sub(p,tri[0]))),lo=Math.min(...ds),hi=Math.max(...ds);if(lo< -e&&hi>e)continue;if(hi>e)tri=[ps[a],ps[c],ps[b]];out.push(tri);}return out;}
// Exact Euclidean closest-pair witnesses. Existing contact/distance predicates
// above are unchanged; this adds points for auditing a scalar near-bound review.
function closestOnTriangle(p,t){
 const [a,b,c]=t;if(len(cross(sub(b,a),sub(c,a)))===0){let best=null;for(let i=0;i<3;i++){const start=t[i],end=t[(i+1)%3],v=sub(end,start),den=dot(v,v),f=den?Math.max(0,Math.min(1,dot(sub(p,start),v)/den)):0,q=add(start,mul(v,f)),distance=len(sub(p,q));if(!best||distance<best.distance)best={q,distance};}return best.q;}
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);
 if(d1<=0&&d2<=0)return a;
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;
 const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return add(a,mul(ab,d1/(d1-d3)));
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;
 const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return add(a,mul(ac,d2/(d2-d6)));
 const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0)return add(b,mul(sub(c,b),(d4-d3)/((d4-d3)+(d5-d6))));
 const den=1/(va+vb+vc);return add(a,add(mul(ab,vb*den),mul(ac,vc*den)));
}
function closestSegmentPair(p1,q1,p2,q2){
 const u=sub(q1,p1),v=sub(q2,p2),w=sub(p1,p2),a=dot(u,u),b=dot(u,v),c=dot(v,v),d=dot(u,w),e=dot(v,w),D=a*c-b*b;let sN,sD=D,tN,tD=D;
 if(a<1e-20&&c<1e-20)return [p1,p2];
 if(a<1e-20)return [p1,add(p2,mul(v,Math.max(0,Math.min(1,e/c))))];
 if(c<1e-20)return [add(p1,mul(u,Math.max(0,Math.min(1,-d/a)))),p2];
 if(a<1e-20){sN=0;sD=1;tN=e;tD=c;}else if(c<1e-20){tN=0;tD=1;sN=-d;sD=a;}else{
  if(D<1e-20){sN=0;sD=1;tN=e;tD=c;}else{sN=b*e-c*d;tN=a*e-b*d;if(sN<0){sN=0;tN=e;tD=c;}else if(sN>sD){sN=sD;tN=e+b;tD=c;}}
 }
 if(tN<0){tN=0;if(-d<0)sN=0;else if(-d>a)sN=sD;else{sN=-d;sD=a;}}
 else if(tN>tD){tN=tD;if(-d+b<0)sN=0;else if(-d+b>a)sN=sD;else{sN=-d+b;sD=a;}}
 const sc=Math.abs(sN)<1e-20?0:sN/sD,tc=Math.abs(tN)<1e-20?0:tN/tD;return [add(p1,mul(u,sc)),add(p2,mul(v,tc))];
}
export function triangleClosestPair(a,b){
 const contact=triangleContact(a,b,1e-10);
 let best=null;const take=(pointA,pointB,feature)=>{const distance=len(sub(pointA,pointB));if(!Number.isFinite(distance)||![...pointA,...pointB].every(Number.isFinite))throw Error('Nonfinite closest-pair candidate');if(best===null||distance<best.distance)best={distance,pointA,pointB,feature};};
 if(contact)for(const p of contact.points)take(closestOnTriangle(p,a),closestOnTriangle(p,b),'validated-contact-candidate/'+contact.type);
 for(let i=0;i<3;i++){take(a[i],closestOnTriangle(a[i],b),'a-vertex/'+i);take(closestOnTriangle(b[i],a),b[i],'b-vertex/'+i);}
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){const [p,q]=closestSegmentPair(a[i],a[(i+1)%3],b[j],b[(j+1)%3]);take(p,q,'edge-edge/'+i+'/'+j);}
 return {...best,numericalContactTolerance:1e-10};
}
