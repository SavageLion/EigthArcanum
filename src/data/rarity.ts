/* Item rarity: colour, how often it drops (w), how much deeper runs favour it (boost) and its base sell value. */
export const RANK=['common','uncommon','rare','epic','legendary'] as const;
export const RARITY={
  common:{name:'Common',c:'#b5afc2',w:50,boost:0,val:10},
  uncommon:{name:'Uncommon',c:'#6dd36d',w:28,boost:1.2,val:18},
  rare:{name:'Rare',c:'#5aa8f0',w:14,boost:3,val:30},
  epic:{name:'Epic',c:'#b78cff',w:6,boost:5,val:50},
  legendary:{name:'Legendary',c:'#ffb347',w:2,boost:9,val:80},
};
export const rankOf=(r:string)=>RANK.indexOf(r as any);
