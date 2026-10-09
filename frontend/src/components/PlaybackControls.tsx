'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { audioEngine, OscParams, Patch } from '../utils/audio';

export function PlaybackControls() {
  const { 
    isPlaying, 
    setIsPlaying, 
    currentTime, 
    setCurrentTime, 
    duration, 
    playbackRate, 
    setPlaybackRate,
    analysis,
    setCurrentTimedChord,
    setCurrentStrumIndex,
    synthMode,
  } = useAppStore();
  const [oscParams, setOscParams] = useState<OscParams>(audioEngine.getOscParams());
  const [patches, setPatches] = useState<Patch[]>(audioEngine.getPatches());

  const handlePlayPause = async () => {
    if (isPlaying) {
      audioEngine.stopAll();
      setIsPlaying(false);
    } else {
      if (!analysis) return;
      await audioEngine.initialize();
      setIsPlaying(true);
      playFromCurrentTime();
    }
  };

  const playFromCurrentTime = async () => {
    if (!analysis) return;
    
    await audioEngine.initialize();
    
    // Find current chord based on currentTime
    const currentChord = analysis.chords.find(
      c => currentTime >= c.startTime && currentTime < c.endTime
    ) || analysis.chords[0];
    
    if (currentChord) {
      setCurrentTimedChord(currentChord);
      audioEngine.playChord(currentChord.chord);
      
      // Play strumming pattern
      if (analysis.strummingPattern) {
        playStrummingPattern(analysis.strummingPattern, currentChord);
      }
    }
  };

  const playStrummingPattern = (pattern: any, timedChord: any) => {
    const { pattern: hits } = pattern;
    const beatDuration = 60 / (analysis?.tempo || 120);
    
    hits.forEach((hit: any, index: number) => {
      const hitTime = currentTime + index * beatDuration * 0.5; // eighth notes
      if (hitTime >= timedChord.startTime && hitTime < timedChord.endTime) {
        setTimeout(() => {
          if (useAppStore.getState().isPlaying) {
            audioEngine.playStrumHit(hit.type, timedChord.chord);
            setCurrentStrumIndex(index);
          }
        }, (hitTime - currentTime) * 1000);
      }
    });
  };

  const handleStop = () => {
    audioEngine.stopAll();
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentTimedChord(null);
    setCurrentStrumIndex(0);
  };

  const handleRewind = () => {
    const newTime = Math.max(0, currentTime - 5);
    setCurrentTime(newTime);
    if (isPlaying) playFromCurrentTime();
  };

  const handleForward = () => {
    const newTime = Math.min(duration, currentTime + 5);
    setCurrentTime(newTime);
    if (isPlaying) playFromCurrentTime();
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  useEffect(() => {
    if (synthMode === 'osc') {
      setOscParams(audioEngine.getOscParams());
    }
  }, [synthMode]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="panel" style={{ textAlign: 'center' }}>
      <div className="panel-title">Playback Controls</div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
        <button 
          onClick={handleRewind}
          disabled={!analysis}
          className="control-btn secondary"
          aria-label="Rewind 5 seconds"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 19 2 12 11 5" />
            <polygon points="22 19 13 12 22 5" />
          </svg>
        </button>

        <button 
          onClick={handlePlayPause}
          disabled={!analysis}
          className={`control-btn play-btn ${isPlaying ? 'secondary' : 'primary'}`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21" />
            </svg>
          )}
        </button>

        <button 
          onClick={handleForward}
          disabled={!analysis}
          className="control-btn secondary"
          aria-label="Forward 5 seconds"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 19 22 12 13 5" />
            <polygon points="2 19 11 12 2 5" />
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
        <span className="time-label" style={{ minWidth: '50px', textAlign: 'right' }}>
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => {
            const time = parseFloat(e.target.value);
            setCurrentTime(time);
            if (isPlaying) playFromCurrentTime();
          }}
          style={{ flex: 1, maxWidth: '400px', accentColor: '#f2a541' }}
          disabled={!analysis}
        />
        <span className="time-label" style={{ minWidth: '50px' }}>
          {formatTime(duration)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span className="muted-text">Speed:</span>
        {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
          <button
            key={rate}
            onClick={() => handleRateChange(rate)}
            className={`control-btn btn-sm ${playbackRate === rate ? 'primary' : 'secondary'}`}
          >
            {rate}x
          </button>
        ))}
      </div>

      {synthMode === 'osc' && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div>
              <label className="muted-text" style={{ fontSize: '12px' }}>Patch</label>
              <select
                value={patches.findIndex((p) => JSON.stringify(p.params) === JSON.stringify(oscParams)) >= 0 ? patches.findIndex((p) => JSON.stringify(p.params) === JSON.stringify(oscParams)) : 0}
                onChange={(e) => {
                  const i = parseInt(e.target.value);
                  audioEngine.setPatch(patches[i]);
                  setOscParams(audioEngine.getOscParams());
                  setPatches(audioEngine.getPatches());
                }}
                style={{ padding: '6px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', marginLeft: '6px' }}
              >
                {patches.map((p, i) => (
                  <option key={i} value={i}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="muted-text" style={{ fontSize: '12px' }}>Wave</label>
              <select
                value={oscParams.type}
                onChange={(e) => {
                  const v = e.target.value as OscParams['type'];
                  audioEngine.setOscParams({ type: v });
                  setOscParams(audioEngine.getOscParams());
                }}
                style={{ padding: '6px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', marginLeft: '6px' }}
              >
                <option value="sine">sine</option>
                <option value="square">square</option>
                <option value="triangle">triangle</option>
                <option value="sawtooth">sawtooth</option>
              </select>
            </div>
            <div>
              <label className="muted-text" style={{ fontSize: '12px' }}>Poly {oscParams.polyphony}</label>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={oscParams.polyphony}
                onChange={(e) => {
                  audioEngine.setOscParams({ polyphony: parseInt(e.target.value) });
                  setOscParams(audioEngine.getOscParams());
                }}
                style={{ marginLeft: '6px', accentColor: '#f2a541' }}
              />
            </div>
            <div>
              <label className="muted-text" style={{ fontSize: '12px' }}>Filter {Math.round(oscParams.filterFreq)}</label>
              <input
                type="range"
                min={400}
                max={8000}
                step={100}
                value={oscParams.filterFreq}
                onChange={(e) => {
                  audioEngine.setOscParams({ filterFreq: parseInt(e.target.value) });
                  setOscParams(audioEngine.getOscParams());
                }}
                style={{ marginLeft: '6px', accentColor: '#f2a541' }}
              />
            </div>
            <div>
              <label className="muted-text" style={{ fontSize: '12px' }}>Res {oscParams.resonance.toFixed(2)}</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={oscParams.resonance}
                onChange={(e) => {
                  audioEngine.setOscParams({ resonance: parseFloat(e.target.value) });
                  setOscParams(audioEngine.getOscParams());
                }}
                style={{ marginLeft: '6px', accentColor: '#f2a541' }}
              />
            </div>
            <div>
              <label className="muted-text" style={{ fontSize: '12px' }}>Gain {oscParams.gain.toFixed(2)}</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={oscParams.gain}
                onChange={(e) => {
                  audioEngine.setOscParams({ gain: parseFloat(e.target.value) });
                  setOscParams(audioEngine.getOscParams());
                }}
                style={{ marginLeft: '6px', accentColor: '#f2a541' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
            <div>
              <label className="muted-text" style={{ fontSize: '12px' }}>A {oscParams.attack.toFixed(2)}</label>
              <input
                type="range"
                min={0.001}
                max={2}
                step={0.01}
                value={oscParams.attack}
                onChange={(e) => {
                  audioEngine.setOscParams({ attack: parseFloat(e.target.value) });
                  setOscParams(audioEngine.getOscParams());
                }}
                style={{ marginLeft: '6px', accentColor: '#f2a541' }}
              />
            </div>
            <div>
              <label className="muted-text" style={{ fontSize: '12px' }}>D {oscParams.decay.toFixed(2)}</label>
              <input
                type="range"
                min={0.001}
                max={2}
                step={0.01}
                value={oscParams.decay}
                onChange={(e) => {
                  audioEngine.setOscParams({ decay: parseFloat(e.target.value) });
                  setOscParams(audioEngine.getOscParams());
                }}
                style={{ marginLeft: '6px', accentColor: '#f2a541' }}
              />
            </div>
            <div>
              <label className="muted-text" style={{ fontSize: '12px' }}>S {oscParams.sustain.toFixed(2)}</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={oscParams.sustain}
                onChange={(e) => {
                  audioEngine.setOscParams({ sustain: parseFloat(e.target.value) });
                  setOscParams(audioEngine.getOscParams());
                }}
                style={{ marginLeft: '6px', accentColor: '#f2a541' }}
              />
            </div>
            <div>
              <label className="muted-text" style={{ fontSize: '12px' }}>R {oscParams.release.toFixed(2)}</label>
              <input
                type="range"
                min={0.001}
                max={3}
                step={0.01}
                value={oscParams.release}
                onChange={(e) => {
                  audioEngine.setOscParams({ release: parseFloat(e.target.value) });
                  setOscParams(audioEngine.getOscParams());
                }}
                style={{ marginLeft: '6px', accentColor: '#f2a541' }}
              />
            </div>
          </div>
        </div>
      )}
      {analysis && (
        <div className="info-row" style={{ marginTop: '16px' }}>
          <span>Tempo: {analysis.tempo} BPM</span>
          <span>Time: {analysis.timeSignature}</span>
          <span>Chords: {analysis.chords.length}</span>
        </div>
      )}
    </div>
  );
}

export default PlaybackControls;