const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra="\nexport function marketEnter(){travelJourneyUI.close('local-market-test');return enterRegion('china');}\nexport function marketReview(){return {undergroundMarket,undergroundMarketEconomy,crimeRuntime,player,npcs,lot,copperLedger,saved,guards:chinaArchery?.enforcementCandidates()};}\nexport function marketStep(dt){if(paused||mode!=='lot')return;beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);}\nexport function marketWalk(to){path=planPath(player.root.position,new THREE.Vector3(...to));return path.length;}\nexport function marketCheckpoint(){save();return JSON.parse(JSON.stringify(saved));}\nexport function marketReadiness(){const n=npcs.find(n=>n.station.id===MARKET_MERCHANT_ID);return {ui:interactionMenuOpen(),roofShown,player:player.root.position.toArray(),clear:nearbyInteractionClear({position:lot.blackMarket.interaction.position}),mode:npcPublicMode(n,{ignoreVisibility:true}),walking:n.walking,route:n.route.length,position:n.root.position.toArray(),social:isSociallyHeld(MARKET_MERCHANT_ID),session:undergroundMarket.state()};}\nexport {executeNearbyAction,nearbyChoices};\n";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
harness=harness.replace("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");

const phase=(process.argv.find(a=>a.startsWith('--phase='))||'--phase=opening').split('=')[1];
const out='qa/underground-market-main';fs.mkdirSync(out,{recursive:true});
if(phase!=='opening')harness=harness.replace("const main=mod(path.join(root,'game/main.js'));", "storage['worlds-days-v1']=fs.readFileSync('qa/underground-market-main/"+(phase==='resume-opening'?'progress':phase==='resume-work'?'work':phase==='fence'?'fence-ready':'opening')+"-save.json','utf8');const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
main.namespace.marketEnter();
let r=main.namespace.marketReview(),frames=0;const step=()=>{main.namespace.marketStep(.2);frames++;};
const merchant=()=>r.npcs.find(n=>n.station.id==='cn-tavern-diner-east');
const check=(condition,message)=>{if(!condition)throw Error(message+' '+JSON.stringify(main.namespace.marketReadiness()));};
const phase=(process.argv.find(a=>a.startsWith('--phase='))||'--phase=opening').split('=')[1];
if(phase==='opening'||phase==='resume-opening'){
 check(!!r.lot.blackMarket,'market attached to actual lot');
 // Initial player placement beside the original, unmoved resident is the only
 // approach fixture; all subsequent merchant/player travel uses production routes.
 if(phase==='opening'){let offered=null;
 for(let i=0;i<10;i++){offered=r.undergroundMarket.choices().find(c=>c.kind==='invite');if(offered)break;step();}
 check(!!offered,'original resident becomes safely available');
 r.player.root.position.copy(merchant().root.position);r.player.root.position.x-=.8;
 check(main.namespace.executeNearbyAction(offered),'production invite action');}
 const target=r.lot.blackMarket.interaction.position;check(Math.hypot(r.player.root.position.x-target[0],r.player.root.position.y-target[1],r.player.root.position.z-target[2])<.5||main.namespace.marketWalk(target)>0,'player route to authored counter');
 for(let i=0;i<1600&&r.undergroundMarket.state().session?.stage!=='open';i++){step();if(i%100===0){console.error('market progress',i,JSON.stringify(main.namespace.marketReadiness()));fs.writeFileSync('qa/underground-market-main/progress-save.json',JSON.stringify(main.namespace.marketCheckpoint()));}}
 if(r.undergroundMarket.state().session?.stage!=='open'){fs.writeFileSync('qa/underground-market-main/progress-save.json',JSON.stringify(main.namespace.marketCheckpoint()));throw Error('Opening checkpoint still pending; continue saved progress with --phase=resume-opening, not a passed check');}
 for(let i=0;i<500&&!r.undergroundMarket.choices().some(c=>c.kind==='buy');i++)step();
 check(r.undergroundMarket.choices().some(c=>c.kind==='buy'),'player physically reached counter');
 fs.writeFileSync('qa/underground-market-main/opening-save.json',JSON.stringify(main.namespace.marketCheckpoint()));
 console.log(JSON.stringify({status:'PASS',phase,frames,player:r.player.root.position.toArray(),merchant:merchant().root.position.toArray(),scope:'Original NPC availability then staged player approach; all underground travel production navigation; renderer stub, not visual QA'}));
 }else if(phase==='trades'){
 step();check(r.undergroundMarket.state().session.stage==='open','saved stall reclaims same actor');
 // Money is an explicit pre-existing-wage test fixture, not naturally earned here.
 check(r.copperLedger.earn(40,'qa-market-existing-wages').ok,'fixture cash credited');
 const doAction=(kind,itemId)=>{const x=r.undergroundMarket.choices().find(x=>x.kind===kind&&x.itemId===itemId);check(!!x,'visible '+kind+' '+itemId);check(main.namespace.executeNearbyAction(x),'normal UI action '+kind);};
 const cash=()=>r.copperLedger.balances().copper.cash;
 doAction('buy','cn-market-old-book-1');for(let i=0;i<5;i++)step();check(cash()===40,'no early payment');for(let i=0;i<6;i++)step();check(cash()===34&&r.undergroundMarketEconomy.view().merchantCash===6,'actual book exchange');
 doAction('sell','cn-market-old-book-1');for(let i=0;i<11;i++)step();check(cash()===37&&r.undergroundMarketEconomy.view().merchantCash===3,'two-sided resale');
 doAction('buy','cn-market-silk-1');for(let i=0;i<11;i++)step();check(cash()===33&&r.undergroundMarketEconomy.view().merchantCash===7,'silk stock consumed');
 doAction('work','cn-market-old-paper-1');for(let i=0;i<15;i++)step();check(cash()===33,'unfinished labor unpaid');
 fs.writeFileSync('qa/underground-market-main/work-save.json',JSON.stringify(main.namespace.marketCheckpoint()));
 console.log(JSON.stringify({status:'PASS',phase,frames,cash:cash(),merchantCash:r.undergroundMarketEconomy.view().merchantCash,workSeconds:r.undergroundMarket.activeAction().elapsed,scope:'Actual main interactions on naturally walked checkpoint; 40 copper explicitly seeded as prior wages'}));
 }else if(phase==='resume-work'){
 const before=r.undergroundMarket.activeAction().elapsed;check(before<8,'saved work remains incomplete');
 for(let i=0;i<45&&r.undergroundMarket.activeAction();i++)step();
 check(r.undergroundMarketEconomy.view().items.find(x=>x.id==='cn-market-old-paper-1').kind==='writing-paper','same paper processed once after real remaining time');
 check(r.copperLedger.balances().copper.cash===35&&r.undergroundMarketEconomy.view().merchantCash===5,'finite wage paid exactly once');
 const buy=r.undergroundMarket.choices().find(x=>x.kind==='buy'&&x.itemId==='cn-market-old-book-1');check(main.namespace.executeNearbyAction(buy),'buy book to fund known fence price');for(let i=0;i<11;i++)step();
 check(r.undergroundMarketEconomy.view().merchantCash===11,'funded cash from real book sale');
 fs.writeFileSync('qa/underground-market-main/fence-ready-save.json',JSON.stringify(main.namespace.marketCheckpoint()));
 console.log(JSON.stringify({status:'PASS',phase,frames,before,work:r.undergroundMarketEconomy.view().items.find(x=>x.id==='cn-market-old-paper-1'),cash:r.copperLedger.balances().copper.cash,merchantCash:r.undergroundMarketEconomy.view().merchantCash}));
 }else if(phase==='fence'){
 step();const token='cn-sealed-patrol-token',walk=(to,label)=>{check(main.namespace.marketWalk(to)>0,label+' path');for(let i=0;i<700&&state().pathLength;i++)step();check(state().pathLength===0,label+' arrival');};
 check(!r.crimeRuntime.status().heldItems.includes(token),'no generated stolen goods');
 walk(r.lot.holdingCell.evidence.position,'original sealed cabinet');const take=r.crimeRuntime.choices().find(x=>x.kind==='take'&&x.itemId===token);check(take&&main.namespace.executeNearbyAction(take),'real original token acquisition');check(r.crimeRuntime.status().heldItems.includes(token),'actual custody in player inventory');
 walk(r.lot.blackMarket.interaction.position,'return to market');
 const choice=r.undergroundMarket.choices().find(x=>x.kind==='fence');check(choice&&choice.action.includes('违法'),'explicit advance warning');check(main.namespace.executeNearbyAction(choice),'begin physical fencing');for(let i=0;i<9;i++)step();check(!r.undergroundMarketEconomy.view().fenced,'no early fencing money or transfer');
 // Discovery fixture: one ORIGINAL eligible patrol is placed at a legal
 // counter-side witness point only for a deterministic sighting. No pursuit,
 // custody, route, item or cash result is staged after this point.
 const guards=main.namespace.marketReview().guards;check(guards.length>0,'original patrol is safely available');const guard=guards[0],priorGuard=guard.root.position.toArray();guard.root.position.set(-8.6,-4.1,33.3);guard.route=[];
 for(let i=0;i<4;i++)step();check(r.undergroundMarketEconomy.view().fenced,'completed fence atomically committed');
 check(r.copperLedger.balances().copper.cash===35&&r.undergroundMarketEconomy.view().merchantCash===5,'fence uses actual merchant cash');
 const engine=r.crimeRuntime.snapshot().engine;check(engine.items[token].holderKey.startsWith('cn-tavern-diner-east@'),'only original item now held by original merchant');check(engine.cases.filter(c=>c.kind==='fencing').length===2,'both parties retain linked offenses');check(engine.cases.some(c=>c.kind==='theft'),'original theft remains');check(engine.cases.filter(c=>c.kind==='fencing').some(c=>c.evidence.some(e=>e.witnessId===guard.station.id)),'real independent guard sightline');
 fs.writeFileSync('qa/underground-market-main/fence-save.json',JSON.stringify(main.namespace.marketCheckpoint()));console.log(JSON.stringify({status:'PASS',phase,frames,fixture:{guard:guard.station.id,priorGuard,witnessPoint:[-8.6,-4.1,33.3]},cases:engine.cases.map(c=>({id:c.id,kind:c.kind,subject:c.subjectId,status:c.status,evidence:c.evidence})),cash:r.copperLedger.balances().copper.cash,merchantCash:r.undergroundMarketEconomy.view().merchantCash}));
 }else{console.log(JSON.stringify({phase,review:main.namespace.marketReadiness()}));}


`;
harness=harness.slice(0,begin)+body+"})().catch(e=>{console.error(e);process.exit(1)});";
new vm.Script(harness,{filename:'tests/underground-market-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,global,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
