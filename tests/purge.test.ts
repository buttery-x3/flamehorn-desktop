import { afterEach, describe, expect, it } from 'vitest';
import { fixture } from './helpers';
import { Store } from '../src/main/store';
import { Controller } from '../src/main/controller';
import { Runtime } from '../src/main/runtime';
import { editMaterial, id, addNode, removeNode, addWorkspace } from '../src/core/library';
import { purge, purgePlan } from '../src/core/purge';
import { extract } from '../src/core/extraction';
const stores:Store[]=[];afterEach(()=>{for(const store of stores)if(store.db.open)store.close();stores.length=0;});
function setup(){const f=fixture();stores.push(f.store);return f;}
describe('Reference-aware permanent removal',()=>{
  it('removes orphan material and its undo, while retained run input survives without Trash restoration',async()=>{
    const {store,processId,sourceId,directory}=setup();const runtime=new Runtime(store,async()=>({text:'A retained result'}));runtime.run(processId,id());await runtime.wait();store.transaction(s=>{editMaterial(s,s.nodes[sourceId],'An unretained change');removeNode(s,s.nodes[sourceId]);});
    const plan=store.transaction(s=>purge(s));expect(plan.protectedNodes).toContain(sourceId);expect(store.state.nodes[sourceId].purged).toBe(true);expect(store.state.nodes[sourceId].selected).toBeUndefined();
    await expect(new Controller(store,async()=>({text:''})).command({type:'node.restore',id:sourceId})).rejects.toThrow('permanently');
    store.close();const reopened=new Store(directory);stores.push(reopened);expect(Object.values(reopened.state.runs)[0].compiled.manifest[0].nodeId).toBe(sourceId);
  });
  it('purges an exclusive removed workspace, but protects shared extracted provenance',async()=>{
    const {store,processId}=setup(),runtime=new Runtime(store,async()=>({text:'Historical result'})),runId=runtime.run(processId,id());await runtime.wait();const oldWorkspace=store.state.activeWorkspace;
    store.transaction(s=>{extract(s,s.runs[runId].outputs[0].nodeId);s.workspaces[oldWorkspace].removed=true;});const plan=store.transaction(s=>purge(s,oldWorkspace));expect(plan.runs).toEqual([]);expect(store.state.runs[runId]).toBeDefined();expect(store.state.workspaces[oldWorkspace].purged).toBe(true);
    const controller=new Controller(store,async()=>({text:''}));await expect(controller.command({type:'workspace.restore',id:oldWorkspace})).rejects.toThrow('permanently');
  });
  it('blocks purging during an active run and permits deleting a frozen input source',async()=>{
    const {store,processId,sourceId}=setup();let finish!:(value:{text:string})=>void;const runtime=new Runtime(store,()=>new Promise(resolve=>finish=resolve));const runId=runtime.run(processId,id());expect(()=>purgePlan(store.state)).toThrow('active run');store.transaction(s=>removeNode(s,s.nodes[sourceId]));finish({text:'Completed from original input'});await runtime.wait();expect(store.state.runs[runId].state).toBe('Completed');
  });
  it('removes an unreferenced workspace entirely',()=>{
    const {store}=setup();const ws=store.transaction(s=>{const w=addWorkspace(s,'Temporary');addNode(s,w.id,'context');w.removed=true;return w.id;});store.transaction(s=>purge(s,ws));expect(store.state.workspaces[ws]).toBeUndefined();
  });
});
