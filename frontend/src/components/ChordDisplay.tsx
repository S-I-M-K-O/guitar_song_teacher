'use client';

import React from 'react';
import { TimedChord, Chord } from '../types';
import { ChordDiagram } from './ChordDiagram';
import { audioEngine } from '../utils/audio';

interface ChordDisplayProps {
  currentChord: TimedChord | null;
  upcomingChords: TimedChord[];
  onChordClick?: (chord: Chord) => void;
}

export function ChordDisplay({ currentChord, upcomingChords, onChordClick }: ChordDisplayProps) {
  const allChords = currentChord ? [currentChord, ...upcomingChords] : upcomingChords;

  const handleChordClick = (chord: Chord) => {
    onChordClick?.(chord);
    audioEngine.playChord(chord);
  };

  return (
    <div className="chord-display" role="list" aria-label="Chord progression">
      {allChords.map((timedChord, index) => (
        <div
          key={`${timedChord.chord.name}-${index}`}
          className={`chord-card ${index === 0 ? 'active' : 'upcoming'}`}
          role="listitem"
          onClick={() => handleChordClick(timedChord.chord)}
          style={{ cursor: 'pointer' }}
        >
          <div className="chord-name">{timedChord.chord.name}</div>
          <div className="chord-diagram">
            <ChordDiagram chord={timedChord.chord} size={140} />
          </div>
          <div className="card-time">
            {formatTime(timedChord.startTime)} - {formatTime(timedChord.endTime)}
          </div>
        </div>
      ))}
      
      {allChords.length === 0 && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888', padding: '24px' }}>
          No chords detected. Upload and analyze a song first.
        </div>
      )}
    </div>
  );
}

function formatTime(time: number): string {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default ChordDisplay;