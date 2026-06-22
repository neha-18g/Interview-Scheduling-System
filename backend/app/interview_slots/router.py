from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.interview_slots.schemas import (
    InterviewSlotCreate,
    InterviewSlotUpdate,
    InterviewSlotResponse,
)
from app.interview_slots import service

router = APIRouter(prefix="/api/v1/interview-slots", tags=["Interview Slots"])

@router.post(
    "",
    response_model=InterviewSlotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: create an interview slot",
)
def create_interview_slot(
    data: InterviewSlotCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return service.create_slot(db, data, admin_user_id=current_user.id)

@router.get(
    "",
    response_model=list[InterviewSlotResponse],
    summary="List all interview slots (both roles)",
)
def list_interview_slots(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.get_all_slots(db)

@router.get(
    "/{slot_id}",
    response_model=InterviewSlotResponse,
    summary="Get a single slot by ID",
)
def get_interview_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.get_slot_by_id(db, slot_id)


@router.put(
    "/{slot_id}",
    response_model=InterviewSlotResponse,
    summary="Admin: update a slot",
)
def update_interview_slot(
    slot_id: int,
    data: InterviewSlotUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return service.update_slot(db, slot_id, data)


@router.delete(
    "/{slot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Admin: delete a slot (blocked if active bookings exist)",
)
def delete_interview_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    service.delete_slot(db, slot_id)