import type { RandomSource, RngState } from './types';

export function seedRng(seed: number): RngState {
  return { a: seed >>> 0, b: 0x9e3779b9, c: 0x243f6a88, d: 1 };
}

export function nextUint32(rng: RngState): { value: number; rng: RngState } {
  const value = (((rng.a + rng.b) >>> 0) + rng.d) >>> 0;
  const a = (rng.b ^ (rng.b >>> 9)) >>> 0;
  const b = (rng.c + (rng.c << 3)) >>> 0;
  const c = (((rng.c << 21) | (rng.c >>> 11)) + value) >>> 0;
  return { value, rng: { a, b, c, d: (rng.d + 1) >>> 0 } };
}

export function nextInt(rng: RngState, bound: number): { value: number; rng: RngState } {
  if (!Number.isInteger(bound) || bound < 1 || bound > 4294967296) throw new Error('Invalid RNG bound.');
  const limit = 4294967296 - (4294967296 % bound);
  let current = rng;
  for (;;) {
    const next = nextUint32(current);
    current = next.rng;
    if (next.value < limit) return { value: next.value % bound, rng: current };
  }
}

export function mulberry32(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), value | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
