<script lang="ts">
  import { modalFocus } from './modal-focus';
  import { onMount, tick } from 'svelte';
  import { SvelteFlow, Background, type Node as FlowNode, type Edge as FlowEdge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { CATALOG, PERSONAS, FORMATS } from '../core/catalog';
  import { connectionError } from '../core/compiler';
  import type { Command, LibraryState, Kind, Compiled, RuntimeEvent } from '../core/types';
  import NodeCard from './NodeCard.svelte';
  import Inspector from './Inspector.svelte';
  import Settings from './Settings.svelte';
  let library=$state<LibraryState>(),selected=$state(''),notice=$state(''),settings=$state(false),trash=$state(false),newWorkspace=$state(false),workspaceName=$state('New Workspace');
  let nodes=$state.raw<FlowNode[]>([]),edges=$state.raw<FlowEdge[]>([]),viewport=$state({x:40,y:40,zoom:1}),canvas:HTMLDivElement;
  let palette=$state<{x:number;y:number;worldX:number;worldY:number;source?:string;sourcePin?:string}|undefined>();
  let runPreview=$state<{id:string;actionId:string;compiled:Compiled}|undefined>(),stream=$state<Record<string,string>>({}),busy=$state(false);
  let flush:()=>Promise<void>=async()=>{},queue=Promise.resolve<unknown>(undefined),lastWorkspace='',refreshTimer:ReturnType<typeof setTimeout>|undefined;
  const nodeTypes={flamehorn:NodeCard};
  let workspace=$derived(library?.workspaces[library.activeWorkspace]);
  let profile=$derived(workspace?.profileId?library?.profiles[workspace.profileId]:undefined);
  let selectedNode=$derived(library?.nodes[selected]);
  let activeRun=$derived(library?Object.values(library.runs).find(r=>!['Completed','Partial','Failed','Cancelled','Interrupted'].includes(r.state)):undefined);
  function rebuild(){if(!library||!workspace)return;
    if(lastWorkspace!==workspace.id){viewport={...workspace.viewport};lastWorkspace=workspace.id;selected='';}
    const runs=Object.values(library.runs).sort((a,b)=>b.created.localeCompare(a.created));
    nodes=Object.values(library.nodes).filter(n=>n.workspaceId===workspace!.id&&!n.removed).map(n=>{
      const entry=n.selected?library!.entries[n.selected]:undefined,c=entry?library!.contents[entry.contentId]:undefined;
      const text=n.type==='reference'?(c?.attachments.map(r=>{const rep=library!.representations[r];return rep?.text??`${library!.assets[rep?.assetId]?.name??'Unavailable file'}\n${rep?.mode??''}`;}).join('\n')??''):(c?.text??'');
      const locked=!!activeRun&&(activeRun.processId===n.id||activeRun.outputs.some(o=>o.nodeId===n.id));
      return {id:n.id,type:'flamehorn',position:{x:n.x,y:n.y},selected:n.id===selected,data:{node:n,text,version:entry?`v${entry.number}${entry.retained?'':' · draft'}`:'awaiting result',zoom:viewport.zoom,run:runs.find(r=>r.processId===n.id),locked,act},deletable:false};
    });
    edges=Object.values(library.edges).filter(e=>e.workspaceId===workspace!.id).map(e=>({id:e.id,source:e.source,target:e.target,sourceHandle:e.sourcePin,targetHandle:e.targetPin,type:'default',deletable:false}));
  }
  async function refresh(){library=await window.flamehorn.state();if(selected&&(!library.nodes[selected]||library.nodes[selected].removed))selected='';rebuild();}
  async function act(c:Command,flushFirst=true):Promise<any>{
    try{
      if(flushFirst)await flush();
      if(c.type==='run'){
        await queue.catch(()=>{});
        const compiled=await window.flamehorn.command({type:'preview',id:c.id}) as Compiled;
        runPreview={id:c.id as string,actionId:c.actionId as string,compiled};return;
      }
      // Svelte state uses proxies. Capture plain command data before crossing IPC.
      const payload=JSON.parse(JSON.stringify(c));
      // Browser consent can take minutes. It must not hold the local editing/close queue.
      if(c.type==='credentials.sign-in'){const result=await window.flamehorn.command(payload);await refresh();return result;}
      const task=queue.catch(()=>{}).then(async()=>{busy=true;try{const result=await window.flamehorn.command(payload);await refresh();return result;}finally{busy=false;}});
      queue=task;return await task;
    }catch(error){notice=error instanceof Error?error.message:'Operation failed.';throw error;}
  }
  async function runConfirmed(){if(!runPreview)return;const request=runPreview;runPreview=undefined;try{await flush();await queue.catch(()=>{});await window.flamehorn.command({type:'run',id:request.id,actionId:request.actionId});await refresh();}catch(error){notice=error instanceof Error?error.message:'Run failed.';}}
  async function select(id:string){try{await flush();selected=id;rebuild();}catch{}}
  async function create(type:'context'|'reference'|'process',kind?:Kind){
    if(!library||!workspace)return;const pos=palette??{worldX:(100-viewport.x)/viewport.zoom,worldY:(100-viewport.y)/viewport.zoom};
    if(!palette)while(Object.values(library.nodes).some(n=>n.workspaceId===workspace!.id&&!n.removed&&Math.abs(n.x-pos.worldX)<300&&Math.abs(n.y-pos.worldY)<240)){pos.worldX+=360;if((pos.worldX*viewport.zoom+viewport.x)>canvas.clientWidth-300){pos.worldX=(100-viewport.x)/viewport.zoom;pos.worldY+=280;}}
    palette=undefined;
    const nodeId=await act({type:'node.create',workspaceId:workspace.id,nodeType:type,kind,x:pos.worldX,y:pos.worldY,source:'source'in pos?pos.source:undefined,sourcePin:'sourcePin'in pos?pos.sourcePin:undefined});
    await select(nodeId);if(type==='reference')await act({type:'asset.import',id:nodeId});
  }
  function creationPalette(event:MouseEvent,source?:string,sourcePin?:string){const rect=canvas.getBoundingClientRect(),inside=event.clientY>=rect.top;palette={x:Math.min(event.clientX,rect.right-240),y:Math.max(rect.top,Math.min(event.clientY,rect.bottom-400)),worldX:((inside?event.clientX-rect.left:rect.width/2)-viewport.x)/viewport.zoom,worldY:((inside?event.clientY-rect.top:100)-viewport.y)/viewport.zoom,source,sourcePin};}
  function zoom(value:number){const next=Math.max(.2,Math.min(2,value)),cx=canvas.clientWidth/2,cy=canvas.clientHeight/2;viewport={x:cx-(cx-viewport.x)/viewport.zoom*next,y:cy-(cy-viewport.y)/viewport.zoom*next,zoom:next};rebuild();void saveViewport();}
  async function saveViewport(){if(workspace)await act({type:'workspace.viewport',id:workspace.id,...viewport});}
  async function emptyTrash(){const plan=await act({type:'purge.preview'});if(window.confirm(`Permanently purge ${plan.nodes.length} unreferenced objects and ${plan.runs.length} exclusive runs?\n${plan.protectedNodes.length} objects are protected by surviving history.\nEstimated asset space: ${(plan.bytes/1048576).toFixed(1)} MiB.\n\n${plan.warning}\n\nThis also removes relevant Undo recovery.`))await act({type:'purge'});}
  function onConnectEnd(event:any,connection:any){if(connection.isValid||connection.toNode||connection.fromHandle?.type!=='source')return;const pointer='changedTouches'in event?event.changedTouches[0]:event;creationPalette(pointer,connection.fromNode?.id,connection.fromHandle?.id);}
  onMount(()=>{
    void refresh().catch(error=>notice=error.message);
    const unsubscribe=window.flamehorn.subscribe(event=>{
      if(event.type==='closing'){void flush().then(()=>act({type:'app.close'},false)).catch(()=>{});return;}
      if(event.type==='fatal'||event.type==='notice'){notice=String(event.data);return;}
      if(event.type==='runtime'){
        const e=event.data as RuntimeEvent;
        if(e.type==='call.delta'){const current=stream[e.runId]??'';stream={...stream,[e.runId]:(current+e.text).slice(-1024*1024)};return;}
        if(e.type==='call.started')stream={...stream,[e.runId]:''};
        if(e.type==='save.failed')notice=e.text??'Save failed';
      }
      if(!refreshTimer)refreshTimer=setTimeout(()=>{refreshTimer=undefined;void refresh().catch(error=>notice=error.message);},80);
    });
    return()=>{unsubscribe();if(refreshTimer)clearTimeout(refreshTimer);};
  });
  $effect(()=>{viewport.zoom; if(library)rebuild();});
</script>

<svelte:window onkeydown={e=>{if(e.key==='Escape'){palette=undefined;runPreview=undefined;}if(e.ctrlKey&&e.key==='s'){e.preventDefault();void flush().catch(()=>{});}}}/>
<div class="desktop" data-theme={library?.theme??'dark'}>
  <header class="appbar"><div class="brand"><span class="brand-mark">✳</span> FLAMEHORN <span>DESKTOP</span></div><span class="library-label">Local library</span><div class="app-actions"><button onclick={()=>settings=true}>Connections & library</button><button aria-label="Toggle theme" title="Toggle theme" onclick={()=>act({type:'theme',value:library?.theme==='dark'?'light':'dark'})}>◐</button></div></header>
  <div class="toolbar"><span class="breadcrumb">Workspace / <strong>{workspace?.name??'Opening library…'}</strong></span><div class="button-row"><button onclick={()=>create('context')}>＋ Context</button><button onclick={()=>create('reference')}>＋ Reference</button><button onclick={e=>creationPalette(e)}>＋ Process</button></div><span class="toolbar-divider"></span><label class="toolbar-select">Persona<select aria-label="Creation Persona" value={library?.defaults.persona??'None'} onchange={e=>act({type:'defaults',persona:e.currentTarget.value})}>{#each Object.keys(PERSONAS) as name}<option>{name}</option>{/each}</select></label><label class="toolbar-select">Format<select aria-label="Creation Format" value={library?.defaults.format??'None'} onchange={e=>act({type:'defaults',format:e.currentTarget.value})}>{#each Object.keys(FORMATS) as name}<option>{name}</option>{/each}</select></label></div>
  {#if notice}<div class="notice" role="alert"><span>{notice}</span><button aria-label="Dismiss message" onclick={()=>notice=''}>✕</button></div>{/if}
  <div class="providerbar"><label>Connection<select aria-label="Workspace connection" value={workspace?.profileId??''} onchange={e=>workspace&&act({type:'workspace.provider',id:workspace.id,profileId:e.currentTarget.value||undefined,model:undefined})}><option value="">Offline · choose for generation</option>{#each Object.values(library?.profiles??{}) as p}<option value={p.id}>{p.name}</option>{/each}</select></label>{#if profile}<label>Model<select aria-label="Workspace model" value={workspace?.model??''} onchange={e=>workspace&&act({type:'workspace.provider',id:workspace.id,profileId:profile!.id,model:e.currentTarget.value||undefined})}><option value="">Choose a model</option>{#each profile.models as model}<option value={model.id}>{model.name}</option>{/each}{#if profile.manualModel&&!profile.models.some(m=>m.id===profile!.manualModel)}<option value={profile.manualModel}>{profile.manualModel} · unverified</option>{/if}</select></label><span class="micro">{new URL(profile.baseUrl).host} · {profile.kind==='chatgpt'?'ChatGPT plan':new URL(profile.baseUrl).protocol==='http:'?'Local endpoint':'API billing'}</span>{/if}<div class="view-controls"><button onclick={()=>workspace&&act({type:'undo',workspaceId:workspace.id})}>Undo</button><button onclick={()=>workspace&&act({type:'workspace.arrange',id:workspace.id})}>Arrange conversation</button><button aria-label="Zoom out" onclick={()=>zoom(viewport.zoom-.1)}>−</button><button title="Reset zoom" onclick={()=>zoom(1)}>{Math.round(viewport.zoom*100)}%</button><button aria-label="Zoom in" onclick={()=>zoom(viewport.zoom+.1)}>＋</button></div></div>
  <main><div class="canvas" bind:this={canvas}>
    {#if library&&workspace}{#key workspace.id}<SvelteFlow bind:nodes bind:edges bind:viewport {nodeTypes} minZoom={.2} maxZoom={2} deleteKey={null}
      onnodeclick={({node})=>select(node.id)}
      onnodedragstop={({nodes:dragged})=>act({type:'node.move',positions:dragged.map(n=>({id:n.id,x:n.position.x,y:n.position.y}))})}
      onconnect={connection=>act({type:'edge.connect',source:connection.source,sourcePin:connection.sourceHandle??'out',target:connection.target,targetPin:connection.targetHandle??'in'})}
      isValidConnection={connection=>!connectionError(library!,{workspaceId:workspace!.id,source:connection.source,sourcePin:connection.sourceHandle??'out',target:connection.target,targetPin:connection.targetHandle??'in'})}
      onconnectend={onConnectEnd} onmoveend={()=>saveViewport()} onpanecontextmenu={({event})=>{event.preventDefault();creationPalette(event);}} onpaneclick={()=>palette=undefined}
      onedgeclick={({edge})=>{if(window.confirm('Disconnect this edge? Material and retained history will remain.'))void act({type:'edge.remove',id:edge.id});}}
    ><Background gap={40} size={1} /></SvelteFlow>{/key}{/if}
    {#if library&&!nodes.length}<div class="empty-state"><span class="empty-glyph">✳</span><h1>A place to explore an idea.</h1><p>Write a Context, connect a Process, inspect the request,<br/>then Run when you’re ready.</p><button class="primary" onclick={()=>create('context')}>Create your first Context</button><p class="micro">Reading, writing and importing work offline.</p></div>{/if}
    {#if activeRun}<div class="running-bar"><strong>{activeRun.config.kind} · {activeRun.state}</strong><span>{activeRun.outputs.filter(o=>o.resultVersionId).length} of {activeRun.outputs.length} saved</span><button onclick={async()=>{await act({type:'workspace.select',id:activeRun!.workspaceId});await select(activeRun!.processId);}}>Show</button><button onclick={()=>act({type:'stop'})}>■ Stop</button></div>{/if}
  </div><aside class="inspector">{#if selectedNode&&library&&!selectedNode.removed}{#key selectedNode.id}<Inspector {library} node={selectedNode} {act} registerFlush={fn=>flush=fn} stream={activeRun?stream[activeRun.id]??'':''}/>{/key}{:else}<div class="inspector-empty"><span>INSPECTOR</span><h3>Follow your material.</h3><p>Select a Context to read or edit it. Select a Process to inspect instructions, the next request and recorded runs.</p><div class="pin-legend"><span>■</span> Input <span>■</span> Output</div><p class="micro">Drag between pins to connect. Drag an output to empty space to create the next node. Blue selection shows what you’re reading; it doesn’t change context inclusion.</p>{#if workspace?.report}<h4>Extraction report</h4>{#each workspace.report as line}<p class="micro">{line}</p>{/each}{/if}</div>{/if}</aside></main>
  <footer><div class="workspaces">{#each Object.values(library?.workspaces??{}).filter(w=>!w.removed).sort((a,b)=>a.order-b.order) as ws}<button class:active={ws.id===workspace?.id} onclick={()=>act({type:'workspace.select',id:ws.id})} ondblclick={()=>{workspaceName=ws.name;newWorkspace=true;}}>◈ {ws.name}</button>{/each}<button aria-label="New Workspace" onclick={()=>{workspaceName='New Workspace';newWorkspace=true;}}>＋</button></div><button onclick={()=>trash=true}>Trash</button><span class="footer-note">{busy?'Working locally…':'Local-first · explicit runs'}</span></footer>
</div>
{#if palette}<div class="palette" style:left={`${palette.x}px`} style:top={`${palette.y}px`}><strong>Create & connect</strong>{#if !palette.source||library?.nodes[palette.source]?.type!=='process'}<button onclick={()=>create('context')}>Context · User</button>{/if}{#if !palette.source}<button onclick={()=>create('reference')}>Reference · import file</button>{/if}{#if palette.source&&library?.nodes[palette.source]?.type==='process'}<button onclick={()=>create('context')}>Context · Assistant destination</button>{:else}{#each Object.keys(CATALOG) as kind}<button onclick={()=>create('process',kind as Kind)}>{kind}<small>{CATALOG[kind as Kind].inputs.length} → {CATALOG[kind as Kind].outputs.length}</small></button>{/each}{/if}</div>{/if}
{#if settings&&library}<Settings {library} {act} close={()=>settings=false}/>{/if}
{#if newWorkspace}<div class="modal-backdrop"><dialog open class="modal small" aria-modal="true" aria-label="New Workspace" use:modalFocus={()=>newWorkspace=false}><h2>New Workspace</h2><label>Name<input bind:value={workspaceName}/></label><div class="button-row"><button class="primary" onclick={async()=>{await act({type:'workspace.create',name:workspaceName});newWorkspace=false;}}>Create Workspace</button><button onclick={()=>newWorkspace=false}>Cancel</button></div>{#if workspace}<details><summary>Current Workspace</summary><button onclick={async()=>{await act({type:'workspace.rename',id:workspace!.id,name:workspaceName});newWorkspace=false;}}>Rename current</button><button onclick={async()=>{await act({type:'workspace.remove',id:workspace!.id});newWorkspace=false;}}>Move current to Trash</button></details>{/if}</dialog></div>{/if}
{#if trash&&library}<div class="modal-backdrop"><dialog open class="modal small" aria-modal="true" aria-label="Trash" use:modalFocus={()=>trash=false}><header><h2>Trash</h2><button onclick={()=>trash=false}>✕</button></header><p>Removed objects retain their history. Restoring a node does not reconnect its detached edges; Undo can restore the graph action.</p><button onclick={emptyTrash}>Preview & empty Trash</button>{#each Object.values(library.workspaces).filter(w=>w.removed&&!w.purged) as ws}<div class="slot-row">{ws.name}<button onclick={()=>act({type:'workspace.restore',id:ws.id})}>Restore Workspace</button></div>{/each}{#each Object.values(library.nodes).filter(n=>n.removed&&!n.purged) as node}<div class="slot-row">{node.label}<button onclick={()=>act({type:'node.restore',id:node.id})}>Restore node</button></div>{/each}</dialog></div>{/if}
{#if runPreview}<div class="modal-backdrop"><dialog open class="modal small" aria-modal="true" aria-label="Run Process" use:modalFocus={()=>runPreview=undefined}><h2>Run {library?.nodes[runPreview.id]?.process?.kind}</h2><p>{profile?.name??'No connection selected'} · {workspace?.model??'No model selected'}</p><p>{runPreview.compiled.manifest.length} material contributions · {runPreview.compiled.outputCount} outputs · {runPreview.compiled.callCount} sequential calls</p>{#if profile}<p class="warning">Run sends the complete compiled material and selected attachments to {new URL(profile.baseUrl).origin}. {profile.kind==='chatgpt'?'Uses the selected ChatGPT plan’s allowance.':'Uses this endpoint’s configured billing or local resources.'}</p>{/if}{#each runPreview.compiled.errors as error}<p class="error-text">{error}</p>{/each}{#each runPreview.compiled.warnings as warning}<p class="micro">{warning}</p>{/each}<p class="micro">Missing destinations are created after validation. Nothing downstream runs automatically.</p><div class="button-row"><button class="primary" disabled={!!runPreview.compiled.errors.length||!profile||!workspace?.model||!!activeRun} onclick={runConfirmed}>▶ Run now</button><button onclick={()=>runPreview=undefined}>Cancel</button></div></dialog></div>{/if}
