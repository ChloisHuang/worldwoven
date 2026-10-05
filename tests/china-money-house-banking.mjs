// The money command boundary is the existing physical counter, including stale
// buttons and leaving a modal. No all-scene geometry or world regression here.
import assert from 'node:assert/strict';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaMoneyHouseService} from '../source/game/china-money-house-service.js';
import {CHINA_MONEY_HOUSE as C} from '../source/game/china-money-house.js';
class Element {
  constructor(tag) {this.tagName = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.style = {}; this.listeners = {}; this.value = ''; this.disabled = false;}
  append(...els) {this.children.push(...els);}
  replaceChildren(...els) {this.children = els;}
  setAttribute(key, value) {this.attrs[key] = value;}
  addEventListener(type, fn) {this.listeners[type] = fn;}
  showModal() {this.open = true;}
  close() {this.open = false;}
  remove() {this.removed = true;}
}
const doc = {head: new Element('head'), body: new Element('body'), createElement: tag => new Element(tag)};
const position = (x, y, z) => ({x, y, z, toArray() {return [this.x, this.y, this.z];}});
const player = {root: {position: position(0, 0, 0)}};
const teller = {station: {id: C.stationId, position: C.points.counter}, root: {position: position(...C.points.teller), rotation: {y: 0}, userData: {}}, animate() {}};
let visible = true, rejects = false, writes = 0, saved, opens = 0, closes = 0;
const events = [];
const ledger = createCurrencyLedger({saveState: next => {if (rejects) return false; saved = next; writes++;}, onTransaction: tx => events.push(tx)});
let forceBalanceMismatch=false;
const bankLedger={...ledger,balances:()=>{const all=ledger.balances();if(forceBalanceMismatch)all.japan.cash+=1;return all;}};
const service = createChinaMoneyHouseService({npcs: [teller], lot: {moneyHouse: {}}, getPlayer: () => player,
  poseContext: () => ({}), copperLedger: bankLedger, canSee: () => visible, document: doc,
  onOpen: () => opens++, onClose: () => closes++});
const dialog = doc.body.children[0];
const descendants = e => [e, ...e.children.flatMap(descendants)];
const find = predicate => descendants(dialog).find(predicate);
const button = action => find(e => e.dataset.moneyAction === action);
const input = label => find(e => e.attrs['aria-label'] === label);
const text = () => descendants(dialog).map(e => [e.textContent || '', e.attrs['aria-label'] || ''].join(' ')).join('\n');
const move = point => {player.root.position = position(...point);};
const wage = {amount: 20, receiptId: 'career:clerk:4', currency: 'copper', roleId: 'court-clerk', slotId: 'clerk', day: 4};
assert.equal(service.open(), false, 'Remote UI cannot withdraw or exchange');
assert.equal(writes, 0);
move(C.points.counter);visible = false;
assert.equal(service.open(), false, 'Blocked line of sight cannot open the counter');
visible = true;player.root.position.y += 3;
assert.equal(service.open(), false, 'The same map position on another floor is not arrival');
move(C.points.counter);
assert(service.open());
assert(text().includes('首次正式岗位工钱入账'));assert(input('随身现金分配').disabled && button('allocation').disabled,'No money/unopened account cannot submit');
const oldOpen = button('open');
assert(ledger.creditWageToBank(wage).ok);
assert.equal(ledger.state().cash, 0);
assert.equal(ledger.state().bank, 20);
assert(text().includes('银行存款：20 文'), 'Open bank UI refreshes after actual payroll commit');
assert.equal(button('open'), undefined);
oldOpen.onclick();
assert.equal(writes, 1, 'A stale pre-payroll button cannot open another account');
const allocate=value=>{const range=input('随身现金分配');range.value=String(value);range.oninput();};
assert(button('allocation').disabled, 'Unchanged allocation cannot submit');
let stopped=false;input('随身现金分配').listeners.keydown({stopPropagation(){stopped=true;}});assert(stopped,'Native range keyboard adjustment stays inside the bank panel');
assert.equal(input('随身现金分配').step,'1');assert.equal(input('随身现金分配').max,'20');
assert(find(e=>e.tagName==='details') && !find(e=>e.tagName==='details').open, 'Salary guidance and history start collapsed');
const beforeEditing=writes;input('随身现金增加一单位').onclick();assert.equal(input('随身现金分配').value,'1');input('随身现金减少一单位').onclick();
assert.equal(input('随身现金分配').value,'0');assert.equal(writes,beforeEditing,'Fine adjustment never commits money');
allocate(6);assert.equal(button('allocation').textContent,'确认取出 6 文');assert(text().includes('银行存款：14 文'));assert.equal(writes,beforeEditing,'Dragging previews balances without moving money');
const originalWithdraw=button('allocation');rejects=true;originalWithdraw.onclick();
assert.equal(ledger.state().cash,0);assert.equal(ledger.state().bank,20);assert(text().includes('这笔尚未记入'));
rejects=false;allocate(6);const successfulWithdraw=button('allocation');successfulWithdraw.onclick();successfulWithdraw.onclick();
assert.deepEqual([ledger.state().cash,ledger.state().bank],[6,14]);assert.equal(events.filter(tx=>tx.action==='withdraw').length,1);assert.equal(writes,2);
allocate(3);assert.equal(button('allocation').textContent,'确认存入 3 文');
const cancelledPreview=button('allocation');dialog.listeners.cancel({preventDefault(){}});cancelledPreview.onclick();
assert.deepEqual([ledger.state().cash,ledger.state().bank],[6,14],'Cancel discards only the unconfirmed allocation');assert(service.open());assert.equal(input('随身现金分配').value,'6');assert(button('allocation').disabled);
allocate(1.5);assert(button('allocation').disabled);allocate(21);assert(button('allocation').disabled);allocate(6);assert.equal(writes,2);
assert(text().includes('固定游戏汇率：2 文中国铜钱 = 1 券日本票券'));
assert(text().includes('本次交出 2 文（中国铜钱），收到 1 券（日本票券）'));
const fx = button('exchange');fx.onclick();fx.onclick();
assert.deepEqual([ledger.balances().copper.cash, ledger.balances().japan.cash], [4, 1]);
assert.equal(events.filter(tx => tx.action === 'exchange').length, 1);
assert.equal(writes, 3);
assert(text().includes('兑换已记清'));
const amount = input('交出兑换数目');amount.value = '1';amount.oninput();
assert(button('exchange').disabled);
assert(text().includes('不足换得一整单位'));
button('exchange').onclick();
assert.equal(writes, 3);
amount.value = '-5';amount.oninput();
assert(button('exchange').disabled);
assert(text().includes('大于零的整数'));
const staleFX = button('exchange');allocate(0);const staleAllocation=button('allocation');
input('办理币种').value = 'japan';input('办理币种').onchange();
assert(text().includes('随身现金：1 券（日本票券）'));
assert(text().includes('银行存款：0 券（日本票券）'));
staleFX.onclick();staleAllocation.onclick();
assert(input('随身现金分配').disabled && button('allocation').disabled,'Unopened account cannot allocate');
assert.equal(writes, 3);
button('open').onclick();
assert.equal(ledger.balances().japan.accountOpened, true);
allocate(0);button('allocation').onclick();
assert.deepEqual([ledger.balances().japan.cash, ledger.balances().japan.bank], [0, 1]);
allocate(1);const distantWithdraw = button('allocation'), beforeDeparture = writes;
move([C.points.counter[0] + 2, C.floorY, C.points.counter[2]]);
distantWithdraw.onclick();
assert.equal(writes, beforeDeparture, 'Leaving blocks a queued click before the next update');
service.update(0, 0);
assert.equal(service.isOpen(), false);
move(C.points.counter);assert(service.open());
distantWithdraw.onclick();
assert.equal(writes, beforeDeparture, 'Reopening does not reactivate old callbacks');
allocate(1);const hiddenWithdraw = button('allocation');visible = false;hiddenWithdraw.onclick();
assert.equal(writes, beforeDeparture);
service.update(0, 0);assert.equal(service.isOpen(), false);
visible = true;assert(service.open());
allocate(1);const cancelledWithdraw = button('allocation');dialog.listeners.cancel({preventDefault() {}});
cancelledWithdraw.onclick();
assert.equal(writes, beforeDeparture);
assert.equal(service.isOpen(), false);
assert(service.open());allocate(1);const beforeRecheck=writes,confirmBeforeChangedBalance=button('allocation');
forceBalanceMismatch=true;
confirmBeforeChangedBalance.onclick();assert.equal(writes,beforeRecheck,'Confirm rechecks the current cash/bank before calculating a transfer');assert(text().includes('余额已变化'));
forceBalanceMismatch=false;service.close();
const reloaded = createCurrencyLedger({saved, saveState: () => {throw Error('no replay writes');}});
assert(reloaded.creditWageToBank(wage).replayed);
assert.deepEqual(reloaded.balances(), ledger.balances());
assert.equal(reloaded.balances().copper.bank, 14);
assert(opens >= 3 && closes >= 3);
service.dispose();assert(dialog.removed);
console.log('PASS physical bank UI: allocation drag/fine preview, confirmed delta, unchanged/zero/unopened/invalid guards, changed-balance recheck, FX, stale/repeated clicks, save failure and cancel/reload');
