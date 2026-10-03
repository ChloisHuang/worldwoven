const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
(async()=>{
const root=path.resolve(process.env.SOURCE_ROOT||'source'),cache=new Map();
const mod=f=>{if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});cache.set(f,m);return m;};
const link=(s,m)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
const ns=async name=>{const m=mod(root+'/game/'+name+'.js');if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;};
const N=await ns('navigation'),C=await ns('camera'),lot=(await ns('egypt-temple')).buildEgypt(),T=cache.get(root+'/vendor/three/build/three.module.js').namespace;
const opts={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4},report={routes:[],anchors:[],ceiling:[],errors:[]};
const routes=[['entry',[[0,0,23],[0,0,10.2]]],['procession',[[0,0,-6.2],[0,-3,-14.6],[-6,-3,-14.6],[-6,-6,-23.3],[-6,-6,-26],[.3,-6,-26],[.6,-6,-27.5],[.6,-6,-30.1]]],['offering',[[-5,-6,-26],[-10.5,-6,-26]]],['canopic',[[5.0,-6,-27.0],[5.0,-6,-29.3],[10.5,-6,-29.3]]],['coffin-circuit',[[.6,-6,-27.5],[4.95,-6,-27.5],[4.95,-6,-33],[.6,-6,-33],[.6,-6,-27.5]]]];
for(const x of[-1,1])routes.push(['first-stair-lane-'+x,[[x,0,-6.2],[x,-3,-14]]]);
for(const x of[-6.9,-5.1])routes.push(['deep-stair-lane-'+x,[[x,-3,-15],[x,-6,-23.2]]]);
for(const[name,points]of routes)for(const reverse of[false,true]){const ps=reverse?[...points].reverse():points,p=new T.Vector3(...ps[0]);let moves=0,maxStep=0;for(const target of ps.slice(1)){const oldStart=p.clone(),d=Math.hypot(target[0]-p.x,target[2]-p.z),n=Math.ceil(d/.035),dx=(target[0]-p.x)/n,dz=(target[2]-p.z)/n;for(let i=0;i<n;i++){const y=p.y;N.moveWithCollision(p,dx,dz,lot.colliders,.34,opts);maxStep=Math.max(maxStep,Math.abs(p.y-y));moves++;}const error=p.distanceTo(new T.Vector3(...target));if(error>.08){report.errors.push({name,reverse,at:p.toArray(),from:oldStart.toArray(),target,error});break;}}report.routes.push({name,reverse,moves,maxStep,end:p.toArray()});}
for(const s of lot.stations.filter(s=>['egypt-burial','egypt-stars'].includes(s.id)))for(const[role,p]of[['player',s.position],['npc',s.npcPosition],...s.route.map((p,i)=>['route-'+i,p])]){const bad=N.blocked(p[0],p[2],lot.colliders,.34,{...opts,y:p[1]});report.anchors.push({id:s.id,role,p,blocked:bad});if(bad)report.errors.push({id:s.id,role,p,problem:'blocked activity anchor'});}
lot.group.updateMatrixWorld(true);const meshes=[];lot.group.traverse(o=>{if(o.isMesh)meshes.push(o);});const ray=new T.Raycaster();
for(const p of[[0,0,16],[0,-1.5,-10],[-3,-3,-14.6],[-6,-4.5,-19.2],[-5,-6,-26],[3.4,-6,-26.5]]){ray.set(new T.Vector3(p[0],p[1]+2,p[2]),new T.Vector3(0,1,0));ray.far=8;const hit=ray.intersectObjects(meshes,false)[0];const clearance=hit?hit.point.y-p[1]:null;report.ceiling.push({p,clearance});if(!hit||clearance<2.7)report.errors.push({p,clearance,problem:'ceiling headroom'});}
assert.equal(lot.stations.length,15);assert.equal(lot.bounds.maxX-lot.bounds.minX,60);assert.equal(lot.bounds.maxZ-lot.bounds.minZ,80);assert.equal(lot.roofGroup.visible,true);
report.status=report.errors.length?'FAIL':'PASS';const out=process.env.OUT_FILE||'qa/egypt-depth-routes.json';fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));assert.equal(report.errors.length,0);
})().catch(e=>{console.error(e);process.exit(1)});
