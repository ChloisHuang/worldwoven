// Original France bed/table textiles: real hands, bounded reachable approaches,
// limb lengths, clothing clearance and exit recovery. The former generic tidy
// pose missed these objects; this opt-in must not invent a held cloth or remesh them.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
const source=path.resolve(process.env.SOURCE_ROOT||'source'),cache=new Map();
function mod(file){file=path.resolve(file.split('?')[0]);if(!cache.has(file))cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file}));return cache.get(file);}
const link=(name,parent)=>mod(name==='three'?source+'/vendor/three/build/three.module.js':path.resolve(path.dirname(parent.identifier),name));
async function load(name){const m=mod(source+'/'+name);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
await load('game/character-live-entry.js');
const C=await load('game/characters.js'),T=await load('vendor/three/build/three.module.js'),A=await load('game/appearance.js'),N=await load('game/navigation.js'),F=await load('game/floor-support.js');
const {FRANCE_BEDCHAMBER_WORK:work}=await load('game/france-bedchamber-service.js'),lot=(await load('game/regions-west.js')).buildFrance(),original=lot.franceBedchamber,V=(...a)=>new T.Vector3(...a),floor=F.visualSupportHeight(lot,work.smooth.position[0],work.smooth.position[2],0,false);
assert.equal(floor,.285,'production bedroom rug support');
assert.equal(original.bedId,'france-furniture-bed-0');assert.equal(original.embroidery.length,6);assert.equal(original.pillows.length,2);assert.equal(original.folded.length,3);
assert.deepEqual(original.cover.position.toArray(),[7.55,1.17,-2.14]);assert.equal(original.cover.geometry.parameters.width,3.24);assert.equal(original.cover.geometry.parameters.height,.16);assert.equal(original.cover.geometry.parameters.depth,2.93);
for(let i=0;i<2;i++){const g=original.pillows[i];assert.deepEqual(g.position.toArray(),[0,0,0]);assert.equal(g.children.length,2);assert.deepEqual(g.children[0].position.toArray(),[[6.72,8.32][i],1.135,-3.82]);}
for(let i=0;i<3;i++)assert.deepEqual(original.folded[i].position.toArray(),[5.05,1.29+i*.065,1.85]);
lot.group.updateMatrixWorld(true);const retained=[original.cover,...original.embroidery,...original.pillows.flatMap(g=>g.children),...original.folded],unchanged=retained.map(m=>({mesh:m,geometry:m.geometry,matrix:m.matrixWorld.clone(),positions:[...m.geometry.attributes.position.array]}));
assert(retained.every(m=>m.parent),'all original meshes survive production static batching');
const objects={smooth:original.cover,pillowWest:original.pillows[0].children[1],pillowEast:original.pillows[1].children[1],fold:original.folded[2]};
const solids=[{id:'bed frame',box:new T.Box3(V(5.875,.23,-4.675),V(9.225,.87,-.625))},{id:'mattress',box:new T.Box3(V(5.935,.85,-4.615),V(9.165,1.13,-.685))},{id:'tabletop',box:new T.Box3(V(4.7,1.135,1.48),V(7.9,1.245,2.38))},...retained.map((m,i)=>({id:'original textile '+i,box:new T.Box3().setFromObject(m)}))];
const report={scope:'Original retained France meshes, production .39 path/.34 movement radius and .285 rug/footprint probes, existing Juliette and player body/leg boundaries, real skinned geometry. CPU evidence only; normal-view artwork remains separate.',routes:[],cases:[],failures:[]};
const check=(ok,label,data)=>{if(!ok)report.failures.push({label,...data});};
const nav={bounds:lot.bounds,multilevel:false,radius:.34,pathRadius:.39},point=p=>({x:p[0],y:floor,z:p[2]});
let from=[4.55,floor,-1.2];
for(const [stage,w]of Object.entries(work)){
 const route=N.findPath(point(from),point(w.position),lot.colliders,nav),p=point(from);assert(route.length,'route to '+stage);assert(!N.blocked(w.position[0],w.position[2],lot.colliders,.39,nav),'production path radius at '+stage);
 let steps=0;for(const target of route){let n=0;while(Math.hypot(p.x-target.x,p.z-target.z)>.012&&n++<1200){const d=Math.hypot(p.x-target.x,p.z-target.z),travel=Math.min(d,.025);N.moveWithCollision(p,(target.x-p.x)/d*travel,(target.z-p.z)/d*travel,lot.colliders,.34,nav);assert(!N.blocked(p.x,p.z,lot.colliders,.339,nav));steps++;}assert(n<1200,'physical navigation stuck at '+stage);}
 assert(Math.hypot(p.x-w.position[0],p.z-w.position[2])<.035);report.routes.push({stage,from:from.slice(),to:w.position.slice(),steps});from=w.position;
}
function update(a){a.root.updateMatrixWorld(true);a.root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});}
function lengths(a){const rig=a.root.userData.body;return [['arms','forearms','hands'],['legs','knees','feet']].flatMap(keys=>[0,1].flatMap(s=>{const p=keys.map(k=>rig.worldToLocal(a.root.userData[k][s].getWorldPosition(V())));return[p[0].distanceTo(p[1]),p[1].distanceTo(p[2])];}));}
function geometry(a){const out={bodyMin:Infinity,shoeMin:[Infinity,Infinity],handMin:[Infinity,Infinity],handPoint:[null,null],palmMin:[Infinity,Infinity],intrusions:{}};
 a.root.traverse(m=>{if(!m.isSkinnedMesh)return;for(const r of m.geometry.userData.sourceRanges||[]){const side=/--1(?:-|$)/.test(r.name)?0:1,hand=/relaxed-palm|relaxed-finger|thumb-/.test(r.name),palm=/relaxed-palm/.test(r.name),shoe=/footwear|sole-|loafer/.test(r.name);
  for(let i=r.start;i<r.start+r.count;i++){const p=m.getVertexPosition(i,V()).applyMatrix4(m.matrixWorld);out.bodyMin=Math.min(out.bodyMin,p.y);if(shoe){const s=m.geometry.attributes.skinIndex.getX(i)===12?0:1;out.shoeMin[s]=Math.min(out.shoeMin[s],p.y);}if(palm)out.palmMin[side]=Math.min(out.palmMin[side],p.y);if(hand&&p.y<out.handMin[side]){out.handMin[side]=p.y;out.handPoint[side]=p.toArray();}
   for(const {id,box:b}of solids)if(p.x>b.min.x+.003&&p.x<b.max.x-.003&&p.y>b.min.y+.003&&p.y<b.max.y-.003&&p.z>b.min.z+.003&&p.z<b.max.z-.003){const key=id+':'+r.name;out.intrusions[key]=(out.intrusions[key]||0)+1;}
  }
 }});return out;
}
const rows=[{name:'Juliette-original',...A.npcRoleAppearance('france','france-bedroom',1,2),scale:.96},{name:'player-original',...A.createAppearanceState(1,{extended:false}).player,scale:1},{name:'player-slender-short',bodyPreset:'feminine-slender',shapeTraits:{legLength:.94},scale:1},{name:'player-broad-long',bodyPreset:'masculine-broad',shapeTraits:{legLength:1.06},scale:1}];
for(const row of rows){const a=C.createCharacter({...row,culture:'france'});lot.group.add(a.root);a.root.position.set(4.55,floor,-1.2);update(a);const baseline=lengths(a),frames=[];
 for(const [stage,object]of Object.entries(objects)){const w=work[stage],target=w.target,axis=stage==='fold'?'x':'z',surface=new T.Box3().setFromObject(object);
  // The real service starts within 65 mm; sample the complete arrival circle,
  // excluding centers that production movement already rejects as blocked.
  const offsets=[[0,0],...Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*.065,Math.sin(i*Math.PI/4)*.065])];
  for(const [dx,dz]of offsets){if(N.blocked(w.position[0]+dx,w.position[2]+dz,lot.colliders,.34,nav))continue;for(const time of [0,.65,1.96]){
   a.root.position.set(w.position[0]+dx,floor,w.position[2]+dz);assert.equal(F.visualSupportHeight(lot,a.root.position.x,a.root.position.z,0,false),floor);const before=a.root.position.clone();a.root.rotation.y=Math.atan2(target[0]-before.x,target[2]-before.z);a.animate(time,false,'linen-care',{linenCare:{target,axis},visualFloorOffset:F.characterFloorOffsetAt(lot,before.x,before.y,before.z),groundHeightAt:(x,z)=>F.visualSupportHeight(lot,x,z,before.y,false),footprintHeightAt:(minX,maxX,minZ,maxZ)=>F.footprintSupportHeight(lot,minX,maxX,minZ,maxZ,before.y,false)});update(a);
   const actual=geometry(a),contact=a.getPoseMetrics().linenCareContact,context={name:row.name,stage,time,offset:[dx,dz]},limbs=lengths(a);frames.push({...context,actual,contact});
   check(a.root.position.distanceTo(before)<1e-9,'root unchanged',context);check(limbs.every((v,i)=>Math.abs(v-baseline[i])<1e-6),'anatomical limbs',context);check(Object.values(a.root.userData.tools).every(p=>!p.visible),'bare hands without invented prop',context);
   check(contact?.hands.every(h=>h.reachError<.002),'reachable real hand targets',{...context,contact});
   check(actual.handMin.every(y=>Math.abs(y-target[1]-.001)<.002),'actual hand surface contact',{...context,actual});check(actual.palmMin.every(y=>y-target[1]<.025),'palms lie flat just above textile',{...context,palms:actual.palmMin});
   check(actual.handPoint.every(p=>p&&p[0]>=surface.min.x&&p[0]<=surface.max.x&&p[2]>=surface.min.z&&p[2]<=surface.max.z),'contact remains on original textile',{...context,points:actual.handPoint});
   check(Object.keys(actual.intrusions).length===0,'body clears original bed and table textiles',{...context,intrusions:actual.intrusions});check(actual.bodyMin>floor-.01&&actual.shoeMin.every(y=>y>=floor&&y<floor+.012),'body and both soles supported',{...context,actual});
  }}
 }
 for(const [action,context]of [[null,{}],['read',{}],[null,{linenCare:{target:work.smooth.target,axis:'z'}}],['linen-care',{}],['linen-care',{linenCare:{target:[0,NaN,0],axis:'z'}}],['linen-care',{linenCare:{target:work.smooth.target,axis:'y'}}]]){a.animate(4,false,action,context);update(a);check(a.getPoseMetrics().linenCareContact===null,'exact action/context opt-in',{name:row.name,action});check(lengths(a).every((v,i)=>Math.abs(v-baseline[i])<1e-6),'exit limb recovery',{name:row.name,action});if(action==='linen-care')check(Object.values(a.root.userData.tools).every(p=>!p.visible),'invalid care has no prop',{name:row.name});}
 a.animate(4.1,true,'linen-care',{linenCare:{target:work.smooth.target,axis:'z'}});check(!a.getPoseMetrics().linenCareContact&&Object.values(a.root.userData.tools).every(p=>!p.visible),'walking releases linen contact',{name:row.name});
 report.cases.push({name:row.name,appearance:a.root.userData.appearance,frames});a.root.removeFromParent();a.dispose();
}
lot.group.updateMatrixWorld(true);for(const x of unchanged){check(x.mesh.parent&&x.mesh.geometry===x.geometry&&x.mesh.matrixWorld.equals(x.matrix),'original object remains in place',{});check(x.positions.every((v,i)=>v===x.geometry.attributes.position.array[i]),'original geometry unchanged',{});}
report.status=report.failures.length?'FAIL':'PASS';const output=process.env.BEDCHAMBER_CONTACT_REPORT||'/tmp/france-bedchamber-contact.json';fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,cases:report.cases.length,frames:report.cases.reduce((s,c)=>s+c.frames.length,0),routes:report.routes.length,failures:report.failures.slice(0,12),failureCount:report.failures.length,report:output,maxRSSMiB:process.resourceUsage().maxRSS/1024},null,2));assert.equal(report.failures.length,0);
