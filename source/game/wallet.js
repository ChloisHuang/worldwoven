import {GAME_CURRENCIES} from './currency-ledger.js';

// Merely resolving these URLs does not fetch the pictures. Images are created
// only after the player opens the wallet; there is one per owned currency.
const ART = Object.freeze({
  copper: new URL('./assets/currency/china.webp', import.meta.url).href,
  japan: new URL('./assets/currency/japan.webp', import.meta.url).href,
  egypt: new URL('./assets/currency/egypt.webp', import.meta.url).href,
  france: new URL('./assets/currency/france.webp', import.meta.url).href,
});
const STYLE = new URL('./wallet.css', import.meta.url).href;
const validAmount = n => Number.isSafeInteger(n) && n >= 0;
const number = n => validAmount(n) ? n.toLocaleString('zh-CN') : '—';
const currency = id => GAME_CURRENCIES[id] || GAME_CURRENCIES.copper;
const money = (amount, id) => `${number(amount)} ${currency(id).unit}`;
const ACTIONS = {open:'开立账户', wage:'工资入账', earn:'计件工钱', deposit:'存入银行', withdraw:'取出现金', exchange:'兑换现金', reserve:'预付消费', settle:'消费结清', refund:'退回现金'};

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
  const mini=make('div',null,'ww-wallet-mini');mini.setAttribute('aria-hidden','true');mini.hidden=true;mount.append(mini);
  const seen=new Set(), notes=new Map();
  const reducedMotion=()=>!!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function ensureUI() {
    if (ui) return;
    const dialog=make('dialog',null,'ww-wallet-dialog');dialog.setAttribute('aria-label','钱包与账本');
    const header=make('header',null,'ww-wallet-header'),title=make('div'),closeButton=button('×','ww-wallet-close','关闭钱包');
    title.append(make('span','旅途里的小积蓄','ww-wallet-eyebrow'),make('h2','钱包与账本'));header.append(title,closeButton);
    const body=make('div',null,'ww-wallet-body'),left=make('section',null,'ww-wallet-cash'),right=make('section',null,'ww-wallet-book');
    const cashHeading=make('div',null,'ww-wallet-section-heading');cashHeading.append(make('h3','随身现金'),make('span','装在口袋里的钱'));
    const fan=button(null,'ww-wallet-fan','抽出并展开随身纸币');fan.setAttribute('aria-expanded','false');
    const stack=make('span',null,'ww-wallet-stack'),pocket=make('span',null,'ww-wallet-pocket'),seam=make('span',null,'ww-wallet-seam');
    pocket.setAttribute('aria-hidden','true');pocket.append(seam,make('span','四方 · 随行','ww-wallet-pocket-mark'));
    const empty=make('span','钱包还空着\n去银行取些现金，就能装进口袋','ww-wallet-empty');stack.append(empty);fan.append(stack,pocket);
    const hint=make('p','轻点钱包，抽出并展开纸币','ww-wallet-hint'),cashList=make('p',null,'ww-wallet-cash-list');
    left.append(cashHeading,fan,hint,cashList);
    const bankHeading=make('div',null,'ww-wallet-section-heading');bankHeading.append(make('h3','银行存款'),make('span','另存银行 · 不计入现金'));
    const bankList=make('dl',null,'ww-wallet-bank-list');bankList.setAttribute('aria-label','各币种银行存款');
    const ledgerHeading=make('h3','收支手记','ww-wallet-ledger-title'),scroll=make('div',null,'ww-wallet-ledger-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label','滚动查看收支记录');
    const journal=make('ol',null,'ww-wallet-journal');scroll.append(journal);
    right.append(bankHeading,bankList,ledgerHeading,scroll);
    const notice=make('p',null,'ww-wallet-notice');notice.setAttribute('role','status');
    const effects=make('div',null,'ww-wallet-effects');effects.setAttribute('aria-hidden','true');
    body.append(left,right);dialog.append(header,body,notice,effects);doc.body.append(dialog);
    ui={dialog,closeButton,fan,stack,empty,hint,cashList,bankList,journal,scroll,notice,effects};
    closeButton.onclick=close;
    fan.onclick=()=>{folded=!folded;setFold();};
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
  function setFold() {
    if (!ui) return;
    ui.fan.classList.toggle('is-unfolded',!folded);ui.fan.setAttribute('aria-expanded',String(!folded));
    ui.fan.setAttribute('aria-label',folded?'抽出并展开随身纸币':'收拢纸币放回钱包');
    ui.hint.textContent=folded?'轻点钱包，抽出并展开纸币':'再点一下，把纸币收回钱包';
  }
  function renderBalances() {
    const balances=ledger.balances();
    ui.notice.hidden=!!balances;ui.notice.textContent=balances?'':'账目暂时无法核对，请保留当前存档。余额不会显示为零。';
    const owned=balances?Object.keys(GAME_CURRENCIES).filter(id=>validAmount(balances[id]?.cash)&&balances[id].cash>0):[];
    ui.fan.disabled=!balances||!owned.length;ui.empty.hidden=!!owned.length;
    ui.empty.textContent=balances?'钱包还空着\n去银行取些现金，就能装进口袋':'账目核对中';
    for(const [id,note] of notes)if(!owned.includes(id)){note.remove();notes.delete(id);}
    owned.forEach((id,index)=>{
      const c=currency(id);let note=notes.get(id);
      if(!note){
        note=make('span',null,'ww-wallet-note');note.dataset.currency=id;
        const img=make('img');img.src=ART[id];img.alt='';img.width=800;img.height=364;img.decoding='async';img.draggable=false;
        note.append(img,make('span',c.label,'ww-wallet-note-title'),make('strong',null,'ww-wallet-note-amount'));
        notes.set(id,note);ui.stack.append(note);
      }
      note.style.setProperty('--note-index',String(index));note.style.setProperty('--note-count',String(owned.length));
      note.style.setProperty('--note-angle',`${(index-(owned.length-1)/2)*5}deg`);
      note.lastElementChild.textContent=money(balances[id].cash,id);
      note.setAttribute('aria-label',`${c.label}，随身现金 ${money(balances[id].cash,id)}`);
    });
    ui.cashList.textContent=balances?owned.map(id=>`${currency(id).label} ${money(balances[id].cash,id)}`).join(' · '):'现金金额待核对';
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
    const requested=getCurrency(),id=GAME_CURRENCIES[requested]?requested:'copper',b=ledger.balances()?.[id];
    cashBadge.textContent=money(b?.cash,id);trigger.setAttribute('aria-label',`打开钱包与账本，${currency(id).label}随身现金 ${money(b?.cash,id)}`);
    cashBadge.title=`${currency(id).label} · 随身现金`;cashBadge.dataset.currency=id;
  }
  function refresh(){if(disposed)return;refreshBadge();if(!ui?.dialog.open)return;renderBalances();renderHistory();}
  function open(){
    if(disposed||ui?.dialog.open)return;clearTransfer();onOpen();ensureUI();priorFocus=doc.activeElement;folded=true;historyLimit=60;setFold();
    renderBalances();renderHistory();ui.scroll.scrollTop=0;ui.dialog.showModal();trigger.setAttribute('aria-expanded','true');ui.closeButton.focus({preventScroll:true});
  }
  function clearTransfer(){clearTimeout(transferTimer);transferTimer=null;transfer?.remove();transfer=null;mini.hidden=true;mini.classList.remove('in-modal');if(!disposed)mount.append(mini);}
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
    // The small receipt animates during play as well. It uses plain paper and
    // DOM text, so a committed wage does not preload the full wallet artwork.
    trigger.dataset.receipt=view.action;trigger.classList.add('has-receipt');
    pulseTimer=setTimeout(()=>{trigger.classList.remove('has-receipt');delete trigger.dataset.receipt;},2200);
    clearTransfer();
    if(!ui?.dialog.open){
      const places={work:'工作',bank:'银行',cash:'钱包',spend:'消费',exchange:'兑换'};
      mini.replaceChildren();mini.dataset.action=view.action;
      const title=make('strong',`${view.title} · ${view.badge}`,'ww-wallet-mini-title'),route=make('div',null,'ww-wallet-mini-route');
      route.append(make('span',places[view.route[0]]),make('span',places[view.route[1]]));
      const slip=make('span',null,'ww-wallet-mini-slip');
      slip.append(make('span',currency(view.currency).label));
      if(view.received)slip.append(make('span',currency(view.received.currency).label,'is-received'));
      mini.append(title,route,slip);mini.hidden=false;
      // Bank services may rebuild their dialog synchronously after each save.
      // Attach after that render, within its top layer, so a successful real
      // withdrawal is visible rather than hiding behind the modal backdrop.
      queueMicrotask(()=>{if(disposed||mini.hidden||ui?.dialog.open)return;const modal=[...(doc.querySelectorAll?.('dialog[open]')||[])].at(-1);if(modal){modal.append(mini);mini.classList.add('in-modal');}});
      transferTimer=setTimeout(clearTransfer,reducedMotion()?2600:2200);return;
    }
    if(reducedMotion())return;
    transfer=make('div',null,`ww-wallet-transfer is-${view.action}`);
    const from=make('span',`${currency(view.currency).label} ${money(tx.amount,view.currency)}`,'ww-wallet-transfer-note');
    transfer.append(from);
    if(view.received)transfer.append(make('span',`${currency(view.received.currency).label} ${money(view.received.amount,view.received.currency)}`,'ww-wallet-transfer-note is-received'));
    ui.effects.append(transfer);transferTimer=setTimeout(clearTransfer,1450);
  }
  trigger.onclick=open;
  refreshBadge();
  const unsubscribe=ledger.subscribeCommitted(animateCommitted);
  return {open,close,refresh,isOpen:()=>!!ui?.dialog.open,
    dispose(){if(disposed)return;close();disposed=true;unsubscribe();clearTransfer();clearTimeout(pulseTimer);trigger.remove();status.remove();mini.remove();ui?.dialog.remove();style.remove();notes.clear();seen.clear();}};
}
