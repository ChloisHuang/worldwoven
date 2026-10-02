import * as THREE from 'three';
import * as G from './geometry.js?rev=R7-20261002';

// Original R12.1 dragon couch. Visual study only: muyugudu's creator effect
// images at https://www.sglynp.com/t134924 and https://www.sglynp.com/t120740.
// No downloaded model, texture or traced ornament. All dimensions are metres.
export const CHINA_CURTAIN_DESIGN_VERSION=1;
export function migrateChinaCurtains(curtains){
 // Old true meant a practically invisible 10.5%-width front curtain. Reveal the
 // new wraparound design once, without resetting identity, stamps or other lots.
 if(curtains.chinaDragonDesign===CHINA_CURTAIN_DESIGN_VERSION)return false;
 curtains.china=false;curtains.chinaDragonDesign=CHINA_CURTAIN_DESIGN_VERSION;return true;
}
const C={wood:0x50362d,red:0xac3b2d,gold:0xd7af56,ivory:0xf2d999,ink:0x245564,jade:0x287879};
function stroke(g,points,r,c=C.gold){return G.mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(6,points.length*2),r,5,false),c);}
function relief(g,outline,depth,c){const s=new THREE.Shape();s.moveTo(...outline[0]);for(const p of outline.slice(1))s.lineTo(...p);s.closePath();return G.mesh(g,new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.014,bevelThickness:.012}),c);}
function cloud(g,x,y,z,s=1){const q=new THREE.Group();q.position.set(x,y,z);q.scale.setScalar(s);g.add(q);stroke(q,[[-.34,-.04,0],[-.40,.08,0],[-.28,.16,0],[-.16,.13,0],[-.11,.25,0],[.08,.29,0],[.21,.16,0],[.37,.12,0],[.32,-.03,0],[.11,-.08,0],[-.15,-.08,0]],.035);return q;}
function dragon(g,x,y,z,s,side=1){
 const q=new THREE.Group();q.name='Carved coiling dragon';q.position.set(x,y,z);q.scale.set(side*s,s,s);g.add(q);
 stroke(q,[[-.81,-.25,0],[-.53,-.42,0],[-.06,-.32,0],[.34,-.10,0],[.28,.17,0],[-.08,.26,0],[-.35,.12,0],[-.32,-.04,0],[.04,-.02,0],[.31,.39,0],[.59,.48,0]],.085);
 stroke(q,[[-.74,-.25,.066],[-.46,-.34,.066],[-.05,-.23,.066],[.24,-.06,.066],[.18,.12,.066],[-.10,.16,.066]],.018,C.ivory);
 // Long whiskered muzzle, brows, antler horns and three-toed claws make the
 // paired dragons legible at player distance, rather than generic S scrolls.
 G.sphere(q,.54,.43,.025,.15,C.gold,1.28,.70,.60);G.sphere(q,.68,.39,.04,.10,C.gold,1.4,.5,.5);G.sphere(q,.55,.48,.135,.025,C.wood);
 for(const a of [0,.14]){stroke(q,[[.37+a,.50,.01],[.30+a,.68,.01],[.40+a,.76,.01]],.027);stroke(q,[[.32+a,.64,.01],[.22+a,.67,.01]],.022);}
 stroke(q,[[.71,.38,.06],[.88,.46,.06],[.99,.37,.06]],.018,C.ivory);stroke(q,[[.64,.33,.06],[.74,.18,.06],[.91,.21,.06]],.017,C.ivory);
 for(const [px,py,sign]of[[-.34,-.28,-1],[.05,.20,1]]){stroke(q,[[px,py,.03],[px-.12,py+sign*.21,.03],[px+.02,py+sign*.29,.03]],.036);for(let j=-1;j<=1;j++)stroke(q,[[px+.01,py+sign*.27,.03],[px+.12+j*.08,py+sign*(.27+j*.05),.03]],.017);}
 for(let i=0;i<8;i++){const px=-.64+i*.085;const scale=G.mesh(q,new THREE.OctahedronGeometry(.032),i%2?C.ivory:C.gold,px,-.35+.08*Math.sin(i*.7),.08);scale.scale.set(1,.6,.55);}
 return q;
}
function brocadeQuilt(g){
 // The top is still exactly local .855, including under back/hips/heels. Color
 // is woven into vertices, not a raised/coplanar decal that changes contact.
 const geo=new THREE.PlaneGeometry(3.72,3.1,48,40);geo.rotateX(-Math.PI/2);geo.translate(0,.075,0);const body=new THREE.BoxGeometry(3.72,.15,3.1),bp=body.attributes.position,bn=body.attributes.normal,bu=body.attributes.uv,base=body.index.array,top=geo.toNonIndexed(),positions=[...top.attributes.position.array],normals=[...top.attributes.normal.array],uvs=[...top.attributes.uv.array];top.dispose();for(let k=0;k<base.length;k+=3){if(bn.getY(base[k])>.9)continue;for(const i of base.slice(k,k+3)){positions.push(bp.getX(i),bp.getY(i),bp.getZ(i));normals.push(bn.getX(i),bn.getY(i),bn.getZ(i));uvs.push(bu.getX(i),bu.getY(i));}}body.dispose();geo.setIndex(null);geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));const a=geo.attributes.position,n=geo.attributes.normal,colors=[];
 const red=new THREE.Color(C.red),gold=new THREE.Color(C.gold),ink=new THREE.Color(C.ink);
 for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),edge=Math.min(1.86-Math.abs(x),1.55-Math.abs(z));let c=red;
  if(n.getY(i)>.9){const u=(x+.31)/.62,v=(z+.31)/.62,dx=(u-Math.floor(u))-.5,dz=(v-Math.floor(v))-.5,r=Math.hypot(dx,dz),angle=Math.atan2(dz,dx);if(edge<.095)c=gold;else if(edge<.17)c=ink;else if(Math.abs(r-(.22+.035*Math.cos(angle*6)))<.06||r<.055)c=gold;}
  else if(Math.abs(a.getY(i))>.049)c=gold;colors.push(c.r,c.g,c.b);
 }
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const quilt=G.mesh(g,geo,0xffffff,0,.78,.5,{vertexColors:true});quilt.name='Level gold-cloud brocade quilt';quilt.userData.beddingSupport=true;return quilt;
}
export function buildChinaDragonBed(parent){
 const bed=new THREE.Group();bed.name='静宜寝殿 · 雕龙龙榻';bed.position.set(-21,.2,-9);parent.add(bed);
 G.box(bed,0,.25,0,3.8,.5,4.1,C.wood).name='Dragon bed platform';
 for(const z of[-2.03,2.03]){G.box(bed,0,.40,z,3.78,.06,.065,C.gold);G.box(bed,0,.12,z,3.72,.06,.065,C.gold);for(const x of[-1.25,0,1.25])cloud(bed,x,.24,z+(z>0?.045:-.045),.53);}
 for(const x of[-1.88,1.88])G.box(bed,x,.40,0,.055,.055,3.95,C.gold);
 G.box(bed,0,.59,0,3.7,.3,4,0xf3e5ce).name='Preserved R12 mattress';brocadeQuilt(bed);
 for(const x of[-.55,.55]){const p=G.box(bed,x,.84,-1.53,.85,.2,.55,C.ivory);p.name='Preserved R12 silk pillow';p.userData.beddingSupport=true;for(const sign of[-1,1])G.box(bed,x+sign*.401,.841,-1.53,.025,.19,.54,C.gold);}
 // Three-panel carved surround; all relief sits behind the original pillows.
 G.box(bed,0,1.20,-2.045,3.90,1.99,.16,C.wood).name='Dragon bed headboard';
 for(const x of[-1.29,0,1.29]){const q=new THREE.Group();q.position.set(x,1.46,-1.94);bed.add(q);const panel=relief(q,[[-.57,-.49],[-.57,.31],[-.45,.42],[-.30,.42],[-.23,.52],[.23,.52],[.30,.42],[.45,.42],[.57,.31],[.57,-.49]],.025,C.red);panel.name='Cloud-crowned headboard field';stroke(q,[[-.52,-.42,.055],[-.52,.27,.055],[-.39,.36,.055],[-.22,.36,.055],[-.17,.46,.055],[.17,.46,.055],[.22,.36,.055],[.39,.36,.055],[.52,.27,.055],[.52,-.42,.055]],.023);}
 dragon(bed,-.86,1.60,-1.85,.70,1);dragon(bed,.86,1.60,-1.85,.70,-1);G.sphere(bed,0,1.93,-1.81,.12,C.gold,1,1,.45);cloud(bed,0,1.26,-1.83,.85);
 for(const x of[-1.88,1.88])for(const z of[-2,2]){G.cyl(bed,x,1.52,z,.093,.118,3.04,C.wood,10);for(const y of[.49,.98,2.73,3.02])G.cyl(bed,x,y,z,.125,.125,.065,C.gold,10);G.box(bed,x,1.87,z+.10,.027,1.6,.022,C.gold);}
 // Continuous front/side crown, with small pierced cloud fields and attached
 // dragon relief. No diagonal floating bars or separate front cloth billboard.
 for(const z of[-2,2]){G.box(bed,0,2.99,z,3.95,.20,.18,C.wood);G.box(bed,0,3.07,z,3.98,.045,.20,C.gold);G.box(bed,0,2.87,z,3.69,.055,.15,C.gold);}
 for(const x of[-1.88,1.88]){G.box(bed,x,2.99,0,.18,.20,4.0,C.wood);G.box(bed,x,3.07,0,.20,.045,4.08,C.gold);for(const z of[-1.25,0,1.25]){const q=cloud(bed,x,2.84,z,.42);q.rotation.y=Math.PI/2;}}
 dragon(bed,-.74,2.79,2.105,.38,1);dragon(bed,.74,2.79,2.105,.38,-1);G.sphere(bed,0,2.91,2.13,.080,C.gold,1,1,.45);
 for(const side of[-1,1]){const q=new THREE.Group();q.position.set(side*1.71,2.67,2.035);q.scale.x=side;bed.add(q);relief(q,[[-.12,.22],[-.58,.22],[-.53,.14],[-.38,.09],[-.29,-.06],[-.21,-.29],[-.12,-.29]],.08,C.wood);stroke(q,[[-.15,.17,.10],[-.48,.17,.10],[-.33,.03,.10],[-.18,-.23,.10]],.027);}
 bed.userData.dragonBed={version:1,original:true,reference:'https://www.sglynp.com/t134924',bedding:{quiltY:1.055,pillowY:1.14},footprint:[4,4.2]};return bed;
}
function sheetGeometry(width,height){
 const p=[],uv=[],idx=[],nx=32,ny=12;
 for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const u=x/nx,v=y/ny;p.push((u-.5)*width,(.5-v)*height,.026*Math.sin(u*Math.PI*12)*(.82+.18*v));uv.push(u,v);}
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;idx.push(a,c,b,b,c,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();geo.computeBoundingSphere();return geo;
}
export function createChinaDragonCurtains(parent,d){
 const g=new THREE.Group();g.name='china operable wraparound dragon-bed gauze';g.userData.furnitureInteraction='canopy';g.position.set(d.center[0],0,d.center[2]);parent.add(g);
 const material=new THREE.MeshToonMaterial({color:d.color,transparent:true,opacity:.40,side:THREE.DoubleSide,depthWrite:false,depthTest:true});material.forceSinglePass=true;
 const panels=[],rings=[],ringTransform=new THREE.Object3D(),height=d.top-d.bottom,frontHalf=d.width/2-.07,sideLength=d.depth-.26;
 // Each sheet has its origin at its true centre. Equal renderOrder lets Three
 // sort back-to-front for the current camera, unlike fixed left/right layering.
 // 10cm corner clearance exceeds the full pleat excursion at every open amount.
 for(const side of[-1,1])for(const face of['front','side']){
  const width=face==='front'?frontHalf:sideLength,panel=new THREE.Mesh(sheetGeometry(width,height),material);panel.name='Translucent dragon gauze '+face+' '+(side<0?'left':'right');panel.castShadow=false;panel.receiveShadow=false;panel.renderOrder=22;panel.userData={singleSheet:true,clothThickness:.004,side,face,width};if(face==='side')panel.rotation.y=Math.PI/2;g.add(panel);panels.push(panel);
  const rail=G.cyl(g,face==='front'?side*(d.width/4-.04):side*d.width/2,d.top+.035,face==='front'?d.depth/2:0,.019,.019,width+.05,C.gold,8);rail.rotation.z=Math.PI/2;if(face==='side')rail.rotation.y=Math.PI/2;rail.name='Dragon bed gauze rail';
  const ring=new THREE.InstancedMesh(new THREE.TorusGeometry(.027,.006,4,12),G.material(C.gold),7);ring.name='Dragon gauze suspension rings';ring.castShadow=false;ring.receiveShadow=true;ring.frustumCulled=false;g.add(ring);rings.push({ring,panel});
 }
 function set(amount){for(const p of panels){const {face,side,width}=p.userData,scale=THREE.MathUtils.lerp(1,face==='front'?.28:.30,amount),w=width*scale;p.scale.x=scale;p.position.y=(d.top+d.bottom)/2;if(face==='front'){p.position.x=side*(d.width/2-.04-w/2);p.position.z=d.depth/2;}else{p.position.x=side*d.width/2;p.position.z=-sideLength/2+w/2;}}
  for(const {ring,panel:p}of rings){for(let i=0;i<7;i++){const dx=(i/6-.5)*p.userData.width*p.scale.x;ringTransform.position.set(p.userData.face==='front'?p.position.x+dx:p.position.x,d.top+.018,p.userData.face==='front'?p.position.z:p.position.z-dx);ringTransform.rotation.set(0,p.userData.face==='front'?Math.PI/2:0,0);ringTransform.updateMatrix();ring.setMatrixAt(i,ringTransform.matrix);}ring.instanceMatrix.needsUpdate=true;}
 }
 return {group:g,panels,material,set};
}

// Occupied-bed camera cavity: protect actual solid members, never fill the
// open bed interior or transparent gauze with the old whole-canopy box.
// World-space boxes are local geometry envelopes, plus the camera controller's
// existing .18m sweep radius. Walking and unoccupied camera contracts are fixed.
export function chinaDragonBedCameraParts(){
 const box=(x,y,z,w,h,d)=>({minX:-21+x-w/2,maxX:-21+x+w/2,minY:.2+y-h/2,maxY:.2+y+h/2,minZ:-9+z-d/2,maxZ:-9+z+d/2});
 const parts=[box(0,.42,0,4,.84,4.2),box(0,1.20,-1.98,3.90,1.99,.30)];
 for(const x of[-1.88,1.88])for(const z of[-2,2])parts.push(box(x,1.52,z,.25,3.04,.25));
 for(const z of[-2,2])parts.push(box(0,2.9675,z,3.98,.25,.20));
 for(const x of[-1.88,1.88])parts.push(box(x,2.9675,0,.20,.25,4.08));
 for(const x of[-.74,.74])parts.push(box(x,2.8525,2.10,.80,.485,.13));
 for(const x of[-1.365,1.365])parts.push(box(x,2.635,2.08,.52,.55,.12));
 return parts;
}
