import {createChinaDragonCurtains,migrateChinaCurtains,chinaDragonBedCameraParts} from './china-dragon-bed.js';
import * as THREE from 'three';
import * as G from './geometry.js';
import {blocked,canTraverse} from './navigation.js';
import {cameraDistanceToObstacle} from './camera.js';
import {visualSupportHeight} from './floor-support.js';
import {createFacilityQueue} from './npc-facilities.js';

// Authored reference seats, canopy and cultural changing place. Additional
// existing seats below reuse the same sculpted objects and their collider footprints.
// Neither the region topology nor its collider/walkable arrays is modified.
export const FURNITURE_DESCRIPTORS={
 china:{seat:{name:'寝殿阅读椅',anchor:[-23.9056,7.885,-4.1056],position:[-23.15,7.815,-3.35],yaw:Math.PI*.25,seatY:8.475,center:[-24.1,7.8,-4.3],size:[.9,1.65,.9]},canopy:{worldLabel:'龙榻红纱帐',name:'雕龙龙榻 · 红纱帷帐',position:[-21,7.885,-5.8],center:[-21,7.8,-9],width:3.68,depth:3.94,top:10.68,bottom:8.65,color:0xc73b45},wardrobe:{name:'后宫三层梳妆台',position:[-18,7.815,-.05],center:[-16.8,7.8,-.8],size:[.75,2.3,3.1],style:'dressing'}},
 france:{seat:{name:'翡翠沙龙扶手椅',anchor:[-6.65,.302,1.51],position:[-6.65,.302,.68],yaw:Math.PI,seatY:.9535,center:[-6.65,.23,1.8],size:[1.12,1.85,1.15]},canopy:{name:'皇家寝床纱帐',position:[7.55,.302,.58],center:[7.55,.23,-2.64],width:3.38,depth:4.04,top:4.07,bottom:1.35,color:0xf0e8d8},wardrobe:{name:'王宫衣橱',position:[-19.0,.23,-8.85],center:[-19.0,.23,-7.45],size:[1.37,2.45,.71],style:'armoire'}},
 japan:{seat:{name:'书阁木长椅',anchor:[-5,7.6,-11.64],position:[-5,7.6,-10.76],yaw:0,seatY:8.165,center:[-5,7.6,-11.8],size:[2.1,.57,.6]},wardrobe:{name:'汤馆和服更衣柜',position:[-9.92,3.8,2.4],center:[-11.32,3.8,2.4],size:[.95,2.65,3.9],style:'lockers'}},
 egypt:{seat:{name:'王室餐厅坐凳',anchor:[15.25,0,-9.3],position:[13.95,0,-9.3],yaw:Math.PI/2,seatY:.66,center:[15.15,0,-9.3],size:[1.02,.66,1.02]},canopy:{name:'王室亚麻纱帐',position:[20.4,0,1.71],center:[20.4,0,-1.25],width:2.36,depth:3.56,top:3.21,bottom:.98,color:0xf0dfb6},wardrobe:{name:'王室雪松衣箱',position:[12.5,0,9.7],center:[14.2,0,9.7],size:[2.2,1.18,1.1],style:'chest'}}
};
// Real authored sleeping and bathing fixtures. Anchor Y stays on the navigation
// floor; supportY is the actual mattress/basin bottom supporting the skinned pose.
// Japan's closed onsen has a taller coping, a seat, and a low lumbar support.
// Its camera must use these authored solids instead of a guessed water+.12 rim.
function japanBathCameraParts(x,z,w,d){
 const east=x+w/2,parts=[{minX:x-w/2,maxX:x+w/2,minY:3.8535,maxY:3.8805,minZ:z-d/2,maxZ:z+d/2}];
 for(const side of[-1,1])parts.push({minX:x-(w+.38)/2,maxX:x+(w+.38)/2,minY:3.8,maxY:4.617,minZ:z+side*d/2-.20,maxZ:z+side*d/2+.20});
 parts.push({minX:x-w/2-.14,maxX:x-w/2+.14,minY:3.8,maxY:4.52,minZ:z-d/2,maxZ:z+d/2},
  {minX:east-.17,maxX:east+.17,minY:3.8,maxY:4.60,minZ:z-d/2,maxZ:z+d/2},
  {minX:east-.70,maxX:east-.14,minY:3.8805,maxY:4.10,minZ:z-d/2+.14,maxZ:z+d/2-.14},
  {minX:east-.22,maxX:east-.14,minY:4.10,maxY:4.50,minZ:z-d/2+.14,maxZ:z+d/2-.14});
 return parts;
}
export const REST_BATH_DESCRIPTORS={
 china:[{kind:'bed',cameraParts:chinaDragonBedCameraParts().map(p=>({...p,minY:p.minY+7.6,maxY:p.maxY+7.6})),worldLabel:'龙榻安寝',name:'静宜寝殿 · 雕龙龙榻',position:[-18.4,7.815,-8.5],anchor:[-21.55,7.815,-9],center:[-21,7.8,-9],size:[4,3.1,4.2],yaw:0,supportY:8.655,lieOffset:.30,lieSupport:{hip:8.655,back:8.655,head:8.74,heel:8.655}},
 {kind:'bath',name:'后宫二层石浴池',position:[-21.1,4.015,-6],anchor:[-23.6,4.015,-6],center:[-23.6,4,-6],size:[3.3,1.15,4.3],yaw:Math.PI/2,supportY:4.11,waterY:4.9625,bathHipHeight:.48},
 {kind:'bed',name:'后宫一层客榻',position:[-21.6,.215,-7.5],anchor:[-23.5,.215,-7.5],center:[-23.5,.2,-7.5],size:[2.9,1.25,3.4],yaw:0,supportY:1.055,lieOffset:.3,lieSupport:{hip:1.055,back:1.055,head:1.14,heel:1.055}}],
 france:[{kind:'bed',name:'皇家寝床',position:[5.16,.302,-2.1],anchor:[6.72,.302,-2.65],center:[7.55,.23,-2.65],size:[3.5,4.2,4.3],yaw:0,supportY:1.25,lieOffset:.72,lieSupport:{hip:1.25,back:1.25,head:1.31,heel:1.25}},
 {kind:'bath',name:'白金浴缸',position:[-20.34,.23,-10.2],anchor:[-22.55,.23,-10.2],center:[-22.55,.23,-10.2],size:[3.1,1.15,3.65],yaw:Math.PI/2,supportY:.425,waterY:1.205,bathHipHeight:.48}],
 japan:[{kind:'bed',name:'客室日式寝具',position:[2.48,7.6,-10.7],anchor:[4.4,7.6,-11.6],center:[4.4,7.6,-11.6],size:[2.36,.5,3.24],yaw:0,supportY:7.95,lieOffset:.54,lieSupport:{hip:7.95,back:7.992,head:8.026,heel:7.96}},
 {kind:'bath',cameraTargetMinY:4.85,cameraParts:japanBathCameraParts(-6.55,-9.3,7.5,6.6),name:'二层男汤温泉',position:[-2.1,3.8,-9.3],anchor:[-3.22,3.8,-9.3],center:[-6.55,3.8,-9.3],size:[7.5,.82,6.6],yaw:-Math.PI/2,supportY:3.8805,waterY:4.47,bathHipHeight:.32,bathWardrobePreset:'onsen-swimwear',bathPose:{style:'onsen-seat',seatY:4.10,waterY:4.47,backZ:-.20,backTopY:4.50}},
 {kind:'bath',cameraTargetMinY:4.85,cameraParts:japanBathCameraParts(2.1,-9.7,4,6.6),name:'二层女汤温泉',position:[4.9,3.8,-9.7],anchor:[3.68,3.8,-9.7],center:[2.1,3.8,-9.7],size:[4,.82,6.6],yaw:-Math.PI/2,supportY:3.8805,waterY:4.47,bathHipHeight:.32,bathWardrobePreset:'onsen-swimwear',bathPose:{style:'onsen-seat',seatY:4.10,waterY:4.47,backZ:-.20,backTopY:4.50}},
 // The eastern lower bunk already exists in the staff room. Preserve bath IDs
 // by appending it; its approach enters from the clear foot of the same bunk.
 {kind:'bed',name:'员工室下铺',position:[-4.3,11.4,-9.18],exitPositions:[[-5.2,11.4,-9.18],[-3.4,11.4,-9.18]],anchor:[-4.3,11.4,-11.5],center:[-4.3,11.4,-11.5],size:[2.75,3,3.2],yaw:0,supportY:12.15,lieOffset:.48,lieSupport:{hip:12.15,back:12.15,head:12.274,heel:12.00}}],
 egypt:[{kind:'bed',name:'王室亚麻寝床',position:[18.48,0,-1.25],anchor:[19.8,0,-1.25],center:[20.4,0,-1.25],size:[2.65,3.4,4.1],yaw:0,supportY:.9,lieOffset:.48,lieSupport:{hip:.9,back:.9,head:1.056,heel:.9}},
 {kind:'bath',name:'王室石质浴池',position:[15.9,0,-1.05],anchor:[14.05,0,-1.05],center:[14.05,0,-1.05],size:[2.7,1.06,3.8],yaw:Math.PI/2,supportY:.305,waterY:.585,bathHipHeight:.32}]
};
// Existing-object inventory only. Beds, tables, thrones, floor cushions and the
// textile-covered Japanese bench are deliberately not relabelled as chairs.
function additionalSeats(lot,region){
 const seats=[],add=(name,x,y,z,yaw,width,depth,seatY,front=.27,id,approachYaw=yaw)=>{
  const anchor=[x+Math.sin(yaw)*front,y,z+Math.cos(yaw)*front];
  if(region==='china'||region==='france')anchor[1]=visualSupportHeight(lot,anchor[0],anchor[2],y,!!lot.heightAware)??y;
  // Backless dining stools face the table but are reached from the open aisle.
  seats.push({id,name,center:[x,y,z],anchor,position:[x+Math.sin(approachYaw)*(depth/2+.64),y,z+Math.cos(approachYaw)*(depth/2+.64)],yaw,seatY,size:[width,Math.max(1.65,seatY-y+.25),depth]});
 };
 if(region==='france')seats.push(...(lot.group.userData.gardenBenches||[]));
 if(region==='france')lot.group.traverse(q=>{if(q.userData.furnitureKind!=='chair'||Math.hypot(q.position.x+6.65,q.position.z-1.8)<.05)return;const x=q.position.x,z=q.position.z,y=visualSupportHeight(lot,x,z)??.23;add('宫苑雕花扶手椅',x,y,z,q.rotation.y,1.18,1.20,q.position.y+q.userData.seatTopLocal,.29,undefined,q.userData.approachYaw);});
 if(region==='china'){if(lot.additionalFurnitureSeats)for(const s of lot.additionalFurnitureSeats)add(s.name,s.x,s.y,s.z,s.yaw,s.width,s.depth,s.seatY,s.front,s.id,s.approachYaw);else for(const x of[-8.6,8.6])for(const z of[-3,1])add('正殿木扶椅',x,.2,z,x<0?Math.PI/2:-Math.PI/2,.9,.9,.875);}
 if(region==='japan')for(const [name,x,y,z,w]of[
  ['迎宾木长椅',-9.2,0,3.1,3.5],['更衣室木长椅',-3.1,3.8,2.05,2.35],['更衣室木长椅',.15,3.8,2.05,1.6],
  ['浴室木长椅',-4.2,3.8,-3.1,3],['浴室木长椅',1.35,3.8,-3.1,2.3],['休息廊木长椅',-7.7,3.8,7.55,4],['休息廊木长椅',4.9,3.8,7.55,3.1],
  ['事务室木长椅',-7.1,11.4,4.2,3.2],['员工室木长椅',-6.8,11.4,-7.45,3.3],['庭园木长椅',-23.2,0,14.7,6.9]])add(name,x,y,z,(z===7.55||z===-7.45||z===14.7)?Math.PI:0,w,.6,y+.565,.16);
 // Existing ground-floor woven stools: approach from the open customer aisle,
 // then face the counter. These remain in the ordinary shared seat inventory.
 if(region==='japan')for(const [dish,xs,z,seatY]of[['sushi',[-7.68,-6.56,-5.44,-4.32],-1.29,.719],['ramen',[2.65,4.1,5.55],4.75,.739]])for(const [i,x]of xs.entries()){
  seats.push({id:`japan-dining-${dish}-${i+1}`,name: dish==='sushi'?'一层寿司吧台藤凳':'一层拉面吧台藤凳',diningKind:dish,center:[x,0,z],anchor:[x,0,z+.10],position:[x,0,z+.94],yaw:Math.PI,seatY,size:[.62,1.65,.62]});
 }
 // Keep knees clear of the dining table's solid plinth, with hips on the stool.
 if(region==='egypt')add('王室餐厅东侧坐凳',20.65,0,-9.3,-Math.PI/2,1.02,1.02,.66,.10,undefined,Math.PI/2);
 return seats;
}
const point=a=>new THREE.Vector3(...a);
const boxOf=d=>new THREE.Box3(new THREE.Vector3(d.center[0]-d.size[0]/2,d.center[1],d.center[2]-d.size[2]/2),new THREE.Vector3(d.center[0]+d.size[0]/2,d.center[1]+d.size[1],d.center[2]+d.size[2]/2));
function clothGeometry(width,height){
 const p=[],uv=[],idx=[],nx=32,ny=12;
 for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const u=x/nx,v=y/ny;p.push(u*width,-v*height,.029*Math.sin(u*Math.PI*12)*(.82+.18*v));uv.push(u,v);}
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;idx.push(a,c,b,b,c,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return geo;
}
function canopyGeometry(parent,d,region){
 if(region==='china')return createChinaDragonCurtains(parent,d);
 const g=new THREE.Group();g.name=region+' operable gauze canopy';g.userData.furnitureInteraction='canopy';parent.add(g);g.position.set(d.center[0],0,d.center[2]);
 const x=0,z=d.depth/2,y=d.top;
 // One suspended, non-coplanar single sheet per half; no doubled back/front wall.
 const mat=new THREE.MeshToonMaterial({color:d.color,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false,depthTest:true});mat.forceSinglePass=true;
 const panels=[],rings=[],half=d.width/2-.016;
 const rail=G.cyl(g,x,y+.055,z,.025,.025,d.width+.10,0xb29462,12);rail.rotation.z=Math.PI/2;rail.name='Continuous curtain rail';
 for(const side of[-1,1]){
  const panel=new THREE.Mesh(clothGeometry(half,y-d.bottom),mat);panel.name='Translucent pleated gauze '+(side<0?'left':'right');panel.position.set(x+side*d.width/2,y,z);panel.scale.x=-side;panel.castShadow=false;panel.receiveShadow=false;panel.renderOrder=22+(side>0?1:0);panel.userData={clothThickness:.004,singleSheet:true,side};g.add(panel);panels.push(panel);
  for(let i=0;i<7;i++){const ring=G.torus(g,0,y+.024,z,.032,.008,0xb29462,0);ring.rotation.y=Math.PI/2;ring.name='Suspension ring';rings.push({ring,side,u:i/6});}
 }
 function set(amount){const width=THREE.MathUtils.lerp(1,.105,amount);for(const p of panels)p.scale.x=-p.userData.side*width;for(const{ring,side,u}of rings)ring.position.x=x+side*d.width/2-side*half*u*width;}
 return {group:g,panels,material:mat,set};
}
function changingDetails(parent,d,region){
 const g=new THREE.Group();g.name=region+' cultural changing place';g.userData.furnitureInteraction='wardrobe';parent.add(g);const[x,y,z]=d.center;
 // Details sit within existing storage footprints, never creating a new obstacle.
 if(d.style==='dressing'){
  if(region==='china'){g.position.set(2*x,d.center[1]-.2,2*z);g.rotation.y=Math.PI;} // East-wall mirror and silks face the room on their actual floor.
  const frame=G.box(g,x-.23,1.83,z+.67,.065,1.38,.80,0xc8a15d);frame.name='Dressing mirror frame';G.box(g,x-.184,1.83,z+.67,.014,1.20,.65,0xa0b7ad).name='Inset polished bronze mirror';
  for(let i=0;i<3;i++)G.box(g,x+.10,1.07+i*.065,z+.79,.38,.06,.58,[0x9b6768,0xbba47a,0x738e82][i]).name='Folded embroidered silk';
 }else if(d.style==='armoire'){
  for(const dx of[-.31,.31]){G.box(g,x+dx,1.49,z-.371,.57,2.12,.025,0x759782).name='North-facing wardrobe panel';G.box(g,x+dx,1.49,z-.389,.44,1.88,.014,0xd7d7bf).name='Wardrobe raised ivory inset';const ring=G.torus(g,x+dx*.33,1.66,z-.422,.047,.009,0xc7a75b,0);ring.name='Wardrobe brass pull';}
  G.box(g,x,2.39,z-.413,.53,.18,.024,0xcfbc83).name='Wardrobe carved cartouche';
 }else if(d.style==='lockers'){
  // Silk sash hung on the existing locker edge makes the changing use legible.
  G.box(g,x+.495,y+1.49,z-.51,.018,.56,.14,0x986c78).name='Locker hanging obi sash';G.box(g,x+.514,y+1.73,z-.51,.035,.08,.19,0xd0b783).name='Obi sash folded tie';
 }else{
  G.box(g,x,.63,z+.557,2.04,.78,.022,0x765136).name='Royal cedar chest front';
  for(const dx of[-.92,0,.92])G.box(g,x+dx,.63,z+.577,.048,.82,.018,0xc9a34e).name='Gold chest band';
  G.box(g,x,.72,z+.596,.15,.20,.018,0xc9a34e).name='Royal chest clasp';
  for(const side of[-1,1]){G.box(g,x+side*1.117,.63,z,.024,.78,1.03,0x765136).name='Royal chest side';for(const dz of[-.44,.44])G.box(g,x+side*1.135,.63,z+dz,.016,.82,.048,0xc9a34e).name='Chest side gold band';const handle=G.torus(g,x+side*1.155,.78,z,.12,.022,0xc9a34e,0);handle.rotation.y=Math.PI/2;handle.name='Chest carrying ring';}
  for(const dx of[-.72,.72])G.box(g,x+dx,1.105,z-.48,.17,.028,.09,0xc9a34e).name='Inset chest lid hinge';
 }
 return g;
}
export function createFurnitureInteractions(lot,region,{curtains={},onCurtainChange=()=>{}}={}){
 delete curtains.japan; // Obsolete Japanese canopy state is never restored.
 if(region==='china'&&migrateChinaCurtains(curtains))onCurtainChange('china',false);
 const desc=FURNITURE_DESCRIPTORS[region];if(!desc)throw new Error('Unknown furniture region '+region);
 const root=new THREE.Group();root.name='R12 bounded furniture interactions';lot.group.add(root);
 const items=Object.entries(desc).map(([kind,d])=>({...d,id:region+'-furniture-'+kind,kind,furniture:true,action:kind==='seat'?'坐下休息':kind==='canopy'?'开合纱帐':'挑选服装',interactionRadius:2.1,position:d.position.slice()}));
 for(const [i,d]of REST_BATH_DESCRIPTORS[region].entries())items.push({...d,id:region+'-furniture-'+d.kind+'-'+i,furniture:true,action:d.kind==='bed'?(region==='china'?'龙榻安寝':'躺下休息'):d.bathWardrobePreset==='onsen-swimwear'?'换入浴衣着泡汤':'换浴衣泡澡',interactionRadius:2.1,position:d.position.slice()});
 // Region-authored additions retain explicit stable IDs. Geometry is already
 // present in the lot; the same mounted bed/changing controller handles them.
 for(const d of lot.additionalFurniture||[]){if(!d.id||items.some(i=>i.id===d.id))throw new Error('Missing or duplicate authored furniture ID: '+d.id);items.push({...d,furniture:true,interactionRadius:d.interactionRadius??2.1,position:d.position.slice()});}
 // Match the existing continuous submerged bench, not duplicate unsupported
 // mount points. End clearance keeps arms away from perpendicular coping;
 // 1.65m pitch separates the widest supported arms and parallel long legs.
 const facilities=createFacilityQueue(),bathSeats=new Map();
 if(region==='japan'){
  const pools=[];lot.group.traverse(g=>pools.push(...(g.userData.onsenPools||[])));
  for(const item of items.filter(i=>i.bathPose)){
   const geometry=pools.find(p=>Math.hypot(p.center[0]-item.center[0],p.center[2]-item.center[2])<.01);
   if(!geometry)throw Error('Missing supported onsen bench: '+item.id);
   item.bathEntry={east:geometry.retainingWallX+.14,top:geometry.seamTopY,handY:geometry.copingTopY};
   const ledge=geometry.seat,endClearance=.75,pitch=1.65,capacity=Math.max(1,Math.floor((ledge.maxZ-ledge.minZ-2*endClearance)/pitch)+1);
   const offsets=Array.from({length:capacity},(_,i)=>(i-(capacity-1)/2)*pitch).sort((a,b)=>Math.abs(a)-Math.abs(b)||a-b);
   item.seats=offsets.map((offset,i)=>({...item,id:item.id+'-seat-'+(i+1),poolId:item.id,seatIndex:i,anchor:[item.anchor[0],item.anchor[1],item.anchor[2]+offset],position:[item.position[0],item.position[1],item.position[2]+offset],bathPose:{...item.bathPose},supportBounds:{...ledge},cameraParts:item.cameraParts.map(p=>({...p}))}));
   item.capacity=capacity;for(const seat of item.seats)bathSeats.set(seat.id,seat);facilities.define(item.id,item.seats.map(s=>s.id));
  }
 }
 const seat=items.find(i=>i.kind==='seat'),canopy=items.find(i=>i.kind==='canopy'),wardrobe=items.find(i=>i.kind==='wardrobe'),cloth=canopy?canopyGeometry(root,canopy,region):null;changingDetails(root,wardrobe,region);
 lot.group.updateMatrixWorld(true);const beddingMeshes=[];lot.group.traverse(o=>{if(o.isMesh&&!o.material.transparent)beddingMeshes.push(o);});const bedMeshes=new Map(),bedRay=new THREE.Raycaster();
 const options=(lot.heightAware||['japan','egypt'].includes(region))?{bounds:lot.bounds,surfaces:lot.walkableSurfaces,legacyGround:false,bodyHeight:1.95,maxStep:.4}:{bounds:lot.bounds,multilevel:false};
 const ownSeatBoxes=item=>lot.colliders.filter(c=>c.minX<=item.center[0]&&c.maxX>=item.center[0]&&c.minZ<=item.center[2]&&c.maxZ>=item.center[2]&&(c.maxY??3.5)>item.center[1]+.1&&(c.minY??-1)<item.seatY&&(c.maxX-c.minX)<=item.size[0]+.2&&(c.maxZ-c.minZ)<=item.size[2]+.2);
 const rejected=[];
 for(const [i,d]of additionalSeats(lot,region).entries()){
  const item={...d,id:d.id||region+'-furniture-seat-'+(i+2),kind:'seat',furniture:true,action:'坐下休息',interactionRadius:2.1},own=ownSeatBoxes(item),remaining=lot.colliders.filter(c=>!own.includes(c));
  // Choose a clear front/side landing, without relaxing any room collider.
  const candidates=[item.position,...[.4,-.4,.7,-.7].map(side=>[item.position[0]+Math.cos(item.yaw)*side,item.position[1],item.position[2]-Math.sin(item.yaw)*side]),...[1,-1].map(side=>[item.center[0]+Math.cos(item.yaw)*side*(item.size[0]/2+.64),item.position[1],item.center[2]-Math.sin(item.yaw)*side*(item.size[0]/2+.64)])];
  const position=candidates.map(a=>lot.heightAware?[a[0],visualSupportHeight(lot,a[0],a[2],a[1],true)??a[1],a[2]]:a).find(a=>!blocked(a[0],a[2],lot.colliders,.39,{...options,y:a[1]})&&canTraverse(point(a),point(item.anchor),remaining,{...options,radius:.34}));
  if(!own.length||!position){rejected.push({name:item.name,center:item.center,reason:'No clear front or side landing'});continue;}
  item.position=position;if(region==='china'||region==='france')item.position[1]=visualSupportHeight(lot,position[0],position[2],position[1],!!lot.heightAware)??position[1];items.push(item);
 }
 if(region==='japan'){const staffSeat=items.find(i=>i.kind==='seat'&&i.center[1]===11.4&&i.center[2]===-7.45);if(staffSeat)staffSeat.exitPositions=[-.9,.9].map(dx=>[staffSeat.position[0]+dx,staffSeat.position[1],staffSeat.position[2]]);}
 const seatBoxes=new Map(items.filter(x=>x.kind==='seat').map(item=>[item.id,ownSeatBoxes(item)]));
 for(const item of items.filter(x=>x.kind==='bed'||x.kind==='bath'))seatBoxes.set(item.id,lot.colliders.filter(c=>c.minX<=item.center[0]+.05&&c.maxX>=item.center[0]-.05&&c.minZ<=item.center[2]+.05&&c.maxZ>=item.center[2]-.05&&(c.maxX-c.minX)<=item.size[0]+.2&&(c.maxZ-c.minZ)<=item.size[2]+.2&&(c.minY===undefined||c.minY>=item.center[1]-.6)&&(c.maxY??3.5)>item.center[1]+.15));
 let amount=curtains[region]===false?0:1,target=amount,disposed=false;cloth?.set(amount);
 const picks=items.map(item=>({item,box:item.kind==='bed'||item.kind==='bath'?new THREE.Box3(new THREE.Vector3(item.center[0]-item.size[0]/2,item.center[1],item.center[2]-item.size[2]/2),new THREE.Vector3(item.center[0]+item.size[0]/2,(item.kind==='bath'?item.waterY:item.supportY)+.12,item.center[2]+item.size[2]/2)):item.kind==='canopy'?new THREE.Box3(new THREE.Vector3(item.center[0]-item.width/2,item.bottom,item.center[2]-item.depth/2),new THREE.Vector3(item.center[0]+item.width/2,item.top+.1,item.center[2]+item.depth/2)):boxOf(item)}));
 // Visibility ignores only a compact proxy belonging to the clicked object.
 // A wall, ceiling, other furniture, or moving door is never removed.
 function ownCameraBox(item,c){const w=item.width??item.size[0],d=item.depth??item.size[2],h=item.top?item.top-item.center[1]:item.size[1];return c.minY>=item.center[1]-.30&&c.maxY<=item.center[1]+h+.30&& c.minX<=item.center[0]+.16&&c.maxX>=item.center[0]-.16&&c.minZ<=item.center[2]+.16&&c.maxZ>=item.center[2]-.16&&c.maxX-c.minX<=w+.45&&c.maxZ-c.minZ<=d+.45&&Math.abs((c.minX+c.maxX)/2-item.center[0])<.20&&Math.abs((c.minZ+c.maxZ)/2-item.center[2])<.20;}
 function transferClear(a,b,options,extra=[],item=seat,radius=.34){const own=seatBoxes.get(item.poolId||item.id)||[],colliders=lot.colliders.filter(c=>!own.includes(c)).concat(extra);return canTraverse(a,b,colliders,{...options,radius});}
 const seatColliders=seatBoxes.get(seat.id);
 return {items,root,cloth,seatColliders,facilities,
  resolveBath(item,actor,eligible=()=>true,purpose='bathe'){
   const pool=items.find(i=>i.id===(item.poolId||item.id));if(!pool?.seats)return item;
   const reservation=facilities.reserve(pool.id,actor,{purpose,eligible:id=>eligible(bathSeats.get(id))});return reservation?bathSeats.get(reservation.seatId):null;
  },
  occupyBath(item,actor){return facilities.occupy(item.poolId||item.id,actor);},
  releaseActor(actor){facilities.releaseActor(actor);},
  bedSupportAt(item,x,z){if(!bedMeshes.has(item.id)){const bounds=boxOf(item);bounds.max.y=item.supportY+.28;bedMeshes.set(item.id,beddingMeshes.filter(m=>new THREE.Box3().setFromObject(m).intersectsBox(bounds)));}bedRay.set(new THREE.Vector3(x,item.supportY+.27,z),new THREE.Vector3(0,-1,0));const hit=bedRay.intersectObjects(bedMeshes.get(item.id),false).find(h=>h.point.y<=item.supportY+.24&&h.point.y>item.center[1]+.05);return hit?.point.y??item.supportY;},
  isVisible(item,origin,target,boxes){return cameraDistanceToObstacle(origin,target,boxes.filter(c=>!ownCameraBox(item,c)),0)>=origin.distanceTo(target)-.09;},
  nearbyClear(item,position,options,extra=[]){return Math.abs(position.y-item.position[1])<.45&&canTraverse(position,point(item.position),lot.colliders.concat(extra),{...options,radius:.34});},
  markerPoint(item){if(item.bathPose)return new THREE.Vector3(item.position[0],item.position[1]+1.15,item.position[2]);return new THREE.Vector3(item.center[0],item.kind==='bed'?item.supportY+.5:item.kind==='bath'?item.waterY+.7:item.kind==='canopy'?Math.min(item.top-.22,item.center[1]+2.0):item.center[1]+Math.min(2.05,item.size[1]+.24),item.center[2]);},
  update(dt){if(disposed)return;const step=Math.min(1,Math.max(0,dt)*2.4);amount=target>amount?Math.min(target,amount+step):Math.max(target,amount-step);cloth?.set(amount);},
  toggleCurtain(){if(!cloth)return null;target=target?0:1;curtains[region]=!!target;onCurtainChange(region,!!target);return !!target;},
  curtainLabel:()=>!cloth?'':region==='china'?(target?'合上龙榻红纱帐':'拉开龙榻红纱帐'):target?'合上纱帐':'拉开纱帐',
  pick(ray,visible=()=>true){let best=null;const bedHit=(region==='china'||amount>.5)&&picks.some(({item,box})=>{if(item.kind!=='bed')return false;const hit=ray.intersectBox(box,new THREE.Vector3());return hit&&visible(hit,item);});for(const{item,box}of picks){if(item.kind==='canopy'&&bedHit)continue;const hit=ray.intersectBox(box,new THREE.Vector3());if(hit&&visible(hit,item)){const d=ray.origin.distanceTo(hit);if(!best||d<best.distance)best={item,distance:d};}}return best?.item||null;},
  seatCameraSolids(boxes,item=seat){if(item.cameraParts){const own=boxes.filter(b=>ownCameraBox(item,b));return boxes.filter(b=>!own.includes(b)).concat(item.cameraParts);}
   if(item.kind==='bed'||item.kind==='bath'){const own=boxes.filter(b=>ownCameraBox(item,b));if(!own.length)return boxes;const [x,y,z]=item.center,[w,,d]=item.size,bottom={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:y,maxY:item.supportY-.015};const parts=[bottom];if(item.kind==='bath'){const top=item.waterY+.12;for(const side of[-1,1]){parts.push({minX:x+side*w/2-.08,maxX:x+side*w/2+.08,minZ:z-d/2,maxZ:z+d/2,minY:item.supportY,maxY:top});parts.push({minX:x-w/2,maxX:x+w/2,minZ:z+side*d/2-.08,maxZ:z+side*d/2+.08,minY:item.supportY,maxY:top});}}return boxes.filter(b=>!own.includes(b)).concat(parts);}if(region!=='france')return boxes;const own=boxes.filter(b=>ownCameraBox(item,b));if(!own.length)return boxes;
   const x=item.center[0],z=item.center[2],y=item.seatY-.9535;
   const proxy=(minX,maxX,minY,maxY,minZ,maxZ)=>{const corners=[];for(const xx of[minX,maxX])for(const zz of[minZ,maxZ])corners.push([x+Math.cos(item.yaw)*xx+Math.sin(item.yaw)*zz,z-Math.sin(item.yaw)*xx+Math.cos(item.yaw)*zz]);return {minX:Math.min(...corners.map(p=>p[0])),maxX:Math.max(...corners.map(p=>p[0])),minY:minY+y,maxY:maxY+y,minZ:Math.min(...corners.map(p=>p[1])),maxZ:Math.max(...corners.map(p=>p[1]))};};
   return boxes.filter(b=>!own.includes(b)).concat([proxy(-.59,.59,.225,.985,-.6,.6),proxy(-.52,.52,1.02,2.035,-.46,-.24),proxy(-.54,-.43,1,1.43,-.33,.37),proxy(.43,.54,1,1.43,-.33,.37)]);},
  canUse(options,extra=[],item){return transferClear(point(item.position),point(item.anchor),options,extra,item);},
  canSit(options,extra=[],item=seat){return (seatBoxes.get(item.poolId||item.id)||[]).length>0&&transferClear(point(item.position),point(item.anchor),options,extra,item);},
  // A shared-pool waiter may stand at the center entry. Wider aisle landings
  // keep the actual swept transfer clear of that person, with all walls retained.
  standPoint(navigation=options,extra=[],item=seat){const anchor=point(item.anchor),radius=Number.isFinite(navigation.radius)&&navigation.radius>0?navigation.radius:.34;for(const a of[item.position,...(item.exitPositions||[]),...(item.poolId?[-.3,.3,-1.35,1.35]:[-.3,.3]).map(offset=>[item.position[0]+Math.cos(item.yaw)*offset,item.position[1],item.position[2]-Math.sin(item.yaw)*offset])]){const p=point(a);if(!blocked(p.x,p.z,lot.colliders.concat(extra),radius,{...navigation,y:p.y})&&transferClear(anchor,p,navigation,extra,item,radius))return p;}return null;},
  state:()=>({region,facilities:facilities.state(),rejectedSeats:rejected,hasCanopy:!!cloth,curtainsOpen:cloth?!!target:null,curtainProgress:cloth?amount:null,items:items.map(({id,kind,name,position,anchor,seatY,center,yaw,supportY,waterY,capacity,seats})=>({id,kind,name,position,anchor,seatY,center,yaw,supportY,waterY,capacity,seats:seats?.map(({id,poolId,anchor,position})=>({id,poolId,anchor,position}))})),seatColliderCount:seatColliders.length}),
  dispose(){if(disposed)return;disposed=true;facilities.dispose();root.traverse(o=>{o.geometry?.dispose();if(o.isInstancedMesh)o.dispose();});cloth?.material.dispose();root.removeFromParent();}
 };
}

// Preview transactions never write persisted outfit state. Closing, escaping,
// leaving a region and committing are explicit terminal operations.
export function createOutfitPreview(initial=0){
 let open=false,original=0,selected=0;
 const normalize=n=>Number.isInteger(n)?((n%8)+8)%8:0;
 return {begin(value=initial){original=selected=normalize(value);open=true;return selected;},select(value){if(open)selected=normalize(value);return selected;},cancel(){open=false;selected=original;return original;},confirm(){open=false;original=selected;return selected;},state:()=>({open,original,selected})};
}
