// One bounded Japanese scene: remote registration/change and manual same action.
// Bath delivery/dining/NPC matrices reuse their existing evidence.
// Simulated DOM/renderer only; this is not browser or iOS layout evidence.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras='\nexport function serviceIntentReview(){return {player,furniture,japanPlayerService,japanService,japanServiceUI};} export function serviceIntentStep(dt){elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);japanServiceUI?.update();} export {navigateTo};';
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace("const document={body:new E('body')","const document={head:new E('head'),body:new E('body')");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const checks=[],record=s=>{checks.push(s);console.log('PASS',s);},T=three.namespace;
all.find(e=>e.dataset.region==='japan').onclick();ids.travel.onclick();assert.equal(state().region,'japan');
const r=main.namespace.serviceIntentReview(),service=r.japanPlayerService,ui=r.japanServiceUI;
const find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),dialog=()=>find(document.body,e=>e.className==='jp-service-dialog'),primary=()=>find(dialog(),e=>e.className==='jp-service-primary'),card=()=>{ui.open();return primary();};
const frame=(n=1)=>{for(let i=0;i<n;i++){now+=100;main.namespace.serviceIntentStep(.1);assert.equal(r.japanService.state().failures.length,0,'Shared staff route failure '+JSON.stringify({failures:r.japanService.state().failures,player:state().player,visit:service.state().visit,facilities:r.furniture.facilities.state().filter(f=>f.id==='japan-service-reception'),actors:r.japanService.state().actors.filter(a=>a.id==='jp-welcome'||a.id.startsWith('jp-visit'))}));}};
const until=(pred,label,max=1100)=>{for(let i=0;i<max;i++){if(pred())return;frame();if(i&&i%200===0)console.log('WAIT',label,JSON.stringify({player:state().player,stage:service.state().visit?.stage,activity:service.state().activity?.event,path:state().pathLength,pending:state().pendingInteraction}));}throw Error(label+' '+JSON.stringify({player:state().player,service:service.state(),path:state().pathLength,pending:state().pendingInteraction,toast:ids.toast.textContent}));};
const key=c=>events.keydown({code:c,repeat:false,preventDefault(){}}),release=c=>events.keyup({code:c}),walk=p=>{main.namespace.navigateTo(new T.Vector3(...p));until(()=>!state().pathLength,'manual destination');frame(2);};
console.log('SCENE_READY',JSON.stringify({player:state().player,npcCount:state().npcCount}));
const first=card();assert.equal(first.textContent,'登记并领取浴牌');first.onclick();const queued=state().pathLength;first.onclick();assert.equal(state().pathLength,queued);until(()=>service.state().visit?.stage==='changing','single-click remote registration');
const visit=service.state().visit;assert(visit.tokenId);assert.equal(r.japanService.state().items.filter(i=>i.visitId===visit.id&&i.kind==='token').length,1);
record('remote registration creates one real numbered token');
const change=card();assert.equal(change.textContent,'整理入浴衣着');change.onclick();until(()=>service.state().activity?.event==='changed','single-click remote changing');assert.equal(state().pendingInteraction,null);assert.equal(service.state().visit.id,visit.id);record('remote register and change execute once on arrival without a second E');
// Interrupt before real process duration completes, then approach independently.
key('KeyD');frame();release('KeyD');assert.equal(service.state().activity,null);assert.equal(service.state().visit.stage,'changing');
const changing=ui.currentIntent().position;walk([changing[0]+.22,changing[1],changing[2]]);assert.equal(ui.target()?.serviceStep.kind,'change');assert(ids['interact-button'].textContent.includes('更衣'));key('KeyE');assert.equal(state().pathLength,0,'manual legal radius needs no alignment route');until(()=>service.state().visit.stage==='washing','manual changing');record('manual approach exposes the same change action; movement cancels only active intent');
assert.equal(r.japanService.state().items.filter(i=>i.visitId===visit.id&&i.kind==='token').length,1);assert.equal(service.state().visit.id,visit.id);change.onclick();assert.equal(state().pendingInteraction,null,'old change button cannot repeat after stage changes');assert.equal(service.state().visit.stage,'washing');record('old change choice is stale after completion and preserves the same token');
card();find(dialog(),e=>e.textContent==='取消本次服务').onclick();assert.equal(service.state().visit,null);
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);console.log(JSON.stringify({status:'PASS',scope:'Actual main remote register/change and independent manual change only; simulated DOM/renderer, no browser/iOS claim',checks,simulatedSeconds:now/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/japan-service-intents-inherited.cjs'}).runInNewContext({require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
