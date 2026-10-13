import { pdf } from '../scripts/fixtures.mjs';
import { afterEach, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fixture } from './helpers';
import { Store } from '../src/main/store';
import { importAsset, previewPdf } from '../src/main/assets';
import { Controller } from '../src/main/controller';
import { compile } from '../src/core/compiler';
import { DEFAULT_CAPABILITIES, profileForModel } from '../src/core/catalog';
import { encode } from '../src/main/encoding';
import type { Recipe } from '../src/core/types';

const stores:Store[]=[];afterEach(()=>{for(const store of stores)if(store.db.open)store.close();stores.length=0;});
function setup(){const f=fixture();stores.push(f.store);return f;}
const worker=resolve('dist/pdf-worker.cjs');
describe('Managed attachments',()=>{
  it('F7/AP09 preserves exact image bytes in both encodings and gates each message role',async()=>{
    const {store,sourceId,processId,profileId,directory}=setup(),path=join(directory,'pixel.png');
    const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');writeFileSync(path,bytes);await importAsset(store,path,sourceId,worker);
    const p=store.state.profiles[profileId];expect(compile(store.state,processId,p).errors.join()).toContain('unknown');p.capabilities.images='declared';expect(compile(store.state,processId,p).errors).toEqual([]);
    store.state.nodes[sourceId].role='assistant';expect(compile(store.state,processId,p).errors.join()).toContain('Assistant-role');p.capabilities.assistantAssets='declared';
    const c=compile(store.state,processId,p);expect(c.errors).toEqual([]);const r:Recipe={adapter:'http-1',mode:'responses',model:'fixture',instructions:c.instructions,manifest:c.manifest,settings:{}};
    const response=encode(p,r,store.state,id=>store.bytes(id)) as any;expect(response.input[0].role).toBe('assistant');expect(response.input[0].content[1].image_url).toBe(`data:image/png;base64,${bytes.toString('base64')}`);
    const chat=encode({...p,mode:'chat'},{...r,mode:'chat'},store.state,id=>store.bytes(id)) as any;expect(chat.messages[1].role).toBe('assistant');expect(chat.messages[1].content[1].image_url.url).toBe(response.input[0].content[1].image_url);
    p.capabilities.overflow='truncate';expect(compile(store.state,processId,p).errors.join()).toContain('silently truncates');
  });
  it('retains strict UTF-8 bytes and rejects undecodable input before a material mutation',async()=>{
    const {store,sourceId,directory}=setup();const path=join(directory,'fixture.md'),bytes=Buffer.from('# A retained note\nCafé 🐂');writeFileSync(path,bytes);const rep=await importAsset(store,path,sourceId,worker);expect(store.bytes(store.state.representations[rep].assetId)).toEqual(bytes);
    writeFileSync(path,Buffer.from([0xff,0xfe,0x80]));const before=JSON.stringify(store.state);await expect(importAsset(store,path,sourceId,worker)).rejects.toThrow('valid UTF-8');expect(JSON.stringify(store.state)).toBe(before);
  });
  it('renders a safe PDF page and requires deliberate text-only selection and acknowledgement',async()=>{
    const {store,sourceId,processId,directory}=setup(),bytes=pdf('A concrete PDF fixture');const path=join(directory,'fixture.pdf');writeFileSync(path,bytes);
    const rep=await importAsset(store,path,sourceId,worker),textRep=Object.values(store.state.representations).find(r=>r.mode==='pdf-text')!;
    expect(textRep.text).toContain('A concrete PDF fixture');expect(textRep.acknowledged).toBe(false);
    const preview=await previewPdf(bytes,worker,1);expect(preview.pageCount).toBe(1);expect(preview.data).toMatch(/^data:image\/png;base64,/);
    const controller=new Controller(store,async()=>({text:'Fixture'}));await expect(controller.command({type:'asset.representation',id:sourceId,from:rep,to:textRep.id,acknowledge:false})).rejects.toThrow('accept');
    await controller.command({type:'asset.representation',id:sourceId,from:rep,to:textRep.id,acknowledge:true});const result=compile(store.state,processId);expect(result.errors).toEqual([]);expect(textRep.acknowledged).toBe(false);expect(Object.values(store.state.representations).some(r=>r.mode==='pdf-text'&&r.acknowledged)).toBe(true);
  });
  it('blocks blank PDF extraction and PDF page overflow',async()=>{
    const {store,sourceId,processId,directory}=setup(),path=join(directory,'blank.pdf');writeFileSync(path,pdf(''));const direct=await importAsset(store,path,sourceId,worker),textRep=Object.values(store.state.representations).find(r=>r.mode==='pdf-text')!;
    await new Controller(store,async()=>({text:''})).command({type:'asset.representation',id:sourceId,from:direct,to:textRep.id,acknowledge:true});expect(compile(store.state,processId).errors.join()).toContain('no readable text');
    writeFileSync(path,pdf('Too many pages',101));await expect(importAsset(store,path,sourceId,worker)).rejects.toThrow('100-page');
  });
  it('never carries another model’s modality, reasoning or token-limit declarations',()=>{
    const {store}=setup(),profile=Object.values(store.state.profiles)[0];profile.capabilities={...DEFAULT_CAPABILITIES,images:'verified',contextTokens:200000,outputTokens:8000,reasoning:'high',reasoningValues:['high']};profile.modelCapabilities={'configured-model':structuredClone(profile.capabilities)};
    expect(profileForModel(profile,'configured-model').capabilities.images).toBe('verified');const changed=profileForModel(profile,'different-model').capabilities;expect(changed.images).toBe('unknown');expect(changed.contextTokens).toBeUndefined();expect(changed.reasoning).toBeUndefined();
  });
});
