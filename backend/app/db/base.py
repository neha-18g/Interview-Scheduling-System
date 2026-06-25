#responsible for db connection
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

from sqlalchemy import create_engine, event #engine is the sqlalchemy connection to the database
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

# Read from environment variable (set in .env)
DATABASE_URL = os.getenv(
    "DATABASE_URL"
)

# echo=True logs every SQL statement — set False in production
engine = create_engine(DATABASE_URL, echo=False)

@event.listens_for(engine, "connect")
def set_utc_on_connect(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET time_zone = '+00:00'")
    cursor.close()

# Each request gets its own session; closed after the request ends
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    """All ORM models inherit from this."""
    pass

def get_db():
    """
    FastAPI dependency — yields a DB session per request.
    Usage in a route:  db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()