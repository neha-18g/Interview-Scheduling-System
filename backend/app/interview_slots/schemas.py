from pydantic import BaseModel, field_validator, model_validator
from datetime import datetime
from typing import Optional


class InterviewSlotCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    max_candidates: int = 1

    @model_validator(mode="after")
    def end_after_start(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self

    @field_validator("max_candidates")
    @classmethod
    def must_be_positive(cls, v):
        if v < 1:
            raise ValueError("max_candidates must be at least 1")
        return v


class InterviewSlotUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_candidates: Optional[int] = None


class InterviewSlotResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    max_candidates: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    booked_count: int = 0       # active (pending + approved) booking count
    is_available: bool = True   # True when booked_count < max_candidates
    available_sub_slots:int = 0
    model_config = {"from_attributes": True}