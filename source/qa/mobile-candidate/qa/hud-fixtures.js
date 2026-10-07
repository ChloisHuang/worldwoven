// Finite, read-only browser QA: production markup, HUD helpers and UI modules.
// No main.js, WebGL, save storage, navigation or actual banking is started.
import {createCurrencyLedger} from '../game/currency-ledger.js';
import {createCurrencyWallet} from '../game/wallet.js';
import {createCareerHandbook} from '../game/career-handbook.js';
import {createFormalCareers} from '../game/formal-careers.js';
import {createTravelPassport} from '../game/travel-passport.js';
import {createContextualActionMenu} from '../game/contextual-action-menu.js';
import {setActionProgress,syncHudTools} from '../game/hud-controls.js';

function hudCase(initial){return ({document:doc,log=()=>{}})=>{
 let career,wallet,passport,actions,timer=null,progress=initial==='idle'?null:.55;
 let overview=false,night=false;
 const player={ageYears:24,root:{position:{x:0,y:0,z:0}}},clock={day:3,hour:10};
 const ledger=createCurrencyLedger({saveState:()=>true});
 for(const currency of ['copper','japan','egypt','france']){
  ledger.creditWageToBank({currency,amount:240,receiptId:`hud-qa:${currency}`,roleId:'qa-worker',slotId:'qa-slot',day:3});
  ledger.withdraw(currency==='copper'?123:48,`hud-cash:${currency}`,currency);
 }
 const control={id:'qa-timed-action',contextControl:true,intentKey:'qa-timed-action',name:'当前动作',icon:'hand',action:'结束当前动作'};
 const draw=()=>{actions.update(progress===null?[]:[control],{hidden:overview});setActionProgress(doc.getElementById('touch-action'),overview?null:progress);};
 return {async open(){
  const response=await fetch(new URL('./mobile-product.html',doc.defaultView.location.href));if(!response.ok)throw Error('生产 HUD 标记未载入：'+response.status);
  const parsed=new doc.defaultView.DOMParser().parseFromString(await response.text(),'text/html');
  for(const script of parsed.querySelectorAll('script'))script.remove();
  doc.body.append(...Array.from(parsed.body.children).map(node=>doc.importNode(node,true)));
  doc.body.classList.add('in-lot');
  for(const id of ['loading','error','arrival','globe-ui'])doc.getElementById(id).hidden=true;
  doc.getElementById('lot-ui').hidden=false;
  doc.getElementById('lot-country').textContent='中国 / CHINA';doc.getElementById('lot-name').textContent='承光宫苑';
  doc.getElementById('player-state').textContent='有限 HUD 布局验证';
  actions=createContextualActionMenu({document:doc,button:doc.getElementById('touch-action'),onSelect:()=>{progress=null;draw();log('取消当前动作：圆环已复位');}});
  doc.getElementById('return-world').onclick=()=>log('QA：世界地图按钮派发；不启动游戏导航');
  doc.getElementById('roof-toggle').onclick=()=>{overview=!overview;syncHudTools(doc,{overview,night});draw();log(overview?'QA：俯瞰':'QA：跟随');};
  doc.getElementById('light-toggle').onclick=()=>{night=!night;syncHudTools(doc,{overview,night});log(night?'QA：夜景':'QA：日景');};
  doc.getElementById('appearance-button').onclick=()=>log('QA：人物按钮；人物面板另有完整有限状态');
  const careers=createFormalCareers({getClock:()=>clock,saveState:()=>true});
  career=createCareerHandbook({careers,copperLedger:ledger,getClock:()=>clock,getCountry:()=> 'china',getPlayer:()=>player,getService:()=>null,onIntent:()=>log('QA：职业意图，无真实角色'),document:doc,
   walletFactory:({mount})=>(wallet=createCurrencyWallet({mount,ledger,document:doc,getCurrency:()=> 'copper',getBankTarget:()=>({id:'cn-money-house-teller',name:'四海钱庄'}),onBankNavigate:()=>log('QA：银行图标关闭钱包后派发原导航入口；无真实寻路'),onOpen:()=>{career?.close();actions.update([]);},onClose:draw}))});
  career.update('lot');
  passport=createTravelPassport({trigger:doc.getElementById('passport-button'),helpContent:doc.getElementById('passport-help'),getProgress:()=>({visited:['china'],stamps:{china:[]}}),getClock:()=>clock,document:doc});
  syncHudTools(doc,{overview,night});draw();
  if(initial==='wallet')wallet.open();
  if(initial==='complete')timer=setTimeout(()=>{progress=null;draw();log('QA：动作完成，圆环已复位');},4000);
 },dispose(){clearTimeout(timer);actions?.dispose();passport?.dispose();career?.dispose();}};
};}
export const hudCases=[
 {id:'hud-idle',label:'共享 HUD · 地图/俯瞰/日夜，钱包文字与余额',group:'共享 HUD',mount:hudCase('idle')},
 {id:'hud-progress',label:'共享 HUD · 原动作键 55% 外环，点击取消',group:'共享 HUD',mount:hudCase('progress')},
 {id:'hud-complete',label:'共享 HUD · 4秒后完成，外环复位',group:'共享 HUD',mount:hudCase('complete')},
 {id:'hud-wallet',label:'钱包 · 标题银行图标、关闭、完整正文高度',group:'共享 HUD',mount:hudCase('wallet')},
];
