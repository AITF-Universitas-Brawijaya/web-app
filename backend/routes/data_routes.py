from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.db import get_db
from backend.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/data", tags=["Data"])

@router.get("/")
def get_all_data(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    try:
        db.execute(text(f"SET LOCAL app.current_user_id = '{user['id_user']}'"))
        db.commit()
        
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
            WHERE r.user_id = :user_id
            ORDER BY r.id_results DESC
        """)
        result = db.execute(query, {"user_id": user["id_user"]})
        rows = [dict(r._mapping) for r in result]

        formatted = []
        for row in rows:
            # Extract first keyword as jenis, or default to "Judi"
            keywords = row.get("keywords") or ""
            jenis = keywords.split(",")[0].strip().title() if keywords else "Judi"
            
            # Convert confidence from decimal (0-1) to percentage (0-100)
            confidence_decimal = float(row.get("final_confidence")) if row.get("final_confidence") else 0.90
            kepercayaan = round(confidence_decimal * 100)
            
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
                    row.get("date_generated").isoformat()
                    if row.get("date_generated")
                    else datetime.utcnow().isoformat()
                ),
                "modifiedBy": "admin",  # Default value for all records
                "reasoning": row.get("reasoning_text") or "-",
                "image": row.get("image_final_path") or "",
                "flagged": False  # Default value since column doesn't exist
            })
        return formatted

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")




