from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import User
from app.db.base import get_db
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


class UserResponse(BaseModel):
    id:           int
    firebase_uid: str
    name:         str
    email:        str
    role:         str
    created_at:   datetime

    class Config:
        from_attributes = True

class RegisterRequest(BaseModel):
    name: str


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the logged-in user's profile.
    React calls this after login to get role + display name.
    """
    return current_user

@router.post("/register", response_model=UserResponse)
def register(
    payload: RegisterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sets the user's display name (called once right after signup).
    """
    current_user.name = payload.name
    db.commit()
    db.refresh(current_user)
    return current_user