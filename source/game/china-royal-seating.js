import * as THREE from 'three';
import * as G from './geometry.js';

// Original, solid-backed Chinese palace seating prototype.
// Visual study: mareasia, SGLY t182446, actual creator interior images
// aimg_1388676 / aimg_1388680, viewed 2026-10-03. No source assets copied. No imported model, image,
// texture, or traced ornament. Shapes are authored in metres, facing local +Z.
// Geometry is assembled directly into one vertex-coloured mesh per furniture
// instance. The cache is invalidated when the palace packer/lot owner disposes
// a shared geometry, so subsequent lot builds never retain stale GPU resources.
export const CHINA_ROYAL_SEATING_VERSION = 2;
export const CHINA_ROYAL_CHAIR_SEAT_TOP = .675;
const PALETTES = {
  hall: {wood:0x56382d, raised:0x834d33, lacquer:0x97392f, gold:0xd7ad59, silk:0x9b3a37, border:0x28595b, thread:0xe6c984},
  reading: {wood:0x604634, raised:0x886548, lacquer:0x517d70, gold:0xbea36a, silk:0x648c7b, border:0x3b5953, thread:0xd7d7aa},
  throne: {wood:0x512f28, raised:0x873e2d, lacquer:0x9d392b, gold:0xd8ad52, silk:0xc29846, border:0x84392b, thread:0xf3dc9c}
};
const templates = new Map();
const point = p => new THREE.Vector3(...p);
const transform = (x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1) => new THREE.Matrix4().compose(
  new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)), new THREE.Vector3(sx,sy,sz));
const boundsOf = b => ({minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});

function assembly(palette) {
  const positions=[],normals=[],colors=[],members=[];
  function add(name, source, color, matrix=new THREE.Matrix4(), camera=false) {
    let geo=source;
    if(geo.index){geo=source.toNonIndexed();source.dispose();}
    geo.applyMatrix4(matrix);
    if(!geo.attributes.normal)geo.computeVertexNormals();
    const p=geo.attributes.position,n=geo.attributes.normal,vc=geo.attributes.color,c=new THREE.Color(color),start=positions.length/9,mirrored=matrix.determinant()<0;
    for(let k=0;k<p.count;k++){
      // Bake mirrored members with outward triangle winding as well as normals.
      const i=mirrored?Math.floor(k/3)*3+[0,2,1][k%3]:k;
      positions.push(p.getX(i),p.getY(i),p.getZ(i));
      normals.push(n.getX(i),n.getY(i),n.getZ(i));
      colors.push(c.r*(vc?vc.getX(i):1),c.g*(vc?vc.getY(i):1),c.b*(vc?vc.getZ(i):1));
    }
    geo.computeBoundingBox();
    members.push({name,triangles:p.count/3,firstTriangle:start,bounds:boundsOf(geo.boundingBox),camera});
    geo.dispose();
  }
  function box(name,x,y,z,w,h,d,color=palette.wood,camera=true){add(name,new THREE.BoxGeometry(w,h,d),color,transform(x,y,z),camera);}
  function extrusion(name,shape,depth,color=palette.wood,matrix=new THREE.Matrix4(),camera=true,bevel=.008){
    const geo=new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:7,bevelEnabled:bevel>0,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel});
    geo.translate(0,0,-depth/2);add(name,geo,color,matrix,camera);
  }
  function tube(name,points,r,color=palette.gold,camera=false,segments=24){
    const curve=new THREE.CatmullRomCurve3(points.map(point),false,'centripetal');
    add(name,new THREE.TubeGeometry(curve,segments,r,6,false),color);
    if(camera){
      // Segment proxies follow the solid curved rail without filling its cavity.
      for(let i=0;i<6;i++){
        const b=new THREE.Box3();for(let j=0;j<=4;j++)b.expandByPoint(curve.getPoint((i+j/4)/6));b.expandByScalar(r);
        members.push({name:name+' camera segment '+(i+1),triangles:0,firstTriangle:positions.length/9,bounds:boundsOf(b),camera:true});
      }
    }
  }
  function finish(){
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geo.computeBoundingBox();geo.computeBoundingSphere();
    geo.userData={chinaRoyalSeating:true,version:CHINA_ROYAL_SEATING_VERSION};
    return {geometry:geo,members,bounds:boundsOf(geo.boundingBox),triangles:positions.length/9};
  }
  return {add,box,extrusion,tube,finish,palette};
}

function roundedRect(w,h,r) {
  const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);s.closePath();return s;
}

function cloudShape(w,h) {
  const s=new THREE.Shape();
  s.moveTo(-w*.48,-h*.28);s.bezierCurveTo(-w*.62,-h*.10,-w*.47,h*.26,-w*.24,h*.14);
  s.bezierCurveTo(-w*.27,h*.53,w*.17,h*.63,w*.25,h*.21);
  s.bezierCurveTo(w*.51,h*.36,w*.66,-h*.03,w*.43,-h*.24);
  s.quadraticCurveTo(w*.16,-h*.46,0,-h*.26);s.quadraticCurveTo(-w*.23,-h*.46,-w*.48,-h*.28);s.closePath();return s;
}

function cloudCutout(cx,cy,w,h) {
  // A through-cut, with continuous curved walls and genuine rear faces.
  const s=cloudShape(w,h),path=new THREE.Path();
  for(const [i,p]of s.getPoints(8).entries())i?path.lineTo(p.x+cx,p.y+cy):path.moveTo(p.x+cx,p.y+cy);
  path.closePath();return path;
}

// A shallow ribbon is a carved silhouette with crisp edges, not a raised pipe.
function carvedRibbon(a,name,points,width,z,color,scale=1) {
  const curve=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,0)),false,'centripetal');
  const left=[],right=[],count=Math.max(24,points.length*5);
  for(let i=0;i<=count;i++){
    const t=i/count,p=curve.getPoint(t),v=curve.getTangent(t),r=width*(.40+.60*Math.sin(Math.PI*t)**.35)/2;
    left.push([p.x-v.y*r,p.y+v.x*r]);right.push([p.x+v.y*r,p.y-v.x*r]);
  }
  const sh=new THREE.Shape();for(const[i,v]of [...left,...right.reverse()].entries())i?sh.lineTo(...v):sh.moveTo(...v);sh.closePath();
  a.extrusion(name,sh,.018*scale,color,transform(0,0,z),false,.002*scale);
}
function reliefShape(a,name,points,z,color,depth=.018){
  const sh=new THREE.Shape();for(const[i,v]of points.entries())i?sh.lineTo(...v):sh.moveTo(...v);sh.closePath();
  a.extrusion(name,sh,depth,color,transform(0,0,z),false,.003);
}
function cloudRelief(a,name,x,y,z,s=1,color=a.palette.gold) {
  // Open ruyi scroll: two interlocking hooks with long, tapering cloud tails.
  const points=[[-.15,-.022],[-.075,-.023],[-.113,.024],[-.080,.066],[-.034,.047],[0,.085],[.057,.065],[.075,.025],[.044,-.014],[.115,-.014],[.151,-.045]];
  carvedRibbon(a,name,points.map(([xx,yy])=>[x+xx*s,y+yy*s]),.027*s,z,color,s);
  carvedRibbon(a,name+' lower carved return',[[-.13,-.065],[-.038,-.065],[.017,-.049],[.096,-.071]].map(([xx,yy])=>[x+xx*s,y+yy*s]),.018*s,z,color,s);
}

function cushion(a,{name,w,d,bottom,top,z=0}) {
  const p=a.palette,thickness=top-bottom;
  const solid=new THREE.ExtrudeGeometry(roundedRect(w,d,.045),{depth:thickness,steps:1,curveSegments:7,bevelEnabled:false});
  solid.translate(0,0,-thickness/2);solid.rotateX(Math.PI/2);solid.translate(0,(bottom+top)/2,z);
  const body=solid.index?solid.toNonIndexed():solid,bodyP=[],bodyN=[];
  for(let i=0;i<body.attributes.position.count;i+=3){
    if(body.attributes.normal.getY(i)>.9)continue;
    for(let j=0;j<3;j++){const k=i+j;bodyP.push(body.attributes.position.getX(k),body.attributes.position.getY(k),body.attributes.position.getZ(k));bodyN.push(body.attributes.normal.getX(k),body.attributes.normal.getY(k),body.attributes.normal.getZ(k));}
  }
  if(body!==solid)body.dispose();solid.dispose();
  const openBody=new THREE.BufferGeometry();openBody.setAttribute('position',new THREE.Float32BufferAttribute(bodyP,3));openBody.setAttribute('normal',new THREE.Float32BufferAttribute(bodyN,3));
  a.add(name+' rounded supported cushion sides and underside',openBody,p.silk,new THREE.Matrix4(),true);
  // Three adjoining planar fabric regions give crisp rectangular tailoring.
  // Their holes share exact edges; no coplanar overlays or dense paint grid.
  const topSurface=(label,shape,color)=>{const geo=new THREE.ShapeGeometry(shape,7);geo.rotateX(-Math.PI/2);geo.translate(0,top,z);a.add(name+' '+label,geo,color);};
  const ring=(outerW,outerD,innerW,innerD,outerR,innerR)=>{const sh=roundedRect(outerW,outerD,outerR);sh.holes.push(new THREE.Path(roundedRect(innerW,innerD,innerR).getPoints(7)));return sh;};
  topSurface('outer gilt woven edge',ring(w,d,w-.048,d-.048,.045,.040),p.gold);
  topSurface('silk contrasting border',ring(w-.048,d-.048,w-.112,d-.112,.040,.030),p.border);
  topSurface('level woven silk',roundedRect(w-.112,d-.112,.030),p.silk);
  // Few crisp flat woven knots remain legible at the game's camera distance.
  const knotCountX=w>1?5:2,knotCountZ=d>1?3:2;
  for(let iz=0;iz<knotCountZ;iz++)for(let ix=0;ix<knotCountX;ix++){
    const xx=(ix-(knotCountX-1)/2)*(w-.26)/knotCountX,zz=(iz-(knotCountZ-1)/2)*(d-.23)/knotCountZ;
    const sh=new THREE.Shape(),r=w>1?.052:.042;sh.moveTo(0,r);sh.lineTo(r,0);sh.lineTo(0,-r);sh.lineTo(-r,0);sh.closePath();
    const knot=new THREE.ShapeGeometry(sh);knot.rotateX(-Math.PI/2);knot.translate(xx,top+.0002,zz+z);a.add(name+' flat silk woven knot '+ix+' '+iz,knot,p.thread);
  }
  const points=[],rw=w/2-.012,rd=d/2-.012,cr=.045;
  for(const [cx,cz,start]of[[rw-cr,rd-cr,0],[-rw+cr,rd-cr,Math.PI/2],[-rw+cr,-rd+cr,Math.PI],[rw-cr,-rd+cr,Math.PI*1.5]]){
    for(let i=0;i<=5;i++){const t=start+i*Math.PI/10;points.push([cx+Math.cos(t)*cr,(bottom+top)/2,cz+Math.sin(t)*cr+z]);}
  }
  points.push(points[0]);a.tube(name+' inset piping',points,.010,p.gold,false,48);
}

function chairBack(a) {
  const p=a.palette,s=new THREE.Shape();
  s.moveTo(-.35,.55);s.lineTo(-.395,1.32);s.quadraticCurveTo(-.43,1.45,-.375,1.47);
  s.bezierCurveTo(-.29,1.45,-.29,1.58,-.19,1.55);s.quadraticCurveTo(-.075,1.56,0,1.625);
  s.quadraticCurveTo(.075,1.56,.19,1.55);s.bezierCurveTo(.29,1.58,.29,1.45,.375,1.47);
  s.quadraticCurveTo(.43,1.45,.395,1.32);s.lineTo(.35,.55);s.closePath();
  // Tall pierced side splats leave the central load-bearing splat intact.
  for(const side of[-1,1]){
    const h=new THREE.Path();h.moveTo(side*.17,.77);h.bezierCurveTo(side*.245,.72,side*.285,.85,side*.282,.96);
    h.lineTo(side*.30,1.28);h.quadraticCurveTo(side*.30,1.39,side*.235,1.43);
    h.quadraticCurveTo(side*.205,1.38,side*.15,1.39);h.lineTo(side*.14,1.04);h.quadraticCurveTo(side*.12,.87,side*.17,.77);h.closePath();s.holes.push(h);
  }
  a.extrusion('Joined pierced cloud crest and structural back splats',s,.10,p.wood,transform(0,0,-.344),false,.006);
  a.extrusion('Inlaid central back panel',roundedRect(.228,.55,.06),.017,p.lacquer,transform(0,1.12,-.281),false,.004);
  a.extrusion('Finished rear back panel',roundedRect(.24,.52,.045),.014,p.raised,transform(0,1.12,-.405),false,.003);
  a.tube('Crest carved gilt lip',[[-.376,1.449,-.282],[-.285,1.487,-.282],[-.227,1.523,-.282],[-.12,1.527,-.282],[0,1.594,-.282],[.12,1.527,-.282],[.227,1.523,-.282],[.285,1.487,-.282],[.376,1.449,-.282]],.014,p.gold,false,28);
  cloudRelief(a,'Central cloud back medallion',0,1.22,-.260,.64);
  cloudRelief(a,'Lower pierced back tie',0,.89,-.260,.47);
}

function makeChair(variant) {
  const a=assembly(PALETTES[variant]),p=a.palette;
  a.extrusion('Rounded hardwood seat rim',roundedRect(.805,.765,.067),.09,p.wood,transform(0,.56,0,Math.PI/2),true,.005);
  cushion(a,{name:'Inset silk seat',w:.732,d:.690,bottom:.605,top:CHINA_ROYAL_CHAIR_SEAT_TOP});
  // Cabriole silhouettes have actual thickness and meet both apron and floor.
  for(const side of[-1,1])for(const z of[-.292,.292]){
    const s=new THREE.Shape();s.moveTo(.272,.54);s.lineTo(.369,.54);s.bezierCurveTo(.378,.43,.323,.32,.328,.16);
    s.quadraticCurveTo(.33,.07,.394,.045);s.lineTo(.394,0);s.lineTo(.279,0);s.quadraticCurveTo(.282,.10,.279,.20);
    s.quadraticCurveTo(.274,.38,.272,.54);s.closePath();
    a.extrusion((side<0?'Left':'Right')+(z<0?' rear':' front')+' curved foot and leg',s,.094,p.wood,transform(0,0,z,0,0,0,side,1,1),true,.003);
  }
  const apron=new THREE.Shape();apron.moveTo(-.36,.553);apron.lineTo(.36,.553);apron.lineTo(.36,.34);
  apron.quadraticCurveTo(.26,.33,.23,.402);apron.quadraticCurveTo(.17,.462,.105,.425);apron.quadraticCurveTo(0,.34,-.105,.425);
  apron.quadraticCurveTo(-.17,.462,-.23,.402);apron.quadraticCurveTo(-.26,.33,-.36,.34);apron.closePath();
  a.extrusion('Joined scalloped front apron',apron,.060,p.raised,transform(0,0,.313),true,.005);
  cloudRelief(a,'Front apron cloud carving',0,.469,.350,.55);
  for(const side of[-1,1]){
    a.extrusion((side<0?'Left':'Right')+' joined scalloped side apron',apron,.05,p.raised,transform(side*.326,0,0,0,Math.PI/2,0,.88,1,1),true,.004);
    a.box('Lower side stretcher '+side,side*.307,.175,0,.055,.060,.596,p.wood);
    a.tube('Continuous curved arm rail '+side,[[side*.345,1.19,-.34],[side*.377,1.125,-.20],[side*.379,1.043,.04],[side*.367,1.027,.225],[side*.346,1.006,.262]],.037,p.wood,true,28);
    a.tube('Carved arm lip '+side,[[side*.352,1.205,-.30],[side*.380,1.141,-.20],[side*.382,1.063,.04],[side*.369,1.049,.212]],.010,p.gold,false,20);
    const support=new THREE.Shape();support.moveTo(.145,.588);support.lineTo(.25,.588);support.quadraticCurveTo(.25,.79,.273,.923);
    support.quadraticCurveTo(.30,1.049,.211,1.041);support.quadraticCurveTo(.13,1.017,.17,.931);
    support.quadraticCurveTo(.211,.90,.225,.956);support.quadraticCurveTo(.179,.80,.145,.588);support.closePath();
    a.extrusion('Carved cloud front arm support '+side,support,.075,p.raised,transform(side*.356,0,0,0,-Math.PI/2),true,.004);
  }
  a.box('Rear lower cross stretcher',0,.175,-.297,.64,.060,.055,p.wood);
  chairBack(a);return a.finish();
}

function throneBack(a) {
  const p=a.palette,s=new THREE.Shape();
  s.moveTo(-1.565,1.20);s.lineTo(-1.61,2.71);s.quadraticCurveTo(-1.62,2.90,-1.40,2.88);
  s.bezierCurveTo(-1.24,2.85,-1.23,3.08,-.98,3.035);s.quadraticCurveTo(-.78,2.99,-.65,3.10);
  s.quadraticCurveTo(-.34,3.05,-.18,3.18);s.quadraticCurveTo(0,3.255,.18,3.18);
  s.quadraticCurveTo(.34,3.05,.65,3.10);s.quadraticCurveTo(.78,2.99,.98,3.035);
  s.bezierCurveTo(1.23,3.08,1.24,2.85,1.40,2.88);s.quadraticCurveTo(1.62,2.90,1.61,2.71);
  s.lineTo(1.565,1.20);s.closePath();
  for(const side of[-1,1]){
    s.holes.push(cloudCutout(side*1.075,2.52,.55,.42));
    const h=new THREE.Path();h.moveTo(side*.82,1.62);h.lineTo(side*1.35,1.62);h.lineTo(side*1.38,2.03);
    h.quadraticCurveTo(side*1.18,2.24,side*.98,2.12);h.quadraticCurveTo(side*.82,2.04,side*.82,1.62);h.closePath();s.holes.push(h);
  }
  a.extrusion('Joined pierced crown and dragon back frame',s,.184,p.wood,transform(0,0,-.782),false,.013);
  const field=new THREE.Shape();field.moveTo(-.65,1.45);field.lineTo(.65,1.45);field.lineTo(.65,2.63);
  field.quadraticCurveTo(.64,2.88,.40,2.87);field.quadraticCurveTo(0,3.08,-.40,2.87);field.quadraticCurveTo(-.64,2.88,-.65,2.63);field.closePath();
  a.extrusion('Imperial lacquer central back field',field,.044,p.lacquer,transform(0,0,-.658),false,.01);
  a.tube('Continuous carved crown lip',[[-1.54,2.77,-.664],[-1.35,2.81,-.664],[-1.15,2.99,-.664],[-.98,2.97,-.664],[-.67,3.036,-.664],[-.39,3.035,-.664],[0,3.19,-.664],[.39,3.035,-.664],[.67,3.036,-.664],[.98,2.97,-.664],[1.15,2.99,-.664],[1.35,2.81,-.664],[1.54,2.77,-.664]],.030,p.gold,false,40);
  for(const side of[-1,1]){
    a.tube('Back-frame fluted upright '+side,[[side*1.50,1.34,-.669],[side*1.51,1.98,-.669],[side*1.53,2.62,-.669]],.024,p.gold,false,12);
    cloudRelief(a,'Back openwork tie cloud '+side,side*1.07,2.235,-.647,1.45);
  }
  // The dragon is carved as broad tapered relief silhouettes. Four bent
  // limbs, a toothed dorsal mane, antlers and a long whiskered jaw establish
  // the animal at play distance without covering the back in tiny ornaments.
  const zz=-.598,body=[[-.44,1.74],[-.24,1.80],[.34,1.89],[.45,2.09],[.21,2.25],[-.33,2.22],[-.44,2.44],[-.18,2.60],[.12,2.58]];
  carvedRibbon(a,'Tapered coiling dragon body',body,.135,zz,p.gold);
  carvedRibbon(a,'Dragon pale belly carve',[[-.39,1.738],[-.21,1.765],[.34,1.854],[.485,2.088],[.23,2.207],[-.30,2.183],[-.472,2.43],[-.18,2.562],[.10,2.543]],.023,zz+.023,p.thread);
  // Joined pointed ridge follows the upper curve, not detached floating scales.
  reliefShape(a,'Dragon swept dorsal mane',[[.10,2.645],[-.04,2.705],[-.12,2.662],[-.22,2.716],[-.26,2.656],[-.36,2.66],[-.35,2.597],[-.45,2.62],[-.445,2.55],[-.525,2.534],[-.479,2.466],[-.42,2.49],[-.32,2.57],[-.16,2.638]],zz,p.raised);
  reliefShape(a,'Dragon swept tail flame',[[-.44,1.74],[-.57,1.65],[-.58,1.75],[-.68,1.74],[-.60,1.82],[-.62,1.90],[-.49,1.83],[-.34,1.81]],zz,p.gold);
  const legs=[{p:[[-.29,2.44],[-.36,2.30],[-.58,2.38]],sign:-1},{p:[[.04,2.60],[.04,2.76],[.29,2.78]],sign:1},{p:[[.30,2.00],[.47,1.85],[.60,1.94]],sign:1},{p:[[-.05,1.84],[-.20,1.68],[-.02,1.59]],sign:1}];
  for(const[i,l]of legs.entries()){
    carvedRibbon(a,'Dragon carved bent limb '+i,l.p,.056,zz+.024,p.gold);
    const[x,y]=l.p.at(-1);
    for(const delta of[-.065,0,.065])carvedRibbon(a,'Dragon spreading talon '+i+' '+delta,[[x-l.sign*.04,y],[x+l.sign*.055,y+delta],[x+l.sign*.095,y+delta-.018]],.018,zz+.028,p.thread);
  }
  reliefShape(a,'Dragon neck and cheek',[[.025,2.55],[.075,2.71],[.17,2.76],[.27,2.71],[.31,2.62],[.18,2.55]],zz+.031,p.gold,.055);
  reliefShape(a,'Dragon angular brow and long jaw',[[.17,2.72],[.285,2.737],[.313,2.69],[.447,2.661],[.463,2.594],[.354,2.57],[.265,2.606],[.17,2.594]],zz+.06,p.gold,.055);
  reliefShape(a,'Dragon split open mouth',[[.284,2.615],[.443,2.612],[.446,2.594],[.334,2.590]],zz+.097,p.wood,.006);
  reliefShape(a,'Dragon sloping eye',[[.23,2.687],[.289,2.693],[.282,2.665],[.246,2.658]],zz+.103,p.wood,.008);
  for(const offset of[-.02,.11]){
    carvedRibbon(a,'Dragon branched antler '+offset,[[.10+offset,2.704],[.071+offset,2.834],[.125+offset,2.895]],.024,zz+.024,p.gold);
    carvedRibbon(a,'Dragon antler branch '+offset,[[.073+offset,2.807],[.019+offset,2.832]],.018,zz+.024,p.gold);
  }
  reliefShape(a,'Dragon swept cheek fins',[[.173,2.668],[.081,2.72],[.107,2.65],[.004,2.648],[.095,2.601],[.022,2.548],[.169,2.578]],zz+.043,p.raised);
  carvedRibbon(a,'Dragon long upper whisker',[[.417,2.653],[.52,2.718],[.59,2.681]],.017,zz+.10,p.thread);
  carvedRibbon(a,'Dragon long lower whisker',[[.40,2.590],[.49,2.527],[.558,2.544]],.017,zz+.10,p.thread);
  reliefShape(a,'Dragon chin beard',[[.276,2.591],[.322,2.53],[.271,2.548],[.262,2.486],[.225,2.557]],zz+.04,p.gold);
  cloudRelief(a,'Lower throne-back cloud',0,1.64,-.601,1.65);
  a.extrusion('Finished rear throne inset',roundedRect(1.38,1.28,.15),.012,p.raised,transform(0,2.17,-.88),false,.002);
}

function dragonArm(a,side) {
  const p=a.palette,x=side*1.385;
  a.tube('Sculpted dragon arm body '+side,[[x,2.15,-.745],[side*1.41,2.10,-.49],[side*1.42,1.925,-.13],[side*1.405,1.93,.23],[x,2.018,.50]],.101,p.raised,true,32);
  a.tube('Joined dragon gold dorsal ridge '+side,[[x,2.225,-.72],[side*1.42,2.17,-.46],[side*1.43,2.01,-.10],[side*1.41,2.02,.24],[x,2.105,.50]],.032,p.gold,false,28);
  // Angular cheek, squared muzzle and brows read as carved dragon heads;
  // the arm endings are not oval knobs with separate beaks.
  const skull=new THREE.Shape();skull.moveTo(-.123,-.07);skull.lineTo(-.142,.045);skull.lineTo(-.098,.13);skull.lineTo(-.025,.113);skull.lineTo(0,.145);skull.lineTo(.025,.113);skull.lineTo(.098,.13);skull.lineTo(.142,.045);skull.lineTo(.123,-.07);skull.lineTo(.068,-.105);skull.lineTo(-.068,-.105);skull.closePath();
  a.extrusion('Sculpted dragon angular cheek '+side,skull,.20,p.gold,transform(x,2.037,.52),false,.014);
  a.extrusion('Squared long dragon snout '+side,roundedRect(.215,.106,.022),.206,p.gold,transform(x,1.998,.693),false,.01);
  a.extrusion('Separated lower dragon jaw '+side,roundedRect(.179,.036,.011),.172,p.raised,transform(x,1.928,.688),false,.005);
  for(const edge of[-1,1]){
    a.box('Dragon raised brow '+side+' '+edge,x+edge*.082,2.097,.624,.073,.04,.035,p.raised,false);
    a.box('Dragon narrow eye '+side+' '+edge,x+edge*.082,2.071,.642,.038,.018,.012,p.wood,false);
    a.box('Dragon nostril '+side+' '+edge,x+edge*.058,2.019,.810,.03,.019,.008,p.wood,false);
    a.tube('Dragon antler '+side+' '+edge,[[x+edge*.076,2.139,.49],[x+edge*.094,2.265,.42],[x+edge*.122,2.308,.385]],.020,p.gold,false,12);
    a.tube('Dragon antler fork '+side+' '+edge,[[x+edge*.090,2.240,.41],[x+edge*.145,2.275,.38]],.018,p.gold,false,5);
    a.tube('Dragon whisker '+side+' '+edge,[[x+edge*.084,1.997,.781],[x+edge*.136,2.025,.76],[x+edge*.133,2.075,.683]],.014,p.thread,false,12);
    reliefShape(a,'Dragon swept cheek blade '+side+' '+edge,[[x+edge*.10,2.065],[x+edge*.177,2.088],[x+edge*.145,2.017],[x+edge*.177,1.975],[x+edge*.115,1.977]],.515,p.raised,.054);
  }
  const support=new THREE.Shape();support.moveTo(-.14,1.23);support.lineTo(.14,1.23);support.quadraticCurveTo(.17,1.40,.09,1.57);
  support.quadraticCurveTo(.01,1.75,.14,1.96);support.lineTo(-.11,1.96);support.quadraticCurveTo(-.24,1.73,-.11,1.54);support.quadraticCurveTo(-.03,1.37,-.14,1.23);support.closePath();
  a.extrusion('Joined dragon front arm support '+side,support,.16,p.wood,transform(x,0,.49),true,.01);
  a.tube('Dragon support carved vein '+side,[[x,1.25,.582],[x-.022,1.46,.582],[x-.063,1.66,.582],[x+.04,1.91,.582]],.022,p.gold,false,18);
}

function makeThrone() {
  const a=assembly(PALETTES.throne),p=a.palette;
  // Same 3.3 × 1.7 base, touching the existing dais at local .36. The existing
  // hall owns that dais and its routes; this builder never alters navigation.
  a.extrusion('Throne broad stepped foot plinth',roundedRect(3.27,1.67,.08),.14,p.wood,transform(0,.43,0,Math.PI/2),true,.006);
  a.extrusion('Throne gilt plinth bead',roundedRect(3.19,1.60,.07),.060,p.gold,transform(0,.525,0,Math.PI/2),true,.004);
  a.extrusion('Throne upper stepped plinth',roundedRect(3.08,1.49,.07),.09,p.raised,transform(0,.591,0,Math.PI/2),true,.004);
  for(const side of[-1,1])for(const z of[-.58,.58]){
    const s=new THREE.Shape();s.moveTo(1.23,1.28);s.lineTo(1.52,1.28);s.quadraticCurveTo(1.54,1.06,1.41,.89);
    s.quadraticCurveTo(1.36,.73,1.50,.63);s.lineTo(1.19,.63);s.quadraticCurveTo(1.26,.81,1.20,.98);s.lineTo(1.23,1.28);s.closePath();
    a.extrusion('Throne carved support foot '+side+' '+z,s,.24,p.wood,transform(0,0,z,0,0,0,side,1,1),true,.012);
  }
  const apron=new THREE.Shape();apron.moveTo(-1.46,1.27);apron.lineTo(1.46,1.27);apron.lineTo(1.46,.78);
  apron.quadraticCurveTo(1.12,.76,.99,.95);apron.quadraticCurveTo(.73,1.08,.58,.92);apron.quadraticCurveTo(0,.67,-.58,.92);
  apron.quadraticCurveTo(-.73,1.08,-.99,.95);apron.quadraticCurveTo(-1.12,.76,-1.46,.78);apron.closePath();
  a.extrusion('Throne joined scalloped front apron',apron,.135,p.raised,transform(0,0,.678),true,.009);
  for(const x of[-.89,0,.89])cloudRelief(a,'Throne front apron carving '+x,x,1.082,.767,x?1.45:1.9);
  for(const side of[-1,1])a.box('Throne structural side apron '+side,side*1.43,1.073,0,.13,.36,1.21,p.raised);
  a.extrusion('Throne rounded seat frame',roundedRect(3.09,1.52,.11),.14,p.wood,transform(0,1.285,0,Math.PI/2),true,.007);
  cushion(a,{name:'Imperial gold brocade',w:2.535,d:1.395,bottom:1.355,top:1.49,z:.007});
  throneBack(a);for(const side of[-1,1])dragonArm(a,side);return a.finish();
}

function template(key) {
  if(templates.has(key))return templates.get(key);
  const t=key==='throne'?makeThrone():makeChair(key);
  t.geometry.addEventListener('dispose',()=>{if(templates.get(key)===t)templates.delete(key);});templates.set(key,t);return t;
}

function instantiate(parent,key,{x,y,z,yaw,id}) {
  const t=template(key),root=new THREE.Group();root.name=key==='throne'?'正殿 · 双龙雕云宝座':key==='reading'?'静宜寝殿 · 青锦雕云阅读椅':'正殿 · 朱锦雕云扶手椅';
  root.position.set(x,y,z);root.rotation.y=yaw;parent?.add(root);
  const mesh=new THREE.Mesh(t.geometry,G.material(0xffffff,{vertexColors:true}));mesh.name=root.name+' / joined carved solid and woven silk';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  root.userData.furnitureKind=key==='throne'?'throne':'chair';root.userData.seatTopLocal=key==='throne'?1.49:CHINA_ROYAL_CHAIR_SEAT_TOP;
  root.userData.royalSeating={version:CHINA_ROYAL_SEATING_VERSION,id,original:true,variant:key,frontAxis:'+Z',colliderFootprint:key==='throne'?[3.3,1.7]:[.9,.9],seatTopLocal:root.userData.seatTopLocal,meshCount:1,triangles:t.triangles,localBounds:{...t.bounds},members:t.members.map(v=>({...v,bounds:{...v.bounds}})),geometryShared:true,disposal:'Shared geometry invalidates its template cache on dispose; compatible with packStatic and whole-lot disposal',backFaces:true,throughCutOpenwork:true};
  return root;
}

/** Drop-in China-only chair. Its .675 contact height is relative to y (default .2). */
export function buildChinaRoyalChair(parent,{x=0,y=.2,z=0,yaw=0,variant='hall',id='china-royal-chair'}={}) {
  if(!['hall','reading'].includes(variant))throw new Error('Unknown China chair variant: '+variant);
  return instantiate(parent,variant,{x,y,z,yaw,id});
}

/** Hall-local builder. Keep the old dais/screen and the two old collider boxes. */
export function buildChinaDragonThrone(parent,{x=0,y=0,z=-8,yaw=0,id='china-dragon-throne'}={}) {
  return instantiate(parent,'throne',{x,y,z,yaw,id});
}

/** A low, central wooden footrest supports the high ceremonial throne pose. */
export function buildChinaThroneFootrest(parent,{x=0,y=0,z=-7.05}={}){
  const q=new THREE.Group();q.name='正殿御座 · 雕木脚踏';q.position.set(x,y,z);parent.add(q);
  const p=PALETTES.throne;
  for(const xx of[-.46,.46])for(const zz of[-.34,.34])G.box(q,xx,.566,zz,.13,.412,.13,p.wood);
  const top=new THREE.ExtrudeGeometry(roundedRect(1.16,.94,.045),{depth:.070,curveSegments:5,bevelEnabled:false});top.rotateX(-Math.PI/2);G.mesh(q,top,p.raised,0,.760,0);
  for(const xx of[-.542,.542])G.box(q,xx,.832,0,.022,.004,.85,p.gold);
  for(const zz of[-.432,.432])G.box(q,0,.832,zz,1.06,.004,.022,p.gold);
  G.box(q,0,.722,.387,.91,.090,.065,p.wood);
  G.box(q,0,.480,.625,1.16,.240,.31,p.wood);
  G.box(q,0,.592,.625,1.16,.016,.31,p.raised);
  q.userData={furnitureKind:'footrest',topLocal:.834,throneSupport:true};return q;
}
