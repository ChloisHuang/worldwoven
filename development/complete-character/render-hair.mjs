/** Bounded authoring preview, reuses the established complete-head lighting. */
import {registerHooks} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const complete=process.env.COMPLETE_CHARACTER_ROOT;
registerHooks({resolve(s,c,next){if(complete&&s==='./layered-hair.mjs'&&c.parentURL?.startsWith(pathToFileURL(complete).href))return {url:pathToFileURL(ROOT+'/layered-hair.mjs').href,shortCircuit:true};return next(s,c);},load(url,c,next){const r=next(url,c);if(url.endsWith('/anatomical-head/load_study.mjs')){
 const extra='import {addLayeredHair} from '+JSON.stringify(pathToFileURL(ROOT+'/layered-hair.mjs').href)+';\n';
 return {...r,source:extra+String(r.source).replace('head.userData.anatomicalStudy=','addLayeredHair(head,C.hair);head.userData.anatomicalStudy=')};
}return r;}});
await import(complete?pathToFileURL(path.resolve(complete,'development/complete-character/render.mjs')).href:'../anatomical-head/render.mjs');
