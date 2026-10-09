// A legal floor point can still sit behind a doorway the current route only
// approaches partially. Reuse the world's planner and require its real end to
// reach this small interaction; never snap the player or move the witness.
export function createCriminalCaseMeetingPlacement({getPlayerPosition,resolveStand,planPath,canFinish,getTime=()=>Date.now()/1000}){
 const cache=new WeakMap(),valid=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 return actor=>{
  const anchor=actor?.root?.position?.toArray(),from=getPlayerPosition();if(!valid(anchor)||!valid(from))return null;
  const key=JSON.stringify(anchor),old=cache.get(actor);if(old?.key===key){if(old.point&&gap(old.from,from)<.5){const checked=resolveStand(actor,old.point);if(valid(checked)&&gap(checked,old.point)<1e-6)return old.point.slice();}else if(!old.point&&gap(old.from,from)<.5&&getTime()<old.retryAt)return null;}
  const dx=from[0]-anchor[0],dz=from[2]-anchor[2],length=Math.hypot(dx,dz),toward=length>.01?[dx/length*.78,dz/length*.78]:[0,-.78];
  const offsets=[toward,[0,-.78],[.78,0],[-.78,0],[0,.78],[.58,.58],[-.58,.58],[.58,-.58],[-.58,-.58]],seen=new Set();
  for(const [x,z]of offsets){
   const stand=resolveStand(actor,[anchor[0]+x,anchor[1],anchor[2]+z]);if(!valid(stand)||gap(stand,anchor)<.60||gap(stand,anchor)>1.8)continue;
   const id=JSON.stringify(stand);if(seen.has(id))continue;seen.add(id);
   const route=planPath(from,stand),end=route?.at(-1),last=end?(Array.isArray(end)?end:[end.x,end.y,end.z]):from;if(!valid(last)||gap(last,stand)>.20||!canFinish(last,stand))continue;
   // This particular witness is reserved in place. A route through their
   // body cannot be fixed by waiting for them to move, even if its destination
   // is a legal floor point on the far side of a doorway.
   const points=[from,...(route||[]).map(p=>Array.isArray(p)?p:[p.x,p.y,p.z]),stand],radius=.34+(actor.collisionRadius??.25)+.03;
   let clear=true;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((anchor[0]-a[0])*dx+(anchor[2]-a[2])*dz)/length)):0;
    if(Math.abs(a[1]+(b[1]-a[1])*t-anchor[1])<1.3&&Math.hypot(a[0]+dx*t-anchor[0],a[2]+dz*t-anchor[2])<radius){clear=false;break;}}
   if(!clear)continue;
   cache.set(actor,{key,point:stand.slice(),from:from.slice()});return stand.slice();
  }
  cache.set(actor,{key,point:null,from:from.slice(),retryAt:getTime()+.5});return null;
 };
}
