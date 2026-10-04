import * as THREE from 'three';

// Original everyday palace accessories, not a reconstruction of a dynasty's
// ceremonial regalia. The underlying Chinese robe/skirt retains normal skinning.
export function attachPalaceCostume(actor){
 const role=actor.station.royalRole;if(!role)return null;
 const group=new THREE.Group();group.name='Original palace '+role+' hair ornaments';actor.root.userData.head.add(group);
 const materials=new Map(),material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshToonMaterial({color}));return materials.get(color);};
 const part=(name,geo,color,x,y,z)=>{const mesh=new THREE.Mesh(geo,material(color));mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;};
 if(role==='emperor'){
  part('low imperial everyday cap',new THREE.SphereGeometry(.112,16,10),0x423827,0,.267,-.019).scale.set(1,.76,.85);
  part('gold cap band',new THREE.CylinderGeometry(.113,.114,.023,20),0xc8a754,0,.221,-.014).scale.z=.86;
  for(const side of[-1,1]){const wing=part('cap folded side '+side,new THREE.BoxGeometry(.058,.074,.023),0x766037,side*.104,.272,-.035);wing.rotation.z=-side*.30;}
  part('cap jade inset',new THREE.SphereGeometry(.015,8,6),0x8da894,0,.269,.076).scale.set(.75,1,.35);
 }else{
  const pin=part('gold hairpin',new THREE.CylinderGeometry(.005,.005,.28,8),0xc8a754,0,.26,-.081);pin.rotation.z=Math.PI/2;
  for(const side of[-1,1]){
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;part('plum hair flower '+side+' '+i,new THREE.SphereGeometry(.013,7,6),0xd9b8bd,side*.091+Math.cos(a)*.018,.284+Math.sin(a)*.018,-.014).scale.z=.40;}
   part('flower gold center '+side,new THREE.SphereGeometry(.009,8,6),0xc9a34e,side*.091,.284,-.008);
   part('short pearl drop '+side,new THREE.SphereGeometry(.008,8,6),0xf1dfbc,side*.12,.222,-.037);
  }
 }
 actor.root.userData.palaceCostume=group;let disposed=false;
 return {dispose(){if(disposed)return;disposed=true;group.removeFromParent();group.traverse(o=>o.geometry?.dispose());for(const m of materials.values())m.dispose();delete actor.root.userData.palaceCostume;}};
}
