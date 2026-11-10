// Trims transparent margins off PNGs in place: node tests/trim-png.mjs file.png ...
import { chromium } from 'playwright-core';import fs from 'node:fs';
const b=await chromium.launch({channel:'chrome'});const page=await b.newPage();
for(const f of process.argv.slice(2)){
  const data='data:image/png;base64,'+fs.readFileSync(f).toString('base64');
  const r=await page.evaluate(async d=>{const im=new Image();im.src=d;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const q=c.getContext('2d');q.drawImage(im,0,0);const p=q.getImageData(0,0,c.width,c.height).data;let x0=1e9,y0=1e9,x1=-1,y1=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]>20){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    if(x1<0)return null;const w=x1-x0+1,h=y1-y0+1,o=document.createElement('canvas');o.width=w;o.height=h;o.getContext('2d').drawImage(im,x0,y0,w,h,0,0,w,h);return {url:o.toDataURL('image/png'),box:[x0,y0,w,h],orig:[im.width,im.height]};},data);
  if(!r){console.log('empty',f);continue;}fs.writeFileSync(f,Buffer.from(r.url.split(',')[1],'base64'));console.log(f,r.orig.join('x'),'->',r.box[2]+'x'+r.box[3]);
}
await b.close();
