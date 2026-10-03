const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=path.resolve(process.env.SOURCE_ROOT||'source');
const load=require('../../tests/fixtures/browser-module-loader.cjs').createBrowserModuleLoader(source);
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(source,'game',f))).digest('hex');
(async()=>{
 const modules=['china-palace.js','automatic-doors.js','room-closures.js','inset-closures.js'];
 const hashes=Object.fromEntries(modules.map(f=>[f,sha(f)]));
 const {buildChina}=await load('game/regions-east.js'),{THREE:T}=await load('game/geometry.js'),{createAutomaticDoors}=await load('game/automatic-doors.js');
 const lot=buildChina(),doors=createAutomaticDoors(lot,'china');lot.group.updateMatrixWorld(true);
 const meshes=[];lot.group.traverse(o=>{if(o.isMesh&&!o.material.transparent){o.geometry.computeBoundingBox();meshes.push(o)}});
 const ray=new T.Raycaster(),walls=lot.architectureProgram.perimeterWalls,failures=[],rows=[];
 for(const wall of walls){
  const xaxis=wall.side==='north'||wall.side==='south',b=wall.bounds;
  const start=xaxis?b.minX:b.minZ,end=xaxis?b.maxX:b.maxZ,at=xaxis?(b.minZ+b.maxZ)/2:(b.minX+b.maxX)/2;
  const tangent=xaxis?new T.Vector3(1,0,0):new T.Vector3(0,0,1),normal=xaxis?new T.Vector3(0,0,1):new T.Vector3(1,0,0);
  const probes=new Set();for(let lateral=start+.05;lateral<end;lateral+=.4)probes.add(Number(lateral.toFixed(5)));
  // Include every masonry-to-jamb and three-bay pier edge as well as long spans.
  for(const op of wall.openings)for(const e of[op.from,op.to])for(const delta of[-.10,-.02,.02,.10])probes.add(e+delta);
  for(const lateral of probes)for(const y of[.3,1.6,3.6,4.5])for(const sign of[-1,1]){
   const p=new T.Vector3().addScaledVector(tangent,lateral).addScaledVector(normal,at);p.y=y;
   ray.set(p.clone().addScaledVector(normal,.55*sign),normal.clone().multiplyScalar(-sign));ray.near=0;ray.far=1.1;
   const hit=ray.intersectObjects(meshes,false).find(h=>h.object.visible&&h.distance>.001);
   const row={side:wall.side,lateral,y,sign,blocked:!!hit,hitDistance:hit?.distance};rows.push(row);if(!hit)failures.push(row);
  }
 }
 const after=Object.fromEntries(modules.map(f=>[f,sha(f)]));if(JSON.stringify(after)!==JSON.stringify(hashes))throw Error('Source changed during perimeter gate');
 const result={status:failures.length?'FAIL':'PASS',scope:'Exact full China production wall/gate meshes, closed state, short rays restricted to enclosing-wall thickness. All four sides, four heights, regular spans plus every gate jamb and south masonry pier. Not a visual or movement approval.',source,hashes,counts:{walls:walls.length,gates:walls.reduce((n,w)=>n+w.openings.length,0),rays:rows.length,failures:failures.length},failures:failures.slice(0,40),rows};
 const out=process.env.OUT_FILE||'qa/china-insets/perimeter-envelope.json';fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,rows:undefined},null,2));doors.dispose();process.exitCode=failures.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
