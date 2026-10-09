// Real main/Three, original 31 bodies, native navigation and meeting controller.
// A past reported/released crime is an explicit engine-produced test input;
// this is NOT evidence of naturally observing or policing that past incident.
// Run serial under the shared lock, 768MiB heap/1152MiB tree/180s hard limit.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('Changed seam '+a);harness=harness.replace(a,b);}
const extra=`
export function caseFixtureEnter(){travelJourneyUI.close();return enterRegion('china');}
export function caseReview(){return {chinaCriminalCases,chinaCriminalCasePanel,crimeRuntime,player,npcs,lot,navOptions,npcSocial,chinaAudience,path,targetStation,pendingInteraction,saved,copperLedger};}
export function caseStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);}
export function caseConditions(){return {standing:personnelPlayerStanding(),walking:player.walking,busy:{menu:interactionMenuOpen(),performing:!!performing,pending:!!pendingInteraction,social:npcSocial?.active(),toilet:activeDailyToilet()?.active(),personnel:chinaPersonnelCareer?.isActing(),appointment:chinaPersonnelAppointment?.isActing(),career:chinaCareer?.isActing(),crime:crimeRuntime?.activeAction()},detained:crimeRuntime?.status()?.detained};}
export {requestStationIntent,save,blocked,nearbyChoices,cancelAction,enterRegion};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}',"prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.replaceChildren();}add(...e){this.append(...e)}");
once("const main=mod(path.join(root,'game/main.js'));",String.raw`
const out='qa/criminal-case-main';fs.mkdirSync(out,{recursive:true});
const restored=process.env.CRIMINAL_MAIN_FROM;
if(restored)storage['worlds-days-v1']=fs.readFileSync(restored,'utf8');
else {
 const cm=mod(path.join(root,'game/crime-consequences.js'));await cm.link(linker);await cm.evaluate();
 const pos={x:20.3,y:3.915,z:32.2},person=id=>({id,key:id+'@original',position:{...pos},countryId:'china',sceneId:'china',alive:true,awake:true,available:true});
 const suspect=person('cn-palace-herald'),justice=person('cn-official-justice'),victim=person('cn-official-records'),guard=person('cn-range-warden'),people=[suspect,justice,victim];
 const c=cm.namespace.createCrimeConsequences({actors:()=>people,guards:()=>[guard],items:[{id:'cn-sealed-patrol-token',ownerId:'cn-palace-patrol',countryId:'china',sceneId:'china',position:{x:-24,y:-4.1,z:35.7}}],jail:()=>({countryId:'china',sceneId:'china',entry:pos,cell:pos,release:pos}),hasLineOfSight:()=>true,custodySeconds:1,persist:()=>true});
 assert(c.harm(suspect.key,victim.key).ok);const sourceId=c.snapshot().cases[0].id;assert(c.report(justice.key,sourceId).ok);assert(c.report(victim.key,sourceId).ok);
 for(let i=0;i<12;i++)c.update(1);assert.equal(c.snapshot().cases[0].status,'released');for(const effect of c.pendingEffects())assert(c.ackEffect(effect.id).ok);
 const old=JSON.parse(storage['worlds-days-v1']);old.crimeConsequences={china:{engine:JSON.parse(JSON.stringify(c.snapshot())),leases:{},socialPending:[]}};storage['worlds-days-v1']=JSON.stringify(old);
}
const main=mod(path.join(root,'game/main.js'));`);
const begin=harness.indexOf('const report=[];for(let round=0;');harness=harness.slice(0,begin)+String.raw`
const started=Date.now();assert(main.namespace.caseFixtureEnter(),'direct scene fixture entry; travel system unchanged');let r=main.namespace.caseReview();assert.equal(r.npcs.length,31);
const stage=()=>r.chinaCriminalCases.core.list()[0]?.stage,caseId=r.chinaCriminalCases.core.list()[0]?.id;assert(caseId,'reported original source appears');
const who=id=>r.npcs.find(n=>n.station.id===id),pos=n=>n.root.position.toArray(),gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
let frames=0,travel=0;const checks=[],initialSource=JSON.stringify(r.crimeRuntime.snapshot().engine.cases),wallet=JSON.stringify(r.copperLedger.snapshot());
const summary=()=>({stage:stage(),player:pos(r.player),justice:pos(who('cn-official-justice')),justiceWalking:who('cn-official-justice').walking,audience:r.chinaAudience.state().phase,meeting:r.npcSocial.meetingState(),activity:r.chinaCriminalCases.state().activity,path:main.namespace.caseReview().path.length,pending:main.namespace.caseReview().pendingInteraction?.kind,toast:ids.toast.textContent});
function checkpoint(label){assert(main.namespace.save());fs.writeFileSync(out+'/'+label+'.json',storage['worlds-days-v1']);}
function step(){const p=pos(r.player);main.namespace.caseStep(.1);frames++;const distance=gap(p,pos(r.player));assert(distance<.65,'no player teleport during action/navigation');travel+=distance;if(frames%100===0)console.log('CASE',frames,JSON.stringify(summary()));if(Date.now()-started>135000){checkpoint('progress-'+stage());throw Error('bounded continuation saved '+JSON.stringify(summary()));}}
function until(fn,label,max=6000){for(let i=0;i<max&&!fn();i++)step();if(!fn())checkpoint('progress-'+stage());assert(fn(),label+' '+JSON.stringify(summary()));}
if(!restored){
 // Explicit legal test starting checkpoint, prior to any judiciary action.
 const start=[20.53,3.915,32.15];assert(!main.namespace.blocked(start[0],start[2],r.lot.colliders,.34,{...r.navOptions,y:start[1]}));r.player.root.position.fromArray(start);r.player.walking=false;
}
assert(r.chinaCriminalCases.choices().some(i=>i.kind==='board'));
if(stage()==='archived'){
 const before=JSON.stringify(r.chinaCriminalCases.snapshot());const board=main.namespace.nearbyChoices(true).nearby.find(i=>i.provider==='china-criminal-cases'&&i.kind==='board');assert(board,'original desk is discoverable through actual nearby UI');assert(main.namespace.requestStationIntent(board));assert(r.chinaCriminalCasePanel.isOpen(),'actual original desk action opens case panel');r.chinaCriminalCasePanel.close();assert.equal(JSON.stringify(r.chinaCriminalCases.snapshot()),before);assert.equal(r.chinaCriminalCases.intent(caseId),null);assert.equal(r.chinaCriminalCases.core.view(caseId).outcome.code,'sentence-already-served');checkpoint('cold-verified');console.log(JSON.stringify({status:'PASS',scope:'Independent cold main rehydrates exact original case archive; open/close produces no new receipt',frames,travel,summary:summary()}));return;
}
for(const expected of ['intake','scene','witness','review','archive']){
 if(['intake','scene','witness','review','archive'].indexOf(stage())>['intake','scene','witness','review','archive'].indexOf(expected))continue;
 assert.equal(stage(),expected);
 until(()=>!!r.chinaCriminalCases.intent(caseId),'original target available');
 let attempt=0;
 while(stage()===expected&&attempt++<6){const next=r.chinaCriminalCases.intent(caseId);if(!next){step();continue;}console.log('CASE REQUEST',JSON.stringify({expected,action:next.action,position:next.position,conditions:main.namespace.caseConditions(),resolved:!!r.chinaCriminalCases.resolveIntent(next)}));if(!main.namespace.requestStationIntent(next)){for(let i=0;i<10;i++)step();continue;}
  until(()=>r.chinaCriminalCases.isActing()||!main.namespace.caseReview().pendingInteraction,'arrived or original intent changed');
  if(!r.chinaCriminalCases.isActing()){for(let i=0;i<5;i++)step();continue;}
  while(r.chinaCriminalCases.state().activity?.elapsed<1.8)step();assert.equal(stage(),expected,'less than 2 seconds alone cannot commit');until(()=>stage()!==expected||!r.chinaCriminalCases.isActing(),'original step finished',30);
 }
 assert.notEqual(stage(),expected,'finite actual retry completed '+expected+' '+JSON.stringify(summary()));checks.push(expected);checkpoint('after-'+expected);
}
assert.equal(stage(),'archived');assert.equal(r.npcSocial.meetingState(),null);assert.equal(JSON.stringify(r.crimeRuntime.snapshot().engine.cases),initialSource);assert.equal(JSON.stringify(r.copperLedger.snapshot()),wallet);assert.equal(r.chinaCriminalCases.core.view(caseId).outcome.code,'sentence-already-served');assert(main.namespace.save());checkpoint('completed');
console.log(JSON.stringify({status:'PASS',scope:'Engine-generated past crime is staged input; actual original main physical five-step review, nav and meetings; simulated DOM/renderer, not GPU/iOS',checks,frames,travel,summary:summary()}));
})().catch(e=>{if(storage['worlds-days-v1'])fs.writeFileSync('qa/criminal-case-main/failed-last-save.json',storage['worlds-days-v1']);console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/china-criminal-case-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:path.resolve('tests'),__filename});
