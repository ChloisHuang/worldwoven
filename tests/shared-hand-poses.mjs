/** Focused regression for the shared hand repair.
 * The old global action wrist reset folded ordinary hands back by 140–168°
 * while every wrist-position test still passed. Measure relative hand/forearm
 * long axes, preserve real fitted palm contacts, and check counter-rotated props.
 * Run: node --experimental-vm-modules tests/shared-hand-poses.mjs
 * This is CPU rig/contact evidence, not a substitute for normal-view visual QA.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const source=path.resolve(process.env.SOURCE_ROOT||'source'),cache=new Map();
function mod(file){file=path.resolve(file.split('?')[0]);if(!cache.has(file))cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file}));return cache.get(file);}
const link=(name,parent)=>mod(name==='three'?source+'/vendor/three/build/three.module.js':path.resolve(path.dirname(parent.identifier),name));
async function load(name){const m=mod(source+'/'+name);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
await load('game/character-live-entry.js');
const C=await load('game/characters.js'),T=await load('vendor/three/build/three.module.js'),A=await load('game/appearance.js'),F=await load('game/furniture-interactions.js'),Court=await load('game/china-court-posture.js');
const V=(...a)=>new T.Vector3(...a),report={scope:'Shared hand long-axis bend; 32 ordinary body/cut cases; actual chair/onsen/court palm support; authored hand targets; prop counter-rotation; exit recovery. CPU only.',poses:0,ordinary:[],actions:[],contexts:[],onsen:[],court:[],failures:[]};
function check(ok,label,data){if(!ok)report.failures.push({check:label,...data});}
function update(actor){actor.root.updateWorldMatrix(true,true);actor.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});}
function bent(actor){return actor.root.userData.hands.map(hand=>V(0,-1,0).angleTo(V(0,-1,0).applyQuaternion(hand.quaternion))*180/Math.PI);}
function lengths(actor){const body=actor.root.userData.body;return [0,1].flatMap(s=>{const p=['arms','forearms','hands'].map(k=>body.worldToLocal(actor.root.userData[k][s].getWorldPosition(V())));return [p[0].distanceTo(p[1]),p[1].distanceTo(p[2])];});}
function absoluteRigRotation(bone,rig){const q=new T.Quaternion();for(let n=bone;n&&n!==rig;n=n.parent)q.premultiply(n.quaternion);return q;}
function inspect(actor,label,original,{fitted=false,time=1,context={}}={}){
 update(actor);report.poses++;
 const bend=bent(actor),limbs=lengths(actor);
 if(Object.values(actor.root.userData.tools).every(p=>!p.visible))actor.root.traverse(mesh=>{if(mesh.isSkinnedMesh&&mesh.morphTargetInfluences)check(mesh.morphTargetInfluences.every(v=>v===0),'finger curl released with hidden tools',{label,influences:[...mesh.morphTargetInfluences]});});
 check(limbs.every((v,i)=>Math.abs(v-original[i])<1e-6),'anatomical limb lengths',{label,limbs,original});
 check(bend.every(Number.isFinite),'finite hand orientation',{label,bend});
 if(!fitted)check(bend.every(deg=>deg<=45),'ordinary wrist bends more than 45 degrees',{label,bend});
 // Containers cancel the absolute palm rotation. Existing cup/brush/knife etc.
 // must not tip merely because the hand turns naturally toward the body.
 for(const side of[0,1]){
  const hand=actor.root.userData.hands[side],container=hand.getObjectByName(side?'character-right-hand-props':'character-left-hand-props');
  const q=absoluteRigRotation(hand,actor.root.userData.body).multiply(container.quaternion),expected=new T.Quaternion(),action=actor.getPoseMetrics().action;
  if(side===1&&action==='sushi-eat')expected.setFromAxisAngle(V(1,0,0),-Math.pow((Math.sin(time*.95)+1)*.5,2)*.55);
  if(side===1&&action==='chair-sit'&&context.seatedMeal)expected.setFromAxisAngle(V(1,0,0),-Math.pow((Math.sin(time*1.6)+1)*.5,2)*.55);
  if(side===1&&/garden/.test(action||''))expected.setFromAxisAngle(V(0,0,1),-.35);
  check(q.angleTo(expected)<1e-6,'prop container changed authored orientation',{label,side,angle:q.angleTo(expected)});
 }
 return bend;
}
function geometryContract(actor,label){
 check(actor.root.userData.characterModel.applied===true,'production complete-adult adapter installed',{label,model:actor.root.userData.characterModel});
 const skin=actor.root.getObjectByName('approved-face-skin'),g=skin.geometry;
 for(const side of[-1,1]){
  const palm=g.userData.sourceRanges.find(r=>r.name==='relaxed-palm-'+side),fingers=g.userData.sourceRanges.filter(r=>r.name.startsWith('relaxed-finger-'+side+'-'));
  check(!!palm&&fingers.length===4,'one palm and four independent fingers',{label,side});
  const ranges=g.userData.sourceRanges.filter(r=>r.name==='relaxed-palm-'+side||r.name==='thumb-'+side||r.name.startsWith('relaxed-finger-'+side+'-'));
  for(const r of ranges)for(let i=r.start;i<r.start+r.count;i++){
   const nonzero=[];for(let j=0;j<4;j++)if(g.attributes.skinWeight.getComponent(i,j))nonzero.push([g.attributes.skinIndex.getComponent(i,j),g.attributes.skinWeight.getComponent(i,j)]);
   check(nonzero.length===1&&nonzero[0][0]===(side<0?6:9)&&nonzero[0][1]===1,'hand surface rigidly follows correct wrist',{label,range:r.name,vertex:i});
  }
 }
}
function lapContacts(actor){
 // Independent real-triangle ray comparison, in rig-local coordinates. Only
 // the palm midsection is expected to support the hand; fingertips may hover.
 const body=actor.root.userData.body,inverse=body.matrixWorld.clone().invert(),triangles=[];
 actor.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const g=mesh.geometry;
  for(const r of g.userData.sourceRanges){if(!/body|bodice|skirt|trouser|tunic|kilt|robe/.test(r.name)||/sleeve|fold|seam|border|panel|belt|sash/.test(r.name))continue;
   for(let j=r.indexStart;j<r.indexStart+r.indexCount;j+=3){const ids=[0,1,2].map(k=>g.index.getX(j+k)),sy=ids.reduce((sum,i)=>sum+(g.attributes.sourceY?.getX(i)??g.attributes.position.getY(i)),0)/3;if(sy<.68||sy>.98)continue;
    const points=ids.map(i=>mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse));
    const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();if(Math.abs(normal.y)<.45)continue;triangles.push(points);
   }
  }
 });
 const skin=actor.root.getObjectByName('approved-face-skin'),g=skin.geometry,down=V(0,-1,0),hit=V();
 return [-1,1].map(side=>{const r=g.userData.sourceRanges.find(r=>r.name==='relaxed-palm-'+side);let minimum=Infinity,closest=Infinity,samples=0;
  for(let i=r.start;i<r.start+r.count;i++){const sy=g.attributes.sourceY?.getX(i)??g.attributes.position.getY(i);if(sy<.855||sy>.895)continue;const p=skin.getVertexPosition(i,V()).applyMatrix4(skin.matrixWorld).applyMatrix4(inverse),ray=new T.Ray(p.clone().add(V(0,.20,0)),down);let top=-Infinity;
   for(const tri of triangles)if(ray.intersectTriangle(...tri,false,hit)&&hit.y>top)top=hit.y;
   if(!Number.isFinite(top))continue;const gap=(p.y-top)*actor.root.scale.y;minimum=Math.min(minimum,gap);closest=Math.min(closest,Math.abs(gap));samples++;
  }
  return {side,minimum,closest,samples};
 });
}

for(const culture of ['japan','china','egypt','france'])for(const [variant,bodyPreset] of A.BODY_PRESETS.entries())for(const cut of[0,1]){
 const wardrobePreset=A.WARDROBE_PRESETS[culture][bodyPreset.startsWith('masculine')?'masculine':'feminine'][cut],actor=C.createCharacter({culture,bodyPreset,wardrobePreset}),label=culture+'/'+bodyPreset+'/'+cut;
 actor.animate(0,false,null);update(actor);const original=lengths(actor);geometryContract(actor,label);
 for(const t of[.2,1]){actor.animate(t,false,null,{headLook:{yaw:.4,pitch:.08,weight:1}});inspect(actor,label+'/idle-social',original);actor.root.position.z+=.035;actor.animate(t+.05,true,null,{groundHeightAt:()=>0});inspect(actor,label+'/walk',original);}
 const seat=F.FURNITURE_DESCRIPTORS[culture].seat,context={seatHeight:seat.seatY-seat.anchor[1],headLook:{yaw:-.35,pitch:.04,weight:1}};
 actor.animate(2,false,'chair-sit',context);inspect(actor,label+'/chair-social',original,{fitted:true});const contact=lapContacts(actor);
 for(const c of contact)check(c.samples>0&&c.closest<.02&&c.minimum>-.025,'chair palm support',{label,...c});
 actor.animate(2.1,false,null);inspect(actor,label+'/exit',original);check(Object.values(actor.root.userData.tools).every(p=>!p.visible),'props hidden after action exit',{label});
 report.ordinary.push({culture,bodyPreset,wardrobePreset,contact});actor.dispose();
}

// These branch names are wired by the current country stations and services.
// They are not an invented all-actions-in-all-countries matrix.
const countryActions={japan:['tea','kotatsu','ramen','sushi-eat','sushi','herb-mix','bath-attendant','tidy','calligraphy','relax','read'],china:['tea','read','calligraphy','cook','knead','herb-mix','tidy','relax'],egypt:['paint','knead','tea','tidy','garden','ritual','herb-mix','read','talk'],france:['tea','cook','paint','read','tidy','relax','garden']};
for(const [culture,actions]of Object.entries(countryActions))for(const bodyPreset of['feminine-balanced','masculine-broad']){
 const actor=C.createCharacter({culture,bodyPreset});actor.animate(0,false,null);update(actor);const original=lengths(actor);
 for(const action of actions){let maximum=0;for(const time of[0,1,2.5]){actor.animate(time,false,action);maximum=Math.max(maximum,...inspect(actor,culture+'/'+bodyPreset+'/'+action,original,{time}));}report.actions.push({culture,bodyPreset,action,maximumBend:maximum});}
 actor.dispose();
}
const contexts=[
 {name:'neutral handoff',culture:'china',action:null,c:{handoff:true}},
 {name:'cloth delivery',culture:'japan',action:null,c:{heldProp:'cloth',handoff:true}},
 {name:'bucket carry',culture:'japan',action:null,c:{heldProp:'bathBucket'}},
 {name:'authored shared hand targets',culture:'china',action:null,c:{archery:{hands:[[-.18,1.12,.35],[.17,1.22,.30]]},handoff:true}},
 {name:'authored tidy hand targets',culture:'china',action:'tidy',c:{archery:{hands:[[-.18,1.12,.35],[.17,1.22,.30]]},handoff:true}},
 {name:'seated delivered meal',culture:'egypt',action:'chair-sit',c:{seatHeight:.66,seatedMeal:true,handoff:true}},
 {name:'seated French cup',culture:'france',action:'chair-sit',c:{seatHeight:.65,handoff:true,archery:{hands:[[-.18,.80,.25],[.10,1.12,.26]]}}},
 {name:'gardener tool',culture:'france',action:null,bodies:['masculine-lean'],c:{archery:{hands:[[-.16,1.04,.27],[.19,1.05,.37]]}}},
 {name:'Japan seated tea performer',culture:'japan',action:'chair-sit',c:{seatHeight:.63,handoff:false,archery:{hands:[[-.18,.89,.26],[.18,.98,.27]]}}},
 {name:'archery hold',culture:'china',action:null,c:{archery:{hands:[[-.24,1.04,.21],[.27,.96,.07]]}}},
 {name:'archery aim',culture:'china',action:null,c:{archery:{hands:[[-.17,1.35,.44],[-.12,1.37,.06]]}}},
 {name:'archery release',culture:'china',action:null,c:{archery:{hands:[[-.17,1.35,.44],[.13,1.38,-.04]]}}},
 {name:'archery collect',culture:'china',action:null,c:{archery:{hands:[[-.24,1.04,.21],[-.10,1.34,.48]]}}},
 {name:'working brush',culture:'china',action:'calligraphy',c:{workHeight:1.15,workDistance:.45}},
 {name:'high kitchen knife',culture:'egypt',action:'cook',c:{workHeight:1.45,workDistance:.35}}
];
for(const row of contexts)for(const bodyPreset of(row.bodies||['feminine-balanced','masculine-broad'])){
 const actor=C.createCharacter({culture:row.culture,bodyPreset});actor.animate(0,false,null);update(actor);const original=lengths(actor);actor.animate(1,false,row.action,row.c);const bend=inspect(actor,row.name+'/'+bodyPreset,original,{time:1,context:row.c});
 if(row.c.archery)for(const [side,target]of row.c.archery.hands.entries()){if(!target)continue;const body=actor.root.userData.body,actual=body.worldToLocal(actor.root.userData.hands[side].getWorldPosition(V())),shoulder=body.worldToLocal(actor.root.userData.arms[side].getWorldPosition(V())),delta=V(...target).sub(shoulder),upper=original[side*2],lower=original[side*2+1],distance=Math.max(Math.abs(upper-lower)+.002,Math.min(upper+lower-.0005,delta.length())),expected=shoulder.add(delta.normalize().multiplyScalar(distance)),gap=actual.distanceTo(expected);check(gap<1e-6,'authored wrist target retains anatomical clamp',{name:row.name,bodyPreset,side,gap});}
 report.contexts.push({name:row.name,bodyPreset,bend});actor.animate(1.1,false,null);inspect(actor,row.name+'/restore',original);actor.dispose();
}

const bath=F.REST_BATH_DESCRIPTORS.japan.find(d=>d.kind==='bath');
for(const bodyPreset of A.BODY_PRESETS)for(const legLength of[.94,1.06]){
 const actor=C.createCharacter({culture:'japan',bodyPreset,wardrobePreset:'onsen-swimwear',shapeTraits:{legLength}});actor.root.position.fromArray(bath.anchor);actor.root.rotation.y=bath.yaw;actor.animate(0,false,null);update(actor);const original=lengths(actor);
 actor.animate(1,false,'bathe',{supportY:bath.supportY,bathPose:bath.bathPose,bathHipHeight:bath.bathHipHeight});inspect(actor,'onsen/'+bodyPreset+'/'+legLength,original,{fitted:true});const contact=actor.getPoseMetrics().bathHandContact;
 check(contact&&contact.palm.gap>=0&&contact.palm.gap<.015,'onsen real lap palm contact',{bodyPreset,legLength,contact});check(contact&&contact.forearm.gap>=0&&contact.forearm.gap<.014,'onsen ledge support',{bodyPreset,legLength,contact});
 report.onsen.push({bodyPreset,legLength,contact});actor.animate(1.1,false,null);inspect(actor,'onsen exit',original);actor.dispose();
}

// Court is an after-animate overlay with its own orientation and real vertex
// fitting. Do not force it through the ordinary-action wrist rule.
for(const bodyPreset of A.BODY_PRESETS){
 const actor=C.createCharacter({culture:'china',bodyPreset,wardrobePreset:'court-official-long-robe'}),posture=Court.createCourtPosture(actor);let maximumGap=0;
 for(const kneeling of[0,.5,1])for(const raised of[0,1]){actor.animate(1,false,null);posture.apply({kneeling,raised,holding:true,time:1});update(actor);const p=actor.root.userData.courtPosture;
  for(const side of[0,1]){const wanted=V((side?1:-1)*.0506,p.tabletBase[1]+.064+(side?-.004:.004),p.tabletBase[2]),actual=V(...p.palmContacts[side]),gap=actual.distanceTo(wanted);maximumGap=Math.max(maximumGap,gap);check(gap<.008,'court actual palm-to-tablet contact',{bodyPreset,kneeling,raised,side,gap});}
 }
 posture.stop();actor.animate(2,false,null);check(!actor.root.userData.courtPosture&&!posture.tablet.visible,'court exit restores ordinary hands',{bodyPreset});report.court.push({bodyPreset,maximumGap});posture.dispose();actor.dispose();
}
// Shared immutable templates must not share mutable per-person finger curls.
const holding=C.createCharacter({culture:'china',bodyPreset:'feminine-balanced'}),idleTwin=C.createCharacter({culture:'china',bodyPreset:'feminine-balanced'});
holding.animate(1,false,'tea');idleTwin.animate(1,false,null);const gripSkin=holding.root.getObjectByName('approved-face-skin'),idleSkin=idleTwin.root.getObjectByName('approved-face-skin');
check(gripSkin.geometry===idleSkin.geometry&&gripSkin.morphTargetInfluences!==idleSkin.morphTargetInfluences,'curl instance ownership',{});
check(gripSkin.morphTargetInfluences[1]>0&&idleSkin.morphTargetInfluences.every(v=>v===0),'held grip cannot curl another actor',{});
holding.animate(1.1,false,null);check(gripSkin.morphTargetInfluences.every(v=>v===0),'grip release clears finger morph',{});holding.dispose();idleTwin.dispose();

check(C.characterResourceStats().activeReferences===0,'all temporary actors released',{});
report.status=report.failures.length?'FAIL':'PASS';fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/shared-hand-poses.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,poses:report.poses,ordinary:report.ordinary.length,actions:report.actions.length,contexts:report.contexts.length,onsen:report.onsen.length,court:report.court.length,failures:report.failures.slice(0,30),failureCount:report.failures.length},null,2));
assert.equal(report.failures.length,0,'See qa/shared-hand-poses.json for actual wrist/contact failures');
