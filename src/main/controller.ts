import { join } from 'node:path';
import { statSync, existsSync } from 'node:fs';
import { CATALOG, DEFAULT_CAPABILITIES, FORMATS, PERSONAS, profileForModel } from '../core/catalog';
import { compile, selectedContent } from '../core/compiler';
import { addNode, addWorkspace, arrange, assertUnlocked, checkpoint, connect, editMaterial, id, removeNode, setPreset, terminal, undo } from '../core/library';
import { extract, extractionPreview } from '../core/extraction';
import { purge, purgePlan } from '../core/purge';
import { unlinkSync } from 'node:fs';
import { commandSchema } from '../core/commands';
import type { Command, Kind, LibraryState, Node, Profile } from '../core/types';
import { Store } from './store';
import { Runtime } from './runtime';
import type { Adapter } from './runtime';
import { validateBaseUrl } from './provider';

export class Controller {
  readonly runtime:Runtime;
  exporting=false;
  constructor(readonly store:Store,adapter:Adapter,readonly notify:(value:unknown)=>void=()=>{}){this.runtime=new Runtime(store,adapter,e=>notify({type:'runtime',data:e}));}
  state(){return this.store.state;}
  async command(raw:Command):Promise<unknown> {
    const c=commandSchema.parse(raw);
    if(c.type==='preview'){const n=this.store.state.nodes[c.id],ws=n&&this.store.state.workspaces[n.workspaceId],p=ws?.profileId?this.store.state.profiles[ws.profileId]:undefined;return compile(this.store.state,c.id,p?profileForModel(p,ws?.model??''):undefined);}
    if(c.type==='extract.preview')return extractionPreview(this.store.state,c.id);
    if(c.type==='purge.preview')return purgePlan(this.store.state,c.workspaceId);
    if(c.type==='purge'){
      if(this.exporting)throw new Error('Wait for the library snapshot to finish.');
      const plan=this.store.transaction(s=>purge(s,c.workspaceId));
      for(const assetId of plan.assets){if(!/^[a-f0-9]{64}$/.test(assetId))throw new Error('Invalid purge identity.');try{unlinkSync(join(this.store.directory,'assets',assetId));}catch{}}
      this.notify({type:'state'});return plan;
    }
    if(c.type==='storage')return {libraryBytes:['library.sqlite','library.sqlite-wal','library.sqlite-shm'].map(name=>join(this.store.directory,name)).reduce((bytes,path)=>bytes+(existsSync(path)?statSync(path).size:0),0),assetsBytes:Object.values(this.store.state.assets).reduce((v,a)=>v+a.bytes,0),retainedVersions:Object.values(this.store.state.entries).filter(e=>e.retained).length,recoveryBytes:Object.values(this.store.state.runs).flatMap(r=>r.outputs).filter(o=>!o.resultVersionId&&o.staged).reduce((v,o)=>v+Buffer.byteLength(o.staged!),0),cacheBytes:0,location:this.store.directory};
    if(c.type==='stop'){this.runtime.stop();return;}
    if(this.exporting)throw new Error('Library snapshot is in progress. Try again when it finishes.');
    if(c.type==='run')return this.runtime.run(c.id,c.actionId);
    if(c.type==='retry')return this.runtime.recovery(c.id,c.actionId);
    if(c.type==='save-recovered')return this.runtime.saveRecovered(c.id,c.slot);
    if(c.type==='profile.discover')return this.discover(c.id);
    const result=this.store.transaction(s=>{
      const node=(nodeId:string):Node=>{const n=s.nodes[nodeId];if(!n)throw new Error('Node unavailable.');return n;};
      const record=(nodeId:string,label:string)=>checkpoint(s,node(nodeId).workspaceId,label);
      switch(c.type){
        case 'profile.capabilities':{
          const profile=s.profiles[c.id];if(!profile)throw new Error('Connection unavailable.');
          if(profile.kind==='chatgpt'&&c.capabilities.outputCap)throw new Error('ChatGPT plan usage does not support a hard output-token cap.');
          profile.modelCapabilities??={};profile.modelCapabilities[c.model]=c.capabilities;return;
        }
        case 'workspace.create':{const ws=addWorkspace(s,c.name);s.activeWorkspace=ws.id;return ws.id;}
        case 'workspace.select':{if(!s.workspaces[c.id]||s.workspaces[c.id].removed)throw new Error('Workspace unavailable.');s.activeWorkspace=c.id;return;}
        case 'workspace.rename':s.workspaces[c.id].name=c.name;return;
        case 'workspace.remove':{
          if(Object.values(s.runs).some(r=>r.workspaceId===c.id&&!terminal(r.state)))throw new Error('Stop the active run before removing its Workspace.');
          s.workspaces[c.id].removed=true;if(s.activeWorkspace===c.id)s.activeWorkspace=Object.values(s.workspaces).find(w=>!w.removed)?.id??addWorkspace(s,'New Workspace').id;return;
        }
        case 'workspace.restore':if(!s.workspaces[c.id]||s.workspaces[c.id].purged)throw new Error('This Workspace was permanently removed.');s.workspaces[c.id].removed=false;return;
        case 'workspace.provider':if(c.profileId&&!s.profiles[c.profileId])throw new Error('Connection unavailable.');Object.assign(s.workspaces[c.id],{profileId:c.profileId,model:c.model});return;
        case 'workspace.viewport':s.workspaces[c.id].viewport={x:c.x,y:c.y,zoom:c.zoom};return;
        case 'workspace.arrange':checkpoint(s,c.id,'Arrange');arrange(s,c.id);return;
        case 'node.create':{
          checkpoint(s,c.workspaceId,'Create');
          const source=c.source?node(c.source):undefined;
          const n=addNode(s,c.workspaceId,c.nodeType,c.x,c.y,c.kind as Kind|undefined,source?.type==='process'?'assistant':'user');
          if(source){if(!c.sourcePin)throw new Error('Choose a source pin.');connect(s,source.id,c.sourcePin,n.id,n.process?CATALOG[n.process.kind].inputs[0]:'in');}return n.id;
        }
        case 'node.material':{
          const n=node(c.id);if(c.revision!==undefined&&c.revision!==n.revision)throw new Error('This material changed while you were editing. Reload its current content before saving.');
          if(c.attachments?.some(a=>!s.representations[a]))throw new Error('Unknown attachment.');record(c.id,'Edit material');editMaterial(s,n,c.text,c.attachments,c.choice);return;
        }
        case 'node.patch':{
          const n=node(c.id);assertUnlocked(s,c.id);record(c.id,'Change node');
          if(c.selected&&s.entries[c.selected]?.nodeId!==n.id)throw new Error('Version does not belong to this Context.');
          for(const key of ['label','role','force','selected'] as const)if(c[key]!==undefined)Object.assign(n,{[key]:c[key]});n.revision++;return;
        }
        case 'node.move':for(const position of c.positions){const n=node(position.id);n.x=position.x;n.y=position.y;}return;
        case 'node.remove':record(c.id,'Remove');removeNode(s,node(c.id));return;
        case 'node.restore':if(node(c.id).purged)throw new Error('This node was permanently removed.');node(c.id).removed=false;node(c.id).revision++;return;
        case 'edge.connect':record(c.target,'Connect');return connect(s,c.source,c.sourcePin,c.target,c.targetPin).id;
        case 'edge.remove':{const e=s.edges[c.id];if(!e)return;if(node(e.source).process)assertUnlocked(s,e.source);assertUnlocked(s,e.target);record(e.target,'Disconnect');delete s.edges[e.id];return;}
        case 'process.preset':record(c.id,'Change preset');setPreset(s,node(c.id),c.component,c.name);return;
        case 'defaults':if(c.persona!==undefined){if(!(c.persona in PERSONAS))throw new Error('Unknown Persona.');s.defaults.persona=c.persona;}if(c.format!==undefined){if(!(c.format in FORMATS))throw new Error('Unknown Format.');s.defaults.format=c.format;}return;
        case 'process.edit':{
          const n=node(c.id);assertUnlocked(s,c.id);if(!n.process)throw new Error('Select a Process.');record(c.id,'Edit Process');
          if(c.instruction!==undefined)n.process.instruction=c.instruction;
          for(const key of ['persona','format'] as const)if(c[key]!==undefined)n.process[key]={name:'Custom',text:c[key]};
          if(c.template!==undefined){n.process.template=c.template;n.process.templateName=c.templateName??'Custom';}
          if(c.append!==undefined)n.process.append=c.append;n.revision++;return;
        }
        case 'extract':return extract(s,c.id);
        case 'undo':undo(s,c.workspaceId);return;
        case 'theme':s.theme=c.value;return;
        case 'asset.representation':{
          const n=node(c.id),current=selectedContent(s,n),from=s.representations[c.from],to=s.representations[c.to];
          if(!current||!from||!to||from.assetId!==to.assetId||!current.attachments.includes(c.from))throw new Error('Choose a representation of this attachment.');
          if(to.warnings.length&&!c.acknowledge)throw new Error('Inspect and accept the text-only limitations.');
          // Acknowledgement belongs to a new immutable representation identity, preserving historical records.
          let toId=to.id;if(c.acknowledge&&!to.acknowledged){toId=id();s.representations[toId]={...to,id:toId,acknowledged:true};}
          record(c.id,'Change representation');editMaterial(s,n,current.text,current.attachments.map(a=>a===c.from?toId:a));return;
        }
        default:throw new Error(`Command ${c.type} belongs to the desktop service.`);
      }
    });this.notify({type:'state'});return result;
  }
  private async discover(profileId:string){throw new Error(`Model discovery for ${profileId} must be handled by the credential service.`);}
}
