import * as G from '/assets/geometry.accd26d9fe1820ba.js';
const {THREE}=G;
// Original local-coordinate bedding. Metres, +Z is foot of bed; no textures/assets.
// The broad straight side runs distinguish bedding from a stretched ellipsoid.
function perimeter(w,d,r,n=8){const pts=[];for(const [cx,cz,a] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])for(let i=0;i<=n;i++){const t=a+i/n*Math.PI/2;pts.push([cx+Math.cos(t)*r,cz+Math.sin(t)*r]);}return pts;}
function softRect(g,{name,w,d,r=.09,y0,yEdge,yTop,color,fold=0}){
 const outline=perimeter(w,d,r),N=outline.length,positions=[],indices=[];
 const height=(x,z,ring)=>yTop+(yEdge-yTop)*Math.pow(ring,6)+fold*Math.sin(z*8+.5)*Math.sin(x*5+.7)*Math.pow(Math.max(0,1-ring),.4);
 // Radial rings retain genuinely straight edges while adding cloth fullness.
 const rings=[0,.20,.45,.67,.82,.92,1];
 for(const ring of rings)for(const [x,z]of outline)positions.push(x*ring,height(x*ring,z*ring,ring),z*ring);
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++){const a=j*N+i,b=j*N+(i+1)%N,c=(j+1)*N+i,e=(j+1)*N+(i+1)%N;if(j===0)indices.push(b,c,e);else indices.push(a,c,b,b,c,e);}
 const bottomStart=positions.length/3;for(const[x,z]of outline)positions.push(x,y0,z);const topStart=(rings.length-1)*N;
 for(let i=0;i<N;i++){const k=(i+1)%N;indices.push(topStart+i,bottomStart+i,topStart+k,topStart+k,bottomStart+i,bottomStart+k);}
 const bc=positions.length/3;positions.push(0,y0,0);for(let i=0;i<N;i++)indices.push(bc,bottomStart+(i+1)%N,bottomStart+i);
 for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]]; // Outward winding, +Y top.
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=G.mesh(g,geo,color);mesh.name=name;return {mesh,outline,height};
}
function thread(g,name,points,color,r=.004){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=G.mesh(g,new THREE.TubeGeometry(curve,points.length*2,r,5,false),color);m.name=name;return m;}
export function createGuestFuton({color=0x536d83}={}){
 const group=new THREE.Group();group.name='Rectangular shikibuton with draped kakebuton and pillow';
 const mattress=softRect(group,{name:'Rectangular cotton mattress',w:2.28,d:3.16,r:.10,y0:.084,yEdge:.202,yTop:.258,color:0xd8cdb4,fold:.006});
 thread(group,'Mattress piped edge',[...mattress.outline,mattress.outline[0]].map(([x,z])=>[x,.163,z]),0xc5b899,.007);
 const q=new THREE.Group();q.position.z=.33;group.add(q);
 const quilt=softRect(q,{name:'Soft rectangular indigo quilt',w:2.21,d:2.31,r:.095,y0:.223,yEdge:.267,yTop:.356,color,fold:.018});
 // A pale turned-back head cuff is a real folded cloth volume.
 const cuff=new THREE.Group();cuff.position.z=-.91;q.add(cuff);
 softRect(cuff,{name:'Turned-back quilt cuff',w:2.10,d:.40,r:.065,y0:.296,yEdge:.340,yTop:.395,color:0xa0b1b6,fold:.008});
 thread(q,'Quilt stitched perimeter',[...quilt.outline,quilt.outline[0]].map(([x,z])=>[x*.982,quilt.height(x*.982,z*.982,.982)+.003,z*.982]),0x8ea2ad,.004);
 const pillow=new THREE.Group();pillow.position.z=-1.04;group.add(pillow);
 const p=softRect(pillow,{name:'Soft rectangular pillow',w:1.42,d:.59,r:.13,y0:.245,yEdge:.302,yTop:.427,color:0xf2dfb6,fold:.003});
 thread(pillow,'Pillow case seam',[...p.outline,p.outline[0]].map(([x,z])=>[x*.982,.302,z*.982]),0xdaccaa,.0035);
 group.userData.futonFootprint={width:2.28,depth:3.16,minY:.084,maxY:.43};return group;
}
