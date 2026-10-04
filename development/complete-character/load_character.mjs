/** Node-only isolated-preview asset loader. Runtime uses runtime-adapter.mjs. */
import fs from 'node:fs';
import {attachCompleteHead} from './attach_head.mjs';
import {addLayeredHair} from './layered-hair.mjs';
const assets={male:JSON.parse(fs.readFileSync(new URL('./adult-head.json',import.meta.url),'utf8')),female:JSON.parse(fs.readFileSync(new URL('./adult-head-female.json',import.meta.url),'utf8'))};
export function replaceWithCompleteAdult(root,C,{clay=false,surface=false,form='male'}={}){
 attachCompleteHead(root,C,assets[form],{clay,surface});
 if(!clay&&form==='male')addLayeredHair(root.getObjectByName('sculpted-head'),C.hair,{center:[0,1.54922,-.01644],radii:[.0828,.10647,.0966]});
}
