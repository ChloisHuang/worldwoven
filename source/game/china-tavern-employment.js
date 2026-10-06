// The first real local role. Identity is separate from a paid work receipt:
// applying/leaving never creates, clears or pays a chinaLabor job.
export const TAVERN_HELPER_ROLE = 'cn-tavern-helper';
const empty = () => ({version: 1, roleId: null, revision: 0});

export function createChinaTavernEmployment({saved, saveState, getJob = () => null,
  meetHost = () => false, notify = () => {}} = {}) {
  if (typeof saveState !== 'function') throw new TypeError('employment requires synchronous saveState');
  let current = empty(), loadError = null, lastError = null, saving = false;
  if (saved != null) {
    if (saved.version !== 1 || ![null, TAVERN_HELPER_ROLE].includes(saved.roleId) ||
      !Number.isSafeInteger(saved.revision) || saved.revision < 0) loadError = 'invalid-employment-state';
    else current = {version: 1, roleId: saved.roleId, revision: saved.revision};
  }
  const fail = (code, text) => { lastError = code; if (text) notify(text); return false; };
  function change(roleId) {
    if (loadError || saving) return fail(loadError || 'employment-busy', '登记册暂时无法读取，请保留存档后再试');
    if (current.roleId === roleId) return fail('unchanged', roleId ? '你已登记为酒楼帮工，可以接活了' : '你目前没有在酒楼任职');
    const job = getJob();
    if (job) return fail(job.stage === 'ready' ? 'wage-ready' : 'job-active', job.stage === 'ready' ?
      '先找掌柜领完已做好的工钱，再办理职业登记' : '先完成或取消手上的擦桌活，再办理职业登记');
    if (!meetHost()) return fail('host-unavailable');
    if (!Number.isSafeInteger(current.revision + 1)) return fail('registration-limit');
    const next = {version: 1, roleId, revision: current.revision + 1};
    saving = true;
    try {
      const result = saveState({...next});
      if (result === false) return fail('save-failed', '登记没能保存，请稍后再试');
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch(() => {});
        return fail('async-save-unsupported', '登记没能保存，请稍后再试');
      }
      current = next; lastError = null;
      notify(roleId ? '掌柜：已记入帮工名册。无需资历，擦净两桌领 12 铜文；想换活时，结清后来说一声。' :
        '掌柜：离职已记下，工钱都结清了。日后想回来，仍可重新登记。');
      return true;
    } catch { return fail('save-failed', '登记没能保存，请稍后再试'); }
    finally { saving = false; }
  }
  return {
    isHired: () => !loadError && current.roleId === TAVERN_HELPER_ROLE,
    apply: () => change(TAVERN_HELPER_ROLE), resign: () => change(null),
    state: () => ({...current, loadError, lastError}),
  };
}
