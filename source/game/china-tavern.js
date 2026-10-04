import {buildTavernKitchen} from './china-tavern-kitchen.js';
import {tavernPlaque} from './china-tavern-lettering.js';
import {buildChinaRoyalChair} from './china-royal-seating.js';

// CN06: one house, three occupied floors. The switchback and the cross-hall
// belong to the public circulation; neither bedroom is a through route.
export const CHINA_TAVERN=Object.freeze({
 id:'yunlai-house',name:'云来酒楼 · 客栈 · 青楼',storeys:3,
 bounds:{minX:16,maxX:26,minZ:8,maxZ:21},
 floors:[{y:.215,ceiling:3.77,name:'一层酒楼',rooms:['tavern-dining','tavern-kitchen','tavern-hall-1']},{y:4.015,ceiling:7.57,name:'二层客栈',rooms:['tavern-guest-lan','tavern-guest-zhu','tavern-hall-2']},{y:7.815,ceiling:11.57,name:'三层青楼',rooms:['tavern-performance','tavern-banquet','tavern-hall-3']}],
 stairHall:{minX:16,maxX:26,minZ:8,maxZ:15.2,crossPassage:{minZ:13.4,maxZ:15.2,width:1.8}},
 guestRooms:['tavern-guest-lan','tavern-guest-zhu'],adultVenue:true,
 implemented:['public stairs','dining seats','two private furnished guest rooms','guest beds','guest wardrobes','listening seats','adult poetry recital','host meal orders and clearing','physical kitchen and table delivery','adult introductions and private-room tea visits'],
 pending:['inn booking and payment','qin playing and dance choreography','childhood and family life']
});

export function buildChinaTavern(G,A){
 const {THREE}=G,{H,C,group,roofGroup,colliders,cameraColliders,walkableSurfaces,interiorRooms,doorways,explorationTargets,buildings,levels,lightingZones,additionalFurnitureSeats,palaceWall,door,slab,stairs,rail,landingRail,paintedBand,window,upperFixture,solid3}=A;
 const root=new THREE.Group(),roof=new THREE.Group();root.name='China building yunlai-house';roof.name='China roof yunlai-house';group.add(root);roofGroup.add(roof);
 const floorGroups=[],additionalFurniture=[],stations=[];
 const room=(id,name,x0,x1,z0,z1,y,ceiling)=>interiorRooms.push({id,name,minX:x0,maxX:x1,minZ:z0,maxZ:z1,floorY:y,ceiling});
 const target=(id,name,p,roomId)=>explorationTargets.push({id,name,position:p,roomId});
 const wall=(g,axis,at,from,to,y,top,openings=[])=>palaceWall(g,colliders,cameraColliders,{axis,at,from,to,bottom:y-.015,top,depth:.32,color:C.cream,openings});
 const opening=(id,name,axis,at,from,to,y,roomIds)=>{const op=door(id,name,axis,at,from,to,y+2.85,roomIds,y-.015);doorways.at(-1).floorFit={bottom:y,top:y+2.85};return op;};
 const sign=(g,text,x,y,z,w=2.9,h=.56,rot=0)=>{const p=tavernPlaque(G,g,text,x,y,z,w,h);p.rotation.y=rot;return p;};
 const win=(g,axis,at,from,to,y,opaque=false)=>{const mid=(from+to)/2,w=to-from;window(g,axis==='x'?mid:at,axis==='x'?at:mid,w,axis,1.65,y+2.06);if(opaque)G.box(g,axis==='x'?mid:at,y+2.06,axis==='x'?at:mid,axis==='x'?w:.035,1.63,axis==='x'?.035:w,0xe6d6b6);return {from,to,bottom:y+1.235,top:y+2.885};};
 const block=(g,x,y,z,w,h,d,color=C.wood)=>solid3(g,x,y,z,w,h,d,color);
 const table=(g,x,y,z,w,d,h=.94)=>{const q=new THREE.Group();q.position.y=y-.015;g.add(q);G.table(q,x,z,w,d,C.wood,h);colliders.push({minX:x-w/2,maxX:x+w/2,minY:y-.015,maxY:y+h+.075,minZ:z-d/2,maxZ:z+d/2});cameraColliders.push({...colliders.at(-1)});return y+h+.075;};
 const rug=(g,x,y,z,w,d,color)=>{G.box(g,x,y+.012,z,w,.024,d,color);for(const side of[-1,1]){G.box(g,x+side*(w/2-.11),y+.03,z,.065,.012,d-.10,C.gold);G.box(g,x,y+.03,z+side*(d/2-.11),w-.10,.012,.065,C.gold);}};
 const chair=(g,id,name,x,y,z,yaw,variant='reading')=>{const model=buildChinaRoyalChair(g,{x,y:y-.015,z,yaw,variant,id});colliders.push({minX:x-.45,maxX:x+.45,minY:y-.015,maxY:y+1.56,minZ:z-.45,maxZ:z+.45});
  // Camera solids follow the existing chair's actual seat, back and arms. A
  // full tall box puts the mounted head inside an invisible camera obstacle.
  model.updateWorldMatrix(true,true);for(const m of model.userData.royalSeating.members.filter(m=>m.camera)){const b=m.bounds,q=new THREE.Box3(new THREE.Vector3(b.minX,b.minY,b.minZ),new THREE.Vector3(b.maxX,b.maxY,b.maxZ)).applyMatrix4(model.matrixWorld);cameraColliders.push({minX:q.min.x,maxX:q.max.x,minY:q.min.y,maxY:q.max.y,minZ:q.min.z,maxZ:q.max.z,owner:id});}
  additionalFurnitureSeats.push({id,name,x,y,z,yaw,width:.9,depth:.9,seatY:y+.66,front:.275});};
 const softLayer=(parent,x,y,z,w,h,d,color)=>{const b=Math.min(.035,h*.30),hw=w/2-b,hd=d/2-b,r=.08,q=new THREE.Shape();q.moveTo(-hw+r,-hd);q.lineTo(hw-r,-hd);q.quadraticCurveTo(hw,-hd,hw,-hd+r);q.lineTo(hw,hd-r);q.quadraticCurveTo(hw,hd,hw-r,hd);q.lineTo(-hw+r,hd);q.quadraticCurveTo(-hw,hd,-hw,hd-r);q.lineTo(-hw,-hd+r);q.quadraticCurveTo(-hw,-hd,-hw+r,-hd);q.closePath();const m=G.mesh(parent,new THREE.ExtrudeGeometry(q,{depth:h-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:5}),color,x,y-h/2+b,z);m.rotation.x=-Math.PI/2;return m;};
 const consoleTable=(g,x,y,z,w=2.7)=>{const top=table(g,x,y,z,w,.62,.95);H.flowerBranches(g,x-w*.27,top,z);G.vessel(g,x+w*.25,top,z,0x86a8a0,.5);};

 for(const[i,f]of CHINA_TAVERN.floors.entries()){
  const y=f.y,top=f.ceiling,g=new THREE.Group();g.name='China yunlai occupied floor '+(i+1);root.add(g);floorGroups.push(g);
  slab(g,'cn-tavern-room-floor-'+i,16,26,15.2,21,y,.23,i?C.wood:0xc9b28c);
  if(i===0)slab(g,'cn-tavern-ground-hall',16,26,8,15.2,y,.20,C.stone);
  else{
   slab(g,'cn-tavern-cross-hall-'+i,16,26,13.4,15.2,y,.23,C.wood);
   slab(g,'cn-tavern-east-hall-'+i,21.35,26,8,13.4,y,.23,C.wood);
   slab(g,'cn-tavern-north-edge-'+i,16,21.35,8,8.30,y,.23,C.wood);
   slab(g,'cn-tavern-west-edge-'+i,16,16.30,8.30,13.4,y,.23,C.wood);
  }
  const westOpening=i===0?opening('cn-tavern-public-entry','云来楼公共梯厅','z',16,12.1,14.7,y,['compound','tavern-hall-1']):win(g,'z',16,13.65,14.85,y);
  wall(g,'z',16,8,21,y,top,[win(g,'z',16,9.0,11.05,y),westOpening,win(g,'z',16,16.5,19.6,y,i===1)]);
  wall(g,'z',26,8,21,y,top,[win(g,'z',26,9.0,12.4,y),win(g,'z',26,16.5,19.6,y,i===1)]);
  wall(g,'x',8,16,26,y,top,[win(g,'x',8,22.3,25.25,y)]);
  const southWindows=[win(g,'x',21,16.7,19.0,y,i===1),win(g,'x',21,23.0,25.3,y,i===1)];
  if(i===0)southWindows.push(opening('cn-tavern-dining-entry','云来酒楼敞厅','x',21,19.5,22.5,y,['compound','tavern-dining']));
  wall(g,'x',21,16,26,y,top,southWindows);
  // Room ceilings cover only the rooms/cross-hall/east waiting bay. The paired
  // ramp void stays open all the way up to the top hall's real ceiling.
  H.palaceCeiling(g,colliders,cameraColliders,21,18.1,10,5.8,top,i===2);
  H.palaceCeiling(g,colliders,cameraColliders,21,14.3,10,1.8,top);
  H.palaceCeiling(g,colliders,cameraColliders,23.675,10.7,4.65,5.4,top);
  if(i===2)H.palaceCeiling(g,colliders,cameraColliders,18.675,10.7,5.35,5.4,top);
  for(const z of[8,21]){paintedBand(g,'tavern-'+i+'-'+z,21,top-.40,z+(z===21?.22:-.22),10,z===21?0:Math.PI);for(const x of[16,21,26])if(!(i===0&&z===21&&x===21)){G.box(g,x,y+(top-y)/2,z,.22,top-y,.26,C.red);for(const dy of[.20,.37])G.box(g,x,top-dy,z,.55,.10,.54,C.gold);}}
  for(const x of[16,26])G.box(g,x,y+(top-y)/2,15.2,.25,top-y,.25,C.red);
  room('tavern-hall-'+(i+1),'云来楼'+(i+1)+'层公共梯厅',16,26,8,15.2,y,top);
  levels.push({id:'tavern-floor-'+(i+1),name:'云来楼 · '+f.name,y,bounds:CHINA_TAVERN.bounds});
  lightingZones.push({id:'tavern-floor-'+(i+1),minX:15.8,maxX:26.2,minZ:7.8,maxZ:21.2,minY:y-.1,maxY:top+.1,floorY:y});
  for(const[x,z]of[[23.55,11.1],[18.5,18],[23.5,18]])upperFixture(g,'tavern-'+i+'-'+x+'-'+z,x,top-.54,z,y);
  sign(g,f.name,23.5,top-.75,8.21,3.5,.57);
  sign(g,'公共梯厅',21.1,top-.47,15.01,2.9,.46,Math.PI);
  target('cn-tavern-hall-'+(i+1),f.name+'公共走廊',[22.7,y,14.15],'tavern-hall-'+(i+1));
  // Both2.05m flights and the1.65m turning landing remain within the envelope.
  if(i<2){const next=CHINA_TAVERN.floors[i+1].y,mid=(y+next)/2,p='cn-tavern-stair-'+(i+1);
   stairs(g,p+'-west','z',16.55,18.60,10.0,13.4,mid,y,10);
   slab(g,p+'-landing',16.3,21.35,8.30,10.0,mid,.23,C.wood);
   stairs(g,p+'-east','z',18.95,21.00,10.0,13.4,mid,next,10);
   rail(g,p+'-landing-back',[16.3,8.30],[21.35,8.30],mid);
   for(const[id,a,b]of[['west',[16.3,8.3],[16.3,10]],['east',[21.35,8.3],[21.35,10]],['center',[18.60,10],[18.95,10]]])landingRail(g,p+'-landing-'+id,a,b,mid);
   for(const[id,a,b]of[['west',[16.3,8.3],[16.3,13.4]],['east',[21.35,8.3],[21.35,13.4]],['back',[16.3,8.3],[21.35,8.3]]])rail(g,p+'-void-'+id,a,b,next);
   if(i===1)rail(g,p+'-top-closed-mouth',[16.3,13.4],[18.77,13.4],next);
   else landingRail(g,p+'-mouth-center',[18.60,13.4],[18.95,13.4],next);
  }
 }
 const[g0,g1,g2]=floorGroups;
 // Wide public dining threshold and a side reception/waiting bay.
 wall(g0,'x',15.2,16,26,.215,3.77,[opening('cn-tavern-dining-hall','酒楼与公共梯厅','x',15.2,20.0,23.0,.215,['tavern-dining','tavern-hall-1'])]);
 room('tavern-dining','云来一层酒楼',16,26,15.2,21,.215,3.77);
 for(const[x,z]of[[18.1,18.1],[23.9,18.1]]){const top=table(g0,x,.215,z,1.45,1.12,.90);H.teaSet(g0,x,top,z,0xb9c7ac);H.bowl(g0,x-.35,top,z+.24,0xf1dfbb,.18);for(const[side,yaw]of[[-1,0],[1,Math.PI]])chair(g0,'china-tavern-dining-'+x+'-'+side,'酒楼雕花餐椅',x,.215,z+side*1.32,yaw);}
 const counter=table(g0,24.35,.215,10.34,2.5,.78,1.0);H.teaSet(g0,23.50,counter,10.34,0xa8b0a0);buildTavernKitchen(G,{group:g0,block,table,H});
 room('tavern-kitchen','云来酒楼 · 后厨备餐间',21.95,26,8,10.65,.215,3.77);
 sign(g0,'云来酒楼',21,3.23,21.24,3.45,.61);
 sign(g0,'云来酒楼',15.76,3.13,13.4,3.20,.59,-Math.PI/2);
 target('cn-tavern-dining','酒楼中央过道',[21,.215,18.2],'tavern-dining');

 // Two independently enclosed rooms. Opaque inset leaves open into empty
 // arrival bays, never across the public cross-hall or into the beds.
 wall(g1,'x',15.2,16,26,4.015,7.57,[opening('cn-tavern-lan-door','兰房私门','x',15.2,18.15,20.35,4.015,['tavern-guest-lan','tavern-hall-2']),opening('cn-tavern-zhu-door','竹房私门','x',15.2,23.15,25.35,4.015,['tavern-guest-zhu','tavern-hall-2'])]);
 wall(g1,'z',21,15.2,21,4.015,7.57);
 for(const [j,name,key,color]of[[0,'兰房','lan',0x8a728e],[1,'竹房','zhu',0x587b68]]){
  const x0=16+j*5,x=x0+1.65,z=18.50,y=4.015,bedId='china-tavern-bed-'+key,w=2.20,d=3.10;
  room('tavern-guest-'+key,'云来客栈 · '+name,x0,x0+5,15.2,21,y,7.57);
  const bed=new THREE.Group();bed.name=name+' carved timber bed';bed.position.set(x,y-.015,z);g1.add(bed);
  for(const dx of[-.90,.90])for(const dz of[-1.30,1.30])G.box(bed,dx,.29,dz,.17,.58,.17,C.dark);
  G.box(bed,0,.60,0,w,.14,d,C.wood);softLayer(bed,0,.75,0,w-.10,.16,d-.10,0xefdfc0);
  softLayer(bed,0,.845,.15,w-.16,.045,d-.50,color);softLayer(bed,0,.885,-1.30,1.10,.10,.34,0xf1dfbd);
  G.box(bed,0,1.13,-d/2,w+.10,1.36,.16,C.dark);G.box(bed,0,1.20,-d/2+.10,w-.18,.80,.03,color);
  for(const dx of[-.82,0,.82]){G.box(bed,dx,1.20,-d/2+.125,.065,.79,.03,C.gold);if(dx)G.box(bed,dx,.868,.5,.018,.004,1.85,C.gold);}
  // One hull per bed for safe mount exclusion, supported quilt contacts remain real.
  colliders.push({minX:x-w/2,maxX:x+w/2,minY:y-.015,maxY:y+1.78,minZ:z-d/2,maxZ:z+d/2});cameraColliders.push({...colliders.at(-1)});
  additionalFurniture.push({id:bedId,guestRoomId:'tavern-guest-'+key,kind:'bed',name:'云来客栈 · '+name+'安寝',worldLabel:name+'客榻',position:[x0+3.7,y,z],exitPositions:[[x0+3.7,y,z],[x0+3.7,y,20.0]],anchor:[x,y,z],center:[x,y-.015,z],size:[w,1.8,d],yaw:0,supportY:y+.815,lieOffset:.30,lieSupport:{hip:y+.8525,back:y+.8525,head:y+.920,heel:y+.8525},action:'躺下休息'});
  const wx=x0+3.87,wz=20.45;block(g1,wx,y+1.03,wz,1.15,2.06,.62,C.dark);for(const s of[-1,1]){G.box(g1,wx+s*.27,y+1.11,wz-.325,.50,1.71,.04,color);G.box(g1,wx+s*.12,y+1.14,wz-.36,.045,.18,.055,C.gold);}G.box(g1,wx,y+2.11,wz,1.25,.13,.76,C.wood);
  additionalFurniture.push({id:'china-tavern-wardrobe-'+key,guestRoomId:'tavern-guest-'+key,kind:'wardrobe',name:name+'衣柜',position:[wx,y,19.25],center:[wx,y,wz],size:[1.15,2.18,.72],style:'authored',action:'挑选服装'});
  sign(g1,name,x0+3.25,6.99,14.99,1.45,.52,Math.PI);
  target('cn-tavern-'+key+'-entry',name+'空闲前室',[x0+3.2,y,16.35],'tavern-guest-'+key);
 }
 sign(g1,'二层客栈',21,7.03,21.23,3.45,.58);consoleTable(g1,24.0,4.015,9.15,2.7);chair(g1,'china-tavern-lobby-seat','客栈公共候坐椅',24.7,4.015,12.3,Math.PI,'reading');

 // Top floor: a deep textile-backed performance room and a separate banquet
 // salon, both reached from the same public hall. No beds or erotic animations.
 wall(g2,'x',15.2,16,26,7.815,11.57,[opening('cn-tavern-performance-entry','青楼琴歌雅集敞厅','x',15.2,19.0,21.6,7.815,['tavern-performance','tavern-hall-3']),opening('cn-tavern-banquet-entry','青楼宴饮厅','x',15.2,23.3,25.4,7.815,['tavern-banquet','tavern-hall-3'])]);
 wall(g2,'z',22.3,15.2,21,7.815,11.57,[opening('cn-tavern-salon-arch','琴歌厅与宴饮雅间','z',22.3,17.1,19.4,7.815,['tavern-performance','tavern-banquet'])]);
 room('tavern-performance','顶层青楼 · 琴歌雅集厅',16,22.3,15.2,21,7.815,11.57);room('tavern-banquet','顶层青楼 · 宴饮雅间',22.3,26,15.2,21,7.815,11.57);
 rug(g2,19.15,7.815,18.2,5.40,4.65,0x8c4255);
 // Soft deep pleats belong to the backdrop wall; their depth does not block the aisle.
 for(let i=0;i<19;i++)G.box(g2,16.55+i*.28,9.45,20.69,.19,2.85,.16,i%2?0x9c4350:0x7c3348);
 G.box(g2,19.10,10.90,20.67,5.55,.22,.23,C.gold);
 const qinTop=table(g2,18.8,7.815,19.50,2.42,.61,.90);
 // Original seven-string qin with tapered body, bridges and golden studs.
 const qin=new THREE.Group();qin.name='云来楼 seven-string qin';qin.position.set(18.8,qinTop+.07,19.50);g2.add(qin);const outline=new THREE.Shape();outline.moveTo(-1.06,-.13);for(const[x,z]of[[-.88,-.18],[-.65,-.18],[-.43,-.145],[.48,-.14],[.72,-.17],[1.06,-.12],[1.06,.12],[.72,.17],[.48,.14],[-.43,.145],[-.65,.18],[-.88,.18],[-1.06,.13]])outline.lineTo(x,z);outline.closePath();const body=G.mesh(qin,new THREE.ExtrudeGeometry(outline,{depth:.12,bevelEnabled:false}),0x382c2b,0,-.06,0);body.rotation.x=-Math.PI/2;for(const x of[-.88,.81])G.box(qin,x,.09,0,.035,.075,.36,C.gold);for(let i=0;i<7;i++)G.box(qin,0,.083,(i-3)*.041,1.98,.009,.007,0xd7c8a0);
 for(const x of[17.5,20.65])chair(g2,'china-tavern-listening-'+x,'青楼听曲椅',x,7.815,16.85,0,'hall');
 const banquetTop=table(g2,24.2,7.815,18.2,1.36,1.10,.92);H.teaSet(g2,24.2,banquetTop,18.2,0xc29c74);H.bowl(g2,23.85,banquetTop,18.4,0xf0debd,.19);for(const[side,yaw]of[[-1,0],[1,Math.PI]])chair(g2,'china-tavern-banquet-'+side,'青楼宴饮椅',24.2,7.815,18.2+side*1.34,yaw,'hall');
 consoleTable(g2,24.25,7.815,9.0,2.9);sign(g2,'琴歌雅集',19.1,10.65,20.46,3.3,.54,Math.PI);sign(g2,'宴饮',24.2,10.87,15.42,1.8,.50);
 sign(g2,'三层青楼',21,10.90,21.23,3.5,.58);
 const salonDesk=table(g2,24.15,7.815,11.3,2.6,.78,1.0);H.teaSet(g2,24.85,salonDesk,11.3,0xb7afa0);G.box(g2,23.5,salonDesk+.035,11.3,.46,.07,.35,0x744741);sign(g2,'雅集接待',24.15,10.15,11.72,2.12,.46);
 target('cn-tavern-salon-desk','三层青楼接待案',[24.15,7.815,12.65],'tavern-hall-3');
 target('cn-tavern-recital','青楼雅集听曲区',[20.6,7.815,18.4],'tavern-performance');

 // Continuous perimeter eaves mark genuine floors. A narrower raised top roof
 // and extended front eave give this commercial house its own silhouette.
 const eave=(a,b,c,d)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));geo.computeVertexNormals();G.mesh(roof,geo,0x4f7774,0,0,0,{side:THREE.DoubleSide});};
 for(const y of[4.015,7.815]){for(const[z0,z1]of[[7.88,7.25],[21.12,21.85]]){eave([15.88,y+.12,z0],[26.12,y+.12,z0],[26.65,y-.20,z1],[15.35,y-.20,z1]);G.box(roof,21,y-.24,z1,11.30,.16,.14,C.red);}for(const[x0,x1]of[[15.88,15.35],[26.12,26.65]])eave([x0,y+.12,7.88],[x0,y+.12,21.12],[x1,y-.20,21.85],[x1,y-.20,7.25]);}
 H.palaceRoof(roof,21,11.83,14.5,11.65,14.75,1.55,0x4f7774);
 H.palaceRoof(roof,21,13.20,14.5,5.1,11.1,.82,0x4f7774);
 // No ground porch or column projects west into the accepted x14.9 patrol.
 stations.push({id:'cn-tavern-host',name:'云来酒楼 · 迎客茶案',action:'看看酒楼菜牌',position:[22.35,.215,11.7],npcPosition:[24.1,.215,11.40],workTarget:[24.1,1.32,10.68],npcName:'许安',npcAction:'tea',npcLabel:'掌柜 · 迎客点菜',npcRotation:Math.PI,route:[[23.6,.215,13.95],[21,.215,18.1]],color:'#bd8b58',age:38,dialogue:'云来楼一层用饭，二层客房，三层雅集。客榻可以暂歇，坐到餐椅后招呼我，今日有云来菌菇饭。客房先供暂歇，订房账册还未开。'});
 stations.push({id:'cn-tavern-cook',name:'云来酒楼 · 后厨',npcOnly:true,action:'照料灶火',position:[23.3,.215,9.36],npcPosition:[23.3,.215,9.36],workTarget:[23.3,1.29,8.86],npcName:'沈禾',npcAction:'cook',npcLabel:'厨师 · 备菜候单',npcRotation:Math.PI,color:'#6f8470',age:32,ageYears:32,dialogue:'今日菌菇新鲜。掌柜报了桌位，我便动手，热饭要趁热端去。'});
 stations.push({id:'cn-tavern-reception',name:'三层青楼 · 雅集接待',action:'请接待引见艺者',position:[24.15,7.815,12.65],npcPosition:[24.15,7.815,10.45],workTarget:[24.15,8.95,11.3],npcName:'温晚',npcAction:'tea',npcLabel:'接待 · 引见与安排雅间',npcRotation:0,color:'#9e617a',age:41,ageYears:41,dialogue:'柳清弦今日在楼上诵词。想请她茶叙，我可以代为引见；她会亲自来答复。茶叙暂不收银。'});
 stations.push({id:'cn-tavern-reciter',name:'顶层青楼 · 成年诗乐雅集',action:'听诗词吟诵',playerAction:'relax',position:[20.70,7.815,18.25],npcPosition:[18.8,7.815,18.66],workTarget:[18.8,8.98,17.9],playerWorkTarget:[18.8,9.02,18.66],npcName:'柳清弦',npcAction:'read',npcLabel:'成年艺者 · 诵词与歇场',npcRotation:Math.PI,route:[[20.55,7.815,19.35],[23.1,7.815,14.1]],color:'#ab7287',age:27,ageYears:27,salon:{activities:['poetry'],willing:true,preference:'喜静谈与诗词，不喜喧闹宴饮'},dialogue:'这里先有诗词吟诵和茶叙。琴案可观赏，奏琴与舞步还在排练；请在前方听席稍坐。'});
 root.traverse(o=>{if(o.userData.nightFixture)o.userData.nightFixture.dayFactor=.48;});
 buildings.push({id:CHINA_TAVERN.id,name:CHINA_TAVERN.name,groupName:root.name,roofGroupName:roof.name,bounds:CHINA_TAVERN.bounds,storeys:3,roomIds:CHINA_TAVERN.floors.flatMap(f=>f.rooms)});
 // Material batches stay per floor, so top-floor decor does not create hundreds
 // of runtime draw calls and no separate façade-only storey is introduced.
 const pack=()=>{for(const g of floorGroups)H.packStatic(g);H.packStatic(roof);};
 return {group:root,roofGroup:roof,additionalFurniture,stations,program:CHINA_TAVERN,pack};
}
