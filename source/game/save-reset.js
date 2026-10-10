/** Recoverable, world-screen-only save replacement. No storage-wide clearing. */
export const WORLD_SAVE_KEY='worlds-days-v1';
export const SAVE_BACKUPS_KEY='worldwoven:save-backups:v1';
export const MAX_SAVE_BACKUPS=3;
const validSave=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Array.isArray(value.visited)&&!!value.stamps&&typeof value.stamps==='object';
export function createSaveReset({storage,canUse=()=>false,flush=()=>true,now=()=>new Date().toISOString()}={}){
 let busy=false,finished=false;
 function backups(){
  const raw=storage.getItem(SAVE_BACKUPS_KEY);
  if(!raw)return [];
  const rows=JSON.parse(raw);
  if(!Array.isArray(rows)||rows.length>MAX_SAVE_BACKUPS||rows.some(row=>!row||typeof row.id!=='string'||typeof row.createdAt!=='string'||typeof row.save!=='string'||!validSave(JSON.parse(row.save))))throw new Error('备份记录无法读取；为保护旧备份，未进行任何覆盖。');
  return rows;
 }
 function writeBackups(rows){const raw=JSON.stringify(rows),result=storage.setItem(SAVE_BACKUPS_KEY,raw);return result!==false&&!result?.then&&storage.getItem(SAVE_BACKUPS_KEY)===raw;}
 function replace({restoreId=null,imported=null}={}){
  if(busy||finished||!canUse())return {ok:false,code:'unavailable'};
  if(!storage.persistent)return {ok:false,code:'storage-unavailable'};
  busy=true;
  try{
   const rows=backups(),target=restoreId?rows.find(row=>row.id===restoreId):null;
   if(imported!==null&&!validSave(JSON.parse(imported)))return {ok:false,code:'invalid-save'};
   if(restoreId&&!target)return {ok:false,code:'missing-backup'};
   if(rows.length>=MAX_SAVE_BACKUPS)return {ok:false,code:'backups-full'};
   if(!canUse()||flush()!==true)return {ok:false,code:'save-failed'};
   const current=storage.getItem(WORLD_SAVE_KEY);
   if(!current||!validSave(JSON.parse(current)))return {ok:false,code:'invalid-save'};
   const createdAt=now(),backup={id:`${createdAt}-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`,createdAt,reason:restoreId||imported!==null?'恢复前':'重置前',save:current};
   // Never remove or silently overwrite the player's sole recovery copy.
   if(!canUse()||!writeBackups([...rows,backup]))return {ok:false,code:'backup-failed'};
   if(!canUse()||storage.getItem(WORLD_SAVE_KEY)!==current)return {ok:false,code:'changed'};
   const next=imported??(target?target.save:JSON.stringify({visited:[],stamps:{},outfit:0}));
   const result=storage.replaceWorldSave(next,current);
   if(result.ok)finished=true;
   return {...result,backupId:backup.id};
  }catch{return {ok:false,code:'backup-failed'};}
  finally{busy=false;}
 }
 function removeBackup(id){
  if(busy||finished||!canUse())return false;
  try{const rows=backups();if(!rows.some(row=>row.id===id))return false;return writeBackups(rows.filter(row=>row.id!==id));}catch{return false;}
 }
 return {backups,reset:()=>replace(),restore:id=>replace({restoreId:id}),restoreFile:raw=>replace({imported:raw}),removeBackup,isBusy:()=>busy||finished};
}
