import { RANKS, SUITS } from './types';
import { mulberry32, nextInt } from './prng';
import type { Card, RandomSource, RngState, Shoe } from './types';

export const CUT_CARD_POSITION = 234;

export function canonicalCards(): Card[] {
  const cards: Card[] = [];
  for (let deck = 0; deck < 6; deck += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) cards.push({ id: cards.length, rank, suit });
    }
  }
  return cards;
}

export function createShoe(random: RandomSource = mulberry32(1)): Shoe {
  return { cards: shuffle(canonicalCards(), random), position: 0 };
}

export function shuffledShoe(rng: RngState): { shoe: Shoe; rng: RngState } {
  const cards = canonicalCards();
  let current = rng;
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const next = nextInt(current, i + 1);
    current = next.rng;
    const left = cards[i];
    const right = cards[next.value];
    if (left && right) [cards[i], cards[next.value]] = [right, left];
  }
  return { shoe: { cards, position: 0 }, rng: current };
}

export function shuffle(cards: readonly Card[], random: RandomSource): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const sample = random();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
      throw new Error('Random source must return a value in [0, 1).');
    }
    const j = Math.floor(sample * (i + 1));
    const left = shuffled[i];
    const right = shuffled[j];
    if (left && right) [shuffled[i], shuffled[j]] = [right, left];
  }
  return shuffled;
}

export function shoeFromCards(cards: readonly Card[]): Shoe {
  const ids = new Set(cards.map((card) => card.id));
  if (ids.size !== cards.length) throw new Error('Fixture has duplicate physical cards.');
  return { cards: [...cards.map((card) => ({ ...card })), ...canonicalCards().filter((card) => !ids.has(card.id))], position: 0 };
}

export function draw(shoe: Shoe): { card: Card; shoe: Shoe } {
  const card = shoe.cards[shoe.position];
  if (!card) throw new Error('Shoe exhausted. Inject more fixture cards.');
  return { card, shoe: { ...shoe, position: shoe.position + 1 } };
}
