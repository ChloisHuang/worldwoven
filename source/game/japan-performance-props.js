import * as THREE from 'three';
// Original folding fan and one order-owned ceramic cup/tray. These follow the
// existing actual hand bones; clearing a service restores ordinary hand props.
export function createJapanPerformanceProps(parent){
 const root=new THREE.Group();root.name='Kasumi live fan and drinks';root.userData.dynamic=true;parent.add(root);
 const materials=new Map(),geometries=new Set(),v=new THREE.Vector3(),w=new THREE.Vector3();
 const material=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshToonMaterial({color:c,side:THREE.DoubleSide}));return materials.get(c);};
 const mesh=(g,geo,c,p=[0,0,0])=>{geometries.add(geo);const m=new THREE.Mesh(geo,material(c));m.position.set(...p);m.castShadow=true;g.add(m);return m;};
 const fan=new THREE.Group();fan.name='Original vermilion folding dance fan';root.add(fan);
 const vertices=[],indices=[],r=.39,inner=.105;
 for(let i=0;i<=12;i++){const a=-Math.PI*.39+i/12*Math.PI*.78;for(const length of[inner,r])vertices.push(Math.sin(a)*length,Math.cos(a)*length,Math.sin(i*Math.PI)*.012);if(i<12){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
 const fanGeo=new THREE.BufferGeometry();fanGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));fanGeo.setIndex(indices);fanGeo.computeVertexNormals();mesh(fan,fanGeo,0xd69361);
 for(let i=0;i<=12;i++){const a=-Math.PI*.39+i/12*Math.PI*.78,m=mesh(fan,new THREE.CylinderGeometry(.004,.006,r,5),0x6a4539,[Math.sin(a)*r/2,Math.cos(a)*r/2,.007]);m.rotation.z=-a;}
 mesh(fan,new THREE.SphereGeometry(.023,10,8),0xb34e57,[0,.265,-.005]);
 const tray=new THREE.Group();tray.name='Reserved drink tray';root.add(tray);mesh(tray,new THREE.CylinderGeometry(.22,.22,.024,20),0x6b3e32,[0,.012,0]);
 const cup=new THREE.Group();cup.name='One reserved ceramic drink';root.add(cup);
 const profile=[[.038,0],[.055,.02],[.071,.115],[.068,.125],[.057,.125],[.047,.025],[.035,.017]].map(a=>new THREE.Vector2(...a));
 mesh(cup,new THREE.LatheGeometry(profile,20),0xe5d4b0);mesh(cup,new THREE.CylinderGeometry(.055,.055,.004,20),0x8e6b3f,[0,.097,0]);
 fan.visible=tray.visible=cup.visible=false;let orderId=null;
 function hand(n,index,offset=[0,-.035,.015]){const h=n?.root.userData.hands?.[index];if(!h)return null;n.root.updateWorldMatrix(true,true);v.set(...offset);h.localToWorld(v);root.worldToLocal(v);return v;}
 function clearOrder(){tray.visible=cup.visible=fan.visible=false;orderId=null;}
 return {clearOrder,update(o,{server,artist,player},t){
  fan.visible=!!(o?.activity==='dance'&&o.status==='performing'&&artist&&!artist.walking);
  if(fan.visible){const p=hand(artist,1,[0,-.015,.025]);if(p){fan.position.copy(p);fan.quaternion.copy(artist.root.quaternion);fan.rotateY(Math.sin(t*1.4)*.28);fan.rotateZ(-.18+Math.sin(t*.8)*.16);}}
  const visible=!!(o?.drink&&o.paid&&['carrying','serving','drinking','finished'].includes(o.drinkStatus));tray.visible=cup.visible=visible;orderId=visible?o.id:null;if(!visible)return;
  tray.userData.orderId=cup.userData.orderId=o.id;
  if(['carrying','serving'].includes(o.drinkStatus)){
   const p=hand(server,0);if(p){w.copy(p);const other=hand(server,1);if(other)w.add(other).multiplyScalar(.5);tray.position.copy(w);}
  }else tray.position.set(3.55,8.565,3.18);
  cup.position.copy(tray.position).add(new THREE.Vector3(0,.026,0));
  if(o.drinkStatus==='drinking'){const p=hand(player,1);if(p)cup.position.copy(p);}
  for(const n of[server,player])if(n&&o.drinkStatus==='carrying'&&n===server||n&&o.drinkStatus==='drinking'&&n===player){const tools=n.root.userData.tools||{};for(const p of Object.values(tools))p.visible=false;}
 },state:()=>({orderId,fanVisible:fan.visible,drinkVisible:cup.visible,cupPosition:cup.visible?cup.position.toArray():null,trayPosition:tray.visible?tray.position.toArray():null}),dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
