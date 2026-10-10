import {registerNightFixture} from './night-lighting.js';
import {blackMarketPlaque} from './china-black-market-lettering.js';
import {marketPoint,marketBounds,BLACK_MARKET_STAIRS} from './china-black-market-layout.js';

// Keep the authored interior in local coordinates; only its site changes.
const ORIGINAL_INTERIOR = Object.freeze({
 id:'cn-underground-black-market',name:'地下黑市',floorY:-4.1,ceilingY:-1.1,
 bounds:{minX:-12.2,maxX:-3.4,minZ:29.4,maxZ:37},
 entrance:[-14,.115,28],branchEntry:[-12.35,-4.1,36.15],
 interaction:{id:'cn-black-market-counter',name:'黑市交易台',position:[-6.65,-4.1,32.9],anchor:[-6.65,-3.02,32.1],menuPoint:[-6.65,-2.80,32.32]},
 merchant:{position:[-6.65,-4.1,31.4],workTarget:[-6.65,-3.02,32.1],rotation:0,
  route:[[-14,.115,28],[-14,.115,28.7],[-14,-4.1,35.7],[-14,-4.1,36.15],[-10.6,-4.1,36.15],[-9.1,-4.1,34.3],[-9.1,-4.1,31.4],[-6.65,-4.1,31.4]]},
 route:[[-14,.115,28],[-14,.115,28.7],[-14,-4.1,35.7],[-14,-4.1,36.15],[-10.6,-4.1,36.15],[-8.8,-4.1,34.3],[-6.65,-4.1,32.9]]
});

const S=BLACK_MARKET_STAIRS,O=ORIGINAL_INTERIOR;
const approach=[S.entrance,S.top,S.bottom,S.landing,S.roomEntry];
export const CHINA_BLACK_MARKET=Object.freeze({...O,bounds:marketBounds(O.bounds),entrance:S.entrance,stairTop:S.top,stairBottom:S.bottom,stairHole:S.hole,branchEntry:S.roomEntry,
 interaction:{...O.interaction,position:marketPoint(O.interaction.position),anchor:marketPoint(O.interaction.anchor),menuPoint:marketPoint(O.interaction.menuPoint)},
 merchant:{...O.merchant,position:marketPoint(O.merchant.position),workTarget:marketPoint(O.merchant.workTarget),route:[...approach,...O.merchant.route.slice(4).map(marketPoint)]},
 route:[...approach,...O.route.slice(4).map(marketPoint)]});

export function buildChinaBlackMarket(G,{group,roofGroup,colliders,cameraColliders,walkableSurfaces,interiorRooms,levels,lightingZones,explorationTargets,facilities,packStatic}) {
 const A=ORIGINAL_INTERIOR,{THREE}=G,q=new THREE.Group(),roof=new THREE.Group(),goods=new THREE.Group();
 const lists=[colliders,cameraColliders,walkableSurfaces,interiorRooms,levels,lightingZones,explorationTargets],starts=lists.map(rows=>rows.length);
 q.name='China independent underground black market';roof.name='China black market ceiling';goods.name='China finite black market stock';group.add(q,goods);roofGroup.add(roof);
 const C={stone:0x899b92,mortar:0x647b73,light:0xa5b3a1,wood:0x57453a,edge:0x9b784d,jade:0x40736b,cloth:0x89705a,gold:0xb98a51};
 const block=(x,y,z,w,h,d,color=C.stone,solid=true,parent=q)=>{
  const mesh=G.box(parent,x,y,z,w,h,d,color);
  if(solid){const box={minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2,blackMarket:true};colliders.push(box);cameraColliders.push({...box});}
  return mesh;
 };
 const wall=(axis,at,from,to)=>block(axis==='x'?(from+to)/2:at,(A.floorY+A.ceilingY)/2,axis==='x'?at:(from+to)/2,axis==='x'?to-from:.26,A.ceilingY-A.floorY,axis==='x'?.26:to-from);
 // The civilian cellar has its own west wall and a door to its own stair hall.
 block(-7.95,A.floorY-.12,33.2,9.1,.24,7.6,C.stone);
 walkableSurfaces.push({id:'cn-black-market-floor',minX:-12.5,maxX:-3.4,minZ:29.4,maxZ:37,y:A.floorY});
 wall('z',-12.37,29.27,35.32);wall('z',-12.37,36.96,37.13);block(-12.37,-1.425,36.14,.26,.65,1.64);
 wall('x',29.27,-12.37,-3.27);wall('x',37.13,-12.37,-3.27);wall('z',-3.27,29.27,37.13);
 block(-7.72,-.98,33.2,8.96,.24,7.86,C.mortar,true,roof);
 for(const z of [30.3,33.2,36.1])block(-7.72,-1.22,z,8.96,.20,.16,C.wood,false,roof);
 for(let z=29.85;z<37;z+=.70)block(-7.8,A.floorY+.008,z,8.62,.016,.026,C.mortar,false);
 for(let y=A.floorY+.60;y<A.ceilingY;y+=.60){
  block(-7.8,y,29.409,8.60,.026,.014,C.mortar,false);
  block(-3.408,y,33.2,.014,.026,7.45,C.mortar,false);
  block(-7.8,y,36.991,8.60,.026,.014,C.mortar,false);
 }
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
 const lamp=(x,y,z,intensity=11,distance=4.2)=>{
  const facing=z>34?-1:1;
  block(x,y,z,.36,.51,.26,C.wood,false);
  G.mesh(q,new THREE.BoxGeometry(.24,.34,.29),0xffd8a2,x,y,z+facing*.04,{emissive:0xffb461,emissiveIntensity:.60});
  for(const yy of [-.26,.26])block(x,y+yy,z,.43,.055,.32,C.edge,false);
  registerNightFixture(q,x,y,z+facing*.24,{kind:'black-market-wall-lantern',intensity,distance,dayFactor:.72,floorY:A.floorY});
 };
 lamp(-10.6,-1.98,29.62,8,3.4);lamp(-5.05,-1.98,29.62,13,4.5);lamp(-10.1,-1.96,36.75,9,3.6);
 const room={id:A.id,name:A.name,...A.bounds,floorY:A.floorY,ceiling:A.ceilingY};
 interiorRooms.push(room);levels.push({id:A.id,name:'地下 · 黑市',y:A.floorY,bounds:A.bounds});
 lightingZones.push({id:A.id,...A.bounds,minY:-4.3,maxY:-1,floorY:A.floorY,baseLightScale:.18,baseLightBounds:{minX:-12.45,maxX:-2.85,minZ:28.85,maxZ:37.55,minY:-4.6,maxY:-.75}});
 explorationTargets.push({id:'cn-black-market-entry',name:'地下黑市 · 云来酒楼西巷入口',position:[...A.entrance],roomId:'compound'},
  {id:A.id,name:A.name,position:[...A.interaction.position],roomId:A.id});
 facilities.push({id:A.id,name:A.name,targets:['cn-black-market-entry',A.id],furnishings:['云来酒楼地下货房','酒楼西巷独立石阶','黑市交易台','布料与货包陈列','储货架']});
 // Translate the actual geometry and every matching world-space proxy.
 for(const g of [q,roof,goods])g.position.set(29,0,-17);
 const moveRecord=row=>{if(Number.isFinite(row.minX))Object.assign(row,marketBounds(row));if(row.bounds)row.bounds=marketBounds(row.bounds);if(row.baseLightBounds)row.baseLightBounds=marketBounds(row.baseLightBounds);if(row.position)row.position=marketPoint(row.position);};
 lists.forEach((rows,i)=>rows.slice(starts[i]).forEach(moveRecord));
 explorationTargets.find(t=>t.id==='cn-black-market-entry').position=[...S.entrance];
 // The independent street stair has no connection to the patrol's basement.
 const stair=new THREE.Group();stair.name='China Yunlai west-lane cellar stair';group.add(stair);
 const sb=(x,y,z,w,h,d,c=C.stone,solid=true)=>{const mesh=G.box(stair,x,y,z,w,h,d,c);if(solid){const hit={minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2,blackMarketStair:true};colliders.push(hit);cameraColliders.push({...hit});}return mesh;};
 const sw=(x,z,w,d,bottom=-4.35,top=1.05)=>sb(x,(bottom+top)/2,z,w,top-bottom,d);
 const H=S.hole;
 sw(H.minX-.13,15.85,.34,8.3);sw(H.maxX+.13,15.01,.34,6.62);sw(H.maxX+.13,19.98,.34,.04);sw(H.maxX+.13,19.14,.34,1.64,-1.75,1.05);
 sw(14.3,H.maxZ+.13,2.92,.34);
 // Short enclosed link runs under the tavern wall, without cutting that wall.
 sw(16.05,18.19,1.3,.26,-4.1,-1.1);sw(16.05,20.13,1.3,.26,-4.1,-1.1);
 sb(16.05,-.98,19.16,1.3,.24,1.68,C.mortar);
 sb(15.05,-4.22,19.35,3.9,.24,1.3);
 walkableSurfaces.push({id:'cn-market-stair-landing',minX:13.1,maxX:16.8,minZ:18.7,maxZ:20,y:-4.1});
 const drop=-4.215;
 for(let i=0;i<20;i++){const z=11.7+7*(i+.5)/20,y=.115+drop*(i+.5)/20;sb(14.3,y-.13,z,2.4,.26,.35,C.light,false);cameraColliders.push({minX:13.1,maxX:15.5,minY:y-.26,maxY:y,minZ:z-.175,maxZ:z+.175,blackMarketStair:true});sb(14.3,y+.009,z-.147,2.32,.018,.04,C.mortar,false);}
 walkableSurfaces.push({id:'cn-market-stairs',...H,maxZ:18.7,y:.115,axis:'z',endY:-4.1});
 for(const x of [13.25,15.35])for(let i=0;i<14;i++){const z=11.7+7*(i+.5)/14,y=.115+drop*(i+.5)/14+1,rail=sb(x,y,z,.085,.085,.59,C.wood,false);rail.rotation.x=-Math.atan2(drop,7);cameraColliders.push({minX:x-.055,maxX:x+.055,minY:y-.20,maxY:y+.20,minZ:z-.27,maxZ:z+.27,blackMarketStair:true});}
 for(const x of [12.97,15.63]){sb(x,1.10,15.85,.40,.12,8.3,C.wood,false);sb(x,1.28,11.55,.18,2.33,.18,C.wood);}
 sb(14.3,2.50,11.55,3.02,.24,.36,C.wood);blackMarketPlaque(G,stair,'地下黑市',14.3,2.11,11.34,2.1,.46,Math.PI);
 sb(14.3,-1.8,20.17,.36,.51,.26,C.wood,false);G.mesh(stair,new THREE.BoxGeometry(.24,.34,.29),0xffd8a2,14.3,-1.8,20.03,{emissive:0xffb461,emissiveIntensity:.6});registerNightFixture(stair,14.3,-1.8,19.94,{kind:'black-market-stair-lantern',intensity:9,distance:3.6,dayFactor:.72,floorY:-4.1});
 const points=route=>route.map(([x,y,z])=>({x,y,z}));
 const navigationPortals=[{id:'cn-black-market-customer-route',points:points(CHINA_BLACK_MARKET.route)},{id:'cn-black-market-merchant-route',points:points(CHINA_BLACK_MARKET.merchant.route)}];
 if(packStatic){packStatic(q);packStatic(roof);packStatic(stair);}
 return {...CHINA_BLACK_MARKET,group:q,roofGroup:roof,stairGroup:stair,stockGroup:goods,stockDisplays,navigationPortals,
  setStock(items){const held=new Set((Array.isArray(items)?items:[]).filter(item=>item.holder==='merchant').map(item=>item.id));for(const [id,mesh]of stockDisplays)mesh.visible=held.has(id);}
 };
}
