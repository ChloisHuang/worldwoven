// Protect the read-only saved-progress contract and direct HUD / legacy host
// modal flows. These are pure DOM/state checks, not CSS or browser visual QA.
import assert from 'node:assert/strict';
import {createTravelPassport,travelPassportView,PASSPORT_REGIONS,travelStampSVG,passportHelpBlocks} from '../source/game/travel-passport.js';
import {buildPassportSpreads,renderPassportBook,passportMetrics} from '../source/game/travel-passport-art.js';
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
  if(direct){trigger.className='ww-passport-hud';host.append(trigger);helpContent.className='ww-passport-notes';helpContent.hidden=true;const status=doc.createElement('p'),references=doc.createElement('div');status.setAttribute('id','china-court-status');references.setAttribute('id','references');const link=doc.createElement('a');link.textContent='文化设计参考';link.href='https://example.com/reference';references.append(link);helpContent.append(status,references);doc.body.append(helpContent);}
  const passport=createTravelPassport({mount:direct?undefined:host,trigger,helpContent,onHelp:()=>{helpReads++;helpContent.children[0].textContent=summary;},getProgress:()=>{reads++;return progress;},getClock:()=>clock,getLook:()=>({skin:0x123456,hair:0x456789,eyeColor:0x345678,clothes:0x567890,hairStyle:'shoulder-wave'}),onOpen:()=>opens++,onReturn:()=>returns++,document:doc});
  return {doc,host,trigger,helpContent,passport,helpReads:()=>helpReads,setSummary:s=>{summary=s;},opens:()=>opens,returns:()=>returns,reads:()=>reads,setProgress:p=>{progress=p;},setClock:c=>{clock=c;}};
}
const art=doc=>one(doc,'ww-passport-art').innerHTML;
const hot=(doc,action,value)=>{const b=all(doc,'ww-passport-hotspot').find(n=>n.dataset.action===action&&(value==null||n.dataset.value===value));assert(b,`hotspot ${action} ${value??''}`);return b;};
const page=doc=>one(doc,'ww-passport-dialog').dataset.page;
const unfold=doc=>hot(doc,'open').click();
{
  const progress=freeze({visited:['china'],stamps:{china:['cn-tea','cn-rest']},nickname:'<img src=x onerror=evil>'}),before=JSON.stringify(progress),f=fixture(progress),{doc,host,passport}=f;
  assert.equal(host.children[1],one(doc,'ww-passport-trigger'));assert.equal(f.reads(),0,'content stays lazy');assert.equal(all(doc,'ww-passport-dialog').length,0);
  host.showModal();one(doc,'ww-passport-trigger').focus();passport.open();passport.open();assert.equal(f.opens(),1);assert(!host.open);assert(passport.isOpen());
  assert.equal(page(doc),'closed');assert.match(art(doc),/轻触翻开/);assert.doesNotMatch(art(doc),/旅人资料|沿途印记/,'closed cover has no exterior identity text');
  assert.equal(one(doc,'ww-passport-trigger').getAttribute('aria-expanded'),'true');unfold(doc);assert.equal(page(doc),'identity');
  assert.match(art(doc).replace(/<[^>]*>/g,''),/&lt;img src=x onerror=evil&gt;/,'nickname is XML-escaped, never markup');assert.doesNotMatch(art(doc),/<img/);
  assert.match(art(doc),/#123456/);assert.match(art(doc),/#456789/);
  hot(doc,'section','china').click();assert.equal(page(doc),'china-0');assert.equal(hot(doc,'section','china').getAttribute('aria-current'),'page');assert.match(art(doc),/沏茉莉花茶/);assert.match(art(doc),/到访日期 · 未记录/);
  hot(doc,'section','france').click();assert.match(art(doc),/留白/);assert.match(art(doc),/完成后/);
  const modal=one(doc,'ww-passport-dialog');assert(modal.dispatch('keydown',{key:'Space'}).stopped);assert(modal.dispatch('cancel').defaultPrevented);
  assert(!passport.isOpen());assert(host.open);assert.equal(f.returns(),1);assert.equal(doc.activeElement,one(doc,'ww-passport-trigger'));
  passport.open();doc.flushCloseEvents();assert(passport.isOpen());assert(!host.open,'queued native close cannot reopen old help host');assert.equal(page(doc),'closed');
  modal.dispatch('pointerdown',{target:one(doc,'ww-passport-book')});modal.dispatch('click');assert(passport.isOpen(),'inside drag to backdrop does not dismiss');
  modal.dispatch('pointerdown');modal.dispatch('pointercancel');modal.dispatch('click');assert(passport.isOpen(),'cancelled pointer does not dismiss');
  modal.dispatch('pointerdown');modal.dispatch('click');assert(!passport.isOpen());assert(host.open);doc.flushCloseEvents();
  f.setProgress({visited:['japan','france'],stamps:{france:['france-cafe']}});f.setClock({day:6,hour:18});passport.open();unfold(doc);assert.match(art(doc),/2 \/ 4 个地区/);assert.match(art(doc),/1 枚日常印记/);assert.match(art(doc),/第 7 日 · 18:00/);
  hot(doc,'section','france').click();assert.equal(page(doc),'france-0');assert.equal(doc.activeElement,hot(doc,'section','france'));
  assert.equal(JSON.stringify(progress),before);passport.dispose();passport.dispose();doc.flushCloseEvents();assert(!host.open);assert.equal(all(doc,'ww-passport-trigger').length,0);assert.equal(all(doc,'ww-passport-dialog').length,0);assert.equal(doc.head.children.length,0);passport.open();assert.equal(all(doc,'ww-passport-dialog').length,0);
}
// A large legacy save adds paper spreads; it never grows a scrolling list.
{
  const saved=freeze({visited:['egypt'],stamps:{egypt:Array.from({length:52},(_,i)=>`old-${i}`)}}),view=travelPassportView(saved);
  for(const compact of [false,true]){
    const pages=buildPassportSpreads(view,[],compact),egypt=pages.filter(p=>p.section==='egypt');
    const records=egypt.flatMap(p=>[...(p.left.records||[]),...(p.right.records||[])]);
    assert.equal(records.length,52);assert.equal(new Set(records.map(r=>r.id)).size,52);
    for(const p of egypt)for(const sheet of [p.left,p.right])assert((sheet.records||[]).length<=4,'bounded activity rows per physical sheet');
  }
  const f=fixture(saved);f.passport.open();unfold(f.doc);hot(f.doc,'section','egypt').click();assert.equal(page(f.doc),'egypt-0');
  hot(f.doc,'next').click();assert.equal(page(f.doc),'egypt-1');assert.equal((art(f.doc).match(/往日活动纪念/g)||[]).length,8);
  hot(f.doc,'previous').click();assert.equal(page(f.doc),'egypt-0');f.passport.close();assert.equal(f.doc.activeElement,f.doc.body);f.passport.dispose();
}
// Notes use the live help source and retain every source URL, across multiple
// bounded paper pages, even when long reference labels wrap on a small phone.
{
  const f=fixture({},true),blocks=passportHelpBlocks(f.helpContent);assert.equal(blocks[0].href,'https://example.com/reference');
  const notes=Array.from({length:27},(_,i)=>({text:`参考 ${i}：传统住宅与文化场景的设计和制作说明`,href:`https://example.com/${i}`}));
  notes.unshift({text:'电脑：WASD / 方向键移动；Shift 加快脚步；点击地面自动走过去'});
  for(const compact of [false,true]){
    const pages=buildPassportSpreads(travelPassportView(),notes,compact),m=passportMetrics(compact),allRows=pages.filter(p=>p.section==='notes').flatMap(p=>[...(p.left.rows||[]),...(p.right.rows||[])]);
    assert.deepEqual(new Set(allRows.filter(r=>r.href).map(r=>r.href)),new Set(notes.filter(r=>r.href).map(r=>r.href)));
    for(const row of allRows)assert(m.top+row.line*m.line+24<m.bottom,'all note baselines stay inside paper, above the page corners');
  }
  f.passport.dispose();
}
// Direct HUD, original connected help/reference nodes, keyboard and touch
// turns, ordinary dismissal, quick re-open and interruptible cover folding.
{
  const progress=freeze({visited:['china'],stamps:{china:['cn-tea']}}),before=JSON.stringify(progress),f=fixture(progress,true),{doc,host,trigger,helpContent,passport}=f;
  const status=helpContent.children[0],references=helpContent.children[1];
  trigger.focus();trigger.click();assert(passport.isOpen());assert(!host.open);assert.equal(all(doc,'ww-passport-trigger').length,0);assert(helpContent.hidden);assert(references.isConnected);unfold(doc);
  hot(doc,'section','notes').click();assert.equal(f.helpReads(),1);assert.equal(page(doc),'notes-0');assert.match(art(doc),/朝会记录/);assert.match(art(doc),/尚未开始/);assert(status.isConnected);assert.equal(helpContent.children[1],references);assert.equal(hot(doc,'link').href,'https://example.com/reference');
  f.setSummary('朝会记录 · 今日已完成');hot(doc,'section','china').click();hot(doc,'section','notes').click();assert.match(art(doc),/今日已完成/);
  hot(doc,'previous').click();assert.equal(page(doc),'france-0');
  const book=one(doc,'ww-passport-book');book.dispatch('pointerdown',{pointerType:'touch',clientX:200,clientY:100});book.dispatch('pointerup',{clientX:100,clientY:200});assert.equal(page(doc),'france-0','vertical reading cannot turn a page');
  book.dispatch('pointerdown',{pointerType:'touch',clientX:200,clientY:100});book.dispatch('pointerup',{clientX:90,clientY:105});assert.equal(page(doc),'notes-0');
  one(doc,'ww-passport-dialog').dispatch('keydown',{key:'ArrowLeft'});assert.equal(page(doc),'france-0');
  hot(doc,'close').click();assert(!passport.isOpen());assert(!host.open);assert.equal(doc.activeElement,trigger);assert.equal(f.returns(),0);assert.equal(trigger.getAttribute('aria-expanded'),'false');
  trigger.click();doc.flushCloseEvents();assert(passport.isOpen());assert.equal(page(doc),'closed');unfold(doc);
  doc.defaultView={innerWidth:852,innerHeight:393,matchMedia:()=>({matches:false})};
  hot(doc,'close').click();assert(passport.isOpen(),'input is retained until the book has folded closed');assert.equal(page(doc),'closed');assert(one(doc,'ww-passport-book').className.includes('is-folding'));
  passport.open();assert(passport.isOpen());assert.equal(page(doc),'identity','quick re-open restores the interrupted spread');
  hot(doc,'next').click();hot(doc,'next').click();assert.equal(page(doc),'china-0','repeated turns keep the newest requested page');assert.equal(all(doc,'ww-passport-turn-leaf').length,1,'obsolete moving leaves are removed');
  hot(doc,'close').click();await new Promise(resolve=>setTimeout(resolve,810));assert(!passport.isOpen());assert.equal(doc.activeElement,trigger);
  assert.equal(JSON.stringify(progress),before);passport.dispose();assert(trigger.isConnected);assert(helpContent.isConnected);assert(helpContent.hidden);assert.equal(trigger.onclick,null);
}
console.log('PASS passport: read-only saved records, closed cover only, escaped identity, physical spread pagination, retained notes/URLs and live court summary, keyboard/touch turns, bounded legacy pages, direct HUD, focus restoration, queued and interrupted close/reopen');
