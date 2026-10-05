import {moneyHousePlaque} from './china-money-house-lettering.js';

export const CHINA_MONEY_HOUSE=Object.freeze({
 id:'money-house',name:'承光钱庄',floorY:.215,
 bounds:{minX:-26,maxX:-16,minZ:-33,maxZ:-23},
 stationId:'cn-money-house-teller',
 points:{counter:[-21,.215,-26.35],teller:[-21,.215,-28.25],ledger:[-21.30,1.345,-27.72],abacus:[-20.43,1.369,-27.83]},
 role:{id:'cn-money-house-teller',npcName:'陆昭 · 钱庄账房',ageYears:39},
});

export function buildChinaMoneyHouse(G,A){
 const {THREE}=G,{H,C,group,roofGroup,rooms,colliders,cameraColliders,interiorRooms,explorationTargets,buildings,levels,lightingZones,additionalFurnitureSeats,palaceWall,door,slab,window,upperFixture,solid3}=A;
 const g=new THREE.Group(),r=new THREE.Group();g.name='China building money-house';r.name='China roof money-house';group.add(g);roofGroup.add(r);rooms.moneyHouse={g,r};
 const wood=0x63452d,bronze=0xb58d48,green=0x627562;
 const wall=(axis,at,from,to,openings=[])=>palaceWall(g,colliders,cameraColliders,{axis,at,from,to,bottom:.2,top:3.85,depth:.32,color:0xd9c59e,openings});
 const portal=(id,name,at,from,to,ids)=>door(id,name,'x',at,from,to,3.12,ids,.2);
 const win=(axis,at,from,to)=>{window(g,axis==='x'?(from+to)/2:at,axis==='x'?at:(from+to)/2,to-from,axis,1.55,2.20);return {from,to,bottom:1.425,top:2.975};};
 slab(g,'cn-money-house-floor',-26,-16,-33,-23,.215,.20,0xc7b898);
 slab(g,'cn-money-house-porch',-25,-17,-23,-22.1,.215,.20,C.stone);
 wall('x',-23,-26,-16,[win('x',-23,-25.2,-23.5),portal('cn-money-house-front','承光钱庄正门',-23,-22.3,-19.7,['money-house-public','outdoors']),win('x',-23,-18.5,-16.8)]);
 wall('x',-33,-26,-16,[win('x',-33,-24.6,-22.2)]);
 wall('z',-26,-33,-23,[win('z',-26,-31.3,-29.4),win('z',-26,-25.7,-23.9)]);
 wall('z',-16,-33,-23,[win('z',-16,-28.2,-26.5),win('z',-16,-25.5,-23.9)]);
 // The coin store is physically enclosed; the unobstructed east aisle serves it.
 wall('z',-19,-33,-29.6);
 wall('x',-29.6,-19,-16,[portal('cn-money-house-store','钱庄钱库门',-29.6,-18.55,-16.65,['money-house-store','money-house-staff'])]);
 H.palaceCeiling(r,colliders,cameraColliders,-21,-28,10,10,3.85,false);H.palaceRoof(r,-21,4.07,-28,11.3,11.3,1.12,0x697360);
 for(const x of[-26,-16])for(const z of[-33,-23])solid3(g,x,1.92,z,.24,3.45,.28,wood);
 for(const z of[-23,-33]){G.box(g,-21,3.54,z,10,.30,.40,wood);G.box(g,-21,3.73,z,10,.055,.44,bronze);}
 // Waist-high public counter, with joinery, inset panels and a reachable worktop.
 solid3(g,-22, .715,-27.45,5.8,1.00,.92,wood);
 G.box(g,-22,1.235,-27.45,6.02,.12,1.04,0x9e7747);
 for(const x of[-24.25,-22.8,-21.35,-19.9]){G.box(g,x,.735,-26.979,1.25,.66,.035,green);for(const y of[.42,1.05])G.box(g,x,y,-26.95,1.28,.036,.026,bronze);}
 moneyHousePlaque(G,g,'存取',-22.8,.74,-26.93,1.18,.48);
 const coinShape=new THREE.Shape();for(let i=0;i<=20;i++){const a=i*Math.PI/10,x=Math.sin(a)*.080,y=Math.cos(a)*.080;i?coinShape.lineTo(x,y):coinShape.moveTo(x,y);}const hole=new THREE.Path();hole.moveTo(-.025,-.025);hole.lineTo(.025,-.025);hole.lineTo(.025,.025);hole.lineTo(-.025,.025);hole.closePath();coinShape.holes.push(hole);
 const coinGeometry=new THREE.ExtrudeGeometry(coinShape,{depth:.025,bevelEnabled:false,curveSegments:2});
 const coin=(q,x,y,z)=>G.mesh(q,coinGeometry,bronze,x,y,z);
 // Square holes are real cutouts. Five vertical strings stay above the counter.
 for(const x of[-24.3,-23.9,-23.5]){H.beam(g,[x,2.63,-32.70],[x,1.72,-32.70],.015,0x874333);for(let i=0;i<5;i++)coin(g,x,2.44-i*.16,-32.71);}
 // Bound ledgers on the rear work shelf, with cream page blocks and ties.
 solid3(g,-23.3,.77,-32.35,4.8,1.11,.66,wood);G.box(g,-23.3,1.36,-32.35,4.96,.10,.76,0x9e7747);
 for(let j=0;j<3;j++)for(let i=0;i<3;i++)H.boundBook(g,-24.9+i*1.1,1.46+j*.115,-32.35,.70,.47,[green,0x866344,0x9c6953][i]);
 // Open ledger has a crease, ruled columns and handwritten-size marks.
 G.box(g,-21.30,1.311,-27.70,.72,.036,.46,0x684b35);for(const x of[-21.48,-21.13])G.box(g,x,1.335,-27.70,.34,.013,.43,0xecdfb6);
 for(let j=0;j<5;j++)for(const x of[-21.52,-21.15]){G.box(g,x,1.344,-27.85+j*.066,.23,.004,.009,0xa88d63);G.box(g,x+.07,1.348,-27.84+j*.066,.032,.004,.017,0x5a5441);}
 H.beam(g,[-21.73,1.36,-27.83],[-21.70,1.36,-27.53],.014,wood);G.box(g,-21.78,1.33,-27.66,.12,.025,.11,0x404334);
 // Eleven working rods: two upper and five lower biconvex beads per rod.
 const abacus=new THREE.Group();abacus.name='钱庄 eleven-rod abacus';abacus.position.set(-20.43,1.31,-27.71);g.add(abacus);
 for(const x of[-.45,.45])G.box(abacus,x,.045,0,.055,.09,.50,wood);for(const z of[-.25,-.075,.25])G.box(abacus,0,.045,z,.94,.09,.04,wood);
 const beadGeo=new THREE.LatheGeometry([new THREE.Vector2(0,-.021),new THREE.Vector2(.025,-.017),new THREE.Vector2(.035,0),new THREE.Vector2(.025,.017),new THREE.Vector2(0,.021)],8);beadGeo.rotateX(Math.PI/2);
 for(let i=0;i<11;i++){const x=-.38+i*.076;H.beam(abacus,[x,.053,-.235],[x,.053,.23],.009,bronze);for(const z of[-.198,-.147,.005,.05,.095,.14,.185])G.mesh(abacus,beadGeo,0x342e25,x,.059,z);}
 // Enclosed store: banded chests, coin trays and no invented player money.
 for(const [x,z]of[[-18.05,-32.15],[-16.65,-32.15]]){solid3(g,x,.70,z,1.03,.95,.85,wood);G.box(g,x,1.20,z,1.09,.12,.91,0x82613d);for(const dx of[-.30,.30])G.box(g,x+dx,.73,z+.436,.06,.95,.035,bronze);G.box(g,x,.99,z+.47,.16,.19,.045,bronze);}
 for(const x of[-18.3,-17.94,-17.58])for(let i=0;i<4;i++){const c=coin(g,x,1.29+i*.029,-32.12);c.rotation.x=-Math.PI/2;}
 // Human-scale waiting bench with an actual usable seat, clear of the doors.
 solid3(g,-24.78,.50,-24.85,1.08,.55,1.75,wood);G.box(g,-24.78,.82,-24.85,1.13,.095,1.81,green);solid3(g,-25.25,1.09,-24.85,.09,.85,1.81,wood);
 additionalFurnitureSeats.push({id:'china-money-house-waiting-seat',name:'钱庄候坐长凳',x:-24.78,y:.215,z:-24.85,yaw:Math.PI/2,width:1.81,depth:1.12,seatY:.875,front:.27});
 moneyHousePlaque(G,g,'钱庄',-21,3.46,-22.765,2.55,.63).userData.facilitySign=true;
 moneyHousePlaque(G,g,'账房',-23.0,2.75,-32.77,1.75,.52);
 moneyHousePlaque(G,g,'钱库',-17.6,3.45,-29.37,1.62,.48);
 for(const [id,x,z]of[['entry',-21,-24.4],['counter',-22,-29.5],['store',-17.55,-31]])upperFixture(g,'money-house-'+id,x,3.38,z,.215);
 const part=(id,name,minX,maxX,minZ,maxZ)=>interiorRooms.push({id,name,minX,maxX,minZ,maxZ,floorY:.215,ceiling:3.85});
 part('money-house-public','钱庄 · 候坐与存取',-26,-16,-27.45,-23);part('money-house-staff','钱庄 · 算盘账房',-26,-19,-33,-27.45);part('money-house-aisle','钱庄 · 柜台侧通道',-19,-16,-29.6,-27.45);part('money-house-store','钱庄 · 钱库',-19,-16,-33,-29.6);
 levels.push({id:'money-house-floor',name:'承光钱庄',y:.215,bounds:CHINA_MONEY_HOUSE.bounds});
 lightingZones.push({id:'money-house',minX:-26.2,maxX:-15.8,minZ:-33.2,maxZ:-22.8,minY:.1,maxY:3.85,floorY:.215});
 for(const [id,name,position,roomId]of[['cn-money-house-entry','钱庄正门',[-21,.215,-21.4],'outdoors'],['cn-money-house-counter','钱庄存取柜台',CHINA_MONEY_HOUSE.points.counter,'money-house-public'],['cn-money-house-store-entry','钱库门前',[-17.6,.215,-28.7],'money-house-aisle']])explorationTargets.push({id,name,position,roomId});
 buildings.push({id:CHINA_MONEY_HOUSE.id,name:CHINA_MONEY_HOUSE.name,groupName:g.name,roofGroupName:r.name,bounds:CHINA_MONEY_HOUSE.bounds,storeys:1,roomIds:['money-house-public','money-house-staff','money-house-aisle','money-house-store'],westPassage:{centerX:-27.15,width:2.35}});
 return CHINA_MONEY_HOUSE;
}

export function chinaMoneyHouseStation(){return {...CHINA_MONEY_HOUSE.role,name:'承光钱庄 · 存取与兑换',action:'办理存取、兑换与查账',position:CHINA_MONEY_HOUSE.points.counter,npcPosition:CHINA_MONEY_HOUSE.points.teller,npcAction:'money-house-duty',npcRotation:0,npcLabel:'核对账簿 · 拨珠记账',color:'#b39355',interactionRadius:1.4,dialogue:'正式岗位工钱直接记入银行，亲自到柜台才能取出花用。兑换前先看清本次汇率与能收到的数目。'};}
export function moneyHouseRoleAppearance(region,id,look){return region==='china'&&id===CHINA_MONEY_HOUSE.stationId?{...look,bodyPreset:'masculine-lean',hairStyle:'low-bun',wardrobePreset:'scholar-long-robe',clothes:0x605e4b,accent:0xb89a61}:look;}
