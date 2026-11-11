/* ============================================================================
   SHEEPDOG MAP DATA. To add a map: copy one entry below, give it a new id, tweak the numbers.
   Every map plays the same day loop (find the herd, ward off enemies, pen a quota); what differs is the data.

   id, name, blurb     map-select card
   ready               false = shown as "coming soon"
   days                length of the run; the last day wins the map
   quota [a,b]         fraction of the flock that must be penned: day 1 = a, last day = b
   wx, wy              world size in screens (1 = one screen, no camera). Bigger = scrolling + find phase
   timeMul             multiplies the day length (big worlds need more time)
   diff                shifts difficulty: day N plays like day N+diff for terrain / night
   center              true = the pen sits in the middle of the world with four lanes; else on the right edge
   rocks, trees, mud   obstacle density multipliers (default 1)
   stream, streamFrom  stream across the world (default true), and the first day it appears (default 4)
   seasonShift         start this many days into the season cycle (9 = start in winter)
   act, actFrom        how often sheep act out (bolt / stuck / wander) and from which day
   pressure            how many enemy scouts turn up per day (multiplier)
   pool                the mixed herd: [{t:type, w:weight, from:first day it can appear}]
                       types: normal ram panicky lamb black goat goose duck pig cow
   enemies             [{k:kind, w:weight, from:first day}]  kinds: fox coyote pack wolf1 eagle badger bear
   news {day:text}     banner shown at the start of that day
   td, bear            (night mode only, parked)
   ============================================================================ */
window.SD_MAPS=[
 {id:'home',name:'Home Paddock',days:5,ready:true,bear:false,quota:[.4,.6],act:.45,actFrom:3,pressure:.6,
  blurb:'One field. Short and gentle. Learn the ropes.',
  pool:[{t:'normal',w:8},{t:'ram',w:1,from:2},{t:'panicky',w:1,from:2},{t:'black',w:1,from:3},{t:'goat',w:1,from:4}],
  enemies:[{k:'fox',w:4},{k:'pack',w:1,from:3},{k:'eagle',w:1,from:4}],
  news:{2:'Mud slows you and the flock. Foxes sneak in',3:'Black sheep wander. Wolves appear',4:'A stream cuts the field. Eagles take lambs',5:'Last day: pen your quota. Goats need a stare'}},
 {id:'hill',name:'Hill Pasture',days:8,ready:true,quota:[.5,.75],wx:2.1,wy:1.7,timeMul:2.3,diff:1,act:1,actFrom:1,pressure:1,
  blurb:'A wide hillside. Find your flock first.',
  pool:[{t:'normal',w:6},{t:'goat',w:2},{t:'goose',w:2},{t:'black',w:1,from:2},{t:'ram',w:1,from:3},{t:'panicky',w:1,from:4}],
  enemies:[{k:'fox',w:3},{k:'coyote',w:2,from:2},{k:'pack',w:2,from:3},{k:'eagle',w:2,from:4},{k:'badger',w:1,from:6}],
  news:{1:'A wide hillside: find your sheep! Bark to hear them',2:'Sheep may bolt, get stuck, or wander off to hide',3:'Mud and a stream slow you down',4:'Wolves and eagles hunt in the hills',5:'Goats ignore you until you stare',6:'Trees block the way. Badgers dig in',8:'Last day: bring them home'}},
 {id:'wood',name:'Wood Edge',days:10,ready:true,quota:[.5,.8],td:true,center:true,wx:2.2,wy:3.2,timeMul:2.2,diff:2,act:1.1,actFrom:2,pressure:1.1,
  blurb:'A pen in the middle, four lanes in. Dark trees.',
  pool:[{t:'normal',w:5},{t:'goat',w:2},{t:'pig',w:2},{t:'goose',w:1},{t:'black',w:1,from:2},{t:'ram',w:1,from:3},{t:'panicky',w:1,from:3}],
  enemies:[{k:'fox',w:3},{k:'coyote',w:2},{k:'pack',w:2,from:2},{k:'eagle',w:1,from:3},{k:'badger',w:2,from:4},{k:'bear',w:1,from:8}],
  news:{1:'Scouts prowl: find your sheep and drive them off!',3:'Pigs love mud and wallow in it',5:'Badgers dig for loners',10:'Last day: hold the quota!'}},
 {id:'river',name:'River Meadow',days:12,ready:true,quota:[.5,.8],wx:2.6,wy:1.7,timeMul:2.4,diff:2,act:1.2,actFrom:1,pressure:1.1,mud:1.5,rocks:.7,trees:.5,streamFrom:1,
  blurb:'A river between you and the pen. Ducks and geese.',
  pool:[{t:'normal',w:4},{t:'goose',w:3},{t:'duck',w:3},{t:'goat',w:1,from:3},{t:'pig',w:1,from:4},{t:'black',w:1,from:2}],
  enemies:[{k:'fox',w:3},{k:'coyote',w:2,from:2},{k:'eagle',w:3,from:3},{k:'pack',w:2,from:4},{k:'badger',w:1,from:6}],
  news:{1:'Cross the river at the fords. Ducks love the water',3:'Eagles hunt the open meadow',5:'Geese scatter at a bark',9:'Wolves hunt the banks'}},
 {id:'high',name:'High Pasture',days:15,ready:true,quota:[.55,.85],wx:2.4,wy:2.4,center:true,timeMul:2.6,diff:3,act:1.3,actFrom:1,pressure:1.2,seasonShift:9,mud:.6,rocks:1.4,
  blurb:'Deep winter, a pen in the middle. Cows and pigs.',
  pool:[{t:'normal',w:3},{t:'cow',w:3},{t:'pig',w:2},{t:'goat',w:2},{t:'ram',w:1,from:2},{t:'goose',w:1,from:3}],
  enemies:[{k:'pack',w:3},{k:'coyote',w:2},{k:'badger',w:2,from:3},{k:'bear',w:2,from:6},{k:'eagle',w:1,from:5}],
  news:{1:'Deep winter. Cows are slow, but they stay together',4:'Bears wake in the hills',15:'Last day: bring the herd in!'}}
];
