// Metadata-only restart check of the explicitly authorized verification library.
import { _electron as electron } from 'playwright';
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
import assert from 'node:assert/strict';
const recorded=JSON.parse(readFileSync('artifacts/live/results.json','utf8'));
if(recorded.chatgpt.state!=='Completed')throw new Error('Complete the separately authorized live check first.');
const env={...process.env,FLAMEHORN_DATA_DIR:join(process.env.LOCALAPPDATA,'FlamehornDesktop-LiveVerification')};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:process.env.FLAMEHORN_TEST_EXECUTABLE??resolve('out/Flamehorn Desktop-win32-x64/Flamehorn Desktop.exe'),env});
try{
 const page=await app.firstWindow();await page.locator('.breadcrumb strong').waitFor();
 const command=c=>page.evaluate(c=>window.flamehorn.command(c),c),state=()=>page.evaluate(()=>window.flamehorn.state());
 const before=await state(),status=await command({type:'credentials.status'});
 assert(status.accounts.some(a=>a.kind==='chatgpt'&&a.connected&&a.planAllowed));
 const models=await command({type:'profile.discover',id:recorded.chatgpt.profileId});assert(models.some(m=>m.id===recorded.chatgpt.model));
 const summaries=[];
 for(const expected of [...recorded.local,recorded.chatgpt]){const run=before.runs[expected.runId];assert.equal(run.state,'Completed');assert.equal(run.calls.length,1);const content=before.contents[before.entries[run.outputs[0].resultVersionId].contentId];assert.equal(content.text,expected.output);summaries.push({provider:run.profile.kind,mode:run.profile.mode,model:run.model,state:run.state,output:content.text});}
 assert.equal(Object.keys((await state()).runs).length,Object.keys(before.runs).length);
 writeFileSync('artifacts/live/restart.json',JSON.stringify({checkedAt:new Date().toISOString(),protectedSessionReopened:true,modelStillListed:true,additionalInferenceCalls:0,results:summaries},null,2));
 await command({type:'app.close'}).catch(e=>{if(!e.message.includes('closed'))throw e;});console.log('Protected session, model discovery and all three recorded fixture results survived restart; no inference sent.');
}finally{await app.close().catch(()=>{});}
