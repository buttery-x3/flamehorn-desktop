<script lang="ts">
  import { onMount } from 'svelte';
  import { CATALOG, TEMPLATES } from '../core/catalog';
  import type { Command, Compiled, LibraryState, Node } from '../core/types';
  import History from './History.svelte';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  let {library,node,act,registerFlush,stream}:{library:LibraryState;node:Node;act:(c:Command,flush?:boolean)=>Promise<any>;registerFlush:(fn:()=>Promise<void>)=>void;stream:string}=$props();
  let tab=$state('content'),editor=$state(''),dirty=$state(false),saveState=$state('Saved'),preview=$state<Compiled|undefined>(),previewRevision=$state(-1),assetPreview=$state<any>(),readMode=$state(false);
  let timer:ReturnType<typeof setTimeout>|undefined,flight:Promise<void>|undefined;
  let entry=$derived(node.selected?library.entries[node.selected]:undefined);
  let value=$derived(entry?library.contents[entry.contentId]:undefined);
  let versions=$derived(Object.values(library.entries).filter(e=>e.nodeId===node.id).sort((a,b)=>a.number-b.number));
  let runs=$derived(Object.values(library.runs).filter(r=>r.processId===node.id||r.outputs.some(o=>o.resultVersionId===node.selected)||r.id===entry?.producer?.runId).sort((a,b)=>b.created.localeCompare(a.created)));
  let locked=$derived(Object.values(library.runs).some(r=>!['Completed','Partial','Failed','Cancelled','Interrupted'].includes(r.state)&&(r.processId===node.id||r.outputs.some(o=>o.nodeId===node.id))));
  let rendered=$derived(DOMPurify.sanitize(marked.parse(editor,{async:false}),{FORBID_TAGS:['img','svg','math','iframe','object','embed','style','script','form','input','button'],FORBID_ATTR:['style','src','srcset','href']}));
  $effect(()=>{const current=value?.text??'';if(!dirty)editor=current;});
  async function flush(){
    if(timer)clearTimeout(timer);if(flight)await flight;if(!dirty)return;
    const text=editor,revision=node.revision,nodeId=node.id;saveState='Saving…';
    flight=(async()=>{try{await act({type:'node.material',id:nodeId,text,revision},false);if(editor===text)dirty=false;saveState=dirty?'Unsaved changes':'Saved';}catch(error){saveState='Save failed';throw error;}})();
    try{await flight;}finally{flight=undefined;}
  }
  function changed(){dirty=true;saveState='Unsaved changes';if(timer)clearTimeout(timer);timer=setTimeout(()=>void flush().catch(()=>{}),500);}
  onMount(()=>{registerFlush(flush);return()=>{if(timer)clearTimeout(timer);registerFlush(async()=>{});};});
  async function loadPreview(){await flush();preview=await act({type:'preview',id:node.id});previewRevision=library.revision;tab='preview';}
  async function extract(){const info=await act({type:'extract.preview',id:node.id});if(window.confirm(`${info.message}\n\n${info.warning}\n\nCreate a new Workspace from version ${info.version}?`))await act({type:'extract',id:node.id});}
  async function switchRepresentation(from:string,to:string){const rep=library.representations[to];let accept=true;if(rep.warnings.length)accept=window.confirm(`${rep.warnings.join('\n')}\n\n${rep.pages?.map(p=>`Page ${p.page}: ${p.characters} characters`).join('\n')??''}\n\nUse this text-only representation?`);if(accept)await act({type:'asset.representation',id:node.id,from,to,acknowledge:accept});}
</script>

<div class="inspector-title"><span>INSPECTOR</span><button class="quiet" title="Remove node to Trash" disabled={locked} onclick={()=>act({type:'node.remove',id:node.id})}>Remove</button></div>
<input class="title-input" aria-label="Node name" value={node.label} disabled={locked} onchange={e=>act({type:'node.patch',id:node.id,label:e.currentTarget.value})}/>
<nav class="tabs">
  <button class:active={tab==='content'} onclick={()=>tab='content'}>{node.process?'Configuration':'Content'}</button>
  {#if node.process}<button class:active={tab==='preview'} onclick={loadPreview}>Next request</button>{/if}
  <button class:active={tab==='history'} onclick={()=>tab='history'}>History</button>
</nav>
<div class="inspector-body">
  {#if locked}<p class="warning">Locked by the active run. Stop to change this Process or destination.</p>{/if}
  {#if node.provenance}<p class="muted">{node.provenance}</p>{/if}
  {#if node.missing}<p class="error-text">{node.missing}</p>{/if}
  {#if tab==='history'}
    <History {library} {runs} {act}/>
  {:else if tab==='preview'&&node.process}
    <button onclick={loadPreview}>Refresh preview</button>
    {#if preview}
      {#if previewRevision!==library.revision}<p class="warning">Workspace changed. Refresh before inspecting this preview.</p>{/if}
      <p>{preview.outputCount} outputs · {preview.callCount} sequential calls</p>
      {#each preview.errors as error}<p class="error-text">{error}</p>{/each}
      {#each preview.warnings as warning}<p class="warning">{warning}</p>{/each}
      <p class="micro">Text estimate: {preview.estimatedTokens.toLocaleString()} tokens; images/files and provider overhead may differ.</p>
      <h4>Effective instructions</h4><pre>{preview.instructions}</pre>
      {#if preview.omitted.length}<p class="warning">Not used by this template: {preview.omitted.join(', ')}</p>{/if}
      <details><summary>Application framing and current bindings</summary><pre>{preview.framing}</pre></details>
      <h4>Material in request order</h4>
      {#each preview.manifest as item,i}<details open><summary>{i+1}. {library.nodes[item.nodeId]?.label} · v{library.entries[item.versionId]?.number} · {item.role}</summary><p class="micro">{item.reasons.join(' + ')} · {item.branches.join(', ')}</p><pre>{library.contents[item.contentId]?.text}</pre>{#each library.contents[item.contentId]?.attachments??[] as repId}<p>{library.assets[library.representations[repId]?.assetId]?.name} · {library.representations[repId]?.mode}</p>{/each}</details>{/each}
      {#if preview.cycles.length}<p class="micro">Feedback cut points: {preview.cycles.join(', ')}. Existing material is included once.</p>{/if}
    {/if}
  {:else if node.process}
    <p class="muted">{CATALOG[node.process.kind].inputs.length} input{CATALOG[node.process.kind].inputs.length>1?'s':''} → {CATALOG[node.process.kind].outputs.length} output{CATALOG[node.process.kind].outputs.length>1?'s':''} · {CATALOG[node.process.kind].calls} calls per complete Run</p>
    <label class="check-row"><input type="checkbox" checked={node.process.append} disabled={locked} onchange={e=>act({type:'process.edit',id:node.id,append:e.currentTarget.checked})}/> Append to output context</label>
    <p class="micro">{node.process.append?'Generated text is placed immediately after the captured output text, without a separator.':'Replace changes output text and retains the previous base and attachments.'} Destination content is not added to the request merely by this setting.</p>
    <label>Master template<select value={node.process.templateName} disabled={locked} onchange={e=>act({type:'process.edit',id:node.id,template:TEMPLATES[e.currentTarget.value],templateName:e.currentTarget.value})}>{#if node.process.templateName==='Custom'}<option>Custom</option>{/if}{#each Object.keys(TEMPLATES) as name}<option>{name}</option>{/each}</select></label>
    <details open><summary>Advanced instructions</summary>
      <label>Process instruction<textarea value={node.process.instruction} disabled={locked} onchange={e=>act({type:'process.edit',id:node.id,instruction:e.currentTarget.value})}></textarea></label>
      <label>Persona · {node.process.persona.name}<textarea value={node.process.persona.text} disabled={locked} onchange={e=>act({type:'process.edit',id:node.id,persona:e.currentTarget.value})}></textarea></label>
      <label>Format · {node.process.format.name}<textarea value={node.process.format.text} disabled={locked} onchange={e=>act({type:'process.edit',id:node.id,format:e.currentTarget.value})}></textarea></label>
      <label>Template text<textarea class="template-editor" value={node.process.template} disabled={locked} onchange={e=>act({type:'process.edit',id:node.id,template:e.currentTarget.value})}></textarea></label>
      <p class="micro">Edits are local Custom settings. Omitted components stay unused. Output counts stay fixed.</p>
    </details>
    <button class="primary" disabled={locked} onclick={()=>act({type:'run',id:node.id,actionId:crypto.randomUUID()})}>▶ Run {node.process.kind}</button>
    {#if stream}<h4>Streaming preview · not saved yet</h4><pre class="stream">{stream}</pre>{/if}
  {:else}
    <div class="two-col">
      <label>Selected version<select aria-label="Selected version" disabled={locked} value={node.selected??''} onchange={e=>act({type:'node.patch',id:node.id,selected:e.currentTarget.value})}>{#each versions as v}<option value={v.id}>v{v.number} · {v.retained?v.origin:'Editable draft'}</option>{/each}</select></label>
      {#if node.type==='context'}<label>Message role<select aria-label="Message role" disabled={locked} value={node.role} onchange={e=>act({type:'node.patch',id:node.id,role:e.currentTarget.value})}><option value="user">User</option><option value="assistant">Assistant</option></select></label>{/if}
    </div>
    {#if node.type==='context'}
      <div class="button-row"><button class:active={!readMode} onclick={()=>readMode=false}>Edit text</button><button class:active={readMode} onclick={()=>readMode=true}>Read Markdown</button></div>
      {#if readMode}<div class="markdown-reading">{@html rendered}</div>{:else}<textarea aria-label="Context content" class="content-editor" bind:value={editor} oninput={changed} disabled={locked} placeholder="Write something to explore…"></textarea>{/if}
      <div class="save-state" class:error-text={saveState==='Save failed'}>{saveState} · {entry?.retained?'Editing opens one new draft':'One editable draft'}</div>
      {#if saveState==='Save failed'}<div class="button-row"><button onclick={()=>flush()}>Retry save</button><button onclick={async()=>{await act({type:'node.material',id:node.id,text:editor,choice:'replace'},false);dirty=false;saveState='Saved';}}>Replace existing draft</button><button onclick={async()=>{await act({type:'node.material',id:node.id,text:editor,choice:'continue'},false);dirty=false;saveState='Saved';}}>Continue existing draft</button></div>{/if}
    {/if}
    <label class="check-row"><input type="checkbox" checked={node.force} disabled={locked} onchange={e=>act({type:'node.patch',id:node.id,force:e.currentTarget.checked})}/> Force include in context</label>
    <p class="micro">Adds only this selected material to manually run Processes in this Workspace. Connected material is included once.</p>
    <button disabled={locked} onclick={()=>act({type:'asset.import',id:node.id})}>{node.type==='reference'?'Import / replace file':'Attach file'}</button>
    {#each value?.attachments??[] as repId}
      {@const rep=library.representations[repId]}
      {@const asset=rep?library.assets[rep.assetId]:undefined}
      <div class="attachment"><strong>{asset?.name??'Missing attachment'}</strong><p class="micro">{asset?.mime} · {((asset?.bytes??0)/1024).toFixed(1)} KiB</p>
      {#if rep}<label>Representation<select value={repId} disabled={locked} onchange={e=>switchRepresentation(repId,e.currentTarget.value)}>{#each Object.values(library.representations).filter(r=>r.assetId===rep.assetId) as r}<option value={r.id}>{r.mode}{r.acknowledged?'':' · review limitations'}</option>{/each}</select></label>
        <button onclick={async()=>assetPreview=await act({type:'asset.preview',id:repId})}>Inspect material</button>
        {#each rep.warnings as warning}<p class="warning">{warning}</p>{/each}
        {#if node.type==='context'}<button class="quiet" disabled={locked} onclick={()=>act({type:'node.material',id:node.id,text:editor,attachments:value!.attachments.filter(a=>a!==repId)})}>Remove attachment</button>{/if}
      {/if}</div>
    {/each}
    {#if assetPreview}<div class="attachment"><button class="quiet" onclick={()=>assetPreview=undefined}>Close preview</button>{#if assetPreview.data}<img class="asset-image" src={assetPreview.data} alt={assetPreview.asset.name}/>{#if assetPreview.pageCount}<div class="button-row"><button disabled={assetPreview.page===1} onclick={async()=>assetPreview=await act({type:'asset.preview',id:assetPreview.rep.id,page:assetPreview.page-1})}>Previous</button><span>Page {assetPreview.page}/{assetPreview.pageCount}</span><button disabled={assetPreview.page===assetPreview.pageCount} onclick={async()=>assetPreview=await act({type:'asset.preview',id:assetPreview.rep.id,page:assetPreview.page+1})}>Next</button></div><p class="micro">Local page preview only. The selected inference representation remains unchanged.</p>{/if}{:else if assetPreview.rep.text!==undefined}<pre>{assetPreview.rep.text}</pre>{:else}<p>Original PDF retained. Select its text-only representation to inspect extracted text and page warnings. Direct PDF sends the complete retained bytes.</p>{/if}</div>{/if}
    {#if node.type==='context'}<button class="wide" onclick={extract}>New Workspace from Here</button>{/if}
    {#if entry?.producer}<p class="micro">Generated by a recorded run. Open History for its actual inputs and settings.</p>{/if}
  {/if}
  <details><summary>Connections</summary>{#each Object.values(library.edges).filter(e=>e.source===node.id||e.target===node.id) as edge}<div class="connection-row"><span>{library.nodes[edge.source]?.label} ({edge.sourcePin}) → {library.nodes[edge.target]?.label} ({edge.targetPin})</span><button disabled={locked} onclick={()=>act({type:'edge.remove',id:edge.id})}>Disconnect</button></div>{/each}</details>
</div>
