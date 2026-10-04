import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/engine/prng';
import { createShoe, draw, shuffle } from '../src/engine/shoe';
import { cards } from './fixtures';

describe('shoe and randomness', () => {
  it('contains six copies of every card, with 312 cards total', () => {
    const shoe = createShoe(mulberry32(1));
    expect(shoe.cards).toHaveLength(312);
    const counts = new Map<string, number>();
    for (const card of shoe.cards) {
      const key = `${card.rank}:${card.suit}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(52);
    expect([...counts.values()].every((count) => count === 6)).toBe(true);
  });

  it('reproduces seeded shuffles and varies different seeds', () => {
    expect(createShoe(mulberry32(42))).toEqual(createShoe(mulberry32(42)));
    expect(createShoe(mulberry32(42))).not.toEqual(createShoe(mulberry32(43)));
    expect(mulberry32(1)()).toBe(0.6270739405881613);
  });

  it('uses Fisher–Yates and does not mutate the input', () => {
    const source = cards('2', '3', '4');
    expect(shuffle(source, () => 0)).toEqual(cards('3', '4', '2'));
    expect(source).toEqual(cards('2', '3', '4'));
    expect(() => shuffle(source, () => 1)).toThrow('[0, 1)');
  });

  it('draws injected cards in order without mutating or silently replenishing', () => {
    const shoe = { cards: cards('A'), position: 0 };
    const result = draw(shoe);
    expect(result.card.rank).toBe('A');
    expect(shoe.position).toBe(0);
    expect(() => draw(result.shoe)).toThrow('exhausted');
  });
});
