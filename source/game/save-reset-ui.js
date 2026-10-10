import {createSaveReset,MAX_SAVE_BACKUPS} from './save-reset.js';
const messages={unavailable:'请先关闭其他页面，回到世界地图后再操作。','storage-unavailable':'浏览器目前无法持久保存备份，已停止重置。请允许本站存储后重试。','backups-full':`已保留 ${MAX_SAVE_BACKUPS} 份备份。请先下载并明确移除一份旧备份，再重试。`,'backup-failed':'备份未能保存并核验，操作已停止；当前进度未重置。请检查浏览器存储空间。','save-failed':'当前进度未能保存，操作已停止。请检查浏览器存储权限或空间。','invalid-save':'当前存档无法安全读取，未进行重置。','missing-backup':'这份备份已不可用，请重新打开面板。',changed:'存档已发生变化，未继续替换。请刷新页面后重试。','write-failed':'新存档写入失败，已保留原进度和备份。','reload-required':'存储写入中断。备份已保留，请刷新后从本面板恢复。'};
export function createSaveResetUI({trigger,storage,canUse,flush,onOpen=()=>{},onCommit=()=>{},document:doc=globalThis.document}={}){
 const dialog=doc.createElement('dialog');dialog.id='save-reset-dialog';dialog.className='save-reset-dialog';dialog.setAttribute('aria-labelledby','save-reset-title');dialog.setAttribute('aria-describedby','save-reset-description');
 dialog.innerHTML=`<h2 id="save-reset-title">重置存档？</h2><p id="save-reset-description">将重新生成世界与人物，从第一天开始。</p><ul class="save-reset-losses"><li>人物外观与身份、四国居民、亲缘和关系</li><li>钱币、银行、职业、官阶、技能、产权及物品</li><li>故事与任务、旅行和印章、订单与住宿、世界时间和场景进度</li></ul><p class="save-reset-preserved">仅替换当前游戏进度。独立保存的浏览器设置与已有备份保留。</p><p class="save-reset-backup-note">确认后会先保存完整备份并核验，成功才重开。备份留在当前浏览器；换设备或清理本站数据前请下载保管。</p><div class="save-reset-actions"><button type="button" data-action="cancel" autofocus>取消</button><button type="button" class="save-reset-danger" data-action="confirm">备份并重置</button></div><p class="save-reset-status" role="status" aria-live="polite"></p><details class="save-reset-backups"><summary>已有备份与恢复</summary><p>恢复也会先备份当前进度；最多保留 ${MAX_SAVE_BACKUPS} 份。下载文件可在此导入恢复。</p><label class="save-reset-import">导入已下载的备份 <input type="file" accept=".json,application/json" aria-label="选择已下载的四方生活备份"></label><div class="save-reset-backup-list"></div></details>`;
 doc.body.append(dialog);
 const core=createSaveReset({storage,canUse:()=>dialog.open&&canUse(),flush});
 const q=selector=>dialog.querySelector(selector),confirm=q('[data-action="confirm"]'),cancel=q('[data-action="cancel"]'),status=q('.save-reset-status'),list=q('.save-reset-backup-list');
 let action={kind:'reset'},completed=false,openRevision=0;
 const date=row=>new Date(row.createdAt).toLocaleString('zh-CN',{hour12:false});
 function selection(kind='reset',row=null){
  openRevision++;action={kind,id:row?.id,save:row?.save};status.textContent='';
  q('#save-reset-title').textContent=(kind==='restore'||kind==='import')?'恢复这份备份？':kind==='remove'?'移除这份备份？':'重置存档？';
  q('#save-reset-description').textContent=(kind==='restore'||kind==='import')?`将用 ${date(row)} 的${row.reason}备份替换当前进度，并重新载入。当前进度会另存为一份备份。`:kind==='remove'?`将永久移除 ${date(row)} 的${row.reason}备份。请先下载保管；移除后本页无法恢复这一份。当前游戏进度不变。`:'将重新生成世界与人物，从第一天开始。';
  q('.save-reset-losses').hidden=kind!=='reset';q('.save-reset-preserved').hidden=kind==='remove';q('.save-reset-backup-note').hidden=kind==='remove';
  confirm.textContent=(kind==='restore'||kind==='import')?'备份当前进度并恢复':kind==='remove'?'确认移除这份备份':'备份并重置';
  cancel.textContent=kind==='reset'?'取消':'取消操作';cancel.focus();
 }
 function renderBackups(){
  list.replaceChildren();
  try{
   const rows=core.backups();
   if(!rows.length){const empty=doc.createElement('p');empty.textContent='还没有重置备份。';list.append(empty);return;}
   for(const row of [...rows].reverse()){
    const item=doc.createElement('div');item.className='save-reset-backup';
    const label=doc.createElement('span');label.textContent=`${date(row)} · ${row.reason}`;item.append(label);
    for(const [kind,text] of [['restore','恢复'],['download','下载'],['remove','移除']]){
     const button=doc.createElement('button');button.type='button';button.textContent=text;button.dataset.backupAction=kind;
     button.onclick=()=>{
      if(completed||!canUse()){close();return;}
      if(kind!=='download'){selection(kind,row);dialog.scrollTop=0;return;}
      try{
       const current=core.backups().find(value=>value.id===row.id);if(!current)throw new Error('missing');
       const blob=new Blob([JSON.stringify({format:'worldwoven-save-backup-v1',createdAt:current.createdAt,save:JSON.parse(current.save)},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=doc.createElement('a');
       link.href=url;link.download=`worldwoven-backup-${current.createdAt.replace(/[:.]/g,'-')}.json`;doc.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='已发起下载，请确认文件已保存后再移除备份。';
      }catch{status.textContent='备份下载未能开始，请保留这份备份后重试。';}
     };item.append(button);
    }
    list.append(item);
   }
  }catch{status.textContent='旧备份无法读取。为保护它们，重置与恢复已停止。';}
 }
 function open(){
  if(completed||!canUse()||dialog.open)return false;
  onOpen();openRevision++;selection();renderBackups();q('details').open=false;dialog.showModal();cancel.focus();return true;
 }
 function close(){if(completed)return;openRevision++;action={kind:'reset'};if(dialog.open)dialog.close();}
 cancel.onclick=()=>{if(action.kind==='reset')close();else selection();};
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 confirm.onclick=()=>{
  if(completed||core.isBusy()||!dialog.open)return;
  if(!canUse()){close();return;}
  confirm.disabled=true;cancel.disabled=true;
  if(action.kind==='remove'){
   const removed=core.removeBackup(action.id);confirm.disabled=false;cancel.disabled=false;if(removed){close();return;}status.textContent='备份未能移除，请刷新后重试。';return;
  }
  const result=action.kind==='import'?core.restoreFile(action.save):action.kind==='restore'?core.restore(action.id):core.reset();
  if(!result.ok){confirm.disabled=false;cancel.disabled=false;status.textContent=messages[result.code]||'操作未完成，备份会继续保留。';renderBackups();return;}
  completed=true;for(const button of dialog.querySelectorAll('button'))button.disabled=true;
  status.textContent=(action.kind==='restore'||action.kind==='import')?'已备份并恢复，正在重新载入…':'备份已核验，正在打开新世界…';
  onCommit();
 };
 q('input[type="file"]').onchange=async event=>{
  const file=event.target.files?.[0],revision=openRevision;event.target.value='';if(!file||!dialog.open||!canUse())return;
  try{
   if(file.size>20*1024*1024)throw new Error('large');
   const value=JSON.parse(await file.text());
   if(!dialog.open||completed||revision!==openRevision||!canUse())return;
   if(value.format!=='worldwoven-save-backup-v1'||!value.save||!Array.isArray(value.save.visited)||!value.save.stamps||!Number.isFinite(Date.parse(value.createdAt)))throw new Error('format');
   selection('import',{createdAt:value.createdAt,reason:'导入',save:JSON.stringify(value.save)});dialog.scrollTop=0;
  }catch{if(dialog.open&&revision===openRevision)status.textContent='无法读取这份四方生活备份，请选择此前下载的 JSON 文件。';}
 };
 trigger.onclick=open;
 return {open,close,isOpen:()=>dialog.open,update(){if(dialog.open&&!completed&&!canUse())close();},core};
}
