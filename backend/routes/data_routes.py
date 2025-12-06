from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from db import get_db
from datetime import datetime

router = APIRouter(prefix="/api/data", tags=["Data"])

@router.get("/")
def get_all_data(db: Session = Depends(get_db)):
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
                r.modified_by,
                r.modified_at,
                r.status,
                r.flagged
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
                "lastModified": (
                    row.get("modified_at").isoformat()
                    if row.get("modified_at")
                    else (row.get("created_at").isoformat() if row.get("created_at") else datetime.utcnow().isoformat())
                ),
                "modifiedBy": row.get("modified_by") or "-",
                "reasoning": row.get("reasoning_text") or "-",
                "image": row.get("image_final_path") or "",
                "flagged": row.get("flagged") or False
            })
        return formatted

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")




