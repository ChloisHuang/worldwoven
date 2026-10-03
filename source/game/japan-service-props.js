import * as THREE from 'three';
import {JAPAN_BATH_BLENDS,JAPAN_SERVICE_POINTS as P} from './japan-service-orders.js';

// Small original service objects. Their identities come from the order ledger;
// rendering a pouch never changes its delivered state or creates a new order.
export function createJapanServiceProps(parent) {
 const root=new THREE.Group();root.name='Bathhouse live service objects';root.userData.dynamic=true;parent.add(root);
 const materials=new Map(),geometries=new Set(),objects=new Map(),handA=new THREE.Vector3(),handB=new THREE.Vector3();
 const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshToonMaterial({color}));return materials.get(color);};
 function part(g,geometry,color,p=[0,0,0]) {geometries.add(geometry);const m=new THREE.Mesh(geometry,material(color));m.position.set(...p);m.castShadow=true;g.add(m);return m;}
 const box=(g,w,h,d,c,p)=>part(g,new THREE.BoxGeometry(w,h,d),c,p);
 const cylinder=(g,r1,r2,h,c,p)=>part(g,new THREE.CylinderGeometry(r1,r2,h,12),c,p);
 function number(g,n) {
  const segments=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
  const layout={a:[0,.046,.066,.013],b:[.034,.023,.012,.039],c:[.034,-.023,.012,.039],d:[0,-.046,.066,.013],e:[-.034,-.023,.012,.039],f:[-.034,.023,.012,.039],g:[0,0,.066,.013]};
  const digits=String(n).padStart(2,'0').slice(-3);
  for(let i=0;i<digits.length;i++)for(const key of segments[Number(digits[i])]){const[x,y,w,h]=layout[key];box(g,w,h,.008,0x493d32,[x+(i-(digits.length-1)/2)*.09,y,.027]);}
 }
 function badge(n,color) {
  const g=new THREE.Group();box(g,.30,.22,.048,0xd8ba81);box(g,.3,.035,.053,color,[0,.084,0]);
  const ring=part(g,new THREE.TorusGeometry(.03,.008,5,12),0x806b46,[0,.137,0]);ring.rotation.y=0;number(g,n);return g;
 }
 function make(item,visit) {
  const g=new THREE.Group(),color=JAPAN_BATH_BLENDS.find(b=>b.id===visit.blendId).color;
  if(item.kind==='token')g.add(badge(visit.number,color));
  else {
   box(g,.46,.035,.34,0x8e6645,[0,0,0]);
   if(item.kind==='mixture') {
    const bag=part(g,new THREE.SphereGeometry(.13,10,8),color,[0,.115,0]);bag.scale.set(1,.85,.8);
    cylinder(g,.043,.052,.095,0xeadcba,[0,.22,0]);
    const tie=part(g,new THREE.TorusGeometry(.053,.014,5,12),0xa35f49,[0,.195,0]);tie.rotation.x=Math.PI/2;
   }else {
    cylinder(g,.17,.105,.13,0xe6dcc2,[0,.08,0]);cylinder(g,.147,.147,.007,0xc49148,[0,.149,0]);
    for(const x of [-.05,.02,.08])box(g,.027,.009,.083,0x638469,[x,.159,0]);
    for(const x of [-.06,.005]){const noodle=part(g,new THREE.TorusGeometry(.045,.006,4,12),0xe8cf88,[x,.157,.012]);noodle.rotation.x=Math.PI/2;}
   }
   const tag=badge(visit.number,color);tag.scale.setScalar(.48);tag.position.set(.16,.09,.14);g.add(tag);
  }
  g.name=item.id;g.userData={serviceItemId:item.id,visitId:visit.id,tokenId:visit.tokenId,kind:item.kind};root.add(g);return g;
 }
 // Ledger and return tray sit on the already modelled reception counter.
 const reception=new THREE.Group();reception.position.set(...P.tokenTray);root.add(reception);
 box(reception,.52,.027,.37,0xe6dcc2,[-.38,0,0]);
 for(const z of [-.11,-.055,0,.055,.11])box(reception,.39,.004,.011,0x819086,[-.38,.016,z]);
 box(reception,.42,.032,.31,0x8e6645,[.23,0,0]);
 function itemPoint(item,v) {
  const lane=(v.number%2?-.22:.22);
  if(item.location.id==='apothecaryPickup')return [P.mixtureTray[0]+lane,P.mixtureTray[1],P.mixtureTray[2]];
  if(item.location.id==='kitchenPickup')return [P.mealTray[0]+lane,P.mealTray[1],P.mealTray[2]];
  if(item.location.id==='menService')return [-4.2+lane,4.48,-3.1];
  if(item.location.id==='womenService')return [1.35+lane,4.48,-3.1];
  return [P.tokenTray[0]+.23,P.tokenTray[1]+.065,P.tokenTray[2]];
 }
 return {
  update(state,actorById) {
   const visits=new Map(state.visits.map(v=>[v.id,v])),seen=new Set();
   for(const item of state.items) {
    const v=visits.get(item.visitId);if(!v||['cancelled','used'].includes(item.location.type))continue;
    seen.add(item.id);let g=objects.get(item.id);if(!g){g=make(item,v);objects.set(item.id,g);}
    const held=item.location.type==='worker',guest=item.location.type==='guest',eating=item.kind==='meal'&&item.location.id==='dining';
    const actor=actorById.get(held?item.location.id:v.id);
    if((held||guest||eating)&&actor) {
     actor.root.updateWorldMatrix(true,true);g.rotation.set(0,actor.root.rotation.y,0);
     if(guest) {g.position.set(.27,.84,.12).applyMatrix4(actor.root.matrixWorld);g.rotation.z=.12;}
     else {
      const hands=actor.root.userData.hands;
      if(hands?.length===2){hands[0].getWorldPosition(handA);hands[1].getWorldPosition(handB);g.position.copy(handA).add(handB).multiplyScalar(.5);g.position.y-=.07;}
      else g.position.set(0,1,.4).applyMatrix4(actor.root.matrixWorld);
     }
    }else {g.position.set(...itemPoint(item,v));g.rotation.set(item.kind==='token'?-Math.PI/2:0,0,0);}
    g.visible=actor&&(held||guest||eating)?actor.root.visible:true;
   }
   for(const [id,g]of objects)if(!seen.has(id)){g.traverse(o=>{if(o.geometry){o.geometry.dispose();geometries.delete(o.geometry);}});g.removeFromParent();objects.delete(id);}
  },
  dispose() {root.removeFromParent();for(const geometry of geometries)geometry.dispose();for(const m of materials.values())m.dispose();objects.clear();},
 };
}
