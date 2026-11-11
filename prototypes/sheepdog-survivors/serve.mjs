// HTTPS static server for the Godot web build (phones need HTTPS for SharedArrayBuffer): node serve.mjs [port]
import https from 'node:https';import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url)), root = path.join(dir, 'build'), port = +process.argv[2] || 8088;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.pck': 'application/octet-stream' };
const h = (q, s) => { const p = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, p === '/' ? 'index.html' : p.split('..').join(''));
  try { const d = fs.readFileSync(f); s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); s.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); s.end(d); } catch (e) { s.statusCode = 404; s.end('not found'); } };
https.createServer({ key: fs.readFileSync(path.join(dir, 'key.pem')), cert: fs.readFileSync(path.join(dir, 'cert.pem')) }, h).listen(port, () => console.log('https://192.168.1.198:' + port));
http.createServer(h).listen(port + 1, () => console.log('http://localhost:' + (port + 1)));
