import {buildChinaPalace} from '/assets/china-palace.69504c7ec1a185bc.js';
import {registerNightFixture} from '/assets/night-lighting.41621174f39ac4d8.js';
import * as G from '/assets/geometry.accd26d9fe1820ba.js';
const {THREE} = G;

// All architecture, tilework, furniture and garden props are original procedural meshes.
const P={cedar:0x735344,cedarLight:0xad7953,rice:0xeee7cc,ink:0x354449,indigo:0x536b85,red:0xa84336,jade:0x578675,gold:0xc9a15c};
function solid(g,c,x,y,z,w,h,d,color,rot=0){G.box(g,x,y,z,w,h,d,color,rot);G.collider(c,x,z,w,d);}
function post(g,c,x,z,color=P.cedar,h=3.5,r=.12){G.cyl(g,x,h/2,z,r,r,h,color,8);if(c)G.collider(c,x,z,r*2,r*2);}
function beam(g,a,b,r,color){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),D=B.clone().sub(A);const m=G.mesh(g,new THREE.CylinderGeometry(r,r,D.length(),7),color);m.position.copy(A.add(B).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),D.normalize());return m;}
function panel(g,c,x,z,w,h=2.1,axis='x',paper=P.rice,wood=P.cedar){const q=new THREE.Group();q.position.set(x,.12,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);G.box(q,0,h/2,0,w,h,.085,paper);for(const xx of [-w/2,w/2])G.box(q,xx,h/2,0,.085,h,.13,wood);for(let yy=.15;yy<h;yy+=.48)G.box(q,0,yy,-.055,w,.035,.035,wood);for(let xx=-w/2+.35;xx<w/2;xx+=.38)G.box(q,xx,h/2,-.06,.035,h,.035,wood);G.box(q,0,h,0,w+.1,.095,.13,wood);G.collider(c,x,z,axis==='x'?w:.13,axis==='x'?.13:w);return q;}
function lattice(g,c,x,z,w,h=1.75,axis='x',wood=P.red){const q=new THREE.Group();q.position.set(x,.12,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);G.box(q,0,.25,0,w,.5,.12,wood);for(const xx of [-w/2,w/2])G.box(q,xx,h/2,0,.1,h,.15,wood);for(const yy of [.5,h])G.box(q,0,yy,0,w,.1,.15,wood);for(let xx=-w/2+.15;xx<w/2-.1;xx+=.42){G.box(q,xx,(h+.5)/2,0,.045,h-.5,.06,wood);for(let yy=.76;yy<h-.1;yy+=.44){const m=G.box(q,xx,yy,0,.29,.29,.055,wood);m.rotation.z=Math.PI/4;G.box(q,xx,yy,-.02,.17,.17,.065,0xe3b976).rotation.z=Math.PI/4;}}G.collider(c,x,z,axis==='x'?w:.15,axis==='x'?.15:w);return q;}
function curvedRoof(g,x,y,z,w,d,color,asian='japan',scale=1){
 const rise=(asian==='china'?2.05:2.45)*scale;const eave=asian==='china'?.65:.35;
 const sh=new THREE.Shape();sh.moveTo(-w/2,eave);sh.lineTo(-w*.44,.06);sh.quadraticCurveTo(-w*.2,.48,0,rise);sh.quadraticCurveTo(w*.2,.48,w*.44,.06);sh.lineTo(w/2,eave);sh.lineTo(w/2,eave-.15);sh.lineTo(w*.44,-.1);sh.quadraticCurveTo(w*.2,.28,0,rise-.18);sh.quadraticCurveTo(-w*.2,.28,-w*.44,-.1);sh.lineTo(-w/2,eave-.15);sh.closePath();
 G.mesh(g,new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false,curveSegments:10}),color,x,y,z-d/2);
 // Small ribs read as individual glazed or fired tile courses.
 for(let zz=-d/2+.12;zz<d/2;zz+=.48){const pts=[];for(let i=0;i<=20;i++){const t=i/20,xx=-w/2+w*t,u=Math.abs(xx)/(w/2);let yy=rise*Math.pow(1-u,1.48);if(u>.88)yy=.06+(u-.88)/.12*eave;pts.push([x+xx,y+yy+.05,z+zz]);}for(let i=0;i<pts.length-1;i++)beam(g,pts[i],pts[i+1],.037,asian==='china'?0x577774:0x65717b);}
 beam(g,[x,y+rise+.08,z-d/2-.2],[x,y+rise+.08,z+d/2+.2],.15,asian==='china'?0x628b7d:0x647279);
 for(const zz of [-d/2,d/2]){beam(g,[x,y+rise+.1,z+zz],[x,y+rise+.45,z+zz+Math.sign(zz)*.3],.11,color);G.sphere(g,x,y+rise+.4,z+zz+Math.sign(zz)*.3,.13,asian==='china'?P.gold:color);}
}
function teaSet(g,x,y,z,color=P.jade){G.cyl(g,x,y+.14,z,.19,.24,.28,color);G.cyl(g,x,y+.3,z,.13,.13,.07,color);G.sphere(g,x,y+.36,z,.055,color);beam(g,[x+.17,y+.12,z],[x+.4,y+.27,z],.06,color);G.torus(g,x-.23,y+.17,z,.15,.04,color,0);for(const [dx,dz] of [[-.5,.25],[.5,.3],[.03,-.4]]){G.cyl(g,x+dx,y+.075,z+dz,.115,.085,.15,0xf0e7ca);G.cyl(g,x+dx,y+.155,z+dz,.083,.083,.009,0x6c714d);}}
function bowl(g,x,y,z,color=0xf0e7cd,s=.25,fill=0xf4e8d6){G.sphere(g,x,y+s*.33,z,s,color,1,.65,1);G.cyl(g,x,y+s*.55,z,s*.9,s*.9,.035,fill);}
function scroll(g,x,y,z,w,h,china=false){G.box(g,x,y,z,w,h,.055,0xe8d9ad);for(const yy of [-h/2,h/2]){const m=G.cyl(g,x,y+yy,z,.055,.055,w+.16,P.cedar,8);m.rotation.z=Math.PI/2;}if(china){for(let row=0;row<4;row++){const yy=y+h*.3-row*h*.2;for(const [dx,dy,ww,hh,rot] of [[-.04,0,.36,.025,.1],[-.08,-.12,.025,.3,-.3],[.1,.08,.025,.26,.2],[.09,-.11,.2,.024,-.35]]){const m=G.box(g,x+dx,yy+dy,z-.04,ww,hh,.012,0x313c38);m.rotation.z=rot;}}}else{G.sphere(g,x,y+.1,z-.045,.33,0xbd817d,1,1,.03);for(let i=0;i<4;i++){const m=G.box(g,x-.16+i*.1,y-.24+i*.05,z-.055,.035,.6-i*.08,.015,0x586b5f);m.rotation.z=-.3+i*.17;}}}
function lantern(g,c,x,z,color=0xda6750,h=2.7,s=.42){post(g,c,x,z,P.cedar,h,.065);G.box(g,x+.28,h,z,.65,.07,.075,P.cedar);G.cyl(g,x+.55,h-.19,z,.025,.025,.37,P.cedar,6);G.mesh(g,new THREE.SphereGeometry(s,12,8),color,x+.55,h-.68,z,{emissive:0xffa04f,emissiveIntensity:.42}).scale.set(1,1.15,1);registerNightFixture(g,x+.55,h-.68,z,{kind:'garden-lantern',intensity:22,distance:9});for(const yy of [h-1.1,h-.27])G.cyl(g,x+.55,yy,z,.24,.24,.07,P.gold);G.cyl(g,x+.55,h-1.25,z,.025,.025,.25,P.gold,6);}
function stone(g,x,z,s=1){return G.sphere(g,x,.18*s,z,.6*s,0xa3a59a,1,.36,.75);}
function bamboo(g,c,x,z,s=1){G.cyl(g,x,.19,z,.4,.32,.38,0x807b62);G.collider(c,x,z,.8,.8);for(let i=0;i<5;i++){const dx=Math.sin(i*2.4)*.25,dz=Math.cos(i*2.4)*.25,hh=(1.8+i*.16)*s;G.cyl(g,x+dx,hh/2,z+dz,.034,.05,hh,0x71935f,6);for(let j=.35;j<hh;j+=.36)G.cyl(g,x+dx,j,z+dz,.052,.052,.045,0xb1bf7e,6);for(let j=0;j<3;j++){const leaf=G.sphere(g,x+dx+.2*(j-1),hh-.25*j,z+dz,.25,0x698a58,.35,.32,1.5);leaf.rotation.y=i+j;}}}
function boundary(g,c,color){for(const x of [-14.5,14.5]){G.box(g,x,.53,0,.28,1.04,39,color);G.collider(c,x,0,.28,39);}G.box(g,0,.7,-19.5,29,1.4,.3,color);G.collider(c,0,-19.5,29,.3);for(const x of [-8.9,8.9]){G.box(g,x,.62,19.5,11.2,1.25,.3,color);G.collider(c,x,19.5,11.2,.3);}}
function tatami(g,x,z,w,d){G.box(g,x,.24,z,w,.15,d,0xb3b982);for(let xx=x-w/2+.04;xx<x+w/2;xx+=1.8){G.box(g,xx,.325,z,.065,.025,d,0x587566);for(let zz=z-d/2+.1;zz<z+d/2;zz+=.16)G.box(g,xx+.87,.325,zz,Math.min(1.72,w),.014,.022,0x9fab77);}for(const zz of [-d/2,d/2])G.box(g,x,.33,z+zz,w,.03,.08,0x587566);}
function koi(g,x,z,color=0xd9864e,rot=0){const q=new THREE.Group();q.position.set(x,.213,z);q.rotation.y=rot;g.add(q);G.sphere(q,0,0,0,.22,color,.6,.17,1.55);G.sphere(q,0,.013,.12,.105,0xf5e7cf,.85,.18,1);const t=G.cone(q,0,0,-.35,.15,.23,color,3);t.rotation.x=Math.PI/2;}
function cherry(g,c,x,z,s=1){post(g,c,x,z,0x765a56,3*s,.21*s);for(const [dx,dy,dz] of [[-1.4,3.4,.2],[1.2,3.8,.3],[.3,4.1,-.7]]){beam(g,[x,1.8*s,z],[x+dx*s,dy*s,z+dz*s],.105*s,0x765a56);G.sphere(g,x+dx*s,dy*s,z+dz*s,1.15*s,0xe5a9b0,1,.7,1);G.sphere(g,x+dx*s+.2,dy*s+.3,z+dz*s, .9*s,0xf0c0c4,1,.65,1);}for(let i=0;i<17;i++){const a=i*2.4,r=.4+(i%5)*.42;G.sphere(g,x+Math.cos(a)*r,.08,z+Math.sin(a)*r,.055,0xebbbc4,1,.2,.75);}}

// Architecture is composed from independent wings, never a reskinned shared box.
// Inspiration: Kyoto's timber shop/house and through-passage; Suzhou's linked courts,
// framed garden views and pavilions. These are original stylized compositions.
function rearWall(g,c,x,z,w,wood,plaster,h=3.55){
 solid(g,c,x,h/2,z,w,h,.24,plaster);
 for(const yy of [.32,h-.16])G.box(g,x,yy,z+.15,w,.12,.16,wood);
 for(let xx=x-w/2+.1;xx<x+w/2;xx+=2.7)G.box(g,xx,h/2,z+.17,.1,h,.14,wood);
}
function sideWall(g,c,x,z,d,wood,plaster,h=.95){
 solid(g,c,x,h/2,z,.25,h,d,plaster);G.box(g,x,h+.04,z,.33,.12,d+.1,wood);
 for(let zz=z-d/2+.35;zz<z+d/2;zz+=2.8){post(g,null,x,zz,wood,3.25,.075);G.box(g,x,1.13,zz,.36,.18,.42,wood);}
}
function shedRoof(g,x,y,z,w,d,color,tilt=.12){
 const q=new THREE.Group();g.add(q);q.position.set(x,y,z);q.rotation.x=tilt;
 G.box(q,0,0,0,w,.17,d,color);for(let xx=-w/2+.16;xx<w/2;xx+=.4)G.box(q,xx,.12,0,.075,.11,d+.06,0x617475);
 for(const zz of [-d/2,d/2])G.box(q,0,-.035,zz,w+.2,.2,.16,0x465654);return q;
}
// Broad hipped ceremonial roofs use a long ridge, curved golden tile slopes,
// raised corners and paired ridge ornaments, distinct from the machiya gables.
function palaceRoof(g,x,y,z,w,d,rise=1.9,color=0xb58b43){
 const hw=w/2,hd=d/2,ridge=w*.23;
 const height=(xx,zz)=>{const u=Math.max(Math.abs(zz)/hd,Math.max(0,(Math.abs(xx)-ridge)/(hw-ridge)));return rise*Math.pow(Math.max(0,1-u),1.4)+(u>.84?Math.pow((u-.84)/.16,1.6)*.37:0);};
 const verts=[],indices=[],nx=30,nz=18;
 for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){const xx=-hw+w*ix/nx,zz=-hd+d*iz/nz;verts.push(x+xx,y+height(xx,zz),z+zz);}
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const a=iz*(nx+1)+ix,b=a+1,c=a+nx+1,e=c+1;indices.push(a,c,b,b,c,e);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();G.mesh(g,geo,color,0,0,0,{side:THREE.DoubleSide});
 for(let xx=-hw+.2;xx<hw;xx+=.52){let prev=null;for(let i=0;i<=16;i++){const zz=-hd+d*i/16,p=[x+xx,y+height(xx,zz)+.055,z+zz];if(prev)beam(g,prev,p,.045,0xd5ad5b);prev=p;}}
 for(const zz of [-hd,hd]){G.box(g,x,y+.24,z+zz,w,.17,.17,0x8f642e);for(let xx=-hw+.26;xx<hw;xx+=.52)G.sphere(g,x+xx,y+.32,z+zz,.09,0xe0bd70,1,1,.7);}
 beam(g,[x-ridge,y+rise+.06,z],[x+ridge,y+rise+.06,z],.14,0xddb967);
 for(const side of [-1,1]){beam(g,[x+side*ridge,y+rise,z],[x+side*(ridge+.22),y+rise+.52,z],.125,0xc89949);G.sphere(g,x+side*(ridge+.2),y+rise+.58,z,.21,0xddb568,.7,1.2,.7);}
 for(const sx of [-1,1])for(const sz of [-1,1]){beam(g,[x+sx*(hw-.8),y+.18,z+sz*(hd-.5)],[x+sx*hw,y+.63,z+sz*hd],.09,0xd4a653);G.sphere(g,x+sx*hw,y+.68,z+sz*hd,.14,0xdebb71);}
}
function stoneBalustrade(g,c,x,z,w,axis='x'){
 const q=new THREE.Group();q.position.set(x,0,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);
 G.box(q,0,.27,0,w,.23,.36,0xc9c6b0);G.box(q,0,1.07,0,w,.13,.24,0xe5dcc1);
 for(let xx=-w/2;xx<=w/2+.03;xx+=w/Math.ceil(w/.82)){G.box(q,xx,.7,0,.16,.95,.19,0xc9c5ac);G.sphere(q,xx,1.24,0,.13,0xe1d8bd);}
 G.collider(c,x,z,axis==='x'?w:.3,axis==='x'?.3:w);return q;
}
function timberWindow(g,x,y,z,w,h,wood=P.cedar,curtain=0xc9c4a4,axis='x'){
 const q=new THREE.Group();q.position.set(x,y,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);
 G.box(q,0,0,0,w,h,.08,0xc7d4c5);for(const yy of [-h/2,h/2])G.box(q,0,yy,-.08,w+.15,.1,.11,wood);
 for(const xx of [-w/2,w/2,0])G.box(q,xx,0,-.09,.075,h,.12,wood);
 for(const xx of [-w*.4,w*.4]){G.box(q,xx,.05,-.15,w*.18,h-.06,.075,curtain);for(let j=0;j<3;j++)G.box(q,xx+(j-1)*w*.045,.05,-.205,.018,h-.06,.015,0xa6a890);}
 return q;
}
function openShelf(g,c,x,z,w,h,d,wood=P.cedar,rotation=0){
 const q=new THREE.Group();q.position.set(x,0,z);q.rotation.y=rotation;g.add(q);
 for(const xx of [-w/2,w/2])G.box(q,xx,h/2,0,.09,h,d,wood);
 G.box(q,0,h/2,-d/2,w,h,.07,0x4f4940);
 for(const yy of [.25,.85,1.45,h])G.box(q,0,yy,0,w,.085,d,wood);
 G.collider(c,x,z,rotation?d:w,rotation?w:d);return q;
}
function foldedCloth(g,x,y,z,w,d,color){
 for(let j=0;j<3;j++){G.box(g,x,y+j*.075,z,w,.065,d,j===1?0xd2c2a0:color);G.box(g,x+w*.35,y+.035+j*.075,z,.04,.012,d,0xe7d8b7);}
}
function boundBook(g,x,y,z,w,d,color){G.box(g,x,y,z,w,.095,d,color);G.box(g,x,y+.015,z+.025,w-.08,.045,d+.015,0xe1d4b4);for(const dx of [-w*.3,w*.3])G.box(g,x+dx,y+.055,z-d*.3,.025,.015,d*.25,0xe6d4a5);}
function flowerBranches(g,x,y,z,color=0xdda49e){
 G.vessel(g,x,y,z,0x8ea299,.55);for(let i=0;i<5;i++){const dx=(i-2)*.15,hh=.85+Math.sin(i*2)*.18;beam(g,[x,y+.35,z],[x+dx,y+hh,z+.08*Math.cos(i)],.014,0x6c7d55);G.sphere(g,x+dx,y+hh,z+.08*Math.cos(i),.09,color);}
}

// Batch static meshes by material so all the tiny tiles and lattice bars stay inexpensive.
// Roofs are deliberately batched separately to preserve the engine's cutaway toggle.
function packStatic(root,skip=null){
  root.updateMatrixWorld(true);
  const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),meshes=[],lines=[];
  const visit=n=>{if(n===skip)return;if(n.isMesh)meshes.push(n);else if(n.isLine)lines.push(n);for(const child of n.children)visit(child);};visit(root);
  const buckets=new Map();
  for(const m of meshes){
    // Color is a vertex attribute, so the original exact palette survives while
    // identically configured toon materials share a single draw call.
    const mat=m.material,key=JSON.stringify([mat.type,mat.opacity,mat.transparent,mat.side,mat.blending,mat.depthWrite,mat.depthTest,mat.alphaTest,mat.wireframe,mat.flatShading,mat.fog,mat.emissive?.getHex(),mat.emissiveIntensity,mat.gradientMap?.uuid,mat.map?.uuid,mat.alphaMap?.uuid,mat.normalMap?.uuid]);let b=buckets.get(key);
    if(!b){const material=mat.clone();material.color.set(0xffffff);material.vertexColors=true;b={material,parts:[],size:0};buckets.set(key,b);}
    let geo=m.geometry.clone();geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));
    if(geo.index){const unindexed=geo.toNonIndexed();geo.dispose();geo=unindexed;}
    if(!geo.attributes.normal)geo.computeVertexNormals();
    const count=geo.attributes.position.count,colors=new Float32Array(count*3),old=geo.attributes.color;
    for(let i=0;i<count;i++){colors[i*3]=mat.color.r*(old?old.getX(i):1);colors[i*3+1]=mat.color.g*(old?old.getY(i):1);colors[i*3+2]=mat.color.b*(old?old.getZ(i):1);}
    geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    b.parts.push(geo);b.size+=count;
  }
  for(const m of meshes){m.parent.remove(m);m.geometry.dispose();}
  for(const b of buckets.values()){
    const position=new Float32Array(b.size*3),normal=new Float32Array(b.size*3),color=new Float32Array(b.size*3),uv=new Float32Array(b.size*2);let offset=0;
    for(const geo of b.parts){const count=geo.attributes.position.count;position.set(geo.attributes.position.array,offset*3);normal.set(geo.attributes.normal.array,offset*3);color.set(geo.attributes.color.array,offset*3);if(geo.attributes.uv)uv.set(geo.attributes.uv.array,offset*2);offset+=count;geo.dispose();}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normal,3));geometry.setAttribute('color',new THREE.BufferAttribute(color,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,b.material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  // All palm ribs share one thin-line style; batch them without drawing joins
  // between unrelated fronds.
  const lineBuckets=new Map();
  for(const line of lines){
    const key=[line.material.color.getHex(),line.material.opacity].join(':');let b=lineBuckets.get(key);if(!b){b={material:line.material,positions:[]};lineBuckets.set(key,b);}
    const geo=line.geometry.clone();geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,line.matrixWorld));const a=geo.attributes.position;
    for(let i=0;i<a.count-1;i++)b.positions.push(a.getX(i),a.getY(i),a.getZ(i),a.getX(i+1),a.getY(i+1),a.getZ(i+1));
    geo.dispose();line.parent.remove(line);line.geometry.dispose();
  }
  for(const b of lineBuckets.values()){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geo.computeBoundingSphere();root.add(new THREE.LineSegments(geo,b.material));}
}
function packLot(group,roof){packStatic(roof);packStatic(group,roof);}

export function buildJapan(){
 const group=new THREE.Group(),roofGroup=new THREE.Group(),colliders=[];group.name='Japan — Komorebi House';roofGroup.name='Japan roof';group.add(roofGroup);const c=colliders;
 G.baseLot(group,0x91ad87,0xc5b998);boundary(group,c,0xc0b69b);
 // A long west timber house, detached atelier, rear kitchen and open tsuboniwa.
 // The lower stone through-passage stays clear from the front door to the rear rooms.
 G.box(group,-5.8,.1,-5,9.2,.2,17,0xb78963);G.box(group,5.65,.1,-9.65,9.6,.2,7.7,0xa88860);
 G.box(group,5.65,.1,.25,9.6,.2,6,0xb78963);G.box(group,0,.045,-4.8,2.5,.09,17.5,0xb9b19a);
 for(let z=-12.8;z<4;z+=1.05)G.box(group,0,.1,z,2.1,.025,.94,0xc8bda2);
 rearWall(group,c,0,-13.35,21,P.cedar,0xe7e1c8);sideWall(group,c,-10.35,-5,17,P.cedar,0xe7e1c8);
 sideWall(group,c,10.35,-9.65,7.7,P.cedar,0xe7e1c8);sideWall(group,c,10.35,.25,6,P.cedar,0xe7e1c8);
 G.box(group,-5.5,.16,3.6,10.2,.28,2.2,0x997451);G.box(group,5.65,.16,3.6,9.6,.28,1.6,0x997451);
 for(let x=-10.5;x<10.5;x+=.42)if(x<-1.1||x>1.1)G.box(group,x,.31,3.6,.035,.018,1.55,0x735b45);G.box(group,0,.1,5,4.5,.2,.75,0xc7b395);
 // Four washitsu suites have distinct mat orientation, thresholds and sliding screens.
 tatami(group,-8,-9.85,3.8,5.5);tatami(group,-3.85,-9.85,3.55,5.5);tatami(group,-5.7,-2.2,8.4,8.25);tatami(group,5.4,.4,8.7,4.9);
 panel(group,c,-6.1,-10.0,5.55,1.95,'z');panel(group,c,-8.7,2.3,1.8,1.65);panel(group,c,-2.9,2.3,1.15,1.65);
 for(const x of [-9.1,-3.6])G.box(group,x,2.68,2.3,1.7,.18,.12,P.cedar);
 G.box(group,-4.42,.38,-12.2,2.15,.28,.7,0x8d684b);scroll(group,-4.4,2.07,-13.08,.92,1.3);flowerBranches(group,-4.85,.57,-12.18,0xe2c487);
G.rug(group,5.3,-9.15,8.6,6.5,0x94755a,0xd2b894);
 // A small open-air court interrupts the east wing rather than decorating a room.
 G.box(group,6,.035,-4.35,8.55,.07,2.65,0xb7bba2);for(let i=0;i<5;i++)G.box(group,2.1+i*.82,.1,-4.25+Math.sin(i*.7)*.35,.67,.08,.74,0xc9c5af);
 G.sphere(group,8.5,.12,-4.15,.85,0x7c936b,1.5,.22,.9);stone(group,8.85,-4.15,.7);G.collider(c,8.8,-4.15,1.25,.9);
 G.cyl(group,6.65,.32,-4.55,.51,.43,.58,0x899288,10);G.cyl(group,6.65,.63,-4.55,.36,.36,.025,0x6e9b9b,16);G.collider(c,6.65,-4.55,1,1);
 beam(group,[6.15,.73,-4.45],[7.05,.76,-4.6],.045,0xaf976a);G.cyl(group,7.05,.83,-4.6,.13,.13,.19,0xbaab79,8);
 for(const x of [2.4,9.9])post(group,c,x,-2.6,P.cedar,2.9,.085);G.box(group,6.15,2.95,-2.6,7.8,.14,.16,P.cedar);
 timberWindow(group,-10.14,2.02,-3.9,2.6,1.65,P.cedar,0xc5b797,'z');timberWindow(group,10.15,2.05,.5,2.6,1.55,P.cedar,0xb5bca6,'z');
 for(const x of [-10.05,-5,0,5,10.05])post(group,c,x,-12.95,P.cedar,3.7,.11);for(const x of [-10.05,10.05])post(group,c,x,3.15,P.cedar,3.4,.13);
 // Rear shoji and movable interior screens leave a generous cross-hall.
 for(const x of [-8.65,-5.85,5.85,8.65])panel(group,c,x,-12.98,2.62,3.08);
 panel(group,c,-1.8,-10.15,5.45,1.65,'z');panel(group,c,-1.8,-1.05,6.25,1.4,'z');
 panel(group,c,-6,-6.95,5.8,1.35);panel(group,c,7.85,-5.7,4.05,1.2);
 G.box(group,0,3.6,-12.9,20.6,.18,.28,P.cedar);for(const x of [-10.2,10.2])G.box(group,x,3.42,-4.8,.22,.22,16.7,P.cedar);
 // A tokonoma alcove with hanging artwork, ikebana and a polished display step.
 solid(group,c,-6.8,.36,-12.12,4.5,.34,1.1,0x7f5d44);scroll(group,-6.8,2.1,-13.12,1.25,1.5);G.vessel(group,-8.05,.54,-12.05,0x8ba0a0,.8);for(let i=0;i<4;i++){beam(group,[-8.05,1,-12.05],[-8.25+i*.15,1.95+Math.sin(i)*.12,-12.03],.017,0x70895b);G.sphere(group,-8.25+i*.15,1.95+Math.sin(i)*.12,-12.03,.105,0xe5a2a8);}
 // Dark botanical panels give the guest suite a quiet focal wall beyond the shoji.
 G.box(group,-8.2,1.94,-12.54,1.75,1.38,.09,0x46594e);for(const yy of [1.24,2.65])G.box(group,-8.2,yy,-12.47,1.86,.085,.06,0x9d8354);
 for(let i=0;i<5;i++){const xx=-8.65+i*.23,yy=1.5+Math.sin(i*1.7)*.3;beam(group,[xx,1.4,-12.46],[xx+.1,yy+.65,-12.45],.015,0xb8b895);G.sphere(group,xx+.1,yy+.65,-12.4,.14,0xdfbbba,1,.78,.18);}
 // Futons sit low, with folded blankets, pillows and a small tansu chest.
 for(const x of [-8.2,-4.5]){solid(group,c,x,.36,-9.6,2.1,.16,3.1,0xe9dfca);G.box(group,x,.48,-9.07,2.06,.2,1.95,0x748a9b);for(const dz of [-.7,0,.7])G.box(group,x,.59,-9.1+dz,2.06,.025,.045,0xa7b3b7);G.box(group,x,.54,-10.65,1.28,.27,.53,0xf3ebd7);}
 solid(group,c,-9.15,.77,-7.8,1.1,1.2,.9,0x9c714d);for(const yy of [.43,.76,1.08]){G.box(group,-9.15,yy,-7.33,.93,.025,.025,0x503f37);G.torus(group,-9.15,yy+.06,-7.3,.07,.015,0x343e3d,0);}
 // Tea room: lacquer table, kettle, cups and zabuton floor seating.
 G.table(group,-5.85,-2.6,3.1,2.1,0x77523e,.61);G.collider(c,-5.85,-2.6,3.1,2.1);G.box(group,-5.85,.705,-2.6,1.75,.035,.9,0xa2815a);teaSet(group,-5.85,.73,-2.6,0x486f60);bowl(group,-4.95,.74,-1.88,0x486f60,.18,0x779455);
 for(const [x,z] of [[-5.85,-4.2],[-5.85,-.9],[-8.1,-2.6],[-3.6,-2.6]]){G.cushion(group,x,z,0x7f8c9b,.85);G.collider(c,x,z,.7,.7);}
 G.lamp(group,-9.2,.9,-.15,0xf2ddae,.35);G.collider(c,-9.2,-.15,.7,.7);G.plant(group,-8.9,1.6,0x647e5a,.9);G.collider(c,-8.9,1.6,.7,.7);
 // 手作寿司 and a serving island. Countertop ceramics and food are distinct meshes.
 solid(group,c,5.45,.79,-11.45,8.55,1.35,1.65,0xa57c55);G.box(group,5.45,1.51,-11.45,8.65,.13,1.74,0xd4c5a1);
 for(const x of [2.5,4.7,6.9,9.05]){G.box(group,x,.78,-10.6,1.92,1.1,.05,0xb78e64);G.box(group,x,1.04,-10.55,.4,.055,.055,P.cedar);}
 G.box(group,3.2,1.59,-11.4,1.55,.055,1.05,0x545e5d);G.box(group,3.2,1.62,-11.4,1.2,.05,.78,0x95a6a0);beam(group,[3.75,1.63,-11.7],[3.75,2.06,-11.7],.04,0x7f9294);beam(group,[3.75,2.06,-11.7],[3.45,2.06,-11.7],.04,0x7f9294);
 G.cyl(group,8.5,1.62,-11.4,.45,.45,.06,0x434647);G.cyl(group,8.5,1.82,-11.4,.32,.38,.35,0x576e70);G.cyl(group,8.5,2.03,-11.4,.35,.35,.07,0x576e70);G.sphere(group,8.5,2.1,-11.4,.065,P.cedar);
 for(let i=0;i<3;i++)G.vessel(group,5.3+i*.55,1.58,-11.7,[0xd3c7a6,0x798879,0xbba882][i],.55);
 G.table(group,5.7,-8.3,4.1,1.3,0x755340,1.04);G.collider(c,5.7,-8.3,4.1,1.3);G.box(group,5.7,1.14,-8.3,3.55,.08,.92,0xd8bd86);
 for(let i=0;i<7;i++){const xx=4.33+i*.45;G.box(group,xx,1.24,-8.28,.31,.14,.3,0xf3eedc);G.box(group,xx,1.34,-8.28,.33,.07,.32,i%2?0xe58f78:0x9eac70);if(i%3===0)G.box(group,xx,1.32,-8.28,.08,.16,.34,0x394c3a);}bowl(group,7.5,1.2,-8.08,0x91a4a2,.18,0x80a45c);
 // A compact writing/flower room facing the garden.
 G.table(group,6.1,.15,3.1,1.65,0x926b4e,.65);G.collider(c,6.1,.15,3.1,1.65);G.box(group,5.8,.76,.15,1.25,.025,.72,0xefe3c8);beam(group,[5.4,.8,-.1],[6.15,.8,.3],.017,0x354449);G.vessel(group,7.5,.74,.04,0x6e8d7b,.8);G.sphere(group,7.5,1.6,.05,.3,0xe6b4b1,.7,.8,.7);G.cushion(group,6.1,1.55,0xb98475,.85);G.collider(c,6.1,1.55,.7,.7);scroll(group,1.15,2.1,-13.13,1.2,1.65);
 // Independent heights and offsets make the stepped roofline readable from the globe camera.
 curvedRoof(roofGroup,-5.65,3.65,-5,11.65,18.5,0x46545b,'japan',.82);
 curvedRoof(roofGroup,5.65,3.25,-10.15,11.4,8.25,0x526166,'japan',.65);
 curvedRoof(roofGroup,5.65,3.05,.55,11.25,6.8,0x526166,'japan',.58);
 shedRoof(roofGroup,-5.65,2.96,4.08,11.6,2.65,0x46545b,.13);
 shedRoof(roofGroup,11.65,2.7,-8.9,2.8,9.7,0x596966,.04);
 // Narrow service wing: weatherboard wall, rice jars and a neatly stacked wood rack.
 G.box(group,11.7,.1,-8.9,2.25,.2,9.1,0xaaa58b);sideWall(group,c,12.95,-8.9,9.1,P.cedar,0xd6d0b5,.8);
 for(const z of [-12.85,-5.05])post(group,c,12.8,z,P.cedar,2.7,.095);
 for(let z=-12.5;z<-5;z+=.42)G.box(group,13.12,1.33,z,.05,.8,.07,0x8e7557);
 G.vessel(group,11.75,.18,-11.6,0xa58c65,1.3);G.vessel(group,11.75,.18,-10.55,0x7d8972,.9);G.collider(c,11.75,-11.2,.85,1.8);
 // A shop-facing front counter, exposed joinery and rolled bamboo blinds.
 solid(group,c,-6.9,.56,3.47,4.35,.79,.65,0x8e6447);G.box(group,-6.9,1,3.47,4.55,.12,.78,0xba9465);
 for(const x of [-9.6,-2.35])post(group,c,x,4.24,P.cedar,3.05,.095);G.box(group,-5.97,2.88,4.24,7.55,.15,.18,P.cedar);
 for(const x of [-8.6,-3.2]){const blind=G.cyl(group,x,2.55,4.23,.13,.13,1.45,0xb7a174,8);blind.rotation.z=Math.PI/2;for(let i=0;i<5;i++)G.box(group,x,2.5-i*.055,4.27,1.42,.035,.025,0xc2b184);}
 for(let i=0;i<3;i++){G.vessel(group,-8.2+i*.55,1.07,3.42,[0x708778,0xbfb396,0x9d795c][i],.52);G.box(group,-8.2+i*.55,1.38,3.64,.13,.15,.012,0xe4d9b6);}
 foldedCloth(group,-5.75,1.1,3.48,1.12,.45,0x697f8c);bowl(group,-7.25,1.08,3.58,0xc5d2c2,.17,0x79936b);
 // Storage belongs to its room: tea jars, textiles, books and flower vessels.
 const teaShelf=openShelf(group,c,-9.65,-4.63,1.9,2.1,.52,P.cedar,Math.PI/2);
 for(const x of [-.56,0,.56]){G.vessel(teaShelf,x,.89,0,0x779387,.48);G.cyl(teaShelf,x,1.76,0,.14,.14,.45,0xb7a17e,10);G.box(teaShelf,x,1.77,.15,.14,.15,.02,0xe5d6b0);}
 foldedCloth(group,-9.15,1.43,-7.8,.86,.7,0x80909d);
 const atelierShelf=openShelf(group,c,9.6,.1,2.3,2.05,.5,0x8f7255,Math.PI/2);
 for(let i=0;i<3;i++){boundBook(atelierShelf,-.65,1.54+i*.085,0,.55,.37,[0x788d81,0xb88d6c,0x8b7991][i]);G.vessel(atelierShelf,.6,.89,0,0xc0be9e,.55);}
 flowerBranches(atelierShelf,0,1.49,0);foldedCloth(atelierShelf,0,.31,0,1.2,.38,0x718794);
 G.box(group,6.15,2.55,-13.05,3.05,.11,.35,P.cedar);for(let i=0;i<5;i++){const xx=4.96+i*.57;G.cyl(group,xx,2.68,-12.96,.16,.16,.22,[0xadbead,0x90a0a0,0xccb998][i%3]);beam(group,[xx,2.48,-12.85],[xx,2.14,-12.85],.025,0x685847);if(i%2===0)G.sphere(group,xx,2.04,-12.85,.12,0xb0a681,.72,1,.2);}
 for(const z of [-8.4,-11.65]){G.box(group,-10.09,1.95,z,.1,.18,1.05,P.cedar);G.box(group,-10.02,2.02,z,.05,.78,.07,P.cedar);}

 // Entrance noren, high enough to walk under.
 for(const x of [-.62,.62])G.box(group,x,2.45,3.1,1.12,1.05,.04,0x647c8c);G.box(group,0,3.03,3.1,3.3,.08,.1,P.cedar);
 // Rounded koi pond, stone edge, lantern and a winding step path.
 G.sphere(group,-7.1,-.04,10.65,1,0x737d76,4.05,.16,3.05);G.sphere(group,-7.1,.15,10.65,1,0x79a9aa,3.65,.045,2.65);G.collider(c,-7.1,10.65,7.2,5.2);
 for(let i=0;i<18;i++){const a=i*Math.PI*2/18;stone(group,-7.1+Math.cos(a)*3.95,10.65+Math.sin(a)*2.97,.72+(i%3)*.1);}for(const [x,z,r] of [[-8,10,.4],[-6.5,11.7,1.8],[-8.8,11.3,3.1],[-5.9,9.4,.8]])koi(group,x,z,0xd9864e,r);
 for(let i=0;i<4;i++){const a=i*1.9;G.cyl(group,-8.2+Math.sin(a)*.7,.212,9.35+Math.cos(a)*.45,.26,.26,.025,0x6c9571,12);}G.sphere(group,-8.5,.27,9.4,.15,0xe6baa7,1,.45,1);
 for(const [x,z] of [[-1.7,7.1],[-2.6,8.1],[-2.65,9.4],[-2.3,10.75],[-1.3,11.9],[0,12.6],[.55,14]])stone(group,x,z,1.05);
 // Layered planting defines a real garden room around the pond and veranda.
 // Beds stay out of both the route to the koi keeper and the entry promenade.
 for(const [x,z,w,d] of [[9.55,12.95,4.6,4.25],[11.65,7.15,2.9,3.3],[-11.65,12.6,2.5,3.2],[-8.8,16.85,3.7,1.3]]){
  G.sphere(group,x,.015,z,1,0x849879,w/2,.06,d/2);
  for(let i=0;i<4;i++){const a=i*2.3,xx=x+Math.sin(a)*w*.24,zz=z+Math.cos(a)*d*.24;G.sphere(group,xx,.43+(i%2)*.12,zz,.72,0x789065,1.05,.7,1);G.sphere(group,xx+.17,.69+(i%2)*.1,zz,.48,0x9caf79,1,.5,1);}
 }
 for(const [x,z] of [[4.05,15.2],[4.5,14.15],[5.1,13.1],[5.5,12],[5.9,10.85],[6.4,9.8],[7.2,8.8]])stone(group,x,z,.87);
 for(const [x,z] of [[8.9,14.55],[10.8,11.75],[-11.4,13.65]]){G.collider(c,x,z,1.45,1.1);for(let i=0;i<7;i++){const a=i*2.4;G.sphere(group,x+Math.sin(a)*.48,.61+(i%3)*.11,z+Math.cos(a)*.36,.13,0xd3aeaa,1,.65,.8);}}
 // Garden-facing lattice bays above the veranda retain a full opening between rooms.
 for(const x of [-8.8,-3.15,3.1,8.95]){G.box(group,x,2.68,3.04,1.3,.53,.06,0xd1c8a3);for(let i=0;i<5;i++)G.box(group,x-.53+i*.265,2.68,3.09,.035,.5,.045,P.cedar);}
 G.box(group,5.65,2.95,3.07,9.1,.1,.12,P.cedar);
 // Stone tōrō.
 solid(group,c,-11.5,.2,7.1,.9,.4,.9,0x9eaa9c);G.cyl(group,-11.5,.95,7.1,.19,.27,1.2,0xaeb8a9,6);G.box(group,-11.5,1.68,7.1,.75,.6,.75,0xd9d1ae);for(const dx of [-.34,.34])for(const dz of [-.34,.34])G.box(group,-11.5+dx,1.7,7.1+dz,.065,.65,.065,0x87978d);G.cone(group,-11.5,2.2,7.1,.84,.48,0x839184,4);G.sphere(group,-11.5,2.57,7.1,.16,0x839184);
 cherry(group,c,9.8,11.4,1.1);cherry(group,c,-10.9,16.4,.85);bamboo(group,c,12,5.4,1.15);bamboo(group,c,-12.4,-9,1.2);
 G.table(group,8,7.2,3.1,.75,0x9a7354,.55);G.collider(c,8,7.2,3.1,.75);G.box(group,8,.68,7.2,.9,.13,.74,0xaa6d65);
 // Domestic garden entry, with timber lattice wings and a modest tiled canopy.
 for(const x of [-2.75,2.75]){post(group,c,x,17.4,P.cedar,3.2,.18);G.cyl(group,x,.18,17.4,.32,.4,.36,0x8c8c79,8);}
 G.box(group,0,2.98,17.4,5.9,.21,.28,P.cedar);G.box(group,0,2.61,17.4,1.08,.4,.13,0xb19a6b);
 for(const x of [-4.05,4.05])panel(group,c,x,17.4,2.1,1.5,'x',0x99a483,0x79634c);
 curvedRoof(roofGroup,0,3.25,17.4,6.7,1.9,0x46575b,'japan',.27);
 lantern(group,c,3.5,5.4,0xf4d4ad,2.8,.35);lantern(group,c,-3.5,15.5,0xf0d2a8,2.7,.32);
 packLot(group,roofGroup);
 return {group,colliders,spawn:[0,0,16],roofGroup,walkableSurfaces:[
 {minX:-10.4,maxX:-1.2,minZ:-13.5,maxZ:3.5,y:.2},
 {minX:.85,maxX:10.45,minZ:-13.5,maxZ:-5.8,y:.2},
 {minX:.85,maxX:10.45,minZ:-2.75,maxZ:3.25,y:.2},
 {minX:-9.9,maxX:-6.1,minZ:-12.6,maxZ:-7.1,y:.337},
 {minX:-5.625,maxX:-2.075,minZ:-12.6,maxZ:-7.1,y:.337},
 {minX:-9.9,maxX:-1.5,minZ:-6.325,maxZ:1.925,y:.337},
 {minX:1.05,maxX:9.75,minZ:-2.05,maxZ:2.85,y:.337},
 {minX:1,maxX:9.6,minZ:-12.4,maxZ:-5.9,y:.29},
 {minX:-10.6,maxX:-.4,minZ:2.5,maxZ:4.7,y:.32},
 {minX:.85,maxX:10.45,minZ:2.8,maxZ:4.4,y:.32},
 {minX:-1.05,maxX:1.05,minZ:-13.3,maxZ:4.35,y:.113},
 {minX:-2.25,maxX:2.25,minZ:4.625,maxZ:5.375,y:.2},
 {minX:10.575,maxX:12.825,minZ:-13.45,maxZ:-4.35,y:.2},
 {minX:1.725,maxX:10.275,minZ:-5.675,maxZ:-3.025,y:.07},
 {minX:-1.5,maxX:1.5,minZ:8.5,maxZ:19.5,y:.05}
 ],stations:[
 {id:'jp-tea',name:'茶室 · 点茶时光',action:'点抹茶',position:[-3.15,0,-.2],color:'#81a883',npcName:'Aoi',npcAction:'tea',npcLabel:'正在点抹茶',npcPosition:[-4.6,0,-.95],workTarget:[-4.95,.89,-1.88],npcRotation:Math.atan2(-.35,-.93),route:[[-8.2,0,-.4],[-7.8,0,1.4],[-4,0,1.5],[-4,0,.6]]},
 {id:'jp-sushi',name:'台所 · 手作寿司',action:'握寿司',position:[8.8,0,-6.5],color:'#e8b277',npcName:'Haru',npcAction:'sushi',npcLabel:'正在握寿司',npcPosition:[8.2,0,-8.2],workTarget:[7.5,1.28,-8.08],npcRotation:Math.atan2(-.7,.12),route:[[8.55,0,-8.2],[8.8,0,-9.5],[6.5,0,-9.5],[8.8,0,-9.5]]},
 {id:'jp-rest',name:'和室 · 榻榻米卧室',action:'铺被休息',position:[-3,0,-8],color:'#aaa1ce',npcName:'Yuki',npcAction:'read',npcLabel:'在榻榻米旁静读',npcPosition:[-2.9,0,-9.8],workTarget:[-3.62,.61,-9.8],npcRotation:-Math.PI/2},
 {id:'jp-flowers',name:'生け花 · 花道小间',action:'学习花道',position:[8.15,0,1.35],color:'#dda8b3',npcName:'Mei',npcAction:'craft',npcLabel:'正在整理花枝',npcPosition:[8.15,0,.12],workTarget:[7.5,1.6,.05],npcRotation:Math.atan2(-.65,-.07),route:[[8.3,0,.5],[8.4,0,2.3],[5,0,2.5],[8.4,0,2.3]]},
 {id:'jp-garden',name:'錦鯉の庭 · 锦鲤庭园',action:'喂锦鲤',position:[-2.7,0,10.4],color:'#78b7be',npcName:'Sora',npcAction:'garden',npcLabel:'照料池塘与苔庭',npcPosition:[-2.9,0,12.5],workTarget:[-5.6,.16,11.7],npcRotation:Math.atan2(-2.7,-.8),route:[[-3.15,0,13.6],[-1.4,0,13.8],[-1.2,0,8.6]]}
 ]};
}

// R5: walkable architectural openings and separate interior ceilings. Camera
// boxes include height, so a camera can pass through a door but not its lintel.
function palaceBox(g,nav,camera,x,y,z,w,h,d,color,walkBlock=false){
 G.box(g,x,y,z,w,h,d,color);
 camera.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});
 if(walkBlock)G.collider(nav,x,z,w,d);
}
function palaceWall(g,nav,camera,{axis='x',at,from,to,bottom=.2,top=3.86,depth=.26,color=0xc6906b,openings=[]}){
 const openingsSorted=[...openings].sort((a,b)=>a.from-b.from);let cursor=from;
 const piece=(lo,hi,low,high,block)=>{if(hi-lo<.01||high-low<.01)return;const mid=(lo+hi)/2;palaceBox(g,nav,camera,axis==='x'?mid:at,(low+high)/2,axis==='x'?at:mid,axis==='x'?hi-lo:depth,high-low,axis==='x'?depth:hi-lo,color,block);};
 for(const op of openingsSorted){piece(cursor,op.from,bottom,top,true);piece(op.from,op.to,bottom,op.bottom??bottom,(op.bottom??bottom)>bottom+.1);piece(op.from,op.to,op.top,top,false);cursor=op.to;}piece(cursor,to,bottom,top,true);
 // Continuous high painted timber beam and inset gilded cornice.
 const length=to-from,mid=(from+to)/2;
 G.box(g,axis==='x'?mid:at,top-.05,axis==='x'?at:mid,axis==='x'?length+.04:.33,.16,axis==='x'?.33:length+.04,P.red);
 G.box(g,axis==='x'?mid:at,top-.20,axis==='x'?at:mid,axis==='x'?length+.06:.29,.065,axis==='x'?.29:length+.06,P.gold);
}
function palaceWindow(g,x,z,w,axis='x',camera=null){
 const q=new THREE.Group();q.position.set(x,2.14,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);
 // The plaster is absent behind the window: only an airy carved lattice remains.
 for(const xx of [-w/2,w/2])G.box(q,xx,0,0,.11,1.82,.18,P.red);
 for(const yy of [-.91,.91])G.box(q,0,yy,0,w+.13,.10,.18,P.red);
 for(let xx=-w/2+.24;xx<w/2;xx+=.43)G.box(q,xx,0,0,.045,1.73,.09,0x85553b);
 for(const yy of [-.46,0,.46])G.box(q,0,yy,0,w,.045,.08,0x85553b);
 G.box(q,0,-1.01,0,w+.26,.14,.43,0xc2a076);
 if(camera)camera.push({minX:x-(axis==='x'?w/2:.06),maxX:x+(axis==='x'?w/2:.06),minY:1.23,maxY:3.05,minZ:z-(axis==='x'?.06:w/2),maxZ:z+(axis==='x'?.06:w/2)});
}
function palaceCeiling(g,nav,camera,x,z,w,d,y,ceremonial=false){
 const base=ceremonial?0x47695f:0x9c794f;
 palaceBox(g,nav,camera,x,y+.09,z,w,.18,d,base);
 // Underside coffers read from eye height, with red framing and gold-green fields.
 const nx=ceremonial?3:Math.max(2,Math.round(w/2.6)),nz=Math.max(2,Math.round(d/2.8));
 for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){
  const xx=x-w/2+(ix+.5)*w/nx,zz=z-d/2+(iz+.5)*d/nz;
  G.box(g,xx,y-.02,zz,w/nx-.20,.04,d/nz-.20,ceremonial?0x657d64:0xb99867);
  if(ceremonial){G.cyl(g,xx,y-.061,zz,.27,.27,.035,0xc7a453,12);G.torus(g,xx,y-.085,zz,.20,.025,0xe2c27d);}
 }
 for(let i=0;i<=nx;i++)palaceBox(g,nav,camera,x-w/2+i*w/nx,y-.105,z,.17,.26,d+.02,P.red);
 for(let i=0;i<=nz;i++)palaceBox(g,nav,camera,x,y-.105,z-d/2+i*d/nz,w+.02,.26,.17,P.red);
 for(const side of [-1,1]){palaceBox(g,nav,camera,x+side*(w/2-.18),y-.28,z,.12,.12,d-.15,P.gold);palaceBox(g,nav,camera,x,y-.28,z+side*(d/2-.18),w-.15,.12,.12,P.gold);}
}
function palaceInteriorLight(group,x,y,z,intensity=15,distance=10){
 // Compact warm core sits inside the existing pendant, without changing its shape.
 G.mesh(group,new THREE.SphereGeometry(.075,8,6),0xffd9a2,x,y,z,{emissive:0xffb85f,emissiveIntensity:.6});
 const light=new THREE.PointLight(0xffd2a0,intensity,distance,1.7);light.position.set(x,y,z);light.castShadow=false;group.add(light);
}

export function buildChina(){
 return buildChinaPalace(G,{palaceBox,palaceWall,palaceCeiling,palaceRoof,beam,teaSet,bowl,scroll,openShelf,boundBook,foldedCloth,flowerBranches,cherry,bamboo,packStatic});
}
