/** Offline compiler for reviewed geometry; emitted module has no fs/fetch/rays. */
import fs from 'node:fs';
import crypto from 'node:crypto';
const forms={};
for(const [form,file]of [['male','adult-head.json'],['female','adult-head-female.json']]){
 const bytes=fs.readFileSync(new URL('./'+file,import.meta.url)),source=JSON.parse(bytes);
 const parts=source.parts.map(part=>Object.fromEntries(Object.entries(part).map(([key,value])=>{
  if(!Array.isArray(value))return[key,value];
  const array=key==='index'?new Uint16Array(value):new Float32Array(value);
  return[key,{type:key==='index'?'u16':'f32',data:Buffer.from(array.buffer).toString('base64')}];
 })));
 forms[form]={license:source.license,sourceCommit:source.sourceCommit,sourceSha256:source.sourceSha256,reviewedAssetSha256:crypto.createHash('sha256').update(bytes).digest('hex'),form,parts};
}
const code=`/** Generated reviewed CC0-derived game meshes. Rebuild with compile-runtime-assets.mjs. */\nconst packed=${JSON.stringify(forms)};\nfunction decode(value){const bytes=Uint8Array.from(atob(value.data),c=>c.charCodeAt(0));return value.type==='u16'?new Uint16Array(bytes.buffer):new Float32Array(bytes.buffer);}\nfor(const form of Object.values(packed))for(const part of form.parts)for(const [key,value]of Object.entries(part))if(value&&typeof value==='object'&&value.type)part[key]=decode(value);\nexport const ADULT_FORMS=Object.freeze(packed);\n`;
fs.writeFileSync(new URL('../../source/game/complete-adult/assets/adult-forms-data.js',import.meta.url),code);
console.log(JSON.stringify({bytes:Buffer.byteLength(code),forms:Object.fromEntries(Object.entries(forms).map(([k,v])=>[k,v.reviewedAssetSha256]))}));
