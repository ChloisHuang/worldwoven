// Temporary, bounded candidate UI graph for same-site visual review before
// enabling the product change. No game entry, save adapter, or runtime main.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const files=['object-action-menu.js','contextual-action-menu.js','player-interaction-intents.js','player-conversation-ui.js','npc-social.js','airy-panel.js','wallet.js','wallet.css','game.css'];
const directory='source/qa/nearby-candidate',sha=value=>createHash('sha256').update(value).digest('hex');
fs.mkdirSync(directory,{recursive:true});const manifest={scope:'QA-only candidate UI, production entry unchanged',files:{}};
for(const file of files){const source=fs.readFileSync('source/game/'+file,'utf8');
 const body=file.endsWith('.js')?source.replace(/(['"])(\.\/[^'"]+)\1/g,(match,quote,specifier)=>files.includes(specifier.slice(2))?match:quote+'../../game/'+specifier.slice(2)+quote):source;
 fs.writeFileSync(path.join(directory,file),body);manifest.files[file]={sourceSha256:sha(source),candidateSha256:sha(body)};
}
fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared '+files.length+' isolated UI files; no main/entry/storage copied.');
