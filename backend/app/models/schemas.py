from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ChordPosition(BaseModel):
    string: int
    fret: int
    finger: int
    note: str


class Chord(BaseModel):
    name: str
    notes: List[str]
    positions: List[int]
    fingers: List[int]
    barre: Optional[int] = None


class TimedChord(BaseModel):
    chord: Chord
    startTime: float
    endTime: float
    measure: int
    beat: int


class StrumHit(BaseModel):
    type: str
    timing: float
    accent: Optional[bool] = False


class StrummingPattern(BaseModel):
    pattern: List[StrumHit]
    beatsPerMeasure: int
    subdivision: str


class SongAnalysis(BaseModel):
    chords: List[TimedChord]
    tempo: int
    timeSignature: str
    duration: float
    strummingPattern: StrummingPattern


class AnalysisResponse(BaseModel):
    success: bool
    analysis: Optional[SongAnalysis] = None
    error: Optional[str] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None