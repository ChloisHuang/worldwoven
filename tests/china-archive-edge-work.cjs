// Dormant scene assembly: omit precisely the six former decorative books,
// replace them with the six v2 originals. Production palace/main are untouched.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve('source'),cache=new Map(),charRoot=path.resolve(process.argv[2]||'source/game');
function mod(f){f=f.split('?')[0];if(cache.has(f))return cache.get(f);let s=fs.readFileSync(f,'utf8');if(f===base+'/game/china-palace.js'){const old='for(const dx of [-1.1,0,1.1])boundBook(g,x+dx,1.13,zz,.8,.6,0x7d9583);';assert(s.includes(old)||s.includes('const archiveBooks=createArchiveBooks'));s=s.replace(old,'/* six original volumes supplied by dormant v2 fixture */');}const m=new vm.SourceTextModule(s,{identifier:f});cache.set(f,m);return m;}
const link=(s,r)=>mod(s==='three'?base+'/vendor/three/build/three.module.js':path.resolve(path.dirname(r.identifier),s));
async function load(f){const m=mod(f.startsWith('/')?f:base+'/'+f);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{const G=await load('game/geometry.js'),T=G.THREE,{createArchiveBooks}=await load('game/china-archive-books.js'),{ARCHIVE_BOOKS,archiveContract}=await load('game/china-archive-catalogue.js'),{createCharacter}=await load(charRoot+'/characters.js'),{buildChina}=await load('game/regions-east.js');
assert(fs.readFileSync(charRoot+'/characters.js','utf8').includes('handoffDip'));
const lot=buildChina(),scene=new T.Scene();scene.background=new T.Color(0xc5d4ce);scene.add(lot.group);lot.roofGroup.visible=false;
const books=lot.archiveBooks||createArchiveBooks(G,{group:lot.group});scene.add(new T.HemisphereLight(0xfff4d8,0x68766a,2));const light=new T.DirectionalLight(0xffefce,2.5);light.position.set(5,20,-20);scene.add(light);
let renderer=null,canvas=null;if(process.env.ARCHIVE_MESA==='1'){const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(1100,750);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1100,750,false);renderer.outputColorSpace=T.SRGBColorSpace;fs.mkdirSync('qa/china-archive',{recursive:true});}
const camera=new T.PerspectiveCamera(42,1100/750,.1,100),report=[];
for(const variant of[0,1]){const actor=createCharacter({culture:'china',variant,scale:.96});scene.add(actor.root);let maxGap=0,minEdge=Infinity;
for(const [index,b]of ARCHIVE_BOOKS.entries()){
 const tableZ=index<3?-30.2:-28;assert(Math.abs((tableZ+.85)-(b.position[2]+.3)-.05)<1e-8);assert(b.stand[2]-.25>=tableZ+.85+.0299);minEdge=Math.min(minEdge,b.stand[2]-.25-tableZ-.85);
 actor.root.position.fromArray(b.stand);const original=books.nodes.get(b.id);let maxLift=0;
 for(const [stage,duration]of[['check',2],['tidy',1],['replace',.8]])for(let s=0;s<=Math.round(duration*20);s++){
  const seconds=s/20,o={contract:archiveContract(0,'cn-rest',0),index,stage,seconds,completed:ARCHIVE_BOOKS.slice(0,index).map(b=>b.id)};books.restore(o);books.pose(actor,10+seconds,{book:b,stage,seconds});scene.updateMatrixWorld(true);
  assert.equal(books.nodes.get(b.id),original);assert(books.matches(o));assert(books.contact(actor,b.id),`actual two-palm contact variant=${variant} book=${b.id} stage=${stage} seconds=${seconds}`);
  for(const hand of actor.root.userData.hands){const p=original.worldToLocal(hand.getWorldPosition(new T.Vector3()));maxGap=Math.max(maxGap,Math.abs(p.y-.0525));}
  maxLift=Math.max(maxLift,original.position.y-b.position[1]);assert.equal(books.root.children.length,6);
  if(renderer&&index===0&&((stage==='check'&&seconds===0)||(stage==='tidy'&&seconds===.5)||(stage==='replace'&&seconds===.8))){const target=new T.Vector3(b.stand[0],8.65,b.stand[2]-.30);camera.position.copy(target).add(new T.Vector3(3.1,1.2,3.18).normalize().multiplyScalar(4.6));camera.lookAt(target);renderer.render(scene,camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync(`qa/china-archive/variant-${variant}-${stage}.png`,canvas.toBuffer('image/png'));}
 }
 assert(maxLift>.119);assert(books.atHome(b.id));books.restore(null);assert(books.allReturned());}
report.push({variant,scale:.96,bookCount:books.nodes.size,maxPalmSurfaceGap:maxGap,minBodyTableGap:minEdge});actor.dispose();actor.root.removeFromParent();}
// Same physical books + actual rig through the dormant controller. Movement
// follows a bounded clear-aisle adapter, not production main's path planner.
const {createArchiveInspection}=await load('game/china-archive-inspection.js'),{createArchiveAccount}=await load('game/china-archive-account.js');
const n=createCharacter({culture:'china',variant:0,scale:.96});n.station={id:'cn-rest'};n.alive=true;n.root.position.set(-2.3,7.615,-28.7);scene.add(n.root);let savedWorld,savedMoney,time=0,route=[],key='',maxObservedGap=0;
const economy=createArchiveAccount({saveState:(s,r,patch)=>{savedMoney=s;savedWorld=patch.chinaArchiveInspection;return true;}});
const actorAssignment={status:'npc',holderId:'cn-rest',revision:0,actor:n,alive:true,available:true};
const options={resolveAssignment:()=>actorAssignment,getDay:()=>0,getActor:()=>n,canControl:()=>true,books,economy,saveState:s=>{savedWorld=s;return true;},
travel(n,p,dt){if(key!==p.join(',')){key=p.join(',');route=[[n.root.position.x,p[1],-26.5],[p[0],p[1],-26.5],p];}const q=route[0];if(!q)return;const distance=Math.hypot(q[0]-n.root.position.x,q[2]-n.root.position.z),ratio=Math.min(1,dt*1.3/(distance||1));n.root.position.x+=(q[0]-n.root.position.x)*ratio;n.root.position.z+=(q[2]-n.root.position.z)*ratio;n.walking=true;if(distance<.04)route.shift();},
pose(n,t,w){if(w)n.walking=false;books.pose(n,t,w);if(w){const b=books.nodes.get(w.book.id);for(const h of n.root.userData.hands){const p=b.worldToLocal(h.getWorldPosition(new T.Vector3()));maxObservedGap=Math.max(maxObservedGap,Math.abs(p.y-.0525));}}}};
let controller=createArchiveInspection(options),restored=false;
for(let i=0;i<20000&&!economy.hasIncome('cn-rest');i++){time+=.05;controller.update(.05,time);const state=controller.state();
if(!restored&&state.order?.stage==='tidy'&&state.order.index===2&&state.order.seconds>=.4){const partial=controller.snapshot();controller.dispose();controller=createArchiveInspection({...options,saved:partial});assert.deepEqual(controller.snapshot(),partial);restored=true;}
for(const [x,z]of[[-1.6,-30.2],[5.8,-28]]){const dx=Math.max(Math.abs(n.root.position.x-x)-2.1,0),dz=Math.max(Math.abs(n.root.position.z-z)-.85,0);assert(Math.hypot(dx,dz)>=.249,'actor body entered original table');}}
assert(restored);assert.equal(economy.account('cn-rest').bank,8,JSON.stringify(controller.state()));assert.equal(savedMoney.receipts.length,1);assert.equal(savedWorld.order,null);assert(books.allReturned());assert(maxObservedGap<.025);const v1={...controller.snapshot(),version:1};assert(createArchiveInspection({...options,saved:v1}).loadError,'old unfinished layout cannot silently migrate');controller.dispose();n.dispose();n.root.removeFromParent();
console.log(JSON.stringify({status:'PASS',scope:'Actual rigs and same six original nodes: v2 near-edge placement, contact, 0.12m lift, in-hand alignment, replacement. Dormant assembled original scene; no main/navigation/day-needs validation.',rendered:!!renderer,controller:{bank:economy.account('cn-rest').bank,receipts:savedMoney.receipts.length,partialRestore:restored,maxObservedGap},report},null,2));if(renderer)renderer.dispose();books.dispose();})().catch(e=>{console.error(e);process.exit(1);});
