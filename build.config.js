import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('dist/js', { recursive: true });
await mkdir('dist/css', { recursive: true });

await build({
  entryPoints: ['src/js/index.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: 'dist/js/anubis.esm.js',
});

await build({
  entryPoints: ['src/js/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'AnubisConsent',
  minify: true,
  outfile: 'dist/js/anubis.js',
});

await build({
  entryPoints: ['src/js/debugger.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: 'dist/js/debugger.js',
});

const baseCss = await readFile('src/css/base.css', 'utf8');
const themeLight = await readFile('src/css/theme-light.css', 'utf8');
const themeDark = await readFile('src/css/theme-dark.css', 'utf8');
const js = await readFile('dist/js/anubis.js', 'utf8');

const escapedBaseCss = JSON.stringify(baseCss);
const injected = `(function(){if(typeof document==='undefined'){return;}if(document.getElementById('anubis-styles')){return;}var s=document.createElement('style');s.id='anubis-styles';s.textContent=${escapedBaseCss};document.head.appendChild(s);}());\n${js}`;

await writeFile('dist/js/anubis.bundled.js', injected, 'utf8');
await writeFile('dist/css/anubis.css', baseCss, 'utf8');
await writeFile('dist/css/theme-light.css', themeLight, 'utf8');
await writeFile('dist/css/theme-dark.css', themeDark, 'utf8');
