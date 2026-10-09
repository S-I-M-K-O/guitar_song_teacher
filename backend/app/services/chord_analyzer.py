import librosa
import numpy as np
from typing import List, Dict, Any, Optional
import logging
from dataclasses import dataclass
import json

from app.utils.chord_data import CHORD_LIBRARY

logger = logging.getLogger(__name__)

# Absolute pitch classes (0 = C)
CHORD_TEMPLATES = {
    'A': [9, 1, 4], 'Am': [9, 0, 4], 'A7': [9, 1, 4, 7], 'Amaj7': [9, 1, 4, 8],
    'B': [11, 3, 6], 'Bm': [11, 2, 6], 'B7': [11, 3, 6, 9], 'Bmaj7': [11, 3, 6, 10],
    'C': [0, 4, 7], 'Cm': [0, 3, 7], 'C7': [0, 4, 7, 10], 'Cmaj7': [0, 4, 7, 11],
    'D': [2, 6, 9], 'Dm': [2, 5, 9], 'D7': [2, 6, 9, 0], 'Dmaj7': [2, 6, 9, 1],
    'E': [4, 8, 11], 'Em': [4, 7, 11], 'E7': [4, 8, 11, 2], 'Emaj7': [4, 8, 11, 3],
    'F': [5, 9, 0], 'Fm': [5, 8, 0], 'F7': [5, 9, 0, 3], 'Fmaj7': [5, 9, 0, 4],
    'G': [7, 11, 2], 'Gm': [7, 10, 2], 'G7': [7, 11, 2, 5], 'Gmaj7': [7, 11, 2, 6],
    'Asus4': [9, 2, 4], 'Asus2': [9, 11, 4],
    'Dsus4': [2, 7, 9], 'Dsus2': [2, 4, 9],
    'Esus4': [4, 9, 11], 'Esus2': [4, 6, 11],
    'Gsus4': [7, 0, 2], 'Gsus2': [7, 9, 2],
}

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

@dataclass
class TimedChord:
    chord: str
    start_time: float
    end_time: float
    confidence: float

@dataclass
class StrummingPattern:
    pattern: List[Dict[str, Any]]
    beats_per_measure: int
    subdivision: str

class ChordAnalyzer:
    def __init__(self):
        self.sample_rate = 22050
        self.hop_length = 512
        self.n_fft = 2048
        
    async def analyze(self, audio_path: str) -> Dict[str, Any]:
        try:
            y, sr = librosa.load(audio_path, sr=self.sample_rate)
            
            tempo, beats = self._detect_tempo_and_beats(y, sr)
            chroma = self._extract_chroma(y, sr)
            chords = self._detect_chords(chroma, beats, sr)
            strumming = self._detect_strumming_pattern(y, sr, beats, tempo)
            
            duration = librosa.get_duration(y=y, sr=sr)
            
            timed_chords = self._create_timed_chords(chords, beats, duration)
            
            return {
                "success": True,
                "analysis": {
                    "chords": timed_chords,
                    "tempo": round(tempo),
                    "timeSignature": "4/4",
                    "duration": duration,
                    "strummingPattern": strumming
                }
            }
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _detect_tempo_and_beats(self, y: np.ndarray, sr: int) -> tuple:
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=self.hop_length)
        beat_times = librosa.frames_to_time(beats, sr=sr, hop_length=self.hop_length)
        return float(tempo), beat_times

    def _extract_chroma(self, y: np.ndarray, sr: int) -> np.ndarray:
        chroma = librosa.feature.chroma_cqt(
            y=y, 
            sr=sr, 
            hop_length=self.hop_length,
            n_chroma=12
        )
        return chroma

    def _detect_chords(self, chroma: np.ndarray, beats: np.ndarray, sr: int) -> List[Dict]:
        chords = []
        frame_times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr, hop_length=self.hop_length)
        
        for i in range(len(beats) - 1):
            start_frame = np.searchsorted(frame_times, beats[i])
            end_frame = np.searchsorted(frame_times, beats[i + 1])
            
            if end_frame <= start_frame:
                end_frame = start_frame + 1
            
            segment_chroma = chroma[:, start_frame:end_frame]
            if segment_chroma.size == 0:
                continue
                
            mean_chroma = np.mean(segment_chroma, axis=1)
            chord_name, confidence = self._match_chord_template(mean_chroma)
            
            chords.append({
                'chord': chord_name,
                'start_frame': start_frame,
                'end_frame': end_frame,
                'confidence': confidence,
                'start_time': beats[i],
                'end_time': beats[i + 1]
            })
        
        return self._merge_consecutive_chords(chords)

    def _match_chord_template(self, chroma: np.ndarray) -> tuple:
        best_chord = 'N.C.'
        best_score = 0.0
        
        for chord_name, template in CHORD_TEMPLATES.items():
            template_vec = np.zeros(12)
            for note in template:
                template_vec[note] = 1
            
            score = np.dot(chroma, template_vec) / (np.linalg.norm(chroma) * np.linalg.norm(template_vec) + 1e-10)
            
            if score > best_score:
                best_score = score
                best_chord = chord_name
        
        return best_chord, float(best_score)

    def _merge_consecutive_chords(self, chords: List[Dict]) -> List[Dict]:
        if not chords:
            return []
        
        merged = [chords[0]]
        for chord in chords[1:]:
            if chord['chord'] == merged[-1]['chord']:
                merged[-1]['end_time'] = chord['end_time']
                merged[-1]['end_frame'] = chord['end_frame']
                merged[-1]['confidence'] = max(merged[-1]['confidence'], chord['confidence'])
            else:
                merged.append(chord)
        
        return merged

    def _create_timed_chords(self, chords: List[Dict], beats: np.ndarray, duration: float) -> List[Dict]:
        timed_chords = []
        
        for i, chord in enumerate(chords):
            chord_data = self._get_chord_details(chord['chord'])
            timed_chords.append({
                "chord": chord_data,
                "startTime": round(chord['start_time'], 2),
                "endTime": round(chord['end_time'], 2),
                "measure": i // 4 + 1,
                "beat": (i % 4) + 1
            })
        
        return timed_chords

    def _get_chord_details(self, chord_name: str) -> Dict:
        chord_map = {c["name"]: c for c in CHORD_LIBRARY}
        return chord_map.get(chord_name, {'name': 'N.C.', 'notes': [], 'positions': [-1]*6, 'fingers': [0]*6})

    def _detect_strumming_pattern(self, y: np.ndarray, sr: int, beats: np.ndarray, tempo: float) -> Dict:
        beat_duration = 60.0 / tempo if tempo else 0.5
        
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=self.hop_length)
        onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=self.hop_length)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=self.hop_length)
        
        pattern = []
        subdivision = 'eighth'
        beats_per_measure = 4
        
        for i in range(min(len(beats) - 1, 16)):
            beat_start = beats[i]
            beat_end = beats[i + 1]
            
            beat_onsets = onset_times[(onset_times >= beat_start) & (onset_times < beat_end)]
            
            if len(beat_onsets) >= 2:
                pattern.append({"type": "down", "timing": 0.0, "accent": i % 4 == 0})
                pattern.append({"type": "up", "timing": 0.5, "accent": False})
            elif len(beat_onsets) == 1:
                rel_time = (beat_onsets[0] - beat_start) / beat_duration
                if rel_time < 0.3:
                    pattern.append({"type": "down", "timing": 0.0, "accent": i % 4 == 0})
                else:
                    pattern.append({"type": "up", "timing": 0.5, "accent": False})
            else:
                pattern.append({"type": "rest", "timing": 0.0, "accent": False})
        
        return {
            "pattern": pattern[:16],
            "beatsPerMeasure": beats_per_measure,
            "subdivision": subdivision
        }