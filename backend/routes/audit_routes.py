"""
Audit log routes for retrieving change history
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from utils.audit import get_audit_history, format_audit_timestamp
from utils.auth_middleware import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit"])


@router.get("/{id_result}")
async def get_result_history(
    id_result: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get audit history for a specific result
    
    Args:
        id_result: ID of the result
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        List of audit log entries with formatted timestamps
    """
    try:
        history = get_audit_history(db, id_result)
        
        # Format timestamps for display
        formatted_history = []
        for entry in history:
            formatted_entry = {
                "timestamp": format_audit_timestamp(entry["timestamp"]) if entry["timestamp"] else None,
                "message": entry["message"],
                "action": entry["action"],
                "username": entry["username"]
            }
            formatted_history.append(formatted_entry)
        
        return formatted_history
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve audit history: {e}")
