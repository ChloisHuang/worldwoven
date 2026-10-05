import {playerAppearance} from './appearance.js';

// Personal appearance/outfit remain the sole saved wardrobe. Borrowed clothes
// are resolved on top, never copied back into that identity or its preview draft.
export function resolvePlayerWardrobe({appearance,region,outfit=0,preview=false,servicePreset=null,bath=null,dutyPreset=null}){
 const look=playerAppearance(appearance,region,outfit);
 if(preview)return {look,source:'personal-preview'};
 if(servicePreset)return {look:{...look,wardrobePreset:servicePreset},source:'bath-service'};
 if(bath?.kind==='bath')return {look:{...look,wardrobePreset:bath.bathWardrobePreset||'bath-robe'},source:'bath'};
 if(region==='china'&&dutyPreset==='jinyi-training')return {look:{...look,wardrobePreset:dutyPreset,clothes:0x853930,accent:0xc9aa60},source:'guard-duty'};
 return {look,source:'personal'};
}
