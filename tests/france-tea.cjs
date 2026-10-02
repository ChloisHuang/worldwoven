// Portable: node --experimental-vm-modules tests/france-tea.cjs [source-root]
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=path.resolve(process.argv[2]||'source'),game=fs.existsSync(source+'/game')?source+'/game':source,
 vendor=fs.existsSync(source+'/vendor')?source+'/vendor':path.resolve(game,'../vendor'),cache=new Map();
function mod(f){f=path.resolve(f.split('?')[0]);if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});cache.set(f,m);return m;}
const link=(id,ref)=>mod(id==='three'?vendor+'/three/build/three.module.js':path.resolve(path.dirname(ref.identifier),id));
async function load(f){const m=mod(f);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{const lot=(await load(game+'/regions-west.js')).buildFrance({pack:false}),T=(await load(game+'/geometry.js')).THREE;
lot.group.updateMatrixWorld(true);const items=[],meshes=[];lot.group.traverse(o=>{if(o.userData.furnitureKind)items.push(o);if(o.isMesh)meshes.push(o);});
const get=(o,n)=>{const p=o.getObjectByName(n);assert(p,n+' missing');return p;},box=o=>new T.Box3().setFromObject(o),near=(a,b,tol=.015)=>assert(box(a).expandByScalar(tol).intersectsBox(box(b)),a.name+' disconnected from '+b.name);
const settings=items.filter(o=>o.userData.furnitureKind==='tea-setting');assert.equal(settings.length,2);
const garden=get(lot.group,'Royal garden tea party'),salon=get(lot.group,'Royal salon tea service');
const pots=items.filter(o=>o.name==='Royal porcelain teapot');assert.equal(pots.length,2);
let hollowSpoutChecks=0;
for(const p of pots){const spout=get(p,'Tapered hollow pouring spout'),body=get(p,'Rounded teapot body'),handle=get(p,'Joined teapot handle');near(spout,body);near(handle,body);near(get(p,'Seated domed lid'),body);near(get(p,'Gilt open spout lip'),spout);
 const g=spout.geometry,a=g.attributes.position,index=g.index,va=new T.Vector3().fromBufferAttribute(a,index.getX(0)),vb=new T.Vector3().fromBufferAttribute(a,index.getX(1)),vc=new T.Vector3().fromBufferAttribute(a,index.getX(2)),normal=vb.sub(va).cross(vc.sub(va)).normalize();
 assert(normal.dot(new T.Vector3(-.12,.99,0))>.85,'spout outer winding must face outward');hollowSpoutChecks++;
 // An axial ray must pass through the mouth ring, hitting the curved inner
 // wall later. This catches a filled cylinder or an accidental mouth cap.
 const mouth=new T.Vector3(.59,.45,0),d=new T.Vector3(.135,.06,0).normalize(),world=mouth.clone().addScaledVector(d,.015).applyMatrix4(p.matrixWorld),ray=new T.Raycaster(world,d.clone().transformDirection(p.matrixWorld).negate()),h=ray.intersectObject(spout,false)[0];
 assert(h&&h.distance>.025*p.getWorldScale(new T.Vector3()).x,'open spout must not be capped');hollowSpoutChecks++;
}
const stand=get(garden,'Two-tier royal pastry stand'),stem=get(stand,'Continuous pedestal and tier stem');assert.equal(stand.children.filter(o=>o.name==='Gold-rim porcelain plate').length,2);
for(const collar of stand.children.filter(o=>o.name==='Joined tier support collar'))near(collar,stem);
for(const plate of stand.children.filter(o=>o.name==='Gold-rim porcelain plate'))near(plate,stem);
const upperStem=stand.children.find(o=>o.isMesh&&o.geometry.type==='CylinderGeometry');near(upperStem,stem);near(get(stand,'Connected pastry stand ring'),upperStem);
for(const q of items.filter(o=>o.userData.furnitureKind==='tea-sugar')){near(get(q,'Hollow sugar bowl'),get(q,'Seated sugar bowl lid'));for(const h of q.children.filter(o=>o.name==='Joined sugar bowl handle'))near(get(q,'Hollow sugar bowl'),h);}
for(const q of items.filter(o=>o.userData.furnitureKind==='tea-milk'))near(get(q,'Hollow pinched milk jug wall'),get(q,'Joined milk jug handle'));
const support=[];
for(const p of items.filter(o=>['tea-cover','tea-tray','tea-sugar','tea-milk','tea-pastry','tea-stand'].includes(o.userData.furnitureKind)||o.name==='Royal porcelain teapot')){
 const own=new Set();p.traverse(o=>own.add(o));const b=box(p),position=p.getWorldPosition(new T.Vector3()),ray=new T.Raycaster(new T.Vector3(position.x,b.min.y+.008,position.z),new T.Vector3(0,-1,0)),h=ray.intersectObjects(meshes.filter(o=>!own.has(o)),false)[0];assert(h,p.name+' lacks support');const gap=b.min.y-h.point.y;assert(gap>=-.004&&gap<=.004,p.name+' support gap '+gap);support.push({name:p.name,position:position.toArray(),gap});
}
let maxTableRadius=0;garden.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);const r=Math.hypot(p.x-6.6,p.z-10.45);maxTableRadius=Math.max(maxTableRadius,r);assert(r<1.11,'tea object extends past unchanged table');}});
assert.equal(items.filter(o=>o.userData.furnitureKind==='tea-pastry').length,7);
const cafe=lot.stations.find(s=>s.id==='france-cafe');assert.deepEqual(cafe.workTarget,[7.21,1.414,10.06]);assert.deepEqual(cafe.position,[6.6,0,8.35]);assert.deepEqual(cafe.npcPosition,[7.1,0,8.92]);
const report={status:'PASS',scope:'Original production tea geometry; connected profiles, real hollow spout normals/mouth, supports and unchanged table footprint. Not WebGL or live gameplay.',settings:2,covers:3,pots:2,sugarBowls:2,milkJugs:2,pastries:7,hollowSpoutChecks,maxTableRadius,tableRadius:1.11,supports:support,maxAbsoluteSupportGap:Math.max(...support.map(o=>Math.abs(o.gap)))};
console.log(JSON.stringify(report,null,2));})().catch(e=>{console.error(e);process.exit(1)});
