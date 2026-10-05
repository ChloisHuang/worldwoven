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
const PHOTO='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
function fixture(progress={},direct=false){
  const doc={closeEvents:[],createElement(tag){return new Element(tag,this);},flushCloseEvents(){const events=this.closeEvents.splice(0);for(const fn of events)fn();}};
  doc.head=doc.createElement('head');doc.body=doc.createElement('body');doc.activeElement=doc.body;
  const host=doc.createElement(direct?'header':'dialog');host.append(doc.createElement('p'),doc.createElement('ul'));doc.body.append(host);let opens=0,returns=0,reads=0,clock={day:2,hour:13.25};
  const trigger=direct?doc.createElement('button'):null,helpContent=direct?doc.createElement('section'):null;let helpReads=0,summary='朝会记录 · 尚未开始';
  if(direct){trigger.className='ww-passport-hud';host.append(trigger);helpContent.className='ww-passport-notes';helpContent.hidden=true;const status=doc.createElement('p'),references=doc.createElement('div');status.setAttribute('id','china-court-status');references.setAttribute('id','references');const link=doc.createElement('a');link.textContent='文化设计参考';link.href='https://example.com/reference';references.append(link);helpContent.append(status,references);doc.body.append(helpContent);}
  const passport=createTravelPassport({mount:direct?undefined:host,trigger,helpContent,onHelp:()=>{helpReads++;helpContent.children[0].textContent=summary;},getProgress:()=>{reads++;return progress;},getClock:()=>clock,getPortrait:()=>PHOTO,onOpen:()=>opens++,onReturn:()=>returns++,document:doc});
  return {doc,host,trigger,helpContent,passport,helpReads:()=>helpReads,setSummary:s=>{summary=s;},opens:()=>opens,returns:()=>returns,reads:()=>reads,setProgress:p=>{progress=p;},setClock:c=>{clock=c;}};
}
const art=doc=>one(doc,'ww-passport-art').innerHTML;
const hot=(doc,action)=>{const b=all(doc,'ww-passport-hotspot').find(n=>n.dataset.action===action);assert(b,`hotspot ${action}`);return b;};
const page=doc=>one(doc,'ww-passport-dialog').dataset.page;
const unfold=doc=>hot(doc,'open').click();
function go(doc,index){let guard=50;while(page(doc)!=='pages-'+index&&guard--){const current=Number(page(doc).slice(6));hot(doc,current<index?'next':'previous').click();}assert.equal(page(doc),'pages-'+index);}
{
  const progress=freeze({visited:['china'],stamps:{china:['cn-tea','cn-rest']},nickname:'<img src=x onerror=evil>'}),before=JSON.stringify(progress),f=fixture(progress),{doc,host,passport}=f;
  assert.equal(host.children[1],one(doc,'ww-passport-trigger'));assert.equal(f.reads(),0,'content stays lazy');assert.equal(all(doc,'ww-passport-dialog').length,0);
  host.showModal();one(doc,'ww-passport-trigger').focus();passport.open();passport.open();assert.equal(f.opens(),1);assert(!host.open);assert(passport.isOpen());
  assert.equal(page(doc),'closed');assert.match(art(doc),/轻触翻开/);assert.doesNotMatch(art(doc),/旅人资料|沿途印记/,'closed cover has no exterior identity text');
  assert.equal(one(doc,'ww-passport-trigger').getAttribute('aria-expanded'),'true');unfold(doc);assert.equal(page(doc),'pages-0');
  assert.match(art(doc).replace(/<[^>]*>/g,''),/&lt;img src=x onerror=evil&gt;/,'nickname is XML-escaped, never markup');assert.doesNotMatch(art(doc),/<img/);
  assert(art(doc).includes(PHOTO),'identity paper uses the actual PNG provider');assert.doesNotMatch(art(doc),/沿途印记|个地区/,'no four-country overview');
  assert.equal(all(doc,'ww-passport-hotspot').length,3,'only close and the two paper corners; no country tabs or region links');
  hot(doc,'next').click();assert.equal(page(doc),'pages-1');assert.match(art(doc),/日本/);assert.match(art(doc),/中国/);assert.match(art(doc),/沏茉莉花茶/);assert.match(art(doc),/日期未记录/);
  hot(doc,'next').click();assert.equal(page(doc),'pages-2');assert.match(art(doc),/埃及/);assert.match(art(doc),/法国/);assert.match(art(doc),/留白待启程/);
  const modal=one(doc,'ww-passport-dialog');assert(modal.dispatch('keydown',{key:'Space'}).stopped);assert(modal.dispatch('cancel').defaultPrevented);
  assert(!passport.isOpen());assert(host.open);assert.equal(f.returns(),1);assert.equal(doc.activeElement,one(doc,'ww-passport-trigger'));
  passport.open();doc.flushCloseEvents();assert(passport.isOpen());assert(!host.open,'queued native close cannot reopen old help host');assert.equal(page(doc),'closed');
  modal.dispatch('pointerdown',{target:one(doc,'ww-passport-book')});modal.dispatch('click');assert(passport.isOpen(),'inside drag to backdrop does not dismiss');
  modal.dispatch('pointerdown');modal.dispatch('pointercancel');modal.dispatch('click');assert(passport.isOpen(),'cancelled pointer does not dismiss');
  modal.dispatch('pointerdown');modal.dispatch('click');assert(!passport.isOpen());assert(host.open);doc.flushCloseEvents();
  f.setProgress({visited:['japan','france'],stamps:{france:['france-cafe']}});f.setClock({day:6,hour:18});passport.open();unfold(doc);assert.match(art(doc),/第 7 日 · 18:00/);
  hot(doc,'next').click();assert.equal(doc.activeElement,hot(doc,'next'));
  assert.equal(JSON.stringify(progress),before);passport.dispose();passport.dispose();doc.flushCloseEvents();assert(!host.open);assert.equal(all(doc,'ww-passport-trigger').length,0);assert.equal(all(doc,'ww-passport-dialog').length,0);assert.equal(doc.head.children.length,0);passport.open();assert.equal(all(doc,'ww-passport-dialog').length,0);
}
// Pagination is a sequence of physical sheets. Every country gets its own
// first visa sheet; additional countries require no new fixed UI navigation.
{
  const view=travelPassportView(),pages=buildPassportSpreads(view).flatMap(p=>[p.left,p.right]);
  assert.equal(pages[1].type,'identity');assert.deepEqual(pages.slice(2).map(p=>p.region?.id),PASSPORT_REGIONS.map(r=>r.id));
  const expanded={...view,regions:[...view.regions,{...view.regions[0],id:'extra-country',country:'新地区'}]};
  const expandedPages=buildPassportSpreads(expanded).flatMap(p=>[p.left,p.right]);assert.equal(expandedPages[6].region.id,'extra-country');
  const missing=renderPassportBook({view,spread:buildPassportSpreads(view)[0]});assert.match(missing.svg,/照片待生成/);assert.doesNotMatch(missing.svg,/<image/,'missing photograph is not replaced by an invented person');
  const saved=freeze({visited:['egypt'],stamps:{egypt:Array.from({length:52},(_,i)=>`old-${i}`)}}),legacyView=travelPassportView(saved);
  for(const compact of [false,true]){
    const sheets=buildPassportSpreads(legacyView,[],compact).flatMap(p=>[p.left,p.right]).filter(p=>p.region?.id==='egypt');
    const records=sheets.flatMap(p=>p.records||[]);assert.equal(records.length,52);assert.equal(new Set(records.map(r=>r.id)).size,52);
    assert.equal(sheets[0].type,'visa');assert(sheets.slice(1).every(p=>p.type==='activities'),'extra records follow the same country on its own continuation sheets');
    assert(sheets.every(p=>p.records.length<=(compact?6:8)),'bounded activity rows per physical sheet');
  }
  const f=fixture(saved);f.passport.open();unfold(f.doc);go(f.doc,2);assert.match(art(f.doc),/埃及/);hot(f.doc,'next').click();assert.equal(page(f.doc),'pages-3');assert.equal((art(f.doc).match(/往日活动纪念/g)||[]).length,16);
  f.passport.close();assert.equal(f.doc.activeElement,f.doc.body);f.passport.dispose();
}
// Notes retain source URLs across bounded sheets, including small-phone wraps.
{
  const f=fixture({},true),blocks=passportHelpBlocks(f.helpContent);assert.equal(blocks[0].href,'https://example.com/reference');
  const notes=Array.from({length:27},(_,i)=>({text:`参考 ${i}：传统住宅与文化场景的设计和制作说明`,href:`https://example.com/${i}`}));
  notes.unshift({text:'电脑：WASD / 方向键移动；Shift 加快脚步；点击地面自动走过去'});
  for(const compact of [false,true]){
    const pages=buildPassportSpreads(travelPassportView(),notes,compact),m=passportMetrics(compact),allRows=pages.flatMap(p=>[...(p.left.rows||[]),...(p.right.rows||[])]);
    assert.deepEqual(new Set(allRows.filter(r=>r.href).map(r=>r.href)),new Set(notes.filter(r=>r.href).map(r=>r.href)));
    for(const row of allRows)assert(m.top+row.line*m.line+24<m.bottom,'all notes remain inside paper, above page corners');
  }
  f.passport.dispose();
}
// Direct HUD, original connected help/reference nodes, keyboard/touch turns,
// focus return, queued native close and interruptible whole-book folding.
{
  const progress=freeze({visited:['china'],stamps:{china:['cn-tea']}}),before=JSON.stringify(progress),f=fixture(progress,true),{doc,host,trigger,helpContent,passport}=f;
  const status=helpContent.children[0],references=helpContent.children[1];
  trigger.focus();trigger.click();assert(passport.isOpen());assert(!host.open);assert.equal(all(doc,'ww-passport-trigger').length,0);assert(helpContent.hidden);assert(references.isConnected);unfold(doc);
  go(doc,3);assert.equal(f.helpReads(),1);assert.match(art(doc),/朝会记录/);assert.match(art(doc),/尚未开始/);assert(status.isConnected);assert.equal(helpContent.children[1],references);assert.equal(hot(doc,'link').href,'https://example.com/reference');
  f.setSummary('朝会记录 · 今日已完成');hot(doc,'previous').click();hot(doc,'next').click();assert.match(art(doc),/今日已完成/);
  hot(doc,'previous').click();assert.equal(page(doc),'pages-2');
  const book=one(doc,'ww-passport-book');book.dispatch('pointerdown',{pointerType:'touch',clientX:200,clientY:100});book.dispatch('pointerup',{clientX:100,clientY:200});assert.equal(page(doc),'pages-2','vertical movement cannot turn a page');
  book.dispatch('pointerdown',{pointerType:'touch',clientX:200,clientY:100});book.dispatch('pointerup',{clientX:90,clientY:105});assert.equal(page(doc),'pages-3');
  one(doc,'ww-passport-dialog').dispatch('keydown',{key:'ArrowLeft'});assert.equal(page(doc),'pages-2');
  hot(doc,'close').click();assert(!passport.isOpen());assert(!host.open);assert.equal(doc.activeElement,trigger);assert.equal(f.returns(),0);assert.equal(trigger.getAttribute('aria-expanded'),'false');
  trigger.click();doc.flushCloseEvents();assert(passport.isOpen());assert.equal(page(doc),'closed');unfold(doc);
  let now=0,frameId=0;const frames=new Map(),realNow=Date.now;Date.now=()=>now;
  const advance=ms=>{now+=ms;const active=[...frames.values()];frames.clear();for(const fn of active)fn();};
  doc.defaultView={innerWidth:852,innerHeight:393,matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)};
  hot(doc,'close').click();assert(passport.isOpen(),'input remains held until the book folds');assert.equal(page(doc),'closed');assert(one(doc,'ww-passport-book').className.includes('is-folding'));
  advance(190);assert.match(art(doc),/data-progress="0.25"/);
  passport.open();assert(passport.isOpen());assert.equal(page(doc),'pages-0','quick reopen restores interrupted spread');assert.match(art(doc),/data-progress="0.75"/,'reopening reverses the existing rigid cover angle');
  hot(doc,'next').click();hot(doc,'next').click();assert.equal(page(doc),'pages-0','repeated turns queue until the physical cover has opened');
  advance(190);assert.equal(page(doc),'pages-1');advance(540);assert.equal(page(doc),'pages-2');advance(135);
  assert.match(art(doc),/data-motion="turning"/);assert.equal(all(doc,'ww-passport-motion').length,0,'one SVG owns geometry, clipping and stacking');
  hot(doc,'close').click();assert.equal(page(doc),'pages-2','close waits for the moving sheet instead of snapping it away');advance(405);assert.equal(page(doc),'closed');advance(760);
  await new Promise(resolve=>setTimeout(resolve,810));assert(!passport.isOpen());assert.equal(doc.activeElement,trigger);Date.now=realNow;
  assert.equal(JSON.stringify(progress),before);passport.dispose();assert(trigger.isConnected);assert(helpContent.isConnected);assert(helpContent.hidden);assert.equal(trigger.onclick,null);
}
console.log('PASS passport: actual-photo callback and explicit pending state, no country navigation, sequential independent visa sheets, expandable country sequence, bounded legacy records/notes, read-only saves, retained live source callbacks, touch/keyboard and interrupted modal focus');
