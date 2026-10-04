/** Original, bounded linework; no sampled textile or museum assets.
 * Each motif is a single source mesh and is merged into the existing skinned
 * cloth draw. Names retain sleeve/body weighting before the normal merge.
 */
import * as THREE from 'three';
const TAU=Math.PI*2;
export function embroidery(g,name,color){
 const positions=[],indices=[];
 const stroke=(points,width=.006,closed=false)=>{
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2]??0)),closed),steps=Math.min(64,Math.max(8,points.length*4)),start=positions.length/3;
  for(let i=0;i<=steps;i++){const t=i/steps,p=curve.getPoint(t),d=curve.getTangent(t),w=typeof width==='function'?width(t):width,l=Math.hypot(d.x,d.y)||1;for(const s of[-1,1])positions.push(p.x+s*d.y/l*w/2,p.y-s*d.x/l*w/2,p.z);}
  for(let i=0;i<steps;i++){const a=start+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}return api;
 };
 const ellipse=(x,y,rx,ry,width=.005)=>stroke(Array.from({length:20},(_,i)=>{const a=i/20*TAU;return[x+Math.sin(a)*rx,y+Math.cos(a)*ry,0];}),width,true);
 const fill=(points)=>{const start=positions.length/3,c=points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]);positions.push(...c,0);for(const p of points)positions.push(p[0],p[1],p[2]??0);for(let i=0;i<points.length;i++)indices.push(start,start+1+i,start+1+(i+1)%points.length);return api;};
 const api={stroke,ellipse,fill,finish(){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,{color:new THREE.Color(color),skin:false,isMaterial:false});mesh.name=name;g.add(mesh);return mesh;}};return api;
}
export function dragonRoundel(g,name,x,y,r,color){
 const a=embroidery(g,name,color),p=(x1,y1)=>[x+x1*r,y+y1*r],path=(points,w)=>a.stroke(points.map(([x1,y1])=>p(x1,y1)),w*r);
 a.ellipse(x,y,r,r,.060*r);a.ellipse(x,y,r*.87,r*.87,.022*r);
 // Coiled body, open jaw, horned head, mane and four grasping feet read as one
 // bold gold silhouette. The broad strokes survive a normal play camera.
 path([[.04,.43],[-.29,.34],[-.44,.06],[-.27,-.24],[.13,-.36],[.48,-.10],[.43,.14],[.20,.17],[.12,.02],[.30,-.02]],.15);
 a.fill([[.10,.48],[.20,.65],[.42,.60],[.48,.42],[.33,.29],[.13,.31]].map(([x1,y1])=>p(x1,y1)));
 path([[.34,.42],[.60,.36],[.65,.45],[.48,.50]],.052);path([[.25,.61],[.20,.78],[.32,.74]],.045);path([[.38,.59],[.47,.75],[.54,.71]],.041);
 path([[.12,.42],[-.02,.55],[-.10,.50]],.052);path([[.11,.33],[-.07,.37],[-.12,.31]],.043);
 for(const [bx,by,s]of[[-.32,.18,-1],[-.22,-.23,-1],[.40,-.09,1],[.18,-.32,1]]){
  path([[bx,by],[bx+s*.16,by-.14],[bx+s*.28,by-.13]],.055);for(const dy of[-.07,0,.07])path([[bx+s*.22,by-.13],[bx+s*.32,by-.13+dy]],.024);
 }
 for(const [cx,cy]of[[-.56,.48],[.57,-.45],[-.44,-.54]])path([[cx-.14,cy],[cx-.10,cy+.07],[cx,cy+.10],[cx+.07,cy],[cx+.16,cy]],.040);
 a.ellipse(x-.13*r,y-.015*r,.068*r,.068*r,.024*r);return a.finish();
}
export function floralSpray(g,name,x,y,scale,color,flip=1){
 const a=embroidery(g,name,color),p=(u,v)=>[x+u*scale*flip,y+v*scale];
 a.stroke([p(-.22,-.85),p(-.14,-.36),p(.13,.08),p(0,.58)],.047*scale);
 for(const [cx,cy,dir]of[[-.14,-.48,-1],[.02,-.04,1],[-.02,.37,-1]])a.fill([p(cx,cy),p(cx+dir*.34,cy+.06),p(cx+dir*.25,cy+.27),p(cx+.015,cy+.12)]);
 for(const [cx,cy,r]of[[0,.60,.26],[.12,-.11,.20]]){
  for(let k=0;k<5;k++){const b=k*TAU/5,pts=[];for(let i=0;i<10;i++){const q=i/10*TAU,u=cx+Math.sin(b)*r*.62+Math.sin(q)*r*.40,v=cy+Math.cos(b)*r*.62+Math.cos(q)*r*.40;pts.push(p(u,v));}a.stroke(pts,.044*scale,true);}
  a.ellipse(x+cx*scale*flip,y+cy*scale,r*scale*.21,r*scale*.21,.042*scale);
 }return a.finish();
}
