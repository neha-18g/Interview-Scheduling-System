from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import os, uuid, shutil
from app.db.models import BookingStatus
from app.db.base import get_db
from app.auth.dependencies import get_current_user, require_admin, require_candidate
from app.bookings.schemas import BookingStatusUpdate, BookingResponse, BookingCreate
from app.bookings import service
from app.interview_slots.service import get_slot_by_id 
from datetime import datetime, timezone
from zoneinfo import ZoneInfo 

IST = ZoneInfo("Asia/Kolkata")
def _to_ist(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST)

router = APIRouter(prefix="/api/v1", tags=["Bookings"])

RESUME_UPLOAD_DIR = "uploads/resumes"
os.makedirs(RESUME_UPLOAD_DIR, exist_ok=True)
ALLOWED_RESUME_TYPES = {"application/pdf"}
MAX_RESUME_SIZE = 5 * 1024 * 1024

# ── Candidate endpoints ──────────────────────────────────────────────────────

@router.post(
    "/interview-slots/{slot_id}/book",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Candidate: book a slot with a statement of interest",
)
def book_interview_slot(
    slot_id: int,
    data: BookingCreate,                       
    db: Session = Depends(get_db),
    current_user=Depends(require_candidate),
):
    return service.book_slot(
        db,
        slot_id=slot_id,
        candidate_user_id=current_user.id,
        candidate_statement=data.candidate_statement,
        sub_slot_id=data.sub_slot_id,
    )

@router.post("/bookings/{booking_id}/resume")
def upload_resume(
    booking_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_candidate),
):
    booking = service.get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    # ADD THIS — block if not the owner
    if booking.candidate_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your booking.")


    # ADD THIS — block if rejected
    if booking.status == BookingStatus.rejected:
        raise HTTPException(
            status_code=400,
            detail="Cannot upload resume for a rejected booking."
        )

    #OPTIONAL — block if already approved too
    if booking.status == BookingStatus.approved:
        raise HTTPException(
            status_code=400,
            detail="Booking already approved. Resume cannot be changed."
        )


    if file.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF documents are accepted.")

    contents = file.file.read()
    if len(contents) > MAX_RESUME_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Resume file is too large. Maximum size is 5MB."
        )
    file.file.seek(0)

    ext = os.path.splitext(file.filename)[-1] or ".pdf"
    filename = f"{uuid.uuid4().hex}{ext}"  # ← unguessable UUID filename
    save_path = os.path.join(RESUME_UPLOAD_DIR, filename)

    with open(save_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    # Store the static URL instead of the file path
    static_url = f"uploads/resumes/{filename}"

    return service.attach_resume(
        db,
        booking_id=booking_id,
        candidate_user_id=current_user.id,
        resume_path=static_url,  # ← store URL not path
    )


@router.get(
    "/my-bookings",
    response_model=list[BookingResponse],
    summary="Candidate: view their own booking history",
)
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user=Depends(require_candidate),
):
    return service.get_my_bookings(db, candidate_user_id=current_user.id)


# ── Admin endpoints ──────────────────────────────────────────────────────────
@router.get("/bookings/{booking_id}/resume/url")
def get_resume_url(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    booking = service.get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if not booking.resume_path:
        raise HTTPException(status_code=404, detail="No resume uploaded.")
    
    # Convert stored path to URL path
    # e.g. "uploads/resumes/abc.pdf" → "/uploads/resumes/abc.pdf"
    url_path = "/" + booking.resume_path.replace("\\", "/")
    
    return {"url": {url_path}}

# ADDED — new route
@router.get("/interview-slots/{slot_id}/sub-slots")
def get_available_sub_slots(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_candidate),
):
    from app.db.models import InterviewSubSlot
    sub_slots = (
        db.query(InterviewSubSlot)
        .filter(
            InterviewSubSlot.slot_id   == slot_id,
            InterviewSubSlot.is_booked == False,
        )   
        .order_by(InterviewSubSlot.start_time)
        .all()
    )
    return [
        {
            "id"        : s.id,
            "start_time": _to_ist(s.start_time).isoformat(),
            "end_time"  : _to_ist(s.end_time).isoformat(),
            "day"       : _to_ist(s.start_time).strftime("%A, %d %B %Y"),
            "time"      : (
                f"{_to_ist(s.start_time).strftime('%I:%M %p')} - "
                f"{_to_ist(s.end_time).strftime('%I:%M %p')}"
            ),
        }
        for s in sub_slots
    ]
@router.put(
    "/bookings/{booking_id}/status",
    response_model=BookingResponse,
    summary="Admin: approve or reject a booking",
)
def update_booking_status(
    booking_id: int,
    data: BookingStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return service.update_booking_status(db, booking_id, data)


@router.delete(
    "/bookings/{booking_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Admin: remove a candidate from a slot",
)
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return service.delete_booking(db, booking_id)

@router.get(
    "/bookings",
    response_model=list[BookingResponse],
    summary="Admin: view all bookings across all slots",
)
def get_all_bookings(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return service.get_all_bookings(db)