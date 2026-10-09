'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from './hooks/useAppStore';
import { GuitarCanvas } from './components/Guitar3D';
import { ChordSelector } from './components/ChordSelector';
import { ChordDisplay } from './components/ChordDisplay';
import { ChordDiagram } from './components/ChordDiagram';
import { StrummingPatternDisplay } from './components/StrummingPattern';
import { Timeline } from './components/Timeline';
import { SongAnalyzer } from './components/SongAnalyzer';
import { PlaybackControls } from './components/PlaybackControls';
import { Chord, SongAnalysis } from './types';
import { audioEngine } from './utils/audio';

function LearnTab() {
  const { selectedChord, setSelectedChord, showChordSelector, setShowChordSelector, handedness } = useAppStore();
  const [highlightedString, setHighlightedString] = useState<number | undefined>();

  const handleChordSelect = useCallback((chord: Chord) => {
    setSelectedChord(chord);
    setShowChordSelector(false);
  }, [setSelectedChord, setShowChordSelector]);

  const selector = (
    <ChordSelector
      onSelect={handleChordSelect}
      onClose={() => setShowChordSelector(false)}
      selectedChord={selectedChord}
    />
  );

  return (
    <div className="learn-grid">
      <div className="col">
        <div className="stage">
          <GuitarCanvas
            chord={selectedChord}
            highlightedString={highlightedString}
            handedness={handedness}
          />
          <div className="stage-overlay">
            <button
              onClick={() => setShowChordSelector(true)}
              className="control-btn primary"
            >
              🎸 Select Chord
            </button>
            {selectedChord && (
              <button
                onClick={() => audioEngine.playChord(selectedChord)}
                className="control-btn secondary"
              >
                🔊 Play Chord
              </button>
            )}
          </div>
        </div>

        {selectedChord && (
          <div className="panel" style={{ marginTop: 0, marginBottom: 0 }}>
            <div className="panel-title">Chord Details</div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div className="chord-diagram" style={{ marginTop: 0 }}>
                <ChordDiagram chord={selectedChord} size={200} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                <div><strong>Notes:</strong> {selectedChord.notes.join(', ')}</div>
                <div><strong>Fingering:</strong> {selectedChord.fingers.map((f, i) =>
                  f > 0 ? `${i + 1}:${f}` : ''
                ).filter(Boolean).join(', ')}</div>
                {selectedChord.barre && <div><strong>Barre at fret:</strong> {selectedChord.barre}</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="col-scroll">
        <div className="panel" style={{ flex: 1, minHeight: 0, marginTop: 0 }}>
          <div className="panel-title">Chord Lookup</div>
          {selector}
        </div>
      </div>

      {showChordSelector && (
        <div
          className="modal-backdrop"
          onClick={() => setShowChordSelector(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {selector}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyzeTab() {
  const { analysis, setAnalysis, setDuration } = useAppStore();

  const handleAnalysisComplete = useCallback((newAnalysis: SongAnalysis) => {
    setAnalysis(newAnalysis);
    setDuration(newAnalysis.duration);
  }, [setAnalysis, setDuration]);

  return (
    <div className="analyze-wrap">
      <SongAnalyzer onAnalysisComplete={handleAnalysisComplete} />

      {analysis && (
        <div className="panel">
          <div className="panel-title">Analysis Results</div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Tempo</div>
              <div className="stat-value">{analysis.tempo} BPM</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Time Signature</div>
              <div className="stat-value">{analysis.timeSignature}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Duration</div>
              <div className="stat-value">
                {Math.floor(analysis.duration / 60)}:{String(Math.floor(analysis.duration % 60)).padStart(2, '0')}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Chords Found</div>
              <div className="stat-value">{analysis.chords.length}</div>
            </div>
          </div>

          <div className="panel-title" style={{ marginTop: '20px' }}>Detected Chords</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {analysis.chords.map((c, i) => (
              <span key={i} className="chip">{c.chord.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayTab() {
  const {
    analysis,
    currentTime,
    isPlaying,
    currentTimedChord,
    currentStrumIndex,
    handedness,
  } = useAppStore();

  const currentChordIndex = analysis?.chords.findIndex(
    c => currentTime >= c.startTime && currentTime < c.endTime
  ) ?? -1;

  const upcomingChords = analysis?.chords.slice(currentChordIndex + 1, currentChordIndex + 4) || [];

  if (!analysis) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎸</div>
        <h2>No song analyzed yet</h2>
        <p>Go to the Analyze tab to upload and analyze a song first</p>
        <p className="muted-text" style={{ marginBottom: 0 }}>
          Once analyzed, you can play along with the chord timeline and strumming pattern here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 120px)' }}>
      <div className="play-grid">
        <div className="col">
          <div className="stage">
            <GuitarCanvas chord={currentTimedChord?.chord || null} handedness={handedness} />
          </div>

          <ChordDisplay
            currentChord={currentTimedChord || null}
            upcomingChords={upcomingChords}
          />
        </div>

        <div className="col-scroll">
          <StrummingPatternDisplay
            pattern={analysis.strummingPattern}
            currentIndex={currentStrumIndex}
            isPlaying={isPlaying}
          />

          <PlaybackControls />
          <Timeline
            chords={analysis.chords}
            duration={analysis.duration}
            onSeek={(time) => {}}
          />
        </div>
      </div>

    </div>
  );
}

export default function App() {
  const { activeTab, setActiveTab, handedness, setHandedness, synthMode, setSynthMode } = useAppStore();

  useEffect(() => {
    audioEngine.setMode(synthMode);
  }, [synthMode]);

  useEffect(() => {
    audioEngine.initialize();
    return () => audioEngine.dispose();
  }, []);

  const tabs = [
    { id: 'learn', label: '🎸 Learn Chords' },
    { id: 'analyze', label: '📊 Analyze Song' },
    { id: 'play', label: '▶️ Play Along' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-mark">🎸</span>
            <h1>Guitar Song Teacher</h1>
          </div>

          <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '999px', padding: '5px', marginRight: '12px' }}>
              <button
                onClick={() => setHandedness('left')}
                className={`tab-btn ${handedness === 'left' ? 'active' : ''}`}
                style={{ padding: '7px 14px', fontSize: '13px' }}
              >
                Left-handed
              </button>
              <button
                onClick={() => setHandedness('right')}
                className={`tab-btn ${handedness === 'right' ? 'active' : ''}`}
                style={{ padding: '7px 14px', fontSize: '13px' }}
              >
                Right-handed
              </button>
            </div>            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '999px', padding: '5px', marginRight: '12px' }}>
              <button
                onClick={() => setSynthMode('pluck')}
                className={`tab-btn ${synthMode === 'pluck' ? 'active' : ''}`}
                style={{ padding: '7px 10px', fontSize: '12px' }}
              >
                Pluck
              </button>
              <button
                onClick={() => setSynthMode('osc')}
                className={`tab-btn ${synthMode === 'osc' ? 'active' : ''}`}
                style={{ padding: '7px 10px', fontSize: '12px' }}
              >
                OSC
              </button>
              <button
                onClick={() => setSynthMode('sampler')}
                className={`tab-btn ${synthMode === 'sampler' ? 'active' : ''}`}
                style={{ padding: '7px 10px', fontSize: '12px' }}
              >
                Sampler
              </button>
            </div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, padding: '24px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {activeTab === 'learn' && <LearnTab />}
        {activeTab === 'analyze' && <AnalyzeTab />}
        {activeTab === 'play' && <PlayTab />}
      </main>
    </div>
  );
}
