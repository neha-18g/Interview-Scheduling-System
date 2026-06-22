from datetime import datetime, UTC
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey,
    Enum, Text, Boolean
)
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class UserRole(str, enum.Enum):
    candidate = "candidate"
    admin     = "admin"

class BookingStatus(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"

class EmailStatus(str, enum.Enum):
    queued  = "queued"
    sent    = "sent"
    failed  = "failed"

class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String(128), unique=True, nullable=False, index=True)
    name         = Column(String(255), nullable=False)
    email        = Column(String(255), unique=True, nullable=False)
    role         = Column(Enum(UserRole), nullable=False, default=UserRole.candidate)
    created_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    is_active    = Column(Integer, default=1, nullable=False)

    slots    = relationship("InterviewSlot", back_populates="creator")
    bookings = relationship("SlotBooking",   back_populates="candidate")


class InterviewSlot(Base):
    __tablename__ = "interview_slots"

    id                 = Column(Integer, primary_key=True, index=True)
    title              = Column(String(255), nullable=False)
    description        = Column(Text, nullable=True)
    start_time         = Column(DateTime(timezone=True), nullable=False)
    end_time           = Column(DateTime(timezone=True), nullable=False)  
    max_candidates     = Column(Integer, nullable=False, default=1)
    interview_duration = Column(Integer, default=30)
    created_by         = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at         = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at         = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC),
                                onupdate=lambda: datetime.now(UTC), nullable=False)

    creator   = relationship("User",             back_populates="slots")
    bookings  = relationship("SlotBooking",      back_populates="slot")
    sub_slots = relationship("InterviewSubSlot", back_populates="slot", cascade="all, delete-orphan")


class InterviewSubSlot(Base):
    __tablename__ = "interview_sub_slots"

    id         = Column(Integer, primary_key=True, index=True)
    slot_id    = Column(Integer, ForeignKey("interview_slots.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)  # ✅ was plain DateTime
    end_time   = Column(DateTime(timezone=True), nullable=False)  # ✅ was plain DateTime
    is_booked  = Column(Boolean, default=False, nullable=False)

    slot    = relationship("InterviewSlot", back_populates="sub_slots")
    booking = relationship("SlotBooking",   back_populates="sub_slot", uselist=False)


class SlotBooking(Base):
    __tablename__ = "slot_bookings"

    id                  = Column(Integer, primary_key=True, index=True)
    slot_id             = Column(Integer, ForeignKey("interview_slots.id"), nullable=False)
    sub_slot_id         = Column(Integer, ForeignKey("interview_sub_slots.id"), nullable=True)
    candidate_user_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    status              = Column(Enum(BookingStatus), default=BookingStatus.pending, nullable=False)
    booked_at           = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at          = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC),
                                 onupdate=lambda: datetime.now(UTC), nullable=False)
    candidate_statement = Column(Text, nullable=False)
    resume_path         = Column(String(512), nullable=True)
    ai_result           = Column(String(50),  nullable=True)
    ai_reason           = Column(Text,        nullable=True)
    ai_summary          = Column(Text,        nullable=True)

    slot      = relationship("InterviewSlot",    back_populates="bookings")
    sub_slot  = relationship("InterviewSubSlot", back_populates="booking")
    candidate = relationship("User",             back_populates="bookings")


class EmailLog(Base):
    __tablename__ = "email_logs"

    id              = Column(Integer, primary_key=True, index=True)
    booking_id      = Column(Integer, ForeignKey("slot_bookings.id", ondelete="CASCADE"), nullable=True)
    recipient_email = Column(String(255), nullable=False)
    subject         = Column(String(500), nullable=False)
    status          = Column(Enum(EmailStatus), default=EmailStatus.queued, nullable=False)
    error_message   = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)