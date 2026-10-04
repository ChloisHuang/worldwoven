/** Bounded authoring preview, reuses the established complete-head lighting. */
import {registerHooks} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
registerHooks({load(url,c,next){const r=next(url,c);if(url.endsWith('/anatomical-head/load_study.mjs')){
 const extra='import {addLayeredHair} from '+JSON.stringify(pathToFileURL(ROOT+'/layered-hair.mjs').href)+';\n';
 return {...r,source:extra+String(r.source).replace('head.userData.anatomicalStudy=','addLayeredHair(head,C.hair);head.userData.anatomicalStudy=')};
}return r;}});
await import('../anatomical-head/render.mjs');
