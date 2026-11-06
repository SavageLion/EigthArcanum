/* Pixel renderer helpers: palette snapping, outline pass, tiny sprite maps. */
export const PALETTE=['#0b0814','#20142a','#2a1412','#4a2420','#7d5a22','#a9875a','#dcb868','#f0d9a5','#f1e8d4','#ffffff','#e8592c','#f0813f','#f2a03d','#ffd27a','#1d3a58','#3d4a73','#55628f','#79c6dd','#bfeaf2','#2e4f2e','#9dbb6a','#8d3350','#b84a5d','#e46a80','#7d2bd0','#7d5ad0','#b78cff','#8ea3bf','#cfd7e8','#f0a8d8','#e4c946','#b02050','#a8f0b0','#6f6650','#d9d2bb','#35121f','#6cc2db','#2b2238','#2f8f9f','#3d4a9c','#e6dcef','#b9c4f5','#e0405a','#57401f','#ebe4cd'].map(hexRGB);
export function hexRGB(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
export function nearest(r,g,b){let best=PALETTE[0],d=1e9;for(const p of PALETTE){const e=(p[0]-r)**2+(p[1]-g)**2+(p[2]-b)**2;if(e<d){d=e;best=p;}}return best;}
export function mk(w,h){const o=document.createElement('canvas');o.width=w;o.height=h;return o;}
export const OUT=[11,8,20];
/** Render scale: the canvas is LW*R physical pixels wide. Art made with pixelise() is R x finer than the logical grid. */
export const R=2;
export function pixelise(draw,N,sc){
  N=Math.round(N*R); sc*=R;
  const o=mk(N,N),c=o.getContext('2d',{willReadFrequently:true}); c.translate(N/2,N/2); c.scale(sc,sc); draw(c);
  c.setTransform(1,0,0,1,0,0);
  const im=c.getImageData(0,0,N,N),d=im.data,on=new Uint8Array(N*N);
  for(let i=0;i<N*N;i++){const j=i*4; if(d[j+3]>105){on[i]=1;const p=nearest(d[j]*255/Math.max(d[j+3],1),d[j+1]*255/Math.max(d[j+3],1),d[j+2]*255/Math.max(d[j+3],1));d[j]=p[0];d[j+1]=p[1];d[j+2]=p[2];d[j+3]=255;}else d[j+3]=0;}
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;if(on[i])continue;
    if((x>0&&on[i-1])||(x<N-1&&on[i+1])||(y>0&&on[i-N])||(y<N-1&&on[i+N])){const j=i*4;d[j]=OUT[0];d[j+1]=OUT[1];d[j+2]=OUT[2];d[j+3]=255;}}
  c.putImageData(im,0,0);
  const w=mk(N,N),wc=w.getContext('2d'),wi=wc.createImageData(N,N);for(let i=0;i<N*N*4;i+=4){if(d[i+3]){wi.data[i]=wi.data[i+1]=wi.data[i+2]=255;wi.data[i+3]=255;}}wc.putImageData(wi,0,0);
  (o as any).hi=true; (w as any).hi=true;
  return {img:o,white:w};
}
export const COL={k:'#0b0814',b:'#3956a8',n:'#26336f',g:'#dcb868',s:'#e8b98e',w:'#f1e8d4',y:'#ffd27a',W:'#ffffff',t:'#a9875a',r:'#d9505f',p:'#f3b8ae',d:'#35263f'};
export function mapSprite(rows,pal=COL){const w=Math.max(...rows.map(r=>r.length)),o=mk(w,rows.length),c=o.getContext('2d');rows.forEach((r,y)=>[...r].forEach((ch,x)=>{if(pal[ch]){c.fillStyle=pal[ch];c.fillRect(x,y,1,1);}}));return o;}
