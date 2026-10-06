// Actual Three geometry and original actor rig. This explicitly records the
// unresolved central-table reach; it is not a claim of playable archive work.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve('source'),cache=new Map();
function mod(f){f=f.split('?')[0];if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});cache.set(f,m);return m;}
const link=(s,r)=>mod(s==='three'?base+'/vendor/three/build/three.module.js':path.resolve(path.dirname(r.identifier),s));
async function load(f){const m=mod(base+'/'+f);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
// Pass the verified tea pose directory; no candidate character file is copied.
(async()=>{const T=(await load('game/geometry.js')).THREE;const charFile=path.resolve(process.argv[2]||'source/game')+'/characters.js';
assert(fs.readFileSync(charFile,'utf8').includes('handoffDip'),'requires verified opt-in lean/dip character interface');
const m=mod(charFile);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();const {createCharacter}=m.namespace,report=[];
for(const variant of [0,1]){const actor=createCharacter({culture:'china',variant}),stand=[-2.7,7.615,-29.10];actor.root.position.fromArray(stand);actor.root.rotation.y=Math.PI;actor.root.updateMatrixWorld(true);
// Original desk half-depth .85 plus unchanged actor radius .25. This is the
// closest unobstructed centreline, not an authorization to move within it.
const targets=[[-2.88,8.5825,-29.88],[-2.52,8.5825,-29.88]].map(p=>new T.Vector3(...p));const body=actor.root.userData.body;
const hands=targets.map(p=>body.worldToLocal(p.clone()).toArray()).sort((a,b)=>a[0]-b[0]);actor.animate(2,false,null,{handoff:true,handoffLean:.8,handoffDip:.12,archery:{hands}});actor.root.updateMatrixWorld(true);
const actual=actor.root.userData.hands.map(h=>h.getWorldPosition(new T.Vector3())),error=Math.max(...actual.map(p=>Math.min(...targets.map(q=>q.distanceTo(p)))));
assert(error>.08,'reach result materially changed; review before unblocking archive work');report.push({variant,stand,lean:.8,dip:.12,maxPalmTargetError:error,hands:actual.map(p=>p.toArray())});actor.dispose();}
console.log(JSON.stringify({status:'BLOCKED_AS_EXPECTED',scope:'Existing verified lean/dip still cannot touch the original archive volume from an unobstructed stance. No same-book work authorized by this experiment.',report},null,2));})().catch(e=>{console.error(e);process.exit(1);});
