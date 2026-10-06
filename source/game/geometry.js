import * as THREE from 'three';
const materials = new Map();
const bands = new THREE.DataTexture(new Uint8Array([100,166,220,255]),4,1,THREE.RedFormat);bands.minFilter=THREE.NearestFilter;bands.magFilter=THREE.NearestFilter;bands.needsUpdate=true;
export function material(color, extra={}) { const key=JSON.stringify([color,extra]); if(!materials.has(key)) materials.set(key,new THREE.MeshToonMaterial({color,gradientMap:bands,...extra})); return materials.get(key); }
export function mesh(g,geo,color,x=0,y=0,z=0,extra={}){const m=new THREE.Mesh(geo,material(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
export function box(g,x,y,z,w,h,d,c,rot=0){const m=mesh(g,new THREE.BoxGeometry(w,h,d),c,x,y,z);m.rotation.y=rot;return m;}
export function cyl(g,x,y,z,rt,rb,h,c,n=12){return mesh(g,new THREE.CylinderGeometry(rt,rb,h,n),c,x,y,z);}
export function sphere(g,x,y,z,r,c,sx=1,sy=1,sz=1){const m=mesh(g,new THREE.SphereGeometry(r,12,8),c,x,y,z);m.scale.set(sx,sy,sz);return m;}
export function cone(g,x,y,z,r,h,c,n=4,rot=Math.PI/4){const m=mesh(g,new THREE.ConeGeometry(r,h,n),c,x,y,z);m.rotation.y=rot;return m;}
export function torus(g,x,y,z,r,t,c,rx=Math.PI/2){const m=mesh(g,new THREE.TorusGeometry(r,t,6,24),c,x,y,z);m.rotation.x=rx;return m;}
export function line(g,points,c=0xffffff){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:c,transparent:true,opacity:.23}));g.add(m);return m;}
export function collider(arr,x,z,w,d,pad=0){arr.push({minX:x-w/2-pad,maxX:x+w/2+pad,minZ:z-d/2-pad,maxZ:z+d/2+pad});}
export function table(g,x,z,w=2,d=1.3,c=0x9c6946,h=1){box(g,x,h,z,w,.15,d,c);for(const dx of [-1,1])for(const dz of [-1,1])box(g,x+dx*(w/2-.16),h/2,z+dz*(d/2-.16),.12,h,.12,c);}
export function chair(g,x,z,c=0x81684f,rot=0){const q=new THREE.Group();q.position.set(x,0,z);q.rotation.y=rot;g.add(q);box(q,0,.6,0,.8,.15,.8,c);box(q,0,1.12,-.34,.8,.95,.12,c);for(const a of [-.28,.28])for(const b of [-.28,.28])box(q,a,.28,b,.1,.56,.1,c);return q;}
export function vessel(g,x,y,z,c=0xddd0ad,s=1){cyl(g,x,y+.28*s,z,.22*s,.28*s,.56*s,c);cyl(g,x,y+.59*s,z,.15*s,.2*s,.18*s,c);torus(g,x,y+.69*s,z,.15*s,.035*s,c);}
export function plant(g,x,z,leaf=0x799569,s=1,flowers=null){cyl(g,x,.26*s,z,.3*s,.22*s,.5*s,0xad7458);for(let i=0;i<5;i++){const a=i*2.4;sphere(g,x+Math.sin(a)*.22*s,.8*s+Math.cos(i)*.15*s,z+Math.cos(a)*.22*s,.3*s,leaf,.7,1.8,.7);if(flowers)sphere(g,x+Math.sin(a)*.26*s,1.2*s,z+Math.cos(a)*.26*s,.1*s,flowers);} }
export function tree(g,x,z,leaf=0x9daf6b,s=1){cyl(g,x,1.55*s,z,.15*s,.25*s,3.1*s,0x85624f,8);for(const [dx,dy,dz,r] of [[0,3.5,0,1.7],[-1,3,0,1.1],[.9,3.1,.5,1.2]])sphere(g,x+dx*s,dy*s,z+dz*s,r*s,leaf,1,.8,1);}
export function rug(g,x,z,w,d,c,accent){g.userData.rugLayers??={};const key=x+','+z;const layer=g.userData.rugLayers[key]||0;g.userData.rugLayers[key]=layer+1;const y=.245+layer*.04;g.userData.rugSurfaces??=[];g.userData.rugSurfaces.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,y:y+.04});box(g,x,y,z,w,.08,d,c);if(accent){for(const zz of [-1,1])box(g,x,y+.05,z+zz*(d/2-.12),w-.12,.02,.08,accent);for(const xx of [-1,1])box(g,x+xx*(w/2-.12),y+.05,z,.08,.02,d-.12,accent);}}
export function cushion(g,x,z,c,s=.75){box(g,x,.23,z,s,.28,s,c);box(g,x,.39,z,s*.8,.09,s*.8,c);}
export function lamp(g,x,y,z,c=0xffd5a0,s=.4){cyl(g,x,y,z,s,s,.7,c,12);cyl(g,x,y+.39,z,s*1.1,s*1.1,.08,0x654f42);cyl(g,x,y-.39,z,s*1.1,s*1.1,.08,0x654f42);}
export function bed(g,x,z,c=0xd99a8a,w=2.5,d=3.4){box(g,x,.25,z,w,.5,d,0x82634b);box(g,x,.59,z,w-.1,.3,d-.1,0xf3e5ce);box(g,x,.78,z+.32,w-.08,.15,d-.64,c);for(const dx of [-.55,.55])box(g,x+dx,.83,z-d/2+.52,.85,.07,.55,0xfff6e3);box(g,x,1,z-d/2,w+.1,1.6,.16,0x82634b);}
export function roof(g,x,y,z,w,d,c){const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,1.5);shape.lineTo(w/2,0);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});const m=mesh(g,geo,c,x,y,z-d/2);return m;}
export function baseLot(g,ground=0x9bb27d,path=0xd5c7a4){box(g,0,-.5,0,30,1,40,ground);box(g,0,.015,14,3,.07,11,path);for(const x of [-14.6,14.6])box(g,x,.32,0,.25,.6,39.5,0xcec6ac);for(const z of [-19.6,19.6])box(g,0,.32,z,29.4,.6,.25,0xcec6ac);}
export function houseShell(g,cols,{floor=0xbba080,wall=0xe8dcc3,trim=0x775640}={}){box(g,0,.1,-5,21,.2,17,floor);box(g,0,1.9,-13.35,21,3.8,.3,wall);collider(cols,0,-13.35,21,.3);for(const x of [-10.35,10.35]){box(g,x,.55,-5,.3,1.1,17,wall);collider(cols,x,-5,.3,17);}for(const x of [-10.3,-5,0,5,10.3])box(g,x,1.9,-13.1,.17,3.8,.2,trim);for(const y of [.25,3.5])box(g,0,y,-13.12,20.9,.13,.2,trim);}
export {THREE};
