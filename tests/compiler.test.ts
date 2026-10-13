import { afterEach, describe, expect, it } from 'vitest';
import { fixture } from './helpers';
import { addNode, addWorkspace, connect, editMaterial, retain, setPreset } from '../src/core/library';
import { assemble, compile, connectionError } from '../src/core/compiler';
import { CATALOG, TEMPLATES } from '../src/core/catalog';
import type { Store } from '../src/main/store';
let stores:Store[]=[];afterEach(()=>{stores.forEach(s=>s.close());stores=[];});
function setup(){const f=fixture();stores.push(f.store);return f;}
describe('Approved compiler and node contracts',()=>{
  it('F1/F2/N16/N26 uses current selected versions and roles through upstream Processes',()=>{
    const {store,sourceId,processId}=setup();const s=store.state,ws=s.activeWorkspace;
    const output=addNode(s,ws,'context',0,0,'Respond','assistant'),next=addNode(s,ws,'context'),target=addNode(s,ws,'process');
    editMaterial(s,output,'Evening sessions.');editMaterial(s,next,'Which hours?');connect(s,processId,'1',output.id,'in');connect(s,output.id,'out',next.id,'in');connect(s,next.id,'out',target.id,'in');
    const original=retain(s,output)!;editMaterial(s,output,'Newer material');output.selected=original.id;
    const result=compile(s,target.id);expect(result.errors).toEqual([]);expect(result.manifest.map(m=>m.nodeId)).toEqual([sourceId,output.id,next.id]);expect(result.manifest.map(m=>m.role)).toEqual(['user','assistant','user']);
    output.role='user';expect(compile(s,target.id).manifest.map(m=>m.role)).toEqual(['user','user','user']);expect(result.manifest[1].role).toBe('assistant');
    expect(result.manifest[1].versionId).toBe(original.id);
  });
  it('F3 shared ancestry emits once in A-before-B order and preserves A=B',()=>{
    const {store,sourceId}=setup(),s=store.state,ws=s.activeWorkspace;
    const a=addNode(s,ws,'context'),b=addNode(s,ws,'context'),merge=addNode(s,ws,'process',0,0,'Merge');editMaterial(s,a,'A branch');editMaterial(s,b,'B branch');
    connect(s,sourceId,'out',a.id,'in');connect(s,sourceId,'out',b.id,'in');connect(s,a.id,'out',merge.id,'A');const bEdge=connect(s,b.id,'out',merge.id,'B');
    const result=compile(s,merge.id);expect(result.manifest.map(m=>m.nodeId)).toEqual([sourceId,a.id,b.id]);expect(result.manifest[0].branches).toEqual(['A','B']);expect(result.bindings).toEqual({A:a.id,B:b.id});
    delete s.edges[bEdge.id];connect(s,a.id,'out',merge.id,'B');expect(compile(s,merge.id).manifest).toHaveLength(2);expect(compile(s,merge.id).bindings).toEqual({A:a.id,B:a.id});
  });
  it('F4/N03–N06 cuts history, force-includes only own material, and ignores another Workspace',()=>{
    const {store,sourceId,processId}=setup(),s=store.state,ws=s.activeWorkspace;
    const old=addNode(s,ws,'context'),extra=addNode(s,ws,'context');editMaterial(s,old,'Not included');editMaterial(s,extra,'Supplementary');connect(s,old.id,'out',extra.id,'in');extra.force=true;s.nodes[sourceId].force=true;
    const other=addNode(s,addWorkspace(s,'Other').id,'context');editMaterial(s,other,'Other workspace');other.force=true;
    const result=compile(s,processId);expect(result.manifest.map(m=>m.nodeId)).toEqual([extra.id,sourceId]);expect(result.manifest[1].reasons).toEqual(['connected','forced']);
    expect(result.bindings.in).toBe(sourceId);
  });
  it('F5/N08 finite feedback includes the populated destination exactly once',()=>{
    const {store,sourceId,processId}=setup(),s=store.state;connect(s,processId,'1',sourceId,'in');s.nodes[processId].process!.append=true;
    const result=compile(s,processId);expect(result.manifest).toHaveLength(1);expect(result.cycles).toEqual([processId]);
  });
  it('F6 all eight literal template variants preserve independent omissions and nonrecursive components',()=>{
    const {store,processId}=setup(),config=store.state.nodes[processId].process!;expect(Object.keys(TEMPLATES)).toHaveLength(8);
    for(const [name,template] of Object.entries(TEMPLATES)){config.template=template;const result=assemble(config);expect(result.errors).toEqual([]);expect(result.omitted.includes('PERSONA')).toBe(!name.includes('Persona'));expect(result.omitted.includes('FORMAT')).toBe(!name.includes('Format'));}
    config.template='Only {{PERSONA}}';config.persona.text='Literal {{PROCESS}}';expect(assemble(config).instructions).toBe('Only Literal {{PROCESS}}');expect(assemble(config).omitted).toEqual(['PROCESS','FORMAT']);config.template='{{UNKNOWN}}';expect(assemble(config).errors[0]).toContain('Unknown');
  });
  it('N18 rejects occupied inputs, process routing and duplicate destinations; permits cycles',()=>{
    const {store,sourceId,processId}=setup(),s=store.state;
    expect(()=>connect(s,sourceId,'out',processId,'in')).toThrow('occupied');
    expect(()=>connect(s,processId,'1',processId,'in')).toThrow('only to Context');
    expect(()=>connect(s,processId,'1',sourceId,'in')).not.toThrow();
  });
  it('N14/N15/N23 named presets update defaults while Custom edits stay local',()=>{
    const {store,processId}=setup(),s=store.state,n=s.nodes[processId];setPreset(s,n,'persona','Formal');n.process!.persona={name:'Custom',text:'Local voice'};const next=addNode(s,s.activeWorkspace,'process');expect(next.process!.persona.name).toBe('Formal');expect(s.defaults.persona).toBe('Formal');expect(CATALOG.Explode.outputs).toHaveLength(8);
  });
  it('N21/N22/DA01–DA03 edits reuse one draft and older-selection conflicts require a decision',()=>{
    const {store,sourceId}=setup(),s=store.state,n=s.nodes[sourceId];for(let i=0;i<20;i++)editMaterial(s,n,`draft ${i}`);expect(Object.values(s.entries).filter(e=>e.nodeId===n.id)).toHaveLength(1);
    const old=retain(s,n)!;for(let i=0;i<20;i++)editMaterial(s,n,`new ${i}`);expect(Object.values(s.entries).filter(e=>e.nodeId===n.id)).toHaveLength(2);
    const draft=n.selected;n.selected=old.id;expect(()=>editMaterial(s,n,'conflict')).toThrow('DRAFT_CONFLICT');editMaterial(s,n,'ignored',undefined,'continue');expect(n.selected).toBe(draft);expect(s.contents[old.contentId].text).toBe('draft 19');
  });
});
