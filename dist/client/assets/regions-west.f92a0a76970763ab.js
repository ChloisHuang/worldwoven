import {registerNightFixture} from '/assets/night-lighting.41621174f39ac4d8.js';
import * as G from '/assets/geometry.accd26d9fe1820ba.js';
const { THREE } = G;


// Merge the original static details by material, preserving an independent roof
// branch for cutaway mode. Empty transform groups are harmless and retain names.
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
function packLot(group,roofGroup){packStatic(roofGroup);packStatic(group,roofGroup);}

// Every scene is hand-built from original geometry. The circulation spine at
// x=0 is deliberately kept open from the garden gate through the house.
function solid(g, cs, x,y,z,w,h,d,c,rot=0) {
  const m=G.box(g,x,y,z,w,h,d,c,rot);
  const a=Math.abs(Math.cos(rot)), b=Math.abs(Math.sin(rot));
  G.collider(cs,x,z,w*a+d*b,d*a+w*b);
  return m;
}
function feetTable(g,cs,x,z,w,d,color,h=1) { G.table(g,x,z,w,d,color,h);G.collider(cs,x,z,w,d); }
function seat(g,cs,x,z,c,rot=0) {G.chair(g,x,z,c,rot);G.collider(cs,x,z,.85,.85);}
function potted(g,cs,x,z,leaf,s=1,flowers=null){G.plant(g,x,z,leaf,s,flowers);G.collider(cs,x,z,.62*s,.62*s);}
function boundary(cs){G.collider(cs,-14.6,0,.25,39.5);G.collider(cs,14.6,0,.25,39.5);G.collider(cs,0,-19.6,29.4,.25);G.collider(cs,0,19.6,29.4,.25);}
function wallFrame(g,x,y,z,w,h,wood,glass=0x769b9c) {
  G.box(g,x,y,z,w,.08,.17,wood);G.box(g,x,y+h,z,w,.08,.17,wood);
  for(const xx of [-w/2,w/2])G.box(g,x+xx,y+h/2,z,.09,h,.17,wood);
  G.box(g,x,y+h/2,z-.025,w-.16,h-.15,.05,glass);
  G.box(g,x,y+h/2,z+.08,.065,h,.08,wood);
  G.box(g,x,y+h*.5,z+.08,w,.065,.08,wood);
}
function framedArt(g,x,y,z,w,h,bg,frame) {
  G.box(g,x,y,z,w+.14,h+.14,.11,frame);
  G.box(g,x,y,z+.065,w,h,.04,bg);
}
function bread(g,x,y,z,s=1) {
  G.sphere(g,x,y,z,.32*s,0xd79b50,1.6,.55,.65);
  for(let i=-1;i<=1;i++)G.box(g,x+i*.22*s,y+.13*s,z,.08*s,.025,.28*s,0xefc582,.3);
}
function book(g,x,y,z,c,rot=0){G.box(g,x,y,z,.52,.10,.38,c,rot);G.box(g,x,y+.055,z,.43,.018,.33,0xf0e4c5,rot);}
function plate(g,x,y,z,c=0xf2e8d2,r=.27){G.cyl(g,x,y,z,r,r,.035,c,20);G.torus(g,x,y+.025,z,r*.88,.018,c);}
function cup(g,x,y,z,c=0xeee8d2){G.cyl(g,x,y+.1,z,.12,.095,.2,c);G.torus(g,x+.13,y+.1,z,.075,.022,c,0);}
function pillow(g,x,y,z,c,w=.64,d=.56){G.box(g,x,y,z,w,.18,d,c);G.box(g,x,y+.10,z,w*.88,.05,d*.88,c);}
function drapedRug(g,x,z,w,d,c,accent){G.rug(g,x,z,w,d,c,accent);for(let i=-w/2+.1;i<w/2;i+=.23)for(const zz of [-1,1])G.box(g,x+i,.29,z+zz*(d/2+.1),.035,.025,.22,0xe4ce97);}
function palm(g,cs,x,z,s=1) {
  const trunk=new THREE.Group();trunk.position.set(x,0,z);g.add(trunk);
  G.cyl(trunk,0,2.35*s,0,.19*s,.32*s,4.7*s,0x9e704b,9);
  for(let i=0;i<13;i++)G.torus(trunk,0,(.35+i*.32)*s,0,(.3-i*.007)*s,.045*s,0xb88a5b);
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9, frond=new THREE.Group();frond.position.y=4.55*s;frond.rotation.y=a;g.add(frond);frond.position.x=x;frond.position.z=z;
    for(let j=0;j<4;j++){
      const zz=(.4+j*.58)*s; // leaf sections follow a smooth crown arc
      const seg=G.sphere(frond,0,(.55-Math.pow(j/3,2)*.55)*s,zz,.48*s,j%2?0x608a4d:0x6e9950,.43,.13,1.02);
      seg.rotation.x=j*.17;
    }
    G.line(frond,[[0,0,0],[0,.65*s,1*s],[0,.1*s,2.6*s]],0x94a663);
  }
  for(let i=0;i<4;i++)G.sphere(g,x+Math.sin(i*2)*.32*s,4.23*s,z+Math.cos(i*2)*.32*s,.18*s,0xa45d34,.7,1.7,.7);
  G.collider(cs,x,z,.65*s,.65*s);
}
function lattice(g,x,y,z,w,h,color){
  G.box(g,x,y,z,w+.16,h+.16,.13,0x6e4a31);
  G.box(g,x,y,z+.075,w,h,.06,0x334c48);
  for(let i=-w/2;i<=w/2;i+=.22)G.box(g,x+i,y,z+.14,.038,h,.06,color);
  for(let j=-h/2;j<=h/2;j+=.22)G.box(g,x,y+j,z+.16,w,.038,.06,color);
}
function papyrus(g,x,y,z,s=.9){
  G.vessel(g,x,y,z,0xad7450,s);
  for(let i=0;i<7;i++){
    const a=i*2.4, xx=x+Math.sin(a)*.19*s, zz=z+Math.cos(a)*.19*s;
    G.cyl(g,xx,y+1.05*s,zz,.022,.022,.94*s,0x758447,5);
    const top=y+1.52*s+Math.sin(i)*.10;
    for(let j=0;j<5;j++){const b=j*1.25;const leaf=G.sphere(g,xx+Math.sin(b)*.12*s,top,zz+Math.cos(b)*.12*s,.14*s,0x87985a,1.8,.2,.65);leaf.rotation.y=-b;}
  }
}
function egyptFountain(g,cs,x,z){
  G.cyl(g,x,.18,z,1.8,1.9,.36,0xbd9470,8);
  G.cyl(g,x,.4,z,1.62,1.62,.24,0x387f8c,8);
  G.cyl(g,x,.53,z,1.41,1.41,.05,0x72c6ca,32);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;G.box(g,x+Math.sin(a)*1.53,.55,z+Math.cos(a)*1.53,.66,.09,.23,i%2?0xe6d9b3:0x286777,-a);}
  G.cyl(g,x,.9,z,.20,.35,.9,0xd2b68b,12);G.cyl(g,x,1.38,z,.69,.38,.18,0x34848a,12);G.cyl(g,x,1.49,z,.57,.57,.04,0x8ad8d8,24);
  G.sphere(g,x,1.62,z,.14,0x8ad8d8,.6,1.6,.6);G.torus(g,x,.57,z,.9,.014,0xb2e5dc);
  G.collider(cs,x,z,3.7,3.7);
}

// Slim curved bands are original, open arch geometry: the opening stays
// genuinely empty, so the visible architecture matches the collision plan.
function archBand(g,x,z,w,spring,rise,color,depth=.24){
  const n=20;
  for(let i=0;i<n;i++){
    const a=i*Math.PI/n,b=(i+1)*Math.PI/n;
    const ax=Math.cos(a)*w/2,ay=Math.sin(a)*rise,bx=Math.cos(b)*w/2,by=Math.sin(b)*rise;
    const stone=G.box(g,x+(ax+bx)/2,spring+(ay+by)/2,z,Math.hypot(bx-ax,by-ay)+.035,.15,depth,color);
    stone.rotation.z=Math.atan2(by-ay,bx-ax);
  }
}
function hangingTextile(g,x,y,z,w,h,base,accent){
  G.box(g,x,y,z,w,h,.04,base);
  for(const xx of [-.38,.38])G.box(g,x+xx*w,y,z+.027,.07,h-.15,.025,accent);
  for(let i=0;i<4;i++)G.box(g,x,y-h*.32+i*h*.22,z+.035,w*.48,.055,.025,accent);
  for(let i=0;i<9;i++)G.box(g,x-w*.43+i*w*.107,y-h/2-.06,z,w*.035,.13,.03,0xe7c994);
  G.box(g,x,y+h/2+.06,z,w+.25,.07,.1,0x795539);
}
function egyptCourt(g,roof,cs,C){
  // The central circulation spine becomes the open court of an inward-facing
  // house. Two shaded galleries connect its four rooms without pinching paths.
  G.box(g,0,.235,-1.6,5.55,.025,9.35,0xe6cba0);
  for(const x of [-2.42,2.42])G.box(g,x,.257,-1.6,.13,.024,8.9,C.turquoise);
  for(const z of [-5.98,2.82])G.box(g,0,.257,z,4.95,.024,.13,C.turquoise);
  for(let z=-5.8;z<2.8;z+=.55)for(const x of [-2.16,2.16])G.box(g,x,.258,z,.16,.025,.16,0xbf8054,Math.PI/4);
  for(const x of [-3.02,3.02]){
    for(const z of [-5.7,-1.8,2.2]){
      solid(g,cs,x,1.59,z,.27,3.0,.27,0xd1af7c);
      G.box(g,x,.34,z,.47,.24,.47,0xc29e6a);G.box(g,x,3.0,z,.52,.24,.52,C.dark);
    }
    // Along-side arch planes are rotated so they look into the court.
    const arcade=new THREE.Group();arcade.position.x=x;arcade.rotation.y=Math.PI/2;g.add(arcade);
    for(const z of [-3.75,.2])archBand(arcade,-z,0,3.6,2.20,.81,C.wall,.29);
    G.box(roof,x,3.47,-1.65,1.8,.19,8.95,C.dark);
    for(let z=-5.9;z<2.8;z+=.38)G.box(roof,x,3.61,z,1.95,.10,.13,0xb89860);
  }
  archBand(g,0,3.35,5.55,2.28,1.04,C.dark,.37);
  // A patterned divan-wall textile and screened lantern niches face inward.
  for(const x of [-3.06,3.06]){
    const niche=new THREE.Group();niche.position.set(x,0,-6.45);niche.rotation.y=x<0?Math.PI/2:-Math.PI/2;g.add(niche);
    lattice(niche,0,2.12,0,1.28,1.08,C.dark);
  }
  G.lamp(g,-2.12,2.8,2.74,0xf0c771,.18);G.lamp(g,2.12,2.8,2.74,0xf0c771,.18);
  // Low basin beside the workshop, never on the center walk.
  solid(g,cs,-1.72,.37,-5.0,.95,.50,.92,0xc9a271);
  G.cyl(g,-1.72,.67,-5.0,.39,.39,.07,C.turquoise,16);G.cyl(g,-1.72,.72,-5.0,.31,.31,.03,0x80c1bd,16);
}

function egyptSymbols(g,cs,C){
  // Garden-sized monuments are original sculptures, built from recognisable
  // forms rather than imported assets or labels: lion body, human face, nemes.
  const sphinx=new THREE.Group();sphinx.position.set(-8.0,0,16.0);g.add(sphinx);
  G.box(sphinx,0,.18,0,3.15,.35,4.7,0xb49462);
  G.sphere(sphinx,0,.98,-.43,.95,0xd2b477,1.13,.88,1.65);
  for(const x of [-.76,.76]){
    G.sphere(sphinx,x,.53,1.32,.45,0xd2b477,.64,.57,1.72);
    G.sphere(sphinx,x,.49,1.98,.39,0xc7a76b,.92,.53,.70);
    for(let i=0;i<3;i++)G.box(sphinx,x-.16+i*.16,.59,2.19,.025,.045,.19,0x9b7b51);
    G.sphere(sphinx,x,.86,-1.26,.57,0xcbaa72,.86,1,1.1);
  }
  G.box(sphinx,0,1.25,.83,1.40,1.28,.98,0xd4b57a);
  G.sphere(sphinx,0,2.24,.83,.68,0xd7b77a,.83,1.10,.68);
  // Striped nemes panels flare beside the face, with an upright uraeus.
  for(const side of [-1,1]){
    const panel=G.box(sphinx,side*.61,2.06,.78,.42,1.33,.61,0x3d6e79);panel.rotation.z=side*.16;
    for(let i=0;i<6;i++)G.box(sphinx,side*.63,1.56+i*.20,1.095,.38,.075,.038,0xd8b878);
  }
  G.sphere(sphinx,0,2.83,.73,.71,0x3d6e79,1,.37,.69);
  G.cyl(sphinx,0,2.99,1.06,.07,.12,.31,0xd2af60,8);
  G.box(sphinx,0,2.22,1.325,.15,.25,.20,0xbd965a);
  for(const x of [-.24,.24])G.box(sphinx,x,2.40,1.305,.19,.053,.05,0x675841);
  G.box(sphinx,0,2.02,1.315,.34,.05,.07,0x9e7947);
  G.box(sphinx,0,1.83,1.27,.17,.34,.16,0x795a39);
  G.collider(cs,-8,16,3.15,4.7);
  for(const [x,z,r,h]of [[6.55,16.22,3.05,4.45],[10.1,14.40,1.50,2.34]]){
    const half=r/Math.sqrt(2);G.box(g,x,.10,z,half*2+.22,.20,half*2+.22,0xc5a16b);
    G.cone(g,x,h/2+.2,z,r,h,0xd4ba7c,4,Math.PI/4);
    for(let y=.68;y<h;y+=.58){const w=half*(1-(y-.2)/h);for(const side of [-1,1]){G.box(g,x,y,z+side*w,2*w,.026,.035,0xb39360);G.box(g,x+side*w,y,z,.035,.026,2*w,0xb39360);}}
    G.cone(g,x,h-.01,z,r*.11,h*.11,0xe0c77f,4,Math.PI/4);G.collider(cs,x,z,half*2+.22,half*2+.22);
  }
  // Rear colonnade: bundled papyrus/lotus capitals and polychrome abaci.
  for(const x of [-8.8,-4.4,0,4.4,8.8]){
    G.cyl(g,x,1.73,-16.78,.28,.39,3.15,0xc7a06a,12);G.cyl(g,x,.31,-16.78,.52,.58,.35,0xb78f5d,12);
    for(const y of [1.02,1.21,2.55])G.cyl(g,x,y,-16.78,.30,.30,.09,y===1.21?0xa65b3d:0x397781,12);
    G.cyl(g,x,3.27,-16.78,.55,.30,.53,0x426f71,10);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;G.sphere(g,x+Math.sin(a)*.30,3.33,-16.78+Math.cos(a)*.30,.22,0xb69d57,.58,1.5,.58);}
    G.box(g,x,3.66,-16.78,1.10,.25,1.1,0xd6b67b);G.collider(cs,x,-16.78,.80,.80);
  }
  G.box(g,0,3.98,-16.78,19.0,.42,1.0,0xd5b679);
  G.box(g,0,3.98,-16.20,18.4,.12,.07,0x327382);
  for(let x=-8.7;x<9;x+=.65)G.box(g,x,4.19,-16.20,.23,.19,.065,0xb1663e,Math.PI/4);
  // Repeated shallow glyph-like registers read as carved temple ornament.
  for(const x of [-8.8,-4.4,0,4.4,8.8])for(let j=0;j<3;j++){
    G.box(g,x,1.49+j*.28,-16.473,.23,.19,.033,0xddc28d);
    G.box(g,x-.065,1.49+j*.28,-16.445,.035,.13,.02,0x7a6648);G.box(g,x+.025,1.53+j*.28,-16.444,.13,.025,.02,0x7a6648);
  }
}
function mythicRelief(g,x,y,z,type){
  framedArt(g,x,y,z,2.14,2.36,0xc1a372,0x557878);
  G.box(g,x,y-1.00,z+.15,1.90,.13,.08,0xa87a45);
  const gold=0xd5b66a,ink=0x416872;
  if(type==='falcon'){
    for(const side of [-1,1])for(let i=0;i<5;i++){const wing=G.box(g,x+side*(.23+i*.145),y+.05-i*.095,z+.14,.17,.80-i*.055,.10,i%2?gold:ink);wing.rotation.z=-side*.62;}
    G.sphere(g,x,y-.06,z+.20,.31,ink,.65,1.65,.24);G.sphere(g,x,y+.57,z+.20,.24,gold,.80,1,.30);
    G.box(g,x+.21,y+.53,z+.22,.22,.10,.10,gold);G.cyl(g,x,y+.94,z+.16,.19,.19,.09,0xae623c,16).rotation.x=Math.PI/2;
  }else{
    G.sphere(g,x,y-.18,z+.15,.45,ink,.66,1.38,.14);G.box(g,x,y-.71,z+.19,.78,.15,.09,ink);
    G.sphere(g,x,y+.50,z+.16,.30,ink,.78,.85,.15);
    for(const side of [-1,1]){const ear=G.cone(g,x+side*.18,y+.94,z+.16,.13,.52,ink,3,Math.PI);ear.scale.z=.26;}
    if(type==='jackal')G.box(g,x+.36,y+.49,z+.16,.46,.14,.10,ink);
    G.box(g,x,y+.08,z+.20,.61,.13,.04,gold);G.sphere(g,x+.10,y+.58,z+.22,.05,gold,1,1,.10);
    const tail=G.torus(g,x+.45,y-.45,z+.16,.32,.06,ink,0);tail.scale.y=1.48;
  }
}

export function buildEgypt(){
  const group=new THREE.Group(),colliders=[],roofGroup=new THREE.Group();group.name='尼罗河畔 · 手作庭院';roofGroup.name='埃及屋顶';group.add(roofGroup);
  const C={sand:0xd9bd87,wall:0xe9ce9b,dark:0x80563b,turquoise:0x3f8990,ink:0x365f68};
  G.baseLot(group,C.sand,0xe5cea0);boundary(colliders);
  egyptSymbols(group,colliders,C);
  // Stone pavers, sun-baked floor and a welcoming, open front door.
  for(let i=0;i<6;i++)G.box(group,0,.08,4.8+i*2,2.7,.08,1.65,i%2?0xd8b987:0xe5cda7);
  G.houseShell(group,colliders,{floor:0xc79b66,wall:C.wall,trim:C.dark});
  for(let x=-9.75;x<10;x+=1.4)for(let z=-12.6;z<3;z+=1.4)G.box(group,x,.213,z,1.36,.018,1.36,((Math.round(x*10)+Math.round(z*10))%3===0)?0xcba777:0xd3ad7e);
  for(const x of [-6.65,6.65])solid(group,colliders,x,.57,3.35,7.4,1.12,.3,C.wall);
  for(const x of [-2.8,2.8]){solid(group,colliders,x,1.72,3.35,.42,3.45,.52,C.wall);G.box(group,x,3.28,3.35,.69,.25,.78,C.dark);}
  G.box(roofGroup,0,3.58,3.35,6.5,.43,.7,C.dark);
  for(const x of [-5.1,5.1]){lattice(group,x,2.15,-13.1,2.05,1.6,C.dark);G.box(group,x,1.27,-12.99,2.34,.15,.45,C.dark);}
  mythicRelief(group,-7.8,1.99,-13.02,'falcon');mythicRelief(group,0,1.96,-13.00,'jackal');mythicRelief(group,7.65,1.99,-13.02,'cat');
  // Shallow carved relief frieze, ochre and blue banding.
  for(let i=0;i<27;i++){const x=-9.75+i*.75;G.box(group,x,3.30,-13.08,.35,.16,.1,i%2?C.turquoise:0xba754c,Math.PI/4);}
  for(const x of [-10.35,10.35])for(let z=-12.7;z<3;z+=2.1)G.box(group,x,1.18,z,.38,.18,1.1,0xd1ad77);
  for(const x of [-6.55,6.55])G.box(group,x,1.19,3.35,7.5,.11,.41,0xc8a16a);
  // Interior partitions stop short of the broad central passage.
  for(const x of [-6.8,6.8])solid(group,colliders,x,.69,-6.5,6.8,1.25,.2,0xddbf8e);
  for(const x of [-3.4,3.4])solid(group,colliders,x,1.17,-6.5,.2,2.2,.3,C.dark);
  // A true U-shaped terrace roof opens to the sky above the central court.
  // Each wing has its own visible mass rather than one rectangular lid.
  egyptCourt(group,roofGroup,colliders,C);
  for(const x of [-6.84,6.84]){
    G.box(roofGroup,x,3.94,-5,7.82,.26,17.5,0xd2b080);
    for(let xx=x-3.5;xx<x+3.6;xx+=1.1)G.box(roofGroup,xx,3.73,-5,.20,.28,17.5,0x977147);
    G.box(roofGroup,x<0?-2.88:2.88,4.30,-1.8,.27,.66,10.95,C.wall);
  }
  G.box(roofGroup,0,3.94,-10.14,5.9,.26,7.23,0xd2b080);
  G.box(roofGroup,0,4.30,-6.65,5.9,.66,.28,C.wall);
  for(const x of [-10.55,10.55])G.box(roofGroup,x,4.4,-5,.35,.85,17.6,C.wall);
  G.box(roofGroup,0,4.4,-13.65,21.4,.85,.32,C.wall);
  for(const x of [-6.82,6.82])G.box(roofGroup,x,4.4,3.65,7.84,.85,.32,C.wall);
  for(let x=-9.7;x<10;x+=1.15)for(const z of [-13.65,3.65])if(z<0||Math.abs(x)>3.3)G.box(roofGroup,x,4.91,z,.52,.26,.37,C.wall);
  // A projecting mashrabiya above the workshop anchors the outer silhouette.
  G.box(roofGroup,-6.1,4.48,-13.85,5.15,.21,1.48,0x745033);
  for(const x of [-8.62,-3.58])G.box(roofGroup,x,5.31,-13.9,.18,1.52,1.55,0x80583b);
  const screen=new THREE.Group();screen.rotation.y=Math.PI;screen.position.set(-6.1,0,-14.55);roofGroup.add(screen);
  lattice(screen,0,5.35,0,4.76,1.26,0xb38553);
  G.box(roofGroup,-6.1,6.12,-13.93,5.58,.17,1.78,0x87613e);
  for(let x=-8.55;x<-3.55;x+=.46)G.box(roofGroup,x,4.18,-13.49,.18,.58,.69,0x997346);
  G.box(roofGroup,6.8,4.19,-7,3.4,.15,3,0xc29b69);
  for(const [x,z,s] of [[8,-10,1.3],[7,-10.5,.9],[-8.9,-10,1],[-8.2,-10.8,.7]])G.vessel(roofGroup,x,4.09,z,0xb57650,s);
  // Papyrus artisan room, rolls, pigments and a woven basket.
  drapedRug(group,-6.7,-10,5.9,4.3,0x9f583f,0xe5bd72);
  feetTable(group,colliders,-6.5,-10,4.3,1.6,0x9b673e);
  for(let i=0;i<5;i++){const r=G.cyl(group,-7.7+i*.5,1.14,-10.15,.115,.115,.68,0xe5c78b,12);r.rotation.z=Math.PI/2;}
  G.box(group,-6.0,1.11,-9.84,1.1,.025,.62,0xeedcb0);
  for(let i=0;i<5;i++)G.box(group,-6.36+i*.14,1.13,-9.84,.018,.01,.35,0xb8904f);
  for(const [i,c]of [[0,0x2a7a87],[1,0xad563d],[2,0xcb9a43]])G.cyl(group,-5.1+i*.27,1.14,-10.2,.11,.13,.18,c,12);
  G.box(group,-5.05,1.13,-9.65,.055,.025,.7,0x634a32,.6);
  seat(group,colliders,-6.5,-11.65,0x91643e,Math.PI);
  papyrus(group,-9.5,0,-11.8,1.15);G.collider(colliders,-9.5,-11.8,.9,.9);
  G.cyl(group,-4.4,.38,-12.2,.45,.37,.75,0xbb965e,12);G.collider(colliders,-4.4,-12.2,.9,.9);
  for(let i=0;i<5;i++)G.torus(group,-4.4,.12+i*.14,-12.2,.39+i*.009,.03,0x8d714b);
  // A working artisan's wall: rolled papyrus, pigment jars and an unfinished
  // hand-woven hanging keep the scene lived-in without blocking the work aisle.
  G.box(group,-7.7,2.43,-12.95,3.15,.13,.52,C.dark);
  for(let i=0;i<5;i++){const r=G.cyl(group,-8.8+i*.42,2.66,-12.89,.09,.09,.38,0xe5c993,10);r.rotation.z=Math.PI/2;}
  for(let i=0;i<3;i++)G.vessel(group,-6.75+i*.28,2.5,-12.9,[0x72948b,0xa75e41,0xc8a064][i],.36);
  hangingTextile(group,-4.55,2.24,-13.0,1.22,1.3,0xc18b54,0x416e73);
  // Bread kitchen with domed clay oven and storage counter.
  solid(group,colliders,8.6,.65,-11.1,2.45,1.3,2.5,0xc5a477);
  G.sphere(group,8.6,1.28,-11.1,1.24,0xcb9e6a,1,1.07,1);
  G.sphere(group,8.6,1.24,-9.86,.49,0x624934,.85,.84,.10);G.box(group,8.6,.99,-9.81,1,.08,.24,0x805b39);
  G.sphere(group,8.6,1.03,-9.74,.2,0xf4a448,1,.30,.1);
  G.cyl(roofGroup,8.6,4.68,-11.1,.39,.44,1.5,0xbe9467,10);G.cyl(roofGroup,8.6,5.42,-11.1,.52,.52,.18,0xddbb89,10);
  solid(group,colliders,5.15,.69,-11.5,3.75,1.3,1.35,0xc5a478);G.box(group,5.15,1.39,-11.5,3.88,.13,1.47,0xe4ceaa);
  for(let i=0;i<3;i++){G.box(group,4+i*1.1,.73,-10.80,.97,.87,.045,0x906844);G.torus(group,4+i*1.1,.83,-10.74,.075,.018,0xc3a35e,0);}
  bread(group,4.3,1.60,-11.5,.9);bread(group,5.2,1.58,-11.5,.8);G.vessel(group,6.25,1.46,-11.65,0x855d41,.67);
  G.box(group,4.65,2.42,-13,3.2,.13,.56,C.dark);
  for(let i=0;i<4;i++)G.vessel(group,3.5+i*.75,2.50,-12.98,i%2?0xa86d45:0xe1c791,.64);
  feetTable(group,colliders,5.8,-8.1,2.7,1.15,0x9c7046,.97);plate(group,5.4,1.07,-8.1);bread(group,5.4,1.22,-8.1,.65);G.sphere(group,6.4,1.18,-8.1,.24,0xd7bd80,1.2,.55,1);
  // Copper ladles, linen sacks and a flour bowl belong to the bread station.
  G.box(group,8.95,2.95,-12.99,1.65,.075,.11,C.dark);
  for(let i=0;i<3;i++){G.box(group,8.38+i*.48,2.55,-12.89,.035,.71,.045,0x71533c);G.sphere(group,8.38+i*.48,2.21,-12.88,.14,0xbb8552,1,.9,.24);}
  G.cyl(group,6.30,1.48,-11.13,.28,.22,.16,0xc8b289,16);G.sphere(group,6.30,1.57,-11.13,.21,0xe3d3aa,1,.26,1);
  for(const [x,z]of [[9.5,-7.7],[8.8,-7.55]]){G.sphere(group,x,.5,z,.42,0xbba277,.9,1.2,.8);G.torus(group,x,.93,z,.14,.032,0x87724b);G.collider(colliders,x,z,.72,.65);}
  // Family sitting room, low divans and patterned cotton cushions.
  drapedRug(group,-6.65,-1.55,6,5.7,0x2e727b,0xd8b16e);
  solid(group,colliders,-8.9,.36,-2.1,1.5,.53,4.2,0x986641);G.box(group,-8.9,.70,-2.1,1.47,.28,4.12,0xd8b57b);
  G.box(group,-9.52,1.06,-2.1,.22,.7,4.12,0xb57c51);
  for(const z of [-3.4,-2.05,-.7])pillow(group,-8.8,.94,z,z===-2.05?0x6b8f80:0xb9553f,.76,.83);
  solid(group,colliders,-6.2,.36,1,4.5,.53,1.35,0x986641);G.box(group,-6.2,.71,1,4.47,.27,1.30,0xd8b57b);G.box(group,-6.2,1.07,1.53,4.45,.72,.2,0xb57c51);
  for(const x of [-7.65,-6.2,-4.8])pillow(group,x,.94,1,0x9d5741,.78,.7);
  feetTable(group,colliders,-6.35,-1.6,2.45,1.5,0x75583b,.65);
  G.cyl(group,-6.35,.78,-1.6,.7,.7,.045,0xc4a969,24);G.vessel(group,-6.5,.80,-1.65,0xd5bd7c,.48);cup(group,-5.95,.80,-1.6,0x477b81);cup(group,-6.7,.80,-1.28,0x477b81);
  for(let i=0;i<6;i++)G.sphere(group,-6.1+Math.sin(i)*.15,.86,-1.85+Math.cos(i)*.1,.06,0x835839,1.6,.8,1);
  G.lamp(group,-9.5,2.9,-4.8,0xffd697,.26);
  hangingTextile(group,-6.85,1.94,-6.36,2.0,1.30,0xb87953,0xdac592);
  G.box(group,-8.0,1.83,-6.33,2.68,.12,.48,C.dark);
  G.vessel(group,-8.82,1.90,-6.30,0x55877d,.62);G.vessel(group,-8.20,1.90,-6.30,0xba8557,.48);book(group,-7.47,1.94,-6.29,0xb89461);
  // Indigo woven bands run through the cushions and folded household linen.
  for(const z of [-3.4,-2.05,-.7])for(const dx of [-.19,.19])G.box(group,-8.8+dx,1.07,z,.065,.024,.71,0xe5ca9a);
  G.box(group,-5.02,.93,1.0,.77,.035,.43,0x547f80);
  // Linen bedroom and inlaid cedar storage.
  drapedRug(group,6.65,-1.85,5.9,6,0xc27a55,0xf0d098);
  G.bed(group,7.6,-2.7,0x3c8b90,3.6,4.1);G.collider(colliders,7.6,-2.7,3.7,4.25);
  for(let i=0;i<7;i++)G.box(group,6.16+i*.48,.874,-1.9,.18,.025,2.45,0xdac18a);
  solid(group,colliders,4.65,.51,-4.35,1.2,.98,1.15,0x8a623e);G.vessel(group,4.65,1.05,-4.35,0xcbad72,.63);
  solid(group,colliders,5.25,.43,1.3,3.2,.74,1.05,0x84613d);G.box(group,5.25,.83,1.3,3.28,.13,1.1,0x9f7547);
  for(let i=0;i<5;i++)G.box(group,4.03+i*.61,.48,1.85,.24,.24,.035,0xd0ad65,Math.PI/4);
  potted(group,colliders,9.5,1.6,0x6d8e53,.8);
  for(let i=0;i<3;i++)G.box(group,5.05,.94+i*.11,1.30,1.42-i*.1,.10,.68,[0xe3c99a,0x618e88,0xd1b178][i]);
  hangingTextile(group,7.75,2.02,-6.34,2.55,1.42,0xe0bd80,0x4d8286);
  G.box(group,9.85,2.45,-3.55,.11,.12,2.4,C.dark);
  for(let i=0;i<6;i++)G.box(group,9.77,1.89,-4.48+i*.36,.10,1.10,.21,i%2?0xddc490:0xd2b17a);
  // Garden: shaded tea nook, flowing tiled fountain, palms and small beds.
  egyptFountain(group,colliders,-6.1,10.2);
  for(const [x,z,s]of [[-11.9,14.1,1.05],[11.4,13,1.12],[-11.7,5.8,.88],[11.7,6,.86]])palm(group,colliders,x,z,s);
  for(const [x,z]of [[-11.4,17.5],[11.3,17.3],[-10,7.6],[9.6,5.6]]){G.box(group,x,.2,z,2.1,.38,1.3,0xbc925f);G.collider(colliders,x,z,2.1,1.3);for(let i=0;i<5;i++)G.plant(group,x-.76+i*.38,z,0x6c965c,.4,0xd5b670);}
  const shade=new THREE.Group();group.add(shade);
  for(const x of [4.6,9.5])for(const z of [7,11.4])solid(shade,colliders,x,1.65,z,.18,3.3,.18,C.dark);
  for(let x=4.6;x<=9.6;x+=.38)G.box(shade,x,3.36,9.2,.15,.13,4.85,0xc3a16c);
  for(const z of [7,11.4])G.box(shade,7.05,3.22,z,5.5,.18,.18,C.dark);
  feetTable(group,colliders,7.05,9.1,2.15,1.5,0x885d3d,.88);seat(group,colliders,5.36,9.1,C.turquoise,-Math.PI/2);seat(group,colliders,8.7,9.1,C.turquoise,Math.PI/2);
  plate(group,7.25,.99,9.1,0xc99e59,.39);bread(group,7.25,1.12,9.1,.6);G.vessel(group,6.65,.98,9,0xad714a,.55);cup(group,7.3,.99,9.62,C.turquoise);
  for(const x of [-2.4,2.4]){G.vessel(group,x,0,4.9,0xb67e53,1.25);G.collider(colliders,x,4.9,.8,.8);}
  const stations=[
    {id:'egypt-papyrus',name:'纸莎草工坊',action:'绘制纸莎草画',position:[-6.5,0,-8.45],color:'#c39a55',workTarget:[-5.1,1.2,-10],npcName:'莱拉',npcAction:'paint',npcLabel:'调配植物颜料',npcPosition:[-4,0,-10],route:[[-4,0,-10],[-3.9,0,-8.1]]},
    {id:'egypt-bread',name:'面包厨房',action:'烘烤传统扁面包',position:[6.3,0,-9.4],color:'#df9b5a',workTarget:[4.3,1.6,-11.5],npcName:'奥马尔',npcAction:'knead',npcLabel:'揉面与烘焙',npcPosition:[4,0,-9.45],route:[[4,0,-9.45],[3,0,-8.2]]},
    {id:'egypt-tea',name:'家庭茶叙',action:'泡一壶薄荷茶',position:[-4.6,0,-1.6],color:'#5bb7ae',workTarget:[-6.35,.9,-1.6],npcName:'萨米拉',npcAction:'tea',npcLabel:'准备茶具',npcPosition:[-6.1,0,-3.3],route:[[-6.1,0,-3.3],[-4.3,0,-3.3]]},
    {id:'egypt-bedroom',name:'亚麻卧房',action:'整理亚麻织物',position:[5,0,-1.6],color:'#d5a173',workTarget:[5.25,.9,1.3],npcName:'努尔',npcAction:'tidy',npcLabel:'收好手织亚麻',npcPosition:[3.8,0,.1],route:[[3.8,0,.1],[3.8,0,-2.2]]},
    {id:'egypt-garden',name:'棕榈庭院',action:'照料庭院与喷泉',position:[-3.6,0,10.2],color:'#69b7b6',workTarget:[-6.1,.6,10.2],npcName:'哈桑',npcAction:'garden',npcLabel:'照料庭院花草',npcPosition:[-7.1,0,13.2],route:[[-7.1,0,13.2],[-4.5,0,13.2],[-4.5,0,15.6]]}
  ];
  packLot(group,roofGroup);
  return {group,colliders,spawn:[0,0,16],stations,roofGroup};
}

// R5 closed-room architecture is independent of the 2D walking map. Lintels
// collide with the close camera at their real height, never with a walking avatar.
function frenchArchitecturalBox(g,nav,camera,x,y,z,w,h,d,color,walkBlock=false){
 G.box(g,x,y,z,w,h,d,color);camera.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});
 if(walkBlock)G.collider(nav,x,z,w,d);
}
function frenchRoomWall(g,nav,camera,{axis='x',at,from,to,bottom=.2,top=4.45,depth=.26,color=0xd6be96,openings=[]}){
 let cursor=from;const piece=(a,b,lo,hi,block)=>{if(b-a<.01||hi-lo<.01)return;const mid=(a+b)/2;frenchArchitecturalBox(g,nav,camera,axis==='x'?mid:at,(lo+hi)/2,axis==='x'?at:mid,axis==='x'?b-a:depth,hi-lo,axis==='x'?depth:b-a,color,block);};
 for(const o of [...openings].sort((a,b)=>a.from-b.from)){piece(cursor,o.from,bottom,top,true);piece(o.from,o.to,bottom,o.bottom??bottom,(o.bottom??bottom)>bottom+.1);piece(o.from,o.to,o.top,top,false);cursor=o.to;}piece(cursor,to,bottom,top,true);
}
function frenchGlazedWindow(g,x,y,z,w,h,wood=0xe7d2ad,axis='x',camera=null){
 const q=new THREE.Group();q.position.set(x,y,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);
 for(const yy of [0,h])G.box(q,0,yy,0,w+.14,.10,.19,wood);
 for(const xx of [-w/2,w/2,0])G.box(q,xx,h/2,0,.075,h,.17,wood);
 for(const yy of [h/3,h*2/3])G.box(q,0,yy,0,w,.06,.11,wood);
 G.mesh(q,new THREE.BoxGeometry(w-.12,h-.12,.025),0xaec3b1,0,h/2,0,{transparent:true,opacity:.23,depthWrite:false});
 if(camera)camera.push({minX:x-(axis==='x'?w/2:.025),maxX:x+(axis==='x'?w/2:.025),minY:y,maxY:y+h,minZ:z-(axis==='x'?.025:w/2),maxZ:z+(axis==='x'?.025:w/2)});
 return q;
}
function frenchCeiling(g,nav,camera,x,z,w,d,style='plaster'){
 const y=4.43,col=style==='salon'?0xe1ccb0:style==='bedroom'?0xd8d8c4:0xe4d4b6;
 frenchArchitecturalBox(g,nav,camera,x,y+.075,z,w,.15,d,col);
 // Three stepped cornice courses keep the room bounded at every view angle.
 for(const [drop,inset,thick,color] of [[.06,.08,.17,0xd7bb92],[.18,.17,.13,0xf0debb],[.27,.24,.085,0xbba070]])for(const side of [-1,1]){
  G.box(g,x+side*(w/2-inset),y-drop,z,thick,thick,d, color);G.box(g,x,y-drop,z+side*(d/2-inset),w,thick,thick,color);
 }
 if(style==='bakery'||style==='atelier'){
  for(let zz=z-d/2+.8;zz<z+d/2;zz+=1.65)G.box(g,x,y-.19,zz,w,.27,.17,style==='bakery'?0x8e7050:0xb9a68a);
 }else{
  for(const side of [-1,1]){G.box(g,x+side*(w/2-.72),y-.045,z,.055,.055,d-1.44,0xc4aa7b);G.box(g,x,y-.045,z+side*(d/2-.72),w-1.44,.055,.055,0xc4aa7b);}
  G.cyl(g,x,y-.06,z,.42,.42,.085,0xf0e0c2,24);G.torus(g,x,y-.11,z,.32,.045,0xc6ae81);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;G.sphere(g,x+Math.sin(a)*.25,y-.11,z+Math.cos(a)*.25,.10,0xe3cfa7,.48,.28,1.1).rotation.y=a;}
 }
}
function frenchPendant(roof,group,x,z,style='glass'){
 G.cyl(roof,x,4.05,z,.025,.025,.70,0x9a8054,8);
 G.cyl(roof,x,4.36,z,.18,.23,.09,0xb39867,12);
 if(style==='salon'){
  G.torus(roof,x,3.68,z,.46,.033,0xa38957);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,xx=x+Math.sin(a)*.46,zz=z+Math.cos(a)*.46;G.cyl(roof,xx,3.75,zz,.045,.09,.16,0xb49967,8);G.cyl(roof,xx,3.9,zz,.055,.055,.22,0xe9d6af,8);G.sphere(roof,xx,4.035,zz,.045,0xffd991,.65,1.3,.65);}
  G.sphere(roof,x,3.55,z,.11,0xb0925b,.85,1.5,.85);
 }else{
  G.cone(roof,x,3.71,z,.39,.27,style==='bakery'?0xb09470:0xe6d4ad,20,0);
  G.sphere(roof,x,3.56,z,.14,0xffe5b1,1,.78,1);
 }
 const light=new THREE.PointLight(0xffd5ac,19,11,1.7);light.position.set(x,3.50,z);light.castShadow=false;group.add(light);
}

function frenchWindow(g,x,z,w=2.3,camera=null){
  frenchGlazedWindow(g,x,1.05,z,w,2.69,0xe7d2ad,'x',camera);
  for(const side of [-1,1]){
    const xx=x+side*(w/2+.38);G.box(g,xx,2.4,z+.12,.62,2.91,.12,0x778e81);
    for(let i=0;i<12;i++)G.box(g,xx,1.16+i*.22,z+.20,.52,.055,.045,0x507f7c);
  }
  G.box(g,x,.98,z+.08,w+.28,.13,.38,0xcab38c);G.box(g,x,3.88,z+.05,w+.38,.16,.28,0xcab38c);
  for(const side of [-1,1])G.box(g,x+side*(w/2-.25),2.4,z+.21,.34,2.49,.06,0xc5ad90);
}
function lavender(g,cs,x,z,w=2.5,d=1.3){
  G.box(g,x,.22,z,w,.38,d,0xb7a788);G.box(g,x,.43,z,w-.15,.05,d-.15,0x7b7751);G.collider(cs,x,z,w,d);
  for(let i=0;i<Math.floor(w/.33);i++)for(let j=0;j<2;j++){
    const xx=x-w/2+.25+i*.34,zz=z+(j-.5)*.5;
    for(let k=0;k<3;k++){const dx=(k-1)*.075;G.cyl(g,xx+dx,.69+k*.04,zz,.018,.022,.5,0x6b8457,5);G.sphere(g,xx+dx,.99+k*.04,zz,.09,k%2?0x968ab8:0x7c73a3,.55,1.8,.55);}
  }
}
function frenchFountain(g,cs,x,z){
  G.cyl(g,x,.19,z,1.52,1.65,.38,0xbeb397,12);G.cyl(g,x,.4,z,1.41,1.41,.18,0xd4c7ad,12);G.cyl(g,x,.51,z,1.2,1.2,.04,0x7bbaae,24);
  G.cyl(g,x,.83,z,.27,.5,.8,0xd6c5a7,12);G.sphere(g,x,1.26,z,.3,0xd6c5a7,.9,1.3,.9);G.cyl(g,x,1.53,z,.82,.29,.22,0xc9b99a,16);G.cyl(g,x,1.66,z,.7,.7,.045,0x8fcac0,24);G.sphere(g,x,1.89,z,.2,0xcbbb9d);
  G.collider(cs,x,z,3.3,3.3);
}
function painting(g,x,y,z,w,h){
  framedArt(g,x,y,z,w,h,0x9cb7ba,0x9d7956);
  G.box(g,x,y-h*.23,z+.10,w*.95,h*.40,.022,0xa3a77a);
  const m=G.sphere(g,x-w*.1,y-h*.06,z+.12,w*.23,0x798865,1,.64,.03);
  G.box(g,x+w*.19,y-h*.13,z+.145,w*.22,h*.29,.026,0xe3c49a);
  const roof=G.cone(g,x+w*.19,y+h*.065,z+.16,w*.17,h*.16,0xa36c53,3,Math.PI);roof.scale.z=.10;
  G.sphere(g,x-w*.27,y+h*.28,z+.12,w*.07,0xf0d396,1,1,.05);
}
function frenchBay(g,roof,cs,C,camera){
  // Projected salon bay is a usable addition to the floor plan, not a decal.
  G.box(g,-6.8,.115,4.13,5.55,.23,2.27,0xbc9774);
  for(const x of [-9.57,-4.03])solid(g,cs,x,.57,4.23,.24,.94,2.04,C.stone);
  solid(g,cs,-6.8,.57,5.24,5.76,.94,.23,C.wall);
  for(const x of [-9.57,-7.75,-5.86,-4.03]){G.box(roof,x,2.17,5.24,.18,2.36,.19,0xdfc6a0);G.box(g,x,.36,5.42,.27,.48,.19,C.stone);}
  for(const x of [-8.66,-6.8,-4.94])frenchGlazedWindow(roof,x,1.08,5.24,1.65,2.22,0xdfc6a0,'x',camera);
  for(const x of [-9.57,-4.03])frenchGlazedWindow(roof,x,1.08,4.2,1.64,2.22,0xdfc6a0,'z',camera);
  camera.push({minX:-9.83,maxX:-3.77,minY:3.37,maxY:3.59,minZ:2.77,maxZ:5.49});
  G.box(roof,-6.8,3.48,4.13,6.06,.22,2.72,0xc7af8a);G.roof(roof,-6.8,3.62,4.13,6.12,2.78,0x846957);
  solid(g,cs,-6.8,.37,4.66,4.44,.48,.74,0x967753);G.box(g,-6.8,.68,4.66,4.43,.17,.73,0xa17a79);
  for(const x of [-8.18,-7.10,-5.50])pillow(g,x,.84,4.68,x===-7.10?0x774650:0xc0a78c,.68,.56);
  G.box(g,-7.91,.79,4.39,.98,.055,.55,0xa88976);book(g,-6.22,.85,4.57,0x795e50,.15);
  // Arched entry vestibule leaves the central approach fully open.
  for(const x of [-1.8,1.8]){solid(g,cs,x,1.67,5.12,.27,3.18,.27,C.stone);G.box(g,x,.24,5.12,.48,.32,.48,0xbba17a);G.box(g,x,3.23,5.12,.49,.19,.43,0xd7bf97);}
  archBand(g,0,5.12,3.62,2.36,.83,0xc8ae85,.33);G.box(roof,0,3.65,4.28,4.28,.20,2.92,0xc3ab87);G.roof(roof,0,3.76,4.28,4.35,3.03,0x846957);
  G.box(g,0,.24,4.43,3.27,.025,2.34,0xd3bfa0);
  for(let x=-1.25;x<=1.25;x+=.5)for(let z=3.65;z<5.3;z+=.5)G.box(g,x,.258,z,.16,.018,.16,0x788b7d,Math.PI/4);
  G.lamp(g,-1.32,2.28,3.78,0xe9c78e,.14);G.lamp(g,1.32,2.28,3.78,0xe9c78e,.14);
}
function boiserie(g,x,z,w){
  G.box(g,x,.94,z,w,1.62,.12,0x9d7b58);
  for(const y of [.22,.39,1.44,1.74])G.box(g,x,y,z+.1,w,.10,.15,0xc2a17a);
  const n=Math.floor(w/1.28),pw=w/n;
  for(let i=0;i<n;i++){const xx=x-w/2+pw*(i+.5);G.box(g,xx,.92,z+.079,pw-.19,.91,.035,0xa88861);for(const side of [-1,1]){G.box(g,xx+side*(pw/2-.1),.92,z+.13,.055,.99,.06,0xd0ae7c);G.box(g,xx,.92+side*.49,z+.13,pw-.18,.06,.06,0xd0ae7c);}}
}
function floralPicture(g,x,y,z,w=1.22,h=1.54){
  framedArt(g,x,y,z,w,h,0xc8b99a,0x9f8058);
  for(const [dx,dy,c]of [[-.22,.12,0x9d6b71],[.06,.27,0xc29b83],[.26,-.08,0x8b936d],[-.03,-.19,0xb38b58]]){
    G.box(g,x+dx*.6,y+dy-.25,z+.10,.025,.62,.04,0x74805b,-dx);
    for(let j=0;j<5;j++)G.sphere(g,x+dx+Math.sin(j*1.256)*.09,y+dy+Math.cos(j*1.256)*.09,z+.15,.09,c,1,1,.15);
    G.sphere(g,x+dx,y+dy,z+.18,.045,0x836a44,1,1,.15);
  }
}
function cabriolet(g,cs,x,z,rot=0,cloth=0xa68772){
  const chair=new THREE.Group();chair.position.set(x,0,z);chair.rotation.y=rot;g.add(chair);
  G.sphere(chair,0,.65,0,.59,0x8c6848,1.1,.21,.85);G.sphere(chair,0,.77,.02,.56,cloth,1.05,.22,.80);
  G.sphere(chair,0,1.40,-.39,.57,0x8c6848,1.03,1.10,.15);G.sphere(chair,0,1.43,-.30,.50,cloth,1.02,1.10,.13);
  for(const side of [-1,1]){
    G.sphere(chair,side*.53,1.02,-.02,.26,0x94704f,.30,.34,1.5);G.box(chair,side*.47,.83,.15,.07,.43,.08,0x8c6848);
    for(const zz of [-.31,.31]){G.sphere(chair,side*.41,.35,zz,.14,0x8c6848,.56,2.4,.67);G.sphere(chair,side*.45,.12,zz+.07,.12,0x8c6848,1.08,.66,1.40);}
  }
  G.sphere(chair,0,1.94,-.37,.13,0xc7aa78,1.7,.50,.65);
  G.collider(cs,x,z,1.20,1.23);
}
function vintageFireplace(g,cs){
  // A real fireplace mass makes the reading room a hearth-oriented parlour.
  solid(g,cs,-6.44,.88,-5.69,3.45,1.65,.72,0xbda27e);
  G.box(g,-6.44,.84,-5.28,2.10,1.29,.07,0x4c493b);
  for(const x of [-7.70,-5.18]){G.box(g,x,1.04,-5.18,.35,1.55,.29,0xd0b792);G.box(g,x,.32,-5.1,.50,.19,.46,0xa98e69);}
  G.box(g,-6.44,1.88,-5.35,3.9,.22,1.09,0xcfb994);G.box(g,-6.44,.29,-4.98,3.92,.16,1.23,0xa49172);
  for(let i=0;i<3;i++){const log=G.cyl(g,-6.9+i*.44,.47,-5.11,.09,.10,.62,0x76583e,8);log.rotation.z=Math.PI/2;}
  for(const x of [-6.86,-6.42,-6.05])G.sphere(g,x,.65,-5.09,.18,0xdba15c,.63,1.60,.20);
  G.box(g,-6.44,2.66,-6.32,2.33,1.20,.11,0x9e7a4c);G.box(g,-6.44,2.68,-6.24,2.02,.94,.035,0x9baba0);
  for(const x of [-7.70,-5.18]){G.cyl(g,x,2.16,-5.35,.045,.14,.40,0x9f8558);G.cyl(g,x,2.45,-5.35,.075,.075,.31,0xe1cd9f);G.sphere(g,x,2.66,-5.35,.05,0xf1ce82,.6,1.5,.6);}
  G.cyl(g,-6.44,2.24,-5.37,.26,.26,.11,0x96754e,16).rotation.x=Math.PI/2;G.cyl(g,-6.44,2.24,-5.29,.21,.21,.03,0xdccb9f,16).rotation.x=Math.PI/2;
  G.box(g,-6.44,2.30,-5.265,.025,.18,.02,0x6b624c);G.box(g,-6.37,2.24,-5.265,.15,.023,.02,0x6b624c);
}

function vintageHall(g,cs){
  // A fitted burgundy runner and repeated medallions turn the long center
  // passage into an intentional entrance gallery, keeping its walk continuous.
  G.rug(g,0,-4.78,2.68,14.05,0x713f49,0xb29a68);
  for(const x of [-1.09,1.09])G.box(g,x,.318,-4.78,.035,.018,13.55,0xd1b786);
  for(const z of [-10.35,-7.55,-4.75,-1.95,.85]){
    const medallion=G.cyl(g,0,.320,z,.64,.64,.018,0xa98762,24);medallion.scale.z=1.39;
    const center=G.cyl(g,0,.333,z,.49,.49,.019,0x814b53,24);center.scale.z=1.39;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const leaf=G.sphere(g,Math.sin(a)*.31,.347,z+Math.cos(a)*.46,.13,0xc3aa78,.58,.085,1.1);leaf.rotation.y=-a;}
    G.sphere(g,0,.349,z,.15,0xbda271,1,.085,1);
  }
  for(let z=-11.1;z<2;z+=.48)for(const x of [-.88,.88])G.box(g,x,.335,z,.10,.014,.10,0xac8c65,Math.PI/4);
  // Rear console, floral urn and gilt oval mirror form the visual destination.
  feetTable(g,cs,0,-12.40,2.64,.66,0x886647,1.04);
  G.box(g,0,1.17,-12.40,2.85,.15,.80,0xbda57f);
  for(const x of [-1.1,1.1])G.sphere(g,x,.63,-12.36,.13,0xa78450,.7,3.7,.7);
  G.vessel(g,0,1.26,-12.4,0x977954,.65);
  for(let i=0;i<7;i++){const a=i*2.4,xx=Math.sin(a)*.20,zz=-12.4+Math.cos(a)*.15;G.cyl(g,xx,1.97,zz,.015,.018,.77,0x788058,5);G.sphere(g,xx,2.29+Math.cos(i)*.10,zz,.16,i%2?0xad7781:0xcfab97,1,.8,1);}
  const frame=G.torus(g,0,2.88,-13.01,.80,.080,0xb6995d,0);frame.scale.y=1.19;
  G.sphere(g,0,2.88,-13.03,.75,0x8b9d91,1,1.20,.035);
  G.sphere(g,0,3.87,-12.98,.18,0xb6995d,1.70,.65,.42);
  for(const x of [-1.08,1.08]){G.cyl(g,x,1.43,-12.4,.08,.16,.37,0xa48854);G.cyl(g,x,1.74,-12.4,.08,.08,.32,0xe3cfa7);}
  // Paired pedestals sit against the existing screens, outside the runner.
  for(const x of [-2.43,2.43]){
    solid(g,cs,x,.67,-4.45,.52,1.16,.57,0xa58b65);G.box(g,x,1.32,-4.45,.71,.16,.74,0xc0a579);G.box(g,x,.19,-4.45,.69,.17,.73,0xc0a579);
    G.vessel(g,x,1.42,-4.45,0x8a7a5e,.55);
    for(let i=0;i<5;i++)G.sphere(g,x+Math.sin(i*2.4)*.15,2.08+Math.cos(i)*.06,-4.45+Math.cos(i*2.4)*.15,.13,i%2?0xa7727e:0xb99488,1,.9,1);
  }
  // Four framed door openings establish a hall-to-room sequence. Frames are
  // open inside, so they never add an invisible wall across a walking route.
  for(const x of [-3.08,3.08])for(const z of [-.16,-9.05]){
    const door=new THREE.Group();door.position.set(x,0,z);door.rotation.y=Math.PI/2;g.add(door);
    const width=z< -5?4.35:3.56;
    for(const side of [-1,1]){
      G.box(door,side*width/2,1.64,0,.17,2.94,.24,0x9d7c52);G.box(door,side*width/2,.32,0,.33,.29,.37,0xbda073);
      G.box(door,side*width/2,3.04,0,.34,.18,.40,0xc4a670);
      G.collider(cs,x,z-side*width/2,.24,.19);
    }
    archBand(door,0,0,width,2.61,.48,0xb39961,.26);
    G.box(door,0,3.28,0,width+.49,.14,.31,0xb49963);
    G.sphere(door,0,3.44,0,.15,0xbe9e61,1.65,.63,.72);
  }
}
function damaskParlour(g){
  // Plum damask belongs to the parlour walls; small repeating floral devices
  // sit above the existing wainscot rather than becoming freestanding clutter.
  G.box(g,-6.55,2.57,-6.48,7.08,1.66,.065,0x937473);
  for(let x=-9.65;x<-3.45;x+=.54)for(let y=1.97;y<3.27;y+=.47){
    const dx=((Math.round(y*10)%2)*.24);G.sphere(g,x+dx,y,-6.422,.09,0xc1a77d,.48,1.27,.13);
    for(const side of [-1,1]){const leaf=G.sphere(g,x+dx+side*.085,y-.075,-6.419,.07,0xb99b75,.50,1.2,.13);leaf.rotation.z=side*.6;}
  }
  for(const y of [1.75,3.37])G.box(g,-6.55,y,-6.36,7.1,.12,.18,0xb99b60);
  // Gilt wall sconces flank the hearth and emphasize its intimate symmetry.
  for(const x of [-8.25,-4.64]){
    G.box(g,x,2.63,-6.22,.16,.61,.09,0xa98a52);
    const scroll=G.torus(g,x,2.47,-6.08,.19,.027,0xb2965c,0);scroll.scale.x=.7;
    G.cyl(g,x,2.66,-5.88,.06,.13,.15,0xb2965c);G.cyl(g,x,2.9,-5.88,.065,.065,.34,0xe1cfa2);G.sphere(g,x,3.14,-5.88,.06,0xf1cf84,.60,1.50,.60);
  }
}

export function buildFrance({pack=true}={}){
  // R6: an original green-and-white royal pavilion, composed after inspecting
  // Trianon/Cabinet Dore and Sims creator effect images. No imported assets.
  const group=new THREE.Group(),roofGroup=new THREE.Group(),colliders=[],cameraColliders=[];
  group.name='白鸢王宫';roofGroup.name='皇家宫邸 · 连续天花与栏杆屋顶';group.add(roofGroup);
  const C={ivory:0xf4f2e9,white:0xfffdf5,stone:0xd9decf,sage:0xb6cbb5,green:0x3e7259,emerald:0x245440,gold:0xc7aa61,lightGold:0xe3cb87,wood:0xb69a72,glass:0xbdd8cb};
  const floorY=.23,ceilingY=5.25;
  const box=(x,y,z,w,h,d,c,parent=group)=>G.box(parent,x,y,z,w,h,d,c);
  const block=(x,y,z,w,h,d,c,parent=group)=>{box(x,y,z,w,h,d,c,parent);G.collider(colliders,x,z,w,d);cameraColliders.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});};
  const cameraBox=(x,y,z,w,h,d)=>cameraColliders.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});
  const wall=o=>frenchRoomWall(group,colliders,cameraColliders,{bottom:.23,top:ceilingY,depth:.30,color:C.ivory,...o});
  const local=(x,z,rot=0,parent=group)=>{const q=new THREE.Group();q.position.set(x,0,z);q.rotation.y=rot;parent.add(q);return q;};
  // R10: recognisable furniture is built as joined structural assemblies. The
  // authored navigation/camera footprints and R9 work anchors remain unchanged.
  const furniture=[];
  function assembly(q,name,kind){q.name=name;q.userData.furnitureKind=kind;furniture.push(q);return q;}
  function part(m,name){m.name=name;return m;}
  function roundShape(w,h,r){
    const s=new THREE.Shape(),x=-w/2,y=-h/2;r=Math.min(r,w/2,h/2);
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);s.closePath();return s;
  }
  function shaped(q,shape,depth,c,x=0,y=0,z=0,bevel=.014,name='Shaped joinery'){
    const geo=new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:10,bevelEnabled:bevel>0,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel});
    return part(G.mesh(q,geo,c,x,y,z),name);
  }
  function rounded(q,x,y,z,w,h,d,c,r=.06,name='Rounded joinery'){
    return shaped(q,roundShape(w,h,r),d,c,x,y,z-d/2,Math.min(.012,d*.18),name);
  }
  function slab(q,shape,y,thick,c,name,bevel=.012){
    const m=shaped(q,shape,thick,c,0,y+thick/2,0,bevel,name);m.rotation.x=Math.PI/2;return m;
  }
  function rail(q,points,r,c,name='Continuous curved rail'){
    return part(G.mesh(q,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),Math.max(8,points.length*3),r,6,false),c),name);
  }
  function turned(q,x,y,z,profile,c,name='Turned component'){
    return part(G.mesh(q,new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(...v)),16),c,x,y,z),name);
  }
  // R11 sculpted joinery: variable cross-sections, shaped relief and stuffed
  // upholstery, all original meshes sharing the existing toon/static batches.
  function carvedSweep(q,points,widths,depths,c,name,steps=20,sides=8){
    steps=Math.max(10,Math.round(steps*.70));sides=Math.min(sides,6);const path=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),frames=path.computeFrenetFrames(steps,false),pos=[],idx=[];
    const sample=(values,t)=>{const k=t*(values.length-1),i=Math.min(values.length-2,Math.floor(k));return THREE.MathUtils.lerp(values[i],values[i+1],k-i);};
    for(let i=0;i<=steps;i++){const t=i/steps,p=path.getPointAt(t),w=sample(widths,t),d=sample(depths,t);for(let j=0;j<sides;j++){const a=j*Math.PI*2/sides,v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*w).addScaledVector(frames.binormals[i],Math.sin(a)*d);pos.push(v.x,v.y,v.z);}}
    for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;idx.push(a,b,c,b,d,c);}
    for(const end of [0,steps]){const p=path.getPointAt(end/steps),center=pos.length/3;pos.push(p.x,p.y,p.z);for(let j=0;j<sides;j++){const a=end*sides+j,b=end*sides+(j+1)%sides;idx.push(...(end?[center,a,b]:[center,b,a]));}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();geo.userData={variableSection:true,widths,depths,controlPoints:points};return part(G.mesh(q,geo,c),name);
  }
  function beadPath(q,points,r,c,name,closed=false,steps=32){
    const path=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)),closed);return part(G.mesh(q,new THREE.TubeGeometry(path,Math.max(6,Math.round(steps*.70)),r,4,closed),c),name);
  }
  function leafRelief(q,x,y,z,w,h,rot=0,c=C.gold,name='Carved acanthus leaf'){
    const p=new THREE.Shape();p.moveTo(0,-h*.46);p.bezierCurveTo(-w*.05,-h*.1,-w*.56,-h*.12,-w*.38,h*.05);p.bezierCurveTo(-w*.76,h*.18,-w*.24,h*.33,0,h*.55);p.bezierCurveTo(w*.06,h*.30,w*.56,h*.23,w*.30,h*.06);p.bezierCurveTo(w*.48,-h*.12,w*.06,-h*.19,0,-h*.46);p.closePath();
    const a=new THREE.Group();a.position.set(x,y,z);a.rotation.z=rot;q.add(a);const reliefGeo=new THREE.ExtrudeGeometry(p,{depth:.018,steps:1,curveSegments:5,bevelEnabled:true,bevelSegments:1,bevelSize:.008,bevelThickness:.008});part(G.mesh(a,reliefGeo,c),name);beadPath(a,[[0,-h*.36,.03],[-w*.05,0,.046],[0,h*.41,.031]],.008,C.lightGold,'Acanthus central rib',false,8);return a;
  }
  function rocaille(q,x,y,z,w=.40,h=.24){
    const a=new THREE.Group();a.position.set(x,y,z);q.add(a);a.name='Joined rocaille shell carving';
    const shell=new THREE.Shape();shell.moveTo(0,-h*.32);shell.bezierCurveTo(-w*.52,-h*.32,-w*.55,h*.31,-w*.30,h*.40);shell.bezierCurveTo(-w*.18,h*.25,-w*.15,h*.58,0,h*.44);shell.bezierCurveTo(w*.15,h*.58,w*.18,h*.25,w*.30,h*.40);shell.bezierCurveTo(w*.55,h*.31,w*.52,-h*.32,0,-h*.32);shell.closePath();part(G.mesh(a,new THREE.ExtrudeGeometry(shell,{depth:.032,steps:1,curveSegments:6,bevelEnabled:true,bevelSegments:1,bevelSize:.014,bevelThickness:.014}),C.gold),'Scalloped rocaille shell');
    for(let i=-2;i<=2;i++)beadPath(a,[[0,-h*.25,.04],[i*w*.065,h*.03,.077],[i*w*.125,h*(.36-Math.abs(i)*.025),.048]],.010,C.lightGold,'Shell carved fan rib',false,8);return a;
  }
  function scrollRelief(q,x,y,z,w,h,side=1,name='Connected C-scroll relief'){
    const pts=[[0,0,0],[.23,.10,.006],[.49,.40,.003],[.90,.43,0],[1,.12,0],[.84,-.04,0],[.68,.07,0],[.75,.18,0]].map(v=>[x+side*v[0]*w,y+v[1]*h,z+v[2]]);
    return carvedSweep(q,pts,[.021,.036,.029,.022,.017,.013],[.024,.030,.028,.022,.017,.012],C.gold,name,22,6);
  }
  function cushionSurface(q,outline,x,y,z,c,name,{depth=.065,buttons=[],horizontal=false}={}){
    const edge=outline.getSpacedPoints(32).slice(0,-1).map(v=>horizontal?new THREE.Vector2(v.x,-v.y):v);if(THREE.ShapeUtils.isClockWise(edge))edge.reverse();const rings=8,pos=[0,0,depth],idx=[];
    const surface=(px,py,r)=>{let zz=depth*Math.pow(Math.max(0,1-r*r),.55);for(const [bx,by]of buttons){const d=Math.hypot(px-bx,py-by);zz-=Math.min(.059,depth*.65)*Math.exp(-d*d/.0028);}return zz;};
    pos[2]=surface(0,0,0);
    for(let k=1;k<=rings;k++){const r=k/rings;for(const v of edge)pos.push(v.x*r,v.y*r,surface(v.x*r,v.y*r,r));}
    const n=edge.length;for(let j=0;j<n;j++)idx.push(0,1+j,1+(j+1)%n);
    for(let k=1;k<rings;k++)for(let j=0;j<n;j++){const a=1+(k-1)*n+j,b=1+(k-1)*n+(j+1)%n,cc=a+n,d=b+n;idx.push(a,cc,b,b,cc,d);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();if(buttons.length){const colors=[];for(let i=0;i<pos.length;i+=3){let shade=1;for(const [bx,by]of buttons){const d=Math.hypot(pos[i]-bx,pos[i+1]-by);shade-=.20*Math.exp(-d*d/.0030);}colors.push(shade,shade,shade);}geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}geo.userData={stuffedUpholstery:true,buttons:buttons.length,depth};const m=part(G.mesh(q,geo,c,x,y,z,{vertexColors:buttons.length>0}),name);if(horizontal)m.rotation.x=-Math.PI/2;return m;
  }
  function reserveBlock(x,y,z,w,h,d){
    G.collider(colliders,x,z,w,d);cameraBox(x,y,z,w,h,d);
  }
  function plate(q,x,y,z,c=C.white,r=.27){
    const p=assembly(local(x,z,0,q),'Gold-rim porcelain plate','porcelain');
    // A shallow concave profile has a real lip, underside and standing foot.
    turned(p,0,y,0,[[0,.002],[r*.58,.002],[r*.73,.009],[r*.90,.045],[r,.06],[r*.98,.075],[r*.88,.061],[r*.69,.027],[0,.027]],c,'Concave porcelain plate');
    G.torus(p,0,y+.082,0,r*.965,.009,C.gold);return p;
  }
  function cup(q,x,y,z,c=C.white){
    const p=assembly(local(x,z,0,q),'Hollow handled porcelain cup','porcelain');
    turned(p,0,y,0,[[0,0],[.070,0],[.080,.025],[.088,.060],[.114,.19],[.111,.205],[.095,.203],[.088,.175],[.067,.057],[0,.054]],c,'Hollow cup wall and foot');
    G.torus(p,0,y+.204,0,.104,.009,C.gold);
    rail(p,[[.095,y+.17,0],[.172,y+.173,0],[.198,y+.12,0],[.157,y+.064,0],[.080,y+.068,0]],.019,c,'Joined C handle');
    G.cyl(p,0,y+.155,0,.088,.088,.008,0x674b32,20);return p;
  }
  function teapot(q,x,y,z,s=.8){
    const p=assembly(local(x,z,0,q),'Porcelain tea service pot','porcelain');p.position.y=y;p.scale.setScalar(s);
    turned(p,0,0,0,[[0,0],[.19,0],[.22,.05],[.32,.16],[.33,.30],[.28,.42],[.18,.48],[.14,.48]],C.white,'Rounded teapot body');
    turned(p,0,0,0,[[0,.50],[.10,.54],[.18,.51],[.21,.485]],C.white,'Seated domed lid');
    G.cyl(p,0,.56,0,.037,.05,.055,C.gold,12);
    rail(p,[[.22,.16,0],[.38,.24,0],[.44,.36,0],[.51,.44,0]],.064,C.white,'Connected pouring spout');
    rail(p,[[-.24,.40,0],[-.46,.42,0],[-.48,.21,0],[-.25,.13,0]],.033,C.gold,'Joined teapot handle');
    G.torus(p,0,.485,0,.17,.011,C.gold);return p;
  }
  // A bounded R10 royal tea service: authored profiles, hollow mouths and
  // touching supports, kept inside the existing salon/loggia table footprints.
  function royalPot(q,x,y,z,s=.58,rot=Math.PI/2){
    const p=teapot(q,x,y,z,s);p.name='Royal porcelain teapot';p.rotation.y=rot;
    const old=p.getObjectByName('Connected pouring spout');old.geometry.dispose();p.remove(old);
    const curve=new THREE.CatmullRomCurve3([[.24,.19,0],[.36,.245,0],[.455,.39,0],[.59,.45,0]].map(v=>new THREE.Vector3(...v))),
      verts=[],indices=[],steps=16,sides=10;
    // Joined outer/inner tube rings leave a genuinely open pouring mouth.
    for(let wall=0;wall<2;wall++)for(let i=0;i<=steps;i++){
      const t=i/steps,a=curve.getPoint(t),d=curve.getTangent(t),n=new THREE.Vector3(-d.y,d.x,0),r=.075*(1-t)+.035*t-wall*.011;
      for(let j=0;j<sides;j++){const angle=j*Math.PI*2/sides;verts.push(a.x+n.x*Math.cos(angle)*r,a.y+n.y*Math.cos(angle)*r,Math.sin(angle)*r);}
    }
    const wallN=(steps+1)*sides;
    for(let wall=0;wall<2;wall++)for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){
      const a=wall*wallN+i*sides+j,b=wall*wallN+i*sides+(j+1)%sides,c=a+sides,d=b+sides;
      indices.push(...(wall?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
    }
    for(let j=0;j<sides;j++){const a=steps*sides+j,b=steps*sides+(j+1)%sides,c=a+wallN,d=b+wallN;indices.push(a,b,c,b,d,c);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();geo.userData={hollowPouringMouth:true};
    part(G.mesh(p,geo,C.white),'Tapered hollow pouring spout');
    const end=curve.getPoint(1),tangent=curve.getTangent(1),lip=part(G.torus(p,end.x,end.y,0,.030,.006,C.gold,0),'Gilt open spout lip');lip.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),tangent);
    turned(p,0,0,0,[[.324,.185],[.333,.25],[.333,.285]],C.sage,'Celadon porcelain waist band');
    for(const [yy,rr]of [[.185,.324],[.285,.332]])G.torus(p,0,yy,0,rr,.005,C.gold);
    for(let i=0;i<6;i++){const a=i*Math.PI/3,p0=[Math.cos(a)*.334,.223,Math.sin(a)*.334],p1=[Math.cos(a+.20)*.337,.206,Math.sin(a+.20)*.337],p2=[Math.cos(a+.40)*.334,.223,Math.sin(a+.40)*.334];beadPath(p,[p0,p1,p2],.0038,C.gold,'Porcelain gilt swag',false,8);}
    return p;
  }
  function teaTray(q,x,y,z,s=1){
    const p=assembly(local(x,z,0,q),'Silver oval tea tray','tea-tray');p.position.y=y;p.scale.setScalar(s);
    const body=turned(p,0,0,0,[[0,0],[.49,0],[.565,.009],[.595,.034],[.59,.047],[.56,.039],[.53,.026],[0,.026]],0xb5ccc9,'Bevelled silver tray well');body.scale.z=.57;
    const rim=G.torus(p,0,.044,0,.580,.012,C.white);rim.scale.z=.57;part(rim,'Silver rolled tray edge');
    for(const side of [-1,1])rail(p,[[side*.55,.024,-.10],[side*.665,.065,-.085],[side*.68,.065,.085],[side*.55,.024,.10]],.014,0xb5ccc9,'Joined silver tray handle');
    return p;
  }
  function sugarBowl(q,x,y,z,s=1){
    const p=assembly(local(x,z,0,q),'Lidded porcelain sugar bowl','tea-sugar');p.position.y=y;p.scale.setScalar(s);
    turned(p,0,0,0,[[0,0],[.075,0],[.09,.025],[.13,.10],[.125,.165],[.10,.19],[.086,.19],[.087,.17],[.105,.13],[.096,.06],[0,.042]],C.white,'Hollow sugar bowl');
    turned(p,0,0,0,[[0,.225],[.045,.23],[.09,.218],[.112,.191],[.09,.184]],C.white,'Seated sugar bowl lid');
    G.torus(p,0,.192,0,.104,.006,C.gold);G.sphere(p,0,.242,0,.028,C.gold,1,.8,1);
    for(const side of [-1,1])rail(p,[[side*.108,.16,0],[side*.17,.169,0],[side*.182,.10,0],[side*.121,.078,0]],.012,C.gold,'Joined sugar bowl handle');
    return p;
  }
  function milkJug(q,x,y,z,s=1){
    const p=assembly(local(x,z,0,q),'Open porcelain milk jug','tea-milk');p.position.y=y;p.rotation.y=-.48;p.scale.setScalar(s);
    const profile=[[0,0],[.074,0],[.09,.025],[.112,.10],[.099,.185],[.10,.23],[.091,.239],[.082,.225],[.081,.181],[.094,.108],[.067,.039],[0,.039]],
      geo=new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(...v)),20),a=geo.attributes.position;
    // Pinch the connected upper wall into a small pouring lip, retaining the hollow.
    for(let i=0;i<a.count;i++){const yy=a.getY(i),xx=a.getX(i),zz=a.getZ(i);if(yy>.18){const w=Math.pow(Math.max(0,xx/Math.hypot(xx,zz)),8)*((yy-.18)/.059);a.setXYZ(i,xx+.051*w,yy+.012*w,zz);}}
    geo.computeVertexNormals();part(G.mesh(p,geo,C.white),'Hollow pinched milk jug wall');
    rail(p,[[-.088,.203,0],[-.164,.205,0],[-.168,.092,0],[-.103,.075,0]],.014,C.gold,'Joined milk jug handle');
    G.cyl(p,0,.165,0,.080,.080,.005,C.ivory,20);G.torus(p,0,.045,0,.096,.004,C.gold);
    return p;
  }
  function teaCover(q,x,y,z,rot=0,s=1){
    const p=assembly(local(x,z,rot,q),'Royal cup and saucer','tea-cover');p.position.y=y;p.scale.setScalar(s);
    const saucer=plate(p,0,0,0,C.white,.218);saucer.scale.y=.48;
    const c=cup(p,0,0,0,C.white);c.position.y=.027*.48;c.scale.setScalar(.84);
    turned(c,0,0,0,[[.0965,.10],[.1020,.126]],C.sage,'Celadon cup band');
    for(const [yy,rr]of [[.10,.0965],[.126,.1019]])G.torus(c,0,yy,0,rr,.003,C.gold);
    return p;
  }
  function teaSpoon(q,x,y,z,rot=0,s=1){
    const p=assembly(local(x,z,rot,q),'Silver tea spoon','tea-spoon');p.position.y=y;p.scale.setScalar(s);
    rail(p,[[0,.018,-.085],[0,.015,.015],[0,.023,.105]],.009,0xb5ccc9,'Joined spoon stem');
    G.sphere(p,0,.021,.126,.042,0xb5ccc9,.73,.22,1.10);return p;
  }
  function macaron(q,x,y,z,color=C.sage,s=1){
    const p=assembly(local(x,z,0,q),'Filled French macaron','tea-pastry');p.position.y=y;p.scale.setScalar(s);
    turned(p,0,0,0,[[0,0],[.043,0],[.068,.010],[.075,.024],[.070,.038],[0,.041]],color,'Lower almond shell');
    turned(p,0,0,0,[[0,.042],[.065,.042],[.07,.052],[.065,.06],[0,.06]],C.ivory,'Visible cream filling');
    turned(p,0,0,0,[[0,.062],[.069,.062],[.077,.074],[.070,.092],[.053,.106],[0,.11]],color,'Domed almond shell');
    return p;
  }
  function cakeStand(q,x,y,z){
    const p=assembly(local(x,z,0,q),'Two-tier royal pastry stand','tea-stand');p.position.y=y;
    turned(p,0,0,0,[[0,0],[.14,0],[.16,.022],[.14,.045],[.072,.069],[.041,.14],[.035,.48]],C.gold,'Continuous pedestal and tier stem');
    for(const [yy,r]of [[.128,.295],[.388,.220]]){const dish=plate(p,0,yy,0,C.white,r);dish.scale.y=1;const collar=turned(p,0,0,0,[[.033,yy-.016],[.070,yy-.012],[.080,yy+.015],[.040,yy+.021]],C.gold,'Joined tier support collar');
      const spots=yy<.2?[[-.16,.00],[.10,.13],[.115,-.12]]:[[-.105,.035],[.09,-.03]];
      for(let i=0;i<spots.length;i++)macaron(p,spots[i][0],yy+.030,spots[i][1],[C.sage,C.white,C.lightGold][i%3],yy<.2?1:.88);
    }
    G.cyl(p,0,.55,0,.024,.035,.18,C.gold,12);const handle=part(G.torus(p,0,.687,0,.076,.013,C.gold,0),'Connected pastry stand ring');
    p.userData.supports=[.128,.388];return p;
  }
  function royalTeaLoggia(){
    const p=assembly(local(6.6,10.45),'Royal garden tea party','tea-setting');p.position.y=1.230;
    p.userData.supportY=1.230;p.userData.tableRadius=1.11;
    teaCover(p,-.55,0,-.46,-.55);teaCover(p,.61,0,-.39,2.45);
    teaSpoon(p,-.29,.002,-.51,-.16);teaSpoon(p,.82,.002,-.16,.30,.85);
    const tray=teaTray(p,-.18,.001,.205);tray.userData.supportY=1.230;
    royalPot(tray,-.20,.026,0,.57);sugarBowl(tray,.29,.026,.115,.82);milkJug(tray,.30,.026,-.135,.85);
    cakeStand(p,.655,0,.31);
    const dessert=plate(p,.03,0,-.585,C.white,.185);dessert.scale.y=.55;
    macaron(p,-.027,.030*.55,-.596,C.sage,.76);macaron(p,.099,.030*.55,-.559,C.white,.66);
    const napkin=rounded(p,-.15,.014,-.145,.29,.022,.22,C.ivory,.016,'Folded ivory tea napkin');napkin.rotation.y=.14;
    for(const zz of [-.213,-.197]){const stitch=G.box(p,-.15,.029,zz,.24,.006,.006,C.gold,.14);part(stitch,'Napkin gilt hem');}
    return p;
  }
  function royalSalonTea(){
    // The shallow existing marble oval is crowned; each separate cover is
    // supported at its own measured local surface height rather than floating.
    const p=assembly(local(-6.85,-1.65),'Royal salon tea service','tea-setting');
    const tray=teaTray(p,.39,1.049,-.075,.69);royalPot(tray,-.14,.026,.015,.50);
    sugarBowl(tray,.30,.026,.035,.68);milkJug(tray,.11,.026,-.16,.68);
    teaCover(p,.77,1.028,.22,.9,.79);teaSpoon(p,.48,1.048,.35,.12,.75);
    return p;
  }
  function column(x,z,h=4.7,parent=group,nav=true){
    G.cyl(parent,x,h/2+.23,z,.24,.29,h,C.ivory,16);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;G.cyl(parent,x+Math.sin(a)*.245,h/2+.23,z+Math.cos(a)*.245,.022,.022,h-.64,C.stone,5);}
    for(const [y,r,hh,c]of [[.34,.41,.23,C.white],[.53,.32,.14,C.gold],[h-.02,.35,.13,C.gold],[h+.17,.46,.22,C.white]])G.cyl(parent,x,y,z,r,r,hh,c,16);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;G.sphere(parent,x+Math.sin(a)*.31,h-.06,z+Math.cos(a)*.31,.14,C.lightGold,.55,1.7,.55);}
    G.box(parent,x,h+.31,z,.9,.16,.9,C.ivory);
    if(nav){G.collider(colliders,x,z,.88,.88);cameraBox(x,h/2+.28,z,.86,h+.12,.86);}
  }
  function panel(q,x,z,w=1.4,green=false){
    G.box(q,x,2.57,z,w,4.26,.06,green?C.sage:C.white);
    for(const [y,hh]of [[.58,.06],[1.30,.08],[4.65,.07]])G.box(q,x,y,z+.055,w-.04,.07,.09,C.gold);
    for(const xx of [-w/2+.10,w/2-.10])G.box(q,x+xx,3.0,z+.06,.045,3.12,.06,C.gold);
    for(const y of [1.49,4.52])G.box(q,x,y,z+.06,w-.20,.045,.06,C.gold);
    for(const xx of [-w/2+.17,w/2-.17])G.box(q,x+xx,.92,z+.06,.033,.51,.055,C.lightGold);
    for(const y of [.66,1.17])G.box(q,x,y,z+.06,w-.34,.033,.055,C.lightGold);
    // Original, low-relief palmettes and hanging laurel devices.
    for(const yy of [1.83,4.15]){G.sphere(q,x,yy,z+.09,.11,C.gold,1,.85,.2);for(const side of [-1,1])for(let k=0;k<3;k++){const leaf=G.sphere(q,x+side*(.12+k*.09),yy-.035-k*.075,z+.09,.092,C.gold,.48,1.55,.19);leaf.rotation.z=side*.60;}}
  }
  function windowAt(x,z,w=2.05,rot=0){
    const q=local(x,z,rot);frenchGlazedWindow(q,0,.9,0,w,3.64,C.white);
    for(const side of [-1,1]){G.box(q,side*(w/2+.15),2.76,.045,.16,3.97,.23,C.white);G.box(q,side*(w/2+.17),2.76,.18,.043,3.7,.04,C.gold);}
    for(const y of [.85,4.67])G.box(q,0,y,.10,w+.55,.17,.35,C.white);
    G.box(q,0,4.82,.04,w+.72,.10,.26,C.gold);
    // Drapery is gathered at the edges, leaving a clear central glass view.
    for(const side of [-1,1])for(let j=0;j<4;j++)G.cyl(q,side*(w/2-.05)+j*.08*side,2.59+j*.006,.29,.10,.11,3.28,j%2?C.green:C.emerald,8);
    for(const side of [-1,1])G.box(q,side*(w/2+.08),2.05,.40,.44,.09,.10,C.gold);
    for(let k=0;k<9;k++){const xx=-w/2+k*w/8;G.sphere(q,xx,4.32-.26*Math.sin(k*Math.PI/8),.28,.25,C.green,1.15,.7,.42);}
    cameraBox(x,2.72,z,rot? .06:w,3.64,rot?w:.06);
  }
  function doorway(x,z,w=2.5,rot=0){
    const q=local(x,z,rot);
    for(const side of [-1,1]){G.box(q,side*(w/2+.08),2.11,0,.18,3.76,.42,C.white);G.box(q,side*(w/2+.10),2.1,.245,.045,3.50,.04,C.gold);G.box(q,side*(w/2+.08),.39,0,.35,.30,.48,C.stone);}
    G.box(q,0,4.03,0,w+.50,.28,.45,C.white);G.box(q,0,4.19,.10,w+.62,.065,.43,C.gold);
    archBand(q,0,.13,w+.37,4.17,.45,C.white,.28);
    G.sphere(q,0,4.65,.16,.22,C.gold,1,.90,.25);
    for(const side of [-1,1]){const leaf=G.sphere(q,side*.29,4.52,.17,.22,C.gold,1.6,.30,.20);leaf.rotation.z=side*.25;}
  }
  function mirror(q,x,y,z,w=1.3,h=2.3){
    const m=assembly(local(x,z,0,q),'Arched bevelled gilt mirror','mirror');m.position.y=y;
    const arch=(ww,hh)=>{const p=new THREE.Shape(),r=ww*.48,sy=hh/2-r;p.moveTo(-ww/2,-hh/2+.06);p.quadraticCurveTo(-ww/2,-hh/2,0,-hh/2);p.quadraticCurveTo(ww/2,-hh/2,ww/2,-hh/2+.06);p.lineTo(ww/2,sy);p.bezierCurveTo(ww/2,hh/2,r*.55,hh/2,0,hh/2);p.bezierCurveTo(-r*.55,hh/2,-ww/2,hh/2,-ww/2,sy);p.closePath();return p;};
    shaped(m,arch(w+.17,h+.17),.10,C.gold,0,0,-.055,.027,'Deep arched outer frame');
    shaped(m,arch(w+.055,h+.055),.025,C.lightGold,0,0,.067,.008,'Inner bevel moulding');
    shaped(m,arch(w-.055,h-.055),.016,0xb5ccc9,0,0,.096,.005,'Silvered mirror face');
    // Broad clipped sky/window streaks make the silvered face readable as glass.
    // They are opaque cel-shaded highlights, not a false realtime reflection.
    const stripe=new THREE.Shape();stripe.moveTo(-w*.32,-h*.30);stripe.lineTo(-w*.10,-h*.30);stripe.lineTo(w*.30,h*.21);stripe.lineTo(w*.30,h*.40);stripe.closePath();
    shaped(m,stripe,.004,0xdeebe4,0,0,.117,0,'Broad reflected window streak');
    const stripe2=new THREE.Shape();stripe2.moveTo(-w*.25,-h*.38);stripe2.lineTo(-w*.19,-h*.38);stripe2.lineTo(w*.29,h*.16);stripe2.lineTo(w*.29,h*.23);stripe2.closePath();
    shaped(m,stripe2,.004,0xf2f3de,0,0,.123,0,'Narrow reflected light streak');
    // Attached open rocaille crest and flowing side ears are genuine relief,
    // not a decal or identical spheres stuck over a plain rectangular panel.
    rocaille(m,0,h/2+.064,.073,Math.min(.45,w*.32),.27);
    for(const side of [-1,1]){
      scrollRelief(m,side*.025,h/2+.035,.061,w*.31,.29,side,'Mirror crown C-scroll');
      for(const [yy,angle]of [[h*.26,side*.18],[-h*.25,-side*.20]]){scrollRelief(m,side*(w/2+.025),yy,.024,.15,.30,side,'Mirror side rocaille ear');leafRelief(m,side*(w/2+.066),yy-.10,.078,.145,.30,angle);}
      leafRelief(m,side*w*.21,h/2+.114,.071,.15,.26,side*.65);
    }
    const perimeter=arch(w+.12,h+.12).getSpacedPoints(56).slice(0,-1).map(p=>[p.x,p.y,.083]);beadPath(m,perimeter,.018,C.lightGold,'Continuous mirror carved bead moulding',true,56);
  }

  function chandelier(x,z,s=1){
    const q=assembly(local(x,z,0,roofGroup),'Crystal eight-arm chandelier','chandelier');
    turned(q,0,0,0,[[0,5.22],[.22,5.22],[.25,5.18],[.20,5.13],[.08,5.10]],C.white,'Ceiling rose');
    G.cyl(q,0,4.94,0,.027,.027,.42,C.gold,10);
    turned(q,0,0,0,[[0,4.05],[.07,4.07],[.12,4.14],[.16,4.22],[.12,4.32],[.07,4.40],[.08,4.53],[.035,4.73]],C.lightGold,'Continuous central baluster');
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,dx=Math.sin(a),dz=Math.cos(a),xx=dx*.67*s,zz=dz*.67*s;
      const at=(r,y)=>[dx*r*s,y,dz*r*s];
      carvedSweep(q,[at(.065,4.27),at(.24,4.07),at(.49,4.10),at(.73,4.29),at(.65,4.36),at(.67,4.41)],[.033,.043,.038,.031,.020],[.027,.038,.031,.026,.018],C.gold,'Joined rising candle arm '+i,26,8);
      const inner=at(.34,4.22);beadPath(q,[at(.12,4.28),at(.27,4.42),at(.44,4.32),at(.40,4.22),at(.33,4.24)],.018,C.lightGold,'Joined upper candle scroll '+i,false,18);
      turned(q,xx,0,zz,[[0,4.35],[.055,4.35],[.075,4.40],[.12,4.415],[.12,4.44],[.055,4.44]],C.gold,'Candle drip tray '+i);
      G.cyl(q,xx,4.545,zz,.049,.049,.23,C.white,12);
      part(G.mesh(q,new THREE.SphereGeometry(.049,10,8),0xfff4cf,xx,4.70,zz,{emissive:0xffc982,emissiveIntensity:.6}),'Warm candle flame').scale.set(.65,1.5,.65);
      // A continuous swag chain joins the baluster to its candle tray.
      rail(q,[at(.075,4.49),at(.27,4.31),at(.45,4.27),at(.67,4.40)],.011,0xe2e8da,'Connected crystal swag '+i);
      G.cyl(q,xx,4.24,zz,.011,.011,.25,C.gold,6);
      const drop=part(G.mesh(q,new THREE.LatheGeometry([[0,-.13],[.042,-.08],[.061,-.026],[.05,.026],[.026,.072],[.009,.125]].map(v=>new THREE.Vector2(...v)),6),0xddebe4,xx,4.035,zz),'Suspended faceted crystal '+i);drop.geometry.userData.pearDrop=true;
      for(let j=1;j<=3;j++){const t=j/4,swag=new THREE.CatmullRomCurve3([at(.075,4.49),at(.27,4.31),at(.45,4.27),at(.67,4.40)].map(v=>new THREE.Vector3(...v))),anchor=swag.getPoint(t),yy=anchor.y,chainTop=anchor.toArray(),dropAt=[anchor.x,yy-.125,anchor.z];part(G.mesh(q,new THREE.CylinderGeometry(.007,.007,.125,5),C.lightGold,dropAt[0],yy-.0625,dropAt[2]),'Connected crystal drop hanger');const gem=part(G.mesh(q,new THREE.LatheGeometry([[0,-.075],[.032,-.041],[.037,-.005],[.023,.039],[.006,.070]].map(v=>new THREE.Vector2(...v)),6),j%2?0xf6f6e9:0xbdd8cb,...dropAt),'Pear cut crystal festoon');gem.geometry.userData.pearDrop=true;}
      const nextA=a+Math.PI/4;beadPath(q,[[dx*.67*s,4.40,dz*.67*s],[Math.sin(a+Math.PI/8)*.61*s,4.17,Math.cos(a+Math.PI/8)*.61*s],[Math.sin(nextA)*.67*s,4.40,Math.cos(nextA)*.67*s]],.008,0xe2e8da,'Candle-to-candle crystal festoon',false,16);
    }
    const tip=part(G.mesh(q,new THREE.LatheGeometry([[0,-.145],[.060,-.088],[.087,-.016],[.060,.055],[.012,.138]].map(v=>new THREE.Vector2(...v)),8),0xddebe4,0,3.96,0),'Central pendant crystal');tip.geometry.userData.pearDrop=true;
    for(const [yy,r]of [[4.12,.13],[4.31,.13],[4.53,.085]])part(G.mesh(q,new THREE.TorusGeometry(r,.014,4,20),C.gold,0,yy,0),'Chandelier collar').rotation.x=Math.PI/2;
    const light=new THREE.PointLight(0xffdab0,24,11,1.7);light.position.set(x,3.86,z);light.castShadow=false;group.add(light);
  }
  function ceiling(x,z,w,d){
    box(x,ceilingY+.08,z,w,.16,d,C.white,roofGroup);cameraBox(x,ceilingY+.08,z,w,.16,d);
    for(const [inset,drop,thick,c]of [[.10,.10,.22,C.ivory],[.24,.22,.12,C.gold],[.34,.31,.11,C.white]])for(const s of [-1,1]){box(x+s*(w/2-inset),ceilingY-drop,z,thick,thick,d,c,roofGroup);box(x,ceilingY-drop,z+s*(d/2-inset),w,thick,thick,c,roofGroup);}
    for(const s of [-1,1]){box(x+s*(w/2-.75),ceilingY-.035,z,.055,.055,d-1.5,C.gold,roofGroup);box(x,ceilingY-.035,z+s*(d/2-.75),w-1.5,.055,.055,C.gold,roofGroup);}
    G.cyl(roofGroup,x,ceilingY-.06,z,.56,.56,.09,C.sage,24);G.torus(roofGroup,x,ceilingY-.12,z,.47,.044,C.gold);
  }
  function chairAt(x,z,rot=0,cloth=C.sage){
    const q=assembly(local(x,z,rot),'Sculpted rocaille fauteuil','chair');
    let support=z>7&&z<14?.16:.23;for(const surface of group.userData.rugSurfaces||[])if(x>=surface.minX&&x<=surface.maxX&&z>=surface.minZ&&z<=surface.maxZ)support=Math.max(support,surface.y);q.position.y=support-.2395;q.userData.supportY=support;
    const seatShape=()=>{const p=new THREE.Shape();p.moveTo(-.42,-.35);p.bezierCurveTo(-.56,-.25,-.52,.25,-.41,.36);p.bezierCurveTo(-.24,.43,.24,.43,.41,.36);p.bezierCurveTo(.52,.25,.56,-.25,.42,-.35);p.quadraticCurveTo(0,-.41,-.42,-.35);p.closePath();return p;};
    slab(q,seatShape(),.758,.105,C.ivory,'Bevelled seat frame',.016);
    const seat=seatShape(); // The cushion inherits the shaped seat footprint.
    const cushion=slab(q,seat,.846,.087,cloth,'Upholstered seat cushion',.018);cushion.scale.set(.91,.91,1);
    const top=cushionSurface(q,seatShape(),0,.878,0,cloth,'Stuffed seat crown',{depth:.050,horizontal:true});top.scale.set(.91,.91,1);
    const pipe=seatShape().getSpacedPoints(40).slice(0,-1).map(p=>[p.x*.919,.886,p.y*.919]);beadPath(q,pipe,.012,C.lightGold,'Continuous seat piping',true,40);
    // Concave, scalloped aprons connect the swollen knees. Broad white carving
    // and a gilt ogee edge make the frame readable at normal player distance.
    const apron=new THREE.Shape();apron.moveTo(-.44,.787);apron.lineTo(.44,.787);apron.lineTo(.44,.691);apron.bezierCurveTo(.28,.733,.18,.64,0,.625);apron.bezierCurveTo(-.18,.64,-.28,.733,-.44,.691);apron.closePath();
    shaped(q,apron,.077,C.ivory,0,0,.29,.013,'Scalloped front apron');
    beadPath(q,[[-.44,.694,.386],[-.29,.714,.386],[0,.637,.386],[.29,.714,.386],[.44,.694,.386]],.015,C.gold,'Apron carved lower moulding');rocaille(q,0,.720,.376,.24,.15);
    for(const side of [-1,1]){const sideApron=shaped(q,apron,.066,C.ivory,side*.437,0,-.018,.01,'Scalloped side apron');sideApron.rotation.y=side*Math.PI/2;sideApron.scale.x=.77;}
    for(const side of [-1,1])for(const back of [-1,1]){
      const z0=back*.29,pts=[[side*.403,.771,z0],[side*.464,.644,z0+back*.025],[side*.405,.444,z0+back*.044],[side*.43,.286,z0+back*.066]];
      carvedSweep(q,pts,[.059,.079,.048,.031,.046],[.058,.065,.045,.031,.045],C.ivory,'Joined cabriole leg '+side+' '+back,24,8);
      beadPath(q,pts.map((p,i)=>[p[0]+side*.025,p[1],p[2]+back*([.051,.061,.034,.032][i])]),.012,C.gold,'Cabriole gilt arris',false,24);
      const foot=part(G.mesh(q,new THREE.CylinderGeometry(.06,.055,.055,8),C.gold,side*.430,.267,z0+back*.066),'Leg foot');foot.scale.z=1.10;
      leafRelief(q,side*.440,.683,z0+back*.064,.115,.15,side*-.32,C.gold,'Cabriole knee acanthus');
    }
    // A waisted, lobed carved back replaces the mechanically perfect oval.
    const backShape=(scale=1)=>{const p=new THREE.Shape();p.moveTo(0,-.465);p.bezierCurveTo(-.28,-.48,-.42,-.28,-.401,-.08);p.bezierCurveTo(-.50,.10,-.39,.38,-.21,.415);p.bezierCurveTo(-.09,.39,-.10,.485,0,.481);p.bezierCurveTo(.10,.485,.09,.39,.21,.415);p.bezierCurveTo(.39,.38,.50,.10,.401,-.08);p.bezierCurveTo(.42,-.28,.28,-.48,0,-.465);p.closePath();if(scale!==1){const pts=p.getSpacedPoints(48);const s=new THREE.Shape(pts.map(v=>v.multiplyScalar(scale)));return s;}return p;};
    const outer=backShape(1.10),hole=new THREE.Path(backShape(.91).getPoints(12).reverse());outer.holes.push(hole);shaped(q,outer,.089,C.ivory,0,1.43,-.416,.018,'Oval back frame');
    beadPath(q,backShape(1.072).getSpacedPoints(56).slice(0,-1).map(p=>[p.x,1.43+p.y,-.308]),.019,C.gold,'Sculpted back outer gilt moulding',true,56);
    beadPath(q,backShape(1.05).getSpacedPoints(48).slice(0,-1).map(p=>[p.x,1.43+p.y,-.435]),.017,C.gold,'Rear back gilt moulding',true,48);
    const padShape=backShape(.917);shaped(q,padShape,.069,cloth,0,1.43,-.40,.013,'Inset back upholstery');
    const buttons=[[-.19,-.13],[.19,-.13],[0,.02],[-.18,.17],[.18,.17],[0,-.29],[0,.32]];
    const backSurface=cushionSurface(q,padShape,0,1.43,-.305,cloth,'Sculpted button tufted back',{depth:.092,buttons});backSurface.updateWorldMatrix(true,false);
    const tuftDepth=(bx,by)=>{const origin=backSurface.localToWorld(new THREE.Vector3(bx,by,1)),dir=new THREE.Vector3(0,0,-1).transformDirection(backSurface.matrixWorld),hit=new THREE.Raycaster(origin,dir).intersectObject(backSurface,false)[0];return hit?backSurface.worldToLocal(hit.point.clone()).z:0;};
    beadPath(q,backShape(.946).getSpacedPoints(48).slice(0,-1).map(p=>[p.x,1.43+p.y,-.296]),.012,C.lightGold,'Inset upholstery welt',true,48);
    for(const [bx,by]of buttons){const button=part(G.mesh(q,new THREE.SphereGeometry(.017,8,5),C.lightGold,bx,1.43+by,-.305+tuftDepth(bx,by)+.005),'Recessed upholstery button');button.scale.z=.34;}
    // Short tucked pleats stop before the border; their relief is physical.
    for(const [bx,by]of buttons)for(const side of [-1,1])beadPath(q,[[bx,1.43+by,-.305+tuftDepth(bx,by)+.003],[bx+side*.046,1.43+by+.048,-.305+tuftDepth(bx+side*.046,by+.048)+.003],[bx+side*.071,1.43+by+.070,-.305+tuftDepth(bx+side*.071,by+.070)+.003]],.0037,cloth===C.green?C.emerald:0x90af94,'Diamond tuck seam',false,8);
    for(const side of [-1,1]){
      carvedSweep(q,[[side*.34,.77,-.30],[side*.38,.97,-.36],[side*.35,1.20,-.38]],[.043,.050,.034],[.035,.044,.031],C.ivory,'Back stile joined to seat',16,8);
      carvedSweep(q,[[side*.45,.78,.24],[side*.480,.99,.27],[side*.430,1.16,.19],[side*.435,1.18,-.22],[side*.36,1.20,-.36]],[.041,.056,.040,.038,.035],[.038,.042,.031,.039,.030],C.ivory,'Joined arm and upright',24,8);
      beadPath(q,[[side*.474,.82,.264],[side*.501,1.02,.281],[side*.458,1.16,.14],[side*.453,1.18,-.21],[side*.373,1.22,-.34]],.011,C.gold,'Armrest gilt edge',false,24);
      const arm=part(G.mesh(q,new THREE.CapsuleGeometry(.052,.26,3,8),cloth,side*.442,1.204,-.015),'Padded armrest');arm.rotation.x=Math.PI/2;arm.scale.set(.95,1,.75);
    }
    rocaille(q,0,1.904,-.303,.235,.15);q.userData.seatTopLocal=.928;q.userData.silhouette='waisted back; S-curve taper legs; scalloped apron';
    G.collider(colliders,x,z,1.18,1.20);cameraBox(x,1.13,z,1.18,1.81,1.2);
  }

  function grandPiano(x,z){
    const q=assembly(local(x,z),'Curved-rim grand piano','piano');
    const outline=()=>{const p=new THREE.Shape();p.moveTo(-1.25,1.02);p.lineTo(1.25,1.02);p.lineTo(1.25,.49);p.bezierCurveTo(1.25,-.05,.87,-.12,.79,-.67);p.bezierCurveTo(.70,-1.25,-.14,-1.28,-.65,-1.24);p.bezierCurveTo(-1.17,-1.22,-1.25,-.84,-1.25,-.52);p.closePath();return p;};
    slab(q,outline(),1.135,.235,C.emerald,'Continuous curved piano rim',.026);
    const outlinePoints=outline().getSpacedPoints(56).slice(0,-1);
    for(const [yy,r,col]of [[1.277,.025,C.gold],[1.010,.020,C.gold],[1.058,.009,C.lightGold]])beadPath(q,outlinePoints.map(p=>[p.x,yy,p.y]),r,col,'Continuous case moulding',true,56);
    for(const side of [-1,1]){const a=new THREE.Group();a.position.set(side*1.255,1.144,.16);a.rotation.y=side*Math.PI/2;q.add(a);rocaille(a,0,0,0,.35,.19);for(const dir of [-1,1])scrollRelief(a,0,-.04,0,.30,.18,dir,'Piano side carved scroll');}
    // Inset soundboard follows the rim; the front keybed remains flat.
    const board=outline();const boardMesh=slab(q,board,1.279,.045,0xb29a63,'Inset piano soundboard');boardMesh.scale.set(.94,.94,1);
    const left=-1.01,right=1.01;
    for(const [xx,zz]of [[left,.76],[right,.76],[-.47,-1.02]]){
      const front=zz>0?1:-1,side=xx<0?-1:1;
      carvedSweep(q,[[xx,.285,zz],[xx-side*.035,.49,zz-front*.014],[xx+side*.065,.85,zz-front*.025],[xx,1.15,zz]],[.064,.041,.061,.114,.099],[.064,.043,.065,.102,.091],C.ivory,'Joined turned piano leg',28,10);
      rounded(q,xx,.262,zz,.17,.055,.17,C.gold,.026,'Piano carved foot');
      beadPath(q,[[xx+side*.047,.30,zz+front*.031],[xx+side*.019,.55,zz+front*.04],[xx+side*.097,.9,zz+front*.068],[xx+side*.042,1.12,zz+front*.075]],.015,C.gold,'Piano leg gilt spine',false,24);
      leafRelief(q,xx,.99,zz+front*.087,.20,.27,-side*.12,C.gold,'Piano knee leaf carving');
      rounded(q,xx,1.125,zz,.26,.15,.26,C.emerald,.035,'Leg mounting block');
    }
    rounded(q,0,1.238,1.08,2.55,.14,.40,C.emerald,.035,'Keyboard bed');
    rounded(q,0,1.324,1.08,2.34,.065,.35,0x182d25,.01,'Keyboard recess');
    const pitch=2.24/35;
    for(let i=0;i<35;i++)G.box(q,-1.12+pitch*(i+.5),1.370,1.092,pitch*.91,.035,.31,C.white);
    // Real two/three black-key groups separated at E-F and B-C.
    for(let i=0;i<34;i++)if([0,1,3,4,5].includes(i%7))G.box(q,-1.12+pitch*(i+1),1.408,1.015,pitch*.52,.043,.18,0x172b24);
    for(const side of [-1,1])rounded(q,side*1.22,1.38,1.08,.105,.16,.40,C.gold,.025,'Keyboard cheek');
    rounded(q,0,1.455,.84,2.40,.10,.10,C.emerald,.026,'Fallboard rail');
    const musicShape=new THREE.Shape();musicShape.moveTo(-.56,-.19);musicShape.lineTo(.56,-.19);musicShape.lineTo(.56,.10);musicShape.bezierCurveTo(.36,.09,.30,.27,0,.22);musicShape.bezierCurveTo(-.30,.27,-.36,.09,-.56,.10);musicShape.closePath();
    const music=shaped(q,musicShape,.049,C.emerald,0,1.635,.51,.014,'Connected music desk');music.rotation.x=-.12;
    const deskTrim=beadPath(music,musicShape.getSpacedPoints(36).slice(0,-1).map(p=>[p.x,p.y,.064]),.012,C.gold,'Shaped music desk gilt edge',true,36);
    rocaille(music,0,.018,.062,.28,.21);
    G.box(q,0,1.444,.58,1.20,.045,.18,C.gold);
    for(const xx of [-.46,.46])rail(q,[[xx,1.32,.54],[xx,1.53,.54]],.023,C.gold,'Music desk mounting');
    // Lid is a matching curved board on a true long-side hinge, not a square.
    const hinge=new THREE.Group();hinge.position.set(-1.24,1.42,0);hinge.rotation.z=.38;q.add(hinge);hinge.name='Long-side hinged piano lid';
    const lidShape=outline();const lid=slab(hinge,lidShape,0,.065,C.emerald,'Curved raised lid',.018);lid.position.x=1.24;
    for(const [yy,rad]of [[.043,.019],[-.024,.012]])beadPath(hinge,outlinePoints.map(p=>[p.x+1.24,yy,p.y]),rad,C.gold,'Lid continuous gilded rim',true,56);
    const lidCartouche=new THREE.Group();lidCartouche.position.set(1.13,.047,-.13);lidCartouche.rotation.x=-Math.PI/2;hinge.add(lidCartouche);rocaille(lidCartouche,0,0,0,.48,.39);for(const side of [-1,1])scrollRelief(lidCartouche,side*.09,-.06,0,.35,.28,side,'Lid foliate scroll');
    // Real strings run below the hinged lid; they join a cast gilt harp frame.
    rail(q,[[-1.08,1.332,.48],[-1.00,1.332,-.72],[-.47,1.332,-1.12],[.61,1.332,-.76],[.90,1.332,.40]],.024,C.gold,'Joined soundboard harp frame');
    for(let i=0;i<17;i++){const px=-.90+i*.094;rail(q,[[px,1.33,.39],[px,1.33,-.97+Math.pow((px+.30),2)*.34]],.0025,C.lightGold,'Tensioned piano string');}
    // Visible hinge barrels share the hinge axis and lid support reaches it.
    for(const zz of [-.78,-.20,.38]){const h=G.cyl(q,-1.24,1.42,zz,.026,.026,.19,C.gold,10);h.rotation.x=Math.PI/2;}
    const lx=.64,lz=-.37,px=-1.24+(lx+1.24)*Math.cos(.38)+.030*Math.sin(.38),py=1.42+(lx+1.24)*Math.sin(.38)-.030*Math.cos(.38);
    rail(q,[[.64,1.31,lz],[px,py,lz]],.026,C.gold,'Connected lid prop');
    // A joined lyre carries the pedals below the keyboard.
    for(const side of [-1,1])rail(q,[[side*.22,1.13,.79],[side*.20,.67,.80],[side*.14,.46,.87]],.030,C.gold,'Pedal lyre upright');
    rounded(q,0,.455,.86,.37,.09,.14,C.gold,.02,'Pedal cross rail');
    for(const xx of [-.12,0,.12])rounded(q,xx,.414,.99,.068,.043,.30,C.gold,.026,'Piano pedal');
  }
  function pianoBench(x,z){
    const q=assembly(local(x,z),'Tufted cabriole piano bench','bench');
    slab(q,roundShape(1.46,.69,.12),.765,.14,C.ivory,'Bench apron');
    slab(q,roundShape(1.46,.69,.13),.895,.15,C.sage,'Bench padded seat',.020);
    const top=cushionSurface(q,roundShape(1.42,.65,.12),0,.973,0,C.sage,'Stuffed bench upholstery',{depth:.045,buttons:[[-.4,0],[0,0],[.4,0]],horizontal:true});
    beadPath(q,roundShape(1.46,.69,.13).getSpacedPoints(40).slice(0,-1).map(p=>[p.x,.984,-p.y]),.012,C.gold,'Bench upholstery piping',true,40);
    for(const xx of [-.61,.61])for(const zz of [-.22,.22])carvedSweep(q,[[xx,.254,zz],[xx*.91,.40,zz*1.07],[xx*1.04,.64,zz],[xx,.77,zz]],[.040,.026,.053,.05],[.04,.03,.046,.044],C.gold,'Bench leg joined to apron',20,8);
    for(const zz of [-.351,.351]){const ornament=rocaille(q,0,.767,zz,.26,.17);if(zz<0)ornament.rotation.y=Math.PI;}
  }

  function palaceHearth(x,z){
    const q=assembly(local(x,z),'Carved rocaille marble fireplace','fireplace');
    rounded(q,0,.32,.13,2.28,.16,.78,C.stone,.03,'Hearth plinth');G.box(q,0,1.0,-.25,1.28,1.16,.075,0x263a30);
    for(const side of [-1,1]){
      rounded(q,side*.82,1.12,.09,.33,1.53,.63,C.ivory,.025,'Solid marble jamb');
      rounded(q,side*.82,.455,.16,.43,.20,.69,C.white,.025,'Jamb plinth');
      // Modelled consoles flare continuously out of their jambs into the shelf.
      const console=new THREE.Shape();console.moveTo(-.145,-.58);console.lineTo(.145,-.58);console.bezierCurveTo(.16,-.22,.23,.07,.21,.31);console.bezierCurveTo(.20,.52,.26,.61,.24,.67);console.lineTo(-.23,.67);console.bezierCurveTo(-.26,.50,-.10,.31,-.13,.10);console.closePath();shaped(q,console,.16,C.white,side*.82,1.10,.34,.020,'Sculpted S-profile mantel console');
      scrollRelief(q,side*.83,1.53,.526,.22,.46,-side,'Jamb volute crest');leafRelief(q,side*.82,1.21,.518,.235,.46,-side*.06);leafRelief(q,side*.82,.82,.510,.17,.28,side*.04);
      beadPath(q,[[side*.75,.61,.522],[side*.77,.83,.535],[side*.76,1.18,.535],[side*.69,1.48,.55]],.012,C.gold,'Jamb carved gilt arris');
      rounded(q,side*.82,1.74,.15,.43,.14,.67,C.white,.02,'Jamb capital');
    }
    const frieze=new THREE.Shape();frieze.moveTo(-1.01,1.91);frieze.lineTo(1.01,1.91);frieze.lineTo(1.01,1.63);frieze.bezierCurveTo(.72,1.68,.50,1.59,0,1.60);frieze.bezierCurveTo(-.50,1.59,-.72,1.68,-1.01,1.63);frieze.closePath();shaped(q,frieze,.62,C.ivory,0,0,-.22,.018,'Joined frieze');
    const shelf=()=>{const p=new THREE.Shape();p.moveTo(-1.20,-.42);p.lineTo(1.20,-.42);p.lineTo(1.20,.32);p.bezierCurveTo(1.19,.47,.87,.40,.72,.46);p.bezierCurveTo(.41,.52,.22,.50,0,.53);p.bezierCurveTo(-.22,.50,-.41,.52,-.72,.46);p.bezierCurveTo(-.87,.40,-1.19,.47,-1.20,.32);p.closePath();return p;};
    const under=slab(q,shelf(),1.943,.10,C.gold,'Mantel under moulding',.02);under.scale.set(.965,.95,1);under.position.z=.13;
    const cap=slab(q,shelf(),2.01,.11,C.white,'Continuous mantel shelf',.030);cap.position.z=.13;
    rocaille(q,0,1.795,.444,.47,.34);for(const side of [-1,1]){scrollRelief(q,side*.10,1.70,.434,.52,.25,side,'Frieze foliate scroll');leafRelief(q,side*.53,1.81,.447,.20,.24,side*1.0);}
    for(const zz of [-.02,.19]){const log=G.cyl(q,0,.47,zz,.067,.076,1.02,0x6d5540,9);log.rotation.z=Math.PI/2;}
    for(const xx of [-.49,-.25,0,.25,.49])rail(q,[[xx,.38,.29],[xx,.59,.32],[xx,.69,.29]],.015,0x36473b,'Joined grate bar');G.box(q,0,.58,.315,1.08,.025,.035,0x36473b);
  }

  function urn(x,z,s=.8){
    block(x,.48,z,1.10,.72,1.10,C.white);G.box(group,x,.88,z,.88,.13,.88,C.gold);G.vessel(group,x,.96,z,C.white,s);
    for(let i=0;i<8;i++){let a=i*2.4,xx=x+Math.sin(a)*.27,zz=z+Math.cos(a)*.27;G.cyl(group,xx,1.81,zz,.012,.014,.75,C.green,5);G.sphere(group,xx,2.13+Math.sin(i)*.1,zz,.18,C.white,1,.8,1);G.sphere(group,xx+.09,1.95,zz,.17,C.sage,.8,1.7,.7);}
  }
  box(0,-.5,0,60,1,80,0x729466);cameraBox(0,-.5,0,60,1,80);
  // Palace plan: four substantial chambers, axial gallery, two enfilade links.
  box(0,.115,-5,21.6,.23,17,C.ivory);cameraBox(0,.115,-5,21.6,.23,17);
  box(0,.065,4.97,22.7,.13,3.1,C.ivory);cameraBox(0,.065,4.97,22.7,.13,3.1);
  box(0,.016,12,27.8,.032,12.7,0xe4e7d5);box(0,.024,-16.25,24,.046,4.0,0xe4e7d5);
  const windowOpen=(v,w=2.05)=>({from:v-w/2,to:v+w/2,bottom:.9,top:4.54});
  wall({at:3.5,from:-10.8,to:10.8,openings:[windowOpen(-8.55,1.7),windowOpen(-5.55,1.7),{from:-1.9,to:1.9,top:4.12},windowOpen(5.55,1.7),windowOpen(8.55,1.7)]});
  wall({at:-13.5,from:-10.8,to:10.8,openings:[windowOpen(-7.1,2.4),{from:-1.6,to:1.6,top:4.12},windowOpen(7.1,2.4)]});
  for(const x of [-10.8,10.8])wall({axis:'z',at:x,from:-13.5,to:3.5,openings:[windowOpen(-12,1.3),{from:-10.65,to:-8.35,top:3.9},{from:-6,to:-4,top:3.9},windowOpen(-2.2,2.65)]});
  for(const x of [-3,3])wall({axis:'z',at:x,from:-13.5,to:3.5,openings:[{from:-10.8,to:-8.2,top:3.9},{from:-2.3,to:.3,top:3.9}]});
  for(const s of [-1,1])wall({at:-6.6,from:s<0?-10.8:3,to:s<0?-3:10.8,openings:[{from:s*6.85-1.10,to:s*6.85+1.10,top:3.9}]});
  for(const x of [-3,3])for(const z of [-9.5,-1])doorway(x,z,2.6,Math.PI/2);
  for(const x of [-6.85,6.85])doorway(x,-6.6,2.2);
  doorway(0,3.5,3.8);doorway(0,-13.5,3.2);
  for(const x of [-8.55,-5.55,5.55,8.55])windowAt(x,3.5,1.7,Math.PI);
  for(const x of [-7.1,7.1])windowAt(x,-13.5,2.4);
  for(const x of [-10.8,10.8])for(const [z,w]of [[-12,1.3],[-2.2,2.65]])windowAt(x,z,w,x<0?Math.PI/2:-Math.PI/2);
  // Tall white/gilt panel sequences, interleaved with mirrored green salons.
  for(const x of [-3,3]){
    const q=local(x,-5, x<0?Math.PI/2:-Math.PI/2);
    for(const u of [-6.5,-.55,.95,5.9])panel(q,u,0,1.28,u===.95);
  }
  for(const x of [-10.62,10.62]){
    const q=local(x,0,x<0?Math.PI/2:-Math.PI/2);
    for(const z of [-7.4,1.2])panel(q,x<0?-z:z,0,1.35,true);
  }
  for(const s of [-1,1])for(const front of [-1,1]){const q=local(s*6.85,-6.6,front<0?Math.PI:0);panel(q,-2.48,.19,1.58,true);panel(q,2.48,.19,1.58,true);}
  for(const x of [-4.5,4.5,-9.5,9.5])panel(group,x,-13.29,1.25,true);
  // Raised enfilade boiserie extends beyond the plaster wall; the low relief
  // receives a matching thin body collider so radius sweeps cannot clip it.
  for(const s of [-1,1])for(const side of [-1,1])for(const offset of [-2.48,2.48])G.collider(colliders,s*6.85+offset,-6.6+side*.29,1.65,.12);
  // Oak parquet is subordinate to the ivory and green architectural palette.
  for(const [xc,zc,w,d]of [[-6.9,-1.55,7.5,9.75],[6.9,-1.55,7.5,9.75],[6.9,-10.05,7.5,6.6]]){
    box(xc,.242,zc,w,.02,d,0xb29c79);
    for(let xx=xc-w/2+.35;xx<xc+w/2-.2;xx+=.7)for(let zz=zc-d/2+.35;zz<zc+d/2-.2;zz+=.7){G.box(group,xx,.256,zz,.45,.016,.45,((Math.floor(xx*10)+Math.floor(zz*10))%3)?0xcbb68f:0x9b805e,Math.PI/4);}
    for(const s of [-1,1]){box(xc+s*(w/2-.12),.273,zc,.06,.016,d-.22,C.gold);box(xc,.273,zc+s*(d/2-.12),w-.22,.016,.06,C.gold);}
  }
  for(let x=-2.5;x<=2.5;x+=1)for(let z=-13;z<=3;z++)box(x,.245,z,.99,.026,.99,(Math.round(x+.5)+z)%2?C.ivory:0x739482);
  for(const z of [-10,-5,0]){G.cyl(group,0,.27,z,.69,.69,.017,C.ivory,32);G.torus(group,0,.288,z,.59,.021,C.gold);for(let i=0;i<8;i++){let a=i*Math.PI/4;G.sphere(group,Math.sin(a)*.36,.29,z+Math.cos(a)*.36,.13,C.gold,.40,.055,1.22).rotation.y=a;}}
  for(let x=-10.25;x<-3.3;x+=.8)for(let z=-13.1;z<-6.9;z+=.8)box(x,.246,z,.79,.025,.79,(Math.round(x*5)+Math.round(z*5))%2?C.ivory:0xcbd7c7);
  // Five full ceilings stay present in TPS. Coffers are shallow, fixtures high.
  ceiling(-6.9,-10.05,7.8,6.9);ceiling(6.9,-10.05,7.8,6.9);ceiling(-6.9,-1.55,7.8,10.1);ceiling(6.9,-1.55,7.8,10.1);ceiling(0,-5,6,17);
  for(const [x,z]of [[-6.9,-9.25],[6.9,-9.25],[-6.6,-1.35],[6.75,-1.0],[0,-2.5],[0,-9.0]])chandelier(x,z,x===0?.85:1);
  // Strong palace silhouette: central projecting pavilion, layered entablature,
  // pale hipped mansard, balustraded parapet and formal Corinthian portico.
  for(const [y,h,w,d]of [[5.33,.23,22.35,17.65],[5.54,.15,22.65,17.9],[5.72,.20,22.18,17.5]])box(0,y,-5,w,h,d,y===5.54?C.gold:C.white,roofGroup);
  box(0,5.94,-5,21.85,.30,17.2,C.sage,roofGroup);
  for(const z of [-13.55,3.55]){
    box(0,6.65,z,22.0,.16,.35,C.ivory,roofGroup);
    for(let x=-10.7;x<=10.8;x+=.56){G.cyl(roofGroup,x,6.33,z,.065,.085,.49,C.ivory,8);G.sphere(roofGroup,x,6.38,z,.10,C.white,.80,1.4,.80);}
  }
  for(const x of [-10.8,10.8]){box(x,6.65,-5,.35,.16,17.2,C.ivory,roofGroup);for(let z=-13.25;z<=3.25;z+=.56){G.cyl(roofGroup,x,6.33,z,.065,.085,.49,C.ivory,8);G.sphere(roofGroup,x,6.38,z,.10,C.white,.8,1.4,.8);}}
  for(const x of [-10.5,10.5])for(const z of [-13.2,3.15]){box(x,6.36,z,.53,.80,.53,C.white,roofGroup);G.vessel(roofGroup,x,6.78,z,C.ivory,.82);}
  // A low slate-green roof rises behind the parapet without country tiles.
  const roofShape=new THREE.Shape();roofShape.moveTo(-9.9,0);roofShape.lineTo(-8.8,.85);roofShape.lineTo(8.8,.85);roofShape.lineTo(9.9,0);roofShape.closePath();G.mesh(roofGroup,new THREE.ExtrudeGeometry(roofShape,{depth:15.8,bevelEnabled:false}),0x668275,0,6.03,-12.9);
  for(const x of [-3.25,-1.85,1.85,3.25])column(x,5.37,4.8);
  for(const y of [5.18,5.40,5.60])box(0,y,4.48,7.8,y===5.4?.20:.15,3.3,y===5.4?C.gold:C.white,roofGroup);
  const ped=new THREE.Shape();ped.moveTo(-4.05,0);ped.lineTo(0,1.36);ped.lineTo(4.05,0);ped.closePath();G.mesh(roofGroup,new THREE.ExtrudeGeometry(ped,{depth:.65,bevelEnabled:false}),C.ivory,0,5.71,5.36);
  for(const s of [-1,1]){const r=G.box(roofGroup,s*2.0,6.39,5.98,4.29,.10,.15,C.gold);r.rotation.z=-s*Math.atan(1.36/4.05);}
  G.cyl(roofGroup,0,6.13,6.06,.41,.41,.09,C.gold,24).rotation.x=Math.PI/2;G.sphere(roofGroup,0,6.13,6.13,.31,C.sage,1,1,.15);
  for(const s of [-1,1])for(let i=0;i<5;i++){let a=s*(.5+i*.25);const leaf=G.sphere(roofGroup,Math.sin(a)*.69,6.12-Math.cos(a)*.22,6.10,.15,C.gold,1.7,.32,.25);leaf.rotation.z=-a;}
  for(const x of [-10.53,-3.85,3.85,10.53]){box(x,2.65,3.71,.35,4.7,.35,C.white);for(const y of [.43,4.83])box(x,y,3.75,.68,.21,.50,C.gold);}
  // State gallery: mirrored pairs, white urn pedestals, open central circulation.
  for(const x of [-2.76,2.76]){const q=local(x,-5.1,x<0?Math.PI/2:-Math.PI/2);mirror(q,0,3.0,.10,1.7,2.65);}
  for(const x of [-2.27,2.27])urn(x,-11.88,.55);
  // Emerald salon: gilt-framed settee, pale-green fauteuils, white marble hearth.
  G.rug(group,-6.9,-1.4,5.6,6.4,C.sage,C.gold);
  for(const z of [-3.9,1.1])for(const x of [-9.2,-4.6])G.sphere(group,x,.31,z,.21,C.white,1,.08,1);
  block(-9.45,.64,-1.95,1.26,.70,3.86,C.gold);box(-9.45,1.0,-1.95,1.24,.25,3.69,C.green);box(-10.04,1.47,-1.95,.18,1.06,3.83,C.gold);box(-9.92,1.47,-1.95,.12,.84,3.61,C.green);
  for(const z of [-3.78,-.12]){G.sphere(group,-9.44,1.35,z,.35,C.gold,1.65,.24,.34);G.sphere(group,-9.45,1.0,z,.27,C.sage,1.60,.28,.51);}
  for(const z of [-3,-1.8,-.6])pillow(group,-9.22,1.22,z,C.sage,.66,.72);
  chairAt(-4.65,-3.45,-Math.PI/2);chairAt(-6.65,1.80,Math.PI,C.green);
  feetTable(group,colliders,-6.85,-1.65,2.4,1.65,C.gold,.85);cameraBox(-6.85,.6,-1.65,2.4,1.05,1.65);G.sphere(group,-6.85,.965,-1.65,1.0,C.ivory,1.28,.09,.86);book(group,-7.1,1.09,-1.55,C.green,.15);royalSalonTea();
  // Hearth on the solid west portion of the enfilade wall; center door stays open.
  reserveBlock(-9.1,1.08,-6.07,2.01,1.70,.69);palaceHearth(-9.1,-6.07);
  mirror(group,-9.1,3.27,-6.25,1.80,2.04);
  for(const x of [-9.8,-8.4]){G.cyl(group,x,2.25,-5.95,.06,.15,.41,C.gold);G.cyl(group,x,2.60,-5.95,.05,.05,.30,C.white);}
  // Gold/green library console occupies the other solid wall pier.
  block(-4.43,1.42,-6.02,2.02,2.39,.69,C.white);for(const y of [.5,1.15,1.85,2.55])box(-4.43,y,-5.63,2.05,.065,.20,C.gold);
  for(let r=0;r<3;r++)for(let i=0;i<7;i++)box(-5.20+i*.25,.80+r*.70,-5.67,.16,.49,.23,[C.green,C.sage,C.gold,C.white][(i+r)%4]);
  // Royal pastry room: marble work surfaces and deep-green fitted cabinetry.
  block(-7.1,.82,-12.15,6.0,1.17,1.18,C.green);box(-7.1,1.48,-12.15,6.17,.16,1.35,C.white);
  for(let i=0;i<5;i++){let x=-9.52+i*1.21;box(x,.86,-11.53,1.08,.88,.048,C.sage);for(const s of [-1,1])box(x+s*.48,.86,-11.49,.026,.76,.025,C.gold);box(x,1.12,-11.44,.27,.05,.06,C.gold);}
  block(-9.15,.88,-7.75,1.85,1.28,1.47,C.emerald);box(-9.15,1.60,-7.75,1.97,.13,1.56,C.white);box(-9.15,.94,-6.99,1.45,.78,.05,C.gold);box(-9.15,.93,-6.94,1.16,.50,.035,0x2d4539);
  for(const dx of [-.43,.43])G.torus(group,-9.15+dx,1.70,-7.75,.26,.035,C.gold);
  G.cyl(group,-9.15,1.83,-7.75,.26,.28,.23,0xb88d58,16);
  feetTable(group,colliders,-5.4,-10.15,2.2,1.30,C.gold,1.10);box(-5.4,1.20,-10.15,2.3,.14,1.4,C.white);bread(group,-5.7,1.38,-10.15,1.0);plate(group,-4.8,1.272,-10.15,C.white,.31);cameraBox(-5.4,.79,-10.15,2.3,1.25,1.4);
  bread(group,-7.0,1.70,-12.05,1.0);G.vessel(group,-4.55,1.56,-12.12,C.white,.55);
  for(let i=0;i<4;i++){G.cyl(group,-9.0+i*.5,3.65,-13.22,.18,.18,.06,0xc29a5b,16).rotation.x=Math.PI/2;box(-9+i*.5,3.91,-13.19,.032,.35,.04,C.gold);}
  // Royal art cabinet: original architectural landscape canvas and still life.
  G.rug(group,6.9,-9.8,5.8,4.8,0xd4dfc9,C.gold);
  const easel=local(7.1,-11.05);for(const s of [-1,1]){let m=G.box(easel,s*.64,1.58,0,.095,2.68,.13,C.gold);m.rotation.z=s*.14;}
  G.box(easel,0,1.01,.04,1.9,.12,.32,C.gold);G.box(easel,0,2.66,0,.10,1.18,.10,C.gold);G.box(easel,0,1.95,.09,1.92,1.78,.08,C.gold);G.box(easel,0,1.95,.145,1.77,1.64,.025,0xd2e1d4);
  G.box(easel,0,1.50,.174,1.74,.58,.022,0x8eab7d);G.box(easel,0,1.97,.19,.88,.55,.025,C.white);G.box(easel,0,2.28,.21,1.02,.11,.025,C.gold);for(const xx of [-.32,-.12,.12,.32])G.box(easel,xx,1.96,.224,.056,.46,.017,C.sage);G.sphere(easel,.54,2.49,.19,.13,C.lightGold,1,1,.1);
  G.collider(colliders,7.1,-11.05,2.0,1.2);cameraBox(7.1,1.59,-11.05,2.0,2.82,1.2);
  feetTable(group,colliders,9.1,-7.60,2.2,1.15,C.gold,1.04);box(9.1,1.15,-7.60,2.3,.10,1.23,C.ivory);cameraBox(9.1,.70,-7.60,2.3,1.25,1.23);
  for(let i=0;i<5;i++)G.cyl(group,8.30+i*.34,1.30,-7.60,.105,.1,.22,[C.green,C.sage,C.white,C.gold,0x719c9a][i],8);
  G.vessel(group,9.92,1.22,-7.56,C.sage,.4);for(let i=0;i<5;i++)box(9.86+i*.025,1.84,-7.56,.015,.60,.015,C.gold);
  chairAt(4.7,-11.67,Math.PI/2,C.sage);urn(4.35,-7.65,.60);
  // White-and-emerald state bedroom with a true tall canopy, gilded finials,
  // draped backcloth and embroidered geometric coverlet.
  G.rug(group,7.0,-1.8,5.8,6.8,C.sage,C.gold);
  block(7.55,.55,-2.65,3.35,.64,4.05,C.gold);box(7.55,.99,-2.65,3.23,.28,3.93,C.white);box(7.55,1.17,-1.98,3.24,.16,2.61,C.green);box(7.55,1.34,-4.57,3.42,1.70,.18,C.white);
  for(const x of [6.42,7.55,8.68])box(x,1.262,-1.98,.039,.019,2.40,C.gold);
  for(const z of [-2.9,-2.1,-1.3])box(7.55,1.263,z,3.10,.019,.035,C.gold);
  for(const x of [6.72,8.32])pillow(group,x,1.20,-3.82,C.white,.95,.64);
  for(const x of [5.82,9.28])for(const z of [-4.70,-.58]){G.cyl(group,x,2.30,z,.055,.075,4.1,C.gold,10);G.sphere(group,x,4.48,z,.13,C.gold,.80,1.8,.8);cameraBox(x,2.3,z,.15,4.4,.15);}
  box(7.55,4.20,-2.64,3.75,.18,4.5,C.gold);box(7.55,4.31,-2.64,3.66,.075,4.4,C.sage);
  for(const x of [5.96,9.15])for(let k=0;k<4;k++)G.cyl(group,x+(k-1.5)*.09,2.54+k*.006,-4.66,.11,.13,3.06,k%2?C.green:C.emerald,8);
  for(let i=0;i<11;i++)G.sphere(group,5.96+i*.32,4.0,-.49,.22,C.green,1.0,.7,.45);
  block(4.4,.85,-4.95,1.19,1.17,.86,C.white);box(4.4,1.52,-4.95,1.29,.13,1.01,C.gold);G.vessel(group,4.4,1.58,-4.95,C.white,.50);
  feetTable(group,colliders,6.3,1.93,3.1,.82,C.gold,1.10);box(6.3,1.19,1.93,3.20,.11,.90,C.white);cameraBox(6.3,.82,1.93,3.2,1.19,.9);const dressing=local(6.3,2.30,Math.PI);mirror(dressing,0,2.32,0,1.30,1.98);
  G.vessel(group,7.35,1.245,1.85,C.green,.36);for(let i=0;i<3;i++)box(5.05,1.29+i*.065,1.85,.55,.059,.46,[C.white,C.sage,C.green][i]);
  // Formal parterres, garden pool and a classical afternoon-tea loggia.
  const hedge=(x,z,w,d)=>{block(x,.42,z,w,.75,d,C.green);box(x,.80,z,w-.08,.075,d-.08,0x678b5a);};
  for(const [x,z,w,d]of [[-7.1,8.8,6.2,.40],[-7.1,13.8,6.2,.40],[-10.0,11.3,.40,5],[-4.2,11.3,.40,5],[-7.1,16.9,7.4,.40],[6.75,16.9,8.1,.40],[-11.95,11.6,.45,11.0],[11.95,11.6,.45,11.0]])hedge(x,z,w,d);
  box(-7.1,.049,11.3,5.4,.042,4.2,0x90a47c);
  G.cyl(group,-7.1,.26,11.3,1.82,1.95,.47,C.white,32);G.cyl(group,-7.1,.54,11.3,1.61,1.61,.08,C.sage,32);G.cyl(group,-7.1,.59,11.3,1.48,1.48,.035,0x9ed0bf,32);G.torus(group,-7.1,.62,11.3,1.65,.095,C.gold);
  G.cyl(group,-7.1,1.0,11.3,.21,.39,.87,C.white,16);G.cyl(group,-7.1,1.52,11.3,.71,.21,.24,C.white,20);G.cyl(group,-7.1,1.66,11.3,.57,.57,.04,0xa6d2c4,24);G.sphere(group,-7.1,1.91,11.3,.23,C.gold,.7,1.4,.7);G.collider(colliders,-7.1,11.3,3.9,3.9);cameraBox(-7.1,1.01,11.3,3.9,2.05,3.9);
  for(const [x,z]of [[-10.9,7.15],[10.9,7.15],[-10.9,15.5],[10.9,15.5]]){G.cyl(group,x,.41,z,.57,.64,.74,C.white,12);G.cyl(group,x,1.33,z,.095,.10,1.2,C.gold,8);G.sphere(group,x,2.29,z,.85,C.green,.83,1.08,.83);G.collider(colliders,x,z,1.2,1.2);}
  box(6.65,.08,10.65,6.3,.16,6.5,C.ivory);cameraBox(6.65,.08,10.65,6.3,.16,6.5);
  for(const x of [3.72,9.58])for(const z of [7.55,13.75])column(x,z,3.60);
  for(const x of [3.72,9.58])box(x,4.06,10.65,.43,.20,6.66,C.white,roofGroup);
  for(const z of [7.55,13.75])box(6.65,4.06,z,6.30,.20,.43,C.white,roofGroup);
  box(6.65,4.18,10.65,6.66,.12,6.8,C.ivory,roofGroup);cameraBox(6.65,4.18,10.65,6.66,.12,6.8);
  for(let x=3.85;x<9.55;x+=.5)box(x,4.31,10.65,.08,.15,6.85,C.sage,roofGroup);
  G.cyl(group,6.6,1.17,10.45,1.11,1.11,.12,C.white,32);G.cyl(group,6.6,.66,10.45,.11,.21,1.0,C.gold,12);G.cyl(group,6.6,.22,10.45,.58,.58,.12,C.gold,16);G.collider(colliders,6.6,10.45,2.24,2.24);cameraBox(6.6,.76,10.45,2.24,1.20,2.24);
  chairAt(4.55,10.45,Math.PI/2,C.sage);chairAt(8.65,10.45,-Math.PI/2,C.sage);chairAt(6.6,12.50,Math.PI,C.green);
  royalTeaLoggia();
  for(const x of [-2.4,2.4])urn(x,6.45,.70);
  // Rear terrace and clipped trees complete a full loop outside the pavilion.
  for(const x of [-9,-5,5,9]){G.cyl(group,x,.34,-16.70,.58,.66,.65,C.white,12);G.cyl(group,x,1.18,-16.70,.085,.1,1.6,C.gold,8);G.sphere(group,x,2.43,-16.70,.96,C.green,.85,1.03,.85);G.collider(colliders,x,-16.7,1.35,1.35);}
  const stations=[
    {id:'france-bakery',name:'宫廷糕点房',action:'烘烤法式面包',position:[-5.3,0,-9.05],playerWorkTarget:[-5.3,1.30,-9.65],color:'#b6cbb5',workTarget:[-5.7,1.30,-10.15],npcName:'卡米耶',npcAction:'cook',npcLabel:'准备宫廷面包与糕点',npcPosition:[-6.95,0,-10.55],route:[[-7.1,0,-10.55],[-6.8,0,-8.1]]},
    {id:'france-atelier',name:'皇家艺术书斋',action:'描绘宫苑的光影',position:[7.1,0,-9.25],color:'#97bba0',workTarget:[7.1,1.95,-10.90],npcName:'卢西安',npcAction:'paint',npcLabel:'调色与观察宫苑光线',npcPosition:[5.55,0,-9.4],route:[[5.55,0,-9.4],[4.3,0,-9.4]]},
    {id:'france-salon',name:'翡翠镜厅',action:'翻阅一本诗集',position:[-6.7,0,.1],color:'#629776',workTarget:[-7.1,1.08,-1.55],npcName:'玛农',npcAction:'read',npcLabel:'整理诗集与瓷器茶具',npcPosition:[-6.5,0,-4.45],route:[[-6.5,0,-4.45],[-4.0,0,-4.7]]},
    {id:'france-bedroom',name:'白金皇家寝室',action:'整理刺绣床品',position:[4.55,0,-1.2],color:'#b8cdb7',workTarget:[7.55,1.25,-1.98],npcName:'朱丽叶',npcAction:'tidy',npcLabel:'整理翡翠色刺绣织物',npcPosition:[4.35,0,.65],route:[[4.35,0,.65],[4.35,0,-2.65]]},
    {id:'france-cafe',name:'宫苑下午茶廊',action:'享用宫苑下午茶',position:[6.6,0,8.35],color:'#92bca4',workTarget:[7.21,1.414,10.06],npcName:'加布里埃尔',npcAction:'tea',npcLabel:'举杯品尝下午茶',npcPosition:[7.1,0,8.92],route:[[7.1,0,8.92],[10.55,0,9.0],[10.55,0,13.0]]}
  ];
  const explorationTargets=[{id:'forecourt',name:'宫苑主轴',position:[0,0,16]},{id:'portico',name:'科林斯门廊',position:[0,.13,5.25]},{id:'gallery',name:'白金镜廊',position:[0,.23,-5]},{id:'pastry',name:'宫廷糕点房',position:[-6.8,.23,-9]},{id:'art',name:'皇家艺术书斋',position:[7.1,.23,-9.25]},{id:'salon',name:'翡翠镜厅',position:[-6.7,.23,.1]},{id:'bedroom',name:'白金皇家寝室',position:[4.55,.23,-1.2]},{id:'tea-loggia',name:'宫苑下午茶廊',position:[6.6,.16,8.35]},{id:'rear-terrace',name:'后花园露台',position:[0,0,-16.3]},{id:'west-allee',name:'西侧绿篱步道',position:[-13.6,0,-2.6]},{id:'east-allee',name:'东侧绿篱步道',position:[13.6,0,-2.6]},{id:'fountain-walk',name:'喷泉花坛步道',position:[-2.5,0,11]}];
  const doorways=[{id:'front-entry',a:[0,.13,4.4],b:[0,.23,2.7],width:3.8,height:3.89},{id:'rear-entry',a:[0,.23,-12.6],b:[0,0,-14.4],width:3.2,height:3.89},...[-1,1].flatMap(s=>[-9.5,-1].map(z=>({id:`gallery-${s<0?'west':'east'}-${z===-1?'front':'rear'}`,a:[s*2.3,.23,z],b:[s*3.7,.23,z],width:2.6,height:3.67}))),...[-6.85,6.85].map(x=>({id:`enfilade-${x<0?'west':'east'}`,a:[x,.23,-5.8],b:[x,.23,-7.4],width:2.2,height:3.67}))];
  const walkableSurfaces=[{minX:-10.8,maxX:10.8,minZ:-13.5,maxZ:3.5,y:.23},{minX:-11.35,maxX:11.35,minZ:3.5,maxZ:6.5,y:.13},{minX:3.5,maxX:9.8,minZ:7.4,maxZ:13.9,y:.16}];
  cameraBox(0,-.5,0,30,1,40);
  group.userData.interiorRooms=[{id:'pastry',name:'宫廷糕点房',minX:-10.8,maxX:-3,minZ:-13.5,maxZ:-6.6,ceiling:5.25},{id:'art',name:'皇家艺术书斋',minX:3,maxX:10.8,minZ:-13.5,maxZ:-6.6,ceiling:5.25},{id:'salon',name:'翡翠镜厅',minX:-10.8,maxX:-3,minZ:-6.6,maxZ:3.5,ceiling:5.25},{id:'bedroom',name:'白金皇家寝室',minX:3,maxX:10.8,minZ:-6.6,maxZ:3.5,ceiling:5.25},{id:'gallery',name:'白金镜廊',minX:-3,maxX:3,minZ:-13.5,maxZ:3.5,ceiling:5.25}];
  group.userData.designRevision='R6-green-white-royal-palace';group.userData.explorationTargets=explorationTargets;group.userData.doorways=doorways;
  // R6 expanded 60 x 80 estate. Wings and services are new human-scale rooms,
  // not a uniform transform of the original pavilion or its furniture.
  const bounds={minX:-30,maxX:30,minZ:-40,maxZ:40};
  for(const s of [-1,1]){
    const xc=s*21;
    box(xc,.115,-5,8,.23,17,C.ivory);cameraBox(xc,.115,-5,8,.23,17);
    wall({axis:'z',at:s*25,from:-13.5,to:3.5,openings:[windowOpen(-10.5,2.4),windowOpen(-1.5,2.8)]});
    wall({axis:'z',at:s*17,from:-13.5,to:3.5,openings:[{from:-10.65,to:-8.35,top:3.9},{from:-6.1,to:-3.9,top:3.9}]});
    wall({at:-13.5,from:xc-4,to:xc+4,openings:[windowOpen(xc,2.8)]});
    wall({at:3.5,from:xc-4,to:xc+4,openings:[{from:xc-1.25,to:xc+1.25,top:3.9}]});
    wall({at:-6.6,from:xc-4,to:xc+4,openings:[{from:xc-1.25,to:xc+1.25,top:3.9}]});
    doorway(s*17,-9.5,2.3,Math.PI/2);doorway(s*17,-5,2.2,Math.PI/2);doorway(s*10.8,-9.5,2.3,Math.PI/2);doorway(s*10.8,-5,2,Math.PI/2);doorway(xc,3.5,2.5);doorway(xc,-6.6,2.5);
    windowAt(s*25,-10.5,2.4,s<0?Math.PI/2:-Math.PI/2);windowAt(s*25,-1.5,2.8,s<0?Math.PI/2:-Math.PI/2);windowAt(xc,-13.5,2.8);
    ceiling(xc,-10.05,8,6.9);ceiling(xc,-1.55,8,10.1);chandelier(xc,-10.05,.8);chandelier(xc,-1.55,.9);
    for(const z of [-13.5,3.5]){box(xc,5.48,z,8.45,.19,.51,C.gold,roofGroup);box(xc,5.68,z,8.67,.18,.60,C.ivory,roofGroup);for(let x=xc-3.8;x<xc+4;x+=.50){G.cyl(roofGroup,x,6.04,z,.065,.07,.51,C.white,8);}box(xc,6.33,z,8.62,.15,.40,C.white,roofGroup);}
    box(xc,5.55,-5,8.1,.45,16.9,C.sage,roofGroup);
    for(const z of [-9.5,-5]){
      const cx=s*13.9;box(cx,.115,z,6.3,.23,2.85,C.ivory);cameraBox(cx,.115,z,6.3,.23,2.85);
      for(const dx of [-1.85,1.85])for(const dz of [-1.45,1.45])column(cx+dx,z+dz,4.0);
      box(cx,4.46,z,6.5,.19,3.24,C.ivory,roofGroup);box(cx,4.62,z,6.6,.11,3.34,C.gold,roofGroup);cameraBox(cx,4.46,z,6.5,.19,3.24);
    }
    for(const xx of [xc-2.78,xc+2.78])panel(group,xx,-13.30,1.45,true);
    for(const z of [-12.0,-7.9,1.6]){const q=local(s*24.8,0,s<0?Math.PI/2:-Math.PI/2);panel(q,s<0?-z:z,0,1.50,true);}
    for(const x of [xc-3.7,xc+3.7])for(const z of [3.56,-13.55]){box(x,2.62,z,.28,4.75,.38,C.white);box(x,4.925,z,.52,.19,.51,C.gold);}
    walkableSurfaces.push({minX:xc-4,maxX:xc+4,minZ:-13.5,maxZ:3.5,y:.23},...[-9.5,-5].map(z=>({minX:s<0?-17.1:10.7,maxX:s<0?-10.7:17.1,minZ:z-1.43,maxZ:z+1.43,y:.23})));
    doorways.push(...[-9.5,-5].flatMap(z=>[{id:`core-wing-${s}-${z}`,a:[s*9.95,.23,z],b:[s*11.65,.23,z],width:z===-5?2:2.3,height:3.67},{id:`wing-entry-${s}-${z}`,a:[s*16.1,.23,z],b:[s*17.9,.23,z],width:z===-5?2.2:2.3,height:3.67}]),{id:`wing-enfilade-${s}`,a:[xc,.23,-5.7],b:[xc,.23,-7.5],width:2.5,height:3.67},{id:`wing-garden-${s}`,a:[xc,.23,2.6],b:[xc,0,4.4],width:2.5,height:3.67});
  }
  // West service wing: private bathing room behind a real cross-wall.
  for(let x=-24.5;x<-17.2;x+=.72)for(let z=-13.1;z<-6.9;z+=.72)box(x,.249,z,.70,.03,.70,((Math.round(x*10)+Math.round(z*10))%2)?C.ivory:C.sage);
  // R12: open oval tub with a supported bottom, inner wall and outer shell.
  reserveBlock(-22.55,.57,-10.2,3.05,.60,3.60);box(-22.55,.325,-10.2,3.05,.11,3.60,C.gold);
  const tubProfile=[[0,.38],[1.04,.38],[1.13,.48],[1.40,1.20],[1.28,1.20],[1.02,.42],[0,.42]].map(([r,y])=>new THREE.Vector2(r,y));const tubShell=G.mesh(group,new THREE.LatheGeometry(tubProfile,24),C.white,-22.55,0,-10.2);tubShell.scale.z=1.16;
  const bathRim=G.torus(group,-22.55,1.20,-10.2,1,.12,C.white);bathRim.scale.set(1.35,1.60,1);G.sphere(group,-22.55,1.18,-10.2,1.0,0xb2d9c9,1.10,.025,1.34);
  for(const x of [-23.62,-21.48])for(const z of [-11.4,-9.0])G.sphere(group,x,.43,z,.13,C.gold,.8,1.4,.8);
  G.cyl(group,-22.55,1.33,-11.73,.055,.055,.64,C.gold,10);const spout=G.torus(group,-22.55,1.65,-11.66,.17,.035,C.gold,0);spout.rotation.y=Math.PI/2;
  // Wash basin, towel rail, screened WC, and linen cabinet stay on service edges.
  block(-19.20,.82,-12.65,2.64,1.13,.90,C.white);box(-19.20,1.46,-12.65,2.81,.15,1.03,C.gold);G.sphere(group,-19.2,1.56,-12.55,.52,C.ivory,1.1,.20,.7);G.sphere(group,-19.2,1.665,-12.55,.33,C.sage,1.1,.035,.72);G.cyl(group,-19.2,1.81,-12.91,.035,.035,.45,C.gold,8);mirror(group,-19.2,3.02,-13.25,1.48,2.0);
  for(let i=0;i<3;i++)box(-18.35,1.60+i*.09,-12.52,.61,.075,.47,[C.white,C.sage,C.white][i]);
  block(-18.18,1.46,-7.45,1.37,2.45,.71,C.ivory);for(const x of [-18.49,-17.87]){box(x,1.49,-7.06,.52,2.13,.05,C.sage);box(x,1.52,-7.015,.046,.15,.05,C.gold);}
  block(-24.17,.65,-7.66,.91,.85,1.3,C.ivory);G.sphere(group,-24.17,1.00,-7.51,.47,C.white,1,.20,1.3);box(-24.17,1.3,-8.1,.87,1.1,.27,C.white);
  block(-23.1,1.47,-7.9,.12,2.43,1.91,C.sage);for(const z of [-8.81,-7.0])box(-23.08,1.48,z,.19,2.58,.075,C.gold);
  box(-24.65,2.18,-11.85,.12,.065,1.55,C.gold);box(-24.58,1.85,-11.85,.065,.70,1.1,C.white);
  // Winter orangery with indoor citrus, balanced benches and worktable.
  G.rug(group,-21,-1.55,5.3,6.2,0xdce3cf,C.gold);
  for(const [x,z]of [[-23.7,1.8],[-18.3,1.8],[-23.7,-4.8]]){G.cyl(group,x,.57,z,.59,.46,.85,C.white,12);G.cyl(group,x,1.55,z,.075,.10,1.6,C.gold,8);G.sphere(group,x,2.61,z,.79,C.green,.9,1.2,.9);for(let k=0;k<5;k++)G.sphere(group,x+Math.sin(k*2.4)*.5,2.54+Math.cos(k)*.35,z+Math.cos(k*2.4)*.5,.11,0xdbbc55);G.collider(colliders,x,z,1.28,1.28);}
  block(-23.62,.70,-1.45,1.03,.64,3.2,C.gold);for(const x of [-23.95,-23.3])for(const z of [-2.75,-.15])box(x,.33,z,.12,.22,.12,C.gold);box(-23.62,1.09,-1.45,1.05,.18,3.1,C.green);box(-24.11,1.49,-1.45,.11,.78,3.2,C.white);
  feetTable(group,colliders,-20.2,-1.45,2.1,1.25,C.gold,.93);box(-20.2,1.04,-1.45,2.21,.12,1.34,C.ivory);G.vessel(group,-20.2,1.12,-1.45,C.sage,.45);chairAt(-18.45,-1.35,-Math.PI/2,C.sage);
  // East rear: formal dining room, service sideboard and set porcelain covers.
  G.rug(group,21,-10.0,6.1,5.0,C.sage,C.gold);feetTable(group,colliders,21,-10.2,3.6,1.75,C.gold,1.02);box(21,1.13,-10.2,3.71,.13,1.86,C.ivory);cameraBox(21,.84,-10.2,3.71,1.17,1.86);
  for(const x of [19.9,21,22.1])for(const z of [-10.68,-9.74]){plate(group,x,1.198,z,C.white,.23);G.box(group,x+.32,1.207,z,.023,.018,.31,C.gold);G.box(group,x+.32,1.208,z-.14,.047,.019,.10,C.gold);cup(group,x-.37,1.197,z+(z<-10.2?-.10:.10),C.white);}
  for(const x of [19.8,21.0,22.2]){chairAt(x,-8.65,Math.PI,C.sage);chairAt(x,-12.25,0,C.sage);}
  block(24.2,.85,-10.2,.88,1.17,3.91,C.white);box(24.2,1.51,-10.2,1.04,.13,4.03,C.gold);for(let i=0;i<5;i++)plate(group,24.2,1.578+i*.025,-9.2,C.ivory,.29);G.vessel(group,24.2,1.62,-11.4,C.sage,.55);
  // Music reception: sculpted piano, gilt stools, a mirror and portrait console.
  G.rug(group,21,-1.5,5.8,6.3,C.sage,C.gold);
  reserveBlock(22.7,.97,-3.35,2.7,1.15,2.6);grandPiano(22.7,-3.35);
  reserveBlock(22.7,.58,-.85,1.53,.60,.75);pianoBench(22.7,-.85);
  chairAt(18.63,.88,-Math.PI/2,C.green);chairAt(21,1.35,Math.PI,C.sage);urn(19.05,-5.10,.65);
  const musicMirror=local(24.73,.2,-Math.PI/2);mirror(musicMirror,0,3.15,0,1.6,2.5);
  // Supported pastry boards follow the adults' separate working positions.
  box(-6.43,1.285,-10.62,.22,.03,.30,C.gold);box(-5.46,1.285,-9.67,.60,.03,.40,C.gold);
  bread(group,-5.56,1.33,-9.75,.22);bread(group,-6.39,1.33,-10.68,.18);
  // Entire estate is designed: long axial promenade, four formal garden rooms,
  // twin reflecting pools, rose beds, perimeter lime allees, benches and urns.
  box(0,.019,25.5,7.6,.038,26,C.ivory);box(0,.020,-24,8,.040,21,C.ivory);
  for(const s of [-1,1]){
    box(s*20,.023,20,14,.043,30,0xe1e5d2);box(s*15,.023,-25,21,.043,17,0xe1e5d2);
    for(const z of [21.2,32.1])for(const x of [s*11,s*21.3]){
      const w=7.2,d=7.0;box(x,.08,z,w,.10,d,0x8fa878);
      for(const zz of [z-d/2,z+d/2])hedge(x,zz,w,.39);for(const xx of [x-w/2,x+w/2])hedge(xx,z,.39,d);
      for(let k=0;k<8;k++){let a=k*Math.PI/4;G.sphere(group,x+Math.sin(a)*1.7,.67,z+Math.cos(a)*1.7,.36,k%2?C.white:C.sage,1.4,.55,1.4);}
      G.vessel(group,x,.20,z,C.ivory,.9);G.sphere(group,x,1.40,z,.62,C.green,1,1,1);G.collider(colliders,x,z,1.1,1.1);
    }
    const px=s*12.2,pz=-25.3;block(px,.22,pz,8.4,.43,9.2,C.ivory);box(px,.465,pz,7.75,.08,8.55,0x9cc4b2);for(const z of [pz-4.25,pz+4.25])box(px,.54,z,8.35,.14,.22,C.gold);
    for(const z of [-33,-17.5,10,18.5,27,35]){
      const x=s*27.3;G.cyl(group,x,1.77,z,.16,.25,3.3,0x928e68,10);G.box(group,x,3.75,z,2.45,2.2,2.45,C.green);G.box(group,x,4.91,z,2.05,.23,2.05,0x6b8c5c);G.collider(colliders,x,z,1.1,1.1);
    }
    for(const z of [19.4,27.2,-19.6,-33.2]){
      // The former front bench crossed the parterre hedge; the rear bench
      // enclosed a potted lime. Put both on clear paths and at sitting height.
      const x=s*5.15,q=assembly(local(x,z),'Royal garden stone bench','garden-bench');
      for(const zz of[-1.03,1.03])G.box(q,0,.15,zz,.80,.26,.32,C.ivory);
      G.box(q,0,.43,0,.88,.34,2.86,C.ivory);G.box(q,0,.645,0,.93,.10,2.94,C.sage);G.box(q,s*.415,1.00,0,.12,.81,2.98,C.white);
      q.userData.supportY=.02;q.userData.seatTopLocal=.695;
      G.collider(colliders,x,z,.95,2.98);cameraBox(x,.7125,z,.95,1.385,2.98);
      group.userData.gardenBenches??=[];group.userData.gardenBenches.push({id:`france-garden-bench-${s}-${z}`,name:'宫苑石长椅',center:[x,0,z],anchor:[x-s*.27,0,z],position:[x-s*1.10,0,z],yaw:-s*Math.PI/2,seatY:.695,size:[.95,1.405,2.98],cameraStyle:'garden-bench',cameraParts:[{minX:x-.465,maxX:x+.465,minY:.02,maxY:.70,minZ:z-1.49,maxZ:z+1.49},{minX:x+(s<0?-.475:.355),maxX:x+(s<0?-.355:.475),minY:.595,maxY:1.405,minZ:z-1.49,maxZ:z+1.49}]});
    }
    for(const z of [36.9,-36.9])urn(s*3.1,z,.8);
  }
  // Gilt garden lamps sit on existing bench-back footprints; no new collision.
  for(const s of [-1,1])for(const z of [19.4,27.2,-19.6,-33.2]){const x=s*5.565;G.cyl(group,x,1.49,z,.035,.055,.25,C.gold,8);G.mesh(group,new THREE.BoxGeometry(.23,.32,.23),C.ivory,x,1.78,z,{emissive:0xffbb65,emissiveIntensity:.55});G.box(group,x,1.96,z,.32,.05,.32,C.gold);registerNightFixture(group,x,1.78,z,{kind:'garden-lamp',color:0xffd398,intensity:12,distance:9});}
  // Gate piers and low white/green railings close the 60 x 80 footprint.
  for(const x of [-29.5,29.5]){block(x,.56,0,.36,1.08,79,C.ivory);for(let z=-38;z<39;z+=1.5)box(x,1.26,z,.15,.42,.15,C.gold);box(x,1.50,0,.16,.08,78,C.green);}
  for(const z of [-39.5,39.5])for(const s of [-1,1]){block(s*16.7,.56,z,25.6,1.08,.36,C.ivory);box(s*16.7,1.50,z,25.7,.08,.16,C.green);}
  for(const x of [-3.7,3.7])for(const z of [-39.3,39.3]){block(x,1.50,z,.93,3,.93,C.white);G.vessel(group,x,3.05,z,C.gold,.8);}
  explorationTargets.push({id:'royal-bath',name:'白金沐浴室与盥洗间',position:[-20.2,.23,-8.8]},{id:'orangery',name:'冬季柑橘暖房',position:[-21,.23,.6]},{id:'dining-room',name:'皇家瓷器餐厅',position:[18.0,.23,-10]},{id:'music-room',name:'绿锦音乐接待厅',position:[19.2,.23,-1.3]},{id:'west-service-gallery',name:'西翼服务柱廊',position:[-14,.23,-9.5]},{id:'east-state-gallery',name:'东翼仪典柱廊',position:[14,.23,-5]},{id:'south-promenade',name:'王宫入场大道',position:[0,0,32]},{id:'west-rose-garden',name:'西玫瑰花园游径',position:[-16,0,26]},{id:'east-rose-garden',name:'东玫瑰花园游径',position:[16,0,26]},{id:'north-pools',name:'北侧水镜花园主轴',position:[0,0,-27]},{id:'north-gate',name:'北门长景',position:[0,0,-36]});
  group.userData.interiorRooms.push({id:'royal-bath',name:'白金沐浴室',minX:-25,maxX:-17,minZ:-13.5,maxZ:-6.6,ceiling:5.25},{id:'orangery',name:'冬季柑橘暖房',minX:-25,maxX:-17,minZ:-6.6,maxZ:3.5,ceiling:5.25},{id:'dining-room',name:'皇家瓷器餐厅',minX:17,maxX:25,minZ:-13.5,maxZ:-6.6,ceiling:5.25},{id:'music-room',name:'绿锦音乐接待厅',minX:17,maxX:25,minZ:-6.6,maxZ:3.5,ceiling:5.25});
  group.userData.facilities=[{kind:'entry/reception',location:'front portico, state gallery, music reception'},{kind:'cooking',location:'west rear royal pastry kitchen'},{kind:'dining',location:'east rear formal dining room with6covers; garden tea loggia'},{kind:'sleeping',location:'east front canopy bedroom'},{kind:'bathing/toilet',location:'west rear service wing; tub, washbasin, screenedWC, towels'},{kind:'storage',location:'bath linen cabinet, kitchen cabinets, salon library, dining sideboard'},{kind:'service circulation',location:'kitchen to west service gallery to bath/orangery; bedroom/art wing to east dining/music wing'}];

  // Spatially separate static batches so the palace, wings and distant garden
  // rooms can be frustum-culled independently in the enlarged estate.
  function packPalaceChunks(root,skip=null){
    root.updateMatrixWorld(true);const pieces=[];root.traverse(o=>{if(o.isMesh){let inSkip=false;for(let p=o;p;p=p.parent)if(p===skip)inSkip=true;if(!inSkip)pieces.push(o);}});
    const chunks=new Map();
    for(const mesh of pieces){const center=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());const key=`${Math.floor(center.x/10)},${Math.floor(center.z/10)}`;let chunk=chunks.get(key);if(!chunk){chunk=new THREE.Group();chunk.name=`Royal estate spatial batch ${key}`;root.add(chunk);chunks.set(key,chunk);}chunk.attach(mesh);}
    for(const chunk of chunks.values())packStatic(chunk);
  }
  // Retain a compact semantic inventory for offline assembly/contact tests.
  group.updateMatrixWorld(true);
  group.userData.furnitureRevision='R11-sculpted-rocaille-french-furniture';
  group.userData.furnitureAssemblies=furniture.map(q=>{const b=new THREE.Box3().setFromObject(q);return {name:q.name,kind:q.userData.furnitureKind,min:b.min.toArray(),max:b.max.toArray()};});
  if(pack){packPalaceChunks(roofGroup);packPalaceChunks(group,roofGroup);}
  return {group,colliders,cameraColliders,spawn:[0,0,32],stations,roofGroup,walkableSurfaces,explorationTargets,doorways,bounds};
}
