import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, renameSync, existsSync } from 'node:fs';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { id } from '../core/library';
import { Store } from './store';
import { validateBaseUrl } from './provider';
import Database from 'better-sqlite3';

const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const MAX_ARCHIVE=512*1024*1024;
export async function exportLibrary(store:Store,destination:string) {
  const temp=join(store.directory,`export-${id()}.sqlite`);
  try{
    await store.snapshot(temp);
    // Credential-store identities and model-discovery caches are host-local.
    // Strip them in the isolated snapshot, never in the active library.
    const snapshot=new Database(temp);
    try{snapshot.pragma('journal_mode = DELETE');snapshot.transaction(()=>{
      for(const row of snapshot.prepare('SELECT id,payload FROM profiles').all() as {id:string;payload:string}[]){const p=JSON.parse(row.payload);delete p.credentialId;delete p.discoveredAt;p.models=[];snapshot.prepare('UPDATE profiles SET payload=? WHERE id=?').run(JSON.stringify(p),row.id);}
      for(const row of snapshot.prepare('SELECT id,payload FROM runs').all() as {id:string;payload:string}[]){const r=JSON.parse(row.payload);delete r.profile.credentialId;delete r.profile.discoveredAt;r.profile.models=[];snapshot.prepare('UPDATE runs SET payload=? WHERE id=?').run(JSON.stringify(r),row.id);}
    })();if(snapshot.pragma('quick_check',{simple:true})!=='ok')throw new Error('Snapshot verification failed.');}finally{snapshot.close();}
    const files:Record<string,Uint8Array>={'library.sqlite':readFileSync(temp)};
    for(const asset of Object.values(store.state.assets))files[`assets/${asset.id}`]=store.bytes(asset.id);
    const entries=Object.entries(files).map(([path,data])=>({path,bytes:data.length,sha256:digest(data)}));
    if(entries.reduce((sum,f)=>sum+f.bytes,0)>MAX_ARCHIVE)throw new Error('This library exceeds the 512 MiB portable-archive safety limit.');
    files['manifest.json']=strToU8(JSON.stringify({format:'flamehorn-library',schema:1,created:new Date().toISOString(),files:entries}));
    const archive=zipSync(files,{level:1});writeFileSync(destination+'.pending',archive);renameSync(destination+'.pending',destination);
    return {bytes:archive.length,sha256:digest(archive)};
  }finally{if(existsSync(temp))rmSync(temp);}
}
export function importLibrary(archivePath:string,librariesRoot:string) {
  const archive=readFileSync(archivePath);if(archive.length>MAX_ARCHIVE)throw new Error('Archive exceeds 512 MiB.');
  let expanded=0;const seen=new Set<string>();
  const files=unzipSync(archive,{filter:file=>{
    if(seen.has(file.name))throw new Error('Archive contains duplicate paths.');seen.add(file.name);
    if(!/^(manifest\.json|library\.sqlite|assets\/[a-f0-9]{64})$/.test(file.name))throw new Error('Archive contains an unsafe or unexpected path.');
    expanded+=file.originalSize;if(expanded>MAX_ARCHIVE)throw new Error('Archive expansion exceeds 512 MiB.');return true;
  }});
  if(!files['manifest.json'])throw new Error('Library manifest missing.');
  const manifest=JSON.parse(strFromU8(files['manifest.json']));
  if(manifest.format!=='flamehorn-library'||manifest.schema!==1||!Array.isArray(manifest.files))throw new Error('Unsupported library archive/schema.');
  const names=new Set<string>();for(const entry of manifest.files){if(names.has(entry.path))throw new Error('Duplicate manifest path.');names.add(entry.path);const bytes=files[entry.path];if(!bytes||entry.bytes!==bytes.length||entry.sha256!==digest(bytes))throw new Error('Archive checksum mismatch.');}
  if(!names.has('library.sqlite')||Object.keys(files).some(k=>k!=='manifest.json'&&!names.has(k)))throw new Error('Archive file manifest is not closed.');
  mkdirSync(librariesRoot,{recursive:true});const directory=join(librariesRoot,`import-${id()}`);mkdirSync(join(directory,'assets'),{recursive:true});
  let store:Store|undefined;
  try{
    for(const name of names)writeFileSync(join(directory,name),files[name]);
    store=new Store(directory);
    for(const c of Object.values(store.state.contents))if(digest(Buffer.from(JSON.stringify({text:c.text,attachments:c.attachments})))!==c.id)throw new Error('Immutable content checksum mismatch.');
    for(const p of [...Object.values(store.state.profiles),...Object.values(store.state.runs).map(r=>r.profile)]){
      const base=validateBaseUrl(p.baseUrl);if(p.kind==='chatgpt'&&(base!=='https://api.openai.com/v1'||p.mode!=='responses'))throw new Error('Invalid ChatGPT endpoint in archive.');
    }
    for(const asset of Object.values(store.state.assets))store.bytes(asset.id);
    for(const rep of Object.values(store.state.representations))if(!store.state.assets[rep.assetId])throw new Error('Archive has a dangling representation.');
    for(const entry of Object.values(store.state.entries))if(!store.state.contents[entry.contentId]||!store.state.nodes[entry.nodeId])throw new Error('Archive has dangling material.');
    for(const c of Object.values(store.state.contents))for(const rep of c.attachments)if(!store.state.representations[rep])throw new Error('Archive has a missing attachment representation.');
    store.transaction(s=>{for(const p of Object.values(s.profiles)){p.credentialId=undefined;p.discoveredAt=undefined;if(p.kind==='chatgpt')p.models=[];}});
    store.close();return directory;
  }catch(error){if(store?.db.open)store.close();const target=resolve(directory),within=relative(resolve(librariesRoot),target);if(within&&!within.startsWith('..')&&!isAbsolute(within))rmSync(target,{recursive:true,force:true});throw error;}
}
export async function dailyBackup(store:Store,backupRoot:string) {
  mkdirSync(backupRoot,{recursive:true});const date=new Date().toLocaleDateString('en-CA',{timeZone:'Australia/Sydney'});
  const prefix=`daily-${store.state.id}-`,destination=join(backupRoot,`${prefix}${date}.flamehorn`);
  if(!existsSync(destination))await exportLibrary(store,destination);
  const names=readdirSync(backupRoot).filter(n=>n.startsWith(prefix)&&n.endsWith('.flamehorn')).sort().reverse();
  for(const old of names.slice(3))rmSync(join(backupRoot,old));
}
