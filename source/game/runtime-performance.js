// Opt-in, local-only measurements. No storage, network, renderer mutation or GPU waits.
const WINDOW_MS=3000,SAMPLE_LIMIT=180,REFRESH_MS=750;
const finite=value=>Number.isFinite(value)&&value>=0;
const number=value=>finite(value)?value.toFixed(1):'未测';

export function runtimePerformanceEnabled(search=''){
 return search.replace(/^\?/,'').split('&').some(part=>part==='perf=1');
}

// Fixed-size ring; allocations and percentile sorting happen only on a panel refresh.
export function createFrameSampleWindow(){
 const data=new Float64Array(SAMPLE_LIMIT*6);let cursor=0,count=0;
 return {
  clear(){cursor=count=0;},
  push(at,interval,steps,simulationMs,renderMs,callbackMs){
   if(!finite(at)||!finite(interval)||!finite(steps)||!finite(simulationMs)||!finite(renderMs)||!finite(callbackMs))return;
   const offset=cursor*6;data[offset]=at;data[offset+1]=interval;data[offset+2]=steps;data[offset+3]=simulationMs;data[offset+4]=renderMs;data[offset+5]=callbackMs;
   cursor=(cursor+1)%SAMPLE_LIMIT;count=Math.min(count+1,SAMPLE_LIMIT);
  },
  read(now){
   const intervals=[];let frames=0,stepSum=0,stepMax=0,lastSteps=null,simulationSum=0,simulationMax=0,renderSum=0,renderMax=0,callbackSum=0,callbackMax=0;
   for(let i=0;i<count;i++){
    const offset=((cursor-count+i+SAMPLE_LIMIT)%SAMPLE_LIMIT)*6,at=data[offset];
    if(at<now-WINDOW_MS||at>now)continue;
    frames++;if(data[offset+1]>0)intervals.push(data[offset+1]);
    lastSteps=data[offset+2];stepSum+=lastSteps;stepMax=Math.max(stepMax,lastSteps);
    simulationSum+=data[offset+3];simulationMax=Math.max(simulationMax,data[offset+3]);
    renderSum+=data[offset+4];renderMax=Math.max(renderMax,data[offset+4]);
    callbackSum+=data[offset+5];callbackMax=Math.max(callbackMax,data[offset+5]);
   }
   intervals.sort((a,b)=>a-b);
   const intervalMean=intervals.length?intervals.reduce((sum,value)=>sum+value,0)/intervals.length:null;
   return {frames,intervalMean,intervalP95:intervals.length?intervals[Math.ceil(intervals.length*.95)-1]:null,fps:intervalMean?1000/intervalMean:null,
    lastSteps,stepMean:frames?stepSum/frames:null,stepMax:frames?stepMax:null,
    simulationMean:frames?simulationSum/frames:null,simulationMax:frames?simulationMax:null,renderMean:frames?renderSum/frames:null,renderMax:frames?renderMax:null,
    callbackMean:frames?callbackSum/frames:null,callbackMax:frames?callbackMax:null};
  }
 };
}

export function createRuntimePerformance({search=globalThis.location?.search||'',root=globalThis.document,host=globalThis,getRenderer=()=>null,getNpcCount=()=>null,getSaveLength=()=>null,sourceUrl='',onClose=()=>{}}={}){
 // Ordinary URLs return before touching DOM, timers, performance or renderer APIs.
 if(!runtimePerformanceEnabled(search)||!root?.body)return null;
 const samples=createFrameSampleWindow(),now=()=>host.performance.now();
 let saveLength=null;try{saveLength=getSaveLength();}catch{/* Storage may be unavailable; never retry or change it. */}
 const panel=root.createElement('section'),bar=root.createElement('div'),title=root.createElement('span'),toggle=root.createElement('button'),close=root.createElement('button'),text=root.createElement('pre');
 panel.id='runtime-performance';panel.setAttribute('aria-label','本机运行性能诊断');
 // Center of the existing safe UI frame avoids the corner HUD and thumb controls.
 // Text does not intercept scene/joystick gestures; only the two buttons do.
 panel.style.cssText='position:fixed;box-sizing:border-box;z-index:38;left:var(--ww-ui-center-x,50vw);top:var(--ww-ui-center-y,50vh);transform:translate(-50%,-50%);width:292px;max-width:var(--ww-ui-width,calc(100vw - 32px));max-height:var(--ww-ui-height,calc(100dvh - 32px));overflow:hidden;background:#142b30ed;color:#fff9e8;border:1px solid #ffffff65;border-radius:8px;padding:7px 9px;pointer-events:none;font:11px/1.4 ui-monospace,monospace;contain:content';
 bar.style.cssText='display:flex;align-items:center;gap:8px';title.textContent='性能 · 近3秒 / 最多180帧';title.style.cssText='flex:1;font-size:10px';
 for(const button of [toggle,close]){button.type='button';button.style.cssText='pointer-events:auto;background:transparent;color:inherit;padding:5px 4px;font:11px/1.2 sans-serif;min-width:44px;min-height:44px;touch-action:manipulation';}
 toggle.textContent='收起';toggle.setAttribute('aria-expanded','true');close.textContent='关闭';
 text.style.cssText='margin:3px 0 0;font:inherit;white-space:pre-wrap;overflow-wrap:anywhere';text.textContent='采样中 · 每750ms刷新\nGPU 未测（CPU提交不代表GPU耗时）';
 bar.append(title,toggle,close);panel.append(bar,text);root.body.append(panel);
 let closed=false,collapsed=false,previousFrame=null,frameStart=0,steps=0,simulationStart=0,simulationMs=0,renderStart=0,renderMs=0;
 const reset=()=>{previousFrame=null;samples.clear();};
 function refresh(){
  if(closed||collapsed||root.hidden)return;
  const stats=samples.read(now()),renderer=getRenderer(),render=renderer?.info?.render,canvas=renderer?.domElement;
  const release=root.querySelector?.('.build-badge')?.textContent?.match(/\bR\d+(?:\.\d+)+\b/)?.[0]||'版本未测';
  const script=String(sourceUrl).match(/\.([a-f0-9]{16})\.js(?:[?#]|$)/)?.[1]?.slice(0,8)||'开发源码';
  const calls=finite(render?.calls)?render.calls:'未测',triangles=finite(render?.triangles)?render.triangles:'未测';
  const pixels=finite(canvas?.width)&&finite(canvas?.height)?`${canvas.width}×${canvas.height}`:'未测';
  const dpr=typeof renderer?.getPixelRatio==='function'?renderer.getPixelRatio():null,npcs=getNpcCount();
  text.textContent=[`${release} · JS ${script}`,
   `FPS(rAF) ${number(stats.fps)} · 间隔均/P95`,
   `  ${number(stats.intervalMean)} / ${number(stats.intervalP95)} ms`,
   `补步/帧 最新/均/峰 ${stats.lastSteps??'未测'}/${number(stats.stepMean)}/${stats.stepMax??'未测'}`,
   `整帧回调CPU 均/峰 ${number(stats.callbackMean)}/${number(stats.callbackMax)} ms`,
   `模拟循环CPU 均/峰 ${number(stats.simulationMean)}/${number(stats.simulationMax)} ms`,
   `render CPU提交 均/峰 ${number(stats.renderMean)}/${number(stats.renderMax)} ms`,
   `calls ${calls} · triangles ${triangles}`,
   `像素 ${pixels} · DPR ${number(dpr)}/${number(host.devicePixelRatio)}`,
   `NPC ${finite(npcs)?npcs:'未测'} · GPU 未测`,
   finite(saveLength)?`初始存档 ${saveLength}码元 ≈${(saveLength*2/1024).toFixed(0)}KiB(UTF-16)`:'初始存档长度 未测',
   stats.frames?'DPR=渲染/设备 · 750ms刷新':'等待新呈现帧 · 750ms刷新'].join('\n');
 }
 const timer=host.setInterval(refresh,REFRESH_MS);
 root.addEventListener('visibilitychange',reset);
 const api={
  beginFrame(actualSteps){frameStart=now();steps=actualSteps;simulationMs=renderMs=0;},
  beginSimulation(){simulationStart=now();},
  endSimulation(){simulationMs=now()-simulationStart;},
  beginRender(){renderStart=now();},
  endRender(){renderMs=now()-renderStart;},
  endFrame(){const end=now();samples.push(end,previousFrame===null?0:frameStart-previousFrame,steps,simulationMs,renderMs,end-frameStart);previousFrame=frameStart;},
  close(){if(closed)return;closed=true;host.clearInterval(timer);root.removeEventListener('visibilitychange',reset);panel.remove();samples.clear();onClose();}
 };
 toggle.onclick=()=>{collapsed=!collapsed;text.hidden=collapsed;toggle.textContent=collapsed?'展开':'收起';toggle.setAttribute('aria-expanded',String(!collapsed));};
 close.onclick=api.close;
 return api;
}
