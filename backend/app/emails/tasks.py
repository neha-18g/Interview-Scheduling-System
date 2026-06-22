"""
RQ task — runs inside the worker process, NOT inside the API process.

Flow:
  API  →  push_email_job()  →  Redis queue
  Worker  →  picks up job  →  send_email_task()  →  SMTP  →  email_logs table
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from app.core.config import settings
from app.emails.templates import render
from app.db.base import SessionLocal
from app.db.models import EmailLog, EmailStatus

logger = logging.getLogger(__name__)


def send_email_task(
    *,
    recipient_email: str,
    recipient_name: str,
    subject: str,
    email_type: str,
    context: dict,
) -> None:
    """
    Called by the RQ worker.
    1. Renders the email body from the template.
    2. Sends via SMTP.
    3. Writes the result to email_logs.
    """
    body = render(email_type, context, recipient_name)#built body from template 
    error_message = None
    success = False

    try:
        _send_smtp(recipient_email, subject, body)
        success = True
        logger.info("Email sent to %s [%s]", recipient_email, email_type)
    except Exception as exc:
        error_message = str(exc)
        logger.error("Failed to send email to %s: %s", recipient_email, exc)#exc is used to store the error msg

    _write_log(
        recipient_email=recipient_email,
        subject=subject,
        status=EmailStatus.sent if success else EmailStatus.failed,
        error_message=error_message,
    )


def _send_smtp(recipient_email: str, subject: str, body: str) -> None:
    """Open an SMTP connection, send, close."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{settings.APP_NAME} <{settings.SMTP_FROM}>"
    msg["To"]      = recipient_email
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, recipient_email, msg.as_string())

#always log results to db
def _write_log(
    recipient_email: str,
    subject: str,
    status: EmailStatus,
    error_message: str | None,
) -> None:
    """Write the delivery result to email_logs — always, even on failure."""
    with SessionLocal() as db:
        try:
            log = EmailLog(
                recipient_email=recipient_email,
                subject=subject,
                status=status,
                error_message=error_message,
            )
            db.add(log)
            db.commit()
        except Exception as exc:
            logger.error("Could not write email log: %s", exc)
        finally:
            db.close()
