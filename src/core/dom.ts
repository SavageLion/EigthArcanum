// @ts-nocheck
import { G } from './state';
import { $ } from './util';

export const stage=$('stage'), cv=$('c'), ctx=cv.getContext('2d'), ov=$('ov'), muteBtn=$('mute');
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const W=400;
export const FLOOR=()=>G.H-6;
