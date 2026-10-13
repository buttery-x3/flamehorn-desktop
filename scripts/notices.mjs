import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
const root=resolve('.'),manifest=JSON.parse(readFileSync('package.json','utf8')),packages=new Map();
function locate(name,parent){for(let directory=parent;;directory=dirname(directory)){const candidate=join(directory,'node_modules',name,'package.json');if(existsSync(candidate))return candidate;if(directory===dirname(directory))return;}}
function visit(name,parent,optional=false){
  const file=locate(name,parent);if(!file){if(optional)return;throw new Error(`Installed runtime dependency missing: ${name}`);}if(packages.has(file))return;
  const pkg=JSON.parse(readFileSync(file,'utf8'));packages.set(file,pkg);
  for(const [name] of Object.entries(pkg.dependencies??{}))if(pkg.name!=='svelte'||['esm-env','clsx'].includes(name))visit(name,dirname(file));
  for(const [name] of Object.entries(pkg.optionalDependencies??{}))visit(name,dirname(file),true);
}
for(const name of [...Object.keys(manifest.dependencies),'svelte','@xyflow/svelte'])visit(name,root);
function notices(directory,depth=0){const result=[];for(const item of readdirSync(directory,{withFileTypes:true})){if(item.name==='node_modules')continue;const path=join(directory,item.name);if(item.isDirectory()&&depth<3)result.push(...notices(path,depth+1));else if(item.isFile()&&/^(licen[sc]e|copying|notice|copyright)/i.test(item.name))result.push(path);}return result;}
let output='# Third-party notices\n\nFlamehorn Desktop is MIT-licensed. The following installed runtime dependencies and bundled renderer libraries retain their respective licences. Electron and Chromium notices are also distributed beside the executable as LICENSE and LICENSES.chromium.html. Exact versions are pinned in package-lock.json. Native optional packages below describe this Windows x64 build.\n';
const records=[];
for(const [file,pkg] of [...packages].sort((a,b)=>a[1].name.localeCompare(b[1].name))){
  const files=notices(dirname(file));if(!files.length&&pkg.name.startsWith('@napi-rs/canvas-'))files.push(join(root,'node_modules/@napi-rs/canvas/LICENSE'));if(!files.length&&existsSync(join(root,'third-party',pkg.name+'.LICENSE')))files.push(join(root,'third-party',pkg.name+'.LICENSE'));if(!files.length)throw new Error(`No licence notice found for ${pkg.name}`);
  output+=`\n## ${pkg.name} ${pkg.version}\n\nDeclared licence: ${typeof pkg.license==='string'?pkg.license:JSON.stringify(pkg.license)}\n`;
  for(const notice of files)output+=`\n### ${relative(dirname(file),notice).replaceAll('\\','/')}\n\n\`\`\`text\n${readFileSync(notice,'utf8').replaceAll('\r\n','\n').trim().replace(/[ \t]+$/gm,'')}\n\`\`\`\n`;
  records.push({name:pkg.name,version:pkg.version,license:pkg.license,notices:files.length});
}
writeFileSync('THIRD_PARTY_NOTICES.md',output);writeFileSync('docs/verification/dependencies.json',JSON.stringify({electron:manifest.devDependencies.electron,node:process.version,packages:records},null,2)+'\n');console.log(`Recorded ${records.length} runtime packages and their complete notices.`);
