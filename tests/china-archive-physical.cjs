// Actual Three geometry and original actor rig. This explicitly records the
// unresolved central-table reach; it is not a claim of playable archive work.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve('source'),cache=new Map();
function mod(f){f=f.split('?')[0];if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});cache.set(f,m);return m;}
const link=(s,r)=>mod(s==='three'?base+'/vendor/three/build/three.module.js':path.resolve(path.dirname(r.identifier),s));
async function load(f){const m=mod(base+'/'+f);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{const G=await load('game/geometry.js'),T=G.THREE,{createArchiveBooks}=await load('game/china-archive-books.js'),{ARCHIVE_BOOKS}=await load('game/china-archive-catalogue.js'),{createCharacter}=await load('game/characters.js');
const scene=new T.Group(),books=createArchiveBooks(G,{group:scene});assert.equal(books.nodes.size,6);assert(books.completeCatalogue());assert.equal(books.root.children.length,6);assert(books.root.children.every(n=>n.children.length===4));
const report=[];
for(const variant of[0,1]){const actor=createCharacter({culture:'china',variant});const b=ARCHIVE_BOOKS[0];actor.root.position.fromArray(b.stand);actor.root.rotation.y=Math.PI;actor.animate(1,false,'tidy',{workHeight:b.position[1]-b.stand[1],workDistance:1.35});scene.add(actor.root);scene.updateMatrixWorld(true);const hands=actor.root.userData.hands.map(h=>h.getWorldPosition(new T.Vector3()).toArray());assert.equal(books.contact(actor,b.id),false,'baseline tabletop pose must not authorize unreachable original volume');report.push({variant,stand:b.stand,hands,contact:false});actor.dispose();actor.root.removeFromParent();}
// Adapter guard is measured against actual hand transforms, never actor roots.
const testActor={root:new T.Group()};testActor.root.userData.hands=[new T.Group(),new T.Group()];for(const h of testActor.root.userData.hands)testActor.root.add(h);scene.add(testActor.root);
for(const b of ARCHIVE_BOOKS){testActor.root.position.fromArray(b.position);testActor.root.userData.hands[0].position.set(-.18,.0525,0);testActor.root.userData.hands[1].position.set(.18,.0525,0);assert(books.contact(testActor,b.id));testActor.root.userData.hands[1].position.y+=.03;assert(!books.contact(testActor,b.id));}
assert(!books.contact({root:new T.Group()},ARCHIVE_BOOKS[0].id));const original=books.nodes.get(ARCHIVE_BOOKS[0].id);original.position.x+=.01;assert(!books.atHome(ARCHIVE_BOOKS[0].id));original.position.x-=.01;original.removeFromParent();assert(!books.completeCatalogue());assert(!books.exists(ARCHIVE_BOOKS[0].id));books.root.add(original);assert(books.completeCatalogue());
console.log(JSON.stringify({status:'PASS',scope:'Six distinct original-sized dynamic volumes and strict two-palm guards. Production scene replacement and central-table reach remain deliberately unconnected.',baselineReachBlocked:report},null,2));books.dispose();})().catch(e=>{console.error(e);process.exit(1);});
