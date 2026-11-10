// Static server for the Godot web export: node prototypes/foodtruck-godot/serve.mjs [httpPort] [httpsPort]
//   http://localhost:8082/   (localhost counts as a secure context)
//   https://<your LAN ip>:8083/   (needed on a phone: Godot's web build refuses plain http on a network address)
// The HTTPS server uses key.pem / cert.pem next to this file (self-signed; make them with openssl, see README).
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, 'build'), port = +process.argv[2] || 8082, sport = +process.argv[3] || 8083;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.pck': 'application/octet-stream' };
const handler = (q, s) => {
  const p = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, p === '/' ? 'index.html' : p.split('..').join(''));
  try {
    const data = fs.readFileSync(f), ext = path.extname(f);
    s.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    s.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); s.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    if (/gzip/.test(q.headers['accept-encoding'] || '') && ['.wasm', '.js', '.pck', '.html'].includes(ext)) { s.setHeader('Content-Encoding', 'gzip'); s.end(zlib.gzipSync(data, { level: 6 })); }
    else s.end(data);
  } catch (e) { s.statusCode = 404; s.end('not found'); }
};
http.createServer(handler).listen(port, () => console.log(`http://localhost:${port}/  (add ?auto=1 for the autopilot)`));
try { https.createServer({ key: fs.readFileSync(path.join(here, 'key.pem')), cert: fs.readFileSync(path.join(here, 'cert.pem')) }, handler).listen(sport, () => console.log(`https://<lan ip>:${sport}/`)); }
catch (e) { console.log('no key.pem/cert.pem: HTTPS server not started'); }
