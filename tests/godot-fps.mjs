// Rough frame rate of the Godot web build in software GL:  node tests/godot-fps.mjs "summit=1&tier=4" [seconds]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const [qs, secArg] = process.argv.slice(2), secs = +secArg || 8;
const root = path.resolve('prototypes/sheepdog-survivors/build');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png' };
const srv = http.createServer((q, s) => { const p = q.url.split('?')[0], f = path.join(root, p === '/' ? 'index.html' : p); try { const d = fs.readFileSync(f); s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); s.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); s.end(d); } catch (e) { s.statusCode = 404; s.end(''); } }).listen(0);
await new Promise(r => srv.on('listening', r));
const b = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 960, height: 540 } });
await page.goto('http://localhost:' + srv.address().port + '/?' + qs);
const t0 = Date.now();
await page.waitForTimeout(9000);
const loadedAt = Date.now() - t0;
const frames = await page.evaluate(secs => new Promise(res => { let n = 0; const end = performance.now() + secs * 1000; const f = () => { n++; if (performance.now() < end) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }), secs);
console.log(qs, 'fps ~', (frames / secs).toFixed(1));
await b.close(); srv.close();
