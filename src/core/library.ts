import { createHash, randomUUID } from 'node:crypto';
import { CATALOG, FORMATS, PERSONAS, processConfig } from './catalog';
import { connectionError, selectedContent } from './compiler';
import type { Content, Entry, Kind, LibraryState, Node, UndoRecord, Workspace } from './types';

export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export const terminal = (s: string) => ['Completed','Partial','Failed','Cancelled','Interrupted'].includes(s);
export function content(state: LibraryState, text: string, attachments: string[] = []): Content {
  const value = { text, attachments };
  const key = createHash('sha256').update(JSON.stringify(value)).digest('hex');
  return state.contents[key] ??= { id:key, ...value };
}
export function initialState(): LibraryState {
  const state: LibraryState = { schema:1, id:id(), revision:0, activeWorkspace:'', defaults:{persona:'None',format:'None'}, theme:'dark', workspaces:{}, nodes:{}, edges:{}, entries:{}, contents:{}, assets:{}, representations:{}, profiles:{}, runs:{}, undo:[] };
  state.activeWorkspace = addWorkspace(state,'My first Workspace').id;
  return state;
}
export function addWorkspace(state: LibraryState, name: string): Workspace {
  const workspace: Workspace = {id:id(),name,order:Object.keys(state.workspaces).length,removed:false,viewport:{x:40,y:40,zoom:1}};
  state.workspaces[workspace.id]=workspace; return workspace;
}
export function addNode(state: LibraryState, workspaceId: string, type: Node['type'], x=80, y=80, kind: Kind='Respond', role: Node['role']='user'): Node {
  if (!state.workspaces[workspaceId] || state.workspaces[workspaceId].removed) throw new Error('Workspace unavailable.');
  const node: Node = {id:id(),workspaceId,type,label:type==='process'?kind:type==='reference'?'Reference':'Context',order:Object.keys(state.nodes).length,x,y,revision:0,removed:false,role,force:false};
  state.nodes[node.id]=node;
  if(type==='process') node.process=processConfig(kind,state.defaults);
  else addEntry(state,node,content(state,''),false,'manual');
  return node;
}
export function addEntry(state: LibraryState,node: Node,value: Content,retained: boolean,origin: Entry['origin'],extra: Partial<Entry>={}): Entry {
  const entry: Entry = { id:id(), nodeId:node.id, number:Math.max(0,...Object.values(state.entries).filter(e=>e.nodeId===node.id).map(e=>e.number))+1,retained,contentId:value.id,origin,created:now(),...extra };
  state.entries[entry.id]=entry; node.selected=entry.id; node.revision++; return entry;
}
export function retain(state: LibraryState,node: Node): Entry | undefined {
  const entry = node.selected ? state.entries[node.selected] : undefined;
  if (!entry) return;
  entry.retained=true; return entry;
}
export function assertUnlocked(state: LibraryState,nodeId: string, bindings=false) {
  for (const run of Object.values(state.runs)) if (!terminal(run.state)) {
    if(run.processId===nodeId || run.outputs.some(o=>o.nodeId===nodeId)) throw new Error('This Process or destination is locked by an active run. Stop it first.');
    if (bindings && run.graph.edges.some(e=>e.source===nodeId && e.target===run.processId)) throw new Error('The active Process input binding is locked.');
  }
}
export function editMaterial(state: LibraryState,node: Node,text: string,attachments?: string[],choice?: 'continue'|'replace') {
  assertUnlocked(state,node.id);
  if (node.type==='process') throw new Error('Processes do not hold material.');
  const selected = node.selected ? state.entries[node.selected] : undefined;
  const draft = Object.values(state.entries).find(e=>e.nodeId===node.id && !e.retained);
  if (draft && draft.id!==selected?.id) {
    if(!choice) throw new Error('DRAFT_CONFLICT: Continue the existing draft or replace it with an edit of the selected version.');
    if(choice==='continue') {node.selected=draft.id;node.revision++;return;}
  }
  const value=content(state,text,attachments??(selected && state.contents[selected.contentId]?.attachments)??[]);
  if(draft) { draft.contentId=value.id; draft.origin=selected?.producer?'edited':'manual'; if(selected?.id!==draft.id) draft.basedOn=selected?.id; node.selected=draft.id;node.revision++; }
  else addEntry(state,node,value,false,selected?.producer?'edited':'manual',{basedOn:selected?.id});
  node.missing=undefined;
}
export function connect(state: LibraryState,source: string,sourcePin: string,target: string,targetPin: string) {
  const sourceNode = state.nodes[source], targetNode=state.nodes[target];
  if(!sourceNode || !targetNode) throw new Error('An endpoint is unavailable.');
  // Source material can change while a run is active; its outgoing binding to the active target cannot.
  if(sourceNode.type==='process') assertUnlocked(state,source);
  assertUnlocked(state,target);
  const edge={id:id(),workspaceId:sourceNode.workspaceId,source,sourcePin,target,targetPin};
  const error=connectionError(state,edge); if(error) throw new Error(error);
  state.edges[edge.id]=edge; return edge;
}
export function checkpoint(state: LibraryState,workspaceId: string,label: string) {
  const nodes=Object.values(state.nodes).filter(n=>n.workspaceId===workspaceId);
  const record: UndoRecord={id:id(),workspaceId,label,nodes:structuredClone(nodes),edges:structuredClone(Object.values(state.edges).filter(e=>e.workspaceId===workspaceId)),material:{}};
  for(const node of nodes) {const c=selectedContent(state,node);if(c)record.material[node.id]=structuredClone(c);}
  state.undo.push(record);
  while(state.undo.filter(u=>u.workspaceId===workspaceId).length>100) state.undo.splice(state.undo.findIndex(u=>u.workspaceId===workspaceId),1);
}
export function undo(state: LibraryState,workspaceId: string) {
  if(Object.values(state.runs).some(r=>r.workspaceId===workspaceId&&!terminal(r.state))) throw new Error('Stop the active run before Undo.');
  const index=state.undo.findLastIndex(u=>u.workspaceId===workspaceId);if(index<0)return;
  const record=state.undo.splice(index,1)[0];
  const previous=new Map(record.nodes.map(n=>[n.id,n]));
  for(const n of Object.values(state.nodes).filter(n=>n.workspaceId===workspaceId)) {
    const old=previous.get(n.id);if(!old){n.removed=true;continue;}
    const revision=n.revision;Object.assign(n,structuredClone(old));n.revision=revision+1;
    const oldMaterial=record.material[n.id];
    if(oldMaterial && selectedContent(state,n)?.id!==oldMaterial.id) editMaterial(state,n,oldMaterial.text,oldMaterial.attachments,'replace');
  }
  for(const e of Object.values(state.edges))if(e.workspaceId===workspaceId)delete state.edges[e.id];
  for(const e of record.edges)state.edges[e.id]=e;
}
export function setPreset(state:LibraryState,node:Node,component:'persona'|'format',name:string) {
  assertUnlocked(state,node.id); if(!node.process)throw new Error('Select a Process.');
  const presets=component==='persona'?PERSONAS:FORMATS;
  if(!(name in presets))throw new Error('Unknown preset.');
  node.process[component]={name,text:presets[name]};state.defaults[component]=name;node.revision++;
}
export function removeNode(state:LibraryState,node:Node) {
  // Source removal affects the future graph only. Active runs retain their frozen input.
  assertUnlocked(state,node.id);
  node.removed=true;node.revision++;
  for(const edge of Object.values(state.edges))if(edge.source===node.id||edge.target===node.id)delete state.edges[edge.id];
}
export function arrange(state:LibraryState,workspaceId:string) {
  const nodes=Object.values(state.nodes).filter(n=>n.workspaceId===workspaceId&&!n.removed);
  const edges=Object.values(state.edges).filter(e=>e.workspaceId===workspaceId);
  const assigned=new Set<string>();let island=0;
  function place(node:Node,depth:number,column:number) {
    if(assigned.has(node.id))return;assigned.add(node.id);node.x=60+column*380;node.y=60+depth*300;
    edges.filter(e=>e.source===node.id).sort((a,b)=>a.sourcePin.localeCompare(b.sourcePin)).forEach((e,i)=>{const child=state.nodes[e.target];if(child&&!child.removed)place(child,depth+1,column+i);});
  }
  for(const node of nodes.filter(n=>!edges.some(e=>e.target===n.id))) {place(node,0,island);island+=3;}
  for(const node of nodes)if(!assigned.has(node.id)){place(node,0,island);island+=3;}
}
