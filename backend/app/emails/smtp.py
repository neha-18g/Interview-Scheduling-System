import smtplib
from email.mime.text import MIMEText #ltter inside the box
from email.mime.multipart import MIMEMultipart #box
from app.core.config import settings

def send_email_smtp(
    *,
    recipient_email: str,
    recipient_name: str,
    subject: str,
    html_body: str,
) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{settings.APP_NAME} <{settings.SMTP_FROM}>"
    msg["To"]      = recipient_email

    msg.attach(MIMEText(html_body, "plain")) #plain text version of the email body

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.sendmail(settings.SMTP_FROM, recipient_email, msg.as_string())
        print(f"[SMTP] email sent to {recipient_email}")