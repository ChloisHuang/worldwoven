// One bounded ST03 private-chain continuation. A lightweight original-writer
// reconstruction prepares the independently verified prior story/release/stay
// state; it is explicitly NOT the previous process's nonexistent checkpoint.
// ST03_PREPARE_ONLY=1 writes it without main; ST03_RESUME=path reads it. Main
// never repeats the four-role UI sequence or the room payment. No private
// consent or completed private event is injected. Run once with the tree guard (300 s, 1228.8 MiB), never parallel mains.
const fs=require('node:fs'),vm=require('node:vm');
console.log('ST03 main: loading one production main and verified history');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8').replace('seed:42','seed:2');
const extra=`
export function st03Review(){return {player,npcs,lot,furniture,navOptions,chinaSalon,chinaSalonUI,chinaSalonEconomy,chinaSalonEmployment,chinaTavern,chinaLodging,copperLedger,salonCompanionship,playerConversations,simulationClock,socialMeetingPlaces};}
export function st03Step(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);chinaSalonUI?.update();}
export function st03Checkpoint(){gameHealth.flush();save();return JSON.parse(JSON.stringify(saved));}
export {blocked,palaceRelationshipContext,socialPrivateEntitlement};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
harness=harness.replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
// Only the existing salon panel DOM contract is added to this inherited mock.
// Its real keyed card list moves existing children and guards detached buttons.
const salonDOM=String.raw`
E.prototype.insertBefore=function(child,next){child.remove?.();const index=next?this.children.indexOf(next):this.children.length;if(index<0)throw Error('DOM reference child missing');this.children.splice(index,0,child);child.parent=this;return child;};
E.prototype.contains=function(node){return this===node||this.children.some(child=>child.contains?.(node));};
E.prototype.querySelectorAll=function(selector){const children=this.children.flatMap(child=>[child,...(child.querySelectorAll?.('*')||[])]);if(selector==='*')return children;return children.filter(child=>selector.split(',').some(part=>{const s=part.trim();return s==='[data-cn-salon-focus]'?child.attrs?.['data-cn-salon-focus']!==undefined:s.startsWith('.')?child.className?.split(' ').includes(s.slice(1)):child.tagName===s;}));};
E.prototype.focus=function(){document.activeElement=this;};
`;
harness=harness.replace('const ids={};',salonDOM+'\nconst ids={};');

const seed=String.raw`
async function loadFixtureModule(name){const m=mod(path.join(root,'game',name));if(m.status==='unlinked')await m.link(linker);if(m.status==='linked')await m.evaluate();return m.namespace;}
const artistModule=await loadFixtureModule('china-tavern-salon-artists.js'),artistProfiles=artistModule.SALON_ARTISTS,privateArtistId=artistProfiles[0].id;
const prior=process.env.ST03_RESUME?JSON.parse(fs.readFileSync(process.env.ST03_RESUME,'utf8')):JSON.parse(storage['worlds-days-v1']);
const seedFile='qa/china-salon-st03-main/reconstructed-private-start.json';
if(!process.env.ST03_RESUME){
 // This is a fresh deterministic reconstruction via original public writers,
 // NOT the failed run's nonexistent disk checkpoint. Prior UI evidence is reused.
 const lm=await loadFixtureModule('player-conversation-ledger.js'),dm=cache.get(path.join(root,'game/npc-life-decisions.js')).namespace;
 const decision=dm.createLifeDecisions({worldSeed:2,actorIds:[privateArtistId]}).snapshot();
 let seconds=0;const conversation=lm.createPlayerConversationLedger({worldSeed:2,getClock:()=>({seconds,day:Math.floor((600+seconds*.7)/1440)}),getProfile:()=>decision.people[privateArtistId],getPlayerProfile:()=>decision.people[privateArtistId],getContext:()=>({age:27,selfAge:24,privatePlaceAvailable:true}),saveState:()=>true});
 function historical(topic,options={}){for(let i=0;i<100;i++){seconds+=100;const a=conversation.start(privateArtistId,topic,options);assert(a.ok,JSON.stringify(a));if(a.event.status==='declined')continue;seconds+=a.event.duration;const c=conversation.complete(a.event.id,{elapsed:a.event.duration});assert(c.ok,JSON.stringify(c));return;}throw Error('historical relationship declined');}
 historical('art');for(let i=0;i<8;i++)historical('gratitude');historical('express-interest');historical('respond-interest',{initiator:'npc'});prior.playerConversations=conversation.snapshot();
 seconds+=100;const day=Math.ceil((600+seconds*.7)/1440);seconds=(day*1440+1140-600)/.7;prior.simulationClock={version:1,seconds};prior.chinaAudience={day,calledDay:day,outcome:'completed'};const clock={day,hour:19};
 const currencyModule=await loadFixtureModule('currency-ledger.js'),economyModule=await loadFixtureModule('china-salon-economy.js');let income,proof=null,lodging=null;
 const wallet=currencyModule.createGameCurrencyLedger({saved:prior,storage:{setItem:()=>true},transactionParticipant:tx=>lodging?.prepareCurrencyCommit(tx)||(tx.action==='settle'?income.prepareIncome(tx,proof):null)});
 income=economyModule.createChinaSalonEconomy({copperLedger:wallet});assert(wallet.earn(1000,'st03-fixture-prior-labor').ok);
 for(const [i,artist]of artistProfiles.entries()){proof={id:'cn-salon-'+(i+1)+'-'+(i+1),actorId:artist.id,activity:artist.activity,fee:115,completed:true,incomePolicy:income.policy()};assert(wallet.reserve(proof.fee,proof.id).ok);assert(wallet.settle(proof.id).ok);}
 const storiesModule=await loadFixtureModule('china-salon-stories.js'),contractsModule=await loadFixtureModule('china-salon-contracts.js');
 const stories=storiesModule.createChinaSalonStories({getReceipts:()=>income.snapshot().receipts,saveState:state=>{prior.chinaSalonStories=state;return true;}});
 const originalArtists=artistModule.salonArtistStations().map(station=>({station,ageYears:station.ageYears,alive:true})),adultPlayer={ageYears:24,alive:true};
 const contracts=contractsModule.createChinaSalonContracts({getArtist:id=>originalArtists.find(n=>n.station.id===id),getPlayer:()=>adultPlayer,getClock:()=>clock,canDiscuss:()=>true,saveState:state=>{prior.chinaSalonContracts=state;return true;}});
 for(const artist of artistProfiles){const offer=stories.view(artist.id).offer;assert(stories.choose(artist.id,offer.choices[0].id,{offerId:offer.id}).ok);assert(contracts.requestRelease(artist.id).ok);assert(contracts.respondRelease(artist.id).willing);assert(contracts.confirmRelease(artist.id).released);assert(contracts.setIndependentAvailability(artist.id,true).ok);assert(contracts.setIndependentAvailability(artist.id,false).ok);assert(contracts.setIndependentAvailability(artist.id,true).ok);}
 // Minimal original service scene, no buildChina, renderer or character models.
 // Original world initializer and lodging controller own all room/till writes.
 const sceneModule=await loadFixtureModule('china-tavern-service-scene.js'),innModule=await loadFixtureModule('china-tavern-lodging.js'),layoutModule=await loadFixtureModule('china-tavern-layout.js'),kitchenModule=await loadFixtureModule('china-tavern-kitchen.js'),T=three.namespace;
 const ids=['cn-tavern-host','cn-tavern-cook','cn-tavern-assistant','cn-tavern-diner-west','cn-tavern-diner-east'],names=['许安','沈禾','陆青','顾谨','周棠'],P=kitchenModule.TAVERN_MEAL.points,homes=[P.host,P.prep,P.assistant,[20,.215,22.4],[22,.215,22.4]];
 const staff=ids.map((id,i)=>{const root=new T.Group();root.position.set(...homes[i]);return {station:{id,npcName:names[i],npcPosition:homes[i]},root,route:[],walking:false,alive:true,phase:0,animate(){}};});
 const playerRoot=new T.Group();playerRoot.position.set(...innModule.INN_COUNTER);const guest={...adultPlayer,root:playerRoot},group=new T.Group();
 const items=layoutModule.TAVERN_TABLE_LAYOUT.flatMap(t=>[-1,1].map(side=>({id:'china-tavern-dining-'+t.seatKey+'-'+side,position:[t.x,.215,t.z+side*1.045],anchor:[t.x,.215,t.z+side*1.045],center:[t.x,.215,t.z+side*1.045],yaw:0})));
 const furniture={items,facilities:{state:()=>[],reserve:()=>true,occupy:()=>true},releaseActor(){},standPoint:()=>null};
 const scene=sceneModule.createTavernServiceScene({npcs:staff,lot:{group},furniture,doors:{},planPath:()=>[],moveActor(){},poseContext:()=>({}),getPlayer:()=>guest,getMounted:()=>null,getClock:()=>clock,saveState:state=>{prior.chinaServiceWorld=state;return true;}});
 assert(scene.initializeWorld());lodging=innModule.createChinaTavernLodging({scene,copperLedger:wallet,getClock:()=>clock,getPlayer:()=>guest});assert(lodging.confirm('lan',lodging.view().revision).ok);assert(lodging.hostRespond());assert.equal(lodging.view().booking.stage,'active');assert.equal(wallet.history().filter(t=>t.reservationId==='cn-inn-stay-1'&&t.action==='settle').length,1);assert.equal(wallet.balances().copper.cash,528);assert.equal(prior.chinaServiceWorld.till,12);assert.equal(prior.chinaServiceWorld.rooms.find(r=>r.id==='lan').guestId,'player');scene.dispose();
 fs.mkdirSync(path.dirname(seedFile),{recursive:true});fs.writeFileSync(seedFile,JSON.stringify(prior));console.log('ST03 PREPARED',JSON.stringify({source:'fresh deterministic original-public-writer reconstruction, not previous-run checkpoint',file:seedFile,artistIncome:income.snapshot().receipts.length,storyChoices:prior.chinaSalonStories.journal.length,freeReleases:prior.chinaSalonContracts.events.filter(e=>e.kind==='release').length,stayId:'cn-inn-stay-1',stayPayments:1,cash:528,privateConsent:'not created'}));
}
storage['worlds-days-v1']=JSON.stringify(prior);
if(process.env.ST03_PREPARE_ONLY){console.log('PASS ST03 private starting save prepared; no production main or new private consent executed');return;}
const main=mod(path.join(root,'game/main.js'));
`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed);
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const started=Date.now(),out='qa/china-salon-st03-main';fs.mkdirSync(out,{recursive:true});
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.st03Review(),s=r.chinaSalon,identity=r.npcs.map(n=>n.actorId||n.station.id),checks=[];let frames=0;
const note=text=>{checks.push(text);console.log('ST03 CHECK',text);};
const walk=(e,p)=>p(e)?e:(e.children||[]).map(c=>walk(c,p)).find(Boolean);
const panel=()=>walk(document.body,e=>e.className?.split(' ').includes('cn-salon-dialog'));
const button=label=>{const b=walk(panel(),e=>e.tagName==='button'&&e.textContent===label);assert(b,'button exists: '+label);assert(!b.disabled,'button enabled: '+label);return b;};
const selectArtist=id=>{const b=walk(panel(),e=>e.attrs?.['data-cn-salon-focus']==='artist-'+id);assert(b,'actual artist card '+id);b.onclick();};
const candidate=id=>s.view().candidates.find(c=>c.id===id);
function step(){now+=100;main.namespace.st03Step(.1);frames++;if(frames%50===0)console.log('ST03 PROGRESS',JSON.stringify({frames,stage:r.salonCompanionship.status()?.stage,player:r.player.root.position.toArray(),artist:r.npcs.find(n=>n.station.id===privateArtistId).root.position.toArray()}));assert(process.memoryUsage().rss<1.2*1024**3,'RSS ceiling');assert(Date.now()-started<295000,'time ceiling');}
function until(fn,label,max=1000){for(let i=0;i<max&&!fn();i++){step();if(!r.salonCompanionship.status()&&r.salonCompanionship.history().length)break;}assert(fn(),label+' '+JSON.stringify({private:r.salonCompanionship.status(),history:r.salonCompanionship.history(),life:s.state().life,toast:ids.toast.textContent}));}
function approach(n){let placed=false;for(const [dx,dz]of [[0,-.95],[.95,0],[-.95,0],[0,.95],[1.3,.5],[-1.3,-.5]]){const p=n.root.position,x=p.x+dx,z=p.z+dz;if(main.namespace.blocked(x,z,r.lot.colliders,.34,{...r.navOptions,y:p.y}))continue;r.player.root.position.set(x,p.y,z);if(s.canDiscuss(n.station.id)){placed=true;break;}}assert(placed,'legal nearby player checkpoint '+n.station.id+' '+JSON.stringify(n.root.position.toArray()));}
assert.equal(s.performers.length,4);assert.equal(r.chinaSalonEconomy.loadError,null);assert.equal(r.chinaSalonEconomy.snapshot().receipts.length,4);
const stay=r.chinaLodging.view().booking;assert.equal(stay?.stage,'active');assert.equal(stay.id,'cn-inn-stay-1');assert.equal(r.copperLedger.reservations().find(h=>h.id===stay.id).status,'settled');assert.equal(r.copperLedger.history().filter(t=>t.reservationId===stay.id&&t.action==='settle').length,1);assert.equal(r.chinaSalonEconomy.account(privateArtistId).bank,57);assert.equal(candidate(privateArtistId).contract.mode,'independent');assert.equal(candidate(privateArtistId).story.stage,1);
note('Loaded original-API reconstructed start: four prior story/contract results and one settled 12-copper lawful stay; no UI replay or additional room payment');
const n=s.performers.find(n=>n.station.id===privateArtistId);approach(n);assert(r.chinaSalonUI.open());selectArtist(privateArtistId);
// Save before any private-room assertion so an interrupted run has a real continuation checkpoint.
const checkpointBefore=main.namespace.st03Checkpoint();fs.writeFileSync(out+'/pre-private-checkpoint.json',JSON.stringify(checkpointBefore));
const ownedRoom='tavern-guest-'+stay.roomId,ownedPlace=r.socialMeetingPlaces.resolve(['player',privateArtistId],{private:true,roomId:ownedRoom});
console.log('ST03 PRIVATE INITIAL',JSON.stringify({roomId:ownedRoom,ok:ownedPlace.ok,reason:ownedPlace.reason||null,points:ownedPlace.place?.points,player:r.player.root.position.toArray(),artist:n.root.position.toArray(),checkpoint:out+'/pre-private-checkpoint.json'}));assert(ownedPlace.ok,'the exact already-rented original room has legal reachable paired approaches');
const privateMoney=JSON.stringify(r.copperLedger.history());button('询问今夜是否愿意私下相伴').onclick();assert(r.salonCompanionship.status(),'production invite opens an independently gated event');
const eventId=r.salonCompanionship.status().id;assert.match(eventId,/^salon-company:/);assert.equal(r.salonCompanionship.status().consent.player,false);until(()=>r.salonCompanionship.status()?.stage==='awaiting-response','original artist personally responds',100);
assert(r.chinaSalonUI.open());r.chinaSalonUI.close();assert.equal(r.salonCompanionship.status().consent.player,false,'closing UI does not consent');assert(r.chinaSalonUI.open());
const beforePlayer=r.player.root.position.clone(),beforeArtist=n.root.position.clone();button('我愿意这次相伴').onclick();assert.equal(r.salonCompanionship.status()?.stage,'travelling');
until(()=>r.salonCompanionship.status()?.stage==='together','two original actors follow the actual legal room route',950);
const together=r.salonCompanionship.status();assert.equal(together.id,eventId);assert.equal(together.place.roomId,'tavern-guest-'+stay.roomId);assert(r.player.root.position.distanceTo(beforePlayer)>.5);assert(n.root.position.distanceTo(beforeArtist)>.5);assert.equal(together.consent.player,true);assert.equal(together.consent[privateArtistId],true);
const fade=walk(document.body,e=>e.id==='social-private-fade');assert(fade&&!fade.hidden);note('Independent explicit player answer and original artist answer walk both real bodies down the public stair to the lawful room, then fade');
until(()=>!r.salonCompanionship.status(),'bounded non-graphic private meeting completes',110);assert.equal(r.salonCompanionship.history().at(-1).stage,'completed');assert.equal(r.salonCompanionship.history().filter(e=>e.id===eventId).length,1);assert(fade.hidden);assert(!n.socialPrivateFade);assert(!r.salonCompanionship.owns('player'));assert(!r.salonCompanionship.owns(n));assert.equal(JSON.stringify(r.copperLedger.history()),privateMoney,'private consent and completion create no service charge');assert.deepEqual(r.npcs.map(n=>n.actorId||n.station.id),identity);
const checkpoint=main.namespace.st03Checkpoint();fs.writeFileSync(out+'/checkpoint.json',JSON.stringify(checkpoint));const report={status:'PASS',checks,frames,eventId,roomId:together.place.roomId,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'One real production main only continues the private-room chain from a fresh original-API reconstructed legal start, not a previous-run checkpoint; four-role UI evidence is reused from the earlier run; no repeated story/release/UI sequence or additional room charge; simulated DOM/renderer, not browser/iOS visual QA'};fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));return;
`;
harness=harness.slice(0,begin)+body+"})().catch(e=>{console.error(e);process.exit(1)});";
new vm.Script(harness,{filename:'tests/china-salon-st03-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
