// A DOM-only regression for lazy art, authoritative committed receipts and
// interrupted/repeated panel flows. It does not claim browser layout coverage.
import assert from 'node:assert/strict';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createCurrencyWallet, walletTransactionView, walletReceiptFrame} from '../source/game/wallet.js';

class Element {
  constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.listeners={};this.dataset={};this.style={setProperty:(k,v)=>this.style[k]=v};this.className='';this.hidden=false;this.open=false;this.scrollTop=0;this._text='';
    this.classList={add:n=>this.setClass(n,true),remove:n=>this.setClass(n,false),toggle:(n,v)=>this.setClass(n,v)};}
  setClass(name,on){const set=new Set(this.className.split(' ').filter(Boolean));on?set.add(name):set.delete(name);this.className=[...set].join(' ');}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
  set textContent(v){this.replaceChildren();this._text=String(v);}
  get lastElementChild(){return this.children.at(-1);}
  get isConnected(){return this===this.doc.head||this===this.doc.body||!!this.parent?.isConnected;}
  append(...nodes){for(const n of nodes){n.remove();n.parent=this;this.children.push(n);}}
  prepend(n){n.remove();n.parent=this;this.children.unshift(n);}
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}}
  replaceChildren(...nodes){for(const n of [...this.children])n.remove();this._text='';this.append(...nodes);}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  dispatch(k,extra={}){const e={target:this,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...extra};for(const f of this.listeners[k]||[])f(e);return e;}
  click(){if(!this.disabled)this.onclick?.({target:this});}
  focus(){this.doc.activeElement=this;}
  showModal(){assert(this.isConnected);this.open=true;}
  close(){this.open=false;this.dispatch('close');}
}
function documentFixture(reduced=false,manualImages=false){
  let clock=0,nextFrame=0;const frames=new Map();
  const d={images:[],defaultView:{matchMedia:()=>({matches:reduced}),requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id)}};
  d.tick=ms=>{clock+=ms;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(clock));};
  d.pendingFrames=()=>frames.size;
  d.createElement=t=>{const e=new Element(t,d);if(t==='img'){
    e.decode=()=>manualImages?new Promise((resolve,reject)=>{e.finishDecode=resolve;e.failDecode=reject;}):Promise.resolve();d.images.push(e);
  }return e;};
  d.head=d.createElement('head');d.body=d.createElement('body');d.activeElement=d.body;d.querySelectorAll=()=>walk(d.body).filter(n=>n.tagName==='DIALOG'&&n.open);return d;
}
const walk=node=>[node,...node.children.flatMap(walk)];
const all=(doc,cls)=>walk(doc.body).filter(n=>n.className.split(' ').includes(cls));
const one=(doc,cls)=>{const nodes=all(doc,cls);assert.equal(nodes.length,1,cls);return nodes[0];};
const receiptArt=doc=>all(doc,'ww-wallet-transfer-note').map(n=>({currency:n.dataset.currency,file:n.children[0].src.split('/').at(-1),text:n.textContent}));
function fixture({reduced=false,saved,manualImages=false}={}){
  const doc=documentFixture(reduced,manualImages),mount=doc.createElement('div');doc.body.append(mount);let writes=0,opens=0,closes=0,currentCurrency='copper';
  const ledger=createCurrencyLedger({saved,saveState:()=>{writes++;}});
  const wallet=createCurrencyWallet({mount,ledger,document:doc,getCurrency:()=>currentCurrency,onOpen:()=>opens++,onClose:()=>closes++});
  return {doc,mount,ledger,wallet,writes:()=>writes,opens:()=>opens,closes:()=>closes,setCurrency:id=>{currentCurrency=id;wallet.refresh();}};
}

{
  const f=fixture(),{doc,wallet,ledger}=f;
  assert.equal(doc.images.length,0,'no note fetch at construction');assert.equal(all(doc,'ww-wallet-dialog').length,0,'modal lazy too');
  assert.equal(one(doc,'ww-wallet-trigger-number').textContent,'0 文');
  assert(ledger.creditWageToBank({currency:'copper',amount:20,receiptId:'salary:1',roleId:'clerk',slotId:'clerk-1',day:1}).ok);
  assert.equal(doc.images.length,1,'committed salary loads only its own currency art');
  assert.deepEqual(receiptArt(doc),[{currency:'copper',file:'china.webp',text:'中国铜钱20 文'}]);
  assert.equal(one(doc,'ww-wallet-mini').dataset.action,'wage');assert.match(one(doc,'ww-wallet-mini').textContent,/银行/);
  wallet.open();wallet.open();assert.equal(f.opens(),1,'repeat open is idempotent');
  assert.equal(all(doc,'ww-wallet-note').length,0,'bank-only money is not shown as cash art');assert(one(doc,'ww-wallet-fan').disabled);
  assert.match(one(doc,'ww-wallet-cash-summary').textContent,/0 · 暂无随身现金/);
  assert.match(one(doc,'ww-wallet-bank-list').textContent,/20 文/);
  assert(ledger.withdraw(12,'withdraw:1','copper').ok);assert.equal(all(doc,'ww-wallet-note').length,1);
  const cashImage=one(doc,'ww-wallet-note').children[0];assert.equal(one(doc,'ww-wallet-transfer').className,'ww-wallet-transfer is-withdraw');
  assert.deepEqual(receiptArt(doc),[{currency:'copper',file:'china.webp',text:'中国铜钱12 文'}]);
  assert.match(one(doc,'ww-wallet-note').textContent,/12 文/);assert.match(one(doc,'ww-wallet-bank-list').textContent,/8 文/);
  assert.match(one(doc,'ww-wallet-cash-summary').textContent,/钱包现金中国铜钱 12 文/,'cash summary is separate from the bank amount');
  assert.equal(one(doc,'ww-wallet-note-seal').textContent,'四方随行');assert.equal(one(doc,'ww-wallet-note-serial').textContent,'CN · 0001');
  assert.equal(one(doc,'ww-wallet-trigger-number').textContent,'12 文');
  const before=f.writes();one(doc,'ww-wallet-fan').click();assert.equal(one(doc,'ww-wallet-fan').getAttribute('aria-expanded'),'true');
  one(doc,'ww-wallet-fan').click();assert.equal(one(doc,'ww-wallet-fan').getAttribute('aria-expanded'),'false');assert.equal(f.writes(),before,'fan never writes money');
  assert(ledger.earn(1000000,'large-cash','copper').ok);assert.equal(all(doc,'ww-wallet-note').length,1,'one node per currency regardless of cash count');
  assert.equal(one(doc,'ww-wallet-note').children[0],cashImage,'existing currency art reused on refresh');assert.match(one(doc,'ww-wallet-note').textContent,/1,000,012/);
  assert(Number(one(doc,'ww-wallet-note').style['--amount-scale'])<1,'large amounts fit the illustrated amount field');
  const receiptBefore=one(doc,'ww-wallet-transfer'),imagesBefore=doc.images.length;
  const failed=ledger.withdraw(999999999,'cannot-withdraw','copper');assert(!failed.ok);assert.equal(all(doc,'ww-wallet-entry').length,3,'failed transaction makes no history row');
  const replay=ledger.earn(1000000,'large-cash','copper');assert(replay.replayed);assert.equal(all(doc,'ww-wallet-entry').length,3,'replayed receipt makes no duplicate row');
  assert.equal(one(doc,'ww-wallet-transfer'),receiptBefore,'failed/replayed transactions do not restart the animation');assert.equal(doc.images.length,imagesBefore,'failed/replayed transactions load no artwork');
  assert(ledger.reserve(3,'meal','copper').ok);assert.match(one(doc,'ww-wallet-bank-list').textContent,/已预付/);assert.equal(one(doc,'ww-wallet-transfer').className,'ww-wallet-transfer is-reserve');
  assert(ledger.settle('meal').ok);assert.match(one(doc,'ww-wallet-journal').textContent,/无再次扣款/);
  assert.equal(one(doc,'ww-wallet-transfer').className,'ww-wallet-transfer is-reserve','settle starts no second money movement');
  const q=ledger.quoteExchange({from:'copper',to:'japan',amount:10});assert(q.ok);assert(ledger.exchange({quote:q.quote,requestId:'fx:1'}).ok);
  assert.equal(all(doc,'ww-wallet-note').length,2);assert.equal(one(doc,'ww-wallet-transfer').className,'ww-wallet-transfer is-exchange');
  f.setCurrency('japan');assert.equal(one(doc,'ww-wallet-trigger-number').textContent,'5 券','top-right cash badge follows region without converting money');
  assert.equal(all(doc,'ww-wallet-transfer-note').length,2,'old and new currencies are both shown for FX');
  assert.deepEqual(receiptArt(doc),[{currency:'copper',file:'china.webp',text:'中国铜钱10 文'},{currency:'japan',file:'japan.webp',text:'日本票券5 券'}]);
  const modal=one(doc,'ww-wallet-dialog');assert(modal.dispatch('keydown',{code:'Space'}).stopped,'modal shortcuts do not reach world');
  assert(modal.dispatch('cancel').defaultPrevented);assert(!wallet.isOpen());assert.equal(f.closes(),1);assert.equal(all(doc,'ww-wallet-transfer').length,0,'dismiss clears in-flight transfer');
  assert.equal(doc.activeElement,doc.body,'focus restored after dismiss');
  const imageCount=doc.images.length;wallet.open();assert.equal(doc.images.length,imageCount,'opening reuses existing note images');
  assert.equal(one(doc,'ww-wallet-fan').getAttribute('aria-expanded'),'false','reopen starts neatly tucked');
  modal.dispatch('pointerdown',{target:one(doc,'ww-wallet-fan')});modal.dispatch('click');assert(wallet.isOpen(),'drag from inside to backdrop does not dismiss');
  modal.dispatch('pointerdown');modal.dispatch('click');assert(!wallet.isOpen(),'intentional backdrop tap dismisses');
  wallet.dispose();wallet.dispose();assert.equal(all(doc,'ww-wallet-trigger').length,0);assert.equal(doc.head.children.length,0);
  assert(ledger.earn(1,'after-dispose').ok);assert.equal(all(doc,'ww-wallet-mini').length,0,'dispose unsubscribes');
}
{
  const f=fixture(),bank=f.doc.createElement('dialog');f.doc.body.append(bank);bank.showModal();assert(f.ledger.earn(2,'under-bank').ok);
  bank.replaceChildren();await Promise.resolve();assert.equal(one(f.doc,'ww-wallet-mini').parent,bank,'receipt enters current top layer after synchronous bank rerender');
  assert.equal(f.doc.images.length,1,'bank receipt loads only its committed currency');f.wallet.dispose();
}
{
  const f=fixture(),wage={currency:'france',amount:9,receiptId:'france-salary',roleId:'gardener',slotId:'garden-1',day:1};
  assert(f.ledger.creditWageToBank(wage).ok);assert.equal(one(f.doc,'ww-wallet-mini-route').textContent,'工作银行');
  assert.deepEqual(receiptArt(f.doc),[{currency:'france',file:'france.webp',text:'法国票券9 券'}]);
  const receipt=one(f.doc,'ww-wallet-mini-slip');assert(f.ledger.creditWageToBank(wage).replayed);assert.equal(one(f.doc,'ww-wallet-mini-slip'),receipt);assert.equal(f.doc.images.length,1);
  assert(f.ledger.withdraw(9,'france-cash','france').ok);assert.equal(one(f.doc,'ww-wallet-mini-route').textContent,'银行钱包');
  assert.deepEqual(receiptArt(f.doc),[{currency:'france',file:'france.webp',text:'法国票券9 券'}]);
  const quote=f.ledger.quoteExchange({from:'france',to:'egypt',amount:6}).quote;assert(f.ledger.exchange({quote,requestId:'france-egypt'}).ok);
  assert.equal(one(f.doc,'ww-wallet-mini').dataset.action,'exchange');assert.deepEqual(receiptArt(f.doc),[{currency:'france',file:'france.webp',text:'法国票券6 券'},{currency:'egypt',file:'egypt.webp',text:'埃及票券8 券'}]);
  assert.match(all(f.doc,'ww-wallet-transfer-note')[1].className,/is-received/);
  assert.deepEqual([...new Set(f.doc.images.map(i=>i.src.split('/').at(-1)))],['france.webp','egypt.webp'],'closed receipts do not preload unrelated countries');f.wallet.dispose();
}
{
  const f=fixture({reduced:true});f.wallet.open();assert(f.ledger.earn(8,'reduced').ok);assert.equal(all(f.doc,'ww-wallet-transfer').length,0,'reduced motion keeps semantic receipt without animated note');
  f.wallet.close();assert(f.ledger.earn(1,'reduced-closed').ok);assert(!one(f.doc,'ww-wallet-mini').hidden,'reduced motion still conveys transaction');f.wallet.dispose();
}
{
  const f=fixture();assert(f.ledger.openAccount('open-cash-bank-example','copper').ok);assert(f.ledger.earn(6,'legacy-piecework').ok);f.wallet.open();
  assert.match(one(f.doc,'ww-wallet-cash-summary').textContent,/中国铜钱 6 文/);
  assert.equal(all(f.doc,'ww-wallet-bank-row')[0].textContent,'中国铜钱0 文','cash earnings do not become bank deposits');
  for(const id of ['japan','egypt','france']){
    assert(f.ledger.creditWageToBank({currency:id,amount:4,receiptId:`salary:${id}`,roleId:'clerk',slotId:`clerk-${id}`,day:1}).ok);
    assert(f.ledger.withdraw(4,`cash:${id}`,id).ok);
  }
  assert.equal(all(f.doc,'ww-wallet-note').length,4);assert.equal(all(f.doc,'ww-wallet-note').flatMap(n=>n.children.filter(c=>c.tagName==='IMG')).length,4,'one original image per owned currency');
  assert.equal(new Set(all(f.doc,'ww-wallet-note').map(n=>n.style.width)).size,1,'all country notes share the responsive paper size');
  const before=f.writes();one(f.doc,'ww-wallet-fan').click();f.wallet.refresh();
  assert.equal(one(f.doc,'ww-wallet-fan').getAttribute('aria-expanded'),'true','balance refresh preserves opened fan');
  assert.equal(f.writes(),before,'presentation refresh and decorative serials never change money');f.wallet.dispose();
}
{
  const f=fixture({saved:{version:2,balances:{}}});assert(f.ledger.loadError);assert.equal(one(f.doc,'ww-wallet-trigger-number').textContent,'— 文');f.wallet.open();assert.match(one(f.doc,'ww-wallet-notice').textContent,/无法核对/);assert.match(one(f.doc,'ww-wallet-bank-list').textContent,/待核对/);assert(!one(f.doc,'ww-wallet-bank-list').textContent.includes('0 文'));assert.equal(f.doc.images.length,0);f.wallet.dispose();
}
{
  const f=fixture();for(let i=0;i<65;i++)assert(f.ledger.earn(1,`journal:${i}`).ok);f.wallet.open();assert.equal(all(f.doc,'ww-wallet-entry').length,60);one(f.doc,'ww-wallet-more-button').click();assert.equal(all(f.doc,'ww-wallet-entry').length,65);f.wallet.dispose();
}
{
  const f=fixture({manualImages:true});f.wallet.open();f.ledger.earn(6,'first-art');
  const note=one(f.doc,'ww-wallet-note'),img=note.children[0];
  assert.equal(note.dataset.artState,'loading','first open reserves a paper-shaped loading placeholder');
  assert.equal(note.getAttribute('aria-busy'),'true');
  const count=f.doc.images.length;f.wallet.close();f.wallet.open();
  assert.equal(f.doc.images.length,count,'pending artwork is reused on repeated open');
  img.finishDecode();for(let i=0;i<6;i++)await Promise.resolve();
  assert.equal(note.dataset.artState,'ready','labels and paper become visible together after decoding');
  f.wallet.close();f.wallet.open();assert.equal(note.children[0],img);assert.equal(f.doc.images.length,count,'decoded images stay cached across opens');
  f.wallet.dispose();
}
{
  const f=fixture();f.wallet.open();f.ledger.earn(6,'motion');const fan=one(f.doc,'ww-wallet-fan');
  assert.equal(fan.dataset.motion,'closed');fan.click();f.doc.tick(0);f.doc.tick(170);
  assert.equal(fan.dataset.motion,'lifting');const half=one(f.doc,'ww-wallet-note').style.transform;
  fan.click();assert.equal(one(f.doc,'ww-wallet-note').style.transform,half,'reversing mid-lift does not teleport paper');
  f.doc.tick(85);assert.equal(fan.dataset.motion,'returning');f.doc.tick(85);assert.equal(fan.dataset.motion,'closed');
  fan.click();f.doc.tick(0);f.doc.tick(340);assert.equal(fan.dataset.motion,'spreading');f.doc.tick(340);assert.equal(fan.dataset.motion,'spread');
  fan.click();f.doc.tick(0);f.doc.tick(170);assert.equal(fan.dataset.motion,'gathering');
  const gathering=one(f.doc,'ww-wallet-note').style.transform;fan.click();assert.equal(one(f.doc,'ww-wallet-note').style.transform,gathering,'reverse during gathering keeps the current paper pose');
  f.doc.tick(170);assert.equal(fan.dataset.motion,'spread');fan.click();f.doc.tick(0);f.doc.tick(340);assert.equal(fan.dataset.motion,'returning');
  f.wallet.close();assert.equal(f.doc.pendingFrames(),0,'close cancels animation');f.wallet.open();assert.equal(fan.dataset.motion,'closed');f.doc.tick(1000);assert.equal(fan.dataset.motion,'closed','stale callbacks cannot reopen notes');f.wallet.dispose();
}
{
  const f=fixture({reduced:true});f.wallet.open();f.ledger.earn(6,'reduced-fold');const fan=one(f.doc,'ww-wallet-fan');
  fan.click();assert.equal(fan.dataset.motion,'spread');assert.equal(f.doc.pendingFrames(),0);fan.click();assert.equal(fan.dataset.motion,'closed');f.wallet.dispose();
}
// The reported stacked tickets need selectable exposed edges. This catches
// nested-button markup, lost focus, overlapping selection order, and closing
// before an inspected ticket has returned to the fan.
{
  const f=fixture();for(const id of ['copper','japan','egypt','france']){
    f.ledger.creditWageToBank({currency:id,amount:4,receiptId:`fan-bank:${id}`,roleId:'clerk',slotId:`clerk-${id}`,day:1});
    f.ledger.withdraw(4,`fan-cash:${id}`,id);
  }
  f.wallet.open();const fan=one(f.doc,'ww-wallet-fan'),toggle=one(f.doc,'ww-wallet-toggle'),notes=all(f.doc,'ww-wallet-note');
  assert.equal(fan.tagName,'DIV','individual note buttons are not nested inside another button');
  assert.equal(toggle.tagName,'BUTTON');assert(notes.every(n=>n.tagName==='BUTTON'&&n.disabled&&n.tabIndex===-1));
  assert.deepEqual(notes.map(n=>n.children[1].textContent),['中国4文','日本4券','埃及4券','法国4券']);
  const writes=f.writes(),images=f.doc.images.length;fan.click();f.doc.tick(0);f.doc.tick(680);
  assert(notes.every(n=>!n.disabled&&n.tabIndex===0),'only fully extracted tickets enter the keyboard tab order');
  const pose=notes[0].style.transform,width=parseFloat(notes[0].style.width);
  notes[3].click();f.doc.tick(0);f.doc.tick(110);notes[0].click();
  assert(Number(notes[0].style['--note-index'])>Number(notes[3].style['--note-index']),'newly selected rear currency comes above the previously inspected one');
  f.doc.tick(220);assert.equal(notes[0].getAttribute('aria-pressed'),'true');
  assert(parseFloat(notes[0].style.width)>width,'inspection restores the larger original ticket size');
  assert.notEqual(notes[0].style.transform,pose);notes[0].focus();const inspected=notes[0].style.transform;fan.click();
  assert.equal(notes[0].style.transform,inspected,'closing does not teleport the inspected ticket');assert.equal(f.doc.activeElement,toggle,'closing returns note focus to the wallet control');
  f.doc.tick(0);f.doc.tick(110);assert.equal(fan.dataset.motion,'spread','the paper returns to the fan before gathering');
  f.doc.tick(110);assert.equal(notes[0].style.transform,pose);f.doc.tick(340);assert.equal(fan.dataset.motion,'returning','only the fully gathered stack enters the pocket');
  f.doc.tick(340);assert.equal(fan.dataset.motion,'closed');assert(notes.every(n=>n.disabled));
  assert.equal(f.writes(),writes);assert.equal(f.doc.images.length,images,'inspection reuses decoded real currency artwork');f.wallet.dispose();
}
{
  const f=fixture({reduced:true});f.ledger.earn(4,'still:copper');f.ledger.creditWageToBank({currency:'japan',amount:4,receiptId:'still-bank',roleId:'clerk',slotId:'clerk-japan',day:1});f.ledger.withdraw(4,'still-cash','japan');f.wallet.open();
  const fan=one(f.doc,'ww-wallet-fan'),note=all(f.doc,'ww-wallet-note')[0];fan.click();const pose=note.style.transform;note.click();
  assert.equal(note.getAttribute('aria-pressed'),'true');assert.notEqual(note.style.transform,pose);assert.equal(f.doc.pendingFrames(),0,'reduced motion inspects without animation');
  note.click();assert.equal(note.style.transform,pose,'a second press returns the note to its original fan position');fan.click();assert.equal(fan.dataset.motion,'closed');assert.equal(f.doc.pendingFrames(),0);f.wallet.dispose();
}
{
  const seed=createCurrencyLedger({saveState:()=>{}});seed.earn(6,'saved-cash');seed.creditWageToBank({currency:'france',amount:12,receiptId:'saved-bank',roleId:'gardener',slotId:'garden-1',day:1});
  const f=fixture({saved:seed.state()});assert.equal(f.doc.images.length,1,'construction predecodes only an already-owned cash currency');
  const primed=f.doc.images[0];assert.match(primed.src,/china.webp$/);assert.equal(all(f.doc,'ww-wallet-dialog').length,0,'predecoding does not open or build the dialog');
  for(let i=0;i<6;i++)await Promise.resolve();f.wallet.open();assert.equal(one(f.doc,'ww-wallet-note').children[0],primed,'first open adopts its predecoded image');f.wallet.dispose();
}
{
  const f=fixture({manualImages:true});f.wallet.open();f.ledger.earn(6,'failed-art');
  const note=one(f.doc,'ww-wallet-note'),img=note.children[0],receipt=one(f.doc,'ww-wallet-transfer');
  img.failDecode(new Error('network'));img.onerror();for(const other of f.doc.images)if(other!==img){other.failDecode(new Error('network'));other.onerror();}
  for(let i=0;i<12;i++)await Promise.resolve();
  assert.equal(note.dataset.artState,'error');assert(!receipt.className.includes('is-ready'),'failed art cannot start a flying placeholder');
  const writes=f.writes(),count=f.doc.images.length;f.wallet.refresh();assert.equal(note.dataset.artState,'error','ordinary refresh does not keep retrying failed images');
  f.wallet.close();f.wallet.open();assert.equal(note.dataset.artState,'loading','reopening makes one controlled retry of a failed ticket');
  assert.equal(note.children[0],img);assert.equal(f.doc.images.length,count,'retry reuses the same country node and URL');img.finishDecode();
  for(let i=0;i<8;i++)await Promise.resolve();assert.equal(note.dataset.artState,'ready','successful retry recovers the actual ticket');assert.equal(f.writes(),writes,'art failure and retry never write money');f.wallet.dispose();
}
{
  const f=fixture(),{doc,ledger}=f,mini=one(doc,'ww-wallet-mini'),bank=doc.createElement('dialog'),field=doc.createElement('input');
  doc.defaultView.innerWidth=852;doc.defaultView.innerHeight=393;doc.defaultView.visualViewport={offsetLeft:0,offsetTop:0,width:852,height:393};
  // This feature is detected at wallet construction; use a fresh wallet with
  // the same fixture so the mock explicitly exercises the browser popover API.
  f.wallet.dispose();const original=doc.createElement;doc.createElement=t=>{const e=original(t);e.showPopover=function(){this.popoverOpen=true;};e.hidePopover=function(){this.popoverOpen=false;};return e;};
  const wallet=createCurrencyWallet({mount:f.mount,ledger,document:doc});doc.body.append(bank);bank.append(field);bank.showModal();field.focus();
  ledger.earn(8,'popover-cash');ledger.openAccount('popover-account');ledger.deposit(3,'popover-deposit');bank.scrollTop=180;
  await Promise.resolve();const receipt=one(doc,'ww-wallet-mini');assert.equal(receipt.parent,doc.body,'Receipt escapes the scrolling modal');assert(receipt.popoverOpen);assert.equal(receipt.getAttribute('popover'),'manual');assert.equal(doc.activeElement,field,'A receipt must not steal amount input focus');
  assert.deepEqual([receipt.style.left,receipt.style.top],['570px','12px']);assert.equal(receipt.dataset.action,'deposit','Only the newest repeated receipt is shown');
  const same=one(doc,'ww-wallet-mini-slip');ledger.deposit(3,'popover-deposit');await Promise.resolve();assert.equal(one(doc,'ww-wallet-mini-slip'),same,'Idempotent replay cannot restart the paper path');
  wallet.dispose();assert(!receipt.popoverOpen);assert.equal(doc.activeElement,field);
}
{
  for(const [viewport,game,safe] of [
    [{left:0,top:0,width:852,height:393},{left:0,top:60,width:852,height:333},{left:44,right:44}],
    [{left:0,top:0,width:852,height:190},{left:0,top:0,width:852,height:393},{right:44}],
    [{left:15,top:20,width:280,height:120},{left:0,top:0,width:852,height:393},{}],
  ]){
    const frame=walletReceiptFrame(viewport,game,safe);
    assert(frame.left>=Math.max(viewport.left+(safe.left||0),game.left));assert(frame.top>=Math.max(viewport.top+(safe.top||0),game.top));
    assert(frame.left+frame.width*frame.scale<=Math.min(viewport.left+viewport.width-(safe.right||0),game.left+game.width));
    assert(frame.top+frame.height*frame.scale<=Math.min(viewport.top+viewport.height-(safe.bottom||0),game.top+game.height));
  }
}
assert.equal(walletTransactionView({id:'legacy',action:'earn',amount:5}).currency,'copper','legacy journal rows retain copper');
assert.equal(walletTransactionView({id:'settled',action:'settle',currency:'japan',amount:5}).route,null);
{
  const f=fixture({saved:{version:1,cash:0,bank:250,accountOpened:true,nextTransaction:1,transactions:[]}});
  const {doc,ledger,wallet}=f;
  assert(ledger.observeDay(6).ok);assert.equal(doc.images.length,0,'interest initialization fetches no cash artwork');
  assert(ledger.observeDay(7).ok);
  assert.deepEqual(receiptArt(doc),[{currency:'copper',file:'china.webp',text:'中国铜钱2 文'}]);
  assert.equal(one(doc,'ww-wallet-mini').dataset.action,'interest');assert.match(one(doc,'ww-wallet-mini').textContent,/每日利息.*1%.*银行/);
  wallet.open();assert.equal(all(doc,'ww-wallet-note').length,0,'interest belongs to bank, never the wallet cash stack');
  assert.match(one(doc,'ww-wallet-bank-list').textContent,/252 文/);
  assert.match(one(doc,'ww-wallet-journal').textContent,/每日利息.*日息1%.*最低存款 250 文.*已到账银行/);
  assert(ledger.observeDay(8).ok);assert.equal(one(doc,'ww-wallet-transfer').className,'ww-wallet-transfer is-interest');
  assert.deepEqual(receiptArt(doc),[{currency:'copper',file:'china.webp',text:'中国铜钱2 文'}]);
  const current=one(doc,'ww-wallet-transfer');assert(ledger.observeDay(8).replayed);
  assert.equal(one(doc,'ww-wallet-transfer'),current,'same-day observe cannot restart the receipt');
  wallet.dispose();
}
console.log('PASS wallet DOM: lazy cash-only art, aggregated notes, separate banks/holds, committed receipts, failure/replay, FX, spend/settle, repeated and interrupted modal, reduced motion, invalid ledger and journal paging');

// Repeated read-only refreshes used to rebuild the journal and snap the cash
// scroller back to its fold position even while the user was reading it.
{
 const f=fixture({reduced:true});f.ledger.earn(12,'stable-refresh');f.wallet.open();one(f.doc,'ww-wallet-fan').onclick();
 const journal=one(f.doc,'ww-wallet-journal'),row=journal.children[0],bank=one(f.doc,'ww-wallet-bank-list'),bankRow=bank.children[0],fan=one(f.doc,'ww-wallet-fan'),scroll=one(f.doc,'ww-wallet-ledger-scroll');fan.scrollTop=73;scroll.scrollTop=129;
 for(let i=0;i<30;i++)f.wallet.refresh();
 assert.equal(journal.children[0],row);assert.equal(bank.children[0],bankRow);assert.equal(fan.scrollTop,73);assert.equal(scroll.scrollTop,129);
 f.ledger.earn(1,'changed-refresh');assert.equal(fan.scrollTop,73);assert.equal(scroll.scrollTop,129);f.wallet.dispose();
}
{
 for(const [currency,id,name]of [['copper','cn-money-house-teller','中国钱庄'],['japan','jp-exchange-teller','霞汤屋 · 両替柜台'],['france','france-exchange-teller','宫苑银行与兑换柜台'],['egypt','egypt-exchange-teller','沙海票券存取与兑换']]){
  const doc=documentFixture(),mount=doc.createElement('div');doc.body.append(mount);let writes=0,target={id,name},wallet;const routes=[];
  const ledger=createCurrencyLedger({saveState:()=>{writes++;}});
  wallet=createCurrencyWallet({mount,ledger,document:doc,getCurrency:()=>currency,getBankTarget:()=>target,onBankNavigate:t=>{assert.equal(wallet.isOpen(),false,'close wallet before entering existing navigation');routes.push(t);}});
  wallet.open();const go=one(doc,'ww-wallet-bank-visit');assert(!go.hidden);assert.equal(go.textContent,'前往'+name);assert.equal(go.getAttribute('aria-label'),'前往'+name);assert.equal(go.parent,one(doc,'ww-wallet-header-actions'),'bank action shares title row, not a footer');assert.equal(go.parent.children.at(-1),one(doc,'ww-wallet-close'),'bank and close remain separate controls');go.click();assert.equal(routes[0],target);assert.equal(writes,0,'navigation never transacts');go.click();assert.equal(routes.length,1,'closed stale callback does not navigate twice');
  wallet.open();target=null;wallet.refresh();assert(go.hidden);go.click();assert.equal(routes.length,1);wallet.dispose();
 }
}
console.log('PASS wallet stable repeated refresh and current-country physical bank navigation: four counters, close-before-route, no transaction, unavailable/stale guards');

// The four route targets are the actual built-in bank stations, and remain
// public station intents even when the player starts outside nearby range.
{
 const {playerStationIntent,nearbyInteraction}=await import('../source/game/player-interaction-intents.js');
 const {chinaMoneyHouseStation,CHINA_MONEY_HOUSE}=await import('../source/game/china-money-house.js');
 const {japanExchangeStation,JAPAN_EXCHANGE_COUNTER}=await import('../source/game/japan-exchange-counter.js');
 const {franceExchangeStation,FRANCE_EXCHANGE_COUNTER}=await import('../source/game/france-exchange-counter.js');
 const {egyptExchangeStation,EGYPT_EXCHANGE_COUNTER}=await import('../source/game/egypt-exchange-counter.js');
 for(const [build,counter]of [[chinaMoneyHouseStation,CHINA_MONEY_HOUSE],[japanExchangeStation,JAPAN_EXCHANGE_COUNTER],[franceExchangeStation,FRANCE_EXCHANGE_COUNTER],[egyptExchangeStation,EGYPT_EXCHANGE_COUNTER]]){
  const station=build(),intent=playerStationIntent(station);assert(intent);assert.equal(intent.id,counter.stationId);assert.deepEqual(intent.position,counter.points.counter);assert.equal(nearbyInteraction(intent,{x:counter.points.counter[0]+10,y:counter.floorY,z:counter.points.counter[2]}),false);assert(intent.action.includes('存取'));
 }
}
console.log('PASS wallet target differences: four production station IDs, physical counter coordinates, public intents independent of nearby eligibility');
