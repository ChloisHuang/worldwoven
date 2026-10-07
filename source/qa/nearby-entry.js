// QA-only presentation entry. No main/game initialization, storage, runtime
// orders, payment/relationship controllers, or source monkey patches.
import {createObjectActionMenu} from './nearby-candidate/object-action-menu.js';
import {createPlayerConversationUI} from './nearby-candidate/player-conversation-ui.js';
import {createCurrencyWallet} from './nearby-candidate/wallet.js';
import {createCurrencyLedger} from '../game/currency-ledger.js';
import {PLAYER_CONVERSATION_TOPICS} from '../game/player-conversation-ledger.js';
import {syncUiViewport,createHudLayout} from '../game/viewport-layout.js';

const CASES={
 wallet:{country:'china',caption:'候选钱包真实DOM：只用内存账本。每300ms调用refresh以复现旧跳顶；滚动不应被拉回。银行按钮关闭钱包并记录真实目标回调，此QA不执行导航。'},
 'cn-nearby':{country:'china',caption:'真实许安与迎客茶案两目标。柜台五项来自生产候选：长期职位、临工、产权、客房、食单。点击目标可检查文字与菜单；Tab 切换，E 选择。'},
 'cn-menu':{country:'china',caption:'自动打开迎客茶案的真实五项候选菜单。可滚动、点击、关闭；关闭后保留同镜头目标，重新打开不执行业务。'},
 'jp-nearby':{country:'japan',caption:'真实拉面吧台单目标：测试站位与 Daichi 相距 2.38m，原新社交目标门槛为 1.8m，因此没有人为增加第二个聊天目标。'},
 conversation:{country:'china',caption:'真实交谈 UI 模块；许安的原场景介绍与三个已有本地话题。未构造关系经历或解锁额外话题；选择只记录回调。'},
};
const query=new URLSearchParams(location.search),requested=query.get('case')||'cn-nearby',caseId=CASES[requested]?requested:'cn-nearby',fixture=CASES[caseId];
const scope='非实机 · Mesa 背景 + 真实产品 DOM/CSS · 仅内存选择';

if(query.get('frame')!=='1'){
 const select=document.getElementById('nearby-case'),frame=document.getElementById('nearby-frame'),result=document.getElementById('nearby-result'),status=document.getElementById('nearby-status');select.value=caseId;
 function load(){const url=new URL(location.href);url.search=new URLSearchParams({case:select.value,frame:'1'});frame.src=url.href;document.getElementById('nearby-caption').textContent=CASES[select.value].caption;status.textContent='等待画面…';result.textContent='';const own=new URL(location.href);own.search=new URLSearchParams({case:select.value});history.replaceState(null,'',own);}
 select.addEventListener('change',load);document.getElementById('nearby-reload').onclick=load;document.getElementById('nearby-measure').onclick=()=>frame.contentWindow.postMessage({kind:'nearby-measure'},location.origin);
 window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.kind!=='nearby-result')return;const report=event.data.report;result.textContent=JSON.stringify(report,null,2);status.textContent=report.error?'验证页错误：'+report.error:`${scope} · ${report.viewport.join('×')} · ${report.visibleTargets.length} 个可见目标 · ${report.panels.length} 个面板${report.logs.length?' · '+report.logs.at(-1):''}`;});
 load();
}else{
 const logs=[],labels=new Map();let menu=null,conversation=null,projection=null,socialState=null,disposed=false,wallet=null,refreshTimer=null;
 const record=text=>{logs.push(String(text));queueReport();};
 function rect(element){const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}
 const visible=element=>!element.hidden&&!!element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden';
 function report(){if(disposed)return;const panels=[...document.querySelectorAll('dialog[open],[role=dialog]')].filter(visible);parent.postMessage({kind:'nearby-result',report:{case:caseId,scope,viewport:[innerWidth,innerHeight],sceneCamera:projection?.camera,scenePlayer:projection?.player,hudRects:[...document.querySelectorAll('.location-card,.lot-tools,.character-card,.camera-tools,.joystick')].filter(visible).map(e=>({class:e.className,rect:rect(e)})),sourceTargets:projection?.targets.map(t=>({id:t.id,name:t.name,world:t.point,screen:t.projected,actions:t.actions.map(a=>a.action)})),visibleTargets:[...document.querySelectorAll('.object-action-icon')].filter(visible).map(e=>({id:e.dataset.objectTarget,label:e.getAttribute('aria-label'),rect:rect(e)})),panels:panels.map(e=>({class:e.className,rect:rect(e),buttons:[...e.querySelectorAll('button')].filter(visible).map(b=>({text:b.textContent.trim()||b.getAttribute('aria-label'),rect:rect(b),disabled:b.disabled})),scroll:[...e.querySelectorAll('.context-action-list,.ww-airy-panel-body,.ww-wallet-body,.ww-wallet-ledger-scroll,.ww-wallet-fan')].map(s=>({class:s.className,clientHeight:s.clientHeight,scrollHeight:s.scrollHeight,scrollTop:s.scrollTop}))})),logs:logs.slice(-12),error:document.getElementById('nearby-error')?.textContent||null}},location.origin);}
 function queueReport(){requestAnimationFrame(()=>requestAnimationFrame(report));}
 const actor={id:'cn-tavern-host',station:{id:'cn-tavern-host',npcName:'许安',npcLabel:'柜台接待 · 迎客登记'}};
 const sourceReply='云来楼一层用饭，二层客房，三层雅集。坐到餐椅后招呼我，今日有云来菌菇饭。客房每间12铜文，入住起一游戏日；先在案前选房登记，我记好后你再自行上楼。';
 const social={begin(){socialState={id:'cn-tavern-host',name:'许安',reply:sourceReply,stage:'choosing'};return {...socialState};},state:()=>socialState,topics:()=>PLAYER_CONVERSATION_TOPICS,pending:()=>false,relationship:()=>({}),choose(id){record('交谈选择：'+(PLAYER_CONVERSATION_TOPICS.find(t=>t.id===id)?.label||id)+'（仅回调）');socialState={...socialState,stage:'talking'};return {ok:true};},end(reason){socialState=null;if(reason)record('交谈关闭：'+reason);},retry(){record('补记回调（本状态没有待补记业务）');}};
 try{
  const stylesheet=document.getElementById('product-style');stylesheet.media='all';
  if(!stylesheet.sheet)await new Promise((resolve,reject)=>{stylesheet.addEventListener('load',resolve,{once:true});stylesheet.addEventListener('error',()=>reject(Error('产品 CSS 加载失败')),{once:true});});
  const response=await fetch(`/qa/nearby/${fixture.country}-projection.json`);if(!response.ok)throw Error('投影记录加载失败 '+response.status);projection=await response.json();
  if(projection.viewport?.[0]!==852||projection.viewport?.[1]!==393)throw Error('投影尺寸与 852×393 画面不匹配');
  const background=document.createElement('img');background.id='nearby-background';background.alt=`${fixture.country==='china'?'云来酒楼许安柜台':'日本拉面吧台'}真实生产场景 Mesa 正常镜头，非浏览器实机`;background.src=`/qa/nearby/${fixture.country}-normal.png`;document.body.append(background);await background.decode();
  const stamp=document.createElement('div');stamp.id='nearby-scope';stamp.textContent=scope;document.body.append(stamp);
  document.body.classList.add('in-lot');const hud=document.createElement('div');hud.id='nearby-hud';hud.inert=true;hud.append(document.getElementById('nearby-hud-template').content.cloneNode(true));document.body.append(hud);document.getElementById('lot-country').textContent=fixture.country==='china'?'中国 / CHINA':'日本 / JAPAN';document.getElementById('lot-name').textContent=fixture.country==='china'?'承光宫苑':'云隐汤馆';
  const root=document.createElement('div');root.id='labels';const button=document.createElement('button');button.id='touch-action';button.className='touch-action';button.hidden=true;document.body.append(root,button);
  syncUiViewport(document);const layout=createHudLayout(document),byId=new Map(projection.targets.map(t=>[t.id,t])),actions=[];
  for(const target of projection.targets){
   let anchor={id:target.id,point:target.point,kind:'hand'};
   if(target.id.startsWith('actor:')){
    const name=document.createElement('div');name.className='npc-label';name.append(document.createTextNode(target.name));const subtitle=document.createElement('small');subtitle.textContent=target.id==='actor:cn-tavern-host'?actor.station.npcLabel:'';name.append(subtitle);name.style.left=target.projected[0]+'px';name.style.top=target.projected[1]+'px';root.append(name);labels.set(target.id,name);anchor={id:target.id,actor,kind:'chat'};
   }
   target.qaAnchor=anchor;
   for(const original of target.actions)actions.push({...original,qaAnchorId:target.id,...(target.id.startsWith('actor:')?{social:true,actor}:{} )});
  }
  const refresh=()=>{if(disposed)return;layout.invalidate();menu.update(actions,{hidden:conversation?.isOpen()||wallet?.isOpen()});menu.project();queueReport();};
  conversation=createPlayerConversationUI({getSocial:()=>social,getCountry:()=>fixture.country,document,onOpen:()=>{menu?.close();menu?.update(actions,{hidden:true});},onClose:()=>{record('交谈面板已关闭');refresh();}});
  menu=createObjectActionMenu({button,root,document,layout,resolveAnchor:action=>byId.get(action.qaAnchorId)?.qaAnchor,projectAnchor:anchor=>{const target=byId.get(anchor.id),name=labels.get(anchor.id);return target?.productionProjection?.visible?{visible:true,x:target.projected[0],y:target.projected[1],nameRect:name?rect(name):null}:null;},validate:action=>actions.includes(action),onSelect:action=>{record('选择：'+action.action+'（仅回调，无业务变更）');if(action.social)conversation.open(actor);return true;},onOpen:()=>{record('已打开对象菜单');return true;},onClose:()=>{record('对象菜单已关闭');requestAnimationFrame(()=>{if(!disposed){menu?.project();queueReport();}});}});
  menu.update(actions);menu.project();
  if(caseId==='cn-menu')menu.activateTarget('object:counter:cn-tavern-host');
  if(caseId==='conversation')conversation.open(actor);
  if(caseId==='wallet'){
   const ledger=createCurrencyLedger({saveState:()=>true});for(const currency of ['copper','japan','france','egypt']){ledger.creditWageToBank({currency,amount:240,receiptId:'qa:'+currency,roleId:'qa',slotId:'qa',day:1});ledger.withdraw(48,'qa:cash:'+currency,currency);}for(let i=0;i<35;i++)ledger.earn(1,'qa:history:'+i);
   const mount=document.createElement('div');document.body.append(mount);wallet=createCurrencyWallet({mount,ledger,document,getCurrency:()=> 'copper',getBankTarget:()=>({id:'cn-money-house-teller',name:'承光钱庄 · 存取与兑换'}),onBankNavigate:target=>record('前往银行回调：'+target.id+'（仅QA记录，不执行导航或交易）'),onOpen:()=>menu.update(actions,{hidden:true}),onClose:refresh});wallet.open();refreshTimer=setInterval(()=>wallet.refresh(),300);
  }
  document.addEventListener('keydown',event=>{if(event.code==='KeyE'&&!menu.isOpen()&&!conversation.isOpen()){event.preventDefault();menu.activate();queueReport();}});
  document.addEventListener('click',queueReport);document.addEventListener('scroll',queueReport,true);window.addEventListener('resize',()=>{syncUiViewport(document);refresh();});
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.kind==='nearby-measure')report();});
  window.addEventListener('pagehide',()=>{disposed=true;clearInterval(refreshTimer);wallet?.dispose();menu?.dispose();conversation?.dispose();});
  queueReport();
 }catch(error){const box=document.createElement('pre');box.id='nearby-error';box.textContent=String(error.stack||error);document.body.append(box);report();}
}
