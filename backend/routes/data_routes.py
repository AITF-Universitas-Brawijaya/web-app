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
                id_result,
                id_domain,
                id_reasoning,
                id_detection,
                url,
                keywords,
                reasoning_text,
                image_final_path,
                label_final,
                final_confidence,
                created_at,
                status,
                flagged,
                updated_at
            FROM results
            ORDER BY id_result DESC
        """)
        result = db.execute(query)
        rows = [dict(r._mapping) for r in result]

        formatted = []
        for row in rows:
            formatted.append({
                "id": row["id_result"],
                "link": row["url"],
               "jenis": row["keywords"] or "Judi",
                "kepercayaan": float(row.get("final_confidence")) if row.get("final_confidence") else 90.0,
                "status": (row.get("status") or "unverified").lower(),
                "tanggal": (
                    row.get("created_at").isoformat()
                    if row.get("created_at")
                    else datetime.utcnow().isoformat()
                        ),
                "lastModified": (
                    row.get("updated_at").isoformat()
                    if row.get("updated_at")
                    else datetime.utcnow().isoformat()
                ),
                "reasoning": row.get("reasoning_text") or "-",
                "image": row.get("image_final_path") or "",
                "flagged": bool(row.get("flagged")) if row.get("flagged") is not None else False
            })
        return formatted

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")




