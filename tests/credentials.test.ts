import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Credentials, validateCallback } from '../src/main/credentials';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

const fake=vi.hoisted(()=>({available:true,open:async(_url:string)=>{}}));
vi.mock('electron',()=>({safeStorage:{isEncryptionAvailable:()=>fake.available,encryptString:(v:string)=>Buffer.from(v).reverse(),decryptString:(b:Buffer)=>Buffer.from(b).reverse().toString()},shell:{openExternal:(url:string)=>fake.open(url)}}));
const originalFetch=globalThis.fetch;
beforeEach(()=>{fake.available=true;});afterEach(()=>{vi.unstubAllGlobals();});
function directory(){mkdirSync('artifacts/test-credentials',{recursive:true});return mkdtempSync(resolve('artifacts/test-credentials/fixture-'));}
function seed(root:string,record:any){writeFileSync(join(root,'protected.bin'),Buffer.from(JSON.stringify({[record.id]:record})).reverse());return new Credentials(root);}
const record=()=>({id:randomUUID(),kind:'chatgpt',label:'Synthetic account',clientId:'synthetic-issued-client',subject:'synthetic-subject',accessToken:'synthetic-expired-token',refreshToken:'synthetic-rotation-one',expiresAt:0,scopes:['chatgpt.tokens.use.direct']});
describe('Credential boundary — synthetic records only, no live account',()=>{
  it('validates callback state, code and exact selected registration',()=>{
    const u=new URL('http://127.0.0.1/auth/callback?state=expected&client_id=issued&code=synthetic');expect(validateCallback(u,{state:'expected'})).toEqual({clientId:'issued',code:'synthetic'});
    expect(()=>validateCallback(u,{state:'wrong'})).toThrow('state');expect(()=>validateCallback(u,{state:'expected',clientId:'another'})).toThrow('registration');u.searchParams.set('error','access_denied');expect(()=>validateCallback(u,{state:'expected'})).toThrow('declined');
  });
  it('serializes rotating refresh, saves replacement before returning and preserves origin isolation',async()=>{
    const root=directory(),r=record(),credentials=seed(root,r);let count=0;
    vi.stubGlobal('fetch',vi.fn(async()=>{count++;await new Promise(resolve=>setTimeout(resolve,10));return Response.json({access_token:'synthetic-new-token',refresh_token:'synthetic-rotation-two',token_type:'Bearer',expires_in:3600});}));
    expect(await Promise.all([credentials.token(r.id,'https://api.openai.com'),credentials.token(r.id,'https://api.openai.com')])).toEqual(['synthetic-new-token','synthetic-new-token']);expect(count).toBe(1);
    expect(await new Credentials(root).token(r.id,'https://api.openai.com')).toBe('synthetic-new-token');await expect(credentials.token(r.id,'https://elsewhere.example')).rejects.toThrow('another origin');
  });
  it('retains credentials on transient refresh failure and marks invalid grant for deliberate reconnect',async()=>{
    const root=directory(),r=record(),credentials=seed(root,r);
    vi.stubGlobal('fetch',async()=>Response.json({error:'temporarily_unavailable'},{status:503}));await expect(credentials.token(r.id,'https://api.openai.com')).rejects.toThrow('not erased');expect(credentials.status()[0].connected).toBe(true);
    vi.stubGlobal('fetch',async()=>Response.json({error:'invalid_grant'},{status:400}));await expect(credentials.token(r.id,'https://api.openai.com')).rejects.toThrow('INVALID_GRANT');expect(credentials.status()[0].connected).toBe(false);expect(new Credentials(root).status()[0].id).toBe(r.id);
  });
  it('does not accept a provider key at a different origin or plaintext fallback',async()=>{
    const credentials=new Credentials(directory()),key=credentials.saveKey('synthetic-fixture-key','http://127.0.0.1:1234');expect(await credentials.token(key,'http://127.0.0.1:1234')).toBe('synthetic-fixture-key');await expect(credentials.token(key,'http://127.0.0.1:1235')).rejects.toThrow('origin');fake.available=false;expect(()=>credentials.saveKey('synthetic-fixture-key','https://example.test')).toThrow('No plaintext');
  });
  it('disconnects locally when discovered remote revocation fails, retaining registration mapping',async()=>{
    const root=directory(),r=record(),credentials=seed(root,r);vi.stubGlobal('fetch',async()=>{throw new Error('Controlled offline fixture');});const result=await credentials.disconnect(r.id);expect(result.revoked).toBe(false);await expect(credentials.token(r.id,'https://api.openai.com')).rejects.toThrow('sign-in');const saved=JSON.parse(Buffer.from(readFileSync(join(root,'protected.bin'))).reverse().toString())[r.id];expect(saved.clientId).toBe(r.clientId);expect(saved.refreshToken).toBeUndefined();
  });
  it('retains a newly issued registration after invalid grant and reuses it on retry',async()=>{
    const root=directory(),credentials=new Credentials(root),authorizations:URL[]=[];
    fake.open=async raw=>{const url=new URL(raw);authorizations.push(url);const callback=new URL(url.searchParams.get('redirect_uri')!);callback.searchParams.set('state',url.searchParams.get('state')!);callback.searchParams.set('client_id','synthetic-issued-client');callback.searchParams.set('code','synthetic-code');await originalFetch(callback);};
    vi.stubGlobal('fetch',async()=>Response.json({error:'invalid_grant'},{status:400}));await expect(credentials.signIn()).rejects.toThrow('INVALID_GRANT');const registration=credentials.status()[0];expect(registration.connected).toBe(false);await expect(credentials.signIn(registration.id)).rejects.toThrow('INVALID_GRANT');expect(authorizations[0].searchParams.get('client_id')).toBe('dynamic_agent_client');expect(authorizations[1].searchParams.get('client_id')).toBe('synthetic-issued-client');expect(authorizations[0].searchParams.get('code_challenge_method')).toBe('S256');expect(authorizations[0].searchParams.get('scope')).toContain('chatgpt.tokens.use.direct');expect(authorizations[0].searchParams.get('ext_agent_host_id')).toBe(authorizations[1].searchParams.get('ext_agent_host_id'));
  });
  it('validates signed issuer/audience/nonce identity before saving a usable session',async()=>{
    const {publicKey,privateKey}=await generateKeyPair('RS256'),jwk=await exportJWK(publicKey);jwk.kid='fixture';let nonce='',wrongNonce=false;
    fake.open=async raw=>{const url=new URL(raw);nonce=url.searchParams.get('nonce')!;const callback=new URL(url.searchParams.get('redirect_uri')!);callback.searchParams.set('state',url.searchParams.get('state')!);callback.searchParams.set('client_id','synthetic-issued-client');callback.searchParams.set('code','synthetic-code');await originalFetch(callback);};
    vi.stubGlobal('fetch',async(url:URL|string)=>{
      if(String(url).endsWith('openid-configuration'))return Response.json({issuer:'https://auth.openai.com',jwks_uri:'https://auth.openai.com/fixture-jwks'});
      if(String(url).endsWith('fixture-jwks'))return Response.json({keys:[jwk]});
      const token=await new SignJWT({nonce:wrongNonce?'different-nonce':nonce,email:'fixture@example.invalid'}).setProtectedHeader({alg:'RS256',kid:'fixture'}).setIssuer('https://auth.openai.com').setAudience('synthetic-issued-client').setSubject('fixture-subject').setIssuedAt().setExpirationTime('1h').sign(privateKey);
      return Response.json({access_token:'synthetic-signed-session',refresh_token:'synthetic-rotation',token_type:'Bearer',expires_in:3600,id_token:token,scope:'openid chatgpt.tokens.use.direct'});
    });
    const credentials=new Credentials(directory()),saved=await credentials.signIn();expect(saved.connected).toBe(true);expect(saved.planAllowed).toBe(true);wrongNonce=true;await expect(credentials.signIn(saved.id)).rejects.toThrow('identity validation');expect(await credentials.token(saved.id,'https://api.openai.com')).toBe('synthetic-signed-session');
  });
});
