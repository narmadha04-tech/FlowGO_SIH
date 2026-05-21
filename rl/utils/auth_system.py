"""
auth_system.py
--------------
Backend authentication system with login, registration, and verification.
Includes JWT token management and user verification.
"""

from __future__ import annotations

import hashlib
import json
import secrets
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
try:
    from jose import JWTError, jwt
except ImportError:
    # Fallback if python-jose not installed
    JWTError = Exception
    jwt = None

from pydantic import BaseModel

# Configuration
SECRET_KEY = "your-secret-key-change-in-production-use-env-variable"  # Change in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
VERIFICATION_TOKEN_EXPIRE_MINUTES = 60  # 1 hour

# File paths
USERS_DB = Path(__file__).parent.parent / "artifacts" / "users.json"
VERIFICATION_DB = Path(__file__).parent.parent / "artifacts" / "verifications.json"

# Ensure directories exist
USERS_DB.parent.mkdir(parents=True, exist_ok=True)
VERIFICATION_DB.parent.mkdir(parents=True, exist_ok=True)

# Security scheme
security = HTTPBearer()


class User(BaseModel):
    """User model."""
    authority_id: str
    name: str
    email: Optional[str] = None
    password_hash: str
    role: str = "authority"  # authority, admin, viewer
    is_verified: bool = False
    created_at: float
    last_login: Optional[float] = None


class UserRegister(BaseModel):
    """User registration request."""
    authority_id: str
    name: str
    email: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    """User login request."""
    authority_id: str
    password: str


class Token(BaseModel):
    """Token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


class VerificationRequest(BaseModel):
    """Verification request."""
    authority_id: str
    verification_code: str


class VerificationResponse(BaseModel):
    """Verification response."""
    verification_code: str
    expires_at: float
    message: str


def hash_password(password: str) -> str:
    """Hash password using SHA-256 (use bcrypt in production)."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    return hash_password(password) == password_hash


def load_users() -> Dict[str, Dict[str, Any]]:
    """Load users from database."""
    if not USERS_DB.exists():
        return {}
    try:
        return json.loads(USERS_DB.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError):
        return {}


def save_users(users: Dict[str, Dict[str, Any]]) -> None:
    """Save users to database."""
    USERS_DB.write_text(json.dumps(users, indent=2), encoding="utf-8")


def load_verifications() -> Dict[str, Dict[str, Any]]:
    """Load verification codes from database."""
    if not VERIFICATION_DB.exists():
        return {}
    try:
        return json.loads(VERIFICATION_DB.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError):
        return {}


def save_verifications(verifications: Dict[str, Dict[str, Any]]) -> None:
    """Save verification codes to database."""
    VERIFICATION_DB.write_text(json.dumps(verifications, indent=2), encoding="utf-8")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    if jwt is None:
        raise ImportError("python-jose is required. Install with: pip install python-jose[cryptography]")
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode JWT token."""
    if jwt is None:
        raise ImportError("python-jose is required. Install with: pip install python-jose[cryptography]")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except (JWTError, Exception) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current authenticated user from token."""
    token = credentials.credentials
    payload = verify_token(token)
    authority_id: str = payload.get("sub")
    if authority_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    users = load_users()
    if authority_id not in users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    user = users[authority_id]
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Please verify your account first.",
        )
    
    return user


def generate_verification_code() -> str:
    """Generate a 6-digit verification code."""
    return f"{secrets.randbelow(1000000):06d}"


def register_user(user_data: UserRegister) -> Dict[str, Any]:
    """Register a new user."""
    users = load_users()
    
    if user_data.authority_id in users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authority ID already exists",
        )
    
    # Create user
    user = {
        "authority_id": user_data.authority_id,
        "name": user_data.name,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "role": "authority",
        "is_verified": False,
        "created_at": time.time(),
        "last_login": None,
    }
    
    users[user_data.authority_id] = user
    save_users(users)
    
    # Generate verification code
    verification_code = generate_verification_code()
    verifications = load_verifications()
    verifications[user_data.authority_id] = {
        "code": verification_code,
        "created_at": time.time(),
        "expires_at": time.time() + (VERIFICATION_TOKEN_EXPIRE_MINUTES * 60),
        "attempts": 0,
    }
    save_verifications(verifications)
    
    return {
        "message": "User registered successfully. Please verify your account.",
        "authority_id": user_data.authority_id,
        "verification_code": verification_code,  # In production, send via email/SMS
    }


def login_user(login_data: UserLogin) -> Dict[str, Any]:
    """Authenticate user and return token."""
    users = load_users()
    
    if login_data.authority_id not in users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authority ID or password",
        )
    
    user = users[login_data.authority_id]
    
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authority ID or password",
        )
    
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Please verify your account first.",
        )
    
    # Update last login
    user["last_login"] = time.time()
    users[login_data.authority_id] = user
    save_users(users)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": login_data.authority_id, "role": user["role"]}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "authority_id": user["authority_id"],
            "name": user["name"],
            "email": user.get("email"),
            "role": user["role"],
        },
    }


def verify_user_account(authority_id: str, verification_code: str) -> Dict[str, Any]:
    """Verify user account with verification code."""
    users = load_users()
    verifications = load_verifications()
    
    if authority_id not in users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    if authority_id not in verifications:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code found. Please register again.",
        )
    
    verification = verifications[authority_id]
    
    # Check if code expired
    if time.time() > verification["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired. Please request a new one.",
        )
    
    # Check attempts
    if verification["attempts"] >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many verification attempts. Please request a new code.",
        )
    
    # Verify code
    if verification["code"] != verification_code:
        verification["attempts"] += 1
        save_verifications(verifications)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {5 - verification['attempts']} attempts remaining.",
        )
    
    # Mark user as verified
    users[authority_id]["is_verified"] = True
    save_users(users)
    
    # Remove verification code
    verifications.pop(authority_id, None)
    save_verifications(verifications)
    
    return {
        "message": "Account verified successfully",
        "authority_id": authority_id,
    }


def resend_verification_code(authority_id: str) -> Dict[str, Any]:
    """Resend verification code."""
    users = load_users()
    
    if authority_id not in users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    if users[authority_id].get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already verified",
        )
    
    # Generate new verification code
    verification_code = generate_verification_code()
    verifications = load_verifications()
    verifications[authority_id] = {
        "code": verification_code,
        "created_at": time.time(),
        "expires_at": time.time() + (VERIFICATION_TOKEN_EXPIRE_MINUTES * 60),
        "attempts": 0,
    }
    save_verifications(verifications)
    
    return {
        "message": "Verification code sent",
        "authority_id": authority_id,
        "verification_code": verification_code,  # In production, send via email/SMS
    }


def get_user_info(authority_id: str) -> Dict[str, Any]:
    """Get user information."""
    users = load_users()
    
    if authority_id not in users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    user = users[authority_id]
    return {
        "authority_id": user["authority_id"],
        "name": user["name"],
        "email": user.get("email"),
        "role": user["role"],
        "is_verified": user.get("is_verified", False),
        "created_at": user["created_at"],
        "last_login": user.get("last_login"),
    }

