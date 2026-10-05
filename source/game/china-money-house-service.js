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
 const style=make('style',`
 .cn-money-dialog{position:fixed;inset:0;margin:auto;width:min(720px,calc(100vw - 24px));max-width:none;box-sizing:border-box;max-height:calc(100dvh - 24px);padding:0;overflow:visible;color:#4b4434;background:#f3ead2;border:1px solid #b5b99c;border-radius:12px;box-shadow:0 12px 40px #142b3540;font-size:13px;line-height:1.35}
 .cn-money-sheet{padding:12px;max-height:calc(100dvh - 28px);overflow:auto;border-radius:10px;overscroll-behavior:contain}
 .cn-money-dialog::backdrop{background:#242c2866}.cn-money-dialog *{box-sizing:border-box}
 .cn-money-dialog h2{font-size:18px;font-weight:700;line-height:1.25;margin:0;color:#374d3e}.cn-money-dialog h3{font-size:14px;line-height:1.3;margin:0 0 8px}
 .cn-money-dialog p{font-size:12px;line-height:1.4;margin:0}.cn-money-dialog button{min-height:44px;padding:8px 10px;border:0;border-radius:8px;box-shadow:inset 0 1px #ffffff30;background:linear-gradient(#709268 0 76%,#56754f 76% 100%);color:#fff4d8;font-size:13px;line-height:1.3;cursor:pointer}
 .cn-money-dialog button:disabled{opacity:.45;cursor:default;box-shadow:none}.cn-money-dialog button:not(:disabled):active{transform:translateY(1px);background:linear-gradient(#4e704c 0 24%,#62875b 24% 100%);box-shadow:inset 0 2px #3f5e3f30}.cn-money-dialog button:focus-visible,.cn-money-dialog input:focus-visible,.cn-money-dialog select:focus-visible,.cn-money-dialog summary:focus-visible{outline:2px solid #8b9768;outline-offset:2px}
 .cn-money-dialog .cn-money-close{position:absolute;top:8px;right:8px;width:44px;height:44px;min-width:44px;z-index:1;padding:0;border:0;box-shadow:none;background:transparent;color:#4b4434;font-size:23px}
 .cn-money-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-right:44px;margin-bottom:10px}.cn-money-header label{display:flex;align-items:center;gap:8px;white-space:nowrap}.cn-money-header select{width:145px}
 .cn-money-balances{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-bottom:10px}.cn-money-balance{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:8px 12px;background:#f0dfac;border:0;border-radius:8px;box-shadow:inset 0 3px #fff3cf}.cn-money-balance[data-money-balance=bank]{background:#dbe7cf;box-shadow:inset 0 3px #edf4e4}.cn-money-balance span{font-size:12px}.cn-money-balance strong{font-size:22px;line-height:1.2;font-variant-numeric:tabular-nums}.cn-money-balance small{font-size:12px;font-weight:normal;margin-left:4px}
 .cn-money-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.cn-money-panel{min-width:0;padding:10px;border:0;background:#f8f1dc;border-radius:9px;box-shadow:inset 0 3px #ffffff70}
 .cn-money-dialog label{font-size:12px;margin:0}.cn-money-dialog input,.cn-money-dialog select{display:block;width:100%;min-width:0;min-height:44px;margin:4px 0 0;padding:7px 9px;color:#4b4434;background:#fff9e8;border:1px solid #d2ceb1;border-radius:6px;box-shadow:inset 0 2px #e5ddc3;font:inherit;font-size:16px;line-height:1.3}.cn-money-header select{width:145px;margin:0}.cn-money-select{position:relative}.cn-money-select select{appearance:none;padding-right:27px;font-size:14px}.cn-money-select>span{position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;font-size:16px;color:#526750}
 .cn-money-amount{display:flex;align-items:stretch;gap:4px;margin-top:4px}.cn-money-amount input{flex:1;width:40px;min-width:30px;margin:0;text-align:center;font-size:17px;font-weight:700;appearance:textfield}.cn-money-amount input::-webkit-inner-spin-button,.cn-money-amount input::-webkit-outer-spin-button{appearance:none;margin:0}.cn-money-dialog .cn-money-step{flex:0 0 44px;min-width:44px;padding:0;background:linear-gradient(#e2d9a8 0 76%,#c8c091 76% 100%);color:#536443;font-size:22px;box-shadow:none}.cn-money-dialog input:focus,.cn-money-dialog select:focus{border-color:#9da980;background:#eef3dc}
 .cn-money-dialog .cn-money-step:not(:disabled):active{background:linear-gradient(#bcb681 0 24%,#d0cb95 24% 100%);color:#3c5636}.cn-money-actions button[data-money-action=withdraw]:not(:disabled):active{background:linear-gradient(#a4bd8f 0 24%,#c5d7b1 24% 100%);color:#334c32}
 .cn-money-actions{display:flex;gap:8px;margin:8px 0 0}.cn-money-actions button{flex:1}.cn-money-actions button[data-money-action=withdraw]{background:linear-gradient(#dae6c9 0 76%,#bfceaa 76% 100%);color:#42553f}
 .cn-money-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.cn-money-quote{margin:7px 0}.cn-money-quote strong{display:block;font-size:15px;line-height:1.35}.cn-money-dialog .cn-money-rate{font-size:11px;color:#736b54;margin-top:3px}.cn-money-dialog .cn-money-error{font-size:12px;color:#8e382e;margin-top:6px}.cn-money-dialog .cn-money-error:empty{display:none}.cn-money-exchange>button{width:100%}
 .cn-money-dialog .cn-money-note{font-size:11px;color:#736b54}.cn-money-dialog .cn-money-hold{margin:-3px 0 8px}.cn-money-dialog .cn-money-status{padding:8px 10px;margin-top:8px;background:#e6dcc0;border-radius:6px}.cn-money-status:empty{display:none}
 .cn-money-more{border-top:1px solid #c5b38c;margin-top:10px;padding-top:6px}.cn-money-more summary{cursor:pointer;font-size:12px;min-height:30px;padding:6px 0}.cn-money-more p{margin:6px 0}.cn-money-history{font-size:12px;line-height:1.5;padding-left:20px;margin:6px 0;max-height:160px;overflow:auto}
 @media(max-width:560px){.cn-money-workspace{grid-template-columns:1fr}.cn-money-header{flex-wrap:wrap;gap:8px}.cn-money-header h2{font-size:17px}.cn-money-header label{font-size:11px}.cn-money-header select{width:135px}.cn-money-balance{padding:8px}.cn-money-balance strong{font-size:20px}}
 `);
 const dialog=make('dialog',undefined,'cn-money-dialog');dialog.setAttribute('aria-label','承光钱庄账簿');(doc.head||doc.body).append(style);doc.body.append(dialog);
 let disposed=false,message='',amountText='1',currency='copper',exchangeTo='japan',exchangeAmount='2',requestSerial=0,time=0,activity='核对账簿',renderVersion=0;
 const near=()=>{const p=getPlayer()?.root.position;return !!p&&Math.abs(p.y-C.floorY)<.45&&Math.hypot(p.x-C.points.counter[0],p.z-C.points.counter[2])<.60&&canSee(teller.station)===true;};
 function close(){renderVersion++;if(dialog.open){dialog.close();onClose();}}
 const available=version=>!disposed&&version===renderVersion&&dialog.open&&near();
 function render(){
  const version=++renderVersion,state=ledger.state(),all=ledger.balances?.();
  dialog.replaceChildren();const sheet=make('div',undefined,'cn-money-sheet');const x=make('button','×','cn-money-close');x.type='button';x.setAttribute('aria-label','合上账簿');x.onclick=close;
  const header=make('header',undefined,'cn-money-header');header.append(make('h2','承光钱庄'));dialog.append(x,sheet);sheet.append(header);
  if(ledger.loadError||!all){sheet.append(make('p',ERRORS['invalid-saved-state']));return;}
  const b=all[currency],unit=GAME_CURRENCIES[currency].unit;
  const selector=(labelText,value,change,excluded)=>{
   const label=make('label',labelText),select=make('select');select.setAttribute('aria-label',labelText);
   for(const c of Object.values(GAME_CURRENCIES)){if(c.id===excluded)continue;const option=make('option',c.label);option.value=c.id;select.append(option);}select.value=value;
   select.onchange=()=>{if(available(version)){change(select.value);message='';render();}};const wrap=make('div',undefined,'cn-money-select'),arrow=make('span','⌄');arrow.setAttribute('aria-hidden','true');wrap.append(select,arrow);label.append(wrap);return label;
  };
  const amountField=(labelText,ariaLabel,value,scope)=>{
   const label=make('label',labelText),row=make('div',undefined,'cn-money-amount'),input=make('input');input.type='number';input.min='1';input.step='1';input.inputMode='numeric';input.value=value;input.setAttribute('aria-label',ariaLabel);
   const steps=[];for(const [delta,glyph,verb] of [[-1,'−','减少'],[1,'+','增加']]){
    const step=make('button',glyph,'cn-money-step');step.type='button';step.setAttribute('aria-label',`${verb}${scope}数目`);
    step.onclick=()=>{if(!available(version)||step.disabled)return;const n=Number(input.value);input.value=String(Math.max(1,Math.min(Number.MAX_SAFE_INTEGER,(Number.isSafeInteger(n)?n:0)+delta)));input.oninput?.();};steps.push(step);
   }
   input.updateSteps=()=>{const n=Number(input.value);steps[0].disabled=Number.isSafeInteger(n)&&n<=1;steps[1].disabled=n>=Number.MAX_SAFE_INTEGER;};input.updateSteps();row.append(steps[0],input,steps[1]);label.append(row);return {label,input};
  };
  header.append(selector('办理币种',currency,value=>{currency=value;if(exchangeTo===currency)exchangeTo=Object.keys(GAME_CURRENCIES).find(id=>id!==currency);}));
  const balances=make('div',undefined,'cn-money-balances');
  for(const [key,label] of [['cash','随身现金'],['bank','银行存款']]){
   const card=make('div',undefined,'cn-money-balance'),value=make('strong',String(b[key]));value.append(make('small',unit));
   card.dataset.moneyBalance=key;card.setAttribute('aria-label',`${label}：${currencyText(currency,b[key])}`);card.append(make('span',label),value);balances.append(card);
  }
  sheet.append(balances);if(b.held)sheet.append(make('p',`服务预留 ${b.held} ${unit}`,'cn-money-note cn-money-hold'));
  const workspace=make('div',undefined,'cn-money-workspace'),bank=make('section',undefined,'cn-money-panel');bank.append(make('h3','⇅ 存取款'));
  const actions=make('div',undefined,'cn-money-actions');
  const addAction=(kind,label,amountInput)=>{
   const button=make('button',label);button.type='button';button.dataset.moneyAction=kind;
   const requestId=`money-house-${state.nextTransaction}-${kind}-${++requestSerial}`;let submitted=false;
   button.onclick=()=>{if(submitted||button.disabled||!available(version))return;submitted=true;button.disabled=true;
    const amount=amountInput?Number(amountInput.value):undefined;if(amountInput)amountText=amountInput.value;
    const result=kind==='open'?ledger.openAccount(requestId,currency):ledger[kind](amount,requestId,currency);
    message=result.ok?(kind==='open'?'账簿已经立好，不收费用':`${kind==='deposit'?'存入银行':'取到钱袋'} ${currencyText(currency,amount)}，账房已经记清`):(ERRORS[result.code]||'这笔尚未记入，请核对后再试');render();
   };actions.append(button);return button;
  };
  if(!b.accountOpened){bank.append(make('p','开立此币种账簿后，即可存取。','cn-money-note'));addAction('open','免费立账');}
  else{
   const {label,input}=amountField(`本次数目（${unit}）`,'本次存取数目',amountText,'存取');bank.append(label);
   const deposit=addAction('deposit','',input),withdraw=addAction('withdraw','',input),error=make('p',undefined,'cn-money-error');error.setAttribute('role','status');
   const update=()=>{input.updateSteps();amountText=input.value;const amount=Number(amountText),valid=Number.isSafeInteger(amount)&&amount>0;
    deposit.textContent=valid?`存入 ${amount} ${unit}`:'存入银行';withdraw.textContent=valid?`取出 ${amount} ${unit}`:'取到钱袋';
    deposit.disabled=!valid||amount>b.cash;withdraw.disabled=!valid||amount>b.bank;
    error.textContent=!valid?ERRORS['invalid-amount']:amount>b.cash&&amount>b.bank?'现金与存款均不足，请减少数目':amount>b.cash?`随身现金不足，最多可存 ${b.cash} ${unit}`:amount>b.bank?`存款不足，最多可取 ${b.bank} ${unit}`:'';
   };input.oninput=()=>{if(available(version))update();};update();bank.append(error);
  }
  bank.append(actions);workspace.append(bank);
  if(typeof ledger.quoteExchange==='function'){
   const area=make('section',undefined,'cn-money-panel cn-money-exchange');area.append(make('h3','⇄ 现金兑换'));
   const fields=make('div',undefined,'cn-money-fields');fields.append(selector('换成币种',exchangeTo,value=>{exchangeTo=value;},currency));
   const {label,input}=amountField(`交出数目（${unit}）`,'交出兑换数目',exchangeAmount,'兑换');fields.append(label);area.append(fields);
   const quoteText=make('div',undefined,'cn-money-quote'),quoteAmount=make('strong'),rateText=make('p',undefined,'cn-money-rate'),error=make('p',undefined,'cn-money-error'),button=make('button','确认兑换');button.type='button';button.dataset.moneyAction='exchange';error.setAttribute('role','status');quoteText.append(quoteAmount,rateText,error);
   let lockedQuote=null,submitted=false;
   const requestId=`money-house-${state.nextTransaction}-exchange-${++requestSerial}`;
   const quote=()=>{input.updateSteps();exchangeAmount=input.value;const result=ledger.quoteExchange({from:currency,to:exchangeTo,amount:Number(input.value)});lockedQuote=result.ok?result.quote:null;
    const from=GAME_CURRENCIES[currency],to=GAME_CURRENCIES[exchangeTo];
    quoteAmount.textContent=result.ok?`交出 ${lockedQuote.amount} ${from.unit} → 收到 ${lockedQuote.received} ${to.unit}`:'请核对兑换数目';
    quoteAmount.setAttribute('aria-label',result.ok?`本次交出 ${currencyText(currency,lockedQuote.amount)}，收到 ${currencyText(exchangeTo,lockedQuote.received)}`:'请核对兑换数目');
    rateText.textContent=`汇率 ${to.value} ${from.unit} = ${from.value} ${to.unit} · 免手续费 · 向下取整`;
    rateText.setAttribute('aria-label',`固定游戏汇率：${to.value} ${from.unit}${from.label} = ${from.value} ${to.unit}${to.label}；无手续费；不足一整单位的部分向下取整`);
    error.textContent=!result.ok?(ERRORS[result.code]||'请核对兑换数目'):lockedQuote.amount>b.cash?'随身现金不足，请先取款':'';
    button.disabled=!result.ok||lockedQuote.amount>b.cash;
   };
   input.oninput=()=>{if(available(version))quote();};quote();
   button.onclick=()=>{if(submitted||button.disabled||!available(version)||!lockedQuote||Number(input.value)!==lockedQuote.amount)return;submitted=true;button.disabled=true;
    const result=ledger.exchange({quote:lockedQuote,requestId});
    message=result.ok?`兑换已记清：交出 ${currencyText(currency,lockedQuote.amount)}，收到 ${currencyText(exchangeTo,lockedQuote.received)}`:(ERRORS[result.code]||'兑换尚未保存，请稍后再试');render();
   };area.append(quoteText,button);workspace.append(area);
  }
  sheet.append(workspace);
  const status=make('p',message,'cn-money-status');status.setAttribute('role','status');sheet.append(status);
  const more=make('details',undefined,'cn-money-more');more.append(make('summary','往来账与办理说明'));
  more.append(make('p','正式工资存入银行，亲自取款后可花用。首次正式岗位工钱入账时，会免费建立工资账簿。','cn-money-note'));
  const history=ledger.history();if(!history.length)more.append(make('p','尚无往来账'));
  else{const list=make('ol',undefined,'cn-money-history');for(const row of history.slice(-12).reverse()){
   const kind=row.action,id=row.currency||'copper';let text;
   if(kind==='open')text=`${GAME_CURRENCIES[id].label}立账 · 不收费`;
   else if(kind==='exchange')text=`兑换：${currencyText(row.quote.from,row.quote.amount)} → ${currencyText(row.quote.to,row.quote.received)}`;
   else text=`${({deposit:'存入银行',withdraw:'取到钱袋',earn:'旧制计件工钱',wage:'正式工资入银行',reserve:'服务预留',settle:'服务结清（不再扣钱）',refund:'退回原币种'})[kind]||'往来'} ${currencyText(id,row.amount)}`;
   list.append(make('li',text));}more.append(list);}
  more.append(make('p','仅游戏票券；存取及兑换只在钱庄柜台办理。合上账簿保留已记好的账；未按按钮的数目不会入账。','cn-money-note'));sheet.append(more);
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
