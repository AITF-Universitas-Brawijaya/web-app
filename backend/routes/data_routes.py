from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from db import get_db
from utils.auth_middleware import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/data", tags=["Data"])

@router.get("/")
def get_all_data(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all results data.
    Requires authentication.
    """
    try:
        query = text("""
            SELECT
                r.id_results,
                r.id_domain,
                r.id_reasoning,
                r.id_detection,
                r.url,
                r.keywords,
                r.reasoning_text,
                r.image_final_path,
                r.label_final,
                r.final_confidence,
                r.created_at,
                r.created_by,
                r.verified_by,
                r.verified_at,
                r.modified_by,
                r.modified_at,
                r.status,
                r.flagged,
                r.is_manual
            FROM results r
            ORDER BY r.id_results DESC
        """)
        result = db.execute(query)
        rows = [dict(r._mapping) for r in result]

        formatted = []
        for row in rows:
            # Extract first keyword as jenis, or default to "Judi"
            keywords = row.get("keywords") or ""
            jenis = keywords.split(",")[0].strip().title() if keywords else "Judi"
            
            # Confidence is already in percentage (0-100) in DB
            confidence_val = float(row.get("final_confidence")) if row.get("final_confidence") else 90.0
            kepercayaan = round(confidence_val)
            
            formatted.append({
                "id": row["id_results"],
                "link": row["url"] or "",
                "jenis": jenis,
                "kepercayaan": kepercayaan,
                "status": (row.get("status") or "unverified").lower(),
                "tanggal": (
                    row.get("created_at").isoformat()
                    if row.get("created_at")
                    else datetime.utcnow().isoformat()
                ),
                "createdBy": row.get("created_by") or "-",
                "verifiedBy": row.get("verified_by") or "-",
                "verifiedAt": (
                    row.get("verified_at").isoformat()
                    if row.get("verified_at")
                    else None
                ),
                "lastModified": (
                    row.get("modified_at").isoformat()
                    if row.get("modified_at")
                    else (row.get("created_at").isoformat() if row.get("created_at") else datetime.utcnow().isoformat())
                ),
                "modifiedBy": row.get("modified_by") or "-",
                "reasoning": row.get("reasoning_text") or "-",
                "image": row.get("image_final_path") or "",
                "flagged": row.get("flagged") or False,
                "isManual": row.get("is_manual") or False,
                "isNew": (
                    (datetime.utcnow() - row.get("created_at").replace(tzinfo=None)).total_seconds() < 300
                    if row.get("created_at")
                    else False
                )
            })
        return formatted

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")




