import * as THREE from 'three';
// A compact, deliberately modest porcelain service. All stages move the same
// cup, plate and silver tray; the character's generic tea prop stays disabled.
export function createFranceTeaProps(parent){
 const root=new THREE.Group();root.name='Palace live afternoon tea';root.userData.dynamic=true;parent.add(root);
 const materials=new Map(),geos=new Set(),tmp=new THREE.Vector3(),other=new THREE.Vector3();let tray=null,cup=null,cake=null,id=null;
 const mat=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshToonMaterial({color:c}));return materials.get(c);};
 const mesh=(g,geo,c,p=[0,0,0])=>{geos.add(geo);const m=new THREE.Mesh(geo,mat(c));m.position.set(...p);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
 const cylinder=(g,r,h,c,p)=>mesh(g,new THREE.CylinderGeometry(r,r,h,24),c,p);
 function create(o){id=o.trayId;tray=new THREE.Group();tray.name=id;tray.userData.orderId=o.id;root.add(tray);
  mesh(tray,new THREE.BoxGeometry(.55,.022,.35),0xc6c5b3,[0,.011,0]);for(const z of[-.167,.167])mesh(tray,new THREE.BoxGeometry(.55,.027,.013),0xd9c588,[0,.031,z]);for(const x of[-.269,.269])mesh(tray,new THREE.BoxGeometry(.013,.027,.35),0xd9c588,[x,.031,0]);
  cylinder(tray,.103,.016,0xf8f0da,[.13,.031,.045]);cylinder(tray,.128,.018,0xf8f0da,[-.115,.032,0]);
  cake=new THREE.Group();cake.position.set(-.115,.043,0);tray.add(cake);mesh(cake,new THREE.BoxGeometry(.16,.065,.12),0xd7aa72,[0,.032,0]);mesh(cake,new THREE.BoxGeometry(.16,.018,.12),0xf1dec0,[0,.074,0]);mesh(cake,new THREE.SphereGeometry(.026,10,8),0xb85754,[0,.100,0]);
  cup=new THREE.Group();cup.name=o.id+'-cup';cup.userData.orderId=o.id;root.add(cup);
  const profile=[[.045,0],[.065,.025],[.072,.115],[.071,.125],[.060,.125],[.057,.029],[.040,.018]].map(a=>new THREE.Vector2(...a));mesh(cup,new THREE.LatheGeometry(profile,24),0xf4efdc);cylinder(cup,.058,.004,0x9c693c,[0,.103,0]);const rim=mesh(cup,new THREE.TorusGeometry(.067,.006,6,28),0xc9ac62,[0,.122,0]);rim.rotation.x=Math.PI/2;const handle=mesh(cup,new THREE.TorusGeometry(.034,.010,6,18),0xc9ac62,[.074,.071,0]);handle.scale.x=.8;
 }
 const hand=(n,both=true)=>{n.root.updateWorldMatrix(true,true);const h=n.root.userData.hands;h[1].getWorldPosition(tmp);if(both){h[0].getWorldPosition(other);tmp.add(other).multiplyScalar(.5);}return tmp.clone().add(new THREE.Vector3(0,both?-.02:-.045,0));};
 const kitchen=[-5.9,1.270,-9.65];
 function clear(){for(const q of[tray,cup])if(q){q.traverse(m=>{if(m.geometry){m.geometry.dispose();geos.delete(m.geometry);}});q.removeFromParent();}tray=cup=cake=null;id=null;}
 return {clear,update(o,actors,phase){if(!o?.trayId){if(id)clear();return;}if(id!==o.trayId){clear();create(o);}const ratio=Math.min(1,phase/1.2),table=new THREE.Vector3(...o.tablePoint),prep=new THREE.Vector3(...kitchen);let p;
   if(o.stage==='recover-host')p=new THREE.Vector3(...o.recovery.trayPosition).lerp(hand(actors.host),ratio);
   else if(o.stage==='pickup')p=prep.lerp(hand(actors.host),ratio);
   else if(o.stage==='recalling')p=new THREE.Vector3(...o.recallFrom).lerp(hand(actors.host),ratio);
   else if(o.stage==='serving')p=hand(actors.host).lerp(table,ratio);
   else if(o.stage==='lifting')p=table.lerp(hand(actors.host),ratio);
   else p=o.holder==='host'?hand(actors.host):o.holder==='table'?table:prep;
   tray.position.copy(p);tray.rotation.y=0;cup.position.copy(p).add(new THREE.Vector3(.13,.040,.045));cup.rotation.set(0,0,0);
   if(o.stage==='drinking')cup.position.copy(hand(actors.customer,false));
   if(o.stage==='lowering')cup.position.copy(o.returnCupFrom?new THREE.Vector3(...o.returnCupFrom):hand(actors.customer,false)).lerp(table.add(new THREE.Vector3(.13,.040,.045)),Math.min(1,phase));
   cake.visible=!o.finished;cup.visible=o.stage!=='preparing';
  },state:()=>({trayCount:tray?1:0,cupCount:cup?1:0,trayId:id,trayPosition:tray?.position.toArray()||null,cupPosition:cup?.position.toArray()||null,cakeVisible:cake?.visible||false}),
  dispose(){clear();root.removeFromParent();for(const geo of geos)geo.dispose();for(const m of materials.values())m.dispose();}
 };
}
