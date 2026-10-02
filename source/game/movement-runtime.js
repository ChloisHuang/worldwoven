// Keep travel in wall-clock seconds while retaining short safe collision/pose steps.
// A suspended tab or unusually long stall is bounded rather than replayed as a teleport.
export const PLAYER_TRAVEL_SCALE=1.45;
export const MAX_SIMULATION_STEP=1/30;
export const MAX_FRAME_ADVANCE=.25;
export function simulationFrame(rawDelta){
 const dt=Number.isFinite(rawDelta)?Math.max(0,Math.min(rawDelta,MAX_FRAME_ADVANCE)):0;
 const steps=Math.max(1,Math.ceil(dt/MAX_SIMULATION_STEP-1e-9));
 return {dt,steps,stepDt:dt/steps};
}
// The same 2.88 px deadzone remains. A comfortable 18 px drag now gives full
// walking speed; the inner range still permits precise furniture/door approaches.
export function movementInputMagnitude(rawMagnitude){
 if(!Number.isFinite(rawMagnitude)||rawMagnitude<=.08)return 0;
 return Math.min(1,(rawMagnitude-.08)/.42);
}
