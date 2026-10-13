import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixture } from './helpers';
import { encode, httpAdapter, validateBaseUrl } from '../src/main/provider';
import { boundedJson } from '../src/main/http-json';
import { compile } from '../src/core/compiler';
import { Store } from '../src/main/store';
import type { Recipe } from '../src/core/types';
let stores:Store[]=[];afterEach(()=>{stores.forEach(s=>s.close());stores=[];vi.restoreAllMocks();vi.useRealTimers();});
function setup(){const f=fixture();stores.push(f.store);const profile=f.store.state.profiles[f.profileId];const c=compile(f.store.state,f.processId,profile);const recipe:Recipe={adapter:'http-1',mode:'responses',model:'fixture',instructions:c.instructions,manifest:c.manifest,settings:{}};return {...f,profile,recipe};}
function response(events:unknown[],done=false){return new Response(events.map(e=>`data: ${JSON.stringify(e)}\n\n`).join('')+(done?'data: [DONE]\n\n':''),{headers:{'content-type':'text/event-stream'}});}
describe('Provider protocol and boundary fixtures (no live inference)',()=>{
  it('AP08 bounds metadata and error bodies and cancels oversized responses',async()=>{
    let cancelled=false;const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(1025));},cancel(){cancelled=true;}});
    await expect(boundedJson(new Response(body),1024)).rejects.toThrow('local response limit');expect(cancelled).toBe(true);
    expect(await boundedJson(Response.json({data:[{id:'fixture'}]}))).toEqual({data:[{id:'fixture'}]});
  });
  it('AP07 ChatGPT has a strict Responses allowlist; no tools, state pointers or API billing fields',()=>{
    const {store,profile,recipe}=setup();profile.kind='chatgpt';profile.baseUrl='https://api.openai.com/v1';profile.capabilities.outputCap=true;recipe.settings.outputTokens=50;
    const body=encode(profile,recipe,store.state,()=>Buffer.alloc(0));expect(Object.keys(body).sort()).toEqual(['input','instructions','model','store','stream']);expect(body.store).toBe(false);expect(body.stream).toBe(true);
  });
  it('AP06/AP07 preserves adjacent roles and keeps instructions out of source messages',()=>{
    const {store,profile,recipe}=setup();profile.mode='chat';recipe.manifest=[...recipe.manifest,...recipe.manifest.map(m=>({...m,nodeId:'second-identity'}))];const body=encode(profile,recipe,store.state,()=>Buffer.alloc(0));expect((body.messages as any[]).map(m=>m.role)).toEqual(['system','user','user']);expect(body).not.toHaveProperty('input');
  });
  it('AP03/RT10 Responses requires a completed event, including after visible deltas',async()=>{
    const {store,profile,recipe}=setup();const cases=[['EOF',[{type:'response.output_text.delta',delta:'Looks done'}]],['incomplete',[{type:'response.output_text.delta',delta:'Some text'},{type:'response.incomplete'}]],['failure',[{type:'response.output_text.delta',delta:'Some text'},{type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}}]],['refusal',[{type:'response.refusal.delta',delta:'No'}]],['tool',[{type:'response.output_item.added',item:{type:'function_call'}}]]] as const;
    for(const [_name,events] of cases){let calls=0;const adapter=httpAdapter(()=>store.state,()=>Buffer.alloc(0),async()=>undefined,async()=>{calls++;return response([...events]);});await expect(adapter(profile,recipe,new AbortController().signal,()=>{})).rejects.toThrow();expect(calls).toBe(1);}
    const adapter=httpAdapter(()=>store.state,()=>Buffer.alloc(0),async()=>undefined,async()=>response([{type:'response.output_text.delta',delta:'Saved'},{type:'response.completed',response:{status:'completed'}}]));expect((await adapter(profile,recipe,new AbortController().signal,()=>{})).text).toBe('Saved');
  });
  it('AP07 Chat Completions requires normal stop plus DONE and rejects length/tools',async()=>{
    const {store,profile,recipe}=setup();profile.mode='chat';const delta={choices:[{index:0,delta:{content:'Text'}}]};
    for(const [reason,done] of [['stop',false],['length',true],['tool_calls',true]] as const){const adapter=httpAdapter(()=>store.state,()=>Buffer.alloc(0),async()=>undefined,async()=>response([delta,{choices:[{index:0,finish_reason:reason}]}],done));await expect(adapter(profile,recipe,new AbortController().signal,()=>{})).rejects.toThrow();}
    const adapter=httpAdapter(()=>store.state,()=>Buffer.alloc(0),async()=>undefined,async()=>response([delta,{choices:[{index:0,finish_reason:'stop'}]}],true));expect((await adapter(profile,recipe,new AbortController().signal,()=>{})).text).toBe('Text');
  });
  it('AP08 rejects remote HTTP, secrets in URLs and duplicate endpoint paths',()=>{
    for(const url of ['http://example.com/v1','https://key:secret@example.com/v1','https://example.com/v1?key=secret','https://example.com/v1#token','http://127.0.0.1:1234/v1/responses'])expect(()=>validateBaseUrl(url)).toThrow();
    expect(validateBaseUrl('http://127.0.0.1:1234/v1/')).toBe('http://127.0.0.1:1234/v1');
  });
  it('AP08 never follows redirect/fallback or repeats a failed inference',async()=>{
    const {store,profile,recipe}=setup();let calls=0;const adapter=httpAdapter(()=>store.state,()=>Buffer.alloc(0),async()=>undefined,async(_url,init)=>{calls++;expect(init?.redirect).toBe('error');return new Response('{"error":{"code":"fixture_limit","message":"do not retain echoed private data"}}',{status:429});});await expect(adapter(profile,recipe,new AbortController().signal,()=>{})).rejects.toThrow('fixture_limit');expect(calls).toBe(1);
  });
  it('RT10 enforces the connection and idle deadlines without retrying',async()=>{
    const {store,profile,recipe}=setup();vi.useFakeTimers();let attempts=0;
    const stalled=httpAdapter(()=>store.state,()=>Buffer.alloc(0),async()=>undefined,async(_url,init)=>{attempts++;return new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(init!.signal!.reason)));});
    const first=expect(stalled(profile,recipe,new AbortController().signal,()=>{})).rejects.toThrow('30 seconds');await vi.advanceTimersByTimeAsync(30_001);await first;expect(attempts).toBe(1);
    const idle=httpAdapter(()=>store.state,()=>Buffer.alloc(0),async()=>undefined,async(_url,init)=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"incomplete"}\n\n'));init!.signal!.addEventListener('abort',()=>controller.error(init!.signal!.reason));}})));
    const second=expect(idle(profile,recipe,new AbortController().signal,()=>{})).rejects.toThrow('5 minutes');await vi.advanceTimersByTimeAsync(300_001);await second;
  });
  it('RT10 enforces the total call deadline even while the server sends heartbeats',async()=>{
    const {store,profile,recipe}=setup();vi.useFakeTimers();
    const active=httpAdapter(()=>store.state,()=>Buffer.alloc(0),async()=>undefined,async(_url,init)=>new Response(new ReadableStream({start(controller){const heartbeat=setInterval(()=>controller.enqueue(new TextEncoder().encode(': still waiting\n\n')),60_000);init!.signal!.addEventListener('abort',()=>{clearInterval(heartbeat);controller.error(init!.signal!.reason);});}})));
    const result=expect(active(profile,recipe,new AbortController().signal,()=>{})).rejects.toThrow('15 minutes');await vi.advanceTimersByTimeAsync(900_001);await result;
  });
  it('RT10 rejects oversized decoded output instead of retaining a truncated result',async()=>{
    const {store,profile,recipe}=setup();const adapter=httpAdapter(()=>store.state,()=>Buffer.alloc(0),async()=>undefined,async()=>response([{type:'response.output_text.delta',delta:'x'.repeat(4*1024*1024)},{type:'response.completed',response:{status:'completed'}}]));await expect(adapter(profile,recipe,new AbortController().signal,()=>{})).rejects.toThrow('4 MiB');
  });
});
