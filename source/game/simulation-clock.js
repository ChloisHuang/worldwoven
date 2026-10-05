// The calendar advances only through active, loaded-world simulation steps.
// Wall time, lighting, scene entry and reload never create a new work day.
export const GAME_MINUTES_PER_SECOND = .7;
const MAX_SECONDS = (Number.MAX_SAFE_INTEGER - 600) / GAME_MINUTES_PER_SECOND;
export function createSimulationClock(saved, legacyDay = 0) {
  const valid = saved?.version === 1 && Number.isFinite(saved.seconds) && saved.seconds >= 0 && saved.seconds <= MAX_SECONDS;
  let seconds = valid ? saved.seconds : Math.max(0, Number.isSafeInteger(legacyDay) ? legacyDay : 0) * 1440 / GAME_MINUTES_PER_SECOND;
  const snapshot = () => ({version: 1, seconds});
  const state = () => { const minutes = 600 + seconds * GAME_MINUTES_PER_SECOND; return {seconds, day: Math.floor(minutes / 1440), hour: minutes % 1440 / 60}; };
  return {
    advance(dt) { if (Number.isFinite(dt) && dt > 0) seconds = Math.min(MAX_SECONDS, seconds + Math.min(.25, dt)); return state(); },
    state, snapshot,
  };
}
