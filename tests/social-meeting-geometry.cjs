// Real authored four-country fixture inventory and supported paired approaches.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(process.env.SOURCE_ROOT||'source'),cache=new Map();
function mod(f){f=path.resolve(f.split('?')[0]);if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});cache.set(f,m);return m;}
const link=(id,m)=>mod(id==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),id));
async function load(f){const m=mod(root+'/game/'+f+'.js');if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
const coverage=[],selectedIds=(process.env.NPC_ROUTE_IDS||'').split(',').filter(Boolean);
(async()=>{const F=await load('furniture-interactions'),N=await load('navigation'),S=await load('social-meeting-places'),D=await load('automatic-doors');
for(const country of ['china','france','japan','egypt']){
 const M=await load({china:'regions-east',france:'regions-west',japan:'japan-bathhouse',egypt:'egypt-temple'}[country]),lot=M['build'+country[0].toUpperCase()+country.slice(1)](),furniture=F.createFurnitureInteractions(lot,country),doors=D.createAutomaticDoors(lot,country),multi=lot.heightAware||['japan','egypt'].includes(country),options=multi?{bounds:lot.bounds,surfaces:lot.walkableSurfaces,legacyGround:false,bodyHeight:1.95,maxStep:.4}:{bounds:lot.bounds,multilevel:false};
 const actors=['a','b'].map(actorId=>({actorId,root:{position:{x:lot.spawn[0],y:lot.spawn[1],z:lot.spawn[2]}}}));
 const places=S.createSocialMeetingPlaces({country,lot,furniture,getActors:()=>actors,planPath:(from,to,radius)=>N.findPath(from,to,lot.colliders.concat(doors.planningColliders),{...options,radius})});
 const result=places.resolve(['a','b']);assert(result.ok,country+' public actual geometry: '+JSON.stringify(result));
 const fixture=furniture.items.find(i=>i.id===result.place.fixtureId);assert(fixture);assert.deepEqual(Array.from(result.place.points[0]),Array.from(fixture.position));
 for(const [x,y,z]of result.place.points)assert(!N.blocked(x,z,lot.colliders,.34,{...options,y}),country+' pair point is supported/clear');
 assert(!places.resolve(['a','b'],{private:true}).ok,country+' cannot infer joint permission from existing room');
 if(process.env.CHECK_NPC_ROSTER){
  const stations=lot.stations.filter(s=>s.npc!==false),roster=stations.map(station=>{const p=station.npcPosition||station.position;return {station,root:{position:{x:p[0],y:p[1]||0,z:p[2]}}};});
  if(country==='japan'){
   const V=await load('japan-visitors'),O=await load('japan-service-orders'),board=O.createJapanServiceOrders({worldSeed:1});
   for(let i=0;i<2;i++){const seat=furniture.items.filter(s=>s.kind==='seat'&&s.center[1]===3.8&&s.center[2]===7.55)[i],v=board.spawn({...V.createJapanVisitorIdentity(board.nextIdentity(),1,1),restPoint:seat.anchor,diningPoint:seat.anchor,restSeatId:seat.id}),station=V.japanVisitorStation(v);roster.push({station,visitor:true,root:{position:{x:v.position[0],y:v.position[1],z:v.position[2]}}});}
  }
  const routeOptions={...options};if(lot.navigationPortals?.length)routeOptions.portals=[...doors.getState().map(d=>({id:d.id,points:[-1,0,1].map(side=>({x:d.center[0]+(d.axis==='z'?side*(d.width/2+.55):0),y:d.center[1],z:d.center[2]+(d.axis==='x'?side*(d.width/2+.55):0)}))})),...lot.navigationPortals];
  const peerId={china:'cn-calligraphy',france:'france-cafe',japan:'jp-welcome',egypt:'egypt-papyrus'}[country];
  console.log('ROSTER '+country+' '+roster.map(a=>a.station.id).join(','));
  const peer=roster.find(a=>a.station.id===peerId)||roster[0],alternate=roster.find(a=>a!==peer);
  const memo=new Map(),plan=(from,to,radius)=>{const key=JSON.stringify([from,to,radius]);if(!memo.has(key))memo.set(key,doors.planPath(from,to,routeOptions,radius));return memo.get(key);};
  for(const actor of roster.filter(a=>!selectedIds.length||selectedIds.includes(a.station.id))){
   const other=actor===peer?alternate:peer,p=actor.root.position;
   // A real original peer at an already verified public approach. Only the
   // tested actor keeps its original spawn; peer transport is not under test.
   const peerStart=result.place.points[1],testPeer={...other,root:{position:{x:peerStart[0],y:peerStart[1],z:peerStart[2]}}};
   const check=S.createSocialMeetingPlaces({country,lot,furniture,getActors:()=>[actor,testPeer],planPath:plan}).resolve([actor.station.id,other.station.id]);
   const row={country,id:actor.station.id,name:actor.station.npcName||null,visitor:!!actor.visitor,start:[p.x,p.y,p.z],action:actor.station.npcAction||null,peer:other.station.id,ok:check.ok,reason:check.reason||null,place:check.place?.id||null,startBlocked:N.blocked(p.x,p.z,lot.colliders,.25,{...options,y:p.y})};coverage.push(row);console.log('ROUTE '+JSON.stringify(row));
  }
 }
 console.log('PASS '+country+' '+result.place.id+' '+JSON.stringify(result.place.points));furniture.dispose();doors.dispose();
}
if(process.env.CHECK_NPC_ROSTER){fs.writeFileSync(process.env.COVERAGE_OUTPUT||'/tmp/st01-npc-routes.json',JSON.stringify(coverage,null,2));assert.equal(coverage.length,selectedIds.length||74);assert.deepEqual(coverage.filter(r=>!r.ok).map(r=>({id:r.id,start:r.start,reason:r.reason})),[],'Every selected original actor has a reachable public pair endpoint');console.log('COVERAGE '+JSON.stringify({fixed:coverage.filter(r=>!r.visitor).length,ready:coverage.filter(r=>r.ok).length,unreachable:coverage.filter(r=>!r.ok).length}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
