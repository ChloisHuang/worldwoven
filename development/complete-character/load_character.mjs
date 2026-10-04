/** Node-only isolated-preview asset loader. Runtime uses runtime-adapter.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import {attachCompleteHead} from './attach_head.mjs';
import {addLayeredHair} from './layered-hair.mjs';
const readAsset=name=>JSON.parse(fs.readFileSync(process.env.PREVIEW_ASSET_ROOT?path.join(process.env.PREVIEW_ASSET_ROOT,name):new URL('./'+name,import.meta.url),'utf8'));
const assets={male:readAsset('adult-head.json'),female:readAsset('adult-head-female.json')};
export function replaceWithCompleteAdult(root,C,{clay=false,surface=false,form='male'}={}){
 attachCompleteHead(root,C,assets[form],{clay,surface});
 if(!clay&&form==='male')addLayeredHair(root.getObjectByName('sculpted-head'),C.hair);
}
