// Close only the explicitly launched verification instance through its own UI boundary.
import { chromium } from 'playwright';
import { readFileSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root=join(process.env.LOCALAPPDATA,'FlamehornDesktop-LiveVerification');
const port=readFileSync(join(root,'shell/DevToolsActivePort'),'utf8').split('\n')[0];
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('flamehorn://app/'));
if(!page)throw new Error('Verification Flamehorn window is unavailable.');
const recorded=JSON.parse(readFileSync('artifacts/live/results.json','utf8')),ids=[...recorded.local.map(r=>r.runId),recorded.chatgpt.runId];
const evidence=await page.evaluate(async ids=>{const s=await window.flamehorn.state();const account=await window.flamehorn.command({type:'credentials.status'});return {connected:account.accounts.some(a=>a.kind==='chatgpt'&&a.connected&&a.planAllowed),runs:Object.values(s.runs).filter(r=>ids.includes(r.id)).map(r=>({provider:r.profile.kind,mode:r.profile.mode,model:r.model,state:r.state,calls:r.calls.map(c=>({outcome:c.outcome,usage:c.usage?{input_tokens:c.usage.input_tokens,output_tokens:c.usage.output_tokens,total_tokens:c.usage.total_tokens}:'unknown'}))}))};},ids);
writeFileSync('artifacts/live/durable-summary.json',JSON.stringify(evidence,null,2));
await page.evaluate(()=>window.flamehorn.command({type:'app.close'})).catch(error=>{if(!error.message.includes('closed'))throw error;});
await browser.close().catch(()=>{});console.log('Verification app closed gracefully after recording durable run outcomes.');
