# app/routers/tts.py
import os
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1", tags=["tts"])

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

class TTSRequest(BaseModel):
    text: str
    speaker: str = "neha"       # female; use "shubh" for male
    pace: float = 1.0

@router.post("/tts")
async def text_to_speech(body: TTSRequest):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text is required.")

    # Sarvam TTS limit is 2500 chars for bulbul:v3
    text = body.text[:2500]

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "target_language_code": "en-IN",
        "speaker": body.speaker,
        "model": "bulbul:v3",
        "pace": body.pace,
        "enable_preprocessing": True,   # handles numbers, punctuation cleanly
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(SARVAM_TTS_URL, headers=headers, json=payload)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Sarvam TTS error {response.status_code}: {response.text}"
        )

    data = response.json()
    audio_base64 = data["audios"][0]   # base64 WAV string

    return JSONResponse({"audio": audio_base64})