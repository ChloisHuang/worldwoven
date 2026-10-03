// Tiny production-geometry fixture: three real shoji dimensions, no authored lot.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('source'),cache=new Map();
function mod(f){
 if(cache.has(f))return cache.get(f);
 let source=fs.readFileSync(f,'utf8');
 if(f.endsWith('/automatic-doors.js'))source=source.replace('    get cameraColliders(){','    qaPose(f){for(const d of doors){d.fraction=f;poseDoor(d);publish(d,doorBoxes(d));}return doors;},\n    get cameraColliders(){');
 const m=new vm.SourceTextModule(source,{identifier:f});cache.set(f,m);return m;
}
const link=(s,m)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
async function load(file){const m=mod(root+'/game/'+file+'.js');if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} differs from ${b}`);
(async()=>{
 const {createAutomaticDoors}=await load('automatic-doors'),{addShojiJambReturns}=await load('japan-shoji'),{classifyRoomOpenings}=await load('room-closures'),G=await load('geometry'),N=await load('navigation'),C=await load('camera'),T=G.THREE,rows=[];
 const cases=[{id:'jp-guest-suite-door',x:2,z:-8,base:7.6,width:2.6,axis:'x',floorFit:{bottom:7.67,top:10.405,runningGap:.012}},{id:'jp-operator-door',x:-1,z:4.9,base:11.4,width:2.5,axis:'z'},{id:'jp-staff-room-door',x:-1,z:-10.5,base:11.4,width:2.4,axis:'z'}];
 for(const c of cases){
  const group=new T.Group(),f=new T.Group();f.position.y=c.base;group.add(f);
  const point=(l,n,y=c.base)=>new T.Vector3(c.x+(c.axis==='x'?l:n),y,c.z+(c.axis==='x'?n:l));
  const threshold={id:c.id,width:c.width,height:2.85,a:point(0,.9).toArray(),b:point(0,-.9).toArray(),...(c.floorFit?{floorFit:c.floorFit}:{})};
  const lot={group,colliders:[],cameraColliders:[],bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},doorways:[threshold]};
  const spec=classifyRoomOpenings(lot,'japan')[0];near(spec.sideOverlap,.10);near(spec.trackMountOffset,.30);
  const returns=new T.Group();f.add(returns);addShojiJambReturns(returns,c.base,c.x,c.z,c.width,c.axis,lot.colliders,lot.cameraColliders);
  assert.equal(lot.colliders.length,2);assert.deepEqual(lot.colliders,lot.cameraColliders);
  group.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const b=new T.Box3().setFromObject(returns.children[i]),v=lot.colliders[i];
   for(const a of['x','y','z']){near(b.min[a],v['min'+a.toUpperCase()]);near(b.max[a],v['max'+a.toUpperCase()]);}
   const n=c.axis==='x'?'z':'x',l=c.axis==='x'?'x':'z',wall=c.axis==='x'?c.z:c.x,center=c.axis==='x'?c.x:c.z;
   near(b.min[n]-wall,-.04);near(b.max[n]-wall,.145);
   near(Math.min(Math.abs(b.min[l]-center),Math.abs(b.max[l]-center)),c.width/2+.006);
   assert(Math.min(Math.abs(b.min[l]-center),Math.abs(b.max[l]-center))>c.width/2+.0059,'return remains outside full aperture and6mm beyond coplanar wall side face');
   assert(N.blocked((v.minX+v.maxX)/2,(v.minZ+v.maxZ)/2,lot.colliders,.02,{multilevel:false,y:c.base,bodyHeight:1.95}),'return blocks bodies/planner');
  }
  // Adjacent .24m authored walls prove the returns are joined, not floating.
  for(const side of[-1,1]){
   const p=point(side*(c.width/2+1),0,c.base+1.8);
   G.box(f,p.x,1.8,p.z,c.axis==='x'?2:.24,3.6,c.axis==='x'?.24:2,0xe6d7b2);
   const w={minX:p.x-(c.axis==='x'?1:.12),maxX:p.x+(c.axis==='x'?1:.12),minY:c.base,maxY:c.base+3.6,minZ:p.z-(c.axis==='x'?.12:1),maxZ:p.z+(c.axis==='x'?.12:1)};lot.colliders.push(w);lot.cameraColliders.push({...w});
  }
  const api=createAutomaticDoors(lot,'japan'),d=api.qaPose(0)[0],closed=d.leaves.map(l=>new T.Box3().setFromObject(l.mesh));
  const lateral=c.axis==='x'?'x':'z',normal=c.axis==='x'?'z':'x',lc=d.center[c.axis==='x'?0:2],nc=d.center[c.axis==='x'?2:0];
  const ranges=closed.map(b=>[b.min[lateral]-lc,b.max[lateral]-lc]).sort((a,b)=>a[0]-b[0]);
  near(ranges[0][1],-.006);near(ranges[1][0],.006);near(ranges[1][1],c.width/2+.094);
  assert(d.leaves.every(l=>l.mesh.userData.twoSidedDecoration&&l.mesh.userData.frontDetailMeshes&&l.mesh.userData.backDetailMeshes));
  let rays=0,returnHits=0;
  const privacyRays=()=>{
   let misses=0;group.updateMatrixWorld(true);
   for(const side of[-1,1])for(const edge of[-1,1])for(const h of[.35,.5,1.0,1.55,2.5])for(let inset=.002;inset<.18;inset+=.006){
    const eye=point(0,.30+side*2.4,spec.center[1]+1.55),target=point(edge*(c.width/2-inset),0,c.base+h),dir=target.clone().sub(eye).normalize();
    const hits=new T.Raycaster(eye,dir,.001,6).intersectObject(group,true);rays++;if(!hits.length)misses++;else if(hits[0].object.parent===returns)returnHits++;
   }
   return misses;
  };
  assert.equal(privacyRays(),0,'closed side edges hide the far room from the unchanged +/-2.4m eye positions');
  // Deliberately restore the defect in memory: same cameras must expose it.
  returns.visible=false;const old=api.root;old.visible=false;
  const baseline=createAutomaticDoors({group,colliders:[],bounds:lot.bounds,automaticDoorways:[{...spec,sideOverlap:0}]});
  // Raycaster ignores visibility, so detach only for this negative fixture.
  returns.removeFromParent();old.removeFromParent();const negativeMisses=privacyRays();assert(negativeMisses>0,'baseline side reveal is detected');
  baseline.dispose();f.add(returns);returns.visible=true;group.add(old);old.visible=true;
  const fixed=d.group.children.filter(o=>o.isMesh),fixedBounds=fixed.map(o=>new T.Box3().setFromObject(o));assert.equal(fixed.length,3);
  api.qaPose(0);const startMatrices=d.leaves.map(l=>[...l.mesh.matrixWorld.elements]);api.qaPose(1);const endMatrices=d.leaves.map(l=>[...l.mesh.matrixWorld.elements]);
  let minimumReturnGap=Infinity,minimumFixedTrackGap=Infinity;
  for(let k=0;k<=100;k++){
   api.qaPose(k/100);
   for(const [i,l]of d.leaves.entries()){
    l.mesh.matrixWorld.elements.forEach((v,j)=>assert(Math.abs(v-(startMatrices[i][j]+k/100*(endMatrices[i][j]-startMatrices[i][j])))<1e-12,'every world-transform coefficient remains affine over the complete stroke'));
    const b=new T.Box3().setFromObject(l.mesh);
    for(const r of lot.colliders.slice(0,2)){
     const gap=b.min[normal]-r['max'+normal.toUpperCase()];assert(gap>.0524,'real leaf sweep clears joined returns');minimumReturnGap=Math.min(minimumReturnGap,gap);
    }
    for(const support of fixedBounds){const gap=b.min[normal]-support.max[normal];assert(gap>.0074,'actual fixed guide and brackets remain separated from the complete leaf bounds');minimumFixedTrackGap=Math.min(minimumFixedTrackGap,gap);}
   }
   for(const b of api.cameraColliders.slice(0,2))for(const r of lot.colliders.slice(0,2))assert(b['min'+normal.toUpperCase()]-r['max'+normal.toUpperCase()]>.0049,'conservative moving boxes clear fixed returns');
  }
  const open=d.leaves.map(l=>new T.Box3().setFromObject(l.mesh)),openInner=open.map(b=>Math.min(Math.abs(b.min[lateral]-lc),Math.abs(b.max[lateral]-lc)));openInner.forEach(v=>near(v,c.width/2+.086));
  const options={bounds:lot.bounds,multilevel:false,bodyHeight:1.95,cache:false};let crossings=0;
  for(const radius of[.25,.34])for(const side of[-1,1])for(const lane of[-1,0,1]){
   const offset=lane*(c.width/2-radius-.025),p=point(offset,-1.2,c.base),end=point(offset,1.2,c.base);if(side<0){const z=p.clone();p.copy(end);end.copy(z);}
   const route=api.planPath(p,end,{...options,radius,pathRadius:radius},radius);assert(route.length,'planner preserves edge lanes');
   for(let frame=0;frame<120;frame++){
    const n=end.clone().sub(p),length=Math.hypot(n.x,n.z);if(length<.003)break;const step=Math.min(.04,length),delta=api.constrainMove(p,n.x/length*step,n.z/length*step,radius);N.moveWithCollision(p,delta.dx,delta.dz,lot.colliders,radius,options);
   }
   assert(p.distanceTo(end)<.003,'full-width lane crosses with real body collision');crossings++;
  }
  const camBoxes=C.buildCameraSolids(lot);for(const r of lot.colliders.slice(0,2))assert(camBoxes.some(b=>JSON.stringify(b)===JSON.stringify(r)),'camera receives the same return bounds');
  const guide=fixedBounds[fixed.findIndex(o=>o.name==='Surface-mounted timber sliding guide')];for(const b of open)assert(guide.min[lateral]<b.min[lateral]&&guide.max[lateral]>b.max[lateral],'extended guide covers the complete parked leaf');
  rows.push({id:c.id,axis:c.axis,width:c.width,closedCenterSeam:.012,outerOverlap:.094,openEdgeClearance:.086,rays,returnHits,negativeMisses,minimumReturnGap,minimumFixedTrackGap,crossings,poses:101});
  api.dispose();group.traverse(o=>o.geometry?.dispose());
 }
 console.log(JSON.stringify({status:'PASS',authoredSceneBuilt:false,scope:'Exact production return/leaf geometry, unchanged-view side rays with failing baseline, joined body/planner/camera registration, affine sweep separation and full-width edge crossings; authored-world collisions and rendered pixels remain separate gates',rows},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
