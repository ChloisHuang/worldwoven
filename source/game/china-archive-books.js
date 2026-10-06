import {ARCHIVE_BOOKS} from './china-archive-catalogue.js';
// Dormant v2 layout replacement. Integration must OMIT the old six boundBook
// calls and add this group outside packStatic. This never overlays old books.
export function createArchiveBooks(G,{group,poseContext=()=>({})}){
 const T=G.THREE,root=new T.Group();root.name='Six original archive volumes';group.add(root);
 const nodes=new Map();let current=null;
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
 const matches=(b,o)=>{const q=live(b.id);if(!q)return false;root.updateWorldMatrix(true,true);const e=transform(b,o);return q.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...e.p))<.002&&Math.abs(q.rotation.y-e.yaw)<.001;};
 const atHome=id=>{const b=ARCHIVE_BOOKS.find(b=>b.id===id);return !!b&&matches(b,null);};
 function restore(o){current=o?structuredClone(o):null;for(const b of ARCHIVE_BOOKS){const q=live(b.id);if(!q)continue;const e=transform(b);q.position.fromArray(e.p);q.rotation.y=e.yaw;}}
 return {root,nodes,exists:id=>!!live(id),completeCatalogue:()=>nodes.size===6&&root.children.length===6&&ARCHIVE_BOOKS.every(b=>atHome(b.id)),atHome,allReturned:()=>ARCHIVE_BOOKS.every(b=>atHome(b.id)),matches:o=>ARCHIVE_BOOKS.every(b=>matches(b,o)),
  contact(n,id){const q=live(id),hands=n?.root?.userData?.hands;if(!q||!Array.isArray(hands)||hands.length!==2||hands.some(h=>!h?.getWorldPosition))return false;
   n.root.updateWorldMatrix(true,true);root.updateWorldMatrix(true,true);
   return hands.every(h=>{const p=q.worldToLocal(h.getWorldPosition(new T.Vector3()));return Math.abs(p.x)<=.405&&p.z>=-.305&&p.z<=.34&&Math.abs(p.y-.0525)<=.025;});
  },
  pose(n,t,work){
   if(!work){n.animate(t,n.walking,null,poseContext(n));return;}
   const q=live(work.book.id);if(!q)return;
   n.root.rotation.y=Math.PI;n.root.updateWorldMatrix(true,true);q.updateWorldMatrix(true,true);
   const body=n.root.userData.body||n.root;body.updateWorldMatrix(true,false);
   const hands=[-.18,.18].map(x=>body.worldToLocal(q.localToWorld(new T.Vector3(x,.0525,.16))).toArray()).sort((a,b)=>a[0]-b[0]);
   // Existing tea opt-in interface only. No arm length or shared solver changes.
   n.animate(t,false,'tidy',{...poseContext(n),handoff:true,handoffLean:.5,handoffDip:.08,heldProp:null,archery:{hands}});
  },restore,
  state:()=>ARCHIVE_BOOKS.map(b=>({id:b.id,present:!!live(b.id),position:nodes.get(b.id).getWorldPosition(new T.Vector3()).toArray(),atHome:atHome(b.id)})),
  dispose(){root.removeFromParent();root.traverse(n=>{if(n.geometry)n.geometry.dispose();});}
 };
}
