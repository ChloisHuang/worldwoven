import {officialBureauPlaque as culturePlaque} from './china-official-lettering.js';

// Fictional duty lodging, not a claim that Ming civil officers lived in the
// inner palace. The southeast plot is below the existing cherry and tavern.
const upperY=3.915;
export const CHINA_OFFICIAL_BUREAU=Object.freeze({id:'official-bureau',name:'承务官舍 · 架空值宿官署',bounds:{minX:16,maxX:26,minZ:30.5,maxZ:36.5},floorY:.215,upperFloorY:upperY,storeys:2,
 offices:[[18,.215,32.5],[24,.215,32.5],...[17.35,19.30,21.25,23.20].map(x=>[x,upperY,32.15])],
 workTargets:[[18,1.20,31.82],[24,1.20,31.82],...[17.35,19.30,21.25,23.20].map(x=>[x,upperY+.985,31.75])],
 roomIds:['cn-official-room-gu','cn-official-room-xu','cn-official-dorm-west','cn-official-dorm-west','cn-official-dorm-east','cn-official-dorm-east'],
 // Shared sleeping rooms describe the location; only the original two private
 // rooms can be exclusively claimed. Each new resident claims his own bed.
 privateRoomIds:['cn-official-room-gu','cn-official-room-xu',null,null,null,null],
 beds:['cn-official-bed-gu','cn-official-bed-xu','cn-official-bed-rites','cn-official-bed-personnel','cn-official-bed-justice','cn-official-bed-records'],
 upperBounds:{minX:16,maxX:27.72,minZ:28.9,maxZ:36.5},upperHall:[24.95,upperY,32.1],entry:[15,.115,32.5],
 // Every change of direction is explicit, with a level supported approach at
 // either end. The north alley mouth reconnects to the public court's grid.
 // Court and free-time travel use the same physical public stair.
 stairRoute:[[28.17,.115,28.2],[28.17,.115,36.9],[26.92,.115,36.9],[26.92,.115,36.3],[26.92,upperY,30.5],[26.92,upperY,29.7],[24.95,upperY,29.7],[24.95,upperY,31.25],[24.95,upperY,32.1]],
 stair:{id:'cn-official-public-stair',axis:'z',minX:26.32,maxX:27.52,minZ:30.5,maxZ:36.3,y:upperY,endY:.115,count:20},
 dorms:[{id:'cn-official-dorm-west',name:'西值宿室 · 两张独立卧榻',minX:16,maxX:21,aisleX:18.575},{id:'cn-official-dorm-east',name:'东值宿室 · 两张独立卧榻',minX:21,maxX:26,aisleX:23.425}]
});
export function isChinaOfficialUpperFloor(p){const b=CHINA_OFFICIAL_BUREAU.upperBounds;return p.y>2.8&&p.x>=b.minX-.5&&p.x<=b.maxX+.5&&p.z>=b.minZ-.5&&p.z<=b.maxZ+.5;}

export function buildChinaOfficialBureau(G,A){
 const {THREE}=G,{H,C,group,roofGroup,colliders,cameraColliders,walkableSurfaces,characterFootSurfaces=[],stairways=[],interiorRooms,doorways,explorationTargets,buildings,levels,lightingZones,palaceWall,door,upperFixture,solid3}=A;
 const root=new THREE.Group(),roof=new THREE.Group();root.name='China building official-bureau';roof.name='China roof official-bureau';group.add(root);roofGroup.add(roof);
 const {bounds:b}=CHINA_OFFICIAL_BUREAU,y=.215,top=3.65;
 G.box(root,21,.1,33.5,10,.2,6,0xbba684);walkableSurfaces.push({...b,y,owner:root.name});
 const wall=(axis,at,from,to,openings=[])=>palaceWall(root,colliders,cameraColliders,{axis,at,from,to,bottom:.2,top,depth:.32,color:C.cream,openings});
 const entry=door('cn-official-bureau-entry','承务官署 · 公共办公厅','z',16,31.6,33.3,3.05,['compound','cn-official-office'],.2);
 wall('z',16,30.5,36.5,[entry]);wall('z',26,30.5,36.5);wall('x',36.5,16,26);
 const windows=[{from:17,to:19,bottom:1.55,top:2.8},{from:23,to:25,bottom:1.55,top:2.8}];wall('x',30.5,16,26,windows);
 for(const {from,to}of windows){for(let x=from;x<=to;x+=.25)G.box(root,x,2.175,30.5,.045,1.25,.10,C.dark);for(const yy of[1.55,2.8])G.box(root,(from+to)/2,yy,30.5,to-from,.09,.16,C.red);}
 const doors=[door('cn-official-room-gu-door','顾衡的值宿室','x',33.5,19.05,20.75,3.05,['cn-official-office','cn-official-room-gu'],.2),door('cn-official-room-xu-door','许知远的值宿室','x',33.5,21.25,22.95,3.05,['cn-official-office','cn-official-room-xu'],.2)];
 wall('x',33.5,16,26,doors);wall('z',21,33.5,36.5);
 H.palaceCeiling(root,colliders,cameraColliders,21,33.5,10,6,top);
 const furniture=[];
 for(const[i,x]of[18,24].entries()){
  const table=new THREE.Group();table.position.y=.2;root.add(table);G.table(table,x,31.32,2,.82,C.wood,.92);solid3(root,x,1.13,31.32,2,.15,.82,C.wood);
  H.boundBook(root,x-.43,1.235,31.3,.48,.44,i?0x81564f:0x536b75);G.box(root,x+.35,1.224,31.6,.62,.012,.36,0xe8d9ba);
  for(let k=0;k<4;k++)G.box(root,x+.18+k*.10,1.234,31.6,.018,.004,.23,0x4c5146);
  const bx=i?24.15:17.85,id=CHINA_OFFICIAL_BUREAU.beds[i],roomId=CHINA_OFFICIAL_BUREAU.roomIds[i],ownerId=i?'cn-minister-granary':'cn-minister-works';
  const bed=new THREE.Group();bed.name='Official private timber bed '+id;bed.position.y=.2;root.add(bed);G.bed(bed,bx,35,i?0x827565:0x667e80,1.95,2.50);
  colliders.push({minX:bx-1.025,maxX:bx+1.025,minZ:33.67,maxZ:36.33,minY:.2,maxY:1.82});cameraColliders.push({...colliders.at(-1)});
  const p=[i?22.65:19.35,y,35];furniture.push({id,kind:'bed',name:(i?'许知远':'顾衡')+'的官舍卧榻',action:'躺下休息',privateRoomId:roomId,ownerId,position:p,anchor:[bx,y,35],center:[bx,.2,35],size:[2.05,1.62,2.66],yaw:0,supportY:1.055,lieOffset:.30,lieSupport:{hip:1.055,back:1.055,head:1.14,heel:1.055}});
  // Each room has its own chest, bedding, lamp and door. No shared bedroom claim.
  solid3(root,i?25.45:16.55,.66,34.8,.40,.92,1.2,C.wood);H.foldedCloth(root,i?25.45:16.55,1.15,34.8,.30,.6,0xd1c2a5);
  culturePlaque(G,root,i?'许知远':'顾衡',i?23.65:18.35,2.40,33.3,1.5,.42);
  upperFixture(root,'official-room-'+i,bx,3.10,35.05,y);
  interiorRooms.push({id:roomId,name:(i?'许知远':'顾衡')+'的值宿私室',minX:i?21:16,maxX:i?26:21,minZ:33.5,maxZ:36.5,floorY:y,ceiling:top,ownerId});
  explorationTargets.push({id:roomId,name:(i?'许知远':'顾衡')+'值宿室',roomId,position:p});
 }
 culturePlaque(G,root,'承务官舍',15.80,3.34,32.45,2.25,.46).rotation.y=-Math.PI/2;
 culturePlaque(G,root,'架空官署·六人值宿',21,2.78,30.69,3.4,.42);
 upperFixture(root,'official-office',21,3.11,32.2,y);
 interiorRooms.push({id:'cn-official-office',name:'承务官署 · 公共办公厅',minX:16,maxX:26,minZ:30.5,maxZ:33.5,floorY:y,ceiling:top});
 buildUpperFloor();
 buildings.push({id:'official-bureau',name:CHINA_OFFICIAL_BUREAU.name,groupName:root.name,roofGroupName:roof.name,bounds:{...b,maxX:27.72,minZ:28.9},storeys:2,roomIds:['cn-official-office','cn-official-upper-office',...new Set(CHINA_OFFICIAL_BUREAU.roomIds)]});
 levels.push({id:'official-bureau',name:'承务官舍 · 公共办公与值宿',y,bounds:b});lightingZones.push({id:'official-bureau',...b,minY:.1,maxY:top+.1,floorY:y});
 explorationTargets.push({id:'cn-official-office',name:'承务官署办公厅',roomId:'cn-official-office',position:[21,y,32.5]});
 return {additionalFurniture:furniture,stairRoute:CHINA_OFFICIAL_BUREAU.stairRoute,pack(){H.packStatic(root);H.packStatic(roof);}};
 function buildUpperFloor(){
  const B=CHINA_OFFICIAL_BUREAU,y=B.upperFloorY,ceiling=7.35,g=new THREE.Group();g.name='China official bureau upper floor';root.add(g);
  const hull=(minX,maxX,minZ,maxZ,minY,maxY,owner)=>{const c={minX,maxX,minZ,maxZ,minY,maxY,owner};colliders.push(c);cameraColliders.push({...c});};
  const slab=(id,minX,maxX,minZ,maxZ,yy,depth=.20)=>{G.box(g,(minX+maxX)/2,yy-depth/2-.015,(minZ+maxZ)/2,maxX-minX,depth,maxZ-minZ,C.wood);walkableSurfaces.push({id,minX,maxX,minZ,maxZ,y:yy,owner:root.name});cameraColliders.push({minX,maxX,minZ,maxZ,minY:yy-depth-.015,maxY:yy-.015,owner:id});};
  const wall=(axis,at,from,to,openings=[])=>palaceWall(g,colliders,cameraColliders,{axis,at,from,to,bottom:y-.015,top:ceiling,depth:.28,color:C.cream,openings});
  const portal=(id,name,axis,at,from,to,rooms)=>{const op=door(id,name,axis,at,from,to,y+2.75,rooms,y-.015);doorways.at(-1).floorFit={bottom:y,top:y+2.75};return op;};
  const rail=(id,a,b,y0,y1=y0)=>{
   H.beam(g,[a[0],y0+.99,a[1]],[b[0],y1+.99,b[1]],.045,C.gold);H.beam(g,[a[0],y0+.27,a[1]],[b[0],y1+.27,b[1]],.032,C.red);
   const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.55));
   for(let j=0;j<=n;j++){const t=j/n;G.box(g,a[0]+(b[0]-a[0])*t,y0+(y1-y0)*t+.51,a[1]+(b[1]-a[1])*t,.075,1.02,.075,C.red);}
   for(let j=0;j<n;j++){const t0=j/n,t1=(j+1)/n,x0=a[0]+(b[0]-a[0])*t0,x1=a[0]+(b[0]-a[0])*t1,z0=a[1]+(b[1]-a[1])*t0,z1=a[1]+(b[1]-a[1])*t1,yy0=y0+(y1-y0)*t0,yy1=y0+(y1-y0)*t1;hull(Math.min(x0,x1)-.07,Math.max(x0,x1)+.07,Math.min(z0,z1)-.07,Math.max(z0,z1)+.07,Math.min(yy0,yy1)-.03,Math.max(yy0,yy1)+1.08,id);}
  };
  slab('cn-official-upper-floor',16,26,30.5,36.5,y);
  slab('cn-official-upper-balcony',23.8,27.72,28.9,30.5,y);
  rail('cn-official-balcony-north',[23.8,28.9],[27.72,28.9],y);rail('cn-official-balcony-west',[23.8,28.9],[23.8,30.5],y);rail('cn-official-balcony-east',[27.72,28.9],[27.72,30.5],y);
  rail('cn-official-balcony-return',[26,30.5],[26.32,30.5],y);
  const stair={...B.stair};walkableSurfaces.push({...stair,owner:root.name});stairways.push({...stair,width:stair.maxX-stair.minX,rise:(stair.y-stair.endY)/stair.count,tread:(stair.maxZ-stair.minZ)/stair.count});
  for(let j=0;j<stair.count;j++){
   const z0=stair.minZ+(stair.maxZ-stair.minZ)*j/stair.count,z1=stair.minZ+(stair.maxZ-stair.minZ)*(j+1)/stair.count,yy=stair.y+(stair.endY-stair.y)*(j+.5)/stair.count,h=.27;
   G.box(g,(stair.minX+stair.maxX)/2,yy-h/2-.015,(z0+z1)/2,stair.maxX-stair.minX,h,z1-z0,C.wood);
   characterFootSurfaces.push({minX:stair.minX,maxX:stair.maxX,minZ:z0,maxZ:z1,y:yy-.015});
   // Navigation uses the continuous support/ceiling plane; camera and feet
   // see the actual closed treads without a box edge blocking stair ascent.
   cameraColliders.push({minX:stair.minX,maxX:stair.maxX,minZ:z0,maxZ:z1,minY:yy-h-.015,maxY:yy-.015,owner:stair.id+'-tread-'+j});
  }
  for(const x of[stair.minX,stair.maxX])rail(stair.id+'-rail-'+x,[x,stair.minZ],[x,stair.maxZ],stair.y,stair.endY);
  // The stair remains inside the east wall and leaves a1.025m
  // ground passage, including the planner's x28 grid column. No dormitory
  // is a public through route.
  for(const[x,z,yy]of[[27.45,29.15,y],[26.20,29.15,y],[26.60,32.5,2.60]])G.box(g,x,(yy-.2)/2,z,.16,yy-.2,.16,C.dark);
  const entry=portal('cn-official-upper-entry','承务官舍二层公共办公厅','x',30.5,24.15,25.75,['compound','cn-official-upper-office']);
  wall('x',30.5,16,26,[entry]);wall('x',36.5,16,26);wall('z',16,30.5,36.5);wall('z',26,30.5,36.5);
  const openings=B.dorms.map(d=>portal(d.id+'-door',d.name,'x',32.9,d.aisleX-.70,d.aisleX+.70,['cn-official-upper-office',d.id]));
  wall('x',32.9,16,26,openings);wall('z',21,32.9,36.5);
  H.palaceCeiling(roof,colliders,cameraColliders,21,33.5,10,6,ceiling);H.palaceRoof(roof,21,ceiling+.22,33.5,11.2,7.2,1.10,0x667969);
  const people=[['rites','沈叙',17.35,0x677e8c],['personnel','陆谦',19.8,0x8b7966],['justice','周惟正',22.2,0x667666],['records','宋承简',24.65,0x8a6d73]];
  for(const[i,[key,name,bx,color]]of people.entries()){
   const x=B.offices[i+2][0],desk=new THREE.Group();desk.position.y=y-.015;g.add(desk);G.table(desk,x,31.25,1.55,.68,C.wood,.92);hull(x-.775,x+.775,30.91,31.59,y-.015,y+.98,'cn-official-desk-'+key);
   H.boundBook(g,x-.4,y+1.02,31.24,.35,.40,color);G.box(g,x+.22,y+.997,31.4,.55,.014,.29,0xe8d9ba);for(let k=0;k<3;k++)G.box(g,x+.07+k*.11,y+1.006,31.4,.014,.005,.18,0x4c5146);
   culturePlaque(G,g,name,x,y+2.3,30.67,1.48,.36);
   const id=B.beds[i+2],room=B.dorms[i<2?0:1],bed=new THREE.Group();bed.name='Official shared-room individual timber bed '+id;bed.position.set(bx,y-.015,35);g.add(bed);const w=1.45,d=2.45;
   for(const xx of[-.58,.58])for(const zz of[-1.04,1.04])G.box(bed,xx,.27,zz,.11,.54,.11,C.dark);
   G.box(bed,0,.52,0,w,.14,d,C.wood);G.box(bed,0,.705,0,w-.08,.23,d-.08,0xf3e5ce);G.box(bed,0,.835,.04,w-.10,.04,d-.16,color);G.box(bed,0,.90,-.87,.86,.08,.43,0xfff6e3);G.box(bed,0,.98,-d/2,w+.06,1.6,.13,C.wood);
   hull(bx-(w+.06)/2,bx+(w+.06)/2,35-d/2-.065,35+d/2,y-.015,y+1.8,id);
   const p=[room.aisleX,y,i%2?35.5:34.25],supportY=y+.84;
   furniture.push({id,kind:'bed',name:name+'的值宿卧榻',action:'躺下休息',sharedRoomId:room.id,ownerId:'cn-official-'+key,position:p,exitPositions:[p,[room.aisleX,y,33.65]],anchor:[bx,y,35],center:[bx,y-.015,35],size:[w+.06,1.8,d+.13],yaw:0,supportY,lieOffset:.30,lieSupport:{hip:supportY,back:supportY,head:y+.925,heel:supportY}});
   solid3(g,bx,y+.3,33.33,.66,.60,.40,C.wood);H.foldedCloth(g,bx,y+.63,33.33,.50,.31,color);
  }
  for(const d of B.dorms){interiorRooms.push({...d,minZ:32.9,maxZ:36.5,floorY:y,ceiling,shared:true,capacity:2});explorationTargets.push({id:d.id,name:d.name,roomId:d.id,position:[d.aisleX,y,33.6]});upperFixture(g,d.id,d.aisleX,ceiling-.55,34.9,y);}
  culturePlaque(G,g,'承务官舍',22,y+2.8,30.31,2.4,.45).rotation.y=Math.PI;culturePlaque(G,g,'公共梯道',27.1,2.6,36.5,1.6,.37);
  interiorRooms.push({id:'cn-official-upper-office',name:'承务官舍二层 · 公共办公厅',minX:16,maxX:26,minZ:30.5,maxZ:32.9,floorY:y,ceiling});
  levels.push({id:'official-bureau-upper',name:'承务官舍 · 二层文案与合住值宿',y,bounds:B.upperBounds});lightingZones.push({id:'official-bureau-upper',...b,minY:y-.1,maxY:ceiling+.1,floorY:y});upperFixture(g,'official-upper-office',21,ceiling-.55,32.1,y);
  explorationTargets.push({id:'cn-official-upper-office',name:'承务官舍二层公共办公厅',roomId:'cn-official-upper-office',position:B.upperHall},{id:'cn-official-stair-bottom',name:'承务官舍公共楼梯起点',roomId:'compound',position:[26.92,.115,36.3]});
 }
}
