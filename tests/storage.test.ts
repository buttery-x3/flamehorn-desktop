import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { zipSync, unzipSync, strToU8 } from 'fflate';
import { fixture } from './helpers';
import { Store } from '../src/main/store';
import { exportLibrary, importLibrary } from '../src/main/archive';
import { Runtime } from '../src/main/runtime';
import { editMaterial, id, undo, connect } from '../src/core/library';
import { extract } from '../src/core/extraction';
import { compile } from '../src/core/compiler';
let stores:Store[]=[];afterEach(()=>{stores.forEach(s=>s.close());stores=[];});
function setup(){const f=fixture();stores.push(f.store);return f;}
describe('Library, recovery and extraction',()=>{
  it('DA13 whole-library archive round trips immutable assets, graph, drafts and runs',async()=>{
    const {store,sourceId,processId,directory}=setup();const bytes=Buffer.from('Retained original bytes'),asset=store.putBlob(bytes);
    store.transaction(s=>{s.assets[asset]={id:asset,name:'fixture.txt',mime:'text/plain',bytes:bytes.length};const rep=id();s.representations[rep]={id:rep,assetId:asset,mode:'text',text:bytes.toString(),parser:'UTF-8',warnings:[],acknowledged:true};editMaterial(s,s.nodes[sourceId],'Input',[rep]);});
    const runtime=new Runtime(store,async()=>({text:'Output'}));runtime.run(processId,id());await runtime.wait();const path=join(directory,'fixture.flamehorn');await exportLibrary(store,path);const imported=importLibrary(path,join(directory,'imports')),copy=new Store(imported);stores.push(copy);
    const portableRuns=JSON.parse(JSON.stringify(store.state.runs));for(const run of Object.values(portableRuns) as any[]){delete run.profile.credentialId;delete run.profile.discoveredAt;run.profile.models=[];}
    expect(copy.state.nodes).toEqual(JSON.parse(JSON.stringify(store.state.nodes)));expect(copy.state.runs).toEqual(portableRuns);expect(copy.bytes(asset)).toEqual(bytes);expect(Object.values(copy.state.profiles).every(p=>!p.credentialId&&!p.discoveredAt&&!p.models.length)).toBe(true);expect(Object.values(store.state.profiles)[0].models.length).toBe(1);
    const files=unzipSync(readFileSync(path));expect(Object.keys(files).every(k=>k==='manifest.json'||k==='library.sqlite'||k.startsWith('assets/'))).toBe(true);
  });
  it('DA13 rejects archive traversal and checksum corruption without touching the current library',async()=>{
    const {store,directory}=setup();const before=JSON.stringify(store.state),path=join(directory,'bad.flamehorn');writeFileSync(path,zipSync({'../escape':strToU8('bad')}));expect(()=>importLibrary(path,join(directory,'imports'))).toThrow('unsafe');
    await exportLibrary(store,path);const files=unzipSync(readFileSync(path));files['library.sqlite'][0]^=1;writeFileSync(path,zipSync(files));expect(()=>importLibrary(path,join(directory,'imports'))).toThrow('checksum');expect(JSON.stringify(store.state)).toBe(before);
  });
  it('DA14 unknown future schema is refused without changing its version',()=>{
    const {store,directory}=setup();store.db.pragma('user_version = 999');store.close();stores=stores.filter(s=>s!==store);expect(()=>new Store(directory)).toThrow('schema 999');
  });
  it('DA16 failed database transaction restores memory as well as durable state',()=>{
    const {store,sourceId}=setup();const before=JSON.stringify(store.state);expect(()=>store.transaction(s=>{editMaterial(s,s.nodes[sourceId],'Not acknowledged');throw new Error('Controlled disk failure');})).toThrow();expect(JSON.stringify(store.state)).toBe(before);
  });
  it('DA16 a real SQLite write rejection is not acknowledged as a save',()=>{
    const {store,sourceId}=setup();const before=JSON.stringify(store.state);store.db.pragma('query_only = ON');expect(()=>store.transaction(s=>editMaterial(s,s.nodes[sourceId],'Rejected by SQLite'))).toThrow();expect(JSON.stringify(store.state)).toBe(before);store.db.pragma('query_only = OFF');
  });
  it('DA04 Undo output restores captured selection while preserving generated versions',async()=>{
    const {store,sourceId,processId}=setup();const runtime=new Runtime(store,async()=>({text:'Generated'}));const runId=runtime.run(processId,id());await runtime.wait();const version=store.state.runs[runId].outputs[0].resultVersionId!;store.transaction(s=>undo(s,s.activeWorkspace));expect(store.state.entries[version].retained).toBe(true);expect(store.state.runs[runId].state).toBe('Completed');
  });
  it('DA11/DA12 extraction uses historical material/settings and never consults current links',async()=>{
    const {store,sourceId,processId}=setup();store.state.nodes[processId].process!.persona={name:'Formal',text:'The old voice'};const runtime=new Runtime(store,async()=>({text:'Historical output'})),runId=runtime.run(processId,id());await runtime.wait();const output=store.state.runs[runId].outputs[0];
    store.transaction(s=>{editMaterial(s,s.nodes[sourceId],'New current input');s.nodes[sourceId].role='assistant';s.nodes[processId].process!.persona={name:'Custom',text:'New voice'};});
    const oldWorkspace=store.state.activeWorkspace,oldNodes=JSON.stringify(Object.values(store.state.nodes).filter(n=>n.workspaceId===oldWorkspace)),defaults=JSON.stringify(store.state.defaults);
    const result=store.transaction(s=>extract(s,output.nodeId));const copied=Object.values(store.state.nodes).filter(n=>n.workspaceId===result.workspaceId);const process=copied.find(n=>n.process)!;
    expect(process.process!.persona.text).toBe('The old voice');const next=compile(store.state,process.id);expect(next.manifest[0].role).toBe('user');expect(store.state.contents[next.manifest[0].contentId].text).toContain('shared workshop');expect(JSON.stringify(Object.values(store.state.nodes).filter(n=>n.workspaceId===oldWorkspace))).toBe(oldNodes);expect(JSON.stringify(store.state.defaults)).toBe(defaults);
  });
  it('DA11 feedback extraction separates captured input from the newly generated output',async()=>{
    const {store,sourceId,processId}=setup();store.transaction(s=>connect(s,processId,'1',sourceId,'in'));const runtime=new Runtime(store,async()=>({text:'New feedback result'})),runId=runtime.run(processId,id());await runtime.wait();const original=store.state.runs[runId];const copied=store.transaction(s=>extract(s,sourceId));const process=Object.values(store.state.nodes).find(n=>n.workspaceId===copied.workspaceId&&n.process)!;const preview=compile(store.state,process.id);expect(preview.errors).toEqual([]);expect(preview.manifest.map(m=>m.contentId)).toEqual(original.compiled.manifest.map(m=>m.contentId));const edge=Object.values(store.state.edges).find(e=>e.source===process.id)!;expect(preview.manifest.some(m=>m.nodeId===edge.target)).toBe(false);
  });
  it('DA12 manual draft extraction captures bytes without depending on the mutable source entry',()=>{
    const {store,sourceId}=setup(),originalId=store.state.nodes[sourceId].selected!;const copied=store.transaction(s=>extract(s,sourceId));const node=Object.values(store.state.nodes).find(n=>n.workspaceId===copied.workspaceId)!;const entry=store.state.entries[node.selected!];expect(entry.basedOn).toBeUndefined();expect(store.state.entries[originalId].retained).toBe(false);const original=entry.contentId;store.transaction(s=>editMaterial(s,s.nodes[sourceId],'Later draft edit'));expect(store.state.entries[node.selected!].contentId).toBe(original);
  });
});
