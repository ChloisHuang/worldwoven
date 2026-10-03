import {residencePlaque} from './china-residence-lettering.js';
import {culturePlaque} from './china-culture-lettering.js';
import {buildChinaRoyalChair} from './china-royal-seating.js';

// One inhabited royal residence. The public stair hall is a separate northern
// wing: reaching a floor never requires passing through a sleeping/bathing room.
export const CHINA_RESIDENCE=Object.freeze({
 id:'rear-palace',name:'静宜后宫',storeys:3,
 bounds:{minX:-26,maxX:-16,minZ:-20,maxZ:2},
 floors:[{y:.215,ceiling:3.77,rooms:['guest','residence-living','residence-hall-1']},{y:4.015,ceiling:7.57,rooms:['bath','washroom','residence-linen','residence-hall-2']},{y:7.815,ceiling:12.215,rooms:['bedroom','residence-dressing','residence-sitting','residence-hall-3']}],
 freedPlots:[{id:'former-bath',minX:-26,maxX:-16,minZ:-33,maxZ:-23},{id:'former-guest',minX:16,maxX:26,minZ:-33,maxZ:-23}],
 stairHall:{minX:-26,maxX:-16,minZ:-20,maxZ:-12,publicCrossPassage:{minZ:-14.1,maxZ:-12,width:2.1}},
 privateEntrances:['cn-guest-front','cn-guest-east','cn-bath-front','cn-bath-east','cn-bedroom-front','cn-bedroom-west','cn-bath-west'],
});
export function buildChinaResidence(G,A){
 const {THREE}=G,{H,C,group,roofGroup,rooms,colliders,cameraColliders,interiorRooms,explorationTargets,buildings,levels,lightingZones,additionalFurnitureSeats,palaceWall,door,box,slab,stairs,rail,landingRail,paintedBand,window,table,shelf,stool,teaSet,flowerBranches,solid3,upperFixture}=A;
 const {palaceRoof,palaceCeiling,beam}=H;
 const g=new THREE.Group(),r=new THREE.Group();g.name='China building rear-palace';r.name='China roof rear-palace';group.add(g);roofGroup.add(r);rooms.residence={id:'rear-palace',g,r};
 const part=(id,name,minX,maxX,minZ,maxZ,floorY,ceiling)=>interiorRooms.push({id,name,minX,maxX,minZ,maxZ,floorY,ceiling});
 const wall=(axis,at,from,to,bottom,top,openings=[],depth=.32)=>palaceWall(g,colliders,cameraColliders,{axis,at,from,to,bottom,top,depth,color:C.cream,openings});
 const privacy=(id,name,axis,at,from,to,y,roomIds)=>{const op=door(id,name,axis,at,from,to,y+3.0,roomIds,y-.015);A.doorways.at(-1).floorFit={bottom:y,top:y+3.0};return op;};
 const panel=(axis,at,from,to,y,top)=>{
  const center=(from+to)/2,width=to-from,open={from,to,bottom:y+1.18,top:y+2.88};
  window(g,axis==='x'?center:at,axis==='x'?at:center,width,axis,1.70,y+2.03);
  // Opaque inner silk keeps private chambers private while the outer carved
  // lattice retains the vermilion/gold construction seen throughout the palace.
  G.box(g,axis==='x'?center:at,y+2.03,axis==='x'?at:center,axis==='x'?width:.035,1.68,axis==='x'?.035:width,0xd9caab);
  return open;
 };
 for(const [i,f]of CHINA_RESIDENCE.floors.entries()){
  const y=f.y,top=f.ceiling;
  slab(g,'cn-residence-floor-'+(i+1),-26,-16,-12,2,y,i?.23:.2,C.wood);
  if(i===0)slab(g,'cn-residence-ground-hall',-26,-16,-20,-12,y,.2,C.stone);
  else{
   slab(g,'cn-residence-hall-front-'+i,-26,-16,-14.1,-12,y,.23,C.wood);
   slab(g,'cn-residence-hall-east-'+i,-20.45,-16,-20,-14.1,y,.23,C.wood);
   slab(g,'cn-residence-hall-north-'+i,-26,-20.45,-20,-19.8,y,.23,C.wood);
   slab(g,'cn-residence-hall-west-'+i,-26,-25.8,-19.8,-14.1,y,.23,C.wood);
  }
  // Full-height walls, actual window cuts and supported paired beams on each
  // of the three enterable storeys. Room furniture is never scaled to fit.
  wall('x',2,-26,-16,y-.015,top,[panel('x',2,-24.8,-22.2,y,top),panel('x',2,-19.5,-16.7,y,top)]);
  for(const x of[-26,-16])wall('z',x,-12,2,y-.015,top,[-8.4,-.3].map(z=>panel('z',x,z-1.25,z+1.25,y,top)));
  wall('x',-20,-26,-16,y-.015,top,[panel('x',-20,-19.7,-16.6,y,top)]);
  for(const x of[-26,-16]){
   const arch=i===0?[{from:-15,to:-12.05,bottom:y-.015,top:y+3.05}]:[panel('z',x,-14.85,-12.55,y,top)];
   wall('z',x,-20,-12,y-.015,top,arch);
  }
  // The first two floor ceilings are the underside of real upper slabs. The
  // last bedroom has 4.4m headroom above its floor for the carved dragon crown.
  palaceCeiling(r,colliders,cameraColliders,-21,-5,10,14,top,false);
  for(const z of[2,-20]){
   paintedBand(g,'residence-'+i+'-'+z,-21,top-.43,z+(z===2?.23:-.23),10,z===2?0:Math.PI);
   for(const x of[-26,-21,-16]){
    solid3(g,x,y+(top-y)/2,z,.21,top-y,.30,C.red);
    for(const dy of[.14,.32])G.box(g,x,top-dy,z,.58,.12,.57,C.gold);
   }
  }
  // Joined corner posts run to each tier's transom, outside every aperture.
  for(const x of[-26,-16])for(const z of[-12,-6,2,-20])G.box(g,x,y+(top-y)/2,z,.24,top-y,.24,C.red);
  part('residence-hall-'+(i+1),'后宫'+(i+1)+'层公共梯厅',-26,-16,-20,-12,y,top);
  lightingZones.push({id:'residence-floor-'+(i+1),minX:-26.3,maxX:-15.7,minZ:-20.3,maxZ:2.3,minY:y-.1,maxY:top+.1,floorY:y});
  levels.push({id:'residence-floor-'+(i+1),name:'静宜后宫'+(i+1)+'层',y});
  for(const [x,z]of[[-18.1,-16.6],[-23.5,-5.0],[-18.0,-5.0],[-18.0,-.4]])upperFixture(g,'residence-light-'+i+'-'+z,x,top-.60,z,y);
  explorationTargets.push({id:'cn-residence-hall-'+(i+1),name:'后宫'+(i+1)+'层公共厅',roomId:'residence-hall-'+(i+1),position:[-18.0,y,-13.4]});
  if(i<2){
   const next=CHINA_RESIDENCE.floors[i+1].y,mid=(y+next)/2,prefix='cn-residence-stair-'+(i+1);
   stairs(g,prefix+'-west','z',-25.6,-23.4,-17.8,-14.1,mid,y,10);
   slab(g,prefix+'-landing',-25.8,-20.45,-19.8,-17.8,mid,.23,C.wood);
   stairs(g,prefix+'-east','z',-23.1,-20.9,-17.8,-14.1,mid,next,10);
   rail(g,prefix+'-landing-north',[-25.8,-19.8],[-20.45,-19.8],mid);
   for(const[id,a,b]of[['west',[-25.8,-19.8],[-25.8,-17.8]],['east',[-20.45,-19.8],[-20.45,-17.8]],['center',[-23.4,-17.8],[-23.1,-17.8]]])landingRail(g,prefix+'-landing-'+id,a,b,mid);
   for(const[id,a,b]of[['west',[-25.8,-19.8],[-25.8,-14.1]],['east',[-20.45,-19.8],[-20.45,-14.1]],['north',[-25.8,-19.8],[-20.45,-19.8]]])rail(g,prefix+'-void-'+id,a,b,next);
   if(i===1)rail(g,prefix+'-top-unused-mouth',[-25.8,-14.1],[-23.25,-14.1],next);
   else landingRail(g,prefix+'-next-stair-center',[-23.4,-14.1],[-23.1,-14.1],next);
  }
 }
 palaceCeiling(r,colliders,cameraColliders,-21,-16,10,8,12.215,false);
 // Continuous eave rings mark the occupied floors without putting a solid roof
 // through a room or filling the switchback's headroom.
 const eave=(a,b,c,d)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));geo.computeVertexNormals();G.mesh(r,geo,C.roof,0,0,0,{side:THREE.DoubleSide});};
 for(const y of[4.015,7.815]){
  for(const[z0,z1]of[[2.12,2.85],[-20.12,-20.85]]){
   eave([-26.1,y+.13,z0],[-15.9,y+.13,z0],[-15.2,y-.18,z1],[-26.8,y-.18,z1]);
   G.box(r,-21,y-.22,z1,11.6,.16,.16,C.red);beam(r,[-26.8,y-.08,z1],[-15.2,y-.08,z1],.08,C.gold);
  }
  for(const[x0,x1]of[[-26.12,-26.8],[-15.88,-15.2]])eave([x0,y+.13,-20.12],[x0,y+.13,2.12],[x1,y-.18,2.85],[x1,y-.18,-20.85]);
 }
 palaceRoof(r,-21,12.45,-5,11.65,15.4,1.75,C.roof);
 palaceRoof(r,-21,12.44,-16,11.65,9.5,1.2,C.roof);
 // Ground floor: a self-contained guest suite and furnished reception room.
 wall('x',-12,-26,-16,.2,3.77,[privacy('cn-guest-front','后宫客卧门','x',-12,-24.85,-22.15,.215,['guest','residence-hall-1']),privacy('cn-guest-east','后宫会客厅门','x',-12,-19.65,-16.95,.215,['residence-living','residence-hall-1'])]);
 wall('z',-20.9,-12,2,.2,3.77);
 part('guest','后宫一层客卧',-26,-20.9,-12,2,.215,3.77);part('residence-living','后宫一层起居会客厅',-20.9,-16,-12,2,.215,3.77);
 G.rug(g,-18.3,-5.2,3.9,5.3,0x9d7b59,0xd6bd85);table(g,-18.3,-5.5,2.6,1.1,.93);teaSet(g,-18.3,1.02,-5.5,0x93b0a4);
 for(const [x,z,yaw]of[[-18.3,-7.2,0],[-18.3,-3.7,Math.PI]]){buildChinaRoyalChair(g,{x,y:.2,z,yaw,variant:'reading'});G.collider(colliders,x,z,.9,.9);cameraColliders.push({minX:x-.5,maxX:x+.5,minY:.2,maxY:2.0,minZ:z-.5,maxZ:z+.5});additionalFurnitureSeats.push({id:'china-residence-reception-seat-'+z,name:'后宫会客椅',x,y:.215,z,yaw,width:.9,depth:.9,seatY:.875,front:.275});}
 table(g,-18.2,.9,3.2,.65,1.0);flowerBranches(g,-18.7,1.08,.9);G.vessel(g,-17.4,1.09,.9,0xaac6ba,.6);
 culturePlaque(G,g,'茶叙',-18.3,3.17,-11.79,2,.6);
 // Second floor: opaque arrival doors, an internal full silk screen to the WC,
 // and a separate linen/dressing room; no wet room is a stair access route.
 wall('x',-12,-26,-16,4,7.57,[privacy('cn-bath-front','后宫浴间门','x',-12,-24.9,-22.1,4.015,['bath','residence-hall-2']),privacy('cn-bath-east','后宫净室门','x',-12,-19.4,-16.6,4.015,['washroom','residence-hall-2'])]);
 wall('z',-20,-12,2,4,7.57,[door('cn-bath-washroom','浴间净室屏','z',-20,-9.3,-6.5,7.1,['bath','washroom'],4)]);
 wall('x',-5,-20,-16,4,7.57,[privacy('cn-bath-west','后宫布草更衣门','x',-5,-19.4,-16.6,4.015,['residence-linen','washroom'])]);
 part('bath','后宫二层浴间',-26,-20,-12,2,4.015,7.57);part('washroom','后宫二层净室',-20,-16,-12,-5,4.015,7.57);part('residence-linen','后宫二层布草与更衣',-20,-16,-5,2,4.015,7.57);
 // Linen storage uses a supported compact wardrobe and folded textiles.
 for(const x of[-18.7,-17.1]){solid3(g,x,4.88,1.2,1.15,1.7,.6,C.wood);for(const yy of[4.45,5.03])G.box(g,x,yy,.86,1.04,.18,.1,0xd4ba82);G.box(g,x,5.19,.85,1.00,.05,.10,C.gold);}
 // Third floor: independent sleeping room, a south reading alcove and a real
 // walled grooming room. Dragon-bed crown has >0.8m overhead clearance.
 wall('x',-12,-26,-16,7.8,12.215,[privacy('cn-bedroom-front','静宜寝殿私门','x',-12,-18.8,-16.6,7.815,['bedroom','residence-hall-3'])]);
 wall('x',-3,-26,-16,7.8,12.215,[{from:-24.8,to:-21.2,bottom:7.8,top:11.1},privacy('cn-bedroom-west','后宫梳妆更衣门','x',-3,-19.4,-16.6,7.815,['residence-dressing','bedroom'])]);
 wall('z',-20,-3,2,7.8,12.215);
 part('bedroom','静宜后宫三层寝殿',-26,-16,-12,-3,7.815,12.215);part('residence-dressing','后宫三层梳妆间',-20,-16,-3,2,7.815,12.215);part('residence-sitting','后宫三层私厅',-26,-20,-3,2,7.815,12.215);
 // A low sitting-area rug and porcelain console use the otherwise empty south
 // bay, leaving the bedroom's bed-side route and dressing approach free.
 G.box(g,-23,8.50,1.0,3.2,1.30,.64,C.wood);G.vessel(g,-23.8,9.2,1.0,0x93b7ac,.62);G.vessel(g,-22.2,9.2,1.0,0xc3aa7c,.48);
 const rugStart=g.children.length;G.rug(g,-23,-.6,4.3,2.7,0xa88357,0xd2b883);g.userData.rugSurfaces.at(-1).y+=7.6;for(const q of g.children.slice(rugStart))q.position.y+=7.6;
 culturePlaque(G,g,'观景',-18.1,10.75,-19.79,2,.64);
 g.traverse(o=>{if(o.userData.nightFixture)o.userData.nightFixture.dayFactor=.38;});
 const entrySign=residencePlaque(G,g,'静宜后宫',-15.77,3.43,-13.5,3.1,.58);entrySign.rotation.y=Math.PI/2;
 for(const [name,x,y,z]of[['客居',-23.5,3.45,-12.21],['会客',-18.3,3.45,-12.21],['沐浴',-23.5,7.25,-12.21],['净室',-18,7.25,-12.21],['寝殿',-17.7,11.06,-12.21],['梳妆',-18,11.06,-3.21]]){const plaque=residencePlaque(G,g,name,x,y,z,1.7,.55);plaque.rotation.y=Math.PI;}
 buildings.push({id:'rear-palace',name:'静宜后宫',groupName:g.name,roofGroupName:r.name,bounds:CHINA_RESIDENCE.bounds,roomIds:CHINA_RESIDENCE.floors.flatMap(f=>f.rooms),storeys:3});
 for(const [id,name,p,roomId]of[['cn-residence-ground-entry','后宫公共通廊东口',[-15.2,.215,-13.4],'outdoors'],['cn-residence-living','后宫起居茶案',[-18.3,.215,-9.1],'residence-living'],['cn-residence-dressing','后宫梳妆台前',[-18,7.815,-.05],'residence-dressing'],['cn-residence-linen','后宫布草柜前',[-18,4.015,-1],'residence-linen']])explorationTargets.push({id,name,position:p,roomId});
 return {group:g,roofGroup:r};
}
