from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import timedelta
from backend.db import get_db
from backend.auth import (
    UserCreate,
    User,
    Token,
    create_access_token,
    get_password_hash,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=User)
def register(user: UserCreate, db: Session = Depends(get_db)):
    query = text("SELECT * FROM app_users WHERE email = :email")
    existing_user = db.execute(query, {"email": user.email}).fetchone()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    hashed_password = get_password_hash(user.password)
    insert_query = text("""
        INSERT INTO app_users (email, password_hash)
        VALUES (:email, :password_hash)
        RETURNING id_user, email
    """)
    
    try:
        new_user = db.execute(insert_query, {
            "email": user.email,
            "password_hash": hashed_password
        }).mappings().fetchone()
        db.commit()
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 uses 'username' field for email
    query = text("SELECT * FROM app_users WHERE email = :email")
    user = db.execute(query, {"email": form_data.username}).mappings().fetchone()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "id": user.id_user}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
