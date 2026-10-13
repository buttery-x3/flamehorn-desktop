import { safeStorage, shell } from 'electron';
import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CredentialStatus } from '../core/types';
import { boundedJson } from './http-json';

interface Secret {
  id:string; kind:'chatgpt'|'key'; label:string; key?:string; origin?:string;
  clientId?:string; subject?:string; email?:string; accessToken?:string; refreshToken?:string;
  idToken?:string; expiresAt?:number; scopes?:string[]; needsSignIn?:boolean;
}
export function validateCallback(url:URL,expected:{state:string;clientId?:string}) {
  const state=url.searchParams.get('state')??'';
  if(state.length!==expected.state.length||!timingSafeEqual(Buffer.from(state),Buffer.from(expected.state)))throw new Error('Sign-in callback state did not match.');
  if(url.searchParams.has('error'))throw new Error(url.searchParams.get('error')==='access_denied'?'Sign-in or requested permission was declined.':'OpenAI sign-in did not complete.');
  const clientId=url.searchParams.get('client_id')??expected.clientId;
  if(!clientId||clientId==='dynamic_agent_client')throw new Error('OpenAI did not return an issued registration ID.');
  if(expected.clientId&&clientId!==expected.clientId)throw new Error('The callback changed the selected account registration.');
  const code=url.searchParams.get('code');if(!code)throw new Error('Sign-in callback has no authorization code.');
  return {clientId,code};
}
export class Credentials {
  private records:Record<string,Secret>={};
  private refreshes=new Map<string,Promise<string|undefined>>();
  private pending=false;
  private unsaved=false;
  get signInPending(){return this.pending;}
  private readonly file:string;
  private readonly hostId:string;
  constructor(readonly directory:string){
    mkdirSync(directory,{recursive:true});this.file=join(directory,'protected.bin');
    const host=join(directory,'host-id');this.hostId=existsSync(host)?readFileSync(host,'utf8'):`urn:uuid:${randomUUID()}`;
    if(!existsSync(host))writeFileSync(host,this.hostId,{mode:0o600});
    if(existsSync(this.file)){
      if(!safeStorage.isEncryptionAvailable())throw new Error('Windows protected storage is unavailable. Saved credentials cannot be opened. Offline library use remains available.');
      this.records=JSON.parse(safeStorage.decryptString(readFileSync(this.file)));
    }
  }
  private save(){
    this.unsaved=true;
    if(!safeStorage.isEncryptionAvailable())throw new Error('Protected credential storage is unavailable. No plaintext credentials were saved.');
    writeFileSync(this.file+'.pending',safeStorage.encryptString(JSON.stringify(this.records)),{mode:0o600});renameSync(this.file+'.pending',this.file);
    this.unsaved=false;
  }
  status():CredentialStatus[]{return Object.values(this.records).map(r=>({id:r.id,label:r.label,kind:r.kind,connected:r.kind==='key'?!!r.key:!!r.accessToken&&!r.needsSignIn,planAllowed:r.kind==='chatgpt'?r.scopes?.includes('chatgpt.tokens.use.direct'):undefined}));}
  saveKey(key:string,origin:string,existingId?:string){
    const record:Secret={id:existingId??randomUUID(),kind:'key',key,origin,label:`API key · ${new URL(origin).host}`};
    this.records[record.id]=record;this.save();return record.id;
  }
  async token(recordId:string|undefined,origin:string):Promise<string|undefined>{
    // A rotated token may exist in memory after a protected-store failure. Never
    // publish it on a later request until its replacement refresh token is durable.
    if(this.unsaved)this.save();
    if(!recordId)return;const record=this.records[recordId];if(!record)throw new Error('This connection needs credentials configured again.');
    if(record.kind==='key'){if(record.origin!==new URL(origin).origin)throw new Error('Provider origin changed. Deliberately re-enter its key.');return record.key;}
    if(new URL(origin).origin!=='https://api.openai.com')throw new Error('ChatGPT credentials cannot be sent to another origin.');
    if(record.needsSignIn||!record.accessToken)throw new Error('This ChatGPT registration needs sign-in.');
    if(!record.scopes?.includes('chatgpt.tokens.use.direct'))throw new Error('Signed in, but ChatGPT plan usage permission was not granted.');
    if((record.expiresAt??0)>Date.now()+60_000)return record.accessToken;
    const pending=this.refreshes.get(record.id);if(pending)return pending;
    const refresh=this.refresh(record).finally(()=>this.refreshes.delete(record.id));this.refreshes.set(record.id,refresh);return refresh;
  }
  private async exchange(fields:Record<string,string>){
    const response=await fetch('https://auth.openai.com/api/accounts/oauth/token',{method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields),signal:AbortSignal.timeout(30_000)});
    const value=await boundedJson(response,64*1024) as Record<string,unknown>;
    if(!response.ok){if(value.error==='invalid_grant')throw new Error('INVALID_GRANT: Sign in again; this authorization is no longer valid.');throw new Error(`OpenAI token exchange failed (HTTP ${response.status}); saved credentials were not erased.`);}
    if(typeof value.access_token!=='string'||typeof value.expires_in!=='number'||value.token_type!=='Bearer')throw new Error('OpenAI returned an incomplete token response.');
    return value;
  }
  private async refresh(record:Secret){
    if(!record.refreshToken||!record.clientId)throw new Error('Sign in again to renew this registration.');
    try{
      const value=await this.exchange({grant_type:'refresh_token',client_id:record.clientId,refresh_token:record.refreshToken,resource:'https://api.openai.com/v1'});
      if(typeof value.refresh_token!=='string')throw new Error('Refresh did not return the required rotating refresh token.');
      const replacement={...record,accessToken:value.access_token as string,refreshToken:value.refresh_token,idToken:typeof value.id_token==='string'?value.id_token:record.idToken,expiresAt:Date.now()+(value.expires_in as number)*1000,scopes:typeof value.scope==='string'?value.scope.split(' '):record.scopes};
      this.records[record.id]=replacement;this.save();
      if(!replacement.scopes?.includes('chatgpt.tokens.use.direct'))throw new Error('ChatGPT plan usage permission is unavailable.');return replacement.accessToken;
    }catch(error){if(error instanceof Error&&error.message.startsWith('INVALID_GRANT')){record.needsSignIn=true;this.save();}throw error;}
  }
  async signIn(existingId?:string):Promise<CredentialStatus>{
    if(this.pending)throw new Error('A ChatGPT sign-in is already in progress.');
    if(!safeStorage.isEncryptionAvailable())throw new Error('Windows protected storage is required before sign-in.');
    this.pending=true;const existing=existingId?this.records[existingId]:undefined;
    if(existingId&&(!existing||existing.kind!=='chatgpt')){this.pending=false;throw new Error('Choose a saved ChatGPT registration.');}
    const state=randomBytes(32).toString('base64url'),nonce=randomBytes(32).toString('base64url'),verifier=randomBytes(64).toString('base64url');
    const challenge=createHash('sha256').update(verifier).digest('base64url');
    let consumed=false;
    const server=createServer();
    try{
      await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve());});
      const address=server.address();if(!address||typeof address==='string')throw new Error('Loopback listener unavailable.');
      const redirect=`http://127.0.0.1:${address.port}/auth/callback`;
      const callback=new Promise<{clientId:string;code:string}>((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('ChatGPT sign-in expired after ten minutes.')),600_000);
        server.on('request',(request,response)=>{
          const url=new URL(request.url??'/',redirect);
          response.setHeader('Content-Type','text/plain; charset=utf-8');response.setHeader('Cache-Control','no-store');
          if(url.pathname!=='/auth/callback'||request.method!=='GET'){response.writeHead(404);response.end('Not found');return;}
          if(consumed){response.writeHead(410);response.end('This sign-in attempt has ended.');return;}
          try{const value=validateCallback(url,{state,clientId:existing?.clientId});consumed=true;clearTimeout(timer);response.end('Return to Flamehorn Desktop to finish sign-in.');resolve(value);}
          catch(error){consumed=true;clearTimeout(timer);response.writeHead(400);response.end('Sign-in could not be completed. Return to Flamehorn Desktop.');reject(error);}
        });
        server.once('close',()=>clearTimeout(timer));
      });
      void callback.catch(()=>{}); // Attach immediately, including while the system browser is opening.
      const params=new URLSearchParams({client_id:existing?.clientId??'dynamic_agent_client',ext_agent_host_id:this.hostId,response_type:'code',redirect_uri:redirect,scope:'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',resource:'https://api.openai.com/v1',state,nonce,code_challenge_method:'S256',code_challenge:challenge});
      if(!existing?.clientId)params.set('agent_name_hint','Flamehorn Desktop');
      if(existing?.idToken)params.set('id_token_hint',existing.idToken);
      if(existing?.email)params.set('login_hint',existing.email);
      await shell.openExternal(`https://auth.openai.com/api/accounts/authorize?${params}`);
      const {clientId,code}=await callback;
      // Issued registration identity survives an invalid/expired grant. A retry must
      // reuse it, never silently create a replacement dynamic registration.
      const registrationId=existing?.id??randomUUID();
      if(!existing){this.records[registrationId]={id:registrationId,kind:'chatgpt',label:`Unverified registration · ${clientId.slice(-8)}`,clientId,needsSignIn:true};this.save();}
      const value=await this.exchange({grant_type:'authorization_code',client_id:clientId,code,code_verifier:verifier,redirect_uri:redirect,resource:'https://api.openai.com/v1'});
      if(typeof value.id_token!=='string')throw new Error('OpenAI returned no identity token.');
      const discovery=await fetch('https://auth.openai.com/.well-known/openid-configuration',{redirect:'error',signal:AbortSignal.timeout(30_000)});
      if(!discovery.ok)throw new Error('OpenAI identity metadata is unavailable.');
      const metadata=await boundedJson(discovery) as {issuer:string;jwks_uri:string};
      if(metadata.issuer!=='https://auth.openai.com'||new URL(metadata.jwks_uri).origin!=='https://auth.openai.com')throw new Error('Unexpected OpenAI identity metadata.');
      const {createRemoteJWKSet,jwtVerify}=await import('jose');
      const {payload}=await jwtVerify(value.id_token,createRemoteJWKSet(new URL(metadata.jwks_uri)),{issuer:metadata.issuer,audience:clientId,requiredClaims:['sub','exp','iat','nonce']});
      if(payload.nonce!==nonce||typeof payload.sub!=='string')throw new Error('OpenAI identity validation failed.');
      if(existing?.subject&&payload.sub!==existing.subject)throw new Error('Sign-in returned a different identity. The saved account was not replaced.');
      const email=typeof payload.email==='string'?payload.email:undefined;
      const record:Secret={id:registrationId,kind:'chatgpt',label:`${email??'ChatGPT account'} · ${clientId.slice(-8)}`,clientId,subject:payload.sub,email,accessToken:value.access_token as string,refreshToken:typeof value.refresh_token==='string'?value.refresh_token:undefined,idToken:value.id_token,expiresAt:Date.now()+(value.expires_in as number)*1000,scopes:typeof value.scope==='string'?value.scope.split(' '):[]};
      const duplicate=Object.values(this.records).find(r=>r.subject===record.subject&&r.clientId===record.clientId);if(duplicate)record.id=duplicate.id;
      this.records[record.id]=record;this.save();return this.status().find(r=>r.id===record.id)!;
    }finally{this.pending=false;server.close();server.closeAllConnections();}
  }
  async disconnect(recordId:string){
    if(this.pending)throw new Error('Finish the pending sign-in before disconnecting.');
    await this.refreshes.get(recordId)?.catch(()=>{});
    const record=this.records[recordId];if(!record)return {revoked:true};let revoked=record.kind==='key';
    const {key,accessToken,refreshToken,idToken,...mapping}=record;this.records[recordId]={...mapping,needsSignIn:true};this.save();
    if(record.kind==='chatgpt'&&record.refreshToken&&record.clientId){
      try{
        const response=await fetch('https://auth.openai.com/.well-known/openid-configuration',{redirect:'error',signal:AbortSignal.timeout(15_000)});
        const metadata=await boundedJson(response) as {revocation_endpoint:string};const url=new URL(metadata.revocation_endpoint);
        if(url.origin!=='https://auth.openai.com')throw new Error('Invalid revocation endpoint.');
        const result=await fetch(url,{method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:record.refreshToken,token_type_hint:'refresh_token',client_id:record.clientId}),signal:AbortSignal.timeout(15_000)});revoked=result.status===200;
      }catch{revoked=false;}
    }
    return {revoked,message:revoked?'Disconnected.':'Disconnected locally. Remote revocation was not confirmed. You can disconnect the app in ChatGPT Settings.'};
  }
}
