import { describe, expect, it } from 'vitest';
import { evaluateHand } from '../src/engine/hand';
import type { Rank } from '../src/engine/types';
import { cards } from './fixtures';

describe('hand evaluation', () => {
  it.each<[Rank[], number, boolean]>([
    [['A', 'A'], 12, true],
    [['A', 'A', '9'], 21, true],
    [['A', 'A', '9', 'K'], 21, false],
    [['A', 'A', 'A', '8'], 21, true],
    [['A', '6'], 17, true],
    [['A', '6', 'K'], 17, false],
    [['A', 'A', 'K'], 12, false],
    [['5', 'A', '9'], 15, false],
    [['A', 'A', 'A', 'A', '7'], 21, true],
    [['K', 'Q', '2'], 22, false],
  ])('%j totals %i (soft: %s)', (ranks, total, isSoft) => {
    expect(evaluateHand({ cards: cards(...ranks), isSplit: false })).toMatchObject({ total, isSoft, isBust: total > 21 });
  });

  it('recognizes only an unsplit two-card natural', () => {
    expect(evaluateHand({ cards: cards('A', 'K'), isSplit: false }).isBlackjack).toBe(true);
    expect(evaluateHand({ cards: cards('A', 'K'), isSplit: true }).isBlackjack).toBe(false);
    expect(evaluateHand({ cards: cards('7', '7', '7'), isSplit: false }).isBlackjack).toBe(false);
  });
});
