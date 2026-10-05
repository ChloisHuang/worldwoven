// One production-main application and visitor-funded poetry service. No guest
// relocation, wallet top-up, altered life weights or manufactured service event.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function salonReview(){return {player,lot,camera,scene,sun,lighting,npcs,chinaSalon,chinaSalonEmployment,chinaTavern,formalCareers,copperLedger,automaticDoors,navOptions,careerHandbook};}
export function salonStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);careerHandbook.update(mode);}
export function salonRuntime(){return {path:path.length,pending:pendingInteraction?.id,performing:performing?.id,clock:simulationClock.state()};}
export function salonView(){yaw=2.35;pitch=.26;distance=4.6;updateCamera(1,true);updateLabels();}
export {requestStationIntent,configureStableShadows,blocked,planPath};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed=`{const prior=JSON.parse(storage['worlds-days-v1']);const core=mod(path.join(root,'game/formal-careers.js'));await core.link(linker);await core.evaluate();const career=core.namespace.createFormalCareers({getClock:()=>({day:0,hour:10,seconds:0}),saveState:()=>{}}).state();delete career.loadError;delete career.lastError;career.skills.art=1;career.skills.writing=1;prior.appearance.seed=3;prior.formalCareers=career;storage['worlds-days-v1']=JSON.stringify(prior);}const main=mod(path.join(root,'game/main.js'));`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed);
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const out=process.env.OUT_DIR||'qa/salon-employment-main';fs.mkdirSync(out,{recursive:true});
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();const r=main.namespace.salonReview(),T=three.namespace,e=r.chinaSalonEmployment;
const report={scope:'Production main, actual Three geometry/common paths and original visitor life/wallet; simulated DOM. Mesa normal-view screenshot when requested, not iOS QA',checks:[]},mark=s=>{report.checks.push(s);console.log(s);};
let frames=0;const previous=new Map([[r.player,r.player.root.position.clone()]]);
function step(){const owned=e.state().order?.customerId;for(const n of r.npcs.filter(n=>n.station.id===owned))if(!previous.has(n))previous.set(n,n.root.position.clone());for(const n of previous.keys())if(n!==r.player&&n.station.id!==owned)previous.delete(n);main.namespace.salonStep(.1);frames++;for(const [n,p]of previous){assert(p.distanceTo(n.root.position)<1,'no actor teleport '+n.station?.id);p.copy(n.root.position);}}
const detail=()=>({runtime:main.namespace.salonRuntime(),player:r.player.root.position.toArray(),employment:e.state(),guests:r.chinaTavern.staffScene.state().visitors,guestActors:r.chinaTavern.staffScene.state().actors.filter(n=>n.id.includes('diner')),room:r.chinaSalon.ledger.state(),failures:r.chinaSalon.state().failures,notices:ids.toast.textContent});
function until(fn,label,limit=4000){for(let i=0;i<limit&&!fn();i++)step();if(!fn())fs.writeFileSync(out+'/failure.json',JSON.stringify(detail(),null,2));assert(fn(),label+' '+JSON.stringify(detail()));}
function request(kind,fn,label){const q=e.intent(kind);assert(q,'intent '+kind+' '+JSON.stringify(detail()));assert(main.namespace.requestStationIntent(q));until(fn,label);}
request('formal-apply',()=>r.formalCareers.applicationResult('cn-salon-poet')?.status==='pending','walk to Wen local registration');r.careerHandbook.close();assert.equal(r.formalCareers.state().tenure,null);mark('Spawn → ordinary stairs → 温晚 local persistent pending');
request('formal-review',()=>r.formalCareers.isHired('cn-salon-poet'),'actual interview');r.careerHandbook.close();assert.equal(e.state().shift,null);request('accept',()=>!!e.state().shift,'explicit start');mark('Personal interview → sole poetry seat → voluntary start; four original artists remain');
// R93's 6-copper paid chain remains recorded as historical route evidence.
// New shared prices may exceed every original purse; never fund a fake client
// merely to force this optional full-scene fixture into a paid service.
if(e.state().quote+6>Math.max(...r.chinaTavern.staffScene.snapshot().visitors.map(v=>v.copper))){
 assert(r.npcs.filter(n=>n.station.id.includes('cn-tavern-diner-')).every(n=>e.lifeChoices(n).length===0));request('end-shift',()=>!e.state().shift,'free handover when no customer can afford this price');assert.equal(r.copperLedger.state().bank,0);assert(r.formalCareers.isHired('cn-salon-poet'));report.status='PASS';report.frames=frames;report.checks.push('No original purse can afford current quote; no forced invitation or income; voluntary handover retains job');fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));return;
}
until(()=>e.state().order?.stage==='offered','original solvent guest autonomously chooses and actually climbs stairs',6000);const order=e.state().order,client=r.npcs.find(n=>n.station.id===order.customerId),balance=r.chinaTavern.staffScene.snapshot().visitors.find(v=>v.id===order.customerId).copper;assert(balance>=order.fee+6);assert.equal(client.root.position.y,7.815);mark('Existing guest personality/needs/cooldown chooses poetry once; original purse and real ascent');
request('take-invitation',()=>e.state().order?.stage==='escort','accept invitation and reserve original purse');assert.equal(r.chinaTavern.staffScene.snapshot().visitors.find(v=>v.id===order.customerId).copper,balance-order.fee);
request('go-room',()=>e.state().order?.stage==='choose','both parties actually reach existing room');mark('One room lease → ordinary paths → same guest and player arrive');
request('poem-'+order.request,()=>e.state().order?.stage==='reciting','choose requested poem');
// Save the genuine production work card; its final rendering uses normal CSS.
r.careerHandbook.open({roleId:'cn-salon-poet',scope:'role'});
const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const html=n=>{if(!n.tagName)return escape(n.textContent);const attrs={...n.attrs,...(n.className?{class:n.className}:{}),...(n.open?{open:''}:{}),...(n.max?{max:n.max}:{}),...(n.value!==undefined?{value:n.value}:{}),...(n.hidden?{hidden:''}:{})};return '<'+n.tagName+Object.entries(attrs).map(([k,v])=>' '+k+'="'+escape(v)+'"').join('')+'>'+((n.tagName==='style'?n.textContent:escape(n.textContent))||'')+(n._html||'')+n.children.map(html).join('')+'</'+n.tagName+'>';};
const dialog=all.filter(n=>n.tagName==='dialog'&&n.className.includes('career-dialog')).at(-1),styles=all.filter(n=>n.tagName==='style').map(n=>n.textContent||'').join('\n');
fs.writeFileSync(out+'/work-card.html','<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#ddd9cf;color:#496176;font-family:serif}button{cursor:pointer}dialog{display:flex}'+styles+'</style>'+html(dialog));
r.careerHandbook.close();
if(process.env.SALON_MESA==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});const canvas=W.createCanvas(852,393),actual=new T.WebGLRenderer({canvas,antialias:true});actual.setSize(852,393,false);actual.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(actual,r.sun);r.camera.aspect=852/393;r.camera.updateProjectionMatrix();main.namespace.salonView();r.scene.updateMatrixWorld(true);r.lighting.update(r.player.root.position);actual.render(r.scene,r.camera);actual.getContext().finish();fs.writeFileSync(out+'/poetry-normal-view.png',canvas.toBuffer('image/png'));actual.dispose();canvas.dispose();report.render='Actual Three/Mesa normal follow camera';
}
until(()=>e.state().order?.stage==='discussion','eight actual seconds of reading');request('answer-'+order.request,()=>e.state().order?.stage==='ready','respond to the real topic');assert.equal(r.copperLedger.state().bank,0);assert.equal(e.state().latestReview.positive,true);mark('Selected poem → actual 8-second recitation → topic response and named review');
request('settle',()=>!e.state().order,'walk back to Wen and settle same customer money');assert.equal(r.copperLedger.state().bank,order.fee);assert.equal(e.state().reviews.length,1);assert(e.state().shift);request('end-shift',()=>!e.state().shift,'explicit handover');assert(r.formalCareers.isHired('cn-salon-poet'));mark('Original visitor debit = bank income once; explicit handover retains appointment');
report.frames=frames;report.payment=order.fee;report.customerId=order.customerId;report.originalBalance=balance;report.status='PASS';report.maxRSSMiB=process.resourceUsage().maxRSS/1024;fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});`;
new vm.Script(harness,{filename:'salon-employment-main-harness.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
