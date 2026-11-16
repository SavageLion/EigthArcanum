// Whole-map picture in guide mode (camera fitted, no sprites/HUD, magenta sky):  node tests/godot-shot-fit.mjs <out.png> ["summit=1&guide=1"] [w] [h]
import { chromium } from 'playwright-core';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const [out, qs, wArg, hArg, clipArg] = process.argv.slice(2);
const root = path.resolve('prototypes/sheepdog-survivors/build');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png' };
const srv = http.createServer((q, s) => { const p = q.url.split('?')[0], f = path.join(root, p === '/' ? 'index.html' : p); try { const d = fs.readFileSync(f); s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); s.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); s.end(d); } catch (e) { s.statusCode = 404; s.end(''); } }).listen(0);
await new Promise(r => srv.on('listening', r));
const b = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: +wArg || 1330, height: +hArg || 900 } });
await page.goto('http://localhost:' + srv.address().port + '/?' + (qs || 'summit=1&guide=1'));
await page.waitForTimeout(16000);
const clip = clipArg ? (() => { const [x, y, w, h] = clipArg.split(",").map(Number); return { x, y, width: w, height: h }; })() : undefined;
await page.screenshot({ path: out, clip });
await b.close(); srv.close();
console.log('saved', out);
