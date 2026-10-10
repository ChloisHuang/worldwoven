// Real regression: a leftover terrain plane can seal an underground staircase;
// gate collision edits can otherwise leave a route open or stale after release.
const assert=require('node:assert/strict');
const {createBrowserModuleLoader}=require('./fixtures/browser-module-loader.cjs');
(async()=>{
 const load=createBrowserModuleLoader('source'),{buildChina}=await load('game/regions-east.js'),N=await load('game/navigation.js'),G=await load('game/geometry.js'),{holdingGroundPieces}=await load('game/china-holding-cell.js');
 const Camera=await load('game/camera.js');
 const lot=buildChina(),H=lot.holdingCell,point=a=>({x:a[0],y:a[1],z:a[2]}),options={surfaces:lot.walkableSurfaces,bounds:lot.bounds,legacyGround:false,radius:.39,portals:lot.navigationPortals};
 const checks=[];
 assert.equal(lot.stations.filter(s=>['cn-archery','cn-range-warden'].includes(s.id)).length,2);
 assert.equal(lot.stations.filter(s=>s.id.startsWith('cn-holding')).length,0,'no invented NPC/job');
 for(const anchor of [H.entrance,H.stairTop,H.stairBottom,H.intake,H.detention,H.evidence.position]){
  assert(Math.abs(N.resolveSurfaceHeight(point(anchor),options)-anchor[1])<1e-7,'supported actual anchor '+anchor);
  assert(!N.blocked(anchor[0],anchor[2],lot.colliders,.39,{...options,y:anchor[1]}),'clear actual anchor '+anchor);
 }
 for(let i=1;i<H.route.length;i++)for(const [a,b] of [[H.route[i-1],H.route[i]],[H.route[i],H.route[i-1]]])assert(N.canTraverse(point(a),point(b),lot.colliders,options),'full adult reversible stair/intake/cell edge '+i);
 const target=new G.THREE.Vector3(-14,-2.8355+1.45,33.6),desired=target.clone().add(new G.THREE.Vector3(0,Math.sin(.22)*4.6,-Math.cos(.22)*4.6)),camera=Camera.resolveCameraPosition(target,desired,lot.cameraColliders,.18);
 assert(camera.distanceTo(target)<4.5&&camera.distanceTo(target)>.8,'normal downhill camera stops before crossing real tread');
 checks.push('all authored anchors, reversible adult stair/doorway edges, and slope camera clearance');
 // Physical movement, not coordinate teleporting, follows the normal planner.
 function walk(from,to){
  const path=N.findPath(point(from),point(to),lot.colliders,options);assert(path.length,'planner route');
  const actor=point(from);let n=0;
  for(const p of path){while(Math.hypot(p.x-actor.x,p.z-actor.z)>.025){
   const dx=p.x-actor.x,dz=p.z-actor.z,len=Math.hypot(dx,dz),s=Math.min(.09,len);
   N.moveWithCollision(actor,dx/len*s,dz/len*s,lot.colliders,.34,options);
   assert(++n<3000,'movement makes progress');
   assert(!N.blocked(actor.x,actor.z,lot.colliders,.34,{...options,y:actor.y}),'moved actor stays clear');
  }}
  assert(Math.hypot(actor.x-to[0],actor.z-to[2])<.04);assert(Math.abs(actor.y-to[1])<.025);return path.length;
 }
 const approach=walk([-15.25,.13,19],H.entrance),inbound=walk(H.entrance,H.detention),outbound=walk(H.detention,H.entrance);
 checks.push('existing patrol return→stairs and physically walked descent/return');
 const M=lot.blackMarket;assert(M&&!H.blackMarket,'civilian market is independent of holding builder');const marketIn=walk([15,.115,8.4],M.merchant.position),marketOut=walk(M.interaction.position,[15,.115,8.4]);assert(!N.canTraverse(point([-14,-4.1,36.15]),point([-10.6,-4.1,36.15]),lot.colliders,options),'former jail shortcut is masonry sealed');const escortAcrossCourtyard=walk(M.interaction.position,H.intake);assert(N.findPath(point(M.interaction.position),point(H.intake),lot.colliders,options).some(p=>p.y>.1),'escort returns to street between separate basements');checks.push('civilian tavern public threshold to independent cellar and back; old jail branch sealed; escort crosses surface courtyard to original intake');
 const before=H.collisionVersion;assert(H.setLocked(true));assert.equal(H.collisionVersion,before+1);assert(!H.setLocked(true));N.clearNavigationCache(options);
 assert.equal(N.findPath(point(H.detention),point(H.entrance),lot.colliders,options).length,0,'closed real gate traps cell route');
 assert(!N.canTraverse(point([-22.9,-4.1,33.5]),point([-22.9,-4.1,35.2]),lot.colliders,options));
 assert(H.setLocked(false));N.clearNavigationCache(options);walk(H.detention,H.entrance);
 checks.push('closed grille denies escape; reopened grille restores physical exit');
 assert.equal(H.evidence.public,false);assert.equal(H.evidence.sealed,true);
 const token=lot.group.getObjectByName(H.evidence.itemId);assert(token,'real source token persists after static packing');H.setEvidencePresent(false);assert.equal(token.visible,false);H.setEvidencePresent(true);assert.equal(token.visible,true);
 const pieces=holdingGroundPieces({...lot.bounds,y:.015});assert(pieces.every(s=>!(s.minX<-14&&s.maxX>-14&&s.minZ<32&&s.maxZ>32)),'ground cut has no invisible top surface');
 const box=new G.THREE.Box3().setFromObject(H.roofGroup);assert(box.max.y<0&&box.min.y>=H.ceilingY-.001,'ceiling physically underground at declared level');
 checks.push('sealed physical evidence visibility and true terrain/ceiling cut');
 console.log(JSON.stringify({status:'PASS',scope:'China civilian black market and original patrol holding rooms; art acceptance requires normal gameplay renders',checks,routeWaypoints:{approach,inbound,outbound,marketIn,marketOut,escortAcrossCourtyard}},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
