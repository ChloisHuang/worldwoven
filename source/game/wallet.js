import {GAME_CURRENCIES} from './currency-ledger.js';

// Merely resolving these URLs does not fetch the pictures. Create images only
// for already-owned cash, or the currency in a committed receipt.
const ART = Object.freeze({
  copper: new URL('./assets/currency/china.webp', import.meta.url).href,
  japan: new URL('./assets/currency/japan.webp', import.meta.url).href,
  egypt: new URL('./assets/currency/egypt.webp', import.meta.url).href,
  france: new URL('./assets/currency/france.webp', import.meta.url).href,
});
const STYLE = new URL('./wallet.css', import.meta.url).href;
const SERIES = Object.freeze({copper:'CN',japan:'JP',egypt:'EG',france:'FR'});
const validAmount = n => Number.isSafeInteger(n) && n >= 0;
const number = n => validAmount(n) ? n.toLocaleString('zh-CN') : '—';
const currency = id => GAME_CURRENCIES[id] || GAME_CURRENCIES.copper;
const money = (amount, id) => `${number(amount)} ${currency(id).unit}`;
const ACTIONS = {open:'开立账户', wage:'工资入账', earn:'计件工钱', deposit:'存入银行', withdraw:'取出现金', exchange:'兑换现金', reserve:'预付消费', settle:'消费结清', refund:'退回现金'};

const clamp = (n, lo=0, hi=1) => Math.min(hi,Math.max(lo,n));
const mix = (a,b,t) => a+(b-a)*t;
const ease = n => {const t=clamp(n);return t*t*(3-2*t);};

// These are the actual product coordinates, shared with the focused vector
// review. The front never changes layers: a note must clear its lip to fan.
export function walletGeometry(width,height,count=1) {
  count=Math.max(1,count);
  const pocketHeight=count>1?Math.min(92,Math.max(48,height*.24)):Math.min(104,Math.max(48,height*.28)),bottom=8;
  const front={x:width*.07,y:height-bottom-pocketHeight,width:width*.86,height:pocketHeight};
  const back={x:front.x+3,y:front.y-13,width:front.width-6,height:pocketHeight+11};
  const step=15;
  const noteWidth=Math.max(24,Math.min(295,width*.82,(front.y-18)/.455,(front.y-(count>1?6:19)-(count-1)*step)/(count>1?.465:.48)));
  return {width,height,count,front,back,step,noteWidth,noteHeight:noteWidth*.455};
}
export function walletPocketFrame(layout) {
  return {front:layout.front,back:layout.back};
}
export function walletNoteFrame(layout,index,progress) {
  const {width,count,front,noteWidth:w,noteHeight:h,step}=layout,mid=(count-1)/2;
  const lift=ease(progress),fan=ease(progress-1),clearY=front.y-h-12-index*2;
  const tuckedY=Math.min(front.y-h*.34,front.y+front.height-h-12)-index*2,spreadY=(count>1?2:12)+index*step;
  return {x:width/2-w/2+(index-mid)*Math.min(8,width*.025)*fan,
    y:mix(mix(tuckedY,clearY,lift),spreadY,fan),width:w,height:h,
    angle:(index-mid)*.4*fan};
}

/** Read-only presentation. Never calculate wages, exchange rates or balances. */
export function walletTransactionView(tx) {
  const id = tx.currency || 'copper', c = currency(id), amount = money(tx.amount, id);
  let detail = c.label, route = null, badge = amount;
  switch (tx.action) {
    case 'wage': detail = `${c.label} · 第${number((tx.day ?? 0) + 1)}日工资`; route = ['work','bank']; badge = `+${amount}`; break;
    case 'earn': detail += ' · 随身现金'; route = ['work','cash']; badge = `+${amount}`; break;
    case 'withdraw': detail += ' · 银行 → 钱包'; route = ['bank','cash']; break;
    case 'deposit': detail += ' · 钱包 → 银行'; route = ['cash','bank']; break;
    case 'reserve': detail += ' · 现金转为待结清预付款'; route = ['cash','spend']; badge = `−${amount}`; break;
    case 'settle': detail += ' · 使用已预付金额，无再次扣款'; badge = `已预付 ${amount}`; break;
    case 'refund': detail += ' · 预付款退回钱包'; route = ['spend','cash']; badge = `+${amount}`; break;
    case 'exchange': {
      const q = tx.quote;
      if (q && GAME_CURRENCIES[q.to]) { detail = `${c.label} → ${currency(q.to).label}`; route = ['cash','exchange']; badge = `${amount} → ${money(q.received,q.to)}`; }
      break;
    }
    case 'open': detail += ' · 银行存款独立保管'; badge = '已开户'; break;
  }
  return {id: tx.id, action: tx.action, title: ACTIONS[tx.action] || '账目记录', currency: id, detail, badge, route,
    received: tx.action === 'exchange' && tx.quote ? {currency:tx.quote.to, amount:tx.quote.received} : null};
}

export function createCurrencyWallet({mount, ledger, getCurrency=()=> 'copper', onOpen=()=>{}, onClose=()=>{}, document:doc=globalThis.document}={}) {
  if (!mount || !ledger?.balances || !ledger?.history || !ledger?.subscribeCommitted) throw TypeError('wallet requires mount and committed ledger');
  const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text != null)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,cls,label)=>{const b=make('button',text,cls);b.type='button';if(label)b.setAttribute('aria-label',label);return b;};
  const style=make('link');style.rel='stylesheet';style.href=STYLE;(doc.head||doc.body).append(style);
  const trigger=button(null,'ww-wallet-trigger','打开钱包与账本');
  const icon=make('span',null,'ww-wallet-icon');icon.setAttribute('aria-hidden','true');
  const strap=make('span',null,'ww-wallet-strap'),cashBadge=make('span',null,'ww-wallet-trigger-number');icon.append(strap);trigger.append(icon,make('span','钱包','ww-wallet-trigger-label'),cashBadge);
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');mount.prepend(trigger);
  const status=make('span',null,'ww-wallet-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');mount.append(status);
  let ui=null, disposed=false, folded=true, priorFocus=null, pulseTimer=null, transferTimer=null, transfer=null;
  let progress=0, frame=null, lastTime=null, resizeObserver=null, receiptEpoch=0;
  const view=doc.defaultView, requestFrame=fn=>view?.requestAnimationFrame?view.requestAnimationFrame(fn):setTimeout(()=>fn(Date.now()),16);
  const cancelFrame=id=>view?.cancelAnimationFrame?view.cancelAnimationFrame(id):clearTimeout(id);
  const mini=make('div',null,'ww-wallet-mini');mini.setAttribute('aria-hidden','true');mini.hidden=true;mount.append(mini);
  const seen=new Set(), notes=new Map(), artwork=new Map();
  const reducedMotion=()=>!!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function prepareArtwork(note,img,id) {
    note.dataset.artState='loading';
    img.alt='';img.width=800;img.height=364;img.decoding='async';img.draggable=false;
    const loaded=new Promise(resolve=>{
      img.onload=()=>resolve(true);img.onerror=()=>resolve(false);
      img.src=ART[id];
      if(img.complete&&img.naturalWidth>0)resolve(true);
    });
    const decoded=typeof img.decode==='function'?img.decode().catch(()=>loaded.then(ok=>{if(!ok)throw new Error('ticket artwork unavailable');return img.decode();})):loaded.then(ok=>{if(!ok)throw new Error('ticket artwork unavailable');});
    // Keep decoded country artwork and note nodes across closes. Other notes
    // and committed receipts use the identical optimized, cacheable URL.
    const cached=artwork.get(id);
    const ready=Promise.all([decoded,cached?.ready||Promise.resolve()]).then(()=>{
      if(!disposed){note.dataset.artState='ready';note.setAttribute('aria-busy','false');}
      return true;
    }).catch(()=>{if(!disposed){note.dataset.artState='error';note.setAttribute('aria-busy','false');}return false;});
    if(!cached)artwork.set(id,{image:img,ready});
    note.setAttribute('aria-busy','true');note.artReady=ready;return ready;
  }

  function artworkImage(note,id) {
    const cached=artwork.get(id);
    if(cached?.available){
      cached.available=false;note.dataset.artState='loading';note.setAttribute('aria-busy','true');
      note.artReady=cached.ready.then(ok=>{if(!disposed){note.dataset.artState=ok?'ready':'error';note.setAttribute('aria-busy','false');}return ok;});
      return cached.image;
    }
    const img=make('img');prepareArtwork(note,img,id);return img;
  }
  function primeOwnedArtwork(balances) {
    for(const id of Object.keys(GAME_CURRENCIES))if(balances?.[id]?.cash>0&&!artwork.has(id)){
      const placeholder=make('span'),img=make('img');prepareArtwork(placeholder,img,id);artwork.get(id).available=true;
    }
  }

  function receiptNote(id,amount,received=false) {
    const note=make('span',null,`ww-wallet-transfer-note${received?' is-received':''}`);note.dataset.currency=id;
    const img=artworkImage(note,id);
    const label=make('span',null,'ww-wallet-transfer-label'),value=money(amount,id);
    label.append(make('span',currency(id).label),make('strong',value));
    note.style.setProperty('--amount-scale',String(Math.min(1,7/value.length)));
    note.append(img,label);return note;
  }

  function ensureUI() {
    if (ui) return;
    const dialog=make('dialog',null,'ww-wallet-dialog');dialog.setAttribute('aria-label','钱包与账本');
    const header=make('header',null,'ww-wallet-header'),title=make('div'),closeButton=button('×','ww-wallet-close','关闭钱包');
    title.append(make('span','旅途里的小积蓄','ww-wallet-eyebrow'),make('h2','钱包与账本'));header.append(title,closeButton);
    const body=make('div',null,'ww-wallet-body'),left=make('section',null,'ww-wallet-cash'),right=make('section',null,'ww-wallet-book');
    const cashHeading=make('div',null,'ww-wallet-section-heading');cashHeading.append(make('h3','随身现金'),make('span','装在口袋里的钱'));
    const fan=button(null,'ww-wallet-fan','抽出并展开随身纸币');fan.setAttribute('aria-expanded','false');
    const back=make('span',null,'ww-wallet-back'),stack=make('span',null,'ww-wallet-stack'),pocket=make('span',null,'ww-wallet-pocket'),seam=make('span',null,'ww-wallet-seam');
    back.setAttribute('aria-hidden','true');
    pocket.setAttribute('aria-hidden','true');pocket.append(seam,make('span','四方 · 随行','ww-wallet-pocket-mark'));
    const empty=make('span','钱包还空着\n去银行取些现金，就能装进口袋','ww-wallet-empty');stack.append(empty);fan.append(back,stack,pocket);
    const hint=make('p','轻点钱包，抽出并展开纸币','ww-wallet-hint'),cashList=make('p',null,'ww-wallet-cash-list');
    left.append(cashHeading,fan,hint,cashList);
    const cashSummary=make('div',null,'ww-wallet-cash-summary'),cashSummaryAmount=make('strong');
    cashSummary.append(make('span','钱包现金'),cashSummaryAmount);cashSummary.setAttribute('aria-label','随身现金汇总');
    const bankHeading=make('div',null,'ww-wallet-section-heading');bankHeading.append(make('h3','银行存款'),make('span','独立账户 · 与现金分开'));
    const bankList=make('dl',null,'ww-wallet-bank-list');bankList.setAttribute('aria-label','各币种银行存款');
    const ledgerHeading=make('h3','收支手记','ww-wallet-ledger-title'),scroll=make('div',null,'ww-wallet-ledger-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label','滚动查看收支记录');
    const journal=make('ol',null,'ww-wallet-journal');scroll.append(journal);
    right.append(cashSummary,bankHeading,bankList,ledgerHeading,scroll);
    const notice=make('p',null,'ww-wallet-notice');notice.setAttribute('role','status');
    const effects=make('div',null,'ww-wallet-effects');effects.setAttribute('aria-hidden','true');
    body.append(left,right);dialog.append(header,body,notice,effects);doc.body.append(dialog);
    ui={dialog,closeButton,fan,back,pocket,stack,empty,hint,cashList,cashSummaryAmount,bankList,journal,scroll,notice,effects};
    closeButton.onclick=close;
    fan.onclick=()=>{folded=!folded;setFold(true);};
    if(view?.ResizeObserver){resizeObserver=new view.ResizeObserver(drawWallet);resizeObserver.observe(fan);}
    // Stopping at the modal keeps game shortcuts from turning an Escape close
    // or a Space press on the fan into an action in the world underneath.
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('close',finishClose);
    let backdropPointer=false;
    dialog.addEventListener('pointerdown',e=>{backdropPointer=e.target===dialog;});
    dialog.addEventListener('pointercancel',()=>{backdropPointer=false;});
    dialog.addEventListener('click',e=>{const dismiss=backdropPointer&&e.target===dialog;backdropPointer=false;if(dismiss)close();});
  }
  function drawWallet() {
    if(!ui)return;
    const geometry=walletGeometry(ui.fan.clientWidth||320,ui.fan.clientHeight||280,notes.size);
    const leather=walletPocketFrame(geometry,progress);
    for(const [element,box] of [[ui.back,leather.back],[ui.pocket,leather.front]]){
      for(const key of ['width','height'])element.style[key]=`${box[key]}px`;
      element.style.left=`${box.x}px`;element.style.top=`${box.y}px`;
    }
    [...notes.values()].forEach((note,index)=>{
      const f=walletNoteFrame(geometry,index,progress);
      note.style.width=`${f.width}px`;note.style.height=`${f.height}px`;
      note.style.transform=`translate(${f.x}px,${f.y}px) rotate(${f.angle}deg)`;
      note.style.setProperty('--note-index',String(index));
      note.style.setProperty('--paper-scale',String(Math.min(1,f.width/245)));
      note.dataset.multiple=String(notes.size>1);
    });
    ui.fan.dataset.motion=progress===0?'closed':progress===2?'spread':folded?(progress>1?'gathering':'returning'):(progress<1?'lifting':'spreading');
  }
  function advanceWallet(time) {
    frame=null;
    const target=folded?0:2;
    if(reducedMotion())progress=target;
    if(lastTime!==null)progress=clamp(progress+Math.sign(target-progress)*(time-lastTime)/340,Math.min(progress,target),Math.max(progress,target));
    lastTime=time;drawWallet();
    if(progress!==target)frame=requestFrame(advanceWallet);else lastTime=null;
  }
  function setFold(animate=false) {
    if (!ui) return;
    ui.fan.setAttribute('aria-expanded',String(!folded));
    ui.fan.setAttribute('aria-label',folded?'抽出并展开随身纸币':'收拢纸币放回钱包');
    ui.hint.textContent=folded?'轻点钱包，抽出并展开纸币':'再点一下，把纸币收回钱包';
    if(!animate||reducedMotion()){
      if(frame!==null)cancelFrame(frame);frame=null;lastTime=null;progress=folded?0:2;drawWallet();
    }else if(frame===null){lastTime=null;frame=requestFrame(advanceWallet);}
    drawWallet();
  }
  function renderBalances(retryArtwork=false) {
    const balances=ledger.balances();
    ui.notice.hidden=!!balances;ui.notice.textContent=balances?'':'账目暂时无法核对，请保留当前存档。余额不会显示为零。';
    const owned=balances?Object.keys(GAME_CURRENCIES).filter(id=>validAmount(balances[id]?.cash)&&balances[id].cash>0):[];
    ui.fan.disabled=!balances||!owned.length;ui.empty.hidden=!!owned.length;
    ui.empty.textContent=balances?'钱包还空着\n去银行取些现金，就能装进口袋':'账目核对中';
    for(const [id,note] of notes)if(!owned.includes(id)){note.remove();notes.delete(id);}
    owned.forEach((id,index)=>{
      const c=currency(id);let note=notes.get(id);
      if(retryArtwork&&note?.dataset.artState==='error')prepareArtwork(note,note.children[0],id);
      if(!note){
        note=make('span',null,'ww-wallet-note');note.dataset.currency=id;
        const img=artworkImage(note,id);
        const seal=make('span',null,'ww-wallet-note-seal');seal.setAttribute('aria-hidden','true');seal.append(make('span','四方'),make('span','随行'));
        const serial=make('span',`${SERIES[id]} · 0001`,'ww-wallet-note-serial');serial.setAttribute('aria-hidden','true');
        // A currency's note represents its cash total, not an invented banknote
        // denomination. Type stays in the artwork's blank right-hand fields.
        note.append(img,make('span',null,'ww-wallet-note-tab'),make('span',c.label,'ww-wallet-note-title'),make('span','随身现金','ww-wallet-note-caption'),seal,serial,make('strong',null,'ww-wallet-note-amount'));
        notes.set(id,note);ui.stack.append(note);
      }
      const amount=money(balances[id].cash,id);
      note.style.setProperty('--amount-scale',String(Math.min(1,7/amount.length)));
      note.lastElementChild.textContent=amount;
      note.children[1].textContent=`${c.label} · ${amount}`;
      note.style.setProperty('--tab-scale',String(Math.min(1,22/note.children[1].textContent.length)));
      note.setAttribute('aria-label',`${c.label}，随身现金 ${money(balances[id].cash,id)}`);
    });
    drawWallet();
    const cashText=balances?owned.map(id=>`${currency(id).label} ${money(balances[id].cash,id)}`).join(' · ')||'0 · 暂无随身现金':'现金金额待核对';
    ui.cashList.textContent=cashText;ui.cashSummaryAmount.textContent=cashText;
    ui.bankList.replaceChildren();
    for(const [id,c] of Object.entries(GAME_CURRENCIES)){
      const row=make('div',null,'ww-wallet-bank-row'),name=make('dt',c.label),amount=make('dd');
      const b=balances?.[id];amount.textContent=b?b.accountOpened?money(b.bank,id):'未开户':'待核对';
      row.dataset.currency=id;row.append(name,amount);ui.bankList.append(row);
    }
    const held=balances?Object.keys(GAME_CURRENCIES).filter(id=>balances[id]?.held>0):[];
    if(held.length){const row=make('div',null,'ww-wallet-held');row.append(make('dt','已预付 · 待结清'),make('dd',held.map(id=>`${currency(id).label} ${money(balances[id].held,id)}`).join(' / ')));ui.bankList.append(row);}
  }
  function renderHistory() {
    const history=ledger.history(), scroll=ui.scroll.scrollTop;
    ui.journal.replaceChildren();
    if(!history.length){const empty=make('li','还没有收支记录。每次成功入账，都会留下一笔。','ww-wallet-journal-empty');ui.journal.append(empty);}
    // A long journal is paged deliberately; opening the wallet does not create
    // thousands of nodes for old receipts or one node per unit of money.
    const rows=history.slice(-historyLimit).reverse();
    for(const tx of rows){
      const v=walletTransactionView(tx),row=make('li',null,'ww-wallet-entry');row.dataset.transaction=String(tx.id);
      const top=make('div',null,'ww-wallet-entry-line');top.append(make('strong',v.title),make('span',v.badge,'ww-wallet-entry-amount'));
      row.append(top,make('span',v.detail,'ww-wallet-entry-detail'));ui.journal.append(row);
    }
    if(history.length>historyLimit){const more=make('li',null,'ww-wallet-more'),b=button('翻看更早的记录','ww-wallet-more-button');b.onclick=()=>{historyLimit+=60;renderHistory();};more.append(b);ui.journal.append(more);}
    ui.scroll.scrollTop=scroll;
  }
  let historyLimit=60;
  function refreshBadge(){
    const balances=ledger.balances();primeOwnedArtwork(balances);
    const requested=getCurrency(),id=GAME_CURRENCIES[requested]?requested:'copper',b=balances?.[id];
    cashBadge.textContent=money(b?.cash,id);trigger.setAttribute('aria-label',`打开钱包与账本，${currency(id).label}随身现金 ${money(b?.cash,id)}`);
    cashBadge.title=`${currency(id).label} · 随身现金`;cashBadge.dataset.currency=id;
  }
  function refresh(){if(disposed)return;refreshBadge();if(!ui?.dialog.open)return;renderBalances();renderHistory();}
  function open(){
    if(disposed||ui?.dialog.open)return;clearTransfer();onOpen();ensureUI();priorFocus=doc.activeElement;folded=true;historyLimit=60;setFold();
    renderBalances(true);renderHistory();ui.scroll.scrollTop=0;ui.dialog.showModal();drawWallet();trigger.setAttribute('aria-expanded','true');ui.closeButton.focus({preventScroll:true});
  }
  function clearTransfer(){receiptEpoch++;clearTimeout(transferTimer);transferTimer=null;transfer?.remove();transfer=null;mini.hidden=true;mini.replaceChildren();mini.classList.remove('in-modal');if(!disposed)mount.append(mini);}
  function finishClose(){
    if(trigger.getAttribute('aria-expanded')!=='true')return;
    trigger.setAttribute('aria-expanded','false');clearTransfer();folded=true;setFold();onClose();
    if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});else if(trigger.isConnected)trigger.focus({preventScroll:true});
  }
  function close(){if(ui?.dialog.open){ui.dialog.close();finishClose();}}
  function animateCommitted(tx){
    if(disposed||!tx?.id||seen.has(tx.id))return;
    seen.add(tx.id);if(seen.size>128)seen.delete(seen.values().next().value);
    const view=walletTransactionView(tx);status.textContent=`${view.title}，${view.badge}，${view.detail}`;
    refresh();if(!view.route)return;
    trigger.classList.remove('has-receipt');clearTimeout(pulseTimer);
    // Receipts borrow only their actual currency's compressed ticket artwork;
    // no new image is requested until the ledger confirms the transaction.
    trigger.dataset.receipt=view.action;trigger.classList.add('has-receipt');
    pulseTimer=setTimeout(()=>{trigger.classList.remove('has-receipt');delete trigger.dataset.receipt;},2200);
    clearTransfer();
    if(!ui?.dialog.open){
      const places={work:'工作',bank:'银行',cash:'钱包',spend:'消费',exchange:'兑换'};
      mini.replaceChildren();mini.dataset.action=view.action;
      const title=make('strong',`${view.title} · ${view.badge}`,'ww-wallet-mini-title'),route=make('div',null,'ww-wallet-mini-route');
      route.append(make('span',places[view.route[0]]),make('span',places[view.route[1]]));
      const slip=make('span',null,'ww-wallet-mini-slip');
      slip.append(receiptNote(view.currency,tx.amount));
      if(view.received)slip.append(receiptNote(view.received.currency,view.received.amount,true));
      mini.append(title,route,slip);mini.hidden=false;
      const epoch=receiptEpoch;transferTimer=setTimeout(clearTransfer,6000);
      Promise.all([...slip.children].map(n=>n.artReady)).then(ready=>{if(disposed||epoch!==receiptEpoch)return;clearTimeout(transferTimer);if(ready.every(Boolean))slip.classList.add('is-ready');transferTimer=setTimeout(clearTransfer,reducedMotion()?2600:2200);});
      // Bank services may rebuild their dialog synchronously after each save.
      // Attach after that render, within its top layer, so a successful real
      // withdrawal is visible rather than hiding behind the modal backdrop.
      queueMicrotask(()=>{if(disposed||mini.hidden||ui?.dialog.open)return;const modal=[...(doc.querySelectorAll?.('dialog[open]')||[])].at(-1);if(modal){modal.append(mini);mini.classList.add('in-modal');}});
      return;
    }
    if(reducedMotion())return;
    transfer=make('div',null,`ww-wallet-transfer is-${view.action}`);
    transfer.append(receiptNote(view.currency,tx.amount));
    if(view.received)transfer.append(receiptNote(view.received.currency,view.received.amount,true));
    ui.effects.append(transfer);const epoch=receiptEpoch,receipt=transfer;transferTimer=setTimeout(clearTransfer,6000);
    Promise.all([...receipt.children].map(n=>n.artReady)).then(ready=>{if(disposed||epoch!==receiptEpoch)return;clearTimeout(transferTimer);if(ready.every(Boolean))receipt.classList.add('is-ready');transferTimer=setTimeout(clearTransfer,1450);});
  }
  trigger.onclick=open;
  refreshBadge();
  const unsubscribe=ledger.subscribeCommitted(animateCommitted);
  return {open,close,refresh,isOpen:()=>!!ui?.dialog.open,
    dispose(){if(disposed)return;close();disposed=true;unsubscribe();clearTransfer();clearTimeout(pulseTimer);if(frame!==null)cancelFrame(frame);resizeObserver?.disconnect();trigger.remove();status.remove();mini.remove();ui?.dialog.remove();style.remove();notes.clear();artwork.clear();seen.clear();}};
}
