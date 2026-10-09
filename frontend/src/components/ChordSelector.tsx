'use client';

import React, { useState, useMemo } from 'react';
import { CHORD_LIBRARY, CHORD_CATEGORIES } from '../utils/chords';
import { Chord } from '../types';
import { useAppStore } from '../hooks/useAppStore';
import { audioEngine } from '../utils/audio';

interface ChordSelectorProps {
  onSelect: (chord: Chord) => void;
  onClose: () => void;
  selectedChord?: Chord | null;
}

export function ChordSelector({ onSelect, onClose, selectedChord }: ChordSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const { setSelectedChord } = useAppStore();

  const categories = useMemo(() => ['All', ...Object.keys(CHORD_CATEGORIES)], []);
  
  const filteredChords = useMemo(() => {
    let chords = activeCategory === 'All' 
      ? CHORD_LIBRARY 
      : CHORD_CATEGORIES[activeCategory as keyof typeof CHORD_CATEGORIES] || [];
    
    if (searchTerm) {
      chords = chords.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return chords;
  }, [activeCategory, searchTerm]);

  const handleChordClick = async (chord: Chord) => {
    onSelect(chord);
    setSelectedChord(chord);
    await audioEngine.initialize();
    audioEngine.playChord(chord);
    onClose();
  };

  return (
    <div className="panel" style={{ maxHeight: '60vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">Select Chord</div>
      
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="text"
          className="search-input"
          placeholder="Search chords..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`control-btn btn-sm ${activeCategory === cat ? 'primary' : 'secondary'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="chord-selector" style={{ flex: 1, overflow: 'auto' }}>
        {filteredChords.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888', padding: '24px' }}>
            No chords found
          </div>
        ) : (
          filteredChords.map((chord) => (
            <button
              key={chord.name}
              onClick={() => handleChordClick(chord)}
              className={`chord-btn ${selectedChord?.name === chord.name ? 'selected' : ''}`}
              style={{ 
                fontSize: '14px',
                fontWeight: '700',
              }}
            >
              {chord.name}
            </button>
          ))
        )}
      </div>

      <button 
        onClick={onClose}
        className="control-btn secondary btn-block"
        style={{ marginTop: '16px' }}
      >
        Close
      </button>
    </div>
  );
}

export default ChordSelector;