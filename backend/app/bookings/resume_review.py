import os
import httpx
import pdfplumber
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pdf2image import convert_from_path
import pytesseract
import re
import logging 

from app.auth.dependencies import get_db, require_admin
from app.db.models import SlotBooking

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])
logger = logging.getLogger(__name__)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions"

REVIEW_PROMPT = """You are an expert technical recruiter. Review the resume below and respond in this EXACT format:
First, check if the name on the resume matches "{candidate_name}". 
If it does NOT match, respond with:
RESULT: Not a Match
REASON: Resume does not belong to {candidate_name}.
FEEDBACK: Name mismatch detected. Please upload your own resume.

RESULT: Potential Match OR Not a Match
REASON: One sentence explaining the result.
FEEDBACK:
1. Overall Impression: ...
2. Strengths: ...
3. Weaknesses / Gaps: ...
4. Skills Assessment: ...
5. Recommendation: Yes / Maybe / No with a brief reason.

Resume:
{resume_text}
"""
MAX_CHARS = 6000

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from a PDF using pdfplumber.
    Returns empty string if the PDF is scanned / image-only.
    """
    text_chunks = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_chunks.append(page_text.strip())
    return "\n\n".join(text_chunks)

def extract_text_with_ocr(file_path: str) -> str:
    """
    Fallback for scanned PDFs — converts each page to an image and runs OCR.
    """
    images = convert_from_path(file_path, dpi=200)
    text_chunks = []
    for image in images:
        text = pytesseract.image_to_string(image)
        if text.strip():
            text_chunks.append(text.strip())
    return "\n\n".join(text_chunks)



async def call_sarvam_chat(resume_text: str, candidate_name: str) -> str:
    """
    Send extracted resume text to Sarvam Chat API and return the AI feedback.
    """
    prompt = REVIEW_PROMPT.format(resume_text=resume_text, candidate_name=candidate_name)

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "model": "sarvam-105b",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 4096,
        "temperature": 0.3,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(SARVAM_CHAT_URL, headers=headers, json=payload)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Sarvam API error {response.status_code}: {response.text}"
        )

    data = response.json()
    message = data["choices"][0]["message"]
    content = message.get("content") or message.get("reasoning_content")
    if not content:
        raise HTTPException(
            status_code=502,
            detail=f"Sarvam returned an empty response. Raw: {data}"
        )
    return content


def parse_feedback(feedback: str):
    """
    Parse the structured response from Sarvam into result, reason, and full feedback.
    """
    ai_result = "Not a Match"  # safe default
    ai_reason = ""

    for line in feedback.strip().splitlines():
        line = line.strip().lstrip("*").rstrip("*").strip()  # strip markdown bold
        if re.match(r"RESULT\s*:", line, re.IGNORECASE):
            value = re.sub(r"RESULT\s*:", "", line, flags=re.IGNORECASE).strip()
            ai_result = "Potential Match" if "Potential Match" in value else "Not a Match"
        elif re.match(r"REASON\s*:", line, re.IGNORECASE):
            ai_reason = re.sub(r"REASON\s*:", "", line, flags=re.IGNORECASE).strip()

    if not ai_reason:
        logger.warning("Could not parse REASON from feedback: %s", feedback[:200])

    return ai_result, ai_reason


@router.get("/resume-review/{booking_id}")
async def review_resume(
    booking_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """
    Admin-only endpoint.
    Reads the resume stored for a booking, extracts text, calls Sarvam,
    saves the result to the booking, and returns it.
    """
    # 1. Fetch booking
    booking = db.query(SlotBooking).filter(SlotBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if not booking.resume_path:
        raise HTTPException(status_code=404, detail="No resume uploaded for this booking")

    # At the top of review_resume(), after fetching booking:
    if booking.ai_result and booking.ai_summary:
        return {
            "booking_id": booking_id,
            "status": "cached",
            "message": "Returning previously saved review.",
            "feedback": booking.ai_summary,
            "ai_result": booking.ai_result,
            "ai_reason": booking.ai_reason,
            "ai_summary": booking.ai_summary,
        }

    # 2. Build file path
    file_path = booking.resume_path
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on disk")

    # 3. Extract text
    extracted_text = extract_text_from_pdf(file_path)
    extracted_text = extracted_text[:MAX_CHARS]
    # 4. If pdfplumber got nothing, try OCR fallback
    if not extracted_text.strip():
        extracted_text = extract_text_with_ocr(file_path)
        extracted_text = extracted_text[:MAX_CHARS]

    # 5. If OCR also got nothing, give up
    if not extracted_text.strip():
        return {
            "booking_id": booking_id,
            "status": "scanned_pdf",
            "message": (
                "This resume could not be read even with OCR. "
                "Please review it manually."
            ),
            "ai_result": None,
            "ai_reason": None,
            "ai_summary": None,
        }

    # 6. Call Sarvam Chat API
    candidate_name = booking.candidate.name 
    feedback = await call_sarvam_chat(extracted_text, candidate_name)

    # 7. Parse the structured response
    ai_result, ai_reason = parse_feedback(feedback)

    # 8. Save to DB so it persists for future modal opens
    booking.ai_result  = ai_result
    booking.ai_reason  = ai_reason
    booking.ai_summary = feedback
    db.commit()
    db.refresh(booking)

    # 9. Return everything
    return {
        "booking_id": booking_id,
        "status": "success",
        "message": "Resume reviewed successfully.",
        "feedback": feedback,
        "ai_result": ai_result,
        "ai_reason": ai_reason,
        "ai_summary": feedback,
    }
   