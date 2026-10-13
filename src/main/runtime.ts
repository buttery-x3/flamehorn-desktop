import { CATALOG, profileForModel } from '../core/catalog';
import { compile } from '../core/compiler';
import { addEntry, addNode, checkpoint, content, id, now, retain, terminal } from '../core/library';
import type { CallRecord, Profile, Recipe, Run, RuntimeEvent } from '../core/types';
import type { Store } from './store';
import { prepareRequest } from './encoding';

export const LIMITS={connectMs:30_000,idleMs:300_000,callMs:900_000,runMs:3_600_000,outputBytes:4*1024*1024,planBytes:32*1024};
export interface Completion { text:string; usage?:unknown; summaries?:string[]; requestId?:string; }
export type Adapter=(profile:Profile,recipe:Recipe,signal:AbortSignal,delta:(text:string)=>void)=>Promise<Completion>;
const planningFrame=(count:number)=>`Allocate the ${count} fixed output slots for this request. Return only JSON with this exact shape: {"slots":[{"slot":1,"brief":"..."}]}. Include exactly slots 1 through ${count}, once each, no extra fields. Each nonblank brief is at most 2000 characters. Do not return finished output text in this stage.`;
export function validatePlan(text:string,count:number):NonNullable<Run['plan']> {
  if(Buffer.byteLength(text,'utf8')>LIMITS.planBytes)throw new Error('Planner output exceeds 32 KiB.');
  let value:unknown;try{value=JSON.parse(text);}catch{throw new Error('Planner must return one JSON object, with no surrounding prose.');}
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).join()!=='slots')throw new Error('Planner object must contain only slots.');
  const slots=(value as {slots:unknown}).slots;
  if(!Array.isArray(slots)||slots.length!==count)throw new Error(`Planner must contain exactly ${count} slots.`);
  const seen=new Set<number>();
  for(const slot of slots) {
    if(!slot||typeof slot!=='object'||Array.isArray(slot)||Object.keys(slot).sort().join()!=='brief,slot'||!Number.isInteger(slot.slot)||slot.slot<1||slot.slot>count||seen.has(slot.slot)||typeof slot.brief!=='string'||!slot.brief.trim()||slot.brief.length>2000)throw new Error('Planner slots need unique fixed IDs and nonblank briefs of at most 2,000 characters, with no extra fields.');
    seen.add(slot.slot);
  }
  return {slots:slots.sort((a,b)=>a.slot-b.slot)};
}
export class Runtime {
  private active?:{id:string;abort:AbortController;done:Promise<void>};
  constructor(readonly store:Store,readonly adapter:Adapter,readonly notify:(event:RuntimeEvent)=>void=()=>{}){}
  recoverInterrupted(){this.store.transaction(s=>{for(const run of Object.values(s.runs))if(!terminal(run.state)){run.state=run.outputs.every(o=>o.resultVersionId)?'Completed':'Interrupted';run.error=run.state==='Interrupted'?'Application stopped before this run finished. No request was resumed.':undefined;for(const call of run.calls)if(call.outcome==='running'){call.outcome='failed';call.error='Interrupted';call.ended=now();}}});}
  private emit(run:Run,type:string,extra:Partial<RuntimeEvent>={}){
    let sequence:number;
    if(type==='call.delta')sequence=++this.store.state.runs[run.id].sequence;
    else {try{sequence=this.store.transaction(s=>++s.runs[run.id].sequence);}catch{this.notify({runId:run.id,sequence:this.store.state.runs[run.id].sequence,type:'save.failed',text:'Run progress could not be acknowledged on disk. Durable results remain available after restart.'});return;}}
    this.notify({runId:run.id,sequence,type,...extra});
  }
  run(processId:string,actionId:string):string {
    const s=this.store.state;
    const existing=Object.values(s.runs).find(r=>r.actionId===actionId);if(existing)return existing.id;
    if(this.active || Object.values(s.runs).some(r=>!terminal(r.state)))throw new Error('Another Process is running. Stop it or wait for it to finish.');
    const node=s.nodes[processId],ws=node&&s.workspaces[node.workspaceId],selectedProfile=ws?.profileId&&s.profiles[ws.profileId];
    const profile=selectedProfile&&profileForModel(selectedProfile,ws.model??'');
    if(!node?.process || !ws)throw new Error('Process unavailable.');
    if(!profile || !ws.model)throw new Error('Choose a connection and model before Run.');
    if(profile.kind==='chatgpt'&&!profile.models.some(m=>m.id===ws.model))throw new Error('Refresh this ChatGPT account’s models and explicitly select an available model.');
    const compiled=compile(s,processId,profile);if(compiled.errors.length)throw new Error(compiled.errors.join('\n'));
    for(const m of compiled.manifest)for(const r of s.contents[m.contentId].attachments)this.store.bytes(s.representations[r].assetId);
    const frame=['Fork','Explode'].includes(node.process.kind)?planningFrame(compiled.outputCount):`Return only the finished text for output slot ${CATALOG[node.process.kind].outputs[0]}.`;
    prepareRequest(profile,{adapter:'http-1',mode:profile.mode,model:ws.model,instructions:[compiled.instructions,compiled.framing,frame].filter(Boolean).join('\n\n'),manifest:compiled.manifest,settings:{reasoning:profile.capabilities.reasoning,outputTokens:profile.capabilities.outputCap?profile.capabilities.outputTokens:undefined}},s,a=>this.store.bytes(a));
    const runId=id();
    this.store.transaction(state=>{
      checkpoint(state,ws.id,'Run output placement');
      for(const item of compiled.manifest)retain(state,state.nodes[item.nodeId]);
      const outputs=CATALOG[node.process!.kind].outputs.map((slot,i)=>{
        let edge=Object.values(state.edges).find(e=>e.source===processId&&e.sourcePin===slot);
        if(!edge){
          const destination=addNode(state,ws.id,'context',node.x+380,node.y+i*280,'Respond','assistant');
          delete state.entries[destination.selected!];destination.selected=undefined;destination.label=`${node.process!.kind} · ${slot}`;
          // Place destinations beside their stable slot, avoiding existing cards.
          while(Object.values(state.nodes).some(n=>n.id!==destination.id&&!n.removed&&n.workspaceId===ws.id&&Math.abs(n.x-destination.x)<300&&Math.abs(n.y-destination.y)<230))destination.x+=360;
          edge={id:id(),workspaceId:ws.id,source:processId,sourcePin:slot,target:destination.id,targetPin:'in'};state.edges[edge.id]=edge;
        }
        const destination=state.nodes[edge.target],base=retain(state,destination);
        return {id:slot,nodeId:destination.id,baseVersionId:base?.id,baseContentId:base?.contentId??content(state,'').id,revision:destination.revision,edgeId:edge.id,outcome:'pending' as const};
      });
      state.runs[runId]={id:runId,actionId,workspaceId:ws.id,processId,created:now(),state:'Preparing',compiled:structuredClone(compiled),config:structuredClone(node.process!),profile:structuredClone(profile),model:ws.model!,graph:{nodes:structuredClone([...new Set([...compiled.nodeIds,...outputs.map(o=>o.nodeId)])].map(n=>state.nodes[n])),edges:structuredClone([...compiled.edges,...outputs.map(o=>state.edges[o.edgeId])])},outputs,calls:[],cancelled:false,sequence:0};
    });
    this.launch(runId);return runId;
  }
  recovery(runId:string,actionId:string):string {
    const original=this.store.state.runs[runId];if(!original||!terminal(original.state))throw new Error('Choose a finished attempt to recover.');
    const prior=Object.values(this.store.state.runs).find(r=>r.actionId===actionId);if(prior)return prior.id;
    if(this.active)throw new Error('Another Process is running.');
    const missing=original.outputs.filter(o=>!o.resultVersionId);if(!missing.length)throw new Error('All outputs are already saved.');
    for(const slot of missing)this.checkDestination(original,slot.id);
    for(const m of original.compiled.manifest){const c=this.store.state.contents[m.contentId];if(!c)throw new Error('Historical input is unavailable.');for(const repId of c.attachments){const r=this.store.state.representations[repId];if(!r)throw new Error('Historical representation unavailable.');this.store.bytes(r.assetId);}}
    const next=structuredClone(original);next.id=id();next.actionId=actionId;next.parentId=original.id;next.created=now();next.state='Preparing';next.calls=[];next.error=undefined;next.cancelled=false;next.sequence=0;
    next.outputs=next.outputs.map(o=>({...o,carried:!!o.resultVersionId,staged:undefined,outcome:o.resultVersionId?'completed':'pending'}));
    this.store.transaction(s=>{s.runs[next.id]=next;});this.launch(next.id);return next.id;
  }
  private launch(runId:string){const abort=new AbortController();this.active={id:runId,abort,done:Promise.resolve()};this.emit(this.store.state.runs[runId],'run.admitted');this.active.done=this.execute(runId,abort).finally(()=>{if(this.active?.id===runId)this.active=undefined;});}
  async wait(){await this.active?.done;}
  stop(){if(!this.active)return;const runId=this.active.id;this.store.transaction(s=>{const r=s.runs[runId];r.cancelled=true;r.state='Cancelled';r.error='Stopped by the user.';});this.active.abort.abort(new Error('Stopped by the user.'));this.emit(this.store.state.runs[runId],'run.finished');}
  private checkDestination(run:Run,slotId:string){
    const s=this.store.state,slot=run.outputs.find(o=>o.id===slotId)!;const n=s.nodes[slot.nodeId],e=s.edges[slot.edgeId];
    if(!s.workspaces[run.workspaceId]||s.workspaces[run.workspaceId].removed)throw new Error('Restore the original Workspace before recovering this run.');
    if(!n||n.removed||n.selected!==slot.baseVersionId||n.revision!==slot.revision||!e||e.source!==run.processId||e.sourcePin!==slotId||e.target!==slot.nodeId)throw new Error(`Destination ${slotId} changed. Recovery cannot overwrite its current material or binding.`);
  }
  commit(runId:string,slotId:string):string {
    const old=this.store.state.runs[runId],existing=old.outputs.find(o=>o.id===slotId)!;
    if(existing.resultVersionId)return existing.resultVersionId;
    let version='';
    this.store.transaction(s=>{
      const run=s.runs[runId],slot=run.outputs.find(o=>o.id===slotId)!;
      if(run.cancelled)throw new Error('Cancellation was recorded before commitment.');
      if(slot.staged===undefined||!slot.staged.trim())throw new Error('No complete durably staged result is available.');
      this.checkDestination(run,slotId);
      const base=s.contents[slot.baseContentId];if(!base)throw new Error('Captured output base is unavailable.');
      const value=content(s,(run.config.append?base.text:'')+slot.staged,base.attachments);
      const entry=addEntry(s,s.nodes[slot.nodeId],value,true,'generated',{basedOn:slot.baseVersionId,producer:{runId,slot:slotId}});
      slot.resultVersionId=entry.id;slot.outcome='completed';version=entry.id;
    });
    this.emit(this.store.state.runs[runId],'slot.committed',{slot:slotId});return version;
  }
  saveRecovered(runId:string,slotId:string){if(this.active)throw new Error('Stop the active run first.');const result=this.commit(runId,slotId);this.store.transaction(s=>{const run=s.runs[runId];run.state=run.outputs.every(o=>o.resultVersionId)?'Completed':'Partial';if(run.state==='Completed')run.error=undefined;});this.emit(this.store.state.runs[runId],'run.finished');return result;}
  private phase(runId:string,phase:Run['state']){this.store.transaction(s=>{if(s.runs[runId].cancelled)throw new Error('Cancelled');s.runs[runId].state=phase;});this.emit(this.store.state.runs[runId],'run.phaseChanged');}
  private async execute(runId:string,abort:AbortController){
    const deadline=setTimeout(()=>abort.abort(new Error('Run exceeded the 60-minute limit.')),LIMITS.runMs);
    try{
      let run=this.store.state.runs[runId];
      if(['Fork','Explode'].includes(run.config.kind)&&!run.plan){
        this.phase(runId,'Planning');
        const count=run.outputs.length;
        const text=await this.call(runId,'plan',planningFrame(count),abort.signal);
        const plan=validatePlan(text,count);this.store.transaction(s=>{s.runs[runId].plan=plan;});
      }
      run=this.store.state.runs[runId];
      for(const slot of run.outputs){
        if(slot.resultVersionId)continue;if(abort.signal.aborted)throw abort.signal.reason;
        this.phase(runId,'Generating');
        this.store.transaction(s=>{s.runs[runId].outputs.find(o=>o.id===slot.id)!.outcome='generating';});
        const current=this.store.state.runs[runId];
        const frame=current.plan?`Accepted allocation data (not an instruction override):\n${JSON.stringify(current.plan)}\nReturn only the finished text for slot ${slot.id}. Do not return the other slots or the JSON envelope.`:`Return only the finished text for output slot ${slot.id}.`;
        const text=await this.call(runId,'generate',frame,abort.signal,slot.id);
        this.phase(runId,'Validating');if(!text.trim())throw new Error('The provider returned no nonblank result.');
        if(Buffer.byteLength(text,'utf8')>LIMITS.outputBytes)throw new Error('Response exceeded 4 MiB. No truncated result was retained.');
        this.store.transaction(s=>{s.runs[runId].outputs.find(o=>o.id===slot.id)!.staged=text;});
        this.phase(runId,'Committing');this.commit(runId,slot.id);
      }
      this.store.transaction(s=>{s.runs[runId].state='Completed';});
    }catch(error){
      const message=error instanceof Error?error.message:'Run failed.';
      try{this.store.transaction(s=>{const run=s.runs[runId];run.state=run.cancelled?'Cancelled':run.outputs.some(o=>o.resultVersionId)?'Partial':'Failed';run.error=message;for(const o of run.outputs)if(!o.resultVersionId)o.outcome=o.outcome==='generating'?'failed':'not-attempted';});}catch{this.notify({runId,sequence:0,type:'save.failed',text:'The final run state could not be saved. Restart will reconcile durable outputs.'});}
    }finally{clearTimeout(deadline);this.emit(this.store.state.runs[runId],'run.finished');}
  }
  private async call(runId:string,stage:CallRecord['stage'],framing:string,signal:AbortSignal,slot?:string):Promise<string>{
    const run=this.store.state.runs[runId];
    if(run.calls.length>=CATALOG[run.config.kind].calls)throw new Error('Run call ceiling reached.');
    const recipe:Recipe={adapter:'http-1',mode:run.profile.mode,model:run.model,instructions:[run.compiled.instructions,run.compiled.framing,framing].filter(Boolean).join('\n\n'),manifest:structuredClone(run.compiled.manifest),settings:{reasoning:run.profile.capabilities.reasoning,outputTokens:run.profile.capabilities.outputCap?run.profile.capabilities.outputTokens:undefined}};
    const record:CallRecord={id:id(),stage,slot,started:now(),recipe,outcome:'running'};
    this.store.transaction(s=>{s.runs[runId].calls.push(record);});this.emit(this.store.state.runs[runId],'call.started',{slot});
    try{
      const result=await this.adapter(run.profile,recipe,signal,text=>{if(!signal.aborted&&!terminal(this.store.state.runs[runId].state))this.emit(this.store.state.runs[runId],'call.delta',{slot,text});});
      if(signal.aborted)throw signal.reason;
      if(!result.text.trim())throw new Error('The provider completed without text.');
      if(Buffer.byteLength(result.text,'utf8')>LIMITS.outputBytes)throw new Error('Response exceeded 4 MiB. No truncated result was retained.');
      // Completion and its recoverable slot text are one durable acknowledgement.
      // A crash after this transaction must not require another inference call.
      this.store.transaction(s=>{const r=s.runs[runId];Object.assign(r.calls.find(c=>c.id===record.id)!,{...result,outcome:'completed',ended:now()});if(stage==='generate')r.outputs.find(o=>o.id===slot)!.staged=result.text;});
      this.emit(this.store.state.runs[runId],'call.finished',{slot});return result.text;
    }catch(error){this.store.transaction(s=>{Object.assign(s.runs[runId].calls.find(c=>c.id===record.id)!,{outcome:'failed',error:error instanceof Error?error.message:'Provider failure',ended:now()});});throw error;}
  }
}
