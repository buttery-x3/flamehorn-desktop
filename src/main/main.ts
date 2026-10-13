import { app, BrowserWindow, dialog, ipcMain, protocol, net, session, shell } from 'electron';
import { Worker } from 'node:worker_threads';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Credentials } from './credentials';
import { commandSchema } from '../core/commands';
import { DEFAULT_CAPABILITIES } from '../core/catalog';
import { validateBaseUrl, safeProviderError } from './provider';
import type { LibraryState, Profile } from '../core/types';
import { terminal } from '../core/library';
import { boundedJson } from './http-json';

protocol.registerSchemesAsPrivileged([{scheme:'flamehorn',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
const dataRoot=process.env.FLAMEHORN_DATA_DIR??join(process.env.LOCALAPPDATA??app.getPath('appData'),'FlamehornDesktop');
mkdirSync(dataRoot,{recursive:true});app.setPath('userData',join(dataRoot,'shell'));
if(!app.requestSingleInstanceLock()){app.quit();}else{
  void app.whenReady().then(start).catch(error=>{dialog.showErrorBox('Flamehorn could not start',error instanceof Error?error.message:'Unknown startup failure');app.quit();});
}
let window:BrowserWindow,worker:Worker,credentials:Credentials|undefined,credentialError:string|undefined,closing=false;
const requests=new Map<string,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
const bootstrap=join(dataRoot,'library-selection.json');
let directory=join(dataRoot,'library');
if(existsSync(bootstrap)){
  try{const chosen=JSON.parse(readFileSync(bootstrap,'utf8')).directory;if(typeof chosen==='string'&&relative(dataRoot,chosen)&&!relative(dataRoot,chosen).startsWith('..')&&!isAbsolute(relative(dataRoot,chosen)))directory=chosen;}catch{}
}
function call(method:string,extra:Record<string,unknown>={}):Promise<any>{const id=randomUUID();return new Promise((resolve,reject)=>{requests.set(id,{resolve,reject});worker.postMessage({...extra,id,method});});}
async function start(){
  try{credentials=new Credentials(join(dataRoot,'credentials'));}catch(error){credentialError=error instanceof Error?error.message:'Protected storage unavailable.';}
  worker=new Worker(join(__dirname,'worker.cjs'),{workerData:{directory,backups:join(dataRoot,'backups'),libraries:join(dataRoot,'libraries')}});
  const ready=new Promise<void>((resolve,reject)=>{
    worker.on('message',async message=>{
      if(message.ready){resolve();return;}
      if(message.credential){try{if(!credentials)throw new Error(credentialError);const p=message.profile as Profile;const token=await credentials.token(p.credentialId,new URL(p.baseUrl).origin);worker.postMessage({credentialResult:message.credential,token});}catch(error){worker.postMessage({credentialResult:message.credential,error:error instanceof Error?error.message:'Credential unavailable.'});}return;}
      if(message.event){if(window&&!window.isDestroyed())window.webContents.send('flamehorn:event',message.event);return;}
      const pending=requests.get(message.id);requests.delete(message.id);if(message.error)pending?.reject(new Error(message.error));else pending?.resolve(message.result);
    });
    worker.on('error',(error:Error)=>{reject(error);for(const request of requests.values())request.reject(new Error('Local library service stopped. Your last acknowledged saves remain on disk.'));requests.clear();window?.webContents.send('flamehorn:event',{type:'fatal',data:error.message});});
  });
  await ready;
  const rendererRoot=join(__dirname,'renderer');
  protocol.handle('flamehorn',request=>{
    const url=new URL(request.url);if(url.host!=='app')return new Response('Forbidden',{status:403});
    let pathname:string;try{pathname=decodeURIComponent(url.pathname);}catch{return new Response('Bad path',{status:400});}
    const target=resolve(rendererRoot,'.'+(pathname==='/'?'/index.html':pathname));const rel=relative(rendererRoot,target);
    if(rel.startsWith('..')||isAbsolute(rel))return new Response('Forbidden',{status:403});
    return net.fetch(pathToFileURL(target).href);
  });
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  window=new BrowserWindow({width:1440,height:930,minWidth:980,minHeight:640,title:'Flamehorn Desktop',backgroundColor:'#181a1e',show:false,webPreferences:{preload:join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:!app.isPackaged}});
  window.removeMenu();window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  function validSender(event:Electron.IpcMainInvokeEvent){if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||!event.senderFrame.url.startsWith('flamehorn://app/'))throw new Error('Untrusted application command.');}
  ipcMain.handle('flamehorn:state',async event=>{validSender(event);return call('state');});
  ipcMain.handle('flamehorn:command',async(event,raw)=>{
    validSender(event);
    try{return {ok:true,value:await execute(commandSchema.parse(raw))};}
    catch(error){return {ok:false,error:error instanceof Error?error.message:'Operation failed.'};}
  });
  window.on('close',event=>{if(!closing){event.preventDefault();window.webContents.send('flamehorn:event',{type:'closing'});}});
  window.once('ready-to-show',()=>window.show());
  await window.loadURL('flamehorn://app/');
  app.on('second-instance',()=>{if(window.isMinimized())window.restore();window.focus();});
  void call('backup').catch((error:Error)=>window.webContents.send('flamehorn:event',{type:'notice',data:`Daily backup failed: ${error.message}`}));
}
async function execute(c:ReturnType<typeof commandSchema.parse>):Promise<unknown>{
  switch(c.type){
    case 'run':{
      const s=await call('state') as LibraryState,n=s.nodes[c.id],ws=n&&s.workspaces[n.workspaceId],p=ws?.profileId&&s.profiles[ws.profileId];
      if(p&&p.kind==='chatgpt'){const account=credentials?.status().find(a=>a.id===p.credentialId);if(!account?.connected)throw new Error('Continue with ChatGPT before running this connection.');if(!account.planAllowed)throw new Error('ChatGPT plan usage permission has not been granted.');}
      return call('command',{command:c});
    }
    case 'credentials.status':return {accounts:credentials?.status()??[],error:credentialError};
    case 'credentials.sign-in':{
      if(!credentials)throw new Error(credentialError);const account=await credentials.signIn(c.id);
      const state=await call('state') as LibraryState;let profile=Object.values(state.profiles).find(p=>p.credentialId===account.id);
      profile??={id:randomUUID(),name:account.label,kind:'chatgpt',baseUrl:'https://api.openai.com/v1',mode:'responses',credentialId:account.id,models:[],capabilities:{...DEFAULT_CAPABILITIES,text:'documented',roles:'documented',overflow:'reject',source:'OpenAI Sign in with ChatGPT documentation checked 2026-10-13; chosen-model multimodal support requires verification.'}};
      await call('profile',{profile});return {profileId:profile.id,account};
    }
    case 'credentials.disconnect':await call('stop');if(!credentials)throw new Error(credentialError);return credentials.disconnect(c.id);
    case 'profile.save':{
      const baseUrl=validateBaseUrl(c.baseUrl),state=await call('state') as LibraryState,old=c.id?state.profiles[c.id]:undefined;
      if(old?.kind==='chatgpt')throw new Error('ChatGPT registration endpoints are fixed.');
      let credentialId=old&&new URL(old.baseUrl).origin===new URL(baseUrl).origin?old.credentialId:undefined;
      if(c.key!==undefined){if(!credentials)throw new Error(credentialError);if(!c.key&&old?.credentialId){await call('stop');await credentials.disconnect(old.credentialId);}credentialId=c.key?credentials.saveKey(c.key,new URL(baseUrl).origin,credentialId):undefined;}
      const modelCapabilities=old?.baseUrl===baseUrl&&old.mode===c.mode?{...old.modelCapabilities}:{};
      if(c.capabilityModel)modelCapabilities[c.capabilityModel]=c.capabilities;
      const profile:Profile={id:c.id??randomUUID(),kind:'compatible',name:c.name,baseUrl,mode:c.mode,capabilities:c.capabilities,modelCapabilities,manualModel:c.manualModel,credentialId,models:old?.baseUrl===baseUrl?old.models:[],discoveredAt:undefined};
      return call('profile',{profile});
    }
    case 'profile.discover':{
      const state=await call('state') as LibraryState,p=state.profiles[c.id];if(!p)throw new Error('Connection unavailable.');
      const token=await credentials?.token(p.credentialId,new URL(p.baseUrl).origin);
      if(p.kind==='chatgpt'&&!token)throw new Error('Continue with ChatGPT first.');
      const response=await fetch(`${validateBaseUrl(p.baseUrl)}/models`,{redirect:'error',headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(30_000)});
      if(!response.ok){let body:unknown;try{body=await boundedJson(response,64*1024);}catch{}throw new Error(safeProviderError(response.status,body));}
      const data=await boundedJson(response);
      const models=p.kind==='chatgpt'?data.models?.filter((m:any)=>m.visibility==='list').map((m:any)=>({id:m.slug,name:m.display_name})):data.data?.map((m:any)=>({id:m.id,name:m.id}));
      if(!Array.isArray(models)||models.some(m=>typeof m.id!=='string'||typeof m.name!=='string'))throw new Error('Unsupported model catalogue. Compatible endpoints may use an explicitly entered, unverified model ID.');
      await call('models',{profileId:p.id,models});return models;
    }
    case 'asset.import':{
      const choice=await dialog.showOpenDialog(window,{title:'Import material into the library',properties:['openFile'],filters:[{name:'Supported material',extensions:['txt','md','png','jpg','jpeg','pdf']}]});
      if(choice.canceled)return;return call('import',{path:choice.filePaths[0],nodeId:c.id});
    }
    case 'asset.preview':return call('asset',{representationId:c.id,page:c.page??1});
    case 'library.export':{
      const choice=await dialog.showSaveDialog(window,{title:'Export entire library — includes private content, history and Trash; no credentials',defaultPath:'Flamehorn-library.flamehorn',filters:[{name:'Flamehorn library',extensions:['flamehorn']}]});
      if(choice.canceled||!choice.filePath)return;return call('export',{path:choice.filePath});
    }
    case 'library.import':{
      const choice=await dialog.showOpenDialog(window,{title:'Open a separate library archive',properties:['openFile'],filters:[{name:'Flamehorn library',extensions:['flamehorn']}]});
      if(choice.canceled)return;
      const imported=await call('importLibrary',{path:choice.filePaths[0]});
      writeFileSync(bootstrap,JSON.stringify({directory:imported}));
      closing=true;await call('close');app.relaunch();app.quit();return;
    }
    case 'open.usage':await shell.openExternal('https://chatgpt.com/settings/usage');return;
    case 'app.close':{
      if(credentials?.signInPending){const choice=await dialog.showMessageBox(window,{type:'question',buttons:['Keep Flamehorn open','Cancel sign-in and close'],defaultId:0,cancelId:0,message:'ChatGPT sign-in is still in progress.',detail:'The browser must return to this running app to finish. Closing now will stop the local sign-in callback.'});if(choice.response===0)return;}
      const state=await call('state') as LibraryState;
      if(Object.values(state.runs).some(r=>!terminal(r.state))){const choice=await dialog.showMessageBox(window,{type:'question',buttons:['Stay','Stop and close'],defaultId:0,cancelId:0,message:'A Process is running.',detail:'Stopping keeps completed outputs. An incomplete stream will not become a Context version.'});if(choice.response===0)return;}
      await call('stop');try{await call('backup');}catch{}
      await call('close');closing=true;window.close();app.quit();return;
    }
    default:return call('command',{command:c});
  }
}
