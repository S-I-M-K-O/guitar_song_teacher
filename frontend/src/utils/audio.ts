import * as Tone from 'tone';
import { Chord } from '../types';

const OPEN_STRING_FREQS = [329.63, 246.94, 196.0, 146.83, 110.0, 82.41];
const STRING_DAMPENING = [5200, 4600, 4000, 3400, 2900, 2500];

export type SynthMode = 'pluck' | 'osc' | 'sampler';

export interface OscParams {
  type: 'sine' | 'square' | 'triangle' | 'sawtooth';
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterFreq: number;
  resonance: number;
  gain: number;
  polyphony: number;
}

export interface Patch {
  name: string;
  params: OscParams;
}

const DEFAULT_PATCHES: Patch[] = [
  {
    name: 'Warm Pad',
    params: {
      type: 'sawtooth',
      attack: 0.2,
      decay: 0.3,
      sustain: 0.7,
      release: 1.2,
      filterFreq: 2000,
      resonance: 0.3,
      gain: 0.6,
      polyphony: 4,
    },
  },
  {
    name: 'Bright Lead',
    params: {
      type: 'square',
      attack: 0.01,
      decay: 0.2,
      sustain: 0.6,
      release: 0.8,
      filterFreq: 2500,
      resonance: 0.2,
      gain: 0.7,
      polyphony: 2,
    },
  },
  {
    name: 'Plucky',
    params: {
      type: 'triangle',
      attack: 0.01,
      decay: 0.15,
      sustain: 0.4,
      release: 0.6,
      filterFreq: 3000,
      resonance: 0.1,
      gain: 0.8,
      polyphony: 6,
    },
  },
  {
    name: 'Bass',
    params: {
      type: 'sawtooth',
      attack: 0.01,
      decay: 0.2,
      sustain: 0.8,
      release: 0.6,
      filterFreq: 1200,
      resonance: 0.4,
      gain: 0.8,
      polyphony: 1,
    },
  },
  {
    name: 'Steel String Clean',
    params: {
      type: 'sine',
      attack: 0.01,
      decay: 0.08,
      sustain: 0.85,
      release: 0.9,
      filterFreq: 3200,
      resonance: 0.15,
      gain: 0.72,
      polyphony: 6,
    },
  },
  {
    name: 'Steel String Clean',
    params: {
      type: 'sine',
      attack: 0.01,
      decay: 0.08,
      sustain: 0.85,
      release: 0.9,
      filterFreq: 3200,
      resonance: 0.15,
      gain: 0.72,
      polyphony: 6,
    },
  },
  {
    name: 'Nylon Warm',
    params: {
      type: 'triangle',
      attack: 0.015,
      decay: 0.12,
      sustain: 0.8,
      release: 1.1,
      filterFreq: 2400,
      resonance: 0.12,
      gain: 0.68,
      polyphony: 6,
    },
  },
  {
    name: 'Country Twang',
    params: {
      type: 'square',
      attack: 0.005,
      decay: 0.06,
      sustain: 0.75,
      release: 0.7,
      filterFreq: 3800,
      resonance: 0.25,
      gain: 0.65,
      polyphony: 4,
    },
  },
  {
    name: 'Blues Crunch',
    params: {
      type: 'sawtooth',
      attack: 0.008,
      decay: 0.15,
      sustain: 0.6,
      release: 0.8,
      filterFreq: 1800,
      resonance: 0.45,
      gain: 0.75,
      polyphony: 3,
    },
  },
  {
    name: 'Chorus-like Pluck',
    params: {
      type: 'triangle',
      attack: 0.01,
      decay: 0.1,
      sustain: 0.5,
      release: 0.85,
      filterFreq: 2800,
      resonance: 0.08,
      gain: 0.7,
      polyphony: 6,
    },
  },
];

export class AudioEngine {
  private plucks: (Tone.PluckSynth | null)[] = [null, null, null, null, null, null];
  private noise: Tone.NoiseSynth | null = null;
  private noiseFilter: Tone.Filter | null = null;
  private isInitialized = false;
  private masterVolume: Tone.Volume;

  private mode: SynthMode = 'pluck';
  private oscSynth: Tone.PolySynth | null = null;
  private oscFilter: Tone.Filter | null = null;
  private oscGain: Tone.Gain | null = null;
  private oscParams: OscParams = DEFAULT_PATCHES[0].params;
  private sampler: Tone.Sampler | null = null;

  constructor() {
    this.masterVolume = new Tone.Volume(-6).toDestination();
  }

  setMode(mode: SynthMode): void {
    this.mode = mode;
  }

  setOscParams(params: Partial<OscParams>): void {
    this.oscParams = { ...this.oscParams, ...params };
    if (this.oscSynth) {
      this.oscSynth.set({
        oscillator: { type: this.oscParams.type as any },
        envelope: {
          attack: this.oscParams.attack,
          decay: this.oscParams.decay,
          sustain: this.oscParams.sustain,
          release: this.oscParams.release,
        },
      });
      if (this.oscFilter) {
        this.oscFilter.frequency.rampTo(this.oscParams.filterFreq, 0.1);
        this.oscFilter.Q.rampTo(this.oscParams.resonance * 10, 0.1);
      }
      if (this.oscGain) {
        this.oscGain.gain.rampTo(this.oscParams.gain, 0.1);
      }
      if (this.oscParams.polyphony) {
        // Tone.PolySynth polyphony is set at creation; easier to recreate if needed
        // but keep simple
      }
    }
  }

  getPatches(): Patch[] {
    return DEFAULT_PATCHES;
  }

  getOscParams(): OscParams {
    return { ...this.oscParams };
  }

  setPatch(patch: Patch): void {
    this.setOscParams(patch.params);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await Tone.start();
    await this.initPluck();
    await this.initOsc();
    await this.initSampler();
    this.isInitialized = true;
  }

  private async initPluck(): Promise<void> {
    for (let i = 0; i < 6; i++) {
      this.plucks[i] = new Tone.PluckSynth({
        attackNoise: 0.02,
        dampening: Math.max(1600, Math.min(STRING_DAMPENING[i] * 0.68, 3600)),
        resonance: 0.78,
        release: 1.4,
      }).connect(this.masterVolume);
    }
    const bodyFilter = new Tone.Filter({ type: 'lowpass', frequency: 2800, Q: 0.5 }).toDestination();
    this.masterVolume.disconnect();
    this.masterVolume.connect(bodyFilter);

    this.noiseFilter = new Tone.Filter({ type: 'lowpass', frequency: 2800, Q: 0.9 }).connect(this.masterVolume);
    this.noise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.0003, decay: 0.03, sustain: 0 },
      volume: -28,
    }).connect(this.noiseFilter);
  }

  private async initOsc(): Promise<void> {
    const p = this.oscParams;
    this.oscFilter = new Tone.Filter({ type: 'lowpass', frequency: p.filterFreq, Q: p.resonance * 10, rolloff: -24 }).toDestination();
    this.oscGain = new Tone.Gain(p.gain).connect(this.oscFilter);
    this.oscSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: p.type as any },
      envelope: { attack: p.attack, decay: p.decay, sustain: p.sustain, release: p.release },
    }).connect(this.oscGain);
  }

  private async initSampler(): Promise<void> {
    try {
      this.sampler = new Tone.Sampler({
        urls: {
          'C0': 'Mallet Guitar C0.wav',
          'C1': 'Mallet Guitar C1.wav',
          'C2': 'Mallet Guitar C2.wav',
          'C3': 'Mallet Guitar C3.wav',
          'C4': 'Mallet Guitar C4.wav',
          'E0': 'Mallet Guitar E0.wav',
          'E1': 'Mallet Guitar E1.wav',
          'E2': 'Mallet Guitar E2.wav',
          'E3': 'Mallet Guitar E3.wav',
          'G0': 'Mallet Guitar G0.wav',
          'G1': 'Mallet Guitar G1.wav',
          'G2': 'Mallet Guitar G2.wav',
          'G3': 'Mallet Guitar G3.wav',
          'A#0': 'Mallet Guitar Bb0.wav',
          'A#1': 'Mallet Guitar Bb1.wav',
          'A#2': 'Mallet Guitar Bb2.wav',
          'A#3': 'Mallet Guitar Bb3.wav',
        },
        release: 1.0,
        baseUrl: '/samples/',
      }).toDestination();
    } catch (e) {
      // ignore
    }
  }
  private freqForStringFret(stringIndex: number, fret: number): number {
    return OPEN_STRING_FREQS[stringIndex] * Math.pow(2, fret / 12);
  }

  private pluckString(stringIndex: number, freq: number, time: number): void {
    if (this.mode === 'pluck') {
      const voice = this.plucks[stringIndex];
      if (voice) voice.triggerAttack(freq, time);
    } else if (this.mode === 'osc' && this.oscSynth) {
      this.oscSynth.triggerAttackRelease(freq, 0.5, time);
    } else if (this.mode === 'sampler' && this.sampler) {
      try {
        this.sampler.triggerAttackRelease(freq, 0.8, time);
      } catch (e) {
        if (this.oscSynth) this.oscSynth.triggerAttackRelease(freq, 0.5, time);
      }
    }
  }

  private chokeStrings(times: number[]): void {
    for (const t of times) {
      for (const voice of this.plucks) voice?.triggerRelease(t);
    }
    if (this.oscSynth) {
      // release all
    }
  }

  playChord(chord: Chord, strumDirection: 'down' | 'up' = 'down', strumSpeed = 0.045): void {
    if (!this.isInitialized) return;
    const stringOrder = strumDirection === 'down' ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5];
    const now = Tone.now();
    let i = 0;
    for (const stringIdx of stringOrder) {
      const fret = chord.positions[stringIdx];
      if (fret >= 0) {
        this.pluckString(stringIdx, this.freqForStringFret(stringIdx, fret), now + i * strumSpeed);
        i++;
      }
    }
  }

  playStrumHit(type: 'down' | 'up' | 'mute' | 'rest', chord: Chord | null): void {
    if (!this.isInitialized) return;
    const now = Tone.now();
    if (type === 'rest') {
      for (const voice of this.plucks) voice?.triggerRelease(now);
      return;
    }
    if (type === 'mute' || !chord) {
      for (const voice of this.plucks) voice?.triggerRelease(now);
      this.noise?.triggerAttackRelease(0.06, now);
      return;
    }
    const stringOrder = type === 'down' ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5];
    const strumSpeed = type === 'down' ? 0.028 : 0.035;
    let i = 0;
    for (const stringIdx of stringOrder) {
      const fret = chord.positions[stringIdx];
      if (fret >= 0) {
        this.pluckString(stringIdx, this.freqForStringFret(stringIdx, fret), now + i * strumSpeed);
        i++;
      }
    }
    if (i > 0) this.chokeStrings([now + i * strumSpeed + 0.5]);
  }

  playArpeggio(chord: Chord, pattern: number[] = [5, 4, 3, 2, 1, 0], noteDuration = '8n'): void {
    if (!this.isInitialized) return;
    const now = Tone.now();
    const step = 0.15;
    let i = 0;
    for (const stringIdx of pattern) {
      const fret = chord.positions[stringIdx];
      if (fret >= 0) {
        this.pluckString(stringIdx, this.freqForStringFret(stringIdx, fret), now + i * step);
        i++;
      }
    }
    if (i > 0) {
      const releaseTime = now + i * step + Tone.Time(noteDuration).toSeconds();
      this.chokeStrings([releaseTime]);
    }
  }

  setVolume(volume: number): void {
    this.masterVolume.volume.rampTo(volume, 0.1);
  }

  stopAll(): void {
    if (!this.isInitialized) return;
    this.chokeStrings([Tone.now()]);
    this.noise?.triggerRelease();
    if (this.oscSynth) {
      this.oscSynth.releaseAll();
    }
    if (this.sampler) {
      this.sampler.releaseAll();
    }
  }

  dispose(): void {
    this.stopAll();
    for (const voice of this.plucks) voice?.dispose();
    this.plucks = [null, null, null, null, null, null];
    this.noise?.dispose();
    this.noise = null;
    this.noiseFilter?.dispose();
    this.noiseFilter = null;
    this.oscSynth?.dispose();
    this.oscSynth = null;
    this.oscFilter?.dispose();
    this.oscFilter = null;
    this.oscGain?.dispose();
    this.oscGain = null;
    this.sampler?.dispose();
    this.sampler = null;
    this.masterVolume.dispose();
    this.isInitialized = false;
  }
}

export const audioEngine = new AudioEngine();
