from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from db import get_db
from utils.auth_middleware import get_current_user
from utils.audit import add_audit_log
import os
from urllib.parse import urlparse
import traceback

router = APIRouter(prefix="/api/manual-domain", tags=["Manual Domain"])

class ManualDomainRequest(BaseModel):
    url: str

class ManualDomainResponse(BaseModel):
    id: int
    url: str
    message: str

# Path to domain generator output files
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "domain-generator", "output")
ALL_DOMAINS_FILE = os.path.join(OUTPUT_DIR, "all_domains.txt")
LAST_ID_FILE = os.path.join(OUTPUT_DIR, "last_id.txt")

def normalize_url(url: str) -> str:
    """Normalize URL to domain format"""
    url = url.strip()
    
    # Add scheme if missing
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        # Remove www. prefix if present
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain.lower()
    except:
        raise ValueError("Invalid URL format")

def check_domain_exists(domain: str) -> bool:
    """Check if domain already exists in all_domains.txt"""
    if not os.path.exists(ALL_DOMAINS_FILE):
        return False
    
    with open(ALL_DOMAINS_FILE, 'r') as f:
        existing_domains = {line.strip().lower() for line in f if line.strip()}
    
    return domain.lower() in existing_domains

def get_next_id(db: Session) -> int:
    """Get next available ID by checking database for highest existing ID"""
    try:
        # Query database for highest ID
        query = text("SELECT MAX(id_domain) FROM generated_domains")
        result = db.execute(query)
        max_id = result.scalar()
        
        # If no records exist, start from 1
        if max_id is None:
            next_id = 1
        else:
            next_id = max_id + 1
        
        # Update last_id.txt for reference
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(LAST_ID_FILE, 'w') as f:
            f.write(str(next_id))
        
        return next_id
    except Exception as e:
        # Fallback to file-based ID if database query fails
        print(f"[WARNING] Failed to get ID from database: {e}")
        if os.path.exists(LAST_ID_FILE):
            with open(LAST_ID_FILE, 'r') as f:
                last_id = int(f.read().strip())
            return last_id + 1
        return 1

def append_to_all_domains(domain: str):
    """Append domain to all_domains.txt"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    with open(ALL_DOMAINS_FILE, 'a') as f:
        f.write(f"{domain}\n")

@router.post("/add", response_model=ManualDomainResponse)
async def add_manual_domain(
    request: ManualDomainRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Add a manual domain to the system.
    Validates URL, checks for duplicates, generates ID, and inserts into database.
    """
    try:
        # Normalize and validate URL
        try:
            domain = normalize_url(request.url)
            full_url = f"https://{domain}"
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid URL: {str(e)}")
        
        if not domain:
            raise HTTPException(status_code=400, detail="Domain cannot be empty")
        
        # Check for duplicates in all_domains.txt
        if check_domain_exists(domain):
            raise HTTPException(status_code=409, detail=f"Domain '{domain}' already exists")
        
        # Get next ID from database
        next_id = get_next_id(db)
        
        username = current_user.get("username", "unknown")
        
        # Insert into generated_domains table
        insert_domain_query = text("""
            INSERT INTO generated_domains (id_domain, url, domain, title, is_dummy)
            VALUES (:id, :url, :domain, :title, FALSE)
            RETURNING id_domain
        """)
        
        result = db.execute(insert_domain_query, {
            "id": next_id,
            "url": full_url,
            "domain": domain,
            "title": f"Manual: {domain}"
        })
        
        domain_id = result.fetchone()[0]
        
        # Insert into results table with is_manual = TRUE
        insert_result_query = text("""
            INSERT INTO results (
                id_domain, url, keywords, reasoning_text, 
                label_final, final_confidence, status, 
                is_manual, created_by, modified_by, created_at, modified_at
            )
            VALUES (
                :id_domain, :url, 'Manual', 'Manually added domain',
                NULL, NULL, 'manual',
                TRUE, :username, :username, now(), now()
            )
            RETURNING id_results
        """)
        
        result = db.execute(insert_result_query, {
            "id_domain": domain_id,
            "url": full_url,
            "username": username
        })
        
        result_id = result.fetchone()[0]
        
        # Commit transaction
        db.commit()
        
        # Append to all_domains.txt
        append_to_all_domains(domain)
        
        # Add audit log
        add_audit_log(db, result_id, "manual_domain_added", username)
        db.commit()
        
        return ManualDomainResponse(
            id=result_id,
            url=full_url,
            message=f"Manual domain '{domain}' added successfully"
        )
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to add manual domain: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to add manual domain: {str(e)}")

@router.delete("/{domain_id}")
async def delete_manual_domain(
    domain_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a manual domain.
    Only the creator or administrators can delete manual domains.
    """
    try:
        username = current_user.get("username")
        user_role = current_user.get("role")
        
        # Check if domain exists and is manual
        check_query = text("""
            SELECT r.id_results, r.created_by, r.is_manual, r.url
            FROM results r
            WHERE r.id_results = :id
        """)
        
        result = db.execute(check_query, {"id": domain_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Domain not found")
        
        domain_data = dict(row._mapping)
        
        if not domain_data.get("is_manual"):
            raise HTTPException(status_code=400, detail="Only manual domains can be deleted")
        
        # Check permissions: creator or administrator
        created_by = domain_data.get("created_by")
        if username != created_by and user_role != "administrator":
            raise HTTPException(
                status_code=403, 
                detail="Only the creator or administrators can delete this domain"
            )
        
        # Delete from results (cascade will handle generated_domains)
        delete_query = text("""
            DELETE FROM results WHERE id_results = :id
        """)
        
        db.execute(delete_query, {"id": domain_id})
        db.commit()
        
        # Add audit log
        add_audit_log(db, domain_id, "manual_domain_deleted", username)
        db.commit()
        
        return {
            "ok": True,
            "message": f"Manual domain deleted successfully",
            "deleted_id": domain_id
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to delete manual domain: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to delete manual domain: {str(e)}")
