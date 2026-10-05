import * as THREE from 'three';
import {EGYPT_MEAL as P} from './egypt-meal-definition.js';
// One order-owned tray, pottery bowl, bread and spoon through every handoff.
export function createEgyptMealProps(parent){
 const root=new THREE.Group();root.name='访客陶锅蔬食 同号餐具';root.userData.dynamic=true;parent.add(root);
 const mats=new Map(),geos=new Set();let tray=null,bowl=null,food=null,bread=null,spoon=null,id=null;
 const mat=c=>{if(!mats.has(c))mats.set(c,new THREE.MeshToonMaterial({color:c}));return mats.get(c);};
 const mesh=(g,geo,c,p=[0,0,0])=>{geos.add(geo);const m=new THREE.Mesh(geo,mat(c));m.position.set(...p);m.castShadow=true;g.add(m);return m;};
 const box=(g,w,h,d,c,p)=>mesh(g,new THREE.BoxGeometry(w,h,d),c,p);
 const ring=(g,r,t,c,p)=>{const m=mesh(g,new THREE.TorusGeometry(r,t,6,24),c,p);m.rotation.x=Math.PI/2;return m;};
 const hand=(n,left=false)=>{n.root.updateWorldMatrix(true,true);const h=n.root.userData.hands,a=h[0].getWorldPosition(new THREE.Vector3());if(!left)a.add(h[1].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);return a.add(new THREE.Vector3(0,left?-.055:-.03,0));};
 const kitchen=new THREE.Group();kitchen.name='访客餐 原厨房陶锅小火盆';root.add(kitchen);kitchen.position.set(22.22,1.0,-15.78);
 mesh(kitchen,new THREE.CylinderGeometry(.22,.24,.10,16),0x694736,[0,.05,0]);const coals=new THREE.Group();kitchen.add(coals);for(let i=0;i<5;i++)mesh(coals,new THREE.DodecahedronGeometry(.055),i%2?0xc57635:0x7a3c27,[Math.cos(i*1.25)*.1,.115,Math.sin(i*1.25)*.1]);
 const potProfile=[[.13,.11],[.19,.16],[.21,.27],[.205,.30],[.185,.30],[.17,.19],[.12,.15]].map(p=>new THREE.Vector2(...p));mesh(kitchen,new THREE.LatheGeometry(potProfile,20),0xa46540);ring(kitchen,.198,.014,0x573e2c,[0,.294,0]);mesh(kitchen,new THREE.CylinderGeometry(.182,.17,.018,18),0xc59a56,[0,.255,0]);for(const x of[-.23,.23]){const handle=mesh(kitchen,new THREE.TorusGeometry(.055,.016,5,12),0x7e4d32,[x,.23,0]);handle.rotation.y=Math.PI/2;}
 const prep=new THREE.Group();prep.name='本单待切配的蔬食';prep.position.set(...P.prepTop);root.add(prep);for(let i=0;i<5;i++)box(prep,.06,.04,.05,i%2?0x75904e:0xd5b672,[(i-2)*.065,.035,.12]);prep.visible=false;
 function clear(){for(const g of[tray,bowl,spoon])if(g){g.traverse(m=>{if(m.geometry){m.geometry.dispose();geos.delete(m.geometry);}});g.removeFromParent();}tray=bowl=food=bread=spoon=null;id=null;}
 function create(o){id=o.mealId;tray=new THREE.Group();tray.name=id+'-tray';tray.userData={orderId:o.id,mealId:id};root.add(tray);
  box(tray,.75,.03,.48,0xa77845);for(const z of[-.23,.23])box(tray,.76,.038,.018,0x704c2e,[0,.015,z]);for(const x of[-.365,.365])box(tray,.018,.04,.48,0x704c2e,[x,.018,0]);
  for(let i=0;i<11;i++)box(tray,.008,.004,.41,0xd4ad73,[-.33+i*.066,.018,0]);
  bowl=new THREE.Group();bowl.name=id;bowl.userData={orderId:o.id,mealId:id};root.add(bowl);
  const profile=[[.085,0],[.13,.025],[.19,.10],[.205,.17],[.195,.185],[.18,.165],[.165,.10],[.10,.04],[.085,.035]].map(p=>new THREE.Vector2(...p));mesh(bowl,new THREE.LatheGeometry(profile,24),0xa96942);ring(bowl,.198,.012,0x367c82,[0,.17,0]);ring(bowl,.117,.008,0xe3bd7a,[0,.032,0]);
  food=new THREE.Group();food.position.y=.133;bowl.add(food);mesh(food,new THREE.CylinderGeometry(.169,.14,.025,20),0xc79955);
  for(let i=0;i<9;i++){const a=i*2.4,r=.045+(i%3)*.035;box(food,.044,.025,.035,i%2?0xb76539:0xd9b46b,[Math.cos(a)*r,.027,Math.sin(a)*r]);const leaf=mesh(food,new THREE.SphereGeometry(.035,7,4),0x6c8243,[Math.cos(a+.4)*r,.04,Math.sin(a+.4)*r]);leaf.scale.set(1,.16,.6);}
  bread=new THREE.Group();tray.add(bread);bread.position.set(-.235,.055,0);const loaf=mesh(bread,new THREE.SphereGeometry(.135,14,8),0xd4a65f);loaf.scale.set(.85,.38,1.38);for(let i=0;i<3;i++){const slash=box(bread,.11,.006,.012,0x91663c,[0,.048,-.08+i*.075]);slash.rotation.y=-.35;}
  spoon=new THREE.Group();root.add(spoon);box(spoon,.018,.018,.20,0x835934,[0,0,.055]);const scoop=mesh(spoon,new THREE.SphereGeometry(.039,10,5),0x835934,[0,0,-.065]);scoop.scale.set(.65,.15,1.05);
 }
 return {clear,update(o,actors,phase){
  prep.visible=o?.stage==='preparing';coals.visible=o?.stage==='heating';if(!o?.mealId){if(id)clear();return;}if(id!==o.mealId){clear();create(o);}let p;const ratio=d=>Math.min(1,phase/d),table=new THREE.Vector3(...P.table),pass=new THREE.Vector3(...P.passTop);
  if(o.stage==='pickup')p=pass.lerp(hand(actors.host),ratio(1));
  else if(o.stage==='serving')p=hand(actors.host).lerp(table,ratio(1));
  else if(o.stage==='lifting')p=table.lerp(hand(actors.host),ratio(1));
  else p=o.holder==='host'?hand(actors.host):o.holder==='table'?table:pass;
  tray.position.copy(p);tray.rotation.y=o.holder==='host'?actors.host.root.rotation.y:0;
  bowl.position.copy(p).add(new THREE.Vector3(.085,.025,0));bowl.rotation.set(0,0,0);
  spoon.position.copy(p).add(new THREE.Vector3(.29,.035,.035));spoon.rotation.set(0,0,0);
  if(o.stage==='eating'||o.stage==='lowering'){
   const from=o.returnBowlFrom?new THREE.Vector3(...o.returnBowlFrom):hand(actors.player,true);
   bowl.position.copy(o.stage==='eating'?hand(actors.player,true):from.lerp(table.add(new THREE.Vector3(.085,.025,0)),ratio(.8)));
   if(o.stage==='eating'){actors.player.root.updateWorldMatrix(true,true);const h=actors.player.root.userData.hands[1];h.getWorldPosition(spoon.position);h.getWorldQuaternion(spoon.quaternion);spoon.rotateX(Math.PI/2);if(actors.player.root.userData.tools?.chopsticks)actors.player.root.userData.tools.chopsticks.visible=false;}
  }
  const portion=o.finished?0:o.stage==='eating'?Math.max(.1,1-phase/P.duration):1;food.scale.setScalar(portion);food.visible=portion>0;bread.visible=portion>0;
 },state:()=>({mealId:id,trayCount:tray?1:0,bowlCount:bowl?1:0,trayPosition:tray?.position.toArray()||null,bowlPosition:bowl?.position.toArray()||null,foodVisible:food?.visible||false}),dispose(){clear();root.removeFromParent();for(const g of geos)g.dispose();for(const m of mats.values())m.dispose();}};
}
