// 1:1 picture of the whole world (3264x2208) in fit mode, optionally clipped: node tests/godot-shot-world.mjs out.png "hub=1&tier=3&kind=sort&guide=1&fit=1" [x,y,w,h]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const [out, qs, clipArg] = process.argv.slice(2);
const root = path.resolve('prototypes/sheepdog-survivors/build');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png' };
const srv = http.createServer((q, s) => { const p = q.url.split('?')[0], f = path.join(root, p === '/' ? 'index.html' : p); try { const d = fs.readFileSync(f); s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); s.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); s.end(d); } catch (e) { s.statusCode = 404; s.end(''); } }).listen(0);
await new Promise(r => srv.on('listening', r));
const b = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 3264, height: +(process.env.VH || 2208) } });
await page.goto('http://localhost:' + srv.address().port + '/?' + qs);
await page.waitForTimeout(25000);
const opt = { path: out };
if (clipArg) { const [x, y, width, height] = clipArg.split(',').map(Number); opt.clip = { x, y, width, height }; }
await page.screenshot(opt);
await b.close(); srv.close();
console.log('saved', out);
