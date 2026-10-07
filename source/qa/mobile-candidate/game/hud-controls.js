// Display-only HUD helpers. The action/controller remains the sole owner of
// its timer and cancellation; this module never starts or advances an action.
export function setActionProgress(button,value=null){
 const progress=typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):null;
 const next=progress===null?'':String(Math.round(progress*1000)/1000);
 if(button.dataset.actionProgress===next)return progress;
 button.dataset.actionProgress=next;
 button.style.setProperty('--action-progress',`${progress===null?0:progress*360}deg`);
 button.setAttribute('aria-description',progress===null?'':`当前动作进度 ${Math.floor(progress*100)}%`);
 return progress;
}

export function timedActionProgress(elapsed,total){
 return Number.isFinite(elapsed)&&Number.isFinite(total)&&total>0?Math.max(0,Math.min(1,elapsed/total)):null;
}

const lightIcons={
 night:'<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/><path d="M17 3v4m-2-2h4"/>',
 day:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
};
export function syncHudTools(doc,{overview=false,night=false}={}){
 const view=doc.getElementById('roof-toggle'),light=doc.getElementById('light-toggle');
 view.setAttribute('aria-pressed',String(overview));view.setAttribute('aria-label',overview?'回到人物跟随视角':'俯瞰整个地区');view.title=overview?'回到人物跟随视角':'俯瞰整个地区；再次点击跟随人物';view.lastElementChild.textContent=overview?'跟随':'俯瞰';
 light.setAttribute('aria-pressed',String(night));light.setAttribute('aria-label',night?'切换到白天光照':'切换到夜晚光照');light.title=`${night?'切换到白天':'切换到夜晚'}光照，不改变游戏时间`;light.lastElementChild.textContent=night?'日景':'夜景';
 const svg=light.querySelector('svg');if(svg)svg.innerHTML=lightIcons[night?'day':'night'];
}
