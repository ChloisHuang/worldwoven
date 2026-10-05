import {createCurrencyLedger, GAME_CURRENCIES} from './currency-ledger.js';
import {CHINA_MONEY_HOUSE as C} from './china-money-house.js';

const ERRORS={
 'invalid-amount':'请填入大于零的整数数目', 'insufficient-cash':'随身货币不足，请先在柜台取款',
 'insufficient-bank':'这个币种的存款不足', 'account-not-open':'请先请账房立一本账簿',
 'save-failed':'这笔尚未记入，请稍后再试', 'persistence-unavailable':'账簿暂时无法保存，请稍后再来',
 'invalid-saved-state':'旧账暂时无法核对，本次不办理存取或兑换', 'balance-overflow':'这个数目太大，请核对后再填',
 'transaction-limit':'这本账已经记满，请稍后再来', 'ledger-busy':'账房正在落笔，请稍候',
 'account-already-open':'你的账簿已经立好', 'async-save-unsupported':'这笔尚未记入，请稍后再试',
 'invalid-request-id':'这笔凭号无法核对，请重新打开账簿', 'request-conflict':'这张凭号已经记过别的账，请重新打开账簿',
 'invalid-currency':'请选择两个不同的币种', 'rate-mismatch':'本次汇率无法核对，请重新查看报价',
 'exchange-too-small':'这个数目不足换得一整单位，请增加数目',
};
const currencyText=(id,amount)=>`${amount} ${GAME_CURRENCIES[id].unit}（${GAME_CURRENCIES[id].label}）`;

// Only the existing physically reached counter can expose transfer/exchange
// commands. The shared ledger owns persistence and successful transaction events.
export function createChinaMoneyHouseService({npcs,lot,getPlayer,poseContext,saved,saveState,copperLedger,
 canSee=()=>false,notify=()=>{},onOpen=()=>{},onClose=()=>{},document:doc=globalThis.document}){
 const teller=npcs.find(n=>n.station.id===C.stationId);if(!teller||!lot.moneyHouse)return null;
 const ledger=copperLedger||createCurrencyLedger({saved,saveState});
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const style=make('style','.cn-money-dialog{position:fixed;inset:0;margin:auto;width:min(420px,calc(100vw - 28px));box-sizing:border-box;max-height:calc(100dvh - 32px);padding:22px;overflow:auto;color:#4b4434;background:#f3ead2;border:2px solid #988156;border-radius:12px}.cn-money-dialog::backdrop{background:#242c2866}.cn-money-dialog h2{font-size:23px;margin:0 32px 16px 0}.cn-money-dialog p,.cn-money-dialog li{font-size:14px;line-height:1.65}.cn-money-dialog button{min-height:44px;padding:10px 15px;border-radius:8px;background:#526750;color:#fff4d8}.cn-money-dialog button:disabled{opacity:.45}.cn-money-dialog button:focus-visible,.cn-money-dialog input:focus-visible,.cn-money-dialog select:focus-visible{outline:3px solid #9b702e;outline-offset:2px}.cn-money-close{position:absolute;top:6px;right:8px;background:transparent!important;color:#4b4434!important;font-size:22px}.cn-money-balances{padding:12px;background:#e6dcc0;border-radius:8px;white-space:pre-line}.cn-money-actions{display:flex;gap:9px;flex-wrap:wrap;margin:13px 0}.cn-money-dialog label{display:block;font-size:14px;margin:10px 0}.cn-money-dialog input,.cn-money-dialog select{display:block;width:100%;min-height:44px;box-sizing:border-box;margin-top:6px;padding:8px;color:#4b4434;background:#fff9e8;border:1px solid #9e8a63;border-radius:7px;font-size:16px}.cn-money-history{padding-left:22px;max-height:180px;overflow:auto}.cn-money-note{color:#736b54;font-size:12px!important}.cn-money-exchange{border-top:1px solid #c5b38c;padding-top:4px;margin-top:16px}.cn-money-quote{padding:10px;border:1px dashed #988156;border-radius:8px}');
 const dialog=make('dialog',undefined,'cn-money-dialog');dialog.setAttribute('aria-label','承光钱庄账簿');(doc.head||doc.body).append(style);doc.body.append(dialog);
 let disposed=false,message='',amountText='1',currency='copper',exchangeTo='japan',exchangeAmount='2',requestSerial=0,time=0,activity='核对账簿',renderVersion=0;
 const near=()=>{const p=getPlayer()?.root.position;return !!p&&Math.abs(p.y-C.floorY)<.45&&Math.hypot(p.x-C.points.counter[0],p.z-C.points.counter[2])<.60&&canSee(teller.station)===true;};
 function close(){renderVersion++;if(dialog.open){dialog.close();onClose();}}
 const available=version=>!disposed&&version===renderVersion&&dialog.open&&near();
 function render(){
  const version=++renderVersion,state=ledger.state(),all=ledger.balances?.();
  dialog.replaceChildren();const x=make('button','×','cn-money-close');x.type='button';x.setAttribute('aria-label','合上账簿');x.onclick=close;dialog.append(x,make('h2','承光钱庄 · 账簿'));
  if(ledger.loadError||!all){dialog.append(make('p',ERRORS['invalid-saved-state']));return;}
  const b=all[currency];
  const selector=(labelText,value,change,excluded)=>{
   const label=make('label',labelText),select=make('select');select.setAttribute('aria-label',labelText);
   for(const c of Object.values(GAME_CURRENCIES)){if(c.id===excluded)continue;const option=make('option',c.label);option.value=c.id;select.append(option);}select.value=value;
   select.onchange=()=>{if(available(version)){change(select.value);render();}};label.append(select);return label;
  };
  dialog.append(selector('办理币种',currency,value=>{currency=value;if(exchangeTo===currency)exchangeTo=Object.keys(GAME_CURRENCIES).find(id=>id!==currency);}));
  dialog.append(make('p',`随身现钱：${currencyText(currency,b.cash)}\n银行存款：${currencyText(currency,b.bank)}${b.held?`\n服务预留：${currencyText(currency,b.held)}`:''}`,'cn-money-balances'));
  const status=make('p',message||(b.accountOpened?'正式岗位工钱直接存入对应币种的银行账，需亲自到柜台取出后才能花用。':'可以先立账；首次正式岗位工钱入账时，也会同时免费建立工资账簿。'));status.setAttribute('role','status');dialog.append(status);
  const actions=make('div',undefined,'cn-money-actions');
  const addAction=(kind,label,amountInput)=>{
   const button=make('button',label);button.type='button';button.dataset.moneyAction=kind;
   const requestId=`money-house-${state.nextTransaction}-${kind}-${++requestSerial}`;let submitted=false;
   button.onclick=()=>{if(submitted||!available(version))return;submitted=true;button.disabled=true;
    const amount=amountInput?Number(amountInput.value):undefined;if(amountInput)amountText=amountInput.value;
    const result=kind==='open'?ledger.openAccount(requestId,currency):ledger[kind](amount,requestId,currency);
    message=result.ok?(kind==='open'?'账簿已经立好，不收费用':`${kind==='deposit'?'存入银行':'取到钱袋'} ${currencyText(currency,amount)}，账房已经记清`):(ERRORS[result.code]||'这笔尚未记入，请核对后再试');render();
   };actions.append(button);return button;
  };
  if(!b.accountOpened)addAction('open','请账房立账');
  else{
   const label=make('label',`本次存取数目（${GAME_CURRENCIES[currency].unit}）`),input=make('input');input.type='number';input.min='1';input.step='1';input.inputMode='numeric';input.value=amountText;input.setAttribute('aria-label','本次存取数目');label.append(input);dialog.append(label);
   input.oninput=()=>{amountText=input.value;};
   addAction('deposit','存入银行',input).disabled=b.cash===0;addAction('withdraw','取到钱袋',input).disabled=b.bank===0;
  }
  dialog.append(actions);
  if(typeof ledger.quoteExchange==='function'){
   const area=make('section',undefined,'cn-money-exchange');area.append(make('h3','柜台兑换'));
   area.append(make('p',`交出随身${GAME_CURRENCIES[currency].label}，换取另一币种。存款请先取出。`));
   area.append(selector('换成币种',exchangeTo,value=>{exchangeTo=value;},currency));
   const label=make('label',`交出数目（${GAME_CURRENCIES[currency].unit}）`),input=make('input');input.type='number';input.min='1';input.step='1';input.inputMode='numeric';input.value=exchangeAmount;input.setAttribute('aria-label','交出兑换数目');label.append(input);area.append(label);
   const quoteText=make('p',undefined,'cn-money-quote'),button=make('button','按此报价兑换');button.type='button';button.dataset.moneyAction='exchange';
   let lockedQuote=null,submitted=false;
   const requestId=`money-house-${state.nextTransaction}-exchange-${++requestSerial}`;
   const quote=()=>{exchangeAmount=input.value;const result=ledger.quoteExchange({from:currency,to:exchangeTo,amount:Number(input.value)});lockedQuote=result.ok?result.quote:null;
    const from=GAME_CURRENCIES[currency],to=GAME_CURRENCIES[exchangeTo],rate=`固定游戏汇率：${to.value} ${from.unit}${from.label} = ${from.value} ${to.unit}${to.label}`;
    quoteText.textContent=rate+'\n'+(result.ok?`本次交出 ${currencyText(currency,lockedQuote.amount)}，收到 ${currencyText(exchangeTo,lockedQuote.received)}。\n无手续费；不足一整单位的部分向下取整。`:(ERRORS[result.code]||'请核对兑换数目'));
    quoteText.style.whiteSpace='pre-line';button.disabled=!result.ok||lockedQuote.amount>b.cash;
   };
   input.oninput=()=>{if(available(version))quote();};quote();
   button.onclick=()=>{if(submitted||!available(version)||!lockedQuote||Number(input.value)!==lockedQuote.amount)return;submitted=true;button.disabled=true;
    const result=ledger.exchange({quote:lockedQuote,requestId});
    message=result.ok?`兑换已记清：交出 ${currencyText(currency,lockedQuote.amount)}，收到 ${currencyText(exchangeTo,lockedQuote.received)}`:(ERRORS[result.code]||'兑换尚未保存，请稍后再试');render();
   };area.append(quoteText,button,make('p','仅游戏票券；报价与两边余额会一同记账。当前仅此钱庄柜台办理存取及兑换。','cn-money-note'));dialog.append(area);
  }
  dialog.append(make('h3','往来账'));
  const history=ledger.history();if(!history.length)dialog.append(make('p','尚无往来账'));
  else{const list=make('ol',undefined,'cn-money-history');for(const row of history.slice(-12).reverse()){
   const kind=row.action,id=row.currency||'copper';let text;
   if(kind==='open')text=`${GAME_CURRENCIES[id].label}立账 · 不收费`;
   else if(kind==='exchange')text=`兑换：${currencyText(row.quote.from,row.quote.amount)} → ${currencyText(row.quote.to,row.quote.received)}`;
   else text=`${({deposit:'存入银行',withdraw:'取到钱袋',earn:'旧制计件工钱',wage:'正式工资入银行',reserve:'服务预留',settle:'服务结清（不再扣钱）',refund:'退回原币种'})[kind]||'往来'} ${currencyText(id,row.amount)}`;
   list.append(make('li',text));}dialog.append(list);}
  dialog.append(make('p','合上账簿保留已记好的账；未按按钮的数目不会入账。','cn-money-note'));
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 const unsubscribe=ledger.subscribeCommitted?.(()=>{if(dialog.open&&!disposed)render();});
 return {
  owns:n=>n===teller,ownsStation:id=>id===C.stationId,
  isOpen:()=>!!dialog.open,
  open(){if(disposed||!near()){notify('请走到钱庄柜台前，再请账房办理');return false;}onOpen();message='';render();if(!dialog.open)dialog.showModal();return true;},close,
  socialStatus:n=>n===teller?{busy:!!dialog.open,attention:true,job:activity}:null,
  update(dt,t,{conversationActorId=null}={}){
   if(disposed)return;time+=dt;if(dialog.open&&!near())close();
   // One persistent adult works along the same counter. Slow side steps place
   // each object inside the existing hand reach instead of reaching through it.
   const writing=time%14<8,target=writing?C.points.ledger:C.points.abacus,desiredX=target[0],dx=desiredX-teller.root.position.x;
   const paused=conversationActorId===teller.station.id;teller.walking=!paused&&Math.abs(dx)>.02;
   if(teller.walking){teller.root.position.x+=Math.sign(dx)*Math.min(Math.abs(dx),dt*.38);teller.root.rotation.y=Math.sign(dx)*Math.PI/2;}else teller.root.rotation.y=0;
   activity=writing?'核对账簿 · 落笔记账':'拨动算珠 · 核对铜钱';const small=teller.label?.querySelector?.('small');if(small)small.textContent=activity;
   const context=poseContext(teller,null);context.receptionWriting=writing;context.handoff=false;context.heldProp=null;context.workHeight=(target[1]-teller.root.position.y)/(teller.characterScale||1);context.workDistance=(target[2]-teller.root.position.z)/(teller.characterScale||1);
   teller.animate(t+teller.phase,teller.walking,paused||teller.walking?null:writing?'calligraphy':'tidy',context);
   // Existing tidy reach supplies the hands only; an abacus is not a wash rag.
   if(teller.root.userData.tools?.cloth)teller.root.userData.tools.cloth.visible=false;
  },
  state:()=>({open:!!dialog.open,ledger:ledger.state(),loadError:ledger.loadError||null,actor:{id:teller.station.id,ageYears:C.role.ageYears,activity,position:teller.root.position.toArray()}}),
  dispose(){if(disposed)return;close();disposed=true;unsubscribe?.();dialog.remove();style.remove();if(teller.poseContext)teller.poseContext.receptionWriting=false;}
 };
}
