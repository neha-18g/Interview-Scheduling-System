from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from datetime import datetime,timezone,timedelta

from app.db.models import InterviewSlot, InterviewSubSlot, SlotBooking, BookingStatus
from app.interview_slots.schemas import InterviewSlotCreate, InterviewSlotUpdate
from zoneinfo import ZoneInfo

IST=ZoneInfo("Asia/Kolkata")

WORK_DAYS = {0,1,2,3,4} #mon-Friday
SLOT_DURATION = 30 #minutes

def _make_aware(dt: datetime) -> datetime:
    """Convert naive datetime to timezone-aware in UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

#for creating the subslots 
def generate_sub_slots(db: Session, slot: InterviewSlot):
    start_ist = _make_aware(slot.start_time).astimezone(IST)
    end_ist   = _make_aware(slot.end_time).astimezone(IST)

    daily_open  = start_ist.time()
    daily_close = end_ist.time()

    current_day = start_ist.date()
    end_day     = end_ist.date()

    sub_slots = []
    while current_day <= end_day:
        if current_day.weekday() in WORK_DAYS:
            current_time = datetime.combine(current_day, daily_open, tzinfo=IST)
            day_end      = datetime.combine(current_day, daily_close, tzinfo=IST)

            while current_time < day_end:
                next_time = current_time + timedelta(minutes=SLOT_DURATION)
                if next_time > day_end:
                    break
                sub_slots.append(InterviewSubSlot(
                    slot_id    = slot.id,
                    start_time = current_time.astimezone(timezone.utc),  # store as UTC
                    end_time   = next_time.astimezone(timezone.utc), 
                    is_booked  = False,
                ))
                current_time = next_time

        current_day += timedelta(days=1)

    db.bulk_save_objects(sub_slots)
    db.commit()

# ── Admin: create ────────────────────────────────────────────────────────────

def create_slot(db: Session, data: InterviewSlotCreate, admin_user_id: int) -> dict:

    now = datetime.now(timezone.utc)

    if _make_aware(data.start_time) < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time cannot be in the past",
        )
    if _make_aware(data.end_time) <= _make_aware(data.start_time):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_time must be after start_time",
        )   

    slot = InterviewSlot(
        title=data.title,
        description=data.description,
        start_time=data.start_time,
        end_time=data.end_time,
        max_candidates=data.max_candidates,
        created_by=admin_user_id,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    generate_sub_slots(db,slot) #added 
    return _enrich(db, slot)


# ── Both roles: read ─────────────────────────────────────────────────────────

def get_all_slots(db: Session) -> list[dict]:
    slots = (
        db.query(InterviewSlot)
        .order_by(InterviewSlot.start_time)
        .all()
    )
    return [_enrich(db, s) for s in slots]


def get_slot_by_id(db: Session, slot_id: int) -> dict:
    slot = _get_or_404(db, slot_id)
    return _enrich(db, slot)

# ── Admin: update ────────────────────────────────────────────────────────────

def update_slot(db: Session, slot_id: int, data: InterviewSlotUpdate) -> dict:
    slot = _get_or_404(db, slot_id)
    updates = data.model_dump(exclude_unset=True)

    # Re-validate times when either (or both) are being changed
    new_start = _make_aware(updates.get("start_time", slot.start_time))
    new_end   = _make_aware(updates.get("end_time",   slot.end_time))
    if new_start < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time cannot be in the past",
        )
    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_time must be after start_time",
        )

    # If reducing max_candidates, make sure it's not below current bookings
    if "max_candidates" in updates:
        active = _active_booking_count(db, slot_id)
        if updates["max_candidates"] < active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot reduce max_candidates to {updates['max_candidates']} "
                    f"— {active} active bookings already exist for this slot."
                ),
            )

    times_changed = "start_time" in updates or "end_time" in updates

    for field, value in updates.items():
        setattr(slot, field, value)

    slot.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(slot)
    # regenerate sub-slots if times changed
    if times_changed:
        db.query(InterviewSubSlot).filter(
            InterviewSubSlot.slot_id == slot_id,
            InterviewSubSlot.is_booked == False,   # only delete unbooked ones
        ).delete()
        db.commit()
        generate_sub_slots(db, slot)

    return _enrich(db, slot)


# ── Admin: delete ────────────────────────────────────────────────────────────

def delete_slot(db: Session, slot_id: int) -> None:
    slot = _get_or_404(db, slot_id)

    active = _active_booking_count(db, slot_id)
    if active > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot delete slot — {active} active booking(s) exist. "
                "Reject them before deleting."
            ),
        )

    db.delete(slot)
    db.commit()


# ── Internal helpers ─────────────────────────────────────────────────────────

def _get_or_404(db: Session, slot_id: int) -> InterviewSlot:
    slot = db.query(InterviewSlot).filter(InterviewSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview slot {slot_id} not found.",
        )
    return slot


def _active_booking_count(db: Session, slot_id: int) -> int:
    """Count pending + approved bookings for a slot."""
    return (
        db.query(func.count(SlotBooking.id))
        .filter(
            SlotBooking.slot_id == slot_id,
            SlotBooking.status.in_([BookingStatus.pending, BookingStatus.approved]),
        )
        .scalar() #sqlalchemy method to get the count result directly as an integer
    ) or 0
def _to_ist(dt: datetime) -> str:
    """Convert a naive UTC datetime from DB to IST ISO string."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)   # treat naive as UTC
    return dt.astimezone(IST).isoformat()


def _enrich(db: Session, slot: InterviewSlot) -> dict:#convert the db into clean api response with the extra fields
    booked_count = _active_booking_count(db, slot.id)
     # Count free sub-slots
    available_sub_slots = (
        db.query(func.count(InterviewSubSlot.id))
        .filter(
            InterviewSubSlot.slot_id  == slot.id,
            InterviewSubSlot.is_booked == False,
        )
        .scalar()
    ) or 0
    return {
        "id":             slot.id,
        "title":          slot.title,
        "description":    slot.description,
        "start_time":     _to_ist(slot.start_time),
        "end_time":       _to_ist(slot.end_time),
        "max_candidates": slot.max_candidates,
        "created_by":     slot.created_by,
        "created_at":     _to_ist(slot.created_at),
        "updated_at":     _to_ist(slot.updated_at),
        "booked_count":   booked_count,
        "active_booking_count": booked_count,
        "is_available":   booked_count < slot.max_candidates,
        "available_sub_slots": available_sub_slots,
    }