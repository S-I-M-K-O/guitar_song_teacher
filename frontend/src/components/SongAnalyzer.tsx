'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { SongAnalysis, AnalysisResult } from '../types';

interface SongAnalyzerProps {
  onAnalysisComplete: (analysis: SongAnalysis) => void;
}

export function SongAnalyzer({ onAnalysisComplete }: SongAnalyzerProps) {
  const { isAnalyzing, setIsAnalyzing, analysisError, setAnalysisError, setAnalysis } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && isAudioFile(file)) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isAudioFile(file)) {
      setSelectedFile(file);
    }
  }, []);

  const isAudioFile = (file: File): boolean => {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/flac', 'audio/m4a', 'audio/aac'];
    return validTypes.includes(file.type) || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name);
  };

  const analyzeSong = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisProgress(0);

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const result: AnalysisResult = await response.json();

      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        onAnalysisComplete(result.analysis);
      } else {
        setAnalysisError(result.error || 'Analysis failed');
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };
  const analyzeYoutube = async () => {
    if (!youtubeUrl) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const formData = new FormData();
      formData.append('url', youtubeUrl);
      const response = await fetch('/api/analyze/youtube', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json() as AnalysisResult;
      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        onAnalysisComplete(result.analysis);
      } else {
        setAnalysisError(result.error || 'Analysis failed');
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };



  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">Analyze Song</div>
      
      {!selectedFile ? (
        <div
          className={`upload-area ${dragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            id="audio-upload"
          />
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Drop audio file here or click to browse
          </p>
          <p className="muted-text">
            Supports: MP3, WAV, OGG, FLAC, M4A, AAC
          </p>
        </div>
      ) : (
        <div className="file-card">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M2 12h20" />
            <path d="M10 4v8" />
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedFile.name}
            </p>
            <p className="muted-text">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button onClick={removeFile} style={{ color: '#888', background: 'none', border: 'none', padding: '8px', fontSize: '20px', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {selectedFile && (
        <button
          onClick={analyzeSong}
          disabled={isAnalyzing}
          className="control-btn primary btn-block"
          style={{ marginTop: '16px' }}
        >
          {isAnalyzing ? (
            <>
              <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>⏳</span>
              Analyzing... {analysisProgress > 0 ? `${analysisProgress}%` : ''}
            </>
          ) : (
            'Analyze Chords'
          )}
        </button>
      )}

      <div className="card" style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
            <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
          </svg>
          <span style={{ fontWeight: '600' }}>Or analyze from YouTube URL</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{ flex: 1, padding: '10px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '13px' }}
          />
          <button
            onClick={analyzeYoutube}
            disabled={isAnalyzing || !youtubeUrl}
            className="control-btn primary"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>
      {analysisError && (
        <div className="alert-error">
          Error: {analysisError}
        </div>
      )}
    </div>
  );
}

export default SongAnalyzer;