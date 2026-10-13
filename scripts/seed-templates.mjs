import { readFileSync, writeFileSync } from 'node:fs';
const spec = readFileSync('docs/design/context-compilation.md','utf8');
const section = spec.slice(spec.indexOf('### Proposed compact sequential templates'), spec.indexOf('### Assembly and precedence'));
const blocks = [...section.matchAll(/```text\r?\n([\s\S]*?)\r?\n```/g)];
if (blocks.length !== 8) throw new Error('Expected all eight approved templates');
const combinations = ['Process + Persona + Format','Process + Persona','Process + Format','Process only'];
writeFileSync('src/core/templates.json', JSON.stringify(Object.fromEntries(blocks.map((m,i) => [`${i < 4 ? 'Sequential' : 'Natural'} · ${combinations[i % 4]}`,m[1].replace(/\r\n/g,'\n')])),null,2)+'\n');
