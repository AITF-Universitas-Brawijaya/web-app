"""
Authentication middleware for protecting routes
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from utils.auth import decode_access_token
from db import get_db

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get current authenticated user from JWT token
    
    Args:
        credentials: HTTP Bearer token from request header
        db: Database session
        
    Returns:
        Dictionary containing user information
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Fetch user from database
    query = text("""
        SELECT id, username, full_name, email, phone, role, created_at, last_login
        FROM users
        WHERE username = :username
    """)
    
    result = db.execute(query, {"username": username})
    user = result.fetchone()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return dict(user._mapping)


def get_current_active_user(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Get current active user (can be extended with active status check)
    
    Args:
        current_user: Current user from get_current_user dependency
        
    Returns:
        Dictionary containing user information
    """
    return current_user


def require_role(required_role: str):
    """
    Dependency factory for role-based access control
    
    Args:
        required_role: Required role (e.g., 'administrator', 'verifikator')
        
    Returns:
        Dependency function that checks user role
    """
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        return current_user
    
    return role_checker
