// Actual production main/globe/UI/flight with the existing DOM/renderer harness.
// No country is built in this segment; arrival consumes its saved same journey.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('Changed fixture seam: '+a);harness=harness.replace(a,b);}
const seam=`
export function travelMainReview(){return {saved,travelJourney,travelJourneyUI,travelFlight,travelPassport,simulationClock,mode,selected};}
export function travelMainStep(dt){updateTravelPresentation(dt);}
export {save};
`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(readProduction(file),");
once('const cache=new Map();',`const cache=new Map();function readProduction(file){let source=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){assert(source.includes('const TRAVEL_JOURNEYS_ENABLED=false;')||source.includes('const TRAVEL_JOURNEYS_ENABLED=true;'));source=source.replace('const TRAVEL_JOURNEYS_ENABLED=false;','const TRAVEL_JOURNEYS_ENABLED=true;')+${JSON.stringify(seam)};}return source;}`);
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}',"prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.replaceChildren();}add(...e){this.append(...e)}");
once('let context=vm.createContext(',"let rejectedWrites=0,rejectAction=null;let context=vm.createContext(");
once('localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}',String.raw`localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{
 if(k==='worlds-days-v1'&&rejectAction){const next=JSON.parse(v),old=JSON.parse(storage[k]||'{}'),event=next.travelJourney?.journeys.at(-1)?.events.at(-1);
  if(event?.action===rejectAction&&!old.travelJourney?.journeys.some(j=>j.events.some(e=>e.id===event.id))){rejectedWrites++;return false;}}
 storage[k]=v;return true;
}}`);
once('history:{replaceState(){}},',"history:{replaceState(_state,_title,url){context.location.hash=new URL(url,'http://example.invalid').hash;}},");
const begin=harness.indexOf('const report=[];for(let round=0;');if(begin<0)throw Error('Missing bounded body');
harness=harness.slice(0,begin)+String.raw`
const r=main.namespace.travelMainReview(),journey=r.travelJourney,ui=r.travelJourneyUI,flight=r.travelFlight,clone=v=>JSON.parse(JSON.stringify(v));
assert.equal(r.mode,'globe');assert(journey);const clock=clone(r.simulationClock.snapshot()),wallet=JSON.stringify(r.saved.copperLedger);
const find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),dialog=()=>find(document.body,e=>e.className?.split(' ').includes('ww-travel-dialog'));
const button=action=>{const b=find(dialog(),e=>e.tagName==='button'&&e.getAttribute('data-travel-action')===action);assert(b&&!b.disabled,action+' enabled');return b;};
const press=action=>button(action).onclick(),step=(n=1)=>{for(let i=0;i<n;i++){now+=100;main.namespace.travelMainStep(.1);}};
rejectAction='begin';ids.travel.onclick();assert.equal(journey.view().active,null);assert.equal(rejectedWrites,1);assert(main.namespace.save());assert.equal(JSON.parse(storage['worlds-days-v1']).travelJourney.journeys.length,0);assert.equal(JSON.parse(storage['worlds-days-v1']).travelJourney.activeId,null);
rejectAction=null;ui.close();ids.travel.onclick();let id=journey.view().active.id;assert.equal(journey.view().active.from,null);assert.equal(journey.view().active.to,'japan');assert.equal(journey.view().active.stage,'planned');assert(ids['globe-ui'].hidden,'journey panel replaces destination picker');
press('passport');assert(r.travelPassport.isOpen());assert(!ui.isOpen());r.travelPassport.close();assert(ui.isOpen(),'closing original passport returns to this journey');
context.location.hash='#france';events.hashchange();assert.equal(journey.view().active.id,id);assert.equal(journey.view().active.to,'japan');assert.equal(main.namespace.travelMainReview().selected,'japan');
const cancelled=id,oldCancel=button('cancel');rejectAction='cancel';oldCancel.onclick();assert.equal(journey.view().active.id,cancelled);assert.equal(context.location.hash,'#france');assert(main.namespace.save());
rejectAction=null;press('cancel');assert.equal(journey.view().active,null);assert.equal(context.location.hash,'');assert(!ui.isOpen());assert.equal(journey.view().stamps.length,0);
ids.travel.onclick();id=journey.view().active.id;assert.notEqual(id,cancelled);oldCancel.onclick();assert.equal(journey.view().active.id,id);
const oldDeparture=button('departure');oldDeparture.onclick();oldDeparture.onclick();assert.equal(journey.view().active.stage,'departure-cleared');assert.equal(journey.view().stamps.length,0,'unknown old origin never creates an exit');
press('board');step(20);const progress=flight.view().progress;assert(progress>0&&progress<1);assert.equal(flight.view().journey.id,id);
ui.close();assert(!ids['globe-ui'].hidden);step(20);assert.equal(flight.view().progress,progress);ui.open();assert(ids['globe-ui'].hidden);step();assert(flight.view().progress>progress);assert.equal(journey.view().active.id,id);
rejectAction='land';step(100);assert.equal(journey.view().active.stage,'flying');assert.equal(rejectedWrites,3,'automatic finish attempts once, not every frame');assert.equal(flight.view().progress,1);
const oldSkip=button('land');rejectAction=null;oldSkip.onclick();oldSkip.onclick();assert.equal(journey.view().active.stage,'entry-pending');
rejectAction='entry';press('entry');assert.equal(journey.view().active.stage,'entry-pending');assert.equal(journey.view().stamps.length,0);assert(main.namespace.save());
rejectAction=null;press('entry');assert.equal(journey.view().active.stage,'entry-cleared');assert.equal(journey.view().stamps.length,1);assert.equal(journey.view().stamps[0].kind,'entry');assert.equal(journey.view().currentRegion,null);assert(!r.saved.visited.includes('japan'));
assert.deepEqual(clone(r.simulationClock.snapshot()),clock);assert.equal(JSON.stringify(r.saved.copperLedger),wallet,'travel does not create income, fees or exchange');assert(main.namespace.save());
const out=path.resolve('qa/travel-main');fs.mkdirSync(out,{recursive:true});const evidence={stage:'entry-cleared',journeyId:id,from:null,to:'japan',rejectedWrites,skipAndAnimationSameJourney:true,clockUnchanged:true,walletUnchanged:true,scope:'Actual main/globe/passport/UI/flight; DOM and renderer simulated; no country built yet.'};
fs.writeFileSync(path.join(out,'departure-checkpoint.json'),JSON.stringify({version:1,save:JSON.parse(storage['worlds-days-v1']),evidence}));console.log('PASS TR03 main departure/flight/entry',JSON.stringify(evidence));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/travel-journey-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
