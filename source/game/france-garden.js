import * as G from './geometry.js?rev=R7-20261002';
const {THREE:T}=G;
const P={iron:0x365c4a,ironLight:0x69816a,wood:0xb9a07a,woodLight:0xd5bf94,gold:0xc7aa61,bark:0x827258,leaf:0x4e754d,light:0x72915c,dark:0x355e45,flower:0xf1eddb};
const named=(mesh,name)=>{mesh.name=name;return mesh;};
function sweep(q,points,r,color,name,steps=18){return named(G.mesh(q,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),steps,r,6,false),color),name);}
function rod(q,a,b,r1,r2,color,name){const from=new T.Vector3(...a),to=new T.Vector3(...b),m=named(G.cyl(q,0,0,0,r2,r1,from.distanceTo(to),color,7),name);m.position.copy(from.add(to).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(new T.Vector3(...a)).normalize());return m;}
function roundedSlat(q,x,y,z,w,h,d,c,name){const shape=new T.Shape(),r=Math.min(.028,h*.28);shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const geo=new T.ExtrudeGeometry(shape,{depth:d,steps:1,curveSegments:3,bevelEnabled:false});return named(G.mesh(q,geo,c,x,y,z-d/2),name);}

// Original slatted garden bench. Local +Z faces the walk; the entire assembly
// stays inside the previous 2.98 x .95 footprint and .695 m support height.
export function addRoyalGardenBench(parent,side=1){
  const q=new T.Group();q.name='Open scroll iron and timber garden bench';q.rotation.y=-side*Math.PI/2;parent.add(q);
  for(const x of[-1.20,1.20]){
    for(const z of[-.34,.33]){
      sweep(q,[[x,.065,z],[x,.20,z*.75],[x,.44,z*.58],[x,.60,z*.73],[x,.65,z]],.042,P.iron,'Curved cast iron leg',15);
      roundedSlat(q,x,.06,z,.20,.08,.12,P.iron,'Flared iron foot');
    }
    sweep(q,[[x,.59,.38],[x,.61,.12],[x,.62,-.15],[x,.75,-.34],[x,1.09,-.40],[x,1.36,-.425]],.048,P.iron,'Seat bearer joined to back stile',20);
    sweep(q,[[x,.40,.22],[x,.29,.06],[x,.37,-.12],[x,.52,-.23]],.027,P.ironLight,'Open lower scroll brace',14);
    sweep(q,[[x,.32,.03],[x,.41,.10],[x,.47,.035],[x,.41,-.015]],.026,P.iron,'Small inward brace curl',12);
  }
  // The seat retains full support at the existing anchor; gaps remain visible.
  for(let i=0;i<5;i++)roundedSlat(q,0,.656, -.365+i*.18,2.84,.078,.15,i%2?P.wood:P.woodLight,'Timber seat slat '+i);
  // A slender front bead reaches the original front extent without a solid apron.
  roundedSlat(q,0,.626,.439,2.90,.065,.052,P.iron,'Joined front seat nosing');
  for(const [i,y]of[.864,1.048,1.232,1.365].entries()){
    const z=i===3?-.425:-.365-(y-.864)*.095;
    roundedSlat(q,0,y,z,i===3?2.98:2.88,i===3?.08:.134,.10,i%2?P.wood:P.woodLight,'Separated timber back slat '+i);
    for(const x of[-1.20,1.20]){const pin=G.cyl(q,x,y,z+.056,.012,.012,.015,P.gold,8);pin.rotation.x=Math.PI/2;pin.name='Slat through bolt';}
  }
  for(const x of[-1.40,1.40]){
    // Continuous arms roll down into the front leg bearers rather than float.
    sweep(q,[[x,.65,.31],[x,.83,.37],[x,.965,.25],[x,1.015,-.05],[x,1.006,-.30],[x,.93,-.39]],.043,P.iron,'Scrolled continuous armrest',23);
    sweep(q,[[x,.90,.31],[x,.91,.18],[x,.83,.16],[x,.79,.24],[x,.82,.28]],.027,P.ironLight,'Armrest inward volute',16);
    rod(q,[x,.66,-.30],[x,1.00,-.30],.032,.032,P.iron,'Arm back attachment');
    rod(q,[x,.655,.26],[Math.sign(x)*1.20,.62,.26],.035,.035,P.iron,'Arm-to-seat lateral joint');
  }
  roundedSlat(q,0,.39,-.22,2.48,.055,.06,P.iron,'Lower cross stretcher');
  q.userData={originalGardenAsset:true,seatY:.695,castIron:true,slatted:true};return q;
}

// Leaves are folded, pointed blades, batched per plant. Their open arrangement
// reveals actual branches; there are no spherical or box canopy fillers.
function leafBatch(){return{positions:[],colors:[],normals:[]};}
const broadLeafOutline=(()=>{const p=new T.Shape();p.moveTo(0,-.34);p.bezierCurveTo(-.18,-.54,-.49,-.42,-.50,-.13);p.bezierCurveTo(-.52,.12,-.26,.40,0,.51);p.bezierCurveTo(.27,.40,.51,.10,.50,-.13);p.bezierCurveTo(.48,-.42,.17,-.54,0,-.34);return p.getSpacedPoints(16).slice(0,-1);})();
function leaf(b,center,length,width,yaw,pitch,color,twist=0){
  const c=new T.Color(color),m=new T.Matrix4().makeRotationFromEuler(new T.Euler(pitch,yaw,twist,'YXZ')),local=[0,length*.065,0],ids=[],n=broadLeafOutline.length;
  for(const r of[.52,1])for(const v of broadLeafOutline){const x=v.x*width*r,z=v.y*length*r,y=length*(.065*(1-r*r)-.15*v.y*v.y*r*r);local.push(x,y,z);}
  for(let i=0;i<n;i++){const j=(i+1)%n;ids.push(0,1+i,1+j,1+i,1+n+i,1+j,1+j,1+n+i,1+n+j);}
  // Smooth normals over the shallow curved blade avoid a triangular shard look.
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(local,3));geo.setIndex(ids);geo.computeVertexNormals();const normals=geo.attributes.normal;
  for(const id of ids){const p=new T.Vector3(local[id*3],local[id*3+1],local[id*3+2]).applyMatrix4(m).add(new T.Vector3(...center)),normal=new T.Vector3().fromBufferAttribute(normals,id).transformDirection(m),shade=.97+.06*(local[id*3]/Math.max(width,.01)+.5);b.positions.push(p.x,p.y,p.z);b.normals.push(normal.x,normal.y,normal.z);b.colors.push(c.r*shade,c.g*shade,c.b*shade);}
  geo.dispose();
}
function foliage(q,b,name){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(b.colors,3));if(b.normals.length===b.positions.length)geo.setAttribute('normal',new T.Float32BufferAttribute(b.normals,3));else geo.computeVertexNormals();return named(G.mesh(q,geo,0xffffff,0,0,0,{vertexColors:true,side:T.DoubleSide}),name);}
function branchLeaves(b,end,scale,angle,seed){
  for(let j=0;j<13;j++){const a=angle+j*2.399,ring=j<4?.09:.29,dx=Math.sin(a)*ring*scale,dz=Math.cos(a)*ring*scale,dy=Math.sin(j*2.1+seed)*.22*scale;leaf(b,[end[0]+dx,end[1]+dy,end[2]+dz],(.53+.07*Math.sin(j+seed))*scale,(.53+.06*Math.cos(j*3+seed))*scale,a,Math.sin(j*1.71+seed)*.78,[P.leaf,P.light,P.dark][(j+seed)%3],Math.cos(j*2.3)*.45);}
}
export function addGardenTree(parent,x,z,{scale=1,base=0,seed=0}={}){
  const q=new T.Group();q.position.set(x,base,z);q.scale.setScalar(scale);q.rotation.y=seed*.81;q.name='Branched lime with open leaf sprays';parent.add(q);const b=leafBatch();
  for(const [a,end,r1,r2]of[[[0,0,0],[.035,1.3,.015],.16,.125],[[.035,1.3,.015],[-.04,2.3,.04],.125,.081],[[-.04,2.3,.04],[.08,3.1,0],.081,.044],[[.08,3.1,0],[.02,4.1,.02],.044,.012]])rod(q,a,end,r1,r2,P.bark,'Tapered bending lime trunk');
  for(const [i,r,y]of[[0,.82,2.5],[1,1.0,2.75],[2,.86,2.87],[3,1.04,3.14],[4,.89,3.40],[5,.68,3.61],[6,.86,3.76],[7,.52,4.0],[8,.30,4.27]]){
    const a=i*2.4+seed*.21,end=[Math.sin(a)*r,y,Math.cos(a)*r];
    const start=[.015,Math.max(1.7,y-.82),.015];sweep(q,[start,[end[0]*.30+Math.cos(a)*.12,y-.59,end[2]*.30-Math.sin(a)*.12],[end[0]*.74,y-.23,end[2]*.77],end],i<3?.053:.036,P.bark,'Visible rising lime branch '+i,9);
    const tip=[end[0]+Math.cos(a)*.22,y+.23,end[2]-Math.sin(a)*.22];rod(q,[end[0]*.68,y-.2,end[2]*.68],tip,.022,.009,P.bark,'Forked terminal twig '+i);branchLeaves(b,end,.96,a,i+seed);branchLeaves(b,tip,.65,a+.6,i+seed+1);
  }
  foliage(q,b,'Layered lime leaf canopy');q.userData.originalGardenAsset=true;return q;
}
function blossom(b,center,r,angle,color){
  const normal=new T.Vector3(Math.sin(angle)*.35,.91,Math.cos(angle)*.24).normalize(),quat=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal),c=new T.Color(color);
  const point=(radius,a,y)=>new T.Vector3(Math.sin(a)*radius,y,Math.cos(a)*radius).applyQuaternion(quat).add(new T.Vector3(...center));
  for(let layer=0;layer<2;layer++)for(let p=0;p<5;p++){
    const a=p*Math.PI*2/5+layer*.68,rr=r*(layer?.59:1),cy=layer*.022,root=point(rr*.06,a,cy),tip=point(rr,a,cy+.034),left=point(rr*.76,a-.48,cy+.009),right=point(rr*.76,a+.48,cy+.009),shoulderL=point(rr*.96,a-.25,cy+.025),shoulderR=point(rr*.96,a+.25,cy+.025);
    for(const v of[root,left,shoulderL,root,shoulderL,tip,root,tip,shoulderR,root,shoulderR,right]){b.positions.push(v.x,v.y,v.z);b.colors.push(c.r*(layer?1:.92),c.g*(layer?1:.92),c.b*(layer?1:.92));}
  }
  const gold=new T.Color(0xc6ab59);for(let i=0;i<5;i++)for(const v of[point(0,0,.038),point(r*.17,i*Math.PI*2/5,.038),point(r*.17,(i+1)*Math.PI*2/5,.038)]){b.positions.push(v.x,v.y,v.z);b.colors.push(gold.r,gold.g,gold.b);}
}
export function addFlowerShrub(parent,x,z,{scale=1,base=.13,seed=0}={}){
  const q=new T.Group();q.position.set(x,base,z);q.scale.setScalar(scale);q.rotation.y=seed*.71;q.name='Open white rose shrub';parent.add(q);const leaves=leafBatch(),flowers=leafBatch();
  for(let i=0;i<7;i++){
    const a=i*2.399+seed*.11,r=i?.20+.055*(i%3):.05,h=.45+.075*(i%3),end=[Math.sin(a)*r,h,Math.cos(a)*r];
    rod(q,[0,0,0],end,.018,.009,P.dark,'Branching rose cane');
    for(let j=0;j<3;j++){const t=.36+j*.22,side=j%2?1:-1,mid=[end[0]*t+Math.cos(a)*side*.10,h*t,end[2]*t-Math.sin(a)*side*.10];leaf(leaves,mid,.29,.20,a+side*.75,-.35,[P.dark,P.leaf,P.light][(i+j)%3]);}
    blossom(flowers,[end[0],h+.025,end[2]],.15+(i%2)*.025,a,i%3?P.flower:0xe1e5ce);
  }
  foliage(q,leaves,'Folded rose leaves');foliage(q,flowers,'Layered five-petal rose heads');q.userData.originalGardenAsset=true;return q;
}
export function addGardenHedge(parent,x,z,w,d){
  const q=new T.Group();q.name='Clipped boxwood with broken leafy edges';q.position.set(x,0,z);parent.add(q);const horizontal=w>=d,long=Math.max(w,d),short=Math.min(w,d),steps=Math.ceil(long/.38),pos=[],idx=[],leaves=leafBatch();
  // A shaped dark heart keeps formal hedges legible at distance. Alternating
  // leaf sprays soften its clipped profile without spilling into the paths.
  const ringSize=8;
  for(let i=0;i<=steps;i++){
    const along=-long/2+long*i/steps,h=.60+.085*Math.sin(i*1.8),width=short*(.35+.045*Math.sin(i*2.7));
    for(const [across,y]of[[-width*.68,.09],[-width,.30],[-width*.94,h-.10],[-width*.43,h+.026],[width*.39,h+.047],[width*.88,h-.06],[width,.26],[width*.71,.09]])pos.push(horizontal?along:across,y,horizontal?across:along);
    if(i)for(let j=0;j<ringSize-1;j++){const a=(i-1)*ringSize+j,b=a+ringSize;idx.push(a,a+1,b,a+1,b+1,b);}
    if(i<steps)for(let k=0;k<18;k++){
      const p=along+long/steps*(.16+(k%4)*.22),side=k%2?1:-1,cross=side*short*(k<6?.14:.31),y=k<6?h+.04:.20+Math.floor((k-6)/4)*.18,length=Math.min(.31,long/steps*.86),center=horizontal?[p,y,cross]:[cross,y,p];
      leaf(leaves,center,length,short*.68,(horizontal?Math.PI/2:0)+(k%3-1)*.3,k<6?Math.sin(i+k)*.55:side*1.13,[P.leaf,P.light,P.dark][(i+k)%3]);
    }
  }
  for(const end of[0,steps]){const base=end*ringSize;for(let j=1;j<ringSize-1;j++)idx.push(base,base+j,base+j+1);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();named(G.mesh(q,geo,P.dark,0,0,0,{side:T.DoubleSide}),'Contoured boxwood heart');foliage(q,leaves,'Small boxwood edge sprays');q.userData.originalGardenAsset=true;return q;
}
