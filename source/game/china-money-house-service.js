import {createCurrencyLedger, GAME_CURRENCIES} from './currency-ledger.js';
import {CHINA_MONEY_HOUSE as C} from './china-money-house.js';
import {MONEY_HOUSE_STYLE} from './china-money-house-theme.js';

const TICKET_ART={
 copper:new URL('./assets/currency/china.webp',import.meta.url).href,
 japan:new URL('./assets/currency/japan.webp',import.meta.url).href,
 egypt:new URL('./assets/currency/egypt.webp',import.meta.url).href,
 france:new URL('./assets/currency/france.webp',import.meta.url).href,
};

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
 const style=make('style',MONEY_HOUSE_STYLE);
 const dialog=make('dialog',undefined,'cn-money-dialog');dialog.className+=' ww-airy-theme';dialog.setAttribute('aria-label','承光钱庄账簿');(doc.head||doc.body).append(style);doc.body.append(dialog);
 let disposed=false,message='',currency='copper',exchangeTo='japan',exchangeAmount='2',requestSerial=0,time=0,activity='核对账簿',renderVersion=0;
 const near=()=>{const p=getPlayer()?.root.position;return !!p&&Math.abs(p.y-C.floorY)<.45&&Math.hypot(p.x-C.points.counter[0],p.z-C.points.counter[2])<.60&&canSee(teller.station)===true;};
 function close(){renderVersion++;if(dialog.open){dialog.close();onClose();}}
 const available=version=>!disposed&&version===renderVersion&&dialog.open&&near();
 function render(){
  const version=++renderVersion,state=ledger.state(),all=ledger.balances?.();
  dialog.replaceChildren();const sheet=make('div',undefined,'cn-money-sheet'),main=make('section',undefined,'cn-money-main');const x=make('button','×','cn-money-close');x.type='button';x.setAttribute('aria-label','合上账簿');x.onclick=close;
  const header=make('header',undefined,'cn-money-header');header.append(make('h2','承光钱庄'));dialog.append(x,sheet);sheet.append(main);main.append(header);
  if(ledger.loadError||!all){main.append(make('p',ERRORS['invalid-saved-state']));return;}
  const b=all[currency],unit=GAME_CURRENCIES[currency].unit;
  const selector=(labelText,value,change,excluded)=>{
   const label=make('label'),select=make('select');label.append(make('span',labelText,'cn-money-label'));select.setAttribute('aria-label',labelText);
   for(const c of Object.values(GAME_CURRENCIES)){if(c.id===excluded)continue;const option=make('option',c.label);option.value=c.id;select.append(option);}select.value=value;
   select.onchange=()=>{if(available(version)){change(select.value);message='';render();}};const wrap=make('div',undefined,'cn-money-select'),arrow=make('span','⌄');arrow.setAttribute('aria-hidden','true');wrap.append(select,arrow);label.append(wrap);return label;
  };
  const amountField=(labelText,ariaLabel,value)=>{
   const label=make('label',undefined,'cn-money-amount-label'),row=make('div',undefined,'cn-money-amount'),input=make('input');label.append(make('span',labelText,'cn-money-label'));input.type='number';input.min='1';input.step='1';input.inputMode='numeric';input.value=value;input.setAttribute('aria-label',ariaLabel);input.addEventListener('keydown',e=>e.stopPropagation());
   row.append(input);label.append(row);return {label,input};
  };
  const currencyChoice=selector('办理币种',currency,value=>{currency=value;if(exchangeTo===currency)exchangeTo=Object.keys(GAME_CURRENCIES).find(id=>id!==currency);});
  const total=b.cash+b.bank,toolbar=make('div',undefined,'cn-money-toolbar'),totalText=make('span','共 ','cn-money-total');totalText.append(make('strong',String(total)),make('small',` ${unit}`));toolbar.append(currencyChoice,totalText);
  const current=make('div',undefined,'cn-money-current'),currentCash=make('strong',undefined,'is-cash'),currentBank=make('strong',undefined,'is-bank');current.append(make('span','当前'),currentCash,make('span','·'),currentBank);main.append(toolbar,current);
  const strip=make('div',undefined,'cn-money-strip'),bankFill=make('div',undefined,'cn-money-bank-fill');strip.append(bankFill);
  const slider=make('input',undefined,'cn-money-allocation-range');slider.type='range';slider.min='0';slider.max=String(total);slider.step='1';slider.value=String(b.cash);slider.disabled=!b.accountOpened||total===0;slider.setAttribute('aria-label','随身现金分配');
  const split=make('div',undefined,'cn-money-split'),grip=make('span','‹›');split.setAttribute('aria-hidden','true');split.append(grip);strip.append(slider,split);
  if(b.held)main.append(make('p',`服务预留 ${b.held} ${unit}`,'cn-money-note cn-money-hold'));
  const bank=make('section',undefined,'cn-money-allocation');
  const preview=make('p',undefined,'cn-money-allocation-preview'),hint=make('p',undefined,'cn-money-allocation-hint'),fine=make('div',undefined,'cn-money-fine');fine.append(strip);
  const confirm=make('button',undefined,'cn-money-confirm ww-airy-action');confirm.type='button';confirm.dataset.moneyAction='allocation';preview.setAttribute('role','status');
  let targetCash=b.cash,submitted=false;const allocationCurrency=currency,requestId=`money-house-${state.nextTransaction}-allocation-${++requestSerial}`;
  const updateAllocation=()=>{
   const candidate=Number(slider.value),valid=Number.isSafeInteger(candidate)&&candidate>=0&&candidate<=total;
   targetCash=valid?candidate:b.cash;const targetBank=total-targetCash,delta=targetCash-b.cash,ratio=total?targetCash/total:.5;
   const divider=`calc(12px + (100% - 24px) * ${ratio})`;bankFill.style.left=divider;split.style.left=divider;
   currentCash.textContent=`现金 ${targetCash} ${unit}`;currentBank.textContent=`存款 ${targetBank} ${unit}`;currentCash.setAttribute('aria-label',`随身现金：${currencyText(currency,targetCash)}`);currentBank.setAttribute('aria-label',`银行存款：${currencyText(currency,targetBank)}`);
   slider.setAttribute('aria-valuetext',`随身现金 ${targetCash} ${unit}，银行存款 ${targetBank} ${unit}`);
   preview.textContent=!b.accountOpened?'请先免费立账':!total?'暂无可分配余额':!valid?'分配数目无效':delta===0?'当前分配未改变':delta>0?`从银行取出 ${delta} ${unit}`:`向银行存入 ${-delta} ${unit}`;
   hint.textContent=!b.accountOpened?'立账免费 · 仅游戏票券':!total?'尚无可分配余额':!valid?'请分配整数数目':delta?'确认前不会改变余额':'向左存款 · 向右取款';
   confirm.textContent=delta>0?`取出 ${delta} ${unit}`:delta<0?`存入 ${-delta} ${unit}`:'确认分配';confirm.disabled=!valid||!b.accountOpened||total===0||delta===0;
  };
  slider.oninput=()=>{if(available(version))updateAllocation();};slider.addEventListener('keydown',e=>e.stopPropagation());
  confirm.onclick=()=>{
   if(submitted||confirm.disabled||!available(version)||currency!==allocationCurrency)return;
   const current=ledger.balances?.()?.[currency];
   if(!current||current.cash!==b.cash||current.bank!==b.bank||current.accountOpened!==b.accountOpened){message='余额已变化，请重新调整分配';render();return;}
   const amount=Number(slider.value),delta=amount-b.cash;if(!Number.isSafeInteger(amount)||amount<0||amount>total||amount!==targetCash||delta===0)return;
   submitted=true;confirm.disabled=true;const kind=delta>0?'withdraw':'deposit',result=ledger[kind](Math.abs(delta),requestId,currency);
   message=result.ok?`${kind==='deposit'?'存入银行':'取到钱袋'} ${currencyText(currency,Math.abs(delta))}，账房已经记清`:(ERRORS[result.code]||'这笔尚未记入，请核对后再试');render();
  };
  updateAllocation();const bankActions=make('div',undefined,'cn-money-actions');bankActions.append(confirm);bank.append(fine,preview,bankActions,hint);
  if(!b.accountOpened){
   const open=make('button','免费立账','cn-money-confirm ww-airy-action');open.type='button';open.dataset.moneyAction='open';const openId=`money-house-${state.nextTransaction}-open-${++requestSerial}`;let opened=false;
   open.onclick=()=>{if(opened||!available(version))return;opened=true;open.disabled=true;const result=ledger.openAccount(openId,currency);message=result.ok?'账簿已经立好，不收费用':ERRORS[result.code]||'账簿尚未保存，请稍后再试';render();};bankActions.append(open);
  }
  main.append(bank);
  if(typeof ledger.quoteExchange==='function'){
   const area=make('section',undefined,'cn-money-exchange');area.append(make('h3','现金兑换'));
   area.append(selector('换成币种',exchangeTo,value=>{exchangeTo=value;},currency));
   const {label,input}=amountField(`交出数目（${unit}）`,'交出兑换数目',exchangeAmount);const art=make('div',undefined,'cn-money-fx-art');art.setAttribute('aria-hidden','true');const fromArt=make('img'),toArt=make('img');fromArt.src=TICKET_ART[currency];toArt.src=TICKET_ART[exchangeTo];fromArt.alt=toArt.alt='';fromArt.draggable=toArt.draggable=false;art.append(fromArt,make('span','→'),toArt);const fxPreview=make('div',undefined,'cn-money-fx-preview');fxPreview.append(art);area.append(fxPreview);
   const quoteText=make('div',undefined,'cn-money-quote'),quoteAmount=make('strong'),rateText=make('p',undefined,'cn-money-rate'),error=make('p',undefined,'cn-money-error'),button=make('button','确认兑换','ww-airy-action');button.type='button';button.dataset.moneyAction='exchange';error.setAttribute('role','status');quoteText.append(quoteAmount,rateText,error);
   let lockedQuote=null,submitted=false;
   const requestId=`money-house-${state.nextTransaction}-exchange-${++requestSerial}`;
   const quote=()=>{exchangeAmount=input.value;const result=ledger.quoteExchange({from:currency,to:exchangeTo,amount:Number(input.value)});lockedQuote=result.ok?result.quote:null;
    const from=GAME_CURRENCIES[currency],to=GAME_CURRENCIES[exchangeTo];
    quoteAmount.className=result.ok?'':'is-invalid';quoteAmount.replaceChildren();if(result.ok)quoteAmount.append(make('span',`${lockedQuote.amount} ${from.unit}`,'is-from'),make('span','→','is-arrow'),make('span',`${lockedQuote.received} ${to.unit}`,'is-to'));else quoteAmount.textContent='请核对兑换数目';
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
   };fxPreview.append(quoteText);area.append(label,button);sheet.append(area);
  }
  const status=make('p',message,'cn-money-status');status.setAttribute('role','status');main.append(status);
  const more=make('details',undefined,'cn-money-more');const moreTitle=make('summary','往来账');moreTitle.setAttribute('aria-label','往来账与办理说明');more.append(moreTitle);
  more.append(make('p','正式工资存入银行，亲自取款后可花用。首次正式岗位工钱入账时，会免费建立工资账簿。','cn-money-note'));
  const history=ledger.history();if(!history.length)more.append(make('p','尚无往来账'));
  else{const list=make('ol',undefined,'cn-money-history');for(const row of history.slice(-12).reverse()){
   const kind=row.action,id=row.currency||'copper';let text;
   if(kind==='open')text=`${GAME_CURRENCIES[id].label}立账 · 不收费`;
   else if(kind==='exchange')text=`兑换：${currencyText(row.quote.from,row.quote.amount)} → ${currencyText(row.quote.to,row.quote.received)}`;
   else text=`${({deposit:'存入银行',withdraw:'取到钱袋',earn:'旧制计件工钱',wage:'正式工资入银行',reserve:'服务预留',settle:'服务结清（不再扣钱）',refund:'退回原币种'})[kind]||'往来'} ${currencyText(id,row.amount)}`;
   list.append(make('li',text));}more.append(list);}
  more.append(make('p','仅游戏票券；存取及兑换只在钱庄柜台办理。合上账簿保留已记好的账；未按按钮的数目不会入账。','cn-money-note'));main.append(more);
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
