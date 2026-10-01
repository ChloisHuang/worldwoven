const REMOTE_SAVE = 'https://www.doudouai.net:6443/api/state';
const MAX_BYTES = 900000;
const reply = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'},
});
export function createHandler(fetchRemote = fetch) {
  return async function handle(request, env = {}) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/pull-remote-save') {
      // Sites serves the compiled dist/client assets ahead of unmatched routes.
      return env.ASSETS?.fetch ? env.ASSETS.fetch(request) : new Response('Not found', {status:404});
    }
    if (request.method !== 'GET') return reply({error:'method_not_allowed'},405);
    if (url.search) return reply({error:'unexpected_query'},400);
    if ((request.headers.has('Origin') && request.headers.get('Origin') !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return reply({error:'origin_mismatch'},403);
    try {
      const response = await fetchRemote(REMOTE_SAVE, {method:'GET',headers:{Accept:'application/json'},credentials:'omit',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return reply({error:'remote_unavailable'},502);
      if (Number(response.headers.get('content-length')) > MAX_BYTES) return reply({error:'remote_save_too_large'},502);
      const reader = response.body?.getReader();
      if (!reader) return reply({error:'invalid_remote_save'},502);
      const chunks=[]; let bytes=0;
      for (;;) {
        const item=await reader.read(); if(item.done) break;
        bytes+=item.value.length;
        if(bytes>MAX_BYTES) { await reader.cancel(); return reply({error:'remote_save_too_large'},502); }
        chunks.push(item.value);
      }
      const body=new Uint8Array(bytes); let offset=0;
      for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
      const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));
      const state=data?.state;
      if(!state || !Number.isInteger(state.version) || !Number.isFinite(state.day) || state.day<1 || !state.player || typeof state.player!=='object' || Array.isArray(state.player) || !state.npcs || typeof state.npcs!=='object' || Array.isArray(state.npcs) || !Array.isArray(state.objects)) return reply({error:'invalid_remote_save'},502);
      // Return only the requested game snapshot, never remote authentication fields.
      return reply({state});
    } catch { return reply({error:'remote_unavailable'},502); }
  };
}
export default {fetch:createHandler()};
