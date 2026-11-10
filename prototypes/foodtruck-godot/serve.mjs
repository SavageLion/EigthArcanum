// Static server for the Godot web export: node prototypes/foodtruck-godot/serve.mjs [port]  ->  http://localhost:8082/
// Serves .wasm with the right MIME type and gzips the big files like a normal web host would.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'build'), port = +process.argv[2] || 8082;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.pck': 'application/octet-stream' };
http.createServer((q, s) => {
  const p = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, p === '/' ? 'index.html' : p.split('..').join(''));
  try {
    const data = fs.readFileSync(f), ext = path.extname(f);
    s.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    s.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); s.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    if (/gzip/.test(q.headers['accept-encoding'] || '') && ['.wasm', '.js', '.pck', '.html'].includes(ext)) { s.setHeader('Content-Encoding', 'gzip'); s.end(zlib.gzipSync(data, { level: 6 })); }
    else s.end(data);
  } catch (e) { s.statusCode = 404; s.end('not found'); }
}).listen(port, () => console.log(`Godot slice at http://localhost:${port}/  (add ?auto=1 for the autopilot)`));
