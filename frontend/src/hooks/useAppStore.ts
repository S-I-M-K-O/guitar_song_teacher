import { create } from 'zustand';
import { Chord, SongAnalysis, TimedChord, StrummingPattern } from '../types';

interface AppState {
  // Chord lookup
  selectedChord: Chord | null;
  setSelectedChord: (chord: Chord | null) => void;
  
  // Song analysis
  analysis: SongAnalysis | null;
  setAnalysis: (analysis: SongAnalysis | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  analysisError: string | null;
  setAnalysisError: (error: string | null) => void;
  
  // Playback
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  
  // Current chord in timeline
  currentTimedChord: TimedChord | null;
  setCurrentTimedChord: (chord: TimedChord | null) => void;
  
  // Strumming pattern
  currentStrumIndex: number;
  setCurrentStrumIndex: (index: number) => void;
  
  // UI
  showChordSelector: boolean;
  setShowChordSelector: (show: boolean) => void;
  activeTab: 'learn' | 'analyze' | 'play';
  setActiveTab: (tab: 'learn' | 'analyze' | 'play') => void;
  handedness: 'right' | 'left';
  synthMode: 'pluck' | 'osc' | 'sampler';
  setSynthMode: (mode: 'pluck' | 'osc' | 'sampler') => void;
  setHandedness: (handed: 'right' | 'left') => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedChord: null,
  setSelectedChord: (chord) => set({ selectedChord: chord }),
  
  analysis: null,
  setAnalysis: (analysis) => set({ analysis }),
  isAnalyzing: false,
  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  analysisError: null,
  setAnalysisError: (error) => set({ analysisError: error }),
  
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  currentTime: 0,
  setCurrentTime: (time) => set({ currentTime: time }),
  duration: 0,
  setDuration: (duration) => set({ duration }),
  playbackRate: 1,
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  
  currentTimedChord: null,
  setCurrentTimedChord: (chord) => set({ currentTimedChord: chord }),
  
  currentStrumIndex: 0,
  setCurrentStrumIndex: (index) => set({ currentStrumIndex: index }),
  
  showChordSelector: false,
  setShowChordSelector: (show) => set({ showChordSelector: show }),
  
  activeTab: 'learn',
  setActiveTab: (tab) => set({ activeTab: tab }),
  handedness: 'right',
  setHandedness: (handed) => set({ handedness: handed }),
  synthMode: 'pluck',
  setSynthMode: (mode) => set({ synthMode: mode }),
}));