import {mkdir,copyFile,cp,readFile,rm,mkdtemp,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
const assets=process.env.GODOT_PREVIEW_ASSETS;
if(!assets) throw Error('GODOT_PREVIEW_ASSETS must name the validated compiled export directory');
await readFile(resolve(assets,'index.html'));
const previous=await mkdtemp(resolve(tmpdir(),'godot-previous-assets-'));
let retained=[];
try {
  try {
    const manifest=JSON.parse(await readFile('dist/client/asset-manifest.json','utf8'));
    retained=[...new Set([...Object.values(manifest.assets).flatMap(a=>a.chunks.map(c=>c.path)),...manifest.files.filter(p=>/^asset-loader\.[a-f0-9]+\.js$/.test(p))])];
    for(const path of retained){
      if(!/^(chunks\/[a-f0-9]+\.gz\.bin|asset-loader\.[a-f0-9]+\.js)$/.test(path))throw Error('Unexpected previous asset path');
      await mkdir(dirname(resolve(previous,path)),{recursive:true});
      await copyFile(resolve('dist/client',path),resolve(previous,path));
    }
  } catch(error) { if(error.code!=='ENOENT')throw error; retained=[]; }
  await rm('dist',{recursive:true,force:true});
  await mkdir('dist/server',{recursive:true});
  await mkdir('dist/.openai',{recursive:true});
  await cp(assets,'dist/client',{recursive:true});
  for(const path of retained){
    try{await access(resolve('dist/client',path));}catch{
      await mkdir(dirname(resolve('dist/client',path)),{recursive:true});
      await copyFile(resolve(previous,path),resolve('dist/client',path));
    }
  }
  await copyFile('worker/index.mjs','dist/server/index.js');
  await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
  console.log('Built compiled game + fixed read-only endpoint; retained only current and previous chunk/loader generations');
} finally { await rm(previous,{recursive:true,force:true}); }
