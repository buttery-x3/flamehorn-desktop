// Start the ordinary executable without debugger/automation flags, in a fresh fixture library.
import { spawn,execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync,mkdirSync,existsSync,writeFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
import assert from 'node:assert/strict';
const executable=process.env.FLAMEHORN_TEST_EXECUTABLE;if(!executable)throw new Error('Set FLAMEHORN_TEST_EXECUTABLE to the candidate.');
const output=resolve('artifacts/package-smoke');mkdirSync(output,{recursive:true});const root=mkdtempSync(join(output,'library-')),dbPath=join(root,'library/library.sqlite');
const env={...process.env,FLAMEHORN_DATA_DIR:root};delete env.ELECTRON_RUN_AS_NODE;let identity;
for(let attempt=0;attempt<2;attempt++){
 const child=spawn(executable,[],{env,stdio:'ignore'});let launchError;child.on('error',error=>launchError=error);
 try{
  let record;for(let i=0;i<100;i++){if(launchError)throw launchError;if(child.exitCode!==null)throw new Error('Ordinary executable exited during startup.');if(existsSync(dbPath)){let db;try{db=new DatabaseSync(dbPath,{readOnly:true});const row=db.prepare("SELECT value FROM metadata WHERE key='library'").get();if(row)record=JSON.parse(row.value);}catch{}finally{db?.close();}}if(record)break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert(record?.id,'A fresh native SQLite library must be durably initialized');if(identity)assert.equal(record.id,identity);else identity=record.id;
  await new Promise(resolve=>setTimeout(resolve,1500));assert.equal(child.exitCode,null);
 }finally{if(child.exitCode===null&&child.pid)execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));}
}
writeFileSync(join(output,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),executable,debuggerFlags:[],freshLibraryInitialized:true,sameLibrarySurvivedForcedRestart:true,starts:2},null,2));console.log('Ordinary executable started twice without debugger flags; native SQLite survived forced fixture restart.');
