from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text
from db import get_db
from routes.auth_routes import get_current_user

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackSubmit(BaseModel):
    message: str


class FeedbackResponse(BaseModel):
    id_feedback: int
    messages: str
    sender: str
    waktu_pengiriman: str


@router.post("/", status_code=201)
async def submit_feedback(
    feedback: FeedbackSubmit,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Submit new feedback message
    Requires authentication
    """
    if not feedback.message or not feedback.message.strip():
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty")
    
    try:
        query = text("""
            INSERT INTO feedback (messages, sender)
            VALUES (:messages, :sender)
            RETURNING id_feedback, waktu_pengiriman
        """)
        
        result = db.execute(query, {
            "messages": feedback.message.strip(),
            "sender": current_user["username"]
        })
        
        db.commit()
        row = result.fetchone()
        row_dict = dict(row._mapping)
        
        return {
            "success": True,
            "message": "Feedback submitted successfully",
            "id_feedback": row_dict["id_feedback"],
            "waktu_pengiriman": row_dict["waktu_pengiriman"].isoformat()
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")


@router.get("/", response_model=List[FeedbackResponse])
async def get_all_feedback(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all feedback messages
    Only accessible by administrators
    """
    if current_user.get("role") != "administrator":
        raise HTTPException(status_code=403, detail="Access denied. Administrator role required.")
    
    try:
        query = text("""
            SELECT id_feedback, messages, sender, waktu_pengiriman
            FROM feedback
            ORDER BY waktu_pengiriman DESC
        """)
        
        result = db.execute(query)
        feedback_list = []
        
        for row in result:
            row_dict = dict(row._mapping)
            feedback_list.append({
                "id_feedback": row_dict["id_feedback"],
                "messages": row_dict["messages"],
                "sender": row_dict["sender"],
                "waktu_pengiriman": row_dict["waktu_pengiriman"].isoformat() if row_dict["waktu_pengiriman"] else None
            })
        
        return feedback_list
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve feedback: {str(e)}")

