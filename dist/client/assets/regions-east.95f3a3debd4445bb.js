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
function lantern(g,c,x,z,color=0xda6750,h=2.7,s=.42){post(g,c,x,z,P.cedar,h,.065);G.box(g,x+.28,h,z,.65,.07,.075,P.cedar);G.cyl(g,x+.55,h-.19,z,.025,.025,.37,P.cedar,6);G.sphere(g,x+.55,h-.68,z,s,color,1,1.15,1);for(const yy of [h-1.1,h-.27])G.cyl(g,x+.55,yy,z,.24,.24,.07,P.gold);G.cyl(g,x+.55,h-1.25,z,.025,.025,.25,P.gold,6);}
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
 for(let i=0;i<=nx;i++)G.box(g,x-w/2+i*w/nx,y-.105,z,.17,.26,d+.02,P.red);
 for(let i=0;i<=nz;i++)G.box(g,x,y-.105,z-d/2+i*d/nz,w+.02,.26,.17,P.red);
 for(const side of [-1,1]){G.box(g,x+side*(w/2-.18),y-.28,z,.12,.12,d-.15,P.gold);G.box(g,x,y-.28,z+side*(d/2-.18),w-.15,.12,.12,P.gold);}
}
function palaceInteriorLight(group,x,y,z,intensity=15,distance=10){
 const light=new THREE.PointLight(0xffd2a0,intensity,distance,1.7);light.position.set(x,y,z);light.castShadow=false;group.add(light);
}

export function buildChina(){
 const group=new THREE.Group(),roofGroup=new THREE.Group(),colliders=[],cameraColliders=[];group.name='China — Vermilion Palace';roofGroup.name='China roof';group.add(roofGroup);const c=colliders,doorways=[];
 // Each actual opening owns its regression coordinates as well as its geometry.
 // The normal is across the wall; 'a' and 'b' are clear standing points on its sides.
 const doorway=(id,name,axis,at,from,to,top,rooms,bottom=.2)=>{
  const center=(from+to)/2,point=offset=>axis==='x'?[center,0,at+offset]:[at+offset,0,center];
  doorways.push({id,name,axis,at,from,to,bottom,top,width:to-from,height:top-bottom,rooms,a:point(-.72),b:point(.72)});
  return {from,to,top};
 };
 // R6: a 60×80 palace estate. The furnished core retains its human scale;
 // additional courts, gardens and galleries occupy the new land deliberately.
 const bounds={minX:-30,maxX:30,minZ:-40,maxZ:40},estateSurfaces=[];
 G.box(group,0,-.5,0,60,1,80,0x899d77);
 // Equal-height paths form a partition: crossing walks must not draw two
 // different top faces at y=.10. Keep their navigation/camera footprint intact.
 const estateFloorPatches=[];
 const estateFloor=(x,z,w,d,y,color)=>{
  let parts=[{minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}];
  for(const old of estateFloorPatches.filter(p=>Math.abs(p.y-y)<1e-6))parts=parts.flatMap(p=>{
   const x0=Math.max(p.minX,old.minX),x1=Math.min(p.maxX,old.maxX),z0=Math.max(p.minZ,old.minZ),z1=Math.min(p.maxZ,old.maxZ);
   if(x1<=x0||z1<=z0)return[p];
   return [{...p,maxX:x0},{...p,minX:x1},{minX:x0,maxX:x1,minZ:p.minZ,maxZ:z0},{minX:x0,maxX:x1,minZ:z1,maxZ:p.maxZ}].filter(q=>q.maxX-q.minX>1e-5&&q.maxZ-q.minZ>1e-5);
  });
  for(const p of parts){G.box(group,(p.minX+p.maxX)/2,y/2,(p.minZ+p.maxZ)/2,p.maxX-p.minX,y,p.maxZ-p.minZ,color);estateFloorPatches.push({...p,y});}
  estateSurfaces.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,y:y+.015});cameraColliders.push({minX:x-w/2,maxX:x+w/2,minY:-.05,maxY:y,minZ:z-d/2,maxZ:z+d/2});
 };
 for(const x of [-29.5,29.5])palaceBox(group,c,cameraColliders,x,.55,0,.3,1.1,79,0xbd9d72,true);
 palaceBox(group,c,cameraColliders,0,.55,-39.5,59,1.1,.3,0xbd9d72,true);
 for(const x of [-16.4,16.4])palaceBox(group,c,cameraColliders,x,.55,39.5,26.2,1.1,.3,0xbd9d72,true);
 // Broad stone walks connect every new garden back to the inhabited palace.
 estateFloor(0,28,32,17,.10,0xcac1a6);estateFloor(0,-24.5,36,17,.10,0xc3bca4);
 estateFloor(-16.8,-1.5,4.2,43,.10,0xbfb99f);estateFloor(16.8,-1.5,4.2,43,.10,0xbfb99f);
 estateFloor(0,-17.5,39,3.5,.12,0xcec6ac);estateFloor(0,21,42,3.5,.12,0xcec6ac);
 estateFloor(-22,4.5,12,3,.10,0xc3b89b);estateFloor(22,-.7,12,3,.10,0xc3b89b);
 for(let z=21;z<37;z+=1.4)G.box(group,0,.117,z,4.4,.028,1.24,0xe0d5bb);
 for(let x=-15;x<=15;x+=2.2)for(const z of [-19.1,-25.5])G.box(group,x,.118,z,1.95,.026,1.95,0xd9cfb3);
 // A north plum court culminates in an open archive-reading pavilion.
 estateFloor(0,-30,11,6.8,.24,0xb8a883);
 for(const x of [-4.8,0,4.8])for(const z of [-32.85,-27.15])if(!(x===0&&z===-27.15))post(group,c,x,z,P.red,3.5,.14);
 palaceBox(roofGroup,c,cameraColliders,0,3.35,-30,11.2,.2,7.0,0x866b49);
 palaceRoof(roofGroup,0,3.5,-30,12.4,8.0,1.4,0xb68a41);
 G.table(group,0,-31.1,4.4,1.2,0x865a3c,.9);G.collider(c,0,-31.1,4.4,1.2);
 for(const x of [-1.3,0,1.3])boundBook(group,x,1.02,-31.1,.75,.55,0x779084);
 for(const [x,z] of [[-12,-29],[-7,-35],[7,-35],[12,-29]]){cherry(group,c,x,z,.95);G.cyl(group,x,.08,z,1.4,1.4,.12,0xa9ae8f,12);}
 for(const x of [-16,16]){G.box(group,x,.2,-26,2.2,.35,3.4,0xa89777);G.collider(c,x,-26,2.2,3.4);bamboo(group,c,x,-26,1.15);}
 // A long west bamboo gallery is a sheltered walk, with side-facing benches.
 estateFloor(-23,-6,3.9,21,.22,0xb7a581);
 shedRoof(roofGroup,-23,3.3,-6,5.2,22,0x9c793e,.025);
 palaceBox(roofGroup,c,cameraColliders,-23,3.12,-6,4.3,.16,21.2,0x8e7148);
 for(const z of [-16,-11,-6,-1,4])for(const x of [-24.7,-21.3])post(group,c,x,z,P.red,3.25,.105);
 for(const z of [-11,-1]){G.table(group,-24.45,z,.48,2.5,0x875e40,.5);G.collider(c,-24.45,z,.48,2.5);}
 for(const [x,z] of [[-27,-17],[-27,-10],[-27,-3],[-27,4],[-20,-12],[-20,-3]])bamboo(group,c,x,z,1.25);
 estateFloor(-21,13,9,7.4,.23,0xc0b08e);
 for(const x of [-24.7,-17.3])for(const z of [9.9,16.1])post(group,c,x,z,P.red,3.1,.12);
 palaceBox(roofGroup,c,cameraColliders,-21,3.03,13,9,.16,7.4,0x987b4e);
 palaceRoof(roofGroup,-21,3.2,13,10.5,8.6,1.35,0xb68f49);
 G.table(group,-23,13,2.1,1.8,0x8d6445,.78);G.collider(c,-23,13,2.1,1.8);teaSet(group,-23,.89,13,0x92afb0);
 for(const z of [11.3,14.7]){G.cyl(group,-23,.34,z,.36,.42,.65,0xa5a688,10);G.collider(c,-23,z,.85,.85);}
 for(const x of [-26,-17.5]){lantern(group,c,x,18.5,0xcf6a4c,3.75,.36);stone(group,x,11,1.4);G.collider(c,x,11,1.7,1.3);}
 // An east promenade opens into a second lotus court. Its straight pedestrian
 // bridge keeps a full 2.4 m deck and two independent water collision banks.
 estateFloor(23,-10,3.9,17,.22,0xb7a581);
 shedRoof(roofGroup,23,3.3,-10,5.2,18,0x9c793e,.025);
 palaceBox(roofGroup,c,cameraColliders,23,3.12,-10,4.3,.16,17.2,0x8e7148);
 for(const z of [-18,-14,-10,-6,-2])for(const x of [21.3,24.7])post(group,c,x,z,P.red,3.25,.105);
 estateFloor(21,8,11.5,15,.08,0xaca98b);G.box(group,21,.12,8,9.7,.12,12.0,0x8c9683);G.box(group,21,.195,8,9.2,.03,11.5,0x79a9a1);
 G.collider(c,17.975,8,3.15,11.6);G.collider(c,24.025,8,3.15,11.6);
 estateFloor(21,8,2.4,13.4,.34,0xb58e5b);
 for(let z=1.4;z<=14.6;z+=.65)G.box(group,21,.356,z,2.36,.024,.035,0xe0bd86);
 for(const x of [19.6,22.4]){G.box(group,x,1.15,8,.09,.12,13.4,P.red);G.collider(c,x,8,.12,13.4);for(const z of [1.4,4.7,8,11.3,14.6]){G.cyl(group,x,.76,z,.08,.08,1.1,P.red,8);G.sphere(group,x,1.38,z,.13,P.gold);}}
 for(const [x,z] of [[17.5,3],[24.5,5],[17.7,11.5],[24.5,12.5]]){G.cyl(group,x,.22,z,.38,.38,.02,0x6b916c,12);G.sphere(group,x,.29,z,.17,0xe4b7b1,1,.5,1);}
 for(const [x,z] of [[27,1],[27,17],[17.8,17]])bamboo(group,c,x,z,1.25);
 // Southern reception garden makes the longer approach feel intentional.
 for(const [x,z] of [[-12,28],[12,28],[-22,29],[22,29],[-22,35],[22,35]]){cherry(group,c,x,z,1);G.cyl(group,x,.1,z,1.5,1.5,.17,0xa4aa8e,12);}
 for(const x of [-7,7]){lantern(group,c,x,32,0xcf5841,3.75,.4);G.table(group,x,24.5,3.8,.65,0x98704b,.55);G.collider(c,x,24.5,3.8,.65);}
 for(const x of [-3.6,3.6])post(group,c,x,36.5,P.red,3.85,.18);
 palaceBox(roofGroup,c,cameraColliders,0,3.55,36.5,7.7,.3,.35,P.red);
 palaceRoof(roofGroup,0,3.85,36.5,9,3.9,1.05,0xb58b43);
 // A private, fully enclosed bathing/service annex terminates the bamboo walk.
 // Tub, washbasin, toilet nook and linen storage each have a clear approach lane.
 estateFloor(-23,-24,8,8,.22,0xb7ae94);estateFloor(-23,-18.25,3.2,4.3,.13,0xc5b99b);
 palaceWall(group,c,cameraColliders,{at:-28,from:-27,to:-19,bottom:.22,top:3.45,color:0xc7b997});
 for(const x of [-27,-19])palaceWall(group,c,cameraColliders,{axis:'z',at:x,from:-28,to:-20,bottom:.22,top:3.45,color:0xc7b997});
 palaceWall(group,c,cameraColliders,{at:-20,from:-27,to:-19,bottom:.22,top:3.45,color:0xc7b997,openings:[doorway('cn-bath-entry','浴房正门','x',-20,-24.1,-21.9,2.95,['bath','west-gallery'],.22)]});
 palaceCeiling(roofGroup,c,cameraColliders,-23,-24,8,8,3.45);
 palaceRoof(roofGroup,-23,3.6,-24,9.3,9.3,1.35,0xa98343);
 palaceInteriorLight(group,-23,2.96,-24,18,9);
 // The masonry tub has a hollow-looking blue-green interior and rolled towel.
 palaceBox(group,c,cameraColliders,-25.1,.52,-25,2.45,.62,3.45,0x8d9a91,true);
 G.box(group,-25.1,.845,-25,2.16,.055,3.15,0xd2d1b7);G.box(group,-25.1,.88,-25,1.82,.025,2.77,0x79a59e);
 for(const x of [-26.25,-23.95])G.box(group,x,.9,-25,.18,.2,3.49,0xbcc6b2);
 for(const z of [-26.64,-23.36])G.box(group,-25.1,.9,z,2.49,.2,.21,0xbcc6b2);
 foldedCloth(group,-25.25,1.05,-26.57,1.0,.34,0xdfd6be);
 // Basin and framed mirror are mounted on the eastern wall, not in the aisle.
 palaceBox(group,c,cameraColliders,-19.8,.67,-26.35,1.12,.9,1.7,0x90714d,true);
 G.box(group,-19.8,1.16,-26.35,1.2,.1,1.78,0xc3bea0);G.sphere(group,-19.8,1.22,-26.35,.38,0xc8d4c7,1,.35,1.3);
 G.box(group,-19.155,2.0,-26.35,.075,1.25,1.25,0x806243);G.box(group,-19.2,2.0,-26.35,.025,1.05,1.04,0xadbeb4);
 beam(group,[-19.55,1.23,-26.65],[-19.55,1.6,-26.65],.035,0xb79756);beam(group,[-19.55,1.6,-26.65],[-19.85,1.6,-26.65],.035,0xb79756);
 // The privacy screen stops 1.6 m before the front wall, preserving a real turn.
 lattice(group,c,-21.6,-23.05,2.9,2.25,'z',0x8b6545);
 cameraColliders.push({minX:-21.68,maxX:-21.52,minY:.22,maxY:2.47,minZ:-24.5,maxZ:-21.6});
 G.cyl(group,-20.15,.57,-23.35,.38,.32,.68,0xc9cfbe,12);G.torus(group,-20.15,.94,-23.35,.32,.09,0xe1dec8);G.box(group,-20.15,1.03,-23.82,.72,.68,.25,0xc9cfbe);G.collider(c,-20.15,-23.5,.86,1.1);
 const linens=openShelf(group,c,-25.6,-21.25,2.0,1.85,.6,0x8a6746);
 for(const y of [.31,.91,1.51])foldedCloth(linens,0,y,0,1.5,.43,y<1?0xbeb899:0xd5cbb2);
 G.table(group,-23,-27.2,1.9,.55,0x95704e,.53);G.collider(c,-23,-27.2,1.9,.55);
 G.vessel(group,-22.65,.62,-27.2,0x7e9b89,.5);foldedCloth(group,-23.45,.64,-27.2,.6,.38,0xc1b498);
 // An axial palace: ceremonial north hall, two private side ranges, a
 // processional court, south gate and a garden pavilion. Circulation stays open.
 for(const x of [-6.3,6.3])G.box(group,x,.1,-5,8.25,.2,17,0xb9ab89);
 G.box(group,0,.1,-11.45,4.35,.2,4.1,0xb9ab89);G.box(group,0,.035,-3.1,4.15,.07,12.5,0xc4c3ad);
 for(let z=-8.8;z<3;z+=1.3){G.box(group,0,.1,z,2.8,.06,1.1,0xd8cfb8);for(const x of [-1.67,1.67])G.box(group,x,.11,z,.18,.08,1.1,0x7b8a75);}
 palaceWall(group,c,cameraColliders,{at:-13.35,from:-10.5,to:10.5,top:4.2,color:0xb5523f});
 palaceWall(group,c,cameraColliders,{axis:'z',at:-10.35,from:-13.35,to:2.8,openings:[{from:-10.3,to:-7.9,bottom:1.23,top:3.05},{from:-2.4,to:0,bottom:1.23,top:3.05}]});
 // Separate kitchen and study entrances connect to the covered garden gallery.
 palaceWall(group,c,cameraColliders,{axis:'z',at:10.35,from:-13.35,to:2.8,openings:[doorway('cn-kitchen-gallery','御膳房东门','z',10.35,-9.7,-7.5,3.05,['kitchen','gallery']),doorway('cn-study-gallery-north','书阁北侧廊门','z',10.35,-5.45,-3.9,3.05,['study','gallery']),{from:-3.6,to:-1.1,bottom:1.23,top:3.05},doorway('cn-study-gallery-south','书阁月门','z',10.35,.8,2.45,3.35,['study','gallery'])]});
 palaceWindow(group,-10.35,-9.1,2.4,'z',cameraColliders);palaceWindow(group,-10.35,-1.2,2.4,'z',cameraColliders);palaceWindow(group,10.35,-2.35,2.5,'z',cameraColliders);
 // Courtyard flagstones and carved timber veranda.
 G.box(group,0,.07,7.2,21,.1,7.4,0xc4bda6);for(let x=-10;x<10.5;x+=1.3)for(let z=3.75;z<10.8;z+=1.3)G.box(group,x,.135,z,1.23,.02,1.23,((Math.round(x*10)+Math.round(z*10))%3===0)?0xb8b39f:0xd0c9b2);
 G.box(group,0,.16,3.05,21.5,.28,1.7,0xa87b53);for(let x=-10.5;x<11;x+=.5)G.box(group,x,.31,3.05,.025,.02,1.65,0x795743);
 for(const x of [-10,-5.2,0,5.2,10]){post(group,c,x,-12.85,P.red,3.8,.14);G.cyl(group,x,.26,-12.85,.24,.3,.44,0x8d8f7b,8);}for(const x of [-10,10]){post(group,c,x,2.8,P.red,3.5,.16);G.cyl(group,x,.25,2.8,.29,.34,.45,0x8d8f7b,8);}
 G.box(group,0,3.6,-12.75,20.8,.24,.3,P.red);G.box(group,0,3.65,2.8,20.5,.24,.30,P.red);for(const x of [-10,10])G.box(group,x,3.55,-4.8,.25,.28,15.5,P.red);
 // Vermilion colonnades and gold-green transoms articulate the private halls.
 for(const baseX of [-9.95,-5.25,5.25,9.95])for(const z of [-6.15,2.8]){const x=Math.abs(baseX)===5.25?(z<0?Math.sign(baseX)*6:baseX<0?-4.8:5.25):baseX;post(group,c,x,z,P.red,3.7,.115);for(const yy of [.55,2.95])G.cyl(group,x,yy,z,.135,.135,.13,P.gold,10);}
 for(const x of [-6.6,6.6]){G.box(group,x,3.34,2.81,5.4,.42,.15,0x487062);for(let j=0;j<7;j++){G.box(group,x-2.25+j*.75,3.35,2.91,.38,.2,.08,0xd0ac60).rotation.z=Math.PI/4;}G.box(group,x,3.66,2.8,5.6,.14,.22,P.red);}
 // Decorative bracket sets under the eaves.
 for(const x of [-10,-5.2,0,5.2,10])for(const z of [-12.7,2.8]){for(let j=0;j<3;j++){G.box(group,x,3.15+j*.16,z, .5+j*.33,.12,.46, j%2?P.gold:P.red);}for(const dx of [-.45,.45])G.box(group,x+dx,3.27,z,.1,.5,.3,P.red);}
 // Lattice screens create rooms while preserving the central walkway.
 for(const x of [-8.3,-4.8,4.8,8.3])lattice(group,c,x,-12.93,3.15,3.04);
 palaceWall(group,c,cameraColliders,{axis:'z',at:-2.1,from:-13.35,to:-6.7,color:0xb68f63,openings:[doorway('cn-bedroom-archive','寝殿藏书廊门','z',-2.1,-9.3,-7.1,3.13,['bedroom','archive'])]});
 palaceWall(group,c,cameraColliders,{axis:'z',at:2.1,from:-13.35,to:-6.64,color:0xb68f63,openings:[doorway('cn-archive-kitchen','藏书廊御膳房门','z',2.1,-9.5,-7.2,3.13,['archive','kitchen'])]});

 const hallMeshStart=group.children.length,hallColliderStart=c.length;
 // The ceremonial hall has a raised throne dais, gilded cloud screen and
 // paired ritual display tables. Its steps never seal the approach to the chambers.
 G.box(group,0,.2,-10.3,7.2,.3,7.9,0xbcac83);G.box(group,0,.39,-11.1,3.55,.22,3.4,0xd2bb83);
 solid(group,c,0,.78,-11.55,2.55,.55,1.25,0x975030);G.box(group,0,1.22,-11.55,2.34,.27,1.2,0xcf9f4c);
 for(const x of [-1.05,1.05]){G.box(group,x,1.68,-11.55,.2,1.1,1.25,0xc99d4b);G.sphere(group,x,2.28,-11.02,.16,0xe5bf6b);}
 G.box(group,0,2.1,-12.1,2.42,1.65,.22,0xa74d32);G.box(group,0,2.1,-11.95,2.1,1.39,.09,0xd2a553);
 G.torus(group,0,2.22,-11.87,.51,.065,0x8d522c,0);for(let i=0;i<7;i++){const angle=i*2.3;G.sphere(group,Math.sin(angle)*.36,2.22+Math.cos(angle)*.36,-11.77,.1,0xdabd76,1.4,.7,.35);}
 G.box(group,0,2.57,-13.07,4.15,2.5,.09,0x742f26);for(const x of [-1.8,-.9,0,.9,1.8])G.box(group,x,2.62,-12.99,.065,2.2,.08,0xd2a953);
 for(const x of [-1.6,1.6]){G.table(group,x,-9.53,.58,.7,0x824b2b,.84);G.vessel(group,x,.93,-9.53,0xc6ad64,.6);G.collider(c,x,-9.53,.6,.72);}
 for(const x of [-2.6,2.6]){post(group,c,x,-7.05,P.red,4.55,.17);G.cyl(group,x,.2,-7.05,.3,.37,.4,0xbbb399,8);for(const yy of [.75,3.45,4.0])G.cyl(group,x,yy,-7.05,.185,.185,.12,0xd0a14f,10);}
 G.box(group,0,4.26,-7.05,5.65,.38,.32,P.red);G.box(group,0,3.75,-7.01,2.18,.62,.15,0x375b54);G.box(group,0,3.76,-6.92,1.95,.42,.06,0xd0ad60);
 // Tall-backed ceremonial seats and paired hanging couplets complete the focal hall.
 for(const x of [-1.2,1.2]){G.chair(group,x,-8.45,0x78432c,Math.PI).position.y=.35;G.box(group,x,1.63,-8.08,.61,.72,.035,0xba924f);G.collider(c,x,-8.45,.8,.85);}
 scroll(group,-1.88,2.8,-13.07,.47,2.05,true);scroll(group,1.88,2.8,-13.07,.47,2.05,true);
 // This hall is its own architectural volume, not an aisle between a bed and stove.
 for(let i=hallMeshStart;i<group.children.length;i++)group.children[i].position.z+=6.8;
 for(let i=hallColliderStart;i<c.length;i++){c[i].minZ+=6.8;c[i].maxZ+=6.8;}
 // The gilt backdrop and its projecting scroll rods are solid to both bodies
 // and cameras; rear service doors remain clear on either side.
 G.collider(c,0,-6.23,4.42,.2);
 // Side service doors flank the intact throne screen; the central wall and
 // backdrop remain solid. These are real apertures into the private wings.
 palaceWall(group,c,cameraColliders,{at:-6.64,from:-3.5,to:3.5,bottom:.35,top:4.18,color:0xa9503c,openings:[
  doorway('cn-hall-bedroom','仪殿西后门','x',-6.64,-3.5,-2.35,3.15,['bedroom','hall'],.35),
  doorway('cn-hall-kitchen','仪殿东后门','x',-6.64,2.35,3.5,3.15,['kitchen','hall'],.35)
 ]});
 // Screened side walls give the formal hall privacy; the front portal remains open.
 for(const x of [-3.65,3.65]){
  const side=x<0?'west':'east';
  // The former 0.345 m screen slit was not a usable door. Keep both carved
  // screen wings but leave a full 1.8 m body-clear opening, including the plinth.
  const opening=doorway(`cn-hall-${side}`,x<0?'仪殿西侧门':'仪殿东侧门','z',x,-.15,1.65,2.78,[x<0?'tea':'hall',x<0?'hall':'study'],.35);
  for(const [from,to] of [[-6.47,opening.from],[opening.to,1.825]])lattice(group,c,x,(from+to)/2,to-from,2.7,'z',P.red);
  palaceBox(group,c,cameraColliders,x,3.48,-2.295,.24,1.40,8.69,0x376c66);
  // Solid plinths and high transoms make the lattice walls a complete enclosure.
  for(const [from,to] of [[-6.64,opening.from],[opening.to,2.05]]){
   palaceBox(group,c,cameraColliders,x,.47,(from+to)/2,.24,.24,to-from,P.red);
   cameraColliders.push({minX:x-.12,maxX:x+.12,minY:.35,maxY:4.18,minZ:from,maxZ:to});
  }
  G.box(group,x,3.02,-2.295,.29,.10,8.73,0xcfa251);G.box(group,x,4.08,-2.295,.29,.10,8.73,0xcfa251);
 }
 G.box(group,0,.2,1.275,7.2,.3,1.65,0xbcac83);
 // A raised formal entry and paired columns establish the front of the hall.
 for(const x of [-3.65,3.65]){post(group,c,x,2.05,P.red,4.15,.13);G.cyl(group,x,.28,2.05,.23,.29,.45,0xc0b89b,8);}
 G.box(group,0,3.87,2.05,7.55,.3,.28,P.red);G.box(group,0,3.64,2.04,6.8,.23,.15,0x3c7773);
 for(const x of [-2.8,-2,-1.2,1.2,2,2.8])G.sphere(group,x,3.64,2.15,.09,0xdac07a,1,1,.4);
 // Framed openings preserve the private circulation behind the hall.
 palaceWall(group,c,cameraColliders,{at:-6.7,from:-10.35,to:-2.1,color:0xc1ae82,openings:[doorway('cn-tea-bedroom','西偏殿寝殿门','x',-6.7,-5.6,-4.05,3.15,['bedroom','tea']),{from:-3.5,to:-2.33,top:3.17}]});
 palaceWall(group,c,cameraColliders,{at:-5.75,from:3.65,to:10.35,color:0xbea784,openings:[doorway('cn-study-kitchen','书阁御膳房门','x',-5.75,3.8,5.6,3.15,['kitchen','study'])]});
 // The formal hall has a tall entrance; tea and scholar rooms have their own doors.
 palaceWall(group,c,cameraColliders,{at:2.05,from:-3.65,to:3.65,bottom:.35,top:4.18,color:0xa9503c,openings:[doorway('cn-hall-front','仪殿正门','x',2.05,-2.05,2.05,3.48,['hall','courtyard'],.35)]});
 for(const side of [-1,1])palaceWall(group,c,cameraColliders,{at:2.8,from:side<0?-10.35:3.65,to:side<0?-3.65:10.35,color:0xc08d67,openings:[doorway(side<0?'cn-tea-front':'cn-study-front',side<0?'西偏殿正门':'书阁正门','x',2.8,side<0?-7.5:5.7,side<0?-5.1:8.1,3.15,[side<0?'tea':'study','courtyard'])]});
 // Rear archive gives the space behind the formal hall a domestic purpose.
 const archive=openShelf(group,c,0,-12.55,2.85,2.25,.62,0x7f4f34);
 for(let j=0;j<4;j++)for(const x of [-.93,.0,.93])boundBook(archive,x,.35+j*.11,0,.64,.45,[0xa48a61,0x7a8e7b,0xaf7454,0x9a9b7b][j]);
 for(const x of [-.95,.0,.95])G.vessel(archive,x,1.51,0,0xb9c5ae,.6);
 // Stone steps and a long carpet lead through successive courts to the hall.
 for(let j=0;j<3;j++)G.box(group,0,.09+j*.07,3.2-j*.43,3.8,.12,.5,0xd1c5a5);
 G.box(group,0,.393,-.55,1.9,.045,4.85,0xb86041);for(const x of [-.88,.88])G.box(group,x,.42,-.55,.065,.016,4.7,0xd4b977);

 const teaMeshStart=group.children.length,teaColliderStart=c.length;
 // Teahouse: carved square table, stools, porcelain and layered woven rug.
 G.rug(group,-6.15,-2,6.5,6.25,0xb88e5c,0x536f6a);G.rug(group,-6.15,-2,5.9,5.65,0xd8b982,0x995b46);
 G.table(group,-6.15,-2.15,3.5,2.55,0x7b4b35,.94);G.collider(c,-6.15,-2.15,3.5,2.55);for(const x of [-7.6,-4.7])G.box(group,x,.77,-2.15,.1,.45,2.45,P.gold);G.box(group,-6.15,1.04,-2.15,2.05,.045,1.08,0x9e7245);teaSet(group,-6.35,1.07,-2.15,0xb6cbd1);bowl(group,-5.1,1.07,-2.25,0xb6cbd1,.28,0xd4aa6c);bowl(group,-4.8,1.08,-1.1,0xb6cbd1,.16,0x7d8653);
 for(const [x,z] of [[-6.15,-4.1],[-8.65,-2.15],[-6.15,-.1]]){solid(group,c,x,.42,z,.78,.72,.78,0x804c35);G.box(group,x,.83,z,.85,.12,.85,0xb28652);}
 G.plant(group,-9,1.25,0x627c58,1.15);G.collider(c,-9,1.25,.9,.9);
 for(let i=teaMeshStart;i<group.children.length;i++)group.children[i].position.x-=.9;
 for(let i=teaColliderStart;i<c.length;i++){c[i].minX-=.9;c[i].maxX-=.9;}
 // Rug support footprints follow the actual translated meshes.
 for(const surface of group.userData.rugSurfaces||[]){surface.minX-=.9;surface.maxX-=.9;}
 // Bedroom with open carved canopy and embroidered cover.
 const bedMeshStart=group.children.length,bedColliderStart=c.length;
 G.bed(group,-6.2,-9.7,0x8b706d,3.4,3.7);G.collider(c,-6.2,-9.7,3.5,3.8);for(const x of [-7.85,-4.55])for(const z of [-11.5,-7.85])post(group,c,x,z,0x76472f,2.75,.075);for(const x of [-7.85,-4.55])G.box(group,x,2.78,-9.67,.16,.18,3.9,0x76472f);for(const z of [-11.5,-7.85]){G.box(group,-6.2,2.78,z,3.45,.18,.18,0x76472f);for(let x=-7.65;x<-4.65;x+=.4)G.box(group,x,2.53,z,.05,.48,.07,P.gold);}G.box(group,-6.2,.9,-9.15,2.8,.026,1.5,0xb66b5c);for(const x of [-7.2,-5.2])G.box(group,x,.92,-9.15,.045,.015,1.5,P.gold);
 solid(group,c,-9.1,.69,-10.55,1.15,1.1,1.5,0x855238);G.vessel(group,-9.1,1.25,-10.5,0xa8bcc0,.65);G.box(group,-9.1,1.3,-9.8,.6,.08,.44,0x8e5943);
 // Pull the full bed/canopy assembly north by .4 m: the foot passage now
 // includes the production grid's z=-7.5 row, opening the west window nook.
 for(let i=bedMeshStart;i<group.children.length;i++)group.children[i].position.z-=.4;
 for(let i=bedColliderStart;i<c.length;i++){c[i].minZ-=.4;c[i].maxZ-=.4;}
 // Calligraphy desk and scholar's shelf, with paper, brush rest and inkstone.
 G.table(group,6.1,-1.9,4.35,2,0x835439,.97);G.collider(c,6.1,-1.9,4.35,2);G.box(group,6.1,1.09,-1.95,1.65,.022,1.12,0xf0e3c5);for(let i=0;i<4;i++){const zz=-2.29+i*.2;G.box(group,6.03,1.108,zz,.41,.01,.035,0x3c4038).rotation.y=.1*i;G.box(group,6.04,1.115,zz,.035,.01,.14,0x3c4038).rotation.y=-.4;}G.box(group,7.58,1.13,-2.15,.56,.1,.37,0x454940);G.box(group,7.58,1.19,-2.15,.37,.015,.2,0x202d2c);beam(group,[6.98,1.17,-1.7],[7.45,1.17,-1.15],.025,0x554338);G.cyl(group,4.45,1.3,-2.23,.17,.18,.4,0x718a7e);for(let i=0;i<5;i++)beam(group,[4.4+i*.03,1.39,-2.22],[4.32+i*.08,1.88+(i%2)*.1,-2.22],.014,0x694d39);
 G.chair(group,6.1,.05,0x79492e,0);G.collider(c,6.1,.05,.9,.9);
 solid(group,c,9.25,1.22,-2.3,1.5,2.25,3.25,0x976c46);for(let zz=-3.45;zz<-1.15;zz+=1.05){G.box(group,8.865,1.32,zz,.09,1.9,.86,0x463e31);for(const yy of [.6,1.2,1.8]){G.box(group,8.79,yy,zz,.32,.08,.89,P.gold);for(let j=0;j<4;j++)G.box(group,8.62,yy+.11+j*.09,zz,.3,.065,.7,[0xb4a984,0x8d6251,0x708279,0xb99362][j]);}}scroll(group,7.15,2.18,-13.12,1.15,1.55,true);
 // Wok kitchen: tiled stove, bamboo steamers, hanging utensils and preparation island.
 solid(group,c,6.25,.75,-11.55,7.2,1.35,1.5,0x92774f);G.box(group,6.25,1.47,-11.55,7.35,.12,1.65,0xc5ba96);for(let x=2.8;x<9.7;x+=.46)G.box(group,x,.73,-10.76,.42,1.2,.025,0xbca378);G.cyl(group,8.42,1.55,-11.55,.53,.53,.04,0x333d37);G.sphere(group,8.42,1.66,-11.55,.46,0x3d4946,1,.4,1);beam(group,[8.8,1.7,-11.55],[9.4,1.86,-11.55],.055,P.cedar);
 for(const x of [3.5,4.2]){for(let j=0;j<3;j++){G.cyl(group,x,1.63+j*.19,-11.6,.27,.28,.16,0xc9ac72);G.torus(group,x,1.72+j*.19,-11.6,.27,.025,0x9d814d);}G.cone(group,x,2.14,-11.6,.31,.17,0xd5bb82,12);}
 G.box(group,6.1,2.5,-13.05,3,.09,.1,P.cedar);for(let i=0;i<5;i++){beam(group,[5.05+i*.51,2.48,-12.96],[5.05+i*.51,2.06,-12.96],.022,0x444b43);G.sphere(group,5.05+i*.51,1.96,-12.96,.12,0x686d5a,.7,1.25,.2);}
 G.table(group,6.25,-8.25,4.55,1.35,0xa57a4c,1.0);G.box(group,6.3,1.1,-8.65,.84,.055,.42,0xd4b77e);for(let i=0;i<3;i++)G.sphere(group,6.03+i*.22,1.2,-8.65,.1,0xefe3c4,1,.6,.72);G.collider(c,6.25,-8.25,4.55,1.35);G.box(group,5.35,1.12,-8.25,1.48,.065,.83,0xd4b77e);for(let i=0;i<7;i++)G.sphere(group,4.85+(i%4)*.27,1.22,-8.44+Math.floor(i/4)*.32,.12,0xefe3c4,1,.6,.72);bowl(group,7.45,1.12,-8.3,0x9db5b7,.38,0x739552);for(let i=0;i<4;i++)G.sphere(group,7.3+i*.12,1.36,-8.3,.08,0x789b5d,.6,.4,1.3);
 // The high double-eaved north hall dominates lower symmetrical side halls.
 palaceRoof(roofGroup,0,4.8,-2.55,9.1,11.45,1.7,0xb7893d);
 palaceRoof(roofGroup,0,4.08,-2.55,9.8,12.0,1.42,0xa97937);
 palaceRoof(roofGroup,-6.9,3.77,-5.1,9.2,18.7,1.5,0xb38c46);
 palaceRoof(roofGroup,6.9,3.77,-5.1,9.2,18.7,1.5,0xb38c46);
 // A narrow, lower covered gallery is open to the lotus garden.
 G.box(group,12.03,.13,-2.6,2.85,.23,14.5,0xb6a982);for(let z=-9.55;z<4.5;z+=1.02)G.box(group,12.03,.255,z,2.5,.02,.92,0xc8b89a);
 shedRoof(roofGroup,12.03,3.0,-2.6,3.75,15.5,0x956f35,.025);
 for(const z of [-9.3,-5.5,-1.7,2.1,4.1]){post(group,c,13.2,z,P.red,3.06,.09);G.box(group,12.13,2.82,z,2.35,.15,.14,P.red);for(let j=0;j<2;j++)G.box(group,13.18,2.65-j*.17,z,.48-j*.16,.11,.5,P.gold);}
 for(const z of [-7.4,-3.6,.2])lattice(group,c,13.25,z,3.1,1.18,'z',0x7a5c40);
 // Detached tea pavilion: raised octagonal paving, four slender posts and open views.
 const pavilionFloor=G.cyl(group,-6.7,.14,7,3.22,3.22,.22,0xbfb69a,8);pavilionFloor.rotation.y=Math.PI/8;
 for(const x of [-9.08,-4.32])for(const z of [4.8,9.2]){post(group,c,x,z,P.red,3.05,.1);G.cyl(group,x,.2,z,.2,.25,.33,0x909a87,8);}
 for(const z of [4.8,9.2])G.box(group,-6.7,2.87,z,5.04,.2,.19,P.red);for(const x of [-9.08,-4.32])G.box(group,x,2.87,7,.19,.2,4.6,P.red);
 palaceRoof(roofGroup,-6.7,3.09,7,6.75,5.7,1.25,0xbb924a);
 for(const x of [-8.4,-5]){G.box(group,x,.86,9.1,1.7,.095,.16,P.red);G.collider(c,x,9.1,1.7,.16);}
 // A framed moon opening makes the transition from residence to side gallery legible.
 G.box(group,10.32,2.98,1.95,.35,.24,3.35,0xbeac84);for(const z of [.45,3.45])G.box(group,10.32,1.5,z,.3,2.85,.27,0xcbb994);
 for(const z of [.45,3.45])G.collider(c,10.32,z,.25,.28);
 // The scholar's room is a working collection: rolled paper, stitched books,
 // a flower vase, brush rack and a low ceramic display beside the courtyard.
 const scholarShelf=openShelf(group,c,8.1,-4.85,1.6,1.95,.55,0x825336);
 for(let j=0;j<4;j++)boundBook(scholarShelf,-.4,.33+j*.11,0,.6,.39,[0x708b83,0xa57e5c,0x858d6e,0xb29c70][j]);
 for(const x of [-.5,-.18,.14]){const roll=G.cyl(scholarShelf,x,1.64,0,.075,.075,.55,0xe7d7ad,8);roll.rotation.x=Math.PI/2;G.cyl(scholarShelf,x,1.64,.3,.081,.081,.045,0x9e674b,8).rotation.x=Math.PI/2;}
 flowerBranches(scholarShelf,.46,.91,.04,0xe4b2b0);G.vessel(scholarShelf,.5,.31,0,0xa6b9b4,.56);
 const porcelain=openShelf(group,c,-9.55,.17,1.85,2.0,.5,0x8a5d3c,Math.PI/2);
 for(const x of [-.53,.04,.59]){bowl(porcelain,x,.91,0,0xb6cdd0,.19,0xcfd8c6);G.vessel(porcelain,x,1.49,0,[0x86a8a8,0xc3d0bb,0x94b5b5][Math.round((x+.53)/.57)]||0xa7bdb7,.47);}
 foldedCloth(porcelain,0,.32,0,1.1,.38,0xac8463);
 // Canopy curtains gather at the bedposts, leaving the inhabited side open.
 for(const x of [-7.68,-4.72]){G.box(group,x,2.03,-11.68,.4,1.25,.055,0xc19d82);for(let j=0;j<3;j++)G.box(group,x+(j-1)*.095,2.04,-11.64,.027,1.23,.016,0xa47c67);G.box(group,x,1.76,-11.58,.46,.1,.05,P.gold);}
 for(let j=0;j<3;j++)boundBook(group,-9.1,1.38+j*.095,-10.38,.63,.42,[0x627e75,0xa68056,0x92836b][j]);
 // Pantry implements stay on the existing counter and wall, out of circulation.
 G.box(group,3.52,2.52,-13.0,1.6,.1,.48,0x835f3d);for(let i=0;i<3;i++){G.vessel(group,2.99+i*.49,2.59,-12.97,[0x92a194,0xb29467,0xccbe98][i],.5);}
 G.cyl(group,5.48,1.7,-11.65,.2,.2,.3,0xb19265,10);for(let i=0;i<5;i++)beam(group,[5.38+i*.05,1.78,-11.65],[5.28+i*.1,2.21,-11.65],.025,0x987a4b);

 // Painted fascia with gilded roundels ties the ceremonial hall to the gates.
 for(const z of [-7.05]){G.box(group,0,4.22,z+.19,5.25,.2,.07,0x356f72);for(const x of [-2.15,-1.42,1.42,2.15])G.sphere(group,x,4.22,z+.25,.085,0xd7b763,1,1,.35);}
 // Palace textiles and a matched pair of bronze incense vessels on the terrace.
 G.torus(group,-6.2,.94,-9.55,.38,.035,0xd5b471);G.sphere(group,-6.2,.958,-9.55,.2,0xc59e58,1,.04,.7);
 for(const x of [-2.0,2.0]){
  G.box(group,x,.15,8.5,.92,.2,.92,0xd0c6a6);G.cyl(group,x,.56,8.5,.28,.34,.71,0x7c8d71,10);G.sphere(group,x,.96,8.5,.42,0x85957a,1,.62,1);G.cyl(group,x,1.22,8.5,.26,.31,.2,0xada773,10);G.cone(group,x,1.48,8.5,.35,.33,0xb8ad71,8);G.sphere(group,x,1.72,8.5,.09,0xd7bb6f);
  for(const dx of [-.43,.43]){const handle=G.torus(group,x+dx,1.06,8.5,.18,.04,0xb3a874,0);handle.rotation.y=Math.PI/2;}G.collider(c,x,8.5,.85,.85);
 }
 // A stone medallion marks the axis without turning decoration into an obstacle.
 G.cyl(group,0,.152,11.0,1.4,1.4,.035,0xb1ab8e,32);G.torus(group,0,.179,11.0,1.23,.035,0xe6d7b0);
 for(let i=0;i<8;i++){const angle=i*Math.PI/4;const petal=G.sphere(group,Math.sin(angle)*.65,.181,11+Math.cos(angle)*.65,.37,0xd9c596,.45,.028,1.1);petal.rotation.y=angle;}
 G.cyl(group,0,.184,11,.26,.26,.025,0xc4ab6d,12);
 for(const [x,z] of [[-12,9.4],[-10.65,17.0],[12.4,14.7]]){
  G.collider(c,x,z,2.75,2.75);
  G.sphere(group,x,.06,z,1,0x7e956d,1.5,.06,1.15);for(let i=0;i<4;i++){const a=i*2.2;G.sphere(group,x+Math.sin(a)*.65,.48,z+Math.cos(a)*.5,.64,0x78935e,1,.7,1);G.sphere(group,x+Math.sin(a)*.65,.77,z+Math.cos(a)*.5,.37,0x9eb279,1,.45,1);}
 }
 // Hanging red lanterns and tassels across the eaves.
 for(const x of [-8.8,-4.5,4.5,8.8]){G.cyl(group,x,3.16,3.05,.018,.018,.85,P.gold,6);G.sphere(group,x,2.64,3.05,.38,0xce5540,1,1.15,1);for(const yy of [2.28,3])G.cyl(group,x,yy,3.05,.22,.22,.06,P.gold);for(let i=0;i<4;i++)G.cyl(group,x+(i-1.5)*.035,2.04,3.05,.015,.015,.35,0xd19c55,5);}
 // Water garden with traversable arched bridge and open central approach.
 G.box(group,7.2,.09,12,7.7,.14,6.1,0x808e7e);G.box(group,7.2,.18,12,7.2,.035,5.65,0x72a5a1);G.collider(c,7.2,10.1,7.3,1.75);G.collider(c,7.2,13.9,7.3,1.75);
 for(let i=0;i<9;i++){const xx=3.1+i*.98;stone(group,xx,9.05,.76);stone(group,xx,14.93,.76);}for(const xx of [3.2,11.2])for(const zz of [9.9,10.8,13.2,14.1])stone(group,xx,zz,.72);
 for(let i=0;i<17;i++){const xx=3.05+i*.51,yy=.18+Math.sin(i/16*Math.PI)*.3;G.box(group,xx,yy,12,.48,.14,1.68,0xaf8b58);if(i%4===0)for(const zz of [11.12,12.88]){G.cyl(group,xx,yy+.5,zz,.065,.065,1.05,P.red,8);G.sphere(group,xx,yy+1.05,zz,.09,P.gold);}}
 for(const zz of [11.12,12.88])for(let i=0;i<8;i++){const xa=3.05+i*1.02,xb=xa+1.02;beam(group,[xa,.93+Math.sin(i/8*Math.PI)*.3,zz],[xb,.93+Math.sin((i+1)/8*Math.PI)*.3,zz],.055,P.red);G.collider(c,(xa+xb)/2,zz,1.02,.12);}
 for(const [x,z,r] of [[5.2,10.3,.3],[9.4,13.6,1.4],[7.5,14.1,2.1]])koi(group,x,z,0xe4ab55,r);for(const [x,z] of [[5.7,14.1],[6.25,13.6],[9.9,10.3]]){G.cyl(group,x,.22,z,.37,.37,.025,0x6d9871,12);G.sphere(group,x,.3,z,.15,0xe8bfba,1,.45,1);}
 // Scholar's rock, round stone table, stools and a leafy willow.
 solid(group,c,-8.85,.18,11.55,2.8,.26,2.25,0x929984);for(const [dx,yy,dz,s] of [[0,.8,0,.8],[-.35,1.65,0,.65],[.24,2.4,.12,.5],[.55,1.7,-.22,.42]])G.sphere(group,-8.85+dx,yy,11.55+dz,s,0x7f8f83,.66,1.1,.52);
 G.cyl(group,-6.7,.55,7,.3,.5,1,0x9ba38b,10);G.cyl(group,-6.7,1.05,7,1.1,1.1,.16,0xc2c3a3,20);G.collider(c,-6.7,7,2.2,2.2);teaSet(group,-6.7,1.14,7,0x92afb0);for(const [x,z] of [[-8.35,7],[-5.05,7],[-6.7,8.65]]){G.cyl(group,x,.36,z,.36,.45,.65,0x9aa287,10);G.cyl(group,x,.73,z,.43,.43,.1,0xc0c1a2,12);G.collider(c,x,z,.78,.78);}
 G.sphere(group,-11.8,.055,15.7,1,0x7f956c,2.35,.07,2.35);G.collider(c,-11.8,15.7,4.7,4.7);
 post(group,c,-11.8,15.7,0x77664d,3.8,.23);for(let i=0;i<8;i++){const a=i*Math.PI/4,xx=-11.8+Math.cos(a)*1.4,zz=15.7+Math.sin(a)*1.4;beam(group,[-11.8,2.7,15.7],[xx,4.1,zz],.09,0x77664d);G.sphere(group,xx,3.65,zz,.85,0x91a974,.85,.8,.85);for(let j=0;j<3;j++){const bx=xx+Math.sin(j*2.3)*.5,bz=zz+Math.cos(j*2.3)*.5;beam(group,[bx,3.8,bz],[bx+.12,1.8+(j%2)*.4,bz],.025,0x789361);for(let k=0;k<4;k++)G.sphere(group,bx+.1,3.4-k*.4,bz,.19,0x839f67,.4,1.6,.5);}}
 bamboo(group,c,13.4,6.1,1.3);bamboo(group,c,-12.4,-6.5,1.35);bamboo(group,c,12.2,-11,1.25);
 // A formal southern palace gate and ceremonial forecourt, open on the axis.
 G.box(group,0,.075,15.9,10.2,.12,5.1,0xcfc2a1);for(let x=-4.55;x<5;x+=1.3)for(let z=14.05;z<18.1;z+=1.1)G.box(group,x,.15,z,1.23,.025,1.04,0xddd0ad);
 for(const x of [-5.2,5.2]){solid(group,c,x,1.35,17.6,5.0,2.7,.5,0xb85440);G.box(group,x,2.78,17.6,5.2,.18,.65,0xd1af63);G.box(group,x,.3,17.6,5.2,.34,.68,0xbbae8d);}
 for(const x of [-2.7,2.7])for(const z of [16.75,18.15]){post(group,c,x,z,P.red,3.7,.18);G.cyl(group,x,.28,z,.3,.34,.4,0xbab49b,10);G.cyl(group,x,2.93,z,.2,.2,.14,P.gold,10);}
 G.box(group,0,3.38,17.4,5.9,.4,.32,P.red);G.box(group,0,2.96,17.22,2.0,.61,.16,0x3d6154);G.box(group,0,2.98,17.11,1.73,.37,.05,0xd2b26a);
 palaceRoof(roofGroup,0,3.7,17.43,7.2,3.8,1.0,0xb98a3e);
 // Stone balustrades frame, rather than block, the processional space.
 for(const x of [-2.8,2.8])stoneBalustrade(group,c,x,5.0,4.0,'z');
 // Openings in the terrace rail align with the newly enclosed side-room doors.
 for(const [x,w] of [[-8.45,1.2],[-4.55,.4],[4.85,1.0],[8.75,.6]])stoneBalustrade(group,c,x,3.55,w);
 for(const x of [-2.9,2.9]){G.box(group,x,.23,14.25,.85,.35,.85,0xc8bfa0);G.sphere(group,x,.79,14.25,.4,0xb7b59a,.8,1,.85);G.sphere(group,x,1.18,14.1,.24,0xcec5a7,.85,1.1,1);G.sphere(group,x,.55,14.57,.28,0xaeb293,.55,.8,1.3);G.collider(c,x,14.25,.85,.85);}

 lantern(group,c,-3.15,15.5,0xcf5641,3.75,.38);lantern(group,c,3.15,15.5,0xcf5641,3.75,.38);
 // Each inhabited volume receives its own ceiling; the processional court,
 // lotus garden and passages between detached pavilions remain under the sky.
 palaceCeiling(roofGroup,c,cameraColliders,-6.225,-10.025,8.25,6.65,3.85);
 palaceCeiling(roofGroup,c,cameraColliders,-7,-1.95,6.7,9.5,3.85);
 palaceCeiling(roofGroup,c,cameraColliders,6.225,-9.995,8.25,6.71,3.85);
 // The kitchen is L-shaped around the ceremonial hall, never over its plinth.
 palaceBox(roofGroup,c,cameraColliders,7,3.94,-6.195,6.7,.18,.89,0x9c794f);
 palaceCeiling(roofGroup,c,cameraColliders,7,-1.475,6.7,8.55,3.85);
 palaceCeiling(roofGroup,c,cameraColliders,0,-10.0,4.2,6.7,3.85);
 palaceCeiling(roofGroup,c,cameraColliders,0,-2.295,7.3,8.69,4.18,true);
 // Floor boxes keep the close camera above the raised plinths and terraces.
 for(const b of [[-6.3,-5,8.25,17,.2],[6.3,-5,8.25,17,.2],[0,-10.0,4.2,6.7,.2],[0,-2.675,7.2,9.55,.35],[0,-4.3,3.55,3.4,.5]])cameraColliders.push({minX:b[0]-b[2]/2,maxX:b[0]+b[2]/2,minY:-.05,maxY:b[4],minZ:b[1]-b[3]/2,maxZ:b[1]+b[3]/2});
 cameraColliders.push({minX:-30,maxX:30,minY:-1,maxY:0,minZ:-40,maxZ:40});
 // Large solid furnishings also protect the close camera without testing every
 // lattice bar or teacup. These do not change the walking collision map.
 for(const [x,z,w,d,top] of [[0,-5.3,2.42,.22,2.93],[0,-6.23,4.42,.2,3.82],[-1.2,-1.65,.8,.85,1.98],[1.2,-1.65,.8,.85,1.98],[-6.2,-10.1,3.5,3.8,1.8],[-9.1,-10.95,1.15,1.5,1.24],[9.25,-2.3,1.5,3.25,2.35],[8.1,-4.85,1.6,.55,1.95],[0,-12.55,2.85,.62,2.25],[-9.55,.2,.5,1.85,2.0]])cameraColliders.push({minX:x-w/2,maxX:x+w/2,minY:.2,maxY:top,minZ:z-d/2,maxZ:z+d/2});
 // Four soft, non-shadow-casting lights illuminate the chambers and one
 // ceremonial lantern lights the throne room without expensive extra maps.
 for(const [x,z] of [[-6.6,-9.0],[-7,-1.7],[6.4,-9.7],[7,-1.4]]){
  G.cyl(roofGroup,x,3.51,z,.022,.022,.52,P.gold,6);G.lamp(roofGroup,x,3.16,z,0xe7ad65,.27);
  palaceInteriorLight(group,x,3.09,z,20,11);
 }
 G.cyl(roofGroup,0,3.86,-2.6,.025,.025,.58,P.gold,6);G.lamp(roofGroup,0,3.47,-2.6,0xe6bc78,.34);
 palaceInteriorLight(group,0,3.39,-2.6,27,12);palaceInteriorLight(group,0,3.25,-9.9,12,7);

 const walkableSurfaces=[...estateSurfaces,
 {minX:-10.425,maxX:-2.175,minZ:-13.5,maxZ:3.5,y:.2},
 {minX:2.175,maxX:10.425,minZ:-13.5,maxZ:3.5,y:.2},
 {minX:-2.225,maxX:2.225,minZ:-13.5,maxZ:-9.4,y:.2},
 {minX:-1.4,maxX:1.4,minZ:-9.35,maxZ:3.3,y:.13},
 {minX:-.95,maxX:.95,minZ:-2.975,maxZ:1.875,y:.422},
 {minX:-10.3,maxX:-3.8,minZ:-5.125,maxZ:1.125,y:.29},
 {minX:-10.0,maxX:-4.1,minZ:-4.825,maxZ:.825,y:.33},
 {minX:-10.75,maxX:10.75,minZ:2.2,maxZ:3.9,y:.325},
 {minX:-10.5,maxX:10.5,minZ:3.5,maxZ:10.9,y:.145},
 {minX:10.605,maxX:13.455,minZ:-9.85,maxZ:4.65,y:.265},
 {minX:-8.97,maxX:-4.43,minZ:4.02,maxZ:9.98,y:.25},
 {minX:-9.68,maxX:-3.72,minZ:4.73,maxZ:9.27,y:.25},
 {minX:-3.6,maxX:3.6,minZ:-7.45,maxZ:2.1,y:.35},
 {minX:-1.775,maxX:1.775,minZ:-6.0,maxZ:-2.6,y:.5},
 {minX:-1.9,maxX:1.9,minZ:2.95,maxZ:3.45,y:.15},
 {minX:-1.9,maxX:1.9,minZ:2.52,maxZ:3.02,y:.22},
 {minX:-1.9,maxX:1.9,minZ:2.09,maxZ:2.59,y:.29},
 {minX:-5.1,maxX:5.1,minZ:13.35,maxZ:18.45,y:.163},
 {minX:-1.5,maxX:1.5,minZ:8.5,maxZ:19.5,y:.05}
 ];
 const floorAt=(x,z)=>{let y=Math.max(.015,...[...walkableSurfaces,...(group.userData.rugSurfaces||[])].filter(s=>x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ).map(s=>s.y));if(x>3&&x<11.3&&Math.abs(z-12)<.8)y=Math.max(y,.25+Math.sin((x-3.05)/8.16*Math.PI)*.3);return y;};
 const groundPoint=position=>[position[0],floorAt(position[0],position[2]),position[2]];
 // Seven enclosed rooms, not just the five activity stations. Kitchen uses an
 // L-shaped footprint so its west edge cannot include the ceremonial hall.
 const interiorRooms=[
  {id:'bedroom',name:'寝殿',minX:-10.35,maxX:-2.1,minZ:-13.35,maxZ:-6.7,ceiling:3.85},
  {id:'tea',name:'西偏殿',minX:-10.35,maxX:-3.65,minZ:-6.7,maxZ:2.8,ceiling:3.85},
  {id:'kitchen',name:'御膳房',minX:2.1,maxX:10.35,minZ:-13.35,maxZ:-5.75,ceiling:3.85,exclude:[{minX:2.1,maxX:3.65,minZ:-6.64,maxZ:-5.75}]},
  {id:'study',name:'东书阁',minX:3.65,maxX:10.35,minZ:-5.75,maxZ:2.8,ceiling:3.85},
  {id:'hall',name:'仪殿',minX:-3.65,maxX:3.65,minZ:-6.64,maxZ:2.05,ceiling:4.18},
  {id:'archive',name:'藏书廊',minX:-2.1,maxX:2.1,minZ:-13.35,maxZ:-6.64,ceiling:3.85},
  {id:'bath',name:'竹苑浴房',minX:-27,maxX:-19,minZ:-28,maxZ:-20,ceiling:3.45}
 ];
 const explorationTargets=[
  ['cn-bedroom-east','寝殿东侧',-3.15,-9.5],['cn-bedroom-west','寝殿窗边',-8.85,-8.25],['cn-bedroom-south','寝殿门内',-4.15,-7.25],
  ['cn-tea-front','西偏殿门内',-6.3,1.5],['cn-tea-west','西偏殿窗边',-9.5,-4.5],['cn-tea-north','西偏殿后部',-7,-5.6],['cn-tea-east','西偏殿侧门',-4.25,-.3],
  ['cn-kitchen-north','御膳房灶前',6.5,-9.55],['cn-kitchen-east','御膳房廊门',9.5,-8.6],['cn-kitchen-south','御膳房南侧',7,-6.55],['cn-kitchen-west','御膳房西侧',3.1,-9.55],
  ['cn-study-front','书阁门内',7.5,1.3],['cn-study-southwest','书阁侧门',4.4,-.2],['cn-study-north','书阁后部',6.5,-4.9],['cn-study-east','书阁月门',9.55,1.7],
  ['cn-hall-front','仪殿门内',0,.7],['cn-hall-west','仪殿西侧',-2.85,-3.25],['cn-hall-east','仪殿东侧',2.85,-3.25],
  ['cn-archive-center','藏书廊中央',0,-9.8],['cn-archive-shelf','藏书廊书架前',0,-11.55],['cn-archive-south','藏书廊南端',0,-7.35],
  ['cn-gallery-north','东回廊北端',12,-8.8],['cn-gallery-center','东回廊中段',12,-4.8],['cn-gallery-south','东回廊入口',12,3.7],
  ['cn-pavilion','园亭',-6.7,5.2],['cn-processional-court','仪殿前庭',0,6.5],['cn-south-gate','宫门',0,18.3],['cn-bridge','荷塘曲桥',7.2,12],
  ['cn-bath-tub','浴房沐浴区',-23.1,-25],['cn-bath-basin','浴房盥洗区',-21,-26.4],['cn-bath-toilet','屏后净室',-20,-21.5],['cn-bath-linens','浴房更衣储物',-24.8,-22.4],
  ['cn-north-court','北庭梅苑',0,-23],['cn-north-pavilion','北庭读书亭',0,-28.5],['cn-north-west','梅苑西侧',-11,-24],['cn-north-east','梅苑东侧',11,-24],
  ['cn-west-bamboo-north','竹廊北端',-23,-15],['cn-west-bamboo-middle','竹廊中段',-23,-6],['cn-west-bamboo-south','竹廊南端',-23,3],
  ['cn-west-garden','西园茶亭',-20,13],['cn-east-gallery-north','东苑廊北端',23,-17],['cn-east-gallery-middle','东苑廊中段',23,-10],['cn-east-gallery-south','东苑廊南端',23,-3],
  ['cn-east-lotus-bridge','东苑荷桥',21,8],['cn-east-lotus-north','东苑荷塘北岸',21,.3],['cn-east-lotus-south','东苑荷塘南岸',21,16],
  ['cn-south-court','南苑迎宾庭',0,27],['cn-south-west-garden','迎宾庭西园',-19,30],['cn-south-east-garden','迎宾庭东园',19,30],['cn-outer-gate','南苑外门',0,37.5]
 ].map(([id,name,x,z])=>({id,name,position:groundPoint([x,0,z])}));
 // Corridor and terrace thresholds are independently traversed both ways too.
 for(const [id,name,axis,at,from,to,top,rooms] of [
  ['cn-west-terrace','西殿露台','x',3.55,-7.72,-4.88,3.5,['courtyard','tea']],
  ['cn-east-terrace','东殿露台','x',3.55,5.48,8.32,3.5,['courtyard','study']],
  ['cn-gallery-entry','东回廊入口','x',4.1,10.75,12.95,2.745,['courtyard','gallery']],
  ['cn-pavilion-entry','园亭入口','x',4.8,-8.8,-4.6,2.77,['courtyard','pavilion']],
  ['cn-gate-entry','宫门通道','x',17.4,-2.36,2.36,2.655,['forecourt','courtyard']],
  ['cn-north-pavilion-entry','读书亭门廊','x',-27.15,-4.55,4.55,3.25,['north-pavilion','north-court']],
  ['cn-west-gallery-north','竹廊北口','x',-16.5,-24.45,-21.55,3.04,['west-garden','west-gallery']],
  ['cn-west-gallery-south','竹廊南口','x',4.5,-24.45,-21.55,3.04,['west-gallery','west-garden']],
  ['cn-west-pavilion-entry','西园茶亭门廊','x',9.9,-24.45,-17.55,2.95,['west-garden','west-pavilion']],
  ['cn-east-gallery-north','东苑长廊北口','x',-18.5,21.55,24.45,3.04,['north-court','east-gallery']],
  ['cn-east-gallery-south','东苑长廊南口','x',-1.5,21.55,24.45,3.04,['east-gallery','east-garden']],
  ['cn-east-bridge-north','东苑荷桥北口','x',1.3,19.8,22.2,5,['east-garden','east-bridge']],
  ['cn-east-bridge-south','东苑荷桥南口','x',14.7,19.8,22.2,5,['east-bridge','east-garden']],
  ['cn-outer-gate-entry','南苑外门门廊','x',36.5,-3.3,3.3,3.4,['forecourt','south-court']]
 ])doorway(id,name,axis,at,from,to,top,rooms,.2);
 const pavilionEntry=doorways.find(d=>d.id==='cn-pavilion-entry');pavilionEntry.b[2]=5.4;
 for(const door of doorways){door.a=groundPoint(door.a);door.b=groundPoint(door.b);door.height=door.top-Math.max(door.a[1],door.b[1]);}
 const facilities=[
  {id:'entrance',name:'迎宾与入口',targets:['cn-outer-gate','cn-south-court','cn-south-gate'],furnishings:['门楼','迎宾长椅','引路灯笼']},
  {id:'reception',name:'会客与礼仪',targets:['cn-hall-front','cn-tea-front'],furnishings:['仪座与云纹屏','雕花茶桌','茶具与席毯']},
  {id:'dining-kitchen',name:'用餐与备膳',targets:['cn-tea-front','cn-kitchen-north','cn-kitchen-south'],furnishings:['坐凳与茶桌','蒸笼灶台','备餐案与餐具']},
  {id:'sleeping',name:'寝居',targets:['cn-bedroom-east','cn-bedroom-west'],furnishings:['雕花架子床','帷幔与刺绣被面','床边书柜']},
  {id:'bathing',name:'沐浴与更衣',targets:['cn-bath-tub','cn-bath-linens'],furnishings:['石浴池','毛巾与换衣凳','多层布草架']},
  {id:'washroom',name:'盥洗与净室',targets:['cn-bath-basin','cn-bath-toilet'],furnishings:['水盆与铜龙头','壁镜','屏后坐便']},
  {id:'storage-service',name:'储藏与勤务',targets:['cn-archive-shelf','cn-study-north','cn-kitchen-east'],furnishings:['藏书架','卷轴柜','厨房侧门与回廊']}
 ];
 group.userData.facilities=facilities;
 group.userData.interiorRooms=interiorRooms;group.userData.doorways=doorways;group.userData.explorationTargets=explorationTargets;
 packLot(group,roofGroup);
 return {group,colliders,cameraColliders,bounds,spawn:[0,0,34],roofGroup,walkableSurfaces,interiorRooms,doorways,explorationTargets,facilities,stations:[
 {id:'cn-tea',name:'西偏殿 · 宫苑茶叙',action:'沏茉莉花茶',position:[-4.65,0,1.4],color:'#96b19a',npcName:'Lin',npcAction:'tea',npcLabel:'温杯沏茉莉花茶',npcPosition:[-5.7,0,-.4],workTarget:[-5.7,1.2,-1.1],npcRotation:Math.PI,route:[[-8,0,-.1],[-8,0,1.7],[-4.2,0,1.7],[-8,0,1.7]]},
 {id:'cn-calligraphy',name:'东书阁 · 翰墨书房',action:'写书法',position:[7.5,0,1.2],color:'#baaa84',npcName:'Wen',npcAction:'calligraphy',npcLabel:'正在挥毫习字',npcPosition:[7.45,0,-.4],workTarget:[7.4,1.17,-1.15],npcRotation:Math.atan2(-.05,-.75),route:[[7.65,0,.1],[7.8,0,1.6],[4.5,0,1.6],[7.8,0,1.6]]},
 {id:'cn-cooking',name:'御膳房 · 手作点心',action:'包饺子',position:[7.5,0,-9.5],color:'#e3b175',npcName:'Jia',npcAction:'knead',npcLabel:'正在捏出手工饺子',npcPosition:[6.25,0,-9.4],workTarget:[6.25,1.2,-8.65],npcRotation:0,route:[[8.95,0,-8.2],[8.95,0,-9.55],[6.5,0,-9.55],[8.95,0,-9.55]]},
 {id:'cn-rest',name:'寝殿 · 雕花卧榻',action:'卧榻小憩',position:[-3.15,0,-8.2],color:'#c99aaa',npcName:'Lan',npcAction:'read',npcLabel:'倚窗静读',npcPosition:[-3.7,0,-9.7],workTarget:[-4.6,.84,-9.55],npcRotation:Math.atan2(-.9,.15)},
 {id:'cn-garden',name:'御花园 · 曲桥赏荷',action:'观鱼赏荷',position:[7.2,0,12],color:'#82bcb2',npcName:'Bo',npcAction:'garden',npcLabel:'在荷塘边观鱼',npcPosition:[9.2,0,12],workTarget:[9.4,.18,13.6],npcRotation:Math.atan2(.2,1.6),route:[[2.15,0,11.9],[1.5,0,9.1],[-2,0,9.1]]}
 ]};
}
