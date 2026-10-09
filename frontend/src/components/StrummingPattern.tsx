'use client';

import React from 'react';
import { StrummingPattern, StrumHit } from '../types';

interface StrummingPatternProps {
  pattern: StrummingPattern | null;
  currentIndex: number;
  isPlaying: boolean;
  onPatternChange?: (pattern: StrummingPattern) => void;
}

const HIT_LABELS: Record<StrumHit['type'], string> = {
  down: '↓',
  up: '↑',
  mute: '✕',
  rest: '·',
};

const HIT_CLASSES: Record<StrumHit['type'], string> = {
  down: 'down',
  up: 'up',
  mute: 'mute',
  rest: '',
};

export function StrummingPatternDisplay({ pattern, currentIndex, isPlaying, onPatternChange }: StrummingPatternProps) {
  if (!pattern) return null;

  const { pattern: hits, beatsPerMeasure, subdivision } = pattern;

  return (
    <div className="panel">
      <div className="panel-title">
        Strumming Pattern
        <span className="panel-meta">
          {subdivision} notes • {beatsPerMeasure}/4 time
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="strumming-pattern" role="list" aria-label="Strumming pattern">
          {hits.map((hit, index) => (
            <div
              key={index}
              className={`strum-hit ${HIT_CLASSES[hit.type]} ${isPlaying && index === currentIndex ? 'active' : ''}`}
              role="listitem"
              aria-current={isPlaying && index === currentIndex ? 'true' : 'false'}
              style={{
                width: '36px',
                height: '36px',
                fontSize: '16px',
              }}
            >
              {HIT_LABELS[hit.type]}
              {hit.accent && <span style={{ fontSize: '10px', position: 'absolute', top: '-4px', right: '-4px' }}>›</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <PatternPresetButton 
            label="Down-Down-Up-Up-Down-Up" 
            pattern={createPresetPattern('DDUUDU')}
            onSelect={onPatternChange}
          />
          <PatternPresetButton 
            label="Down-Down-Up-Down-Up" 
            pattern={createPresetPattern('DDUDU')}
            onSelect={onPatternChange}
          />
          <PatternPresetButton 
            label="Down-Up-Down-Up" 
            pattern={createPresetPattern('DUDU')}
            onSelect={onPatternChange}
          />
          <PatternPresetButton 
            label="Down-Down-Down-Down" 
            pattern={createPresetPattern('DDDD')}
            onSelect={onPatternChange}
          />
        </div>

        <div className="legend">
          Legend: ↓ Downstroke &nbsp; ↑ Upstroke &nbsp; ✕ Muted &nbsp; · Rest
        </div>
      </div>
    </div>
  );
}

function createPresetPattern(notation: string): StrummingPattern {
  const hits: StrumHit[] = [];
  const chars = notation.split('');
  
  chars.forEach((char, i) => {
    let type: StrumHit['type'] = 'rest';
    switch (char) {
      case 'D': type = 'down'; break;
      case 'U': type = 'up'; break;
      case 'X': type = 'mute'; break;
      case '.': type = 'rest'; break;
    }
    hits.push({
      type,
      timing: i / chars.length,
      accent: i === 0 || i === chars.length / 2,
    });
  });

  return {
    pattern: hits,
    beatsPerMeasure: 4,
    subdivision: 'eighth',
  };
}

interface PatternPresetButtonProps {
  label: string;
  pattern: StrummingPattern;
  onSelect?: (pattern: StrummingPattern) => void;
}

function PatternPresetButton({ label, pattern, onSelect }: PatternPresetButtonProps) {
  return (
    <button
      onClick={() => onSelect?.(pattern)}
      className="control-btn secondary btn-sm"
    >
      {label}
    </button>
  );
}

export default StrummingPatternDisplay;