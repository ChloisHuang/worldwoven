// One actual France counter route and optional normal third-person Mesa image.
// Runs production main in the existing simulated DOM, never a browser route.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const additions='\nexport function bankingReview(){return {player,lot,npcs,chinaMoneyHouse,copperLedger,scene,camera,renderer,sun,view(a){yaw=a;pitch=.22;distance=4.6;arrivalViewUntil=0;updateCamera(1,true);}};} export {goToStation,requestStationIntent};';
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(additions)+":''),");
harness=harness.replace('{identifier:file,context}',"{identifier:file,context,initializeImportMeta(meta){meta.url=require('node:url').pathToFileURL(file).href;}}");
harness=harness.replace('const document={body:',"const document={head:new E('head'),body:");
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
harness=harness.replace('getBoundingClientRect(){','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){');
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const started=Date.now();all.find(e=>e.dataset.region==='france').onclick();ids.travel.onclick();tick(2);
const runtime=main.namespace.bankingReview(),{player,lot,npcs,chinaMoneyHouse:service,copperLedger:ledger}=runtime;
const station=lot.stations.find(s=>s.id==='france-exchange-teller');
assert(service&&station&&lot.exchangeCounter);assert.equal(npcs.length,7);assert.equal(state().localLightBudget,6);
const frame=()=>{now+=33.333;raf();assert(Date.now()-started<150000,'Bounded France route');};
const until=(check,label)=>{for(let i=0;i<1200&&!check();i++)frame();assert(check(),label+' '+JSON.stringify({player:state().player,path:state().pathLength,pending:state().pendingInteraction}));};
const desc=e=>[e,...e.children.flatMap(desc)],dialog=()=>all.find(e=>e.className.split(' ').includes('cn-money-dialog')),button=kind=>desc(dialog()).find(e=>e.dataset.moneyAction===kind);
assert.equal(service.open(),false,'Arrival cannot open a remote bank');
const wage={amount:20,receiptId:'france-garden-route-earned-wage',currency:'france',roleId:'fr-garden-helper',slotId:'garden-shift',day:1};
assert(ledger.creditWageToBank(wage).ok);assert.equal(ledger.balances().france.cash,0);
// Start on the public garden path outside this reception. Production doors,
// collisions and actor movement must carry the player through the real entry.
player.root.position.set(21,0,5.8);frame();
main.namespace.goToStation(station);assert(state().pathLength>0);for(let i=0;i<5;i++)frame();
events.keydown({code:'KeyW',repeat:false,preventDefault(){}});frame();events.keyup({code:'KeyW',preventDefault(){}});
assert.equal(state().pathLength,0,'Manual movement cancels navigation');assert(!service.isOpen());
main.namespace.goToStation(station);until(()=>!state().pathLength,'Natural garden doorway route reaches the counter');
assert(!service.isOpen(),'Navigation-only arrival must not silently open the bank');assert.equal(ledger.history().length,1);
events.keydown({code:'KeyE',repeat:false,preventDefault(){}});until(()=>service.isOpen(),'Manual E arrives precisely and opens the same counter');
assert(!state().performing);assert(Math.hypot(player.root.position.x-station.position[0],player.root.position.z-station.position[2])<.02);
const select=desc(dialog()).find(e=>e.getAttribute('aria-label')==='办理币种');assert.equal(select.value,'france');
const slider=desc(dialog()).find(e=>e.getAttribute('aria-label')==='随身现金分配');slider.value='6';slider.oninput();button('allocation').onclick();button('allocation').onclick();
assert.deepEqual([ledger.balances().france.cash,ledger.balances().france.bank],[6,14]);
button('exchange').onclick();assert.deepEqual([ledger.balances().france.cash,ledger.balances().copper.cash],[4,8]);
const before=state().player;events.keydown({code:'KeyW',repeat:false,preventDefault(){}});frame();assert(Math.hypot(state().player.x-before.x,state().player.z-before.z)<.001,'Shared modal blocks movement');
dialog().listeners.cancel({preventDefault(){}});assert(!service.isOpen());events.keyup({code:'KeyW',preventDefault(){}});
// A deliberate intent may open on arrival, but no money moves until confirmed.
player.root.position.x-=.5;frame();assert(main.namespace.requestStationIntent(station));until(()=>service.isOpen(),'Explicit automatic intent opens on arrival');assert.equal(ledger.history().length,3);service.close();
const durable=JSON.parse(storage['worlds-days-v1']).copperLedger;assert.equal(durable.balances.france.bank,14);assert.equal(durable.balances.copper.cash,8);
const teller=npcs.find(n=>n.station.id===station.id);assert(Math.hypot(teller.root.position.x-player.root.position.x,teller.root.position.z-player.root.position.z)>1.8,'Staff does not block customer approach');
const report={status:'PASS',scope:'One France production-main doorway route, manual/navigation-only/explicit intent, confirmed shared-bank withdrawal and FX; simulated DOM, not browser or device QA',frames:[],cases:['physical entry and bank arrival','navigation-only stays closed','manual E and explicit intent agree','French wages/withdrawal/FX persist in central bank','counter modal prevents movement','seven stable actors and unchanged six-light budget']};
if(process.env.OUT_DIR){
 const output=process.env.OUT_DIR;assert(!fs.existsSync(output),'Use a fresh image output directory');fs.mkdirSync(output,{recursive:true});
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});
 const T=three.namespace,canvas=W.createCanvas(1000,750),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1000,750,false);renderer.outputColorSpace=T.SRGBColorSpace;Object.assign(renderer.shadowMap,runtime.renderer.shadowMap);
 try{
  runtime.camera.aspect=1000/750;runtime.camera.updateProjectionMatrix();
  for(const[name,yaw]of [['01-counter-normal-view',Math.PI*1.42],['02-counter-workspace',Math.PI*1.12]]){
   runtime.view(yaw);runtime.scene.updateMatrixWorld(true);renderer.render(runtime.scene,runtime.camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);
   fs.writeFileSync(output+'/'+name+'.png',canvas.toBuffer('image/png'));report.frames.push({name,camera:runtime.camera.position.toArray(),player:player.root.position.toArray(),fov:runtime.camera.fov,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
  }
 }finally{renderer.dispose();canvas.dispose();}
 fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));
}
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
report.seconds=(Date.now()-started)/1000;report.maxRSSMiB=process.resourceUsage().maxRSS/1024;console.log(JSON.stringify(report));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/france-bank-main-fixture.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
