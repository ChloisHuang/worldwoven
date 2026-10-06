import {tellerSame} from './china-teller-audit-proof.js';
// Dormant replacement for precisely the original open ledger, brush and abacus.
// The scene integrator must omit those old decorative nodes, never overlay them.
export function createTellerTools(G,{group}){
 const T=G.THREE,root=new T.Group();root.name='Original money-house ledger and abacus';group.add(root);
 const wood=0x63452d,bronze=0xb58d48,ledger=new T.Group(),abacus=new T.Group();
 ledger.name='cn-teller-original-ledger';ledger.position.set(-21.30,1.335,-27.70);root.add(ledger);
 G.box(ledger,0,-.024,0,.72,.036,.46,0x684b35);
 for(const x of[-.18,.17])G.box(ledger,x,0,0,.34,.013,.43,0xecdfb6);
 for(let j=0;j<5;j++)for(const x of[-.22,.15]){G.box(ledger,x,.009,-.15+j*.066,.23,.004,.009,0xa88d63);G.box(ledger,x+.07,.013,-.14+j*.066,.032,.004,.017,0x5a5441);}
 const cursor=G.box(ledger,0,.017,-.135,.55,.003,.005,0xa24f3b);cursor.visible=false;
 abacus.name='cn-teller-original-eleven-rod-abacus';abacus.position.set(-20.43,1.31,-27.71);abacus.rotation.y=Math.PI;root.add(abacus);
 for(const x of[-.45,.45])G.box(abacus,x,.045,0,.055,.09,.50,wood);for(const z of[-.25,-.075,.25])G.box(abacus,0,.045,z,.94,.09,.04,wood);
 const beadGeo=new T.LatheGeometry([new T.Vector2(0,-.021),new T.Vector2(.025,-.017),new T.Vector2(.035,0),new T.Vector2(.025,.017),new T.Vector2(0,.021)],8);beadGeo.rotateX(Math.PI/2);
 const rods=[];
 for(let i=0;i<11;i++){const x=-.38+i*.076,rod=G.cyl(abacus,x,.053,0,.009,.009,.465,bronze,6);rod.rotation.x=Math.PI/2;const beads=[];for(const z of[-.198,-.147,.005,.05,.095,.14,.185])beads.push(G.mesh(abacus,beadGeo,0x342e25,x,.059,z));rods.push(beads);}
 const pen=new T.Group();pen.name='cn-teller-original-brush';root.add(pen);G.cyl(pen,0,.135,0,.007,.007,.26,wood,8);const nib=G.cone(pen,0,.0125,0,.008,.025,0x403328,8);nib.rotation.z=Math.PI;
 const ink=G.box(root,-21.78,1.31,-27.66,.12,.025,.11,0x404334);
 const restTip=new T.Vector3(-20.92,1.304,-27.83),restRotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2),upright=new T.Quaternion();
 let lastWork=null,targets=null,expected=null,expectedPen=null;
 const smooth=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};
 const neutral=[-.198,-.147,.005,.05,.095,.14,.185];
 const beadZ=(digit,k)=>k<2?(k===1&&digit>=5?-.118:neutral[k]):(k-2<digit%5?-.033+(k-2)*.043:neutral[k]);
 function model(work){
  const total=work?.row?.total;if(work&&(!work.row||!Number.isSafeInteger(total)||total<0||total!==work.row.cash+work.row.bank+work.row.held))return null;
  const seconds=Math.max(0,Math.min(2,work?.seconds||0));let positions=rods.map(()=>neutral.slice()),points=null;
  if(work?.target==='abacus'){
   // Eleven rods display two decimal windows so safe-integer totals never truncate.
   const digits=String(total).padStart(22,'0'),page=seconds<=1?0:1,p=seconds<=1?seconds:seconds-1,progress=p*11,index=Math.min(10,Math.floor(progress));
   positions=rods.map((r,i)=>r.map((_,k)=>{const end=beadZ(Number(digits[page*11+i]),k),f=i<index?1:i===index?smooth(progress-i):0;return neutral[k]+(end-neutral[k])*f;}));
   const x=-.38+index*.076,z=positions[index][2];
   points=index<5?[[x,.095,z],[.34,.09,.20]]:[[-.34,.09,.20],[x,.095,z]];
   return {positions,points,seconds,page,digits:digits.slice(page*11,page*11+11),rod:index};
  }
  if(work){const row=['copper','japan','egypt','france'].indexOf(work.currency),z=-.135+Math.max(0,row)*.066;points=[[-.18,.017,z],[.16,.017,z]];return {positions,points,seconds,row,z};}
  return {positions,points,seconds};
 }
 function project(work){
  const m=model(work);if(!m)return false;lastWork=work?structuredClone(work):null;expected=m;
  cursor.visible=!!work&&work.target==='ledger';if(cursor.visible)cursor.position.z=m.z;
  for(let i=0;i<11;i++)for(let k=0;k<7;k++)rods[i][k].position.z=m.positions[i][k];
  pen.position.copy(restTip);pen.quaternion.copy(restRotation);
  if(work?.stage==='record'){
   const seconds=m.seconds,f=seconds<.3?smooth(seconds/.3):seconds>1.7?smooth((2-seconds)/.3):1;
   const tip=new T.Vector3(.10+Math.sin(seconds*9)*.015,.0065,m.z);ledger.localToWorld(tip);root.worldToLocal(tip);
   pen.position.lerp(tip,f);pen.quaternion.slerp(upright,f);
  }
  expectedPen={position:pen.position.clone(),quaternion:pen.quaternion.clone()};root.updateWorldMatrix(true,true);
  if(!work){targets=null;return true;}
  const object=work.target==='abacus'?abacus:ledger;targets=m.points.map(p=>object.localToWorld(new T.Vector3(...p)));
  if(work.stage==='record')targets[1]=pen.localToWorld(new T.Vector3(0,.13,0));
  targets.sort((a,b)=>a.x-b.x);return true;
 }
 const beadSet=new Set(rods.flat()),required=[],geometries=new Map();
 root.traverse(node=>{
  required.push({node,parent:node.parent,children:node.children.length,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),geometry:node.geometry||null});
  if(node.geometry&&!geometries.has(node.geometry)){const g=node.geometry;geometries.set(g,{position:g.attributes.position,vertices:Array.from(g.attributes.position.array),index:g.index,indices:g.index?Array.from(g.index.array):null});}
 });
 const arraySame=(a,b)=>a?.length===b?.length&&b.every((v,i)=>a[i]===v);
 const intact=()=>{
  for(let n=root;n;n=n.parent)if(!n.visible)return false;
  if(!required.every(r=>{const n=r.node;if(n.parent!==r.parent||n.children.length!==r.children||!n.matrixAutoUpdate||n!==cursor&&!n.visible||!n.scale.equals(r.scale)||(n.geometry||null)!==r.geometry)return false;
   if(n!==pen&&n.quaternion.angleTo(r.quaternion)>1e-7)return false;
   if(n!==pen){if(n.position.x!==r.position.x||n.position.y!==r.position.y||n!==cursor&&!beadSet.has(n)&&n.position.z!==r.position.z)return false;}
   if(n.isMesh&&(!n.geometry||!n.material||n.material.visible===false||n.material.opacity===0))return false;return true;
  }))return false;
  return [...geometries].every(([g,r])=>g.attributes.position===r.position&&g.index===r.index&&arraySame(g.attributes.position?.array,r.vertices)&&(!r.indices||arraySame(g.index?.array,r.indices)));
 };
 function matches(work){const m=model(work);return intact()&&!!m&&!!expectedPen&&pen.position.distanceTo(expectedPen.position)<1e-7&&pen.quaternion.angleTo(expectedPen.quaternion)<1e-7&&tellerSame(work,lastWork)&&rods.every((r,i)=>r.every((b,k)=>Math.abs(b.position.z-m.positions[i][k])<1e-7))&&ledger.position.distanceTo(new T.Vector3(-21.30,1.335,-27.70))<1e-7&&abacus.position.distanceTo(new T.Vector3(-20.43,1.31,-27.71))<1e-7&&Math.abs(abacus.rotation.y-Math.PI)<1e-7;}
 project(null);
 return {root,ledger,abacus,pen,nib,ink,rods,project,matches,
  pose(n,t,work,context={}){
   if(!work){project(null);n.animate(t,n.walking,null,context);return;}
   if(!project(work))return;n.root.rotation.y=0;n.root.updateWorldMatrix(true,true);const body=n.root.userData.body||n.root;body.updateWorldMatrix(true,false);
   const hands=targets.map(p=>body.worldToLocal(p.clone()).toArray());
   n.animate(t,false,'tidy',{...context,workHeight:undefined,workDistance:undefined,handoff:true,handoffLean:.5,handoffDip:.035,heldProp:null,archery:{hands}});
   if(n.root.userData.tools?.cloth)n.root.userData.tools.cloth.visible=false;
  },
  contact(n,target,work){
   if(!work||work.target!==target||!matches(work)||!targets)return false;const hands=n?.root?.userData?.hands;if(!Array.isArray(hands)||hands.length!==2)return false;
   n.root.updateWorldMatrix(true,true);root.updateWorldMatrix(true,true);
   if(!hands.every((h,i)=>h.getWorldPosition(new T.Vector3()).distanceTo(targets[i])<.025))return false;
   if(work.stage==='record'&&work.seconds>=.3&&work.seconds<=1.7){const tip=ledger.worldToLocal(nib.localToWorld(new T.Vector3(0,.0125,0)));if(Math.abs(tip.y-.0065)>.003||Math.abs(tip.z-expected.z)>.003)return false;}
   return true;
  },
  state:()=>({ledgerId:ledger.name,abacusId:abacus.name,work:lastWork?structuredClone(lastWork):null,display:expected?structuredClone(expected):null,handTargets:targets?.map(p=>p.toArray())||[],penTip:nib.localToWorld(new T.Vector3(0,.0125,0)).toArray()}),
  dispose(){root.removeFromParent();const seen=new Set();root.traverse(n=>{if(n.geometry&&!seen.has(n.geometry)){seen.add(n.geometry);n.geometry.dispose();}});}
 };
}
