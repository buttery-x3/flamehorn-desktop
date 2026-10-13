import { mkdtempSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Store } from '../src/main/store';
import { addNode, connect, editMaterial, id } from '../src/core/library';
import { DEFAULT_CAPABILITIES } from '../src/core/catalog';
import type { Kind, Profile } from '../src/core/types';
export function fixture(kind:Kind='Respond') {
  const root=resolve('artifacts/test-libraries');mkdirSync(root,{recursive:true});
  const directory=mkdtempSync(join(root,'test-')),store=new Store(directory);
  let sourceId='',processId='',profileId='';
  store.transaction(s=>{
    const ws=s.workspaces[s.activeWorkspace],source=addNode(s,ws.id,'context',0,0),process=addNode(s,ws.id,'process',400,0,kind);
    editMaterial(s,source,'We are planning a shared workshop.');connect(s,source.id,'out',process.id,kind==='Merge'||kind==='Compare'?'A':'in');sourceId=source.id;processId=process.id;
    const profile:Profile={id:id(),name:'Controlled test adapter',kind:'compatible',baseUrl:'http://127.0.0.1:1234/v1',mode:'responses',models:[{id:'fixture',name:'fixture'}],capabilities:{...DEFAULT_CAPABILITIES,overflow:'reject',source:'Deterministic test; not live provider evidence.'}};
    s.profiles[profile.id]=profile;ws.profileId=profile.id;ws.model='fixture';profileId=profile.id;
    if(kind==='Merge'||kind==='Compare')connect(s,source.id,'out',process.id,'B');
  });
  return {store,sourceId,processId,profileId,directory};
}
