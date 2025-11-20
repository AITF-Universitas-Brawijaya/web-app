from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from db import get_db
from stores.history_store import add_history
import traceback

router = APIRouter(prefix="/api/update", tags=["update"])

@router.post("/")
async def update_item(request: Request, db: Session = Depends(get_db)):
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

    allowed_map = {
        "status": "status",
        "flagged": "flagged",
    }

    set_parts = []
    params = {"id": id_}
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

    params_sql = ", ".join(set_parts) + ", updated_at = now()"

    query = text(f"""
        UPDATE results
        SET {params_sql}
        WHERE id_result = :id
        RETURNING id_result, url, status, flagged, updated_at
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

    if "flagged" in patch:
        add_history(id_, "Flagged" if patch["flagged"] else "Unflagged", db)

    if "status" in patch:
        s = patch["status"]
        if s == "verified":
            add_history(id_, "Updated to Verified", db)
        elif s == "unverified":
            add_history(id_, "Changed to Unverified", db)
        elif s == "false-positive":
            add_history(id_, "Marked as False Positive", db)

    return {"ok": True, "updated": dict(row._mapping)}
