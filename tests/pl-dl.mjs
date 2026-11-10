// Downloads Pixel Lab results: node tests/pl-dl.mjs <outdir> <kind:image|object> name=id name=id ...
import fs from 'node:fs';
const [dir, kind, ...pairs] = process.argv.slice(2);fs.mkdirSync(dir, { recursive: true });
for (const p of pairs) { const [n, id] = p.split('='); const r = await fetch(`https://api.pixellab.ai/mcp/${kind === 'object' ? 'objects' : 'images'}/${id}/download`); if (!r.ok) { console.log('FAIL', n, r.status); continue; } fs.writeFileSync(`${dir}/${n}.png`, Buffer.from(await r.arrayBuffer())); }
console.log('done', pairs.length);
