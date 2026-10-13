import { api } from '@electron-forge/core';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const candidate=process.argv[2];
if(!/^\d{4}-\d{2}-\d{2}-\d{2}$/.test(candidate??''))throw new Error('Supply a candidate ID, for example 2026-10-13-01.');
const outDir=resolve('artifacts/candidates',candidate);
if(existsSync(outDir))throw new Error('Candidate output already exists. Preserve it; use a fresh candidate ID.');
await api.make({dir:resolve('.'),outDir,platform:'win32',arch:'x64'});
