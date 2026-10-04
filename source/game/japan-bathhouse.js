import {buildJapanPerformanceHall,performanceStations} from './japan-performance-hall.js';
import {registerNightFixture} from './night-lighting.js';
import {createGuestFuton} from './japan-futon.js';
import {SHOJI_SIDE_OVERLAP} from './room-closures.js';
import {addJapanInsetClosure} from './japan-shoji.js';
import * as G from './geometry.js?rev=R7-20261002';
import {createConveyorSushi,createRamenCounter,createKotatsu} from './japan-furnishings.js?rev=R7-20261002';
import {createSakuraTree,createPetalFall,createTorii,addSakuraMotif} from './japan-sakura.js?rev=R7-20261002';
import {createOmamoriStall,createInariShrine} from './japan-omamori.js?rev=R7-20261002';
const { THREE } = G;

// KASUMI-YU: an original four-storey lantern bathhouse. Every storey is a
// furnished, roofed interior; the repeating stair gallery is real walkable
// geometry, not a facade or a teleport. No film or third-party game assets.
const P={wood:0x513c32,cedar:0x825337,honey:0xb88350,cream:0xe6d7b2,paper:0xf2dfb6,
  red:0x9f352e,vermilion:0xcd533c,gold:0xd1a25c,jade:0x396c5e,roof:0x355f55,
  tile:0x679584,stone:0x8f9380,water:0x73b5ad,tatami:0xb7b582,indigo:0x536d83};
const LOT_BOUNDS={minX:-30,maxX:30,minZ:-40,maxZ:40};
const LEVEL_Y=[0,3.8,7.6,11.4],H=3.8,STAIR={minX:7.4,maxX:10.8,minZ:-10,maxZ:-2};
// Full shoji travel includes the outer privacy overlap, with .1025 face depth.
// Stop only raised floor trim 12.5mm beyond that envelope; retain the slab/mat.
function slideTrimCutout(x,z,width,axis='x'){
 const along=width+SHOJI_SIDE_OVERLAP+.074+.0125,across=.1025+.0125;
 return {minX:x-(axis==='x'?along:across),maxX:x+(axis==='x'?along:across),minZ:z-(axis==='x'?across:along),maxZ:z+(axis==='x'?across:along)};
}
const SLIDE_FLOOR_TRIM_CUTOUTS={guest:slideTrimCutout(2,-8,2.6),operator:slideTrimCutout(-1,4.9,2.5,'z'),staff:slideTrimCutout(-1,-10.5,2.4,'z')};

function floorTrim(g,x,y,z,w,h,d,color,cutouts=[]){
 if(!cutouts.length){G.box(g,x,y,z,w,h,d,color);return;}
 let pieces=[[x-w/2,x+w/2,z-d/2,z+d/2]];
 for(const cut of cutouts){const next=[];for(const [x0,x1,z0,z1]of pieces){
  const l=Math.max(x0,cut.minX),r=Math.min(x1,cut.maxX),n=Math.max(z0,cut.minZ),s=Math.min(z1,cut.maxZ);
  if(l>=r||n>=s){next.push([x0,x1,z0,z1]);continue;}
  if(x0<l)next.push([x0,l,z0,z1]);if(r<x1)next.push([r,x1,z0,z1]);if(z0<n)next.push([l,r,z0,n]);if(s<z1)next.push([l,r,s,z1]);
 }pieces=next;}
 for(const [x0,x1,z0,z1]of pieces)G.box(g,(x0+x1)/2,y,(z0+z1)/2,x1-x0,h,z1-z0,color);
}

function beam(g,a,b,r,c,segments=6){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),D=B.clone().sub(A);const m=G.mesh(g,new THREE.CylinderGeometry(r,r,D.length(),segments),c);m.position.copy(A.add(B).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),D.normalize());return m;}
function limits(x,y,z,w,h,d){return {minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2};}
function isDynamic(object,root){if(object.isInstancedMesh)return true;for(let p=object;p&&p!==root;p=p.parent)if(p.userData.dynamic||p.userData.noStaticBatch)return true;return false;}
function pack(root){
  root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),buckets=new Map(),meshes=[];
  root.traverse(m=>{if(m.isMesh&&!isDynamic(m,root))meshes.push(m);});
  for(const m of meshes){const mat=m.material,key=[mat.opacity,mat.transparent,mat.side,mat.depthWrite,mat.emissive?.getHex(),mat.emissiveIntensity].join(':');let b=buckets.get(key);
    if(!b){const material=mat.clone();material.color.set(0xffffff);material.vertexColors=true;b={material,parts:[],count:0};buckets.set(key,b);}
    let geo=m.geometry.clone();geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld));if(geo.index){const u=geo.toNonIndexed();geo.dispose();geo=u;}if(!geo.attributes.normal)geo.computeVertexNormals();const n=geo.attributes.position.count,color=new Float32Array(n*3);
    const old=geo.attributes.color;for(let i=0;i<n;i++){color[i*3]=mat.color.r*(old?old.getX(i):1);color[i*3+1]=mat.color.g*(old?old.getY(i):1);color[i*3+2]=mat.color.b*(old?old.getZ(i):1);}geo.setAttribute('color',new THREE.BufferAttribute(color,3));b.parts.push(geo);b.count+=n;
  }
  for(const m of meshes){m.parent.remove(m);m.geometry.dispose();}
  for(const b of buckets.values()){const p=new Float32Array(b.count*3),n=new Float32Array(b.count*3),c=new Float32Array(b.count*3);let at=0;for(const g of b.parts){p.set(g.attributes.position.array,at*3);n.set(g.attributes.normal.array,at*3);c.set(g.attributes.color.array,at*3);at+=g.attributes.position.count;g.dispose();}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.setAttribute('normal',new THREE.BufferAttribute(n,3));geo.setAttribute('color',new THREE.BufferAttribute(c,3));geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,b.material);mesh.castShadow=!b.material.transparent;mesh.receiveShadow=true;root.add(mesh);}
}
function packSpatial(root,cell=12){
 root.updateMatrixWorld(true);const chunks=new Map(),meshes=[];root.traverse(o=>{if(o.isMesh&&!isDynamic(o,root))meshes.push(o);});
 for(const m of meshes){const p=new THREE.Vector3();m.getWorldPosition(p);const key=Math.floor(p.x/cell)+','+Math.floor(p.z/cell);let q=chunks.get(key);if(!q){q=new THREE.Group();q.name='Spatial batch '+key;root.add(q);chunks.set(key,q);}q.attach(m);}
 for(const q of chunks.values())pack(q);
}
function lantern(g,x,y,z,red=true,s=.37){
  const color=red?0xcf593b:0xffd497;
  registerNightFixture(g,x,y,z,{kind:'paper-lantern',color:red?0xffbb72:0xffd69a,intensity:18,distance:8});
  G.cyl(g,x,y+.54,z,.018,.018,.42,P.wood,6);
  G.mesh(g,new THREE.SphereGeometry(s,12,10),color,x,y,z,{emissive:red?0x9d2b10:0xf9b353,emissiveIntensity:red?.22:.34}).scale.set(1,1.28,1);
  for(const yy of [-.34,-.18,0,.18,.34]){const r=s*Math.sqrt(Math.max(.25,1-(yy/(s*1.28))**2));const hoop=G.mesh(g,new THREE.TorusGeometry(r,.013,4,16),P.gold,x,y+yy,z);hoop.rotation.x=Math.PI/2;}
  for(const yy of [-s*1.22,s*1.22])G.cyl(g,x,y+yy,z,s*.55,s*.55,.065,P.wood,10);
  G.cyl(g,x,y-s*1.42,z,.017,.017,s*.3,P.gold,6);
}
function tea(g,x,y,z){G.cyl(g,x,y+.13,z,.22,.25,.26,P.jade);G.cyl(g,x,y+.29,z,.19,.19,.065,P.jade);G.sphere(g,x,y+.35,z,.055,P.gold);beam(g,[x+.19,y+.13,z],[x+.4,y+.24,z],.055,P.jade);G.torus(g,x-.23,y+.17,z,.14,.033,P.jade,0);for(const dx of [-.5,.5]){G.cyl(g,x+dx,y+.065,z+.22,.12,.09,.13,P.cream);G.cyl(g,x+dx,y+.136,z+.22,.085,.085,.012,0x727b42);}}
function vase(g,x,y,z,color=P.jade,flower=true){G.vessel(g,x,y,z,color,.7);if(flower)for(let i=0;i<5;i++){const a=i*2.4,dx=Math.cos(a)*.26,dz=Math.sin(a)*.2;beam(g,[x,y+.4,z],[x+dx,y+1.15+(i%2)*.12,z+dz],.016,0x566747);G.sphere(g,x+dx,y+1.15+(i%2)*.12,z+dz,.11,i%2?0xe4ae98:0xd9c481);}}
function folded(g,x,y,z,c=P.indigo,w=.65,d=.42){for(let i=0;i<3;i++){G.box(g,x,y+i*.075,z,w,.065,d,i===1?0xe3d5b8:c);G.box(g,x+w*.33,y+.035+i*.075,z,.03,.012,d,0xe6d9bc);}}
function tatami(g,x,z,w,d,trimCutouts=[]){g.userData.characterMatSurfaces??=[];g.userData.characterMatSurfaces.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,offset:.075});G.box(g,x,.035,z,w,.07,d,P.tatami);for(let xx=x-w/2;xx<x+w/2-.03;xx+=1.65){floorTrim(g,xx,.075,z,.055,.016,d,P.jade,trimCutouts);for(let zz=z-d/2+.15;zz<z+d/2;zz+=.23)G.box(g,Math.min(xx+.81,x+w/2-.8),.077,zz,1.52,.01,.018,0x9d9f73);}for(const zz of [z-d/2,z+d/2])floorTrim(g,x,.078,zz,w,.014,.07,P.jade,trimCutouts);}
function scroll(g,x,y,z,w=1.2,h=1.65){G.box(g,x,y,z,w,h,.035,0xe6cf9e);for(const yy of [-h/2,h/2]){const m=G.cyl(g,x,y+yy,z,.045,.045,w+.13,P.wood,7);m.rotation.z=Math.PI/2;}G.sphere(g,x,y+.2,z+.031,.28,0xad6860,1,1,.018);for(let i=0;i<4;i++)beam(g,[x-.25+i*.1,y-.55,z+.04],[x-.15+i*.08,y+.05+i*.14,z+.04],.014,0x54745d);}
function window(g,x,y,z,w,h,axis='x'){
  const q=new THREE.Group();q.position.set(x,y,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);
  // A real open lattice aperture: no opaque pane behind it, so balcony views survive.
  for(const yy of [-h/2,h/2])G.box(q,0,yy,0,w+.13,.1,.18,P.cedar);
  for(const xx of [-w/2,w/2])G.box(q,xx,0,0,.11,h,.18,P.cedar);
  for(let xx=-w/2+.3;xx<w/2;xx+=.43)G.box(q,xx,0,0,.035,h,.06,P.honey);
  for(const yy of [-h*.24,h*.24])G.box(q,0,yy,0,w,.04,.07,P.honey);
  for(let xx=-w/2+.35;xx<w/2-.2;xx+=.87){const m=G.box(q,xx,h*.3,.055,.2,.2,.04,P.gold);m.rotation.z=Math.PI/4;}
}
function roof(g,x,y,z,w,d,rise=2.1){
  const hw=w/2,hd=d/2,ridge=w*.21;
  const height=(xx,zz)=>{const u=Math.max(Math.abs(zz)/hd,Math.max(0,(Math.abs(xx)-ridge)/(hw-ridge)));return rise*Math.max(0,1-u)**1.35+(u>.86?((u-.86)/.14)**1.6*.35:0);};
  const p=[],idx=[],nx=24,nz=18;for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const xx=-hw+w*i/nx,zz=-hd+d*j/nz;p.push(x+xx,y+height(xx,zz),z+zz);}for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,e=c+1;idx.push(a,c,b,b,c,e);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();G.mesh(g,geo,P.roof,0,0,0,{side:THREE.DoubleSide});
  for(let xx=-hw+.22;xx<hw;xx+=.53){let prev=null;for(let i=0;i<=10;i++){const zz=-hd+d*i/10,cur=[x+xx,y+height(xx,zz)+.04,z+zz];if(prev)beam(g,prev,cur,.035,P.tile,4);prev=cur;}}
  beam(g,[x-ridge,y+rise+.07,z],[x+ridge,y+rise+.07,z],.12,P.gold);
  for(const sx of [-1,1])for(const sz of [-1,1]){beam(g,[x+sx*(hw-.6),y+.13,z+sz*(hd-.45)],[x+sx*hw,y+.43,z+sz*hd],.08,P.gold);G.sphere(g,x+sx*hw,y+.47,z+sz*hd,.105,P.gold);}
}


// Original R6 motifs: cloud curls, crescent carp and a copper steam-clock crown.
// Reference images informed silhouette/material rhythm only; every vertex is procedural.
function glowWindow(g,x,y,z,w,h,axis='x'){
 const q=new THREE.Group();q.position.set(x,y,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);
 registerNightFixture(q,0,0,.25,{kind:'window',intensity:9,distance:5,dayFactor:.08});
 G.mesh(q,new THREE.BoxGeometry(w,h,.035),0xffd59a,0,0,0,{emissive:0xffaa46,emissiveIntensity:.75});
 window(q,0,0,.05,w,h);
 for(let xx=-w/2+.18;xx<w/2;xx+=.3)G.box(q,xx,0,.065,.025,h,.02,P.red);
}
function cloud(g,x,y,z,s=1,color=P.gold){
 const pts=[];for(let i=0;i<=18;i++){const a=i/18*Math.PI*1.65,r=.09+i/18*.18;pts.push([x+Math.cos(a)*r*s,y+Math.sin(a)*r*s,z]);}
 for(let i=1;i<pts.length;i++)beam(g,pts[i-1],pts[i],.022*s,color,4);
 beam(g,[x-.1*s,y-.23*s,z],[x+.6*s,y-.23*s,z],.025*s,color);
}
function drawers(g,x,y,z,cols=5,rows=4,w=3.5,h=2.1){
 G.box(g,x,y+h/2,z,w+.15,h+.15,.46,P.wood);
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const xx=x+(c-(cols-1)/2)*w/cols,yy=y+(r+.5)*h/rows;
 G.box(g,xx,yy,z+.26,w/cols-.045,h/rows-.04,.12,(c+r)%3?P.cedar:P.honey);
 G.box(g,xx,yy+.09,z+.333,w/cols*.4,.085,.015,P.paper);G.mesh(g,new THREE.TorusGeometry(.048,.013,4,12),P.gold,xx,yy-.06,z+.355);}
}
function steam(g,x,y,z,s=.7){for(let i=0;i<6;i++)G.mesh(g,new THREE.SphereGeometry(s*(.4+i*.11),10,8),0xe5e7d7,x+Math.sin(i*1.8)*s*.35,y+i*s*.42,z+Math.cos(i)*s*.25,{transparent:true,opacity:.14-i*.013,depthWrite:false}).scale.set(1.25,.76,1);}
function dishes(g,x,y,z,count=4){for(let i=0;i<count;i++){G.cyl(g,x,y+i*.05,z,.25,.22,.046,P.cream,14);G.torus(g,x,y+.025+i*.05,z,.24,.012,P.jade);}}
function bookset(g,x,y,z,w=1.5){for(let i=0;i<9;i++){const h=.3+(i%3)*.07;G.box(g,x-w/2+i*w/9,y+h/2,z,w/12,h,.24,[P.indigo,P.red,P.jade,P.honey][i%4]);G.box(g,x-w/2+i*w/9,y+h*.25,z+.125,w/14,.025,.015,P.gold);}}
function eaveRing(g,y){
 // Ring only: no roof face crosses the walkable floors, stair hole or balconies.
 const iw=24.55,id=27.15,ow=29.15,od=32.4,cz=-1.6,p=[],ind=[];
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
 for(let side=0;side<4;side++){
  const A=corners[side],B=corners[(side+1)%4];const start=p.length/3;
  for(let j=0;j<=5;j++)for(let i=0;i<=30;i++){const t=i/30,u=j/5,sx=A[0]*(1-t)+B[0]*t,sz=A[1]*(1-t)+B[1]*t;
   p.push(sx*(iw+(ow-iw)*u)/2,y+.2*(1-u)+.29*u*u*u+Math.pow(Math.abs(2*t-1),9)*.3*u,cz+sz*(id+(od-id)*u)/2);
  }
  for(let j=0;j<5;j++)for(let i=0;i<30;i++){const a=start+j*31+i,b=a+1,c=a+31,d=c+1;ind.push(a,c,b,b,c,d);}
  for(let i=0;i<=30;i++){const t=i/30,sx=A[0]*(1-t)+B[0]*t,sz=A[1]*(1-t)+B[1]*t;beam(g,[sx*iw/2,y+.23,cz+sz*id/2],[sx*ow/2,y+.33+Math.pow(Math.abs(2*t-1),9)*.3,cz+sz*od/2],.04,P.tile);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ind);geo.computeVertexNormals();G.mesh(g,geo,P.roof,0,0,0,{side:THREE.DoubleSide});
}

export function buildJapan(){
 const group=new THREE.Group(),roofGroup=new THREE.Group(),colliders=[],cameraColliders=[],walkableSurfaces=[],ceilingGroups=[],floorGroups=[],explorationTargets=[],doorways=[],roomProgram=[],updates=[],characterFootSurfaces=[];
 group.name='Japan · Kasumi-yu Lantern Bathhouse';roofGroup.name='Visible green roof ensemble';roofGroup.visible=true;group.add(roofGroup);
 const levels=[{id:'jp-ground',name:'一层 · 接待与寿司拉面大厅',y:0},{id:'jp-guest',name:'二层 · 男汤与女汤',y:3.8},{id:'jp-tea',name:'三层 · 方形暖桌会客大厅',y:7.6},{id:'jp-sky',name:'四层 · 汤屋工作与职人生活',y:11.4}];
 function obstacle(x,y,z,w,h,d,{camera=true}={}){const b=limits(x,y,z,w,h,d);colliders.push(b);if(camera)cameraColliders.push({...b});}
 function groundSolid(g,base,x,y,z,w,h,d,c,camera=true){G.box(g,x,y,z,w,h,d,c);obstacle(x,base+y,z,w,h,d,{camera});}
 function surface(minX,maxX,minZ,maxZ,y){walkableSurfaces.push({minX,maxX,minZ,maxZ,y});}
 function slab(g,base,minX,maxX,minZ,maxZ,top,color,addSurface=false){const w=maxX-minX,d=maxZ-minZ,x=(minX+maxX)/2,z=(minZ+maxZ)/2;G.box(g,x,top-.11,z,w,.22,d,color);cameraColliders.push(limits(x,base+top-.11,z,w,.22,d));if(addSurface)surface(minX,maxX,minZ,maxZ,base+top);}
 function rail(g,base,x,z,w,axis='x'){
   const q=new THREE.Group();q.position.set(x,0,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);for(const yy of [.17,.92])G.box(q,0,yy,0,w,.11,.15,P.red);for(let xx=-w/2;xx<=w/2+.01;xx+=w/Math.ceil(w/.68)){G.box(q,xx,.51,0,.07,.87,.075,P.red);G.sphere(q,xx,1.01,0,.08,P.gold);}obstacle(x,base+.5,z,axis==='x'?w:.16,1,axis==='x'?.16:w);
 }
 function stairLandingGuard(g,base,a,b,top=.99,lower=.22){
   const dx=Math.abs(b[0]-a[0]),dz=Math.abs(b[1]-a[1]),length=dx+dz,alongX=dx>0,
     owner=`jp-landing-guard:${base}:${a.join(',')}:${b.join(',')}`;
   const part=(x,y,z,w,h,d,color)=>{G.box(g,x,y,z,w,h,d,color);cameraColliders.push({...limits(x,base+y,z,w,h,d),owner});};
   // The avatar cannot pass between balusters; the camera sees only real timber.
   colliders.push({...limits((a[0]+b[0])/2,base+.55,(a[1]+b[1])/2,alongX?length:.12,1.1,alongX?.12:length),owner});
   for(const [y,thickness]of [[top,.11],[lower,.10]])part((a[0]+b[0])/2,y,(a[1]+b[1])/2,alongX?length:thickness,thickness,alongX?thickness:length,P.red);
   // Reuse the flight/4F end posts, with socket feet bonded into the deck.
   for(const [x,z]of [a,b])part(x,.045,z,.10,.16,.10,P.red);
   const count=Math.ceil(length/.65);
   for(let i=1;i<count;i++){
     const t=i/count,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
     part(x,(top-.01)/2,z,.065,top+.06,.065,P.red);
     G.sphere(g,x,top+.05,z,.06,P.gold);
     cameraColliders.push({...limits(x,base+top+.05,z,.12,.12,.12),owner});
   }
 }
 const insetMounts=new Map();
 function wall(g,base,x,z,w,axis='x',opening=null){
   // Rebuild the complete host partition to the cassette depth, so both wall
   // faces join the pocket skins flush instead of mounting a box on the wall.
   const depth=opening?.inset?.kind==='pocket'?.38:.24;
   if(opening?.inset){
    const spec=opening.inset,lateral=axis==='x'?x:z,center=lateral+(opening.offset||0),section=addJapanInsetClosure(g,axis==='x'?center:x,axis==='x'?z:center,opening.width||2.2,axis,colliders,cameraColliders,spec);
    insetMounts.set(spec.id,section.mount);
    opening={...opening,width:section.roughOpening.to-section.roughOpening.from,height:section.roughOpening.top,offset:center-lateral};
   }
   const part=(xx,zz,ww,hh,yy)=>groundSolid(g,base,xx,yy,zz,axis==='x'?ww:depth,hh,axis==='x'?depth:ww,P.cream);
   if(opening){const gap=opening.width||2.2,center=opening.offset||0,holeH=opening.height||2.8,left=w/2+center-gap/2,right=w/2-center-gap/2;if(left>.01)part(x+(axis==='x'?(-w/2+left/2):0),z+(axis==='z'?(-w/2+left/2):0),left,H-.20,(H-.20)/2);if(right>.01)part(x+(axis==='x'?(w/2-right/2):0),z+(axis==='z'?(w/2-right/2):0),right,H-.20,(H-.20)/2);part(x+(axis==='x'?center:0),z+(axis==='z'?center:0),gap,H-.20-holeH,holeH+(H-.20-holeH)/2);}
   else part(x,z,w,H-.20,(H-.20)/2);
   for(const yy of [.2,3.35]){
    // The skirting ends at the jambs; no decorative ankle-high beam crosses a door.
    const spans=opening&&yy<1?[[-w/2,(opening.offset||0)-(opening.width||2.2)/2],[(opening.offset||0)+(opening.width||2.2)/2,w/2]]:[[-w/2,w/2]];
    for(const [a,b] of spans)if(b>a)G.box(g,x+(axis==='x'?(a+b)/2:0),yy,z+(axis==='z'?(a+b)/2:0),axis==='x'?b-a:depth+.10,.13,axis==='x'?depth+.10:b-a,P.cedar);
   }
 }
 function partition(g,base,x,z,w,axis='x',gap=2.2,offset=0,inset=null){
   const visualOffset=axis==='z'?-offset:offset; // q's +90° rotation reverses its local X axis.
   wall(g,base,x,z,w,axis,{width:gap,height:2.85,offset,inset});const q=new THREE.Group();q.position.set(x,0,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);for(let xx=-w/2+.18;xx<w/2;xx+=.42)if(Math.abs(xx-visualOffset)>gap/2+.23){G.box(q,xx,1.75,inset?.205:.135,.035,2.75,.035,P.honey);for(const yy of [.6,1.28,2.1,2.72])G.box(q,xx,yy,inset?.22:.15,.41,.034,.045,P.cedar);}G.box(q,visualOffset,2.925,0,gap+.14,.15,inset?.45:.31,P.cedar); // underside matches the real 2.85m aperture
 }
 function lowTable(g,base,x,z,w=2.5,d=1.55,color=P.wood){G.table(g,x,z,w,d,color,.63);obstacle(x,base+.38,z,w,.75,d);G.box(g,x,.73,z,w*.56,.028,d*.62,0xae8156);tea(g,x,.76,z);}
 function shelf(g,base,x,z,w=2,d=.6,angle=0,contents=true){const q=new THREE.Group();q.position.set(x,0,z);q.rotation.y=angle;g.add(q);for(const xx of [-w/2,w/2])G.box(q,xx,1.22,0,.1,2.45,d,P.cedar);G.box(q,0,1.18,-d/2,w,2.4,.065,P.wood);for(const yy of [.18,.8,1.42,2.05,2.45])G.box(q,0,yy,0,w,.085,d,P.honey);if(contents)for(let i=0;i<3;i++){vase(q,-w*.3+i*w*.3,.84,0,[P.jade,P.cream,0xa37556][i],false);folded(q,-w*.27+i*w*.28,1.49,0,[P.indigo,P.red,0x9b9a78][i],w*.23,.4);G.cyl(q,-w*.3+i*w*.3,2.22,0,.16,.17,.26,0xc6ae7d,8);}const sideOn=Math.abs(Math.sin(angle))>.7;obstacle(x,base+1.2,z,sideOn?d:w,2.4,sideOn?w:d);return q;}
 function pool(g,base,x,z,w,d){
   const bottom=.0805,waterY=.67,rimY=.72,seatY=.30,backTop=.70,east=x+w/2;
   // A closed retaining basin. The original floor remains the only bottom;
   // its east ledge carries the sitter and the coping supports their back.
   G.box(g,x,.067,z,w,.027,d,0x416d65);
   for(const zz of [z-d/2,z+d/2])groundSolid(g,base,x,rimY/2,zz,w+.34,rimY,.28,0x878c72);
   groundSolid(g,base,x-w/2,rimY/2,z,.28,rimY,d,0x878c72);
   G.box(g,east,rimY/2,z,.28,rimY,d,0x878c72);
   G.box(g,east-.42,(bottom+seatY)/2,z,.56,seatY-bottom,d-.28,0x7e9687);
   G.box(g,east-.18,(seatY+backTop)/2,z,.08,backTop-seatY,d-.28,0x81978a);
   // Ordinary movement stops at the basin. Existing furniture ownership
   // recognizes this exact centered proxy only for an explicit bath transfer.
   obstacle(x,base+rimY/2,z,w,rimY,d);
   g.userData.onsenPools??=[];g.userData.onsenPools.push({center:[x,base,z],bottomY:base+bottom,waterY:base+waterY,rimY:base+rimY,seat:{minX:east-.70,maxX:east-.14,minZ:z-d/2+.14,maxZ:z+d/2-.14,y:base+seatY},backX:east-.22,backTopY:base+backTop,retainingWallX:east-.14,copingTopY:base+.80,seamTopY:base+.817});
   // One top surface, independent of the room's transparent steam batch.
   // Opaque geometry behind it is tinted once, with no stacked water box faces.
   const water=G.mesh(g,new THREE.PlaneGeometry(w-.28,d-.28),0x83c4b8,x,waterY,z,{transparent:true,opacity:.82,depthWrite:false,emissive:0x427e73,emissiveIntensity:.16});water.rotation.x=-Math.PI/2;water.castShadow=false;water.userData.noStaticBatch=true;water.name='Onsen single water surface';
   for(let i=0;i<3;i++){
    const radius=Math.min(w*.16,.82)+i*.13,arc=G.mesh(g,new THREE.RingGeometry(radius-.008,radius+.008,40,1,i*.55,Math.PI*.58),0xc6e5d3,x-w*.12,waterY+.014,z-.40,{transparent:true,opacity:.62,depthWrite:false});arc.rotation.x=-Math.PI/2;arc.scale.x=1.2;arc.castShadow=false;arc.userData.noStaticBatch=true;arc.name='Onsen broken surface highlight';
   }
   for(const zz of [z-d/2+.45,z+d/2-.45])for(let xx=x-w/2+.45;xx<x+w/2-.1;xx+=.7)G.box(g,xx,.083,zz,.42,.012,.024,0xb5d5ba);
   // Suspended soft puffs remain sparse enough to see the room and characters.
   for(let i=0;i<7;i++){const xx=x+Math.sin(i*2.4)*w*.3,zz=z+Math.cos(i*2.4)*d*.25;G.mesh(g,new THREE.SphereGeometry(.35+(i%3)*.1,10,7),0xe8e9cf,xx,waterY+.32+(i%3)*.33,zz,{transparent:true,opacity:.085,depthWrite:false}).scale.set(1.8,.62,1);}
   for(const zz of [z-d*.35,z+d*.35]){G.cyl(g,x-w/2-.65,.22,zz,.24,.27,.44,P.honey,9);G.torus(g,x-w/2-.65,.41,zz,.23,.025,P.wood);}
 }
 // Street and a compact enclosed arrival garden fit the original 30 × 40 lot.
 // Terrain is physically cut around building foundations: no coplanar base
 // remains under ground slabs, eliminating the former full-lot z-fighting.
 const footprints=[[-12.05,12.05,-15.15,11.95],[18.1,28.1,-2.9,11.1],[18.1,28.1,-17.7,-6.3],[-4.5,4.5,-38.3,-29.9],[-2.525,2.525,19.75,34.25],[-27.1,-19.5,-8.45,.85]];
 let terrain=[[-30,30,-40,40]];
 for(const [ax,bx,az,bz]of footprints){const next=[];for(const [x0,x1,z0,z1]of terrain){const l=Math.max(x0,ax),r=Math.min(x1,bx),n=Math.max(z0,az),t=Math.min(z1,bz);if(l>=r||n>=t){next.push([x0,x1,z0,z1]);continue;}if(x0<l)next.push([x0,l,z0,z1]);if(r<x1)next.push([r,x1,z0,z1]);if(z0<n)next.push([l,r,z0,n]);if(t<z1)next.push([l,r,t,z1]);}terrain=next;}
 for(const [x0,x1,z0,z1]of terrain)G.box(group,(x0+x1)/2,-.35,(z0+z1)/2,x1-x0,.7,z1-z0,0x667760);
 G.box(group,9.1,-.11,-6,3.4,.22,8,0x956c47);surface(-29.7,29.7,-39.7,39.7,0);
 G.box(group,0,-.01,15,7,.025,9.5,0xb1a48a);for(let z=11.4;z<19.4;z+=.83)for(const x of [-1.65,0,1.65])G.box(group,x,.021,z,1.5,.038,.71,0xc4b499);
 for(const x of [-29.65,29.65])groundSolid(group,0,x,.65,0,.25,1.3,79.4,P.stone);
 groundSolid(group,0,0,.65,-39.65,59.5,1.3,.25,P.stone);
 for(const x of [-17,17])groundSolid(group,0,x,.65,39.65,25.3,1.3,.25,P.stone);
 for(const x of [-8.6,8.6]){G.box(group,x,.1,16.2,7.3,.2,4.7,0x718565);for(let i=0;i<6;i++){const xx=x+Math.sin(i*2.4)*2.1,zz=16.2+Math.cos(i*2.4)*1.25;G.sphere(group,xx,.48+(i%2)*.15,zz,.72,i%2?0x87a06c:0x547755,1.2,.65,1);obstacle(xx,.43,zz,1,.85,1,{camera:false});}G.tree(group,x,17,0xb5a986,.68);}
 for(const x of [-3.5,3.5]){groundSolid(group,0,x,1.65,14,.18,3.3,.18,P.wood);lantern(group,x,2.65,14,true,.46);}
 // Exterior steps are deliberately flush: the first-floor finished floor is Y=0.
 for(let f=0;f<4;f++){
   const base=LEVEL_Y[f],fg=new THREE.Group(),cg=new THREE.Group();fg.position.y=base;cg.position.y=base;fg.name=`Floor ${f+1}: ${levels[f].name}`;cg.name=`Floor ${f+1} opaque coffered ceiling`;group.add(fg,cg);floorGroups.push(fg);ceilingGroups.push(cg);
   // The split slabs are both floor and ceiling; no invisible solid crosses the stairs.
   const patches=[[-11.85,7.4,-14.85,9],[10.8,11.85,-14.85,9],[7.4,10.8,-14.85,-10],[7.4,10.8,-2,9],[-11.85,11.85,9,11.65]];
   for(const a of patches)slab(fg,base,...a,0,f===0?0xa7855a:0x956c47,true);
   // Board seams and brass floor wayfinding run through all genuinely explorable rooms.
   // These are 20mm-deep decorative strips above the continuous wood slab,
   // so the two working-floor shoji tracks interrupt strips, not floor height.
   const seamCutouts=f===3?[SLIDE_FLOOR_TRIM_CUTOUTS.operator,SLIDE_FLOOR_TRIM_CUTOUTS.staff]:[];
   for(let z=-14.55;z<11.55;z+=.75){floorTrim(fg,-2.2,.011,z,18.7,.018,.02,0x694d34,seamCutouts);if(z< -10||z> -2)G.box(fg,9.1,.011,z,3.35,.018,.02,0x694d34);}
   for(const x of [-1.5,1.5])G.box(fg,x,.014,-2.5,.045,.02,22.7,P.gold);
   for(let z=-12;z<8;z+=3.7){G.box(fg,0,.021,z,.29,.024,.29,P.gold).rotation.y=Math.PI/4;}
   const ceilingPatches=f<3?patches.slice(0,4):[[-11.85,11.85,-14.85,9]];
   if(f===3)for(const a of ceilingPatches)slab(cg,base,...a,H-.03,0x6b4d34,false);
   // Balcony canopy makes all four floors feel enclosed when viewed at head height.
   if(f===3)slab(cg,base,-12.1,12.1,9,11.9,H-.16,P.cedar,false);
   for(const x of [-10.8,-7.7,-4.5,-1.5,1.5,4.6,6.7,11.35])G.box(cg,x,3.48,-2.9,.14,.22,23.5,P.wood);
   for(let z=-13.8;z<9;z+=3.55){G.box(cg,-2.25,3.48,z,19.0,.22,.17,P.wood);if(z< -10||z> -2)G.box(cg,9.12,3.48,z,3.25,.22,.17,P.wood);}
   // Rear and west/east facades have full-height walls with real lattice windows.
   wall(fg,base,0,-15,24,'x');
   for(const x of [-12,12]){
     for(const [z,d] of [[-12,6],[-5.25,7.5],[3.75,10.5]]){
       groundSolid(fg,base,x,.44,z,.24,.96,d,P.cream);
       groundSolid(fg,base,x,3.19,z,.24,.82,d,P.cream);
       // Window centers are open, with collision-safe thin lattice bars at the exterior.
       window(fg,x,1.92,z,Math.max(2.7,d-.5),1.94,'z');
       obstacle(x,base+1.85,z,.15,1.8,d,{camera:true});
     }
     for(const z of [-15,-9,-1.5,9])groundSolid(fg,base,x,1.775,z,.36,3.61,.36,P.red);
   }
   // Broad central doorway links the main hall to a continuous front balcony.
   wall(fg,base,0,9,24,'x',{width:f===3?2.3:4.2,height:2.9,offset:f===3?.5:0});
   for(const x of [-9.65,-6.5,-3.45,3.45,6.5,9.65]){glowWindow(fg,x,1.86,9.16,2.7,1.67);G.box(fg,x,2.87,9.25,2.8,.18,.32,P.cedar);}
   rail(fg,base,-7.0,11.65,9.7);rail(fg,base,7.0,11.65,9.7);
   // The ground entrance has a real gap; upper balconies get a safe central rail.
   if(f>0)rail(fg,base,0,11.65,4.25);
   rail(fg,base,-11.85,10.3,2.7,'z');rail(fg,base,11.85,10.3,2.7,'z');
   for(const x of [-11.75,-7.5,-3,3,7.5,11.75]){groundSolid(fg,base,x,1.75,11.35,.18,3.5,.18,P.red);lantern(fg,x,2.72,10.9,true,.32);}
   // R7: structure is shared, but each level has its own room plan below.
   // No cloned central corridor or repeated guest-room partitions.
   for(const z of [-12,6.8]){lantern(fg,6.45,2.94,z,false,.28);lantern(fg,-10.9,2.94,z,true,.31);}
   if(f<3){
     const rampY=H/8;
     walkableSurfaces.push({...STAIR,y:base+H,axis:'z',endY:base});
     for(let i=0;i<24;i++){const z=-10+(i+.5)*8/24,y=H*(1-(i+.5)/24),depth=8/24;G.box(fg,9.1,y-.075,z,3.4,.15,depth,P.honey);G.box(fg,9.1,y+.008,z+depth/2-.039,3.36,.025,.04,P.gold);cameraColliders.push(limits(9.1,base+y-.075,z,3.4,.15,depth));characterFootSurfaces.push({minX:7.4,maxX:10.8,minZ:z-depth/2,maxZ:z+depth/2,y:base+y},{minX:7.42,maxX:10.78,minZ:z+depth/2-.059,maxZ:z+depth/2-.019,y:base+y+.0205});}
     for(const x of [7.4,10.8]){beam(fg,[x,H+.99,-10],[x,.99,-2],.055,P.red);beam(fg,[x,H+.22,-10],[x,.22,-2],.05,P.red);for(let i=0;i<=16;i++){const z=-10+i*.5,y=H-rampY*(z+10);G.box(fg,x,y+.5,z,.065,.96,.065,P.red);G.sphere(fg,x,y+1.04,z,.075,P.gold);if(i<16){const zc=z+.25,yc=H-rampY*(zc+10);obstacle(x,base+yc+.49,zc,.12,.99,.5);}}}
   }
   // Level guards join the incoming and outgoing flight posts without closing
   // either travel mouth. Keep the west public gallery's full 1.42 m clearance.
   if(f===1||f===2)for(const x of [7.4,10.8])stairLandingGuard(fg,base,[x,-10],[x,-2]);
   if(f===3){rail(fg,base,7.4,-6,8,'z');rail(fg,base,10.8,-6,8,'z');}
   // The top floor has no outgoing flight at the south end: close that blind
   // edge only at 4F height; the north arrival and the 3F flight below stay open.
   if(f===3)stairLandingGuard(fg,base,[7.4,-2],[10.8,-2],.92,.17);

   // Deep red/gold lower panelling, hand-painted cloud friezes and coffer rosettes.
   for(const x of [-11.78,11.78])for(const z of [-12,-5.3,3.5]){G.box(fg,x,.43,z,.055,.67,5.6,f%2?0x415e56:0x7f3432);for(let zz=z-2.6;zz<z+2.7;zz+=.65)G.box(fg,x,.42,zz,.07,.5,.018,P.gold);}
   for(const x of [-9.8,-6.8,-3.9,3.7,6.3])for(const z of [-12.7,-9.2,-5.7,-2.2,1.4,5.0,7.8]){
    G.cyl(cg,x,3.41,z,.34,.34,.04,f===2?0xb9914a:0x957153,12);for(let k=0;k<5;k++){const a=k*Math.PI*2/5;G.mesh(cg,new THREE.SphereGeometry(.085,6,4),f===2?0xa85443:0x436960,x+Math.cos(a)*.19,3.375,z+Math.sin(a)*.19).scale.set(1,.18,1);}}
   // Perimeter lamps and tiny alcove cabinets stay outside the 3m main passage.
   for(const [x,z] of [[-11.2,-1.8],[11.25,5.6]]){G.box(fg,x,.36,z,.48,.72,.52,P.red);G.mesh(fg,new THREE.BoxGeometry(.43,.42,.44),P.paper,x,.94,z,{emissive:0xffbc65,emissiveIntensity:.5});registerNightFixture(fg,x,.94,z,{kind:'floor-lantern',intensity:10,distance:5.5});G.box(fg,x,1.19,z,.6,.09,.62,P.jade);obstacle(x,base+.62,z,.62,1.3,.64);}
   // Each room has warm light. These are local lights, not a hidden global exposure boost.
   for(const [x,z] of [[-7,-5],[4,4]]){const light=new THREE.PointLight(0xffc684,.85,14,1.2);light.position.set(x,2.8,z);fg.add(light);}
   // Layered, original exterior bracket rhythm, brass corners and green eave skirts.
   for(const x of [-12.25,12.25])for(let z=-13.5;z<9;z+=2.6){G.box(fg,x,3.16,z,.65,.18,.3,P.red);G.box(fg,x,3.31,z,.85,.14,.5,P.gold);}
   for(const x of [-8.8,-4.4,4.4,8.8]){G.box(fg,x,3.15,11.7,.35,.18,.75,P.red);G.box(fg,x,3.31,11.8,.65,.13,.9,P.gold);}
   if(f>0)eaveRing(roofGroup,base-.59);
 }

 // Original R7 room-specific furnishing and architectural helpers.
 function target(id,name,x,y,z){explorationTargets.push({id:'jp-room-'+id,name,position:[x,y,z]});return 'jp-room-'+id;}
 function program(id,floor,fn,area,targets,extra={}){roomProgram.push({id,floor,function:fn,areaM2:area,targets,...extra});}
 function threshold(id,a,b,width=2.4,height=2.85,extra={}){doorways.push({id,a,b,width,height,...(insetMounts.has(id)?{closureMount:insetMounts.get(id)}:{}),...extra});}
 function furnishing(factory,f,x,z,options={}){
   const item=factory(options),base=LEVEL_Y[f];item.group.position.set(x,0,z);floorGroups[f].add(item.group);
   const transform=c=>({...c,minX:c.minX+x,maxX:c.maxX+x,minY:c.minY+base,maxY:c.maxY+base,minZ:c.minZ+z,maxZ:c.maxZ+z});
   colliders.push(...item.localColliders.map(transform));cameraColliders.push(...(item.cameraBoxes??item.localColliders).map(transform));
   if(item.update)updates.push(item.update);return item;
 }
 function slatScreen(g,base,x,z,w,axis='x',height=2.15,color=P.cedar){
  groundSolid(g,base,x,height/2,z,axis==='x'?w:.16,height,axis==='x'?.16:w,color);
  for(let t=-w/2+.08;t<w/2;t+=.24)G.box(g,x+(axis==='x'?t:0),height/2,z+(axis==='z'?t:0),axis==='x'?.06:.21,height-.13,axis==='x'?.21:.06,P.honey);
  G.box(g,x,height+.06,z,axis==='x'?w+.12:.26,.13,axis==='x'?.26:w+.12,P.wood);
 }
 function tileFloor(g,x,z,w,d,color=0x8dafa1){
  G.box(g,x,.027,z,w,.05,d,color);
  for(let xx=x-w/2+.45;xx<x+w/2;xx+=.9)G.box(g,xx,.054,z,.026,.009,d,0x597c70);
  for(let zz=z-d/2+.45;zz<z+d/2;zz+=.9)G.box(g,x,.055,zz,w,.01,.026,0x597c70);
 }
 function bench(g,base,x,z,w=2.5,d=.6){
  for(const dx of [-w*.38,w*.38]){G.box(g,x+dx,.25,z,.14,.5,d*.8,P.wood);beam(g,[x+dx,.12,z-d*.32],[x+dx,.4,z+d*.32],.045,P.gold);}
  for(let i=0;i<4;i++)G.box(g,x,.51,z+(i-1.5)*d/4,w,.11,d/4-.025,P.honey);
  obstacle(x,base+.3,z,w,.6,d);return {x,z};
 }
 const LETTERS={A:[[[0,0],[.5,1],[1,0]],[[.22,.43],[.78,.43]]],B:[[[0,0],[0,1],[.65,1],[1,.78],[.6,.5],[0,.5]],[[.6,.5],[1,.24],[.65,0],[0,0]]],C:[[[1,.86],[.7,1],[.16,.85],[0,.5],[.16,.15],[.7,0],[1,.14]]],D:[[[0,0],[0,1],[.55,1],[1,.75],[1,.25],[.55,0],[0,0]]],E:[[[1,1],[0,1],[0,0],[1,0]],[[0,.5],[.8,.5]]],F:[[[0,0],[0,1],[1,1]],[[0,.5],[.8,.5]]],G:[[[1,.8],[.75,1],[.2,.9],[0,.55],[.15,.15],[.65,0],[1,.25],[1,.5],[.55,.5]]],H:[[[0,0],[0,1]],[[1,0],[1,1]],[[0,.5],[1,.5]]],I:[[[0,1],[1,1]],[[.5,1],[.5,0]],[[0,0],[1,0]]],K:[[[0,0],[0,1]],[[1,1],[0,.42],[1,0]]],L:[[[0,1],[0,0],[1,0]]],M:[[[0,0],[0,1],[.5,.45],[1,1],[1,0]]],N:[[[0,0],[0,1],[1,0],[1,1]]],O:[[[.2,0],[0,.25],[0,.75],[.2,1],[.8,1],[1,.75],[1,.25],[.8,0],[.2,0]]],P:[[[0,0],[0,1],[.7,1],[1,.75],[.7,.5],[0,.5]]],R:[[[0,0],[0,1],[.7,1],[1,.75],[.7,.5],[0,.5]],[[.55,.5],[1,0]]],S:[[[1,.88],[.7,1],[.2,.9],[0,.65],[1,.35],[.8,.06],[.2,0],[0,.15]]],T:[[[0,1],[1,1]],[[.5,1],[.5,0]]],U:[[[0,1],[0,.2],[.2,0],[.8,0],[1,.2],[1,1]]],V:[[[0,1],[.5,0],[1,1]]],W:[[[0,1],[.2,0],[.5,.55],[.8,0],[1,1]]],Y:[[[0,1],[.5,.5],[1,1]],[[.5,.5],[.5,0]]]};
 function sign(g,x,y,z,text,color=P.jade,w=3.6){
  registerNightFixture(g,x,y+.16,z+.45,{kind:'sign',intensity:10,distance:5,dayFactor:.08});
  G.mesh(g,new THREE.BoxGeometry(Math.min(1.2,w*.4),.055,.09),P.paper,x,y+.41,z+.17,{emissive:0xffc375,emissiveIntensity:.55});
  G.box(g,x,y,z,w,.68,.11,color);for(const dy of [-.36,.36])G.box(g,x,y+dy,z+.04,w+.12,.065,.12,P.gold);
  const step=Math.min(.38,(w-.35)/text.length),gh=.35,gw=step*.7;
  [...text].forEach((c,i)=>{for(const stroke of LETTERS[c]??[])for(let j=1;j<stroke.length;j++)beam(g,[x+(i-(text.length-1)/2)*step+(stroke[j-1][0]-.5)*gw,y+(stroke[j-1][1]-.5)*gh,z+.075],[x+(i-(text.length-1)/2)*step+(stroke[j][0]-.5)*gw,y+(stroke[j][1]-.5)*gh,z+.075],.018,P.paper,5);});
 }
 function noren(g,x,z,width,color,gender){
  for(let i=0;i<4;i++)G.box(g,x-width/2+(i+.5)*width/4,2.46,z,width/4-.035,.62,.033,color);
  sign(g,x,3.13,z+.04,gender==='men'?'MEN':'WOMEN',color,width+.35);
  // Original geometric kanji identifiers 男 / 女 on central hanging panels.
  const glyph=gender==='men'?[[[-.23,.23],[.23,.23],[.23,-.1],[-.23,-.1],[-.23,.23]],[[0,.23],[0,-.1]],[[-.23,.065],[.23,.065]],[[-.28,-.2],[.27,-.2],[.2,-.43],[.08,-.43]],[[-.01,-.14],[-.1,-.32],[-.31,-.43]]]:[[[.03,.29],[-.22,-.14],[.26,-.4]],[[-.31,.03],[.31,.03]],[[.2,.25],[.12,-.15],[-.29,-.43]]];
  for(const a of glyph)for(let j=1;j<a.length;j++)beam(g,[x+a[j-1][0]*.65,2.5+a[j-1][1]*.65,z+.03],[x+a[j][0]*.65,2.5+a[j][1]*.65,z+.03],.018,P.paper,5);
 }
 // Original stroke construction of 湯, with no image/font dependency.
 function yuGlyph(g,x,y,z,scale=1,color=P.paper){
  const strokes=[[[-.43,.35],[-.31,.26]],[[-.46,.09],[-.34,.01]],[[-.46,-.35],[-.26,-.11]],[[.00,.39],[.34,.39],[.34,.08],[0,.08],[0,.39]],[[0,.24],[.34,.24]],[[-.10,-.05],[.43,-.05]],[[-.01,-.05],[-.13,-.24]],[[.04,-.18],[.43,-.18],[.34,-.43],[.23,-.43]],[[.15,-.18],[.02,-.39]],[[.29,-.18],[.16,-.39]]];
  for(const stroke of strokes)for(let i=1;i<stroke.length;i++)beam(g,[x+stroke[i-1][0]*scale,y+stroke[i-1][1]*scale,z],[x+stroke[i][0]*scale,y+stroke[i][1]*scale,z],.021*scale,color,5);
 }
 function entryNoren(g,x,z,width=4.1){
  // 2.20m clear beneath the fabric, above the 1.95m controller body.
  for(let i=0;i<3;i++)G.box(g,x+(i-1)*width/3,2.55,z,width/3-.045,.70,.04,P.indigo);
  G.box(g,x,2.96,z,width+.18,.07,.09,P.cedar);yuGlyph(g,x,2.56,z+.035,.62);
 }
 function washBay(g,base,x,z,side=-1){
  const q=new THREE.Group();q.position.set(x,0,z);q.rotation.y=side<0?Math.PI/2:-Math.PI/2;g.add(q);
  G.box(q,0,.49,-.23,1.48,.18,.56,0x809d8e);G.box(q,0,1.51,-.48,1.04,.97,.05,0x9cbbbb);
  for(const xx of [-.55,.55])G.box(q,xx,1.51,-.43,.055,1.07,.045,P.gold);
  beam(q,[0,.62,-.3],[0,.85,-.3],.035,P.gold);beam(q,[0,.85,-.3],[0,.85,.0],.035,P.gold);
  G.torus(q,-.24,.75,-.2,.075,.018,P.gold,0);
  for(const dx of [-.21,.21])for(const dz of [.2,.56])G.box(q,dx,.19,dz,.065,.38,.07,P.wood);
  G.box(q,0,.4,.38,.65,.12,.55,P.honey);G.cyl(q,.49,.19,.85,.23,.26,.38,P.honey,12);for(const yy of [.075,.32])G.torus(q,.49,yy,.85,.235,.024,P.wood);
  obstacle(x,base+.55,z,1.5,1.1,1.55); // Wet fixture envelope, with the aisle in front kept clear.
 }
 function futon(g,base,x,z,color=P.indigo){
  const bedding=createGuestFuton({color});bedding.position.set(x,0,z);g.add(bedding);
  obstacle(x,base+.25,z,2.36,.5,3.24); // Unchanged safe interaction/camera envelope.
 }
 // 1F: a generous arrival and food hall, with two visibly different services.
 {
  const f=floorGroups[0],y=0;
  // Close the kitchen against its east wall; the stair gallery stays public.
  partition(f,y,-3,-10.55,18,'x',3.1,.55);wall(f,y,6,-12.775,4.45,'z');
  threshold('jp-food-prep-door',[-2.45,0,-9.65],[-2.45,0,-11.45],3.1);
  // Reception follows a broad curved counter; the entrance remains a six-metre hall.
  groundSolid(f,y,-7.05,.51,6.95,6.2,1.02,1.1,P.cedar);G.box(f,-7.05,1.07,6.95,6.4,.16,1.24,P.honey);
  for(const x of [-9.2,-7.8,-6.4,-5]){G.box(f,x,.51,7.54,1.25,.74,.05,P.red);cloud(f,x-.2,.66,7.58,.7);folded(f,x,1.18,6.95,P.indigo,.58,.39);}
  {const q=new THREE.Group();q.position.set(-7.1,0,8.7);q.rotation.y=Math.PI;f.add(q);drawers(q,0,1.45,0,7,3,6.2,1.4);}
  vase(f,-10,1.18,6.9);sign(f,-7,2.65,8.62,'WELCOME',P.red,5.9);
  bench(f,y,-9.2,3.1,3.5);shelf(f,y,-11.16,.55,3.4,.65,Math.PI/2);
  furnishing(createConveyorSushi,0,-6,-3.3,{width:7.8,depth:3.0});
  furnishing(createRamenCounter,0,4.1,3.6,{width:5.3});
  sign(f,-6,2.98,-7.8,'SUSHI',P.red,4.8);sign(f,4.1,2.98,1.8,'RAMEN',P.jade,4.3);
  // A fan-shaped ceiling frieze and broad empty floor make this one grand hall.
  for(const x of [-10.5,-1.4,6.8]){groundSolid(f,y,x,1.69,-8.9,.28,3.38,.28,P.red);G.box(f,x,3.16,-8.9,.65,.28,.6,P.gold);}
  G.box(f,-1.75,3.27,-8.9,18,.3,.38,P.red);for(let x=-10;x<7;x+=1.2)cloud(f,x,3.29,-8.67,.72);
  // ONE shared back kitchen serves both the belt and ramen counter.
  groundSolid(f,y,-7,.51,-13.65,7.7,1.02,1.4,P.cedar);G.box(f,-7,1.08,-13.65,7.86,.12,1.52,0x9eab9e);
  for(const x of [-9.8,-8.2,-6.6]){dishes(f,x,1.18,-13.65,4);G.cyl(f,x+.54,1.32,-13.65,.2,.21,.3,P.jade);}
  groundSolid(f,y,3.3,.52,-13.4,5.1,1.04,1.45,P.cedar);G.box(f,3.3,1.11,-13.4,5.25,.13,1.58,0x81958c);
  for(const x of [2.1,4.1]){G.cyl(f,x,1.28,-13.4,.43,.46,.3,0x566963);G.torus(f,x,1.47,-13.4,.42,.04,P.gold);}
  for(let x=-10.5;x<6.3;x+=1.2){G.box(f,x,2.43,-14.5,1.1,.11,.66,P.honey);vase(f,x,2.49,-14.5,P.cream,false);}
  sign(f,2.4,2.9,-10.38,'KITCHEN',P.wood,4.2);
  target('welcome','Grand reception hall',-4,0,5.4);target('sushi','Conveyor sushi public aisle',-6,0,-.25);target('ramen','Ramen counter seating',4.1,0,5.7);target('food-prep','Shared sushi and ramen preparation',-1.4,0,-12.05);target('foodhall','Open lantern food hall',.1,0,-5.4);
  program('arrival',1,'reception',92,['jp-room-welcome']);program('conveyor-sushi',1,'conveyor-sushi',125,['jp-room-sushi']);program('ramen-counter',1,'ramen-counter',91,['jp-room-ramen']);program('food-prep',1,'shared-food-preparation',77,['jp-room-food-prep']);program('grand-foodhall',1,'public-foodhall-circulation',133,['jp-room-foodhall']);
 }
 // 2F: two proper gender-separated bath sequences, never three scattered baths.
 // Source image features: bent noren thresholds, dry timber changing rooms,
 // wet tile, gridded transoms, large green-water pools and broad coping/decks.
 {
  const f=floorGroups[1],y=3.8;
  wall(f,y,-1,-4.9,20.2,'z');wall(f,y,5.8,-7.35,15.3,'z');wall(f,y,7,2.75,4.9,'z');
  // Join the wet-room return to the dry-room east wall without a sightline slit.
  wall(f,y,6.4,.3,1.2,'x');
  partition(f,y,-6.5,5.2,11,'x',2.8);partition(f,y,3,5.2,8,'x',2.6);
  partition(f,y,-6.5,.3,11,'x',2.6);partition(f,y,3,.3,8,'x',2.35);
  // These offset solid screens stop sightlines from shared foyer into changing.
  slatScreen(f,y,-6.5,3.55,4.6,'x',2.4,P.indigo);slatScreen(f,y,3,3.55,3.45,'x',2.4,P.red);
  noren(f,-6.5,5.34,2.8,P.indigo,'men');noren(f,3,5.34,2.6,P.red,'women');
  threshold('jp-men-noren',[-6.5,y,6.2],[-6.5,y,4.45],2.8,2.85,{at:5.2});threshold('jp-women-noren',[3,y,6.2],[3,y,4.45],2.6,2.85,{at:5.2});
  threshold('jp-men-wet-threshold',[-6.5,y,1.2],[-6.5,y,-.6],2.6);threshold('jp-women-wet-threshold',[3,y,1.2],[3,y,-.6],2.35);
  // Dry changing spaces: individual key drawers, round baskets, timber benches.
  {const q=new THREE.Group();q.position.set(-11.32,0,2.4);q.rotation.y=Math.PI/2;f.add(q);drawers(q,0,.16,0,5,4,3.9,2.45);obstacle(-11.2,y+1.35,2.4,.95,2.7,4.1);}
  {const q=new THREE.Group();q.position.set(6.43,0,2.4);q.rotation.y=-Math.PI/2;f.add(q);drawers(q,0,.16,0,5,4,3.9,2.45);obstacle(6.3,y+1.35,2.4,.95,2.7,4.1);}
  bench(f,y,-3.1,2.05,2.35);bench(f,y,.15,2.05,1.6);
  for(const [x,z]of [[-3.55,2.1],[-2.7,2.1],[.1,2.1]]){G.cyl(f,x,.71,z,.3,.27,.32,P.honey,12);G.torus(f,x,.88,z,.3,.025,P.wood);folded(f,x,.88,z,P.paper,.35,.26);}
  tileFloor(f,-6.5,-7.3,10.7,14.8,0x94b3a4);tileFloor(f,2.4,-7.3,6.55,14.8,0xb8b396);
  pool(f,y,-6.55,-9.3,7.5,6.6);pool(f,y,2.1,-9.7,4.0,6.6);
  // Raised coping has a tailored timber edge and tile seam, not a box-ring bath.
  for(const [cx,w,cz]of [[-6.55,7.5,-9.3],[2.1,4.0,-9.7]]){
   for(const zz of [cz-3.3,cz+3.3]){G.box(f,cx,.75,zz,w+.38,.1,.4,P.honey);for(let xx=cx-w/2;xx<cx+w/2;xx+=.44)G.box(f,xx,.81,zz,.025,.014,.39,P.wood);}
   G.box(f,cx+w/2,.75,cz,.34,.10,6.6,P.honey);
   const fx=cx-w/2+.8;beam(f,[fx,1.38,-14.54],[fx,1.38,-12.3],.10,0x6e8960);beam(f,[fx,1.38,-12.3],[fx,.52,-12.3],.052,0xd1ded0);
  }
  for(const z of [-2.25,-4.15])washBay(f,y,-10.65,z,-1);
  for(const z of [-2.25,-4.15])washBay(f,y,4.6,z,1);
  bench(f,y,-4.2,-3.1,3.0);bench(f,y,1.35,-3.1,2.3);
  // Opaque bath divider runs floor-to-ceiling. Exterior panes gain privacy slats.
  for(const x of [-11.82,11.82])for(let z=-13.8;z<0;z+=.3)G.box(f,x,1.63,z,.06,2.1,.14,P.cedar);
  for(const [cx,w,col]of [[-6.5,10.3,0x345a59],[3,7.5,0x846057]]){
   G.box(f,cx,2.13,-14.79,w,1.72,.055,col);
   for(let i=0;i<9;i++){const xx=cx-w*.43+i*w*.105;G.sphere(f,xx,1.72+(i%3)*.15,-14.74,.66,[0x708f7b,0x456f68,0xadb797][i%3],1,.6,.036);cloud(f,xx,2.55,-14.68,.68);}
   const lampStart=f.children.length;lantern(f,cx,3,-9.3,false,.32);
   // The onsen orbit can reach these pendants. Use each real bulb/hoop/cap/
   // suspension component, not a guessed solid box spanning the whole lamp.
   f.updateWorldMatrix(true,false);
   for(const part of f.children.slice(lampStart)){part.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(part);cameraColliders.push({minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z,fixture:'onsen-pendant',cameraOnly:true});}
  }
  bench(f,y,-7.7,7.55,4.0);bench(f,y,4.9,7.55,3.1);
  target('bath-foyer','Shared bath foyer',0,y,6.8);target('men-changing','Men changing and basket lockers',-8.8,y,1.6);target('women-changing','Women changing and basket lockers',4.6,y,1.45);
  target('men-wash','Men pre-bath washing',-8.65,y,-3.4);target('women-wash','Women pre-bath washing',3.0,y,-4.4);target('men-bath','Men onsen broad pool entry',-2.25,y,-9.3);target('women-bath','Women onsen broad pool entry',5.0,y,-9.7);
  target('men-pool-interior','Men pool seated-soak approach',-2.1,y,-9.3);Object.assign(explorationTargets.at(-1),{purpose:'Change into swimwear and mount the supported pool seat',furnitureId:'japan-furniture-bath-1',mountedDestination:[-3.22,y,-9.3],previousWalkInPosition:[-6.55,y,-9.3]});
  target('women-pool-interior','Women pool seated-soak approach',4.9,y,-9.7);Object.assign(explorationTargets.at(-1),{purpose:'Change into swimwear and mount the supported pool seat',furnitureId:'japan-furniture-bath-2',mountedDestination:[3.68,y,-9.7],previousWalkInPosition:[2.1,y,-9.7]});
  threshold('jp-men-pool-entry',[-2.1,y,-9.3],[-2.1,y,-8.5],1.0,3.3,{interactionOnly:true,role:'furniture-approach',mountedDestination:[-3.22,y,-9.3],previousWalkInThreshold:{a:[-2.1,y,-9.3],b:[-3.5,y,-9.3],width:1.9,height:3.3},purpose:'Poolside bath interaction approach; enter through the mounted bath action',furnitureId:'japan-furniture-bath-1'});threshold('jp-women-pool-entry',[4.9,y,-9.7],[4.9,y,-8.9],1.0,3.3,{interactionOnly:true,role:'furniture-approach',mountedDestination:[3.68,y,-9.7],previousWalkInThreshold:{a:[4.9,y,-9.7],b:[3.5,y,-9.7],width:1.9,height:3.3},purpose:'Poolside bath interaction approach; enter through the mounted bath action',furnitureId:'japan-furniture-bath-2'});
  program('men-changing',2,'changing-lockers',53,['jp-room-men-changing'],{gender:'men',pairedFunction:'gender-separated-changing'});program('women-changing',2,'changing-lockers',38,['jp-room-women-changing'],{gender:'women',pairedFunction:'gender-separated-changing'});
  program('men-wet',2,'onsen',162,['jp-room-men-wash','jp-room-men-bath','jp-room-men-pool-interior'],{gender:'men',pairedFunction:'gender-separated-onsen'});program('women-wet',2,'onsen',100,['jp-room-women-wash','jp-room-women-bath','jp-room-women-pool-interior'],{gender:'women',pairedFunction:'gender-separated-onsen'});program('bath-foyer',2,'bath-transition-foyer',87,['jp-room-bath-foyer']);
 }
 // 3F: a single expansive kotatsu hall, one library and exactly one guest suite.
 {
  const f=floorGroups[2],y=7.6;
  // Two enclosed rear rooms. The east return separates the guest bed from
  // the stair landing; a public gallery x=5.92..7.34 leads south to the hall.
  partition(f,y,-7.5,-8,9,'x',2.8);partition(f,y,1.4,-8,8.8,'x',2.6,.6,{id:'jp-guest-suite-door',kind:'pocket',bottom:.07,top:2.805});
  wall(f,y,-3,-11.5,7,'z');wall(f,y,5.8,-11.5,7,'z');
  threshold('jp-library-open-nook',[-7.5,y,-7.1],[-7.5,y,-8.9],2.8,2.85);
  // Use the continuous .070m tatami face; retain the previous aperture top.
  threshold('jp-guest-suite-door',[2,y,-7.1],[2,y,-8.9],2.6,2.85,{floorFit:{bottom:y+.07,top:y+.075+2.73,runningGap:.012}});
  tatami(f,-2.65,.42,17.9,16.4,[SLIDE_FLOOR_TRIM_CUTOUTS.guest]);
  // The inset moves the leaf behind the hall mat edge. Join the two existing
  // tatami finishes across the wall thickness and beneath both pocket cavities.
  G.box(f,2,.035,-8.0275,5.52,.07,.495,P.tatami);
  f.userData.characterMatSurfaces.push({minX:-.76,maxX:4.76,minZ:-8.275,maxZ:-7.78,offset:.075});
  for(const [i,[x,z]]of [[-7,4],[-.7,4],[-7,-3],[-.7,-3]].entries())furnishing(createKotatsu,2,x,z,{size:i===0?2.2:2.45,quiltSize:3.6,height:.7,color:i%2?P.indigo:P.red});
  sign(f,-2.5,3.04,-7.3,'KOTATSU HALL',P.red,8.2);
  for(const [x,z]of [[-7,4],[-.7,4],[-7,-3],[-.7,-3]])lantern(f,x,3.06,z,false,.35);
  // Full-width vaulted-looking frieze, opaque coffered ceiling remains at 3.8m.
  for(const x of [-10.7,4.7]){G.box(f,x,3.2,.1,.3,.33,16.5,P.red);for(let z=-6.9;z<8;z+=2)cloud(f,x,2.91,z,.9);}
  // Compact, quiet library: wall-to-wall books, one reading bench and scroll.
  for(const [x,z,w,rot]of [[-7.5,-14.35,7.5,0],[-11.12,-11.1,4.5,Math.PI/2]]){const q=shelf(f,y,x,z,w,.62,rot,false);for(const yy of [.84,1.47,2.1])bookset(q,0,yy,0,w-.2);}
  bench(f,y,-5.0,-11.8,2.1);scroll(f,-4.2,2,-14.8,1.3,1.65);sign(f,-7.5,3.05,-7.84,'LIBRARY',P.jade,3.9);
  // Only public guest sleeping room in the district; no repeated suite rows.
  tatami(f,1.4,-11.45,8.55,6.35);futon(f,y,4.4,-11.6,P.indigo);
  bench(f,y,-.7,-13.9,2.5);folded(f,-.7,.63,-13.9,P.red,1.0,.44);scroll(f,1.2,2,-14.8,1.7,1.85);
  slatScreen(f,y,4.25,-9.5,2.6,'x',1.8);
  // Fit the guest plaque within the lintel band, above the full-height shoji
  // and below the coffer beams. Keep the original doorway clearance.
  const guestPlaque=new THREE.Group();guestPlaque.position.set(2,3.1,-7.84);guestPlaque.scale.y=.58;f.add(guestPlaque);
  sign(guestPlaque,0,0,0,'GUEST',P.wood,3.0);
  target('kotatsu-hall','Large square-kotatsu gathering hall',3.4,y,2.1);target('kotatsu-seat','Square kotatsu guest seat',-5.475,y,4);target('library','Compact library nook',-7.5,y,-10.5);target('guest-suite','Single tatami guest suite',.1,y,-11.05);
  program('kotatsu-hall',3,'kotatsu-gathering',307,['jp-room-kotatsu-hall','jp-room-kotatsu-seat']);program('library',3,'library-reading',60,['jp-room-library']);program('guest-suite',3,'guest-sleeping',61.6,['jp-room-guest-suite'],{audience:'visiting guests',suiteCount:1});
 }
 // 4F: an asymmetrical working floor, dedicated to running the bathhouse.
 {
  const f=floorGroups[3],y=11.4;
  partition(f,y,-1,5,8,'z',2.5,-.1,{id:'jp-operator-door',kind:'pocket'});partition(f,y,-1,-2.5,7,'z',2.3);partition(f,y,-1,-10.5,9,'z',2.4,0,{id:'jp-staff-room-door',kind:'pocket'});
  wall(f,y,-6.5,1,11,'x');wall(f,y,-6.5,-6,11,'x');
  // Laundry starts beyond a clear south stair landing, never inside it.
  partition(f,y,2,4.7,8.6,'z',2.6,-.6);partition(f,y,7,.4,10,'x',2.4,2.1);
  threshold('jp-laundry-stair-foyer-door',[9.1,y,-.5],[9.1,y,1.3],2.4);
  threshold('jp-operator-door',[.1,y,4.9],[-2.1,y,4.9],2.5);threshold('jp-apothecary-room-door',[.1,y,-2.5],[-2.1,y,-2.5],2.3);threshold('jp-staff-room-door',[.1,y,-10.5],[-2.1,y,-10.5],2.4);threshold('jp-laundry-door',[1.0,y,4.1],[3.0,y,4.1],2.6);
  // Operator office with a long curved-edged writing desk, ledger and key wall.
  groundSolid(f,y,-7,.57,6.5,6.4,1.14,1.35,P.cedar);G.box(f,-7,1.2,6.5,6.6,.12,1.49,P.honey);
  G.box(f,-7.2,1.29,6.5,1.5,.045,.85,P.paper);for(let i=0;i<8;i++)G.box(f,-7.2,1.315,6.18+i*.08,1.3,.008,.014,P.indigo);
  bookset(f,-9,1.27,6.45,1.2);tea(f,-4.9,1.28,6.5);drawers(f,-7,.2,8.67,8,5,7.6,2.6);obstacle(-7,y+1.5,8.53,7.8,3,.7);
  bench(f,y,-7.1,4.2,3.2);vase(f,-10.8,.05,2.1);sign(f,-6,2.85,1.15,'OFFICE',P.jade,4);
  // Apothecary is one small workroom, with botanical drawers and weighing bench.
  drawers(f,-6.9,.15,-5.65,9,5,8.7,2.7);obstacle(-6.9,y+1.5,-5.5,8.9,3,.76);
  groundSolid(f,y,-7.5,.53,-2.6,5.5,1.06,1.2,P.cedar);G.box(f,-7.5,1.12,-2.6,5.7,.12,1.32,P.honey);
  for(const x of [-9.5,-8.4,-7.3,-6.2]){G.vessel(f,x,1.2,-2.6,[P.jade,P.cream,P.indigo][Math.abs(Math.round(x))%3],.45);G.box(f,x,1.38,-2.34,.17,.14,.025,P.paper);}
  beam(f,[-5.2,1.22,-2.6],[-5.2,1.95,-2.6],.035,P.gold);beam(f,[-5.8,1.91,-2.6],[-4.6,1.91,-2.6],.027,P.gold);for(const x of [-5.8,-4.6]){beam(f,[x,1.91,-2.6],[x,1.45,-2.6],.012,P.gold);G.sphere(f,x,1.43,-2.6,.28,P.gold,1,.23,1);}
  sign(f,-6,2.85,-5.79,'APOTHECARY',P.red,5.6);
  // Staff quarters use two raised timber bunks and personal storage, not suites.
  for(const x of [-8.9,-4.3]){
   for(const dx of [-1.12,1.12])for(const dz of [-1.48,1.48]){G.cyl(f,x+dx,1.37,-11.5+dz,.065,.065,2.74,P.cedar,8);G.sphere(f,x+dx,2.77,-11.5+dz,.095,P.gold);}
   for(const yy of [.46,1.93]){
    G.box(f,x,yy,-11.5,2.35,.16,3.1,P.honey);
    // Reuse the existing softly folded rectangular futon at single-bunk size.
    // Keep the former quilt and pillow support heights; only cloth changes.
    const bedding=createGuestFuton({color:P.indigo});bedding.scale.set(.91,.8,.95);bedding.position.set(x,yy+.0052,-11.6);
    bedding.getObjectByName('Soft rectangular pillow').parent.position.y=.0845;f.add(bedding);
   }
   for(const zz of [-12.98,-10.02])G.box(f,x,2.46,zz,2.3,.12,.09,P.wood);
   for(let yy=.35;yy<2;yy+=.34)G.box(f,x+1.28,yy,-10.2,.72,.065,.11,P.cedar);obstacle(x,y+1.5,-11.5,2.75,3,3.2);
  }
  bench(f,y,-6.8,-7.45,3.3);shelf(f,y,-11.1,-7.7,2.0,.65,Math.PI/2);sign(f,-6,2.9,-14.72,'STAFF',P.indigo,4.2);
  // Linen/laundry has rounded wash drums, folding table and drying lattice.
  tileFloor(f,7,4.65,9.5,8.45,0xa3aca0);
  for(const x of [4.3,7.15,10]){
   G.cyl(f,x,.61,7.35,.9,.97,1.22,0x63877c,18);G.torus(f,x,1.23,7.35,.85,.08,P.gold);G.cyl(f,x,1.22,7.35,.72,.72,.025,0x355f61,16);G.sphere(f,x,1.2,7.35,.62,P.paper,1,.2,1);obstacle(x,y+.67,7.35,2,1.34,2);
  }
  groundSolid(f,y,8.6,.51,2.65,4.1,1.02,1.5,P.cedar);G.box(f,8.6,1.08,2.65,4.3,.12,1.62,P.honey);for(const x of [7.5,8.6,9.7])folded(f,x,1.19,2.65,[P.indigo,P.red,P.paper][Math.round(x)%3],.84,.65);
  shelf(f,y,11.15,1.7,2.2,.65,Math.PI/2);for(const x of [4.15,5.2,6.25]){G.box(f,x,2.44,1.65,.83,1.1,.035,P.paper);G.box(f,x,2.04,1.68,.72,.06,.025,P.indigo);}beam(f,[3.5,3.02,1.65],[6.9,3.02,1.65],.048,P.wood);
  sign(f,7,2.98,8.72,'LAUNDRY',P.jade,5.8);
  // ONE copper boiler and exposed control pipe gallery, behind the upper stair.
  groundSolid(f,y,4.1,.19,-12.8,2.4,.38,2.1,0x474a43);G.cyl(f,4.1,1.14,-12.8,.9,.98,1.9,0xac734c,18);G.sphere(f,4.1,2.12,-12.8,.9,0xc18b57,1,.42,1);obstacle(4.1,y+1.3,-12.8,2,2.6,2);
  for(const yy of [.45,1.8])G.torus(f,4.1,yy,-12.8,.94,.07,P.gold);
  G.mesh(f,new THREE.CylinderGeometry(.3,.3,.07,16),0xf7b663,4.1,1.14,-11.82,{emissive:0xf97829,emissiveIntensity:.85}).rotation.x=Math.PI/2;
  for(const x of [2.5,5.7,6.65]){beam(f,[x,.4,-14.2],[x,3.16,-14.2],.11,0x68907b);beam(f,[x,3.16,-14.2],[x,3.16,-10.4],.11,0x68907b);G.torus(f,x,1.45,-13.99,.26,.035,P.red,0);for(let k=0;k<4;k++){const a=k*Math.PI/2;beam(f,[x,1.45,-13.99],[x+Math.cos(a)*.23,1.45+Math.sin(a)*.23,-13.99],.02,P.red);}}
  sign(f,4.35,2.74,-14.77,'STEAM',P.wood,4.5);
  target('operator','Bathhouse operator office',-5.0,y,3.1);target('apothecary','Herbal apothecary workroom',-3.45,y,-2.5);target('staff-quarters','Compact staff bunk quarters',-6.7,y,-9.1);target('linen','Linen folding and laundry',5.0,y,3.9);target('boiler','Copper boiler and pipe-control gallery',4.1,y,-10.8);
  program('operator',4,'operator-office',88,['jp-room-operator']);program('apothecary',4,'herbal-apothecary',77,['jp-room-apothecary']);program('staff-quarters',4,'staff-sleeping',99,['jp-room-staff-quarters'],{audience:'bathhouse staff',bunkCount:2});program('laundry',4,'linen-laundry',86,['jp-room-linen']);program('plant',4,'boiler-pipe-controls',33,['jp-room-boiler']);
 }

 // Massive curved crown, a glowing offset pagoda lantern, projecting dormers,
 // and exposed copper steam plant create a deliberately otherworldly silhouette.
 roof(roofGroup,0,15.26,-2.5,29.3,32.2,3.75);
 // Frontal lantern gallery is decorative roof machinery, not a fifth playable floor.
 G.box(roofGroup,1.5,17.12,5.7,11.2,2.05,6.3,P.red);
 for(const x of [-2.5,.1,2.7,5.3])glowWindow(roofGroup,x,17.21,8.9,2.28,1.55);
 roof(roofGroup,1.5,18.36,5.7,14.1,8.7,2.8);
 // A giant crescent motif in its curved gable is unique to Kasumi-yu.
 G.sphere(roofGroup,1.5,19.39,9.6,.89,P.gold,1,1,.11);G.sphere(roofGroup,1.83,19.63,9.72,.77,P.roof,1,1,.1);
 for(const side of [-1,1])for(let i=0;i<16;i++){const t=i/15,x=1.5+side*(1.1+t*5.6),y=20.13-2.1*t+1.24*t*t;G.sphere(roofGroup,x,y,9.56,.10,P.gold,1,1,1);}
 // Tall, off-centre octagonal lantern tower and two emerald roofs.
 G.box(roofGroup,-7.2,19.12,-6.9,6.0,5.0,6.0,P.red);
 for(const z of [-10.04,-3.76])for(const x of [-8.6,-5.8])glowWindow(roofGroup,x,19.67,z,2.2,2.8);
 for(const x of [-10.23,-4.17])for(const z of [-8.3,-5.5])glowWindow(roofGroup,x,19.67,z,2.2,2.8,'z');
 roof(roofGroup,-7.2,21.68,-6.9,9.7,9.7,2.15);
 G.cyl(roofGroup,-7.2,23.36,-6.9,2.07,2.07,1.8,P.red,8);
 for(let i=0;i<8;i++){const a=i*Math.PI/4,x=-7.2+Math.sin(a)*1.94,z=-6.9+Math.cos(a)*1.94;const q=new THREE.Group();q.position.set(x,23.36,z);q.rotation.y=a;roofGroup.add(q);glowWindow(q,0,0,.02,1.15,1.34);}
 roof(roofGroup,-7.2,24.35,-6.9,7.0,7.0,2.0);G.cyl(roofGroup,-7.2,26.72,-6.9,.09,.18,1.4,P.gold,8);G.sphere(roofGroup,-7.2,27.44,-6.9,.21,P.gold);
 // Asymmetrical, visible working pipes run outside the east wall.
 G.box(group,13.16,7.9,-10.3,2.02,15.8,5.25,0x703b34);obstacle(13.16,7.9,-10.3,2.02,15.8,5.25);
 for(const yy of [2,5.8,9.6,13.4]){G.box(group,14.22,yy,-10.3,.1,.26,5.5,P.gold);for(const z of [-11.8,-10.3,-8.8])glowWindow(group,14.22,yy-1.0,z,1.08,1.2,'z');}
 roof(roofGroup,12.87,16.25,-10.3,3.5,7.0,1.2);
 for(const [x,z,h] of [[12.8,-13.8,22.4],[10.4,-15.75,20.7],[13.15,-6.55,19.2]]){
  obstacle(x,h/2,z,1.06,h,1.06);G.cyl(roofGroup,x,h/2,z,.39,.53,h,0xaa784f,12);for(let yy=2;yy<h;yy+=2.1)G.torus(roofGroup,x,yy,z,.47,.09,0x5d7e6c);
  G.cyl(roofGroup,x,h,z,.74,.5,.35,0x557a66,12);G.cone(roofGroup,x,h+.29,z,.83,.4,P.roof,12);steam(roofGroup,x,h+.6,z,1.2);
 }
 // Original waterwheel-side fantasy ornaments, clouds and copper bells.
 for(const x of [-12.7,12.7]){beam(roofGroup,[x,16.15,10],[x,17.15,10],.055,P.gold);G.vessel(roofGroup,x,16.05,10,P.gold,.65);}
 for(const y of [3.3,7.1,10.9,14.7])for(const x of [-9,-5,5,9])cloud(roofGroup,x,y,12.05,1.3);
 // A red timber entry canopy remains below the first balcony, so it never
 // seals the upper doorways or turns a storey into inaccessible roof geometry.
 roof(roofGroup,0,3.11,12.2,6.5,3.6,.68);
 for(const x of [-2.55,2.55])groundSolid(group,0,x,1.5,13.15,.22,3,.22,P.red);
 G.box(group,0,2.98,13.2,4.2,.18,.2,P.red);G.box(group,0,2.45,13.22,1.8,.66,.16,P.wood);
 yuGlyph(group,0,2.45,13.32,.59,P.gold);entryNoren(floorGroups[0],0,9.24);
 for(const x of [-3.72,3.72]){
  G.box(group,x,2.19,13.3,.86,1.76,.05,P.indigo);G.box(group,x,3.13,13.3,1.05,.065,.09,P.cedar);
  yuGlyph(group,x,2.35,13.34,.68);for(const dx of [-.35,.35])G.box(group,x+dx,2.18,13.335,.022,1.56,.014,P.gold);
 }

 // The floor stays at y=0; depressed water and a carved red podium provide
 // the bridge's elevation illusion without an invisible step or teleport.
 for(const x of [-7.65,7.65]){
  G.box(group,x,-.19,14.95,10.5,.27,4.7,0x305f64);for(let i=0;i<10;i++)G.box(group,x+Math.sin(i)*3.7,-.043,13.4+i*.32,1.1,.013,.02,0x89b8a5);
  G.box(group,x,-.32,11.85,10.9,.58,1.15,P.red);for(let i=0;i<15;i++){G.box(group,x-4.9+i*.7,-.28,12.46,.04,.45,.045,P.gold).rotation.z=.6;}
 }
 G.box(group,0,-.1,15.75,5.05,.19,7.7,P.vermilion);
 for(let z=12;z<19.4;z+=.34)G.box(group,0,.006,z,5.0,.019,.025,0x6d372d);
 for(const x of [-2.56,2.56]){
  for(let z=12;z<=19.5;z+=.75){if(z>16.6&&z<19.1)continue;const rise=.15*Math.sin((z-12)/7.5*Math.PI);G.cyl(group,x,.57+rise,z,.067,.087,1.1,P.red,8);G.sphere(group,x,1.16+rise,z,.115,P.gold);obstacle(x,.62,z,.16,1.24,.17);}
  for(let i=0;i<30;i++){const z=12+i*.25,z2=z+.25;if(z>=16.6&&z2<=19.2)continue;for(const yy of [.3,.94])beam(group,[x,yy+.15*Math.sin((z-12)/7.5*Math.PI),z],[x,yy+.15*Math.sin((z2-12)/7.5*Math.PI),z2],.065,P.vermilion);}
 }
 // Giant symbolic lanterns flank the approach rather than hang in the camera lane.
 for(const x of [-5.1,5.1]){G.box(group,x,.22,13.8,1.15,.44,1.15,P.stone);G.cyl(group,x,1.33,13.8,.16,.23,2.3,P.red);lantern(group,x,2.83,13.8,true,.69);obstacle(x,1.8,13.8,1.45,3.6,1.45);}

 // R6 district expansion: a true 60×80 plan, kept at human scale. The central
 // bathhouse is unchanged in scale; gardens, shop wing and rear service yard
 // are new walkable places connected by paths, gates and roofed galleries.
 const district=new THREE.Group();district.name='Bathhouse district · reflection garden, travel shop and supplies';group.add(district);
 // Long arrival bridge over a steaming canal. The dark water basins are blocked
 // and the continuous 5m bridge is the real, ground-level walking route.
 G.box(district,0,-.08,27.0,5.05,.16,14.5,P.vermilion);
 for(let z=19.6;z<34.3;z+=.35)G.box(district,0,.01,z,5,.025,.025,0x6d372d);
 for(const x of [-15.9,15.9]){
  G.box(district,x,.018,25.5,26.6,.03,8.2,0x315c5e);obstacle(x,.15,25.5,26.6,.3,8.2,{camera:false});
  for(let i=0;i<24;i++)G.box(district,x+Math.sin(i*2.3)*10,.04,22+(i%8),1.3,.012,.028,0x7fa799);
  for(const z of [21.25,29.75])G.box(district,x,.11,z,26.6,.22,.18,P.stone);
  for(const xx of [x-7,x+7])steam(district,xx,.3,25,1.3);
 }
 for(const x of [-2.56,2.56]){
  for(let z=19.65;z<30.3;z+=.8){G.cyl(district,x,.58,z,.065,.085,1.16,P.red,8);G.sphere(district,x,1.2,z,.11,P.gold);obstacle(x,.62,z,.16,1.24,.16);}
  beam(district,[x,.32,19.55],[x,.32,30.25],.065,P.red);beam(district,[x,.99,19.55],[x,.99,30.25],.075,P.vermilion);
 }
 // Warm gateway and a lantern avenue announce the spirit-town district.
 for(const x of [-4.25,4.25])groundSolid(district,0,x,2.12,35,.42,4.24,.42,P.red);
 roof(roofGroup,0,4.12,35,10.8,4.8,1.8);G.box(district,0,3.32,35.2,3.5,1.04,.28,P.wood);
 for(const x of [-.85,0,.85]){G.torus(district,x,3.32,35.37,.22,.035,P.gold,0);cloud(district,x-.12,3.3,35.4,.65);}
 for(const x of [-8.5,8.5,-20,20])for(const z of [33.1,37]){
  G.box(district,x,.23,z,1.2,.46,1.2,P.stone);G.cyl(district,x,1.3,z,.1,.2,2.35,P.red);lantern(district,x,2.58,z,false,.5);obstacle(x,1.55,z,1.12,3.1,1.12);
 }
 for(const x of [-13,13,-25,25])G.tree(district,x,35,0x80977c,1.05);
 // Stone circulation loop around the core, with uninterrupted 3m passages.
 for(const x of [-16.4,16.4])G.box(district,x,.012,-2.8,3.8,.026,43.6,0xa69d80);
 for(const z of [17.9,-22.6])G.box(district,0,.014,z,35,.026,3.3,0xb1a488);
 for(const x of [-16.4,16.4])for(let z=-21;z<20;z+=1.45)G.box(district,x,.031,z,2.55,.018,.035,0x786b50);
 // A reflecting koi pond is a garden destination, not an extra bath.
 G.box(district,-23.3,-.035,-3.8,7.6,.07,9.3,0x365f59);
 G.mesh(district,new THREE.BoxGeometry(7.36,.028,9.05),0x6aa69a,-23.3,.036,-3.8,{transparent:true,opacity:.8,depthWrite:false});
 obstacle(-23.3,.12,-3.8,7.36,.24,9.05,{camera:false});
 for(const z of [-8.45,.85])groundSolid(district,0,-23.3,.18,z,7.9,.36,.32,P.stone);
 for(const x of [-27.1,-19.5])groundSolid(district,0,x,.18,-3.8,.32,.36,9.3,P.stone);
 for(let i=0;i<9;i++){const x=-25.6+(i%3)*2.1,z=-6.8+Math.floor(i/3)*2.6;G.sphere(district,x,.062,z,.21,i%2?0xd79566:P.paper,1.6,.12,.7);const tail=G.mesh(district,new THREE.ConeGeometry(.14,.25,3),P.red,x-.39,.065,z);tail.rotation.z=Math.PI/2;tail.rotation.x=Math.PI/2;}
 for(const [x,z]of [[-25,-.4],[-26.3,-1.7],[-24.1,-.9]]){G.cyl(district,x,.067,z,.37,.37,.015,0x6d9a6c,12);G.sphere(district,x,.1,z,.1,0xe3b6b1,1,.45,1);}
 for(const [x,z,s]of [[-27.3,-10,.95],[-26.5,7.8,.8],[-19.8,-11.3,.8]]){G.tree(district,x,z,0x7a9376,s);G.sphere(district,x,.38,z+.8,.75,P.stone,1.3,.65,.75);obstacle(x,.53,z,1.5,1.06,1.5,{camera:false});}
 for(const z of [-10.6,8.9])for(const x of [-21.8,-27]){G.box(district,x,.25,z,.9,.5,.9,P.stone);G.cyl(district,x,1,z,.18,.23,1.25,P.stone);G.mesh(district,new THREE.BoxGeometry(.54,.65,.54),P.paper,x,1.6,z,{emissive:0xffd599,emissiveIntensity:.65});registerNightFixture(district,x,1.6,z,{kind:'garden-lantern',intensity:15,distance:7});roof(district,x,1.97,z,1.2,1.2,.45);obstacle(x,1,z,1.1,2,1.1);}
 G.box(district,-23,.025,12.8,10.1,.05,6.7,P.wood);for(const x of [-27.4,-18.6])for(const z of [10,15.6])groundSolid(district,0,x,1.75,z,.2,3.5,.2,P.red);
 roof(roofGroup,-23,3.53,12.8,12,8.3,2.0);slab(district,0,-28,-18,9.5,16.1,3.45,P.wood,false);bench(district,0,-23.2,14.7,6.9);sign(district,-23.2,2.55,15.66,'GARDEN',P.jade,5.0);lantern(district,-25.9,2.7,11.1,true,.38);lantern(district,-20.1,2.7,11.1,true,.38);
 // East travel and luggage shop, a furnished room with a large western
 // doorway. The 2.8m portal and low counter create an explorable shop, not facade.
 const ax=23.1,az=3.4;slab(district,0,18.2,28,-2.8,11.0,0,0x97714d,true);slab(district,0,18.1,28.1,-2.9,11.1,3.63,P.wood,false);
 wall(district,0,28,4.1,14,'z');wall(district,0,23.1,-2.8,9.8,'x');wall(district,0,23.1,11,9.8,'x');wall(district,0,18.2,4.1,14,'z',{width:3.2,height:2.9});
 roof(roofGroup,23.1,3.82,4.1,12,16.5,2.15);
 for(const z of [.2,8.1]){const q=new THREE.Group();q.position.set(18.04,1.76,z);q.rotation.y=Math.PI/2;district.add(q);glowWindow(q,0,0,0,3.35,1.74);}
 for(const z of [-1.0,2.1,5.2,8.4]){
  groundSolid(district,0,27.05,.51,z,1.25,1.02,2.15,P.cedar);
  for(let i=0;i<3;i++){const zz=z-.63+i*.62;G.sphere(district,26.98,1.45,zz,.36,[P.indigo,P.red,P.jade][i],1,.8,.67);G.torus(district,26.99,1.83,zz,.14,.026,P.gold,0);G.box(district,26.63,1.44,zz,.04,.07,.3,P.gold);}
 }
 drawers(district,22.8,.25,-2.45,8,5,7.4,2.6);obstacle(22.8,1.35,-2.3,7.6,2.7,.74);
 groundSolid(district,0,22.2,.54,7.8,4.4,1.08,1.1,P.cedar);G.box(district,22.2,1.13,7.8,4.55,.1,1.22,P.honey);
 for(const x of [20.7,21.7,22.7,23.7]){G.box(district,x,1.22,7.8,.63,.055,.75,P.paper);G.box(district,x,1.255,7.8,.5,.016,.53,P.indigo);}
 for(const z of [1.2,3.4]){G.box(district,21.2,.35,z,1.1,.7,.62,P.cedar);G.box(district,21.2,.72,z,1.15,.09,.69,P.gold);G.torus(district,21.2,.44,z+.35,.1,.018,P.gold,0);obstacle(21.2,.4,z,1.2,.8,.73);}
 sign(district,23.1,2.9,10.82,'TRAVEL SHOP',P.red,7.1);lantern(district,23,2.9,4.2,true,.4);
 for(let z=-1;z<10;z+=2.5){G.box(district,24.9,2.83,z,3.9,.14,.16,P.red);cloud(district,23.4,2.63,z,.7);}
 // Roofed, open linking arcade meets the core's east-front promenade.
 for(const z of [12.5,17.5])for(const x of [17.7,27.5])groundSolid(district,0,x,1.72,z,.22,3.44,.22,P.red);
 roof(roofGroup,22.6,3.5,15,12.2,7.0,1.1);for(const x of [19,23,26.5]){lantern(district,x,2.7,16.9,true,.35);G.box(district,x,.34,16.5,1.7,.68,.55,P.cedar);obstacle(x,.34,16.5,1.7,.68,.55);}

 // Supporting washhouse: reachable private cubicles, sinks, mirrors, towels
 // and changing lockers, placed off the east service path beside the baths.
 slab(district,0,18.2,28,-17.6,-6.4,0,0x889587,true);slab(district,0,18.1,28.1,-17.7,-6.3,3.62,P.wood,false);
 wall(district,0,28,-12,11.2,'z');wall(district,0,23.1,-17.6,9.8,'x');wall(district,0,23.1,-6.4,9.8,'x');wall(district,0,18.2,-12,11.2,'z',{width:3.2,height:2.9,offset:1.7});
 roof(roofGroup,23.1,3.82,-12,12.0,13.5,2.0);
 for(const [i,x]of [20,23.15,26.25].entries()){
  // Join each front section into the real side/dividing walls; the former
  // repeated 2.85m pieces left sightline slots between stalls and at the ends.
  const left=[18.2,21.56,24.71][i],right=[21.56,24.71,28][i],middle=(left+right)/2;
  wall(district,0,middle,-13.25,right-left,'x',{width:1.35,height:2.85,offset:x-middle,inset:{id:'jp-washroom-cubicle-'+(i+1),kind:'hinge'}});
  if(i<2)wall(district,0,x+1.56,-15.36,4.4,'z');
  // Stylised private washroom fixture, cistern and sanitary paper holder.
  G.box(district,x,.53,-16.75,.82,1.05,.3,P.cream);G.sphere(district,x,.36,-16.06,.39,P.paper,1,.8,1.4);G.torus(district,x,.57,-16.04,.30,.085,P.cream);G.cyl(district,x,.15,-16.3,.25,.3,.3,P.paper);
  obstacle(x,.55,-16.4,1.05,1.1,1.35);G.cyl(district,x+.95,.86,-15.75,.115,.115,.26,P.paper,12).rotation.z=Math.PI/2;
  threshold('jp-washroom-cubicle-'+(i+1),[x,0,-12.45],[x,0,-14.05],1.35,2.85);explorationTargets.push({id:'jp-washroom-private-'+(i+1),name:'Private washroom '+(i+1),position:[x,0,-14.7]});
 }
 for(const x of [20.5,23.1,25.7]){groundSolid(district,0,x,.41,-7.2,1.85,.82,1.05,P.cedar);G.box(district,x,.88,-7.2,2,.12,1.14,P.stone);G.sphere(district,x,.96,-7.2,.34,P.paper,1,.26,.8);beam(district,[x,1.0,-6.9],[x,1.38,-6.9],.035,P.gold);beam(district,[x,1.38,-6.9],[x,1.38,-7.15],.035,P.gold);G.box(district,x,2.08,-6.57,1.65,1.18,.065,0x8caaaa);for(const dx of [-.87,.87])G.box(district,x+dx,2.08,-6.52,.07,1.3,.06,P.gold);folded(district,x+.62,.96,-7.22,P.indigo,.46,.38);}
 explorationTargets.push({id:'jp-washroom-sinks',name:'Washhouse sinks and linen',position:[23.1,0,-9.1]});doorways.push({id:'jp-washhouse-entry',a:[17.2,0,-10.3],b:[19.2,0,-10.3],width:3.2,height:2.9});
 // Rear working yard: herb growing, delivery crates and water cisterns. No second apothecary or laundry.
 G.box(district,0,.015,-30.4,44,.03,13.9,0x839171);
 for(const x of [-18,-10,10,18])for(const z of [-27,-33]){
  G.box(district,x,.18,z,4.3,.36,3.3,P.wood);G.box(district,x,.39,z,4.1,.05,3.1,0x574d3d);obstacle(x,.22,z,4.3,.44,3.3);
  for(let i=0;i<4;i++)for(let j=0;j<3;j++){G.sphere(district,x-1.5+i,.61,z-1+j,.25,[0x637e4d,0x9ca46a,0x577664][(i+j)%3],1,1.25,1);if((i+j)%3===0)G.sphere(district,x-1.5+i,.87,z-1+j,.09,0xd5b481);}
 }
 // Small roofed workroom at the end of the route, open on its south side.
 G.box(district,0,.025,-34.1,9,.05,8.16,P.wood);for(const x of [-4.35,4.35]){wall(district,0,x,-34.1,8.2,'z');}wall(district,0,0,-38.2,8.7,'x');wall(district,0,0,-30,8.7,'x',{width:3.1,height:2.9,inset:{id:'jp-supplies-door',kind:'hinge',bottom:.05,top:2.9}});
 // Complete the .050m workfloor through the jamb depth: the existing floor
 // ends at -30.020, and this 20mm cap meets it above the .030m yard finish.
 G.box(district,0,.04,-29.95,3.1,.02,.14,P.wood);surface(-1.55,1.55,-30.02,-29.88,.05);
 slab(district,0,-4.45,4.45,-38.3,-29.9,3.62,P.wood,false);roof(roofGroup,0,3.78,-34.1,11.8,10.6,2.2);
 for(const x of [-2.9,2.9])for(const z of [-36.8,-34.65]){
  for(let i=0;i<2;i++){G.box(district,x,.37+i*.7,z,1.75,.66,1.6,P.cedar);for(const xx of [x-.7,x+.7])G.box(district,xx,.37+i*.7,z+.82,.07,.62,.05,P.gold);G.box(district,x,.4+i*.7,z+.84,.65,.28,.02,P.paper);}obstacle(x,.73,z,1.8,1.46,1.7);
 }
 sign(district,0,2.8,-37.93,'SUPPLIES',P.jade,6.5);
 for(const x of [-25,25]){G.cyl(district,x,1.55,-24.8,1.4,1.6,3.1,0xaa784f,16);G.torus(district,x,2.9,-24.8,1.4,.1,0x638273);G.cone(district,x,3.3,-24.8,1.65,.58,P.roof,16);obstacle(x,1.8,-24.8,3.3,3.6,3.3);steam(district,x,3.7,-24.8,.9);}
 // Delivery barrows replace duplicated washing/drying functions outdoors.
 for(const x of [-11,11]){G.box(district,x,.52,-20,3.2,.13,1.6,P.cedar);for(const dx of [-1.1,1.1])for(const zz of [-20.5,-19.5]){const wheel=G.cyl(district,x+dx,.25,zz,.25,.25,.13,P.wood,10);wheel.rotation.z=Math.PI/2;}for(const dx of [-1.1,0,1.1])G.box(district,x+dx,1,-20,.85,.82,1.2,P.honey);obstacle(x,.72,-20,3.35,1.44,1.8);}


 // Sakura procession and a real walk-through torii. Instanced flowers remain
 // intact and are deliberately excluded from static batch conversion.
 const sakuraDetails=[];
 function gardenAsset(item,x,z){item.group.position.set(x,0,z);item.group.userData.noStaticBatch=true;district.add(item.group);const moved=c=>({...c,minX:c.minX+x,maxX:c.maxX+x,minZ:c.minZ+z,maxZ:c.maxZ+z});colliders.push(...(item.localColliders??[]).map(moved));cameraColliders.push(...(item.cameraColliders??item.localColliders??[]).map(moved));sakuraDetails.push({name:item.group.name,position:[x,0,z],...item.metadata});return item;}
 gardenAsset(createSakuraTree({height:8.6,spread:7,seed:7319}),-23,-14.5);
 gardenAsset(createSakuraTree({height:6.5,spread:6,seed:452}),-6.2,33.5);
 gardenAsset(createSakuraTree({height:6.5,spread:6,seed:971}),6.2,33.5);
 gardenAsset(createTorii({width:4.6,height:4.0}),0,31.9);
 gardenAsset(createOmamoriStall(),4.7,31.6);gardenAsset(createInariShrine(),-4.8,31.6);
 for(const opts of [{bounds:{minX:-27,maxX:-18,minY:.25,maxY:8.2,minZ:-18,maxZ:-10},count:42,seed:983},{bounds:{minX:-8,maxX:8,minY:.2,maxY:6.2,minZ:30,maxZ:37},count:30,seed:713}]){const petals=createPetalFall(opts);petals.group.userData.dynamic=true;district.add(petals.group);updates.push(petals.update);}
 for(const [x,z]of [[-6.5,3.65],[3,3.65]])addSakuraMotif(floorGroups[1],{x,y:1.54,z,size:1.65});
 addSakuraMotif(floorGroups[2],{x:1.2,y:2.03,z:-14.71,size:1.23});addSakuraMotif(floorGroups[0],{x:-7,y:.64,z:7.59,size:1.4});
 threshold('jp-torii',[0,0,32.7],[0,0,31.1],2.62,2.85);
 explorationTargets.push({id:'jp-garden-sakura',name:'Sakura tree by the onsen outlook',position:[-20,0,-14.4]},{id:'jp-arrival-torii',name:'Sakura-framed torii procession',position:[0,0,31.9]});

 explorationTargets.push({id:'jp-courtyard-omamori',name:'Omamori pouch display',position:[4.7,0,33.1]},{id:'jp-courtyard-inari',name:'Small Inari shrine and fox messengers',position:[-4.8,0,33.03]});
 threshold('jp-courtyard-east-walk',[0,0,33.1],[4.7,0,33.1],2.2,3.3);threshold('jp-courtyard-west-walk',[0,0,33.03],[-4.8,0,33.03],2.2,3.3);
 // Every room and threshold is an explicit exploration/test target.
 for(const [id,name,position]of [
  ['arrival-gate','Lantern gateway',[0,0,36.5]],['canal-bridge','Vermilion canal bridge',[0,0,25.5]],['garden-path','Reflection garden path',[-17,0,2]],['garden-pond','Koi reflection pond overlook',[-18.65,0,-3.8]],['garden-pavilion','Quiet garden pavilion',[-23.2,0,12.4]],
  ['market-entry','Covered travel-shop entrance',[17.1,0,4.1]],['market-room','Travel and luggage shop',[23,0,4.2]],['market-arcade','Travel-shop arcade',[22.6,0,14.25]],['herb-yard','Herb growing yard',[0,0,-27.2]],['supplies','Delivery and supply store',[0,0,-33.3]],['west-yard','West rear service path',[-16.4,0,-22.6]],['east-yard','East rear service path',[16.4,0,-22.6]]
 ])explorationTargets.push({id:'jp-district-'+id,name,position});
 threshold('jp-market-door',[17.2,0,4.1],[19.2,0,4.1],3.2,2.9);threshold('jp-supplies-door',[0,0,-29.2],[0,0,-30.8],3.1,2.9,{floorFit:{bottom:.05,top:2.9,runningGap:.012}});threshold('jp-gateway',[0,0,36],[0,0,34],8,3.7);
 for(let f=0;f<4;f++){
  const y=LEVEL_Y[f];for(const [tag,x,z]of [['entrance',0,7.9],['stair-south',9.1,-.9],['stair-north',9.1,-11.4],['balcony-left',-6.4,10.25],['balcony-right',6.4,10.25],['balcony-center',0,10.25]])explorationTargets.push({id:`jp-${f+1}-${tag}`,name:`Floor ${f+1} ${tag}`,position:[x,y,z]});
  threshold(`jp-${f+1}-front-portal`,[f===3?.5:0,y,8.2],[f===3?.5:0,y,9.8],f===3?2.3:4.2,2.9);
 }
 const performanceHall=buildJapanPerformanceHall({floor:floorGroups[2],obstacle,sign});
 const stations=[
  {id:'jp-omamori',name:'参道 · 御守与小稻荷祠',action:'欣赏御守绳结与刺绣',position:[4.7,0,33.1],color:'#ad7892',playerAction:'tidy',playerWorkTarget:[4.7,1.14,32.04],interactionRadius:1.1,dialogue:'御守的小布袋绣着樱花，绳结也各不相同。鸟居另一侧的小稻荷祠前，狐狸是稻荷的使者，稻穗与米供传达着丰收的意象。',npcName:'Emi',npcAction:'tidy',npcLabel:'整理绳结与御守布袋',npcPosition:[4.7,0,30.6],workTarget:[4.7,1.12,31.1],npcRotation:0},
  {id:'jp-welcome',name:'一层 · 灯笼接待大厅',action:'领取浴衣与钥匙',position:[-4,0,5.4],color:'#d4a46d',playerAction:'tidy',dialogue:'欢迎来到霞汤屋。男汤与女汤都在二层，三层是暖桌大厅，四层是工作人员的地方。',npcName:'Koharu',npcAction:'tidy',npcLabel:'登记客簿与浴衣钥匙',npcPosition:[-5.4,0,5.7],workTarget:[-5.4,1.25,6.4],npcRotation:0},
  {id:'jp-onsen',name:'二层 · 男汤',action:'欣赏温泉水景',position:[-2.25,3.8,-9.3],color:'#7eadd0',playerAction:'relax',dialogue:'先经过更衣室，再洗净入汤。这里的屏风让每一道门都留住了隐私。',npcName:'Sora',npcAction:'bath-attendant',npcLabel:'检查男汤洗浴木桶',npcPosition:[-9.15,3.8,-3.7],workTarget:[-10.35,4.6,-3.7],npcRotation:-Math.PI/2},
  {id:'jp-women-onsen',name:'二层 · 女汤',action:'观赏温泉与山纹屏风',position:[5.0,3.8,-9.7],color:'#d5958d',playerAction:'relax',dialogue:'女汤有独立的更衣柜、洗浴区与宽敞汤池。木格窗外，樱花顺着庭园轻轻落下。',npcName:'Mei',npcAction:'tidy',npcLabel:'整理女汤毛巾与木篮',npcPosition:[4.3,3.8,1.4],workTarget:[5.8,4.8,1.4],npcRotation:Math.PI/2},
  {id:'jp-sushi',name:'一层 · 回转寿司',action:'查看寿司菜单',position:[-6,0,-.25],color:'#dcaa76',playerAction:'sushi-eat',interactionRadius:1.25,dialogue:'小盘沿着回转台缓缓前行。金枪鱼、玉子与紫菜卷，挑一盘喜欢的就好。',npcName:'Haru',npcAction:'sushi',npcLabel:'摆放寿司小盘',npcPosition:[-6,0,-5.38],workTarget:[-6,1.065,-4.8],npcRotation:0},
  {id:'jp-ramen',name:'一层 · 拉面屋台',action:'查看拉面菜单',position:[4.1,0,5.7],color:'#dcb076',playerAction:'ramen',interactionRadius:1.25,dialogue:'先舀热汤，再把面条轻轻放进碗里。吧台上备好了葱花和海苔。',npcName:'Daichi',npcAction:'ramen',npcLabel:'准备拉面与汤勺',npcPosition:[4.1,0,2.77],workTarget:[4.26,1.07,3.37],npcRotation:0},
  {id:'jp-rest',name:'三层 · 唯一客房',action:'整理榻榻米寝具',position:[.1,7.6,-11.05],color:'#b7abcc',playerAction:'tidy',dialogue:'这间客房留给远道而来的旅人。会客暖桌在外面的大堂，睡眠区则由屏风安静遮住。',npcName:'Yuki',npcAction:'tidy',npcLabel:'整理客房被褥',npcPosition:[2.5,7.6,-11.8],workTarget:[3.25,8.0,-11.8],npcRotation:Math.PI/2},
  {id:'jp-tea',name:'三层 · 方形暖桌大厅',action:'坐在方形暖桌旁',position:[-5.475,7.6,4],color:'#b7a572',playerAction:'kotatsu',interactionRadius:.45,playerWorkTarget:[-7,8.3,4],dialogue:'把腿收进暖和的被炉，桌上有茶与蜜柑。大堂很宽敞，适合慢慢聊一个下午。',npcName:'Aoi',npcAction:'kotatsu',npcLabel:'围坐被炉慢慢喝茶',npcPosition:[-7,7.6,5.525],workTarget:[-7,8.41,5.055],npcRotation:Math.PI},
  {id:'jp-incense',name:'四层 · 草木药房',action:'整理香草浴包',position:[-3.45,11.4,-2.5],color:'#cdb687',playerAction:'tidy',dialogue:'草木先在后院种植，再送到这里称量分装。每一格药柜都记着温泉的香气。',npcName:'Itsuki',npcAction:'tidy',npcLabel:'称量草木香包',npcPosition:[-4.5,11.4,-1.1],workTarget:[-5.2,12.8,-2.5],npcRotation:-2.7},
  {id:'jp-steam',name:'四层 · 铜锅炉管控廊',action:'检查蒸汽仪表',position:[4.1,11.4,-10.8],color:'#abbd99',playerAction:'tidy',dialogue:'只在管廊检查刻度与阀门。锅炉为二层汤池供暖，后院水箱负责补水。',npcName:'Nagi',npcAction:'tidy',npcLabel:'记录锅炉与水流刻度',npcPosition:[6.05,11.4,-11.6],workTarget:[5.7,12.85,-13.9],npcRotation:Math.PI},
  {id:'jp-balcony',name:'四层 · 灯笼望景廊',action:'眺望汤屋庭园',position:[0,11.4,10.2],color:'#daa092',dialogue:'从最高的工作楼层，能看见红桥、鸟居和樱花庭园。',npcName:'Ren',npcAction:'read',npcLabel:'在灯笼廊下静读',npcPosition:[-4.6,11.4,10.25],workTarget:[-4.6,12.4,11.1],npcRotation:0,route:[[-4.6,11.4,10.25],[-6.5,11.4,10.25],[-4.6,11.4,10.25]]},
  {id:'jp-garden-onsen',name:'庭园 · 锦鲤映池',action:'照看锦鲤与水草',position:[-18.65,0,-3.8],color:'#8bb5a1',playerAction:'garden',dialogue:'这座池塘留给锦鲤与落樱。温泉都在二层，庭园里只听水声与风声。',npcName:'Akari',npcAction:'garden',npcLabel:'照料锦鲤映池',npcPosition:[-18.4,0,-6],workTarget:[-19.8,.4,-5],npcRotation:-1.4},
  {id:'jp-market-tea',name:'东廊 · 旅人行李铺',action:'整理旅途用品',position:[23,0,4.2],color:'#c8a66e',playerAction:'tidy',dialogue:'红桥边的小铺备着手巾、地图和旅行箱。把湿雨伞收好，再继续你的旅程。',npcName:'Tomo',npcAction:'tidy',npcLabel:'整理旅行地图与手巾',npcPosition:[24.8,0,7.6],workTarget:[24.1,1.2,7.8],npcRotation:-Math.PI/2},
  {id:'jp-herb-workshop',name:'后院 · 收货与物料房',action:'清点汤屋补给',position:[0,0,-33.3],color:'#a5b47d',playerAction:'tidy',dialogue:'这里收下木桶、布料和食材。药草送到四层药房，米与面送进一层共用厨房。',npcName:'Nao',npcAction:'tidy',npcLabel:'清点补给木箱',npcPosition:[1.5,0,-33],workTarget:[2.8,1.0,-34.65],npcRotation:Math.PI}
 ];
 // Approach flags let the close-TPS controller gate seated/cooking activities.
 stations.push(...performanceStations());
 for(const s of stations)s.culture='japan';
 program('omamori-display',0,'omamori-cultural-display',4.8,['jp-courtyard-omamori']);program('inari-shrine',0,'small-inari-shrine',3.4,['jp-courtyard-inari']);
 program('reflection-pond',0,'koi-reflection-garden',124,['jp-district-garden-pond']);program('garden-pavilion',0,'garden-shelter',66,['jp-district-garden-pavilion']);program('travel-shop',0,'travel-luggage-retail',135,['jp-district-market-room']);program('public-toilets',0,'public-sanitary-facilities',110,['jp-washroom-private-1','jp-washroom-private-2','jp-washroom-private-3','jp-washroom-sinks']);program('supply-store',0,'delivery-supply-storage',73,['jp-district-supplies']);program('herb-growing',0,'herb-growing',252,['jp-district-herb-yard']);
 const facilities=[
  {kind:'shrine approach',name:'Sakura torii, embroidered omamori and a compact Inari shrine with paired fox messengers',location:'One compact shrine-approach courtyard flanking the torii',targetIds:['jp-arrival-torii','jp-courtyard-omamori','jp-courtyard-inari']},
  {kind:'entry/reception',name:'Grand arrival hall, keys and yukata reception',location:'Ground floor',targetIds:['jp-room-welcome','jp-district-arrival-gate']},
  {kind:'bathing',name:'Separate MEN and WOMEN onsen with screened changing and washing sequences',location:'Second floor only',targetIds:['jp-room-men-changing','jp-room-men-wash','jp-room-men-bath','jp-room-women-changing','jp-room-women-wash','jp-room-women-bath']},
  {kind:'washing/toilet',name:'Gender wet wash stations and enclosed public washhouse',location:'Second-floor wet areas; eastern ground washhouse',targetIds:['jp-room-men-wash','jp-room-women-wash','jp-washroom-private-1','jp-washroom-private-2','jp-washroom-private-3','jp-washroom-sinks']},
  {kind:'cooking',name:'One shared food kitchen',location:'Ground-floor rear support room',targetIds:['jp-room-food-prep']},
  {kind:'dining',name:'Conveyor sushi and dedicated ramen counter',location:'Ground-floor open foodhall',targetIds:['jp-room-sushi','jp-room-ramen']},
  {kind:'social-rest',name:'Large square-kotatsu gathering hall and library nook',location:'Third floor',targetIds:['jp-room-kotatsu-hall','jp-room-kotatsu-seat','jp-room-library']},
  {kind:'sleeping',name:'One guest suite and separate staff quarters',location:'Third-floor single guest suite; fourth-floor staff room',targetIds:['jp-room-guest-suite','jp-room-staff-quarters']},
  {kind:'storage/linen',name:'Dedicated linen folding and laundry',location:'Fourth-floor eastern workroom',targetIds:['jp-room-linen']},
  {kind:'bathhouse plant/service',name:'Operator office, apothecary and unique copper boiler controls',location:'Fourth floor',targetIds:['jp-room-operator','jp-room-apothecary','jp-room-boiler']},
  {kind:'gardens/rest',name:'Koi reflecting pond, sakura and quiet garden pavilion',location:'West garden and arrival path',targetIds:['jp-district-garden-pond','jp-district-garden-pavilion']},
  {kind:'supporting district',name:'Travel shop, supply receiving and herb growing',location:'East annex and rear yard',targetIds:['jp-district-market-room','jp-district-supplies','jp-district-herb-yard']},
  {kind:'service circulation',name:'Four-storey continuous stair gallery and district loop',location:'East stair gallery and outdoor service paths',targetIds:['jp-1-stair-south','jp-2-stair-north','jp-3-stair-south','jp-4-stair-north','jp-district-west-yard','jp-district-east-yard']}
 ];
 const interiorRooms=[
  {id:'food-prep',floor:1,bounds:[-12,6,-15,-10.55],doors:['jp-food-prep-door']},
  {id:'men-changing',floor:2,bounds:[-12,-1,.3,5.2],doors:['jp-men-noren','jp-men-wet-threshold']},
  {id:'women-changing',floor:2,bounds:[-1,7,.3,5.2],doors:['jp-women-noren','jp-women-wet-threshold']},
  {id:'men-wet',floor:2,bounds:[-12,-1,-15,.3],doors:['jp-men-wet-threshold']},
  {id:'women-wet',floor:2,bounds:[-1,5.8,-15,.3],doors:['jp-women-wet-threshold']},
  {id:'library',floor:3,bounds:[-12,-3,-15,-8],doors:['jp-library-open-nook']},
  {id:'guest-suite',floor:3,bounds:[-3,5.8,-15,-8],doors:['jp-guest-suite-door']},
  {id:'operator',floor:4,bounds:[-12,-1,1,9],doors:['jp-operator-door']},
  {id:'apothecary',floor:4,bounds:[-12,-1,-6,1],doors:['jp-apothecary-room-door']},
  {id:'staff-quarters',floor:4,bounds:[-12,-1,-15,-6],doors:['jp-staff-room-door']},
  {id:'laundry',floor:4,bounds:[2,12,.4,9],doors:['jp-laundry-door','jp-laundry-stair-foyer-door']}
 ];
 const circulation={revision:'R12',guestApproach:[[9.1,7.6,-11.4],[6.6,7.6,-11.4],[6.6,7.6,-7.15],[2,7.6,-7.15],[2,7.6,-8.9]],galleryClearBounds:{minX:5.92,maxX:7.34,minZ:-14.85,maxZ:-8.12},northLanding:{minX:7.4,maxX:10.8,minZ:-14.85,maxZ:-10},southLanding:{minX:7.4,maxX:10.8,minZ:-2,maxZ:.28},entryNorenClearHeight:2.20,movedFurniture:[{kind:'unmarked-linen-shelf',from:[11.15,11.4,-.2],to:[11.15,11.4,1.7]}]};
 for(const fg of floorGroups)pack(fg);for(const cg of ceilingGroups)pack(cg);packSpatial(roofGroup);packSpatial(district);
 const street=new THREE.Group();street.name='Arrival garden static';for(const child of [...group.children])if(child!==roofGroup&&child!==district&&!floorGroups.includes(child)&&!ceilingGroups.includes(child))street.add(child);group.add(street);pack(street);
 group.userData={architecture:'original-four-storey-copper-steam-lantern-bathhouse',revision:'R12-structural-circulation',referenceInspired:true,referenceAssetsReused:false,spatialBatchSize:12,roomVignetteCount:roomProgram.length,lotSize:[60,80],districtZones:5,defaultRoofVisible:true,interior:true,cameraMode:'close-third-person',ambientIntensity:.5,sunIntensity:1.5,floorCount:4,stairSlope:3.8/8,stairWidth:3.4,stairHeadroom:3.43,roomProgram,facilities,sakuraDetails,interiorRooms,circulation,antiFlicker:{terrainFoundationCutouts:true,duplicateCeilingSlabsRemoved:true,dynamicBranchesExcludedFromPacking:true},references:['https://www.sglynp.com/t170153','https://www.ghibli.jp/gallery/chihiro039.jpg','https://inari.jp/en/faq/','https://inari.jp/en/saijin/']};
 // Two quiet 1F front-window bays; reachable from the existing 2.5 m balcony.
 const weatherCharmPoints=[
  {id:'jp-weather-fair',kind:'fair',name:'晴天娃娃',position:[-5,0,9.14],approach:[-5,0,9.86],height:1.78},
  {id:'jp-weather-rain',kind:'rain',name:'幻想雨天挂偶',position:[5,0,9.14],approach:[5,0,9.86],height:1.78},
 ];
 const characterFloorSurfaces=floorGroups.flatMap(fg=>(fg.userData.characterMatSurfaces||[]).map(s=>({...s,baseY:fg.position.y,minX:s.minX+fg.position.x,maxX:s.maxX+fg.position.x,minZ:s.minZ+fg.position.z,maxZ:s.maxZ+fg.position.z})));
 return {group,performanceHall,additionalFurniture:performanceHall.additionalFurniture,weatherCharmPoints,colliders,characterFloorSurfaces,characterFootSurfaces,spawn:[0,0,37.5],stations,roofGroup,walkableSurfaces,cameraColliders,levels,ceilingGroups,floorGroups,explorationTargets,doorways,facilities,roomProgram,interiorRooms,circulation,bounds:LOT_BOUNDS,update(dt,time){for(const update of updates)update(dt,time);}};
}
