import os
import subprocess
import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.bookings.resume_review import router as resume_review_router 

from app.interview_slots.router import router as interview_slots_router
from app.bookings.router import router as bookings_router
from app.emails.router import router as email_logs_router
from app.db.base import engine, Base
from app.db import models
from app.users.router import router as users_router
from app.bookings.tts import router as tts_router

logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)#create database table 
    print("Database tables ready")
    from app.auth.firebase import init_firebase # connects firebase
    init_firebase()
    worker = subprocess.Popen([sys.executable, "-m", "app.worker"])# start RQ woker here automatically 
    print(f"Worker auto-started (PID: {worker.pid})")
    yield
    worker.terminate()
    print("Worker stopped")

app = FastAPI(
    title="Interview Scheduling API",#to show in swagger ui 
    version="1.0.0",
    lifespan=lifespan,#to start and stop the instances modern form of event ("startup")
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(users_router)
app.include_router(interview_slots_router)
app.include_router(bookings_router)
app.include_router(email_logs_router)
app.include_router(resume_review_router)
app.include_router(tts_router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
