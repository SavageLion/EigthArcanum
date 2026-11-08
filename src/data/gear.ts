// @ts-nocheck
import { RARITY } from './rarity';
/* Hats, robes and charms: each has a rarity and an effect. In the hunt: hearts, dmg, rate (spell speed) and gold apply; the rest are kept for the Forge list. */
const GEAR_DATA=[
 // hats
 {id:'cap',slot:'hat',rarity:'common',name:'Apprentice Cap',fx:{mana:10},desc:'Your mana bar holds 10 more.'},
 {id:'hood',slot:'hat',rarity:'common',name:"Traveler's Hood",fx:{gold:.08},desc:'Earn 8% more gold from fights and chests.'},
 {id:'brim',slot:'hat',rarity:'uncommon',name:"Witch's Brim",desc:'Bolts fire 30% faster while your mana is above half.'},
 {id:'fool',slot:'hat',rarity:'uncommon',name:"Fool's Cap",desc:'Chests hold twice the gold, but mimics are twice as common.'},
 {id:'mitre',slot:'hat',rarity:'uncommon',name:"Scholar's Mitre",fx:{cost:.08},desc:'Spells cost 8% less mana.'},
 {id:'feather',slot:'hat',rarity:'uncommon',name:"Duelist's Hat",fx:{rate:.08},desc:'Your bolts fire 8% faster.'},
 {id:'sage',slot:'hat',rarity:'rare',name:"Sage's Hood",desc:'Every third spell you cast is free.'},
 {id:'stars',slot:'hat',rarity:'rare',name:"Starcaller's Crown",fx:{regen:.25},desc:'Mana refills 25% faster.'},
 {id:'eyes',slot:'hat',rarity:'rare',name:'Hat of Many Eyes',fx:{eye:1},desc:'Redraw one omen per run if you dislike it.'},
 {id:'crown',slot:'hat',rarity:'epic',name:'Crown of Thorns',cursed:true,fx:{dmg:.4,hearts:-1},desc:'Cursed. You deal 40% more damage but have one less heart.'},
 {id:'eclipse',slot:'hat',rarity:'epic',name:'Eclipse Hat',fx:{dmg:.1},desc:'You deal 10% more damage, and 25% more again on your last heart.'},
 {id:'eighth',slot:'hat',rarity:'legendary',name:'Crown of the Eighth',fx:{hearts:1,dmg:.12,regen:.15},desc:'One extra heart, 12% more damage and mana refills 15% faster.'},
 // robes
 {id:'quilt',slot:'robe',rarity:'common',name:'Quilted Robe',fx:{dmg:.04},desc:'You deal 4% more damage.'},
 {id:'mossy',slot:'robe',rarity:'common',name:'Mossy Cloak',fx:{goldFlat:4},desc:'Earn 4 more gold after each fight.'},
 {id:'pilgrim',slot:'robe',rarity:'common',name:"Pilgrim's Robe",fx:{regen:.4},desc:'Mana refills 40% faster.'},
 {id:'ember',slot:'robe',rarity:'uncommon',name:'Ember Robe',desc:'Near misses and perfect dodges set the boss alight.'},
 {id:'blood',slot:'robe',rarity:'uncommon',name:'Blood Robe',desc:'Taking a hit refills all your mana.'},
 {id:'silk',slot:'robe',rarity:'uncommon',name:'Silk Robe',fx:{hearts:1},desc:'One extra heart.'},
 {id:'thornweave',slot:'robe',rarity:'uncommon',name:'Thornweave',desc:'When you are hit, three homing thorns leap at the boss.'},
 {id:'ghost',slot:'robe',rarity:'rare',name:'Ghost Shroud',desc:'After a near miss or perfect dodge, nothing can hit you for half a second.'},
 {id:'frostmantle',slot:'robe',rarity:'rare',name:'Frostmantle',desc:'When you are hit, the boss is chilled for 2 seconds.'},
 {id:'stormrobe',slot:'robe',rarity:'rare',name:'Stormcaller Robe',desc:'Near misses call a lightning strike on the boss.'},
 {id:'voidshroud',slot:'robe',rarity:'epic',name:'Void Shroud',desc:'A hit drains 40 mana instead of a heart, if you have the mana.'},
 {id:'phoenix',slot:'robe',rarity:'legendary',name:'Phoenix Robe',desc:'Once per run, a fatal hit leaves you with two hearts instead.'},
 // charms
 {id:'nail',slot:'charm',rarity:'common',name:'Iron Nail',fx:{dmg:.06},desc:'You deal 6% more damage.'},
 {id:'penny',slot:'charm',rarity:'common',name:'Worn Penny',fx:{goldFlat:3},desc:'Earn 3 more gold after each fight.'},
 {id:'coin',slot:'charm',rarity:'common',name:'Lucky Coin',desc:'Earn 15 more gold when you win without being hit.'},
 {id:'hourglass',slot:'charm',rarity:'uncommon',name:'Slow Hourglass',desc:'Bosses attack 10% slower.'},
 {id:'bloodstone',slot:'charm',rarity:'uncommon',name:'Bloodstone',fx:{winHeal:1},desc:'Winning a fight restores two hearts instead of one.'},
 {id:'pearl',slot:'charm',rarity:'uncommon',name:'Mana Pearl',fx:{mana:15},desc:'Your mana bar holds 15 more.'},
 {id:'fang',slot:'charm',rarity:'uncommon',name:'Wolf Fang',desc:'Every fifth basic bolt deals triple damage.'},
 {id:'moon',slot:'charm',rarity:'rare',name:'Moon Locket',desc:'The first hit in each fight is blocked.'},
 {id:'whetstone',slot:'charm',rarity:'rare',name:'Whetstone',fx:{rate:.12,dmg:.06},desc:'Bolts fire 12% faster and you deal 6% more damage.'},
 {id:'cursedeye',slot:'charm',rarity:'rare',name:'Cursed Eye',cursed:true,fx:{dmg:.3,cost:-.2},desc:'Cursed. You deal 30% more damage, but spells cost 20% more mana.'},
 {id:'tear',slot:'charm',rarity:'epic',name:"Angel's Tear",desc:'Once per fight, a fatal hit leaves you with one heart.'},
 {id:'heart',slot:'charm',rarity:'legendary',name:'Heart of the Arcanum',fx:{hearts:2,dmg:.1,winHeal:1},desc:'Two extra hearts, 10% more damage and a win restores one extra heart.'},
];
/** every item has a rarity; sell value follows it (cursed items sell for a little less) */
export const GEAR=GEAR_DATA.map(g=>({...g,value:Math.round(RARITY[g.rarity].val*(g.cursed?.8:1))}));
export const SLOT_LABEL={hat:'Hat',robe:'Robe',charm:'Charm'};
export const gearOf=id=>GEAR.find(g=>g.id===id);
export const rarityTag=g=>`<small class="rar" style="color:${RARITY[g.rarity].c}">${RARITY[g.rarity].name} ${SLOT_LABEL[g.slot]}</small>`;
