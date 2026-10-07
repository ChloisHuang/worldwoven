// Wallet -> original country station intent -> actual China path and counter.
// One live scene; other countries share this main wiring and differ by station.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function walletNavigationReview(){return {player,lot,currencyWallet,chinaMoneyHouse,copperLedger,path,targetStation,pendingInteraction,navOptions};}
export function walletNavigationStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);}
export {blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const started=Date.now();all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.walletNavigationReview(),station=r.lot.stations.find(s=>s.id==='cn-money-house-teller');
assert(station&&r.chinaMoneyHouse.ownsStation(station.id));
assert(!main.namespace.blocked(r.player.root.position.x,r.player.root.position.z,r.lot.colliders,.34,{...r.navOptions,y:r.player.root.position.y}),'actual China arrival is a legal starting point');
assert(r.player.root.position.distanceTo(new three.namespace.Vector3(...station.position))>4,'not a near-counter shortcut');
const history=JSON.stringify(r.copperLedger.history());r.currencyWallet.open();assert(r.currencyWallet.isOpen());assert(!r.chinaMoneyHouse.isOpen());
const dialog=all.find(e=>e.className==='ww-wallet-dialog'),desc=e=>[e,...e.children.flatMap(desc)],go=desc(dialog).find(e=>e.className==='ww-wallet-bank-visit');assert(go&&!go.hidden);go.onclick();
assert(!r.currencyWallet.isOpen());assert(!r.chinaMoneyHouse.isOpen(),'no remote banking before walking');
let live=main.namespace.walletNavigationReview();assert(live.path.length>0);assert.equal(live.pendingInteraction?.id,station.id);assert.equal(live.targetStation?.id,station.id);
let frames=0;while(frames<600&&r.player.root.position.distanceTo(new three.namespace.Vector3(...station.position))>.03){main.namespace.walletNavigationStep(.1);frames++;assert(Date.now()-started<295000);assert(process.memoryUsage().rss<1.2*1024**3);}
assert(r.player.root.position.distanceTo(new three.namespace.Vector3(...station.position))<.03,'wallet route reaches original physical counter');
assert.equal(JSON.stringify(r.copperLedger.history()),history,'navigation and opening create no account or money transaction');
const counterOpened=r.chinaMoneyHouse.isOpen(),position=r.player.root.position.toArray();r.chinaMoneyHouse.close();ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
console.log(JSON.stringify({status:'PASS',scope:'Actual wallet button/main/China station navigation, existing door and counter; simulated DOM/renderer, not iOS',frames,counterOpened,position,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024}));return;
`;
harness=harness.slice(0,begin)+body+"})().catch(e=>{console.error(e);process.exit(1)});";
new vm.Script(harness,{filename:'tests/wallet-bank-navigation-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
