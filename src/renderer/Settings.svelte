<script lang="ts">
  import { modalFocus } from './modal-focus';
  import { onMount } from 'svelte';
  import { DEFAULT_CAPABILITIES } from '../core/catalog';
  import type { Capabilities, Command, LibraryState, Profile } from '../core/types';
  let {library,act,close}:{library:LibraryState;act:(c:Command)=>Promise<any>;close:()=>void}=$props();
  let editId=$state<string|undefined>(),name=$state('Local model'),baseUrl=$state('http://127.0.0.1:1234/v1'),mode=$state<'responses'|'chat'>('responses'),manualModel=$state(''),key=$state(''),caps=$state<Capabilities>(structuredClone(DEFAULT_CAPABILITIES)),accounts=$state<any[]>([]),authError=$state(''),busy=$state(false),storage=$state<any>();
  let capabilityModel=$state('');let editingChatGPT=$derived(!!editId&&library.profiles[editId]?.kind==='chatgpt');
  let removeKey=$state(false);
  let backups=$state<{name:string;bytes:number}[]>([]);
  onMount(()=>{void loadAccounts();void act({type:'storage'}).then(v=>storage=v);void act({type:'backups.list'}).then(v=>backups=v);});
  async function removeBackup(name:string){if(!window.confirm(`Delete this local recovery snapshot permanently?\n${name}\nThe current library and exported copies will remain.`))return;await act({type:'backups.delete',name});backups=await act({type:'backups.list'});}
  async function loadAccounts(){const result=await act({type:'credentials.status'});accounts=result.accounts;authError=result.error??'';}
  function edit(p?:Profile){editId=p?.id;name=p?.name??'Local model';baseUrl=p?.baseUrl??'http://127.0.0.1:1234/v1';mode=p?.mode??'responses';manualModel=p?.manualModel??'';key='';removeKey=false;const ws=library.workspaces[library.activeWorkspace];capabilityModel=ws.profileId===p?.id?ws.model??'':p?.manualModel??'';caps=JSON.parse(JSON.stringify(p?.modelCapabilities?.[capabilityModel]??p?.capabilities??DEFAULT_CAPABILITIES));}
  async function signIn(id?:string){busy=true;try{await act({type:'credentials.sign-in',id});await loadAccounts();}catch{/* act already displays the failure in the app. */}finally{busy=false;}}
  async function save(){busy=true;try{await act(editingChatGPT?{type:'profile.capabilities',id:editId,model:capabilityModel,capabilities:caps}:{type:'profile.save',id:editId,name,baseUrl,mode,capabilities:caps,capabilityModel:capabilityModel||manualModel||undefined,manualModel:manualModel||undefined,key:removeKey?'':key||undefined});key='';removeKey=false;}finally{busy=false;}}
</script>
<div class="modal-backdrop">
  <dialog open class="settings modal" aria-modal="true" aria-label="Connections and library" use:modalFocus={close}>
    <header><h2>Connections & library</h2><button onclick={close} aria-label="Close settings">✕</button></header>
    <div class="settings-grid">
      <section><h3>Continue with ChatGPT</h3><p>Use an eligible ChatGPT plan. Sign-in opens your system browser. Your library stays local; material is sent only when you explicitly Run.</p>
        {#if authError}<p class="error-text">{authError}</p>{/if}
        <button class="chatgpt-button" disabled={busy} onclick={()=>signIn()}>Continue with ChatGPT</button>
        {#if busy}<p class="muted">Working… If signing in, finish in your system browser.</p>{/if}
        {#each accounts.filter(a=>a.kind==='chatgpt') as account}<div class="attachment"><strong>{account.label}</strong><p>{account.connected?'Connected':'Sign-in required'}{account.planAllowed===false?' · Plan-use permission missing':''}</p><button disabled={busy} onclick={()=>signIn(account.id)}>Reconnect</button><button disabled={busy} onclick={async()=>{const result=await act({type:'credentials.disconnect',id:account.id});authError=result.message;await loadAccounts();}}>Disconnect</button></div>{/each}
        <button class="quiet" onclick={()=>act({type:'open.usage'})}>ChatGPT usage & account controls ↗</button>
        <h3>Saved connections</h3>
        {#each Object.values(library.profiles) as profile}<div class="connection-setting"><strong>{profile.name}</strong><small>{profile.mode==='chat'?'Chat Completions':'Responses'} · {new URL(profile.baseUrl).host}</small><div class="button-row"><button onclick={()=>edit(profile)}>{profile.kind==='chatgpt'?'Model capabilities':'Edit'}</button><button onclick={()=>act({type:'profile.discover',id:profile.id})}>Refresh models</button></div><small>{profile.discoveredAt?`Last discovered ${new Date(profile.discoveredAt).toLocaleString()}`:'Catalogue not verified'}</small></div>{/each}
        <h3>Library storage</h3>{#if storage}<p class="micro">{storage.location}</p><p>{(storage.libraryBytes/1048576).toFixed(1)} MiB database · {(storage.assetsBytes/1048576).toFixed(1)} MiB assets<br/>{storage.retainedVersions} retained versions · {(storage.recoveryBytes/1048576).toFixed(1)} MiB recovery data</p>{/if}
        <div class="button-row"><button onclick={()=>act({type:'library.export'})}>Export library</button><button onclick={()=>act({type:'library.import'})}>Open library archive</button></div>
        <p class="micro">Archives include private material, retained history and Trash. They are not encrypted. Credentials and host identity are excluded. Import opens a separate library and restarts the app. Daily local backups retain the latest three snapshots.</p>
        <details><summary>Local backups · {(backups.reduce((sum,b)=>sum+b.bytes,0)/1048576).toFixed(1)} MiB</summary>{#each backups as backup}<div class="attachment"><small>{backup.name} · {(backup.bytes/1048576).toFixed(1)} MiB</small><button onclick={()=>removeBackup(backup.name)}>Delete snapshot</button></div>{/each}</details>
      </section>
      <section><h3>{editingChatGPT?'ChatGPT model capabilities':editId?'Edit compatible connection':'Add compatible connection'}</h3><p>Capability selections apply to the named model, route and connection. Changing models never carries over a vision or reasoning claim.</p>
        {#if !editingChatGPT}
        <label>Connection name<input bind:value={name}/></label>
        <label>API base URL<input bind:value={baseUrl}/></label>
        <label>Encoding<select aria-label="Encoding" bind:value={mode}><option value="responses">Responses</option><option value="chat">Chat Completions</option></select></label>
        <label>Optional API key<input type="password" bind:value={key} autocomplete="off" placeholder={editId?'Leave blank to retain key for this origin':'No key for a local server'}/></label>
        {#if editId&&library.profiles[editId]?.credentialId}<label class="check-row"><input type="checkbox" bind:checked={removeKey}/> Remove saved API key when saving (stops an active run)</label>{/if}
        <label>Manual model ID (if discovery is unavailable)<input bind:value={manualModel}/></label>
        {/if}
        <details open><summary>Model capability profile</summary><p class="micro">These declarations are not evidence of a live verification. Update the profile for the selected model and server version.</p>
          <label>Model ID these capabilities describe<input bind:value={capabilityModel} placeholder={manualModel||'Exact selected model ID'}/></label>
          <label>Evidence / server and model version<input bind:value={caps.source}/></label>
          <div class="two-col"><label>Context tokens<input type="number" min="1" bind:value={caps.contextTokens}/></label><label>Generation headroom<input type="number" min="1" bind:value={caps.outputTokens} placeholder="4096"/></label></div>
          <label>Maximum encoded request bytes<input type="number" min="1" bind:value={caps.requestBytes}/></label>
          <label>Overflow behaviour<select aria-label="Overflow behaviour" bind:value={caps.overflow}><option value="unknown">Unknown — show uncertainty</option><option value="reject">Server configured to reject overflow</option><option value="truncate">Server truncates — block Run</option></select></label>
          {#each [['images','User-role image input'],['pdf','Direct PDF input'],['assistantAssets','Assistant-role image/PDF input']] as [field,label]}
            <label>{label}<select value={caps[field as 'images']} onchange={e=>caps[field as 'images']=e.currentTarget.value as any}><option value="unknown">Unknown / not verified</option><option value="declared">Supported — user declared</option><option value="unsupported">Unsupported</option></select></label>
          {/each}
          <label class="check-row"><input type="checkbox" bind:checked={caps.outputCap}/> Supports an output-token cap</label>
          <label>Supported reasoning efforts (comma-separated)<input value={caps.reasoningValues.join(', ')} onchange={e=>caps.reasoningValues=e.currentTarget.value.split(',').map(s=>s.trim()).filter(Boolean)}/></label>
          <label>Reasoning effort<select value={caps.reasoning??''} onchange={e=>caps.reasoning=e.currentTarget.value||undefined}><option value="">Provider default</option>{#each caps.reasoningValues as effort}<option>{effort}</option>{/each}</select></label>
        </details>
        <div class="button-row"><button class="primary" disabled={busy} onclick={save}>Save connection</button>{#if editId}<button onclick={()=>edit()}>New connection</button>{/if}</div>
        <p class="micro">Saving a profile does not generate. Refresh models contacts only its metadata endpoint. Choose the connection and model in the Workspace before Run.</p>
      </section>
    </div>
  </dialog>
</div>
