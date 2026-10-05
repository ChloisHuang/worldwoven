// Protect the read-only saved-progress contract and direct HUD / legacy host
// modal flows. These are pure DOM/state checks, not CSS or browser visual QA.
import assert from 'node:assert/strict';
import {createTravelPassport,travelPassportView,PASSPORT_REGIONS,travelStampSVG} from '../source/game/travel-passport.js';
const freeze=o=>{Object.freeze(o);for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return o;};
{
  const saved=freeze({visited:['china','china','unknown','japan'],stamps:{china:['cn-tea','cn-tea','old-activity','constructor'],japan:['jp-flowers'],france:['france-cafe']},nickname:'  小云  '});
  const before=JSON.stringify(saved),v=travelPassportView(saved,{day:12,hour:7.5});
  assert.equal(v.nickname,'小云');assert.equal(v.visitedCount,2);assert.equal(v.activityCount,5);assert.equal(v.clockLabel,'游戏第 13 日 · 07:30');
  const china=v.regions.find(r=>r.id==='china');assert.equal(china.activities[1].label,'往日活动纪念');assert.equal(china.activities[2].label,'往日活动纪念');
  assert(!v.regions.find(r=>r.id==='france').visited,'a legacy activity does not manufacture a region visit');
  assert.equal(JSON.stringify(saved),before,'view cannot mutate frozen progress');
  assert(!JSON.stringify(v).match(/visitedAt|firstVisit|timestamp|passportNumber|birth/),'no fabricated dates or identity fields');
  assert.equal(new Set(PASSPORT_REGIONS.map(r=>travelStampSVG(r.id))).size,4,'four distinct original stamp motifs');
}
for(const value of [undefined,null,{}, {visited:'china',stamps:{japan:'jp-tea'},nickname:17}]){
  const v=travelPassportView(value,{day:NaN,hour:29});assert.equal(v.visitedCount,0);assert.equal(v.activityCount,0);assert.equal(v.nickname,'旅居者');assert.equal(v.clockLabel,'游戏时刻暂未记录');
}
assert.equal(travelPassportView({nickname:'\n\t旅人\u0000'}).nickname,'旅人');
assert.equal([...travelPassportView({nickname:'🌸'.repeat(40)}).nickname].length,24);
class Element {
  constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.listeners={};this.dataset={};this.style={setProperty:(k,v)=>this.style[k]=v};this.className='';this.open=false;this.scrollTop=0;this._text='';}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
  set textContent(v){this.replaceChildren();this._text=String(v);}
  get isConnected(){return this===this.doc.head||this===this.doc.body||!!this.parent?.isConnected;}
  append(...nodes){for(const n of nodes){n.remove();n.parent=this;this.children.push(n);}}
  querySelector(tag){return walk(this).slice(1).find(n=>n.tagName===tag.toUpperCase())||null;}
  insertBefore(node,before){assert.equal(before.parent,this);node.remove();node.parent=this;this.children.splice(this.children.indexOf(before),0,node);}
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}}
  replaceChildren(...nodes){for(const n of [...this.children])n.remove();this._text='';this.append(...nodes);}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  dispatch(k,extra={}){const e={target:this,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...extra};for(const f of this.listeners[k]||[])f(e);return e;}
  click(){if(!this.disabled)this.onclick?.({target:this});}
  focus(){this.doc.activeElement=this;}
  showModal(){assert(this.isConnected);this.open=true;}
  close(){this.open=false;this.doc.closeEvents.push(()=>this.dispatch('close'));}
}
const walk=node=>[node,...node.children.flatMap(walk)];
const all=(doc,cls)=>walk(doc.body).filter(n=>n.className.split(' ').includes(cls));
const one=(doc,cls)=>{const nodes=all(doc,cls);assert.equal(nodes.length,1,cls);return nodes[0];};
function fixture(progress={},direct=false){
  const doc={closeEvents:[],createElement(tag){return new Element(tag,this);},flushCloseEvents(){const events=this.closeEvents.splice(0);for(const fn of events)fn();}};
  doc.head=doc.createElement('head');doc.body=doc.createElement('body');doc.activeElement=doc.body;
  const host=doc.createElement(direct?'header':'dialog');host.append(doc.createElement('p'),doc.createElement('ul'));doc.body.append(host);let opens=0,returns=0,reads=0,clock={day:2,hour:13.25};
  const trigger=direct?doc.createElement('button'):null,helpContent=direct?doc.createElement('section'):null;let helpReads=0,summary='朝会记录 · 尚未开始';
  if(direct){trigger.className='ww-passport-hud';host.append(trigger);helpContent.className='ww-passport-notes';helpContent.hidden=true;const status=doc.createElement('p'),references=doc.createElement('div');status.setAttribute('id','china-court-status');references.setAttribute('id','references');references.append(doc.createElement('a'));helpContent.append(status,references);doc.body.append(helpContent);}
  const passport=createTravelPassport({mount:direct?undefined:host,trigger,helpContent,onHelp:()=>{helpReads++;helpContent.children[0].textContent=summary;},getProgress:()=>{reads++;return progress;},getClock:()=>clock,getLook:()=>({skin:0x123456,hair:0x456789,eyeColor:0x345678,clothes:0x567890,hairStyle:'shoulder-wave'}),onOpen:()=>opens++,onReturn:()=>returns++,document:doc});
  return {doc,host,trigger,helpContent,passport,helpReads:()=>helpReads,setSummary:s=>{summary=s;},opens:()=>opens,returns:()=>returns,reads:()=>reads,setProgress:p=>{progress=p;},setClock:c=>{clock=c;}};
}
{
  const progress=freeze({visited:['china'],stamps:{china:['cn-tea','cn-rest']},nickname:'<img src=x onerror=evil>'}),f=fixture(progress),{doc,host,passport}=f;
  assert.equal(host.children[1],one(doc,'ww-passport-trigger'),'entry is above lengthy help instructions');assert.equal(f.reads(),0,'content and progress are lazy');assert.equal(all(doc,'ww-passport-dialog').length,0);assert.equal(doc.head.children.length,1);
  host.showModal();one(doc,'ww-passport-trigger').focus();passport.open();passport.open();assert.equal(f.opens(),1);assert(!host.open);assert(passport.isOpen());
  assert.equal(one(doc,'ww-passport-trigger').getAttribute('aria-expanded'),'true');assert.equal(all(doc,'is-visited').length,1);
  assert.match(one(doc,'ww-passport-holder').textContent,/<img src=x onerror=evil>/,'nickname is text, never interpolated HTML');
  assert.match(one(doc,'ww-passport-portrait').innerHTML,/#123456/);assert.match(one(doc,'ww-passport-portrait').innerHTML,/#456789/);
  const tabs=()=>all(doc,'ww-passport-tab'),tab=id=>tabs().find(b=>b.dataset.page===id);
  tab('china').click();assert.equal(tab('china').getAttribute('aria-current'),'page');assert.equal(all(doc,'ww-passport-activity').length,2);assert.match(one(doc,'ww-passport-region-page').textContent,/到访日期 · 未记录/);
  tab('france').click();assert.equal(all(doc,'ww-passport-activity').length,0);assert.match(one(doc,'ww-passport-region-page').textContent,/留白/);assert.match(one(doc,'ww-passport-empty').textContent,/完成后/);
  const modal=one(doc,'ww-passport-dialog');assert(modal.dispatch('keydown',{code:'Space'}).stopped);assert(modal.dispatch('cancel').defaultPrevented);
  assert(!passport.isOpen());assert(host.open);assert.equal(f.returns(),1,'help diagnostics refresh on return');assert.equal(doc.activeElement,one(doc,'ww-passport-trigger'),'returns to the open help panel');
  // Native close events are queued. A fast reopen must not be undone by the
  // previous close event, nor reopen a second help modal over this one.
  passport.open();doc.flushCloseEvents();assert(passport.isOpen());assert(!host.open);assert.equal(one(doc,'ww-passport-trigger').getAttribute('aria-expanded'),'true');
  modal.dispatch('pointerdown',{target:one(doc,'ww-passport-body')});modal.dispatch('click');assert(passport.isOpen(),'inside drag to backdrop does not dismiss');
  modal.dispatch('pointerdown');modal.dispatch('pointercancel');modal.dispatch('click');assert(passport.isOpen(),'cancelled pointer does not dismiss');
  modal.dispatch('pointerdown');modal.dispatch('click');assert(!passport.isOpen());assert(host.open);doc.flushCloseEvents();
  f.setProgress({visited:['japan','france'],stamps:{france:['france-cafe']}});f.setClock({day:6,hour:18});passport.open();assert.match(one(doc,'ww-passport-totals').textContent,/2 \/ 4 个地区1 枚/);assert.match(one(doc,'ww-passport-clock').textContent,/第 7 日 · 18:00/);
  assert.equal(tab('cover').getAttribute('aria-current'),'page','reopen begins at cover');
  const mini=all(doc,'ww-passport-region-link')[3];mini.click();assert.equal(tab('france').getAttribute('aria-current'),'page');assert.equal(doc.activeElement,tab('france'));
  passport.dispose();passport.dispose();doc.flushCloseEvents();assert(!host.open,'dispose does not reopen its host');assert.equal(all(doc,'ww-passport-trigger').length,0);assert.equal(all(doc,'ww-passport-dialog').length,0);assert.equal(doc.head.children.length,0);passport.open();assert.equal(all(doc,'ww-passport-dialog').length,0);
}
{
  const f=fixture({visited:['egypt'],stamps:{egypt:Array.from({length:52},(_,i)=>`old-${i}`)}});f.passport.open();all(f.doc,'ww-passport-tab').find(b=>b.dataset.page==='egypt').click();
  assert.equal(all(f.doc,'ww-passport-activity').length,24);one(f.doc,'ww-passport-more').click();assert.equal(all(f.doc,'ww-passport-activity').length,48);one(f.doc,'ww-passport-more').click();assert.equal(all(f.doc,'ww-passport-activity').length,52);assert.equal(all(f.doc,'ww-passport-more').length,0);
  f.passport.close();assert.equal(f.doc.activeElement,f.doc.body,'programmatic open restores original focus when host was closed');f.passport.dispose();
}
// Relocating controls must keep live reference/diagnostic nodes connected and
// make dismissal return straight to gameplay, including queued close events.
{
  const progress=freeze({visited:['china'],stamps:{china:['cn-tea']}}),before=JSON.stringify(progress),f=fixture(progress,true),{doc,host,trigger,helpContent,passport}=f;
  const status=helpContent.children[0],references=helpContent.children[1],tab=id=>all(doc,'ww-passport-tab').find(b=>b.dataset.page===id);
  trigger.focus();trigger.click();assert(passport.isOpen());assert(!host.open);assert.equal(all(doc,'ww-passport-trigger').length,0);assert(helpContent.hidden);assert(references.isConnected);
  tab('notes').click();assert.equal(f.helpReads(),1);assert(!helpContent.hidden);assert.equal(helpContent.children[1],references);assert.match(status.textContent,/尚未开始/);
  f.setSummary('朝会记录 · 今日已完成');tab('china').click();assert(helpContent.hidden);assert(status.isConnected);tab('notes').click();assert.match(status.textContent,/今日已完成/);
  assert(all(doc,'ww-passport-page-turn')[1].disabled);all(doc,'ww-passport-page-turn')[0].click();assert.equal(tab('france').getAttribute('aria-current'),'page');
  const body=one(doc,'ww-passport-body');body.dispatch('pointerdown',{pointerType:'touch',clientX:200,clientY:100});body.dispatch('pointerup',{clientX:100,clientY:200});assert.equal(tab('france').getAttribute('aria-current'),'page','vertical reading cannot turn a page');
  body.dispatch('pointerdown',{pointerType:'touch',clientX:200,clientY:100});body.dispatch('pointerup',{clientX:90,clientY:105});assert.equal(tab('notes').getAttribute('aria-current'),'page','horizontal touch swipe turns the page');
  one(doc,'ww-passport-close').click();assert(!passport.isOpen());assert(!host.open);assert.equal(doc.activeElement,trigger);assert.equal(f.returns(),0);assert.equal(trigger.getAttribute('aria-expanded'),'false');
  trigger.click();doc.flushCloseEvents();assert(passport.isOpen());assert.equal(tab('cover').getAttribute('aria-current'),'page');
  doc.defaultView={matchMedia:()=>({matches:false})};one(doc,'ww-passport-close').click();assert(passport.isOpen(),'modal retains input during the closing cover animation');
  passport.open();one(doc,'ww-passport-dialog').dispatch('animationend');assert(passport.isOpen(),'reopening cancels an unfinished close');
  one(doc,'ww-passport-close').click();one(doc,'ww-passport-dialog').dispatch('animationend');assert(!passport.isOpen());assert.equal(doc.activeElement,trigger);
  assert.equal(JSON.stringify(progress),before);passport.dispose();assert(trigger.isConnected);assert(helpContent.isConnected);assert(helpContent.hidden);assert.equal(trigger.onclick,null);
}
console.log('PASS passport: read-only saved visits and unique activity marks, unknown dates, saved-color portrait, fictional nickname, empty/legacy progress, bounded DOM, lazy/repeated/interrupted modal, queued/animated close, direct HUD, retained notes/references, swipe/page buttons, legacy help return and disposal');
