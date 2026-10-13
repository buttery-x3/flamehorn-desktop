import { build } from 'esbuild';
import { build as viteBuild } from 'vite';
await viteBuild();
await build({ entryPoints: ['src/main/main.ts', 'src/main/preload.ts', 'src/main/worker.ts', 'src/main/pdf-worker.ts'],
  outdir: 'dist', outExtension: { '.js': '.cjs' }, bundle: true, platform: 'node', format: 'cjs',
  target: 'node24', packages: 'external', sourcemap: true });
