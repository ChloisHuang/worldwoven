// Narrow regression: diagnostics must never activate, touch storage or time normal URLs.
// Also protects the real animate-loop tap from reporting clamped delta as device FPS.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRuntimePerformance,createFrameSampleWindow,runtimePerformanceEnabled} from '../source/game/runtime-performance.js';
import {simulationFrame} from '../source/game/movement-runtime.js';

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
   advanceWorldClock:no,updateAutomaticDoors:no,activeDailyToilet:()=>null,updatePlayer:()=>iterations++,japanWeatherCharms:null,updateNPCs:no,updateGameHealth:no,japanServiceUI:null,japanPerformanceUI:null,chinaTavernUI:null,chinaSalonUI:null,lot:{},furniture:null,
   simulationClock:{state:()=>({hour:10,day:0})},$:()=>({}),careerHandbook:{update:no},studyMenu:{update:no},player:null,updateCamera:no,renderer:{render:()=>{submitted++;events.push('render');}},scene:{},camera:{},updateLabels:()=>events.push('labels'),updateFurnitureLabels:()=>events.push('furniture-labels'),
   runtimePerformance:enabled?{beginFrame:s=>reported=s,beginSimulation:()=>events.push('simulation-start'),endSimulation:()=>events.push('simulation-end'),beginRender:()=>events.push('render-start'),endRender:()=>events.push('render-end'),endFrame:()=>events.push('frame-end')}:null};
  vm.runInNewContext(animate+'\nanimate();',context);
  assert.equal(iterations,expected);assert.equal(submitted,paused?0:1);
  if(enabled&&!paused){assert.equal(reported,expected);assert.deepEqual(events,['simulation-start','simulation-end','render-start','render','render-end','labels','furniture-labels','frame-end']);}
  if(!enabled||paused)assert.equal(reported,null);
 }
});
