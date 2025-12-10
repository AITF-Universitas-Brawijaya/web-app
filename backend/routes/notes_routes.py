"""
Notes routes for domain notes management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from db import get_db
from utils.auth_middleware import get_current_user
from utils.audit import add_audit_log

router = APIRouter(prefix="/api/notes", tags=["Notes"])

# ============================================================
# Pydantic Models
# ============================================================

class NoteCreate(BaseModel):
    note_text: str

class NoteUpdate(BaseModel):
    note_text: str

class NoteResponse(BaseModel):
    id: int
    id_domain: int
    note_text: str
    created_by: str
    created_at: str
    updated_at: str

# ============================================================
# Notes Endpoints
# ============================================================

@router.get("/{id_domain}", response_model=List[NoteResponse])
async def get_notes_for_domain(
    id_domain: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all notes for a specific domain.
    Accessible by both verifikator and administrator.
    """
    try:
        query = text("""
            SELECT id, id_domain, note_text, created_by, created_at, updated_at
            FROM domain_notes
            WHERE id_domain = :id_domain
            ORDER BY created_at DESC
        """)
        
        result = db.execute(query, {"id_domain": id_domain})
        notes = []
        
        for row in result:
            note_dict = dict(row._mapping)
            notes.append({
                "id": note_dict["id"],
                "id_domain": note_dict["id_domain"],
                "note_text": note_dict["note_text"],
                "created_by": note_dict["created_by"],
                "created_at": note_dict["created_at"].isoformat() if note_dict["created_at"] else None,
                "updated_at": note_dict["updated_at"].isoformat() if note_dict["updated_at"] else None,
            })
        
        return notes
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notes: {str(e)}")


@router.post("/{id_domain}", response_model=NoteResponse)
async def create_note(
    id_domain: int,
    note_data: NoteCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new note for a domain.
    Accessible by both verifikator and administrator.
    """
    try:
        username = current_user.get("username")
        
        # Check if domain exists
        check_query = text("SELECT id_domain FROM generated_domains WHERE id_domain = :id_domain")
        existing = db.execute(check_query, {"id_domain": id_domain}).fetchone()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Domain not found")
        
        # Insert new note
        insert_query = text("""
            INSERT INTO domain_notes (id_domain, note_text, created_by, created_at, updated_at)
            VALUES (:id_domain, :note_text, :created_by, now(), now())
            RETURNING id, id_domain, note_text, created_by, created_at, updated_at
        """)
        
        result = db.execute(insert_query, {
            "id_domain": id_domain,
            "note_text": note_data.note_text,
            "created_by": username
        })
        
        db.commit()
        row = result.fetchone()
        note_dict = dict(row._mapping)
        
        # Add audit log for note creation
        # Get result_id from id_domain
        result_query = text("SELECT id_results FROM results WHERE id_domain = :id_domain")
        result_row = db.execute(result_query, {"id_domain": id_domain}).fetchone()
        if result_row:
            result_id = dict(result_row._mapping)["id_results"]
            add_audit_log(db, result_id, "note_added", username)
            db.commit()
        
        return {
            "id": note_dict["id"],
            "id_domain": note_dict["id_domain"],
            "note_text": note_dict["note_text"],
            "created_by": note_dict["created_by"],
            "created_at": note_dict["created_at"].isoformat() if note_dict["created_at"] else None,
            "updated_at": note_dict["updated_at"].isoformat() if note_dict["updated_at"] else None,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create note: {str(e)}")


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note_data: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update an existing note.
    Users can only update their own notes.
    """
    try:
        username = current_user.get("username")
        
        # Check if note exists and belongs to current user
        check_query = text("""
            SELECT id, created_by
            FROM domain_notes
            WHERE id = :note_id
        """)
        existing = db.execute(check_query, {"note_id": note_id}).fetchone()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Note not found")
        
        existing_dict = dict(existing._mapping)
        if existing_dict["created_by"] != username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own notes"
            )
        
        # Update note
        update_query = text("""
            UPDATE domain_notes
            SET note_text = :note_text, updated_at = now()
            WHERE id = :note_id
            RETURNING id, id_domain, note_text, created_by, created_at, updated_at
        """)
        
        result = db.execute(update_query, {
            "note_id": note_id,
            "note_text": note_data.note_text
        })
        
        db.commit()
        row = result.fetchone()
        note_dict = dict(row._mapping)
        
        # Add audit log for note update
        # Get result_id from id_domain
        result_query = text("SELECT id_results FROM results WHERE id_domain = :id_domain")
        result_row = db.execute(result_query, {"id_domain": note_dict["id_domain"]}).fetchone()
        if result_row:
            result_id = dict(result_row._mapping)["id_results"]
            add_audit_log(db, result_id, "note_updated", username)
            db.commit()
        
        return {
            "id": note_dict["id"],
            "id_domain": note_dict["id_domain"],
            "note_text": note_dict["note_text"],
            "created_by": note_dict["created_by"],
            "created_at": note_dict["created_at"].isoformat() if note_dict["created_at"] else None,
            "updated_at": note_dict["updated_at"].isoformat() if note_dict["updated_at"] else None,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update note: {str(e)}")


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a note.
    Users can only delete their own notes.
    """
    try:
        username = current_user.get("username")
        
        # Check if note exists and belongs to current user
        check_query = text("""
            SELECT id, created_by
            FROM domain_notes
            WHERE id = :note_id
        """)
        existing = db.execute(check_query, {"note_id": note_id}).fetchone()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Note not found")
        
        existing_dict = dict(existing._mapping)
        if existing_dict["created_by"] != username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own notes"
            )
        
        # Get id_domain before deleting
        id_domain_query = text("SELECT id_domain FROM domain_notes WHERE id = :note_id")
        id_domain_row = db.execute(id_domain_query, {"note_id": note_id}).fetchone()
        id_domain = dict(id_domain_row._mapping)["id_domain"] if id_domain_row else None
        
        # Delete note
        delete_query = text("DELETE FROM domain_notes WHERE id = :note_id")
        db.execute(delete_query, {"note_id": note_id})
        db.commit()
        
        # Add audit log for note deletion
        if id_domain:
            result_query = text("SELECT id_results FROM results WHERE id_domain = :id_domain")
            result_row = db.execute(result_query, {"id_domain": id_domain}).fetchone()
            if result_row:
                result_id = dict(result_row._mapping)["id_results"]
                add_audit_log(db, result_id, "note_deleted", username)
                db.commit()
        
        return {"ok": True, "message": "Note deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete note: {str(e)}")
