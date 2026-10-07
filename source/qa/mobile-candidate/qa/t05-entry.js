import {serviceCases} from './t05-service-fixtures.js';
import {globalCases} from './t05-global-fixtures.js';
import {viewportCases} from './mobile-viewport-fixture.js';
import {familyCases} from './mobile-family-fixture.js';
import {hudCases} from './hud-fixtures.js';
import {AIRY_PANEL_STYLE} from '../game/airy-panel.js';
import {AIRY_UI_THEME} from '../game/china-money-house-theme.js';
import {syncUiViewport} from '../game/viewport-layout.js';
// These exact candidate default changes are confined to the QA document.
// Production R164 styles and its normal module graph remain byte-identical.
const candidateShared=AIRY_PANEL_STYLE.replace('.ww-airy-panel-actions button{width:100%}', '.ww-airy-panel-actions :where(button){width:100%}').replace('.ww-airy-panel-body{min-height:0;overflow:auto;overscroll-behavior:contain;flex:1 1 auto}', '.ww-airy-panel-body{min-height:0;overscroll-behavior:contain;flex:1 1 auto}:where(.ww-airy-panel-body){overflow:auto}');
const cases=[...serviceCases,...globalCases,...viewportCases,...familyCases,...hudCases];
const query=new URLSearchParams(location.search);
if(document.documentElement.dataset.qaFrame==='true'){
 const id=query.get('case')||cases[0].id,fixture=cases.find(c=>c.id===id),safe=query.get('safe')||'none';
 const logs=[];let mounted;
 const notify=message=>{logs.push(String(typeof message==='object'?JSON.stringify(message):message));};
 const send=()=>{try{
  const frame=syncUiViewport(document),rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};},visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
  const panels=Array.from(document.querySelectorAll('dialog[open],[role=dialog]')).filter(visible);
  const rows=panels.map(panel=>({class:panel.className,rect:rect(panel),scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight,
   buttons:Array.from(panel.querySelectorAll('button')).filter(visible).map(b=>({text:(b.textContent||b.getAttribute('aria-label')||'').trim(),rect:rect(b),disabled:b.disabled,scrollWidth:b.scrollWidth,clientWidth:b.clientWidth,lineHeight:getComputedStyle(b).lineHeight})),
   regions:Array.from(panel.querySelectorAll('.ww-airy-panel-body,footer,[class$="-content"],[class$="-detail"],[class$="-menu"]')).filter(visible).map(e=>({class:e.className,rect:rect(e),overflow:getComputedStyle(e).overflow,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight}))}));
  const report={case:id,label:fixture?.label,viewport:[innerWidth,innerHeight],safe,frame,cascade:query.get('cascade'),panels:rows,logs:logs.slice(-5),error:document.querySelector('[data-qa-error]')?.textContent||null};
  parent.postMessage({kind:'t05-result',report},location.origin);
 }catch(error){parent.postMessage({kind:'t05-result',report:{case:id,error:String(error.stack||error)}},location.origin);}};
 try{
  if(document.documentElement.dataset.mobileGame!=='inner')for(const side of ['left','right','top','bottom'])document.documentElement.style.setProperty('--ww-safe-'+side,((side===safe?59:side==='bottom'&&safe!=='none'?21:0))+'px');
  syncUiViewport(document);if(!fixture)throw Error('Unknown finite QA case '+id);
  mounted=fixture.mount({document,log:notify});
  // Reproduce a later panel's exact shared injection without starting its business.
  // Baseline is deliberately labelled and exists only in this isolated QA page.
  const later=document.createElement('style');later.dataset.qaLaterShared='true';let shared=AIRY_PANEL_STYLE;
  if(query.get('cascade')==='baseline')shared+='\n.ww-airy-panel-actions button{width:100%}.ww-airy-panel-body{overflow:auto}';
  later.textContent=AIRY_UI_THEME+shared;document.head.append(later);
  if(query.get('cascade')!=='baseline')for(const style of document.querySelectorAll('style'))style.textContent=style.textContent.split(AIRY_PANEL_STYLE).join(candidateShared);
  await (mounted.open||(()=>mounted.ui?.open()))();
  await Promise.all(Array.from(document.querySelectorAll('link[rel=stylesheet]')).filter(l=>!l.sheet).map(l=>new Promise(resolve=>{l.addEventListener('load',resolve,{once:true});l.addEventListener('error',resolve,{once:true});})));
  requestAnimationFrame(()=>requestAnimationFrame(send));
  document.addEventListener('click',()=>requestAnimationFrame(()=>requestAnimationFrame(send)));
  window.addEventListener('resize',()=>requestAnimationFrame(send));
  window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.kind==='t05-measure')send();});
  window.addEventListener('pagehide',()=>mounted.dispose?.());
 }catch(error){const p=document.createElement('p');p.dataset.qaError='true';p.textContent=String(error.stack||error);document.body.append(p);send();}
}else{
 let sweep=null;const select=document.getElementById('case'),frame=document.getElementById('frame'),size=document.getElementById('size'),safe=document.getElementById('safe'),cascade=document.getElementById('cascade');
 let group;for(const c of cases){if(group?.label!==c.group){group=document.createElement('optgroup');group.label=c.group;select.append(group);}const option=document.createElement('option');option.value=c.id;option.textContent=c.label;group.append(option);}
 if(cases.some(c=>c.id===query.get('case')))select.value=query.get('case');if(query.has('size'))size.value=query.get('size');if(query.has('safe'))safe.value=query.get('safe');if(query.has('cascade'))cascade.value=query.get('cascade');
 document.getElementById('case-count').textContent=`${cases.length} 个有限初始状态；面板内操作仅作用于本次内存夹具。`;
 function load(){const [w,h]=size.value.split('x').map(Number);frame.width=w;frame.height=h;const q=new URLSearchParams({case:select.value,safe:safe.value,cascade:cascade.value});frame.src='./t05-frame.html?'+q;document.getElementById('result').textContent='等待面板…';history.replaceState(null,'','?'+new URLSearchParams({...Object.fromEntries(q),size:size.value}));}
 for(const control of [select,size,safe,cascade])control.addEventListener('change',load);document.getElementById('reload').onclick=()=>{sweep=null;load();};document.getElementById('all').onclick=()=>{sweep={index:0,rows:[]};select.value=cases[0].id;load();};document.getElementById('measure').onclick=()=>frame.contentWindow.postMessage({kind:'t05-measure'},location.origin);
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.kind==='t05-result'){const report=e.data.report;document.getElementById('result').textContent=JSON.stringify(report,null,2);if(sweep&&report.case===cases[sweep.index]?.id){sweep.rows.push(report);sweep.index++;document.getElementById('summary').textContent=JSON.stringify(sweep.rows,null,2);if(sweep.index<cases.length){select.value=cases[sweep.index].id;load();}else{document.getElementById('case-count').textContent=`完成 ${sweep.rows.length} 个状态的真实DOM测量；请审阅每个失败/裁切。`;sweep=null;}}}});load();
}
