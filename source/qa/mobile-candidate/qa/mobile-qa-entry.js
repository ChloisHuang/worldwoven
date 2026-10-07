import {createMobileViewportHost,mountMobileViewport} from '../game/mobile-viewport.js';
const query=new URLSearchParams(location.search),mode=document.documentElement.dataset.mobileQa;
if(mode==='inner'){
 mountMobileViewport();
 await import('./t05-entry.js');
}else if(mode==='shell'){
 document.documentElement.style.setProperty('--ww-safe-top','59px');document.documentElement.style.setProperty('--ww-safe-bottom','34px');
 const host=createMobileViewportHost(window,{url:'./mobile-inner.html?'+query});
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin)return;
  if(event.source===host.frame.contentWindow&&event.data?.kind==='t05-result')parent.postMessage({...event.data,geometry:JSON.parse(host.frame.dataset.mobileGeometry)},location.origin);
  if(event.source===parent&&event.data?.kind==='t05-measure')host.frame.contentWindow.postMessage(event.data,location.origin);
 });
}else{
 const cases=['hud-idle','hud-progress','hud-complete','hud-wallet','mobile-coordinates','family-player','family-long-list','wallet-four-currencies','bank-china','bank-japan','bank-france','bank-egypt','passport-four-countries','career-catalogue-china','career-working-cn-tavern-steward','conversation-china'];
 const phone=document.getElementById('phone');
 const load=id=>{query.set('case',id);phone.src='./mobile-shell.html?'+query;history.replaceState(null,'','?'+query);};
 for(const id of cases){const button=document.createElement('button');button.textContent=id;button.onclick=()=>load(id);document.getElementById('cases').append(button);}
 for(const button of document.querySelectorAll('[data-size]'))button.onclick=()=>{const [width,height]=button.dataset.size.split('x');phone.width=width;phone.height=height;};
 document.getElementById('measure').onclick=()=>phone.contentWindow.postMessage({kind:'t05-measure'},location.origin);
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===phone.contentWindow&&event.data?.kind==='t05-result')document.getElementById('result').textContent=JSON.stringify(event.data,null,2);});
 load(query.get('case')||cases[0]);
}
