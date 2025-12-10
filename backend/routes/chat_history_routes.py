from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text
from db import get_db

router = APIRouter(prefix="/api/chat", tags=["chat_history"])


class ChatMessage(BaseModel):
    role: str
    message: str
    created_at: str


@router.get("/history/{id_domain}")
async def get_chat_history(id_domain: int, username: str, db: Session = Depends(get_db)) -> List[ChatMessage]:
    """
    Retrieve chat history for a specific user and domain.
    """
    try:
        query = text("""
            SELECT role, message, created_at
            FROM chat_history
            WHERE username = :username AND id_domain = :id_domain
            ORDER BY created_at ASC
        """)
        
        result = db.execute(query, {"username": username, "id_domain": id_domain})
        rows = result.fetchall()
        
        messages = [
            ChatMessage(
                role=row[0],
                message=row[1],
                created_at=row[2].isoformat()
            )
            for row in rows
        ]
        
        return messages
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chat history: {str(e)}")


class SaveChatRequest(BaseModel):
    username: str
    role: str
    message: str


@router.post("/history/{id_domain}")
async def save_chat_message(id_domain: int, req: SaveChatRequest, db: Session = Depends(get_db)):
    """
    Save a chat message to the database.
    """
    try:
        query = text("""
            INSERT INTO chat_history (username, id_domain, role, message)
            VALUES (:username, :id_domain, :role, :message)
            RETURNING id, created_at
        """)
        
        result = db.execute(query, {
            "username": req.username,
            "id_domain": id_domain,
            "role": req.role,
            "message": req.message
        })
        
        row = result.fetchone()
        db.commit()
        
        return {
            "id": row[0],
            "created_at": row[1].isoformat(),
            "role": req.role,
            "message": req.message
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save chat message: {str(e)}")


@router.delete("/history/{id_domain}")
async def clear_chat_history(id_domain: int, username: str, db: Session = Depends(get_db)):
    """
    Clear all chat history for a specific user and domain.
    """
    try:
        query = text("""
            DELETE FROM chat_history
            WHERE username = :username AND id_domain = :id_domain
        """)
        
        result = db.execute(query, {"username": username, "id_domain": id_domain})
        deleted_count = result.rowcount
        db.commit()
        
        return {
            "success": True,
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear chat history: {str(e)}")
