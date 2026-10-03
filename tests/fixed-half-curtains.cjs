const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
fs.mkdirSync('qa',{recursive:true});const root=path.resolve('source'),cache=new Map();
function mod(f){if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});cache.set(f,m);return m;}
const linker=(s,m)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
(async()=>{const m=mod(root+'/game/automatic-doors.js');await m.link(linker);await m.evaluate();const {createAutomaticDoors}=m.namespace,T=mod(root+'/vendor/three/build/three.module.js').namespace,C=mod(root+'/game/room-closures.js').namespace;let variants=0;
for(const style of ['shoji','palace','egypt','french'])for(const axis of ['x','z']){
 const lot={group:new T.Group(),colliders:[],bounds:{minX:-5,maxX:5,minZ:-5,maxZ:5},automaticDoorways:[{id:'half',kind:'half-curtain',center:[0,0,0],width:3.2,height:2.85,axis,style,motion:'gather'}]},api=createAutomaticDoors(lot),before=api.root.children[0].children.map(p=>p.matrixWorld.elements.slice());
 assert.deepEqual(api.getState(),[],'fixed cloth is absent from automatic state');assert.equal(api.planningColliders.length,0,'fixed cloth has no moving route barrier');assert.equal(api.getStats().fixedHalfCurtains,1);
 const p={x:axis==='z'?-1:0,y:0,z:axis==='x'?-1:0},initial=api.getStats();for(let i=0;i<120;i++){api.update(1/60,[{position:p,height:1.95,radius:.34,speed:2}]);const d=api.constrainMove(p,axis==='z'?1/60:0,axis==='x'?1/60:0,.34,1.95);p.x+=d.dx;p.z+=d.dz;}
 assert(Math.abs((axis==='z'?p.x:p.z)-1)<1e-9,'controller crosses under natural hem without stop');assert.equal(api.getStats().poseEvaluations,initial.poseEvaluations);assert.deepEqual(api.root.children[0].children.map(p=>p.matrixWorld.elements.slice()),before,'cloth never moves near actors');assert(api.cameraColliders.every(b=>b.minY>1.95));assert.equal(api.root.children[0].children.filter(p=>p.type==='Group').length,2);
 api.dispose();variants++;
}
const doors=['jp-men-noren','jp-women-noren','jp-1-front-portal'].map((id,i)=>({id,a:[i,3.8,6.2],b:[i,3.8,4.45],width:2.8,height:2.85})),lot={group:new T.Group(),colliders:[],doorways:doors},api=createAutomaticDoors(lot,'japan');
assert(C.classifyRoomOpenings(lot,'japan').every(d=>d.kind==='half-curtain'&&d.motion==='fixed-overhead'&&!d.operable&&d.existingBanner));assert.equal(api.root.children.length,0,'source-authored noren receives no duplicate rendered closure');assert.equal(api.getState().length,0);assert.equal(api.getStats().staticBannerCameraBoxes,3);api.dispose();
const report={status:'PASS',scope:'Eight small exact-production cloth variants, unchanged .34 radius/1.95 height controller traversal, immutable transforms, camera clearance, three source-authored noren with zero duplicates; no whole-scene or render run',variants};fs.writeFileSync('qa/fixed-half-curtains.json',JSON.stringify(report,null,2));console.log(report);
})().catch(e=>{console.error(e);process.exit(1)});
