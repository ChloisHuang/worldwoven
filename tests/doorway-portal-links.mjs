import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {findPath as findR14Path,canTraverse as canTraverseR14} from './fixtures/r14-navigation-baseline.mjs';
import {createAutomaticRouting} from '../source/game/automatic-routing.js';
import {blocked,canTraverse,findPath} from '../source/game/navigation.js';

// Byte-exact published R14 navigation, copied read-only from the release
// source. Differential queries prove which unchanged coarse branch ran.
const baselineSha256='61467e65ab34c23b8284d0061d8fade5faa0da35c5d70ccf5120ef596c8e9665';
assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/r14-navigation-baseline.mjs',import.meta.url))).digest('hex'),baselineSha256,'published R14 baseline remains immutable');

// Pure collider/support fixtures. No Three.js, authored lot, or renderer.
// Mirrors a1.35m opening narrowed by fully parked leaves to1.01m. Translation
// must not change access when the0.5m coarse grid misses the0.23m planning lane.
function fixture(shift,axis='x',{gap=1.01,sealed=false,upperFloor=false,empty=false}={}){
 const transform=(x,z,y=0)=>axis==='x'?{x:x+shift,y,z}:{x:z,y,z:x+shift};
 const box=(x0,x1,z0,z1)=>{const a=transform(x0,z0),b=transform(x1,z1);return {minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z),minY:0,maxY:2.8};};
 const colliders=[box(-8,-.675,-.15,.15),box(.675,8,-.15,.15),box(-1.25,-1.05,-2.2,-.15),box(1.05,1.25,-2.2,-.15),box(-1.25,1.25,-2.3,-2.1)];
 if(!empty)colliders.push(box(-.4,.4,-2.1,-1.55));
 if(sealed)colliders.push(box(-.675,.675,-.2,.2));
 const leaves=[box(-gap/2-.3,-gap/2,-1.04,-.18),box(gap/2,gap/2+.3,-1.04,-.18)],center=transform(0,0),d={id:'translated-cubicle',axis,center:[center.x,0,center.z],width:1.35,height:2.8,fraction:1,boxes:leaves,openBoxes:leaves,motion:'hinge',swing:1};
 const bounds=axis==='x'?{minX:shift-8,maxX:shift+8,minZ:-8,maxZ:8}:{minX:-8,maxX:8,minZ:shift-8,maxZ:shift+8},surfaces=[{...bounds,y:0}];if(upperFloor)surfaces.push({...bounds,y:3});
 const options={bounds,surfaces,legacyGround:false,gridStep:.5,pathRadius:.39,bodyHeight:1.95},all=colliders.concat(leaves),router=createAutomaticRouting({doors:[d],staticColliders:colliders,planningColliders:leaves,getSweepBoxes:()=>leaves,requestOpen:()=>{},getVersion:()=>0});
 return {transform,options,all,router};
}
const diagnosticEvidence=[];
// The previous fixture conflated an unchanged actor-radius endpoint connector
// with a new portal edge. This exact translated connector demonstrates why the
// two contracts differ, using both the immutable R14 and candidate functions.
{
 const f=fixture(.15),from=f.transform(-.15,.5),to=f.transform(0,-.8);
 for(const radius of [.34,.25]){
  const actor=canTraverseR14(from,to,f.all,{...f.options,radius}),planning=canTraverseR14(from,to,f.all,{...f.options,radius:.39});
  assert(actor,'published R14 connector is clear at actual actor radius');assert(!planning,'same unchanged connector need not have .39 endpoint clearance');
  assert.equal(canTraverse(from,to,f.all,{...f.options,radius}),actor,'candidate collision result matches published R14');
  assert.equal(canTraverse(from,to,f.all,{...f.options,radius:.39}),planning,'candidate planning-radius result matches published R14');
  diagnosticEvidence.push({from,to,radius,originalActorClear:actor,originalPlanningClear:planning});
 }
 f.router.dispose();
}
const successes=[];let portalBranches=0,unchangedCoarseBranches=0;
for(const axis of ['x','z'])for(const shift of [0,.15,.25])for(const radius of [.34,.25]){
 const f=fixture(shift,axis),inside=f.transform(0,-.8),near=f.transform(0,.8),far=f.transform(4,6);
 for(const [name,start,end] of [['near-in',near,inside],['near-out',inside,near],['distant-in',far,inside],['distant-out',inside,far]]){
  const label=`${axis}/${shift}/${radius}/${name}`,baseline=findR14Path(start,end,f.all,{...f.options,radius}),coarse=findPath(start,end,f.all,{...f.options,radius});
  assert.deepEqual(coarse,baseline,label+' no-portals route remains byte-for-byte equivalent to published R14');
  const last=baseline.at(-1),baselineComplete=!!last&&Math.hypot(last.x-end.x,last.z-end.z)<=.03&&Math.abs((last.y??start.y)-end.y)<=(f.options.floorTolerance??.22);
  const originalEdges=baseline.map((to,i)=>{const from=i?baseline[i-1]:start;return {from,to,actorClear:canTraverseR14(from,to,f.all,{...f.options,radius}),planningClear:canTraverseR14(from,to,f.all,{...f.options,radius:.39})};});
  const route=f.router.planPath(start,end,f.options,radius);assert(route.length,label+' route');
  assert(Math.hypot(route.at(-1).x-end.x,route.at(-1).z-end.z)<.025,label+' original click endpoint retained');
  assert.deepEqual(f.router.getRouteState(route).target,end,label+' request target is unchanged');
  if(baselineComplete){assert.deepEqual(route,baseline,label+' complete published coarse route must not be replaced');unchangedCoarseBranches++;}else portalBranches++;
  let previous=start;
  for(let i=0;i<route.length;i++){
   const next=route[i],edge={from:previous,to:next},context=label+' '+JSON.stringify(edge);
   assert(canTraverse(previous,next,f.all,{...f.options,radius}),context+' actual actor/body/support clearance');
   // Only an unchanged baseline's first/last endpoint connectors retain its
   // intentional min(pathRadius,actorRadius) allowance. All its interior grid
   // edges, and EVERY edge of a new portal route, require the original .39.
   if(!baselineComplete||(i>0&&i<route.length-1))assert(canTraverse(previous,next,f.all,{...f.options,radius:.39}),context+' unchanged .39 core/portal visibility clearance');
   previous=next;
  }
  assert.equal(f.options.gridStep,.5,'global grid is unchanged');
  const saved=route.map(p=>({...p}));route[0].x+=100;const again=f.router.planPath(start,end,f.options,radius);assert.deepEqual(again,saved,'cached portal routes return independent copies');
  successes.push({axis,shift,radius,name,nodes:saved.length,branch:baselineComplete?'unchanged-published-coarse':'new-portal',baselineComplete,originalEndpointEvidence:originalEdges.filter((_,i)=>i===0||i===originalEdges.length-1)});
 }
 // The unshifted original cubicle remains a coarse-grid success.
 if(shift===0){const coarse=findR14Path(near,inside,f.all,{...f.options,radius});assert(coarse.length&&Math.hypot(coarse.at(-1).x-inside.x,coarse.at(-1).z-inside.z)<.025,'first cubicle regression');}
 f.router.dispose();
}
assert(portalBranches>0,'translated fixtures must actually exercise new portal links');
assert(unchangedCoarseBranches>0,'fixtures must retain unchanged complete published routes');
const negatives=[];
for(const radius of [.34,.25])for(const scenario of ['too-narrow','obstacle','wrong-floor']){
 const f=fixture(.25,'x',{gap:scenario==='too-narrow'?.45:1.01,sealed:scenario==='obstacle',upperFloor:scenario==='wrong-floor',empty:scenario==='too-narrow'}),outside=f.transform(4,6),inside=f.transform(0,scenario==='too-narrow'?-1.6:-.8,scenario==='wrong-floor'?3:0);
 assert(!blocked(outside.x,outside.z,f.all,radius,{...f.options,y:outside.y}),'negative starts at a legal supported point');
 assert(!blocked(inside.x,inside.z,f.all,radius,{...f.options,y:inside.y}),'negative target itself remains legal and supported');
 assert.deepEqual(f.router.planPath(outside,inside,f.options,radius),[],`${scenario} must not gain an unsupported or collider-crossing link`);
 if(scenario!=='wrong-floor')assert.deepEqual(f.router.planPath(inside,outside,f.options,radius),[],`${scenario} reverse must remain blocked`);
 negatives.push({radius,scenario});f.router.dispose();
}
console.log(JSON.stringify({status:'PASS',scope:'Pure sparse-portal planning fixtures, no authored scenes; 0/.15/.25 translation, nearby and distant both directions, radii.34/.25 with pathRadius.39, first cubicle and negative controls',baselineSha256,diagnosticEvidence,portalBranches,unchangedCoarseBranches,successes,negatives},null,2));
