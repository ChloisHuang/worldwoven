import {createCopperLedger} from './copper-ledger.js';
import {CHINA_MONEY_HOUSE as C} from './china-money-house.js';

const ERRORS={ 'invalid-amount':'请填入大于零的整数铜钱', 'insufficient-cash':'手头铜钱不足，不能存入这个数目', 'insufficient-bank':'账上存钱不足，不能取出这个数目', 'account-not-open':'请先请账房立一本账簿', 'save-failed':'这笔尚未记入，请稍后再试', 'invalid-saved-state':'旧账暂时无法核对，本次不办理存取', 'balance-overflow':'这个数目太大，请核对后再填', 'transaction-limit':'这本账已经记满，请稍后再来', 'ledger-busy':'账房正在落笔，请稍候', 'account-already-open':'你的账簿已经立好', 'async-save-unsupported':'这笔尚未记入，请稍后再试', 'invalid-request-id':'这笔凭号无法核对，请重新打开账簿', 'request-conflict':'这张凭号已经记过别的账，请重新打开账簿' };

// A local story wallet. Wages, purchases and regional finance remain separate
// unfinished systems; this service never issues cash or connects to a network.
export function createChinaMoneyHouseService({npcs,lot,getPlayer,poseContext,saved,saveState,notify=()=>{},onOpen=()=>{},onClose=()=>{},document:doc=globalThis.document}){
 const teller=npcs.find(n=>n.station.id===C.stationId);if(!teller||!lot.moneyHouse)return null;
 const ledger=createCopperLedger({saved,saveState});
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const style=make('style','.cn-money-dialog{position:fixed;inset:0;margin:auto;width:min(400px,calc(100vw - 28px));max-height:calc(100dvh - 32px);padding:22px;overflow:auto;color:#4b4434;background:#f3ead2;border:2px solid #988156;border-radius:12px}.cn-money-dialog::backdrop{background:#242c2866}.cn-money-dialog h2{font-size:23px;margin:0 32px 16px 0}.cn-money-dialog p,.cn-money-dialog li{font-size:14px;line-height:1.65}.cn-money-dialog button{min-height:44px;padding:10px 15px;border-radius:8px;background:#526750;color:#fff4d8}.cn-money-dialog button:disabled{opacity:.45}.cn-money-dialog button:focus-visible,.cn-money-dialog input:focus-visible{outline:3px solid #9b702e;outline-offset:2px}.cn-money-close{position:absolute;top:6px;right:8px;background:transparent!important;color:#4b4434!important;font-size:22px}.cn-money-balances{padding:12px;background:#e6dcc0;border-radius:8px}.cn-money-actions{display:flex;gap:9px;flex-wrap:wrap;margin:13px 0}.cn-money-dialog label{display:block;font-size:14px}.cn-money-dialog input{display:block;width:100%;min-height:44px;box-sizing:border-box;margin-top:6px;padding:8px;color:#4b4434;background:#fff9e8;border:1px solid #9e8a63;border-radius:7px;font-size:17px}.cn-money-history{padding-left:22px;max-height:180px;overflow:auto}.cn-money-note{color:#736b54;font-size:12px!important}');
 const dialog=make('dialog',undefined,'cn-money-dialog');dialog.setAttribute('aria-label','承光钱庄账簿');(doc.head||doc.body).append(style);doc.body.append(dialog);
 let disposed=false,message='',amountText='1',requestSerial=0,time=0,activity='核对账簿';
 const near=()=>{const p=getPlayer()?.root.position;return !!p&&Math.abs(p.y-C.floorY)<.6&&Math.hypot(p.x-C.points.counter[0],p.z-C.points.counter[2])<.60;};
 function close(){if(dialog.open){dialog.close();onClose();}}
 function render(){
  const state=ledger.state();dialog.replaceChildren();const x=make('button','×','cn-money-close');x.type='button';x.setAttribute('aria-label','合上账簿');x.onclick=close;dialog.append(x,make('h2','承光钱庄 · 账簿'));
  dialog.append(make('p',`手头铜钱：${state.cash} 文\n账上存钱：${state.bank} 文`,'cn-money-balances'));
  const status=make('p',message||(state.cash===0&&state.bank===0?'你初来宫苑，钱袋还是空的。可以先立账，日后有了工钱再来存取。':'每次存取都要当面核对，两边账目一同记清。'));status.setAttribute('role','status');dialog.append(status);
  if(ledger.loadError){dialog.append(make('p',ERRORS['invalid-saved-state']));return;}
  const actions=make('div',undefined,'cn-money-actions');
  const addAction=(kind,label,amountInput)=>{const b=make('button',label);b.type='button';b.dataset.moneyAction=kind;const requestId=`money-house-${state.nextTransaction}-${kind}-${++requestSerial}`;let submitted=false;b.onclick=()=>{if(submitted||disposed||!dialog.open||!near())return;submitted=true;b.disabled=true;const amount=amountInput?Number(amountInput.value):undefined;if(amountInput)amountText=amountInput.value;const result=kind==='open'?ledger.openAccount(requestId):ledger[kind](amount,requestId);message=result.ok?(kind==='open'?'账簿已经立好，请收好你的凭记':`${kind==='deposit'?'存入':'取出'} ${amount} 文，账房已经记清`):(ERRORS[result.code]||'这笔尚未记入，请核对数目后再试');render();};actions.append(b);return b;};
  if(!state.accountOpened)addAction('open','请账房立账');
  else{
   const label=make('label','本次铜钱数目（文）'),input=make('input');input.type='number';input.min='1';input.step='1';input.inputMode='numeric';input.value=amountText;input.setAttribute('aria-label','本次铜钱数目');label.append(input);dialog.append(label);
   addAction('deposit','存入铜钱',input).disabled=state.cash===0;addAction('withdraw','取出铜钱',input).disabled=state.bank===0;
  }
  dialog.append(actions,make('h3','往来账'));
  const history=ledger.history();if(!history.length)dialog.append(make('p','尚无往来账'));
  else{const list=make('ol',undefined,'cn-money-history');for(const row of history.slice(-12).reverse()){const kind=row.kind||row.type||row.action;list.append(make('li',kind==='open'||kind==='open-account'?'立账 · 不收铜钱':`${kind==='deposit'?'存入':'取出'} ${row.amount} 文`));}dialog.append(list);}
  dialog.append(make('p','合上账簿会保留已经记好的账；未按存取按钮的数目不会入账。','cn-money-note'));
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {
  owns:n=>n===teller,ownsStation:id=>id===C.stationId,
  isOpen:()=>!!dialog.open,
  open(){if(disposed||!near()){notify('请走到钱庄柜台前，再请账房办理');return false;}onOpen();message='';render();if(!dialog.open)dialog.showModal();return true;},close,
  socialStatus:n=>n===teller?{busy:!!dialog.open,attention:true,job:activity}:null,
  update(dt,t,{conversationActorId=null}={}){
   if(disposed)return;time+=dt;if(dialog.open&&!near())close();
   // One persistent adult works along the same counter. Slow side steps place
   // each object inside the existing hand reach instead of reaching through it.
   const writing=time%14<8,target=writing?[-21.30,1.345,-27.98]:[-20.43,1.369,-27.98],desiredX=target[0],dx=desiredX-teller.root.position.x;
   const paused=conversationActorId===teller.station.id;teller.walking=!paused&&Math.abs(dx)>.02;
   if(teller.walking){teller.root.position.x+=Math.sign(dx)*Math.min(Math.abs(dx),dt*.38);teller.root.rotation.y=Math.sign(dx)*Math.PI/2;}else teller.root.rotation.y=0;
   activity=writing?'核对账簿 · 落笔记账':'拨动算珠 · 核对铜钱';const small=teller.label?.querySelector?.('small');if(small)small.textContent=activity;
   const context=poseContext(teller,null);context.receptionWriting=writing;context.handoff=false;context.heldProp=null;context.workHeight=(target[1]-teller.root.position.y)/(teller.characterScale||1);context.workDistance=(target[2]-teller.root.position.z)/(teller.characterScale||1);
   teller.animate(t+teller.phase,teller.walking,paused||teller.walking?null:writing?'calligraphy':'tidy',context);
   // Existing tidy reach supplies the hands only; an abacus is not a wash rag.
   if(teller.root.userData.tools?.cloth)teller.root.userData.tools.cloth.visible=false;
  },
  state:()=>({open:!!dialog.open,ledger:ledger.state(),loadError:ledger.loadError||null,actor:{id:teller.station.id,ageYears:C.role.ageYears,activity,position:teller.root.position.toArray()}}),
  dispose(){if(disposed)return;close();disposed=true;dialog.remove();style.remove();if(teller.poseContext)teller.poseContext.receptionWriting=false;}
 };
}
