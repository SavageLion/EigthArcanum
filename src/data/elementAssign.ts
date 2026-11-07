// @ts-nocheck
import { BOSS_EL } from '../systems/spells';
import './newBosses';
import './newBosses64';

/** the three newest elements (poison, holy, void) go to bosses that suit them; their reward spells and bullet colours follow */
const A={ 7:'void', 18:'poison', 29:'poison', 39:'poison', 48:'poison', 22:'holy', 54:'holy', 59:'holy', 30:'void', 52:'void', 62:'void', 63:'void' };
for(const k in A) if(BOSS_EL.length>+k) BOSS_EL[+k]=A[k];
