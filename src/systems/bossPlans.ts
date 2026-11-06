// @ts-nocheck
import { G } from '../core/state';
import { FO_ATTACKS } from './faceoff';

/* ---------- boss identity: each boss has its own face-off plan and open-arena behaviour ---------- */
const LANE_NAME=['left','middle','right'];
const foA=(id,o={})=>({...FO_ATTACKS[id],id,...o});
const foLane=(n,o={})=>({id:'lane',zones:[n],hand:n<1?'l':n>1?'r':'both',say:n===1?'Dodge either way':n<1?'Stay off the left':'Stay off the right',...o});
const foGap=(o={})=>{const s=Math.floor(Math.random()*3);return {id:'gap',zones:[0,1,2].filter(z=>z!==s),hand:'both',say:s===1?'Stay in the middle':`Dodge ${LANE_NAME[s]}`,...o};};
const pickOf=a=>a[Math.floor(Math.random()*a.length)];
const side=()=>Math.random()<.5?0:2;
export function foPlan(i){
  const q=[]; const en=G.B.enraged;
  const fist=()=>foA(pickOf(['left','right']));
  const burnFist=()=>{const a=fist();a.linger=a.id==='left'?0:2;a.lingerT=1.8;return a;};
  const fake=()=>{const a=fist();a.fake=true;a.say='The mirror lies';return a;};
  const hidden=()=>{const a=foGap();a.hide=true;a.say='Remember it: '+a.say.toLowerCase();return a;};
  switch(i){
   case 0: q.push(pickOf([burnFist(),burnFist(),foA('slam'),foA('clap'),foA('spit')])); if(en)q.push(burnFist()); break; // Cinder King: burning lanes
   case 1: q.push(foGap()); if(en||Math.random()<.35)q.push(foA('spit',{warn:.46,say:'Ice shard'})); break; // Frost Matron: closing ice
   case 2: { const a=pickOf(['slam','clap','left','right']); q.push(foA(a),foA(a,{warn:.5,say:'It tolls again'})); if(en)q.push(foA(a,{warn:.42,say:'And again'})); break; } // Bell: repeats
   case 3: { const n=en?4:3; for(let k=0;k<n;k++)q.push(foA('spit',{warn:.48,say:'Lightning follows you'})); break; } // Storm Eye: chain
   case 4: { const l=side(); q.push(foLane(l,{linger:l,lingerT:2.8,say:'Thorns take a lane'})); q.push(pickOf([foA('slam'),foA('spit')])); if(en)q.push(fist()); break; } // Thorns: blocks lanes
   case 5: { const o=Math.random()<.5?[0,1,2]:[2,1,0]; o.forEach(n=>q.push(foLane(n,{warn:en?.36:.44,say:'Bones sweep across'}))); break; } // Bone Tyrant: sweep
   case 6: q.push(fake()); if(en||Math.random()<.4)q.push(foA('spit',{warn:.5})); break; // Mirror Witch: false warnings
   case 7: { const all=[burnFist,fake,hidden,()=>foGap(),()=>foA('spit',{warn:.46})]; const n=en?3:2; for(let k=0;k<n;k++)q.push(pickOf(all)()); break; } // Void: everything
   case 8: { const a=Math.random()<.5; q.push(foA(a?'left':'right',{say:'The tide comes in'}),foA(a?'right':'left',{warn:.6,say:'The tide turns'})); break; } // Drowned Queen: tide
   case 9: { const n=en?5:4; for(let k=0;k<n;k++)q.push(foA(k%2?'clap':'slam',{warn:en?.46:.56,say:'Keep the rhythm'})); break; } // Judge: steady beat
   case 10: { const n=en?6:4; for(let k=0;k<n;k++)q.push(foA('spit',{warn:.4,say:'Bees follow you'})); break; } // Hive: stings
   case 11: { const l=side(); q.push(foLane(l,{linger:l,lingerT:3.2,say:'Webs fill a lane'})); q.push(foA('spit',{warn:.5})); if(en)q.push(foA('slam')); break; } // Widow: webs
   case 12: q.push(hidden()); if(en)q.push(hidden()); break; // Sand Prophet: hidden warning
   case 13: q.push(burnFist(),foA('slam',{warn:.62,say:'He brings both fists down'})); if(en)q.push(burnFist()); break; // Emperor: heavy chain
   case 14: q.push(fake(),foGap({warn:.68})); if(en)q.push(hidden()); break; // Priestess: illusions
   case 15: { const l=side(); q.push(foLane(l,{linger:l,lingerT:2.4,say:'Hellfire takes a lane'}),fake()); if(en)q.push(foA('spit',{warn:.42}),foA('spit',{warn:.42})); break; } // Devil: punishing
   default: q.push(fist());
  }
  return q;
}
export const OA_STYLE=[
 {speed:44,charges:1,trail:'fire'},                 // Cinder King
 {speed:30,charges:1,trail:'ice'},                  // Frost Matron
 {speed:14,charges:0,move:'drift'},                 // Hollow Bell
 {speed:0,charges:0,move:'blink',blink:2.8},        // Storm Eye
 {speed:0,charges:0,move:'root'},                   // Mother of Thorns
 {speed:44,charges:1},                              // Bone Tyrant
 {speed:0,charges:0,move:'mirror'},                 // Mirror Witch
 {speed:30,charges:1,pull:42,trail:null},           // Void Sovereign
 {speed:68,charges:0,move:'patrol'},                // Drowned Queen
 {speed:0,charges:1,move:'grid'},                   // Clockwork Judge
 {speed:60,charges:0,move:'flee'},                  // Hive Mother
 {speed:40,charges:3,trail:'web'},                  // Ash Widow
 {speed:0,charges:0,move:'blink',blink:2.2},        // Sand Prophet
 {speed:46,charges:2,trail:'fire'},                 // Emperor
 {speed:0,charges:1,move:'blink',blink:3.4},        // High Priestess
 {speed:54,charges:2,pull:30,trail:'fire'}          // Devil
];
export const BOSS_SIG=[
 {f:'Burning lanes stay dangerous after his fists land.',s:'Leaves a burning trail as he hunts you.'},
 {f:'Ice closes on two lanes, so find the third.',s:'Slow, but her icy trail slows you down.'},
 {f:'Every attack tolls again straight after.',s:'Barely moves, but its waves cross the room.'},
 {f:'Lightning follows you in quick strikes.',s:'Vanishes and reappears around the room.'},
 {f:'Thorns close off a side lane for a while.',s:'Rooted in place, and it never chases you.'},
 {f:'Bones sweep across all three lanes in turn.',s:'Hunts you, then charges in a straight line.'},
 {f:'The warning shows the wrong side until the last moment.',s:'Stands opposite you, copying every step.'},
 {f:'Uses every trick in the deck.',s:'Drags you toward it with its gravity.'},
 {f:'The tide hits one side, then swings back.',s:'Sweeps from wall to wall across the room.'},
 {f:'Long chains on a steady beat.',s:'Moves in sharp steps, like a clock hand.'},
 {f:'Fast stings keep following you.',s:'Runs away while the swarm comes for you.'},
 {f:'Webs block a side lane, then she spits.',s:'Charges three times and leaves webs that slow you.'},
 {f:'The warning fades before the strike, so remember it.',s:'Blinks around the room between boomerangs.'},
 {f:'Burning fists, then a double slam.',s:'Charges twice and leaves fire behind him.'},
 {f:'False warnings, then a closing trap.',s:'Vanishes constantly, then lunges at you.'},
 {f:'Hellfire blocks a lane, then a false warning.',s:'Charges twice, leaves fire and pulls you in.'}
];
