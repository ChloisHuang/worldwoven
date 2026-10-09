import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// CR05 regression: the new branch must stay connected without opening the jail,
// and a finite stock update must never turn decorative storage into new goods.
const assert=require('node:assert/strict');
const {createBrowserModuleLoader}=require('./fixtures/browser-module-loader.cjs');
(async()=>{
 const load=createBrowserModuleLoader('source'),G=await load('game/geometry.js'),{buildChinaHoldingCell,holdingGroundPieces}=await load('game/china-holding-cell.js'),N=await load('game/navigation.js');
 const point=([x,y,z])=>({x,y,z}),ctx={group:new G.THREE.Group(),roofGroup:new G.THREE.Group(),colliders:[],cameraColliders:[],walkableSurfaces:[],interiorRooms:[],levels:[],lightingZones:[],explorationTargets:[],facilities:[]};
 ctx.group.add(ctx.roofGroup);const H=buildChinaHoldingCell(G,ctx),M=H.blackMarket;
 const bounds={minX:-26,maxX:-3,minZ:27,maxZ:38};ctx.walkableSurfaces.push(...holdingGroundPieces({...bounds,y:.115}));
 const options={surfaces:ctx.walkableSurfaces,bounds,legacyGround:false,radius:.39,pathRadius:.39,portals:H.navigationPortals};
 const anchors=[H.entrance,H.intake,H.detention,H.evidence.position,M.branchEntry,M.interaction.position,M.merchant.position];
 for(const p of anchors){assert(Math.abs(N.resolveSurfaceHeight(point(p),options)-p[1])<1e-7,'support '+p);assert(!N.blocked(p[0],p[2],ctx.colliders,.39,{...options,y:p[1]}),'adult clearance '+p);}
 for(const [name,route]of [['holding',H.route],['market',M.route],['merchant',M.merchant.route]])for(let i=1;i<route.length;i++)for(const [a,b]of [[route[i-1],route[i]],[route[i],route[i-1]]])assert(N.canTraverse(point(a),point(b),ctx.colliders,options),name+' reversible edge '+i+' '+a+' -> '+b);
 const walk=(from,to)=>{const path=N.findPath(point(from),point(to),ctx.colliders,options);assert(path.length,'route exists');const actor=point(from);let steps=0;for(const p of path)while(Math.hypot(p.x-actor.x,p.z-actor.z)>.025){const dx=p.x-actor.x,dz=p.z-actor.z,d=Math.hypot(dx,dz),s=Math.min(.09,d);N.moveWithCollision(actor,dx/d*s,dz/d*s,ctx.colliders,.34,options);assert(++steps<3000,'movement makes progress');assert(!N.blocked(actor.x,actor.z,ctx.colliders,.34,{...options,y:actor.y}),'clear continuous move');}assert(Math.hypot(actor.x-to[0],actor.z-to[2])<.04);assert(Math.abs(actor.y-to[1])<.025);return {waypoints:path.length,steps};};
 const routes={customerIn:walk(H.entrance,M.interaction.position),customerOut:walk(M.interaction.position,H.entrance),merchantIn:walk(H.entrance,M.merchant.position),merchantOut:walk(M.merchant.position,H.entrance)};
 assert(M.bounds.minX>H.bounds.maxX,'rooms physically independent');assert.equal(H.gates.length,2);H.setLocked(true);N.clearNavigationCache(options);routes.marketWithJailLocked=walk(M.interaction.position,H.entrance);assert.equal(N.findPath(point(H.detention),point(H.entrance),ctx.colliders,options).length,0,'jail still locks');H.setLocked(false);N.clearNavigationCache(options);routes.jailOut=walk(H.detention,H.entrance);
 assert(Math.hypot(M.interaction.position[0]-M.merchant.position[0],M.interaction.position[2]-M.merchant.position[2])<=1.5+1e-8,'physical trading distance');
 const evidence=ctx.group.getObjectByName(H.evidence.itemId);H.setEvidencePresent(false);assert.equal(evidence.visible,false);H.setEvidencePresent(true);assert(evidence.visible);
 const ids=[...M.stockDisplays.keys()];assert.equal(ids.length,5);M.setStock(ids.map((id,i)=>({id,holder:i===0?'player':'merchant'})));assert(!M.stockDisplays.get(ids[0]).visible);assert([...M.stockDisplays.values()].slice(1).every(g=>g.visible));M.setStock([]);assert([...M.stockDisplays.values()].every(g=>!g.visible));
 assert(ctx.group.getObjectByName('Black market sign 地下黑市'));assert(ctx.group.getObjectByName('Black market sign 货物交易'));
 console.log(JSON.stringify({status:'PASS',scope:'isolated exact holding + new market geometry, production navigation; no complete palace or rendered visual claim',routes,colliders:ctx.colliders.length,surfaces:ctx.walkableSurfaces.length,merchantDistance:1.5,stockUnits:ids.length,rssMiB:process.memoryUsage().rss/1024/1024},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
