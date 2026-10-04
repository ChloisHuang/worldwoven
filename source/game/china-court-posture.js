/** Original court kneeling/hu-tablet overlay for the production character rig.
 * Call apply AFTER actor.animate; the actor owns its unchanged production mesh,
 * skeleton and costume. This handle owns only its small procedural hu tablet.
 * Local +Z is forward, Y is up, and actor.root remains the navigation anchor.
 */
import * as THREE from 'three';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const Q=()=>new THREE.Quaternion();
const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));

// A tiny convex outline fits the existing rotating boot to the floor without
// traversing any mesh buffers per frame. Rotation is in its local Y/Z plane.
function outline(points){
 const sorted=[...new Map(points.map(p=>[p.join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lower=[],upper=[];
 for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of sorted.reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 return lower.slice(0,-1).concat(upper.slice(0,-1));
}

function makeTablet(){
 const w=.049,h=.408,r=.019,shape=new THREE.Shape();
 shape.moveTo(-w,0);shape.lineTo(w,0);shape.lineTo(w,h-r);
 shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);
 shape.quadraticCurveTo(-w,h,-w,h-r);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:true,bevelSegments:2,bevelSize:.0016,bevelThickness:.0015,curveSegments:6,steps:1});
 geometry.translate(0,0,-.0045);
 const material=new THREE.MeshToonMaterial({color:0xe3d6b3});
 const tablet=new THREE.Mesh(geometry,material);tablet.name='Original rounded ivory hu tablet';tablet.castShadow=true;tablet.visible=false;
 return tablet;
}

export function createCourtPosture(actor){
 const {root}=actor,rig=root?.userData?.body;
 let mesh;rig?.traverse(o=>{if(!mesh&&o.isSkinnedMesh)mesh=o;});
 if(!mesh||mesh.skeleton.bones.length!==18)throw new Error('Court posture requires the production 18-bone character rig');
 const skeleton=mesh.skeleton,bones=skeleton.bones;
 const parent=bones.map(b=>bones.indexOf(b.parent));
 // Bind matrices recover the actual shaped anatomy, independent of the actor's
 // current pose or location. Never edit the shared template buffers or weights.
 const inverseBindMesh=mesh.bindMatrix.clone().invert();
 const rest=skeleton.boneInverses.map(m=>V().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(inverseBindMesh,m.clone().invert())));
 const p=rest.map(v=>v.clone()),q=rest.map(Q),baseP=rest.map(()=>V()),baseQ=rest.map(Q);
 const inverseRig=new THREE.Matrix4(),relative=new THREE.Matrix4(),scale=V();
 const direction=V(),pole=V(),from=V(),inverse=Q(),torso=Q(),head=Q();
 const palmRotation=[-1,1].map(side=>Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0,0,side),V(0,-1,0),V(side,0,0))));
 const palmContact=[V(),V()],palmVertex=[null,null],bootPoints=[[],[]];
 // Pick a real palm vertex at its midsection. Fitting that point to each lower
 // side means both original hands touch the prop, instead of moving a prop
 // somewhere between approximate wrist targets.
 rig.traverse(m=>{if(!m.isSkinnedMesh)return;
  const position=m.geometry.attributes.position;
  for(const range of m.geometry.userData.sourceRanges||[]){
   if(!/footwear|sole-/.test(range.name))continue;
   const side=position.getX(range.start)>0?1:0,foot=side?15:12;
   for(let i=range.start;i<range.start+range.count;i++)bootPoints[side].push([position.getY(i)-rest[foot].y,position.getZ(i)-rest[foot].z]);
  }
  for(let side=0;side<2;side++){
  const sign=side?1:-1,hand=side?9:6,range=m.geometry.userData.sourceRanges?.find(r=>r.name==='relaxed-palm-'+sign);
  if(!range)continue;let best=Infinity;
  const position=m.geometry.attributes.position,sourceY=m.geometry.attributes.sourceY;
  for(let i=range.start;i<range.start+range.count;i++){
   const y=sourceY?.getX(i)??position.getY(i);if(y<.86||y>.89)continue;
   from.fromBufferAttribute(position,i).sub(rest[hand]).applyQuaternion(palmRotation[side]);
   if(sign*from.x<best){best=sign*from.x;palmContact[side].copy(from);palmVertex[side]={mesh:m,index:i};}
  }
 }});
 if(palmVertex.some(v=>!v)||bootPoints.some(v=>!v.length))throw new Error('Court posture requires production palms and footwear');
 const bootOutline=bootPoints.map(outline);
 const tablet=makeTablet();rig.add(tablet);
 let baseLabelHeight=root.userData.labelHeight;
 const lastLocalP=bones.map(()=>V()),lastLocalQ=bones.map(Q);
 let disposed=false,active=false;

 function orient(a,b){q[a].setFromUnitVectors(from.copy(rest[b]).sub(rest[a]).normalize(),direction.copy(p[b]).sub(p[a]).normalize());}
 function solve(a,b,c,target,bend){
  const upper=rest[a].distanceTo(rest[b]),lower=rest[b].distanceTo(rest[c]);
  direction.copy(target).sub(p[a]);const length=Math.max(Math.abs(upper-lower)+1e-5,Math.min(upper+lower-1e-5,direction.length()));direction.normalize();
  const along=(upper*upper-lower*lower+length*length)/(2*length),high=Math.sqrt(Math.max(0,upper*upper-along*along));
  pole.copy(bend).addScaledVector(direction,-bend.dot(direction)).normalize();
  p[c].copy(p[a]).addScaledVector(direction,length);p[b].copy(p[a]).addScaledVector(direction,along).addScaledVector(pole,high);
  orient(a,b);orient(b,c);q[c].copy(q[b]);
 }
 function capture(){
  baseLabelHeight=root.userData.labelHeight;
  root.updateMatrixWorld(true);inverseRig.copy(rig.matrixWorld).invert();
  for(let i=0;i<bones.length;i++){
   relative.multiplyMatrices(inverseRig,bones[i].matrixWorld);relative.decompose(baseP[i],baseQ[i],scale);
   p[i].copy(baseP[i]);q[i].copy(baseQ[i]);
  }
 }
 function commit(){
  for(let i=0;i<bones.length;i++){
   const j=parent[i];if(j<0){bones[i].position.copy(p[i]);bones[i].quaternion.copy(q[i]);}
   else{inverse.copy(q[j]).invert();bones[i].position.copy(p[i]).sub(p[j]).applyQuaternion(inverse);bones[i].quaternion.copy(inverse).multiply(q[i]);}
   lastLocalP[i].copy(bones[i].position);lastLocalQ[i].copy(bones[i].quaternion);
  }
  rig.updateMatrixWorld(true);skeleton.update();
 }
 function stop(){
  if(disposed)return;
  // animate() may already have supplied a fresh pose. Only undo this overlay
  // if its last transforms remain installed; never restore stale walking legs.
  const ours=active&&bones.every((b,i)=>b.position.distanceToSquared(lastLocalP[i])<1e-16&&1-Math.abs(b.quaternion.dot(lastLocalQ[i]))<1e-12);
  if(ours){for(let i=0;i<bones.length;i++){p[i].copy(baseP[i]);q[i].copy(baseQ[i]);}commit();root.userData.labelHeight=baseLabelHeight;}
  active=false;tablet.visible=false;delete root.userData.courtPosture;
 }
 function apply({kneeling=1,raised=0,time=0,phase=0,holding=false}={}){
  if(disposed)return;
  const raw=clamp(kneeling),weight=raw*raw*(3-2*raw),lift=clamp(raised),t=Number.isFinite(time)?time:0;
  phase=Number.isFinite(phase)?phase:0;
  if(weight===0&&!holding){stop();return;}
  tablet.visible=true;
  capture();active=true;
  // Both knees and the tucked boot toes meet the floor. The shins fold back
  // under the hips; real thigh and shin lengths determine their rear positions.
  const shinLength=rest[11].distanceTo(rest[12]),thighLength=rest[10].distanceTo(rest[11]);
  const kneeY=.104,ankleY=.175,kneeZ=.238,hipY=.373,hipZ=kneeZ-Math.sqrt(thighLength**2-(hipY-kneeY)**2);
  const breath=Math.sin(t*1.17+phase)*.003;
  torso.setFromEuler(new THREE.Euler(.025+Math.sin(t*.77+phase)*.004,0,Math.sin(t*.61+phase)*.003));
  p[0].lerp(V(0,hipY,hipZ),weight);q[0].slerp(torso,weight);
  for(const i of [1,2,3,4,7,10,13]){
   const j=parent[i];p[i].copy(rest[i]).sub(rest[j]).applyQuaternion(q[j]).add(p[j]);q[i].copy(q[j]);
  }
  head.setFromEuler(new THREE.Euler(.065-lift*.025,Math.sin(t*.53+phase)*.007,0));q[3].multiply(head);
  for(let side=0;side<2;side++){
   const a=side?13:10,b=a+1,c=a+2,sign=side?1:-1;
   const ankle=V(sign*.089,ankleY,kneeZ-Math.sqrt(shinLength**2-(ankleY-kneeY)**2));
   const target=baseP[c].clone().lerp(ankle,weight),angle=weight*Math.PI/2;
   const minimum=Math.min(...bootOutline[side].map(([y,z])=>Math.cos(angle)*y-Math.sin(angle)*z));
   target.y=Math.max(target.y,-minimum+.0023);
   solve(a,b,c,target,V(0,0,1));q[c].setFromAxisAngle(from.set(1,0,0),angle);
   // The existing cloth follower drapes along the floor over the folded shin,
   // rather than inheriting the tucked ankle's upward tilt. This controls only
   // the production robe's dedicated follower; anatomical bones stay exact.
   const cloth=side?17:16;p[cloth].copy(p[b]);p[cloth].y+=.040*weight;
   q[cloth].copy(baseQ[cloth]).slerp(inverse.setFromUnitVectors(from.copy(rest[c]).sub(rest[b]).normalize(),direction.set(0,0,-1)),weight);
  }
  const boardY=p[0].y+.325+lift*.218+breath,boardZ=.285-lift*.018;
  tablet.position.set(0,boardY,boardZ);tablet.rotation.set(0,0,0);
  for(let side=0;side<2;side++){
   const a=side?7:4,c=a+2,sign=side?1:-1,offset=palmContact[side];
   const grip=V(sign*.0506,boardY+.064+(side?-.004:.004),boardZ);
   const wrist=grip.sub(offset);
   solve(a,a+1,c,wrist,V(sign*.36,-.85,.05));q[c].copy(palmRotation[side]);
  }
  for(const tool of Object.values(root.userData.tools||{}))tool.visible=false;
  commit();
  root.userData.labelHeight=(p[3].y+.50)*root.scale.y;
  const contacts=palmVertex.map(v=>v.mesh.getVertexPosition(v.index,V()).applyMatrix4(v.mesh.matrixWorld).applyMatrix4(inverseRig).toArray());
  root.userData.courtPosture={kneeling:raw,raised:lift,knees:[p[11].toArray(),p[14].toArray()],ankles:[p[12].toArray(),p[15].toArray()],hip:p[0].toArray(),tabletBase:tablet.position.toArray(),palmContacts:contacts};
 }
 function dispose(){
  if(disposed)return;stop();disposed=true;
  tablet.removeFromParent();tablet.geometry.dispose();tablet.material.dispose();
 }
 return {apply,stop,dispose,tablet};
}
