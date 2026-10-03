// Run one actual authored region at a time. Frames, doors and walls are untouched.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.env.SOURCE_ROOT||'source'),region=process.argv[2];
const definitions={japan:['japan-bathhouse.js','buildJapan'],china:['regions-east.js','buildChina'],egypt:['egypt-temple.js','buildEgypt'],france:['regions-west.js','buildFrance']};
if(!definitions[region])throw Error('Choose one authored region');
const load=require('../tests/fixtures/browser-module-loader.cjs').createBrowserModuleLoader(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'game',f))).digest('hex');
(async()=>{
 const [moduleName,builder]=definitions[region],{THREE:T}=await load('game/geometry.js'),{createAutomaticDoors}=await load('game/automatic-doors.js'),{classifyRoomOpenings}=await load('game/room-closures.js');
 const modules=[moduleName,'china-palace.js','automatic-doors.js','room-closures.js','inset-closures.js','japan-shoji.js'];const hashes=Object.fromEntries(modules.map(f=>[f,hash(f)]));
 const lot=(await load('game/'+moduleName))[builder](),doors=createAutomaticDoors(lot,region),specs=classifyRoomOpenings(lot,region).filter(s=>s.kind==='door');
 lot.group.updateMatrixWorld(true);const opaque=[];lot.group.traverse(o=>{if(o.isMesh&&!o.material.transparent)opaque.push(o)});
 const ray=new T.Raycaster(),failures=[],inventory=[],rows=[];
 for(const s of specs){
  const mount=s.closureMount,valid=!!mount&&mount.wallPlane===(s.axis==='x'?s.center[2]:s.center[0])&&s.surfaceTrack===false;
  inventory.push({id:s.id,openingId:s.openingId,width:s.width,height:s.height,center:s.center,axis:s.axis,motion:s.motion,mount,valid});
  if(!valid){failures.push({id:s.id,reason:'No source-authored centered inset mount'});continue;}
  const tangent=s.axis==='x'?new T.Vector3(1,0,0):new T.Vector3(0,0,1),normal=s.axis==='x'?new T.Vector3(0,0,1):new T.Vector3(1,0,0),half=(mount.wallDepth||.3)/2+.16;
  for(const offset of[0,-s.width/2+.008,s.width/2-.008])for(const height of[.35,Math.min(1.30,s.height*.5),s.height-.18])for(const sign of[-1,1])for(const angle of[-Math.PI/6,0,Math.PI/6]){
   const center=new T.Vector3(...s.center).addScaledVector(tangent,offset);center.y+=height;
   const direction=normal.clone().multiplyScalar(-sign*Math.cos(angle)).addScaledVector(tangent,Math.sin(angle)),origin=center.clone().addScaledVector(direction,-half/Math.cos(angle));
   ray.set(origin,direction);ray.near=0;ray.far=2*half/Math.cos(angle);
   const hit=ray.intersectObjects(opaque,false).find(h=>h.object.visible&&h.distance>.001);
   const row={id:s.id,offset,height,sign,angle,blocked:!!hit,origin:origin.toArray(),direction:direction.toArray(),hitDistance:hit?.distance};rows.push(row);if(!hit)failures.push({...row,reason:'Visible light path through closed meeting/jamb section'});
  }
 }
 for(const f of modules)if(hashes[f]!==hash(f))throw Error('Source changed during scene check: '+f);
 const report={status:failures.length?'FAIL':'PASS',scope:'Exact authored region, closed rigid-door meshes plus source walls. Real frame/meeting seam normal and oblique rays. No substituted mesh, collision, browser or mobile claim; open sweeps and rendered views are separate gates.',region,source:root,hashes,counts:{rigid:specs.length,rays:rows.length,failures:failures.length},inventory,failures,rows};
 const out=process.env.QA_OUT||'qa/inset-closed-'+region+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:undefined,inventory:undefined,failures:failures.slice(0,15)},null,2));doors.dispose();process.exitCode=failures.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
