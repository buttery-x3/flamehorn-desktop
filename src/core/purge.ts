import type { LibraryState } from './types';
import { terminal } from './library';

export function purgePlan(state:LibraryState,workspaceId?:string){
  if(Object.values(state.runs).some(r=>!terminal(r.state)))throw new Error('Stop the active run before purging Trash.');
  const workspaces=new Set(Object.values(state.workspaces).filter(w=>w.removed&&!w.purged&&(!workspaceId||w.id===workspaceId)).map(w=>w.id));
  if(workspaceId&&!workspaces.has(workspaceId))throw new Error('Only a removed Workspace can be purged.');
  const candidates=new Set(Object.values(state.nodes).filter(n=>workspaces.has(n.workspaceId)||(!workspaceId&&n.removed&&!n.purged)).map(n=>n.id));
  const keepEntries=new Set<string>(),keepRuns=new Set<string>(),keepContents=new Set<string>();
  function entry(entryId:string|undefined){if(!entryId||keepEntries.has(entryId))return;keepEntries.add(entryId);const e=state.entries[entryId];if(!e)return;keepContents.add(e.contentId);entry(e.basedOn);if(e.producer)run(e.producer.runId);}
  function run(runId:string){if(keepRuns.has(runId))return;keepRuns.add(runId);const r=state.runs[runId];if(!r)return;for(const m of r.compiled.manifest){entry(m.versionId);keepContents.add(m.contentId);}for(const o of r.outputs){entry(o.baseVersionId);entry(o.resultVersionId);keepContents.add(o.baseContentId);}}
  for(const e of Object.values(state.entries))if(!candidates.has(e.nodeId))entry(e.id);
  // Removing a node alone never authorizes deletion of retained run history.
  for(const r of Object.values(state.runs))if(!workspaces.has(r.workspaceId))run(r.id);
  for(const u of state.undo)if(!workspaces.has(u.workspaceId)&&!u.nodes.some(n=>candidates.has(n.id)))for(const c of Object.values(u.material))keepContents.add(c.id);
  const runs=Object.values(state.runs).filter(r=>workspaces.has(r.workspaceId)&&!keepRuns.has(r.id)).map(r=>r.id);
  const entries=Object.values(state.entries).filter(e=>candidates.has(e.nodeId)&&!keepEntries.has(e.id)).map(e=>e.id),removedEntries=new Set(entries);
  const nodes=[...candidates].filter(n=>!Object.values(state.entries).some(e=>e.nodeId===n&&!removedEntries.has(e.id))&&!Object.values(state.runs).some(r=>!runs.includes(r.id)&&(r.processId===n||r.graph.nodes.some(g=>g.id===n))));
  for(const e of Object.values(state.entries))if(!removedEntries.has(e.id))keepContents.add(e.contentId);
  const contents=Object.keys(state.contents).filter(c=>!keepContents.has(c));
  const keepRepresentations=new Set<string>();for(const c of keepContents)for(const rep of state.contents[c]?.attachments??[])keepRepresentations.add(rep);
  const keepAssets=new Set([...keepRepresentations].map(r=>state.representations[r]?.assetId).filter(Boolean));
  const representations=Object.keys(state.representations).filter(r=>!keepAssets.has(state.representations[r].assetId));
  const assets=Object.keys(state.assets).filter(a=>!keepAssets.has(a));
  return {workspaces:[...workspaces],nodes,entries,runs,contents,representations,assets,protectedNodes:[...candidates].filter(n=>!nodes.includes(n)),bytes:assets.reduce((sum,a)=>sum+state.assets[a].bytes,0),warning:'Backups and prior exports may still contain removed material. Referenced historical records remain protected; this is not secure erasure.'};
}
export function purge(state:LibraryState,workspaceId?:string){
  const plan=purgePlan(state,workspaceId);
  for(const key of ['nodes','entries','runs','contents','representations','assets'] as const)for(const id of plan[key])delete state[key][id];
  for(const nodeId of plan.protectedNodes){const node=state.nodes[nodeId];node.removed=true;node.purged=true;if(node.selected&&!state.entries[node.selected])node.selected=undefined;}
  for(const edge of Object.values(state.edges))if(!state.nodes[edge.source]||!state.nodes[edge.target]||state.nodes[edge.source].purged||state.nodes[edge.target].purged||plan.workspaces.includes(edge.workspaceId))delete state.edges[edge.id];
  state.undo=state.undo.filter(u=>!plan.workspaces.includes(u.workspaceId)&&!u.nodes.some(n=>plan.nodes.includes(n.id)||plan.protectedNodes.includes(n.id)));
  for(const wsId of plan.workspaces){if(!Object.values(state.nodes).some(n=>n.workspaceId===wsId)&&!Object.values(state.runs).some(r=>r.workspaceId===wsId))delete state.workspaces[wsId];else state.workspaces[wsId].purged=true;}
  return plan;
}
