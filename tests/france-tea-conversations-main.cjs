// One natural break -> autonomous invitation -> real two-person workday talk.
// Pending tea and competing leisure cooldowns are seeded; no work, experience,
// completed shift, invitation, participant or relationship result is fabricated.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('seam changed '+a);harness=harness.replace(a,b);}
const extra=`
export function staffReview(){return {player,npcs,lot,scene,camera,sun,lighting,franceTea,formalCareers,furniture,gameHealth,navOptions,copperLedger};}
export function staffStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);}
export function staffView(a,p=.18,d=4.6){yaw=a;pitch=p;distance=d;updateCamera(1,true);}
export function staffSeed(life){saved.franceTea={...saved.franceTea,life};}
export {navigateTo,configureStableShadows,blocked,save};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
if(process.env.STAFF_RESUME){once("const main=mod(path.join(root,'game/main.js'));",`storage['worlds-days-v1']=fs.readFileSync(${JSON.stringify(process.env.STAFF_RESUME)},'utf8');const main=mod(path.join(root,'game/main.js'));`);once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');","const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'lot');");}
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const started=Date.now(),out=process.env.STAFF_OUT||'qa/france-tea-conversations',T=three.namespace,checks=[];fs.mkdirSync(out,{recursive:true});
if(!process.env.STAFF_RESUME){
 const {createLifeDecisions}=cache.get(path.join(root,'game/npc-life-decisions.js')).namespace,b=createLifeDecisions({actorIds:['france-cafe','france-salon','france-bakery'],worldSeed:42}),decisions=b.snapshot();
 for(const[id,p]of Object.entries(decisions.people)){p.random=id==='france-salon'?42:1;p.cooldowns.pause=9999;p.cooldowns.garden=9999;}
 main.namespace.staffSeed(decisions);all.find(e=>e.dataset.region==='france').onclick();ids.travel.onclick();
}
const r=main.namespace.staffReview(),original=r.npcs.map(n=>({id:n.station.id,look:JSON.stringify(n.root.userData.appearance)}));
const save=name=>{r.gameHealth.flush();main.namespace.save();fs.writeFileSync(out+'/'+name+'.json',storage['worlds-days-v1']);};
let frames=0,talking=null,walks=0,completed=null,last='',firstOrder=null;
const step=()=>{const before=r.npcs.map(n=>[n.station.id,n.root.position.clone()]);now+=100;main.namespace.staffStep(.1);frames++;assert(Date.now()-started<285000);assert(process.memoryUsage().rss<1.2*1024**3);const s=r.franceTea.state(),pair=s.talks.pair;for(const[id,p]of before){const n=r.npcs.find(n=>n.station.id===id);if(n&&pair?.participants.includes(id)){assert(p.distanceTo(n.root.position)<.22);if(n.walking)walks++;}}
 if(s.order){firstOrder??=s.order.id;assert.equal(s.order.id,firstOrder,'one original order through service and cleanup');assert.equal(s.order.customer,'guest');assert(!pair,'tray and hot tea block conversation');}
 const key=(s.order?.stage||'no-order')+':'+(pair?.phase||'none');if(key!==last){last=key;console.log('STAGE',JSON.stringify({frames,key,at:r.npcs.filter(n=>['france-cafe','france-salon','france-bakery'].includes(n.station.id)).map(n=>({id:n.station.id,p:n.root.position.toArray()})),events:s.history.slice(-3)}));}
 if(pair){assert(!s.duty&&!r.formalCareers.state().tenure,'No player job unlocks NPC talk');assert(!s.order&&!s.intent);}
 if(s.order?.stage==='drinking'&&!fs.existsSync(out+'/source-checkpoint.json'))save('source-checkpoint');
 if(frames%500===0){save('progress-checkpoint');console.log('PROGRESS',JSON.stringify({frames,order:s.order,pair}));}return s;};
if(!process.env.STAFF_RESUME){
for(;frames<3000&&!completed;){const s=step(),pair=s.talks.pair;if(pair?.phase==='talking'&&pair.elapsed>1&&!talking){talking=JSON.parse(JSON.stringify(s));save('talking-checkpoint');checks.push('actual original guest tea consumed, original order cleaned, autonomous accepted invitation and arrival without player employment');}completed=s.life.conversations.find(e=>e.status==='completed');}
assert(completed,'natural autonomous conversation completes '+JSON.stringify(r.franceTea.state()));assert(talking&&walks>5);assert(completed.experience.completedAt<=completed.startedAt);assert.equal(completed.results.length,2);assert.equal(r.furniture.facilities.state().filter(f=>f.id.startsWith('france-tea-talk')&&f.reservations.length).length,0);const before=talking.life.people,after=r.franceTea.state().life.people;for(const id of Object.keys(before))if(!completed.participants.includes(id)){assert.deepEqual(after[id].relations,before[id].relations);assert.deepEqual(after[id].opinions,before[id].opinions);}for(const item of original)assert.equal(JSON.stringify(r.npcs.find(n=>n.station.id===item.id).root.userData.appearance),item.look);save('completed-checkpoint');checks.push('individually directed results, no observer reward, both claims released and original looks preserved');
}else{talking=r.franceTea.state();assert(talking.talks.pair?.phase==='talking');assert.equal(state().continuity.skipped.length,0);checks.push('full talking checkpoint preserves people, two claims, token and accumulated contact');}
if(process.env.STAFF_MESA==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});const canvas=W.createCanvas(1000,700),actual=new T.WebGLRenderer({canvas,antialias:true});actual.setSize(1000,700,false);actual.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(actual,r.sun);r.camera.aspect=1000/700;r.camera.updateProjectionMatrix();
 // This render-only restore uses the normal TPS camera at a legal observer
 // point; no event is rerun and no participant is moved for composition.
 const view=[2,.23,-5.2];assert(!main.namespace.blocked(view[0],view[2],r.lot.colliders,.34,{...r.navOptions,y:view[1]}));r.player.root.position.set(...view);main.namespace.staffView(2.55,.14,4.6);r.scene.updateMatrixWorld(true);r.lighting.update(r.player.root.position);actual.render(r.scene,r.camera);actual.getContext().finish();assert.equal(actual.getContext().getError(),0);fs.writeFileSync(out+'/staff-talking-normal-tps.png',canvas.toBuffer('image/png'));actual.dispose();canvas.dispose();checks.push('single complete-checkpoint normal TPS Three/Mesa image; no browser or iOS claim');
}
if(process.env.STAFF_RESUME){
 const prior=JSON.parse(JSON.stringify(r.franceTea.state())),token=prior.talks.pair.interaction.id;
 for(;frames<150&&!completed;){const s=step();completed=s.life.conversations.find(e=>e.status==='completed');}
 assert(completed,'remaining real conversation completes');assert.equal(completed.id,prior.talks.pair.id);assert.equal(completed.results.length,2);assert.equal(r.franceTea.state().life.conversations.filter(e=>e.status==='completed').length,1);
 for(const id of Object.keys(prior.life.people))if(!completed.participants.includes(id)){assert.deepEqual(r.franceTea.state().life.people[id].relations,prior.life.people[id].relations);assert.deepEqual(r.franceTea.state().life.people[id].opinions,prior.life.people[id].opinions);}
 assert.equal(r.furniture.facilities.state().filter(f=>f.id.startsWith('france-tea-talk')&&f.reservations.length).length,0);save('completed-checkpoint');const stored=JSON.parse(storage['worlds-days-v1']),contact=stored.gameHealth.health.interactionProgress['france-tea-conversation'];assert.equal(contact.id,token);assert.equal(contact.duration,completed.duration);assert.deepEqual([...contact.participants].sort(),[...completed.participants].sort());checks.push('same saved real event and health token '+token+' completes once, original uninvolved cook receives no result; normal pagehide health flush stores exact actual duration');
}
const result={status:'PASS',checks,frames,walks,event:completed,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'One actual original guest tea order and natural NPC-only short conversation through production main, real navigation/body/doors; simulated DOM and optional Three/Mesa, not browser/iOS'};fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/france-tea-conversations-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
