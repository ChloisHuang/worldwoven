import {officialBureauPlaque as culturePlaque} from './china-official-lettering.js';

// Fictional duty lodging, not a claim that Ming civil officers lived in the
// inner palace. The southeast plot is below the existing cherry and tavern.
export const CHINA_OFFICIAL_BUREAU=Object.freeze({id:'official-bureau',name:'承务官舍 · 架空值宿官署',bounds:{minX:16,maxX:26,minZ:30,maxZ:36},floorY:.215,
 offices:[[18,.215,32],[24,.215,32]],workTargets:[[18,1.20,31.32],[24,1.20,31.32]],
 roomIds:['cn-official-room-gu','cn-official-room-xu'],beds:['cn-official-bed-gu','cn-official-bed-xu'],entry:[15,.115,32]});

export function buildChinaOfficialBureau(G,A){
 const {THREE}=G,{H,C,group,roofGroup,colliders,cameraColliders,walkableSurfaces,interiorRooms,doorways,explorationTargets,buildings,levels,lightingZones,palaceWall,door,upperFixture,solid3}=A;
 const root=new THREE.Group(),roof=new THREE.Group();root.name='China building official-bureau';roof.name='China roof official-bureau';group.add(root);roofGroup.add(roof);
 const {bounds:b}=CHINA_OFFICIAL_BUREAU,y=.215,top=3.65;
 G.box(root,21,.1,33,10,.2,6,0xbba684);walkableSurfaces.push({...b,y,owner:root.name});
 const wall=(axis,at,from,to,openings=[])=>palaceWall(root,colliders,cameraColliders,{axis,at,from,to,bottom:.2,top,depth:.32,color:C.cream,openings});
 const entry=door('cn-official-bureau-entry','承务官署 · 公共办公厅','z',16,31.1,32.8,3.05,['compound','cn-official-office'],.2);
 wall('z',16,30,36,[entry]);wall('z',26,30,36);wall('x',36,16,26);
 const windows=[{from:17,to:19,bottom:1.55,top:2.8},{from:23,to:25,bottom:1.55,top:2.8}];wall('x',30,16,26,windows);
 for(const {from,to}of windows){for(let x=from;x<=to;x+=.25)G.box(root,x,2.175,30,.045,1.25,.10,C.dark);for(const yy of[1.55,2.8])G.box(root,(from+to)/2,yy,30,to-from,.09,.16,C.red);}
 const doors=[door('cn-official-room-gu-door','顾衡的值宿室','x',33,19.25,20.65,3.05,['cn-official-office','cn-official-room-gu'],.2),door('cn-official-room-xu-door','许知远的值宿室','x',33,21.35,22.75,3.05,['cn-official-office','cn-official-room-xu'],.2)];
 wall('x',33,16,26,doors);wall('z',21,33,36);
 H.palaceCeiling(roof,colliders,cameraColliders,21,33,10,6,top);H.palaceRoof(roof,21,top+.22,33,11.2,7.2,1.10,0x667969);
 const furniture=[];
 for(const[i,x]of[18,24].entries()){
  const table=new THREE.Group();table.position.y=.2;root.add(table);G.table(table,x,30.82,2,.82,C.wood,.92);solid3(root,x,1.13,30.82,2,.15,.82,C.wood);
  H.boundBook(root,x-.43,1.235,30.8,.48,.44,i?0x81564f:0x536b75);G.box(root,x+.35,1.224,31.10,.62,.012,.36,0xe8d9ba);
  for(let k=0;k<4;k++)G.box(root,x+.18+k*.10,1.234,31.10,.018,.004,.23,0x4c5146);
  const bx=i?24.15:17.85,id=CHINA_OFFICIAL_BUREAU.beds[i],roomId=CHINA_OFFICIAL_BUREAU.roomIds[i],ownerId=i?'cn-minister-granary':'cn-minister-works';
  const bed=new THREE.Group();bed.name='Official private timber bed '+id;bed.position.y=.2;root.add(bed);G.bed(bed,bx,34.5,i?0x827565:0x667e80,1.95,2.50);
  colliders.push({minX:bx-1.025,maxX:bx+1.025,minZ:33.17,maxZ:35.83,minY:.2,maxY:1.82});cameraColliders.push({...colliders.at(-1)});
  const p=[i?22.65:19.35,y,34.5];furniture.push({id,kind:'bed',name:(i?'许知远':'顾衡')+'的官舍卧榻',action:'躺下休息',privateRoomId:roomId,ownerId,position:p,anchor:[bx,y,34.5],center:[bx,.2,34.5],size:[2.05,1.62,2.66],yaw:0,supportY:1.055,lieOffset:.30,lieSupport:{hip:1.055,back:1.055,head:1.14,heel:1.055}});
  // Each room has its own chest, bedding, lamp and door. No shared bedroom claim.
  solid3(root,i?25.25:16.75,.66,34.3,.58,.92,1.2,C.wood);H.foldedCloth(root,i?25.25:16.75,1.15,34.3,.40,.6,0xd1c2a5);
  culturePlaque(G,root,i?'许知远':'顾衡',i?23.65:18.35,2.40,32.80,1.5,.42);
  upperFixture(root,'official-room-'+i,bx,3.10,34.55,y);
  interiorRooms.push({id:roomId,name:(i?'许知远':'顾衡')+'的值宿私室',minX:i?21:16,maxX:i?26:21,minZ:33,maxZ:36,floorY:y,ceiling:top,ownerId});
  explorationTargets.push({id:roomId,name:(i?'许知远':'顾衡')+'值宿室',roomId,position:p});
 }
 culturePlaque(G,root,'承务官舍',15.80,2.7,30.45,2.25,.55).rotation.y=-Math.PI/2;
 culturePlaque(G,root,'架空官署·两人值宿',21,2.78,30.19,3.4,.42);
 upperFixture(root,'official-office',21,3.11,31.7,y);
 interiorRooms.push({id:'cn-official-office',name:'承务官署 · 公共办公厅',minX:16,maxX:26,minZ:30,maxZ:33,floorY:y,ceiling:top});
 buildings.push({id:'official-bureau',name:CHINA_OFFICIAL_BUREAU.name,groupName:root.name,roofGroupName:roof.name,bounds:b,roomIds:['cn-official-office',...CHINA_OFFICIAL_BUREAU.roomIds]});
 levels.push({id:'official-bureau',name:'承务官舍 · 公共办公与值宿',y,bounds:b});lightingZones.push({id:'official-bureau',...b,minY:.1,maxY:top+.1,floorY:y});
 explorationTargets.push({id:'cn-official-office',name:'承务官署办公厅',roomId:'cn-official-office',position:[21,y,32]});
 return {additionalFurniture:furniture,pack(){H.packStatic(root);H.packStatic(roof);}};
}
