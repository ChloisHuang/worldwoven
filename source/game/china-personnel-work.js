// A same-number public-duty roster. This journal never moves an NPC, appoints
// anyone, changes pay/skills, or archives the player's later formal duty.
import {CHINA_PERSONNEL_OFFICIALS_V1} from './china-personnel-records.js';
import {isChinaPersonnelRank} from './china-official-ranks.js';

export const CHINA_PERSONNEL_WORK_DURATIONS = Object.freeze({visit: 3, compile: 8, review: 4});
export const CHINA_PERSONNEL_REVIEWER = 'cn-official-personnel';
export const CHINA_PERSONNEL_COMPILE_POINT = Object.freeze([21.50, .215, 32.25]);
const PLAYER = 'player', COMPILE_TARGET = 'cn-court-career-desk';
const ranks = {trial: 'cn-records-regular', duty: 'cn-records-personnel'};
// Pre-ladder V1 cases did not carry a rank. Their meaning remains fixed at the
// original trial/base-duty rank; never reinterpret an old case at today's rank.
export const chinaPersonnelWorkRankId = job => job && Object.hasOwn(job, 'rankId') ? job.rankId : ranks[job?.mode];
const validRank = job => job.mode === 'trial' ? chinaPersonnelWorkRankId(job) === ranks.trial :
  job.mode === 'duty' && isChinaPersonnelRank(chinaPersonnelWorkRankId(job));
const roster = CHINA_PERSONNEL_OFFICIALS_V1.map(({office, gradeOrder, ...actor}) => actor);
const officials = new Map(CHINA_PERSONNEL_OFFICIALS_V1.map(actor => [actor.actorId, actor]));
const copy = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,255}$/.test(value);
const keys = (value, names) => object(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value) ?
  Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const fail = code => ({ok: false, code});
const sync = (callback, ...args) => {
  const value = callback(...args);
  if (value?.then) { Promise.resolve(value).catch(() => {}); throw Error('async-dependency-unsupported'); }
  return value;
};
const courtId = day => `cn-morning-audience:${day}`;
const archiveId = (actorId, day) => `cn-official-archive:${actorId}:${day}`;
const caseId = (tenure, day) => `cn-personnel-work:${tenure}:${day}`;
const point = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const near = (a, b, reach) => point(a) && point(b) && Math.hypot(a[0] - b[0], a[2] - b[2]) <= reach && Math.abs(a[1] - b[1]) <= .3;
const kindId = (job, kind, target = '') => `${job.id}:${kind}${target ? ':' + target : ''}`;
const expected = (job, actorId) => job.source.archives.some(row => row.actorId === actorId) ? 'accepted' : 'awaiting';

function validSource(source, day) {
  if (!keys(source, ['day', 'throughSerial', 'audience', 'archives']) || source.day !== day || !integer(day) || !integer(source.throughSerial) || source.throughSerial < 1 ||
      !keys(source.audience, ['id', 'day', 'actors']) || source.audience.id !== courtId(day) || source.audience.day !== day ||
      !same(source.audience.actors, roster) || !Array.isArray(source.archives)) return false;
  let previous = -1;
  for (const archive of source.archives) {
    const index = roster.findIndex(actor => actor.actorId === archive?.actorId);
    if (!keys(archive, ['id', 'actorId', 'day', 'audienceId', 'position', 'elapsed', 'duration']) || index <= previous ||
        archive.day !== day || archive.id !== archiveId(archive.actorId, day) || archive.audienceId !== courtId(day) ||
        archive.duration !== 8 || !Number.isFinite(archive.elapsed) || archive.elapsed < archive.duration ||
        !point(archive.position) || Math.hypot(archive.position[0] - officials.get(archive.actorId)?.office[0], archive.position[2] - officials.get(archive.actorId)?.office[2]) >= .2 ||
        Math.abs(archive.position[1] - officials.get(archive.actorId)?.office[1]) >= .32) return false;
    previous = index;
  }
  return true;
}

// Only the trusted physical adapter supplies these completed, uninterrupted
// reads. Coordinates, standing/clear state and elapsed work must come from the
// actual player, never the dialog's selected target or the NPC's work timer.
function physicalProof(job, kind, proof, targetId) {
  const names = ['caseId', 'actorId', 'targetId', 'position', 'standing', 'clear', 'elapsed', 'duration'];
  if (kind !== 'visit') names.push('revision');
  if (kind === 'review') names.push('recipientPosition', 'recipientBodyId', 'recipientAlive');
  if (!keys(proof, names) || proof.caseId !== job.id || proof.actorId !== PLAYER || proof.targetId !== targetId ||
      proof.standing !== true || proof.clear !== true || !point(proof.position) ||
      (kind !== 'visit' && proof.revision !== job.revision) ||
      proof.duration !== CHINA_PERSONNEL_WORK_DURATIONS[kind] || !Number.isFinite(proof.elapsed) || proof.elapsed < proof.duration) return null;
  const target = kind === 'visit' ? officials.get(targetId)?.office : kind === 'compile' ? CHINA_PERSONNEL_COMPILE_POINT : proof.recipientPosition;
  if (!near(proof.position, target, kind === 'visit' ? 1.2 : kind === 'compile' ? .3 : 2)) return null;
  if (kind === 'review' && (proof.recipientAlive !== true || !identifier(proof.recipientBodyId))) return null;
  return {...copy(proof), id: kindId(job, kind, kind === 'visit' ? targetId : String(job.revision))};
}
// A world save may still contain the adapter's finishing animation. Replaying
// that same logical completion at a slightly later valid position/time returns
// the original receipt, never a second write or replacement physical history.
function replayProof(original, candidate) {
  return ['id', 'caseId', 'actorId', 'targetId', 'duration', 'revision', 'recipientBodyId'].every(key => original[key] === candidate[key]) &&
    candidate.elapsed >= original.elapsed;
}
function validProof(job, kind, receipt, targetId) {
  if (!object(receipt)) return false;
  const {id, ...proof} = receipt, normalized = physicalProof(job, kind, proof, targetId);
  return !!normalized && same(normalized, receipt);
}
function rejectedRows(job) {
  return job.rows.filter(row => row.archiveStatus !== expected(job, row.actorId)).map(row => ({actorId: row.actorId,
    code: expected(job, row.actorId) === 'accepted' ? 'original-archive-not-recorded' : 'archive-without-original'}));
}
function signedReceipt(job, proof) {
  return {version: 1, id: `${job.id}:lu-receipt`, caseId: job.id, actorId: PLAYER, officialTenureId: job.officialTenureId,
    ...(Object.hasOwn(job, 'rankId') ? {rankId: job.rankId} : {}),
    mode: job.mode, audienceId: job.audienceId, sourceDay: job.day, signerId: CHINA_PERSONNEL_REVIEWER,
    signerBodyId: proof.recipientBodyId, revision: job.revision, corrections: job.rows.reduce((sum, row) => sum + row.corrections, 0),
    rows: job.rows.map(row => ({...copy(roster.find(actor => actor.actorId === row.actorId)), archiveStatus: row.archiveStatus,
      archiveId: row.archiveStatus === 'accepted' ? archiveId(row.actorId, job.day) : null, visitReceiptId: row.visit.id})),
    compileReceiptId: job.compiled.proof.id, reviewReceiptId: proof.id};
}
function validCase(job) {
  if (!keys(job, ['id', 'actorId', 'officialTenureId', 'mode', 'day', 'audienceId', 'source', 'rows', 'revision', 'compiled', 'reviews', 'receipt', 'status', ...(object(job) && Object.hasOwn(job, 'rankId') ? ['rankId'] : [])]) ||
      job.actorId !== PLAYER || !identifier(job.officialTenureId) || !validRank(job) || !integer(job.day) ||
      job.id !== caseId(job.officialTenureId, job.day) || job.audienceId !== courtId(job.day) || !validSource(job.source, job.day) ||
      !Array.isArray(job.rows) || job.rows.length !== 6 || !integer(job.revision) || !Array.isArray(job.reviews) ||
      !['draft', 'signed', 'abandoned'].includes(job.status)) return false;
  let revision = 0;
  for (let i = 0; i < job.rows.length; i++) {
    const row = job.rows[i];
    if (!keys(row, ['actorId', 'visit', 'archiveStatus', 'corrections']) || row.actorId !== roster[i].actorId ||
        !integer(row.corrections) || ![null, 'accepted', 'awaiting'].includes(row.archiveStatus) ||
        (row.visit !== null && !validProof(job, 'visit', row.visit, row.actorId)) ||
        (row.archiveStatus !== null && !row.visit) || (row.archiveStatus === null && row.corrections !== 0)) return false;
    if (row.archiveStatus !== null) revision += row.corrections + 1;
  }
  if (revision !== job.revision) return false;
  if (job.compiled !== null && (!keys(job.compiled, ['revision', 'proof']) || job.compiled.revision !== job.revision ||
      job.rows.some(row => !row.visit || row.archiveStatus === null) || !validProof(job, 'compile', job.compiled.proof, COMPILE_TARGET))) return false;
  let lastRevision = -1;
  for (const review of job.reviews) {
    if (!keys(review, ['revision', 'answers', 'compiled', 'rejectedRows', 'proof']) || !integer(review.revision) || review.revision <= lastRevision || review.revision > job.revision ||
        !Array.isArray(review.answers) || review.answers.length !== 6 || !review.answers.every(answer => ['accepted', 'awaiting'].includes(answer)) ||
        !keys(review.compiled, ['revision', 'proof']) || review.compiled.revision !== review.revision ||
        !validProof({...job, revision: review.revision}, 'compile', review.compiled.proof, COMPILE_TARGET) ||
        !validProof({...job, revision: review.revision}, 'review', review.proof, CHINA_PERSONNEL_REVIEWER)) return false;
    const rows = job.rows.map((row, index) => ({...row, archiveStatus: review.answers[index]}));
    if (!same(review.rejectedRows, rejectedRows({...job, rows})) || review.revision === job.revision && !same(review.answers, job.rows.map(row => row.archiveStatus))) return false;
    if (review.revision < 6) return false;
    if (review.rejectedRows.length === 0 && (review !== job.reviews.at(-1) || job.status !== 'signed')) return false;
    lastRevision = review.revision;
  }
  if (job.status === 'signed') {
    const review = job.reviews.at(-1);
    if (!job.compiled || !review || review.revision !== job.revision || review.rejectedRows.length ||
        !same(review.compiled, job.compiled) || !same(job.receipt, signedReceipt(job, review.proof))) return false;
  } else if (job.receipt !== null) return false;
  return true;
}
// Read-only structural validation for consumers. The host must also compare the
// frozen source with the authoritative records ledger at its throughSerial.
export function validateChinaPersonnelWorkCase(job, {mode, officialTenureId, day, rankId, status = 'signed'} = {}) {
  try { return validCase(job) && (status === null || job.status === status) &&
    (mode === undefined || job.mode === mode) && (officialTenureId === undefined || job.officialTenureId === officialTenureId) &&
    (day === undefined || job.day === day) && (rankId === undefined || chinaPersonnelWorkRankId(job) === rankId); } catch { return false; }
}

function restoredState(saved) {
  if (!keys(saved, ['version', 'currentId', 'cases']) || saved.version !== 1 || !Array.isArray(saved.cases)) throw Error('invalid-saved-state');
  const ids = new Set();
  for (const job of saved.cases) {
    if (!validCase(job) || ids.has(job.id)) throw Error('invalid-saved-state');
    ids.add(job.id);
  }
  const active = saved.cases.filter(job => job.status === 'draft');
  if (active.length > 1 || saved.currentId !== (active[0]?.id ?? null)) throw Error('invalid-saved-state');
  return copy(saved);
}

/**
 * sourceFor(day, throughSerial?) is the records ledger's committed as-of
 * public source. 'awaiting' means no original observed by the frozen boundary,
 * never that the official was absent or failed to perform a duty.
 * readAppointment() returns the current {actorId:'player', tenureId, rankId}.
 * validateEligibility(request) defaults closed and validates the named tenure
 * and source for each phase. For phase:'restore', validate historical ownership
 * without requiring the historical job's tenure/rank to be current. It returns
 * true, or {ok:true,actorId:'player',officialTenureId,rankId} for that job.
 * resolveActor(Lu) returns actual {actorId,bodyId,alive,position} at handoff.
 *
 * Every mutation fences reentry, saves a detached frozen candidate first, and
 * adopts only synchronous success. Promise/false/{ok:false}/throw cannot adopt.
 * No source pruning; trial and duty share the same tenure/source identifier.
 * Cancelling a physical activity calls no mutation: visits/answers survive.
 * Abandon is explicit and retains the original reserved case without receipt.
 */
export function createChinaPersonnelWork({sourceFor = () => null, readAppointment = () => null,
  validateEligibility = () => false, resolveActor = () => null, saved, saveState} = {}) {
  for (const callback of [sourceFor, readAppointment, validateEligibility, resolveActor]) if (typeof callback !== 'function') throw TypeError('personnel work requires synchronous callbacks');
  if (saveState !== undefined && typeof saveState !== 'function') throw TypeError('personnel work requires synchronous saveState');
  let state = null, loadError = null, busy = false;
  function source(job) {
    let value;
    try { value = sync(sourceFor, job.day, job.source.throughSerial); } catch { throw Error('source-unavailable'); }
    if (!validSource(value, job.day)) throw Error('source-unavailable');
    // Re-read the exact committed boundary: later archives cannot change an
    // answer, and dropping an already-present original cannot forge absence.
    if (!same(value, job.source)) throw Error('source-mismatch');
    return value;
  }
  function eligible(job, phase) {
    const rankId = chinaPersonnelWorkRankId(job);
    const result = validateEligibility(freeze({actorId: PLAYER, officialTenureId: job.officialTenureId, mode: job.mode,
      day: job.day, audienceId: job.audienceId, caseId: job.id, rankId, phase}));
    if (result?.then) { Promise.resolve(result).catch(() => {}); return false; }
    return validRank(job) && (result === true || result?.ok === true && result.actorId === PLAYER && result.officialTenureId === job.officialTenureId && result.rankId === rankId);
  }
  function appointment(job) {
    const current = sync(readAppointment);
    return validRank(job) && current?.actorId === PLAYER && current.tenureId === job.officialTenureId && current.rankId === chinaPersonnelWorkRankId(job);
  }
  try {
    state = saved === undefined ? {version: 1, currentId: null, cases: []} : restoredState(saved);
    for (const job of state.cases) { source(job); if (!eligible(job, 'restore')) throw Error('tenure-ownership-mismatch'); }
  } catch (error) { loadError = ['source-unavailable', 'source-mismatch', 'tenure-ownership-mismatch'].includes(error.message) ? error.message : 'invalid-saved-state'; }
  const snapshot = () => copy(state ?? saved);
  const resultCase = job => ({case: freeze(copy(job))});
  function persist(candidate) {
    if (!saveState) return fail('persistence-unavailable');
    try {
      const stored = saveState(freeze(copy(candidate)));
      if (stored?.then) { Promise.resolve(stored).catch(() => {}); return fail('async-save-unsupported'); }
      if (stored === false || stored?.ok === false) return fail('save-failed');
      state = candidate;
      return {ok: true, replayed: false};
    } catch { return fail('save-failed'); }
  }
  function transition(action) {
    if (loadError) return fail(loadError);
    if (busy) return fail('busy');
    busy = true;
    try { return action(); }
    catch (error) { return fail(['source-mismatch', 'source-unavailable', 'async-dependency-unsupported'].includes(error.message) ? error.message : 'dependency-unavailable'); }
    finally { busy = false; }
  }
  function checked(id, phase, allowSigned = false) {
    const job = state.cases.find(row => row.id === id);
    if (!job) return {error: fail('invalid-case')};
    if (!appointment(job) || !eligible(job, phase)) return {error: fail('appointment-mismatch')};
    source(job);
    if (job.status === 'abandoned') return {error: fail('case-abandoned')};
    if (job.status === 'signed' && !allowSigned) return {error: fail('case-already-signed')};
    return {job};
  }
  function replace(job) {
    const candidate = snapshot(); candidate.cases[candidate.cases.findIndex(row => row.id === job.id)] = job;
    candidate.currentId = job.status === 'draft' ? job.id : null;
    const result = persist(candidate);
    return result.ok ? {...result, ...resultCase(job)} : result;
  }
  return Object.freeze({
    get loadError() { return loadError; }, snapshot, state: snapshot,
    current: () => !loadError && !busy && state.currentId ? freeze(copy(state.cases.find(job => job.id === state.currentId))) : null,
    receiptFor: id => !loadError && !busy ? freeze(copy(state.cases.find(job => job.id === id)?.receipt ?? null)) : null,
    claim({day, mode, officialTenureId} = {}) { return transition(() => {
      if (!integer(day) || !Object.hasOwn(ranks, mode) || !identifier(officialTenureId)) return fail('invalid-claim');
      const id = caseId(officialTenureId, day), existing = state.cases.find(job => job.id === id);
      if (existing) {
        if (existing.mode !== mode) return fail('source-already-claimed');
        const {error} = checked(id, 'resume', true); if (error) return error;
        return {ok: true, replayed: true, ...resultCase(existing)};
      }
      if (state.currentId) return fail('unfinished-case');
      const sourceValue = sync(sourceFor, day);
      if (!validSource(sourceValue, day)) return fail('source-unavailable');
      const job = {id, actorId: PLAYER, officialTenureId, mode, day, audienceId: courtId(day), source: copy(sourceValue),
        ...(mode === 'duty' ? {rankId: sync(readAppointment)?.rankId} : {}),
        rows: roster.map(actor => ({actorId: actor.actorId, visit: null, archiveStatus: null, corrections: 0})),
        revision: 0, compiled: null, reviews: [], receipt: null, status: 'draft'};
      if (!appointment(job) || !eligible(job, 'claim')) return fail('appointment-mismatch');
      const result = persist({...snapshot(), currentId: id, cases: [...state.cases, job]});
      return result.ok ? {...result, ...resultCase(job)} : result;
    }); },
    visit({caseId: id, actorId, proof} = {}) { return transition(() => {
      const {job, error} = checked(id, 'visit'); if (error) return error;
      const row = job.rows.find(item => item.actorId === actorId), receipt = physicalProof(job, 'visit', proof, actorId);
      if (!row || !receipt) return fail('invalid-visit');
      if (row.visit) return replayProof(row.visit, receipt) ? {ok: true, replayed: true, ...resultCase(job)} : fail('visit-conflict');
      const next = copy(job); next.rows.find(item => item.actorId === actorId).visit = receipt;
      return replace(next);
    }); },
    record({caseId: id, actorId, archiveStatus} = {}) { return transition(() => {
      const {job, error} = checked(id, 'record'); if (error) return error;
      const row = job.rows.find(item => item.actorId === actorId);
      if (!row || !['accepted', 'awaiting'].includes(archiveStatus)) return fail('invalid-row');
      if (!row.visit) return fail('original-not-read');
      if (row.archiveStatus === archiveStatus) return {ok: true, replayed: true, ...resultCase(job)};
      const next = copy(job), changed = next.rows.find(item => item.actorId === actorId);
      if (changed.archiveStatus !== null) changed.corrections++;
      changed.archiveStatus = archiveStatus; next.revision++; next.compiled = null;
      if (!integer(next.revision) || !integer(changed.corrections)) return fail('revision-limit');
      return replace(next);
    }); },
    compile({caseId: id, proof} = {}) { return transition(() => {
      const {job, error} = checked(id, 'compile'); if (error) return error;
      if (job.rows.some(row => !row.visit || row.archiveStatus === null)) return fail('roster-incomplete');
      const receipt = physicalProof(job, 'compile', proof, COMPILE_TARGET);
      if (!receipt) return fail('invalid-compile');
      if (job.compiled) return replayProof(job.compiled.proof, receipt) ? {ok: true, replayed: true, ...resultCase(job)} : fail('compile-conflict');
      return replace({...copy(job), compiled: {revision: job.revision, proof: receipt}});
    }); },
    review({caseId: id, proof} = {}) { return transition(() => {
      const {job, error} = checked(id, 'review', true); if (error) return error;
      if (!job.compiled) return fail('roster-not-compiled');
      const receipt = physicalProof(job, 'review', proof, CHINA_PERSONNEL_REVIEWER);
      if (!receipt) return fail('invalid-review');
      const previous = job.reviews.find(row => row.revision === job.revision);
      if (previous) {
        if (!replayProof(previous.proof, receipt)) return fail('review-conflict');
        return previous.rejectedRows.length ? {ok: false, replayed: true, code: 'roster-rejected', rejectedRows: copy(previous.rejectedRows)} :
          {ok: true, replayed: true, receipt: freeze(copy(job.receipt)), ...resultCase(job)};
      }
      const actor = sync(resolveActor, CHINA_PERSONNEL_REVIEWER);
      if (actor?.actorId !== CHINA_PERSONNEL_REVIEWER || actor.bodyId !== receipt.recipientBodyId || actor.alive !== true ||
          !same(actor.position, receipt.recipientPosition)) return fail('reviewer-unavailable');
      const rejected = rejectedRows(job), next = copy(job);
      next.reviews.push({revision: job.revision, answers: job.rows.map(row => row.archiveStatus), compiled: copy(job.compiled), rejectedRows: rejected, proof: receipt});
      if (!rejected.length) { next.status = 'signed'; next.receipt = signedReceipt(next, receipt); }
      const result = replace(next);
      if (!result.ok) return result;
      return rejected.length ? {ok: false, code: 'roster-rejected', rejectedRows: copy(rejected), ...resultCase(next)} :
        {...result, receipt: freeze(copy(next.receipt))};
    }); },
    abandon({caseId: id} = {}) { return transition(() => {
      const job = state.cases.find(row => row.id === id);
      if (!job) return fail('invalid-case');
      // Leaving office must not forge completion or silently erase the case.
      // Historical ownership, rather than current rank, permits explicit exit.
      source(job); if (!eligible(job, 'restore')) return fail('tenure-ownership-mismatch');
      if (job.status === 'signed') return fail('case-already-signed');
      if (job.status === 'abandoned') return {ok: true, replayed: true, ...resultCase(job)};
      return replace({...copy(job), status: 'abandoned'});
    }); },
  });
}
