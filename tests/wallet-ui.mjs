// A DOM-only regression for lazy art, authoritative committed receipts and
// interrupted/repeated panel flows. It does not claim browser layout coverage.
import assert from 'node:assert/strict';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createCurrencyWallet, walletTransactionView} from '../source/game/wallet.js';

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
assert.equal(walletTransactionView({id:'legacy',action:'earn',amount:5}).currency,'copper','legacy journal rows retain copper');
assert.equal(walletTransactionView({id:'settled',action:'settle',currency:'japan',amount:5}).route,null);
console.log('PASS wallet DOM: lazy cash-only art, aggregated notes, separate banks/holds, committed receipts, failure/replay, FX, spend/settle, repeated and interrupted modal, reduced motion, invalid ledger and journal paging');
