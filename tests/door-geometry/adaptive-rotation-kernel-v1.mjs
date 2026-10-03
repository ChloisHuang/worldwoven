// Conservative QA only. Nothing here edits production geometry or grants a
// clearance from overlap. A rejected separating-axis certificate SUBDIVIDES.
import * as K from './triangle-kernel-v3.mjs';
export { K };
export const expandXZ = (b, e, eps = 0) => ({min:b.min.map((x,i)=>x-(i===1?0:e)-eps),max:b.max.map((x,i)=>x+(i===1?0:e)+eps)});
export const union = (a,b) => ({min:a.min.map((x,i)=>Math.min(x,b.min[i])),max:a.max.map((x,i)=>Math.max(x,b.max[i]))});
export const rotateY = (triangle, pin, angle) => {const c=Math.cos(angle),s=Math.sin(angle);return triangle.map(p=>{const x=p[0]-pin[0],z=p[2]-pin[2];return[pin[0]+x*c+z*s,p[1],pin[2]-x*s+z*c];});};
export const sagitta = (radius,angle) => 2*radius*Math.sin(Math.abs(angle)/4)**2;
const finiteTriangle = t => Array.isArray(t)&&t.length===3&&t.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite));
// Any chosen axis may certify separation; completeness of the set is NOT
// required. Exhausting it means unknown, never intersecting and never clear.
export function separationCertificate(before,after,obstacle,error,eps=1e-5,stats={},motionError=0){
  const points=[...before,...after];
  const scale=Math.max(1,...points.flat().map(Math.abs),...obstacle.flat().map(Math.abs));
  const numericGuard=256*Number.EPSILON*scale;
  const test = axis => {
    const n=K.len(axis);if(!Number.isFinite(n)||n<1e-14)return null;
    const unit=K.mul(axis,1/n),a=points.map(p=>K.dot(p,unit)),b=obstacle.map(p=>K.dot(p,unit));
    // The rotation error is horizontal. Y-plane floor/ceiling clearance is exact.
    const projectedError=error*Math.hypot(unit[0],unit[2])+motionError;
    const gap=Math.max(Math.min(...b)-Math.max(...a),Math.min(...a)-Math.max(...b));
    stats.axes=(stats.axes||0)+1;
    return gap>projectedError+eps+numericGuard?{axis:unit,gap,projectedError,numericGuard}:null;
  };
  for(const axis of[[0,1,0],[1,0,0],[0,0,1],K.cross(K.sub(obstacle[1],obstacle[0]),K.sub(obstacle[2],obstacle[0])),K.cross(K.sub(before[1],before[0]),K.sub(before[2],before[0])),K.cross(K.sub(after[1],after[0]),K.sub(after[2],after[0]))]){const c=test(axis);if(c)return c;}
  // Superset of hull face normals and hull-edge/static-edge cross products.
  // We do not construct an oriented hull or depend on winding of its faces.
  for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){
    const edge=K.sub(points[j],points[i]);
    for(let e=0;e<3;e++){const c=test(K.cross(edge,K.sub(obstacle[(e+1)%3],obstacle[e])));if(c)return c;}
    for(let k=j+1;k<6;k++){const c=test(K.cross(edge,K.sub(points[k],points[i])));if(c)return c;}
  }
  return null;
}

// pose(f) returns ONE corresponding triangle, with fixed topology. Radius and
// totalAngle describe its proven vertical-axis rigid rotation; angle=0 also
// permits affine motion with the endpoint convex hull. Numeric or budget
// uncertainty is REVIEW. Endpoint containment belongs to the solid-level caller.
export function sweepTriangle({pose,obstacles,query,triangleOf=x=>x.t??x,radius,totalAngle=Math.PI/2,eps=1e-5,motionError=0,maxDepth=12,maxNodes=20000,allowInterval=null,onWitness=()=>{},stopAtFirst=false}){
  if(!Number.isFinite(radius)||radius<0||!Number.isFinite(totalAngle)||Math.abs(totalAngle)>Math.PI+1e-12||!Number.isFinite(eps)||eps<=0)throw Error('Unreviewed rotation bounds');
  if(!Number.isInteger(maxDepth)||maxDepth<0||maxDepth>30||!Number.isInteger(maxNodes)||maxNodes<1)throw Error('Invalid adaptive work limits');
  if(!Number.isFinite(motionError)||motionError<0)throw Error('Invalid motion numerical guard');
  const stats={nodes:0,pairs:0,axes:0,certifiedPairs:0,allowedPairs:0,actualCrossings:0,actualContacts:0,unresolved:0,maxDepth:0,poseEvaluations:0};
  let failed=false,review=false;
  const at=f=>{const t=pose(f);stats.poseEvaluations++;if(!finiteTriangle(t))throw Error('Nonfinite or changing triangle topology');return t;};
  const before=at(0),after=at(1),rootBox=expandXZ(union(K.bounds(before),K.bounds(after)),sagitta(radius,totalAngle),eps+motionError);
  const candidates=(query?query(rootBox):obstacles).filter(s=>K.overlap(rootBox,K.bounds(triangleOf(s)),eps));
  function visit(lo,hi,a,b,rows,depth){
    if(!rows.length)return;stats.nodes++;stats.maxDepth=Math.max(stats.maxDepth,depth);
    const error=sagitta(radius,totalAngle*(hi-lo)),bb=expandXZ(union(K.bounds(a),K.bounds(b)),error,eps+motionError),pending=[];
    for(const s of rows){const t=triangleOf(s);if(!finiteTriangle(t))throw Error('Nonfinite static triangle');stats.pairs++;
      if(!K.overlap(bb,K.bounds(t),eps)){stats.certifiedPairs++;continue;}
      if(separationCertificate(a,b,t,error,eps,stats,motionError)){stats.certifiedPairs++;continue;}
      // Optional policy must cover ALL potential contacts in the complete
      // envelope. A midpoint or nearest-pair allowance is insufficient here.
      if(allowInterval?.({obstacle:s,before:a,after:b,bounds:bb,error,interval:[lo,hi]})){stats.allowedPairs++;continue;}
      pending.push(s);
    }
    if(!pending.length)return;
    const mid=(lo+hi)/2,m=at(mid),next=[];
    for(const s of pending){const c=K.triangleContact(m,triangleOf(s),eps);
      if(c){const crossing=c.type==='surface-crossing';const answer=onWitness({type:crossing?'surface':'contact',fraction:mid,triangle:m,obstacle:s,event:c,interval:[lo,hi],maxArcDeviation:error});
        // An allowed sampled contact does NOT certify its neighboring times.
        if(answer?.allowed){next.push(s);continue;}
        failed ||=crossing;review ||=!crossing;stats[crossing?'actualCrossings':'actualContacts']++;
        // A known forbidden contact already makes this pair non-clear. No need
        // to search for every collision witness in the same interval.
        if(stopAtFirst)return;continue;
      }next.push(s);
    }
    if(!next.length)return;
    if(depth>=maxDepth||stats.nodes>=maxNodes||mid===lo||mid===hi){review=true;for(const s of next){stats.unresolved++;onWitness({type:'arc-or-contact-review',fraction:mid,triangle:m,obstacle:s,event:{points:[]},interval:[lo,hi],maxArcDeviation:error,reason:'Conservative endpoint hull cannot be separated after bounded refinement; this is not a clearance or confirmed collision'});}return;}
    visit(lo,mid,a,m,next,depth+1);if(stopAtFirst&&(failed||review))return;visit(mid,hi,m,b,next,depth+1);
  }
  visit(0,1,before,after,candidates,0);
  return {status:failed?'FAIL':review?'REVIEW':'PASS_SURFACE_SEPARATION',stats,candidatePairs:candidates.length};
}
