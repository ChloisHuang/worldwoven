import * as THREE from 'three';

export const PALACE_TEA_POINTS=Object.freeze({prep:[2.9,1.698,-30.46],serve:[4.81,1.698,-30.46],hostHome:[2.9,.815,-29.68],hostPrep:[2.9,.815,-29.95],hostServe:[4.45,.815,-30.0],guest:[5.17,.815,-30.0]});
// Only the original dynamic cup/tray are counted. Existing decorated tea sets
// remain scenery; generic character tea cups are suppressed by handoff poses.
export function createPalaceTeaProps(parent){
 const root=new THREE.Group();root.name='Original palace tea service';root.userData.dynamic=true;parent.add(root);
 const materials=[new THREE.MeshToonMaterial({color:0xf4e8cb}),new THREE.MeshToonMaterial({color:0x735244}),new THREE.MeshToonMaterial({color:0xb88a42})];
 let tray=null,cup=null,order=null;const geometries=[];
 const mesh=(group,geometry,material,p=[0,0,0])=>{geometries.push(geometry);const item=new THREE.Mesh(geometry,materials[material]);item.position.set(...p);item.castShadow=item.receiveShadow=true;group.add(item);return item;};
 function clear(){tray?.removeFromParent();cup?.removeFromParent();for(const geo of geometries)geo.dispose();geometries.length=0;tray=cup=order=null;}
 function create(o){order=o;tray=new THREE.Group();cup=new THREE.Group();tray.name=o.trayId;cup.name=o.cupId;tray.userData.requestId=cup.userData.requestId=o.id;root.add(tray,cup);
  mesh(tray,new THREE.BoxGeometry(.46,.026,.3),1,[0,.013,0]);for(const z of[-.145,.145])mesh(tray,new THREE.BoxGeometry(.46,.027,.012),2,[0,.034,z]);
  const profile=[[.032,0],[.047,.017],[.055,.082],[.049,.082],[.04,.025],[.028,.015]].map(p=>new THREE.Vector2(...p));mesh(cup,new THREE.LatheGeometry(profile,20),0);mesh(cup,new THREE.CylinderGeometry(.046,.046,.003,20),2,[0,.064,0]);
 }
 function hand(n,both=false){if(!n?.root)return null;n.root.updateWorldMatrix(true,true);const hands=n.root.userData.hands;if(!hands?.[1]||both&&!hands?.[0])return null;const p=hands[1].getWorldPosition(new THREE.Vector3());if(both)p.add(hands[0].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);return p.add(new THREE.Vector3(0,-.025,0));}
 const vec=p=>new THREE.Vector3(...p);
 function placement(host,phase,elapsed=0){
  host?.root.updateWorldMatrix(true,true);const prep=vec(PALACE_TEA_POINTS.prep),table=vec(PALACE_TEA_POINTS.serve),held=host?.root.localToWorld(new THREE.Vector3(0,1.0,.4))||prep.clone(),ratio=Math.min(1,elapsed),onTable=['guest-lift','drink','lower','retrieve','cancelled-table'].includes(phase);
  let p=onTable?table.clone():['carry','return'].includes(phase)?held.clone():prep.clone(),yaw=0;
  const angle=host?.root.rotation.y||0;
  if(['carry','return'].includes(phase))yaw=angle;
  if(phase==='pickup'){p=prep.lerp(held,ratio);yaw=angle*ratio;}
  if(phase==='place'){p=held.lerp(table,ratio);yaw=angle*(1-ratio);}
  if(phase==='retrieve'){p=table.lerp(held,ratio);yaw=angle*ratio;}
  if(phase==='clear'){p=held.lerp(prep,ratio);yaw=angle*(1-ratio);}
  return {p,yaw};
 }
 function guestCup(guest,phase,elapsed){
  const body=guest.root.userData.body||guest.root;body.updateWorldMatrix(true,false);const sip=phase==='drink'?Math.sin(Math.PI*Math.min(1,elapsed/3))**2:0;
  const resting=body.localToWorld(new THREE.Vector3(.12-sip*.055,1.12+sip*.28,.29-sip*.145));
  const table=vec(PALACE_TEA_POINTS.serve).add(new THREE.Vector3(0,.04,0)),ratio=Math.min(1,elapsed);
  return phase==='guest-lift'?table.lerp(resting,ratio):phase==='lower'?resting.lerp(table,ratio):resting;
 }
 return {clear,
 guestHandTarget(guest,phase,elapsed){const body=guest.root.userData.body||guest.root;body.updateWorldMatrix(true,false);return body.worldToLocal(guestCup(guest,phase,elapsed).add(new THREE.Vector3(0,.065,0))).toArray();},
 handTargets(host,phase,elapsed=0){
  const {p,yaw}=placement(host,phase,elapsed),axis=new THREE.Vector3(0,1,0),origin=host.root.getWorldPosition(new THREE.Vector3()),toward=origin.sub(p).setY(0).normalize().applyAxisAngle(axis,-yaw),side=new THREE.Vector3(toward.z,0,-toward.x);
  const contacts=[-.13,.13].map(sign=>{const q=toward.clone().multiplyScalar(.105).addScaledVector(side,sign);q.x=Math.max(-.20,Math.min(.20,q.x));q.z=Math.max(-.13,Math.min(.13,q.z));q.y=.03;return q.applyAxisAngle(axis,yaw).add(p);});
  const body=host.root.userData.body||host.root;body.updateWorldMatrix(true,false);return contacts.map(target=>body.worldToLocal(target).toArray()).sort((a,b)=>a[0]-b[0]);
 },
 update(o,{host,guest},phase,elapsed=0){
  if(!o){clear();return;}if(order?.id!==o.id){clear();create(o);}const {p,yaw}=placement(host,phase,elapsed),table=vec(PALACE_TEA_POINTS.serve);
  tray.position.copy(p);tray.rotation.y=yaw;cup.position.copy(p).add(new THREE.Vector3(0,.04,0));cup.rotation.set(0,0,0);
  if(['guest-lift','drink','lower'].includes(phase)&&guest)cup.position.copy(guestCup(guest,phase,elapsed));
  root.updateWorldMatrix(true,true);
 },state:()=>({requestId:order?.id||null,cupId:cup?.name||null,trayId:tray?.name||null,cupCount:cup?1:0,trayCount:tray?1:0,cupPosition:cup?.position.toArray()||null,trayPosition:tray?.position.toArray()||null}),dispose(){clear();root.removeFromParent();materials.forEach(m=>m.dispose());}};
}
