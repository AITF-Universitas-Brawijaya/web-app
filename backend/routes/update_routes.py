from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from db import get_db
from utils.auth_middleware import get_current_user
from utils.audit import add_audit_log
import traceback

router = APIRouter(prefix="/api/update", tags=["update"])

@router.post("")
@router.post("/")
async def update_item(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update domain status or flagged state.
    Requires authentication - tracks verified_by and modified_by.
    """
    # DEBUG
    try:
        body = await request.json()
    except Exception:
        print("[DEBUG] FAILED PARSING JSON:\n", traceback.format_exc())
        raise HTTPException(status_code=400, detail="Invalid JSON")

    print("\n======================")
    print("[DEBUG] /api/update BODY:", body)
    print("======================")

    try:
        id_ = int(body.get("id"))
        print("[DEBUG] Parsed id:", id_)
    except:
        print("[DEBUG] INVALID ID RECEIVED:", body.get("id"))
        raise HTTPException(status_code=400, detail="Invalid id")

    patch = body.get("patch", {})
    print("[DEBUG] Patch received:", patch)
    
    username = current_user.get("username")
    print(f"[DEBUG] User performing update: {username}")

    allowed_map = {
        "status": "status",
        "flagged": "flagged",
    }

    set_parts = []
    params = {"id": id_, "username": username}
    i = 0

    for k, v in patch.items():
        if k not in allowed_map:
            print(f"[DEBUG] SKIP (not allowed): {k}")
            continue
        col = allowed_map[k]
        set_parts.append(f"{col} = :p{i}")
        params[f"p{i}"] = v
        i += 1

    if not set_parts:
        print("[DEBUG] No valid fields to update:", patch)
        raise HTTPException(status_code=400, detail="No valid fields to update")

    # Handle verified_by and verified_at based on status changes
    if "status" in patch:
        status_value = patch["status"]
        if status_value in ["verified", "false-positive"]:
            # Set verified_by and verified_at when verifying
            set_parts.append("verified_by = :username")
            set_parts.append("verified_at = now()")
        elif status_value == "unverified":
            # Clear verified_by and verified_at when changing to unverified
            set_parts.append("verified_by = NULL")
            set_parts.append("verified_at = NULL")

    # Always update modified_by and updated_at
    set_parts.append("modified_by = :username")
    set_parts.append("updated_at = now()")
    set_parts.append("modified_at = now()")

    params_sql = ", ".join(set_parts)

    query = text(f"""
        UPDATE results
        SET {params_sql}
        WHERE id_results = :id
        RETURNING id_results, url, status, flagged, verified_by, verified_at, updated_at
    """)

    print("\n[DEBUG] EXECUTING SQL:")
    print(str(query))
    print("[DEBUG] SQL PARAMS:", params)
    print("=====================================\n")

    try:
        res = db.execute(query, params)
        row = res.fetchone()
        db.commit()

        if not row:
            print("[DEBUG] No row returned for id:", id_)
            raise HTTPException(status_code=404, detail="Record not found")

        print("[DEBUG] SQL UPDATE SUCCESS → returned row:", dict(row._mapping))

    except Exception as e:
        db.rollback()
        print("\n[DEBUG] UPDATE EXCEPTION:")
        print(traceback.format_exc())
        print("==== END ERROR ====\n")
        raise HTTPException(status_code=500, detail=f"Database update failed: {e}")

    # Add audit log entries
    if "flagged" in patch:
        action = "flagged" if patch["flagged"] else "unflagged"
        add_audit_log(db, id_, action, username)

    if "status" in patch:
        s = patch["status"]
        if s == "verified":
            add_audit_log(db, id_, "verified", username)
        elif s == "unverified":
            add_audit_log(db, id_, "unverified", username)
        elif s == "false-positive":
            add_audit_log(db, id_, "false_positive", username)

    # Commit audit logs
    db.commit()

    return {"ok": True, "updated": dict(row._mapping)}
