import {registerNightFixture} from './night-lighting.js';
import {holdingPlaque} from './china-holding-lettering.js';

// ST05 belongs to the existing Chinese patrol, not to invented new officers.
// The other three lots currently have no enforcement post.
export const CHINA_HOLDING_CELL = Object.freeze({
 id:'cn-underground-holding',name:'巡值署地下候审室',floorY:-4.1,ceilingY:-1.1,
 bounds:{minX:-25.6,maxX:-15.6,minZ:30.8,maxZ:37},
 stairHole:{minX:-15.5,maxX:-12.5,minZ:28.7,maxZ:37},
 entrance:[-14,.115,28],stairTop:[-14,.115,28.7],stairBottom:[-14,-4.1,35.7],
 intake:[-18.1,-4.1,35.8],detention:[-22.9,-4.1,32.9],release:[-14,.115,28],
 route:[[-14,.115,28],[-14,.115,28.7],[-14,-4.1,35.7],[-14,-4.1,36.15],[-18.1,-4.1,36.15],[-22.9,-4.1,35.45],[-22.9,-4.1,32.9]],
 evidence:{id:'cn-patrol-sealed-evidence',name:'巡值封存柜',owner:'cn-palace-patrol',position:[-24,-4.1,35.7],anchor:[-25.05,-2.8,35.7],itemId:'cn-sealed-patrol-token',itemName:'封存巡牌',sealed:true,public:false},
 cells:[{id:'cn-holding-west',name:'西候审室',center:[-22.9,-4.1,32.9],gateX:-22.9},{id:'cn-holding-east',name:'东候审室',center:[-18,-4.1,32.9],gateX:-18}]
});

// Cut both drawn terrain and navigation planes. Leaving either one intact
// would hide the stair or act as an invisible floor above the descending actor.
export function holdingGroundPieces(bounds) {
 const cut=CHINA_HOLDING_CELL.stairHole,l=Math.max(bounds.minX,cut.minX),r=Math.min(bounds.maxX,cut.maxX),n=Math.max(bounds.minZ,cut.minZ),b=Math.min(bounds.maxZ,cut.maxZ);
 if(l>=r||n>=b)return [{...bounds}];
 const pieces=[];
 if(bounds.minX<l)pieces.push({...bounds,maxX:l});
 if(r<bounds.maxX)pieces.push({...bounds,minX:r});
 if(bounds.minZ<n)pieces.push({...bounds,minX:l,maxX:r,maxZ:n});
 if(b<bounds.maxZ)pieces.push({...bounds,minX:l,maxX:r,minZ:b});
 return pieces;
}

export function buildChinaHoldingCell(G,{group,roofGroup,colliders,cameraColliders,walkableSurfaces,interiorRooms,levels,lightingZones,explorationTargets,facilities,packStatic}) {
 const A=CHINA_HOLDING_CELL,{THREE}=G,q=new THREE.Group(),roof=new THREE.Group(),doors=new THREE.Group();
 q.name='China underground patrol holding rooms';roof.name='China underground holding ceiling';doors.name='China holding gates';group.add(q,doors);roofGroup.add(roof);
 const C={stone:0x9eaa9c,mortar:0x6e7b71,light:0xc0c4ae,wood:0x594c3d,red:0x873e32,gold:0xc5a162,iron:0x3a4844,linen:0xb2ac87};
 const block=(x,y,z,w,h,d,color=C.stone,solid=true,parent=q)=>{
  const mesh=G.box(parent,x,y,z,w,h,d,color);
  if(solid){const box={minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2,holdingCell:true};colliders.push(box);cameraColliders.push({...box});}
  return mesh;
 };
 const surface=(id,minX,maxX,minZ,maxZ,y,extra={})=>walkableSurfaces.push({id,minX,maxX,minZ,maxZ,y,...extra});
 const wall=(axis,at,from,to,bottom,top,color=C.stone,depth=.26)=>block(axis==='x'?(from+to)/2:at,(bottom+top)/2,axis==='x'?at:(from+to)/2,axis==='x'?to-from:depth,top-bottom,axis==='x'?depth:to-from,color);
 const floor=(id,b,y)=>{block((b.minX+b.maxX)/2,y-.12,(b.minZ+b.maxZ)/2,b.maxX-b.minX,.24,b.maxZ-b.minZ,C.stone);surface(id,b.minX,b.maxX,b.minZ,b.maxZ,y);};
 const lamp=(x,y,z,floorY=A.floorY)=>{
  block(x,y+.02,z,.38,.55,.19,C.wood,false);G.mesh(q,new THREE.BoxGeometry(.25,.36,.22),0xffd59b,x,y,z-.03,{emissive:0xffb260,emissiveIntensity:.65});
  for(const yy of [-.26,.28])block(x,y+yy,z,.45,.055,.26,C.gold,false);
  registerNightFixture(q,x,y,z-.2,{kind:'holding-room-wall-lantern',intensity:15,distance:7,dayFactor:.8,floorY});
 };
 // A low, roofed stair mouth is visible from the existing range return path.
 // Its side guards protect the full opening; nothing closes the north entry.
 // The terrain cut exposes vertical faces at the hole boundary. Keep the
 // retaining walls 4cm inside those faces, avoiding coplanar depth fighting.
 // Ordinary underground room walls retain their original .26m thickness.
 const H=A.stairHole,stairWall=(...args)=>wall(...args,C.stone,.34);
 for(const x of [H.minX-.13,H.maxX+.13]){
  if(x<H.minX){stairWall('z',x,H.minZ,35.32,-4.35,1.05);stairWall('z',x,36.96,H.maxZ,-4.35,1.05);stairWall('z',x,35.32,36.96,-1.75,1.05);}
  else {
   // The former market branch is permanently masonry-sealed.
   stairWall('z',x,H.minZ,H.maxZ,-4.35,1.05);
  }
  block(x,1.10,(H.minZ+H.maxZ)/2,.40,.12,H.maxZ-H.minZ,C.wood,false);
 }
 stairWall('x',H.maxZ+.13,H.minX-.26,H.maxX+.26,-4.35,1.05);
 for(const x of [H.minX-.13,H.maxX+.13]){block(x,1.4,28.55,.23,2.55,.23,C.red);block(x,2.7,28.55,.52,.12,.52,C.gold,false);}
 block(-14,2.82,28.55,3.52,.30,.50,C.wood);
 // Sign faces the approach to the southbound descent.
 holdingPlaque(G,q,'巡值候审',-14,2.30,28.25,2.70,.57,Math.PI);
 // Continuous navigation ramp with visible 20 low stone treads. Their highest
 // physical lip differs from the ramp by at most half a riser, under maxStep.
 const count=20,span=7,drop=A.floorY-.115;
 for(let i=0;i<count;i++){
  const z=28.7+span*(i+.5)/count,y=.115+drop*(i+.5)/count;
  block(-14,y-.13,z,3,.26,span/count,C.light,false);
  cameraColliders.push({minX:H.minX,maxX:H.maxX,minY:y-.26,maxY:y,minZ:z-span/count/2,maxZ:z+span/count/2,holdingStairTread:true});
  block(-14,y+.009,z-span/count*.42,2.92,.018,.04,C.mortar,false);
 }
 surface('cn-holding-stairs',H.minX,H.maxX,28.7,35.7,.115,{axis:'z',endY:A.floorY});
 floor('cn-holding-stair-landing',{minX:H.minX,maxX:H.maxX,minZ:35.7,maxZ:37},A.floorY);
 // Handrails follow the incline. Their short real camera proxies do not put a
 // huge diagonal AABB through the player's route or standing camera.
 for(const x of [H.minX+.15,H.maxX-.15])for(let i=0;i<14;i++){
  const z=28.7+7*(i+.5)/14,y=.115+drop*(i+.5)/14+1;
  const rail=G.box(q,x,y,z,.085,.085,.59,C.wood);rail.rotation.x=-Math.atan2(drop,7);
  cameraColliders.push({minX:x-.055,maxX:x+.055,minY:y-.20,maxY:y+.20,minZ:z-.27,maxZ:z+.27,holdingCell:true});
 }
 lamp(-14,1.50,36.98,0);
 floor('cn-holding-main-floor',{...A.bounds,maxX:-15.45},A.floorY);
 wall('x',30.67,-25.73,-15.47,A.floorY,A.ceilingY);wall('x',37.13,-25.73,-15.47,A.floorY,A.ceilingY);
 wall('z',-25.73,30.67,37.13,A.floorY,A.ceilingY);
 wall('z',-15.6,30.67,35.32,A.floorY,A.ceilingY);
 wall('z',-15.6,36.96,37.13,A.floorY,A.ceilingY);
 wall('z',-15.6,35.32,36.96,-1.75,A.ceilingY);
 // Keep the terrain slab above the cells. The opaque independent ceiling
 // supplies the matching camera/body ceiling beneath it.
 block(-20.6,-.98,33.9,10.25,.24,6.46,C.mortar,true,roof);
 // The intake corridor serves two modest holding rooms. Timber and grilles
 // make the space legible without touching any existing palace room or post.
 wall('z',-20.45,30.8,34.40,A.floorY,A.ceilingY,C.mortar);
 for(const [x,z,w,d]of [[-22.95,32.4,5.1,3.2],[-18.0,32.4,4.6,3.2]]){
  for(let zz=z-d/2+.3;zz<z+d/2;zz+=.65)block(x,A.floorY+.008,zz,w-.18,.015,.025,C.mortar,false);
 }
 // Horizontal masonry courses carry the underground scale in normal TPS.
 for(let y=A.floorY+.55;y<A.ceilingY;y+=.58){block(-20.6,y,30.811,9.98,.027,.015,C.mortar,false);block(-25.59,y,33.9,.016,.027,6.0,C.mortar,false);block(-20.6,y,36.989,9.98,.027,.015,C.mortar,false);}
 const gateRecords=[];
 function grille(from,to){
  if(to-from<.03)return;
  const hit={minX:from,maxX:to,minY:A.floorY,maxY:A.ceilingY,minZ:34.35,maxZ:34.45,holdingCell:true};colliders.push(hit);cameraColliders.push({...hit});
  for(let x=from+.07;x<to;x+=.19)block(x,-2.62,34.4,.048,2.96,.065,C.iron,false);
  for(const y of [-4.00,-3.24,-1.21])block((from+to)/2,y,34.4,to-from,.07,.11,C.wood,false);
 }
 for(const cell of A.cells){
  const left=cell.id.endsWith('west')?-25.6:-20.45,right=cell.id.endsWith('west')?-20.45:-15.6,gx=cell.gateX,width=1.60,hinge=gx-width/2;
  grille(left,hinge);grille(gx+width/2,right);
  block(gx,-1.32,34.4,width,.44,.20,C.wood);
  const gate=new THREE.Group();gate.name=cell.name+' barred gate';gate.position.set(hinge,A.floorY,34.4);doors.add(gate);
  for(let x=.06;x<width;x+=.18)G.box(gate,x,1.28,0,.048,2.52,.065,C.iron);
  for(const y of [.10,.90,2.46])G.box(gate,width/2,y,0,width,.075,.12,C.wood);
  G.box(gate,width-.18,1.24,.10,.15,.21,.09,C.gold);
  const hit={minX:0,maxX:0,minY:A.floorY,maxY:-1.57,minZ:0,maxZ:0,holdingGate:cell.id},cameraHit={...hit};colliders.push(hit);cameraColliders.push(cameraHit);
  const setLocked=locked=>{gate.rotation.y=locked?0:Math.PI/2;Object.assign(hit,locked?{minX:hinge,maxX:hinge+width,minZ:34.32,maxZ:34.48}:{minX:hinge-.08,maxX:hinge+.08,minZ:34.4-width,maxZ:34.4});Object.assign(cameraHit,hit);};
  setLocked(false);gateRecords.push({id:cell.id,gate,hit,cameraHit,setLocked});
  // Sleeping platform, folded blanket and a covered water jar in each cell.
  block(gx,A.floorY+.24,31.46,3.4,.48,.86,C.wood);block(gx,A.floorY+.50,31.46,3.30,.05,.80,C.linen,false);
  block(gx+.9,A.floorY+.60,31.46,.76,.15,.65,0x65766c,false);
  G.vessel(q,gx+1.75,A.floorY,33.6,0x887b5c,.7);block(gx+1.75,A.floorY+.49,33.6,.28,.035,.28,C.wood,false);
  holdingPlaque(G,q,cell.id.endsWith('west')?'候审一':'候审二',gx,-1.28,34.54,1.34,.32);
  lamp(gx,-1.90,30.96);
 }
 // A real sealed non-public object, not a generated money source. Interaction
 // and ownership are supplied by the crime runtime through this same anchor.
 const cabinet=new THREE.Group();cabinet.name='Patrol sealed evidence cupboard';cabinet.position.set(-25.25,0,35.7);cabinet.rotation.y=Math.PI/2;q.add(cabinet);
 G.box(cabinet,0,-3.33,0,2.15,1.54,.62,C.wood);
 const cabinetBox={minX:-25.56,maxX:-24.94,minY:-4.1,maxY:-2.56,minZ:34.625,maxZ:36.775,holdingCell:true};colliders.push(cabinetBox);cameraColliders.push({...cabinetBox});
 for(const x of [-.52,.52])G.box(cabinet,x,-3.30,.34,.96,1.39,.05,C.red);
 for(const x of [-.12,.12])G.torus(cabinet,x,-3.23,.42,.070,.014,C.gold,0);
 for(const side of [-1,1]){const seal=G.box(cabinet,0,-3.3,.43,1.22,.13,.018,0xd8cba5);seal.rotation.z=side*.70;}
 // Mount the warning on the wall, leaving the corridor camera unobstructed.
 holdingPlaque(G,q,'封存禁取',-25.57,-2.10,35.7,2.16,.42,Math.PI/2);
 const token=block(-25.15,-2.50,35.7,.22,.15,.38,C.gold,false,doors);token.name=A.evidence.itemId;
 holdingPlaque(G,q,'巡值候审',-20.6,-1.68,36.98,2.65,.42,Math.PI);
 lamp(-18.1,-1.82,36.98);lamp(-24.7,-1.82,36.98);
 const room={id:A.id,name:A.name,...A.bounds,floorY:A.floorY,ceiling:A.ceilingY};
 interiorRooms.push(room);levels.push({id:A.id,name:'地下 · 巡值候审室',y:A.floorY,bounds:A.bounds});
 lightingZones.push({id:A.id,...A.bounds,maxX:-12.5,minY:-4.3,maxY:-1,floorY:A.floorY});
 explorationTargets.push({id:'cn-holding-entry',name:'巡值署 · 地下候审入口',position:[...A.entrance],roomId:'compound'},{id:A.id,name:A.name,position:[...A.intake],roomId:A.id});
 facilities.push({id:A.id,name:A.name,targets:['cn-holding-entry',A.id],furnishings:['真实地下石阶','两间候审室','木榻与饮水罐','巡值封存柜']});
 const navigationPortals=[{id:'cn-holding-stair-route',points:A.route.map(([x,y,z])=>({x,y,z}))},{id:'cn-holding-east-gate',points:[[-18,-4.1,35.5],[-18,-4.1,34.4],[-18,-4.1,32.9]].map(([x,y,z])=>({x,y,z}))}];
 if(packStatic){packStatic(q);packStatic(roof);}
 let locked=false,collisionVersion=0;
 return {...A,group:q,roofGroup:roof,gates:gateRecords,navigationPortals,get locked(){return locked;},get collisionVersion(){return collisionVersion;},setLocked(value){const next=!!value;if(locked===next)return false;locked=next;gateRecords[0].setLocked(next);collisionVersion++;return true;},setEvidencePresent(present){token.visible=!!present;}};
}
