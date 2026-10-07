// Actual controller wiring: one country scene, distinct panel families and
// return/re-entry. Real Three and simulation; DOM/renderer are fixture stubs.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras='\nexport function inputReview(){return {player,furniture,camera,ray,travelPassport,currencyWallet,careerHandbook,chinaTavernUI,chinaLodgingUI,chinaSalonUI,chinaService,chinaMoneyHouse,contextMenu};} export function inputState(){return {joy:{...joy},joyPointer,joyLastPoint,joyActionAnchor,touches:[...touches.keys()],drag:drag&&{...drag},pinchDistance,keys:[...keys],yaw,pitch,distance};} export function inputStep(dt=.05){beginActorNavigationStep(dt);elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);} export {requestFurniture};';
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,cancelAnimationFrame(){},console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url="file://"+file;}}');
harness=harness.replace('get offsetWidth(){return 100}', 'get offsetWidth(){return 72}get offsetHeight(){return 32}');
harness=harness.replace('add(...e){this.append(...e)}',`prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}insertBefore(e,next){e.remove?.();e.parent=this;const i=next?this.children.indexOf(next):this.children.length;this.children.splice(i,0,e);}contains(e){return e===this||this.children.some(c=>c.contains?.(e));}querySelectorAll(s){const match=e=>s.startsWith('[')?e.getAttribute?.(s.slice(1,-1))!==undefined:s.startsWith('.')?e.className?.split(' ').includes(s.slice(1)):e.tagName===s;return this.children.flatMap(e=>[...(match(e)?[e]:[]),...(e.querySelectorAll?.(s)||[])]);}getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()];}add(...e){this.append(...e)}`);
harness=harness.replace("body:new E('body'),hidden", "head:new E('head'),body:new E('body'),hidden");
harness=harness.replace('setPointerCapture(){}', 'setPointerCapture(id){(this.captured??=new Set()).add(id)}hasPointerCapture(id){return this.captured?.has(id)||false}releasePointerCapture(id){if(this.captured?.delete(id))this.listeners.lostpointercapture?.({pointerId:id});}');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const started=Date.now(),read=()=>main.namespace.inputState(),review=()=>main.namespace.inputReview(),step=()=>main.namespace.inputStep(),ev=(pointerId,clientX=72,clientY=54)=>({pointerId,clientX,clientY,button:0,preventDefault(){}}),send=(id,type,...args)=>ids[id].listeners[type](ev(...args));
const hold=()=>{send('joystick','pointerdown',11);send('world','pointerdown',21,200,200);send('world','pointerdown',22,300,200);send('world','pointermove',22,330,200);};
const clear=label=>{const s=read();assert.equal(s.joyPointer,null,label+' joy ownership');assert.equal(Math.hypot(s.joy.x,s.joy.y),0,label+' zero joy');assert.equal(s.touches.length,0,label+' camera ownership');assert.equal(s.drag,null,label+' drag');assert.equal(s.pinchDistance,0,label+' pinch');assert.equal(s.keys.length,0,label+' keyboard');};
const old=label=>{const before=read();send('joystick','pointermove',11,90,54);send('world','pointermove',22,370,200);send('world','pointerup',21,200,200);assert.equal(read().distance,before.distance,label+' old pinch ignored');assert.equal(Math.hypot(read().joy.x,read().joy.y),0,label+' old joy ignored');};
const fresh=label=>{const pos=state().player;send('joystick','pointerdown',31,85,54);step();send('joystick','pointerup',31,85,54);assert(Math.hypot(state().player.x-pos.x,state().player.z-pos.z)>.005,label+' new thumb moves');};
// Globe gesture cannot leak into a newly built region.
hold();all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();assert.equal(state().region,'china');clear('enter');old('enter');fresh('enter');
const r=review(),report=[];
// Real individual panel wiring; do not start purchases, assignments or work.
for(const [name,open,close] of [
 ['passport',()=>r.travelPassport.open(),()=>r.travelPassport.close()],
 ['wallet',()=>r.currencyWallet.open(),()=>r.currencyWallet.close()],
 ['career',()=>r.careerHandbook.open(),()=>r.careerHandbook.close()],
 ['outfit',()=>ids['appearance-button'].onclick(),()=>ids['outfit-cancel'].onclick()],
 ['meal',()=>{review().player.root.position.set(22.35,.215,6.7);return r.chinaTavernUI.open();},()=>r.chinaTavernUI.close()],
 ['lodging',()=>r.chinaLodgingUI.open(),()=>r.chinaLodgingUI.close()],
 ['salon',()=>{review().player.root.position.set(24.15,7.815,7.65);return r.chinaSalonUI.open();},()=>r.chinaSalonUI.close()]
]){hold();assert.notEqual(open(),false,name+' open result');assert(name==='outfit'?state().wardrobePreview.open:({passport:r.travelPassport,wallet:r.currencyWallet,career:r.careerHandbook,meal:r.chinaTavernUI,lodging:r.chinaLodgingUI,salon:r.chinaSalonUI})[name].isOpen(),name+' actually opens');clear(name);old(name);close();old(name+' close');report.push(name);}
// Ordinary furniture selection still tolerates old-thumb jitter and accepts a
// deliberate >6 px continued drag to cancel the selected approach.
const seat=r.furniture.items.find(i=>i.kind==='seat');review().player.root.position.set(seat.position[0]+Math.sin(seat.yaw)*.3,seat.position[1],seat.position[2]+Math.cos(seat.yaw)*.3);step();send('joystick','pointerdown',51,72,54);main.namespace.requestFurniture(seat);assert(state().pendingInteraction===seat.id||state().seated===seat.id);send('joystick','pointermove',51,73,54);step();assert(state().pendingInteraction===seat.id||state().seated===seat.id,'1px held-thumb jitter keeps selected furniture');send('joystick','pointermove',51,80,54);step();assert.equal(state().pendingInteraction,null,'intentional resumed thumb cancels approach');assert.equal(state().seated,null,'intentional resumed thumb stands');send('joystick','pointerup',51,80,54);
// Suspend/resume clears input and prevents a long hidden interval from moving.
hold();document.hidden=true;events.visibilitychange();clear('hidden');const beforePause=state().player;now+=120000;raf();assert.deepEqual(state().player,beforePause);document.hidden=false;events.visibilitychange();old('resume');assert.deepEqual(state().player,beforePause);fresh('resume');
// Return and re-enter exercise the original destruction/construction paths.
hold();ids['return-world'].onclick();assert.equal(state().mode,'globe');clear('leave');old('leave');hold();ids.travel.onclick();assert.equal(state().region,'china');clear('return');old('return');fresh('return');ids['return-world'].onclick();
console.log(JSON.stringify({status:'PASS',seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,panels:report,scope:'Actual production main: enter, 7 panel callbacks, 6px furniture gate, hidden/resume, return/re-entry and new input. Simulated DOM/renderer, not browser/iOS.'}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/input-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
