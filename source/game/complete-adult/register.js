/** Explicit development entry. Import once before requesting a candidate from
 * the synchronous createCharacter API. Production main never imports this. */
import {registerCharacterModelPreview} from '../character-model-preview.js';
import {COMPLETE_ADULT_PREVIEW,COMPLETE_ADULT_PAIR_PREVIEW,completeAdultSupport,completeAdultCacheTag,applyCompleteAdultPreview,completeAdultWeights,createCompleteAdultChannels,appendCompleteAdultVertex,finishCompleteAdultChannels,readCompleteAdultColor,prepareCompleteAdultSkinMaterial,prepareCompleteAdultClothMaterial,completeAdultMaterialKey} from './runtime-adapter.js';
const adapter=Object.freeze({
 support:completeAdultSupport,cacheTag:completeAdultCacheTag,apply:applyCompleteAdultPreview,
 weights:completeAdultWeights,createChannels:createCompleteAdultChannels,
 appendVertex:appendCompleteAdultVertex,finishChannels:finishCompleteAdultChannels,
 readColor:readCompleteAdultColor,prepareSkinMaterial:prepareCompleteAdultSkinMaterial,prepareClothMaterial:prepareCompleteAdultClothMaterial,materialKey:completeAdultMaterialKey
});
for(const selection of[COMPLETE_ADULT_PREVIEW,COMPLETE_ADULT_PAIR_PREVIEW])registerCharacterModelPreview(selection,adapter);
