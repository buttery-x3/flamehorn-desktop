import { parentPort, workerData } from 'node:worker_threads';
import { join } from 'node:path';
import { Store } from './store';
import { Controller } from './controller';
import { httpAdapter } from './provider';
import { importAsset, previewPdf } from './assets';
import { dailyBackup, exportLibrary, importLibrary } from './archive';
import type { Profile } from '../core/types';
import { id, terminal } from '../core/library';
import { listBackups, deleteBackup } from './backups';

const port=parentPort!;
const pending=new Map<string,{resolve:(value:string|undefined)=>void;reject:(error:Error)=>void}>();
const store=new Store(workerData.directory);
let preparingAssets=0;
const getCredential=(profile:Profile)=>new Promise<string|undefined>((resolve,reject)=>{const request=id();pending.set(request,{resolve,reject});port.postMessage({credential:request,profile});});
const controller=new Controller(store,httpAdapter(()=>store.state,a=>store.bytes(a),getCredential),event=>port.postMessage({event}));
controller.runtime.recoverInterrupted();
port.on('message',async message=>{
  if(message.credentialResult){const request=pending.get(message.credentialResult);pending.delete(message.credentialResult);if(message.error)request?.reject(new Error(message.error));else request?.resolve(message.token);return;}
  try{
    if(controller.exporting&&!['state','asset'].includes(message.method))throw new Error('Library snapshot is in progress. Wait for it to finish.');
    let result:unknown;
    switch(message.method){
      case 'state':result=store.state;break;
      case 'command':
        if(message.command.type==='backups.list')result=listBackups(workerData.backups);
        else if(message.command.type==='backups.delete')deleteBackup(workerData.backups,message.command.name);
        else result=await controller.command(message.command);break;
      case 'import':preparingAssets++;try{result=await importAsset(store,message.path,message.nodeId,join(__dirname,'pdf-worker.cjs'));}finally{preparingAssets--;}break;
      case 'asset':{const rep=store.state.representations[message.representationId];if(!rep)throw new Error('Attachment unavailable.');const asset=store.state.assets[rep.assetId];result={rep,asset,...(rep.mode==='pdf'?await previewPdf(store.bytes(asset.id),join(__dirname,'pdf-worker.cjs'),message.page??1):{data:rep.mode==='image'?`data:${asset.mime};base64,${store.bytes(asset.id).toString('base64')}`:undefined})};break;}
      case 'profile':store.transaction(s=>{s.profiles[message.profile.id]=message.profile;});result=message.profile.id;break;
      case 'models':store.transaction(s=>{const p=s.profiles[message.profileId];p.models=message.models;p.discoveredAt=new Date().toISOString();});break;
      case 'export':
      case 'backup':{
        if(preparingAssets)throw new Error('Wait for file preparation before taking a library snapshot.');
        if(Object.values(store.state.runs).some(r=>!terminal(r.state)))throw new Error('Finish or stop the active run before a library snapshot.');
        controller.exporting=true;try{result=message.method==='export'?await exportLibrary(store,message.path):await dailyBackup(store,workerData.backups);}finally{controller.exporting=false;}break;
      }
      case 'importLibrary':if(Object.values(store.state.runs).some(r=>!terminal(r.state)))throw new Error('Finish or stop the active run before opening a library.');result=importLibrary(message.path,workerData.libraries);break;
      case 'stop':controller.runtime.stop();await controller.runtime.wait();break;
      case 'close':controller.runtime.stop();await controller.runtime.wait();store.close();port.postMessage({id:message.id,result:true});port.close();return;
      default:throw new Error('Unknown worker request.');
    }
    port.postMessage({id:message.id,result});if(message.method!=='state'&&message.method!=='asset')port.postMessage({event:{type:'state'}});
  }catch(error){port.postMessage({id:message.id,error:error instanceof Error?error.message:'Local operation failed.'});}
});
port.postMessage({ready:true});
