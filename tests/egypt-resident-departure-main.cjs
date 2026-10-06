// Resume a real whole-world eating/departure checkpoint and run only the tail:
// original guest stands and walks home while Dana clears the same dirty dish.
// No actor position, work receipt, meal, supply or conversation is seeded here.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
if(!process.env.EGYPT_DEPARTURE_RESUME)throw Error('Set EGYPT_DEPARTURE_RESUME to a real complete Egyptian meal checkpoint');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('seam changed '+a);harness=harness.replace(a,b);}
const extra=`
export function departureReview(){return {player,npcs,lot,egyptMeal,furniture,dailyNeeds,formalCareers,copperLedger,gameHealth};}
export function departureStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);}
export {save};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
once("const main=mod(path.join(root,'game/main.js'));",`storage['worlds-days-v1']=fs.readFileSync(${JSON.stringify(process.env.EGYPT_DEPARTURE_RESUME)},'utf8');const main=mod(path.join(root,'game/main.js'));`);
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');","const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'lot');");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const started=Date.now(),out=process.env.EGYPT_DEPARTURE_OUT||'qa/egypt-resident-departure',r=main.namespace.departureReview(),GUEST='egypt-papyrus',guest=r.npcs.find(n=>n.station.id===GUEST),prior=JSON.parse(fs.readFileSync(process.env.EGYPT_DEPARTURE_RESUME,'utf8')),initial=r.egyptMeal.state(),id=(initial.order||initial.resident.departure).id,mealId=initial.order?.mealId||initial.supply.consumed.find(x=>x.orderId===initial.resident.departure.id).mealId,original=r.npcs.map(n=>({id:n.station.id,look:JSON.stringify(n.root.userData.appearance)})),checks=[];
fs.mkdirSync(out,{recursive:true});assert.equal(state().continuity.skipped.length,0);assert.equal(state().continuity.relocated.length,0);
for(const n of r.npcs)assert.deepEqual(n.root.position.toArray(),prior.worldContinuity.regions.egypt.actors[n.station.id].position,'full original actor checkpoint preserves positions');
if(initial.order){assert.equal(initial.order.customer,GUEST);assert(['eating','lowering','clearing','lifting','returning','washing','leaving'].includes(initial.order.stage));}else assert.equal(initial.resident.departure.stage,'returning');
const save=name=>{r.gameHealth.flush();main.namespace.save();fs.writeFileSync(out+'/'+name+'.json',storage['worlds-days-v1']);};
let frames=0,walking=0,last='',stood=initial.resident.departure?.stage==='returning',returned=false,parallel=false,cleaned=!initial.order;
while((r.egyptMeal.state().order||r.egyptMeal.state().resident.departure?.stage!=='returned')&&frames<1800){
 const before=guest.root.position.clone(),mounted=!!guest.serviceMount;now+=100;main.namespace.departureStep(.1);frames++;assert(Date.now()-started<285000);assert(process.memoryUsage().rss<1.2*1024**3);
 const s=r.egyptMeal.state(),o=s.order,departure=s.resident.departure,key=(o?.stage||'cleaned')+':'+(departure?.stage||'seated');
 if(key!==last){last=key;console.log('STAGE',JSON.stringify({frames,key,guest:guest.root.position.toArray(),host:r.npcs.find(n=>n.station.id==='egypt-royal-dining').root.position.toArray()}));}
 assert.equal(s.supply.remaining,initial.supply.remaining);assert.equal(s.supply.prepared.length,initial.supply.prepared.length);assert.equal(s.tableReceipts.length,initial.tableReceipts.length);assert.equal(s.workReceipts.length,initial.workReceipts.length);
 if(o){assert.equal(o.id,id);assert.equal(o.mealId,mealId);assert.equal(s.props.mealId,mealId);assert.equal(s.props.bowlCount,1);assert.equal(s.props.trayCount,1);}
 if(departure?.stage==='returning'){
  assert.equal(guest.serviceMount,null);assert.equal(r.furniture.facilities.reservation(r.egyptMeal.seat.id,GUEST),null);assert.equal(r.egyptMeal.playerRequest(r.egyptMeal.seat.id),!o);assert.equal(r.egyptMeal.socialStatus(guest).canPause,true);
  if(!stood){assert.equal(o.stage,'clearing');assert.equal(o.holder,'table');save('departure-checkpoint');stood=true;checks.push('same original person stands immediately after lowering the bowl, dirty table still owns original dish and blocks new diners');}
  if(guest.walking){walking++;if(o&&o.stage!=='leaving')parallel=true;}
  if(!mounted)assert(before.distanceTo(guest.root.position)<.23,'ordinary bounded movement through shared navigator');
 }
 if(!o&&!cleaned){assert.equal(departure.stage,'returning');assert.equal(s.props.trayCount,0);assert(r.egyptMeal.tableService.canClaimDuty());assert.equal(r.egyptMeal.playerRequest(r.egyptMeal.seat.id),true);save('washed-checkpoint');cleaned=true;checks.push('real wash frees Dana and the clean table while Samira is still walking home; whole-world independent return checkpoint saved');}
 if(departure?.stage==='returned'&&!returned){assert(guest.root.position.distanceTo(guest.home)<.075);assert.equal(r.egyptMeal.socialProfile(GUEST).experiences.filter(e=>e.id===id+':'+GUEST).length,1);save('returned-checkpoint');returned=true;}
}
assert(frames<1800,'original tail completes');assert(stood&&walking>5&&(!initial.order||parallel),'guest genuinely moves while dish is still being cleared');assert(returned);assert.equal(r.egyptMeal.state().supply.consumed.filter(x=>x.orderId===id).length,1);assert.equal(r.egyptMeal.socialProfile(GUEST).experiences.filter(e=>e.id===id+':'+GUEST).length,1);assert(r.dailyNeeds.hunger(GUEST)<.05);
assert.equal(r.furniture.facilities.reservation(r.egyptMeal.seat.id,GUEST),null);assert.equal(r.egyptMeal.state().props.trayCount,0);for(const item of original)assert.equal(JSON.stringify(r.npcs.find(n=>n.station.id===item.id).root.userData.appearance),item.look);assert.deepEqual(r.copperLedger.state().balances,prior.copperLedger.balances);save('completed-checkpoint');
checks.push('full checkpoint resumes original positions, identities, same dish and independent guest departure; no additional meal, stock debit, wage or service receipt');checks.push('ordinary return uses production shared navigation, final tray clears only after real wash, one resident meal and one source experience');
const result={status:'PASS',checks,source:process.env.EGYPT_DEPARTURE_RESUME,orderId:id,mealId,actors:original.length+1,frames,walking,history:r.egyptMeal.state().history,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'Original full checkpoint tail in production main/navigation/body/doors with simulated DOM. No new complete job run; not browser/iOS.'};fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/egypt-resident-departure-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
