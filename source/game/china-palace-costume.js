import * as THREE from 'three';

export function buildPalaceEmperorGarments(g,{loft,surface,ribbon,hand,shoe,conformFront,tone},C){
 const edge=0xe0bd69,dark=0x574331;
 const body=[[.14,.218,.128,0,-.010],[.34,.206,.123,0,-.008],[.72,.177,.112,0,-.006],[1.02,.155,.104,0,-.006],[1.16,.158,.098,0,-.006],[1.29,.186,.088,0,-.011],[1.337,.190,.079,0,-.012],[1.382,.116,.059,0,-.004],[1.411,.046,.038,0,.001]];
 loft(g,'palace-imperial-continuous-long-robe',body,C.yukata,{steps:38});
 for(const side of[-1,1]){
  loft(g,'palace-imperial-draped-sleeve-'+side,[[.938,.040,.050,side*.300,-.005],[.99,.059,.075,side*.298,-.009],[1.08,.091,.088,side*.281,-.020],[1.18,.092,.087,side*.250,-.022],[1.28,.080,.077,side*.206,-.016],[1.337,.061,.063,side*.173,-.012]],C.yukata,{steps:25});
  loft(g,'palace-imperial-dark-cuff-'+side,[[.938,.042,.052,side*.300,-.005],[.977,.057,.072,side*.299,-.008]],dark,{steps:5});
  loft(g,'wrist-imperial-'+side,[[.916,.022,.023,side*.303,0],[.948,.027,.028,side*.301,-.002]],C.skin,{steps:5});hand(g,side);shoe(g,side,false);
 }
 conformFront(ribbon(g,'palace-imperial-overlap-collar',[[.034,1.411,.023],[.065,1.356,.068],[-.016,1.259,.091],[-.105,1.107,.095]],.033,dark),body,.004);
 loft(g,'palace-imperial-wide-belt',[[1.009,.159,.108,0,-.005],[1.080,.159,.108,0,-.005]],dark,{steps:5});
 for(let i=0;i<12;i++){const a=i*Math.PI/6;surface(g,'palace-imperial-gold-belt-plaque-'+i,4,3,(u,v)=>{const b=a+(u-.5)*.23;return[Math.sin(b)*.163,1.027+v*.034,-.005+Math.cos(b)*.112];},edge);}
 // An original cloud medallion makes the robe legible at ordinary play scale.
 // It is ornamental, not a historical rank badge or reproduced textile.
 const oval=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*2;return[Math.sin(a)*.076,1.228+Math.cos(a)*.090,.105];});
 conformFront(ribbon(g,'palace-imperial-chest-medallion',oval,.008,edge),body,.006);
 for(const side of[-1,1])conformFront(ribbon(g,'palace-imperial-cloud-'+side,[[side*.052,1.220,.11],[side*.024,1.239,.11],[0,1.224,.11],[side*.024,1.207,.11],[side*.056,1.205,.11]],.008,edge),body,.008);
 loft(g,'palace-imperial-hem-border',[[.14,.220,.130,0,-.010],[.175,.218,.129,0,-.010]],tone(C.yukata,.66),{steps:4});
}

export function createPalaceMealKit(actor){
 const groups=[],materials=new Map(),material=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshToonMaterial({color:c}));return materials.get(c);};
 const add=(p,geo,c,x,y,z)=>{const m=new THREE.Mesh(geo,material(c));m.position.set(x,y,z);p.add(m);return m;};
 const bowl=new THREE.Group();bowl.name='Palace porcelain bowl with dumplings';actor.root.userData.hands[0].add(bowl);groups.push(bowl);bowl.position.set(0,.075,.07);
 add(bowl,new THREE.CylinderGeometry(.125,.080,.055,16),0xb5c5aa,0,.014,0);
 for(const x of[-.045,.045])add(bowl,new THREE.SphereGeometry(.047,10,7),0xf0dfbd,x,.059,0).scale.set(.80,.54,1.15);
 const sticks=new THREE.Group();sticks.name='Palace meal bamboo chopsticks';actor.root.userData.hands[1].add(sticks);groups.push(sticks);
 for(const x of[-.014,.014]){const m=add(sticks,new THREE.CylinderGeometry(.006,.004,.24,6),0xa68a58,x-.04,-.035,.10);m.rotation.x=1.1;m.rotation.z=-.25;}
 for(const g of groups)g.visible=false;let disposed=false;
 return {show(value){for(const g of groups)g.visible=value;},dispose(){if(disposed)return;disposed=true;for(const g of groups){g.removeFromParent();g.traverse(o=>o.geometry?.dispose());}for(const m of materials.values())m.dispose();}};
}

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
