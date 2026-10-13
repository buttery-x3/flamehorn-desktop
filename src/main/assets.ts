import { Worker } from 'node:worker_threads';
import { readFile, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { content, editMaterial, id } from '../core/library';
import type { Store } from './store';
import type { Representation } from '../core/types';
export function previewPdf(bytes:Buffer,pdfWorkerPath:string,page:number):Promise<{data:string;page:number;pageCount:number}>{
  return new Promise((resolve,reject)=>{
    const worker=new Worker(pdfWorkerPath,{workerData:{bytes,preview:true,page},resourceLimits:{maxOldGenerationSizeMb:256}});
    const timer=setTimeout(()=>{void worker.terminate();reject(new Error('PDF preview exceeded 60 seconds.'));},60_000);
    worker.once('message',value=>{clearTimeout(timer);void worker.terminate();if(value.error)reject(new Error(value.error));else resolve(value);});
    worker.once('error',error=>{clearTimeout(timer);reject(error);});
    worker.once('exit',code=>{clearTimeout(timer);if(code!==0)reject(new Error('PDF preview worker stopped.'));});
  });
}

export async function importAsset(store:Store,path:string,nodeId:string,pdfWorkerPath:string) {
  const info=await stat(path);if(!info.isFile()||info.size>25*1024*1024)throw new Error('Import a file of at most 25 MiB.');
  const bytes=await readFile(path),extension=extname(path).toLowerCase();
  let mime='',mode:Representation['mode']='text',text:string|undefined,prepared:{text:string;pages:{page:number;characters:number}[];parser:string;blank:boolean}|undefined;
  if(['.txt','.md'].includes(extension)){mime='text/plain';try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('Text import requires valid UTF-8; the original bytes were not partially decoded.');}}
  else if(extension==='.png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){mime='image/png';mode='image';}
  else if(['.jpg','.jpeg'].includes(extension)&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255){mime='image/jpeg';mode='image';}
  else if(extension==='.pdf'&&bytes.subarray(0,5).toString()==='%PDF-'){
    mime='application/pdf';mode='pdf';
    prepared=await new Promise((resolve,reject)=>{
      const worker=new Worker(pdfWorkerPath,{workerData:{bytes},resourceLimits:{maxOldGenerationSizeMb:256}});
      const timer=setTimeout(()=>{void worker.terminate();reject(new Error('PDF preparation exceeded 60 seconds.'));},60_000);
      worker.once('message',value=>{clearTimeout(timer);void worker.terminate();if(value.error)reject(new Error(value.error));else resolve(value);});
      worker.once('error',error=>{clearTimeout(timer);reject(error);});
      worker.once('exit',code=>{clearTimeout(timer);if(code!==0)reject(new Error('PDF preparation worker stopped.'));});
    });
  }else throw new Error('Supported imports are UTF-8 .txt/.md, PNG, JPEG and PDF with matching file signatures.');
  const hash=store.putBlob(bytes),representationId=id();
  store.transaction(s=>{
    const node=s.nodes[nodeId];if(!node||node.removed||node.type==='process')throw new Error('Select an available Context or Reference.');
    s.assets[hash]??={id:hash,name:basename(path),mime,bytes:bytes.length};
    s.representations[representationId]={id:representationId,assetId:hash,mode,text,warnings:[],acknowledged:true,parser:mode==='text'?'UTF-8 strict decoder':'original bytes'};
    if(prepared){
      const textId=id();s.representations[textId]={id:textId,assetId:hash,mode:'pdf-text',text:prepared.blank?'':prepared.text,pages:prepared.pages,parser:prepared.parser,
        warnings:['Text only: diagrams, layout and handwriting may be absent or misread.',...prepared.pages.filter(p=>!p.characters).map(p=>`Page ${p.page} has no extracted text.`)],acknowledged:false};
    }
    const old=node.selected?s.entries[node.selected]:undefined,value=old?s.contents[old.contentId]:undefined;
    editMaterial(s,node,node.type==='reference'?'':value?.text??'',node.type==='reference'?[representationId]:[...(value?.attachments??[]),representationId]);
    if(node.type==='reference')node.label=basename(path);
  });return representationId;
}
