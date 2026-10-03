// This is localization only, never a collision predicate or mounting waiver.
// Every pair within delta lies in these two conservative AABB intersections.
export function nearPairRegion(a,b,delta){
 if(!Number.isFinite(delta)||delta<0)throw Error('Invalid near-region uncertainty');
 const inflate=x=>({min:x.min.map(v=>v-delta),max:x.max.map(v=>v+delta)});
 const intersect=(x,y)=>({min:x.min.map((v,i)=>Math.max(v,y.min[i])),max:x.max.map((v,i)=>Math.min(v,y.max[i]))});
 const leaf=intersect(a,inflate(b)),staticRegion=intersect(b,inflate(a));
 if([leaf,staticRegion].some(box=>box.min.some((v,i)=>v>box.max[i])))return null;
 const corners=box=>Array.from({length:8},(_,mask)=>box.min.map((v,i)=>(mask&(1<<i))?box.max[i]:v));
 return {leaf,static:staticRegion,points:[...corners(leaf),...corners(staticRegion)],delta,proof:'All Euclidean-distance<=delta pairs are inside these coordinatewise expanded intersections; these bounds only localize candidates, never prove a collision.'};
}
