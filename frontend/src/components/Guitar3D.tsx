'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Chord, ChordPosition } from '../types';

interface Guitar3DProps {
  chord: Chord | null;
  highlightedString?: number;
  className?: string;
  handedness?: 'right' | 'left';
}

// ============================================================
// COORDINATE SYSTEM (1 unit = 1 inch), guitar lying face-up:
//   y = 0 is the top (soundboard); body extends down to y = -4.3
//   z = 0 at the nut, +z toward the body bottom (bridge at 25.5)
//   headstock extends to z = -6.3, neck joint at z = 14.15
//   string 0 (high E) at -x ... string 5 (low E) at +x so that the
//   top-down camera (screen right = +x, screen up = -z) matches the
//   2D ChordDiagram, which draws string 0 leftmost.
// ============================================================

const SCALE_LENGTH = 25.5;
const FRET_COUNT = 20;
const STRING_COUNT = 6;
const JOINT_Z = 14.15;
const BOARD_END_Z = 17.9;
const SOUNDHOLE_Z = 20.7;
const SOUNDHOLE_R = 2.0;
const SADDLE_Z = 25.5;
const PIN_Z = 26.05;
const NUT_GAP = 0.28;
const BRIDGE_GAP = 0.41;
const POST_X = 1.0;
const POST_ZS = [-1.3, -3.0, -4.7];

const STRING_NOTES = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
const STRING_RADII = [0.02, 0.026, 0.033, 0.042, 0.052, 0.064];
const STRING_COLORS = ['#dcdce4', '#d2d2da', '#cba265', '#c49757', '#bd8d4b', '#b58540'];
const MARKER_FRETS = [3, 5, 7, 9, 12, 15, 17, 19];

const fretPos = (n: number) => SCALE_LENGTH * (1 - Math.pow(2, -n / 12));
const midFret = (fret: number) => (fretPos(fret - 1) + fretPos(fret)) / 2;
const boardHalfW = (z: number) => 0.875 + (1.3 - 0.875) * (z / BOARD_END_Z);
const bindingHalfW = (z: number) => boardHalfW(z) + 0.08;
const stringGapAt = (z: number) => NUT_GAP + (BRIDGE_GAP - NUT_GAP) * (z / SCALE_LENGTH);
const stringX = (i: number, z: number, handedness: 'right' | 'left' = 'right') => {
  let order = i;
  if (handedness === 'left') {
    order = STRING_COUNT - 1 - i;
  }
  return (order - (STRING_COUNT - 1) / 2) * stringGapAt(z);
};
const postSide = (i: number, h: 'right' | 'left' = 'right'): number => {
  const base = i < 3 ? -1 : 1;
  return h === 'left' ? -base : base;
};


// Which side of the headstock the tuning post for string i sits on.
// Mirrors with handedness so each string runs straight to its own post (no crossings).


const NOTE_FREQUENCIES: Record<string, number> = {
  'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'Gb2': 92.50,
  'G2': 98.00, 'G#2': 103.83, 'Ab2': 103.83, 'A2': 110.00,
  'A#2': 116.54, 'Bb2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'Db3': 138.59, 'D3': 146.83,
  'D#3': 155.56, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61,
  'F#3': 185.00, 'Gb3': 185.00, 'G3': 196.00, 'G#3': 207.65,
  'Ab3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08,
  'B3': 246.94, 'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18,
  'D4': 293.66, 'D#4': 311.13, 'Eb4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'Gb4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'Ab4': 415.30, 'A4': 440.00, 'A#4': 466.16,
  'Bb4': 466.16, 'B4': 493.88, 'C5': 523.25,
};

function getNoteFrequency(note: string): number {
  return NOTE_FREQUENCIES[note] || 110;
}

function getNoteName(freq: number): string {
  let closest = 'E2';
  let minDiff = Infinity;
  for (const [note, f] of Object.entries(NOTE_FREQUENCIES)) {
    const diff = Math.abs(f - freq);
    if (diff < minDiff) {
      minDiff = diff;
      closest = note;
    }
  }
  return closest;
}

// ============================================================
// WOOD TEXTURES (canvas generated, cached)
// ============================================================

interface Woods {
  top: THREE.Texture;
  side: THREE.Texture;
  back: THREE.Texture;
  neck: THREE.Texture;
  board: THREE.Texture;
  plate: THREE.Texture;
  veneer: THREE.Texture;
  bridge: THREE.Texture;
}

function wood(
  base: string,
  grain: string,
  horizontal: boolean,
  lines: number,
  alpha: number,
  repeat: [number, number]
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < lines; i++) {
      const p = ((i + 0.5) / lines) * size + Math.sin(i * 12.9898) * 4;
      const w1 = Math.sin(i * 5.13) * 3;
      const w2 = Math.cos(i * 2.71) * 3;
      ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(i * 78.233)));
      ctx.strokeStyle = grain;
      ctx.lineWidth = 0.8 + Math.abs(Math.sin(i * 3.71)) * 2.2;
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(0, p);
        ctx.bezierCurveTo(85, p + w1, 170, p + w2, size, p);
      } else {
        ctx.moveTo(p, 0);
        ctx.bezierCurveTo(p + w1, 85, p + w2, 170, p, size);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  return tex;
}

let woodsCache: Woods | null = null;

function getWoods(): Woods {
  if (!woodsCache) {
    woodsCache = {
      top: wood('#b88a52', '#8d5f32', false, 24, 0.45, [3.2, 4.1]),
      side: wood('#693520', '#402010', true, 14, 0.5, [4, 1.3]),
      back: wood('#5a2f18', '#391d0f', false, 20, 0.5, [3.2, 4.1]),
      neck: wood('#8f5633', '#5f3619', false, 14, 0.45, [0.9, 2.4]),
      board: wood('#33200f', '#1d1108', false, 10, 0.5, [0.9, 4]),
      plate: wood('#5f3418', '#3c2010', false, 16, 0.5, [1.5, 3.2]),
      veneer: wood('#20160c', '#120c06', false, 20, 0.5, [1.5, 3.2]),
      bridge: wood('#17110d', '#0c0806', false, 16, 0.5, [1.5, 1]),
    };
  }
  return woodsCache;
}

// ============================================================
// BODY
// ============================================================

function makeBodyShape(withHole: boolean): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, JOINT_Z);
  s.lineTo(2.3, JOINT_Z);
  s.bezierCurveTo(5.4, 14.5, 6.1, 16.5, 5.7, 18.4);
  s.bezierCurveTo(5.4, 20.3, 5.1, 21.4, 4.75, 22.5);
  s.bezierCurveTo(4.5, 24.3, 6.9, 25.8, 7.9, 29.6);
  s.bezierCurveTo(8.5, 32.5, 5.6, 34.5, 0, 34.5);
  s.bezierCurveTo(-5.6, 34.5, -8.5, 32.5, -7.9, 29.6);
  s.bezierCurveTo(-6.9, 25.8, -4.5, 24.3, -4.75, 22.5);
  s.bezierCurveTo(-5.1, 21.4, -5.4, 20.3, -5.7, 18.4);
  s.bezierCurveTo(-6.1, 16.5, -5.4, 14.5, -2.3, JOINT_Z);
  s.lineTo(0, JOINT_Z);
  s.closePath();
  if (withHole) {
    const hole = new THREE.Path();
    hole.absarc(0, SOUNDHOLE_Z, SOUNDHOLE_R, 0, Math.PI * 2, true);
    s.holes.push(hole);
  }
  return s;
}

function makePickguardShape(): THREE.Shape {
  const p = new THREE.Shape();
  p.moveTo(-1.376, 18.734);
  p.quadraticCurveTo(-2.9, 19.5, -3.0, 22.5);
  p.quadraticCurveTo(-3.05, 25.4, -1.8, 26.0);
  p.quadraticCurveTo(-1.35, 26.3, -1.25, 25.2);
  p.lineTo(-1.376, 22.666);
  p.absarc(0, SOUNDHOLE_Z, 2.4, 2.1815, 4.1017, false);
  p.closePath();
  return p;
}

function Body() {
  const woods = getWoods();
  const shape = useMemo(() => makeBodyShape(true), []);
  const backShape = useMemo(() => makeBodyShape(false), []);
  const pickguardGeometry = useMemo(() => new THREE.ShapeGeometry(makePickguardShape()), []);

  return (
    <group>
      {/* soundboard + sides (one extrusion with the soundhole cut out) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.18, 0]} castShadow receiveShadow>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 3.94,
              bevelEnabled: true,
              bevelSegments: 5,
              bevelThickness: 0.18,
              bevelSize: 0.12,
              curveSegments: 28,
            },
          ]}
        />
        <meshStandardMaterial attach="material-0" map={woods.top} roughness={0.42} metalness={0.03} />
        <meshStandardMaterial attach="material-1" map={woods.side} roughness={0.5} metalness={0.03} />
      </mesh>

      {/* back plate */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -4.31, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[backShape, { depth: 0.03, bevelEnabled: false, curveSegments: 28 }]} />
        <meshStandardMaterial attach="material-0" map={woods.back} roughness={0.45} metalness={0.03} />
        <meshStandardMaterial attach="material-1" color="#402416" roughness={0.6} />
      </mesh>

      {/* dark bottom of the soundhole cavity */}
      <mesh position={[0, -4.0, SOUNDHOLE_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.98, 48]} />
        <meshBasicMaterial color="#0a0a0e" />
      </mesh>

      {/* rosette rings */}
      {[
        { inner: 2.05, outer: 2.14, color: '#2b1a0e' },
        { inner: 2.18, outer: 2.25, color: '#e6d9bd' },
        { inner: 2.29, outer: 2.38, color: '#6e4224' },
      ].map((r, idx) => (
        <mesh key={`rosette-${idx}`} position={[0, 0.007, SOUNDHOLE_Z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r.inner, r.outer, 64]} />
          <meshStandardMaterial color={r.color} roughness={0.45} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* pickguard */}
      <mesh geometry={pickguardGeometry} position={[0, 0.009, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#16281f" roughness={0.32} metalness={0.08} side={THREE.DoubleSide} />
      </mesh>

      {/* end pin / strap button */}
      <mesh position={[0, -2.15, 34.6]} castShadow>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#c9ced6" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ============================================================
// NECK (lofted D-profile, tapered along z)
// ============================================================

function Neck() {
  const woods = getWoods();
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.92, 0);
    s.lineTo(0.92, 0);
    s.bezierCurveTo(0.97, -0.5, 0.75, -0.92, 0.36, -1.0);
    s.bezierCurveTo(0.2, -1.05, -0.2, -1.05, -0.36, -1.0);
    s.bezierCurveTo(-0.75, -0.92, -0.97, -0.5, -0.92, 0);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 14.6,
      bevelEnabled: false,
      curveSegments: 8,
    });
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = THREE.MathUtils.clamp(pos.getZ(i) / 14.6, 0, 1);
      const w = 0.92 + (1.32 - 0.92) * t;
      pos.setX(i, pos.getX(i) * (w / 0.92));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial map={woods.neck} roughness={0.55} metalness={0.02} />
    </mesh>
  );
}

// ============================================================
// HEADSTOCK + TUNERS
// ============================================================

function makeHeadstockShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.875, 0);
  s.bezierCurveTo(1.05, -0.7, 1.3, -1.5, 1.4, -2.4);
  s.bezierCurveTo(1.48, -3.5, 1.38, -4.7, 1.28, -5.5);
  s.bezierCurveTo(1.2, -6.0, 0.7, -6.3, 0, -6.3);
  s.bezierCurveTo(-0.7, -6.3, -1.2, -6.0, -1.28, -5.5);
  s.bezierCurveTo(-1.38, -4.7, -1.48, -3.5, -1.4, -2.4);
  s.bezierCurveTo(-1.3, -1.5, -1.05, -0.7, -0.875, 0);
  s.closePath();
  return s;
}

function Headstock({ handedness = 'right' }: { handedness?: 'right' | 'left' }) {
  const woods = getWoods();
  const shape = useMemo(() => makeHeadstockShape(), []);

  return (
    <group>
      {/* plate */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.26, 0]} castShadow receiveShadow>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.22,
              bevelEnabled: true,
              bevelSegments: 3,
              bevelThickness: 0.04,
              bevelSize: 0.03,
              curveSegments: 16,
            },
          ]}
        />
        <meshStandardMaterial map={woods.plate} roughness={0.5} />
      </mesh>

      {/* dark face veneer */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.335, 0]} castShadow receiveShadow>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.02,
              bevelEnabled: true,
              bevelSegments: 2,
              bevelThickness: 0.015,
              bevelSize: 0.012,
              curveSegments: 16,
            },
          ]}
        />
        <meshStandardMaterial map={woods.veneer} roughness={0.38} metalness={0.02} />
      </mesh>

      {/* pearl inlay */}
      <mesh position={[0, 0.357, -5.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color="#efe9d8" roughness={0.3} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>

      {/* tuning machines (3 + 3) */}
      {Array.from({ length: STRING_COUNT }, (_, i) => i).map((i) => {
        const side = (i < 3 ? (handedness === 'left' ? 1 : -1) : (handedness === 'left' ? -1 : 1));
        const postZ = POST_ZS[i % 3];
        return (
          <group key={`tuner-${i}`}>
            <mesh position={[side * POST_X, 0.42, postZ]} castShadow>
              <cylinderGeometry args={[0.085, 0.085, 0.5, 12]} />
              <meshStandardMaterial color="#c8ccd4" metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[side * 1.55, 0.15, postZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, 0.9, 10]} />
              <meshStandardMaterial color="#b8bcc4" metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[side * 2.15, 0.15, postZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.13, 0.17, 0.3, 10]} />
              <meshStandardMaterial color="#d5d9e0" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ============================================================
// FRETBOARD (board + binding + frets + inlays + nut)
// ============================================================

function Fretboard() {
  const woods = getWoods();

  const boardShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.875, 0);
    s.lineTo(0.875, 0);
    s.lineTo(1.3, BOARD_END_Z);
    s.lineTo(-1.3, BOARD_END_Z);
    s.closePath();
    return s;
  }, []);

  const bindingShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.955, 0);
    s.lineTo(0.955, 0);
    s.lineTo(1.38, BOARD_END_Z);
    s.lineTo(-1.38, BOARD_END_Z);
    s.closePath();
    return s;
  }, []);

  return (
    <group>
      {/* cream binding plate (wider, slightly lower than the board) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.3, 0]} castShadow receiveShadow>
        <extrudeGeometry
          args={[
            bindingShape,
            {
              depth: 0.28,
              bevelEnabled: true,
              bevelSegments: 3,
              bevelThickness: 0.04,
              bevelSize: 0.03,
              curveSegments: 2,
            },
          ]}
        />
        <meshStandardMaterial color="#f0e4c4" roughness={0.38} metalness={0.02} />
      </mesh>

      {/* dark fretboard */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.31, 0]} castShadow receiveShadow>
        <extrudeGeometry
          args={[
            boardShape,
            {
              depth: 0.26,
              bevelEnabled: true,
              bevelSegments: 3,
              bevelThickness: 0.05,
              bevelSize: 0.04,
              curveSegments: 2,
            },
          ]}
        />
        <meshStandardMaterial map={woods.board} roughness={0.62} />
      </mesh>

      {/* fret wires */}
      {Array.from({ length: FRET_COUNT }, (_, k) => k + 1).map((n) => {
        const z = fretPos(n);
        return (
          <mesh key={`fret-${n}`} position={[0, 0.375, z]} castShadow>
            <boxGeometry args={[bindingHalfW(z) * 2 + 0.04, 0.07, 0.055]} />
            <meshStandardMaterial color="#ccd0d5" metalness={0.85} roughness={0.25} />
          </mesh>
        );
      })}

      {/* face inlays */}
      {MARKER_FRETS.map((f) => {
        const z = midFret(f);
        const xs = f === 12 ? [-0.55, 0.55] : [0];
        return xs.map((x, k) => (
          <mesh key={`inlay-${f}-${k}`} position={[x, 0.366, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.13, 24]} />
            <meshStandardMaterial color="#efe9d9" roughness={0.3} metalness={0.05} />
          </mesh>
        ));
      })}

      {/* side dots on the binding edge */}
      {MARKER_FRETS.map((f) => {
        const z = midFret(f);
        const x = bindingHalfW(z) + 0.033;
        const zs = f === 12 ? [z - 0.3, z + 0.3] : [z];
        return zs.map((dz, k) => (
          <mesh key={`side-${f}-${k}`} position={[x, 0.17, dz]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.055, 16]} />
            <meshStandardMaterial color="#17171a" roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
        ));
      })}

      {/* nut */}
      <mesh position={[0, 0.39, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[1.91, 0.1, 0.2]} />
        <meshStandardMaterial color="#f5efdc" roughness={0.3} metalness={0.04} />
      </mesh>
    </group>
  );
}

// ============================================================
// BRIDGE (plate + saddle + pins)
// ============================================================

function Bridge() {
  const woods = getWoods();

  const bridgeShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.1, 24.55);
    s.lineTo(2.1, 24.55);
    s.quadraticCurveTo(2.5, 24.7, 2.5, 25.35);
    s.lineTo(2.5, 25.75);
    s.quadraticCurveTo(2.5, 26.4, 1.9, 26.55);
    s.lineTo(-1.9, 26.55);
    s.quadraticCurveTo(-2.5, 26.4, -2.5, 25.75);
    s.lineTo(-2.5, 25.35);
    s.quadraticCurveTo(-2.5, 24.7, -2.1, 24.55);
    s.closePath();
    return s;
  }, []);

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.46, 0]} castShadow receiveShadow>
        <extrudeGeometry
          args={[
            bridgeShape,
            {
              depth: 0.4,
              bevelEnabled: true,
              bevelSegments: 3,
              bevelThickness: 0.06,
              bevelSize: 0.05,
              curveSegments: 8,
            },
          ]}
        />
        <meshStandardMaterial map={woods.bridge} roughness={0.5} />
      </mesh>

      {/* saddle */}
      <mesh position={[0, 0.5875, SADDLE_Z]} castShadow>
        <boxGeometry args={[2.5, 0.135, 0.11]} />
        <meshStandardMaterial color="#f2ead2" roughness={0.3} metalness={0.04} />
      </mesh>

      {/* bridge pins */}
      {Array.from({ length: STRING_COUNT }, (_, i) => i).map((i) => (
        <mesh key={`pin-${i}`} position={[stringX(i, PIN_Z), 0.59, PIN_Z]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.16, 12]} />
          <meshStandardMaterial color="#1c1c20" roughness={0.35} metalness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================
// STRINGS (4 segments each: pin -> saddle -> joint -> nut -> post)
// ============================================================

interface SegmentProps {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  color: string;
  highlighted: boolean;
}

function StringSegment({ from, to, radius, color, highlighted }: SegmentProps) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(from[0], from[1], from[2]);
    const b = new THREE.Vector3(to[0], to[1], to[2]);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { position: mid, quaternion: quat, length: len };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshStandardMaterial
        color={color}
        metalness={0.85}
        roughness={0.3}
        emissive={highlighted ? '#661010' : '#000000'}
        emissiveIntensity={highlighted ? 0.6 : 0}
      />
    </mesh>
  );
}

function Strings({ highlightedString, handedness = 'right' }: { highlightedString?: number; handedness?: 'right' | 'left' }) {
  const segments = useMemo(() => {
    const list: (SegmentProps & { key: string })[] = [];
    for (let i = 0; i < STRING_COUNT; i++) {
      const side = (i < 3 ? (handedness === 'left' ? 1 : -1) : (handedness === 'left' ? -1 : 1));
      const postZ = POST_ZS[i % 3];
      const pin: [number, number, number] = [stringX(i, PIN_Z, handedness), 0.64, PIN_Z];
      const saddle: [number, number, number] = [stringX(i, SADDLE_Z, handedness), 0.675, SADDLE_Z];
      const joint: [number, number, number] = [stringX(i, JOINT_Z, handedness), 0.485, JOINT_Z];
      const nut: [number, number, number] = [stringX(i, 0, handedness), 0.465, 0];
      const post: [number, number, number] = [stringX(i, 0, handedness) + postSide(i, handedness) * (POST_X - 0.15), 0.55, postZ];
      const color = highlightedString === i ? '#ff7a7a' : STRING_COLORS[i];
      const highlighted = highlightedString === i;
      const radius = STRING_RADII[i];
      list.push({ key: `s${i}-a`, from: pin, to: saddle, radius, color, highlighted });
      list.push({ key: `s${i}-b`, from: saddle, to: joint, radius, color, highlighted });
      list.push({ key: `s${i}-c`, from: joint, to: nut, radius, color, highlighted });
      list.push({ key: `s${i}-d`, from: nut, to: post, radius, color, highlighted });
    }
    return list;
  }, [highlightedString, handedness]);

  return (
    <group>
      {segments.map((s) => (
        <StringSegment
          key={s.key}
          from={s.from}
          to={s.to}
          radius={s.radius}
          color={s.color}
          highlighted={s.highlighted}
        />
      ))}
    </group>
  );
}

// ============================================================
// CHORD OVERLAY (dots, finger labels, open/mute markers, barre)
// ============================================================

type DotMark = ChordPosition & { z: number; highlighted: boolean };

const labelBase: React.CSSProperties = {
  pointerEvents: 'none',
  userSelect: 'none',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  textShadow: '0 0 3px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.9)',
};

function markerX(i: number, handedness: 'right' | 'left' = 'right'): number {
  const side = (i < 3 ? (handedness === 'left' ? 1 : -1) : (handedness === 'left' ? -1 : 1));
  const postZ = POST_ZS[i % 3];
  const z = -0.3;
  return stringX(i, 0, handedness) + (side * POST_X - stringX(i, 0, handedness)) * (z / postZ);
}

function ChordOverlay({
  chord,
  highlightedString,
  handedness = 'right',
}: {
  chord: Chord | null;
  highlightedString?: number;
  handedness?: 'right' | 'left';
}) {
  const data = useMemo(() => {
    if (!chord) return null;
    const dots: DotMark[] = [];
    const opens: number[] = [];
    const mutes: number[] = [];
    let barre: { z: number; x1: number; x2: number } | null = null;

    chord.positions.forEach((fret, i) => {
      if (fret > 0) {
        if (fret > FRET_COUNT) return;
        const z = midFret(fret);
        const freq = getNoteFrequency(STRING_NOTES[i]) * Math.pow(2, fret / 12);
        dots.push({
          string: i,
          fret,
          finger: chord.fingers[i] || 0,
          note: getNoteName(freq),
          z,
          highlighted: highlightedString === i,
        });
      } else if (fret === 0) {
        opens.push(i);
      } else {
        mutes.push(i);
      }
    });

    if (chord.barre !== undefined && chord.barre > 0 && chord.barre <= FRET_COUNT) {
      const idxs: number[] = [];
      chord.positions.forEach((f, i) => {
        if (f === chord.barre) idxs.push(i);
      });
      if (idxs.length >= 2) {
        const z = midFret(chord.barre);
        const xs = idxs.map((i) => stringX(i, z, handedness));
        barre = { z, x1: Math.min(...xs), x2: Math.max(...xs) };
      }
    }

    return { dots, opens, mutes, barre };
  }, [chord, highlightedString, handedness]);

  if (!data) return null;

  return (
    <group>
      {data.barre && (
        <mesh position={[(data.barre.x1 + data.barre.x2) / 2, 0.415, data.barre.z]}>
          <boxGeometry args={[data.barre.x2 - data.barre.x1 + 0.4, 0.045, 0.34]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      )}

      {data.dots.map((d) => {
            const x = stringX(d.string, d.z, handedness);
        const color = d.highlighted ? '#ef4444' : '#22c55e';
        return (
          <group key={`dot-${d.string}-${d.fret}`}>
            <mesh position={[x, 0.445, d.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.11, 28]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.35}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[x, 0.447, d.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.115, 0.145, 28]} />
              <meshBasicMaterial
                color={d.highlighted ? '#ffb4b4' : '#86efac'}
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Html
              position={[x, 0.56, d.z]}
              center
              wrapperClass="guitar-html-label"
              style={{ pointerEvents: 'none' }}
            >
              {d.finger > 0 ? (
                <div
                  style={{
                    ...labelBase,
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {d.finger}
                </div>
              ) : (
                <div
                  style={{
                    ...labelBase,
                    color: '#e8e8f2',
                    fontSize: '8px',
                    fontWeight: 600,
                  }}
                >
                  {d.note}
                </div>
              )}
            </Html>
            {d.highlighted && d.finger > 0 && (
              <Html
                position={[x, 0.56, d.z + 0.52]}
                center
                wrapperClass="guitar-html-label"
                style={{ pointerEvents: 'none' }}
              >
                <div
                  style={{
                    ...labelBase,
                    color: '#ffd9d9',
                    fontSize: '8px',
                    fontWeight: 600,
                  }}
                >
                  {d.note}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* open string markers (above the nut) */}
      {data.opens.map((i) => (
        <mesh key={`open-${i}`} position={[markerX(i, handedness), 0.58, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.07, 0.105, 24]} />
          <meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* muted string markers (above the nut) */}
      {data.mutes.map((i) => (
        <group key={`mute-${i}`} position={[markerX(i, handedness), 0.58, -0.3]}>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.19, 0.03, 0.05]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <mesh rotation={[0, -Math.PI / 4, 0]}>
            <boxGeometry args={[0.19, 0.03, 0.05]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================
// COMPOSITE GUITAR
// ============================================================

function Guitar({ chord, highlightedString, handedness = 'right' }: { chord: Chord | null; highlightedString?: number; handedness?: 'right' | 'left' }) {
  return (
    <group>
      <Body />
      <Neck />
      <Headstock handedness={handedness} />
      <Fretboard />
      <Bridge />
      <Strings highlightedString={highlightedString} handedness={handedness} />
      <ChordOverlay chord={chord} highlightedString={highlightedString} handedness={handedness} />
    </group>
  );
}

// ============================================================
// LIGHTS & CANVAS
// ============================================================

function Lights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[14, 30, 10]}
        intensity={2.2}
        color="#fff4e0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-18, 16, -8]} intensity={0.6} color="#bcd4ff" />
      <directionalLight position={[0, 8, 40]} intensity={0.5} color="#ffe9c4" />
    </>
  );
}

// ============================================================
// CAMERA (full view / focus on chord frets)
// ============================================================

const FULL_VIEW = { position: new THREE.Vector3(0, 55, 14.5), target: new THREE.Vector3(0, 0, 14.5) };

function focusView(chord: Chord | null): { position: THREE.Vector3; target: THREE.Vector3 } {
  let maxFret = 0;
  chord?.positions.forEach((f) => {
    if (f > maxFret) maxFret = f;
  });
  maxFret = Math.min(maxFret, FRET_COUNT);
  const zStart = -1.4;
  const zEnd = maxFret > 0 ? fretPos(maxFret) + 1.2 : 2.2;
  const zc = (zStart + zEnd) / 2;
  const span = zEnd - zStart;
  const fovRad = (45 * Math.PI) / 180;
  let dist = Math.max(7, (span + 1.5) / (2 * Math.tan(fovRad / 2)));
  dist = Math.min(dist, 140); // allow zooming out for wide chord stretches
  return { position: new THREE.Vector3(0, dist, zc), target: new THREE.Vector3(0, 0, zc) };
}

function CameraRig({ goal }: { goal: { position: THREE.Vector3; target: THREE.Vector3 } | null }) {
  const controls = useThree((s) => s.controls) as
    | { target: THREE.Vector3; update: () => void }
    | null;
  const camera = useThree((s) => s.camera);
  const animating = useRef(false);

  useEffect(() => {
    if (goal) animating.current = true;
  }, [goal]);

  useFrame((_, delta) => {
    if (!animating.current || !goal || !controls) return;
    const k = 1 - Math.exp(-delta * 5);
    camera.position.lerp(goal.position, k);
    controls.target.lerp(goal.target, k);
    controls.update();
    if (camera.position.distanceTo(goal.position) < 0.03) {
      camera.position.copy(goal.position);
      controls.target.copy(goal.target);
      controls.update();
      animating.current = false;
    }
  });

  return null;
}

export function GuitarCanvas({ chord, highlightedString, className, handedness = 'right' }: Guitar3DProps) {
  const [focused, setFocused] = useState(false);
  const [goal, setGoal] = useState<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    setGoal(focused ? focusView(chord) : FULL_VIEW);
  }, [focused, chord]);

  const toggleFocus = () => setFocused((f) => !f);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '500px' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 55, 14.5], fov: 45, near: 0.5, far: 500 }}
        style={{ width: '100%', height: '100%' }}
        className={className}
      >
        <color attach="background" args={[0x0d0d1a]} />
        <Environment preset="studio" />
        <Lights />
        <ContactShadows position={[0, -4.45, 14.5]} scale={60} opacity={0.5} blur={2.4} far={14} />
        <Guitar chord={chord} highlightedString={highlightedString} handedness={handedness} />
        <CameraRig goal={goal} />
        <OrbitControls
          makeDefault
          target={[0, 0, 14.5]}
          minDistance={6}
          maxDistance={160}
          minPolarAngle={0.02}
          maxPolarAngle={Math.PI - 0.02}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 5, display: 'flex', gap: '8px' }}>
        <button className="gcam-btn" onClick={toggleFocus}>
          {focused ? 'Full view' : 'Focus frets'}
        </button>
      </div>
    </div>
  );
}

export default GuitarCanvas;
