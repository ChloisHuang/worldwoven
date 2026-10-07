// Real main issue → separate-process cold boot regression, simulated DOM/renderer.
// Isolated seed/clock and completed court prerequisites; no invitation receipt or title seed.
// Scenario seeds and initial legal player approach are explicitly reported.
if(!process.env.INVITATION_COLD_PHASE&&!process.env.INVITATION_COLD_INPUT){
 const {execFileSync}=require('node:child_process');
 execFileSync(process.execPath,['--experimental-vm-modules',__filename],{stdio:'inherit',env:{...process.env,INVITATION_COLD_PHASE:'issue'}});
 execFileSync(process.execPath,['--experimental-vm-modules',__filename],{stdio:'inherit',env:{...process.env,INVITATION_COLD_INPUT:'qa/invitation-cold-restore/issued.json'}});
 process.exit(0);
}
const fs=require('node:fs'),vm=require('node:vm'),startedAt=Date.now();
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function nearbyReview(){return {player,npcs,lot,furniture,camera,navOptions,contextMenu,npcSocial,playerConversationUI,playerConversations,chinaConsortCourt,consortBridge,chinaConsortUI,chinaEdict,chinaPalace,chinaAudience,franceGardener,franceLabor,formalCareers,careerHandbook,simulationClock};}
export function nearbyStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);refreshNearbyChoices(true);}
export function nearbyView(angle){viewport={left:0,top:0,width:844,height:390};camera.aspect=844/390;camera.updateProjectionMatrix();yaw=angle;pitch=.15;distance=4.6;updateCamera(1,true);camera.updateMatrixWorld(true);refreshNearbyChoices(true);updateLabels();contextMenu.project();}
export {blocked,save,enterRegion,requestStationIntent,interactionIdentity,advanceWorldClock};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule((process.env.NEARBY_GIT_SOURCE?require('node:child_process').execFileSync('git',['show',process.env.NEARBY_GIT_SOURCE+':'+path.relative(process.cwd(),file)],{encoding:'utf8',maxBuffer:8*1024*1024}):fs.readFileSync(file,'utf8'))+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url="file://"+file;}}');
harness=harness.replace('get offsetWidth(){return 100}', 'get offsetWidth(){return 72}get offsetHeight(){return 32}');
harness=harness.replace('add(...e){this.append(...e)}',`prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}insertBefore(e,next){e.remove?.();e.parent=this;const i=next?this.children.indexOf(next):this.children.length;this.children.splice(i,0,e);}contains(e){return e===this||this.children.some(c=>c.contains?.(e));}querySelectorAll(s){const match=e=>s.startsWith('[')?e.getAttribute?.(s.slice(1,-1))!==undefined:s.startsWith('.')?e.className?.split(' ').includes(s.slice(1)):e.tagName===s;return this.children.flatMap(e=>[...(match(e)?[e]:[]),...(e.querySelectorAll?.(s)||[])]);}getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()];}add(...e){this.append(...e)}`);
harness=harness.replace("body:new E('body'),hidden", "head:new E('head'),body:new E('body'),hidden");
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.NEARBY_SCENARIO?.startsWith('invitation')){const prior=JSON.parse(storage['worlds-days-v1']);prior.appearance.seed=4;storage['worlds-days-v1']=JSON.stringify(prior);}const main=mod(path.join(root,'game/main.js'));");

harness=harness.replace('setItem:(k,v)=>storage[k]=v','setItem:(k,v)=>{if(context.failSave)return false;return storage[k]=v;}');
const input=process.env.INVITATION_COLD_INPUT;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));", `if(${JSON.stringify(input||'')})storage['worlds-days-v1']=fs.readFileSync(${JSON.stringify(input||'')},'utf8');else {const seed=JSON.parse(storage['worlds-days-v1']);seed.appearance.seed=4;seed.simulationClock={version:1,seconds:(22.65*60-600)/.7};seed.chinaAudience={day:0,calledDay:0,outcome:'completed',lastCompletedDay:0};seed.chinaEdict={lastDay:0,lastReceipt:'cn-morning-audience:0',outcome:'completed',completedReceipt:'cn-morning-audience:0',consumedThroughDay:0};storage['worlds-days-v1']=JSON.stringify(seed);}const main=mod(path.join(root,'game/main.js'));`);
harness=harness.replace("assert.equal(state().mode,'globe');", "assert.equal(state().mode,process.env.INVITATION_COLD_INPUT?'lot':'globe');");
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const api=main.namespace,out='qa/invitation-cold-restore';fs.mkdirSync(out,{recursive:true});
if(!process.env.INVITATION_COLD_INPUT)api.enterRegion('china');
let r=api.nearbyReview(),p=r.consortBridge.ledger.petition();
if(!process.env.INVITATION_COLD_INPUT){
 assert.equal(p,null);console.log('SETUP',JSON.stringify({court:r.chinaAudience.courtStatus(),edict:r.chinaEdict.heraldAvailability('consort-petition')}));
 // Isolated test clock and completed court/edict prerequisite only. No invitation,
 // receipt, approval, relationship or title is seeded. Original NPC walks itself.
 r.player.root.position.set(-9.1,.145,-19.6);
 let frames=0;for(;frames<2500&&!r.consortBridge.ledger.petition();frames++){now+=100;api.nearbyStep(.1);if(frames%100===0)console.log('STEP',frames,JSON.stringify(r.chinaPalace.state().actors.find(n=>n.id==='cn-emperor')));}
 p=r.consortBridge.ledger.petition();assert(p&&p.source==='emperor-invitation','actual palace opportunity issues invitation');assert.equal(p.choice,null);assert.equal(p.stage,'awaiting-choice');
 assert(api.save());fs.writeFileSync(out+'/issued.json',storage['worlds-days-v1']);console.log('PASS natural service issue saved',p.id,p.submittedAt);
}else{
 assert(p&&p.stage==='awaiting-choice','fresh main runtime keeps same pending invitation');const before=JSON.parse(fs.readFileSync(process.env.INVITATION_COLD_INPUT,'utf8')).consortPetitions;
 assert.deepEqual(JSON.parse(JSON.stringify(r.consortBridge.ledger.state().petitions)),before.petitions);assert.equal(p.choice,null);assert.equal(r.chinaConsortCourt.interactionTarget().targetKey,'cn-emperor');
 // Advance 22 game minutes without wall-time catch-up or reissuing invitation.
 for(let i=0;i<126;i++)api.advanceWorldClock(.25);r.chinaConsortCourt.update(.1,0,{});assert.equal(r.consortBridge.ledger.petition().stage,'awaiting-choice');assert.equal(r.consortBridge.ledger.state().revision,before.revision);
 assert(api.save());fs.writeFileSync(out+'/restored.json',storage['worlds-days-v1']);console.log('PASS cold runtime plus 22 simulated minutes',p.id,state().simulationClock);
 const durable=storage['worlds-days-v1'];context.failSave=true;assert.equal(r.chinaConsortCourt.respond('decline').code,'save-failed');assert.equal(r.consortBridge.ledger.petition().choice,null);assert.equal(storage['worlds-days-v1'],durable);context.failSave=false;
 assert(r.chinaConsortCourt.respond('decline').ok);const revision=r.consortBridge.ledger.state().revision;r.chinaConsortCourt.respond('decline');assert.equal(r.consortBridge.ledger.state().revision,revision);assert.equal(r.consortBridge.ledger.appointment(),null);api.save();fs.writeFileSync(out+'/declined.json',storage['worlds-days-v1']);console.log('PASS main save failure then one explicit decline, no duplicate or title');
}
return;
`;
harness=harness.slice(0,begin)+body+"})().catch(e=>{console.error(e);process.exit(1)});";
new vm.Script(harness,{filename:'tests/invitation-cold-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({startedAt,structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
