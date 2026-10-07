// ST05 production main integration: an original adult cast is staged once at a
// legal outdoor checkpoint, then normal choices, navigation, pursuit and custody
// own every change. The stub renderer is not visual acceptance of the prison.
const fs=require('node:fs'),vm=require('node:vm');
const mainSource=fs.readFileSync('source/game/main.js','utf8'),gateSource=mainSource.slice(mainSource.indexOf('function crimeParticipant(id){'),mainSource.indexOf('\nfunction configureCrime()'));
const ageFixtures={minor:{ageYears:17,station:{}},child:{station:{isChild:true}},legacy:{station:{}},adult:{ageYears:24,station:{ageYears:24}}};
const originalAges=JSON.stringify(ageFixtures),gate=vm.runInNewContext('('+gateSource+')',{socialActor:id=>ageFixtures[id],saved:{playerProfile:{ageYears:24}}});
if(gate('minor')!==false||gate('child')!==false||gate('legacy')!==true||gate('adult')!==true||JSON.stringify(ageFixtures)!==originalAges)throw Error('crime participation must preserve ages, exclude explicit minors, and permit existing unaged non-child roles');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function crimeReview(){return {crimeRuntime,player,npcs,lot,navOptions,gameHealth,relationshipEvents};}
export function crimeStep(dt){if(paused||mode!=='lot')return;beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);}
export function crimeWalk(to){path=planPath(player.root.position,new THREE.Vector3(...to));return path.length;}
export function crimeCheckpoint(){save();return JSON.parse(JSON.stringify(saved));}
export function crimeWallet(){return copperLedger.snapshot();}
export function crimeNPCReadiness(){return npcs.map(n=>({id:n.actorId||n.station.id,mode:npcPublicMode(n,{ignoreVisibility:true}),adult:socialAdult(n.actorId||n.station.id),crimeEligible:crimeParticipant(n.actorId||n.station.id),reliability:getNPCProfile(n.actorId||n.station.id).values?.reliability??.5}));}
export function crimeOwnerReview(id){const n=socialActor(id);return {crime:crimeRuntime?.owns(n),socialHeld:isSociallyHeld(id),salonOwned:chinaSalon?.owns(n),salonLife:chinaSalon?.state()?.life?.actors?.find(a=>a.id===id)||null};}
export {currentControl,executeNearbyAction,nearbyChoices,blocked,crimeParticipant};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
harness=harness.replace("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
// A separate branch starts after an elapsed previous day, so its documented
// relationship fixture has truthful past timestamps rather than future events.
if(process.argv.includes('--npc-only'))harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","const prior=JSON.parse(storage['worlds-days-v1']);prior.simulationClock={version:1,seconds:2000};storage['worlds-days-v1']=JSON.stringify(prior);const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const started=Date.now(),out='qa/crime-consequences-main';fs.mkdirSync(out,{recursive:true});
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
let r=main.namespace.crimeReview(),frames=0,phase=null,travel=0,trackedNpc=null,npcTravel=0;const checks=[],phases=[],samples=[];
const victimId='cn-palace-herald',witnessId='cn-official-justice';
const who=id=>r.npcs.find(n=>(n.actorId||n.station.id)===id);
const engine=()=>r.crimeRuntime.snapshot().engine;
const latest=()=>engine().cases.at(-1);
const pos=n=>n.root.position.toArray();
const meters=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const snapshot=()=>({player:pos(r.player),subject:trackedNpc?{position:pos(trackedNpc),owner:main.namespace.crimeOwnerReview(trackedNpc.actorId||trackedNpc.station.id)}:null,case:latest(),orders:r.crimeRuntime.model.orders(),action:r.crimeRuntime.activeAction(),toast:ids.toast.textContent,guards:['cn-archery','cn-range-warden'].map(id=>({id,p:pos(who(id)),held:r.crimeRuntime.owns(who(id)),route:who(id).route?.length}))});
function step(){const p=pos(r.player),np=trackedNpc?pos(trackedNpc):null;main.namespace.crimeStep(.1);frames++;const moved=meters(p,pos(r.player));assert(moved<.65,'no teleport in active navigation '+moved);travel+=moved;if(np){const changed=meters(np,pos(trackedNpc));assert(changed<.65,'NPC route never teleports '+changed);npcTravel+=changed;}
 const next=latest()?.status;if(next!==phase){phase=next;phases.push(next||'clear');samples.push(snapshot());console.log('ST05 phase',frames,JSON.stringify(snapshot()));}
 if(frames%100===0)console.log('ST05 main',frames,JSON.stringify(snapshot()));
 assert(process.memoryUsage().rss<1.2*1024**3,'RSS');assert(Date.now()-started<295000,'timeout');}
function until(fn,message,max=1600){for(let i=0;i<max&&!fn();i++)step();assert(fn(),message+' '+JSON.stringify(snapshot()));}
function choice(){return main.namespace.nearbyChoices(true).nearby.find(x=>x.crime&&x.kind==='harm'&&x.victimId===victimId);}
const wallet=JSON.stringify(main.namespace.crimeWallet());
const identity=()=>JSON.stringify([r.player,...r.npcs].map(n=>({id:n.actorId||n.station?.id||'player',life:n.lifeId||n.station?.lifeId||null,look:n.root.userData.appearance})));const identities=identity();
const ages=()=>JSON.stringify([r.player,...r.npcs].map(n=>({id:n.actorId||n.station?.id||'player',ageYears:n.ageYears,age:n.age,stationAgeYears:n.station?.ageYears,stationAge:n.station?.age})));const ageIdentity=ages();
for(const id of['cn-tea','cn-archery','cn-range-warden'])assert(main.namespace.crimeParticipant(id),'existing unaged non-child participates: '+id);assert.equal(ages(),ageIdentity);
if(process.argv.includes('--npc-only')){
 const candidates=main.namespace.crimeNPCReadiness();console.log('ST05 NPC readiness',JSON.stringify(candidates));
 const chosen=candidates.find(n=>n.id!==victimId&&n.mode==='leave'&&n.adult&&n.reliability<.55);assert(chosen,'an original available adult with existing low reliability');
 const aggressor=who(chosen.id),target=who(victimId),clock=state().simulationClock.seconds;
 // Documented fixture: prior completed, source-confirmed service failures build
 // directional distrust through the real relationship ledger and cooldowns.
 // No crime case, NPC personality or current controller availability is seeded.
 for(let i=0;i<32;i++)assert(r.relationshipEvents.record({id:'st05-prior-failure-'+i,source:'fixture-confirmed-service',actorId:victimId,participants:[victimId,chosen.id],outcome:'failed',fault:true,kind:'service-handoff',at:clock-(31-i)*60-1}).ok);
 const relation=r.relationshipEvents.pair(chosen.id,victimId);assert(relation.aversion>.42&&relation.trust<-.35);assert(clock-relation.last.at<180);
 for(const [n,p]of[[r.player,[-13.5,.115,25.5]],[aggressor,[-14,.115,26.8]],[target,[-13.22,.115,26.8]],[who('cn-archery'),[-17,.115,26.8]],[who('cn-range-warden'),[-18,.115,25.5]]]){
  assert(!main.namespace.blocked(p[0],p[2],r.lot.colliders,n===r.player?.34:.25,{...r.navOptions,y:p[1]}),'legal NPC fixture checkpoint '+(n.station?.id||'player')+' '+p);n.root.position.fromArray(p);n.route=[];n.walking=false;n.breakAt=100000;
 }
 trackedNpc=aggressor;const originalOwner=main.namespace.crimeOwnerReview(chosen.id),originalHome=aggressor.home.toArray();assert(originalOwner.salonOwned&&!originalOwner.crime,'existing salon still owns original artist');
 const before=JSON.stringify(r.gameHealth.snapshot().health.injuryReceipts);until(()=>r.crimeRuntime.activeAction()?.actorId===chosen.id,'production autonomous choice from original personality and real directional history',50);
 assert.equal(r.crimeRuntime.activeAction().victimId,victimId);assert.equal(engine().cases.length,0);assert.equal(JSON.stringify(r.gameHealth.snapshot().health.injuryReceipts),before,'decision alone causes no injury');
 until(()=>engine().cases.some(c=>c.subjectId===chosen.id),'autonomous original NPC completes actual close-contact windup',50);
 const c=latest();assert.equal(c.subjectId,chosen.id);assert.equal(c.victimId,victimId);assert(r.gameHealth.snapshot().health.injuryReceipts[c.id+':harm']);assert.equal(r.gameHealth.snapshot().health.people[victimId].conditions['impact-bruise'].stage,'ill');assert(c.evidence.some(e=>e.witnessId===victimId));assert.equal(JSON.stringify(main.namespace.crimeWallet()),wallet);assert.equal(identity(),identities);
 checks.push('Original adult NPC autonomously chooses from existing personality and documented, cooldown-spaced prior fault history; a real windup and close contact then commit one injury and informed evidence');
 until(()=>latest()?.status==='escort','guard physically catches autonomous original NPC',450);const guardId=latest().guardKey.split('@')[0];assert(meters(pos(who(guardId)),pos(aggressor))<1.7);assert(r.crimeRuntime.owns(aggressor),'crime borrows actual NPC movement only after arrest');assert.equal(r.crimeRuntime.controlsPlayer(),false,'NPC arrest cannot seize bystander player');
 until(()=>latest()?.status==='custody','original NPC and guard physically enter cell route',1900);assert(aggressor.root.position.y<-3.8);assert(meters(pos(aggressor),r.lot.holdingCell.detention)<=.6);assert(r.crimeRuntime.owns(aggressor));assert(main.namespace.crimeOwnerReview(chosen.id).salonOwned,'permanent original owner is retained during temporary custody');assert(npcTravel>8);
 const serving=latest().custodyRemaining;document.hidden=true;events.visibilitychange();for(let i=0;i<20;i++)main.namespace.crimeStep(.1);assert.equal(latest().custodyRemaining,serving);document.hidden=false;events.visibilitychange();
 until(()=>latest()?.status==='releasing','NPC custody advances only in active simulation',650);until(()=>latest()?.status==='released','NPC walks the same actual stairs back to public courtyard',1900);
 assert(aggressor.root.position.y>-.2);assert(meters(pos(aggressor),r.lot.holdingCell.release)<.8);assert(!r.crimeRuntime.owns(aggressor));assert(!r.crimeRuntime.owns(who(guardId)));assert.equal(r.crimeRuntime.controlsPlayer(),false);
 const releasedAt=pos(aggressor);until(()=>{const o=main.namespace.crimeOwnerReview(chosen.id);return o.salonOwned&&!o.crime&&!o.socialHeld&&o.salonLife?.phase==='returning'&&meters(pos(aggressor),releasedAt)>.65;},'original salon life resumes its own physical return route',150);
 const resumed=main.namespace.crimeOwnerReview(chosen.id);assert.deepEqual([...resumed.salonLife.target],originalHome);assert(aggressor.walking&&meters(pos(aggressor),originalHome)<meters(releasedAt,originalHome),'original owner physically progresses along its own home route');assert.equal(engine().cases.length,1);assert.equal(JSON.stringify(main.namespace.crimeWallet()),wallet);assert.equal(identity(),identities);assert.equal(ages(),ageIdentity,'no explicit or absent actor ages changed');
 checks.push('Actual NPC movement lease survives arrest, physical underground escort and active-time custody, then releases back to original salon life and its real return route; player remains a bystander and wallet/ages/identities stay unchanged');
 const result={status:'PASS',scope:'Production autonomous NPC source, guard arrest, temporary custody and original-owner resumption with explicit historical relationship fixture; no forced crime state or action invocation',aggressor:chosen,relation,checks,frames,npcTravel,phases,case:latest(),resumed,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024};fs.writeFileSync(out+'/npc-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));return;
}
// Only initial actor placement is staged; there is no mutation of crime cases,
// health, official posts, social evidence or controller state in this fixture.
for(const [n,p]of[[r.player,[-14,.115,26.8]],[who(victimId),[-13.22,.115,26.8]],[who(witnessId),[-13.5,.115,25.5]],[who('cn-archery'),[-17,.115,26.8]],[who('cn-range-warden'),[-18,.115,25.5]]]){
 assert(n,'original actor exists');assert(!main.namespace.blocked(p[0],p[2],r.lot.colliders,n===r.player?.34:.25,{...r.navOptions,y:p[1]}),'legal outdoor checkpoint '+(n.station?.id||'player'));n.root.position.fromArray(p);n.route=[];n.walking=false;n.breakAt=100000;
}
assert(choice(),'normal nearby choice discovers original adult victim');const beforeHealth=JSON.stringify(r.gameHealth.snapshot().health.injuryReceipts);assert(main.namespace.executeNearbyAction(choice()));step();step();assert(r.crimeRuntime.activeAction(),'visible cancellable windup');
assert.equal(main.namespace.currentControl().intentKey,'crime-cancel');assert(main.namespace.executeNearbyAction(main.namespace.currentControl()));assert.equal(r.crimeRuntime.activeAction(),null);assert.equal(engine().cases.length,0);assert.equal(JSON.stringify(r.gameHealth.snapshot().health.injuryReceipts),beforeHealth);
checks.push('Normal nearby action has a real cancellable windup; E cancellation leaves no case, health injury or receipt');
assert(choice(),'victim still physically within normal action range');assert(main.namespace.executeNearbyAction(choice()));
until(()=>engine().cases.length===1,'completed physical harm commits one real case',50);
const crime=latest(),caseId=crime.id,receiptId=caseId+':harm';assert.equal(crime.kind,'harm');assert.equal(crime.victimId,victimId);
assert(crime.evidence.some(e=>e.witnessId===victimId),'actual victim remembers');assert(crime.evidence.some(e=>e.witnessId===witnessId),'nearby visible original witness remembers');
assert(r.gameHealth.snapshot().health.injuryReceipts[receiptId],'actual health receipt');assert.equal(r.gameHealth.snapshot().health.people[victimId].conditions['impact-bruise'].stage,'ill');assert(r.gameHealth.text(victimId).includes('挫伤'));
assert(r.relationshipEvents.pair(victimId,'player')?.trust<0);assert(r.relationshipEvents.pair(witnessId,'player')?.trust<0);assert.equal(engine().effects.length,0,'health and relationship outbox acknowledged');
checks.push('Completed push changes existing health and only actual victim/witness relationships; durable effect outbox is acknowledged once');
until(()=>latest()?.status==='escort','original guards physically pursue and arrest',250);
assert(phases.includes('pursuit'));const arrested=latest(),guardId=arrested.guardKey.split('@')[0],guard=who(guardId);assert(guard&&meters(pos(guard),pos(r.player))<=1.65,'arrest follows actual close approach');
const arrestAt=pos(r.player);assert(arrestAt[1]>-1,'arrest is outside, never teleported to prison');
until(()=>latest()?.status==='custody','both original guard and player walk into underground custody',1900);
assert(r.player.root.position.y<-3.8,'original stairs reached actual underground floor');assert(travel>8,'physical escort distance');assert(meters(pos(r.player),r.lot.holdingCell.detention)<=1.9,'physical cell arrival');
checks.push('Existing guard follows real paths, arrests only at close range, and escorts down authored stairs and cell doorway without teleporting');
const custody=latest().custodyRemaining,positionBeforeReload=pos(r.player);const checkpoint=main.namespace.crimeCheckpoint();assert(checkpoint.crimeConsequences.china.engine.cases.some(c=>c.id===caseId&&c.status==='custody'));
document.hidden=true;events.visibilitychange();for(let i=0;i<50;i++)main.namespace.crimeStep(.1);assert.equal(latest().custodyRemaining,custody);document.hidden=false;events.visibilitychange();
ids['return-world'].onclick();assert.equal(state().mode,'globe');const dormant=JSON.stringify(JSON.parse(storage['worlds-days-v1']).crimeConsequences.china.engine);for(let i=0;i<20;i++)tick(1);assert.equal(JSON.stringify(JSON.parse(storage['worlds-days-v1']).crimeConsequences.china.engine),dormant,'globe and wall time serve no custody');
global.gc?.();ids.travel.onclick();r=main.namespace.crimeReview();assert.equal(latest().id,caseId);assert.equal(latest().status,'custody');assert.equal(latest().custodyRemaining,custody);assert(meters(positionBeforeReload,pos(r.player))<.2,'restore retains actual cell position');assert.equal(identity(),identities,'save/reentry preserves original actor and appearance identities');
const restoredHealth=JSON.stringify(r.gameHealth.snapshot().health.injuryReceipts);const observed=JSON.stringify(r.relationshipEvents.snapshot().receipts);step();assert.equal(JSON.stringify(r.gameHealth.snapshot().health.injuryReceipts),restoredHealth);assert.equal(JSON.stringify(r.relationshipEvents.snapshot().receipts),observed,'restore does not multiply consequence receipts');
checks.push('Hidden tab, globe pause and restored original scene do not serve custody or replay harm; identity and exact receipts survive');
until(()=>latest()?.status==='releasing','active simulation serves bounded custody',650);until(()=>latest()?.status==='released','release follows the real exit route back outdoors',1900);
assert(r.player.root.position.y>-.2);assert(meters(pos(r.player),r.lot.holdingCell.release)<2);assert.equal(r.crimeRuntime.controlsPlayer(),false);assert.equal(engine().cases.length,1);assert.equal(JSON.stringify(main.namespace.crimeWallet()),wallet,'crime does not alter exact cash/bank balances or wallet transaction sequence');
assert.equal(identity(),identities);assert(!r.crimeRuntime.owns(who(guardId)),'guard movement lease restored');assert(main.namespace.crimeWalk([-11.7,.115,27])>0,'ordinary navigation available again');until(()=>state().pathLength===0,'normal player control after release',200);
checks.push('Only active simulation serves sentence; release walks back outside, restores controls and guard ownership, and leaves exact wallet state unchanged');
const report={status:'PASS',scope:'One China production main harm, guard pursuit, real underground custody and restore cycle; renderer stub, not visual acceptance',checks,frames,travel,phases,case:latest(),seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,samples};fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));return;
`;
harness=harness.slice(0,begin)+body+"})().catch(e=>{console.error(e);process.exit(1)});";
new vm.Script(harness,{filename:'tests/crime-consequences-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,global,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
