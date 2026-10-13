<script lang="ts">
  import type { LibraryState, Run, Command } from '../core/types';
  let {library,runs,act}:{library:LibraryState;runs:Run[];act:(c:Command)=>Promise<unknown>}=$props();
  let opened=$state('');
</script>
{#if !runs.length}<p class="muted">No recorded runs. Creating and connecting nodes does not generate.</p>{/if}
{#each runs as run}
  <details class="run-record" open={opened===run.id} ontoggle={e=>{if(e.currentTarget.open)opened=run.id;}}>
    <summary><strong>{run.config.kind} · {run.state}</strong><small>{new Date(run.created).toLocaleString()} · {run.outputs.filter(o=>o.resultVersionId).length}/{run.outputs.length} saved</small></summary>
    {#if run.error}<p class="error-text">{run.error}</p>{/if}
    <p class="muted">{run.profile.name} · {run.model}<br/>{run.config.append?'Append':'Replace'} · {run.config.persona.name} · {run.config.format.name}</p>
    {#if run.parentId}<p class="muted">Recovery of {run.parentId}</p>{/if}
    <h4>Actual instruction assembly</h4><pre>{run.compiled.instructions}</pre>
    {#if run.compiled.omitted.length}<p class="warning">Not used: {run.compiled.omitted.join(', ')}</p>{/if}
    <h4>Captured inputs, in order</h4>
    {#each run.compiled.manifest as item}
      <details><summary>{library.nodes[item.nodeId]?.label??'Historical material'} · v{library.entries[item.versionId]?.number??'?'} · {item.role}</summary><p class="micro">{item.reasons.join(' + ')} · {item.branches.join(', ')}</p><pre>{library.contents[item.contentId]?.text??'Material unavailable'}</pre>
      {#each library.contents[item.contentId]?.attachments??[] as repId}<p class="micro">{library.assets[library.representations[repId]?.assetId]?.name??'Missing attachment'} · {library.representations[repId]?.mode}</p>{/each}</details>
    {/each}
    <h4>Calls and saved outputs</h4>
    {#each run.calls as call}<details><summary>{call.stage}{call.slot?` · ${call.slot}`:''} · {call.outcome}</summary><pre>{call.recipe.instructions}</pre>{#if call.error}<p class="error-text">{call.error}</p>{/if}<p class="micro">Usage: {call.usage?JSON.stringify(call.usage):'unknown'}</p>{#each call.summaries??[] as summary}<h4>Provider-returned summary</h4><pre>{summary}</pre>{/each}</details>{/each}
    {#each run.outputs as output}<div class="slot-row"><span>{output.id}</span><span>{output.carried?'Carried forward':output.outcome}</span>{#if output.staged&&!output.resultVersionId}<button onclick={()=>act({type:'save-recovered',id:run.id,slot:output.id})}>Save recovered result</button>{/if}</div>{/each}
    {#if ['Partial','Failed','Cancelled','Interrupted'].includes(run.state)&&run.outputs.some(o=>!o.resultVersionId)}<button onclick={()=>act({type:'retry',id:run.id,actionId:crypto.randomUUID()})}>Retry unfinished outputs</button>{/if}
    <p class="micro">Recovery uses the original captured request and checks unchanged destination bases. Historical roles and settings above do not follow current edits.</p>
  </details>
{/each}
