"""
Plain-text email templates for each booking event.
Keeping them as simple Python strings — no Jinja2 dependency needed.
"""

from app.core.config import settings


def _footer() -> str:
    return f"\n\n---\n{settings.APP_NAME}\nThis is an automated message, please do not reply."


def booking_created(context: dict, recipient_name: str) -> str:
    return (
        f"Hi {recipient_name},\n\n"
        f"Your booking request has been received and is pending review.\n\n"
        f"Slot:       {context['slot_title']}\n"
        f"Start:      {context['start_time']}\n"
        f"End:        {context['end_time']}\n"
        f"Booking ID: #{context['booking_id']}\n\n"
        f"You will receive another email once an admin reviews your request."
        f"{_footer()}"
    )


def booking_approved(context: dict, recipient_name: str) -> str:
    return (
        f"Hi {recipient_name},\n\n"
        f"Great news — your interview booking has been APPROVED.\n\n"
        f"Slot:       {context['slot_title']}\n"
        f"Start:      {context['start_time']}\n"
        f"End:        {context['end_time']}\n"
        f"Booking ID: #{context['booking_id']}\n\n"
        f"Please make sure to be available at the scheduled time."
        f"{_footer()}"
    )


def booking_rejected(context: dict, recipient_name: str) -> str:
    return (
        f"Hi {recipient_name},\n\n"
        f"Unfortunately your interview booking has been rejected.\n\n"
        f"Slot:       {context['slot_title']}\n"
        f"Start:      {context['start_time']}\n"
        f"End:        {context['end_time']}\n"
        f"Booking ID: #{context['booking_id']}\n\n"
        f"Please log in to book a different slot if one is available."
        f"{_footer()}"
    )


TEMPLATES = {
    "booking_created":  booking_created,
    "booking_approved": booking_approved,
    "booking_rejected": booking_rejected,
}


def render(email_type: str, context: dict, recipient_name: str) -> str:
    fn = TEMPLATES.get(email_type)
    if not fn:
        raise ValueError(f"Unknown email_type: '{email_type}'")
    return fn(context, recipient_name)