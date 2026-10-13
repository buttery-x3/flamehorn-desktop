import { spawnSync } from 'node:child_process';
import electron from 'electron';
import { build } from 'esbuild';
await build({entryPoints:['src/main/pdf-worker.ts'],outdir:'dist',outExtension:{'.js':'.cjs'},bundle:true,platform:'node',format:'cjs',target:'node24',packages:'external'});
const result = spawnSync(electron, ['node_modules/vitest/vitest.mjs', 'run', ...process.argv.slice(2)], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', windowsHide: true,
});
process.exit(result.status ?? 1);
