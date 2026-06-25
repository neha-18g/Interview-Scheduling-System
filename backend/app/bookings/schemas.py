#it defines the pydantic models and defines the structure of the data that is comming and going out of the api
from pydantic import BaseModel,field_validator
from datetime import datetime
from typing import Optional
from app.db.models import BookingStatus

class BookingStatusUpdate(BaseModel):
    # Only approved / rejected are valid status transitions from admin
    status: BookingStatus

class BookingCreate(BaseModel):
    candidate_statement: str
    sub_slot_id: int 

    @field_validator("candidate_statement") # ensures the candidate statement should be atleast 20 char
    @classmethod
    def statement_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Candidate statement cannot be empty")
        if len(v) < 20:
            raise ValueError("Candidate statement must be at least 20 characters")
        if len(v) > 100:
            raise ValueError("Candidate statement cannot exceed 100 characters")
        return v

class BookingResponse(BaseModel):
    id: int
    slot_id: int
    candidate_user_id: int
    status: BookingStatus
    booked_at: datetime
    updated_at: datetime

    #candidate input
    candidate_statement: Optional[str] = None
    resume_path: Optional[str] = None
    ai_result:  str | None = None
    ai_reason:  str | None = None
    ai_summary: str | None = None

    # Denormalised slot fields — populated by the service layer
    slot_title:      Optional[str]      = None
    slot_start_time: Optional[str] = None
    slot_end_time:   Optional[str] = None

    # Denormalised candidate fields — populated in admin view only
    candidate_name:  Optional[str] = None
    candidate_email: Optional[str] = None

    model_config = {"from_attributes": True} #it allows pydantic to convert sqlalchemy directly 