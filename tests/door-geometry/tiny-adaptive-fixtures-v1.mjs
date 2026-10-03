import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {K,rotateY,sweepTriangle,separationCertificate,sagitta} from './adaptive-rotation-kernel-v1.mjs';
const EPS=1e-7;
const box=(lo,hi)=>{const v=[[lo[0],lo[1],lo[2]],[hi[0],lo[1],lo[2]],[hi[0],hi[1],lo[2]],[lo[0],hi[1],lo[2]],[lo[0],lo[1],hi[2]],[hi[0],lo[1],hi[2]],[hi[0],hi[1],hi[2]],[lo[0],hi[1],hi[2]]],faces=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]];return faces.flatMap(([a,b,c,d])=>[[v[a],v[b],v[c]],[v[a],v[c],v[d]]]);};
const shifted=(mesh,x)=>mesh.map(t=>t.map(p=>[p[0]+x,p[1],p[2]]));
const rotating=(mesh,f)=>mesh.map(t=>rotateY(t,[0,0,0],f*Math.PI/2));
function actualOverlap(a,b){for(const t of a)for(const s of b){const c=K.triangleContact(t,s,EPS);if(c)return {kind:c.type};}for(const t of a)for(const p of t)if(K.cardinalContainment(p,()=>b,EPS).inside)return{kind:'forward-containment'};for(const t of b)for(const p of t)if(K.cardinalContainment(p,()=>a,EPS).inside)return{kind:'reverse-containment'};return null;}
function run(pose,obstacles,{linear=false,maxDepth=12}={}){
  // Same solid-level endpoint oracle as legacy, in both directions.
  const endpoints=[0,1].map(f=>({fraction:f,hit:actualOverlap(pose(f),obstacles)}));
  if(endpoints.some(x=>x.hit))return{status:'FAIL',endpoints,stats:{}};
  const base=pose(0),radius=Math.max(...base.flat().map(p=>Math.hypot(p[0],p[2]))),results=base.map((_,i)=>sweepTriangle({pose:f=>pose(f)[i],obstacles,radius,totalAngle:linear?0:Math.PI/2,eps:EPS,maxDepth}));
  const stats={};for(const r of results)for(const[k,v]of Object.entries(r.stats))stats[k]=(stats[k]||0)+v;
  return{status:results.some(r=>r.status==='FAIL')?'FAIL':results.some(r=>r.status==='REVIEW')?'REVIEW':'PASS',endpoints,stats};
}
function baselineSamples(pose,obstacles){for(let i=0;i<=100;i++){const hit=actualOverlap(pose(i/100),obstacles);if(hit)return{detected:true,fraction:i/100,kind:hit.kind};}return{detected:false};}
const tiny=box([-.1,-.12,-.09],[.1,.12,.09]);
const arm=box([0,-.08,-.045],[2,.08,.045]);
const needle=box([0,-.03,-.000001],[1.3,.03,.000001]),thinF=.505123,thinAngle=thinF*Math.PI/2,cx=Math.cos(thinAngle),cz=-Math.sin(thinAngle),thin=box([cx-.000002,-.02,cz-.000002],[cx+.000002,.02,cz+.000002]);
const fixtures=[
 {name:'translation-middle-only',pose:f=>shifted(tiny,-2+4*f),obstacles:box([-.013,-.11,-.08],[.013,.11,.08]),linear:true,want:'NONPASS',baselinePositive:true},
 {name:'forward-complete-containment',pose:f=>shifted(tiny,-.2+.4*f),obstacles:box([-2,-2,-2],[2,2,2]),linear:true,want:'NONPASS',baselinePositive:true},
 {name:'reverse-complete-containment',pose:f=>shifted(box([-2,-2,-2],[2,2,2]),-.2+.4*f),obstacles:tiny,linear:true,want:'NONPASS',baselinePositive:true},
 {name:'rotation-middle-only',pose:f=>rotating(arm,f),obstacles:box([1.10,-.06,-1.27],[1.27,.06,-1.10]),want:'NONPASS',baselinePositive:true},
 {name:'thin-obstacle-between-101-samples',pose:f=>rotating(needle,f),obstacles:thin,want:'NONPASS',baselinePositive:false,knownHit:thinF},
 {name:'clear-translation',pose:f=>shifted(tiny,-2+4*f),obstacles:box([-.1,.5,-.1],[.1,.7,.1]),linear:true,want:'PASS',baselinePositive:false},
 {name:'clear-rotation-over-floor',pose:f=>rotating(arm,f),obstacles:box([-3,-.2,-3],[3,-.10,3]),want:'PASS',baselinePositive:false},
 {name:'near-horizontal-gap-no-epsilon-waiver',pose:f=>rotating(arm,f),obstacles:box([-3,-.2,-3],[3,-.08-EPS/2,3]),want:'NONPASS',baselinePositive:true,maxDepth:3},
];
const rows=[];for(const fixture of fixtures){const baseline=baselineSamples(fixture.pose,fixture.obstacles);assert.equal(baseline.detected,fixture.baselinePositive,fixture.name+' baseline');if(fixture.knownHit!==undefined)assert(actualOverlap(fixture.pose(fixture.knownHit),fixture.obstacles),fixture.name+' actual known-time collision');const adaptive=run(fixture.pose,fixture.obstacles,fixture);assert.equal(adaptive.status==='PASS',fixture.want==='PASS',fixture.name);if(baseline.detected)assert.notEqual(adaptive.status,'PASS',fixture.name+' no lost actual baseline positive');rows.push({name:fixture.name,baseline101Poses:baseline,adaptive,knownHit:fixture.knownHit});}
// Entire obstacle triangle lies strictly inside a 3-D endpoint convex hull.
// Face-distance-only shortcuts can miss this case. Projection certificates
// cannot separate it, so no containment oracle on the hull is needed.
const a=[[0,0,0],[2,0,0],[0,2,0]],b=a.map(p=>[p[0],p[1],2]),inside=[[.2,.2,.5],[.3,.2,.5],[.2,.3,.5]];
assert.equal(separationCertificate(a,b,inside,0,EPS),null);
const containedSweep=sweepTriangle({pose:f=>a.map(p=>[p[0],p[1],2*f]),obstacles:[inside],radius:0,totalAngle:0,eps:EPS});assert.notEqual(containedSweep.status,'PASS_SURFACE_SEPARATION');
// Sampled regression for the ANALYTIC envelope theorem, not its proof.
let envelopeSamples=0;for(const span of[Math.PI/2,Math.PI/8,Math.PI/64])for(const triangle of[arm[0],arm[3],needle[0]]){const r=Math.max(...triangle.map(p=>Math.hypot(p[0],p[2]))),end=rotateY(triangle,[0,0,0],span),error=sagitta(r,span);for(let i=0;i<=100;i++){const t=i/100,theta=span*t,u=.5+Math.sin(theta-span/2)/(2*Math.sin(span/2)),actual=rotateY(triangle,[0,0,0],theta);for(let j=0;j<3;j++){const chord=K.add(K.mul(triangle[j],1-u),K.mul(end[j],u));assert(K.len(K.sub(actual[j],chord))<=error+1e-12);envelopeSamples++;}}}
// Bounded-work exhaustion cannot change uncertainty into a pass.
const exhaustion=sweepTriangle({pose:f=>rotating(needle,f)[0],obstacles:thin,radius:1.31,maxDepth:0,eps:EPS});assert.notEqual(exhaustion.status,'PASS_SURFACE_SEPARATION');
// A permitted midpoint alone must not retire forbidden neighboring contact.
const allowedMidpoint=sweepTriangle({pose:f=>[[f,0,0],[f,1,0],[f,0,1]],obstacles:[[[0,.2,.2],[1,.2,.2],[.5,.8,.2]]],radius:0,totalAngle:0,eps:EPS,onWitness:w=>({allowed:w.fraction===.5})});assert.notEqual(allowedMidpoint.status,'PASS_SURFACE_SEPARATION');
assert.throws(()=>sweepTriangle({pose:()=>a,obstacles:[],radius:1,maxDepth:NaN}),/Invalid adaptive work limits/);
const result={status:'PASS_TINY_FIXTURES_ONLY',sceneBuilt:false,sceneComparisonRun:false,rows,containedSweep,exhaustion,allowedMidpoint,envelopeSamples};const outputDirectory=process.env.QA_OUT?pathToFileURL(path.resolve(process.env.QA_OUT)+path.sep):new URL('../../qa/door-geometry/tiny/',import.meta.url);fs.mkdirSync(outputDirectory,{recursive:true});fs.writeFileSync(new URL('tiny-adaptive-fixtures-v1.json',outputDirectory),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,rows:rows.map(r=>({name:r.name,status:r.adaptive.status,nodes:r.adaptive.stats.nodes})),envelopeSamples},null,2));
