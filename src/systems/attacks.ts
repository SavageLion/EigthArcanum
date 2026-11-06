// @ts-nocheck
import { W } from '../core/dom';
import { G, S } from '../core/state';
import { TAU, clamp, rnd } from '../core/util';

export function every(k,iv,fn){ const m=G.B.tm; if(m[k]===undefined)m[k]=iv*.6; m[k]-=G.DT; if(m[k]<=0){m[k]+=iv;G.B.atkAt=performance.now()/1000;fn();} }
export function shot(x,y,a,s,o={}){ if(G.shots.length>420)return; G.shots.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:5.5,c:G.B.color,grazed:false,...o}); }
const aim=()=>Math.atan2(G.P.y-G.B.y,G.P.x-G.B.x);
export function fan(n,spread,s,o,base){ const a=base===undefined?aim():base; for(let i=0;i<n;i++) shot(G.B.x,G.B.y+20,a+(n>1?(i/(n-1)-.5)*spread:0),s,o); }
export function ring(n,s,o,off=rnd(0,TAU),x=G.B.x,y=G.B.y){ for(let i=0;i<n;i++) shot(x,y,off+i/n*TAU,s,o); }
export function gapRing(n,s,gapN,o){ const a=aim()+(S.orbit?(Math.random()<.5?-1:1)*rnd(.9,1.9):0); for(let i=0;i<n;i++){ const d=i-(n-1)/2; const ang=a+Math.PI+i/n*TAU; const fromGap=Math.abs(((ang-a+Math.PI*3)%TAU)-Math.PI); if(fromGap>gapN*TAU/n/2+.001) shot(G.B.x,G.B.y,ang,s,o);} }
export function wave(v,gap,c){ G.rings.push({x:G.B.x,y:G.B.y,rad:30,v,gap,a:aim()+(S.orbit?(Math.random()<.5?-1:1)*rnd(.8,1.6):rnd(-.25,.25)),w:11,c:c||G.B.color,hit:false}); }
export function column(x,warn=.75){ G.cols.push({x:clamp(x,20,W-20),w:46,t:0,warn,on:.22,c:G.B.color,hit:false}); }
export function seed(n=8){ const tx=rnd(40,W-40),ty=rnd(G.H*.34,G.H*.82),f=1.15; G.shots.push({x:G.B.x,y:G.B.y,vx:(tx-G.B.x)/f,vy:(ty-G.B.y)/f,r:9,c:G.B.color,fuse:f,burst:n,seed:true,grazed:true}); }
export function spiral(arms,step,sp,o){ G.B.ang=(G.B.ang||0)+step; for(let i=0;i<arms;i++) shot(G.B.x,G.B.y,G.B.ang+i/arms*TAU,sp,o); }
