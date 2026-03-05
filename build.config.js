import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: 'dist/anubis.esm.js',
});

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'AnubisConsent',
  minify: true,
  outfile: 'dist/anubis.iife.js',
});

await build({
  entryPoints: ['src/debug-helper.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: 'dist/anubis-debug.iife.js',
});

const css = await readFile('src/styles.css', 'utf8');
const js = await readFile('dist/anubis.iife.js', 'utf8');

const escapedCss = JSON.stringify(css);
const injected = `(function(){if(typeof document==='undefined'){return;}if(document.getElementById('anubis-styles')){return;}var s=document.createElement('style');s.id='anubis-styles';s.textContent=${escapedCss};document.head.appendChild(s);}());\n${js}`;

await writeFile('dist/anubis.iife.js', injected, 'utf8');
await writeFile('dist/anubis.css', css, 'utf8');
