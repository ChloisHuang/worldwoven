import {clinicPlaque} from './china-clinic-lettering.js';
import {buildChinaRoyalChair} from './china-royal-seating.js';

// A fictional public service, with no real diagnosis, formula or health effect.
export const CHINA_CLINIC=Object.freeze({
 id:'clinic-pharmacy',name:'安和医馆 · 药铺',floorY:.215,
 bounds:{minX:16,maxX:26,minZ:-33,maxZ:-23},
 seatId:'china-clinic-consult-seat',
 points:{doctor:[18.45,.215,-30.65],paper:[18.45,1.09,-30.08],consult:[18.45,.215,-28.38],
  doctorHandoff:[20.55,.215,-28.1],assistantHandoff:[21.45,.215,-28.1],
  assistant:[23.6,.215,-29.18],counter:[23.6,.215,-26.87],counterTop:[23.6,1.13,-27.48],
  stockDoor:[24,.215,-30.4],stock:[24,.215,-31.65],stockWork:[24,1.08,-32.14]},
 roles:[{id:'cn-clinic-physician',npcName:'许宁 · 医师',ageYears:43},{id:'cn-pharmacy-assistant',npcName:'苏禾 · 药铺助手',ageYears:27}],
 packet:{id:'cloud-letter',name:'云纹包',description:'宫苑故事用的虚构纸包，无现实药物配方或健康效果'},
});

export function buildChinaClinic(G,A){
 const {THREE}=G,{H,C,group,roofGroup,rooms,colliders,cameraColliders,interiorRooms,explorationTargets,buildings,lightingZones,additionalFurnitureSeats,palaceWall,door,slab,window,table,upperFixture,solid3}=A;
 const g=new THREE.Group(),r=new THREE.Group();g.name='China building clinic-pharmacy';r.name='China roof clinic-pharmacy';group.add(g);roofGroup.add(r);rooms.clinic={g,r};
 const wall=(axis,at,from,to,openings=[])=>palaceWall(g,colliders,cameraColliders,{axis,at,from,to,bottom:.2,top:3.85,depth:.32,color:C.cream,openings});
 const portal=(id,name,axis,at,from,to,ids)=>door(id,name,axis,at,from,to,3.15,ids,.2);
 const win=(axis,at,from,to)=>{window(g,axis==='x'?(from+to)/2:at,axis==='x'?at:(from+to)/2,to-from,axis,1.55,2.18);return {from,to,bottom:1.405,top:2.955};};
 slab(g,'cn-clinic-floor',16,26,-33,-23,.215,.20,C.stone);
 slab(g,'cn-clinic-porch',17,25,-23,-21.8,.215,.20,C.stone);
 wall('x',-23,16,26,[win('x',-23,16.7,18.2),portal('cn-clinic-front','安和医馆与药铺正门','x',-23,19.3,22.1,['clinic-waiting','outdoors']),win('x',-23,23.2,25.3)]);
 wall('x',-33,16,26,[win('x',-33,17,19.5)]);
 wall('z',16,-33,-23,[win('z',16,-31.4,-29.7),win('z',16,-25.1,-23.8)]);
 wall('z',26,-33,-23,[win('z',26,-29.4,-27.8),win('z',26,-25.4,-23.8)]);
 wall('x',-26,16,21,[portal('cn-clinic-consult-door','医馆问诊室门','x',-26,18.3,20.3,['clinic-consult','clinic-waiting'])]);
 wall('z',21,-33,-26,[portal('cn-clinic-handoff','医师与药铺交单口','z',21,-29.5,-26.7,['clinic-consult','clinic-pharmacy'])]);
 wall('x',-30.4,21,26,[portal('cn-clinic-stock-door','药铺备物间门','x',-30.4,23,25,['clinic-stock','clinic-pharmacy'])]);
 H.palaceCeiling(r,colliders,cameraColliders,21,-28,10,10,3.85,false);H.palaceRoof(r,21,4.07,-28,11.3,11.3,1.22,C.roof);
 for(const x of[16,21,26])for(const z of[-33,-23])solid3(g,x,1.92,z,.23,3.45,.27,C.red);
 for(const z of[-23,-33]){G.box(g,21,3.56,z,10,.27,.39,C.red);G.box(g,21,3.7,z,10,.05,.43,C.gold);}
 const part=(id,name,minX,maxX,minZ,maxZ)=>interiorRooms.push({id,name,minX,maxX,minZ,maxZ,floorY:.215,ceiling:3.85});
 part('clinic-waiting','医馆 · 公共候诊',16,26,-26,-23);part('clinic-consult','医馆 · 独立问诊室',16,21,-33,-26);part('clinic-pharmacy','药铺 · 交单与领取',21,26,-30.4,-26);part('clinic-stock','药铺 · 备物间',21,26,-33,-30.4);
 const chair=(id,name,x,z,yaw)=>{buildChinaRoyalChair(g,{x,y:.2,z,yaw,variant:'reading',id});G.collider(colliders,x,z,.9,.9);cameraColliders.push({minX:x-.45,maxX:x+.45,minY:.2,maxY:1.85,minZ:z-.45,maxZ:z+.45});additionalFurnitureSeats.push({id,name,x,y:.215,z,yaw,width:.9,depth:.9,seatY:.875,front:.27});};
 chair(CHINA_CLINIC.seatId,'医馆问诊椅 · 坐下候诊',18.45,-28.11,Math.PI);
 chair('china-clinic-waiting-seat','医馆候诊椅',16.95,-24.55,Math.PI/2);
 table(g,18.45,-29.65,2.05,.90,1.0);
 // Paper, brush rest and ink stone occupy the reachable northern desk edge.
 G.box(g,18.45,1.075,-30.03,.77,.012,.43,0xeee0bd);G.box(g,17.8,1.11,-29.9,.28,.06,.20,0x3f493c);H.beam(g,[18.95,1.10,-29.76],[19.04,1.10,-30.10],.018,C.wood);
 table(g,23.6,-28,3.3,.98,1.04);G.box(g,23.6,.67,-27.49,3.32,.61,.07,0x477b70);G.box(g,23.6,1.105,-27.64,.74,.025,.31,0xa77d50);
 const cabinet=(x,z,w,rows,rot=0)=>{const q=new THREE.Group();q.position.set(x,.2,z);q.rotation.y=rot;g.add(q);G.box(q,0,1.2,0,w,2.4,.48,C.wood);for(let j=0;j<rows;j++)for(let i=0;i<3;i++){const xx=(i-1)*w/3,yy=.35+j*.49;G.box(q,xx,yy,.26,w/3-.05,.40,.055,0xa37e55);G.box(q,xx,yy,.305,.14,.085,.034,C.gold);}const d=rot?.48:w,depth=rot?w:.48;colliders.push({minX:x-d/2,maxX:x+d/2,minZ:z-depth/2,maxZ:z+depth/2,minY:.2,maxY:2.6});cameraColliders.push({...colliders.at(-1)});};
 cabinet(25.56,-31.65,1.85,4,-Math.PI/2);cabinet(17.5,-32.55,2.3,4);cabinet(21.45,-31.65,1.85,4,Math.PI/2);
 table(g,23.65,-32.46,2.2,.66,1.0);G.box(g,24,1.077,-32.13,.65,.018,.31,0xd9bd83);
 for(const [x,z]of[[17.05,-32.43],[17.72,-32.43],[24.5,-32.48]]){G.vessel(g,x,2.64,z,0xa2bba1,.33);}
 const sign=clinicPlaque(G,g,'医馆药铺',20.7,3.49,-22.77,3.5,.64);sign.userData.facilitySign=true;
 for(const [text,x,y,z,w]of[['候诊',17.5,2.6,-23.21,1.5],['问诊',19.3,3.43,-25.77,1.55],['药铺',24.1,3.04,-30.19,1.65],['药库',24,3.44,-30.19,1.5]])clinicPlaque(G,g,text,x,y,z,w,.52);
 for(const [id,x,z]of[['waiting',20.7,-24.5],['consult',18.5,-28.5],['pharmacy',23.5,-29.3]])upperFixture(g,'clinic-'+id,x,3.35,z,.215);
 lightingZones.push({id:'clinic-pharmacy',minX:15.8,maxX:26.2,minZ:-33.2,maxZ:-22.8,minY:.1,maxY:3.85,floorY:.215});
 for(const [id,name,position,roomId]of[['cn-clinic-entry','医馆药铺正门',[20.7,.215,-21.3],'outdoors'],['cn-clinic-waiting','医馆候诊厅',[20.7,.215,-24.7],'clinic-waiting'],['cn-clinic-consult','医馆问诊椅',[18.45,.215,-27.1],'clinic-consult'],['cn-pharmacy-counter','药铺领取柜台',CHINA_CLINIC.points.counter,'clinic-pharmacy'],['cn-clinic-east-passage','医馆外东侧巡查通道',[27.15,.115,-27.5],'outdoors']])explorationTargets.push({id,name,position,roomId});
 buildings.push({id:CHINA_CLINIC.id,name:CHINA_CLINIC.name,groupName:g.name,roofGroupName:r.name,bounds:CHINA_CLINIC.bounds,storeys:1,roomIds:['clinic-waiting','clinic-consult','clinic-pharmacy','clinic-stock'],eastPassage:{centerX:27.15,width:2.35}});
 return CHINA_CLINIC;
}

export function chinaClinicStations(){const P=CHINA_CLINIC.points;return CHINA_CLINIC.roles.map((role,i)=>({...role,name:i?'安和药铺 · 凭号领取':'安和医馆 · 坐诊开单',action:i?'凭编号领取云纹包':'坐下候诊',npcOnly:!i,position:i?P.counter:[18.45,.215,-27.1],npcPosition:i?P.assistant:P.doctor,npcAction:'clinic-duty',npcLabel:i?'柜台候单 · 按号备物':'问诊室候诊',color:'#83a392',interactionRadius:1.55,dialogue:'这里是宫苑故事里的医馆。先在问诊椅坐下，开单后凭同一编号到药铺领取虚构云纹包。'}));}
