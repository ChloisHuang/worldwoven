import {buildChinaRoyalChair} from './china-royal-seating.js';
import {residencePlaque} from './china-residence-lettering.js';

export const CONSORT_ROOM_PROGRAM=Object.freeze({
 reception:{minX:-20.9,maxX:-16,minZ:-12,maxZ:-7.8},corridor:{minX:-20.9,maxX:-19.2,minZ:-7.8,maxZ:2,clearWidth:1.29},
 rooms:[{key:'heng',name:'沈蘅',minZ:-7.8,maxZ:-3,doorZ:-4.65,bedZ:-6.3,color:0x52796f},{key:'ling',name:'令仪',minZ:-3,maxZ:2,doorZ:.3,bedZ:-1.55,color:0xbf805e}],bedSize:[1.55,2.4]
});

function privateBed(G,parent,{x,z,color,C}){
 const {THREE}=G,bed=new THREE.Group();bed.name='Original carved private bed';bed.position.set(x,.2,z);parent.add(bed);
 const rect=(w,h,r)=>{const q=new THREE.Shape(),a=-w/2,b=-h/2;q.moveTo(a+r,b);q.lineTo(a+w-r,b);q.quadraticCurveTo(a+w,b,a+w,b+r);q.lineTo(a+w,b+h-r);q.quadraticCurveTo(a+w,b+h,a+w-r,b+h);q.lineTo(a+r,b+h);q.quadraticCurveTo(a,b+h,a,b+h-r);q.lineTo(a,b+r);q.quadraticCurveTo(a,b,a+r,b);q.closePath();return q;};
 const panel=(shape,depth,c,x,y,z,bevel=.012)=>G.mesh(bed,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:6}),c,x,y,z);
 const soft=(name,x,y,z,w,h,d,c)=>{const b=Math.min(.03,h*.28),m=panel(rect(w-2*b,d-2*b,.065),h-2*b,c,x,y-h/2+b,z,b);m.rotation.x=-Math.PI/2;m.name=name;return m;};
 const stroke=(points,r=.008,c=C.gold)=>G.mesh(bed,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),18,r,5,false),c);
 for(const dx of[-.65,.65])for(const dz of[-1.05,1.05]){const foot=panel(rect(.14,.55,.018),.14,C.dark,dx,.295,dz-.07,.009);foot.name='Shaped timber bed foot';}
 soft('Bevelled timber bed frame',0,.585,0,1.55,.14,2.4,C.wood);soft('Soft rectangular mattress',0,.73,0,1.47,.16,2.32,0xefdfc0);soft('Woven rectangular quilt',0,.8325,.08,1.43,.045,2.04,color);soft('Rounded silk pillow',0,.87,-.93,.92,.10,.32,0xf1dfbd);
 for(const dx of[-.43,.43])soft('Pillow woven end band',dx,.876,-.93,.035,.102,.315,C.gold);
 const apron=new THREE.Shape();apron.moveTo(-.67,.03);apron.lineTo(.67,.03);apron.lineTo(.62,-.17);apron.quadraticCurveTo(.48,-.07,.31,-.17);apron.quadraticCurveTo(0,-.28,-.31,-.17);apron.quadraticCurveTo(-.48,-.07,-.62,-.17);apron.closePath();panel(apron,.055,C.dark,0,.51,1.17,.01);stroke([[-.61,.47,1.232],[-.43,.38,1.232],[0,.34,1.232],[.43,.38,1.232],[.61,.47,1.232]],.009);
 const head=new THREE.Shape();head.moveTo(-.755,-.57);head.lineTo(.755,-.57);head.lineTo(.755,.35);head.quadraticCurveTo(.66,.53,.39,.48);head.quadraticCurveTo(0,.69,-.39,.48);head.quadraticCurveTo(-.66,.53,-.755,.35);head.closePath();panel(head,.13,C.dark,0,1.08,-1.255,.014);panel(rect(1.26,.68,.09),.018,color,0,1.12,-1.106,.01);
 stroke([[-.65,.83,-1.075],[-.65,1.37,-1.075],[-.39,1.50,-1.075],[0,1.58,-1.075],[.39,1.50,-1.075],[.65,1.37,-1.075],[.65,.83,-1.075]],.012);
 stroke([[-.30,1.11,-1.072],[-.18,1.19,-1.072],[-.09,1.17,-1.072],[0,1.28,-1.072],[.12,1.18,-1.072],[.28,1.11,-1.072]],.014);
 for(const dx of[-.68,.68])stroke([[dx,.859,-.65],[dx,.859,.70],[dx*.92,.854,1.04]],.007);
 return bed;
}

// The existing east reception is deep enough for two proper bedchambers behind
// an independent corridor. No route passes through a bedroom or wet room.
export function buildChinaConsortRooms(G,{g,C,wall,privacy,part,table,teaSet,colliders,cameraColliders,additionalFurnitureSeats,explorationTargets}){
 const {THREE}=G,additionalFurniture=[],y=.215;
 part('residence-living','后宫一层公共会客前厅',-20.9,-16,-12,-7.8,y,3.77);
 part('residence-suite-corridor','后宫私室外走廊',-20.9,-19.2,-7.8,2,y,3.77);
 wall('x',-7.8,-19.2,-16,.2,3.77);wall('x',-3,-19.2,-16,.2,3.77);
 wall('z',-19.2,-7.8,2,.2,3.77,CONSORT_ROOM_PROGRAM.rooms.map(r=>privacy('cn-consort-'+r.key+'-door',r.name+'私室门','z',-19.2,r.doorZ-.675,r.doorZ+.675,y,['consort-'+r.key,'residence-suite-corridor'])),.50);
 G.rug(g,-17.5,-9.7,2.2,2.8,0x9d7b59,0xd6bd85);table(g,-17.5,-9.7,1.4,.68,.93);teaSet(g,-17.5,1.02,-9.7,0x93b0a4);
 for(const [id,z,yaw]of[['china-residence-reception-seat--7.2',-8.55,Math.PI],['china-residence-reception-seat--3.7',-10.85,0]]){
  const x=-17.5;buildChinaRoyalChair(g,{x,y:.2,z,yaw,variant:'reading',id});G.collider(colliders,x,z,.9,.9);cameraColliders.push({minX:x-.45,maxX:x+.45,minY:.2,maxY:2.0,minZ:z-.45,maxZ:z+.45});additionalFurnitureSeats.push({id,name:'后宫会客椅',x,y,z,yaw,width:.9,depth:.9,seatY:.875,front:.275});
 }
 for(const r of CONSORT_ROOM_PROGRAM.rooms){
  const roomId='consort-'+r.key,bedId='china-consort-bed-'+r.key,x=-17.2,z=r.bedZ,w=1.55,d=2.4;
  part(roomId,r.name+' · 后宫私室',-19.2,-16,r.minZ,r.maxZ,y,3.77);
  privateBed(G,g,{x,z,color:r.color,C});
  colliders.push({minX:x-w/2,maxX:x+w/2,minY:.2,maxY:1.92,minZ:z-d/2-.065,maxZ:z+d/2});cameraColliders.push({...colliders.at(-1)});
  additionalFurniture.push({id:bedId,privateOwnerId:'cn-consort-'+r.key,privateRoomId:roomId,kind:'bed',name:r.name+'的私室卧榻',worldLabel:r.name+' · 卧榻',position:[-18.5,y,z],exitPositions:[[-18.5,y,z],[-18.5,y,r.doorZ]],anchor:[x,y,z],center:[x,.2,z],size:[w,1.8,d+.13],yaw:0,supportY:1.055,lieOffset:.70,lieSupport:{hip:1.055,back:1.055,head:1.12,heel:1.055},action:'躺下休息'});
  const consoleZ=r.doorZ+.38;G.box(g,-16.62,.70,consoleZ,.56,1.0,.66,C.wood);G.vessel(g,-16.62,1.24,consoleZ,r.color,.35);colliders.push({minX:-16.9,maxX:-16.34,minY:.2,maxY:1.4,minZ:consoleZ-.33,maxZ:consoleZ+.33});cameraColliders.push({...colliders.at(-1)});
  const plaque=residencePlaque(G,g,'客居',-19.49,3.28,r.doorZ,1.2,.38);plaque.rotation.y=-Math.PI/2;
  explorationTargets.push({id:'cn-consort-'+r.key+'-entry',name:r.name+'私室门内',roomId,position:[-18.2,y,r.doorZ]},{id:'cn-consort-'+r.key+'-bed',name:r.name+'卧榻旁',roomId,position:[-18.5,y,z]});
 }
 return additionalFurniture;
}
