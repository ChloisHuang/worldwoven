/** Attached court caps must enclose the actual saved hair without changing
 * shared character geometry or treating open consort ornaments as closed hats. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';
const sourceRoot=process.env.SOURCE_ROOT??process.cwd();registerHooks({resolve(s,c,next){if(s==='./costume-headgear-fit.js'&&c.parentURL?.endsWith('/complete-adult/attachment-fit.js'))return{url:new URL('../source/game/complete-adult/costume-headgear-fit.js',import.meta.url).href,shortCircuit:true};return s==='three'?{url:pathToFileURL(path.resolve(sourceRoot,'source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const load=p=>import(pathToFileURL(path.resolve(sourceRoot,'source/game/'+p+'.js')).href),T=await import('three'),C=await load('characters');await load('character-live-entry');
const {BODY_PRESETS,HAIR_STYLES,npcRoleAppearance}=await load('appearance'),{courtOfficialAppearance}=await load('china-palace-audience'),{CHINA_CONSORTS}=await load('china-palace-residents');
const {attachCourtOfficialCostume}=await load('china-court-official-costume'),{attachJinyiCostume}=await load('jinyi-costume'),{attachPalaceCostume}=await load('china-palace-costume');
const {fitCompleteAdultCostumeHeadgear}=await import('../source/game/complete-adult/costume-headgear-fit.js');
const specs=[{kind:'official',name:'Original civil official black winged cap',shell:'court-official-rounded-black-crown',wardrobe:'court-official-long-robe',attach:attachCourtOfficialCostume},{kind:'jinyi',name:'Original Ming folded black duty cap',shell:'jinyi-folded-crown',wardrobe:'jinyi-training',attach:attachJinyiCostume},{kind:'emperor',name:'Original palace emperor court ornaments',shell:'black everyday yishan cap',wardrobe:'palace-emperor-robe',attach:attachPalaceCostume}];
function toRest(group,mesh){const chain=[];for(let node=mesh;node&&node!==group.parent;node=node.parent)chain.push(node);const m=new T.Matrix4().makeTranslation(0,1.455,0);for(const node of chain.reverse()){node.updateMatrix();m.multiply(node.matrix);}return m;}
function shellEnvelope(group,spec){let shell;group.traverse(m=>{if(m.name===spec.shell||m.userData.originalParts?.includes(spec.shell))shell=m;});assert(shell);const matrix=toRest(group,shell),p=shell.geometry.attributes.position,ix=shell.geometry.index,vertices=Array.from({length:p.count},(_,i)=>new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix)),triangles=[];let low=Infinity,high=-Infinity;
 for(const v of vertices){low=Math.min(low,v.y);high=Math.max(high,v.y);}for(let j=0;j<ix.count;j+=3){const q=[0,1,2].map(k=>vertices[ix.getX(j+k)]);triangles.push({q,low:Math.min(...q.map(p=>p.y)),high:Math.max(...q.map(p=>p.y))});}
 const ray=new T.Ray(),hit=new T.Vector3();return{low,high,clearance(q){const radius=Math.hypot(q.x,q.z+.025);if(radius<1e-8)return Infinity;ray.origin.set(0,q.y,-.025);ray.direction.set(q.x/radius+1e-8,0,(q.z+.025)/radius).normalize();let surface=-Infinity;
  for(const t of triangles)if(q.y>=t.low&&q.y<=t.high&&ray.intersectTriangle(...t.q,false,hit))surface=Math.max(surface,hit.distanceTo(ray.origin));assert(Number.isFinite(surface),'cap enclosure must exist at protected hair height');return surface-radius;
 }};
}
function verify(actor,group,spec){const envelope=shellEnvelope(group,spec),v=new T.Vector3(),look=actor.root.userData.appearance,dense=spec.kind==='emperor'&&look.bodyPreset.startsWith('feminine')&&look.hairStyle==='side-part';let worst=Infinity,samples=0;
 actor.root.traverse(m=>{if(!m.isSkinnedMesh)return;const g=m.geometry,p=g.attributes.position,ix=g.index;for(const r of g.userData.sourceRanges){if(!/^(hair-|continuous-head-anatomical-)/.test(r.name))continue;
  const sample=q=>{if(q.y<=envelope.low+.001||q.y>=envelope.high-.001)return;worst=Math.min(worst,envelope.clearance(q));samples++;};
  for(let i=r.start;i<r.start+r.count;i++)sample(v.fromBufferAttribute(p,i));
  // Coarse cap triangles can miss a lock's interior even when its vertices
  // fit. Check the actual indexed hair/skin triangle centroids as well.
  for(let j=r.indexStart;j<r.indexStart+r.indexCount;j+=3){v.set(0,0,0);for(let k=0;k<3;k++){const i=ix.getX(j+k);v.x+=p.getX(i)/3;v.y+=p.getY(i)/3;v.z+=p.getZ(i)/3;}sample(v);
   // Fixed reviewer reproducer: both feminine side parts crossed the emperor
   // cap at a one-third hair edge, between the original sampled midpoints.
   // Keep this six-division grid unchanged; it is not runtime work or an
   // indefinitely increasing art/geometry sampling framework.
   if(dense){const ids=[ix.getX(j),ix.getX(j+1),ix.getX(j+2)];for(let a=0;a<=6;a++)for(let b=0;b<=6-a;b++){const w=[a/6,b/6,(6-a-b)/6];v.set(0,0,0);for(let k=0;k<3;k++){v.x+=p.getX(ids[k])*w[k];v.y+=p.getY(ids[k])*w[k];v.z+=p.getZ(ids[k])*w[k];}sample(v);}}
  }
 }});assert(samples>0);if(dense)assert(worst>=0,'Known one-third-edge family must have a real positive gap');assert(worst>=-.0002,JSON.stringify({spec:spec.kind,appearance:actor.root.userData.appearance,worst,samples}));return{worst,samples};}
function snapshot(actor){const values=[];actor.root.traverse(m=>{if(m.isSkinnedMesh)values.push({mesh:m,geometry:m.geometry,position:m.geometry.attributes.position.array.slice(),normal:m.geometry.attributes.normal.array.slice()});});return values;}
function unchanged(before){for(const b of before){assert.equal(b.mesh.geometry,b.geometry);assert.deepEqual(b.geometry.attributes.position.array,b.position);assert.deepEqual(b.geometry.attributes.normal.array,b.normal);}}
const results=[];let samples=0,minimum=Infinity,maximumPush=0;
const cases=[];for(const spec of specs)for(const bodyPreset of BODY_PRESETS)for(const hairStyle of HAIR_STYLES)cases.push({spec,options:{culture:'china',style:'casual',bodyPreset,hairStyle,wardrobePreset:spec.wardrobe,hair:0x754b31,skin:0xbe9a74,clothes:0x766078,accent:0xc6ab67,eyeColor:0x493525}});
// Original failing resident, including the real seed-41 legacy six traits.
cases.push({spec:specs[0],options:{...courtOfficialAppearance('china','cn-official-records',npcRoleAppearance('china','cn-official-records',41,1)),culture:'china',scale:.96},id:'cn-official-records'});
for(const {spec,options,id}of cases){const actor=C.createCharacter(options),before=snapshot(actor),identity=JSON.stringify(actor.root.userData.appearance),fitBefore=JSON.stringify(actor.root.userData.characterModel.attachmentFit);assert(actor.root.userData.characterModel.applied);actor.station={royalRole:spec.kind==='emperor'?'emperor':undefined};const handle=spec.attach(actor),group=actor.root.getObjectByName(spec.name);assert(group);
 const fit=fitCompleteAdultCostumeHeadgear(actor,group);assert(fit.applied);assert.equal(fitCompleteAdultCostumeHeadgear(actor,group),fit);assert.equal(JSON.stringify(actor.root.userData.characterModel.attachmentFit),fitBefore,'per-actor diagnosis must not mutate shared template fit');assert.equal(JSON.stringify(actor.root.userData.appearance),identity);unchanged(before);
 const contact=verify(actor,group,spec);samples+=contact.samples;minimum=Math.min(minimum,contact.worst);maximumPush=Math.max(maximumPush,fit.maximumPush);assert(fit.maximumPush<.065,'bounded local fit, not an inflated whole costume');assert.deepEqual(JSON.parse(JSON.stringify(fit)),fit);
 results.push({kind:spec.kind,id,body:options.bodyPreset,hair:options.hairStyle,...fit,verifiedMinimum:contact.worst});handle.dispose();actor.dispose();
}
const ornamentResults=[];for(const resident of CHINA_CONSORTS){const actor=C.createCharacter({...npcRoleAppearance('china',resident.id,41,1),culture:'china'});actor.station={...resident};const handle=attachPalaceCostume(actor),group=actor.root.userData.palaceCostume,before=[];group.traverse(m=>{if(m.isMesh)before.push([m,m.geometry.attributes.position.array.slice()]);});const result=fitCompleteAdultCostumeHeadgear(actor,group);assert.equal(result.applied,false);for(const [m,p]of before)assert.deepEqual(m.geometry.attributes.position.array,p);ornamentResults.push({id:resident.id,reason:result.reason});handle.dispose();actor.dispose();}
assert.equal(C.characterResourceStats().activeReferences,0);console.log(JSON.stringify({status:'PASS',cases:results.length,minimum,samples,maximumPush,ornamentResults,results,scope:'Actual live-entry merged hair, private official/Jinyi/emperor caps, all bodies/cuts and original failing resident; consort ornaments untouched. No browser or art-acceptance claim.'},null,2));
