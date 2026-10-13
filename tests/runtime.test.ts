import { afterEach, describe, expect, it } from 'vitest';
import { fixture } from './helpers';
import { Runtime, validatePlan } from '../src/main/runtime';
import { addNode, connect, editMaterial, id } from '../src/core/library';
import { CATALOG } from '../src/core/catalog';
import { Store } from '../src/main/store';
import type { Kind, Recipe } from '../src/core/types';
let stores:Store[]=[];afterEach(()=>{stores.forEach(s=>s.close());stores=[];});
function setup(kind:Kind='Respond'){const f=fixture(kind);stores.push(f.store);return f;}
describe('Bounded manual execution and durable retention',()=>{
  it('DA08/RT10 atomically retains completed text before a later phase failure or restart',async()=>{
    const {store,processId,directory}=setup();let calls=0;const runtime=new Runtime(store,async()=>{calls++;return{text:'Durable completion before phase change'};});
    const phase=(runtime as any).phase.bind(runtime);(runtime as any).phase=(runId:string,value:string)=>{if(value==='Validating')throw new Error('Controlled interruption between completion and validation');return phase(runId,value);};
    const runId=runtime.run(processId,id());await runtime.wait();expect(store.state.runs[runId].outputs[0].staged).toBe('Durable completion before phase change');
    store.close();stores=stores.filter(s=>s!==store);const reopened=new Store(directory);stores.push(reopened);const recovery=new Runtime(reopened,async()=>{throw new Error('Must not infer again');});recovery.recoverInterrupted();recovery.saveRecovered(runId,'1');expect(reopened.state.runs[runId].state).toBe('Completed');expect(calls).toBe(1);
  });
  for(const kind of Object.keys(CATALOG) as Kind[])it(`RT02 ${kind}: exact fixed slots and normal call count`,async()=>{
    const {store,processId}=setup(kind);let calls=0;
    const runtime=new Runtime(store,async(_profile,recipe)=>{calls++;return {text:recipe.instructions.includes('Allocate the ')?JSON.stringify({slots:CATALOG[kind].outputs.map((_,i)=>({slot:i+1,brief:`Direction ${i+1}`}))}):`Result ${calls}`};});
    const runId=runtime.run(processId,id());await runtime.wait();const run=store.state.runs[runId];expect(run.state).toBe('Completed');expect(calls).toBe(CATALOG[kind].calls);expect(run.outputs.map(o=>o.id)).toEqual(CATALOG[kind].outputs);expect(run.outputs.every(o=>o.resultVersionId)).toBe(true);
  });
  it('RT01 preflight does not create destinations or runs for empty input',()=>{
    const {store,processId,sourceId}=setup();editMaterial(store.state,store.state.nodes[sourceId],'');const before=Object.keys(store.state.nodes).length;const runtime=new Runtime(store,async()=>{throw new Error('must not send');});expect(()=>runtime.run(processId,id())).toThrow('empty');expect(Object.keys(store.state.nodes)).toHaveLength(before);expect(Object.keys(store.state.runs)).toHaveLength(0);
  });
  it('RT03/RT04 double delivery is idempotent; another action is rejected; source changes affect only the next run',async()=>{
    const {store,processId,sourceId}=setup();let release!:(v:{text:string})=>void;let sent:Recipe|undefined;
    const runtime=new Runtime(store,async(_p,recipe)=>{sent=recipe;return new Promise(resolve=>release=resolve);});const action=id(),runId=runtime.run(processId,action);expect(runtime.run(processId,action)).toBe(runId);expect(()=>runtime.run(processId,id())).toThrow('Another');
    const old=sent!.manifest[0].contentId;store.transaction(s=>{editMaterial(s,s.nodes[sourceId],'Edited while running');s.nodes[sourceId].role='assistant';});release({text:'Complete'});await runtime.wait();expect(store.state.contents[old].text).toContain('shared workshop');expect(store.state.runs[runId].compiled.manifest[0].role).toBe('user');
  });
  it('RT05 malformed plans never start development',async()=>{
    const {store,processId}=setup('Fork');let calls=0;const runtime=new Runtime(store,async()=>{calls++;return{text:'```json\n{}\n```'};});const runId=runtime.run(processId,id());await runtime.wait();expect(calls).toBe(1);expect(store.state.runs[runId].state).toBe('Failed');expect(store.state.runs[runId].outputs.every(o=>!o.resultVersionId)).toBe(true);
    for(const text of ['{"slots":[{"slot":1,"brief":"x"},{"slot":1,"brief":"y"}]}','{"slots":[{"slot":1,"brief":""},{"slot":2,"brief":"y"}]}','{"slots":[{"slot":1,"brief":"x","extra":true},{"slot":2,"brief":"y"}]}'])expect(()=>validatePlan(text,2)).toThrow();
  });
  it('RT06 omitted Process/Persona/Format are absent from every planner/development request',async()=>{
    const {store,processId}=setup('Fork');const config=store.state.nodes[processId].process!;config.template='Only this custom experiment.';config.instruction='SECRET_PROCESS_COMPONENT';config.persona.text='SECRET_PERSONA_COMPONENT';config.format.text='SECRET_FORMAT_COMPONENT';
    const recipes:Recipe[]=[];const runtime=new Runtime(store,async(_p,recipe)=>{recipes.push(recipe);return{text:recipe.instructions.includes('Allocate the ')?'{"slots":[{"slot":1,"brief":"x"},{"slot":2,"brief":"y"}]}':'done'};});runtime.run(processId,id());await runtime.wait();for(const r of recipes)expect(r.instructions).not.toContain('SECRET_');
  });
  it('RT07/DA04/DA09 Append is literal and duplicate commits cannot append twice',async()=>{
    const {store,processId,sourceId}=setup();const s=store.state,n=s.nodes[sourceId];editMaterial(s,n,'A\n');connect(s,processId,'1',sourceId,'in');s.nodes[processId].process!.append=true;
    const runtime=new Runtime(store,async()=>({text:'B'})),runId=runtime.run(processId,id());await runtime.wait();const entryId=store.state.nodes[sourceId].selected!;expect(store.state.contents[store.state.entries[entryId].contentId].text).toBe('A\nB');expect(runtime.commit(runId,'1')).toBe(entryId);expect(store.state.contents[store.state.entries[entryId].contentId].text).toBe('A\nB');
  });
  it('RT08/RT09 partial Explode retains 3 outputs; recovery sends only 4–8 and refuses changed bases',async()=>{
    const {store,processId}=setup('Explode');let calls=0,fail=true;const runtime=new Runtime(store,async(_p,recipe)=>{calls++;if(recipe.instructions.includes('Allocate the '))return{text:JSON.stringify({slots:Array.from({length:8},(_,i)=>({slot:i+1,brief:`d${i}`}))})};if(calls===5&&fail)throw new Error('Controlled EOF');return{text:`saved ${calls}`};});
    const runId=runtime.run(processId,id());await runtime.wait();const run=store.state.runs[runId];expect(run.state).toBe('Partial');expect(run.outputs.filter(o=>o.resultVersionId)).toHaveLength(3);const originals=run.outputs.slice(0,3).map(o=>o.resultVersionId);fail=false;const next=runtime.recovery(runId,id());await runtime.wait();expect(calls).toBe(10);expect(store.state.runs[next].state).toBe('Completed');expect(store.state.runs[next].outputs.slice(0,3).map(o=>o.resultVersionId)).toEqual(originals);expect(()=>runtime.recovery(runId,id())).toThrow('changed');
  });
  it('RT11 cancellation recorded before completion prevents commitment',async()=>{
    const {store,processId}=setup();let release!:(v:{text:string})=>void;const runtime=new Runtime(store,()=>new Promise(resolve=>release=resolve));const runId=runtime.run(processId,id());runtime.stop();release({text:'Late result'});await runtime.wait();expect(store.state.runs[runId].state).toBe('Cancelled');expect(store.state.runs[runId].outputs[0].resultVersionId).toBeUndefined();
  });
  it('RT10/DA09 a completed staged result survives a commit failure and saves without another call',async()=>{
    const {store,processId}=setup();let calls=0;const runtime=new Runtime(store,async()=>{calls++;return {text:'Complete staged result'};});const commit=runtime.commit.bind(runtime);runtime.commit=()=>{throw new Error('Controlled commit failure');};const runId=runtime.run(processId,id());await runtime.wait();expect(store.state.runs[runId].state).toBe('Failed');expect(store.state.runs[runId].outputs[0].staged).toBe('Complete staged result');runtime.commit=commit;runtime.saveRecovered(runId,'1');expect(calls).toBe(1);expect(store.state.runs[runId].state).toBe('Completed');expect(store.state.runs[runId].outputs[0].resultVersionId).toBeDefined();
  });
  it('RT01 rejects actual encoded request overflow before destination creation',()=>{
    const {store,sourceId,processId,profileId}=setup();const p=store.state.profiles[profileId],model=store.state.workspaces[store.state.activeWorkspace].model!;p.modelCapabilities={[model]:{...p.capabilities,requestBytes:2000}};editMaterial(store.state,store.state.nodes[sourceId],'"'.repeat(1100));const before=Object.keys(store.state.nodes);expect(()=>new Runtime(store,async()=>({text:'Must not send'})).run(processId,id())).toThrow('byte limit');expect(Object.keys(store.state.nodes)).toEqual(before);expect(Object.keys(store.state.runs)).toHaveLength(0);
  });
  it('DA08/RT11 interrupted admission reopens without sending',()=>{
    const {store,processId,directory}=setup();const runtime=new Runtime(store,()=>new Promise(()=>{}));const runId=runtime.run(processId,id());store.close();stores=stores.filter(s=>s!==store);const reopened=new Store(directory);stores.push(reopened);let calls=0;const recovered=new Runtime(reopened,async()=>{calls++;return{text:'not allowed'};});recovered.recoverInterrupted();expect(reopened.state.runs[runId].state).toBe('Interrupted');expect(calls).toBe(0);
  });
});
