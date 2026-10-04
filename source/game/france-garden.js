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

// Leaves are shallow curved, heart-shaped blades, batched per plant. Their open arrangement
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
function gardenRandom(seed){let n=seed>>>0;return()=>{n+=0x6d2b79f5;let t=Math.imul(n^n>>>15,1|n);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function branchLeaves(b,end,scale,angle,seed){
  const random=gardenRandom(seed*1771+91);
  for(let j=0;j<18;j++){
    // A loose 3D spray, with small leaves between the broad outer leaves.
    // Normals fan out through the crown instead of stacking parallel plates.
    const a=angle+j*2.399,vertical=1-2*(j+.5)/18,ring=Math.sqrt(1-vertical*vertical)*(.25+random()*.14),size=.34+random()*.22,dx=Math.sin(a)*ring*scale,dz=Math.cos(a)*ring*scale,dy=(vertical*.28+(random()-.5)*.09)*scale;
    leaf(b,[end[0]+dx,end[1]+dy,end[2]+dz],size*scale,size*(.83+random()*.20)*scale,a+.4*(random()-.5),(random()-.37)*2.0,[P.leaf,P.light,P.dark][Math.floor(random()*3)],(random()-.5)*1.2);
  }
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
  const count=6+seed%3,tier=(seed%3-1)*.035;
  for(let i=0;i<count;i++){
    const a=i*2.399+seed*.11,r=i?.19+.050*(i%3):.05,h=.43+.065*(i%3)+tier+.03*Math.sin(seed+i*1.9),end=[Math.sin(a)*r,h,Math.cos(a)*r];
    rod(q,[0,0,0],end,.018,.009,P.dark,'Branching rose cane');
    for(let j=0;j<3;j++){const t=.36+j*.22,side=j%2?1:-1,mid=[end[0]*t+Math.cos(a)*side*.10,h*t,end[2]*t-Math.sin(a)*side*.10];leaf(leaves,mid,.29,.20,a+side*.75,-.35,[P.dark,P.leaf,P.light][(i+j)%3]);}
    blossom(flowers,[end[0],h+.025,end[2]],.138+.034*((i+seed)%3)/2,a,i%3?P.flower:0xe1e5ce);
  }
  foliage(q,leaves,'Folded rose leaves');foliage(q,flowers,'Layered five-petal rose heads');q.userData.originalGardenAsset=true;return q;
}
// Boxwood has much smaller oval leaves than lime or rose. Eight shallow,
// smoothly shaded facets suffice at this scale; all blades share one mesh.
function boxwoodLeaf(b,center,length,width,normal,spin,color){
  const c=new T.Color(color),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...normal).normalize()),turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),spin),outline=[];
  const place=v=>v.applyQuaternion(turn).applyQuaternion(rotation);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;outline.push(new T.Vector3(Math.cos(a)*width/2,-length*.025,Math.sin(a)*length/2));}
  for(let i=0;i<8;i++)for(const v of[new T.Vector3(0,length*.045,0),outline[i],outline[(i+1)%8]]){
    const n=place(new T.Vector3(v.x/width*.20,1,v.z/length*.16).normalize()),p=place(v.clone()).add(new T.Vector3(...center));b.positions.push(p.x,p.y,p.z);b.normals.push(n.x,n.y,n.z);b.colors.push(c.r,c.g,c.b);
  }
}
export function addGardenHedge(parent,x,z,w,d){
  const q=new T.Group();q.name='Fine-leaved clipped boxwood';q.position.set(x,0,z);parent.add(q);const horizontal=w>=d,long=Math.max(w,d),short=Math.min(w,d),steps=Math.ceil(long/.38),pos=[],idx=[],leaves=leafBatch(),random=gardenRandom(Math.round((x+40)*971+(z+40)*3163)),colors=[0x517551,0x5d7f54,0x476d4b,0x64845a];
  const height=along=>.635+.016*Math.sin(along*4.7+x)+.010*Math.cos(along*8.3+z),ringSize=8;
  // The formal trim is continuous; individual small shoots vary in length,
  // angle and density. No rows of large leaves are pasted onto its sides.
  for(let i=0;i<=steps;i++){
    const along=-long/2+long*i/steps,h=height(along),width=short*(.325+.012*Math.sin(i*2.7));
    for(const [across,y]of[[-width*.72,.10],[-width,.28],[-width*.97,h-.09],[-width*.48,h],[width*.46,h+.008],[width*.97,h-.08],[width,.27],[width*.75,.10]])pos.push(horizontal?along:across,y,horizontal?across:along);
    if(i)for(let j=0;j<ringSize-1;j++){const a=(i-1)*ringSize+j,b=a+ringSize;idx.push(a,a+1,b,a+1,b+1,b);}
    if(i<steps)for(let k=0;k<90;k++){
      const alongPoint=along+long/steps*random(),top=k<28,side=k%2?1:-1,cross=top?(random()-.5)*short*.69:side*short*(.322+random()*.055),y=top?height(alongPoint)+.005+random()*.025:.14+random()*.46,length=.065+random()*.064,width=length*(.54+random()*.28),center=horizontal?[alongPoint,y,cross]:[cross,y,alongPoint],normal=top?[(random()-.5)*.9,1,(random()-.5)*.9]:horizontal?[(random()-.5)*.6,.10+random()*.75,side]:[side,.10+random()*.75,(random()-.5)*.6];
      boxwoodLeaf(leaves,center,length,width,normal,random()*Math.PI*2,colors[Math.floor(random()*colors.length)]);
    }
  }
  for(const end of[0,steps]){const base=end*ringSize;for(let j=1;j<ringSize-1;j++)idx.push(base,base+j,base+j+1);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();named(G.mesh(q,geo,0x466c49,0,0,0,{side:T.DoubleSide}),'Clipped rounded boxwood heart');foliage(q,leaves,'Fine mixed-size boxwood shoots');q.userData.originalGardenAsset=true;return q;
}
