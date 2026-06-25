from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from datetime import datetime, timezone, UTC

from app.db.models import SlotBooking, InterviewSlot, InterviewSubSlot, User, BookingStatus
from app.bookings.schemas import BookingStatusUpdate
from app.queues.email_queue import push_email_job
from zoneinfo import ZoneInfo
IST = ZoneInfo("Asia/Kolkata")

def _to_ist_str(dt):
    if dt is None: return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).isoformat()


# ── Candidate: book a slot ────────────────────────────────────────────────────

def book_slot(
    db: Session,
    slot_id: int,
    sub_slot_id: int,
    candidate_user_id: int,
    candidate_statement: str,
) -> dict:
    slot = _get_slot_or_404(db, slot_id)

    # 1. Fetch & lock sub-slot
    sub_slot = (
        db.query(InterviewSubSlot)
        .filter(
            InterviewSubSlot.id      == sub_slot_id,
            InterviewSubSlot.slot_id == slot_id,
        )
        .with_for_update() #mutex pattern in db level
        .first()
    )
    if not sub_slot:
        raise HTTPException(status_code=404, detail="Sub-slot not found.")

    # 2. Already taken?
    if sub_slot.is_booked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time is already booked. Please pick another slot.",
        )

    # 3. Capacity check
    active = _active_booking_count(db, slot_id)
    if active >= slot.max_candidates:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This slot is fully booked. No seats remaining.",
        )

    # 4. Duplicate check
    duplicate = (
        db.query(SlotBooking)
        .filter(
            SlotBooking.slot_id           == slot_id,
            SlotBooking.candidate_user_id == candidate_user_id,
            SlotBooking.status            != BookingStatus.rejected,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already booked this interview slot.",
        )

    # 5. Create booking
    booking = SlotBooking(
        slot_id             = slot_id,
        sub_slot_id         = sub_slot_id,
        candidate_user_id   = candidate_user_id,
        status              = BookingStatus.pending,
        candidate_statement = candidate_statement.strip(),
    )
    db.add(booking)
    db.flush()

    # 6. Lock sub-slot
    sub_slot.is_booked = True

    db.commit()
    db.refresh(booking)

    # 7. Queue confirmation email (non-blocking)
    candidate = db.query(User).filter(User.id == candidate_user_id).first()
    push_email_job(
        recipient_email=candidate.email,
        recipient_name=candidate.name,
        subject="Interview Booking Received — Pending Confirmation",
        email_type="booking_created",
        context={
            "slot_title": slot.title,
            "start_time": slot.start_time.isoformat(),
            "end_time":   slot.end_time.isoformat(),
            "booking_id": booking.id,
        },
    )

    return _enrich(db, booking, include_candidate=False)


# ── Candidate: upload resume ──────────────────────────────────────────────────

def attach_resume(
    db: Session,
    booking_id: int,
    candidate_user_id: int,
    resume_path: str,
    ai_summary: str = None,
    ai_result: str = None,
    ai_reason: str = None,
) -> dict:
    booking = _get_booking_or_404(db, booking_id)

    if booking.candidate_user_id != candidate_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to upload a resume for this booking.",
        )
    if booking.status == BookingStatus.rejected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot upload a resume for a rejected booking.",
        )

    booking.resume_path = resume_path
    booking.updated_at  = datetime.now(UTC)
    db.commit()
    db.refresh(booking)

    return _enrich(db, booking, include_candidate=False)


# ── Candidate: view own bookings ──────────────────────────────────────────────

def get_my_bookings(db: Session, candidate_user_id: int) -> list[dict]:
    bookings = (
        db.query(SlotBooking)
        .filter(SlotBooking.candidate_user_id == candidate_user_id)
        .order_by(SlotBooking.booked_at.desc())
        .all()
    )
    return [_enrich(db, b, include_candidate=False) for b in bookings]


# ── Admin: view all bookings ──────────────────────────────────────────────────

def get_all_bookings(db: Session) -> list[dict]:
    bookings = (
        db.query(SlotBooking)
        .order_by(SlotBooking.booked_at.desc())
        .all()
    )
    return [_enrich(db, b, include_candidate=True) for b in bookings]


def get_booking_by_id(db: Session, booking_id: int):
    return db.query(SlotBooking).filter(SlotBooking.id == booking_id).first()


# ── Admin: approve / reject ───────────────────────────────────────────────────

def update_booking_status(
    db: Session,
    booking_id: int,
    data: BookingStatusUpdate,
) -> dict:
    booking    = _get_booking_or_404(db, booking_id)
    new_status = data.status

    # No-op guard
    if booking.status == new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking is already '{new_status.value}'.",
        )

    # Cannot approve a rejected booking
    if booking.status == BookingStatus.rejected and new_status == BookingStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve a previously rejected booking.",
        )

    if new_status == BookingStatus.rejected and booking.sub_slot_id:
        sub_slot = db.query(InterviewSubSlot).filter(
            InterviewSubSlot.id == booking.sub_slot_id
        ).first()
        if sub_slot:
            sub_slot.is_booked = False

    # Capacity race-condition check when approving
    if new_status == BookingStatus.approved:
        slot = _get_slot_or_404(db, booking.slot_id)
        already_approved = (
            db.query(func.count(SlotBooking.id))
            .filter(
                SlotBooking.slot_id == booking.slot_id,
                SlotBooking.status  == BookingStatus.approved,
                SlotBooking.id      != booking_id,
            )
            .scalar()
        ) or 0
        if already_approved >= slot.max_candidates:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot approve — slot has reached its maximum approved candidates.",
            )

    booking.status     = new_status
    booking.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(booking)

    # Queue status-change email
    candidate   = db.query(User).filter(User.id == booking.candidate_user_id).first()
    slot        = db.query(InterviewSlot).filter(InterviewSlot.id == booking.slot_id).first()
    is_approved = new_status == BookingStatus.approved

    if candidate:
        push_email_job(
            recipient_email=candidate.email,
            recipient_name=candidate.name,
            subject=(
                "Your Interview Booking Has Been Approved"
                if is_approved else
                "Your Interview Booking Has Been Rejected"
            ),
            email_type="booking_approved" if is_approved else "booking_rejected",
            context={
                "slot_title": slot.title,
                "start_time": slot.start_time.isoformat(),
                "end_time":   slot.end_time.isoformat(),
                "booking_id": booking.id,
            },
        )

    return _enrich(db, booking, include_candidate=True)


# ── Admin: delete booking ─────────────────────────────────────────────────────

def delete_booking(db: Session, booking_id: int) -> None:
    """Removes a booking entirely. Used by admin to pull a candidate out of a slot."""
    booking = _get_booking_or_404(db, booking_id)
    db.delete(booking)
    db.commit()


# ── Internal helpers ──────────────────────────────────────────────────────────

def _get_slot_or_404(db: Session, slot_id: int) -> InterviewSlot:
    slot = db.query(InterviewSlot).filter(InterviewSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview slot {slot_id} not found.",
        )
    return slot


def _get_booking_or_404(db: Session, booking_id: int) -> SlotBooking:
    booking = db.query(SlotBooking).filter(SlotBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found.",
        )
    return booking


def _active_booking_count(db: Session, slot_id: int) -> int:
    """Count pending + approved bookings (i.e. seats taken)."""
    return (
        db.query(func.count(SlotBooking.id))
        .filter(
            SlotBooking.slot_id == slot_id,
            SlotBooking.status.in_([BookingStatus.pending, BookingStatus.approved]),
        )
        .scalar()
    ) or 0


def _enrich(db: Session, booking: SlotBooking, include_candidate: bool) -> dict:
    """Merge slot info (and optionally candidate info) into the booking dict."""
    slot      = db.query(InterviewSlot).filter(InterviewSlot.id == booking.slot_id).first()
    sub_slot  = (
        db.query(InterviewSubSlot).filter(InterviewSubSlot.id == booking.sub_slot_id).first()
        if booking.sub_slot_id else None
    )

    data = {
        "id":                  booking.id,
        "slot_id":             booking.slot_id,
        "candidate_user_id":   booking.candidate_user_id,
        "status":              booking.status.value,
        "booked_at":           _to_ist_str(booking.booked_at),
        "updated_at":          _to_ist_str(booking.updated_at),
        "candidate_statement": booking.candidate_statement,
        "resume_path":         booking.resume_path,
        "ai_result":           booking.ai_result,
        "ai_reason":           booking.ai_reason,
        "ai_summary":          booking.ai_summary,
        "sub_slot_id":         booking.sub_slot_id,
        "slot_title":          slot.title          if slot     else None,
        "slot_start_time":     _to_ist_str(sub_slot.start_time) if sub_slot else None,
        "slot_end_time":       _to_ist_str(sub_slot.end_time)   if sub_slot else None,
        "candidate_name":      None,
        "candidate_email":     None,
    }

    if include_candidate:
        candidate = db.query(User).filter(User.id == booking.candidate_user_id).first()
        data["candidate_name"]  = candidate.name  if candidate else None
        data["candidate_email"] = candidate.email if candidate else None

    return data