import {buildPassportSpreads,renderPassportBook,renderPassportMotion} from './travel-passport-art.js';
import {travelJourneyView} from './travel-journey.js';
// A fictional, read-only travel booklet. Existing progress is the only source
// of earned marks; visiting or opening this UI never writes a date or a stamp.
const STYLE = new URL('./travel-passport.css', import.meta.url).href;
export const PASSPORT_REGIONS = Object.freeze([
  {id:'japan',country:'日本',place:'云隐汤馆',en:'CLOUD & BLOSSOM',ink:'#a25569',motif:'落樱 · 汤烟',tilt:'-4deg'},
  {id:'china',country:'中国',place:'承光宫苑',en:'GARDENS OF LIGHT',ink:'#3d796f',motif:'飞檐 · 莲叶',tilt:'3deg'},
  {id:'egypt',country:'埃及',place:'沙海金字塔',en:'SAND & STARLIGHT',ink:'#a37732',motif:'沙丘 · 星河',tilt:'-3deg'},
  {id:'france',country:'法国',place:'白鸢王宫',en:'PALACE IN BLOOM',ink:'#646f9b',motif:'鸢尾 · 花窗',tilt:'4deg'},
].map(Object.freeze));
const ACTIVITIES = Object.freeze({
  'jp-omamori':'欣赏御守绳结与刺绣','jp-welcome':'领取浴衣与钥匙','jp-onsen':'欣赏温泉水景','jp-women-onsen':'观赏温泉与山纹屏风',
  'jp-sushi':'回转寿司时光','jp-ramen':'拉面屋台小憩','jp-rest':'整理榻榻米寝具','jp-tea':'方形暖桌时光','jp-incense':'整理香草浴包',
  'jp-steam':'检查蒸汽仪表','jp-balcony':'眺望汤屋庭园','jp-garden-onsen':'照看锦鲤与水草','jp-market-tea':'整理旅途用品','jp-herb-workshop':'清点汤屋补给',
  'jp-flowers':'学习花道','jp-garden':'喂锦鲤',
  'cn-tea':'沏茉莉花茶','cn-calligraphy':'写书法','cn-cooking':'包饺子','cn-rest':'倚窗读书','cn-garden':'观鱼赏荷',
  'egypt-sphinx':'观察狮身人面像','egypt-glyphs':'辨认象形图案','egypt-papyrus':'绘制纸莎草画','egypt-scales':'轻放象征真诚的羽毛',
  'egypt-guardian':'观察黑石守护神像','egypt-burial':'探看石棺与亚麻木乃伊','egypt-stars':'寻找天顶星图','egypt-anubis-judgment':'体验羽毛与心的象征仪式',
  'egypt-horus-eye':'辨认眼形护符','egypt-cleopatra-suite':'探索王室起居与寝室','egypt-pharaoh-throne':'走近金色王座与仪式长廊',
  'egypt-royal-reception':'领取探索卷轴','egypt-royal-dining':'摆放面包与彩釉餐盘','egypt-royal-kitchen':'准备陶锅与矿物色餐具','egypt-private-bath':'查看蓝色浴池与更衣器物',
  'egypt-bread':'烘烤传统扁面包','egypt-tea':'泡薄荷茶','egypt-bedroom':'整理亚麻织物','egypt-garden':'照料庭院与喷泉',
  'france-bakery':'烘烤法式面包','france-atelier':'描绘宫苑的光影','france-salon':'翻阅一本诗集','france-bedroom':'整理刺绣床品','france-cafe':'享用宫苑下午茶',
});
const cleanName = value => typeof value === 'string' ? [...value.replace(/[\u0000-\u001f\u007f-\u009f]/g,'').trim()].slice(0,24).join('') : '';
const uniqueStrings = value => Array.isArray(value) ? [...new Set(value.filter(x=>typeof x==='string'&&x.length>0&&x.length<=160))] : [];
const gameDate = ({day,hour}) => {const minutes=Math.floor(hour*60);return `游戏第 ${day+1} 日 · ${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;};
export function travelPassportView(progress={},clock={}) {
  const visited=new Set(uniqueStrings(progress?.visited));
  // Only the validated journey ledger supplies dated entry/exit seals. Legacy
  // visits and activity marks retain their independent, unknown-date meaning.
  const journey=travelJourneyView(progress?.travelJourney),country=id=>PASSPORT_REGIONS.find(r=>r.id===id)?.country||'启程地未记录';
  const journeyNumbers=new Map(journey.journeys.map((j,i)=>[j.id,i+1]));
  const travelStamps=journey.stamps.map(s=>({...s,dateLabel:gameDate(s),journeyLabel:`旅程 ${journeyNumbers.get(s.journeyId)}`,routeLabel:`${country(s.from)} → ${country(s.to)}`}));
  const regions=PASSPORT_REGIONS.map(r=>({...r,visited:visited.has(r.id),travelStamps:travelStamps.filter(s=>s.regionId===r.id),activities:uniqueStrings(progress?.stamps?.[r.id]).map(id=>({id,label:Object.hasOwn(ACTIVITIES,id)?ACTIVITIES[id]:'往日活动纪念',legacy:!Object.hasOwn(ACTIVITIES,id)}))}));
  const validClock=Number.isSafeInteger(clock?.day)&&clock.day>=0&&Number.isFinite(clock.hour)&&clock.hour>=0&&clock.hour<24;
  return {nickname:cleanName(progress?.nickname)||'旅居者',regions,visitedCount:regions.filter(r=>r.visited).length,
    activityCount:regions.reduce((n,r)=>n+r.activities.length,0),travelStampCount:travelStamps.length,travelLoadError:journey.loadError,
    clockLabel:validClock?gameDate(clock):'游戏时刻暂未记录'};
}
const SVG_HEAD='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
const STAMPS={
  japan:'<circle cx="80" cy="80" r="67"/><circle cx="80" cy="80" r="61" stroke-dasharray="1 6"/><path d="M36 106q44 16 88 0M41 98q39 12 78 0M49 86q31 8 62 0l-5 17H54zM63 77c-11-14 10-15 0-28m17 28c-11-14 10-15 0-28m17 28c-11-14 10-15 0-28"/><path d="M47 42c-7-14-19-6-12 3-17-2-16 12-3 12-9 12 3 20 10 8 5 15 18 7 10-5 16 0 17-13 2-14 6-12-5-20-7-4z" stroke-width="1.7"/><path d="M107 39l8 5m4-2-1 9m-5 9 7 2M51 121q28 8 58-1"/>',
  china:'<rect x="17" y="17" width="126" height="126" rx="22" transform="rotate(-3 80 80)"/><rect x="23" y="23" width="114" height="114" rx="18" stroke-dasharray="2 5"/><path d="M37 75q24-6 43-33 19 27 43 33H37zm9 7h68M51 82v29m58-29v29M66 82v26m28-26v26M43 111h74M74 43h12M42 72l-8-4m84 4 8-4"/><path d="M65 118q15-22 30 0-15 10-30 0zm15 4v7M57 121q5 8 13 6m21 0q8 0 13-6" stroke-width="1.6"/>',
  egypt:'<path d="M80 10l58 35v70l-58 35-58-35V45zM80 18l51 31v62l-51 31-51-31V49z"/><path d="M40 106l30-45 31 45H40zm30-45 7 45m11 0 18-29 19 29M39 115q18-8 39 0t43 0M45 123q26-6 51 3"/><circle cx="105" cy="49" r="9"/><path d="M52 41v12m-6-6h12m23-13v9m-4-4h8m31 24v9m-4-4h8" stroke-width="1.7"/>',
  france:'<path d="M80 11c14 0 14 10 27 12s21 2 26 14-3 16 2 29 11 18 4 30-16 10-23 20-7 21-21 23-17-8-30-7-20 6-30-4-4-18-10-29-17-14-14-28 13-14 19-25 4-21 17-26 20 2 33-9z"/><ellipse cx="80" cy="78" rx="49" ry="52" stroke-dasharray="2 5"/><path d="M80 115V63m0 24c-33-1-38-26-23-32 8 5 12 16 23 21m0 11c33-1 38-26 23-32-8 5-12 16-23 21m0-4c-17-13-9-31 0-39 9 8 17 26 0 39M58 95q22 5 44 0M68 112q12-7 24 0M51 111q-18-12-13-28m71 28q18-12 13-28"/>',
};
export function travelStampSVG(region){return SVG_HEAD+(STAMPS[region]||'')+'</svg>';}
const COVER=SVG_HEAD+'<circle cx="80" cy="80" r="59"/><circle cx="80" cy="80" r="51" stroke-dasharray="1 6"/><path d="M80 24v112M24 80h112" stroke-width="1.2"/><path d="M80 40q23 19 0 40-23-21 0-40zm40 40q-19 23-40 0 21-23 40 0zm-40 40q-23-19 0-40 23 21 0 40zm-40-40q19-23 40 0-21 23-40 0z"/><path d="M80 62l6 12 14 6-14 6-6 14-6-14-14-6 14-6z"/><circle cx="80" cy="80" r="5"/><path d="M43 37l5 7m64 72 5 7m6-80-7 5M44 112l-7 5"/>'+ '</svg>';
export function travelPassportCoverSVG(){return COVER;}
// The original help nodes remain connected: main.js can keep refreshing the
// court summary and adding references. Their text is typeset into paper pages.
export function passportHelpBlocks(root){
  const blocks=[];
  function visit(node){
    if(node!==root&&node.hidden)return;
    const tag=node.tagName,id=node.id||node.getAttribute?.('id');
    if(tag==='A'){
      const href=node.href||node.getAttribute?.('href');
      blocks.push({text:node.textContent.trim(),...(href?{href}: {})});return;
    }
    if(['P','LI','H3','SUMMARY'].includes(tag)){
      const value=node.textContent.trim();if(value)blocks.push({text:value,...(['H3','SUMMARY'].includes(tag)?{kind:'heading'}:{})});return;
    }
    if(id==='references'||node===root||['UL','OL','DETAILS','DIV','SECTION'].includes(tag))for(const child of node.children||[])visit(child);
  }
  if(root)visit(root);return blocks;
}

export function createTravelPassport({mount,trigger:externalTrigger,helpContent,onHelp=()=>{},getProgress=()=>({}),getClock=()=>({}),getPortrait=()=>null,onOpen=()=>{},onReturn=()=>{},onClose=()=>{},document:doc=globalThis.document}={}){
  if(!mount&&!externalTrigger)throw TypeError('passport requires a trigger or menu mount');
  const make=(tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;};
  const button=(label,cls)=>{const b=make('button',cls);b.type='button';b.setAttribute('aria-label',label);return b;};
  const style=make('link');style.rel='stylesheet';style.href=STYLE;(doc.head||doc.body).append(style);
  const trigger=externalTrigger||button('打开四方旅行护照','ww-passport-trigger');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
  if(!externalTrigger){trigger.append(make('span','ww-passport-trigger-icon','✦'),make('strong',null,'旅行护照'));const list=mount.querySelector?.('ul');if(list)mount.insertBefore(trigger,list);else mount.append(trigger);}
  const stamps=Object.fromEntries(PASSPORT_REGIONS.map(r=>[r.id,travelStampSVG(r.id)]));
  const reducedMotion=()=>doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches??true;
  const compact=()=>{const win=doc.defaultView;return !!(win?.innerWidth&&win?.innerHeight&&win.innerWidth/win.innerHeight<.8);};
  let ui=null,opened=false,disposed=false,restoreHost=false,priorFocus=null,current='closed',spreads=[],closing=false,closingFrom='closed',closeTimer=null,motionTimer=null,motionState=null,pendingTurn=null,pendingSteps=[],pendingClose=false;
  const stopFrame=()=>{if(motionTimer!==null){if(doc.defaultView?.cancelAnimationFrame)doc.defaultView.cancelAnimationFrame(motionTimer);else clearTimeout(motionTimer);motionTimer=null;}};
  const cancelMotion=()=>{stopFrame();motionState=null;pendingTurn=null;pendingSteps=[];pendingClose=false;if(ui){ui.book.className='ww-passport-book';if(ui.scene)ui.art.innerHTML=ui.scene.svg;}};
  const cancelClose=()=>{if(closeTimer!==null){clearTimeout(closeTimer);closeTimer=null;}closing=false;};
  function focusAction(action,value){const el=ui.buttons.find(b=>b.dataset.action===action&&(value==null||b.dataset.value===value));el?.focus({preventScroll:true});}
  function animateBook(from,to,kind,direction='forward',startProgress=0){
    stopFrame();motionState=null;if(reducedMotion()){ui.art.innerHTML=to.svg;return;}
    const duration=kind==='turning'?540:760,start=Date.now()-duration*startProgress;
    const state={from,to,kind,direction,progress:startProgress};motionState=state;
    ui.book.className='ww-passport-book is-'+kind;
    function frame(){
      if(motionState!==state)return;
      const progress=Math.min(1,(Date.now()-start)/duration);state.progress=progress;
      ui.art.innerHTML=renderPassportMotion({from,to,kind,direction,progress});
      if(progress<1){motionTimer=doc.defaultView?.requestAnimationFrame?doc.defaultView.requestAnimationFrame(frame):setTimeout(frame,16);return;}
      motionTimer=null;motionState=null;ui.book.className='ww-passport-book';
      if(pendingClose){pendingClose=false;requestClose();}
      else if(pendingTurn){const next=pendingTurn;pendingTurn=null;turnTo(...next);}
      else if(pendingSteps.length)turnBy(pendingSteps.shift());
    }
    // The old surface is the first visible frame. Destination ink never gets
    // painted as an uncovered static spread before the physical turn starts.
    ui.art.innerHTML=renderPassportMotion({from,to,kind,direction,progress:startProgress});
    motionTimer=doc.defaultView?.requestAnimationFrame?doc.defaultView.requestAnimationFrame(frame):setTimeout(frame,16);
  }
  function render(){
    const view=travelPassportView(getProgress(),getClock()),isCompact=compact();
    spreads=buildPassportSpreads(view,passportHelpBlocks(helpContent),isCompact);
    if(current!=='closed'&&!spreads.some(p=>p.id===current))current=spreads[0].id;
    const index=spreads.findIndex(p=>p.id===current),spread=index<0?null:spreads[index];
    let portrait=null;if(spread&&(spread.left.type==='identity'||spread.right.type==='identity')){try{portrait=getPortrait();}catch{portrait=null;}}
    const scene=renderPassportBook({view,portrait,stamps,cover:COVER,spread,index:Math.max(index,0),count:spreads.length,compact:isCompact});
    ui.dialog.dataset.layout=isCompact?'portrait':'landscape';ui.dialog.dataset.page=current;
    ui.scene=scene;ui.art.innerHTML=scene.svg;ui.transcript.textContent=scene.transcript;ui.controls.replaceChildren();ui.buttons=[];
    for(const hot of scene.hotspots){
      const el=hot.action==='link'?make('a','ww-passport-hotspot'):button(hot.label,'ww-passport-hotspot');
      el.dataset.action=hot.action;if(hot.value)el.dataset.value=hot.value;
      el.setAttribute('aria-label',hot.label);if(hot.current)el.setAttribute('aria-current','page');
      if(hot.action==='link'){el.href=hot.href;el.target='_blank';el.rel='noopener';el.onclick=e=>{if(motionState)e.preventDefault();};el.append(make('span','ww-passport-sr',hot.label));}
      else el.onclick=()=>act(hot.action,hot.value);
      el.style.left=`min(${hot.x/scene.width*100}%, calc(100% - 44px))`;el.style.top=`min(${hot.y/scene.height*100}%, calc(100% - 44px))`;el.style.width=(hot.w/scene.width*100)+'%';el.style.height=(hot.h/scene.height*100)+'%';
      ui.controls.append(el);ui.buttons.push(el);
    }
  }
  function turnTo(id,focus='next',focusValue){
    if(!opened||closing||id===current)return;
    if(motionState){pendingTurn=[id,focus,focusValue];return;}
    const old=current,oldIndex=spreads.findIndex(p=>p.id===old),oldScene=ui.scene;
    current=id;if(spreads.find(p=>p.id===id)?.hasNotes)onHelp();render();
    animateBook(oldScene,ui.scene,id==='closed'?'folding':old==='closed'?'unfolding':'turning',spreads.findIndex(p=>p.id===id)>oldIndex?'forward':'back');
    focusAction(id==='closed'?'open':focus,focusValue);
  }
  function turnBy(delta){
    if(motionState&&!closing){if(pendingSteps.length<8)pendingSteps.push(delta);return;}
    if(current==='closed'){if(delta>0)turnTo(spreads[0].id);return;}
    const index=spreads.findIndex(p=>p.id===current),next=spreads[index+delta];turnTo(next?.id||'closed',delta>0?'next':'previous');
  }
  function act(action,value){
    if(closing)return;
    if(action==='close')requestClose();
    else if(action==='open')turnTo(spreads[0].id);
    else if(action==='previous')turnBy(-1);
    else if(action==='next')turnBy(1);

  }
  function ensureUI(){
    if(ui)return;
    const dialog=make('dialog','ww-passport-dialog');dialog.setAttribute('aria-label','四方旅行护照 · 游戏旅行册');
    const book=make('div','ww-passport-book'),art=make('div','ww-passport-art'),controls=make('div','ww-passport-controls'),transcript=make('p','ww-passport-sr');
    art.setAttribute('aria-hidden','true');transcript.setAttribute('aria-live','polite');
    book.append(art,controls,transcript);dialog.append(book);if(helpContent){helpContent.hidden=true;dialog.append(helpContent);}doc.body.append(dialog);
    ui={dialog,book,art,controls,transcript,buttons:[],scene:null};
    let swipe=null;
    book.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||e.target.closest?.('button,a'))return;swipe={x:e.clientX,y:e.clientY};});
    book.addEventListener('pointercancel',()=>{swipe=null;});
    book.addEventListener('pointerup',e=>{const start=swipe;swipe=null;if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.7)turnBy(dx<0?1:-1);});
    dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();turnBy(e.key==='ArrowRight'?1:-1);}});
    dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
    dialog.addEventListener('close',()=>{if(!dialog.open)finishClose();});
    let backdropPointer=false;
    dialog.addEventListener('pointerdown',e=>{backdropPointer=e.target===dialog;});
    dialog.addEventListener('pointercancel',()=>{backdropPointer=false;});
    dialog.addEventListener('click',e=>{const dismiss=backdropPointer&&e.target===dialog;backdropPointer=false;if(dismiss)requestClose();});
    doc.defaultView?.addEventListener?.('resize',resize);
  }
  function resize(){if(opened){const active=doc.activeElement,action=active?.dataset?.action,value=active?.dataset?.value;cancelMotion();render();if(action)focusAction(action,value);}}
  function open(){
    if(disposed)return;
    if(opened){if(closing){const prior=motionState;cancelClose();stopFrame();motionState=null;pendingClose=false;pendingTurn=null;pendingSteps=[];current=closingFrom;render();if(prior?.kind==='folding')animateBook(prior.to,ui.scene,'unfolding','forward',1-prior.progress);else ui.book.className='ww-passport-book';focusAction(current==='closed'?'open':'close');}return;}
    ensureUI();priorFocus=doc.activeElement;restoreHost=mount?.tagName==='DIALOG'&&mount.open;
    if(restoreHost)mount.close();onOpen();current='closed';render();ui.dialog.showModal();opened=true;trigger.setAttribute('aria-expanded','true');focusAction('open');
  }
  function finishClose(){
    cancelClose();cancelMotion();if(!opened)return;opened=false;trigger.setAttribute('aria-expanded','false');
    if(disposed)return;
    if(restoreHost&&mount.isConnected){onReturn();if(!mount.open)mount.showModal();trigger.focus({preventScroll:true});}
    else if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});
    restoreHost=false;onClose();
  }
  function requestClose(){
    if(!opened||closing)return;
    if(motionState){pendingTurn=null;pendingSteps=[];pendingClose=true;return;}
    closingFrom=current;
    if(reducedMotion()){close();return;}
    closing=true;const oldScene=ui.scene;
    if(current!=='closed'){current='closed';render();animateBook(oldScene,ui.scene,'folding');closeTimer=setTimeout(close,780);}
    else{cancelMotion();ui.book.className='ww-passport-book is-putting-away';closeTimer=setTimeout(close,230);}
  }
  function close(){cancelClose();cancelMotion();if(ui?.dialog.open){ui.dialog.close();finishClose();}}
  trigger.onclick=open;
  return {open,close,isOpen:()=>!!ui?.dialog.open,refresh(){if(opened){if(spreads.find(p=>p.id===current)?.hasNotes)onHelp();resize();}},
    dispose(){if(disposed)return;disposed=true;close();trigger.onclick=null;if(!externalTrigger)trigger.remove();if(helpContent){helpContent.hidden=true;doc.body.append(helpContent);}doc.defaultView?.removeEventListener?.('resize',resize);ui?.dialog.remove();style.remove();}};
}
