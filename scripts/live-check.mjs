// Explicitly authorized live verification. Never run as part of automated tests.
// One ChatGPT text generation maximum, after the user completes browser sign-in.
import { _electron as electron } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const output=resolve('artifacts/live');mkdirSync(output,{recursive:true});
if(process.env.FLAMEHORN_AUTHORIZE_LIVE_CHECK!=='1')throw new Error('Requires explicit user authorization and FLAMEHORN_AUTHORIZE_LIVE_CHECK=1.');
const env={...process.env,FLAMEHORN_DATA_DIR:join(process.env.LOCALAPPDATA,'FlamehornDesktop-LiveVerification')};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:resolve('out/Flamehorn Desktop-win32-x64/Flamehorn Desktop.exe'),env});
const page=await app.firstWindow();await page.locator('.breadcrumb strong').waitFor();
const command=c=>page.evaluate(c=>window.flamehorn.command(c),c),state=()=>page.evaluate(()=>window.flamehorn.state());
const previous=existsSync(join(output,'results.json'))?JSON.parse(readFileSync(join(output,'results.json'),'utf8')):undefined;
if(previous?.chatgpt?.generationAttempted)throw new Error('A ChatGPT generation was already attempted. Do not repeat without fresh authorization.');
const results={startedAt:new Date().toISOString(),local:previous?.local??[],localMetadata:previous?.localMetadata,chatgpt:{state:'Awaiting browser sign-in'},previousAttempts:previous?[...(previous.previousAttempts??[]),{startedAt:previous.startedAt,chatgpt:previous.chatgpt}]:[]};
function save(){writeFileSync(join(output,'results.json'),JSON.stringify(results,null,2));}
async function runFixture(workspaceId,profileId,model,expected){
 await command({type:'workspace.provider',id:workspaceId,profileId,model});
 const source=await command({type:'node.create',workspaceId,nodeType:'context',x:60,y:100});
 await command({type:'node.material',id:source,text:`This is a public software connection check. Reply with exactly ${expected}.`});
 const processId=await command({type:'node.create',workspaceId,nodeType:'process',kind:'Respond',x:400,y:100,source,sourcePin:'out'});
 await command({type:'process.edit',id:processId,instruction:'Follow the source request. Return only the requested short confirmation.',persona:'',format:''});
 const preview=await command({type:'preview',id:processId});
 const runId=await command({type:'run',id:processId,actionId:crypto.randomUUID()});
 const started=Date.now();let s,run;
 do{await new Promise(resolve=>setTimeout(resolve,500));s=await state();run=s.runs[runId];}while(!['Completed','Partial','Failed','Cancelled','Interrupted'].includes(run.state)&&Date.now()-started<910000);
 const entryId=run.outputs[0]?.resultVersionId;
 const entry=entryId&&s.entries[entryId];
 return {model,state:run.state,error:run.error,elapsedMs:Date.now()-started,calls:run.calls?.length,output:entry?s.contents[entry.contentId]?.text:undefined,warnings:preview.warnings,runId};
}
save();console.log('Packaged Flamehorn opened. Starting system-browser sign-in; no generation yet.');
app.process().once('exit',(code,signal)=>console.log(`Verification app exited: code=${code}, signal=${signal}.`));
await page.getByRole('button',{name:'Connections & library',exact:true}).click();
await page.getByRole('button',{name:'Continue with ChatGPT',exact:true}).click();
const auth=(async()=>{
 const start=Date.now();let result;
 while(!result&&Date.now()-start<630000){const s=await state();const p=Object.values(s.profiles).find(p=>p.kind==='chatgpt');if(p){const status=await command({type:'credentials.status'}),account=status.accounts.find(a=>a.id===p.credentialId);if(account?.connected)result={profileId:p.id,account};}if(!result){const failure=await page.locator('.notice').textContent().catch(()=>null);if(failure)throw new Error(failure);await new Promise(resolve=>setTimeout(resolve,500));}}
 if(!result)throw new Error('Sign-in did not complete within its browser handoff window.');
 const models=await command({type:'profile.discover',id:result.profileId});
 results.chatgpt={state:'Signed in; model discovery succeeded; awaiting selection',profileId:result.profileId,planAllowed:result.account.planAllowed,models};save();
 console.log('ChatGPT sign-in and discovery succeeded; model catalogue saved without identity or credentials.');return result;
})().catch(error=>{results.chatgpt={state:'Failed',error:error.message};save();console.log('ChatGPT sign-in/discovery failed: '+error.message);return undefined;});
try{
 const model='gemma4-12b-qat-uncensored-hauhaucs-balanced';
 const native=await (await fetch('http://127.0.0.1:1234/api/v0/models')).json();
 results.localMetadata=native.data.find(m=>m.id===model);save();
 for(const mode of ['responses','chat']){
  if(results.local.some(r=>r.mode===mode&&r.state==='Completed'))continue;
  const workspaceId=await command({type:'workspace.create',name:`Live local check · ${mode}`});
  const caps={text:'declared',roles:'declared',images:'unknown',pdf:'unknown',assistantAssets:'unknown',overflow:'unknown',contextTokens:results.localMetadata?.loaded_context_length,outputTokens:256,outputCap:true,reasoningValues:[],source:'User supplied local server; live /api/v0/models metadata 2026-10-13. Overflow and multimodal behavior unverified.',revision:1};
  const profileId=await command({type:'profile.save',name:`Local Gemma · ${mode}`,baseUrl:'http://127.0.0.1:1234/v1',mode,capabilities:caps,capabilityModel:model,manualModel:model});
  const catalogue=await command({type:'profile.discover',id:profileId});
  if(!catalogue.some(m=>m.id===model))throw new Error('Requested model was absent from live discovery.');
  const result=await runFixture(workspaceId,profileId,model,'FLAMEHORN_LOCAL_OK');results.local.push({mode,...result});save();console.log(`Local ${mode}: ${result.state}`);
 }
 const account=await auth;
 if(account){
  console.log('Waiting for an explicitly selected discovered ChatGPT model in artifacts/live/chatgpt-model.json.');
  while(!existsSync(join(output,'chatgpt-model.json')))await new Promise(resolve=>setTimeout(resolve,1000));
  const {model}=JSON.parse(readFileSync(join(output,'chatgpt-model.json'),'utf8'));
  if(!results.chatgpt.models.some(m=>m.id===model))throw new Error('Selected ChatGPT model was not in the live catalogue.');
  const workspaceId=await command({type:'workspace.create',name:'Live ChatGPT check'});
  results.chatgpt.generationAttempted=true;save();
  const result=await runFixture(workspaceId,account.profileId,model,'FLAMEHORN_CHATGPT_OK');
  results.chatgpt={...results.chatgpt,...result};save();console.log(`ChatGPT single generation: ${result.state}`);
 }
}catch(error){results.harnessError=error.message;save();console.log('Live check stopped: '+error.message);}
console.log('Verification complete; keeping Flamehorn open until the user closes it.');
await new Promise(resolve=>page.once('close',resolve));
await app.close().catch(()=>{});
