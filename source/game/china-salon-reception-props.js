import * as THREE from '../vendor/three/build/three.module.js';
// Near edge of the unchanged original third-floor desk. The real tabletop is
// y=8.875; the thin ledger and numbered plaque are distinct from the tea set.
export const SALON_RECEPTION_WORK_POINTS=Object.freeze({home:[24.15,7.815,5.45],paper:[24.11,8.900,6.025],card:[24.43,8.885,5.995],reserved:[24.50,8.885,5.995]});
const P=SALON_RECEPTION_WORK_POINTS,clamp=v=>Math.max(0,Math.min(1,v));
export function createSalonReceptionProps(parent){
 if(!parent?.add)return null;
 const root=new THREE.Group();root.name='Original salon reception work';root.userData.dynamic=true;root.visible=false;parent.add(root);
 const geometries=[],materials=new Map(),material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshToonMaterial({color}));return materials.get(color);};
 const box=(g,size,color,p=[0,0,0])=>{const geo=new THREE.BoxGeometry(...size);geometries.push(geo);const m=new THREE.Mesh(geo,material(color));m.position.set(...p);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
 const ledger=new THREE.Group();ledger.name='Original session reception ledger';ledger.position.set(...P.paper);root.add(ledger);
 box(ledger,[.52,.012,.29],0x744741,[0,-.019,0]);box(ledger,[.50,.014,.25],0xeee1bd,[0,-.007,0]);box(ledger,[.012,.002,.25],0x907855,[0,.001,0]);
 const lines=[];for(let row=0;row<4;row++)for(let col=0;col<3;col++)lines.push(box(ledger,[.023,.002,.007],0x494537,[.085+col*.035,.002,-.073+row*.035]));
 const closure=[box(ledger,[.16,.003,.012],0x973c39,[.14,.003,-.04]),box(ledger,[.012,.003,.065],0x973c39,[.14,.003,-.04])];
 const card=new THREE.Group();card.name='Original session room plaque';root.add(card);box(card,[.12,.016,.16],0xb38a53);box(card,[.083,.003,.12],0xf2dfb3,[0,.009,0]);
 const roomLines=[box(card,[.043,.002,.01],0x493b30,[0,.012,-.025]),box(card,[.043,.002,.01],0x493b30,[0,.012,.025])];
 let bound=null,last=null;
 const vec=a=>new THREE.Vector3(...a);
 const palmTargets=(host,right)=>{const body=host.root.userData.body||host.root;body.updateWorldMatrix(true,false);return [new THREE.Vector3(23.98,8.928,5.99),right].map(p=>body.worldToLocal(p).toArray());};
 function sync(session){
  const w=session?.receptionWork;if(!w){root.visible=false;bound=null;last=null;return false;}
  if(bound?.sessionId!==session.id)last=null;
  bound={sessionId:session.id,cardId:w.cardId,pageId:'salon-reception-page:'+session.id,roomId:session.roomId};root.visible=true;ledger.userData={sessionId:session.id,pageId:bound.pageId};card.userData={sessionId:session.id,cardId:bound.cardId,roomId:session.roomId};
  const phase=w.phase,seconds=w.seconds,registered=w.steps.registerSeconds===2;
  lines.forEach((m,i)=>m.visible=registered||phase==='register'&&i<Math.floor(clamp(seconds/2)*lines.length));closure.forEach(m=>m.visible=w.phase==='completed'||phase==='close'&&seconds>1.55);roomLines[1].visible=session.roomId==='tavern-guest-zhu';
  const f=phase==='reserve'?clamp(seconds/2):phase==='close'?1-clamp(seconds):w.steps.reserveSeconds===2?1:0;
  card.position.copy(vec(P.card).lerp(vec(P.reserved),f));if(phase==='reserve'||phase==='close'&&seconds<1)card.position.y+=Math.sin(Math.PI*(phase==='reserve'?f:1-f))*.035;
  root.updateWorldMatrix(true,true);return true;
 }
 function apply(session,host,t,context={}){
  if(!sync(session))return {observed:false,code:'no-reception-order'};
  const w=session.receptionWork,phase=w.phase,writing=phase==='register'||phase==='close'&&w.seconds>=1;
  if(!host?.root?.userData?.hands?.[0]||!host.root.userData.hands[1]||!host.root.userData.tools?.brush)return {observed:false,code:'reception-hands-unavailable'};
  const brush=host.root.userData.tools.brush;
  const right=writing?new THREE.Vector3(24.26+Math.sin(w.seconds*5)*.025,9.0224,5.99+Math.cos(w.seconds*5)*.018):card.position.clone().add(new THREE.Vector3(0,.032,0));
  // Longer legs put this fixed desk farther below the same adult's shoulders.
  // Bend at the waist/knees instead of stretching arms or moving the desk.
  const legReach=clamp(((host.root.userData.appearance?.shapeTraits?.legLength||1)-1)/.06);
  const hands=palmTargets(host,right),c={...context,workHeight:undefined,workDistance:undefined,receptionWriting:writing,handoff:true,handoffLean:writing?.25+legReach*.14:.54+legReach*.26,handoffDip:writing?legReach*.06:.050+legReach*.07,heldProp:null,archery:{hands}};
  // The real rig solves both wrists. Only the authored IK height is refined;
  // neither actor, paper, limb scale nor completed evidence is moved to match.
  let tip=null;
  for(let attempt=0;attempt<(writing?3:1);attempt++){
   host.animate(t+(host.phase||0),false,writing?'calligraphy':'tidy',c);brush.visible=writing;if(writing)brush.position.y=.045;host.root.updateWorldMatrix(true,true);
   if(!writing)break;
   tip=brush.localToWorld(new THREE.Vector3(0,-.325,0));const dy=P.paper[1]+.002-tip.y;
   if(Math.abs(dy)<=.0025)break;
   const body=host.root.userData.body||host.root,scale=body.getWorldScale(new THREE.Vector3()).y;c.archery.hands[1][1]+=dy/scale;
  }
  // This short pen is positioned after animate, so fit its actual shaft only
  // after the original paper-tip refinement has finished. Keep that trajectory.
  if(writing&&host.fitExternalHandGrip){const body=host.root.userData.body||host.root,contact=brush.localToWorld(new THREE.Vector3(.0176,-.048,0));host.fitExternalHandGrip({side:1,target:body.worldToLocal(contact).toArray()});}
  const rightHand=host.root.userData.hands[1].getWorldPosition(new THREE.Vector3()),leftHand=host.root.userData.hands[0].getWorldPosition(new THREE.Vector3());
  const inPage=tip&&Math.abs(tip.x-P.paper[0])<=.25&&Math.abs(tip.z-P.paper[2])<=.125;
  const gap=writing?Math.abs(tip.y-(P.paper[1]+.002)):rightHand.distanceTo(card.position.clone().add(new THREE.Vector3(0,.032,0)));
  const observed=writing?!!inPage&&gap<=.008:gap<=.008;
  // Service time measures the original desk action actually being played.
  // Millimetre-perfect IK is visual diagnostics, never a transactional clock:
  // an unreachable candidate pose must not retry the same 0.1 s forever.
  const played=[...rightHand.toArray(),...leftHand.toArray(),...card.position.toArray()].every(Number.isFinite);
  last={...bound,phase,seconds:w.seconds,writing,played,observed,gap,tip:tip?.toArray()||null,rightHand:rightHand.toArray(),leftHand:leftHand.toArray(),cardPosition:card.position.toArray(),paperPosition:P.paper.slice()};return {...last};
 }
 return {apply,sync,rest(session){if(sync(session)){card.position.y=P.card[1];root.updateWorldMatrix(true,true);}},state:()=>last?{...last}:bound?{...bound}:null,clear(){root.visible=false;bound=last=null;},dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
