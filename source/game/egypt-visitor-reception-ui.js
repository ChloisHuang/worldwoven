import {AIRY_PANEL_STYLE,createAiryPanelParts,preserveAiryPanelView} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
export function createEgyptVisitorReceptionUI({service,onOpen=()=>{},onNavigate=()=>false,onReturn=()=>false,document:doc=globalThis.document}){
 const make=(tag,text,cls)=>{const el=doc.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;};
 const dialog=make('dialog',null,'eg-visit-dialog ww-airy-theme ww-airy-panel'),style=make('style');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.eg-visit-dialog.ww-airy-panel{width:min(640px,var(--ww-ui-width,calc(100vw - 24px)));height:min(480px,var(--ww-ui-height,calc(100dvh - 24px)));padding:18px;border:1px solid #d9caa9;border-radius:16px 5px;background:#f7f5e9;color:#405b62;font:14px/1.5 Georgia,"Songti SC",serif}.eg-visit-dialog::backdrop{background:#25444640}.eg-visit-dialog h2{font-size:21px;font-weight:500}.eg-visit-dialog p{margin:6px 0}.eg-visit-dialog button{min-height:44px;font:inherit;cursor:pointer}.eg-visit-close{position:absolute;right:7px;top:5px;width:44px;border:0;background:transparent;color:#607a75;font-size:25px!important}.eg-visit-routes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.eg-visit-routes button{padding:9px;text-align:left;background:#fffdf7;border:1px solid #d6dfce;border-radius:8px 3px;color:inherit}.eg-visit-routes small{display:block;font-size:12px;color:#758780}.eg-visit-note{font-size:12px;color:#788b82}.eg-visit-dialog button:disabled{opacity:.5;cursor:default}.eg-visit-dialog footer{display:flex;gap:8px;flex-wrap:wrap}.eg-visit-dialog footer button{flex:1;min-width:135px}.eg-visit-dialog details{margin-top:12px;font-size:12px}@media(max-width:440px){.eg-visit-routes{grid-template-columns:1fr}}`;
 dialog.setAttribute('aria-label','王室接待 · 来访登记');(doc.head||doc.body).append(style);doc.body.append(dialog);
 let disposed=false,generation=0,signature='';
 const key=v=>JSON.stringify([v.revision,v.atDesk,v.canRequest,v.task,v.waiting,v.loadError,v.lastError]);
 function close(){generation++;if(dialog.open)dialog.close();}
 function button(label,run,id,disabled=false){const b=make('button',label),token=generation;b.type='button';b.disabled=disabled;b.setAttribute('data-panel-key',id);b.onclick=()=>{if(disposed||!dialog.open||b.disabled||token!==generation)return;const v=service.view();if(key(v)!==signature){render();return;}run();};return b;}
 function render(){if(disposed||!dialog.open)return;const v=service.view(),next=key(v);if(signature===next)return;signature=next;generation++;
  const restore=preserveAiryPanelView(dialog,doc);dialog.replaceChildren();const {header,body,actions}=createAiryPanelParts(doc),visit=v.visit;
  const x=button('×',close,'close');x.className='eg-visit-close';x.setAttribute('aria-label','关闭来访记录');header.append(make('h2','王室接待 · 来访簿'),make('p','阿赫 · 公共参观指引 · 免费'));
  if(v.loadError)body.append(make('p','原来访记录暂不可核对，已保留原档，请稍后再试。'));
  else{
   const status={requested:'待当面登记',registered:'已登记',closed:'已当面离馆',cancelled:'已撤回来访申请'};
   body.append(make('p',visit?`${visit.id.replace('egypt-visit-','')}号来访 · ${status[visit.stage]}`:'选一处想参观的公共空间，阿赫会在原案登记并说明走法。'));
   if(v.task)body.append(make('p',v.waiting?'请在案前稍候，阿赫先完成原卷或原岗位事务。':'正在当面核记，请稍候。'));
   if(v.lastError){body.append(make('p','刚才的记录尚未保存，请重试。'));if(!v.atDesk&&visit?.stage==='registered')actions.append(button('在原到达处重试保存',()=>{service.retryArrival();render();},'retry-arrival'));}
   if(!v.canRequest)body.append(make('p',v.atDesk?'请先放妥手中物件并结束当前动作或用餐；若正值原卷登记班，请先交回接待案。':'回到接待案可改选参观处或当面告辞。','eg-visit-note'));
   const routes=make('div',null,'eg-visit-routes');
   for(const r of v.routes){const seen=visit?.arrivals.some(a=>a.destination===r.id),b=button(`${r.name}${seen?' · 已到达':''}`,()=>{if(service.request(r.id))close();else render();},r.id,!v.canRequest||!!v.task);b.append(make('small',r.guide));routes.append(b);}
   body.append(routes,make('p','来访记录只记真实到场；私人寝室与沐浴间不列入公共导览。离开或收起记录不会自动销号。','eg-visit-note'));
   if(visit?.stage==='requested')actions.append(button(v.task?'收起 · 等候登记':'继续当面登记',()=>{if(v.task||service.resume())close();else render();},'resume',!v.canRequest));
   if(visit?.stage==='registered'){
    const go=button('沿指引前往 '+(v.routes.find(r=>r.id===visit.destination)?.name||'参观处'),()=>{close();onNavigate(service.destination());},'navigate',!!v.task);go.className='ww-airy-action';actions.append(go);
   }
   if(v.atDesk&&['requested','registered'].includes(visit?.stage))actions.append(button(visit.stage==='requested'?'撤回登记':'当面告辞 · 同号销号',()=>{if(service.depart())close();else render();},'depart',!v.canRequest||!!v.task));
   if(!v.atDesk&&visit)actions.append(button('回接待案',()=>{close();onReturn();},'return'));
   if(v.task)actions.append(button('暂停办理 · 保留记录',()=>{service.stop();render();},'pause'));
   if(v.visits.length){const history=make('details'),summary=make('summary','最近来访记录');history.append(summary);for(const row of v.visits.slice().reverse())history.append(make('p',`${row.id.replace('egypt-visit-','')}号 · 第${row.requestedAt.day+1}日 · ${status[row.stage]} · 到达${row.arrivals.length}处`));body.append(history);}
  }
  dialog.append(x,header,body,actions);restore();
 }
 function open(){if(disposed)return false;if(!dialog.open){onOpen();signature='';dialog.showModal();}render();return true;}
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 return {open,close,update:render,isOpen:()=>!!dialog.open,dispose(){if(disposed)return;close();disposed=true;dialog.remove();style.remove();}};
}
