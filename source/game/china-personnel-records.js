// Original public-duty observations only. This ledger neither reads money nor
// appoints, pays, assesses or promotes anyone. Missing history is unknown.
import {CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1, getChinaOfficialGrade} from './china-official-ranks.js';

const copy = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const keys = (value, expected) => object(value) && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value) ?
  Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const fail = (code, pending = false) => ({ok: false, code, ...(pending ? {pending: true} : {})});
const courtId = day => `cn-morning-audience:${day}`;
const archiveId = (actorId, day) => `cn-official-archive:${actorId}:${day}`;
const position = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

// V1 freezes the original six identities and their own desk anchors. Keep this
// version if live appointments, names, ranks or the bureau change later. The
// integration test compares these with the real audience and bureau tables.
export const CHINA_PERSONNEL_OFFICIALS_V1 = freeze([
  ['cn-minister-works', '顾衡', '工务主官', [18, .215, 32.5]],
  ['cn-minister-granary', '许知远', '仓务总管', [24, .215, 32.5]],
  ['cn-official-rites', '沈叙', '礼仪主管', [17.35, 3.915, 32.15]],
  ['cn-official-personnel', '陆谦', '吏务主管', [19.30, 3.915, 32.15]],
  ['cn-official-justice', '周惟正', '刑名主官', [21.25, 3.915, 32.15]],
  ['cn-official-records', '宋承简', '文书承办官', [23.20, 3.915, 32.15]],
].map(([actorId, name, roleLabel, office]) => {
  const grade = getChinaOfficialGrade(CHINA_OFFICIAL_GRADE_ASSIGNMENTS_V1[actorId]);
  return {actorId, name, roleLabel, gradeId: grade.gradeId, gradeLabel: grade.gradeLabel, gradeOrder: grade.gradeOrder, office};
}));
const officials = new Map(CHINA_PERSONNEL_OFFICIALS_V1.map(row => [row.actorId, row]));
const actorIds = CHINA_PERSONNEL_OFFICIALS_V1.map(row => row.actorId);
const publicRoster = CHINA_PERSONNEL_OFFICIALS_V1.map(({office, gradeOrder, ...row}) => row);

function courtFor(value) {
  if (!keys(value, ['id', 'day', 'actorIds']) || !integer(value.day) || value.id !== courtId(value.day) ||
      !Array.isArray(value.actorIds) || value.actorIds.length !== actorIds.length || new Set(value.actorIds).size !== actorIds.length ||
      !value.actorIds.every(id => officials.has(id))) return null;
  return {id: value.id, day: value.day, actors: copy(publicRoster)};
}
function archiveFor(value) {
  if (!keys(value, ['id', 'actorId', 'day', 'audienceId', 'position', 'elapsed', 'duration']) || !officials.has(value.actorId) ||
      !integer(value.day) || value.id !== archiveId(value.actorId, value.day) || value.audienceId !== courtId(value.day) ||
      !position(value.position) || value.duration !== 8 || !Number.isFinite(value.elapsed) || value.elapsed < value.duration) return null;
  const point = officials.get(value.actorId).office;
  if (Math.hypot(value.position[0] - point[0], value.position[2] - point[2]) >= .2 || Math.abs(value.position[1] - point[1]) >= .32) return null;
  return {id: value.id, actorId: value.actorId, day: value.day, audienceId: value.audienceId,
    position: value.position.slice(), elapsed: value.elapsed, duration: value.duration};
}
function validCourt(value) {
  if (!keys(value, ['id', 'day', 'actors']) || !Array.isArray(value.actors)) return false;
  const expected = courtFor({id: value.id, day: value.day, actorIds: value.actors.map(row => row?.actorId)});
  return !!expected && same(expected, value);
}
function restore(value) {
  if (!keys(value, ['version', 'courts', 'archives', 'eventIds', 'outbox']) || value.version !== 1 ||
      !Array.isArray(value.courts) || !Array.isArray(value.archives) || !Array.isArray(value.eventIds) || !Array.isArray(value.outbox)) throw Error('invalid-saved-state');
  const ids = new Set(), courts = new Map();
  function court(row) {
    if (!validCourt(row) || ids.has(row.id)) throw Error('invalid-saved-state');
    ids.add(row.id); courts.set(row.id, row);
  }
  function archive(row) {
    const expected = archiveFor(row);
    if (!expected || !same(expected, row) || ids.has(row.id) || !courts.get(row.audienceId)?.actors.some(actor => actor.actorId === row.actorId)) throw Error('invalid-saved-state');
    ids.add(row.id);
  }
  value.courts.forEach(court); value.archives.forEach(archive);
  // One append-only serial across both kinds makes an as-of view auditable.
  // Every committed fact occurs exactly once, in each collection's saved
  // order, and an archive can never precede its witnessed court.
  if (value.eventIds.length !== ids.size) throw Error('invalid-saved-state');
  const observed = new Set(); let courtIndex = 0, archiveIndex = 0;
  const archives = new Map(value.archives.map(row => [row.id, row]));
  for (const id of value.eventIds) {
    if (!ids.has(id) || observed.has(id)) throw Error('invalid-saved-state');
    if (courts.has(id)) {
      if (value.courts[courtIndex++]?.id !== id) throw Error('invalid-saved-state');
    } else {
      if (value.archives[archiveIndex++]?.id !== id || !observed.has(archives.get(id).audienceId)) throw Error('invalid-saved-state');
    }
    observed.add(id);
  }
  for (const pending of value.outbox) {
    if (!keys(pending, ['kind', 'fact']) || !['court', 'archive'].includes(pending.kind)) throw Error('invalid-saved-state');
    (pending.kind === 'court' ? court : archive)(pending.fact);
  }
  return copy(value);
}

/** The audience/life controllers call witness* ONLY at their real completed
 * boundary. resolveActor(id) returns {actorId, alive, position} from the actual
 * NPC, additionally verifying identity, alive body, and actual desk position at
 * first observation; it cannot manufacture
 * elapsed work or reconstruct old history. Replays/retries never need that
 * actor to remain at the desk or alive after the original observation.
 *
 * A validated observation enters outbox before any write. snapshot() always
 * includes that outbox, so an ordinary full-world save preserves failed writes
 * across day changes and reload. sourceFor(day, throughSerial) exposes only
 * committed facts at that exact global event boundary; omit throughSerial for
 * the latest committed view. Freeze that boundary in downstream workcases and
 * compare the entire bounded view on reload, never a subset of current rows.
 * retry() saves a frozen candidate with the original queued facts committed;
 * only synchronous success adopts it. The caller must mirror that candidate
 * into both its top-level and continuity fields during the same world write.
 * False, {ok:false}, throws and Promises cannot acknowledge a durable write.
 * Reentrant observations are queued separately and never lost by adoption.
 *
 * V1 deliberately does not prune. A future retention policy must first account
 * for every downstream frozen job/reference, rather than dropping old days.
 */
export function createChinaPersonnelRecords({saved, saveState, resolveActor = () => null} = {}) {
  if (typeof resolveActor !== 'function' || saveState !== undefined && typeof saveState !== 'function') throw TypeError('personnel records require synchronous callbacks');
  let current = null, loadError = null, busy = false;
  try { current = saved === undefined ? {version: 1, courts: [], archives: [], eventIds: [], outbox: []} : restore(saved); }
  catch { loadError = 'invalid-saved-state'; }
  const snapshot = () => copy(current ?? saved);
  const find = id => current.courts.find(row => row.id === id) || current.archives.find(row => row.id === id) || current.outbox.find(row => row.fact.id === id)?.fact;
  function liveActor(id) {
    try { const actor = resolveActor(id); return actor?.actorId === id && actor.alive === true ? actor : null; }
    catch { return null; }
  }
  function liveArchive(fact) {
    const point = liveActor(fact.actorId)?.position;
    return position(point) && point.every((value, i) => Math.abs(value - fact.position[i]) <= 1e-6);
  }
  function retry() {
    if (loadError) return fail(loadError);
    if (busy) return fail('busy', !!current.outbox.length);
    if (!current.outbox.length) return {ok: true, replayed: true};
    if (!saveState) return fail('persistence-unavailable', true);
    const submitted = copy(current.outbox), submittedIds = new Set(submitted.map(row => row.fact.id));
    const candidate = {version: 1, courts: copy(current.courts), archives: copy(current.archives), eventIds: current.eventIds.slice(), outbox: []};
    for (const row of submitted) {
      candidate[row.kind === 'court' ? 'courts' : 'archives'].push(row.fact);
      candidate.eventIds.push(row.fact.id);
    }
    busy = true;
    try {
      const stored = saveState(freeze(copy(candidate)));
      if (stored && typeof stored.then === 'function') { Promise.resolve(stored).catch(() => {}); return fail('async-save-unsupported', true); }
      if (stored === false || stored?.ok === false) return fail('save-failed', true);
      // A save callback may observe another actual event. It is absent from
      // this candidate and remains pending until a later acknowledged write.
      candidate.outbox = current.outbox.filter(row => !submittedIds.has(row.fact.id));
      current = candidate;
      return {ok: true, replayed: false, committed: submitted.length};
    } catch { return fail('save-failed', true); }
    finally { busy = false; }
  }
  function witness(kind, fact, validLive) {
    if (loadError) return fail(loadError);
    if (!fact) return fail(`invalid-${kind}`);
    const existing = find(fact.id);
    if (existing) {
      if (!same(existing, fact)) return fail(`${kind}-conflict`);
      if (!current.outbox.some(row => row.fact.id === fact.id)) return {ok: true, replayed: true};
      const result = retry(); return {...result, replayed: true};
    }
    if (kind === 'archive' && !find(fact.audienceId)?.actors?.some(actor => actor.actorId === fact.actorId)) return fail('audience-unavailable');
    if (!validLive(fact)) return fail('actor-unavailable');
    current.outbox.push({kind, fact});
    return retry();
  }
  return Object.freeze({
    get loadError() { return loadError; }, snapshot, retry,
    witnessCourt: value => witness('court', courtFor(value), fact => fact.actors.every(row => !!liveActor(row.actorId))),
    witnessArchive: value => witness('archive', archiveFor(value), liveArchive),
    sourceFor(day, throughSerial = current?.eventIds.length) {
      if (loadError || !integer(day) || !integer(throughSerial) || throughSerial > current.eventIds.length) return null;
      const observed = new Set(current.eventIds.slice(0, throughSerial));
      return freeze(copy({day, throughSerial, audience: current.courts.find(row => row.day === day && observed.has(row.id)) || null,
        archives: current.archives.filter(row => row.day === day && observed.has(row.id)).sort((a, b) => actorIds.indexOf(a.actorId) - actorIds.indexOf(b.actorId))}));
    },
  });
}
