import { describe, expect, it } from 'vitest';
import { applyAction, createGame } from '../src/engine/game';
import type { GameEvent, HandSettlement } from '../src/engine/types';
import { MemoryStore } from '../src/persistence/save';
import { actionSounds, settlementSound, SOUND_KEY, TableAudio } from '../src/ui/audio';
import { cards } from './fixtures';

const settlement=(outcome:HandSettlement['outcome'],profit:number):GameEvent=>({type:'SETTLED',settlements:[{
  handIndex:0,outcome,wager:100,profit,stakeReturned:profit<0?0:100,winnings:Math.max(0,profit),
}]});
describe('table sound cues',()=>{
  it('deals identical card cues for visible cards and the hidden hole card',()=>{
    const result=applyAction(createGame({cards:cards('8','10','8','7')}),{type:'DEAL',bet:100});
    if(!result.ok) throw new Error(result.error);
    const sounds=actionSounds('DEAL',result.events);
    expect(sounds.map((sound)=>sound.cue)).toEqual(['chip','card','card','card','card']);
    expect(sounds.every((sound,index)=>index===0 || sound.delay>(sounds[index-1]?.delay ?? -1))).toBe(true);
    expect(settlementSound(result.events)).toBeNull();
  });
  it.each([
    ['BLACKJACK',150,'blackjack'],['WIN',100,'win'],['PUSH',0,'push'],['LOSS',-100,'loss'],['BUST',-100,'bust'],
  ] satisfies [HandSettlement['outcome'],number,string][])('maps %s to its result cue',(outcome,profit,cue)=>{
    expect(settlementSound([settlement(outcome,profit)])).toBe(cue);
  });
  it('plays shuffle and reveal cues only for their events',()=>{
    expect(actionSounds('NEW_ROUND',[{type:'SHUFFLED'}])).toEqual([{cue:'shuffle',delay:0}]);
    expect(actionSounds('NEW_ROUND',[])).toEqual([]);
  });
  it('remembers mute separately from game saves and survives unavailable storage',()=>{
    const store=new MemoryStore();const first=new TableAudio(store);
    expect(first.enabled).toBe(true);
    first.setEnabled(false);
    expect(store.get(SOUND_KEY)).toBe('off');
    expect(new TableAudio(store).enabled).toBe(false);
    expect(()=>first.play('win')).not.toThrow();
    store.fail=true;
    const unavailable=new TableAudio(store);
    expect(()=>{unavailable.setEnabled(false);unavailable.dispose();}).not.toThrow();
  });
});
