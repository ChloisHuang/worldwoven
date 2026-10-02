import * as G from './geometry.js?rev=R7-20261002';
const { THREE } = G;

// Original geometry only: tapering branch skeletons and individually notched,
// five-petal flowers. No texture cards, downloaded assets, or canopy colliders.
const TAU = Math.PI * 2;
const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const P = { bark:0x65443e, barkLight:0x885d53, twig:0x925f57,
  petal:0xffe5e8, blush:0xe5a4b7, center:0xbb6d87, pollen:0xf1ca82,
  vermilion:0xb84437, redLight:0xd06447, black:0x343b36, gold:0xc59d67 };
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
function rng(seed) { let n=(finite(seed,7319)>>>0)||7319;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;}; }
function vertex(out, p, color) { out.p.push(...p);out.c.push(color.r,color.g,color.b); }
function triangle(out, a, b, c, color) { vertex(out,a,color);vertex(out,b,color);vertex(out,c,color); }
function geometryOf(out) { const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(out.p,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(out.c,3));geo.computeVertexNormals();geo.computeBoundingSphere();return geo; }
function addTransformed(out, geo, matrix, color) {
  const p=geo.attributes.position,index=geo.index,v=new THREE.Vector3();
  const total=index?index.count:p.count;
  for(let i=0;i<total;i++){v.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(matrix);vertex(out,v.toArray(),color);}
}
function branch(out, a, b, r0, r1, color=P.bark, sides=7) {
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A),len=delta.length();if(len<1e-6)return;
  const overlap=[P.bark,P.barkLight,P.twig].includes(color)?Math.min(r0*.4,.065):0;
  const geo=new THREE.CylinderGeometry(r1,r0,len+overlap*2,sides,1,false);
  const m=new THREE.Matrix4().compose(A.add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(Y,delta.normalize()),new THREE.Vector3(1,1,1));
  addTransformed(out,geo,m,new THREE.Color(color));geo.dispose();
}
function staticMesh(parent,out,name) { const m=new THREE.Mesh(geometryOf(out),G.material(0xffffff,{vertexColors:true}));m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }

// One petal: a softly cupped ten-edge fan with a visible heart-notch at the tip.
// Geometry faces local +Z and occupies a unit radius about the bloom centre.
let BLOOM_GEOMETRY, PETAL_GEOMETRY, BUD_GEOMETRY;
function singlePetalGeometry() {
  if(PETAL_GEOMETRY)return PETAL_GEOMETRY;
  const out={p:[],c:[]},edge=[[0,.08,0],[-.25,.29,.006],[-.35,.63,.009],[-.29,.87,.012],[-.12,1,.016],[0,.92,.019],[.12,1,.016],[.29,.87,.012],[.35,.63,.009],[.25,.29,.006]],hub=[0,.45,.037];
  for(let i=0;i<edge.length;i++){vertex(out,hub,new THREE.Color(P.blush));vertex(out,edge[(i+1)%edge.length],new THREE.Color(P.petal));vertex(out,edge[i],new THREE.Color(P.petal));}
  PETAL_GEOMETRY=geometryOf(out);return PETAL_GEOMETRY;
}
function bloomGeometry() {
  if(BLOOM_GEOMETRY)return BLOOM_GEOMETRY;
  const out={p:[],c:[]},petal=singlePetalGeometry(),m=new THREE.Matrix4();
  for(let i=0;i<5;i++){
    m.makeRotationZ(i*TAU/5);const pos=petal.attributes.position,col=petal.attributes.color,v=new THREE.Vector3();
    for(let j=0;j<pos.count;j++){v.fromBufferAttribute(pos,j).applyMatrix4(m);out.p.push(v.x,v.y,v.z);out.c.push(col.getX(j),col.getY(j),col.getZ(j));}
  }
  for(let i=0;i<8;i++){const a=i*TAU/8,b=(i+1)*TAU/8;triangle(out,[0,0,.075],[Math.cos(a)*.19,Math.sin(a)*.19,.07],[Math.cos(b)*.19,Math.sin(b)*.19,.07],new THREE.Color(P.center));}
  for(let i=0;i<5;i++){const a=i*TAU/5+.3;triangle(out,[Math.cos(a-.1)*.07,Math.sin(a-.1)*.07,.091],[Math.cos(a)*.32,Math.sin(a)*.32,.092],[Math.cos(a+.1)*.07,Math.sin(a+.1)*.07,.091],new THREE.Color(P.pollen));}
  BLOOM_GEOMETRY=geometryOf(out);return BLOOM_GEOMETRY;
}
function budsGeometry(){return BUD_GEOMETRY??=(new THREE.IcosahedronGeometry(1,0));}
function instances(parent,geo,entries,name,material){
  const mesh=new THREE.InstancedMesh(geo,material??G.material(0xffffff,{vertexColors:true,side:THREE.DoubleSide}),entries.length),dummy=new THREE.Object3D();mesh.name=name;
  entries.forEach((e,i)=>{dummy.position.copy(e.p);dummy.quaternion.copy(e.q);dummy.scale.setScalar(e.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(e.color)mesh.setColorAt(i,new THREE.Color(e.color));});
  mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();parent.add(mesh);return mesh;
}
function stats(group){let drawMeshes=0,triangles=0,instances=0;group.traverse(m=>{if(m.isMesh){drawMeshes++;const n=m.isInstancedMesh?m.count:1;instances+=m.isInstancedMesh?m.count:0;triangles+=((m.geometry.index?.count??m.geometry.attributes.position.count)/3)*n;}});return {drawMeshes,expandedTriangles:triangles,instances};}

export function createSakuraTree({height=8.6,spread=7,seed=7319}={}) {
  height=clamp(finite(height,8.6),3,12);spread=clamp(finite(spread,7),2.6,11);
  const random=rng(seed),group=new THREE.Group(),wood={p:[],c:[]},blooms=[],buds=[];
  group.name='Sakura · open branched flowering cherry';const h=height,rx=spread/2;
  const V=(x,y,z)=>[x*rx,y*h,z*rx];
  const trunk=[V(0,0,0),V(.02,.16,-.01),V(-.055,.32,.018),V(.025,.48,.025),V(-.018,.64,-.015),V(.06,.8,.01),V(.025,.92,-.04)];
  for(let i=1;i<trunk.length;i++)branch(wood,trunk[i-1],trunk[i],(.265-(i-1)*.036)*h/8.6,(.235-(i-1)*.039)*h/8.6,i%2?P.bark:P.barkLight,8);
  for(let i=0;i<5;i++){const a=i*TAU/5+.3;branch(wood,[0,.14,0],[Math.cos(a)*.61*h/8.6,.035,Math.sin(a)*.61*h/8.6],.15*h/8.6,.025*h/8.6,P.bark,7);}
  function blossomCluster(point,normal,n=7,scale=1){
    const p=new THREE.Vector3(...point),dir=new THREE.Vector3(...normal).normalize();
    for(let j=0;j<n;j++){
      const angle=j*2.399+random()*.28,r=j===0?.06:.19+random()*.28;
      const offset=new THREE.Vector3(Math.cos(angle)*r,(random()-.35)*.36,Math.sin(angle)*r);
      const center=p.clone().add(offset),norm=dir.clone().multiplyScalar(.56).add(new THREE.Vector3((random()-.5)*1.4,.25+random()*.55,(random()-.5)*1.4)).normalize();
      const q=new THREE.Quaternion().setFromUnitVectors(Z,norm);q.multiply(new THREE.Quaternion().setFromAxisAngle(Z,random()*TAU));
      blooms.push({p:center,q,s:(.15+random()*.065)*scale,color:[0xffffff,0xffe7ee,0xf5c9da,0xfff1e8][Math.floor(random()*4)]});
      if(j===0){branch(wood,point,center.toArray(),.017*scale,.009*scale,P.twig,5);}
    }
    buds.push({p:p.clone().add(new THREE.Vector3(.17,.14,-.08)),q:new THREE.Quaternion(),s:.047*scale});
  }
  // Irregular tiered limbs, open between clusters: blossom silhouettes never use spheres.
  for(let i=0;i<9;i++){
    const angle=i*2.399+.23,level=.33+i*.032,reach=(.64+(i%3)*.105)*(i>6?.87:1),up=.2+(i%3)*.029;
    const root=V(-.025,level,.01),elbow=V(Math.cos(angle)*reach*.43,level+up*.56,Math.sin(angle)*reach*.43),tip=V(Math.cos(angle)*reach,level+up,Math.sin(angle)*reach);
    const r=(.132-i*.006)*h/8.6;branch(wood,root,elbow,r,r*.6,P.bark,7);branch(wood,elbow,tip,r*.6,r*.23,P.barkLight,7);
    for(let j=0;j<3;j++){
      const t=.43+j*.245,start=new THREE.Vector3(...elbow).lerp(new THREE.Vector3(...tip),t),aa=angle+(j-1)*.7+(random()-.5)*.25;
      const end=start.clone().add(new THREE.Vector3(Math.cos(aa)*rx*(.16+random()*.06),h*(.055+random()*.045),Math.sin(aa)*rx*(.16+random()*.06)));
      branch(wood,start.toArray(),end.toArray(),.034*h/8.6,.013*h/8.6,P.twig,6);
      for(let k=0;k<2;k++){
        const bb=aa+(k?-.62:.57),terminal=end.clone().add(new THREE.Vector3(Math.cos(bb)*rx*.105,h*(k?.025:.05),Math.sin(bb)*rx*.105));
        branch(wood,end.toArray(),terminal.toArray(),.014*h/8.6,.006*h/8.6,P.twig,5);
        blossomCluster(terminal.toArray(),[Math.cos(bb),.5,Math.sin(bb)],6,h/8.6);
      }
      blossomCluster(end.toArray(),[Math.cos(aa),.6,Math.sin(aa)],2,h/8.6);
    }
  }
  // Fine crown, lifted into the third-floor corridor's sight line.
  const crown=trunk[trunk.length-1];
  for(let i=0;i<5;i++){const a=i*TAU/5+.25,end=V(.025+Math.cos(a)*.24,.95+random()*.027,-.04+Math.sin(a)*.24);branch(wood,crown,end,.036,.007,P.twig,6);blossomCluster(end,[Math.cos(a),.8,Math.sin(a)],6,h/8.6);}
  staticMesh(group,wood,'Sakura tapered trunk, limbs and fine twigs');
  instances(group,bloomGeometry(),blooms,'Sakura individual five-petal blossoms');
  instances(group,budsGeometry(),buds,'Sakura unopened rose buds',G.material(0xc97c97));
  group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group,true),r=.39*h/8.6;
  const localColliders=[{minX:-r,maxX:r,minY:0,maxY:h*.31,minZ:-r,maxZ:r}];
  const metadata={...stats(group),seed,height,spread,blossomCount:blooms.length,budCount:buds.length,
    extents:{minX:box.min.x,maxX:box.max.x,minY:box.min.y,maxY:box.max.y,minZ:box.min.z,maxZ:box.max.z},
    colliderFootprint:localColliders[0],canopyColliders:false,design:'Original notched five-petal sakura; visible open branch structure'};
  group.userData.sakura=metadata;return {group,localColliders,metadata};
}

export function createPetalFall({bounds={},count=72,seed=1955}={}) {
  const b={minX:finite(bounds.minX,-4),maxX:finite(bounds.maxX,4),minY:finite(bounds.minY,.15),maxY:finite(bounds.maxY,8.5),minZ:finite(bounds.minZ,-4),maxZ:finite(bounds.maxZ,4)};
  for(const axis of ['X','Y','Z']){if(b['max'+axis]<b['min'+axis])[b['min'+axis],b['max'+axis]]=[b['max'+axis],b['min'+axis]];if(b['max'+axis]-b['min'+axis]<.04)b['max'+axis]=b['min'+axis]+.04;}
  count=clamp(Math.floor(finite(count,72)),0,96);const group=new THREE.Group();group.name='Sakura · sparse petal fall';
  const material=G.material(0xffe5eb,{vertexColors:true,side:THREE.DoubleSide}),mesh=new THREE.InstancedMesh(singlePetalGeometry(),material,count);
  mesh.name='Budgeted falling petals';mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;group.add(mesh);
  const random=rng(seed),particles=Array.from({length:count},()=>({u:random(),v:random(),phase:random(),spin:random()*TAU,size:.065+random()*.052,harmonic:1+Math.floor(random()*2)})),dummy=new THREE.Object3D(),cycleSeconds=28;
  let elapsed=0;function update(dt=0,time){
    if(Number.isFinite(time))elapsed=((time%cycleSeconds)+cycleSeconds)%cycleSeconds;else elapsed=(elapsed+clamp(finite(dt,0),0,.25))%cycleSeconds;
    const t=elapsed/cycleSeconds;for(let i=0;i<count;i++){const p=particles[i],phase=(t+p.phase)%1,a=TAU*(t*p.harmonic+p.phase),fade=Math.min(1,phase/.07,(1-phase)/.07),w=b.maxX-b.minX,d=b.maxZ-b.minZ;
      dummy.position.set(b.minX+w*(.08+p.u*.84+Math.sin(a)*.055),b.maxY-phase*(b.maxY-b.minY),b.minZ+d*(.08+p.v*.84+Math.cos(a*2)*.055));
      dummy.rotation.set(a*2+p.spin,Math.sin(a)*.85,a+p.spin);dummy.scale.setScalar(p.size*Math.max(0,fade));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }mesh.instanceMatrix.needsUpdate=true;
  }update(0,0);const metadata={count,drawMeshes:1,expandedTriangles:count*10,cycleSeconds,bounds:b,maxPetalsPerEmitter:96};group.userData.sakura=metadata;
  return {group,update,metadata};
}

export function addSakuraMotif(parent,{x=0,y=0,z=0,size=.85,orientation='front'}={}) {
  const group=new THREE.Group();group.name='Sakura · carved blossom motif';group.position.set(finite(x,0),finite(y,0),finite(z,0));size=Math.max(.01,finite(size,.85));
  if(Array.isArray(orientation))group.rotation.set(...orientation.map(a=>finite(a,0)));
  else if(typeof orientation==='number')group.rotation.y=orientation;
  else if(orientation==='floor')group.rotation.x=-Math.PI/2;
  else if(orientation==='ceiling')group.rotation.x=Math.PI/2;
  else if(orientation==='east'||orientation==='side')group.rotation.y=Math.PI/2;
  else if(orientation==='west')group.rotation.y=-Math.PI/2;
  else if(orientation==='back')group.rotation.y=Math.PI;
  // Lift the entire inlay along its own surface normal. Branch backs remain
  // in front of the supplied receiving plane, including horizontal tableware.
  group.translateZ(.025*size);
  const wood={p:[],c:[]},bloom=[],path=[[-.42,-.32,0],[-.19,-.16,0],[.02,.08,0],[.19,.32,0]];
  for(let i=1;i<path.length;i++)branch(wood,path[i-1],path[i],.018-i*.002,.015-i*.003,0x8b5c54,5);
  for(const [a,b] of [[[.02,.08,0],[.34,.15,0]],[[-.19,-.16,0],[-.36,.13,0]],[[-.04,0,0],[.1,-.22,0]]])branch(wood,a,b,.009,.003,0x8b5c54,5);
  for(const [xx,yy,ss,angle] of [[.19,.32,.125,.2],[.34,.15,.105,.9],[-.36,.13,.11,.6],[.1,-.22,.087,1.1],[-.17,-.13,.07,.4],[.0,.055,.077,1.5]])bloom.push({p:new THREE.Vector3(xx,yy,.027),q:new THREE.Quaternion().setFromAxisAngle(Z,angle),s:ss});
  staticMesh(group,wood,'Motif branch carving');instances(group,bloomGeometry(),bloom,'Motif five-petal inlay');group.scale.setScalar(size);parent.add(group);return group;
}

function prism(out,points,depth,color){
  const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1});addTransformed(out,geo,new THREE.Matrix4().makeTranslation(0,0,-depth/2),new THREE.Color(color));geo.dispose();
}
export function createTorii({width=4.6,height=4.0}={}) {
  width=clamp(finite(width,4.6),3.3,8);height=clamp(finite(height,4),3,6);const group=new THREE.Group(),out={p:[],c:[]};group.name='Torii · vermilion courtyard gate';
  const postX=width*.345,postR=width*.038,lowerY=height*.752,lowerH=height*.078,depth=width*.075;
  for(const side of [-1,1]){
    const x=side*postX,topX=x-side*width*.013;
    branch(out,[x,.08,0],[topX,height*.925,0],postR*1.08,postR*.82,P.vermilion,12);
    branch(out,[x,0,0],[x,height*.12,0],postR*1.24,postR*1.18,P.black,12);
    for(const [yy,rr,c] of [[height*.12,1.25,P.gold],[lowerY+.12,1.04,P.redLight],[height*.875,1.07,P.black]])branch(out,[x-side*width*.013*(yy/height),yy-.035,0],[x-side*width*.013*(yy/height),yy+.035,0],postR*rr,postR*rr,c,12);
  }
  const top=[],bottom=[];for(let i=0;i<=12;i++){const xx=-width/2+width*i/12,u=Math.abs(xx)/(width/2);top.push([xx,height-.015-height*.052*(1-u*u)]);bottom.unshift([xx,height-.015-height*.052*(1-u*u)-height*.072]);}
  // Give the black cap a real 22mm end overhang. Shared end planes with
  // the red body otherwise create positive-area vertex-colour depth clashes.
  const bodyScale=(width-.044)/width;
  prism(out,[...top,...bottom].map(([xx,yy])=>[xx*bodyScale,yy]),depth,P.vermilion);
  const capTop=top.map(([xx,yy])=>[xx,yy+.015]),capBottom=[...top].reverse().map(([xx,yy])=>[xx,yy-height*.025]);prism(out,[...capTop,...capBottom],depth*1.13,P.black);
  const half=width*.444;prism(out,[[-half,lowerY-lowerH/2],[half,lowerY-lowerH/2],[half,lowerY+lowerH/2],[-half,lowerY+lowerH/2]],depth*.62,P.vermilion);
  for(const side of [-1,1]){
    const xx=side*postX;prism(out,[[xx-.18,lowerY+.01],[xx+.18,lowerY+.01],[xx+.17,lowerY+.13],[xx-.17,lowerY+.1]],depth*.9,P.redLight);
  }
  // A small solid central tablet hangs above the human-clear aperture.
  // Seat the tablet 10mm into the nuki instead of retaining opposed
  // coincident faces at its hidden lower joint.
  prism(out,[[-width*.057,lowerY+lowerH/2-.01],[width*.057,lowerY+lowerH/2-.01],[width*.061,height*.92],[-width*.061,height*.92]],depth*.28,P.black);
  staticMesh(group,out,'Torii posts, curved lintel, nuki and joinery');
  addSakuraMotif(group,{x:0,y:height*.852,z:depth*.17,size:width*.15,orientation:'front'});
  const postExtent=postR*1.24,localColliders=[];
  for(const side of [-1,1])localColliders.push({minX:side*postX-postExtent-width*.013,maxX:side*postX+postExtent+width*.013,minY:0,maxY:height*.925,minZ:-postExtent,maxZ:postExtent});
  const cameraColliders=[...localColliders.map(c=>({...c})),{minX:-half,maxX:half,minY:lowerY-lowerH/2,maxY:lowerY+lowerH/2,minZ:-depth*.31,maxZ:depth*.31},{minX:-width/2,maxX:width/2,minY:height*.848,maxY:height,minZ:-depth*.57,maxZ:depth*.57}];
  // Local collision for the lower crosspiece is height-bounded; never a filled gate wall.
  localColliders.push({...cameraColliders[2]});group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group,true);
  const metadata={...stats(group),width,height,aperture:{minX:-postX+postExtent+width*.013,maxX:postX-postExtent-width*.013,minY:0,maxY:lowerY-lowerH/2},extents:{minX:box.min.x,maxX:box.max.x,minY:box.min.y,maxY:box.max.y,minZ:box.min.z,maxZ:box.max.z},forwardAxis:'z',originalGeometry:true};
  group.userData.torii=metadata;return {group,localColliders,cameraColliders,metadata};
}
