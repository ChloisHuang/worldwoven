import {studyOptions,studyCountry,studySkillProgress,studyJobLinks,STUDY_SKILL_NAMES} from './study-lessons.js';
import {STUDY_STYLE,studyIcon} from './study-theme.js';

// Browsing never allocates a ticket or grants progress. The chosen local book
// returns through the existing physical station and witnessed-completion path.
export function createStudyMenu({careers,getClock,getCountry=()=>null,onOpen=()=>{},onClose=()=>{},onChoose=()=>{},document:doc=globalThis.document}) {
 const make=(tag,text,cls)=>{const el=doc.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
 const dialog=make('dialog',null,'study-dialog ww-airy-theme'),style=make('style');
 dialog.setAttribute('aria-label','选择书目与学习技能');style.textContent=STUDY_STYLE;
 (doc.head||doc.body).append(style);doc.body.append(dialog);
 let station=null,selected=null,generation=0,signature='';
 const close=()=>{generation++;station=null;selected=null;if(dialog.open){dialog.close();onClose();}};
 const button=(title,run)=>{const b=make('button',title);b.type='button';b.onclick=run;return b;};
 const icon=skill=>{const el=make('span',null,'study-icon');el.innerHTML=studyIcon(skill);el.setAttribute('aria-hidden','true');return el;};
 const meter=(p,skill)=>{const el=make('span',null,'study-meter'),fill=make('span',null,'study-meter-fill');el.setAttribute('role','progressbar');el.setAttribute('aria-label',`${STUDY_SKILL_NAMES[skill]}升级进度`);el.setAttribute('aria-valuemin',0);el.setAttribute('aria-valuemax',p.required);el.setAttribute('aria-valuenow',p.capped?p.required:p.xp);el.setAttribute('aria-valuetext',p.capped?'已到当前技能上限':`${p.xp} / ${p.required} XP，升至等级 ${p.level+1}`);fill.setAttribute('style',`width:${p.percent}%`);el.append(fill);return el;};
 function render(){
  if(!station)return;
  const state=careers.state(),day=getClock().day,country=getCountry()||studyCountry(station.id),options=studyOptions(station.id,country),lesson=options.find(option=>option.id===selected);
  if(!lesson){close();return;}
  const token=++generation;signature=`${state.revision}:${day}:${country}`;
  const fresh=()=>dialog.open&&token===generation&&(!getCountry()||getCountry()===country);
  dialog.replaceChildren();
  const x=button('×',close);x.className='study-close';x.setAttribute('aria-label','关闭学习菜单');
  const heading=make('header',null,'study-heading');heading.append(make('h2',lesson.action==='read'?'书页之间':'研习时光'),make('span',station.name,'study-place'));dialog.append(x,heading);
  const content=make('div',null,'study-content'),list=make('div',null,'study-options');
  for(const option of options){
   const p=studySkillProgress(state,option.skill,day),b=button(null,()=>{if(!fresh())return;selected=option.id;render();});
   b.className='study-option';b.setAttribute('aria-pressed',option.id===selected);
   const copy=make('span',null,'study-option-copy'),meta=make('span',null,'study-option-meta');
   meta.append(make('span',`${STUDY_SKILL_NAMES[option.skill]} Lv.${p.level}`),make('span',p.capped?'已满级':`${p.xp}/${p.required} XP`));
   copy.append(make('strong',option.title.replace(/^《|》$/g,''),'study-option-title'),meta,meter(p,option.skill));b.append(icon(option.skill),copy);list.append(b);
  }
  const p=studySkillProgress(state,lesson.skill,day),detail=make('section',null,'study-detail'),top=make('div',null,'study-detail-top'),level=make('div');
  level.append(make('h3',STUDY_SKILL_NAMES[lesson.skill]),make('div',`Lv.${p.level}`,'study-level'));top.append(icon(lesson.skill),level);detail.append(top);
  const caption=make('div',null,'study-xp-caption');caption.append(make('span',p.capped?'已到当前技能上限':`升级进度 · 前往 Lv.${p.level+1}`),make('span',`${p.xp} / ${p.required} XP`));
  detail.append(caption,meter(p,lesson.skill),make('p',p.canGain?`完整${lesson.verb} ${lesson.seconds} 秒 · +${p.reward} XP`:p.capped?'可继续研习 · 技能已达上限':'今日有效学习次数已用完 · 可继续研习','study-reward'),make('p',lesson.description));
  if(lesson.excerpt)detail.append(make('p',lesson.excerpt,'study-quote'));
  const notes=make('details'),summary=make('summary','学习次数与相关职位');
  notes.append(summary,make('p',`今日还可获得奖励 ${p.remaining} 次（每天最多 4 次）；升级进度会跨日保留。`),make('p',studyJobLinks(careers,lesson.skill,country),'study-jobs'));detail.append(notes);
  if(state.loadError)detail.append(make('p','学习记录暂时无法核对，请保留存档后重试。'));
  content.append(list,detail);dialog.append(content);
  const actions=make('footer',null,'study-actions'),start=button(`开始${lesson.verb} · ${lesson.seconds}秒`,()=>{
   if(!fresh())return;const target=station,id=selected;close();onChoose(target,id);
  }),cancel=button('暂时不学',close);
  start.className='study-start ww-airy-action';start.disabled=!!state.loadError;cancel.className='study-cancel';
  actions.append(make('small','中断不计 XP · E 或移动取消'),cancel,start);dialog.append(actions);
 }
 function open(target){const options=studyOptions(target?.id,getCountry());if(!options.length)return false;onOpen();station=target;selected=options[0].id;render();if(!dialog.open)dialog.showModal();return true;}
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 return {open,close,isOpen:()=>!!dialog.open,update(){if(dialog.open&&signature!==`${careers.state().revision}:${getClock().day}:${getCountry()||studyCountry(station?.id)}`)render();},dispose(){close();dialog.remove();style.remove();}};
}
