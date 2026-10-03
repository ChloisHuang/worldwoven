import {addInsetClosureSection} from './inset-closures.js';
import {registerNightFixture} from './night-lighting.js';
import * as THREE from 'three';
import {material as celMaterial} from './geometry.js?rev=R7-20261002';

// Original, procedural architecture. Scale is in metres; every doorway and the
// descending passage can be walked through with the normal two-metre avatar.
const C={sand:0xcfac70,lightSand:0xe6c58a,stone:0xcaa36c,edge:0xe0bc7b,shadow:0x8a603d,deep:0x604329,ink:0x193b44,blue:0x237381,red:0x9b4930,gold:0xc7963e,black:0x202c2b,linen:0xd4bd87};
const materials=new Map();
function mat(c,emissive=false){const k=c+':'+emissive;if(!materials.has(k))materials.set(k,celMaterial(c,{emissive:emissive?c:0,emissiveIntensity:emissive?.8:0}));return materials.get(k);}
function mesh(g,geo,c,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,x,y,z,w,h,d,c,ry=0){const m=mesh(g,new THREE.BoxGeometry(w,h,d),c,x,y,z);m.rotation.y=ry;return m;}
// R10 hand-cut stone: planar chamfers create an intentional light-catching edge,
// without intersecting a second decorative box or softening the walking plane.
function ashlar(g,x,y,z,w,h,d,c,r=.035){
  r=Math.min(r,w*.16,h*.16,d*.16);const a=[w/2,h/2,d/2],b=a.map(v=>v-r),vertices=[];
  const face=pts=>{const u=new THREE.Vector3(...pts[1]).sub(new THREE.Vector3(...pts[0])),v=new THREE.Vector3(...pts[2]).sub(new THREE.Vector3(...pts[0])),center=new THREE.Vector3();for(const p of pts)center.add(new THREE.Vector3(...p));if(u.cross(v).dot(center)<0)pts.reverse();for(let i=1;i<pts.length-1;i++)vertices.push(...pts[0],...pts[i],...pts[i+1]);};
  for(let axis=0;axis<3;axis++)for(const sign of[-1,1]){const other=[0,1,2].filter(q=>q!==axis);face([[-1,-1],[1,-1],[1,1],[-1,1]].map(pair=>{const p=[0,0,0];p[axis]=sign*a[axis];for(let j=0;j<2;j++)p[other[j]]=pair[j]*b[other[j]];return p;}));}
  for(let axis=0;axis<3;axis++){const other=[0,1,2].filter(q=>q!==axis);for(const s0 of[-1,1])for(const s1 of[-1,1])face([[-1,0],[1,0],[1,1],[-1,1]].map(([end,edge])=>{const p=[0,0,0];p[axis]=end*b[axis];p[other[0]]=s0*(edge?b[other[0]]:a[other[0]]);p[other[1]]=s1*(edge?a[other[1]]:b[other[1]]);return p;}));}
  for(const sx of[-1,1])for(const sy of[-1,1])for(const sz of[-1,1]){const signs=[sx,sy,sz];face([0,1,2].map(axis=>a.map((v,j)=>signs[j]*(j===axis?v:b[j]))));}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();return mesh(g,geo,c,x,y,z);
}
function stoneCourse(g,x,y,z,w,h,d,c=C.stone){return ashlar(g,x,y,z,w,h,d,c,Math.min(.045,h*.14));}
function cyl(g,x,y,z,rt,rb,h,c,n=12){return mesh(g,new THREE.CylinderGeometry(rt,rb,h,n),c,x,y,z);}
function ball(g,x,y,z,r,c,sx=1,sy=1,sz=1){const m=mesh(g,new THREE.SphereGeometry(r,12,8),c,x,y,z);m.scale.set(sx,sy,sz);return m;}
function torus(g,x,y,z,r,t,c,rx=0){const m=mesh(g,new THREE.TorusGeometry(r,t,6,24),c,x,y,z);m.rotation.x=rx;return m;}
function rod(g,a,b,r,c){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=cyl(g,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,r,d.length(),c,8);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
function slab(g,pts,c){const p=[],idx=[0,1,2,0,2,3];for(const i of idx)p.push(...pts[i]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.computeVertexNormals();const m=mesh(g,geo,c);m.material=mat(c);return m;}
function triangle(g,a,b,c,color){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c],3));geo.computeVertexNormals();return mesh(g,geo,color);}
function volume(arr,x,y,z,w,h,d){arr.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});}
function solid(g,cs,cam,x,y,z,w,h,d,c){ashlar(g,x,y,z,w,h,d,c);volume(cs,x,y,z,w,h,d);volume(cam,x,y,z,w,h,d);}
function urn(g,x,y,z,s=1,color=C.shadow){cyl(g,x,y+.34*s,z,.26*s,.35*s,.68*s,color);cyl(g,x,y+.76*s,z,.19*s,.25*s,.2*s,color);torus(g,x,y+.86*s,z,.19*s,.035*s,C.edge,Math.PI/2);}
function glyph(g,x,y,z,n,s=.25,color=C.ink){
  const line=(a,b)=>rod(g,[x+a[0]*s,y+a[1]*s,z],[x+b[0]*s,y+b[1]*s,z],s*.065,color);
  switch(n%8){
    case 0:torus(g,x,y+s*.22,z,s*.22,s*.055,color);line([0,0],[0,-.7]);line([-.4,-.2],[.4,-.2]);break;
    case 1:line([-.5,-.55],[0,.65]);line([0,.65],[.5,-.55]);line([-.5,-.55],[.5,-.55]);break;
    case 2:for(let i=0;i<3;i++){line([-.6,-.35+i*.35],[-.25,-.1+i*.35]);line([-.25,-.1+i*.35],[.12,-.35+i*.35]);line([.12,-.35+i*.35],[.5,-.1+i*.35]);}break;
    case 3:ball(g,x,y,z,s*.42,color,1.35,.43,.14);ball(g,x,y,z+.015,s*.15,C.edge,1,1,.18);line([.5,0],[.15,-.5]);break;
    case 4:line([0,-.7],[0,.65]);for(let i=0;i<4;i++){line([0,-.35+i*.22],[.42,-.1+i*.22]);line([0,-.35+i*.22],[-.32,-.15+i*.22]);}break;
    case 5:line([-.5,-.5],[.5,-.5]);line([-.4,-.45],[-.4,.5]);line([.4,-.45],[.4,.5]);line([-.4,.5],[.4,.5]);break;
    case 6:ball(g,x,y+s*.15,z,s*.27,color,1.2,.8,.12);line([-.1,-.04],[-.4,-.6]);line([.2,-.05],[.5,-.55]);line([.25,.3],[.7,.2]);break;
    default:line([-.5,.45],[.5,.45]);line([0,.45],[0,-.55]);line([-.5,-.55],[.5,-.55]);line([-.28,-.3],[.28,-.3]);
  }
}
function glyphPanel(parent,x,y,z,w,h,rot=0,seed=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;parent.add(g);ashlar(g,0,0,0,w,h,.07,C.edge,.012);for(const yy of [-h/2+.1,h/2-.1])box(g,0,yy,.045,w-.1,.055,.025,C.red);for(const xx of [-w/2+.1,w/2-.1])box(g,xx,0,.063,.055,h-.1,.025,C.blue);const nx=Math.max(1,Math.floor(w/.6)),ny=Math.max(1,Math.floor(h/.62));for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)glyph(g,(i-(nx-1)/2)*.54,(j-(ny-1)/2)*.57,.068,seed+i*3+j,.25);return g;}
function mural(parent,x,y,z,w,h,rot=0,seed=0){
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;parent.add(g);box(g,0,0,0,w,h,.045,0xb89359);
  for(const yy of [-h/2+.12,h/2-.12]){box(g,0,yy,.03,w-.1,.10,.015,C.blue);box(g,0,yy+.09,.031,w-.1,.05,.016,C.red);}
  const figures=Math.max(2,Math.floor(w/1.5));for(let i=0;i<figures;i++){
    const xx=(i-(figures-1)/2)*w/figures;
    // Flat painted profiles, pleated kilts and gesture lines form a mural,
    // rather than using downloaded reproductions or typographic substitutes.
    ball(g,xx,.39,.07,.19,C.red,.8,1.1,.15);box(g,xx-.055,.63,.07,.35,.12,.025,C.ink);rod(g,[xx-.06,.23,.07],[xx-.10,-.29,.07],.11,C.red);
    triangle(g,[xx-.18,-.12,.08],[xx-.38,-.5,.08],[xx+.22,-.5,.08],C.linen);
    for(const dx of [-.17,.04])rod(g,[xx+dx,-.49,.075],[xx+dx-.09,-.94,.075],.045,C.red);
    rod(g,[xx-.08,.14,.07],[xx+.39,.34,.07],.05,C.red);rod(g,[xx+.39,.34,.07],[xx+.39,.72,.07],.045,C.red);
    glyph(g,xx+.42,1.03,.075,seed+i,.19,C.ink);
  }
  for(let i=0;i<Math.floor(w/.42);i++)glyph(g,-w/2+.24+i*.42,-h/2+.42,.07,seed+i,.17,C.ink);
  return g;
}
function torch(g,x,y,z,cam,rot=0,emitLight=true){const q=new THREE.Group();q.position.set(x,y,z);q.rotation.y=rot;g.add(q);box(q,0,0,0,.17,.54,.24,C.black);rod(q,[0,-.14,0],[0,.2,.33],.055,C.gold);cyl(q,0,.24,.35,.23,.09,.22,C.gold);const flame=ball(q,0,.48,.35,.16,0xffbd56,.62,1.9,.62);flame.material=mat(0xffba50,true);const inner=ball(q,0,.44,.40,.1,0xffe5a0,.7,1.3,.7);inner.material=mat(0xffdf96,true);if(emitLight){const light=new THREE.PointLight(0xffb660,14,8,1.7);light.position.set(0,.48,.55);q.add(light);}else registerNightFixture(q,0,.48,.55,{kind:'torch',color:0xffb660,intensity:14,distance:8,dayFactor:.62});}
function column(g,cs,cam,x,z,h=5){solid(g,cs,cam,x,.16,z,1.3,.32,1.3,C.edge);cyl(g,x,h/2,z,.48,.62,h-.2,C.stone,16);volume(cs,x,h/2,z,1.2,h,1.2);volume(cam,x,h/2,z,1.2,h,1.2);for(const y of [.45,h-.73,h-.42])cyl(g,x,y,z,.59,.59,.13,y===.45?C.blue:C.gold,16);cyl(g,x,h-.27,z,.9,.52,.6,C.stone,8);stoneCourse(g,x,h+.04,z,1.75,.26,1.75,C.edge);for(let i=0;i<12;i++){const a=i*Math.PI/6;rod(g,[x+Math.sin(a)*.52,1,z+Math.cos(a)*.52],[x+Math.sin(a)*.45,h-.67,z+Math.cos(a)*.45],.018,0xb58c54);}for(const y of [1.3,1.95,2.6])glyph(g,x,y,z+.59,Math.floor(y*3+x),.25,C.red);}
// Ring-lofted carved volumes preserve one connected silhouette at neck,
// shoulders and shins, rather than stacked primitive cones and rectangular legs.
function carvedVolume(g,rings,color,{axis='y',segments=16}={}){
  const vertices=[],v=(ring,i)=>{const a=i*Math.PI*2/segments,[t,rx,rz,offset=0]=ring;return axis==='y'?[Math.cos(a)*rx,t,Math.sin(a)*rz+offset]:[Math.cos(a)*rx,Math.sin(a)*rz+offset,t];};
  const tri=(a,b,c)=>vertices.push(...a,...b,...c);
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=v(rings[j],i),b=v(rings[j],i+1),c=v(rings[j+1],i+1),d=v(rings[j+1],i);if(axis==='y'){tri(a,c,b);tri(a,d,c);}else{tri(a,b,c);tri(a,c,d);}}
  for(const [j,reverse]of[[0,true],[rings.length-1,false]])for(let i=0;i<segments;i++){const r=rings[j],center=axis==='y'?[0,r[0],r[3]||0]:[0,r[3]||0,r[0]],a=v(r,i),b=v(r,i+1);if(reverse===(axis==='z'))tri(center,b,a);else tri(center,a,b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();return mesh(g,geo,color);
}
function jackalStatue(g,x,y,z,s=1){
  const q=new THREE.Group();q.position.set(x,y,z);q.scale.setScalar(s);g.add(q);stoneCourse(q,0,.13,0,1.55,.26,1.3,C.shadow);stoneCourse(q,0,.30,0,1.3,.14,1.08,C.gold);
  for(const side of [-1,1]){const leg=carvedVolume(q,[[.48,.14,.17],[.67,.135,.16],[1.02,.17,.19],[1.48,.18,.21],[1.69,.20,.22]],C.black);leg.position.x=side*.25;ashlar(q,side*.25,.45,.16,.35,.2,.66,C.black,.055);}
  cyl(q,0,1.78,0,.4,.65,.76,C.gold,8);for(let i=0;i<8;i++)box(q,-.47+i*.135,1.76,.44,.045,.65,.04,C.blue);
  carvedVolume(q,[[2.01,.37,.25],[2.18,.43,.27],[2.53,.59,.31],[2.77,.61,.29],[2.93,.46,.24],[3.06,.24,.21]],C.black); torus(q,0,2.85,.05,.43,.095,C.gold,Math.PI/2);
  for(const side of [-1,1]){rod(q,[side*.59,2.77,0],[side*.77,1.99,.08],.17,C.black);ball(q,side*.77,1.92,.10,.17,C.black,1,1.1,1);}
  cyl(q,0,3.13,0,.22,.25,.4,C.black);ball(q,0,3.53,.02,.44,C.black,.9,1.08,.75);carvedVolume(q,[[.21,.27,.22,3.40],[.43,.235,.185,3.39],[.72,.14,.125,3.36],[.91,.105,.075,3.37]],C.black,{axis:'z'});ashlar(q,0,3.38,.94,.19,.13,.12,C.black,.035); 
  for(const side of [-1,1]){const ear=carvedVolume(q,[[0,.145,.08],[.25,.135,.065],[.65,.06,.035],[.84,.009,.009]],C.black,{segments:8});ear.position.set(side*.26,3.72,-.05);ear.rotation.z=-side*.09;ball(q,side*.22,3.6,.33,.068,C.gold,1.5,.6,.35);}
  box(q,0,3.05,.23,.55,.10,.32,C.gold);rod(q,[.83,.42,.17],[.83,3.22,.17],.04,C.gold);torus(q,.83,3.36,.17,.18,.04,C.gold);
  return q;
}
function sphinx(g,cs,cam,x,z){const q=new THREE.Group();q.position.set(x,0,z);g.add(q);box(q,0,.2,0,3.8,.4,5.9,C.shadow);box(q,0,.43,0,3.55,.16,5.6,C.edge);ball(q,0,1.14,-.7,1,C.stone,1.38,.87,2.25);for(const side of [-1,1]){ball(q,side*.97,.73,1.58,.56,C.stone,.8,.55,2.1);for(let i=0;i<3;i++)box(q,side*.97+(i-1)*.17,.76,2.67,.035,.18,.20,C.shadow);}
  ball(q,0,1.91,.9,.82,C.stone,1,.91,.8);ball(q,0,2.55,1.24,.64,C.edge,.73,1.12,.61);for(const side of [-1,1]){box(q,side*.61,2.35,1.22,.31,1.47,.65,C.stone);for(let j=0;j<7;j++)box(q,side*.61,1.82+j*.19,1.56,.34,.055,.035,C.shadow);ball(q,side*.19,2.65,1.79,.055,C.ink,1.2,.65,.4);}box(q,0,2.99,1.54,1.04,.15,.35,C.gold);box(q,0,2.48,1.80,.10,.26,.13,C.stone);box(q,0,2.26,1.79,.30,.055,.04,C.shadow);box(q,0,1.91,1.67,.16,.54,.19,C.stone);volume(cs,x,1.65,z,3.8,3.3,5.9);volume(cam,x,1.65,z,3.8,3.3,5.9);}
function balance(g,x,y,z){const q=new THREE.Group();q.position.set(x,y,z);g.add(q);box(q,0,.13,0,2.5,.26,1.15,C.shadow);box(q,0,.3,0,1.6,.09,.7,C.gold);rod(q,[0,.35,0],[0,2.0,0],.085,C.gold);ball(q,0,2.0,0,.14,C.gold);rod(q,[-1.07,1.86,0],[1.07,1.92,0],.065,C.gold);for(const side of [-1,1]){for(const dx of [-.25,.25])rod(q,[side*.88,1.90,0],[side*.88+dx,.98,0],.018,C.gold);cyl(q,side*.88,.94,0,.35,.2,.12,C.gold,16);}ball(q,-.88,1.09,0,.13,C.red,1,.9,1);rod(q,[.74,1.07,0],[1.06,1.53,0],.024,C.linen);for(let i=0;i<6;i++){const t=i/6;rod(q,[.75+t*.25,1.08+t*.4,0],[.67+t*.25,1.27+t*.4,0],.018,C.linen);rod(q,[.75+t*.25,1.08+t*.4,0],[.96+t*.25,1.13+t*.4,0],.018,C.linen);}return q;}
function sarcophagus(g,cs,cam,x,z,y=-3){const q=new THREE.Group();q.position.set(x,y,z);g.add(q);box(q,0,.17,0,2.5,.34,4.1,C.shadow);box(q,0,.42,0,2.1,.18,3.65,C.gold);box(q,0,.62,0,1.64,.3,3.35,C.blue);for(const side of [-1,1]){box(q,side*.85,.89,0,.18,.56,3.55,C.gold);for(let i=0;i<8;i++)box(q,side*.95,.9,-1.48+i*.42,.024,.31,.16,i%2?C.blue:C.red);}for(const zz of [-1.65,1.65])box(q,0,.89,zz,1.8,.56,.2,C.gold);
  // A non-graphic linen-wrapped mummy rests inside the open stone coffin.
  ball(q,0,.91,-1.02,.33,C.linen,.83,.66,1);ball(q,0,.89,.05,.36,C.linen,1.04,.58,2.42);for(let i=0;i<16;i++)box(q,0,1.096,-.69+i*.12,.64-Math.max(0,i-8)*.025,.025,.047,0xa79469);rod(q,[-.25,1.1,-.49],[.22,1.12,.06],.065,C.linen);rod(q,[.25,1.12,-.49],[-.22,1.14,.06],.065,C.linen);ball(q,0,.99,-1.16,.25,C.gold,.88,.37,1);for(const side of [-1,1])ball(q,side*.1,1.08,-1.18,.035,C.ink,1,.3,1);volume(cs,x,y+.6,z,2.5,1.2,4.1);volume(cam,x,y+.6,z,2.5,1.2,4.1);
  const lid=new THREE.Group();lid.position.set(x+3.5,y+.75,z-.5);lid.rotation.z=.13;lid.rotation.x=-.36;g.add(lid);box(lid,0,.6,0,1.45,2.8,.27,C.gold);ball(lid,0,1.29,.2,.4,C.gold,.85,1.1,.38);for(const side of [-1,1]){box(lid,side*.43,1.05,.2,.24,1.13,.15,C.blue);for(let j=0;j<6;j++)box(lid,side*.44,.62+j*.17,.29,.22,.04,.024,C.gold);ball(lid,side*.12,1.43,.37,.045,C.ink,1.4,.7,.4);}for(let j=0;j<7;j++)glyph(lid,0,-.55+j*.22,.2,j,.13,C.blue);volume(cs,x+3.5,y+1.6,z-.5,1.7,3.2,1.8);volume(cam,x+3.5,y+1.6,z-.5,1.7,3.2,1.8);
}
function batchZone(zone){
  zone.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(zone.matrixWorld).invert(),buckets=new Map(),remove=[];
  zone.traverse(o=>{if(!o.isMesh||Array.isArray(o.material)||o.userData.noBatch)return;let b=buckets.get(o.material);if(!b){b={positions:[],normals:[]};buckets.set(o.material,b);}const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(),m=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld);geo.applyMatrix4(m);const p=geo.attributes.position.array,n=geo.attributes.normal?.array;for(let i=0;i<p.length;i++)b.positions.push(p[i]);for(let i=0;i<p.length;i++)b.normals.push(n?n[i]:(i%3===1?1:0));geo.dispose();remove.push(o);});
  for(const o of remove){o.parent.remove(o);o.geometry.dispose();}for(const [material,b]of buckets){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));geo.computeBoundingSphere();const m=new THREE.Mesh(geo,material);m.name=zone.name+' / stone & paint';m.castShadow=true;m.receiveShadow=true;zone.add(m);}
}

export function buildEgypt(){
  const group=new THREE.Group(),roofGroup=new THREE.Group(),colliders=[],cameraColliders=[],walkableSurfaces=[];
  group.name='赤砂神殿 · 深入金字塔';roofGroup.name='埃及 · 真实封闭顶棚';roofGroup.visible=true;group.add(roofGroup);
  const zone=name=>{const q=new THREE.Group();q.name=name;group.add(q);return q;},desert=zone('干燥沙漠与狮身守望者'),temple=zone('神殿柱厅与彩绘'),passage=zone('地下下降甬道'),burial=zone('金字塔内部墓室'),pyramid=zone('金字塔外坡与厚石入口');
  const surface=(minX,maxX,minZ,maxZ,y)=>walkableSurfaces.push({minX,maxX,minZ,maxZ,y});
  // The room floors and desert share y=0. Carve the room footprints out
  // of the visual desert instead of drawing coplanar sand through the rooms.
  // Navigation/camera volumes stay unchanged, including the tomb opening.
  const groundRoomCuts=[[-23.75,-16.25,-4.25,8.25],[12,23.8,-4.4,11.4],[11.9,23.9,-20,-6]];
  const floor=(g,x,y,z,w,d,c)=>{
    let pieces=[[x-w/2,x+w/2,z-d/2,z+d/2]];
    const cuts=g===desert?groundRoomCuts:(y===4&&w===16.8?[[-11.2,11.2,-30.5,-13.5]]:[]);
    for(const [a,b,c0,d0]of cuts)pieces=pieces.flatMap(([l,r,n,s])=>{
      const x0=Math.max(l,a),x1=Math.min(r,b),z0=Math.max(n,c0),z1=Math.min(s,d0);
      if(x1<=x0||z1<=z0)return[[l,r,n,s]];
      return [[l,x0,n,s],[x1,r,n,s],[x0,x1,n,z0],[x0,x1,z1,s]].filter(([l,r,n,s])=>r-l>1e-5&&s-n>1e-5);
    });
    for(const [l,r,n,s]of pieces){
      if(y===4){const nx=Math.ceil((r-l)/1.6),nz=Math.ceil((s-n)/1.6),w=(r-l)/nx,d=(s-n)/nz;for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)ashlar(g,l+(i+.5)*w,y-.18,n+(j+.5)*d,w,.36,d,c,.012);}
      else box(g,(l+r)/2,y-.18,(n+s)/2,r-l,.36,s-n,c);
    }
    volume(cameraColliders,x,y-.18,z,w,.36,d);
  };
  floor(desert,0,0,16.5,60,47,C.sand);surface(-30,30,-7,40,0);
  for(const side of [-1,1]){floor(desert,side*20,0,-23.5,20,33,C.sand);surface(side<0?-30:10,side<0?-10:30,-40,-7,0);}
  floor(desert,0,0,-30,20,20,C.sand);surface(-10,10,-40,-20,0);
  for(const x of [-29.7,29.7])volume(colliders,x,3,0,.3,14,80);for(const z of [-39.7,39.7])volume(colliders,0,3,z,60,14,.3);
  // Wind-eroded land is dry and sparse: no lush garden or decorative pool.
  for(let i=0;i<35;i++){const side=i%2?1:-1,x=side*(17.4+(Math.sin(i*14.7)*.5+.5)*10.6),z=24+(Math.sin(i*9.3)*.5+.5)*14;ball(desert,x,-.18,z,.8,i%3?C.lightSand:C.sand,1.8,.27,1.35);}
  for(let i=0;i<45;i++){const x=Math.sin(i*37.6)*27.4,z=24+(Math.cos(i*16.7)*.5+.5)*13;if(Math.abs(x)<2)continue;const r=.04+(i%4)*.035;ball(desert,x,r*.4,z,r,0x9d794a,1.4,.65,1);}
  for(let i=0;i<26;i++)box(desert,0,.012,36-i*1.08,3.4,.024,.91,i%3?0xd8b779:0xc49f64);
  sphinx(desert,colliders,cameraColliders,-7.7,28.55);
  // A second weathered sentinel and an engraved obelisk frame the approach.
  const small=new THREE.Group();small.position.set(7.8,0,27.8);small.scale.set(.57,.57,.57);desert.add(small);sphinx(small,[],[],0,0);volume(colliders,7.8,1,27.8,2.2,2,3.5);volume(cameraColliders,7.8,1,27.8,2.2,2,3.5);
  solid(desert,colliders,cameraColliders,9.95,.3,32.3,1.75,.6,1.75,C.shadow);cyl(desert,9.95,2.43,32.3,.48,.62,3.8,C.stone,4).rotation.y=Math.PI/4;mesh(desert,new THREE.ConeGeometry(.69,1,4),C.gold,9.95,4.83,32.3).rotation.y=Math.PI/4;volume(colliders,9.95,2.5,32.3,1.3,5,1.3);volume(cameraColliders,9.95,2.5,32.3,1.3,5,1.3);glyphPanel(desert,9.95,2.25,32.76,.58,2.6,0,3);
  // Low internal pylons preserve the painted gateway without competing with the
  // exterior pyramid silhouette. Their genuine 3.44 m-high opening remains clear.
  for(const side of [-1,1]){solid(temple,colliders,cameraColliders,side*5.5,1.84,5.2,7.4,3.68,1.25,C.stone);box(temple,side*5.5,3.78,5.2,7.75,.20,1.45,C.edge);mural(temple,side*5.5,1.93,5.84,6.7,3.2,0,side>0?2:0);glyphPanel(temple,side*5.5,1.97,4.56,5.8,3.2,Math.PI,side>0?5:1);for(let i=0;i<6;i++)box(temple,side*5.5-3.1+i*1.24,3.47,5.85,.16,.25,.04,C.blue);}
  box(temple,0,3.76,5.2,3.6,.64,1.25,C.shadow);volume(colliders,0,3.76,5.2,3.6,.64,1.25);volume(cameraColliders,0,3.76,5.2,3.6,.64,1.25);glyphPanel(temple,0,3.77,5.84,3.38,.5,0,1);
  // The complete painted column hall now sits within the larger stone pyramid.
  // Its entry court looks up into the hollow shell rather than out to the sky.
  for(const side of [-1,1]){solid(temple,colliders,cameraColliders,side*9.15,2.65,-.55,.6,5.3,12.0,C.stone);mural(temple,side*8.82,2.45,-3.1,5.2,3.5,side<0?Math.PI/2:-Math.PI/2,side>0?4:1);}
  for(const side of [-1,1])solid(temple,colliders,cameraColliders,side*5.45,2.65,-6.82,7.3,5.3,.36,C.stone);
  solid(temple,colliders,cameraColliders,0,4.24,-6.82,3.6,2.12,.36,C.shadow);
  for(const x of [-6.55,6.55])for(const z of [3.25,-.05,-3.75])column(temple,colliders,cameraColliders,x,z,4.92);
  for(const x of [-3.7,3.7])for(const z of [-1.35,-4.45])column(temple,colliders,cameraColliders,x,z,4.92);
  // Stone floor joins are painted at a millimetre scale, not raised obstacles.
  for(let x=-8.6;x<9;x+=1.7)for(let z=-6.4;z<4.8;z+=1.6){const lo=Math.max(-7,z-.765),hi=z+.765;box(temple,x,.008,(lo+hi)/2,1.63,.016,hi-lo,(Math.round(x*10+z*10)%3)?0xc7a16a:0xb88e57);}
  box(roofGroup,0,5.24,-3.3,18.96,.48,7.49,C.shadow);volume(cameraColliders,0,5.24,-3.3,18.9,.48,7.45);
  for(const x of [-7,7]){box(roofGroup,x,5.24,2.70,4.4,.48,4.8,C.shadow);volume(cameraColliders,x,5.24,2.70,4.4,.48,4.8);}
  for(const z of [-5.55,-2.25,.05]){box(roofGroup,0,4.94,z,18.5,.30,.42,C.edge);for(let i=0;i<30;i++)box(roofGroup,-8.55+i*.59,4.77,z,.26,.025,.29,i%2?C.blue:C.red);}
  // A blue astronomical ceiling reads from a close third-person camera.
  box(roofGroup,0,4.989,-3.1,6.1,.025,6.9,C.ink);for(let i=0;i<54;i++){const x=-2.65+(i%9)*.65,z=-5.9+Math.floor(i/9)*1.04;box(roofGroup,x,4.966,z,.15,.02,.037,C.gold);box(roofGroup,x,4.965,z,.037,.02,.15,C.gold);}
  glyphPanel(temple,-5.8,2.43,-6.60,5.05,3.8,0,2);glyphPanel(temple,5.8,3.5,-6.60,4.65,1.4,0,4);
  // Cut stone portal joints sit on the existing pylon, never across its opening.
  // Four broad alternating bonds read at human distance rather than as noise.
  for(const side of[-1,1])for(let j=0;j<7;j++)stoneCourse(temple,side*2.01,.25+j*.48,5.84,.36,.45,.09,j%3?C.edge:C.stone);
  stoneCourse(temple,0,3.66,5.84,3.96,.36,.11,C.edge);
  // The original jackal guardian has a human body, long muzzle and tall ears.
  jackalStatue(temple,6.1,0,-4.9,.92);volume(colliders,6.1,2.1,-4.9,1.9,4.2,1.9);volume(cameraColliders,6.1,2.1,-4.9,1.9,4.2,1.9);
  balance(temple,1.2,0,-3.05);volume(colliders,1.2,.9,-3.05,2.5,1.8,1.15);volume(cameraColliders,1.2,.9,-3.05,2.5,1.8,1.15);
  // Papyrus, palettes, reeds and pigments belong to the temple scribal niche.
  solid(temple,colliders,cameraColliders,-6.65,.51,-3.0,2.7,1.02,1.25,C.shadow);box(temple,-6.65,1.07,-3,2.9,.12,1.4,C.edge);box(temple,-6.65,1.14,-2.95,1.35,.025,.82,C.linen);
  for(let i=0;i<5;i++)box(temple,-7.14+i*.2,1.16,-2.98,.026,.014,.55,C.ink);
  for(let i=0;i<3;i++){const roll=cyl(temple,-7.55+i*.37,1.28,-3.17,.12,.12,.61,C.linen);roll.rotation.z=Math.PI/2;}
  for(let i=0;i<3;i++)cyl(temple,-5.62,1.22,-3.4+i*.3,.12,.15,.18,[C.blue,C.red,C.gold][i]);rod(temple,[-6.1,1.18,-2.66],[-5.52,1.18,-2.85],.025,C.deep);
  for(const [x,z]of[[-8.1,-5.6],[-7.35,-5.85],[8.2,-.7]]){urn(temple,x,0,z,.9);volume(colliders,x,.5,z,.7,1,.7);}
  for(const [x,z,rot]of[[-8.73,-1,Math.PI/2],[8.73,-1,-Math.PI/2],[-2.4,-6.54,0],[2.4,-6.54,0]])torch(temple,x,2.8,z,cameraColliders,rot);
  // ONE dominant pyramid surrounds the first gateway, column hall and burial
  // sequence. A low stone footing conceals the already-modelled underground
  // chamber roof. Sloped envelope faces retain their real front cutout;
  // thick entry masonry and independently enclosed passages sit behind them.
  // The redesigned 60 x 80 m precinct provides real new rooms and circulation;
  // existing avatar, furniture, portals, columns and tomb details are not scaled.
  const shell={halfX:28,halfZ:30,centerZ:-8,baseY:.9,topY:38,entryHalf:2.15,entryTop:4.8,thickness:.16};
  const {halfX,halfZ,centerZ,baseY,topY:peakY,entryHalf,entryTop,thickness}=shell;
  const rise=peakY-baseY,front= centerZ+halfZ,rear=centerZ-halfZ;
  const apex=[0,peakY,centerZ],bl=[-halfX,baseY,front],br=[halfX,baseY,front],nl=[-halfX,baseY,rear],nr=[halfX,baseY,rear];
  const face=(points,color)=>{
    if(points.length===3)triangle(pyramid,...points,color);else slab(pyramid,points,color);
    // The interior has its own visible reverse face. It is not a transparent
    // material, removed roof or box fill; a camera inside sees the stone vault.
    const inside=points.map(([x,y,z])=>[x*(1-thickness/halfX),y-thickness,z===centerZ?z:centerZ+(z-centerZ)*(1-thickness/halfZ)]).reverse();
    if(inside.length===3)triangle(pyramid,...inside,C.shadow);else slab(pyramid,inside,C.shadow);
  };
  face([nl,bl,apex],C.stone);face([br,nr,apex],0xb78f54);face([nr,nl,apex],0xbc955e);
  const ratio=(entryTop-baseY)/rise,edgeX=halfX*(1-ratio),frontZ=front-halfZ*ratio;
  face([bl,[-entryHalf,baseY,front],[-entryHalf,entryTop,frontZ],[-edgeX,entryTop,frontZ]],C.stone);
  face([[entryHalf,baseY,front],br,[edgeX,entryTop,frontZ],[entryHalf,entryTop,frontZ]],C.stone);
  face([[-edgeX,entryTop,frontZ],[edgeX,entryTop,frontZ],apex],C.stone);
  // Low perimeter footing follows the hollow shell, never crosses its doorway.
  for(const side of [-1,1]){
    solid(pyramid,colliders,cameraColliders,side*(halfX-.12),baseY/2,centerZ,.24,baseY,halfZ*2,C.stone);
    solid(pyramid,colliders,cameraColliders,side*(halfX+entryHalf)/2,baseY/2,front-.12,halfX-entryHalf,baseY,.24,C.stone);
  }
  solid(pyramid,colliders,cameraColliders,0,baseY/2,rear+.12,halfX*2,baseY,.24,C.stone);
  // The portal follows the sloping face. Dark stone reveals make its thickness
  // legible while the 4.3 m opening stays unobstructed from the approach.
  for(const side of [-1,1]){
    const x=side*entryHalf,ix=x*(1-thickness/halfX);
    slab(pyramid,[[x,baseY,front],[x,entryTop,frontZ],[ix,entryTop-thickness,frontZ-thickness],[ix,baseY-thickness,front-thickness]],C.deep);
    box(pyramid,x,baseY/2+.015,front-.08,.14,baseY+.03,.2,C.edge);
    rod(pyramid,[x,baseY,front+.02],[x,entryTop,frontZ+.02],.065,C.edge);
  }
  slab(pyramid,[[-entryHalf,entryTop,frontZ],[entryHalf,entryTop,frontZ],[entryHalf,entryTop-thickness,frontZ-thickness],[-entryHalf,entryTop-thickness,frontZ-thickness]],C.deep);
  rod(pyramid,[-entryHalf,entryTop+.015,frontZ+.025],[entryHalf,entryTop+.015,frontZ+.025],.09,C.edge);
  // Courses reinforce a continuous triangular silhouette. Their lines stop at
  // the cutout rather than visually sealing the walkable entrance.
  for(let k=1;k<=73;k++){
    const y=baseY+k*.5;if(y>=peakY-.15)break;const r=1-(y-baseY)/rise,x=halfX*r,zs=centerZ+halfZ*r,zn=centerZ-halfZ*r;
    for(const side of [-1,1])rod(pyramid,[side*x,y,zn],[side*x,y,zs],.018,0xaa8250);
    rod(pyramid,[-x,y,zn],[x,y,zn],.018,0xaa8250);
    if(y>entryTop)rod(pyramid,[-x,y,zs],[x,y,zs],.018,0xaa8250);
    else for(const side of [-1,1])rod(pyramid,[side*entryHalf,y,zs],[side*x,y,zs],.018,0xaa8250);
  }
  // Fine shell bands are shared by avatar and camera collision. Each hugs one
  // sloping face, leaving room for the separately built interior masses. Bands
  // split exactly at the portal lintel and retain its full 4.3 m clear width.
  const shellSolids=[];
  for(let lo=baseY;lo<peakY-1e-6;){
    let hi=Math.min(peakY,lo+.25);if(lo<entryTop&&hi>entryTop)hi=entryTop;
    const r0=1-(lo-baseY)/rise,r1=1-(hi-baseY)/rise,x0=halfX*r0,x1=halfX*r1;
    const z0=halfZ*r0,z1=halfZ*r1,y=(lo+hi)/2,h=hi-lo;
    for(const side of [-1,1])volume(shellSolids,side*(x0+x1)/2,y,centerZ,x0-x1+thickness*2,h+.025,z0*2+thickness*2);
    volume(shellSolids,0,y,centerZ-(z0+z1)/2,x0*2+thickness*2,h+.025,z0-z1+thickness*2);
    const fz=centerZ+(z0+z1)/2,depth=z0-z1+thickness*2;
    if(hi<=entryTop+1e-6){
      for(const side of [-1,1])volume(shellSolids,side*(x0+entryHalf)/2,y,fz,Math.max(.01,x0-entryHalf),h+.025,depth);
    }else volume(shellSolids,0,y,fz,x0*2+thickness*2,h+.025,depth);
    lo=hi;
  }
  colliders.push(...shellSolids);cameraColliders.push(...shellSolids.map(c=>({...c})));
  // The outer slope is only the envelope. A real masonry throat behind its
  // cutout gives arrival an eight-metre-long, compressed stone interior.
  // Every block ends below the sloping exterior, rather than poking through it.
  const entryBack=11.8,entryFront=21.9,entryWallOuter=5.05,entryCeiling=3.45;
  const entryTopAt=z=>Math.min(5.2,baseY+(front-z)*rise/halfZ-.06);
  for(const side of[-1,1])for(let z=entryBack;z<entryFront-.001;z+=.5){
    const end=Math.min(entryFront,z+.5),h=entryTopAt(end),d=end-z;
    solid(pyramid,colliders,cameraColliders,side*(entryHalf+entryWallOuter)/2,h/2,(z+end)/2,entryWallOuter-entryHalf,h,d,C.shadow);
    // Coursed interior faces expose the wall depth at the final return.
    for(let y=.04;y<h-.06;y+=.62){const bh=Math.min(.60,h-y);ashlar(pyramid,side*(entryHalf+.025),y+bh/2,(z+end)/2,.11,bh,d-.012,(Math.round(z*2)+Math.round(y/.62))%4?C.stone:C.edge,.014);}
  }
  for(let z=entryBack;z<19.5-.001;z+=.5){
    const end=Math.min(19.5,z+.5),top=entryTopAt(end),h=top-entryCeiling;
    box(roofGroup,0,entryCeiling+h/2,(z+end)/2,entryWallOuter*2,h,end-z,C.shadow);
    volume(colliders,0,entryCeiling+h/2,(z+end)/2,entryWallOuter*2,h,end-z);
    volume(cameraColliders,0,entryCeiling+h/2,(z+end)/2,entryWallOuter*2,h,end-z);
  }
  for(const side of[-1,1]){
    solid(pyramid,colliders,cameraColliders,side*6.1,2.6,entryBack,7.9,5.2,1.05,C.stone);
    // Deep return faces and a high-set relief make the inside portal legible.
    glyphPanel(pyramid,side*6.0,2.42,entryBack-.54,5.8,3.5,Math.PI,side>0?2:5);
    for(const z of[14.4,17.9])glyphPanel(pyramid,side*(entryHalf-.035),1.82,z,1.8,1.65,side<0?Math.PI/2:-Math.PI/2,side>0?4:1);
  }
  stoneCourse(pyramid,0,3.66,entryBack-.58,4.75,.42,.14,C.edge);
  for(const [side,z]of[[-1,18.35],[1,13.8]])torch(pyramid,side*(entryHalf-.09),2.13,z,cameraColliders,side<0?Math.PI/2:-Math.PI/2);
  // Keep the descending corridor's shoulders closed at ground level while its
  // original central portal, ramps and below-ground rooms remain untouched.
  for(const side of [-1,1])volume(colliders,side*5.8,1.6,-7.02,8,3.2,.1);
  // The actual step faces and support regions are generated together. End treads
  // are half-depth, so both adjoining landings keep precisely their old height.
  // Every flight has sealed stone sides and a continuous 30 cm thick underside.
  const stoneFlight=(g,{id,minX,maxX,z0,z1,y0,y1,risers})=>{
    const run=(z1-z0)/risers,rise=(y1-y0)/risers;
    const sections=[];for(let i=0;i<=risers;i++){
      const a=z0+Math.max(0,i-.5)*run,b=z0+Math.min(risers,i+.5)*run,y=y0+i*rise;
      const lo=Math.min(a,b),hi=Math.max(a,b);sections.push({lo,hi,y});surface(minX,maxX,lo,hi,y);
      // Continuous tread spans the full clear width; shallow painted joints have
      // no raised lip and each riser has its own genuine vertical face.
      const joints=[minX,minX+(maxX-minX)/3-.008,minX+(maxX-minX)/3+.008,maxX-(maxX-minX)/3-.008,maxX-(maxX-minX)/3+.008,maxX];
      for(let j=0;j<joints.length-1;j++)slab(g,[[joints[j],y,hi],[joints[j+1],y,hi],[joints[j+1],y,lo],[joints[j],y,lo]],j%2?C.shadow:i%4===0?C.edge:C.stone);
      if(i<risers){const zy=b,ny=y0+(i+1)*rise;const points=[[minX,y,zy],[maxX,y,zy],[maxX,ny,zy],[minX,ny,zy]];if(run>0)points.reverse();slab(g,points,C.shadow);}
      const mid=(lo+hi)/2;volume(cameraColliders,(minX+maxX)/2,y-.15,mid,maxX-minX,.30,hi-lo);
    }
    // Use an extruded saw-tooth cross-section only for closed sides and bottom;
    // front/back sheets terminate exactly at the adjacent floor, without cracks.
    const lower=z=>y0+(y1-y0)*(z-z0)/(z1-z0)-.30;
    for(const side of[-1,1])for(const q of sections){const x=side<0?minX:maxX,points=[[x,lower(q.lo),q.lo],[x,lower(q.hi),q.hi],[x,q.y,q.hi],[x,q.y,q.lo]];if(side>0)points.reverse();slab(g,points,C.shadow);}
    const bottom=[[minX,lower(z0),z0],[maxX,lower(z0),z0],[maxX,lower(z1),z1],[minX,lower(z1),z1]];if(run<0)bottom.reverse();slab(g,bottom,C.deep);
    for(const [z,y,reverse]of[[z0,y0,run>0],[z1,y1,run<0]]){const p=[[minX,y-.3,z],[maxX,y-.3,z],[maxX,y,z],[minX,y,z]];if(reverse)p.reverse();slab(g,p,C.shadow);}
    return {id,minX,maxX,z0,z1,y0,y1,risers,rise:Math.abs(rise),tread:Math.abs(run),sections};
  };
  // Two descents, separated by a blind corner, put the burial chamber six
  // metres below the court. Ground at y=0 remains above the deep stone roof;
  // neither stair cuts through a surviving desert slab or an upper floor.
  const flights=[];
  flights.push(stoneFlight(passage,{id:'burial-stair',minX:-1.6,maxX:1.6,z0:-7,z1:-13,y0:0,y1:-3,risers:24}));
  const tunnel=(minX,maxX,z0,z1,y0,y1)=>{
    const n=Math.ceil(Math.abs(z1-z0)/.3),dz=(z1-z0)/n;
    for(let i=0;i<n;i++){
      const a=z0+i*dz,b=a+dz,z=(a+b)/2,ya=y0+(y1-y0)*i/n,yb=y0+(y1-y0)*(i+1)/n;
      // Sloped wall/roof cross-sections are true closed prisms. No stepped
      // underside intrudes into the headroom of a descending walking camera.
      const lo=Math.min(a,b),hi=Math.max(a,b),floorAt=z=>y0+(y1-y0)*(z-z0)/(z1-z0);
      for(const side of[-1,1]){
        const inner=side<0?minX:maxX,outer=inner+side*1.0;
        const pts=[[inner,floorAt(hi)-.3,hi],[inner,floorAt(lo)-.3,lo],[inner,floorAt(lo)+2.95,lo],[inner,floorAt(hi)+2.95,hi]];
        if(side>0)pts.reverse();slab(passage,pts,C.shadow);
        slab(passage,[[outer,floorAt(hi)-.3,hi],[outer,floorAt(hi)+3.6,hi],[outer,floorAt(lo)+3.6,lo],[outer,floorAt(lo)-.3,lo]],C.deep);
        for(const zz of[lo,hi]){const y=floorAt(zz),cap=[[inner,y-.3,zz],[outer,y-.3,zz],[outer,y+3.6,zz],[inner,y+2.95,zz]];slab(passage,cap,C.shadow);slab(passage,[...cap].reverse(),C.shadow);}
        slab(passage,[[inner,floorAt(hi)+2.95,hi],[outer,floorAt(hi)+3.6,hi],[outer,floorAt(lo)+3.6,lo],[inner,floorAt(lo)+2.95,lo]],C.shadow);
        volume(colliders,(inner+outer)/2,(ya+yb)/2+1.325,z,1,3.25,Math.abs(dz));
        volume(cameraColliders,(inner+outer)/2,(ya+yb)/2+1.325,z,1,3.25,Math.abs(dz));
      }
      const bottom=[[minX-1,floorAt(hi)+2.95,hi],[maxX+1,floorAt(hi)+2.95,hi],[maxX+1,floorAt(lo)+2.95,lo],[minX-1,floorAt(lo)+2.95,lo]];
      slab(roofGroup,bottom.reverse(),C.deep);
      slab(roofGroup,[[minX-1,floorAt(hi)+3.6,hi],[maxX+1,floorAt(hi)+3.6,hi],[maxX+1,floorAt(lo)+3.6,lo],[minX-1,floorAt(lo)+3.6,lo]],C.shadow);
      // Conservative ceiling proxy starts above the lowest actual underside.
      for(const arr of[colliders,cameraColliders])volume(arr,(minX+maxX)/2,Math.min(ya,yb)+3.28,z,maxX-minX+2,.66,Math.abs(dz));
    }
    // Long masonry seams follow the descent; broad transverse lintels make
    // successive pools of torchlight legible without adding floor obstacles.
    for(const side of[-1,1])for(const h of[.6,1.2,1.8,2.4])rod(passage,[side<0?minX+.014:maxX-.014,y0+h,z0],[side<0?minX+.014:maxX-.014,y1+h,z1],.015,C.stone);
    for(let i=1;i<4;i++){const z=z0+(z1-z0)*i/4,y=y0+(y1-y0)*i/4;stoneCourse(passage,(minX+maxX)/2,y+2.97,z,maxX-minX,.12,.20,C.edge);}
  };
  tunnel(-1.6,1.6,-7,-13,0,-3);
  for(const side of[-1,1])solid(passage,colliders,cameraColliders,side*2.1,1.475,-6.90,1,2.95,.2,C.shadow);
  solid(passage,colliders,cameraColliders,0,3.2,-6.90,5.2,.5,.2,C.shadow);
  const tombFloor=(g,x,z,w,d,y=-6)=>{floor(g,x,y,z,w+.12,d+.12,C.shadow);surface(x-w/2,x+w/2,z-d/2,z+d/2,y);};
  // Full square masonry backs the exposed returns. Chamfered edge blocks alone
  // would leave hairline sky gaps where wall, floor and ceiling meet.
  const tombWall=(g,x,z,w,d,y=-6,h=5.4,c=C.shadow)=>{box(g,x,y+h/2,z,w,h,d,c);for(const arr of[colliders,cameraColliders])volume(arr,x,y+h/2,z,w,h,d);};
  const tombRoof=(x,z,w,d,y,h)=>{box(roofGroup,x,y+h+.35,z,w,.7,d,C.deep);for(const arr of[colliders,cameraColliders])volume(arr,x,y+h+.35,z,w,.7,d);};
  tombFloor(passage,-3,-14.6,9.2,3.2,-3);
  // Offset corner wall blocks the coffin sightline; a wall relief faces the
  // arriving walker, while a lamp reveals the left-hand continuation.
  tombWall(passage,2.1,-14.6,1,5.2,-3,2.95);
  // An actual raised niche is cut into the blind wall, with a 0.9 m reveal
  // and a solid rear. It rewards the turn without offering a false route.
  for(const z of[-15.725,-13.475])tombWall(passage,-8.1,z,1,.95,-3,2.95);
  tombWall(passage,-8.1,-14.6,1,1.3,-3,.8);
  tombWall(passage,-8.1,-14.6,1,1.3,-.6,.55);
  tombWall(passage,-8.55,-14.6,.1,1.3,-2.2,1.6,C.deep);
  box(passage,-8.04,-2.18,-14.6,.92,.08,1.28,C.edge);
  urn(passage,-8.1,-2.14,-14.6,.57,C.linen);
  glyphPanel(passage,-8.485,-1.15,-14.6,.96,.58,Math.PI/2,1);
  tombWall(passage,-1.4,-16.7,6,1,-3,2.95);
  tombWall(passage,-4.6,-12.5,6,1,-3,2.95);
  tombRoof(-3,-14.6,9.2,3.2,-3,2.95);
  glyphPanel(passage,.6,-1.43,-16.16,1.55,2.35,0,3);
  // Open the second stair at the WEST end of the turning landing.
  // Its x=-6 centre keeps the two routes separated by genuine rock mass.
  flights.push(stoneFlight(passage,{id:'burial-deep-stair',minX:-7.6,maxX:-4.4,z0:-16.2,z1:-22.2,y0:-3,y1:-6,risers:24}));
  tunnel(-7.6,-4.4,-16.2,-22.2,-3,-6);
  // Low square antechamber. Thresholds have 0.8–1.2 m reveals, not thin dividers.
  tombFloor(burial,-5,-25.35,6,6.3);
  tombWall(burial,-5,-29,7,1,-6,3.25);
  tombWall(burial,-8.5,-23.35,1,2.3,-6,3.25);
  tombWall(burial,-8.5,-28,1,1,-6,3.25);
  tombWall(burial,-8.5,-26,1,3,-2.95,.2);
  tombWall(burial,-2.4,-23.35,.8,2.3,-6,3.25);
  tombWall(burial,-2.4,-28,.8,1,-6,3.25);
  tombWall(burial,-1.6,-26,1.6,3,-2.95,2.35,C.stone);
  tombWall(burial,-1.6,-28,1.6,1);
  tombWall(burial,-1.6,-23.35,1.6,2.3);
  tombWall(burial,-3.2,-21.8,2.4,.8,-6,3.25);
  tombRoof(-5,-25.35,7,6.3,-6,3.25);
  tombFloor(burial,-1.6,-26,1.6,3);
  // Raised stone closure in a visible overhead slot. Its clear opening is
  // 3.0 m high; the two existing working timber inset doors remain unchanged.
  box(burial,-1.98,-2.68,-26,.3,.52,2.87,C.edge);
  for(const z of[-27.25,-24.75])glyphPanel(burial,-2.825,-4.4,z,.48,2.45,-Math.PI/2,3);
  mural(burial,-5,-4.3,-28.47,5.4,2.7,0,3);
  // West offering room branches from the antechamber. Vessels occupy a bench,
  // with the centre and the door threshold kept clear for standing inspection.
  tombFloor(burial,-11,-26.25,4,4.5);tombFloor(burial,-8.5,-26,1,3);
  tombWall(burial,-13.5,-26.25,1,5.5,-6,3.25);
  for(const z of[-23.5,-29])tombWall(burial,-11,z,4,1,-6,3.25);
  tombRoof(-11,-26.25,4,5.5,-6,3.25);
  solid(burial,colliders,cameraColliders,-12.2,-5.57,-26.45,1,.86,2.7,C.stone);
  for(let i=0;i<3;i++)urn(burial,-12.2,-5.14,-27.35+i*.88,.67,i%2?C.red:C.linen);
  glyphPanel(burial,-12.97,-4.1,-26.25,3.6,2.55,Math.PI/2,2);
  // High main burial hall. Its roof top is y=-.38, below the existing
  // ground slab underside (-.36), so no ground plane slices the interior.
  tombFloor(burial,3.4,-28.6,9.2,12.8);
  tombWall(burial,-1.7,-23.35,1,2.3);
  tombWall(burial,-1.7,-31.5,1,7);
  tombWall(burial,3.4,-21.7,10.2,1);
  tombWall(burial,3.4,-35.5,10.2,1);
  tombWall(burial,8.5,-24.95,1,5.5);
  tombWall(burial,8.5,-33.2,1,4.6);
  tombWall(burial,8.5,-29.3,1,3.2,-2.95,2.35,C.stone);
  box(roofGroup,3.4,-.49,-28.6,10.2,.22,13.8,C.deep);for(const arr of[colliders,cameraColliders])volume(arr,3.4,-.49,-28.6,10.2,.22,13.8);
  // Recessed ceiling coffers lift the centre above the heavy transverse beams, bounded by
  // heavy crossbeams. Star paint remains high overhead, never over a passage.
  box(roofGroup,3.4,-.626,-28.6,7.5,.02,11.3,C.ink);
  for(const z of[-24,-28,-32,-34.4])stoneCourse(roofGroup,3.4,-.78,z,9.2,.32,.42,C.stone);
  for(let i=0;i<48;i++){const x=.3+(i%6)*1.23,z=-33.4+Math.floor(i/6)*1.38;box(roofGroup,x,-.647,z,.15,.018,.04,C.gold);box(roofGroup,x,-.648,z,.04,.018,.15,C.gold);}
  // Repeated broad pilasters and painted registers establish room scale.
  for(const z of[-23.35,-28.05,-33.25])for(const x of[-.97,7.77]){
    solid(burial,colliders,cameraColliders,x,-3.45,z,.46,5.1,.70,C.stone);
    for(const y of[-5.8,-1.22])stoneCourse(burial,x,y,z,.60,.28,.88,C.edge);
  }
  mural(burial,3.4,-3.2,-34.97,8.5,4.55,0,4);
  mural(burial,-1.16,-3.5,-31,5.2,3.7,Math.PI/2,2);
  mural(burial,7.96,-3.5,-24.65,3.4,3.7,-Math.PI/2,5);
  // A recessed, sealed stone door anchors the far wall. Carved edges have real
  // depth and a narrow central joint, without pretending this is a route.
  box(burial,3.4,-3.9,-34.74,3.4,3.7,.36,C.deep);
  for(const side of[-1,1]){stoneCourse(burial,3.4+side*1.47,-3.88,-34.48,.34,3.72,.46,C.edge);box(burial,3.4+side*.67,-3.85,-34.50,1.31,3.28,.16,C.stone);glyphPanel(burial,3.4+side*.67,-3.85,-34.40,.80,2.60,0,side>0?1:4);}
  stoneCourse(burial,3.4,-1.89,-34.50,3.6,.34,.55,C.edge);
  sarcophagus(burial,colliders,cameraColliders,3,-30.1,-6);
  // Keep the boat and four canopic vessels as distinct readable destinations.
  solid(burial,colliders,cameraColliders,.4,-5.75,-23.7,2.7,.5,1,C.shadow);
  ball(burial,.4,-5.39,-23.7,.58,C.gold,2.1,.29,.52);rod(burial,[.4,-5.3,-23.7],[.4,-4.32,-23.7],.04,C.deep);
  slab(burial,[[.45,-4.3,-23.7],[1.35,-4.5,-23.7],[1.35,-5.03,-23.7],[.45,-5.2,-23.7]],C.linen);
  tombFloor(burial,10.75,-29.3,3.5,4.8);tombFloor(burial,8.5,-29.3,1,3.2);
  tombWall(burial,13,-29.3,1,5.8,-6,3.25);
  for(const z of[-26.4,-32.2])tombWall(burial,10.75,z,3.5,1,-6,3.25);
  tombRoof(10.75,-29.3,3.5,5.8,-6,3.25);
  solid(burial,colliders,cameraColliders,11.8,-5.6,-29.3,.8,.8,3.35,C.stone);
  for(let i=0;i<4;i++){urn(burial,11.8,-5.2,-30.5+i*.8,.56,i%2?C.gold:C.linen);ball(burial,11.8,-4.65,-30.5+i*.8,.13,C.gold,.8,1.25,1);}
  glyphPanel(burial,12.47,-4.05,-29.3,4.25,2.5,-Math.PI/2,4);
  // Fixtures mark decisions and ritual objects. Ambient/sun settings are kept;
  // mystery comes from enclosure and occlusion rather than global darkness.
  for(const [x,y,z,r]of[[-1.47,1.04,-8.7,Math.PI/2],[1.47,-.18,-11.2,-Math.PI/2],[-3.6,-.94,-12.98,Math.PI],[-7.47,-2.1,-18.5,Math.PI/2],[-4.53,-3.6,-21.0,-Math.PI/2],[-7.86,-3.83,-23.45,Math.PI/2],[-10.6,-3.78,-28.47,0],[-.98,-3.15,-27.7,Math.PI/2],[7.76,-3.15,-32.6,-Math.PI/2],[5.5,-3.15,-34.85,0],[12.38,-3.8,-28.0,-Math.PI/2]])torch(burial,x,y,z,cameraColliders,r);
  // Three spacious human-scale destinations occupy the new pyramid interior.
  // A real 16.5 m ascending passage connects ground level to the throne floor;
  // the original six-metre descending passage still reaches the lower tomb.
  const throne=zone('上层法老王座大厅'),privateRoom=zone('克娄巴特拉主题起居室'),judgment=zone('阿努比斯审判厅'),ascending=zone('上层王殿通道');
  const roomWall=(g,x,y,z,w,h,d,c=C.stone)=>solid(g,colliders,cameraColliders,x,y,z,w,h,d,c);
  const insetDoorMounts=new Map();
  function insetStonePortal(g,{id,at,lateral,width,top,wallTop,wallDepth,from,to,swing}){
    const section=addInsetClosureSection(g,colliders,cameraColliders,{kind:'hinge',axis:'x',at,lateral,bottom:0,top,width,wallDepth,style:'egypt',swing});
    const rough=section.roughOpening;
    for(const [a,b]of [[from,rough.from],[rough.to,to]])roomWall(g,(a+b)/2,wallTop/2,at,b-a,wallTop,wallDepth);
    roomWall(g,lateral,(rough.top+wallTop)/2,at,rough.to-rough.from,wallTop-rough.top,wallDepth);
    insetDoorMounts.set(id,section.mount);
  }

  const raisedColumn=(g,x,y,z,h=4.5)=>{const q=new THREE.Group(),cs=[],cam=[];q.position.y=y;g.add(q);column(q,cs,cam,x,z,h);for(const a of cs)colliders.push({...a,minY:a.minY+y,maxY:a.maxY+y});for(const a of cam)cameraColliders.push({...a,minY:a.minY+y,maxY:a.maxY+y});};
  const roomRoof=(x,y,z,w,d)=>{box(roofGroup,x,y,z,w+.04,.34,d+.04,C.shadow);volume(cameraColliders,x,y,z,w,.34,d);};
  // West judgment room: separate full-height enclosure, wide south doorway,
  // symbolic heart-and-feather balance and a large original Eye of Horus relief.
  floor(judgment,-20,0,2,7.5,12.5,C.shadow);
  for(const x of [-23.8,-16.2])roomWall(judgment,x,2.4,2,.3,4.8,12.8);
  roomWall(judgment,-20,2.4,-4.3,7.9,4.8,.3);
  for(const x of [-22.7,-17.3])roomWall(judgment,x,2.4,8.3,2.5,4.8,.3);
  roomWall(judgment,-20,4.18,8.3,3,1.24,.3);
  roomRoof(-20,4.95,2,7.9,12.9);
  jackalStatue(judgment,-20,0,-2.15,1);volume(colliders,-20,2.2,-2.15,1.9,4.4,1.9);volume(cameraColliders,-20,2.2,-2.15,1.9,4.4,1.9);
  balance(judgment,-20,0,2.1);volume(colliders,-20,.9,2.1,2.5,1.8,1.15);volume(cameraColliders,-20,.9,2.1,2.5,1.8,1.15);
  mural(judgment,-23.62,2.2,1.1,8.4,3.55,Math.PI/2,3);mural(judgment,-16.38,2.2,1.1,8.4,3.55,-Math.PI/2,1);
  const eye=new THREE.Group();eye.position.set(-23.50,2.6,-1);eye.rotation.y=Math.PI/2;judgment.add(eye);box(eye,0,0,0,4.3,3.1,.05,C.edge);
  const eyeLine=(pts,c=C.blue,r=.065)=>{for(let i=1;i<pts.length;i++)rod(eye,[...pts[i-1],.06],[...pts[i],.06],r,c);};
  eyeLine([[-1.4,.1],[-.8,.5],[0,.6],[.8,.35],[1.35,.06]]);eyeLine([[-1.4,.1],[-.7,-.28],[.2,-.30],[1.35,.06]]);
  eyeLine([[-1.4,.8],[-.55,1.04],[.5,.87],[1.35,.38]],C.ink,.095);ball(eye,0,.1,.08,.28,C.ink,1,1,.2);torus(eye,0,.1,.1,.34,.045,C.gold);
  eyeLine([[-.15,-.3],[-.15,-1.08],[.17,-1.18],[.55,-.96]],C.blue,.075);eyeLine([[1.05,-.07],[.61,-.55],[.54,-.84]],C.blue,.07);
  for(const x of [-22.5,-17.5])torch(judgment,x,2.7,-4.04,cameraColliders,0,x< -20);
  // East private suite: distinct reception and sleeping spaces, each large
  // enough to circle furniture. Cleopatra is a theme, not a claimed replica.
  floor(privateRoom,17.9,0,3.5,11.8,15.8,C.edge);
  for(const x of [11.85,23.95])roomWall(privateRoom,x,2.35,3.5,.3,4.7,16.1);
  roomWall(privateRoom,17.9,2.35,-4.4,12.4,4.7,.3);
  // A real wider rough opening accepts joined timber jambs; the functional
  // 3.18 m aperture and R16 leaf top stay fixed inside the .30 m stone reveal.
  insetStonePortal(privateRoom,{id:'private-suite-entry',at:11.4,lateral:17.9,width:3.18,top:3.36,wallTop:4.7,wallDepth:.30,from:11.85,to:23.95,swing:1});
  for(const x of [14.08,21.72])roomWall(privateRoom,x,2.35,2.6,4.46,4.7,.22);
  roomWall(privateRoom,17.9,4.05,2.6,3.2,1.3,.22);roomRoof(17.9,4.9,3.5,12.4,16.1);
  mural(privateRoom,17.9,2.35,-4.21,11.5,3.6,0,4);
  for(const z of [5.7,-1])glyphPanel(privateRoom,23.77,2.5,z,3.4,3.4,-Math.PI/2,5);
  roomWall(privateRoom,20.4,.3,-1.25,2.6,.6,4.1,C.shadow);box(privateRoom,20.4,.68,-1.25,2.5,.24,3.9,C.linen);box(privateRoom,20.4,.85,-.7,2.45,.10,2.7,C.blue);
  box(privateRoom,20.4,1.18,-3.13,2.8,1.6,.2,C.gold);for(const x of [19.8,21])ball(privateRoom,x,.94,-2.55,.46,C.linen,1.1,.3,.7);
  // Royal canopy: human-scale gilded posts, hanging linen and a cobra crest
  // make the private bed distinct without narrowing the surrounding aisles.
  for(const x of [19.17,21.63])for(const z of [-3.1,.55]){
    roomWall(privateRoom,x,1.9,z,.10,2.65,.10,C.gold);cyl(privateRoom,x,3.26,z,.15,.06,.22,C.gold,8);
  }
  box(privateRoom,20.4,3.34,-1.25,2.88,.16,4.22,C.blue);box(privateRoom,20.4,3.45,-1.25,2.98,.08,4.32,C.gold);volume(cameraColliders,20.4,3.38,-1.25,2.98,.22,4.32);
  for(const x of [19.18,21.62])box(privateRoom,x,2.15,-3.10,.26,2.3,.06,C.linen);
  ball(privateRoom,20.4,2.5,-2.99,.28,C.gold,1.2,1,.25);rod(privateRoom,[20.4,2.48,-2.9],[20.4,3.05,-2.9],.055,C.gold);ball(privateRoom,20.4,3.1,-2.9,.14,C.gold,1,1.2,.6);
  roomWall(privateRoom,14.2,.55,9.7,2.2,1.1,1.1,C.shadow);box(privateRoom,14.2,1.15,9.7,2.4,.1,1.3,C.edge);urn(privateRoom,13.8,1.2,9.7,.6,C.gold);ball(privateRoom,14.8,1.28,9.7,.23,C.blue,1,.35,1);
  // Keep the reception rug and its gold bindings beyond the bottom-leaf sweep.
  // North edge4.15 stays fixed; south edge9.44 leaves36mm to the conservative
  // inward bottom-slab extreme9.476. This is local textile fit, not floor lift.
  const suiteRugNorth=4.15,suiteRugSouth=9.44,suiteRugZ=(suiteRugNorth+suiteRugSouth)/2,suiteRugDepth=suiteRugSouth-suiteRugNorth;
  box(privateRoom,17.8,.018,suiteRugZ,7.6,.035,suiteRugDepth,C.blue);for(const xx of [14.2,21.4])box(privateRoom,xx,.047,suiteRugZ,.10,.035,suiteRugDepth-.24,C.gold);
  roomWall(privateRoom,17.9,.52,7.0,2.5,1.04,1.2,C.shadow);box(privateRoom,17.9,1.1,7,2.7,.15,1.4,C.edge);urn(privateRoom,18.5,1.2,7,.65,C.blue);box(privateRoom,17.4,1.2,7,1,.035,.7,C.linen);
  for(const [x,z]of [[14.4,8.2],[21.2,8.2]]){box(privateRoom,x,.34,z,1.6,.65,1.1,C.shadow);box(privateRoom,x,.7,z,1.64,.16,1.14,C.red);volume(colliders,x,.4,z,1.7,.8,1.2);volume(cameraColliders,x,.4,z,1.7,.8,1.2);}
  for(const x of [13.4,22.4])torch(privateRoom,x,2.65,11.2,cameraColliders,Math.PI,x<18);
  // Broad upper stone stair with 32 shallow, consistent 12.5 cm risers.
  // Closed cheek walls have actual thickness, coursed capstones and no floor gap.
  flights.push(stoneFlight(ascending,{id:'throne-stair',minX:-14.8,maxX:-11.2,z0:6,z1:-10.5,y0:0,y1:4,risers:32}));
  for(const x of[-14.98,-11.02])for(let i=0;i<32;i++){
    const z=6-(i+.5)*16.5/32,y=(i+.5)*4/32;
    // Bottom is supported by the ground rather than a paper-thin floating rail.
    stoneCourse(ascending,x,(y+1.05)/2,z,.36,y+1.05,16.5/32,C.shadow);
    stoneCourse(ascending,x,y+1.075,z,.40,.10,16.5/32,C.edge);
    volume(colliders,x,y+.52,z,.36,1.05,16.5/32);volume(cameraColliders,x,y/2+.525,z,.40,y+1.05,16.5/32);
  }
  floor(ascending,-6.4,4,-12.2,16.8,3.4,C.stone);surface(-14.8,2,-13.9,-10.5,4);
  for(const [x,z,w]of[[-4.6,-10.47,13.2],[-8.3,-13.93,13]]){roomWall(ascending,x,4.54,z,w,1.08,.16,C.shadow);stoneCourse(ascending,x,5.13,z,w,.10,.22,C.edge);}
  // Complete the formerly open 3.4 m west platform edge, and cap the blind
  // east end. The 3.6 m stair mouth and 3.6 m throne doorway remain unobstructed.
  for(const [x,z,d]of[[-14.98,-12.2,3.4],[2.18,-11.875,2.75]]){
    roomWall(ascending,x,4.54,z,.36,1.08,d,C.shadow);stoneCourse(ascending,x,5.13,z,.40,.10,d,C.edge);
  }
  // End-bonded upper platform fascia stops at floor height; no decorative
  // extrusion projects into the walkable turn or the lower stair opening.
  for(const [x,z,w]of[[-6.4,-10.51,16.8],[-8.3,-13.89,13]])stoneCourse(ascending,x,3.74,z,w,.36,.16,C.edge);
  // Front landing rail leaves the full ascending opening; rear rail leaves the
  // throne doorway at x=0. Neither obstructs the human-height circulation path.
  // Throne hall on a separately supported upper floor, above the lower tomb.
  floor(throne,0,4,-22,22.4,17,C.stone);surface(-11.2,11.2,-30.5,-13.5,4);
  for(const x of [-11.35,11.35])roomWall(throne,x,6.45,-22,.3,4.9,17.3);
  roomWall(throne,0,6.45,-30.65,23,4.9,.3);
  for(const x of [-6.55,6.55])roomWall(throne,x,6.45,-13.45,9.5,4.9,.3);
  roomWall(throne,0,8.25,-13.45,3.6,1.3,.3);roomRoof(0,9.08,-22,23,17.5);
  for(const x of [-7.9,7.9])for(const z of [-17.3,-22.2,-27.2])raisedColumn(throne,x,4,z,4.6);
  box(throne,0,4.02,-21.5,3.8,.04,14,C.blue);for(const x of [-1.8,1.8])box(throne,x,4.055,-21.5,.09,.025,14,C.gold);
  roomWall(throne,0,4.28,-28.35,5,.56,3.2,C.shadow);roomWall(throne,0,4.82,-27.95,2.8,.7,1.9,C.gold);box(throne,0,6.2,-28.75,2.7,3.4,.32,C.gold);box(throne,0,6.2,-28.54,2.35,3.0,.12,C.blue);
  for(const side of [-1,1]){roomWall(throne,side*1.36,5.42,-27.82,.3,1.9,2,C.gold);ball(throne,side*1.36,6.3,-26.83,.23,C.gold);}
  box(throne,0,5.25,-27.85,2.3,.18,1.6,C.blue);
  for(const x of [-1.06,1.06])box(throne,x,4.89,-27.16,.24,.7,.24,C.gold);
  triangle(throne,[-1.5,7.94,-28.72],[1.5,7.94,-28.72],[0,8.66,-28.72],C.gold);
  rod(throne,[0,7.98,-28.46],[0,8.50,-28.46],.07,C.ink);ball(throne,0,8.52,-28.42,.17,C.gold,1,.8,.55);
  ball(throne,0,6.95,-28.4,.34,C.gold,1,1,.28);
  for(const side of [-1,1]){triangle(throne,[side*.28,6.95,-28.37],[side*1.02,7.25,-28.37],[side*.91,6.78,-28.37],C.gold);box(throne,side*.92,6.08,-28.4,.10,1.25,.06,C.gold);}
  for(let j=0;j<3;j++)glyph(throne,0,5.55+j*.34,-28.37,j,.18,C.gold);mural(throne,-6.55,6.45,-30.46,7.7,3.9,0,2);mural(throne,6.55,6.45,-30.46,7.7,3.9,0,4);
  for(const [x,z,r]of [[-11.16,-19,Math.PI/2],[11.16,-19,-Math.PI/2],[-4,-30.4,0],[4,-30.4,0]])torch(throne,x,6.75,z,cameraColliders,r,x<0);
  // A connected service suite and private washroom make this a lived-in
  // palace. Food preparation, dining and storage remain separate from rites.
  const service=zone('王室餐厅厨房与储藏室');
  floor(service,17.9,0,-13,12.0,14,C.shadow);
  for(const x of [11.75,24.05])roomWall(service,x,2.3,-13,.3,4.6,14.3);
  roomWall(service,17.9,2.3,-20.15,12.6,4.6,.3);
  for(const z of [-5.85,-12.25]){
    for(const x of [14.03,21.77])roomWall(service,x,2.3,z,4.55,4.6,.25);
    roomWall(service,17.9,3.98,z,3.2,1.24,.25);
  }
  roomRoof(17.9,4.78,-13,12.6,14.5);
  // Dining table, stools and patterned bread dishes.
  roomWall(service,17.9,.56,-9.3,3.8,1.12,1.5,C.shadow);box(service,17.9,1.2,-9.3,4.05,.16,1.75,C.edge);
  for(const x of [16.5,17.9,19.3]){cyl(service,x,1.3,-9.3,.30,.27,.045,C.blue,16);ball(service,x,1.37,-9.3,.19,C.lightSand,1.2,.45,1);}
  for(const x of [15.15,20.65]){roomWall(service,x,.28,-9.3,1,.56,1,C.shadow);box(service,x,.6,-9.3,1.02,.12,1.02,C.red);}
  glyphPanel(service,12,2.4,-9.3,4.4,3.3,Math.PI/2,2);
  // Kitchen work line is kept against the east wall, leaving a broad aisle.
  // Keep the cabinet grounded and the adult work surface at one metre. All
  // supported pieces and hand/knife targets share these heights; no lot scaling.
  const kitchenTop=1.0,kitchenSlab=.12,kitchenBase=kitchenTop-kitchenSlab;
  const kitchenNpcBoardTop=kitchenTop+.035,kitchenPlayerBoardTop=kitchenTop+.015;
  roomWall(service,22.8,kitchenBase/2,-16.0,1.5,kitchenBase,6.3,C.shadow);box(service,22.8,kitchenTop-kitchenSlab/2,-16,1.65,kitchenSlab,6.5,C.edge);
  for(const z of [-14.5,-16,-18.3]){urn(service,22.7,kitchenTop,z,.65,z===-16?C.blue:C.deep);box(service,23.59,kitchenTop+.03,z,.1,.06,.7,C.gold);}
  box(service,22.4,kitchenNpcBoardTop-.0175,-17.1,.9,.035,.65,C.linen);for(let i=0;i<4;i++)ball(service,22.2+i*.18,kitchenNpcBoardTop+.09*.8,-17.1,.09,C.red,1,.8,1);
  insetStonePortal(service,{id:'storage-entry',at:-16.2,lateral:14.15,width:2.4,top:3.4,wallTop:4.6,wallDepth:.22,from:11.75,to:16.55,swing:-1});
  roomWall(service,16.6,2.3,-18.2,.22,4.6,4.1,C.stone);
  roomWall(service,14.15,.65,-19.25,3.9,1.3,.65,C.shadow);box(service,14.15,1.37,-19.25,4.0,.12,.75,C.edge);
  for(let i=0;i<5;i++)urn(service,12.7+i*.7,1.45,-19.25,.65,i%2?C.deep:C.gold);
  for(const x of [12.8,15.6])for(const z of [-18.3,-17.25]){urn(service,x,0,z,.7,C.shadow);volume(colliders,x,.6,z,.7,1.2,.7);volume(cameraColliders,x,.6,z,.7,1.2,.7);}
  for(const [x,z,r]of[[12,-7.3,Math.PI/2],[23.8,-13.3,-Math.PI/2]])torch(service,x,2.75,z,cameraColliders,r,x<18);
  // Supported preparation boards follow the adults' measured knife paths.
  box(service,22.10,kitchenPlayerBoardTop-.0075,-15.31,.22,.015,.30,C.linen);
  box(service,19.15,1.305,-8.70,.60,.05,.45,C.linen);
  box(service,16.80,1.295,-8.65,.50,.03,.42,C.linen);
  for(const [x,y,z]of [[19.3,1.365,-8.79],[19.15,1.365,-8.82],[16.96,1.345,-8.72]])ball(service,x,y,z,.055,C.lightSand,1,.25,1.3);
  // Private bath with visible water, stepped basin rim and a changing niche.
  // The north/south return meets the inner face of the cross-wall at2.49,
  // rather than projecting110mm into the bedroom curtain's mounting plane.
  for(const [z,d]of[[-3.5,1.8],[1.545,1.89]])roomWall(privateRoom,16.4,2.35,z,.22,4.7,d,C.stone);
  roomWall(privateRoom,16.4,4.05,-1,.22,1.3,3.2,C.stone);
  box(privateRoom,14.05,.15,-1.05,2.7,.3,3.8,C.shadow);
  for(const x of [12.75,15.35])box(privateRoom,x,.53,-1.05,.18,.76,3.8,C.edge);
  for(const z of [-2.9,.8])box(privateRoom,14.05,.53,z,2.7,.76,.18,C.edge);
  box(privateRoom,14.05,.56,-1.05,2.45,.05,3.5,C.blue);volume(colliders,14.05,.53,-1.05,2.7,1.06,3.8);volume(cameraColliders,14.05,.53,-1.05,2.7,1.06,3.8);
  urn(privateRoom,12.8,0,1.9,.7,C.gold);box(privateRoom,15.1,.32,1.8,1.4,.64,.7,C.shadow);box(privateRoom,15.1,.68,1.8,1.25,.08,.6,C.linen);volume(colliders,15.1,.36,1.8,1.4,.72,.7);volume(cameraColliders,15.1,.36,1.8,1.4,.72,.7);
  // Reception desk sits beside, not across, the central entry procession.
  roomWall(temple,-3.6,.55,8.35,3.0,1.1,1.25,C.shadow);box(temple,-3.6,1.17,8.35,3.2,.14,1.4,C.edge);box(temple,-3.6,1.26,8.35,1.5,.035,.8,C.linen);urn(temple,-4.55,1.26,8.35,.42,C.blue);
  // Court markers keep the expanded circulation legible without crowding it.
  for(const x of [-7.3,7.3])column(temple,colliders,cameraColliders,x,9.85,4.2);
  const stations=[
    {id:'egypt-sphinx',name:'沙海守望者',action:'观察狮身人面像',position:[-4.4,0,29.5],npcName:'哈桑',npcAction:'read',npcLabel:'描摹风化石纹',npcPosition:[-4.5,0,31.5],workTarget:[-7.7,2.3,29.8],route:[[-4.5,0,31.5],[-3.6,0,28.3]],dialogue:'看看狮身、人的面孔，还有风在石头上留下的细痕。它一直守着从沙漠通向神殿的路。'},
    {id:'egypt-glyphs',name:'彩绘柱廊',action:'辨认墙上的象形图案',position:[-4.5,0,3.35],npcName:'莱拉',npcAction:'read',npcLabel:'讲述太阳与河流',npcPosition:[-3.0,0,2.2],workTarget:[-5.5,3.1,5.0],route:[[-3,0,2.2],[-4.6,0,1.7]],dialogue:'柱头像盛开的纸莎草。墙上的水纹、眼睛与羽毛，组成了这座神殿自己的故事。'},
    {id:'egypt-papyrus',name:'神殿书吏壁龛',action:'用矿物颜料绘制纸莎草',position:[-5.5,0,-1.7],npcName:'萨米拉',npcAction:'paint',npcLabel:'调配青金蓝颜料',npcPosition:[-7.75,0,-1.7],workTarget:[-6.65,1.17,-3],route:[[-7.75,0,-1.7],[-7.8,0,-.4]],dialogue:'蘸一点蓝色，再添赭石。把你刚才在柱廊里看到的形状画在这里。'},
    {id:'egypt-scales',name:'羽毛天平',action:'轻放象征真诚的羽毛',position:[1.2,0,-1.55],npcName:'奥马尔',npcAction:'ritual',npcLabel:'调平金色秤盘',npcPosition:[2.5,0,-1.4],workTarget:[1.2,1.6,-3.05],route:[[2.5,0,-1.4],[1.4,0,-5.65]],dialogue:'这是一场象征性的神话体验：看羽毛与心形石怎样让两只秤盘保持平衡。'},
    {id:'egypt-guardian',name:'豺首守护神',action:'观察黑石守护神像',position:[5.25,0,-2.45],npcName:'努尔',npcAction:'read',npcLabel:'记录金饰与轮廓',npcPosition:[7.85,0,-3.05],workTarget:[6.1,2.8,-4.9],route:[[7.85,0,-3.05],[8.0,0,-5.2]],dialogue:'细长的双耳、向前的吻部与金色颈饰，在灯火下格外清晰。黑石守护者身后的甬道，通往金字塔深处。'},
    {id:'egypt-burial',name:'金字塔深处',action:'探看石棺与亚麻木乃伊',position:[.6,-6,-30.1],npcName:'阿米娜',npcAction:'read',npcLabel:'安静讲解墓室',npcPosition:[4.95,-6,-28.8],workTarget:[3,-4.9,-30.1],route:[[4.95,-6,-28.8],[4.95,-6,-32.4]],dialogue:'我们已经沿甬道走进金字塔内部。请绕着石棺慢慢看，细密的亚麻环绕着安静的身影，灯火映着四周的彩绘。'},
    {id:'egypt-stars',name:'星空墓室',action:'寻找天顶的金色星图',position:[0,-6,-32.8],npcName:'梅丽特',npcAction:'read',npcLabel:'解读星图与彩绘',npcPosition:[.2,-6,-33.3],workTarget:[1,-.65,-31.8],route:[[.2,-6,-33.3],[1,-6,-32.7]],dialogue:'抬头看，金星点缀着暗蓝与砂岩的天顶。灯火、壁画和模型船，让这间石室有了自己的宁静。'}
  ];
  stations.push(
    {id:'egypt-anubis-judgment',name:'阿努比斯审判厅',action:'体验羽毛与心的象征仪式',position:[-20,0,4.45],npcName:'奈菲',npcAction:'ritual',npcLabel:'讲述审判天平的寓意',npcPosition:[-17.5,0,.4],workTarget:[-20,1.8,2.1],route:[[-17.5,0,.4],[-17.5,0,4]],dialogue:'这里用神话里的羽毛、心形石和豺首守护者，讲述诚实与平衡。你可以绕行天平，再走近后墙的荷鲁斯之眼。'},
    {id:'egypt-horus-eye',name:'荷鲁斯之眼',action:'辨认眼形护符的曲线',position:[-22.2,0,-1.1],npcName:'塔雅',npcAction:'read',npcLabel:'描摹石壁上的眼形纹样',npcPosition:[-22.5,0,-2.8],workTarget:[-23.5,2.6,-1],route:[[-22.5,0,-2.8],[-22.5,0,-.1]],dialogue:'上扬的眼线、下垂的纹饰与圆形瞳孔，组成了荷鲁斯之眼。这是为这座幻想金字塔创作的浮雕。'},
    {id:'egypt-cleopatra-suite',name:'克娄巴特拉主题私室',action:'探索王室起居与寝室',position:[15.2,0,5.2],npcName:'伊西',npcAction:'read',npcLabel:'整理王室纸莎草卷轴',npcPosition:[20.6,0,5.2],workTarget:[17.9,1.2,7],route:[[20.6,0,5.2],[20.6,0,9.5]],dialogue:'这里以克娄巴特拉时代的想象为主题，用蓝色织物、金色器物与纸莎草，布置出独立的会客厅和寝室。'},
    {id:'egypt-pharaoh-throne',name:'上层法老王殿',action:'走近金色王座与仪式长廊',position:[0,4,-25.6],npcName:'拉美',npcAction:'ritual',npcLabel:'整理王殿仪式陈设',npcPosition:[3.8,4,-25.6],workTarget:[0,6.6,-29],route:[[3.8,4,-25.6],[3.8,4,-21]],dialogue:'你已经沿西侧的长坡道登上王殿。高柱围绕金色王座，而旧墓室还安静地躺在更低的地层里。'}
  );
  stations.push(
    {id:'egypt-royal-reception',name:'王室接待处',action:'领取探索卷轴',position:[-3.6,0,10.0],npcName:'阿赫',npcAction:'calligraphy',npcLabel:'登记来访卷轴',npcPosition:[-3.6,0,7.1],workTarget:[-3.6,1.26,8.35],route:[[-3.6,0,7.1],[-5.9,0,7.1]],dialogue:'欢迎来到金字塔里的王室宅邸。正前方是旧柱厅，西边是审判厅和上升王殿的长坡道，东边是起居、用餐与服务房间。'},
    {id:'egypt-royal-dining',name:'王室餐厅',action:'摆放面包与彩釉餐盘',position:[17,0,-8.03],playerWorkTarget:[17,1.31,-8.57],npcName:'达娜',npcAction:'cook',npcLabel:'准备面包与水果',npcPosition:[19.2,0,-8.08],workTarget:[19.2,1.33,-8.57],route:[[20.5,0,-7.7],[22,0,-10.6]],dialogue:'厨房在餐厅后面，储物室收着陶罐和谷物。把餐盘摆好，再看看这一整套王室生活设施怎样连接。'},
    {id:'egypt-royal-kitchen',name:'王室厨房',action:'准备陶锅与矿物色餐具',position:[21.60,0,-15.1],playerWorkTarget:[22.08,kitchenPlayerBoardTop,-15.1],npcName:'赫特',npcAction:'cook',npcLabel:'照看陶锅并整理食材',npcPosition:[21.62,0,-17.1],workTarget:[22.10,kitchenNpcBoardTop,-17.1],route:[[20.6,0,-17.3],[20.6,0,-14.2]],dialogue:'这条工作台把陶锅、食材和案板排在墙边，中央留下足够的走动空间。隔壁的小储藏室也可以走进去。'},
    {id:'egypt-private-bath',name:'王室沐浴间',action:'查看蓝色浴池与更衣器物',position:[17.2,0,-1],npcName:'赛提',npcAction:'clean',npcLabel:'整理沐浴用的亚麻织物',npcPosition:[17.2,0,.8],workTarget:[14.05,.65,-1.05],route:[[17.2,0,.8],[17.2,0,-2.8]],dialogue:'寝室旁另有一间带石质浴池的沐浴室。蓝色水面、亚麻织物和陶罐让它与仪式空间有了不同的日常气息。'}
  );
  const explorationTargets=[
    {id:'pyramid-vestibule',name:'厚石入口甬道',position:[0,0,16.0]},
    {id:'west-column-aisle',name:'西侧彩绘柱廊',position:[-3.1,0,.25]},
    {id:'east-column-aisle',name:'东侧彩绘柱廊',position:[4.8,0,.5]},
    {id:'ramp-middle',name:'下降甬道中段',position:[0,-1.5,-10]},
    {id:'burial-east',name:'石棺东侧回廊',position:[4.95,-6,-32.7]},
    {id:'burial-west',name:'石棺西侧回廊',position:[.3,-6,-32.7]},
    {id:'tomb-antechamber',name:'低顶墓室前厅',position:[-5,-6,-25.7]},
    {id:'offering-room',name:'西侧供奉石室',position:[-10.5,-6,-26.25]},
    {id:'canopic-room',name:'东侧卡诺匹陶罐室',position:[10.5,-6,-29.3]},
    {id:'ascending-middle',name:'上升长坡道中段',position:[-13,2,-2.25]},
    {id:'upper-landing',name:'上层王殿平台',position:[-6.5,4,-12.2]},
    {id:'private-sleeping-room',name:'王室独立寝室',position:[17.8,0,-1.5]},
    {id:'throne-west-aisle',name:'王殿西侧回廊',position:[-5.2,4,-23.7]},
    {id:'royal-storage',name:'王室储物室',position:[14.15,0,-17.7]},
    {id:'private-bath-interior',name:'独立沐浴间内侧',position:[15.8,0,-1]}

  ];
  const doorways=[
    {id:'pyramid-main-entry',a:[0,0,23],b:[0,0,17.8],width:4.16,height:4.64},
    {id:'internal-painted-gateway',a:[0,0,6.2],b:[0,0,4.1],width:3.6,height:3.44},
    {id:'descending-passage-mouth',a:[0,0,-6.2],b:[0,-.4,-7.8],width:3.2,height:2.95},
    {id:'burial-chamber-portal',a:[-3.5,-6,-26],b:[.3,-6,-26],at:-1.6,width:3,height:3.05},
    {id:'judgment-hall-entry',a:[-20,0,9.1],b:[-20,0,7.5],width:2.9,height:3.56},
    {id:'private-suite-entry',a:[17.9,0,12.2],b:[17.9,0,10.6],width:3.18,height:3.4},
    {id:'private-bedroom',a:[17.9,0,3.4],b:[17.9,0,1.8],width:3.18,height:3.4},
    {id:'upper-throne-entry',a:[0,4,-12.5],b:[0,4,-14.2],width:3.6,height:3.6},
    {id:'dining-entry',a:[17.9,0,-5.1],b:[17.9,0,-6.6],width:3.19,height:3.36},
    {id:'kitchen-entry',a:[17.9,0,-11.4],b:[17.9,0,-13.1],width:3.19,height:3.36},
    {id:'storage-entry',a:[14.15,0,-15.4],b:[14.15,0,-17],width:2.4,height:3.4},
    {id:'private-bath-entry',a:[17.2,0,-1],b:[15.8,0,-1],at:16.4,width:3.2,height:3.4}


  ];
  for(const doorway of doorways)if(insetDoorMounts.has(doorway.id))doorway.closureMount=insetDoorMounts.get(doorway.id);
  const facilities=[
    {id:'reception',name:'入口接待处',position:[-3.6,0,10],activity:'egypt-royal-reception'},
    {id:'throne-hall',name:'上层法老王座大厅',position:[0,4,-25.6],activity:'egypt-pharaoh-throne'},
    {id:'dining-room',name:'王室餐厅',position:[17.9,0,-7.45],activity:'egypt-royal-dining'},
    {id:'kitchen',name:'独立厨房',position:[20.5,0,-15],activity:'egypt-royal-kitchen'},
    {id:'private-reception',name:'克娄巴特拉主题起居厅',position:[15.2,0,5.2],activity:'egypt-cleopatra-suite'},
    {id:'private-bedroom',name:'独立寝室',position:[17.8,0,-1.5]},
    {id:'bath',name:'独立沐浴间',position:[15.8,0,-1],activity:'egypt-private-bath'},
    {id:'storage',name:'陶罐谷物储藏室',position:[14.15,0,-17.7]},
    {id:'judgment-hall',name:'阿努比斯与荷鲁斯之眼',position:[-20,0,4.45],activity:'egypt-anubis-judgment'},
    {id:'lower-burial',name:'地下石棺与木乃伊墓室',position:[.6,-6,-30.1],activity:'egypt-burial'}
  ];
  // Gold torch fixtures hug the existing entry jambs, leaving the portal clear.
  for(const x of [-3.0,3.0])torch(desert,x,2.55,21.45,cameraColliders,0,true);
  for(const q of [desert,temple,passage,burial,pyramid,throne,privateRoom,judgment,ascending,service,roofGroup])batchZone(q);
  group.userData={...group.userData,interior:true,defaultRoofVisible:true,cameraMode:'close-third-person',theme:'dry-desert-pyramid',pyramidShell:{...shell,frontZ:front,rearZ:rear,solidBands:shellSolids.length,mainEntry:true},ambientIntensity:.38,sunIntensity:2.4,interiorZones:[{name:'神殿柱厅',minX:-9,maxX:9,minZ:-6.8,maxZ:.5,minY:-.1,maxY:5.1},{name:'金字塔墓室',minX:-13,maxX:12.5,minZ:-35,maxZ:-22.2,minY:-6.1,maxY:-.6}],originalProceduralArt:true,stoneFlights:flights.map(({sections,...f})=>f),constructionRevision:'Egypt-thick-passage-deep-tomb',tombSequence:{entryClearance:3.45,tunnelClearance:2.95,antechamberClearance:3.25,burialClearance:5.4,burialFloor:-6,route:[[0,0,23],[0,0,10],[0,0,-6.2],[0,-3,-14.6],[-6,-3,-14.6],[-6,-3,-16.2],[-6,-6,-23.3],[-5,-6,-26],[.3,-6,-26],[.6,-6,-30.1]]}};
  return {group,colliders,spawn:[0,0,35.5],bounds:{minX:-30,maxX:30,minZ:-40,maxZ:40},stations,roofGroup,walkableSurfaces,cameraColliders,explorationTargets,doorways,facilities,levels:[{id:'desert',name:'沙漠与神殿',y:0},{id:'burial',name:'金字塔地下墓室',y:-6},{id:'burial-turn',name:'地下转折甬道',y:-3},{id:'throne',name:'上层法老王殿',y:4}]};
}
