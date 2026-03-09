import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('dist/js', { recursive: true });
await mkdir('dist/css', { recursive: true });

await build({
  entryPoints: ['src/js/index.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: 'dist/js/consent.esm.js',
});

await build({
  entryPoints: ['src/js/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'Anubis',
  minify: true,
  outfile: 'dist/js/consent.js',
});

await build({
  entryPoints: ['src/js/debugger.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: 'dist/js/debugger.js',
});

const baseCss = await readFile('src/css/consent.css', 'utf8');
const themeLight = await readFile('src/css/theme-light.css', 'utf8');
const themeDark = await readFile('src/css/theme-dark.css', 'utf8');
const js = await readFile('dist/js/consent.js', 'utf8');

const escapedBaseCss = JSON.stringify(baseCss);
const injected = `(function(){if(typeof document==='undefined'||document.getElementById('consent-styles')){return;}var t=document.createElement('template');t.id='consent-styles';t.innerHTML='<style>'+${escapedBaseCss}+'</style>';(document.head||document.documentElement||document.body).appendChild(t);}());\n${js}`;

await writeFile('dist/js/consent.bundled.js', injected, 'utf8');
await writeFile('dist/css/consent.css', baseCss, 'utf8');
await writeFile('dist/css/theme-light.css', themeLight, 'utf8');
await writeFile('dist/css/theme-dark.css', themeDark, 'utf8');
