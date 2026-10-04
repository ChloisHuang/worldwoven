// One actual China seat and host handover; reuse the existing full kitchen chain.
// Real scene/controller/doors with simulated DOM and renderer, not browser/iOS QA.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras='\nexport function mealIntentReview(){return {player,furniture,chinaTavern,chinaTavernUI,chinaLabor};} export function mealIntentStep(dt){elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaTavernUI?.update();} export {navigateTo};';
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const started=Date.now(),checks=[],T=three.namespace,record=s=>{checks.push(s);console.log('PASS',s);};
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();const r=main.namespace.mealIntentReview(),ui=r.chinaTavernUI,service=r.chinaTavern;
const identity=JSON.stringify(state().playerLook),seat=service.seats.find(s=>s.id==='china-tavern-dining-18.1--1');assert(seat);
const frame=(n=1)=>{for(let i=0;i<n;i++){now+=100;main.namespace.mealIntentStep(.1);assert(Date.now()-started<170000,'time bound');assert(process.memoryUsage().rss<1.2*1024**3,'memory bound');assert.equal(service.state().failures.length,0);}};
const until=(pred,label,max=600)=>{for(let i=0;i<max;i++){if(pred())return;frame();}throw Error(label+' '+JSON.stringify({player:state().player,seated:state().seated,order:service.state().order,pending:state().pendingInteraction,path:state().pathLength,toast:ids.toast.textContent}));};
const find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),dialog=()=>find(document.body,e=>e.className==='cn-meal-dialog'),badge=find(document.body,e=>e.className==='cn-meal-ticket');
const button=text=>{const b=find(dialog(),e=>e.tagName==='button'&&e.textContent===text);assert(b,text);assert(!b.disabled,text);return b;};
const key=c=>events.keydown({code:c,repeat:false,preventDefault(){}}),up=c=>events.keyup({code:c});
r.player.root.position.set(22.1,.215,12.5);frame(2);assert(!badge.hidden,'visible near real reception');ui.open();const old=button('在西窗桌 · 里侧点菌菇饭');old.onclick();const count=state().pathLength;assert(count>0);old.onclick();assert.equal(state().pathLength,count);assert.equal(service.state().order,null);
key('KeyD');frame();up('KeyD');assert.equal(state().pendingInteraction,null);assert.equal(service.state().order,null);old.onclick();assert.equal(state().pendingInteraction,null);record('remote menu selection shares one route; movement and old callback cannot order');
ui.open();button('在西窗桌 · 里侧点菌菇饭').onclick();until(()=>!!service.state().order,'automatic same-seat meal');const first=service.state().order;assert.equal(state().seated,seat.id);assert.equal(first.seatId,seat.id);assert.equal(service.state().history.filter(h=>h.event==='requested').length,1);old.onclick();assert.equal(service.state().serial,first.number);
until(()=>service.state().history.some(h=>h.event==='accepted-at-table'&&h.orderId===first.id),'real host accepted at original seat');assert(!r.chinaLabor.view().hostAvailable,'same host unavailable to labor during meal');record('single choice physically seats player and Xu An accepts the one real order at that same table');
ui.open();button('取消这份饭').onclick();assert.equal(service.state().order,null);key('KeyE');frame();assert.equal(state().seated,null);
// Independent walk and E use the normal furniture action; no meal route flag.
main.namespace.navigateTo(new T.Vector3(...seat.position));until(()=>!state().pathLength,'manual chair approach');frame(2);key('KeyE');assert.equal(state().seated,seat.id);assert.equal(service.state().order,null);ui.open();const manual=button('招呼掌柜 · 点菌菇饭');manual.onclick();manual.onclick();assert.equal(service.state().serial,first.number+1);assert.equal(service.state().history.filter(h=>h.event==='requested').length,2);assert.equal(state().pendingInteraction,null);assert.equal(JSON.stringify(state().playerLook),identity);record('independent manual chair arrival still orders once and keeps player identity');
ui.update();assert(!badge.hidden);ui.close();r.player.root.position.set(22.1,4.215,12.5);ui.update();assert(badge.hidden,'cross-floor badge hidden even with existing order');r.player.root.position.set(0,.215,0);ui.update();assert(badge.hidden,'distant badge hidden even with existing order');ui.open();assert(ui.isOpen(),'existing order remains inspectable by explicit menu');ui.close();
ids['return-world'].onclick();assert.equal(service.state().order,null);manual.onclick();assert.equal(service.state().order,null);assert.equal(state().characterResources.activeReferences,0);record('order status stays inspectable without remote badge; leaving disposes meal and stale buttons');
console.log(JSON.stringify({status:'PASS',checks,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'One real China seat and host acceptance, simulated DOM/renderer; full existing kitchen chain reused'}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-tavern-meal-intents-inherited.cjs'}).runInNewContext({require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
