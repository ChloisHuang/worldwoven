// Actual main scene arrival and country switching from one committed journey.
// DOM/renderer are simulated; original scenes, characters and storage are real.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('Changed fixture seam: '+a);harness=harness.replace(a,b);}
const seam=`
export function travelMainReview(){return {saved,travelJourney,travelJourneyUI,travelFlight,travelPassport,simulationClock,mode,selected};}
export function travelMainStep(dt){updateTravelPresentation(dt);}
export {save,requestTravel};
`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(readProduction(file),");
once('const cache=new Map();',`const cache=new Map();function readProduction(file){let source=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){assert(source.includes('const TRAVEL_JOURNEYS_ENABLED=false;')||source.includes('const TRAVEL_JOURNEYS_ENABLED=true;'));source=source.replace('const TRAVEL_JOURNEYS_ENABLED=false;','const TRAVEL_JOURNEYS_ENABLED=true;')+${JSON.stringify(seam)};}return source;}`);
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}',"prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.replaceChildren();}add(...e){this.append(...e)}");
once('let context=vm.createContext(',"let rejectedWrites=0,rejectAction=process.env.TRAVEL_MAIN_REFUSE_ARRIVAL==='1'?'arrive':null;let context=vm.createContext(");
once('localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}',String.raw`localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{
 if(k==='worlds-days-v1'&&rejectAction){const next=JSON.parse(v),old=JSON.parse(storage[k]||'{}'),event=next.travelJourney?.journeys.at(-1)?.events.at(-1);
  if(event?.action===rejectAction&&!old.travelJourney?.journeys.some(j=>j.events.some(e=>e.id===event.id))){rejectedWrites++;return false;}}
 storage[k]=v;return true;
}}`);
once("const main=mod(path.join(root,'game/main.js'));",String.raw`
const input=JSON.parse(fs.readFileSync(process.env.TRAVEL_MAIN_FROM||'tests/fixtures/travel-main-checkpoint.json','utf8'));storage['worlds-days-v1']=JSON.stringify(input.save);const initialSave=JSON.parse(JSON.stringify(input.save));
const main=mod(path.join(root,'game/main.js'));
`);
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');","const state=()=>context.__worldsDays.getState();assert(['globe','lot'].includes(state().mode));");
once('history:{replaceState(){}},',"history:{replaceState(_state,_title,url){context.location.hash=new URL(url,'http://example.invalid').hash;}},");
const begin=harness.indexOf('const report=[];for(let round=0;');if(begin<0)throw Error('Missing bounded body');
harness=harness.slice(0,begin)+String.raw`
const review=()=>main.namespace.travelMainReview(),r=review(),journey=r.travelJourney,ui=r.travelJourneyUI,clone=v=>JSON.parse(JSON.stringify(v)),completed=[];
const clock=clone(r.simulationClock.snapshot()),wallet=JSON.stringify(r.saved.copperLedger),find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),dialog=()=>find(document.body,e=>e.className?.split(' ').includes('ww-travel-dialog'));
const press=action=>{const b=find(dialog(),e=>e.tagName==='button'&&e.getAttribute('data-travel-action')===action);assert(b&&!b.disabled,action+' enabled');b.onclick();};
function checkpoint(stage){assert.deepEqual(clone(r.simulationClock.snapshot()),clock);assert.equal(JSON.stringify(r.saved.copperLedger),wallet);assert(main.namespace.save());const save=JSON.parse(storage['worlds-days-v1']),out=path.resolve('qa/travel-main');fs.mkdirSync(out,{recursive:true});const evidence={stage,completed,journeyId:journey.view().active?.id||journey.view().journeys.at(-1)?.id,region:state().region||null,rejectedWrites,clockUnchanged:true,walletUnchanged:true,scope:'Production main/original scenes and characters; simulated DOM/renderer, no natural play-day or browser/device claim.'};fs.writeFileSync(path.join(out,'arrival-checkpoint.json'),JSON.stringify({version:1,save,evidence}));console.log('MILESTONE',JSON.stringify(evidence));}
const initial=journey.view();assert.equal(initial.loadError,null);
if(initial.active){
 const j=initial.active;assert.equal(j.stage,'entry-cleared');assert.equal(state().mode,'globe','pending journey wins over saved country/hash');assert(ui.isOpen());press('arrive');
 if(rejectAction){
  assert(rejectedWrites>0);assert.equal(state().mode,'globe');assert.equal(state().npcCount,0);assert.equal(state().characterResources.activeReferences,0);
  assert.equal(journey.view().active.id,j.id);assert.equal(journey.view().active.stage,'entry-cleared');assert.deepEqual(clone(journey.view().stamps),clone(initial.stamps));assert.deepEqual(r.saved.visited,initialSave.visited);
  assert.deepEqual(clone(r.simulationClock.snapshot()),clock);assert.equal(JSON.stringify(r.saved.copperLedger),wallet);checkpoint('arrival-rejected');
  const persisted=JSON.parse(storage['worlds-days-v1']);assert.equal(persisted.travelJourney.activeId,j.id);assert(!persisted.travelJourney.journeys.find(x=>x.id===j.id).events.some(e=>e.action==='arrive'));assert.deepEqual(persisted.visited,initialSave.visited);return;
 }
 assert.equal(state().mode,'lot');assert.equal(state().region,j.to);assert.equal(journey.view().active,null);assert.equal(journey.view().currentRegion,j.to);assert(r.saved.visited.includes(j.to));completed.push(j.to);
}else{
 if(input.evidence.stage==='cancelled-at-world'){assert.equal(state().mode,'globe');assert.equal(journey.view().active,null);assert.equal(r.saved.worldContinuity.activeRegion,null);assert.equal(context.location.hash,'');}
 else{assert.equal(state().mode,'lot');assert.equal(state().region,initial.currentRegion);}
 assert.deepEqual(clone(journey.snapshot()),initialSave.travelJourney,'cold resume adds no journey or stamp');
}
const beforeSame=clone(journey.snapshot()),count=state().npcCount;assert(main.namespace.requestTravel(journey.view().currentRegion));assert.deepEqual(clone(journey.snapshot()),beforeSame);if(count)assert.equal(state().npcCount,count,'same-country selection keeps the existing scene');else{assert.equal(state().mode,'lot');assert.equal(state().region,initial.currentRegion);assert(state().npcCount>0,'same-country world return restores the actual scene');}
const targets=(process.env.TRAVEL_MAIN_TARGETS||'').split(',').filter(Boolean);
for(const [index,target] of targets.entries()){
 const before=journey.view(),from=state().region;assert.notEqual(from,target);assert(regionsTarget(target));
 if(index%2===0){ids['return-world'].onclick();assert.equal(state().mode,'globe');assert.equal(journey.view().currentRegion,from);assert.deepEqual(clone(journey.view().stamps),clone(before.stamps));all.find(e=>e.dataset.region===target).onclick();ids.travel.onclick();}
 else{context.location.hash='#'+target;events.hashchange();}
 const pending=journey.view().active;assert.equal(pending.from,from);assert.equal(pending.to,target);assert.equal(pending.stage,'planned');assert.equal(state().mode,'globe');
 press('departure');assert.equal(journey.view().stamps.length,before.stamps.length+1);press('board');press('land');press('entry');assert.equal(journey.view().stamps.length,before.stamps.length+2);press('arrive');
 assert.equal(state().mode,'lot');assert.equal(state().region,target);assert.equal(journey.view().currentRegion,target);assert.equal(journey.view().active,null);assert(r.saved.visited.includes(target));
 const view=state();assert(view.npcCount>0);assert.equal(new Set(view.npcLooks.map(n=>n.id)).size,view.npcCount);assert(view.npcLooks.every(n=>n.bodyPreset&&n.hairStyle),'original authored identities built');completed.push(target);
 assert(main.namespace.save());const durable=JSON.parse(storage['worlds-days-v1']);assert.equal(durable.travelJourney.currentRegion,target);assert.equal(durable.travelJourney.activeId,null);assert.equal(durable.worldContinuity.activeRegion,target);assert(durable.visited.includes(target));if(index<targets.length-1)checkpoint('arrived');
}
if(process.env.TRAVEL_MAIN_CANCEL_AT_END==='1'){
 const from=state().region,old=journey.view(),target=from==='china'?'japan':'china';context.location.hash='#'+target;events.hashchange();const planned=journey.view().active;assert.equal(planned.from,from);assert.equal(planned.to,target);
 rejectAction='cancel';press('cancel');assert.equal(journey.view().active.id,planned.id);assert.equal(context.location.hash,'#'+target);assert(main.namespace.save());assert.equal(JSON.parse(storage['worlds-days-v1']).worldContinuity.activeRegion,from);
 rejectAction=null;press('cancel');assert.equal(journey.view().active,null);assert.equal(journey.view().currentRegion,from);assert.equal(state().mode,'globe');assert.equal(context.location.hash,'');assert.deepEqual(clone(journey.view().stamps),clone(old.stamps));
 const persisted=JSON.parse(storage['worlds-days-v1']);assert.equal(persisted.worldContinuity.activeRegion,null);assert.equal(persisted.travelJourney.activeId,null);assert.equal(persisted.travelJourney.journeys.at(-1).stage,'cancelled');checkpoint('cancelled-at-world');return;
}
assert.deepEqual(clone(r.simulationClock.snapshot()),clock);assert.equal(JSON.stringify(r.saved.copperLedger),wallet);assert.equal(journey.view().loadError,null);checkpoint('arrived');
function regionsTarget(id){return ['japan','china','france','egypt'].includes(id);}
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/travel-arrival-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
