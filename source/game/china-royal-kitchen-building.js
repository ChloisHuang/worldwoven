import {PANTRY} from './china-royal-pantry.js';
import {tavernPlaque} from './china-tavern-lettering.js';

// The former 10 × 14 m service hall is now a genuine 10 × 9 m two-storey
// building. Its released five-metre strip is transferred to Yunlai's dining
// hall; the public crosscourt keeps the same six-metre clear depth.
export const CHINA_ROYAL_KITCHEN=Object.freeze({id:'kitchen',name:'御膳楼',storeys:2,bounds:{minX:16,maxX:26,minZ:-12,maxZ:-3},previousFootprint:140,footprint:90,diningY:.215,kitchenY:4.015,stairId:'cn-royal-kitchen-stair',freedArea:50});
export function buildChinaRoyalKitchen(G,A){
 const {THREE}=G,{H,C,group,roofGroup,rooms,colliders,cameraColliders,walkableSurfaces,interiorRooms,doorways,explorationTargets,buildings,levels,lightingZones,palaceWall,door,slab,stairs,rail,landingRail,paintedBand,window,upperFixture}=A;
 const root=rooms.kitchen.g,roof=rooms.kitchen.r;root.name='China building kitchen';roof.name='China roof kitchen';roofGroup.add(roof);
 const floors=[.215,4.015],tops=[3.77,7.57],parts=[];
 const wall=(g,axis,at,from,to,y,top,openings=[])=>palaceWall(g,colliders,cameraColliders,{axis,at,from,to,bottom:y-.015,top,depth:.32,color:C.cream,openings});
 const entry=(id,name,axis,at,from,to,y,roomIds)=>{const op=door(id,name,axis,at,from,to,y+2.85,roomIds,y-.015);doorways.at(-1).floorFit={bottom:y,top:y+2.85};return op;};
 const win=(g,axis,at,from,to,y)=>{window(g,axis==='x'?(from+to)/2:at,axis==='x'?at:(from+to)/2,to-from,axis,1.5,y+2.0);return {from,to,bottom:y+1.25,top:y+2.75};};
 for(let i=0;i<2;i++){
  const y=floors[i],top=tops[i],g=new THREE.Group();g.name='御膳楼 '+(i?'二层备膳':'一层餐厅');root.add(g);parts.push(g);
  if(!i)slab(g,'cn-royal-dining-floor',16,26,-12,-3,y,.2,0xbba684);
  else{slab(g,'cn-royal-prep-floor',16,26,-9.4,-3,y,.23,0xbba684);slab(g,'cn-royal-stair-top',24.3,26,-12,-9.4,y,.23,C.wood);}
  const front=[win(g,'x',-3,16.8,18.8,y),win(g,'x',-3,23.2,25.2,y)];if(!i)front.push(entry('cn-kitchen-front','御膳一层餐厅正门','x',-3,19.4,22.6,y,['dining','court']));
  wall(g,'x',-3,16,26,y,top,front);
  const back=!i?[entry('cn-kitchen-rear','御膳楼勤务后门','x',-12,24.0,25.5,y,['dining','rear-court'])]:[win(g,'x',-12,24.1,25.3,y)];wall(g,'x',-12,16,26,y,top,back);
  for(const x of[16,26]){const ops=[win(g,'z',x,-8.6,-6.5,y)];if(!i)ops.push(entry('cn-kitchen-'+(x===16?'west':'east'),'御膳餐厅侧门','z',x,-5.8,-3.8,y,['dining','side-court']));wall(g,'z',x,-12,-3,y,top,ops);}
  H.palaceCeiling(g,colliders,cameraColliders,21,-6.2,10,6.4,top,i===1);
  H.palaceCeiling(g,colliders,cameraColliders,25.15,-10.7,1.7,2.6,top,i===1);
  if(i)H.palaceCeiling(g,colliders,cameraColliders,20.15,-10.7,8.3,2.6,top,true);
  for(const z of[-12,-3])paintedBand(g,'royal-kitchen-'+i+'-'+z,21,top-.37,z+(z===-3?.21:-.21),10,z===-3?0:Math.PI);
  for(const x of[16,26])for(const z of[-12,-3])G.box(g,x,y+(top-y)/2,z,.24,top-y,.24,C.red);
  tavernPlaque(G,g,i?'二层御膳备餐':'一层御膳餐厅',21,top-.79,-2.79,3.6,.56);
  upperFixture(g,'royal-kitchen-'+i,21,top-.54,-5.5,y);
  levels.push({id:i?'royal-kitchen-upper':'royal-dining-floor',name:i?'御膳楼 · 二层备餐':'御膳楼 · 一层餐厅',y,bounds:CHINA_ROYAL_KITCHEN.bounds});
  lightingZones.push({id:'royal-kitchen-'+i,...CHINA_ROYAL_KITCHEN.bounds,minY:y-.1,maxY:top+.1,floorY:y});
 }
 // Keep the original split-cloth dining/preparation threshold at the real
 // upstairs landing; its identity now separates the stairs from the workroom.
 entry('cn-kitchen-dining','御膳梯厅与二层备餐间','x',-9.4,24.1,25.9,4.015,['dining','kitchen']);
 G.box(root,25,6.99,-9.4,2,.18,.25,C.red);
 stairs(root,'cn-royal-kitchen-stair','x',17.6,24.3,-11.65,-9.65,.215,4.015,20,false,[0]);
 // Lower stair mouth is approached from its actual west landing. No slab or
 // ceiling crosses the ascent; the upstairs east landing joins the workroom.
 landingRail(root,'royal-upper-stair-edge',[16.2,-9.4],[24.3,-9.4],4.015);
 landingRail(root,'royal-upper-south-return',[24.3,-9.65],[24.3,-9.4],4.015);

 // The full-height rear masonry already protects the north side of this
 // void; there is no upper deck there to support a second level railing.
 const addBox=(g,x,y,z,w,h,d,c)=>{G.box(g,x,y,z,w,h,d,c);const b={minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2};colliders.push(b);cameraColliders.push({...b});};
 const table=(g,x,y,z,w,d,h=1,footD=d)=>{const q=new THREE.Group();q.position.y=y-.215;g.add(q);G.table(q,x,z,w,d,C.wood,h);const b={minX:x-w/2,maxX:x+w/2,minY:y-.015,maxY:y-.215+h+.08,minZ:z-footD/2,maxZ:z+footD/2};colliders.push(b);cameraColliders.push({...b});return y+h-.215;};
 const [dining,kitchen]=parts;
 table(dining,21,.215,-6.8,3.8,2.1);for(const x of[19.9,21,22.1])for(const z of[-6.25,-7.35])H.bowl(dining,x,1.09,z,0xc3d1bd,.2);
 for(const x of[19.8,22.2])for(const z of[-8.3,-4.8]){G.box(dining,x,.45,z,.75,.5,.75,C.wood);G.box(dining,x,.76,z,.86,.12,.86,0xb19068);colliders.push({minX:x-.43,maxX:x+.43,minY:.2,maxY:.87,minZ:z-.43,maxZ:z+.43});cameraColliders.push({...colliders.at(-1)});}
 // Original stove and three-tier steamer, moved together without scaling.
 addBox(kitchen,18.1,4.59,-4.5,3.8,1.18,1.35,0xa29372);G.box(kitchen,18.1,5.23,-4.5,3.94,.13,1.49,0xc9c0a1);G.cyl(kitchen,17.2,5.34,-4.5,.48,.48,.08,0x343e37);G.sphere(kitchen,17.2,5.44,-4.5,.42,0x46534b,1,.4,1);for(let j=0;j<3;j++)G.cyl(kitchen,19.1,5.37+j*.18,-4.5,.3,.31,.16,0xbba26e,12);G.cone(kitchen,19.1,5.93,-4.5,.34,.15,0xd2b780,12);
 // Same 4.7 m preparation table, original two boards/dough and bowl.
 table(kitchen,21.4,4.015,-7.3,4.7,1.8,1,1.55);for(const x of[20,22.3]){G.box(kitchen,x,4.899,-6.7,.85,.04,.60,0xd5b680);for(let i=0;i<3;i++)G.sphere(kitchen,x-.2+i*.2,4.99,-6.49,.1,0xeee0bc,1,.6,.72);}H.bowl(kitchen,23,4.92,-7.45,0x99b7a8,.3,0x76905a);
 const shelf=H.openShelf(kitchen,[],25.1,-4.5,2,2.6,.7,C.wood,-Math.PI/2);shelf.name=PANTRY.id;shelf.userData.batchId=PANTRY.id;shelf.position.y=4.0;tavernPlaque(G,kitchen,'御膳',24.67,6.25,-4.5,1.1,.35).rotation.y=-Math.PI/2;for(const xx of[-.6,0,.6]){for(let j=0;j<3;j++)H.boundBook(shelf,xx,.35+j*.11,0,.4,.46,[0x738d7b,0xb69d6a,0x9a6350][j]);G.vessel(shelf,xx,1.51,0,0xa9c2b5,.55);}colliders.push({minX:24.7,maxX:25.5,minY:4.0,maxY:6.6,minZ:-5.5,maxZ:-3.5});cameraColliders.push({...colliders.at(-1)});
 interiorRooms.push({id:'dining',name:'御膳楼一层餐厅',...CHINA_ROYAL_KITCHEN.bounds,floorY:.215,ceiling:3.77},{id:'kitchen',name:'御膳楼二层备膳间',...CHINA_ROYAL_KITCHEN.bounds,floorY:4.015,ceiling:7.57});
 for(const[id,name,p,roomId]of[[PANTRY.id,'御膳开局储备批 · 原东架',PANTRY.point,'kitchen'],['cn-kitchen-prep','二层原备膳案前',[21.4,4.015,-6.1],'kitchen'],['cn-kitchen-stove','二层原蒸笼灶前',[17.8,4.015,-5.65],'kitchen'],['cn-kitchen-rear','御膳后门内',[24.7,.215,-11.05],'dining'],['cn-dining-west','餐厅西侧',[17.8,.215,-6],'dining'],['cn-dining-east','餐厅东侧',[23.9,.215,-6],'dining'],['cn-dining-door','餐厅门内',[21,.215,-3.8],'dining']])explorationTargets.push({id,name,position:p,roomId});
 H.palaceRoof(roof,21,7.83,-7.5,11.3,10.3,1.4,C.roof);
 buildings.push({id:'kitchen',name:'御膳楼 · 下层餐厅 / 上层备膳',groupName:root.name,roofGroupName:roof.name,bounds:CHINA_ROYAL_KITCHEN.bounds,roomIds:['dining','kitchen'],storeys:2});
 return CHINA_ROYAL_KITCHEN;
}
