import { readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const namePattern=/^(daily|pre-migration)-[a-f0-9-]{36}-[0-9-]+\.flamehorn$/;
export function listBackups(root:string){
  if(!existsSync(root))return [];
  return readdirSync(root).filter(name=>namePattern.test(name)).sort().reverse().map(name=>({name,bytes:statSync(join(root,name)).size}));
}
export function deleteBackup(root:string,name:string){
  if(!namePattern.test(name)||!listBackups(root).some(b=>b.name===name))throw new Error('Choose an existing local backup.');
  unlinkSync(join(root,name));
}
