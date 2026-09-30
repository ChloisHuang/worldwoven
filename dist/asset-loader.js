(() => {
const assets = {"index.pck": {"chunks": ["index.pck.gz.part0", "index.pck.gz.part1", "index.pck.gz.part2", "index.pck.gz.part3", "index.pck.gz.part4"], "size": 68765808, "type": "application/octet-stream"}, "index.wasm": {"chunks": ["index.wasm.gz.part0"], "size": 39514754, "type": "application/wasm"}};
const nativeFetch = window.fetch.bind(window);
window.fetch = async function(input, init) {
 const url = new URL(typeof input === 'string' ? input : input.url, location.href);
 const name = url.pathname.split('/').pop();
 const item = url.origin === location.origin && assets[name];
 if (!item) return nativeFetch(input, init);
 if (typeof DecompressionStream === 'undefined') throw new Error('Please use an up-to-date Safari or Chrome browser.');
 let index = 0, reader = null;
 const stream = new ReadableStream({async pull(controller) {
  try {
   while (true) {
    if (!reader) {
     if (index >= item.chunks.length) { controller.close(); return; }
     const part = await nativeFetch(new URL(item.chunks[index++], url), init);
     if (!part.ok) throw new Error('Game download failed: ' + part.status);
     reader = part.body.getReader();
    }
    const result = await reader.read();
    if (result.done) { reader.releaseLock(); reader = null; continue; }
    controller.enqueue(result.value); return;
   }
  } catch (error) { controller.error(error); }
 }, cancel() { if (reader) return reader.cancel(); }});
 return new Response(stream.pipeThrough(new DecompressionStream('gzip')), {headers:{'Content-Type':item.type,'Content-Length':String(item.size)}});
};
})();