// ST01 production main seam: real China owner, UI, navigation, timing and cancellation.
// Only historical ledger events are generated through its public writer API.
// Run each branch under timeout 295; no renderer or four-country main repeat.
const fs=require('node:fs'),vm=require('node:vm');
console.log('ST01 main: loading production modules and historical ledger');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function socialReview(){return {player,lot,camera,scene,sun,lighting,npcs,franceGardener,franceLabor,formalCareers,npcSocial,playerConversations,playerSocialContext,automaticDoors,navOptions,playerConversationUI,careerHandbook,chinaAudience,simulationClock,socialMeetingPlaces,relationshipEvents};}
export function socialStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);}
export function socialView(){updatePlayer(0,elapsed);yaw=.35;pitch=.22;distance=4.6;updateCamera(1,true);}
export function socialCheckpoint(){gameHealth.flush();save();return JSON.parse(JSON.stringify(saved));}
export {socialInteractionContext,socialPrivateEntitlement,requestStationIntent,executeNearbyAction,configureStableShadows,blocked,getNPCProfile};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.SOCIAL_RESUME?'lot':'globe');");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed=String.raw`
const prior=JSON.parse(storage['worlds-days-v1']),actorId='cn-minister-works';
const lm=mod(path.join(root,'game/player-conversation-ledger.js'));await lm.link(linker);await lm.evaluate();
const dm=cache.get(path.join(root,'game/npc-life-decisions.js'));
const decision=dm.namespace.createLifeDecisions({worldSeed:42,actorIds:[actorId]}).snapshot();
let seconds=0;const ledger=lm.namespace.createPlayerConversationLedger({worldSeed:42,getClock:()=>({seconds,day:Math.floor((600+seconds*.7)/1440)}),getProfile:()=>decision.people[actorId],getPlayerProfile:()=>decision.people[actorId],getContext:()=>({age:30,selfAge:25,privatePlaceAvailable:true}),saveState:()=>true});
function historical(topic,options={}){for(let i=0;i<100;i++){seconds+=100;const a=ledger.start(actorId,topic,options);assert(a.ok,JSON.stringify(a));if(a.event.status==='declined')continue;seconds+=a.event.duration;const c=ledger.complete(a.event.id,{elapsed:a.event.duration});assert(c.ok,JSON.stringify(c));return;}throw Error('history refused');}
historical('art');for(let i=0;i<8;i++)historical('gratitude');historical('express-interest');historical('respond-interest',{initiator:'npc'});prior.playerConversations=ledger.snapshot();
seconds+=100;const day=Math.ceil((600+seconds*.7)/1440);seconds=(day*1440+780-600)/.7;prior.simulationClock={version:1,seconds};
prior.chinaAudience={day,calledDay:day,outcome:'completed'};storage['worlds-days-v1']=JSON.stringify(prior);
const sm=mod(path.join(root,'game/relationship-events.js'));await sm.link(linker);await sm.evaluate();
const social=sm.namespace.createRelationshipEvents({getProfile:()=>decision.people[actorId]});for(let i=0;i<12;i++)assert(social.record({id:'history-service:'+i,source:'china-palace-tea',kind:'service',outcome:'completed',actorId:'player',participants:['player',actorId],at:i*100}).ok);prior.relationshipEvents=social.snapshot();storage['worlds-days-v1']=JSON.stringify(prior);
const main=mod(path.join(root,'game/main.js'));`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed);
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const started=Date.now(),scenario='support',out='qa/hidden-social-main';console.log('ST01 main: entering China, scenario='+scenario);fs.mkdirSync(out,{recursive:true});all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.socialReview(),n=r.npcs.find(n=>n.station.id==='cn-minister-works'),identity=r.npcs.map(n=>n.station.id);let frames=0;const checks=[];function note(text){checks.push(text);console.log(text);}
function step(){main.namespace.socialStep(.1);frames++;if(frames%100===0)console.log('ST01 main phase',frames,r.npcSocial.state()?.stage);assert(process.memoryUsage().rss<1.2*1024**3,'RSS ceiling');assert(Date.now()-started<295000,'time ceiling');}
function until(fn,msg,max=1200){for(let i=0;i<max&&!fn();i++)step();assert(fn(),msg+' '+JSON.stringify({state:r.npcSocial.state(),audience:r.chinaAudience.state().phase,actor:n.root.position.toArray(),toast:ids.toast.textContent}));}
const initialRelationship=r.playerConversations.relationshipFor(n.station.id);console.log('INITIAL',JSON.stringify({relationship:{stage:initialRelationship.stage,completedCount:initialRelationship.completedCount,age:initialRelationship.age,selfAge:initialRelationship.selfAge,privatePlaceAvailable:initialRelationship.privatePlaceAvailable},status:r.chinaAudience.socialStatus(n),actor:n.root.position.toArray()}));
until(()=>r.npcSocial.routineAvailable(n),'original actor idle');
// Only initial player approach is a legal checkpoint; both subsequent legs must walk.
let placed=false;for(const [x,z]of [[1.2,0],[-1.2,0],[0,1.2],[0,-1.2]]){const p=n.root.position;r.player.root.position.set(p.x+x,p.y,p.z+z);if(!main.namespace.blocked(p.x+x,p.z+z,r.lot.colliders,.34,{...r.navOptions,y:p.y})&&r.npcSocial.canInteract(n,2.4)){placed=true;break;}}assert(placed,'legal initial approach');
function button(attr,value){const dialog=all.find(e=>e.id==='player-conversation-dialog');function scan(e){if(e.attrs?.[attr]===value)return e;for(const child of e.children||[]){const found=scan(child);if(found)return found;}}return scan(dialog);}
function open(){assert(main.namespace.executeNearbyAction({social:true,id:n.station.id,actor:n,name:n.station.npcName,action:'聊聊天',position:n.root.position.toArray(),visibilityChecked:true})!==false);assert(r.playerConversationUI.isOpen());}
open();const offer=button('data-conversation-topic','support-request');assert(offer,'actual UI contains evidence-backed support action');offer.onclick();const id=r.npcSocial.state()?.eventId;assert.equal(r.npcSocial.state()?.stage,'talking',JSON.stringify({state:r.npcSocial.state(),toast:ids.toast.textContent}));assert.equal(r.relationshipEvents.socialState('player').supporters.length,0);until(()=>!r.npcSocial.active(),'nine actual seconds',110);const done=r.playerConversations.event(id);assert.equal(done.status,'completed');assert.equal(done.elapsed,9);assert.equal(done.result.supportStance,'withhold');assert(!r.relationshipEvents.socialState('player').supporters.includes(n.station.id));assert.equal(r.relationshipEvents.stanceFor(n.station.id,'player').stance,'withhold');const before=r.playerConversations.supportFor(n.station.id);r.playerConversations.complete(id,{elapsed:9});assert.deepEqual(r.playerConversations.supportFor(n.station.id),before);note('Original minister completes the nine-second action but withholds support according to his own receptivity; no supporter is invented despite high past affection, and replay has no effect');
assert(r.relationshipEvents.record({id:'main-new-harm',source:'crime-consequences',kind:'physical-harm',outcome:'failed',fault:true,actorId:'player',participants:['player',n.station.id],at:r.simulationClock.state().seconds}).ok);assert(!r.relationshipEvents.socialState('player').supporters.includes(n.station.id));note('New durable actual-fault boundary retains the explicit withheld stance and cannot fabricate a supporter');
const saved=main.namespace.socialCheckpoint();fs.writeFileSync(out+'/completed-checkpoint.json',JSON.stringify(saved));assert.deepEqual(r.npcs.map(n=>n.station.id),identity);const report={status:'PASS',checks,frames,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,event:r.playerConversations.event(id)};fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));return;
`;
harness=harness.slice(0,begin)+body+"})().catch(e=>{console.error(e);process.exit(1)});";
new vm.Script(harness,{filename:'tests/player-relationship-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
