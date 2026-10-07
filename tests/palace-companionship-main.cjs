// ST02 production main seam: real China owner, UI, navigation, timing and cancellation.
// Only historical ledger events are generated through its public writer API.
// Run each branch under timeout 295; no renderer or four-country main repeat.
const fs=require('node:fs'),vm=require('node:vm');
console.log('ST02 main: loading production modules and historical ledger');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8').replace('seed:42','seed:2');
const extra=`
export function socialReview(){return {player,lot,camera,scene,sun,lighting,npcs,franceGardener,franceLabor,formalCareers,npcSocial,playerConversations,playerSocialContext,automaticDoors,navOptions,playerConversationUI,careerHandbook,chinaAudience,chinaPalace,simulationClock,socialMeetingPlaces,palaceCompanionship,palaceCompanionshipUI,palaceMeetingPlaces};}
export function socialStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);}
export function socialView(){updatePlayer(0,elapsed);yaw=.35;pitch=.22;distance=4.6;updateCamera(1,true);}
export function socialCheckpoint(){gameHealth.flush();save();return JSON.parse(JSON.stringify(saved));}
export {socialInteractionContext,socialPrivateEntitlement,palaceRelationshipContext,palaceAvailable,palacePlace,requestStationIntent,executeNearbyAction,configureStableShadows,blocked,getNPCProfile};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.SOCIAL_RESUME?'lot':'globe');");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed=String.raw`
const prior=JSON.parse(storage['worlds-days-v1']),actorId='cn-emperor';
const lm=mod(path.join(root,'game/player-conversation-ledger.js'));await lm.link(linker);await lm.evaluate();
const dm=cache.get(path.join(root,'game/npc-life-decisions.js'));
const decision=dm.namespace.createLifeDecisions({worldSeed:2,actorIds:[actorId]}).snapshot();
let seconds=0;const ledger=lm.namespace.createPlayerConversationLedger({worldSeed:2,getClock:()=>({seconds,day:Math.floor((600+seconds*.7)/1440)}),getProfile:()=>decision.people[actorId],getPlayerProfile:()=>decision.people[actorId],getContext:()=>({age:30,selfAge:25,privatePlaceAvailable:true}),saveState:()=>true});
function historical(topic,options={}){for(let i=0;i<100;i++){seconds+=100;const a=ledger.start(actorId,topic,options);assert(a.ok,JSON.stringify(a));if(a.event.status==='declined')continue;seconds+=a.event.duration;const c=ledger.complete(a.event.id,{elapsed:a.event.duration});assert(c.ok,JSON.stringify(c));return;}throw Error('history refused');}
historical('art');for(let i=0;i<8;i++)historical('gratitude');historical('express-interest');historical('respond-interest',{initiator:'npc'});prior.playerConversations=ledger.snapshot();
seconds+=100;const day=Math.ceil((600+seconds*.7)/1440);seconds=(day*1440+1140-600)/.7;prior.simulationClock={version:1,seconds};
prior.chinaAudience={day,calledDay:day,outcome:'completed'};storage['worlds-days-v1']=JSON.stringify(prior);
const main=mod(path.join(root,'game/main.js'));`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed);
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const started=Date.now(),scenario=process.env.PALACE_SCENARIO||'complete',out='qa/palace-companionship-main/'+scenario;console.log('ST02 main: entering China, scenario='+scenario);fs.mkdirSync(out,{recursive:true});all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.socialReview(),n=r.npcs.find(n=>n.station.royalRole==='emperor'),identity=r.npcs.map(n=>n.actorId||n.station.id);let frames=0;const checks=[];function note(text){checks.push(text);console.log(text);}
function step(){main.namespace.socialStep(.1);frames++;if(frames%50===0)console.log('ST02 phase',frames,JSON.stringify(r.palaceCompanionship.status()?.stage));assert(process.memoryUsage().rss<1.2*1024**3,'RSS ceiling');assert(Date.now()-started<295000,'time ceiling');}
function until(fn,msg,max=1100){for(let i=0;i<max&&!fn();i++){step();if(!r.palaceCompanionship.status()&&r.palaceCompanionship.history().length)break;}assert(fn(),msg+' '+JSON.stringify({state:r.palaceCompanionship.status(),history:r.palaceCompanionship.history(),actor:n.root.position.toArray(),toast:ids.toast.textContent}));}
// Wait for the original rest routine to release its actor; no test-forced consent or duty cancellation.
until(()=>r.chinaPalace.state().actors.find(a=>a.role==='emperor').activity!=='rest'&&main.namespace.palaceAvailable('cn-emperor'),'original emperor finishes rest',500);
// One legal initial player checkpoint beside the original current emperor.
let placed=false;for(const [x,z]of [[1.2,0],[-1.2,0],[0,1.2],[0,-1.2]]){const p=n.root.position;r.player.root.position.set(p.x+x,p.y,p.z+z);main.namespace.socialStep(0);if(!main.namespace.blocked(p.x+x,p.z+z,r.lot.colliders,.34,{...r.navOptions,y:p.y})&&r.npcSocial.canInteract(n,2.4)){placed=true;break;}}assert(placed,'legal initial approach '+JSON.stringify({p:n.root.position.toArray(),visible:n.root.visible}));
console.log('PALACE INITIAL',JSON.stringify({player:r.player.root.position.toArray(),emperor:n.root.position.toArray(),context:main.namespace.palaceRelationshipContext('cn-emperor','player'),available:main.namespace.palaceAvailable('cn-emperor'),place:main.namespace.palacePlace(['cn-emperor','player'])}));
function button(key){const dialog=all.find(e=>e.id==='palace-companionship-dialog');function scan(e){if(e.attrs?.['data-palace-action']===key)return e;for(const child of e.children||[]){const found=scan(child);if(found)return found;}}return scan(dialog);}
r.palaceCompanionshipUI.open();assert(!button('select:player'),'ordinary player has no imperial flip-card command');button('request').onclick();assert(r.palaceCompanionship.status(),'natural seeded emperor request response '+JSON.stringify(r.palaceCompanionship.history()));
const eventId=r.palaceCompanionship.status().id;assert.equal(r.palaceCompanionship.status().stage,'requested');until(()=>r.palaceCompanionship.status()?.stage==='awaiting-response','transmit summons');
assert.notEqual(r.palaceCompanionship.status().consent.player,true,'request never silently consents');
r.palaceCompanionshipUI.open();r.palaceCompanionshipUI.close();assert.equal(r.palaceCompanionship.status().stage,'awaiting-response');r.palaceCompanionshipUI.open();const beforeP=r.player.root.position.clone(),beforeN=n.root.position.clone();button('accept').onclick();until(()=>r.palaceCompanionship.status()?.stage==='together'||!r.palaceCompanionship.status(),'actual arrival');assert.equal(r.palaceCompanionship.status()?.stage,'together');
assert(r.player.root.position.distanceTo(beforeP)>.5,'player actually walked');assert(n.root.position.distanceTo(beforeN)>.5,'emperor actually walked');const event=r.palaceCompanionship.status();assert.equal(event.place.roomId,'bedroom');const fade=all.find(e=>e.id==='social-private-fade');assert(fade&&!fade.hidden);note('Actual current emperor selects and transmits stable summons; player closing panel does not consent; explicit acceptance walks real original actors to original imperial chamber and only then fades');
if(scenario==='withdraw'){const before=JSON.stringify(r.palaceCompanionship.snapshot().people);for(let i=0;i<15;i++)step();fade.children.find(e=>e.tagName==='button').onclick();assert(!r.palaceCompanionship.status());assert.equal(JSON.stringify(r.palaceCompanionship.snapshot().people),before);note('Actual fade withdrawal gives no relationship award and releases both original actors');}
else{until(()=>!r.palaceCompanionship.status(),'finish bounded fade',110);assert.equal(r.palaceCompanionship.history().at(-1).stage,'completed');note('Ten-second voluntary non-graphic meeting completes once, preserving original invitation ID and restoring routines');}
assert(!r.palaceCompanionship.owns('player'));assert(!r.palaceCompanionship.owns(n));assert(!n.socialPrivateFade);assert(fade.hidden);assert.deepEqual(r.npcs.map(n=>n.actorId||n.station.id),identity);const checkpoint=main.namespace.socialCheckpoint();fs.writeFileSync(out+'/checkpoint.json',JSON.stringify(checkpoint));const report={status:'PASS',checks,frames,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,eventId,history:r.palaceCompanionship.history()};fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));return;

`;
harness=harness.slice(0,begin)+body+"})().catch(e=>{console.error(e);process.exit(1)});";
new vm.Script(harness,{filename:'tests/player-relationship-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
