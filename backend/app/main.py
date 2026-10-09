from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import JSONResponse
import os
import tempfile
import shutil
from pathlib import Path
import logging

from .services.chord_analyzer import ChordAnalyzer
from .models.schemas import AnalysisResponse, ErrorResponse
import yt_dlp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Guitar Song Teacher API",
    description="AI-powered guitar chord analysis and song learning",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = ChordAnalyzer()

UPLOAD_DIR = Path("/tmp/guitar_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "guitar-teacher-api"}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_audio(
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...)
):
    """
    Analyze an audio file to detect chords, tempo, and strumming patterns.
    """
    if not audio.content_type or not audio.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    temp_path = None
    try:
        temp_path = UPLOAD_DIR / f"upload_{audio.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        
        logger.info(f"Analyzing audio file: {audio.filename}")
        
        result = await analyzer.analyze(str(temp_path))
        
        background_tasks.add_task(cleanup_file, str(temp_path))
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        if temp_path and temp_path.exists():
            cleanup_file(str(temp_path))
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


def cleanup_file(path: str):
    try:
        os.remove(path)
    except Exception:
        pass


@app.get("/api/chords")
async def get_chord_library():
    """Get the library of known chords."""
    from app.utils.chord_data import CHORD_LIBRARY
    return {"chords": CHORD_LIBRARY}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
@app.post("/api/analyze/youtube", response_model=AnalysisResponse)
async def analyze_youtube(
    background_tasks: BackgroundTasks,
    url: str = Form(...)
):
    """
    Analyze audio from a YouTube URL.
    """
    temp_path = None
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'outtmpl': '/tmp/guitar_uploads/%(id)s_%(title)s.%(ext)s',
            'noplaylist': True,
            'ignoreerrors': False,
            'quiet': True,
            'no_warnings': True,
            'extractor_args': {'youtube': {'player_client': ['android']}},
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if not info:
                raise HTTPException(status_code=400, detail="Failed to extract YouTube audio")
            # Find the downloaded file
            title = info.get('title', 'audio')
            video_id = info.get('id', '')
            # The file will be .wav after postprocessing
            temp_path = Path(ydl.prepare_filename(info)).with_suffix('.wav')
            if not temp_path.exists():
                # try to find
                for f in UPLOAD_DIR.glob(f"{video_id}*wav"):
                    temp_path = f
                    break
        if not temp_path or not temp_path.exists():
            raise HTTPException(status_code=500, detail="Failed to download YouTube audio")
        logger.info(f"Analyzing YouTube audio: {url}")
        result = await analyzer.analyze(str(temp_path))
        background_tasks.add_task(cleanup_file, str(temp_path))
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"YouTube analysis error: {str(e)}")
        if temp_path and temp_path.exists():
            cleanup_file(str(temp_path))
        raise HTTPException(status_code=500, detail=f"YouTube analysis failed: {str(e)}")
