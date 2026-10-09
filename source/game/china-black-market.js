import {registerNightFixture} from './night-lighting.js';
import {blackMarketPlaque} from './china-black-market-lettering.js';

// CR05: an independent storeroom off the PUBLIC stair landing. Neither cell,
// its gates nor the patrol's sealed evidence is a shop or a source of stock.
export const CHINA_BLACK_MARKET = Object.freeze({
 id:'cn-underground-black-market',name:'地下黑市',floorY:-4.1,ceilingY:-1.1,
 bounds:{minX:-12.2,maxX:-3.4,minZ:29.4,maxZ:37},
 entrance:[-14,.115,28],branchEntry:[-12.35,-4.1,36.15],
 interaction:{id:'cn-black-market-counter',name:'黑市交易台',position:[-6.65,-4.1,32.9],anchor:[-6.65,-3.02,32.1],menuPoint:[-6.65,-2.80,32.32]},
 merchant:{position:[-6.65,-4.1,31.4],workTarget:[-6.65,-3.02,32.1],rotation:0,
  route:[[-14,.115,28],[-14,.115,28.7],[-14,-4.1,35.7],[-14,-4.1,36.15],[-10.6,-4.1,36.15],[-9.1,-4.1,34.3],[-9.1,-4.1,31.4],[-6.65,-4.1,31.4]]},
 route:[[-14,.115,28],[-14,.115,28.7],[-14,-4.1,35.7],[-14,-4.1,36.15],[-10.6,-4.1,36.15],[-8.8,-4.1,34.3],[-6.65,-4.1,32.9]]
});

export function buildChinaBlackMarket(G,{group,roofGroup,colliders,cameraColliders,walkableSurfaces,interiorRooms,levels,lightingZones,explorationTargets,facilities,packStatic}) {
 const A=CHINA_BLACK_MARKET,{THREE}=G,q=new THREE.Group(),roof=new THREE.Group(),goods=new THREE.Group();
 q.name='China independent underground black market';roof.name='China black market ceiling';goods.name='China finite black market stock';group.add(q,goods);roofGroup.add(roof);
 const C={stone:0x899b92,mortar:0x647b73,light:0xa5b3a1,wood:0x57453a,edge:0x9b784d,jade:0x40736b,cloth:0x89705a,gold:0xb98a51};
 const block=(x,y,z,w,h,d,color=C.stone,solid=true,parent=q)=>{
  const mesh=G.box(parent,x,y,z,w,h,d,color);
  if(solid){const box={minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2,blackMarket:true};colliders.push(box);cameraColliders.push({...box});}
  return mesh;
 };
 const wall=(axis,at,from,to)=>block(axis==='x'?(from+to)/2:at,(A.floorY+A.ceilingY)/2,axis==='x'?at:(from+to)/2,axis==='x'?to-from:.26,A.ceilingY-A.floorY,axis==='x'?.26:to-from);
 // The existing stair retaining wall is the west wall. Its sole east-facing
 // opening is at the bottom landing, never beside the descending ramp.
 block(-7.95,A.floorY-.12,33.2,9.1,.24,7.6,C.stone);
 walkableSurfaces.push({id:'cn-black-market-floor',minX:-12.5,maxX:-3.4,minZ:29.4,maxZ:37,y:A.floorY});
 wall('x',29.27,-12.37,-3.27);wall('x',37.13,-12.37,-3.27);wall('z',-3.27,29.27,37.13);
 block(-7.72,-.98,33.2,8.96,.24,7.86,C.mortar,true,roof);
 for(const z of [30.3,33.2,36.1])block(-7.72,-1.22,z,8.96,.20,.16,C.wood,false,roof);
 for(let z=29.85;z<37;z+=.70)block(-7.8,A.floorY+.008,z,8.62,.016,.026,C.mortar,false);
 for(let y=A.floorY+.60;y<A.ceilingY;y+=.60){
  block(-7.8,y,29.409,8.60,.026,.014,C.mortar,false);
  block(-3.408,y,33.2,.014,.026,7.45,C.mortar,false);
  block(-7.8,y,36.991,8.60,.026,.014,C.mortar,false);
 }
 // Small sideboard at the shared stair mouth identifies the eastern branch
 // without covering the patrol plaque or hanging into the walking opening.
 block(-11.79,2.62,28.55,1.48,.10,.12,C.wood,false);
 block(-11.25,2.51,28.55,.06,.22,.07,C.gold,false);
 blackMarketPlaque(G,q,'地下黑市',-11.25,2.26,28.42,1.60,.37,Math.PI);
 // Timber jambs frame the opening without reducing its 1.64m clear aperture.
 for(const z of [35.25,37.03])block(-12.18,-2.73,z,.18,2.74,.11,C.wood,false);
 block(-12.18,-1.48,36.14,.18,.34,1.94,C.wood,false);
 blackMarketPlaque(G,q,'地下黑市',-12.57,-1.49,36.15,1.46,.40,-Math.PI/2);
 blackMarketPlaque(G,q,'货物交易',-6.65,-1.66,29.44,2.80,.51);
 // A solid, waist-high trading counter. The merchant stands behind it while
 // buyers approach from the open aisle; the west end remains a walkable turn.
 block(-6.65,-3.59,32.1,3.5,1.02,.40,C.wood);
 block(-6.65,-3.025,32.1,3.70,.13,.56,C.edge);
 block(-6.65,-2.954,32.1,2.40,.012,.50,C.jade,false);
 for(const x of [-8.08,-6.65,-5.22])block(x,-3.59,32.313,.075,.95,.045,C.edge,false);
 // Each actual unit stays independent of the packed room. Buying/returning
 // one item changes its own visible group; decorative jars never mint stock.
 const stockDisplays=new Map();
 const stock=(id,draw)=>{const item=new THREE.Group();item.name=id;item.position.y=.025;goods.add(item);draw(item);stockDisplays.set(id,item);};
 stock('cn-market-old-book-1',item=>{
  G.box(item,-7.54,-2.88,32.08,.43,.14,.39,0x526d70);
  G.box(item,-7.54,-2.874,32.082,.38,.09,.37,0xd5cbb1);
  for(const y of [-2.959,-2.801])G.box(item,-7.54,y,32.08,.44,.018,.40,0x526d70);
  G.box(item,-7.65,-2.789,32.08,.025,.014,.34,C.gold);
 });
 for(const [i,x,c]of [[1,-6.96,0x6a8890],[2,-6.53,0xb58263]])stock('cn-market-silk-'+i,item=>{
  G.box(item,x,-2.92,32.08,.35,.10,.39,c);
  G.box(item,x,-2.86,32.08,.04,.025,.41,C.cloth);
 });
 for(const [i,x]of [[1,-5.98],[2,-5.53]])stock('cn-market-old-paper-'+i,item=>{
  for(let n=0;n<3;n++)G.box(item,x,-2.93+n*.027,32.08,.34,.020,.40,0xcbbc95);
  G.box(item,x,-2.853,32.08,.035,.020,.42,C.cloth);
 });
 block(-8.07,-2.91,32.06,.29,.10,.35,C.gold,false);
 G.cyl(q,-8.07,-2.68,32.06,.035,.04,.45,C.gold,6);
 block(-8.07,-2.48,32.06,.55,.025,.035,C.gold,false);
 for(const x of [-8.30,-7.84]){G.cyl(q,x,-2.64,32.06,.10,.075,.055,C.gold,8);block(x,-2.55,32.06,.012,.19,.012,C.gold,false);}
 // Back stock shelving and wall-side crates stay outside both merchant and
 // customer paths. Full-height proxies keep actors/cameras out of the goods.
 const shelf=(x,z,w)=>{
  block(x,-3.14,z-.22,w,1.92,.06,C.wood,false);
  const hit={minX:x-w/2-.045,maxX:x+w/2+.045,minY:A.floorY,maxY:-2.16,minZ:z-.275,maxZ:z+.335,blackMarket:true};colliders.push(hit);cameraColliders.push({...hit});
  for(const y of [-3.96,-3.25,-2.47])block(x,y,z+.03,w+.09,.09,.61,C.edge,false);
  for(const xx of [x-w/2+.07,x+w/2-.07])block(xx,-3.13,z+.03,.10,1.94,.61,C.edge,false);
 };
 shelf(-10.45,30.02,2.30);
 for(const [x,c]of [[-11.05,0x6d8f82],[-10.40,0xb99268],[-9.8,0x798b94]]){
  G.vessel(q,x,-3.20,30.31,c,.65);G.vessel(q,x,-3.91,30.31,c,.69);
 }
 for(const [z,c]of [[31.0,0x647e79],[34.85,0x9c7453]]){
  block(-4.05,-3.73,z,.76,.74,.82,C.wood);
  for(const x of [-4.34,-3.76])block(x,-3.70,z,.06,.71,.86,C.edge,false);
  for(let i=0;i<3;i++)block(-4.05,-3.28+i*.10,z,.67,.09,.72,c,false);
 }
 const lamp=(x,y,z)=>{
  const facing=z>34?-1:1;
  block(x,y,z,.36,.51,.26,C.wood,false);
  G.mesh(q,new THREE.BoxGeometry(.24,.34,.29),0xffd8a2,x,y,z+facing*.04,{emissive:0xffb461,emissiveIntensity:.60});
  for(const yy of [-.26,.26])block(x,y+yy,z,.43,.055,.32,C.edge,false);
  registerNightFixture(q,x,y,z+facing*.24,{kind:'black-market-wall-lantern',intensity:14,distance:7,dayFactor:.82,floorY:A.floorY});
 };
 lamp(-10.6,-1.98,29.62);lamp(-5.05,-1.98,29.62);lamp(-10.1,-1.96,36.75);
 const room={id:A.id,name:A.name,...A.bounds,floorY:A.floorY,ceiling:A.ceilingY};
 interiorRooms.push(room);levels.push({id:A.id,name:'地下 · 黑市',y:A.floorY,bounds:A.bounds});
 lightingZones.push({id:A.id,...A.bounds,minY:-4.3,maxY:-1,floorY:A.floorY});
 explorationTargets.push({id:'cn-black-market-entry',name:'地下黑市 · 公共阶梯入口',position:[...A.entrance],roomId:'compound'},
  {id:A.id,name:A.name,position:[...A.interaction.position],roomId:A.id});
 facilities.push({id:A.id,name:A.name,targets:['cn-black-market-entry',A.id],furnishings:['独立地下货房','公共梯厅东侧入口','黑市交易台','布料与货包陈列','储货架']});
 const points=route=>route.map(([x,y,z])=>({x,y,z}));
 const navigationPortals=[{id:'cn-black-market-customer-route',points:points(A.route)},
  {id:'cn-black-market-merchant-route',points:points(A.merchant.route)}];
 if(packStatic){packStatic(q);packStatic(roof);}
 return {...A,group:q,roofGroup:roof,stockGroup:goods,stockDisplays,navigationPortals,
  setStock(items){const held=new Set((Array.isArray(items)?items:[]).filter(item=>item.holder==='merchant').map(item=>item.id));for(const [id,mesh]of stockDisplays)mesh.visible=held.has(id);}
 };
}
