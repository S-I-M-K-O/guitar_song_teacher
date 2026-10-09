# Guitar Song Teacher

An interactive web application for learning guitar with AI-powered song analysis, 3D chord visualization, and synchronized playback.

## Features

- **Animated 3D Guitar** - Interactive guitar model with realistic chord fingerings
- **Chord Library** - 50+ chords with finger positions, notes, and audio playback
- **AI Song Analysis** - Upload audio files to automatically detect chords, tempo, and strumming patterns
- **Synchronized Playback** - Play along with timeline navigation and real-time chord display
- **Strumming Patterns** - Visual strumming pattern display with down/up/mute indicators
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite for fast development
- Three.js + React Three Fiber for 3D graphics
- Tone.js for audio synthesis
- Zustand for state management

### Backend
- FastAPI (Python)
- Librosa for audio analysis
- NumPy/SciPy for signal processing

### Deployment
- Docker + Docker Compose
- Nginx for frontend serving

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd guitar_song_teacher

# Start all services
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Development Setup

#### Prerequisites
- Node.js 20+
- Python 3.11+
- FFmpeg (for audio processing)

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Project Structure

```
guitar_song_teacher/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Guitar3D.tsx         # 3D guitar with Three.js
│   │   │   ├── ChordDiagram.tsx     # 2D chord diagrams
│   │   │   ├── ChordSelector.tsx    # Chord lookup modal
│   │   │   ├── ChordDisplay.tsx     # Current/upcoming chords
│   │   │   ├── StrummingPattern.tsx # Strumming visualization
│   │   │   ├── Timeline.tsx         # Playback timeline
│   │   │   ├── SongAnalyzer.tsx     # Audio upload & analysis
│   │   │   └── PlaybackControls.tsx # Play/pause/speed controls
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   │   ├── chords.ts     # Chord library data
│   │   │   └── audio.ts      # Tone.js audio engine
│   │   ├── types/            # TypeScript types
│   │   └── App.tsx           # Main application
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── main.py           # API endpoints
│   │   ├── services/
│   │   │   └── chord_analyzer.py  # Audio analysis logic
│   │   ├── models/
│   │   │   └── schemas.py    # Pydantic models
│   │   └── utils/
│   │       └── chord_data.py # Backend chord library
│   └── requirements.txt
├── docker/                   # Docker configuration
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── nginx.conf
├── docker-compose.yml
├── Dockerfile
└── .dockerignore
```

## Usage Guide

### 1. Learn Chords Tab
- Click "Select Chord" to browse the chord library
- Choose from categories: Major, Minor, 7th, Major 7th, Suspended, Power Chords
- Click any chord to see it on the 3D guitar and hear how it sounds
- View finger positions and note names

### 2. Analyze Song Tab
- Drag & drop or click to upload an audio file (MP3, WAV, OGG, FLAC, M4A, AAC)
- Click "Analyze Chords" to process the song
- View detected tempo, time signature, and chord progression
- Results automatically prepare the Play Along tab

### 3. Play Along Tab
- Animated 3D guitar shows current chord in real-time
- Timeline with chord markers for navigation
- Current and upcoming chords displayed with diagrams
- Strumming pattern visualization with highlighted current stroke
- Playback controls: play/pause, seek, speed control (0.5x - 1.5x)
- Keyboard shortcuts: Space (play/pause), ←/→ (seek ±5s)

## AI Model for Chord Detection

The backend uses a **Chroma-based chord recognition** approach:

1. **Audio Loading** - Librosa loads audio at 22.05kHz
2. **Chroma Feature Extraction** - Constant-Q Transform (CQT) chromagram captures harmonic content
3. **Beat Tracking** - Dynamic programming beat tracker finds tempo and beat positions
4. **Chord Template Matching** - Cosine similarity between chroma vectors and chord templates
5. **Post-processing** - Consecutive identical chords merged, confidence scoring

For production use, consider upgrading to:
- **Crema** (Convolutional Recurrent Estimator for Music Analysis) - State-of-the-art chord recognition
- **Chordino** (Vamp plugin) - Proven in academic research
- **Deep learning models** from Hugging Face (e.g., `facebook/musicgen-chord`)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/analyze` | Upload and analyze audio file |
| GET | `/api/chords` | Get chord library |

### Analysis Response
```json
{
  "success": true,
  "analysis": {
    "chords": [
      {
        "chord": {"name": "Am", "notes": ["A", "C", "E"], ...},
        "startTime": 0.0,
        "endTime": 4.0,
        "measure": 1,
        "beat": 1
      }
    ],
    "tempo": 120,
    "timeSignature": "4/4",
    "duration": 180.5,
    "strummingPattern": {
      "pattern": [{"type": "down", "timing": 0.0, "accent": true}, ...],
      "beatsPerMeasure": 4,
      "subdivision": "eighth"
    }
  }
}
```

## Configuration

### Environment Variables

Frontend (build-time):
- `VITE_API_URL` - Backend API URL (default: http://localhost:8000)

Backend (runtime):
- `PYTHONUNBUFFERED=1` - Unbuffered Python output

### Customization

#### Adding New Chords
Edit `frontend/src/utils/chords.ts` and `backend/app/utils/chord_data.py`:
```typescript
{ 
  name: 'C#m', 
  notes: ['C#', 'E', 'G#'], 
  positions: [4, 6, 6, 5, 4, 4], 
  fingers: [1, 3, 4, 2, 1, 1], 
  barre: 4 
}
```

#### Adjusting Analysis Sensitivity
Modify `backend/app/services/chord_analyzer.py`:
- `hop_length` - Time resolution (smaller = more precise)
- `n_fft` - Frequency resolution
- Chord template matching threshold

## Troubleshooting

### Audio Not Playing
- Click the page first (browser autoplay policy)
- Check browser console for Tone.js initialization errors
- Ensure HTTPS for production (required for audio)

### Analysis Fails
- Verify FFmpeg is installed: `ffmpeg -version`
- Check file format is supported
- Large files (>10MB) may timeout - increase proxy timeouts

### 3D Guitar Not Rendering
- Ensure WebGL is enabled in browser
- Try refreshing the page
- Check for Three.js version compatibility

## Performance Notes

- Frontend bundle: ~500KB gzipped
- 3D guitar: ~60fps on modern devices
- Analysis time: ~2-5 seconds per minute of audio
- Memory usage: <200MB backend, <100MB frontend

## License

MIT License - Feel free to use for learning and teaching!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run lint` (frontend), `pytest` (backend)
5. Submit a pull request

## Acknowledgments

- Three.js community for 3D graphics
- Tone.js for Web Audio synthesis
- Librosa for audio analysis
- React Three Fiber for React/Three.js integration