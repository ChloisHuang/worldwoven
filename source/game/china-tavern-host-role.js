import {createTavernRole} from './china-tavern-role.js';
export {personId} from './china-tavern-role.js';
// Assignment is distinct from the individual, property owner and personal money.
// This is an explicit succession seam, not an aging/death or hiring simulator.
export const TAVERN_HOST_ROLE_ID='cn-tavern-host';
export const TAVERN_HOST_SLOT_ID='cn-tavern-host-rotation-1';
export const ORIGINAL_TAVERN_HOST_ID='cn-tavern-host';
export function createTavernHostRole(options={}){return createTavernRole({...options,roleId:TAVERN_HOST_ROLE_ID,slotId:TAVERN_HOST_SLOT_ID,originalHolderId:ORIGINAL_TAVERN_HOST_ID,errorName:'host'});}
