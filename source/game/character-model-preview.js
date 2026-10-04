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

// Explicit development bootstrap only. With no selector/pose request these
// remain null and normal production actor selection/attention is unchanged.
let selector=null,headLook=null;
export function setCharacterModelPreviewSelector(value){if(value!==null&&typeof value!=='function')throw new TypeError('Preview selector must be a function');selector=value;}
export function defaultCharacterModelPreview(options){return selector?.(options)??{modelPreview:null,previewHair:null,previewHairFlow:false};}
export function setCharacterPreviewHeadLook(value){headLook=value?{yaw:value.yaw||0,pitch:value.pitch||0,weight:value.weight??1}:null;}
export function characterPreviewHeadLook(){return headLook;}
