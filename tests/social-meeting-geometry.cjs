// Real authored four-country fixture inventory and supported paired approaches.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(process.env.SOURCE_ROOT||'source'),cache=new Map();
function mod(f){f=path.resolve(f.split('?')[0]);if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});cache.set(f,m);return m;}
const link=(id,m)=>mod(id==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),id));
async function load(f){const m=mod(root+'/game/'+f+'.js');if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{const F=await load('furniture-interactions'),N=await load('navigation'),S=await load('social-meeting-places'),D=await load('automatic-doors');
for(const country of ['china','france','japan','egypt']){
 const M=await load({china:'regions-east',france:'regions-west',japan:'japan-bathhouse',egypt:'egypt-temple'}[country]),lot=M['build'+country[0].toUpperCase()+country.slice(1)](),furniture=F.createFurnitureInteractions(lot,country),doors=D.createAutomaticDoors(lot,country),multi=lot.heightAware||['japan','egypt'].includes(country),options=multi?{bounds:lot.bounds,surfaces:lot.walkableSurfaces,legacyGround:false,bodyHeight:1.95,maxStep:.4}:{bounds:lot.bounds,multilevel:false};
 const actors=['a','b'].map(actorId=>({actorId,root:{position:{x:lot.spawn[0],y:lot.spawn[1],z:lot.spawn[2]}}}));
 const places=S.createSocialMeetingPlaces({country,lot,furniture,getActors:()=>actors,planPath:(from,to,radius)=>N.findPath(from,to,lot.colliders.concat(doors.planningColliders),{...options,radius})});
 const result=places.resolve(['a','b']);assert(result.ok,country+' public actual geometry: '+JSON.stringify(result));
 const fixture=furniture.items.find(i=>i.id===result.place.fixtureId);assert(fixture);assert.deepEqual(Array.from(result.place.points[0]),Array.from(fixture.position));
 for(const [x,y,z]of result.place.points)assert(!N.blocked(x,z,lot.colliders,.34,{...options,y}),country+' pair point is supported/clear');
 assert(!places.resolve(['a','b'],{private:true}).ok,country+' cannot infer joint permission from existing room');
 console.log('PASS '+country+' '+result.place.id+' '+JSON.stringify(result.place.points));furniture.dispose();doors.dispose();
}
})().catch(e=>{console.error(e);process.exitCode=1;});
