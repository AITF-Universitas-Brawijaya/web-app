"""
Admin routes for administrator-only operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from db import get_db
from utils.auth_middleware import get_current_user, require_role
from utils.auth import get_password_hash
import os

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# ============================================================
# Pydantic Models
# ============================================================

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class UserUpdate(BaseModel):
    password: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    role: str
    created_at: str
    last_login: Optional[str]

class GeneratorSettingsUpdate(BaseModel):
    value: str

# ============================================================
# User Management Endpoints
# ============================================================

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    List all verifikator users.
    Only accessible by administrators.
    """
    try:
        query = text("""
            SELECT id, username, full_name, email, phone, role, created_at, last_login
            FROM users
            WHERE role = 'verifikator'
            ORDER BY created_at DESC
        """)
        
        result = db.execute(query)
        users = []
        
        for row in result:
            user_dict = dict(row._mapping)
            users.append({
                "id": user_dict["id"],
                "username": user_dict["username"],
                "full_name": user_dict["full_name"],
                "email": user_dict["email"],
                "phone": user_dict["phone"],
                "role": user_dict["role"],
                "created_at": user_dict["created_at"].isoformat() if user_dict["created_at"] else None,
                "last_login": user_dict["last_login"].isoformat() if user_dict["last_login"] else None,
            })
        
        return users
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Create a new verifikator user.
    Only accessible by administrators.
    """
    try:
        # Check if username already exists
        check_query = text("SELECT id FROM users WHERE username = :username")
        existing = db.execute(check_query, {"username": user_data.username}).fetchone()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        # Hash password
        password_hash = get_password_hash(user_data.password)
        
        # Insert new user
        insert_query = text("""
            INSERT INTO users (username, password_hash, full_name, email, phone, role, created_at)
            VALUES (:username, :password_hash, :full_name, :email, :phone, 'verifikator', now())
            RETURNING id, username, full_name, email, phone, role, created_at, last_login
        """)
        
        result = db.execute(insert_query, {
            "username": user_data.username,
            "password_hash": password_hash,
            "full_name": user_data.full_name,
            "email": user_data.email,
            "phone": user_data.phone
        })
        
        db.commit()
        row = result.fetchone()
        user_dict = dict(row._mapping)
        
        return {
            "id": user_dict["id"],
            "username": user_dict["username"],
            "full_name": user_dict["full_name"],
            "email": user_dict["email"],
            "phone": user_dict["phone"],
            "role": user_dict["role"],
            "created_at": user_dict["created_at"].isoformat() if user_dict["created_at"] else None,
            "last_login": user_dict["last_login"].isoformat() if user_dict["last_login"] else None,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Update a verifikator user.
    Only accessible by administrators.
    """
    try:
        # Check if user exists and is verifikator
        check_query = text("SELECT id, role FROM users WHERE id = :user_id")
        existing = db.execute(check_query, {"user_id": user_id}).fetchone()
        
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        if dict(existing._mapping)["role"] != "verifikator":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only modify verifikator users"
            )
        
        # Build update query dynamically
        update_parts = []
        params = {"user_id": user_id}
        
        if user_data.password is not None:
            update_parts.append("password_hash = :password_hash")
            params["password_hash"] = get_password_hash(user_data.password)
        
        if user_data.full_name is not None:
            update_parts.append("full_name = :full_name")
            params["full_name"] = user_data.full_name
        
        if user_data.email is not None:
            update_parts.append("email = :email")
            params["email"] = user_data.email
        
        if user_data.phone is not None:
            update_parts.append("phone = :phone")
            params["phone"] = user_data.phone
        
        if not update_parts:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_query = text(f"""
            UPDATE users
            SET {", ".join(update_parts)}
            WHERE id = :user_id
            RETURNING id, username, full_name, email, phone, role, created_at, last_login
        """)
        
        result = db.execute(update_query, params)
        db.commit()
        
        row = result.fetchone()
        user_dict = dict(row._mapping)
        
        return {
            "id": user_dict["id"],
            "username": user_dict["username"],
            "full_name": user_dict["full_name"],
            "email": user_dict["email"],
            "phone": user_dict["phone"],
            "role": user_dict["role"],
            "created_at": user_dict["created_at"].isoformat() if user_dict["created_at"] else None,
            "last_login": user_dict["last_login"].isoformat() if user_dict["last_login"] else None,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Delete a verifikator user.
    Only accessible by administrators.
    """
    try:
        # Check if user exists and is verifikator
        check_query = text("SELECT id, role FROM users WHERE id = :user_id")
        existing = db.execute(check_query, {"user_id": user_id}).fetchone()
        
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        if dict(existing._mapping)["role"] != "verifikator":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only delete verifikator users"
            )
        
        # Delete user
        delete_query = text("DELETE FROM users WHERE id = :user_id")
        db.execute(delete_query, {"user_id": user_id})
        db.commit()
        
        return {"ok": True, "message": "User deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


# ============================================================
# Generator Settings Endpoints
# ============================================================

@router.get("/generator/blocked-domains")
async def get_blocked_domains(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Get blocked domains list.
    Only accessible by administrators.
    """
    try:
        query = text("""
            SELECT setting_value, updated_by, updated_at
            FROM generator_settings
            WHERE setting_key = 'blocked_domains'
        """)
        
        result = db.execute(query).fetchone()
        
        if result:
            row_dict = dict(result._mapping)
            return {
                "value": row_dict["setting_value"],
                "updated_by": row_dict["updated_by"],
                "updated_at": row_dict["updated_at"].isoformat() if row_dict["updated_at"] else None
            }
        else:
            return {"value": "", "updated_by": None, "updated_at": None}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch blocked domains: {str(e)}")


@router.post("/generator/blocked-domains")
async def update_blocked_domains(
    settings_data: GeneratorSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Update blocked domains list.
    Only accessible by administrators.
    """
    try:
        username = current_user.get("username")
        
        query = text("""
            INSERT INTO generator_settings (setting_key, setting_value, updated_by, updated_at)
            VALUES ('blocked_domains', :value, :username, now())
            ON CONFLICT (setting_key) DO UPDATE SET
                setting_value = EXCLUDED.setting_value,
                updated_by = EXCLUDED.updated_by,
                updated_at = EXCLUDED.updated_at
            RETURNING setting_value, updated_by, updated_at
        """)
        
        result = db.execute(query, {
            "value": settings_data.value,
            "username": username
        })
        db.commit()
        
        row = result.fetchone()
        row_dict = dict(row._mapping)
        
        return {
            "ok": True,
            "value": row_dict["setting_value"],
            "updated_by": row_dict["updated_by"],
            "updated_at": row_dict["updated_at"].isoformat() if row_dict["updated_at"] else None
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update blocked domains: {str(e)}")


@router.get("/generator/blocked-keywords")
async def get_blocked_keywords(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Get blocked keywords list.
    Only accessible by administrators.
    """
    try:
        query = text("""
            SELECT setting_value, updated_by, updated_at
            FROM generator_settings
            WHERE setting_key = 'blocked_keywords'
        """)
        
        result = db.execute(query).fetchone()
        
        if result:
            row_dict = dict(result._mapping)
            return {
                "value": row_dict["setting_value"],
                "updated_by": row_dict["updated_by"],
                "updated_at": row_dict["updated_at"].isoformat() if row_dict["updated_at"] else None
            }
        else:
            return {"value": "", "updated_by": None, "updated_at": None}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch blocked keywords: {str(e)}")


@router.post("/generator/blocked-keywords")
async def update_blocked_keywords(
    settings_data: GeneratorSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Update blocked keywords list.
    Only accessible by administrators.
    """
    try:
        username = current_user.get("username")
        
        query = text("""
            INSERT INTO generator_settings (setting_key, setting_value, updated_by, updated_at)
            VALUES ('blocked_keywords', :value, :username, now())
            ON CONFLICT (setting_key) DO UPDATE SET
                setting_value = EXCLUDED.setting_value,
                updated_by = EXCLUDED.updated_by,
                updated_at = EXCLUDED.updated_at
            RETURNING setting_value, updated_by, updated_at
        """)
        
        result = db.execute(query, {
            "value": settings_data.value,
            "username": username
        })
        db.commit()
        
        row = result.fetchone()
        row_dict = dict(row._mapping)
        
        return {
            "ok": True,
            "value": row_dict["setting_value"],
            "updated_by": row_dict["updated_by"],
            "updated_at": row_dict["updated_at"].isoformat() if row_dict["updated_at"] else None
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update blocked keywords: {str(e)}")


@router.get("/generator/serpapi-key")
async def get_serpapi_key(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Get SerpAPI key and quota information.
    Only accessible by administrators.
    """
    try:
        from utils.serpapi_service import get_serpapi_quota
        
        query = text("""
            SELECT setting_value, updated_by, updated_at
            FROM generator_settings
            WHERE setting_key = 'serpapi_key'
        """)
        
        result = db.execute(query).fetchone()
        
        if result:
            row_dict = dict(result._mapping)
            api_key = row_dict["setting_value"]
            
            # Get quota if key exists
            quota = None
            if api_key:
                try:
                    quota = get_serpapi_quota(api_key)
                except Exception as e:
                    print(f"Failed to fetch quota: {e}")
                    quota = {"used": 0, "limit": 0, "remaining": 0}
            
            return {
                "value": api_key,
                "quota": quota,
                "updated_by": row_dict["updated_by"],
                "updated_at": row_dict["updated_at"].isoformat() if row_dict["updated_at"] else None
            }
        else:
            return {"value": "", "quota": None, "updated_by": None, "updated_at": None}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch SerpAPI key: {str(e)}")


@router.post("/generator/serpapi-key")
async def update_serpapi_key(
    settings_data: GeneratorSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Update SerpAPI key.
    Validates the key by calling SerpAPI account endpoint.
    Only accessible by administrators.
    """
    try:
        from utils.serpapi_service import get_serpapi_quota
        
        username = current_user.get("username")
        api_key = settings_data.value
        
        # Validate key if not empty
        quota = None
        if api_key:
            try:
                quota = get_serpapi_quota(api_key)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid SerpAPI key: {str(e)}"
                )
        
        # Update key in database
        query = text("""
            INSERT INTO generator_settings (setting_key, setting_value, updated_by, updated_at)
            VALUES ('serpapi_key', :value, :username, now())
            ON CONFLICT (setting_key) DO UPDATE SET
                setting_value = EXCLUDED.setting_value,
                updated_by = EXCLUDED.updated_by,
                updated_at = EXCLUDED.updated_at
            RETURNING setting_value, updated_by, updated_at
        """)
        
        result = db.execute(query, {
            "value": api_key,
            "username": username
        })
        db.commit()
        
        row = result.fetchone()
        row_dict = dict(row._mapping)
        
        return {
            "ok": True,
            "value": row_dict["setting_value"],
            "quota": quota,
            "updated_by": row_dict["updated_by"],
            "updated_at": row_dict["updated_at"].isoformat() if row_dict["updated_at"] else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update SerpAPI key: {str(e)}")


@router.get("/generator/batch-size")
async def get_batch_size(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Get batch size setting (number of domains per batch).
    Only accessible by administrators.
    """
    try:
        query = text("""
            SELECT setting_value, updated_by, updated_at
            FROM generator_settings
            WHERE setting_key = 'batch_size'
        """)
        
        result = db.execute(query).fetchone()
        
        if result:
            row_dict = dict(result._mapping)
            return {
                "value": row_dict["setting_value"],
                "updated_by": row_dict["updated_by"],
                "updated_at": row_dict["updated_at"].isoformat() if row_dict["updated_at"] else None
            }
        else:
            return {"value": "10", "updated_by": None, "updated_at": None}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch batch size: {str(e)}")


@router.post("/generator/batch-size")
async def update_batch_size(
    settings_data: GeneratorSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Update batch size setting (number of domains per batch).
    Only accessible by administrators.
    """
    try:
        username = current_user.get("username")
        batch_size = settings_data.value
        
        # Validate batch size is a positive integer
        try:
            batch_size_int = int(batch_size)
            if batch_size_int <= 0:
                raise ValueError("Batch size must be positive")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Batch size must be a positive integer"
            )
        
        query = text("""
            INSERT INTO generator_settings (setting_key, setting_value, updated_by, updated_at)
            VALUES ('batch_size', :value, :username, now())
            ON CONFLICT (setting_key) DO UPDATE SET
                setting_value = EXCLUDED.setting_value,
                updated_by = EXCLUDED.updated_by,
                updated_at = EXCLUDED.updated_at
            RETURNING setting_value, updated_by, updated_at
        """)
        
        result = db.execute(query, {
            "value": batch_size,
            "username": username
        })
        db.commit()
        
        row = result.fetchone()
        row_dict = dict(row._mapping)
        
        return {
            "ok": True,
            "value": row_dict["setting_value"],
            "updated_by": row_dict["updated_by"],
            "updated_at": row_dict["updated_at"].isoformat() if row_dict["updated_at"] else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update batch size: {str(e)}")



# ============================================================
# Domain Management Endpoints
# ============================================================

@router.delete("/domains/all")
async def delete_all_domains(
    confirmation: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrator"))
):
    """
    Delete all domains from the database.
    Requires confirmation string "konfirmasi".
    Only accessible by administrators.
    """
    if confirmation != "konfirmasi":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation. Please type 'konfirmasi' to confirm deletion."
        )
    
    try:
        # Count domains before deletion
        count_query = text("SELECT COUNT(*) as count FROM generated_domains")
        count_result = db.execute(count_query).fetchone()
        total_domains = dict(count_result._mapping)["count"]
        
        # Delete all domains (cascade will handle related tables)
        delete_query = text("DELETE FROM generated_domains")
        db.execute(delete_query)
        db.commit()
        
        return {
            "ok": True,
            "message": f"Successfully deleted {total_domains} domains",
            "deleted_count": total_domains
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete all domains: {str(e)}")


@router.delete("/domains/{id_results}")
async def delete_domain_by_id(
    id_results: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a specific domain by ID.
    - Administrators can delete any domain
    - Domain creators can delete their own domains (both manual and generated)
    """
    try:
        username = current_user.get("username")
        user_role = current_user.get("role")
        
        # Check if domain exists in results table
        check_query = text("""
            SELECT id_results, created_by, is_manual 
            FROM results 
            WHERE id_results = :id_results
        """)
        result = db.execute(check_query, {"id_results": id_results})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Domain not found")
        
        domain_data = dict(row._mapping)
        created_by = domain_data.get("created_by")
        
        # Permission check:
        # 1. Administrators can delete any domain
        # 2. Domain creators can delete their own domains
        if user_role == "administrator":
            # Admin can delete anything
            pass
        elif username == created_by:
            # Creator can delete their own domain
            pass
        else:
            raise HTTPException(
                status_code=403,
                detail="You can only delete domains you created"
            )
        
        # Delete domain from results table
        delete_query = text("DELETE FROM results WHERE id_results = :id_results")
        db.execute(delete_query, {"id_results": id_results})
        db.commit()
        
        return {
            "ok": True,
            "message": f"Successfully deleted domain with ID {id_results}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete domain: {str(e)}")
