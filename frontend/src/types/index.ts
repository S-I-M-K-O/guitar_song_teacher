export interface Chord {
  name: string;
  notes: string[];
  positions: number[]; // -1 = muted, 0 = open, >0 = fret number
  fingers: number[]; // 0 = no finger, 1-4 = finger numbers
  barre?: number; // fret for barre chord
}

export interface ChordPosition {
  string: number; // 0-5 (high E to low E)
  fret: number;
  finger: number;
  note: string;
}

export interface SongAnalysis {
  chords: TimedChord[];
  tempo: number;
  timeSignature: string;
  duration: number;
  strummingPattern: StrummingPattern;
}

export interface TimedChord {
  chord: Chord;
  startTime: number;
  endTime: number;
  measure: number;
  beat: number;
}

export interface StrummingPattern {
  pattern: StrumHit[];
  beatsPerMeasure: number;
  subdivision: 'quarter' | 'eighth' | 'sixteenth';
}

export interface StrumHit {
  type: 'down' | 'up' | 'mute' | 'rest';
  timing: number; // 0-1 within the beat
  accent?: boolean;
}

export interface GuitarState {
  currentChord: Chord | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
}

export interface AnalysisResult {
  success: boolean;
  analysis?: SongAnalysis;
  error?: string;
}