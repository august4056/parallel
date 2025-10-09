import { build } from 'esbuild';

const isProduction = process.env.NODE_ENV === 'production';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/worker.js',
  platform: 'neutral',
  target: 'es2022',
  sourcemap: !isProduction,
  minify: isProduction,
  conditions: ['worker', 'browser'],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development')
  }
});
