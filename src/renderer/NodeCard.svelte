<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { CATALOG, PERSONAS, FORMATS } from '../core/catalog';
  import type { Command, Node as MaterialNode, Run } from '../core/types';
  type CardData = { node:MaterialNode; text:string; version:string; zoom:number; run?:Run; locked:boolean; act:(c:Command)=>Promise<unknown> };
  let {data,selected}:NodeProps = $props();
  let d=$derived(data as unknown as CardData);
  let p=$derived(d.node.process);
  let contract=$derived(p?CATALOG[p.kind]:undefined);
  let active=$derived(d.run&&!['Completed','Partial','Failed','Cancelled','Interrupted'].includes(d.run.state));
</script>

<div class:process-card={!!p} class:material-card={!p} class:selected class:tiny={d.zoom<.4} class:compact-view={d.zoom<.85} class:overview={d.zoom<.55}
  class="node-card" style:--read-scale={1/d.zoom} style:height={p?`${Math.max(164,(contract?.outputs.length??1)*29+30)}px`:'250px'}>
  <div class="card-body">
  <div class="card-heading"><strong>{d.node.label}</strong><span class="micro">{p?'PROCESS':d.version}</span></div>
  {#if d.zoom>=.4}
    {#if p}
      <div class="node-controls nodrag nopan">
        <select aria-label={`${d.node.label} Persona`} value={p.persona.name} disabled={d.locked} onchange={e=>d.act({type:'process.preset',id:d.node.id,component:'persona',name:e.currentTarget.value})}>
          {#if p.persona.name==='Custom'}<option>Custom ⚙</option>{/if}
          {#each Object.keys(PERSONAS) as name}<option value={name}>{name==='None'?'Persona · None':name}</option>{/each}
        </select>
        <select aria-label={`${d.node.label} Format`} value={p.format.name} disabled={d.locked} onchange={e=>d.act({type:'process.preset',id:d.node.id,component:'format',name:e.currentTarget.value})}>
          {#if p.format.name==='Custom'}<option>Custom ⚙</option>{/if}
          {#each Object.keys(FORMATS) as name}<option value={name}>{name==='None'?'Format · None':name}</option>{/each}
        </select>
      </div>
      <div class="card-status micro">{contract?.inputs.length} input{contract?.inputs.length===1?'':'s'} → {contract?.outputs.length} output{contract?.outputs.length===1?'':'s'} · {contract?.calls} call{contract?.calls===1?'':'s'}</div>
      <div class="card-run nodrag nopan">
        <button class="primary compact" disabled={d.locked&&!active} onclick={()=>d.act(active?{type:'stop'}:{type:'run',id:d.node.id,actionId:crypto.randomUUID()})}>{active?'■ Stop':'▶ Run'}</button>
        <span class="micro">{d.run?`${d.run.state} · ${d.run.outputs.filter(o=>o.resultVersionId).length}/${d.run.outputs.length}`:'Ready'}</span>
      </div>
    {:else}
      <div class="card-material">{d.node.missing??d.text??''}{#if !d.text&&!d.node.missing}<span class="muted">{d.node.type==='reference'?'Import a file to begin.':'Select to write or inspect this Context.'}</span>{/if}</div>
      <div class="card-footer nodrag nopan">
        {#if d.node.type==='context'}
          <select aria-label={`${d.node.label} role`} value={d.node.role} disabled={d.locked} onchange={e=>d.act({type:'node.patch',id:d.node.id,role:e.currentTarget.value})}><option value="user">User</option><option value="assistant">Assistant</option></select>
        {:else}<span class="micro">REFERENCE</span>{/if}
        <label class="force-short" title="Force include in context"><input aria-label={`${d.node.label} Force include in context`} type="checkbox" checked={d.node.force} disabled={d.locked} onchange={e=>d.act({type:'node.patch',id:d.node.id,force:e.currentTarget.checked})}/> Force include in context</label>
      </div>
    {/if}
  {/if}
  </div>
  {#each contract?.inputs??['in'] as pin,i}
    <Handle type="target" position={Position.Left} id={pin} isConnectable={!d.locked} style={`top:${p?52+i*38:58}px`} /><span class="pin-label input" style:top={`${p?46+i*38:52}px`}>{pin==='in'?'':pin}</span>
  {/each}
  {#each contract?.outputs??['out'] as pin,i}
    <Handle type="source" position={Position.Right} id={pin} isConnectable={!d.locked} style={`top:${p?42+i*(contract!.outputs.length>3?29:42):58}px`} />
    {#if p&&contract!.outputs.length>1}<span class="pin-label output" style:top={`${36+i*(contract!.outputs.length>3?29:42)}px`}>{pin==='cognitive-science'?'cognitive':pin}</span>{/if}
  {/each}
</div>
