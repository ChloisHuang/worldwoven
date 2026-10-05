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
export function travelPassportView(progress={},clock={}) {
  const visited=new Set(uniqueStrings(progress?.visited));
  const regions=PASSPORT_REGIONS.map(r=>({...r,visited:visited.has(r.id),activities:uniqueStrings(progress?.stamps?.[r.id]).map(id=>({id,label:Object.hasOwn(ACTIVITIES,id)?ACTIVITIES[id]:'往日活动纪念',legacy:!Object.hasOwn(ACTIVITIES,id)}))}));
  const validClock=Number.isSafeInteger(clock?.day)&&clock.day>=0&&Number.isFinite(clock.hour)&&clock.hour>=0&&clock.hour<24;
  const minutes=validClock?Math.floor(clock.hour*60):0;
  return {nickname:cleanName(progress?.nickname)||'旅居者',regions,visitedCount:regions.filter(r=>r.visited).length,
    activityCount:regions.reduce((n,r)=>n+r.activities.length,0),
    clockLabel:validClock?`游戏第 ${clock.day+1} 日 · ${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`:'游戏时刻暂未记录'};
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
const color=(n,fallback)=>Number.isInteger(n)&&n>=0&&n<=0xffffff?'#'+n.toString(16).padStart(6,'0'):fallback;
function portraitSVG(look={}) {
  const skin=color(look?.skin,'#d8a680'),hair=color(look?.hair,'#3b3230'),eyes=color(look?.eyeColor,'#34444a'),shirt=color(look?.clothes,'#5c9198');
  // Reuse the HUD's illustrated portrait language and the saved character's
  // palette, with hair silhouettes corresponding to its appearance record.
  const long=['chin-bob','shoulder-wave','low-bun','braided-tail'].includes(look?.hairStyle);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 76" aria-hidden="true" focusable="false">'+
    `<rect x="1" y="1" width="62" height="74" rx="4" fill="#e5d8b6"/>${long?`<path d="M14 48V25C12 1 52 1 51 25v23z" fill="${hair}"/>`:''}<path d="M6 76c1-22 14-29 26-29s25 7 26 29" fill="${shirt}"/><path d="M24 44h16l-8 12z" fill="${skin}"/><ellipse cx="32" cy="29" rx="16" ry="20" fill="${skin}"/><path d="M15 26C11 7 22 4 33 5s20 10 16 24l-5-9-8-3-7 8-8-7z" fill="${hair}"/><ellipse cx="26" cy="30" rx="2.1" ry="2.8" fill="${eyes}"/><ellipse cx="39" cy="30" rx="2.1" ry="2.8" fill="${eyes}"/><path d="M28 40q5 4 9-1" fill="none" stroke="#a86252" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

export function createTravelPassport({mount,getProgress=()=>({}),getClock=()=>({}),getLook=()=>({}),onOpen=()=>{},onReturn=()=>{},document:doc=globalThis.document}={}) {
  if(!mount)throw TypeError('passport requires a help or travel menu mount');
  const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,cls,label)=>{const b=make('button',text,cls);b.type='button';if(label)b.setAttribute('aria-label',label);return b;};
  const art=(svg,cls)=>{const e=make('div',null,cls);e.setAttribute('aria-hidden','true');e.innerHTML=svg;return e;};
  const style=make('link');style.rel='stylesheet';style.href=STYLE;(doc.head||doc.body).append(style);
  const trigger=button(null,'ww-passport-trigger','打开四方旅行护照');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
  trigger.append(make('span','✦','ww-passport-trigger-icon'),make('strong','旅行护照'),make('span','收好沿途的印记 →','ww-passport-trigger-hint'));
  const instructions=mount.querySelector?.('ul');if(instructions)mount.insertBefore(trigger,instructions);else mount.append(trigger);
  let ui=null,opened=false,disposed=false,restoreHost=false,priorFocus=null,page='cover',activityLimit=24;
  function ensureUI(){
    if(ui)return;
    const dialog=make('dialog',null,'ww-passport-dialog');dialog.setAttribute('aria-label','四方旅行护照 · 游戏旅行册');
    const header=make('header',null,'ww-passport-header'),title=make('div'),closeButton=button('×','ww-passport-close','收好护照，返回帮助');
    title.append(make('span','WORLDWOVEN · 旅人随身册','ww-passport-eyebrow'),make('h2','四方旅行护照'));header.append(title,closeButton);
    const body=make('div',null,'ww-passport-body');body.tabIndex=0;body.setAttribute('aria-label','滚动阅读护照');
    const nav=make('nav',null,'ww-passport-nav');nav.setAttribute('aria-label','护照书签');
    const tabs=new Map();for(const p of [{id:'cover',country:'旅人页'},...PASSPORT_REGIONS]){const b=button(p.country,'ww-passport-tab');b.dataset.page=p.id;b.onclick=()=>{page=p.id;activityLimit=24;render();ui.body.scrollTop=0;};nav.append(b);tabs.set(p.id,b);}
    const note=make('p','四方生活中的原创游戏旅行册','ww-passport-fiction');dialog.append(header,body,nav,note);doc.body.append(dialog);
    ui={dialog,closeButton,body,tabs};closeButton.onclick=close;
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('close',()=>{if(!dialog.open)finishClose();});
    let backdropPointer=false;dialog.addEventListener('pointerdown',e=>{backdropPointer=e.target===dialog;});
    dialog.addEventListener('pointercancel',()=>{backdropPointer=false;});
    dialog.addEventListener('click',e=>{const dismiss=backdropPointer&&e.target===dialog;backdropPointer=false;if(dismiss)close();});
  }
  function render(){
    const view=travelPassportView(getProgress(),getClock());ui.body.replaceChildren();
    for(const [id,b]of ui.tabs){b.setAttribute('aria-current',id===page?'page':'false');}
    if(page==='cover'){
      const cover=make('section',null,'ww-passport-cover');cover.append(make('span','四 方 生 活','ww-passport-cover-brand'),art(COVER,'ww-passport-cover-art'),make('h3','旅行护照'),make('span','WANDER · NOTICE · REMEMBER','ww-passport-cover-latin'),make('span','万千日常，装进一本小书','ww-passport-cover-motto'));
      const holder=make('section',null,'ww-passport-holder'),identity=make('div',null,'ww-passport-identity'),portrait=art(portraitSVG(getLook()),'ww-passport-portrait');
      portrait.removeAttribute('aria-hidden');portrait.setAttribute('role','img');portrait.setAttribute('aria-label','沿用游戏角色配色的小像');
      const name=make('div');name.append(make('span','游戏称呼','ww-passport-eyebrow'),make('h3',view.nickname),make('span','四方之间，自在旅居','ww-passport-holder-caption'));identity.append(portrait,name);
      holder.append(make('span','TRAVELER’S NOTEBOOK','ww-passport-page-kicker'),identity,make('p','把走过的地方、做过的小事，轻轻盖在这里。','ww-passport-intro'));
      const totals=make('div',null,'ww-passport-totals');totals.append(make('strong',`${view.visitedCount} / 4 个地区`),make('span',`${view.activityCount} 枚日常印记`));holder.append(totals);
      const mini=make('div',null,'ww-passport-region-grid');for(const r of view.regions){const b=button(null,`ww-passport-region-link${r.visited?' is-visited':''}`,`翻到${r.country}，${r.visited?'已到访':'未到访'}`);b.style.setProperty('--stamp-ink',r.ink);b.append(art(travelStampSVG(r.id),'ww-passport-mini-art'),make('span',r.country),make('small',r.visited?'已到访':'待启程'));b.onclick=()=>{page=r.id;activityLimit=24;render();ui.body.scrollTop=0;ui.tabs.get(r.id).focus({preventScroll:true});};mini.append(b);}holder.append(mini);
      holder.append(make('p',`翻阅时：${view.clockLabel}`,'ww-passport-clock'),make('p','旧旅程的到访日期没有留下记录，印记仍在。','ww-passport-date-note'));
      ui.body.append(cover,holder);
    }else{
      const r=view.regions.find(r=>r.id===page),hero=make('section',null,`ww-passport-region-page${r.visited?' is-visited':''}`);hero.style.setProperty('--stamp-ink',r.ink);hero.style.setProperty('--stamp-tilt',r.tilt);
      hero.append(make('span',r.en,'ww-passport-page-kicker'),make('h3',r.place),make('span',r.country,'ww-passport-country'),art(travelStampSVG(r.id),'ww-passport-stamp-art'),make('strong',r.visited?'已盖章 · 到访留念':'留白 · 等你来盖章','ww-passport-visit-status'),make('span',r.motif,'ww-passport-motif'),make('p',r.visited?'到访日期 · 未记录':'下一程，可以从这里开始','ww-passport-date-note'));
      const journal=make('section',null,'ww-passport-journal');journal.append(make('span','COLLECT LITTLE MOMENTS','ww-passport-page-kicker'),make('h3','日常印记'),make('p',`${r.activities.length} 枚已收集`,'ww-passport-count'));
      const list=make('ul',null,'ww-passport-activities');list.style.setProperty('--stamp-ink',r.ink);
      for(const a of r.activities.slice(0,activityLimit)){const li=make('li',null,'ww-passport-activity');li.dataset.activity=a.id;const check=make('span','✦','ww-passport-activity-seal');check.setAttribute('aria-hidden','true');const text=make('div');text.append(make('strong',a.label));if(a.legacy)text.append(make('small','较早旅程留下的印记'));li.append(check,text);list.append(li);}
      if(!r.activities.length)journal.append(make('p','这一页还留着空白。\n去体验当地的小日常，完成后就会留下印记。','ww-passport-empty'));
      else journal.append(list);
      if(r.activities.length>activityLimit){const more=button('翻看更多印记','ww-passport-more');more.onclick=()=>{const top=ui.body.scrollTop;activityLimit+=24;render();ui.body.scrollTop=top;ui.body.focus({preventScroll:true});};journal.append(more);}
      journal.append(make('p','这里收藏已完成的活动，不记录重复次数或日期。','ww-passport-date-note'));ui.body.append(hero,journal);
    }
  }
  function open(){
    if(disposed||opened)return;ensureUI();priorFocus=doc.activeElement;restoreHost=mount.tagName==='DIALOG'&&mount.open;
    if(restoreHost)mount.close();onOpen();page='cover';activityLimit=24;render();ui.body.scrollTop=0;
    ui.dialog.showModal();opened=true;trigger.setAttribute('aria-expanded','true');ui.closeButton.focus({preventScroll:true});
  }
  function finishClose(){
    if(!opened)return;opened=false;trigger.setAttribute('aria-expanded','false');
    if(disposed)return;
    if(restoreHost&&mount.isConnected){onReturn();if(!mount.open)mount.showModal();trigger.focus({preventScroll:true});}
    else if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});
    restoreHost=false;
  }
  function close(){if(ui?.dialog.open){ui.dialog.close();finishClose();}}
  trigger.onclick=open;
  return {open,close,isOpen:()=>!!ui?.dialog.open,refresh(){if(opened)render();},
    dispose(){if(disposed)return;disposed=true;close();trigger.remove();ui?.dialog.remove();style.remove();}};
}
