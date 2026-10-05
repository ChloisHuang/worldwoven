// One bounded autonomous NPC conversation in production main.
// Real actors, shared navigation, doors and facility claims; simulated DOM and
// renderer. This verifies movement/ownership, not browser or iOS presentation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){
 if(!harness.includes(before)||harness.indexOf(before)!==harness.lastIndexOf(before))throw Error('Fixture seam changed: '+before);
 harness=harness.replace(before,after);
}
const extras=`
export function tavernStaffReview(){return {player,lot,camera,scene,sun,lighting,npcs,furniture,navOptions,chinaTavern,chinaTavernUI,chinaService:typeof chinaService==='undefined'?null:chinaService,chinaLabor,formalCareers,simulationClock,copperLedger,dailyNeeds,chinaAudience,chinaOfficialEconomy,chinaMoneyHouse,careerHandbook,npcSocial,saved};}
export function tavernStaffStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaTavernUI?.update();careerHandbook.update(mode);}
export function conversationCheckpoint(){save();return JSON.parse(JSON.stringify(saved));}
export function tavernStaffView(a,p=.20){updateNPCs(0,elapsed);yaw=a;pitch=p;distance=4.6;updateCamera(1,true);}
export {requestStationIntent,requestFurniture,navigateTo,configureStableShadows,blocked,cancelAction,planPath};
`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
replaceOnce('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed=String.raw`
const prior=JSON.parse(storage['worlds-days-v1']);prior.appearance.seed=42;prior.simulationClock={version:1,seconds:300};
const decisionModule=mod(path.join(root,'game/npc-life-decisions.js'));await decisionModule.link(()=>{});await decisionModule.evaluate();
const actorIds=['cn-minister-works','cn-minister-granary','cn-official-rites','cn-official-personnel','cn-official-justice','cn-official-records'];
const initialDecisions=decisionModule.namespace.createLifeDecisions({worldSeed:42,actorIds}).snapshot();
// Only a pending intention is seeded. Reading, invitation, acceptance, travel,
// talking and both relationship consequences must occur in production updates.
for(const [i,id]of actorIds.entries())initialDecisions.people[id].current={id:'read',duration:10+i*.7,startedAt:0};
prior.chinaAudience={day:0,calledDay:0,outcome:'completed',life:{decisions:initialDecisions}};
storage['worlds-days-v1']=JSON.stringify(prior);
`;
replaceOnce("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
if(begin<0||end<begin)throw Error('Fixture scenario boundary changed');
const body=String.raw`
const started=Date.now(),copy=x=>JSON.parse(JSON.stringify(x)),out='qa/china-official-conversations';fs.mkdirSync(out,{recursive:true});
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
let r=main.namespace.tavernStaffReview(),officials=r.npcs.filter(n=>n.station.courtRole),original=r.npcs.map(n=>n.station.id),steps=0,pairId=null,talking=null,renderer=null,canvas=null;
if(process.env.OFFICIAL_CONVERSATION_MESA==='1'){
 const T=three.namespace,W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(1100,700);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1100,700,false);renderer.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(renderer,r.sun);r.camera.aspect=1100/700;r.camera.updateProjectionMatrix();
}
let completed=null,wasRestored=false,walks=0;
function frame(){const positions=officials.map(n=>n.root.position.clone()),before=r.chinaAudience.state().life;now+=100;main.namespace.tavernStaffStep(.1);steps++;const life=r.chinaAudience.state().life,pair=life.conversation;
 assert.deepEqual(r.npcs.map(n=>n.station.id),original);assert(!r.npcSocial.active(),'player never starts a UI conversation');
 for(const [i,n]of officials.entries()){if(!before.actors[i].mounted&&!life.actors[i].mounted&&!n.serviceMount)assert(positions[i].distanceTo(n.root.position)<.4,'no NPC teleport');if(pair?.participants.includes(n.station.id)&&n.walking)walks++;}
 if(pair){pairId=pair.id;assert(pair.participants.length===2);if(pair.phase==='talking'&&pair.elapsed>2&&!talking){talking=copy(life);const actors=pair.participants.map(id=>officials.find(n=>n.station.id===id));assert(actors[0].root.position.distanceTo(actors[1].root.position)>1);assert(actors.every(n=>!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y})));assert(actors.every(n=>n.getPoseMetrics().headLook.weight>.5),'shared head-look follows actual companion');
   fs.writeFileSync(out+'/talking-checkpoint.json',JSON.stringify(main.namespace.conversationCheckpoint()));
   if(renderer){try{for(const [name,position,yaw]of [['two-officials-conversation',[11.7,.115,-13.1],.9],['two-officials-side',[8.5,.115,-13.1],-.85]].filter(([,p])=>!main.namespace.blocked(p[0],p[2],r.lot.colliders,.34,{...r.navOptions,y:p[1]}))){r.player.root.position.set(...position);assert(!main.namespace.blocked(position[0],position[2],r.lot.colliders,.34,{...r.navOptions,y:position[1]}));main.namespace.tavernStaffView(yaw,.20);r.scene.updateMatrixWorld(true);r.lighting.update(r.player.root.position);renderer.render(r.scene,r.camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync(out+'/'+name+'.png',canvas.toBuffer('image/png'));}}catch(error){console.log('PHOTO_ONLY_ERROR',error.message);}}
   // Restore the ongoing pair once through the real world-continuity boundary.
   const at=pair.elapsed;ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();r=main.namespace.tavernStaffReview();officials=r.npcs.filter(n=>n.station.courtRole);assert.equal(r.chinaAudience.state().life.conversation?.id,pairId);assert.equal(r.chinaAudience.state().life.conversation?.elapsed,at);wasRestored=true;
  }}
 completed=life.decisions.conversations.find(e=>e.status==='completed');
 if(steps%300===0){assert(process.memoryUsage().rss<1.2*1024**3,'RSS ceiling');assert(Date.now()-started<295000,'300 second runtime limit');console.log('PROGRESS',JSON.stringify({steps,pair:pair||null,actors:life.actors.map(a=>({id:a.id,activity:a.activity,position:a.position})),events:life.decisions.conversations}));}
}
for(;steps<6000&&!completed;)frame();
assert(completed,'one real autonomous invitation must complete');assert(talking&&wasRestored&&walks>20);assert(completed.experience.completedAt<completed.startedAt,'topic source precedes invitation');const final=r.chinaAudience.state().life;for(const result of completed.results){assert(result.actorId!==result.targetId);assert(final.decisions.people[result.actorId].relations[result.targetId]!==undefined);}fs.writeFileSync(out+'/completed-checkpoint.json',JSON.stringify(main.namespace.conversationCheckpoint()));const snapshot=copy(final.decisions),result=copy(completed);ids['return-world'].onclick();all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();r=main.namespace.tavernStaffReview();assert.deepEqual(copy(r.chinaAudience.state().life.decisions),snapshot,'completed relationship survives region return without a second reward');assert(!r.chinaAudience.state().life.conversation);
renderer?.dispose();canvas?.dispose();ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
const report={status:'PASS',scope:'Real production main + shared navigation/doors/actors; simulated DOM, '+(renderer?'actual Three/Mesa normal TPS images':'renderer stub')+'; not browser/iOS',steps,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,walks,result,talkingPositions:talking.actors.filter(a=>result.participants.includes(a.id)).map(a=>({id:a.id,position:a.position})),images:renderer?['two-officials-conversation.png','two-officials-side.png']:[]};fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-official-conversations-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname,__filename});
