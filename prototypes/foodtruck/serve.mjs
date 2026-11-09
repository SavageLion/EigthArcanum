// Zero-dependency static server for Ridgeline:  node prototypes/foodtruck/serve.mjs [port]   then open http://localhost:8081
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url)), port = +process.argv[2] || 8081;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
http.createServer((q, s) => {
  const p = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, p === '/' ? 'index.html' : p.split('..').join(''));
  try { s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.end(fs.readFileSync(f)); } catch (e) { s.statusCode = 404; s.end('not found'); }
}).listen(port, () => console.log(`Hot & Hangry running at http://localhost:${port}`));
