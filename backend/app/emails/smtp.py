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
        smtp.ehlo() # worker intros itself to gmail
        smtp.starttls() #upgrades connection to encypted 
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD) #logs in with your email + app password from .env
        smtp.sendmail(settings.SMTP_FROM, recipient_email, msg.as_string()) # hands the email to gmail
        print(f"[SMTP] email sent to {recipient_email}")