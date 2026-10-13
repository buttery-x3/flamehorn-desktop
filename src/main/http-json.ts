// Keep metadata/error responses bounded too; an untrusted endpoint is not a file store.
export async function boundedJson(response:Response,limit=1024*1024):Promise<any>{
  if(!response.body)throw new Error('Provider returned no JSON body.');
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>limit)throw new Error('Provider JSON exceeds the local response limit.');chunks.push(chunk.value);}}
  catch(error){await reader.cancel().catch(()=>{});throw error;}
  return JSON.parse(Buffer.concat(chunks,size).toString('utf8'));
}
