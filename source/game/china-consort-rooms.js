import {buildChinaRoyalChair} from './china-royal-seating.js';
import {residencePlaque} from './china-residence-lettering.js';

export const CONSORT_ROOM_PROGRAM=Object.freeze({
 reception:{minX:-20.9,maxX:-16,minZ:-12,maxZ:-7.8},corridor:{minX:-20.9,maxX:-19.3,minZ:-7.8,maxZ:2,clearWidth:1.28},
 rooms:[{key:'heng',name:'沈蘅',minZ:-7.8,maxZ:-3,doorZ:-4.1,bedZ:-6.15,color:0x52796f},{key:'ling',name:'令仪',minZ:-3,maxZ:2,doorZ:.9,bedZ:-1.5,color:0xbf805e}],bedSize:[1.55,2.4]
});
// The existing east reception is deep enough for two proper bedchambers behind
// an independent corridor. No route passes through a bedroom or wet room.
export function buildChinaConsortRooms(G,{g,C,wall,privacy,part,table,teaSet,colliders,cameraColliders,additionalFurnitureSeats,explorationTargets}){
 const {THREE}=G,additionalFurniture=[],y=.215;
 part('residence-living','后宫一层公共会客前厅',-20.9,-16,-12,-7.8,y,3.77);
 part('residence-suite-corridor','后宫私室外走廊',-20.9,-19.3,-7.8,2,y,3.77);
 wall('x',-7.8,-19.3,-16,.2,3.77);wall('x',-3,-19.3,-16,.2,3.77);
 wall('z',-19.3,-7.8,2,.2,3.77,CONSORT_ROOM_PROGRAM.rooms.map(r=>privacy('cn-consort-'+r.key+'-door',r.name+'私室门','z',-19.3,r.doorZ-.75,r.doorZ+.75,y,['consort-'+r.key,'residence-suite-corridor'])));
 G.rug(g,-18.1,-9.7,3.1,2.6,0x9d7b59,0xd6bd85);table(g,-18.1,-9.7,1.10,1.7,.93);teaSet(g,-18.1,1.02,-9.7,0x93b0a4);
 for(const [id,x,yaw]of[['china-residence-reception-seat--7.2',-19.35,Math.PI/2],['china-residence-reception-seat--3.7',-16.85,-Math.PI/2]]){
  buildChinaRoyalChair(g,{x,y:.2,z:-9.7,yaw,variant:'reading',id});G.collider(colliders,x,-9.7,.9,.9);cameraColliders.push({minX:x-.45,maxX:x+.45,minY:.2,maxY:2.0,minZ:-10.15,maxZ:-9.25});additionalFurnitureSeats.push({id,name:'后宫会客椅',x,y,z:-9.7,yaw,width:.9,depth:.9,seatY:.875,front:.275});
 }
 for(const r of CONSORT_ROOM_PROGRAM.rooms){
  const roomId='consort-'+r.key,bedId='china-consort-bed-'+r.key,x=-17.35,z=r.bedZ,w=1.55,d=2.4;
  part(roomId,r.name+' · 后宫私室',-19.3,-16,r.minZ,r.maxZ,y,3.77);
  const bed=new THREE.Group();bed.name=r.name+' private timber bed';bed.position.set(x,.2,z);g.add(bed);
  for(const dx of[-.64,.64])for(const dz of[-1.05,1.05])G.box(bed,dx,.29,dz,.13,.58,.13,C.dark);
  G.box(bed,0,.59,0,w,.14,d,C.wood);G.box(bed,0,.73,0,w-.08,.16,d-.08,0xefdfc0);
  G.box(bed,0,.8325,.08,w-.12,.045,d-.36,r.color);G.box(bed,0,.87,-.93,.90,.10,.32,0xf1dfbd);
  G.box(bed,0,1.07,-d/2,w,1.28,.13,C.dark);G.box(bed,0,1.15,-d/2+.078,w-.18,.73,.02,r.color);
  for(const dx of[-.60,0,.60])G.box(bed,dx,1.15,-d/2+.095,.045,.71,.018,C.gold);
  colliders.push({minX:x-w/2,maxX:x+w/2,minY:.2,maxY:1.92,minZ:z-d/2-.065,maxZ:z+d/2});cameraColliders.push({...colliders.at(-1)});
  additionalFurniture.push({id:bedId,privateOwnerId:'cn-consort-'+r.key,privateRoomId:roomId,kind:'bed',name:r.name+'的私室卧榻',worldLabel:r.name+' · 卧榻',position:[-18.65,y,z],exitPositions:[[-18.65,y,z],[-18.65,y,r.doorZ]],anchor:[x,y,z],center:[x,.2,z],size:[w,1.8,d+.13],yaw:0,supportY:1.055,lieOffset:.30,lieSupport:{hip:1.055,back:1.055,head:1.12,heel:1.055},action:'躺下休息'});
  const consoleZ=r.doorZ+.38;G.box(g,-16.62,.70,consoleZ,.56,1.0,.66,C.wood);G.vessel(g,-16.62,1.24,consoleZ,r.color,.35);colliders.push({minX:-16.9,maxX:-16.34,minY:.2,maxY:1.4,minZ:consoleZ-.33,maxZ:consoleZ+.33});cameraColliders.push({...colliders.at(-1)});
  const plaque=residencePlaque(G,g,'客居',-19.49,3.28,r.doorZ,1.2,.38);plaque.rotation.y=-Math.PI/2;
  explorationTargets.push({id:'cn-consort-'+r.key+'-entry',name:r.name+'私室门内',roomId,position:[-18.2,y,r.doorZ]},{id:'cn-consort-'+r.key+'-bed',name:r.name+'卧榻旁',roomId,position:[-18.65,y,z]});
 }
 return additionalFurniture;
}
