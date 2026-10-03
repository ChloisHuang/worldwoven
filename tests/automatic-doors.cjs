const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve('source'),cache=new Map();function mod(f){if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});cache.set(f,m);return m;}const linker=(s,f)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(f.identifier),s.split('?')[0]));
(async()=>{const m=mod(root+'/game/automatic-doors.js');await m.link(linker);await m.evaluate();const {createAutomaticDoors}=m.namespace,T=mod(root+'/vendor/three/build/three.module.js').namespace,{findPath}=mod(root+'/game/navigation.js').namespace;let crossings=0,steps=0;const openEdgeEvidence=[];
for(const style of['shoji','palace','french','egypt'])for(const axis of['x','z'])for(const direction of[-1,1]){
 const lot={group:new T.Group(),bounds:{minX:-30,maxX:30,minZ:-40,maxZ:40},automaticDoorways:[{id:'test',center:[0,0,0],width:3.2,height:2.8,axis,style,motion:style==='shoji'?'slide':'hinge',swing:direction}]},door=createAutomaticDoors(lot);
 const position=(normal,y=0)=>({x:axis==='z'?normal:0,y,z:axis==='x'?normal:0});
 const closed=position(.35);const stop=door.constrainMove(closed,axis==='z'?-.4:0,axis==='x'?-.4:0,.34);assert(Math.hypot(stop.dx,stop.dz)<.2,'closed leaves physically block crossing');
 door.update(.1,[position(0,4)]);assert.equal(door.getState()[0].fraction,0,'actor on another floor does not activate');
 const p=position(-direction*6);for(let f=0;f<200;f++){
  door.update(.025,[p]);const before={...p},delta=door.constrainMove(p,axis==='z'?direction*.13:0,axis==='x'?direction*.13:0,.34);p.x+=delta.dx;p.z+=delta.dz;steps++;
  assert(Math.hypot(p.x-before.x,p.z-before.z)>.01,'approaching actor never stalls at opening leaves');
  if((axis==='z'?p.x:p.z)*direction>6)break;
 }
 assert((axis==='z'?p.x:p.z)*direction>6,'continuous 5.2m/s crossing completed');crossings++;
 const center=position(0),other=position(-.5);for(let i=0;i<100;i++)door.update(.025,[{root:{position:center}},other]);assert.equal(door.getState()[0].fraction,1,'multiple actors in threshold hold open');
 door.update(.1,[]);assert.equal(door.getState()[0].fraction,1,'hold delay prevents immediate close');for(let i=0;i<90;i++)door.update(.025,[]);assert.equal(door.getState()[0].fraction,0,'clear threshold closes after hold');
 door.update(.016,[{root:{position:position(.2)}}]);assert.equal(door.getState()[0].fraction,1,'reentry from close proximity immediately safe');
 // Derive legal hinge lanes from the real fully-open conservative boxes. A
 // parked hinge occupies an edge strip; the nominal full width is a slide claim.
 const state=door.getState()[0],radius=.34,lAxis=axis==='x'?'X':'Z',nAxis=axis==='x'?'Z':'X',nominal=state.width/2-radius-.05,limits=[-nominal,nominal];
 const parked=door.planningColliders.filter(b=>b.maxY>.01&&b.minY<1.94);
 for(const b of parked){if(b['max'+lAxis]<0)limits[0]=Math.max(limits[0],b['max'+lAxis]+radius+.02);else if(b['min'+lAxis]>0)limits[1]=Math.min(limits[1],b['min'+lAxis]-radius-.02);else assert.fail('fully-open leaf blocks center of aperture');}
 assert(limits[0]<0&&limits[1]>0,'fully-open doorway retains a central passage');
 if(state.motion==='slide')assert.deepEqual(limits,[-nominal,nominal],'surface sliders preserve nominal aperture lanes');
 for(const lateral of limits){const edge=position(-1);if(axis==='x')edge.x=lateral;else edge.z=lateral;for(let i=0;i<80;i++){door.update(.016,[edge]);const d=door.constrainMove(edge,axis==='z'?.03:0,axis==='x'?.03:0,radius);edge.x+=d.dx;edge.z+=d.dz;}assert((axis==='x'?edge.z:edge.x)>1.3,'actual fully-open conservative lane crosses');}
 const oldLaneNegatives=[];
 if(state.motion==='hinge')for(const lateral of[-1.21,1.21]){
  const start=Math.min(-1,...parked.map(b=>b['min'+nAxis]-radius-.1)),goal=Math.max(1.4,...parked.map(b=>b['max'+nAxis]+radius+.1)),edge=position(start);if(axis==='x')edge.x=lateral;else edge.z=lateral;
  // Start clear of the complete parked leaf instead of restoring inside it.
  for(let i=0;i<Math.ceil((goal-start)/.03)+10;i++){const delta=door.constrainMove(edge,axis==='z'?.03:0,axis==='x'?.03:0,radius);edge.x+=delta.dx;edge.z+=delta.dz;}
  const final=axis==='x'?edge.z:edge.x;assert(final<goal-.1,'old +/-1.21 hinge lane remains a physical blocked negative');oldLaneNegatives.push({lateral,start,goal,final});
 }
 openEdgeEvidence.push({style,axis,direction,motion:state.motion,legalLanes:limits,oldLaneNegatives});
 const start=axis==='x'?{x:-2.3,y:0,z:-2.2}:{x:-2.2,y:0,z:-2.3},end=position(3.2),route=findPath(start,end,door.planningColliders,{bounds:lot.bounds,multilevel:false}),walker={...start};assert(route.length,'planner routes around open leaf side');
 for(const point of route){let frame=0;while(Math.hypot(point.x-walker.x,point.z-walker.z)>.015&&frame++<1000){door.update(.016,[walker]);const dx=point.x-walker.x,dz=point.z-walker.z,n=Math.hypot(dx,dz),a=Math.min(.04,n),delta=door.constrainMove(walker,dx/n*a,dz/n*a,.34);walker.x+=delta.dx;walker.z+=delta.dz;}assert(frame<1000,'route does not stall against open leaf');}
 assert(Math.hypot(walker.x-end.x,walker.z-end.z)<.03,'planned side approach physically reaches exit');
 let disposed=0;door.root.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>disposed++);});door.dispose();door.dispose();assert.equal(disposed,2,'two batched leaf geometries released once');assert.equal(door.cameraColliders.length,0);assert.equal(lot.group.children.length,0);
}
console.log(JSON.stringify({status:'PASS',crossings,movementSteps:steps,openEdgeEvidence,scope:'Actual moving leaf geometry, production collision function, proximity/anti-trap/lifecycle tests; not browser rendering'},null,2));})().catch(e=>{console.error(e);process.exit(1)});
