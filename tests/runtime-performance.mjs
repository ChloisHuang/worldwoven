// Narrow regression: diagnostics must never activate, touch storage or time normal URLs.
// Also protects the real animate-loop tap from reporting clamped delta as device FPS.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRuntimePerformance,createFrameSampleWindow,runtimePerformanceEnabled} from '../source/game/runtime-performance.js';
import {simulationFrame} from '../source/game/movement-runtime.js';
import {createEgyptMealUI} from '../source/game/egypt-meal-ui.js';

function fixture({renderer=null}={}){
 let time=0,clockReads=0,saveReads=0,closed=0,writes=0;
 const timers=new Map(),listeners=new Map();
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.style={};this.attrs={};this.hidden=false;}
  append(...nodes){for(const node of nodes){this.children.push(node);node.parent=this;}}
  set textContent(value){this.text=value;writes++;}get textContent(){return this.text;}
  setAttribute(key,value){this.attrs[key]=value;}
  remove(){this.parent.children=this.parent.children.filter(node=>node!==this);}
 }
 const root={body:new Element('body'),hidden:false,createElement:tag=>new Element(tag),querySelector:()=>({textContent:'R16.987 · 2026.10.06 · PUBLIC'}),addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}};
 const host={performance:{now:()=>{clockReads++;return time;}},devicePixelRatio:3,setInterval:(fn,delay)=>{assert.equal(delay,750);timers.set(1,fn);return 1;},clearInterval:id=>timers.delete(id)};
 const api=createRuntimePerformance({search:'?perf=1',root,host,getRenderer:()=>renderer,getNpcCount:()=>31,getSaveLength:()=>{saveReads++;return 12345;},sourceUrl:'https://example.test/assets/main.0123456789abcdef.js',onClose:()=>closed++});
 const panel=root.body.children[0],bar=panel.children[0],text=panel.children[1];
 return {api,root,host,panel,toggle:bar.children[1],close:bar.children[2],text,listeners,timers,setTime:value=>time=value,refresh:()=>timers.get(1)?.(),counters:()=>({clockReads,saveReads,closed,writes})};
}
function frame(f,start,steps=1,sim=3,render=2,other=0){f.setTime(start);f.api.beginFrame(steps);f.api.beginSimulation();f.setTime(start+sim);f.api.endSimulation();f.api.beginRender();f.setTime(start+sim+render);f.api.endRender();f.setTime(start+sim+render+other);f.api.endFrame();}

test('only exact perf=1 enables; disabled URLs have zero DOM, clock, timer or storage work',()=>{
 const forbidden=new Proxy({}, {get(){throw Error('disabled diagnostic accessed host/DOM');}});
 for(const search of ['', '?perf=0','?performance=1','?perf=true','?perf=10','?x=perf=1']){
  assert.equal(runtimePerformanceEnabled(search),false);
  assert.equal(createRuntimePerformance({search,root:forbidden,host:forbidden,getSaveLength:()=>{throw Error('storage read');}}),null);
 }
 assert(runtimePerformanceEnabled('?x=1&perf=1'));
});

test('sample window is bounded, expires idle frames and rejects non-finite/negative timings',()=>{
 const ring=createFrameSampleWindow();
 for(let i=0;i<200;i++)ring.push(i*10,10,3,6,2,8);
 assert.equal(ring.read(1990).frames,180);assert.equal(ring.read(1990).fps,100);assert.equal(ring.read(1990).stepMean,3);
 ring.push(2000,NaN,1,1,1,3);ring.push(2000,10,1,-1,1,3);ring.push(2000,10,1,1,Infinity,3);
 assert.equal(ring.read(1990).frames,180);assert.equal(ring.read(6000).frames,0);assert.equal(ring.read(6000).fps,null);
 ring.clear();ring.push(1,0,8,20,4,25);assert.equal(ring.read(1).fps,null);assert.equal(ring.read(1).lastSteps,8);
 ring.push(101,100,3,9,5,15);assert.equal(ring.read(101).fps,10);assert.equal(ring.read(101).intervalP95,100);
});

test('frames only collect numbers; 750ms update shows separate CPU/steps/real version/render data and one storage read',()=>{
 const f=fixture({renderer:{domElement:{width:1363,height:629},info:{render:{calls:72,triangles:30000}},getPixelRatio:()=>1.6}});
 const initial=f.counters().writes;
 frame(f,0,1,3,2);frame(f,100,3,9,4);frame(f,200,3,9,4,7);
 assert.equal(f.counters().writes,initial,'frame taps cannot write DOM');f.refresh();
 assert.match(f.text.textContent,/R16\.987 · JS 01234567/);
 assert.match(f.text.textContent,/FPS\(rAF\) 10\.0/);assert.match(f.text.textContent,/100\.0 \/ 100\.0 ms/);
 assert.match(f.text.textContent,/最新\/均\/峰 3\/2\.3\/3/);
 assert.match(f.text.textContent,/模拟循环CPU 均\/峰 7\.0\/9\.0 ms/);
 assert.match(f.text.textContent,/整帧回调CPU 均\/峰 12\.7\/20\.0 ms/);
 assert.match(f.text.textContent,/render CPU提交 均\/峰 3\.3\/4\.0 ms/);
 assert.match(f.text.textContent,/calls 72 · triangles 30000/);assert.match(f.text.textContent,/1363×629 · DPR 1\.6\/3\.0/);
 assert.match(f.text.textContent,/NPC 31 · GPU 未测/);assert.match(f.text.textContent,/12345码元 ≈24KiB\(UTF-16\)/);
 f.refresh();assert.equal(f.counters().saveReads,1);
});

test('renderer unavailable, collapse/reopen, background reset and close are safe',()=>{
 const f=fixture();assert.match(f.panel.style.cssText,/box-sizing:border-box/);for(const button of [f.toggle,f.close]){assert.match(button.style.cssText,/min-width:44px/);assert.match(button.style.cssText,/min-height:44px/);}frame(f,0);frame(f,16);f.refresh();assert.match(f.text.textContent,/calls 未测 · triangles 未测/);
 f.toggle.onclick();const writes=f.counters().writes;frame(f,32);f.refresh();assert.equal(f.counters().writes,writes);assert(f.text.hidden);
 f.toggle.onclick();assert(!f.text.hidden);f.refresh();assert.equal(f.toggle.attrs['aria-expanded'],'true');
 f.root.hidden=true;f.listeners.get('visibilitychange')();f.setTime(100000);f.refresh();
 f.root.hidden=false;f.listeners.get('visibilitychange')();frame(f,100000);f.refresh();assert.match(f.text.textContent,/FPS\(rAF\) 未测/);
 frame(f,100020);f.refresh();assert.match(f.text.textContent,/FPS\(rAF\) 50\.0/);
 f.close.onclick();f.close.onclick();assert.equal(f.root.body.children.length,0);assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);assert.equal(f.counters().closed,1);
});

test('production animate taps the actual 1/3/8 simulation iterations, preserving paused and ordinary mode',()=>{
 const source=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
 const start=source.indexOf('let frame=0;function animate()'),animate=source.slice(start,source.indexOf("addEventListener('pagehide'",start));
 for(const [raw,expected,enabled,paused] of [[.016,1,true,false],[.1,3,true,false],[1,8,true,false],[.1,3,false,false],[1,0,true,true]]){
  let iterations=0,submitted=0,reported=null;const events=[];
  const no=()=>{};
  const context={requestAnimationFrame:no,simulationFrame,clock:{getDelta:()=>raw},paused,beginActorNavigationStep:no,mode:'lot',flushShapePreview:no,elapsed:0,lotAnimationTime:0,frame:0,
   advanceWorldClock:no,updateAutomaticDoors:no,activeDailyToilet:()=>null,updatePlayer:()=>iterations++,japanWeatherCharms:null,updateNPCs:no,updateGameHealth:no,refreshScenePanels:()=>events.push('panels'),japanServiceUI:null,japanPerformanceUI:null,chinaTavernUI:null,chinaSalonUI:null,lot:{},furniture:null,
   simulationClock:{state:()=>({hour:10,day:0})},$:()=>({}),careerHandbook:{update:no},studyMenu:{update:no},player:null,updateCamera:no,renderer:{render:()=>{submitted++;events.push('render');}},scene:{},camera:{},updateLabels:()=>events.push('labels'),updateFurnitureLabels:()=>events.push('furniture-labels'),
   runtimePerformance:enabled?{beginFrame:s=>reported=s,beginSimulation:()=>events.push('simulation-start'),endSimulation:()=>events.push('simulation-end'),beginRender:()=>events.push('render-start'),endRender:()=>events.push('render-end'),endFrame:()=>events.push('frame-end')}:null};
  vm.runInNewContext(animate+'\nanimate();',context);
  assert.equal(iterations,expected);assert.equal(submitted,paused?0:1);
  if(enabled&&!paused){assert.equal(reported,expected);assert.deepEqual(events,['simulation-start','simulation-end','panels','render-start','render','render-end','labels','furniture-labels','frame-end']);}
  if(!enabled||paused)assert.equal(reported,null);
 }
});

// Catch the long-frame regression without allocating a country scene: run the
// actual animate, updateNPCs and panel helper, with counted service boundaries.
// The real Egypt panel additionally proves closed/open final-state projection.
test('pure panels run once after 1/3/8 real simulation steps; business and interaction UI keep every step',()=>{
 const source=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
 const npcStart=source.indexOf('function updateNPCs('),npcCode=source.slice(npcStart,source.indexOf('// Shared physiological hunger',npcStart));
 const panelStart=source.indexOf('function refreshScenePanels('),panelCode=source.slice(panelStart,source.indexOf('let runtimePerformance=',panelStart));
 const frameStart=source.indexOf('let frame=0;function animate()'),frameCode=source.slice(frameStart,source.indexOf("addEventListener('pagehide'",frameStart));
 const panels=['egyptMealUI','chinaConsortUI','japanPerformanceUI','chinaSalonUI'];
 const perStep=['egyptTableServiceEmployment','egyptKitchenEmployment','egyptMeal','japanTableServiceEmployment','japanKitchenEmployment','japanBathMixingEmployment','japanBathDeliveryEmployment','japanWomenBathDeliveryEmployment','japanReceptionEmployment','npcSocial','playerConversationUI','franceLabor','franceGardener','japanPerformance','franceTeaEmployment','francePastryEmployment','franceMealUI','franceTea','chinaLabor','chinaService','chinaSalon','chinaMoneyHouse','chinaTavern','chinaLodging','chinaLodgingUI','chinaRoyalKitchenEmployment','chinaRoyalKitchen','chinaRoyalPlayerMeal','chinaClinicEmployment','chinaClinicPhysicianEmployment','chinaClinic','chinaAudience','chinaCareer','chinaEdict','chinaConsortCourt','chinaPalace','chinaGuardEmployment','chinaArchery','japanService','japanServiceUI','chinaTavernUI'];
 for(const [raw,steps]of [[.016,1],[.1,3],[1,8]])for(const opened of [false,true]){
  const calls=new Map(),events=[],seen=[],no=()=>{};let iteration=0,viewReads=0,effects=0,phase='idle',socialOpen=true;
  const count=name=>{calls.set(name,(calls.get(name)||0)+1);events.push(name);};
  const context={requestAnimationFrame:no,simulationFrame,clock:{getDelta:()=>raw},paused:false,mode:'lot',elapsed:0,lotAnimationTime:0,
   beginActorNavigationStep:dt=>{count('navigation');assert.equal(dt,simulationFrame(raw).stepDt);},flushShapePreview:no,advanceWorldClock:()=>count('worldClock'),updateAutomaticDoors:()=>count('doors'),activeDailyToilet:()=>({update:()=>count('toilet')}),
   updatePlayer:()=>{iteration++;count('player');},japanWeatherCharms:{update:()=>count('weather')},updateGameHealth:()=>count('health'),egyptDailyToilet:{updateStaff:()=>count('egyptStaff')},
   simulationClock:{state:()=>({hour:10,day:0})},player:{root:{position:{}}},npcs:[],performing:null,seated:null,pendingInteraction:null,targetStation:null,bathTransition:null,dusk:false,
   lot:{},furniture:null,$:()=>({}),careerHandbook:{update:no},studyMenu:{update:no},lighting:{update:no},updateCamera:no,renderer:{render:()=>{count('render');assert.equal(phase,'render');}},scene:{},camera:{},updateLabels:no,updateFurnitureLabels:no,
   runtimePerformance:{beginFrame:n=>{assert.equal(n,steps);phase='frame';},beginSimulation:()=>{phase='simulation';},endSimulation:()=>{phase='panels';},beginRender:()=>{phase='render';},endRender:no,endFrame:()=>{phase='ended';}}};
  for(const name of perStep)context[name]={update:()=>count(name)};
  Object.assign(context.npcSocial,{state:()=>null,conversationActorId:()=>null,meetingState:()=>null});
  context.chinaCareer.syncPlayer=()=>count('careerSync');
  // Stand-in for the deliberately retained close/end responsibility. Downstream
  // controllers must observe it in the same step, not after the frame's UI pass.
  context.playerConversationUI.update=()=>{count('playerConversationUI');socialOpen=false;};
  context.franceLabor.update=()=>{assert.equal(socialOpen,false);count('franceLabor');};
  for(const name of panels)context[name]={update:()=>{count(name);assert.equal(phase,'panels');seen.push(iteration);}};
  class Element{
   constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.open=false;this._text='';}
   set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(e=>e.textContent).join('');}
   append(...children){this.children.push(...children);}replaceChildren(...children){this._text='';this.children=children;}
   setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}addEventListener(){}showModal(){this.open=true;}close(){this.open=false;}querySelectorAll(){return [];}remove(){}
  }
  const doc={head:new Element('head'),body:new Element('body'),createElement:tag=>new Element(tag)};
  const service={view:()=>{viewReads++;return {order:{id:'order',stage:'ready',payment:'reserved'},label:'step '+iteration,cash:20+iteration,seated:true,price:5,name:'餐点',canOrder:false};},request:()=>effects++,cancel:()=>effects++,eat:()=>effects++};
  const ui=createEgyptMealUI({service,document:doc});if(opened)ui.open();viewReads=0;
  context.egyptMealUI.update=()=>{count('egyptMealUI');assert.equal(phase,'panels');seen.push(iteration);ui.update();};
  vm.runInNewContext(npcCode+'\n'+panelCode+'\n'+frameCode+'\nanimate();',context);
  for(const name of [...perStep,'navigation','worldClock','doors','toilet','player','weather','health','egyptStaff','careerSync'])assert.equal(calls.get(name),steps,name+' retains every simulation step');
  for(const name of panels)assert.equal(calls.get(name),1,name+' projects only the final state');
  assert.deepEqual(seen,[steps,steps,steps,steps]);assert.equal(viewReads,1);assert.equal(effects,0);assert.equal(ui.isOpen(),opened);
  if(opened){assert(doc.body.children[0].textContent.includes('step '+steps));assert(doc.body.children[0].textContent.includes('随身 '+(20+steps)));}
  else assert.equal(doc.body.children[0].children.length,0,'closed panel stays closed without creating controls');
  assert(events.indexOf('egyptMealUI')>events.lastIndexOf('chinaTavernUI'));assert(events.indexOf('render')>events.indexOf('chinaSalonUI'));assert.equal(phase,'ended');
  ui.close();ui.update();assert.equal(effects,0,'close and later refresh cannot cancel, reserve or consume');
  ui.open();assert(doc.body.children[0].textContent.includes('step '+steps),'reopen reads final service state');ui.dispose();
 }
});
