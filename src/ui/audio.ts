import type { Action, GameEvent } from '../engine/types';
import type { KeyValueStore } from '../persistence/save';

export const SOUND_KEY = 'blackjack.sound.v1';
export type SoundCue = 'chip' | 'card' | 'reveal' | 'shuffle' | 'win' | 'blackjack' | 'push' | 'loss' | 'bust';
export interface SoundPlayer {
  readonly enabled: boolean;
  readonly supported: boolean;
  setEnabled(enabled: boolean): void;
  play(cue: SoundCue, delay?: number): void;
  stop(): void;
  dispose(): void;
}

export function actionSounds(action: Action['type'], events: readonly GameEvent[]): { cue: SoundCue; delay: number }[] {
  const sounds: { cue: SoundCue; delay: number }[] = [];
  if (['DEAL', 'DOUBLE', 'SPLIT', 'RELOAD_BANKROLL'].includes(action)) sounds.push({ cue: 'chip', delay: 0 });
  let delay = 0.035;
  for (const event of events) {
    if (event.type === 'CARD_DEALT' || event.type === 'HOLE_DEALT') {
      sounds.push({ cue: 'card', delay });
      delay += 0.07;
    } else if (event.type === 'HOLE_REVEALED') {
      sounds.push({ cue: 'reveal', delay });
      delay += 0.07;
    } else if (event.type === 'SHUFFLED') sounds.push({ cue: 'shuffle', delay: 0 });
  }
  return sounds;
}

export function settlementSound(events: readonly GameEvent[]): SoundCue | null {
  const settled = events.find((event) => event.type === 'SETTLED');
  if (!settled) return null;
  if (settled.settlements.some((hand) => hand.outcome === 'BLACKJACK')) return 'blackjack';
  const profit = settled.settlements.reduce((sum, hand) => sum + hand.profit, 0);
  if (profit > 0) return 'win';
  if (profit === 0) return 'push';
  return settled.settlements.every((hand) => hand.outcome === 'BUST') ? 'bust' : 'loss';
}

export function synthesizeSound(context: BaseAudioContext, destination: AudioNode, cue: SoundCue, start: number): AudioScheduledSourceNode[] {
  const sources: AudioScheduledSourceNode[] = [];
  function tone(frequency: number, offset: number, duration: number, volume = 0.075, end = frequency): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const time = start + offset;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(end, time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.addEventListener('ended', () => { oscillator.disconnect(); gain.disconnect(); }, { once: true });
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
    sources.push(oscillator);
  }
  function swish(offset: number, duration: number, frequency = 1500): void {
    const source = context.createBufferSource();
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    const gain = context.createGain();
    const time = start + offset;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.11, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter).connect(gain).connect(destination);
    source.addEventListener('ended', () => { source.disconnect(); filter.disconnect(); gain.disconnect(); }, { once: true });
    source.start(time);
    source.stop(time + duration + 0.01);
    sources.push(source);
  }
  switch (cue) {
    case 'chip': tone(2200, 0, 0.07, 0.065); tone(3100, 0.025, 0.055, 0.04); break;
    case 'card': swish(0, 0.085); tone(700, 0, 0.045, 0.035, 400); break;
    case 'reveal': swish(0, 0.1, 2100); tone(880, 0.025, 0.09, 0.045); break;
    case 'shuffle': for (let index = 0; index < 4; index += 1) swish(index * 0.045, 0.08, 1100 + index * 250); break;
    case 'win': [523.25, 659.25, 783.99].forEach((note, index) => tone(note, index * 0.075, 0.2)); break;
    case 'blackjack': [523.25, 659.25, 783.99, 1046.5].forEach((note, index) => tone(note, index * 0.08, 0.28)); break;
    case 'push': tone(440, 0, 0.15, 0.06); tone(440, 0.12, 0.15, 0.045); break;
    case 'loss': tone(261.63, 0, 0.18, 0.055); tone(196, 0.12, 0.22, 0.045); break;
    case 'bust': tone(190, 0, 0.24, 0.07, 75); swish(0, 0.16, 350); break;
  }
  return sources;
}

export class TableAudio implements SoundPlayer {
  private context: AudioContext | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private epoch = 0;
  private disposed = false;
  private soundEnabled = true;
  get enabled(): boolean { return this.soundEnabled; }
  get supported(): boolean { return typeof AudioContext !== 'undefined'; }

  constructor(private readonly store: KeyValueStore) {
    try { this.soundEnabled = store.get(SOUND_KEY) !== 'off'; } catch { /* Preference storage is optional. */ }
  }
  setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (!enabled) this.stop();
    try { this.store.set(SOUND_KEY, enabled ? 'on' : 'off'); } catch { /* Sound remains usable without storage. */ }
  }
  play(cue: SoundCue, delay = 0): void {
    if (!this.enabled || !this.supported || this.disposed || document.hidden) return;
    try {
      const context = this.context ??= new AudioContext();
      const epoch = this.epoch;
      const play = (): void => {
        if (this.disposed || !this.enabled || document.hidden || epoch !== this.epoch || context.state !== 'running') return;
        for (const source of synthesizeSound(context, context.destination, cue, context.currentTime + delay)) {
          this.sources.add(source);
          source.addEventListener('ended', () => this.sources.delete(source), { once: true });
        }
      };
      if (context.state === 'running') play();
      else void context.resume().then(play).catch(() => undefined);
    } catch { /* Audio device failures must not interrupt a round. */ }
  }
  stop(): void {
    this.epoch += 1;
    for (const source of this.sources) { source.stop(); source.disconnect(); }
    this.sources.clear();
  }
  dispose(): void {
    this.disposed = true;
    this.stop();
    void this.context?.close().catch(() => undefined);
  }
}
