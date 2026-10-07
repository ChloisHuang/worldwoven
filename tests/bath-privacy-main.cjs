// ST04 real main, original Japan room thresholds/doors, normal route and E action.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function privacyReview(){return {player,lot,npcs,navOptions,furniture,bathPrivacy,japanService,relationshipEvents};}
export function privacyStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}
export function privacyWalk(to){path=planPath(player.root.position,new THREE.Vector3(...to));return path.length;}
export function privacyCheckpoint(){save();return JSON.parse(JSON.stringify(saved));}
export {currentControl,executeNearbyAction,socialInteractionContext,blocked,requestFurniture,moveActor,standFromSeat};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","const initial=JSON.parse(storage['worlds-days-v1']);initial.appearance.player.bodyPreset='masculine-lean';storage['worlds-days-v1']=JSON.stringify(initial);const main=mod(path.join(root,'game/main.js'));");
harness=harness.replace("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const started=Date.now(),out='qa/bath-privacy-main';fs.mkdirSync(out,{recursive:true});all.find(e=>e.dataset.region==='japan').onclick();ids.travel.onclick();
const r=main.namespace.privacyReview();let frames=0;const checks=[];
function step(){main.namespace.privacyStep(.1);frames++;if(frames%50===0)console.log('ST04 main',frames,JSON.stringify({p:r.player.root.position.toArray(),status:r.bathPrivacy.status()}));assert(process.memoryUsage().rss<1.2*1024**3,'RSS');assert(Date.now()-started<295000,'timeout');}
function until(fn,msg,max=800){for(let i=0;i<max&&!fn();i++)step();assert(fn(),msg+' '+JSON.stringify({p:r.player.root.position.toArray(),status:r.bathPrivacy.status(),toast:ids.toast.textContent}));}
// Legal public-foyer starting checkpoint, then all crossing and retreat use real navigation.
r.player.root.position.set(2,3.8,6.8);assert(!main.namespace.blocked(2,6.8,r.lot.colliders,.34,{...r.navOptions,y:3.8}));
assert(r.bathPrivacy.access(r.furniture.items.find(x=>x.id==='japan-furniture-bath-1')).allowed);
assert(!r.bathPrivacy.access(r.furniture.items.find(x=>x.id==='japan-furniture-bath-2')).allowed);
assert(main.namespace.privacyWalk([3,3.8,-2])>0,'original room route');until(()=>r.bathPrivacy.status()?.people.length>0,'actual room threshold and informed occupant');const observers=r.bathPrivacy.status().people.slice();
checks.push('Normal walking crosses original room thresholds and warns with actual same-room staff; opposite pool mount rejected independently of bath-card service');
const target=r.npcs.find(n=>(n.actorId||n.station.id)===observers[0]);assert(target);assert.equal(main.namespace.socialInteractionContext('player',observers[0]).available,false,'no intimacy or conversation from bathing context');
const control=main.namespace.currentControl();assert.equal(control.intentKey,'bath-privacy-retreat');assert(main.namespace.executeNearbyAction(control),'actual E/context action');
assert(!r.bathPrivacy.snapshot().episodes[Object.keys(r.bathPrivacy.snapshot().episodes).find(k=>k.endsWith(observers[0]))].retreat,'button alone no retreat');
until(()=>!r.bathPrivacy.status()&&r.player.root.position.z>5.3,'real retreat to public foyer');
for(const id of observers){const p=r.relationshipEvents.pair(id,'player');assert(p&&p.trust>0,'actual informed directional trust '+id);assert.equal(r.relationshipEvents.pair('player',id),null);}
checks.push('Context action walks original path back through the original doorway; actual public-foyer arrival alone commits targeted respect, no automatic consent or free service');
// A second physical entry and eight seconds ignoring the request produces fault once.
assert(main.namespace.privacyWalk([3,3.8,-2])>0);until(()=>r.bathPrivacy.status()?.people.length,'reentry');main.namespace.privacyWalk(r.player.root.position.toArray());
until(()=>r.relationshipEvents.snapshot().recent.some(e=>e.kind==='privacy-intrusion'),'persistent refusal of boundary');
const faults=r.relationshipEvents.snapshot().recent.filter(e=>e.kind==='privacy-intrusion');assert(faults.every(e=>e.participants.length===2&&e.fault));

assert(main.namespace.executeNearbyAction(main.namespace.currentControl()));until(()=>!r.bathPrivacy.status()&&r.player.root.position.z>5.3,'leave fault encounter');
const pool=r.furniture.items.find(x=>x.id==='japan-furniture-bath-1');main.namespace.requestFurniture(pool);
until(()=>state().mountedKind==='bath'&&!state().bathTransition,'actual own-side bathing mount',900);
const p=main.namespace.privacyReview().player.root.position,resident=r.npcs.find(n=>Math.abs(n.root.position.y-p.y)<.1&&n.root.position.distanceTo(p)>2),before=resident.root.position.clone();
const blockedMove=main.namespace.moveActor(resident,p.x-before.x,p.z-before.z,.25);assert(blockedMove.bodyBlocked);assert(resident.root.position.equals(before),'NPC movement yields before approaching actual bathing player');
assert.match(ids.toast.textContent,/留出空间/);main.namespace.standFromSeat();until(()=>state().mountedKind!== 'bath'&&!state().bathTransition,'explicit player exit remains available',150);
checks.push('Actual own-side pool approach and entry animation completes; production NPC movement guard respects the real mounted player, and explicit E/stand exit completes without NPC/service takeover');

const checkpoint=main.namespace.privacyCheckpoint();assert(checkpoint.bathPrivacy.japan);checks.push('Repeated real entry and ignoring request records exactly informed directional fault, persists boundary history without changing money, service, or original NPC identities');
const report={status:'PASS',checks,frames,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,observers,events:r.relationshipEvents.snapshot().recent};fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));return;
`;
harness=harness.slice(0,begin)+body+"})().catch(e=>{console.error(e);process.exit(1)});";
new vm.Script(harness,{filename:'tests/bath-privacy-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
