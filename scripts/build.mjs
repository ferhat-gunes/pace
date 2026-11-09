import { mkdir, copyFile, cp } from 'node:fs/promises';
import { buildTheme } from './build-theme.mjs';

await mkdir('dist', { recursive: true });
await buildTheme();

for (const file of ['index.html', 'manifest.webmanifest', 'sw.js', '_headers', '_routes.json']) {
  await copyFile(file, 'dist/' + file);
}
await cp('assets', 'dist/assets', { recursive: true, force: true });
console.log('PACE static assets prepared in dist/');
