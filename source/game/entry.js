/** Storage mode is locked before either main initialization or ledger restore.
 * A failed candidate import never falls through into an ordinary game boot. */
import {CHARACTER_PREVIEW_ENABLED} from './character-preview-gate.js';
try{
 if(CHARACTER_PREVIEW_ENABLED)await import('./character-preview-entry.js');
 await import('./main.js');
}catch(error){
 if(CHARACTER_PREVIEW_ENABLED){
  document.getElementById('loading').hidden=true;document.getElementById('error').hidden=false;
  document.getElementById('error-text').textContent='候选人物暂时未能打开，正式存档未修改。请刷新重试，或返回普通版本。';
  const link=document.getElementById('error').querySelector('a'),url=new URL(location.href);
  for(const key of['character-preview','preview-npcs','hair','flow'])url.searchParams.delete(key);link.href=url.href;
 }
 throw error;
}
