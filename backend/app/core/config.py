import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    REDIS_URL: str     = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    SMTP_HOST: str     = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int     = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str     = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str     = os.getenv("SMTP_FROM", "")
    APP_NAME: str      = os.getenv("APP_NAME", "Interview Scheduling System")


settings = Settings()