import assert from 'node:assert/strict';
import {createAutomaticRouting} from '../source/game/automatic-routing.js';

// Pure routing fixtures: actual live leaf Y bounds, with no scene construction.
// Every closure carries the same kind label, so kind cannot determine clearance.
const cases=[
 {name:'overhead default body',feet:0,minY:2.35,maxY:3,wait:false},
 {name:'above entire leaf',feet:.5,minY:0,maxY:.3,wait:false},
 {name:'raised feet meet overhead curtain',feet:.5,minY:2.35,maxY:3,wait:true},
 {name:'short body fits below leaf',feet:0,height:1.4,minY:1.6,maxY:3,wait:false},
 {name:'tall body meets overhead leaf',feet:0,height:2.6,minY:2.35,maxY:3,wait:true},
 {name:'head exactly touches leaf bottom',feet:0,height:2.35,minY:2.35,maxY:3,wait:false},
 {name:'feet exactly touch leaf top',feet:.5,minY:0,maxY:.5,wait:false},
 {name:'ordinary full-height closure still waits',feet:0,minY:0,maxY:3,wait:true}
];
for(const c of cases){
 const boxes=[{minX:-1.6,maxX:0,minZ:-.15,maxZ:.15,minY:c.minY,maxY:c.maxY},{minX:0,maxX:1.6,minZ:-.15,maxZ:.15,minY:c.minY,maxY:c.maxY}],d={id:c.name,kind:'half-curtain',axis:'x',center:[0,0,0],width:3.2,fraction:0,motion:'gather',boxes};let requests=0;
 const router=createAutomaticRouting({doors:[d],staticColliders:[],planningColliders:[],getSweepBoxes:()=>boxes,requestOpen:()=>requests++,getVersion:()=>0}),options={bounds:{minX:-5,maxX:5,minZ:-5,maxZ:5},surfaces:[{minX:-5,maxX:5,minZ:-5,maxZ:5,y:c.feet}],legacyGround:false,...(c.height===undefined?{}:{bodyHeight:c.height})},start={x:0,y:c.feet,z:-.9},target={x:0,y:c.feet,z:.9},route=router.planPath(start,target,options,.34);
 assert(route.length,c.name+' route exists');const step=router.routeStep(route,start,.008);
 assert.equal(step.waiting,c.wait,c.name);assert.equal(requests>0,c.wait,c.name+' requests only when live leaves intersect body');assert.equal(step.phase,c.wait?'waiting':'walking',c.name+' phase');assert.deepEqual(router.getRouteState(route).target,target);router.dispose();
}
console.log(JSON.stringify({status:'PASS',scope:'Pure production automatic-routing live-leaf vertical clearance',cases:cases.map(c=>c.name)}));
