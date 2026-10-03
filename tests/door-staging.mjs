import assert from 'node:assert/strict';
import {createAutomaticRouting} from '../source/game/automatic-routing.js';
import {moveWithCollision} from '../source/game/navigation.js';
function boxes(d,f){const a=f*Math.PI/2,c=Math.cos(a),s=Math.sin(a),w=d.width/2-.012,hx=w/2*c+.15*s,hz=w/2*s+.15*c;return [-1,1].map(side=>{const x=side*(d.width/2+.16-(d.width/4+.16)*c),z=d.center[2]-d.swing*(d.width/4+.16)*s;return {minX:x-hx,maxX:x+hx,minZ:z-hz,maxZ:z+hz,minY:d.center[1],maxY:d.center[1]+4.315};});}
const union=(a,b)=>Object.fromEntries(Object.keys(a).map(k=>[k,k.startsWith('min')?Math.min(a[k],b[k]):Math.max(a[k],b[k])]));
const hit=(p,b,r)=>p.x>b.minX-r&&p.x<b.maxX+r&&p.z>b.minZ-r&&p.z<b.maxZ+r&&p.y<b.maxY&&p.y+1.95>b.minY;
for(const radius of [.34,.25])for(const hz of [20,60,144,240]){
 const d={id:'hall',axis:'x',center:[0,1.415,5],width:6,swing:1,motion:'hinge',fraction:0};d.boxes=boxes(d,0);const sweep=[];for(let i=1;i<=50;i++)boxes(d,i/50).forEach((b,j)=>sweep.push(union(b,boxes(d,(i-1)/50)[j])));
 let requested=false,version=0;const router=createAutomaticRouting({doors:[d],staticColliders:[],planningColliders:boxes(d,1),getSweepBoxes:()=>sweep,requestOpen:()=>{requested=true},getVersion:()=>version}),options={bounds:{minX:-8,maxX:8,minZ:-4,maxZ:9},surfaces:[{minX:-8,maxX:8,minZ:-4,maxZ:9,y:1.415}],legacyGround:false},p={x:0,y:1.415,z:4.15},end={x:0,y:1.415,z:5.85},route=router.planPath(p,end,options,radius),phases=new Set();
 for(let tick=0;tick<hz*10&&route.length;tick++){
  if(requested){const desired=Math.min(1,d.fraction+1/hz/.48),steps=Math.max(1,Math.ceil((desired-d.fraction)/.02)),delta=(desired-d.fraction)/steps;for(let i=0;i<steps;i++){const next=boxes(d,d.fraction+delta);if(next.some((b,j)=>hit(p,union(b,d.boxes[j]),radius)))break;d.fraction+=delta;d.boxes=next;version++;}}
  const step=router.routeStep(route,p,.008);phases.add(step.phase);if(step.waypoint&&!step.waiting){const dx=step.waypoint.x-p.x,dz=step.waypoint.z-p.z,dist=Math.hypot(dx,dz),n=Math.min(2.5/hz,dist),old={...p};moveWithCollision(p,dx/dist*n,dz/dist*n,d.boxes,radius,options);if(Math.hypot(p.x-old.x,p.z-old.z)<1e-10)router.routeBlocked(route,p);}
  assert(!d.boxes.some(b=>hit(p,b,radius-1e-6)),`overlap ${hz}`);
 }
 assert(Math.hypot(p.x-end.x,p.z-end.z)<.008,JSON.stringify({radius,hz,p,phase:router.getRouteState(route),fraction:d.fraction}));assert(phases.has('staging'));assert(phases.has('waiting'));console.log({radius,hz,phases:[...phases],end:p});
}
