import os
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from fastapi import HTTPException, status

def init_firebase():
    if firebase_admin._apps:
        return  # Prevent duplicate init on hot reload

    cred_path = os.getenv("FIREBASE_CREDENTIALS") or "./serviceAccountKey.json"

    if not os.path.exists(cred_path):
        print(f" Firebase credentials not found at '{cred_path}'. Skipping Firebase initialization.")
        return

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    print(" Firebase Admin SDK initialized")

def verify_firebase_token(token: str) -> dict:
    """
    Verifies the Firebase JWT from the React frontend.

    Returns decoded payload:
        { uid, email, name, email_verified }

    Raises HTTP 401 on invalid/expired token.
    """
    try:
        return firebase_auth.verify_id_token(token)
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again."
        )
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token. Please log in again."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )