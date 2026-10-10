/** All game persistence goes through this boundary, including direct ledger
 * transactions. Preview reads an initial formal copy but can never write it. */
export const PREVIEW_STORAGE_PREFIX='worldwoven:character-preview:v1:';
export const SAVE_REVISION_KEY='worldwoven:save-revision:v1';
export function createGameStorage({preview=false,normal=null,session=null}={}){
 const memory=new Map(),initial=new Map(),backing=preview?session:normal,prefix=preview?PREVIEW_STORAGE_PREFIX:'';
 let locked=false;
 const ownRead=key=>backing?backing.getItem(prefix+key):memory.get(key)??null;
 const write=(key,value)=>backing?backing.setItem(prefix+key,String(value)):memory.set(key,String(value));
 const revision=()=>ownRead(SAVE_REVISION_KEY)||'';
 let openedRevision;try{openedRevision=revision();}catch{openedRevision='';}
 const isCurrent=()=>{try{return !locked&&revision()===openedRevision;}catch{return false;}};
 const getItem=key=>{
  const stored=ownRead(key);
  if(stored!==null&&stored!==undefined||!preview)return stored??null;
  if(!initial.has(key))initial.set(key,normal?.getItem(key)??null);
  return initial.get(key);
 };
 return{
  persistent:!!backing,isPreview:preview,isCurrent,
  getItem,
  setItem(key,value){if(!isCurrent())return false;return write(key,value);},
  // Only the reset/restore flow uses this. Backups are committed and verified
  // before calling it. Fence every old controller before replacing the save.
  replaceWorldSave(value,expected){
   if(!backing||!isCurrent()||getItem('worlds-days-v1')!==expected)return {ok:false,code:'changed'};
   const nextRevision=`${Date.now()}-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`;
   locked=true;
   try{
    const a=write(SAVE_REVISION_KEY,nextRevision);if(a===false||a?.then)throw new Error('revision');
    const b=write('worlds-days-v1',value);if(b===false||b?.then||ownRead('worlds-days-v1')!==value)throw new Error('save');
    return {ok:true};
   }catch{
    try{
     if(ownRead('worlds-days-v1')!==expected)write('worlds-days-v1',expected);
     write(SAVE_REVISION_KEY,openedRevision);
     locked=ownRead('worlds-days-v1')!==expected||revision()!==openedRevision;
    }catch{locked=true;}
    return {ok:false,code:locked?'reload-required':'write-failed'};
   }
  }
 };
}
