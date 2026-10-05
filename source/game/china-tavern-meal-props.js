import * as THREE from 'three';
import {TAVERN_MEAL as M} from './china-tavern-kitchen.js';

// These are the same tray and bowl at every handoff. Eating only moves that
// bowl to the real left palm; it never turns on a character's generic meal.
export function createTavernMealProps(parent){
 const root=new THREE.Group();root.name='Yunlai live meal objects';root.userData.dynamic=true;parent.add(root);
 const mats=new Map(),geos=new Set(),a=new THREE.Vector3(),b=new THREE.Vector3();let tray=null,bowl=null,food=null,id=null;
 const mat=color=>{if(!mats.has(color))mats.set(color,new THREE.MeshToonMaterial({color}));return mats.get(color);};
 const mesh=(g,geo,color,p=[0,0,0])=>{geos.add(geo);const m=new THREE.Mesh(geo,mat(color));m.position.set(...p);m.castShadow=true;g.add(m);return m;};
 const box=(g,w,h,d,c,p)=>mesh(g,new THREE.BoxGeometry(w,h,d),c,p);
 const cyl=(g,rt,rb,h,c,p)=>mesh(g,new THREE.CylinderGeometry(rt,rb,h,24),c,p);
 const torus=(g,r,t,c,p)=>{const m=mesh(g,new THREE.TorusGeometry(r,t,6,28),c,p);m.rotation.x=Math.PI/2;return m;};
 const hand=(n,left=false)=>{n.root.updateWorldMatrix(true,true);const h=n.root.userData.hands;h[0].getWorldPosition(a);h[1].getWorldPosition(b);if(!left)a.add(b).multiplyScalar(.5);return a.clone().add(new THREE.Vector3(0,left?-.06:-.025,0));};
 const ingredients=new THREE.Group();ingredients.name='Mushrooms being cut on the Yunlai prep board';ingredients.position.set(...M.points.prepTop);root.add(ingredients);
 for(let i=0;i<7;i++){const m=mesh(ingredients,new THREE.SphereGeometry(.055,10,6),i%2?0x958569:0xcbbfa4,[(i%3-1)*.16,.045,Math.floor(i/3)*.08-.12]);m.scale.set(1,.45,.75);}ingredients.visible=false;
 function create(o){
  id=o.mealId;tray=new THREE.Group();tray.name=id+'-tray';tray.userData={orderId:o.id,mealId:id,seatId:o.seatId};root.add(tray);
  box(tray,.62,.036,.46,0x774b35);for(const x of[-.3,.3])box(tray,.025,.055,.46,0xa0764c,[x,.017,0]);for(const z of[-.22,.22])box(tray,.61,.055,.025,0xa0764c,[0,.017,z]);
  for(const x of[-.25,-.215])box(tray,.013,.014,.34,0xc09a5b,[x,.03,0]);
  bowl=new THREE.Group();bowl.name=id;bowl.userData={orderId:o.id,mealId:id,seatId:o.seatId};root.add(bowl);
  const profile=[[.085,0],[.12,.025],[.19,.075],[.205,.14],[.205,.15],[.19,.15],[.177,.076],[.104,.039],[.085,.035]].map(p=>new THREE.Vector2(...p));mesh(bowl,new THREE.LatheGeometry(profile,28),o.dishId==='yunlai-green-noodles'?0x93ad8c:0xe6dcc6);torus(bowl,.202,.010,0x4d837b,[0,.147,0]);cyl(bowl,.09,.075,.023,0x508078,[0,.003,0]);
  food=new THREE.Group();food.position.y=.10;bowl.add(food);const rice=mesh(food,new THREE.SphereGeometry(.17,18,10),0xead8a8,[0,0,0]);rice.scale.y=.3;
  if(o.dishId==='yunlai-green-noodles'){rice.material=mat(0xd1ae6c);for(let i=0;i<5;i++){const leaf=mesh(food,new THREE.SphereGeometry(.085,10,6),i%2?0x557647:0x729457,[(i%3-1)*.08,.05,Math.floor(i/3)*.12-.06]);leaf.scale.set(.65,.15,1.2);}}
  else for(let i=0;i<6;i++){const theta=i*2.4,r=.06+(i%2)*.045,x=Math.cos(theta)*r,z=Math.sin(theta)*r,m=mesh(food,new THREE.SphereGeometry(.057,10,6),i%2?0x89684a:0xa18360,[x,.056,z]);m.scale.set(1,.42,.72);box(food,.018,.009,.063,0x658358,[x+.025,.079,z-.019]);}
 }
 function clear(){for(const q of[tray,bowl])if(q){q.traverse(m=>{if(m.geometry){m.geometry.dispose();geos.delete(m.geometry);}});q.removeFromParent();}tray=bowl=food=null;id=null;ingredients.visible=false;}
 return {
  clear,update(o,actors,phase){
   ingredients.visible=o?.stage==='preparing';if(!o?.mealId){if(id)clear();return;}if(id!==o.mealId){clear();create(o);}
   const P={...M.points,passTop:o.passPoint||M.points.passTop},stage=o.stage,ratio=d=>Math.min(1,phase/d);let tp;
   if(stage==='placing')tp=hand(actors.cook).lerp(new THREE.Vector3(...P.passTop),ratio(1.1));
   else if(stage==='pickup')tp=new THREE.Vector3(...P.passTop).lerp(hand(actors.assistant||actors.host),ratio(1.1));
   else if(stage==='serving')tp=hand(actors.assistant||actors.host).lerp(new THREE.Vector3(...o.mealPoint),ratio(1.1));
   else if(stage==='recall')tp=new THREE.Vector3(...o.recallPoint).lerp(hand(actors.assistant||actors.host),ratio(1.1));
   else if(stage==='lifting')tp=new THREE.Vector3(...o.mealPoint).lerp(hand(actors.assistant||actors.host),ratio(1.1));
   else if(o.holder==='cook')tp=hand(actors.cook);
   else if(['host','assistant'].includes(o.holder))tp=hand(actors.assistant||actors.host);
   else tp=new THREE.Vector3(...(o.holder==='pass'?P.passTop:o.holder==='wash'?P.washTop:o.mealPoint));
   tray.position.copy(tp);tray.rotation.y=['host','assistant','cook'].includes(o.holder)?actors[o.holder].root.rotation.y:0;
   bowl.position.copy(tp).add(new THREE.Vector3(.035,.035,0));bowl.rotation.set(0,0,0);
   if(stage==='eating')bowl.position.copy(hand(actors.player,true));
   if(stage==='finish-bite')bowl.position.copy(o.returnBowlFrom?new THREE.Vector3(...o.returnBowlFrom):hand(actors.player,true)).lerp(new THREE.Vector3(...o.mealPoint).add(new THREE.Vector3(.035,.035,0)),ratio(.8));
   food.visible=(o.portionsRemaining??1)>0;
   food.scale.setScalar(o.portionsRemaining??1);
  },
  state(){return {trayCount:tray?1:0,bowlCount:bowl?1:0,mealId:id,trayPosition:tray?.position.toArray()||null,bowlPosition:bowl?.position.toArray()||null,foodVisible:food?.visible||false,prepVisible:ingredients.visible};},
  dispose(){clear();root.removeFromParent();for(const geo of geos)geo.dispose();for(const m of mats.values())m.dispose();}
 };
}
