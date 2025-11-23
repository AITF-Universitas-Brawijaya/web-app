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
                gd.status,
                gd.date_generated
            FROM results r
            LEFT JOIN generated_domains gd ON r.id_domain = gd.id_domain
            ORDER BY r.id_results DESC
        """)
        result = db.execute(query)
        rows = [dict(r._mapping) for r in result]

        formatted = []
        for row in rows:
            formatted.append({
                "id": row["id_results"],
                "link": row["url"] or "",
               "jenis": row["keywords"] or "Judi",
                "kepercayaan": float(row.get("final_confidence")) if row.get("final_confidence") else 90.0,
                "status": (row.get("status") or "unverified").lower(),
                "tanggal": (
                    row.get("created_at").isoformat()
                    if row.get("created_at")
                    else datetime.utcnow().isoformat()
                        ),
                "lastModified": (
                    row.get("date_generated").isoformat()
                    if row.get("date_generated")
                    else datetime.utcnow().isoformat()
                ),
                "reasoning": row.get("reasoning_text") or "-",
                "image": row.get("image_final_path") or "",
                "flagged": False  # Default value since column doesn't exist
            })
        return formatted

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")




