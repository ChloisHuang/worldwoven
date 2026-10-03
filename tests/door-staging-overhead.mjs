import assert from 'node:assert/strict';
import {createAutomaticRouting} from '../source/game/automatic-routing.js';
// Routing-only support fixtures. Actual rendered sweeps are a separate gate.
for(const axis of ['x','z'])for(const rise of[-1,1]){
 const at=rise<0?0:12,normal=rise<0?2.3:9.7,side=rise<0?1:-1;
 const pos=(u,y=0)=>axis==='x'?{x:0,y,z:u}:{x:u,y,z:0};
 const prism=(lo,hi)=>axis==='x'?{minX:-1.6,maxX:1.6,minY:0,maxY:3,minZ:lo,maxZ:hi}:{minX:lo,maxX:hi,minY:0,maxY:3,minZ:-1.6,maxZ:1.6};
 const d={id:'under-high-flight-'+axis+rise,axis,center:axis==='x'?[0,0,at]:[at,0,0],width:3.2,motion:'hinge',swing:side,fraction:0,boxes:[prism(at-.06,at+.06)]};
 let version=0,requested=0;
 const opts={bounds:{minX:-15,maxX:15,minZ:-15,maxZ:15},surfaces:[{minX:-15,maxX:15,minZ:-15,maxZ:15,y:0},axis==='x'?{minX:-1,maxX:1,minZ:1,maxZ:11,axis:'z',y:rise<0?3:0,endY:rise<0?0:3}:{minX:1,maxX:11,minZ:-1,maxZ:1,axis:'x',y:rise<0?3:0,endY:rise<0?0:3}],legacyGround:false,maxStep:.4,bodyHeight:1.95};
 const sweep=[side>0?prism(at-1.7,at+.1):prism(at-.1,at+1.7)];
 const router=createAutomaticRouting({doors:[d],staticColliders:[],planningColliders:[],getSweepBoxes:()=>sweep,requestOpen:()=>requested++,getVersion:()=>version});
 const p=pos(normal),end=pos(at-side*1),route=router.planPath(p,end,opts,.34),first=router.routeStep(route,p,.01);
 assert.equal(first.phase,'waiting','High flight cannot erase walkable ground: '+d.id);assert.deepEqual(router.getRouteState(route).waitPoint,p);assert(requested);
 d.fraction=1;d.boxes=[];version++;const next=router.routeStep(route,p,.01);assert.equal(next.phase,'walking');assert(next.waypoint);assert.equal(next.waiting,false);
 router.dispose();console.log('PASS',d.id,'high-flight ground wait and open rejoin');
}
