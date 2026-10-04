// Registration is independent of earned work. A role change cannot erase a wage.
export const GARDEN_HELPER_ROLE = 'fr-garden-helper';
export function createFranceGardenerEmployment({saved, saveState, getJob = () => null,
  meetHost = () => false, notify = () => {}} = {}) {
  if (typeof saveState !== 'function') throw new TypeError('employment requires synchronous saveState');
  let current = {version: 1, roleId: null, revision: 0}, loadError = null, lastError = null, saving = false;
  if (saved != null) {
    if (saved.version !== 1 || ![null, GARDEN_HELPER_ROLE].includes(saved.roleId) ||
      !Number.isSafeInteger(saved.revision) || saved.revision < 0) loadError = 'invalid-employment-state';
    else current = {version: 1, roleId: saved.roleId, revision: saved.revision};
  }
  const fail = (code, text) => { lastError = code; if (text) notify(text); return false; };
  function change(roleId) {
    if (loadError || saving) return fail(loadError || 'employment-busy', '园艺登记册暂时无法读取，请保留存档后再试');
    if (current.roleId === roleId) return fail('unchanged');
    if (getJob()) return fail('job-active', '请先归还工具，完成或取消手上的活，并结清工钱');
    if (!meetHost()) return fail('host-unavailable');
    if (!Number.isSafeInteger(current.revision + 1)) return fail('registration-limit');
    const next = {...current, roleId, revision: current.revision + 1};
    saving = true;
    try {
      const result = saveState({...next});
      if (result === false) return fail('save-failed', '登记没能保存，请稍后再试');
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch(() => {});
        return fail('async-save-unsupported', '登记没能保存，请稍后再试');
      }
      current = next; lastError = null;
      notify(roleId ? '埃米尔：欢迎来西苑帮忙。亲手浇好两畦玫瑰、把水壶放回架上，每份活 6 铜文。' :
        '埃米尔：离职记好了，工具和工钱都已结清。想回来时再登记就好。');
      return true;
    } catch { return fail('save-failed', '登记没能保存，请稍后再试'); }
    finally { saving = false; }
  }
  return {isHired: () => !loadError && current.roleId === GARDEN_HELPER_ROLE,
    apply: () => change(GARDEN_HELPER_ROLE), resign: () => change(null),
    state: () => ({...current, loadError, lastError})};
}
