import { createGame } from '../engine/game';
import { deserialize, serialize } from '../engine/serialize';
import type { GameState } from '../engine/types';

export const SAVE_KEY = 'blackjack.save.v1';
export const CORRUPT_KEY = `${SAVE_KEY}.corrupt`;
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}
export class LocalStorageStore implements KeyValueStore {
  get(key: string): string | null { return window.localStorage.getItem(key); }
  set(key: string, value: string): void { window.localStorage.setItem(key, value); }
  remove(key: string): void { window.localStorage.removeItem(key); }
}
export class MemoryStore implements KeyValueStore {
  private values = new Map<string, string>();
  fail = false;
  private check(): void { if (this.fail) throw new Error('Storage unavailable.'); }
  get(key: string): string | null { this.check(); return this.values.get(key) ?? null; }
  set(key: string, value: string): void { this.check(); this.values.set(key, value); }
  remove(key: string): void { this.check(); this.values.delete(key); }
}

export function readSave(raw: string): ReturnType<typeof deserialize> {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || !('schemaVersion' in value) || value.schemaVersion !== 1
      || !('savedAt' in value) || typeof value.savedAt !== 'string' || !('state' in value)) {
      return { ok: false, reason: 'Save envelope is invalid or unsupported.' };
    }
    return deserialize(JSON.stringify(value.state));
  } catch { return { ok: false, reason: 'Save is not valid JSON.' }; }
}

export type SaveResult = { ok: true }
  | { ok: false; reason: 'STALE'; current: GameState }
  | { ok: false; reason: 'UNAVAILABLE' | 'INVALID_STATE' };
export class SaveManager {
  private expectedSeq: number | null = null;
  constructor(private readonly store: KeyValueStore, private readonly fresh: () => GameState = createGame) {}

  load(): { kind: 'RESUMED' | 'NEW'; state: GameState; notice: string } {
    try {
      const raw = this.store.get(SAVE_KEY);
      if (raw === null) { this.expectedSeq = null; return { kind: 'NEW', state: this.fresh(), notice: '' }; }
      const result = readSave(raw);
      if (result.ok) { this.expectedSeq = result.state.seq; return { kind: 'RESUMED', state: result.state, notice: 'Saved table resumed.' }; }
      this.store.set(CORRUPT_KEY, raw);
      this.store.remove(SAVE_KEY);
      this.expectedSeq = null;
      return { kind: 'NEW', state: this.fresh(), notice: 'The saved table was invalid. A new table has been opened; the old save was backed up.' };
    } catch { return { kind: 'NEW', state: this.fresh(), notice: 'Progress not saved: browser storage is unavailable.' }; }
  }

  save(state: GameState): SaveResult {
    let encoded: string;
    try {
      encoded = serialize(state);
      if (!deserialize(encoded).ok) return { ok: false, reason: 'INVALID_STATE' };
    }
    catch { return { ok: false, reason: 'INVALID_STATE' }; }
    try {
      const raw = this.store.get(SAVE_KEY);
      const result = raw === null ? null : readSave(raw);
      if (result && !result.ok && raw !== null) this.store.set(CORRUPT_KEY, raw);
      const stored = result?.ok ? result.state : null;
      if (stored && stored.seq !== this.expectedSeq) {
        this.expectedSeq = stored.seq;
        return { ok: false, reason: 'STALE', current: stored };
      }
      this.store.set(SAVE_KEY, `{"schemaVersion":1,"savedAt":${JSON.stringify(new Date().toISOString())},"state":${encoded}}`);
      this.expectedSeq = state.seq;
      return { ok: true };
    } catch { return { ok: false, reason: 'UNAVAILABLE' }; }
  }

  adopt(raw: string): GameState | null {
    const result = readSave(raw);
    if (result.ok && result.state.seq > (this.expectedSeq ?? -1)) {
      this.expectedSeq = result.state.seq;
      return result.state;
    }
    return null;
  }
}
