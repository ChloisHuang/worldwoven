/** ST08 lifecycle visuals. Minors have their own modest, non-anatomical rig.
 * No adult body mesh, wardrobe, or body-shape parameter enters a minor model.
 * Root translation/yaw belong to the simulation. All resources are actor-local.
 */
import * as THREE from 'three';
import {createCharacter} from './characters.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ageValue=age=>Number.isFinite(age)&&age>=0?age:null;
export function ageStage(ageYears){const age=ageValue(ageYears);return age===null?'unknown':age<2?'infant':age<12?'child':age<18?'adolescent':age<60?'adult':'elder';}
export function stageLabel(ageYears){return {unknown:'年龄未记录',infant:'婴幼儿',child:'儿童',adolescent:'青少年',adult:'成年',elder:'老年'}[ageStage(ageYears)];}
const aging=new WeakMap();
/** Existing adult actors only. Preserves root, materials, wardrobe and animation.
 * Hair uses private vertex colors; cached geometry and materials stay untouched.
 * Additive elder posture is omitted during contact/action poses.
 */
export function applyAgeStage(actor,ageYears){
 if(!actor?.root||actor.root.userData.familyMinor||actor.root.userData.disposed)return actor;
 const stage=ageStage(ageYears);if(stage!=='adult'&&stage!=='elder')return actor;
 let state=aging.get(actor);
 if(!state){
  const animate=actor.animate,dispose=actor.dispose,chest=actor.root.getObjectByName('chest');
  state={elder:false,chest,offset:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.045),applied:false,hair:[]};aging.set(actor,state);
  const undo=()=>{if(state.applied&&chest){chest.quaternion.multiply(state.offset.clone().invert());state.applied=false;}};
  const posture=()=>{if(state.elder&&chest){chest.quaternion.multiply(state.offset);state.applied=true;}actor.root.updateMatrixWorld(true);actor.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});};
  actor.animate=function(time,walking=false,action=null,context=null){undo();const result=animate.call(actor,time,walking,action,context);if(state.elder&&!action)posture();return result;};
  actor.dispose=function(){undo();for(const {mesh,original,local}of state.hair){mesh.geometry=original;local.dispose();}state.hair=[];aging.delete(actor);dispose.call(actor);};
  state.undo=undo;state.posture=posture;
 }
 if(state.elder!==(stage==='elder')){
  state.undo();state.elder=stage==='elder';
  if(state.elder){
   actor.root.traverse(mesh=>{
    const ranges=mesh.geometry?.userData?.sourceRanges?.filter(r=>/hair|fringe|combed|side-lock|side-flow/.test(r.name));
    if(!mesh.isSkinnedMesh||!ranges?.length)return;
    const original=mesh.geometry,local=original.clone(),colors=local.attributes.color;if(!colors){local.dispose();return;}
    local.userData={...local.userData,characterShared:false};const silver=new THREE.Color(0xaaa9a2),c=new THREE.Color();
    for(const range of ranges)for(let i=range.start;i<range.start+range.count;i++){c.fromBufferAttribute(colors,i).lerp(silver,.58);colors.setXYZ(i,c.r,c.g,c.b);}
    colors.needsUpdate=true;mesh.geometry=local;state.hair.push({mesh,original,local});
   });
  }else{for(const {mesh,original,local}of state.hair){mesh.geometry=original;local.dispose();}state.hair=[];actor.root.updateMatrixWorld(true);}
 }
 actor.root.userData.ageStage=stage;actor.root.userData.ageYears=ageValue(ageYears);return actor;
}
export function createFamilyCharacter({ageYears=null,country='china',seed=0,...look}={}){
 const age=ageValue(ageYears),stage=ageStage(age);
 if(stage==='unknown')return createCharacter({...look,culture:look.culture??country});
 if(stage==='adult'||stage==='elder')return applyAgeStage(createCharacter({...look,culture:look.culture??country}),age);
 const root=new THREE.Group();root.name='family-'+stage;root.userData.familyMinor=true;root.userData.ageStage=stage;root.userData.ageYears=age;
 const resources={geometry:new Set(),material:new Set()},mat=color=>{const m=new THREE.MeshToonMaterial({color});resources.material.add(m);return m;};
 const skin=mat(look.skin??0xdba783),hair=mat(look.hair??0x463328),cloth=mat(look.clothes??({china:0x799ba2,japan:0x819687,egypt:0xd6c5a0,france:0x7797ad}[country]??0x799ba2)),trim=mat(look.accent??0xe8dac2),pants=mat(0x586778),shoe=mat(0x534a40),eyes=mat(look.eyeColor??0x3b302b),white=mat(0xf5eee0),wood=mat(0x927053);
 function mesh(name,g,m,p=[0,0,0],s=[1,1,1],parent=root){resources.geometry.add(g);const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...p);o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const ball=(name,m,p,s,parent=root)=>mesh(name,new THREE.SphereGeometry(1,16,12),m,p,s,parent);
 const box=(name,m,p,s,parent=root)=>mesh(name,new THREE.BoxGeometry(...s),m,p,[1,1,1],parent);
 const tube=(name,m,top,bottom,length,p,parent=root)=>mesh(name,new THREE.CylinderGeometry(top,bottom,length,12),m,p,[1,1,1],parent);
 const head=new THREE.Group();head.name='family-head';
 function face(parent,r){
  ball('round-head',skin,[0,0,0],[r,r*1.07,r*.9],parent);
  for(const side of[-1,1]){
   ball('ear',skin,[side*r*.93,-r*.02,0],[r*.15,r*.23,r*.13],parent);
   ball('eye-white',white,[side*r*.35,r*.04,r*.831],[r*.14,r*.15,r*.065],parent);
   ball('eye-pupil',eyes,[side*r*.35,r*.03,r*.884],[r*.075,r*.095,r*.032],parent);
   ball('eye-light',white,[side*r*.35-r*.018,r*.07,r*.91],[r*.026,r*.03,r*.016],parent);
  }
  ball('small-nose',skin,[0,-r*.16,r*.9],[r*.11,r*.12,r*.13],parent);
  ball('smile',eyes,[0,-r*.4,r*.805],[r*.16,r*.025,r*.027],parent);
  // Upper hemisphere only: a simple cap, with the face and ears clear.
  mesh('hair-cap',new THREE.SphereGeometry(r*1.02,16,10,0,Math.PI*2,0,Math.PI*.51),hair,[0,r*.15,-r*.025],[1,1,1],parent);
 }
 let height,arms=[],legs=[],hands=[],feet=[],body;
 if(stage==='infant'){
  // Entirely swaddled on a mattress, low grounded cot with solid sides.
  box('cradle-base',wood,[0,.12,0],[.53,.10,.88]);
  for(const x of[-.205,.205])for(const z of[-.33,.33])box('cradle-foot',wood,[x,.035,z],[.08,.07,.09]);
  box('mattress',trim,[0,.20,0],[.45,.08,.78]);
  for(const x of[-.255,.255])box('cradle-side',wood,[x,.255,0],[.045,.22,.88]);
  for(const z of[-.43,.43])box('cradle-end',wood,[0,.26,z],[.53,.23,.045]);
  body=ball('closed-swaddle',cloth,[0,.30,.07],[.185,.12,.265]);
  box('swaddle-fold',trim,[0,.388,.05],[.30,.016,.045]);
  head.position.set(0,.315,-.245);head.rotation.x=-Math.PI/2;root.add(head);face(head,.118);height=.45;
 }else{
  // 2–11: 4.5–5 heads high. Adolescents: separate flat-torso six-head rig.
  height=stage==='child'?.84+clamp((age-2)/10,0,1)*.44:1.30+clamp((age-12)/6,0,1)*.25;
  const r=stage==='child'?height*.117:height*.094,hip=height*.43,shoulder=height*.70,width=height*.135,torsoLength=height*.29;
  body=new THREE.Group();body.name='loose-clothed-torso';root.add(body);
  tube('loose-tunic',cloth,width*.97,width*1.18,torsoLength,[0,shoulder-torsoLength/2,0],body).scale.z=.68;
  box('tunic-front-placket',trim,[0,shoulder-torsoLength*.43,width*.70],[height*.022,torsoLength*.76,.013],body);
  tube('covered-neck',trim,height*.048,height*.058,height*.075,[0,height*.746,0]);
  head.position.y=height-r*1.22;root.add(head);face(head,r);
  for(const side of[-1,1]){
   const arm=new THREE.Group();arm.position.set(side*width*.96,shoulder-height*.025,0);arm.rotation.z=side*.13;root.add(arm);arms.push(arm);
   const armLength=height*.24; tube('loose-sleeve',cloth,height*.057,height*.049,armLength,[0,-armLength/2,0],arm);
   hands.push(ball('mitten-hand',skin,[0,-armLength-height*.025,0],[height*.04,height*.047,height*.034],arm));
   const leg=new THREE.Group();leg.position.set(side*height*.067,hip,0);root.add(leg);legs.push(leg);
   const legLength=hip-height*.055;tube('loose-trousers',pants,height*.058,height*.045,legLength,[0,-legLength/2,0],leg);
   feet.push(ball('closed-shoe',shoe,[0,-hip+height*.033,height*.034],[height*.051,height*.033,height*.083],leg));
  }
 }
 const phase=typeof seed==='number'?seed:([...String(seed)].reduce((sum,c)=>sum+c.charCodeAt(0),0));let disposed=false,walkingNow=false;
 const actor={root,height,locomotion:Object.freeze({walkSpeed:stage==='infant'?0:height*1.05,hurrySpeed:stage==='infant'?0:height*1.4,stepLength:height*.24,strideLength:height*.48,lift:height*.035,armSwing:.14,label:'age-appropriate family gait'}),
  animate(time,walking=false){if(disposed)return;walkingNow=!!walking&&stage!=='infant';const t=Number.isFinite(time)?time:0;
   if(stage==='infant'){body.scale.y=.12*(1+Math.sin(t*1.4+phase)*.015);return;}
   const swing=walkingNow?Math.sin(t*6+phase)*.23:0;
   legs.forEach((leg,i)=>{leg.rotation.x=(i?1:-1)*swing;const a=leg.rotation.x;leg.position.y=height*(.397*Math.cos(a)+.034*Math.sin(a)+Math.hypot(.033*Math.cos(a),.083*Math.sin(a)));});
   arms.forEach((arm,i)=>{arm.rotation.x=(i?-1:1)*swing*.65;});head.rotation.y=Math.sin(t*.55+phase)*.035;root.updateMatrixWorld(true);
  },
  getPoseMetrics(){const local=o=>root.worldToLocal(o.getWorldPosition(new THREE.Vector3())).toArray();root.updateMatrixWorld(true);return {height,headHeight:stage==='infant'?.43:height,labelHeight:height+.16,visualFloorOffset:0,grounded:true,rigBones:0,continuousCloth:true,ageStage:stage,walking:walkingNow,feet:feet.map(local),hands:hands.map(local)};},
  dispose(){if(disposed)return;disposed=true;resources.geometry.forEach(g=>g.dispose());resources.material.forEach(m=>m.dispose());root.userData.disposed=true;}
 };
 root.userData.labelHeight=height+.16;actor.animate(0);return actor;
}
