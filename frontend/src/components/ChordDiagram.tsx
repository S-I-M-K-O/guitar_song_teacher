'use client';

import React from 'react';
import { Chord } from '../types';

interface ChordDiagramProps {
  chord: Chord | null;
  size?: number;
  showFingers?: boolean;
  showNotes?: boolean;
}

const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'];
const FRET_COUNT = 5;

export function ChordDiagram({ chord, size = 200, showFingers = true, showNotes = false }: ChordDiagramProps) {
  if (!chord) return null;

  const fretStart = chord.barre ? Math.max(1, chord.barre - 1) : 1;
  const maxFret = Math.max(...chord.positions.filter(f => f > 0), fretStart + 3);
  const displayFrets = Math.min(5, maxFret - fretStart + 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent)' }}>{chord.name}</div>
      <svg 
        width={size} 
        height={size * 0.7}
        viewBox={`0 0 ${size} ${size * 0.7}`}
        style={{ background: 'var(--bg-1)', borderRadius: '10px', border: '1px solid var(--border)' }}
      >
        
        {/* Strings */}
        {STRING_NAMES.map((_, i) => {
          const x = (size * 0.15) + (i * size * 0.7 / 5);
          return (
            <line
              key={i}
              x1={x}
              y1={size * 0.1}
              x2={x}
              y2={size * 0.6}
              stroke="#6f7a93"
              strokeWidth={i < 2 ? 1.5 : i < 4 ? 2 : 2.5}
            />
          );
        })}
        
        {/* Frets */}
        {Array.from({ length: displayFrets + 1 }, (_, f) => {
          const y = size * 0.1 + (f * size * 0.5 / displayFrets);
          const isNut = f === 0 && fretStart === 1;
          const isBarre = chord.barre && fretStart + f === chord.barre;
          
          if (isBarre) {
            // Barre chord indicator
            return (
              <rect
                key={`barre-${f}`}
                x={size * 0.1}
                y={y - size * 0.5 / displayFrets / 2}
                width={size * 0.7}
                height={size * 0.5 / displayFrets}
                fill="var(--accent)"
                opacity={0.22}
                rx={2}
              />
            );
          }
          
          return (
            <line
              key={`fret-${f}`}
              x1={size * 0.1}
              y1={y}
              x2={size * 0.85}
              y2={y}
              stroke={isNut ? 'var(--accent)' : '#4f5a75'}
              strokeWidth={isNut ? 4 : 1.5}
            />
          );
        })}
        
        {/* Finger positions (muted strings first so they always render) */}
        {chord.positions.map((fret, stringIdx) => {
          const x = (size * 0.15) + (stringIdx * size * 0.7 / 5);

          if (fret === -1) {
            return (
              <g key={`mute-${stringIdx}`}>
                <line
                  x1={x - 8}
                  y1={size * 0.1 - 8}
                  x2={x + 8}
                  y2={size * 0.1 + 8}
                  stroke="#ef4444"
                  strokeWidth={3}
                />
                <line
                  x1={x + 8}
                  y1={size * 0.1 - 8}
                  x2={x - 8}
                  y2={size * 0.1 + 8}
                  stroke="#ef4444"
                  strokeWidth={3}
                />
              </g>
            );
          }

          if (fret < fretStart || fret > fretStart + displayFrets - 1) return null;
          
          const fretRelative = fret - fretStart + 0.5;
          const y = size * 0.1 + (fretRelative * size * 0.5 / displayFrets);
          
          const finger = chord.fingers[stringIdx];
          
          return (
            <g key={`dot-${stringIdx}`}>
              <circle
                cx={x}
                cy={y}
                r={size * 0.035}
                fill="#22c55e"
                stroke="#86efac"
                strokeWidth={2}
              />
              {showFingers && finger > 0 && (
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={size * 0.03}
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {finger}
                </text>
              )}
              {showNotes && !showFingers && (
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#aaa"
                  fontSize={size * 0.025}
                  pointerEvents="none"
                >
                  {getNoteAtFret(stringIdx, fret)}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Open string indicators */}
        {chord.positions.map((fret, stringIdx) => {
          if (fret !== 0) return null;
          
          const x = (size * 0.15) + (stringIdx * size * 0.7 / 5);
          return (
            <circle
              key={`open-${stringIdx}`}
              cx={x}
              cy={size * 0.05}
              r={size * 0.03}
              fill="none"
              stroke="#22c55e"
              strokeWidth={2}
            />
          );
        })}
        
        {/* String labels */}
        {STRING_NAMES.map((name, i) => {
          const x = (size * 0.15) + (i * size * 0.7 / 5);
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={size * 0.68}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#98a1b5"
              fontSize={size * 0.025}
              fontWeight="500"
              pointerEvents="none"
            >
              {name}
            </text>
          );
        })}
        
        {/* Fret numbers */}
        {fretStart > 1 && (
          <text
            x={size * 0.05}
            y={size * 0.1 + size * 0.5 / displayFrets / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#98a1b5"
            fontSize={size * 0.025}
            pointerEvents="none"
          >
            {fretStart}fr
          </text>
        )}
      </svg>
    </div>
  );
}

function getNoteAtFret(stringIdx: number, fret: number): string {
  const openNotes = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
  const noteMap: Record<string, string[]> = {
    'E2': ['E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3'],
    'A2': ['A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3'],
    'D3': ['D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4', 'D4'],
    'G3': ['G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4'],
    'B3': ['B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4'],
    'E4': ['E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'C#5', 'D5', 'D#5', 'E5'],
  };
  
  const openNote = openNotes[stringIdx];
  const notes = noteMap[openNote];
  return notes?.[fret] || openNote;
}

export default ChordDiagram;