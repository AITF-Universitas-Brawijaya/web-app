"""
Authentication routes for login, logout, and user session management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta
from db import get_db
from utils.auth import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from utils.auth_middleware import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    role: str
    created_at: str
    last_login: Optional[str]


from typing import Optional


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token
    
    Args:
        login_data: Username and password
        db: Database session
        
    Returns:
        JWT access token and user information
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Fetch user from database
    query = text("""
        SELECT id, username, password_hash, full_name, email, phone, role, created_at, last_login, dark_mode, compact_mode, generator_keywords
        FROM users
        WHERE username = :username
    """)
    
    result = db.execute(query, {"username": login_data.username})
    user = result.fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_dict = dict(user._mapping)
    
    # Verify password
    if not verify_password(login_data.password, user_dict["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login timestamp
    update_query = text("""
        UPDATE users
        SET last_login = now()
        WHERE username = :username
    """)
    db.execute(update_query, {"username": login_data.username})
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_dict["username"], "role": user_dict["role"]},
        expires_delta=access_token_expires
    )
    
    # Prepare user data (exclude password hash)
    user_data = {
        "id": user_dict["id"],
        "username": user_dict["username"],
        "full_name": user_dict["full_name"],
        "email": user_dict["email"],
        "phone": user_dict["phone"],
        "role": user_dict["role"],
        "created_at": user_dict["created_at"].isoformat() if user_dict["created_at"] else None,
        "last_login": user_dict["last_login"].isoformat() if user_dict["last_login"] else None,
        "dark_mode": user_dict.get("dark_mode", False),
        "compact_mode": user_dict.get("compact_mode", False),
        "generator_keywords": user_dict.get("generator_keywords", ""),
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information
    
    Args:
        current_user: Current user from JWT token
        
    Returns:
        User information
    """
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "full_name": current_user["full_name"],
        "email": current_user["email"],
        "phone": current_user["phone"],
        "role": current_user["role"],
        "created_at": current_user["created_at"].isoformat() if current_user["created_at"] else None,
        "last_login": current_user["last_login"].isoformat() if current_user["last_login"] else None,
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout endpoint (client-side token removal)
    
    Note: With JWT, logout is primarily handled client-side by removing the token.
    This endpoint exists for consistency and can be extended with token blacklisting if needed.
    
    Args:
        current_user: Current user from JWT token
        
    Returns:
        Success message
    """
    return {"message": "Successfully logged out"}


@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Refresh JWT token
    
    Args:
        current_user: Current user from JWT token
        
    Returns:
        New JWT access token
    """
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user["username"], "role": current_user["role"]},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


class PreferencesUpdate(BaseModel):
    dark_mode: Optional[bool] = None
    compact_mode: Optional[bool] = None
    generator_keywords: Optional[str] = None


@router.post("/preferences")
async def update_preferences(
    preferences: PreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update user UI preferences (dark mode, compact mode)
    
    Args:
        preferences: Preferences to update
        db: Database session
        current_user: Current user from JWT token
        
    Returns:
        Updated preferences
    """
    try:
        username = current_user.get("username")
        
        # Build update query dynamically
        update_parts = []
        params = {"username": username}
        
        if preferences.dark_mode is not None:
            update_parts.append("dark_mode = :dark_mode")
            params["dark_mode"] = preferences.dark_mode
        
        if preferences.compact_mode is not None:
            update_parts.append("compact_mode = :compact_mode")
            params["compact_mode"] = preferences.compact_mode
        
        if preferences.generator_keywords is not None:
            update_parts.append("generator_keywords = :generator_keywords")
            params["generator_keywords"] = preferences.generator_keywords
        
        if not update_parts:
            raise HTTPException(status_code=400, detail="No preferences to update")
        
        update_query = text(f"""
            UPDATE users
            SET {", ".join(update_parts)}
            WHERE username = :username
            RETURNING dark_mode, compact_mode, generator_keywords
        """)
        
        result = db.execute(update_query, params)
        db.commit()
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        row_dict = dict(row._mapping)
        
        return {
            "ok": True,
            "dark_mode": row_dict["dark_mode"],
            "compact_mode": row_dict["compact_mode"],
            "generator_keywords": row_dict["generator_keywords"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")
