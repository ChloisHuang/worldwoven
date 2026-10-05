// Registration entry must remain usable around real meal-service staff points.
// This scene deliberately never accepts work or repeats the paid-work chain.
// Simulated DOM; optional real Three/Mesa frame is not browser/iOS CSS evidence.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras="\nexport function employmentReview(){return {player,lot,camera,scene,sun,lighting,npcs,chinaLabor,chinaTavern,chinaTavernUI,copperLedger,npcSocial,careerHandbook,formalCareers,navOptions};} export function employmentStep(dt){beginActorNavigationStep(dt);elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);chinaLabor.update(dt);chinaTavernUI.update();careerHandbook.update(mode);} export function employmentView(a,p=.18){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);} export {navigateTo,requestStationIntent,configureStableShadows,nearbyInteractionClear,planPath,cancelAction};";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url="file://"+file;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const started=Date.now(),T=three.namespace,checks=[];
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.employmentReview(),labor=r.chinaLabor,employment=labor.employment,host=r.npcs.find(n=>n.station.id==='cn-tavern-host'),cook=r.npcs.find(n=>n.station.id==='cn-tavern-cook'),P=r.chinaTavern.dish.points;
const frame=(n=1)=>{for(let i=0;i<n;i++){now+=100;main.namespace.employmentStep(.1);assert(Date.now()-started<170000);assert(process.memoryUsage().rss<1.2*1024**3);}};
const find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),text=e=>[e.textContent||'',...(e.children||[]).map(text)].join('\n');
const dialog=()=>find(document.body,e=>e.className==='cn-labor-dialog'),button=label=>{const b=find(dialog(),e=>e.tagName==='button'&&e.textContent===label);assert(b,label);assert(!b.disabled);return b;};
const wait=(pred,label,max=500)=>{let frames=0;for(;frames<max;frames++){if(pred())break;frame();}const result={label,arrived:pred(),frames,player:state().player,pending:state().pendingInteraction,path:state().pathLength,nearest:state().nearest,title:ids['interact-title'].textContent,hostAvailable:labor.view().hostAvailable,toast:ids.toast.textContent};console.log('ROUTE',JSON.stringify(result));return result;};
const nav=cache.get(root+'/game/navigation.js').namespace,home=labor.intent('view').position;
let crossing=null;
const traces=[];
for(const [label,from,to]of[['west-return',[19.3,.215,17.86],P.host],['east-return',[22.7,.215,17.86],P.host],['meal-pickup',P.hostPass,[19.3,.215,17.86]]]){
 const route=main.namespace.planPath(new T.Vector3(...from),new T.Vector3(...to),.25),points=[new T.Vector3(...from),...route.map(p=>new T.Vector3(p.x,p.y,p.z))];let nearest=null;
 for(let j=1;j<points.length;j++){const a=points[j-1],b=points[j];for(let i=0,n=Math.max(1,Math.ceil(a.distanceTo(b)/.10));i<=n;i++){const p=a.clone().lerp(b,i/n),distance=Math.hypot(p.x-home[0],p.z-home[2]);if(!nearest||distance<nearest.distance)nearest={label,position:p.toArray(),distance};}}
 traces.push(nearest);if(nearest&&(!crossing||nearest.distance<crossing.distance))crossing=nearest;
}
console.log('SERVICE_ROUTE_POINTS',JSON.stringify(traces));assert(crossing);
const samples=[{name:'waiting-host-prep-cook',host:P.host,cook:P.prep},{name:'counter-handover',host:P.hostPass,cook:P.cookPass},{name:'wash-and-stove',host:P.wash,cook:P.stove},{name:crossing.label+'-closest-registration',host:crossing.position,cook:P.prep}];
for(const sample of samples){for(const p of[sample.host,sample.cook])assert(!nav.blocked(p[0],p[2],r.lot.colliders,.25,{...r.navOptions,y:p[1]}),'authored staff point is legal '+sample.name);}
// Initial placement is outside the public door. Subsequent entrances and exits
// are production routes. Staff positions are held snapshots of actual authored
// stations and the production meal-service return path, not synthetic blockers.
r.player.root.position.set(14.8,.215,13.4);
for(const registered of[false,true]){
 for(const sample of samples){
  labor.close();r.careerHandbook.close();main.namespace.cancelAction();host.root.position.fromArray(P.host);cook.root.position.fromArray(P.prep);main.namespace.navigateTo(new T.Vector3(14.8,.215,13.4));assert(wait(()=>!state().pathLength,'return-outside').arrived);frame();
  host.root.position.fromArray(sample.host);cook.root.position.fromArray(sample.cook);host.walking=false;cook.walking=false;
  const row=ids['station-list'].children.find(e=>e.dataset.stationId==='cn-tavern-labor-view');assert(row);row.onclick();const result=wait(()=>labor.isOpen(),(registered?'temporary-hired':'unregistered')+':'+sample.name);checks.push(result);if(!result.arrived)break;
  assert(!labor.active());assert(!r.formalCareers.state().tenure);assert(text(find(document.body,e=>e.className==='cn-labor-dialog')).includes('尚未任职'));
 }
 if(!registered){
  // The same actual apply button waits visibly while the employer is away.
  button('申请酒楼帮工').onclick();assert.equal(labor.view().waitingRegistration,'apply');assert(labor.isOpen());assert(!employment.isHired());assert(!labor.active());
  button('取消等候').onclick();assert.equal(labor.view().waitingRegistration,null);assert(!employment.isHired());
  button('申请酒楼帮工').onclick();assert.equal(labor.view().waitingRegistration,'apply');labor.close();host.root.position.fromArray(P.host);frame(2);assert(!employment.isHired(),'closing wait cancels the pending registration');
  host.root.position.fromArray(P.hostPass);labor.open();button('申请酒楼帮工').onclick();assert.equal(labor.view().waitingRegistration,'apply');host.root.position.fromArray(P.host);assert(wait(()=>employment.isHired(),'explicit temporary application after host returns').arrived);assert(!labor.active());assert(!r.formalCareers.state().tenure);
 }
}
labor.close();r.careerHandbook.close();frame(2);console.log('NEARBY_REGISTRATION',JSON.stringify({temporary:employment.state().roleId,formal:r.formalCareers.state().tenure,intent:labor.intent(),nearest:state().nearest,shown:!ids.interaction.hidden}));
assert(checks.every(x=>x.arrived),'every published staff-stage snapshot remains approachable');assert.equal(labor.intent().kind,'view','temporary hiring must not remove the nearby registration entry');assert.equal(state().nearest,'cn-tavern-labor-view');assert(!ids.interaction.hidden);ids['interact-button'].onclick();assert(labor.isOpen());button('查看正式职位与申请条件').onclick();assert(r.careerHandbook.isOpen());assert(!r.formalCareers.state().tenure);assert(!labor.active());
const career=find(document.body,e=>e.className==='career-dialog');assert(find(career,e=>e.tagName==='button'&&e.textContent==='条件不足 · 暂不可申请')?.disabled,'formal eligibility remains explicit at the real counter');
ids['return-world'].onclick();console.log(JSON.stringify({status:'PASS',seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'One China scene, held production staff-stage snapshots and real player routes; simulated DOM, no browser claim',checks}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-tavern-employment-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
