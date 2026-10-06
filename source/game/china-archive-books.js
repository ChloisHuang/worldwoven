import {ARCHIVE_BOOKS} from './china-archive-catalogue.js';
// Dormant replacement builder. The eventual palace integration must OMIT its
// six old boundBook calls and add this group outside packStatic. Never overlay.
export function createArchiveBooks(G,{group}){
 const T=G.THREE,root=new T.Group();root.name='Six original archive volumes';group.add(root);
 const nodes=new Map();
 for(const b of ARCHIVE_BOOKS){const q=new T.Group();q.name=b.id;q.userData.archiveBookId=b.id;q.position.fromArray(b.position);root.add(q);
  G.box(q,0,0,0,.8,.095,.6,0x7d9583);G.box(q,0,.015,.025,.72,.045,.615,0xe1d4b4);
  for(const x of[-.24,.24])G.box(q,x,.055,-.18,.025,.015,.15,0xe6d4a5);nodes.set(b.id,q);
 }
 const live=id=>{const q=nodes.get(id);return q?.parent===root&&root.parent===group&&q.visible?q:null;};
 const atHome=id=>{const q=live(id),b=ARCHIVE_BOOKS.find(b=>b.id===id);if(!q||!b)return false;group.updateWorldMatrix(true,true);return q.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...b.position))<.002&&Math.abs(q.rotation.y)<.001;};
 return {root,nodes,exists:id=>!!live(id),completeCatalogue:()=>nodes.size===6&&root.children.length===6&&ARCHIVE_BOOKS.every(b=>atHome(b.id)),atHome,allReturned:()=>ARCHIVE_BOOKS.every(b=>atHome(b.id)),
  contact(n,id){const q=live(id),hands=n?.root?.userData?.hands;if(!q||!Array.isArray(hands)||hands.length!==2||hands.some(h=>!h?.getWorldPosition))return false;
   n.root.updateWorldMatrix(true,true);root.updateWorldMatrix(true,true);
   // Both actual palms must touch the top/edge of the same book. A broad
   // distance-to-book-centre test would accept hands floating above a table.
   return hands.every(h=>{const p=q.worldToLocal(h.getWorldPosition(new T.Vector3()));return Math.abs(p.x)<=.405&&p.z>=-.305&&p.z<=.34&&Math.abs(p.y-.0525)<=.025;});
  },
  replace(id){return atHome(id);},restore(){/* No held copy: all six originals stay on their own table. */},
  state:()=>ARCHIVE_BOOKS.map(b=>({id:b.id,present:!!live(b.id),position:nodes.get(b.id).getWorldPosition(new T.Vector3()).toArray(),atHome:atHome(b.id)})),
  dispose(){root.removeFromParent();root.traverse(n=>{if(n.geometry)n.geometry.dispose();});}
 };
}
