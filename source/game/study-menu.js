import {studyOptions, studyLesson, studySkillProgress, studyJobLinks, STUDY_SKILL_NAMES} from './study-lessons.js';

// One temporary dialog belongs to the existing station interaction. Browsing
// never allocates a ticket, grants progress, or creates a second control HUD.
export function createStudyMenu({careers,getClock,onOpen=()=>{},onClose=()=>{},onChoose=()=>{},document:doc=globalThis.document}) {
 const make=(tag,text,cls)=>{const el=doc.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
 const dialog=make('dialog',null,'study-dialog'),style=make('style');
 dialog.setAttribute('aria-label','选择书目与学习技能');
 style.textContent='.study-dialog{box-sizing:border-box;position:fixed;inset:0;margin:auto;width:min(470px,calc(100vw - max(24px,env(safe-area-inset-left)) - max(24px,env(safe-area-inset-right))));max-height:calc(100dvh - max(14px,env(safe-area-inset-top)) - max(14px,env(safe-area-inset-bottom)));overflow:auto;overscroll-behavior:contain;border:1px solid #baa476;border-radius:16px;padding:18px;background:#f5efde;color:#3e4d44}.study-dialog::backdrop{background:#253d3866}.study-dialog h2{margin:0 42px 5px 0;font-size:20px}.study-dialog h3{font-size:15px;margin:12px 0 5px}.study-dialog p{font-size:13px;line-height:1.5;margin:7px 0}.study-dialog button{min-height:44px;border:1px solid transparent;border-radius:9px;padding:9px 12px;background:#e1dfcc;color:#344d44;font:inherit;cursor:pointer}.study-dialog button:focus-visible{outline:3px solid #3e7763;outline-offset:2px}.study-dialog .study-close{position:absolute;right:9px;top:7px;background:transparent;font-size:24px}.study-options{display:grid;gap:6px;margin:12px 0}.study-option{text-align:left;width:100%}.study-option strong,.study-option small{display:block;overflow-wrap:anywhere}.study-option small{font-size:12px;margin-top:4px}.study-option[aria-pressed=true]{border-color:#3d6659;background:#d4e1d3}.study-detail{border-top:1px solid #d2c5a8;padding-top:2px}.study-actions{position:sticky;bottom:-18px;background:#f5efde;display:flex;gap:8px;flex-wrap:wrap;padding:10px 0 4px}.study-actions .study-start{flex:1;background:#3d6659;color:#fff9e7}.study-dialog button:disabled{opacity:.5;cursor:default}@media(max-height:500px){.study-dialog{padding:12px 16px}.study-dialog h2{font-size:18px}.study-dialog p{margin:5px 0}.study-options{gap:4px;margin:8px 0}.study-option{padding:7px 10px!important}.study-actions{bottom:-12px}.study-dialog h3{margin-top:8px}}';
 (doc.head||doc.body).append(style);doc.body.append(dialog);
 let station=null,selected=null,generation=0,signature='';
 const close=()=>{generation++;station=null;selected=null;if(dialog.open){dialog.close();onClose();}};
 const button=(title,run)=>{const b=make('button',title);b.type='button';b.onclick=run;return b;};
 function render(){
  if(!station)return;
  const state=careers.state(),day=getClock().day,options=studyOptions(station.id),lesson=studyLesson(station.id,selected);
  if(!lesson){close();return;}
  const token=++generation;signature=`${state.revision}:${day}`;
  const fresh=()=>dialog.open&&token===generation;
  dialog.replaceChildren();
  const x=button('×',close);x.className='study-close';x.setAttribute('aria-label','关闭学习菜单');
  dialog.append(x,make('h2',lesson.action==='read'?'今天想读什么？':'选择练习主题'),make('p',station.name));
  const list=make('div',null,'study-options');
  for(const option of options){
   const p=studySkillProgress(state,option.skill,day),b=button(null,()=>{if(!fresh())return;selected=option.id;render();});
   b.className='study-option';b.setAttribute('aria-pressed',option.id===selected);
   b.append(make('strong',option.title),make('small',`${STUDY_SKILL_NAMES[option.skill]} Lv.${p.level} · 今日还可获得 ${p.remaining}/4 经验`));list.append(b);
  }
  dialog.append(list);
  const progress=studySkillProgress(state,lesson.skill,day),detail=make('div',null,'study-detail');
  detail.append(make('h3',`学习目标 · ${STUDY_SKILL_NAMES[lesson.skill]}`),make('p',lesson.description),
   make('p',`当前 Lv.${progress.level} · ${progress.capped?'已到当前技能上限':'下一等级 0/1 经验'}。${progress.canGain?`完整${lesson.verb} ${lesson.seconds} 秒：经验 +1，升至 Lv.${progress.level+1}。`:progress.capped?'本次可继续练习，但不再增加经验。':'今日该技能经验已满，本次不再增加经验。'}`),
   make('p',`相关职位 · ${studyJobLinks(careers,lesson.skill)}`),make('p','开始后可用 E、移动或取消中断；未完成不计经验。'));
  if(lesson.excerpt)detail.append(make('p',`书页摘录 · ${lesson.excerpt}`));
  if(state.loadError)detail.append(make('p','学习记录暂时无法核对，请保留存档后重试。'));
  dialog.append(detail);
  const actions=make('div',null,'study-actions'),start=button(`开始${lesson.verb} · ${lesson.seconds}秒`,()=>{
   if(!fresh())return;
   const target=station,id=selected;close();onChoose(target,id);
  });
  start.className='study-start';start.disabled=!!state.loadError;
  actions.append(button('暂时不学',close),start);dialog.append(actions);
 }
 function open(target){if(!studyOptions(target?.id).length)return false;onOpen();station=target;selected=studyOptions(target.id)[0].id;render();if(!dialog.open)dialog.showModal();return true;}
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 return {open,close,isOpen:()=>!!dialog.open,update(){if(dialog.open&&signature!==`${careers.state().revision}:${getClock().day}`)render();},dispose(){close();dialog.remove();style.remove();}};
}
