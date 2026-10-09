'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { TimedChord } from '../types';
import { useAppStore } from '../hooks/useAppStore';

interface TimelineProps {
  chords: TimedChord[];
  duration: number;
  onSeek: (time: number) => void;
}

export function Timeline({ chords, duration, onSeek }: TimelineProps) {
  const { currentTime, isPlaying, setCurrentTime } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);

  const progress = duration > 0 ? (isDragging ? dragPosition : currentTime) / duration : 0;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleSeek(e.clientX);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleSeek(e.touches[0].clientX);
  }, []);

  const handleSeek = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = x * duration;
    
    setDragPosition(time);
    setCurrentTime(time);
    onSeek(time);
  }, [duration, setCurrentTime, onSeek]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      handleSeek(clientX);
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, handleSeek]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timeline-container" ref={containerRef} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}>
      <div className="timeline-track">
        <div 
          className="timeline-progress" 
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="timeline-markers">
        {chords.map((chord, index) => {
          const left = duration > 0 ? (chord.startTime / duration) * 100 : 0;
          return (
            <div
              key={index}
              className="timeline-marker"
              style={{ left: `${left}%` }}
              title={`${chord.chord.name} at ${formatTime(chord.startTime)}`}
            />
          );
        })}
      </div>

      <div
        className="timeline-handle"
        ref={handleRef}
        style={{ left: `${progress * 100}%` }}
        aria-label="Playback position"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const newTime = Math.max(0, currentTime - 1);
            setCurrentTime(newTime);
            onSeek(newTime);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const newTime = Math.min(duration, currentTime + 1);
            setCurrentTime(newTime);
            onSeek(newTime);
          }
        }}
      />
      
      <div
        className="timeline-label"
        style={{ left: `${progress * 100}%` }}
      >
        {formatTime(isDragging ? dragPosition : currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
}

export default Timeline;