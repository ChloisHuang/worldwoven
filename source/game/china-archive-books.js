import {ARCHIVE_BOOKS} from './china-archive-catalogue.js';
// Dormant v2 layout replacement. Integration must OMIT the old six boundBook
// calls and add this group outside packStatic. This never overlays old books.
export function createArchiveBooks(G,{group,poseContext=()=>({})}){
 const T=G.THREE,root=new T.Group();root.name='Six original archive volumes';group.add(root);
 const nodes=new Map();let current=null,recovery=null;
 for(const b of ARCHIVE_BOOKS){const q=new T.Group();q.name=b.id;q.userData.archiveBookId=b.id;q.position.fromArray(b.position);root.add(q);
  G.box(q,0,0,0,.8,.095,.6,0x7d9583);G.box(q,0,.015,.025,.72,.045,.615,0xe1d4b4);
  for(const x of[-.24,.24])G.box(q,x,.055,-.18,.025,.015,.15,0xe6d4a5);nodes.set(b.id,q);
 }
 const live=id=>{const q=nodes.get(id);return q?.parent===root&&root.parent===group&&q.visible?q:null;};
 const transform=(b,o=current)=>{const p=[...b.position];let yaw=0;
  if(o?.index===ARCHIVE_BOOKS.indexOf(b)){
   const s=o.seconds||0;let lift=o.stage==='check'?Math.min(1,s/2):o.stage==='tidy'?1:o.stage==='replace'?1-Math.min(1,s/.8):0;
   lift=lift*lift*(3-2*lift);p[1]+=.12*lift;p[2]+=.06*lift;
   // One complete in-hand alignment, returning its heading before replacement.
   if(o.stage==='tidy')yaw=Math.sin(Math.PI*s)*.055;
  }return {p,yaw};
 };
 const expected=(b,o,r)=>{
  if(!r||r.order.index!==ARCHIVE_BOOKS.indexOf(b))return transform(b,o);
  const start=transform(b,r.order),f=Math.min(1,r.seconds/.8),p=start.p.slice();
  p[1]=Math.max(b.position[1],p[1]-4.9*r.fallSeconds*r.fallSeconds);p[0]+=(b.position[0]-p[0])*f;p[2]+=(b.position[2]-p[2])*f;
  return {p,yaw:start.yaw*(1-f)};
 };
 const matches=(b,o,r=null)=>{const q=live(b.id);if(!q)return false;root.updateWorldMatrix(true,true);const e=expected(b,o,r);return q.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...e.p))<.002&&Math.abs(q.rotation.y-e.yaw)<.001;};
 const atHome=id=>{const b=ARCHIVE_BOOKS.find(b=>b.id===id);return !!b&&matches(b,null);};
 function restore(o,r=null){current=o?structuredClone(o):null;recovery=r?structuredClone(r):null;for(const b of ARCHIVE_BOOKS){const q=live(b.id);if(!q)continue;const e=expected(b,current,recovery);q.position.fromArray(e.p);q.rotation.y=e.yaw;}}
 // The main player animator consumes this exact context before observed-hand
 // validation. Computing it never advances a volume or creates a held copy.
 function workPose(n,work,context={}){
  const q=live(work?.book?.id);if(!q||!n?.root)return null;
  n.root.rotation.y=Math.PI;n.root.updateWorldMatrix(true,true);q.updateWorldMatrix(true,true);
  const body=n.root.userData.body||n.root;body.updateWorldMatrix(true,false);
  const hands=[-.18,.18].map(x=>body.worldToLocal(q.localToWorld(new T.Vector3(x,.0525,.16))).toArray()).sort((a,b)=>a[0]-b[0]);
  return {...context,action:'tidy',workHeight:undefined,workDistance:undefined,handoff:true,handoffLean:n.actorId==='player'?.8:.5,handoffDip:n.actorId==='player'?.12:.08,heldProp:null,archery:{hands}};
 }
 return {root,nodes,exists:id=>!!live(id),completeCatalogue:()=>nodes.size===6&&root.children.length===6&&ARCHIVE_BOOKS.every(b=>atHome(b.id)),atHome,allReturned:()=>ARCHIVE_BOOKS.every(b=>atHome(b.id)),matches:(o,r=null)=>ARCHIVE_BOOKS.every(b=>matches(b,o,r)),
  contact(n,id){const q=live(id),hands=n?.root?.userData?.hands;if(!q||!Array.isArray(hands)||hands.length!==2||hands.some(h=>!h?.getWorldPosition))return false;
   n.root.updateWorldMatrix(true,true);root.updateWorldMatrix(true,true);
   return hands.every(h=>{const p=q.worldToLocal(h.getWorldPosition(new T.Vector3()));return Math.abs(p.x)<=.405&&p.z>=-.305&&p.z<=.34&&Math.abs(p.y-.0525)<=.025;});
  },
  pose(n,t,work,context=poseContext(n)){
   if(!work){n.animate(t,n.walking,null,context);return;}
   const c=workPose(n,work,context);if(c)n.animate(t,false,'tidy',c);
  },workPose,restore,
  state:()=>ARCHIVE_BOOKS.map(b=>({id:b.id,present:!!live(b.id),position:nodes.get(b.id).getWorldPosition(new T.Vector3()).toArray(),atHome:atHome(b.id)})),
  dispose(){root.removeFromParent();root.traverse(n=>{if(n.geometry)n.geometry.dispose();});}
 };
}
