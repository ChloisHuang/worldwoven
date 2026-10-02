// Dependency-free local authoring server. Do not use as the public Site runtime.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'source'),port=Number(process.argv[3]||5173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{
  let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(url==='/'&&path.basename(root)==='source'){res.writeHead(302,{Location:'/game/'});res.end();return;}
  if(url.endsWith('/'))url+='index.html';
  const file=path.resolve(root,'.'+url);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
}catch(e){res.writeHead(e.code==='ENOENT'?404:400);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Local authoring: http://127.0.0.1:${port}/`));
