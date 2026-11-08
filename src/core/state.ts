// @ts-nocheck
import { W } from './dom';
import { wizardById } from '../data/meta';
/** Shared mutable state for the village (the hunt keeps its own state inside src/hunt/). */
export const G: any = {
  H: 720,
  LH: 288,
  P: undefined,
  hub: null,
  bg: null,
  stick: null,
  stickV: {x:0,y:0},
  last: 0,
};
export const S: any = {mode:'title',t:0,paused:false};
/** the walking wizard in the village */
export function newPlayer(wizardId='raven'){
  const w=wizardById(wizardId);
  return {wizard:w.id,perk:w.perk,x:W/2,y:200,face:'south',moveAt:undefined};
}
