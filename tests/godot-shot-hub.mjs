import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const [out, qs, keys] = process.argv.slice(2);
const root = path.resolve('prototypes/sheepdog-survivors/build');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png' };
const srv = http.createServer((q, s) => { const p = q.url.split('?')[0], f = path.join(root, p === '/' ? 'index.html' : p); try { const d = fs.readFileSync(f); s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); s.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); s.end(d); } catch (e) { s.statusCode = 404; s.end(''); } }).listen(0);
await new Promise(r => srv.on('listening', r));
const b = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:' + srv.address().port + '/?' + qs);
await page.waitForTimeout(14000);
for (const k of (keys || '').split(',').filter(Boolean)) { await page.keyboard.press(k); await page.waitForTimeout(1500); }
await page.waitForTimeout(3000);
await page.screenshot({ path: out });
await b.close(); srv.close();
console.log('saved', out);
