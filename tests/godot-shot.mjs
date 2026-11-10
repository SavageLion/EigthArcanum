// Screenshots the Godot web build for several query strings:  node tests/godot-shot.mjs <outdir> [waitMs] "stop=shift&bot=1" "stop=gas" ...
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const [out, waitArg, ...queries] = process.argv.slice(2), wait = +waitArg || 9000;
const root = path.resolve('prototypes/foodtruck-godot/build');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png' };
const srv = http.createServer((q, s) => { const p = q.url.split('?')[0], f = path.join(root, p === '/' ? 'index.html' : p); try { const d = fs.readFileSync(f); s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); s.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); s.end(d); } catch (e) { s.statusCode = 404; s.end(''); } }).listen(0);
await new Promise(r => srv.on('listening', r));
const b = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let i = 0;
for (const qs of queries) {
  const page = await b.newPage({ viewport: { width: 844, height: 390 } }), logs = [];
  page.on('console', m => { if (m.type() === 'error' || /SCRIPT|ERROR/.test(m.text())) logs.push(m.text().slice(0, 200)); }); page.on('pageerror', e => logs.push('PAGEERR ' + e.message.slice(0, 200)));
  await page.goto(`http://localhost:${srv.address().port}/?${qs}`);
  await page.waitForTimeout(wait); await page.screenshot({ path: `${out}/gd_${i}.png` });
  console.log(i, qs, logs.length ? logs.slice(0, 3).join(' | ') : 'ok'); i++; await page.close();
}
await b.close(); srv.close();
