import {displayedViewport} from '../game/viewport-layout.js';
export const viewportCases=[{id:'mobile-coordinates',label:'浏览器坐标映射 · 非世界模拟',group:'手机视口',mount({document:doc,log}){
 const canvas=doc.createElement('canvas');canvas.id='world';canvas.style.background='#244d51';doc.body.append(canvas);
 const output=doc.createElement('output');output.id='coordinate-result';output.style.cssText='position:fixed;left:140px;top:110px;color:#fff;padding:12px;max-width:350px;font:16px monospace';output.textContent='点击圆点或拖动背景：读取真实 PointerEvent 的逻辑坐标';doc.body.append(output);
 const target=doc.createElement('button');target.id='coordinate-target';target.textContent='◎';target.setAttribute('aria-label','逻辑坐标圆点');target.style.cssText='position:fixed;left:200px;top:180px;width:60px;height:60px;border-radius:50%;background:#fff4d5;color:#355d50;font-size:30px';doc.body.append(target);
 const view=displayedViewport(canvas);let origin=null;
 const record=e=>{const rect=target.getBoundingClientRect();const info={event:e.type,x:e.clientX,y:e.clientY,ndc:[e.clientX/view.width*2-1,-e.clientY/view.height*2+1],logicalViewport:[view.width,view.height],target:[rect.left,rect.top,rect.width,rect.height],delta:origin?[e.clientX-origin.x,e.clientY-origin.y]:null};output.textContent=JSON.stringify(info);log(info);};
 target.addEventListener('pointerdown',record);canvas.addEventListener('pointerdown',e=>{origin={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);record(e);});canvas.addEventListener('pointermove',e=>{if(origin)record(e);});canvas.addEventListener('pointerup',e=>{record(e);origin=null;});
 return {open(){},dispose(){canvas.remove();output.remove();target.remove();}};
}}];
