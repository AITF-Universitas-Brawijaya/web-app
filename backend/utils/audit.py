"""
Audit logging utilities for tracking all changes to results
"""
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import json


def add_audit_log(
    db: Session,
    id_result: int,
    action: str,
    username: str,
    details: Optional[dict] = None
):
    """
    Add an audit log entry
    
    Args:
        db: Database session
        id_result: ID of the result being modified
        action: Action being performed (created, verified, unverified, etc.)
        username: Username of the user performing the action
        details: Optional additional details as dictionary
    """
    query = text("""
        INSERT INTO audit_log (id_result, action, username, timestamp, details)
        VALUES (:id_result, :action, :username, now(), :details)
    """)
    
    details_json = json.dumps(details) if details else None
    
    db.execute(query, {
        "id_result": id_result,
        "action": action,
        "username": username,
        "details": details_json
    })


def get_audit_history(db: Session, id_result: int) -> list:
    """
    Get audit history for a result
    
    Args:
        db: Database session
        id_result: ID of the result
        
    Returns:
        List of audit log entries with formatted messages
    """
    query = text("""
        SELECT action, username, timestamp, details
        FROM audit_log
        WHERE id_result = :id_result
        ORDER BY timestamp ASC
    """)
    
    result = db.execute(query, {"id_result": id_result})
    rows = result.fetchall()
    
    history = []
    for row in rows:
        row_dict = dict(row._mapping)
        
        # Format the message based on action
        action = row_dict["action"]
        username = row_dict["username"]
        timestamp = row_dict["timestamp"]
        
        # Create human-readable message
        if action == "created":
            message = f"Added to list by {username}"
        elif action == "verified":
            message = f"Verified by {username}"
        elif action == "unverified":
            message = f"Changed to Unverified by {username}"
        elif action == "false_positive":
            message = f"Marked as False Positive by {username}"
        elif action == "flagged":
            message = f"Flagged by {username}"
        elif action == "unflagged":
            message = f"Unflagged by {username}"
        elif action == "note_added":
            message = f"Note added by {username}"
        elif action == "note_updated":
            message = f"Note updated by {username}"
        else:
            message = f"{action.replace('_', ' ').title()} by {username}"
        
        history.append({
            "timestamp": timestamp.isoformat() if timestamp else None,
            "message": message,
            "action": action,
            "username": username,
            "details": row_dict.get("details")
        })
    
    return history


def format_audit_timestamp(timestamp: datetime) -> str:
    """
    Format timestamp for audit display
    Example: "12/6/2025, 9:56:03 AM"
    
    Args:
        timestamp: Datetime object
        
    Returns:
        Formatted timestamp string
    """
    return timestamp.strftime("%-m/%-d/%Y, %-I:%M:%S %p")
