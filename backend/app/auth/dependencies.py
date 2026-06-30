from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import User, UserRole
from app.auth.firebase import verify_firebase_token

bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    decoded = verify_firebase_token(token)
    firebase_uid = decoded.get("uid")
    email        = decoded.get("email", "")
    firebase_name = decoded.get("name") or email.split("@")[0]

    user = db.query(User).filter(User.firebase_uid == firebase_uid).first() # checks whether the user already exists 

    if not user:
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            name=firebase_name,
            role=UserRole.candidate,
            is_active=1,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Use on: create slot, view all bookings, approve/reject."""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required."
        )
    return current_user


def require_candidate(current_user: User = Depends(get_current_user)) -> User:
    """Use on: book slot, view own bookings."""
    if current_user.role != UserRole.candidate:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate access required."
        )
    return current_user