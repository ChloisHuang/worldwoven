// Bounded observational production-main pass from a normal migrated new save
// (fixed seed 42, never searched) or its own real checkpoint. No positions,
// invitations, relationships, funds, clocks or response probabilities are set.
// Run SERIAL with other main/3D probes: NATURAL_COUNTRY=china NATURAL_FRAMES=2400
// node --max-old-space-size=950 --experimental-vm-modules tests/natural-social-observe.cjs
// Continue with SOCIAL_RESUME=qa/natural-china-checkpoint.json. Only events that
// actually finish are evidence of completion. Simulated DOM/renderer, not iOS.
const fs=require('node:fs'),vm=require('node:vm');process.env.QA_START_MS||=String(Date.now());
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function socialReview(){return {player,lot,camera,scene,sun,lighting,npcs,franceGardener,franceLabor,formalCareers,npcSocial,playerConversations,playerSocialContext,automaticDoors,navOptions,playerConversationUI,careerHandbook,contextMenu,npcPublicInteractions,franceTea,socialMeetingPlaces,chinaSalon,chinaOfficialEconomy,chinaAudience,simulationClock,chinaTavern};}
export function socialStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);}
export function socialView(){updatePlayer(0,elapsed);yaw=.35;pitch=.22;distance=4.6;updateCamera(1,true);}
export function socialCheckpoint(){gameHealth.flush();save();return JSON.parse(JSON.stringify(saved));}
export const naturalMode=npcPublicMode; export {requestStationIntent,doInteraction,executeNearbyAction,configureStableShadows,blocked,getNPCProfile,getBaseSocialProfile};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8').replace('saved:saved.npcPublicInteractions?.[country],', 'onDecision:event=>globalThis.__naturalDecisions.push(event),saved:saved.npcPublicInteractions?.[country],')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.SOCIAL_RESUME?'lot':'globe');");
harness=harness.replace('vm.createContext({console,','vm.createContext({__naturalDecisions:[],structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.SOCIAL_RESUME)storage['worlds-days-v1']=fs.readFileSync(process.env.SOCIAL_RESUME,'utf8');const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const country=process.env.NATURAL_COUNTRY||'france';if(state().mode!=='lot'){all.find(e=>e.dataset.region===country).onclick();ids.travel.onclick();}const r=main.namespace.socialReview();const start=Date.now(),stages=[],availability={},pairs={};let prev=null;
for(let i=0;i<Number(process.env.NATURAL_FRAMES||8000);i++){
 now+=150;main.namespace.socialStep(.15);
 const st=r.npcPublicInteractions.status();if(country==='china'&&i%400===0)console.log('SALON',i,JSON.stringify({quotes:r.chinaSalon.view().candidates.map(n=>[n.id,n.quoteFee]),clock:r.simulationClock.state(),money:r.chinaOfficialEconomy.snapshot().accounts,session:r.chinaSalon.snapshot().session,choices:r.npcs.filter(n=>r.chinaOfficialEconomy.account(n.station.id)).map(n=>[n.station.id,r.chinaSalon.npcChoices(n.station.id)]),life:r.chinaAudience.state().life?.actors}));if(st?.eventId+':'+st?.stage!==prev){stages.push({i,status:st});console.log('STAGE',i,JSON.stringify(st));prev=st?.eventId+':'+st?.stage;}
 if(i%40===0){const pool=r.npcs.filter(n=>main.namespace.naturalMode(n));for(const n of pool)availability[n.station.id]=(availability[n.station.id]||0)+1;for(const a of pool)for(const b of pool)if(a!==b&&a.root.position.distanceTo(b.root.position)<12){const key=[a.station.id,b.station.id].sort().join(':');pairs[key]??={count:0,min:99};pairs[key].count++;pairs[key].min=Math.min(pairs[key].min,a.root.position.distanceTo(b.root.position));}}
 if(i%1000===0){events.pagehide();fs.writeFileSync('qa/natural-'+country+'-checkpoint.json',storage['worlds-days-v1']);}if(i%200===0){const pool=r.npcs.filter(n=>main.namespace.naturalMode(n));console.log('PROGRESS',i,JSON.stringify({pool:pool.map(n=>[n.station.id,n.root.position.toArray()]),rss:process.memoryUsage().rss/1024**2}));}
 if(Date.now()-Number(process.env.QA_START_MS)>275000)break;
}
events.pagehide();fs.writeFileSync('qa/natural-'+country+'-checkpoint.json',storage['worlds-days-v1']);const checkpoint=JSON.parse(storage['worlds-days-v1']);const originalConversations=Object.fromEntries(['franceTea','japanOperations','japanPerformance','egyptMeal','chinaAudience','chinaPalaceLife'].map(key=>[key,checkpoint[key]?.life?.conversations||checkpoint[key]?.life?.decisions?.conversations||checkpoint[key]?.staffLife?.decisions?.conversations||checkpoint[key]?.conversations||[]]));const report={originalConversations,scope:"normal new game or its own checkpoint; seed42 never searched; production logic, simulated DOM/renderer",decisions:context.__naturalDecisions,country,seconds:(Date.now()-start)/1000,availability,pairs,stages,snapshot:r.npcPublicInteractions.snapshot(),actors:r.npcs.map(n=>({id:n.station.id,position:n.root.position.toArray(),visible:n.root.visible,mode:main.namespace.naturalMode(n),profile:main.namespace.getBaseSocialProfile(n.station.id)}))};fs.writeFileSync('qa/natural-'+country+'.json',JSON.stringify(report,null,2));console.log('RESULT',JSON.stringify({country,seconds:report.seconds,availability,pairs,originalConversations,decisions:report.decisions.reduce((s,e)=>(s[e.kind+":"+(e.reason||e.status||"ok")]=(s[e.kind+":"+(e.reason||e.status||"ok")]||0)+1,s),{}),events:report.snapshot.brain.conversations}));return;
`;
harness=harness.slice(0,begin)+body+"})().catch(e=>{console.error(e);process.exit(1)});";
new vm.Script(harness,{filename:"tests/public-pair-main-inherited.cjs"}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+"/tests",__filename:__filename});
