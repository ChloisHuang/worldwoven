/** Tiny synchronous selection bridge. Candidate code/assets are imported only
 * by an explicit development entry, never by this production module. */
const adapters=new Map();
export function registerCharacterModelPreview(selection,adapter){
 const existing=adapters.get(selection);
 if(existing&&existing!==adapter)throw new Error('Character preview already registered: '+selection);
 adapters.set(selection,adapter);
}
export function resolveCharacterModelPreview(options,selection){
 const adapter=adapters.get(selection);
 if(!adapter)return{supported:false,reason:selection?'preview-not-registered':'not-requested'};
 return{...adapter.support(options,selection),adapter};
}
