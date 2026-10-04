/** Lightweight query/storage boundary. No candidate asset imports. */
import {createGameStorage} from './game-storage.js';
export function previewQueryValue(key,search=globalThis.location?.search||''){
 for(const part of search.replace(/^\?/,'').split('&')){const [name,...rest]=part.split('=');try{if(decodeURIComponent(name)===key)return decodeURIComponent(rest.join('='));}catch{}}
 return null;
}
export const CHARACTER_PREVIEW_ENABLED=previewQueryValue('character-preview')==='1';
export const PREVIEW_NPCS_ENABLED=CHARACTER_PREVIEW_ENABLED&&previewQueryValue('preview-npcs')==='1';
const browserStorage=name=>{try{return globalThis[name]??null;}catch{return null;}};
export const gameStorage=createGameStorage({preview:CHARACTER_PREVIEW_ENABLED,normal:browserStorage('localStorage'),session:CHARACTER_PREVIEW_ENABLED?browserStorage('sessionStorage'):null});
