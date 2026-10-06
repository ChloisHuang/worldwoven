/** Register the current complete character adapter before creating actors.
 * Registration and selection never persist a new appearance identity. */
import {registerCharacterModelPreview} from '../character-model-preview.js';
import {COMPLETE_ADULT_PREVIEW,COMPLETE_ADULT_PAIR_PREVIEW,completeAdultSupport,completeAdultCacheTag,applyCompleteAdultPreview,completeAdultWeights,createCompleteAdultChannels,appendCompleteAdultVertex,finishCompleteAdultChannels,readCompleteAdultColor,prepareCompleteAdultSkinMaterial,prepareCompleteAdultClothMaterial,completeAdultMaterialKey} from './runtime-adapter.js';
const adapter=Object.freeze({
 support:completeAdultSupport,cacheTag:completeAdultCacheTag,apply:applyCompleteAdultPreview,
 weights:completeAdultWeights,createChannels:createCompleteAdultChannels,
 appendVertex:appendCompleteAdultVertex,finishChannels:finishCompleteAdultChannels,
 readColor:readCompleteAdultColor,prepareSkinMaterial:prepareCompleteAdultSkinMaterial,prepareClothMaterial:prepareCompleteAdultClothMaterial,materialKey:completeAdultMaterialKey
});
for(const selection of[COMPLETE_ADULT_PREVIEW,COMPLETE_ADULT_PAIR_PREVIEW])registerCharacterModelPreview(selection,adapter);
