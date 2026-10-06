/** Current complete character candidate in ordinary gameplay.
 * Rendering selection is transient: storage, identities and score versions stay
 * owned by the unchanged normal game. The isolated preview keeps its own entry.
 */
import {installActorPreview} from './complete-adult/selection.js';
installActorPreview({femaleHair:'long-layered',hairFlow:true,playerOnly:false});
