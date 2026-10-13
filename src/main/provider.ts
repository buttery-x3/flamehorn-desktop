import type { LibraryState, Profile, Recipe } from '../core/types';
import type { Adapter, Completion } from './runtime';
import { LIMITS } from './runtime';
import { prepareRequest } from './encoding';
import { boundedJson } from './http-json';
export { encode } from './encoding';

export function validateBaseUrl(value:string):string {
  let url:URL;try{url=new URL(value);}catch{throw new Error('Enter an absolute provider URL.');}
  if(url.username||url.password||url.search||url.hash)throw new Error('Provider URLs cannot contain credentials, queries or fragments.');
  const loopback=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if(url.protocol!=='https:'&&!(url.protocol==='http:'&&loopback))throw new Error('Use HTTPS for remote providers or HTTP on loopback for a local server.');
  if(/\/(responses|chat\/completions|models)\/?$/.test(url.pathname))throw new Error('Enter the API base URL, including /v1 when required, without the endpoint path.');
  return url.href.replace(/\/$/,'');
}
export function safeProviderError(status:number,body:unknown):string {
  const v=body as {error?:{code?:unknown;message?:unknown;param?:unknown};detail?:unknown};
  const code=typeof v?.error?.code==='string'&&/^[a-zA-Z0-9_.-]{1,120}$/.test(v.error.code)?v.error.code:'';
  // Arbitrary response bodies may contain echoed private request text or tokens; retain stable code only.
  const category=status===401?'Sign-in or API key required':status===403?'Permission or account eligibility denied':status===429?'Provider usage or rate limit':status>=500?'Provider service error':'Provider rejected this request';
  return `${category} (HTTP ${status}${code?`, ${code}`:''}). No fallback or automatic retry was attempted.`;
}
export function httpAdapter(state:()=>LibraryState,bytes:(id:string)=>Buffer,credential:(profile:Profile)=>Promise<string|undefined>,fetcher:typeof fetch=fetch):Adapter {
  return async(profile,recipe,signal,delta)=>{
    const base=validateBaseUrl(profile.baseUrl);
    if(profile.kind==='chatgpt'&&(base!=='https://api.openai.com/v1'||profile.mode!=='responses'))throw new Error('ChatGPT plan usage requires the public Responses endpoint.');
    const wire=prepareRequest(profile,recipe,state(),bytes);
    const token=await credential(profile);if(signal.aborted)throw signal.reason;
    if(profile.kind==='chatgpt'&&!token)throw new Error('Continue with ChatGPT before running this connection.');
    const abort=new AbortController(),relay=()=>abort.abort(signal.reason);signal.addEventListener('abort',relay,{once:true});
    const overall=setTimeout(()=>abort.abort(new Error('Call exceeded 15 minutes. The provider may have consumed allowance.')),LIMITS.callMs);
    const connect=setTimeout(()=>abort.abort(new Error('Connection timed out after 30 seconds.')),LIMITS.connectMs);
    let idle:ReturnType<typeof setTimeout>|undefined;
    const activity=()=>{if(idle)clearTimeout(idle);idle=setTimeout(()=>abort.abort(new Error('No provider event for 5 minutes.')),LIMITS.idleMs);};
    try{
      const response=await fetcher(`${base}/${profile.mode==='responses'?'responses':'chat/completions'}`,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Accept:'text/event-stream',...(token?{Authorization:`Bearer ${token}`}:{})},body:wire,signal:abort.signal});
      clearTimeout(connect);activity();
      if(!response.ok){let error:unknown;try{error=await boundedJson(response,64*1024);}catch{}throw new Error(safeProviderError(response.status,error));}
      if(!response.body)throw new Error('Provider returned no stream.');activity();
      const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',text='',decodedBytes=0,completed=false,done=false,chatFinish=false,usage:unknown;const summaries:string[]=[];
      function event(data:string){
        if(data==='[DONE]'){done=true;return;}
        let e:any;try{e=JSON.parse(data);}catch{throw new Error('Provider returned malformed stream JSON.');}
        if(e.error)throw new Error(safeProviderError(400,e));
        if(profile.mode==='responses'){
          if(e.type==='response.failed')throw new Error(safeProviderError(400,{error:e.response?.error}));
          if(e.type==='response.incomplete'||e.type==='error')throw new Error('Provider response was incomplete or failed.');
          if(e.type?.includes('refusal'))throw new Error('The provider refused this request.');
          if(e.item?.type && /call|computer|search/.test(e.item.type))throw new Error('Unsupported model tool request. No tool was executed.');
          if(e.type==='response.output_text.delta'){if(typeof e.delta!=='string')throw new Error('Invalid text delta.');text+=e.delta;delta(e.delta);}
          if(e.type==='response.reasoning_summary_text.delta'&&typeof e.delta==='string')summaries.push(e.delta);
          if(e.type==='response.completed'){
            if(e.response?.status && e.response.status!=='completed')throw new Error('Unexpected terminal response status.');
            if(e.response?.output?.some((o:any)=>/call|computer|search/.test(o.type)||o.content?.some((c:any)=>c.type==='refusal')))throw new Error('Unsupported tool or refusal in completed response.');
            completed=true;usage=e.response?.usage;
          }
        }else{
          const choice=e.choices?.find((c:any)=>c.index===0)??e.choices?.[0];
          if(choice?.delta?.tool_calls || choice?.delta?.function_call)throw new Error('Unsupported model tool request. No tool was executed.');
          if(choice?.delta?.refusal)throw new Error('The provider refused this request.');
          if(typeof choice?.delta?.content==='string'){text+=choice.delta.content;delta(choice.delta.content);}
          if(choice?.finish_reason){if(choice.finish_reason!=='stop')throw new Error(`Provider did not finish normally (${String(choice.finish_reason).slice(0,80)}).`);chatFinish=true;}
          if(e.usage)usage=e.usage;
        }
      }
      try{
        while(true){const chunk=await reader.read();if(chunk.done)break;activity();const decoded=decoder.decode(chunk.value,{stream:true});decodedBytes+=Buffer.byteLength(decoded);if(decodedBytes>LIMITS.outputBytes)throw new Error('Response exceeded the 4 MiB decoded stream ceiling.');pending+=decoded;
          let boundary:number;pending=pending.replace(/\r\n/g,'\n');while((boundary=pending.indexOf('\n\n'))>=0){const block=pending.slice(0,boundary);pending=pending.slice(boundary+2);const data=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data)event(data);if(profile.mode==='responses'?completed:chatFinish&&done)break;}
          if(profile.mode==='responses'?completed:chatFinish&&done){await reader.cancel();break;}
        }
      }catch(error){await reader.cancel().catch(()=>{});throw error;}
      if(abort.signal.aborted)throw abort.signal.reason;
      if(profile.mode==='responses'?!completed:!chatFinish||!done)throw new Error('Stream ended without valid terminal completion. Displayed text was not saved as a version.');
      if(!text.trim())throw new Error('Provider completed without nonblank text.');
      return {text,usage,summaries:summaries.length?[summaries.join('')]:[],requestId:response.headers.get('x-request-id')??undefined} satisfies Completion;
    }finally{clearTimeout(overall);clearTimeout(connect);if(idle)clearTimeout(idle);signal.removeEventListener('abort',relay);}
  };
}
