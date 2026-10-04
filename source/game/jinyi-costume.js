/** Original Ming-informed training dress; see docs/JINYI_COSTUME.md.
 * The museum references describe different ranks and occasions, not one uniform.
 * No museum image, textile pattern or film costume is used as an asset.
 */
import * as THREE from 'three';

// This authoring hook enters the normal character template, body shaping and
// skinning pipeline. In particular the sleeves follow the existing bow IK.
export function buildJinyiGarments(g,{loft,surface,ribbon,hand,shoe,conformFront,tone},C){
 const dark=0x252d32,edge=0xb99859,inner=0xe4d6b6;
 const upper=[[.988,.148,.099,0,-.006],[1.06,.139,.088,0,-.006],[1.19,.155,.094,0,-.006],[1.29,.183,.086,0,-.012],[1.337,.183,.077,0,-.013],[1.38,.116,.057,0,-.004],[1.411,.044,.037,0,.003]];
 loft(g,'jinyi-fitted-robe-body',upper,C.yukata,{steps:28});
 // A waist seam and gathered pleats distinguish this robe from a scholar's
 // continuous gown. The shorter hem exposes riding boots for active practice.
 const pleated=(u,v,offset=0)=>{const a=u*Math.PI*2,y=.30+v*.72,w=.258*(1-v)+.146*v,d=.149*(1-v)+.102*v,fold=Math.cos(a*16)*.010*(1-v*.60);return[Math.sin(a)*(w+fold+offset),y,-.006+Math.cos(a)*(d+fold+offset)];};
 // Keep four samples across each pleat; the common smooth-loft helper caps its
 // circumference too low for this cloth, which otherwise aliases folds away.
 const robeSurface=(name,from,to,steps,offset,color)=>{const p=[],idx=[],segments=64;for(let j=0;j<=steps;j++)for(let i=0;i<=segments;i++)p.push(...pleated(i/segments,from+(to-from)*j/steps,offset));for(let j=0;j<steps;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i;idx.push(a,a+1,a+segments+1,a+1,a+segments+2,a+segments+1);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();const m=new THREE.Mesh(geo,{color:new THREE.Color(color),skin:false,isMaterial:false});m.name=name;g.add(m);};
 robeSurface('jinyi-pleated-robe-skirt',0,1,24,0,C.yukata);
 robeSurface('jinyi-woven-knee-band',.20,.325,4,.0017,tone(C.yukata,.72));
 for(const v of[.20,.325])robeSurface('jinyi-knee-band-piping-'+v,v,v+.005,1,.003,edge);
 // The left lapel overlaps the right, closing at the wearer's right (screen
 // left in a front view), with a cream inner layer. No X-shaped
 // lapels and no haori sleeves survive in this role-specific construction.
 for(const [name,points,width,color]of[
  ['inner',[[-.035,1.408,.025],[0,1.343,.079],[.025,1.310,.087]],.026,inner],
  ['left-over-right-lapel',[[.034,1.409,.027],[.047,1.366,.062],[-.048,1.231,.088],[-.106,1.11,.071]],.030,tone(C.yukata,.64)],
  ['collar-edge',[[.034,1.408,.027],[.047,1.365,.062],[-.048,1.231,.088],[-.106,1.11,.071]],.005,edge]
 ])conformFront(ribbon(g,'jinyi-'+name,points,width,color),upper,.004);
 for(const s of[-1,1]){
  loft(g,'jinyi-tapered-sleeve-'+s,[[.949,.033,.039,s*.301,-.001],[.985,.041,.048,s*.299,-.003],[1.075,.065,.066,s*.279,-.012],[1.16,.075,.074,s*.246,-.016],[1.27,.075,.075,s*.203,-.014],[1.326,.061,.065,s*.176,-.012],[1.345,.036,.045,s*.151,-.009]],C.yukata,{steps:26});
  loft(g,'jinyi-sleeve-cuff-'+s,[[.950,.035,.041,s*.301,-.001],[.984,.043,.050,s*.299,-.003]],tone(C.yukata,.60),{steps:5});
  loft(g,'wrist-jinyi-'+s,[[.916,.022,.023,s*.303,0],[.957,.026,.027,s*.301,-.001]],C.skin,{steps:6});
  loft(g,'jinyi-trouser-'+s,[[.12,.039,.041,s*.09,-.02],[.31,.047,.046,s*.09,-.014],[.59,.06,.057,s*.089,-.011],[.93,.076,.072,s*.08,-.011]],dark,{steps:18});
  hand(g,s);shoe(g,s,false);
  loft(g,'jinyi-footwear-boot-shaft-'+s,[[.080,.040,.054,s*.089,-.018],[.15,.040,.046,s*.089,-.019],[.28,.047,.047,s*.089,-.015],[.33,.049,.048,s*.089,-.013]],dark,{steps:16});
  // Restrained original cloud curves evoke woven ornament without inventing a
  // rank badge or claiming an imperial flying-fish grant for every guard.
  const cloud=[[s*.067,1.362,.057],[s*.095,1.335,.067],[s*.135,1.334,.057],[s*.157,1.310,.046],[s*.177,1.306,.026]];
  conformFront(ribbon(g,'jinyi-cloud-shoulder-border-'+s,cloud,.006,edge),upper,.0048);
 }
 loft(g,'jinyi-leather-waist-belt',[[1.000,.153,.106,0,-.005],[1.049,.147,.103,0,-.005]],dark,{steps:5});
 for(let i=0;i<10;i++){
  const a=i*Math.PI*2/10;
  surface(g,'jinyi-belt-plaque-'+i,4,4,(u,v)=>{const b=a+(u-.5)*.19;return[Math.sin(b)*.153,1.011+v*.026,-.005+Math.cos(b)*.108];},edge);
 }
}

// Accessories attach to existing bones; actor identity and geometry stay intact.
// The caller owns this handle and disposes it before the character is removed.
export function attachJinyiCostume(actor){
 if(actor.root.userData.jinyiCostume)return actor.root.userData.jinyiCostume;
 const materials=new Map(),groups=[],material=c=>{if(!materials.has(c)){const m=new THREE.MeshToonMaterial({color:c});materials.set(c,m);}return materials.get(c);};
 const part=(parent,name,geo,color,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,material(color));m.name=name;m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
 const hat=new THREE.Group();hat.name='Original Ming folded black duty cap';actor.root.userData.head.add(hat);groups.push(hat);
 // Low forehead band and a shaped, rising rear crown replace the cylinder and
 // fantasy diamond badge. Side folds remain close to the head while drawing.
 const ring=(rx,rz,y,z=0)=>Array.from({length:17},(_,i)=>{const a=i/16*Math.PI*2;return[Math.sin(a)*rx,y,z+Math.cos(a)*rz];});
 const rings=[ring(.103,.096,.207,-.008),ring(.101,.092,.256,-.014),ring(.073,.077,.327,-.025),ring(.058,.052,.354,-.039)];
 const positions=rings.flat(2),indices=[];for(let j=0;j<3;j++)for(let i=0;i<16;i++){const a=j*17+i;indices.push(a,a+1,a+17,a+1,a+18,a+17);}for(let i=1;i<15;i++)indices.push(51,51+i,52+i);
 const crown=new THREE.BufferGeometry();crown.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));crown.setIndex(indices);crown.computeVertexNormals();part(hat,'jinyi-folded-crown',crown,0x232a30);
 for(const s of[-1,1]){
  const f=part(hat,'jinyi-cap-side-fold-'+s,new THREE.BoxGeometry(.019,.112,.097),0x303941,s*.075,.293,-.031);f.rotation.z=-s*.19;f.rotation.x=-.17;
 }
 const band=part(hat,'jinyi-cap-forehead-band',new THREE.CylinderGeometry(.106,.108,.023,16),0x151e25,0,.216,-.009);band.scale.z=.90;
 const pelvis=actor.root.getObjectByName('pelvis'),saber=new THREE.Group();saber.name='Original sheathed waist saber';pelvis.add(saber);groups.push(saber);saber.position.set(-.203,.055,.017);saber.rotation.set(-.23,0,-.30);
 // The waist-hung scabbard is a restrained interpretation of painted sidearms,
 // not a claim that a unique surviving blade identifies all 绣春刀.
 const path=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-.008,-.24,0),new THREE.Vector3(-.04,-.53,0),new THREE.Vector3(-.074,-.65,0)]);
 const sheath=part(saber,'jinyi-lacquer-scabbard',new THREE.TubeGeometry(path,14,.025,6,false),0x263336);sheath.scale.z=.63;
 for(const [y,x]of[[0,0],[-.18,-.006],[-.615,-.064]]){const band=part(saber,'jinyi-scabbard-fitting-'+y,new THREE.CylinderGeometry(.028,.028,.031,8),0xb39861,x,y,0);band.scale.z=.7;}
 const guard=part(saber,'jinyi-saber-guard',new THREE.CylinderGeometry(.048,.048,.011,12),0x9e824a,0,.041,0);guard.scale.z=.65;
 const grip=part(saber,'jinyi-wrapped-saber-grip',new THREE.CylinderGeometry(.017,.019,.132,8),0x493a2d,0,.11,0);grip.rotation.z=.06;
 part(saber,'jinyi-saber-pommel',new THREE.SphereGeometry(.021,8,6),0xa99059,-.004,.185,0).scale.set(1,.65,.8);
 const cord=new THREE.CatmullRomCurve3([new THREE.Vector3(.06,.052,.015),new THREE.Vector3(.03,-.075,.02),new THREE.Vector3(0,-.16,.02)]);part(saber,'jinyi-saber-suspension',new THREE.TubeGeometry(cord,8,.006,5,false),0x594534);
 let disposed=false;const handle={dispose(){if(disposed)return;disposed=true;for(const group of groups){group.removeFromParent();group.traverse(o=>o.geometry?.dispose());}for(const m of materials.values())m.dispose();delete actor.root.userData.jinyiCostume;}};actor.root.userData.jinyiCostume=handle;return handle;
}
