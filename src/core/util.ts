export const $ = (id: string) => document.getElementById(id) as HTMLElement;
export const TAU = Math.PI * 2;
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const GOLD = '#dcb868';
export const BONE = '#f1e8d4';
