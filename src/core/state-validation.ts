import { z } from 'zod';
import { capabilitySchema } from './commands';
import { CATALOG } from './catalog';
import type { LibraryState } from './types';

const uuid=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),text=z.string().max(32*1024*1024),label=z.string().max(1000),num=z.number().finite(),count=z.number().int().nonnegative(),role=z.enum(['user','assistant']);
const modifier=z.object({name:label,text});
const config=z.object({kind:z.enum(Object.keys(CATALOG) as [string,...string[]]),instruction:text,persona:modifier,format:modifier,template:text,templateName:label,append:z.boolean()});
const node=z.object({id:uuid,workspaceId:uuid,type:z.enum(['context','reference','process']),label,order:count,x:num,y:num,revision:count,removed:z.boolean(),purged:z.boolean().optional(),role,force:z.boolean(),selected:uuid.optional(),process:config.optional(),missing:label.optional(),provenance:label.optional()});
const edge=z.object({id:uuid,workspaceId:uuid,source:uuid,sourcePin:label,target:uuid,targetPin:label});
const content=z.object({id:hash,text,attachments:z.array(uuid).max(100)});
const manifest=z.object({nodeId:uuid,versionId:uuid,contentId:hash,role,reasons:z.array(z.enum(['connected','forced'])),branches:z.array(label)});
const compiled=z.object({revision:z.literal('compiler-1'),manifest:z.array(manifest),bindings:z.record(z.string(),uuid),instructions:text,framing:text,omitted:z.array(label),errors:z.array(label),warnings:z.array(label),cycles:z.array(uuid),edges:z.array(edge),nodeIds:z.array(uuid),outputCount:count,callCount:count,estimatedTokens:count});
const profile=z.object({id:uuid,name:label,kind:z.enum(['chatgpt','compatible']),baseUrl:z.string().url(),mode:z.enum(['responses','chat']),capabilities:capabilitySchema,credentialId:uuid.optional(),models:z.array(z.object({id:label,name:label})),discoveredAt:label.optional(),manualModel:label.optional(),modelCapabilities:z.record(z.string(),capabilitySchema).optional()});
const recipe=z.object({adapter:z.literal('http-1'),mode:z.enum(['responses','chat']),model:label,instructions:text,manifest:z.array(manifest),settings:z.object({reasoning:label.optional(),outputTokens:num.optional()})});
const run=z.object({id:uuid,actionId:uuid,workspaceId:uuid,processId:uuid,created:label,state:z.enum(['Preparing','Planning','Generating','Validating','Committing','Completed','Partial','Failed','Cancelled','Interrupted']),compiled,config,profile,model:label,graph:z.object({nodes:z.array(node),edges:z.array(edge)}),outputs:z.array(z.object({id:label,nodeId:uuid,baseVersionId:uuid.optional(),baseContentId:hash,revision:count,edgeId:uuid,resultVersionId:uuid.optional(),carried:z.boolean().optional(),staged:text.optional(),outcome:z.enum(['pending','generating','completed','failed','not-attempted'])})).max(8),calls:z.array(z.object({id:uuid,stage:z.enum(['plan','generate']),slot:label.optional(),started:label,ended:label.optional(),recipe,outcome:z.enum(['running','completed','failed']),error:text.optional(),text:text.optional(),usage:z.unknown().optional(),summaries:z.array(text).optional(),requestId:label.optional()})).max(9),plan:z.object({slots:z.array(z.object({slot:count,brief:text})).max(8)}).optional(),parentId:uuid.optional(),error:text.optional(),cancelled:z.boolean(),sequence:count});
const schema=z.object({schema:z.literal(1),id:uuid,revision:count,activeWorkspace:uuid,defaults:z.object({persona:label,format:label}),theme:z.enum(['dark','light']),
  workspaces:z.record(uuid,z.object({id:uuid,name:label,order:count,removed:z.boolean(),purged:z.boolean().optional(),profileId:uuid.optional(),model:label.optional(),viewport:z.object({x:num,y:num,zoom:num.min(.2).max(2)}),report:z.array(text).optional()})),
  nodes:z.record(uuid,node),edges:z.record(uuid,edge),contents:z.record(hash,content),
  entries:z.record(uuid,z.object({id:uuid,nodeId:uuid,number:count,retained:z.boolean(),contentId:hash,origin:z.enum(['manual','generated','edited','extracted']),created:label,basedOn:uuid.optional(),producer:z.object({runId:uuid,slot:label}).optional()})),
  assets:z.record(hash,z.object({id:hash,name:label,mime:z.enum(['text/plain','image/png','image/jpeg','application/pdf']),bytes:count.max(25*1024*1024)})),
  representations:z.record(uuid,z.object({id:uuid,assetId:hash,mode:z.enum(['text','image','pdf','pdf-text']),text:text.optional(),pages:z.array(z.object({page:count,characters:count})).max(100).optional(),warnings:z.array(text),acknowledged:z.boolean(),parser:label})),
  profiles:z.record(uuid,profile),runs:z.record(uuid,run),undo:z.array(z.object({id:uuid,workspaceId:uuid,label,nodes:z.array(node),edges:z.array(edge),material:z.record(uuid,content)}))});

export function validateState(value:unknown):LibraryState {
  const parsed=schema.safeParse(value);
  if(!parsed.success)throw new Error(`Library record validation failed at ${parsed.error.issues[0]?.path.join('.')}. Restore a verified backup.`);
  const state=parsed.data as LibraryState;
  for(const key of ['workspaces','nodes','edges','entries','contents','assets','representations','profiles','runs'] as const)for(const [id,record] of Object.entries(state[key]))if(id!==record.id)throw new Error('Library record identity mismatch.');
  if(!state.workspaces[state.activeWorkspace]||state.workspaces[state.activeWorkspace].removed)throw new Error('Active Workspace is unavailable.');
  for(const n of Object.values(state.nodes))if(!state.workspaces[n.workspaceId]||(n.type==='process')!==!!n.process||(n.selected&&state.entries[n.selected]?.nodeId!==n.id))throw new Error('Library contains an invalid node or selection.');
  for(const e of Object.values(state.edges))if(!state.nodes[e.source]||!state.nodes[e.target]||state.nodes[e.source].workspaceId!==e.workspaceId||state.nodes[e.target].workspaceId!==e.workspaceId)throw new Error('Library contains an invalid edge.');
  for(const e of Object.values(state.entries))if(!state.nodes[e.nodeId]||!state.contents[e.contentId]||(e.basedOn&&!state.entries[e.basedOn])||(e.producer&&!state.runs[e.producer.runId]))throw new Error('Library contains dangling retained material.');
  for(const r of Object.values(state.runs)){
    if(!state.workspaces[r.workspaceId])throw new Error('Library contains a dangling run.');
    for(const m of r.compiled.manifest)if(!state.entries[m.versionId]||!state.contents[m.contentId])throw new Error('Run input history is unavailable.');
    for(const o of r.outputs)if(!state.contents[o.baseContentId]||(o.baseVersionId&&!state.entries[o.baseVersionId])||(o.resultVersionId&&!state.entries[o.resultVersionId]))throw new Error('Run output history is unavailable.');
  }
  return state;
}
