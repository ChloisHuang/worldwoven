/** All game persistence goes through this boundary, including direct ledger
 * transactions. Preview reads an initial formal copy but can never write it. */
export const PREVIEW_STORAGE_PREFIX='worldwoven:character-preview:v1:';
export function createGameStorage({preview=false,normal=null,session=null}={}){
 const memory=new Map(),initial=new Map();
 if(!preview)return normal??{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
 return{
  getItem(key){
   const stored=session?session.getItem(PREVIEW_STORAGE_PREFIX+key):memory.get(key);
   if(stored!==null&&stored!==undefined)return stored;
   if(!initial.has(key))initial.set(key,normal?.getItem(key)??null);
   return initial.get(key);
  },
  setItem(key,value){
   // Preserve thrown transaction failures; never retry against formal storage.
   if(session)session.setItem(PREVIEW_STORAGE_PREFIX+key,String(value));
   else memory.set(key,String(value));
  }
 };
}
