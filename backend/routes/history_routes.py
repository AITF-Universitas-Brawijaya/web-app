from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from db import get_db
from utils.audit import get_audit_history
from utils.auth_middleware import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("/")
def get_history_data(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get activity history from audit_log for a specific result.
    Returns comprehensive activity timeline with timestamps and usernames.
    """
    if not id:
        raise HTTPException(status_code=400, detail="Missing id")
    
    history = get_audit_history(db, id)
    
    # Transform to match frontend expected format
    events = [
        {
            "time": entry["timestamp"],
            "text": entry["message"]
        }
        for entry in history
    ]
    
    return {"events": events}
