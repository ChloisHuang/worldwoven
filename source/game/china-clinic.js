import {clinicPlaque} from './china-clinic-lettering.js';

// One house: public stairs link the ground-floor pharmacy to the upstairs
// clinic. This is a fictional service, with no real diagnosis or formula.
export const CHINA_CLINIC=Object.freeze({
 id:'clinic-pharmacy',name:'安和医馆 · 药铺',floorY:.215,clinicFloorY:4.015,storeys:2,
 bounds:{minX:16,maxX:26,minZ:-33,maxZ:-23},
 floors:[{y:.215,ceiling:3.77,name:'一层药铺'},{y:4.015,ceiling:7.57,name:'二层医馆'}],
 stairHall:{minX:16.3,maxX:21.35,minZ:-32.7,maxZ:-26.4,landing:{minX:16.3,maxX:21.35,minZ:-32.7,maxZ:-31,y:2.115}},
 seatId:'china-clinic-consult-seat',
 points:{doctor:[23.55,4.015,-30.65],paper:[23.55,4.89,-30.08],consult:[23.55,4.015,-28.38],
  doctorHandoff:[23.0,4.015,-24.75],assistantHandoff:[22.1,4.015,-24.75],
  assistant:[23.6,.215,-29.18],counter:[23.6,.215,-26.87],counterTop:[23.6,1.13,-27.48],
  stockDoor:[24,.215,-30.4],stock:[24,.215,-31.65],stockWork:[24,1.08,-32.14]},
 roles:[{id:'cn-clinic-physician',npcName:'许宁 · 医师',ageYears:43},{id:'cn-pharmacy-assistant',npcName:'苏禾 · 药铺助手',ageYears:27}],
 packet:{id:'cloud-letter',name:'云纹包',description:'凭问询单按号领取，配合休息进行照护'},
});

export function buildChinaClinic(G,A){
 const {THREE}=G,{H,C,group,roofGroup,rooms,colliders,cameraColliders,interiorRooms,doorways,explorationTargets,buildings,levels,lightingZones,additionalFurnitureSeats,palaceWall,door,slab,stairs,rail,landingRail,window,upperFixture,solid3}=A;
 const g=new THREE.Group(),r=new THREE.Group();g.name='China building clinic-pharmacy';r.name='China roof clinic-pharmacy';group.add(g);roofGroup.add(r);rooms.clinic={g,r};
 const wall=(axis,at,from,to,y,top,openings=[])=>palaceWall(g,colliders,cameraColliders,{axis,at,from,to,bottom:y-.015,top,depth:.32,color:C.cream,openings});
 const portal=(id,name,axis,at,from,to,y,ids)=>{const op=door(id,name,axis,at,from,to,y+2.85,ids,y-.015);doorways.at(-1).floorFit={bottom:y,top:y+2.85};return op;};
 const win=(axis,at,from,to,y)=>{window(g,axis==='x'?(from+to)/2:at,axis==='x'?at:(from+to)/2,to-from,axis,1.55,y+1.965);return {from,to,bottom:y+1.19,top:y+2.74};};
 const part=(id,name,minX,maxX,minZ,maxZ,y,ceiling)=>interiorRooms.push({id,name,minX,maxX,minZ,maxZ,floorY:y,ceiling});
 slab(g,'cn-clinic-floor',16,26,-33,-23,.215,.20,C.stone);
 slab(g,'cn-clinic-porch',17,25,-23,-21.8,.215,.20,C.stone);
 // The upper floor and the lower ceiling leave the complete stairwell open.
 slab(g,'cn-clinic-upper-clinic',21.35,26,-33,-26.4,4.015,.23,C.wood);
 slab(g,'cn-clinic-upper-waiting',16,26,-26.4,-23,4.015,.23,C.wood);
 slab(g,'cn-clinic-upper-north-edge',16,21.35,-33,-32.7,4.015,.23,C.wood);
 slab(g,'cn-clinic-upper-west-edge',16,16.3,-32.7,-26.4,4.015,.23,C.wood);
 for(const [i,f]of CHINA_CLINIC.floors.entries()){
  const y=f.y,top=f.ceiling;
  const front=[win('x',-23,16.7,18.2,y),win('x',-23,23.2,25.3,y)];
  if(i===0)front.push(portal('cn-clinic-front','一层药铺与公共楼梯正门','x',-23,19.3,22.1,y,['clinic-stair-hall','outdoors']));
  else front.push(win('x',-23,19.4,21.9,y));
  wall('x',-23,16,26,y,top,front);
  wall('x',-33,16,26,y,top,[win('x',-33,22.3,24.9,y)]);
  wall('z',16,-33,-23,y,top,[win('z',16,-30.8,-28.7,y),win('z',16,-25.4,-23.8,y)]);
  wall('z',26,-33,-23,y,top,[win('z',26,-29.4,-27.8,y),win('z',26,-25.4,-23.8,y)]);
  for(const x of[16,21,26])for(const z of[-33,-23])if(z!==-23||x!==21)solid3(g,x,y+(top-y)/2,z,.23,top-y,.27,C.red);
  for(const z of[-23,-33]){G.box(g,21,top-.29,z,10,.27,.39,C.red);G.box(g,21,top-.15,z,10,.05,.43,C.gold);}
  levels.push({id:'clinic-floor-'+(i+1),name:f.name,y,bounds:CHINA_CLINIC.bounds});
  lightingZones.push({id:'clinic-floor-'+(i+1),minX:15.8,maxX:26.2,minZ:-33.2,maxZ:-22.8,minY:y-.1,maxY:top+.1,floorY:y});
 }
 wall('x',-30.4,21.35,26,.215,3.77,[portal('cn-clinic-stock-door','一层药铺备物间门','x',-30.4,23,25,.215,['clinic-stock','clinic-pharmacy'])]);
 wall('z',21.35,-33,-30.4,.215,3.77);
 wall('x',-26.4,21.35,26,4.015,7.57,[portal('cn-clinic-consult-door','二层医馆独立问诊室门','x',-26.4,21.7,23.9,4.015,['clinic-consult','clinic-waiting'])]);
 wall('z',21.35,-33,-26.4,4.015,7.57);
 H.palaceCeiling(g,colliders,cameraColliders,23.675,-29.7,4.65,6.6,3.77,false);
 H.palaceCeiling(g,colliders,cameraColliders,21,-24.7,10,3.4,3.77,false);
 H.palaceCeiling(r,colliders,cameraColliders,21,-28,10,10,7.57,false);H.palaceRoof(r,21,7.79,-28,11.3,11.3,1.22,C.roof);
 // Two generous flights and a1.7m turning landing. Neither store's private
 // room lies on this route. Rail returns close every exposed upper edge.
 stairs(g,'cn-clinic-stair-west','z',16.55,18.6,-31,-26.4,2.115,.215,11);
 slab(g,'cn-clinic-stair-landing',16.3,21.35,-32.7,-31,2.115,.23,C.wood);
 stairs(g,'cn-clinic-stair-east','z',18.95,21,-31,-26.4,2.115,4.015,11);
 // North/west exterior masonry and east stock wall already enclose the turn.
 for(const[id,a,b]of[['center',[18.6,-31],[18.95,-31]],['mouth-west',[16.3,-31],[16.55,-31]],['mouth-east',[21,-31],[21.35,-31]]])landingRail(g,'cn-clinic-landing-'+id,a,b,2.115);
 // Upper north/west walls and the eastern consultation wall protect the well.
 rail(g,'cn-clinic-upper-closed-mouth',[16.3,-26.4],[18.95,-26.4],4.015);
 landingRail(g,'cn-clinic-upper-mouth-east',[21,-26.4],[21.35,-26.4],4.015);
 part('clinic-stair-hall','一层药铺 · 公共梯厅',16,21.35,-33,-23,.215,3.77);
 part('clinic-pharmacy','一层药铺 · 交单与领取',21.35,26,-30.4,-23,.215,3.77);
 part('clinic-stock','一层药铺 · 备物间',21.35,26,-33,-30.4,.215,3.77);
 part('clinic-waiting','二层医馆 · 公共候诊与交单平台',16,26,-26.4,-23,4.015,7.57);
 part('clinic-consult','二层医馆 · 独立问诊室',21.35,26,-33,-26.4,4.015,7.57);
 const chair=(id,name,x,y,z,yaw)=>{
  const q=new THREE.Group();q.name=name;q.position.set(x,y-.015,z);q.rotation.y=yaw;g.add(q);const members=[];
  const member=(xx,yy,zz,w,h,d,color)=>{G.box(q,xx,yy,zz,w,h,d,color);members.push({xx,yy,zz,w,h,d});};
  for(const xx of[-.34,.34])for(const zz of[-.31,.31])member(xx,.265,zz,.075,.53,.075,C.wood);
  member(0,.58,0,.86,.10,.86,C.wood);member(0,.6525,0,.76,.045,.74,0x79968a);
  for(const xx of[-.35,.35])member(xx,.78,-.33,.07,.53,.07,C.wood);
  member(0,.91,-.33,.77,.28,.075,C.wood);member(0,1.06,-.33,.82,.045,.09,C.gold);
  colliders.push({minX:x-.45,maxX:x+.45,minY:y-.015,maxY:y+1.1,minZ:z-.45,maxZ:z+.45});q.updateWorldMatrix(true,true);
  for(const m of members){const b=new THREE.Box3(new THREE.Vector3(m.xx-m.w/2,m.yy-m.h/2,m.zz-m.d/2),new THREE.Vector3(m.xx+m.w/2,m.yy+m.h/2,m.zz+m.d/2)).applyMatrix4(q.matrixWorld);cameraColliders.push({minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});}
  additionalFurnitureSeats.push({id,name,x,y,z,yaw,width:.9,depth:.9,seatY:y+.66,front:.27});
 };
 const table=(x,y,z,w,d,h=1)=>{const q=new THREE.Group();q.position.y=y-.015;g.add(q);G.table(q,x,z,w,d,C.wood,h);colliders.push({minX:x-w/2,maxX:x+w/2,minY:y-.015,maxY:y+h+.075,minZ:z-d/2,maxZ:z+d/2});cameraColliders.push({...colliders.at(-1)});};
 chair(CHINA_CLINIC.seatId,'二层医馆问诊椅 · 坐下候诊',23.55,4.015,-28.11,Math.PI);
 chair('china-clinic-waiting-seat','二层医馆候诊椅',17.1,4.015,-24.4,Math.PI/2);
 table(23.55,4.015,-29.65,2.05,.90,.8);
 G.box(g,23.55,4.875,-30.03,.77,.012,.43,0xeee0bd);G.box(g,22.9,4.91,-29.9,.28,.06,.20,0x3f493c);H.beam(g,[24.05,4.90,-29.76],[24.14,4.90,-30.10],.018,C.wood);
 table(23.6,.215,-28,2.4,.98,.84);G.box(g,23.6,.67,-27.49,2.42,.61,.07,0x477b70);G.box(g,23.6,1.105,-27.64,.74,.025,.31,0xa77d50);
 const cabinet=(x,z,w,rows,rot=0)=>{const q=new THREE.Group();q.position.set(x,.2,z);q.rotation.y=rot;g.add(q);G.box(q,0,1.2,0,w,2.4,.48,C.wood);for(let j=0;j<rows;j++)for(let i=0;i<3;i++){const xx=(i-1)*w/3,yy=.35+j*.49;G.box(q,xx,yy,.26,w/3-.05,.40,.055,0xa37e55);G.box(q,xx,yy,.305,.14,.085,.034,C.gold);}const d=rot?.48:w,depth=rot?w:.48;colliders.push({minX:x-d/2,maxX:x+d/2,minZ:z-depth/2,maxZ:z+depth/2,minY:.2,maxY:2.6});cameraColliders.push({...colliders.at(-1)});};
 cabinet(25.56,-31.65,1.85,4,-Math.PI/2);cabinet(21.79,-31.65,1.85,4,Math.PI/2);cabinet(25.56,-29.1,1.65,4,-Math.PI/2);
 table(23.65,.215,-32.46,2.2,.66,.8);G.box(g,24,1.077,-32.13,.65,.018,.31,0xd9bd83);
 for(const x of[23.0,24.5])G.vessel(g,x,1.1,-32.48,0xa2bba1,.33);
 const sign=(text,x,y,z,w=3,height=.6,rot=0)=>{const p=clinicPlaque(G,g,text,x,y,z,w,height);p.rotation.y=rot;return p;};
 sign('1F药铺',20.7,3.28,-22.77,3.55,.64).userData.facilitySign=true;
 sign('2F医馆',20.7,7.08,-22.77,3.55,.64).userData.facilitySign=true;
 sign('2F医馆',17.6,3.03,-26.18,2.75,.52);sign('候诊',17.1,6.65,-23.21,1.5,.52,Math.PI);
 sign('问诊',22.8,7.08,-26.18,1.65,.52);sign('药铺',23.6,.72,-27.43,1.65,.52);sign('药库',24,3.25,-30.19,1.5,.52);
 for(const[id,x,y,z,floor]of[['stair',19,7.03,-31.8,2.115],['waiting',20.7,7.03,-24.5,4.015],['consult',23.55,7.03,-29,4.015],['pharmacy',23.5,3.23,-29.3,.215],['entry',20.7,3.23,-24.5,.215]])upperFixture(g,'clinic-'+id,x,y,z,floor);
 for(const[id,name,position,roomId]of[['cn-clinic-entry','一层药铺正门',[20.7,.215,-21.3],'outdoors'],['cn-clinic-stair-base','医馆公共楼梯起点',[17.6,.215,-25.5],'clinic-stair-hall'],['cn-clinic-stair-landing','医馆楼梯转身平台',[19,2.115,-31.8],'clinic-stair-hall'],['cn-clinic-stair-top','二层医馆公共楼梯平台',[20,4.015,-25.5],'clinic-waiting'],['cn-clinic-waiting','二层医馆候诊厅',[20.7,4.015,-24.7],'clinic-waiting'],['cn-clinic-consult','二层医馆问诊椅',[23.55,4.015,-27.1],'clinic-consult'],['cn-pharmacy-counter','一层药铺领取柜台',CHINA_CLINIC.points.counter,'clinic-pharmacy'],['cn-clinic-east-passage','医馆外东侧巡查通道',[27.15,.115,-27.5],'outdoors']])explorationTargets.push({id,name,position,roomId});
 buildings.push({id:CHINA_CLINIC.id,name:CHINA_CLINIC.name,groupName:g.name,roofGroupName:r.name,bounds:CHINA_CLINIC.bounds,storeys:2,roomIds:['clinic-stair-hall','clinic-waiting','clinic-consult','clinic-pharmacy','clinic-stock'],eastPassage:{centerX:27.15,width:2.35}});
 return CHINA_CLINIC;
}

export function chinaClinicStations(){const P=CHINA_CLINIC.points;return CHINA_CLINIC.roles.map((role,i)=>({...role,name:i?'一层安和药铺 · 凭号领取':'二层安和医馆 · 坐诊开单',action:i?'凭编号领取云纹包':'坐下候诊',npcOnly:!i,position:i?P.counter:[23.55,4.015,-27.1],npcPosition:i?P.assistant:P.doctor,npcAction:'clinic-duty',npcLabel:i?'一层柜台候单 · 按号备物':'二层问诊室候诊',color:'#83a392',interactionRadius:1.55,dialogue:'沿公共楼梯上二层，在问诊椅坐下；开好单后回一层药铺凭号领取云纹包。'}));}

export function clinicRoleAppearance(region,id,look){
 if(region!=='china')return look;
 if(id==='cn-clinic-physician')return {...look,bodyPreset:'masculine-lean',hairStyle:'low-bun',wardrobePreset:'scholar-long-robe',clothes:0x57796c,accent:0xd2c19c};
 if(id==='cn-pharmacy-assistant')return {...look,bodyPreset:'feminine-balanced',hairStyle:'braided-tail',wardrobePreset:'ruqun-jacket',clothes:0x9c805b,accent:0xc3ceac};
 return look;
}
