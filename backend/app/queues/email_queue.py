from rq import Queue,Retry
from app.queues.redis_conn import redis_conn
from app.emails.tasks import send_email_task

email_queue = Queue("Emails", connection=redis_conn)


def push_email_job(
    *,
    recipient_email: str,
    recipient_name: str,
    subject: str,
    email_type: str,
    context: dict,
) -> None:
    from app.emails.tasks import send_email_task  # local import avoids circular

    email_queue.enqueue(
        send_email_task,
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        subject=subject,
        email_type=email_type,
        context=context,
        retry=Retry(max=5, interval=[60, 300, 900, 1800, 3600]),  # retry up to 5 times with increasing intervals
    )