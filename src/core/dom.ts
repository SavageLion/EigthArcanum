// @ts-nocheck
import { G } from './state';
import { $ } from './util';

export const stage=$('stage'), cv=$('c'), ctx=cv.getContext('2d'), ov=$('ov'), muteBtn=$('mute');
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** logical world width: 400 everywhere, wider (zoomed out) in the Chariot arena; see core/size.ts */
export let W=400;
export const setW=(v:number)=>{ W=v; };
export const FLOOR=()=>G.H-6;
