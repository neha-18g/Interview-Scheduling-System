import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from redis import Redis
from rq import Queue

from app.db.base import get_db
from app.db.models import EmailLog, EmailStatus
from app.auth.dependencies import require_admin
from app.core.config import settings

router = APIRouter(prefix="/api/v1/email-logs", tags=["Email Logs"])


class EmailLogResponse(BaseModel):
    id:              int         
    recipient_email: str
    subject:         str
    status:          EmailStatus
    error_message:   Optional[str]
    created_at:      datetime
    model_config = {"from_attributes": True}


# ── GET all logs ─────────────────────────────────────────────────────────────
@router.get(
    "",
    response_model=list[EmailLogResponse],
    summary="Admin: view all email delivery logs",
)
def get_email_logs(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return (
        db.query(EmailLog)
        .order_by(EmailLog.created_at.desc())
        .all()
    )


# ── GET single log ───────────────────────────────────────────────────────────
@router.get(
    "/{log_id}",
    response_model=EmailLogResponse,
    summary="Admin: get a single email log entry",
)
def get_email_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    log = db.query(EmailLog).filter(EmailLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Email log entry not found")
    return log


# ── DELETE pending — MUST be before /{log_id} ────────────────────────────────
@router.delete(
    "/pending",
    status_code=status.HTTP_200_OK,
    summary="Admin: delete all pending email logs and clear Redis queue",
)
def delete_pending_email_logs(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    deleted_count = (
        db.query(EmailLog)
        .filter(EmailLog.status == EmailStatus.pending)
        .delete(synchronize_session=False)
    )
    db.commit()

    redis_conn = Redis.from_url(settings.REDIS_URL)   
    q = Queue("emails", connection=redis_conn)        
    q.empty()

    return {"deleted": deleted_count, "message": "Pending email logs removed."}


# ── DELETE single log ─────────────────────────────────────────────────────────
@router.delete(
    "/{log_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Admin: delete a single email log entry",
)
def delete_email_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    log = db.query(EmailLog).filter(EmailLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Email log entry not found")
    db.delete(log)
    db.commit()
