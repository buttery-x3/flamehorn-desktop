import Database from 'better-sqlite3';
import { mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, fsyncSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { initialState } from '../core/library';
import type { LibraryState } from '../core/types';
import { validateState } from '../core/state-validation';

const maps=['workspaces','nodes','edges','entries','contents','assets','representations','profiles','runs'] as const;
export class Store {
  readonly db: Database.Database;
  state:LibraryState;
  constructor(readonly directory:string) {
    mkdirSync(directory,{recursive:true});mkdirSync(join(directory,'assets'),{recursive:true});
    this.db=new Database(join(directory,'library.sqlite'));
    const version=this.db.pragma('user_version',{simple:true}) as number;
    if(version>1){this.db.close();throw new Error(`This library uses schema ${version}. Install a compatible newer Flamehorn version.`);}
    if(version===0&&(this.db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get() as {count:number}).count){this.db.close();throw new Error('This unversioned library has no supported migration. Its existing data was not changed.');}
    try {
    this.db.pragma('trusted_schema = OFF');this.db.pragma('journal_mode = WAL');this.db.pragma('synchronous = FULL');this.db.pragma('foreign_keys = ON');
    this.db.exec(`CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS nodes(id TEXT PRIMARY KEY,workspaceId TEXT NOT NULL REFERENCES workspaces(id),payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS contents(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY,nodeId TEXT NOT NULL REFERENCES nodes(id),contentId TEXT NOT NULL REFERENCES contents(id),payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS edges(id TEXT PRIMARY KEY,workspaceId TEXT NOT NULL REFERENCES workspaces(id),source TEXT NOT NULL REFERENCES nodes(id),target TEXT NOT NULL REFERENCES nodes(id),payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS representations(id TEXT PRIMARY KEY,assetId TEXT NOT NULL REFERENCES assets(id),payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,workspaceId TEXT NOT NULL REFERENCES workspaces(id),payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS commits(runId TEXT NOT NULL REFERENCES runs(id),slot TEXT NOT NULL,versionId TEXT NOT NULL REFERENCES entries(id),PRIMARY KEY(runId,slot));`);
    this.db.pragma('user_version = 1');
    const meta=this.db.prepare('SELECT value FROM metadata WHERE key=?').get('library') as {value:string}|undefined;
    if(meta) {
      this.state=JSON.parse(meta.value);
      for(const key of maps) this.state[key]=Object.fromEntries((this.db.prepare(`SELECT id,payload FROM ${key}`).all() as {id:string;payload:string}[]).map(r=>[r.id,JSON.parse(r.payload)]));
      this.state=validateState(this.state);
      const check=this.db.pragma('quick_check',{simple:true});if(check!=='ok')throw new Error('Library integrity check failed. Restore a verified backup.');
      if((this.db.pragma('foreign_key_check') as unknown[]).length)throw new Error('Library references failed their integrity check.');
    } else {this.state=initialState();this.db.transaction(()=>this.persist())();}
    } catch(error){this.db.close();throw error;}
  }
  transaction<T>(operation:(state:LibraryState)=>T):T {
    const before=structuredClone(this.state);
    try{return this.db.transaction(()=>{const result=operation(this.state);this.state.revision++;this.persist();return result;})();}
    catch(error){this.state=before;throw error;}
  }
  private persist() {
    const state=this.state;
    const columns:Record<string,string[]>={nodes:['workspaceId'],edges:['workspaceId','source','target'],entries:['nodeId','contentId'],representations:['assetId'],runs:['workspaceId']};
    // Parent rows precede children. Immutable content is globally shared by digest.
    for(const key of ['workspaces','contents','nodes','entries','edges','assets','representations','profiles','runs'] as typeof maps[number][]) {
      const extra=columns[key]??[];
      const names=['id',...extra,'payload'];
      const stmt=this.db.prepare(`INSERT INTO ${key} (${names.join(',')}) VALUES (${names.map(()=>'?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${names.slice(1).map(n=>`${n}=excluded.${n}`).join(',')} WHERE payload != excluded.payload`);
      for(const value of Object.values(state[key])) {const row=value as unknown as Record<string,unknown>;stmt.run(row.id,...extra.map(k=>row[k]),JSON.stringify(row));}
    }
    const edgeIds=new Set(Object.keys(state.edges));
    for(const row of this.db.prepare('SELECT id FROM edges').all() as {id:string}[]) if(!edgeIds.has(row.id))this.db.prepare('DELETE FROM edges WHERE id=?').run(row.id);
    // Purge removes children before parents; retained entries/runs have already been traced by the reference walk.
    for(const row of this.db.prepare('SELECT DISTINCT runId FROM commits').all() as {runId:string}[])if(!state.runs[row.runId])this.db.prepare('DELETE FROM commits WHERE runId=?').run(row.runId);
    for(const key of ['entries','runs','representations','nodes','contents','assets','profiles','workspaces'] as typeof maps[number][]){
      for(const row of this.db.prepare(`SELECT id FROM ${key}`).all() as {id:string}[])if(!state[key][row.id])this.db.prepare(`DELETE FROM ${key} WHERE id=?`).run(row.id);
    }
    const meta=Object.fromEntries(Object.entries(state).filter(([key])=>!maps.includes(key as typeof maps[number])));
    this.db.prepare('INSERT INTO metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('library',JSON.stringify(meta));
    for(const run of Object.values(state.runs))for(const slot of run.outputs)if(slot.resultVersionId&&!slot.carried)this.db.prepare('INSERT OR IGNORE INTO commits(runId,slot,versionId) VALUES(?,?,?)').run(run.id,slot.id,slot.resultVersionId);
  }
  bytes(assetId:string):Buffer {
    if(!/^[a-f0-9]{64}$/.test(assetId))throw new Error('Invalid asset identity.');
    const asset=this.state.assets[assetId];if(!asset)throw new Error('Asset metadata is unavailable.');
    const data=readFileSync(join(this.directory,'assets',assetId));
    if(data.length!==asset.bytes||createHash('sha256').update(data).digest('hex')!==assetId)throw new Error(`Asset ${asset.name} is missing or corrupt.`);
    return data;
  }
  putBlob(data:Uint8Array):string {
    const hash=createHash('sha256').update(data).digest('hex'),dest=join(this.directory,'assets',hash);
    if(existsSync(dest)){if(!readFileSync(dest).equals(Buffer.from(data)))throw new Error('Immutable asset collision.');return hash;}
    const temp=dest+'.pending';const fd=openSync(temp,'w');try{writeFileSync(fd,data);fsyncSync(fd);}finally{closeSync(fd);}renameSync(temp,dest);return hash;
  }
  async snapshot(destination:string){await this.db.backup(destination);}
  close(){this.db.pragma('wal_checkpoint(TRUNCATE)');this.db.close();}
}
