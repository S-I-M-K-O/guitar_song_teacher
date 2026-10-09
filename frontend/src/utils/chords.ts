import { Chord } from '../types';

// positions/fingers are high-to-low: index 0 = high E string, index 5 = low E string.
// -1 = muted, 0 = open.
export const CHORD_LIBRARY: Chord[] = [
  // Major chords
  { name: 'A', notes: ['A', 'C#', 'E'], positions: [0, 2, 2, 2, 0, -1], fingers: [0, 1, 2, 3, 0, 0] },
  { name: 'Am', notes: ['A', 'C', 'E'], positions: [0, 1, 2, 2, 0, -1], fingers: [0, 1, 2, 3, 0, 0] },
  { name: 'A7', notes: ['A', 'C#', 'E', 'G'], positions: [0, 2, 0, 2, 0, -1], fingers: [0, 2, 0, 3, 0, 0] },
  { name: 'Amaj7', notes: ['A', 'C#', 'E', 'G#'], positions: [0, 2, 1, 2, 0, -1], fingers: [0, 2, 1, 3, 0, 0] },
  { name: 'B', notes: ['B', 'D#', 'F#'], positions: [2, 4, 4, 4, 2, -1], fingers: [1, 3, 4, 2, 1, 0], barre: 2 },
  { name: 'Bm', notes: ['B', 'D', 'F#'], positions: [2, 3, 4, 4, 2, -1], fingers: [1, 2, 3, 4, 1, 0], barre: 2 },
  { name: 'B7', notes: ['B', 'D#', 'F#', 'A'], positions: [2, 0, 2, 1, 2, -1], fingers: [4, 0, 3, 1, 2, 0] },
  { name: 'Bmaj7', notes: ['B', 'D#', 'F#', 'A#'], positions: [2, 4, 3, 4, 2, -1], fingers: [1, 4, 2, 3, 1, 0], barre: 2 },
  { name: 'C', notes: ['C', 'E', 'G'], positions: [0, 1, 0, 2, 3, -1], fingers: [0, 1, 0, 2, 3, 0] },
  { name: 'Cm', notes: ['C', 'Eb', 'G'], positions: [3, 4, 5, 5, 3, -1], fingers: [1, 2, 4, 3, 1, 0], barre: 3 },
  { name: 'C7', notes: ['C', 'E', 'G', 'Bb'], positions: [0, 1, 3, 2, 3, -1], fingers: [0, 1, 4, 2, 3, 0] },
  { name: 'Cmaj7', notes: ['C', 'E', 'G', 'B'], positions: [0, 0, 0, 2, 3, -1], fingers: [0, 0, 0, 2, 3, 0] },
  { name: 'D', notes: ['D', 'F#', 'A'], positions: [2, 3, 2, 0, -1, -1], fingers: [2, 3, 1, 0, 0, 0] },
  { name: 'Dm', notes: ['D', 'F', 'A'], positions: [1, 3, 2, 0, -1, -1], fingers: [1, 3, 2, 0, 0, 0] },
  { name: 'D7', notes: ['D', 'F#', 'A', 'C'], positions: [2, 1, 2, 0, -1, -1], fingers: [3, 1, 2, 0, 0, 0] },
  { name: 'Dmaj7', notes: ['D', 'F#', 'A', 'C#'], positions: [2, 2, 2, 0, -1, -1], fingers: [1, 1, 1, 0, 0, 0], barre: 2 },
  { name: 'E', notes: ['E', 'G#', 'B'], positions: [0, 0, 1, 2, 2, 0], fingers: [0, 0, 1, 3, 2, 0] },
  { name: 'Em', notes: ['E', 'G', 'B'], positions: [0, 0, 0, 2, 2, 0], fingers: [0, 0, 0, 3, 2, 0] },
  { name: 'E7', notes: ['E', 'G#', 'B', 'D'], positions: [0, 0, 1, 0, 2, 0], fingers: [0, 0, 1, 0, 2, 0] },
  { name: 'Emaj7', notes: ['E', 'G#', 'B', 'D#'], positions: [0, 0, 1, 1, 2, 0], fingers: [0, 0, 1, 1, 2, 0] },
  { name: 'F', notes: ['F', 'A', 'C'], positions: [1, 1, 2, 3, 3, 1], fingers: [1, 1, 2, 3, 4, 1], barre: 1 },
  { name: 'Fm', notes: ['F', 'Ab', 'C'], positions: [1, 1, 1, 3, 3, 1], fingers: [1, 1, 1, 3, 4, 1], barre: 1 },
  { name: 'F7', notes: ['F', 'A', 'C', 'Eb'], positions: [1, 1, 2, 1, 3, 1], fingers: [1, 1, 2, 1, 4, 1], barre: 1 },
  { name: 'Fmaj7', notes: ['F', 'A', 'C', 'E'], positions: [0, 1, 2, 3, 3, -1], fingers: [0, 1, 2, 3, 4, 0] },
  { name: 'G', notes: ['G', 'B', 'D'], positions: [3, 0, 0, 0, 2, 3], fingers: [4, 0, 0, 0, 2, 3] },
  { name: 'Gm', notes: ['G', 'Bb', 'D'], positions: [3, 3, 3, 5, 5, 3], fingers: [1, 1, 1, 3, 4, 1], barre: 3 },
  { name: 'G7', notes: ['G', 'B', 'D', 'F'], positions: [1, 0, 0, 0, 2, 3], fingers: [1, 0, 0, 0, 2, 3] },
  { name: 'Gmaj7', notes: ['G', 'B', 'D', 'F#'], positions: [2, 0, 0, 0, 2, 3], fingers: [1, 0, 0, 0, 2, 3] },

  // Suspended chords
  { name: 'Asus2', notes: ['A', 'B', 'E'], positions: [0, 0, 2, 2, 0, -1], fingers: [0, 0, 2, 3, 0, 0] },
  { name: 'Asus4', notes: ['A', 'D', 'E'], positions: [0, 3, 2, 2, 0, -1], fingers: [0, 3, 2, 1, 0, 0] },
  { name: 'Dsus2', notes: ['D', 'E', 'A'], positions: [0, 3, 2, 0, -1, -1], fingers: [0, 3, 1, 0, 0, 0] },
  { name: 'Dsus4', notes: ['D', 'G', 'A'], positions: [3, 3, 2, 0, -1, -1], fingers: [4, 3, 1, 0, 0, 0] },
  { name: 'Esus2', notes: ['E', 'F#', 'B'], positions: [0, 0, 4, 4, 2, 0], fingers: [0, 0, 3, 2, 1, 0] },
  { name: 'Esus4', notes: ['E', 'A', 'B'], positions: [0, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  { name: 'Gsus2', notes: ['G', 'A', 'D'], positions: [3, 3, 2, 0, -1, 3], fingers: [3, 4, 1, 0, 0, 2] },
  { name: 'Gsus4', notes: ['G', 'C', 'D'], positions: [3, 1, 0, 0, 3, 3], fingers: [4, 1, 0, 0, 3, 2] },

  // Power chords
  { name: 'A5', notes: ['A', 'E'], positions: [-1, -1, 2, 2, 0, -1], fingers: [0, 0, 1, 1, 0, 0] },
  { name: 'B5', notes: ['B', 'F#'], positions: [-1, -1, 4, 4, 2, -1], fingers: [0, 0, 4, 3, 1, 0] },
  { name: 'C5', notes: ['C', 'G'], positions: [-1, -1, 5, 5, 3, -1], fingers: [0, 0, 4, 3, 1, 0] },
  { name: 'D5', notes: ['D', 'A'], positions: [-1, 3, 2, 0, -1, -1], fingers: [0, 2, 1, 0, 0, 0] },
  { name: 'E5', notes: ['E', 'B'], positions: [-1, -1, -1, 2, 2, 0], fingers: [0, 0, 0, 1, 1, 0] },
  { name: 'F5', notes: ['F', 'C'], positions: [-1, -1, -1, 3, 3, 1], fingers: [0, 0, 0, 3, 4, 1] },
  { name: 'G5', notes: ['G', 'D'], positions: [-1, -1, -1, 5, 5, 3], fingers: [0, 0, 0, 3, 4, 1] },
];

export const CHORD_CATEGORIES = {
  'Major': CHORD_LIBRARY.filter(c => /^[A-G]$/.test(c.name) && !c.name.includes('m') && !c.name.includes('7') && !c.name.includes('sus') && !c.name.includes('5')),
  'Minor': CHORD_LIBRARY.filter(c => c.name.includes('m') && !c.name.includes('7') && !c.name.includes('maj') && !c.name.includes('sus')),
  'Dominant 7th': CHORD_LIBRARY.filter(c => c.name.includes('7') && !c.name.includes('maj') && !c.name.includes('sus')),
  'Major 7th': CHORD_LIBRARY.filter(c => c.name.includes('maj7')),
  'Suspended': CHORD_LIBRARY.filter(c => c.name.includes('sus')),
  'Power Chords': CHORD_LIBRARY.filter(c => c.name.includes('5')),
};

export function getChordByName(name: string): Chord | undefined {
  return CHORD_LIBRARY.find(c => c.name === name);
}

export function getAllChordNames(): string[] {
  return CHORD_LIBRARY.map(c => c.name).sort();
}
