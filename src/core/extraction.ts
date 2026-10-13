import type { Entry, LibraryState, Node, Run } from './types';
import { addEntry, addNode, addWorkspace, content, id, retain } from './library';

export function extractionPreview(state:LibraryState,nodeId:string) {
  const node=state.nodes[nodeId],entry=node?.selected&&state.entries[node.selected];
  if(!node||node.type!=='context'||!entry)throw new Error('Select a Context version to extract.');
  const run=entry.producer&&state.runs[entry.producer.runId];
  return {version:entry.number,retained:entry.retained,hasProducer:!!run,inputs:run?.compiled.manifest.length??0,
    message:run?'Reconstruct recorded contributing versions, roles and settings. Additional historical evidence may appear as separate provenance islands.':'This manual material has no generating run. Its available based-on history will be shown separately.',
    warning:'Editable reconstruction is not exact request replay. The source Workspace and creation defaults stay unchanged.'};
}
export function extract(state:LibraryState,nodeId:string) {
  extractionPreview(state,nodeId);
  const root=state.nodes[nodeId],rootEntry=state.entries[root.selected!]!;
  const ws=addWorkspace(state,`${root.label} · from v${rootEntry.number}`),report:string[]=[];
  const occurrences=new Map<string,string>(),seenRuns=new Set<string>(),seenEntries=new Set<string>();let island=0;
  const firstOccurrence=new Map<string,string>();
  function copyMaterial(source:Node|undefined,versionId:string,role:Node['role'],scope:string,force:boolean,x:number,y:number) {
    const entry=state.entries[versionId],key=`${source?.id??'missing'}:${versionId}:${role}:${scope}`;
    const existing=occurrences.get(key);if(existing)return existing;
    const n=addNode(state,ws.id,source?.type==='reference'?'reference':'context',x,y,'Respond',role);
    delete state.entries[n.selected!];n.selected=undefined;n.force=force;
    n.label=`${source?.label??'Missing material'} — source v${entry?.number??'?'}`;
    n.provenance=scope.startsWith('island')?'Historical provenance island; not included unless connected or explicitly forced.':'Recorded input graph';
    if(!entry||!state.contents[entry.contentId]){n.missing=`Historical material ${versionId} is unavailable.`;report.push(n.missing);addEntry(state,n,content(state,''),true,'extracted');}
    else {addEntry(state,n,state.contents[entry.contentId],true,'extracted',{basedOn:entry.retained?entry.id:entry.basedOn,producer:entry.producer});for(const rep of state.contents[entry.contentId].attachments)if(!state.representations[rep]||!state.assets[state.representations[rep].assetId]){n.missing=`Historical attachment ${rep} is unavailable.`;report.push(n.missing);}}
    occurrences.set(key,n.id);
    if(source){const previous=firstOccurrence.get(source.id);if(previous&&previous!==key)report.push(`${source.label}: copied a separate historical occurrence to preserve its version, role or predecessor context.`);else firstOccurrence.set(source.id,key);}
    return n.id;
  }
  function copyRun(run:Run,output:Entry,scope:string) {
    const outputSlot=output.producer?.slot;
    const selection=run.outputs.find(o=>o.id===outputSlot);
    const map=new Map<string,string>();const baseY=island*1000;
    run.compiled.manifest.forEach((m,i)=>{
      const old=run.graph.nodes.find(n=>n.id===m.nodeId)??state.nodes[m.nodeId];
      const forced=scope==='active'&&m.reasons.includes('forced');
      map.set(m.nodeId,copyMaterial(old,m.versionId,m.role,scope,forced,80+(i%3)*380,baseY+80+Math.floor(i/3)*290));
    });
    for(const old of run.graph.nodes.filter(n=>n.type==='process'&&run.compiled.nodeIds.includes(n.id))) {
      const cfg=old.id===run.processId?run.config:old.process!;
      const n=addNode(state,ws.id,'process',80+map.size%3*380,baseY+430+Math.floor(map.size/3)*250,cfg.kind);
      n.process=structuredClone(cfg);n.label=old.label;n.provenance=old.id===run.processId?`Settings actually executed by run ${run.id}`:'Captured configuration; not evidence this configuration executed.';map.set(old.id,n.id);
    }
    if(!map.has(run.processId)) {
      const n=addNode(state,ws.id,'process',460,baseY+430,run.config.kind);n.process=structuredClone(run.config);map.set(run.processId,n.id);
    }
    const source=selection?run.graph.nodes.find(n=>n.id===selection.nodeId)??state.nodes[selection.nodeId]:root;
    const resultId=copyMaterial(source,output.id,source?.role??'assistant',scope,false,460,baseY+740);
    // Only captured incoming edges and the deliberately selected output are recreated.
    // Feedback input and newly produced output are separate historical occurrences.
    const edges=run.compiled.edges.filter(e=>e.source!==run.processId);
    for(const old of edges){const sourceId=map.get(old.source),targetId=map.get(old.target);if(!sourceId||!targetId)continue;
      if(Object.values(state.edges).some(e=>e.target===targetId&&e.targetPin===old.targetPin)){report.push(`Conflicting historical edge ${old.id} was isolated.`);continue;}
      const e={...old,id:id(),workspaceId:ws.id,source:sourceId,target:targetId};state.edges[e.id]=e;
    }
    if(selection){const old=run.graph.edges.find(e=>e.id===selection.edgeId);if(old){const e={...old,id:id(),workspaceId:ws.id,source:map.get(run.processId)!,target:resultId};state.edges[e.id]=e;}}
    if(run.outputs.length>1)report.push(`Run ${run.id}: selected slot ${outputSlot}; unused sibling outputs were not included.`);
    for(const m of run.compiled.manifest)history(state.entries[m.versionId]);
  }
  function history(entry:Entry|undefined) {
    if(!entry||seenEntries.has(entry.id))return;seenEntries.add(entry.id);
    if(entry.producer){
      const run=state.runs[entry.producer.runId];
      if(!run){report.push(`Producer run ${entry.producer.runId} is unavailable.`);return;}
      const key=`${run.id}:${entry.producer.slot}`;if(seenRuns.has(key))return;seenRuns.add(key);island++;
      report.push(`Run ${run.id} is retained as a separate provenance island; it is not silently reconnected to the root request.`);
      copyRun(run,entry,`island-${island}`);
    }else if(entry.basedOn&&entry.basedOn!==entry.id)history(state.entries[entry.basedOn]);
  }
  if(rootEntry.producer&&state.runs[rootEntry.producer.runId]) {
    seenRuns.add(`${rootEntry.producer.runId}:${rootEntry.producer.slot}`);copyRun(state.runs[rootEntry.producer.runId],rootEntry,'active');
  }else{
    copyMaterial(root,rootEntry.id,root.role,'active',false,80,80);
    if(rootEntry.producer)report.push(`Producer run ${rootEntry.producer.runId} is unavailable.`);
    if(rootEntry.basedOn)history(state.entries[rootEntry.basedOn]);
  }
  ws.report=[...new Set(report)];state.activeWorkspace=ws.id;
  return {workspaceId:ws.id,report:ws.report};
}
