/** Loopback-only development entry. No Site, upload, external bind or build change. */
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..'),port=Number(process.argv[2]||5186);
const types={'.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.html':'text/html; charset=utf-8'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
 if(pathname==='/'||pathname==='/game/'){
  const html=(await fs.readFile(path.join(root,'source/game/index.html'),'utf8')).replace('./game.css?rev=R7-20261002','/source/game/game.css').replace('../vendor/three/build/three.module.js','/source/vendor/three/build/three.module.js').replace('./main.js?rev=R7-20261002','/development/actor-model-preview/bootstrap.mjs').replace('R16.53 · 2026.10.04 · PUBLIC','DEV · 人物候选 · 未发布');
  res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-store'});res.end(html);return;
 }
 const file=path.resolve(root,'.'+pathname),allowed=['source','development/actor-model-preview'].some(dir=>file.startsWith(path.join(root,dir)+path.sep));
 if(!allowed){res.writeHead(404);res.end('Not found');return;}
 const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:400);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Actor development only: http://127.0.0.1:${port}/?hair=long#france`));
